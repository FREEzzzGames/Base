import { icon, streams, type LiveStream } from "./portal-ui";

const STORAGE_KEY="freezzz:live-custom:v1";
const CATEGORIES=["all","gaming","entertainment","music","custom"] as const;
export type LiveCategory=typeof CATEGORIES[number];

function readCustom():LiveStream[]{
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    const parsed=raw?JSON.parse(raw):[];
    return Array.isArray(parsed)?parsed.filter(x=>x&&typeof x.name==="string"&&typeof x.youtube==="string"&&typeof x.twitch==="string"):[];
  }catch{return [];}
}
function saveCustom(items:LiveStream[]){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(items));}catch{}}
export function getLiveStreams():LiveStream[]{return [...streams,...readCustom().map(x=>({...x,custom:true}))];}
function esc(value:string){return value.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]||c));}
function categoryLabel(category:string,lang:"RU"|"DE"|"EN"){
  const map:Record<string,Record<string,string>>={all:{RU:"ВСЕ",DE:"ALLE",EN:"ALL"},gaming:{RU:"ИГРЫ",DE:"GAMING",EN:"GAMING"},entertainment:{RU:"РАЗВЛЕЧЕНИЯ",DE:"UNTERHALTUNG",EN:"ENTERTAINMENT"},music:{RU:"МУЗЫКА",DE:"MUSIK",EN:"MUSIC"},custom:{RU:"МОИ",DE:"MEINE",EN:"CUSTOM"}};
  return map[category]?.[lang]||category.toUpperCase();
}
function avatar(stream:LiveStream){
  return stream.youtubeChannel
    ? '<img class="live-catalog-avatar" src="https://unavatar.io/youtube/'+encodeURIComponent(stream.youtubeChannel)+'" alt="" loading="lazy" referrerpolicy="no-referrer">'
    : icon(stream.icon,"live-catalog-avatar-icon");
}
export function renderLiveCatalog(lang:"RU"|"DE"|"EN"):string{
  const all=getLiveStreams();
  const L={RU:{sub:"Стримеры, каналы и записи",search:"Найти стримера",add:"Добавить",name:"Название",youtube:"YouTube URL",twitch:"Twitch URL",replay:"URL записи",watch:"Смотреть",empty:"Ничего не найдено",remove:"Удалить",hint:"Если эфир недоступен, можно открыть сохранённую запись."},DE:{sub:"Streamer, Kanäle und Aufzeichnungen",search:"Streamer suchen",add:"Hinzufügen",name:"Name",youtube:"YouTube URL",twitch:"Twitch URL",replay:"Aufzeichnung URL",watch:"Ansehen",empty:"Nichts gefunden",remove:"Entfernen",hint:"Wenn Live nicht verfügbar ist, kann eine Aufzeichnung geöffnet werden."},EN:{sub:"Streamers, channels and replays",search:"Find streamer",add:"Add",name:"Name",youtube:"YouTube URL",twitch:"Twitch URL",replay:"Replay URL",watch:"Watch",empty:"Nothing found",remove:"Remove",hint:"If live playback is unavailable, a saved recording can be opened."}}[lang];
  const cards=all.map(s=>'<article class="live-catalog-card" data-live-card data-category="'+esc(s.category||"entertainment")+'" data-name="'+esc(s.name.toLowerCase())+'">'+
    '<div class="live-catalog-avatar-wrap">'+avatar(s)+'</div>'+
    '<div class="live-catalog-info"><strong>'+esc(s.name)+'</strong><small>'+categoryLabel(s.category||"entertainment",lang)+(s.custom?" · CUSTOM":"")+'</small></div>'+
    '<div class="live-catalog-actions">'+
    '<button class="tg-button" data-live-open="'+esc(s.name)+'" data-live-source="twitch" type="button">'+L.watch+' Twitch</button>'+
    '<button class="tg-button secondary" data-live-open="'+esc(s.name)+'" data-live-source="youtube" type="button">'+L.watch+' YouTube</button>'+
    (s.lastRecordingUrl?'<button class="tg-button secondary" data-live-replay="'+esc(s.name)+'" type="button">'+L.replay+'</button>':"")+
    (s.custom?'<button class="live-catalog-remove" data-live-remove="'+esc(s.name)+'" type="button" aria-label="'+L.remove+'">×</button>':"")+
    '</div></article>').join("");
  return '<div class="live-catalog">'+
    '<div class="live-catalog-tools"><input id="live-catalog-search" type="search" placeholder="'+L.search+'" autocomplete="off" aria-label="'+L.search+'"><button class="tg-button" type="button" data-live-add-toggle>'+L.add+'</button></div>'+
    '<div class="live-catalog-categories" role="tablist">'+CATEGORIES.map(c=>'<button type="button" class="'+(c==="all"?"active":"")+'" data-live-category="'+c+'" role="tab" aria-selected="'+(c==="all")+'">'+categoryLabel(c,lang)+'</button>').join("")+'</div>'+
    '<p class="live-catalog-hint">'+L.hint+'</p>'+
    '<div class="live-catalog-list" id="live-catalog-list">'+(cards||'<p class="live-catalog-empty">'+L.empty+'</p>')+'</div>'+
    '<form class="live-add-form" id="live-add-form" hidden><input name="name" required maxlength="60" placeholder="'+L.name+'"><input name="youtube" required type="url" placeholder="'+L.youtube+'"><input name="twitch" type="url" placeholder="'+L.twitch+'"><input name="replay" type="url" placeholder="'+L.replay+'"><button class="tg-button" type="submit">'+L.add+'</button></form>'+
    '</div>';
}
export function addLiveStreamer(input:{name:string;youtube:string;twitch?:string;replay?:string}):boolean{
  const name=input.name.trim(),youtube=input.youtube.trim(),twitch=input.twitch?.trim()||"";
  if(!name||!youtube)return false;
  let twitchChannel="";
  try{twitchChannel=twitch?new URL(twitch).pathname.split("/").filter(Boolean)[0]||"":"";}catch{}
  const custom=readCustom().filter(x=>x.name.toLowerCase()!==name.toLowerCase());
  custom.push({icon:"video",name,youtube,twitch,twitchChannel,youtubeChannel:youtube.match(/@([A-Za-z0-9._-]+)/)?.[1],category:"custom",lastRecordingUrl:input.replay?.trim()||"",custom:true});
  saveCustom(custom);return true;
}
export function removeLiveStreamer(name:string){saveCustom(readCustom().filter(x=>x.name!==name));}
export function bindLiveCatalog():void{
  const root=document.querySelector<HTMLElement>(".live-catalog");if(!root)return;
  const search=root.querySelector<HTMLInputElement>("#live-catalog-search");
  const cards=()=>Array.from(root.querySelectorAll<HTMLElement>("[data-live-card]"));
  const apply=()=>{
    const query=(search?.value||"").trim().toLowerCase();
    const active=root.querySelector<HTMLElement>("[data-live-category].active")?.dataset.liveCategory||"all";
    cards().forEach(card=>{card.hidden=!((!query||(card.dataset.name||"").includes(query))&&(active==="all"||card.dataset.category===active));});
  };
  search?.addEventListener("input",apply);
  root.querySelectorAll<HTMLElement>("[data-live-category]").forEach(button=>button.addEventListener("click",()=>{
    root.querySelectorAll("[data-live-category]").forEach(x=>x.classList.remove("active"));
    button.classList.add("active");
    root.querySelectorAll("[data-live-category]").forEach(x=>x.setAttribute("aria-selected",String(x===button)));
    apply();
  }));
  root.querySelector<HTMLElement>("[data-live-add-toggle]")?.addEventListener("click",()=>{
    const form=root.querySelector<HTMLFormElement>("#live-add-form");if(form)form.hidden=!form.hidden;
  });
  root.querySelector<HTMLFormElement>("#live-add-form")?.addEventListener("submit",e=>{
    e.preventDefault();const data=new FormData(e.currentTarget);
    if(addLiveStreamer({name:String(data.get("name")||""),youtube:String(data.get("youtube")||""),twitch:String(data.get("twitch")||""),replay:String(data.get("replay")||"")}))window.dispatchEvent(new CustomEvent("freezzz:live-catalog-changed"));
  });
}
