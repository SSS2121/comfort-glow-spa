/**
 * Business information lives here so it can be replaced without touching the
 * catalog or presentation logic. Keep unknown values as null; the interface
 * will show an honest placeholder instead of publishing invented details.
 */
export const siteConfig = Object.freeze({
  brandName: "D3 Glow Spa",
  logoPath: "/images/Logos/logo-d3-glow-spa-640.png",
  siteUrl: "https://d3glowspa.com",
  currency: "USD",
  showCents: true,
  whatsappNumber: "19049825307",
  socialProfileUrls: Object.freeze([]),
  hours: Object.freeze({
    es: "Lunes a sábado · 8:00 a. m. – 6:00 p. m.",
    en: "Monday–Saturday · 8:00 a.m.–6:00 p.m.",
  }),
  openingHours: Object.freeze([Object.freeze({
    days: Object.freeze([
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ]),
    opens: "08:00",
    closes: "18:00",
  })]),
  consultationIsFree: true,
  bookingPolicy: Object.freeze({
    depositUsd: 15,
    lateToleranceMinutes: 15,
    cancellationNoticeHours: 24,
  }),
});
