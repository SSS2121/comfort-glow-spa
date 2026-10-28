import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import sharp from "sharp";

const projectRoot = resolve(import.meta.dirname, "..");
const logoDirectory = resolve(projectRoot, "public", "images", "Logos");
const distDirectory = resolve(projectRoot, "dist");
const expectedOrigin = "https://d3glowspa.com";

const expectedImages = Object.freeze({
  "logo-d3-glow-spa.png": [2067, 761],
  "logo-d3-glow-spa-320.png": [320, 118],
  "logo-d3-glow-spa-640.png": [640, 236],
  "logo-d3-glow-spa-1280.png": [1280, 471],
  "favicon-d3-glow-spa-32.png": [32, 32],
  "favicon-d3-glow-spa-180.png": [180, 180],
  "favicon-d3-glow-spa-512.png": [512, 512],
});

async function validateTransparentImage(filename, [expectedWidth, expectedHeight]) {
  const path = resolve(logoDirectory, filename);
  const [metadata, stats, raw] = await Promise.all([
    sharp(path).metadata(),
    sharp(path).stats(),
    sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);

  assert.equal(metadata.width, expectedWidth, `${filename} has an unexpected width.`);
  assert.equal(metadata.height, expectedHeight, `${filename} has an unexpected height.`);
  assert.equal(metadata.hasAlpha, true, `${filename} must have an alpha channel.`);
  assert.equal(stats.isOpaque, false, `${filename} must include transparent pixels.`);

  const { data, info } = raw;
  const alphaAt = (x, y) => data[((y * info.width) + x) * info.channels + 3];
  const cornerAlpha = [
    alphaAt(0, 0),
    alphaAt(info.width - 1, 0),
    alphaAt(0, info.height - 1),
    alphaAt(info.width - 1, info.height - 1),
  ];
  assert(cornerAlpha.every((alpha) => alpha === 0), `${filename} must have transparent corners.`);

  let visiblePixels = 0;
  for (let index = 3; index < data.length; index += info.channels) {
    if (data[index] > 10) visiblePixels += 1;
  }
  const coverage = visiblePixels / (info.width * info.height);
  assert(coverage > 0.01 && coverage < 0.75, `${filename} has implausible subject coverage.`);
}

function extractStructuredData(html) {
  const match = html.match(/<script type="application\/ld\+json">(?<json>[\s\S]*?)<\/script>/u);
  assert(match?.groups?.json, "Localized page is missing JSON-LD structured data.");
  return JSON.parse(match.groups.json);
}

function validateLocalizedPage(html, language) {
  const route = `/${language}/`;
  assert(html.includes(`<link rel="canonical" href="${expectedOrigin}${route}">`));
  assert(html.includes('<link rel="alternate" hreflang="es-US"'));
  assert(html.includes('<link rel="alternate" hreflang="en-US"'));
  assert(html.includes('<link rel="alternate" hreflang="x-default"'));
  assert(html.includes('<meta name="geo.region" content="US-FL">'));
  assert(html.includes('<meta name="geo.placename" content="Orange Park">'));
  assert(html.includes(`<meta name="twitter:image" content="${expectedOrigin}/images/hero-facial.png">`));
  assert(html.includes("Orange Park"));
  assert(html.includes("Jacksonville"));
  assert(html.includes("WhatsApp"));
  assert(!html.includes("Visit our Orange Park studio"));
  assert(!html.includes("Visita nuestro espacio en Orange Park"));

  const structuredData = extractStructuredData(html);
  const business = structuredData["@graph"].find((item) => item["@id"] === `${expectedOrigin}/#business`);
  assert(business, "Localized page is missing the D3 Glow Spa business entity.");
  assert.deepEqual(business["@type"], ["DaySpa", "BeautySalon"]);
  assert.equal(business.address.addressLocality, "Orange Park");
  assert.equal(business.address.addressRegion, "FL");
  assert.equal(business.address.addressCountry, "US");
  assert.equal(business.address.streetAddress, undefined);
  assert.equal(business.address.postalCode, undefined);
  assert.equal(business.geo, undefined);
  assert.deepEqual(
    business.areaServed.map((area) => area.name),
    ["Orange Park, Florida", "Jacksonville, Florida"],
  );
  assert(business.areaServed.every((area) => area["@type"] === "City"));
  assert.equal(business.openingHoursSpecification[0].opens, "08:00");
  assert.equal(business.openingHoursSpecification[0].closes, "18:00");
}

await Promise.all(Object.entries(expectedImages).map(([filename, dimensions]) => (
  validateTransparentImage(filename, dimensions)
)));

const obsoletePaths = [
  resolve(projectRoot, "assets", "masters", "logo-chroma.png"),
  resolve(projectRoot, "assets", "masters", "client", "logo-comfort-glow-spa.png"),
  resolve(logoDirectory, "logo-comfort-glow-spa.png"),
  resolve(logoDirectory, "logo-d3-glow-spa-256.png"),
  resolve(logoDirectory, "logo-d3-glow-spa-512.png"),
];
for (const path of obsoletePaths) {
  await assert.rejects(access(path), { code: "ENOENT" }, `${path} must not exist.`);
}

const [gateway, english, spanish, sitemap, robots, llms] = await Promise.all([
  readFile(resolve(distDirectory, "index.html"), "utf8"),
  readFile(resolve(distDirectory, "en", "index.html"), "utf8"),
  readFile(resolve(distDirectory, "es", "index.html"), "utf8"),
  readFile(resolve(projectRoot, "public", "sitemap.xml"), "utf8"),
  readFile(resolve(projectRoot, "public", "robots.txt"), "utf8"),
  readFile(resolve(projectRoot, "public", "llms.txt"), "utf8"),
]);

assert(gateway.includes(`<link rel="canonical" href="${expectedOrigin}/">`));
assert(gateway.includes("D3 Glow Spa Mobile"));
assert(gateway.includes("Orange Park"));
assert(gateway.includes("Jacksonville"));
validateLocalizedPage(english, "en");
validateLocalizedPage(spanish, "es");

for (const route of ["/", "/en/", "/es/", "/en/privacy.html", "/es/privacidad.html"]) {
  assert(sitemap.includes(`<loc>${expectedOrigin}${route}</loc>`), `Sitemap is missing ${route}.`);
}
assert(robots.includes(`Sitemap: ${expectedOrigin}/sitemap.xml`));
assert(llms.includes("Orange Park, Florida"));
assert(llms.includes("Jacksonville, Florida"));
assert(llms.includes("does not receive customers at a public storefront"));

const searchableOutput = [gateway, english, spanish, sitemap, robots, llms].join("\n");
for (const obsoleteReference of [
  "Comfort & Glow",
  "logo-comfort-glow-spa",
  "logo-d3-glow-spa-256",
  "logo-d3-glow-spa-512",
]) {
  assert(!searchableOutput.includes(obsoleteReference), `Found obsolete reference: ${obsoleteReference}`);
}

console.log("Production validation passed: transparent logo assets, local SEO, discovery files, and obsolete references are correct.");
