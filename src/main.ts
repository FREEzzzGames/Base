import { RadioBrowserClient, RADIO_GENRES, type RadioBrowserStation } from "./radio-browser";
import "./styles.css";
import { initPortalPalette } from "./design-system/theme";
import { PORTAL_BUILD_ID, PORTAL_VERSION } from "./build-info";
import { renderDeveloperDiagnostics } from "./developer-tools";
import { PORTAL_MODULES, PortalEventBus, createPlatformState, type PortalView } from "./core/portal-core";

initPortalPalette();

interface TelegramWebAppBridge{
  ready?:()=>void;
  expand?:()=>void;
  openLink?:(url:string,options?:{try_instant_view?:boolean})=>void;
  openTelegramLink?:(url:string)=>void;
  disableVerticalSwipes?:()=>void;
  platform?:string;
}
function getTelegramWebApp():TelegramWebAppBridge|null{
  const candidate=(window as Window&{Telegram?:{WebApp?:TelegramWebAppBridge}}).Telegram?.WebApp;
  return candidate||null;
}
function initTelegramBridge(){
  const tg=getTelegramWebApp();
  if(!tg)return;
  tg.ready?.();
  tg.expand?.();
  tg.disableVerticalSwipes?.();
  document.documentElement.dataset.telegram="true";
  if(tg.platform)document.documentElement.dataset.telegramPlatform=tg.platform;
}
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
const DEVELOPER_TOOLS_ENABLED = import.meta.env.DEV || import.meta.env.VITE_FREEZZ_DEV_TOOLS === "1";
let developerOpen=false;
let developerMode=(()=>{try{return localStorage.getItem("freezzz:dev-mode")!=="user";}catch{return true;}})();
type LayoutOverride={width:number;height:number;x:number;y:number;order:number};
const DEV_LAYOUT_KEY="freezzz:dev-layout:v1";
let layoutOverrides:Record<string,LayoutOverride>=(()=>{try{return JSON.parse(localStorage.getItem(DEV_LAYOUT_KEY)||"{}") as Record<string,LayoutOverride>;}catch{return {};}})();
let developerSelectedBlock="";
let profileOpen=false;
let liveSelected="";
let livePopupOpen=false;
let livePopupSource:"twitch"|"youtube"="twitch";
let chatMessages:Array<{author:string;message:string}>=[{author:"FREEzzzBot",message:"Добро пожаловать в FREEzzz."}];
let homeRefreshTimer:number|null=null;
let score=0;
let player=.5;
const radioBrowser=new RadioBrowserClient();
let radioStations:readonly RadioBrowserStation[]=[];
let radioGenre="pop";
let radioQuery="";
let radioLoading=false;
let radioError="";
let radioAudio:HTMLAudioElement|null=null;
let radioSelectedId=(()=>{try{return localStorage.getItem("freezzz:radio:selected")||"";}catch{return "";}})();
let radioPlaybackStatus:"idle"|"loading"|"playing"|"paused"|"stopped"|"failed"="idle";
const LUCIDE_ICONS:Record<string,string>={
  user:'<circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0"/>',
  video:'<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3z"/>',
  chat:'<path d="M21 11.5a8 8 0 0 1-8.5 8A9.4 9.4 0 0 1 8 18.3L3 20l1.7-4A8.6 8.6 0 1 1 21 11.5Z"/><path d="M8 11h.01M12 11h.01M16 11h.01"/>',
  game:'<path d="M7 8h10a5 5 0 0 1 4.5 7.2l-1.1 2.2a2.5 2.5 0 0 1-4.2.4L14.8 16H9.2l-1.4 1.8a2.5 2.5 0 0 1-4.2-.4l-1.1-2.2A5 5 0 0 1 7 8Z"/><path d="M7 11v4M5 13h4"/><path d="M16 12h.01M18 14h.01"/>',
  radio:'<rect x="4" y="7" width="16" height="13" rx="2"/><path d="m7 7 10-4"/><circle cx="9" cy="14" r="2"/><path d="M13 12h4M13 16h3"/>',
  library:'<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21Z"/><path d="M4 5.5v15"/><path d="M8 7h8M8 11h8"/>',
  home:'<path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9"/><path d="M9 20v-6h6v6"/>',
  settings:'<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="m19.4 15 .1.1a2 2 0 0 1-2.8 2.8l-.1-.1a2 2 0 0 0-3.4 1.4v.2a2 2 0 0 1-4 0v-.2a2 2 0 0 0-3.4-1.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A2 2 0 0 0 3.7 12a2 2 0 0 0-1.7-2 2 2 0 0 1 0-4h.2A2 2 0 0 0 3.6 2.6l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A2 2 0 0 0 10 1.2V1a2 2 0 0 1 4 0v.2a2 2 0 0 0 3.4 1.4l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A2 2 0 0 0 21.3 9h.2a2 2 0 0 1 0 4h-.2a2 2 0 0 0-1.9 2Z"/>',
  rocket:'<path d="M14 4c3-1 6-1 7-1 0 1 0 4-1 7l-7 7-4-1-1-4 7-7Z"/><path d="m8 16-4 4M5 12l-3 1 4 4M12 19l1 3 4-4"/><circle cx="16.5" cy="7.5" r="1.5"/>',
  zap:'<path d="m13 2-9 12h7l-1 8 9-12h-7z"/>'
};
function icon(name:string,className=""){
  const path=LUCIDE_ICONS[name]||LUCIDE_ICONS.video;
  return `<svg class="ui-icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

type LiveStream={icon:string;name:string;twitch:string;youtube:string;twitchChannel:string;youtubeChannel?:string};
const streams:LiveStream[]=[
  {icon:"video",name:"Leb1ga",twitch:"https://www.twitch.tv/leb1ga",youtube:"https://www.youtube.com/@leb1ga",twitchChannel:"leb1ga"},
  {icon:"game",name:"Dendi",twitch:"https://www.twitch.tv/Dendi",youtube:"https://www.youtube.com/@Dendi",twitchChannel:"dendi"},
  {icon:"zap",name:"Vitaliy Kushnyryk",twitch:"https://www.twitch.tv/rolex9",youtube:"https://www.youtube.com/@rolex9",twitchChannel:"rolex9"},
  {icon:"video",name:"Papaplatte",twitch:"https://www.twitch.tv/papaplatte",youtube:"https://www.youtube.com/@papaplatte",twitchChannel:"papaplatte",youtubeChannel:"UCDmbhGe7-wC1a55l5ZYAZJw"},
  {icon:"video",name:"MontanaBlack88",twitch:"https://www.twitch.tv/montanablack88",youtube:"https://www.youtube.com/@montanablack",twitchChannel:"montanablack88"},
  {icon:"rocket",name:"Trymacs",twitch:"https://www.twitch.tv/trymacs",youtube:"https://www.youtube.com/@Trymacs",twitchChannel:"trymacs",youtubeChannel:"UC6Gc4KQ1ueDnh8x7plaAD3w"},
  {icon:"game",name:"SMETANA",twitch:"https://www.twitch.tv/smetanduck",youtube:"https://www.youtube.com/@smetanaml",twitchChannel:"smetanduck"},
  {icon:"game",name:"titamin1",twitch:"https://www.twitch.tv/titamin1",youtube:"https://www.youtube.com/@titamin1",twitchChannel:"titamin1"},
  {icon:"game",name:"Dunkelsch4tten",twitch:"https://www.twitch.tv/dunkelsch4tten",youtube:"https://www.youtube.com/@dunkelsch4tten",twitchChannel:"dunkelsch4tten"},
  {icon:"game",name:"Buster",twitch:"https://www.twitch.tv/buster",youtube:"https://www.youtube.com/@slavabuster",twitchChannel:"buster"},
  {icon:"video",name:"Marmok",twitch:"https://www.twitch.tv/marmok_twitch",youtube:"https://www.youtube.com/@MarmokLive",twitchChannel:"marmok_twitch"},
  {icon:"video",name:"ZUBAREFFF",twitch:"https://www.twitch.tv/zubarefff",youtube:"https://www.youtube.com/@zubarefff11",twitchChannel:"zubarefff"}
];

function currentLayoutOverride(key:string):LayoutOverride{
  const value=layoutOverrides[key];
  return value?{width:100,height:0,x:0,y:0,order:0,...value}:{width:100,height:0,x:0,y:0,order:0};
}
function saveDeveloperLayout(){try{localStorage.setItem(DEV_LAYOUT_KEY,JSON.stringify(layoutOverrides));}catch{}}
const PORTAL_EDITABLE_BLOCKS:Record<View,readonly string[]>={
  home:["hero","live","chat","game","radio","library"],
  live:["header","streams"],
  chat:["header","messages","composer"],
  game:["header","game","controls"],
  radio:["header","carousel","nowplaying","search","genres"],
  library:["content"]
};
function portalBlockInfos(){
  return PORTAL_EDITABLE_BLOCKS[view].map(block=>{
    const key=view+":"+block;
    const value=currentLayoutOverride(key);
    return {key,label:block.toUpperCase(),view,width:value.width,height:value.height,x:value.x,y:value.y,order:value.order};
  });
}
function applyDeveloperLayout(){
  document.querySelectorAll<HTMLElement>("[data-portal-block]").forEach((el,index)=>{
    const block=el.dataset.portalBlock||String(index);
    const value=currentLayoutOverride(view+":"+block);
    if(!developerMode){
      el.style.removeProperty("width");el.style.removeProperty("height");el.style.removeProperty("transform");el.style.removeProperty("order");
      return;
    }
    el.dataset.devEditable="true";
    el.style.width=value.width===100?"":value.width+"%";
    el.style.height=value.height>0?value.height+"px":"";
    el.style.transform=(value.x||value.y)?"translate("+value.x+"px,"+value.y+"px)":"";
    el.style.order=String(value.order);
  });
}
function updateDeveloperControl(name:keyof LayoutOverride,value:number){
  if(!developerSelectedBlock)return;
  const current=currentLayoutOverride(developerSelectedBlock);
  layoutOverrides[developerSelectedBlock]={...current,[name]:value};
  saveDeveloperLayout();
  applyDeveloperLayout();
  const output=document.querySelector<HTMLOutputElement>("[data-dev-output=\""+name+"\"]");
  if(output)output.textContent=name==="width"?value+"%":name==="height"?(value?value+"px":"AUTO"):name==="order"?String(value):value+"px";
}
function resetDeveloperBlock(){if(!developerSelectedBlock)return;delete layoutOverrides[developerSelectedBlock];saveDeveloperLayout();render();}
function resetDeveloperLayout(){layoutOverrides={};saveDeveloperLayout();render();}
function renderDeveloperPanel(){return renderDeveloperDiagnostics({version:PORTAL_VERSION,build:PORTAL_BUILD_ID,view,language:lang,telegram:portalState.telegram,online:portalState.online,modules:PORTAL_MODULES,developerMode,selectedBlock:developerSelectedBlock,blocks:portalBlockInfos()});}
function toggleDeveloperMode(){developerMode=!developerMode;developerOpen=developerMode;try{localStorage.setItem("freezzz:dev-mode",developerMode?"developer":"user");}catch{};render();}
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
        <div class="chat portal-block" data-portal-block="messages">${chatMessages.map(m=>`<p><b>${escapeHtml(m.author)}</b><br>${escapeHtml(m.message)}</p>`).join("")}</div>
        <form id="chatform" class="portal-block" data-portal-block="composer">
          <input id="chatinput" placeholder="Сообщение…" autocomplete="off">
          <button class="tg-button">Отправить</button>
        </form>
      </div>`;
  }

  if(view==="game"){
    body=`
      <div class="content portal-layout" data-portal-layout="game">
        <div class="section-head portal-block" data-portal-block="header">
          <div><h2>GAME</h2><p>DUCK BLAST</p></div>
          <button class="tg-button secondary" data-view="home">⌂</button>
        </div>
        <div class="game portal-block" data-portal-block="game" data-game-touch><canvas id="canvas"></canvas><b id="score">SCORE ${score}</b></div>
        <div class="controls portal-block touch-controls" data-portal-block="controls">
          <button data-fire type="button">TOUCH / FIRE</button>
          <span>Проведи пальцем по полю для перемещения</span>
        </div>
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
      <nav class="bottom-nav" aria-label="Portal navigation">
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
      <main>${body}</main>
      ${livePopupMarkup()}
      ${developerOpen&&developerMode?renderDeveloperPanel():""}
      ${profileOpen?`<div class="profile-overlay" data-profile-close><section class="profile-card" data-profile-card><button class="icon-button profile-close" data-profile-toggle type="button" aria-label="Закрыть">×</button><span class="profile-avatar">F</span><h2>FREEzzz</h2><p>Профиль пользователя</p><div class="profile-actions"><button class="tg-button" data-view="home" type="button">HOME</button><button class="tg-button secondary" data-profile-toggle type="button">Закрыть</button></div></section></div>`:""}

    </div>`;
  bind();
  applyDeveloperLayout();
  if(view==="game")startGame();
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
  if(game)game.innerHTML=`<span>SCORE <b>${score}</b></span><span>PLAYER ${Math.round(player*100)}%</span><small>DUCK BLAST · готов к запуску</small>`;
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

async function loadRadioStations(){
  radioLoading=true; radioError=""; render();
  try{
    radioStations=await radioBrowser.searchStations(radioGenre,radioQuery,30);
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
function liveEmbedUrl(stream:LiveStream,source:"twitch"|"youtube"):string{
  if(source==="twitch"){
    const parent=window.location.hostname||"freezzgames.github.io";
    return "https://player.twitch.tv/?"+new URLSearchParams({channel:stream.twitchChannel,parent,autoplay:"false",muted:"false"}).toString();
  }
  if(stream.youtubeChannel){
    return "https://www.youtube-nocookie.com/embed/live_stream?"+new URLSearchParams({channel:stream.youtubeChannel,autoplay:"0",rel:"0",playsinline:"1"}).toString();
  }
  return "";
}

function openLivePopup(name:string,source:"twitch"|"youtube"="twitch"):void{
  liveSelected=name;
  livePopupOpen=true;
  render();
}
function closeLivePopup():void{
  livePopupOpen=false;
  render();
}
function livePopupMarkup():string{
  if(!livePopupOpen||!liveSelected)return "";
  const stream=streams.find(s=>s.name===liveSelected);
  if(!stream)return "";
  const source=(livePopupSource==="youtube"?"youtube":"twitch") as "twitch"|"youtube";
  const embed=liveEmbedUrl(stream,source);
  const external=source==="youtube"?stream.youtube:stream.twitch;
  return `<div class="live-popup-overlay" data-live-popup-overlay>
    <section class="live-popup" role="dialog" aria-modal="true" aria-label="LIVE playback">
      <header class="live-popup-header">
        <div><span class="live-popup-kicker">LIVE</span><strong>${escapeHtml(stream.name)}</strong><small>${source==="youtube"?"YouTube":"Twitch"}</small></div>
        <button class="live-popup-close" data-live-popup-close type="button" aria-label="Закрыть">×</button>
      </header>
      <div class="live-popup-source-tabs">
        <button class="tg-button ${source==="twitch"?"":"secondary"}" data-live-popup-source="twitch" type="button">Twitch</button>
        <button class="tg-button ${source==="youtube"?"":"secondary"}" data-live-popup-source="youtube" type="button">YouTube</button>
      </div>
      <div class="live-popup-video">
        ${embed
          ? `<iframe src="${escapeHtml(embed)}" title="${escapeHtml(stream.name)} — ${source}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`
          : `<div class="live-popup-unavailable"><div class="live-popup-icon">${icon("video")}</div><strong>Встроенный плеер недоступен</strong><span>Канал доступен на ${source}, но универсальный embed для него не задан.</span><button class="tg-button" data-live-external type="button">Открыть ${source}</button></div>`}
      </div>
    </section>
  </div>`;
}
portalEvents.on("navigation:changed",payload=>{
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
  document.querySelectorAll<HTMLElement>("[data-dev-block]").forEach(function(x){
    x.onclick=function(e){e.preventDefault();e.stopPropagation();developerSelectedBlock=x.dataset.devBlock||"";render();};
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
    const tg=getTelegramWebApp();
    if(tg?.openLink)tg.openLink(url,{try_instant_view:false});else window.open(url,"_blank","noopener,noreferrer");
  });
  document.querySelectorAll<HTMLElement>("[data-lang]").forEach(function(x){x.onclick=function(){lang=(["RU","DE","EN"] as const).includes(x.dataset.lang as Language)?(x.dataset.lang as Language):"RU";render();};});
  document.querySelectorAll<HTMLElement>("[data-url]").forEach(function(x){
    x.onclick=function(e){
      e.preventDefault();
      e.stopPropagation();
      const url=x.dataset.url;
      if(!url)return;
      const tg=getTelegramWebApp();
      if(tg?.openLink){tg.openLink(url,{try_instant_view:false});}
      else{window.open(url,"_blank","noopener,noreferrer");}
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
  document.querySelector("[data-fire]")?.addEventListener("click",function(){
    score++;
    const s=document.querySelector("#score");if(s)s.textContent="SCORE "+score;
  });
  const gameSurface=document.querySelector<HTMLElement>("[data-game-touch]");
  if(gameSurface){
    let gameStartX=0;
    let gameActive=false;
    gameSurface.addEventListener("pointerdown",e=>{
      if((e.target as HTMLElement).closest("button"))return;
      gameStartX=e.clientX;
      gameActive=true;
      gameSurface.setPointerCapture?.(e.pointerId);
    },{passive:false});
    gameSurface.addEventListener("pointermove",e=>{
      if(!gameActive)return;
      const rect=gameSurface.getBoundingClientRect();
      player=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width));
      startGame();
    },{passive:false});
    gameSurface.addEventListener("pointerup",()=>{
      if(gameActive){gameActive=false;score++;const s=document.querySelector("#score");if(s)s.textContent="SCORE "+score;}
    });
    gameSurface.addEventListener("pointercancel",()=>{gameActive=false;});
  }
  bindPortalSwipeNavigation();
}

function bindPortalSwipeNavigation(){
  const root=document.querySelector<HTMLElement>(".app-shell");
  if(!root||root.dataset.swipeBound==="true")return;
  root.dataset.swipeBound="true";
  const order:View[]=["home","live","chat","game","radio","library"];
  let startX=0,startY=0,startTime=0,pointerId:number|null=null;
  root.addEventListener("pointerdown",e=>{
    if(e.pointerType==="mouse"&&e.button!==0)return;
    const target=e.target as HTMLElement;
    if(target.closest("input,textarea,button,a,select"))return;
    startX=e.clientX;startY=e.clientY;startTime=Date.now();pointerId=e.pointerId;
  },{passive:true});
  root.addEventListener("pointerup",e=>{
    if(pointerId!==e.pointerId)return;
    pointerId=null;
    const dx=e.clientX-startX,dy=e.clientY-startY,dt=Date.now()-startTime;
    if(dt>650||Math.abs(dx)<64||Math.abs(dx)<Math.abs(dy)*1.35)return;
    const index=order.indexOf(view);
    if(index<0)return;
    const nextIndex=dx<0?Math.min(order.length-1,index+1):Math.max(0,index-1);
    if(nextIndex===index)return;
    portalEvents.emit("navigation:changed",{view:order[nextIndex]});
  },{passive:true});
}
function escapeHtml(s:string){
  return s.replace(/[&<>"']/g,function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]||c;
  });
}

function startGame(){
  const c=document.querySelector<HTMLCanvasElement>("#canvas");
  if(!c)return;
  const r=c.getBoundingClientRect();
  c.width=Math.max(320,r.width);
  c.height=Math.max(420,r.height);
  const x=c.getContext("2d")!;
  x.fillStyle="#080d12";
  x.fillRect(0,0,c.width,c.height);
  x.fillStyle="#ffd166";
  x.beginPath();
  x.arc(c.width*.5,c.height*.2,20,0,Math.PI*2);
  x.fill();
  x.fillStyle="#35e0a1";
  x.beginPath();
  x.moveTo(c.width*player,c.height*.8);
  x.lineTo(c.width*player-28,c.height*.9);
  x.lineTo(c.width*player+28,c.height*.9);
  x.closePath();
  x.fill();
}

render();
if(view==="home"&&!radioStations.length&&!radioLoading&&!radioError)void loadRadioStations();
