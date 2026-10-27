export type ProfileLanguage="RU"|"DE"|"EN";

export interface TelegramProfileIdentity{
  id?:number;
  firstName?:string;
  lastName?:string;
  username?:string;
  languageCode?:string;
  photoUrl?:string;
}

export interface PortalActivityStats{
  firstSeenAt:string;
  lastSeenAt:string;
  sessions:number;
  live:{
    channels:Record<string,{visits:number,seconds:number,lastSeenAt:string}>;
    totalSeconds:number;
  };
  game:{
    launches:number;
    seconds:number;
    lastSeenAt:string;
  };
  radio:{
    stations:Record<string,{visits:number,seconds:number,lastSeenAt:string}>;
    totalSeconds:number;
  };
  chat:{
    messagesSent:number;
  };
}

export interface PortalProfile{
  identity:TelegramProfileIdentity;
  language:ProfileLanguage;
  stats:PortalActivityStats;
}

const KEY_PREFIX="freezzz:portal-profile:v1:";
let storageWarningShown=false;
function warnStorageFailure(operation:string,error:unknown):void{
  if(storageWarningShown)return;
  storageWarningShown=true;
  console.warn("[FREEzzz profile] Browser storage unavailable; activity may not persist ("+operation+").",error);
}
function storageKey(identity:TelegramProfileIdentity=getTelegramIdentity()){return KEY_PREFIX+(identity.id?String(identity.id):"anonymous");}

function nowIso(){return new Date().toISOString();}

function asRecord(value:unknown):Record<string,unknown>{
  return value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};
}
function safeCount(value:unknown):number{
  const n=typeof value==="number"?value:Number.NaN;
  return Number.isFinite(n)&&n>=0?Math.floor(n):0;
}
function safeTimestamp(value:unknown,fallback:string):string{
  return typeof value==="string"&&Number.isFinite(Date.parse(value))?value:fallback;
}
function normalizeActivityMap(value:unknown,fallback:string):Record<string,{visits:number;seconds:number;lastSeenAt:string}>{
  const result:Record<string,{visits:number;seconds:number;lastSeenAt:string}>={};
  for(const [key,raw] of Object.entries(asRecord(value))){
    const entry=asRecord(raw);
    result[key]={visits:safeCount(entry.visits),seconds:safeCount(entry.seconds),lastSeenAt:safeTimestamp(entry.lastSeenAt,fallback)};
  }
  return result;
}

function emptyStats():PortalActivityStats{
  const now=nowIso();
  return {
    firstSeenAt:now,lastSeenAt:now,sessions:0,
    live:{channels:{},totalSeconds:0},
    game:{launches:0,seconds:0,lastSeenAt:now},
    radio:{stations:{},totalSeconds:0},
    chat:{messagesSent:0}
  };
}

export function getTelegramIdentity(verified?:TelegramProfileIdentity):TelegramProfileIdentity{
  return verified?{...verified}:{};
}

export function loadPortalProfile(verifiedIdentity?:TelegramProfileIdentity):PortalProfile{
  const defaultIdentity=verifiedIdentity||{languageCode:getTelegramIdentity().languageCode};
  try{
    const raw=localStorage.getItem(storageKey(defaultIdentity));
    if(raw){
      const saved=asRecord(JSON.parse(raw));
      const savedIdentity=asRecord(saved.identity);
      const identity:TelegramProfileIdentity=verifiedIdentity?{...verifiedIdentity}:{
        id:typeof savedIdentity.id==="number"&&Number.isFinite(savedIdentity.id)?savedIdentity.id:undefined,
        firstName:typeof savedIdentity.firstName==="string"?savedIdentity.firstName:undefined,
        lastName:typeof savedIdentity.lastName==="string"?savedIdentity.lastName:undefined,
        username:typeof savedIdentity.username==="string"?savedIdentity.username:undefined,
        languageCode:typeof savedIdentity.languageCode==="string"?savedIdentity.languageCode:defaultIdentity.languageCode,
        photoUrl:typeof savedIdentity.photoUrl==="string"?savedIdentity.photoUrl:undefined
      };
      const defaults=emptyStats();
      const savedStats=asRecord(saved.stats);
      const live=asRecord(savedStats.live);
      const game=asRecord(savedStats.game);
      const radio=asRecord(savedStats.radio);
      const chat=asRecord(savedStats.chat);
      const language=saved.language==="RU"||saved.language==="DE"||saved.language==="EN"?saved.language:"RU";
      return {
        identity,
        language,
        stats:{
          firstSeenAt:safeTimestamp(savedStats.firstSeenAt,defaults.firstSeenAt),
          lastSeenAt:safeTimestamp(savedStats.lastSeenAt,defaults.lastSeenAt),
          sessions:safeCount(savedStats.sessions),
          live:{
            channels:normalizeActivityMap(live.channels,defaults.lastSeenAt),
            totalSeconds:safeCount(live.totalSeconds)
          },
          game:{
            launches:safeCount(game.launches),
            seconds:safeCount(game.seconds),
            lastSeenAt:safeTimestamp(game.lastSeenAt,defaults.game.lastSeenAt)
          },
          radio:{
            stations:normalizeActivityMap(radio.stations,defaults.lastSeenAt),
            totalSeconds:safeCount(radio.totalSeconds)
          },
          chat:{messagesSent:safeCount(chat.messagesSent)}
        }
      };
    }
  }catch(error){
    warnStorageFailure("read",error);
  }
  return {identity:defaultIdentity,language:"RU",stats:emptyStats()};
}

export function savePortalProfile(profile:PortalProfile):void{
  try{localStorage.setItem(storageKey(profile.identity),JSON.stringify(profile));}
  catch(error){warnStorageFailure("write",error);}
}

export function syncPortalIdentity(profile:PortalProfile,verifiedIdentity?:TelegramProfileIdentity):PortalProfile{
  if(verifiedIdentity)profile.identity={...profile.identity,...verifiedIdentity};
  profile.stats.lastSeenAt=nowIso();
  savePortalProfile(profile);
  return profile;
}

export function startPortalSession(profile:PortalProfile):void{
  profile.stats.sessions+=1;
  profile.stats.lastSeenAt=nowIso();
  if(!profile.stats.firstSeenAt)profile.stats.firstSeenAt=profile.stats.lastSeenAt;
  savePortalProfile(profile);
}

export function recordLiveVisit(profile:PortalProfile,name:string):void{
  const now=nowIso();
  const current=profile.stats.live.channels[name]||{visits:0,seconds:0,lastSeenAt:now};
  current.visits+=1;current.lastSeenAt=now;
  profile.stats.live.channels[name]=current;
  savePortalProfile(profile);
}

export function addLiveWatchTime(profile:PortalProfile,name:string,seconds:number):void{
  if(seconds<=0)return;
  const now=nowIso();
  const current=profile.stats.live.channels[name]||{visits:0,seconds:0,lastSeenAt:now};
  current.seconds+=Math.round(seconds);current.lastSeenAt=now;
  profile.stats.live.channels[name]=current;
  profile.stats.live.totalSeconds+=Math.round(seconds);
  savePortalProfile(profile);
}

export function recordGameLaunch(profile:PortalProfile):void{
  profile.stats.game.launches+=1;
  profile.stats.game.lastSeenAt=nowIso();
  savePortalProfile(profile);
}

export function addGameTime(profile:PortalProfile,seconds:number):void{
  if(seconds<=0)return;
  profile.stats.game.seconds+=Math.round(seconds);
  profile.stats.game.lastSeenAt=nowIso();
  savePortalProfile(profile);
}

export function recordRadioVisit(profile:PortalProfile,station:string):void{
  const now=nowIso();
  const current=profile.stats.radio.stations[station]||{visits:0,seconds:0,lastSeenAt:now};
  current.visits+=1;current.lastSeenAt=now;
  profile.stats.radio.stations[station]=current;
  savePortalProfile(profile);
}

export function addRadioListenTime(profile:PortalProfile,station:string,seconds:number):void{
  if(seconds<=0)return;
  const now=nowIso();
  const current=profile.stats.radio.stations[station]||{visits:0,seconds:0,lastSeenAt:now};
  current.seconds+=Math.round(seconds);current.lastSeenAt=now;
  profile.stats.radio.stations[station]=current;
  profile.stats.radio.totalSeconds+=Math.round(seconds);
  savePortalProfile(profile);
}

export function recordChatMessage(profile:PortalProfile):void{
  profile.stats.chat.messagesSent+=1;
  savePortalProfile(profile);
}

export function formatDuration(totalSeconds:number):string{
  const s=Math.max(0,Math.round(totalSeconds));
  const h=Math.floor(s/3600);
  const m=Math.floor((s%3600)/60);
  if(h)return h+" ч "+m+" мин";
  return m+" мин";
}
