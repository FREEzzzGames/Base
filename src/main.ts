import type { RadioBrowserClient, RadioBrowserStation } from "./radio-browser";
import { RADIO_GENRES } from "./radio-config";
import "./styles.css";
import "./multi-window-portal";
import { portalVideoUrl } from "./video-assets";
import { PORTAL_BUILD_ID } from "./build-info";
import { icon, streams, streamAvatarSources } from "./portal-ui";
import { bindTelegramBackButton, getTelegramWebApp, initTelegramBridge, openExternalUrl, verifyTelegramSession, type TelegramVerifiedIdentity } from "./platform-bridge";
import { renderLivePopup } from "./live-runtime";
import { renderGame, loadGameState, chooseRace, applyGameChoice, restartGame, type GameTab, type GameRace, type GameLanguage } from "./game-system";
import { PortalModuleManager, PortalEventBus, createPlatformState, type PortalView } from "./core/portal-core";
import { pt } from "./portal-i18n";
import { createMihiModule } from "./mihi/mihi-module";
import { loadPortalProfile, syncPortalIdentity, startPortalSession, recordLiveVisit, addLiveWatchTime, recordGameLaunch, addGameTime, recordRadioVisit, addRadioListenTime, recordChatMessage, formatDuration, type PortalProfile } from "./profile-store";
import { loadHomeLayout, saveHomeLayout, defaultHomeLayout, layoutRects, resizeHomeBoundary, swapHomeBlocks, type HomeBlockId, type HomeLayoutMode, type HomeLayoutState, type ResizeEdge } from "./home-layout";

initTelegramBridge();

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
type PortalSessionSnapshot={view:View;gameTab:GameTab;profileOpen:boolean;};
const PORTAL_SESSION_KEY="freezzz:session-state:v1";
function loadPortalSessionSnapshot():Partial<PortalSessionSnapshot>{
  try{
    const raw=sessionStorage.getItem(PORTAL_SESSION_KEY);
    if(!raw)return {};
    const parsed=JSON.parse(raw) as Partial<PortalSessionSnapshot>;
    return parsed&&typeof parsed==="object"?parsed:{};
  }catch{return {};}
}
const portalSession=loadPortalSessionSnapshot();
const portalState=createPlatformState({view:"home",language:"RU",telegram:Boolean(getTelegramWebApp())});
const portalEvents=new PortalEventBus();
const moduleManager=new PortalModuleManager();
const mihi=createMihiModule(portalEvents);
let view:View=portalState.view;
let lang:Language=(()=>{try{const saved=localStorage.getItem("freezzz:language");if(saved==="RU"||saved==="DE"||saved==="EN")return saved;}catch{}return portalState.language;})();
const T=(key:string)=>pt(lang,key);
let profileOpen=false;
let languageMenuOpen=false;
const telegramAuth=await verifyTelegramSession();
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
let liveActivityName="";
let radioActivityName="";
let liveSelected="";
let livePopupOpen=false;
let livePopupSource:"twitch"|"youtube"="twitch";
let hudHidden=false;
let hudGestureBound=false;
let homeLayout:HomeLayoutState=loadHomeLayout();
let homeLayoutEditMode=false;
let homeLayoutCustomized=false;
let homeLayoutPointer:{id:HomeBlockId;startX:number;startY:number;edge?:ResizeEdge;active:boolean}={id:"hero",startX:0,startY:0,active:false};
let homeLayoutModeAtRender:HomeLayoutMode=window.innerWidth<=699?"mobile":"desktop";
try{homeLayoutCustomized=localStorage.getItem("freezzz:home-layout-customized")==="1";}catch{}
let homeLayoutTap:{id:HomeBlockId;time:number;x:number;y:number}|null=null;
let homeLayoutTapTimer:number|null=null;
let homeLayoutSuppressClick=false;
let homeLayoutFocusedBlock:HomeBlockId|null=null;
let chatMessages:Array<{author:string;message:string}>=[{author:"FREEzzzBot",message:T("welcome")}];
let gameState=loadGameState();
let gameTab:GameTab=(portalSession.gameTab==="character"||portalSession.gameTab==="skills"||portalSession.gameTab==="achievements"||portalSession.gameTab==="journal"||portalSession.gameTab==="quests"||portalSession.gameTab==="shop"?portalSession.gameTab:"story") as GameTab;
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
function setRadioPlaybackStatus(status:typeof radioPlaybackStatus){
  radioPlaybackStatus=status;
  portalEvents.emit("radio:playback",{status});
}

function openLivePopup(name:string,source:"twitch"|"youtube"="twitch"):void{
  liveSelected=name;
  livePopupSource=source;
  livePopupOpen=true;
  beginLiveActivity(name);
  portalEvents.emit("live:popup",{open:true,source});
  render();
}
function closeLivePopup():void{
  endLiveActivity();
  livePopupOpen=false;
  portalEvents.emit("live:popup",{open:false,source:livePopupSource});
  render();
}
function flushActivityTracking(){
  const now=Date.now();
  const elapsed=Math.max(0,(now-activityLastFlushAt)/1000);
  activityLastFlushAt=now;
  if(view==="game"&&gameActivityStartedAt!==null)addGameTime(portalProfile,elapsed);
  if(liveActivityStartedAt!==null&&liveActivityName){addLiveWatchTime(portalProfile,liveActivityName,elapsed);liveActivityStartedAt=now;}
  if(radioActivityStartedAt!==null&&radioActivityName){addRadioListenTime(portalProfile,radioActivityName,elapsed);radioActivityStartedAt=now;}
}
function beginGameActivity(){if(gameActivityStartedAt!==null)return;gameActivityStartedAt=Date.now();recordGameLaunch(portalProfile);}
function endGameActivity(){if(gameActivityStartedAt===null)return;flushActivityTracking();gameActivityStartedAt=null;}
function beginLiveActivity(name:string){if(liveActivityStartedAt!==null&&liveActivityName===name)return;if(liveActivityStartedAt!==null)flushActivityTracking();liveActivityName=name;liveActivityStartedAt=Date.now();recordLiveVisit(portalProfile,name);}
function endLiveActivity(){if(liveActivityStartedAt===null)return;flushActivityTracking();liveActivityStartedAt=null;liveActivityName="";}
function beginRadioActivity(name:string){if(radioActivityStartedAt!==null&&radioActivityName===name)return;if(radioActivityStartedAt!==null)flushActivityTracking();radioActivityName=name;radioActivityStartedAt=Date.now();recordRadioVisit(portalProfile,name);}
function endRadioActivity(){if(radioActivityStartedAt===null)return;flushActivityTracking();radioActivityStartedAt=null;radioActivityName="";}
function profileDisplayName(){const u=portalProfile.identity;return [u.firstName,u.lastName].filter(Boolean).join(" ")||u.username||"FREEzzz user";}
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
    <div class="profile-identity">${avatar}<div><h2>${escapeHtml(profileDisplayName())}</h2>${u.username?`<p>@${escapeHtml(u.username)}</p>`:"<p>Telegram profile</p>"}<small>${u.id?`Telegram ID · ${escapeHtml(String(u.id))}`:"Telegram identity not available"}</small></div></div>
    <div class="profile-stat-grid"><div><b>${s.sessions}</b><small>Сессий</small></div><div><b>${s.game.launches}</b><small>Запусков GAME</small></div><div><b>${formatDuration(s.game.seconds)}</b><small>Время GAME</small></div><div><b>${formatDuration(s.live.totalSeconds)}</b><small>Просмотр LIVE</small></div><div><b>${formatDuration(s.radio.totalSeconds)}</b><small>Радио</small></div><div><b>${s.chat.messagesSent}</b><small>Сообщений CHAT</small></div></div>
    <div class="profile-section"><h3>LIVE</h3>${liveHtml}</div>
    <div class="profile-section"><h3>RADIO</h3>${radioHtml}</div>
    <div class="profile-section"><h3>GAME</h3><div class="profile-row"><span>Игровое время</span><small>${formatDuration(s.game.seconds)}</small></div><div class="profile-row"><span>Запуски</span><small>${s.game.launches}</small></div></div>
    
  </section></div>`;
}
function savePortalSessionSnapshot(){
  try{
    sessionStorage.setItem(PORTAL_SESSION_KEY,JSON.stringify({
      view,
      gameTab,
      profileOpen
    } satisfies PortalSessionSnapshot));
  }catch{}
}

function currentHomeLayoutMode():HomeLayoutMode{
  return window.innerWidth<=699?"mobile":"desktop";
}
function homeLayoutIsDefault():boolean{
  return !homeLayoutCustomized;
}
function markHomeLayoutCustomized():void{
  homeLayoutCustomized=true;
  try{localStorage.setItem("freezzz:home-layout-customized","1");}catch{}
}
function homeLayoutHandles():string{
  return `<span class="home-layout-resize-handle home-layout-resize-left" data-layout-resize="left" aria-hidden="true"></span><span class="home-layout-resize-handle home-layout-resize-right" data-layout-resize="right" aria-hidden="true"></span><span class="home-layout-resize-handle home-layout-resize-top" data-layout-resize="top" aria-hidden="true"></span><span class="home-layout-resize-handle home-layout-resize-bottom" data-layout-resize="bottom" aria-hidden="true"></span>`;
}
function homeLayoutBlockAttrs(id:HomeBlockId):string{
  const focused=homeLayoutEditMode&&homeLayoutFocusedBlock===id?"1":"0";
  return `data-home-layout-block="${id}" data-home-layout-focused="${focused}"`;
}
function applyHomeLayoutGeometry(){
  if(view!=="home")return;
  const custom=homeLayoutEditMode||!homeLayoutIsDefault();
  const home=document.querySelector<HTMLElement>(".home-portal");
  if(!home)return;
  home.dataset.homeLayoutActive=custom?"1":"0";
  if(!custom)return;
  const gap=1.5;
  for(const rect of layoutRects(homeLayout[currentHomeLayoutMode()])){
    const el=document.querySelector<HTMLElement>(`[data-home-layout-block="${rect.id}"]`);
    if(!el)continue;
    el.style.left=`calc(${rect.x}% + ${gap}px)`;
    el.style.top=`calc(${rect.y}% + ${gap}px)`;
    el.style.width=`calc(${rect.width}% - ${gap*2}px)`;
    el.style.height=`calc(${rect.height}% - ${gap*2}px)`;
  }
}
function beginHomeLayoutEdit(focus:HomeBlockId|null=null){
  if(view!=="home")return;
  homeLayoutEditMode=true;
  homeLayoutFocusedBlock=focus;
  render();
}
function resetHomeLayout(){
  homeLayout=defaultHomeLayout();
  homeLayoutCustomized=false;
  try{localStorage.removeItem("freezzz:home-layout-customized");}catch{}
  saveHomeLayout(homeLayout);
  homeLayoutEditMode=false;
  homeLayoutFocusedBlock=null;
  render();
}
function finishHomeLayoutEdit(){
  saveHomeLayout(homeLayout);
  homeLayoutEditMode=false;
  homeLayoutFocusedBlock=null;
  render();
}
function toggleHomeLayoutEdit(id:HomeBlockId){
  if(homeLayoutEditMode&&homeLayoutFocusedBlock===id){
    finishHomeLayoutEdit();
    return;
  }
  beginHomeLayoutEdit(id);
}
function bindHomeLayoutEditor(){
  if(view!=="home")return;
  const home=document.querySelector<HTMLElement>(".home-portal");
  if(!home)return;
  home.dataset.homeLayoutEdit=homeLayoutEditMode?"1":"0";
  document.querySelectorAll<HTMLElement>("[data-home-layout-block]").forEach(el=>{
    el.addEventListener("contextmenu",e=>e.preventDefault());
    el.addEventListener("pointerdown",e=>{
      if(e.pointerType==="mouse"&&e.button!==0)return;
      const id=el.dataset.homeLayoutBlock as HomeBlockId;
      if(!id)return;
      const now=Date.now();
      const previous=homeLayoutTap;
      const isSecond=Boolean(previous&&previous.id===id&&now-previous.time<=1200&&Math.hypot(e.clientX-previous.x,e.clientY-previous.y)<=48);
      if(homeLayoutEditMode){
        if(homeLayoutFocusedBlock!==id){
          if(isSecond){
            e.preventDefault();
            e.stopPropagation();
            if(homeLayoutTapTimer!==null)window.clearTimeout(homeLayoutTapTimer);
            homeLayoutTapTimer=null;
            homeLayoutTap=null;
            homeLayoutFocusedBlock=id;
            render();
          }
          return;
        }
        const edge=(e.target as HTMLElement).closest<HTMLElement>("[data-layout-resize]")?.dataset.layoutResize as ResizeEdge|undefined;
        e.preventDefault();
        e.stopPropagation();
        homeLayoutPointer={
          id,
          startX:e.clientX,
          startY:e.clientY,
          edge,
          active:true
        };
        el.setPointerCapture?.(e.pointerId);
        el.classList.toggle("home-layout-resizing",Boolean(edge));
        el.classList.toggle("home-layout-dragging",!edge);
        return;
      }
      if(isSecond){
        e.preventDefault();
        e.stopPropagation();
        if(homeLayoutTapTimer!==null)window.clearTimeout(homeLayoutTapTimer);
        homeLayoutTapTimer=null;
        homeLayoutTap=null;
        homeLayoutSuppressClick=true;
        toggleHomeLayoutEdit(id);
        return;
      }
      homeLayoutTap={id,time:now,x:e.clientX,y:e.clientY};
      homeLayoutSuppressClick=true;
      if(homeLayoutTapTimer!==null)window.clearTimeout(homeLayoutTapTimer);
      homeLayoutTapTimer=window.setTimeout(()=>{
        homeLayoutTap=null;
        homeLayoutTapTimer=null;
        homeLayoutSuppressClick=false;
        if(view!=="home")return;
        if(moduleManager.has(id as View))portalEvents.emit("navigation:changed",{view:id as View});
      },1200);
    });
    el.addEventListener("pointermove",e=>{
      if(!homeLayoutEditMode||!homeLayoutPointer.active||homeLayoutPointer.id!==el.dataset.homeLayoutBlock)return;
      const edge=homeLayoutPointer.edge;
      if(edge){
        const host=home.getBoundingClientRect();
        const delta=(edge==="left"||edge==="right")
          ?(e.clientX-homeLayoutPointer.startX)/Math.max(1,host.width)
          :(e.clientY-homeLayoutPointer.startY)/Math.max(1,host.height);
        const mode=currentHomeLayoutMode();
        const signed=(edge==="left"||edge==="top")?-delta:delta;
        homeLayout={...homeLayout,[mode]:resizeHomeBoundary(homeLayout[mode],homeLayoutPointer.id,edge,signed)};
        markHomeLayoutCustomized();
        homeLayoutPointer.startX=e.clientX;
        homeLayoutPointer.startY=e.clientY;
        applyHomeLayoutGeometry();
        return;
      }
      const target=document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLElement>("[data-home-layout-block]");
      if(target&&target!==el){
        el.dataset.homeLayoutOver=target.dataset.homeLayoutBlock||"";
      }else{
        delete el.dataset.homeLayoutOver;
      }
    });
    const finishPointer=(e:PointerEvent)=>{
      if(!homeLayoutPointer.active||homeLayoutPointer.id!==el.dataset.homeLayoutBlock)return;
      const edge=homeLayoutPointer.edge;
      homeLayoutPointer.active=false;
      el.classList.remove("home-layout-resizing","home-layout-dragging");
      delete el.dataset.homeLayoutOver;
      if(!edge){
        const target=document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLElement>("[data-home-layout-block]");
        const targetId=target?.dataset.homeLayoutBlock as HomeBlockId|undefined;
        if(targetId&&targetId!==homeLayoutPointer.id){
          const mode=currentHomeLayoutMode();
          homeLayout={...homeLayout,[mode]:swapHomeBlocks(homeLayout[mode],homeLayoutPointer.id,targetId)};
          markHomeLayoutCustomized();
        }
      }
      saveHomeLayout(homeLayout);
      render();
    };
    el.addEventListener("pointerup",finishPointer);
    el.addEventListener("pointercancel",finishPointer);
  });
}
function renderPortalToolbar(){
  const items:Array<[View,string,string]>=[
    ["home","home","HOME"],
    ["live","video","LIVE"],
    ["chat","chat","CHAT"],
    ["game","game","GAME"],
    ["library","library","LIBRARY"],
    ["radio","radio","RADIO"]
  ];
  return `<nav class="portal-toolbar" aria-label="FREEzzz navigation">
    <video class="portal-toolbar-background-video" autoplay muted loop playsinline preload="metadata" aria-hidden="true"><source src="${portalVideoUrl("hud")}" type="video/mp4"></video>
    <div class="portal-toolbar-main">
      <div class="portal-toolbar-nav" role="tablist">
        ${items.map(([target,iconName,label])=>`<button class="portal-toolbar-item ${view===target?"active":""}" data-view="${target}" type="button" role="tab" aria-selected="${view===target}" aria-label="${label}" title="${label}">${icon(iconName,"portal-toolbar-icon")}</button>`).join("")}
        <div class="portal-toolbar-language-wrap">
          <button class="portal-toolbar-language-button" data-language-toggle type="button" aria-label="${T("language")}" title="${T("language")}" aria-expanded="${languageMenuOpen}">${icon("languages","portal-toolbar-icon")}</button>
          <div class="portal-toolbar-language-menu" data-language-menu ${languageMenuOpen?"":"hidden"}>
            <button type="button" data-lang="RU" class="${lang==="RU"?"active":""}" aria-pressed="${lang==="RU"}">RU</button>
            <button type="button" data-lang="DE" class="${lang==="DE"?"active":""}" aria-pressed="${lang==="DE"}">DE</button>
            <button type="button" data-lang="EN" class="${lang==="EN"?"active":""}" aria-pressed="${lang==="EN"}">EN</button>
          </div>
        </div>
      </div>
    </div>
  </nav>`;
}

function render(){
  savePortalSessionSnapshot();
  let body="";

  if(view==="home"){
    body=`
      <div class="content portal-layout home-portal" data-portal-layout="home" data-home-layout-active="${homeLayoutEditMode||!homeLayoutIsDefault()?"1":"0"}">
        <section class="hero portal-block home-hero" data-portal-block="hero" ${homeLayoutBlockAttrs("hero")}>
          <video class="home-hero-video" autoplay muted loop playsinline preload="metadata" aria-hidden="true">
            <source src="${portalVideoUrl("hero")}" type="video/mp4">
          </video>
          <div class="home-hero-content">
          <div class="home-hero-top">
            <div class="home-hero-brand">
              <span class="home-hero-kicker">FREEzzzyPORTAL</span>
              <span class="home-hero-clock" data-home-clock>--:--:--</span>
            </div>
          </div>
          <h1 class="home-hero-profile-trigger" data-profile-toggle role="button" tabindex="0" aria-label="${T("profile")}">${escapeHtml(portalProfile.identity.username ? `@${portalProfile.identity.username}` : profileDisplayName())}</h1>
          <p>${T("homeDescription")}</p>
          </div>
          ${homeLayoutHandles()}
        </section>
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
        <div class="list portal-block" data-portal-block="streams">
          ${streams.map(function(s){
            return `<article class="stream">
              <div class="avatar">${streamAvatarMarkup(s)}</div>
              <div><b>${escapeHtml(s.name)}</b><small><span class="live-status-dot"></span>${T("platforms")}</small></div>
              <div class="stream-actions">
                <button class="tg-button secondary" data-live-open="${escapeHtml(s.name)}" data-live-source="twitch" type="button">Twitch</button>
                <button class="tg-button secondary" data-live-open="${escapeHtml(s.name)}" data-live-source="youtube" type="button">YouTube</button>
              </div>
            </article>`;
          }).join("")}
        </div>
      </div>`;
  }
  if(view==="chat"){
    body=`
      <div class="content portal-layout chat-portal" data-portal-layout="chat">
        <div class="section-head portal-block" data-portal-block="header">
          <div><h2>CHAT</h2><p>${T("chatSub")}</p></div>
        </div>
        <div class="chat portal-block" data-portal-block="messages">${chatMessages.map(m=>`<p><span class="chat-emoji" aria-hidden="true">${chatEmoji(m)}</span><span class="chat-message-body"><b>${escapeHtml(m.author)}</b><br>${escapeHtml(m.message)}</span></p>`).join("")}</div>
        <form id="chatform" class="portal-block" data-portal-block="composer">
          <input id="chatinput" placeholder="${T("message")}" autocomplete="off">
          <button class="tg-button">${T("send")}</button>
        </form>
      </div>`;
  }

  if(view==="game"){
    body=`
      <div class="content portal-layout game-portal" data-portal-layout="game">
        <div class="section-head portal-block game-section-head" data-portal-block="header">
          <div><h2>GAME</h2><p>${T("gameSub")}</p></div>
        </div>
        <div class="portal-block game-story-block" data-portal-block="game">${renderGame(gameState,gameTab,lang as GameLanguage)}</div>
      </div>`;
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
    body=`
      <div class="content portal-layout library-portal" data-portal-layout="library">
        <section class="hero portal-block" data-portal-block="content">
          <h2>LIBRARY</h2>
          <p>${T("libraryLocal")}</p>
          <div class="top-actions" style="justify-content:flex-start;margin-top:12px">
            <button class="tg-button" id="save">${T("save")}</button>
            <button class="tg-button secondary" id="clear">${T("clear")}</button>
          </div>
          <pre>${localStorage.getItem("freezzz-library")||"[]"}</pre>
        </section>
      </div>`;
  }

  app.innerHTML=`
    <div class="app-shell">
      <div class="portal-workspace ${view==="home"?"portal-home-workspace":"portal-route-workspace"}${hudHidden?" portal-hud-hidden":""}">
        ${renderPortalToolbar()}
        <main>${body}</main>
      </div>
      ${renderLivePopup({open:livePopupOpen,selected:liveSelected,source:livePopupSource,streams,escapeHtml,lang})}
      ${profileOpen?renderProfileCard():""}

    </div>`;

  window.dispatchEvent(new CustomEvent("freezzz:portal-render"));
  bind();
  bindHudTouchGesture();
  updateHomeClock();
  window.dispatchEvent(new CustomEvent("freezzz:chat-sync",{detail:{messages:chatMessages}}));
  bindTelegramBackButton(view!=="home" || profileOpen,()=>{
    if(profileOpen){profileOpen=false;portalEvents.emit("profile:toggled",{open:false});render();return;}
    portalEvents.emit("navigation:changed",{view:"home"});
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
  return `<button class="card home-card portal-block home-${v}" data-view="${v}" data-portal-card="${v}" data-portal-block="${v}" ${homeLayoutBlockAttrs(v as HomeBlockId)}>
    ${background?`<video class="home-card-background-video" autoplay muted loop playsinline preload="metadata" aria-hidden="true"><source src="${background}" type="video/mp4"></video>`:""}
    <span class="home-card-title">${title}</span>
    ${homeLayoutHandles()}
  </button>`;
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
window.addEventListener("freezzz:radio-mini",event=>{
  const action=(event as CustomEvent<{action?:string}>).detail?.action;
  if(action==="play")playRadioStation(radioSelectedId);
  if(action==="pause"){endRadioActivity();radioAudio?.pause();setRadioPlaybackStatus("paused");render();}
  if(action==="stop"){endRadioActivity();if(radioAudio){radioAudio.pause();radioAudio.currentTime=0;}setRadioPlaybackStatus("stopped");render();}
});
portalEvents.on("navigation:changed",payload=>{
  const previousView=view;
  flushActivityTracking();
  if(previousView==="game"&&payload.view!=="game")endGameActivity();
  if(previousView!=="game"&&payload.view==="game")beginGameActivity();
  if(previousView==="live"&&payload.view!=="live"){endLiveActivity();livePopupOpen=false;liveSelected="";}
  view=payload.view;
  portalState.view=payload.view;
  render();
});
window.addEventListener("resize",()=>{
  const next=currentHomeLayoutMode();
  if(next!==homeLayoutModeAtRender){
    homeLayoutModeAtRender=next;
    if(view==="home")render();
  }else if(view==="home"&&homeLayoutEditMode){
    applyHomeLayoutGeometry();
  }
});
window.addEventListener("online",()=>{portalState.online=true;});
window.addEventListener("offline",()=>{portalState.online=false;});
window.setInterval(()=>flushActivityTracking(),15000);
window.setInterval(updateHomeClock,1000);
window.addEventListener("pagehide",()=>{flushActivityTracking();gameActivityStartedAt=null;liveActivityStartedAt=null;liveActivityName="";radioActivityStartedAt=null;radioActivityName="";});
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")flushActivityTracking();else activityLastFlushAt=Date.now();});
function bindHudTouchGesture(){
  if(hudGestureBound)return;
  hudGestureBound=true;
  let startX=0,startY=0,tracking=false,triggered=false;
  document.addEventListener("pointerdown",e=>{
    if(e.pointerType==="mouse"&&e.button!==0)return;
    startX=e.clientX;startY=e.clientY;tracking=true;triggered=false;
  },{passive:true});
  document.addEventListener("pointermove",e=>{
    if(!tracking||triggered)return;
    const dx=e.clientX-startX,dy=e.clientY-startY;
    if(Math.abs(dx)>Math.abs(dy)+8)return;
    if(!hudHidden&&startY>=window.innerHeight-72&&dy>44){
      triggered=true;hudHidden=true;document.querySelector<HTMLElement>(".portal-workspace")?.classList.add("portal-hud-hidden");
    }else if(hudHidden&&startY>=window.innerHeight-28&&dy<-44){
      triggered=true;hudHidden=false;document.querySelector<HTMLElement>(".portal-workspace")?.classList.remove("portal-hud-hidden");
    }
  },{passive:true});
  const end=()=>{tracking=false;};
  document.addEventListener("pointerup",end,{passive:true});
  document.addEventListener("pointercancel",end,{passive:true});
}
function updateHomeClock(){
  if(view!=="home")return;
  const clock=document.querySelector<HTMLElement>("[data-home-clock]");
  if(!clock)return;
  clock.textContent=new Date().toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false});
}
function bind(){
  bindHomeLayoutEditor();
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
  document.querySelectorAll<HTMLElement>("[data-view]").forEach(function(x){
    x.onclick=function(e){
      if(homeLayoutSuppressClick){
        e.preventDefault();
        e.stopPropagation();
        homeLayoutSuppressClick=false;
        return;
      }
      if(homeLayoutEditMode&&x.closest(".home-portal")){e.preventDefault();e.stopPropagation();return;}
      e.preventDefault();
      e.stopPropagation();
      const next=x.dataset.view as View;
      if(!next||!moduleManager.has(next))return;
      portalEvents.emit("navigation:changed",{view:next});
    };
  });
  document.querySelectorAll<HTMLElement>("[data-profile-toggle]").forEach(function(x){
    x.onclick=function(e){e.preventDefault();e.stopPropagation();profileOpen=!profileOpen;portalEvents.emit("profile:toggled",{open:profileOpen});render();};
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
  document.querySelectorAll<HTMLElement>("[data-live-popup-source]").forEach(function(x){
    x.onclick=function(e){e.preventDefault();e.stopPropagation();livePopupSource=x.dataset.livePopupSource==="youtube"?"youtube":"twitch";render();};
  });
  document.querySelectorAll<HTMLElement>("[data-live-popup-close]").forEach(function(x){
    x.onclick=function(e){e.preventDefault();e.stopPropagation();closeLivePopup();};
  });
  document.querySelector("[data-live-popup-overlay]")?.addEventListener("click",function(e){
    if(e.target===e.currentTarget)closeLivePopup();
  });
  document.querySelector("[data-live-external]")?.addEventListener("click",function(){
    const stream=streams.find(s=>s.name===liveSelected);
    const url=stream?(livePopupSource==="youtube"?stream.youtube:stream.twitch):"";if(!url)return;
    openExternalUrl(url);
  });
  document.querySelector<HTMLElement>("[data-language-toggle]")?.addEventListener("click",function(e){e.preventDefault();e.stopPropagation();languageMenuOpen=!languageMenuOpen;render();});
  document.querySelectorAll<HTMLElement>("[data-lang]").forEach(function(x){x.onclick=function(e){e.preventDefault();e.stopPropagation();lang=(["RU","DE","EN"] as const).includes(x.dataset.lang as Language)?(x.dataset.lang as Language):"RU";languageMenuOpen=false;try{localStorage.setItem("freezzz:language",lang);}catch{};render();};});
  document.querySelectorAll<HTMLElement>("[data-url]").forEach(function(x){
    x.onclick=function(e){
      e.preventDefault();
      e.stopPropagation();
      const url=x.dataset.url;
      if(!url)return;
      openExternalUrl(url);
    };
  });
  document.querySelector("#chatform")?.addEventListener("submit",function(e){
    e.preventDefault();
    const i=document.querySelector<HTMLInputElement>("#chatinput")!;
    const message=i.value.trim();
    if(message){
      chatMessages.push({author:"You",message});
      recordChatMessage(portalProfile);
      if(chatMessages.length>50)chatMessages=chatMessages.slice(-50);
      i.value="";
      render();
    }
  });
  document.querySelector("#save")?.addEventListener("click",function(){localStorage.setItem("freezzz-library",JSON.stringify([{id:"duck-blast",savedAt:new Date().toISOString()}]));render();});
  document.querySelector("#clear")?.addEventListener("click",function(){localStorage.removeItem("freezzz-library");render();});
  if(view==="game"){
    document.querySelectorAll<HTMLElement>("[data-game-tab]").forEach(x=>{
      x.onclick=e=>{e.preventDefault();e.stopPropagation();gameTab=(x.dataset.gameTab as GameTab)||"story";savePortalSessionSnapshot();render();};
    });
    document.querySelectorAll<HTMLElement>("[data-game-race]").forEach(x=>{
      x.onclick=e=>{e.preventDefault();e.stopPropagation();gameState=chooseRace(gameState,(x.dataset.gameRace as GameRace)||"human");gameTab="story";render();};
    });
    document.querySelectorAll<HTMLElement>("[data-game-restart]").forEach(x=>{
      x.onclick=e=>{e.preventDefault();e.stopPropagation();gameState=restartGame();gameTab="story";render();};
    });
    document.querySelectorAll<HTMLElement>("[data-game-quest-claim]").forEach(x=>{
      x.onclick=e=>{e.preventDefault();e.stopPropagation();gameState=applyGameChoice(gameState,"claim:"+ (x.dataset.gameQuestClaim||""));render();};
    });
    document.querySelectorAll<HTMLElement>("[data-game-buy]").forEach(x=>{
      x.onclick=e=>{e.preventDefault();e.stopPropagation();gameState=applyGameChoice(gameState,"buy:"+ (x.dataset.gameBuy||""));render();};
    });
    document.querySelectorAll<HTMLElement>("[data-game-choice]").forEach(x=>{
      x.onclick=e=>{e.preventDefault();e.stopPropagation();gameState=applyGameChoice(gameState,x.dataset.gameChoice||"");render();};
    });
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
