/* FREEzzz ARENA — complete three-fighter vertical slice.
 * One arena. Three original fighters. 320x224 logical framebuffer.
 * Visual pipeline: layered human silhouette -> material shading -> pixel clusters
 * -> restrained palette -> nearest-neighbour presentation.
 */

type FighterId="vex"|"ruma"|"korr";
type Phase="select"|"fight"|"result";
type Fighter={
  id:FighterId; name:string; tag:string; speed:number; power:number; guard:number;
  accent:string; skin:string; skinHi:string; skinShadow:string; gear:string; gearHi:string;
  build:number; head:number;
};
const W=320,H=224;
const fighters:Record<FighterId,Fighter>={
  vex:{id:"vex",name:"VEX",tag:"URBAN RUNNER",speed:8,power:5,guard:4,accent:"#54d6d8",skin:"#a96858",skinHi:"#d18b70",skinShadow:"#6e4038",gear:"#182027",gearHi:"#36444b",build:0,head:0},
  ruma:{id:"ruma",name:"RUMA",tag:"DESERT GUARDIAN",speed:5,power:8,guard:7,accent:"#c58b48",skin:"#996149",skinHi:"#c98563",skinShadow:"#5f3b31",gear:"#57422f",gearHi:"#866644",build:1,head:1},
  korr:{id:"korr",name:"KORR",tag:"INDUSTRIAL HEAVY",speed:3,power:9,guard:9,accent:"#d86c35",skin:"#705047",skinHi:"#9b6d59",skinShadow:"#402f2b",gear:"#30383d",gearHi:"#59636a",build:2,head:2}
};
const palette=["#07090b","#0e1215","#171d21","#242d32","#38434a","#59656b","#7d898d","#aab1b4","#d5d8d7","#f0eee7"];
type Input={left:boolean;right:boolean;guard:boolean;burst:boolean;};
const input:Input={left:false,right:false,guard:false,burst:false};

function clamp(v:number,a:number,b:number){return Math.max(a,Math.min(b,v));}
function shade(hex:string,n:number){const x=hex.replace("#","");const r=parseInt(x.slice(0,2),16),g=parseInt(x.slice(2,4),16),b=parseInt(x.slice(4,6),16);const f=clamp(n,0,1);return "rgb("+Math.round(r*f)+","+Math.round(g*f)+","+Math.round(b*f)+")";}
function rect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,c:string){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function poly(ctx:CanvasRenderingContext2D,pts:number[],c:string){ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(pts[0],pts[1]);for(let i=2;i<pts.length;i+=2)ctx.lineTo(pts[i],pts[i+1]);ctx.closePath();ctx.fill();}
function text(ctx:CanvasRenderingContext2D,s:string,x:number,y:number,size=8,c="#d5d8d7",align:CanvasTextAlign="left"){ctx.font="700 "+size+"px monospace";ctx.textAlign=align;ctx.textBaseline="top";ctx.fillStyle=c;ctx.fillText(s,x,y);}
function pixel(ctx:CanvasRenderingContext2D,x:number,y:number,c:string){rect(ctx,x,y,1,1,c);}
function seedFor(id:FighterId){return id==="vex"?17:id==="ruma"?31:53;}
function noise(ctx:CanvasRenderingContext2D,id:FighterId,x:number,y:number,w:number,h:number,base:string,seed:number,density=.12){
  let n=seed>>>0;
  for(let yy=0;yy<h;yy+=2)for(let xx=0;xx<w;xx+=2){n=(n*1664525+1013904223)>>>0;if(((n&255)/255)<density)pixel(ctx,x+xx,y+yy,shade(base,.62+((n>>>8)%30)/100));}
}

/* Detailed stepped silhouettes. The geometry is deliberately authored as a sprite,
   not a generic stick figure: shoulders, waist, hands, boots, face planes and material
   highlights are all separate pixel clusters. */
function drawSprite(ctx:CanvasRenderingContext2D,f:Fighter,cx:number,ground:number,frame:number,flip=false,ghost=false,scale=1){
  const d=flip?-1:1, sway=(frame%8<4?0:1), step=(frame%12<6?0:2);
  ctx.save();ctx.translate(cx,ground);ctx.scale(d*scale,scale);if(ghost)ctx.globalAlpha=.18;
  rect(ctx,-30,-2,60,3,"#050607");

  // Back silhouette / legs.
  if(f.build===0){
    poly(ctx,[-12,-29,-7,-31,-3,-28,-4,-7,-17,-3,-17,-7,-12,-8,-14,-26],"#0a0e11");
    poly(ctx,[3,-29,12,-28,14,-8,19,-4,17,-1,2,-4,5,-25],"#0a0e11");
    poly(ctx,[-13,-28,-3,-28,-4,-7,-16,-3,-16,-1,-2,-1,-1,-6,-3,-29],f.gear);
    poly(ctx,[3,-28,13,-28,14,-7,19,-3,16,-1,2,-4,5,-24],shade(f.gear,.72));
  }else if(f.build===1){
    poly(ctx,[-14,-30,-3,-31,-1,-7,-13,-2,-20,-2,-16,-7],"#0a0e11");
    poly(ctx,[1,-30,13,-30,17,-7,21,-3,18,-1,3,-2,5,-7],"#0a0e11");
    poly(ctx,[-13,-30,-3,-30,-2,-8,-13,-3,-19,-3,-16,-7],f.gear);
    poly(ctx,[1,-30,13,-30,16,-8,20,-3,17,-2,3,-3,5,-8],shade(f.gear,.74));
  }else{
    poly(ctx,[-15,-31,-3,-31,-2,-5,-15,-2,-20,-2,-19,-7],"#080a0b");
    poly(ctx,[2,-31,15,-31,17,-6,21,-2,18,0,2,-2,4,-8],"#080a0b");
    poly(ctx,[-14,-31,-3,-31,-2,-6,-15,-2,-19,-3,-18,-7],f.gear);
    poly(ctx,[2,-31,14,-31,16,-7,20,-2,17,-1,3,-3,4,-8],shade(f.gear,.72));
    rect(ctx,-14,-20,4,13,f.gearHi);rect(ctx,10,-20,4,14,shade(f.gearHi,.75));
  }

  // Torso: stepped shoulder line, ribcage, waist.
  const shoulder=f.build===2?20:17, waist=f.build===2?13:11;
  rect(ctx,-shoulder,-68,shoulder*2,9,"#090b0d");
  poly(ctx,[-shoulder+2,-63,shoulder-2,-63,waist+5,-27,waist,-21,-waist,-21,-waist-5,-27],f.gear);
  poly(ctx,[-shoulder+3,-60,0,-56,shoulder-3,-60,shoulder-4,-32,7,-28,-7,-28,-shoulder+4,-32],f.gearHi);
  rect(ctx,-waist,-34,waist*2,7,shade(f.gear,.82));
  rect(ctx,-waist+3,-29,(waist-3)*2,4,f.gear);
  rect(ctx,-7,-57,14,2,shade(f.gearHi,.85));
  rect(ctx,-6,-45,12,1,shade("#ffffff",.22));

  // Arms with joints and hands.
  const swing=frame%10<5?2:-2;
  const armC=shade(f.skin,.9);
  poly(ctx,[-shoulder+1,-59,-shoulder-7,-55,-shoulder-7,-31,-shoulder-2,-29,-shoulder+3,-34,-shoulder+3,-54],f.gear);
  poly(ctx,[shoulder-1,-59,shoulder+7,-55,shoulder+7,-31,shoulder+2,-29,shoulder-3,-34,shoulder-3,-54],shade(f.gear,.75));
  rect(ctx,-shoulder-6,-43+swing,5,14,armC);rect(ctx,shoulder+2,-43-swing,5,14,shade(f.skin,.76));
  rect(ctx,-shoulder-7,-31+swing,7,6,f.skin);rect(ctx,shoulder+2,-31-swing,7,6,f.skin);
  rect(ctx,-shoulder-6,-31+swing,4,2,f.skinHi);rect(ctx,shoulder+3,-31-swing,4,2,f.skinHi);

  // Neck and head with stepped jaw / ears / hair.
  rect(ctx,-7,-76,14,9,f.skinShadow);
  const headW=f.head===2?11:10;
  poly(ctx,[-headW,-91,headW,-91,headW+2,-84,headW,-74,headW-4,-69,-headW+4,-69,-headW,-74,-headW-2,-84],f.skin);
  rect(ctx,-headW+2,-88,headW*2-4,11,f.skinHi);
  rect(ctx,-headW+1,-78,headW*2-2,5,f.skin);
  rect(ctx,-headW-2,-84,2,7,f.skinShadow);rect(ctx,headW,-84,2,7,shade(f.skinShadow,.85));
  // Hair / headgear.
  if(f.id==="vex"){
    rect(ctx,-12,-94,24,5,"#101519");rect(ctx,-9,-96,18,3,"#07090b");
    rect(ctx,-11,-91,4,2,f.accent);rect(ctx,7,-91,4,2,f.accent);
  }else if(f.id==="ruma"){
    rect(ctx,-13,-94,26,4,f.accent);rect(ctx,-10,-98,20,4,shade(f.accent,.72));
    rect(ctx,-12,-90,3,8,f.skinShadow);rect(ctx,9,-90,3,8,f.skinShadow);
  }else{
    rect(ctx,-14,-94,28,6,"#171c20");rect(ctx,-11,-97,22,3,"#0b0d0f");
    rect(ctx,-16,-88,3,8,f.accent);rect(ctx,13,-88,3,8,f.accent);
  }
  // Face planes, eyes, nose, mouth — tiny clusters create depth after scaling.
  rect(ctx,-7,-83,4,2,"#1b1717");rect(ctx,3,-83,4,2,"#1b1717");
  rect(ctx,-6,-82,2,1,"#f0eee7");rect(ctx,4,-82,2,1,"#f0eee7");
  rect(ctx,-1,-80,3,4,f.skinShadow);rect(ctx,-4,-75,8,1,f.skinShadow);
  rect(ctx,-7,-72,4,2,f.skinHi);rect(ctx,3,-72,4,2,f.skinHi);
  if(f.id==="korr"){rect(ctx,-9,-77,18,2,f.gearHi);rect(ctx,-7,-74,14,3,f.skinShadow);}
  if(f.id==="ruma"){rect(ctx,-12,-71,24,2,f.accent);}

  // Distinctive costume construction.
  if(f.id==="vex"){
    rect(ctx,-14,-59,5,22,f.accent);rect(ctx,9,-59,5,22,shade(f.accent,.68));
    rect(ctx,-7,-52,14,2,"#050607");rect(ctx,-5,-38,10,1,f.gearHi);
    rect(ctx,-13,-23,8,3,f.accent);rect(ctx,5,-23,8,3,shade(f.accent,.7));
  }else if(f.id==="ruma"){
    rect(ctx,-15,-57,30,5,shade(f.accent,.72));rect(ctx,-10,-50,20,4,f.gearHi);
    rect(ctx,-8,-43,16,2,f.accent);rect(ctx,-12,-34,5,5,shade(f.accent,.62));rect(ctx,7,-34,5,5,shade(f.accent,.62));
  }else{
    rect(ctx,-18,-61,36,7,f.accent);rect(ctx,-16,-54,32,4,shade(f.accent,.72));
    rect(ctx,-11,-45,22,3,f.gearHi);rect(ctx,-14,-37,7,5,"#15191c");rect(ctx,7,-37,7,5,"#15191c");
    rect(ctx,-17,-22,7,3,f.accent);rect(ctx,10,-22,7,3,shade(f.accent,.68));
  }

  // Material grain and controlled highlights.
  noise(ctx,f.id,-18,-96,36,73,f.gear,seedFor(f.id)+frame*13,.10);
  for(let i=0;i<5;i++){const yy=-61+i*7;rect(ctx,-9+(i%2)*5,yy,4,1,shade("#ffffff",.08+i*.025));}
  ctx.restore();
}

function drawArena(ctx:CanvasRenderingContext2D,t:number){
  const g=ctx.createLinearGradient(0,34,0,224);
  g.addColorStop(0,"#0a0e11");g.addColorStop(.48,"#20282d");g.addColorStop(1,"#090b0d");
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  rect(ctx,0,34,W,1,"#4b565c");
  // One original industrial arena: depth rails, wall panels and floor grid.
  for(let y=48;y<184;y+=13)rect(ctx,0,y,W,1,y%26===9?"#313b40":"#171e22");
  for(let i=0;i<9;i++){
    const x=18+i*38;
    rect(ctx,x,61,2,68,"#1c2529");rect(ctx,x-8,72,18,2,"#303a3f");
    rect(ctx,x-5,96,13,1,"#566168");rect(ctx,x-5,119,13,1,"#2b353a");
  }
  for(let i=0;i<18;i++){const x=(i*41+t*.025)%W;pixel(ctx,x,46+(i%5)*14,palette[4+(i%5)]);}
  rect(ctx,0,127,W,2,"#515c61");
  rect(ctx,0,184,W,40,"#07090b");
  for(let x=0;x<W;x+=16)rect(ctx,x,184,1,40,"#141a1e");
  for(let y=192;y<224;y+=8)rect(ctx,0,y,W,1,"#11171a");
  // Two large static light banks: same arena, richer depth.
  for(const x of [48,272]){rect(ctx,x-2,55,4,58,"#101619");rect(ctx,x-9,58,18,2,"#38444a");rect(ctx,x-6,63,12,1,"#69757a");}
  text(ctx,"FREEzzz ARENA",8,40,7,"#8a969b");text(ctx,"SECTOR 03",312,40,7,"#8a969b","right");
}

function bar(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,v:number,flip=false,accent="#d5d8d7"){
  rect(ctx,x,y,w,8,"#07090b");rect(ctx,x+1,y+1,w-2,6,"#293137");
  const fill=Math.round((w-2)*clamp(v,0,1));if(fill<=0)return;
  rect(ctx,flip?x+w-1-fill:x+1,y+1,fill,6,accent);
}
function hud(ctx:CanvasRenderingContext2D,a:Fighter,b:Fighter,hpA:number,hpB:number,time:number,round:number,scoreA:number,scoreB:number){
  rect(ctx,0,0,W,34,"#050708");
  text(ctx,a.name,8,4,8,"#f0eee7");text(ctx,a.tag,8,16,5,a.accent);
  text(ctx,b.name,312,4,8,"#f0eee7","right");text(ctx,b.tag,312,16,5,b.accent,"right");
  bar(ctx,48,6,92,hpA/100,false,a.accent);bar(ctx,272,6,92,hpB/100,true,b.accent);
  rect(ctx,149,4,22,22,"#11171b");text(ctx,String(Math.max(0,Math.ceil(time))).padStart(2,"0"),160,8,8,"#f0eee7","center");
  text(ctx,"R"+round,160,18,5,"#7e898d","center");
  text(ctx,String(scoreA)+" : "+String(scoreB),160,28,5,"#7e898d","center");
}

function drawSelect(ctx:CanvasRenderingContext2D,selected:FighterId){
  ctx.fillStyle="#07090b";ctx.fillRect(0,0,W,H);
  text(ctx,"SELECT FIGHTER",160,10,13,"#f0eee7","center");
  text(ctx,"FREEzzz ARENA",160,28,6,"#7e898d","center");
  const ids:FighterId[]=["vex","ruma","korr"];
  ids.forEach((id,i)=>{
    const f=fighters[id],x=53+i*107,active=id===selected;
    rect(ctx,x-39,48,78,121,active?"#1d252a":"#0d1216");
    rect(ctx,x-39,48,78,2,active?f.accent:"#343e43");
    rect(ctx,x-35,53,70,1,"#293237");
    drawSprite(ctx,f,x,147,0,false,false,.86);
    text(ctx,f.name,x,154,10,active?"#f0eee7":"#aab1b4","center");
    text(ctx,f.tag,x,168,5,f.accent,"center");
    text(ctx,"SPD "+f.speed+"  PWR "+f.power,x,178,5,"#7e898d","center");
    text(ctx,"GRD "+f.guard,x,187,5,"#59656b","center");
  });
  text(ctx,"◀  ▶  SELECT     ENTER  START",160,207,7,"#d5d8d7","center");
}
function drawResult(ctx:CanvasRenderingContext2D,winner:Fighter,scoreA:number,scoreB:number){
  ctx.fillStyle="#07090b";ctx.fillRect(0,0,W,H);
  text(ctx,"ROUND COMPLETE",160,42,10,"#7e898d","center");
  text(ctx,winner.name,160,66,24,winner.accent,"center");
  text(ctx,"WIN",160,96,12,"#f0eee7","center");
  drawSprite(ctx,winner,160,181,4,false,false,1);
  text(ctx,scoreA+" : "+scoreB,160,194,8,"#d5d8d7","center");
  text(ctx,"ENTER  NEXT ROUND     ESC  SELECT",160,211,6,"#7e898d","center");
}

export function mountFreezzzArena(host:HTMLElement):()=>void{
  host.innerHTML="";
  const root=document.createElement("section");root.className="freezzz-arena";
  root.innerHTML='<div class="freezzz-arena-screen"><canvas class="freezzz-arena-canvas" width="'+W+'" height="'+H+'" aria-label="FREEzzz Arena"></canvas><div class="freezzz-arena-scanlines"></div></div><div class="freezzz-arena-controls"><button data-arena="left">◀</button><button data-arena="right">▶</button><button data-arena="guard">GUARD</button><button data-arena="burst">BURST</button><button data-arena="start">START</button></div>';
  host.append(root);
  const canvas=root.querySelector<HTMLCanvasElement>("canvas")!;const ctx=canvas.getContext("2d",{alpha:false})!;ctx.imageSmoothingEnabled=false;
  let phase:Phase="select",selected:FighterId="vex",enemy:FighterId="ruma";
  let hpA=100,hpB=100,time=60,round=1,scoreA=0,scoreB=0,frame=0,last=performance.now(),raf=0,coolA=0,coolB=0,winner:FighterId=selected;

  function nextEnemy(id:FighterId){return id==="vex"?"ruma":id==="ruma"?"korr":"vex" as FighterId;}
  function startRound(){enemy=nextEnemy(selected);phase="fight";hpA=100;hpB=100;time=60;coolA=0;coolB=0;}
  function startGame(){scoreA=0;scoreB=0;round=1;startRound();}
  function cycle(dir:number){const ids:FighterId[]=["vex","ruma","korr"],i=ids.indexOf(selected);selected=ids[(i+dir+3)%3];}
  function setKey(e:KeyboardEvent,down:boolean){
    if(e.key==="ArrowLeft")input.left=down;if(e.key==="ArrowRight")input.right=down;if(e.key.toLowerCase()==="g")input.guard=down;if(e.key===" "||e.key.toLowerCase()==="x")input.burst=down;
    if(down&&e.key==="Enter"){if(phase==="select")startGame();else if(phase==="result"){if(scoreA>=2||scoreB>=2){phase="select";scoreA=0;scoreB=0;round=1;}else{round++;startRound();}}}
    if(down&&e.key==="Escape")phase="select";
  }
  const keydown=(e:KeyboardEvent)=>{if(["ArrowLeft","ArrowRight"," "].includes(e.key))e.preventDefault();setKey(e,true);};
  const keyup=(e:KeyboardEvent)=>setKey(e,false);
  window.addEventListener("keydown",keydown);window.addEventListener("keyup",keyup);

  root.querySelectorAll<HTMLButtonElement>("[data-arena]").forEach(btn=>{
    const a=btn.dataset.arena||"";
    const press=()=>{if(a==="left")input.left=true;if(a==="right")input.right=true;if(a==="guard")input.guard=true;if(a==="burst")input.burst=true;if(a==="start"){if(phase==="select")startGame();else if(phase==="result"){if(scoreA>=2||scoreB>=2){phase="select";scoreA=0;scoreB=0;round=1;}else{round++;startRound();}}}};
    const release=()=>{if(a==="left")input.left=false;if(a==="right")input.right=false;if(a==="guard")input.guard=false;if(a==="burst")input.burst=false;};
    btn.addEventListener("pointerdown",press);btn.addEventListener("pointerup",release);btn.addEventListener("pointercancel",release);btn.addEventListener("pointerleave",release);
  });

  function update(dt:number){
    frame++;
    if(phase==="select"){if(input.left){input.left=false;cycle(-1);}if(input.right){input.right=false;cycle(1);}return;}
    if(phase==="result")return;
    time-=dt;
    const f=fighters[selected],e=fighters[enemy],speed=25+f.speed*2;
    if(input.left)xA-=speed*dt;if(input.right)xA+=speed*dt;xA=clamp(xA,42,278);
    const dir=xA<xB?-1:1;
    xB+=Math.sin(frame*.016)*dt*6;xB=clamp(xB,82,266);
    coolA=Math.max(0,coolA-dt);coolB=Math.max(0,coolB-dt);
    if(input.burst&&coolA<=0){input.burst=false;coolA=.42;const d=Math.abs(xA-xB);if(d<52)hpB-=Math.max(5,f.power*.95-(input.guard?1:0));else xA=clamp(xA+dir*20,42,278);}
    if(Math.abs(xA-xB)<46&&coolB<=0){coolB=.72;if(!input.guard)hpA-=Math.max(3,e.power*.52);}
    if(hpA<=0||hpB<=0||time<=0){
      winner=hpA>=hpB?selected:enemy;
      if(winner===selected)scoreA++;else scoreB++;
      phase="result";
    }
  }
  let xA=92,xB=228;
  function render(t:number){
    update(Math.min(.05,(t-last)/1000));last=t;
    if(phase==="select")drawSelect(ctx,selected);
    else if(phase==="result")drawResult(ctx,fighters[winner],scoreA,scoreB);
    else{drawArena(ctx,t);hud(ctx,fighters[selected],fighters[enemy],hpA,hpB,time,round,scoreA,scoreB);drawSprite(ctx,fighters[enemy],xB,183,frame+2,true,false,1);drawSprite(ctx,fighters[selected],xA,183,frame,false,false,1);if(input.guard)text(ctx,"GUARD",xA,197,5,fighters[selected].accent,"center");}
    raf=requestAnimationFrame(render);
  }
  raf=requestAnimationFrame(render);
  const resize=()=>{const box=root.querySelector<HTMLElement>(".freezzz-arena-screen");if(!box)return;canvas.style.width="100%";canvas.style.height="100%";};
  const ro=new ResizeObserver(resize);ro.observe(root);resize();
  return ()=>{cancelAnimationFrame(raf);ro.disconnect();window.removeEventListener("keydown",keydown);window.removeEventListener("keyup",keyup);host.innerHTML="";};
}
