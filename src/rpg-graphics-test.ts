type RpgScreen="menu"|"character"|"level"|"play";
type RpgState={screen:RpgScreen;level:number;xp:number;hp:number;mana:number;stamina:number;chapter:number;};

const KEY="freezzz:rpg-graphics-test:v2",W=192,H=108;
const HERO=["......111111......","....1122222211....","...122222222221...","..12222222222221..",".1222222333222221.","12222223333322221","122222333333332221",".1222233333332221.","..111222222222111..","...114444444411...","..11444444444411..",".114444444444441.","..11444444444441..","...111444444111...","....11..11..11....","...11...11...11...","..111...11...111..","..11....11....11..","...11........11...","....111....111...."];
const ENEMY=[".....111111.....","...1122222211...","..122222222221..",".122222233322221.","12222223333322221","122222333333332221",".1222233333332221.","..111222222222111..","...115555555511...","..11555555555511..",".115555555555551.","..1115555555111..","...1115555111....","....11....11.....","...111....111....","..1111....1111...","..11........11...","..11........11...","...111....111....","....111..111....."];
const PAL:Record<string,string>={"1":"#080808","2":"#d89470","3":"#f5f5f5","4":"#ff2020","5":"#9b9b9b","6":"#6e6e6e","7":"#c8c8c8","8":"#3a3a3a","9":"#ff5a5a","a":"#222","b":"#bdbdbd"};
const HERO_WALK=[...HERO]; HERO_WALK[14]="....11..11..11...."; HERO_WALK[15]="...11...11...11...";
const HERO_STEP=[...HERO]; HERO_STEP[14]=".....11..11......"; HERO_STEP[15]="....111..111....."; HERO_STEP[16]="...111....111....";
const ENEMY_WALK=[...ENEMY]; ENEMY_WALK[14]="...111....111...."; ENEMY_WALK[15]="..1111....1111...";
const BOSS=[
".......111111.......",
".....1122222211.....",
"...11222222222211...",
"..1222222333222221..",
".122222333333322221.",
"12222333333333322221",
"12222333333333322221",
"12222233333333322221",
".122222222222222221.",
"..1111222222221111..",
"...11144444444111...",
"..1114444444444111..",
".111444444444444111.",
"..11144444444444111..",
"...11144444444111....",
"....111444444111.....",
"...11..11..11..11...",
"..111..11..11..111..",
"..11...11..11...11..",
"...111........111....",
"....1111....1111.....",
"......11111111......."
];
const BOSS_HIT=[...BOSS];
BOSS_HIT[10]="...111999999111...";
BOSS_HIT[11]="..111999999999111..";
BOSS_HIT[12]=".111999999999999111.";



type Enemy={x:number;y:number;hp:number;max:number;elite:boolean;hit:number;cool:number};
type Orb={x:number;y:number;kind:"xp"|"mana";life:number};
type Spark={x:number;y:number;vx:number;vy:number;life:number};

const LEVELS=[
 {name:"GHOST DISTRICT",zone:"NEON RAIN",boss:"THE WARDEN",story:"Flooded streets. A corporation is deleting citizens from the city database.",objective:"Defeat 8 drones, then break the Warden shield."},
 {name:"BLACK CIRCUIT",zone:"UNDERCITY",boss:"NULL JACKAL",story:"The identity shard reveals an AI rebellion under the old transit grid.",objective:"Defeat 10 sentries, then destroy the quantum firewall."},
 {name:"NEON ASCENSION",zone:"SKYLINE CORE",boss:"ARCHON ZERO",story:"The city reset has begun. Reach the orbital core before every identity is erased.",objective:"Defeat 12 guardians, then stop Archon Zero."}
];

function defaults():RpgState{return{screen:"menu",level:18,xp:72,hp:100,mana:80,stamina:100,chapter:1}}
function load():RpgState{try{const p=JSON.parse(localStorage.getItem(KEY)||"");return p&&typeof p==="object"?{...defaults(),...p}:defaults()}catch{return defaults()}}
function save(s:RpgState){try{localStorage.setItem(KEY,JSON.stringify(s))}catch{}}
function sprite(c:CanvasRenderingContext2D,m:string[],x:number,y:number,z:number){for(let r=0;r<m.length;r++)for(let q=0;q<m[r].length;q++){const k=m[r][q];if(k!=="."){c.fillStyle=PAL[k]||"#fff";const px=Math.floor(x+q*z),py=Math.floor(y+r*z),sz=Math.max(1,Math.ceil(z));c.fillRect(px,py,sz,sz)}}}
function clamp(n:number,a:number,b:number){return Math.max(a,Math.min(b,n))}
function dist(a:number,b:number,c:number,d:number){return Math.hypot(a-c,b-d)}
function esc(v:string){return v.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]||c))}

type RpgQuality={name:"web"|"tv"|"low";fps:number;rain:number;sparks:number;bloom:boolean};
const RpgEnv=(()=>{
  const ua=navigator.userAgent||"";
  const tv=/SmartTV|Tizen|Web0S|WebOS|NetCast|HbbTV|BRAVIA|Viera|Aquos|GoogleTV|Android TV/i.test(ua)
    || matchMedia("(min-width:1600px) and (pointer:coarse)").matches;
  const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
  const low=(navigator.hardwareConcurrency||8)<=4 || Number((navigator as Navigator & {deviceMemory?:number}).deviceMemory||8)<=4;
  const quality:RpgQuality=tv?{name:"tv",fps:30,rain:12,sparks:5,bloom:false}:reduced||low?{name:"low",fps:45,rain:18,sparks:7,bloom:false}:{name:"web",fps:60,rain:34,sparks:10,bloom:true};
  return {quality};
})();

export function mountRpgGraphicsTest(host:HTMLElement):()=>void{
 const s=load();let alive=true,raf=0,last=performance.now(),elapsed=0,shake=0,flash=0,lastFrame=0;
 const quality=RpgEnv.quality; let activeCanvas:HTMLCanvasElement|null=null; let activeContext:CanvasRenderingContext2D|null=null;
 const keys=new Set<string>(),sparks:Spark[]=[],orbs:Orb[]=[];let enemies:Enemy[]=[];let boss:Enemy|null=null;
 let px=96,py=82,attack=0,dash=0,skill=0,spawn=0,kills=0,waveDone=false,won=false,attackFx=0,skillFx=0,skillHit=false,damageFlash=0;
 const joy={x:0,y:0,active:false};let joyPointer=-1;

 function resetPlay(){
   s.screen="play";px=96;py=82;attack=0;dash=0;skill=0;spawn=0;kills=0;waveDone=false;won=false;boss=null;enemies=[];orbs.length=0;s.hp=100;s.mana=80;s.stamina=100;
   const count=6+s.chapter*2;
   for(let i=0;i<count;i++)spawnEnemy(i,false);
   save(s);buildPlay();
 }
 function spawnEnemy(i:number,elite:boolean){
   const a=(i*2.399)%6.283,r=35+(i%4)*9;
   enemies.push({x:96+Math.cos(a)*r,y:63+Math.sin(a)*r*.55,hp:elite?90:30+s.chapter*5,max:elite?90:30+s.chapter*5,elite,hit:0,cool:i%3});
 }
 function buildMenu(){
   s.screen="menu";
   host.innerHTML='<section class="rpgx rpgx-quality-'+quality.name+'" data-rpg-screen="menu"><div class="rpgx-stage"><canvas class="rpgx-canvas" width="384" height="216"></canvas><div class="rpgx-hud"><span class="rpgx-badge">PIXEL RPG / LV '+s.level+'</span><span class="rpgx-badge">3 CHAPTERS</span></div><div class="rpgx-menu"><div class="rpgx-logo"><small>FREEzzz GRAPHICS LAB</small><strong>NEON<br>CHRONICLES</strong><i>PLAYABLE CYBERPUNK RPG · PIXEL COMIC</i></div><button class="rpgx-btn primary" data-rpg-level>ENTER CHAPTER</button><button class="rpgx-btn" data-rpg-character>CHARACTER</button><div class="rpgx-menu-meta"><span>MOVE</span><span>COMBAT</span><span>BOSS</span></div></div></div></section>';
   activeCanvas=host.querySelector<HTMLCanvasElement>(".rpgx-canvas"); activeContext=activeCanvas?.getContext("2d",{alpha:false})||null;
   host.querySelector("[data-rpg-level]")?.addEventListener("click",buildLevel);
   host.querySelector("[data-rpg-character]")?.addEventListener("click",buildCharacter);
 }
 function buildLevel(){
   const l=LEVELS[s.chapter-1];
   host.innerHTML='<section class="rpgx-character rpgx-level-screen"><header class="rpgx-char-head"><button class="rpgx-icon" data-rpg-back>←</button><div><small>CHAPTER 0'+s.chapter+'</small><strong>'+esc(l.name)+'</strong></div><span>LV '+s.level+'</span></header><div class="rpgx-level-art"><div class="rpgx-comic-tag">ISSUE #0'+s.chapter+'</div><h2>'+esc(l.zone)+'</h2><p>'+esc(l.story)+'</p><div class="rpgx-objective"><small>MISSION OBJECTIVE</small><b>'+esc(l.objective)+'</b></div><div class="rpgx-comic-panels"><div><b>01</b><span>EXPLORE</span></div><div><b>02</b><span>FIGHT</span></div><div><b>03</b><span>CONFRONT</span></div></div><button class="rpgx-action" data-rpg-start>START MISSION</button><button class="rpgx-action" data-rpg-character>CHARACTER</button></div></section>';
   host.querySelector("[data-rpg-back]")?.addEventListener("click",buildMenu);
   host.querySelector("[data-rpg-start]")?.addEventListener("click",resetPlay);
   host.querySelector("[data-rpg-character]")?.addEventListener("click",buildCharacter);
 }
 function buildCharacter(){
   s.screen="character";
   host.innerHTML='<section class="rpgx-character"><header class="rpgx-char-head"><button class="rpgx-icon" data-rpg-back>←</button><div><small>CHARACTER MENU</small><strong>ARIA / VOIDWALKER</strong></div><span>LV '+s.level+'</span></header><div class="rpgx-char-grid"><section class="rpgx-portrait"><canvas class="rpgx-char-canvas" width="96" height="128"></canvas><div class="rpgx-equip e1">WEAPON<br><b>AETHER BLADE</b></div><div class="rpgx-equip e2">CORE<br><b>VOID HEART</b></div></section><section class="rpgx-stats"><div class="rpgx-xp"><span>XP <b>'+s.xp+'%</b></span><i><em style="width:'+s.xp+'%"></em></i></div><div class="rpgx-meter"><label>HP <b>'+Math.round(s.hp)+'</b></label><i><em style="width:'+s.hp+'%;background:#ff2020"></em></i></div><div class="rpgx-meter"><label>MANA <b>'+Math.round(s.mana)+'</b></label><i><em style="width:'+s.mana+'%"></em></i></div><div class="rpgx-meter"><label>STAMINA <b>'+Math.round(s.stamina)+'</b></label><i><em style="width:'+s.stamina+'%"></em></i></div><div class="rpgx-stat-grid"><div><small>STR</small><b>24</b></div><div><small>AGI</small><b>31</b></div><div><small>INT</small><b>28</b></div><div><small>VIT</small><b>19</b></div></div></section></div><div class="rpgx-items"><div class="rpgx-item"><b>✦</b><span>AETHER BLADE</span><small>+18 DMG</small></div><div class="rpgx-item"><b>◇</b><span>VOID HEART</span><small>+12 MANA</small></div><div class="rpgx-item"><b>◈</b><span>PHASE CLOAK</span><small>+8 EVADE</small></div><div class="rpgx-item"><b>✧</b><span>NEON SIGIL</span><small>+6 CRIT</small></div></div><button class="rpgx-action" data-rpg-chapter>OPEN CHAPTER</button></section>';
   const c=host.querySelector<HTMLCanvasElement>(".rpgx-char-canvas"),x=c?.getContext("2d",{alpha:false});if(c&&x){x.imageSmoothingEnabled=false;x.fillStyle="#070707";x.fillRect(0,0,96,128);for(let i=0;i<18;i++){x.fillStyle=i%2?"#111":"#080808";x.fillRect(i*6,0,2,128)}sprite(x,HERO,32,26,4)}
   host.querySelector("[data-rpg-back]")?.addEventListener("click",buildMenu);
   host.querySelector("[data-rpg-chapter]")?.addEventListener("click",buildLevel);
 }
 function buildPlay(){
   host.innerHTML='<section class="rpgx rpgx-play rpgx-quality-'+quality.name+'"><div class="rpgx-stage"><canvas class="rpgx-canvas" width="384" height="216"></canvas><div class="rpgx-play-hud"><div><b id="rpg-chapter">CHAPTER 01</b><span id="rpg-objective">DRONES 0/8</span></div><div class="rpgx-bars"><i><em id="rpg-hp"></em></i><i><em id="rpg-mana"></em></i></div></div><div class="rpgx-bossbar" id="rpg-bossbar" hidden><b id="rpg-boss-name"></b><i><em id="rpg-boss-hp"></em></i></div><div class="rpgx-touch"><div class="rpgx-joystick" data-rpg-joy><i></i></div><div class="rpgx-actions"><button data-rpg-attack>ATK</button><button data-rpg-skill>SKILL</button><button data-rpg-dash>DASH</button></div></div><div class="rpgx-play-top"><button data-rpg-exit>EXIT</button></div></div></section>';
   activeCanvas=host.querySelector<HTMLCanvasElement>(".rpgx-canvas");
   activeContext=activeCanvas?.getContext("2d",{alpha:false})||null;
   if(activeContext)activeContext.imageSmoothingEnabled=false;
   bindPlay();
 }
 function bindPlay(){
   const stage=host.querySelector<HTMLElement>(".rpgx-stage");
   const joyEl=host.querySelector<HTMLElement>("[data-rpg-joy]");
   const setJoy=(e:PointerEvent)=>{if(joyPointer!==-1&&joyPointer!==e.pointerId)return;joyPointer=e.pointerId;joy.active=true;const r=joyEl!.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;const dx=e.clientX-cx,dy=e.clientY-cy,len=Math.max(1,Math.hypot(dx,dy)),m=Math.min(1,len/(r.width*.36));joy.x=dx/len*m;joy.y=dy/len*m;const knob=joyEl!.querySelector("i") as HTMLElement;knob.style.transform='translate('+joy.x*28+'px,'+joy.y*28+'px)';};
   joyEl?.addEventListener("pointerdown",e=>{e.preventDefault();joyEl.setPointerCapture(e.pointerId);setJoy(e)});
   joyEl?.addEventListener("pointermove",e=>{if(joy.active)setJoy(e)});
   const end=()=>{joy.active=false;joy.x=0;joy.y=0;joyPointer=-1;const k=joyEl?.querySelector("i") as HTMLElement|null;if(k)k.style.transform="translate(0,0)"};
   joyEl?.addEventListener("pointerup",end);joyEl?.addEventListener("pointercancel",end);
   host.querySelector("[data-rpg-attack]")?.addEventListener("pointerdown",()=>{if(attack<=0)attack=.22});
   host.querySelector("[data-rpg-skill]")?.addEventListener("pointerdown",()=>{if(s.mana>=25&&skill<=0){skill=.5;skillFx=.5;skillHit=false;s.mana=clamp(s.mana-25,0,100)}});
   host.querySelector("[data-rpg-dash]")?.addEventListener("pointerdown",()=>{if(s.stamina>=20&&dash<=0){dash=.24;s.stamina=clamp(s.stamina-20,0,100)}});
   host.querySelector("[data-rpg-exit]")?.addEventListener("click",buildLevel);
   const keydown=(e:KeyboardEvent)=>{keys.add(e.key.toLowerCase());if(e.key===" "&&attack<=0)attack=.22;if(e.key.toLowerCase()==="q"&&s.mana>=25&&skill<=0){skill=.5;skillFx=.5;s.mana=clamp(s.mana-25,0,100)}if(e.key.toLowerCase()==="shift"&&s.stamina>=20&&dash<=0){dash=.24;s.stamina=clamp(s.stamina-20,0,100)}};
   const keyup=(e:KeyboardEvent)=>keys.delete(e.key.toLowerCase());
   window.addEventListener("keydown",keydown);window.addEventListener("keyup",keyup);
   (host as HTMLElement).dataset.rpgKeys="1";
   cleanupKeys=()=>{window.removeEventListener("keydown",keydown);window.removeEventListener("keyup",keyup)};
 }
 let cleanupKeys=()=>{};
 function doHit(power:number,range:number){
   for(const e of enemies){if(e.hp>0&&dist(px,py,e.x,e.y)<range){e.hp-=power;e.hit=.12;burst(e.x,e.y,10);if(e.hp<=0){kills++;s.xp=clamp(s.xp+3,0,100);orbs.push({x:e.x,y:e.y,kind:"xp",life:8})}}}
   if(boss&&dist(px,py,boss.x,boss.y)<range+5){boss.hp-=power;boss.hit=.12;burst(boss.x,boss.y,16);if(boss.hp<=0)finishLevel()}
   shake=.22;flash=.12;
 }
 function burst(x:number,y:number,n:number){const count=Math.max(1,Math.round(n*quality.sparks/10));for(let i=0;i<count;i++){const a=Math.random()*6.28,v=8+Math.random()*28;sparks.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.25+Math.random()*.45})}}
 function finishLevel(){won=true;s.screen="level";s.level++;s.xp=clamp(s.xp+15,0,100);s.chapter=s.chapter>=3?1:s.chapter+1;save(s);buildVictory()}
 function buildVictory(){
   host.innerHTML='<section class="rpgx-character rpgx-level-screen"><header class="rpgx-char-head"><div><small>MISSION COMPLETE</small><strong>'+esc(LEVELS[(s.chapter+1)%3].name)+'</strong></div><span>LV '+s.level+'</span></header><div class="rpgx-level-art"><div class="rpgx-comic-tag">CLEAR</div><h2>MISSION<br>COMPLETE</h2><p>THE ENEMY CORE COLLAPSED. THE NEXT CHAPTER IS READY.</p><div class="rpgx-objective"><small>REWARD</small><b>XP +15 · LEVEL UP · NEW CHAPTER UNLOCKED</b></div><button class="rpgx-action" data-rpg-next>CONTINUE</button><button class="rpgx-action" data-rpg-menu>MAIN MENU</button></div></section>';
   host.querySelector("[data-rpg-next]")?.addEventListener("click",buildLevel);host.querySelector("[data-rpg-menu]")?.addEventListener("click",buildMenu);
 }
 function update(dt:number){
   if(s.screen!=="play")return;
   const mx=(keys.has("a")||keys.has("arrowleft")?-1:0)+(keys.has("d")||keys.has("arrowright")?1:0)+(joy.active?joy.x:0);
   const my=(keys.has("w")||keys.has("arrowup")?-1:0)+(keys.has("s")||keys.has("arrowdown")?1:0)+(joy.active?joy.y:0);
   const len=Math.hypot(mx,my)||1,base=26+(dash?48:0);
   px=clamp(px+mx/len*base*dt,12,180);py=clamp(py+my/len*base*dt,40,98);
   s.stamina=clamp(s.stamina+18*dt,0,100);s.mana=clamp(s.mana+5*dt,0,100);
   if(dash){dash-=dt;burst(px,py,4)}
   attackFx=Math.max(0,attackFx-dt);damageFlash=Math.max(0,damageFlash-dt);if(attack>0){attack-=dt;if(attack<=.16&&attackFx<=0){attackFx=.22;doHit(26,15)}}
   if(skill>0){if(!skillHit&&skill<=.45){doHit(60,28);skillHit=true}skill-=dt;skillFx=Math.max(0,skillFx-dt);burst(px,py,7)}
   for(const e of enemies){if(e.hp<=0)continue;e.hit=Math.max(0,e.hit-dt);e.cool-=dt;const d=dist(px,py,e.x,e.y);if(d>10){e.x+=(px-e.x)/Math.max(1,d)*(8+(s.chapter*2))*dt;e.y+=(py-e.y)/Math.max(1,d)*(8+(s.chapter*2))*dt}else if(e.cool<=0){s.hp-=5;e.cool=1.1;flash=.08;damageFlash=.18}}
   enemies=enemies.filter(e=>e.hp>0);
   const need=6+s.chapter*2;
   if(!waveDone&&kills>=need){waveDone=true;boss={x:150,y:62,hp:180+s.chapter*50,max:180+s.chapter*50,elite:true,hit:0,cool:0};burst(150,62,30)}
   if(boss&&boss.hp>0){boss.hit=Math.max(0,boss.hit-dt);boss.cool-=dt;const d=dist(px,py,boss.x,boss.y);if(d>16){boss.x+=(px-boss.x)/Math.max(1,d)*7*dt;boss.y+=(py-boss.y)/Math.max(1,d)*7*dt}else if(boss.cool<=0){s.hp-=12;boss.cool=.8;flash=.16;damageFlash=.24;burst(px,py,10)}}
   for(const o of orbs){o.life-=dt;if(dist(px,py,o.x,o.y)<9){if(o.kind==="xp")s.xp=clamp(s.xp+5,0,100);else s.mana=clamp(s.mana+15,0,100);o.life=0}}
   for(const p of sparks){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=20*dt;p.life-=dt}while(sparks[0]?.life<=0)sparks.shift();orbs.splice(0,orbs.length,...orbs.filter(o=>o.life>0));
   if(s.hp<=0){s.hp=100;buildLevel();return}
   const obj=host.querySelector("#rpg-objective") as HTMLElement|null;if(obj)obj.textContent=waveDone?(boss?"BOSS · "+Math.max(0,Math.ceil(boss.hp)):"CLEAR"):"DRONES "+Math.min(kills,need)+"/"+need;
   const hp=host.querySelector("#rpg-hp") as HTMLElement|null;if(hp)hp.style.width=s.hp+"%";const mana=host.querySelector("#rpg-mana") as HTMLElement|null;if(mana)mana.style.width=s.mana+"%";
   const bb=host.querySelector("#rpg-bossbar") as HTMLElement|null;if(bb){bb.hidden=!boss;const b=host.querySelector("#rpg-boss-hp") as HTMLElement|null;if(b&&boss)b.style.width=clamp(boss.hp/boss.max*100,0,100)+"%";const n=host.querySelector("#rpg-boss-name") as HTMLElement|null;if(n)n.textContent=LEVELS[s.chapter-1].boss}
   save(s);
 }
 function drawBackground(x:CanvasRenderingContext2D,elapsed:number){
  // Far skyline
  x.fillStyle="#08080d";x.fillRect(0,32,W,52);
  for(let i=0;i<18;i++){
    const w=7+(i%4)*3,bx=i*12-((elapsed*2)%12),top=38-(i%5)*4;
    x.fillRect(bx,top,w,46);
    x.fillStyle=i%4===0?"#ff2020":"#242424";
    for(let wy=top+4;wy<78;wy+=7)x.fillRect(bx+2,wy,1+(i%2),2);
    x.fillStyle="#08080d";
  }
  // Mid skyline with animated parallax signs
  x.fillStyle="#101015";
  for(let i=0;i<11;i++){
    const w=10+(i%3)*4,bx=i*19-((elapsed*5)%19),top=49-(i%4)*5;
    x.fillRect(bx,top,w,35);
    x.fillStyle=i%3===0?"#ff2020":"#3a3a3a";x.fillRect(bx+2,top+5,w-4,2);
    x.fillStyle="#fff";x.fillRect(bx+3,top+6,2,3);
    x.fillStyle="#101015";
  }
  // Ground depth layers: tiled street, puddles, vents and foreground props.
  x.fillStyle="#161616";x.fillRect(0,79,W,29);
  for(let row=0;row<4;row++){
    for(let col=0;col<24;col++){
      const tx=col*8+((row%2)*4),ty=80+row*7;
      x.fillStyle=((row+col)%5===0)?"#202020":"#181818";
      x.fillRect(tx,ty,6,4);
      if((row*col+col)%11===0){x.fillStyle="#303030";x.fillRect(tx+1,ty+1,2,1)}
    }
  }
  x.fillStyle="#242424";for(let i=0;i<10;i++){const bx=(i*24-(elapsed*12)%24);x.fillRect(bx,81,14,1)}
  // Puddles with broken pixel reflections.
  for(let i=0;i<7;i++){
    const wx=(i*31-(elapsed*(2+i%3))%31),wy=86+(i%3)*5;
    x.fillStyle=i%2?"rgba(255,255,255,.10)":"rgba(255,32,32,.16)";
    x.fillRect(wx,wy,9+(i%3)*3,1);x.fillRect(wx+3,wy+1,4,1);
  }
  // Street vents and cables.
  x.fillStyle="#050505";
  for(let i=0;i<5;i++){const vx=15+i*41; x.fillRect(vx,91,9,3);x.fillStyle="#444";x.fillRect(vx+2,92,5,1);x.fillStyle="#050505"}
  x.strokeStyle="#343434";x.lineWidth=1;
  x.beginPath();x.moveTo(0,76);x.lineTo(58,84);x.lineTo(102,78);x.stroke();
  x.beginPath();x.moveTo(192,75);x.lineTo(142,84);x.lineTo(102,78);x.stroke();
  x.fillStyle="#090909";x.fillRect(0,92,W,16);
  x.strokeStyle="rgba(255,255,255,.18)";x.lineWidth=.7;
  for(let i=0;i<9;i++){x.beginPath();x.moveTo(96,83);x.lineTo(i*24,108);x.stroke()}
  x.strokeStyle="rgba(255,32,32,.36)";
  for(let i=0;i<5;i++){x.beginPath();x.moveTo(96,83);x.lineTo(i*48,108);x.stroke()}
  // Rain and atmospheric streaks
  for(let i=0;i<quality.rain;i++){
    const rx=(i*37+Math.floor(elapsed*(32+i%7)))%200-2,ry=(i*19+Math.floor(elapsed*(20+i%5)))%82;
    x.fillStyle=i%5===0?"rgba(255,32,32,.7)":"rgba(255,255,255,.42)";
    x.fillRect(rx,ry,1,2+i%3);
  }
  x.fillStyle="rgba(255,255,255,.035)";x.fillRect(0,42,W,25);
  // Foreground silhouettes and readable landmarks.
  x.fillStyle="#070707";
  x.fillRect(8,64,3,28);x.fillRect(181,61,4,31);
  x.fillRect(6,64,8,3);x.fillRect(177,61,12,3);
  x.fillStyle="#ff2020";
  x.fillRect(9,67,1,4);x.fillRect(182,64,2,5);
  // Pixel lamps with restrained bloom.
  for(const lx of [28,166]){
    x.fillStyle="#242424";x.fillRect(lx,61,1,19);x.fillRect(lx-2,61,5,2);
    if(quality.bloom){const lg=x.createRadialGradient(lx,63,0,lx,63,10);lg.addColorStop(0,"rgba(255,32,32,.20)");lg.addColorStop(1,"rgba(255,32,32,0)");x.fillStyle=lg;x.fillRect(lx-10,53,20,20)}
    x.fillStyle="#ff2020";x.fillRect(lx,62,1,2);
  }
}
function draw(now:number){
   if(!alive)return;
   const frameInterval=1000/quality.fps;
   if(lastFrame&&now-lastFrame<frameInterval){raf=requestAnimationFrame(draw);return}
   lastFrame=now;
   const c=activeCanvas,x=activeContext;if(!c||!x)return;
   const dt=Math.min(.05,(now-last)/1000);last=now;elapsed+=dt;
   if(s.screen!=="play"){
     x.imageSmoothingEnabled=false;x.setTransform(2,0,0,2,0,0);x.fillStyle="#050505";x.fillRect(0,0,W,H);
     drawBackground(x,elapsed);
     const showcaseY=67+Math.sin(elapsed*2)*1.5;
     const sh=x.createRadialGradient(96,showcaseY+8,1,96,showcaseY+8,15);
     sh.addColorStop(0,"rgba(0,0,0,.75)");sh.addColorStop(1,"rgba(0,0,0,0)");
     x.fillStyle=sh;x.fillRect(80,showcaseY,32,18);
     x.save();x.translate(86,showcaseY-20);sprite(x,HERO,0,0,1);x.restore();
     x.fillStyle="rgba(255,255,255,.06)";x.fillRect(0,34,W,1);
     x.setTransform(1,0,0,1,0,0);return;
   }
   update(dt);flash=Math.max(0,flash-dt*2.8);shake=Math.max(0,shake-dt*2);
   x.imageSmoothingEnabled=false;x.setTransform(2,0,0,2,0,0);x.fillStyle="#050505";x.fillRect(0,0,W,H);
   drawBackground(x,elapsed);
   // Perspective light pools under combatants.
   const light=(lx:number,ly:number,r:number,color:string)=>{
     const g=x.createRadialGradient(lx,ly,0,lx,ly,r);g.addColorStop(0,color);g.addColorStop(1,"rgba(0,0,0,0)");
     x.fillStyle=g;x.fillRect(lx-r,ly-r,r*2,r*2);
   };
   light(px,py,24,"rgba(255,32,32,.16)");
   if(boss)light(boss.x,boss.y,22,"rgba(255,255,255,.11)");


   if(shake)x.translate((Math.random()-.5)*shake*3,(Math.random()-.5)*shake*3);
   for(const o of orbs){const bob=Math.sin(elapsed*8+o.x)*1.5;x.fillStyle=o.kind==="xp"?"#fff":"#ff2020";x.fillRect(o.x-2,o.y-2+bob,4,4);x.fillRect(o.x-1,o.y-3+bob,2,6)}
   for(const e of enemies){
     x.save();
     const shadow=x.createRadialGradient(e.x,e.y+5,1,e.x,e.y+5,9);
     shadow.addColorStop(0,"rgba(0,0,0,.65)");shadow.addColorStop(1,"rgba(0,0,0,0)");
     x.fillStyle=shadow;x.fillRect(e.x-10,e.y-1,20,12);
     if(e.hit)x.globalAlpha=.48;
     const moving=Math.abs(e.x-px)+Math.abs(e.y-py)>10,frame=Math.floor(elapsed*7)%2;
     const em=moving&&frame?ENEMY_WALK:ENEMY;
     x.translate(Math.floor(e.x-10),Math.floor(e.y-20));sprite(x,em,0,0,1);x.restore();
     x.fillStyle="#000";x.fillRect(e.x-8,e.y-23,16,2);x.fillStyle="#ff2020";x.fillRect(e.x-8,e.y-23,16*(e.hp/e.max),2);
   }
   if(boss){
     x.save();
     const pulse=1+Math.sin(elapsed*6)*.06;
     const bossShadow=x.createRadialGradient(boss.x,boss.y+9,1,boss.x,boss.y+9,15);
     bossShadow.addColorStop(0,"rgba(0,0,0,.75)");bossShadow.addColorStop(1,"rgba(0,0,0,0)");
     x.fillStyle=bossShadow;x.fillRect(boss.x-16,boss.y-3,32,22);
     x.translate(Math.floor(boss.x-14),Math.floor(boss.y-23));
     x.globalAlpha=boss.hit>0?.72:1;
     sprite(x,boss.hit>0?BOSS_HIT:BOSS,0,0,pulse);
     x.restore();
     x.strokeStyle="rgba(255,32,32,.7)";x.lineWidth=1;
     x.beginPath();x.arc(boss.x,boss.y-8,17+Math.sin(elapsed*5)*2,0,6.28);x.stroke();
   }
   const heroShadow=x.createRadialGradient(px,py+5,1,px,py+5,11);
   heroShadow.addColorStop(0,"rgba(0,0,0,.72)");heroShadow.addColorStop(1,"rgba(0,0,0,0)");
   x.fillStyle=heroShadow;x.fillRect(px-12,py,24,12);
   x.save();
   const moving=Math.abs((keys.has("a")||keys.has("d")||keys.has("arrowleft")||keys.has("arrowright")?1:0))+Math.abs((keys.has("w")||keys.has("s")||keys.has("arrowup")||keys.has("arrowdown")?1:0))>0||joy.active;
   const frame=moving?Math.floor(elapsed*9)%3:0;
   const hm=frame===1?HERO_WALK:frame===2?HERO_STEP:HERO;
   const bob=moving?Math.sin(elapsed*14)*.5:Math.sin(elapsed*3)*.3;
   x.translate(Math.floor(px),Math.floor(py+bob));
   if(dash>0){for(let i=1;i<=4;i++){x.globalAlpha=.12*i;x.translate(-i*3,0);sprite(x,hm,-10,-20,1);x.translate(i*3,0)}x.globalAlpha=1}
   if(attackFx>0){
     x.strokeStyle="#fff";x.lineWidth=1.5;x.beginPath();x.arc(7,-5,13,-.9,.8);x.stroke();
     x.strokeStyle="#ff2020";x.beginPath();x.arc(7,-5,16,-.7,.7);x.stroke();
   }
   if(skillFx>0){x.strokeStyle="#ff2020";x.lineWidth=2;x.beginPath();x.arc(0,0,10+skillFx*18,0,6.28);x.stroke();x.strokeStyle="#fff";x.lineWidth=1;x.beginPath();x.arc(0,0,15+skillFx*10,0,6.28);x.stroke()}
   sprite(x,hm,-10,-20,1);x.restore();
   for(const p of sparks){x.fillStyle=p.life>.25?"#fff":"#ff2020";x.fillRect(Math.floor(p.x),Math.floor(p.y),1+p.life*1.2,1+p.life*1.2)}
   if(flash){x.fillStyle="rgba(255,32,32,"+flash*.25+")";x.fillRect(0,0,W,H)}if(damageFlash){x.fillStyle="rgba(255,32,32,"+damageFlash*.32+")";x.fillRect(0,0,W,H)}
   x.setTransform(1,0,0,1,0,0);
 }
 buildMenu();
 function loop(now:number){if(!alive)return;draw(now);raf=requestAnimationFrame(loop)}raf=requestAnimationFrame(loop);
 const vis=()=>{if(document.hidden)save(s)};document.addEventListener("visibilitychange",vis);
 return()=>{alive=false;cancelAnimationFrame(raf);cleanupKeys();document.removeEventListener("visibilitychange",vis);save(s)};
}
