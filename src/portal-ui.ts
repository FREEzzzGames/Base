export const LUCIDE_ICONS:Record<string,string>={
  user:'<circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0"/>',
  video:'<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3z"/>',
  chat:'<path d="M21 11.5a8 8 0 0 1-8.5 8A9.4 9.4 0 0 1 8 18.3L3 20l1.7-4A8.6 8.6 0 1 1 21 11.5Z"/><path d="M8 11h.01M12 11h.01M16 11h.01"/>',
  game:'<path d="M7 8h10a5 5 0 0 1 4.5 7.2l-1.1 2.2a2.5 2.5 0 0 1-4.2.4L14.8 16H9.2l-1.4 1.8a2.5 2.5 0 0 1-4.2-.4l-1.1-2.2A5 5 0 0 1 7 8Z"/><path d="M7 11v4M5 13h4"/><path d="M16 12h.01M18 14h.01"/>',
  radio:'<rect x="4" y="7" width="16" height="13" rx="2"/><path d="m7 7 10-4"/><circle cx="9" cy="14" r="2"/><path d="M13 12h4M13 16h3"/>',
  library:'<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21Z"/><path d="M4 5.5v15"/><path d="M8 7h8M8 11h8"/>',
  home:'<path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9"/><path d="M9 20v-6h6v6"/>',
  settings:'<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="m19.4 15 .1.1a2 2 0 0 1-2.8 2.8l-.1-.1a2 2 0 0 0-3.4 1.4v.2a2 2 0 0 1-4 0v-.2a2 2 0 0 0-3.4-1.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A2 2 0 0 0 3.7 12a2 2 0 0 0-1.7-2 2 2 0 0 1 0-4h.2A2 2 0 0 0 3.6 2.6l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A2 2 0 0 0 10 1.2V1a2 2 0 0 1 4 0v.2a2 2 0 0 0 3.4 1.4l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A2 2 0 0 0 21.3 9h.2a2 2 0 0 1 0 4h-.2a2 2 0 0 0-1.9 2Z"/>',
  rocket:'<path d="M14 4c3-1 6-1 7-1 0 1 0 4-1 7l-7 7-4-1-1-4 7-7Z"/><path d="m8 16-4 4M5 12l-3 1 4 4M12 19l1 3 4-4"/><circle cx="16.5" cy="7.5" r="1.5"/>',
  zap:'<path d="m13 2-9 12h7l-1 8 9-12h-7z"/>'
};
function icon(name:string,className=""){
  const path=LUCIDE_ICONS[name]||LUCIDE_ICONS.video;
  return `<svg class="ui-icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

export type LiveStream={icon:string;name:string;twitch:string;youtube:string;twitchChannel:string;youtubeChannel?:string};
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

