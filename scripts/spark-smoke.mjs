import { readFileSync } from "node:fs";
import { strict as assert } from "node:assert";

const html = readFileSync("public/spark.html", "utf8");
const runtime = readFileSync("public/spark.js", "utf8");
const data = readFileSync("public/spark-data.js", "utf8");
const ai = readFileSync("public/spark-ai.js", "utf8");
const simulation = readFileSync("public/spark-simulation.js", "utf8");

const requiredIds = [
  "game", "menu", "start", "openMissions", "characterGrid", "weaponsGrid",
  "missionStart", "pauseButton", "resume", "pauseRestart", "pauseHome",
  "pauseExit", "exitCancel", "exitConfirmBtn", "weaponPrev", "weaponNext",
  "moveStick", "stickKnob", "hp", "en", "bossHp", "retry", "again"
];
for (const id of requiredIds) {
  assert.match(html, new RegExp('id="' + id + '"'), "Missing UI control: " + id);
}
for (const file of ["spark-data.js", "spark-physics.js", "spark-effects.js", "spark-audio.js", "spark-ai.js", "spark-render.js", "spark-simulation.js", "spark-session.js", "spark.js"]) {
  assert.ok(html.includes('src="./' + file + '"'), "Missing runtime module script: " + file);
}
assert.equal((data.match(/\{id:'(?:naru|kai|itachi|sando|hina|shin|roku|miko)'/g) || []).length, 8, "Expected 8 playable characters");
for (const weapon of ["pistol", "shotgun", "smg", "plasma"]) assert.ok(data.includes(weapon + ":{"), "Missing weapon: " + weapon);
for (const profile of ["mecha", "aerial", "siege", "phase"]) assert.ok(runtime.includes("bossAI:'" + profile + "'"), "Missing boss profile: " + profile);
for (const enemy of ["soldier", "runner", "sniper", "shield", "drone", "turret"]) assert.ok(runtime.includes("type:'" + enemy + "'"), "Missing enemy archetype: " + enemy);
assert.ok(ai.includes("function updateEnemies"), "Enemy AI update function missing");
assert.ok(ai.includes("function updateBoss"), "Boss AI update function missing");
assert.ok(simulation.includes("step=1/60"), "Fixed-step simulation is not configured at 60 Hz");
assert.ok(runtime.includes("scale=Math.min(ww/W,hh/H)"), "Viewport must contain the full 9:16 logical frame");
assert.ok(runtime.includes("function update(dt)"), "Gameplay update loop missing");
assert.ok(runtime.includes("function renderFrame"), "Render loop missing");
console.log("SPARK_SMOKE_OK", JSON.stringify({ controls: requiredIds.length, characters: 8, weapons: 4, bossProfiles: 4, enemyTypes: 6, viewport: "contain 9:16" }));
