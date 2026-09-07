import { resolve } from "node:path";

import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        gateway: resolve(import.meta.dirname, "index.html"),
        spanish: resolve(import.meta.dirname, "es/index.html"),
        english: resolve(import.meta.dirname, "en/index.html"),
      },
    },
  },
});
