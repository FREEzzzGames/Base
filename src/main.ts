import type { RadioBrowserClient, RadioBrowserStation } from "./radio-browser";
import { RADIO_GENRES } from "./radio-config";
import "./styles.css";
import { initPerformanceLayer } from "./performance-layer";
import "./multi-window-portal";
import { portalVideoUrl } from "./video-assets";
import { PORTAL_BUILD_ID } from "./build-info";
import { icon, streams, streamAvatarSources } from "./portal-ui";
import { bindTelegramBackButton, getTelegramWebApp, initTelegramBridge, openExternalUrl, verifyTelegramSession, type TelegramVerifiedIdentity } from "./platform-bridge";
import { renderLivePopups, type LivePopupState, type LiveSource } from "./live-runtime";
import { bindLiveCatalog, getLiveStreams, removeLiveStreamer, renderLiveCatalog } from "./live-catalog";

import { PortalModuleManager, PortalEventBus, createPlatformState, type PortalView } from "./core/portal-core";
import { pt } from "./portal-i18n";
import { loadPortalProfile, syncPortalIdentity, startPortalSession, recordLiveVisit, addLiveWatchTime, recordGameLaunch, addGameTime, recordRadioVisit, addRadioListenTime, recordChatMessage, formatDuration, type PortalProfile } from "./profile-store";
import { bindUniversalPortalPress } from "./portal-interactions";
import { initVisualComfort } from "./visual-comfort";
import { mountRpgGraphicsTest } from "./rpg-graphics-test";

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
type PortalSessionSnapshot={view:View;profileOpen:boolean;};
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
const liveActivityNames=new Set<string>();
let radioActivityName="";
let livePopups:LivePopupState[]=[];
const PORTAL_NICKNAME="d3tr01t";
let hudHidden=false;
let rpgGraphicsCleanup:(()=>void)|null=null;
let hudGestureBound=false;
let chatMessages:Array<{author:string;message:string}>=[{author:"FREEzzzBot",message:T("welcome")}];
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
      video.preload="auto";
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
}

function openLivePopup(name:string,source:LiveSource="twitch"):void{if(!name)return;const key=name+"::"+source;if(livePopups.some(p=>p.name===name&&p.source===source))return;if(livePopups.length>=4)livePopups=livePopups.slice(1);livePopups=[...livePopups,{key,name,source}];beginLiveActivity(name);portalEvents.emit("live:popup",{open:true,source:source==="replay"?"youtube":source});render();}
function closeLivePopup(key?:string):void{const popup=key?livePopups.find(p=>p.key===key):livePopups[livePopups.length-1];if(!popup)return;livePopups=livePopups.filter(p=>p.key!==popup.key);if(!livePopups.some(p=>p.name===popup.name))endLiveActivity(popup.name);portalEvents.emit("live:popup",{open:Boolean(livePopups.length),source:popup.source==="replay"?"youtube":popup.source});render();}
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
function savePortalSessionSnapshot(){
  try{
    sessionStorage.setItem(PORTAL_SESSION_KEY,JSON.stringify({
      view,
      profileOpen
    } satisfies PortalSessionSnapshot));
  }catch{}
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
  return `<nav class="portal-toolbar" aria-label="FREEzzz navigation">
    ${persistentBackgroundVideo("hud",portalVideoUrl("hud"),"portal-toolbar-background-video")}
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
      <div class="content portal-layout home-portal" data-portal-layout="home">
        <section class="hero portal-block home-hero" data-portal-block="hero">
          ${persistentBackgroundVideo("hero",portalVideoUrl("hero"),"home-hero-video")}
          <div class="home-hero-content">
          <div class="home-hero-top">
            <div class="home-hero-brand">
              <span class="home-hero-kicker">ECHO</span>
              <span class="home-hero-clock" data-home-clock>--:--:--</span>
            </div>
          </div>
          <h1 class="home-hero-profile-trigger" data-profile-toggle role="button" tabindex="0" aria-label="${T("profile")}">${escapeHtml(PORTAL_NICKNAME)}</h1>
          <p>${T("homeDescription")}</p>
          </div>
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
        ${renderLiveCatalog(lang)}
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
        <div class="portal-block game-story-block" data-portal-block="game" aria-label="RPG graphics test"></div>
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

  if(rpgGraphicsCleanup){rpgGraphicsCleanup();rpgGraphicsCleanup=null;}
  app.innerHTML=`
    <div class="app-shell">
      <div class="portal-workspace ${view==="home"?"portal-home-workspace":"portal-route-workspace"}${hudHidden?" portal-hud-hidden":""}">
        ${renderPortalToolbar()}
        <main>${body}</main>\n        <button class="portal-hud-toggle" data-hud-toggle type="button" aria-label="${hudHidden?"Показать нижний бар":"Скрыть нижний бар"}" title="${hudHidden?"Показать нижний бар":"Скрыть нижний бар"}" aria-pressed="${hudHidden}">${icon(hudHidden?"hudUp":"hudDown","portal-hud-toggle-icon")}</button>
      </div>
      ${renderLivePopups({popups:livePopups,streams:getLiveStreams(),escapeHtml,lang})}
      ${profileOpen?renderProfileCard():""}

    </div>`;

  window.dispatchEvent(new CustomEvent("freezzz:portal-render"));
  mountPersistentBackgroundVideos();
  bind();
  if(view==="game"){
    const host=document.querySelector<HTMLElement>('[data-portal-layout="game"] .game-story-block');
    if(host)rpgGraphicsCleanup=mountRpgGraphicsTest(host);
  }
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
portalEvents.on("navigation:changed",payload=>{
  const previousView=view;
  flushActivityTracking();
  if(previousView==="game"&&payload.view!=="game")endGameActivity();
  if(previousView!=="game"&&payload.view==="game")beginGameActivity();
  if(previousView==="live"&&payload.view!=="live"){endLiveActivity();livePopups=[];}
  view=payload.view;
  portalState.view=payload.view;
  render();
});
window.addEventListener("resize",()=>{ if(view==="home")render(); });
window.addEventListener("online",()=>{portalState.online=true;});
window.addEventListener("offline",()=>{portalState.online=false;});
window.setInterval(()=>flushActivityTracking(),15000);
window.setInterval(updateHomeClock,1000);
window.addEventListener("pagehide",()=>{flushActivityTracking();gameActivityStartedAt=null;liveActivityStartedAt=null;liveActivityNames.clear();radioActivityStartedAt=null;radioActivityName="";});
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
      triggered=true;
      setHudHidden(true);
    }else if(hudHidden&&startY>=window.innerHeight-28&&dy<-44){
      triggered=true;
      setHudHidden(false);
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
function setHudHidden(hidden:boolean){
  hudHidden=hidden;
  if(hudHidden&&view!=="home"){
    portalEvents.emit("navigation:changed",{view:"home"});
    return;
  }
  document.querySelector<HTMLElement>(".portal-workspace")?.classList.toggle("portal-hud-hidden",hudHidden);
}
function toggleHud(){
  setHudHidden(!hudHidden);
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
  document.querySelector<HTMLButtonElement>("[data-hud-toggle]")?.addEventListener("click",e=>{
    e.preventDefault();
    e.stopPropagation();
    toggleHud();
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
