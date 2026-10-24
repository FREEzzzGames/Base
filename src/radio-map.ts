import "./radio-map.css";
type RadioStation = {
  stationuuid: string; name: string; url: string; url_resolved?: string;
  country?: string; geo_lat?: number | string | null; geo_long?: number | string | null;
  favicon?: string; tags?: string; lastcheckok?: number;
};

type MapLibreMap = any;
declare global { interface Window { maplibregl?: any; } }

const MAPLIBRE_JS = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js";
const MAPLIBRE_CSS = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css";
let loadPromise: Promise<void> | null = null;
let activeMap: MapLibreMap | null = null;
let activeRoot: HTMLElement | null = null;
let stationCache: RadioStation[] = [];

function loadMapLibre(): Promise<void> {
  if (window.maplibregl) return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-radio-maplibre]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet"; link.href = MAPLIBRE_CSS; link.dataset.radioMaplibre = "1";
      document.head.appendChild(link);
    }
    const existing = document.querySelector<HTMLScriptElement>('script[data-radio-maplibre]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Map library failed to load")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = MAPLIBRE_JS; script.async = true; script.dataset.radioMaplibre = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Map library failed to load"));
    document.head.appendChild(script);
  });
  return loadPromise;
}

async function fetchStations(): Promise<RadioStation[]> {
  if (stationCache.length) return stationCache;
  const servers = ["https://de1.api.radio-browser.info", "https://nl1.api.radio-browser.info", "https://at1.api.radio-browser.info"];
  let lastError: unknown;
  for (const server of servers) {
    try {
      const response = await fetch(server + "/json/stations/search?hidebroken=true&has_geo_info=true&is_https=true&order=clickcount&reverse=true&limit=8000", {
        headers: { Accept: "application/json" }, signal: AbortSignal.timeout(16000)
      });
      if (!response.ok) throw new Error("Radio Browser HTTP " + response.status);
      const rows = await response.json() as RadioStation[];
      stationCache = rows.filter(s => s.stationuuid && s.name && (s.url_resolved || s.url) &&
        Number.isFinite(Number(s.geo_lat)) && Number.isFinite(Number(s.geo_long)) &&
        Math.abs(Number(s.geo_lat)) <= 90 && Math.abs(Number(s.geo_long)) <= 180 &&
        s.lastcheckok !== 0);
      return stationCache;
    } catch (error) { lastError = error; }
  }
  throw lastError instanceof Error ? lastError : new Error("Radio Browser is unavailable");
}

function featureCollection(rows: RadioStation[]) {
  return {
    type: "FeatureCollection",
    features: rows.map(s => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [Number(s.geo_long), Number(s.geo_lat)] },
      properties: { id: s.stationuuid, name: s.name, country: s.country || "", url: s.url_resolved || s.url, favicon: s.favicon || "" }
    }))
  };
}

function playStation(station: RadioStation, root: HTMLElement) {
  const name = root.querySelector<HTMLElement>("[data-radio-station]");
  const country = root.querySelector<HTMLElement>("[data-radio-country]");
  const status = root.querySelector<HTMLElement>("[data-radio-status]");
  const play = root.querySelector<HTMLButtonElement>("[data-radio-play]");
  if (name) name.textContent = station.name;
  if (country) country.textContent = station.country || "Worldwide";
  if (status) status.textContent = "CONNECTING…";
  if (play) play.textContent = "Ⅱ";
  try {
    localStorage.setItem("freezzz:radio:selected", station.stationuuid);
    localStorage.setItem("freezzz:radio:selected-station", JSON.stringify({
      stationuuid: station.stationuuid, name: station.name, url: station.url,
      url_resolved: station.url_resolved || station.url, country: station.country || ""
    }));
  } catch {}
  window.dispatchEvent(new CustomEvent("freezzz:radio-select", { detail: {
    stationuuid: station.stationuuid, name: station.name, url: station.url,
    url_resolved: station.url_resolved || station.url, country: station.country || ""
  }}));
}

window.addEventListener("freezzz:radio-status", event => {
  const detail = (event as CustomEvent<{status?: string; station?: string}>).detail;
  const root = activeRoot;
  if (!root) return;
  const status = root.querySelector<HTMLElement>("[data-radio-status]");
  const name = root.querySelector<HTMLElement>("[data-radio-station]");
  const play = root.querySelector<HTMLButtonElement>("[data-radio-play]");
  if (status) status.textContent = (detail?.status || "idle").toUpperCase();
  if (detail?.station && name) name.textContent = detail.station;
  if (play) play.textContent = detail?.status === "playing" || detail?.status === "loading" ? "Ⅱ" : "▶";
});

export function mountRadioMap(): void {
  const root = document.querySelector<HTMLElement>("[data-radio-map-root]");
  if (!root || root === activeRoot) return;
  activeRoot = root;
  const mapNode = root.querySelector<HTMLElement>("#radio-world-map");
  if (!mapNode) return;

  const status = root.querySelector<HTMLElement>("[data-radio-status]");
  const search = root.querySelector<HTMLInputElement>("[data-radio-search]");
  const count = root.querySelector<HTMLElement>("[data-radio-count]");
  const selected = root.querySelector<HTMLElement>("[data-radio-station]");
  const country = root.querySelector<HTMLElement>("[data-radio-country]");
  const play = root.querySelector<HTMLButtonElement>("[data-radio-play]");
  const mute = root.querySelector<HTMLButtonElement>("[data-radio-stop]");
  const emptyState = (message: string) => { if (status) status.textContent = message; };

  void (async () => {
    try {
      emptyState("LOADING WORLD RADIO…");
      await loadMapLibre();
      if (!activeRoot || activeRoot !== root || !window.maplibregl) return;
      const maplibre = window.maplibregl;
      const map: MapLibreMap = new maplibre.Map({
        container: mapNode,
        center: [10, 24],
        zoom: 1.25,
        minZoom: 1,
        maxZoom: 15,
        attributionControl: false,
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution: "© OpenStreetMap contributors"
            }
          },
          layers: [{ id: "osm", type: "raster", source: "osm", paint: { "raster-saturation": -0.65, "raster-contrast": 0.15, "raster-brightness-min": 0.02, "raster-brightness-max": 0.8 } }]
        }
      });
      activeMap = map;
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
      map.on("load", async () => {
        try {
          const rows = await fetchStations();
          if (activeRoot !== root) return;
          map.addSource("radio-stations", { type: "geojson", data: featureCollection(rows), cluster: true, clusterRadius: 42, clusterMaxZoom: 13 });
          map.addLayer({ id: "radio-clusters", type: "circle", source: "radio-stations", filter: ["has", "point_count"], paint: {
            "circle-color": "#0b857c", "circle-radius": ["step", ["get", "point_count"], 13, 30, 17, 150, 22, 700, 28],
            "circle-stroke-color": "#8affed", "circle-stroke-width": 1.5, "circle-opacity": 0.88
          }});
          map.addLayer({ id: "radio-cluster-count", type: "symbol", source: "radio-stations", filter: ["has", "point_count"], layout: {
            "text-field": ["get", "point_count_abbreviated"], "text-size": 11, "text-font": ["Open Sans Bold"]
          }, paint: { "text-color": "#ffffff" }});
          map.addLayer({ id: "radio-points", type: "circle", source: "radio-stations", filter: ["!", ["has", "point_count"]], paint: {
            "circle-color": "#66fcf1", "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 2.5, 7, 5],
            "circle-stroke-color": "#071012", "circle-stroke-width": 1, "circle-opacity": 0.9
          }});
          map.on("click", "radio-clusters", (event: any) => {
            const feature = map.queryRenderedFeatures(event.point, { layers: ["radio-clusters"] })[0];
            if (!feature) return;
            const source = map.getSource("radio-stations");
            source.getClusterExpansionZoom(feature.properties.cluster_id, (error: unknown, zoom: number) => {
              if (!error) map.easeTo({ center: feature.geometry.coordinates, zoom: zoom + 0.5 });
            });
          });
          map.on("click", "radio-points", (event: any) => {
            const feature = map.queryRenderedFeatures(event.point, { layers: ["radio-points"] })[0];
            if (!feature) return;
            const station = rows.find(s => s.stationuuid === feature.properties.id);
            if (station) playStation(station, root);
          });
          for (const layer of ["radio-clusters", "radio-points"]) {
            map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
            map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
          }
          if (count) count.textContent = rows.length.toLocaleString() + " STATIONS";
          emptyState("SELECT A DOT TO LISTEN");
          const savedId = (() => { try { return localStorage.getItem("freezzz:radio:selected") || ""; } catch { return ""; } })();
          const saved = rows.find(s => s.stationuuid === savedId);
          if (saved && selected && country) {
            selected.textContent = saved.name; country.textContent = saved.country || "Worldwide";
          }
          search?.addEventListener("input", () => {
            const query = (search.value || "").trim().toLocaleLowerCase();
            const filtered = query ? rows.filter(s => (s.name + " " + (s.country || "") + " " + (s.tags || "")).toLocaleLowerCase().includes(query)).slice(0, 2500) : rows;
            const source = map.getSource("radio-stations");
            if (source) source.setData(featureCollection(filtered));
            if (count) count.textContent = filtered.length.toLocaleString() + " STATIONS";
          });
          search?.addEventListener("keydown", (event: KeyboardEvent) => {
            if (event.key !== "Enter" || !search.value.trim()) return;
            const query = search.value.trim().toLocaleLowerCase();
            const station = rows.find(s => (s.name + " " + (s.country || "")).toLocaleLowerCase().includes(query));
            if (!station) return;
            map.flyTo({ center: [Number(station.geo_long), Number(station.geo_lat)], zoom: 8 });
            playStation(station, root);
          });
          play?.addEventListener("click", () => {
            window.dispatchEvent(new CustomEvent("freezzz:radio-mini", { detail: { action: "play" } }));
          });
          mute?.addEventListener("click", () => {
            window.dispatchEvent(new CustomEvent("freezzz:radio-mini", { detail: { action: "stop" } }));
          });
          map.resize();
        } catch (error) {
          emptyState("RADIO DATA UNAVAILABLE — RETRY LATER");
          console.error("[FREEzzz radio map]", error);
        }
      });
    } catch (error) {
      emptyState("MAP LIBRARY UNAVAILABLE");
      console.error("[FREEzzz radio map]", error);
    }
  })();
}
