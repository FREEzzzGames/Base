import type { RadioBrowserClient, RadioBrowserStation } from "./radio-browser";
import { RADIO_GENRES } from "./radio-config";
import "./styles.css";
import { initPortalPalette } from "./design-system/theme";
import { PORTAL_BUILD_ID, PORTAL_VERSION } from "./build-info";
import { renderDeveloperDiagnostics } from "./developer-tools";
import { icon, streams } from "./portal-ui";
import { applyLayout, getLayoutBlockInfos, getLayoutOverride, loadLayoutOverrides, saveLayoutOverrides, type LayoutOverride } from "./developer-layout";
import { getTelegramWebApp, initTelegramBridge, openExternalUrl } from "./platform-bridge";
import { bindPortalSwipeNavigation } from "./portal-navigation";
import { renderLivePopup } from "./live-runtime";
import { renderGame, loadGameState, chooseRace, applyGameChoice, restartGame, type GameTab, type GameRace } from "./game-system";
import { PORTAL_MODULES, PortalEventBus, createPlatformState, type PortalView } from "./core/portal-core";

initPortalPalette();
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

const app=document.querySelector<HTMLDivElement>("#app")!;
const portalState=createPlatformState({view:"home",language:"RU",telegram:Boolean(getTelegramWebApp())});
const portalEvents=new PortalEventBus();
let view:View=portalState.view;
let lang:Language=portalState.language;
type Language="RU"|"DE"|"EN";
const DEVELOPER_TOOLS_ENABLED = true;
let developerOpen=false;
let developerMode=(()=>{try{return localStorage.getItem("freezzz:dev-mode")!=="user";}catch{return true;}})();
let layoutOverrides=loadLayoutOverrides();
let developerSelectedBlock="";
let profileOpen=false;
let liveSelected="";
let livePopupOpen=false;
let livePopupSource:"twitch"|"youtube"="twitch";
let chatMessages:Array<{author:string;message:string}>=[{author:"FREEzzzBot",message:"Добро пожаловать в FREEzzz."}];
let homeRefreshTimer:number|null=null;
let gameState=loadGameState();
let gameTab:GameTab="story";
type GameFontSize="normal"|"large"|"largest";
let gameFontSize:GameFontSize=(()=>{try{const v=localStorage.getItem("freezzz:game-font-size");return v==="large"||v==="largest"?v:"normal";}catch{return "normal";}})();
function setGameFontSize(size:GameFontSize){gameFontSize=size;try{localStorage.setItem("freezzz:game-font-size",size);}catch{}render();}
function renderGameFontToolbar(){return '<div class="game-font-toolbar" role="group" aria-label="Размер текста в игре"><span>ТЕКСТ</span><button type="button" class="'+(gameFontSize==="normal"?"active":"")+'" data-game-font-size="normal" aria-label="Обычный размер" title="Обычный">A</button><button type="button" class="'+(gameFontSize==="large"?"active":"")+'" data-game-font-size="large" aria-label="Большой размер" title="Больше">A+</button><button type="button" class="'+(gameFontSize==="largest"?"active":"")+'" data-game-font-size="largest" aria-label="Самый большой размер" title="Самый большой">A++</button></div>';}
let gameNavRevealed=false;
let gameNavHideTimer:number|null=null;
let gameAmbientHost:HTMLDivElement|null=null;
let gameAmbientPlaying=true;
let gameAmbientMuted=true;
function gameAmbientCommand(func:string){
  const frame=gameAmbientHost?.querySelector<HTMLIFrameElement>("iframe");
  if(!frame?.contentWindow)return;
  frame.contentWindow.postMessage(JSON.stringify({event:"command",func,args:[]}),"https://www.youtube.com");
}
function bindGameAmbientControls(){
  if(!gameAmbientHost)return;
  gameAmbientHost.querySelector<HTMLButtonElement>("[data-ambient-mute]")?.addEventListener("click",e=>{
    e.stopPropagation();
    gameAmbientMuted=!gameAmbientMuted;
    gameAmbientCommand(gameAmbientMuted?"mute":"unMute");
    const b=e.currentTarget as HTMLButtonElement;
    b.textContent=gameAmbientMuted?"🔇":"🔊";
    b.setAttribute("aria-label",gameAmbientMuted?"Включить звук":"Выключить звук");
  });
  gameAmbientHost.querySelector<HTMLButtonElement>("[data-ambient-play]")?.addEventListener("click",e=>{
    e.stopPropagation();
    gameAmbientPlaying=!gameAmbientPlaying;
    gameAmbientCommand(gameAmbientPlaying?"playVideo":"pauseVideo");
    const b=e.currentTarget as HTMLButtonElement;
    b.textContent=gameAmbientPlaying?"Ⅱ":"▶";
    b.setAttribute("aria-label",gameAmbientPlaying?"Остановить видео":"Продолжить видео");
  });
}
function syncGameAmbient(){
  const target=document.querySelector<HTMLElement>("[data-game-ambient-host]");
  if(view!=="game"){
    gameAmbientHost?.remove();
    return;
  }
  if(!target)return;
  if(!gameAmbientHost){
    gameAmbientHost=document.createElement("div");
    gameAmbientHost.className="game-ambient-player";
    gameAmbientHost.innerHTML='<iframe title="Лесной костёр — атмосфера игры" src="https://www.youtube.com/embed/8KrLtLr-Gy8?autoplay=1&mute=1&loop=1&playlist=8KrLtLr-Gy8&playsinline=1&controls=1&enablejsapi=1&rel=0&origin='+encodeURIComponent(location.origin)+'" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe><div class="game-ambient-controls"><button type="button" data-ambient-mute aria-label="Включить звук">🔇</button><button type="button" data-ambient-play aria-label="Остановить видео">Ⅱ</button></div>';
    bindGameAmbientControls();
  }
  if(!target.contains(gameAmbientHost))target.appendChild(gameAmbientHost);
}

function clearGameNavHideTimer(){
  if(gameNavHideTimer!==null){window.clearTimeout(gameNavHideTimer);gameNavHideTimer=null;}
}
function setGameNavRevealed(revealed:boolean,autoHide=true){
  if(view!=="game")return;
  clearGameNavHideTimer();
  gameNavRevealed=revealed;
  document.querySelector(".bottom-nav")?.classList.toggle("game-nav-revealed",revealed);
  document.querySelector(".game-nav-reveal")?.classList.toggle("is-active",revealed);
  if(revealed&&autoHide){
    gameNavHideTimer=window.setTimeout(()=>setGameNavRevealed(false,false),3200);
  }
}
function bindGameNavGesture(){
  const shell=document.querySelector<HTMLElement>(".app-shell");
  if(!shell||view!=="game")return;
  const reveal=document.querySelector<HTMLButtonElement>(".game-nav-reveal");
  reveal?.addEventListener("click",e=>{
    e.preventDefault();e.stopPropagation();setGameNavRevealed(!gameNavRevealed,!gameNavRevealed);
  });
  let startY=0;
  let startX=0;
  let tracking=false;
  shell.addEventListener("pointerdown",e=>{
    if(e.pointerType==="mouse"&&e.button!==0)return;
    const nearBottom=e.clientY>=window.innerHeight-110;
    tracking=nearBottom;
    if(tracking){startY=e.clientY;startX=e.clientX;}
  },{passive:true});
  shell.addEventListener("pointerup",e=>{
    if(!tracking)return;
    tracking=false;
    const dy=e.clientY-startY;
    const dx=Math.abs(e.clientX-startX);
    if(dy<-42&&dx<90)setGameNavRevealed(true,true);
  },{passive:true});
  shell.addEventListener("pointercancel",()=>{tracking=false;},{passive:true});
  if(gameNavRevealed)setGameNavRevealed(true,true);
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
function currentLayoutOverride(key:string):LayoutOverride{return getLayoutOverride(layoutOverrides,key);}
function updateDeveloperControl(name:keyof LayoutOverride,value:number){
  if(!developerSelectedBlock)return;
  const current=currentLayoutOverride(developerSelectedBlock);
  layoutOverrides[developerSelectedBlock]={...current,[name]:value};
  saveLayoutOverrides(layoutOverrides);
  applyDeveloperLayout();
  const output=document.querySelector<HTMLOutputElement>("[data-dev-output=\""+name+"\"]");
  if(output)output.textContent=name==="width"?value+"%":name==="height"?(value?value+"px":"AUTO"):name==="order"?String(value):value+"px";
}
function resetDeveloperBlock(){
  if(!developerSelectedBlock)return;
  delete layoutOverrides[developerSelectedBlock];
  saveLayoutOverrides(layoutOverrides);
  render();
}
function resetDeveloperLayout(){
  layoutOverrides={};
  saveLayoutOverrides(layoutOverrides);
  render();
}
function portalBlockInfos(){return getLayoutBlockInfos(view,layoutOverrides);}
function applyDeveloperLayout(){
  applyLayout(view,developerMode,layoutOverrides);
  document.querySelectorAll<HTMLElement>("[data-portal-block]").forEach(el=>{
    el.dataset.devSelected=developerMode&&el.dataset.portalBlock===developerSelectedBlock.split(":").pop()?"true":"false";
  });
}
let developerDrag:{element:HTMLElement;startX:number;startY:number;originX:number;originY:number;moved:boolean}|null=null;
function bindDeveloperCanvas(){
  if(!developerMode)return;
  document.querySelectorAll<HTMLElement>("[data-portal-block]").forEach(el=>{
    const block=el.dataset.portalBlock||"";
    const key=view+":"+block;
    el.addEventListener("click",e=>{
      const target=e.target as HTMLElement;
      const nested=target.closest("button,input,textarea,select,a");
      if(nested&&nested!==el)return;
      e.preventDefault();
      e.stopPropagation();
      developerSelectedBlock=key;
      render();
    },true);
    el.addEventListener("pointerdown",e=>{
      if(e.pointerType==="mouse"&&e.button!==0)return;
      const target=e.target as HTMLElement;
      const nested=target.closest("input,textarea,select,a,[data-dev-control],[data-dev-nudge],[data-dev-size]");
      if(nested)return;
      developerSelectedBlock=key;
      const current=currentLayoutOverride(key);
      developerDrag={element:el,startX:e.clientX,startY:e.clientY,originX:current.x,originY:current.y,moved:false};
      el.setPointerCapture?.(e.pointerId);
      e.preventDefault();
      e.stopPropagation();
      applyDeveloperLayout();
    },{passive:false});
    el.addEventListener("pointermove",e=>{
      if(!developerDrag||developerDrag.element!==el)return;
      const dx=e.clientX-developerDrag.startX;
      const dy=e.clientY-developerDrag.startY;
      if(Math.abs(dx)+Math.abs(dy)<3)return;
      developerDrag.moved=true;
      const nx=Math.max(-240,Math.min(240,developerDrag.originX+dx));
      const ny=Math.max(-400,Math.min(400,developerDrag.originY+dy));
      updateDeveloperControl("x",Math.round(nx));
      updateDeveloperControl("y",Math.round(ny));
      e.preventDefault();
    },{passive:false});
    const finish=(e:PointerEvent)=>{
      if(!developerDrag||developerDrag.element!==el)return;
      if(developerDrag.moved){
        e.preventDefault();
        e.stopPropagation();
      }
      developerDrag=null;
    };
    el.addEventListener("pointerup",finish,{passive:false});
    el.addEventListener("pointercancel",finish,{passive:false});
  });
  applyDeveloperLayout();
}
function openLivePopup(name:string,source:"twitch"|"youtube"="twitch"):void{
  liveSelected=name;
  livePopupSource=source;
  livePopupOpen=true;
  render();
}
function closeLivePopup():void{
  livePopupOpen=false;
  render();
}
function renderDeveloperPanel(){
  return renderDeveloperDiagnostics({
    version:PORTAL_VERSION,build:PORTAL_BUILD_ID,view,language:lang,
    telegram:portalState.telegram,online:portalState.online,
    modules:PORTAL_MODULES.map(module=>module.id),developerMode,
    selectedBlock:developerSelectedBlock,blocks:portalBlockInfos()
  });
}
function toggleDeveloperMode(){
  developerMode=!developerMode;
  developerOpen=developerMode;
  try{localStorage.setItem("freezzz:dev-mode",developerMode?"developer":"user");}catch{}
  render();
}
function render(){
  let body="";

  if(view==="home"){
    body=`
      <div class="content portal-layout home-portal" data-portal-layout="home">
        <section class="hero portal-block home-hero" data-portal-block="hero">
          <div class="home-hero-meta"><span>FREEzzz PORTAL</span><span data-home-clock>--:--:--</span></div>
          <h1>FREEzzz</h1>
          <p>Твой игровой портал внутри одной вертикальной оболочки.</p>
        </section>
        ${homeCard("live",icon("video","home-card-icon"),"LIVE — Стримеры и каналы",'<div class="home-live-preview" data-home-live-content></div>')}
        ${homeCard("chat",icon("chat","home-card-icon"),"CHAT — Общение",'<div class="home-chat-preview" data-home-chat-content></div>')}
        ${homeCard("game",icon("game","home-card-icon"),"GAME — Игровая зона",'<div class="home-game-preview" data-home-game-content></div>')}
        ${homeCard("radio",icon("radio","home-card-icon"),"RADIO — Музыка",'<div class="home-radio-preview" data-home-radio-content></div>')}
        ${homeCard("library",icon("library","home-card-icon"),"LIBRARY — Библиотека",'<div class="home-library-preview" data-home-library-content></div>')}
      </div>`;
  }

  if(view==="live"){
    body=`
      <div class="content portal-layout" data-portal-layout="live">
        <div class="section-head portal-block" data-portal-block="header">
          <div><h2>LIVE</h2><p>Стримеры · Twitch + YouTube</p></div>
          <button class="tg-button secondary" data-view="home" type="button">HOME</button>
        </div>
        <div class="list portal-block" data-portal-block="streams">
          ${streams.map(function(s){
            return `<article class="stream">
              <div class="avatar">${icon(s.icon,"stream-icon")}</div>
              <div><b>${escapeHtml(s.name)}</b><small><span class="live-status-dot"></span>Twitch + YouTube</small></div>
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
      <div class="content portal-layout" data-portal-layout="chat">
        <div class="section-head portal-block" data-portal-block="header">
          <div><h2>CHAT</h2><p>Общение FREEzzz</p></div>
          <button class="tg-button secondary" data-view="home">⌂</button>
        </div>
        <div class="chat portal-block" data-portal-block="messages">${chatMessages.map(m=>`<p><span class="chat-emoji" aria-hidden="true">${chatEmoji(m)}</span><span class="chat-message-body"><b>${escapeHtml(m.author)}</b><br>${escapeHtml(m.message)}</span></p>`).join("")}</div>
        <form id="chatform" class="portal-block" data-portal-block="composer">
          <input id="chatinput" placeholder="Сообщение…" autocomplete="off">
          <button class="tg-button">Отправить</button>
        </form>
      </div>`;
  }

  if(view==="game"){
    body=`
      <div class="content portal-layout game-portal" data-portal-layout="game">
        <div class="section-head portal-block game-section-head" data-portal-block="header">
          <div><h2>GAME</h2><p>FREEzzz STORY · FOUR RACES</p></div>
          <button class="tg-button secondary" data-view="home" type="button">HOME</button>
        </div>
        <div class="portal-block game-story-block game-font-${gameFontSize}" data-portal-block="game">${renderGameFontToolbar()}${renderGame(gameState,gameTab)}</div>
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
      <div class="content portal-layout" data-portal-layout="radio">
        <div class="section-head portal-block" data-portal-block="header"><div><h2>RADIO</h2><p>Internet Radio · FREEzzz Audio Lab</p></div><button class="tg-button secondary" data-view="home">⌂</button></div>
        <section class="radio-panel">
          <div class="radio-heading">
            <div><span class="radio-kicker">FREEzzz RADIO</span><h3>Internet Radio</h3><p>Выбери станцию по логотипу и запусти её прямо внутри портала.</p></div>
          </div>
          <div class="radio-carousel portal-block" data-portal-block="carousel" id="radio-carousel" aria-label="Radio station carousel">
            <div class="radio-carousel-track" id="radio-carousel-track">
              ${carouselCards.map(station=>{
                const active=station.stationuuid===selectedStation?.stationuuid;
                const logo=station.favicon?.trim()||"";
                return `<button class="radio-carousel-card ${active?"active":""}" data-radio-carousel-id="${escapeHtml(station.stationuuid)}" type="button" title="${escapeHtml(station.name)}" aria-label="${escapeHtml(station.name)}">
                  ${logo
                    ? `<img class="radio-card-logo" src="${escapeHtml(logo)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
                    : `<span class="radio-card-logo-fallback" aria-hidden="true">◉</span>`}
                </button>`;
              }).join("")}
            </div>
          </div>
          <div class="radio-now-playing portal-block" data-portal-block="nowplaying">
            <div>
              <span class="radio-kicker">NOW PLAYING</span>
              <h3>${selectedStation?escapeHtml(selectedStation.name):"Choose a station"}</h3>
              <p>${selectedStation
                ? [selectedStation.country||"International",selectedStation.tags||"radio",selectedStation.language||"",selectedStation.codec?`${selectedStation.codec} · ${selectedStation.bitrate||0} kbps`:""].filter(Boolean).map(escapeHtml).join(" · ")
                : "Загрузка станций…"}
              </p>
            </div>
            <div class="radio-player-controls">
              <button id="radio-play" class="tg-button" type="button" ${selectedStation?"":"disabled"}>${radioPlaybackStatus==="playing"?"Playing":"Play"}</button>
              <button id="radio-pause" class="tg-button secondary" type="button" ${radioPlaybackStatus==="playing"?"":"disabled"}>Pause</button>
              <button id="radio-stop" class="tg-button secondary" type="button" ${radioPlaybackStatus!=="idle"&&radioPlaybackStatus!=="stopped"?"":"disabled"}>Stop</button>
            </div>
          </div>
          <div id="radio-audio-host" class="radio-audio-host"></div>
          <form id="radio-search-form" class="inline-form portal-block" data-portal-block="search"><input id="radio-search-input" value="${escapeHtml(radioQuery)}" maxlength="80" placeholder="Search station"><button class="tg-button" type="submit">Search</button></form>
          <div class="radio-genres portal-block" data-portal-block="genres">${RADIO_GENRES.map(g=>`<button type="button" data-radio-genre="${escapeHtml(g)}" class="${radioGenre===g?"active":""}">${escapeHtml(g)}</button>`).join("")}</div>
          ${radioError?`<div class="radio-status">${escapeHtml(radioError)}</div>`:""}
        </section>
      </div>`;
  }

  if(view==="library"){
    body=`
      <div class="content portal-layout" data-portal-layout="library">
        <section class="hero portal-block" data-portal-block="content">
          <h2>LIBRARY</h2>
          <p>Локальная библиотека портала.</p>
          <div class="top-actions" style="justify-content:flex-start;margin-top:12px">
            <button class="tg-button" id="save">Save</button>
            <button class="tg-button secondary" id="clear">Clear</button>
          </div>
          <pre>${localStorage.getItem("freezzz-library")||"[]"}</pre>
        </section>
      </div>`;
  }

  app.innerHTML=`
    <div class="app-shell">
      <header class="topbar">
        <div class="topbar-left">
          <button class="profile-button" data-profile-toggle type="button" aria-label="Profile">${icon("user","profile-icon")}</button>
          <div class="brand-avatar" aria-hidden="true">F</div>
          <div class="brand-title">
            <strong>FREEzzz</strong>
            <small>Platform</small>
          </div>
        </div>

        <nav class="lang-switch" aria-label="Language">
          <button data-lang="RU" class="${lang==="RU"?"active":""}">RU</button>
          <button data-lang="DE" class="${lang==="DE"?"active":""}">DE</button>
          <button data-lang="EN" class="${lang==="EN"?"active":""}">EN</button>
        </nav>
        ${DEVELOPER_TOOLS_ENABLED?`<button class="dev-mode-toggle" data-dev-mode-toggle type="button" aria-label="Переключить режим"><span>${developerMode?"DEV":"USER"}</span><small>${developerMode?"РАЗРАБ":"ПОЛЬЗ."}</small></button>`:""}
      </header>
      <nav class="bottom-nav ${view==="game"?"bottom-nav-game":""} ${view==="game"&&gameNavRevealed?"game-nav-revealed":""}" aria-label="Portal navigation">
        <button class="bottom-nav-item ${view==="chat"?"active":""}" data-view="chat" aria-label="Chat" title="CHAT">
          ${icon("chat","nav-icon")}<span>CHAT</span>
        </button>
        <button class="bottom-nav-item ${view==="live"?"active":""}" data-view="live" aria-label="Live" title="LIVE">
          ${icon("video","nav-icon")}<span>LIVE</span>
        </button>
        <button class="bottom-nav-item ${view==="game"?"active":""}" data-view="game" aria-label="Game" title="GAME">
          ${icon("game","nav-icon")}<span>GAME</span>
        </button>
        <button class="bottom-nav-item ${view==="radio"?"active":""}" data-view="radio" aria-label="Radio" title="RADIO">
          ${icon("radio","nav-icon")}<span>RADIO</span>
        </button>
        ${DEVELOPER_TOOLS_ENABLED&&developerMode?`<button class="bottom-nav-item ${developerOpen?"active":""}" data-developer-toggle type="button" aria-label="Конструктор" title="LAYOUT">${icon("settings","nav-icon")}<span>EDIT</span></button>`:""}
        <button class="bottom-nav-item bottom-nav-home ${view==="home"?"active":""}" data-view="home" aria-label="Home" title="HOME">
          ${icon("home","nav-icon")}<span>HOME</span>
        </button>
      </nav>
      ${view==="game"?`<button class="game-nav-reveal ${gameNavRevealed?"is-active":""}" type="button" aria-label="Показать меню" title="Провести вверх от нижнего края или нажать">⌃</button>`:""}
      <main>${body}</main>
      ${renderLivePopup({open:livePopupOpen,selected:liveSelected,source:livePopupSource,streams,escapeHtml})}
      ${developerOpen&&developerMode?renderDeveloperPanel():""}
      ${profileOpen?`<div class="profile-overlay" data-profile-close><section class="profile-card" data-profile-card><button class="icon-button profile-close" data-profile-toggle type="button" aria-label="Закрыть">×</button><span class="profile-avatar">F</span><h2>FREEzzz</h2><p>Профиль пользователя</p><div class="profile-actions"><button class="tg-button" data-view="home" type="button">HOME</button><button class="tg-button secondary" data-profile-toggle type="button">Закрыть</button></div></section></div>`:""}

    </div>`;
  bind();
  applyDeveloperLayout();
  syncGameAmbient();
  if(view==="home")ensureHomeRefresh();
}

function homeCard(v:View,e:string,t:string,content:string){
  return `<button class="card home-card portal-block home-${v}" data-view="${v}" data-portal-card="${v}" data-portal-block="${v}">
    <div class="home-card-head"><span class="home-card-icon">${e}</span><strong>${t}</strong></div>
    ${content}
  </button>`;
}
function refreshHomeContent(){
  if(view!=="home")return;
  const clock=document.querySelector<HTMLElement>("[data-home-clock]");
  if(clock)clock.textContent=new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit",second:"2-digit"});
  const live=document.querySelector<HTMLElement>("[data-home-live-content]");
  if(live){
    live.innerHTML=streams.slice(0,3).map(s=>`<span class="home-live-row"><i>${icon(s.icon,"home-stream-icon")}</i><b>${escapeHtml(s.name)}</b><small><span class="live-status-dot"></span>Twitch + YouTube</small></span>`).join("");
  }
  const chat=document.querySelector<HTMLElement>("[data-home-chat-content]");
  if(chat){
    const last=chatMessages[chatMessages.length-1];
    chat.innerHTML=last?`<b>${escapeHtml(last.author)}</b><span>${escapeHtml(last.message)}</span>`:"Нет сообщений";
  }
  const game=document.querySelector<HTMLElement>("[data-home-game-content]");
  if(game)game.innerHTML=gameState.race?`<span>LEVEL <b>${gameState.level}</b></span><span>XP ${gameState.xp}/100</span><small>${escapeHtml(gameState.race.toUpperCase())} · история продолжается</small>`:`<span>FREEzzz STORY</span><span>4 RACES</span><small>Выбери героя и начни приключение</small>`;
  const radio=document.querySelector<HTMLElement>("[data-home-radio-content]");
  if(radio){
    const station=radioStations.find(s=>s.stationuuid===radioSelectedId)||radioStations[0];
    radio.innerHTML=station?`<b>${escapeHtml(station.name)}</b><span>${radioPlaybackStatus==="playing"?"● PLAYING":"○ "+(radioPlaybackStatus==="paused"?"PAUSED":"READY")}</span>`:radioLoading?"Загрузка станции…":"RADIO готово";
  }
  const library=document.querySelector<HTMLElement>("[data-home-library-content]");
  if(library){
    let count=0;
    try{const saved=JSON.parse(localStorage.getItem("freezzz-library")||"[]");count=Array.isArray(saved)?saved.length:0;}catch{}
    library.innerHTML=`<b>${count}</b><span>сохранённых игр</span><small>Локальная библиотека</small>`;
  }
}
function ensureHomeRefresh(){
  if(homeRefreshTimer!==null)return;
  homeRefreshTimer=window.setInterval(refreshHomeContent,500);
  refreshHomeContent();
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
  radioAudio?.pause();
  radioAudio=new Audio(station.url_resolved||station.url);
  radioAudio.dataset.station=station.name;
  radioAudio.controls=true;
  radioPlaybackStatus="loading";
  radioAudio.addEventListener("playing",()=>{radioPlaybackStatus="playing";render();},{once:true});
  radioAudio.addEventListener("pause",()=>{if(radioPlaybackStatus==="playing")radioPlaybackStatus="paused";});
  radioAudio.addEventListener("error",()=>{radioPlaybackStatus="failed";radioError="Не удалось воспроизвести поток этой станции.";render();},{once:true});
  void radioAudio.play().then(()=>{radioPlaybackStatus="playing";}).catch(()=>{radioPlaybackStatus="failed";radioError="Нажми Play ещё раз — браузер заблокировал автозапуск.";}).finally(()=>render());
}
portalEvents.on("navigation:changed",payload=>{
  clearGameNavHideTimer();
  gameNavRevealed=false;
  view=payload.view;
  portalState.view=payload.view;
  render();
});
window.addEventListener("online",()=>{portalState.online=true;});
window.addEventListener("offline",()=>{portalState.online=false;});
function bind(){
  if(view==="radio"){
    document.querySelector("#radio-search-form")?.addEventListener("submit",e=>{e.preventDefault();radioQuery=(document.querySelector<HTMLInputElement>("#radio-search-input")?.value||"").trim();void loadRadioStations();});
    document.querySelectorAll<HTMLElement>("[data-radio-genre]").forEach(x=>x.onclick=()=>{radioGenre=x.dataset.radioGenre||"pop";radioQuery="";void loadRadioStations();});
    document.querySelectorAll<HTMLButtonElement>("[data-radio-carousel-id]").forEach(x=>x.onclick=()=>{radioSelectedId=x.dataset.radioCarouselId||"";try{localStorage.setItem("freezzz:radio:selected",radioSelectedId);}catch{};render();});
    document.querySelector("#radio-play")?.addEventListener("click",()=>void playRadioStation(radioSelectedId));
    document.querySelector("#radio-pause")?.addEventListener("click",()=>{radioAudio?.pause();radioPlaybackStatus="paused";render();});
    document.querySelector("#radio-stop")?.addEventListener("click",()=>{if(radioAudio){radioAudio.pause();radioAudio.currentTime=0;}radioPlaybackStatus="stopped";render();});
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
      e.preventDefault();
      e.stopPropagation();
      const next=x.dataset.view as View;
      if(!next)return;
      portalEvents.emit("navigation:changed",{view:next});
    };
  });
  document.querySelectorAll<HTMLElement>("[data-profile-toggle]").forEach(function(x){
    x.onclick=function(e){e.preventDefault();e.stopPropagation();profileOpen=!profileOpen;render();};
  });
  document.querySelectorAll<HTMLElement>("[data-profile-close]").forEach(function(x){
    x.onclick=function(){profileOpen=false;render();};
  });
  document.querySelectorAll<HTMLElement>("[data-profile-card]").forEach(function(x){
    x.onclick=function(e){e.stopPropagation();};
  });
  document.querySelectorAll<HTMLElement>("[data-dev-mode-toggle]").forEach(function(x){
    x.onclick=function(e){e.preventDefault();e.stopPropagation();toggleDeveloperMode();};
  });
  document.querySelectorAll<HTMLElement>("[data-developer-toggle]").forEach(function(x){
    x.onclick=function(e){e.preventDefault();e.stopPropagation();developerOpen=!developerOpen;render();};
  });
  bindDeveloperCanvas();
  bindGameNavGesture();
  document.querySelectorAll<HTMLElement>("[data-dev-block]").forEach(function(x){
    x.onclick=function(e){e.preventDefault();e.stopPropagation();developerSelectedBlock=x.dataset.devBlock||"";render();};
  });
  document.querySelectorAll<HTMLElement>("[data-dev-size]").forEach(function(x){
    x.onclick=function(e){e.preventDefault();e.stopPropagation();if(!developerSelectedBlock)return;const current=currentLayoutOverride(developerSelectedBlock);const next=Math.max(20,Math.min(100,current.width+Number(x.dataset.devSize||0)));updateDeveloperControl("width",next);render();};
  });
  document.querySelectorAll<HTMLElement>("[data-dev-nudge]").forEach(function(x){
    x.onclick=function(e){e.preventDefault();e.stopPropagation();if(!developerSelectedBlock)return;const current=currentLayoutOverride(developerSelectedBlock);const action=x.dataset.devNudge||"";const step=8;let nx=current.x,ny=current.y;if(action==="up")ny-=step;else if(action==="down")ny+=step;else if(action==="left")nx-=step;else if(action==="right")nx+=step;else if(action==="center"){nx=0;ny=0;}updateDeveloperControl("x",Math.max(-240,Math.min(240,nx)));updateDeveloperControl("y",Math.max(-400,Math.min(400,ny)));render();};
  });
  document.querySelectorAll<HTMLInputElement>("[data-dev-control]").forEach(function(x){
    x.oninput=function(){
      const name=x.dataset.devControl as keyof LayoutOverride;
      updateDeveloperControl(name,Number(x.value));
    };
  });
  document.querySelector("[data-dev-reset]")?.addEventListener("click",e=>{e.preventDefault();resetDeveloperBlock();});
  document.querySelector("[data-dev-reset-all]")?.addEventListener("click",e=>{e.preventDefault();resetDeveloperLayout();});
  document.querySelector("[data-dev-preview]")?.addEventListener("click",e=>{
    e.preventDefault();developerMode=false;developerOpen=false;
    try{localStorage.setItem("freezzz:dev-mode","user");}catch{}
    render();
  });
  document.querySelectorAll<HTMLElement>("[data-developer-close]").forEach(function(x){
    x.onclick=function(e){e.preventDefault();e.stopPropagation();developerOpen=false;render();};
  });
  document.querySelector("[data-developer-overlay]")?.addEventListener("click",function(e){
    if(e.target===e.currentTarget){developerOpen=false;render();}
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
  document.querySelectorAll<HTMLElement>("[data-lang]").forEach(function(x){x.onclick=function(){lang=(["RU","DE","EN"] as const).includes(x.dataset.lang as Language)?(x.dataset.lang as Language):"RU";render();};});
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
      if(chatMessages.length>50)chatMessages=chatMessages.slice(-50);
      i.value="";
      render();
    }
  });
  document.querySelector("#save")?.addEventListener("click",function(){localStorage.setItem("freezzz-library",JSON.stringify([{id:"duck-blast",savedAt:new Date().toISOString()}]));render();});
  document.querySelector("#clear")?.addEventListener("click",function(){localStorage.removeItem("freezzz-library");render();});
  if(view==="game"){
    document.querySelectorAll<HTMLElement>("[data-game-tab]").forEach(x=>{
      x.onclick=e=>{e.preventDefault();e.stopPropagation();gameTab=(x.dataset.gameTab as GameTab)||"story";render();};
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
    bindPortalSwipeNavigation(document.querySelector<HTMLElement>(".app-shell")!,view,nextView=>portalEvents.emit("navigation:changed",{view:nextView}));
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
