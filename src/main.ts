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

type EditorBlock={id:string;label:string;span:1|2;order:number};
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
        base[key]=saved[key]!.map((b,i)=>({id:String(b.id),label:String(b.label||b.id),span:b.span===2?2:1,order:i}));
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
function renderEditor(){
  const screens:Array<[View,string]>=[["home","HOME"],["live","LIVE"],["chat","CHAT"],["game","GAME"],["radio","RADIO"],["library","LIBRARY"]];
  const blocks=orderedBlocks(editorScreen);
  return `
    <aside class="dev editor-overlay">
      <div class="dev-panel editor-panel">
        <div class="editor-head">
          <div>
            <span class="radio-kicker">FREEzzz EDITOR</span>
            <h2>Редакторская схема интерфейса</h2>
            <p>Перетаскивай готовые блоки, меняй подписи и ширину. Схема сохраняется отдельно от механики модулей.</p>
          </div>
          <button class="tg-button secondary" data-interface-toggle>Пользователь</button>
        </div>
        <div class="editor-screen-tabs">
          ${screens.map(([id,label])=>`<button type="button" data-editor-screen="${id}" class="${editorScreen===id?"active":""}">${label}</button>`).join("")}
        </div>
        <div class="editor-toolbar">
          <button class="tg-button" data-editor-save>Сохранить схему</button>
          <button class="tg-button secondary" data-editor-export>Показать JSON</button>
          <button class="tg-button secondary" data-editor-reset>Сбросить экран</button>
        </div>
        <div class="editor-canvas" data-editor-canvas>
          ${blocks.map((block,index)=>`
            <article class="editor-block span-${block.span}" draggable="true" data-editor-block="${escapeHtml(block.id)}" data-editor-index="${index}">
              <div class="editor-block-drag" title="Перетащить">⠿</div>
              <div class="editor-block-preview">
                <span class="editor-block-type">${escapeHtml(block.id)}</span>
                <input class="editor-block-label" data-editor-label="${escapeHtml(block.id)}" value="${escapeHtml(block.label)}" maxlength="80" aria-label="Подпись блока">
              </div>
              <button type="button" class="editor-span" data-editor-span="${escapeHtml(block.id)}">${block.span===2?"↔ 100%":"↔ 50%"}</button>
            </article>`).join("")}
        </div>
        <div class="editor-status">${escapeHtml(editorMessage||"Изменения пока только в редакторе. Нажми «Сохранить схему», когда план готов.")}</div>
        <textarea class="editor-json" id="editor-json" placeholder="Здесь появится JSON схемы. Его можно скопировать и прислать мне для анализа."></textarea>
      </div>
    </aside>`;
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
      <div class="content">
        <section class="hero">
          <h1>FREEzzz</h1>
          <p>Твой игровой портал внутри одной вертикальной оболочки.</p>
        </section>
        <div class="home-grid">
          ${card("live","📺","LIVE","Стримеры и каналы")}
          ${card("chat","💬","CHAT","Общение")}
          ${card("game","🛸","GAME","Игровая зона")}
          ${card("radio","📻","RADIO","Музыка")}
          ${card("library","🗂️","LIBRARY","Твоя библиотека")}
        </div>
      </div>`;
  }

  if(view==="live"){
    body=`
      <div class="content">
        <div class="section-head">
          <div><h2>LIVE</h2><p>Стримеры и трансляции</p></div>
          <button class="tg-button secondary" data-view="home">⌂</button>
        </div>
        <div class="list">
          ${streams.map(function(s){
            return `<article class="stream">
              <div class="avatar">${s[0]}</div>
              <div><b>${s[1]}</b><small>● OFFLINE · ${s[2]}</small></div>
              <button class="tg-button secondary" data-url="${s[3]}">Открыть</button>
            </article>`;
          }).join("")}
        </div>
        <div class="player"><p>Окно трансляции<br>Здесь будет воспроизводиться выбранный канал.</p></div>
      </div>`;
  }

  if(view==="chat"){
    body=`
      <div class="content">
        <div class="section-head">
          <div><h2>CHAT</h2><p>Общение FREEzzz</p></div>
          <button class="tg-button secondary" data-view="home">⌂</button>
        </div>
        <div class="chat"><p><b>FREEzzzBot</b><br>Добро пожаловать в FREEzzz.</p></div>
        <form id="chatform">
          <input id="chatinput" placeholder="Сообщение…" autocomplete="off">
          <button class="tg-button">Отправить</button>
        </form>
      </div>`;
  }

  if(view==="game"){
    body=`
      <div class="content">
        <div class="section-head">
          <div><h2>GAME</h2><p>DUCK BLAST</p></div>
          <button class="tg-button secondary" data-view="home">⌂</button>
        </div>
        <div class="game"><canvas id="canvas"></canvas><b id="score">SCORE ${score}</b></div>
        <div class="controls">
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
      <div class="content">
        <div class="section-head"><div><h2>RADIO</h2><p>Internet Radio · FREEzzz Audio Lab</p></div><button class="tg-button secondary" data-view="home">⌂</button></div>
        <section class="radio-panel">
          <div class="radio-heading">
            <div><span class="radio-kicker">FREEzzz RADIO</span><h3>Internet Radio</h3><p>Выбери станцию по логотипу и запусти её прямо внутри портала.</p></div>
          </div>
          <div class="radio-carousel" id="radio-carousel" aria-label="Radio station carousel">
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
          <div class="radio-now-playing">
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
          <form id="radio-search-form" class="inline-form"><input id="radio-search-input" value="${escapeHtml(radioQuery)}" maxlength="80" placeholder="Search station"><button class="tg-button" type="submit">Search</button></form>
          <div class="radio-genres">${RADIO_GENRES.map(g=>`<button type="button" data-radio-genre="${escapeHtml(g)}" class="${radioGenre===g?"active":""}">${escapeHtml(g)}</button>`).join("")}</div>
          ${radioError?`<div class="radio-status">${escapeHtml(radioError)}</div>`:""}
        </section>
      </div>`;
  }

  if(view==="library"){
    body=`
      <div class="content">
        <section class="hero">
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
          <button class="icon-button interface-mode-button" data-interface-toggle aria-label="${interfaceMode==="editor"?"Перейти в режим пользователя":"Показать интерфейс разработчика"}" title="${interfaceMode==="editor"?"Перейти в режим пользователя":"Показать интерфейс разработчика"}"><span class="nav-icon settings-icon"></span></button>
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
  bind();
  if(view==="game")startGame();
}

function card(v:View,e:string,t:string,d:string){
  return `<button class="card" data-view="${v}"><b>${e}</b><strong>${t}</strong><span>${d}</span></button>`;
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
  document.querySelectorAll<HTMLElement>("[data-editor-screen]").forEach(function(x){x.onclick=function(){editorScreen=x.dataset.editorScreen as View;editorMessage="";render();};});
  document.querySelectorAll<HTMLElement>("[data-editor-span]").forEach(function(x){x.onclick=function(){const b=editorLayout[editorScreen].find(b=>b.id===x.dataset.editorSpan);if(b){b.span=b.span===2?1:2;render();}};});
  document.querySelectorAll<HTMLInputElement>("[data-editor-label]").forEach(function(x){x.oninput=function(){const b=editorLayout[editorScreen].find(b=>b.id===x.dataset.editorLabel);if(b)b.label=x.value;};});
  document.querySelectorAll<HTMLElement>("[data-editor-block]").forEach(function(x){
    x.addEventListener("dragstart",()=>{x.dataset.dragging="true";});
    x.addEventListener("dragend",()=>{delete x.dataset.dragging;});
    x.addEventListener("dragover",e=>e.preventDefault());
    x.addEventListener("drop",e=>{e.preventDefault();const from=Number(document.querySelector<HTMLElement>("[data-editor-block][data-dragging='true']")?.dataset.editorIndex??-1);const to=Number(x.dataset.editorIndex??-1);if(from<0||to<0||from===to)return;const list=orderedBlocks(editorScreen);const [moved]=list.splice(from,1);list.splice(to,0,moved);list.forEach((b,i)=>b.order=i);editorLayout[editorScreen]=list;render();});
  });
  document.querySelector("[data-editor-save]")?.addEventListener("click",()=>{try{localStorage.setItem(EDITOR_LAYOUT_KEY,JSON.stringify(editorLayout));editorMessage="Схема сохранена локально на этом устройстве.";}catch{editorMessage="Не удалось сохранить схему."; }render();});
  document.querySelector("[data-editor-export]")?.addEventListener("click",()=>{const box=document.querySelector<HTMLTextAreaElement>("#editor-json");if(box)box.value=JSON.stringify(editorSchema(),null,2);editorMessage="JSON готов — его можно скопировать и прислать мне.";});
  document.querySelector("[data-editor-reset]")?.addEventListener("click",()=>{editorLayout[editorScreen]=cloneEditorDefaults()[editorScreen];editorMessage="Экран возвращён к исходной схеме.";render();});
  document.querySelectorAll<HTMLElement>("[data-interface-toggle]").forEach(function(x){x.onclick=function(){interfaceMode=interfaceMode==="editor"?"user":"editor";dev=interfaceMode==="editor";try{localStorage.setItem(INTERFACE_MODE_KEY,interfaceMode);}catch{}if(interfaceMode==="user")view="home";render();};});
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
  return s.replace(/[&<>]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;"}[c]||c;});
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
