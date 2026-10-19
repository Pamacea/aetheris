import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Tests unitaires node uniquement (pas de jsdom) : logique pure, aucun rendu.
// Alias @ = chemin du tsconfig, sinon les modules d'app ne se résolvent pas.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
