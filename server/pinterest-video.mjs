const PAGE_HOSTS = new Set(["pinterest.com", "www.pinterest.com", "pin.it", "pinterest.de", "www.pinterest.de"]);
const VIDEO_HOST = "v1.pinimg.com";
const USER_AGENT = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const MP4_PATTERN = /https:\/\/v1\.pinimg\.com\/videos\/[^\s"'<>\\]+?\.mp4(?:\?[^\s"'<>\\]*)?/i;

function isPinterestHost(host) {
  return PAGE_HOSTS.has(host.toLowerCase()) || host.toLowerCase().endsWith(".pinterest.com") || host.toLowerCase().endsWith(".pinterest.de");
}

export function validatePinterestPageUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error("INVALID_PINTEREST_URL"); }
  if (url.protocol !== "https:" || !isPinterestHost(url.hostname)) throw new Error("INVALID_PINTEREST_URL");
  return url;
}

export function validatePinimgVideoUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error("INVALID_VIDEO_URL"); }
  if (url.protocol !== "https:" || url.hostname !== VIDEO_HOST || !url.pathname.startsWith("/videos/") || !url.pathname.toLowerCase().endsWith(".mp4")) {
    throw new Error("INVALID_VIDEO_URL");
  }
  return url;
}

function decodeHtml(value) {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function readMeta(html) {
  const values = [];
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    const key = tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1] || "";
    const content = tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i)?.[1] || "";
    if (/^(og:title|og:description|description|twitter:title|twitter:description|og:video|og:video:url)$/i.test(key) && content) {
      values.push(decodeHtml(content));
    }
  }
  for (const match of html.matchAll(/"(?:description|title|alt_text|accessibility_label|generated_by|tool_name)"\s*:\s*"((?:\\.|[^"\\])*)"/gi)) {
    try { values.push(JSON.parse('"' + match[1] + '"')); } catch { values.push(match[1].replace(/\\n/g, " ")); }
  }
  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "";
  if (title) values.push(decodeHtml(title.replace(/<[^>]*>/g, " ")));
  return values.join(" ").replace(/\s+/g, " ").trim();
}

function decodeEmbeddedString(value) {
  let result = value;
  for (let i = 0; i < 3; i++) {
    const previous = result;
    result = result
      .replace(/\\u002[fF]/g, "/")
      .replace(/\\u003[aA]/g, ":")
      .replace(/\\u0026/g, "&")
      .replace(/\\\//g, "/")
      .replace(/&amp;/g, "&");
    try {
      if (/^https?%3a%2f%2f/i.test(result)) result = decodeURIComponent(result);
    } catch { /* Keep the original candidate if it is not valid URI encoding. */ }
    if (result === previous) break;
  }
  return result;
}

function collectJsonStrings(value, output, depth = 0) {
  if (depth > 40 || value == null) return;
  if (typeof value === "string") {
    output.push(decodeEmbeddedString(value));
    // Pinterest sometimes embeds a JSON object as a string inside another JSON object.
    const trimmed = value.trim();
    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      try { collectJsonStrings(JSON.parse(trimmed), output, depth + 1); } catch { /* Not a standalone JSON value. */ }
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectJsonStrings(item, output, depth + 1);
    return;
  }
  if (typeof value === "object") {
    for (const item of Object.values(value)) collectJsonStrings(item, output, depth + 1);
  }
}

function parsePinterestJson(html) {
  const strings = [];
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    const body = match[1].trim();
    if (!body) continue;
    const candidates = [body];
    const firstBrace = body.indexOf("{");
    const lastBrace = body.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) candidates.push(body.slice(firstBrace, lastBrace + 1));
    const firstBracket = body.indexOf("[");
    const lastBracket = body.lastIndexOf("]");
    if (firstBracket >= 0 && lastBracket > firstBracket) candidates.push(body.slice(firstBracket, lastBracket + 1));
    for (const candidate of candidates) {
      try {
        collectJsonStrings(JSON.parse(candidate), strings);
        break;
      } catch { /* Script may be executable JS rather than a JSON document. */ }
    }
  }
  return strings;
}

function normalizeVideoCandidate(value) {
  const decoded = decodeEmbeddedString(value);
  const match = decoded.match(MP4_PATTERN);
  if (!match) return null;
  try {
    const url = validatePinimgVideoUrl(match[0]);
    return url.href;
  } catch {
    return null;
  }
}

export function extractPinterestVideoUrl(html) {
  // Pinterest's pin payload stores video variants in nested JSON, commonly
  // pin.videos.video_list[*].url. Search parsed JSON values first, not only HTML text.
  const candidates = parsePinterestJson(html);
  candidates.push(decodeEmbeddedString(html));
  for (const candidate of candidates) {
    const videoUrl = normalizeVideoCandidate(candidate);
    if (videoUrl) return videoUrl;
  }
  return null;
}

export function classifyPinterestAiText(text) {
  const normalized = text.toLowerCase();
  const verified = /\b(?:ai[\s-]?generated|made with ai|created with ai|generated by ai|synthetic media)\b|создано\s+ии|сгенерировано\s+ии|искусственн\w+\s+интеллект\w*\s+сгенерир/i.test(normalized);
  if (verified) return { classification: "AI_VERIFIED", evidence: "Явная маркировка AI-генерации в доступных метаданных." };

  const tool = /\b(sora|veo(?:\s*[23])?|runway(?:\s*ml)?|kling(?:\s*ai)?|pika(?:\s*labs)?|luma\s*dream\s*machine|stable\s*diffusion|haiper|pixverse|hailuo|minimax)\b/i.test(normalized);
  const aiPhrase = /\b(?:ai\s+(?:video|animation|art|generated|made)|generated\s+with\s+ai)\b|ai[- ]?генерац\w*|ии[- ]?видео|нейросетев\w+\s+видео/i.test(normalized);
  if (aiPhrase || (tool && /\b(generated|created|made|video|animation|prompt|генерац|создан|видео)\b/i.test(normalized))) {
    return { classification: "AI_LIKELY", evidence: "В описании обнаружены признаки AI-генерации или название AI-инструмента." };
  }
  return { classification: "UNKNOWN", evidence: "Доступные метаданные не подтверждают AI-происхождение." };
}

async function fetchPinterestPage(startUrl) {
  let current = new URL(startUrl);
  for (let hop = 0; hop <= 5; hop++) {
    const response = await fetch(current, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9"
      },
      redirect: "manual",
      signal: AbortSignal.timeout(20000)
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("PINTEREST_REDIRECT_INVALID");
      const next = new URL(location, current);
      if (next.protocol !== "https:" || !isPinterestHost(next.hostname)) throw new Error("PINTEREST_REDIRECT_REJECTED");
      current = next;
      continue;
    }
    return response;
  }
  throw new Error("PINTEREST_REDIRECT_LIMIT");
}

async function fetchPinimgVideo(startUrl) {
  let current = new URL(startUrl);
  for (let hop = 0; hop <= 3; hop++) {
    const response = await fetch(current, {
      headers: { "User-Agent": USER_AGENT, "Referer": "https://www.pinterest.com/" },
      redirect: "manual",
      signal: AbortSignal.timeout(60000)
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("VIDEO_REDIRECT_INVALID");
      const next = new URL(location, current);
      if (next.protocol !== "https:" || next.hostname !== VIDEO_HOST || !next.pathname.startsWith("/videos/") || !next.pathname.toLowerCase().endsWith(".mp4")) {
        throw new Error("VIDEO_REDIRECT_REJECTED");
      }
      current = next;
      continue;
    }
    return response;
  }
  throw new Error("VIDEO_REDIRECT_LIMIT");
}

export async function resolvePinterestVideo(value) {
  const pageUrl = validatePinterestPageUrl(value);
  const response = await fetchPinterestPage(pageUrl);
  if (!response.ok) throw new Error(response.status === 429 ? "PINTEREST_RATE_LIMITED" : "PINTEREST_PAGE_UNAVAILABLE");

  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > 12_000_000) throw new Error("PINTEREST_PAGE_INVALID");
  const html = await response.text();
  if (!html || html.length > 12_000_000) throw new Error("PINTEREST_PAGE_INVALID");

  const metadata = readMeta(html);
  const ai = classifyPinterestAiText(metadata);
  // AI classification is informational only; it must never gate video extraction.
  const videoUrl = extractPinterestVideoUrl(html);
  return {
    classification: ai.classification,
    evidence: ai.classification === "UNKNOWN" ? "" : ai.evidence,
    title: metadata.slice(0, 180),
    videoUrl
  };
}

export async function fetchPinterestMp4(value) {
  const videoUrl = validatePinimgVideoUrl(value);
  const response = await fetchPinimgVideo(videoUrl);
  if (!response.ok || !response.body) throw new Error("VIDEO_DOWNLOAD_FAILED");
  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  if (contentType && !contentType.includes("video/") && !contentType.includes("application/octet-stream")) {
    throw new Error("VIDEO_CONTENT_TYPE_INVALID");
  }
  const length = Number(response.headers.get("content-length") || 0);
  if (length > 150 * 1024 * 1024) throw new Error("VIDEO_TOO_LARGE");
  return response;
}
