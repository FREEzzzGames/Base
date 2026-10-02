import { icon, type LiveStream } from "./portal-ui";

export function liveEmbedUrl(stream:LiveStream,source:"twitch"|"youtube",hostname:string):string{
  if(source==="twitch"){
    const parent=hostname||"freezzgames.github.io";
    return "https://player.twitch.tv/?"+new URLSearchParams({channel:stream.twitchChannel,parent,autoplay:"false",muted:"false"}).toString();
  }
  if(stream.youtubeChannel){
    return "https://www.youtube-nocookie.com/embed/live_stream?"+new URLSearchParams({channel:stream.youtubeChannel,autoplay:"0",rel:"0",playsinline:"1"}).toString();
  }
  return "";
}

export function renderLivePopup(options:{
  open:boolean;
  selected:string;
  source:"twitch"|"youtube";
  streams:readonly LiveStream[];
  escapeHtml:(value:string)=>string;
  lang?:"RU"|"DE"|"EN";
}):string{
  if(!options.open||!options.selected)return "";
  const stream=options.streams.find(s=>s.name===options.selected);
  if(!stream)return "";
  const source=options.source;
  const embed=liveEmbedUrl(stream,source,window.location.hostname);
  const e=options.escapeHtml;
  const tr={
    RU:{close:"Закрыть",unavailable:"Встроенный плеер недоступен",channel:"Канал доступен на",open:"Открыть"},
    DE:{close:"Schließen",unavailable:"Eingebetteter Player nicht verfügbar",channel:"Kanal verfügbar auf",open:"Öffnen"},
    EN:{close:"Close",unavailable:"Embedded player unavailable",channel:"Channel available on",open:"Open"}
  }[options.lang||"RU"];
  return `<div class="live-popup-overlay" data-live-popup-overlay>
    <section class="live-popup" role="dialog" aria-modal="true" aria-label="LIVE playback">
      <header class="live-popup-header">
        <div><span class="live-popup-kicker">LIVE</span><strong>${e(stream.name)}</strong><small>${source==="youtube"?"YouTube":"Twitch"}</small></div>
        <button class="live-popup-close" data-live-popup-close type="button" aria-label="${tr.close}">×</button>
      </header>
      <div class="live-popup-source-tabs">
        <button class="tg-button ${source==="twitch"?"":"secondary"}" data-live-popup-source="twitch" type="button">Twitch</button>
        <button class="tg-button ${source==="youtube"?"":"secondary"}" data-live-popup-source="youtube" type="button">YouTube</button>
      </div>
      <div class="live-popup-video">
        ${embed
          ? `<iframe src="${e(embed)}" title="${e(stream.name)} — ${source}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`
          : `<div class="live-popup-unavailable"><div class="live-popup-icon">${icon("video")}</div><strong>${tr.unavailable}</strong><span>${tr.channel} ${source}.</span><button class="tg-button" data-live-external type="button">${tr.open} ${source}</button></div>`}
      </div>
    </section>
  </div>`;
}
