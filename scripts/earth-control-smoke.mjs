import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const html = await readFile(new URL("../public/earth-control.html", import.meta.url), "utf8");
const main = await readFile(new URL("../src/main.ts", import.meta.url), "utf8");
const css = await readFile(new URL("../src/earth-control.css", import.meta.url), "utf8");
const blueprint = await readFile(new URL("../public/orbit-blueprint.html", import.meta.url), "utf8");

assert.ok(html.includes("<title>PLANET EARTH CONTROL DECK</title>"), "dashboard title missing");
const panelIds = [...html.matchAll(/data-panel="([^"]+)"/g)].map(match => match[1]).filter(id => !id.includes("'+"));
assert.deepEqual(panelIds, ["earth", "stars", "weather", "orbit", "video", "earthdata", "moon", "satellites"], "expected original eight dashboard panels");
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
assert.ok(main.includes('module.requestFullscreen()'), "Earth landscape must fullscreen only the monitor module");
assert.ok(!main.includes('document.documentElement.requestFullscreen()'), "Earth landscape must not fullscreen the whole portal shell");
assert.ok(css.includes('.earth-module:fullscreen') && css.includes('> .earth-module-head{display:none!important}'), "fullscreen monitor must hide duplicate portal header");


assert.ok(!html.includes('src="./orbit-blueprint.html?embed=1"'), "OrbitBlueprint must not occupy a dashboard grid row");
assert.ok(html.includes('href="./orbit-blueprint.html"'), "OrbitBlueprint standalone launch link missing");
assert.ok(blueprint.includes("ORBIT") && blueprint.includes("BLUEPRINT") && blueprint.includes("INTERNATIONAL SPACE STATION") && blueprint.includes("SPACE SHUTTLE") && blueprint.includes("SATURN V"), "OrbitBlueprint spacecraft catalog incomplete");
const blueprintScripts = [...blueprint.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(match => match[1]);
assert.equal(blueprintScripts.length, 1, "expected one inline OrbitBlueprint runtime");
new vm.Script(blueprintScripts[0], { filename: "orbit-blueprint.inline.js" });
for (const control of ['id="craft"', 'id="modules"', 'id="mode"', 'id="rotate"', 'id="reset"', 'id="scene"']) assert.ok(blueprint.includes(control), "OrbitBlueprint control missing: " + control);
assert.ok(blueprint.includes('id="landscape"'), "OrbitBlueprint landscape button missing");
assert.ok(blueprint.includes("orientation.lock('landscape')"), "OrbitBlueprint must request native landscape orientation");
assert.ok(blueprint.includes("force-landscape") && blueprint.includes("transform:rotate(90deg)"), "OrbitBlueprint CSS landscape fallback missing");

assert.ok(blueprint.includes('.module-name{display:block') && blueprint.includes('.module-meta{display:block'), "OrbitBlueprint module names and metadata must occupy separate lines");
assert.ok(blueprint.includes('unit=Math.max(28,Math.min(w*.25,h*.45))*zoom'), "OrbitBlueprint isometric layout must scale to wide, short embedded canvases and support zoom");
assert.ok(blueprint.includes("gesture?.mode==='pinch'") && blueprint.includes("canvas.addEventListener('wheel'"), "OrbitBlueprint pinch and wheel zoom controls missing");
assert.ok(blueprint.includes("canvas.addEventListener('drop'") && blueprint.includes('body.draggable=true'), "OrbitBlueprint assembly drag-and-drop repository missing");
assert.ok(blueprint.includes('function metadata(m)') && blueprint.includes('meta.diameter'), "OrbitBlueprint node inspection metadata missing");
assert.ok(blueprint.includes('function updateStaticLabels()') && blueprint.includes('id="lang"'), "OrbitBlueprint EN/RU localization control missing");
assert.ok(blueprint.includes('RESET TO NOMINAL') && blueprint.includes('drawStarted'), "OrbitBlueprint nominal reset and wireframe reveal missing");
assert.ok(blueprint.includes("SOLAR ARRAY") && blueprint.includes("ZVEZDA"), "OrbitBlueprint compact node labels missing");


console.log("EARTH_CONTROL_SMOKE_OK", JSON.stringify({ panels: panelIds.length, uniqueIds: idList.length, runtimeRefs: refs.length, endpoints: 7, standaloneOrbitBlueprint: true }));
