import { streams } from "./portal-ui";
import { liveEmbedUrl } from "./live-runtime";

type MiniId = "live" | "chat" | "radio";
type MiniWindow = { open:boolean; x:number; y:number; width:number; height:number; z:number };

const windows:Record<MiniId,MiniWindow> = {
  live:{open:false,x:60,y:70,width:300,height:205,z:30},
  chat:{open:false,x:80,y:290,width:286,height:245,z:40},
  radio:{open:false,x:50,y:555,width:330,height:72,z:50}
};
let nextZ=60;
let liveName=streams[0]?.name||"";
let liveSource:"twitch"|"youtube"="twitch";
let chat=[{author:"FREEzzzBot",message:"Добро пожаловать в FREEzzz."}];
let layer:HTMLDivElement|null=null;

function esc(s:string){return s.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]||c));}
function focus(id:MiniId){windows[id].z=nextZ++;}
function open(id:MiniId){windows[id].open=true;focus(id);render();}
function close(id:MiniId){windows[id].open=false;render();}
function toggle(id:MiniId){windows[id].open?close(id):open(id);}

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
        '<div class="portal-mw-live-body">'+(src?'<iframe src="'+esc(src)+'" title="'+esc(s.name)+'" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>':'LIVE unavailable')+'</div></section>');
    }
  }
  if(windows.chat.open){
    out.push('<section class="portal-mw portal-mw-chat" data-mw="chat" style="left:'+windows.chat.x+'px;top:'+windows.chat.y+'px;width:'+windows.chat.width+'px;height:'+windows.chat.height+'px;z-index:'+windows.chat.z+'">'+
      '<header class="portal-mw-head" data-mw-drag="chat"><strong>💬 CHAT</strong><button data-mw-close="chat">×</button></header>'+
      '<div class="portal-mw-chat-list">'+chat.slice(-8).map(m=>'<p><b>'+esc(m.author)+'</b><span>'+esc(m.message)+'</span></p>').join("")+'</div>'+
      '<form data-mw-chat-form><input data-mw-chat-input placeholder="Сообщение…" autocomplete="off"><button>↗</button></form></section>');
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
    const id=h.dataset.mwDrag as MiniId,w=windows[id],sx=e.clientX,sy=e.clientY,ox=w.x,oy=w.y;
    const move=(ev:PointerEvent)=>{
      w.x=Math.max(4,Math.min(window.innerWidth-w.width-4,ox+ev.clientX-sx));
      w.y=Math.max(4,Math.min(window.innerHeight-w.height-70,oy+ev.clientY-sy));
      const el=layer?.querySelector<HTMLElement>('[data-mw="'+id+'"]');
      if(el){el.style.left=w.x+"px";el.style.top=w.y+"px";}
    };
    const end=()=>{h.removeEventListener("pointermove",move);h.removeEventListener("pointerup",end);};
    h.addEventListener("pointermove",move);h.addEventListener("pointerup",end);
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

function addHudButton(){
  document.querySelectorAll<HTMLElement>(".portal-toolbar").forEach(toolbar=>{
    if(toolbar.querySelector("[data-mw-hud]"))return;
    const b=document.createElement("button");
    b.type="button";b.className="portal-mw-hud-toggle";b.dataset.mwHud="1";b.textContent="‹";
    b.onclick=()=>{
      const w=toolbar.closest(".portal-workspace");if(!w)return;
      const collapsed=w.classList.toggle("portal-workspace-hud-collapsed");
      b.textContent=collapsed?"›":"‹";
    };
    toolbar.append(b);
  });
}

function intercept(){
  document.addEventListener("click",e=>{
    const el=(e.target as HTMLElement).closest<HTMLElement>("[data-view]");
    if(!el)return;
    const id=el.dataset.view as MiniId;
    if(id!=="live"&&id!=="chat"&&id!=="radio")return;
    e.preventDefault();e.stopImmediatePropagation();
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
  addHudButton();
  new MutationObserver(addHudButton).observe(document.body,{childList:true,subtree:true});
  render();
}
if(document.readyState==="loading")window.addEventListener("DOMContentLoaded",initMultiWindowPortal,{once:true});
else queueMicrotask(initMultiWindowPortal);
