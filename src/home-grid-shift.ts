type Tile = HTMLElement;
type Size = "s" | "m" | "l";
type Layout = { order: string[]; sizes: Record<string, Size>; skins: Record<string, number> };
const STORAGE_KEY = "freezzz:home-free-layout:v3";
const SIZES: Size[] = ["s", "m", "l"];
const SKINS = [
  { background: "linear-gradient(135deg,#11151b,#252b35)", border: "#66fcf1", color: "#f3f4f6" },
  { background: "linear-gradient(135deg,#f2f0e8,#c8c7c0)", border: "#242424", color: "#101010" },
  { background: "repeating-linear-gradient(135deg,#111 0 12px,#f4c400 12px 24px)", border: "#f4c400", color: "#fff" },
  { background: "linear-gradient(135deg,#28104e,#6a2cff 48%,#00e5ff)", border: "#a46bff", color: "#fff" },
  { background: "linear-gradient(135deg,#f15a24,#ffb347)", border: "#ff7b35", color: "#17120f" },
  { background: "linear-gradient(135deg,#071b12,#12452e)", border: "#7dff9b", color: "#e9ffed" }
];
const keyOf = (tile: Tile) => tile.dataset.portalBlock || tile.dataset.portalCard || "";
const defaultSizeOf = (tile: Tile): Size => {
  const key = keyOf(tile);
  return key === "hero" ? "m" : "s";
};
function readLayouts(): Record<string, Layout> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const source = parsed as Record<string, unknown>;
    const result: Record<string, Layout> = {};
    for (const page of ["0", "1"]) {
      const raw = source[page];
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
      const item = raw as Record<string, unknown>;
      const order = Array.isArray(item.order)
        ? item.order.filter((key): key is string => typeof key === "string").slice(0, 200)
        : [];
      const rawSizes = item.sizes && typeof item.sizes === "object" && !Array.isArray(item.sizes)
        ? item.sizes as Record<string, unknown> : {};
      const sizes: Record<string, Size> = {};
      for (const [key, size] of Object.entries(rawSizes)) {
        if (typeof size === "string" && SIZES.includes(size as Size)) sizes[key] = size as Size;
      }
      const rawSkins = item.skins && typeof item.skins === "object" && !Array.isArray(item.skins)
        ? item.skins as Record<string, unknown> : {};
      const skins: Record<string, number> = {};
      for (const [key, skin] of Object.entries(rawSkins)) {
        if (typeof skin === "number" && Number.isFinite(skin)) {
          skins[key] = Math.min(SKINS.length - 1, Math.max(0, Math.trunc(skin)));
        }
      }
      result[page] = { order, sizes, skins };
    }
    return result;
  } catch (error) {
    console.warn("[FREEzzz home layout] Saved layout is invalid; using defaults.", error);
    return {};
  }
}
function saveLayouts(layouts: Record<string, Layout>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts)); } catch { /* Storage may be disabled in WebView. */ }
}
function animateReflow(tiles: Tile[], change: () => void) {
  const before = new Map(tiles.map(tile => [tile, tile.getBoundingClientRect()]));
  change();
  for (const tile of tiles) {
    const old = before.get(tile);
    if (!old) continue;
    const next = tile.getBoundingClientRect();
    const dx = old.left - next.left, dy = old.top - next.top;
    if (Math.abs(dx) + Math.abs(dy) < 1 || !tile.animate) continue;
    tile.animate([{ transform: `translate3d(${dx}px,${dy}px,0)` }, { transform: "translate3d(0,0,0)" }],
      { duration: 200, easing: "cubic-bezier(.2,.8,.2,1)" });
  }
}
export function bindHomeGridShift(root: HTMLElement) {
  if (root.dataset.gridShiftBound === "true") return;
  const pages = [...root.querySelectorAll<HTMLElement>("[data-home-screen]")];
  const track = root.querySelector<HTMLElement>("[data-home-screen-track]");
  const pagination = root.querySelector<HTMLElement>("[data-home-pagination]");
  if (pages.length !== 2 || !track || !pagination) return;
  root.dataset.gridShiftBound = "true";
  const layouts = readLayouts();
  let currentPage = 0, editing = false, active: Tile | null = null;
  let holdTimer = 0, suppressClick = false, dragging = false, resizing = false;
  let startX = 0, startY = 0, lastX = 0, lastY = 0;
  let lastSnapshot: Record<string, Layout> | null = null;
  let lastTarget: Tile | null = null;
  const grids = pages.map(page => page.querySelector<HTMLElement>("[data-home-grid]")!);
  const tilesByPage = grids.map(grid => [...grid.children].filter((node): node is Tile => node instanceof HTMLElement && node.hasAttribute("data-portal-block")));
  const snapshot = (): Record<string, Layout> => {
    const copy: Record<string, Layout> = {};
    grids.forEach((grid, index) => {
      copy[String(index)] = {
        order: [...grid.children].filter((node): node is Tile => node instanceof HTMLElement && node.hasAttribute("data-portal-block")).sort((a,b)=>Number(a.style.order||0)-Number(b.style.order||0)).map(keyOf),
        sizes: Object.fromEntries(tilesByPage[index].map(tile => [keyOf(tile), (tile.dataset.gridSize || defaultSizeOf(tile)) as Size])),
        skins: Object.fromEntries(tilesByPage[index].map(tile => [keyOf(tile), Number(tile.dataset.gridSkin || 0)]))
      };
    });
    return copy;
  };
  const commit = () => {
    grids.forEach((grid, index) => {
      const tiles = tilesByPage[index];
      layouts[String(index)] = {
        order: [...tiles].sort((a,b)=>Number(a.style.order||0)-Number(b.style.order||0)).map(keyOf),
        sizes: Object.fromEntries(tiles.map(tile=>[keyOf(tile),(tile.dataset.gridSize||defaultSizeOf(tile)) as Size])),
        skins: Object.fromEntries(tiles.map(tile=>[keyOf(tile),Number(tile.dataset.gridSkin||0)]))
      };
    });
    saveLayouts(layouts);
  };
  const applySkin = (tile: Tile, index: number) => {
    const skin = SKINS[((index % SKINS.length) + SKINS.length) % SKINS.length];
    tile.dataset.gridSkin = String((index % SKINS.length + SKINS.length) % SKINS.length);
    tile.style.setProperty("--home-tile-custom-bg", skin.background);
    tile.style.setProperty("--home-tile-custom-border", skin.border);
    tile.style.setProperty("--home-tile-custom-color", skin.color);
    tile.classList.add("home-tile-custom-skin");
  };
  const setPage = (index: number) => {
    currentPage = Math.max(0, Math.min(pages.length - 1, index));
    track.style.transform = `translate3d(-${currentPage * 100}%,0,0)`;
    pages.forEach((page,i)=>{
      const inactive=i!==currentPage;
      page.setAttribute("aria-hidden",String(inactive));
      page.inert=inactive;
    });
    pagination.querySelectorAll<HTMLButtonElement>("[data-home-page]").forEach((button,i)=>{
      if(i===currentPage)button.setAttribute("aria-current","page"); else button.removeAttribute("aria-current");
    });
    root.dataset.activeHomeScreen = String(currentPage);
  };
  const setEditing = (enabled: boolean, tile: Tile | null = active) => {
    editing = enabled;
    root.classList.toggle("grid-shift-editing", editing);
    root.dataset.gridEditing = String(editing);
    active = tile;
    grids.forEach(grid => {
      grid.querySelectorAll<Tile>("[data-portal-block]").forEach(item => {
        item.setAttribute("aria-grabbed",String(editing && item===active));
        item.querySelector(".grid-shift-resize-handle")?.remove();
        if(editing){
          const handle=document.createElement("button");
          handle.type="button"; handle.className="grid-shift-resize-handle";
          handle.setAttribute("aria-label","Изменить размер блока"); handle.textContent="↘";
          item.append(handle);
        }
      });
    });
    panel.hidden = !editing;
    if (editing) {
      const title = panel.querySelector<HTMLElement>("[data-grid-shift-active]");
      if(title) title.textContent = active ? (active.getAttribute("aria-label") || active.dataset.portalBlock || "Блок") : "Выбери блок";
    } else {
      active?.classList.remove("grid-shift-dragging","grid-shift-resizing");
      active = null;
    }
  };
  const panel=document.createElement("div");
  panel.className="grid-shift-panel";
  panel.hidden=true;
  panel.innerHTML='<span data-grid-shift-active>Блок</span><button type="button" data-grid-shift-size>РАЗМЕР</button><button type="button" data-grid-shift-skin>ФОН</button><button type="button" data-grid-shift-undo>↶</button><button type="button" data-grid-shift-reset>СБРОС</button><button type="button" data-grid-shift-done>ГОТОВО</button>';
  root.append(panel);
  pages.forEach((_page,index)=>{
    const saved=layouts[String(index)];
    const tiles=tilesByPage[index];
    if(saved){
      const byKey=new Map(tiles.map(tile=>[keyOf(tile),tile]));
      const ordered=(saved.order||[]).map(key=>byKey.get(key)).filter((tile):tile is Tile=>Boolean(tile)).concat(tiles.filter(tile=>!(saved.order||[]).includes(keyOf(tile))));
      ordered.forEach((tile,order)=>{tile.style.order=String(order);});
      tiles.forEach(tile=>{
        const size=saved.sizes?.[keyOf(tile)];
        tile.dataset.gridSize=SIZES.includes(size)?size:defaultSizeOf(tile);
        if (typeof saved.skins?.[keyOf(tile)] === "number") applySkin(tile, Number(saved.skins[keyOf(tile)]));
      });
    } else {
      tiles.forEach((tile,order)=>{tile.style.order=String(order);tile.dataset.gridSize=defaultSizeOf(tile);});
    }
  });
  const ordered = (index:number) => [...tilesByPage[index]].sort((a,b)=>Number(a.style.order||0)-Number(b.style.order||0));
  const applyOrder = (list:Tile[]) => list.forEach((tile,i)=>tile.style.order=String(i));
  const targetAt = (x:number,y:number,except:Tile) => {
    for(const tile of tilesByPage[currentPage]){if(tile===except)continue;const r=tile.getBoundingClientRect();if(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom)return tile;}
    return null;
  };
  const resizeByStep = (tile:Tile,step:number) => {
    const size=tile.dataset.gridSize as Size||"m",index=Math.max(0,SIZES.indexOf(size));
    tile.dataset.gridSize=SIZES[(index+step+SIZES.length)%SIZES.length];
  };
  const reorderOver=(tile:Tile,target:Tile)=>{
    const list=ordered(currentPage),from=list.indexOf(tile),to=list.indexOf(target);
    if(from<0||to<0||from===to)return;
    animateReflow(tilesByPage[currentPage],()=>{list.splice(from,1);list.splice(to,0,tile);applyOrder(list);});
  };
  pages.forEach((page,index)=>{
    const tiles=tilesByPage[index];
    tiles.forEach(tile=>{
      tile.addEventListener("pointerdown",event=>{
        if(event.pointerType==="mouse"&&event.button!==0)return;
        const target=event.target as HTMLElement;
        if(editing && index===currentPage && target.closest(".grid-shift-resize-handle")){
          resizing=true;dragging=false;active=tile;lastSnapshot=snapshot();
        }else if(editing && index===currentPage){resizing=false;dragging=false;active=tile;lastSnapshot=snapshot();const title=panel.querySelector<HTMLElement>("[data-grid-shift-active]");if(title)title.textContent=tile.getAttribute("aria-label")||tile.dataset.portalBlock||"Блок";}
        else if(!editing && index===currentPage){
          active=tile;window.clearTimeout(holdTimer);
          holdTimer=window.setTimeout(()=>{suppressClick=true;lastSnapshot=snapshot();setEditing(true,tile);tile.classList.add("grid-shift-dragging");},480);
        }
        startX=lastX=event.clientX;startY=lastY=event.clientY;lastTarget=null;
        try{tile.setPointerCapture(event.pointerId);}catch{}
      });
      tile.addEventListener("pointermove",event=>{
        if(!active||active!==tile)return;
        lastX=event.clientX;lastY=event.clientY;
        if(!editing){if(Math.abs(lastX-startX)+Math.abs(lastY-startY)>12)window.clearTimeout(holdTimer);return;}
        if(!dragging&&!resizing&&Math.abs(lastX-startX)+Math.abs(lastY-startY)>8){dragging=true;tile.classList.add("grid-shift-dragging");}
        if(resizing){
          const delta=(lastX-startX)+(lastY-startY);
          const step=delta>72?1:delta< -72?-1:0;
          if(step){animateReflow(tilesByPage[currentPage],()=>resizeByStep(tile,step));tile.classList.add("grid-shift-resizing");startX=lastX;startY=lastY;}
        }else if(dragging){
          tile.style.setProperty("--grid-drag-x",`${lastX-startX}px`);tile.style.setProperty("--grid-drag-y",`${lastY-startY}px`);
          const target=targetAt(lastX,lastY,tile);if(target&&target!==lastTarget){reorderOver(tile,target);lastTarget=target;}
        }
      });
      const finish=()=>{
        window.clearTimeout(holdTimer);
        if(editing&&active===tile&&(dragging||resizing)){
          tile.classList.remove("grid-shift-dragging","grid-shift-resizing");tile.style.removeProperty("--grid-drag-x");tile.style.removeProperty("--grid-drag-y");
          commit();suppressClick=true;
        }
        dragging=false;resizing=false;lastTarget=null;if(!editing)active=null;
      };
      tile.addEventListener("pointerup",finish);tile.addEventListener("pointercancel",finish);
      tile.addEventListener("click",event=>{
        if(suppressClick){event.preventDefault();event.stopImmediatePropagation();suppressClick=false;return;}
        if(editing){event.preventDefault();event.stopImmediatePropagation();}
      },true);
      tile.addEventListener("contextmenu",event=>{if(editing)event.preventDefault();});
    });
  });
  pagination.querySelectorAll<HTMLButtonElement>("[data-home-page]").forEach(button=>button.addEventListener("click",()=>{if(!editing)setPage(Number(button.dataset.homePage||0));}));
  let swipeStartX=0,swipeStartY=0;
  track.addEventListener("pointerdown",event=>{if(editing)return;swipeStartX=event.clientX;swipeStartY=event.clientY;});
  track.addEventListener("pointerup",event=>{
    if(editing)return;const dx=event.clientX-swipeStartX,dy=event.clientY-swipeStartY;
    if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.25)setPage(currentPage+(dx<0?1:-1));
  });
  track.addEventListener("pointercancel",()=>{swipeStartX=swipeStartY=0;});
  panel.querySelector("[data-grid-shift-size]")?.addEventListener("click",()=>{if(!active)return;lastSnapshot=snapshot();resizeByStep(active,1);commit();});
  panel.querySelector("[data-grid-shift-skin]")?.addEventListener("click",()=>{if(!active)return;lastSnapshot=snapshot();applySkin(active,Number(active.dataset.gridSkin||0)+1);commit();});
  panel.querySelector("[data-grid-shift-undo]")?.addEventListener("click",()=>{if(!lastSnapshot)return;Object.assign(layouts,lastSnapshot);saveLayouts(layouts);lastSnapshot=null;window.location.reload();});
  panel.querySelector("[data-grid-shift-reset]")?.addEventListener("click",()=>{try{localStorage.removeItem(STORAGE_KEY);}catch{};setEditing(false);window.location.reload();});
  panel.querySelector("[data-grid-shift-done]")?.addEventListener("click",()=>{commit();setEditing(false);});
  setPage(0);
}
