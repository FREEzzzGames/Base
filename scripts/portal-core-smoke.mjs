import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../src/core/portal-core.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext
  }
}).outputText;
const moduleUrl = "data:text/javascript;base64," + Buffer.from(compiled).toString("base64");
const { PortalEventBus, PortalModuleManager, createPlatformState } = await import(moduleUrl);

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
assert.equal(createPlatformState({ language: "DE" }).language, "DE");
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
