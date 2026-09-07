const MAX_QUERY_LENGTH = 80;
const DEFAULT_LANGUAGE = "es";
const SAFE_PRICE_LOCALES = Object.freeze({
  es: "es-US",
  en: "en-US",
});

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asText(value) {
  return typeof value === "string" ? value : "";
}

function localizedText(value, language) {
  return isRecord(value) ? asText(value[language]) : "";
}

function cloneLocalizedText(value) {
  return {
    es: localizedText(value, "es"),
    en: localizedText(value, "en"),
  };
}

function cleanMessagePart(value, maximumLength) {
  return Array.from(asText(value).replace(/[\u0000-\u001f\u007f-\u009f]/gu, " ").replace(/\s+/gu, " ").trim())
    .slice(0, maximumLength)
    .join("");
}

/**
 * Produces a comparison-only representation. It never treats user input as
 * markup or as a regular expression.
 */
export function normalizeText(value) {
  return asText(value)
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

/**
 * Limits search input to at most 80 Unicode code points.
 */
export function clampQuery(value, requestedLength = MAX_QUERY_LENGTH) {
  const safeLength = typeof requestedLength === "number" && Number.isFinite(requestedLength)
    ? Math.min(MAX_QUERY_LENGTH, Math.max(0, Math.trunc(requestedLength)))
    : MAX_QUERY_LENGTH;

  if (typeof value !== "string" || safeLength === 0) {
    return "";
  }

  const compactValue = value
    .replace(/[\u0000-\u001f\u007f-\u009f]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();

  return Array.from(compactValue).slice(0, safeLength).join("").trimEnd();
}

/**
 * Resolves application language without allowing arbitrary locale values.
 */
export function resolveLanguage(candidate, fallback = DEFAULT_LANGUAGE) {
  const parseLanguage = (value) => {
    if (typeof value !== "string") {
      return null;
    }

    const normalized = value.trim().toLowerCase().replace(/_/gu, "-");
    if (!/^(?:es|en)(?:-[a-z0-9]{1,8})*$/u.test(normalized)) {
      return null;
    }

    return normalized.slice(0, 2);
  };

  return parseLanguage(candidate) ?? parseLanguage(fallback) ?? DEFAULT_LANGUAGE;
}

/**
 * Filters rows or grouped services while preserving their original objects.
 */
export function filterServices(services, query, language = DEFAULT_LANGUAGE) {
  if (!Array.isArray(services)) {
    return [];
  }

  const normalizedQuery = normalizeText(clampQuery(query));
  if (!normalizedQuery) {
    return services.slice();
  }

  const activeLanguage = resolveLanguage(language);
  const secondaryLanguage = activeLanguage === "es" ? "en" : "es";
  const queryTerms = normalizedQuery.split(" ");

  return services.filter((service) => {
    if (!isRecord(service)) {
      return false;
    }

    const fields = [
      asText(service.id),
      asText(service.categoryId),
      localizedText(service.name, activeLanguage),
      localizedText(service.name, secondaryLanguage),
      localizedText(service.description, activeLanguage),
      localizedText(service.description, secondaryLanguage),
      localizedText(service.variant, activeLanguage),
      localizedText(service.variant, secondaryLanguage),
      asText(service.duration),
    ];

    if (Array.isArray(service.variants)) {
      for (const variant of service.variants) {
        if (!isRecord(variant)) {
          continue;
        }

        fields.push(
          asText(variant.id),
          asText(variant.duration),
          localizedText(variant.variant, activeLanguage),
          localizedText(variant.variant, secondaryLanguage),
        );
      }
    }

    const searchableText = normalizeText(fields.join(" "));
    return queryTerms.every((term) => searchableText.includes(term));
  });
}

/**
 * Formats a finite amount as USD with exactly two decimal places.
 */
export function formatPrice(value, locale = "en") {
  let amount = value;
  if (typeof value === "string" && /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/u.test(value.trim())) {
    amount = Number(value);
  }

  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return "";
  }

  const language = resolveLanguage(locale, "en");
  return new Intl.NumberFormat(SAFE_PRICE_LOCALES[language], {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Creates a fixed-origin wa.me URL from a configured number and a catalog
 * service object. Arbitrary service strings and malformed numbers are rejected.
 */
export function buildWhatsAppUrl(phoneNumber, service, language = DEFAULT_LANGUAGE) {
  if (typeof phoneNumber !== "string" || !/^\d{8,15}$/u.test(phoneNumber) || !isRecord(service)) {
    return null;
  }

  const activeLanguage = resolveLanguage(language);
  const serviceName = cleanMessagePart(localizedText(service.name, activeLanguage), 160);
  const variantName = cleanMessagePart(localizedText(service.variant, activeLanguage), 120);

  if (!serviceName) {
    return null;
  }

  const serviceLabel = variantName ? `${serviceName} - ${variantName}` : serviceName;
  const message = activeLanguage === "en"
    ? `Hello, I would like to book: ${serviceLabel}.`
    : `Hola, quisiera reservar: ${serviceLabel}.`;

  return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
}

/**
 * Groups catalog rows by categoryId and the Spanish service name. Both the
 * result and every nested localization object are newly allocated.
 */
export function groupServices(rows) {
  if (!Array.isArray(rows)) {
    return [];
  }

  const groups = [];
  const groupIndexes = new Map();

  for (const row of rows) {
    if (!isRecord(row)) {
      continue;
    }

    const categoryId = asText(row.categoryId);
    const spanishName = localizedText(row.name, "es");
    const groupKey = JSON.stringify([categoryId, spanishName]);
    let groupIndex = groupIndexes.get(groupKey);

    if (groupIndex === undefined) {
      groupIndex = groups.length;
      groupIndexes.set(groupKey, groupIndex);
      groups.push({
        categoryId,
        name: cloneLocalizedText(row.name),
        description: cloneLocalizedText(row.description),
        variants: [],
      });
    }

    groups[groupIndex].variants.push({
      id: row.id,
      duration: typeof row.duration === "string" ? row.duration : null,
      price: row.price,
      variant: cloneLocalizedText(row.variant),
    });
  }

  return groups;
}

