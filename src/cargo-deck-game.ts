import{HS_WEAPONS,createCombatState,consumeShot,startReload,stepWeapon,spawnShots,traceShot,lineOfSight,recoilAngle,grenade as makeGrenade,type HsCombatState,type HsObstacle}from"./freezzz-combat-core";
import * as VFX from"./cargo-deck-vfx";
import {SoldierBehaviorController} from"./cargo-deck-operator-3d";
import {renderSpaceMarineStar} from"./space-marine-star-3d";
type Mode="loadout"|"play"|"weapon"|"result";type Team="player"|"enemy";type MobType="brawler"|"shooter"|"sniper";type LoadoutId="ASSAULT"|"VANGUARD"|"RECON";
interface Mob{id:number;x:number;y:number;team:Team;type:MobType;hp:number;maxHp:number;speed:number;damage:number;range:number;cool:number;think:number;strafe:number;stuck:number;lastX:number;lastY:number;state:string;hit:number;lane:number;waypoint:number;attackState:"ready"|"windup"|"cooldown";attackTimer:number;attackX:number;attackY:number}
interface Node{x:number;y:number;team:Team;lane:number;hp:number;maxHp:number;cool:number}interface Bullet{x:number;y:number;vx:number;vy:number;life:number;damage:number;from:Team;penetration:number;weaponId:string;shotId:number;hitIds:Set<number>}interface Grenade{x:number;y:number;vx:number;vy:number;life:number;radius:number;damage:number}interface Pickup{x:number;y:number;kind:"medkit"|"weapon";weapon?:number;life:number}
interface Save{version:2;loadout:LoadoutId;weapon:number;inventory:number[];bestWave:number;bestKills:number;bestTime:number;medkits:number}
interface Player{x:number;y:number;hp:number;maxHp:number;armor:number;facing:number;medkits:number;weapon:number;combat:HsCombatState;hit:number;damagePulse:number;attackState:"ready"|"windup"|"cooldown";attackTimer:number}
const LOAD:Record<LoadoutId,{name:string;color:string;hp:number;armor:number;speed:number;ability:string;cd:number;dur:number}>={
ASSAULT:{name:"ASSAULT",color:"#54d6d8",hp:120,armor:35,speed:3.35,ability:"OVERDRIVE",cd:420,dur:180},
VANGUARD:{name:"VANGUARD",color:"#ffb04f",hp:150,armor:65,speed:2.95,ability:"BULWARK",cd:480,dur:210},
RECON:{name:"RECON",color:"#9f83d6",hp:105,armor:25,speed:3.7,ability:"FOCUS",cd:360,dur:150}};
type ArenaId="cargo";
type MapStructureRole="platform"|"building"|"bridge"|"base"|"tower"|"container"|"tank"|"pipe"|"stairs"|"barrier"|"equipment";
interface MapStructure extends HsObstacle{
  level:number;
  elevation:number;
  height:number;
  role:MapStructureRole;
  collision:boolean;
}
interface CameraState{
  x:number;y:number;
  targetX:number;targetY:number;
  zoom:number;
  yaw:number;
}
interface ArenaConfig{
  id:ArenaId;
  name:string;
  subtitle:string;
  width:number;
  height:number;
  playerSpawn:{x:number;y:number};
  enemyBaseY:number;
  playerBaseY:number;
  core:{x:number;y:number;hp:number};
  obstacles:HsObstacle[];
  routes:ReadonlyArray<ReadonlyArray<{x:number;y:number}>>;
  structures:ReadonlyArray<MapStructure>;
}
const ARENAS:Record<ArenaId,ArenaConfig>={
  cargo:{
    id:"cargo",name:"CARGO DECK",subtitle:"MULTI-LEVEL ORBITAL FREIGHT STATION",width:1600,height:3600,
    playerSpawn:{x:800,y:3180},enemyBaseY:420,playerBaseY:3380,core:{x:800,y:250,hp:2600},
    obstacles:[
      {x:105,y:255,w:330,h:150},{x:1165,y:255,w:330,h:150},
      {x:105,y:700,w:245,h:150},{x:1250,y:700,w:245,h:150},
      {x:105,y:1360,w:245,h:150},{x:1250,y:1360,w:245,h:150},
      {x:105,y:2070,w:245,h:150},{x:1250,y:2070,w:245,h:150},
      {x:105,y:2770,w:245,h:150},{x:1250,y:2770,w:245,h:150},
      {x:520,y:3280,w:170,h:120},{x:910,y:3280,w:170,h:120},
      {x:60,y:3430,w:360,h:110},{x:1180,y:3430,w:360,h:110}
    ],
    structures:[
      {x:105,y:250,w:330,h:150,level:0,elevation:0,height:72,role:"base",collision:true},
      {x:1165,y:250,w:330,h:150,level:0,elevation:0,height:72,role:"base",collision:true},
      {x:565,y:90,w:470,h:190,level:2,elevation:332,height:150,role:"tower",collision:false},
      {x:105,y:680,w:190,h:92,level:1,elevation:176,height:10,role:"platform",collision:false},
      {x:1250,y:680,w:190,h:92,level:1,elevation:176,height:10,role:"platform",collision:false},
      {x:105,y:1340,w:190,h:92,level:1,elevation:176,height:10,role:"platform",collision:false},
      {x:1250,y:1340,w:190,h:92,level:1,elevation:176,height:10,role:"platform",collision:false},
      {x:105,y:2050,w:190,h:92,level:1,elevation:176,height:10,role:"platform",collision:false},
      {x:1250,y:2050,w:190,h:92,level:1,elevation:176,height:10,role:"platform",collision:false},
      {x:105,y:2750,w:190,h:92,level:1,elevation:176,height:10,role:"platform",collision:false},
      {x:1250,y:2750,w:190,h:92,level:1,elevation:176,height:10,role:"platform",collision:false},

      {x:145,y:720,w:28,h:28,level:0,elevation:0,height:164,role:"equipment",collision:false},
      {x:315,y:720,w:28,h:28,level:0,elevation:0,height:164,role:"equipment",collision:false},
      {x:1290,y:720,w:28,h:28,level:0,elevation:0,height:164,role:"equipment",collision:false},
      {x:1460,y:720,w:28,h:28,level:0,elevation:0,height:164,role:"equipment",collision:false},
      {x:145,y:1380,w:28,h:28,level:0,elevation:0,height:164,role:"equipment",collision:false},
      {x:315,y:1380,w:28,h:28,level:0,elevation:0,height:164,role:"equipment",collision:false},
      {x:1290,y:1380,w:28,h:28,level:0,elevation:0,height:164,role:"equipment",collision:false},
      {x:1460,y:1380,w:28,h:28,level:0,elevation:0,height:164,role:"equipment",collision:false},
      {x:145,y:2090,w:28,h:28,level:0,elevation:0,height:164,role:"equipment",collision:false},
      {x:315,y:2090,w:28,h:28,level:0,elevation:0,height:164,role:"equipment",collision:false},
      {x:1290,y:2090,w:28,h:28,level:0,elevation:0,height:164,role:"equipment",collision:false},
      {x:1460,y:2090,w:28,h:28,level:0,elevation:0,height:164,role:"equipment",collision:false},
      {x:145,y:2790,w:28,h:28,level:0,elevation:0,height:164,role:"equipment",collision:false},
      {x:315,y:2790,w:28,h:28,level:0,elevation:0,height:164,role:"equipment",collision:false},
      {x:1290,y:2790,w:28,h:28,level:0,elevation:0,height:164,role:"equipment",collision:false},
      {x:1460,y:2790,w:28,h:28,level:0,elevation:0,height:164,role:"equipment",collision:false},
      {x:430,y:905,w:560,h:54,level:1,elevation:176,height:10,role:"bridge",collision:false},
      {x:430,y:1605,w:560,h:54,level:1,elevation:176,height:10,role:"bridge",collision:false},
      {x:430,y:2310,w:560,h:54,level:1,elevation:176,height:10,role:"bridge",collision:false},
      {x:70,y:600,w:150,h:105,level:0,elevation:0,height:120,role:"building",collision:true},
      {x:1380,y:600,w:150,h:105,level:0,elevation:0,height:120,role:"building",collision:true},
      {x:70,y:1660,w:150,h:105,level:0,elevation:0,height:120,role:"building",collision:true},
      {x:1380,y:1660,w:150,h:105,level:0,elevation:0,height:120,role:"building",collision:true},
      {x:70,y:2360,w:150,h:105,level:0,elevation:0,height:120,role:"building",collision:true},
      {x:1380,y:2360,w:150,h:105,level:0,elevation:0,height:120,role:"building",collision:true},
      {x:515,y:3270,w:175,h:130,level:0,elevation:24,height:66,role:"building",collision:true},
      {x:910,y:3270,w:175,h:130,level:0,elevation:24,height:66,role:"building",collision:true},
      {x:60,y:3430,w:360,h:110,level:0,elevation:0,height:54,role:"building",collision:true},
      {x:1180,y:3430,w:360,h:110,level:0,elevation:0,height:54,role:"building",collision:true},

      // MAIN DECK cargo / industrial dressing. All objects stay outside the
      // three combat lanes and use human-scale dimensions.
      {x:170,y:500,w:180,h:120,level:0,elevation:0,height:54,role:"container",collision:true},
      {x:270,y:575,w:150,h:105,level:0,elevation:0,height:48,role:"container",collision:true},
      {x:1180,y:500,w:180,h:120,level:0,elevation:0,height:54,role:"container",collision:true},
      {x:1280,y:575,w:150,h:105,level:0,elevation:0,height:48,role:"container",collision:true},

      {x:185,y:1050,w:150,h:130,level:0,elevation:0,height:82,role:"tank",collision:true},
      {x:1265,y:1050,w:150,h:130,level:0,elevation:0,height:82,role:"tank",collision:true},
      {x:180,y:1710,w:170,h:130,level:0,elevation:0,height:82,role:"tank",collision:true},
      {x:1250,y:1710,w:170,h:130,level:0,elevation:0,height:82,role:"tank",collision:true},
      {x:190,y:2420,w:150,h:130,level:0,elevation:0,height:82,role:"tank",collision:true},
      {x:1260,y:2420,w:150,h:130,level:0,elevation:0,height:82,role:"tank",collision:true},

      {x:360,y:1010,w:70,h:300,level:0,elevation:0,height:66,role:"pipe",collision:false},
      {x:1170,y:1010,w:70,h:300,level:0,elevation:0,height:66,role:"pipe",collision:false},
      {x:360,y:1710,w:70,h:300,level:0,elevation:0,height:66,role:"pipe",collision:false},
      {x:1170,y:1710,w:70,h:300,level:0,elevation:0,height:66,role:"pipe",collision:false},
      {x:360,y:2420,w:70,h:280,level:0,elevation:0,height:66,role:"pipe",collision:false},
      {x:1170,y:2420,w:70,h:280,level:0,elevation:0,height:66,role:"pipe",collision:false},

      // Real stair landings connect the side service decks to the elevated
      // catwalks; they do not occupy the combat lanes.
      {x:350,y:825,w:80,h:150,level:0,elevation:0,height:88,role:"stairs",collision:false},
      {x:1170,y:825,w:80,h:150,level:0,elevation:0,height:88,role:"stairs",collision:false},
      {x:350,y:1525,w:80,h:150,level:0,elevation:0,height:88,role:"stairs",collision:false},
      {x:1170,y:1525,w:80,h:150,level:0,elevation:0,height:88,role:"stairs",collision:false},
      {x:350,y:2230,w:80,h:150,level:0,elevation:0,height:88,role:"stairs",collision:false},
      {x:1170,y:2230,w:80,h:150,level:0,elevation:0,height:88,role:"stairs",collision:false},

      {x:455,y:650,w:90,h:52,level:0,elevation:0,height:42,role:"barrier",collision:true},
      {x:1055,y:650,w:90,h:52,level:0,elevation:0,height:42,role:"barrier",collision:true},
      {x:455,y:1940,w:90,h:52,level:0,elevation:0,height:42,role:"barrier",collision:true},
      {x:1055,y:1940,w:90,h:52,level:0,elevation:0,height:42,role:"barrier",collision:true},
      {x:455,y:2630,w:90,h:52,level:0,elevation:0,height:42,role:"barrier",collision:true},
      {x:1055,y:2630,w:90,h:52,level:0,elevation:0,height:42,role:"barrier",collision:true}
    ],
    routes:[
      [{x:730,y:500},{x:730,y:760},{x:730,y:1030},{x:730,y:1300},{x:730,y:1570},{x:730,y:1840},{x:730,y:2110},{x:730,y:2380},{x:730,y:2650},{x:730,y:2940},{x:730,y:3140}],
      [{x:800,y:500},{x:800,y:760},{x:800,y:1030},{x:800,y:1300},{x:800,y:1570},{x:800,y:1840},{x:800,y:2110},{x:800,y:2380},{x:800,y:2650},{x:800,y:2940},{x:800,y:3140}],
      [{x:870,y:500},{x:870,y:760},{x:870,y:1030},{x:870,y:1300},{x:870,y:1570},{x:870,y:1840},{x:870,y:2110},{x:870,y:2380},{x:870,y:2650},{x:870,y:2940},{x:870,y:3140}]
    ]
  },

};
let arenaId:ArenaId="cargo";
let W=ARENAS.cargo.width,H=ARENAS.cargo.height;
let PLAYER_SPAWN={...ARENAS.cargo.playerSpawn};
let OBS:HsObstacle[]=ARENAS.cargo.obstacles.map(o=>({...o}));
let LANE_ROUTES:ReadonlyArray<ReadonlyArray<{x:number;y:number}>>=ARENAS.cargo.routes;
let MAP_STRUCTURES:MapStructure[]=ARENAS.cargo.structures.map(s=>({...s}));
let cameraState:CameraState={x:800,y:3180,targetX:800,targetY:3180,zoom:1.08,yaw:0};
const KEY="freezzz:cargo-deck:v2";
const cargoFloorImage=new Image();
const cargoFloorUrl=new URL("../cargo-deck-floor.svg",import.meta.url).href;
cargoFloorImage.src=cargoFloorUrl;
let staticDeckCanvas:HTMLCanvasElement|null=null;
let staticDeckCtx:CanvasRenderingContext2D|null=null;
let staticDeckReady=false;
function buildStaticDeck():void{
  if(!cargoFloorImage.complete||!cargoFloorImage.naturalWidth)return;
  if(!staticDeckCanvas){staticDeckCanvas=document.createElement("canvas");staticDeckCtx=staticDeckCanvas.getContext("2d");}
  const deckW=W+720,deckH=H+2800;staticDeckCanvas.width=deckW;staticDeckCanvas.height=deckH;
  const g=staticDeckCtx;if(!g)return;g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,W,H);g.imageSmoothingEnabled=true;
      const floor=g.createPattern(cargoFloorImage,"repeat");
    if(floor){g.globalAlpha=.72;g.fillStyle=floor;g.fillRect(0,0,W,H);g.globalAlpha=1}else{g.fillStyle="#070d11";g.fillRect(0,0,W,H)}
    // Central freight/service corridor: concrete-steel deck with restrained
    // markings. Combat lanes remain clear and readable without sci-fi framing.
    g.save();
    g.fillStyle="rgba(48,46,41,.72)";g.fillRect(560,210,480,deckH-420);
    g.fillStyle="rgba(119,100,72,.10)";g.fillRect(582,210,436,deckH-420);
    g.strokeStyle="rgba(168,143,101,.18)";g.lineWidth=2;g.strokeRect(582,210,436,H-420);
    g.strokeStyle="rgba(116,104,82,.16)";g.lineWidth=1;
    for(let yy=300;yy<deckH-220;yy+=190){
      g.beginPath();g.moveTo(590,yy);g.lineTo(1010,yy);g.stroke();
    }
    // Faded logistics center line.
    g.strokeStyle="rgba(189,158,96,.22)";g.lineWidth=3;g.setLineDash([28,22]);
    g.beginPath();g.moveTo(800,250);g.lineTo(800,deckH-250);g.stroke();g.setLineDash([]);
    g.restore();
    for(let y=0;y<deckH;y+=240){g.fillStyle="rgba(24,43,49,.22)";g.fillRect(38,y,W-76,1);g.fillStyle="rgba(0,0,0,.18)";g.fillRect(38,y+1,W-76,54)}
    for(let x=80;x<deckW;x+=160){g.fillStyle="rgba(45,75,82,.08)";g.fillRect(x,0,1,H)}
    for(let y=120;y<deckH;y+=240){
      g.strokeStyle="rgba(117,145,149,.13)";g.lineWidth=1;
      g.beginPath();g.moveTo(58,y);g.lineTo(deckW-58,y);g.stroke();
      g.strokeStyle="rgba(0,0,0,.24)";
      g.beginPath();g.moveTo(58,y+3);g.lineTo(deckW-58,y+3);g.stroke();
      for(let x=88;x<deckW-88;x+=112){g.fillStyle="rgba(145,170,170,.08)";g.fillRect(x,y-9,48,2);}
    }
    for(let x=94;x<deckW-94;x+=220){
      g.fillStyle="rgba(8,12,14,.34)";g.fillRect(x,70,10,deckH-140);
      g.fillStyle="rgba(87,116,121,.08)";g.fillRect(x+2,70,2,deckH-140);
    }
    for(const yy of [260,690,1080,1470,1900,2260]){
      g.save();g.globalAlpha=.52;g.beginPath();g.rect(42,yy,deckW-84,16);g.clip();
      for(let x=34;x<deckW;x+=28){
        g.fillStyle=x%56===0?"#d69b3a":"#1b2529";
        g.save();g.translate(x,yy);g.rotate(-.55);g.fillRect(0,-18,9,52);g.restore();
      }
      g.restore();
    }
    for(let x=90;x<W-70;x+=180){
      const yy=deckH-90;
      const glow=g.createRadialGradient(x,yy,2,x,yy,80);
      glow.addColorStop(0,"rgba(84,214,216,.18)");glow.addColorStop(1,"rgba(84,214,216,0)");
      g.fillStyle=glow;g.fillRect(x-80,yy-80,160,160);
      g.fillStyle="#5dd5d5";g.fillRect(x-2,yy-2,4,4);
    }
    g.fillStyle="#101b20";g.fillRect(0,0,38,deckH);g.fillRect(962,0,38,deckH);g.fillStyle="rgba(84,214,216,.22)";g.fillRect(38,0,2,deckH);g.fillRect(960,0,2,deckH);
    g.fillStyle="rgba(0,0,0,.60)";g.fillRect(0,0,W,H);
    // Static layer contains only the ground plane. All architecture is
    // rendered through the shared isometric depth pipeline below so elevated
    // structures and actors participate in one ordering system.
  
  staticDeckReady=true;
}
cargoFloorImage.addEventListener("load",()=>{staticDeckReady=false;buildStaticDeck()});
let root:HTMLElement|null=null,canvas:HTMLCanvasElement|null=null,ctx:CanvasRenderingContext2D|null=null,ui:HTMLElement|null=null;
let mode:Mode="loadout",sel:LoadoutId="ASSAULT",save:Save=def(),player!:Player,mobs:Mob[]=[],nodes:Node[]=[],core={x:500,y:250,hp:2600,maxHp:2600};
let bullets:Bullet[]=[],grenades:Grenade[]=[],pickups:Pickup[]=[],effects:{x:number;y:number;text:string;color:string;life:number;vy:number}[]=[],wave=0,kills=0,time=0,waveWait=0,won=false,resultReason="",waveState:"fighting"|"clear"="fighting",waveStart=0,msg="",msgT=0;
let frame=0,last=0,raf=0,viewW=0,viewH=0,moveX=0,moveY=0,moveTargetX=0,moveTargetY=0,moveOriginX=0,moveOriginY=0,auto=false,fireHeld=false,moveId:number|null=null,combatId:number|null=null,ability=0,abilityCd=0,muzzleFlash=0,walkPhase=0,attackTarget:Mob|null=null,attackNode:Node|null=null,nextMobId=1;
// Camera is intentionally locked to the reference vertical/isometric orientation.
// The previous 360° rotation experiment is removed: gameplay direction stays stable.
let cameraYaw=0;
let soldierController:SoldierBehaviorController|null=null;
let cleanup=()=>{};
let obsCache:HsObstacle[]|null=null,obsFrame=-1,collisionCache:HsObstacle[]|null=null,collisionFrame=-1;
function def():Save{return{version:2,loadout:"ASSAULT",weapon:0,inventory:[0,1,3],bestWave:0,bestKills:0,bestTime:0,medkits:3}}
function load(){try{save={...def(),...JSON.parse(localStorage.getItem(KEY)||"{}")};save.inventory=[...new Set((save.inventory||[]).filter(n=>n>=0&&n<HS_WEAPONS.length))];if(!save.inventory.includes(0))save.inventory.unshift(0)}catch{save=def()}sel=save.loadout}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(save))}catch{}}
function L(){return LOAD[sel]}function weapon(){return HS_WEAPONS[player?.weapon??save.weapon]||HS_WEAPONS[0]}
function anyHit(obs:HsObstacle[],x:number,y:number,r:number):boolean{for(let i=0;i<obs.length;i++){const o=obs[i];const nx=Math.max(o.x,Math.min(x,o.x+o.w)),ny=Math.max(o.y,Math.min(y,o.y+o.h));const dx=x-nx,dy=y-ny;if(dx*dx+dy*dy<r*r)return true}return false}
function hitCircle(x:number,y:number,r:number,o:HsObstacle){const nx=Math.max(o.x,Math.min(x,o.x+o.w)),ny=Math.max(o.y,Math.min(y,o.y+o.h));const dx=x-nx,dy=y-ny;return dx*dx+dy*dy<r*r}
function obstacles(){if(obsCache&&obsFrame===frame)return obsCache;obsCache=OBS.map(o=>({...o}));obsFrame=frame;return obsCache}
function collisionObstacles():HsObstacle[]{
  if(collisionCache&&collisionFrame===frame)return collisionCache;
  collisionCache=obstacles().slice();
  for(const s of MAP_STRUCTURES){
    if(!s.collision||s.level!==0)continue;
    const duplicate=collisionCache.some(o=>o.x===s.x&&o.y===s.y&&o.w===s.w&&o.h===s.h);
    if(!duplicate)collisionCache.push({x:s.x,y:s.y,w:s.w,h:s.h});
  }
  for(const n of nodes)if(n.hp>0)collisionCache.push({x:n.x-34,y:n.y-44,w:68,h:72});
  collisionFrame=frame;
  return collisionCache;
}
function move(x:number,y:number,dx:number,dy:number,r:number){const o=collisionObstacles(),steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/4)),sx=dx/steps,sy=dy/steps;for(let i=0;i<steps;i++){let nx=Math.max(r,Math.min(W-r,x+sx));if(!anyHit(o,nx,y,r))x=nx;else{let lo=0,hi=1;for(let k=0;k<7;k++){const m=(lo+hi)/2;if(!anyHit(o,Math.max(r,Math.min(W-r,x+sx*m)),y,r))lo=m;else hi=m}x=Math.max(r,Math.min(W-r,x+sx*lo))}let ny=Math.max(180,Math.min(H-r,y+sy));if(!anyHit(o,x,ny,r))y=ny;else{let lo=0,hi=1;for(let k=0;k<7;k++){const m=(lo+hi)/2;if(!anyHit(o,x,Math.max(180,Math.min(H-r,y+sy*m)),r))lo=m;else hi=m}y=Math.max(180,Math.min(H-r,y+sy*lo))}}return[x,y]as const}
function freePoint(a:number,b:number,r=20){const lo=Math.max(180,Math.min(a,H-180));const hi=Math.max(lo+1,Math.min(b,H-90));for(let i=0;i<40;i++){const x=70+Math.random()*(W-140),y=lo+Math.random()*(hi-lo);if(!collisionObstacles().some(o=>hitCircle(x,y,r,o))&&Math.hypot(x-player.x,y-player.y)>360)return[x,y]as const}return[500,Math.max(180,Math.min((lo+hi)*.5,H-90))]as const}
function reset(){attackTarget=null;const l=L(),w=HS_WEAPONS[save.weapon]||HS_WEAPONS[0],spawn=ARENAS[arenaId].playerSpawn;player={x:spawn.x,y:spawn.y,hp:l.hp,maxHp:l.hp,armor:l.armor,facing:-1,medkits:Math.min(5,save.medkits),weapon:save.weapon,combat:createCombatState(w),hit:0,damagePulse:0,attackState:"ready",attackTimer:0};soldierController=new SoldierBehaviorController({rotation:{y:player.facing},position:{x:player.x,y:player.y,z:0}});moveX=moveY=moveTargetX=moveTargetY=0;ability=abilityCd=0;walkPhase=0;const zoom=getCameraZoom();cameraState={x:spawn.x,y:spawn.y,targetX:spawn.x,targetY:spawn.y,zoom,yaw:0}}
function init(){const A=ARENAS[arenaId];W=A.width;H=A.height;PLAYER_SPAWN={...A.playerSpawn};OBS=A.obstacles.map(o=>({...o}));MAP_STRUCTURES=(A.structures.length?A.structures:A.obstacles.map((o,i)=>({...o,level:0,elevation:0,height:Math.min(88,40+o.h*.28),role:"building" as MapStructureRole,collision:true}))).map(s=>({...s}));LANE_ROUTES=A.routes;obsCache=null;obsFrame=-1;collisionCache=null;collisionFrame=-1;staticDeckReady=false;staticDeckCanvas=null;staticDeckCtx=null;mobs=[];bullets=[];grenades=[];pickups=[];effects=[];nodes=[];attackTarget=null;attackNode=null;nextMobId=1;core={x:A.core.x,y:A.core.y,hp:A.core.hp,maxHp:A.core.hp};wave=kills=0;time=waveWait=0;waveStart=0;waveState="fighting";msgT=0;won=false;
  const baseXs=[W*.42,W*.5,W*.58];
  baseXs.forEach((x,l)=>{nodes.push({x,y:A.enemyBaseY+30,team:"enemy",lane:l,hp:900,maxHp:900,cool:20});nodes.push({x,y:A.playerBaseY-30,team:"player",lane:l,hp:900,maxHp:900,cool:0})});
  if(arenaId==="cargo"){
    [[W*.375,1100],[W*.625,2000],[W*.375,2800]].forEach((q,l)=>nodes.push({x:q[0],y:q[1],team:"enemy",lane:l,hp:900,maxHp:900,cool:45}));
    [[W*.625,1100],[W*.375,2000],[W*.625,2800]].forEach((q,l)=>nodes.push({x:q[0],y:q[1],team:"player",lane:l,hp:900,maxHp:900,cool:0}));
  }
  for(let i=0;i<6;i++)spawnPickup();spawnWave()}
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
  const lanes=LANE_ROUTES.map(r=>r[0]?.x||500);

  for(let i=0;i<total;i++){
    const type:MobType=i<b?"brawler":i<b+s?"shooter":"sniper";
    const lane=i%3;
    const baseHp=type==="brawler"?125:type==="shooter"?98:88;
    const scale=Math.min(2.35,1+(wave-1)*.10);
    const speed=(type==="brawler"?1.38:type==="shooter"?1.05:.78)*(1+Math.min(.20,(wave-1)*.012));

    const spawnY=ARENAS[arenaId].enemyBaseY+100;let sx=lanes[lane],sy=spawnY+Math.random()*36;
    let found=false;
    for(let tries=0;tries<18;tries++){
      const x=lanes[(lane+tries)%lanes.length]+(Math.random()-.5)*34;
      const y=spawnY+Math.random()*36;
      if(!collisionObstacles().some(o=>hitCircle(x,y,18,o))&&Math.hypot(x-player.x,y-player.y)>340){
        sx=x;sy=y;found=true;break;
      }
    }
    if(!found){
      // Deterministic safe fallbacks for the three lanes.
      const fallback=lanes.map(x=>[x,ARENAS[arenaId].enemyBaseY+118] as const);
      const q=fallback[lane];
      sx=q[0];sy=q[1];
    }

    mobs.push({
      id:nextMobId++,x:sx,y:sy,team:"enemy",type,
      hp:baseHp*scale,maxHp:baseHp*scale,
      speed,damage:type==="brawler"?24:type==="shooter"?15:28,
      range:type==="brawler"?42:type==="shooter"?210:430,
      cool:30+Math.random()*30,think:type==="sniper"?18:0,strafe:i%2?-1:1,
      stuck:0,lastX:sx,lastY:sy,state:"inbound",hit:0,lane,waypoint:0,attackState:"ready",attackTimer:0,attackX:sx,attackY:sy
    });
  }

  msg="WAVE "+String(wave).padStart(2,"0")+" · "+total+" HOSTILES";
  msgT=110;
  effects.push({x:ARENAS[arenaId].width*.5,y:Math.min(ARENAS[arenaId].height-260,ARENAS[arenaId].height*.76),text:"INBOUND",color:"#ff557d",life:70,vy:-.25});
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
function enemyTarget(x:number,y:number,r:number):Mob|null{
  let best:Mob|null=null,bd=r*r,o=obstacles();
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
function beginMobAttack(m:Mob,x:number,y:number,windup:number):void{
  if(m.attackState!=="ready"||m.cool>0)return;
  m.attackState="windup";
  m.attackTimer=windup;
  m.attackX=x;
  m.attackY=y;
}
function fireMobAttack(m:Mob):void{
  const aa=Math.atan2(m.attackY-m.y,m.attackX-m.x);
  const w=m.type==="sniper"?HS_WEAPONS[5]:HS_WEAPONS[1];
  const color=m.type==="sniper"?VFX.VFX_COLORS.PURPLE:VFX.VFX_COLORS.CYAN;
  for(const sh of spawnShots(m.x,m.y,aa,w,"enemy",frame+Math.floor(m.x))){
    bullets.push(sh);
    VFX.emitTracer(m.x,m.y,sh.vx,sh.vy,m.type==="sniper"?.075:.07,color,m.type==="sniper"?1.5:1.25,.5);
  }
  m.attackState="cooldown";
  m.attackTimer=m.type==="sniper"?78:30;
  m.cool=m.attackTimer;
}
function stepMobAttack(m:Mob,dt:number):boolean{
  if(m.attackState==="ready")return false;
  m.attackTimer-=dt;
  if(m.attackState==="windup"){
    if(m.attackTimer<=0)fireMobAttack(m);
    return true;
  }
  if(m.attackTimer<=0){
    m.attackState="ready";
    m.attackTimer=0;
    m.cool=0;
  }
  return true;
}
function updateMob(m:Mob,dt:number){
  if(m.hp<=0)return;
  m.cool=Math.max(0,m.cool-dt);
  m.hit=Math.max(0,m.hit-dt*.1);
  const attacking=stepMobAttack(m,dt);

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
      if(attacking){m.state="telegraph";return}
      if(m.think>0){
        m.think=Math.max(0,m.think-dt);
        m.state="telegraph";
        if(d<360*.82&&!laneActive){
          stepMob(m,m.x-(playerAttack.y-m.y)*m.strafe,m.y+(playerAttack.x-m.x)*m.strafe,dt*.35);
        }
        if(m.think<=0)beginMobAttack(m,playerAttack.x,playerAttack.y,12);
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
      if(attacking)return;
      if(m.cool<=0)beginMobAttack(m,playerAttack.x,playerAttack.y,7);
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
function validAttackTarget(m:Mob|null):m is Mob{return !!m&&m.hp>0&&m.team==="enemy"}
function selectAttackTarget(x:number,y:number):void{
  let best:Mob|null=null,bestD=Infinity;
  for(const m of mobs){
    if(m.hp<=0||m.team!=="enemy")continue;
    const d=Math.hypot(m.x-x,m.y-y);
    if(d<bestD&&d<=120){best=m;bestD=d}
  }
  attackTarget=best||enemyTarget(player.x,player.y,weapon().range);
  attackNode=null;
}
function currentAttackTarget():Mob|null{
  if(attackNode&&attackNode.team==="enemy"&&attackNode.hp>0)return null;
  if(validAttackTarget(attackTarget)&&Math.hypot(attackTarget.x-player.x,attackTarget.y-player.y)<=weapon().range)return attackTarget;
  attackTarget=enemyTarget(player.x,player.y,weapon().range);
  return attackTarget;
}
function currentAttackNode():Node|null{
  if(attackNode&&attackNode.team==="enemy"&&attackNode.hp>0&&Math.hypot(attackNode.x-player.x,attackNode.y-player.y)<=weapon().range&&lineOfSight(player.x,player.y,attackNode.x,attackNode.y,obstacles())){
    attackTarget=null;
    return attackNode;
  }
  attackNode=null;
  return null;
}
function fireShot():void{
  const mob=currentAttackTarget();
  const node=mob?null:currentAttackNode();
  if(!mob&&!node)return;
  const tx=mob?.x??node!.x,ty=mob?.y??node!.y;
  const a=Math.atan2(ty-player.y,tx-player.x);
  const w=weapon();
  if(!consumeShot(player.combat,w))return;
  const hx=player.x+Math.cos(a)*25,hy=player.y+Math.sin(a)*25;
  const ra=recoilAngle(a,player.combat);
  for(const sh of spawnShots(hx,hy,ra,w,"player",player.combat.shotCounter*100)){
    bullets.push({...sh});
    VFX.emitTracer(hx,hy,sh.vx,sh.vy,.06,VFX.VFX_COLORS.CYAN,1.5,.65);
  }
  VFX.emitMuzzleFlash(hx,hy,ra,Math.min(1.25,Math.max(.7,w.damage/32)));
  muzzleFlash=1;
}
function fire():void{
  if(mode!=="play"||player.combat.reloadTimer>0||player.attackState!=="ready")return;
  const target=currentAttackTarget();
  const node=target?null:currentAttackNode();
  if(!target&&!node||player.combat.fireTimer>0)return;
  player.attackState="windup";
  player.attackTimer=Math.min(5,Math.max(2,Math.round(weapon().fireInterval*.28)));
}
function stepPlayerAttack(dt:number):void{
  if(player.attackState==="ready")return;
  player.attackTimer-=dt;
  if(player.attackState==="windup"){
    if(player.attackTimer<=0){
      fireShot();
      player.attackState="cooldown";
      player.attackTimer=Math.max(0,weapon().fireInterval-player.combat.fireTimer);
    }
    return;
  }
  if(player.attackTimer<=0){
    player.attackState="ready";
    player.attackTimer=0;
  }
}
function grenade(){const target=currentAttackTarget();const node=currentAttackNode();const angle=target?Math.atan2(target.y-player.y,target.x-player.x):node?Math.atan2(node.y-player.y,node.x-player.x):player.facing;const g=makeGrenade(player.combat,player.x,player.y,angle);if(g)grenades.push(g)}
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
  stepPlayerAttack(dt);

  // Smooth analog response: the thumb/finger sets a target, the character eases into it.
  const moveEase=1-Math.exp(-dt*.09);
  moveX+=(moveTargetX-moveX)*moveEase;
  moveY+=(moveTargetY-moveY)*moveEase;
  if(Math.abs(moveX)<.008)moveX=0;
  if(Math.abs(moveY)<.008)moveY=0;
  const target=currentAttackTarget();
  const nodeTarget=target?null:currentAttackNode();
  const movingInput=Math.hypot(moveX,moveY)>.01;
  if(movingInput) soldierController?.setMovement(true,Math.atan2(moveY,moveX),dt);
  else soldierController?.setMovement(false,player.facing,dt);
  if(target||nodeTarget){
    const desired=Math.atan2((target?.y??nodeTarget!.y)-player.y,(target?.x??nodeTarget!.x)-player.x);
    soldierController?.setAim(desired,dt);
  }else if(player.attackState==="ready"&&!auto){
    soldierController?.clearAim();
  }
  if(soldierController){
    soldierController.walkPhase=walkPhase;
    player.facing=soldierController.bodyAngle;
    if(player.attackState==="windup"||player.attackState==="cooldown")soldierController.isAiming=true;
    soldierController.update(dt/60);
  }
  // Stable reference camera: no world rotation.
  cameraYaw=0;

  if(Math.abs(moveX)+Math.abs(moveY)>.01){
    const n=Math.hypot(moveX,moveY)||1;
    const speed=l.speed*(ability&&sel==="ASSAULT"?1.25:1)*.92;
    const q=move(player.x,player.y,moveX/n*speed*dt,moveY/n*speed*dt,18);
    const traveled=Math.hypot(q[0]-player.x,q[1]-player.y);
    walkPhase+=traveled*.22;
    player.x=q[0];player.y=q[1];
  }

  updateCamera(dt);

  if(auto)fire();
  else if(fireHeld)fire();

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
        if(m.hp<=0||b.hitIds.has(m.id))continue;
        if(Math.hypot(b.x-m.x,b.y-m.y)<25){
          b.hitIds.add(m.id);
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
function updatePickups(dt:number){for(let i=pickups.length-1;i>=0;i--){const p=pickups[i];if(Math.hypot(player.x-p.x,player.y-p.y)>40)continue;if(p.kind==="medkit"){if(player.medkits>=5)continue;player.medkits++;save.medkits=player.medkits;msg="АПТЕЧКА +1";msgT=60}else if(typeof p.weapon==="number"){if(!save.inventory.includes(p.weapon)){save.inventory.push(p.weapon);msg="ОРУЖИЕ ДОБАВЛЕНО · "+HS_WEAPONS[p.weapon].name}else{player.combat.reserve=Number.POSITIVE_INFINITY;msg="БОЕПРИПАСЫ · "+HS_WEAPONS[p.weapon].name}msgT=80;persist()}pickups.splice(i,1)}if(frame%360===0&&pickups.length<10)spawnPickup()}
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
function choose(id:LoadoutId){sel=id;save.loadout=id;persist();render()}function start(){save.weapon=save.inventory.includes(save.weapon)?save.weapon:save.inventory[0];persist();reset();init();cameraState.yaw=0;cameraYaw=0;mode="play";resultReason="";render()}function chooseWeapon(n:number){if(!save.inventory.includes(n))return;save.weapon=n;player.weapon=n;player.combat=createCombatState(HS_WEAPONS[n]);persist();mode="play";render()}function exit(){mode="loadout";render();window.dispatchEvent(new CustomEvent("freezzz:navigate",{detail:{view:"home"}}))}
function txt(t:string,x:number,y:number,s:number,c:string,a:CanvasTextAlign="left"){ctx!.save();ctx!.font="700 "+s+"px monospace";ctx!.fillStyle=c;ctx!.textAlign=a;ctx!.textBaseline="middle";ctx!.fillText(t,x,y);ctx!.restore()}function bar(x:number,y:number,w:number,h:number,v:number,m:number,c:string){ctx!.fillStyle="#11181b";ctx!.fillRect(x,y,w,h);ctx!.fillStyle=c;ctx!.fillRect(x,y,w*Math.max(0,Math.min(1,v/m)),h)}function rect(x:number,y:number,w:number,h:number,c:string){ctx!.fillStyle=c;ctx!.fillRect(x,y,w,h)}
function drawLoadout(){
  rect(0,0,viewW,viewH,"#070b0e");txt("CARGO DECK",viewW/2,42,24,"#f0eee7","center");txt("SINGLE ARENA",viewW/2,68,9,"#54d6d8","center");
  rect(18,92,viewW-36,150,"rgba(12,22,27,.88)");ctx!.strokeStyle="#54d6d8";ctx!.strokeRect(18.5,92.5,viewW-37,149);
  txt("PLAY",viewW/2,145,25,"#54d6d8","center");txt("WAVES · BASE DEFENSE · 9:16",viewW/2,173,8,"#7f9499","center");
  txt("OPERATOR",viewW/2,278,9,"#7f9499","center");const ids=["ASSAULT","VANGUARD","RECON"] as LoadoutId[],gap=8,w=(viewW-36-gap*2)/3;
  ids.forEach((id,i)=>{const x=18+i*(w+gap),active=id===sel;rect(x,300,w,70,active?"rgba(84,214,216,.16)":"rgba(12,18,21,.88)");ctx!.strokeStyle=active?LOAD[id].color:"#344146";ctx!.strokeRect(x+.5,300.5,w-1,69);txt(id,x+w/2,326,9,active?LOAD[id].color:"#aab5b8","center");txt(String(LOAD[id].hp)+" HP",x+w/2,346,7,"#7f9499","center")});
  txt("One arena. No level selection.",viewW/2,viewH-30,8,"#53666b","center");
}
function drawWeapon(){rect(0,0,viewW,viewH,"#070b0e");txt("ARSENAL",viewW/2,35,22,"#f0eee7","center");txt("РУЧНОЙ ВЫБОР · PICKUP НЕ ПЕРЕКЛЮЧАЕТ ОРУЖИЕ",viewW/2,60,8,"#66757a","center");const h=Math.min(68,(viewH-135)/Math.max(1,save.inventory.length));save.inventory.forEach((id,i)=>{const y=78+i*(h+5),w=HS_WEAPONS[id],a=id===player.weapon;rect(24,y,viewW-48,h,"#11191d");ctx!.strokeStyle=a?L().color:"#344146";ctx!.strokeRect(24,y,viewW-48,h);txt(String(i+1).padStart(2,"0"),38,y+h*.3,9,"#66757a");txt(w.name,72,y+h*.3,14,a?L().color:"#f0eee7");txt("DMG "+w.damage+" · MAG "+w.magazine+" · "+Math.round(3600/w.fireInterval)+" RPM",72,y+h*.65,9,"#8e9b9f")});txt("TAP CARD / NUMBER KEY",viewW/2,viewH-25,10,"#aeb8ba","center")}
function drawResult(){rect(0,0,viewW,viewH,"#05090b");const c=won?"#54d6d8":"#ff557d";txt("CARGO DECK",viewW/2,90,24,c,"center");txt(won?"CARGO DECK SECURED":(resultReason||"MISSION FAILED"),viewW/2,135,17,"#f0eee7","center");txt("WAVE "+String(wave).padStart(2,"0"),viewW/2,205,15,c,"center");txt("ENEMIES DESTROYED · "+kills,viewW/2,245,12,"#aeb8ba","center");txt("SURVIVAL TIME · "+fmt(time),viewW/2,278,12,"#aeb8ba","center");txt("CORE INTEGRITY · "+Math.round(core.hp/core.maxHp*100)+"%",viewW/2,311,12,"#aeb8ba","center");txt(won?"ARENA SECURED":"RETRY AVAILABLE",viewW/2,390,12,c,"center")}
function fmt(s:number){return String(Math.floor(s/60)).padStart(2,"0")+":"+String(Math.floor(s%60)).padStart(2,"0")}
function drawPlayer(){
  const c=L().color,px=player.x,py=player.y;
  const moveVX=px-((drawPlayer as any)._px??px),moveVY=py-((drawPlayer as any)._py??py);
  (drawPlayer as any)._px=px;(drawPlayer as any)._py=py;
  const speedNow=Math.hypot(moveVX,moveVY);
  const moving=Math.min(1,speedNow/3.2);
  const moveAngle=moving>.04?Math.atan2(moveVY,moveVX):((drawPlayer as any)._bodyAngle??player.facing);
  let bodyAngle=(drawPlayer as any)._bodyAngle??moveAngle;
  if(moving>.04){
    let d=Math.atan2(Math.sin(moveAngle-bodyAngle),Math.cos(moveAngle-bodyAngle));
    bodyAngle+=d*.18;
  }else{
    let d=Math.atan2(Math.sin(player.facing-bodyAngle),Math.cos(player.facing-bodyAngle));
    bodyAngle+=d*.06;
  }
  (drawPlayer as any)._bodyAngle=bodyAngle;

  const aimAngle=player.facing;
  const phase=walkPhase;
  const runCycle=Math.sin(phase);
  const runCycle2=Math.sin(phase+Math.PI);
  const verticalBob=moving*(Math.abs(runCycle)*1.8);
  const lean=Math.max(-.16,Math.min(.16,moving*Math.sin(Math.atan2(moveVY,moveVX)-bodyAngle)*.16));
  const weight=moving*.9;
  const dirX=Math.cos(aimAngle),dirY=Math.sin(aimAngle);
  const bodyX=Math.cos(bodyAngle),bodyY=Math.sin(bodyAngle);
  const sideX=-bodyY,sideY=bodyX;
  const recoil=Math.min(6,player.combat.recoil*.34);
  const HEAD=22;
  const PART={torso:.90,pelvis:.88,legs:.92,arms:.90,feet:.92,weapon:1.0};
  const gunLen=HEAD*([2.18,2.64,2.91,3.27,3.55,4.00,4.36,3.82,4.91][player.weapon]||2.45)*PART.weapon;
  const S=1.30;

  const ellipse=(x:number,y:number,rx:number,ry:number,rot:number,fill:string,stroke="#172228",sw=1.4)=>{
    ctx!.fillStyle=fill;ctx!.beginPath();ctx!.ellipse(x,y,rx,ry,rot,0,Math.PI*2);ctx!.fill();
    if(sw>0){ctx!.strokeStyle=stroke;ctx!.lineWidth=sw;ctx!.stroke();}
  };
  const limb=(x1:number,y1:number,x2:number,y2:number,w:number,fill:string,stroke="#18242a")=>{
    ctx!.strokeStyle=stroke;ctx!.lineWidth=w;ctx!.lineCap="round";ctx!.beginPath();ctx!.moveTo(x1,y1);ctx!.lineTo(x2,y2);ctx!.stroke();
    ctx!.fillStyle=fill;ctx!.beginPath();ctx!.arc(x2,y2,w*.48,0,Math.PI*2);ctx!.fill();
  };

  const twoBone=(root:{x:number;y:number},target:{x:number;y:number},a:number,b:number,bend:number)=>{
    const dx=target.x-root.x,dy=target.y-root.y,d=Math.max(.001,Math.hypot(dx,dy));
    const reach=Math.max(.001,Math.min(d,a+b-.001));
    const ux=dx/d,uy=dy/d;
    const cosK=Math.max(-1,Math.min(1,(a*a+reach*reach-b*b)/(2*a*reach)));
    const sinK=Math.sqrt(Math.max(0,1-cosK*cosK))*bend;
    const along=a*cosK,side=a*sinK;
    return{x:root.x+ux*along-uy*side,y:root.y+uy*along+ux*side};
  };
  ctx!.save();
  ctx!.translate(px,py-verticalBob);
  ctx!.scale(S,S);
  ctx!.rotate(lean);

  // Contact shadow and subtle operator halo.
  ctx!.globalAlpha=.40;ctx!.fillStyle="#000";ctx!.beginPath();ctx!.ellipse(0,34,38,11,0,0,Math.PI*2);ctx!.fill();ctx!.globalAlpha=1;
  ctx!.globalAlpha=.11;ctx!.fillStyle=c;ctx!.beginPath();ctx!.arc(0,-17,51+Math.sin(frame*.08)*2,0,Math.PI*2);ctx!.fill();ctx!.globalAlpha=1;
  ctx!.save();ctx!.globalAlpha=.62;ctx!.strokeStyle="#54d6d8";ctx!.lineWidth=2;ctx!.shadowColor="#54d6d8";ctx!.shadowBlur=8;
  ctx!.beginPath();ctx!.ellipse(0,33,32,10,0,0,Math.PI*2);ctx!.stroke();
  ctx!.globalAlpha=.16;ctx!.lineWidth=5;ctx!.beginPath();ctx!.ellipse(0,33,38,12,0,0,Math.PI*2);ctx!.stroke();ctx!.restore();

  // Life-support backpack.
  ctx!.save();ctx!.rotate(bodyAngle);
  ctx!.fillStyle="#303d42";ctx!.strokeStyle="#111a1e";ctx!.lineWidth=1.5;ctx!.beginPath();ctx!.roundRect(-27,-27,20,54,6);ctx!.fill();ctx!.stroke();
  ctx!.fillStyle="#56666b";ctx!.fillRect(-23,-20,12,29);
  ctx!.fillStyle=c;ctx!.globalAlpha=.75;ctx!.fillRect(-22,-17,10,3);ctx!.globalAlpha=1;
  ctx!.restore();

  // Pelvis + gait-driven legs. Human walking is modeled as ~60% stance / ~40% swing.
  // The stance foot moves backward relative to the root; the swing foot advances and lifts.
  const gait=((phase/(Math.PI*2))%1+1)%1;
  const gaitL=gait, gaitR=(gait+.5)%1;
  const swingT=(g:number)=>g>.60?(g-.60)/.40:0;
  const stancePos=(g:number)=>g<=.60?.46-(g/.60)*.92:.46;
  const swingPos=(g:number)=>-.46+(swingT(g))*.92;
  const footPhase=(g:number)=>g>.60?swingPos(g):stancePos(g);
  const footLift=(g:number)=>Math.sin(Math.PI*swingT(g))*10;
  const stepLen=HEAD*.91*PART.legs;
  const hipY=HEAD*.55*PART.pelvis,legGap=HEAD*.55*PART.legs;
  const hipL={x:-sideX*legGap,y:hipY-sideY*legGap};
  const hipR={x:sideX*legGap,y:hipY+sideY*legGap};
  const rig=(drawPlayer as any)._rig??=((drawPlayer as any)._rig={
    left:{planted:false,x:px,y:py,phase:-1},
    right:{planted:false,x:px,y:py,phase:-1}
  });
  const localToWorld=(p:{x:number;y:number})=>{
    const lx=p.x*S,ly=p.y*S,co=Math.cos(lean),si=Math.sin(lean);
    return{x:px+lx*co-ly*si,y:py+lx*si+ly*co};
  };
  const worldToLocal=(p:{x:number;y:number})=>{
    const dx=(p.x-px)/S,dy=(p.y-py)/S,co=Math.cos(lean),si=Math.sin(lean);
    return{x:dx*co+dy*si,y:-dx*si+dy*co};
  };
  const rawFoot=(hip:{x:number;y:number},g:number)=>({
    x:hip.x+bodyX*footPhase(g)*stepLen,
    y:hip.y+bodyY*footPhase(g)*stepLen+38-footLift(g)
  });
  const updateFoot=(state:any,g:number,hip:{x:number;y:number})=>{
    const stance=g<=.60;
    if(state.phase<0){
      state.phase=g;
      const p=localToWorld(rawFoot(hip,g));
      state.planted=stance;state.x=p.x;state.y=p.y;
    }else{
      if(stance&&!state.planted){
        const p=localToWorld(rawFoot(hip,g));
        state.planted=true;state.x=p.x;state.y=p.y;
      }else if(!stance&&state.planted){
        state.planted=false;
      }
      state.phase=g;
    }
    return state.planted?worldToLocal({x:state.x,y:state.y}):rawFoot(hip,g);
  };
  const footL=updateFoot(rig.left,gaitL,hipL);
  const footR=updateFoot(rig.right,gaitR,hipR);
  const kneeL=twoBone(hipL,footL,HEAD*1.09*PART.legs,HEAD*1.00*PART.legs,1);
  const kneeR=twoBone(hipR,footR,HEAD*1.09*PART.legs,HEAD*1.00*PART.legs,-1);
  limb(hipL.x,hipL.y,kneeL.x,kneeL.y,HEAD*.68*PART.legs,"#343f44","#10171b");
  limb(kneeL.x,kneeL.y,footL.x,footL.y,HEAD*.50*PART.legs,"#293439","#10171b");
  limb(hipR.x,hipR.y,kneeR.x,kneeR.y,HEAD*.68*PART.legs,"#303b40","#10171b");
  limb(kneeR.x,kneeR.y,footR.x,footR.y,HEAD*.50*PART.legs,"#273238","#10171b");
  ellipse(kneeL.x,kneeL.y,7,6,0,"#46535a","#152027",1);
  ellipse(kneeR.x,kneeR.y,7,6,0,"#46535a","#152027",1);
  ellipse(footL.x,footL.y,HEAD*.64*PART.feet,HEAD*.36*PART.feet,bodyAngle,"#182126","#080f13",1.2);
  ellipse(footR.x,footR.y,HEAD*.64*PART.feet,HEAD*.36*PART.feet,bodyAngle,"#182126","#080f13",1.2);

  // Pelvis and torso rotate slightly opposite the legs to sell weight transfer.
  const pelvisTwist=runCycle*weight*.10;
  ctx!.save();ctx!.rotate(bodyAngle+pelvisTwist);
  ellipse(0,HEAD*.50*PART.pelvis,HEAD*.86*PART.pelvis,HEAD*.59*PART.pelvis,0,"#222d32","#0d1519",1.3);
  ellipse(0,-HEAD*.73*PART.torso,HEAD*1.36*PART.torso,HEAD*1.73*PART.torso,0,"#2b373c","#0e171b",1.8);
  ctx!.fillStyle="#c6cfcc";ctx!.beginPath();ctx!.roundRect(-HEAD*.91*PART.torso,-HEAD*1.82*PART.torso,HEAD*1.82*PART.torso,HEAD*1.27*PART.torso,HEAD*.41*PART.torso);ctx!.fill();
  ctx!.strokeStyle="#29373b";ctx!.lineWidth=1.5;ctx!.stroke();
  ctx!.fillStyle="#172126";ctx!.fillRect(-HEAD*.55*PART.torso,-HEAD*1.64*PART.torso,HEAD*1.09*PART.torso,HEAD*.59*PART.torso);
  ctx!.fillStyle=c;ctx!.shadowColor=c;ctx!.shadowBlur=6;ctx!.fillRect(-HEAD*.36*PART.torso,-HEAD*1.45*PART.torso,HEAD*.73*PART.torso,HEAD*.14*PART.torso);ctx!.shadowBlur=0;
  ctx!.fillStyle="#66757a";ctx!.fillRect(-HEAD*.68*PART.torso,-HEAD*.91*PART.torso,HEAD*1.36*PART.torso,HEAD*.27*PART.torso);
  ctx!.fillStyle="#273238";ctx!.fillRect(-8,-17,4,3);ctx!.fillRect(4,-17,4,3);
  ctx!.strokeStyle="#54d6d8";ctx!.lineWidth=1.2;ctx!.beginPath();ctx!.moveTo(-HEAD*.86*PART.torso,-HEAD*.50*PART.torso);ctx!.lineTo(-HEAD*.45*PART.torso,HEAD*.23*PART.torso);ctx!.moveTo(HEAD*.86*PART.torso,-HEAD*.50*PART.torso);ctx!.lineTo(HEAD*.45*PART.torso,HEAD*.23*PART.torso);ctx!.stroke();
  ctx!.restore();

  ctx!.save();ctx!.rotate(bodyAngle+pelvisTwist);
  ctx!.fillStyle="#3b484d";ctx!.strokeStyle="#10181c";ctx!.lineWidth=1;
  ctx!.beginPath();ctx!.moveTo(-HEAD*.68*PART.torso,-HEAD*1.45*PART.torso);ctx!.lineTo(0,-HEAD*1.68*PART.torso);ctx!.lineTo(HEAD*.68*PART.torso,-HEAD*1.45*PART.torso);ctx!.lineTo(HEAD*.59*PART.torso,-HEAD*.64*PART.torso);ctx!.lineTo(0,-HEAD*.36*PART.torso);ctx!.lineTo(-HEAD*.59*PART.torso,-HEAD*.64*PART.torso);ctx!.closePath();ctx!.fill();ctx!.stroke();
  ctx!.fillStyle="#19262b";ctx!.fillRect(-HEAD*.36*PART.torso,-HEAD*1.27*PART.torso,HEAD*.73*PART.torso,HEAD*.50*PART.torso);
  ctx!.fillStyle="#54d6d8";ctx!.shadowColor="#54d6d8";ctx!.shadowBlur=5;ctx!.fillRect(-HEAD*.23*PART.torso,-HEAD*1.18*PART.torso,HEAD*.45*PART.torso,HEAD*.09*PART.torso);ctx!.shadowBlur=0;
  ctx!.fillStyle="#5b696e";ctx!.fillRect(-HEAD*.86*PART.torso,-HEAD*.95*PART.torso,HEAD*.23*PART.torso,HEAD*.64*PART.torso);ctx!.fillRect(HEAD*.64*PART.torso,-HEAD*.95*PART.torso,HEAD*.23*PART.torso,HEAD*.64*PART.torso);
  ctx!.restore();

  // Aim-driven upper body. The weapon is the primary constraint; both hands solve toward its grips.
  const spineAim=Math.max(-.20,Math.min(.20,Math.atan2(Math.sin(aimAngle-bodyAngle),Math.cos(aimAngle-bodyAngle))*.32));
  const shoulderAngle=bodyAngle+spineAim;
  const shoulderFront={x:sideX*HEAD*.91*PART.arms+Math.cos(shoulderAngle)*HEAD*.23*PART.arms,y:-HEAD*1.23*PART.arms+sideY*HEAD*.91*PART.arms+Math.sin(shoulderAngle)*HEAD*.23*PART.arms};
  const shoulderBack={x:-sideX*HEAD*.91*PART.arms+Math.cos(shoulderAngle)*HEAD*.23*PART.arms,y:-HEAD*1.23*PART.arms-sideY*HEAD*.91*PART.arms+Math.sin(shoulderAngle)*HEAD*.23*PART.arms};
  const gunBaseX=dirX*(24-recoil),gunBaseY=dirY*(24-recoil);
  const support={x:gunBaseX-dirX*5+sideX*11,y:gunBaseY-dirY*5+sideY*11};
  const elbowFront=twoBone(shoulderFront,{x:gunBaseX,y:gunBaseY},HEAD*1.09*PART.arms,HEAD*1.05*PART.arms,1);
  const elbowBack=twoBone(shoulderBack,support,HEAD*1.09*PART.arms,HEAD*1.05*PART.arms,-1);
  limb(shoulderFront.x,shoulderFront.y,elbowFront.x,elbowFront.y,HEAD*.50*PART.arms,"#364248","#11191d");
  limb(elbowFront.x,elbowFront.y,gunBaseX,gunBaseY,HEAD*.45*PART.arms,"#2b373c","#11191d");
  limb(shoulderBack.x,shoulderBack.y,elbowBack.x,elbowBack.y,HEAD*.50*PART.arms,"#303b40","#10181c");
  limb(elbowBack.x,elbowBack.y,support.x,support.y,HEAD*.45*PART.arms,"#273238","#10181c");
  ellipse(shoulderFront.x,shoulderFront.y,HEAD*.41*PART.arms,HEAD*.41*PART.arms,aimAngle,"#59666a","#182329",1);
  ellipse(shoulderBack.x,shoulderBack.y,HEAD*.41*PART.arms,HEAD*.41*PART.arms,aimAngle,"#59666a","#182329",1);
  ellipse(gunBaseX,gunBaseY,HEAD*.32*PART.arms,HEAD*.32*PART.arms,aimAngle,"#d9d5c8","#182329",1);
  ellipse(support.x,support.y,HEAD*.32*PART.arms,HEAD*.32*PART.arms,aimAngle,"#d9d5c8","#182329",1);

  // Head follows aim with limited rotation.
  const headTurn=Math.max(-.22,Math.min(.22,Math.atan2(Math.sin(aimAngle-bodyAngle),Math.cos(aimAngle-bodyAngle))*.55));
  ctx!.save();ctx!.rotate(bodyAngle+headTurn);
  ellipse(0,-HEAD*2.32,HEAD*.73,HEAD*.41,0,"#202b30","#080f13",1);
  ellipse(0,-HEAD*2.73,HEAD,HEAD,0,"#303b40","#0b1418",1.6);
  ctx!.fillStyle="#071217";ctx!.shadowColor="#54d6d8";ctx!.shadowBlur=12;
  ctx!.beginPath();ctx!.ellipse(6,-HEAD*2.82,HEAD*.73,HEAD*.50,0,0,Math.PI*2);ctx!.fill();ctx!.shadowBlur=0;
  ctx!.strokeStyle="#6edfe1";ctx!.lineWidth=1.5;ctx!.beginPath();ctx!.ellipse(5,-HEAD*2.64,HEAD*.64,HEAD*.45,0,0,Math.PI*2);ctx!.stroke();
  ctx!.fillStyle="#d7ffff";ctx!.globalAlpha=.9;ctx!.beginPath();ctx!.ellipse(10,-HEAD*3.05,HEAD*.20,HEAD*.11,0,0,Math.PI*2);ctx!.fill();ctx!.globalAlpha=1;
  ctx!.fillStyle="#536167";ctx!.fillRect(-HEAD*1.05,-HEAD*2.95,HEAD*.32,HEAD*.55);ctx!.fillRect(HEAD*.73,-HEAD*2.95,HEAD*.32,HEAD*.55);
  ctx!.restore();

  // Weapon: detailed hard-surface sci-fi carbine. The gun remains the primary
  // hand constraint; only its visual construction is being upgraded here.
  ctx!.save();ctx!.translate(gunBaseX,gunBaseY);ctx!.rotate(aimAngle);
  ctx!.shadowColor="#000";ctx!.shadowBlur=9;
  ctx!.fillStyle="#070b0e";ctx!.beginPath();ctx!.roundRect(-16,-6,gunLen+34,12,3);ctx!.fill();ctx!.shadowBlur=0;

  // Receiver and armored side panels.
  const receiverW=Math.max(28,gunLen*.56);
  ctx!.fillStyle="#29363b";ctx!.beginPath();ctx!.roundRect(-5,-5,receiverW,10,2);ctx!.fill();
  ctx!.strokeStyle="#53656a";ctx!.lineWidth=1;ctx!.strokeRect(-4.5,-4.5,receiverW-1,9);
  ctx!.fillStyle="#172126";ctx!.fillRect(3,-2,receiverW-12,4);
  ctx!.fillStyle=c;ctx!.globalAlpha=.85;ctx!.shadowColor=c;ctx!.shadowBlur=6;
  ctx!.fillRect(7,-1,Math.max(9,receiverW-20),2);ctx!.shadowBlur=0;ctx!.globalAlpha=1;

  // Upper rail, barrel shroud and muzzle.
  ctx!.fillStyle="#10181c";ctx!.fillRect(0,-8,Math.max(24,gunLen-7),3);
  ctx!.fillStyle="#4a5a5f";ctx!.fillRect(7,-7,Math.max(18,gunLen-22),2);
  ctx!.fillStyle="#1b2529";ctx!.fillRect(receiverW-1,-4,Math.max(20,gunLen-receiverW+13),8);
  ctx!.fillStyle="#59696e";ctx!.fillRect(gunLen+2,-4,8,8);
  ctx!.fillStyle="#0a1114";ctx!.fillRect(gunLen+8,-5,11,10);
  ctx!.strokeStyle="#66777c";ctx!.strokeRect(gunLen+8.5,-4.5,10,9);

  // Magazine and forward grip.
  const magX=Math.max(8,gunLen*.38);
  ctx!.fillStyle="#10181c";ctx!.beginPath();ctx!.moveTo(magX,3);ctx!.lineTo(magX+10,3);ctx!.lineTo(magX+8,18);ctx!.lineTo(magX-2,18);ctx!.closePath();ctx!.fill();
  ctx!.strokeStyle="#46565b";ctx!.stroke();
  ctx!.fillStyle="#26343a";ctx!.fillRect(Math.max(18,gunLen*.62),5,7,12);
  ctx!.strokeStyle="#617177";ctx!.strokeRect(Math.max(18,gunLen*.62)+.5,5.5,6,11);

  // Stock / rear housing.
  ctx!.fillStyle="#11191d";ctx!.fillRect(-17,-4,13,8);
  ctx!.fillStyle="#303d42";ctx!.fillRect(-15,-8,7,3);ctx!.fillRect(-15,5,10,3);

  // Fasteners and warning light.
  ctx!.fillStyle="#8b999d";
  for(const sx of [-1,10,21]){ctx!.beginPath();ctx!.arc(sx,-4,1,0,Math.PI*2);ctx!.fill();}
  ctx!.fillStyle="#d69b3a";ctx!.fillRect(receiverW*.56,-6,5,2);

  if(muzzleFlash>0){
    const alpha=Math.min(1,muzzleFlash*1.8);
    ctx!.globalAlpha=alpha;ctx!.fillStyle="#ffe2a1";ctx!.shadowColor="#fff0b5";ctx!.shadowBlur=13;
    ctx!.beginPath();ctx!.moveTo(gunLen+17,0);ctx!.lineTo(gunLen+31,-7);ctx!.lineTo(gunLen+25,0);ctx!.lineTo(gunLen+31,7);ctx!.closePath();ctx!.fill();
    ctx!.globalAlpha=1;ctx!.shadowBlur=0;
  }
  ctx!.restore();

  // Small inertial accents make the rig feel alive while idle.
  if(!moving){
    const breath=Math.sin(frame*.055)*.9;
    ctx!.globalAlpha=.7;ctx!.strokeStyle="#f0a35f";ctx!.lineWidth=1;
    ctx!.beginPath();ctx!.moveTo(-14,-8+breath);ctx!.lineTo(-8,4+breath);ctx!.moveTo(14,-8+breath);ctx!.lineTo(8,4+breath);ctx!.stroke();ctx!.globalAlpha=1;
  }

  ctx!.restore();
}
function drawIndustrialLighting():void{
  if(!ctx)return;
  // Localized light pools and contact shadows: purely visual, no gameplay influence.
  const pools=[
    {x:120,y:260,r:170,c:"#ffb04f",a:.12},
    {x:880,y:260,r:170,c:"#ffb04f",a:.12},
    {x:500,y:610,r:190,c:"#54d6d8",a:.07},
    {x:110,y:1080,r:155,c:"#ffb04f",a:.09},
    {x:890,y:1080,r:155,c:"#ffb04f",a:.09},
    {x:500,y:1510,r:180,c:"#54d6d8",a:.06},
    {x:120,y:1930,r:165,c:"#ffb04f",a:.09},
    {x:880,y:1930,r:165,c:"#ffb04f",a:.09}
  ];
  ctx.save();
  ctx.globalCompositeOperation="screen";
  for(const p of pools){
    const g=ctx.createRadialGradient(p.x,p.y,2,p.x,p.y,p.r);
    const rgba=(hex:string,a:number)=>{
      const n=parseInt(hex.slice(1),16);
      return "rgba("+((n>>16)&255)+","+((n>>8)&255)+","+(n&255)+","+a+")";
    };
    g.addColorStop(0,rgba(p.c,p.a));
    g.addColorStop(.42,rgba(p.c,p.a*.42));
    g.addColorStop(1,rgba(p.c,0));
    ctx.fillStyle=g;ctx.fillRect(p.x-p.r,p.y-p.r,p.r*2,p.r*2);
  }
  ctx.restore();

  // Subtle directional haze gives the deck depth without adding geometry.
  ctx.save();ctx.globalCompositeOperation="screen";
  const haze=ctx.createLinearGradient(0,0,W,H);
  haze.addColorStop(0,"rgba(84,214,216,.035)");
  haze.addColorStop(.48,"rgba(255,255,255,0)");
  haze.addColorStop(1,"rgba(255,176,79,.045)");
  ctx.fillStyle=haze;ctx.fillRect(0,0,W,H);ctx.restore();

  const shadow=(x:number,y:number,rx:number,ry:number,a:number)=>{
    ctx!.save();ctx!.globalAlpha=a;ctx!.fillStyle="#000";
    ctx!.beginPath();ctx!.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx!.fill();ctx!.restore();
  };
  for(const m of mobs)shadow(m.x,m.y+23,15,7,.34);
  if(player)shadow(player.x,player.y+25,19,8,.42);
}
function isoProject(x:number,y:number,centerX:number,centerY:number,zoom:number,targetX:number,targetY:number,yaw:number,elevation=0){
  const dx=x-targetX,dy=y-targetY;
  const co=Math.cos(yaw),sn=Math.sin(yaw);
  const rx=dx*co-dy*sn,ry=dx*sn+dy*co;
  const c=.8660254038,si=.5;
  return {x:centerX+((rx-ry)*c*zoom),y:centerY+((rx+ry)*si*zoom)-elevation*zoom};
}

function isoArchitectureDepth(o:MapStructure,centerX:number,centerY:number,zoom:number,targetX:number,targetY:number,yaw:number):number{
  const p1=isoProject(o.x,o.y,centerX,centerY,zoom,targetX,targetY,yaw,o.elevation);
  const p2=isoProject(o.x+o.w,o.y,centerX,centerY,zoom,targetX,targetY,yaw,o.elevation);
  const p3=isoProject(o.x+o.w,o.y+o.h,centerX,centerY,zoom,targetX,targetY,yaw,o.elevation);
  const p4=isoProject(o.x,o.y+o.h,centerX,centerY,zoom,targetX,targetY,yaw,o.elevation);
  return Math.max(p1.y,p2.y,p3.y,p4.y);
}
function drawIsoArchitectureItem(o:MapStructure,i:number,centerX:number,centerY:number,zoom:number,targetX:number,targetY:number,yaw:number):void{
  if(!ctx)return;
  const h=o.height;
  const p1=isoProject(o.x,o.y,centerX,centerY,zoom,targetX,targetY,yaw,o.elevation);
  const p2=isoProject(o.x+o.w,o.y,centerX,centerY,zoom,targetX,targetY,yaw,o.elevation);
  const p3=isoProject(o.x+o.w,o.y+o.h,centerX,centerY,zoom,targetX,targetY,yaw,o.elevation);
  const p4=isoProject(o.x,o.y+o.h,centerX,centerY,zoom,targetX,targetY,yaw,o.elevation);
  const q1={x:p1.x,y:p1.y-h*zoom},q2={x:p2.x,y:p2.y-h*zoom},q3={x:p3.x,y:p3.y-h*zoom},q4={x:p4.x,y:p4.y-h*zoom};
  const accent=o.level>0?"#a18a66":"#68777c";
  const shade=o.role==="bridge"?"#35474d":i%3===0?"#384047":i%3===1?"#465057":"#30383d";
  const top=o.role==="platform"?"#5f6f72":o.role==="tower"?"#697a7e":i%4===0?"#727875":i%4===1?"#646c70":"#5c666b";
  ctx.save();
  ctx.globalAlpha=.22;ctx.fillStyle="#000";
  ctx.beginPath();ctx.moveTo(p1.x+7*zoom,p1.y+8*zoom);ctx.lineTo(p2.x+7*zoom,p2.y+8*zoom);ctx.lineTo(p3.x+7*zoom,p3.y+8*zoom);ctx.lineTo(p4.x+7*zoom,p4.y+8*zoom);ctx.closePath();ctx.fill();
  ctx.globalAlpha=1;
  ctx.fillStyle=shade;ctx.strokeStyle="#10181c";ctx.lineWidth=Math.max(1,1.2*zoom);
  ctx.beginPath();ctx.moveTo(p2.x,p2.y);ctx.lineTo(p3.x,p3.y);ctx.lineTo(q3.x,q3.y);ctx.lineTo(q2.x,q2.y);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle="#263238";
  ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.lineTo(q2.x,q2.y);ctx.lineTo(q1.x,q1.y);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle=top;
  ctx.beginPath();ctx.moveTo(q1.x,q1.y);ctx.lineTo(q2.x,q2.y);ctx.lineTo(q3.x,q3.y);ctx.lineTo(q4.x,q4.y);ctx.closePath();ctx.fill();ctx.stroke();
  if(o.role==="bridge"){
    ctx.strokeStyle="rgba(161,138,102,.46)";ctx.lineWidth=Math.max(1,zoom);
    ctx.beginPath();ctx.moveTo(q1.x,q1.y);ctx.lineTo(q2.x,q2.y);ctx.stroke();
    ctx.strokeStyle="rgba(158,128,82,.26)";ctx.beginPath();ctx.moveTo((q1.x+q4.x)*.5,(q1.y+q4.y)*.5);ctx.lineTo((q2.x+q3.x)*.5,(q2.y+q3.y)*.5);ctx.stroke();
  }else if(o.role==="platform"||o.role==="base"){
    ctx.strokeStyle=o.level>0?"rgba(161,138,102,.30)":"rgba(158,128,82,.24)";
    ctx.lineWidth=Math.max(1,zoom);
    ctx.strokeRect(Math.min(q1.x,q3.x),Math.min(q1.y,q3.y),Math.abs(q3.x-q1.x),Math.abs(q3.y-q1.y)*.18);
    if(o.role==="platform"){
      // Slender structural fascia and underside shadows.
      ctx.strokeStyle="rgba(23,27,27,.85)";
      ctx.lineWidth=Math.max(1,2*zoom);
      ctx.beginPath();ctx.moveTo(q3.x,q3.y);ctx.lineTo(q3.x,q3.y+7*zoom);ctx.lineTo(q4.x,q4.y+7*zoom);ctx.lineTo(q4.x,q4.y);ctx.stroke();
    }
  }
  /* Industrial surface detail: break up large empty slabs without introducing
     per-frame object allocations or image dependencies. */
  if(o.role==="platform"||o.role==="base"||o.role==="building"||o.role==="equipment"){
    ctx.save();
    ctx.globalAlpha=o.level>0?.46:.34;
    ctx.strokeStyle=o.level>0?"#89d9dc":"#a0a7a9";
    ctx.lineWidth=Math.max(.7,.9*zoom);
    const lanes=Math.max(2,Math.min(6,Math.round(o.w/120)));
    for(let k=1;k<lanes;k++){
      const t=k/lanes;
      const a={x:q1.x+(q2.x-q1.x)*t,y:q1.y+(q2.y-q1.y)*t};
      const b={x:q4.x+(q3.x-q4.x)*t,y:q4.y+(q3.y-q4.y)*t};
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    }
    const cuts=Math.max(1,Math.min(4,Math.round(o.h/130)));
    for(let k=1;k<cuts;k++){
      const t=k/cuts;
      const a={x:q1.x+(q4.x-q1.x)*t,y:q1.y+(q4.y-q1.y)*t};
      const b={x:q2.x+(q3.x-q2.x)*t,y:q2.y+(q3.y-q2.y)*t};
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    }
    if(o.role==="base"){
      ctx.strokeStyle="rgba(255,183,75,.62)";
      ctx.lineWidth=Math.max(1,1.4*zoom);
      const t=.5;
      const a={x:q1.x+(q2.x-q1.x)*t,y:q1.y+(q2.y-q1.y)*t};
      const b={x:q4.x+(q3.x-q4.x)*t,y:q4.y+(q3.y-q4.y)*t};
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    }
    ctx.restore();
  }
  if(o.role==="platform"||o.role==="bridge"){
    ctx.save();
    ctx.strokeStyle="#3d403d";ctx.lineWidth=Math.max(1.2,1.8*zoom);
    const rail=9*zoom;
    ctx.beginPath();
    ctx.moveTo(q1.x,q1.y-rail);ctx.lineTo(q2.x,q2.y-rail);
    ctx.moveTo(q2.x,q2.y-rail);ctx.lineTo(q3.x,q3.y-rail);
    ctx.stroke();
    for(let k=0;k<=5;k++){
      const t=k/5;
      const ax=q1.x+(q2.x-q1.x)*t,ay=q1.y+(q2.y-q1.y)*t;
      const bx=q2.x+(q3.x-q2.x)*t,by=q2.y+(q3.y-q2.y)*t;
      ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(ax,ay-rail);ctx.moveTo(bx,by);ctx.lineTo(bx,by-rail);ctx.stroke();
    }
    ctx.restore();
  }
  if(o.role==="container"){
    ctx.save();
    const band=Math.max(2,5*zoom);
    ctx.fillStyle=i%2?"#4d514e":"#5a5045";ctx.strokeStyle="#202424";ctx.lineWidth=Math.max(1,zoom);
    ctx.fillRect(q1.x,q1.y,q3.x-q1.x,q3.y-q1.y);
    ctx.strokeRect(q1.x,q1.y,q3.x-q1.x,q3.y-q1.y);
    ctx.strokeStyle="rgba(183,145,92,.45)";ctx.lineWidth=band;
    ctx.beginPath();ctx.moveTo(q1.x+(q2.x-q1.x)*.33,q1.y);ctx.lineTo(q4.x+(q3.x-q4.x)*.33,q4.y);ctx.stroke();
    ctx.beginPath();ctx.moveTo(q1.x+(q2.x-q1.x)*.66,q1.y);ctx.lineTo(q4.x+(q3.x-q4.x)*.66,q4.y);ctx.stroke();
    ctx.restore();
  }else if(o.role==="tank"){
    ctx.save();
    const cx=(q1.x+q3.x)*.5,cy=(q1.y+q3.y)*.5;
    ctx.fillStyle="#62625b";ctx.strokeStyle="#242827";ctx.lineWidth=Math.max(1,zoom);
    ctx.beginPath();ctx.ellipse(cx,cy-24*zoom,28*zoom,10*zoom,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.moveTo(cx-28*zoom,cy-24*zoom);ctx.lineTo(cx-28*zoom,cy+26*zoom);ctx.quadraticCurveTo(cx,cy+38*zoom,cx+28*zoom,cy+26*zoom);ctx.lineTo(cx+28*zoom,cy-24*zoom);ctx.stroke();
    ctx.strokeStyle="#927b5b";
    for(let k=-1;k<=1;k++){ctx.beginPath();ctx.moveTo(cx+k*18*zoom,cy-20*zoom);ctx.lineTo(cx+k*18*zoom,cy+25*zoom);ctx.stroke();}
    ctx.restore();
  }else if(o.role==="pipe"){
    ctx.save();
    const cx=(q1.x+q3.x)*.5;
    ctx.strokeStyle="#6b6256";ctx.lineWidth=Math.max(5,9*zoom);ctx.lineCap="square";
    ctx.beginPath();ctx.moveTo(cx,q1.y);ctx.lineTo(cx,q3.y);ctx.stroke();
    ctx.strokeStyle="#292d2c";ctx.lineWidth=Math.max(1,2*zoom);
    ctx.beginPath();ctx.moveTo(cx-4*zoom,q1.y);ctx.lineTo(cx-4*zoom,q3.y);ctx.stroke();
    ctx.restore();
  }else if(o.role==="stairs"){
    ctx.save();
    const x0=q1.x,x1=q2.x,yy=q1.y,yy2=q3.y;
    ctx.strokeStyle="#2a2e2d";ctx.lineWidth=Math.max(2,3*zoom);
    for(let k=0;k<7;k++){const t=k/7,y=yy+(yy2-yy)*t;ctx.beginPath();ctx.moveTo(x0+(x1-x0)*t*.35,y);ctx.lineTo(x1-(x1-x0)*t*.35,y);ctx.stroke();}
    ctx.strokeStyle="#806d52";ctx.lineWidth=Math.max(1,1.5*zoom);
    ctx.beginPath();ctx.moveTo(x0,yy);ctx.lineTo(x0+(x1-x0)*.2,yy2);ctx.moveTo(x1,yy);ctx.lineTo(x1-(x1-x0)*.2,yy2);ctx.stroke();
    ctx.restore();
  }else if(o.role==="barrier"){
    ctx.save();ctx.strokeStyle="#383c3a";ctx.lineWidth=Math.max(4,7*zoom);
    ctx.beginPath();ctx.moveTo(q1.x,q1.y);ctx.lineTo(q3.x,q3.y);ctx.stroke();
    ctx.strokeStyle="#a07b4e";ctx.lineWidth=Math.max(1,2*zoom);
    for(let k=0;k<4;k++){const t=k/4;ctx.beginPath();ctx.moveTo(q1.x+(q3.x-q1.x)*t,q1.y+(q3.y-q1.y)*t);ctx.lineTo(q1.x+(q3.x-q1.x)*t+12*zoom,q1.y+(q3.y-q1.y)*t-12*zoom);ctx.stroke();}
    ctx.restore();
  }
  if(o.role==="tower"){
    ctx.strokeStyle="rgba(84,214,216,.65)";ctx.lineWidth=2*zoom;
    ctx.beginPath();ctx.arc((q1.x+q3.x)*.5,(q1.y+q3.y)*.5,18*zoom,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle="rgba(84,214,216,.30)";ctx.lineWidth=Math.max(1,zoom);
    ctx.beginPath();
    ctx.moveTo((q1.x+q2.x)*.5,(q1.y+q2.y)*.5);
    ctx.lineTo((q3.x+q4.x)*.5,(q3.y+q4.y)*.5);
    ctx.moveTo((q2.x+q3.x)*.5,(q2.y+q3.y)*.5);
    ctx.lineTo((q4.x+q1.x)*.5,(q4.y+q1.y)*.5);
    ctx.stroke();
  }
  ctx.restore();
}
function isoActorPoint(x:number,y:number,centerX:number,centerY:number,z:number,targetX:number,targetY:number,yaw:number){
  return isoProject(x,y,centerX,centerY,z,targetX,targetY,yaw);
}
function isoActorAngle(x:number,y:number,dx:number,dy:number,z:number,targetX:number,targetY:number,yaw:number):number{
  const a=isoProject(x,y,0,0,z,targetX,targetY,yaw);
  const b=isoProject(x+dx,y+dy,0,0,z,targetX,targetY,yaw);
  return Math.atan2(b.y-a.y,b.x-a.x);
}
function poly(points:{x:number;y:number}[],fill:string,stroke="#11181c",sw=1){
  if(!ctx||points.length<3)return;
  ctx.fillStyle=fill;ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
  for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);
  ctx.closePath();ctx.fill();
  if(sw>0){ctx.strokeStyle=stroke;ctx.lineWidth=sw;ctx.stroke();}
}
function box3D(x:number,y:number,w:number,h:number,depth:number,front:string,side:string,top:string,stroke="#11181c"){
  const d=depth*.62;
  poly([{x:x,y:y},{x:x+w,y:y},{x:x+w,y:y+h},{x:x,y:y+h}],front,stroke,1.1);
  poly([{x:x+w,y:y},{x:x+w+d,y:y-depth*.30},{x:x+w+d,y:y+h-depth*.30},{x:x+w,y:y+h}],side,stroke,.9);
  poly([{x:x,y:y},{x:x+d,y:y-depth*.30},{x:x+w+d,y:y-depth*.30},{x:x+w,y:y}],top,stroke,.9);
}
function limb3D(x1:number,y1:number,x2:number,y2:number,w:number,depth:number,front:string,side:string){
  const dx=x2-x1,dy=y2-y1,d=Math.hypot(dx,dy)||1,nx=-dy/d,ny=dx/d;
  const a={x:x1+nx*w*.5,y:y1+ny*w*.5},b={x:x2+nx*w*.5,y:y2+ny*w*.5};
  const c={x:x2-nx*w*.5,y:y2-ny*w*.5},d0={x:x1-nx*w*.5,y:y1-ny*w*.5};
  poly([a,b,c,d0],front,"#10171b",.9);
  const off={x:depth*.55,y:-depth*.38};
  poly([b,{x:b.x+off.x,y:b.y+off.y},{x:c.x+off.x,y:c.y+off.y},c],side,"#10171b",.7);
}

function actorWorldPoint(baseX:number,baseY:number,lx:number,ly:number,angle:number){
  const co=Math.cos(angle),sn=Math.sin(angle);
  return {x:baseX+lx*co-ly*sn,y:baseY+lx*sn+ly*co};
}
function projectActor3D(wx:number,wy:number,height:number,centerX:number,centerY:number,z:number,targetX:number,targetY:number,yaw:number){
  const p=isoProject(wx,wy,centerX,centerY,z,targetX,targetY,yaw);
  return {x:p.x,y:p.y-height*z};
}
function isoVolumeBox(
  cx:number,cy:number,w:number,d:number,h:number,rot:number,baseHeight:number,
  centerX:number,centerY:number,z:number,targetX:number,targetY:number,yaw:number,
  front:string,side:string,top:string,accent?:string
){
  if(!ctx)return;
  const pts=[
    actorWorldPoint(cx,cy,-w*.5,-d*.5,rot),
    actorWorldPoint(cx,cy, w*.5,-d*.5,rot),
    actorWorldPoint(cx,cy, w*.5, d*.5,rot),
    actorWorldPoint(cx,cy,-w*.5, d*.5,rot)
  ];
  const lo=pts.map(p=>projectActor3D(p.x,p.y,baseHeight,centerX,centerY,z,targetX,targetY,yaw));
  const hi=pts.map(p=>projectActor3D(p.x,p.y,baseHeight+h,centerX,centerY,z,targetX,targetY,yaw));
  poly([lo[0],lo[1],hi[1],hi[0]],front,"#10171b",.8);
  poly([lo[1],lo[2],hi[2],hi[1]],side,"#10171b",.8);
  poly([hi[0],hi[1],hi[2],hi[3]],top,"#10171b",.9);
  if(accent){
    ctx.strokeStyle=accent;ctx.globalAlpha=.7;ctx.lineWidth=Math.max(.8,z);
    ctx.beginPath();ctx.moveTo(hi[0].x,hi[0].y);ctx.lineTo(hi[1].x,hi[1].y);ctx.stroke();
    ctx.globalAlpha=1;
  }
}
function isoBeam(
  x1:number,y1:number,x2:number,y2:number,width:number,height:number,baseHeight:number,
  centerX:number,centerY:number,z:number,targetX:number,targetY:number,yaw:number,
  front:string,side:string,top:string,rotOffset=0
){
  const a=Math.atan2(y2-y1,x2-x1)+rotOffset;
  const nx=-Math.sin(a)*width*.5,ny=Math.cos(a)*width*.5;
  const q1={x:x1+nx,y:y1+ny},q2={x:x2+nx,y:y2+ny},q3={x:x2-nx,y:y2-ny},q4={x:x1-nx,y:y1-ny};
  const lo=[q1,q2,q3,q4].map(p=>projectActor3D(p.x,p.y,baseHeight,centerX,centerY,z,targetX,targetY,yaw));
  const hi=[q1,q2,q3,q4].map(p=>projectActor3D(p.x,p.y,baseHeight+height,centerX,centerY,z,targetX,targetY,yaw));
  poly([lo[0],lo[1],hi[1],hi[0]],front,"#10171b",.8);
  poly([lo[1],lo[2],hi[2],hi[1]],side,"#10171b",.8);
  poly([hi[0],hi[1],hi[2],hi[3]],top,"#10171b",.9);
}
function drawIsoOperator(centerX:number,centerY:number,z:number,targetX:number,targetY:number,yaw:number){
  if(!ctx||!player)return;
  const moving=soldierController?.isMoving?Math.min(1,(Math.abs(moveX)+Math.abs(moveY))/.35):0;
  const ground=isoActorPoint(player.x,player.y,centerX,centerY,z,targetX,targetY,yaw);
  const modelScale=6.2;
  const aimState=player.attackState==="windup"||player.attackState==="cooldown"||auto||attackTarget!==null||attackNode!==null;
  const bodyFacing=soldierController?.bodyAngle??player.facing;
  const animationPhase=soldierController?.walkPhase??walkPhase;
  ctx.save();
  ctx.globalAlpha=.34;ctx.fillStyle="#000";ctx.beginPath();
  ctx.ellipse(ground.x,ground.y+3,25*modelScale*z,8*modelScale*z,0,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=.12;ctx.fillStyle=L().color;ctx.beginPath();
  ctx.ellipse(ground.x,ground.y,31*modelScale*z,10*modelScale*z,0,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=1;
  // Primary player model: the supplied Space Marine Star 3MF, converted to a
  // compact flat-shaded runtime mesh. Combat/controller state remains unchanged.
  renderSpaceMarineStar({
    ctx:ctx!,
    baseX:player.x,baseY:player.y,
    facing:bodyFacing,
    scale:modelScale*.18,
    moving,
    walkPhase:animationPhase,
    aiming:aimState,
    firing:player.attackState==="cooldown"?Math.min(1,player.attackTimer/8):0,
    color:L().color,
    project:(wx,wy,h)=>projectActor3D(wx,wy,h,centerX,centerY,z,targetX,targetY,yaw)
  });
  ctx.globalAlpha=.7;ctx.strokeStyle=L().color;ctx.lineWidth=Math.max(.8,z);
  ctx.beginPath();ctx.ellipse(ground.x,ground.y,25*modelScale*z,8*modelScale*z,0,0,Math.PI*2);ctx.stroke();
  ctx.restore();
}
function drawIsoMob(m:Mob,centerX:number,centerY:number,z:number,targetX:number,targetY:number,yaw:number){
  if(!ctx||m.hp<=0)return;
  const S=m.type==="sniper"?1.22:m.type==="shooter"?1.12:1.08;
  const color=m.type==="brawler"?"#ff557d":m.type==="shooter"?"#ffb04f":"#cf7cff";
  const body=m.team==="enemy"?Math.atan2(player.y-m.y,player.x-m.x):0;
  const moving=Math.hypot(m.x-m.lastX,m.y-m.lastY)>.08;
  const bob=moving?Math.abs(Math.sin(frame*.12+m.x*.01))*1.8:Math.sin(frame*.045+m.x*.01)*.7;
  const ground=isoActorPoint(m.x,m.y,centerX,centerY,z,targetX,targetY,yaw);
  const bodyCol=m.type==="brawler"?"#5a2934":m.type==="shooter"?"#55462d":"#40345a";
  const sideCol=m.type==="brawler"?"#301820":m.type==="shooter"?"#302719":"#261d38";
  const topCol=m.type==="brawler"?"#ad5269":m.type==="shooter"?"#b78445":"#805faa";
  ctx.save();
  ctx.globalAlpha=.30;ctx.fillStyle="#000";ctx.beginPath();ctx.ellipse(ground.x,ground.y+3,18*S*z,6*S*z,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;

  const footL=actorWorldPoint(m.x,m.y,-6*S+(moving?Math.sin(frame*.12+m.x)*3*S:0),0,body);
  const footR=actorWorldPoint(m.x,m.y, 6*S-(moving?Math.sin(frame*.12+m.x)*3*S:0),0,body);
  const h=m.type==="sniper"?95*S:m.type==="shooter"?83*S:75*S;
  isoVolumeBox(footL.x,footL.y,9*S,11*S,7*S,body,0,centerX,centerY,z,targetX,targetY,yaw,"#171f24","#0a1115","#3c494e");
  isoVolumeBox(footR.x,footR.y,9*S,11*S,7*S,body,0,centerX,centerY,z,targetX,targetY,yaw,"#171f24","#0a1115","#3c494e");
  isoVolumeBox(footL.x,footL.y,8*S,9*S,h*.30,body,7*S,centerX,centerY,z,targetX,targetY,yaw,bodyCol,sideCol,topCol);
  isoVolumeBox(footR.x,footR.y,8*S,9*S,h*.30,body,7*S,centerX,centerY,z,targetX,targetY,yaw,bodyCol,sideCol,topCol);

  // Distinct armor silhouette by mob class.
  const torsoH=h*.30, torsoZ=30*S;
  isoVolumeBox(m.x,m.y,24*S,17*S,torsoH,body,torsoZ,centerX,centerY,z,targetX,targetY,yaw,bodyCol,sideCol,topCol,color);
  isoVolumeBox(m.x,m.y,30*S,19*S,h*.27,body,torsoZ+torsoH-4*S,centerX,centerY,z,targetX,targetY,yaw,bodyCol,sideCol,topCol,color);

  if(m.type==="brawler"){
    const a1=actorWorldPoint(m.x,m.y,-19*S,0,body),a2=actorWorldPoint(m.x,m.y,19*S,0,body);
    isoBeam(a1.x,a1.y,actorWorldPoint(m.x,m.y,-28*S,4*S,body).x,actorWorldPoint(m.x,m.y,-28*S,4*S,body).y,9*S,11*S,52*S,centerX,centerY,z,targetX,targetY,yaw,bodyCol,sideCol,topCol);
    isoBeam(a2.x,a2.y,actorWorldPoint(m.x,m.y,28*S,4*S,body).x,actorWorldPoint(m.x,m.y,28*S,4*S,body).y,9*S,11*S,52*S,centerX,centerY,z,targetX,targetY,yaw,bodyCol,sideCol,topCol);
    isoVolumeBox(m.x,m.y,34*S,21*S,9*S,body,55*S,centerX,centerY,z,targetX,targetY,yaw,topCol,sideCol,"#c36b7c",color);
  }else{
    const hand=actorWorldPoint(m.x,m.y,18*S,0,body),muzzle=actorWorldPoint(m.x,m.y,34*S,0,body);
    isoBeam(hand.x,hand.y,muzzle.x,muzzle.y,7*S,6*S,55*S,centerX,centerY,z,targetX,targetY,yaw,"#202c31","#0d1519","#68777b");
    if(m.type==="sniper"){
      const long=actorWorldPoint(m.x,m.y,49*S,0,body);
      isoBeam(muzzle.x,muzzle.y,long.x,long.y,5*S,5*S,55*S,centerX,centerY,z,targetX,targetY,yaw,"#11191e","#080e12","#777f82");
    }
  }

  // Helmet and illuminated face panel.
  const headZ=torsoZ+torsoH+h*.20;
  const headH=h*.16;
  isoVolumeBox(m.x,m.y,17*S,15*S,headH,body,headZ,centerX,centerY,z,targetX,targetY,yaw,topCol,sideCol,"#a0a4a0",color);
  const face=actorWorldPoint(m.x,m.y,7*S,-8*S,body);
  isoVolumeBox(face.x,face.y,11*S,4*S,5*S,body,headZ+headH*.34,centerX,centerY,z,targetX,targetY,yaw,"#080f13","#03080b","#16282d",color);

  // Back module gives every mob a readable 3D silhouette.
  const pack=actorWorldPoint(m.x,m.y,-10*S,0,body);
  isoVolumeBox(pack.x,pack.y,10*S,10*S,h*.28,body,torsoZ,centerX,centerY,z,targetX,targetY,yaw,"#202b30","#0c1418","#4d5b60");

  if(m.type==="sniper"&&m.think>0){
    ctx.globalAlpha=.25+Math.sin(frame*.16)*.10;ctx.strokeStyle=color;ctx.lineWidth=1;
    ctx.beginPath();ctx.ellipse(ground.x,ground.y,30*S*z,9*S*z,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
  }
  ctx.globalAlpha=.62;ctx.strokeStyle=color;ctx.lineWidth=1*z;
  ctx.beginPath();ctx.ellipse(ground.x,ground.y,18*S*z,5*S*z,0,0,Math.PI*2);ctx.stroke();
  ctx.restore();
}
function drawIsoActors(centerX:number,centerY:number,z:number,targetX:number,targetY:number,yaw:number){
  if(!ctx)return;
  const actors:Array<{m:Mob|null;depth:number}>=mobs.map(m=>({m,depth:isoActorPoint(m.x,m.y,centerX,centerY,z,targetX,targetY,yaw).y}));
  if(player)actors.push({m:null,depth:isoActorPoint(player.x,player.y,centerX,centerY,z,targetX,targetY,yaw).y});
  actors.sort((a,b)=>a.depth-b.depth);
  for(const item of actors)if(item.m)drawIsoMob(item.m,centerX,centerY,z,targetX,targetY,yaw);else drawIsoOperator(centerX,centerY,z,targetX,targetY,yaw);
}


function drawIsoDefenseNode(n:Node,centerX:number,centerY:number,z:number,targetX:number,targetY:number,yaw:number):void{
  if(!ctx||n.hp<=0)return;
  const c=n.team==="enemy"?"#ff557d":"#54d6d8";
  const p=isoProject(n.x,n.y,centerX,centerY,z,targetX,targetY,yaw);
  const s=Math.max(.8,z);
  ctx.save();
  ctx.globalAlpha=.20;ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(p.x,p.y+3,34*s,11*s,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  // Raised turret plinth.
  poly([{x:p.x-30*s,y:p.y},{x:p.x,y:p.y-12*s},{x:p.x+30*s,y:p.y},{x:p.x,y:p.y+12*s}], "#263238","#11181c",1);
  poly([{x:p.x-22*s,y:p.y-1*s},{x:p.x,y:p.y-9*s},{x:p.x+22*s,y:p.y-1*s},{x:p.x,y:p.y+7*s}], "#536166","#11181c",.8);
  // Turret body.
  const topY=p.y-32*s;
  poly([{x:p.x-16*s,y:topY+10*s},{x:p.x,y:topY},{x:p.x+16*s,y:topY+10*s},{x:p.x,y:topY+19*s}], "#6b7778","#11181c",.9);
  ctx.fillStyle="#29363b";ctx.strokeStyle="#11181c";ctx.lineWidth=.9*s;
  ctx.beginPath();ctx.moveTo(p.x-14*s,topY+10*s);ctx.lineTo(p.x-10*s,topY+31*s);ctx.lineTo(p.x+10*s,topY+31*s);ctx.lineTo(p.x+14*s,topY+10*s);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle=c;ctx.shadowColor=c;ctx.shadowBlur=10*s;ctx.beginPath();ctx.arc(p.x,topY+9*s,4*s,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  ctx.strokeStyle=c;ctx.globalAlpha=.7;ctx.beginPath();ctx.arc(p.x,p.y,34*s,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
  bar(p.x-28*s,p.y-52*s,56*s,4*s,n.hp,n.maxHp,c);
  ctx.restore();
}
function drawIsoCore(centerX:number,centerY:number,z:number,targetX:number,targetY:number,yaw:number):void{
  if(!ctx)return;
  const p=isoProject(core.x,core.y,centerX,centerY,z,targetX,targetY,yaw,24);
  const s=Math.max(.8,z),c="#54d6d8";
  ctx.save();
  ctx.globalAlpha=.18;ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(p.x,p.y+4,48*s,15*s,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  poly([{x:p.x-42*s,y:p.y},{x:p.x,y:p.y-17*s},{x:p.x+42*s,y:p.y},{x:p.x,y:p.y+17*s}], "#26383e","#0e171b",1.2);
  poly([{x:p.x-31*s,y:p.y-1*s},{x:p.x,y:p.y-13*s},{x:p.x+31*s,y:p.y-1*s},{x:p.x,y:p.y+11*s}], "#43555a","#132025",1);
  ctx.fillStyle="#0d171b";ctx.strokeStyle=c;ctx.lineWidth=2*s;
  ctx.beginPath();ctx.ellipse(p.x,p.y-13*s,23*s,12*s,0,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.shadowColor=c;ctx.shadowBlur=20*s;ctx.fillStyle=c;ctx.beginPath();ctx.arc(p.x,p.y-16*s,9*s,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  ctx.fillStyle="#eaffff";ctx.beginPath();ctx.arc(p.x,p.y-17*s,3*s,0,Math.PI*2);ctx.fill();
  ctx.restore();
}

function drawSpaceBackdrop():void{
  if(!ctx)return;
  const g=ctx.createRadialGradient(viewW*.78,viewH*.76,20,viewW*.78,viewH*.76,Math.max(viewW,viewH)*.72);
  g.addColorStop(0,"#243b50");g.addColorStop(.28,"#111c2d");g.addColorStop(.62,"#070d18");g.addColorStop(1,"#02050a");
  ctx.fillStyle=g;ctx.fillRect(0,0,viewW,viewH);
  ctx.save();ctx.globalAlpha=.28;ctx.fillStyle="#356f8c";
  ctx.beginPath();ctx.ellipse(viewW*1.02,viewH*.88,viewW*.72,viewH*.22,-.12,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=.18;ctx.fillStyle="#8b4e91";
  ctx.beginPath();ctx.ellipse(viewW*.18,viewH*.23,viewW*.42,viewH*.16,-.35,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=1;
  // Deterministic stars: no random work in the render loop.
  for(let i=0;i<42;i++){
    const x=(i*83+37)%Math.max(1,viewW),y=(i*47+19)%Math.max(1,viewH);
    const r=i%7===0?1.35:.65;
    ctx.fillStyle=i%5===0?"#73d8e8":"#c8d9e8";
    ctx.globalAlpha=i%7===0?.72:.38;
    ctx.fillRect(x,y,r,r);
  }
  ctx.globalAlpha=1;ctx.restore();
}
function drawWorld(){
  const isoZoom=cameraState.zoom;
  const cam=getCameraTarget();
  const targetX=cam.x,targetY=cam.y;
  const centerX=viewW*.5;
  // The player is the visual anchor; look-ahead is expressed by targetX/Y,
  // not by moving the player toward the lower edge of the viewport.
  // The feet anchor slightly below geometric screen center so the full body,
  // including the head, sits around the visual center of the viewport.
  const centerY=viewH*.52;
  const c=.8660254038,si=.5,co=Math.cos(cameraYaw),sn=Math.sin(cameraYaw);
  const ia=c*(co+sn),ib=c*(-sn-co),ic=si*(co-sn),id=si*(sn+co);
  drawSpaceBackdrop();

  // Ground/floor is rendered in world space through the exact same camera transform.
  ctx!.save();
  ctx!.translate(centerX,centerY);ctx!.scale(isoZoom,isoZoom);ctx!.transform(ia,ic,ib,id,0,0);ctx!.translate(-targetX,-targetY);
  if(!staticDeckReady)buildStaticDeck();
  if(staticDeckCanvas)ctx!.drawImage(staticDeckCanvas,0,0);
  drawIndustrialLighting();
  ctx!.restore();

  // Everything that can overlap the player is now screen-projected and depth sorted together.
  const depthItems:Array<{depth:number;order:number;draw:()=>void}>=[];

  MAP_STRUCTURES.forEach((o,i)=>{
    depthItems.push({
      depth:isoArchitectureDepth(o,centerX,centerY,isoZoom,targetX,targetY,cameraYaw)+(o.level>0?-5000:0),
      order:i,
      draw:()=>drawIsoArchitectureItem(o,i,centerX,centerY,isoZoom,targetX,targetY,cameraYaw)
    });
  });
  {
    const p=isoProject(core.x,core.y,centerX,centerY,isoZoom,targetX,targetY,cameraYaw,24);
    depthItems.push({depth:p.y,order:80,draw:()=>drawIsoCore(centerX,centerY,isoZoom,targetX,targetY,cameraYaw)});
  }
  nodes.filter(n=>n.hp>0).forEach((n,i)=>{
    const p=isoProject(n.x,n.y,centerX,centerY,isoZoom,targetX,targetY,cameraYaw);
    depthItems.push({depth:p.y,order:100+i,draw:()=>drawIsoDefenseNode(n,centerX,centerY,isoZoom,targetX,targetY,cameraYaw)});
  });
  pickups.forEach((p,i)=>{
    const q=isoProject(p.x,p.y,centerX,centerY,isoZoom,targetX,targetY,cameraYaw);
    depthItems.push({depth:q.y,order:200+i,draw:()=>{
      const c=p.kind==="medkit"?"#ff5b55":L().color,pulse=1+Math.sin(frame*.12+p.x)*.08;
      ctx!.save();ctx!.globalAlpha=.18;ctx!.fillStyle=c;ctx!.beginPath();ctx!.ellipse(q.x,q.y,20*isoZoom*pulse,7*isoZoom*pulse,0,0,Math.PI*2);ctx!.fill();ctx!.globalAlpha=1;
      ctx!.shadowColor=c;ctx!.shadowBlur=14;ctx!.fillStyle=c;ctx!.beginPath();ctx!.arc(q.x,q.y-2,8*isoZoom,0,Math.PI*2);ctx!.fill();ctx!.shadowBlur=0;
      ctx!.fillStyle="#081013";ctx!.fillRect(q.x-4*isoZoom,q.y-3,8*isoZoom,2*isoZoom);
      if(p.kind==="medkit")ctx!.fillRect(q.x-1*isoZoom,q.y-6*isoZoom,2*isoZoom,8*isoZoom);
      ctx!.restore();
    }});
  });
  mobs.filter(m=>m.hp>0).forEach((m,i)=>{
    const p=isoActorPoint(m.x,m.y,centerX,centerY,isoZoom,targetX,targetY,cameraYaw);
    depthItems.push({depth:p.y,order:300+i,draw:()=>drawIsoMob(m,centerX,centerY,isoZoom,targetX,targetY,cameraYaw)});
  });
  if(player){
    const p=isoActorPoint(player.x,player.y,centerX,centerY,isoZoom,targetX,targetY,cameraYaw);
    depthItems.push({depth:p.y,order:500,draw:()=>drawIsoOperator(centerX,centerY,isoZoom,targetX,targetY,cameraYaw)});
  }
  if(validAttackTarget(attackTarget)){
    const p=isoActorPoint(attackTarget.x,attackTarget.y,centerX,centerY,isoZoom,targetX,targetY,cameraYaw);
    depthItems.push({depth:p.y-.5,order:490,draw:()=>{
      ctx!.save();ctx!.globalAlpha=.78;ctx!.strokeStyle=L().color;ctx!.lineWidth=1.5;
      ctx!.beginPath();ctx!.ellipse(p.x,p.y+2,22*isoZoom,7*isoZoom,0,0,Math.PI*2);ctx!.stroke();ctx!.restore();
    }});
  }
  depthItems.sort((a,b)=>a.depth-b.depth||a.order-b.order);
  for(const item of depthItems)item.draw();

  // Projectiles and transient effects remain in world space so their trajectories stay unchanged.
  ctx!.save();
  ctx!.translate(centerX,centerY);ctx!.scale(isoZoom,isoZoom);ctx!.transform(ia,ic,ib,id,0,0);ctx!.translate(-targetX,-targetY);
  for(const b of bullets){
    const c=b.from==="player"?L().color:"#ff557d";
    ctx!.save();ctx!.strokeStyle=c;ctx!.lineWidth=3;ctx!.globalAlpha=.28;ctx!.beginPath();ctx!.moveTo(b.x,b.y);ctx!.lineTo(b.x-b.vx*4,b.y-b.vy*4);ctx!.stroke();ctx!.globalAlpha=1;ctx!.lineWidth=1.5;ctx!.beginPath();ctx!.moveTo(b.x,b.y);ctx!.lineTo(b.x-b.vx*2,b.y-b.vy*2);ctx!.stroke();ctx!.restore();
  }
  for(const g of grenades){ctx!.save();ctx!.fillStyle="#d9b86c";ctx!.shadowColor="#d9b86c";ctx!.shadowBlur=8;ctx!.beginPath();ctx!.arc(g.x,g.y,6,0,Math.PI*2);ctx!.fill();ctx!.restore();}
  for(const e of effects){ctx!.globalAlpha=Math.min(1,e.life/18);txt(e.text,e.x,e.y,9,e.color,"center");}
  ctx!.globalAlpha=1;ctx!.restore();

  VFX.renderVFX(ctx!,{x:centerX,y:centerY,zoom:isoZoom,width:viewW,height:viewH,targetX,targetY,yaw:cameraYaw});
  drawHUD();
}
function drawHUD(){
  rect(0,0,viewW,82,"rgba(5,9,11,.96)");

  txt(ARENAS[arenaId].name,16,14,13,"#f0eee7");
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
  txt(player.combat.ammo+" / ∞",viewW-14,50,10,"#d9b86c","right");

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
      return '<button class="cargo-inventory-item'+(active?' active':'')+'" data-cargo-weapon="'+id+'" aria-label="Переключить '+w.name+'"><span class="cargo-inventory-icon">'+weaponIcon+'</span><span class="cargo-inventory-name">'+w.name+'</span><span class="cargo-inventory-ammo">'+(active?player.combat.ammo+" / ∞":"")+'</span></button>';
    }).join("");
    const med=player.medkits>0?'<button class="cargo-inventory-item cargo-medkit" data-cargo="medkit" aria-label="Использовать аптечку"><span class="cargo-med-icon">+</span><span class="cargo-inventory-name">MEDKIT</span><span class="cargo-inventory-ammo">x'+player.medkits+'</span></button>':"";
    ui.innerHTML='<div class="cargo-inventory"><div class="cargo-inventory-title">PICKUPS</div><div class="cargo-inventory-list">'+inventory+'</div>'+med+'</div>'+
      '<div class="cargo-touch-zone" aria-hidden="true"></div>'+
      '<div class="cargo-combat-zone" aria-label="Выбор цели"></div>'+
      '<div class="cargo-combat-radial" aria-label="Боевые действия">'+
        '<button class="cargo-combat-small cargo-ult'+(abilityCd>0?' cooldown':'')+'" data-cargo="ability" aria-label="ULT"><span class="cargo-combat-icon">✦</span><span class="cargo-combat-caption">ULT</span></button>'+
        '<button class="cargo-combat-small cargo-skill" data-cargo="grenade" aria-label="SKILL"><span class="cargo-combat-icon">◈</span><span class="cargo-combat-caption">SKILL</span></button>'+
        '<button class="cargo-combat-small cargo-tower" data-cargo="tower" aria-label="Башня"><span class="cargo-combat-icon">⌖</span><span class="cargo-combat-caption">TOWER</span></button>'+
        '<button class="cargo-fire-main" data-fire="1" aria-label="Стрелять"><span class="cargo-fire-icon">'+weapon().name.slice(0,1)+'</span><span class="cargo-fire-label">ATTACK</span></button>'+
      '</div>'+
      '<div class="cargo-bottom"><button data-cargo="reload">RELOAD</button><button data-cargo="auto">AUTO</button><button data-cargo="menu">MENU</button></div>';
  }else if(mode==="loadout")ui.innerHTML='<div class="cargo-arena-hitboxes"><button data-arena="cargo" aria-label="PLAY CARGO DECK"></button></div><div class="cargo-loadout-operators">'+(["ASSAULT","VANGUARD","RECON"]as LoadoutId[]).map(id=>'<button data-loadout="'+id+'" aria-label="'+id+'"></button>').join("")+'</div>';
  else if(mode==="weapon")ui.innerHTML='<div class="cargo-weapon-hit"></div><div class="cargo-bottom"><button data-cargo="menu">НАЗАД</button></div>';
  else ui.innerHTML='<div class="cargo-result-actions"><button data-cargo="retry">ПОВТОРИТЬ</button><button data-cargo="menu">ВЫХОД</button></div>';
  bindUI()
}
function render(){if(!root)return;root.innerHTML='<div class="freezzz-mafia-frame cargo-deck-frame"><canvas class="freezzz-mafia-canvas"></canvas><div class="freezzz-mafia-ui cargo-deck-ui"></div></div>';canvas=root.querySelector("canvas");ctx=canvas?.getContext("2d")||null;ui=root.querySelector(".cargo-deck-ui");resize();renderUI();bindUI();renderCanvas()}
function resize(){if(!root||!canvas||!ctx)return;viewW=Math.max(320,root.clientWidth||innerWidth);viewH=Math.max(480,root.clientHeight||innerHeight);const d=Math.max(1,Math.min(2,devicePixelRatio||1));canvas.width=Math.round(viewW*d);canvas.height=Math.round(viewH*d);canvas.style.width=viewW+"px";canvas.style.height=viewH+"px";ctx.setTransform(d,0,0,d,0,0);ctx.imageSmoothingEnabled=true}
function bindUI():void{
  if(!root)return;const host=root as HTMLElement & {__cargoInputBound?:boolean};if(host.__cargoInputBound)return;host.__cargoInputBound=true;let swipeY=0;
  root.addEventListener("click",(e)=>{const el=(e.target as HTMLElement|null)?.closest<HTMLElement>("[data-cargo],[data-cargo-weapon],[data-loadout],[data-arena]");if(!el)return;
    if(el.dataset.cargoWeapon!==undefined){const n=Number(el.dataset.cargoWeapon);if(Number.isFinite(n)&&save.inventory.includes(n))chooseWeapon(n);return;}
    if(el.dataset.loadout){sel=el.dataset.loadout as LoadoutId;save.loadout=sel;persist();render();return;}
    if(el.dataset.arena!==undefined){arenaId="cargo";save.loadout=sel;persist();start();return;}
    const action=el.dataset.cargo;
    if(action==="start")start();else if(action==="weapon"){mode="weapon";render();}else if(action==="reload"){startReload(player.combat,weapon());renderUI();}else if(action==="auto"){auto=!auto;msg=auto?"AUTO · ON":"AUTO · OFF";msgT=60;renderUI();}else if(action==="medkit"){medkit();renderUI();}else if(action==="grenade"){grenade();renderUI();}else if(action==="ability"){special();renderUI();}else if(action==="tower"){let nearest:Node|null=null,best=Infinity;for(const n of nodes)if(n.team==="enemy"&&n.hp>0){const dist=Math.hypot(n.x-player.x,n.y-player.y);if(dist<=weapon().range&&dist<best&&lineOfSight(player.x,player.y,n.x,n.y,obstacles())){best=dist;nearest=n}}attackNode=nearest;attackTarget=null;msg=nearest?"TOWER · TARGET LOCKED":"NO TOWER IN RANGE";msgT=45;renderUI();}else if(action==="menu")exit();else if(action==="retry")start();
  });
  root.addEventListener("pointerdown",(e)=>{if(mode!=="play")return;const el=e.target as HTMLElement|null;if(el?.closest("[data-cargo-weapon]"))return;if(el?.closest("button")&&!el?.closest("[data-fire]"))return;
    const button=ui?.querySelector<HTMLElement>("[data-fire]");if(button){const q=button.getBoundingClientRect();if(e.clientX>=q.left&&e.clientX<=q.right&&e.clientY>=q.top&&e.clientY<=q.bottom){e.preventDefault();fireHeld=true;button.classList.add("pressed");fire();return;}}
    const inv=ui?.querySelector<HTMLElement>(".cargo-inventory-list");if(inv){const q=inv.getBoundingClientRect();if(e.clientX>=q.left&&e.clientX<=q.right&&e.clientY>=q.top&&e.clientY<=q.bottom){swipeY=e.clientY;return;}}
    const combat=ui?.querySelector<HTMLElement>(".cargo-combat-zone");if(combat){const q=combat.getBoundingClientRect();if(e.clientX>=q.left&&e.clientX<=q.right&&e.clientY>=q.top&&e.clientY<=q.bottom){const rect=canvas!.getBoundingClientRect();const world=screenToWorld(e.clientX-(rect.left+rect.width*.5),e.clientY-(rect.top+rect.height*.55));selectAttackTarget(world.x,world.y);return;}}
    const touch=ui?.querySelector<HTMLElement>(".cargo-touch-zone");if(touch){const q=touch.getBoundingClientRect();if(e.clientX>=q.left&&e.clientX<=q.right&&e.clientY>=q.top&&e.clientY<=q.bottom){moveId=e.pointerId;moveOriginX=e.clientX;moveOriginY=e.clientY;try{touch.setPointerCapture(e.pointerId)}catch{};moveTargetX=0;moveTargetY=0;return;}}
  },true);
  root.addEventListener("pointermove",(e)=>{if(moveId!==e.pointerId)return;const dx=e.clientX-moveOriginX,dy=e.clientY-moveOriginY,max=105,v=screenVectorToWorld(dx,dy),len=Math.hypot(v.x,v.y)||1,k=Math.min(1,Math.hypot(dx,dy)/max);moveTargetX=Math.max(-1,Math.min(1,v.x/len*k));moveTargetY=Math.max(-1,Math.min(1,v.y/len*k));},true);
  root.addEventListener("pointerup",(e)=>{if(moveId===e.pointerId){moveId=null;moveTargetX=moveTargetY=0}if(swipeY){const inv=ui?.querySelector<HTMLElement>(".cargo-inventory-list"),q=inv?.getBoundingClientRect(),dy=e.clientY-swipeY;swipeY=0;if(q&&e.clientX>=q.left&&e.clientX<=q.right&&Math.abs(dy)>=24){const ids=save.inventory;if(ids.length){const cur=Math.max(0,ids.indexOf(player.weapon));chooseWeapon(ids[(cur+(dy<0?1:-1)+ids.length)%ids.length]);}}}fireHeld=false;ui?.querySelector("[data-fire]")?.classList.remove("pressed");},true);
  root.addEventListener("pointercancel",()=>{moveId=null;moveTargetX=moveTargetY=0;fireHeld=false;ui?.querySelector("[data-fire]")?.classList.remove("pressed")},true);
}
function getCameraZoom():number{
  // Camera scale is keyed to the operator's physical head/helmet reference.
  // On a 9:16 phone the head remains readable while the full arena still fits
  // around the centered operator.
  return Math.min(1.18,viewW/520);
}
function clampCameraTarget(x:number,y:number):{x:number;y:number}{
  const marginX=Math.min(420,Math.max(220,W*.14));
  const marginY=Math.min(520,Math.max(260,H*.14));
  return {x:Math.max(marginX,Math.min(W-marginX,x)),y:Math.max(marginY,Math.min(H-marginY,y))};
}
function updateCamera(dt:number):void{
  if(!player)return;
  const zoom=getCameraZoom();
  const moving=Math.hypot(moveX,moveY)>.04;
  const lookDistance=moving?90:0;
  const desired=clampCameraTarget(player.x+moveX*lookDistance,player.y+moveY*lookDistance);
  const ease=1-Math.exp(-dt*.18);
  cameraState.targetX=desired.x;cameraState.targetY=desired.y;cameraState.zoom=zoom;
  cameraState.x+=(desired.x-cameraState.x)*ease;
  cameraState.y+=(desired.y-cameraState.y)*ease;
  cameraState.yaw=0;
  cameraYaw=0;
}
function getCameraTarget():{x:number;y:number}{return{x:cameraState.x,y:cameraState.y}}
function screenToWorld(sx:number,sy:number):{x:number;y:number}{
  const z=getCameraZoom();
  const c=.8660254038,si=.5;
  const px=sx/(c*z),py=sy/(si*z);
  const rx=(px+py)*.5,ry=(py-px)*.5;
  const co=Math.cos(cameraState.yaw),sn=Math.sin(cameraState.yaw);
  const t=getCameraTarget();
  return{x:t.x+rx*co+ry*sn,y:t.y-rx*sn+ry*co};
}
function screenVectorToWorld(sx:number,sy:number):{x:number;y:number}{
  const c=.8660254038,si=.5;
  const px=sx/c,py=sy/si;
  const rx=(px+py)*.5,ry=(py-px)*.5;
  const co=Math.cos(cameraYaw),sn=Math.sin(cameraYaw);
  return{x:rx*co+ry*sn,y:-rx*sn+ry*co};
}
function key(e:KeyboardEvent){if(mode==="play"){if(e.key==="w"||e.key==="ArrowUp")moveTargetY=-1;if(e.key==="s"||e.key==="ArrowDown")moveTargetY=1;if(e.key==="a"||e.key==="ArrowLeft")moveTargetX=-1;if(e.key==="d"||e.key==="ArrowRight")moveTargetX=1;if(e.key===" ")fire();if(e.key==="r")startReload(player.combat,weapon());if(e.key==="g")grenade();if(e.key==="e")special();if(e.key==="q")medkit();if(e.key==="Tab"){e.preventDefault();mode="weapon";render()}for(let i=0;i<save.inventory.length;i++)if(e.key===String(i+1))chooseWeapon(save.inventory[i])}else if(mode==="loadout"&&e.key==="Enter")start();else if(mode==="weapon"&&e.key==="Escape"){mode="play";render()}else if(mode==="result"&&e.key==="Enter")start()}
function up(e:KeyboardEvent){if(["w","ArrowUp","s","ArrowDown"].includes(e.key))moveTargetY=0;if(["a","ArrowLeft","d","ArrowRight"].includes(e.key))moveTargetX=0}
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