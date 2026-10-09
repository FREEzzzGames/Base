import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
const sandbox = { globalThis: {} };
vm.runInNewContext(readFileSync("public/spark-effects.js", "utf8"), sandbox);
const effects = sandbox.globalThis.SparkEffects;
test("particle bursts stay inside the fixed 160-particle budget", () => {
 const pool = Array.from({length:158}, () => ({}));
 effects.burst(pool, 12, 34, 10, "#fff");
 assert.equal(pool.length, 160);
 assert.ok(pool.slice(158).every(p => p.x === 12 && p.y === 34 && p.c === "#fff"));
});
test("projectile spawning preserves projectile fields and 90-projectile cap", () => {
 const pool = [];
 effects.shoot(pool, 1, 2, 3, 4, 5, "p", "#f00");
 assert.deepEqual({...pool[0]}, {x:1,y:2,px:1,py:2,vx:3,vy:4,dmg:5,owner:"p",c:"#f00",life:2.3});
 while (pool.length < 90) effects.shoot(pool, 0, 0, 1, 1, 1, "e", "#0ff");
 effects.shoot(pool, 0, 0, 1, 1, 1, "e", "#0ff");
 assert.equal(pool.length, 90);
});
