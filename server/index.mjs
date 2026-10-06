import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { validateTelegramInitData } from "./telegram-auth.mjs";

const port = Number(process.env.PORT || 10000);
const allowedOrigin = process.env.ALLOWED_ORIGIN || "https://freezzzgames.github.io";
const botToken = process.env.TELEGRAM_BOT_TOKEN || "";
const requiredChatId = process.env.TELEGRAM_REQUIRED_CHAT_ID || "";
const requireMembership = process.env.TELEGRAM_REQUIRE_MEMBERSHIP === "true";
const apiId = Number(process.env.TELEGRAM_API_ID || 0);
const apiHash = process.env.TELEGRAM_API_HASH || "";
const sessionSecret = process.env.TELEGRAM_SESSION_SECRET || "";
const sessionStorePath = process.env.TELEGRAM_SESSION_STORE_PATH || "/tmp/freezzz-telegram-sessions.json";

if (!botToken) console.warn("TELEGRAM_BOT_TOKEN is not configured.");
if (!apiId || !apiHash) console.warn("TELEGRAM_API_ID / TELEGRAM_API_HASH are not configured.");
if (!sessionSecret) console.warn("TELEGRAM_SESSION_SECRET is not configured; MTProto sessions cannot be persisted.");

const sessions = new Map();
const pendingAuth = new Map();
const rateBuckets = new Map();

function sendJson(res, status, body, origin = allowedOrigin) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.end(JSON.stringify(body));
}

function isTrustedOrigin(origin) {
  return !origin || origin === allowedOrigin;
}

async function readBody(req, maxBytes = 64 * 1024) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > maxBytes) throw new Error("PAYLOAD_TOO_LARGE");
  }
  return JSON.parse(body || "{}");
}

function diagnoseInitData(initData) {
  try {
    const params = new URLSearchParams(initData);
    const receivedHash = params.get("hash") || "";
    params.delete("hash");
    const entries = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
    const dataCheckString = entries.map(([key, value]) => key + "=" + value).join("\n");
    const secretKey = crypto.createHmac("sha256", botToken).update("WebAppData").digest();
    const calculatedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
    return {
      fields: entries.map(([key]) => key),
      hasSignature: params.has("signature"),
      hasHash: Boolean(receivedHash),
      receivedHashPrefix: receivedHash.slice(0, 12),
      calculatedHashPrefix: calculatedHash.slice(0, 12),
      hashMatches: Boolean(receivedHash) && crypto.timingSafeEqual(
        Buffer.from(receivedHash, "utf8"),
        Buffer.from(calculatedHash, "utf8")
      ),
      authDate: params.get("auth_date") || "",
      userPresent: Boolean(params.get("user")),
      configuredBotId: botToken.includes(":") ? botToken.split(":", 1)[0] : ""
    };
  } catch {
    return { diagnosticError: true };
  }
}

async function logBotIdentity() {
  if (!botToken) return;
  try {
    const response = await fetch("https://api.telegram.org/bot" + encodeURIComponent(botToken) + "/getMe", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000)
    });
    const payload = await response.json();
    if (payload?.ok) {
      console.log("telegram bot identity", {
        id: payload.result?.id,
        username: payload.result?.username || "",
        firstName: payload.result?.first_name || ""
      });
    } else {
      console.error("telegram bot identity check failed", payload?.error_code || "UNKNOWN");
    }
  } catch (error) {
    console.error("telegram bot identity check failed", error?.message || "UNKNOWN");
  }
}

function deriveKey() {
  if (!sessionSecret) throw new Error("SESSION_SECRET_NOT_CONFIGURED");
  return crypto.createHash("sha256").update(sessionSecret).digest();
}

function encrypt(value) {
  const key = deriveKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return JSON.stringify({
    v: 1,
    iv: iv.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
    data: encrypted.toString("base64url")
  });
}

function decrypt(serialized) {
  const item = JSON.parse(serialized);
  const key = deriveKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(item.iv, "base64url"));
  decipher.setAuthTag(Buffer.from(item.tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(item.data, "base64url")),
    decipher.final()
  ]).toString("utf8");
}

async function loadStoredSessions() {
  if (!sessionSecret) return;
  try {
    const raw = await fs.readFile(sessionStorePath, "utf8");
    const parsed = JSON.parse(raw);
    for (const [userId, encrypted] of Object.entries(parsed)) {
      try { sessions.set(String(userId), { session: decrypt(encrypted), client: null }); } catch {}
    }
  } catch (error) {
    if (error?.code !== "ENOENT") console.error("session store read failed", error?.message || error);
  }
}

let persistTimer = null;
async function persistSessions() {
  if (!sessionSecret) return;
  const payload = {};
  for (const [userId, state] of sessions) {
    if (state.session) payload[userId] = encrypt(state.session);
  }
  await fs.mkdir(path.dirname(sessionStorePath), { recursive: true });
  const temp = sessionStorePath + ".tmp";
  await fs.writeFile(temp, JSON.stringify(payload), { mode: 0o600 });
  await fs.rename(temp, sessionStorePath);
}
function schedulePersist() {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    void persistSessions().catch(error => console.error("session store write failed", error?.message || error));
  }, 250);
}

async function verifyMembership(userId) {
  if (!requireMembership) return true;
  if (!requiredChatId || !botToken) throw new Error("MEMBERSHIP_CHECK_NOT_CONFIGURED");
  const response = await fetch("https://api.telegram.org/bot" + encodeURIComponent(botToken) + "/getChatMember?" + new URLSearchParams({
    chat_id: requiredChatId, user_id: String(userId)
  }), { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error("MEMBERSHIP_SERVICE_UNAVAILABLE");
  const payload = await response.json();
  if (!payload.ok) throw new Error("MEMBERSHIP_CHECK_FAILED");
  const status = payload.result?.status;
  return status === "creator" || status === "administrator" || status === "member" || status === "restricted";
}

function authFromRequest(req) {
  if (!botToken) throw new Error("AUTH_SERVICE_NOT_CONFIGURED");
  const raw = req.headers["x-telegram-init-data"];
  if (typeof raw !== "string" || !raw) throw new Error("MISSING_INIT_DATA");
  try {
    const result = validateTelegramInitData(raw, botToken);
    if (!result.user?.id) throw new Error("TELEGRAM_USER_REQUIRED");
    return result.user;
  } catch (error) {
    if (error?.message === "INVALID_SIGNATURE") {
      console.error("telegram initData signature diagnostic", diagnoseInitData(raw));
    }
    throw error;
  }
}

function rateLimit(userId, cost = 1) {
  const now = Date.now();
  const key = String(userId);
  const item = rateBuckets.get(key) || { at: now, count: 0 };
  if (now - item.at > 60_000) { item.at = now; item.count = 0; }
  item.count += cost;
  rateBuckets.set(key, item);
  if (item.count > 120) throw new Error("RATE_LIMITED");
}

function getState(userId) {
  const key = String(userId);
  let state = sessions.get(key);
  if (!state) {
    state = { session: "", client: null };
    sessions.set(key, state);
  }
  return state;
}

async function getClient(userId) {
  if (!apiId || !apiHash) throw new Error("MT_PROTO_NOT_CONFIGURED");
  const state = getState(userId);
  if (!state.client) {
    state.client = new TelegramClient(new StringSession(state.session || ""), apiId, apiHash, { connectionRetries: 5 });
  }
  if (!state.client.connected) await state.client.connect();
  if (!await state.client.checkAuthorization()) throw new Error("TELEGRAM_AUTH_REQUIRED");
  return state.client;
}

function normalizeDialog(dialog) {
  const entity = dialog.entity;
  const id = String(entity?.id ?? dialog.id);
  const unreadCount = Number(dialog.unreadCount || 0);
  let kind = "private";
  if (entity?.className === "Channel") kind = entity.broadcast ? "channel" : "supergroup";
  else if (entity?.className === "Chat") kind = "group";
  else if (entity?.className === "User") kind = entity.bot ? "bot" : "private";
  const title = entity?.title ||
    [entity?.firstName, entity?.lastName].filter(Boolean).join(" ") ||
    entity?.username || id;
  return {
    id, kind, title,
    username: entity?.username || undefined,
    unreadCount,
    lastMessage: dialog.message ? {
      id: String(dialog.message.id),
      text: String(dialog.message.message || ""),
      date: new Date(Number(dialog.message.date || 0) * 1000).toISOString(),
      outgoing: Boolean(dialog.message.out)
    } : undefined
  };
}

function normalizeMessage(message, chatId) {
  const sender = message.sender;
  const senderName =
    [sender?.firstName, sender?.lastName].filter(Boolean).join(" ") ||
    sender?.title || sender?.username || String(message.senderId ?? "");
  return {
    id: String(message.id),
    chatId,
    senderId: String(message.senderId ?? ""),
    senderName,
    text: String(message.message || ""),
    date: new Date(Number(message.date || 0) * 1000).toISOString(),
    outgoing: Boolean(message.out)
  };
}

async function startTelegramLogin(userId, phoneNumber) {
  if (!apiId || !apiHash) throw new Error("MT_PROTO_NOT_CONFIGURED");
  const state = getState(userId);
  if (state.client && await state.client.checkAuthorization().catch(() => false)) return { connected: true };
  const client = new TelegramClient(new StringSession(""), apiId, apiHash, { connectionRetries: 5 });
  await client.connect();

  const key = String(userId);
  const pending = {
    client, phoneNumber,
    code: null, password: null,
    status: "code",
    startedAt: Date.now(),
    promise: null
  };
  pendingAuth.set(key, pending);

  pending.promise = client.start({
    phoneNumber: async () => phoneNumber,
    phoneCode: async () => new Promise(resolve => { pending.code = resolve; }),
    password: async () => new Promise(resolve => { pending.password = resolve; }),
    firstAndLastNames: async () => { throw new Error("TELEGRAM_SIGNUP_NOT_ALLOWED"); },
    onError: () => {}
  }).then(async () => {
    const session = client.session.save();
    sessions.set(key, { session, client });
    pendingAuth.delete(key);
    schedulePersist();
    return { connected: true };
  }).catch(async error => {
    pendingAuth.delete(key);
    try { await client.disconnect(); } catch {}
    throw error;
  });

  return { connected: false, awaiting: "code" };
}

async function finishPending(userId, field, value) {
  const pending = pendingAuth.get(String(userId));
  if (!pending) throw new Error("NO_PENDING_LOGIN");
  if (Date.now() - pending.startedAt > 10 * 60_000) {
    pendingAuth.delete(String(userId));
    throw new Error("LOGIN_FLOW_EXPIRED");
  }
  if (field === "code" && pending.code) {
    const resolve = pending.code; pending.code = null; pending.status = "password";
    resolve(value);
    return { awaiting: "password_or_complete" };
  }
  if (field === "password" && pending.password) {
    const resolve = pending.password; pending.password = null;
    resolve(value);
    return { awaiting: "complete" };
  }
  throw new Error("LOGIN_STEP_NOT_READY");
}

async function disconnectTelegram(userId) {
  const key = String(userId);
  const pending = pendingAuth.get(key);
  if (pending) {
    pendingAuth.delete(key);
    try { await pending.client.disconnect(); } catch {}
  }
  const state = sessions.get(key);
  if (state?.client) {
    try { await state.client.logOut(); } catch {}
    try { await state.client.disconnect(); } catch {}
  }
  sessions.delete(key);
  schedulePersist();
}

await loadStoredSessions();
void logBotIdentity();

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  const responseOrigin = origin && origin === allowedOrigin ? origin : allowedOrigin;

  if (req.method === "OPTIONS") {
    if (!isTrustedOrigin(origin)) return sendJson(res, 403, { ok: false, error: "ORIGIN_NOT_ALLOWED" }, responseOrigin);
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Origin", responseOrigin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Telegram-Init-Data");
    res.setHeader("Access-Control-Max-Age", "600");
    res.end();
    return;
  }

  if (origin && !isTrustedOrigin(origin)) return sendJson(res, 403, { ok: false, error: "ORIGIN_NOT_ALLOWED" }, responseOrigin);

  if (req.url === "/health" && req.method === "GET") {
    const configuredBotId = botToken.includes(":") ? botToken.split(":", 1)[0] : "";
    return sendJson(res, 200, {
      ok: true, service: "freezzz-telegram-auth",
      allowedOrigin,
      configuredBotId: configuredBotId || undefined,
      botConfigured: Boolean(botToken),
      mtprotoConfigured: Boolean(apiId && apiHash),
      sessionStoreConfigured: Boolean(sessionSecret)
    }, responseOrigin);
  }

  try {
    const url = new URL(req.url || "/", "http://localhost");
    const pathName = url.pathname;

    if (pathName === "/api/auth/telegram" && req.method === "POST") {
      if (!botToken) return sendJson(res, 503, { ok: false, error: "AUTH_SERVICE_NOT_CONFIGURED" }, responseOrigin);
      const body = await readBody(req);
      const result = validateTelegramInitData(body.initData, botToken);
      const member = await verifyMembership(result.user.id);
      if (!member) return sendJson(res, 403, { ok: false, error: "TELEGRAM_MEMBERSHIP_REQUIRED" }, responseOrigin);
      return sendJson(res, 200, { ok: true, authDate: result.authDate, queryId: result.queryId, user: result.user }, responseOrigin);
    }

    if (pathName.startsWith("/api/telegram/")) {
      const user = authFromRequest(req);
      rateLimit(user.id);

      if (pathName === "/api/telegram/status" && req.method === "GET") {
        const state = getState(user.id);
        let connected = false;
        try {
          const client = await getClient(user.id);
          connected = await client.checkAuthorization();
        } catch {}
        const pending = pendingAuth.get(String(user.id));
        return sendJson(res, 200, {
          connected,
          accountName: connected ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "" : undefined,
          pending: pending ? pending.status : undefined,
          configured: Boolean(apiId && apiHash)
        }, responseOrigin);
      }

      if (pathName === "/api/telegram/connect" && req.method === "POST") {
        const body = await readBody(req);
        const phoneNumber = typeof body.phoneNumber === "string" ? body.phoneNumber.trim() : "";
        if (!/^\+?[1-9]\d{6,14}$/.test(phoneNumber)) throw new Error("INVALID_PHONE");
        const result = await startTelegramLogin(user.id, phoneNumber);
        return sendJson(res, 200, result, responseOrigin);
      }

      const codeMatch = pathName.match(/^\\/api\\/telegram\\/connect\\/(code|password)$/);
      if (codeMatch && req.method === "POST") {
        const body = await readBody(req);
        const value = typeof body.value === "string" ? body.value.trim() : "";
        if (!value || value.length > 128) throw new Error("INVALID_AUTH_VALUE");
        const result = await finishPending(user.id, codeMatch[1], value);
        return sendJson(res, 200, result, responseOrigin);
      }

      if (pathName === "/api/telegram/disconnect" && req.method === "POST") {
        await disconnectTelegram(user.id);
        return sendJson(res, 200, { ok: true }, responseOrigin);
      }

      const messagesMatch = pathName.match(/^\\/api\\/telegram\\/chats\\/([^/]+)\\/messages$/);
      if (messagesMatch && req.method === "GET") {
        const chatId = decodeURIComponent(messagesMatch[1]);
        const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 50), 1), 100);
        const client = await getClient(user.id);
        const entity = await client.getEntity(chatId);
        const messages = await client.getMessages(entity, { limit });
        return sendJson(res, 200, messages.map(message => normalizeMessage(message, chatId)), responseOrigin);
      }

      if (messagesMatch && req.method === "POST") {
        const body = await readBody(req);
        const text = typeof body.text === "string" ? body.text.trim() : "";
        if (!text || text.length > 4096) throw new Error("INVALID_MESSAGE");
        const client = await getClient(user.id);
        const entity = await client.getEntity(decodeURIComponent(messagesMatch[1]));
        await client.sendMessage(entity, { message: text });
        return sendJson(res, 200, { ok: true }, responseOrigin);
      }

      if (pathName === "/api/telegram/chats" && req.method === "GET") {
        const client = await getClient(user.id);
        const dialogs = await client.getDialogs({ limit: 200 });
        return sendJson(res, 200, dialogs.map(normalizeDialog), responseOrigin);
      }

      return sendJson(res, 404, { ok: false, error: "NOT_FOUND" }, responseOrigin);
    }

    return sendJson(res, 404, { ok: false, error: "NOT_FOUND" }, responseOrigin);
  } catch (error) {
    const code = error instanceof Error ? error.message : "SERVER_ERROR";
    const status = ["MISSING_INIT_DATA","TELEGRAM_USER_REQUIRED","INVALID_PHONE","INVALID_MESSAGE","INVALID_AUTH_VALUE","NO_PENDING_LOGIN","LOGIN_FLOW_EXPIRED","LOGIN_STEP_NOT_READY"].includes(code) ? 400
      : ["ORIGIN_NOT_ALLOWED"].includes(code) ? 403
      : ["RATE_LIMITED"].includes(code) ? 429
      : ["TELEGRAM_AUTH_REQUIRED","AUTH_SERVICE_NOT_CONFIGURED","MT_PROTO_NOT_CONFIGURED","SESSION_SECRET_NOT_CONFIGURED"].includes(code) ? 503
      : 502;
    console.error("telegram api error", code);
    return sendJson(res, status, { ok: false, error: code }, responseOrigin);
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log("FREEzzz Telegram auth/chat listening on " + port);
});
