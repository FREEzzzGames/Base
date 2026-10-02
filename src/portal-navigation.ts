import type { PortalView } from "./core/portal-core";

const ORDER:PortalView[]=["home","live","chat","game","radio","library"];

export function bindPortalSwipeNavigation(
  root:HTMLElement,
  view:PortalView,
  onNavigate:(view:PortalView)=>void
):void{
  if(root.dataset.swipeBound==="true")return;
  root.dataset.swipeBound="true";
  let startX=0,startY=0,startTime=0,pointerId:number|null=null;
  root.addEventListener("pointerdown",e=>{
    if(e.pointerType==="mouse"&&e.button!==0)return;
    const target=e.target as HTMLElement;
    if(target.closest("input,textarea,button,a,select"))return;
    startX=e.clientX;startY=e.clientY;startTime=Date.now();pointerId=e.pointerId;
  },{passive:true});
  root.addEventListener("pointerup",e=>{
    if(pointerId!==e.pointerId)return;
    pointerId=null;
    const dx=e.clientX-startX,dy=e.clientY-startY,dt=Date.now()-startTime;
    if(dt>650||Math.abs(dx)<64||Math.abs(dx)<Math.abs(dy)*1.35)return;
    const index=ORDER.indexOf(view);
    if(index<0)return;
    const nextIndex=dx<0?Math.min(ORDER.length-1,index+1):Math.max(0,index-1);
    if(nextIndex!==index)onNavigate(ORDER[nextIndex]);
  },{passive:true});
}
