import "./freezzz-ai.css";

type ChatRole = "user" | "assistant";
type ChatMessage = { role: ChatRole; content: string };
type PortalContext = { activeModule: string; language: "RU" | "DE" | "EN"; modules: string[]; build: string };
type AgentEvent = { agent: string; status: string; content: string; createdAt?: string; created_at?: string };
type AgentTask = { id: string; status: string; stage: string; prompt: string; createdAt?: string; updatedAt?: string; result?: { summary?: string; agents?: Record<string, string>; execution?: { filesChanged?: boolean; testsExecuted?: boolean; commitCreated?: boolean } } | null; error?: string | null; events?: AgentEvent[] };
type AgentStatus = { storageConfigured?: boolean; modelConfigured?: boolean; model?: string; auditorModel?: string; mode?: string; writesEnabled?: boolean; roles?: Array<{ key: string; title: string }>; tasks?: AgentTask[] };
const AGENT_ROLE_LABELS: Record<string, string> = { coordinator: "Координатор", researcher: "Исследователь", developer: "Разработчик", tester: "Тестировщик", auditor: "Независимый аудитор", system: "Система" };
const DEFAULT_AGENT_ROLES = ["coordinator", "researcher", "developer", "tester", "auditor"];
declare global {
  interface Window {
    Telegram?: { WebApp?: { initData?: string; ready?: () => void; expand?: () => void } };
  }
}

const API_BASE = (((import.meta as unknown as { env?: { VITE_TELEGRAM_AUTH_URL?: string } }).env?.VITE_TELEGRAM_AUTH_URL) || "https://freezzz-telegram-auth.onrender.com").replace(/\/$/, "");
const STORAGE_KEY = "freezzz:ai:history:v1";
const MAX_HISTORY = 24;
const root = document.querySelector<HTMLDivElement>("#freezzz-ai-root");
if (!root) throw new Error("FREEZZ_AI_ROOT_MISSING");

let messages: ChatMessage[] = loadHistory();
let busy = false;
let statusLabel = "ПРОВЕРКА";
let statusState: "ok" | "warn" | "error" = "warn";
let noticeMessage = "";
let portalContext: PortalContext | null = null;
let agentPanelOpen = false;
let agentMonitorMode = false;
let agentTasks: AgentTask[] = [];
let agentPollTimer: number | null = null;
let agentConnected = false;
let agentLastUpdated: number | null = null;

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
    '<div class="ai-empty"><div class="ai-orb">✳</div><h2>Твой персональный AI</h2><p>Пиши сюда, что нужно сделать. Для многоэтапных задач по проектам я при необходимости подключу команду агентов.</p><div class="ai-suggestions"><button type="button" data-prompt="Проанализируй проект FREEzzz Base и предложи приоритетные следующие шаги.">Проанализировать проект</button><button type="button" data-prompt="Подготовь пошаговый план реализации новой функции в FREEzzz Base.">Составить план разработки</button><button type="button" data-prompt="Что сейчас делают агенты и какие задачи завершены?">Узнать статус агентов</button></div></div>';
  root!.innerHTML = `
    <section class="ai-shell${agentMonitorMode ? " agent-monitor-mode" : ""}">
      <header class="ai-header"><div><span class="ai-eyebrow">FREEzzz PERSONAL INTELLIGENCE</span><h1>FREEzzz <i>AI</i></h1><p>Пиши задачу в чат — AI подключит агентов при необходимости.</p></div><div class="ai-header-actions"><span class="ai-status" data-ai-status data-state="${statusState}">${statusLabel}</span><button type="button" class="ai-agent-toggle" data-agent-toggle aria-label="Открыть меню агентов" aria-expanded="${agentPanelOpen}">АГЕНТЫ</button></div></header>
      <section class="ai-agent-panel" data-agent-panel hidden>
        <div class="ai-agent-panel-head"><div><span>FREEzzz STUDIO / LIVE OPERATIONS</span><h1>АГЕНТЫ</h1><p>Ставь задачи сообщением в AI-чате. Здесь — ход их работы.</p></div><button type="button" data-agent-close aria-label="Вернуться в чат">← <span>В ЧАТ</span></button></div>
        <div class="ai-agent-topline"><p data-agent-status data-state="warn">Проверка облачной инфраструктуры…</p><small data-agent-config></small><span data-agent-updated>ОБНОВЛЕНИЕ: —</span></div>
        <div class="ai-agent-workspace">
          <main class="ai-agent-main">
            <div class="ai-agent-kpis" data-agent-kpis></div>
            <div class="ai-agent-roster" data-agent-roster></div>
            <section class="ai-agent-task-zone"><div class="ai-agent-list-head"><div><b>ЗАДАЧИ И СОБЫТИЯ</b><small data-agent-task-count>Ожидание данных</small></div></div><div data-agent-list class="ai-agent-list"><p class="ai-agent-empty">Подключаюсь к агентам…</p></div></section>
            <small class="ai-agent-disclaimer">Рабочие запросы отправляй AI сообщением в чате. Команда агентов анализирует задачи и возвращает предложения; она не меняет файлы, не запускает тесты и не развёртывает изменения.</small>
          </main>
        </div>
      </section>
      <div class="ai-notice" data-ai-notice${noticeMessage ? "" : " hidden"}>${noticeMessage}</div>
      <section class="ai-transcript" aria-label="Диалог с AI" data-ai-transcript>${transcript}</section>
      <form class="ai-composer" data-ai-form><textarea data-ai-input rows="1" maxlength="8000" placeholder="Напиши задачу или задай вопрос AI…" aria-label="Сообщение" required></textarea><button type="submit" data-ai-send aria-label="Отправить">↗</button></form>
      <footer class="ai-footer"><span>OWNER-ONLY · CHAT: OPENAI · AGENTS: CLOUDFLARE</span><span>Диалог локально · задачи в облаке</span></footer>
    </section>`;
  root!.querySelector<HTMLElement>(".ai-shell")?.classList.toggle("agent-monitor-mode", agentMonitorMode);
  const agentPanel = root!.querySelector<HTMLElement>("[data-agent-panel]");
  if (agentPanel) agentPanel.hidden = !agentPanelOpen;
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
  root!.querySelector<HTMLButtonElement>("[data-agent-toggle]")!.addEventListener("click", () => { void toggleAgentPanel(); });
  root!.querySelector<HTMLButtonElement>("[data-agent-close]")!.addEventListener("click", closeAgentPanel);
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
  statusLabel = label;
  statusState = state;
  const el = root!.querySelector<HTMLElement>("[data-ai-status]");
  if (el) { el.textContent = statusLabel; el.dataset.state = statusState; }
}
function setNotice(message: string) {
  noticeMessage = message;
  const el = root!.querySelector<HTMLElement>("[data-ai-notice]");
  if (!el) return;
  el.textContent = noticeMessage;
  el.hidden = !noticeMessage;
}
async function checkService() {
  if (!API_BASE) {
    setStatus("API НЕ НАСТРОЕН", "error");
    setNotice("Не задан VITE_TELEGRAM_AUTH_URL. Подключи адрес существующего FREEzzz backend в настройках сборки.");
    return;
  }
  try {
    const response = await fetch(API_BASE + "/health", { cache: "no-store", signal: AbortSignal.timeout(8000) });
    const data = await response.json() as { aiConfigured?: boolean; aiApiKeyConfigured?: boolean; aiUserConfigured?: boolean };
    if (!response.ok) throw new Error("BACKEND_UNAVAILABLE");
    if (data.aiConfigured) {
      if (!busy) { setStatus("AI ONLINE", "ok"); setNotice(""); }
    } else if (!busy) {
      setStatus("НУЖЕН API KEY", "warn");
      setNotice("Backend доступен. Для включения личного AI добавь в Render переменные OPENAI_API_KEY и AI_ALLOWED_TELEGRAM_USER_ID (твой числовой Telegram ID).");
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
      body: JSON.stringify({ messages: messages.slice(-12), ...(portalContext ? { portalContext } : {}) }),
      credentials: "omit",
      cache: "no-store",
      signal: AbortSignal.timeout(150000)
    });
    const data = await response.json() as { message?: string; error?: string; model?: string; agentActions?: Array<{ kind?: string; taskId?: string; status?: string }> };
    if (!response.ok) {
      const errors: Record<string, string> = {
        AI_NOT_CONFIGURED: "На сервере не задан OPENAI_API_KEY.",
        AI_ACCESS_NOT_CONFIGURED: "В Render не задан AI_ALLOWED_TELEGRAM_USER_ID.",
        AI_ACCESS_DENIED: "Этот AI-модуль доступен только владельцу портала.",
        TELEGRAM_AUTH_REQUIRED: "Не удалось подтвердить Telegram-сессию. Перезапусти Mini App.",
        RATE_LIMITED: "Слишком много запросов. Подожди минуту.",
        OPENAI_UPSTREAM_ERROR: "AI-провайдер временно не ответил. Повтори запрос позже.",
        GITHUB_NOT_CONFIGURED: "GitHub не настроен на сервере.",
        GITHUB_API_ERROR: "GitHub API отклонил запрос. Проверь права токена.",
        GITHUB_RESOURCE_NOT_FOUND: "Один из файлов репозитория не найден.",
        REPO_CONTEXT_EMPTY: "Не удалось прочитать файлы репозитория."
      };
      throw new Error(errors[data.error || ""] || data.error || "AI_REQUEST_FAILED");
    }
    if (!data.message) throw new Error("AI_EMPTY_RESPONSE");
    const queuedTask = data.agentActions?.find(action => action.kind === "task_queued");
    const responseText = queuedTask
      ? data.message + "\n\n✅ Задача передана команде агентов. ID: " + (queuedTask.taskId || "получен") + ". Ход работы можно посмотреть в меню «АГЕНТЫ»."
      : data.message;
    messages.push({ role: "assistant", content: responseText });
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


function agentErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    AGENT_CLOUD_NOT_CONFIGURED: "Облачный Worker ещё не подключён. Настрой AGENT_CLOUD_URL и AGENT_BRIDGE_SECRET в Render.",
    AGENT_CLOUD_UPSTREAM_ERROR: "Облачный сервис временно недоступен. Проверь развёртывание Cloudflare Worker.",
    UNAUTHORIZED: "Секрет связи Render ↔ Cloudflare не совпадает.",
    WORKFLOW_CREATE_FAILED: "Cloudflare не смог создать Workflow. Проверь привязку Workflows.",
    INVALID_TASK: "Проверь текст задачи: максимум 6000 символов.",
    AGENT_MODEL_EMPTY_RESPONSE: "Модель вернула пустой ответ.",
    AGENT_MODEL_UPSTREAM_ERROR: "Workers AI не ответил. Возможно, исчерпан бесплатный дневной лимит.",
    TASK_NOT_FOUND: "Задача не найдена или срок хранения завершился."
  };
  return messages[code] || code;
}
function escapeAgentText(value: unknown): string {
  const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(value ?? "").replace(/[&<>"']/g, char => entities[char] || char);
}
function agentHeaders(json = false): HeadersInit {
  const headers: Record<string, string> = { "X-Telegram-Init-Data": window.Telegram?.WebApp?.initData || "" };
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}
async function toggleAgentPanel() {
  const panel = root!.querySelector<HTMLElement>("[data-agent-panel]");
  if (!panel) return;
  agentMonitorMode = !agentMonitorMode;
  agentPanelOpen = agentMonitorMode;
  root!.querySelector<HTMLButtonElement>("[data-agent-toggle]")?.setAttribute("aria-expanded", String(agentPanelOpen));
  root!.querySelector<HTMLElement>(".ai-shell")?.classList.toggle("agent-monitor-mode", agentMonitorMode);
  panel.hidden = !agentPanelOpen;
  if (agentPanelOpen) {
    await refreshAgentPanel(true);
    if (agentPollTimer === null) agentPollTimer = window.setInterval(() => {
      if (agentPanelOpen) void refreshAgentPanel(false);
    }, 5000);
  } else closeAgentPanel();
}
function closeAgentPanel() {
  agentPanelOpen = false;
  agentMonitorMode = false;
  root!.querySelector<HTMLButtonElement>("[data-agent-toggle]")?.setAttribute("aria-expanded", "false");
  const panel = root!.querySelector<HTMLElement>("[data-agent-panel]");
  if (panel) panel.hidden = true;
  root!.querySelector<HTMLElement>(".ai-shell")?.classList.remove("agent-monitor-mode");
  if (agentPollTimer !== null) window.clearInterval(agentPollTimer);
  agentPollTimer = null;
}
function formatAgentTime(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(date);
}
function agentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    queued: "В ОЧЕРЕДИ", running: "РАБОТАЕТ", started: "НАЧАЛ РАБОТУ",
    completed: "ЗАВЕРШИЛ", failed: "ОШИБКА", waiting: "ОЖИДАЕТ"
  };
  return labels[status] || status.toUpperCase();
}
function renderAgentKpis() {
  const target = root!.querySelector<HTMLElement>("[data-agent-kpis]");
  if (!target) return;
  const active = agentTasks.filter(task => task.status === "running").length;
  const queued = agentTasks.filter(task => task.status === "queued").length;
  const completed = agentTasks.filter(task => task.status === "completed").length;
  const failed = agentTasks.filter(task => task.status === "failed").length;
  const values: Array<[string, number, string]> = [
    ["В РАБОТЕ", active, "active"], ["В ОЧЕРЕДИ", queued, "queued"],
    ["ЗАВЕРШЕНО", completed, "completed"], ["С ОШИБКОЙ", failed, "failed"]
  ];
  target.innerHTML = values.map(([label, value, state]) =>
    '<article class="ai-agent-kpi" data-state="' + state + '"><span>' + label + '</span><b>' + value + '</b></article>'
  ).join("");
}
function renderAgentRoster() {
  const target = root!.querySelector<HTMLElement>("[data-agent-roster]");
  if (!target) return;
  target.innerHTML = DEFAULT_AGENT_ROLES.map(key => {
    const activeTask = agentTasks.find(task => task.status === "running" && task.stage === key);
    const queuedTask = agentTasks.find(task => task.status === "queued");
    const previousTask = agentTasks.find(task => (task.events || []).some(event => event.agent === key));
    const task = activeTask || queuedTask || previousTask;
    const event = [...(task?.events || [])].reverse().find(item => item.agent === key);
    const state = activeTask ? (event?.status === "completed" ? "completed" : "running")
      : queuedTask ? "waiting" : event?.status || "waiting";
    const activity = activeTask
      ? (event?.content || "Обрабатывает этап задачи.")
      : queuedTask ? "Ожидает задачу из очереди."
        : event?.content || "Нет данных о работе агента.";
    const taskLabel = task ? task.prompt : "Нет связанной задачи";
    return '<article class="ai-agent-role" data-state="' + escapeAgentText(state) + '"><div class="ai-agent-role-top"><span>' +
      escapeAgentText(key.toUpperCase()) + '</span><i></i></div><h2>' + escapeAgentText(AGENT_ROLE_LABELS[key]) + '</h2><b class="ai-agent-role-status">' +
      escapeAgentText(agentStatusLabel(state)) + '</b><p>' + escapeAgentText(activity.slice(0, 180)) + '</p><small>' +
      escapeAgentText(taskLabel.slice(0, 120)) + '</small></article>';
  }).join("");
}
function renderAgentTasks() {
  const list = root!.querySelector<HTMLElement>("[data-agent-list]");
  const count = root!.querySelector<HTMLElement>("[data-agent-task-count]");
  if (!list) return;
  if (count) count.textContent = agentTasks.length + " задач · " + (agentConnected ? "автообновление 5 с" : "нет актуальной связи");
  if (!agentTasks.length) {
    const title = agentConnected ? "Задач пока нет" : "Нет данных от Worker";
    const detail = agentConnected ? "Попроси FREEzzz AI выполнить проектную задачу в чате — если потребуется, он подключит команду." : "Проверь подключение Cloudflare Agent System. Задачи запускаются сообщением в FREEzzz AI.";
    list.innerHTML = '<div class="ai-agent-empty"><b>' + title + '</b><span>' + detail + '</span></div>';
    return;
  }
  const orderedTasks = [...agentTasks].sort((a, b) => {
    const activeA = a.status === "running" || a.status === "queued" ? 1 : 0;
    const activeB = b.status === "running" || b.status === "queued" ? 1 : 0;
    if (activeA !== activeB) return activeB - activeA;
    return Date.parse(b.updatedAt || b.createdAt || "") - Date.parse(a.updatedAt || a.createdAt || "");
  });
  list.innerHTML = orderedTasks.slice(0, 30).map(task => {
    const summary = task.result?.summary || task.error || [...(task.events || [])].reverse()[0]?.content || "Ожидание события.";
    const events = task.events || [];
    const agents = DEFAULT_AGENT_ROLES.map(key => {
      const event = [...events].reverse().find(item => item.agent === key);
      const state = event?.status || (task.stage === key ? "running" : "waiting");
      return '<span class="ai-agent-chip" data-state="' + escapeAgentText(state) + '"><i></i>' + escapeAgentText(AGENT_ROLE_LABELS[key]) + '</span>';
    }).join("");
    const outputs = events.filter(item => item.status === "completed" && item.agent !== "system").slice(-5).map(item =>
      '<details class="ai-agent-output"><summary>' + escapeAgentText(AGENT_ROLE_LABELS[item.agent] || item.agent.toUpperCase()) + '</summary><pre>' +
      escapeAgentText(item.content.slice(0, 5000)) + '</pre></details>'
    ).join("");
    const timeline = events.slice(-12).map(event => {
      const time = formatAgentTime(event.createdAt || event.created_at);
      return '<li data-state="' + escapeAgentText(event.status) + '"><i></i><div><b>' +
        escapeAgentText(AGENT_ROLE_LABELS[event.agent] || event.agent.toUpperCase()) + ' · ' + escapeAgentText(agentStatusLabel(event.status)) +
        '</b><p>' + escapeAgentText(event.content.slice(0, 360)) + '</p></div><time>' + escapeAgentText(time) + '</time></li>';
    }).join("");
    return '<article class="ai-agent-task" data-state="' + escapeAgentText(task.status) + '" data-task-id="' + escapeAgentText(task.id) + '"><div class="ai-agent-task-head"><div><b>' +
      escapeAgentText(agentStatusLabel(task.status)) + '</b><small>ЭТАП · ' + escapeAgentText(AGENT_ROLE_LABELS[task.stage] || task.stage) + '</small></div><time>' +
      escapeAgentText(formatAgentTime(task.updatedAt || task.createdAt)) + '</time></div><p class="ai-agent-task-prompt">' +
      escapeAgentText(task.prompt) + '</p><div class="ai-agent-chips">' + agents + '</div><div class="ai-agent-summary">' +
      escapeAgentText(summary) + '</div><details class="ai-agent-timeline"><summary>ЖУРНАЛ · ' + events.length + ' СОБЫТИЙ</summary><ol>' + timeline +
      '</ol></details>' + outputs + '</article>';
  }).join("");
}
function renderAgentDashboard() {
  const panel = root!.querySelector<HTMLElement>("[data-agent-panel]");
  panel?.classList.toggle("agent-stale", !agentConnected);
  renderAgentKpis();
  renderAgentRoster();
  renderAgentTasks();
}
async function refreshAgentPanel(showErrors: boolean) {
  const status = root!.querySelector<HTMLElement>("[data-agent-status]");
  const config = root!.querySelector<HTMLElement>("[data-agent-config]");
  const updated = root!.querySelector<HTMLElement>("[data-agent-updated]");
  if (!status || !config) return;
  const initData = window.Telegram?.WebApp?.initData || "";
  if (!initData) {
    agentConnected = false;
    status.dataset.state = "error";
    status.textContent = "ТРЕБУЕТСЯ TELEGRAM MINI APP";
    config.textContent = "Статус и история задач доступны владельцу через авторизованный Telegram-сеанс.";
    renderAgentDashboard();
    return;
  }
  try {
    const response = await fetch(API_BASE + "/api/agents/status", {
      headers: agentHeaders(), credentials: "omit", cache: "no-store", signal: AbortSignal.timeout(12000)
    });
    const data = await response.json() as AgentStatus & { error?: string };
    if (!response.ok) throw new Error(data.error || "AGENT_STATUS_FAILED");
    agentConnected = true;
    agentLastUpdated = Date.now();
    agentTasks = data.tasks || [];
    const activeCount = agentTasks.filter(task => task.status === "running").length;
    const queuedCount = agentTasks.filter(task => task.status === "queued").length;
    const ready = data.storageConfigured && data.modelConfigured;
    status.dataset.state = ready ? "ok" : "warn";
    status.textContent = ready
      ? "СИСТЕМА ОНЛАЙН · " + activeCount + " РАБОТАЮТ · " + queuedCount + " В ОЧЕРЕДИ"
      : "ТРЕБУЕТСЯ НАСТРОЙКА ОБЛАКА";
    config.textContent = "KV: " + (data.storageConfigured ? "OK" : "NOT CONFIGURED") +
      " · MODEL: " + (data.modelConfigured ? data.model || "OK" : "NOT CONFIGURED") +
      " · АУДИТ: " + (data.auditorModel || "Gemma 4") + " · CLOUD ONLY · WRITE: DISABLED";
    if (updated) updated.textContent = "ОБНОВЛЕНО " + new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(agentLastUpdated);
  } catch (error) {
    agentConnected = false;
    status.dataset.state = "error";
    status.textContent = agentLastUpdated ? "СВЯЗЬ ПОТЕРЯНА · ПОКАЗАНЫ ПОСЛЕДНИЕ ДАННЫЕ"
      : agentErrorMessage(error instanceof Error ? error.message : "AGENT_STATUS_FAILED");
    config.textContent = agentLastUpdated ? "Последнее успешное обновление: " + new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(agentLastUpdated)
      : "Состояние агентов не подтверждено. Новые события не отображаются.";
    if (updated && agentLastUpdated) updated.textContent = "ПОСЛЕДНЯЯ СВЯЗЬ " + new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(agentLastUpdated);
    if (showErrors) console.warn("Agent monitor refresh failed", error instanceof Error ? error.message : "AGENT_STATUS_FAILED");
  }
  renderAgentDashboard();
}
window.addEventListener("message", event => {
  if (event.origin !== window.location.origin || event.data?.type !== "FREEZZ_AI_CONTEXT") return;
  const value = event.data.payload as Partial<PortalContext> | undefined;
  if (!value || typeof value.activeModule !== "string" ||
      !["RU", "DE", "EN"].includes(String(value.language)) ||
      !Array.isArray(value.modules) || value.modules.length > 12 ||
      !value.modules.every(item => typeof item === "string" && item.length <= 16) ||
      typeof value.build !== "string" || value.build.length > 80) return;
  portalContext = {
    activeModule: value.activeModule.slice(0, 16),
    language: value.language as PortalContext["language"],
    modules: value.modules.slice(),
    build: value.build
  };
});
window.parent.postMessage({ type: "FREEZZ_AI_READY" }, window.location.origin);

window.Telegram?.WebApp?.ready?.();
window.Telegram?.WebApp?.expand?.();
render();
void checkService();
