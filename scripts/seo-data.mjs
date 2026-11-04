import { siteConfig } from "../src/config/site.js";

export const publicRoutes = Object.freeze([
  { path: "/", changeFrequency: "monthly", priority: "0.6" },
  { path: "/es/", changeFrequency: "weekly", priority: "1.0", language: "es" },
  { path: "/en/", changeFrequency: "weekly", priority: "1.0", language: "en" },
  { path: "/es/privacidad.html", changeFrequency: "yearly", priority: "0.2", language: "es" },
  { path: "/en/privacy.html", changeFrequency: "yearly", priority: "0.2", language: "en" },
]);

export const seoCopy = Object.freeze({
  es: Object.freeze({
    title: "D3 Glow Spa | Spa",
    description:
      "Reserva faciales, manicura, pedicura, exfoliación corporal y depilación directamente por WhatsApp.",
    services: Object.freeze([
      "Manicura y cuidado de uñas",
      "Pedicura",
      "Faciales",
      "Depilación",
      "Exfoliación y cuidado corporal",
      "Servicios de belleza y bienestar a domicilio",
    ]),
  }),
  en: Object.freeze({
    title: "D3 Glow Spa | Spa",
    description:
      "Book facials, manicures, pedicures, body exfoliation, and waxing directly through WhatsApp.",
    services: Object.freeze([
      "Manicures and nail care",
      "Pedicures",
      "Facials",
      "Hair removal",
      "Body exfoliation and care",
      "Mobile beauty and wellness services",
    ]),
  }),
});

export function configuredSiteOrigin() {
  if (siteConfig.siteUrl === null) return null;
  if (typeof siteConfig.siteUrl !== "string" || !siteConfig.siteUrl.trim()) {
    throw new Error("siteConfig.siteUrl must be null or a valid HTTPS origin.");
  }

  const url = new URL(siteConfig.siteUrl);
  const hasOnlyOrigin = url.protocol === "https:"
    && url.pathname === "/"
    && !url.search
    && !url.hash;

  if (!hasOnlyOrigin || ["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new Error(
      "siteConfig.siteUrl must be a public HTTPS origin without a path, query, hash, or trailing content.",
    );
  }

  return url.origin;
}

export function absolutePublicUrl(path) {
  const origin = configuredSiteOrigin();
  return origin ? new URL(path, `${origin}/`).href : null;
}

function publicSocialProfiles() {
  return (siteConfig.socialProfileUrls ?? []).filter((value) => {
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  });
}

function structuredOpeningHours() {
  return (siteConfig.openingHours ?? []).flatMap((period) => {
    const days = Array.isArray(period?.days)
      ? period.days.filter((day) => typeof day === "string" && day.trim())
      : [];
    const validTime = (value) => typeof value === "string" && /^\d{2}:\d{2}$/u.test(value);

    if (days.length === 0 || !validTime(period?.opens) || !validTime(period?.closes)) {
      return [];
    }

    return [{
      "@type": "OpeningHoursSpecification",
      dayOfWeek: days,
      opens: period.opens,
      closes: period.closes,
    }];
  });
}

export function structuredData(language) {
  const copy = seoCopy[language];
  const origin = configuredSiteOrigin();
  const logoUrl = origin ? absolutePublicUrl(siteConfig.logoPath) : null;
  const pageUrl = origin ? absolutePublicUrl(`/${language}/`) : null;
  const graph = [];

  const website = {
    "@type": "WebSite",
    name: siteConfig.brandName,
    inLanguage: ["es-US", "en-US"],
  };
  if (origin) {
    website["@id"] = `${origin}/#website`;
    website.url = `${origin}/`;
  }
  graph.push(website);

  const business = {
    "@type": ["DaySpa", "BeautySalon"],
    name: siteConfig.brandName,
    description: copy.description,
    currenciesAccepted: siteConfig.currency,
    availableLanguage: ["Spanish", "English"],
    telephone: /^\d{8,15}$/u.test(siteConfig.whatsappNumber ?? "")
      ? `+${siteConfig.whatsappNumber}`
      : undefined,
    openingHoursSpecification: structuredOpeningHours(),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: language === "es" ? "Servicios de belleza y bienestar" : "Beauty and wellness services",
      itemListElement: copy.services.map((name) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name,
        },
      })),
    },
  };

  if (origin) {
    business["@id"] = `${origin}/#business`;
    business.url = pageUrl;
    business.image = absolutePublicUrl("/images/hero-facial.png");
    business.logo = logoUrl;
  }

  const sameAs = publicSocialProfiles();
  if (sameAs.length > 0) business.sameAs = sameAs;

  graph.push(business);
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph })
    .replaceAll("<", "\\u003c");
}
