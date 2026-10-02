import type { PortalView } from "./core/portal-core";

const ORDER:PortalView[]=["home","live","chat","game","radio","library"];

const SWIPE_MIN_DISTANCE=56;
const SWIPE_MAX_TIME=650;
const SWIPE_AXIS_RATIO=1.35;

function isSwipeExcluded(target:EventTarget|null):boolean{
  return target instanceof Element && Boolean(
    target.closest(
      "button,a,input,textarea,select,option,[contenteditable="true"]," +
      ".topbar,.bottom-nav,.live-popup-overlay,.live-popup,[data-no-swipe]"
    )
  );
}

export function bindPortalSwipeNavigation(
  root:HTMLElement,
  view:PortalView,
  onNavigate:(view:PortalView)=>void
):void{
  if(root.dataset.swipeBound==="true")return;
  root.dataset.swipeBound="true";
  root.setAttribute("data-touch-navigation","true");

  let startX=0;
  let startY=0;
  let startTime=0;
  let pointerId:number|null=null;
  let tracking=false;

  const reset=()=>{
    pointerId=null;
    tracking=false;
  };

  root.addEventListener("pointerdown",e=>{
    if(e.pointerType==="mouse"&&e.button!==0)return;
    if(e.pointerType==="touch"&&e.isPrimary===false)return;
    if(isSwipeExcluded(e.target))return;

    const target=e.target as Element|null;
    if(target?.closest(".bottom-nav,.topbar"))return;

    pointerId=e.pointerId;
    startX=e.clientX;
    startY=e.clientY;
    startTime=Date.now();
    tracking=true;

    try{root.setPointerCapture(e.pointerId);}catch{}
  },{passive:true});

  root.addEventListener("pointercancel",e=>{
    if(pointerId===e.pointerId)reset();
  },{passive:true});

  root.addEventListener("lostpointercapture",e=>{
    if(pointerId===e.pointerId)reset();
  },{passive:true});

  root.addEventListener("pointerup",e=>{
    if(!tracking||pointerId!==e.pointerId)return;

    const dx=e.clientX-startX;
    const dy=e.clientY-startY;
    const dt=Date.now()-startTime;
    reset();

    if(dt>SWIPE_MAX_TIME)return;
    if(Math.abs(dx)<SWIPE_MIN_DISTANCE)return;
    if(Math.abs(dx)<Math.abs(dy)*SWIPE_AXIS_RATIO)return;

    const index=ORDER.indexOf(view);
    if(index<0)return;

    const nextIndex=dx<0
      ?Math.min(ORDER.length-1,index+1)
      :Math.max(0,index-1);

    if(nextIndex!==index)onNavigate(ORDER[nextIndex]);
  },{passive:true});
}
