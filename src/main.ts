import { RadioBrowserClient, RADIO_GENRES, type RadioBrowserStation } from "./radio-browser";
import "./styles.css";
import { initPortalPalette } from "./design-system/theme";
import { PORTAL_BUILD_ID, PORTAL_VERSION } from "./build-info";

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

type View = "home"|"live"|"chat"|"game"|"radio"|"library";

const app=document.querySelector<HTMLDivElement>("#app")!;
let view:View="home";
let lang="RU";
type InterfaceMode = "user"|"editor";
const INTERFACE_MODE_KEY = "freezzz:interface-mode";
const CONSTRUCTOR_ENABLED_KEY = "freezzz:constructor-enabled";
let constructorEnabled=(()=>{try{return localStorage.getItem(CONSTRUCTOR_ENABLED_KEY)!=="disabled";}catch{return true;}})();
let interfaceMode:InterfaceMode=(()=>{try{return localStorage.getItem(INTERFACE_MODE_KEY)==="editor"?"editor":"user";}catch{return "user";}})();
let dev=interfaceMode==="editor";
let profileOpen=false;
let liveSelected="";
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

type EditorBlock={id:string;label:string;span:1|2;order:number;x?:number;y?:number;w?:number;h?:number};
const TELEGRAM_CANVAS={width:360,height:640};
type EditorLayout=Record<View,EditorBlock[]>;
const EDITOR_LAYOUT_KEY="freezzz:editor-layout";
const EDITOR_GEOMETRY_VERSION_KEY="freezzz:editor-geometry-version";
const EDITOR_GEOMETRY_VERSION=3;
const EDITOR_DEFAULTS:EditorLayout={
  home:[
    {id:"hero",label:"Главный экран / приветствие",span:2,order:0},
    {id:"live",label:"LIVE — Стримеры и каналы",span:1,order:1},
    {id:"chat",label:"CHAT — Общение",span:1,order:2},
    {id:"game",label:"GAME — Игровая зона",span:1,order:3},
    {id:"radio",label:"RADIO — Музыка",span:1,order:4},
    {id:"library",label:"LIBRARY — Библиотека",span:1,order:5}
  ],
  live:[
    {id:"header",label:"LIVE — Заголовок",span:2,order:0},
    {id:"streams",label:"Список стримеров",span:2,order:1},
    {id:"player",label:"Окно трансляции",span:2,order:2}
  ],
  chat:[
    {id:"header",label:"CHAT — Заголовок",span:2,order:0},
    {id:"messages",label:"Лента сообщений",span:2,order:1},
    {id:"composer",label:"Поле сообщения",span:2,order:2}
  ],
  game:[
    {id:"header",label:"GAME — Заголовок",span:2,order:0},
    {id:"game",label:"Игровое окно",span:2,order:1},
    {id:"controls",label:"Игровое управление",span:2,order:2}
  ],
  radio:[
    {id:"header",label:"RADIO — Заголовок",span:2,order:0},
    {id:"carousel",label:"Карусель станций",span:2,order:1},
    {id:"nowplaying",label:"NOW PLAYING",span:2,order:2},
    {id:"search",label:"Поиск станции",span:2,order:3},
    {id:"genres",label:"Жанры",span:2,order:4}
  ],
  library:[
    {id:"content",label:"LIBRARY — Библиотека",span:2,order:0}
  ]
};
function cloneEditorDefaults():EditorLayout{
  return JSON.parse(JSON.stringify(EDITOR_DEFAULTS)) as EditorLayout;
}
function loadEditorLayout():EditorLayout{
  try{
    const raw=localStorage.getItem(EDITOR_LAYOUT_KEY);
    if(!raw)return cloneEditorDefaults();
    const saved=JSON.parse(raw) as Partial<EditorLayout>;
    const base=cloneEditorDefaults();
    const geometryVersion=Number(localStorage.getItem(EDITOR_GEOMETRY_VERSION_KEY)||"0");
    const migrateGeometry=geometryVersion<EDITOR_GEOMETRY_VERSION;
    for(const key of Object.keys(base) as View[]){
      if(Array.isArray(saved[key])&&saved[key]!.length){
        base[key]=saved[key]!.map((b,i)=>({
          id:String(b.id),
          label:String(b.label||b.id),
          span:b.span===2?2:1,
          order:i,
          x:migrateGeometry?undefined:(Number.isFinite(Number(b.x))?Math.max(0,Math.min(100,Number(b.x))):undefined),
          y:migrateGeometry?undefined:(Number.isFinite(Number(b.y))?Math.max(0,Math.min(100,Number(b.y))):undefined),
          w:migrateGeometry?undefined:(Number.isFinite(Number(b.w))?Math.max(10,Math.min(100,Number(b.w))):undefined),
          h:migrateGeometry?undefined:(Number.isFinite(Number(b.h))?Math.max(4,Math.min(100,Number(b.h))):undefined)
        }));
      }
    }
    for(const key of Object.keys(base) as View[]){
      const blocks=base[key];
      const positioned=blocks.filter(b=>b.x!==undefined&&b.y!==undefined&&b.w!==undefined&&b.h!==undefined);
      const invalid=positioned.some((a,i)=>positioned.slice(i+1).some(b=>
        a.x!<b.x!+b.w! && a.x!+a.w!>b.x! &&
        a.y!<b.y!+b.h! && a.y!+a.h!>b.y!
      ));
      if(migrateGeometry||invalid){
        blocks.forEach(b=>{b.x=undefined;b.y=undefined;b.w=undefined;b.h=undefined;});
      }
    }
    try{localStorage.setItem(EDITOR_GEOMETRY_VERSION_KEY,String(EDITOR_GEOMETRY_VERSION));}catch{}
    return base;
  }catch{return cloneEditorDefaults();}
}
let editorLayout:EditorLayout=loadEditorLayout();
let editorScreen:View="home";
let editorMessage="";
function orderedBlocks(screen:View){
  return [...editorLayout[screen]].sort((a,b)=>a.order-b.order);
}
function defaultEditorGeometry(screen:View,index:number,count:number,span:1|2){
  const presets:Record<View,Array<[number,number]>>={
    home:[[0,10],[11,43],[11,43],[55,33],[89,10],[89,10]],
    live:[[0,12],[14,48],[64,30]],
    chat:[[0,12],[14,58],[74,14]],
    game:[[0,12],[14,64],[80,12]],
    radio:[[0,10],[12,34],[48,18],[68,12],[82,12]],
    library:[[0,88]]
  };
  const preset=presets[screen][Math.min(index,presets[screen].length-1)]||[Math.min(92,index*12),Math.max(6,Math.floor(82/Math.max(1,count)))];
  if(screen==="home"){
    const homePositions=[[5,0,90,10],[5,11,42,43],[53,11,42,43],[5,55,90,33],[5,89,42,10],[53,89,42,10]];
    const p=homePositions[Math.min(index,homePositions.length-1)];
    return {x:p[0],y:p[1],w:p[2],h:p[3]};
  }
  return {x:5,y:preset[0],w:90,h:preset[1]};
}
function editorGeometry(screen:View,block:EditorBlock,index:number,count:number){
  const fallback=defaultEditorGeometry(screen,index,count,block.span);
  return {
    x:block.x??fallback.x,
    y:block.y??fallback.y,
    w:block.w??fallback.w,
    h:block.h??fallback.h
  };
}
function editorLabel(screen:View,id:string,fallback:string){
  return editorLayout[screen].find(b=>b.id===id)?.label||fallback;
}
function editorSchema(){
  return {version:"0.0.1",type:"FREEzzz portal layout",screens:editorLayout};
}
function syncEditorBlocksFromDOM():boolean{
  const layout=app.querySelector<HTMLElement>("[data-portal-layout]");
  if(!layout)return false;
  const screen=layout.dataset.portalLayout as View;
  const known=new Set(editorLayout[screen].map(b=>b.id));
  let changed=false;
  layout.querySelectorAll<HTMLElement>("[data-portal-block]").forEach(element=>{
    const id=element.dataset.portalBlock?.trim();
    if(!id||known.has(id))return;
    const label=element.dataset.portalLabel?.trim()
      ||element.querySelector<HTMLElement>("h1,h2,h3,strong")?.textContent?.trim()
      ||id;
    editorLayout[screen].push({
      id,
      label:label.slice(0,80),
      span:element.dataset.portalSpan==="1"?1:2,
      order:editorLayout[screen].length,
      x:undefined,y:undefined,w:element.dataset.portalSpan==="1"?50:100,h:undefined
    });
    known.add(id);
    changed=true;
  });
  if(changed){
    try{localStorage.setItem(EDITOR_LAYOUT_KEY,JSON.stringify(editorLayout));}catch{}
  }
  return changed;
}
function editorBlockMarkup(block:EditorBlock,index:number){
  const count=editorLayout[editorScreen].length;
  const g=editorGeometry(editorScreen,block,index,count);
  const style="left:"+g.x+"%;top:"+g.y+"%;width:"+g.w+"%;height:"+g.h+"%;";
  return '<article class="editor-block block-color-'+(index%8)+'" data-editor-block="'+escapeHtml(block.id)+'" data-editor-index="'+index+'" data-editor-drag="'+escapeHtml(block.id)+'" style="'+style+'">'+
    '<div class="editor-block-drag" data-editor-drag-handle="'+escapeHtml(block.id)+'" title="Удерживай и перемещай" aria-label="Переместить блок">⠿</div>'+
    '<div class="editor-block-preview"><span class="editor-block-type">'+escapeHtml(block.id)+'</span>'+
    '<input class="editor-block-label" data-editor-label="'+escapeHtml(block.id)+'" value="'+escapeHtml(block.label)+'" maxlength="80" aria-label="Подпись блока"></div>'+
    '<div class="editor-block-actions" aria-label="Перемещение блока выполняется свайпом или перетаскиванием">'+
    '<span class="editor-drag-hint">SWIPE</span></div>'+
    '<span class="editor-resize-handle" data-editor-resize="'+escapeHtml(block.id)+'" title="Изменить размер" aria-label="Изменить размер"></span></article>';
}

function renderEditor(){
  const screens:Array<[View,string]>=[["home","HOME"],["live","LIVE"],["chat","CHAT"],["game","GAME"],["radio","RADIO"],["library","LIBRARY"]];
  const blocks=orderedBlocks(editorScreen);
  return `
    <aside class="dev editor-overlay">
      <div class="editor-live-preview" data-editor-live-preview>
        <div class="editor-preview-title"><span>USER UI</span><b>LIVE</b></div>
        <div class="editor-preview-device"><div class="editor-preview-screen" data-editor-preview-screen></div></div>
      </div>
      <div class="dev-panel editor-panel">
        <div class="editor-head">
          <div><span class="radio-kicker">FREEzzz EDITOR</span><h2>Конструктор интерфейса</h2>
          <p>Сенсор: удерживай блок и перемещай. Маркер внизу справа меняет размер. Изменения сразу видны в пользовательском интерфейсе и в USER UI LIVE.</p></div>
          <div class="editor-head-actions">
            <button class="tg-button secondary" data-editor-exit type="button">Выйти в меню</button>
            <button class="tg-button secondary editor-delete-button" data-constructor-remove type="button">Удалить конструктор</button>
          </div>
        </div>
        <div class="editor-screen-tabs">${screens.map(([id,label])=>'<button type="button" data-editor-screen="'+id+'" class="'+(editorScreen===id?"active":"")+'">'+label+'</button>').join("")}</div>
        <div class="editor-toolbar">
          <button class="tg-button" data-editor-add type="button">＋ Добавить блок</button>
          <button class="tg-button" data-editor-save type="button">Сохранить</button>
          <button class="tg-button secondary" data-editor-export type="button">JSON</button>
          <button class="tg-button secondary" data-editor-reset type="button">Сбросить</button>
        </div>
        <div class="editor-workspace" data-editor-workspace><div class="editor-sheet"><div class="editor-sheet-grid" aria-hidden="true"></div>
          <div class="editor-canvas" data-editor-canvas>${blocks.map(editorBlockMarkup).join("")}</div>
        </div></div>
        <div class="editor-status">${escapeHtml(editorMessage||"LIVE: изменения применяются сразу. «Сохранить» записывает их на устройство.")}</div>
        <textarea class="editor-json" id="editor-json" placeholder="JSON схемы"></textarea>
      </div>
    </aside>`;
}

function updateEditorPreview(){
  const preview=document.querySelector<HTMLElement>("[data-editor-preview-screen]");
  if(!preview)return;
  const source=document.querySelector<HTMLElement>("main .content[data-portal-layout]");
  preview.innerHTML="";
  if(!source){
    preview.innerHTML='<div class="editor-preview-empty">Нет экрана</div>';
    return;
  }
  const clone=source.cloneNode(true) as HTMLElement;
  clone.removeAttribute("id");
  clone.classList.add("editor-preview-content");
  applyLayoutToRoot(clone,editorScreen);
  clone.querySelectorAll<HTMLElement>("[data-url]").forEach(el=>el.removeAttribute("data-url"));
  clone.querySelectorAll("button,input,textarea").forEach(el=>el.setAttribute("tabindex","-1"));
  preview.appendChild(clone);
}

function syncEditorRuntime(){
  const layout=document.querySelector<HTMLElement>("[data-portal-layout]");
  if(layout&&layout.dataset.portalLayout===editorScreen&&editorScreen!=="home"){
    applyLayoutToRoot(layout,editorScreen);
    for(const block of editorLayout[editorScreen]){
      const target=layout.querySelector<HTMLElement>("[data-portal-block='"+CSS.escape(block.id)+"']");
      if(!target)continue;
      const textTarget=target.querySelector<HTMLElement>("h1,h2,h3,strong");
      if(textTarget&&block.label)textTarget.textContent=block.label;
    }
  }
  updateEditorPreview();
}


const streams=[
  ["🦆","Leb1ga","YouTube","https://www.youtube.com/@leb1ga"],
  ["🎮","Dendi","YouTube","https://www.youtube.com/@Dendi"],
  ["⚡","Papaplatte","YouTube","https://www.youtube.com/@papaplatte"],
  ["🕹️","Marmok","YouTube","https://www.youtube.com/@Marmok"],
  ["🚀","Trymacs","Twitch","https://www.twitch.tv/trymacs"]
];

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
        ${homeCard("live","📺",editorLabel("home","live","LIVE — Стримеры и каналы"),'<div class="home-live-preview" data-home-live-content></div>')}
        ${homeCard("chat","💬",editorLabel("home","chat","CHAT — Общение"),'<div class="home-chat-preview" data-home-chat-content></div>')}
        ${homeCard("game","🛸",editorLabel("home","game","GAME — Игровая зона"),'<div class="home-game-preview" data-home-game-content></div>')}
        ${homeCard("radio","📻",editorLabel("home","radio","RADIO — Музыка"),'<div class="home-radio-preview" data-home-radio-content></div>')}
        ${homeCard("library","🗂️",editorLabel("home","library","LIBRARY — Библиотека"),'<div class="home-library-preview" data-home-library-content></div>')}
      </div>`;
  }

  if(view==="live"){
    body=`
      <div class="content portal-layout" data-portal-layout="live">
        <div class="section-head portal-block" data-portal-block="header">
          <div><h2>LIVE</h2><p>Стримеры и трансляции</p></div>
          <button class="tg-button secondary" data-view="home">⌂</button>
        </div>
        <div class="list portal-block" data-portal-block="streams">
          ${streams.map(function(s){
            return `<article class="stream">
              <div class="avatar">${s[0]}</div>
              <div><b>${s[1]}</b><small>● OFFLINE · ${s[2]}</small></div>
              <button class="tg-button secondary" data-live-select="${escapeHtml(s[1])}" data-url="${s[3]}">Открыть</button>
            </article>`;
          }).join("")}
        </div>
        <div class="player portal-block" data-portal-block="player"><p>${liveSelected?`Выбран: <b>${escapeHtml(liveSelected)}</b><br>Канал открыт через Telegram WebApp.`:"Окно трансляции<br>Выбери канал выше."}</p></div>
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
    <div class="app-shell ${interfaceMode==="editor"?"editor-mode":""}">
      <header class="topbar">
        <div class="topbar-left">
          <button class="profile-button" data-profile-toggle type="button" aria-label="Profile"><span class="profile-glyph"></span></button>
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
      </header>
      <nav class="bottom-nav" aria-label="Portal navigation">
        <button class="bottom-nav-item ${view==="chat"?"active":""}" data-view="chat" aria-label="Chat" title="CHAT">
          <span class="nav-icon chat-icon"><i></i><i></i><i></i></span><span>CHAT</span>
        </button>
        <button class="bottom-nav-item ${view==="radio"?"active":""}" data-view="radio" aria-label="Radio" title="RADIO">
          <span class="bottom-radio-icon" aria-hidden="true"></span><span>RADIO</span>
        </button>
        <button class="bottom-nav-item bottom-nav-home ${view==="home"?"active":""}" data-view="home" aria-label="Home" title="HOME">
          <span class="nav-icon home-icon"></span><span>HOME</span>
        </button>
        ${constructorEnabled?`<button class="bottom-nav-item ${interfaceMode==="editor"?"active":""}" data-interface-toggle type="button" aria-label="${interfaceMode==="editor"?"Показать пользовательский интерфейс":"Показать интерфейс разработчика"}" title="${interfaceMode==="editor"?"USER UI":"DEV UI"}">
          <span class="nav-icon settings-icon"></span><span>DEV</span>
        </button>`:""}
      </nav>
      <main>${body}</main>
      ${profileOpen?`<div class="profile-overlay" data-profile-close><section class="profile-card" data-profile-card><button class="icon-button profile-close" data-profile-toggle type="button" aria-label="Закрыть">×</button><span class="profile-avatar">F</span><h2>FREEzzz</h2><p>Профиль пользователя</p><div class="profile-actions"><button class="tg-button" data-view="home" type="button">HOME</button><button class="tg-button secondary" data-profile-toggle type="button">Закрыть</button></div></section></div>`:""}
      ${dev?renderEditor():""}
      ${false?`<aside class="dev">
        <div class="dev-panel">
          <h2>Редакторская схема интерфейса</h2>
          <pre>${JSON.stringify({version:"0.0.1",view:view,language:lang,stage21:"EXCLUDED",modules:["LIVE","CHAT","GAME","RADIO","LIBRARY"]},null,2)}</pre>
        </div>
      </aside>`:""}
    </div>`;
  const editorBlocksChanged=syncEditorBlocksFromDOM();
  if(editorBlocksChanged&&interfaceMode==="editor"){
    app.querySelector(".editor-overlay")?.remove();
    app.querySelector(".app-shell")?.insertAdjacentHTML("beforeend",renderEditor());
  }
  bind();
  applySavedPortalLayout();
  if(view==="game")startGame();
  if(view==="home")ensureHomeRefresh();
  if(dev)updateEditorPreview();
}

function homeCard(v:View,e:string,t:string,content:string){
  return `<button class="card home-card portal-block home-${v}" data-view="${v}" data-portal-card="${v}" data-portal-block="${v}">
    <div class="home-card-head"><b class="home-card-icon">${e}</b><strong>${t}</strong></div>
    ${content}
  </button>`;
}
function refreshHomeContent(){
  if(view!=="home")return;
  const clock=document.querySelector<HTMLElement>("[data-home-clock]");
  if(clock)clock.textContent=new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit",second:"2-digit"});
  const live=document.querySelector<HTMLElement>("[data-home-live-content]");
  if(live){
    live.innerHTML=streams.slice(0,3).map(s=>`<span class="home-live-row"><i>${escapeHtml(s[0])}</i><b>${escapeHtml(s[1])}</b><small>● OFFLINE · ${escapeHtml(s[2])}</small></span>`).join("");
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
function applyLayoutToRoot(root:HTMLElement,screen:View){
  if(screen==="home")return;
  const layout=root.matches("[data-portal-layout]")?root:root.querySelector<HTMLElement>("[data-portal-layout]");
  if(!layout)return;
  const blocks=orderedBlocks(screen);
  if(screen==="radio"){
    // RADIO contains nested functional controls; keep its internal responsive layout intact.
    layout.style.position="";
    return;
  }
  layout.style.position="relative";
  const byId=new Map<string,HTMLElement>();
  layout.querySelectorAll<HTMLElement>(":scope > [data-portal-block]").forEach(el=>byId.set(el.dataset.portalBlock||"",el));
  blocks.forEach((block,index)=>{
    const el=byId.get(block.id);
    if(!el)return;
    const g=editorGeometry(screen,block,index,blocks.length);
    el.style.order=String(index);
    el.style.gridColumn="1 / -1";
    el.style.position="absolute";
    el.style.left=g.x+"%";
    el.style.top=g.y+"%";
    el.style.width=g.w+"%";
    el.style.height=g.h+"%";
    el.style.boxSizing="border-box";
  });
}

function applySavedPortalLayout(){
  const layout=document.querySelector<HTMLElement>("[data-portal-layout]");
  if(!layout)return;
  const screen=layout.dataset.portalLayout as View;
  if(screen==="home")return;
  applyLayoutToRoot(layout,screen);
}

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
      view=next;
      render();
    };
  });
  document.querySelectorAll<HTMLElement>("[data-profile-toggle]").forEach(function(x){
    x.onclick=function(e){e.preventDefault();e.stopPropagation();profileOpen=!profileOpen;render();};
  });
  document.querySelector("[data-editor-exit]")?.addEventListener("click",function(e){
    e.preventDefault();
    e.stopPropagation();
    interfaceMode="user";
    dev=false;
    view="home";
    try{localStorage.setItem(INTERFACE_MODE_KEY,"user");}catch{}
    render();
  });
  document.querySelectorAll<HTMLElement>("[data-interface-toggle]").forEach(function(x){
    x.onclick=function(e){
      e.preventDefault();
      e.stopPropagation();
      interfaceMode=interfaceMode==="editor"?"user":"editor";
      dev=interfaceMode==="editor";
      try{localStorage.setItem(INTERFACE_MODE_KEY,interfaceMode);}catch{}
      render();
    };
  });
  document.querySelectorAll<HTMLElement>("[data-profile-close]").forEach(function(x){
    x.onclick=function(){profileOpen=false;render();};
  });
  document.querySelectorAll<HTMLElement>("[data-profile-card]").forEach(function(x){
    x.onclick=function(e){e.stopPropagation();};
  });
  document.querySelectorAll<HTMLElement>("[data-live-select]").forEach(function(x){
    x.onclick=function(){liveSelected=x.dataset.liveSelect||"";render();};
  });
  document.querySelectorAll<HTMLElement>("[data-lang]").forEach(function(x){x.onclick=function(){lang=x.dataset.lang||"RU";render();};});
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
  document.querySelectorAll<HTMLElement>("[data-editor-screen]").forEach(function(x){
    x.onclick=function(){editorScreen=x.dataset.editorScreen as View;editorMessage="";view=editorScreen;render();};
  });
  document.querySelectorAll<HTMLElement>("[data-editor-move]").forEach(function(x){
    x.onclick=function(){
      const id=x.dataset.editorId!, direction=Number(x.dataset.editorMove||0);
      const list=orderedBlocks(editorScreen), index=list.findIndex(b=>b.id===id), next=index+direction;
      if(index<0||next<0||next>=list.length)return;
      const [moved]=list.splice(index,1); list.splice(next,0,moved); list.forEach((b,i)=>b.order=i);
      editorLayout[editorScreen]=list; render();
    };
  });
  document.querySelectorAll<HTMLInputElement>("[data-editor-label]").forEach(function(x){
    x.oninput=function(){
      const b=editorLayout[editorScreen].find(b=>b.id===x.dataset.editorLabel);
      if(b){b.label=x.value;syncEditorRuntime();}
    };
  });
  document.querySelectorAll<HTMLElement>("[data-editor-resize]").forEach(function(handle){
    handle.addEventListener("pointerdown",function(e){
      e.preventDefault();e.stopPropagation();
      const id=handle.dataset.editorResize!, block=editorLayout[editorScreen].find(b=>b.id===id);
      const canvas=document.querySelector<HTMLElement>(".editor-canvas"), el=handle.closest<HTMLElement>(".editor-block");
      if(!block||!canvas||!el)return;
      const rect=canvas.getBoundingClientRect(), startX=e.clientX,startY=e.clientY;
      const startW=block.w??(block.span===2?100:50), startH=block.h??Math.max(6,(el.getBoundingClientRect().height/rect.height)*100);
      const move=(ev:PointerEvent)=>{
        block.w=Math.max(10,Math.min(100-(block.x??0),startW+((ev.clientX-startX)/rect.width)*100));
        block.h=Math.max(6,Math.min(100-(block.y??0),startH+((ev.clientY-startY)/rect.height)*100));
        el.style.width=block.w+"%";el.style.height=block.h+"%";syncEditorRuntime();
      };
      const up=()=>{window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",up);};
      window.addEventListener("pointermove",move,{passive:false});window.addEventListener("pointerup",up,{once:true});
    },{passive:false});
  });
  document.querySelectorAll<HTMLElement>("[data-editor-drag]").forEach(function(x){
    x.addEventListener("pointerdown",function(e){
      if((e.target as HTMLElement).closest("input,button,[data-editor-resize]"))return;
      e.preventDefault();
      const canvas=document.querySelector<HTMLElement>(".editor-canvas"),id=x.dataset.editorDrag!,block=editorLayout[editorScreen].find(b=>b.id===id);
      if(!canvas||!block)return;
      const rect=canvas.getBoundingClientRect(),startX=e.clientX,startY=e.clientY;
      const ox=block.x??Math.max(0,Math.min(100,(x.offsetLeft/rect.width)*100));
      const oy=block.y??Math.max(0,Math.min(100,(x.offsetTop/rect.height)*100));
      const move=(ev:PointerEvent)=>{
        block.x=Math.max(0,Math.min(100-(block.w??(block.span===2?100:50)),ox+((ev.clientX-startX)/rect.width)*100));
        block.y=Math.max(0,Math.min(100-(block.h??10),oy+((ev.clientY-startY)/rect.height)*100));
        x.style.left=block.x+"%";x.style.top=block.y+"%";syncEditorRuntime();
      };
      const up=()=>{window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",up);};
      window.addEventListener("pointermove",move,{passive:false});window.addEventListener("pointerup",up,{once:true});
    },{passive:false});
  });
  document.querySelector("[data-editor-add]")?.addEventListener("click",()=>{
    const list=orderedBlocks(editorScreen);
    const used=new Set(list.map(b=>b.id));
    let number=list.length+1;
    let id="custom-"+number;
    while(used.has(id)){number++;id="custom-"+number;}
    const block:EditorBlock={id,label:"Новый блок",span:1,order:list.length,x:5,y:Math.min(88,8+list.length*10),w:90,h:9};
    editorLayout[editorScreen]=[...list,block];
    editorMessage="Новый визуальный блок добавлен.";
    render();
  });
  document.querySelector("[data-editor-save]")?.addEventListener("click",()=>{
    try{localStorage.setItem(EDITOR_LAYOUT_KEY,JSON.stringify(editorLayout));localStorage.setItem(EDITOR_GEOMETRY_VERSION_KEY,String(EDITOR_GEOMETRY_VERSION));editorMessage="Схема сохранена локально.";}
    catch{editorMessage="Не удалось сохранить схему."}
    render();
  });
  document.querySelector("[data-editor-export]")?.addEventListener("click",()=>{
    const box=document.querySelector<HTMLTextAreaElement>("#editor-json");if(box)box.value=JSON.stringify(editorSchema(),null,2);editorMessage="JSON готов.";
  });
  document.querySelector("[data-editor-reset]")?.addEventListener("click",()=>{
    editorLayout[editorScreen]=cloneEditorDefaults()[editorScreen];try{localStorage.setItem(EDITOR_GEOMETRY_VERSION_KEY,"2");}catch{};editorMessage="Экран сброшен.";render();
  });
  document.querySelector("[data-constructor-remove]")?.addEventListener("click",function(){
    constructorEnabled=false;
    interfaceMode="user";
    dev=false;
    try{
      localStorage.setItem(CONSTRUCTOR_ENABLED_KEY,"disabled");
      localStorage.setItem(INTERFACE_MODE_KEY,"user");
    }catch{}
    view="home";
    render();
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
    if(target.closest("input,textarea,button,a,select,[data-editor-drag],[data-editor-resize],.editor-overlay"))return;
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
    view=order[nextIndex];
    render();
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
