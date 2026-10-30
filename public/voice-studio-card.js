(() => {
  const CARD_ID = "newsportv-voice-studio-card";
  function mount() {
    const grid = document.querySelector('[data-home-grid="1"]');
    if (!grid || grid.querySelector("#" + CARD_ID)) return;
    const card = document.createElement("a");
    card.id = CARD_ID;
    card.className = "card home-card portal-block home-module-card home-module-voice-studio";
    card.href = "./voice-studio.html";
    card.dataset.portalCard = "voice-studio";
    card.dataset.portalBlock = "voice-studio";
    card.setAttribute("aria-label", "NewSportV Voice Studio");
    const mark = document.createElement("span");
    mark.className = "home-module-mark";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = "♫";
    const title = document.createElement("span");
    title.className = "home-card-title";
    title.textContent = "VOICE STUDIO";
    const description = document.createElement("span");
    description.className = "home-module-description";
    description.textContent = "TEXT TO SPEECH · RU / EN / DE";
    card.append(mark, title, description);
    card.style.cssText = "position:relative;overflow:hidden;background:linear-gradient(135deg,#211016,#101319 70%,#29111a);border:1px solid #ed2438;text-decoration:none;min-height:150px";
    grid.append(card);
  }
  window.addEventListener("freezzz:portal-render", mount);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, { once: true });
  else mount();
})();