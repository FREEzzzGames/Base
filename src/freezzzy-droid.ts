import "./freezzzy-droid.css";

type DroidMode = "idle" | "listening" | "thinking" | "working" | "success" | "error" | "offline" | "sleep";
type Action = { id: string; label: string; icon: string; mode: DroidMode; message: string };

const actions: Action[] = [
  { id: "help", label: "Помоги", icon: "✦", mode: "listening", message: "Я рядом. Выбери элемент портала или опиши задачу." },
  { id: "inspect", label: "Исследуй", icon: "⌕", mode: "thinking", message: "Режим исследования готов. Выбери объект на текущем экране." },
  { id: "create", label: "Создай", icon: "✧", mode: "working", message: "Рабочий режим открыт. Напиши, что нужно создать." },
  { id: "lab", label: "Лаборатория", icon: "⚗", mode: "thinking", message: "Лаборатория FREEzzzy: инструменты можно подключать по мере готовности." },
];

const escapeText = (value: string) => value.replace(/[&<>"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] || char);

export function initFreezzzyDroid(): void {
  if (document.querySelector(".freezzzy-droid")) return;

  const root = document.createElement("section");
  root.className = "freezzzy-droid mode-idle";
  root.setAttribute("aria-label", "FREEzzzy — ИИ-компаньон");
  root.innerHTML = `
    <div class="fz-bubble" role="status" aria-live="polite" hidden></div>
    <div class="fz-actions" aria-label="Действия FREEzzzy" hidden>
      ${actions.map(a => `<button type="button" class="fz-action" data-fz-action="${a.id}"><span aria-hidden="true">${a.icon}</span><b>${a.label}</b></button>`).join("")}
    </div>
    <button type="button" class="fz-buddy" aria-label="Открыть меню FREEzzzy" aria-expanded="false">
      <span class="fz-aura"></span>
      <span class="fz-antenna"><i></i></span>
      <span class="fz-ear fz-ear-left"></span><span class="fz-ear fz-ear-right"></span>
      <span class="fz-head"><span class="fz-face"><i class="fz-eye fz-eye-left"></i><i class="fz-eye fz-eye-right"></i><i class="fz-mouth"></i></span></span>
      <span class="fz-body"><i class="fz-core"></i><b>FREE<span>zzz</span></b></span>
      <span class="fz-foot fz-foot-left"></span><span class="fz-foot fz-foot-right"></span>
    </button>
    <div class="fz-panel" hidden>
      <div class="fz-panel-head"><div><small>ПОРТАЛЬНЫЙ КОМПАНЬОН</small><strong>FREEzzzy</strong></div><button type="button" class="fz-close" aria-label="Закрыть">×</button></div>
      <p class="fz-status">Системы готовы. Чем займёмся?</p>
      <div class="fz-quick">${actions.map(a => `<button type="button" data-fz-action="${a.id}"><span aria-hidden="true">${a.icon}</span>${a.label}</button>`).join("")}</div>
      <form class="fz-command"><label for="fz-command-input">Задача для FREEzzzy</label><div><input id="fz-command-input" maxlength="240" autocomplete="off" placeholder="Например: помоги разобраться…"><button type="submit" aria-label="Отправить задачу">➜</button></div></form>
      <small class="fz-footnote">Демо-интерфейс · подключение ИИ и инструментов — отдельный этап</small>
    </div>`;
  document.body.append(root);

  const buddy = root.querySelector<HTMLButtonElement>(".fz-buddy")!;
  const panel = root.querySelector<HTMLDivElement>(".fz-panel")!;
  const menu = root.querySelector<HTMLDivElement>(".fz-actions")!;
  const bubble = root.querySelector<HTMLDivElement>(".fz-bubble")!;
  const status = root.querySelector<HTMLElement>(".fz-status")!;
  const form = root.querySelector<HTMLFormElement>(".fz-command")!;
  const input = root.querySelector<HTMLInputElement>("#fz-command-input")!;
  let bubbleTimer = 0;

  const setMode = (mode: DroidMode) => {
    root.classList.remove("mode-idle", "mode-listening", "mode-thinking", "mode-working", "mode-success", "mode-error", "mode-offline", "mode-sleep");
    root.classList.add("mode-" + mode);
    buddy.setAttribute("aria-label", mode === "sleep" ? "Разбудить FREEzzzy" : "Открыть меню FREEzzzy");
  };
  const say = (message: string, mode: DroidMode = "idle") => {
    window.clearTimeout(bubbleTimer);
    setMode(mode);
    bubble.textContent = message;
    bubble.hidden = false;
    bubbleTimer = window.setTimeout(() => { bubble.hidden = true; if (!panel.hidden) setMode("listening"); else setMode("idle"); }, 4200);
  };
  const togglePanel = (force?: boolean) => {
    const open = force ?? panel.hidden;
    panel.hidden = !open;
    menu.hidden = true;
    buddy.setAttribute("aria-expanded", String(open));
    if (open) { setMode("listening"); status.textContent = "Системы готовы. Чем займёмся?"; }
    else setMode("idle");
  };

  buddy.addEventListener("click", () => {
    if (root.classList.contains("mode-sleep")) { setMode("idle"); say("Снова на связи!", "success"); return; }
    togglePanel();
  });
  root.querySelector(".fz-close")!.addEventListener("click", () => togglePanel(false));
  root.querySelectorAll<HTMLButtonElement>("[data-fz-action]").forEach(button => button.addEventListener("click", () => {
    const action = actions.find(a => a.id === button.dataset.fzAction);
    if (!action) return;
    status.textContent = action.message;
    say(action.message, action.mode);
    if (action.id === "help" || action.id === "create") { panel.hidden = false; input.focus(); }
    else { panel.hidden = false; }
    menu.hidden = true;
    buddy.setAttribute("aria-expanded", "true");
  }));

  form.addEventListener("submit", event => {
    event.preventDefault();
    const task = input.value.trim();
    if (!task) { input.focus(); return; }
    status.textContent = "Задача принята в интерфейсе: “" + task + "”. Для реального выполнения нужен подключённый ИИ-инструмент.";
    say("Понял задачу. Жду подключения рабочего модуля.", "thinking");
    input.value = "";
  });

  let holdTimer = 0;
  let dragged = false;
  let startX = 0;
  let startY = 0;
  buddy.addEventListener("pointerdown", event => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    dragged = false; startX = event.clientX; startY = event.clientY;
    holdTimer = window.setTimeout(() => {
      root.classList.add("fz-grabbed");
      say("Можно переместить меня в удобное место.", "listening");
    }, 550);
  });
  buddy.addEventListener("pointermove", event => {
    if (!root.classList.contains("fz-grabbed")) {
      if (Math.abs(event.clientX - startX) > 10 || Math.abs(event.clientY - startY) > 10) window.clearTimeout(holdTimer);
      return;
    }
    dragged = true;
    const margin = 12;
    const x = Math.max(margin, Math.min(window.innerWidth - root.offsetWidth - margin, event.clientX - root.offsetWidth / 2));
    const y = Math.max(margin, Math.min(window.innerHeight - 90, event.clientY - 45));
    root.style.left = x + "px"; root.style.right = "auto"; root.style.bottom = "auto"; root.style.top = y + "px";
  });
  const release = () => {
    window.clearTimeout(holdTimer);
    if (root.classList.contains("fz-grabbed")) {
      root.classList.remove("fz-grabbed");
      if (dragged) { try { localStorage.setItem("freezzz:freezzzy-position", JSON.stringify({ left: root.style.left, top: root.style.top })); } catch {} }
    }
  };
  buddy.addEventListener("pointerup", release);
  buddy.addEventListener("pointercancel", release);
  try {
    const saved = JSON.parse(localStorage.getItem("freezzz:freezzzy-position") || "null") as {left?: string; top?: string} | null;
    if (saved?.left && saved?.top) { root.style.left = saved.left; root.style.top = saved.top; root.style.right = "auto"; root.style.bottom = "auto"; }
  } catch {}

  let idleTimer = 0;
  const resetIdle = () => {
    window.clearTimeout(idleTimer);
    if (!panel.hidden) return;
    idleTimer = window.setTimeout(() => { if (panel.hidden) { setMode("sleep"); say("Перехожу в режим ожидания.", "sleep"); } }, 90000);
  };
  ["pointerdown", "keydown", "touchstart"].forEach(name => window.addEventListener(name, resetIdle, { passive: true }));
  resetIdle();

  window.addEventListener("online", () => { if (!panel.hidden) { status.textContent = "Соединение доступно. ИИ-инструмент ещё нужно подключить."; setMode("idle"); } });
  window.addEventListener("offline", () => { status.textContent = "Нет сети. Визуальные реакции FREEzzzy продолжают работать локально."; setMode("offline"); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) setMode("sleep"); else if (root.classList.contains("mode-sleep")) setMode("idle"); });
}
