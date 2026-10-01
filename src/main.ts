import { WebMidiController, midiNoteName } from "./midi-controller";
import { RadioBrowserClient, RADIO_GENRES, type RadioBrowserStation } from "./radio-browser";
import "./styles.css";
import { initPortalPalette } from "./design-system/theme";

initPortalPalette();

type View = "home"|"live"|"chat"|"game"|"radio"|"library";

const app=document.querySelector<HTMLDivElement>("#app")!;
let view:View="home";
let lang="RU";
let dev=false;
let score=0;
let player=.5;
const radioBrowser=new RadioBrowserClient();
const midiController=new WebMidiController();
let radioStations:readonly RadioBrowserStation[]=[];
let radioGenre="pop";
let radioQuery="";
let radioLoading=false;
let radioError="";
let radioAudio:HTMLAudioElement|null=null;
let midiOutputs:readonly {id:string;name:string;manufacturer?:string}[]=[];
let midiError="";
let midiOctave=4;
let midiActiveNotes=new Set<number>();

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
    body=`
      <div class="content">
        <div class="section-head"><div><h2>RADIO</h2><p>Internet Radio · FREEzzz Audio Lab</p></div><button class="tg-button secondary" data-view="home">⌂</button></div>
        <section class="radio-panel">
          <div class="radio-heading"><div><span class="radio-kicker">PUBLIC RADIO</span><h3>Station Browser</h3><p>Выбери станцию и запусти её прямо внутри портала.</p></div><button id="open-midi" class="tg-button" type="button"><span class="play-icon" aria-hidden="true"></span>MIDI Controller</button></div>
          <div class="radio-player" id="radio-now"><strong>READY</strong><span>Выбери станцию ниже</span></div>
          <form id="radio-search-form" class="inline-form"><input id="radio-search-input" value="${radioQuery}" maxlength="80" placeholder="Search station"><button class="tg-button" type="submit">Search</button></form>
          <div class="radio-genres">${RADIO_GENRES.map(g=>`<button type="button" data-radio-genre="${g}" class="${radioGenre===g?"active":""}">${g}</button>`).join("")}</div>
          <div class="radio-status">${radioLoading?"Loading stations…":radioError?escapeHtml(radioError):radioStations.length+" stations"}</div>
          <div class="radio-stations">${radioStations.map(s=>`<article class="radio-station"><div><strong>${escapeHtml(s.name)}</strong><small>${escapeHtml(s.country||"International")} · ${escapeHtml(s.codec||"stream")} · ${s.bitrate||0} kbps</small></div><button class="tg-button secondary" data-radio-station="${s.stationuuid}" type="button">Play</button></article>`).join("")}</div>
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
    <div class="app-shell">
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
          <button class="icon-button" data-dev aria-label="Developer"><span class="nav-icon settings-icon"></span></button>
        </div>
      </header>
      <main>${body}</main>
      ${dev?`<aside class="dev">
        <div class="dev-panel">
          <button class="tg-button secondary" data-dev>Закрыть</button>
          <h2>Developer interface</h2>
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
  try{radioStations=await radioBrowser.searchStations(radioGenre,radioQuery,30);}
  catch(error){radioStations=[];radioError=error instanceof Error?error.message:String(error);}
  finally{radioLoading=false;render();}
}
function playRadioStation(id:string){
  const station=radioStations.find(s=>s.stationuuid===id); if(!station)return;
  radioAudio?.pause(); radioAudio=new Audio(station.url_resolved||station.url);
  radioAudio.dataset.station=station.name; radioAudio.controls=true; radioAudio.autoplay=true;
  radioAudio.play().catch(()=>{radioError="Нажми Play ещё раз — браузер заблокировал автозапуск.";render();}); render();
}
function renderMidiOverlay(){
  const existing=document.querySelector("#midi-overlay"); if(existing){existing.remove();return;}
  const overlay=document.createElement("div"); overlay.id="midi-overlay"; overlay.className="midi-overlay";
  const notes=Array.from({length:24},(_,i)=>midiOctave*12+i);
  overlay.innerHTML="<div class=\"midi-controller\"><header class=\"midi-header\"><div><span>FREEzzz AUDIO LAB</span><h2>MIDI Controller</h2></div><button id=\"midi-close\" type=\"button\">Close</button></header><div class=\"midi-toolbar\"><button id=\"midi-connect\" type=\"button\">Connect MIDI</button><select id=\"midi-output\"><option value=\"\">Virtual / no hardware</option>"+midiOutputs.map(o=>"<option value=\""+escapeHtml(o.id)+"\">"+escapeHtml(o.name)+"</option>").join("")+"</select><button id=\"midi-down\" type=\"button\">− Octave</button><strong>Oct "+midiOctave+"</strong><button id=\"midi-up\" type=\"button\">+ Octave</button></div><div class=\"midi-status\">"+(midiError?escapeHtml(midiError):midiController.getOutput()?"MIDI output connected":"Virtual controller ready")+"</div><section class=\"midi-surface\"><div class=\"midi-pads\">"+Array.from({length:16},(_,i)=>"<button class=\"midi-pad\" data-midi-pad=\""+i+"\" type=\"button\"><span>"+String(i+1).padStart(2,"0")+"</span><strong>PAD</strong></button>").join("")+"</div><div class=\"midi-knobs\">"+[21,22,23,24].map((cc,i)=>"<label class=\"midi-knob\"><span>CC "+cc+"</span><input data-midi-cc=\""+cc+"\" type=\"range\" min=\"0\" max=\"127\" value=\""+midiController.getCC(cc)+"\"><output>"+midiController.getCC(cc)+"</output><b>K"+(i+1)+"</b></label>").join("")+"</div></section><section class=\"midi-keyboard\"><div class=\"midi-keyboard-label\">KEYBOARD</div><div class=\"midi-keys\">"+notes.map(n=>"<button class=\"midi-key "+([1,3,6,8,10].includes(n%12)?"black":"")+"\" data-midi-note=\""+n+"\" type=\"button\"><span>"+midiNoteName(n)+"</span></button>").join("")+"</div></section></div>";
  document.body.append(overlay);
  overlay.querySelector("#midi-close")?.addEventListener("click",()=>overlay.remove());
  overlay.querySelector("#midi-connect")?.addEventListener("click",async()=>{try{midiError="";midiOutputs=await midiController.connect();renderMidiOverlay();}catch(e){midiError=e instanceof Error?e.message:String(e);renderMidiOverlay();}});
  overlay.querySelector("#midi-down")?.addEventListener("click",()=>{midiOctave=Math.max(1,midiOctave-1);midiController.setOctave(midiOctave);renderMidiOverlay();});
  overlay.querySelector("#midi-up")?.addEventListener("click",()=>{midiOctave=Math.min(7,midiOctave+1);midiController.setOctave(midiOctave);renderMidiOverlay();});
  overlay.querySelectorAll<HTMLInputElement>("[data-midi-cc]").forEach(input=>input.addEventListener("input",()=>{midiController.controlChange(Number(input.dataset.midiCc),Number(input.value));const o=input.parentElement?.querySelector("output");if(o)o.textContent=input.value;}));
  overlay.querySelectorAll<HTMLButtonElement>("[data-midi-note]").forEach(b=>{const n=Number(b.dataset.midiNote);const down=()=>{midiActiveNotes.add(n);midiController.noteOn(n,100);b.classList.add("active")};const up=()=>{if(midiActiveNotes.delete(n))midiController.noteOff(n);b.classList.remove("active")};b.addEventListener("pointerdown",down);b.addEventListener("pointerup",up);b.addEventListener("pointercancel",up);b.addEventListener("pointerleave",up);});
}

function bind(){
  if(view==="radio"){
    document.querySelector("#radio-search-form")?.addEventListener("submit",e=>{e.preventDefault();radioQuery=(document.querySelector<HTMLInputElement>("#radio-search-input")?.value||"").trim();void loadRadioStations();});
    document.querySelectorAll<HTMLElement>("[data-radio-genre]").forEach(x=>x.onclick=()=>{radioGenre=x.dataset.radioGenre||"pop";radioQuery="";void loadRadioStations();});
    document.querySelectorAll<HTMLElement>("[data-radio-station]").forEach(x=>x.onclick=()=>playRadioStation(x.dataset.radioStation||""));
    document.querySelector("#open-midi")?.addEventListener("click",()=>renderMidiOverlay());
    if(!radioStations.length&&!radioLoading&&!radioError)void loadRadioStations();
    const host=document.querySelector("#radio-now"); if(host&&radioAudio){host.innerHTML="";host.append(radioAudio);radioAudio.style.width="100%";}
  }
  document.querySelectorAll<HTMLElement>("[data-view]").forEach(function(x){
    x.onclick=function(){view=x.dataset.view as View;render();};
  });
  document.querySelectorAll<HTMLElement>("[data-lang]").forEach(function(x){
    x.onclick=function(){lang=x.dataset.lang||"RU";render();};
  });
  document.querySelectorAll<HTMLElement>("[data-url]").forEach(function(x){
    x.onclick=function(){window.open(x.dataset.url!,"_blank","noopener,noreferrer");};
  });
  document.querySelectorAll<HTMLElement>("[data-dev]").forEach(function(x){
    x.onclick=function(){dev=!dev;render();};
  });
  document.querySelector("#chatform")?.addEventListener("submit",function(e){
    e.preventDefault();
    const i=document.querySelector<HTMLInputElement>("#chatinput")!;
    if(i.value.trim()){
      const box=document.querySelector(".chat")!;
      box.innerHTML+="<p><b>You</b><br>"+escapeHtml(i.value)+"</p>";
      i.value="";
    }
  });
  document.querySelector("#save")?.addEventListener("click",function(){
    localStorage.setItem("freezzz-library",JSON.stringify([{id:"duck-blast",savedAt:new Date().toISOString()}]));
    render();
  });
  document.querySelector("#clear")?.addEventListener("click",function(){
    localStorage.removeItem("freezzz-library");
    render();
  });
  document.querySelectorAll<HTMLElement>("[data-move]").forEach(function(x){
    x.onclick=function(){player=Math.max(0,Math.min(1,player+Number(x.dataset.move)));};
  });
  document.querySelector("[data-fire]")?.addEventListener("click",function(){
    score++;
    const s=document.querySelector("#score");
    if(s)s.textContent="SCORE "+score;
  });
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
