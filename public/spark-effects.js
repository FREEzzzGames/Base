/* SPARK effects and projectile allocation primitives. */
(function(root){
'use strict';
function burst(pool,x,y,count,color){
 for(var i=0;i<count&&pool.length<160;i++){
  var angle=Math.random()*Math.PI*2,speed=40+Math.random()*150;
  pool.push({x:x,y:y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:.3+Math.random()*.4,max:.7,c:color});
 }
}
function shoot(pool,x,y,vx,vy,damage,owner,color){
 if(pool.length<90)pool.push({x:x,y:y,px:x,py:y,vx:vx,vy:vy,dmg:damage,owner:owner,c:color,life:2.3});
}
root.SparkEffects=Object.freeze({burst:burst,shoot:shoot});
})(typeof window!=='undefined'?window:globalThis);
