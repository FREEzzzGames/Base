import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync("public/spark.html", "utf8");
const runtime = readFileSync("public/spark.js", "utf8");
const css = readFileSync("public/spark.css", "utf8");

function allMatches(regex, source = html) {
  return [...source.matchAll(regex)];
}


test("SPARK stylesheet is external and preserves mobile layout rules", () => {
  assert.ok(html.includes('<link rel="stylesheet" href="./spark.css">'), "external stylesheet link is missing");
  assert.ok(css.includes(":root{"), "design tokens are missing");
  assert.ok(css.includes("@media(max-width:390px)"), "small-screen layout rules are missing");
  assert.ok(css.includes("touch-action:none"), "touch input styling is missing");
});

test("SPARK document has unique IDs for every critical UI control", () => {
  const ids = allMatches(/\bid=["']([^"']+)["']/g).map(match => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepEqual([...new Set(duplicates)], [], "duplicate DOM IDs break event routing");
  for (const id of [
    "game", "hud", "hp", "en", "pauseButton", "controls", "moveStick",
    "stickKnob", "start", "openMissions", "missionStart", "characterGrid",
    "weaponsGrid", "chooseCharacter", "equipWeapon", "soundToggle",
    "pauseMenu", "resume", "pauseRestart", "pauseHome", "pauseExit",
    "exitCancel", "exitConfirmBtn", "over", "retry", "win", "again", "stats"
  ]) {
    assert.ok(ids.includes(id), "missing required UI element #" + id);
  }
});

test("every navigation destination and combat action has a matching runtime path", () => {
  const screens = new Set(allMatches(/\bdata-screen=["']([^"']+)["']/g).map(match => match[1]));
  const destinations = allMatches(/\bdata-goto=["']([^"']+)["']/g).map(match => match[1]);
  assert.ok(destinations.length > 0);
  for (const destination of destinations) {
    assert.ok(screens.has(destination), "navigation points to missing screen: " + destination);
  }

  const actions = new Set(allMatches(/\bdata-act=["']([^"']+)["']/g).map(match => match[1]));
  for (const action of ["interact", "skill", "jump", "attack"]) {
    assert.ok(actions.has(action), "missing combat action: " + action);
  }
  for (const marker of ["keys.interactEdge", "keys.skillEdge", "keys.jumpEdge", "keys.attackEdge"]) {
    assert.ok(runtime.includes(marker), "runtime does not handle " + marker);
  }
});

test("SPARK runtime scripts load in dependency order", () => {
  const scripts = allMatches(/<script\b[^>]*src=["']\.\/([^"']+)["'][^>]*>/gi).map(match => match[1]);
  const expected = [
    "spark-data.js", "spark-physics.js", "spark-effects.js", "spark-audio.js",
    "spark-ai.js", "spark-render.js", "spark-simulation.js", "spark-session.js", "spark.js"
  ];
  for (const file of expected) assert.ok(scripts.includes(file), "missing runtime script " + file);
  assert.deepEqual(scripts.filter(file => expected.includes(file)), expected);
});
