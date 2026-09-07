/**
 * Business information lives here so it can be replaced without touching the
 * catalog or presentation logic. Keep unknown values as null; the interface
 * will show an honest placeholder instead of publishing invented details.
 */
export const siteConfig = Object.freeze({
  brandName: "Comfort & Glow SPA",
  logoPath: "/images/logo-comfort-glow-spa.png",
  countryCode: "US",
  currency: "USD",
  showCents: true,
  whatsappNumber: "19048880618",
  hours: Object.freeze({
    es: "Lunes a sábado · 8:00 a. m. – 6:00 p. m.",
    en: "Monday–Saturday · 8:00 a.m.–6:00 p.m.",
  }),
  consultationIsFree: true,
  bookingPolicy: Object.freeze({
    depositUsd: 15,
    lateToleranceMinutes: 15,
    cancellationNoticeHours: 24,
  }),
});
