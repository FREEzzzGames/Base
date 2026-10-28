import "./world-radio-panel.css";

type RadioPanelLanguage = "RU" | "DE" | "EN";
type WorldStation = {
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  country: string;
  countrycode: string;
  tags: string;
  favicon: string;
  language: string;
  votes: number;
  clickcount: number;
  geo_lat: number | string | null;
  geo_long: number | string | null;
};
type GeoPoint = { lat: number; lng: number; station?: WorldStation };

const TEXT: Record<RadioPanelLanguage, Record<string, string>> = {
  RU: { search: "Поиск станции, жанра или страны…", all: "Все", favorites: "Избранное", recent: "Недавние", popular: "Популярные", regions: "Все регионы", countries: "Все страны", genres: "Все жанры", nearby: "СТАНЦИИ РЯДОМ", trending: "ПОПУЛЯРНОЕ В МИРЕ", seeAll: "ВСЕ ›", map: "Карта мира", globe: "3D-глобус", close: "Закрыть ×", choose: "Выберите станцию", live: "Прямой эфир", loading: "Загрузка каталога радиостанций…", noStations: "Станции не найдены. Измените фильтры.", offline: "Каталог временно недоступен", ready: "ГОТОВ К ВОСПРОИЗВЕДЕНИЮ", playing: "В ЭФИРЕ", failed: "ПОТОК НЕДОСТУПЕН", stop: "Остановить", play: "Воспроизвести", germany: "Германия · открытый каталог", source: "Публичный каталог Radio Browser" },
  DE: { search: "Sender, Genre oder Land suchen…", all: "Alle", favorites: "Favoriten", recent: "Zuletzt", popular: "Beliebt", regions: "Alle Regionen", countries: "Alle Länder", genres: "Alle Genres", nearby: "SENDER IN DER NÄHE", trending: "WELTWEIT BELIEBT", seeAll: "ALLE ›", map: "Weltkarte", globe: "3D-Globus", close: "Schließen ×", choose: "Sender auswählen", live: "Live-Stream", loading: "Radiokatalog wird geladen…", noStations: "Keine Sender gefunden. Filter ändern.", offline: "Katalog momentan nicht verfügbar", ready: "BEREIT", playing: "LIVE", failed: "STREAM NICHT VERFÜGBAR", stop: "Stoppen", play: "Abspielen", germany: "Deutschland · offener Katalog", source: "Öffentlicher Radio-Browser-Katalog" },
  EN: { search: "Search station, genre or country…", all: "All", favorites: "Favorites", recent: "Recent", popular: "Popular", regions: "All regions", countries: "All countries", genres: "All genres", nearby: "STATIONS NEAR YOU", trending: "TRENDING WORLDWIDE", seeAll: "SEE ALL ›", map: "World map", globe: "3D Globe", close: "Close ×", choose: "Choose a station", live: "Live stream", loading: "Loading radio directory…", noStations: "No stations found. Change the filters.", offline: "Directory temporarily unavailable", ready: "READY TO PLAY", playing: "PLAYING LIVE", failed: "STREAM UNAVAILABLE", stop: "Stop", play: "Play", germany: "Germany · live directory", source: "Public Radio Browser directory" }
};

let stations: WorldStation[] = [];
let currentStation: WorldStation | null = null;
let selectedGenre = "";
let selectedCountry = "";
let selectedRegion = "";
let currentView = "all";
let searchText = "";
let loading = false;
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let rotation = 0;
let tilt = -0.08;
let dragging = false;
let lastX = 0;
let lastY = 0;
let mapOpen = false;
let globalListenersBound = false;
let audioStatus = "idle";
const favorites = new Set<string>(readStorage("freezzz:radio:world-favorites", []));
const recentIds: string[] = readStorage("freezzz:radio:world-recent", []);

function readStorage<T>(key: string, fallback: T): T {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; }
}
function t(key: string): string { return TEXT[activeLanguage][key] || TEXT.EN[key] || key; }
let activeLanguage: RadioPanelLanguage = "RU";
function escape(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] || char);
}
function validGeo(s: WorldStation): GeoPoint | null {
  const lat = Number(s.geo_lat), lng = Number(s.geo_long);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && (lat !== 0 || lng !== 0) ? { lat, lng, station: s } : null;
}
function regionOf(country: string): string {
  const c = country.toLowerCase();
  if (/germany|united kingdom|france|italy|spain|poland|ukraine|netherlands|switzerland|austria|belgium|sweden|norway|finland|denmark|portugal|czech|romania|russia|ireland|greece|hungary|croatia|serbia|bulgaria|slovakia|slovenia|lithuania|latvia|estonia|iceland|luxembourg/.test(c)) return "Europe";
  if (/japan|china|india|korea|thailand|indonesia|malaysia|singapore|philippines|vietnam|pakistan|bangladesh|israel|turkey|iran|uae|saudi|taiwan/.test(c)) return "Asia";
  if (/south africa|nigeria|kenya|ghana|egypt|morocco|tunisia|uganda|tanzania|senegal/.test(c)) return "Africa";
  if (/united states|usa|canada|mexico|cuba|jamaica/.test(c)) return "North America";
  if (/brazil|argentina|chile|colombia|peru|ecuador|uruguay|venezuela/.test(c)) return "South America";
  if (/australia|new zealand|fiji/.test(c)) return "Oceania";
  return "Other";
}
function filtered(): WorldStation[] {
  let base = stations;
  if (currentView === "favorites") base = base.filter(s => favorites.has(s.stationuuid));
  if (currentView === "recent") base = recentIds.map(id => stations.find(s => s.stationuuid === id)).filter((s): s is WorldStation => Boolean(s));
  if (currentView === "popular") base = [...stations].sort((a, b) => (b.clickcount || b.votes) - (a.clickcount || a.votes));
  return base.filter(s => {
    const hay = (s.name + " " + s.country + " " + s.tags + " " + s.language).toLowerCase();
    return (!searchText || hay.includes(searchText)) &&
      (!selectedGenre || s.tags.toLowerCase().includes(selectedGenre.toLowerCase())) &&
      (!selectedCountry || s.country === selectedCountry) &&
      (!selectedRegion || regionOf(s.country) === selectedRegion);
  });
}
function stationCard(s: WorldStation, index: number): string {
  const logo = s.favicon ? '<img loading="lazy" src="' + escape(s.favicon) + '" alt="" onerror="this.remove()">' : '<span>' + escape(s.name.split(/\s+/).slice(0, 2).map(x => x.slice(0, 5)).join(" ")) + '</span>';
  const fav = favorites.has(s.stationuuid);
  return '<article class="wr-station" data-wr-station="' + escape(s.stationuuid) + '">' +
    '<button class="wr-fav ' + (fav ? "on" : "") + '" data-wr-fav="' + escape(s.stationuuid) + '" aria-label="Favorite">' + (fav ? "♥" : "♡") + '</button>' +
    '<div class="wr-logo wr-color-' + (index % 5) + '">' + logo + '</div><strong>' + escape(s.name) + '</strong><small>' + escape(s.country || "Worldwide") + '</small>' +
    '<div class="wr-card-bottom"><span class="wr-eq"><i></i><i></i><i></i><i></i><i></i></span><button class="wr-play-mini" data-wr-play="' + escape(s.stationuuid) + '" aria-label="Play">▶</button></div></article>';
}
function renderCards(): void {
  const list = filtered();
  const near = list.filter(s => s.country === "Germany");
  const global = [...list].sort((a, b) => (b.clickcount || b.votes) - (a.clickcount || a.votes));
  const nearList = near.length ? near : list;
  const nearRoot = document.querySelector<HTMLElement>("#wr-near");
  const trendRoot = document.querySelector<HTMLElement>("#wr-trending");
  if (nearRoot) nearRoot.innerHTML = nearList.slice(0, 18).map(stationCard).join("") || '<div class="wr-empty">' + escape(t("noStations")) + '</div>';
  if (trendRoot) trendRoot.innerHTML = global.slice(0, 18).map(stationCard).join("") || '<div class="wr-empty">' + escape(t("noStations")) + '</div>';
  const count = document.querySelector<HTMLElement>("#wr-count");
  if (count) count.textContent = stations.length.toLocaleString() + " STATIONS";
  drawGlobe();
}
function setPlayer(station: WorldStation): void {
  currentStation = station;
  const name = document.querySelector<HTMLElement>("#wr-player-name");
  const country = document.querySelector<HTMLElement>("#wr-player-country");
  const track = document.querySelector<HTMLElement>("#wr-player-track");
  const cover = document.querySelector<HTMLElement>("#wr-player-cover");
  if (name) name.textContent = station.name;
  if (country) country.textContent = station.country || "Worldwide";
  if (track) track.textContent = station.tags.split(",").slice(0, 3).join(" · ") || t("live");
  if (cover) cover.innerHTML = station.favicon ? '<img src="' + escape(station.favicon) + '" alt="" onerror="this.remove()">' : "♫";
  const status = document.querySelector<HTMLElement>("#wr-player-status");
  if (status) status.textContent = "CONNECTING…";
  const detail = { stationuuid: station.stationuuid, name: station.name, url: station.url, url_resolved: station.url_resolved || station.url, country: station.country || "" };
  window.dispatchEvent(new CustomEvent("freezzz:radio-select", { detail }));
  recentIds.splice(0, recentIds.length, station.stationuuid, ...recentIds.filter(id => id !== station.stationuuid));
  recentIds.splice(30);
  try { localStorage.setItem("freezzz:radio:world-recent", JSON.stringify(recentIds)); } catch {}
}
function toggleFavorite(id: string): void {
  if (favorites.has(id)) favorites.delete(id); else favorites.add(id);
  try { localStorage.setItem("freezzz:radio:world-favorites", JSON.stringify([...favorites])); } catch {}
  renderCards();
}
function renderMap(): void {
  const panel = document.querySelector<HTMLElement>("#wr-map-panel");
  if (!panel) return;
  panel.hidden = !mapOpen;
  if (mapOpen) {
    const status = panel.querySelector<HTMLElement>("[data-radio-status]");
    if (status) status.textContent = "LOADING MAP…";
    window.dispatchEvent(new CustomEvent("freezzz:radio-map-open"));
  }
}
function globeProject(lon: number, lat: number, r: number, cx: number, cy: number): { x: number; y: number; z: number } {
  const lo = lon * Math.PI / 180 + rotation, la = lat * Math.PI / 180;
  const x3 = Math.cos(la) * Math.sin(lo);
  const y3 = Math.sin(la) * Math.cos(tilt) - Math.cos(la) * Math.cos(lo) * Math.sin(tilt);
  const z3 = Math.sin(la) * Math.sin(tilt) + Math.cos(la) * Math.cos(lo) * Math.cos(tilt);
  return { x: cx + x3 * r, y: cy - y3 * r, z: z3 };
}
const LAND: number[][][] = [
  [[-168,72],[-140,70],[-125,55],[-130,45],[-118,30],[-97,15],[-82,8],[-78,25],[-62,45],[-80,58],[-105,72]],
  [[-81,12],[-68,8],[-50,-5],[-36,-18],[-48,-42],[-66,-55],[-76,-28]],
  [[-53,82],[-22,78],[-20,60],[-45,58],[-60,68]],
  [[-12,72],[20,72],[45,58],[60,48],[42,35],[34,15],[20,-5],[8,-35],[-8,-35],[-18,-5],[-5,15],[-17,35],[-10,52]],
  [[35,72],[70,75],[110,62],[150,55],[170,45],[145,30],[120,10],[100,0],[80,8],[60,25],[45,38],[35,55]],
  [[112,-11],[154,-10],[153,-40],[132,-45],[115,-30]],
  [[43,-13],[51,-16],[49,-26],[43,-25]]
];
function landAt(lon: number, lat: number, poly: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (((yi > lat) !== (yj > lat)) && lon < (xj - xi) * (lat - yi) / (yj - yi + 1e-9) + xi) inside = !inside;
  }
  return inside;
}
function initGlobe(): void {
  const host = document.querySelector<HTMLElement>("#wr-globe");
  if (!host || host.dataset.ready === "1") return;
  host.dataset.ready = "1";
  host.innerHTML = '<canvas id="wr-globe-canvas" aria-label="Interactive world globe"></canvas>';
  canvas = host.querySelector("canvas");
  ctx = canvas?.getContext("2d") || null;
  if (!canvas || !ctx) return;
  const down = (e: PointerEvent) => { dragging = true; lastX = e.clientX; lastY = e.clientY; host.setPointerCapture?.(e.pointerId); };
  const move = (e: PointerEvent) => { if (!dragging) return; rotation += (e.clientX - lastX) * 0.008; tilt = Math.max(-0.4, Math.min(0.4, tilt + (e.clientY - lastY) * 0.003)); lastX = e.clientX; lastY = e.clientY; drawGlobe(); };
  const up = () => { dragging = false; };
  host.addEventListener("pointerdown", down); host.addEventListener("pointermove", move); host.addEventListener("pointerup", up); host.addEventListener("pointercancel", up);
  host.addEventListener("click", e => {
    const rect = canvas!.getBoundingClientRect(), sx = canvas!.width / Math.max(1, rect.width), sy = canvas!.height / Math.max(1, rect.height);
    const x = (e as MouseEvent).clientX ? ((e as MouseEvent).clientX - rect.left) * sx : -999;
    const y = (e as MouseEvent).clientY ? ((e as MouseEvent).clientY - rect.top) * sy : -999;
    const w = canvas!.width, h = canvas!.height, r = Math.min(w, h) * 0.46, cx = w / 2, cy = h / 2;
    const hit = stations.filter(s => validGeo(s)).map(s => { const g = validGeo(s)!; return { s, p: globeProject(g.lng, g.lat, r, cx, cy) }; }).find(v => v.p.z > 0 && Math.hypot(v.p.x - x, v.p.y - y) < Math.max(10, w * 0.025));
    if (hit) setPlayer(hit.s);
  });
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(drawGlobe).observe(host);
  drawGlobe();
}
function drawGlobe(): void {
  if (!canvas || !ctx) return;
  const host = canvas.parentElement;
  if (!host) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2), size = Math.max(160, Math.floor(Math.min(host.clientWidth || 280, host.clientHeight || 280)));
  if (canvas.width !== Math.floor(size * dpr) || canvas.height !== Math.floor(size * dpr)) { canvas.width = Math.floor(size * dpr); canvas.height = Math.floor(size * dpr); }
  const w = canvas.width, h = canvas.height, r = Math.min(w, h) * 0.46, cx = w / 2, cy = h / 2, step = Math.max(5.5, w / 74);
  ctx.clearRect(0, 0, w, h);
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
  const bg = ctx.createRadialGradient(cx-r*.35,cy-r*.42,r*.05,cx,cy,r*1.2); bg.addColorStop(0,"#143044"); bg.addColorStop(.62,"#071722"); bg.addColorStop(1,"#02080e"); ctx.fillStyle=bg; ctx.fillRect(0,0,w,h);
  ctx.strokeStyle="rgba(90,135,158,.16)"; ctx.lineWidth=Math.max(1,w/500);
  for(let lat=-60;lat<=60;lat+=20){ctx.beginPath();let started=false;for(let lon=-180;lon<=180;lon+=3){const p=globeProject(lon,lat,r,cx,cy);if(p.z>0){if(!started){ctx.moveTo(p.x,p.y);started=true;}else ctx.lineTo(p.x,p.y);}else started=false;}ctx.stroke();}
  for(let lon=-180;lon<180;lon+=30){ctx.beginPath();let started=false;for(let lat=-88;lat<=88;lat+=2){const p=globeProject(lon,lat,r,cx,cy);if(p.z>0){if(!started){ctx.moveTo(p.x,p.y);started=true;}else ctx.lineTo(p.x,p.y);}else started=false;}ctx.stroke();}
  for(let lat=-78;lat<=78;lat+=3.7){for(let lon=-180;lon<180;lon+=3.7){const p=globeProject(lon,lat,r,cx,cy);if(p.z<.04)continue;const land=LAND.some(poly=>landAt(lon,lat,poly));ctx.beginPath();ctx.arc(p.x,p.y,land?step*.25:step*.18,0,Math.PI*2);ctx.fillStyle=land?"rgba(255,181,112,.78)":"rgba(91,132,153,.28)";ctx.fill();}}
  stations.filter(s=>validGeo(s)).slice(0,250).forEach(s=>{const g=validGeo(s)!;const p=globeProject(g.lng,g.lat,r,cx,cy);if(p.z<=0)return;const rr=Math.max(2.4,w/125);ctx.beginPath();ctx.arc(p.x,p.y,rr*3,0,Math.PI*2);ctx.fillStyle="rgba(255,123,36,.12)";ctx.fill();ctx.beginPath();ctx.arc(p.x,p.y,rr,0,Math.PI*2);ctx.fillStyle="#ff862d";ctx.shadowColor="#ff7827";ctx.shadowBlur=rr*5;ctx.fill();ctx.shadowBlur=0;});
  const shade=ctx.createRadialGradient(cx-r*.22,cy-r*.25,r*.25,cx,cy,r*1.15);shade.addColorStop(0,"rgba(0,0,0,0)");shade.addColorStop(.72,"rgba(0,0,0,.03)");shade.addColorStop(1,"rgba(0,0,0,.72)");ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);
  ctx.restore();ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.strokeStyle="rgba(110,157,183,.65)";ctx.lineWidth=Math.max(1.5,w/230);ctx.shadowColor="#5e8da7";ctx.shadowBlur=w/70;ctx.stroke();ctx.shadowBlur=0;
}
async function loadDirectory(): Promise<void> {
  if (loading) return;
  loading = true;
  setStatus(t("loading"));
  const servers = ["https://de1.api.radio-browser.info", "https://nl1.api.radio-browser.info", "https://at1.api.radio-browser.info"];
  let error: unknown;
  for (const server of servers) {
    try {
      const response = await fetch(server + "/json/stations/search?hidebroken=true&has_geo_info=true&is_https=true&order=clickcount&reverse=true&limit=1200", { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(14000) });
      if (!response.ok) throw new Error("Radio Browser HTTP " + response.status);
      stations = (await response.json() as WorldStation[]).filter(s => s.stationuuid && s.name && (s.url_resolved || s.url) && s.lastcheckok !== 0);
      const country = document.querySelector<HTMLSelectElement>("#wr-country");
      if (country) country.innerHTML = '<option value="">' + escape(t("countries")) + '</option>' + [...new Set(stations.map(s => s.country).filter(Boolean))].sort().map(c => '<option value="' + escape(c) + '">' + escape(c) + '</option>').join("");
      renderCards(); setStatus(stations.length.toLocaleString() + " " + t("source"));
      loading = false; return;
    } catch (e) { error = e; }
  }
  loading = false; setStatus(t("offline")); renderCards();
  console.warn("[World Radio] Directory unavailable", error);
}
function setStatus(value: string): void { const el = document.querySelector<HTMLElement>("#wr-global-status"); if (el) el.textContent = value; }
function setView(value: string): void {
  currentView = value;
  document.querySelectorAll<HTMLButtonElement>("[data-wr-view]").forEach(b => b.classList.toggle("active", b.dataset.wrView === value));
  renderCards();
}
export function renderWorldRadioPanel(language: RadioPanelLanguage = "RU"): string {
  activeLanguage = language;
  const text = TEXT[language];
  return '<section class="content portal-layout radio-portal wr-panel" data-portal-layout="radio" data-world-radio-panel aria-label="World Radio">' +
    '<header class="wr-header"><div class="wr-brand"><span class="wr-brand-icon">♧</span><div><strong>WORLD <em>RADIO</em></strong><small>LIVE STATIONS ONLINE</small></div></div>' +
    '<label class="wr-search"><span>⌕</span><input id="wr-search" type="search" placeholder="' + escape(text.search) + '" autocomplete="off"></label><button class="wr-settings" type="button" data-wr-settings aria-label="Settings">⚙</button></header>' +
    '<div class="wr-hero"><nav class="wr-side-nav">' +
    '<button data-wr-view="all" class="active"><span>◎</span>' + escape(text.all) + '</button><button data-wr-view="favorites"><span>☆</span>' + escape(text.favorites) + '</button><button data-wr-view="recent"><span>◷</span>' + escape(text.recent) + '</button><button data-wr-view="popular"><span>♡</span>' + escape(text.popular) + '</button></nav>' +
    '<div class="wr-globe-wrap"><div id="wr-globe"></div><span>DRAG TO ROTATE · TAP STATION</span></div>' +
    '<div class="wr-filters"><label><span>◎</span><select id="wr-region" aria-label="Region"><option value="">' + escape(text.regions) + '</option><option>Europe</option><option>Asia</option><option>Africa</option><option>North America</option><option>South America</option><option>Oceania</option></select></label>' +
    '<label><span>⌖</span><select id="wr-country" aria-label="Country"><option value="">' + escape(text.countries) + '</option></select></label>' +
    '<label><span>▥</span><select id="wr-genre" aria-label="Genre"><option value="">' + escape(text.genres) + '</option><option value="pop">Pop</option><option value="rock">Rock</option><option value="electronic">Electronic</option><option value="jazz">Jazz</option><option value="classical">Classical</option><option value="chill">Chill</option><option value="news">News</option><option value="talk">Talk</option></select></label></div></div>' +
    '<div class="wr-genres">' + [['','♫','All','#ff8b35'],['pop','◖','Pop','#1ca8ff'],['rock','◆','Rock','#ff5967'],['electronic','◎','Electronic','#a45cff'],['jazz','♫','Jazz','#ffb13b'],['classical','▥','Classic','#16ded0'],['chill','♧','Chill','#00dfa8'],['news','♩','News','#249cff']].map(([value,icon,label,color]) => '<button class="wr-genre ' + (!value ? "active" : "") + '" data-wr-genre="' + value + '" style="--wr-accent:' + color + '"><span>' + icon + '</span>' + escape(label) + '</button>').join("") + '</div>' +
    '<section class="wr-section"><header><div><strong>' + escape(text.nearby) + '</strong><small id="wr-location">' + escape(text.germany) + '</small></div><button data-wr-see="near">' + escape(text.seeAll) + '</button></header><div class="wr-station-row" id="wr-near"><p class="wr-empty">' + escape(text.loading) + '</p></div></section>' +
    '<section class="wr-section"><header><strong>' + escape(text.trending) + '</strong><button data-wr-see="trending">' + escape(text.seeAll) + '</button></header><div class="wr-station-row" id="wr-trending"><p class="wr-empty">' + escape(text.loading) + '</p></div></section>' +
    '<section class="wr-player"><div class="wr-cover" id="wr-player-cover">♫</div><div class="wr-player-info"><strong id="wr-player-name">' + escape(text.choose) + '</strong><small id="wr-player-country">WORLDWIDE</small><span id="wr-player-track">' + escape(text.live) + '</span><div class="wr-progress"><i></i></div><small id="wr-player-status">' + escape(text.ready) + '</small></div>' +
    '<div class="wr-controls"><button data-wr-previous aria-label="Previous">|◀</button><button class="wr-main-play" data-wr-main-play aria-label="Play or pause">▶</button><button data-wr-next aria-label="Next">▶|</button></div><label class="wr-volume">◖<input data-wr-volume type="range" min="0" max="1" step=".05" value=".8" aria-label="Volume"></label></section>' +
    '<section class="wr-map-modal" id="wr-map-panel" hidden><div class="wr-map-head"><div><strong>' + escape(text.map) + '</strong><small data-radio-count>STATION MAP</small></div><button type="button" data-wr-map-close>' + escape(text.close) + '</button></div>' +
    '<section class="radio-map-only wr-map-live" data-radio-map-root aria-label="World radio station map"><div class="radio-map-canvas" id="radio-world-map"></div><div class="radio-map-top"><input class="radio-map-search" data-radio-search type="search" placeholder="' + escape(text.search) + '" aria-label="Search station or country" autocomplete="off"><span class="radio-map-count" data-radio-count>LOADING</span></div>' +
    '<div class="radio-map-player"><div class="radio-map-player-info"><span class="radio-map-live-dot"></span><div class="radio-map-station-text"><strong data-radio-station>' + escape(text.choose) + '</strong><small data-radio-country>WORLDWIDE</small></div></div><span class="radio-map-status" data-radio-status>LOADING WORLD RADIO…</span><div class="radio-map-player-controls"><button type="button" data-radio-play aria-label="Play or pause">▶</button><button type="button" data-radio-stop aria-label="Stop">■</button></div></div></section></section>' +
    '<footer class="wr-footer"><span class="wr-live-dot"></span><span id="wr-global-status">' + escape(text.loading) + '</span><button data-wr-map-open type="button">' + escape(text.map) + '</button><button data-wr-global-play type="button">▶</button></footer></section>';
}
export function bindWorldRadioPanel(openMap: () => void): void {
  const root = document.querySelector<HTMLElement>("[data-world-radio-panel]");
  if (!root || root.dataset.bound === "1") return;
  root.dataset.bound = "1";
  initGlobe();
  const search = root.querySelector<HTMLInputElement>("#wr-search");
  search?.addEventListener("input", () => { searchText = search.value.trim().toLowerCase(); renderCards(); });
  root.querySelectorAll<HTMLButtonElement>("[data-wr-view]").forEach(b => b.addEventListener("click", () => setView(b.dataset.wrView || "all")));
  root.querySelectorAll<HTMLButtonElement>("[data-wr-genre]").forEach(b => b.addEventListener("click", () => {
    selectedGenre = b.dataset.wrGenre || "";
    root.querySelectorAll("[data-wr-genre]").forEach(x => x.classList.toggle("active", x === b));
    const select = root.querySelector<HTMLSelectElement>("#wr-genre"); if (select) select.value = selectedGenre;
    renderCards();
  }));
  root.querySelector<HTMLSelectElement>("#wr-genre")?.addEventListener("change", e => { selectedGenre = (e.currentTarget as HTMLSelectElement).value; root.querySelectorAll<HTMLButtonElement>("[data-wr-genre]").forEach(b => b.classList.toggle("active", (b.dataset.wrGenre || "") === selectedGenre)); renderCards(); });
  root.querySelector<HTMLSelectElement>("#wr-country")?.addEventListener("change", e => { selectedCountry = (e.currentTarget as HTMLSelectElement).value; renderCards(); });
  root.querySelector<HTMLSelectElement>("#wr-region")?.addEventListener("change", e => { selectedRegion = (e.currentTarget as HTMLSelectElement).value; renderCards(); });
  root.addEventListener("click", e => {
    const target = e.target as HTMLElement;
    const fav = target.closest<HTMLElement>("[data-wr-fav]");
    if (fav) { e.preventDefault(); e.stopPropagation(); toggleFavorite(fav.dataset.wrFav || ""); return; }
    const play = target.closest<HTMLElement>("[data-wr-play]");
    if (play) { e.preventDefault(); e.stopPropagation(); const s = stations.find(x => x.stationuuid === play.dataset.wrPlay); if (s) setPlayer(s); return; }
    const card = target.closest<HTMLElement>("[data-wr-station]");
    if (card) { const s = stations.find(x => x.stationuuid === card.dataset.wrStation); if (s) setPlayer(s); return; }
    const see = target.closest<HTMLElement>("[data-wr-see]");
    if (see) { const el = see.dataset.wrSee === "near" ? root.querySelector("#wr-near") : root.querySelector("#wr-trending"); el?.scrollIntoView({ behavior: "smooth", block: "center" }); }
  });
  root.querySelector<HTMLButtonElement>("[data-wr-map-open]")?.addEventListener("click", () => { mapOpen = true; renderMap(); openMap(); });
  root.querySelector<HTMLButtonElement>("[data-wr-map-close]")?.addEventListener("click", () => { mapOpen = false; renderMap(); });
  root.querySelector<HTMLButtonElement>("[data-wr-main-play]")?.addEventListener("click", () => window.dispatchEvent(new CustomEvent("freezzz:radio-mini", { detail: { action: "play" } })));
  root.querySelector<HTMLButtonElement>("[data-wr-global-play]")?.addEventListener("click", () => window.dispatchEvent(new CustomEvent("freezzz:radio-mini", { detail: { action: "play" } })));
  root.querySelector<HTMLButtonElement>("[data-wr-previous]")?.addEventListener("click", () => cycleStation(-1));
  root.querySelector<HTMLButtonElement>("[data-wr-next]")?.addEventListener("click", () => cycleStation(1));
  root.querySelector<HTMLInputElement>("[data-wr-volume]")?.addEventListener("input", e => window.dispatchEvent(new CustomEvent("freezzz:radio-volume", { detail: { volume: Number((e.currentTarget as HTMLInputElement).value) } })));
  if (!globalListenersBound) {
    globalListenersBound = true;
    window.addEventListener("freezzz:radio-status", e => {
      const activeRoot = document.querySelector<HTMLElement>("[data-world-radio-panel]");
      if (!activeRoot) return;
      const detail = (e as CustomEvent<{ status?: string; station?: string }>).detail || {};
      audioStatus = detail.status || "idle";
      const status = activeRoot.querySelector<HTMLElement>("#wr-player-status");
      if (status) status.textContent = audioStatus === "playing" ? t("playing") : audioStatus === "failed" ? t("failed") : audioStatus === "loading" ? "CONNECTING…" : audioStatus === "paused" ? "PAUSED" : t("ready");
      const button = activeRoot.querySelector<HTMLButtonElement>("[data-wr-main-play]");
      if (button) button.textContent = audioStatus === "playing" || audioStatus === "loading" ? "Ⅱ" : "▶";
    });
    window.addEventListener("freezzz:radio-select", e => {
      const activeRoot = document.querySelector<HTMLElement>("[data-world-radio-panel]");
      if (!activeRoot) return;
      const d = (e as CustomEvent<{ stationuuid?: string }>).detail;
      const s = stations.find(x => x.stationuuid === d?.stationuuid);
      if (s) {
        currentStation = s;
        const name = activeRoot.querySelector<HTMLElement>("#wr-player-name");
        if (name) name.textContent = s.name;
      }
    });
  }
  void loadDirectory();
}
function cycleStation(direction: number): void {
  const list = filtered();
  if (!list.length) return;
  const index = currentStation ? list.findIndex(s => s.stationuuid === currentStation!.stationuuid) : -1;
  setPlayer(list[(index + direction + list.length) % list.length]);
}
