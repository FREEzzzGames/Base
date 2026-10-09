/* SPARK fixed-step simulation scheduler; one bounded catch-up policy. */
(function(root){
'use strict';
var last=0,accumulator=0,step=1/60,maxDelta=.05,maxSteps=5,started=false;
function resetClock(){last=0;accumulator=0;}
function frame(t,hidden,update,render){
 if(!started){started=true;root.requestAnimationFrame(loop);}
 function loop(timestamp){root.requestAnimationFrame(loop);tick(timestamp,typeof root.document!=='undefined'&&root.document.hidden,update,render);}
 function tick(timestamp,isHidden,stepUpdate,drawFrame){
  if(isHidden){resetClock();return;}
  if(!last)last=timestamp;
  var dt=Math.min(maxDelta,Math.max(0,(timestamp-last)/1000));last=timestamp;accumulator+=dt;
  var count=0;while(accumulator>=step&&count<maxSteps){stepUpdate(step);accumulator-=step;count++;}
  if(count===maxSteps)accumulator=0;
  drawFrame(Math.min(maxDelta,dt));
 }
 tick(t,hidden,update,render);
}
root.SparkSimulation=Object.freeze({resetClock:resetClock,frame:frame});
})(typeof window!=='undefined'?window:globalThis);
