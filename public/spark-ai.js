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

function updateEnemies(enemies,p,dt,levelAI,levelW,shoot,burst,hit,wSafe,hurt){
 enemies.forEach(function(e){
 if(e.hp<=0)return;
 var dx=(p.x+p.w*.5)-(e.x+e.w*.5),dy=(p.y+p.h*.5)-(e.y+e.h*.5),dist=Math.hypot(dx,dy),dir=dx<0?-1:1;
 e.anim=(e.anim||0)+dt;e.fireAnim=Math.max(0,(e.fireAnim||0)-dt);e.flash=Math.max(0,(e.flash||0)-dt);e.hitStun=Math.max(0,(e.hitStun||0)-dt);e.hitKick=(e.hitKick||0)*Math.pow(.0008,dt);e.cd-=dt;
 if(e.face===undefined)e.face=dir;
 if(e.type==='drone'){
  // Hover flight: bobbing, slight pursuit and a short strafe before firing.
  e.t=(e.t||0)+dt;
  var homeY=e.base===undefined?e.y:e.base;
  var airSpeed=levelAI==='airborne'?34:levelAI==='ambush'?24:16;e.x+=Math.sign(dx)*Math.min(airSpeed,Math.abs(dx)*.04)*dt;if(levelAI==='airborne')e.x+=Math.sin(e.t*2.2)*22*dt;e.y=homeY+Math.sin(e.t*(levelAI==='airborne'?4.1:2.8))*((levelAI==='airborne')?22:13)+Math.sin(e.t*5.1)*2.5;
  e.face=dir;
  if(e.cd<=0&&dist<(levelAI==='airborne'?440:390)){e.cd=levelAI==='airborne'?1.55:2.0;e.fireAnim=.24;var leadX=dx+p.vx*.16,leadY=dy+p.vy*.1,aa=Math.atan2(leadY,leadX),sx=e.x+e.w/2+dir*8,sy=e.y+e.h*.58;if(levelAI==='airborne'){for(var av=-1;av<=1;av++)shoot(sx,sy,Math.cos(aa+av*.16)*225,Math.sin(aa+av*.16)*225,7,'e','#50eaff')}else shoot(sx,sy,Math.cos(aa)*205,Math.sin(aa)*205,8,'e','#50eaff');burst(sx,sy,3,'#50eaff')}
 }else if(e.type==='runner'){
  // Wheeled/low runner: accelerates into a charge, brakes, then re-engages.
  e.charge=(e.charge||0)-dt;
  if(e.charge<=0&&Math.abs(dx)<(levelAI==='ambush'?390:300)){e.charge=levelAI==='pressure' ? .72 : 1.1;e.vxRun=dir*(Math.abs(dx)<90?(levelAI==='ambush'?138:112):(levelAI==='pressure'?112:82))}
  if(e.vxRun){e.x+=e.vxRun*dt;e.face=e.vxRun<0?-1:1;if(Math.abs(dx)<30&&Math.abs(dy)<58&&e.cd<=0){e.cd=1.5;e.vxRun=0;e.flash=.18;hurt(18);burst(e.x+e.w/2,e.y+e.h/2,12,'#ff8a1e')}if(Math.abs(e.x-(e.x1||0))<3||Math.abs(e.x-(e.x2||levelW))<3)e.vxRun=0;if(e.charge<.15)e.vxRun=0}else{e.x+=dir*e.v*dt*.22;e.face=dir}
  e.x=Math.max(e.x1||0,Math.min((e.x2||levelW)-e.w,e.x));
 }else if(e.type==='turret'){
  // Tracked turret rolls to a firing lane, turns, then fires a deliberate burst.
  e.wheel=(e.wheel||0)+dt*Math.abs(dx)*.035;
  if(Math.abs(dx)>210){e.x+=dir*Math.min(20,Math.abs(dx)*.045)*dt;e.x=Math.max(0,Math.min(levelW-e.w,e.x))}
  e.face=dir;
  if(e.cd<=0&&dist<(levelAI==='pressure'?540:480)){e.cd=levelAI==='pressure'?1.25:1.7;e.fireAnim=.34;var ta=Math.atan2(dy+p.vy*.12,dx+p.vx*.12),tx=e.x+e.w/2+dir*12,ty=e.y+e.h*.43;if(levelAI==='pressure'){for(var sh=-1;sh<=1;sh++)shoot(tx,ty,Math.cos(ta+sh*.11)*275,Math.sin(ta+sh*.11)*275,10,'e','#ffad50')}else for(var sh=0;sh<2;sh++)shoot(tx,ty,Math.cos(ta+(sh-.5)*.055)*250,Math.sin(ta+(sh-.5)*.055)*250,9,'e','#ffad50');burst(tx,ty,4,'#ffad50')}
 }else if(e.type==='sniper'){
  // Footwork is slow; it pauses to aim and emits a fast, accurate shot.
  e.aim=(e.aim||0);
  if(Math.abs(dx)>185){e.x+=dir*e.v*dt;e.aim=0}else e.aim+=dt;
  e.face=dir;
  if(e.cd<=0&&dist<520&&e.aim>.42){e.cd=2.5;e.aim=0;e.fireAnim=.4;var sa=Math.atan2(dy+p.vy*.08,dx+p.vx*.08);shoot(e.x+e.w/2+dir*10,e.y+e.h*.3,Math.cos(sa)*360,Math.sin(sa)*360,16,'e','#d68aff');burst(e.x+e.w/2+dir*10,e.y+e.h*.3,5,'#d68aff')}
 }else if(e.type==='shield'){
  // Heavy shield unit advances slowly and only exposes its weapon during short volleys.
  if(Math.abs(dx)>68)e.x+=dir*e.v*dt*(levelAI==='pressure' ? .82 : levelAI==='ambush' ? .68 : .55);
  e.face=dir;
  if(e.cd<=0&&dist<260){e.cd=2.2;e.fireAnim=.28;var ha=Math.atan2(dy,dx);for(var hs=-1;hs<=1;hs++)shoot(e.x+e.w/2+dir*13,e.y+e.h*.42,Math.cos(ha+hs*.12)*180,Math.sin(ha+hs*.12)*180,7,'e','#ff718f')}
 }else if(e.type==='support'){
  // Support unit keeps its patrol lane and fires a slower, energy-heavy bolt.
  e.x+=e.v*dt;if(e.x<e.x1){e.x=e.x1;e.v=Math.abs(e.v)}if(e.x+e.w>e.x2){e.x=e.x2-e.w;e.v=-Math.abs(e.v)}e.face=dir;
  if(e.cd<=0&&dist<330){e.cd=2.7;e.fireAnim=.3;var ua=Math.atan2(dy,dx);shoot(e.x+e.w/2+dir*8,e.y+e.h*.45,Math.cos(ua)*155,Math.sin(ua)*155,10,'e','#65ffd1')}
 }else{
  // Standard infantry patrols, turns toward the player and fires a controlled 3-shot burst.
  e.x+=e.v*dt;if(e.x<e.x1){e.x=e.x1;e.v=Math.abs(e.v)}if(e.x+e.w>e.x2){e.x=e.x2-e.w;e.v=-Math.abs(e.v)}e.face=dir;
  if(e.cd<=0&&dist<300){e.cd=2.0;e.fireAnim=.25;var ia=Math.atan2(dy+p.vy*.06,dx+p.vx*.06);for(var is=-1;is<=1;is++)shoot(e.x+e.w/2+dir*10,e.y+e.h*.36,Math.cos(ia+is*.075)*205,Math.sin(ia+is*.075)*205,7,'e','#ff6474');burst(e.x+e.w/2+dir*10,e.y+e.h*.36,3,'#ff6474')}
 }
 if(hit(p,e)&&p.inv<=0&&Math.abs(dx)<wSafe(e)&&Math.abs(dy)<Math.max(45,e.h))hurt(e.type==='shield'?18:e.type==='runner'?18:8);

 });
}
root.SparkAI=Object.freeze({nearestTarget:nearestTarget,bossPhase:bossPhase,updateEnemies:updateEnemies});
})(typeof window!=='undefined'?window:globalThis);
