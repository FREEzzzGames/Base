import { icon, type LiveStream } from "./portal-ui";

export type LiveSource="twitch"|"youtube"|"replay";
export interface LivePopupState{key:string;name:string;source:LiveSource;}

function youtubeVideoId(url:string):string{
  try{
    const u=new URL(url);
    if(u.hostname.includes("youtu.be"))return u.pathname.slice(1);
    return u.searchParams.get("v")||u.pathname.match(/\/(?:embed|shorts)\/([^/]+)/)?.[1]||"";
  }catch{return "";}
}
function twitchVideoId(url:string):string{
  try{
    const match=new URL(url).pathname.match(/\/videos\/(\d+)/);
    return match?.[1]||"";
  }catch{return "";}
}
export function liveEmbedUrl(stream:LiveStream,source:LiveSource,hostname:string):string{
  if(source==="twitch"&&stream.twitchChannel){
    return "https://player.twitch.tv/?"+new URLSearchParams({channel:stream.twitchChannel,parent:hostname||"freezzgames.github.io",autoplay:"false",muted:"false"}).toString();
  }
  if(source==="youtube"&&stream.youtubeChannel){
    return "https://www.youtube-nocookie.com/embed/live_stream?"+new URLSearchParams({channel:stream.youtubeChannel,autoplay:"0",rel:"0",playsinline:"1"}).toString();
  }
  if(source==="replay"&&stream.lastRecordingUrl){
    const twitchId=twitchVideoId(stream.lastRecordingUrl);
    if(twitchId)return "https://player.twitch.tv/?"+new URLSearchParams({video:"v"+twitchId,parent:hostname||"freezzgames.github.io",autoplay:"false",muted:"false"}).toString();
    const youtubeId=youtubeVideoId(stream.lastRecordingUrl);
    if(youtubeId)return "https://www.youtube-nocookie.com/embed/"+encodeURIComponent(youtubeId)+"?autoplay=0&rel=0&playsinline=1";
  }
  return "";
}
export function renderLivePopups(options:{
  popups:readonly LivePopupState[];
  streams:readonly LiveStream[];
  escapeHtml:(value:string)=>string;
  lang?:"RU"|"DE"|"EN";
}):string{
  if(!options.popups.length)return "";
  const tr={
    RU:{close:"Закрыть",unavailable:"Плеер недоступен",channel:"Источник доступен на",open:"Открыть",live:"ЭФИР",replay:"ЗАПИСЬ"},
    DE:{close:"Schließen",unavailable:"Player nicht verfügbar",channel:"Quelle verfügbar auf",open:"Öffnen",live:"LIVE",replay:"AUFZEICHNUNG"},
    EN:{close:"Close",unavailable:"Player unavailable",channel:"Source available on",open:"Open",live:"LIVE",replay:"REPLAY"}
  }[options.lang||"RU"];
  return '<div class="live-popups-layer" data-live-popups-layer>'+
    options.popups.slice(0,4).map((popup,index)=>{
      const stream=options.streams.find(s=>s.name===popup.name);
      if(!stream)return "";
      const embed=liveEmbedUrl(stream,popup.source,window.location.hostname);
      const e=options.escapeHtml;
      const sourceLabel=popup.source==="replay"?tr.replay:(popup.source==="youtube"?"YouTube":"Twitch");
      return '<section class="live-popup live-popup-window" data-live-popup-window="'+e(popup.key)+'" data-live-popup-index="'+index+'" role="dialog" aria-label="LIVE '+e(stream.name)+'">'+
        '<header class="live-popup-header"><div><span class="live-popup-kicker">'+sourceLabel+'</span><strong>'+e(stream.name)+'</strong></div>'+
        '<button class="live-popup-close" data-live-popup-close="'+e(popup.key)+'" type="button" aria-label="'+tr.close+'">×</button></header>'+
        '<div class="live-popup-source-tabs">'+
        '<button class="tg-button '+(popup.source==="twitch"?"":"secondary")+'" data-live-popup-source="'+e(popup.key)+'" data-live-source="twitch" type="button">Twitch</button>'+
        '<button class="tg-button '+(popup.source==="youtube"?"":"secondary")+'" data-live-popup-source="'+e(popup.key)+'" data-live-source="youtube" type="button">YouTube</button>'+
        (stream.lastRecordingUrl?'<button class="tg-button '+(popup.source==="replay"?"":"secondary")+'" data-live-popup-source="'+e(popup.key)+'" data-live-source="replay" type="button">'+tr.replay+'</button>':"")+
        '</div>'+
        '<div class="live-popup-video">'+(embed
          ? '<iframe src="'+e(embed)+'" title="'+e(stream.name)+' — '+sourceLabel+'" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>'
          : '<div class="live-popup-unavailable"><div class="live-popup-icon">'+icon("robot")+'</div><strong>'+tr.unavailable+'</strong><span>'+tr.channel+' '+e(sourceLabel)+'.</span><button class="tg-button" data-live-external="'+e(popup.key)+'" type="button">'+tr.open+' '+e(sourceLabel)+'</button></div>')+
        '</div></section>';
    }).join("")+
    '</div>';
}
