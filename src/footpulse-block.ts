const FOOT_PULSE_CARD_ID = "footpulse";

function addFootPulseCard(): void {
  if (document.querySelector('[data-portal-card="' + FOOT_PULSE_CARD_ID + '"]')) return;
  const grid = document.querySelector<HTMLElement>('[data-home-grid="1"]');
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
  grid.prepend(card);
}

window.addEventListener("freezzz:portal-render", addFootPulseCard);
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", addFootPulseCard, { once: true });
} else {
  addFootPulseCard();
}
