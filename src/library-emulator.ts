type SystemId = "nes" | "gb" | "sms" | "md" | "snes" | "gba" | "psx";

type LibraryGame = {
  id: string;
  name: string;
  fileName: string;
  system: SystemId;
  systemLabel: string;
  bits: 8 | 16 | 32;
  size: number;
  addedAt: string;
  lastPlayedAt?: string;
};

type EmulatorWindow = Window & {
  EJS_player?: string;
  EJS_gameUrl?: string;
  EJS_gameName?: string;
  EJS_core?: string;
  EJS_pathtodata?: string;
  EJS_startOnLoaded?: boolean;
  EJS_virtualGamepad?: boolean;
  EJS_controlScheme?: string;
  EJS_askBeforeExit?: boolean;
  EJS_noAutoFocus?: boolean;
  EJS_color?: string;
  EJS_hideSettings?: boolean;
  EJS_terminate?: () => void;
  EJS_emulator?: { gameManager?: { simulateInput?: (player: number, button: number, value: number) => void } };
};

const DB_NAME = "freezzz-library";
const DB_VERSION = 1;
const STORE = "roms";
const META_KEY = "freezzz:library:games";
const OPACITY_KEY = "freezzz:library:gamepad-opacity";
const EJS_DATA = "https://cdn.emulatorjs.org/stable/data/";
const EJS_LOADER = EJS_DATA + "loader.js";

const SYSTEMS: Record<SystemId, { label: string; bits: 8 | 16 | 32; core: string; exts: string[] }> = {
  nes:  { label: "NES", bits: 8,  core: "nes",     exts: ["nes", "fds", "unif", "unf"] },
  gb:   { label: "Game Boy", bits: 8, core: "gb",  exts: ["gb", "gbc"] },
  sms:  { label: "Master System", bits: 8, core: "segaMS", exts: ["sms"] },
  md:   { label: "Mega Drive / Genesis", bits: 16, core: "segaMD", exts: ["md", "gen", "smd", "sg"] },
  snes: { label: "SNES", bits: 16, core: "snes", exts: ["sfc", "smc", "fig", "swc"] },
  gba:  { label: "Game Boy Advance", bits: 16, core: "gba", exts: ["gba"] },
  psx:  { label: "PlayStation", bits: 32, core: "psx", exts: ["bin", "cue", "iso", "img", "pbp", "chd", "m3u", "7z"] }
};

let selectedSystem: "all" | "8" | "16" | "32" = "all";
let activeGame: LibraryGame | null = null;
let activeObjectUrl: string | null = null;
let emulatorToken = 0;

function readMeta(): LibraryGame[] {
  try {
    const raw = localStorage.getItem(META_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeMeta(games: LibraryGame[]): void {
  try { localStorage.setItem(META_KEY, JSON.stringify(games)); } catch {}
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("LIBRARY_DB_OPEN_FAILED"));
  });
}

async function putRom(id: string, blob: Blob): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ id, blob });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("LIBRARY_ROM_WRITE_FAILED"));
  });
  db.close();
}

async function getRom(id: string): Promise<Blob> {
  const db = await openDb();
  const blob = await new Promise<Blob>((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).get(id);
    request.onsuccess = () => {
      const value = request.result?.blob;
      value instanceof Blob ? resolve(value) : reject(new Error("ROM_NOT_FOUND"));
    };
    request.onerror = () => reject(request.error || new Error("LIBRARY_ROM_READ_FAILED"));
  });
  db.close();
  return blob;
}

async function deleteRom(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("LIBRARY_ROM_DELETE_FAILED"));
  });
  db.close();
}

function extensionOf(name: string): string {
  const clean = name.toLowerCase().split("?")[0];
  const parts = clean.split(".");
  return parts.length > 1 ? parts.pop() || "" : "";
}

function detectSystem(fileName: string): SystemId | null {
  const ext = extensionOf(fileName);
  for (const [id, system] of Object.entries(SYSTEMS) as [SystemId, typeof SYSTEMS[SystemId]][]) {
    if (system.exts.includes(ext)) return id;
  }
  return null;
}

async function inspectZip(file: File): Promise<{ name: string; method: number; compressedSize: number; localOffset: number }[]> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const results: { name: string; method: number; compressedSize: number; localOffset: number }[] = [];
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) !== 0x06054b50) continue;
    const count = view.getUint16(i + 10, true);
    const centralOffset = view.getUint32(i + 16, true);
    let p = centralOffset;
    for (let n = 0; n < count && p + 46 <= bytes.length; n++) {
      if (view.getUint32(p, true) !== 0x02014b50) break;
      const method = view.getUint16(p + 10, true);
      const compressedSize = view.getUint32(p + 20, true);
      const nameLength = view.getUint16(p + 28, true);
      const extraLength = view.getUint16(p + 30, true);
      const commentLength = view.getUint16(p + 32, true);
      const localOffset = view.getUint32(p + 42, true);
      const nameBytes = bytes.subarray(p + 46, p + 46 + nameLength);
      const name = new TextDecoder().decode(nameBytes);
      if (!name.endsWith("/")) results.push({ name, method, compressedSize, localOffset });
      p += 46 + nameLength + extraLength + commentLength;
    }
    return results;
  }
  return results;
}

async function extractSingleZipRom(file: File, entry: { name: string; method: number; compressedSize: number; localOffset: number }): Promise<Blob> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const p = entry.localOffset;
  if (view.getUint32(p, true) !== 0x04034b50) throw new Error("ZIP_LOCAL_HEADER_INVALID");
  const nameLength = view.getUint16(p + 26, true);
  const extraLength = view.getUint16(p + 28, true);
  const start = p + 30 + nameLength + extraLength;
  const compressed = bytes.subarray(start, start + entry.compressedSize);
  if (entry.method === 0) return new Blob([compressed], { type: "application/octet-stream" });
  if (entry.method === 8 && "DecompressionStream" in window) {
    const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Response(stream).blob();
  }
  throw new Error("ZIP_COMPRESSION_UNSUPPORTED");
}

async function repairLegacyLibraryEntries(): Promise<void> {
  const games = readMeta();
  let changed = false;
  for (const game of games) {
    if (extensionOf(game.fileName) !== "zip") continue;
    try {
      const blob = await getRom(game.id);
      const resolved = await resolveImport(new File([blob], game.fileName, { type: blob.type || "application/zip" }));
      const config = SYSTEMS[resolved.system];
      if (game.system !== resolved.system || game.fileName !== resolved.fileName || game.size !== resolved.blob.size) {
        await putRom(game.id, resolved.blob);
        game.system = resolved.system;
        game.systemLabel = config.label;
        game.bits = config.bits;
        game.fileName = resolved.fileName;
        game.name = resolved.fileName.replace(/\.[^.]+$/, "") || resolved.fileName;
        game.size = resolved.blob.size;
        changed = true;
      }
    } catch {}
  }
  if (changed) {
    writeMeta(games);
    renderLibraryIntoPage();
  }
}

async function resolveImport(file: File): Promise<{ system: SystemId; blob: Blob; fileName: string }> {
  const direct = detectSystem(file.name);
  if (direct && extensionOf(file.name) !== "zip") return { system: direct, blob: file, fileName: file.name };
  if (extensionOf(file.name) !== "zip") throw new Error("UNSUPPORTED_ROM_FORMAT");
  const entries = await inspectZip(file);
  const candidates = entries.filter(entry => detectSystem(entry.name));
  if (candidates.length !== 1) throw new Error(candidates.length ? "ZIP_MUST_CONTAIN_ONE_ROM" : "ZIP_ROM_NOT_RECOGNIZED");
  const entry = candidates[0];
  const system = detectSystem(entry.name);
  if (!system) throw new Error("ZIP_ROM_NOT_RECOGNIZED");
  return { system, blob: await extractSingleZipRom(file, entry), fileName: entry.name };
}

function uid(): string {
  return "rom-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
}

function esc(value: string): string {
  return value.replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c] || c));
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function getOpacity(): number {
  const value = Number(localStorage.getItem(OPACITY_KEY));
  return Number.isFinite(value) ? Math.min(1, Math.max(0.2, value)) : 0.72;
}

function setOpacity(value: number): void {
  const safe = Math.min(1, Math.max(0.2, Number(value) || 0.72));
  try { localStorage.setItem(OPACITY_KEY, String(safe)); } catch {}
  document.querySelector<HTMLElement>(".freezzz-emulator-host")?.style.setProperty("--freezzz-pad-opacity", String(safe));
}

function filteredGames(): LibraryGame[] {
  const games = readMeta();
  if (selectedSystem === "all") return games;
  return games.filter(g => String(g.bits) === selectedSystem);
}

function systemCards(): string {
  const groups: Array<["all" | "8" | "16" | "32", string]> = [
    ["all", "ALL"],
    ["8", "8 BIT"],
    ["16", "16 BIT"],
    ["32", "32 BIT"]
  ];
  return groups.map(([id, label]) =>
    '<button type="button" class="library-filter ' + (selectedSystem === id ? "active" : "") + '" data-library-filter="' + id + '">' + label + "</button>"
  ).join("");
}

function gameCard(game: LibraryGame): string {
  const meta = SYSTEMS[game.system];
  return '<article class="library-game-card">' +
    '<div class="library-game-art"><span>' + game.bits + '</span><b>' + esc(meta.label) + '</b></div>' +
    '<div class="library-game-info"><strong title="' + esc(game.name) + '">' + esc(game.name) + '</strong><small>' + esc(game.fileName) + ' · ' + formatSize(game.size) + '</small></div>' +
    '<div class="library-game-actions"><button type="button" class="tg-button" data-library-play="' + esc(game.id) + '">PLAY</button><button type="button" class="tg-button secondary" data-library-delete="' + esc(game.id) + '" aria-label="Удалить игру">×</button></div>' +
    '</article>';
}

export function renderLibrary(): string {
  const games = filteredGames();
  const opacity = Math.round(getOpacity() * 100);
  return '<div class="content portal-layout library-portal" data-portal-layout="library">' +
    '<section class="library-shell portal-block">' +
      '<div class="library-head"><div><h2>LIBRARY</h2><p>Локальная библиотека игр пользователя. ROM-файлы не загружаются на сервер.</p></div>' +
      '<label class="library-add-button tg-button"><input id="library-rom-input" type="file" accept=".nes,.fds,.unif,.unf,.gb,.gbc,.sms,.md,.gen,.smd,.sg,.sfc,.smc,.fig,.swc,.gba,.bin,.cue,.iso,.img,.pbp,.chd,.m3u,.zip,.7z" multiple hidden>+ ADD ROM</label></div>' +
      '<div class="library-filters">' + systemCards() + '</div>' +
      '<div class="library-game-grid">' + (games.length ? games.map(gameCard).join("") : '<div class="library-empty"><b>LIBRARY EMPTY</b><span>Добавь собственные ROM-файлы с телефона.</span></div>') + '</div>' +
      '<div class="library-emulator-root" id="library-emulator-root" hidden></div>' +
      '<div class="library-hint">Эмуляция выполняется в браузере. Используй ROM-файлы, которыми ты имеешь право пользоваться.</div>' +
    '</section>' +
  '</div>';
}

function gamepadLabel(game: LibraryGame): string {
  if (game.system === "md") return "MEGA DRIVE";
  if (game.system === "snes") return "SNES";
  if (game.system === "gba") return "GBA";
  if (game.system === "psx") return "PLAYSTATION";
  if (game.system === "sms") return "MASTER SYSTEM";
  if (game.system === "gb") return "GAME BOY";
  return "NES";
}


type TouchBinding = { key: string; code?: string; label: string; cls?: string };

function gamepadBindings(system: SystemId): TouchBinding[] {
  if (system === "nes") return [
    { key:"ArrowUp",code:"ArrowUp",label:"↑",cls:"dpad up" }, { key:"ArrowDown",code:"ArrowDown",label:"↓",cls:"dpad down" },
    { key:"ArrowLeft",code:"ArrowLeft",label:"←",cls:"dpad left" }, { key:"ArrowRight",code:"ArrowRight",label:"→",cls:"dpad right" },
    { key:"Shift",code:"ShiftLeft",label:"SELECT",cls:"select" }, { key:"Enter",code:"Enter",label:"START",cls:"start" },
    { key:"x",code:"KeyX",label:"B",cls:"face b" }, { key:"z",code:"KeyZ",label:"A",cls:"face a" }
  ];
  if (system === "gb") return [
    { key:"ArrowUp",code:"ArrowUp",label:"↑",cls:"dpad up" }, { key:"ArrowDown",code:"ArrowDown",label:"↓",cls:"dpad down" },
    { key:"ArrowLeft",code:"ArrowLeft",label:"←",cls:"dpad left" }, { key:"ArrowRight",code:"ArrowRight",label:"→",cls:"dpad right" },
    { key:"Shift",code:"ShiftLeft",label:"SELECT",cls:"select" }, { key:"Enter",code:"Enter",label:"START",cls:"start" },
    { key:"x",code:"KeyX",label:"B",cls:"face b" }, { key:"z",code:"KeyZ",label:"A",cls:"face a" }
  ];
  if (system === "sms") return [
    { key:"ArrowUp",code:"ArrowUp",label:"↑",cls:"dpad up" }, { key:"ArrowDown",code:"ArrowDown",label:"↓",cls:"dpad down" },
    { key:"ArrowLeft",code:"ArrowLeft",label:"←",cls:"dpad left" }, { key:"ArrowRight",code:"ArrowRight",label:"→",cls:"dpad right" },
    { key:"Shift",code:"ShiftLeft",label:"1",cls:"face b" }, { key:"z",code:"KeyZ",label:"2",cls:"face a" }
  ];
  if (system === "md") return [
    { key:"ArrowUp",code:"ArrowUp",label:"↑",cls:"dpad up" }, { key:"ArrowDown",code:"ArrowDown",label:"↓",cls:"dpad down" },
    { key:"ArrowLeft",code:"ArrowLeft",label:"←",cls:"dpad left" }, { key:"ArrowRight",code:"ArrowRight",label:"→",cls:"dpad right" },
    { key:"Shift",code:"ShiftLeft",label:"MODE",cls:"mode" }, { key:"Enter",code:"Enter",label:"START",cls:"start" },
    { key:"z",code:"KeyZ",label:"A",cls:"face a" }, { key:"x",code:"KeyX",label:"B",cls:"face b" }, { key:"c",code:"KeyC",label:"C",cls:"face c" },
    { key:"a",code:"KeyA",label:"X",cls:"face x" }, { key:"s",code:"KeyS",label:"Y",cls:"face y" }, { key:"d",code:"KeyD",label:"Z",cls:"face z" }
  ];
  if (system === "gba") return [
    { key:"ArrowUp",code:"ArrowUp",label:"↑",cls:"dpad up" }, { key:"ArrowDown",code:"ArrowDown",label:"↓",cls:"dpad down" },
    { key:"ArrowLeft",code:"ArrowLeft",label:"←",cls:"dpad left" }, { key:"ArrowRight",code:"ArrowRight",label:"→",cls:"dpad right" },
    { key:"Shift",code:"ShiftLeft",label:"SELECT",cls:"select" }, { key:"Enter",code:"Enter",label:"START",cls:"start" },
    { key:"x",code:"KeyX",label:"B",cls:"face b" }, { key:"z",code:"KeyZ",label:"A",cls:"face a" },
    { key:"a",code:"KeyA",label:"L",cls:"shoulder l" }, { key:"s",code:"KeyS",label:"R",cls:"shoulder r" }
  ];
  if (system === "psx") return [
    { key:"ArrowUp",code:"ArrowUp",label:"↑",cls:"dpad up" }, { key:"ArrowDown",code:"ArrowDown",label:"↓",cls:"dpad down" },
    { key:"ArrowLeft",code:"ArrowLeft",label:"←",cls:"dpad left" }, { key:"ArrowRight",code:"ArrowRight",label:"→",cls:"dpad right" },
    { key:"Shift",code:"ShiftLeft",label:"SELECT",cls:"select" }, { key:"Enter",code:"Enter",label:"START",cls:"start" },
    { key:"z",code:"KeyZ",label:"×",cls:"face cross" }, { key:"x",code:"KeyX",label:"○",cls:"face circle" },
    { key:"a",code:"KeyA",label:"□",cls:"face square" }, { key:"s",code:"KeyS",label:"△",cls:"face triangle" },
    { key:"q",code:"KeyQ",label:"L1",cls:"shoulder l1" }, { key:"e",code:"KeyE",label:"R1",cls:"shoulder r1" },
    { key:"1",code:"Digit1",label:"L2",cls:"trigger l2" }, { key:"3",code:"Digit3",label:"R2",cls:"trigger r2" }
  ];
  if (system === "snes") return [
    { key:"ArrowUp",code:"ArrowUp",label:"↑",cls:"dpad up" }, { key:"ArrowDown",code:"ArrowDown",label:"↓",cls:"dpad down" },
    { key:"ArrowLeft",code:"ArrowLeft",label:"←",cls:"dpad left" }, { key:"ArrowRight",code:"ArrowRight",label:"→",cls:"dpad right" },
    { key:"Shift",code:"ShiftLeft",label:"SELECT",cls:"select" }, { key:"Enter",code:"Enter",label:"START",cls:"start" },
    { key:"x",code:"KeyX",label:"B",cls:"face b" }, { key:"z",code:"KeyZ",label:"A",cls:"face a" },
    { key:"a",code:"KeyA",label:"Y",cls:"face y" }, { key:"s",code:"KeyS",label:"X",cls:"face x" },
    { key:"q",code:"KeyQ",label:"L",cls:"shoulder l" }, { key:"e",code:"KeyE",label:"R",cls:"shoulder r" }
  ];
  return [
    { key:"ArrowUp",code:"ArrowUp",label:"↑",cls:"dpad up" }, { key:"ArrowDown",code:"ArrowDown",label:"↓",cls:"dpad down" },
    { key:"ArrowLeft",code:"ArrowLeft",label:"←",cls:"dpad left" }, { key:"ArrowRight",code:"ArrowRight",label:"→",cls:"dpad right" },
    { key:"Shift",code:"ShiftLeft",label:"SELECT",cls:"select" }, { key:"Enter",code:"Enter",label:"START",cls:"start" },
    { key:"x",code:"KeyX",label:"B",cls:"face b" }, { key:"z",code:"KeyZ",label:"A",cls:"face a" }
  ];
}

function customGamepadMarkup(system: SystemId): string {
  const bindings = gamepadBindings(system);
  return '<div class="freezzz-custom-gamepad freezzz-gamepad-' + system + '" data-gamepad-system="' + system + '">' +
    '<div class="freezzz-gp-body">' +
      '<div class="freezzz-gp-dpad">' +
        bindings.filter(x => x.cls?.includes("dpad")).map(x => '<button type="button" class="freezzz-gp-btn ' + x.cls + '" data-gp-key="' + x.key + '" data-gp-code="' + (x.code || "") + '">' + x.label + '</button>').join("") +
      '</div>' +
      '<div class="freezzz-gp-center">' +
        bindings.filter(x => ["select","start","mode"].some(c => x.cls?.includes(c))).map(x => '<button type="button" class="freezzz-gp-btn ' + x.cls + '" data-gp-key="' + x.key + '" data-gp-code="' + (x.code || "") + '">' + x.label + '</button>').join("") +
      '</div>' +
      '<div class="freezzz-gp-face">' +
        bindings.filter(x => x.cls?.includes("face")).map(x => '<button type="button" class="freezzz-gp-btn ' + x.cls + '" data-gp-key="' + x.key + '" data-gp-code="' + (x.code || "") + '">' + x.label + '</button>').join("") +
      '</div>' +
      '<div class="freezzz-gp-shoulders">' +
        bindings.filter(x => x.cls?.includes("shoulder") || x.cls?.includes("trigger")).map(x => '<button type="button" class="freezzz-gp-btn ' + x.cls + '" data-gp-key="' + x.key + '" data-gp-code="' + (x.code || "") + '">' + x.label + '</button>').join("") +
      '</div>' +
    '</div>' +
  '</div>';
}

function getCoreButtonIndex(system: SystemId, key: string): number {
  const common: Record<string, number> = {
    ArrowUp: 4, ArrowDown: 5, ArrowLeft: 6, ArrowRight: 7,
    Shift: 2, Enter: 3, x: 0, z: 8, a: 9, s: 10, d: 11, q: 12, e: 13
  };
  if (system === "md") {
    return ({ z: 8, x: 0, c: 12, a: 9, s: 1, d: 13 } as Record<string, number>)[key] ?? common[key] ?? -1;
  }
  if (system === "psx") {
    return ({ z: 0, x: 1, a: 2, s: 3, q: 10, e: 11, "1": 12, "3": 13 } as Record<string, number>)[key] ?? common[key] ?? -1;
  }
  return common[key] ?? -1;
}

function sendCoreInput(system: SystemId, key: string, pressed: boolean): boolean {
  const w = window as EmulatorWindow;
  const button = getCoreButtonIndex(system, key);
  const simulateInput = w.EJS_emulator?.gameManager?.simulateInput;
  if (button < 0 || typeof simulateInput !== "function") return false;
  simulateInput(0, button, pressed ? 1 : 0);
  return true;
}

function bindCustomGamepad(): void {
  const root = document.querySelector<HTMLElement>(".freezzz-custom-gamepad");
  if (!root) return;
  const system = root.dataset.gamepadSystem as SystemId | undefined;
  if (!system) return;
  root.querySelectorAll<HTMLElement>("[data-gp-key]").forEach(button => {
    const key = button.dataset.gpKey || "";
    let pressed = false;
    const send = (next: boolean) => {
      if (next === pressed) return;
      pressed = next;
      if (sendCoreInput(system, key, next)) return;
      const code = button.dataset.gpCode || "";
      document.dispatchEvent(new KeyboardEvent(next ? "keydown" : "keyup", {
        key, code, bubbles: true, cancelable: true
      }));
    };
    const release = () => send(false);
    button.addEventListener("pointerdown", e => {
      e.preventDefault();
      button.setPointerCapture?.(e.pointerId);
      send(true);
    });
    button.addEventListener("pointerup", e => {
      e.preventDefault();
      release();
    });
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
    button.addEventListener("contextmenu", e => e.preventDefault());
  });
}
function emulatorMarkup(game: LibraryGame): string {
  const opacity = Math.round(getOpacity() * 100);
  return '<div class="freezzz-emulator-host" style="--freezzz-pad-opacity:' + (opacity / 100) + '">' +
    '<header class="freezzz-emulator-head"><button type="button" class="tg-button secondary" data-library-exit>← LIBRARY</button><strong>' + esc(game.name) + '</strong><span>' + esc(gamepadLabel(game)) + '</span></header>' +
    '<div class="freezzz-emulator-screen freezzz-screen-' + game.system + '"><div id="freezzz-ejs-player" class="freezzz-ejs-player"></div></div>' +
    customGamepadMarkup(game.system) +
    '<div class="freezzz-emulator-controls">' +
      '<div class="freezzz-pad-title"><span>' + esc(gamepadLabel(game)) + ' GAMEPAD</span><label>Opacity <input data-library-opacity type="range" min="20" max="100" value="' + opacity + '"><b data-library-opacity-value>' + opacity + '%</b></label></div>' +
    '</div>' +
  '</div>';
}

function removeExistingEmulator(): void {
  const w = window as EmulatorWindow;
  try { w.EJS_terminate?.(); } catch {}
  if (activeObjectUrl) {
    URL.revokeObjectURL(activeObjectUrl);
    activeObjectUrl = null;
  }
  document.querySelectorAll("script[data-freezzz-emulator]").forEach(x => x.remove());
  const host = document.querySelector<HTMLElement>(".freezzz-emulator-host");
  host?.remove();
  document.querySelector(".portal-workspace")?.classList.remove("portal-emulator-active");
  activeGame = null;
}

function loadEmulatorScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-freezzz-emulator]');
    if (existing) {
      if ((window as EmulatorWindow).EJS_emulator) resolve();
      else {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("EMULATORJS_LOAD_FAILED")), { once: true });
      }
      return;
    }
    const script = document.createElement("script");
    script.src = EJS_LOADER;
    script.async = true;
    script.dataset.freezzzEmulator = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("EMULATORJS_LOAD_FAILED"));
    document.head.appendChild(script);
  });
}

function applyEmulatorGamepadFixes(): void {
  const root = document.querySelector<HTMLElement>(".freezzz-emulator-host");
  if (!root) return;
  const opacity = String(getOpacity());
  root.style.setProperty("--freezzz-pad-opacity", opacity);
  root.querySelectorAll<HTMLElement>(".ejs_virtualGamepad_left,.ejs_virtualGamepad_right,.ejs_virtualGamepad").forEach(el => {
    el.style.opacity = opacity;
    el.style.touchAction = "none";
  });
  root.querySelectorAll<HTMLElement>(".ejs_virtualGamepad_left,.ejs_virtualGamepad_right").forEach(el => {
    el.addEventListener("touchstart", e => e.preventDefault(), { passive: false });
  });
}

async function startGame(game: LibraryGame): Promise<void> {
  const token = ++emulatorToken;
  const root = document.querySelector<HTMLElement>("#library-emulator-root");
  const list = document.querySelector<HTMLElement>(".library-game-grid");
  const filters = document.querySelector<HTMLElement>(".library-filters");
  const head = document.querySelector<HTMLElement>(".library-head");
  if (!root || !list || !filters || !head) return;

  try {
    const blob = await getRom(game.id);
    if (token !== emulatorToken) return;
    removeExistingEmulator();
    activeGame = game;
    activeObjectUrl = URL.createObjectURL(blob);
    // Keep the library rendered underneath; the emulator is a modal layer above it.
    list.hidden = false;
    filters.hidden = false;
    head.hidden = false;
    root.hidden = false;
    root.innerHTML = emulatorMarkup(game);
    document.querySelector(".portal-workspace")?.classList.add("portal-emulator-active");

    const w = window as EmulatorWindow;
    w.EJS_player = "#freezzz-ejs-player";
    w.EJS_gameUrl = activeObjectUrl;
    w.EJS_gameName = game.name.replace(/[\\/:*?"<>|]/g, "_").slice(0, 80);
    w.EJS_core = SYSTEMS[game.system].core;
    w.EJS_pathtodata = EJS_DATA;
    w.EJS_startOnLoaded = true;
    w.EJS_virtualGamepad = false;
    w.EJS_controlScheme = SYSTEMS[game.system].core;
    w.EJS_askBeforeExit = false;
    w.EJS_noAutoFocus = true;
    w.EJS_color = "#66FCF1";
    w.EJS_hideSettings = true;

    const games = readMeta().map(x => x.id === game.id ? { ...x, lastPlayedAt: new Date().toISOString() } : x);
    writeMeta(games);

    await loadEmulatorScript();
    if (token !== emulatorToken) return;
    bindCustomGamepad();
    window.setTimeout(applyEmulatorGamepadFixes, 300);
    window.setTimeout(applyEmulatorGamepadFixes, 1200);
  } catch (error) {
    root.hidden = false;
    root.innerHTML = '<div class="library-emulator-error"><b>EMULATOR ERROR</b><span>' + esc(error instanceof Error ? error.message : String(error)) + '</span><button type="button" class="tg-button secondary" data-library-exit>BACK</button></div>';
  }
}

async function importFiles(files: FileList | null): Promise<void> {
  if (!files?.length) return;
  const current = readMeta();
  for (const file of Array.from(files)) {
    try {
      const resolved = await resolveImport(file);
      const id = uid();
      const config = SYSTEMS[resolved.system];
      const game: LibraryGame = {
        id,
        name: resolved.fileName.replace(/\\.[^.]+$/, "") || resolved.fileName,
        fileName: resolved.fileName,
        system: resolved.system,
        systemLabel: config.label,
        bits: config.bits,
        size: resolved.blob.size,
        addedAt: new Date().toISOString()
      };
      await putRom(id, resolved.blob);
      current.unshift(game);
    } catch {}
  }
  writeMeta(current);
  renderLibraryIntoPage();
}

function renderLibraryIntoPage(): void {
  const main = document.querySelector("main");
  if (!main) return;
  main.innerHTML = renderLibrary();
  bindLibrary();
}

function bindLibrary(): void {
  void repairLegacyLibraryEntries();

  document.querySelectorAll<HTMLElement>("[data-library-filter]").forEach(button => {
    button.addEventListener("click", () => {
      selectedSystem = (button.dataset.libraryFilter as typeof selectedSystem) || "all";
      renderLibraryIntoPage();
    });
  });

  document.querySelector<HTMLInputElement>("#library-rom-input")?.addEventListener("change", e => {
    void importFiles((e.target as HTMLInputElement).files);
  });

  document.querySelectorAll<HTMLElement>("[data-library-play]").forEach(button => {
    button.addEventListener("click", () => {
      const game = readMeta().find(x => x.id === button.dataset.libraryPlay);
      if (game) void startGame(game);
    });
  });

  document.querySelectorAll<HTMLElement>("[data-library-delete]").forEach(button => {
    button.addEventListener("click", async () => {
      const id = button.dataset.libraryDelete || "";
      if (!id) return;
      await deleteRom(id).catch(() => {});
      writeMeta(readMeta().filter(x => x.id !== id));
      renderLibraryIntoPage();
    });
  });

  document.querySelector<HTMLElement>("[data-library-exit]")?.addEventListener("click", () => {
    emulatorToken++;
    removeExistingEmulator();
    renderLibraryIntoPage();
  });

  const opacity = document.querySelector<HTMLInputElement>("[data-library-opacity]");
  const opacityValue = document.querySelector<HTMLElement>("[data-library-opacity-value]");
  opacity?.addEventListener("input", () => {
    const value = Math.min(100, Math.max(20, Number(opacity.value) || 72));
    setOpacity(value / 100);
    if (opacityValue) opacityValue.textContent = value + "%";
    applyEmulatorGamepadFixes();
  });
}

export function bindLibraryView(): void {
  bindLibrary();
}
