import { streams } from "./portal-ui";
import { liveEmbedUrl } from "./live-runtime";

type MiniId = "live" | "chat" | "radio";
type ResizeDir = "n"|"e"|"s"|"w"|"ne"|"nw"|"se"|"sw";
type MiniWindow = { open:boolean; x:number; y:number; width:number; height:number; z:number; minWidth:number; minHeight:number };

const windows:Record<MiniId,MiniWindow> = {
  live:{open:false,x:60,y:70,width:300,height:205,z:30,minWidth:220,minHeight:150},
  chat:{open:false,x:80,y:290,width:286,height:245,z:40,minWidth:220,minHeight:170},
  radio:{open:false,x:50,y:555,width:330,height:72,z:50,minWidth:210,minHeight:64}
};
let nextZ=60;
let liveName=streams[0]?.name||"";
let liveSource:"twitch"|"youtube"="twitch";
let chat=[{author:"FREEzzzBot",message:"Добро пожаловать в FREEzzz."}];
type ChatMessage={author:string;message:string};
let layer:HTMLDivElement|null=null;

function esc(s:string){return s.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]||c));}
function focus(id:MiniId){windows[id].z=nextZ++;}
function open(id:MiniId){windows[id].open=true;focus(id);render();}
function close(id:MiniId){windows[id].open=false;render();}
function toggle(id:MiniId){windows[id].open?close(id):open(id);}
function resizeHandles(id:MiniId){
  return ["n","e","s","w","ne","nw","se","sw"].map(dir=>'<span class="portal-mw-resize portal-mw-resize-'+dir+'" data-mw-resize="'+id+'" data-resize-dir="'+dir+'"></span>').join("");
}
function resizeWindow(id:MiniId,dir:ResizeDir,startX:number,startY:number,startW:number,startH:number,startLeft:number,startTop:number,evX:number,evY:number){
  const w=windows[id];
  const dx=evX-startX,dy=evY-startY;
  const minW=w.minWidth,minH=w.minHeight;
  const maxW=Math.max(minW,window.innerWidth-8);
  const maxH=Math.max(minH,window.innerHeight-78);
  let width=startW,height=startH,left=startLeft,top=startTop;
  if(dir.includes("e"))width=Math.min(maxW,Math.max(minW,startW+dx));
  if(dir.includes("s"))height=Math.min(maxH,Math.max(minH,startH+dy));
  if(dir.includes("w")){const next=Math.min(maxW,Math.max(minW,startW-dx));width=next;left=startLeft+(startW-next);}
  if(dir.includes("n")){const next=Math.min(maxH,Math.max(minH,startH-dy));height=next;top=startTop+(startH-next);}
  left=Math.max(4,Math.min(Math.max(4,window.innerWidth-width-4),left));
  top=Math.max(4,Math.min(Math.max(4,window.innerHeight-height-70),top));
  w.width=width;w.height=height;w.x=left;w.y=top;
  const el=layer?.querySelector<HTMLElement>('[data-mw="'+id+'"]');
  if(el){el.style.width=width+"px";el.style.height=height+"px";el.style.left=left+"px";el.style.top=top+"px";}
}

function render(){
  if(!layer)return;
  const out:string[]=[];
  if(windows.live.open){
    const s=streams.find(x=>x.name===liveName)||streams[0];
    if(s){
      const src=liveEmbedUrl(s,liveSource,window.location.hostname);
      out.push('<section class="portal-mw portal-mw-live" data-mw="live" style="left:'+windows.live.x+'px;top:'+windows.live.y+'px;width:'+windows.live.width+'px;height:'+windows.live.height+'px;z-index:'+windows.live.z+'">'+
        '<header class="portal-mw-head" data-mw-drag="live"><strong>📺 '+esc(s.name)+'</strong><div>'+
        '<button data-mw-source="twitch" class="'+(liveSource==="twitch"?"active":"")+'">T</button>'+
        '<button data-mw-source="youtube" class="'+(liveSource==="youtube"?"active":"")+'">Y</button>'+
        '<button data-mw-close="live">×</button></div></header>'+
        '<div class="portal-mw-live-body">'+(src?'<iframe src="'+esc(src)+'" title="'+esc(s.name)+'" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>':'LIVE unavailable')+'</div>'+resizeHandles("live")+'</section>');
    }
  }
  if(windows.chat.open){
    out.push('<section class="portal-mw portal-mw-chat" data-mw="chat" style="left:'+windows.chat.x+'px;top:'+windows.chat.y+'px;width:'+windows.chat.width+'px;height:'+windows.chat.height+'px;z-index:'+windows.chat.z+'">'+
      '<header class="portal-mw-head" data-mw-drag="chat"><strong>💬 CHAT</strong><button data-mw-close="chat">×</button></header>'+
      '<div class="portal-mw-chat-list">'+chat.slice(-8).map(m=>'<p><b>'+esc(m.author)+'</b><span>'+esc(m.message)+'</span></p>').join("")+'</div>'+
      '<form data-mw-chat-form><input data-mw-chat-input placeholder="Сообщение…" autocomplete="off"><button>↗</button></form>'+resizeHandles("chat")+'</section>');
  }
  if(windows.radio.open){
    out.push('<section class="portal-mw portal-mw-radio" data-mw="radio" style="left:'+windows.radio.x+'px;top:'+windows.radio.y+'px;width:'+windows.radio.width+'px;height:'+windows.radio.height+'px;z-index:'+windows.radio.z+'">'+
      '<header class="portal-mw-head" data-mw-drag="radio"><strong>🎵 RADIO</strong><button data-mw-close="radio">×</button></header>'+
      '<div class="portal-mw-radio-body"><span>RADIO</span><div><button data-mw-radio="play">▶</button><button data-mw-radio="pause">Ⅱ</button><button data-mw-radio="stop">■</button></div></div></section>');
  }
  layer.innerHTML=out.join("");
  bind();
}

function bind(){
  layer?.querySelectorAll<HTMLElement>("[data-mw-close]").forEach(b=>b.onclick=()=>close(b.dataset.mwClose as MiniId));
  layer?.querySelectorAll<HTMLElement>("[data-mw-source]").forEach(b=>b.onclick=()=>{
    liveSource=b.dataset.mwSource==="youtube"?"youtube":"twitch";render();
  });
  layer?.querySelectorAll<HTMLElement>("[data-mw]").forEach(e=>e.onpointerdown=()=>focus(e.dataset.mw as MiniId));
  layer?.querySelectorAll<HTMLElement>("[data-mw-drag]").forEach(h=>h.onpointerdown=e=>{
    if((e.target as HTMLElement).closest("button"))return;
    const id=h.dataset.mwDrag as MiniId,w=windows[id];
    const pointer=e as PointerEvent;
    const sx=pointer.clientX,sy=pointer.clientY,ox=w.x,oy=w.y;
    try{h.setPointerCapture(pointer.pointerId);}catch{}
    const move=(ev:PointerEvent)=>{
      const maxX=Math.max(4,window.innerWidth-w.width-4);
      const maxY=Math.max(4,window.innerHeight-w.height-70);
      w.x=Math.max(4,Math.min(maxX,ox+ev.clientX-sx));
      w.y=Math.max(4,Math.min(maxY,oy+ev.clientY-sy));
      const el=layer?.querySelector<HTMLElement>('[data-mw="'+id+'"]');
      if(el){el.style.left=w.x+"px";el.style.top=w.y+"px";}
    };
    const end=()=>{
      h.removeEventListener("pointermove",move);
      h.removeEventListener("pointerup",end);
      h.removeEventListener("pointercancel",end);
      try{h.releasePointerCapture(pointer.pointerId);}catch{}
    };
    h.addEventListener("pointermove",move);
    h.addEventListener("pointerup",end);
    h.addEventListener("pointercancel",end);
  });
  layer?.querySelectorAll<HTMLElement>("[data-mw-resize]").forEach(h=>h.onpointerdown=e=>{
    e.preventDefault();e.stopPropagation();
    const id=h.dataset.mwResize as MiniId,dir=h.dataset.resizeDir as ResizeDir,w=windows[id],pointer=e as PointerEvent;
    focus(id);
    const sx=pointer.clientX,sy=pointer.clientY,sw=w.width,sh=w.height,sl=w.x,st=w.y;
    try{h.setPointerCapture(pointer.pointerId);}catch{}
    const move=(ev:PointerEvent)=>resizeWindow(id,dir,sx,sy,sw,sh,sl,st,ev.clientX,ev.clientY);
    const end=()=>{h.removeEventListener("pointermove",move);h.removeEventListener("pointerup",end);h.removeEventListener("pointercancel",end);try{h.releasePointerCapture(pointer.pointerId);}catch{}};
    h.addEventListener("pointermove",move);h.addEventListener("pointerup",end);h.addEventListener("pointercancel",end);
  });
  layer?.querySelector<HTMLElement>("[data-mw-chat-form]")?.addEventListener("submit",e=>{
    e.preventDefault();
    const i=layer?.querySelector<HTMLInputElement>("[data-mw-chat-input]"),m=i?.value.trim()||"";
    if(!m)return;
    chat.push({author:"You",message:m});chat=chat.slice(-50);render();
  });
  layer?.querySelectorAll<HTMLElement>("[data-mw-radio]").forEach(b=>b.onclick=()=>{
    window.dispatchEvent(new CustomEvent("freezzz:radio-mini",{detail:{action:b.dataset.mwRadio||"play"}}));
  });
}


function intercept(){
  document.addEventListener("click",e=>{
    const el=(e.target as HTMLElement).closest<HTMLElement>("[data-view]");
    if(!el)return;
    const id=el.dataset.view as MiniId;
    if(id!=="live"&&id!=="chat"&&id!=="radio")return;

    // HOME cards open floating mini windows; HUD navigation keeps the
    // original full-screen route behavior.
    if(el.closest(".portal-toolbar")){
      windows[id].open=false;
      render();
      return;
    }

    e.preventDefault();
    e.stopImmediatePropagation();
    if(id==="live"&&!liveName)liveName=streams[0]?.name||"";
    toggle(id);
  },true);
}

export function initMultiWindowPortal(){
  if(layer)return;
  layer=document.createElement("div");
  layer.className="portal-mw-layer";
  document.body.append(layer);
  intercept();
  window.addEventListener("freezzz:chat-sync",event=>{
    const messages=(event as CustomEvent<{messages?:ChatMessage[]}>).detail?.messages;
    if(!Array.isArray(messages))return;
    chat=messages.slice(-50).map(m=>({author:String(m.author||""),message:String(m.message||"")}));
    if(windows.chat.open)render();
  });
  const clampWindows=()=>{
    (Object.keys(windows) as MiniId[]).forEach(id=>{
      const w=windows[id];
      w.x=Math.max(4,Math.min(Math.max(4,window.innerWidth-w.width-4),w.x));
      w.y=Math.max(4,Math.min(Math.max(4,window.innerHeight-w.height-70),w.y));
    });
    render();
  };
  window.addEventListener("resize",clampWindows,{passive:true});
  render();
}
if(document.readyState==="loading")window.addEventListener("DOMContentLoaded",initMultiWindowPortal,{once:true});
else queueMicrotask(initMultiWindowPortal);
