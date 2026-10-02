export const PORTAL_GLYPHS:Record<string,string>={
  user:"○",
  video:"▣",
  chat:"◫",
  game:"◇",
  radio:"◉",
  library:"▤",
  home:"⌂",
  settings:"✣",
  rocket:"△",
  zap:"✦"
};
export function icon(name:string,className=""){
  const glyph=PORTAL_GLYPHS[name]||PORTAL_GLYPHS.video;
  return `<span class="ui-icon ${className}" aria-hidden="true">${glyph}</span>`;
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

