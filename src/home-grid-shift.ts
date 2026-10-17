type Tile = HTMLElement & { dataset: DOMStringMap };
const STORAGE_KEY = "freezzz:home-grid-shift:v1";
const SIZES = ["s", "m", "l"] as const;
type Size = typeof SIZES[number];
type SavedLayout = { order: string[]; sizes: Record<string, Size> };

function readLayout(): SavedLayout {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") as Partial<SavedLayout>;
    return { order: Array.isArray(value.order) ? value.order.filter(x => typeof x === "string") : [], sizes: value.sizes && typeof value.sizes === "object" ? value.sizes : {} };
  } catch { return { order: [], sizes: {} }; }
}

function saveLayout(root: HTMLElement, tiles: Tile[]) {
  const state: SavedLayout = {
    order: [...tiles].sort((a, b) => Number(a.style.order || 0) - Number(b.style.order || 0)).map(tile => tile.dataset.portalBlock || ""),
    sizes: Object.fromEntries(tiles.map(tile => [tile.dataset.portalBlock || "", (tile.dataset.gridSize || "m") as Size]))
  };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage can be unavailable in private WebViews */ }
  root.dataset.gridShiftSaved = "true";
}

export function bindHomeGridShift(root: HTMLElement) {
  if (root.dataset.gridShiftBound === "true") return;
  root.dataset.gridShiftBound = "true";
  const tiles = [...root.querySelectorAll<Tile>(":scope > [data-portal-block]")];
  if (tiles.length < 2) return;

  const saved = readLayout();
  const originalOrder = new Map(tiles.map((tile, index) => [tile.dataset.portalBlock || "", index]));
  tiles.forEach(tile => {
    const key = tile.dataset.portalBlock || "";
    tile.dataset.gridSize = saved.sizes[key] && SIZES.includes(saved.sizes[key]) ? saved.sizes[key] : (key === "hero" ? "l" : "m");
    tile.style.order = String(saved.order.indexOf(key) >= 0 ? saved.order.indexOf(key) : (originalOrder.get(key) ?? 0));
  });
  const ordered = () => [...tiles].sort((a, b) => Number(a.style.order || 0) - Number(b.style.order || 0));
  const panel = document.createElement("div");
  panel.className = "grid-shift-panel";
  panel.hidden = true;
  panel.innerHTML = '<span data-grid-shift-hint>GRID SHIFT · удерживай блок для режима перестройки</span><button type="button" data-grid-shift-reset>Сброс</button><button type="button" data-grid-shift-done>Готово</button>';
  root.append(panel);
  let editing = false;
  let holdTimer = 0;
  let startX = 0, startY = 0;
  let active: Tile | null = null;
  let moved = false;

  const setEditing = (enabled: boolean) => {
    editing = enabled;
    root.classList.toggle("grid-shift-editing", editing);
    panel.hidden = !editing;
    tiles.forEach(tile => { tile.setAttribute("aria-grabbed", String(editing && tile === active)); });
    if (!editing) active = null;
  };
  const applyOrder = (list: Tile[]) => list.forEach((tile, index) => { tile.style.order = String(index); });
  const shift = (tile: Tile, dx: number, dy: number) => {
    const list = ordered();
    const from = list.indexOf(tile);
    if (from < 0) return;
    // Directional neighbor selection feels like sliding a tile, without allowing overlap.
    const target = from + (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : -1) : (dy > 0 ? 2 : -2));
    const to = Math.max(0, Math.min(list.length - 1, target));
    if (to === from) return;
    const [picked] = list.splice(from, 1);
    list.splice(to, 0, picked);
    applyOrder(list);
    saveLayout(root, tiles);
  };
  const cycleSize = (tile: Tile) => {
    const current = tile.dataset.gridSize as Size;
    tile.dataset.gridSize = SIZES[(SIZES.indexOf(current) + 1) % SIZES.length];
    saveLayout(root, tiles);
  };

  tiles.forEach(tile => {
    tile.addEventListener("pointerdown", event => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      startX = event.clientX; startY = event.clientY; active = tile; moved = false;
      window.clearTimeout(holdTimer);
      holdTimer = window.setTimeout(() => { moved = true; setEditing(!editing); if (editing) active = tile; }, 480);
    }, { passive: true });
    tile.addEventListener("pointermove", event => {
      if (!active || active !== tile) return;
      if (Math.abs(event.clientX - startX) + Math.abs(event.clientY - startY) > 12) window.clearTimeout(holdTimer);
    }, { passive: true });
    tile.addEventListener("pointerup", event => {
      window.clearTimeout(holdTimer);
      if (!editing || !active || active !== tile || moved) return;
      const dx = event.clientX - startX, dy = event.clientY - startY;
      if (Math.abs(dx) + Math.abs(dy) > 28) { shift(tile, dx, dy); moved = true; }
    }, { passive: true });
    tile.addEventListener("pointercancel", () => window.clearTimeout(holdTimer), { passive: true });
    tile.addEventListener("click", event => {
      if (!editing) return;
      event.preventDefault(); event.stopImmediatePropagation();
      if (!moved) cycleSize(tile);
      moved = false;
    }, true);
  });
  panel.querySelector("[data-grid-shift-done]")?.addEventListener("click", () => setEditing(false));
  panel.querySelector("[data-grid-shift-reset]")?.addEventListener("click", () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore unavailable storage */ }
    tiles.forEach((tile, index) => { tile.style.order = String(originalOrder.get(tile.dataset.portalBlock || "") ?? index); tile.dataset.gridSize = tile.dataset.portalBlock === "hero" ? "l" : "m"; });
    setEditing(false);
  });
}
