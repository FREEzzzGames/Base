import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

class Target {
  constructor(dataset = {}) {
    this.dataset = dataset;
    this.listeners = new Map();
    this.classes = new Set();
    this.style = { left: "50%", top: "50%" };
    this.classList = {
      add: name => this.classes.add(name),
      remove: name => this.classes.delete(name)
    };
  }
  addEventListener(name, callback) {
    if (!this.listeners.has(name)) this.listeners.set(name, []);
    this.listeners.get(name).push(callback);
  }
  emit(name, event = {}) {
    event.preventDefault ||= () => {};
    event.stopPropagation ||= () => {};
    for (const callback of this.listeners.get(name) || []) callback(event);
  }
  setPointerCapture() {}
  getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; }
}

function harness() {
  const rootListeners = new Map();
  const actions = ["attack", "jump", "interact", "skill"].map(action => new Target({ act: action }));
  const stick = new Target();
  const knob = new Target();
  const previous = new Target();
  const next = new Target();
  const elements = { moveStick: stick, stickKnob: knob, weaponPrev: previous, weaponNext: next };
  const document = {
    hidden: false,
    getElementById: id => elements[id] || null,
    querySelectorAll: selector => selector === "[data-act]" ? actions : []
  };
  const window = {
    document,
    addEventListener(name, callback) {
      if (!rootListeners.has(name)) rootListeners.set(name, []);
      rootListeners.get(name).push(callback);
    }
  };
  vm.runInNewContext(readFileSync("public/spark-input.js", "utf8"), { window });
  const keys = { left:false,right:false,jump:false,jumpEdge:false,attack:false,attackEdge:false,interact:false,interactEdge:false,skill:false,skillEdge:false };
  const weaponSteps = [];
  window.SparkInput.bind({ keys, cycleWeapon: step => weaponSteps.push(step) });
  return { window, keys, actions, stick, knob, previous, next, weaponSteps, rootListeners };
}

test("keyboard input sets edge-triggered actions and releases held states", () => {
  const h = harness();
  h.rootListeners.get("keydown")[0]({ key: " ", preventDefault() {} });
  assert.equal(h.keys.jump, true);
  assert.equal(h.keys.jumpEdge, true);
  h.rootListeners.get("keyup")[0]({ key: " " });
  assert.equal(h.keys.jump, false);
});

test("weapon controls and keyboard shortcuts use the same cycle callback", () => {
  const h = harness();
  h.previous.emit("click");
  h.next.emit("click");
  h.rootListeners.get("keydown")[0]({ key: "q", preventDefault() {} });
  h.rootListeners.get("keydown")[0]({ key: "r", preventDefault() {} });
  assert.deepEqual(h.weaponSteps, [-1, 1, -1, 1]);
});

test("pointer combat actions activate, release and reset without stuck buttons", () => {
  const h = harness();
  const attack = h.actions.find(button => button.dataset.act === "attack");
  attack.emit("pointerdown", { pointerId: 4 });
  assert.equal(h.keys.attack, true);
  assert.equal(h.keys.attackEdge, true);
  assert.equal(attack.classes.has("on"), true);
  attack.emit("pointerup", { pointerId: 4 });
  assert.equal(h.keys.attack, false);
  h.actions.find(button => button.dataset.act === "skill").emit("pointerdown", { pointerId: 5 });
  h.window.SparkInput.reset();
  assert.equal(h.keys.skill, false);
  assert.equal(h.actions.some(button => button.classes.has("on")), false);
});

test("virtual stick maps pointer movement and clears it on pointer cancellation", () => {
  const h = harness();
  h.stick.emit("pointerdown", { pointerId: 7, clientX: 10, clientY: 50 });
  assert.equal(h.keys.left, true);
  h.stick.emit("pointercancel", { pointerId: 7 });
  assert.equal(h.keys.left, false);
  assert.equal(h.keys.right, false);
  assert.equal(h.knob.style.left, "50%");
  assert.equal(h.knob.style.top, "50%");
});
