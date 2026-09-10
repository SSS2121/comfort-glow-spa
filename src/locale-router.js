const STORAGE_KEY = "beautyStudio.locale.v1";
const supportedLanguages = new Set(["es", "en"]);
const Buttons_spanish = document.querySelectorAll("[data-language-choice=es]");
const Buttons_english = document.querySelectorAll("[data-language-choice=en]");

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

Buttons_spanish.forEach((button) => {
  button.addEventListener("click", () => {
    status.textContent = preferredLanguage === "en"
      ? "Opening the English experience…"
      : "Abriendo la experiencia en español…";
    storeLanguage(button.dataset.languageChoice);
    window.location.replace(button.dataset.languageChoice === "en" ? "/en/" : "/es/");
  });
});

Buttons_english.forEach((button) => {
  button.addEventListener("click", () => {
    status.textContent = preferredLanguage === "en"
      ? "Opening the English experience…"
      : "Abriendo la experiencia en español…";
    storeLanguage(button.dataset.languageChoice);
    window.location.replace(button.dataset.languageChoice === "en" ? "/en/" : "/es/");
  });
});
