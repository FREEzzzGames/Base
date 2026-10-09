/* SPARK AI decision helpers. Deterministic selection/phase decisions only. */
(function(root){
'use strict';
function nearestTarget(enemies,boss,x,y,maxDistance){
 var target=null,best=maxDistance;
 for(var i=0;i<enemies.length;i++){
  var e=enemies[i];if(e.hp<=0)continue;
  var dx=e.x+e.w/2-x,dy=e.y+e.h/2-y,distance=Math.hypot(dx,dy);
  if(distance<best&&Math.abs(dx)>5){best=distance;target=e;}
 }
 if(boss&&boss.active&&!boss.dead){
  var bd=Math.hypot(boss.x+boss.w/2-x,boss.y+boss.h*.5-y);
  if(bd<best)target=boss;
 }
 return target;
}
function bossPhase(hp,maxHp){return hp>maxHp*.66?1:hp>maxHp*.33?2:3;}
root.SparkAI=Object.freeze({nearestTarget:nearestTarget,bossPhase:bossPhase});
})(typeof window!=='undefined'?window:globalThis);
