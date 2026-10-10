import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

function loadViewport() {
  const window = { innerWidth: 390, innerHeight: 844, devicePixelRatio: 3 };
  vm.runInNewContext(readFileSync("public/spark-viewport.js", "utf8"), { window });
  return window;
}

test("viewport contains the entire 9:16 scene on tall phones", () => {
  const viewport = loadViewport().SparkViewport.measure(390, 844, 3, 360, 640);
  assert.equal(viewport.scale, 390 / 360);
  assert.equal(viewport.offsetX, 0);
  assert.ok(viewport.offsetY > 0);
  assert.equal(viewport.pixelWidth, 780, "DPR is capped to protect mobile fill rate");
  assert.equal(viewport.pixelHeight, 1688);
});

test("viewport contains the entire scene on short landscape-sized webviews", () => {
  const viewport = loadViewport().SparkViewport.measure(844, 390, 2, 360, 640);
  assert.equal(viewport.scale, 390 / 640);
  assert.ok(viewport.offsetX > 0);
  assert.equal(viewport.offsetY, 0);
});

test("invalid dimensions are normalized and scale remains finite", () => {
  const viewport = loadViewport().SparkViewport.measure(0, -10, 0, 360, 640);
  assert.ok(Number.isFinite(viewport.scale));
  assert.ok(viewport.scale > 0);
  assert.equal(viewport.width, 1);
  assert.equal(viewport.height, 1);
  assert.equal(viewport.dpr, 1);
});

test("canvas backing store matches CSS viewport times capped device pixel ratio", () => {
  const window = loadViewport();
  const canvas = { width: 0, height: 0 };
  const view = window.SparkViewport.resize(canvas, 360, 640);
  assert.equal(canvas.width, 780);
  assert.equal(canvas.height, 1688);
  assert.equal(view.pixelWidth, canvas.width);
  assert.equal(view.pixelHeight, canvas.height);
});
