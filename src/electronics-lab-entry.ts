const CARD_ID = "electronics-lab";
const CARD_HREF = "./electronics-lab.html";

function mountElectronicsLabCard() {
  const grid = document.querySelector<HTMLElement>(".home-portal");
  if (!grid || grid.querySelector('[data-portal-card="electronics-lab"]')) return;
  const card = document.createElement("a");
  card.className = "card home-card portal-block home-electronics-lab";
  card.href = CARD_HREF;
  card.dataset.portalCard = CARD_ID;
  card.setAttribute("aria-label", "ELECTRONICS LAB — Wokwi");
  card.style.cssText = "position:relative;overflow:hidden;background:linear-gradient(135deg,#071a24,#111d2b 68%,#193b3b);border:1px solid #66fcf1;text-decoration:none;min-height:150px";
  card.innerHTML = '<span aria-hidden="true" style="position:absolute;right:12px;top:8px;font-size:42px;opacity:.85">⌁</span><span class="home-card-title" style="top:12px;left:12px;font-size:clamp(20px,4.5vw,38px)!important;letter-spacing:.07em">ELECTRONICS LAB</span><span style="position:absolute;left:13px;bottom:12px;color:#66fcf1;font:10px ui-monospace,monospace;letter-spacing:1.2px">ARDUINO · ESP32 · WOKWI</span>';
  grid.append(card);
}

window.addEventListener("freezzz:portal-render", mountElectronicsLabCard);
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountElectronicsLabCard, { once: true });
} else {
  mountElectronicsLabCard();
}
