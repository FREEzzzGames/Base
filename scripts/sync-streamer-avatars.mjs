import { writeFile } from "node:fs/promises";

const streams=[
  ["Leb1ga","https://www.youtube.com/@leb1ga","leb1ga"],
  ["Dendi","https://www.youtube.com/@Dendi","dendi"],
  ["Vitaliy Kushnyryk","https://www.youtube.com/@rolex9","rolex9"],
  ["Papaplatte","https://www.youtube.com/@papaplatte","papaplatte"],
  ["MontanaBlack88","https://www.youtube.com/@montanablack","montanablack88"],
  ["Trymacs","https://www.youtube.com/@Trymacs","trymacs"],
  ["SMETANA","https://www.youtube.com/@smetanaml","smetanduck"],
  ["titamin1","https://www.youtube.com/@titamin1","titamin1"],
  ["Dunkelsch4tten","https://www.youtube.com/@dunkelsch4tten","dunkelsch4tten"],
  ["Buster","https://www.youtube.com/@slavabuster","buster"],
  ["Marmok","https://www.youtube.com/@MarmokLive","marmok_twitch"],
  ["ZUBAREFFF","https://www.youtube.com/@zubarefff11","zubarefff"]
];

const headers={"user-agent":"Mozilla/5.0 FREEzzzGames avatar sync","accept":"text/html"};
async function page(url){
  const r=await fetch(url,{headers});
  if(!r.ok)throw new Error(String(r.status));
  return await r.text();
}
function image(html){
  const patterns=[
    /"avatar"\s*:\s*\{\s*"thumbnails"\s*:\s*\[\s*\{\s*"url"\s*:\s*"([^"]+)/,
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)/i
  ];
  for(const re of patterns){
    const m=html.match(re);
    if(m?.[1])return m[1].replace(/\\u0026/g,"&");
  }
  return "";
}
const records={};
for(const [name,youtube,twitch] of streams){
  let yt="",tw="";
  try{yt=image(await page(youtube));}catch{}
  try{tw=image(await page("https://www.twitch.tv/"+twitch));}catch{}
  records[name]={youtube:yt,twitch:tw};
}
await writeFile("src/streamer-avatars.ts",
  "export type StreamAvatarRecord={youtube:string;twitch:string};\n\n"+
  "export const STREAM_AVATARS:Record<string,StreamAvatarRecord>="+JSON.stringify(records,null,2)+";\n");
