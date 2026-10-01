import "./styles.css";

type View = "home"|"live"|"chat"|"game"|"radio"|"library";

const app=document.querySelector<HTMLDivElement>("#app")!;
let view:View="home";
let lang="RU";
let dev=false;
let score=0;
let player=.5;

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
        <section class="hero">
          <h2>RADIO</h2>
          <p>Музыкальный слой FREEzzz.</p>
          <button class="tg-button" data-url="https://techno.fm/">Open Techno.FM</button>
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

function bind(){
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
