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

export function portalVideoUrl(id:PortalVideoId):string{
  return new URL(import.meta.env.BASE_URL+"videos/"+PORTAL_VIDEO_ASSETS[id],window.location.href).toString();
}
