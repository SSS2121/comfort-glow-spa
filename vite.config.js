import { resolve } from "node:path";

import { defineConfig } from "vite";
import {
  absolutePublicUrl,
  configuredSiteOrigin,
  structuredData,
} from "./scripts/seo-data.mjs";

function normalizedPagePath(path) {
  if (path === "/index.html") return "/";
  return path.replace(/index\.html$/u, "");
}

function localizedAlternates(path) {
  if (path === "/" || path === "/es/" || path === "/en/") {
    return { es: "/es/", en: "/en/", default: "/" };
  }
  if (path === "/es/privacidad.html" || path === "/en/privacy.html") {
    return {
      es: "/es/privacidad.html",
      en: "/en/privacy.html",
      default: "/en/privacy.html",
    };
  }
  return null;
}

function seoPlugin() {
  return {
    name: "d3-glow-spa-seo",
    transformIndexHtml: {
      order: "pre",
      handler(_html, context) {
        const path = normalizedPagePath(context.path);
        const origin = configuredSiteOrigin();
        const tags = [];

        if (origin) {
          tags.push(
            {
              tag: "link",
              attrs: { rel: "canonical", href: absolutePublicUrl(path) },
              injectTo: "head",
            },
            {
              tag: "meta",
              attrs: { property: "og:url", content: absolutePublicUrl(path) },
              injectTo: "head",
            },
            {
              tag: "meta",
              attrs: {
                property: "og:image",
                content: absolutePublicUrl("/images/hero-facial.png"),
              },
              injectTo: "head",
            },
            {
              tag: "meta",
              attrs: {
                property: "og:image:alt",
                content: "D3 Glow Spa mobile facial services",
              },
              injectTo: "head",
            },
            {
              tag: "meta",
              attrs: {
                name: "twitter:image",
                content: absolutePublicUrl("/images/hero-facial.png"),
              },
              injectTo: "head",
            },
            {
              tag: "meta",
              attrs: {
                name: "twitter:image:alt",
                content: "D3 Glow Spa mobile facial services",
              },
              injectTo: "head",
            },
          );

          const alternates = localizedAlternates(path);
          if (alternates) {
            for (const [language, alternatePath] of Object.entries(alternates)) {
              tags.push({
                tag: "link",
                attrs: {
                  rel: "alternate",
                  hreflang: language === "default" ? "x-default" : `${language}-US`,
                  href: absolutePublicUrl(alternatePath),
                },
                injectTo: "head",
              });
            }
          }
        }

        const language = path.startsWith("/en/") ? "en" : "es";
        if (path === "/es/" || path === "/en/") {
          tags.push({
            tag: "script",
            attrs: { type: "application/ld+json" },
            children: structuredData(language),
            injectTo: "head",
          });
        }

        return tags;
      },
    },
  };
}

export default defineConfig({
  plugins: [seoPlugin()],
  build: {
    rollupOptions: {
      input: {
        gateway: resolve(import.meta.dirname, "index.html"),
        spanish: resolve(import.meta.dirname, "es/index.html"),
        spanishPrivacy: resolve(import.meta.dirname, "es/privacidad.html"),
        english: resolve(import.meta.dirname, "en/index.html"),
        englishPrivacy: resolve(import.meta.dirname, "en/privacy.html"),
      },
    },
  },
});
