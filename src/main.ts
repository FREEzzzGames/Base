import { RadioBrowserClient, RADIO_GENRES, type RadioBrowserStation } from "./radio-browser";
import "./styles.css";
import { initPortalPalette } from "./design-system/theme";

initPortalPalette();

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
    for(const key of Object.keys(base) as View[]){
      if(Array.isArray(saved[key])&&saved[key]!.length){
        base[key]=saved[key]!.map((b,i)=>({id:String(b.id),label:String(b.label||b.id),span:b.span===2?2:1,order:i,x:Number.isFinite(Number(b.x))?Math.max(0,Math.min(100,Number(b.x))):undefined,y:Number.isFinite(Number(b.y))?Math.max(0,Math.min(100,Number(b.y))):undefined,w:Number.isFinite(Number(b.w))?Math.max(10,Math.min(100,Number(b.w))):undefined,h:Number.isFinite(Number(b.h))?Math.max(4,Math.min(100,Number(b.h))):undefined}));
      }
    }
    return base;
  }catch{return cloneEditorDefaults();}
}
let editorLayout:EditorLayout=loadEditorLayout();
let editorScreen:View="home";
let editorMessage="";
function orderedBlocks(screen:View){
  return [...editorLayout[screen]].sort((a,b)=>a.order-b.order);
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
          <div>
            <span class="radio-kicker">FREEzzz EDITOR</span>
            <h2>Конструктор интерфейса</h2>
            <p>Сенсор: удерживай блок и перемещай. Нижний правый маркер меняет размер. Все изменения сразу отражаются в пользовательском интерфейсе и в окне USER UI LIVE.</p>
          </div>
          <div class="editor-head-actions">
            <button class="tg-button secondary" data-interface-toggle type="button">Пользователь</button>
            <button class="tg-button secondary editor-delete-button" data-constructor-remove type="button">Удалить конструктор</button>
          </div>
        </div>
        <div class="editor-screen-tabs">
          \${screens.map(([id,label])=>`<button type="button" data-editor-screen="\${id}" class="\${editorScreen===id?"active":""}">\${label}</button>`).join("")}
        </div>
        <div class="editor-toolbar">
          <button class="tg-button" data-editor-save type="button">Сохранить</button>
          <button class="tg-button secondary" data-editor-export type="button">JSON</button>
          <button class="tg-button secondary" data-editor-reset type="button">Сбросить</button>
        </div>
        <div class="editor-workspace" data-editor-workspace>
          <div class="editor-sheet">
            <div class="editor-sheet-grid" aria-hidden="true"></div>
            <div class="editor-canvas" data-editor-canvas>
              \${blocks.map((block,index)=>`
                <article class="editor-block block-color-\${index%8}" data-editor-block="\${escapeHtml(block.id)}" data-editor-index="\${index}" data-editor-drag="\${escapeHtml(block.id)}" style="\${block.x!==undefined?`left:\${block.x}%;`:``}\${block.y!==undefined?`top:\${block.y}%;`:``}\${block.w!==undefined?`width:\${block.w}%;`:``}\${block.h!==undefined?`height:\${block.h}%;`:``}">
                  <div class="editor-block-drag" data-editor-drag-handle="\${escapeHtml(block.id)}" title="Удерживай и перемещай" aria-label="Переместить блок">⠿</div>
                  <div class="editor-block-preview">
                    <span class="editor-block-type">\${escapeHtml(block.id)}</span>
                    <input class="editor-block-label" data-editor-label="\${escapeHtml(block.id)}" value="\${escapeHtml(block.label)}" maxlength="80" aria-label="Подпись блока">
                  </div>
                  <div class="editor-block-actions">
                    <button type="button" class="editor-move" data-editor-move="-1" data-editor-id="\${escapeHtml(block.id)}" aria-label="Выше">▲</button>
                    <button type="button" class="editor-move" data-editor-move="1" data-editor-id="\${escapeHtml(block.id)}" aria-label="Ниже">▼</button>
                  </div>
                  <span class="editor-resize-handle" data-editor-resize="\${escapeHtml(block.id)}" title="Изменить размер" aria-label="Изменить размер"></span>
                </article>`).join("")}
            </div>
          </div>
        </div>
        <div class="editor-status">\${escapeHtml(editorMessage||"LIVE: изменения конструктора применяются сразу. «Сохранить» записывает их на устройство.")}</div>
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
    preview.innerHTML="<div class="editor-preview-empty">Нет экрана</div>";
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
  if(layout&&layout.dataset.portalLayout===editorScreen){
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
      <div class="content portal-layout" data-portal-layout="home">
        <section class="hero portal-block" data-portal-block="hero">
          <h1>FREEzzz</h1>
          <p>Твой игровой портал внутри одной вертикальной оболочки.</p>
        </section>
            ${card("live","📺",editorLabel("home","live","LIVE — Стримеры и каналы"),"Стримеры и каналы")}
          ${card("chat","💬",editorLabel("home","chat","CHAT — Общение"),"Общение")}
          ${card("game","🛸",editorLabel("home","game","GAME — Игровая зона"),"Игровая зона")}
          ${card("radio","📻",editorLabel("home","radio","RADIO — Музыка"),"Музыка")}
          ${card("library","🗂️",editorLabel("home","library","LIBRARY — Библиотека"),"Твоя библиотека")}
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
              <button class="tg-button secondary" data-url="${s[3]}">Открыть</button>
            </article>`;
          }).join("")}
        </div>
        <div class="player portal-block" data-portal-block="player"><p>Окно трансляции<br>Здесь будет воспроизводиться выбранный канал.</p></div>
      </div>`;
  }

  if(view==="chat"){
    body=`
      <div class="content portal-layout" data-portal-layout="chat">
        <div class="section-head portal-block" data-portal-block="header">
          <div><h2>CHAT</h2><p>Общение FREEzzz</p></div>
          <button class="tg-button secondary" data-view="home">⌂</button>
        </div>
        <div class="chat portal-block" data-portal-block="messages"><p><b>FREEzzzBot</b><br>Добро пожаловать в FREEzzz.</p></div>
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
        <div class="game portal-block" data-portal-block="game"><canvas id="canvas"></canvas><b id="score">SCORE ${score}</b></div>
        <div class="controls portal-block" data-portal-block="controls">
          <button data-move="-0.1">◀</button>
          <button data-fire>🚀 FIRE</button>
          <button data-move="0.1">▶</button>
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
          <button class="profile-button" aria-label="Profile"><span class="profile-glyph"></span></button>
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

        <div class="top-actions" aria-label="Portal navigation">
          <button class="icon-button" data-view="chat" aria-label="Chat"><span class="nav-icon chat-icon"><i></i><i></i><i></i></span></button>
          <button class="icon-button radio-button" data-view="radio" aria-label="Radio"><span class="radio-glyph">📻</span></button>
          <button class="icon-button" data-view="home" aria-label="Home"><span class="nav-icon home-icon"></span></button>
          ${constructorEnabled?`<button class="icon-button interface-mode-button" data-interface-toggle aria-label="${interfaceMode==="editor"?"Перейти в режим пользователя":"Показать интерфейс разработчика"}" title="${interfaceMode==="editor"?"Перейти в режим пользователя":"Показать интерфейс разработчика"}"><span class="nav-icon settings-icon"></span></button>`:""}
        </div>
      </header>
      <main>${body}</main>
      ${dev?renderEditor():""}
      ${false?`<aside class="dev">
        <div class="dev-panel">
          <button class="tg-button secondary" data-interface-toggle>Перейти в режим пользователя</button>
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
  if(dev)updateEditorPreview();
}

function card(v:View,e:string,t:string,d:string){
  return `<button class="card portal-block" data-view="${v}" data-portal-card="${v}" data-portal-block="${v}"><b>${e}</b><strong>${t}</strong><span>${d}</span></button>`;
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
  const layout=root.matches("[data-portal-layout]")?root:root.querySelector<HTMLElement>("[data-portal-layout]");
  if(!layout)return;
  const blocks=orderedBlocks(screen);
  layout.style.position="relative";
  const byId=new Map<string,HTMLElement>();
  layout.querySelectorAll<HTMLElement>("[data-portal-block]").forEach(el=>byId.set(el.dataset.portalBlock||"",el));
  blocks.forEach((block,index)=>{
    const el=byId.get(block.id);
    if(!el)return;
    el.style.order=String(index);
    el.style.gridColumn=block.span===2?"1 / -1":"span 1";
    if(block.x!==undefined||block.y!==undefined||block.w!==undefined||block.h!==undefined){
      el.style.position="absolute";
      el.style.left=(block.x??0)+"%";
      el.style.top=(block.y??0)+"%";
      el.style.width=(block.w??(block.span===2?100:50))+"%";
      if(block.h!==undefined)el.style.height=block.h+"%";
    }else{
      el.style.position="";
      el.style.left="";
      el.style.top="";
      el.style.width="";
      el.style.height="";
    }
  });
}

function applySavedPortalLayout(){
  const layout=document.querySelector<HTMLElement>("[data-portal-layout]");
  if(layout)applyLayoutToRoot(layout,layout.dataset.portalLayout as View);
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
  document.querySelectorAll<HTMLElement>("[data-view]").forEach(function(x){x.onclick=function(){view=x.dataset.view as View;render();};});
  document.querySelectorAll<HTMLElement>("[data-lang]").forEach(function(x){x.onclick=function(){lang=x.dataset.lang||"RU";render();};});
  document.querySelectorAll<HTMLElement>("[data-url]").forEach(function(x){x.onclick=function(){window.open(x.dataset.url!,"_blank","noopener,noreferrer");};});
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
      const sheet=document.querySelector<HTMLElement>(".editor-sheet"), el=handle.closest<HTMLElement>(".editor-block");
      if(!block||!sheet||!el)return;
      const rect=sheet.getBoundingClientRect(), startX=e.clientX,startY=e.clientY;
      const startW=block.w??(block.span===2?100:50), startH=block.h??Math.max(8,(el.getBoundingClientRect().height/rect.height)*100);
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
      const sheet=document.querySelector<HTMLElement>(".editor-sheet"),id=x.dataset.editorDrag!,block=editorLayout[editorScreen].find(b=>b.id===id);
      if(!sheet||!block)return;
      const rect=sheet.getBoundingClientRect(),startX=e.clientX,startY=e.clientY;
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
  document.querySelector("[data-editor-save]")?.addEventListener("click",()=>{
    try{localStorage.setItem(EDITOR_LAYOUT_KEY,JSON.stringify(editorLayout));editorMessage="Схема сохранена локально.";}
    catch{editorMessage="Не удалось сохранить схему."}
    render();
  });
  document.querySelector("[data-editor-export]")?.addEventListener("click",()=>{
    const box=document.querySelector<HTMLTextAreaElement>("#editor-json");if(box)box.value=JSON.stringify(editorSchema(),null,2);editorMessage="JSON готов.";
  });
  document.querySelector("[data-editor-reset]")?.addEventListener("click",()=>{
    editorLayout[editorScreen]=cloneEditorDefaults()[editorScreen];editorMessage="Экран сброшен.";render();
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
    if(i.value.trim()){const box=document.querySelector(".chat")!;box.innerHTML+="<p><b>You</b><br>"+escapeHtml(i.value)+"</p>";i.value="";}
  });
  document.querySelector("#save")?.addEventListener("click",function(){localStorage.setItem("freezzz-library",JSON.stringify([{id:"duck-blast",savedAt:new Date().toISOString()}]));render();});
  document.querySelector("#clear")?.addEventListener("click",function(){localStorage.removeItem("freezzz-library");render();});
  document.querySelectorAll<HTMLElement>("[data-move]").forEach(function(x){x.onclick=function(){player=Math.max(0,Math.min(1,player+Number(x.dataset.move)));};});
  document.querySelector("[data-fire]")?.addEventListener("click",function(){score++;const s=document.querySelector("#score");if(s)s.textContent="SCORE "+score;});
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
