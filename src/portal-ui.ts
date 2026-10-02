type SvgIconDef={paths:string[];circles?:string[];rects?:string[];lines?:string[];polygons?:string[]};
const ICONS:Record<string,SvgIconDef>={
  user:{paths:["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z","M4 21a8 8 0 0 1 16 0"]},
  close:{paths:["M6 6l12 12","M18 6 6 18"]},
  languages:{paths:["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z","M3 12h18","M12 3c2.5 2.4 3.7 5.4 3.7 9s-1.2 6.6-3.7 9","M12 3c-2.5 2.4-3.7 5.4-3.7 9s1.2 6.6 3.7 9"]},
  profile:{paths:["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z","M4 21a8 8 0 0 1 16 0"]},
  video:{paths:["M4 6.5h11a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z","m17 10 5-3v10l-5-3"]},
  chat:{paths:["M4 5.5A3.5 3.5 0 0 1 7.5 2h9A3.5 3.5 0 0 1 20 5.5v7a3.5 3.5 0 0 1-3.5 3.5H11l-5 4v-4.7a3.5 3.5 0 0 1-2-3.2Z"]},
  game:{paths:["M7 9h10a5 5 0 0 1 4.8 6.4l-1 3.2a2 2 0 0 1-3.4.8L14.8 17H9.2l-2.6 2.4a2 2 0 0 1-3.4-.8l-1-3.2A5 5 0 0 1 7 9Z","M7 12v4","M5 14h4","M17 13h.01","M19 15h.01"]},
  radio:{paths:["M4 8a8 8 0 0 1 16 0","M7 11a5 5 0 0 1 10 0","M10 14a2 2 0 0 1 4 0","M12 16v5","M8 21h8"]},
  library:{paths:["M4 5h16v14H4z","M8 5v14","M12 9h5","M12 13h5","M12 17h3"]},
  home:{paths:["m3 11 9-8 9 8","M5 10v10h14V10","M9 20v-6h6v6"]},
  editor:{paths:["m4 17 8-8 4 4-8 8H4v-4Z","m13 8 2-2 4 4-2 2"]},
  settings:{paths:["M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z","M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.5 1.5-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.1h-2.1v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-1.5-1.5.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H7v-2.1h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.5-1.5.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V5h2.1v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.5 1.5-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v2.1h-.1a1.7 1.7 0 0 0-1.6 1Z"]},
  rocket:{paths:["M14 4c3.2.1 5.9 2.8 6 6-1.2 4-4.3 6.8-8.2 7.8L7 13c1-3.9 3-7 7-9Z","M8 13 4 17","M7 17l-1 4 4-1","M16 8h.01"]},
  zap:{paths:["m13 2-8 11h6l-1 9 8-11h-6l1-9Z"]},
  live:{paths:["M4 6.5h11a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z","m17 10 5-3v10l-5-3"]},
  message:{paths:["M4 5.5A3.5 3.5 0 0 1 7.5 2h9A3.5 3.5 0 0 1 20 5.5v7a3.5 3.5 0 0 1-3.5 3.5H11l-5 4v-4.7a3.5 3.5 0 0 1-2-3.2Z"]},
  search:{paths:["M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z","m16 16 5 5"]},
  loading:{paths:["M12 3a9 9 0 1 0 9 9"]},
  calendar:{paths:["M5 4h14a2 2 0 0 1 2 2v13H3V6a2 2 0 0 1 2-2Z","M8 2v4","M16 2v4","M3 9h18"]},
  refresh:{paths:["M20 11a8 8 0 0 0-14-5L4 8","M4 4v4h4","M4 13a8 8 0 0 0 14 5l2-2","M20 20v-4h-4"]},
  error:{paths:["M12 3 22 21H2L12 3Z","M12 9v5","M12 18h.01"]},
  success:{paths:["M20 6 9 17l-5-5"]},
  waiting:{paths:["M6 3h12","M6 21h12","M7 3c0 4 5 4.5 5 9s-5 5-5 9","M17 3c0 4-5 4.5-5 9s5 5 5 9"]},
  mute:{paths:["M4 10h4l5-4v12l-5-4H4z","M17 9l4 6","M21 9l-4 6"]},
  play:{paths:["m8 5 11 7-11 7V5Z"]},
  pause:{paths:["M8 5v14","M16 5v14"]},
  stop:{paths:["M6 6h12v12H6z"]},
  star:{paths:["m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"]},
  archive:{paths:["M4 5h16v4H4z","M6 9v10h12V9","M9 13h6"]}
};
export function illustration(name:string,className=""){
  const d=ICONS[name]||ICONS.settings;
  const paths=d.paths.map(p=>'<path d="'+p+'"/>').join("");
  const circles=(d.circles||[]).map(c=>'<circle '+c+'/>').join("");
  const rects=(d.rects||[]).map(r=>'<rect '+r+'/>').join("");
  const lines=(d.lines||[]).map(l=>'<line '+l+'/>').join("");
  const polygons=(d.polygons||[]).map(p=>'<polygon '+p+'/>').join("");
  return '<svg class="portal-illustration '+className+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+paths+circles+rects+lines+polygons+'</svg>';
}
export function icon(name:string,className=""){
  return '<span class="ui-icon '+className+'" aria-hidden="true">'+illustration(name)+'</span>';
}

export type LiveStream={icon:string;name:string;twitch:string;youtube:string;twitchChannel:string;youtubeChannel?:string};
export function streamAvatarSources(stream:LiveStream):{youtube:string;twitch:string}{
  const youtube=stream.youtubeChannel||youtubeHandle(stream.youtube);
  const twitch=stream.twitchChannel||"";
  return {
    youtube:youtube?avatarSource("youtube",youtube):"",
    twitch:twitch?avatarSource("twitch",twitch):""
  };
}
function youtubeHandle(url:string):string{
  try{
    const parts=new URL(url).pathname.split("/").filter(Boolean);
    const handle=parts.find(part=>part.startsWith("@"));
    if(handle)return handle.slice(1);
    const channel=parts.findIndex(part=>part==="channel");
    return channel>=0?parts[channel+1]||"":parts[0]||"";
  }catch{return "";}
}
function avatarSource(provider:"youtube"|"twitch",key:string):string{
  const host=["https","unavatar","io"].join(".").replace("https.","https://");
  return host+"/"+provider+"/"+encodeURIComponent(key);
}
export const streams:LiveStream[]=[
  {icon:"video",name:"Leb1ga",twitch:"https://www.twitch.tv/leb1ga",youtube:"https://www.youtube.com/@leb1ga",twitchChannel:"leb1ga"},
  {icon:"game",name:"Dendi",twitch:"https://www.twitch.tv/Dendi",youtube:"https://www.youtube.com/@Dendi",twitchChannel:"dendi"},
  {icon:"zap",name:"Vitaliy Kushnyryk",twitch:"https://www.twitch.tv/rolex9",youtube:"https://www.youtube.com/@rolex9",twitchChannel:"rolex9"},
  {icon:"video",name:"Papaplatte",twitch:"https://www.twitch.tv/papaplatte",youtube:"https://www.youtube.com/@papaplatte",twitchChannel:"papaplatte",youtubeChannel:"UCDmbhGe7-wC1a55l5ZYAZJw"},
  {icon:"video",name:"MontanaBlack88",twitch:"https://www.twitch.tv/montanablack88",youtube:"https://www.youtube.com/@montanablack",twitchChannel:"montanablack88"},
  {icon:"rocket",name:"Trymacs",twitch:"https://www.twitch.tv/trymacs",youtube:"https://www.youtube.com/@Trymacs",twitchChannel:"trymacs",youtubeChannel:"UC6Gc4KQ1ueDnh8x7plaAD3w"},
  {icon:"game",name:"SMETANA",twitch:"https://www.twitch.tv/smetanduck",youtube:"https://www.youtube.com/@smetanaml",twitchChannel:"smetanduck"},
  {icon:"game",name:"titamin1",twitch:"https://www.twitch.tv/titamin1",youtube:"https://www.youtube.com/@titamin1",twitchChannel:"titamin1"},
  {icon:"game",name:"Dunkelsch4tten",twitch:"https://www.twitch.tv/dunkelsch4tten",youtube:"https://www.youtube.com/@dunkelsch4tten",twitchChannel:"dunkelsch4tten"},
  {icon:"game",name:"Buster",twitch:"https://www.twitch.tv/buster",youtube:"https://www.youtube.com/@slavabuster",twitchChannel:"buster"},
  {icon:"video",name:"Marmok",twitch:"https://www.twitch.tv/marmok_twitch",youtube:"https://www.youtube.com/@MarmokLive",twitchChannel:"marmok_twitch"},
  {icon:"video",name:"ZUBAREFFF",twitch:"https://www.twitch.tv/zubarefff",youtube:"https://www.youtube.com/@zubarefff11",twitchChannel:"zubarefff"}
];
