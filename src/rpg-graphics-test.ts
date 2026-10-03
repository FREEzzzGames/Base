type RpgScreen="menu"|"character";

type RpgState={
  screen:RpgScreen;
  level:number;
  xp:number;
  hp:number;
  mana:number;
  stamina:number;
  gold:number;
  time:number;
  weather:number;
  combo:number;
  damage:number;
  flash:number;
  shake:number;
  equipped:string;
};

const KEY="freezzz:rpg-graphics-test:v1";
const W=192,H=108;

const spriteHero=[
"....1111....",
"...122221...",
"..12222221..",
"..12333321..",
"..12333321..",
"...111111...",
"..11444411..",
".1144444411.",
".1144444411.",
"...114411...",
"...11..11...",
"..11....11.."
];
const spriteKnight=[
"....1111....",
"...155551...",
"..15555551..",
"..15666651..",
"..15666651..",
"...111111...",
"..11777711..",
".1177777711.",
".1177777711.",
"...117711...",
"...11..11...",
"..11....11.."
];
const spriteMage=[
"....1111....",
"...188881...",
"..18888881..",
"..18999981..",
"..18999981..",
"...111111...",
"..11AAAA11..",
".11AAAAAA11.",
".11AAAAAA11.",
"...11AA11...",
"...11..11...",
"..11....11.."
];

const PAL:Record<string,string>={
  "1":"#10131b","2":"#e8b18a","3":"#d7dce7","4":"#3d6cff",
  "5":"#d7dce7","6":"#ffcc72","7":"#722d48","8":"#c99bff",
  "9":"#e8d7ff","A":"#35e0c0"
};

function load():RpgState{
  try{
    const p=JSON.parse(localStorage.getItem(KEY)||"");
    if(p&&typeof p==="object")return {...defaults(),...p};
  }catch{}
  return defaults();
}
function defaults():RpgState{return{screen:"menu",level:18,xp:72,hp:91,mana:68,stamina:84,gold:1240,time:.22,weather:.18,combo:0,damage:0,flash:0,shake:0,equipped:"AETHER BLADE"}}
function save(s:RpgState){try{localStorage.setItem(KEY,JSON.stringify(s))}catch{}}

function pixelSprite(ctx:CanvasRenderingContext2D,map:string[],x:number,y:number,scale=2){
  for(let row=0;row<map.length;row++)for(let col=0;col<map[row].length;col++){
    const c=map[row][col];if(c===".")continue;
    ctx.fillStyle=PAL[c]||"#fff";ctx.fillRect(x+col*scale,y+row*scale,scale,scale);
  }
}
function glow(ctx:CanvasRenderingContext2D,x:number,y:number,r:number,color:string,alpha:number){
  const g=ctx.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,color.replace("ALPHA",String(alpha)));
  g.addColorStop(1,color.replace("ALPHA","0"));
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
}
function clamp(n:number,a=0,b=1){return Math.max(a,Math.min(b,n));}

export function mountRpgGraphicsTest(host:HTMLElement):()=>void{
  let s=load();
  host.innerHTML=`
    <section class="rpgx" data-rpg-screen="menu">
      <div class="rpgx-stage">
        <canvas class="rpgx-canvas" width="${W}" height="${H}" aria-label="RPG graphics test"></canvas>
        <div class="rpgx-hud">
          <span class="rpgx-badge">PIXEL RPG / ${s.level}</span>
          <span class="rpgx-badge rpgx-clock">00:00</span>
        </div>
        <div class="rpgx-menu">
          <div class="rpgx-logo"><small>FREEzzz GRAPHICS LAB</small><strong>NEON<br>CHRONICLES</strong><i>TELEGRAM MINI APP TEST</i></div>
          <button class="rpgx-btn primary" data-rpg-start>ENTER THE WORLD</button>
          <button class="rpgx-btn" data-rpg-character>CHARACTER</button>
          <div class="rpgx-menu-meta"><span>ULTRA PIXEL</span><span>60 FPS TARGET</span><span>AUTO SAVE</span></div>
        </div>
      </div>
    </section>`;
  const root=host.querySelector<HTMLElement>(".rpgx")!;
  const canvas=root.querySelector<HTMLCanvasElement>("canvas")!;
  const ctx=canvas.getContext("2d",{alpha:false})!;
  ctx.imageSmoothingEnabled=false;
  let running=true,last=performance.now(),raf=0,elapsed=0;
  const rain=Array.from({length:46},(_,i)=>({x:(i*37)%W,y:(i*19)%H,v:18+(i%7)*4}));
  const dust=Array.from({length:34},(_,i)=>({x:(i*53)%W,y:(i*29)%H,v:.5+(i%5)*.18,p:i}));
  const sparks:Array<{x:number;y:number;vx:number;vy:number;life:number}>=[];
  function emitSpark(x:number,y:number){
    for(let i=0;i<8;i++){const a=Math.random()*Math.PI*2,v=8+Math.random()*18;sparks.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:1});}
  }
  function frame(now:number){
    if(!running)return;
    const dt=Math.min(.033,(now-last)/1000);last=now;elapsed+=dt;
    s.time=(s.time+dt*.018)%1;s.flash=Math.max(0,s.flash-dt*3);s.shake=Math.max(0,s.shake-dt*3);
    draw(dt);
    raf=requestAnimationFrame(frame);
  }
  function draw(dt:number){
    if(root.dataset.rpgScreen==="character")return;
    const night=.18+.52*(Math.sin(s.time*Math.PI*2-Math.PI/2)*.5+.5);
    ctx.fillStyle="#050712";ctx.fillRect(0,0,W,H);
    ctx.save();
    if(s.shake)ctx.translate((Math.random()-.5)*s.shake*3,(Math.random()-.5)*s.shake*3);
    // deep parallax sky
    const grad=ctx.createLinearGradient(0,0,0,H);
    grad.addColorStop(0,`hsl(228 46% ${9+night*9}%)`);
    grad.addColorStop(.58,`hsl(248 34% ${7+night*6}%)`);
    grad.addColorStop(1,"#030406");ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
    // stars
    for(let i=0;i<42;i++){const x=(i*71+elapsed*(2+i%3))%W,y=(i*31)%55;ctx.fillStyle=`rgba(255,255,255,${.25+(i%4)*.12})`;ctx.fillRect(x,y,1,i%7===0?2:1);}
    // moon
    glow(ctx,154,20,24,"rgba(120,160,255,ALPHA)",.16);ctx.fillStyle="#dbe7ff";ctx.beginPath();ctx.arc(154,20,7,0,Math.PI*2);ctx.fill();ctx.fillStyle="#0a0d19";ctx.beginPath();ctx.arc(157,18,7,0,Math.PI*2);ctx.fill();
    // mountains
    ctx.fillStyle="#10172a";ctx.beginPath();ctx.moveTo(0,70);ctx.lineTo(32,42);ctx.lineTo(54,68);ctx.lineTo(87,34);ctx.lineTo(122,69);ctx.lineTo(150,47);ctx.lineTo(192,70);ctx.lineTo(192,108);ctx.lineTo(0,108);ctx.fill();
    ctx.fillStyle="#171d35";ctx.beginPath();ctx.moveTo(0,79);ctx.lineTo(46,55);ctx.lineTo(72,79);ctx.lineTo(105,53);ctx.lineTo(142,82);ctx.lineTo(174,61);ctx.lineTo(192,77);ctx.lineTo(192,108);ctx.lineTo(0,108);ctx.fill();
    // ground
    ctx.fillStyle="#080c12";ctx.fillRect(0,78,W,30);
    for(let i=0;i<18;i++){ctx.fillStyle=i%2?"#151d25":"#0d141c";ctx.fillRect((i*23+elapsed*3)%W,82+(i%4)*5,12,1);}
    // neon ruins
    for(let i=0;i<5;i++){const x=18+i*39;ctx.fillStyle="#141d2d";ctx.fillRect(x,62-(i%2)*6,3,16);ctx.fillStyle=i%2?"#35e0c0":"#ff3b66";ctx.fillRect(x,62-(i%2)*6,1,15);glow(ctx,x+1,65,8,i%2?"rgba(53,224,192,ALPHA)":"rgba(255,59,102,ALPHA)",.12);}
    // path
    ctx.fillStyle="#15151a";ctx.beginPath();ctx.moveTo(82,108);ctx.lineTo(101,108);ctx.lineTo(113,78);ctx.lineTo(94,78);ctx.closePath();ctx.fill();
    // torch
    glow(ctx,107,70,18,"rgba(255,126,48,ALPHA)",.2);ctx.fillStyle="#ff8c42";ctx.fillRect(106,67,2,7);ctx.fillStyle="#ffe28a";ctx.fillRect(107,65,1,3);
    // particles
    dust.forEach(p=>{p.y=(p.y+p.v*dt*5)%108;p.x=(p.x+Math.sin(elapsed+p.p)*.08)%W;ctx.fillStyle="rgba(120,220,255,.32)";ctx.fillRect(p.x,p.y,1,1)});
    // hero idle bob + animated cape
    const bob=Math.sin(elapsed*4)*.7;
    pixelSprite(ctx,spriteHero,92,57+bob,2);
    glow(ctx,103,69,14,"rgba(53,224,192,ALPHA)",.13);
    // weapon slash
    if(Math.floor(elapsed*3)%7===0){ctx.strokeStyle="rgba(255,255,255,.65)";ctx.beginPath();ctx.moveTo(111,66);ctx.lineTo(121,59);ctx.stroke();}
    // rain
    if(s.weather>.08){rain.forEach(p=>{p.y=(p.y+p.v*dt)%H;ctx.strokeStyle="rgba(130,180,255,.16)";ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-1,p.y+4);ctx.stroke()})}
    // sparks
    sparks.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=18*dt;p.life-=dt*1.8;ctx.fillStyle=`rgba(255,190,92,${Math.max(0,p.life)})`;ctx.fillRect(p.x,p.y,1,1)});
    while(sparks.length&&sparks[0].life<=0)sparks.shift();
    ctx.restore();
    if(s.flash){ctx.fillStyle=`rgba(255,40,80,${s.flash*.18})`;ctx.fillRect(0,0,W,H);}
    root.querySelector<HTMLElement>(".rpgx-clock")!.textContent=`LV ${s.level} · ${String(Math.floor(elapsed)).padStart(2,"0")}s`;
  }
  function character(){
    root.dataset.rpgScreen="character";
    root.innerHTML=`
      <div class="rpgx-character">
        <header class="rpgx-char-head"><button class="rpgx-icon" data-rpg-back>←</button><div><small>CHARACTER</small><strong>ARIA / VOIDWALKER</strong></div><span>LV ${s.level}</span></header>
        <div class="rpgx-char-grid">
          <section class="rpgx-portrait">
            <canvas class="rpgx-char-canvas" width="96" height="128"></canvas>
            <div class="rpgx-equip e1">WEAPON<br><b>AETHER BLADE</b></div>
            <div class="rpgx-equip e2">CORE<br><b>VOID HEART</b></div>
          </section>
          <section class="rpgx-stats">
            <div class="rpgx-xp"><span>XP</span><b>${s.xp}%</b><i><em style="width:${s.xp}%"></em></i></div>
            ${[["HP",s.hp,"#ff4668"],["MANA",s.mana,"#8b7dff"],["STAMINA",s.stamina,"#35e0c0"]].map(a=>`<div class="rpgx-meter"><label>${a[0]}<b>${a[1]}</b></label><i><em style="width:${a[1]}%;background:${a[2]}"></em></i></div>`).join("")}
            <div class="rpgx-stat-grid">${[["STR","24"],["AGI","31"],["INT","28"],["VIT","19"],["LUCK","17"],["CRIT","12%"]].map(a=>`<div><small>${a[0]}</small><b>${a[1]}</b></div>`).join("")}</div>
          </section>
        </div>
        <div class="rpgx-tabs"><button class="active">EQUIPMENT</button><button>ABILITIES</button><button>INVENTORY</button></div>
        <div class="rpgx-items">
          <div class="rpgx-item legendary">✦<span>AETHER BLADE</span><small>LEGENDARY · +18 DMG</small></div>
          <div class="rpgx-item">◇<span>VOID HEART</span><small>EPIC · +12 MANA</small></div>
          <div class="rpgx-item">◈<span>PHASE CLOAK</span><small>RARE · +8 EVADE</small></div>
          <div class="rpgx-item">✧<span>NEON SIGIL</span><small>MYTHIC · +6 CRIT</small></div>
        </div>
        <button class="rpgx-action" data-rpg-pulse>TRIGGER COMBAT VFX</button>
      </div>`;
    const c=root.querySelector<HTMLCanvasElement>(".rpgx-char-canvas")!,x=c.getContext("2d")!;x.imageSmoothingEnabled=false;x.fillStyle="#080b13";x.fillRect(0,0,96,128);
    for(let i=0;i<18;i++){x.fillStyle=i%2?"#131a2a":"#0d1220";x.fillRect(i*6,0,2,128);}
    glow(x,48,54,42,"rgba(53,224,192,ALPHA)",.12);pixelSprite(x,spriteKnight,35,30,4);
    root.querySelector("[data-rpg-back]")?.addEventListener("click",menu);
    root.querySelector("[data-rpg-pulse]")?.addEventListener("click",()=>{s.flash=1;s.shake=.8;emitSpark(96,62);});
  }
  function menu(){
    root.dataset.rpgScreen="menu";
    root.innerHTML=`
      <div class="rpgx-stage">
        <canvas class="rpgx-canvas" width="${W}" height="${H}"></canvas>
        <div class="rpgx-hud"><span class="rpgx-badge">PIXEL RPG / ${s.level}</span><span class="rpgx-badge rpgx-clock">LV ${s.level}</span></div>
        <div class="rpgx-menu">
          <div class="rpgx-logo"><small>FREEzzz GRAPHICS LAB</small><strong>NEON<br>CHRONICLES</strong><i>TELEGRAM MINI APP TEST</i></div>
          <button class="rpgx-btn primary" data-rpg-start>ENTER THE WORLD</button>
          <button class="rpgx-btn" data-rpg-character>CHARACTER</button>
          <div class="rpgx-menu-meta"><span>PARALLAX</span><span>VFX</span><span>PIXEL ART</span></div>
        </div>
      </div>`;
    bindMenu();
  }
  function bindMenu(){
    root.querySelector("[data-rpg-start]")?.addEventListener("click",()=>{s.flash=1;s.shake=.5;emitSpark(103,69);save(s);});
    root.querySelector("[data-rpg-character]")?.addEventListener("click",character);
  }
  bindMenu();character;
  const onVisibility=()=>{if(document.hidden){save(s)}};
  document.addEventListener("visibilitychange",onVisibility);
  raf=requestAnimationFrame(frame);
  return ()=>{running=false;cancelAnimationFrame(raf);document.removeEventListener("visibilitychange",onVisibility);save(s)};
}
