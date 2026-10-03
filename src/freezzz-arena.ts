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
  const idle=frame%20<10?0:1;
  const step=frame%16<8?-1:1;
  const breathe=frame%24<12?0:1;
  ctx.save();
  ctx.translate(Math.round(cx),Math.round(ground));
  ctx.scale(d*scale,scale);
  if(ghost)ctx.globalAlpha=.16;

  // Soft pixel-contact shadow.
  rect(ctx,-27,-2,54,3,"#020304");
  rect(ctx,-20,-4,40,2,"#0d1215");

  // Legs: separated human proportions with knees, calves and footwear.
  const legShift=idle?1:-1;
  if(f.build===0){
    poly(ctx,[-13,-45,-2,-45,-3,-25,-6,-13,-11,-5,-18,-4,-15,-12,-10,-24],f.gear);
    poly(ctx,[2,-45,13,-45,15,-24,18,-12,20,-5,14,-3,8,-7,7,-15,5,-27],shade(f.gear,.82));
    rect(ctx,-13,-32,8,7,f.gearHi);rect(ctx,6,-31,8,7,shade(f.gearHi,.7));
  }else if(f.build===1){
    poly(ctx,[-14,-46,-2,-46,-1,-26,-5,-14,-10,-5,-19,-3,-15,-11,-10,-25],f.gear);
    poly(ctx,[2,-46,14,-46,16,-25,19,-12,21,-4,14,-2,8,-8,7,-16,5,-27],shade(f.gear,.82));
    rect(ctx,-14,-31,9,8,shade(f.gearHi,.88));rect(ctx,6,-30,9,8,shade(f.gearHi,.68));
  }else{
    poly(ctx,[-15,-47,-3,-47,-2,-25,-6,-13,-10,-4,-20,-3,-17,-11,-11,-25],f.gear);
    poly(ctx,[3,-47,15,-47,17,-25,20,-11,22,-3,15,-1,8,-8,7,-16,5,-27],shade(f.gear,.76));
    rect(ctx,-15,-33,9,9,f.gearHi);rect(ctx,7,-32,9,9,shade(f.gearHi,.68));
    rect(ctx,-13,-29,3,10,"#20282d");rect(ctx,10,-28,3,10,"#20282d");
  }
  // Boots/shoes with distinct toes.
  poly(ctx,[-18,-7,-9,-8,-5,-4,-7,-1,-21,-1,-22,-4], "#050607");
  poly(ctx,[7,-6,16,-8,22,-4,20,-1,6,-1,4,-3], "#050607");
  rect(ctx,-17,-8,8,2,shade(f.gearHi,.7));rect(ctx,9,-8,9,2,shade(f.gearHi,.62));

  // Hips / waist.
  rect(ctx,-13,-53,26,9,"#07090b");
  poly(ctx,[-13,-52,13,-52,10,-43,7,-39,-7,-39,-10,-43],f.gear);
  rect(ctx,-10,-45,20,4,shade(f.gearHi,.72));
  rect(ctx,-11,-40,22,3,"#10161a");

  // Torso is tapered rather than rectangular: chest, ribs, abdomen.
  const shoulder=f.build===2?23:f.build===1?21:19;
  const waist=f.build===2?13:f.build===1?12:10;
  poly(ctx,[-shoulder,-76,shoulder,-76,shoulder-5,-60,waist+5,-43,waist,-37,-waist,-37,-waist-5,-43,-shoulder+5,-60],f.gear);
  poly(ctx,[-shoulder+4,-71,0,-67,shoulder-4,-71,shoulder-7,-59,5,-49,-5,-49,-shoulder+7,-59],f.gearHi);
  poly(ctx,[-4,-67,4,-67,7,-48,2,-44,-2,-44,-7,-48],shade(f.gear,.58));
  // Costume construction lines.
  rect(ctx,-9,-61,18,2,shade(f.gearHi,.82));
  rect(ctx,-8,-51,16,2,shade(f.gear,.55));
  rect(ctx,-waist-1,-43,waist*2+2,4,shade(f.gearHi,.72));

  // Arms: upper arm, forearm and relaxed hands.
  const skinArm=shade(f.skin,.92);
  poly(ctx,[-shoulder+1,-73,-shoulder-8,-67,-shoulder-8,-48,-shoulder-4,-38,-shoulder+3,-40,-shoulder+5,-51,-shoulder+4,-68],f.gear);
  poly(ctx,[shoulder-1,-73,shoulder+8,-67,shoulder+8,-48,shoulder+4,-38,shoulder-3,-40,shoulder-5,-51,shoulder-4,-68],shade(f.gear,.76));
  rect(ctx,-shoulder-7,-52+step,6,14,skinArm);rect(ctx,shoulder+1,-52-step,6,14,shade(f.skin,.78));
  rect(ctx,-shoulder-8,-40+step,8,7,f.skin);rect(ctx,shoulder+1,-40-step,8,7,f.skin);
  rect(ctx,-shoulder-7,-40+step,4,2,f.skinHi);rect(ctx,shoulder+2,-40-step,4,2,f.skinHi);

  // Neck and head: smaller neck, cheekbones and jaw to avoid the robotic cube look.
  rect(ctx,-6,-86,12,10,f.skinShadow);
  const hw=f.head===2?10:9;
  poly(ctx,[-hw,-103,-5,-106,5,-106,hw,-102,hw+2,-94,hw,-85,6,-79,0,-76,-6,-79,-hw,-85,-hw-2,-94],f.skin);
  poly(ctx,[-hw+2,-100,-4,-102,4,-102,hw-2,-99,hw-1,-92,5,-84,-5,-84,-hw+1,-92],f.skinHi);
  // Ears and jaw planes.
  rect(ctx,-hw-3,-96,3,7,f.skinShadow);rect(ctx,hw,-96,3,7,shade(f.skinShadow,.86));
  rect(ctx,-6,-83,12,4,f.skinShadow);
  rect(ctx,-hw+1,-87,4,3,shade(f.skinHi,.78));rect(ctx,hw-5,-87,4,3,shade(f.skinShadow,.84));

  // Hair / headgear silhouette.
  if(f.id==="vex"){
    poly(ctx,[-13,-104,-8,-111,5,-111,13,-105,10,-100,-1,-103,-8,-100], "#11171a");
    rect(ctx,8,-104,5,3,f.accent);rect(ctx,-12,-103,5,3,shade(f.accent,.7));
  }else if(f.id==="ruma"){
    poly(ctx,[-15,-104,-9,-111,8,-111,15,-104,12,-99,-10,-99], "#6a432d");
    rect(ctx,-13,-101,26,4,f.accent);
    rect(ctx,-10,-96,3,10,f.skinShadow);rect(ctx,7,-96,3,10,f.skinShadow);
  }else{
    rect(ctx,-14,-109,28,7,"#171c20");rect(ctx,-11,-113,22,4,"#080a0c");
    rect(ctx,-17,-103,4,10,f.accent);rect(ctx,13,-103,4,10,f.accent);
  }

  // Face: brows, eyes, nose, mouth and cheek pixels.
  rect(ctx,-7,-96,5,2,"#201817");rect(ctx,2,-96,5,2,"#201817");
  rect(ctx,-6,-94,2,2,"#ece8df");rect(ctx,3,-94,2,2,"#ece8df");
  rect(ctx,-2,-92,4,5,f.skinShadow);
  rect(ctx,-5,-86,3,2,f.skinHi);rect(ctx,2,-86,3,2,shade(f.skinShadow,.86));
  rect(ctx,-5,-81,10,2,f.skinShadow);
  rect(ctx,-3,-79,6,1,shade(f.skinHi,.7));
  if(f.id==="korr"){rect(ctx,-9,-88,18,3,f.gearHi);rect(ctx,-6,-84,12,2,f.skinShadow);}
  if(f.id==="ruma"){rect(ctx,-10,-83,20,2,shade(f.accent,.9));}

  // Character-specific anatomy and costume landmarks.
  if(f.id==="vex"){
    // Short cropped hair, exposed ears, narrow jaw and cyan utility vest.
    rect(ctx,-9,-105,18,3,"#111519");
    rect(ctx,-12,-102,4,3,"#0b0e10");rect(ctx,8,-102,4,3,"#0b0e10");
    rect(ctx,-12,-94,3,6,f.skinShadow);rect(ctx,9,-94,3,6,f.skinShadow);
    rect(ctx,-10,-72,20,2,"#0b1013");
    poly(ctx,[-18,-75,-9,-78,0,-73,9,-78,18,-75,15,-67,-15,-67],f.gearHi);
    rect(ctx,-15,-67,5,18,f.accent);rect(ctx,10,-67,5,18,shade(f.accent,.64));
    rect(ctx,-8,-64,16,3,"#06080a");
  }else if(f.id==="ruma"){
    // Wrapped head covering, cheek shadow and layered desert cloth.
    rect(ctx,-12,-105,24,4,"#70472f");
    rect(ctx,-15,-101,30,5,f.accent);
    rect(ctx,-11,-96,3,9,f.skinShadow);rect(ctx,8,-96,3,9,f.skinShadow);
    poly(ctx,[-20,-76,-10,-80,0,-74,10,-80,20,-76,16,-66,-16,-66],shade(f.gear,.9));
    rect(ctx,-17,-66,34,5,shade(f.accent,.62));
    rect(ctx,-10,-59,20,3,f.gearHi);
    rect(ctx,-7,-54,14,2,shade(f.accent,.72));
  }else{
    // Broad industrial head frame and layered chest plates.
    rect(ctx,-13,-106,26,5,"#11161a");
    rect(ctx,-16,-101,5,9,f.accent);rect(ctx,11,-101,5,9,shade(f.accent,.68));
    rect(ctx,-19,-77,38,9,f.gearHi);
    rect(ctx,-16,-68,32,5,f.accent);
    rect(ctx,-11,-60,22,5,shade(f.gearHi,.8));
    rect(ctx,-7,-52,14,3,"#161c20");
  }

  // Individual costume identity.
  if(f.id==="vex"){
    rect(ctx,-17,-72,7,26,f.accent);rect(ctx,10,-72,7,26,shade(f.accent,.64));
    rect(ctx,-8,-65,16,3,"#06080a");rect(ctx,-7,-52,14,2,f.gearHi);
    rect(ctx,-15,-38,8,3,f.accent);rect(ctx,7,-38,8,3,shade(f.accent,.7));
    rect(ctx,-10,-69,2,14,shade(f.accent,.82));rect(ctx,8,-69,2,14,shade(f.accent,.55));
  }else if(f.id==="ruma"){
    rect(ctx,-18,-72,36,7,shade(f.accent,.72));rect(ctx,-13,-63,26,5,f.gearHi);
    rect(ctx,-10,-53,20,3,f.accent);rect(ctx,-15,-41,7,6,shade(f.accent,.62));rect(ctx,8,-41,7,6,shade(f.accent,.62));
    rect(ctx,-6,-70,3,16,shade(f.accent,.9));rect(ctx,4,-70,3,16,shade(f.accent,.55));
  }else{
    rect(ctx,-21,-75,42,9,f.accent);rect(ctx,-19,-64,38,5,shade(f.accent,.72));
    rect(ctx,-13,-53,26,4,f.gearHi);rect(ctx,-16,-44,9,6,"#15191c");rect(ctx,7,-44,9,6,"#15191c");
    rect(ctx,-20,-38,9,3,f.accent);rect(ctx,11,-38,9,3,shade(f.accent,.68));
    rect(ctx,-7,-72,3,13,shade(f.accent,.86));rect(ctx,4,-72,3,13,shade(f.accent,.55));
  }

  // Controlled material grain: subtle, not enough to destroy anatomy.
  noise(ctx,f.id,-22,-112,44,78,f.gear,seedFor(f.id)+frame*13,.10);
  noise(ctx,f.id,-12,-101,24,27,f.skin,seedFor(f.id)+7,.045);
  for(let i=0;i<8;i++)rect(ctx,-10+(i%3)*5,-70+i*5,3,1,shade("#ffffff",.06+i*.014));
  if(idle)rect(ctx,-shoulder+5,-69,2,17,shade(f.accent,.5));
  if(breathe)rect(ctx,-4,-39,8,1,shade(f.gearHi,.52));
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
    drawSprite(ctx,f,x,145,frameForSelection(id)+(id==="vex"?1:id==="ruma"?3:5),false,false,1.12);
    rect(ctx,x-44,137,88,1,active?f.accent:"#263137");
    text(ctx,f.name,x,147,11,active?"#f0eee7":"#b5babc","center");
    text(ctx,f.tag,x,161,5,f.accent,"center");
    text(ctx,"SPD "+f.speed+"  PWR "+f.power+"  GRD "+f.guard,x,171,4,"#7e898d","center");
  });
  text(ctx,"◀  ▶   SELECT",80,204,6,"#d5d8d7","center");
  text(ctx,"ENTER   START",240,204,6,"#d5d8d7","center");
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
    else{drawArena(ctx,t);hud(ctx,fighters[selected],fighters[enemy],hpA,hpB,time,round,scoreA,scoreB);drawSprite(ctx,fighters[enemy],xB,183,frame+2,true,false,1);drawSprite(ctx,fighters[selected],xA,183,frame+(fighters[selected].id==="vex"?1:fighters[selected].id==="ruma"?4:7),false,false,1);if(input.guard)text(ctx,"GUARD",xA,197,5,fighters[selected].accent,"center");}
    raf=requestAnimationFrame(render);
  }
  raf=requestAnimationFrame(render);
  const resize=()=>{const box=root.querySelector<HTMLElement>(".freezzz-arena-screen");if(!box)return;canvas.style.width="100%";canvas.style.height="100%";};
  const ro=new ResizeObserver(resize);ro.observe(root);resize();
  return ()=>{cancelAnimationFrame(raf);ro.disconnect();window.removeEventListener("keydown",keydown);window.removeEventListener("keyup",keyup);input.left=false;input.right=false;input.guard=false;input.burst=false;host.innerHTML="";};
}
