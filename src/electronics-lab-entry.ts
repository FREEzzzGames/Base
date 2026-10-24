const CARD_HREFS = [
  { id: "electronics-lab", title: "ELECTRONICS LAB", href: "./electronics-lab.html", accent: "#66fcf1", bg: "linear-gradient(135deg,#071a24,#111d2b 68%,#193b3b)", symbol: "⌁", caption: "ARDUINO · ESP32 · WOKWI" },
  { id: "old-maps-online", title: "OLD MAPS ONLINE", href: "./old-maps-online.html", accent: "#a6ff83", bg: "linear-gradient(135deg,#172317,#101a17 68%,#35452a)", symbol: "⌖", caption: "HISTORICAL MAPS · GEOSearch" },
  { id: "animagraffs", title: "ANIMAGRAFFS", href: "./animagraffs.html", accent: "#ffb703", bg: "linear-gradient(135deg,#292014,#17191f 68%,#3b3020)", symbol: "◉", caption: "ANIMATED EXPLAINERS · HOW IT WORKS" },
  { id: "emupedia", title: "EMUPEDIA", href: "./emupedia.html", accent: "#a6ff83", bg: "linear-gradient(135deg,#17291d,#101a17 68%,#2b4b35)", symbol: "▣", caption: "RETRO GAMES · EMULATORS · EMUOS" },
  { id: "retro-tv", title: "RETRO TV", href: "./retro-tv.html", accent: "#ffb703", bg: "linear-gradient(135deg,#292014,#17191f 68%,#4b3020)", symbol: "▰", caption: "VINTAGE CHANNELS · 50s–2000s",
  { id: "demo-formula", title: "DEMO FORMULA", href: "./demo-formula.html", accent: "#ff4d4d", bg: "linear-gradient(135deg,#301516,#17191f 68%,#4b2020)", symbol: "🏎", caption: "FORMULA · WEBGL · INTERACTIVE" },
  { id: "drive-and-listen", title: "DRIVE & LISTEN", href: "./drive-and-listen.html", accent: "#66fcf1", bg: "linear-gradient(135deg,#10272b,#111d2b 68%,#19414a)", symbol: "♫", caption: "VIRTUAL CITIES · LOCAL RADIO" },
  { id: "notable-people", title: "NOTABLE PEOPLE", href: "./notable-people.html", accent: "#a6ff83", bg: "linear-gradient(135deg,#17291d,#101a17 68%,#2b4b35)", symbol: "◎", caption: "PEOPLE · BIRTHPLACES · WORLD MAP" },
  { id: "townscaper", title: "TOWNSCAPER", href: "./townscaper.html", accent: "#ffb703", bg: "linear-gradient(135deg,#292014,#17191f 68%,#4b3020)", symbol: "▦", caption: "BUILD A QUIET ISLAND TOWN" },
  { id: "3d-svg-designer", title: "3D SVG DESIGNER", href: "./3d-svg-designer.html", accent: "#66fcf1", bg: "linear-gradient(135deg,#071a24,#111d2b 68%,#193b3b)", symbol: "◇", caption: "VECTOR → 3D · EXPORT MODELS" },
  { id: "photext-shop", title: "PHOTEXT SHOP", href: "./photext-shop.html", accent: "#ffb703", bg: "linear-gradient(135deg,#292014,#17191f 68%,#3b3020)", symbol: "▧", caption: "PHOTO TEXT EDITOR · IMAGE TOOLS" }
] as const;

function mountPortalCards() {
  const home = document.querySelector<HTMLElement>(".home-portal");
  if (!home) return;
  for (const config of CARD_HREFS) {
    if (home.querySelector(`[data-portal-card="${config.id}"]`)) continue;
    const card = document.createElement("a");
    card.className = "card home-card portal-block home-extra-card";
    card.href = config.href;
    card.dataset.portalCard = config.id;
    card.setAttribute("aria-label", config.title);
    card.style.cssText = `position:relative;overflow:hidden;background:${config.bg};border:1px solid ${config.accent};text-decoration:none;min-height:150px`;
    card.innerHTML = `<span aria-hidden="true" style="position:absolute;right:12px;top:8px;font-size:42px;opacity:.85">${config.symbol}</span><span class="home-card-title" style="top:12px;left:12px;font-size:clamp(19px,4.2vw,34px)!important;letter-spacing:.05em">${config.title}</span><span style="position:absolute;left:13px;bottom:12px;right:10px;color:${config.accent};font:10px ui-monospace,monospace;letter-spacing:1px">${config.caption}</span>`;
    home.append(card);
  }
}

window.addEventListener("freezzz:portal-render", mountPortalCards);
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountPortalCards, { once: true });
} else {
  mountPortalCards();
}
