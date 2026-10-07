import { streams } from "./portal-ui";
import { liveEmbedUrl } from "./live-runtime";

type MiniId = "live" | "chat" | "radio";
type MiniWindow = { open:boolean; x:number; y:number; width:number; height:number; z:number; minWidth:number; minHeight:number };

const windows:Record<MiniId,MiniWindow> = {
  live:{open:false,x:60,y:70,width:300,height:205,z:30,minWidth:220,minHeight:150},
  chat:{open:false,x:48,y:250,width:340,height:360,z:40,minWidth:250,minHeight:220},
  radio:{open:false,x:50,y:555,width:330,height:72,z:50,minWidth:210,minHeight:64}
};
let nextZ=60;
let liveName=streams[0]?.name||"";
let liveSource:"twitch"|"youtube"="twitch";
type TelegramPopupChat={id:string;title:string;kind:string;username?:string;lastMessage?:{text:string;date:string;outgoing:boolean}};
type TelegramPopupMessage={id:string;senderName:string;text:string;date:string;outgoing:boolean};
let telegramPopupChat:TelegramPopupChat|null=null;
let telegramPopupMessages:TelegramPopupMessage[]=[];
const expandedTelegramPopupMessages=new Set<string>();
function popupMessageText(message:TelegramPopupMessage):string{
  const text=message.text||"";
  if(text.length<=200||expandedTelegramPopupMessages.has(message.id))return esc(text);
  return esc(text.slice(0,200))+"…";
}
function popupMessageExpandControl(message:TelegramPopupMessage):string{
  if((message.text||"").length<=200)return "";
  const expanded=expandedTelegramPopupMessages.has(message.id);
  return '<button class="portal-mw-chat-expand" type="button" data-mw-chat-expand="'+esc(message.id)+'" aria-expanded="'+expanded+'">'+(expanded?"Свернуть":"Развернуть")+'</button>';
}
const LAST_CHAT_KEY="freezzz:telegram:last-chat";
function loadLastChatId():string{
  try{return localStorage.getItem(LAST_CHAT_KEY)||"";}catch{return "";}
}
function syncTelegramPopup(detail?:{chat?:TelegramPopupChat|null;messages?:TelegramPopupMessage[]}){
  if(detail?.chat!==undefined&&detail.chat?.id!==telegramPopupChat?.id)expandedTelegramPopupMessages.clear();
  if(detail?.chat!==undefined)telegramPopupChat=detail.chat;
  if(Array.isArray(detail?.messages))telegramPopupMessages=detail.messages.slice(-10);
  if(telegramPopupChat?.id){
    try{localStorage.setItem(LAST_CHAT_KEY,telegramPopupChat.id);}catch{}
  }
  if(windows.chat.open)render();
}
let layer:HTMLDivElement|null=null;

function esc(s:string){return s.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]||c));}
function focus(id:MiniId){windows[id].z=nextZ++;}
function fitWindow(id:MiniId){
  const w=windows[id];
  const maxWidth=Math.max(w.minWidth,window.innerWidth-8);
  const maxHeight=Math.max(w.minHeight,window.innerHeight-16);
  w.width=Math.min(Math.max(w.width,w.minWidth),maxWidth);
  w.height=Math.min(Math.max(w.height,w.minHeight),maxHeight);
  w.x=Math.max(4,Math.min(Math.max(4,window.innerWidth-w.width-4),w.x));
  w.y=Math.max(4,Math.min(Math.max(4,window.innerHeight-w.height-8),w.y));
}
function open(id:MiniId){
  fitWindow(id);
  windows[id].open=true;
  focus(id);
  if(id==="chat")window.dispatchEvent(new CustomEvent("freezzz:telegram-chat-request",{detail:{chatId:loadLastChatId()}}));
  render();
}
function close(id:MiniId){windows[id].open=false;render();}
function toggle(id:MiniId){windows[id].open?close(id):open(id);}
function resizeHandle(id:MiniId){
  return '<span class="portal-mw-resize portal-mw-resize-se" data-mw-resize="'+id+'" aria-hidden="true"></span>';
}
function resizeWindow(id:MiniId,startX:number,startY:number,startW:number,startH:number,evX:number,evY:number){
  const w=windows[id];
  const width=Math.min(
    Math.max(w.minWidth,startW+(evX-startX)),
    Math.max(w.minWidth,window.innerWidth-8)
  );
  const height=Math.min(
    Math.max(w.minHeight,startH+(evY-startY)),
    Math.max(w.minHeight,window.innerHeight-16)
  );
  w.width=width;
  w.height=height;
  const el=layer?.querySelector<HTMLElement>('[data-mw="'+id+'"]');
  if(el){
    el.style.width=width+"px";
    el.style.height=height+"px";
  }
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
        '<div class="portal-mw-live-body">'+(src?'<iframe src="'+esc(src)+'" title="'+esc(s.name)+'" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>':'LIVE unavailable')+'</div>'+resizeHandle("live")+'</section>');
    }
  }
  if(windows.chat.open){
    out.push('<section class="portal-mw portal-mw-chat" data-mw="chat" style="left:'+windows.chat.x+'px;top:'+windows.chat.y+'px;width:'+windows.chat.width+'px;height:'+windows.chat.height+'px;z-index:'+windows.chat.z+'">'+
      '<header class="portal-mw-head" data-mw-drag="chat"><strong>💬 '+esc(telegramPopupChat?.title||"CHAT")+'</strong><div><button data-mw-chat-open type="button" title="Открыть CHAT">↗</button><button data-mw-close="chat">×</button></div></header>'+
      '<div class="portal-mw-chat-list">'+(telegramPopupMessages.length
        ? telegramPopupMessages.map(m=>'<p class="'+(m.outgoing?"outgoing":"")+'" data-mw-chat-message-key="'+esc(m.id)+'"><b>'+esc(m.senderName)+'</b><span>'+popupMessageText(m)+'</span>'+popupMessageExpandControl(m)+'</p>').join("")
        : '<div class="portal-mw-chat-empty">'+esc(telegramPopupChat?"Нет сообщений":"Откройте CHAT и выберите диалог")+'</div>')+'</div>'+
      '<form data-mw-chat-form><input data-mw-chat-input type="text" inputmode="text" enterkeyhint="send" placeholder="Сообщение…" autocomplete="off" autocapitalize="sentences" spellcheck="true"><button type="submit">↗</button></form>'+resizeHandle("chat")+'</section>');
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
      const maxY=Math.max(4,window.innerHeight-w.height-8);
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
    const id=h.dataset.mwResize as MiniId,w=windows[id],pointer=e as PointerEvent;
    focus(id);
    const sx=pointer.clientX,sy=pointer.clientY,sw=w.width,sh=w.height;
    try{h.setPointerCapture(pointer.pointerId);}catch{}
    const move=(ev:PointerEvent)=>resizeWindow(id,sx,sy,sw,sh,ev.clientX,ev.clientY);
    const end=()=>{h.removeEventListener("pointermove",move);h.removeEventListener("pointerup",end);h.removeEventListener("pointercancel",end);try{h.releasePointerCapture(pointer.pointerId);}catch{}};
    h.addEventListener("pointermove",move);h.addEventListener("pointerup",end);h.addEventListener("pointercancel",end);
  });
  layer?.querySelectorAll<HTMLElement>("[data-mw-chat-expand]").forEach(button=>button.addEventListener("click",e=>{
    e.preventDefault();e.stopPropagation();
    const id=(e.currentTarget as HTMLElement).dataset.mwChatExpand||"";
    if(!id)return;
    const list=layer?.querySelector<HTMLElement>(".portal-mw-chat-list");
    const messageEl=(e.currentTarget as HTMLElement).closest<HTMLElement>("[data-mw-chat-message-key]");
    const listRect=list?.getBoundingClientRect();
    const messageRect=messageEl?.getBoundingClientRect();
    const anchorOffset=listRect&&messageRect?messageRect.top-listRect.top:null;
    if(expandedTelegramPopupMessages.has(id))expandedTelegramPopupMessages.delete(id);else expandedTelegramPopupMessages.add(id);
    render();
    if(anchorOffset!==null){
      requestAnimationFrame(()=>{
        const nextList=layer?.querySelector<HTMLElement>(".portal-mw-chat-list");
        const nextMessage=nextList?.querySelector<HTMLElement>("[data-mw-chat-message-key=\""+CSS.escape(id)+"\"]");
        if(!nextList||!nextMessage)return;
        const nextListRect=nextList.getBoundingClientRect();
        const nextMessageRect=nextMessage.getBoundingClientRect();
        nextList.scrollTop+=nextMessageRect.top-nextListRect.top-anchorOffset;
      });
    }
  }));
  const popupInput=layer?.querySelector<HTMLInputElement>("[data-mw-chat-input]");
  popupInput?.addEventListener("pointerdown",e=>{e.stopPropagation();});
  popupInput?.addEventListener("click",e=>{e.stopPropagation();window.setTimeout(()=>popupInput.focus(),0);});
  layer?.querySelector<HTMLElement>("[data-mw-chat-form]")?.addEventListener("submit",e=>{
    e.preventDefault();
    const i=layer?.querySelector<HTMLInputElement>("[data-mw-chat-input]"),m=i?.value.trim()||"";
    if(!m||!telegramPopupChat?.id)return;
    window.dispatchEvent(new CustomEvent("freezzz:chat-send",{detail:{chatId:telegramPopupChat.id,text:m}}));
    if(i)i.value="";
  });
  layer?.querySelector<HTMLElement>("[data-mw-chat-open]")?.addEventListener("click",e=>{
    e.preventDefault();e.stopPropagation();
    window.dispatchEvent(new CustomEvent("freezzz:open-chat-selector"));
  });
  layer?.querySelectorAll<HTMLElement>("[data-mw-radio]").forEach(b=>b.onclick=()=>{
    window.dispatchEvent(new CustomEvent("freezzz:radio-mini",{detail:{action:b.dataset.mwRadio||"play"}}));
  });
}


function intercept(){
  document.addEventListener("click",e=>{
    const el=(e.target as HTMLElement).closest<HTMLElement>("[data-view]");
    if(!el)return;
    const id=el.dataset.view as "live"|"chat"|"radio"|"game"|"library";
    if(!["live","chat","radio","game","library"].includes(id))return;

    // HOME cards: LIVE/CHAT/RADIO open floating mini windows.
    // GAME/LIBRARY enter their full-screen route directly.
    if(el.closest(".portal-toolbar")){
      if(id==="live"||id==="chat"||id==="radio"){
        windows[id].open=false;
        render();
      }
      return;
    }

    e.preventDefault();
    e.stopImmediatePropagation();
    if(id==="game"||id==="library"){
      window.dispatchEvent(new CustomEvent("freezzz:navigate",{detail:{view:id}}));
      return;
    }
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
  window.addEventListener("freezzz:close-chat-popup",()=>close("chat"));
  window.addEventListener("freezzz:telegram-chat-sync",event=>{
    const detail=(event as CustomEvent<{chat?:TelegramPopupChat|null;messages?:TelegramPopupMessage[]}>).detail;
    syncTelegramPopup(detail);
  });
  const savedId=loadLastChatId();
  if(savedId){
    window.dispatchEvent(new CustomEvent("freezzz:telegram-chat-request",{detail:{chatId:savedId}}));
  }
  const clampWindows=()=>{
    (Object.keys(windows) as MiniId[]).forEach(id=>fitWindow(id));
    render();
  };
  window.addEventListener("resize",clampWindows,{passive:true});
  window.visualViewport?.addEventListener("resize",clampWindows,{passive:true});
  render();
}
if(document.readyState==="loading")window.addEventListener("DOMContentLoaded",initMultiWindowPortal,{once:true});
else queueMicrotask(initMultiWindowPortal);
