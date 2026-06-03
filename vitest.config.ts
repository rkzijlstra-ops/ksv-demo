import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  // Laat de `@/`-alias (tsconfig paths) ook in tests werken, zodat echte (niet-gemockte)
  // modules via `@/lib/...` geïmporteerd kunnen worden.
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: false,
  },
});
