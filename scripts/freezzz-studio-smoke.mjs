import { readFileSync } from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const file = "public/freezzz-studio.html";
const html = readFileSync(file, "utf8");
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/i);
assert.ok(scriptMatch, "Studio inline script must exist");
const js = scriptMatch[1];

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
  "randStructure", "id=\"master\"", "id=\"width\"", "id=\"generatePlay\"", "id=\"play\"", "id=\"stop\""
]) assert.ok(html.includes(required), "Missing generator or stereo playback capability: " + required);

for (const removed of ["id=\"loadSamples\"", "id=\"userSampleFiles\"", "id=\"loadLibrarySound\"", "id=\"save\"", "id=\"scenes\""])
  assert.ok(!html.includes(removed), "Non-core feature should be removed: " + removed);

assert.match(js, /\$\('generate'\)\.onclick/);
assert.match(js, /\$\('generatePlay'\)\.onclick/);
assert.match(js, /\$\('play'\)\.onclick=play/);
assert.match(js, /\$\('stop'\)\.onclick=stop/);

console.log("FREEZZ_STUDIO_SMOKE_OK");
console.log("HTML IDs:", ids.length, "| event bindings:", boundIds.length, "| functions:", functionNames.length);
