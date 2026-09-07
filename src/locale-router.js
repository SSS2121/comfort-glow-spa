const STORAGE_KEY = "beautyStudio.locale.v1";
const supportedLanguages = new Set(["es", "en"]);

function safeStoredLanguage() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return supportedLanguages.has(stored) ? stored : null;
  } catch {
    return null;
  }
}

function browserLanguage() {
  const candidates = Array.isArray(navigator.languages)
    ? navigator.languages
    : [navigator.language];

  for (const candidate of candidates) {
    const language = typeof candidate === "string" ? candidate.slice(0, 2).toLowerCase() : "";
    if (supportedLanguages.has(language)) return language;
  }

  return "es";
}

function storeLanguage(language) {
  if (!supportedLanguages.has(language)) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // A blocked storage API must never prevent navigation.
  }
}

const preferredLanguage = safeStoredLanguage() ?? browserLanguage();
const status = document.querySelector("[data-gateway-status]");
const choiceLinks = document.querySelectorAll("[data-language-choice]");

if (status) {
  status.textContent = preferredLanguage === "en"
    ? "Opening the English experience…"
    : "Abriendo la experiencia en español…";
}

for (const link of choiceLinks) {
  link.addEventListener("click", () => {
    storeLanguage(link.dataset.languageChoice);
  });
}

window.setTimeout(() => {
  window.location.replace(preferredLanguage === "en" ? "/en/" : "/es/");
}, 650);
