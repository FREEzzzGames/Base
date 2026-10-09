/* SPARK fixed-step simulation scheduler; one bounded catch-up policy. */
(function(root){
'use strict';
var last=0,accumulator=0,step=1/60,maxDelta=.05,maxSteps=5,started=false,updateFn=null,renderFn=null;
function resetClock(){last=0;accumulator=0;}
function tick(timestamp){
 root.requestAnimationFrame(tick);
 if(typeof root.document!=='undefined'&&root.document.hidden){resetClock();return;}
 if(!last)last=timestamp;
 var dt=Math.min(maxDelta,Math.max(0,(timestamp-last)/1000));last=timestamp;accumulator+=dt;
 var count=0;while(accumulator>=step&&count<maxSteps){if(updateFn)updateFn(step);accumulator-=step;count++;}
 if(count===maxSteps)accumulator=0;
 if(renderFn)renderFn(Math.min(maxDelta,dt));
}
function start(update,render){
 updateFn=update;renderFn=render;
 if(started)return;
 started=true;root.requestAnimationFrame(tick);
}
root.SparkSimulation=Object.freeze({start:start,resetClock:resetClock});
})(typeof window!=='undefined'?window:globalThis);
