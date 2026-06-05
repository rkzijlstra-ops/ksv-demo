import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Aparte config voor het integratie-harnas: draait ECHTE db-logica tegen de test-Supabase.
// Apart gehouden van de gewone unit-suite (vitest.config.ts, src/**/*.test.ts), zodat
// `npm test` nooit het netwerk of de database raakt. Draaien met:
//   npx vitest run --config vitest.integration.config.ts
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["integration/**/*.int.test.ts"],
    globals: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
});
