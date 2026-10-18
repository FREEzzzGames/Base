import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const html = await readFile(new URL("../public/earth-control.html", import.meta.url), "utf8");
const main = await readFile(new URL("../src/main.ts", import.meta.url), "utf8");
const css = await readFile(new URL("../src/earth-control.css", import.meta.url), "utf8");

assert.ok(html.includes("<title>PLANET EARTH CONTROL DECK</title>"), "dashboard title missing");
const panelIds = [...html.matchAll(/data-panel="([^"]+)"/g)].map(match => match[1]).filter(id => !id.includes("'+"));
assert.deepEqual(panelIds, ["earth", "stars", "weather", "orbit", "video", "earthdata", "moon", "satellites"], "expected eight standalone dashboard panels");
const idList = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
const duplicates = idList.filter((id, index) => idList.indexOf(id) !== index);
assert.deepEqual(duplicates, [], "duplicate HTML ids found");
const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(match => match[1]);
assert.equal(inlineScripts.length, 1, "expected one inline dashboard runtime");
new vm.Script(inlineScripts[0], { filename: "earth-control.inline.js" });
const js = inlineScripts[0];
const refs = [...js.matchAll(/\$\(["']([^"']+)["']\)/g)].map(match => match[1]);
const missing = [...new Set(refs.filter(id => !idList.includes(id)))];
assert.deepEqual(missing, [], "dashboard runtime references missing DOM ids");
for (const endpoint of [
  "api.open-meteo.com/v1/forecast",
  "air-quality-api.open-meteo.com/v1/air-quality",
  "api.wheretheiss.at/v1/satellites/25544",
  "earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson",
  "eonet.gsfc.nasa.gov/api/v3/events",
  "services.swpc.noaa.gov/json/planetary_k_index_1m.json",
  "celestrak.org/NORAD/elements/gp.php?GROUP=STATIONS&FORMAT=JSON"
]) assert.ok(html.includes(endpoint), "missing live data endpoint: " + endpoint);
assert.ok(html.includes("youtube-nocookie.com/embed/") && html.includes("www.nasa.gov/live/"), "NASA video or fallback links missing");
assert.ok(html.includes('id="refresh"') && html.includes('id="font-up"') && html.includes('id="font-down"') && html.includes('id="landscape"'), "dashboard controls missing");
assert.ok(css.includes(".earth-module") && css.includes("repeat(7,minmax(0,1fr))"), "independent portal layout styles missing");
assert.ok(main.includes('if(view==="earth")') && main.includes('homeCard("earth")'), "portal route or HOME entry missing");
console.log("EARTH_CONTROL_SMOKE_OK", JSON.stringify({ panels: panelIds.length, uniqueIds: idList.length, runtimeRefs: refs.length, endpoints: 7 }));
