import "./cargo-deck.css";
import "./cargo-deck-retro.css";
import { mountCargoDeck, cargoDeckAction, cargoDeckSetMovement, cargoDeckSetFire } from "./cargo-deck-game";

const host=document.querySelector<HTMLElement>("#cargo-game");
if(host)mountCargoDeck(host);

const webApp=(window as Window & {Telegram?:{WebApp?:{ready?:()=>void;expand?:()=>void;disableVerticalSwipes?:()=>void}}}).Telegram?.WebApp;
webApp?.ready?.();
webApp?.expand?.();
webApp?.disableVerticalSwipes?.();

document.querySelectorAll<HTMLButtonElement>("[data-action]").forEach(button=>{
 const action=button.dataset.action||"";
 if(action==="attack"){
  const down=(e:PointerEvent)=>{e.preventDefault();button.setPointerCapture(e.pointerId);cargoDeckSetFire(true)};
  const up=()=>cargoDeckSetFire(false);
  button.addEventListener("pointerdown",down);
  button.addEventListener("pointerup",up);
  button.addEventListener("pointercancel",up);
  button.addEventListener("lostpointercapture",up);
 }else button.addEventListener("click",()=>cargoDeckAction(action));
});

const pad=document.querySelector<HTMLElement>(".move-pad");
const thumb=document.querySelector<HTMLElement>(".move-thumb");
if(pad){
 let pointer:number|null=null;
 const update=(e:PointerEvent)=>{
  const r=pad.getBoundingClientRect();
  const dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);
  const radius=r.width*.34,len=Math.hypot(dx,dy)||1,k=Math.min(1,radius/len),x=dx*k,y=dy*k;
  cargoDeckSetMovement(x/radius,y/radius);
  if(thumb)thumb.style.transform="translate("+x+"px,"+y+"px)";
 };
 const stop=(e:PointerEvent)=>{
  if(pointer===e.pointerId){pointer=null;cargoDeckSetMovement(0,0);if(thumb)thumb.style.transform="translate(0,0)"}
 };
 pad.addEventListener("pointerdown",e=>{e.preventDefault();pointer=e.pointerId;pad.setPointerCapture(e.pointerId);update(e)});
 pad.addEventListener("pointermove",e=>{if(pointer===e.pointerId)update(e)});
 pad.addEventListener("pointerup",stop);
 pad.addEventListener("pointercancel",stop);
 pad.addEventListener("lostpointercapture",stop);
}
