export type PortalVideoId = "hud"|"hero"|"live"|"chat"|"game"|"radio"|"library";

export const PORTAL_VIDEO_ASSETS:Record<PortalVideoId,string>={
  hud:"hud-background.mp4",
  hero:"home-hero.mp4",
  live:"home-live.mp4",
  chat:"home-chat.mp4",
  game:"home-game.mp4",
  radio:"home-radio.mp4",
  library:"home-library.mp4"
};

export const PORTAL_VIDEO_REMOTE_SOURCES:Record<PortalVideoId,string>={
  hud:"https://cdn.pixabay.com/video/2024/08/18/227152_large.mp4",
  hero:"https://cdn.pixabay.com/video/2023/07/22/172788-847869832_large.mp4",
  live:"https://cdn.pixabay.com/video/2022/02/03/106557-673518279_large.mp4",
  chat:"https://cdn.pixabay.com/video/2022/04/25/115036-703067759_large.mp4",
  game:"https://cdn.pixabay.com/video/2022/12/05/141675-778335011_large.mp4",
  radio:"https://cdn.pixabay.com/video/2019/10/02/27466-363961185_large.mp4",
  library:"https://cdn.pixabay.com/video/2019/12/17/30300-380713848_large.mp4"
};

export function portalVideoUrl(id:PortalVideoId):string{
  return new URL(import.meta.env.BASE_URL+"videos/"+PORTAL_VIDEO_ASSETS[id],window.location.href).toString();
}
