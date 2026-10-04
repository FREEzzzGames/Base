import{HS_WEAPONS,createCombatState,consumeShot,startReload,stepWeapon,spawnShots,traceShot,lineOfSight,recoilAngle,grenade as makeGrenade,type HsCombatState,type HsObstacle}from"./freezzz-combat-core";
import * as VFX from"./cargo-deck-vfx";
type Mode="loadout"|"play"|"weapon"|"result";type Team="player"|"enemy";type MobType="brawler"|"shooter"|"sniper";type LoadoutId="ASSAULT"|"VANGUARD"|"RECON";
interface Mob{x:number;y:number;team:Team;type:MobType;hp:number;maxHp:number;speed:number;damage:number;range:number;cool:number;think:number;strafe:number;stuck:number;lastX:number;lastY:number;state:string;hit:number;lane:number;waypoint:number}
interface Node{x:number;y:number;team:Team;lane:number;hp:number;maxHp:number;cool:number}interface Bullet{x:number;y:number;vx:number;vy:number;life:number;damage:number;from:Team;penetration:number;weaponId:string;shotId:number;hitIds:Set<number>}interface Grenade{x:number;y:number;vx:number;vy:number;life:number;radius:number;damage:number}interface Pickup{x:number;y:number;kind:"medkit"|"weapon";weapon?:number;life:number}
interface Save{version:2;loadout:LoadoutId;weapon:number;inventory:number[];bestWave:number;bestKills:number;bestTime:number;medkits:number}
interface Player{x:number;y:number;hp:number;maxHp:number;armor:number;facing:number;medkits:number;weapon:number;combat:HsCombatState;hit:number;damagePulse:number}
const W=1000,H=2700,KEY="freezzz:cargo-deck:v2";
const cargoFloorImage=new Image();
const cargoFloorUrl=new URL("../cargo-deck-floor.svg",import.meta.url).href;
cargoFloorImage.src=cargoFloorUrl;
let cargoFloorPattern:CanvasPattern|null=null;
const PLAYER_SPAWN={x:500,y:2420} as const;
const LOAD:Record<LoadoutId,{name:string;color:string;hp:number;armor:number;speed:number;ability:string;cd:number;dur:number}>={
ASSAULT:{name:"ASSAULT",color:"#54d6d8",hp:120,armor:35,speed:3.35,ability:"OVERDRIVE",cd:420,dur:180},
VANGUARD:{name:"VANGUARD",color:"#ffb04f",hp:150,armor:65,speed:2.95,ability:"BULWARK",cd:480,dur:210},
RECON:{name:"RECON",color:"#9f83d6",hp:105,armor:25,speed:3.7,ability:"FOCUS",cd:360,dur:150}};
const OBS:HsObstacle[]=[
{x:82,y:330,w:175,h:88},{x:743,y:330,w:175,h:88},{x:330,y:490,w:150,h:72},{x:550,y:490,w:150,h:72},
{x:72,y:720,w:150,h:74},{x:778,y:720,w:150,h:74},{x:292,y:875,w:142,h:72},{x:566,y:875,w:142,h:72},
{x:112,y:1110,w:182,h:88},{x:706,y:1110,w:182,h:88},{x:372,y:1280,w:96,h:68},{x:532,y:1280,w:96,h:68},
{x:86,y:1510,w:170,h:82},{x:744,y:1510,w:170,h:82},{x:310,y:1680,w:150,h:72},{x:540,y:1680,w:150,h:72},
{x:112,y:1935,w:175,h:86},{x:713,y:1935,w:175,h:86},{x:350,y:2110,w:120,h:70},{x:530,y:2110,w:120,h:70},
{x:170,y:2300,w:145,h:76},{x:685,y:2300,w:145,h:76}];
const LANE_ROUTES:ReadonlyArray<ReadonlyArray<{x:number;y:number}>>=[
  // Deterministic corridors with 18px collision radius clearance.
  // Lanes shift only where a container row blocks the nominal x position.
  [{x:300,y:450},{x:300,y:650},{x:270,y:845},{x:270,y:1045},{x:300,y:1240},{x:300,y:1450},{x:285,y:1645},{x:285,y:1865},{x:305,y:2080},{x:305,y:2200},{x:320,y:2250}],
  [{x:500,y:450},{x:500,y:650},{x:500,y:845},{x:500,y:1045},{x:500,y:1240},{x:500,y:1450},{x:500,y:1645},{x:500,y:1865},{x:500,y:2080},{x:500,y:2200}],
  [{x:700,y:450},{x:700,y:650},{x:730,y:845},{x:730,y:1045},{x:700,y:1240},{x:700,y:1450},{x:715,y:1645},{x:715,y:1865},{x:695,y:2080},{x:695,y:2200},{x:680,y:2250}]
];
let root:HTMLElement|null=null,canvas:HTMLCanvasElement|null=null,ctx:CanvasRenderingContext2D|null=null,ui:HTMLElement|null=null;
let mode:Mode="loadout",sel:LoadoutId="ASSAULT",save:Save=def(),player!:Player,mobs:Mob[]=[],nodes:Node[]=[],core={x:500,y:250,hp:2600,maxHp:2600};
let bullets:Bullet[]=[],grenades:Grenade[]=[],pickups:Pickup[]=[],effects:{x:number;y:number;text:string;color:string;life:number;vy:number}[]=[],wave=0,kills=0,time=0,waveWait=0,won=false,resultReason="",waveState:"fighting"|"clear"="fighting",waveStart=0,msg="",msgT=0;
let frame=0,last=0,raf=0,cam=0,viewW=0,viewH=0,moveX=0,moveY=0,moveOriginX=0,moveOriginY=0,aim=0,auto=true,fireHeld=false,moveId:number|null=null,aimId:number|null=null,ability=0,abilityCd=0,muzzleFlash=0;
let combatTouchId:number|null=null,combatStartX=0,combatStartY=0,combatLastX=0,combatLastY=0,combatMoved=false,combatTapTimer=0,combatTapPending=false;let cleanup=()=>{};
let obsCache:HsObstacle[]|null=null,obsFrame=-1;
let obsGradients:CanvasGradient[]|null=null,obsGradCtx:CanvasRenderingContext2D|null=null;
function ensureObsGradients():CanvasGradient[]{if(obsGradients&&obsGradCtx===ctx)return obsGradients;obsGradCtx=ctx;obsGradients=OBS.map(o=>{const g=ctx!.createLinearGradient(o.x,o.y,o.x+o.w,o.y+o.h);g.addColorStop(0,"#3b464b");g.addColorStop(.55,"#242d31");g.addColorStop(1,"#171d20");return g});return obsGradients}
function def():Save{return{version:2,loadout:"ASSAULT",weapon:0,inventory:[0,1,3],bestWave:0,bestKills:0,bestTime:0,medkits:3}}
function load(){try{save={...def(),...JSON.parse(localStorage.getItem(KEY)||"{}")};save.inventory=[...new Set((save.inventory||[]).filter(n=>n>=0&&n<HS_WEAPONS.length))];if(!save.inventory.includes(0))save.inventory.unshift(0)}catch{save=def()}sel=save.loadout}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(save))}catch{}}
function L(){return LOAD[sel]}function weapon(){return HS_WEAPONS[player?.weapon??save.weapon]||HS_WEAPONS[0]}
function anyHit(obs:HsObstacle[],x:number,y:number,r:number):boolean{for(let i=0;i<obs.length;i++){const o=obs[i];const nx=Math.max(o.x,Math.min(x,o.x+o.w)),ny=Math.max(o.y,Math.min(y,o.y+o.h));const dx=x-nx,dy=y-ny;if(dx*dx+dy*dy<r*r)return true}return false}
function hitCircle(x:number,y:number,r:number,o:HsObstacle){const nx=Math.max(o.x,Math.min(x,o.x+o.w)),ny=Math.max(o.y,Math.min(y,o.y+o.h));const dx=x-nx,dy=y-ny;return dx*dx+dy*dy<r*r}
function obstacles(){if(obsCache&&obsFrame===frame)return obsCache;obsCache=OBS.map(o=>({...o}));for(const n of nodes)if(n.hp>0)obsCache.push({x:n.x-34,y:n.y-44,w:68,h:72});obsFrame=frame;return obsCache}
function move(x:number,y:number,dx:number,dy:number,r:number){const o=obstacles(),steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/4)),sx=dx/steps,sy=dy/steps;for(let i=0;i<steps;i++){let nx=Math.max(r,Math.min(W-r,x+sx));if(!anyHit(o,nx,y,r))x=nx;else{let lo=0,hi=1;for(let k=0;k<7;k++){const m=(lo+hi)/2;if(!anyHit(o,Math.max(r,Math.min(W-r,x+sx*m)),y,r))lo=m;else hi=m}x=Math.max(r,Math.min(W-r,x+sx*lo))}let ny=Math.max(180,Math.min(H-r,y+sy));if(!anyHit(o,x,ny,r))y=ny;else{let lo=0,hi=1;for(let k=0;k<7;k++){const m=(lo+hi)/2;if(!anyHit(o,x,Math.max(180,Math.min(H-r,y+sy*m)),r))lo=m;else hi=m}y=Math.max(180,Math.min(H-r,y+sy*lo))}}return[x,y]as const}
function freePoint(a:number,b:number,r=20){for(let i=0;i<40;i++){const x=70+Math.random()*(W-140),y=a+Math.random()*(b-a);if(!obstacles().some(o=>hitCircle(x,y,r,o))&&Math.hypot(x-player.x,y-player.y)>360)return[x,y]as const}return[500,a+60]as const}
function reset(){const l=L(),w=HS_WEAPONS[save.weapon]||HS_WEAPONS[0];player={x:PLAYER_SPAWN.x,y:PLAYER_SPAWN.y,hp:l.hp,maxHp:l.hp,armor:l.armor,facing:-1,medkits:Math.min(5,save.medkits),weapon:save.weapon,combat:createCombatState(w),hit:0,damagePulse:0};ability=abilityCd=0}
function init(){mobs=[];bullets=[];grenades=[];pickups=[];effects=[];nodes=[];core={x:500,y:250,hp:2600,maxHp:2600};wave=kills=0;time=waveWait=0;waveStart=0;waveState="fighting";msgT=0;won=false;[250,500,750].forEach((x,l)=>{nodes.push({x,y:350,team:"enemy",lane:l,hp:900,maxHp:900,cool:20});nodes.push({x,y:2280,team:"player",lane:l,hp:900,maxHp:900,cool:0})});for(let i=0;i<6;i++)spawnPickup();spawnWave()}
function spawnPickup(){const[x,y]=freePoint(430,2200,30);if(Math.random()<.4)pickups.push({x,y,kind:"medkit",life:99999});else{const locked=Array.from({length:HS_WEAPONS.length},(_,n)=>n).filter(n=>!save.inventory.includes(n));const w=locked.length?locked[Math.floor(Math.random()*locked.length)]:Math.floor(Math.random()*HS_WEAPONS.length);pickups.push({x,y,kind:"weapon",weapon:w,life:99999})}}
function spawnWave(){
  wave++;
  waveWait=0;
  waveState="fighting";
  waveStart=frame;

  // Spawn directly at the enemy base / enemy tower line.
  // Enemies now enter the arena from their own rear deployment zone
  // instead of materialising near the player.
  const total=Math.min(12,5+Math.floor(wave*.7));
  const b=Math.max(2,Math.round(total*.42));
  const s=Math.max(1,Math.round(total*.34));
  const lanes=[300,500,700];

  for(let i=0;i<total;i++){
    const type:MobType=i<b?"brawler":i<b+s?"shooter":"sniper";
    const lane=i%3;
    const baseHp=type==="brawler"?125:type==="shooter"?98:88;
    const scale=Math.min(2.35,1+(wave-1)*.10);
    const speed=(type==="brawler"?1.38:type==="shooter"?1.05:.78)*(1+Math.min(.20,(wave-1)*.012));

    let sx=lanes[lane],sy=390+Math.random()*36;
    let found=false;
    for(let tries=0;tries<18;tries++){
      const x=lanes[(lane+tries)%lanes.length]+(Math.random()-.5)*34;
      const y=390+Math.random()*36;
      if(!obstacles().some(o=>hitCircle(x,y,18,o))&&Math.hypot(x-player.x,y-player.y)>340){
        sx=x;sy=y;found=true;break;
      }
    }
    if(!found){
      // Deterministic safe fallbacks for the three lanes.
      const fallback=[[300,408],[500,408],[700,408]] as const;
      const q=fallback[lane];
      sx=q[0];sy=q[1];
    }

    mobs.push({
      x:sx,y:sy,team:"enemy",type,
      hp:baseHp*scale,maxHp:baseHp*scale,
      speed,damage:type==="brawler"?24:type==="shooter"?15:28,
      range:type==="brawler"?42:type==="shooter"?210:430,
      cool:30+Math.random()*30,think:type==="sniper"?18:0,strafe:i%2?-1:1,
      stuck:0,lastX:sx,lastY:sy,state:"inbound",hit:0,lane,waypoint:0
    });
  }

  msg="WAVE "+String(wave).padStart(2,"0")+" · "+total+" HOSTILES";
  msgT=110;
  effects.push({x:500,y:2035,text:"INBOUND",color:"#ff557d",life:70,vy:-.25});
}function hurt(a:number){
  const block=Math.min(player.armor,a*.5);
  player.armor-=block;
  player.hp=Math.max(0,player.hp-(a-block));
  player.hit=1;
  player.damagePulse=1;
  floatText(player.x,player.y-88,"-"+Math.max(1,Math.round(a-block)),"#ff557d");
  if(player.hp<=0)finish(false,"ОПЕРАТОР ПОГИБ · CARGO CORE НЕ ПОВРЕЖДЁН");
}
function floatText(x:number,y:number,text:string,color:string){
  effects.push({x,y,text,color,life:42,vy:-.45});
}
function damage(m:Mob,a:number){
  if(m.hp<=0)return;
  m.hp=Math.max(0,m.hp-a);
  m.hit=1;
  m.state="hit";
  VFX.emitHitFlash(m.x,m.y);
  VFX.emitImpact(m.x,m.y,Math.atan2(m.y-player.y,m.x-player.x));
  floatText(m.x,m.y-70,"-"+Math.max(1,Math.round(a)),m.type==="brawler"?"#ff557d":"#f0eee7");
  if(m.hp===0&&m.team==="enemy"){
    kills++;
    floatText(m.x,m.y-95,"DOWN","#54d6d8");
    VFX.emitDeath(m.x,m.y,m.type==="sniper"?VFX.VFX_COLORS.PURPLE:m.type==="shooter"?VFX.VFX_COLORS.CYAN:VFX.VFX_COLORS.CRIMSON);
    if(Math.random()<.22)pickups.push({x:m.x,y:m.y,kind:Math.random()<.65?"medkit":"weapon",weapon:Math.floor(Math.random()*HS_WEAPONS.length),life:99999});
  }
}
function enemyTarget(x:number,y:number,r:number){
  let best:Mob|undefined,bd=r*r,o=obstacles();
  for(const m of mobs){
    if(m.team!=="enemy"||m.hp<=0)continue;
    const dx=m.x-x,dy=m.y-y,d=dx*dx+dy*dy;
    if(d>=bd)continue;
    if(!lineOfSight(x,y,m.x,m.y,o))continue;
    bd=d;best=m;
  }
  return best;
}
function playerTarget(x:number,y:number,r:number){
  const dx=player.x-x,dy=player.y-y,d=Math.hypot(dx,dy);
  if(d>r||!lineOfSight(x,y,player.x,player.y,obstacles()))return null;
  return {x:player.x,y:player.y,d};
}
function nearestPlayerNode(x:number,y:number){
  let best:Node|undefined,bd=Infinity;
  for(const n of nodes){
    if(n.team!=="player"||n.hp<=0)continue;
    const dx=n.x-x,dy=n.y-y,d=dx*dx+dy*dy;
    if(d<bd){bd=d;best=n}
  }
  return best;
}
function stepMob(m:Mob,tx:number,ty:number,dt:number){const dx=tx-m.x,dy=ty-m.y,len=Math.hypot(dx,dy)||1,nx=dx/len,ny=dy/len,st=Math.max(.7,m.speed*dt),sx=m.x,sy=m.y,q=move(sx,sy,nx*st,ny*st,18);if(Math.hypot(q[0]-sx,q[1]-sy)>.1){m.x=q[0];m.y=q[1];return}let bx=sx,by=sy,best=Infinity,moved=0;for(const r of[st*2,st*3.5,st*5.5])for(const a of[0,.45,-.45,.9,-.9,1.35,-1.35,Math.PI]){const c=Math.cos(a),s=Math.sin(a),p=move(sx,sy,(nx*c-ny*s)*r,(ny*c+nx*s)*r,18),md=Math.hypot(p[0]-sx,p[1]-sy),score=Math.hypot(p[0]-tx,p[1]-ty)-md*.25;if(md>.1&&score<best){best=score;bx=p[0];by=p[1];moved=md}}if(moved){m.x=bx;m.y=by;return}const b=move(sx,sy,-nx*st*2.4,-ny*st*2.4,18);if(Math.hypot(b[0]-sx,b[1]-sy)>.1){m.x=b[0];m.y=b[1]}}
function laneAdvance(m:Mob,dt:number){
  const route=LANE_ROUTES[m.lane]||LANE_ROUTES[1];
  if(m.waypoint>=route.length)return false;
  const g=route[m.waypoint];
  const d=Math.hypot(g.x-m.x,g.y-m.y);
  if(d<26){
    m.waypoint++;
    if(m.waypoint>=route.length)return false;
  }
  const q=route[Math.min(m.waypoint,route.length-1)];
  stepMob(m,q.x,q.y,dt);
  m.state="lane-"+String(m.lane+1);
  return true;
}
function updateMob(m:Mob,dt:number){
  if(m.hp<=0)return;
  m.cool-=dt;
  m.hit=Math.max(0,m.hit-dt*.1);

  // Every enemy owns a lane and follows explicit CARGO-DECK waypoints.
  // This keeps the three attack groups separated and makes container
  // crossings deterministic instead of relying on random local steering.
  const laneActive=laneAdvance(m,dt);

  // Enemies outside the current combat viewport may advance, but they
  // cannot damage/fire at the player until they are actually visible.
  // This prevents "invisible sniper" shots entering from behind the HUD.
  const combatCam=Math.max(0,Math.min(H-viewH,player.y-viewH*.58));
  const visible=m.x>-20&&m.x<viewW+20&&m.y>combatCam-20&&m.y<combatCam+viewH+20;
  const playerAttack=visible?playerTarget(m.x,m.y,m.range):null;
  const playerSight=visible?playerTarget(m.x,m.y,760):null;

  if(playerAttack){
    const d=Math.hypot(playerAttack.x-m.x,playerAttack.y-m.y);
    if(m.type==="brawler"){
      m.state="attack";
      if(m.cool<=0&&d<55){m.cool=44;hurt(m.damage)}
      else if(!laneActive&&d>48)stepMob(m,playerAttack.x,playerAttack.y,dt);
    }else if(m.type==="sniper"){
      if(m.think>0){
        m.think=Math.max(0,m.think-dt);
        m.state="telegraph";
        if(d<360*.82&&!laneActive){
          stepMob(m,m.x-(playerAttack.y-m.y)*m.strafe,m.y+(playerAttack.x-m.x)*m.strafe,dt*.35);
        }
        if(m.think<=0){
          const aa=Math.atan2(playerAttack.y-m.y,playerAttack.x-m.x);
          const w=HS_WEAPONS[5];
          for(const sh of spawnShots(m.x,m.y,aa,w,"enemy",frame+Math.floor(m.x))){
            bullets.push(sh);
            VFX.emitTracer(m.x,m.y,sh.vx,sh.vy,.075,VFX.VFX_COLORS.PURPLE,1.5,.55);
          }
          m.cool=78;
        }
      }else if(m.cool<=0){
        m.think=32;
        m.state="telegraph";
      }
      if(!laneActive&&m.think<=0){
        if(d>360)stepMob(m,playerAttack.x,playerAttack.y,dt);
        else stepMob(m,m.x-(playerAttack.y-m.y)*m.strafe,m.y+(playerAttack.x-m.x)*m.strafe,dt*.7);
      }
    }else{
      m.state="attack";
      if(m.cool<=0){
        m.cool=30;
        const w=HS_WEAPONS[1];
        const aa=Math.atan2(playerAttack.y-m.y,playerAttack.x-m.x);
        for(const sh of spawnShots(m.x,m.y,aa,w,"enemy",frame+Math.floor(m.x))){
        bullets.push(sh);
        VFX.emitTracer(m.x,m.y,sh.vx,sh.vy,.07,VFX.VFX_COLORS.CYAN,1.25,.5);
      }
      }
      if(!laneActive){
        if(d>165)stepMob(m,playerAttack.x,playerAttack.y,dt);
        else stepMob(m,m.x-(playerAttack.y-m.y)*m.strafe,m.y+(playerAttack.x-m.x)*m.strafe,dt*.7);
      }
    }
  }else if(playerSight){
    // Sight never overrides the lane route. Once the route is complete,
    // normal combat pursuit takes over.
    m.state="chase";
    if(!laneActive)stepMob(m,playerSight.x,playerSight.y,dt);
  }else{
    const n=nearestPlayerNode(m.x,m.y);
    if(n){
      const d=Math.hypot(n.x-m.x,n.y-m.y);
      if(d>m.range){
        m.state="advance-node";
        if(!laneActive)stepMob(m,n.x,n.y,dt);
      }else if(m.cool<=0){
        m.state="attack-node";
        m.cool=48;
        n.hp=Math.max(0,n.hp-m.damage);
      }
    }else{
      const d=Math.hypot(core.x-m.x,core.y-m.y);
      if(d>115){
        m.state="advance-core";
        if(!laneActive)stepMob(m,core.x,core.y,dt);
      }else if(m.cool<=0){
        m.state="attack-core";
        m.cool=48;
        core.hp=Math.max(0,core.hp-m.damage);
      }
    }
  }

  // Stuck detection now runs even when the mob is attacking/chasing.
  const md=Math.hypot(m.x-m.lastX,m.y-m.lastY);
  m.stuck=md<.15?m.stuck+dt:Math.max(0,m.stuck-dt*2);
  m.lastX=m.x;m.lastY=m.y;
  if(m.stuck>30){
    const route=LANE_ROUTES[m.lane]||LANE_ROUTES[1];
    const g=route[Math.min(m.waypoint,route.length-1)]||{x:500,y:2200};
    const side=m.strafe||1;
    const q=move(m.x,m.y,side*42,(g.y>=m.y?24:-24),18);
    m.x=q[0];m.y=q[1];m.stuck=0;
  }
}
function resolve(){
  const a=mobs.filter(m=>m.hp>0);
  for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++){
    const x=a[i],y=a[j],dx=y.x-x.x,dy=y.y-x.y,d=Math.hypot(dx,dy)||.01;
    if(d>=48)continue;
    const p=(48-d)*.5,nx=dx/d,ny=dy/d;
    const A=move(x.x,x.y,-nx*p,-ny*p,18);
    const B=move(y.x,y.y,nx*p,ny*p,18);
    x.x=A[0];x.y=A[1];y.x=B[0];y.y=B[1];
  }
}
function fire(manual=false){if(mode!=="play")return;const w=weapon();if(player.combat.reloadTimer>0)return;let a=aim;if(auto&&!manual){const t=enemyTarget(player.x,player.y,w.range);if(!t)return;a=Math.atan2(t.y-player.y,t.x-player.x)}if(!consumeShot(player.combat,w))return;const hx=player.x+player.facing*25,hy=player.y-22;a=recoilAngle(a,player.combat);for(const s of spawnShots(hx,hy,a,w,"player",player.combat.shotCounter*100)){
  bullets.push({...s});
  VFX.emitTracer(hx,hy,s.vx,s.vy,.06,VFX.VFX_COLORS.CYAN,1.5,.65);
}
VFX.emitMuzzleFlash(hx,hy,a,Math.min(1.25,Math.max(.7,w.damage/32)));
muzzleFlash=1}
function grenade(){const g=makeGrenade(player.combat,player.x,player.y,aim);if(g)grenades.push(g)}
function medkit(){if(player.medkits>0&&player.hp<player.maxHp){player.medkits--;player.hp=Math.min(player.maxHp,player.hp+40);save.medkits=player.medkits;persist();msg="АПТЕЧКА · +40 HP";msgT=60}}
function special(){if(abilityCd>0)return;abilityCd=L().cd;ability=L().dur;if(sel==="ASSAULT")mobs.forEach(m=>{if(m.team==="enemy")m.cool=Math.max(m.cool,80)});if(sel==="VANGUARD")player.armor=Math.max(player.armor,90);if(sel==="RECON")auto=true;msg=L().ability;msgT=70}
function update(dt:number){
  frame++;
  time+=dt/60;
  msgT=Math.max(0,msgT-dt);
  muzzleFlash=Math.max(0,muzzleFlash-dt*.12);
  player.hit=Math.max(0,player.hit-dt*.1);
  player.damagePulse=Math.max(0,player.damagePulse-dt*.07);
  ability=Math.max(0,ability-dt);
  abilityCd=Math.max(0,abilityCd-dt);

  VFX.updateVFX(dt);
  for(const e of effects){
    e.y+=e.vy*dt;
    e.life-=dt;
  }
  let ei=0;while(ei<effects.length){if(effects[ei].life<=0){effects[ei]=effects[effects.length-1];effects.pop();continue}ei++}

  const w=weapon(),l=L();
  stepWeapon(player.combat,w,dt);

  if(moveX||moveY){
    const n=Math.hypot(moveX,moveY)||1;
    const speed=l.speed*(ability&&sel==="ASSAULT"?1.25:1);
    const q=move(player.x,player.y,moveX/n*speed*dt,moveY/n*speed*dt,18);
    player.x=q[0];player.y=q[1];
  }

  if(auto)fire(false);
  else if(fireHeld)fire(true);

  for(const m of mobs)updateMob(m,dt);
  updateBullets(dt);
  updateGrenades(dt);
  updatePickups(dt);
  updateNodes(dt);

  mobs=mobs.filter(m=>m.hp>0);
  resolve();

  // Волна заканчивается только после уничтожения всех противников.
  // После короткого окна отдыха появляется следующая волна.
  if(waveState==="fighting"&&mobs.length===0){
    waveState="clear";
    waveWait=0;
    msg="ЗОНА ЧИСТА · ПЕРЕГРУППИРОВКА";
    msgT=100;
  }

  if(waveState==="clear"){
    waveWait+=dt;

    if(wave>=12){
      finish(true,"CARGO DECK SECURED · ALL WAVES CLEARED");
      return;
    }

    if(waveWait>150)spawnWave();
  }

  if(core.hp<=0){
    finish(false,"CARGO CORE DESTROYED");
    return;
  }

  save.bestWave=Math.max(save.bestWave,wave);
  save.bestKills=Math.max(save.bestKills,kills);
  save.bestTime=Math.max(save.bestTime,time);
  persist();
}function updateBullets(dt:number){
  const o=obstacles();

  for(const b of bullets){
    const r=traceShot(b,dt,o);

    // Попадание игрока по вражеской башне: башня остаётся физическим
    // препятствием, но получает урон в момент контакта с пулей.
    if(b.from==="player"){
      for(const n of nodes){
        if(n.team!=="enemy"||n.hp<=0)continue;
        if(Math.hypot(b.x-n.x,b.y-n.y)<50){
          n.hp=Math.max(0,n.hp-b.damage);
          floatText(n.x,n.y-70,"-"+Math.round(b.damage),"#ff557d");
          b.life=0;
          break;
        }
      }
    }

    if(b.life<=0)continue;
    if(r.blocked){b.life=0;continue}

    if(b.from==="enemy"&&Math.hypot(b.x-player.x,b.y-player.y)<20){
      b.life=0;
      hurt(Math.max(3,b.damage*.38));
      continue;
    }

    if(b.from==="player"){
      for(let i=0;i<mobs.length;i++){
        const m=mobs[i];
        if(m.hp<=0||b.hitIds.has(i))continue;
        if(Math.hypot(b.x-m.x,b.y-m.y)<25){
          b.hitIds.add(i);
          damage(m,b.damage);
          b.damage*=.62;
          b.penetration-=.12;
          if(b.penetration<=0)b.life=0;
          break;
        }
      }
    }
  }

  let bi=0;while(bi<bullets.length){const b=bullets[bi];if(b.life<=0||b.x<-80||b.x>W+80||b.y<-80||b.y>H+80){bullets[bi]=bullets[bullets.length-1];bullets.pop();continue}bi++}
}function updateGrenades(dt:number){for(const g of grenades){
  g.x+=g.vx*dt;g.y+=g.vy*dt;g.vx*=.94;g.vy*=.94;g.life-=dt;
  if(g.life<=0){
    VFX.emitExplosion(g.x,g.y,g.radius);
    for(const m of mobs)if(m.hp>0){const d=Math.hypot(m.x-g.x,m.y-g.y);if(d<g.radius)damage(m,g.damage*(1-d/g.radius));
    }
  }
}
grenades=grenades.filter(g=>g.life>0)}
function updatePickups(dt:number){for(let i=pickups.length-1;i>=0;i--){const p=pickups[i];if(Math.hypot(player.x-p.x,player.y-p.y)>40)continue;if(p.kind==="medkit"){if(player.medkits>=5)continue;player.medkits++;save.medkits=player.medkits;msg="АПТЕЧКА +1";msgT=60}else if(typeof p.weapon==="number"){if(!save.inventory.includes(p.weapon)){save.inventory.push(p.weapon);msg="ОРУЖИЕ ДОБАВЛЕНО · "+HS_WEAPONS[p.weapon].name}else{player.combat.reserve=Math.min(player.combat.reserve+HS_WEAPONS[p.weapon].magazine*2,HS_WEAPONS[p.weapon].magazine*12);msg="БОЕПРИПАСЫ · "+HS_WEAPONS[p.weapon].name}msgT=80;persist()}pickups.splice(i,1)}if(frame%360===0&&pickups.length<10)spawnPickup()}
function updateNodes(dt:number){
  const o=obstacles();

  for(const n of nodes){
    if(n.hp<=0)continue;
    n.cool-=dt;
    if(n.cool>0)continue;

    if(n.team==="player"){
      let target:Mob|undefined;
      let best=420*420;

      for(const m of mobs){
        if(m.hp<=0)continue;
        const dx=m.x-n.x,dy=m.y-n.y,d=dx*dx+dy*dy;
        if(d<best&&lineOfSight(n.x,n.y,m.x,m.y,o)){
          best=d;
          target=m;
        }
      }

      if(target){
        n.cool=54;
        damage(target,7);
      }
    }else{
      const d=Math.hypot(player.x-n.x,player.y-n.y);
      if(d<440&&lineOfSight(n.x,n.y,player.x,player.y,o)){
        n.cool=60;
        hurt(7);
        floatText(player.x,player.y-105,"TOWER","#ffb04f");
      }
    }
  }
}function finish(ok:boolean,text:string){if(mode==="result")return;won=ok;resultReason=text;msg=text;mode="result";save.bestWave=Math.max(save.bestWave,wave);save.bestKills=Math.max(save.bestKills,kills);save.bestTime=Math.max(save.bestTime,time);persist();render()}
function choose(id:LoadoutId){sel=id;save.loadout=id;persist();render()}function start(){save.weapon=save.inventory.includes(save.weapon)?save.weapon:save.inventory[0];persist();reset();init();mode="play";resultReason="";render()}function chooseWeapon(n:number){if(!save.inventory.includes(n))return;save.weapon=n;player.weapon=n;player.combat=createCombatState(HS_WEAPONS[n]);persist();mode="play";render()}function exit(){mode="loadout";render();window.dispatchEvent(new CustomEvent("freezzz:navigate",{detail:{view:"home"}}))}
function txt(t:string,x:number,y:number,s:number,c:string,a:CanvasTextAlign="left"){ctx!.save();ctx!.font="700 "+s+"px monospace";ctx!.fillStyle=c;ctx!.textAlign=a;ctx!.textBaseline="middle";ctx!.fillText(t,x,y);ctx!.restore()}function bar(x:number,y:number,w:number,h:number,v:number,m:number,c:string){ctx!.fillStyle="#11181b";ctx!.fillRect(x,y,w,h);ctx!.fillStyle=c;ctx!.fillRect(x,y,w*Math.max(0,Math.min(1,v/m)),h)}function rect(x:number,y:number,w:number,h:number,c:string){ctx!.fillStyle=c;ctx!.fillRect(x,y,w,h)}function sy(y:number){return y-cam}
function drawLoadout(){rect(0,0,viewW,viewH,"#070b0e");txt("FREEzzyPortal",viewW/2,48,24,"#f0eee7","center");txt("CARGO DECK",viewW/2,82,13,"#54d6d8","center");(["ASSAULT","VANGUARD","RECON"]as LoadoutId[]).forEach((id,i)=>{const y=135+i*145,l=LOAD[id],a=id===sel;rect(26,y,viewW-52,116,"#11191d");ctx!.strokeStyle=a?l.color:"#3b474b";ctx!.lineWidth=a?2:1;ctx!.strokeRect(26,y,viewW-52,116);ctx!.fillStyle=l.color;ctx!.shadowColor=l.color;ctx!.shadowBlur=15;ctx!.beginPath();ctx!.ellipse(72,y+56,22,34,0,0,Math.PI*2);ctx!.fill();ctx!.shadowBlur=0;txt(l.name,110,y+25,18,l.color);txt(l.ability,110,y+51,11,"#f0eee7");txt("HP "+l.hp+" · ARMOR "+l.armor+" · SPEED "+l.speed.toFixed(2),110,y+75,10,"#8e9b9f");txt(a?"SELECTED":"TAP TO SELECT",viewW-38,y+96,9,a?l.color:"#7b888c","right")});txt("OPEN WEAPONS "+save.inventory.length+"/"+HS_WEAPONS.length,viewW/2,595,11,"#aeb8ba","center");txt("BEST WAVE "+save.bestWave+" · BEST KILLS "+save.bestKills,viewW/2,620,10,"#66757a","center")}
function drawWeapon(){rect(0,0,viewW,viewH,"#070b0e");txt("ARSENAL",viewW/2,35,22,"#f0eee7","center");txt("РУЧНОЙ ВЫБОР · PICKUP НЕ ПЕРЕКЛЮЧАЕТ ОРУЖИЕ",viewW/2,60,8,"#66757a","center");const h=Math.min(68,(viewH-135)/Math.max(1,save.inventory.length));save.inventory.forEach((id,i)=>{const y=78+i*(h+5),w=HS_WEAPONS[id],a=id===player.weapon;rect(24,y,viewW-48,h,"#11191d");ctx!.strokeStyle=a?L().color:"#344146";ctx!.strokeRect(24,y,viewW-48,h);txt(String(i+1).padStart(2,"0"),38,y+h*.3,9,"#66757a");txt(w.name,72,y+h*.3,14,a?L().color:"#f0eee7");txt("DMG "+w.damage+" · MAG "+w.magazine+" · "+Math.round(3600/w.fireInterval)+" RPM",72,y+h*.65,9,"#8e9b9f")});txt("TAP CARD / NUMBER KEY",viewW/2,viewH-25,10,"#aeb8ba","center")}
function drawResult(){rect(0,0,viewW,viewH,"#05090b");const c=won?"#54d6d8":"#ff557d";txt("CARGO DECK",viewW/2,90,24,c,"center");txt(won?"CARGO DECK SECURED":(resultReason||"MISSION FAILED"),viewW/2,135,17,"#f0eee7","center");txt("WAVE "+String(wave).padStart(2,"0"),viewW/2,205,15,c,"center");txt("ENEMIES DESTROYED · "+kills,viewW/2,245,12,"#aeb8ba","center");txt("SURVIVAL TIME · "+fmt(time),viewW/2,278,12,"#aeb8ba","center");txt("CORE INTEGRITY · "+Math.round(core.hp/core.maxHp*100)+"%",viewW/2,311,12,"#aeb8ba","center");txt(won?"ARENA SECURED":"RETRY AVAILABLE",viewW/2,390,12,c,"center")}
function fmt(s:number){return String(Math.floor(s/60)).padStart(2,"0")+":"+String(Math.floor(s%60)).padStart(2,"0")}
function drawPlayer(){
 const c=L().color,px=player.x,py=player.y,a=aim,side=player.facing||1;
 ctx!.save();

 // Ground contact and directional operator halo.
 ctx!.globalAlpha=.32;ctx!.fillStyle="#000";ctx!.beginPath();ctx!.ellipse(px,py+21,31,9,0,0,Math.PI*2);ctx!.fill();ctx!.globalAlpha=.14;
 ctx!.fillStyle=c;ctx!.beginPath();ctx!.arc(px,py-18,47+Math.sin(frame*.08)*2,0,Math.PI*2);ctx!.fill();ctx!.globalAlpha=1;

 // Compact armored silhouette.
 ctx!.shadowColor=c;ctx!.shadowBlur=player.hit>0?30:16;
 ctx!.fillStyle="#172126";ctx!.beginPath();ctx!.ellipse(px,py-20,27,39,0,0,Math.PI*2);ctx!.fill();ctx!.shadowBlur=0;
 ctx!.fillStyle="#26343a";ctx!.fillRect(px-15,py-38,30,29);
 ctx!.strokeStyle=c;ctx!.lineWidth=1.5;ctx!.strokeRect(px-15,py-38,30,29);

 // Helmet / visor.
 ctx!.fillStyle="#0a1115";ctx!.beginPath();ctx!.arc(px,py-48,11,0,Math.PI*2);ctx!.fill();
 ctx!.fillStyle=c;ctx!.shadowColor=c;ctx!.shadowBlur=7;ctx!.fillRect(px-8,py-50,16,3);ctx!.shadowBlur=0;

 // Chest energy line.
 ctx!.globalAlpha=.72;ctx!.fillStyle=c;ctx!.fillRect(px-10,py-26,20,2);ctx!.globalAlpha=1;

 // Arms and weapon direction.
 const hx=px+Math.cos(a)*14,hy=py-27+Math.sin(a)*14;
 ctx!.strokeStyle="#87979c";ctx!.lineWidth=7;ctx!.lineCap="round";
 ctx!.beginPath();ctx!.moveTo(px-12,py-25);ctx!.lineTo(hx,hy);ctx!.moveTo(px+11,py-21);ctx!.lineTo(hx+Math.cos(a)*5,hy+Math.sin(a)*5);ctx!.stroke();

 const recoil=Math.min(5,player.combat.recoil*.28);
 const gunLen=[42,50,56,62,68,76,84,72,98][player.weapon]||48;
 const gx=px+Math.cos(a)*(19+side*4)-Math.cos(a)*recoil,gy=py-27+Math.sin(a)*(19+side*4)-Math.sin(a)*recoil;
 ctx!.save();ctx!.translate(gx,gy);ctx!.rotate(a);
 ctx!.fillStyle="#080d10";ctx!.fillRect(-14,-5,gunLen+16,10);
 ctx!.fillStyle="#35454a";ctx!.fillRect(-7,-4,Math.max(20,gunLen-21),7);
 ctx!.fillStyle=c;ctx!.shadowColor=c;ctx!.shadowBlur=5;ctx!.fillRect(3,-2,Math.max(10,gunLen-28),3);ctx!.shadowBlur=0;
 ctx!.fillStyle="#11191d";ctx!.fillRect(Math.max(8,gunLen*.38),4,7,13);
 ctx!.strokeStyle="#6e7b7f";ctx!.lineWidth=1;ctx!.strokeRect(Math.max(8,gunLen*.38),4,7,13);
 ctx!.fillStyle="#11191d";ctx!.fillRect(-17,-3,9,7);ctx!.fillRect(gunLen-2,-3,17,5);
 if(muzzleFlash>0){
   const alpha=Math.min(1,muzzleFlash*1.8);ctx!.globalAlpha=alpha;ctx!.shadowColor="#fff1a6";ctx!.shadowBlur=18;ctx!.fillStyle="#ffe58a";
   ctx!.beginPath();ctx!.moveTo(gunLen+14,0);ctx!.lineTo(gunLen+31,-7);ctx!.lineTo(gunLen+23,0);ctx!.lineTo(gunLen+31,7);ctx!.closePath();ctx!.fill();
 }
 ctx!.restore();

 // Clean outer silhouette.
 ctx!.strokeStyle=c;ctx!.lineWidth=2;ctx!.beginPath();ctx!.ellipse(px,py-20,30,45,0,0,Math.PI*2);ctx!.stroke();
 bar(px-32,py-74,64,5,player.hp,player.maxHp,c);
 bar(px-32,py-66,64,3,player.armor,90,"#9aa9b0");
 ctx!.restore();
}
function drawCargoContainer(o:HsObstacle,idx:number){
  const x=o.x,y=o.y,w=o.w,h=o.h;
  ctx!.save();
  // Soft ground shadow.
  ctx!.globalAlpha=.34;
  ctx!.fillStyle="#000";
  ctx!.fillRect(x+5,y+h+5,w-10,5);
  ctx!.globalAlpha=1;

  // Layered cargo metal.
  const g=ctx!.createLinearGradient(x,y,x,y+h);
  g.addColorStop(0,"#27383e");
  g.addColorStop(.12,"#1d2a30");
  g.addColorStop(.82,"#111b20");
  g.addColorStop(1,"#0a1115");
  ctx!.fillStyle=g;ctx!.fillRect(x,y,w,h);

  ctx!.strokeStyle="#3b5960";ctx!.lineWidth=1;
  ctx!.strokeRect(x+.5,y+.5,w-1,h-1);

  // Structural rails.
  ctx!.strokeStyle="rgba(84,214,216,.22)";
  ctx!.beginPath();
  ctx!.moveTo(x+5,y+7);ctx!.lineTo(x+w-5,y+7);
  ctx!.moveTo(x+5,y+h-6);ctx!.lineTo(x+w-5,y+h-6);
  ctx!.stroke();

  const sections=Math.max(2,Math.floor(w/58));
  ctx!.strokeStyle="rgba(8,14,17,.72)";
  for(let i=1;i<sections;i++){
    const sx=x+(w/sections)*i;
    ctx!.beginPath();ctx!.moveTo(sx,y+9);ctx!.lineTo(sx,y+h-9);ctx!.stroke();
  }

  // Small technical hatch / identification marks.
  ctx!.fillStyle=idx%3===0?"rgba(84,214,216,.38)":"rgba(255,255,255,.13)";
  ctx!.fillRect(x+10,y+12,Math.min(24,w-20),2);
  ctx!.fillStyle="rgba(84,214,216,.12)";
  ctx!.fillRect(x+10,y+h-14,Math.min(42,w-20),3);
  ctx!.restore();
}

function drawWorld(){
  const worldZoom=Math.min(1,viewW/W);
  const worldViewH=viewH/worldZoom;
  cam=Math.max(0,Math.min(H-worldViewH,player.y-worldViewH*.58));
  rect(0,0,viewW,viewH,"#04080b");
  ctx!.save();
  ctx!.translate(viewW*.5-W*.5*worldZoom,-cam*worldZoom);
  ctx!.scale(worldZoom,worldZoom);

  // Full-platform industrial floor texture, based on the supplied diamond-plate reference.
  if(!cargoFloorPattern&&cargoFloorImage.complete&&cargoFloorImage.naturalWidth){
    cargoFloorPattern=ctx!.createPattern(cargoFloorImage,"repeat");
  }
  if(cargoFloorPattern){
    ctx!.save();
    ctx!.globalAlpha=.72;
    ctx!.fillStyle=cargoFloorPattern;
    ctx!.fillRect(0,0,W,H);
    ctx!.restore();
  }else{
    rect(0,0,W,H,"#070d11");
  }
  for(let y=0;y<H;y+=240){
    ctx!.fillStyle="rgba(24,43,49,.22)";ctx!.fillRect(38,y,W-76,1);
    ctx!.fillStyle="rgba(0,0,0,.18)";ctx!.fillRect(38,y+1,W-76,54);
  }
  for(let x=80;x<W;x+=160){
    ctx!.fillStyle="rgba(45,75,82,.08)";ctx!.fillRect(x,0,1,H);
  }

  // Deck edge rails.
  ctx!.fillStyle="#101b20";ctx!.fillRect(0,0,38,H);ctx!.fillRect(962,0,38,H);
  ctx!.fillStyle="rgba(84,214,216,.22)";ctx!.fillRect(38,0,2,H);ctx!.fillRect(960,0,2,H);

  // Sparse floor markers keep depth without becoming a grid.
  for(let i=0;i<34;i++){
    const x=(i*173)%W,y=(i*317)%H;
    ctx!.fillStyle=i%5===0?"rgba(84,214,216,.18)":"rgba(130,155,162,.10)";
    ctx!.fillRect(x,y,1,1);
  }

  // Cargo cover.
  for(let oi=0;oi<OBS.length;oi++)drawCargoContainer(OBS[oi],oi);

  // Player CARGO CORE: compact energy reactor.
  ctx!.save();
  ctx!.globalAlpha=.14;ctx!.fillStyle="#54d6d8";
  ctx!.beginPath();ctx!.arc(core.x,core.y,55+Math.sin(frame*.06)*3,0,Math.PI*2);ctx!.fill();
  ctx!.globalAlpha=.8;ctx!.strokeStyle="#54d6d8";ctx!.lineWidth=2;
  ctx!.beginPath();ctx!.arc(core.x,core.y,37,0,Math.PI*2);ctx!.stroke();
  ctx!.globalAlpha=1;ctx!.shadowColor="#54d6d8";ctx!.shadowBlur=22;
  ctx!.fillStyle="#54d6d8";ctx!.beginPath();ctx!.arc(core.x,core.y,22,0,Math.PI*2);ctx!.fill();
  ctx!.shadowBlur=0;
  ctx!.fillStyle="#eaffff";ctx!.beginPath();ctx!.arc(core.x,core.y,7,0,Math.PI*2);ctx!.fill();
  ctx!.restore();

  // Towers: industrial energy pylons, replacing the old debug squares visually.
  for(const n of nodes){
    if(n.hp<=0)continue;
    const c=n.team==="enemy"?"#ff557d":"#54d6d8";
    ctx!.save();
    ctx!.globalAlpha=.12;ctx!.fillStyle=c;
    ctx!.beginPath();ctx!.arc(n.x,n.y-8,49+Math.sin(frame*.05+n.x)*2,0,Math.PI*2);ctx!.fill();
    ctx!.globalAlpha=.72;ctx!.strokeStyle=c;ctx!.lineWidth=1.5;
    ctx!.beginPath();ctx!.arc(n.x,n.y+16,34,0,Math.PI*2);ctx!.stroke();
    ctx!.globalAlpha=1;
    const tg=ctx!.createLinearGradient(n.x-30,n.y-44,n.x+30,n.y+28);
    tg.addColorStop(0,"#273239");tg.addColorStop(.55,"#151e23");tg.addColorStop(1,"#080e12");
    ctx!.fillStyle=tg;ctx!.fillRect(n.x-30,n.y-38,60,66);
    ctx!.strokeStyle=c;ctx!.strokeRect(n.x-30.5,n.y-38.5,61,67);
    ctx!.fillStyle="#0a1115";ctx!.fillRect(n.x-20,n.y-29,40,42);
    ctx!.fillStyle=c;ctx!.globalAlpha=.22;ctx!.fillRect(n.x-16,n.y-25,32,34);ctx!.globalAlpha=1;
    ctx!.fillStyle=c;ctx!.shadowColor=c;ctx!.shadowBlur=12;
    ctx!.fillRect(n.x-4,n.y-53,8,16);ctx!.shadowBlur=0;
    bar(n.x-30,n.y-67,60,4,n.hp,n.maxHp,c);
    ctx!.restore();
  }

  // Pickup beacons.
  for(const p of pickups){
    const c=p.kind==="medkit"?"#ff5b55":L().color;
    const pulse=1+Math.sin(frame*.12+p.x)*.08;
    ctx!.save();ctx!.globalAlpha=.18;ctx!.fillStyle=c;
    ctx!.beginPath();ctx!.arc(p.x,p.y,20*pulse,0,Math.PI*2);ctx!.fill();
    ctx!.globalAlpha=1;ctx!.shadowColor=c;ctx!.shadowBlur=14;
    ctx!.fillStyle=c;ctx!.beginPath();ctx!.arc(p.x,p.y,8,0,Math.PI*2);ctx!.fill();
    ctx!.shadowBlur=0;ctx!.fillStyle="#081013";ctx!.fillRect(p.x-4,p.y-1,8,2);
    if(p.kind==="medkit")ctx!.fillRect(p.x-1,p.y-4,2,8);
    ctx!.restore();
  }

  // Wisps: retain the current color language, add a restrained energy tail.
  for(const m of mobs){
    const colorId=m.type==="brawler"?0:m.type==="shooter"?1:2;
    const c=colorId===0?"#ff557d":colorId===1?"#ffb04f":"#cf7cff";
    const bob=Math.sin(frame*.09+m.x*.01)*3;
    const pulse=.82+Math.sin(frame*.12+m.y*.007)*.10;
    const wy=m.y-18+bob;
    ctx!.save();
    ctx!.globalAlpha=.16;
    ctx!.fillStyle=c;
    ctx!.beginPath();ctx!.ellipse(m.x,m.y+10,13,28,0,0,Math.PI*2);ctx!.fill();
    ctx!.globalAlpha=1;
    VFX.renderWisp(ctx!,m.x,wy,34*pulse,colorId,frame*.08+m.x*.02);
    ctx!.fillStyle="#071014";ctx!.globalAlpha=.68;
    ctx!.beginPath();ctx!.arc(m.x,wy,5,0,Math.PI*2);ctx!.fill();ctx!.globalAlpha=1;
    if(m.type==="sniper"&&m.think>0){
      ctx!.globalAlpha=.22+Math.sin(frame*.16)*.10;ctx!.strokeStyle="#cf7cff";ctx!.lineWidth=1;
      ctx!.beginPath();ctx!.arc(m.x,wy,38+Math.max(0,m.think)*.15,0,Math.PI*2);ctx!.stroke();ctx!.globalAlpha=1;
    }
    bar(m.x-18,m.y-55+bob,36,3,m.hp,m.maxHp,c);
    ctx!.restore();
  }

  drawPlayer();

  // Projectiles: bright core + short energy tail.
  for(const b of bullets){
    const c=b.from==="player"?L().color:"#ff557d";
    ctx!.save();ctx!.strokeStyle=c;ctx!.lineWidth=3;ctx!.globalAlpha=.28;
    ctx!.beginPath();ctx!.moveTo(b.x,b.y);ctx!.lineTo(b.x-b.vx*4,b.y-b.vy*4);ctx!.stroke();
    ctx!.globalAlpha=1;ctx!.lineWidth=1.5;
    ctx!.beginPath();ctx!.moveTo(b.x,b.y);ctx!.lineTo(b.x-b.vx*2,b.y-b.vy*2);ctx!.stroke();
    ctx!.restore();
  }

  for(const g of grenades){
    ctx!.save();ctx!.fillStyle="#d9b86c";ctx!.shadowColor="#d9b86c";ctx!.shadowBlur=8;
    ctx!.beginPath();ctx!.arc(g.x,g.y,6,0,Math.PI*2);ctx!.fill();ctx!.restore();
  }

  for(const e of effects){
    ctx!.globalAlpha=Math.min(1,e.life/18);txt(e.text,e.x,e.y,9,e.color,"center");
  }
  ctx!.globalAlpha=1;
  ctx!.restore();

  VFX.renderVFX(ctx!,{
    x:W*.5,y:cam+worldViewH*.5,zoom:worldZoom,width:viewW,height:viewH
  });
  drawHUD();
}
function drawHUD(){
  rect(0,0,viewW,82,"rgba(5,9,11,.96)");

  txt("CARGO DECK",16,14,13,"#f0eee7");
  txt(
    "WAVE "+String(wave).padStart(2,"0")+
    " · HOSTILES "+mobs.length+
    " · KILLS "+kills,
    16,35,9,L().color
  );

  bar(16,52,90,6,player.hp,player.maxHp,L().color);
  bar(112,52,60,6,player.armor,90,"#9aa9b0");

  txt(L().name,viewW-14,13,9,L().color,"right");
  txt(weapon().name,viewW-14,32,9,"#f0eee7","right");
  txt(player.combat.ammo+" / "+player.combat.reserve,viewW-14,50,10,"#d9b86c","right");

  bar(viewW/2-80,65,160,5,core.hp,core.maxHp,"#54d6d8");

  if(msgT){
    rect(viewW/2-160,88,320,30,"rgba(5,9,11,.9)");
    ctx!.strokeStyle=L().color;
    ctx!.strokeRect(viewW/2-160,88,320,30);
    txt(msg,viewW/2,103,9,"#f0eee7","center");
  }

  if(player.damagePulse){
    ctx!.fillStyle="rgba(255,40,50,"+player.damagePulse*.18+")";
    ctx!.fillRect(0,0,viewW,viewH);
  }
}function renderCanvas(){if(!ctx)return;resize();ctx.clearRect(0,0,viewW,viewH);if(mode==="loadout")drawLoadout();else if(mode==="play")drawWorld();else if(mode==="weapon")drawWeapon();else drawResult()}
function renderUI(){
  if(!ui)return;
  if(mode==="play"){
    const weaponIcon='<svg viewBox="0 0 64 32" aria-hidden="true"><path d="M4 13h23l5-5h9l2 5h17v6H43l-3 7h-7l-2-7H4zM17 19h7l-2 8h-6z" fill="currentColor"/><path d="M45 9h7v5h-7z" fill="currentColor"/></svg>';
    const inventory=save.inventory.map(id=>{
      const w=HS_WEAPONS[id],active=id===player.weapon;
      return '<button class="cargo-inventory-item'+(active?' active':'')+'" data-cargo-weapon="'+id+'" aria-label="Переключить '+w.name+'"><span class="cargo-inventory-icon">'+weaponIcon+'</span><span class="cargo-inventory-name">'+w.name+'</span><span class="cargo-inventory-ammo">'+(active?player.combat.ammo+" / "+player.combat.reserve:"")+'</span></button>';
    }).join("");
    const med=player.medkits>0?'<button class="cargo-inventory-item cargo-medkit" data-cargo="medkit" aria-label="Использовать аптечку"><span class="cargo-med-icon">+</span><span class="cargo-inventory-name">MEDKIT</span><span class="cargo-inventory-ammo">x'+player.medkits+'</span></button>':"";
    ui.innerHTML='<div class="cargo-inventory"><div class="cargo-inventory-title">PICKUPS</div><div class="cargo-inventory-list">'+inventory+'</div>'+med+'</div>'+
      '<div class="cargo-touch-zone" aria-hidden="true"></div>'+
      '<div class="cargo-combat-zone" aria-hidden="true"></div>'+
      '<button class="cargo-auto'+(auto?' active':'')+'" data-cargo="auto" aria-label="Автострельба">AUTO</button>'+
      '<button class="cargo-grenade" data-cargo="grenade" aria-label="Граната">G</button>'+
      '<button class="cargo-special'+(abilityCd>0?' cooldown':'')+'" data-cargo="ability" aria-label="Спецвозможность">✦</button>'+
      '<div class="cargo-bottom"><button data-cargo="menu">МЕНЮ</button></div>';
  }else if(mode==="loadout")ui.innerHTML='<div class="cargo-loadouts">'+(["ASSAULT","VANGUARD","RECON"]as LoadoutId[]).map(id=>'<button data-loadout="'+id+'"></button>').join("")+'</div><div class="cargo-loadout-actions"><button data-cargo="start">НАЧАТЬ CARGO DECK</button></div>';
  else if(mode==="weapon")ui.innerHTML='<div class="cargo-weapon-hit"></div><div class="cargo-bottom"><button data-cargo="menu">НАЗАД</button></div>';
  else ui.innerHTML='<div class="cargo-result-actions"><button data-cargo="retry">ПОВТОРИТЬ</button><button data-cargo="menu">ВЫХОД</button></div>';
  bindUI()
}
function render(){obsGradients=null;if(!root)return;root.innerHTML='<div class="freezzz-mafia-frame cargo-deck-frame"><canvas class="freezzz-mafia-canvas"></canvas><div class="freezzz-mafia-ui cargo-deck-ui"></div></div>';canvas=root.querySelector("canvas");ctx=canvas?.getContext("2d")||null;ui=root.querySelector(".cargo-deck-ui");resize();renderUI();renderCanvas()}
function resize(){if(!root||!canvas||!ctx)return;viewW=Math.max(320,root.clientWidth||innerWidth);viewH=Math.max(480,root.clientHeight||innerHeight);const d=Math.max(1,Math.min(2,devicePixelRatio||1));canvas.width=Math.round(viewW*d);canvas.height=Math.round(viewH*d);canvas.style.width=viewW+"px";canvas.style.height=viewH+"px";ctx.setTransform(d,0,0,d,0,0);ctx.imageSmoothingEnabled=true}
function bindUI(){
  ui?.querySelectorAll<HTMLElement>("[data-loadout]").forEach(b=>b.onclick=()=>{sel=b.dataset.loadout as LoadoutId;save.loadout=sel;persist();render()});
  ui?.querySelectorAll<HTMLElement>("[data-cargo]").forEach(b=>b.onclick=()=>{
    const a=b.dataset.cargo;
    if(a==="start")start();
    else if(a==="weapon"){mode="weapon";render()}
    else if(a==="reload"){startReload(player.combat,weapon())}
    else if(a==="auto"){auto=!auto;msg=auto?"АВТОСТРЕЛЬБА · ВКЛ":"РУЧНАЯ СТРЕЛЬБА · ВКЛ";msgT=60;renderUI()}
    else if(a==="medkit"){medkit();renderUI()}
    else if(a==="grenade")grenade();
    else if(a==="ability")special();
    else if(a==="menu")exit();
    else if(a==="retry")start()
  });
  ui?.querySelectorAll<HTMLElement>("[data-cargo-weapon]").forEach(b=>b.onclick=()=>{
    const n=Number(b.dataset.cargoWeapon);
    if(Number.isFinite(n)&&save.inventory.includes(n))chooseWeapon(n)
  });

  // The weapon bar remains a vertical touch carousel.
  const inv=ui?.querySelector<HTMLElement>(".cargo-inventory-list");
  if(inv){
    let sy=0;
    inv.addEventListener("pointerdown",e=>{sy=e.clientY});
    inv.addEventListener("pointerup",e=>{
      const dy=e.clientY-sy;
      if(Math.abs(dy)<24)return;
      const ids=save.inventory;
      if(!ids.length)return;
      const cur=Math.max(0,ids.indexOf(player.weapon));
      const next=ids[(cur+(dy<0?1:-1)+ids.length)%ids.length];
      chooseWeapon(next);
    });
  }

  // LEFT/free touch: movement. The right combat zone is intentionally
  // separate so movement and aiming can be performed independently.
  const touch=ui?.querySelector<HTMLElement>(".cargo-touch-zone");
  const combat=ui?.querySelector<HTMLElement>(".cargo-combat-zone");
  if(touch){
    const stop=(e:PointerEvent)=>{
      if(e.pointerId===moveId){moveId=null;moveX=moveY=0}
    };
    const upd=(e:PointerEvent)=>{
      const dx=e.clientX-moveOriginX,dy=e.clientY-moveOriginY;
      const max=Math.max(55,Math.min(105,Math.min(touch.clientWidth,touch.clientHeight)*.16));
      moveX=Math.max(-1,Math.min(1,dx/max)); moveY=Math.max(-1,Math.min(1,dy/max));
    };
    touch.addEventListener("pointerdown",e=>{
      if(e.button!==undefined&&e.button!==0)return;
      e.preventDefault();
      moveId=e.pointerId;moveOriginX=e.clientX;moveOriginY=e.clientY;
      touch.setPointerCapture(e.pointerId);upd(e);
    });
    touch.addEventListener("pointermove",e=>{if(e.pointerId===moveId)upd(e)});
    touch.addEventListener("pointerup",stop);touch.addEventListener("pointercancel",stop);
  }

  if(combat){
    const DOUBLE_MS=230;
    const stop=(e:PointerEvent)=>{
      if(e.pointerId!==combatTouchId)return;
      combatTouchId=null;fireHeld=false;
    };
    combat.addEventListener("pointerdown",e=>{
      if(e.button!==undefined&&e.button!==0)return;
      e.preventDefault();
      combatTouchId=e.pointerId;
      combatStartX=combatLastX=e.clientX;
      combatStartY=combatLastY=e.clientY;
      combatMoved=false;
      combat.setPointerCapture(e.pointerId);

      if(combatTapPending){
        combatTapPending=false;
        if(combatTapTimer)window.clearTimeout(combatTapTimer);
        combatTapTimer=0;
        startReload(player.combat,weapon());
        return;
      }

      combatTapPending=true;
      combatTapTimer=window.setTimeout(()=>{
        combatTapTimer=0;
        if(!combatTapPending)return;
        combatTapPending=false;
        if(combatTouchId!==null)fireHeld=true;
        fire(true);
      },DOUBLE_MS);
    });
    combat.addEventListener("pointermove",e=>{
      if(e.pointerId!==combatTouchId)return;
      const dx=e.clientX-combatStartX,dy=e.clientY-combatStartY;
      combatLastX=e.clientX;combatLastY=e.clientY;
      if(Math.hypot(dx,dy)>10){
        combatMoved=true;
        combatTapPending=false;
        if(combatTapTimer)window.clearTimeout(combatTapTimer);
        combatTapTimer=0;
        aim=Math.atan2(dy,dx);
        if(Math.abs(dx)>5)player.facing=dx<0?-1:1;
        fireHeld=true;
        fire(true);
      }
    });
    combat.addEventListener("pointerup",e=>{
      if(e.pointerId!==combatTouchId)return;
      stop(e);
    });
    combat.addEventListener("pointercancel",e=>{
      if(e.pointerId!==combatTouchId)return;
      if(combatTapTimer)window.clearTimeout(combatTapTimer);
      combatTapTimer=0;combatTapPending=false;
      stop(e);
    });
  }

  if(mode==="weapon"){
    const h=ui?.querySelector(".cargo-weapon-hit");
    h?.addEventListener("click",e=>{const r=(e.currentTarget as HTMLElement).getBoundingClientRect(),n=Math.floor(((e as MouseEvent).clientY-r.top-78)/((Math.min(68,(viewH-135)/Math.max(1,save.inventory.length)))+5));if(n>=0&&n<save.inventory.length)chooseWeapon(save.inventory[n])})
  }
}
function key(e:KeyboardEvent){if(mode==="play"){if(e.key==="w"||e.key==="ArrowUp")moveY=-1;if(e.key==="s"||e.key==="ArrowDown")moveY=1;if(e.key==="a"||e.key==="ArrowLeft")moveX=-1;if(e.key==="d"||e.key==="ArrowRight")moveX=1;if(e.key===" ")fire(true);if(e.key==="r")startReload(player.combat,weapon());if(e.key==="g")grenade();if(e.key==="e")special();if(e.key==="q")medkit();if(e.key==="Tab"){e.preventDefault();mode="weapon";render()}for(let i=0;i<save.inventory.length;i++)if(e.key===String(i+1))chooseWeapon(save.inventory[i])}else if(mode==="loadout"&&e.key==="Enter")start();else if(mode==="weapon"&&e.key==="Escape"){mode="play";render()}else if(mode==="result"&&e.key==="Enter")start()}
function up(e:KeyboardEvent){if(["w","ArrowUp","s","ArrowDown"].includes(e.key))moveY=0;if(["a","ArrowLeft","d","ArrowRight"].includes(e.key))moveX=0}
function loop(t:number){
  if(!last){
    last=t;
    renderCanvas();
    raf=requestAnimationFrame(loop);
    return;
  }
  const dt=Math.min(2,(t-last)/16.67||0);
  last=t;
  if(mode==="play")update(dt);
  renderCanvas();
  raf=requestAnimationFrame(loop);
}
function setup(){load();render();last=0;raf=requestAnimationFrame(loop)}
export function mountCargoDeck(host:HTMLElement){cleanup();root=host;setup();const k=(e:KeyboardEvent)=>key(e),u=(e:KeyboardEvent)=>up(e),r=()=>{resize();renderCanvas()};addEventListener("keydown",k);addEventListener("keyup",u);addEventListener("resize",r);cleanup=()=>{cancelAnimationFrame(raf);removeEventListener("keydown",k);removeEventListener("keyup",u);removeEventListener("resize",r);root=null;canvas=null;ctx=null;ui=null};return()=>cleanup()}