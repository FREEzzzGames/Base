import "./spark-console.css";

const frame=document.querySelector<HTMLIFrameElement>("#spark-game");
const pad=document.querySelector<HTMLElement>("#shinobi-pad");
const thumb=document.querySelector<HTMLElement>(".move-thumb");
const held=new Set<string>();

function gameWindow():Window|null{return frame?.contentWindow||null}
function gameDocument():Document|null{try{return frame?.contentDocument||null}catch{return null}}
function keyEvent(key:string,down:boolean):void{
 const win=gameWindow();
 if(!win)return;
 if(down){
  if(held.has(key))return;
  held.add(key);
 }else{
  if(!held.has(key))return;
  held.delete(key);
 }
 const EventCtor=win.KeyboardEvent;
 win.dispatchEvent(new EventCtor(down?"keydown":"keyup",{key,bubbles:true,cancelable:true}));
}
function tapKey(key:string):void{keyEvent(key,true);keyEvent(key,false)}
function clickGame(selector:string):boolean{
 const el=gameDocument()?.querySelector<HTMLElement>(selector);
 if(!el)return false;
 el.click();
 return true;
}
function injectEmbeddedStyles():void{
 const doc=gameDocument();
 if(!doc||doc.getElementById("freezzz-console-embed-style"))return;
 const style=doc.createElement("style");
 style.id="freezzz-console-embed-style";
 style.textContent="html,body{width:100%!important;height:100%!important;overflow:hidden!important}.controls{display:none!important}#game{touch-action:none}";
 doc.head.appendChild(style);
}
frame?.addEventListener("load",injectEmbeddedStyles);
if(frame?.contentDocument?.readyState==="complete")injectEmbeddedStyles();

function action(name:string):void{
 switch(name){
  case "weapon-prev":tapKey("q");break;
  case "weapon-next":tapKey("r");break;
  case "shield":tapKey("e");break;
  case "blink":tapKey("Shift");break;
  case "jump":tapKey("ArrowUp");break;
  case "attack":keyEvent("j",true);break;
  case "menu":{
   const doc=gameDocument();
   if(!doc)return;
   const hub=doc.querySelector<HTMLElement>("#menu");
   if(hub&&!hub.classList.contains("hidden")){
    if(clickGame('[data-goto="characters"]'))break;
   }
   if(!clickGame("#pauseButton"))clickGame('[data-goto="characters"]');
   break;
  }
  case "start":{
   const doc=gameDocument();
   if(!doc)return;
   const visible=(selector:string)=>{const el=doc.querySelector<HTMLElement>(selector);return !!el&&!el.classList.contains("hidden")};
   if(visible("#menu")){
    const active=doc.querySelector<HTMLElement>(".hub-screen.active")?.dataset.screen;
    if(active==="characters"&&clickGame("#chooseCharacter"))break;
    if(active==="missions"&&clickGame("#missionStart"))break;
    if(clickGame("#start"))break;
    if(clickGame("#chooseCharacter"))break;
   }
   if(visible("#pauseMenu")&&clickGame("#pauseRestart"))break;
   if(visible("#over")&&clickGame("#retry"))break;
   if(visible("#win")&&clickGame("#again"))break;
   if(visible("#hud"))clickGame("#pauseButton");
   break;
  }
 }
}
document.querySelectorAll<HTMLButtonElement>("[data-action]").forEach(button=>{
 const name=button.dataset.action||"";
 if(name==="attack"){
  const down=(e:PointerEvent)=>{e.preventDefault();button.setPointerCapture(e.pointerId);keyEvent("j",true)};
  const up=(e:PointerEvent)=>{e.preventDefault();keyEvent("j",false)};
  button.addEventListener("pointerdown",down);button.addEventListener("pointerup",up);button.addEventListener("pointercancel",up);button.addEventListener("lostpointercapture",up);
 }else if(name==="jump"){
  const down=(e:PointerEvent)=>{e.preventDefault();button.setPointerCapture(e.pointerId);keyEvent("ArrowUp",true)};
  const up=(e:PointerEvent)=>{e.preventDefault();keyEvent("ArrowUp",false)};
  button.addEventListener("pointerdown",down);button.addEventListener("pointerup",up);button.addEventListener("pointercancel",up);button.addEventListener("lostpointercapture",up);
 }else button.addEventListener("click",()=>action(name));
});

if(pad){
 let pointer:number|null=null;
 const directions={left:false,right:false,jump:false};
 const setDirection=(key:string,on:boolean)=>{if(directions[key as keyof typeof directions]===on)return;directions[key as keyof typeof directions]=on;keyEvent(key==="left"?"ArrowLeft":key==="right"?"ArrowRight":"ArrowUp",on)};
 const update=(e:PointerEvent)=>{
  const r=pad.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);
  const radius=r.width*.34,len=Math.hypot(dx,dy)||1,k=Math.min(1,radius/len),x=dx*k,y=dy*k;
  setDirection("left",x/radius<-.22);setDirection("right",x/radius>.22);setDirection("jump",y/radius<-.62);
  if(thumb)thumb.style.transform="translate("+x+"px,"+y+"px)";
 };
 const stop=(e:PointerEvent)=>{if(pointer!==e.pointerId)return;pointer=null;setDirection("left",false);setDirection("right",false);setDirection("jump",false);if(thumb)thumb.style.transform="translate(0,0)"};
 pad.addEventListener("pointerdown",e=>{e.preventDefault();pointer=e.pointerId;pad.setPointerCapture(e.pointerId);update(e)});
 pad.addEventListener("pointermove",e=>{if(pointer===e.pointerId)update(e)});
 pad.addEventListener("pointerup",stop);pad.addEventListener("pointercancel",stop);pad.addEventListener("lostpointercapture",stop);
}
document.addEventListener("visibilitychange",()=>{if(document.hidden){for(const key of [...held])keyEvent(key,false)}});
