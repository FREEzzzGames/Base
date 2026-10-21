import { readFileSync } from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import { STYLE_RULES, SCALES, composeMotif, scorePattern, seededRandom, quantizeMidi } from "../public/freezzz-studio-engine.js";

const file = "public/freezzz-studio.html";
const html = readFileSync(file, "utf8");
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/i);
assert.ok(scriptMatch, "Studio inline script must exist");
const js = scriptMatch[1].replace(/^import\s+\{[^}]+\}\s+from\s+[\'"][^\'"]+[\'"];\s*/m, "");

// Parse the complete inline application without executing browser-only APIs.
new vm.Script(js, { filename: file });

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]).filter((id) => !id.includes("'+"));
const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
assert.deepEqual([...new Set(duplicateIds)], [], "HTML IDs must be unique");

const boundIds = [...js.matchAll(/\$\('([^']+)'\)\.(?:onclick|onchange|oninput|addEventListener)/g)].map((m) => m[1]);
const missingIds = [...new Set(boundIds.filter((id) => !ids.includes(id)))];
assert.deepEqual(missingIds, [], "Event handlers must target existing elements");

const functionNames = [...js.matchAll(/function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g)].map((m) => m[1]);
const duplicateFunctions = [...new Set(functionNames.filter((name, index) => functionNames.indexOf(name) !== index))];
assert.deepEqual(duplicateFunctions, [], "Named functions must not be duplicated");

for (const required of [
  "const STYLE_CANONS", "const CANON_MOTIFS", "function makeSixteen()", "function buildUniqueVariation()",
  "function generate()", "function setupAudio()", "function ensureTrack(", "createStereoPanner",
  "createDynamicsCompressor", "function renderTimeline()", "function buildPans()", "randTempoMode",
  "randStructure", "const SONG_REFERENCES", "function makeOriginalMelody(", "function populateSongCatalog()", "id=\"songRef\"", "id=\"songSearch\"", "id=\"voiceTone\"", "createStereoPanner", "id=\"master\"", "id=\"width\"", "id=\"generatePlay\"", "id=\"play\"", "id=\"stop\""
]) assert.ok(html.includes(required), "Missing generator or stereo playback capability: " + required);

for (const removed of ["id=\"loadSamples\"", "id=\"userSampleFiles\"", "id=\"loadLibrarySound\"", "id=\"save\"", "id=\"scenes\"", "id=\"userSampleFiles\""])
  assert.ok(!html.includes(removed), "Non-core feature should be removed: " + removed);

assert.match(js, /\$\('generate'\)\.onclick/);
assert.match(js, /\$\('generatePlay'\)\.onclick/);
assert.match(js, /\$\('play'\)\.onclick=play/);
assert.match(js, /\$\('stop'\)\.onclick=stop/);

// Deterministic, genre-aware composition engine regression tests.
assert.equal(Object.keys(STYLE_RULES).length, 9, "All nine genre canons must exist");
assert.deepEqual(SCALES.minor, [0, 2, 3, 5, 7, 8, 10]);
assert.deepEqual(composeMotif({ seed: 42 }), composeMotif({ seed: 42 }), "Same seed must produce identical phrase");
assert.equal(composeMotif({ seed: 7, bars: 5 }).length, 80, "Five-bar phrase must contain 80 steps");
assert.ok(composeMotif({ seed: 9, style: "schranz" }).some((n) => n !== null), "Composition must contain notes");
assert.equal(quantizeMidi(61, 60, "major"), 62, "Major-scale quantization must choose the nearest allowed note");
assert.equal(seededRandom(1)(), seededRandom(1)(), "Seeded random source must be repeatable");
const quality = scorePattern({ style: "detroit", kick: Array.from({ length: 16 }, (_, i) => [0,4,8,12].includes(i)), snare: Array.from({ length: 16 }, (_, i) => [4,12].includes(i)) });
assert.equal(quality.genreFit, 100, "A canon-perfect Detroit kick/snare should score 100 genre fit");

console.log("FREEZZ_STUDIO_SMOKE_OK");
console.log("HTML IDs:", ids.length, "| event bindings:", boundIds.length, "| functions:", functionNames.length);
