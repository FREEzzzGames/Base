export type HomeBlockId="hero"|"live"|"chat"|"game"|"radio"|"library";
export type SplitDirection="row"|"column";
export type HomeLayoutNode=
  | {type:"leaf";id:HomeBlockId}
  | {type:"split";direction:SplitDirection;ratio:number;first:HomeLayoutNode;second:HomeLayoutNode};

export type HomeLayoutMode="desktop"|"mobile";
export interface HomeLayoutState{
  version:1;
  desktop:HomeLayoutNode;
  mobile:HomeLayoutNode;
}

const STORAGE_KEY="freezzz:home-layout:v1";
const BLOCKS:HomeBlockId[]=["hero","live","chat","game","radio","library"];

const leaf=(id:HomeBlockId):HomeLayoutNode=>({type:"leaf",id});
const split=(direction:SplitDirection,ratio:number,first:HomeLayoutNode,second:HomeLayoutNode):HomeLayoutNode=>({
  type:"split",direction,ratio:clampRatio(ratio),first,second
});

function clampRatio(value:number):number{
  return Math.max(.12,Math.min(.88,Number.isFinite(value)?value:.5));
}

function defaultDesktop():HomeLayoutNode{
  const liveChat=split("row",.5,leaf("live"),leaf("chat"));
  const gameRadio=split("row",.5,leaf("game"),leaf("radio"));
  const lower=split("column",30/88,liveChat,split("column",21/58,gameRadio,leaf("library")));
  return split("column",.12,leaf("hero"),lower);
}

function defaultMobile():HomeLayoutNode{
  let node:HomeLayoutNode=leaf("hero");
  const ratios=[.22,.17,.17,.17,.27];
  for(let i=0;i<5;i++) node=split("column",ratios[i],node,leaf(BLOCKS[i+1]));
  return node;
}

export function defaultHomeLayout():HomeLayoutState{
  return {version:1,desktop:defaultDesktop(),mobile:defaultMobile()};
}

export function cloneHomeLayout(node:HomeLayoutNode):HomeLayoutNode{
  return node.type==="leaf"
    ? {type:"leaf",id:node.id}
    : {type:"split",direction:node.direction,ratio:node.ratio,first:cloneHomeLayout(node.first),second:cloneHomeLayout(node.second)};
}

export function loadHomeLayout():HomeLayoutState{
  const fallback=defaultHomeLayout();
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    if(!raw)return fallback;
    const parsed=JSON.parse(raw) as HomeLayoutState;
    if(parsed?.version!==1||!validLayout(parsed.desktop)||!validLayout(parsed.mobile))return fallback;
    return parsed;
  }catch{return fallback;}
}

export function saveHomeLayout(state:HomeLayoutState):void{
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch{}
}

function validLayout(node:HomeLayoutNode):boolean{
  if(!node||typeof node!=="object")return false;
  const ids:HomeBlockId[]=[];
  function walk(n:HomeLayoutNode):boolean{
    if(n.type==="leaf"){
      if(!BLOCKS.includes(n.id)||ids.includes(n.id))return false;
      ids.push(n.id);
      return true;
    }
    if(n.type!=="split"||(n.direction!=="row"&&n.direction!=="column"))return false;
    if(!Number.isFinite(n.ratio)||n.ratio<=.05||n.ratio>=.95)return false;
    return walk(n.first)&&walk(n.second);
  }
  return walk(node)&&ids.length===BLOCKS.length;
}

export interface HomeLayoutRect{
  id:HomeBlockId;
  x:number;
  y:number;
  width:number;
  height:number;
}

export function layoutRects(node:HomeLayoutNode,x=0,y=0,width=100,height=100,out:HomeLayoutRect[]=[]):HomeLayoutRect[]{
  if(node.type==="leaf"){
    out.push({id:node.id,x,y,width,height});
    return out;
  }
  const ratio=clampRatio(node.ratio);
  if(node.direction==="row"){
    const firstWidth=width*ratio;
    layoutRects(node.first,x,y,firstWidth,height,out);
    layoutRects(node.second,x+firstWidth,y,width-firstWidth,height,out);
  }else{
    const firstHeight=height*ratio;
    layoutRects(node.first,x,y,width,firstHeight,out);
    layoutRects(node.second,x,y+firstHeight,width,height-firstHeight,out);
  }
  return out;
}

export function findLayoutLeaf(node:HomeLayoutNode,id:HomeBlockId):HomeLayoutNode|undefined{
  if(node.type==="leaf")return node.id===id?node:undefined;
  return findLayoutLeaf(node.first,id)||findLayoutLeaf(node.second,id);
}

export function swapHomeBlocks(node:HomeLayoutNode,a:HomeBlockId,b:HomeBlockId):HomeLayoutNode{
  if(a===b)return cloneHomeLayout(node);
  const cloned=cloneHomeLayout(node);
  function walk(n:HomeLayoutNode):void{
    if(n.type==="leaf"){
      if(n.id===a)n.id=b;
      else if(n.id===b)n.id=a;
      return;
    }
    walk(n.first);walk(n.second);
  }
  walk(cloned);
  return cloned;
}

function contains(node:HomeLayoutNode,id:HomeBlockId):boolean{
  return Boolean(findLayoutLeaf(node,id));
}

export type ResizeEdge="left"|"right"|"top"|"bottom";

export function resizeHomeBoundary(node:HomeLayoutNode,id:HomeBlockId,edge:ResizeEdge,delta:number):HomeLayoutNode{
  const cloned=cloneHomeLayout(node);
  function walk(n:HomeLayoutNode):boolean{
    if(n.type==="leaf")return false;
    const axis:SplitDirection=edge==="left"||edge==="right"?"row":"column";
    if(n.direction===axis){
      const firstHas=contains(n.first,id);
      const secondHas=contains(n.second,id);
      if(firstHas!==secondHas){
        const positive=(edge==="right"&&firstHas)||(edge==="left"&&secondHas)||(edge==="bottom"&&firstHas)||(edge==="top"&&secondHas);
        if(positive){
          n.ratio=clampRatio(n.ratio+delta);
          return true;
        }
      }
    }
    return walk(n.first)||walk(n.second);
  }
  walk(cloned);
  return cloned;
}

export function firstBlock(node:HomeLayoutNode):HomeBlockId{
  if(node.type==="leaf")return node.id;
  return firstBlock(node.first);
}
