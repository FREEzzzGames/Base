import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync("public/gord-control-lab.html", "utf8");
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(scriptMatch, "runtime script must exist");
const source = scriptMatch[1];
const hook = "resize();renderMagePicker();selectMage('gord');requestAnimationFrame(loop);";
assert.ok(source.includes(hook), "runtime boot sequence must be discoverable for test injection");

class FakeElement {
  constructor(id = "") {
    this.id = id;
    this.style = {};
    this.dataset = {};
    this.children = [];
    this.listeners = new Map();
    this.textContent = "";
    this.innerHTML = "";
    this.className = "";
    this.width = 360;
    this.height = 540;
    this.classList = {
      toggle: () => {},
      add: () => {},
      remove: () => {},
      contains: () => false
    };
  }
  addEventListener(type, fn) {
    const list = this.listeners.get(type) || [];
    list.push(fn);
    this.listeners.set(type, list);
  }
  dispatch(type, event = {}) {
    for (const fn of this.listeners.get(type) || []) fn({ preventDefault() {}, pointerId: 1, clientX: 240, clientY: 420, ...event });
  }
  appendChild(child) { this.children.push(child); return child; }
  insertAdjacentHTML(_position, html) { this.innerHTML += html; }
  setPointerCapture() {}
  getBoundingClientRect() {
    return { left: 0, top: 0, width: this.id === "moveArea" ? 100 : 360, height: this.id === "moveArea" ? 100 : 540, right: 360, bottom: 540 };
  }
  querySelector(selector) {
    if (!this.childrenBySelector) this.childrenBySelector = new Map();
    if (!this.childrenBySelector.has(selector)) this.childrenBySelector.set(selector, new FakeElement(selector));
    return this.childrenBySelector.get(selector);
  }
  getContext() { return context2d; }
}

const context2d = new Proxy({}, {
  get(target, key) {
    if (key === "createLinearGradient") return () => ({ addColorStop() {} });
    if (key === "measureText") return () => ({ width: 10 });
    if (!(key in target)) target[key] = () => {};
    return target[key];
  },
  set(target, key, value) { target[key] = value; return true; }
});

const ids = new Map();
const get = (id) => {
  if (!ids.has(id)) ids.set(id, new FakeElement(id));
  return ids.get(id);
};
const canvas = get("arena");
canvas.getContext = () => context2d;
const skills = [1, 2, 3].map((n) => {
  const b = get("skill" + n);
  b.dataset.skill = String(n);
  b.querySelector = (selector) => {
    if (!b.childrenBySelector) b.childrenBySelector = new Map();
    if (!b.childrenBySelector.has(selector)) b.childrenBySelector.set(selector, new FakeElement(selector));
    return b.childrenBySelector.get(selector);
  };
  return b;
});
const document = {
  getElementById: get,
  querySelectorAll: (selector) => selector === ".skill" ? skills : [],
  querySelector: (selector) => {
    const m = selector.match(/data-skill="(\d+)"/);
    return m ? skills[Number(m[1]) - 1] : get(selector);
  },
  createElement: (tag) => new FakeElement(tag)
};
const window = { devicePixelRatio: 1, addEventListener() {}, setTimeout() {} };
const injected = source.replace(hook, "resize();renderMagePicker();selectMage('gord');window.__labTest={state,castSkill,hitTarget,update,basicAttack,selectMage,takePlayerDamage};");
const sandbox = {
  document, window, console, Math, Set, Map, Date,
  performance: { now: () => 1000 },
  requestAnimationFrame: () => 0,
  setTimeout: () => 0,
  clearTimeout: () => {},
  encodeURIComponent,
};
vm.runInNewContext(injected, sandbox, { timeout: 2000 });
const lab = window.__labTest;
assert.ok(lab, "test hook must expose runtime");
const target = (x, y, hp = 10000) => ({ x, y, r: 13, hp, max: hp, phase: 0, alive: true, respawn: 0, statuses: {}, marks: {} });
const resetTargets = (...targets) => { lab.state.targets = targets; lab.state.movingTargets = false; lab.state.player.x = 180; lab.state.player.y = 420; lab.state.player.face = 0; };
const step = (seconds) => { const frames = Math.ceil(seconds / 0.033); for (let i = 0; i < frames; i++) lab.update(seconds / frames); };

lab.selectMage("gord");
let t = target(230, 420), t2 = target(255, 420);
resetTargets(t, t2);
lab.castSkill(1, 0, { x: 300, y: 420 });
for (let i = 0; i < 5; i++) lab.update(0.1);
assert.ok(t.hp < 10000, "Gord S1 must damage the first target");
assert.ok(t.statuses.stun, "Gord S1 must stun the target");
assert.ok(t2.hp < 10000, "Gord S1 explosion must damage nearby targets");
lab.selectMage("gord");
t = target(220, 420);
resetTargets(t);
lab.castSkill(2, 0, { x: 220, y: 420 });
lab.update(0.35);
assert.ok(t.hp < 10000, "Gord S2 zone must tick damage");

lab.selectMage("alice");
t = target(190, 420);
resetTargets(t);
lab.hitTarget(t, 1, 1);
lab.hitTarget(t, 1, 1);
assert.ok(lab.state.aliceBanquet > 0, "Alice passive must activate after two skill hits");
lab.selectMage("alice");
t = target(220, 420);
resetTargets(t);
lab.castSkill(3, 0, { x: 220, y: 420 });
assert.equal(lab.state.aliceUltCharge.life, 1.5, "Alice ultimate must begin with a 1.5s charge");
step(1.6);
assert.ok(t.statuses.root, "Alice ultimate must immobilize targets on impact");

lab.selectMage("bane");
t = target(230, 420);
resetTargets(t);
lab.castSkill(2, 0, { x: 300, y: 420 });
assert.ok(lab.state.player.hp > 700, "Bane Ale must restore HP");
assert.ok(lab.state.baneAleReady > 0, "Bane Ale must open its recast window");
const beforeVenom = t.hp;
lab.castSkill(2, 0, { x: 300, y: 420 }, 1.5);
assert.ok(t.hp < beforeVenom, "Bane Ale recast must damage targets in its cone");
assert.equal(lab.state.baneAleReady, 0, "Bane Ale recast must close its window");
lab.selectMage("bane");
t = target(230, 420);
resetTargets(t);
lab.castSkill(1, 0, { x: 300, y: 420 });
assert.equal(lab.state.baneTidal, 1, "Bane skills must build Tidal Energy");
lab.basicAttack();
assert.equal(lab.state.baneTidal, 0, "Bane enhanced basic attack must consume Tidal Energy");

lab.selectMage("aurora");
t = target(240, 420);
resetTargets(t);
lab.castSkill(1, 0, { x: 240, y: 420 });
assert.ok(t.hp < 10000, "Aurora Hailstone Blast must impact the target area");
lab.selectMage("aurora");
lab.takePlayerDamage(lab.state.player.hp + 1);
assert.ok(lab.state.auroraInvuln > 0, "Aurora passive must prevent fatal damage");
step(1.5);
assert.ok(lab.state.player.hp >= 300, "Aurora passive must restore 30% max HP");

lab.selectMage("cecilion");
t = target(230, 420);
resetTargets(t);
lab.castSkill(1, 0, { x: 300, y: 420 });
lab.update(0.12);
assert.ok(lab.state.cecilionMaxMana > 1000, "Cecilion Overflowing must increase max mana after a skill hit");
assert.ok(t.hp < 10000, "Cecilion Bat Impact must damage targets along its path");
lab.selectMage("cecilion");
t = target(230, 420);
resetTargets(t);
lab.castSkill(3, 0, { x: 250, y: 420 });
lab.update(0.2);
assert.ok(t.hp < 10000, "Cecilion Bats Feast must hit nearby targets");

lab.selectMage("chang-e");
t = target(230, 420);
resetTargets(t);
lab.castSkill(2, 0, { x: 230, y: 420 });
assert.ok(lab.state.changEShield > 0, "Chang'e Crescent Moon must grant a shield");
lab.castSkill(1, 0, { x: 300, y: 420 });
assert.equal(lab.state.shots.filter((shot) => shot.changEWave).length, 5, "Chang'e S1 must fire five spheres with Crescent Moon active");
step(0.2);
assert.ok(t.hp < 10000, "Chang'e Starmoon Shockwave must hit along its path");
assert.equal(t.changEMarks > 0, true, "Chang'e passive must mark damaged targets");
const shieldBefore = lab.state.changEShield;
lab.takePlayerDamage(50);
assert.ok(lab.state.changEShield < shieldBefore, "Incoming damage must deplete Chang'e's shield");
lab.selectMage("chang-e");
t = target(230, 420);
resetTargets(t);
lab.castSkill(3, 0, { x: 300, y: 420 });
step(0.4);
assert.ok(t.hp < 10000, "Chang'e Meteor Shower must launch damaging meteors");

lab.selectMage("eudora");
t = target(230, 420);
resetTargets(t);
lab.hitTarget(t, 1, 1);
lab.castSkill(1, 0, { x: 250, y: 420 });
assert.ok(t.hp < 9990, "Eudora Forked Lightning must damage a target");
assert.ok(lab.state.cooldowns[0] < lab.state.cdMax[0], "Eudora's marked-target chain must refund skill-one cooldown");
lab.selectMage("eudora");
t = target(230, 420);
t2 = target(245, 440);
resetTargets(t, t2);
lab.hitTarget(t, 1, 1);
lab.castSkill(2, 0, { x: 230, y: 420 });
step(0.12);
assert.ok(t.statuses.stun, "Eudora Ball Lightning must stun its primary target");
assert.ok(t2.statuses.stun, "Eudora Ball Lightning must stun nearby targets when the primary is marked");
lab.selectMage("eudora");
t = target(230, 420);
resetTargets(t);
lab.hitTarget(t, 1, 1);
lab.castSkill(3, 0, { x: 230, y: 420 });
const beforeThunderburst = t.hp;
step(0.9);
assert.ok(t.hp < beforeThunderburst, "Eudora Thunder's Wrath must trigger delayed Thunderburst on a marked target");

lab.selectMage("cyclops");
t = target(230, 420);
resetTargets(t);
lab.castSkill(1, 0, { x: 300, y: 420 });
step(0.12);
assert.ok(t.hp < 10000, "Cyclops Stardust Shock must hit with its disks");
assert.ok(lab.state.cooldowns[0] < lab.state.cdMax[0], "Cyclops passive must refund cooldown on skill hits");
lab.selectMage("cyclops");
t = target(230, 420);
resetTargets(t);
lab.castSkill(2, 0, { x: 230, y: 420 });
step(0.5);
assert.ok(t.hp < 10000, "Cyclops Planets Attack spheres must home onto a target");
lab.selectMage("cyclops");
t = target(230, 420);
resetTargets(t);
lab.castSkill(3, 0, { x: 230, y: 420 });
step(0.5);
assert.ok(t.statuses.root, "Cyclops ultimate must immobilize its locked target");

console.log("GORD_CONTROL_LAB_RUNTIME_OK Gord/Alice/Bane/Aurora/Cecilion mechanics passed");
