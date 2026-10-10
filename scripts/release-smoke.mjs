import { existsSync, readdirSync, readFileSync } from "node:fs";

const required = [
  "dist/index.html",
  "dist/version.json",
  "dist/spark-console.html",
  "dist/spark.html",
  "dist/spark.js",
  "dist/spark-simulation.js",
  "dist/spark-render.js",
  "dist/spark-ai.js",
  "dist/spark-physics.js",
  "dist/spark-data.js",
  "dist/spark-audio.js",
  "dist/spark-effects.js",
  "dist/spark-session.js"
];
for (const file of required) {
  if (!existsSync(file)) throw new Error("Missing release artifact: " + file);
}

const html = readFileSync("dist/index.html", "utf8");
const gameHtml = readFileSync("dist/spark-console.html", "utf8");
const sparkHtml = readFileSync("dist/spark.html", "utf8");
const version = JSON.parse(readFileSync("dist/version.json", "utf8"));
const assets = existsSync("dist/assets") ? readdirSync("dist/assets") : [];

if (!version.build) throw new Error("Release manifest has no build SHA.");
if (process.env.EXPECTED_BUILD && version.build !== process.env.EXPECTED_BUILD) {
  throw new Error(`Release manifest SHA mismatch: expected ${process.env.EXPECTED_BUILD}, got ${version.build}`);
}
if (!html.includes('<div id="app"></div>')) throw new Error("Portal entry point missing.");
if (!/<script[^>]+type="module"[^>]+src=/i.test(html)) throw new Error("Compiled module entry missing.");
if (!assets.some(file => /\.js$/i.test(file))) throw new Error("No compiled JavaScript asset found.");
if (!assets.some(file => /\.css$/i.test(file))) throw new Error("No compiled CSS asset found.");
if (/constructor|editor-layout|data-editor-/i.test(html)) throw new Error("Obsolete constructor/editor runtime leaked into production.");

// The GAME route must load the SPARK runtime, not the retired CARGO DECK prototype.
if (!/spark\.html\?embedded=console/.test(gameHtml)) {
  throw new Error("GAME console does not embed the SPARK runtime.");
}
if (!/spark-console-entry/.test(gameHtml)) {
  throw new Error("SPARK console controls entry is missing.");
}
if (!/spark\.js/.test(sparkHtml)) {
  throw new Error("SPARK page does not load its runtime.");
}

console.log("RELEASE_SMOKE_OK", JSON.stringify({
  build: version.build,
  version: version.version,
  assets: assets.length,
  checkedPages: ["index.html", "spark-console.html", "spark.html"],
  checkedSparkRuntimeFiles: required.length - 4
}));
