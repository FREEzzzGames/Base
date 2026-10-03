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
  const d=flip?-1:1;
  const idle=(frame%18<9?0:1);
  const swing=(frame%16<8?-1:1);
  const breathing=(frame%20<10?0:1);
  ctx.save();
  ctx.translate(Math.round(cx),Math.round(ground));
  ctx.scale(d*scale,scale);
  if(ghost)ctx.globalAlpha=.16;

  // Ground contact / sprite shadow.
  rect(ctx,-31,-2,62,3,"#030405");
  rect(ctx,-23,-1,46,2,"#11171a");

  // Legs: separate silhouettes, knees, boots and material planes.
  const legA=idle,legB=1-idle;
  if(f.build===0){
    poly(ctx,[-15,-35,-4,-34,-5,-10,-13,-4,-18,-3,-17,-8,-11,-13,-12,-30],"#080b0e");
    poly(ctx,[3,-34,14,-34,16,-11,21,-5,18,-2,3,-4,5,-13],"#080b0e");
    poly(ctx,[-13,-35,-3,-34,-4,-11,-12,-6,-17,-4,-15,-10,-10,-14,-11,-30],f.gear);
    poly(ctx,[4,-34,13,-34,15,-11,19,-5,16,-3,4,-5,6,-13],shade(f.gear,.72));
    rect(ctx,-14,-19,7,10,f.gearHi);rect(ctx,7,-20,7,11,shade(f.gearHi,.72));
  }else if(f.build===1){
    poly(ctx,[-17,-35,-4,-35,-2,-8,-13,-3,-22,-2,-18,-8],"#080a0b");
    poly(ctx,[2,-35,15,-35,18,-8,23,-3,19,-1,3,-3,5,-10],"#080a0b");
    poly(ctx,[-15,-35,-4,-35,-3,-9,-14,-4,-21,-3,-17,-9],f.gear);
    poly(ctx,[3,-35,14,-35,17,-9,21,-4,18,-2,4,-4,6,-10],shade(f.gear,.74));
    rect(ctx,-14,-21,8,12,shade(f.gearHi,.82));rect(ctx,7,-21,8,13,shade(f.gearHi,.68));
  }else{
    poly(ctx,[-17,-36,-3,-36,-2,-7,-15,-3,-22,-2,-21,-9],"#07090a");
    poly(ctx,[2,-36,16,-36,18,-8,23,-2,19,0,2,-2,4,-10],"#07090a");
    poly(ctx,[-16,-36,-3,-36,-2,-8,-15,-3,-21,-3,-20,-10],f.gear);
    poly(ctx,[3,-36,15,-36,17,-9,21,-3,18,-1,3,-3,5,-10],shade(f.gear,.72));
    rect(ctx,-15,-22,6,15,f.gearHi);rect(ctx,9,-22,6,15,shade(f.gearHi,.72));
    rect(ctx,-13,-17,3,7,"#20282d");rect(ctx,10,-17,3,7,"#20282d");
  }
  // Boot soles.
  rect(ctx,-20,-4,14,3,"#050607");rect(ctx,7,-4,15,3,"#050607");
  rect(ctx,-18,-6,9,2,shade(f.gearHi,.7));rect(ctx,9,-6,10,2,shade(f.gearHi,.62));

  // Torso silhouette, chest planes, belt and lower garment.
  const shoulder=f.build===2?22:19;
  const waist=f.build===2?15:12;
  rect(ctx,-shoulder,-71,shoulder*2,10,"#07090b");
  poly(ctx,[-shoulder+2,-66,shoulder-2,-66,waist+6,-29,waist,-21,-waist,-21,-waist-6,-29],f.gear);
  poly(ctx,[-shoulder+4,-63,0,-58,shoulder-4,-63,shoulder-5,-34,8,-29,-8,-29,-shoulder+5,-34],f.gearHi);
  // Central torso shadow gives a sculpted, photographed-material read.
  poly(ctx,[-3,-61,3,-61,7,-31,3,-27,-3,-27,-7,-31],shade(f.gear,.62));
  rect(ctx,-waist-1,-35,waist*2+2,7,shade(f.gear,.82));
  rect(ctx,-waist+2,-29,(waist-2)*2,5,f.gear);
  rect(ctx,-8,-56,16,2,shade(f.gearHi,.9));
  rect(ctx,-5,-47,10,1,"#050607");
  rect(ctx,-10,-39,20,1,shade("#ffffff",.12));

  // Shoulders / arms with hard joints and exposed hands.
  const armC=shade(f.skin,.92);
  poly(ctx,[-shoulder+1,-62,-shoulder-8,-58,-shoulder-8,-34,-shoulder-3,-30,-shoulder+4,-35,-shoulder+3,-56],f.gear);
  poly(ctx,[shoulder-1,-62,shoulder+8,-58,shoulder+8,-34,shoulder+3,-30,shoulder-4,-35,shoulder-3,-56],shade(f.gear,.72));
  rect(ctx,-shoulder-7,-48+swing,6,14,armC);rect(ctx,shoulder+2,-48-swing,6,14,shade(f.skin,.76));
  rect(ctx,-shoulder-8,-35+swing,8,7,f.skin);rect(ctx,shoulder+2,-35-swing,8,7,f.skin);
  rect(ctx,-shoulder-7,-35+swing,4,2,f.skinHi);rect(ctx,shoulder+3,-35-swing,4,2,f.skinHi);
  rect(ctx,-shoulder-5,-51+swing,3,8,shade(f.gearHi,.75));rect(ctx,shoulder+2,-51-swing,3,8,shade(f.gearHi,.65));

  // Neck, ears, head and jaw.
  rect(ctx,-8,-80,16,10,f.skinShadow);
  const headW=f.head===2?12:11;
  poly(ctx,[-headW,-96,headW,-96,headW+3,-88,headW,-77,headW-5,-71,-headW+5,-71,-headW,-77,-headW-3,-88],f.skin);
  rect(ctx,-headW+2,-92,headW*2-4,13,f.skinHi);
  rect(ctx,-headW+1,-79,headW*2-2,5,f.skin);
  rect(ctx,-headW-3,-89,3,8,f.skinShadow);rect(ctx,headW,-89,3,8,shade(f.skinShadow,.85));
  // Cheek / jaw planes.
  rect(ctx,-headW+2,-78,5,3,shade(f.skinHi,.82));rect(ctx,headW-7,-78,5,3,shade(f.skinShadow,.85));
  rect(ctx,-5,-73,10,2,f.skinShadow);

  // Hair / headgear and silhouette-defining accessories.
  if(f.id==="vex"){
    rect(ctx,-13,-100,26,5,"#0c1013");rect(ctx,-10,-103,20,3,"#050607");
    rect(ctx,-12,-96,5,2,f.accent);rect(ctx,7,-96,5,2,f.accent);
  }else if(f.id==="ruma"){
    rect(ctx,-14,-100,28,5,f.accent);rect(ctx,-11,-104,22,4,shade(f.accent,.72));
    rect(ctx,-13,-95,4,9,f.skinShadow);rect(ctx,9,-95,4,9,f.skinShadow);
    rect(ctx,-6,-101,12,2,shade(f.accent,.9));
  }else{
    rect(ctx,-15,-100,30,7,"#151a1e");rect(ctx,-12,-104,24,4,"#080a0c");
    rect(ctx,-17,-94,4,10,f.accent);rect(ctx,13,-94,4,10,f.accent);
    rect(ctx,-20,-90,3,6,shade(f.accent,.72));rect(ctx,17,-90,3,6,shade(f.accent,.72));
  }

  // Facial pixel clusters.
  rect(ctx,-8,-87,5,2,"#171414");rect(ctx,3,-87,5,2,"#171414");
  rect(ctx,-7,-86,2,1,"#f0eee7");rect(ctx,4,-86,2,1,"#f0eee7");
  rect(ctx,-2,-84,4,5,f.skinShadow);
  rect(ctx,-5,-78,10,1,f.skinShadow);
  rect(ctx,-8,-75,5,2,f.skinHi);rect(ctx,3,-75,5,2,f.skinHi);
  if(f.id==="korr"){rect(ctx,-10,-81,20,3,f.gearHi);rect(ctx,-8,-77,16,3,f.skinShadow);}
  if(f.id==="ruma"){rect(ctx,-12,-74,24,2,f.accent);}

  // Fighter-specific construction.
  if(f.id==="vex"){
    rect(ctx,-16,-62,6,25,f.accent);rect(ctx,10,-62,6,25,shade(f.accent,.66));
    rect(ctx,-8,-54,16,3,"#050607");rect(ctx,-6,-42,12,2,f.gearHi);
    rect(ctx,-15,-26,9,3,f.accent);rect(ctx,6,-26,9,3,shade(f.accent,.7));
    rect(ctx,-10,-59,2,15,shade(f.accent,.78));rect(ctx,8,-59,2,15,shade(f.accent,.55));
  }else if(f.id==="ruma"){
    rect(ctx,-17,-60,34,6,shade(f.accent,.72));rect(ctx,-12,-52,24,5,f.gearHi);
    rect(ctx,-9,-44,18,3,f.accent);rect(ctx,-14,-35,6,6,shade(f.accent,.62));rect(ctx,8,-35,6,6,shade(f.accent,.62));
    rect(ctx,-6,-59,3,17,shade(f.accent,.9));rect(ctx,4,-59,3,17,shade(f.accent,.55));
  }else{
    rect(ctx,-20,-64,40,8,f.accent);rect(ctx,-18,-55,36,5,shade(f.accent,.72));
    rect(ctx,-12,-46,24,4,f.gearHi);rect(ctx,-15,-38,8,6,"#15191c");rect(ctx,7,-38,8,6,"#15191c");
    rect(ctx,-19,-25,8,3,f.accent);rect(ctx,11,-25,8,3,shade(f.accent,.68));
    rect(ctx,-7,-61,3,13,shade(f.accent,.86));rect(ctx,4,-61,3,13,shade(f.accent,.55));
  }

  // Material grain, specular chips and controlled pixel noise.
  noise(ctx,f.id,-20,-102,40,79,f.gear,seedFor(f.id)+frame*13,.14);
  noise(ctx,f.id,-12,-94,24,25,f.skin,seedFor(f.id)+7,.07);
  for(let i=0;i<7;i++){
    const yy=-65+i*6;
    rect(ctx,-10+(i%3)*5,yy,4,1,shade("#ffffff",.08+i*.018));
  }

  // Idle highlight moves across the costume without adding new content.
  if(idle){rect(ctx,-shoulder+5,-60,2,17,shade(f.accent,.55));}
  if(breathing){rect(ctx,-4,-27,8,1,shade(f.gearHi,.55));}

  ctx.restore();
}
function drawArena(ctx:CanvasRenderingContext2D,t:number){
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
  ctx.fillStyle="#050708";ctx.fillRect(0,0,W,H);
  // Console-like selection header.
  rect(ctx,0,0,W,2,"#657177");
  text(ctx,"SELECT FIGHTER",160,9,14,"#f0eee7","center");
  text(ctx,"FREEzzz ARENA",160,27,6,"#7e898d","center");
  text(ctx,"CHOOSE YOUR FIGHTER",160,36,5,"#59656b","center");

  const ids:FighterId[]=["vex","ruma","korr"];
  ids.forEach((id,i)=>{
    const f=fighters[id],x=54+i*106,active=id===selected;
    rect(ctx,x-47,48,94,128,active?"#182126":"#0b1013");
    rect(ctx,x-47,48,94,3,active?f.accent:"#2e383d");
    rect(ctx,x-42,54,84,1,"#364248");
    rect(ctx,x-39,58,78,87,"#0a0f12");
    drawSprite(ctx,f,x,145,frameForSelection(id),false,false,1.05);
    text(ctx,f.name,x,151,11,active?"#f0eee7":"#aab1b4","center");
    text(ctx,f.tag,x,165,5,f.accent,"center");
    text(ctx,"SPD "+f.speed+"  PWR "+f.power,x,175,5,"#8a969b","center");
    text(ctx,"GRD "+f.guard,x,184,5,"#59656b","center");
  });
  text(ctx,"◀  ▶   SELECT",82,205,6,"#d5d8d7","center");
  text(ctx,"ENTER   START",238,205,6,"#d5d8d7","center");
}

function frameForSelection(id:FighterId){
  return id==="vex"?2:id==="ruma"?7:12;
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
  return ()=>{cancelAnimationFrame(raf);ro.disconnect();window.removeEventListener("keydown",keydown);window.removeEventListener("keyup",keyup);input.left=false;input.right=false;input.guard=false;input.burst=false;host.innerHTML="";};
}
