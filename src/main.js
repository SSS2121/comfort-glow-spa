// =============================================================================
// 1. IMPORTACIONES, CONSTANTES Y ESTADO GLOBAL
// =============================================================================
import { siteConfig } from "./config/site.js";
import "./analytics.js";
import { categories, services } from "./data/services.js";
import { uiContent } from "./data/ui-content.js";
import {
  buildWhatsAppUrl,
  clampQuery,
  filterServices,
  formatPrice,
  groupServices,
  resolveLanguage,
} from "./lib/catalog-utils.js";

const STORAGE_KEY = "beautyStudio.locale.v1";
const language = resolveLanguage(document.documentElement.lang);
const copy = uiContent[language];
const groupedServices = groupServices(services.filter((service) => service.published !== false));
const validCategoryIds = new Set(categories.map((category) => category.id));
const categoryById = new Map(categories.map((category) => [category.id, category]));

const state = {
  categoryId: "all",
  query: "",
};

// Referencias a elementos interactivos clave del DOM
const elements = {
  categoryFilters: document.querySelector("[data-category-filters]"),
  emptyState: document.querySelector("[data-empty-state]"),
  grid: document.querySelector("[data-service-grid]"),
  menuToggle: document.querySelector("[data-menu-toggle]"),
  navigation: document.querySelector("[data-navigation]"),
  resultCount: document.querySelector("[data-result-count]"),
  search: document.querySelector("[data-search]"),
  searchClear: document.querySelector("[data-search-clear]"),
};

// =============================================================================
// 2. UTILIDADES DE MANIPULACIÓN SEGURA DEL DOM
// =============================================================================
function createNode(tagName, className, text) {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function localizedConfig(value) {
  if (!value || typeof value !== "object") return null;
  const candidate = value[language];
  return typeof candidate === "string" && candidate.trim() ? candidate.trim() : null;
}

function safeImagePath(value) {
  return typeof value === "string"
    && /^\/images\/[a-z0-9/_-]+\.(?:avif|png|webp)$/u.test(value)
    && !value.includes("..");
}

function setTextForAll(selector, value) {
  for (const element of document.querySelectorAll(selector)) {
    element.textContent = value;
  }
}

function setContactValue(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value ?? copy.pending;
}

// =============================================================================
// 3. DATOS DE NEGOCIO, HORARIOS, POLÍTICAS Y RESERVAS WHATSAPP
// =============================================================================
function configureBusinessDetails() {
  const brandName = typeof siteConfig.brandName === "string" && siteConfig.brandName.trim()
    ? siteConfig.brandName.trim()
    : copy.brandPlaceholder;

  setTextForAll("[data-brand]", brandName);
  setTextForAll("[data-current-year]", String(new Date().getFullYear()));

  const logoElements = document.querySelectorAll("[data-logo]");
  if (safeImagePath(siteConfig.logoPath)) {
    for (const logo of logoElements) {
      logo.src = siteConfig.logoPath;
      logo.alt = "";
      logo.hidden = false;
      const fallback = logo.nextElementSibling;
      if (fallback) fallback.hidden = true;
    }
  }

  setContactValue("[data-hours]", localizedConfig(siteConfig.hours));

  const bookingPolicy = siteConfig.bookingPolicy;
  if (bookingPolicy && typeof bookingPolicy === "object") {
    if (Number.isFinite(bookingPolicy.depositUsd)) {
      setTextForAll("[data-booking-deposit]", formatPrice(bookingPolicy.depositUsd, language));
    }
    if (Number.isInteger(bookingPolicy.lateToleranceMinutes)) {
      setTextForAll("[data-late-tolerance]", String(bookingPolicy.lateToleranceMinutes));
    }
    if (Number.isInteger(bookingPolicy.cancellationNoticeHours)) {
      setTextForAll("[data-cancellation-notice]", String(bookingPolicy.cancellationNoticeHours));
    }
  }

  if (siteConfig.consultationIsFree !== true) {
    for (const element of document.querySelectorAll("[data-free-consultation]")) {
      element.hidden = true;
    }
  }

  const validPhone = typeof siteConfig.whatsappNumber === "string"
    && /^\d{8,15}$/u.test(siteConfig.whatsappNumber);
  setContactValue("[data-whatsapp]", validPhone ? `+${siteConfig.whatsappNumber}` : null);

  const appointment = {
    name: { es: "una cita", en: "an appointment" },
    variant: { es: "", en: "" },
  };
  const bookingUrl = buildWhatsAppUrl(siteConfig.whatsappNumber, appointment, language);

  if (bookingUrl) {
    for (const trigger of document.querySelectorAll("[data-booking]")) {
      const link = trigger instanceof HTMLAnchorElement
        ? trigger
        : createNode("a", trigger.className, copy.booking);
      link.href = bookingUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = copy.booking;
      link.removeAttribute("aria-disabled");
      link.classList.remove("button--muted");
      if (link !== trigger) trigger.replaceWith(link);
    }
  } else {
    for (const trigger of document.querySelectorAll("[data-booking]")) {
      if (trigger instanceof HTMLAnchorElement) {
        trigger.textContent = copy.bookingInfo;
        trigger.removeAttribute("target");
        trigger.removeAttribute("rel");
      } else {
        trigger.textContent = copy.bookingPending;
      }
    }
  }
}

// =============================================================================
// 4. GESTIÓN DEL ESTADO EN LA URL (?category=...)
// =============================================================================
function configuredCategoryFromUrl() {
  const url = new URL(window.location.href);
  const candidate = url.searchParams.get("category");
  const categoryId = candidate && validCategoryIds.has(candidate) ? candidate : "all";

  if (categoryId === "all") url.searchParams.delete("category");
  else url.searchParams.set("category", categoryId);
  window.history.replaceState(null, "", url);

  return categoryId;
}

function updateCategoryUrl(hash = window.location.hash) {
  const url = new URL(window.location.href);
  if (state.categoryId === "all") url.searchParams.delete("category");
  else url.searchParams.set("category", state.categoryId);
  url.hash = hash;
  window.history.replaceState(null, "", url);
}

// =============================================================================
// 5. RENDERIZADO DE FILTROS DE CATEGORÍA
// =============================================================================
function renderFilters() {
  if (!elements.categoryFilters) return;

  const fragment = document.createDocumentFragment();
  const choices = [
    { id: "all", name: { es: copy.allCategories, en: copy.allCategories } },
    ...categories,
  ];

  for (const category of choices) {
    const isActive = category.id === state.categoryId;
    const button = createNode(
      "button",
      `filter-chip${isActive ? " is-active" : ""}`,
      category.name[language],
    );
    button.type = "button";
    button.dataset.categoryId = category.id;
    button.setAttribute("aria-pressed", String(isActive));
    button.addEventListener("click", () => {
      state.categoryId = category.id;
      updateCategoryUrl();
      renderFilters();
      renderCatalog();
    });
    fragment.append(button);
  }

  elements.categoryFilters.replaceChildren(fragment);
}

// =============================================================================
// 6. GENERACIÓN DE TARJETAS Y VARIANTES DEL CATÁLOGO (DOM)
// =============================================================================
function createBookingAction(group, variant) {
  const bookingUrl = buildWhatsAppUrl(
    siteConfig.whatsappNumber,
    { name: group.name, variant: variant.variant },
    language,
  );

  if (!bookingUrl) {
    const unavailable = createNode("span", "service-action is-disabled", copy.requestUnavailable);
    unavailable.setAttribute("aria-disabled", "true");
    return unavailable;
  }

  const link = createNode("a", "service-action", copy.requestService);
  link.href = bookingUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  return link;
}

function createVariant(group, variant) {
  const item = createNode("li", "service-variant");
  const information = createNode("div", "variant-information");
  const variantName = createNode("strong", "variant-name", variant.variant[language]);
  information.append(variantName);

  if (variant.duration) {
    const duration = createNode("span", "variant-duration", `${copy.duration}: ${variant.duration}`);
    information.append(duration);
  }

  const priceAndAction = createNode("div", "variant-purchase");
  priceAndAction.append(
    createNode("span", "variant-price", formatPrice(variant.price, language)),
    createBookingAction(group, variant),
  );
  item.append(information, priceAndAction);
  return item;
}

function priceRange(variants) {
  const prices = variants
    .map((variant) => variant.price)
    .filter((price) => typeof price === "number" && Number.isFinite(price));

  if (prices.length === 0) return "";
  const minimum = Math.min(...prices);
  const maximum = Math.max(...prices);
  return minimum === maximum
    ? formatPrice(minimum, language)
    : `${formatPrice(minimum, language)} – ${formatPrice(maximum, language)}`;
}

function createServiceCard(group) {
  const article = createNode("article", "service-card");
  const category = categoryById.get(group.categoryId);
  const headingRow = createNode("div", "service-heading-row");
  const heading = createNode("h3", "service-name", group.name[language]);
  const categoryName = category?.name?.[language] ?? "";
  const categoryLabel = createNode("span", "service-category", categoryName);
  headingRow.append(categoryLabel, createNode("span", "service-range", priceRange(group.variants)));

  const details = createNode("details", "service-details");
  const optionLabel = language === "en"
    ? `${group.variants.length} ${group.variants.length === 1 ? "option" : "options"}`
    : `${group.variants.length} ${group.variants.length === 1 ? "opción" : "opciones"}`;
  const summary = createNode("summary", "service-summary");
  summary.append(
    createNode("span", "", `${optionLabel} · ${copy.details}`),
    createNode("span", "summary-icon", "+"),
  );

  const detailBody = createNode("div", "service-detail-body");
  detailBody.append(createNode("p", "service-description", group.description[language]));
  const variants = createNode("ul", "variant-list");
  for (const variant of group.variants) variants.append(createVariant(group, variant));
  detailBody.append(variants);
  details.append(summary, detailBody);
  article.append(headingRow, heading, details);
  return article;
}

// =============================================================================
// 7. RENDERIZADO PRINCIPAL DEL CATÁLOGO Y CONTEO DE RESULTADOS
// =============================================================================
function renderCatalog() {
  if (!elements.grid) return;

  const searchMatches = filterServices(groupedServices, state.query, language);
  const visibleServices = state.categoryId === "all"
    ? searchMatches
    : searchMatches.filter((service) => service.categoryId === state.categoryId);
  const fragment = document.createDocumentFragment();

  for (const service of visibleServices) fragment.append(createServiceCard(service));
  elements.grid.replaceChildren(fragment);

  if (elements.resultCount) {
    const resultLabel = visibleServices.length === 1 ? copy.resultSingular : copy.resultPlural;
    elements.resultCount.textContent = `${visibleServices.length} ${resultLabel}`;
  }
  if (elements.emptyState) elements.emptyState.hidden = visibleServices.length !== 0;
}

// =============================================================================
// 8. BÚSQUEDA Y FILTRADO EN TIEMPO REAL
// =============================================================================
function configureSearch() {
  if (!elements.search) return;

  elements.search.addEventListener("input", () => {
    const safeQuery = clampQuery(elements.search.value);
    if (elements.search.value !== safeQuery) elements.search.value = safeQuery;
    state.query = safeQuery;
    if (elements.searchClear) elements.searchClear.hidden = safeQuery.length === 0;
    renderCatalog();
  });

  elements.searchClear?.addEventListener("click", () => {
    elements.search.value = "";
    state.query = "";
    elements.searchClear.hidden = true;
    elements.search.focus();
    renderCatalog();
  });
}

// =============================================================================
// 9. CONEXIÓN INTERACTIVA: DESTACADOS (#destacado / #outstanding) -> CATÁLOGO
// =============================================================================
function configureFeaturedLinks() {
  const catalogId = language === "en" ? "catalog" : "catalogo";

  for (const link of document.querySelectorAll("[data-feature-category], [data-feature-query]")) {
    link.addEventListener("click", (event) => {
      event.preventDefault();

      const categoryId = link.dataset.featureCategory;
      state.categoryId = categoryId && validCategoryIds.has(categoryId) ? categoryId : "all";
      state.query = clampQuery(link.dataset.featureQuery ?? "");

      if (elements.search) elements.search.value = state.query;
      if (elements.searchClear) elements.searchClear.hidden = state.query.length === 0;

      updateCategoryUrl(`#${catalogId}`);
      renderFilters();
      renderCatalog();
      document.getElementById(catalogId)?.scrollIntoView();
    });
  }
}

// =============================================================================
// 10. MENÚ DE NAVEGACIÓN MÓVIL Y ACCESIBILIDAD (TECLA ESCAPE, FOCO)
// =============================================================================
function configureNavigation() {
  if (!elements.menuToggle || !elements.navigation) return;

  const mobileNavigation = window.matchMedia("(max-width: 68rem)");

  const closeMenu = ({ restoreFocus = false } = {}) => {
    elements.menuToggle.setAttribute("aria-expanded", "false");
    elements.menuToggle.setAttribute("aria-label", copy.menuOpen);
    document.body.classList.remove("menu-is-open");
    elements.navigation.inert = mobileNavigation.matches;
    if (restoreFocus) elements.menuToggle.focus();
  };

  elements.menuToggle.addEventListener("click", () => {
    const willOpen = elements.menuToggle.getAttribute("aria-expanded") !== "true";
    elements.menuToggle.setAttribute("aria-expanded", String(willOpen));
    elements.menuToggle.setAttribute("aria-label", willOpen ? copy.menuClose : copy.menuOpen);
    document.body.classList.toggle("menu-is-open", willOpen);
    elements.navigation.inert = mobileNavigation.matches && !willOpen;
  });

  elements.navigation.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("a")) closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    const isOpen = elements.menuToggle.getAttribute("aria-expanded") === "true";
    if (event.key === "Escape" && isOpen) closeMenu({ restoreFocus: true });
  });

  mobileNavigation.addEventListener("change", () => closeMenu());
  closeMenu();
}

// =============================================================================
// 11. CAMBIO Y PERSISTENCIA DE IDIOMA (LOCALSTORAGE)
// =============================================================================
function configureLocaleLinks() {
  for (const link of document.querySelectorAll("[data-locale-link]")) {
    link.addEventListener("click", () => {
      const nextLanguage = resolveLanguage(link.dataset.localeLink, language);
      try {
        window.localStorage.setItem(STORAGE_KEY, nextLanguage);
      } catch {
        // Locale navigation remains functional even when storage is blocked.
      }
    });
  }
}

// =============================================================================
// 12. ANIMACIONES SUAVES AL HACER SCROLL (INTERSECTION OBSERVER)
// =============================================================================
function configureReveal() {
  const revealItems = [...document.querySelectorAll("[data-reveal]")];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reducedMotion || !("IntersectionObserver" in window)) {
    for (const item of revealItems) item.classList.add("is-visible");
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  }, { rootMargin: "0px 0px -8%", threshold: 0.08 });

  for (const item of revealItems) observer.observe(item);
}

// =============================================================================
// 13. FLUJO DE INICIALIZACIÓN DE LA APLICACIÓN
// =============================================================================
configureBusinessDetails();
state.categoryId = configuredCategoryFromUrl();
configureNavigation();
configureLocaleLinks();
configureSearch();
configureFeaturedLinks();
renderFilters();
renderCatalog();
configureReveal();
