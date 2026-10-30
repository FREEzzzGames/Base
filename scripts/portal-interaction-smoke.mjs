import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const main = readFileSync("src/main.ts", "utf8");
const multiWindow = readFileSync("src/multi-window-portal.ts", "utf8");
const zenithStyles = readFileSync("src/zenith-os.css", "utf8");
const catalog = readFileSync("src/open-games-catalog.ts", "utf8");

assert.ok(multiWindow.includes("function minimize(id:MiniId)"), "Portal app windows must support minimizing");
assert.ok(multiWindow.includes("function restore(id:MiniId)"), "Portal app windows must support restoring");
assert.ok(zenithStyles.includes("calc(58px + env(safe-area-inset-bottom,0px))") && zenithStyles.includes(".portal-os-taskbar"), "Focused mobile windows must reserve dock space and avoid covering taskbar");
assert.ok(multiWindow.includes("portal-os-taskbar") && multiWindow.includes("data-os-restore"), "OS taskbar must expose open windows for restoration");
assert.ok(multiWindow.includes("minimized") && multiWindow.includes("WINDOW_LAYOUT_KEY"), "Minimized window state must be persisted with window layout");
assert.ok(multiWindow.includes("z,minimized,open}=windows[id]") && multiWindow.includes("if(typeof value.open===\"boolean\")w.open=value.open;"), "Open app state must be persisted and restored after reload");
assert.ok(multiWindow.includes('data-mw-minimize="live"') && multiWindow.includes('data-mw-minimize="chat"') && multiWindow.includes('data-mw-minimize="radio"'), "LIVE, CHAT, and RADIO must expose minimize controls");


const shadowOSOverlayCheck = readFileSync("public/games/shadow-os/index.html", "utf8");
assert.ok(shadowOSOverlayCheck.includes(".gameover[hidden]{display:none!important}"), "Hidden ShadowOS game-over overlay must not dim the active game");
assert.ok(shadowOSOverlayCheck.includes("overflow:hidden!important") && shadowOSOverlayCheck.includes("height:100dvh"), "ShadowOS mobile layout must fit the viewport without app-pane scrolling");
assert.ok(shadowOSOverlayCheck.includes('src="./shadowos-logo.svg"'), "ShadowOS must render the official logo asset in the header");
assert.ok(shadowOSOverlayCheck.indexOf("/* Compact, fixed-screen ShadowOS") < shadowOSOverlayCheck.lastIndexOf("</style>"), "ShadowOS mobile CSS must be inside the document stylesheet");
assert.ok(shadowOSOverlayCheck.trimEnd().endsWith("</html>"), "ShadowOS document must not contain raw CSS after the closing HTML tag");

const shadowDiplomacy = readFileSync("public/games/shadow-diplomacy/index.html", "utf8");
assert.ok(shadowDiplomacy.includes('id="shadow-campaign-expansion"'), "SHADOW DIPLOMACY campaign expansion script must exist");
assert.ok(!shadowDiplomacy.includes("\\nscorched:"), "SHADOW DIPLOMACY endings must not contain a literal newline escape that breaks script parsing");
const inlineScripts = [...shadowDiplomacy.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
assert.ok(inlineScripts.length >= 2, "SHADOW DIPLOMACY must contain both legacy and campaign script blocks");
for (const [index, match] of inlineScripts.entries()) {
  new vm.Script(match[1], { filename: `shadow-diplomacy-inline-${index + 1}.js` });
}
const campaignScript = inlineScripts.find(([, match]) => match.includes('const STORAGE_KEY="shadow-diplomacy-campaign-v2"') && match.includes("const missions=["));
assert.ok(campaignScript, "SHADOW DIPLOMACY campaign script block must be discoverable");
assert.equal((campaignScript[1].match(/\{year:"/g) || []).length, 20, "SHADOW DIPLOMACY must define exactly 20 campaign missions");
assert.ok(campaignScript[1].includes("s.index++;"), "SHADOW DIPLOMACY must advance to the next mission after a choice");
assert.equal((campaignScript[1].match(/ending:"(?:multipolar|cold|scorched|ash|dollar)"/g) || []).length, 5, "SHADOW DIPLOMACY final mission must offer five global endings");
assert.ok(shadowDiplomacy.includes("function renderSystems()") && shadowDiplomacy.includes("shadow-systems-panel"), "SHADOW DIPLOMACY must render the systemic risk dashboard");
assert.ok(shadowDiplomacy.includes("if(s.supply<35)") && shadowDiplomacy.includes("if(s.shadowTrade>45)"), "Logistics shortages and shadow trade must have cascading economic consequences");
assert.ok(shadowDiplomacy.includes("s.deadhand=true") && shadowDiplomacy.includes("s.loyalty<30"), "Late-game autonomous retaliation and loyalty/leak risks must be represented");
console.log("SHADOW_DIPLOMACY_CAMPAIGN_SYNTAX_OK");

const shadowOS = readFileSync("public/games/shadow-os/index.html", "utf8");
assert.ok(main.includes('data-portal-card="shadowos"') && main.includes('./games/shadow-os/index.html'), "ShadowOS must be available as a HOME block");
assert.ok(shadowOS.includes('id="pulse"') && ["whisper","pulse","vault","geomap","dossier"].every(app => shadowOS.includes('data-app="'+app+'"')), "ShadowOS must expose all five apps and global pulse");
const shadowOSScripts = [...shadowOS.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
assert.equal(shadowOSScripts.length, 1, "ShadowOS must have one standalone game script");
for (const [index, match] of shadowOSScripts.entries()) new vm.Script(match[1], { filename: `shadow-os-inline-${index + 1}.js` });
assert.ok(shadowOS.includes('2007:[') && shadowOS.includes('2008:[') && shadowOS.includes('2009:['), "ShadowOS must define detailed events for 2007–2009");
assert.ok(shadowOS.includes('function buildLaterYear(year)'), "ShadowOS must generate events for later years through 2027");
assert.ok(shadowOS.includes('state.mission<4') && shadowOS.includes('state.year<2027'), "ShadowOS must advance missions and years through 2027");
assert.ok(shadowOS.includes('state.defcon>=5') && shadowOS.includes('state.stability<=0') && shadowOS.includes('state.economy<=0') && shadowOS.includes('state.shadow<=0'), "ShadowOS must enforce all requested game-over conditions");
assert.ok(shadowOS.includes('localStorage.setItem(SAVE_KEY') && shadowOS.includes('state.flags[choice.flag]'), "ShadowOS must persist saves and butterfly flags");
console.log("SHADOWOS_SYNTAX_AND_CAMPAIGN_SMOKE_OK");

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
assert.equal(entries.length, 153, "Expected 143 game entries and 10 project/resource entries");
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

const emulator = readFileSync("src/library-emulator.ts", "utf8");
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
const visualStyles = readFileSync("src/styles.css", "utf8");
assert.ok(visualStyles.includes(".portal-mw-head strong{\n  touch-action:none!important;"), "floating window title must suppress native touch panning while preserving slider controls");
assert.ok(visualStyles.includes(".home-portal > .home-phet-lab .home-card-title") &&
  visualStyles.includes("bottom:auto!important") && visualStyles.includes("white-space:normal!important"),
  "HOME PHET, Economy and Studio headings must stay in a separate top-aligned region");
assert.ok(visualStyles.includes(".home-portal > .home-phet-lab > span:not(.home-card-title)") &&
  visualStyles.includes("bottom:12px!important") && visualStyles.includes("overflow-wrap:anywhere!important"),
  "HOME card descriptions must stay anchored at the bottom and wrap instead of overlapping headings");
assert.ok(multiWindow.includes('h.addEventListener("lostpointercapture",end)'), "floating-window drag and resize gestures must clean up when pointer capture is lost");
assert.ok(multiWindow.includes('window.addEventListener("blur",end)'), "floating-window gestures must clean up when the browser loses focus");
assert.ok(multiWindow.includes('window.addEventListener("pointermove",move)'), "drag and resize tracking must survive pointer movement outside the original handle");
assert.ok(multiWindow.includes('if(ev.pointerId!==pointer.pointerId)return;'), "drag must ignore unrelated simultaneous pointers");
assert.ok(multiWindow.includes('if(ev.pointerId===pointer.pointerId)resizeWindow'), "resize must ignore unrelated simultaneous pointers");
assert.ok(multiWindow.includes('if(ended)return;'), "pointer gesture cleanup must be idempotent");
assert.ok(multiWindow.includes('window.visualViewport?.addEventListener("resize",clampWindows'),
  "Floating windows must clamp to Telegram WebView visual viewport changes");
assert.ok(multiWindow.includes("w.x=Math.max(4,Math.min") && multiWindow.includes("w.y=Math.max(4,Math.min"),
  "Restored window geometry must be clamped back inside the visible viewport");
assert.ok(visualStyles.includes("inset: auto 10px calc(76px + env(safe-area-inset-bottom, 0px)) 10px !important;") &&
  visualStyles.includes("height: 112px !important;"),
  "Mobile RADIO mini-player must use a compact dock above the safe-area-aware bottom navigation");
assert.ok(multiWindow.includes('aria-label="Открыть полный экран RADIO"') && multiWindow.includes('title="Открыть полноценный раздел RADIO"'),
  "RADIO expand control must describe its actual navigation action accessibly");
assert.ok(visualStyles.includes("@media(max-width:430px)") &&
  visualStyles.includes("max-width:calc(100% - 20px)!important"),
  "HOME information cards must retain horizontal padding on narrow phones");
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


const portalCards = readFileSync("src/electronics-lab-entry.ts", "utf8");
const cardIds = [...portalCards.matchAll(/id: "([a-z0-9-]+)"/g)].map(match => match[1]);
const embedBlock = portalCards.slice(portalCards.indexOf("const EMBED_TARGETS"), portalCards.indexOf("let activeWorkspace"));
const embedIds = [...embedBlock.matchAll(/^  "([a-z0-9-]+)": \{/gm)].map(match => match[1]);
for (const id of cardIds) assert.ok(embedIds.includes(id), "Portal card " + id + " must have a workspace target");
assert.ok(portalCards.includes('"old-maps-online": { src: "https://www.oldmapsonline.org/"'), "OLD MAPS ONLINE must load the website, not its JSON API");
assert.ok(portalCards.includes('"watabou": { src: "https://watabou.github.io/"'), "WATABOU must have a configured workspace target");
assert.ok(portalCards.includes("previousBodyOverflow = document.body.style.overflow") && portalCards.includes("document.body.style.overflow = previousBodyOverflow"), "Workspace close must restore body overflow");
assert.ok(portalCards.includes("last.focus()") && portalCards.includes("first.focus()"), "Workspace dialog must trap keyboard focus");
assert.ok(portalCards.includes("if (focusTarget?.isConnected) focusTarget.focus()"), "Workspace close must restore focus to its launching control");
console.log("PORTAL_WORKSPACE_REGRESSION_SMOKE_OK");

const languageInit = main.slice(main.indexOf("try{\n  if(!localStorage.getItem(\"freezzz:language\"))"), main.indexOf("let portalProfile"));
assert.ok(languageInit.includes("catch{ /* WebView storage may be disabled; keep the default language. */ }"), "Language auto-detection must not crash when WebView storage is unavailable");
const homeGridShift = readFileSync("src/home-grid-shift.ts", "utf8");
assert.ok(homeGridShift.includes('if (pages.length !== 2 || !track || !pagination) return;'),
  "HOME pager must initialize with exactly two screens after catalog consolidation");
assert.ok(homeGridShift.includes('for (const page of ["0", "1"])'),
  "HOME layout persistence must only read the two current screen layouts");
assert.ok(homeGridShift.includes("page.inert=inactive;") && homeGridShift.includes('page.setAttribute("aria-hidden",String(inactive))'),
  "Inactive HOME screens must be hidden from assistive technology and keyboard focus");
assert.ok(homeGridShift.includes('setPage(0);') && homeGridShift.includes('Number(button.dataset.homePage||0)'),
  "HOME / MODULES controls must initialize and navigate to their declared screen");
console.log("HOME_TWO_SCREEN_PAGER_SMOKE_OK");

assert.ok(homeGridShift.includes('tile.dataset.gridSize || defaultSizeOf(tile)') && homeGridShift.includes('tile.dataset.gridSize||defaultSizeOf(tile)'),
  "HOME layout snapshots and commits must preserve each tile's own default size instead of expanding every tile");

assert.ok(homeGridShift.includes('LEGACY_STORAGE_KEY = "freezzz:home-free-layout:v2"') && homeGridShift.includes("migratedLegacyLayouts"),
  "HOME must detect and migrate the previous saved layout version");
assert.ok(homeGridShift.includes('["0", "1", "2"]') && homeGridShift.includes("new Set(legacyPages.flatMap"),
  "Legacy HOME and both module pages must be merged without duplicate tile IDs");
assert.ok(homeGridShift.includes('source["1"] = { order: mergedOrder, sizes: {}, skins: mergedSkins }') && homeGridShift.includes("if (migratedLegacyLayouts) commit();"),
  "Migration must preserve custom order and skins, reset stale sizes, and persist the new layout");


const homePagerStyles = readFileSync("src/styles.css", "utf8");
const canonicalPager = homePagerStyles.slice(homePagerStyles.lastIndexOf("/* HOME / MODULES — canonical two-page pager"));
assert.ok(canonicalPager.includes("display:flex!important;") && canonicalPager.includes("flex-direction:column!important;"),
  "HOME pager must have one bounded vertical stack for pager and page controls");
assert.ok(canonicalPager.includes("overflow:hidden!important;") && canonicalPager.includes("flex:1 1 auto!important;"),
  "Horizontal pager track must clip adjacent pages while filling the available viewport");
assert.ok(canonicalPager.includes("flex:0 0 100%!important;") && canonicalPager.includes("min-width:100%!important;"),
  "HOME and MODULES must occupy one full viewport each, never share a row as visible columns");
assert.ok(canonicalPager.includes("overflow-y:auto!important;") && canonicalPager.includes("overscroll-behavior-y:contain!important;") &&
  canonicalPager.includes("-webkit-overflow-scrolling:touch!important;"),
  "HOME and MODULES must each own an independent touch-friendly vertical scroll container");
assert.ok(canonicalPager.includes("height:auto!important;") && canonicalPager.includes("overflow:visible!important;") &&
  canonicalPager.includes("grid-auto-rows:clamp(112px,17dvh,136px)!important;"),
  "Both page grids must grow to their content rather than clipping cards at viewport height");
assert.ok(canonicalPager.includes("grid-template-columns:repeat(2,minmax(0,1fr))!important;"),
  "Mobile cards must use a readable two-column layout");
assert.ok(canonicalPager.includes("display:flex!important;") && canonicalPager.includes("flex:0 0 38px!important;"),
  "HOME and MODULES pager controls must remain visible and usable");
assert.ok(!homePagerStyles.includes("/* HOME FIX: each horizontal screen is a fixed viewport; dense 4-column tiles must never scroll vertically. */"),
  "Obsolete fixed-height HOME pager rules must be removed");
console.log("HOME_MODULES_INDEPENDENT_SCROLL_SMOKE_OK");


const pagerMarkup = main.slice(main.indexOf('if(view==="home"){'), main.indexOf('if(view==="home"){') + 18000);
assert.ok(pagerMarkup.includes('<div class="content portal-layout home-portal" data-portal-layout="home" data-home-pager>'),
  "HOME pager root must match the production workspace structure");
assert.ok(pagerMarkup.includes('<div class="home-screen-track" data-home-screen-track>') &&
  (pagerMarkup.match(/class="home-screen-page/g) || []).length >= 2,
  "HOME and MODULES must be separate full-page children of one horizontal track");
assert.ok(styles.includes('html body #app .app-shell .portal-workspace.portal-home-workspace > main > .content.home-portal[data-home-pager] > .home-screen-track > .home-screen-page') &&
  styles.includes('flex-shrink:0!important;') &&
  styles.includes('min-width:100%!important;'),
  "Production-depth HOME pager rules must prevent page flex-shrink and enforce one full viewport per page");
assert.ok(styles.includes('> .home-screen-track{') && styles.includes('min-width:100%!important;max-width:100%!important;') &&
  styles.includes('overflow:hidden!important;'),
  "HOME track must be bounded to one viewport and clip the adjacent page");
console.log("HOME_PAGER_PRODUCTION_GEOMETRY_SMOKE_OK");
