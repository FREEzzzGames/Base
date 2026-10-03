type RpgScreen="menu"|"character"|"level"|"play";
type RpgState={screen:RpgScreen;level:number;xp:number;hp:number;mana:number;stamina:number;chapter:number;};

const KEY="freezzz:rpg-graphics-test:v2",W=192,H=108;
const HERO=["....1111....","...122221...","..12222221..","..12333321..","..12333321..","...111111...","..11444411..",".1144444411.",".1144444411.","...114411...","...11..11...","..11....11.."];
const ENEMY=["...1111...","..122221..",".12222221.",".12333321.","..111111..","..155551..",".11555511.","..11..11.."];
const PAL:Record<string,string>={"1":"#111","2":"#e8b18a","3":"#eee","4":"#ff2020","5":"#aaa"};

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
function sprite(c:CanvasRenderingContext2D,m:string[],x:number,y:number,z:number){for(let r=0;r<m.length;r++)for(let q=0;q<m[r].length;q++){const k=m[r][q];if(k!=="."){c.fillStyle=PAL[k]||"#fff";c.fillRect(Math.floor(x+q*z),Math.floor(y+r*z),z,z)}}}
function clamp(n:number,a:number,b:number){return Math.max(a,Math.min(b,n))}
function dist(a:number,b:number,c:number,d:number){return Math.hypot(a-c,b-d)}
function esc(v:string){return v.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]||c))}

export function mountRpgGraphicsTest(host:HTMLElement):()=>void{
 const s=load();let alive=true,raf=0,last=performance.now(),elapsed=0,shake=0,flash=0;
 const keys=new Set<string>(),sparks:Spark[]=[],orbs:Orb[]=[];let enemies:Enemy[]=[];let boss:Enemy|null=null;
 let px=96,py=82,attack=0,dash=0,skill=0,spawn=0,kills=0,waveDone=false,won=false;
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
   host.innerHTML='<section class="rpgx" data-rpg-screen="menu"><div class="rpgx-stage"><canvas class="rpgx-canvas" width="192" height="108"></canvas><div class="rpgx-hud"><span class="rpgx-badge">PIXEL RPG / LV '+s.level+'</span><span class="rpgx-badge">3 CHAPTERS</span></div><div class="rpgx-menu"><div class="rpgx-logo"><small>FREEzzz GRAPHICS LAB</small><strong>NEON<br>CHRONICLES</strong><i>PLAYABLE CYBERPUNK RPG · PIXEL COMIC</i></div><button class="rpgx-btn primary" data-rpg-level>ENTER CHAPTER</button><button class="rpgx-btn" data-rpg-character>CHARACTER</button><div class="rpgx-menu-meta"><span>MOVE</span><span>COMBAT</span><span>BOSS</span></div></div></div></section>';
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
   const c=host.querySelector<HTMLCanvasElement>(".rpgx-char-canvas"),x=c?.getContext("2d");if(c&&x){x.imageSmoothingEnabled=false;x.fillStyle="#070707";x.fillRect(0,0,96,128);for(let i=0;i<18;i++){x.fillStyle=i%2?"#111":"#080808";x.fillRect(i*6,0,2,128)}sprite(x,HERO,32,26,4)}
   host.querySelector("[data-rpg-back]")?.addEventListener("click",buildMenu);
   host.querySelector("[data-rpg-chapter]")?.addEventListener("click",buildLevel);
 }
 function buildPlay(){
   host.innerHTML='<section class="rpgx rpgx-play"><div class="rpgx-stage"><canvas class="rpgx-canvas" width="192" height="108"></canvas><div class="rpgx-play-hud"><div><b id="rpg-chapter">CHAPTER 01</b><span id="rpg-objective">DRONES 0/8</span></div><div class="rpgx-bars"><i><em id="rpg-hp"></em></i><i><em id="rpg-mana"></em></i></div></div><div class="rpgx-bossbar" id="rpg-bossbar" hidden><b id="rpg-boss-name"></b><i><em id="rpg-boss-hp"></em></i></div><div class="rpgx-touch"><div class="rpgx-joystick" data-rpg-joy><i></i></div><div class="rpgx-actions"><button data-rpg-attack>ATK</button><button data-rpg-skill>SKILL</button><button data-rpg-dash>DASH</button></div></div><div class="rpgx-play-top"><button data-rpg-exit>EXIT</button></div></div></section>';
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
   host.querySelector("[data-rpg-attack]")?.addEventListener("pointerdown",()=>attack=.22);
   host.querySelector("[data-rpg-skill]")?.addEventListener("pointerdown",()=>{if(s.mana>=25)skill=.5});
   host.querySelector("[data-rpg-dash]")?.addEventListener("pointerdown",()=>{if(s.stamina>=20)dash=.24});
   host.querySelector("[data-rpg-exit]")?.addEventListener("click",buildLevel);
   const keydown=(e:KeyboardEvent)=>{keys.add(e.key.toLowerCase());if(e.key===" ")attack=.22;if(e.key.toLowerCase()==="q"&&s.mana>=25)skill=.5;if(e.key.toLowerCase()==="shift"&&s.stamina>=20)dash=.24};
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
 function burst(x:number,y:number,n:number){for(let i=0;i<n;i++){const a=Math.random()*6.28,v=8+Math.random()*28;sparks.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.25+Math.random()*.45})}}
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
   s.stamina=clamp(s.stamina+(dash?-42:18)*dt,0,100);s.mana=clamp(s.mana+(skill?-50:5)*dt,0,100);
   if(dash){dash-=dt;burst(px,py,2)}else if(s.stamina<20)dash=0;
   if(attack>0){attack-=dt;if(attack>.16)doHit(26,13)}
   if(skill>0){if(skill>.45)doHit(60,24);skill-=dt;burst(px,py,5)}
   for(const e of enemies){if(e.hp<=0)continue;e.hit=Math.max(0,e.hit-dt);e.cool-=dt;const d=dist(px,py,e.x,e.y);if(d>10){e.x+=(px-e.x)/Math.max(1,d)*(8+(s.chapter*2))*dt;e.y+=(py-e.y)/Math.max(1,d)*(8+(s.chapter*2))*dt}else if(e.cool<=0){s.hp-=5;e.cool=1.1;flash=.08}}
   enemies=enemies.filter(e=>e.hp>0);
   const need=6+s.chapter*2;
   if(!waveDone&&kills>=need){waveDone=true;boss={x:150,y:62,hp:180+s.chapter*50,max:180+s.chapter*50,elite:true,hit:0,cool:0};burst(150,62,30)}
   if(boss&&boss.hp>0){boss.hit=Math.max(0,boss.hit-dt);boss.cool-=dt;const d=dist(px,py,boss.x,boss.y);if(d>16){boss.x+=(px-boss.x)/Math.max(1,d)*7*dt;boss.y+=(py-boss.y)/Math.max(1,d)*7*dt}else if(boss.cool<=0){s.hp-=12;boss.cool=.8;flash=.16;burst(px,py,8)}}
   for(const o of orbs){o.life-=dt;if(dist(px,py,o.x,o.y)<9){if(o.kind==="xp")s.xp=clamp(s.xp+5,0,100);else s.mana=clamp(s.mana+15,0,100);o.life=0}}
   for(const p of sparks){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=20*dt;p.life-=dt}while(sparks[0]?.life<=0)sparks.shift();orbs.splice(0,orbs.length,...orbs.filter(o=>o.life>0));
   if(s.hp<=0){s.hp=100;buildLevel();return}
   const obj=host.querySelector("#rpg-objective") as HTMLElement|null;if(obj)obj.textContent=waveDone?(boss?"BOSS · "+Math.max(0,Math.ceil(boss.hp)):"CLEAR"):"DRONES "+Math.min(kills,need)+"/"+need;
   const hp=host.querySelector("#rpg-hp") as HTMLElement|null;if(hp)hp.style.width=s.hp+"%";const mana=host.querySelector("#rpg-mana") as HTMLElement|null;if(mana)mana.style.width=s.mana+"%";
   const bb=host.querySelector("#rpg-bossbar") as HTMLElement|null;if(bb){bb.hidden=!boss;const b=host.querySelector("#rpg-boss-hp") as HTMLElement|null;if(b&&boss)b.style.width=clamp(boss.hp/boss.max*100,0,100)+"%";const n=host.querySelector("#rpg-boss-name") as HTMLElement|null;if(n)n.textContent=LEVELS[s.chapter-1].boss}
   save(s);
 }
 function draw(now:number){
   const c=host.querySelector<HTMLCanvasElement>(".rpgx-canvas"),x=c?.getContext("2d");if(!c||!x||s.screen!=="play")return;
   const dt=Math.min(.033,(now-last)/1000);last=now;elapsed+=dt;update(dt);flash=Math.max(0,flash-dt*2.8);shake=Math.max(0,shake-dt*2);
   x.imageSmoothingEnabled=false;x.fillStyle="#050505";x.fillRect(0,0,W,H);
   const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,"#0b0b16");g.addColorStop(1,"#020202");x.fillStyle=g;x.fillRect(0,0,W,H);
   x.fillStyle="#10101a";for(let i=0;i<12;i++){const bx=i*18-4;x.fillRect(bx,44-(i%3)*6,11,64);x.fillStyle=i%2?"#ff2020":"#fff";x.fillRect(bx+3,52-(i%3)*6,1,18);x.fillStyle="#10101a"}
   x.fillStyle="#171717";x.fillRect(0,83,W,25);for(let i=0;i<18;i++){x.fillStyle=i%2?"#222":"#0a0a0a";x.fillRect(i*11,84,8,1)}
   if(shake)x.translate((Math.random()-.5)*shake*3,(Math.random()-.5)*shake*3);
   for(const o of orbs){x.fillStyle=o.kind==="xp"?"#fff":"#ff2020";x.fillRect(o.x-1,o.y-1,3,3)}
   for(const e of enemies){x.save();if(e.hit)x.globalAlpha=.55;x.translate(e.x-4,e.y-4);sprite(x,ENEMY,0,0,1.1);x.restore();x.fillStyle="#000";x.fillRect(e.x-6,e.y-8,12,1);x.fillStyle="#ff2020";x.fillRect(e.x-6,e.y-8,12*(e.hp/e.max),1)}
   if(boss){x.fillStyle="#ff2020";x.beginPath();x.arc(boss.x,boss.y,8,0,6.28);x.fill();x.fillStyle="#fff";x.fillRect(boss.x-4,boss.y-2,8,2)}
   x.save();x.translate(px,py);if(attack>0)x.fillStyle="#fff",x.fillRect(7,-1,9,2);if(skill>0){x.strokeStyle="#ff2020";x.lineWidth=1;x.beginPath();x.arc(0,0,13,0,6.28);x.stroke()}sprite(x,HERO,-6,-11,1);x.restore();
   for(const p of sparks){x.fillStyle=p.life>.25?"#fff":"#ff2020";x.fillRect(p.x,p.y,1,1)}
   if(flash){x.fillStyle="rgba(255,32,32,"+flash*.25+")";x.fillRect(0,0,W,H)}
   x.setTransform(1,0,0,1,0,0);
 }
 buildMenu();
 function loop(now:number){if(!alive)return;draw(now);raf=requestAnimationFrame(loop)}raf=requestAnimationFrame(loop);
 const vis=()=>{if(document.hidden)save(s)};document.addEventListener("visibilitychange",vis);
 return()=>{alive=false;cancelAnimationFrame(raf);cleanupKeys();document.removeEventListener("visibilitychange",vis);save(s)};
}
