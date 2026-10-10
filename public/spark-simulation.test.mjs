import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

function createHarness() {
  const frames = [];
  const sandbox = {
    globalThis: {
      document: { hidden: false },
      requestAnimationFrame(callback) { frames.push(callback); }
    }
  };
  vm.runInNewContext(readFileSync("public/spark-simulation.js", "utf8"), sandbox);
  return { simulation: sandbox.globalThis.SparkSimulation, frames, root: sandbox.globalThis };
}

test("scheduler starts once and runs a fixed update after one step", () => {
  const h = createHarness();
  const updates = [];
  const renders = [];
  h.simulation.start(dt => updates.push(dt), dt => renders.push(dt));
  h.simulation.start(() => assert.fail("start must not create a second loop"), () => {});
  assert.equal(h.frames.length, 1);

  h.frames.shift()(1000);
  assert.equal(updates.length, 0);
  h.frames.shift()(1017);
  assert.equal(updates.length, 1);
  assert.ok(Math.abs(updates[0] - 1 / 60) < 1e-9);
  assert.equal(renders.length, 2);
});

test("scheduler bounds catch-up after a long frame", () => {
  const h = createHarness();
  let updates = 0;
  h.simulation.start(() => { updates++; }, () => {});
  h.frames.shift()(1000);
  h.frames.shift()(2000);
  assert.ok(updates <= 3, "a one-second stall must be clamped to 50 ms");
});

test("hidden documents reset the clock without simulating background time", () => {
  const h = createHarness();
  let updates = 0;
  h.simulation.start(() => { updates++; }, () => {});
  h.frames.shift()(1000);
  h.root.document.hidden = true;
  h.frames.shift()(5000);
  h.root.document.hidden = false;
  h.frames.shift()(6000);
  h.frames.shift()(6017);
  assert.equal(updates, 1);
});
