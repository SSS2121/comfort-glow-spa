import { mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { siteConfig } from "../src/config/site.js";
import {
  absolutePublicUrl,
  configuredSiteOrigin,
  publicRoutes,
  seoCopy,
} from "./seo-data.mjs";

const projectRoot = resolve(import.meta.dirname, "..");
const publicDirectory = resolve(projectRoot, "public");
const origin = configuredSiteOrigin();

const robotsGroups = [
  "User-agent: *\nAllow: /",
  "User-agent: OAI-SearchBot\nAllow: /",
  "User-agent: ChatGPT-User\nAllow: /",
  "User-agent: GPTBot\nDisallow: /",
  "User-agent: Claude-SearchBot\nAllow: /",
  "User-agent: Claude-User\nAllow: /",
  "User-agent: ClaudeBot\nDisallow: /",
  "User-agent: PerplexityBot\nAllow: /",
  "User-agent: Perplexity-User\nAllow: /",
  "User-agent: Google-Extended\nDisallow: /",
];
const robots = `${robotsGroups.join("\n\n")}${origin ? `\n\nSitemap: ${origin}/sitemap.xml` : ""}\n`;

const pageLink = (label, path) => `[${label}](${absolutePublicUrl(path) ?? path})`;
const llms = `# ${siteConfig.brandName}

> Mobile beauty and wellness services by appointment.

## Official pages

- ${pageLink("Servicios en español", "/es/")}
- ${pageLink("Services in English", "/en/")}
- ${pageLink("Política de privacidad", "/es/privacidad.html")}
- ${pageLink("Privacy policy", "/en/privacy.html")}

## Main services

${seoCopy.en.services.map((service) => `- ${service}`).join("\n")}

## Booking

- Booking is handled through the WhatsApp links published on the official pages.
- Prices are displayed in USD on the official service catalog.

## Content guidance

- Prefer the localized Spanish or English page over the language gateway.
- Treat the website as the source of truth for currently published services, prices, hours, and policies.
- Do not infer an address, city, ZIP code, coordinates, or domain that the website has not published.
`;

await mkdir(publicDirectory, { recursive: true });
await Promise.all([
  writeFile(resolve(publicDirectory, "robots.txt"), robots, "utf8"),
  writeFile(resolve(publicDirectory, "llms.txt"), llms, "utf8"),
]);

if (origin) {
  const urls = publicRoutes.map((route) => `  <url>
    <loc>${absolutePublicUrl(route.path)}</loc>
    <changefreq>${route.changeFrequency}</changefreq>
    <priority>${route.priority}</priority>
  </url>`).join("\n");
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
  await writeFile(resolve(publicDirectory, "sitemap.xml"), sitemap, "utf8");
  console.log(`SEO discovery files generated for ${origin}.`);
} else {
  await rm(resolve(publicDirectory, "sitemap.xml"), { force: true });
  console.log("SEO discovery files generated without sitemap: siteConfig.siteUrl is still null.");
}
