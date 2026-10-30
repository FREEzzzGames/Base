import { RadioBrowserClient, type RadioBrowserStation } from "./radio-browser";
import "./styles.css";
import { initFreezzzyDroid } from "./freezzzy-droid";
import "./zenith-os.css";
import "./performance-layer";
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
import { createTelegramChatClient, type TelegramChat, type TelegramMessage } from "./chat/telegram-client";
import { renderLibrary, bindLibraryView, resumeLastPlayedGame, stopLibraryEmulator } from "./library-emulator";
import { renderOpenGamesCatalog, bindOpenGamesCatalog, stopOpenGamesSession } from "./open-games-catalog";
import { mountRadioMap } from "./radio-map";
import { renderWorldRadioPanel, bindWorldRadioPanel } from "./world-radio-panel";

initTelegramBridge();
initFreezzzyDroid();

async function checkForPortalUpdate(){
  try{
    const response=await fetch("./version.json?ts="+Date.now(),{
      cache:"no-store",
      headers:{Accept:"application/json"},
      signal:AbortSignal.timeout(5000)
    });
    if(!response.ok)return;
    const remote=await response.json() as {version?:string;build?:string};
    if(!remote.build||remote.build===PORTAL_BUILD_ID)return;

    const url=new URL(window.location.href);
    // Prevent a reload loop when sessionStorage is blocked in a WebView.
    if(url.searchParams.get("freezzz_build")===remote.build)return;
    const seenKey="freezzz:update-reload";
    try{
      if(sessionStorage.getItem(seenKey)===remote.build)return;
      sessionStorage.setItem(seenKey,remote.build);
    }catch{
      // URL guard above remains the fallback when WebView storage is unavailable.
    }
    try{localStorage.setItem("freezzz:build",remote.build);}catch{
      // The build marker is informational; it must not block the update.
    }
    url.searchParams.set("freezzz_build",remote.build);
    url.searchParams.set("freezzz_refresh",String(Date.now()));
    window.location.replace(url.toString());
  }catch{
    // Update discovery is best-effort and must never block application startup.
  }
}
void checkForPortalUpdate();

type View = PortalView;
type Language="RU"|"DE"|"EN";

const app=document.querySelector<HTMLDivElement>("#app")!;
const overlayRoute=new URLSearchParams(window.location.search).get("freezzzOverlay");
const initialView:View=overlayRoute==="live"||overlayRoute==="radio" ? overlayRoute : "home";
const initialPlatformState=createPlatformState({view:initialView,language:"RU",telegram:Boolean(getTelegramWebApp())});
const portalEvents=new PortalEventBus();
const moduleManager=new PortalModuleManager();
const zenithKernel=new ZenithOSKernel({modules:moduleManager,initial:{view:initialView,language:"RU",telegram:initialPlatformState.telegram,online:initialPlatformState.online}});
moduleManager.setErrorHandler((moduleView,phase,error)=>{
  console.error("[FREEzzz module lifecycle]",moduleView,phase,error);
});
let view:View=initialView;
let lang:Language=(()=>{try{const saved=localStorage.getItem("freezzz:language");if(saved==="RU"||saved==="DE"||saved==="EN")return saved;}catch{}return "RU";})();
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
try{
  if(!localStorage.getItem("freezzz:language")){
    const code=verifiedTelegramIdentity?.languageCode?.toUpperCase()||"";
    if(code.startsWith("DE"))lang="DE";
    else if(code.startsWith("EN"))lang="EN";
  }
}catch{ /* WebView storage may be disabled; keep the default language. */ }
zenithKernel.setLanguage(lang);
let portalProfile:PortalProfile=loadPortalProfile(verifiedTelegramIdentity);
syncPortalIdentity(portalProfile,verifiedTelegramIdentity);
startPortalSession(portalProfile);
let activityLastFlushAt=Date.now();
let gameActivityStartedAt:number|null=zenithKernel.snapshot.view==="game"?Date.now():null;
let liveActivityStartedAt:number|null=null;
let radioActivityStartedAt:number|null=null;
const liveActivityNames=new Set<string>();
let radioActivityName="";
let livePopups:LivePopupState[]=[];
let liveAudioPriority=false;
const PORTAL_NICKNAME="d3tr01t";
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
    telegramChatStatus=status.loginError?"error":status.connected?"connected":"disconnected";
    if(status.loginError){
      telegramChatError=status.loginError;
    }else if(status.connected){
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

let radioStations:readonly RadioBrowserStation[]=[];
const radioBrowserClient=new RadioBrowserClient();
let radioRandomLoading=false;
let radioAudio:HTMLAudioElement|null=null;
let radioSelectedId=(()=>{try{return localStorage.getItem("freezzz:radio:selected")||"";}catch{return "";}})();
let radioPlaybackStatus:"idle"|"loading"|"playing"|"paused"|"stopped"|"failed"="idle";
let radioHomePopupOpen=false;
window.addEventListener("keydown",event=>{if(event.key==="Escape"&&radioHomePopupOpen){radioHomePopupOpen=false;render();}});

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
    ["library","library","LIBRARY"],
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
        <a class="portal-toolbar-item portal-toolbar-studio" href="./procedural-studio.html" style="text-decoration:none" aria-label="STUDIO" title="FREEzzz Procedural Studio">${icon("editor","portal-toolbar-icon")}<span class="portal-toolbar-label">STUDIO</span></a>
      </div>
    </div>
  </nav>`;
}
let lastRenderedView:View|null=null;

function renderRadioHomePopup():string{
  if(!radioHomePopupOpen)return "";
  return `<div class="radio-home-popup-backdrop" data-radio-popup-backdrop role="presentation">
    <section class="radio-home-popup" role="dialog" aria-modal="true" aria-label="Radio world map" data-radio-map-root>
      <header class="radio-home-popup-header"><span class="radio-home-popup-brand"><i></i> WORLD RADIO</span><button type="button" data-radio-popup-close aria-label="Close radio">×</button></header>
      <div class="radio-map-canvas" id="radio-world-map"></div>
      <div class="radio-map-top"><input class="radio-map-search" data-radio-search type="search" placeholder="Search station or country" aria-label="Search station or country" autocomplete="off"><span class="radio-map-count" data-radio-count>LOADING</span></div>
      <div class="radio-map-player" role="region" aria-label="Radio player"><div class="radio-map-player-info"><span class="radio-map-live-dot"></span><div class="radio-map-station-text"><strong data-radio-station>Choose a station</strong><small data-radio-country>WORLDWIDE</small></div></div><span class="radio-map-status" data-radio-status>LOADING WORLD RADIO…</span><div class="radio-map-player-controls"><button type="button" data-radio-play aria-label="Play or pause">▶</button><button type="button" data-radio-stop aria-label="Stop radio">■</button></div></div>
    </section></div>`;
}

function render(){
  const previousRenderedView=lastRenderedView;
  let body="";

  if(view==="home"){
    body=`
      <div class="content portal-layout home-portal" data-portal-layout="home" data-home-pager>
        <div class="home-screen-track" data-home-screen-track>
          <section class="home-screen-page" data-home-screen="0" aria-label="Основные модули и медиа">
            <div class="home-screen-grid" data-home-grid="0">
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
              ${homeCard("game")}
              ${homeCard("live")}
              ${homeCard("chat")}
              ${homeCard("radio")}
              ${homeCard("library")}
            </div>
          </section>
          <section class="home-screen-page home-catalog-page" data-home-screen="1" aria-label="Каталог всех модулей">
            <header class="home-catalog-heading"><span>MODULES / КАТАЛОГ</span><small>ALL TOOLS · CREATIVE · LABS · GAMES</small></header>
            <div class="home-screen-grid" data-home-grid="1">
              <a class="card home-card portal-block home-studio" href="./procedural-studio.html" style="position:relative;background:linear-gradient(135deg,#071c27,#11182a);border:1px solid #20f4e7;text-decoration:none" data-portal-card="studio" data-portal-block="studio" aria-label="FREEzzz Procedural Studio"><span class="home-card-title" style="top:12px;left:12px;font-size:clamp(20px,4vw,40px)!important">FREEzzz STUDIO</span><span style="position:absolute;left:13px;bottom:12px;color:#20f4e7;font-size:11px;letter-spacing:1.5px">PROCEDURAL MUSIC · WAV EXPORT</span></a>
              ${homeModuleCard("drive-and-listen","DRIVE & LISTEN","VIRTUAL CITIES · LOCAL RADIO","./drive-and-listen.html","♫")}
              ${homeModuleCard("echo9","ECHO-9","SCI-FI · ANIMATION · STORY","./echo9.html","✧")}
              ${homeModuleCard("notable-people","NOTABLE PEOPLE","PEOPLE · BIRTHPLACES · WORLD MAP","./notable-people.html","◎")}
              ${homeModuleCard("townscaper","TOWNSCAPER","BUILD A QUIET ISLAND TOWN","./townscaper.html","▦")}
              ${homeModuleCard("3d-svg-designer","3D SVG DESIGNER","VECTOR → 3D · EXPORT MODELS","./3d-svg-designer.html","◇")}
              ${homeModuleCard("photext-shop","PHOTEXT SHOP","PHOTO TEXT EDITOR · IMAGE TOOLS","./photext-shop.html","▧")}
              ${homeModuleCard("watabou","WATABOU PROCGEN","PROCEDURAL CITIES · DUNGEONS · WORLDS","./watabou.html","⌖")}
              ${homeModuleCard("anvaka","ANVAKA · MAP OF GITHUB","GITHUB GALAXY · OPEN SOURCE MAP","./anvaka.html","✳")}
              ${homeModuleCard("emupedia","EMUPEDIA","RETRO GAMES · EMULATORS · EMUOS","./emupedia.html","▣")}
              ${homeModuleCard("retro-tv","RETRO TV","VINTAGE CHANNELS · 50s–2000s","./retro-tv.html","▰")}
              ${homeModuleCard("orbit-blueprint","ORBIT BLUEPRINT","SPACECRAFT · ORBITAL DESIGN","./orbit-blueprint.html","◌")}
              ${homeModuleCard("retro-console","RETRO CONSOLE","CLASSIC GAMES · CONSOLE LAB","./retro-console.html","▣")}

              <a class="card home-card portal-block home-shadowos" href="./games/shadow-os/index.html" data-portal-card="shadowos" data-portal-block="shadowos" aria-label="ShadowOS: Теневая Дипломатия" style="position:relative;overflow:hidden;background:linear-gradient(135deg,#070c09,#101a13 62%,#18261a);border:1px solid #a6ff83;text-decoration:none;min-height:150px">
                <span class="home-card-title" style="top:12px;left:12px;font-size:clamp(22px,4.8vw,40px)!important;letter-spacing:.08em;color:#a6ff83">SHADOWOS</span>
                <span style="position:absolute;left:13px;bottom:31px;color:#c4d6c8;font:10px ui-monospace,monospace;letter-spacing:1px">ТЕНЕВАЯ ДИПЛОМАТИЯ</span>
                <span style="position:absolute;left:13px;bottom:12px;color:#a6ff83;font:9px ui-monospace,monospace;letter-spacing:1.2px">2007—2027 · SECURE NODE ↗</span>
              </a>
              <a class="card home-card portal-block home-osiris" href="https://osirisai.live/" target="_blank" rel="noopener noreferrer" data-portal-card="osiris" data-portal-block="osiris" aria-label="OSIRIS AI LIVE" style="position:relative;overflow:hidden;background:#030711;border:1px solid #63eaff;text-decoration:none;min-height:150px">
                ${persistentBackgroundVideo("osiris","./videos/hud-background.mp4","home-card-background-video")}
                <span class="home-card-background-overlay" aria-hidden="true"></span>
                <span class="home-card-title" style="top:12px;left:12px;font-size:clamp(24px,5vw,44px)!important;letter-spacing:.12em">OSIRIS</span>
                <span class="osiris-card-label">GLOBAL MONITOR</span>
                <span class="osiris-card-open">OPEN ↗</span>
              </a>
              <a class="card home-card portal-block home-phet-lab" href="./phet-lab.html" data-portal-card="phet-lab" data-portal-block="phet-lab" aria-label="PHET LAB" style="position:relative;overflow:hidden;background:linear-gradient(135deg,#071a24,#111d2b 68%,#193b3b);border:1px solid #a6ff83;text-decoration:none;min-height:150px">
                <span class="home-card-title" style="top:12px;left:12px;font-size:clamp(22px,4.8vw,40px)!important;letter-spacing:.08em">PhET LAB</span>
                <span style="position:absolute;left:13px;bottom:12px;color:#a6ff83;font:10px ui-monospace,monospace;letter-spacing:1.2px">112 SCIENCE SIMULATIONS · HTML5</span>
              </a>
              <a class="card home-card portal-block home-economy-lab" href="./economy-lab.html" data-portal-card="economy-lab" data-portal-block="economy-lab" aria-label="ECONOMY LAB" style="position:relative;overflow:hidden;background:linear-gradient(135deg,#07191f,#10151e 68%,#142c2b);border:1px solid #66fcf1;text-decoration:none;min-height:150px">
                <span class="home-card-title" style="top:12px;left:12px;font-size:clamp(22px,4.8vw,40px)!important;letter-spacing:.08em">ECONOMY LAB</span>
                <span style="position:absolute;left:13px;bottom:12px;color:#66fcf1;font:10px ui-monospace,monospace;letter-spacing:1.2px">OPEN MODELS · ECONOMIC SIMULATION</span>
              </a>
              ${homeModuleCard("electronics-lab","ELECTRONICS LAB","ARDUINO · ESP32 · WOKWI","./electronics-lab.html","⌁")}
              ${homeModuleCard("old-maps-online","OLD MAPS ONLINE","HISTORICAL MAPS · GEOSEARCH","./old-maps-online.html","⌖")}
              ${homeModuleCard("animagraffs","ANIMAGRAFFS","ANIMATED EXPLAINERS · HOW IT WORKS","./animagraffs.html","◉")}
              ${homeModuleCard("demo-formula","DEMO FORMULA","FORMULA · WEBGL · INTERACTIVE","./demo-formula.html","▶")}
              ${homeModuleCard("shadow-diplomacy","SHADOW DIPLOMACY","TACTICAL STRATEGY · SHADOWOS UNIVERSE","./games/shadow-diplomacy/index.html","⬈")}

            </div>
          </section>
        </div>
        <nav class="home-screen-pagination" aria-label="Экраны главного меню" data-home-pagination>
          <button type="button" data-home-page="0" aria-label="Главная" aria-current="page">HOME</button>
          <button type="button" data-home-page="1" aria-label="Каталог модулей">MODULES</button>
        </nav>
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
    body=renderWorldRadioPanel(lang);
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
      ${renderRadioHomePopup()}
    </div>`;

  if(view==="home") applyHomeBentoRules();
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
function homeModuleCard(key:string,title:string,description:string,href:string,mark:string):string{
  return `<a class="card home-card portal-block home-module-card home-module-${key}" href="${href}" data-portal-card="${key}" data-portal-block="${key}" aria-label="${title}">
    <span class="home-module-mark" aria-hidden="true">${mark}</span>
    <span class="home-card-title">${title}</span>
    <span class="home-module-description">${description}</span>
  </a>`;
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
  const titles:Record<string,string>={live:"LIVE",chat:"CHAT",game:"GAME",radio:"RADIO",library:"LIBRARY",};
  const title=titles[v];
  return `<div class="card home-card portal-block home-${v}" data-portal-card="${v}" data-portal-block="${v}" data-view="${v}" role="button" tabindex="0" aria-label="${title}">
    ${background?`${persistentBackgroundVideo("card-"+v,background,"home-card-background-video")}`:""}
    <span class="home-card-title">${title}</span>
  </div>`;
}
type SharedRadioStation={stationuuid:string;name:string;url:string;url_resolved?:string;country?:string};
let radioExternalStation:SharedRadioStation|null=null;
let radioRandomStationId="";
function shuffleRadioStations(stations:readonly RadioBrowserStation[],excludeId=""):RadioBrowserStation[]{
  const candidates=stations.filter(station=>station.stationuuid!==excludeId);
  for(let i=candidates.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [candidates[i],candidates[j]]=[candidates[j],candidates[i]];
  }
  return candidates;
}
async function playRadioStream(station:SharedRadioStation,isRandom=false):Promise<boolean>{
  if(liveAudioPriority){radioAudio?.pause();endRadioActivity();return false;}
  radioSelectedId=station.stationuuid;
  radioExternalStation=station;
  radioRandomStationId=isRandom?station.stationuuid:"";
  try{
    localStorage.setItem("freezzz:radio:selected",radioSelectedId);
    localStorage.setItem("freezzz:radio:selected-station",JSON.stringify(station));
  }catch{}
  endRadioActivity();
  const previous=radioAudio;
  if(previous){previous.pause();previous.removeAttribute("src");previous.load();}
  const audio=new Audio(station.url_resolved||station.url);
  radioAudio=audio;
  audio.preload="none";
  audio.dataset.station=station.name;
  setRadioPlaybackStatus("loading");
  audio.addEventListener("playing",()=>{
    if(radioAudio!==audio)return;
    setRadioPlaybackStatus("playing");
    beginRadioActivity(station.name);
  });
  audio.addEventListener("pause",()=>{
    if(radioAudio===audio&&radioPlaybackStatus==="playing")setRadioPlaybackStatus("paused");
  });
  audio.addEventListener("error",()=>{
    if(radioAudio!==audio)return;
    setRadioPlaybackStatus("failed");
    if(isRandom&&!radioRandomLoading)void playRandomRadioStation(station.stationuuid);
  },{once:true});
  try{
    await audio.play();
    if(radioAudio!==audio)return false;
    setRadioPlaybackStatus("playing");
    return true;
  }catch{
    if(radioAudio===audio)setRadioPlaybackStatus("failed");
    return false;
  }
}
async function playRandomRadioStation(excludeId=""){
  if(radioRandomLoading||liveAudioPriority)return;
  radioRandomLoading=true;
  setRadioPlaybackStatus("loading");
  try{
    const stations=await radioBrowserClient.searchStations("","",100);
    if(!stations.length)throw new Error("NO_RADIO_STATIONS");
    radioStations=stations;
    const candidates=shuffleRadioStations(stations,excludeId);
    if(!candidates.length)throw new Error("NO_ALTERNATE_RADIO_STATIONS");
    for(const station of candidates){
      const started=await playRadioStream({
        stationuuid:station.stationuuid,name:station.name,url:station.url,
        url_resolved:station.url_resolved,country:station.country
      },true);
      if(started)return;
    }
    setRadioPlaybackStatus("failed");
  }catch{
    setRadioPlaybackStatus("failed");
  }finally{
    radioRandomLoading=false;
  }
}
function playRadioStation(id:string){
  const station=radioStations.find(s=>s.stationuuid===id)|| (radioExternalStation?.stationuuid===id?radioExternalStation:null);
  if(station){playRadioStream(station);return;}
  try{
    const saved=JSON.parse(localStorage.getItem("freezzz:radio:selected-station")||"null") as SharedRadioStation|null;
    if(saved?.stationuuid===id&&saved.url){playRadioStream(saved);return;}
  }catch{}
  void playRandomRadioStation();
}
window.addEventListener("freezzz:radio-select",event=>{
  const station=(event as CustomEvent<SharedRadioStation>).detail;
  if(!station?.stationuuid||!station.name||!(station.url_resolved||station.url))return;
  void playRadioStream(station);
});

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
window.addEventListener("freezzz:radio-open-fullscreen",()=>{
  radioHomePopupOpen=false;
  portalEvents.emit("navigation:changed",{view:"radio"});
});
window.addEventListener("freezzz:radio-volume",event=>{
  const volume=Number((event as CustomEvent<{volume?:number}>).detail?.volume);
  if(radioAudio&&Number.isFinite(volume))radioAudio.volume=Math.max(0,Math.min(1,volume));
});
window.addEventListener("freezzz:radio-mini",event=>{
  const action=(event as CustomEvent<{action?:string}>).detail?.action;
  if(action==="play"){
    if(radioAudio&&!radioAudio.paused){
      radioAudio.pause();
      endRadioActivity();
      setRadioPlaybackStatus("paused");
    }else if(radioAudio&&radioAudio.paused&&radioPlaybackStatus!=="stopped"&&radioPlaybackStatus!=="failed"){
      void radioAudio.play().then(()=>setRadioPlaybackStatus("playing")).catch(()=>setRadioPlaybackStatus("failed"));
    }else if(radioSelectedId)playRadioStation(radioSelectedId);
    else void playRandomRadioStation();
  }
  if(action==="pause"){endRadioActivity();radioAudio?.pause();setRadioPlaybackStatus("paused");}
  if(action==="stop"){endRadioActivity();if(radioAudio){radioAudio.pause();radioAudio.currentTime=0;}setRadioPlaybackStatus("stopped");}
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
  render();
});
window.addEventListener("resize",()=>{ if(view==="home")render(); });
window.addEventListener("online",()=>zenithKernel.patchSystemState({online:true}));
window.addEventListener("offline",()=>zenithKernel.patchSystemState({online:false}));
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

function applyHomeBentoRules(){
  const grids=document.querySelectorAll<HTMLElement>(".home-portal[data-home-pager] .home-screen-grid");
  grids.forEach(grid=>{
    grid.querySelectorAll<HTMLElement>("[data-portal-block]").forEach(card=>{
      if(card.hasAttribute("data-grid-size")) return;
      const title=card.querySelector<HTMLElement>(".home-card-title")?.textContent?.trim()
        || card.getAttribute("aria-label")?.trim()
        || card.dataset.portalCard
        || "";
      const normalized=title.replace(/\\s+/g," ").toUpperCase();
      const longTitle=normalized.length>=9 || /FOOTPULSE|WATABOU|PROCGEN|3D SVG|DRIVE & LISTEN/.test(normalized);
      if(longTitle){
        card.dataset.gridSize="s";
        card.dataset.bentoAuto="1";
      }
    });
  });
}
function updateHomeClock(){
  if(view!=="home")return;
  const clock=document.querySelector<HTMLElement>("[data-home-clock]");
  if(!clock)return;
  clock.textContent=new Date().toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false});
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
  if(radioHomePopupOpen)mountRadioMap();
  if(view==="radio")bindWorldRadioPanel(()=>{requestAnimationFrame(()=>mountRadioMap());});
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
  document.querySelectorAll<HTMLElement>(".home-card[data-view]").forEach(function(x){
    const navigate=()=>{
      const next=x.dataset.view as View;
      if(!next||!moduleManager.has(next))return;
      if(next==="radio"){radioHomePopupOpen=true;render();return;}
      portalEvents.emit("navigation:changed",{view:next});
    };
    x.addEventListener("click",function(e){e.preventDefault();e.stopPropagation();navigate();});
    x.addEventListener("keydown",function(e){if(e.key!=="Enter"&&e.key!==" ")return;e.preventDefault();e.stopPropagation();navigate();});
  });
  document.querySelectorAll<HTMLElement>("[data-radio-popup-close]").forEach(x=>x.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();radioHomePopupOpen=false;render();}));
  document.querySelector<HTMLElement>("[data-radio-popup-backdrop]")?.addEventListener("click",e=>{if(e.target===e.currentTarget){radioHomePopupOpen=false;render();}});
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
