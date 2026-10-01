import "./styles.css";

type View = "home"|"live"|"chat"|"game"|"radio"|"library";
const app=document.querySelector<HTMLDivElement>("#app")!;
let view:View="home"; let lang="RU"; let dev=false; let score=0; let player=.5;
const streams=[["🦆","Leb1ga","YouTube","https://www.youtube.com/@leb1ga"],["🎮","Dendi","YouTube","https://www.youtube.com/@Dendi"],["⚡","Papaplatte","YouTube","https://www.youtube.com/@papaplatte"],["🕹️","Marmok","YouTube","https://www.youtube.com/@Marmok"],["🚀","Trymacs","Twitch","https://www.twitch.tv/trymacs"]];
const title={live:"LIVE",chat:"CHAT",game:"GAME",radio:"RADIO",library:"LIBRARY"};
function render(){
  let body="";
  if(view==="home") body="<div class=\"hero\"><h1>FREEzzz Platform</h1><p>Version 0.0.1 — базовая точка проекта.</p></div><div class=\"grid\">"+card("live","📺","LIVE","Стримеры и каналы")+card("chat","💬","CHAT","Локальный fallback")+card("game","🛸","GAME","Duck Blast")+card("radio","📻","RADIO","Radio layer")+card("library","🗂️","LIBRARY","Local-first")+"</div>";
  if(view==="live") body="<h2>📺 LIVE</h2><div class=\"list\">"+streams.map(function(s){return "<article class=\"stream\"><div class=\"avatar\">"+s[0]+"</div><div><b>"+s[1]+"</b><small>"+s[2]+" · OFFLINE</small></div><button data-url=\""+s[3]+"\">Открыть</button></article>";}).join("")+"</div><div class=\"player\"><p>Выберите канал. В 0.0.1 offline безопасно открывает канал; provider resolver будет следующим этапом.</p></div>";
  if(view==="chat") body="<h2>💬 CHAT</h2><div class=\"chat\"><p><b>FREEzzzBot:</b> Добро пожаловать в базовую версию.</p></div><form id=\"chatform\"><input id=\"chatinput\" placeholder=\"Введите сообщение…\"><button>Отправить</button></form>";
  if(view==="game") body="<h2>🛸 DUCK BLAST</h2><div class=\"game\"><canvas id=\"canvas\"></canvas><b id=\"score\">SCORE 0</b></div><div class=\"controls\"><button data-move=\"-0.1\">◀</button><button data-fire>🚀 FIRE</button><button data-move=\"0.1\">▶</button></div>";
  if(view==="radio") body="<div class=\"hero\"><h2>📻 RADIO</h2><p>Независимый radio layer.</p><button data-url=\"https://techno.fm/\">Open Techno.FM</button></div>";
  if(view==="library") body="<div class=\"hero\"><h2>🗂️ LIBRARY</h2><p>Local-first storage. Portal economy отсутствует.</p><button id=\"save\">Save</button><button id=\"clear\">Clear</button><pre>"+(localStorage.getItem("freezzz-library")||"[]")+"</pre></div>";
  app.innerHTML="<div class=\"app\"><header><button data-view=\"home\">⌂</button><b>FREEzzz</b><nav><button data-lang=\"RU\">RU</button><button data-lang=\"DE\">DE</button><button data-lang=\"EN\">EN</button></nav><button data-dev>⚙</button></header><main>"+body+"</main>"+(dev?"<aside class=\"dev\"><button data-dev>✕</button><h2>Developer</h2><pre>"+JSON.stringify({version:"0.0.1",view:view,language:lang,stage21:"EXCLUDED",modules:["LIVE","CHAT","GAME","RADIO","LIBRARY"]},null,2)+"</pre></aside>":"")+"</div>";
  bind(); if(view==="game")startGame();
}
function card(v:string,e:string,t:string,d:string){return "<button class=\"card\" data-view=\""+v+"\"><b>"+e+"</b><strong>"+t+"</strong><span>"+d+"</span></button>";}
function bind(){
  document.querySelectorAll<HTMLElement>("[data-view]").forEach(function(x){x.onclick=function(){view=x.dataset.view as View;render();};});
  document.querySelectorAll<HTMLElement>("[data-lang]").forEach(function(x){x.onclick=function(){lang=x.dataset.lang||"RU";render();};});
  document.querySelectorAll<HTMLElement>("[data-url]").forEach(function(x){x.onclick=function(){window.open(x.dataset.url!,"_blank","noopener,noreferrer");};});
  document.querySelectorAll<HTMLElement>("[data-dev]").forEach(function(x){x.onclick=function(){dev=!dev;render();};});
  document.querySelector("#chatform")?.addEventListener("submit",function(e){e.preventDefault();const i=document.querySelector<HTMLInputElement>("#chatinput")!;if(i.value.trim()){const box=document.querySelector(".chat")!;box.innerHTML+="<p><b>You:</b> "+escapeHtml(i.value)+"</p>";i.value="";}});
  document.querySelector("#save")?.addEventListener("click",function(){localStorage.setItem("freezzz-library",JSON.stringify([{id:"duck-blast",savedAt:new Date().toISOString()}]));render();});
  document.querySelector("#clear")?.addEventListener("click",function(){localStorage.removeItem("freezzz-library");render();});
  document.querySelectorAll<HTMLElement>("[data-move]").forEach(function(x){x.onclick=function(){player=Math.max(0,Math.min(1,player+Number(x.dataset.move)));};});
  document.querySelector("[data-fire]")?.addEventListener("click",function(){score++;const s=document.querySelector("#score");if(s)s.textContent="SCORE "+score;});
}
function escapeHtml(s:string){return s.replace(/[&<>]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;"}[c]||c;});}
function startGame(){const c=document.querySelector<HTMLCanvasElement>("#canvas");if(!c)return;const r=c.getBoundingClientRect();c.width=Math.max(320,r.width);c.height=Math.max(420,r.height);const x=c.getContext("2d")!;x.fillStyle="#02040a";x.fillRect(0,0,c.width,c.height);x.fillStyle="#ffd166";x.beginPath();x.arc(c.width*.5,c.height*.2,20,0,Math.PI*2);x.fill();x.fillStyle="#35e0a1";x.beginPath();x.moveTo(c.width*player,c.height*.8);x.lineTo(c.width*player-28,c.height*.9);x.lineTo(c.width*player+28,c.height*.9);x.closePath();x.fill();}
render();