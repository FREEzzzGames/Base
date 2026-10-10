import{HS_WEAPONS,createCombatState,consumeShot,startReload,stepWeapon,spawnShots,traceShot,lineOfSight,recoilAngle,grenade as makeGrenade,type HsCombatState,type HsObstacle}from"./freezzz-combat-core";
import * as VFX from"./cargo-deck-vfx";
type Mode="loadout"|"play"|"weapon"|"result";type Team="player"|"enemy";type MobType="brawler"|"shooter"|"sniper";type LoadoutId="ASSAULT"|"VANGUARD"|"RECON";
interface Mob{x:number;y:number;team:Team;type:MobType;hp:number;maxHp:number;speed:number;damage:number;range:number;cool:number;think:number;strafe:number;stuck:number;lastX:number;lastY:number;state:string;hit:number;lane:number;waypoint:number}
interface Node{x:number;y:number;team:Team;lane:number;hp:number;maxHp:number;cool:number}interface Bullet{x:number;y:number;vx:number;vy:number;life:number;damage:number;from:Team;penetration:number;weaponId:string;shotId:number;hitIds:Set<number>}interface Grenade{x:number;y:number;vx:number;vy:number;life:number;radius:number;damage:number}interface Pickup{x:number;y:number;kind:"medkit"|"weapon";weapon?:number;life:number}
interface Save{version:2;loadout:LoadoutId;weapon:number;inventory:number[];bestWave:number;bestKills:number;bestTime:number;medkits:number}
interface Player{x:number;y:number;hp:number;maxHp:number;armor:number;facing:number;medkits:number;weapon:number;combat:HsCombatState;hit:number;damagePulse:number}
const W=1000,H=2700,KEY="freezzz:cargo-deck:v2";
const LOAD:Record<LoadoutId,{name:string;color:string;hp:number;armor:number;speed:number;ability:string;cd:number;dur:number}>={
ASSAULT:{name:"ASSAULT",color:"#54d6d8",hp:120,armor:35,speed:3.35,ability:"OVERDRIVE",cd:420,dur:180},
VANGUARD:{name:"VANGUARD",color:"#ffb04f",hp:150,armor:65,speed:2.95,ability:"BULWARK",cd:480,dur:210},
RECON:{name:"RECON",color:"#9f83d6",hp:105,armor:25,speed:3.7,ability:"FOCUS",cd:360,dur:150}};
const OBS:HsObstacle[]=[
{x:82,y:330,w:175,h:88},{x:743,y:330,w:175,h:88},{x:330,y:490,w:150,h:72},{x:550,y:490,w:150,h:72},
{x:72,y:720,w:150,h:74},{x:778,y:720,w:150,h:74},{x:292,y:875,w:142,h:72},{x:566,y:875,w:142,h:72},
{x:112,y:1110,w:182,h:88},{x:706,y:1110,w:182,h:88},{x:388,y:1280,w:96,h:68},{x:516,y:1280,w:96,h:68},
{x:86,y:1510,w:170,h:82},{x:744,y:1510,w:170,h:82},{x:310,y:1680,w:150,h:72},{x:540,y:1680,w:150,h:72},
{x:112,y:1935,w:175,h:86},{x:713,y:1935,w:175,h:86},{x:350,y:2110,w:120,h:70},{x:530,y:2110,w:120,h:70},
{x:170,y:2300,w:145,h:76},{x:685,y:2300,w:145,h:76}];
const LANE_ROUTES:ReadonlyArray<ReadonlyArray<{x:number;y:number}>>=[
  // LEFT: move just outside the left container edge, then approach
  // the left player tower from its open right side.
  [{x:315,y:2050},{x:315,y:2200},{x:320,y:2250}],
  // CENTER: leave the narrow central gap before the 2110 container row,
  // then use the open left corridor so the center tower is not a blocker.
  [{x:500,y:2070},{x:320,y:2090},{x:320,y:2250}],
  // RIGHT: stay just inside the right container edge and approach
  // the right player tower from its open left side.
  [{x:685,y:2050},{x:685,y:2200},{x:680,y:2250}]
];
let root:HTMLElement|null=null,canvas:HTMLCanvasElement|null=null,ctx:CanvasRenderingContext2D|null=null,ui:HTMLElement|null=null;
let mode:Mode="loadout",sel:LoadoutId="ASSAULT",save:Save=def(),player!:Player,mobs:Mob[]=[],nodes:Node[]=[],core={x:500,y:250,hp:2600,maxHp:2600};
let bullets:Bullet[]=[],grenades:Grenade[]=[],pickups:Pickup[]=[],effects:{x:number;y:number;text:string;color:string;life:number;vy:number}[]=[],wave=0,kills=0,time=0,waveWait=0,won=false,resultReason="",waveState:"fighting"|"clear"="fighting",waveStart=0,msg="",msgT=0;
let frame=0,last=0,raf=0,cam=0,viewW=0,viewH=0,worldScale=1,moveX=0,moveY=0,aim=0,auto=true,fireHeld=false,moveId:number|null=null,aimId:number|null=null,ability=0,abilityCd=0,muzzleFlash=0;let cleanup=()=>{};
let obsCache:HsObstacle[]|null=null,obsFrame=-1;
function def():Save{return{version:2,loadout:"ASSAULT",weapon:0,inventory:[0,1,3],bestWave:0,bestKills:0,bestTime:0,medkits:3}}
function load(){try{save={...def(),...JSON.parse(localStorage.getItem(KEY)||"{}")};save.inventory=[...new Set((save.inventory||[]).filter(n=>n>=0&&n<HS_WEAPONS.length))];if(!save.inventory.includes(0))save.inventory.unshift(0)}catch{save=def()}sel=save.loadout}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(save))}catch{}}
function L(){return LOAD[sel]}function weapon(){return HS_WEAPONS[player?.weapon??save.weapon]||HS_WEAPONS[0]}
function hitCircle(x:number,y:number,r:number,o:HsObstacle){const nx=Math.max(o.x,Math.min(x,o.x+o.w)),ny=Math.max(o.y,Math.min(y,o.y+o.h));const dx=x-nx,dy=y-ny;return dx*dx+dy*dy<r*r}
function obstacles(){if(obsCache&&obsFrame===frame)return obsCache;obsCache=OBS.map(o=>({...o}));for(const n of nodes)if(n.hp>0)obsCache.push({x:n.x-34,y:n.y-44,w:68,h:72});obsFrame=frame;return obsCache}
function move(x:number,y:number,dx:number,dy:number,r:number){const o=obstacles(),steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/4)),sx=dx/steps,sy=dy/steps;for(let i=0;i<steps;i++){let nx=Math.max(r,Math.min(W-r,x+sx));if(!o.some(a=>hitCircle(nx,y,r,a)))x=nx;else{let lo=0,hi=1;for(let k=0;k<7;k++){const m=(lo+hi)/2;if(!o.some(a=>hitCircle(Math.max(r,Math.min(W-r,x+sx*m)),y,r,a)))lo=m;else hi=m}x=Math.max(r,Math.min(W-r,x+sx*lo))}let ny=Math.max(180,Math.min(H-r,y+sy));if(!o.some(a=>hitCircle(x,ny,r,a)))y=ny;else{let lo=0,hi=1;for(let k=0;k<7;k++){const m=(lo+hi)/2;if(!o.some(a=>hitCircle(x,Math.max(180,Math.min(H-r,y+sy*m)),r,a)))lo=m;else hi=m}y=Math.max(180,Math.min(H-r,y+sy*lo))}}return[x,y]as const}
function freePoint(a:number,b:number,r=20){for(let i=0;i<40;i++){const x=70+Math.random()*(W-140),y=a+Math.random()*(b-a);if(!obstacles().some(o=>hitCircle(x,y,r,o))&&Math.hypot(x-player.x,y-player.y)>360)return[x,y]as const}return[500,a+60]as const}
function reset(){const l=L(),w=HS_WEAPONS[save.weapon]||HS_WEAPONS[0];player={x:500,y:2250,hp:l.hp,maxHp:l.hp,armor:l.armor,facing:-1,medkits:Math.min(5,save.medkits),weapon:save.weapon,combat:createCombatState(w),hit:0,damagePulse:0};ability=abilityCd=0}
function init(){mobs=[];bullets=[];grenades=[];pickups=[];effects=[];nodes=[];core={x:500,y:250,hp:2600,maxHp:2600};wave=kills=0;time=waveWait=0;waveStart=0;waveState="fighting";msgT=0;won=false;[250,500,750].forEach((x,l)=>{nodes.push({x,y:350,team:"enemy",lane:l,hp:900,maxHp:900,cool:20});nodes.push({x,y:2280,team:"player",lane:l,hp:900,maxHp:900,cool:0})});for(let i=0;i<6;i++)spawnPickup();spawnWave()}
function spawnPickup(){const[x,y]=freePoint(430,2200,30);if(Math.random()<.4)pickups.push({x,y,kind:"medkit",life:99999});else{const locked=Array.from({length:HS_WEAPONS.length},(_,n)=>n).filter(n=>!save.inventory.includes(n));const w=locked.length?locked[Math.floor(Math.random()*locked.length)]:Math.floor(Math.random()*HS_WEAPONS.length);pickups.push({x,y,kind:"weapon",weapon:w,life:99999})}}
function spawnWave(){
  wave++;
  waveWait=0;
  waveState="fighting";
  waveStart=frame;

  // Spawn zone is deliberately inside the player's initial camera:
  // y=1820..1900 is below the 1680 cargo row and above the 1935 row.
  // This prevents side-lane spawns from materialising inside containers
  // or outside the visible combat area.
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

    let sx=lanes[lane],sy=2035+Math.random()*35;
    let found=false;
    for(let tries=0;tries<18;tries++){
      const x=lanes[(lane+tries)%lanes.length]+(Math.random()-.5)*34;
      const y=2035+Math.random()*35;
      if(!obstacles().some(o=>hitCircle(x,y,18,o))&&Math.hypot(x-player.x,y-player.y)>340){
        sx=x;sy=y;found=true;break;
      }
    }
    if(!found){
      // Deterministic safe fallbacks for the three lanes.
      const fallback=[[300,2050],[500,2050],[700,2050]] as const;
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
            bullets.push({...sh});
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
        bullets.push({...sh});
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
  effects=effects.filter(e=>e.life>0);

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

  bullets=bullets.filter(b=>b.life>0&&b.x>-80&&b.x<W+80&&b.y>-80&&b.y<H+80);
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
 const c=L().color,px=player.x,py=player.y;
 ctx!.save();
 // Shadow and boots.
 ctx!.globalAlpha=.38;ctx!.fillStyle="#000";ctx!.beginPath();ctx!.ellipse(px,py+18,27,8,0,0,Math.PI*2);ctx!.fill();ctx!.globalAlpha=1;
 // Body silhouette.
 ctx!.shadowColor=c;ctx!.shadowBlur=player.hit>0?28:14;
 ctx!.fillStyle="#172126";ctx!.beginPath();ctx!.ellipse(px,py-18,24,35,0,0,Math.PI*2);ctx!.fill();
 ctx!.shadowBlur=0;
 // Tactical vest.
 ctx!.fillStyle="#2b373b";ctx!.fillRect(px-17,py-37,34,30);
 ctx!.strokeStyle=c;ctx!.lineWidth=1.5;ctx!.strokeRect(px-17,py-37,34,30);
 ctx!.fillStyle="#0d1417";ctx!.fillRect(px-10,py-33,20,4);ctx!.fillRect(px-12,py-24,24,4);
 // Head / helmet.
 ctx!.fillStyle="#10171a";ctx!.beginPath();ctx!.arc(px,py-48,12,0,Math.PI*2);ctx!.fill();
 ctx!.fillStyle=c;ctx!.fillRect(px-9,py-51,18,4);ctx!.fillStyle="#d6e0e2";ctx!.fillRect(px+3,py-49,5,2);
 // Arms follow the weapon line.
 const a=aim,side=player.facing||1;
 const hx=px+Math.cos(a)*13,hy=py-24+Math.sin(a)*13;
 ctx!.strokeStyle="#7d8a8e";ctx!.lineWidth=7;ctx!.lineCap="round";
 ctx!.beginPath();ctx!.moveTo(px-11,py-24);ctx!.lineTo(hx,hy);ctx!.moveTo(px+10,py-20);ctx!.lineTo(hx+Math.cos(a)*5,hy+Math.sin(a)*5);ctx!.stroke();
 // Weapon silhouette with readable receiver / magazine / stock / barrel.
 const recoil=Math.min(5,player.combat.recoil*.28);
 const gunLen=[42,50,56,62,68,76,84,72,98][player.weapon]||48;
 const gx=px+Math.cos(a)*(18+side*4)-Math.cos(a)*recoil,gy=py-25+Math.sin(a)*(18+side*4)-Math.sin(a)*recoil;
 ctx!.save();ctx!.translate(gx,gy);ctx!.rotate(a);
 ctx!.fillStyle="#090d0f";ctx!.fillRect(-12,-5,gunLen,10);
 ctx!.fillStyle="#303b3f";ctx!.fillRect(-8,-4,Math.max(20,gunLen-22),7);
 ctx!.fillStyle=c;ctx!.fillRect(3,-2,Math.max(10,gunLen-28),3);
 // Magazine.
 ctx!.fillStyle="#11181b";ctx!.fillRect(Math.max(8,gunLen*.38),4,7,13);
 ctx!.strokeStyle="#6e7b7f";ctx!.lineWidth=1;ctx!.strokeRect(Math.max(8,gunLen*.38),4,7,13);
 // Stock and muzzle.
 ctx!.fillStyle="#11181b";ctx!.fillRect(-16,-3,8,7);ctx!.fillRect(gunLen-2,-3,16,5);
 if(muzzleFlash>0){
   const alpha=Math.min(1,muzzleFlash*1.8);ctx!.globalAlpha=alpha;ctx!.shadowColor="#fff1a6";ctx!.shadowBlur=18;ctx!.fillStyle="#ffe58a";
   ctx!.beginPath();ctx!.moveTo(gunLen+15,0);ctx!.lineTo(gunLen+31,-7);ctx!.lineTo(gunLen+23,0);ctx!.lineTo(gunLen+31,7);ctx!.closePath();ctx!.fill();
 }
 ctx!.restore();
 // Player outline.
 ctx!.strokeStyle=c;ctx!.lineWidth=2;ctx!.beginPath();ctx!.ellipse(px,py-18,27,42,0,0,Math.PI*2);ctx!.stroke();
 // Health / armor bars.
 bar(px-30,py-70,60,5,player.hp,player.maxHp,c);bar(px-30,py-62,60,3,player.armor,90,"#9aa9b0");
 ctx!.restore();
}
function drawWorld(){
  cam=Math.max(0,Math.min(H-viewH,player.y-viewH*.58));
  rect(0,0,viewW,viewH,"#05090b");
  ctx!.save();
  ctx!.translate(0,-cam);

  for(let y=0;y<H;y+=80)rect(0,y,W,1,"#172126");
  for(let x=0;x<W;x+=80)rect(x,0,1,H,"#10181c");

  for(let i=0;i<90;i++){
    const x=(i*173)%W,y=(i*317)%H;
    ctx!.fillStyle=i%3?"#26333a":"#54d6d8";
    ctx!.fillRect(x,y,1,1);
  }

  rect(0,0,38,H,"#12191d");
  rect(962,0,38,H,"#12191d");

  // CARGO containers / cover.
  for(const o of OBS){
    const g=ctx!.createLinearGradient(o.x,o.y,o.x+o.w,o.y+o.h);
    g.addColorStop(0,"#3b464b");
    g.addColorStop(.55,"#242d31");
    g.addColorStop(1,"#171d20");
    ctx!.fillStyle=g;
    ctx!.fillRect(o.x,o.y,o.w,o.h);
    ctx!.strokeStyle="#68747a";
    ctx!.strokeRect(o.x+.5,o.y+.5,o.w-1,o.h-1);
    for(let x=o.x+14;x<o.x+o.w;x+=28)rect(x,o.y+7,2,o.h-14,"#111719");
  }

  // Player CARGO CORE.
  ctx!.shadowColor="#54d6d8";
  ctx!.shadowBlur=24;
  ctx!.fillStyle="#54d6d8";
  ctx!.beginPath();
  ctx!.arc(core.x,core.y,31,0,Math.PI*2);
  ctx!.fill();
  ctx!.shadowBlur=0;

  // Towers.
  for(const n of nodes){
    if(n.hp<=0)continue;
    const c=n.team==="enemy"?"#ff557d":"#54d6d8";
    ctx!.strokeStyle=c;
    ctx!.fillStyle="#141b1e";
    ctx!.fillRect(n.x-34,n.y-44,68,72);
    ctx!.strokeRect(n.x-34,n.y-44,68,72);
    ctx!.fillStyle=c;
    ctx!.fillRect(n.x-5,n.y-58,10,14);
    bar(n.x-34,n.y-70,68,5,n.hp,n.maxHp,c);
  }

  // Pickup beacons.
  for(const p of pickups){
    const c=p.kind==="medkit"?"#ff5b55":L().color;
    ctx!.fillStyle=c;
    ctx!.shadowColor=c;
    ctx!.shadowBlur=14;
    ctx!.beginPath();
    ctx!.arc(p.x,p.y,10,0,Math.PI*2);
    ctx!.fill();
    ctx!.shadowBlur=0;
    ctx!.fillStyle="#081013";
    ctx!.fillRect(p.x-4,p.y-1,8,2);
    if(p.kind==="medkit")ctx!.fillRect(p.x-1,p.y-4,2,8);
  }

  // Enemy telegraph / state markers.
  for(const m of mobs){
    const c=m.type==="brawler"?"#ff557d":m.type==="shooter"?"#ffb04f":"#cf7cff";
    const sc=m.type==="brawler"?1.12:m.type==="sniper"?.82:1;

    if(m.type==="sniper"&&m.think>0){
      ctx!.globalAlpha=.35+Math.sin(frame*.18)*.15;
      ctx!.strokeStyle="#cf7cff";
      ctx!.lineWidth=2;
      ctx!.beginPath();
      ctx!.arc(m.x,m.y-18,42+Math.max(0,m.think)*.18,0,Math.PI*2);
      ctx!.stroke();
      ctx!.globalAlpha=1;
    }

    ctx!.fillStyle=c;
    ctx!.shadowColor=c;
    ctx!.shadowBlur=m.hit>0?20:10;
    ctx!.beginPath();
    ctx!.ellipse(m.x,m.y-18,25*sc,39*sc,0,0,Math.PI*2);
    ctx!.fill();
    ctx!.shadowBlur=0;

    ctx!.fillStyle="#20292d";
    ctx!.fillRect(m.x-18*sc,m.y-36*sc,36*sc,34*sc);
    bar(m.x-24,m.y-62,48,4,m.hp,m.maxHp,c);

    const label=m.type==="brawler"?"B":m.type==="shooter"?"S":"N";
    txt(label,m.x,m.y-18,10,"#f0eee7","center");
  }

  drawPlayer();

  // Projectiles.
  for(const b of bullets){
    ctx!.strokeStyle=b.from==="player"?L().color:"#ff557d";
    ctx!.lineWidth=2;
    ctx!.beginPath();
    ctx!.moveTo(b.x,b.y);
    ctx!.lineTo(b.x-b.vx*2,b.y-b.vy*2);
    ctx!.stroke();
  }

  for(const g of grenades){
    ctx!.fillStyle="#d9b86c";
    ctx!.beginPath();
    ctx!.arc(g.x,g.y,6,0,Math.PI*2);
    ctx!.fill();
  }

  // Floating combat text.
  for(const e of effects){
    ctx!.globalAlpha=Math.min(1,e.life/18);
    txt(e.text,e.x,e.y,9,e.color,"center");
  }
  ctx!.globalAlpha=1;

  ctx!.restore();

  VFX.renderVFX(ctx!,{
    x:viewW*.5,
    y:cam+viewH*.5,
    zoom:1,
    width:viewW,
    height:viewH
  });

  drawHUD();
}function drawHUD(){
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
function renderUI(){if(!ui)return;if(mode==="play")ui.innerHTML='<div class="cargo-move"><span></span></div><div class="cargo-actions"><button data-cargo="weapon">ОРУЖИЕ</button><button data-cargo="fire">ОГОНЬ</button><button data-cargo="reload">ПЕРЕЗАРЯДКА</button><button data-cargo="auto">АВТО</button><button data-cargo="medkit">HP · '+player.medkits+'</button><button data-cargo="grenade">G</button><button data-cargo="ability">СПЕЦ</button></div><div class="cargo-aim"><span></span></div><div class="cargo-bottom"><button data-cargo="menu">МЕНЮ</button></div>';else if(mode==="loadout")ui.innerHTML='<div class="cargo-loadouts">'+(["ASSAULT","VANGUARD","RECON"]as LoadoutId[]).map(id=>'<button data-loadout="'+id+'"></button>').join("")+'</div><div class="cargo-loadout-actions"><button data-cargo="start">НАЧАТЬ CARGO DECK</button></div>';else if(mode==="weapon")ui.innerHTML='<div class="cargo-weapon-hit"></div><div class="cargo-bottom"><button data-cargo="menu">НАЗАД</button></div>';else ui.innerHTML='<div class="cargo-result-actions"><button data-cargo="retry">ПОВТОРИТЬ</button><button data-cargo="menu">ВЫХОД</button></div>';bindUI()}
function render(){if(!root)return;root.innerHTML='<div class="freezzz-mafia-frame cargo-deck-frame"><canvas class="freezzz-mafia-canvas"></canvas><div class="freezzz-mafia-ui cargo-deck-ui"></div></div>';canvas=root.querySelector("canvas");ctx=canvas?.getContext("2d")||null;ui=root.querySelector(".cargo-deck-ui");canvas?.addEventListener("click",handleCanvasClick);resize();renderUI();renderCanvas()}
function resize(){if(!root||!canvas||!ctx)return;const cssW=Math.max(1,root.clientWidth||innerWidth),cssH=Math.max(1,root.clientHeight||innerHeight);worldScale=cssW/W;viewW=W;viewH=cssH/worldScale;const d=Math.max(1,Math.min(2,devicePixelRatio||1));canvas.width=Math.round(cssW*d);canvas.height=Math.round(cssH*d);canvas.style.width=cssW+"px";canvas.style.height=cssH+"px";ctx.setTransform(d*worldScale,0,0,d*worldScale,0,0);ctx.imageSmoothingEnabled=true}
function bindUI(){ui?.querySelectorAll<HTMLElement>("[data-loadout]").forEach(b=>b.onclick=()=>{sel=b.dataset.loadout as LoadoutId;save.loadout=sel;persist();render()});ui?.querySelectorAll<HTMLElement>("[data-cargo]").forEach(b=>b.onclick=()=>{const a=b.dataset.cargo;if(a==="start")start();else if(a==="weapon"){mode="weapon";render()}else if(a==="fire"){fireHeld=true;fire(true)}else if(a==="reload"){startReload(player.combat,weapon())}else if(a==="auto"){auto=!auto;msg=auto?"АВТОСТРЕЛЬБА · ВКЛ":"РУЧНАЯ СТРЕЛЬБА · ВКЛ";msgT=60}else if(a==="medkit")medkit();else if(a==="grenade")grenade();else if(a==="ability")special();else if(a==="menu")exit();else if(a==="retry")start()});const f=ui?.querySelector<HTMLElement>('[data-cargo="fire"]');if(f){const stop=()=>fireHeld=false;f.addEventListener("pointerdown",e=>{e.preventDefault();fireHeld=true;fire(true)});f.addEventListener("pointerup",stop);f.addEventListener("pointercancel",stop);f.addEventListener("pointerleave",stop)}const mv=ui?.querySelector<HTMLElement>(".cargo-move");if(mv){const upd=(e:PointerEvent)=>{const r=mv.getBoundingClientRect(),dx=(e.clientX-r.left-r.width/2)/(r.width*.42),dy=(e.clientY-r.top-r.height/2)/(r.height*.42);moveX=Math.max(-1,Math.min(1,dx));moveY=Math.max(-1,Math.min(1,dy));const s=mv.querySelector("span")as HTMLElement|null;if(s)s.style.transform=`translate(${Math.max(-32,Math.min(32,dx*32))}px,${Math.max(-32,Math.min(32,dy*32))}px)`};const stop=(e:PointerEvent)=>{if(e.pointerId===moveId){moveId=null;moveX=moveY=0}};mv.addEventListener("pointerdown",e=>{e.preventDefault();moveId=e.pointerId;mv.setPointerCapture(e.pointerId);upd(e)});mv.addEventListener("pointermove",e=>{if(e.pointerId===moveId)upd(e)});mv.addEventListener("pointerup",stop);mv.addEventListener("pointercancel",stop)}const as=ui?.querySelector<HTMLElement>(".cargo-aim");if(as){const set=(e:PointerEvent)=>{const r=as.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2;if(Math.hypot(dx,dy)>8){aim=Math.atan2(dy,dx);if(Math.abs(dx)>5)player.facing=dx<0?-1:1}};as.addEventListener("pointerdown",e=>{e.preventDefault();aimId=e.pointerId;as.setPointerCapture(e.pointerId);set(e)});as.addEventListener("pointermove",e=>{if(e.pointerId===aimId)set(e)});const stop=(e:PointerEvent)=>{if(e.pointerId===aimId)aimId=null};as.addEventListener("pointerup",stop);as.addEventListener("pointercancel",stop)}if(mode==="weapon"){const h=ui?.querySelector(".cargo-weapon-hit");h?.addEventListener("click",e=>{const r=(e.currentTarget as HTMLElement).getBoundingClientRect(),n=Math.floor(((e as MouseEvent).clientY-r.top-78)/((Math.min(68,(viewH-135)/Math.max(1,save.inventory.length)))+5));if(n>=0&&n<save.inventory.length)chooseWeapon(save.inventory[n])})}}
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