import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const library = readFileSync("src/library-emulator.ts", "utf8");
const profile = readFileSync("src/profile-store.ts", "utf8");
const main = readFileSync("src/main.ts", "utf8");
const radioMap = readFileSync("src/radio-map.ts", "utf8");
const radioBrowser = readFileSync("src/radio-browser.ts", "utf8");
const telegramClient = readFileSync("src/chat/telegram-client.ts", "utf8");

function section(source, start, end, label) {
  const from = source.indexOf(start);
  assert.notEqual(from, -1, label + ": start marker missing");
  const to = source.indexOf(end, from + start.length);
  assert.notEqual(to, -1, label + ": end marker missing");
  return source.slice(from, to);
}

const loader = section(library, "function loadEmulatorScript()", "function stableGameId(", "loader");
assert.match(loader, /if\s*\(emulatorScriptPromise\)\s*return emulatorScriptPromise/);
assert.match(loader, /EMULATORJS_LOAD_TIMEOUT/);
assert.match(loader, /script\.remove\(\)/);
assert.match(loader, /emulatorScriptPromise\s*=\s*null/);
assert.match(library, /emulatorScriptPromise\s*=\s*null;\s*\n\s*w\.EJS_player/);

const importer = section(library, "async function importFiles(", "function renderLibraryIntoPage(", "ROM import");
assert.match(importer, /console\.error\("\[FREEzzz library\] ROM import failed:"/);
assert.match(importer, /!writeMeta\(current\)/);
assert.match(importer, /deleteRom\(id\)/);
assert.match(importer, /libraryImportStatus\s*=/);
assert.doesNotMatch(importer, /catch\s*\{\s*\}/);

const deleter = section(library, 'document.querySelectorAll<HTMLElement>("[data-library-delete]")', "\n\n}", "ROM deletion");
assert.match(deleter, /ROM deletion failed/);
assert.match(deleter, /if\s*\(!writeMeta\(remaining\)\)/);

assert.match(profile, /warnStorageFailure\("read",error\)/);
assert.match(profile, /warnStorageFailure\("write",error\)/);

const updateCheck = section(main, "async function checkForPortalUpdate()", "void checkForPortalUpdate()", "update checker");
assert.match(updateCheck, /AbortSignal\.timeout\(5000\)/);
assert.match(updateCheck, /searchParams\.get\("freezzz_build"\)/);
assert.match(updateCheck, /Update discovery is best-effort/);

const mapLoader = section(radioMap, "function loadMapLibre()", "async function fetchStations()", "MapLibre loader");
assert.match(mapLoader, /MAPLIBRE_LOAD_TIMEOUT/);
assert.match(mapLoader, /MAPLIBRE_INIT_FAILED/);
assert.ok(mapLoader.includes("loadPromise = null"));
assert.ok(radioBrowser.includes("AbortSignal.timeout(10000)"));
assert.ok(radioBrowser.includes("safeLimit=Math.min(100"));
assert.match(telegramClient, /TELEGRAM_API_TIMEOUT/);
assert.match(telegramClient, /AbortController/);
assert.match(telegramClient, /TELEGRAM_INVALID_RESPONSE/);

console.log("LIBRARY_RUNTIME_SMOKE_OK");
