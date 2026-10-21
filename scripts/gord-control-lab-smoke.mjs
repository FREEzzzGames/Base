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
assert.ok(html.includes("ultSteeringPointer"), "Active ultimate must track its steering pointer");
assert.ok(html.includes("state.ultimate.angle=state.player.face"), "Active ultimate must update direction from pointer movement");
assert.ok(html.includes("pointercancel"), "Touch cancellation must be handled");
assert.ok(html.includes("if(s.cooldowns[idn]>0)return"), "Skills must reject casts while on cooldown");
assert.ok(html.includes("Math.min((currentMage().id==='gord'?.4:.9),(previous?.value||0)+value)"), "Gord slow must cap at 40% and other hero slows can reach 90%");
assert.ok(html.includes("slowFactor=1-(t.statuses?.slow?.value||0)"), "Slow status must affect target movement");
assert.ok(html.includes("Math.abs(Math.sin((sh.age||0)*18))*10"), "Gord orb must show a bouncing flight animation");
assert.ok(html.includes('skills:["Crimson Gleam","Doom Waltz","Throne of Ruin"]'), "Alice must use the revamped skill names");
assert.ok(html.includes("aliceCrimsonTimer=4"), "Alice passive stacks must have a four-second expiry");
assert.ok(html.includes("aliceUltCharge={life:1.5}"), "Alice ultimate must include its charge time");
assert.ok(html.includes("function healPlayer(amount)"), "Alice healing must affect player HP");
assert.ok(html.includes('id="playerHp"'), "Player HP must be visible in the training HUD");

const heroIds = [...script.matchAll(/\{id:"([^"]+)",name:"([^"]+)"/g)].map((match) => match[1]);
assert.ok(heroIds.length >= 30, `Expected at least 30 hero profiles, found ${heroIds.length}`);
assert.equal(new Set(heroIds).size, heroIds.length, "Hero profile IDs must be unique");

for (const id of heroIds) {
  const start = script.indexOf(`{id:"${id}"`);
  const next = script.indexOf("\n{id:", start + 1);
  const profile = script.slice(start, next === -1 ? script.indexOf("];", start) : next);
  assert.match(profile, /skills:\[[^\]]{3,}\]/, `Hero ${id} must declare skills`);
  assert.match(profile, /types:\[[^\]]{3,}\]/, `Hero ${id} must declare skill types`);
}

console.log(`GORD_CONTROL_LAB_SMOKE_OK heroes=${heroIds.length} script=syntax-ok vfx=present`);
