import type { PortalView } from "./core/portal-core";

export interface LayoutOverride{
  width:number;
  height:number;
  x:number;
  y:number;
  order:number;
}

export interface LayoutBlockInfo extends LayoutOverride{
  key:string;
  label:string;
  view:PortalView;
}

export const DEV_LAYOUT_KEY="freezzz:dev-layout:v1";

export const PORTAL_EDITABLE_BLOCKS:Record<PortalView,readonly string[]>={
  home:["hero","live","chat","game","radio","library"],
  live:["header","streams"],
  chat:["header","messages","composer"],
  game:["header","game","controls"],
  radio:["header","carousel","nowplaying","search","genres"],
  library:["content"]
};

export function loadLayoutOverrides():Record<string,LayoutOverride>{
  try{return JSON.parse(localStorage.getItem(DEV_LAYOUT_KEY)||"{}") as Record<string,LayoutOverride>;}
  catch{return {};}
}

export function saveLayoutOverrides(overrides:Record<string,LayoutOverride>):void{
  try{localStorage.setItem(DEV_LAYOUT_KEY,JSON.stringify(overrides));}catch{}
}

export function defaultLayoutOverride():LayoutOverride{
  return {width:100,height:0,x:0,y:0,order:0};
}

export function getLayoutOverride(overrides:Record<string,LayoutOverride>,key:string):LayoutOverride{
  return overrides[key]||defaultLayoutOverride();
}

export function getLayoutBlockInfos(view:PortalView,overrides:Record<string,LayoutOverride>):LayoutBlockInfo[]{
  return PORTAL_EDITABLE_BLOCKS[view].map(block=>{
    const key=view+":"+block;
    return {key,label:block.toUpperCase(),view,...getLayoutOverride(overrides,key)};
  });
}

export function applyLayout(
  view:PortalView,
  developerMode:boolean,
  overrides:Record<string,LayoutOverride>,
  root:ParentNode=document
):void{
  root.querySelectorAll<HTMLElement>("[data-portal-block]").forEach((el,index)=>{
    const block=el.dataset.portalBlock||String(index);
    const value=getLayoutOverride(overrides,view+":"+block);
    if(!developerMode){
      el.style.removeProperty("width");
      el.style.removeProperty("height");
      el.style.removeProperty("transform");
      el.style.removeProperty("order");
      delete el.dataset.devEditable;
      return;
    }
    el.dataset.devEditable="true";
    el.style.width=value.width===100?"":value.width+"%";
    el.style.height=value.height>0?value.height+"px":"";
    el.style.transform=(value.x||value.y)?"translate("+value.x+"px,"+value.y+"px)": "";
    el.style.order=String(value.order);
  });
}
