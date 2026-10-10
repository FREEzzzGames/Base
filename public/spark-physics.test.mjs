import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
const sandbox = { globalThis: {} };
vm.runInNewContext(readFileSync("public/spark-physics.js", "utf8"), sandbox);
const physics = sandbox.globalThis.SparkPhysics;
test("AABB collision keeps edge-touching non-overlapping", () => {
 assert.equal(physics.hit({x:0,y:0,w:10,h:10},{x:10,y:0,w:5,h:5}), false);
 assert.equal(physics.hit({x:0,y:0,w:10,h:10},{x:9,y:9,w:5,h:5}), true);
});
test("segment collision detects crossing and misses distant rectangles", () => {
 const rect={x:10,y:10,w:10,h:10};
 assert.equal(physics.segmentHitsRect(0,15,30,15,rect), true);
 assert.equal(physics.segmentHitsRect(0,0,5,5,rect), false);
});
test("segment collision preserves 3px tolerance", () => {
 assert.equal(physics.segmentHitsRect(0,7,30,7,{x:10,y:10,w:10,h:10}), true);
 assert.equal(physics.segmentHitsRect(0,6,30,6,{x:10,y:10,w:10,h:10}), false);
});

test("platform collision resolves falling actors onto a ledge", () => {
 const actor={x:10,y:0,w:10,h:10,vx:0,vy:120,onGround:false};
 physics.moveAndCollide(actor,0.2,[{x:0,y:20,w:100,h:10}],100);
 assert.equal(actor.y,10);
 assert.equal(actor.vy,0);
 assert.equal(actor.onGround,true);
});

test("platform collision blocks horizontal motion and clamps world edges", () => {
 const actor={x:0,y:25,w:10,h:10,vx:100,vy:0,onGround:false};
 physics.moveAndCollide(actor,0.2,[{x:20,y:20,w:10,h:30}],100);
 assert.equal(actor.x,10);
 assert.equal(actor.vx,0);
 const edge={x:98,y:0,w:10,h:10,vx:100,vy:0,onGround:false};
 physics.moveAndCollide(edge,0.2,[],100);
 assert.equal(edge.x,90);
});
