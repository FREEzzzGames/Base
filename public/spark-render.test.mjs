import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
const sandbox = { globalThis: {} };
vm.runInNewContext(readFileSync("public/spark-render.js", "utf8"), sandbox);
const render = sandbox.globalThis.SparkRenderMath;
test("depth scale is clamped to documented range", () => {
 assert.ok(render.depthScale(-10000,565) <= 1.08);
 assert.ok(render.depthScale(10000,565) >= .88);
});
test("pose smoothing initializes without changing simulation coordinates", () => {
 const actor={x:12,y:18};
 render.smoothPose(actor,actor.x,actor.y,1/60,140);
 assert.equal(actor.x,12); assert.equal(actor.y,18);
 assert.equal(actor._rx,12); assert.equal(actor._ry,18);
});
test("rig drawing helpers safely draw through supplied canvas context", () => {
 let calls=0;
 const ctx={beginPath(){calls++},moveTo(){},lineTo(){},stroke(){},arc(){},fill(){},set lineCap(v){},set strokeStyle(v){},set lineWidth(v){},set fillStyle(v){}};
 render.drawRigLink(ctx,0,0,5,5,"#000","#fff",3);
 render.drawRigHinge(ctx,2,2,1,"#000","#fff");
 assert.ok(calls>=4);
});
