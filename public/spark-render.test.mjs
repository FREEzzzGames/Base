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

test("two-bone IK writes reusable joint coordinates without allocating a result", () => {
 const out={x:0,y:0,tx:0,ty:0};
 const result=render.solve2Bone(out,0,0,8,0,5,5,1);
 assert.equal(result,out);
 assert.equal(out.tx,8); assert.equal(out.ty,0);
 assert.ok(Number.isFinite(out.x)&&Number.isFinite(out.y));
});
test("rig pivot applies transforms in a stable order", () => {
 const calls=[];
 const ctx={translate(...v){calls.push(["translate",...v])},rotate(v){calls.push(["rotate",v])}};
 render.pivot(ctx,4,5,.25);
 assert.deepEqual(calls,[["translate",4,5],["rotate",.25],["translate",-4,-5]]);
});
