import { mkdir, rm, stat } from "node:fs/promises";
import { resolve } from "node:path";

import sharp from "sharp";

const projectRoot = resolve(import.meta.dirname, "..");
const sourceDirectory = resolve(projectRoot, "assets", "masters");
const outputDirectory = resolve(projectRoot, "public", "images");

const assets = [
  { name: "hero-desktop", width: 1535, variants: [768, 1152] },
  { name: "hero-mobile", width: 1080, variants: [540, 810] },
  { name: "manicure", width: 1280, variants: [480, 800] },
  { name: "pedicure", width: 1280, variants: [480, 800] },
  { name: "facial", width: 1280, variants: [480, 800] },
  { name: "anti-aging-facial", width: 1280, variants: [480, 800] },
  { name: "acne-facial", width: 1280, variants: [480, 800] },
  { name: "hair-removal", width: 1280, variants: [480, 800] },
  { name: "exfoliation", width: 1280, variants: [480, 800] },
  { name: "body-care", width: 1280, variants: [480, 800] },
];

const logo = {
  source: "logo-chroma.png",
  name: "logo-comfort-glow-spa.png",
  width: 1800,
};

await mkdir(outputDirectory, { recursive: true });

async function optimizeAsset(asset) {
  const input = resolve(sourceDirectory, `${asset.name}.png`);
  const obsoleteOutputs = ["webp", "avif"]
    .map((extension) => resolve(outputDirectory, `${asset.name}.${extension}`));

  const outputs = [
    ...asset.variants.map((width) => ({
      filename: `${asset.name}-${width}.png`,
      width,
    })),
    { filename: `${asset.name}.png`, width: asset.width },
  ];

  const results = await Promise.all(outputs.map(async ({ filename, width }) => {
    const pngOutput = resolve(outputDirectory, filename);

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
      .toFile(pngOutput);

    const [pngStats, metadata] = await Promise.all([
      stat(pngOutput),
      sharp(pngOutput).metadata(),
    ]);

    return `${filename}: ${metadata.width}x${metadata.height} truecolor PNG ${Math.round(pngStats.size / 1024)} KB`;
  }));

  await Promise.all(obsoleteOutputs.map((output) => rm(output, { force: true })));
  return results;
}

function median(values) {
  values.sort((first, second) => first - second);
  return values[Math.floor(values.length / 2)];
}

function smoothstep(value) {
  const normalized = Math.max(0, Math.min(1, value));
  return normalized * normalized * (3 - (2 * normalized));
}

async function buildTransparentLogo() {
  const input = resolve(sourceDirectory, logo.source);
  const output = resolve(outputDirectory, logo.name);
  const { data, info } = await sharp(input)
    .rotate()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const borderSize = Math.max(8, Math.round(Math.min(info.width, info.height) * 0.015));
  const borderChannels = [[], [], []];

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const isBorder = x < borderSize
        || y < borderSize
        || x >= info.width - borderSize
        || y >= info.height - borderSize;

      if (!isBorder) continue;

      const offset = (y * info.width + x) * info.channels;
      for (let channel = 0; channel < 3; channel += 1) {
        borderChannels[channel].push(data[offset + channel]);
      }
    }
  }

  const keyColor = borderChannels.map(median);
  const foregroundMagenta = 10;
  const backgroundMagenta = 180;

  for (let offset = 0; offset < data.length; offset += info.channels) {
    const magentaExcess = Math.min(data[offset], data[offset + 2]) - data[offset + 1];
    const backgroundAmount = smoothstep(
      (magentaExcess - foregroundMagenta) / (backgroundMagenta - foregroundMagenta),
    );
    const alpha = (1 - backgroundAmount) * (data[offset + 3] / 255);

    if (alpha <= 0.01) {
      data[offset] = 0;
      data[offset + 1] = 0;
      data[offset + 2] = 0;
      data[offset + 3] = 0;
      continue;
    }

    if (alpha < 0.995) {
      for (let channel = 0; channel < 3; channel += 1) {
        const recovered = (
          data[offset + channel] - (keyColor[channel] * (1 - alpha))
        ) / alpha;
        data[offset + channel] = Math.max(0, Math.min(255, Math.round(recovered)));
      }

    }

    // The supplied mark contains forest green, neutral shadows and gold, but
    // no purple. Removing residual blue above green prevents chroma fringes
    // without flattening the warm gold channel.
    data[offset + 2] = Math.min(data[offset + 2], data[offset + 1]);

    data[offset + 3] = Math.round(alpha * 255);
  }

  const { data: resizedData, info: resizedInfo } = await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels,
    },
  })
    .resize({
      width: logo.width,
      fit: "inside",
      withoutEnlargement: true,
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let offset = 0; offset < resizedData.length; offset += resizedInfo.channels) {
    if (resizedData[offset + 3] === 0) {
      resizedData[offset] = 0;
      resizedData[offset + 1] = 0;
      resizedData[offset + 2] = 0;
      continue;
    }

    resizedData[offset + 2] = Math.min(resizedData[offset + 2], resizedData[offset + 1]);
  }

  await sharp(resizedData, {
    raw: {
      width: resizedInfo.width,
      height: resizedInfo.height,
      channels: resizedInfo.channels,
    },
  })
    .png({
      adaptiveFiltering: true,
      compressionLevel: 9,
      effort: 10,
      palette: false,
    })
    .toFile(output);

  const logoStats = await stat(output);
  return `${logo.name}: transparent PNG ${Math.round(logoStats.size / 1024)} KB`;
}

const groupedResults = await Promise.all([
  ...assets.map(optimizeAsset),
  buildTransparentLogo(),
]);
const results = groupedResults.flat();
console.log(`Optimized ${results.length} image assets without embedded metadata.`);
for (const result of results) console.log(`- ${result}`);
