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
for (const file of ["spark-data.js", "spark-physics.js", "spark-effects.js", "spark-audio.js", "spark-ai.js", "spark-render.js", "spark-simulation.js", "spark-session.js", "spark-viewport.js", "spark-input.js", "spark.js"]) {
  assert.ok(html.includes('src="./' + file + '"'), "Missing runtime module script: " + file);
}
assert.equal((data.match(/\{id:'(?:naru|kai|itachi|sando|hina|shin|roku|miko)'/g) || []).length, 8, "Expected 8 playable characters");
for (const weapon of ["pistol", "shotgun", "smg", "plasma"]) assert.ok(data.includes(weapon + ":{"), "Missing weapon: " + weapon);
for (const profile of ["mecha", "aerial", "siege", "phase"]) assert.ok(runtime.includes("bossAI:'" + profile + "'"), "Missing boss profile: " + profile);
for (const enemy of ["soldier", "runner", "sniper", "shield", "drone", "turret"]) assert.ok(runtime.includes("type:'" + enemy + "'"), "Missing enemy archetype: " + enemy);
assert.ok(ai.includes("function updateEnemies"), "Enemy AI update function missing");
assert.ok(ai.includes("function updateBoss"), "Boss AI update function missing");
assert.ok(simulation.includes("step=1/60"), "Fixed-step simulation is not configured at 60 Hz");
const viewport = readFileSync("public/spark-viewport.js", "utf8");
assert.ok(html.indexOf('src="./spark-viewport.js"') < html.indexOf('src="./spark.js"'), "Viewport adapter must load before runtime");
assert.ok(viewport.includes("function measure(") && viewport.includes("function resize("), "Dedicated viewport adapter missing");
assert.ok(viewport.includes("Math.min(w / logicalWidth, h / logicalHeight)"), "Viewport adapter must preserve the full 9:16 frame");
assert.ok(runtime.includes("SparkViewport.resize(canvas,W,H)"), "Runtime must use the dedicated viewport adapter");
assert.ok(runtime.includes("SparkInput.bind({keys:keys"), "Runtime must use extracted input adapter");
assert.ok(runtime.includes("function update(dt)"), "Gameplay update loop missing");
assert.ok(runtime.includes("function renderFrame"), "Render loop missing");
console.log("SPARK_SMOKE_OK", JSON.stringify({ controls: requiredIds.length, characters: 8, weapons: 4, bossProfiles: 4, enemyTypes: 6, viewport: "contain 9:16" }));
