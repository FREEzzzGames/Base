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
assert.ok(html.includes('id="basicAttack"'), "Basic attack control must exist for attack-triggered passives");
assert.ok(html.includes("baneCannon"), "Bane cannon must have a dedicated projectile collision handler");
assert.ok(html.includes("baneShark"), "Bane ultimate must use a traveling shark wave");
assert.ok(html.includes("damage=(140+state.magicPower*1.3)*(1+Math.min(1,charge/1.5))"), "Bane Ale recast must scale with hold duration");
assert.ok(html.includes("s.baneTidal=Math.min(2,s.baneTidal+1)"), "Bane passive stacks must cap at two");
assert.ok(html.includes("function basicAttack()"), "Basic attack must consume Bane passive stacks");
assert.ok(html.includes("auroraHail:true"), "Aurora's first skill must create five hailstone ticks");
assert.ok(html.includes("auroraFrozenZone:true"), "Aurora's second skill must create a freezing end-zone");
assert.ok(html.includes("auroraGlacier:true"), "Aurora's ultimate must grow and detonate a glacier");
assert.ok(html.includes("state.auroraPassiveCooldown=150"), "Aurora's fatal-damage passive must have a 150-second cooldown");
assert.ok(html.includes('id="testPassive"'), "Aurora's survival passive must be manually testable in the lab");
assert.ok(html.includes("cecilionBat:true"), "Cecilion's Bat Impact must travel along a path and detonate at its destination");
assert.ok(html.includes("cecilionClaws:true"), "Cecilion's Sanguine Claws must pull and immobilize targets");
assert.ok(html.includes("cecilionFeast:true"), "Cecilion's ultimate must fire repeated nearby-target bolts");
assert.ok(html.includes("state.cecilionMaxMana+=10"), "Cecilion's Overflowing passive must increase maximum mana on skill hits");
assert.ok(html.includes('id="cecilionMana"'), "Cecilion's mana growth must be visible in the HUD");
assert.ok(html.includes("changEWave:true"), "Chang'e S1 must use shield-dependent multi-sphere projectiles");
assert.ok(html.includes("changEMeteorShower:true"), "Chang'e ultimate must fire timed meteor projectiles");
assert.ok(html.includes("t.changEMarks=Math.min(20"), "Chang'e passive marks must stack to 20");
assert.ok(html.includes("s.changEShield=300+state.magicPower*1.5"), "Chang'e Crescent Moon must grant a shield");
assert.ok(html.includes("id==='chang-e'&&state.changEShield>0"), "Chang'e shield must absorb incoming damage");

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
