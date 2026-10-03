type PerformanceTarget = "web" | "tv";

const target: PerformanceTarget = (() => {
  const ua = navigator.userAgent.toLowerCase();
  const tvUa = /smart-tv|smarttv|hbbtv|tizen|webos|netcast|googletv|appletv/.test(ua);
  return tvUa || (window.innerWidth >= 1600 && !("ontouchstart" in window)) ? "tv" : "web";
})();

const root = document.documentElement;
root.dataset.performanceTarget = target;

const mediaQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
const reducedMotion = mediaQuery?.matches ?? false;

function isVisible(el: Element): boolean {
  const r = el.getBoundingClientRect();
  return r.bottom > 0 && r.right > 0 && r.top < window.innerHeight && r.left < window.innerWidth;
}

function tuneVideo(video: HTMLVideoElement) {
  video.playsInline = true;
  video.muted = true;
  if (video.dataset.persistentVideo) {
    video.preload = target === "tv" ? "metadata" : "auto";
  } else {
    video.preload = "metadata";
  }
}

function tuneIframe(frame: HTMLIFrameElement) {
  frame.loading = "lazy";
  frame.referrerPolicy = "strict-origin-when-cross-origin";
}

function tuneImages(img: HTMLImageElement) {
  if (!img.hasAttribute("decoding")) img.decoding = "async";
  if (!img.hasAttribute("loading")) img.loading = "lazy";
}

function tuneDocument() {
  document.querySelectorAll<HTMLVideoElement>("video").forEach(tuneVideo);
  document.querySelectorAll<HTMLIFrameElement>("iframe").forEach(tuneIframe);
  document.querySelectorAll<HTMLImageElement>("img").forEach(tuneImages);
}

let raf = 0;
function scheduleTune() {
  if (raf) return;
  raf = requestAnimationFrame(() => {
    raf = 0;
    tuneDocument();
  });
}

const observer = new MutationObserver(scheduleTune);
observer.observe(document.body, { childList: true, subtree: true });

const visibilityObserver = new IntersectionObserver(entries => {
  for (const entry of entries) {
    const video = entry.target instanceof HTMLVideoElement ? entry.target : null;
    if (!video) continue;
    if (entry.isIntersecting && !document.hidden) {
      tuneVideo(video);
      if (video.dataset.autoplayManaged === "true" && video.paused) {
        void video.play().catch(() => {});
      }
    } else if (!video.dataset.persistentVideo) {
      video.pause();
    }
  }
}, { rootMargin: "120px" });

function observeMedia() {
  document.querySelectorAll<HTMLVideoElement>("video").forEach(video => {
    if (video.dataset.performanceObserved === "true") return;
    video.dataset.performanceObserved = "true";
    video.dataset.autoplayManaged = video.autoplay ? "true" : "false";
    visibilityObserver.observe(video);
  });
}

const lifecycleObserver = new MutationObserver(() => {
  scheduleTune();
  observeMedia();
});
lifecycleObserver.observe(document.body, { childList: true, subtree: true });

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    document.querySelectorAll<HTMLVideoElement>("video").forEach(video => {
      if (!video.dataset.persistentVideo) video.pause();
    });
  } else {
    document.querySelectorAll<HTMLVideoElement>("video").forEach(video => {
      if (video.dataset.autoplayManaged === "true" && isVisible(video)) {
        void video.play().catch(() => {});
      }
    });
  }
});

function focusableElements(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(
    "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"
  )].filter(el => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
  });
}

function spatialFocus(current: HTMLElement, dx: number, dy: number) {
  const currentRect = current.getBoundingClientRect();
  const cx = currentRect.left + currentRect.width / 2;
  const cy = currentRect.top + currentRect.height / 2;
  let best: HTMLElement | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const candidate of focusableElements()) {
    if (candidate === current) continue;
    const r = candidate.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const vx = x - cx;
    const vy = y - cy;
    if ((dx !== 0 && Math.sign(vx) !== dx) || (dy !== 0 && Math.sign(vy) !== dy)) continue;
    const primary = dx !== 0 ? Math.abs(vx) : Math.abs(vy);
    const secondary = dx !== 0 ? Math.abs(vy) : Math.abs(vx);
    const score = primary + secondary * 1.8;
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  best?.focus({ preventScroll: true });
}

document.addEventListener("keydown", event => {
  if (target !== "tv") return;
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return;
  if (active.matches("input, textarea, select")) return;
  const dx = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
  const dy = event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
  spatialFocus(active, dx, dy);
  event.preventDefault();
}, { passive: false });

if (reducedMotion) root.dataset.reducedMotion = "true";

scheduleTune();
observeMedia();

export function initPerformanceLayer() {
  scheduleTune();
  observeMedia();
}
