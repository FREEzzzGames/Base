import "./freezzz-ai.css";

type ChatRole = "user" | "assistant";
type ChatMessage = { role: ChatRole; content: string };
declare global {
  interface ImportMetaEnv { readonly VITE_TELEGRAM_AUTH_URL?: string }
  interface ImportMeta { readonly env: ImportMetaEnv }
  interface Window {
    Telegram?: { WebApp?: { initData?: string; ready?: () => void; expand?: () => void } };
  }
}

const API_BASE = (import.meta.env.VITE_TELEGRAM_AUTH_URL || "").replace(/\/$/, "");
const STORAGE_KEY = "freezzz:ai:history:v1";
const MAX_HISTORY = 24;
const root = document.querySelector<HTMLDivElement>("#freezzz-ai-root");
if (!root) throw new Error("FREEZZ_AI_ROOT_MISSING");

let messages: ChatMessage[] = loadHistory();
let busy = false;

function loadHistory(): ChatMessage[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is ChatMessage =>
      item && (item.role === "user" || item.role === "assistant") &&
      typeof item.content === "string" && item.content.length <= 12000
    ).slice(-MAX_HISTORY);
  } catch { return []; }
}
function saveHistory() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_HISTORY))); } catch { /* storage is optional */ }
}
function renderMessage(message: ChatMessage): string {
  return '<article class="ai-message '+message.role+'"><span class="ai-message-role">'+(message.role === "user" ? "YOU" : "FREEzzz AI")+'</span><p></p></article>';
}
function render() {
  const transcript = messages.length ? messages.map(renderMessage).join("") :
    '<div class="ai-empty"><div class="ai-orb">✳</div><h2>Твой персональный AI</h2><p>Помогаю исследовать, планировать, писать и разбирать задачи внутри FREEzzz Portal.</p><div class="ai-suggestions"><button type="button" data-prompt="Помоги спланировать мои текущие проекты в FREEzzz Portal.">Разобрать проекты</button><button type="button" data-prompt="Предложи план выпуска новостного подкаста PULSE на сегодня.">Подготовить PULSE</button><button type="button" data-prompt="Объясни сложную технологическую тему простым языком.">Объяснить тему</button></div></div>';
  root!.innerHTML = `
    <section class="ai-shell">
      <header class="ai-header"><div><span class="ai-eyebrow">FREEzzz PERSONAL INTELLIGENCE</span><h1>FREEzzz <i>AI</i></h1><p>Личный интеллектуальный модуль портала</p></div><div class="ai-header-actions"><span class="ai-status" data-ai-status>ПРОВЕРКА</span><button type="button" class="ai-new-chat" data-new-chat>＋</button></div></header>
      <div class="ai-notice" data-ai-notice hidden></div>
      <section class="ai-transcript" aria-label="Диалог с AI" data-ai-transcript>${transcript}</section>
      <form class="ai-composer" data-ai-form><textarea data-ai-input rows="1" maxlength="8000" placeholder="Напиши сообщение…" aria-label="Сообщение" required></textarea><button type="submit" data-ai-send aria-label="Отправить">↗</button></form>
      <footer class="ai-footer"><span>PRIVATE SESSION · TELEGRAM AUTH</span><span>Проверяй важные решения</span></footer>
    </section>`;
  const transcriptEl = root!.querySelector<HTMLElement>("[data-ai-transcript]")!;
  const rendered = transcriptEl.querySelectorAll<HTMLElement>(".ai-message");
  messages.slice(-MAX_HISTORY).forEach((message, index) => {
    const node = rendered[index];
    const paragraph = node?.querySelector("p");
    if (paragraph) paragraph.textContent = message.content;
  });
  transcriptEl.scrollTop = transcriptEl.scrollHeight;
  root!.querySelector<HTMLFormElement>("[data-ai-form]")!.addEventListener("submit", event => {
    event.preventDefault();
    void sendMessage();
  });
  root!.querySelector<HTMLButtonElement>("[data-new-chat]")!.addEventListener("click", () => {
    messages = [];
    saveHistory();
    render();
  });
  root!.querySelectorAll<HTMLButtonElement>("[data-prompt]").forEach(button => button.addEventListener("click", () => {
    const input = root!.querySelector<HTMLTextAreaElement>("[data-ai-input]")!;
    input.value = button.dataset.prompt || "";
    input.focus();
  }));
  updateControls();
}
function updateControls() {
  const input = root!.querySelector<HTMLTextAreaElement>("[data-ai-input]");
  const button = root!.querySelector<HTMLButtonElement>("[data-ai-send]");
  if (input) input.disabled = busy;
  if (button) { button.disabled = busy; button.textContent = busy ? "…" : "↗"; }
}
function setStatus(label: string, state: "ok" | "warn" | "error" = "warn") {
  const el = root!.querySelector<HTMLElement>("[data-ai-status]");
  if (el) { el.textContent = label; el.dataset.state = state; }
}
function setNotice(message: string) {
  const el = root!.querySelector<HTMLElement>("[data-ai-notice]");
  if (!el) return;
  el.textContent = message;
  el.hidden = !message;
}
async function checkService() {
  if (!API_BASE) {
    setStatus("API НЕ НАСТРОЕН", "error");
    setNotice("Не задан VITE_TELEGRAM_AUTH_URL. Подключи адрес существующего FREEzzz backend в настройках сборки.");
    return;
  }
  try {
    const response = await fetch(API_BASE + "/health", { cache: "no-store", signal: AbortSignal.timeout(8000) });
    const data = await response.json() as { aiConfigured?: boolean };
    if (!response.ok) throw new Error("BACKEND_UNAVAILABLE");
    if (data.aiConfigured) setStatus("AI ONLINE", "ok");
    else {
      setStatus("НУЖЕН API KEY", "warn");
      setNotice("Backend доступен, но OPENAI_API_KEY ещё не добавлен в переменные окружения сервиса FREEzzz на Render.");
    }
  } catch {
    setStatus("BACKEND OFFLINE", "error");
    setNotice("Не удалось связаться с FREEzzz backend. Проверь адрес сервиса и его состояние.");
  }
}
async function sendMessage() {
  if (busy) return;
  const input = root!.querySelector<HTMLTextAreaElement>("[data-ai-input]")!;
  const text = input.value.trim();
  if (!text) return;
  const initData = window.Telegram?.WebApp?.initData || "";
  if (!initData) {
    setNotice("Для личного доступа открой FREEzzz Portal внутри Telegram Mini App.");
    setStatus("НЕТ TELEGRAM SESSION", "error");
    return;
  }
  if (!API_BASE) {
    setNotice("API backend не настроен. Сообщение не отправлено.");
    return;
  }
  messages.push({ role: "user", content: text });
  saveHistory();
  busy = true;
  setNotice("");
  render();
  setStatus("ОБРАБОТКА", "warn");
  try {
    const response = await fetch(API_BASE + "/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Telegram-Init-Data": initData },
      body: JSON.stringify({ messages: messages.slice(-12) }),
      credentials: "omit",
      cache: "no-store",
      signal: AbortSignal.timeout(70000)
    });
    const data = await response.json() as { message?: string; error?: string; model?: string };
    if (!response.ok) {
      const errors: Record<string, string> = {
        AI_NOT_CONFIGURED: "На сервере не задан OPENAI_API_KEY.",
        TELEGRAM_AUTH_REQUIRED: "Не удалось подтвердить Telegram-сессию. Перезапусти Mini App.",
        RATE_LIMITED: "Слишком много запросов. Подожди минуту.",
        OPENAI_UPSTREAM_ERROR: "AI-провайдер временно не ответил. Повтори запрос позже."
      };
      throw new Error(errors[data.error || ""] || data.error || "AI_REQUEST_FAILED");
    }
    if (!data.message) throw new Error("AI_EMPTY_RESPONSE");
    messages.push({ role: "assistant", content: data.message });
    messages = messages.slice(-MAX_HISTORY);
    saveHistory();
    setStatus("AI ONLINE", "ok");
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI_REQUEST_FAILED";
    setNotice(message);
    setStatus("ОШИБКА", "error");
  } finally {
    busy = false;
    render();
  }
}

window.Telegram?.WebApp?.ready?.();
window.Telegram?.WebApp?.expand?.();
render();
void checkService();