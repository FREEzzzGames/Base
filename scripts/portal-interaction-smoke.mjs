import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const main = readFileSync("src/main.ts", "utf8");
const catalog = readFileSync("src/open-games-catalog.ts", "utf8");

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
