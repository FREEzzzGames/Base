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
const W=640,H=448;
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
  const d=flip?-1:1;
  const idle=frame%24<12?0:1;
  const step=frame%18<9?-1:1;
  ctx.save();
  ctx.translate(cx,ground);
  ctx.scale(d*scale,scale);
  if(ghost)ctx.globalAlpha=.16;

  // Smooth contact shadow.
  ctx.save();
  ctx.globalAlpha*=.55;
  const shadow=ctx.createRadialGradient(0,-2,2,0,-2,30);
  shadow.addColorStop(0,"rgba(0,0,0,.85)");
  shadow.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=shadow;
  ctx.beginPath();ctx.ellipse(0,-1,30,4,0,0,Math.PI*2);ctx.fill();
  ctx.restore();

  const skin=ctx.createLinearGradient(-12,-108,14,-72);
  skin.addColorStop(0,f.skinHi);skin.addColorStop(.42,f.skin);skin.addColorStop(1,f.skinShadow);
  const gear=ctx.createLinearGradient(-22,-78,22,-34);
  gear.addColorStop(0,f.gearHi);gear.addColorStop(.48,f.gear);gear.addColorStop(1,shade(f.gear,.58));
  const accent=ctx.createLinearGradient(-16,-76,16,-35);
  accent.addColorStop(0,shade(f.accent,.95));accent.addColorStop(.55,f.accent);accent.addColorStop(1,shade(f.accent,.58));

  // Legs: long, rounded silhouettes with distinct stance.
  ctx.fillStyle=gear;
  ctx.beginPath();
  ctx.moveTo(-13,-47);ctx.quadraticCurveTo(-15,-34,-12,-19);ctx.lineTo(-18,-5);
  ctx.quadraticCurveTo(-19,-1,-14,0);ctx.lineTo(-3,0);
  ctx.quadraticCurveTo(-1,-2,-3,-7);ctx.lineTo(-1,-24);
  ctx.quadraticCurveTo(0,-35,-2,-47);ctx.closePath();ctx.fill();
  ctx.beginPath();
  ctx.moveTo(3,-47);ctx.quadraticCurveTo(5,-34,5,-22);ctx.lineTo(9,-7);
  ctx.quadraticCurveTo(8,-2,12,0);ctx.lineTo(23,0);
  ctx.quadraticCurveTo(25,-3,20,-7);ctx.lineTo(16,-23);
  ctx.quadraticCurveTo(16,-37,13,-47);ctx.closePath();ctx.fill();

  // Knee and lower-leg material highlights.
  ctx.fillStyle=shade(f.gearHi,.78);
  ctx.beginPath();ctx.ellipse(-8,-27,6,10,0,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse(10,-26,6,10,0,0,Math.PI*2);ctx.fill();

  // Boots.
  ctx.fillStyle="#07090b";
  ctx.beginPath();ctx.roundRect(-19,-8,16,9,3);ctx.fill();
  ctx.beginPath();ctx.roundRect(7,-8,17,9,3);ctx.fill();
  ctx.fillStyle=shade(f.gearHi,.62);ctx.fillRect(-16,-7,9,2);ctx.fillRect(10,-7,10,2);

  // Hips and torso: curved human chest/waist silhouette.
  ctx.fillStyle=gear;
  ctx.beginPath();
  ctx.moveTo(-12,-55);
  ctx.quadraticCurveTo(-17,-51,-18,-42);
  ctx.quadraticCurveTo(-14,-36,-8,-35);
  ctx.quadraticCurveTo(0,-32,8,-35);
  ctx.quadraticCurveTo(14,-36,18,-42);
  ctx.quadraticCurveTo(17,-51,12,-55);
  ctx.closePath();ctx.fill();

  const shoulder=f.build===2?22:f.build===1?20:18;
  ctx.beginPath();
  ctx.moveTo(-shoulder,-77);
  ctx.quadraticCurveTo(-shoulder-3,-72,-shoulder+1,-62);
  ctx.quadraticCurveTo(-17,-50,-10,-43);
  ctx.quadraticCurveTo(0,-39,10,-43);
  ctx.quadraticCurveTo(17,-50,shoulder-1,-62);
  ctx.quadraticCurveTo(shoulder+3,-72,shoulder,-77);
  ctx.closePath();ctx.fill();

  // Chest planes.
  ctx.fillStyle=shade(f.gearHi,.82);
  ctx.beginPath();
  ctx.moveTo(-shoulder+3,-72);ctx.quadraticCurveTo(-8,-76,0,-70);
  ctx.quadraticCurveTo(8,-76,shoulder-3,-72);
  ctx.lineTo(10,-58);ctx.quadraticCurveTo(0,-53,-10,-58);ctx.closePath();ctx.fill();

  // Fighter-specific clothing.
  if(f.id==="vex"){
    ctx.fillStyle=accent;
    ctx.beginPath();ctx.roundRect(-17,-70,7,25,2);ctx.fill();
    ctx.beginPath();ctx.roundRect(10,-70,7,25,2);ctx.fill();
    ctx.fillStyle="#080c0f";ctx.beginPath();ctx.roundRect(-7,-67,14,19,3);ctx.fill();
    ctx.fillStyle=f.gearHi;ctx.fillRect(-10,-45,20,3);
    ctx.fillStyle=f.accent;ctx.fillRect(-14,-39,7,2);ctx.fillRect(7,-39,7,2);
  }else if(f.id==="ruma"){
    ctx.fillStyle=accent;
    ctx.beginPath();ctx.roundRect(-17,-69,34,7,3);ctx.fill();
    ctx.fillStyle=f.gearHi;ctx.beginPath();ctx.roundRect(-12,-60,24,7,2);ctx.fill();
    ctx.fillStyle=shade(f.accent,.75);ctx.fillRect(-12,-45,24,5);
    ctx.fillStyle=f.gear;ctx.fillRect(-9,-39,18,3);
  }else{
    ctx.fillStyle=accent;
    ctx.beginPath();ctx.roundRect(-21,-72,42,10,3);ctx.fill();
    ctx.fillStyle=shade(f.gearHi,.82);ctx.beginPath();ctx.roundRect(-15,-60,30,7,2);ctx.fill();
    ctx.fillStyle="#141a1e";ctx.beginPath();ctx.roundRect(-11,-51,22,6,2);ctx.fill();
    ctx.fillStyle=f.accent;ctx.fillRect(-19,-40,9,3);ctx.fillRect(10,-40,9,3);
  }

  // Arms and hands, with rounded joints.
  ctx.fillStyle=gear;
  ctx.beginPath();ctx.moveTo(-shoulder+2,-73);ctx.quadraticCurveTo(-shoulder-9,-67,-shoulder-7,-51);ctx.lineTo(-shoulder-5,-39);ctx.quadraticCurveTo(-shoulder,-35,-shoulder+4,-39);ctx.lineTo(-shoulder+5,-58);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(shoulder-2,-73);ctx.quadraticCurveTo(shoulder+9,-67,shoulder+7,-51);ctx.lineTo(shoulder+5,-39);ctx.quadraticCurveTo(shoulder,-35,shoulder-4,-39);ctx.lineTo(shoulder-5,-58);ctx.closePath();ctx.fill();
  ctx.fillStyle=skin;
  ctx.beginPath();ctx.roundRect(-shoulder-7,-40,9,10,3);ctx.fill();
  ctx.beginPath();ctx.roundRect(shoulder-2,-40,9,10,3);ctx.fill();
  ctx.fillStyle=f.skinHi;ctx.fillRect(-shoulder-6,-39,4,2);ctx.fillRect(shoulder-1,-39,4,2);

  // Neck.
  ctx.fillStyle=f.skinShadow;ctx.beginPath();ctx.roundRect(-7,-88,14,13,4);ctx.fill();

  // Head: smooth oval + jaw, no stair-stepped pixel contour.
  ctx.fillStyle=skin;
  ctx.beginPath();
  ctx.moveTo(-10,-106);
  ctx.quadraticCurveTo(-14,-101,-13,-91);
  ctx.quadraticCurveTo(-12,-82,-6,-77);
  ctx.quadraticCurveTo(0,-73,6,-77);
  ctx.quadraticCurveTo(12,-82,13,-91);
  ctx.quadraticCurveTo(14,-101,10,-106);
  ctx.quadraticCurveTo(0,-111,-10,-106);
  ctx.closePath();ctx.fill();

  // Ears.
  ctx.fillStyle=f.skinShadow;
  ctx.beginPath();ctx.ellipse(-13,-94,3,6,0,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse(13,-94,3,6,0,0,Math.PI*2);ctx.fill();

  // Hair/headgear identity.
  if(f.id==="vex"){
    ctx.fillStyle="#101519";
    ctx.beginPath();ctx.moveTo(-12,-103);ctx.quadraticCurveTo(-5,-112,5,-109);ctx.quadraticCurveTo(12,-108,13,-102);ctx.lineTo(7,-101);ctx.lineTo(3,-104);ctx.lineTo(-2,-101);ctx.lineTo(-8,-103);ctx.closePath();ctx.fill();
    ctx.fillStyle=f.accent;ctx.fillRect(8,-102,5,2);ctx.fillRect(-13,-101,5,2);
  }else if(f.id==="ruma"){
    ctx.fillStyle="#69422e";
    ctx.beginPath();ctx.moveTo(-15,-103);ctx.quadraticCurveTo(0,-111,15,-103);ctx.lineTo(12,-98);ctx.lineTo(-12,-98);ctx.closePath();ctx.fill();
    ctx.fillStyle=f.accent;ctx.beginPath();ctx.roundRect(-15,-101,30,5,2);ctx.fill();
  }else{
    ctx.fillStyle="#10161a";ctx.beginPath();ctx.roundRect(-14,-108,28,8,3);ctx.fill();
    ctx.fillStyle=f.accent;ctx.beginPath();ctx.roundRect(-17,-103,5,11,2);ctx.fill();
    ctx.beginPath();ctx.roundRect(12,-103,5,11,2);ctx.fill();
  }

  // Face planes and features.
  ctx.fillStyle=shade(f.skinShadow,.9);
  ctx.beginPath();ctx.ellipse(-5,-91,3.8,2.2,0,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse(5,-91,3.8,2.2,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#1a1717";ctx.fillRect(-7,-95,5,2);ctx.fillRect(2,-95,5,2);
  ctx.fillStyle="#f1eee6";ctx.fillRect(-6,-93,2,2);ctx.fillRect(3,-93,2,2);
  ctx.fillStyle=f.skinShadow;ctx.beginPath();ctx.roundRect(-2,-91,4,7,2);ctx.fill();
  ctx.fillStyle=shade(f.skinHi,.72);ctx.beginPath();ctx.roundRect(-5,-83,10,2,1);ctx.fill();
  ctx.fillStyle=f.skinShadow;ctx.fillRect(-4,-80,8,2);

  if(f.id==="korr"){
    ctx.fillStyle=f.gearHi;ctx.beginPath();ctx.roundRect(-10,-88,20,3,1);ctx.fill();
  }else if(f.id==="ruma"){
    ctx.fillStyle=shade(f.accent,.86);ctx.fillRect(-10,-82,20,2);
  }

  // Subtle material highlights rather than square pixel noise.
  ctx.globalAlpha*=.22;
  ctx.fillStyle="#ffffff";
  ctx.beginPath();ctx.ellipse(-shoulder*.35,-61,2,11,-.12,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse(shoulder*.35,-61,1.5,8,.12,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=ghost?.16:1;

  // Idle motion.
  if(idle){
    ctx.fillStyle=shade(f.accent,.62);
    ctx.fillRect(-shoulder+4,-67,2,13);
  }
  if(step){
    ctx.fillStyle=shade(f.gearHi,.52);
    ctx.fillRect(-4,-36,8,1);
  }
  ctx.restore();
}

function drawArena(ctx:CanvasRenderingContext2D,t:number){
  ctx.save();ctx.scale(2,2);
  const g=ctx.createLinearGradient(0,0,0,224);
  g.addColorStop(0,"#030507");g.addColorStop(.30,"#0c1317");g.addColorStop(.58,"#202a2f");g.addColorStop(1,"#070a0c");
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);

  // Deep ceiling: large architectural bands instead of an empty black field.
  rect(ctx,0,34,W,2,"#66747a");
  rect(ctx,0,36,W,4,"#0a0e11");
  rect(ctx,0,40,W,1,"#344047");
  for(let y=48;y<128;y+=10)rect(ctx,0,y,W,1,y%20===8?"#273238":"#121a1e");
  for(let x=-12;x<W+24;x+=38){
    rect(ctx,x,51,3,78,"#172126");
    rect(ctx,x+4,56,20,2,"#303c42");
    rect(ctx,x+7,61,14,1,"#59666c");
    rect(ctx,x+10,68,8,1,"#28343a");
  }

  // Large distant light banks and moving specular points.
  for(const x of [43,107,213,277]){
    rect(ctx,x-2,48,4,76,"#11191d");
    rect(ctx,x-9,51,18,2,"#3c484e");
    rect(ctx,x-6,56,12,2,"#69767b");
    rect(ctx,x-4,60,8,1,"#aeb6b7");
  }
  for(let i=0;i<28;i++){
    const x=(i*47+t*.018)%W;
    const y=44+(i%6)*11;
    rect(ctx,x,y,1+(i%3),1,"#536168");
  }

  // Mid-ground platform with depth rails.
  rect(ctx,0,126,W,3,"#59656b");
  rect(ctx,0,130,W,2,"#11181c");
  rect(ctx,0,145,W,1,"#3a454b");
  rect(ctx,0,160,W,2,"#12191d");
  for(let x=16;x<W;x+=32){rect(ctx,x,132,2,30,"#202a2f");rect(ctx,x-7,138,16,2,"#313c42");}

  // Foreground floor, perspective grid and illuminated edge.
  rect(ctx,0,174,W,3,"#080b0d");
  rect(ctx,0,177,W,47,"#050708");
  for(let y=184;y<224;y+=8)rect(ctx,0,y,W,1,"#161e22");
  for(let x=0;x<W;x+=16)rect(ctx,x,177,1,47,"#12191d");
  for(let i=0;i<12;i++){
    const x=8+i*27;
    rect(ctx,x,177,1,47,"#1d272c");
    if(i%2===0)rect(ctx,x-5,181,11,1,"#3a464c");
  }
  rect(ctx,0,177,W,1,"#6a767a");

  // Original arena title plates.
  text(ctx,"FREEzzz ARENA",8,42,7,"#a0aaad");
  text(ctx,"SECTOR 03",312,42,7,"#a0aaad","right");
  text(ctx,"FIGHT DECK",160,54,5,"#556268","center");
  ctx.restore();
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

function drawEmblem(ctx:CanvasRenderingContext2D,id:FighterId,cx:number,cy:number,active:boolean){
  const f=fighters[id];
  ctx.save();
  ctx.globalAlpha=active?.95:.65;
  ctx.strokeStyle=f.accent;
  ctx.lineWidth=2;
  ctx.beginPath();
  if(id==="vex"){ctx.moveTo(cx,cy-15);ctx.lineTo(cx+12,cy-5);ctx.lineTo(cx+8,cy+13);ctx.lineTo(cx-8,cy+13);ctx.lineTo(cx-12,cy-5);ctx.closePath();}
  else if(id==="ruma"){ctx.moveTo(cx,cy-16);ctx.lineTo(cx+14,cy);ctx.lineTo(cx,cy+16);ctx.lineTo(cx-14,cy);ctx.closePath();}
  else{ctx.moveTo(cx-15,cy-8);ctx.lineTo(cx,cy-17);ctx.lineTo(cx+15,cy-8);ctx.lineTo(cx+11,cy+11);ctx.lineTo(cx,cy+17);ctx.lineTo(cx-11,cy+11);ctx.closePath();}
  ctx.stroke();
  rect(ctx,cx-2,cy-2,4,4,f.accent);
  ctx.restore();
}
function drawSelect(ctx:CanvasRenderingContext2D,selected:FighterId){
  ctx.save();ctx.scale(2,2);
  ctx.fillStyle="#050607";ctx.fillRect(0,0,W,H);
  rect(ctx,0,0,W,2,"#7b8588");
  text(ctx,"SELECT FIGHTER",160,8,13,"#f0eee7","center");
  text(ctx,"FREEzzz ARENA",160,25,6,"#8b969a","center");
  text(ctx,"THREE ORIGINAL FIGHTERS",160,34,5,"#566168","center");

  const ids:FighterId[]=["vex","ruma","korr"];
  ids.forEach((id,i)=>{
    const f=fighters[id],x=54+i*106,active=id===selected;
    // Poster-like card with a dark portrait field and faction mark.
    rect(ctx,x-49,46,98,137,active?"#151d21":"#0b1013");
    rect(ctx,x-49,46,98,3,active?f.accent:"#263137");
    rect(ctx,x-44,51,88,87,"#070b0d");
    drawEmblem(ctx,id,x,72,active);
    drawSprite(ctx,f,x,145,frameForSelection(id)+(id==="vex"?1:id==="ruma"?3:5),false,false,1.16);
    rect(ctx,x-44,137,88,1,active?f.accent:"#263137");
    text(ctx,f.name,x,147,11,active?"#f0eee7":"#b5babc","center");
    text(ctx,f.tag,x,161,5,f.accent,"center");
    text(ctx,"SPD "+f.speed+"  PWR "+f.power+"  GRD "+f.guard,x,171,4,"#7e898d","center");
  });
  text(ctx,"◀  ▶   SELECT",80,204,6,"#d5d8d7","center");
  text(ctx,"ENTER   START",240,204,6,"#d5d8d7","center");
  ctx.restore();
}

function frameForSelection(id:FighterId){
  return id==="vex"?2:id==="ruma"?7:12;
}
function drawResult(ctx:CanvasRenderingContext2D,winner:Fighter,scoreA:number,scoreB:number){
  ctx.save();ctx.scale(2,2);
  ctx.fillStyle="#07090b";ctx.fillRect(0,0,W,H);
  text(ctx,"ROUND COMPLETE",160,42,10,"#7e898d","center");
  text(ctx,winner.name,160,66,24,winner.accent,"center");
  text(ctx,"WIN",160,96,12,"#f0eee7","center");
  drawSprite(ctx,winner,160,181,4,false,false,1);
  text(ctx,scoreA+" : "+scoreB,160,194,8,"#d5d8d7","center");
  text(ctx,"ENTER  NEXT ROUND     ESC  SELECT",160,211,6,"#7e898d","center");
  ctx.restore();
}

export function mountFreezzzArena(host:HTMLElement):()=>void{
  host.innerHTML="";
  const root=document.createElement("section");root.className="freezzz-arena";
  root.innerHTML='<div class="freezzz-arena-screen"><canvas class="freezzz-arena-canvas" width="'+W+'" height="'+H+'" aria-label="FREEzzz Arena"></canvas><div class="freezzz-arena-scanlines"></div></div><div class="freezzz-arena-controls"><button data-arena="left">◀</button><button data-arena="right">▶</button><button data-arena="guard">GUARD</button><button data-arena="burst">BURST</button><button data-arena="start">START</button></div>';
  host.append(root);
  const canvas=root.querySelector<HTMLCanvasElement>("canvas")!;const ctx=canvas.getContext("2d",{alpha:false})!;ctx.imageSmoothingEnabled=true;
  let phase:Phase="select",selected:FighterId="vex",enemy:FighterId="ruma";
  let hpA=100,hpB=100,time=60,round=1,scoreA=0,scoreB=0,frame=0,last=performance.now(),raf=0,coolA=0,coolB=0,winner:FighterId=selected;

  function nextEnemy(id:FighterId){return id==="vex"?"ruma":id==="ruma"?"korr":"vex" as FighterId;}
  function startRound(){enemy=nextEnemy(selected);phase="fight";hpA=100;hpB=100;time=60;coolA=0;coolB=0;xA=92;xB=228;}
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
    if(Math.abs(xA-xB)<54){
      const mid=(xA+xB)/2;
      if(xA<xB){xA=mid-27;xB=mid+27;}else{xA=mid+27;xB=mid-27;}
    }
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
    else{drawArena(ctx,t);ctx.save();ctx.scale(2,2);hud(ctx,fighters[selected],fighters[enemy],hpA,hpB,time,round,scoreA,scoreB);drawSprite(ctx,fighters[enemy],xB,184,frame+2,true,false,1.08);drawSprite(ctx,fighters[selected],xA,184,frame+(fighters[selected].id==="vex"?1:fighters[selected].id==="ruma"?4:7),false,false,1.08);if(input.guard)text(ctx,"GUARD",xA,197,5,fighters[selected].accent,"center");ctx.restore();}
    raf=requestAnimationFrame(render);
  }
  raf=requestAnimationFrame(render);
  const resize=()=>{const box=root.querySelector<HTMLElement>(".freezzz-arena-screen");if(!box)return;canvas.style.width="100%";canvas.style.height="100%";};
  const ro=new ResizeObserver(resize);ro.observe(root);resize();
  return ()=>{cancelAnimationFrame(raf);ro.disconnect();window.removeEventListener("keydown",keydown);window.removeEventListener("keyup",keyup);input.left=false;input.right=false;input.guard=false;input.burst=false;host.innerHTML="";};
}
