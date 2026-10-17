import type { RadioBrowserClient, RadioBrowserStation } from "./radio-browser";
import { RADIO_GENRES } from "./radio-config";
import "./styles.css";
import "./zenith-os.css";
import { initPerformanceLayer } from "./performance-layer";
import "./multi-window-portal";
import { bindHomeGridShift } from "./home-grid-shift";
import { portalVideoUrl } from "./video-assets";
import { PORTAL_BUILD_ID } from "./build-info";
import { icon, streams, streamAvatarSources } from "./portal-ui";
import { bindTelegramBackButton, getTelegramWebApp, initTelegramBridge, openExternalUrl, verifyTelegramSession, type TelegramAuthResult, type TelegramVerifiedIdentity } from "./platform-bridge";
import { type LivePopupState, type LiveSource } from "./live-runtime";
import { bindLiveCatalog, getLiveStreams, removeLiveStreamer, renderLiveCatalog } from "./live-catalog";

import { PortalModuleManager, PortalEventBus, ZenithOSKernel, createPlatformState, type PortalView } from "./core/portal-core";
import { pt } from "./portal-i18n";
import { loadPortalProfile, syncPortalIdentity, startPortalSession, recordLiveVisit, addLiveWatchTime, recordGameLaunch, addGameTime, recordRadioVisit, addRadioListenTime, recordChatMessage, formatDuration, type PortalProfile } from "./profile-store";
import { bindUniversalPortalPress } from "./portal-interactions";
import { initVisualComfort } from "./visual-comfort";
import { createTelegramChatClient, type TelegramChat, type TelegramMessage } from "./chat/telegram-client";
import { renderLibrary, bindLibraryView, getLastPlayedGameSummary, resumeLastPlayedGame, stopLibraryEmulator } from "./library-emulator";
import { renderOpenGamesCatalog, bindOpenGamesCatalog, stopOpenGamesSession } from "./open-games-catalog";

initTelegramBridge();
initVisualComfort();
initPerformanceLayer();

async function checkForPortalUpdate(){
  try{
    const response=await fetch("./version.json?ts="+Date.now(),{
      cache:"no-store",
      headers:{Accept:"application/json"}
    });
    if(!response.ok)return;
    const remote=await response.json() as {version?:string;build?:string};
    if(!remote.build||remote.build===PORTAL_BUILD_ID)return;
    const seenKey="freezzz:update-reload";
    if(sessionStorage.getItem(seenKey)===remote.build)return;
    sessionStorage.setItem(seenKey,remote.build);
    localStorage.setItem("freezzz:build",remote.build);
    const url=new URL(window.location.href);
    url.searchParams.set("freezzz_build",remote.build);
    url.searchParams.set("freezzz_refresh",String(Date.now()));
    window.location.replace(url.toString());
  }catch{}
}
void checkForPortalUpdate();

type View = PortalView;
type Language="RU"|"DE"|"EN";

const app=document.querySelector<HTMLDivElement>("#app")!;
const portalState=createPlatformState({view:"home",language:"RU",telegram:Boolean(getTelegramWebApp())});
const portalEvents=new PortalEventBus();
const moduleManager=new PortalModuleManager();
const zenithKernel=new ZenithOSKernel({modules:moduleManager,initial:{view:"home",language:"RU",telegram:Boolean(getTelegramWebApp()),online:portalState.online}});
moduleManager.setErrorHandler((moduleView,phase,error)=>{
  console.error("[FREEzzz module lifecycle]",moduleView,phase,error);
});
const overlayRoute=new URLSearchParams(window.location.search).get("freezzzOverlay");
const initialView:View=overlayRoute==="live"||overlayRoute==="radio" ? overlayRoute : portalState.view;
let view:View=initialView;
let lang:Language=(()=>{try{const saved=localStorage.getItem("freezzz:language");if(saved==="RU"||saved==="DE"||saved==="EN")return saved;}catch{}return portalState.language;})();
const T=(key:string)=>pt(lang,key);
try{document.documentElement.lang=lang.toLowerCase();}catch{}
function safeModuleContent(moduleView:Exclude<PortalView,"home">,renderContent:()=>string,fallbackOverride?:string):string{
  const fallback=fallbackOverride??`<section class="module-fallback" role="status"><p>${escapeHtml(T("moduleUnavailable"))}</p><button type="button" data-module-retry>${escapeHtml(T("retry"))}</button></section>`;
  return moduleManager.runIsolated(moduleView,renderContent,fallback);
}
let profileOpen=false;
let languageMenuOpen=false;
const telegramAuth=await Promise.race<TelegramAuthResult>([
  verifyTelegramSession(),
  new Promise<TelegramAuthResult>(resolve=>window.setTimeout(()=>resolve({ok:false,error:"AUTH_TIMEOUT"}),2500))
]);
const verifiedTelegramIdentity:TelegramVerifiedIdentity|undefined=telegramAuth.ok&&telegramAuth.user?telegramAuth.user:undefined;
if(!localStorage.getItem("freezzz:language")){
  const code=verifiedTelegramIdentity?.languageCode?.toUpperCase()||"";
  if(code.startsWith("DE"))lang="DE";
  else if(code.startsWith("EN"))lang="EN";
}
let portalProfile:PortalProfile=loadPortalProfile(verifiedTelegramIdentity);
syncPortalIdentity(portalProfile,verifiedTelegramIdentity);
startPortalSession(portalProfile);
let activityLastFlushAt=Date.now();
let gameActivityStartedAt:number|null=view==="game"?Date.now():null;
let liveActivityStartedAt:number|null=null;
let radioActivityStartedAt:number|null=null;
const liveActivityNames=new Set<string>();
let radioActivityName="";
let livePopups:LivePopupState[]=[];
let liveAudioPriority=false;
const PORTAL_NICKNAME="d3tr01t";
const HOME_BOOKMARK_KEY="freezzz:zenith:home-bookmarks:v1";
const HOME_FILTER_KEY="freezzz:zenith:home-filter:v1";
type HomeFilter="discover"|"audio"|"video"|"feeds";
let homeFilter:HomeFilter=(()=>{try{const value=localStorage.getItem(HOME_FILTER_KEY);return value==="audio"||value==="video"||value==="feeds"?value:"discover";}catch{return "discover";}})();
function renderHomeFilterBar():string{const items:[HomeFilter,string][]=[["discover","DISCOVER"],["audio","AUDIO"],["video","VIDEO"],["feeds","FEEDS"]];return '<nav class="zenith-home-filters" aria-label="Workspace filters" role="tablist">'+items.map(([id,label])=>'<button type="button" role="tab" data-home-filter="'+id+'" aria-selected="'+(homeFilter===id)+'" class="'+(homeFilter===id?"active":"")+'">'+label+'</button>').join("")+'</nav>';}
function applyHomeFilter(){
  if(view!=="home")return;
  const cards=[...document.querySelectorAll<HTMLElement>("[data-portal-card]")];
  cards.forEach(card=>{const id=card.dataset.portalCard||"";card.hidden=homeFilter==="audio"?id!=="radio":homeFilter==="video"?id!=="live":homeFilter==="feeds"?true:false;});
  const bookmarks=document.querySelector<HTMLElement>('[data-portal-block="bookmarks"]');if(bookmarks)bookmarks.hidden=homeFilter==="video"||homeFilter==="feeds";
  const system=document.querySelector<HTMLElement>('[data-portal-block="system"]');if(system)system.hidden=false;
  const signal=document.querySelector<HTMLElement>('[data-portal-block="signal-feed"]');if(signal)signal.hidden=homeFilter!=="feeds";
  document.querySelectorAll<HTMLButtonElement>("[data-home-filter]").forEach(button=>{const active=button.dataset.homeFilter===homeFilter;button.classList.toggle("active",active);button.setAttribute("aria-selected",String(active));});
}
function renderSignalFeed():string{const online=navigator.onLine;const radio=radioPlaybackStatus.toUpperCase();const platform=getTelegramWebApp()?"TELEGRAM MINI APP":"WEB";return '<section class="zenith-home-widget zenith-signal-feed" data-portal-block="signal-feed"><header><div><span class="zenith-widget-kicker">LIVE TELEMETRY</span><h2>SIGNAL FEED</h2></div><span class="zenith-widget-count">REALTIME</span></header><div class="zenith-signal-row"><i class="'+(online?"is-on":"")+'"></i><span>NETWORK</span><b>'+(online?"ONLINE":"OFFLINE")+'</b></div><div class="zenith-signal-row"><i class="'+(radio==="PLAYING"?"is-on":"")+'"></i><span>AUDIO</span><b>'+escapeHtml(radio)+'</b></div><div class="zenith-signal-row"><i class="is-on"></i><span>PLATFORM</span><b>'+platform+'</b></div><div class="zenith-signal-clock"><span>UTC</span><b data-system-utc>--:--:--</b></div></section>';}
const HOME_BOOKMARKS:ReadonlyArray<{view:Exclude<View,"home">;label:string;symbol:string}>=[
{view:"game",label:"GAME",symbol:"▣"},{view:"live",label:"LIVE",symbol:"◉"},{view:"chat",label:"CHAT",symbol:"◌"},{view:"radio",label:"RADIO",symbol:"♫"},{view:"library",label:"LIBRARY",symbol:"▤"},{view:"echo9",label:"ECHO-9",symbol:"⌁"}];
function readHomeBookmarks():Set<string>{try{const stored=JSON.parse(localStorage.getItem(HOME_BOOKMARK_KEY)||'["game","live","radio","library"]');const valid=new Set(HOME_BOOKMARKS.map(item=>item.view));return new Set(Array.isArray(stored)?stored.map(String).filter(value=>valid.has(value as Exclude<View,"home">)):[]);}catch{return new Set(["game","live","radio","library"]);}}
let homeBookmarks=readHomeBookmarks();
function saveHomeBookmarks(){try{localStorage.setItem(HOME_BOOKMARK_KEY,JSON.stringify([...homeBookmarks]));}catch{}}
function renderHomeBookmarks():string{const items=HOME_BOOKMARKS.filter(item=>homeBookmarks.has(item.view));return `<section class="zenith-home-widget zenith-bookmarks" data-portal-block="bookmarks"><header><div><span class="zenith-widget-kicker">WORKSPACE</span><h2>BOOKMARKS</h2></div><span class="zenith-widget-count">${items.length} SAVED</span></header><div class="zenith-bookmark-grid">${items.length?items.map(item=>`<button class="zenith-bookmark" data-bookmark-open="${item.view}" type="button"><span>${item.symbol}</span><b>${item.label}</b><i aria-hidden="true">↗</i></button>`).join(""):'<p class="zenith-widget-empty">Добавь приложения в быстрый доступ ниже.</p>'}</div><details class="zenith-bookmark-editor"><summary>EDIT BOOKMARKS</summary><div>${HOME_BOOKMARKS.map(item=>`<label><input type="checkbox" data-bookmark-toggle="${item.view}" ${homeBookmarks.has(item.view)?"checked":""}><span>${item.label}</span></label>`).join("")}</div></details></section>`;}
function renderHomeSystem():string{const online=navigator.onLine;return `<section class="zenith-home-widget zenith-system" data-portal-block="system"><header><div><span class="zenith-widget-kicker">ZENITH OS</span><h2>SYSTEM</h2></div><span class="zenith-system-state ${online?"is-online":"is-offline"}"><i></i>${online?"ONLINE":"OFFLINE"}</span></header><div class="zenith-system-orbit" aria-hidden="true"><span></span><span></span><span></span></div><dl><div><dt>NETWORK</dt><dd>${online?"CONNECTED":"DISCONNECTED"}</dd></div><div><dt>RADIO</dt><dd>${escapeHtml(radioPlaybackStatus.toUpperCase())}</dd></div><div><dt>PLATFORM</dt><dd>${getTelegramWebApp()?"TELEGRAM MINI APP":"WEB"}</dd></div><div><dt>LOCAL TIME</dt><dd data-system-clock>--:--:--</dd></div></dl></section>`;}
let hudHidden=false;
let hudGestureBound=false;
const telegramChatClient=createTelegramChatClient();

let telegramChats:TelegramChat[]=[];
let telegramMessages:TelegramMessage[]=[];

const TELEGRAM_LAST_CHAT_KEY="freezzz:telegram:last-chat";
const TELEGRAM_FAVORITES_KEY="freezzz:telegram:favorites";

function readStringSet(key:string):Set<string>{
  try{
    const value=JSON.parse(localStorage.getItem(key)||"[]");
    return new Set(Array.isArray(value)?value.map(String):[]);
  }catch{
    return new Set();
  }
}

let telegramSelectedChatId=(()=>{try{return localStorage.getItem(TELEGRAM_LAST_CHAT_KEY)||"";}catch{return "";}})();
let telegramFavoriteChatIds=readStringSet(TELEGRAM_FAVORITES_KEY);

function saveTelegramFavorites(){
  try{localStorage.setItem(TELEGRAM_FAVORITES_KEY,JSON.stringify([...telegramFavoriteChatIds]));}catch{}
}

function toggleTelegramFavorite(chatId:string){
  if(!chatId)return;
  if(telegramFavoriteChatIds.has(chatId))telegramFavoriteChatIds.delete(chatId);
  else telegramFavoriteChatIds.add(chatId);
  saveTelegramFavorites();
  render();
}

let telegramChatStatus:"idle"|"loading"|"connected"|"disconnected"|"error"="idle";
let telegramChatError="";
let telegramAuthStep:"phone"|"code"|"password"|"none"="phone";
let telegramAuthBusy=false;
let telegramAuthPhone="";
let telegramChatRefreshing=false;
let telegramDialogsOpen=false;
let telegramChatLoadToken=0;
let telegramMessageLoadToken=0;

const expandedTelegramMessages=new Set<string>();

function telegramMessageKey(message:TelegramMessage):string{
  return message.chatId+":"+message.id;
}

function telegramMessageText(message:TelegramMessage):string{
  const text=message.text||"";
  if(text.length<=200||expandedTelegramMessages.has(telegramMessageKey(message)))return escapeHtml(text);
  return escapeHtml(text.slice(0,200))+"…";
}

function telegramMessageExpandControl(message:TelegramMessage):string{
  if((message.text||"").length<=200)return "";
  const expanded=expandedTelegramMessages.has(telegramMessageKey(message));
  return '<button class="chat-message-expand" type="button" data-chat-expand="'+escapeHtml(telegramMessageKey(message))+'" aria-expanded="'+expanded+'">'+(expanded?"Свернуть":"Развернуть")+'</button>';
}
function formatTelegramUnreadCount(value:number):string{
  const count=Number.isFinite(value)?Math.max(0,Math.floor(value)):0;
  return count>99?"99+":String(count);
}

async function loadTelegramChatStatus(){
  telegramChatStatus="loading";
  telegramChatError="";
  render();
  try{
    const status=await telegramChatClient.getStatus();
    telegramChatStatus=status.connected?"connected":"disconnected";
    if(status.connected){
      telegramAuthStep="none";
      await loadTelegramChats();
    }else if(status.pending==="code"){
      telegramAuthStep="code";
    }else if(status.pending==="password"){
      telegramAuthStep="password";
    }
  }catch(error){
    telegramChatStatus="error";
    telegramChatError=error instanceof Error?error.message:"TELEGRAM_UNAVAILABLE";
  }
  render();
}

function syncTelegramPopup(){
  const chat=telegramChats.find(x=>x.id===telegramSelectedChatId)||null;
  window.dispatchEvent(new CustomEvent("freezzz:telegram-chat-sync",{detail:{
    chat:chat?{
      id:chat.id,
      title:chat.title,
      kind:chat.kind,
      username:chat.username,
      lastMessage:chat.lastMessage?{
        text:chat.lastMessage.text,
        date:chat.lastMessage.date,
        outgoing:chat.lastMessage.outgoing
      }:undefined
    }:null,
    messages:telegramMessages.map(m=>({
      id:m.id,
      senderName:m.senderName,
      text:m.text,
      date:m.date,
      outgoing:m.outgoing
    }))
  }}));
}

async function loadTelegramChats(){
  if(telegramChatRefreshing)return;
  telegramChatRefreshing=true;
  const token=++telegramChatLoadToken;
  telegramChatError="";
  render();
  try{
    const chats=await telegramChatClient.getChats();
    if(token!==telegramChatLoadToken)return;
    telegramChats=chats;
    if(!telegramSelectedChatId||!telegramChats.some(x=>x.id===telegramSelectedChatId)){
      telegramSelectedChatId=telegramChats[0]?.id||"";
    }
    if(telegramSelectedChatId)await loadTelegramMessages(telegramSelectedChatId);
    else{
      telegramMessages=[];
      syncTelegramPopup();
    }
  }catch(error){
    if(token===telegramChatLoadToken){
      telegramChatError=error instanceof Error?error.message:"TELEGRAM_UNAVAILABLE";
    }
  }finally{
    if(token===telegramChatLoadToken){
      telegramChatRefreshing=false;
      render();
    }
  }
}

async function loadTelegramMessages(chatId:string){
  if(!chatId)return;
  telegramSelectedChatId=chatId;
  const token=++telegramMessageLoadToken;
  telegramChatError="";
  try{
    const messages=await telegramChatClient.getMessages(chatId,10);
    if(token!==telegramMessageLoadToken)return;
    telegramMessages=[...messages].reverse().slice(-10);
    const selectedChat=telegramChats.find(chat=>chat.id===chatId);
    if(selectedChat)selectedChat.unreadCount=0;
    try{localStorage.setItem(TELEGRAM_LAST_CHAT_KEY,chatId);}catch{}
    syncTelegramPopup();
    render();
    requestAnimationFrame(()=>{
      if(token!==telegramMessageLoadToken)return;
      const history=document.querySelector<HTMLElement>("#telegram-chat-history");
      if(history)history.scrollTop=history.scrollHeight;
    });
  }catch(error){
    if(token!==telegramMessageLoadToken)return;
    telegramChatError=error instanceof Error?error.message:"TELEGRAM_UNAVAILABLE";
    render();
  }
}

async function submitTelegramConnect(){
  const phone=telegramAuthPhone.trim();
  if(!phone)return;
  telegramAuthBusy=true;
  telegramChatError="";
  render();
  try{
    const result=await telegramChatClient.connect(phone);
    telegramAuthStep=result.awaiting==="code"?"code":"none";
    await loadTelegramChatStatus();
  }catch(error){
    telegramChatError=error instanceof Error?error.message:"TELEGRAM_CONNECT_FAILED";
  }finally{
    telegramAuthBusy=false;
    render();
  }
}

async function submitTelegramCode(code:string){
  telegramAuthBusy=true;
  telegramChatError="";
  render();
  try{
    const result=await telegramChatClient.submitCode(code.trim());
    telegramAuthStep=result.awaiting==="password_or_complete"?"password":"none";
    await waitForTelegramConnection();
  }catch(error){
    telegramChatError=error instanceof Error?error.message:"TELEGRAM_CODE_FAILED";
  }finally{
    telegramAuthBusy=false;
    render();
  }
}

async function submitTelegramPassword(password:string){
  telegramAuthBusy=true;
  telegramChatError="";
  render();
  try{
    await telegramChatClient.submitPassword(password);
    await waitForTelegramConnection();
  }catch(error){
    telegramChatError=error instanceof Error?error.message:"TELEGRAM_PASSWORD_FAILED";
  }finally{
    telegramAuthBusy=false;
    render();
  }
}

async function waitForTelegramConnection(){
  for(let i=0;i<20;i++){
    const status=await telegramChatClient.getStatus().catch(()=>({connected:false}));
    if(status.connected){
      telegramChatStatus="connected";
      telegramAuthStep="none";
      await loadTelegramChats();
      return;
    }
    await new Promise(resolve=>setTimeout(resolve,250));
  }
  await loadTelegramChatStatus();
}

function renderTelegramChat(){
  if(telegramChatStatus==="loading"){
    return '<div class="chat-telegram-state"><b>Telegram CHAT</b><span>Подключение…</span></div>';
  }

  if(telegramChatStatus==="error"){
    return '<div class="chat-telegram-state"><b>Telegram CHAT</b><span>'+escapeHtml(telegramChatError)+'</span><button class="tg-button" data-chat-retry type="button">Повторить</button></div>';
  }

  if(telegramChatStatus!=="connected"){
    const step=telegramAuthStep;
    const label=step==="code"?"Код из Telegram":step==="password"?"Пароль 2FA":"Номер телефона";
    const placeholder=step==="code"?"12345":step==="password"?"Пароль 2FA":"+491234567890";
    return '<div class="chat-telegram-connect"><div class="chat-telegram-state"><b>Telegram account</b><span>Авторизация нужна один раз. Данные Telegram остаются на сервере.</span></div><form id="telegram-connect-form" class="chat-auth-form"><label>'+label+'</label><input id="telegram-auth-input" type="'+(step==="password"?"password":"text")+'" inputmode="'+(step==="code"?"numeric":"text")+'" autocomplete="off" placeholder="'+placeholder+'" value="'+escapeHtml(step==="phone"?telegramAuthPhone:"")+'" '+(telegramAuthBusy?"disabled":"")+'><button class="tg-button" type="submit" '+(telegramAuthBusy?"disabled":"")+'>'+(telegramAuthBusy?"…":step==="phone"?"Получить код":step==="code"?"Подтвердить код":"Подтвердить пароль")+"</button></form>"+(telegramChatError?'<p class="chat-error">'+escapeHtml(telegramChatError)+'</p>':"")+'</div>';
  }

  const selected=telegramChats.find(x=>x.id===telegramSelectedChatId);
  const orderedTelegramChats=[...telegramChats].sort((a,b)=>{
    const af=telegramFavoriteChatIds.has(a.id)?1:0;
    const bf=telegramFavoriteChatIds.has(b.id)?1:0;
    return bf-af;
  });

  const chatRows=orderedTelegramChats.map(chat=>{
    const favorite=telegramFavoriteChatIds.has(chat.id);
    return '<div class="chat-dialog-row"><button type="button" class="chat-dialog '+(chat.id===telegramSelectedChatId?"active":"")+'" data-chat-id="'+escapeHtml(chat.id)+'"><span class="chat-dialog-title">'+escapeHtml(chat.title)+'</span><small>'+escapeHtml(chat.lastMessage?.text||"")+'</small>'+(chat.unreadCount?'<i aria-label="Непрочитанных сообщений: '+formatTelegramUnreadCount(chat.unreadCount)+'">'+formatTelegramUnreadCount(chat.unreadCount)+'</i>':"")+'</button><button type="button" class="chat-favorite '+(favorite?"active":"")+'" data-chat-favorite="'+escapeHtml(chat.id)+'" aria-label="'+(favorite?"Убрать из избранного":"Добавить в избранное")+'" title="'+(favorite?"Убрать из избранного":"В избранное")+'">'+(favorite?"★":"☆")+'</button></div>';
  }).join("");

  const messages=telegramMessages.map(message=>{
    return '<article class="chat-tg-message '+(message.outgoing?"outgoing":"")+'" data-chat-message-key="'+escapeHtml(telegramMessageKey(message))+'"><b>'+escapeHtml(message.senderName)+'</b><p>'+telegramMessageText(message)+'</p>'+telegramMessageExpandControl(message)+'<time>'+new Date(message.date).toLocaleString()+'</time></article>';
  }).join("");

  return '<div class="chat-telegram-shell"><aside class="chat-dialogs '+(telegramDialogsOpen?"is-open":"")+'"><div class="chat-dialogs-head"><b>Диалоги</b><div><button type="button" class="chat-refresh-button" data-chat-refresh aria-label="Обновить чаты" title="Обновить чаты" '+(telegramChatRefreshing?'disabled':'')+'>'+(telegramChatRefreshing?'…':'↻')+'</button><button type="button" class="chat-dialogs-close" data-chat-dialogs-close aria-label="Закрыть список чатов" title="Закрыть">×</button></div></div><div class="chat-dialog-list">'+chatRows+'</div></aside><section class="chat-conversation"><header><button type="button" class="chat-dialogs-toggle" data-chat-dialogs aria-label="Открыть список чатов" title="Чаты">☰</button><div class="chat-conversation-title"><b>'+escapeHtml(selected?.title||"Telegram")+'</b><small>'+escapeHtml(selected?.kind||"")+'</small></div></header><div class="chat-history" id="telegram-chat-history">'+messages+'<span class="chat-bottom-sentinel" data-chat-bottom-sentinel aria-hidden="true"></span><button class="chat-scroll-bottom" data-chat-bottom type="button" aria-label="Перейти вниз диалога" title="Перейти вниз диалога">↓</button></div><form id="telegram-message-form" class="chat-message-form"><input id="telegram-message-input" type="text" inputmode="text" enterkeyhint="send" autocomplete="off" autocapitalize="sentences" spellcheck="true" placeholder="Сообщение"><button type="submit" aria-label="Отправить" title="Отправить">↗</button></form></section></div>';
}

let radioBrowser:RadioBrowserClient|null=null;
let radioBrowserLoading:Promise<RadioBrowserClient>|null=null;
let radioStations:readonly RadioBrowserStation[]=[];
let radioGenre="pop";
let radioQuery="";
let radioLoading=false;
let radioError="";
let radioAudio:HTMLAudioElement|null=null;
let radioSelectedId=(()=>{try{return localStorage.getItem("freezzz:radio:selected")||"";}catch{return "";}})();
let radioPlaybackStatus:"idle"|"loading"|"playing"|"paused"|"stopped"|"failed"="idle";

/* Keep one HTMLVideoElement per portal background across render() calls. */
const persistentBackgroundVideos=new Map<string,HTMLVideoElement>();

function persistentBackgroundVideo(key:string,src:string,className:string):string{
  return '<div class="'+className+'" data-persistent-video="'+key+'" data-persistent-video-src="'+escapeHtml(src)+'" aria-hidden="true"></div>';
}

function mountPersistentBackgroundVideos(){
  document.querySelectorAll<HTMLElement>("[data-persistent-video]").forEach(slot=>{
    const key=slot.dataset.persistentVideo||"";
    const src=slot.dataset.persistentVideoSrc||"";
    if(!key||!src)return;
    let video=persistentBackgroundVideos.get(key);
    if(!video){
      video=document.createElement("video");
      video.autoplay=true;
      video.muted=true;
      video.loop=true;
      video.playsInline=true;
      video.preload="metadata";
      video.setAttribute("aria-hidden","true");
      video.src=src;
      video.dataset.persistentVideo=key;
      persistentBackgroundVideos.set(key,video);
    }
    video.className=slot.className;
    slot.replaceWith(video);
    if(video.paused)void video.play().catch(()=>{});
  });
}
function setRadioPlaybackStatus(status:typeof radioPlaybackStatus){
  radioPlaybackStatus=status;
  portalEvents.emit("radio:playback",{status});
  window.dispatchEvent(new CustomEvent("freezzz:radio-status",{detail:{status,station:radioAudio?.dataset.station||""}}));
}

function openLivePopup(name:string,source:LiveSource="twitch"):void{if(!name)return;livePopups=[{key:name+"::"+source,name,source}];beginLiveActivity(name);if(radioAudio){radioAudio.pause();endRadioActivity();}window.dispatchEvent(new CustomEvent("freezzz:live-window-open",{detail:{name,source}}));portalEvents.emit("live:popup",{open:true,source:source==="replay"?"youtube":source});}
function closeLivePopup(key?:string):void{const popup=key?livePopups.find(p=>p.key===key):livePopups[livePopups.length-1];if(!popup)return;livePopups=livePopups.filter(p=>p.key!==popup.key);if(!livePopups.some(p=>p.name===popup.name))endLiveActivity(popup.name);portalEvents.emit("live:popup",{open:Boolean(livePopups.length),source:popup.source==="replay"?"youtube":popup.source});render();}
window.addEventListener("freezzz:live-window-opened",event=>{const detail=(event as CustomEvent<{name:string;source:LiveSource}>).detail;if(!detail?.name)return;liveAudioPriority=true;livePopups=[{key:detail.name+"::"+detail.source,name:detail.name,source:detail.source}];beginLiveActivity(detail.name);if(radioAudio){radioAudio.pause();endRadioActivity();}});
window.addEventListener("freezzz:live-window-closed",event=>{liveAudioPriority=false;const detail=(event as CustomEvent<{name?:string}>).detail;const popup=detail?.name?livePopups.find(p=>p.name===detail.name):livePopups[livePopups.length-1];if(popup)closeLivePopup(popup.key);});
function flushActivityTracking(){
  const now=Date.now();
  const elapsed=Math.max(0,(now-activityLastFlushAt)/1000);
  activityLastFlushAt=now;
  if(view==="game"&&gameActivityStartedAt!==null)addGameTime(portalProfile,elapsed);
  if(liveActivityStartedAt!==null&&liveActivityNames.size){liveActivityNames.forEach(name=>addLiveWatchTime(portalProfile,name,elapsed));liveActivityStartedAt=now;}
  if(radioActivityStartedAt!==null&&radioActivityName){addRadioListenTime(portalProfile,radioActivityName,elapsed);radioActivityStartedAt=now;}
}
function beginGameActivity(){if(gameActivityStartedAt!==null)return;gameActivityStartedAt=Date.now();recordGameLaunch(portalProfile);}
function endGameActivity(){if(gameActivityStartedAt===null)return;flushActivityTracking();gameActivityStartedAt=null;}
function beginLiveActivity(name:string){if(liveActivityNames.has(name))return;if(liveActivityStartedAt===null)liveActivityStartedAt=Date.now();liveActivityNames.add(name);recordLiveVisit(portalProfile,name);}
function endLiveActivity(name?:string){if(liveActivityStartedAt===null)return;if(name)liveActivityNames.delete(name);else liveActivityNames.clear();if(!liveActivityNames.size){flushActivityTracking();liveActivityStartedAt=null;}}
function beginRadioActivity(name:string){if(radioActivityStartedAt!==null&&radioActivityName===name)return;if(radioActivityStartedAt!==null)flushActivityTracking();radioActivityName=name;radioActivityStartedAt=Date.now();recordRadioVisit(portalProfile,name);}
function endRadioActivity(){if(radioActivityStartedAt===null)return;flushActivityTracking();radioActivityStartedAt=null;radioActivityName="";}
function profileInitial(){return (portalProfile.identity.firstName||portalProfile.identity.username||"F").slice(0,1).toUpperCase();}
function renderProfileCard(){
  const s=portalProfile.stats;
  const liveItems=Object.entries(s.live.channels).sort((a,b)=>b[1].seconds-a[1].seconds).slice(0,3);
  const radioItems=Object.entries(s.radio.stations).sort((a,b)=>b[1].seconds-a[1].seconds).slice(0,3);
  const u=portalProfile.identity;
  const avatar=u.photoUrl?`<img class="profile-avatar profile-avatar-photo" src="${escapeHtml(u.photoUrl)}" alt="">`:`<span class="profile-avatar">${escapeHtml(profileInitial())}</span>`;
  const liveHtml=liveItems.length?liveItems.map(([name,v])=>`<div class="profile-row"><span>${escapeHtml(name)}</span><small>${formatDuration(v.seconds)} · ${v.visits} виз.</small></div>`).join(""):`<p class="profile-empty">Пока нет просмотров.</p>`;
  const radioHtml=radioItems.length?radioItems.map(([name,v])=>`<div class="profile-row"><span>${escapeHtml(name)}</span><small>${formatDuration(v.seconds)} · ${v.visits} прослуш.</small></div>`).join(""):`<p class="profile-empty">Пока нет прослушиваний.</p>`;
  return `<div class="profile-overlay" data-profile-close><section class="profile-card profile-card-expanded" data-profile-card>
    <button class="icon-button profile-close" data-profile-toggle type="button" aria-label="${T("close")}">${icon("close","profile-close-icon")}</button>
    <div class="profile-identity">${avatar}<div><h2>${escapeHtml(PORTAL_NICKNAME)}</h2>${u.username?`<p>@${escapeHtml(u.username)}</p>`:"<p>Telegram profile</p>"}<small>${u.id?`Telegram ID · ${escapeHtml(String(u.id))}`:"Telegram identity not available"}</small></div></div>
    <div class="profile-stat-grid"><div><b>${s.sessions}</b><small>Сессий</small></div><div><b>${s.game.launches}</b><small>Запусков GAME</small></div><div><b>${formatDuration(s.game.seconds)}</b><small>Время GAME</small></div><div><b>${formatDuration(s.live.totalSeconds)}</b><small>Просмотр LIVE</small></div><div><b>${formatDuration(s.radio.totalSeconds)}</b><small>Радио</small></div><div><b>${s.chat.messagesSent}</b><small>Сообщений CHAT</small></div></div>
    <div class="profile-section"><h3>LIVE</h3>${liveHtml}</div>
    <div class="profile-section"><h3>RADIO</h3>${radioHtml}</div>
    <div class="profile-section"><h3>GAME</h3><div class="profile-row"><span>Игровое время</span><small>${formatDuration(s.game.seconds)}</small></div><div class="profile-row"><span>Запуски</span><small>${s.game.launches}</small></div></div>
    
  </section></div>`;
}
function renderPortalToolbar(){
  const items:Array<[View,string,string]>=[
    ["game","game","GAME"],
    ["live","video","LIVE"],
    ["chat","chat","CHAT"],
    ["home","home","HOME"],
    ["radio","radio","RADIO"],
    ["library","library","LIBRARY"]
  ];
  return `<header class="portal-topbar">
    <button class="portal-top-profile" data-profile-toggle type="button" aria-label="${T("profile")}" title="${T("profile")}">${icon("profile","portal-top-profile-icon")}</button>
    <div class="portal-top-brand"><strong>ZENITH OS</strong><span>good games. good people</span></div>
    <div class="portal-top-languages" role="group" aria-label="${T("language")}">
      <button type="button" data-lang="RU" class="${lang==="RU"?"active":""}" aria-pressed="${lang==="RU"}">RU</button>
      <button type="button" data-lang="DE" class="${lang==="DE"?"active":""}" aria-pressed="${lang==="DE"}">DE</button>
      <button type="button" data-lang="EN" class="${lang==="EN"?"active":""}" aria-pressed="${lang==="EN"}">EN</button>
    </div>
  </header>
  <nav class="portal-toolbar" aria-label="FREEzzz navigation">
    <div class="portal-toolbar-main">
      <div class="portal-toolbar-nav" role="tablist">
        ${items.map(([target,iconName,label])=>`<button class="portal-toolbar-item ${view===target||(target==="home"&&view==="echo9")?"active":""}" data-view="${target}" type="button" role="tab" aria-selected="${view===target||(target==="home"&&view==="echo9")}" aria-label="${label}" title="${label}">${icon(iconName,"portal-toolbar-icon")}<span class="portal-toolbar-label">${label}</span></button>`).join("")}
      </div>
    </div>
  </nav>`;
}
let lastRenderedView:View|null=null;
function render(){
  const previousRenderedView=lastRenderedView;
  let body="";

  if(view==="home"){
    body=`
      <div class="content portal-layout home-portal" data-portal-layout="home">
        <section class="hero portal-block home-hero" data-portal-block="hero">
          ${persistentBackgroundVideo("hero",portalVideoUrl("hero"),"home-hero-video")}
          <div class="home-hero-content">
          <div class="home-hero-top">
            <div class="home-hero-brand">
              <button class="home-hero-kicker home-hero-echo-launch" data-echo9-launch type="button" aria-label="ECHO">ECHO</button>
              <span class="home-hero-clock" data-home-clock>--:--:--</span>
            </div>
          </div>
          <h1 class="home-hero-profile-trigger" data-profile-toggle role="button" tabindex="0" aria-label="${T("profile")}">${escapeHtml(PORTAL_NICKNAME)}</h1>
          <p>${T("homeDescription")}</p>
          </div>
        </section>
        ${(()=>{const last=getLastPlayedGameSummary();return last?'<section class="portal-block home-card home-continue-tile" data-portal-block="continue" aria-label="'+escapeHtml(T("continueGame"))+'"><button class="home-continue-game" data-resume-last-game type="button">'+icon("play","home-continue-icon")+'<span>'+escapeHtml(T("continueGame"))+'</span><strong>'+escapeHtml(last.name)+'</strong></button></section>':"";})()}
        ${renderHomeFilterBar()}
        <div class="zenith-home-widgets" data-portal-block="workspace-widgets">${renderHomeBookmarks()}${renderHomeSystem()}</div>
        ${homeCard("live")}
        ${homeCard("chat")}
        ${homeCard("game")}
        ${homeCard("radio")}
        ${homeCard("library")}
      </div>`;
  }

  if(view==="live"){
    body=`
      <div class="content portal-layout" data-portal-layout="live">
        <div class="section-head portal-block" data-portal-block="header">
          <div><h2>LIVE</h2><p>${T("liveSub")}</p></div>
        </div>
        ${safeModuleContent("live",()=>renderLiveCatalog(lang))}
      </div>`;
  }
  if(view==="chat"){
    body=`
      <div class="content portal-layout chat-portal" data-portal-layout="chat">
        <div class="section-head portal-block" data-portal-block="header">
          <div><h2>CHAT</h2><p>${T("chatSub")}</p></div>
        </div>
        <div class="chat portal-block" data-portal-block="messages">${safeModuleContent("chat",()=>renderTelegramChat())}</div>
      </div>`;
  }

  if(view==="game"){
    body=safeModuleContent("game",()=>renderOpenGamesCatalog(lang));
  }
  if(view==="radio"){
    const selectedStation=radioStations.find(s=>s.stationuuid===radioSelectedId)||radioStations[0];
    const selectedIndex=selectedStation?radioStations.findIndex(s=>s.stationuuid===selectedStation.stationuuid):-1;
    const count=Math.min(3,radioStations.length);
    const carouselCards=selectedStation&&selectedIndex>=0
      ? Array.from({length:count},(_,offset)=>{
          const half=Math.floor(count/2);
          return radioStations[(selectedIndex+offset-half+radioStations.length)%radioStations.length];
        })
      : [];
    body=`
      <div class="content portal-layout radio-portal" data-portal-layout="radio">
        <div class="section-head portal-block" data-portal-block="header"><div><h2>RADIO</h2><p>Internet Radio · FREEzzz Audio Lab</p></div></div>
        <section class="radio-panel">
          <div class="radio-heading">
            <div><span class="radio-kicker">FREEzzz RADIO</span><h3>${T("internetRadio")}</h3><p>${T("radioChoose")}</p></div>
          </div>
          <div class="radio-carousel portal-block" data-portal-block="carousel" id="radio-carousel" aria-label="Radio station carousel">
            <div class="radio-carousel-track" id="radio-carousel-track">
              ${carouselCards.map(station=>{
                const active=station.stationuuid===selectedStation?.stationuuid;
                const logo=station.favicon?.trim()||"";
                return `<button class="radio-carousel-card ${active?"active":""}" data-radio-carousel-id="${escapeHtml(station.stationuuid)}" type="button" title="${escapeHtml(station.name)}" aria-label="${escapeHtml(station.name)}">
                  ${logo
                    ? `<img class="radio-card-logo" src="${escapeHtml(logo)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
                    : `${icon("radio","radio-card-logo-fallback-icon")}`}
                </button>`;
              }).join("")}
            </div>
          </div>
          <div class="radio-now-playing portal-block" data-portal-block="nowplaying">
            <div>
              <span class="radio-kicker">NOW PLAYING</span>
              <h3>${selectedStation?escapeHtml(selectedStation.name):T("chooseStation")}</h3>
              <p>${selectedStation
                ? [selectedStation.country||"International",selectedStation.tags||"radio",selectedStation.language||"",selectedStation.codec?`${selectedStation.codec} · ${selectedStation.bitrate||0} kbps`:""].filter(Boolean).map(escapeHtml).join(" · ")
                : T("radioLoading")}</p>
              </p>
            </div>
            <div class="radio-player-controls">
              <button id="radio-play" class="tg-button" type="button" ${selectedStation?"":"disabled"}>${radioPlaybackStatus==="playing"?T("playing"):T("play")}</button>
              <button id="radio-pause" class="tg-button secondary" type="button" ${radioPlaybackStatus==="playing"?"":"disabled"}>${T("pause")}</button>
              <button id="radio-stop" class="tg-button secondary" type="button" ${radioPlaybackStatus!=="idle"&&radioPlaybackStatus!=="stopped"?"":"disabled"}>${T("stop")}</button>
            </div>
          </div>
          <div id="radio-audio-host" class="radio-audio-host"></div>
          <form id="radio-search-form" class="inline-form portal-block" data-portal-block="search"><input id="radio-search-input" value="${escapeHtml(radioQuery)}" maxlength="80" placeholder="${T("searchStation")}"><button class="tg-button" type="submit">${T("search")}</button></form>
          <div class="radio-genres portal-block" data-portal-block="genres">${RADIO_GENRES.map(g=>`<button type="button" data-radio-genre="${escapeHtml(g)}" class="${radioGenre===g?"active":""}">${escapeHtml(g)}</button>`).join("")}</div>
          ${radioError?`<div class="radio-status">${escapeHtml(radioError)}</div>`:""}
        </section>
      </div>`;
  }

  if(view==="library"){
    body=safeModuleContent("library",()=>renderLibrary());
  }

  if(view==="echo9"){
    body=`<div class="echo9-portal"><iframe class="echo9-frame" src="./echo9.html?build=${encodeURIComponent(PORTAL_BUILD_ID)}" title="ЭХО-9: Три из Трёх" loading="eager"></iframe></div>`;
  }

  app.innerHTML=`
    <div class="app-shell">
      <div class="portal-workspace ${view==="home"?"portal-home-workspace":"portal-route-workspace"}${view==="echo9"?" portal-echo9-workspace":""}${hudHidden?" portal-hud-hidden":""}">
        ${renderPortalToolbar()}
        <main>${body}</main>\n        <button class="portal-hud-toggle" data-hud-toggle type="button" aria-label="${hudHidden?"Показать нижний бар":"Скрыть нижний бар"}" title="${hudHidden?"Показать нижний бар":"Скрыть нижний бар"}" aria-pressed="${hudHidden}">${icon(hudHidden?"hudUp":"hudDown","portal-hud-toggle-icon")}</button>
      </div>
      
      ${profileOpen?renderProfileCard():""}
    </div>`;

  lastRenderedView=view;
  if(previousRenderedView!==null&&previousRenderedView!==view&&!document.documentElement.hasAttribute("data-reduced-motion")){
    const panel=document.querySelector<HTMLElement>(".portal-workspace > main");
    if(panel&&typeof panel.animate==="function"){
      panel.animate(
        [{opacity:.72,transform:"translate3d(0,7px,0)"},{opacity:1,transform:"translate3d(0,0,0)"}],
        {duration:190,easing:"cubic-bezier(.22,.72,.2,1)",fill:"both"}
      );
    }
  }
  window.dispatchEvent(new CustomEvent("freezzz:portal-render"));
  mountPersistentBackgroundVideos();
  bind();
  if(view==="home"){
    const homeGrid=document.querySelector<HTMLElement>(".home-portal");
    if(homeGrid)bindHomeGridShift(homeGrid);
  }
  bindHudTouchGesture();
  updateHomeClock();
  bindTelegramBackButton(view!=="home" || profileOpen,()=>{
    if(profileOpen){profileOpen=false;portalEvents.emit("profile:toggled",{open:false});render();return;}
    const result=zenithKernel.back();
    portalEvents.emit("navigation:changed",{view:result.current});
  });
}

function streamAvatarMarkup(stream:typeof streams[number],className=""):string{
  const urls=streamAvatarSources(stream);
  if(!urls.youtube&&!urls.twitch)return icon(stream.icon,"stream-icon");
  const primary=urls.youtube||urls.twitch;
  return `<img class="stream-avatar-image ${className}" data-stream-avatar="1" data-stream-avatar-twitch="${escapeHtml(urls.twitch)}" src="${escapeHtml(primary)}" alt="" aria-hidden="true" loading="lazy">`;
}
function homeCard(v:Exclude<View,"home">){
  const backgrounds:Partial<Record<View,string>>={
    live:portalVideoUrl("live"),
    chat:portalVideoUrl("chat"),
    game:portalVideoUrl("game"),
    radio:portalVideoUrl("radio"),
    library:portalVideoUrl("library")
  };
  const background=backgrounds[v];
  const titles:Record<string,string>={live:"LIVE",chat:"CHAT",game:"GAME",radio:"RADIO",library:"LIBRARY"};
  const title=titles[v];
  return `<div class="card home-card portal-block home-${v}" data-portal-card="${v}" data-portal-block="${v}" data-view="${v}" role="button" tabindex="0" aria-label="${title}">
    ${background?`${persistentBackgroundVideo("card-"+v,background,"home-card-background-video")}`:""}
    <span class="home-card-title">${title}</span>
  </div>`;
}
async function getRadioBrowser():Promise<RadioBrowserClient>{
  if(radioBrowser)return radioBrowser;
  if(!radioBrowserLoading){
    radioBrowserLoading=import("./radio-browser").then(module=>{
      radioBrowser=new module.RadioBrowserClient();
      return radioBrowser;
    });
  }
  return radioBrowserLoading;
}
async function loadRadioStations(){
  radioLoading=true; radioError=""; render();
  try{
    const client=await getRadioBrowser();
    radioStations=await client.searchStations(radioGenre,radioQuery,30);
    if(radioSelectedId&&radioStations.some(s=>s.stationuuid===radioSelectedId)){
      // keep the saved station when it is still present
    }else if(radioStations[0]){
      radioSelectedId=radioStations[0].stationuuid;
      try{localStorage.setItem("freezzz:radio:selected",radioSelectedId);}catch{}
    }
  }catch(error){radioStations=[];radioError=error instanceof Error?error.message:String(error);}
  finally{radioLoading=false;render();}
}
function playRadioStation(id:string){
  if(liveAudioPriority){radioAudio?.pause();endRadioActivity();return;}
  const station=radioStations.find(s=>s.stationuuid===id); if(!station)return;
  radioSelectedId=station.stationuuid;
  try{localStorage.setItem("freezzz:radio:selected",radioSelectedId);}catch{}
  endRadioActivity();
  radioAudio?.pause();
  radioAudio=new Audio(station.url_resolved||station.url);
  radioAudio.dataset.station=station.name;
  radioAudio.controls=true;
  setRadioPlaybackStatus("loading");
  radioAudio.addEventListener("playing",()=>{setRadioPlaybackStatus("playing");beginRadioActivity(station.name);render();},{once:true});
  radioAudio.addEventListener("pause",()=>{if(radioPlaybackStatus==="playing")setRadioPlaybackStatus("paused");});
  radioAudio.addEventListener("error",()=>{setRadioPlaybackStatus("failed");radioError=T("playError");render();},{once:true});
  void radioAudio.play().then(()=>{setRadioPlaybackStatus("playing");}).catch(()=>{setRadioPlaybackStatus("failed");radioError=T("autoplayError");}).finally(()=>render());
}
  window.addEventListener("freezzz:chat-send",async event=>{
    const detail=(event as CustomEvent<{chatId?:string;text?:string}>).detail;
    const chatId=String(detail?.chatId||"");
    const message=String(detail?.text||"").trim();
    if(!chatId||!message)return;
    try{
      await telegramChatClient.sendMessage(chatId,message);
      recordChatMessage(portalProfile);
      await loadTelegramMessages(chatId);
      await loadTelegramChats();
    }catch(error){
      telegramChatError=error instanceof Error?error.message:"TELEGRAM_SEND_FAILED";
      render();
    }
  });
window.addEventListener("freezzz:telegram-chat-request",async event=>{
  const requestedId=String((event as CustomEvent<{chatId?:string}>).detail?.chatId||"");
  if(telegramChatStatus==="idle"||telegramChatStatus==="error"){
    await loadTelegramChatStatus();
  }else if(telegramChatStatus==="connected"){
    await loadTelegramChats();
  }
  if(telegramChatStatus==="connected"&&requestedId&&telegramChats.some(x=>x.id===requestedId)&&requestedId!==telegramSelectedChatId){
    await loadTelegramMessages(requestedId);
  }else if(telegramChatStatus==="connected"){
    syncTelegramPopup();
  }
});
window.addEventListener("freezzz:navigate",event=>{
  const next=(event as CustomEvent<{view?:string}>).detail?.view;
  if(next!=="game"&&next!=="library")return;
  portalEvents.emit("navigation:changed",{view:next});
});
window.addEventListener("freezzz:radio-mini",event=>{
  const action=(event as CustomEvent<{action?:string}>).detail?.action;
  if(action==="play")playRadioStation(radioSelectedId);
  if(action==="pause"){endRadioActivity();radioAudio?.pause();setRadioPlaybackStatus("paused");render();}
  if(action==="stop"){endRadioActivity();if(radioAudio){radioAudio.pause();radioAudio.currentTime=0;}setRadioPlaybackStatus("stopped");render();}
});
moduleManager.registerAdapter("game",{
  onActivate:()=>beginGameActivity(),
  onDeactivate:()=>endGameActivity()
});
moduleManager.registerAdapter("live",{
  onDeactivate:()=>{
    endLiveActivity();
    livePopups=[];
  }
});
// Register every existing app with the OS lifecycle. Feature state remains owned by
// the app's existing runtime; the shell only coordinates activation/deactivation.
moduleManager.registerAdapter("chat",{});
moduleManager.registerAdapter("radio",{});
moduleManager.registerAdapter("library",{
  onDeactivate:()=>stopLibraryEmulator()
});
moduleManager.registerAdapter("echo9",{});
portalEvents.on("navigation:changed",payload=>{
  if(payload.view!==view){
    if(view==="game")stopOpenGamesSession();
  }
  // Back/system navigation may already have committed the route in the kernel.
  // Do not push the same route into history a second time.
  if(zenithKernel.snapshot.view!==payload.view){
    const navigation=zenithKernel.navigate(payload.view,"user");
    if(!navigation.accepted)return;
  }
  flushActivityTracking();
  view=zenithKernel.snapshot.view;
  portalState.view=view;
  render();
});
window.addEventListener("resize",()=>{ if(view==="home")render(); });
window.addEventListener("online",()=>{portalState.online=true;zenithKernel.patchSystemState({online:true});});
window.addEventListener("offline",()=>{portalState.online=false;zenithKernel.patchSystemState({online:false});});
window.setInterval(()=>flushActivityTracking(),15000);
window.setInterval(updateHomeClock,1000);
window.addEventListener("pagehide",()=>{flushActivityTracking();gameActivityStartedAt=null;liveActivityStartedAt=null;liveActivityNames.clear();radioActivityStartedAt=null;radioActivityName="";});
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")flushActivityTracking();else activityLastFlushAt=Date.now();});
function bindHudTouchGesture(){
  if(hudGestureBound)return;
  hudGestureBound=true;
  let startX=0,startY=0,tracking=false,triggered=false,startedInHudZone=false;
  const begin=(x:number,y:number,target:EventTarget|null)=>{
    startX=x;startY=y;tracking=true;triggered=false;
    const element=target as HTMLElement|null;
    startedInHudZone=Boolean(element?.closest?.(".portal-toolbar"))||y>=window.innerHeight-160;
  };
  const move=(x:number,y:number)=>{
    if(!tracking||triggered)return;
    const dx=x-startX,dy=y-startY;
    if(Math.abs(dy)<36||Math.abs(dx)>Math.abs(dy)*0.85)return;
    if(!hudHidden&&startedInHudZone&&dy>0){
      triggered=true;
      setHudHidden(true);
    }else if(hudHidden&&dy<0&&startY>=window.innerHeight-180){
      triggered=true;
      setHudHidden(false);
    }
  };
  const end=()=>{tracking=false;startedInHudZone=false;};
  document.addEventListener("pointerdown",e=>{
    if(e.pointerType==="mouse"&&e.button!==0)return;
    begin(e.clientX,e.clientY,e.target);
  },{passive:true});
  document.addEventListener("pointermove",e=>move(e.clientX,e.clientY),{passive:true});
  document.addEventListener("pointerup",end,{passive:true});
  document.addEventListener("pointercancel",end,{passive:true});
  // Android Telegram WebView fallback: some versions do not deliver pointermove
  // consistently when the fixed toolbar is translated off-screen.
  document.addEventListener("touchstart",e=>{
    const t=e.changedTouches[0];
    if(t)begin(t.clientX,t.clientY,e.target);
  },{passive:true});
  document.addEventListener("touchmove",e=>{
    const t=e.changedTouches[0];
    if(t)move(t.clientX,t.clientY);
  },{passive:true});
  document.addEventListener("touchend",end,{passive:true});
  document.addEventListener("touchcancel",end,{passive:true});
}
function updateHomeClock(){
  if(view!=="home")return;
  const clock=document.querySelector<HTMLElement>("[data-home-clock]");
  if(!clock)return;
  clock.textContent=new Date().toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false});
  const systemClock=document.querySelector<HTMLElement>("[data-system-clock]");if(systemClock)systemClock.textContent=clock.textContent;
  const systemState=document.querySelector<HTMLElement>(".zenith-system-state");if(systemState){const online=navigator.onLine;systemState.classList.toggle("is-online",online);systemState.classList.toggle("is-offline",!online);const status=systemState.querySelector("i")?.nextSibling;if(status)status.textContent=online?"ONLINE":"OFFLINE";const network=document.querySelector<HTMLElement>(".zenith-system dd");if(network)network.textContent=online?"CONNECTED":"DISCONNECTED";}
}
function setHudHidden(hidden:boolean){
  hudHidden=hidden;
  zenithKernel.patchSystemState({hudHidden});
  const workspace=document.querySelector<HTMLElement>(".portal-workspace");
  workspace?.classList.toggle("portal-hud-hidden",hudHidden);
}
function toggleHud(){
  setHudHidden(!hudHidden);
}
window.addEventListener("freezzz:open-chat-selector",()=>{
  windowsCloseChatPopup();
  telegramDialogsOpen=true;
  portalEvents.emit("navigation:changed",{view:"chat"});
});
function windowsCloseChatPopup(){
  window.dispatchEvent(new CustomEvent("freezzz:close-chat-popup"));
}
function bind(){
  if(view==="radio"){
    document.querySelector("#radio-search-form")?.addEventListener("submit",e=>{e.preventDefault();radioQuery=(document.querySelector<HTMLInputElement>("#radio-search-input")?.value||"").trim();void loadRadioStations();});
    document.querySelectorAll<HTMLElement>("[data-radio-genre]").forEach(x=>x.onclick=()=>{radioGenre=x.dataset.radioGenre||"pop";radioQuery="";void loadRadioStations();});
    document.querySelectorAll<HTMLButtonElement>("[data-radio-carousel-id]").forEach(x=>x.onclick=()=>{radioSelectedId=x.dataset.radioCarouselId||"";try{localStorage.setItem("freezzz:radio:selected",radioSelectedId);}catch{};render();});
    document.querySelector("#radio-play")?.addEventListener("click",()=>void playRadioStation(radioSelectedId));
    document.querySelector("#radio-pause")?.addEventListener("click",()=>{endRadioActivity();radioAudio?.pause();setRadioPlaybackStatus("paused");render();});
    document.querySelector("#radio-stop")?.addEventListener("click",()=>{endRadioActivity();if(radioAudio){radioAudio.pause();radioAudio.currentTime=0;}setRadioPlaybackStatus("stopped");render();});
    const carousel=document.querySelector<HTMLElement>("#radio-carousel-track");
    let startX=0;
    carousel?.addEventListener("pointerdown",e=>{startX=e.clientX;});
    carousel?.addEventListener("pointerup",e=>{
      const dx=e.clientX-startX;
      if(Math.abs(dx)<45||radioStations.length<2)return;
      const current=Math.max(0,radioStations.findIndex(s=>s.stationuuid===radioSelectedId));
      const next=(current+(dx<0?1:-1)+radioStations.length)%radioStations.length;
      radioSelectedId=radioStations[next].stationuuid;
      try{localStorage.setItem("freezzz:radio:selected",radioSelectedId);}catch{}
      render();
    });
    if(!radioStations.length&&!radioLoading&&!radioError)void loadRadioStations();
    const host=document.querySelector("#radio-audio-host");
    if(host&&radioAudio){host.append(radioAudio);radioAudio.style.width="100%";radioAudio.style.height="38px";}
  }
  bindUniversalPortalPress();
  if(view==="game")bindOpenGamesCatalog(lang,()=>render());

  document.querySelectorAll<HTMLElement>("[data-echo9-launch]").forEach(function(x){
    x.onclick=function(e){
      e.preventDefault();
      e.stopPropagation();
      if(!moduleManager.has("echo9"))return;
      portalEvents.emit("navigation:changed",{view:"echo9"});
    };
  });

  document.querySelectorAll<HTMLElement>(".portal-toolbar [data-view]").forEach(function(x){
    x.onclick=function(e){
          e.preventDefault();
      e.stopPropagation();
      const next=x.dataset.view as View;
      if(!next||!moduleManager.has(next))return;
      // Tapping the already-open module closes it back to HOME.
      const target=next===view&&next!=="home"?"home":next;
      portalEvents.emit("navigation:changed",{view:target});
    };
  });
  document.querySelectorAll<HTMLElement>("[data-resume-last-game]").forEach(button=>{
    button.addEventListener("click",event=>{
      event.preventDefault();
      event.stopPropagation();
      try{sessionStorage.setItem("freezzz:library:resume-on-open","1");}catch{}
      portalEvents.emit("navigation:changed",{view:"library"});
    });
  });
  document.querySelectorAll<HTMLElement>("[data-module-retry]").forEach(button=>{
    button.addEventListener("click",()=>render());
  });
  document.querySelectorAll<HTMLButtonElement>("[data-home-filter]").forEach(button=>button.addEventListener("click",()=>{const value=button.dataset.homeFilter as HomeFilter;if(value!=="discover"&&value!=="audio"&&value!=="video"&&value!=="feeds")return;homeFilter=value;try{localStorage.setItem(HOME_FILTER_KEY,homeFilter);}catch{}applyHomeFilter();}));
  applyHomeFilter();
  document.querySelectorAll<HTMLElement>("[data-bookmark-open]").forEach(button=>button.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();const next=button.dataset.bookmarkOpen as View;if(!next||!moduleManager.has(next))return;portalEvents.emit("navigation:changed",{view:next});}));
  document.querySelectorAll<HTMLInputElement>("[data-bookmark-toggle]").forEach(input=>input.addEventListener("change",()=>{const key=input.dataset.bookmarkToggle||"";if(!HOME_BOOKMARKS.some(item=>item.view===key))return;if(input.checked)homeBookmarks.add(key);else homeBookmarks.delete(key);saveHomeBookmarks();render();}));
  document.querySelectorAll<HTMLElement>(".home-card[data-view]").forEach(function(x){
    const navigate=()=>{
      const next=x.dataset.view as View;
      if(!next||!moduleManager.has(next))return;
      portalEvents.emit("navigation:changed",{view:next});
    };
    x.addEventListener("click",function(e){e.preventDefault();e.stopPropagation();navigate();});
    x.addEventListener("keydown",function(e){if(e.key!=="Enter"&&e.key!==" ")return;e.preventDefault();e.stopPropagation();navigate();});
  });
  document.querySelectorAll<HTMLElement>("[data-profile-toggle]").forEach(function(x){
    x.onclick=function(e){e.preventDefault();e.stopPropagation();profileOpen=!profileOpen;zenithKernel.patchSystemState({profileOpen});portalEvents.emit("profile:toggled",{open:profileOpen});render();};
    if(x.getAttribute("role")==="button"){
      x.onkeydown=function(e){
        if(e.key!=="Enter"&&e.key!==" ")return;
        e.preventDefault();
        e.stopPropagation();
        profileOpen=!profileOpen;
        render();
      };
    }
  });
  document.querySelectorAll<HTMLElement>("[data-profile-close]").forEach(function(x){
    x.onclick=function(){profileOpen=false;render();};
  });
  document.querySelectorAll<HTMLElement>("[data-profile-card]").forEach(function(x){
    x.onclick=function(e){e.stopPropagation();};
  });
  document.querySelectorAll<HTMLImageElement>("[data-stream-avatar]").forEach(function(img){
    img.addEventListener("error",function(){
      const fallback=img.dataset.streamAvatarTwitch||"";
      const current=img.getAttribute("src")||"";
      if(fallback&&current!==fallback&&!img.dataset.streamAvatarFallback){
        img.dataset.streamAvatarFallback="1";
        img.src=fallback;
        return;
      }
      const host=img.parentElement;
      if(host)host.innerHTML=icon("video","stream-icon");
    });
  });
  document.querySelectorAll<HTMLElement>("[data-live-open]").forEach(function(x){
    x.onclick=function(e){e.preventDefault();e.stopPropagation();openLivePopup(x.dataset.liveOpen||"",x.dataset.liveSource==="youtube"?"youtube":"twitch");};
  });
  if(view==="live"){
    bindLiveCatalog();
    document.querySelectorAll<HTMLElement>("[data-live-remove]").forEach(x=>x.onclick=e=>{e.preventDefault();e.stopPropagation();removeLiveStreamer(x.dataset.liveRemove||"");render();});
    document.querySelectorAll<HTMLElement>("[data-live-replay]").forEach(x=>x.onclick=e=>{e.preventDefault();e.stopPropagation();openLivePopup(x.dataset.liveReplay||"","replay");});
  }
  document.querySelectorAll<HTMLElement>("[data-live-popup-source]").forEach(x=>x.onclick=e=>{
    e.preventDefault();e.stopPropagation();
    const key=x.dataset.livePopupSource||"";
    const source=(x.dataset.liveSource==="replay"?"replay":x.dataset.liveSource==="youtube"?"youtube":"twitch") as LiveSource;
    livePopups=livePopups.map(p=>p.key===key?{...p,source}:p);render();
  });
  document.querySelectorAll<HTMLElement>("[data-live-popup-close]").forEach(x=>x.onclick=e=>{e.preventDefault();e.stopPropagation();closeLivePopup(x.dataset.livePopupClose||"");});
  document.querySelectorAll<HTMLElement>("[data-live-external]").forEach(x=>x.onclick=()=>{
    const popup=livePopups.find(p=>p.key===x.dataset.liveExternal);
    const stream=popup?getLiveStreams().find(s=>s.name===popup.name):undefined;
    const url=stream?(popup?.source==="twitch"?stream.twitch:popup?.source==="replay"?stream.lastRecordingUrl:stream.youtube):"";
    if(url)openExternalUrl(url);
  });
  document.querySelector<HTMLElement>("[data-language-toggle]")?.addEventListener("click",function(e){
    e.preventDefault();e.stopPropagation();
    languageMenuOpen=!languageMenuOpen;
    render();
  });
  document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach(button=>{
    button.addEventListener("click",event=>{
      event.preventDefault();event.stopPropagation();
      const next=button.dataset.lang;
      if(next!=="RU"&&next!=="DE"&&next!=="EN")return;
      if(lang===next){languageMenuOpen=false;render();return;}
      lang=next;
      portalState.language=next;
      zenithKernel.setLanguage(next);
      languageMenuOpen=false;
      try{localStorage.setItem("freezzz:language",next);}catch{}
      document.documentElement.lang=next.toLowerCase();
      render();
    });
  });
  document.querySelectorAll<HTMLElement>("[data-url]").forEach(function(x){
    x.onclick=function(e){
      e.preventDefault();
      e.stopPropagation();
      const url=x.dataset.url;
      if(!url)return;
      openExternalUrl(url);
    };
  });
  if(view==="chat"){
    if(telegramChatStatus==="idle")void loadTelegramChatStatus();
    document.querySelectorAll<HTMLElement>("[data-chat-id]").forEach(x=>x.onclick=()=>{telegramDialogsOpen=false;void loadTelegramMessages(x.dataset.chatId||"");});
    document.querySelector<HTMLElement>("[data-chat-dialogs]")?.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();telegramDialogsOpen=!telegramDialogsOpen;render();});
    document.querySelector<HTMLElement>("[data-chat-dialogs-close]")?.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();telegramDialogsOpen=false;render();});
    document.querySelectorAll<HTMLButtonElement>("[data-chat-favorite]").forEach(button=>button.addEventListener("click",e=>{
      e.preventDefault();e.stopPropagation();
      toggleTelegramFavorite(button.dataset.chatFavorite||"");
    }));
    const refreshButton=document.querySelector<HTMLButtonElement>("[data-chat-refresh]");
    refreshButton?.addEventListener("click",e=>{
      e.preventDefault();
      e.stopPropagation();
      if(refreshButton.disabled||telegramChatRefreshing)return;
      void loadTelegramChats();
    });
    document.querySelectorAll<HTMLElement>("[data-chat-expand]").forEach(button=>button.addEventListener("click",e=>{
      e.preventDefault();e.stopPropagation();
      const id=(e.currentTarget as HTMLElement).dataset.chatExpand||"";
      if(!id)return;
      const history=document.querySelector<HTMLElement>("#telegram-chat-history");
      const messageEl=(e.currentTarget as HTMLElement).closest<HTMLElement>("[data-chat-message-key]");
      const historyRect=history?.getBoundingClientRect();
      const messageRect=messageEl?.getBoundingClientRect();
      const anchorOffset=historyRect&&messageRect?messageRect.top-historyRect.top:null;
      if(expandedTelegramMessages.has(id))expandedTelegramMessages.delete(id);else expandedTelegramMessages.add(id);
      render();
      if(anchorOffset!==null){
        requestAnimationFrame(()=>{
          const nextHistory=document.querySelector<HTMLElement>("#telegram-chat-history");
          const nextMessage=nextHistory?.querySelector<HTMLElement>("[data-chat-message-key=\""+CSS.escape(id)+"\"]");
          if(!nextHistory||!nextMessage)return;
          const nextHistoryRect=nextHistory.getBoundingClientRect();
          const nextMessageRect=nextMessage.getBoundingClientRect();
          nextHistory.scrollTop+=nextMessageRect.top-nextHistoryRect.top-anchorOffset;
        });
      }
    }));
    const chatHistory=document.querySelector<HTMLElement>("#telegram-chat-history");
    const chatBottom=document.querySelector<HTMLButtonElement>("[data-chat-bottom]");
    const chatBottomSentinel=document.querySelector<HTMLElement>("[data-chat-bottom-sentinel]");
    if(chatHistory&&chatBottom){
      const setChatBottomVisible=(visible:boolean)=>{
        chatBottom.classList.toggle("is-hidden",!visible);
      };
      const scrollToChatBottom=()=>{
        chatHistory.scrollTo({top:chatHistory.scrollHeight,behavior:"smooth"});
      };
      chatBottom.addEventListener("click",scrollToChatBottom);
      const syncChatBottom=()=>{
        const distance=chatHistory.scrollHeight-chatHistory.clientHeight-chatHistory.scrollTop;
        setChatBottomVisible(distance>1);
      };
      if(chatBottomSentinel&&"IntersectionObserver" in window){
        const observer=new IntersectionObserver(entries=>{
          const entry=entries[0];
          const overflowing=chatHistory.scrollHeight>chatHistory.clientHeight+1;
          setChatBottomVisible(overflowing&&!entry?.isIntersecting);
        },{root:chatHistory,threshold:0.99});
        observer.observe(chatBottomSentinel);
        chatHistory.addEventListener("scroll",syncChatBottom,{passive:true});
        requestAnimationFrame(syncChatBottom);
      }else{
        chatHistory.addEventListener("scroll",syncChatBottom,{passive:true});
        requestAnimationFrame(syncChatBottom);
      }
    }
    document.querySelector("[data-chat-retry]")?.addEventListener("click",()=>void loadTelegramChatStatus());
    document.querySelector("#telegram-connect-form")?.addEventListener("submit",e=>{e.preventDefault();const input=document.querySelector<HTMLInputElement>("#telegram-auth-input");const value=input?.value.trim()||"";if(telegramAuthStep==="phone"){telegramAuthPhone=value;void submitTelegramConnect();}else if(telegramAuthStep==="code")void submitTelegramCode(value);else if(telegramAuthStep==="password")void submitTelegramPassword(value);});
    const telegramMessageInput=document.querySelector<HTMLInputElement>("#telegram-message-input");
    telegramMessageInput?.addEventListener("pointerdown",e=>{e.stopPropagation();});
    telegramMessageInput?.addEventListener("click",e=>{e.stopPropagation();window.setTimeout(()=>telegramMessageInput.focus(),0);});
    document.querySelector("#telegram-message-form")?.addEventListener("submit",async e=>{e.preventDefault();const input=document.querySelector<HTMLInputElement>("#telegram-message-input");const message=input?.value.trim()||"";if(!message||!telegramSelectedChatId)return;try{await telegramChatClient.sendMessage(telegramSelectedChatId,message);recordChatMessage(portalProfile);if(input)input.value="";await loadTelegramMessages(telegramSelectedChatId);await loadTelegramChats();}catch(error){telegramChatError=error instanceof Error?error.message:"TELEGRAM_SEND_FAILED";render();}});
  }
  if(view==="library"){
    bindLibraryView();
    try{
      if(sessionStorage.getItem("freezzz:library:resume-on-open")==="1"){
        sessionStorage.removeItem("freezzz:library:resume-on-open");
        void resumeLastPlayedGame();
      }
    }catch{}
  }
}

function chatEmoji(m:{author:string;message:string}):string{
  if(m.author==="FREEzzzBot")return "🤖";
  const text=m.message.toLowerCase();
  if(text.includes("игр")||text.includes("game"))return "🎮";
  if(text.includes("стрим")||text.includes("live"))return "📺";
  if(text.includes("радио")||text.includes("music"))return "🎵";
  if(text.includes("спасибо"))return "🙏";
  return "💬";
}
function escapeHtml(s:string){
  return s.replace(/[&<>"']/g,function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]||c;
  });
}



render();
if(view==="home"&&!radioStations.length&&!radioLoading&&!radioError)void loadRadioStations();
