import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  root: "src",
  server: { host: "0.0.0.0" },
  preview: { host: "0.0.0.0" },
  build: { outDir: "../dist", emptyOutDir: true }
});
