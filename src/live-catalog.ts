import { icon, streams, type LiveStream } from "./portal-ui";

const CUSTOM_KEY="freezzz:live-custom:v2";
const FAVORITES_KEY="freezzz:live-favorites:v1";
const CATEGORIES=["all","gaming","entertainment","music","education","technology","lifestyle","custom"] as const;
const LANGUAGES=["all","uk","ru","en","de","unknown"] as const;
type LanguageCode=typeof LANGUAGES[number];
type Category=typeof CATEGORIES[number];
type CatalogItem=LiveStream & {language?:LanguageCode;subcategory?:string;officialStatsAt?:string;rankingVerified?:boolean};
type OfficialRankEntry={platform:string;language:string;category:string;subcategory:string;rank:number;name:string;metrics?:{subscribers?:number|null;live?:boolean;viewers?:number}};
const CREATOR_METADATA:Record<string,{language:LanguageCode;category:string;subcategory:string}>={leb1ga:{language:"uk",category:"gaming",subcategory:"Mobile Legends"},dendi:{language:"en",category:"gaming",subcategory:"MOBA"},rolex9:{language:"uk",category:"gaming",subcategory:"Mobile Legends"},papaplatte:{language:"de",category:"entertainment",subcategory:"Just Chatting"},montanablack88:{language:"de",category:"entertainment",subcategory:"Just Chatting"},trymacs:{language:"de",category:"gaming",subcategory:"Gaming"},smetana:{language:"ru",category:"gaming",subcategory:"Mobile Legends"},smetanduck:{language:"ru",category:"gaming",subcategory:"Mobile Legends"},titamin1:{language:"ru",category:"gaming",subcategory:"Mobile Legends"},dunkelsch4tten:{language:"de",category:"gaming",subcategory:"Gaming"},buster:{language:"ru",category:"gaming",subcategory:"Gaming"},marmok:{language:"ru",category:"entertainment",subcategory:"Gaming videos"},marmok_twitch:{language:"ru",category:"entertainment",subcategory:"Gaming videos"},zubarefff:{language:"ru",category:"entertainment",subcategory:"Just Chatting"}};

function readJson<T>(key:string,fallback:T):T{
  try{const value=localStorage.getItem(key);return value?JSON.parse(value) as T:fallback;}catch{return fallback;}
}
function readCustom():CatalogItem[]{
  const parsed=readJson<unknown>(CUSTOM_KEY,[]);
  return Array.isArray(parsed)?parsed.filter((x):x is CatalogItem=>Boolean(x&&typeof x==="object"&&typeof (x as CatalogItem).name==="string"&&typeof (x as CatalogItem).youtube==="string"&&typeof (x as CatalogItem).twitch==="string")):[];
}
function saveCustom(items:CatalogItem[]){try{localStorage.setItem(CUSTOM_KEY,JSON.stringify(items));}catch{}}
function readFavorites():string[]{const v=readJson<unknown>(FAVORITES_KEY,[]);return Array.isArray(v)?v.filter((x):x is string=>typeof x==="string"):[];}
function saveFavorites(items:string[]){try{localStorage.setItem(FAVORITES_KEY,JSON.stringify(items));}catch{}}
export function getLiveStreams():LiveStream[]{return [...streams,...readCustom().map(x=>({...x,custom:true}))];}
function esc(value:string){return value.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]||c));}
function validProviderUrl(raw:string,provider:"youtube"|"twitch"|"replay"):string{
  if(!raw.trim())return "";
  try{
    const u=new URL(raw.trim());
    if(u.protocol!=="https:")return "";
    const host=u.hostname.toLowerCase().replace(/^www\./,"");
    const allowed=provider==="youtube"?["youtube.com","m.youtube.com","youtu.be"].includes(host):provider==="twitch"?["twitch.tv","m.twitch.tv"].includes(host):["youtube.com","youtu.be","twitch.tv"].includes(host);
    return allowed?u.href:"";
  }catch{return "";}
}
function categoryLabel(category:string,lang:"RU"|"DE"|"EN"){
  const map:Record<string,Record<string,string>>={
    all:{RU:"ВСЕ",DE:"ALLE",EN:"ALL"},gaming:{RU:"ИГРЫ",DE:"GAMING",EN:"GAMING"},
    entertainment:{RU:"РАЗВЛЕЧЕНИЯ",DE:"UNTERHALTUNG",EN:"ENTERTAINMENT"},music:{RU:"МУЗЫКА",DE:"MUSIK",EN:"MUSIC"},
    education:{RU:"ОБУЧЕНИЕ",DE:"BILDUNG",EN:"EDUCATION"},technology:{RU:"ТЕХНОЛОГИИ",DE:"TECHNIK",EN:"TECH"},
    lifestyle:{RU:"СТИЛЬ ЖИЗНИ",DE:"LIFESTYLE",EN:"LIFESTYLE"},custom:{RU:"МОИ",DE:"MEINE",EN:"CUSTOM"}
  };return map[category]?.[lang]||category.toUpperCase();
}
function languageLabel(code:string,lang:"RU"|"DE"|"EN"){
  const map:Record<string,Record<string,string>>={all:{RU:"Все языки",DE:"Alle Sprachen",EN:"All languages"},uk:{RU:"Украинский",DE:"Ukrainisch",EN:"Ukrainian"},ru:{RU:"Русский",DE:"Russisch",EN:"Russian"},en:{RU:"Английский",DE:"Englisch",EN:"English"},de:{RU:"Немецкий",DE:"Deutsch",EN:"German"},unknown:{RU:"Не указан",DE:"Nicht angegeben",EN:"Unspecified"}};
  return map[code]?.[lang]||code;
}
function avatar(stream:LiveStream){
  return stream.youtubeChannel?'<img class="live-catalog-avatar" src="https://unavatar.io/youtube/'+encodeURIComponent(stream.youtubeChannel)+'" alt="" loading="lazy" referrerpolicy="no-referrer">':icon(stream.icon,"live-catalog-avatar-icon");
}
export function renderLiveCatalog(lang:"RU"|"DE"|"EN"):string{
  const all=getLiveStreams() as CatalogItem[];
  const L={
    RU:{sub:"Каталог блогеров · статистика рейтинга подключается через официальные API",search:"Найти блогера",add:"Добавить ссылку",name:"Название",youtube:"Ссылка YouTube (необязательно)",twitch:"Ссылка Twitch (необязательно)",replay:"Ссылка записи",watch:"Открыть",empty:"Ничего не найдено",remove:"Удалить",hint:"Избранное сохраняется на этом устройстве. Не подтверждённые официальной статистикой каналы не получают позицию в топе.",favorites:"★ Избранное",subcat:"Подкатегория",any:"Все подкатегории",addError:"Добавьте хотя бы одну корректную ссылку YouTube или Twitch.",top:"ТОП-5 будет отмечаться только после синхронизации официальной статистики."},
    DE:{sub:"Creator-Katalog · Rankingdaten werden über offizielle APIs angebunden",search:"Creator suchen",add:"Link hinzufügen",name:"Name",youtube:"YouTube-Link (optional)",twitch:"Twitch-Link (optional)",replay:"Aufzeichnungslink",watch:"Öffnen",empty:"Keine Ergebnisse",remove:"Entfernen",hint:"Favoriten bleiben auf diesem Gerät gespeichert. Ohne verifizierte offizielle Statistiken erhält ein Kanal keinen Top-Rang.",favorites:"★ Favoriten",subcat:"Unterkategorie",any:"Alle Unterkategorien",addError:"Fügen Sie mindestens einen gültigen YouTube- oder Twitch-Link hinzu.",top:"TOP 5 werden erst nach der Synchronisierung offizieller Statistiken markiert."},
    EN:{sub:"Creator catalog · ranking statistics will use official APIs",search:"Find a creator",add:"Add link",name:"Name",youtube:"YouTube URL (optional)",twitch:"Twitch URL (optional)",replay:"Replay URL",watch:"Open",empty:"No results",remove:"Remove",hint:"Favorites are saved on this device. Channels without verified official statistics are not assigned a top rank.",favorites:"★ Favorites",subcat:"Subcategory",any:"All subcategories",addError:"Add at least one valid YouTube or Twitch link.",top:"TOP 5 labels will appear only after official statistics are synchronized."}
  }[lang];
  const favorites=readFavorites();
  const subcategories=[...new Set(all.map(s=>CREATOR_METADATA[s.name.toLowerCase()]?.subcategory||(s as CatalogItem).subcategory).filter((x):x is string=>Boolean(x)))].sort();
  const cards=all.map(s=>{
    const metadata=CREATOR_METADATA[s.name.toLowerCase()]||{language:(s as CatalogItem).language||"unknown" as LanguageCode,category:s.category||"entertainment",subcategory:(s as CatalogItem).subcategory||""};
    const key=(s.twitchChannel||s.youtubeChannel||s.name).toLowerCase();
    const favorite=favorites.includes(key);
    const verified=Boolean(s.rankingVerified&&s.officialStatsAt);
    const category=metadata.category;
    const language=metadata.language;
    return '<article class="live-catalog-card" data-live-card data-category="'+esc(category)+'" data-language="'+esc(language)+'" data-subcategory="'+esc(metadata.subcategory)+'" data-name="'+esc(s.name.toLowerCase())+'" data-favorite="'+favorite+'" data-key="'+esc(key)+'">'+
      '<div class="live-catalog-avatar-wrap">'+avatar(s)+'</div>'+
      '<div class="live-catalog-info"><strong>'+esc(s.name)+'</strong><small>'+categoryLabel(category,lang)+' · '+languageLabel(language,lang)+(s.custom?" · CUSTOM":"")+'</small><small class="live-ranking-status">'+(verified?"✓ "+esc(s.officialStatsAt||""):"Статистика не подтверждена")+'</small></div>'+
      '<div class="live-catalog-actions"><button class="tg-button" data-live-open="'+esc(s.name)+'" data-live-source="twitch" type="button" '+(!s.twitch?"disabled":"")+'>'+L.watch+' Twitch</button>'+
      '<button class="tg-button secondary" data-live-open="'+esc(s.name)+'" data-live-source="youtube" type="button" '+(!s.youtube?"disabled":"")+'>'+L.watch+' YouTube</button>'+
      '<button class="live-catalog-favorite" data-live-favorite="'+esc(key)+'" type="button" aria-pressed="'+favorite+'" aria-label="'+L.favorites+'">'+(favorite?"★":"☆")+'</button>'+
      (s.lastRecordingUrl?'<button class="tg-button secondary" data-live-replay="'+esc(s.name)+'" type="button">'+L.replay+'</button>':"")+
      (s.custom?'<button class="live-catalog-remove" data-live-remove="'+esc(s.name)+'" type="button" aria-label="'+L.remove+'">×</button>':"")+
      '</div></article>';
  }).join("");
  const opts=(values:readonly string[],selected:string,label:(x:string)=>string)=>values.map(x=>'<option value="'+esc(x)+'" '+(x===selected?"selected":"")+'>'+esc(label(x))+'</option>').join("");
  return '<div class="live-catalog">'+
    '<section class="live-official-top" aria-live="polite"><h3>OFFICIAL RANKINGS</h3><p data-live-official-status>Проверяем доступность официальной статистики…</p><div data-live-official-list></div></section>'+
    '<div class="live-catalog-tools"><input id="live-catalog-search" type="search" placeholder="'+L.search+'" autocomplete="off" aria-label="'+L.search+'"><button class="tg-button" type="button" data-live-add-toggle>'+L.add+'</button></div>'+
    '<div class="live-catalog-categories" role="tablist">'+CATEGORIES.map(c=>'<button type="button" class="'+(c==="all"?"active":"")+'" data-live-category="'+c+'" role="tab" aria-selected="'+(c==="all")+'">'+categoryLabel(c,lang)+'</button>').join("")+'</div>'+
    '<div class="live-catalog-filters"><label>'+L.subcat+'<select id="live-catalog-subcategory"><option value="">'+L.any+'</option>'+opts(subcategories,"",x=>x)+'</select></label><label>Language<select id="live-catalog-language">'+opts(LANGUAGES,"all",x=>languageLabel(x,lang))+'</select></label><button class="tg-button secondary" type="button" data-live-favorites>'+L.favorites+'</button></div>'+
    '<p class="live-catalog-hint">'+L.hint+'</p><p class="live-catalog-hint">'+L.top+'</p>'+
    '<div class="live-catalog-list" id="live-catalog-list">'+(cards||'<p class="live-catalog-empty">'+L.empty+'</p>')+'</div>'+
    '<p class="live-catalog-empty" data-live-empty hidden>'+L.empty+'</p>'+
    '<form class="live-add-form" id="live-add-form" hidden><input name="name" required maxlength="60" placeholder="'+L.name+'"><input name="youtube" type="url" placeholder="'+L.youtube+'"><input name="twitch" type="url" placeholder="'+L.twitch+'"><input name="replay" type="url" placeholder="'+L.replay+'"><select name="language" aria-label="Language"><option value="unknown">Language / Язык</option><option value="uk">Українська</option><option value="ru">Русский</option><option value="en">English</option><option value="de">Deutsch</option></select><select name="rankCategory" aria-label="Ranking category"><option value="gaming">Gaming</option><option value="entertainment">Entertainment</option><option value="music">Music</option><option value="education">Education</option><option value="technology">Technology</option><option value="lifestyle">Lifestyle</option><option value="sports">Sports</option><option value="creativity">Creativity</option></select><input name="subcategory" maxlength="80" placeholder="Subcategory"><button class="tg-button" type="submit">'+L.add+'</button><p data-live-form-error role="alert" hidden></p></form>'+
    '</div>';
}
export function addLiveStreamer(input:{name:string;youtube:string;twitch?:string;replay?:string;language?:LanguageCode;subcategory?:string}):boolean{
  const name=input.name.trim(),youtube=validProviderUrl(input.youtube,"youtube"),twitch=validProviderUrl(input.twitch||"","twitch"),replay=validProviderUrl(input.replay||"","replay");
  if(!name||(!youtube&&!twitch))return false;
  const twitchChannel=twitch?new URL(twitch).pathname.split("/").filter(Boolean)[0]||"":"";
  const ytPath=youtube?new URL(youtube).pathname.split("/").filter(Boolean):[];
  const handle=ytPath.find(x=>x.startsWith("@"));
  const channelIndex=ytPath.findIndex(x=>x==="channel");
  const youtubeChannel=handle?handle.slice(1):channelIndex>=0?ytPath[channelIndex+1]||undefined:undefined;
  const custom=readCustom().filter(x=>x.name.toLowerCase()!==name.toLowerCase()&&x.twitch!==twitch&&x.youtube!==youtube);
  custom.push({icon:"video",name,youtube,twitch,twitchChannel,youtubeChannel,category:"custom",language:input.language||"unknown",subcategory:input.subcategory||"",lastRecordingUrl:replay,custom:true} as CatalogItem);
  saveCustom(custom);return true;
}
export function removeLiveStreamer(name:string){saveCustom(readCustom().filter(x=>x.name!==name));}
export function bindLiveCatalog():void{
  const root=document.querySelector<HTMLElement>(".live-catalog");if(!root)return;
  const officialStatus=root.querySelector<HTMLElement>("[data-live-official-status]");
  const officialList=root.querySelector<HTMLElement>("[data-live-official-list]");
  const apiBase=(import.meta.env.VITE_TELEGRAM_AUTH_URL||"").replace(/\/$/,"");
  const escText=(value:string)=>value.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]||c));
  if(apiBase&&officialStatus&&officialList){
    void fetch(apiBase+"/api/live/rankings",{headers:{Accept:"application/json"},cache:"no-store",credentials:"omit",signal:AbortSignal.timeout(8000)})
      .then(async response=>{if(!response.ok)throw new Error("API_UNAVAILABLE");return response.json();})
      .then((payload:{rankings?:OfficialRankEntry[];lastUpdated?:string})=>{
        const rankings=Array.isArray(payload.rankings)?payload.rankings:[];
        if(!rankings.length){officialStatus.textContent="Официальный топ пока не сформирован. Нужны API-ключи и успешная синхронизация.";return;}
        const grouped=new Map<string,OfficialRankEntry[]>();
        for(const item of rankings){const key=[item.platform,item.language,item.category,item.subcategory].join("|");if(!grouped.has(key))grouped.set(key,[]);grouped.get(key)!.push(item);}
        officialStatus.textContent="Данные API · обновлено: "+(payload.lastUpdated||"нет снимка");
        officialList.innerHTML=[...grouped.entries()].map(([key,items])=>{
          const [platform,language,category,subcategory]=key.split("|");
          return '<section class="live-official-group"><h4>'+escText(platform.toUpperCase())+' · '+escText(language.toUpperCase())+' · '+escText(category)+' / '+escText(subcategory)+'</h4><ol>'+items.sort((a,b)=>a.rank-b.rank).map(item=>'<li><span>'+escText(String(item.rank)+". "+item.name)+'</span><small>'+escText(item.metrics?.subscribers!=null?"Подписчики: "+Number(item.metrics.subscribers).toLocaleString():item.metrics?.live?"В эфире · зрители: "+Number(item.metrics.viewers||0).toLocaleString():"Статистика доступна")+'</small></li>').join("")+'</ol></section>';
        }).join("");
      }).catch(()=>{officialStatus.textContent="Сервер статистики недоступен. Каталог и сохранённые ссылки продолжают работать.";});
  }else if(officialStatus){
    officialStatus.textContent="Сервер официальной статистики ещё не подключён к сборке портала.";
  }
  const search=root.querySelector<HTMLInputElement>("#live-catalog-search");
  const language=root.querySelector<HTMLSelectElement>("#live-catalog-language");
  const subcategory=root.querySelector<HTMLSelectElement>("#live-catalog-subcategory");
  let favoritesOnly=false;
  const cards=()=>Array.from(root.querySelectorAll<HTMLElement>("[data-live-card]"));
  const apply=()=>{
    const query=(search?.value||"").trim().toLowerCase();
    const active=root.querySelector<HTMLElement>("[data-live-category].active")?.dataset.liveCategory||"all";
    let visible=0;
    cards().forEach(card=>{
      const ok=(!query||(card.dataset.name||"").includes(query))&&(active==="all"||card.dataset.category===active)&&((language?.value||"all")==="all"||card.dataset.language===language?.value)&&(!subcategory?.value||card.dataset.subcategory===subcategory.value)&&(!favoritesOnly||card.dataset.favorite==="true");
      card.hidden=!ok;if(ok)visible++;
    });
    const empty=root.querySelector<HTMLElement>("[data-live-empty]");if(empty)empty.hidden=visible!==0;
  };
  search?.addEventListener("input",apply);language?.addEventListener("change",apply);subcategory?.addEventListener("change",apply);
  root.querySelectorAll<HTMLElement>("[data-live-category]").forEach(button=>button.addEventListener("click",()=>{
    root.querySelectorAll("[data-live-category]").forEach(x=>x.classList.remove("active"));
    button.classList.add("active");root.querySelectorAll("[data-live-category]").forEach(x=>x.setAttribute("aria-selected",String(x===button)));apply();
  }));
  root.querySelector<HTMLElement>("[data-live-favorites]")?.addEventListener("click",()=>{favoritesOnly=!favoritesOnly;const b=root.querySelector<HTMLElement>("[data-live-favorites]");b?.classList.toggle("active",favoritesOnly);apply();});
  root.querySelectorAll<HTMLElement>("[data-live-favorite]").forEach(button=>button.addEventListener("click",()=>{
    const key=button.dataset.liveFavorite||"";const list=readFavorites();const next=list.includes(key)?list.filter(x=>x!==key):[...list,key];saveFavorites(next);
    const card=button.closest<HTMLElement>("[data-live-card]");if(card){card.dataset.favorite=String(next.includes(key));button.setAttribute("aria-pressed",String(next.includes(key)));button.textContent=next.includes(key)?"★":"☆";}apply();
  }));
  root.querySelector<HTMLElement>("[data-live-add-toggle]")?.addEventListener("click",()=>{const form=root.querySelector<HTMLFormElement>("#live-add-form");if(form)form.hidden=!form.hidden;});
  root.querySelector<HTMLFormElement>("#live-add-form")?.addEventListener("submit",e=>{
    e.preventDefault();const form=e.currentTarget as HTMLFormElement;const data=new FormData(form);
    const ok=addLiveStreamer({name:String(data.get("name")||""),youtube:String(data.get("youtube")||""),twitch:String(data.get("twitch")||""),replay:String(data.get("replay")||"")});
    const error=form.querySelector<HTMLElement>("[data-live-form-error]");
    if(!ok){if(error){error.textContent=({RU:"Добавьте корректную ссылку YouTube или Twitch.",DE:"Fügen Sie einen gültigen YouTube- oder Twitch-Link hinzu.",EN:"Add a valid YouTube or Twitch URL."} as Record<string,string>)[document.documentElement.lang.toUpperCase()]||"Invalid URL";error.hidden=false;}return;}
    const apiBase=(import.meta.env.VITE_TELEGRAM_AUTH_URL||"").replace(/\/$/,"");
    if(apiBase){
      const body={name:String(data.get("name")||""),youtubeUrl:String(data.get("youtube")||""),twitchUrl:String(data.get("twitch")||""),language:String(data.get("language")||"unknown"),category:String(data.get("rankCategory")||"gaming"),subcategory:String(data.get("subcategory")||"Other")};
      void fetch(apiBase+"/api/live/suggestions",{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify(body),credentials:"omit",cache:"no-store"})
        .then(async response=>{if(!response.ok)throw new Error("SERVER_SAVE_FAILED");return response.json();})
        .then(()=>{if(error){error.textContent="Ссылка сохранена в серверном каталоге.";error.hidden=false;error.style.color="var(--fz-cyan,#66fcf1)";}})
        .catch(()=>{if(error){error.textContent="Ссылка сохранена только на этом устройстве: серверный каталог недоступен.";error.hidden=false;}});
    }else if(error){error.textContent="Ссылка сохранена только на этом устройстве: сервер не подключён.";error.hidden=false;}
    window.dispatchEvent(new CustomEvent("freezzz:live-catalog-changed"));
  });
}
