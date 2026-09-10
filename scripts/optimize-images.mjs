import { createHash } from "node:crypto";
import { mkdir, readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

import sharp from "sharp";

const projectRoot = resolve(import.meta.dirname, "..");
const clientSourceDirectory = resolve(projectRoot, "assets", "masters", "client");
const outputDirectory = resolve(projectRoot, "public", "images");

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
  name: "logo-comfort-glow-spa",
  width: 1800,
  height: 720,
  publicPath: resolve(outputDirectory, "Logos", "logo-comfort-glow-spa.png"),
};

await mkdir(outputDirectory, { recursive: true });

async function fileHash(path) {
  const contents = await readFile(path);
  return createHash("sha256").update(contents).digest("hex");
}

async function validatePreservedFile({ name, width, height, publicPath }) {
  const source = resolve(clientSourceDirectory, `${name}.png`);
  const published = publicPath ?? resolve(outputDirectory, `${name}.png`);
  const [sourceMetadata, publishedMetadata, sourceHash, publishedHash] = await Promise.all([
    sharp(source).metadata(),
    sharp(published).metadata(),
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

await validatePreservedFile(logo);

const groupedResults = await Promise.all(assets.map(optimizeAsset));
const results = groupedResults.flat();
console.log(`Generated ${results.length} responsive PNG variants.`);
console.log("Client-approved base images and logo were validated and left unchanged.");
for (const result of results) console.log(`- ${result}`);
