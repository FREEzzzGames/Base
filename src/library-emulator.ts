type SystemId = "nes" | "gb" | "sms" | "md" | "snes" | "gba" | "psx" | "nds";

type LibraryGame = {
  id: string;
  name: string;
  fileName: string;
  system: SystemId;
  bits: 8 | 16 | 32;
  size: number;
  addedAt: string;
  lastPlayedAt?: string;
};

type EmulatorWindow = Window & {
  EJS_player?: string;
  EJS_gameUrl?: string | File;
  EJS_gameName?: string;
  EJS_core?: string;
  EJS_pathtodata?: string;
  EJS_startOnLoaded?: boolean;
  EJS_virtualGamepad?: boolean;
  EJS_controlScheme?: string;
  EJS_askBeforeExit?: boolean;
  EJS_noAutoFocus?: boolean;
  EJS_color?: string;
  EJS_hideSettings?: string[];
  EJS_defaultControls?: Record<number, Record<number, { value: string; value2?: string }>>;
  EJS_defaultOptions?: Record<string, string | number | boolean>;
  EJS_Buttons?: Record<string, boolean | { visible?: boolean }>;
  EJS_ready?: () => void;
  EJS_onGameStart?: () => void;
  EJS_onExit?: () => void;
  EJS_browserMode?: "mobile" | "desktop" | 1 | 2;
  EJS_terminate?: () => void;
  EJS_gameID?: number;
  EJS_disableCue?: boolean;
  EJS_mouse?: boolean;
  EJS_dontExtractRom?: boolean;
  EJS_emulator?: { started?: boolean; gameManager?: { simulateInput?: (player: number, button: number, value: number) => void } };
};

const DB_NAME = "freezzz-library";
const DB_VERSION = 2;
const STORE = "roms";
const META_KEY = "freezzz:library:games";
const OPACITY_KEY = "freezzz:library:gamepad-opacity";
const EJS_DATA = "https://cdn.emulatorjs.org/4.2.3/data/";
const EJS_LOADER = EJS_DATA + "loader.js";

const SYSTEMS: Record<SystemId, { label: string; bits: 8 | 16 | 32; core: string; exts: string[] }> = {
  nes:  { label: "NES", bits: 8,  core: "nes",     exts: ["nes", "fds", "unif", "unf"] },
  gb:   { label: "Game Boy", bits: 8, core: "gb",  exts: ["gb", "gbc"] },
  sms:  { label: "Master System", bits: 8, core: "segaMS", exts: ["sms"] },
  md:   { label: "Mega Drive / Genesis", bits: 16, core: "segaMD", exts: ["md", "gen", "smd", "sg"] },
  snes: { label: "SNES", bits: 16, core: "snes", exts: ["sfc", "smc", "fig", "swc"] },
  gba:  { label: "Game Boy Advance", bits: 32, core: "gba", exts: ["gba"] },
  psx:  { label: "PlayStation", bits: 32, core: "psx", exts: ["bin", "cue", "iso", "img", "pbp", "chd", "m3u"] },
  nds:  { label: "Nintendo DS", bits: 32, core: "nds", exts: ["nds"] }
};

let selectedSystem: "all" | "8" | "16" | "32" = "all";
let librarySearch = "";
let activeGame: LibraryGame | null = null;
let emulatorToken = 0;
const activeGamepadReleases = new Set<() => void>();

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
  const ext = extensionOf(file.name);

  if (direct && ext !== "zip" && ext !== "7z") {
    return { system: direct, blob: file, fileName: file.name };
  }

  if (ext === "7z") {
    // EmulatorJS can extract 7z archives itself, but the core still has to be
    // selected before boot. Never silently guess PSX for an arbitrary archive.
    // Support the common "game.nds.7z" / "game.gba.7z" naming convention.
    const innerName = file.name.replace(/\.7z$/i, "");
    const innerSystem = detectSystem(innerName);
    if (!innerSystem) throw new Error("7Z_SYSTEM_UNKNOWN");
    return { system: innerSystem, blob: file, fileName: file.name };
  }

  if (ext !== "zip") throw new Error("UNSUPPORTED_ROM_FORMAT");

  const entries = await inspectZip(file);
  const candidates = entries.filter(entry => detectSystem(entry.name));
  if (!candidates.length) throw new Error("ZIP_ROM_NOT_RECOGNIZED");

  const systems = Array.from(new Set(candidates.map(entry => detectSystem(entry.name)).filter(Boolean))) as SystemId[];
  if (systems.length !== 1) throw new Error("ZIP_MULTIPLE_SYSTEMS_UNSUPPORTED");

  const system = systems[0];

  // Disc-based PlayStation games commonly need both .cue and .bin files.
  // Preserve a multi-file PSX ZIP so EmulatorJS can extract the whole archive.
  if (system === "psx" && candidates.length > 1) {
    return { system, blob: file, fileName: file.name };
  }

  if (candidates.length !== 1) throw new Error("ZIP_MUST_CONTAIN_ONE_ROM");
  const entry = candidates[0];
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
  const query = librarySearch.trim().toLocaleLowerCase();
  return readMeta().filter(game => {
    const matchesBits = selectedSystem === "all" || String(game.bits) === selectedSystem;
    if (!matchesBits) return false;
    if (!query) return true;
    return [game.name, game.fileName, SYSTEMS[game.system].label]
      .some(value => value.toLocaleLowerCase().includes(query));
  });
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
  const badge = game.lastPlayedAt ? "RECENT" : meta.label;
  return '<article class="library-game-card library-catalog-card">' +
    '<button type="button" class="library-game-cover" data-library-play="' + esc(game.id) + '" aria-label="Запустить ' + esc(game.name) + '">' +
      '<span class="library-game-cover-system">' + esc(meta.label) + '</span><strong>' + game.bits + '</strong><small>' + esc(badge) + '</small>' +
    '</button>' +
    '<div class="library-game-info"><strong title="' + esc(game.name) + '">' + esc(game.name) + '</strong><small>' + esc(game.fileName) + ' · ' + formatSize(game.size) + '</small></div>' +
    '<div class="library-game-actions"><button type="button" class="tg-button" data-library-play="' + esc(game.id) + '">PLAY</button><button type="button" class="tg-button secondary" data-library-delete="' + esc(game.id) + '" aria-label="Удалить игру">×</button></div>' +
    '</article>';
}

export function renderLibrary(): string {
  const games = filteredGames();
  const total = readMeta().length;
  return '<div class="content portal-layout library-portal" data-portal-layout="library">' +
    '<section class="library-shell portal-block">' +
      '<div class="library-head"><div><div class="library-kicker">FREEzzz // HOME BREW</div><h2>GAME LIBRARY</h2><p>' + total + ' игр · локально на устройстве · ROM-файлы не загружаются на сервер.</p></div>' +
      '<label class="library-add-button tg-button"><input id="library-rom-input" type="file" accept=".nes,.fds,.unif,.unf,.gb,.gbc,.sms,.md,.gen,.smd,.sg,.sfc,.smc,.fig,.swc,.gba,.bin,.cue,.iso,.img,.pbp,.chd,.m3u,.zip,.7z" multiple hidden>+ ADD ROM</label></div>' +
      '<div class="library-catalog-search"><span>⌕</span><input id="library-search" type="search" value="' + esc(librarySearch) + '" placeholder="Поиск игры, файла или системы..." autocomplete="off" spellcheck="false"><button type="button" data-library-search-clear aria-label="Очистить поиск">×</button></div>' +
      '<div class="library-filters">' + systemCards() + '</div>' +
      '<div class="library-catalog-meta"><span>' + games.length + ' RESULTS</span><span>' + (selectedSystem === "all" ? "ALL GENERATIONS" : selectedSystem + "-BIT") + '</span></div>' +
      '<div class="library-game-grid">' + (games.length ? games.map(gameCard).join("") : '<div class="library-empty"><b>NO GAMES FOUND</b><span>Измени поиск или добавь ROM в библиотеку.</span></div>') + '</div>' +
      '<div class="library-emulator-root" id="library-emulator-root" hidden></div>' +
      '<div class="library-hint">Эмуляция выполняется в браузере. Используй ROM-файлы, которыми ты имеешь право пользоваться.</div>' +
    '</section>' +
  '</div>';
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
    { key:"x",code:"KeyX",label:"1",cls:"face b" }, { key:"z",code:"KeyZ",label:"2",cls:"face a" }
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
  if (system === "nds") return [
    { key:"ArrowUp",code:"ArrowUp",label:"↑",cls:"dpad up" }, { key:"ArrowDown",code:"ArrowDown",label:"↓",cls:"dpad down" },
    { key:"ArrowLeft",code:"ArrowLeft",label:"←",cls:"dpad left" }, { key:"ArrowRight",code:"ArrowRight",label:"→",cls:"dpad right" },
    { key:"Shift",code:"ShiftLeft",label:"SELECT",cls:"select" }, { key:"Enter",code:"Enter",label:"START",cls:"start" },
    { key:"z",code:"KeyZ",label:"A",cls:"face a" }, { key:"x",code:"KeyX",label:"B",cls:"face b" },
    { key:"a",code:"KeyA",label:"Y",cls:"face y" }, { key:"s",code:"KeyS",label:"X",cls:"face x" },
    { key:"q",code:"KeyQ",label:"L",cls:"shoulder l" }, { key:"w",code:"KeyW",label:"R",cls:"shoulder r" }
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

  const button = (x: TouchBinding): string =>
    '<button type="button" class="freezzz-gp-btn ' + (x.cls || "") +
    '" data-gp-key="' + x.key + '" data-gp-code="' + (x.code || "") +
    '" aria-label="' + esc(x.label) + '">' + esc(x.label) + '</button>';

  const dpad: TouchBinding[] = [];
  const center: TouchBinding[] = [];
  const face: TouchBinding[] = [];
  const shoulders: TouchBinding[] = [];

  for (const binding of bindings) {
    const cls = binding.cls || "";
    if (cls.includes("dpad")) dpad.push(binding);
    else if (cls.includes("face")) face.push(binding);
    else if (cls === "select" || cls === "start" || cls === "mode") center.push(binding);
    else if (cls.includes("shoulder") || cls.includes("trigger")) shoulders.push(binding);
    else center.push(binding);
  }

  const group = (name: string, items: TouchBinding[]): string =>
    items.length
      ? '<div class="' + name + '">' + items.map(button).join("") + '</div>'
      : "";

  return '<div class="freezzz-custom-gamepad freezzz-gamepad-v2 freezzz-gamepad-' + system +
    '" data-gamepad-system="' + system + '">' +
    '<div class="freezzz-gp-body">' +
      group("freezzz-gp-dpad", dpad) +
      group("freezzz-gp-center", center) +
      group("freezzz-gp-face", face) +
      group("freezzz-gp-shoulders", shoulders) +
    '</div>' +
  '</div>';
}

function getCoreButtonIndex(system: SystemId, key: string): number {
  const dpad: Record<string, number> = {
    ArrowUp: 4, ArrowDown: 5, ArrowLeft: 6, ArrowRight: 7
  };
  if (dpad[key] !== undefined) return dpad[key];
  const maps: Record<SystemId, Record<string, number>> = {
    nes: { Shift: 2, Enter: 3, x: 0, z: 8 },
    gb:  { Shift: 2, Enter: 3, x: 0, z: 8 },
    sms: { x: 0, z: 8 },
    md:  { Shift: 2, Enter: 3, x: 0, z: 8, c: 10, a: 9, s: 1, d: 11 },
    snes:{ Shift: 2, Enter: 3, x: 0, z: 8, a: 1, s: 9, q: 10, e: 11 },
    gba: { Shift: 2, Enter: 3, x: 0, z: 8, a: 10, s: 11 },
    nds: { Shift: 2, Enter: 3, x: 0, z: 8, a: 1, s: 9, q: 10, w: 11 },
    psx: { Shift: 2, Enter: 3, z: 0, x: 8, a: 1, s: 9, q: 10, e: 11, "1": 12, "3": 13 }
  };
  return maps[system][key] ?? -1;
}

function keyboardValue(key: string): string {
  const values: Record<string, string> = {
    ArrowUp: "up arrow",
    ArrowDown: "down arrow",
    ArrowLeft: "left arrow",
    ArrowRight: "right arrow",
    Shift: "shift",
    Enter: "enter"
  };
  return values[key] || key.toLowerCase();
}

function keyboardCode(key: string, code?: string): string {
  if (code) return code;
  if (/^\d$/.test(key)) return "Digit" + key;
  if (key.length === 1) return "Key" + key.toUpperCase();
  return key;
}

function keyboardKeyCode(key: string): number {
  const codes: Record<string, number> = {
    ArrowLeft: 37,
    ArrowUp: 38,
    ArrowRight: 39,
    ArrowDown: 40,
    Shift: 16,
    Enter: 13,
    x: 88,
    z: 90,
    c: 67,
    a: 65,
    s: 83,
    d: 68,
    q: 81,
    e: 69,
    w: 87,
    "1": 49,
    "3": 51
  };
  return codes[key] ?? 0;
}

function installDefaultControls(system: SystemId): void {
  const w = window as EmulatorWindow;
  const bindings = gamepadBindings(system);
  // EmulatorJS expects keyboard mappings as event.key strings, not numeric keyCodes.
  const controls: Record<number, { value: string; value2?: string }> = {};
  const seenKeys = new Set<string>();
  const seenIndices = new Set<number>();

  for (const binding of bindings) {
    const index = getCoreButtonIndex(system, binding.key);
    if (index < 0) throw new Error("UNMAPPED_GAMEPAD_BUTTON:" + system + ":" + binding.key);
    if (seenKeys.has(binding.key)) throw new Error("DUPLICATE_GAMEPAD_KEY:" + system + ":" + binding.key);
    if (seenIndices.has(index)) throw new Error("DUPLICATE_GAMEPAD_INDEX:" + system + ":" + index);
    seenKeys.add(binding.key);
    seenIndices.add(index);
    const value = keyboardValue(binding.key);
    const value2: Record<number, string> = {
      0: "BUTTON_2", 1: "BUTTON_4", 2: "SELECT", 3: "START",
      4: "DPAD_UP", 5: "DPAD_DOWN", 6: "DPAD_LEFT", 7: "DPAD_RIGHT",
      8: "BUTTON_1", 9: "BUTTON_3", 10: "LEFT_TOP_SHOULDER",
      11: "RIGHT_TOP_SHOULDER", 12: "LEFT_BOTTOM_SHOULDER", 13: "RIGHT_BOTTOM_SHOULDER"
    };
    controls[index] = { value, value2: value2[index] || binding.label };
  }

  w.EJS_defaultControls = { 0: controls, 1: {}, 2: {}, 3: {} };
}

function sendCoreInput(system: SystemId, key: string, code: string | undefined, pressed: boolean): void {
  const button = getCoreButtonIndex(system, key);
  const w = window as EmulatorWindow;
  const emulator = w.EJS_emulator;
  const simulateInput = emulator?.gameManager?.simulateInput;

  // Keep both input paths active. On mobile EmulatorJS builds the internal
  // simulateInput method can exist without reaching the active core.
  if (button >= 0 && typeof simulateInput === "function") {
    try { simulateInput(0, button, pressed ? 1 : 0); } catch {}
  }

  const type = pressed ? "keydown" : "keyup";
  const keyCode = keyboardKeyCode(key);
  const makeEvent = (): KeyboardEvent => {
    const event = new KeyboardEvent(type, {
      key: keyboardValue(key),
      code: keyboardCode(key, code),
      bubbles: true,
      cancelable: true
    });
    try {
      Object.defineProperty(event, "keyCode", { value: keyCode, configurable: true });
      Object.defineProperty(event, "which", { value: keyCode, configurable: true });
    } catch {}
    return event;
  };

  const player = document.querySelector<HTMLElement>("#freezzz-ejs-player");
  const target = player || document.body || document.documentElement;
  target.dispatchEvent(makeEvent());
  document.dispatchEvent(makeEvent());
  window.dispatchEvent(makeEvent());
}

function bindNdsTouch(): void {
  const player = document.querySelector<HTMLElement>("#freezzz-ejs-player");
  const screen = document.querySelector<HTMLElement>(".freezzz-screen-nds");
  const layer = screen?.querySelector<HTMLElement>(".freezzz-nds-touch-layer");
  if (!player || !screen || !layer || activeGame?.system !== "nds" || layer.dataset.bound === "1") return;

  layer.dataset.bound = "1";
  layer.style.touchAction = "none";

  let active = false;
  let activePointerId: number | null = null;
  let activeCanvas: HTMLCanvasElement | null = null;

  const visibleCanvases = (): HTMLCanvasElement[] =>
    Array.from(player.querySelectorAll<HTMLCanvasElement>("canvas")).filter(canvas => {
      const rect = canvas.getBoundingClientRect();
      return rect.width > 2 && rect.height > 2;
    });

  const resolveTouchTarget = (): { canvas: HTMLCanvasElement; rect: DOMRect } | null => {
    const list = visibleCanvases();
    if (!list.length) return null;
    if (list.length > 1) {
      const canvas = list.slice().sort((a, b) =>
        b.getBoundingClientRect().top - a.getBoundingClientRect().top
      )[0];
      return { canvas, rect: canvas.getBoundingClientRect() };
    }
    const canvas = list[0];
    const rect = canvas.getBoundingClientRect();
    return {
      canvas,
      rect: new DOMRect(rect.left, rect.top + rect.height * 0.5, rect.width, rect.height * 0.5)
    };
  };

  const syncLayer = (): void => {
    const target = resolveTouchTarget();
    const screenRect = screen.getBoundingClientRect();
    if (!target || !screenRect.width || !screenRect.height) {
      layer.hidden = true;
      return;
    }
    const r = target.rect;
    const left = Math.max(0, r.left - screenRect.left);
    const top = Math.max(0, r.top - screenRect.top);
    const width = Math.max(1, Math.min(screenRect.right - (screenRect.left + left), r.width));
    const height = Math.max(1, Math.min(screenRect.bottom - (screenRect.top + top), r.height));
    layer.hidden = false;
    layer.style.left = left + "px";
    layer.style.top = top + "px";
    layer.style.width = width + "px";
    layer.style.height = height + "px";
  };

  const emit = (type: "down" | "move" | "up", event: PointerEvent): void => {
    if (!activeCanvas) return;
    const canvas = activeCanvas;
    const layerRect = layer.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const nx = Math.max(0, Math.min(1, (event.clientX - layerRect.left) / Math.max(1, layerRect.width)));
    const ny = Math.max(0, Math.min(1, (event.clientY - layerRect.top) / Math.max(1, layerRect.height)));
    const clientX = canvasRect.left + nx * canvasRect.width;
    const clientY = canvasRect.top + ny * canvasRect.height;
    const buttons = type === "up" ? 0 : 1;

    try {
      canvas.dispatchEvent(new PointerEvent(
        type === "down" ? "pointerdown" : type === "move" ? "pointermove" : "pointerup",
        {
          bubbles: true,
          cancelable: true,
          pointerId: event.pointerId,
          pointerType: "touch",
          isPrimary: true,
          clientX,
          clientY,
          screenX: event.screenX,
          screenY: event.screenY,
          button: 0,
          buttons
        }
      ));
    } catch {}

    canvas.dispatchEvent(new MouseEvent(
      type === "down" ? "mousedown" : type === "move" ? "mousemove" : "mouseup",
      {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX,
        clientY,
        screenX: event.screenX,
        screenY: event.screenY,
        button: 0,
        buttons
      }
    ));
  };

  const release = (event: PointerEvent): void => {
    if (!active || !activeCanvas || event.pointerId !== activePointerId) return;
    event.preventDefault();
    emit("up", event);
    active = false;
    activeCanvas = null;
    activePointerId = null;
    try { layer.releasePointerCapture?.(event.pointerId); } catch {}
    syncLayer();
  };

  const begin = (event: PointerEvent): void => {
    if (event.pointerType === "mouse" || active) return;
    syncLayer();
    if (layer.hidden || !resolveTouchTarget()) return;
    event.preventDefault();
    event.stopPropagation();
    active = true;
    activePointerId = event.pointerId;
    activeCanvas = resolveTouchTarget()!.canvas;
    try { layer.setPointerCapture?.(event.pointerId); } catch {}
    emit("down", event);
  };

  layer.addEventListener("pointerdown", begin, { capture: true, passive: false });
  layer.addEventListener("pointermove", event => {
    if (!active || !activeCanvas || event.pointerId !== activePointerId || event.pointerType === "mouse") return;
    event.preventDefault();
    emit("move", event);
  }, { capture: true, passive: false });
  layer.addEventListener("pointerup", release, { capture: true, passive: false });
  layer.addEventListener("pointercancel", release, { capture: true, passive: false });
  layer.addEventListener("lostpointercapture", event => {
    if (active && activeCanvas && event.pointerId === activePointerId) {
      emit("up", event);
      active = false;
      activeCanvas = null;
      activePointerId = null;
    }
  }, { capture: true });

  const resize = () => syncLayer();
  window.addEventListener("resize", resize, { passive: true });
  window.visualViewport?.addEventListener("resize", resize, { passive: true });
  window.visualViewport?.addEventListener("scroll", resize, { passive: true });
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(screen);
  syncLayer();
}

function bindEmulatorControls(): void {
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
  });
}

function bindCustomGamepad(): void {
  const root = document.querySelector<HTMLElement>(".freezzz-custom-gamepad");
  if (!root || root.dataset.bound === "1") return;
  const system = root.dataset.gamepadSystem as SystemId | undefined;
  if (!system || !SYSTEMS[system]) return;
  root.dataset.bound = "1";

  root.querySelectorAll<HTMLButtonElement>("[data-gp-key]").forEach(button => {
    const key = button.dataset.gpKey || "";
    const code = button.dataset.gpCode || undefined;
    let pressed = false;

    const release = () => {
      if (!pressed) return;
      pressed = false;
      button.classList.remove("is-pressed");
      activeGamepadReleases.delete(release);
      sendCoreInput(system, key, code, false);
    };

    const press = () => {
      if (pressed) return;
      pressed = true;
      activeGamepadReleases.add(release);
      button.classList.add("is-pressed");
      sendCoreInput(system, key, code, true);
    };

    button.addEventListener("pointerdown", event => {
      event.preventDefault();
      if (event.pointerType === "mouse" && event.button !== 0) return;
      button.setPointerCapture?.(event.pointerId);
      press();
    }, { passive: false });
    button.addEventListener("pointerup", event => {
      event.preventDefault();
      release();
    }, { passive: false });
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
    button.addEventListener("pointerleave", event => {
      if (event.pointerType === "mouse" && event.buttons === 0) release();
    });
    button.addEventListener("contextmenu", event => event.preventDefault());
  });
}

function emulatorMarkup(game: LibraryGame): string {
  const opacity = Math.round(getOpacity() * 100);
  return '<div class="freezzz-emulator-host" style="--freezzz-pad-opacity:' + (opacity / 100) + '">' +
    '<header class="freezzz-emulator-head"><button type="button" class="tg-button secondary" data-library-exit>← LIBRARY</button><strong>' + esc(game.name) + '</strong><span>' + esc(SYSTEMS[game.system].label) + '</span></header>' +
    '<div class="freezzz-emulator-screen freezzz-screen-' + game.system + '">' +
      '<div id="freezzz-ejs-player" class="freezzz-ejs-player"></div>' +
      (game.system === "nds" ? '<div class="freezzz-nds-touch-layer" aria-label="Nintendo DS touchscreen"></div>' : '') +
    '</div>' +
    customGamepadMarkup(game.system) +
    '<div class="freezzz-emulator-controls">' +
      '<div class="freezzz-pad-title"><span>' + esc(SYSTEMS[game.system].label) + ' GAMEPAD</span><label>Opacity <input data-library-opacity type="range" min="20" max="100" value="' + opacity + '"><b data-library-opacity-value>' + opacity + '%</b></label></div>' +
    '</div>' +
  '</div>';
}

function cleanupEmulatorDom(): void {
  // EmulatorJS normally renders inside EJS_player, but older/mobile builds
  // can leave an ejs_parent/ejs_container behind after termination.
  document.querySelectorAll<HTMLElement>(".ejs_parent, .ejs_container").forEach(node => {
    if (!node.closest(".freezzz-emulator-host")) node.remove();
  });
}

function removeExistingEmulator(): void {
  const w = window as EmulatorWindow;
  activeGamepadReleases.forEach(release => release());
  activeGamepadReleases.clear();
  const oldHost = document.querySelector<HTMLElement>(".freezzz-emulator-host");
  try { w.EJS_terminate?.(); } catch {}

  // Remove the complete previous emulator before another game can be created.
  oldHost?.remove();
  document.querySelectorAll("script[data-freezzz-emulator]").forEach(x => x.remove());
  cleanupEmulatorDom();
  // Clear every EmulatorJS global that can leak a previous core/game into the
  // next boot. This is especially important when switching DS <-> console.
  w.EJS_player = undefined;
  w.EJS_gameUrl = undefined;
  w.EJS_gameName = undefined;
  w.EJS_core = undefined;
  w.EJS_defaultControls = undefined;
  w.EJS_defaultOptions = undefined;
  w.EJS_ready = undefined;
  w.EJS_onGameStart = undefined;
  w.EJS_emulator = undefined;

  document.querySelector(".portal-workspace")?.classList.remove("portal-emulator-active");
  activeGame = null;
}

function loadEmulatorScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-freezzz-emulator]');
    if (existing) {
      if (existing.dataset.freezzzLoaded === "1") {
        resolve();
      } else {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("EMULATORJS_LOAD_FAILED")), { once: true });
      }
      return;
    }
    const script = document.createElement("script");
    script.src = EJS_LOADER;
    script.async = true;
    script.dataset.freezzzEmulator = "1";
    script.onload = () => {
      script.dataset.freezzzLoaded = "1";
      resolve();
    };
    script.onerror = () => reject(new Error("EMULATORJS_LOAD_FAILED"));
    document.head.appendChild(script);
  });
}

function stableGameId(id: string): number {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) hash = Math.imul(hash ^ id.charCodeAt(i), 16777619);
  return hash >>> 0;
}

async function startGame(game: LibraryGame): Promise<void> {
  const token = ++emulatorToken;
  // Close the previous game immediately. Do not keep an old emulator alive
  // while IndexedDB is reading the next ROM.
  activeGamepadReleases.forEach(release => release());
  activeGamepadReleases.clear();
  removeExistingEmulator();
  const root = document.querySelector<HTMLElement>("#library-emulator-root");
  const list = document.querySelector<HTMLElement>(".library-game-grid");
  const filters = document.querySelector<HTMLElement>(".library-filters");
  const head = document.querySelector<HTMLElement>(".library-head");
  if (!root || !list || !filters || !head) return;

  try {
    const blob = await getRom(game.id);
    if (token !== emulatorToken) return;
    activeGame = game;
    // EmulatorJS 4.1+ accepts File objects directly; keep the original ROM filename/extension.
    const emulatorRom = new File([blob], game.fileName, { type: blob.type || "application/octet-stream" });
    // Keep the library rendered underneath; the emulator is a modal layer above it.
    list.hidden = false;
    filters.hidden = false;
    head.hidden = false;
    root.hidden = false;
    root.innerHTML = emulatorMarkup(game);
    document.querySelector(".portal-workspace")?.classList.add("portal-emulator-active");

    const w = window as EmulatorWindow;
    w.EJS_player = "#freezzz-ejs-player";
    w.EJS_gameUrl = emulatorRom;
    w.EJS_gameName = game.fileName.slice(0, 160);
    w.EJS_core = SYSTEMS[game.system].core;
    if (game.system === "nds") {
      // melonDS/libretro: force the physical DS layout on every fresh launch.
      // This keeps the top screen above the touchscreen instead of inheriting a
      // previously selected horizontal layout from EmulatorJS.
      w.EJS_defaultOptions = {
        melonds_screen_layout: "top-bottom",
        melonds_screen_gap: "0",
        melonds_touch_mode: "touch"
      };
    } else {
      w.EJS_defaultOptions = {};
    }
    w.EJS_pathtodata = EJS_DATA;
    w.EJS_startOnLoaded = true;
    w.EJS_virtualGamepad = false;
    w.EJS_controlScheme = SYSTEMS[game.system].core;
    w.EJS_browserMode = "mobile";
    w.EJS_askBeforeExit = false;
    w.EJS_noAutoFocus = true;
    w.EJS_color = "#66FCF1";
    w.EJS_hideSettings = [];
    w.EJS_gameID = stableGameId(game.id);
    w.EJS_disableCue = false;
    w.EJS_mouse = game.system === "nds";
    w.EJS_dontExtractRom = extensionOf(game.fileName) !== "7z";
    w.EJS_Buttons = {
      playPause: false,
      restart: false,
      mute: false,
      settings: false,
      fullscreen: false,
      saveState: false,
      loadState: false,
      screenRecord: false,
      gamepad: false,
      cheat: false,
      volume: false,
      saveSavFiles: false,
      loadSavFiles: false,
      quickSave: false,
      quickLoad: false,
      screenshot: false,
      cacheManager: false,
      exitEmulation: false
    };
    installDefaultControls(game.system);
    w.EJS_onExit = () => {
      if (token !== emulatorToken) return;
      cleanupEmulatorDom();
      document.querySelector<HTMLElement>(".freezzz-emulator-host")?.remove();
      document.querySelector(".portal-workspace")?.classList.remove("portal-emulator-active");
      activeGame = null;
      renderLibraryIntoPage();
    };
    const bindInputSurface = () => {
      if (token !== emulatorToken) return;
      bindCustomGamepad();
      if (game.system === "nds") bindNdsTouch();
    };
    w.EJS_ready = bindInputSurface;
    w.EJS_onGameStart = bindInputSurface;
    bindEmulatorControls();

    const games = readMeta().map(x => x.id === game.id ? { ...x, lastPlayedAt: new Date().toISOString() } : x);
    writeMeta(games);

    await loadEmulatorScript();
    if (token !== emulatorToken) return;
    bindInputSurface();
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

  const search = document.querySelector<HTMLInputElement>("#library-search");
  search?.addEventListener("input", () => {
    librarySearch = search.value;
    const cursor = search.selectionStart ?? search.value.length;
    renderLibraryIntoPage();
    const next = document.querySelector<HTMLInputElement>("#library-search");
    next?.focus();
    next?.setSelectionRange(cursor, cursor);
  });
  document.querySelector<HTMLElement>("[data-library-search-clear]")?.addEventListener("click", () => {
    librarySearch = "";
    renderLibraryIntoPage();
    document.querySelector<HTMLInputElement>("#library-search")?.focus();
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

}

export function bindLibraryView(): void {
  bindLibrary();
}
