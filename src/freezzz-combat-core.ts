/* FREEzzz combat core
 * Clean-room TypeScript implementation of modern top-down shooter mechanics
 * studied from open-source references. No source code copied from third-party projects.
 */
export interface HsWeaponDef {
  id:string;
  name:string;
  damage:number;
  fireInterval:number;
  magazine:number;
  reserve:number;
  reloadTime:number;
  spread:number;
  pellets:number;
  muzzleSpeed:number;
  range:number;
  penetration:number;
  recoil:number;
  cost:number;
}

export interface HsShot {
  x:number;
  y:number;
  vx:number;
  vy:number;
  damage:number;
  life:number;
  owner:"player"|"enemy";
  penetration:number;
  weaponId:string;
  shotId:number;
  hitIds:Set<number>;
}

export interface HsObstacle {x:number;y:number;w:number;h:number;}

export interface HsCombatState {
  ammo:number;
  reserve:number;
  reloadTimer:number;
  fireTimer:number;
  recoil:number;
  shotCounter:number;
  grenades:number;
  grenadeCooldown:number;
}

export type AiState="idle"|"alert"|"chase"|"attack"|"retreat"|"dodge";

export interface HsAi {
  state:AiState;
  alert:number;
  think:number;
  strafe:number;
  lastSeenX:number;
  lastSeenY:number;
}

export const HS_WEAPONS:HsWeaponDef[]=[
 {id:"pocket9",name:"POCKET 9",damage:18,fireInterval:18,magazine:12,reserve:72,reloadTime:82,spread:.035,pellets:1,muzzleSpeed:8.8,range:720,penetration:.08,recoil:.75,cost:0},
 {id:"service",name:"SERVICE",damage:22,fireInterval:14,magazine:14,reserve:84,reloadTime:86,spread:.045,pellets:1,muzzleSpeed:9.2,range:760,penetration:.12,recoil:.9,cost:450},
 {id:"revolver",name:"REVOLVER",damage:38,fireInterval:28,magazine:6,reserve:48,reloadTime:104,spread:.025,pellets:1,muzzleSpeed:10.2,range:900,penetration:.28,recoil:1.7,cost:700},
 {id:"smg",name:"SMG",damage:14,fireInterval:7,magazine:24,reserve:144,reloadTime:92,spread:.09,pellets:1,muzzleSpeed:8.5,range:650,penetration:.10,recoil:.55,cost:1100},
 {id:"shotgun",name:"SHOTGUN",damage:14,fireInterval:34,magazine:5,reserve:35,reloadTime:112,spread:.18,pellets:7,muzzleSpeed:7.5,range:420,penetration:.05,recoil:2.4,cost:1400},
 {id:"carbine",name:"CARBINE",damage:30,fireInterval:16,magazine:10,reserve:60,reloadTime:98,spread:.035,pellets:1,muzzleSpeed:10.8,range:1050,penetration:.38,recoil:1.2,cost:1800}
];

export function createCombatState(w:HsWeaponDef):HsCombatState {
  return {ammo:w.magazine,reserve:w.reserve,reloadTimer:0,fireTimer:0,recoil:0,shotCounter:0,grenades:2,grenadeCooldown:0};
}
export function startReload(s:HsCombatState,w:HsWeaponDef){
  if(s.reloadTimer<=0&&s.ammo<w.magazine&&s.reserve>0)s.reloadTimer=w.reloadTime;
}
export function stepWeapon(s:HsCombatState,w:HsWeaponDef,dt:number){
  s.fireTimer=Math.max(0,s.fireTimer-dt);
  s.grenadeCooldown=Math.max(0,s.grenadeCooldown-dt);
  s.recoil=Math.max(0,s.recoil-dt*.035);
  if(s.reloadTimer>0){
    s.reloadTimer=Math.max(0,s.reloadTimer-dt);
    if(s.reloadTimer===0){
      const take=Math.min(w.magazine-s.ammo,s.reserve);
      s.ammo+=take;s.reserve-=take;
    }
  }
}
export function consumeShot(s:HsCombatState,w:HsWeaponDef):boolean{
  if(s.reloadTimer>0||s.fireTimer>0)return false;
  if(s.ammo<=0){startReload(s,w);return false;}
  s.ammo--;s.fireTimer=w.fireInterval;s.recoil=Math.min(9,s.recoil+w.recoil);s.shotCounter++;
  if(s.ammo===0&&s.reserve>0)startReload(s,w);
  return true;
}

function pointInRect(x:number,y:number,o:HsObstacle){
  return x>=o.x&&x<=o.x+o.w&&y>=o.y&&y<=o.y+o.h;
}
export function segmentRectHit(x0:number,y0:number,x1:number,y1:number,o:HsObstacle){
  const dx=x1-x0,dy=y1-y0;
  let t0=0,t1=1;
  const clip=(p:number,q:number)=>{
    if(Math.abs(p)<1e-9)return q>=0;
    const r=q/p;
    if(p<0){if(r>t1)return false;if(r>t0)t0=r;}
    else{if(r<t0)return false;if(r<t1)t1=r;}
    return true;
  };
  if(!clip(-dx,x0-o.x)||!clip(dx,o.x+o.w-x0)||!clip(-dy,y0-o.y)||!clip(dy,o.y+o.h-y0))return null;
  return t0;
}
export function lineOfSight(ax:number,ay:number,bx:number,by:HsObstacle[]){
  return !by.some(o=>segmentRectHit(ax,ay,bx,by,o)!==null);
}
export function traceShot(s:HsShot,dt:number,obstacles:HsObstacle[]){
  const nx=s.x+s.vx*dt,ny=s.y+s.vy*dt;
  let bestT=1;
  for(const o of obstacles){
    const t=segmentRectHit(s.x,s.y,nx,ny,o);
    if(t!==null&&t<bestT)bestT=t;
  }
  if(bestT<1){
    s.x+=s.vx*dt*bestT;s.y+=s.vy*dt*bestT;
    const loss=.28;
    s.penetration-=loss;
    if(s.penetration>0){
      s.x+=s.vx*.8;s.y+=s.vy*.8;
      s.damage*=.62;
      return {blocked:false,hitObstacle:true};
    }
    return {blocked:true,hitObstacle:true};
  }
  s.x=nx;s.y=ny;s.life-=dt;
  return {blocked:false,hitObstacle:false};
}
export function spawnShots(x:number,y:number,angle:number,w:HsWeaponDef,owner:"player"|"enemy",shotId:number){
  const out:HsShot[]=[];
  for(let i=0;i<w.pellets;i++){
    const u=Math.random()*2-1;
    const a=angle+u*w.spread;
    out.push({x,y,vx:Math.cos(a)*w.muzzleSpeed,vy:Math.sin(a)*w.muzzleSpeed,damage:w.damage,life:w.range/w.muzzleSpeed,owner,penetration:w.penetration,weaponId:w.id,shotId:shotId+i,hitIds:new Set()});
  }
  return out;
}
export function recoilAngle(base:number,s:HsCombatState){
  return base+(Math.random()-.5)*s.recoil*.018;
}
export function updateAi(ai:HsAi,dt:number,visible:boolean,dist:number,playerX:number,playerY:number){
  ai.think=Math.max(0,ai.think-dt);
  if(visible){ai.lastSeenX=playerX;ai.lastSeenY=playerY;ai.alert=Math.min(180,ai.alert+10*dt);}
  else ai.alert=Math.max(0,ai.alert-dt);
  if(ai.think>0)return;
  ai.think=7;
  if(dist<80)ai.state="retreat";
  else if(visible&&dist<520)ai.state="attack";
  else if(ai.alert>0)ai.state="chase";
  else ai.state="idle";
  if(Math.random()<.25)ai.strafe=ai.strafe===0? (Math.random()<.5?-1:1) : -ai.strafe;
}
export function grenade(s:HsCombatState,x:number,y:number,angle:number){
  if(s.grenades<=0||s.grenadeCooldown>0)return null;
  s.grenades--;s.grenadeCooldown=42;
  return {x,y,vx:Math.cos(angle)*6.5,vy:Math.sin(angle)*6.5,life:70,radius:92,damage:55};
}
