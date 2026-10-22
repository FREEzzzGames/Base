import { readFileSync } from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const html = readFileSync("public/economy-lab.html", "utf8");
const scripts = [...html.matchAll(/<script>([\\s\\S]*?)<\\/script>/gi)];
assert.equal(scripts.length, 1, "Economy Lab must have exactly one inline application script");
const source = scripts[0][1];
new vm.Script(source, { filename: "economy-lab.inline.js" });
for (const id of ["run", "step", "reset", "save", "export", "import", "import-file", "metrics", "markets", "firms-body"]) {
  assert.match(html, new RegExp('id="' + id + '"'), "Missing UI element: " + id);
}
for (const token of ["SAVE_KEY", "validImportedState", "restoreState", "downloadJSON", "function step()", "function render()"]) {
  assert.ok(source.includes(token), "Missing simulation capability: " + token);
}
assert.match(html, /Сохранить/);
assert.match(html, /Экспорт JSON/);
assert.match(html, /Импорт JSON/);
console.log("ECONOMY_LAB_SMOKE_OK");
