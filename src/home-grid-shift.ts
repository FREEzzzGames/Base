type Tile = HTMLElement;
const STORAGE_KEY = "freezzz:home-grid-shift:v2";
const SIZES = ["s", "m", "l"] as const;
type Size = typeof SIZES[number];
type Layout = { order: string[]; sizes: Record<string, Size> };
const keyOf = (tile: Tile) => tile.dataset.portalBlock || "";

function readLayout(): Layout {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") as Partial<Layout>;
    return { order: Array.isArray(value.order) ? value.order.filter(x => typeof x === "string") : [], sizes: value.sizes && typeof value.sizes === "object" ? value.sizes : {} };
  } catch { return { order: [], sizes: {} }; }
}
function saveLayout(root: HTMLElement, tiles: Tile[]) {
  const state: Layout = {
    order: [...tiles].sort((a, b) => Number(a.style.order || 0) - Number(b.style.order || 0)).map(keyOf),
    sizes: Object.fromEntries(tiles.map(tile => [keyOf(tile), (tile.dataset.gridSize || "m") as Size]))
  };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* WebView storage may be unavailable */ }
  root.dataset.gridShiftSaved = "true";
}
function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function bindHomeGridShift(root: HTMLElement) {
  if (root.dataset.gridShiftBound === "true") return;
  root.dataset.gridShiftBound = "true";
  const tiles = [...root.querySelectorAll<Tile>(":scope > [data-portal-block]")];
  if (tiles.length < 2) return;
  const originalOrder = new Map(tiles.map((tile, index) => [keyOf(tile), index]));
  const defaults: Record<string, Size> = { hero: "l", game: "l", live: "m", chat: "m", radio: "m", library: "m" };
  const saved = readLayout();
  tiles.forEach(tile => {
    const key = keyOf(tile);
    tile.dataset.gridSize = saved.sizes[key] && SIZES.includes(saved.sizes[key]) ? saved.sizes[key] : (defaults[key] || "m");
    tile.style.order = String(saved.order.includes(key) ? saved.order.indexOf(key) : (originalOrder.get(key) ?? 0));
  });
  const ordered = () => [...tiles].sort((a, b) => Number(a.style.order || 0) - Number(b.style.order || 0));
  const applyOrder = (list: Tile[]) => list.forEach((tile, index) => { tile.style.order = String(index); });
  const panel = document.createElement("div");
  panel.className = "grid-shift-panel";
  panel.hidden = true;
  panel.innerHTML = '<span data-grid-shift-hint>Перетаскивай блоки · тяни за угол для размера</span><button type="button" data-grid-shift-undo aria-label="Отменить последнее действие" title="Отменить">↶</button><button type="button" data-grid-shift-random>🎲 Случайно</button><button type="button" data-grid-shift-reset>Сброс</button><button type="button" data-grid-shift-done>✓</button>';
  root.append(panel);

  let editing = false;
  let suppressClick = false;
  let holdTimer = 0;
  let active: Tile | null = null;
  let startX = 0, startY = 0, lastX = 0, lastY = 0;
  let dragging = false;
  let resizing = false;
  let resizeStartSize: Size = "m";
  let lastSnapshot: Layout | null = null;

  const snapshot = (): Layout => ({
    order: ordered().map(keyOf),
    sizes: Object.fromEntries(tiles.map(tile => [keyOf(tile), (tile.dataset.gridSize || "m") as Size]))
  });
  const restore = (state: Layout) => {
    const lookup = new Map(tiles.map(tile => [keyOf(tile), tile]));
    applyOrder(state.order.map(key => lookup.get(key)).filter((tile): tile is Tile => Boolean(tile)).concat(tiles.filter(tile => !state.order.includes(keyOf(tile)))));
    tiles.forEach(tile => { tile.dataset.gridSize = state.sizes[keyOf(tile)] || defaults[keyOf(tile)] || "m"; });
    saveLayout(root, tiles);
  };
  const setEditing = (enabled: boolean) => {
    editing = enabled;
    root.classList.toggle("grid-shift-editing", editing);
    panel.hidden = !editing;
    tiles.forEach(tile => {
      tile.setAttribute("aria-grabbed", String(editing && tile === active));
      tile.querySelector(".grid-shift-resize-handle")?.remove();
      if (editing) {
        const handle = document.createElement("span");
        handle.className = "grid-shift-resize-handle";
        handle.setAttribute("aria-hidden", "true");
        handle.textContent = "⤢";
        tile.append(handle);
      }
    });
    if (!editing) {
      active?.classList.remove("grid-shift-dragging", "grid-shift-resizing");
      active = null;
    }
  };
  const commit = () => saveLayout(root, tiles);
  const randomize = () => {
    lastSnapshot = snapshot();
    const shuffled = shuffle(tiles);
    shuffled.forEach((tile, index) => {
      tile.style.order = String(index);
      tile.dataset.gridSize = keyOf(tile) === "hero" ? "l" : (["s", "m", "l"] as Size[])[Math.floor(Math.random() * 3)];
    });
    commit();
  };
  const chooseSizeFromDelta = (tile: Tile, dx: number, dy: number) => {
    const scale = Math.max(dx, dy);
    const current = SIZES.indexOf(resizeStartSize);
    const step = scale > 54 ? 2 : scale > 22 ? 1 : 0;
    tile.dataset.gridSize = SIZES[Math.max(0, Math.min(2, current + (step ? 1 : 0)))];
  };
  const hitTestTile = (x: number, y: number, except: Tile) => {
    let nearest: Tile | null = null, best = Number.POSITIVE_INFINITY;
    for (const tile of tiles) {
      if (tile === except) continue;
      const rect = tile.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return tile;
      const cx = (rect.left + rect.right) / 2, cy = (rect.top + rect.bottom) / 2;
      const distance = (cx - x) ** 2 + (cy - y) ** 2;
      if (distance < best) { best = distance; nearest = tile; }
    }
    return nearest;
  };
  const moveToPosition = (tile: Tile, x: number, y: number) => {
    const target = hitTestTile(x, y, tile);
    if (!target) return;
    const list = ordered(), from = list.indexOf(tile), to = list.indexOf(target);
    if (from === to || from < 0 || to < 0) return;
    list.splice(from, 1);
    list.splice(to, 0, tile);
    applyOrder(list);
  };

  tiles.forEach(tile => {
    tile.addEventListener("pointerdown", event => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      const target = event.target as HTMLElement;
      if (editing && target.closest(".grid-shift-resize-handle")) {
        resizing = true; dragging = false; active = tile; resizeStartSize = tile.dataset.gridSize as Size;
      } else if (editing) {
        resizing = false; dragging = false; active = tile;
      } else {
        active = tile;
        window.clearTimeout(holdTimer);
        holdTimer = window.setTimeout(() => {
          suppressClick = true;
          lastSnapshot = snapshot();
          setEditing(true);
          active = tile;
          tile.classList.add("grid-shift-dragging");
        }, 480);
      }
      startX = lastX = event.clientX; startY = lastY = event.clientY;
      try { tile.setPointerCapture(event.pointerId); } catch { /* pointer capture is optional */ }
    });
    tile.addEventListener("pointermove", event => {
      if (!active || active !== tile) return;
      lastX = event.clientX; lastY = event.clientY;
      if (!editing) {
        if (Math.abs(lastX - startX) + Math.abs(lastY - startY) > 12) window.clearTimeout(holdTimer);
        return;
      }
      if (!dragging && !resizing && Math.abs(lastX - startX) + Math.abs(lastY - startY) > 8) {
        dragging = true;
        lastSnapshot = snapshot();
        tile.classList.add("grid-shift-dragging");
      }
      if (resizing) {
        if (!lastSnapshot) lastSnapshot = snapshot();
        tile.classList.add("grid-shift-resizing");
        chooseSizeFromDelta(tile, lastX - startX, lastY - startY);
      } else if (dragging) {
        const rect = tile.getBoundingClientRect();
        tile.style.setProperty("--grid-drag-x", `${lastX - startX}px`);
        tile.style.setProperty("--grid-drag-y", `${lastY - startY}px`);
        moveToPosition(tile, lastX, lastY);
        void rect;
      }
    });
    const finish = () => {
      window.clearTimeout(holdTimer);
      if (editing && active === tile && (dragging || resizing)) {
        tile.classList.remove("grid-shift-dragging", "grid-shift-resizing");
        tile.style.removeProperty("--grid-drag-x");
        tile.style.removeProperty("--grid-drag-y");
        commit();
        suppressClick = true;
      }
      active = null; dragging = false; resizing = false;
    };
    tile.addEventListener("pointerup", finish);
    tile.addEventListener("pointercancel", finish);
    tile.addEventListener("click", event => {
      if (suppressClick) { event.preventDefault(); event.stopImmediatePropagation(); suppressClick = false; return; }
      if (editing) { event.preventDefault(); event.stopImmediatePropagation(); }
    }, true);
    tile.addEventListener("contextmenu", event => { if (editing) event.preventDefault(); });
  });

  panel.querySelector("[data-grid-shift-done]")?.addEventListener("click", () => setEditing(false));
  panel.querySelector("[data-grid-shift-random]")?.addEventListener("click", randomize);
  panel.querySelector("[data-grid-shift-undo]")?.addEventListener("click", () => {
    if (!lastSnapshot) return;
    restore(lastSnapshot); lastSnapshot = null;
  });
  panel.querySelector("[data-grid-shift-reset]")?.addEventListener("click", () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore unavailable storage */ }
    tiles.forEach(tile => { tile.style.order = String(originalOrder.get(keyOf(tile)) ?? 0); tile.dataset.gridSize = defaults[keyOf(tile)] || "m"; });
    lastSnapshot = null; setEditing(false);
  });
}
