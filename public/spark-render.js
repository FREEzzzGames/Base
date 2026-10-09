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
function jointAngle(phase,amp,offset){return Math.sin(phase+offset)*amp;}
function pivot(ctx,px,py,angle){ctx.translate(px,py);ctx.rotate(angle);ctx.translate(-px,-py);}
function solve2Bone(out,ax,ay,tx,ty,lenA,lenB,bend){
 var dx=tx-ax,dy=ty-ay,d=Math.sqrt(dx*dx+dy*dy);
 d=Math.max(.001,Math.min(lenA+lenB-.001,Math.max(Math.abs(lenA-lenB)+.001,d)));
 var rawDx=tx-ax,rawDy=ty-ay,rawLength=Math.sqrt(rawDx*rawDx+rawDy*rawDy)||1;
 var along=(lenA*lenA-lenB*lenB+d*d)/(2*d),height=Math.sqrt(Math.max(0,lenA*lenA-along*along));
 var nx=rawDx/rawLength,ny=rawDy/rawLength;
 out.x=ax+nx*along-ny*height*bend;out.y=ay+ny*along+nx*height*bend;
 out.tx=tx;out.ty=ty;return out;
}


function drawRigLink(ctx,ax,ay,bx,by,outer,inner,width){
 ctx.lineCap='round';ctx.strokeStyle=outer;ctx.lineWidth=width+2;ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke();
 ctx.strokeStyle=inner;ctx.lineWidth=Math.max(1,width*.45);ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke();
}
function interpolateActors(enemies,boss,player,dt,smoothPose){
 for(var i=0;i<enemies.length;i++){var e=enemies[i];smoothPose(e,e.x,e.y,dt,180);if(e.type!=='drone'&&e.type!=='turret'&&e.type!=='support')e._gaitPhase=(e._gaitPhase||0)+Math.abs(e._rvx||0)*dt*.22;}
 if(boss&&boss.active&&!boss.dead)smoothPose(boss,boss.x,boss.y,dt,220);
 if(player)smoothPose(player,player.x,player.y,dt,140);
}
function drawRigHinge(ctx,x,y,r,outer,inner){
 ctx.fillStyle=outer;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
 ctx.fillStyle=inner;ctx.beginPath();ctx.arc(x,y,Math.max(1,r*.42),0,Math.PI*2);ctx.fill();
}
root.SparkRenderMath=Object.freeze({smoothPose:smoothPose,depthScale:depthScale,jointAngle:jointAngle,pivot:pivot,solve2Bone:solve2Bone,interpolateActors:interpolateActors,drawRigLink:drawRigLink,drawRigHinge:drawRigHinge});
})(typeof window!=='undefined'?window:globalThis);
