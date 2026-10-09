/* SPARK render-only pose smoothing. It never mutates simulation coordinates. */
(function(root){
'use strict';
function smoothPose(o,tx,ty,dt,teleportLimit){
 if(o._rx===undefined||o._ry===undefined||Math.abs(tx-o._rx)>teleportLimit||Math.abs(ty-o._ry)>teleportLimit){o._rx=tx;o._ry=ty;o._rvx=0;o._rvy=0;o._rax=0;o._ray=0;o._px=tx;o._py=ty;return;}
 var oldVx=o._rvx||0,oldVy=o._rvy||0,k=1-Math.exp(-Math.max(0,dt)*18);
 o._rx+=(tx-o._rx)*k;o._ry+=(ty-o._ry)*k;
 var safeDt=Math.max(.001,dt);o._rvx=(o._rx-o._px)/safeDt;o._rvy=(o._ry-o._py)/safeDt;
 o._rax=(o._rvx-oldVx)/safeDt;o._ray=(o._rvy-oldVy)/safeDt;o._px=o._rx;o._py=o._ry;
}
function depthScale(y,ground){return Math.max(.88,Math.min(1.08,.96+(ground-y)*.00016));}
root.SparkRenderMath=Object.freeze({smoothPose:smoothPose,depthScale:depthScale});
})(typeof window!=='undefined'?window:globalThis);
