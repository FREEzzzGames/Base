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
function storageKey(identity:TelegramProfileIdentity=getTelegramIdentity()){return KEY_PREFIX+(identity.id?String(identity.id):"anonymous");}

function nowIso(){return new Date().toISOString();}

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

export function getTelegramIdentity():TelegramProfileIdentity{
  try{
    const tg=(window as Window&{Telegram?:{WebApp?:{initDataUnsafe?:{user?:{
      id?:number;
      first_name?:string;
      last_name?:string;
      username?:string;
      language_code?:string;
      photo_url?:string;
    }}}}}).Telegram?.WebApp;
    const u=tg?.initDataUnsafe?.user;
    return u?{
      id:u.id,
      firstName:u.first_name,
      lastName:u.last_name,
      username:u.username,
      languageCode:u.language_code,
      photoUrl:u.photo_url
    }:{};
  }catch{return {};}
}

export function loadPortalProfile():PortalProfile{
  const identity=getTelegramIdentity();
  try{
    const raw=localStorage.getItem(storageKey(identity));
    if(raw){
      const saved=JSON.parse(raw) as PortalProfile;
      return {
        identity:{...getTelegramIdentity(),...(saved.identity||{})},
        language:saved.language||"RU",
        stats:{
          ...emptyStats(),...(saved.stats||{}),
          live:{...emptyStats().live,...(saved.stats?.live||{})},
          game:{...emptyStats().game,...(saved.stats?.game||{})},
          radio:{...emptyStats().radio,...(saved.stats?.radio||{})},
          chat:{...emptyStats().chat,...(saved.stats?.chat||{})}
        }
      };
    }
  }catch{}
  return {identity,language:"RU",stats:emptyStats()};
}

export function savePortalProfile(profile:PortalProfile):void{
  try{localStorage.setItem(storageKey(profile.identity),JSON.stringify(profile));}catch{}
}

export function syncPortalIdentity(profile:PortalProfile):PortalProfile{
  const tg=getTelegramIdentity();
  profile.identity={...profile.identity,...tg};
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
