import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const html = readFileSync("public/gord-control-lab.html", "utf8");
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(scriptMatch, "GORD CONTROL LAB must contain its runtime script");
const script = scriptMatch[1];

assert.doesNotThrow(() => new Function(script), "GORD CONTROL LAB JavaScript must parse");
assert.equal((html.match(/\\n/g) || []).length, 0, "HTML must not contain literal escaped newline sequences");
assert.ok(html.includes('id="arena"'), "Canvas arena must exist");
assert.ok(html.includes('id="magePicker"'), "Hero picker must exist");
assert.ok(html.includes("function renderMagePicker"), "Hero picker renderer must exist");
assert.ok(html.includes("function castSkill"), "Skill casting pipeline must exist");
assert.ok(html.includes("function update(dt)"), "Simulation update loop must exist");
assert.ok(html.includes("function draw()"), "Canvas renderer must exist");
assert.ok(html.includes("function sparkBurst"), "Skill spark VFX must exist");
assert.ok(html.includes("gordProjectile"), "Gord projectile implementation must exist");
assert.ok(html.includes("passiveStacks"), "Gord passive stack tracking must exist");

const heroIds = [...script.matchAll(/\{id:"([^"]+)",name:"([^"]+)"/g)].map((match) => match[1]);
assert.ok(heroIds.length >= 30, `Expected at least 30 hero profiles, found ${heroIds.length}`);
assert.equal(new Set(heroIds).size, heroIds.length, "Hero profile IDs must be unique");

for (const id of heroIds) {
  const start = script.indexOf(`{id:"${id}"`);
  const next = script.indexOf("\\n{id:", start + 1);
  const profile = script.slice(start, next === -1 ? script.indexOf("];", start) : next);
  assert.match(profile, /skills:\[[^\]]{3,}\]/, `Hero ${id} must declare skills`);
  assert.match(profile, /types:\[[^\]]{3,}\]/, `Hero ${id} must declare skill types`);
}

console.log(`GORD_CONTROL_LAB_SMOKE_OK heroes=${heroIds.length} script=syntax-ok vfx=present`);
