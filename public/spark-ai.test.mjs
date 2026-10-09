import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
const sandbox = { globalThis: {} };
vm.runInNewContext(readFileSync("public/spark-ai.js", "utf8"), sandbox);
const ai = sandbox.globalThis.SparkAI;
test("nearestTarget ignores dead enemies and respects max range", () => {
 const enemies=[{x:10,y:0,w:10,h:10,hp:0},{x:50,y:0,w:10,h:10,hp:5}];
 assert.equal(ai.nearestTarget(enemies,null,0,0,100),enemies[1]);
 assert.equal(ai.nearestTarget(enemies,null,0,0,20),null);
});
test("boss phase follows health thresholds", () => {
 assert.equal(ai.bossPhase(80,100),1);
 assert.equal(ai.bossPhase(50,100),2);
 assert.equal(ai.bossPhase(20,100),3);
});
test("enemy AI updates drone state and fires through injected effects", () => {
 const enemy={type:"drone",x:20,y:20,w:20,h:20,hp:10,base:20,cd:0,t:0};
 const player={x:60,y:20,w:20,h:40,vx:0,vy:0,inv:1};
 const shots=[],bursts=[];
 ai.updateEnemies([enemy],player,1/60,"balanced",300,(...args)=>shots.push(args),(...args)=>bursts.push(args),()=>false,()=>40,()=>{});
 assert.ok(enemy.t>0);
 assert.ok(enemy.x>20);
 assert.equal(shots.length,1);
 assert.ok(bursts.length>0);
});
