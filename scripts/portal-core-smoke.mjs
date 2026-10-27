import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../src/core/portal-core.ts", import.meta.url), "utf8");
const mainSource = await readFile(new URL("../src/main.ts", import.meta.url), "utf8");
const multiWindowSource = await readFile(new URL("../src/multi-window-portal.ts", import.meta.url), "utf8");
assert.ok(mainSource.includes('createPlatformState({view:"home"'), "HOME must be the default entry route");
assert.ok(mainSource.includes('safeModuleContent("live",()=>renderLiveCatalog(lang))'), "LIVE catalog must have an error boundary");
assert.ok(mainSource.includes('safeModuleContent("chat",()=>renderTelegramChat())'), "CHAT must have an error boundary");
assert.ok(mainSource.includes('safeModuleContent("library",()=>renderLibrary())'), "LIBRARY must have an error boundary");
assert.ok(mainSource.includes('"freezzz:live-window-open"') && multiWindowSource.includes('"freezzz:live-window-open"'), "LIVE overlays must use the shared floating window");
assert.ok(multiWindowSource.includes("data-mw-focus"), "floating windows must expose focus-mode controls");
assert.ok(multiWindowSource.includes("portal-mw-focused"), "focus mode must be reflected in the window state");
assert.ok(multiWindowSource.includes('WINDOW_LAYOUT_KEY="freezzz:zenith:window-layout:v1"'), "floating window geometry must have a versioned persistence key");
assert.ok(multiWindowSource.includes('WORKSPACE_SETTINGS_KEY="freezzz:zenith:settings:v1"'), "workspace settings must persist with a versioned key");
assert.ok(multiWindowSource.includes("data-mw-settings-open") && multiWindowSource.includes("data-mw-settings-close"), "workspace settings panel must be openable and dismissible");
assert.ok(multiWindowSource.includes("data-mw-setting-motion") && multiWindowSource.includes("data-mw-setting-opacity"), "workspace settings must expose motion and opacity controls");
assert.ok(multiWindowSource.includes('class="portal-mw-settings"') && multiWindowSource.includes("Настройки рабочего пространства"), "workspace settings panel must be rendered, not only wired to handlers");
assert.ok(multiWindowSource.includes("zenith-reduce-motion") && multiWindowSource.includes("--zenith-window-opacity"), "workspace settings must apply accessible motion and opacity preferences");
assert.ok(multiWindowSource.includes("restoreWindowLayout();") && multiWindowSource.includes("saveWindowLayout();"), "floating window geometry must be restored and saved");
assert.ok(multiWindowSource.includes('event.key==="Escape"&&focusedWindow'), "Escape must exit window focus mode");
assert.ok(multiWindowSource.includes('window.addEventListener("resize"'), "window layout must adapt to viewport changes");
const gridSource = await readFile(new URL("../src/home-grid-shift.ts", import.meta.url), "utf8");
assert.ok(gridSource.includes('querySelectorAll<HTMLElement>("[data-home-screen]")'), "HOME must support paged screens");
assert.ok(gridSource.includes("pages.length !== 3"), "HOME must enforce exactly three screens");
assert.ok(gridSource.includes("holdTimer=window.setTimeout") && gridSource.includes("setEditing(true,tile)"), "long-press must enter block editing");
assert.ok(!gridSource.includes("grid-shift-launch") && !gridSource.includes("EDIT GRID"), "block editing must not depend on a separate launcher");
assert.ok(gridSource.includes('data-grid-shift-size') && gridSource.includes('data-grid-shift-skin'), "editor must expose size and background controls");
assert.ok(gridSource.includes('STORAGE_KEY = "freezzz:home-free-layout:v2"'), "new three-screen layout must use its own versioned storage key");
assert.ok(gridSource.includes("reorderOver") && gridSource.includes("applySkin"), "editor must support rearranging blocks and changing backgrounds");
assert.ok(mainSource.includes('data-home-screen="0"') && mainSource.includes('data-home-screen="1"') && mainSource.includes('data-home-screen="2"'), "HOME must render exactly three swipeable screens");
assert.ok(mainSource.includes("data-home-pagination") && mainSource.includes("data-home-screen-track"), "HOME must render swipe track and page navigation");
assert.ok(!/GORD CONTROL LAB|gord-control-lab|home-control-lab/i.test(mainSource), "GORD Control Lab must be removed from HOME markup");
assert.ok(!mainSource.includes("renderHomeFilterBar") && !mainSource.includes("renderHomeBookmarks") && !mainSource.includes("renderHomeSystem") && !mainSource.includes("renderSignalFeed"), "HOME must not render extra experimental widget layers");
assert.ok(gridSource.includes('data-portal-block') && gridSource.includes('data-home-grid'), "grid editor must target actual blocks inside page grids");
assert.ok(multiWindowSource.includes('if(el.closest(".portal-toolbar"))') && multiWindowSource.includes("windows[windowId].open=false"), "top-level navigation must dismiss all floating windows");
assert.ok(multiWindowSource.includes('if(id==="chat"||id==="radio"){toggle(id);return;}'), "only CHAT and RADIO routes may toggle mini windows");
assert.ok(mainSource.includes('"freezzz:radio-status"'), "radio playback state must be shared with the workspace player");
assert.ok(multiWindowSource.includes("portal-mw-wave"), "floating radio must expose an audio visualization");
assert.ok(multiWindowSource.includes('"freezzz:radio-status"'), "floating radio must react to real playback state");

const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext
  }
}).outputText;
const moduleUrl = "data:text/javascript;base64," + Buffer.from(compiled).toString("base64");
const { PortalEventBus, PortalModuleManager, ZenithOSKernel, createPlatformState } = await import(moduleUrl);

const bus = new PortalEventBus();
let calls = 0;
const originalError = console.error;
console.error = () => {};
try {
  bus.on("profile:toggled", () => { throw new Error("isolated listener failure"); });
  const unsubscribe = bus.on("profile:toggled", () => { calls += 1; });
  bus.emit("profile:toggled", { open: true });
  assert.equal(calls, 1, "one failing listener must not prevent other listeners");
  unsubscribe();
  bus.emit("profile:toggled", { open: false });
  assert.equal(calls, 1, "unsubscribed listeners must not be called");
} finally {
  console.error = originalError;
}

const manager = new PortalModuleManager();
const lifecycle = [];
manager.registerAdapter("game", {
  onActivate: () => lifecycle.push("game:activate"),
  onDeactivate: () => lifecycle.push("game:deactivate")
});
manager.registerAdapter("live", {
  onActivate: () => { throw new Error("live startup failure"); }
});
manager.setErrorHandler((view, phase) => lifecycle.push(`error:${view}:${phase}`));
assert.equal(manager.activeView, "home");
assert.equal(manager.transition("game"), true);
assert.equal(manager.activeView, "game");
assert.equal(manager.transition("live"), true);
assert.equal(manager.activeView, "live");
assert.equal(manager.transition("home"), true);
assert.deepEqual(lifecycle, [
  "game:activate",
  "game:deactivate",
  "error:live:activate"
]);
assert.equal(manager.transition("not-a-view"), false, "unknown routes must be rejected");
assert.equal(manager.runIsolated("game", () => { throw new Error("module failure"); }, "fallback"), "fallback");
assert.equal(lifecycle.at(-1), "error:game:render");
assert.equal(createPlatformState({ language: "DE" }).language, "DE");
const osKernel = new ZenithOSKernel({ initial: { view: "home", language: "RU" } });
assert.equal(osKernel.snapshot.view, "home", "ZENITH OS must boot into HOME");
assert.equal(osKernel.navigate("game").accepted, true);
assert.equal(osKernel.snapshot.view, "game");
assert.equal(osKernel.navigate("radio").accepted, true);
assert.equal(osKernel.snapshot.view, "radio");
assert.equal(osKernel.back().current, "game", "system back must restore the previous app");
assert.equal(osKernel.back().current, "home", "system back must return to HOME");
assert.equal(osKernel.navigate("live").accepted, true);
assert.equal(osKernel.navigate("chat").accepted, true);
assert.equal(osKernel.navigate("radio").accepted, true);
assert.equal(osKernel.back().current, "chat", "back stack must preserve intermediate apps");
assert.equal(osKernel.back().current, "live", "back stack must continue through older apps");
assert.equal(osKernel.navigate("not-a-view").accepted, false, "kernel must reject unknown apps");
assert.equal(osKernel.navigate("chat").accepted, true);
assert.equal(osKernel.navigate("game").accepted, true);
assert.equal(osKernel.navigate("home").accepted, true);
assert.deepEqual(osKernel.navigationHistory, [], "explicit HOME navigation must reset app history");
assert.equal(osKernel.back().current, "home", "back from HOME must remain at HOME");
osKernel.setLanguage("DE");
assert.equal(osKernel.snapshot.language, "DE", "language is shared OS state");
// Exercise the emulator launch preflight without booting a browser emulator.
if (typeof globalThis.indexedDB === "undefined") {
  Object.defineProperty(globalThis, "indexedDB", { value: {}, configurable: true, writable: true });
}
const librarySource = await readFile(new URL("../src/library-emulator.ts", import.meta.url), "utf8");
const libraryCompiled = ts.transpileModule(librarySource, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext
  }
}).outputText;
const libraryUrl = "data:text/javascript;base64," + Buffer.from(libraryCompiled).toString("base64");
const { getGameLaunchDiagnostics } = await import(libraryUrl);
assert.deepEqual(getGameLaunchDiagnostics({ system: "nes", fileName: "demo.nes", size: 1024 }), []);
assert.ok(getGameLaunchDiagnostics({ system: "nes", fileName: "demo.psx", size: 1024 }).includes("ROM_EXTENSION_MISMATCH"));
assert.ok(getGameLaunchDiagnostics({ system: "nes", fileName: "demo.nes", size: 0 }).includes("ROM_SIZE_INVALID"));
assert.ok(getGameLaunchDiagnostics({ system: "unknown", fileName: "demo.rom", size: 1024 }).includes("UNSUPPORTED_SYSTEM"));
console.log("PORTAL_CORE_SMOKE_OK");
