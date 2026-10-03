export function bindUniversalPortalPress():void{
  const selector='button,[role="button"],[data-view],[data-url]';
  const doc=document as Document & {_freezzzUniversalPress?:boolean};
  if(doc._freezzzUniversalPress)return;
  doc._freezzzUniversalPress=true;
  let active:HTMLElement|null=null;
  let activePointerId:number|null=null;
  const pressable=(target:EventTarget|null):HTMLElement|null=>{
    if(!(target instanceof HTMLElement))return null;
    const element=target.closest<HTMLElement>(selector);
    if(!element||element.hasAttribute("disabled")||element.getAttribute("aria-disabled")==="true")return null;
    return element;
  };
  const release=(element?:HTMLElement)=>{
    const target=element||active;
    if(!target)return;
    delete target.dataset.portalPressed;
    if(!element||active===element){active=null;activePointerId=null;}
  };
  const press=(element:HTMLElement,pointerId:number|null=null)=>{
    if(active&&active!==element)release();
    active=element;activePointerId=pointerId;element.dataset.portalPressed="true";
  };
  document.addEventListener("pointerdown",e=>{
    if(e.pointerType==="mouse"&&e.button!==0)return;
    const element=pressable(e.target);
    if(element)press(element,e.pointerId);
  },{passive:true});
  document.addEventListener("pointerup",e=>{
    if(activePointerId===null||e.pointerId===activePointerId)release();
  },{passive:true});
  document.addEventListener("pointercancel",e=>{
    if(activePointerId===null||e.pointerId===activePointerId)release();
  },{passive:true});
  document.addEventListener("pointerleave",e=>{
    if(activePointerId===null||e.pointerId===activePointerId)release();
  },{passive:true});
  document.addEventListener("keydown",e=>{
    if((e.key!=="Enter"&&e.key!==" ")||e.repeat)return;
    const element=pressable(e.target);
    if(element)press(element);
  });
  document.addEventListener("keyup",e=>{
    if(e.key!=="Enter"&&e.key!==" ")return;
    const element=pressable(e.target);
    element?release(element):release();
  });
}
