import { readFileSync } from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const file = "public/freezzz-studio.html";
const html = readFileSync(file, "utf8");
const scriptMatch = html.match(/<script>([\\s\\S]*?)<\\/script>/i);
assert.ok(scriptMatch, "Studio inline script must exist");
const js = scriptMatch[1];

// Parse the complete inline application without executing browser-only APIs.
new vm.Script(js, { filename: file });

const ids = [...html.matchAll(/\\bid="([^"]+)"/g)].map((m) => m[1]).filter((id) => !id.includes("'+"));
const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
assert.deepEqual([...new Set(duplicateIds)], [], "HTML IDs must be unique");

const boundIds = [...js.matchAll(/\\$\\('([^']+)'\\)\\.(?:onclick|onchange|oninput|addEventListener)/g)].map((m) => m[1]);
const missingIds = [...new Set(boundIds.filter((id) => !ids.includes(id)))];
assert.deepEqual(missingIds, [], "Event handlers must target existing elements");

const functionNames = [...js.matchAll(/function\\s+([A-Za-z_$][A-Za-z0-9_$]*)\\s*\\(/g)].map((m) => m[1]);
const duplicateFunctions = [...new Set(functionNames.filter((name, index) => functionNames.indexOf(name) !== index))];
assert.deepEqual(duplicateFunctions, [], "Named functions must not be duplicated");

for (const required of [
  "function smartRandomize()", "function generateUniquePattern()", "function buildUniqueVariation()",
  "const STYLE_CANONS", "Array(80).fill(false)", "repeat(80,minmax(16px,1fr))",
  "function renderTimeline()", "function renderScenes()", "function loadSamples()",
  "function loadLibraryCatalog()", "userSampleFiles", "randTempoMode", "randStructure",
  "@media(max-width:850px)", "overflow:auto"
]) assert.ok(html.includes(required), "Missing expected studio capability/layout marker: " + required);

assert.match(js, /\\$\\('smartRandom'\\)\\.onclick=generateUniquePattern/);
assert.match(js, /\\$\\('generateCustom'\\)\\.onclick=generateUniquePattern/);
assert.match(js, /\\$\\('generateVariation'\\)\\.onclick=generateUniquePattern/);

console.log("FREEZZ_STUDIO_SMOKE_OK");
console.log("HTML IDs:", ids.length, "| event bindings:", boundIds.length, "| functions:", functionNames.length);
