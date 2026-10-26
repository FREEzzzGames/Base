import { streams } from "./portal-ui";
import { getLiveStreams } from "./live-catalog";
import { liveEmbedUrl } from "./live-runtime";

type MiniId = "live" | "chat" | "radio" | "zaycev";
type MiniWindow = { open:boolean; minimized:boolean; x:number; y:number; width:number; height:number; z:number; minWidth:number; minHeight:number };

const windows:Record<MiniId,MiniWindow> = {
  live:{open:false,minimized:false,x:60,y:70,width:300,height:205,z:30,minWidth:220,minHeight:150},
  chat:{open:false,minimized:false,x:48,y:250,width:340,height:360,z:40,minWidth:250,minHeight:220},
  radio:{open:false,minimized:false,x:50,y:555,width:330,height:72,z:50,minWidth:210,minHeight:64},
  zaycev:{open:false,minimized:false,x:24,y:90,width:360,height:440,z:60,minWidth:260,minHeight:250}
};
let nextZ=60;
let focusedWindow:MiniId|null=null;
const WINDOW_LAYOUT_KEY="freezzz:zenith:window-layout:v1";
let zaycevQuery="";
const WORKSPACE_SETTINGS_KEY="freezzz:zenith:settings:v1";
type WorkspaceSettings={reduceMotion:boolean;windowOpacity:number};
function loadWorkspaceSettings():WorkspaceSettings{
  try{
    const raw=JSON.parse(localStorage.getItem(WORKSPACE_SETTINGS_KEY)||"{}");
    const opacity=Number(raw.windowOpacity);
    return {reduceMotion:raw.reduceMotion===true,windowOpacity:Number.isFinite(opacity)?Math.max(.55,Math.min(1,opacity)):.92};
  }catch{return {reduceMotion:false,windowOpacity:.92};}
}
let workspaceSettings=loadWorkspaceSettings();
let settingsOpen=false;
function applyWorkspaceSettings(){
  document.documentElement.classList.toggle("zenith-reduce-motion",workspaceSettings.reduceMotion);
  document.documentElement.style.setProperty("--zenith-window-opacity",String(workspaceSettings.windowOpacity));
}
function saveWorkspaceSettings(){
  try{localStorage.setItem(WORKSPACE_SETTINGS_KEY,JSON.stringify(workspaceSettings));}catch{}
  applyWorkspaceSettings();
}
function restoreWindowLayout(){
  try{
    const saved=JSON.parse(localStorage.getItem(WINDOW_LAYOUT_KEY)||"{}") as Partial<Record<MiniId,Partial<MiniWindow>>>;
    (Object.keys(windows) as MiniId[]).forEach(id=>{
      const value=saved[id];
      if(!value)return;
      const w=windows[id];
      if(Number.isFinite(value.x))w.x=Number(value.x);
      if(Number.isFinite(value.y))w.y=Number(value.y);
      if(Number.isFinite(value.width))w.width=Number(value.width);
      if(Number.isFinite(value.height))w.height=Number(value.height);
      if(Number.isFinite(value.z))w.z=Number(value.z);
      if(typeof value.minimized==="boolean")w.minimized=value.minimized;
      if(typeof value.open==="boolean")w.open=value.open;
    });
  }catch{}
}
function saveWindowLayout(){
  try{
    const layout=Object.fromEntries((Object.keys(windows) as MiniId[]).map(id=>{
      const {x,y,width,height,z,minimized,open}=windows[id];
      return [id,{x,y,width,height,z,minimized,open}];
    }));
    localStorage.setItem(WINDOW_LAYOUT_KEY,JSON.stringify(layout));
  }catch{}
}
let liveName=getLiveStreams()[0]?.name||streams[0]?.name||"";
let liveSource:"twitch"|"youtube"="twitch";
let liveReplay=false;
let liveOpacity=0.92;
let radioStatus="idle";
let radioStationName="";
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
function toggleFocus(id:MiniId){focusedWindow=focusedWindow===id?null:id;focus(id);saveWindowLayout();render();}
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
  windows[id].minimized=false;
  focus(id);
  saveWindowLayout();
  if(id==="chat")window.dispatchEvent(new CustomEvent("freezzz:telegram-chat-request",{detail:{chatId:loadLastChatId()}}));
  render();
}
function minimize(id:MiniId){windows[id].minimized=true;if(focusedWindow===id)focusedWindow=null;saveWindowLayout();render();}
function restore(id:MiniId){windows[id].open=true;windows[id].minimized=false;focusedWindow=id;focus(id);saveWindowLayout();render();}
function close(id:MiniId){if(id==="live"&&windows.live.open)window.dispatchEvent(new CustomEvent("freezzz:live-window-closed",{detail:{name:liveName}}));windows[id].open=false;windows[id].minimized=false;if(focusedWindow===id)focusedWindow=null;saveWindowLayout();render();}
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
  if(windows.live.open&&!windows.live.minimized){
    const candidates=getLiveStreams();
    const s=candidates.find(x=>x.name===liveName)||candidates[0]||streams[0];
    if(s){
      const src=liveEmbedUrl(s,liveReplay?"replay":liveSource,window.location.hostname);
      out.push('<section class="portal-mw portal-mw-live '+(focusedWindow==="live"?"portal-mw-focused":"") + '" data-mw="live" style="left:'+windows.live.x+'px;top:'+windows.live.y+'px;width:'+windows.live.width+'px;height:'+windows.live.height+'px;z-index:'+windows.live.z+';--live-panel-alpha:'+liveOpacity+'">'+
        '<header class="portal-mw-head" data-mw-drag="live"><strong>📺 '+esc(s.name)+'</strong><div>'+
        '<button data-mw-source="twitch" class="'+(!liveReplay&&liveSource==="twitch"?"active":"")+'">T</button>'+
        '<button data-mw-source="youtube" class="'+(!liveReplay&&liveSource==="youtube"?"active":"")+'">Y</button>'+
        '<button data-mw-replay type="button" class="'+(liveReplay?"active":"")+'" '+(!s.lastRecordingUrl?"disabled":"")+' title="Последняя запись">↻</button><label class="portal-mw-opacity" title="Прозрачность окна">◐<input data-mw-opacity type="range" min="20" max="100" step="5" value="'+Math.round(liveOpacity*100)+'" aria-label="Прозрачность окна"></label><button data-mw-minimize="live" type="button" aria-label="Свернуть окно" title="Свернуть">−</button><button data-mw-focus="live" type="button" aria-label="Режим фокуса" title="Развернуть / восстановить">'+(focusedWindow==="live"?"↙":"⛶")+'</button><button data-mw-close="live" type="button">×</button></div></header>'+
        '<div class="portal-mw-live-body">'+(src?'<iframe src="'+esc(src)+'" title="'+esc(s.name)+'" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>':'LIVE unavailable')+'</div>'+resizeHandle("live")+'</section>');
    }
  }
  if(windows.chat.open&&!windows.chat.minimized){
    out.push('<section class="portal-mw portal-mw-chat '+(focusedWindow==="chat"?"portal-mw-focused":"") + '" data-mw="chat" style="left:'+windows.chat.x+'px;top:'+windows.chat.y+'px;width:'+windows.chat.width+'px;height:'+windows.chat.height+'px;z-index:'+windows.chat.z+'">'+
      '<header class="portal-mw-head" data-mw-drag="chat"><strong>💬 '+esc(telegramPopupChat?.title||"CHAT")+'</strong><div><button data-mw-chat-open type="button" title="Открыть CHAT">↗</button><button data-mw-minimize="chat" type="button" aria-label="Свернуть окно" title="Свернуть">−</button><button data-mw-focus="chat" type="button" aria-label="Режим фокуса" title="Развернуть / восстановить">'+(focusedWindow==="chat"?"↙":"⛶")+'</button><button data-mw-close="chat">×</button></div></header>'+
      '<div class="portal-mw-chat-list">'+(telegramPopupMessages.length
        ? telegramPopupMessages.map(m=>'<p class="'+(m.outgoing?"outgoing":"")+'" data-mw-chat-message-key="'+esc(m.id)+'"><b>'+esc(m.senderName)+'</b><span>'+popupMessageText(m)+'</span>'+popupMessageExpandControl(m)+'</p>').join("")
        : '<div class="portal-mw-chat-empty">'+esc(telegramPopupChat?"Нет сообщений":"Откройте CHAT и выберите диалог")+'</div>')+'</div>'+
      '<form data-mw-chat-form><input data-mw-chat-input type="text" inputmode="text" enterkeyhint="send" placeholder="Сообщение…" autocomplete="off" autocapitalize="sentences" spellcheck="true"><button type="submit">↗</button></form>'+resizeHandle("chat")+'</section>');
  }
  if(windows.zaycev.open&&!windows.zaycev.minimized){
    out.push('<section class="portal-mw portal-mw-zaycev '+(focusedWindow==="zaycev"?"portal-mw-focused":"")+'" data-mw="zaycev" style="left:'+windows.zaycev.x+'px;top:'+windows.zaycev.y+'px;width:'+windows.zaycev.width+'px;height:'+windows.zaycev.height+'px;z-index:'+windows.zaycev.z+'">'+
      '<header class="portal-mw-head" data-mw-drag="zaycev"><strong>♫ ЗАЙЦЕВ. НЕТ</strong><div><button data-mw-minimize="zaycev" type="button" aria-label="Свернуть окно" title="Свернуть">−</button><button data-mw-focus="zaycev" type="button" aria-label="Развернуть окно" title="Развернуть / восстановить">'+(focusedWindow==="zaycev"?"↙":"⛶")+'</button><button data-mw-close="zaycev" type="button" aria-label="Закрыть">×</button></div></header>'+
      '<div class="portal-mw-zaycev-body"><form data-mw-zaycev-form><input data-mw-zaycev-query type="search" maxlength="160" value="'+esc(zaycevQuery)+'" placeholder="Название песни или исполнитель" aria-label="Название песни или исполнитель"><button type="submit">Найти ↗</button></form>'+
      '<div class="portal-mw-zaycev-content"><div class="portal-mw-zaycev-mark">♫</div><strong>ПОИСК МУЗЫКИ</strong><p>Найди трек, затем открой его на официальном сайте для прослушивания и доступной загрузки.</p><a href="https://zaycev.net/" target="_blank" rel="noopener noreferrer">ОТКРЫТЬ ЗАЙЦЕВ. НЕТ ↗</a><small>Если сервис запрещает встраивание, он откроется в отдельной вкладке.</small></div></div>'+resizeHandle("zaycev")+'</section>');
  }
  if(windows.radio.open&&!windows.radio.minimized){
    out.push('<section class="portal-mw portal-mw-radio '+(focusedWindow==="radio"?"portal-mw-focused":"") + '" data-mw="radio" style="left:'+windows.radio.x+'px;top:'+windows.radio.y+'px;width:'+windows.radio.width+'px;height:'+windows.radio.height+'px;z-index:'+windows.radio.z+'">'+
      '<header class="portal-mw-head" data-mw-drag="radio"><strong>🎵 RADIO</strong><div><button data-mw-settings-open type="button" aria-label="Настройки рабочего пространства" title="Настройки">⚙</button><button data-mw-minimize="radio" type="button" aria-label="Свернуть окно" title="Свернуть">−</button><button data-mw-focus="radio" type="button" aria-label="Открыть полный экран RADIO" title="Открыть полноценный раздел RADIO">'+(focusedWindow==="radio"?"↙":"⛶")+'</button><button data-mw-close="radio">×</button></div></header>'+
      '<div class="portal-mw-radio-body"><div class="portal-mw-radio-now"><span class="portal-mw-radio-title">'+esc(radioStationName||"INTERNET RADIO")+'</span><span class="portal-mw-radio-state">'+esc(radioStatus.toUpperCase())+'</span></div><div class="portal-mw-wave" data-playing="'+(radioStatus==="playing"?"true":"false")+'" aria-label="Audio playback visualization">'+Array.from({length:18},(_,i)=>'<i style="--bar:'+(i%5+2)+'"></i>').join("")+'</div><div class="portal-mw-radio-controls"><button data-mw-radio="play" aria-label="Play">▶</button><button data-mw-radio="pause" aria-label="Pause">Ⅱ</button><button data-mw-radio="stop" aria-label="Stop">■</button></div></div></section>');
  }
  const taskItems=(Object.keys(windows) as MiniId[]).filter(id=>windows[id].open).map(id=>'<button type="button" class="portal-os-task" data-os-restore="'+id+'" aria-label="Восстановить '+id+'">'+(id==="live"?"📺 LIVE":id==="chat"?"💬 CHAT":id==="radio"?"♫ RADIO":"♫ ЗАЙЦЕВ")+'</button>').join("");
  out.push('<nav class="portal-os-taskbar" aria-label="Открытые приложения" '+(taskItems?"":"hidden")+'>'+taskItems+'</nav>');
  layer.innerHTML=out.join("");
  bind();
}

function bind(){
  layer?.querySelector<HTMLFormElement>("[data-mw-zaycev-form]")?.addEventListener("submit",event=>{
    event.preventDefault();event.stopPropagation();
    const input=layer?.querySelector<HTMLInputElement>("[data-mw-zaycev-query]");
    zaycevQuery=input?.value.trim()||"";
    if(!zaycevQuery){input?.focus();return;}
    const url=new URL("https://zaycev.net/search.html");
    url.searchParams.set("query",zaycevQuery);
    window.open(url.toString(),"_blank","noopener,noreferrer");
  });
  layer?.querySelectorAll<HTMLElement>("[data-mw-settings-open]").forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();settingsOpen=true;layer?.classList.add("portal-mw-settings-open");});
  layer?.querySelectorAll<HTMLElement>("[data-mw-settings-close]").forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();settingsOpen=false;layer?.classList.remove("portal-mw-settings-open");});
  layer?.querySelectorAll<HTMLInputElement>("[data-mw-setting-motion]").forEach(input=>input.onchange=()=>{workspaceSettings.reduceMotion=input.checked;saveWorkspaceSettings();});
  layer?.querySelectorAll<HTMLInputElement>("[data-mw-setting-opacity]").forEach(input=>input.oninput=()=>{workspaceSettings.windowOpacity=Number(input.value)/100;const label=layer?.querySelector<HTMLElement>("[data-mw-opacity-value]");if(label)label.textContent=input.value+"%";saveWorkspaceSettings();});
  layer?.querySelectorAll<HTMLElement>("[data-mw-settings-reset]").forEach(b=>b.onclick=e=>{e.preventDefault();workspaceSettings={reduceMotion:false,windowOpacity:.92};saveWorkspaceSettings();render();});
  layer?.querySelectorAll<HTMLElement>("[data-mw-minimize]").forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();minimize(b.dataset.mwMinimize as MiniId);});
  layer?.querySelectorAll<HTMLElement>("[data-os-restore]").forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();restore(b.dataset.osRestore as MiniId);});
  layer?.querySelectorAll<HTMLElement>("[data-mw-close]").forEach(b=>b.onclick=()=>close(b.dataset.mwClose as MiniId));
  layer?.querySelectorAll<HTMLElement>("[data-mw-focus]").forEach(b=>b.onclick=e=>{
    e.preventDefault();e.stopPropagation();
    const id=b.dataset.mwFocus as MiniId;
    if(id==="radio"){
      windows.radio.open=false;
      if(focusedWindow==="radio")focusedWindow=null;
      saveWindowLayout();
      render();
      window.dispatchEvent(new CustomEvent("freezzz:radio-open-fullscreen"));
      return;
    }
    toggleFocus(id);
  });
  layer?.querySelectorAll<HTMLElement>("[data-mw]").forEach(el=>el.addEventListener("pointerdown",()=>{const id=el.dataset.mw as MiniId;if(id in windows&&focusedWindow!==id){focus(id);saveWindowLayout();el.style.zIndex=String(windows[id].z);}}));
  layer?.querySelectorAll<HTMLElement>("[data-mw-source]").forEach(b=>b.onclick=()=>{
    liveSource=b.dataset.mwSource==="youtube"?"youtube":"twitch";liveReplay=false;render();
  });
  layer?.querySelector<HTMLElement>("[data-mw-replay]")?.addEventListener("click",()=>{liveReplay=!liveReplay;render();});
  layer?.querySelector<HTMLInputElement>("[data-mw-opacity]")?.addEventListener("input",event=>{
    liveOpacity=Number((event.currentTarget as HTMLInputElement).value)/100;
    const live=layer?.querySelector<HTMLElement>("[data-mw='live']");
    if(live)live.style.setProperty("--live-panel-alpha",String(liveOpacity));
  });
  layer?.querySelector<HTMLInputElement>("[data-mw-opacity]")?.addEventListener("pointerdown",event=>event.stopPropagation());
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
      saveWindowLayout();
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
    const end=()=>{h.removeEventListener("pointermove",move);h.removeEventListener("pointerup",end);h.removeEventListener("pointercancel",end);try{h.releasePointerCapture(pointer.pointerId);}catch{}saveWindowLayout();};
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
    const target=e.target as HTMLElement;
    if(target.closest('[data-portal-card="zaycev"]')){
      e.preventDefault();e.stopImmediatePropagation();
      windows.zaycev.open=true;windows.zaycev.minimized=false;fitWindow("zaycev");focus("zaycev");render();
      return;
    }
    const el=(e.target as HTMLElement).closest<HTMLElement>("[data-view]");
    if(!el)return;
    const id=el.dataset.view as "live"|"chat"|"radio"|"game"|"library"|"home";
    if(!["live","chat","radio","game","library","home"].includes(id))return;

    // Every top-level route owns its screen; floating mini windows must never
    // leak across HOME, GAME, LIVE, CHAT, RADIO or LIBRARY.
    if(el.closest(".portal-toolbar")){
      (Object.keys(windows) as MiniId[]).forEach(windowId=>{windows[windowId].open=false;});
      focusedWindow=null;
      settingsOpen=false;
      saveWindowLayout();
      render();
      return;
    }

    e.preventDefault();
    e.stopImmediatePropagation();
    if(id==="game"||id==="library"){
      window.dispatchEvent(new CustomEvent("freezzz:navigate",{detail:{view:id}}));
      return;
    }
    if(id==="live"){
      const candidates=getLiveStreams();
      const saved=(()=>{try{return localStorage.getItem("freezzz:live:last-stream")||"";}catch{return "";}})();
      const selected=candidates.find(s=>s.name===saved)||candidates.find(s=>s.twitchChannel)||candidates.find(s=>s.youtubeChannel)||candidates[0];
      if(selected){
        liveName=selected.name;
        liveReplay=false;
        liveSource=selected.twitchChannel?"twitch":"youtube";
        windows.live.open=true;fitWindow("live");focus("live");render();
        try{localStorage.setItem("freezzz:live:last-stream",liveName);}catch{}
        window.dispatchEvent(new CustomEvent("freezzz:live-window-opened",{detail:{name:liveName,source:liveSource}}));
      }
      return;
    }
    if(id==="chat"||id==="radio"){toggle(id);return;}
    // All other routes are handled explicitly above; never pass route IDs to MiniWindow.
  },true);
}

export function initMultiWindowPortal(){
  if(layer)return;
  restoreWindowLayout();
  applyWorkspaceSettings();
  window.addEventListener("resize",()=>{
    (Object.keys(windows) as MiniId[]).forEach(id=>fitWindow(id));
    saveWindowLayout();
    if(layer)render();
  });
  window.addEventListener("keydown",event=>{
    if(event.key==="Escape"&&focusedWindow){
      focusedWindow=null;
      render();
    }
  });
  layer=document.createElement("div");
  layer.className="portal-mw-layer";
  document.body.append(layer);
  intercept();
  window.addEventListener("freezzz:live-window-open",event=>{
    const detail=(event as CustomEvent<{name:string;source:"twitch"|"youtube"|"replay"}>).detail;
    if(!detail?.name)return;
    const item=getLiveStreams().find(s=>s.name===detail.name);
    if(!item)return;
    liveName=item.name;
    liveReplay=detail.source==="replay";
    if(detail.source==="twitch"||detail.source==="youtube")liveSource=detail.source;
    else liveSource=item.twitchChannel?"twitch":"youtube";
    try{localStorage.setItem("freezzz:live:last-stream",item.name);}catch{}
    windows.live.open=true;fitWindow("live");focus("live");render();
    window.dispatchEvent(new CustomEvent("freezzz:live-window-opened",{detail:{name:liveName,source:liveSource}}));
  });
  window.addEventListener("freezzz:radio-status",event=>{const detail=(event as CustomEvent<{status?:string;station?:string}>).detail;radioStatus=detail?.status||"idle";radioStationName=detail?.station||"";if(windows.radio.open)render();});
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
