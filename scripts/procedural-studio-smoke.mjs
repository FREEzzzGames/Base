import { readFileSync } from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const file = "public/procedural-studio.html";
const html = readFileSync(file, "utf8");
const match = html.match(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/i);
assert.ok(match, "Procedural Studio inline application script must exist");
const js = match[1];
new vm.Script(js, { filename: file });

const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map((m) => m[1]);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
assert.deepEqual([...new Set(duplicates)], [], "Procedural Studio HTML IDs must be unique");

for (const id of ["generate", "newVariation", "reroll", "stop", "play", "pause", "exportWav", "saveProject", "exportJson", "importJson", "jsonFile", "sampleFiles", "soundSearch", "soundQuery", "soundResults", "soundLibraryStatus", "sampleStatus"])
  assert.ok(ids.includes(id), "Missing expected UI element: " + id);

for (const required of [
  "async function generate(", "async function audioInit(", "async function exportWav(",
  "async function autoLoadLibrarySamples(", "async function warmSoundLibrary(",
  "async function apply(", "Tone.loaded()", "new OfflineAudioContext",
  "indexedDB.open(SOUND_DB", "window.addEventListener(\"online\"",
  "for(const url of allSampleUrls())", "await start();return"
]) assert.ok(js.includes(required), "Missing expected audio/project capability: " + required);

for (const handler of ["generate", "newVariation", "reroll", "stop", "play", "pause", "exportWav", "saveProject", "exportJson", "importJson", "sampleFiles", "soundSearch"])
  assert.match(js, new RegExp("\\$\\(\"" + handler + "\"\\)\\.(?:onclick|onchange|oninput|addEventListener)"), "Missing handler: " + handler);

console.log("PROCEDURAL_STUDIO_SMOKE_OK");
console.log("HTML IDs:", ids.length, "| inline JS syntax: valid | audio/export/cache controls: present");
