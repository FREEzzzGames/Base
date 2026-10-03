/*
 * FREEzzz ARENA
 * Original 16-bit fighting-game prototype.
 *
 * Visual target:
 * - native logical canvas: 320x224
 * - nearest-neighbour scaling
 * - deliberately limited palette
 * - layered, digitized-photo-inspired fighters
 *
 * No legacy RPG/text-adventure state survives in this module.
 */

type FighterId="vex"|"ruma"|"korr";
type Phase="select"|"fight"|"result";
type Fighter={id:FighterId;name:string;tag:string;speed:number;power:number;guard:number;accent:string;skin:string;gear:string;};

const W=320,H=224;
const fighters:Record<FighterId,Fighter>={
  vex:{id:"vex",name:"VEX",tag:"URBAN RUNNER",speed:8,power:5,guard:4,accent:"#54d6d8",skin:"#b87961",gear:"#1a2228"},
  ruma:{id:"ruma",name:"RUMA",tag:"DESERT GUARDIAN",speed:5,power:8,guard:7,accent:"#c58b48",skin:"#9a644c",gear:"#5a4430"},
  korr:{id:"korr",name:"KORR",tag:"INDUSTRIAL HEAVY",speed:3,power:9,guard:9,accent:"#d86c35",skin:"#6e5147",gear:"#34393d"}
};

const palette=["#07090b","#101418","#182027","#283039","#4a555d","#7a858b","#aab1b4","#d5d8d7","#f0eee7"];
const KEY="freezzz:arena:v1";

type Input={left:boolean;right:boolean;up:boolean;down:boolean;guard:boolean;burst:boolean;};
const input:Input={left:false,right:false,up:false,down:false,guard:false,burst:false};

function clamp(v:number,a:number,b:number){return Math.max(a,Math.min(b,v));}
function shade(hex:string,n:number){
  const x=hex.replace("#","");
  const r=parseInt(x.slice(0,2),16),g=parseInt(x.slice(2,4),16),b=parseInt(x.slice(4,6),16);
  const f=clamp(n,0,1);
  return "rgb("+Math.round(r*f)+","+Math.round(g*f)+","+Math.round(b*f)+")";
}
function rect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,c:string){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function text(ctx:CanvasRenderingContext2D,s:string,x:number,y:number,size=8,c="#d5d8d7",align:CanvasTextAlign="left"){
  ctx.font="700 "+size+"px monospace";ctx.textAlign=align;ctx.textBaseline="top";ctx.fillStyle=c;ctx.fillText(s,x,y);
}
function seedFor(id:FighterId){return id==="vex"?17:id==="ruma"?31:53;}
function noise(ctx:CanvasRenderingContext2D,id:FighterId,x:number,y:number,w:number,h:number,base:string,seed:number){
  let n=seed;
  for(let yy=0;yy<h;yy+=2)for(let xx=0;xx<w;xx+=2){
    n=(n*1664525+1013904223)>>>0;
    if((n&255)<30)rect(ctx,x+xx,y+yy,1,1,shade(base,0.72+(n%28)/100));
  }
}
function drawPhotoLikeFighter(ctx:CanvasRenderingContext2D,f:Fighter,cx:number,ground:number,frame:number,flip=false,ghost=false){
  const dir=flip?-1:1, x=cx;
  const bob=(frame%4===1?1:0);
  ctx.save();
  ctx.translate(x,ground+bob);
  ctx.scale(dir,1);
  if(ghost)ctx.globalAlpha=.18;

  // Ground/contact shadow.
  ctx.globalAlpha*=.72;
  rect(ctx,-28,-2,56,3,"#090b0d");
  ctx.globalAlpha=ghost?0.18:1;

  // Silhouette and realistic layered clothing, rendered as chunky digitized pixels.
  const skin=f.skin, gear=f.gear, accent=f.accent;
  rect(ctx,-13,-86,26,34,"#090b0d");
  rect(ctx,-11,-88,22,20,shade(skin,.78));
  rect(ctx,-8,-84,16,12,skin);
  rect(ctx,-7,-79,14,6,shade(skin,.82));
  rect(ctx,-8,-92,16,6,gear);
  rect(ctx,-5,-94,10,3,"#0a0b0c");

  // Neck / torso.
  rect(ctx,-9,-68,18,8,skin);
  rect(ctx,-15,-61,30,38,gear);
  rect(ctx,-12,-58,24,32,shade(gear,.82));
  rect(ctx,-10,-54,20,24,shade(gear,1.08));
  rect(ctx,-14,-49,5,19,accent);
  rect(ctx,9,-49,5,19,shade(accent,.72));
  rect(ctx,-8,-47,16,2,"#050607");

  // Arms.
  const swing=frame%6<3?2:-2;
  rect(ctx,-20,-58+swing,6,27,shade(skin,.82));
  rect(ctx,14,-58-swing,6,27,shade(skin,.82));
  rect(ctx,-22,-34+swing,7,7,skin);
  rect(ctx,15,-34-swing,7,7,skin);

  // Legs.
  rect(ctx,-13,-24,10,21,shade(gear,.82));
  rect(ctx,3,-24,10,21,shade(gear,.68));
  rect(ctx,-16,-5,14,5,"#0b0d0f");
  rect(ctx,2,-5,15,5,"#0b0d0f");

  // Material highlights / digitized-photo texture.
  rect(ctx,-7,-56,14,1,shade("#ffffff",.12));
  rect(ctx,-10,-39,5,1,shade("#ffffff",.16));
  rect(ctx,5,-31,5,1,shade("#ffffff",.11));
  noise(ctx,f.id,-14,-93,28,94,gear,seedFor(f.id)+frame*7);

  // Face details: intentionally generic, original.
  rect(ctx,-6,-81,3,2,"#141414");
  rect(ctx,3,-81,3,2,"#141414");
  rect(ctx,-3,-75,6,1,shade(skin,.55));
  if(f.id==="vex")rect(ctx,-10,-87,20,4,accent);
  if(f.id==="ruma"){rect(ctx,-12,-70,24,4,accent);rect(ctx,-13,-89,26,3,accent);}
  if(f.id==="korr"){rect(ctx,-16,-63,32,7,accent);rect(ctx,-14,-87,28,4,"#181c1e");}
  ctx.restore();
}
function drawArena(ctx:CanvasRenderingContext2D,t:number){
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,"#070a0d");g.addColorStop(.55,"#171d21");g.addColorStop(1,"#090b0d");
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  for(let y=44;y<184;y+=16){rect(ctx,0,y,W,1, y%32===12?"#293239":"#151b20");}
  // original industrial background, kept deliberately sparse for Genesis-style compositing
  rect(ctx,0,126,W,2,"#3a4449");
  for(let i=0;i<9;i++){
    const xx=18+i*38;
    rect(ctx,xx,65,2,62,"#20282d");
    rect(ctx,xx-7,73,16,2,"#2b353a");
    rect(ctx,xx-5,93,12,1,"#48545a");
  }
  for(let i=0;i<16;i++){
    const xx=(i*47+(t*.018))%W;
    rect(ctx,xx,39+(i%4)*18,1,1,palette[4+(i%4)]);
  }
  rect(ctx,0,185,W,39,"#080a0c");
  for(let x=0;x<W;x+=16)rect(ctx,x,185,1,39,"#11161a");
  for(let y=193;y<H;y+=8)rect(ctx,0,y,W,1,"#101417");
  text(ctx,"FREEzzz ARENA",8,43,7,"#7e898d");
  text(ctx,"SECTOR 03",W-8,43,7,"#7e898d","right");
}
function bar(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,value:number,flip=false){
  rect(ctx,x,y,w,7,"#090b0d");
  rect(ctx,x+1,y+1,w-2,5,"#242b30");
  const fill=Math.round((w-2)*clamp(value,0,1));
  if(flip)rect(ctx,x+w-1-fill,y+1,fill,5,"#d5d8d7");
  else rect(ctx,x+1,y+1,fill,5,"#d5d8d7");
}
function hud(ctx:CanvasRenderingContext2D,a:Fighter,b:Fighter,hpA:number,hpB:number,time:number,round:number){
  rect(ctx,0,0,W,34,"#06080a");
  text(ctx,a.name,8,6,8,"#f0eee7");
  text(ctx,a.tag,8,17,6,a.accent);
  text(ctx,b.name,W-8,6,8,"#f0eee7","right");
  text(ctx,b.tag,W-8,17,6,b.accent,"right");
  bar(ctx,48,7,92,hpA/100);
  bar(ctx,W-140,7,92,hpB/100,true);
  rect(ctx,149,5,22,19,"#101519");
  text(ctx,String(Math.max(0,Math.ceil(time))).padStart(2,"0"),160,9,8,"#f0eee7","center");
  text(ctx,"R"+round,160,24,5,"#7e898d","center");
}
function drawSelect(ctx:CanvasRenderingContext2D,selected:FighterId){
  ctx.fillStyle="#07090b";ctx.fillRect(0,0,W,H);
  text(ctx,"SELECT FIGHTER",160,13,13,"#f0eee7","center");
  text(ctx,"ORIGINAL FREEzzz ARENA",160,30,6,"#7e898d","center");
  const ids:FighterId[]=["vex","ruma","korr"];
  ids.forEach((id,i)=>{
    const f=fighters[id], x=53+i*107;
    rect(ctx,x-39,55,78,112,id===selected?"#1d252a":"#0e1317");
    rect(ctx,x-39,55,78,2,id===selected?f.accent:"#30383d");
    drawPhotoLikeFighter(ctx,f,x,151,0,false,false);
    text(ctx,f.name,x,157,10,id===selected?"#f0eee7":"#aab1b4","center");
    text(ctx,f.tag,x,171,5,f.accent,"center");
    text(ctx,"SPD "+f.speed+"  PWR "+f.power,x,181,5,"#7e898d","center");
  });
  text(ctx,"← → SELECT   ENTER START",160,207,7,"#d5d8d7","center");
}
function drawResult(ctx:CanvasRenderingContext2D,winner:Fighter){
  ctx.fillStyle="#07090b";ctx.fillRect(0,0,W,H);
  text(ctx,"ROUND COMPLETE",160,49,11,"#7e898d","center");
  text(ctx,winner.name,160,78,26,winner.accent,"center");
  text(ctx,"WIN",160,112,12,"#f0eee7","center");
  drawPhotoLikeFighter(ctx,winner,160,191,2,false,false);
  text(ctx,"ENTER  REMATCH",160,210,6,"#7e898d","center");
}

export function mountRpgGraphicsTest(host:HTMLElement):()=>void{
  host.innerHTML="";
  const root=document.createElement("section");
  root.className="freezzz-arena";
  root.innerHTML='<div class="freezzz-arena-screen"><canvas class="freezzz-arena-canvas" width="'+W+'" height="'+H+'" aria-label="FREEzzz Arena"></canvas><div class="freezzz-arena-scanlines"></div></div><div class="freezzz-arena-controls"><button data-arena="left">◀</button><button data-arena="right">▶</button><button data-arena="guard">GUARD</button><button data-arena="burst">BURST</button><button data-arena="start">START</button></div>';
  host.append(root);
  const canvas=root.querySelector<HTMLCanvasElement>("canvas")!;
  const ctx=canvas.getContext("2d",{alpha:false})!;
  ctx.imageSmoothingEnabled=false;

  let phase:Phase="select",selected:FighterId="vex",enemy:FighterId="ruma";
  let hpA=100,hpB=100,time=60,round=1,frame=0,last=performance.now(),raf=0;
  let xA=92,xB=228,coolA=0,coolB=0,roundWinner:FighterId="vex";

  const setKey=(e:KeyboardEvent,down:boolean)=>{
    if(e.key==="ArrowLeft")input.left=down;
    if(e.key==="ArrowRight")input.right=down;
    if(e.key==="ArrowUp")input.up=down;
    if(e.key==="ArrowDown")input.down=down;
    if(e.key.toLowerCase()==="g")input.guard=down;
    if(e.key===" "||e.key.toLowerCase()==="x")input.burst=down;
    if(down&&e.key==="Enter"&&phase!=="fight")startFight();
  };
  const keydown=(e:KeyboardEvent)=>{if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"," "].includes(e.key))e.preventDefault();setKey(e,true);};
  const keyup=(e:KeyboardEvent)=>setKey(e,false);
  window.addEventListener("keydown",keydown);window.addEventListener("keyup",keyup);

  function startFight(){
    phase="fight";hpA=100;hpB=100;time=60;xA=92;xB=228;coolA=0;coolB=0;round=1;
  }
  function cycleSelection(dir:number){
    const ids:FighterId[]=["vex","ruma","korr"],i=ids.indexOf(selected);
    selected=ids[(i+dir+ids.length)%ids.length];
  }
  root.querySelectorAll<HTMLButtonElement>("[data-arena]").forEach(btn=>{
    const action=btn.dataset.arena||"";
    const press=()=>{
      if(action==="left")input.left=true;
      if(action==="right")input.right=true;
      if(action==="guard")input.guard=true;
      if(action==="burst")input.burst=true;
      if(action==="start")startFight();
    };
    const release=()=>{
      if(action==="left")input.left=false;
      if(action==="right")input.right=false;
      if(action==="guard")input.guard=false;
      if(action==="burst")input.burst=false;
    };
    btn.addEventListener("pointerdown",press);btn.addEventListener("pointerup",release);btn.addEventListener("pointercancel",release);btn.addEventListener("pointerleave",release);
  });

  function update(dt:number){
    frame++;
    if(phase==="select"){
      if(input.left){input.left=false;cycleSelection(-1);}
      if(input.right){input.right=false;cycleSelection(1);}
      return;
    }
    if(phase==="result")return;
    time-=dt;
    const f=fighters[selected],e=fighters[enemy];
    const speed=26+f.speed*2;
    if(input.left)xA-=speed*dt;if(input.right)xA+=speed*dt;
    xA=clamp(xA,38,282);
    const dir=xA<xB?-1:1;
    xB+=Math.sin(frame*.018)*dt*7;
    xB=clamp(xB,80,270);
    coolA=Math.max(0,coolA-dt);coolB=Math.max(0,coolB-dt);
    if(input.burst&&coolA===0){
      input.burst=false;coolA=.45;
      const d=Math.abs(xA-xB);
      if(d<54)hpB-=Math.max(4,f.power*.9-(input.guard?2:0));
      else xA=clamp(xA+dir*22,38,282);
    }
    if(Math.abs(xA-xB)<48&&coolB===0){
      coolB=.75;
      if(!input.guard)hpA-=Math.max(3,e.power*.55);
    }
    if(hpA<=0||hpB<=0||time<=0){
      roundWinner=hpA>=hpB?selected:enemy;phase="result";
    }
  }

  function render(t:number){
    update(Math.min(.05,(t-last)/1000));last=t;
    if(phase==="select")drawSelect(ctx,selected);
    else if(phase==="result")drawResult(ctx,fighters[roundWinner]);
    else{
      drawArena(ctx,t);
      hud(ctx,fighters[selected],fighters[enemy],hpA,hpB,time,round);
      drawPhotoLikeFighter(ctx,fighters[enemy],xB,183,frame+2,true,false);
      drawPhotoLikeFighter(ctx,fighters[selected],xA,183,frame,false,false);
      text(ctx,input.guard?"GUARD":"",xA,194,5,fighters[selected].accent,"center");
      text(ctx,"BURST",xA,203,5,input.burst?fighters[selected].accent:"#59646a","center");
      text(ctx,"A",xB,203,5,"#59646a","center");
    }
    raf=requestAnimationFrame(render);
  }
  raf=requestAnimationFrame(render);

  const resize=()=>{
    const box=root.querySelector<HTMLElement>(".freezzz-arena-screen");
    if(!box)return;
    const scale=Math.max(1,Math.floor(Math.min(box.clientWidth/W,box.clientHeight/H)));
    canvas.style.width=(W*scale)+"px";canvas.style.height=(H*scale)+"px";
  };
  const ro=new ResizeObserver(resize);ro.observe(root);resize();

  return ()=>{
    cancelAnimationFrame(raf);ro.disconnect();
    window.removeEventListener("keydown",keydown);window.removeEventListener("keyup",keyup);
    host.innerHTML="";
  };
}
