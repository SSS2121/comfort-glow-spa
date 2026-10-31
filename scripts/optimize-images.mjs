import { createHash } from "node:crypto";
import { mkdir, readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

import sharp from "sharp";

const projectRoot = resolve(import.meta.dirname, "..");
const clientSourceDirectory = resolve(projectRoot, "assets", "masters", "client");
const outputDirectory = resolve(projectRoot, "public", "images");
const logoOutputDirectory = resolve(outputDirectory, "Logos");
const slideshowOutputDirectory = resolve(outputDirectory, "slideshow");
const slideshowNames = [
  "spa-pedicure",
  "warm-manicure",
  "accessible-manicure",
  "leg-waxing",
  "body-exfoliation",
  "pink-nail-art",
  "facial-treatment",
  "wood-therapy",
];

// These are the exact photographs approved and supplied by the client. Their
// public base files are never rewritten or removed; the build only creates
// smaller PNG derivatives for responsive delivery.
const assets = [
  { name: "hero-facial", width: 1312, height: 1199, variants: [540, 810] },
  { name: "facial", width: 1370, height: 1148, variants: [480, 800] },
  { name: "anti-aging-facial", width: 1280, height: 960, variants: [480, 800] },
  { name: "acne-facial", width: 1280, height: 960, variants: [480, 800] },
  { name: "exfoliation", width: 1370, height: 1148, variants: [480, 800] },
  { name: "depilation", width: 1370, height: 1148, variants: [480, 800] },
  { name: "nails", width: 1254, height: 1254, variants: [480, 800] },
  { name: "toenails", width: 1254, height: 1254, variants: [480, 800] },
  { name: "body-care", width: 1280, height: 960, variants: [480, 800] },
  { name: "accessible-home-care", width: 1080, height: 1350, variants: [480, 800] },
];

const logo = {
  name: "logo-d3-glow-spa",
  width: 2067,
  height: 761,
  variants: [320, 640, 1280],
  requiresTransparency: true,
  publicPath: resolve(logoOutputDirectory, "logo-d3-glow-spa.png"),
};

const faviconCrop = Object.freeze({
  left: 56,
  top: 94,
  width: 889,
  height: 537,
});

await Promise.all([
  mkdir(outputDirectory, { recursive: true }),
  mkdir(logoOutputDirectory, { recursive: true }),
  mkdir(slideshowOutputDirectory, { recursive: true }),
]);

async function fileHash(path) {
  const contents = await readFile(path);
  return createHash("sha256").update(contents).digest("hex");
}

async function validatePreservedFile({
  name,
  width,
  height,
  publicPath,
  requiresTransparency = false,
}) {
  const source = resolve(clientSourceDirectory, `${name}.png`);
  const published = publicPath ?? resolve(outputDirectory, `${name}.png`);
  const [
    sourceMetadata,
    publishedMetadata,
    sourceStats,
    publishedStats,
    sourceHash,
    publishedHash,
  ] = await Promise.all([
    sharp(source).metadata(),
    sharp(published).metadata(),
    sharp(source).stats(),
    sharp(published).stats(),
    fileHash(source),
    fileHash(published),
  ]);

  if (sourceMetadata.width !== width || sourceMetadata.height !== height) {
    throw new Error(
      `${name}.png master has unexpected dimensions: ${sourceMetadata.width}x${sourceMetadata.height}.`,
    );
  }

  if (publishedMetadata.width !== width || publishedMetadata.height !== height) {
    throw new Error(
      `${name}.png public file has unexpected dimensions: ${publishedMetadata.width}x${publishedMetadata.height}.`,
    );
  }

  if (sourceHash !== publishedHash) {
    throw new Error(
      `${name}.png differs from the client-approved master. Restore the approved file before building.`,
    );
  }

  if (requiresTransparency && (
    sourceMetadata.hasAlpha !== true
    || publishedMetadata.hasAlpha !== true
    || sourceStats.isOpaque
    || publishedStats.isOpaque
  )) {
    throw new Error(`${name}.png must preserve a non-opaque alpha channel.`);
  }

  return source;
}

async function optimizeAsset(asset) {
  const input = await validatePreservedFile(asset);

  return Promise.all(asset.variants.map(async (width) => {
    const filename = `${asset.name}-${width}.png`;
    const output = resolve(outputDirectory, filename);

    await sharp(input)
      .rotate()
      .resize({
        width,
        fit: "inside",
        withoutEnlargement: true,
      })
      .png({
        adaptiveFiltering: true,
        compressionLevel: 9,
        effort: 10,
        palette: false,
      })
      .toFile(output);

    const [outputStats, metadata] = await Promise.all([
      stat(output),
      sharp(output).metadata(),
    ]);

    return `${filename}: ${metadata.width}x${metadata.height} truecolor PNG ${Math.round(outputStats.size / 1024)} KB`;
  }));
}

const logoSource = await validatePreservedFile(logo);
const logoResults = await Promise.all(logo.variants.map(async (width) => {
  const filename = `logo-d3-glow-spa-${width}.png`;
  const output = resolve(logoOutputDirectory, filename);

  await sharp(logoSource)
    .resize({ width, fit: "inside", withoutEnlargement: true })
    .png({ adaptiveFiltering: true, compressionLevel: 9, effort: 10, palette: false })
    .toFile(output);

  const [outputStats, metadata] = await Promise.all([
    stat(output),
    sharp(output).metadata(),
  ]);
  return `Logos/${filename}: ${metadata.width}x${metadata.height} alpha PNG ${Math.round(outputStats.size / 1024)} KB`;
}));

const monogram = await sharp(logoSource)
  .extract(faviconCrop)
  // Remove the isolated top edge of the S from the SPA line; the D3 artwork is untouched.
  .composite([{
    input: {
      create: {
        width: 46,
        height: 18,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    },
    left: 807,
    top: 519,
    blend: "dest-out",
  }])
  .png()
  .toBuffer();

const faviconResults = await Promise.all([32, 180, 512].map(async (size) => {
  const filename = `favicon-d3-glow-spa-${size}.png`;
  const output = resolve(logoOutputDirectory, filename);
  const innerSize = Math.max(1, Math.round(size * 0.9));
  const leadingPadding = Math.floor((size - innerSize) / 2);
  const trailingPadding = size - innerSize - leadingPadding;

  await sharp(monogram)
    .resize({
      width: innerSize,
      height: innerSize,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .extend({
      top: leadingPadding,
      bottom: trailingPadding,
      left: leadingPadding,
      right: trailingPadding,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ adaptiveFiltering: true, compressionLevel: 9, effort: 10, palette: false })
    .toFile(output);

  const outputStats = await stat(output);
  return `Logos/${filename}: ${size}x${size} alpha PNG ${Math.round(outputStats.size / 1024)} KB`;
}));

// Keep the supplied JPEGs unchanged; publish lightweight, uncropped WebP
// derivatives for the full-width slideshow in both languages.
const slideshowResults = await Promise.all(slideshowNames.flatMap((name) => (
  [640, 1280].map(async (width) => {
    const filename = `${name}-${width}.webp`;
    const source = resolve(clientSourceDirectory, "slideshow", `${name}.jpeg`);
    const output = resolve(slideshowOutputDirectory, filename);
    await sharp(source)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 85, effort: 5 })
      .toFile(output);
    const metadata = await sharp(output).metadata();
    return `slideshow/${filename}: ${metadata.width}x${metadata.height} WebP`;
  })
)));

const groupedResults = await Promise.all(assets.map(optimizeAsset));
const results = [...logoResults, ...faviconResults, ...groupedResults.flat(), ...slideshowResults];
console.log(`Generated ${results.length} responsive image variants.`);
console.log("Client-approved base images and logo were validated and left unchanged.");
for (const result of results) console.log(`- ${result}`);
