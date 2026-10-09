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

function updateBoss(boss,p,dt,bossAI,ground,bossHomeX,levelW,shoot,burst){
 if(boss.active&&!boss.dead){boss.phase=bossPhase(boss.hp,boss.maxHp);boss.cd-=dt;boss.attack=Math.max(0,boss.attack-dt);boss.hitFlash=Math.max(0,(boss.hitFlash||0)-dt);boss.hitKick=(boss.hitKick||0)*Math.pow(.0008,dt);boss.pattern=(boss.pattern||0)+dt;var bx=boss.x+boss.w/2,by=boss.y+boss.h*.52,ang=Math.atan2(p.y+p.h/2-by,p.x+p.w/2-bx);boss.prevMoveX=boss.x;boss.prevMoveY=boss.y;boss.moveT=(boss.moveT||0)+dt;boss.dashT=Math.max(0,(boss.dashT||0)-dt);var playerDir=Math.sign(p.x+p.w/2-bx)||1,distBoss=Math.abs(p.x+p.w/2-bx);
if(bossAI==='aerial'){
 // RAIDZIN: sustained flight, orbiting strafes and a faster high-altitude sweep in later phases.
 var flight= boss.phase===1?1:boss.phase===2?1.3:1.65;
 boss.y=ground-boss.h-112+Math.sin(boss.moveT*2.15)*35+Math.sin(boss.moveT*4.1)*7;
 boss.x+=Math.sin(boss.moveT*1.45)*22*flight*dt;
 if(distBoss>92)boss.x+=playerDir*(boss.phase===1?34:boss.phase===2?48:62)*dt;
}else if(bossAI==='siege'){
 // GOLIATH: grounded mass, deliberate advance, then recoil/brace; never floats.
 boss.y=ground-boss.h;
 if(distBoss>155)boss.x+=playerDir*(boss.phase===1?13:boss.phase===2?22:30)*dt;
 else boss.x-=playerDir*(boss.phase===3?9:4)*dt;
 boss.recoil=Math.max(0,(boss.recoil||0)-dt);
 if(boss.attack>0)boss.recoil=Math.max(boss.recoil,.14);
}else if(bossAI==='phase'){
 // KAGE: crouch, low/high feints and a readable short dash instead of teleporting.
 var hop=(boss.phase===1?9:boss.phase===2?25:42);
 boss.y=ground-boss.h-Math.max(0,Math.sin(boss.moveT*(boss.phase===3?5.2:3.2)))*hop;
 var dashPeriod=boss.phase===1?5.2:boss.phase===2?3.8:2.9,windowId=Math.floor(boss.moveT/dashPeriod);
 if(boss.phase>=2&&boss.dashWindow!==windowId&&boss.moveT%dashPeriod<dt+.025){
  boss.dashWindow=windowId;boss.dashT=boss.phase===3?.34:.27;boss.dashDir=playerDir;
  burst(boss.x+boss.w/2,boss.y+boss.h*.72,8,'#d45bff');
 }
 if(boss.dashT>0)boss.x+=(boss.dashDir||playerDir)*(boss.phase===3?330:285)*dt;
 else if(distBoss>105)boss.x+=playerDir*(boss.phase===1?19:boss.phase===2?28:36)*dt;
}else{
 // AKIRO: grounded samurai footwork, measured approach and a short forward lunge during attack.
 boss.y=ground-boss.h;
 if(boss.attack>0)boss.x+=playerDir*(boss.phase===3?155:boss.phase===2?125:95)*dt;
 else if(distBoss>125)boss.x+=playerDir*(boss.phase===1?22:boss.phase===2?30:38)*dt;
 else boss.x-=playerDir*(Math.sin(boss.moveT*3.4)>0?12:0)*dt;
}
boss.x=Math.max(bossHomeX-210,Math.min(levelW-boss.w-12,boss.x));boss.visualVx=(boss.x-(boss.prevMoveX==null?boss.x:boss.prevMoveX))/Math.max(dt,.001);boss.visualVy=(boss.y-(boss.prevMoveY==null?boss.y:boss.prevMoveY))/Math.max(dt,.001);if(boss.cd<=0){boss.cd=bossAI==='aerial'?(boss.phase===1?1.8:boss.phase===2?1.35:1.05):bossAI==='siege'?(boss.phase===1?2:boss.phase===2?1.45:1.05):bossAI==='phase'?(boss.phase===1?1.75:boss.phase===2?1.25:.9):(boss.phase===1?1.65:boss.phase===2?1.5:1.3);boss.attack=.36;if(bossAI==='aerial'){for(var ak=-(boss.phase===3?3:boss.phase===2?2:1);ak<=(boss.phase===3?3:boss.phase===2?2:1);ak++)shoot(bx,by,Math.cos(ang+ak*.19)*270,Math.sin(ang+ak*.19)*270,10,'e','#55d9ef')}else if(bossAI==='siege'){if(boss.phase===1){shoot(bx,by,Math.cos(ang)*220,Math.sin(ang)*220,14,'e','#ffad50');shoot(bx,by,Math.cos(ang+.1)*220,Math.sin(ang+.1)*220,14,'e','#ffad50')}else if(boss.phase===2){for(var sk=-2;sk<=2;sk++)shoot(bx,by,Math.cos(ang+sk*.17)*245,Math.sin(ang+sk*.17)*245,12,'e','#ff8a1e')}else{for(var sj=0;sj<12;sj++)shoot(bx,by,Math.cos(sj*Math.PI/6)*210,Math.sin(sj*Math.PI/6)*210,13,'e','#ff593e')}}else if(bossAI==='phase'){if(boss.phase===3){for(var pj=0;pj<14;pj++)shoot(bx,by,Math.cos(pj*Math.PI/7)*230,Math.sin(pj*Math.PI/7)*230,11,'e','#ff2fa0')}else for(var pk=-2;pk<=2;pk++)shoot(bx,by,Math.cos(ang+pk*.2)*260,Math.sin(ang+pk*.2)*260,10,'e','#d45bff')}else if(boss.phase===2){for(var k=-1;k<=1;k++)shoot(bx,by,Math.cos(ang+k*.24)*245,Math.sin(ang+k*.24)*245,11,'e','#ff8a1e')}else if(boss.phase===3){for(var j=0;j<10;j++)shoot(bx,by,Math.cos(j*Math.PI/5)*205,Math.sin(j*Math.PI/5)*205,12,'e','#ff2fa0')}else{shoot(bx,by,Math.cos(ang)*225,Math.sin(ang)*225,12,'e','#ff8a1e');shoot(bx,by,Math.cos(ang+.12)*225,Math.sin(ang+.12)*225,12,'e','#ff5365')}}}
}
root.SparkAI=Object.freeze({nearestTarget:nearestTarget,bossPhase:bossPhase,updateEnemies:updateEnemies,updateBoss:updateBoss});
})(typeof window!=='undefined'?window:globalThis);
