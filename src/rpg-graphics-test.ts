type RpgScreen="menu"|"character"|"level";
type RpgState={screen:RpgScreen;level:number;xp:number;hp:number;mana:number;stamina:number;gold:number;time:number;weather:number;flash:number;shake:number;chapter:number;};

const KEY="freezzz:rpg-graphics-test:v1",W=192,H=108;
const HERO=["....1111....","...122221...","..12222221..","..12333321..","..12333321..","...111111...","..11444411..",".1144444411.",".1144444411.","...114411...","...11..11...","..11....11.."];
const KNIGHT=["....1111....","...155551...","..15555551..","..15666651..","..15666651..","...111111...","..11777711..",".1177777711.",".1177777711.","...117711...","...11..11...","..11....11.."];
const PAL:Record<string,string>={"1":"#10131b","2":"#e8b18a","3":"#d7dce7","4":"#3d6cff","5":"#d7dce7","6":"#ffcc72","7":"#722d48"};
function defaults():RpgState{return{screen:"menu",level:18,xp:72,hp:91,mana:68,stamina:84,gold:1240,time:.22,weather:.18,flash:0,shake:0,chapter:1}}
function load():RpgState{try{const p=JSON.parse(localStorage.getItem(KEY)||"");return p&&typeof p==="object"?{...defaults(),...p}:defaults()}catch{return defaults()}}
function save(s:RpgState){try{localStorage.setItem(KEY,JSON.stringify(s))}catch{}}
function sprite(c:CanvasRenderingContext2D,m:string[],x:number,y:number,z:number){for(let r=0;r<m.length;r++)for(let q=0;q<m[r].length;q++){const k=m[r][q];if(k!=="."){c.fillStyle=PAL[k]||"#fff";c.fillRect(x+q*z,y+r*z,z,z)}}}
function light(c:CanvasRenderingContext2D,x:number,y:number,r:number,col:string,a:number){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,col+a+")");g.addColorStop(1,col+"0)");c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill()}

export function mountRpgGraphicsTest(host:HTMLElement):()=>void{
  const s=load();let alive=true,last=performance.now(),raf=0,elapsed=0;
  const sparks:Array<{x:number;y:number;vx:number;vy:number;l:number}>=[],rain=Array.from({length:42},(_,i)=>({x:i*43%W,y:i*17%H,v:20+i%8}));
  function buildMenu(){
    s.screen="menu";
    host.innerHTML=[
      '<section class="rpgx" data-rpg-screen="menu"><div class="rpgx-stage"><canvas class="rpgx-canvas" width="',W,'" height="',H,'"></canvas>',
      '<div class="rpgx-hud"><span class="rpgx-badge">PIXEL RPG / LV ',s.level,'</span><span class="rpgx-badge rpgx-clock">00:00</span></div>',
      '<div class="rpgx-menu"><div class="rpgx-logo"><small>FREEzzz GRAPHICS LAB</small><strong>NEON<br>CHRONICLES</strong><i>TELEGRAM MINI APP · GRAPHICS TEST</i></div>',
      '<button class="rpgx-btn primary" data-rpg-level>ENTER CHAPTER</button><button class="rpgx-btn" data-rpg-character>CHARACTER</button>',
      '<div class="rpgx-menu-meta"><span>PARALLAX</span><span>DYNAMIC LIGHT</span><span>PIXEL VFX</span></div></div></div></section>'
    ].join("");
    host.querySelector("[data-rpg-level]")?.addEventListener("click",()=>{s.flash=1;s.shake=.7;for(let i=0;i<12;i++){const a=Math.random()*6.28,v=10+Math.random()*20;sparks.push({x:103,y:69,vx:Math.cos(a)*v,vy:Math.sin(a)*v,l:1})}save(s)});
    host.querySelector("[data-rpg-character]")?.addEventListener("click",buildCharacter);
  }
  function buildLevel(){
    const levels=[
      ["01 · GHOST DISTRICT","NEON RAIN","THE WARDEN","ARIA enters a flooded megacity sector where a corporation has begun erasing citizens from reality.","Recover the stolen identity shard and escape the surveillance grid."],
      ["02 · BLACK CIRCUIT","UNDERCITY","NULL JACKAL","The shard reveals a hidden AI rebellion beneath the city.","Break the quantum firewall and decide whether the AI becomes an ally."],
      ["03 · NEON ASCENSION","SKYLINE CORE","ARCHON ZERO","The corporation launches a city-wide reset. Aria reaches the orbital core.","Defeat Archon Zero and broadcast the truth to every citizen."]
    ];
    const l=levels[Math.max(0,Math.min(2,s.chapter-1))];
    host.innerHTML='<section class="rpgx-character rpgx-level-screen"><header class="rpgx-char-head"><button class="rpgx-icon" data-rpg-back>←</button><div><small>CHAPTER '+l[0]+'</small><strong>'+l[1]+' / '+l[2]+'</strong></div><span>LV '+s.level+'</span></header><div class="rpgx-level-art"><div class="rpgx-comic-tag">ISSUE #0'+s.chapter+'</div><h2>'+l[1]+'</h2><p>'+l[3]+'</p><div class="rpgx-objective"><small>MISSION OBJECTIVE</small><b>'+l[4]+'</b></div><div class="rpgx-comic-panels"><div><b>01</b><span>SCAN</span></div><div><b>02</b><span>INFILTRATE</span></div><div><b>03</b><span>CONFRONT</span></div></div><button class="rpgx-action" data-rpg-next>BEGIN CHAPTER</button><button class="rpgx-action" data-rpg-comic>COMIC PREVIEW</button></div></section>';
    host.querySelector("[data-rpg-back]")?.addEventListener("click",buildMenu);
    host.querySelector("[data-rpg-next]")?.addEventListener("click",()=>{s.xp=Math.min(100,s.xp+12);s.chapter=s.chapter>=3?1:s.chapter+1;s.level+=1;save(s);buildLevel()});
    host.querySelector("[data-rpg-comic]")?.addEventListener("click",()=>{s.flash=1;s.shake=.5});
  }
  function buildCharacter(){
    s.screen="character";
    host.innerHTML=[
      '<section class="rpgx-character"><header class="rpgx-char-head"><button class="rpgx-icon" data-rpg-back>←</button><div><small>CHARACTER MENU</small><strong>ARIA / VOIDWALKER</strong></div><span>LV ',s.level,'</span></header>',
      '<div class="rpgx-char-grid"><section class="rpgx-portrait"><canvas class="rpgx-char-canvas" width="96" height="128"></canvas><div class="rpgx-equip e1">WEAPON<br><b>AETHER BLADE</b></div><div class="rpgx-equip e2">CORE<br><b>VOID HEART</b></div></section>',
      '<section class="rpgx-stats"><div class="rpgx-xp"><span>XP <b>',s.xp,'%</b></span><i><em style="width:',s.xp,'%"></em></i></div>',
      '<div class="rpgx-meter"><label>HP <b>',s.hp,'</b></label><i><em style="width:',s.hp,'%;background:#ff4668"></em></i></div>',
      '<div class="rpgx-meter"><label>MANA <b>',s.mana,'</b></label><i><em style="width:',s.mana,'%;background:#8b7dff"></em></i></div>',
      '<div class="rpgx-meter"><label>STAMINA <b>',s.stamina,'</b></label><i><em style="width:',s.stamina,'%;background:#35e0c0"></em></i></div>',
      '<div class="rpgx-stat-grid">',["STR 24","AGI 31","INT 28","VIT 19","LUCK 17","CRIT 12%"].map(v=>'<div><small>'+v.split(" ")[0]+'</small><b>'+v.split(" ").slice(1).join(" ")+'</b></div>').join(""),'</div></section></div>',
      '<div class="rpgx-tabs"><button class="active">EQUIPMENT</button><button>ABILITIES</button><button>INVENTORY</button></div>',
      '<div class="rpgx-items">',["✦|AETHER BLADE|LEGENDARY · +18 DMG","◇|VOID HEART|EPIC · +12 MANA","◈|PHASE CLOAK|RARE · +8 EVADE","✧|NEON SIGIL|MYTHIC · +6 CRIT"].map(v=>{const a=v.split("|");return '<div class="rpgx-item"><b>'+a[0]+'</b><span>'+a[1]+'</span><small>'+a[2]+'</small></div>'}).join(""),'</div>',
      '<button class="rpgx-action" data-rpg-pulse>TRIGGER COMBAT VFX</button></section>'
    ].join("");
    const c=host.querySelector<HTMLCanvasElement>(".rpgx-char-canvas"),x=c?.getContext("2d");
    if(c&&x){x.imageSmoothingEnabled=false;x.fillStyle="#070a11";x.fillRect(0,0,96,128);for(let i=0;i<16;i++){x.fillStyle=i%2?"#11182a":"#0b1020";x.fillRect(i*7,0,2,128)}light(x,48,55,40,"rgba(53,224,192,",.14);sprite(x,KNIGHT,32,27,4)}
    host.querySelector("[data-rpg-back]")?.addEventListener("click",buildMenu);
    host.querySelector("[data-rpg-pulse]")?.addEventListener("click",()=>{s.flash=1;s.shake=.9;save(s)});
  }
  function draw(now:number){
    const c=host.querySelector<HTMLCanvasElement>(".rpgx-canvas"),x=c?.getContext("2d");if(!c||!x||s.screen!=="menu")return;
    x.imageSmoothingEnabled=false;const dt=Math.min(.033,(now-last)/1000);last=now;elapsed+=dt;s.time=(s.time+dt*.018)%1;s.flash=Math.max(0,s.flash-dt*3);s.shake=Math.max(0,s.shake-dt*3);
    const night=.25+.45*(Math.sin(s.time*6.283-1.57)*.5+.5);x.fillStyle="#040610";x.fillRect(0,0,W,H);
    const sky=x.createLinearGradient(0,0,0,H);sky.addColorStop(0,"hsl(228 48% "+(8+night*12)+"%)");sky.addColorStop(1,"#020308");x.fillStyle=sky;x.fillRect(0,0,W,H);
    for(let i=0;i<45;i++){x.fillStyle="rgba(255,255,255,"+(.2+i%4*.1)+")";x.fillRect((i*71+elapsed*(2+i%3))%W,(i*31)%55,1,1)}
    light(x,154,20,25,"rgba(120,160,255,",.18);x.fillStyle="#dce8ff";x.beginPath();x.arc(154,20,7,0,6.28);x.fill();
    x.fillStyle="#10182b";x.beginPath();x.moveTo(0,70);x.lineTo(30,42);x.lineTo(55,68);x.lineTo(87,34);x.lineTo(122,69);x.lineTo(153,47);x.lineTo(192,70);x.lineTo(192,108);x.lineTo(0,108);x.fill();
    x.fillStyle="#080c12";x.fillRect(0,78,W,30);
    for(let i=0;i<5;i++){const q=18+i*39;x.fillStyle="#182235";x.fillRect(q,58-(i%2)*6,3,20);x.fillStyle=i%2?"#35e0c0":"#ff3b66";x.fillRect(q,58-(i%2)*6,1,19);light(x,q+1,65,8,i%2?"rgba(53,224,192,":"rgba(255,59,102,",.12)}
    const bob=Math.sin(elapsed*4)*.8;x.save();if(s.shake)x.translate((Math.random()-.5)*s.shake*3,(Math.random()-.5)*s.shake*3);sprite(x,HERO,92,57+bob,2);x.restore();light(x,103,69,15,"rgba(53,224,192,",.12);
    rain.forEach(p=>{p.y=(p.y+p.v*dt)%H;x.strokeStyle="rgba(130,180,255,.16)";x.beginPath();x.moveTo(p.x,p.y);x.lineTo(p.x-1,p.y+4);x.stroke()});
    sparks.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=18*dt;p.l-=dt*1.8;x.fillStyle="rgba(255,190,92,"+Math.max(0,p.l)+")";x.fillRect(p.x,p.y,1,1)});while(sparks.length&&sparks[0].l<=0)sparks.shift();
    if(s.flash){x.fillStyle="rgba(255,40,80,"+(s.flash*.18)+")";x.fillRect(0,0,W,H)}
    const clock=host.querySelector<HTMLElement>(".rpgx-clock");if(clock)clock.textContent="LV "+s.level+" · "+String(Math.floor(elapsed)).padStart(2,"0")+"s";
  }
  buildMenu();
  function loop(now:number){if(!alive)return;draw(now);raf=requestAnimationFrame(loop)}raf=requestAnimationFrame(loop);
  const vis=()=>{if(document.hidden)save(s)};document.addEventListener("visibilitychange",vis);
  return()=>{alive=false;cancelAnimationFrame(raf);document.removeEventListener("visibilitychange",vis);save(s)};
}
