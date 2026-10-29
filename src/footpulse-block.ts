const FOOT_PULSE_CARD_ID = "footpulse";

function addFootPulseCard(): void {
  if (document.querySelector('[data-portal-card="' + FOOT_PULSE_CARD_ID + '"]')) return;
  const grid = document.querySelector<HTMLElement>('[data-home-grid="0"]');
  if (!grid) return;
  const card = document.createElement("a");
  card.className = "card home-card portal-block home-module-card home-module-footpulse";
  card.href = "./footpulse.html";
  card.dataset.portalCard = FOOT_PULSE_CARD_ID;
  card.dataset.portalBlock = FOOT_PULSE_CARD_ID;
  card.setAttribute("aria-label", "FOOTPULSE — Football Portal");
  card.innerHTML = '<span class="home-module-mark" aria-hidden="true">⚽</span>' +
    '<span class="home-card-title">FOOTPULSE</span>' +
    '<span class="home-module-description">FOOTBALL · MATCHES · PLAYER SEARCH</span>' +
    '<span class="footpulse-live-mark" aria-hidden="true">OPEN ↗</span>';
  const firstModule = grid.querySelector<HTMLElement>('[data-portal-card="game"]');
  if (firstModule) grid.insertBefore(card, firstModule); else grid.append(card);
  if (!document.querySelector("#footpulse-card-style")) {
    const style = document.createElement("style");
    style.id = "footpulse-card-style";
    style.textContent = '.home-module-footpulse{position:relative;overflow:hidden;background:linear-gradient(135deg,#1a080c,#11151d 58%,#251017)!important;border:1px solid #ff394d!important}.home-module-footpulse:after{content:"";position:absolute;right:-24px;top:-30px;width:120px;height:120px;border:1px solid #ff394d55;border-radius:50%;box-shadow:0 0 0 18px #ff394d0d,0 0 0 36px #ff394d08;pointer-events:none}.home-module-footpulse .home-card-title{color:#fff}.home-module-footpulse .home-module-mark{color:#ff394d}.home-module-footpulse .footpulse-live-mark{position:absolute;right:12px;bottom:12px;color:#ff6878;font:10px ui-monospace,monospace;letter-spacing:1px}';
    document.head.append(style);
  }
}

window.addEventListener("freezzz:portal-render", addFootPulseCard);
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", addFootPulseCard, { once: true });
} else {
  addFootPulseCard();
}
