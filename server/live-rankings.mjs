import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import pg from "pg";

const DATA_PATH = process.env.LIVE_DATA_PATH || "/tmp/freezzz-live-data.json";
const DATABASE_URL = process.env.DATABASE_URL || "";
const { Pool } = pg;
let databasePool = null;
async function getDatabasePool(){
  if(!DATABASE_URL)return null;
  if(!databasePool){databasePool=new Pool({connectionString:DATABASE_URL,ssl:DATABASE_URL.includes("render.com")?{rejectUnauthorized:false}:undefined,max:3,idleTimeoutMillis:30000,connectionTimeoutMillis:8000});}
  return databasePool;
}
const YOUTUBE_KEY = process.env.YOUTUBE_DATA_API_KEY || "";
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID || "";
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET || "";
const REFRESH_SECRET = process.env.LIVE_REFRESH_SECRET || "";
const DAILY_HOUR_UTC = Number.isInteger(Number(process.env.LIVE_REFRESH_HOUR_UTC)) ? Math.min(23,Math.max(0,Number(process.env.LIVE_REFRESH_HOUR_UTC||4))) : 4;
const CATEGORIES = ["gaming","entertainment","music","education","technology","lifestyle","sports","creativity"];
const LANGUAGES = ["uk","ru","en","de","unknown"];
const SEED = [
  ["leb1ga","Leb1ga","uk","gaming","Mobile Legends","https://www.youtube.com/@leb1ga"],
  ["dendi","Dendi","en","gaming","MOBA","https://www.youtube.com/@Dendi"],
  ["rolex9","Vitaliy Kushnyryk","uk","gaming","Mobile Legends","https://www.youtube.com/@rolex9"],
  ["papaplatte","Papaplatte","de","entertainment","Just Chatting","https://www.youtube.com/channel/UCDmbhGe7-wC1a55l5ZYAZJw"],
  ["montanablack88","MontanaBlack88","de","entertainment","Just Chatting","https://www.youtube.com/@montanablack"],
  ["trymacs","Trymacs","de","gaming","Gaming","https://www.youtube.com/channel/UC6Gc4KQ1ueDnh8x7plaAD3w"],
  ["smetanduck","SMETANA","ru","gaming","Mobile Legends","https://www.youtube.com/@smetanaml"],
  ["titamin1","titamin1","ru","gaming","Mobile Legends","https://www.youtube.com/@titamin1"],
  ["dunkelsch4tten","Dunkelsch4tten","de","gaming","Gaming","https://www.youtube.com/@dunkelsch4tten"],
  ["buster","Buster","ru","gaming","Gaming","https://www.youtube.com/@slavabuster"],
  ["marmok_twitch","Marmok","ru","entertainment","Gaming videos","https://www.youtube.com/@MarmokLive"],
  ["zubarefff","ZUBAREFFF","ru","entertainment","Just Chatting","https://www.youtube.com/@zubarefff11"]
].map(([twitchLogin,name,language,category,subcategory,youtubeUrl])=>({
  id:"twitch:"+twitchLogin, name, language, category, subcategory,
  platforms:{twitch:{login:twitchLogin,url:"https://www.twitch.tv/"+twitchLogin},youtube:{url:youtubeUrl}},
  source:"seed",verified:false,addedAt:new Date().toISOString()
}));

let store = null;
let syncInFlight = null;
let lastSyncError = null;
let twitchToken = "";
let twitchTokenExpiresAt = 0;

function json(res,status,body,origin="*"){
  res.statusCode=status;res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Cache-Control","no-store");res.setHeader("Access-Control-Allow-Origin",origin);
  res.setHeader("Vary","Origin");res.end(JSON.stringify(body));
}
function normalizeCreator(input){
  if(!input||typeof input!=="object")throw new Error("INVALID_CREATOR");
  const name=String(input.name||"").trim().slice(0,100);
  const language=LANGUAGES.includes(input.language)?input.language:"unknown";
  const category=CATEGORIES.includes(input.category)?input.category:"gaming";
  const subcategory=String(input.subcategory||"Other").trim().slice(0,80)||"Other";
  const yt=String(input.youtubeUrl||"").trim(),tw=String(input.twitchUrl||"").trim();
  const youtube=yt?validateUrl(yt,"youtube"):null;
  const twitch=tw?validateUrl(tw,"twitch"):null;
  if(!name||(!youtube&&!twitch))throw new Error("NAME_AND_VALID_PLATFORM_URL_REQUIRED");
  const key=twitch?new URL(twitch).pathname.split("/").filter(Boolean)[0].toLowerCase():youtubeKey(youtube);
  return {id:(twitch?"twitch:":"youtube:")+key,name,language,category,subcategory,platforms:{youtube:youtube?{url:youtube}:null,twitch:twitch?{url:twitch,login:new URL(twitch).pathname.split("/").filter(Boolean)[0].toLowerCase()}:null},source:"user",verified:false,addedAt:new Date().toISOString()};
}
function validateUrl(raw,provider){
  let u;try{u=new URL(raw)}catch{throw new Error("INVALID_URL")}
  if(u.protocol!=="https:")throw new Error("HTTPS_REQUIRED");
  const host=u.hostname.toLowerCase().replace(/^www\./,"");
  const allowed=provider==="youtube"?["youtube.com","m.youtube.com","youtu.be"].includes(host):["twitch.tv","m.twitch.tv"].includes(host);
  const parts=u.pathname.split("/").filter(Boolean);
  if(!allowed||!parts.length||["directory","downloads","jobs","p","videos","search"].includes(parts[0].toLowerCase()))throw new Error("UNSUPPORTED_CREATOR_URL");
  return u.href;
}
function youtubeKey(url){
  if(!url)return "";
  const p=new URL(url).pathname.split("/").filter(Boolean);
  const handle=p.find(x=>x.startsWith("@"));
  const ci=p.indexOf("channel");
  return handle?handle.slice(1).toLowerCase():ci>=0?(p[ci+1]||"").toLowerCase():p[0].toLowerCase();
}
async function load(){
  if(store)return store;
  const pool=await getDatabasePool();
  if(pool){
    await pool.query("CREATE TABLE IF NOT EXISTS freezzz_live_state (id SMALLINT PRIMARY KEY CHECK (id=1), payload JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
    const result=await pool.query("SELECT payload FROM freezzz_live_state WHERE id=1");
    if(result.rows[0]?.payload){
      const parsed=result.rows[0].payload;
      store={schemaVersion:1,creators:Array.isArray(parsed.creators)?parsed.creators:[],snapshots:Array.isArray(parsed.snapshots)?parsed.snapshots:[],rankings:Array.isArray(parsed.rankings)?parsed.rankings:[],lastDailyRefresh:parsed.lastDailyRefresh||null,lastMonthlyReview:parsed.lastMonthlyReview||null};
    }else{
      store={schemaVersion:1,creators:SEED,snapshots:[],rankings:[],lastDailyRefresh:null,lastMonthlyReview:null};
      await persist();
    }
    return store;
  }
  try{
    const parsed=JSON.parse(await fs.readFile(DATA_PATH,"utf8"));
    store={schemaVersion:1,creators:Array.isArray(parsed.creators)?parsed.creators:[],snapshots:Array.isArray(parsed.snapshots)?parsed.snapshots:[],rankings:Array.isArray(parsed.rankings)?parsed.rankings:[],lastDailyRefresh:parsed.lastDailyRefresh||null,lastMonthlyReview:parsed.lastMonthlyReview||null};
  }catch(e){
    if(e?.code!=="ENOENT")console.error("[LIVE] store read failed",e?.message||e);
    store={schemaVersion:1,creators:SEED,snapshots:[],rankings:[],lastDailyRefresh:null,lastMonthlyReview:null};
    await persist();
  }
  return store;
}
let persistChain=Promise.resolve();
async function persist(){
  if(!store)return;
  const snapshot=JSON.stringify(store);
  persistChain=persistChain.then(async()=>{
    const pool=await getDatabasePool();
    if(pool){
      await pool.query("INSERT INTO freezzz_live_state (id,payload,updated_at) VALUES (1,$1::jsonb,NOW()) ON CONFLICT (id) DO UPDATE SET payload=EXCLUDED.payload,updated_at=NOW()",[snapshot]);
      return;
    }
    await fs.mkdir(path.dirname(DATA_PATH),{recursive:true});
    const temp=DATA_PATH+"."+crypto.randomBytes(5).toString("hex")+".tmp";
    await fs.writeFile(temp,snapshot,{mode:0o600});
    await fs.rename(temp,DATA_PATH);
  });
  return persistChain;
}
async function youtubeRequest(params){
  if(!YOUTUBE_KEY)throw new Error("YOUTUBE_DATA_API_KEY_NOT_CONFIGURED");
  const url=new URL("https://www.googleapis.com/youtube/v3/channels");
  for(const [k,v] of Object.entries(params))url.searchParams.set(k,v);
  url.searchParams.set("key",YOUTUBE_KEY);
  const response=await fetch(url,{signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new Error("YOUTUBE_API_HTTP_"+response.status);
  return response.json();
}
async function resolveYoutube(creator){
  const p=creator.platforms?.youtube;if(!p?.url)return null;
  const key=youtubeKey(p.url);if(!key)return null;
  let params;
  if(key.startsWith("UC"))params={part:"snippet,statistics",id:key};
  else params={part:"snippet,statistics",forHandle:key};
  const data=await youtubeRequest(params);
  const channel=data.items?.[0];if(!channel)return {available:false,reason:"CHANNEL_NOT_FOUND"};
  return {channelId:channel.id,title:channel.snippet?.title||creator.name,description:String(channel.snippet?.description||"").slice(0,500),country:channel.snippet?.country||null,statistics:{subscribers:channel.statistics?.hiddenSubscriberCount?null:Number(channel.statistics?.subscriberCount??0),views:Number(channel.statistics?.viewCount??0),videos:Number(channel.statistics?.videoCount??0)},url:"https://www.youtube.com/channel/"+channel.id,observedAt:new Date().toISOString(),source:"YouTube Data API v3"};
}
async function getTwitchToken(){
  if(twitchToken&&Date.now()<twitchTokenExpiresAt-60000)return twitchToken;
  if(!TWITCH_CLIENT_ID||!TWITCH_CLIENT_SECRET)throw new Error("TWITCH_API_CREDENTIALS_NOT_CONFIGURED");
  const body=new URLSearchParams({client_id:TWITCH_CLIENT_ID,client_secret:TWITCH_CLIENT_SECRET,grant_type:"client_credentials"});
  const r=await fetch("https://id.twitch.tv/oauth2/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body,signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw new Error("TWITCH_TOKEN_HTTP_"+r.status);
  const data=await r.json();twitchToken=data.access_token;twitchTokenExpiresAt=Date.now()+Number(data.expires_in||3600)*1000;return twitchToken;
}
async function twitchRequest(endpoint,params={}){
  const token=await getTwitchToken();const url=new URL("https://api.twitch.tv/helix/"+endpoint);
  for(const [k,v] of Object.entries(params))if(v!==undefined&&v!==null&&v!=="")url.searchParams.set(k,String(v));
  const r=await fetch(url,{headers:{"Client-ID":TWITCH_CLIENT_ID,Authorization:"Bearer "+token},signal:AbortSignal.timeout(12000)});
  if(!r.ok)throw new Error("TWITCH_API_HTTP_"+r.status);return r.json();
}
async function resolveTwitch(creator){
  const login=creator.platforms?.twitch?.login;if(!login)return null;
  const users=await twitchRequest("users",{login});
  const user=users.data?.[0];if(!user)return {available:false,reason:"CHANNEL_NOT_FOUND"};
  const [channelData,streamData]=await Promise.all([
    twitchRequest("channels",{broadcaster_id:user.id}),
    twitchRequest("streams",{user_id:user.id,first:1})
  ]);
  const channel=channelData.data?.[0]||{},stream=streamData.data?.[0]||null;
  return {userId:user.id,login:user.login,title:user.display_name||creator.name,description:String(user.description||"").slice(0,500),url:"https://www.twitch.tv/"+user.login,language:stream?.language||channel.broadcaster_language||null,category:stream?.game_name||channel.game_name||null,live:Boolean(stream),viewers:stream?Number(stream.viewer_count||0):0,startedAt:stream?.started_at||null,observedAt:new Date().toISOString(),source:"Twitch Helix API"};
}
function scoreYoutube(stats){
  if(!stats)return null;
  // Stable channel reach; keep views and subscribers as separate official metrics.
  return Math.log1p(Number(stats.subscribers||0))*0.7+Math.log1p(Number(stats.views||0))*0.3;
}
function buildRankings(s){
  const result=[];
  for(const platform of ["youtube","twitch"]){
    const latest=new Map();
    for(const snap of s.snapshots.filter(x=>x.platform===platform).sort((a,b)=>b.observedAt.localeCompare(a.observedAt))){
      const key=snap.creatorId+"|"+snap.platform;if(!latest.has(key))latest.set(key,snap);
    }
    for(const language of LANGUAGES.filter(x=>x!=="unknown")){
      for(const category of CATEGORIES){
        const groups=new Map();
        for(const creator of s.creators){
          if(creator.language!==language||creator.category!==category)continue;
          const snap=latest.get(creator.id+"|"+platform);if(!snap||snap.error||!snap.metrics)continue;
          const score=platform==="youtube"?scoreYoutube(snap.metrics):snap.metrics.live?Math.log1p(snap.metrics.viewers||0)+0.15:0;
          const key=creator.subcategory||"Other";if(!groups.has(key))groups.set(key,[]);
          groups.get(key).push({creatorId:creator.id,name:creator.name,language,category,subcategory:key,platform,score,metrics:snap.metrics,observedAt:snap.observedAt});
        }
        for(const [subcategory,items] of groups){
          items.sort((a,b)=>b.score-a.score);
          items.forEach((item,index)=>result.push({...item,rank:index+1,isTopFive:index<5}));
        }
      }
    }
  }
  return result;
}
async function syncAll(){
  if(syncInFlight)return syncInFlight;
  syncInFlight=(async()=>{
    const s=await load();const now=new Date().toISOString();let successes=0,failures=0;
    for(const creator of s.creators){
      for(const platform of ["youtube","twitch"]){
        if(!creator.platforms?.[platform])continue;
        try{
          const metrics=platform==="youtube"?await resolveYoutube(creator):await resolveTwitch(creator);
          if(metrics?.available===false)throw new Error(metrics.reason);
          s.snapshots.push({creatorId:creator.id,platform,observedAt:now,metrics});
          successes++;
        }catch(e){
          failures++;const message=String(e?.message||"SYNC_FAILED");
          lastSyncError=message;
          s.snapshots.push({creatorId:creator.id,platform,observedAt:now,error:message.slice(0,120)});
          // A missing secret or quota outage should fail fast rather than hammer the provider.
          if(message.includes("NOT_CONFIGURED")||message.includes("HTTP_401")||message.includes("HTTP_403"))break;
        }
      }
    }
    s.snapshots=s.snapshots.slice(-Math.max(2000,s.creators.length*60));
    s.rankings=buildRankings(s);s.lastDailyRefresh=now;
    await persist();
    return {ok:failures===0,updatedAt:now,creators:s.creators.length,successes,failures,rankedEntries:s.rankings.length,credentials:{youtube:Boolean(YOUTUBE_KEY),twitch:Boolean(TWITCH_CLIENT_ID&&TWITCH_CLIENT_SECRET)},error:lastSyncError};
  })().finally(()=>{syncInFlight=null;});
  return syncInFlight;
}
function monthlyReview(s){
  const seen=new Set(),reviewed=[];
  s.creators=s.creators.filter(c=>{
    const platformKey= c.platforms?.twitch?.login ? "twitch:"+c.platforms.twitch.login.toLowerCase() : c.platforms?.youtube?.url ? "youtube:"+youtubeKey(c.platforms.youtube.url) : c.id;
    if(seen.has(platformKey))return false;seen.add(platformKey);
    if(!LANGUAGES.includes(c.language))c.language="unknown";
    if(!CATEGORIES.includes(c.category))c.category="gaming";
    c.name=String(c.name||"Unknown").slice(0,100);reviewed.push(c.id);return true;
  });
  s.lastMonthlyReview={at:new Date().toISOString(),creatorsReviewed:reviewed.length,deduplicated:true};
  s.rankings=buildRankings(s);
}
export async function handleLiveRoute(req,res,url,origin){
  const pathname=url.pathname;
  if(req.method==="GET"&&pathname==="/api/live/health"){
    const s=await load();return json(res,200,{ok:true,service:"live-rankings",youtubeConfigured:Boolean(YOUTUBE_KEY),twitchConfigured:Boolean(TWITCH_CLIENT_ID&&TWITCH_CLIENT_SECRET),storage:DATABASE_URL?"postgres":"local-file",persistentPath:DATABASE_URL?undefined:DATA_PATH,lastDailyRefresh:s.lastDailyRefresh,lastMonthlyReview:s.lastMonthlyReview,creators:s.creators.length,snapshots:s.snapshots.length,rankings:s.rankings.length,lastError:lastSyncError},origin);
  }
  if(req.method==="GET"&&pathname==="/api/live/catalog"){
    const s=await load();return json(res,200,{ok:true,creators:s.creators.map(({id,name,language,category,subcategory,platforms,source,verified,addedAt})=>({id,name,language,category,subcategory,platforms,source,verified,addedAt})),total:s.creators.length,generatedAt:new Date().toISOString()},origin);
  }
  if(req.method==="GET"&&pathname==="/api/live/rankings"){
    const s=await load();const platform=url.searchParams.get("platform"),language=url.searchParams.get("language"),category=url.searchParams.get("category"),subcategory=url.searchParams.get("subcategory");
    const filtered=s.rankings.filter(x=>(!platform||x.platform===platform)&&(!language||x.language===language)&&(!category||x.category===category)&&(!subcategory||x.subcategory===subcategory));
    const top=filtered.filter(x=>x.isTopFive).sort((a,b)=>a.platform.localeCompare(b.platform)||a.language.localeCompare(b.language)||a.category.localeCompare(b.category)||a.subcategory.localeCompare(b.subcategory)||a.rank-b.rank);
    return json(res,200,{ok:true,rankings:top,total:top.length,lastUpdated:s.lastDailyRefresh,officialOnly:true},origin);
  }
  if(req.method==="POST"&&pathname==="/api/live/creators"){
    if(!REFRESH_SECRET||req.headers["x-live-admin-key"]!==REFRESH_SECRET)return json(res,403,{ok:false,error:"ADMIN_AUTH_REQUIRED"},origin);
    let body;try{body=JSON.parse(await new Promise((resolve,reject)=>{let raw="";req.on("data",chunk=>{raw+=chunk;if(raw.length>32768)reject(new Error("PAYLOAD_TOO_LARGE"));});req.on("end",()=>resolve(raw||"{}"));req.on("error",reject);}));}catch{return json(res,400,{ok:false,error:"INVALID_JSON"},origin);}
    try{
      const creator=normalizeCreator(body);const s=await load();const existing=s.creators.findIndex(c=>c.id===creator.id);
      if(existing>=0)s.creators[existing]={...s.creators[existing],...creator,addedAt:s.creators[existing].addedAt};else s.creators.push(creator);
      await persist();return json(res,200,{ok:true,creator,total:s.creators.length},origin);
    }catch(e){return json(res,400,{ok:false,error:String(e?.message||"INVALID_CREATOR")},origin);}
  }
  if(req.method==="POST"&&pathname==="/api/live/refresh"){
    if(!REFRESH_SECRET||req.headers["x-live-admin-key"]!==REFRESH_SECRET)return json(res,403,{ok:false,error:"ADMIN_AUTH_REQUIRED"},origin);
    try{return json(res,200,await syncAll(),origin);}catch(e){return json(res,502,{ok:false,error:String(e?.message||"LIVE_SYNC_FAILED")},origin);}
  }
  return null;
}
let timerStarted=false;
export function startLiveScheduler(){
  if(timerStarted)return;timerStarted=true;
  const scheduleNext=()=>{
    const now=new Date(),next=new Date(now);next.setUTCHours(DAILY_HOUR_UTC,0,0,0);if(next<=now)next.setUTCDate(next.getUTCDate()+1);
    setTimeout(async()=>{try{const s=await load();if(!s.lastDailyRefresh||Date.now()-Date.parse(s.lastDailyRefresh)>20*60*60*1000)await syncAll();}catch(e){lastSyncError=String(e?.message||e);console.error("[LIVE] scheduled daily refresh failed",lastSyncError);}finally{scheduleNext();}},Math.max(1000,next-now));
  };
  scheduleNext();
  const monthly=setInterval(async()=>{const now=new Date();if(now.getUTCDate()!==1)return;try{const s=await load();if(s.lastMonthlyReview?.at?.slice(0,7)===now.toISOString().slice(0,7))return;monthlyReview(s);await persist();}catch(e){console.error("[LIVE] monthly review failed",e?.message||e);}},60*60*1000);
  monthly.unref?.();
  // One boot-time refresh fills the initial official snapshot when credentials are configured.
  void load().then(s=>{if((YOUTUBE_KEY||TWITCH_CLIENT_ID&&TWITCH_CLIENT_SECRET)&&(!s.lastDailyRefresh||Date.now()-Date.parse(s.lastDailyRefresh)>20*60*60*1000))return syncAll();}).catch(e=>{lastSyncError=String(e?.message||e);});
}
