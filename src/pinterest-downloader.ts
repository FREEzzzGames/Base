type PortalLang = "RU" | "DE" | "EN";
const API_BASE = (((import.meta as unknown as { env?: { VITE_TELEGRAM_AUTH_URL?: string } }).env?.VITE_TELEGRAM_AUTH_URL) || "https://freezzz-telegram-auth.onrender.com").replace(/\/$/, "");

const COPY: Record<PortalLang, Record<string, string>> = {
  RU: {
    title: "PINTEREST VIDEO DOWNLOADER", subtitle: "Сохраняй доступные видео из Pinterest",
    placeholder: "Вставь ссылку Pinterest…", action: "ПОЛУЧИТЬ ВИДЕО",
    idle: "Вставь ссылку на публичный пин Pinterest.", checking: "Получаю данные пина…",
    downloading: "Скачиваю видео…", done: "Загрузка подготовлена. Проверь папку загрузок.",
    unknown: "В этом пине не удалось обнаружить прямой видеофайл.",
    missing: "В этом пине не удалось обнаружить прямой видеофайл.",
    invalid: "Нужна ссылка Pinterest или pin.it.", failed: "Не удалось обработать ссылку. Попробуй позже.",
    save: "СОХРАНИТЬ MP4", verified: "AI-МЕТКА ОБНАРУЖЕНА", likely: "ВОЗМОЖНА AI-МЕТКА",
    foot: "Публичные пины · Доступные видеофайлы"
  },
  DE: {
    title: "PINTEREST VIDEO DOWNLOADER", subtitle: "Verfügbare Videos von Pinterest speichern",
    placeholder: "Pinterest-Link einfügen…", action: "VIDEO ABRUFEN",
    idle: "Füge einen Link zu einem öffentlichen Pinterest-Pin ein.", checking: "Pin-Daten werden abgerufen…",
    downloading: "Video wird heruntergeladen…", done: "Download vorbereitet. Prüfe deinen Download-Ordner.",
    unknown: "Für diesen Pin wurde keine direkte Videodatei gefunden.",
    missing: "Für diesen Pin wurde keine direkte Videodatei gefunden.",
    invalid: "Ein Pinterest- oder pin.it-Link ist erforderlich.", failed: "Link konnte nicht verarbeitet werden.",
    save: "MP4 SPEICHERN", verified: "AI-MARKIERUNG GEFUNDEN", likely: "MÖGLICHE AI-MARKIERUNG",
    foot: "Öffentliche Pins · Verfügbare Videodateien"
  },
  EN: {
    title: "PINTEREST VIDEO DOWNLOADER", subtitle: "Save available videos from Pinterest",
    placeholder: "Paste a Pinterest link…", action: "GET VIDEO",
    idle: "Paste a link to a public Pinterest pin.", checking: "Retrieving pin data…",
    downloading: "Downloading video…", done: "Download prepared. Check your Downloads folder.",
    unknown: "No direct video file was found for this pin.",
    missing: "No direct video file was found for this pin.",
    invalid: "A Pinterest or pin.it link is required.", failed: "Could not process this link. Try again.",
    save: "SAVE MP4", verified: "AI LABEL DETECTED", likely: "POSSIBLE AI LABEL",
    foot: "Public pins · Available video files"
  }
};

type ResolveResult = {
  classification?: "AI_VERIFIED" | "AI_LIKELY" | "UNKNOWN";
  evidence?: string;
  title?: string;
  videoUrl?: string | null;
  error?: string;
};

export function renderPinterestDownloader(lang: PortalLang): string {
  const t = COPY[lang];
  return '<section class="pinterest-tool" data-pinterest-tool>' +
    '<div class="pinterest-tool-glow" aria-hidden="true"></div>' +
    '<header class="pinterest-tool-head"><span class="pinterest-tool-kicker">FREEzzz / MEDIA TOOL</span>' +
    '<h1>' + t.title + '</h1><p>' + t.subtitle + '</p></header>' +
    '<form class="pinterest-tool-form" data-pinterest-form>' +
    '<label class="pinterest-tool-label" for="pinterest-url">PINTEREST URL</label>' +
    '<input id="pinterest-url" data-pinterest-url type="url" inputmode="url" autocomplete="url" placeholder="' + t.placeholder + '" required>' +
    '<button type="submit" data-pinterest-submit>' + t.action + '<span aria-hidden="true">↗</span></button></form>' +
    '<div class="pinterest-tool-result" data-pinterest-result aria-live="polite">' +
    '<span class="pinterest-tool-state" data-pinterest-state>READY</span>' +
    '<p data-pinterest-status>' + t.idle + '</p><small data-pinterest-evidence></small>' +
    '<button type="button" data-pinterest-save hidden>' + t.save + '</button></div>' +
    '<footer class="pinterest-tool-foot">' + t.foot + '</footer></section>';
}

export function bindPinterestDownloader(lang: PortalLang): void {
  const root = document.querySelector<HTMLElement>("[data-pinterest-tool]");
  if (!root) return;
  const t = COPY[lang];
  const form = root.querySelector<HTMLFormElement>("[data-pinterest-form]");
  const input = root.querySelector<HTMLInputElement>("[data-pinterest-url]");
  const submit = root.querySelector<HTMLButtonElement>("[data-pinterest-submit]");
  const status = root.querySelector<HTMLElement>("[data-pinterest-status]");
  const state = root.querySelector<HTMLElement>("[data-pinterest-state]");
  const evidence = root.querySelector<HTMLElement>("[data-pinterest-evidence]");
  const save = root.querySelector<HTMLButtonElement>("[data-pinterest-save]");
  if (!form || !input || !submit || !status || !state || !evidence || !save) return;

  let resolvedVideoUrl = "";
  const setStatus = (label: string, message: string, kind: "ready" | "busy" | "error" | "success") => {
    state.textContent = label;
    status.textContent = message;
    root.dataset.state = kind;
  };

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const raw = input.value.trim();
    let parsed: URL;
    try {
      parsed = new URL(raw);
      const host = parsed.hostname.toLowerCase();
      if (parsed.protocol !== "https:" || !(host === "pin.it" || host === "pinterest.com" || host.endsWith(".pinterest.com") || host === "pinterest.de" || host.endsWith(".pinterest.de"))) throw new Error("INVALID");
    } catch {
      setStatus("INVALID URL", t.invalid, "error");
      return;
    }

    const initData = window.Telegram?.WebApp?.initData || "";
    if (!initData) {
      setStatus("TELEGRAM REQUIRED", "Открой портал внутри Telegram Mini App.", "error");
      return;
    }

    submit.disabled = true;
    save.hidden = true;
    evidence.textContent = "";
    resolvedVideoUrl = "";
    setStatus("LOADING PIN", t.checking, "busy");

    try {
      const response = await fetch(API_BASE + "/api/pinterest/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Telegram-Init-Data": initData },
        body: JSON.stringify({ url: parsed.toString() }),
        credentials: "omit",
        cache: "no-store",
        signal: AbortSignal.timeout(30000)
      });
      const result = await response.json() as ResolveResult;
      if (!response.ok) throw new Error(result.error || "RESOLVE_FAILED");
      if (!result.videoUrl) {
        setStatus("VIDEO NOT FOUND", t.missing, "error");
        return;
      }

      // AI classification is informational only. It never blocks or confirms a download.
      resolvedVideoUrl = result.videoUrl;
      state.textContent = result.classification === "AI_VERIFIED" ? t.verified
        : result.classification === "AI_LIKELY" ? t.likely : "VIDEO FOUND";
      status.textContent = result.title || t.done;
      evidence.textContent = result.classification === "UNKNOWN" ? "" : (result.evidence || "");
      root.dataset.state = "success";
      save.hidden = false;
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      setStatus("ERROR", code === "INVALID_PINTEREST_URL" ? t.invalid : t.failed, "error");
    } finally {
      submit.disabled = false;
    }
  });

  save.addEventListener("click", async () => {
    if (!resolvedVideoUrl) return;
    const initData = window.Telegram?.WebApp?.initData || "";
    save.disabled = true;
    setStatus("DOWNLOADING", t.downloading, "busy");
    try {
      const response = await fetch(API_BASE + "/api/pinterest/download", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Telegram-Init-Data": initData },
        body: JSON.stringify({ videoUrl: resolvedVideoUrl }),
        credentials: "omit",
        cache: "no-store",
        signal: AbortSignal.timeout(90000)
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(result.error || "DOWNLOAD_FAILED");
      }
      const blob = await response.blob();
      if (!blob.size || !blob.type.toLowerCase().includes("video")) throw new Error("INVALID_VIDEO_RESPONSE");
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = "pinterest-video-" + Date.now() + ".mp4";
      anchor.style.display = "none";
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
      setStatus("DOWNLOAD READY", t.done, "success");
    } catch {
      setStatus("DOWNLOAD FAILED", t.failed, "error");
    } finally {
      save.disabled = false;
    }
  });
}
