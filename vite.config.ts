import { defineConfig } from "vite";

// Relative base so the build works on GitHub Pages (/Physics_game/) or any static host.
export default defineConfig({
  base: "./",
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
} as any);
