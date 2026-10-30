import { existsSync, readdirSync, readFileSync } from "node:fs";

const required = ["dist/index.html", "dist/version.json", "dist/footpulse.html", "dist/voice-studio.html", "dist/voice-studio-card.js"];
for (const file of required) {
  if (!existsSync(file)) throw new Error("Missing release artifact: " + file);
}

const html = readFileSync("dist/index.html", "utf8");
const footpulse = readFileSync("dist/footpulse.html", "utf8");
const voiceStudio = readFileSync("dist/voice-studio.html", "utf8");
const voiceCard = readFileSync("dist/voice-studio-card.js", "utf8");
const cssAsset = assets.find(file => /\\.css$/i.test(file));
const css = cssAsset ? readFileSync("dist/assets/" + cssAsset, "utf8") : "";
const version = JSON.parse(readFileSync("dist/version.json", "utf8"));
const assets = existsSync("dist/assets") ? readdirSync("dist/assets") : [];

if (!version.build) throw new Error("Release manifest has no build SHA.");
if (process.env.EXPECTED_BUILD && version.build !== process.env.EXPECTED_BUILD) {
  throw new Error(`Release manifest SHA mismatch: expected ${process.env.EXPECTED_BUILD}, got ${version.build}`);
}
if (!html.includes('<div id="app"></div>')) throw new Error("Portal entry point missing.");
if (!/<script[^>]+type="module"[^>]+src=/i.test(html)) throw new Error("Compiled module entry missing.");
if (!html.includes("voice-studio-card.js")) throw new Error("Voice Studio catalog integration missing.");
if (!assets.some(file => /\.js$/i.test(file))) throw new Error("No compiled JavaScript asset found.");
if (!assets.some(file => /\.css$/i.test(file))) throw new Error("No compiled CSS asset found.");
if (/constructor|editor-layout|data-editor-/i.test(html)) throw new Error("Obsolete constructor/editor runtime leaked into production.");

// FootPulse must remain a standalone page within Base, opening the separately hosted app.
if (!footpulse.includes('href="./index.html"')) throw new Error("FootPulse return route to HOME is missing.");
if (!footpulse.includes('id="footpulse-app"')) throw new Error("FootPulse iframe is missing.");
if (!footpulse.includes('https://footpulse-bzve.onrender.com/')) throw new Error("FootPulse production origin is missing.");
if (!footpulse.includes('id="retry"') || !footpulse.includes('id="reload"')) throw new Error("FootPulse recovery controls are missing.");
if (!footpulse.includes('target="_blank" rel="noopener noreferrer"')) throw new Error("FootPulse standalone fallback link is missing.");

// Voice Studio is a production portal block with a downloadable WAV workflow.
if (!voiceStudio.includes('id="generate"') || !voiceStudio.includes('id="download"')) throw new Error("Voice Studio synthesis/download controls are missing.");
if (!voiceStudio.includes("https://newsportv-voice-api.onrender.com")) throw new Error("Voice Studio API origin is missing.");
if (!voiceCard.includes("data-home-grid=\"1\"") || !voiceCard.includes("./voice-studio.html")) throw new Error("Voice Studio HOME catalog card is invalid.");

// The removed SPARK game must not be shipped in the portal build.
if (readdirSync("dist").some(file => /^spark(?:-|\.)/i.test(file))) {
  throw new Error("Obsolete SPARK runtime artifact leaked into production.");
}

console.log("RELEASE_SMOKE_OK", JSON.stringify({
  build: version.build,
  version: version.version,
  assets: assets.length,
  checkedPages: ["index.html", "footpulse.html", "voice-studio.html"],
  obsoleteSparkArtifacts: 0
}));
