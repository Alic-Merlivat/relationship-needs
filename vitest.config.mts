import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Minimal config: pure-logic tests need no environment at all, and the one
// component test suite needs jsdom for a click + aria-expanded assertion —
// not full browser-accurate layout, which the real Browser-tool checks
// already cover better than jsdom ever could.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
