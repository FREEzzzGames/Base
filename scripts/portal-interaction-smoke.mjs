import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const main = readFileSync("src/main.ts", "utf8");
const multiWindow = readFileSync("src/multi-window-portal.ts", "utf8");
const catalog = readFileSync("src/open-games-catalog.ts", "utf8");

const radioMap = readFileSync("src/radio-map.ts", "utf8");
const radioBrowser = readFileSync("src/radio-browser.ts", "utf8");
assert.ok(main.includes("async function playRandomRadioStation(excludeId=\"\" )") || main.includes('async function playRandomRadioStation(excludeId="")'),
  "RADIO widget must load a random station when no station is selected");
assert.ok(main.includes("shuffleRadioStations") && main.includes("for(const station of candidates)"),
  "RADIO random playback must try alternate stations rather than fail after one broken stream");
assert.ok(main.includes("if(radioAudio!==audio)return") && main.includes("if(isRandom&&!radioRandomLoading)void playRandomRadioStation(station.stationuuid)"),
  "RADIO audio events must ignore stale streams and retry a failed random stream");
assert.ok(main.includes('window.addEventListener("freezzz:radio-mini"') && main.includes('else void playRandomRadioStation()'),
  "RADIO widget Play must start a random station when no saved selection exists");
assert.ok(radioMap.includes('new CustomEvent("freezzz:radio-select"') && radioMap.includes('new CustomEvent("freezzz:radio-mini"'),
  "RADIO map and floating widget must control the shared player");
assert.ok(radioBrowser.includes('is_https:"true"') && radioBrowser.includes("lastcheckok!==0"),
  "RADIO station discovery must prefer HTTPS and filter stations marked broken");

const chatSendListener = 'window.addEventListener("freezzz:chat-send"';
const chatSendOccurrences = main.split(chatSendListener).length - 1;
assert.equal(chatSendOccurrences, 1, "CHAT send listener must be registered exactly once");

const bindIndex = main.indexOf("function bind()");
const chatSendIndex = main.indexOf(chatSendListener);
assert.ok(bindIndex >= 0, "Portal bind() function must exist");
assert.ok(chatSendIndex >= 0 && chatSendIndex < bindIndex,
  "CHAT send listener must be registered outside bind() to prevent duplicate sends after rerenders");

assert.ok(main.includes('if(view==="game")bindOpenGamesCatalog(lang,()=>render());'),
  "GAME catalog must be wired into the portal route");

const entriesPrefix = "const ENTRIES: CatalogEntry[] = ";
const entriesStart = catalog.indexOf(entriesPrefix);
const entriesEnd = catalog.indexOf("];\n\ntype CatalogLanguage", entriesStart);
assert.ok(entriesStart >= 0 && entriesEnd > entriesStart, "GAME catalog registry must be present");
const entries = JSON.parse(catalog.slice(entriesStart + entriesPrefix.length, entriesEnd + 1));
assert.equal(entries.length, 152, "Expected 142 game entries and 10 project/resource entries");
assert.equal(new Set(entries.map(entry => entry.id)).size, entries.length, "GAME catalog IDs must be unique");

const categoryPrefix = "const CATEGORY_KEYS = ";
const categoryStart = catalog.indexOf(categoryPrefix);
const categoryEnd = catalog.indexOf("];", categoryStart);
assert.ok(categoryStart >= 0 && categoryEnd > categoryStart, "GAME category registry must be present");
const categories = JSON.parse(catalog.slice(categoryStart + categoryPrefix.length, categoryEnd + 1));
for (const entry of entries) {
  assert.ok(entry.name && entry.description, `Catalog entry ${entry.id} must have a name and description`);
  assert.ok(["game", "resource"].includes(entry.kind), `Unsupported entry kind: ${entry.id}`);
  assert.equal(new URL(entry.url).protocol, "https:", `Game URL must use HTTPS: ${entry.id}`);
  assert.equal(new URL(entry.source).protocol, "https:", `Source URL must use HTTPS: ${entry.id}`);
  assert.ok(categories.includes(entry.category), `Missing category filter for ${entry.category}`);
}

for (const selector of [
  "[data-open-game-category]",
  "[data-open-game-search]",
  "[data-open-game-play]",
  "[data-open-game-back]",
  "[data-open-game-source]",
  "[data-open-game-url]"
]) {
  assert.ok(catalog.includes(selector), `GAME catalog UI selector missing: ${selector}`);
}
assert.ok(catalog.includes('addEventListener("input"'), "GAME catalog search must react to input");
assert.ok(catalog.includes('addEventListener("click"'), "GAME catalog buttons must have click handlers");
assert.ok(catalog.includes('grid?.addEventListener("click"'), "GAME card actions must use delegation so search results remain interactive");
assert.ok(catalog.includes('closest<HTMLButtonElement>("[data-open-game-play], [data-open-game-source]")'),
  "GAME Play and Source actions must work for dynamically filtered cards");

const cargo = readFileSync("src/cargo-deck-game.ts", "utf8");
const vfx = readFileSync("src/cargo-deck-vfx.ts", "utf8");
const emulator = readFileSync("src/library-emulator.ts", "utf8");
assert.ok(cargo.includes("Math.min(1.5,elapsed/16.6667)"), "Canvas game deltaTime must be capped after stalls/resume");
assert.ok(cargo.includes('document.addEventListener("visibilitychange",onVisibilityChange)'), "Canvas game loop must pause while the document is hidden");
assert.ok(cargo.includes("Math.min(weakDevice?1.25:1.5,device)"), "Canvas backing resolution must cap devicePixelRatio");
assert.ok(cargo.includes("const MAX_FRAME_GLOWS=weakGraphics?3:8") && cargo.includes("function glowBlur(requested:number)"), "Canvas glow shadows must be capped per frame, with a stricter budget on low-power devices");
assert.ok(cargo.includes("const bulletPool:Bullet[]=[]") && cargo.includes("const MAX_BULLETS=256"), "Canvas game projectiles must use a bounded object pool");
assert.ok(cargo.includes("const effectPool:FloatEffect[]=[]") && cargo.includes("const MAX_FLOAT_EFFECTS=64"), "Combat text must use a bounded object pool");
assert.ok(cargo.includes("const obsCache:HsObstacle[]=[...OBS,...Array.from({length:6}"), "Collision geometry must be reused between frames");
assert.ok(vfx.includes("const CAP=160") && vfx.includes("new Float32Array(CAP)"), "VFX must retain its fixed typed-array particle cap");
assert.ok(!vfx.includes("createRadialGradient("), "VFX hot render loop must not allocate CanvasGradient objects per flash");
for (const stage of ['"rom-read"', '"core-loader"', '"core-ready"', '"initialized"', '"exit"']) {
  assert.ok(emulator.includes(stage), `Emulator timing stage missing: ${stage}`);
}
assert.ok(emulator.includes('emulatorMetric("rom-read"') && emulator.includes('emulatorMetric("core-loader"'), "ROM storage read and emulator loader timings must remain separate");
assert.ok(emulator.includes("URL.revokeObjectURL(activeRomUrl)") && emulator.includes("activeRomUrl = null"), "Emulator ROM object URLs must be released on exit and shutdown");
assert.ok(emulator.includes("async function isMegaDriveRom(blob: Blob)") && emulator.includes('return { system: "md", blob: file, fileName: file.name }'), "Genesis .bin ROMs must be detected by cartridge header instead of being misrouted to the PlayStation core");
assert.ok(emulator.includes('if (ext === "bin" && await isMegaDriveRom(blob))') && emulator.includes('game.system = "md";'), "Legacy Genesis .bin entries must be repaired in the existing library");
assert.ok(main.includes('window.addEventListener("freezzz:radio-open-fullscreen"') && main.includes('portalEvents.emit("navigation:changed",{view:"radio"})'),
  "RADIO widget expansion must open the full RADIO workspace through the portal router");
assert.ok(multiWindow.includes('if(id==="radio")') && multiWindow.includes('new CustomEvent("freezzz:radio-open-fullscreen")'),
  "RADIO widget expand control must not merely enlarge an empty player window");
assert.ok(multiWindow.includes('windows.radio.open=false'), "RADIO widget must close before opening the full RADIO workspace");
console.log("PORTAL_INTERACTION_SMOKE_OK");
console.log(`CHAT listener registered once; ${entries.length} unique HTTPS catalog entries and all category keys validated.`);


const styles = readFileSync("src/styles.css", "utf8");
function ruleContains(selector, fragment) {
  let start = 0;
  while ((start = styles.indexOf(selector, start)) >= 0) {
    const open = styles.indexOf("{", start);
    const close = styles.indexOf("}", open + 1);
    if (open >= 0 && close > open && styles.slice(open + 1, close).includes(fragment)) return true;
    start += selector.length;
  }
  return false;
}
assert.ok(styles.includes('.portal-route-workspace > main > .portal-layout[data-portal-layout="game"]'),
  "GAME route must fit the shared portal viewport");
assert.ok(ruleContains(".open-games-portal .open-games-grid", "overflow-y:auto!important"),
  "GAME cards must have their own vertical scroll viewport");
assert.ok(ruleContains(".open-games-portal .open-game-categories", "overflow-x:auto!important"),
  "GAME category filters must scroll horizontally on mobile");
assert.ok(ruleContains(".open-games-portal .open-game-catalog", "min-height:0!important"),
  "GAME catalog container must allow its inner list to shrink and scroll");
assert.ok(ruleContains(".open-games-portal .open-game-frame,", "min-height:0!important"),
  "Embedded games must fit the remaining portal viewport");
assert.ok(ruleContains(".open-games-portal .open-game-categories button,", "background:#000!important"),
  "GAME controls must follow the portal black/white/red theme");
