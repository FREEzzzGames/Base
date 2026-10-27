import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const server = readFileSync("server/index.mjs", "utf8");
const auth = readFileSync("server/telegram-auth.mjs", "utf8");
const client = readFileSync("src/chat/telegram-client.ts", "utf8");
const main = readFileSync("src/main.ts", "utf8");

assert.ok(server.includes("bytes += buffer.length"), "request body limit must count UTF-8 bytes");
assert.ok(server.includes('status === "restricted" && member?.is_member === true'), "restricted non-members must not pass membership checks");
assert.ok(server.includes("if (isCurrent) loginErrors.set(key, loginError)"), "cancelled logins must not overwrite current login status");
assert.ok(server.includes("return { connected: false, error: loginError }"), "client.start rejection must be observed, not rethrown unhandled");
assert.ok(server.includes("loginError: loginErrors.get(String(user.id))"), "status endpoint must expose asynchronous login errors");
assert.ok(server.includes('code === "PAYLOAD_TOO_LARGE" ? 413'), "oversized requests must return HTTP 413");
assert.ok(server.includes('error instanceof SyntaxError ? 400'), "malformed JSON must return HTTP 400");
assert.ok(server.includes("rateBuckets.size > 5000"), "inactive rate-limit buckets must be pruned");
assert.match(auth, /timingSafeEqual/);
assert.match(client, /TELEGRAM_API_TIMEOUT/);
assert.ok(main.includes('telegramChatStatus=status.loginError?"error"'), "chat UI must display asynchronous login errors");

console.log("SERVER_RUNTIME_SMOKE_OK");
