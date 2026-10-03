/* FREEzzz ARENA — complete three-fighter vertical slice.
 * One arena. Three original fighters. 320x224 logical framebuffer.
 * Visual pipeline: layered human silhouette -> material shading -> pixel clusters
 * -> restrained palette -> nearest-neighbour presentation.
 */

type FighterId="vex"|"ruma"|"korr";
type Phase="select"|"fight"|"result";
type Pose="idle"|"move"|"guard"|"burst"|"hit"|"victory";
type Fighter={
  id:FighterId; name:string; tag:string; speed:number; power:number; guard:number;
  accent:string; skin:string; skinHi:string; skinShadow:string; gear:string; gearHi:string;
  build:number; head:number; burstName:string; burstColor:string;
};
const W=640,H=448;
const fighters:Record<FighterId,Fighter>={
  vex:{id:"vex",name:"VEX",tag:"URBAN RUNNER",speed:8,power:5,guard:4,accent:"#54d6d8",skin:"#a96858",skinHi:"#d18b70",skinShadow:"#6e4038",gear:"#182027",gearHi:"#36444b",build:0,head:0,burstName:"RUSH",burstColor:"#7ff7f7"},
  ruma:{id:"ruma",name:"RUMA",tag:"DESERT GUARDIAN",speed:5,power:8,guard:7,accent:"#c58b48",skin:"#996149",skinHi:"#c98563",skinShadow:"#5f3b31",gear:"#57422f",gearHi:"#866644",build:1,head:1,burstName:"GUARDIAN",burstColor:"#f0bd73"},
  korr:{id:"korr",name:"KORR",tag:"INDUSTRIAL HEAVY",speed:3,power:9,guard:9,accent:"#d86c35",skin:"#705047",skinHi:"#9b6d59",skinShadow:"#402f2b",gear:"#30383d",gearHi:"#59636a",build:2,head:2,burstName:"OVERDRIVE",burstColor:"#ff995f"}
};
const palette=["#07090b","#0e1215","#171d21","#242d32","#38434a","#59656b","#7d898d","#aab1b4","#d5d8d7","#f0eee7"];
type Input={left:boolean;right:boolean;guard:boolean;burst:boolean;};
const input:Input={left:false,right:false,guard:false,burst:false};

function clamp(v:number,a:number,b:number){return Math.max(a,Math.min(b,v));}
function shade(hex:string,n:number){const x=hex.replace("#","");const r=parseInt(x.slice(0,2),16),g=parseInt(x.slice(2,4),16),b=parseInt(x.slice(4,6),16);const f=clamp(n,0,1);return "rgb("+Math.round(r*f)+","+Math.round(g*f)+","+Math.round(b*f)+")";}
function rect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,c:string){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function ellipse(ctx:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,c:string,rot=0){ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(x,y,rx,ry,rot,0,Math.PI*2);ctx.fill();}
function limb(ctx:CanvasRenderingContext2D,x1:number,y1:number,x2:number,y2:number,w:number,c:string){ctx.strokeStyle=c;ctx.lineWidth=w;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
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
function poseFor(f:Fighter,frame:number,pose:Pose){
  const q=(frame%32)/32,step=q<.5?1:-1,breathe=Math.sin(q*Math.PI*2)*.7;
  if(pose==="guard")return {bob:-1,lean:f.id==="korr"?-1:-2,frontArm:-10,backArm:5,frontLeg:-5,backLeg:7,stance:7};
  if(pose==="burst")return {bob:-3,lean:f.id==="vex"?5:f.id==="ruma"?2:-1,frontArm:-18,backArm:8,frontLeg:-8,backLeg:11,stance:10};
  if(pose==="hit")return {bob:2,lean:-6,frontArm:9,backArm:-7,frontLeg:8,backLeg:-7,stance:5};
  if(pose==="victory")return {bob:-3,lean:-1,frontArm:-18,backArm:-14,frontLeg:-2,backLeg:3,stance:5};
  if(pose==="move")return {bob:breathe-2,lean:step*3,frontArm:step*-7,backArm:step*7,frontLeg:step*9,backLeg:step*-8,stance:8};
  return {bob:breathe,lean:0,frontArm:step*-2,backArm:step*2,frontLeg:step*2,backLeg:step*-2,stance:4};
}

/* Authored combat sprite: each pose changes the silhouette, limb angles and weight distribution. */
function drawSprite(ctx:CanvasRenderingContext2D,f:Fighter,cx:number,ground:number,frame:number,flip=false,ghost=false,scale=1,pose:Pose="idle"){
  const p=poseFor(f,frame,pose),d=flip?-1:1;
  ctx.save();ctx.translate(cx,ground+p.bob);ctx.scale(d*scale,scale);
  if(ghost)ctx.globalAlpha=.17;

  const skin=f.skin,hi=f.skinHi,shadow=f.skinShadow,cloth=f.gear,clothHi=f.gearHi,a=f.accent;
  const lean=p.lean,shoulder=f.build===2?23:f.build===1?21:19;

  ellipse(ctx,0,0,28,3,"rgba(0,0,0,.72)");

  // Back leg.
  limb(ctx,6+lean,-46,10+p.backLeg,-9,11,shade(cloth,.66));
  limb(ctx,10+p.backLeg,-10,18+p.backLeg,-2,7,"#090c0e");
  rect(ctx,14+p.backLeg,-4,11,3,shade(clothHi,.55));

  // Front leg and knee plane.
  limb(ctx,-5+lean,-46,-8+p.frontLeg,-27,12,cloth);
  limb(ctx,-8+p.frontLeg,-27,-13+p.frontLeg,-8,10,cloth);
  ellipse(ctx,-8+p.frontLeg,-27,6,7,shade(clothHi,.70),.15);
  limb(ctx,-13+p.frontLeg,-8,-19+p.frontLeg,-2,7,"#090c0e");
  rect(ctx,-22+p.frontLeg,-4,11,3,shade(clothHi,.55));

  // Pelvis / waist.
  poly(ctx,[-14+lean,-57,-9+lean,-47,0+lean,-44,10+lean,-47,14+lean,-57,8+lean,-62,-7+lean,-62],cloth);
  rect(ctx,-11+lean,-51,22,3,clothHi);rect(ctx,-7+lean,-47,14,2,shade(cloth,.55));

  // Torso with asymmetric shoulders.
  poly(ctx,[-shoulder+lean,-84,-12+lean,-86,-7+lean,-61,0+lean,-54,9+lean,-61,shoulder+lean,-83,12+lean,-91,-10+lean,-91],cloth);
  poly(ctx,[-shoulder+lean+2,-81,-8+lean,-84,0+lean,-76,8+lean,-84,shoulder+lean-2,-80,11+lean,-65,0+lean,-59,-11+lean,-65],clothHi);
  poly(ctx,[-8+lean,-63,0+lean,-58,8+lean,-63,6+lean,-50,-6+lean,-50],shade(cloth,.54));

  if(f.id==="vex"){
    rect(ctx,-19+lean,-82,7,27,a);rect(ctx,12+lean,-82,7,27,a);
    rect(ctx,-6+lean,-79,12,22,"#080e12");rect(ctx,-16+lean,-61,5,10,shade(a,.72));rect(ctx,11+lean,-61,5,10,shade(a,.72));
    rect(ctx,-12+lean,-49,8,3,a);rect(ctx,5+lean,-49,8,3,a);
  }else if(f.id==="ruma"){
    rect(ctx,-18+lean,-82,36,8,a);rect(ctx,-14+lean,-69,28,7,clothHi);rect(ctx,-11+lean,-58,22,4,shade(a,.72));rect(ctx,-8+lean,-52,16,3,cloth);
  }else{
    rect(ctx,-22+lean,-84,44,11,a);rect(ctx,-16+lean,-70,32,8,clothHi);rect(ctx,-12+lean,-59,24,7,"#12181c");
    rect(ctx,-20+lean,-49,10,3,a);rect(ctx,10+lean,-49,10,3,a);
  }

  // Rear arm.
  const rearX=shoulder+lean,rearElbow=shoulder+7+p.backArm;
  limb(ctx,rearX,-78,rearElbow,-61,10,cloth);limb(ctx,rearElbow,-61,rearElbow+2,-43,8,cloth);ellipse(ctx,rearElbow+2,-39,5,7,skin,.1);

  // Front arm changes dramatically between idle, guard and burst.
  const fx=-shoulder+lean,felbow=-shoulder-7+p.frontArm,fhandY=pose==="burst"?-73:pose==="guard"?-55:-40;
  limb(ctx,fx,-78,felbow,-62,11,cloth);
  limb(ctx,felbow,-62,pose==="burst"?-shoulder-19:felbow-2,fhandY,8,cloth);
  ellipse(ctx,(pose==="burst"?-shoulder-19:felbow-2),fhandY+4,5,7,skin,.15);

  // Neck and three-plane head.
  rect(ctx,-7+lean,-97,14,13,shadow);
  poly(ctx,[-12+lean,-116,-6+lean,-120,6+lean,-119,13+lean,-112,14+lean,-98,9+lean,-83,0+lean,-77,-9+lean,-83,-14+lean,-98,-14+lean,-111],skin);
  poly(ctx,[-11+lean,-113,-5+lean,-117,4+lean,-116,10+lean,-110,8+lean,-101,-1+lean,-104,-9+lean,-101],hi);
  poly(ctx,[-14+lean,-100,-8+lean,-94,-3+lean,-87,0+lean,-79,-9+lean,-83,-14+lean,-98],shadow);

  if(f.id==="vex"){
    poly(ctx,[-14+lean,-108,-10+lean,-118,0+lean,-120,12+lean,-114,15+lean,-106,7+lean,-105,1+lean,-110,-5+lean,-106,-10+lean,-110],"#0c1318");
    rect(ctx,9+lean,-106,5,2,a);rect(ctx,-14+lean,-106,5,2,a);
  }else if(f.id==="ruma"){
    poly(ctx,[-16+lean,-108,-10+lean,-117,0+lean,-120,10+lean,-116,16+lean,-108,12+lean,-101,-12+lean,-101],"#65402e");
    rect(ctx,-16+lean,-106,32,6,a);
  }else{
    rect(ctx,-15+lean,-116,30,10,"#0c1318");rect(ctx,-19+lean,-110,6,14,a);rect(ctx,13+lean,-110,6,14,a);
  }

  rect(ctx,-9+lean,-101,7,3,shadow);rect(ctx,2+lean,-101,7,3,shadow);
  rect(ctx,-7+lean,-99,3,2,"#f0eee7");rect(ctx,4+lean,-99,3,2,"#f0eee7");
  rect(ctx,-2+lean,-96,4,7,shadow);rect(ctx,-6+lean,-87,12,2,hi);rect(ctx,-5+lean,-84,10,2,shadow);
  if(f.id==="korr")rect(ctx,-10+lean,-93,20,4,clothHi);
  if(f.id==="ruma")rect(ctx,-11+lean,-86,22,2,shade(a,.86));

  // Pixel material clusters.
  for(let i=0;i<8;i++){const yy=-74+(i%4)*7,xx=-11+((i*7)%19);rect(ctx,xx+lean,yy,2,2,i%3===0?hi:shade(clothHi,.72));}
  rect(ctx,-shoulder+4+lean,-70,2,12,shade(a,.62));

  if(pose==="guard"){rect(ctx,-22+lean,-57,9,3,a);rect(ctx,13+lean,-55,9,3,a);}
  if(pose==="burst"){rect(ctx,-31,-77,5,2,f.burstColor);rect(ctx,-37,-73,3,2,f.burstColor);rect(ctx,-43,-69,2,2,f.burstColor);}
  if(pose==="hit"){rect(ctx,15+lean,-93,4,2,"#f0eee7");rect(ctx,19+lean,-90,3,2,"#7e898d");}
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
function hud(ctx:CanvasRenderingContext2D,a:Fighter,b:Fighter,hpA:number,hpB:number,time:number,round:number,scoreA:number,scoreB:number,energyA=0,energyB=0){
  rect(ctx,0,0,W,34,"#050708");
  text(ctx,a.name,8,4,8,"#f0eee7");text(ctx,a.tag,8,16,5,a.accent);
  text(ctx,b.name,312,4,8,"#f0eee7","right");text(ctx,b.tag,312,16,5,b.accent,"right");
  bar(ctx,48,6,92,hpA/100,false,a.accent);bar(ctx,272,6,92,hpB/100,true,b.accent);
  rect(ctx,149,4,22,22,"#11171b");text(ctx,String(Math.max(0,Math.ceil(time))).padStart(2,"0"),160,8,8,"#f0eee7","center");
  text(ctx,"R"+round,160,18,5,"#7e898d","center");
  text(ctx,String(scoreA)+" : "+String(scoreB),160,28,5,"#7e898d","center");
  text(ctx,"ENERGY",48,25,4,a.accent);bar(ctx,68,26,40,energyA/100,false,a.accent);
  text(ctx,"ENERGY",212,25,4,b.accent,"right");bar(ctx,224,26,40,energyB/100,true,b.accent);
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
    drawSprite(ctx,f,x,145,frameForSelection(id)+(id==="vex"?1:id==="ruma"?3:5),false,false,1.26,"idle");
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
function drawFightIntro(ctx:CanvasRenderingContext2D,a:Fighter,b:Fighter,frame:number){
  ctx.save();ctx.scale(2,2);ctx.fillStyle="#050708";ctx.fillRect(0,0,320,224);
  text(ctx,"FREEzzz ARENA",160,55,8,"#7e898d","center");
  text(ctx,a.name,70,78,18,a.accent,"center");text(ctx,"VS",160,86,10,"#f0eee7","center");text(ctx,b.name,250,78,18,b.accent,"center");
  drawSprite(ctx,a,70,177,frame,false,false,1.08,"guard");drawSprite(ctx,b,250,177,frame+8,true,false,1.08,"guard");
  text(ctx,"GET READY",160,204,7,"#d5d8d7","center");ctx.restore();
}
function drawResult(ctx:CanvasRenderingContext2D,winner:Fighter,scoreA:number,scoreB:number,finalMatch:boolean,frame:number){
  ctx.save();ctx.scale(2,2);
  ctx.fillStyle="#07090b";ctx.fillRect(0,0,W,H);
  text(ctx,finalMatch?"MATCH COMPLETE":"ROUND COMPLETE",160,42,10,"#7e898d","center");
  text(ctx,winner.name,160,66,24,winner.accent,"center");
  text(ctx,"WIN",160,96,12,"#f0eee7","center");
  drawSprite(ctx,winner,160,181,frame,false,false,1.18,"victory");
  text(ctx,scoreA+" : "+scoreB,160,194,8,"#d5d8d7","center");
  text(ctx,finalMatch?"ENTER  NEW MATCH     ESC  SELECT":"ENTER  NEXT ROUND     ESC  SELECT",160,211,6,"#7e898d","center");
  ctx.restore();
}

export function mountFreezzzArena(host:HTMLElement):()=>void{
  host.innerHTML="";
  const root=document.createElement("section");root.className="freezzz-arena";
  root.innerHTML='<div class="freezzz-arena-screen"><canvas class="freezzz-arena-canvas" width="'+W+'" height="'+H+'" aria-label="FREEzzz Arena"></canvas><div class="freezzz-arena-scanlines"></div></div><div class="freezzz-arena-controls"><button data-arena="left">◀</button><button data-arena="right">▶</button><button data-arena="guard">GUARD</button><button data-arena="burst">BURST</button><button data-arena="start">START</button></div>';
  host.append(root);
  const inline=document.createElement("style");inline.textContent=".freezzz-arena{min-height:0!important;height:auto!important;justify-content:flex-start!important;gap:8px!important;padding:0!important}.freezzz-arena-screen{width:100%!important;aspect-ratio:320/224!important;flex:none!important}.freezzz-arena-canvas{image-rendering:pixelated!important;image-rendering:crisp-edges!important}.freezzz-arena-controls{padding:0 0 8px}@media(max-width:700px){.freezzz-arena-controls{gap:5px}.freezzz-arena-controls button{min-width:58px!important;height:44px!important}}";root.append(inline);const canvas=root.querySelector<HTMLCanvasElement>("canvas")!;const ctx=canvas.getContext("2d",{alpha:false})!;ctx.imageSmoothingEnabled=false;
  let phase:Phase="select",selected:FighterId="vex",enemy:FighterId="ruma";
  let hpA=100,hpB=100,time=60,round=1,scoreA=0,scoreB=0,frame=0,last=performance.now(),raf=0,coolA=0,coolB=0,winner:FighterId=selected;
  let energyA=0,energyB=0,intro=0,finalMatch=false,flashA=0,flashB=0,burstTimer=0,hitTimerA=0,hitTimerB=0;

  function nextEnemy(id:FighterId){return id==="vex"?"ruma":id==="ruma"?"korr":"vex" as FighterId;}
  function startRound(){const opponents:FighterId[]=selected==="vex"?["ruma","korr"]:selected==="ruma"?["korr","vex"]:["vex","ruma"];enemy=opponents[Math.min(round-1,1)];phase="fight";hpA=100;hpB=100;time=60;coolA=0;coolB=0;energyA=0;energyB=0;flashA=0;flashB=0;burstTimer=0;hitTimerA=0;hitTimerB=0;xA=88;xB=232;intro=1.25;finalMatch=false;}
  function startGame(){scoreA=0;scoreB=0;round=1;startRound();}
  function cycle(dir:number){const ids:FighterId[]=["vex","ruma","korr"],i=ids.indexOf(selected);selected=ids[(i+dir+3)%3];}
  function setKey(e:KeyboardEvent,down:boolean){
    if(e.key==="ArrowLeft")input.left=down;if(e.key==="ArrowRight")input.right=down;if(e.key.toLowerCase()==="g")input.guard=down;if(e.key===" "||e.key.toLowerCase()==="x")input.burst=down;
    if(down&&e.key==="Enter"){if(phase==="select")startGame();else if(phase==="result"){if(finalMatch){phase="select";scoreA=0;scoreB=0;round=1;}else{round++;startRound();}}}
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
    frame++;flashA=Math.max(0,flashA-dt);flashB=Math.max(0,flashB-dt);burstTimer=Math.max(0,burstTimer-dt);hitTimerA=Math.max(0,hitTimerA-dt);hitTimerB=Math.max(0,hitTimerB-dt);
    if(phase==="select"){if(input.left){input.left=false;cycle(-1);}if(input.right){input.right=false;cycle(1);}return;}
    if(phase==="result")return;
    if(intro>0){intro=Math.max(0,intro-dt);return;}
    time=Math.max(0,time-dt);
    const f=fighters[selected],e=fighters[enemy],speed=25+f.speed*2;
    if(input.left)xA-=speed*dt;if(input.right)xA+=speed*dt;xA=clamp(xA,42,278);
    const dir=xA<xB?-1:1;
    xB+=Math.sin(frame*.016)*dt*6;xB=clamp(xB,82,266);
    if(Math.abs(xA-xB)<54){
      const mid=(xA+xB)/2;
      if(xA<xB){xA=mid-27;xB=mid+27;}else{xA=mid+27;xB=mid-27;}
    }
    coolA=Math.max(0,coolA-dt);coolB=Math.max(0,coolB-dt);
    energyA=clamp(energyA+dt*(input.guard?3:1.2),0,100);
    energyB=clamp(energyB+dt*1.4,0,100);
    if(input.burst&&coolA<=0&&energyA>=35){
      input.burst=false;energyA-=35;coolA=.55;burstTimer=.18;
      const d=Math.abs(xA-xB);
      if(d<58){const damage=f.power*(f.id==="vex"?1.05:f.id==="ruma"?1.18:1.28);hpB-=damage*(input.guard?.45:1);flashB=.12;hitTimerB=.13;}
      else xA=clamp(xA+dir*(f.id==="vex"?26:f.id==="ruma"?18:13),42,278);
    }
    if(Math.abs(xA-xB)<48&&coolB<=0){coolB=.9;hpA-=Math.max(1,e.power*(input.guard?.18:.42));energyB=clamp(energyB+8,0,100);flashA=.08;hitTimerA=.09;}
    if(hpA<=0||hpB<=0||time<=0){
      winner=hpA>=hpB?selected:enemy;
      if(winner===selected)scoreA++;else scoreB++;
      finalMatch=scoreA>=2||scoreB>=2;
      phase="result";
    }
  }
  let xA=92,xB=228;
  function render(t:number){
    const dt=Math.min(.05,(t-last)/1000);last=t;update(dt);
    if(phase==="select")drawSelect(ctx,selected);
    else if(phase==="result")drawResult(ctx,fighters[winner],scoreA,scoreB,finalMatch,frame);
    else if(intro>0)drawFightIntro(ctx,fighters[selected],fighters[enemy],frame);
    else{
      drawArena(ctx,t);ctx.save();ctx.scale(2,2);
      hud(ctx,fighters[selected],fighters[enemy],hpA,hpB,time,round,scoreA,scoreB,energyA,energyB);
      const poseA:Pose=burstTimer>0?"burst":hitTimerA>0?"hit":input.guard?"guard":(input.left||input.right)?"move":"idle";
      const poseB:Pose=hitTimerB>0?"hit":Math.abs(xA-xB)<60?"guard":"idle";
      drawSprite(ctx,fighters[enemy],xB,184,frame+5,true,false,1.32,poseB);
      drawSprite(ctx,fighters[selected],xA,184,frame,false,false,1.32,poseA);
      if(input.guard)text(ctx,"GUARD",xA,202,5,fighters[selected].accent,"center");
      if(burstTimer>0)text(ctx,fighters[selected].burstName,xA,193,5,fighters[selected].burstColor,"center");
      ctx.restore();
    }
  raf=requestAnimationFrame(render);
  }
  raf=requestAnimationFrame(render);
  const resize=()=>{const box=root.querySelector<HTMLElement>(".freezzz-arena-screen");if(!box)return;canvas.style.width="100%";canvas.style.height="100%";};
  const ro=new ResizeObserver(resize);ro.observe(root);resize();
  return ()=>{cancelAnimationFrame(raf);ro.disconnect();window.removeEventListener("keydown",keydown);window.removeEventListener("keyup",keyup);input.left=false;input.right=false;input.guard=false;input.burst=false;host.innerHTML="";};
}
