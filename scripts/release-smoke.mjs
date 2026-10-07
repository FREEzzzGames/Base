import { existsSync, readdirSync, readFileSync } from "node:fs";

const required = ["dist/index.html", "dist/version.json"];
for (const file of required) {
  if (!existsSync(file)) throw new Error("Missing release artifact: " + file);
}

const html = readFileSync("dist/index.html", "utf8");
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

console.log("RELEASE_SMOKE_OK", JSON.stringify({
  build: version.build,
  version: version.version,
  assets: assets.length
}));
