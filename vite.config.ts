import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const fromRoot=(path:string)=>fileURLToPath(new URL(path,import.meta.url));

export default defineConfig({
  base: "./",
  root: "src",
  publicDir: "../public",
  server: { host: "0.0.0.0" },
  preview: { host: "0.0.0.0" },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: fromRoot("./src/index.html"),
        cargoDeck: fromRoot("./src/cargo-deck.html")
      }
    }
  }
});
