const CARD_HREFS = [
  { id: "electronics-lab", title: "ELECTRONICS LAB", href: "./electronics-lab.html", accent: "#66fcf1", bg: "linear-gradient(135deg,#071a24,#111d2b 68%,#193b3b)", symbol: "⌁", caption: "ARDUINO · ESP32 · WOKWI" },
  { id: "old-maps-online", title: "OLD MAPS ONLINE", href: "./old-maps-online.html", accent: "#a6ff83", bg: "linear-gradient(135deg,#172317,#101a17 68%,#35452a)", symbol: "⌖", caption: "HISTORICAL MAPS · GEOSearch" },
  { id: "animagraffs", title: "ANIMAGRAFFS", href: "./animagraffs.html", accent: "#ffb703", bg: "linear-gradient(135deg,#292014,#17191f 68%,#3b3020)", symbol: "◉", caption: "ANIMATED EXPLAINERS · HOW IT WORKS" },
  { id: "emupedia", title: "EMUPEDIA", href: "./emupedia.html", accent: "#a6ff83", bg: "linear-gradient(135deg,#17291d,#101a17 68%,#2b4b35)", symbol: "▣", caption: "RETRO GAMES · EMULATORS · EMUOS" },
  { id: "retro-tv", title: "RETRO TV", href: "./retro-tv.html", accent: "#ffb703", bg: "linear-gradient(135deg,#292014,#17191f 68%,#4b3020)", symbol: "▰", caption: "VINTAGE CHANNELS · 50s–2000s" },
  { id: "demo-formula", title: "DEMO FORMULA", href: "./demo-formula.html", accent: "#ff4d4d", bg: "linear-gradient(135deg,#301516,#17191f 68%,#4b2020)", symbol: "🏎", caption: "FORMULA · WEBGL · INTERACTIVE" },
  { id: "drive-and-listen", title: "DRIVE & LISTEN", href: "./drive-and-listen.html", accent: "#66fcf1", bg: "linear-gradient(135deg,#10272b,#111d2b 68%,#19414a)", symbol: "♫", caption: "VIRTUAL CITIES · LOCAL RADIO" },
  { id: "notable-people", title: "NOTABLE PEOPLE", href: "./notable-people.html", accent: "#a6ff83", bg: "linear-gradient(135deg,#17291d,#101a17 68%,#2b4b35)", symbol: "◎", caption: "PEOPLE · BIRTHPLACES · WORLD MAP" },
  { id: "townscaper", title: "TOWNSCAPER", href: "./townscaper.html", accent: "#ffb703", bg: "linear-gradient(135deg,#292014,#17191f 68%,#4b3020)", symbol: "▦", caption: "BUILD A QUIET ISLAND TOWN" },
  { id: "3d-svg-designer", title: "3D SVG DESIGNER", href: "./3d-svg-designer.html", accent: "#66fcf1", bg: "linear-gradient(135deg,#071a24,#111d2b 68%,#193b3b)", symbol: "◇", caption: "VECTOR → 3D · EXPORT MODELS" },
  { id: "photext-shop", title: "PHOTEXT SHOP", href: "./photext-shop.html", accent: "#ffb703", bg: "linear-gradient(135deg,#292014,#17191f 68%,#3b3020)", symbol: "▧", caption: "PHOTO TEXT EDITOR · IMAGE TOOLS" },
  { id: "watabou", title: "WATABOU PROCGEN", href: "./watabou.html", accent: "#a6ff83", bg: "linear-gradient(135deg,#17291d,#101a17 68%,#2b4b35)", symbol: "⌖", caption: "PROCEDURAL CITIES · DUNGEONS · WORLDS" }
] as const;

const PORTAL_CARD_STYLE_ID = "freezzz-mobile-card-ergonomics";
function installPortalCardStyles() {
  if (document.getElementById(PORTAL_CARD_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = PORTAL_CARD_STYLE_ID;
  style.textContent = `
    .home-portal .home-extra-card { min-width:0!important; min-height:112px!important; height:auto!important; }
    .home-portal .home-extra-card .home-card-title { white-space:normal!important; overflow-wrap:anywhere!important; }
    @media (max-width:699px) {
      .home-portal .home-extra-card { min-height:100px!important; padding:12px 10px!important; gap:7px!important; }
      .home-portal .home-extra-card .home-card-title { font-size:clamp(14px,3.7vw,18px)!important; line-height:1.2!important; }
      .home-portal .home-extra-card > span:last-child { font-size:9px!important; letter-spacing:.25px!important; }
    }
    @media (max-width:360px) {
      .home-portal .home-extra-card { min-height:96px!important; }
      .home-portal .home-extra-card .home-card-title { font-size:14px!important; }
    }
  `;
  document.head.append(style);
}

function mountPortalCards() {
  installPortalCardStyles();
  const home = document.querySelector<HTMLElement>(".home-portal");
  if (!home) return;
  for (const config of CARD_HREFS) {
    if (home.querySelector(`[data-portal-card="${config.id}"]`)) continue;
    const card = document.createElement("a");
    card.className = "card home-card portal-block home-extra-card";
    card.href = config.href;
    card.dataset.portalCard = config.id;
    card.setAttribute("aria-label", config.title);
    card.style.cssText = `position:relative;isolation:isolate;display:flex;flex-direction:column;justify-content:center;gap:8px;box-sizing:border-box;overflow:hidden;background:${config.bg};border:1px solid ${config.accent};text-decoration:none;min-height:112px;height:auto;padding:16px 14px 14px;`;
    card.innerHTML = `<span aria-hidden="true" style="position:absolute;right:10px;top:8px;font-size:30px;line-height:1;opacity:.38;pointer-events:none">${config.symbol}</span><span class="home-card-title" style="position:relative;inset:auto;display:block;max-width:100%;padding-right:24px;font-size:clamp(16px,4vw,22px)!important;line-height:1.18;letter-spacing:.025em;overflow-wrap:anywhere;z-index:1">${config.title}</span><span style="position:relative;display:-webkit-box;inset:auto;max-width:100%;color:${config.accent};font:10px/1.35 ui-monospace,monospace;letter-spacing:.5px;overflow:hidden;-webkit-line-clamp:2;-webkit-box-orient:vertical;z-index:1">${config.caption}</span>`;
    card.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      openPortalWorkspace(config.id, config.title);
    });
    home.append(card);
  }
}

window.addEventListener("freezzz:portal-render", mountPortalCards);
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountPortalCards, { once: true });
} else {
  mountPortalCards();
}


// Portal-owned immersive workspace: navigation remains inside FREEzzzGames.
// Cross-origin iframe restrictions are respected; no proxy or security-header bypass is used.
const EMBED_TARGETS: Record<string, { src: string; original: string; description: string }> = {
  "electronics-lab": { src: "./electronics-lab.html", original: "https://wokwi.com/", description: "Virtual electronics lab" },
  "old-maps-online": { src: "https://community.oldmapsonline.org/api/v1/geosearch", original: "https://www.oldmapsonline.org/", description: "Historical maps and geosearch" },
  "animagraffs": { src: "https://animagraffs.com/", original: "https://animagraffs.com/", description: "Animated explainers" },
  "emupedia": { src: "https://emupedia.net/beta/emuos/", original: "https://emupedia.net/", description: "Retro software and EmuOS" },
  "retro-tv": { src: "https://www.theretrotvs.com/", original: "https://www.theretrotvs.com/", description: "Retro television" },
  "demo-formula": { src: "./demo-formula.html", original: "https://mesh3d.gallery/", description: "Formula car 3D demo" },
  "drive-and-listen": { src: "https://driveandlisten.app/", original: "https://driveandlisten.app/", description: "Virtual drives and local radio" },
  "notable-people": { src: "https://tjukanovt.github.io/notable-people/", original: "https://tjukanovt.github.io/", description: "Notable people map" },
  "townscaper": { src: "https://www.townscapergame.com/", original: "https://www.townscapergame.com/", description: "Townscaper" },
  "3d-svg-designer": { src: "https://3dsvgdesign.com/", original: "https://3dsvgdesign.com/", description: "3D SVG designer" },
  "photext-shop": { src: "https://photextshop.com/", original: "https://photextshop.com/", description: "Photo text editor" }
};
let activeWorkspace: HTMLElement | null = null;
function closePortalWorkspace() {
  activeWorkspace?.remove();
  activeWorkspace = null;
  document.body.style.overflow = "";
}
function openPortalWorkspace(id: string, title: string) {
  closePortalWorkspace();
  const target = EMBED_TARGETS[id];
  if (!target) return;
  const overlay = document.createElement("section");
  overlay.className = "freezzz-service-workspace";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", title);
  overlay.style.cssText = "position:fixed;inset:0;z-index:2147483000;display:flex;flex-direction:column;background:#080d12;color:#eef7f7;font:14px/1.4 system-ui,sans-serif;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)";
  const header = document.createElement("header");
  header.style.cssText = "display:flex;align-items:center;gap:10px;min-height:54px;padding:8px 12px;background:#101820;border-bottom:1px solid #263640;flex-shrink:0";
  const back = document.createElement("button");
  back.type = "button";
  back.textContent = "← HOME";
  back.style.cssText = "min-height:38px;padding:0 13px;border:1px solid #66fcf1;border-radius:8px;background:#66fcf1;color:#071316;font-weight:800";
  back.addEventListener("click", closePortalWorkspace);
  const label = document.createElement("div");
  label.textContent = title;
  label.style.cssText = "font:700 12px ui-monospace,monospace;letter-spacing:.08em;flex:1;overflow:hidden;text-overflow:ellipsis";
  const original = document.createElement("a");
  original.href = target.original;
  original.target = "_blank";
  original.rel = "noopener noreferrer";
  original.textContent = "ORIGINAL ↗";
  original.style.cssText = "color:#66fcf1;font:700 11px ui-monospace,monospace;white-space:nowrap";
  header.append(back, label, original);
  const status = document.createElement("div");
  status.textContent = target.description + " · EMBED NOT YET VERIFIED";
  status.style.cssText = "padding:5px 12px;color:#a6ff83;background:#0b1117;font:10px ui-monospace,monospace;letter-spacing:.04em;flex-shrink:0";
  const frame = document.createElement("iframe");
  frame.title = title;
  frame.src = target.src;
  frame.allow = "autoplay; fullscreen; gamepad; clipboard-read; clipboard-write; picture-in-picture";
  frame.referrerPolicy = "strict-origin-when-cross-origin";
  frame.setAttribute("allowfullscreen", "");
  frame.style.cssText = "display:block;flex:1;width:100%;height:100%;min-height:0;border:0;background:#0b1117";
  frame.addEventListener("load", () => {
    status.textContent = target.description + " · FRAME RESPONSE RECEIVED; CONTENT NOT VERIFIED";
  }, { once: true });
  overlay.append(header, status, frame);
  document.body.append(overlay);
  document.body.style.overflow = "hidden";
  activeWorkspace = overlay;
  back.focus();
}
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && activeWorkspace) closePortalWorkspace();
});
