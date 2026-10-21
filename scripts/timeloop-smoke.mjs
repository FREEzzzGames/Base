import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";

const file = "dist/timeloop.html";
if (!existsSync(file)) throw new Error("TIMELOOP page missing from Pages artifact.");
const html = readFileSync(file, "utf8");
const required = [
  "tabNav.className='tl-tabs'",
  "p.id='tl-panel-'+id",
  "['map','КАРТА'],['time','ЭПОХА'],['cities','ГОРОДА'],['archive','АРХИВ']",
  "panels.map.appendChild(mapbox)",
  "panels.time.appendChild(timebox)",
  "panels.cities.appendChild(cityIntro)",
  "panels.cities.appendChild(citypanel)",
  "panels.archive.appendChild(archivePanel)",
  "activateTab('archive');loadArchive()"
];
for (const item of required) {
  if (!html.includes(item)) throw new Error("TIMELOOP tabs regression: missing " + item);
}
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map(match => match[1].trim())
  .filter(Boolean);
if (!scripts.length) throw new Error("TIMELOOP inline runtime missing.");
for (let i = 0; i < scripts.length; i++) {
  const temp = ".timeloop-inline-check-" + i + ".mjs";
  try {
    writeFileSync(temp, scripts[i]);
    const check = spawnSync(process.execPath, ["--check", temp], { encoding: "utf8" });
    if (check.status !== 0) throw new Error("TIMELOOP JavaScript syntax error in inline script " + i + ":\n" + check.stderr + check.stdout);
  } finally {
    try { unlinkSync(temp); } catch {}
  }
}
console.log("TIMELOOP_SMOKE_OK", JSON.stringify({ file, tabs: 4, inlineScripts: scripts.length }));
