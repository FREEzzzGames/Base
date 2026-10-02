import http from "node:http";
import { validateTelegramInitData } from "./telegram-auth.mjs";

const port = Number(process.env.PORT || 10000);
const allowedOrigin = process.env.ALLOWED_ORIGIN || "https://freezzgames.github.io";
const botToken = process.env.TELEGRAM_BOT_TOKEN || "";
const requiredChatId = process.env.TELEGRAM_REQUIRED_CHAT_ID || "";
const requireMembership = process.env.TELEGRAM_REQUIRE_MEMBERSHIP === "true";

async function verifyMembership(userId) {
  if (!requireMembership) return true;
  if (!requiredChatId) throw new Error("MEMBERSHIP_CHECK_NOT_CONFIGURED");
  const response = await fetch("https://api.telegram.org/bot"+encodeURIComponent(botToken)+"/getChatMember?"+new URLSearchParams({chat_id:requiredChatId,user_id:String(userId)}),{headers:{Accept:"application/json"},signal:AbortSignal.timeout(5000)});
  if (!response.ok) throw new Error("MEMBERSHIP_SERVICE_UNAVAILABLE");
  const payload = await response.json();
  if (!payload.ok) throw new Error("MEMBERSHIP_CHECK_FAILED");
  const status = payload.result?.status;
  return status === "creator" || status === "administrator" || status === "member" || status === "restricted";
}

function sendJson(res, status, body, origin = allowedOrigin) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  const trustedOrigin = origin === allowedOrigin ? origin : allowedOrigin;

  if (req.method === "OPTIONS") {
    if (origin && origin !== allowedOrigin) return sendJson(res, 403, { ok: false, error: "ORIGIN_NOT_ALLOWED" }, allowedOrigin);
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Origin", trustedOrigin);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Max-Age", "600");
    res.end();
    return;
  }

  if (req.url === "/health" && req.method === "GET") {
    return sendJson(res, 200, { ok: true, service: "freezzz-telegram-auth" });
  }

  if (req.url !== "/api/auth/telegram" || req.method !== "POST") {
    return sendJson(res, 404, { ok: false, error: "NOT_FOUND" });
  }

  if (origin && origin !== allowedOrigin) {
    return sendJson(res, 403, { ok: false, error: "ORIGIN_NOT_ALLOWED" });
  }

  if (!botToken) return sendJson(res, 503, { ok: false, error: "AUTH_SERVICE_NOT_CONFIGURED" });

  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 64 * 1024) return sendJson(res, 413, { ok: false, error: "PAYLOAD_TOO_LARGE" });
  }

  try {
    const parsed = JSON.parse(body || "{}");
    const result = validateTelegramInitData(parsed.initData, botToken);
    const member = await verifyMembership(result.user.id);
    if (!member) return sendJson(res, 403, { ok: false, error: "TELEGRAM_MEMBERSHIP_REQUIRED" });
    return sendJson(res, 200, { ok: true, authDate: result.authDate, queryId: result.queryId, user: result.user });
  } catch (error) {
    const code = error instanceof Error ? error.message : "AUTH_FAILED";
    const clientCode = code === "BOT_TOKEN_NOT_CONFIGURED" ? "AUTH_SERVICE_NOT_CONFIGURED" : code;
    return sendJson(res, 401, { ok: false, error: clientCode });
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log("FREEzzz Telegram auth listening on " + port);
});
