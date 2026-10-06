import crypto from "node:crypto";

const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60;

function buildDataCheckString(initData) {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  params.delete("hash");
  // Telegram adds an Ed25519 `signature` field for third-party verification.
  // It is not part of the bot-token HMAC data-check-string.
  params.delete("signature");
  const entries = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
  return { hash, dataCheckString: entries.map(([key, value]) => key + "=" + value).join("\n") };
}

export function validateTelegramInitData(initData, botToken, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (typeof initData !== "string" || !initData.trim()) throw new Error("MISSING_INIT_DATA");
  if (typeof botToken !== "string" || !botToken) throw new Error("BOT_TOKEN_NOT_CONFIGURED");

  const { hash, dataCheckString } = buildDataCheckString(initData);
  if (!hash || !/^[a-f0-9]{64}$/i.test(hash)) throw new Error("INVALID_HASH");

  // Telegram Mini Apps: secretKey = HMAC-SHA256(key=botToken, message="WebAppData"),
  // then HMAC-SHA256(key=secretKey, message=dataCheckString).
  const secretKey = crypto.createHmac("sha256", botToken).update("WebAppData").digest();
  const calculated = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  const expected = Buffer.from(calculated, "hex");
  const received = Buffer.from(hash, "hex");
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    throw new Error("INVALID_SIGNATURE");
  }

  const params = new URLSearchParams(initData);
  const authDate = Number(params.get("auth_date"));
  if (!Number.isSafeInteger(authDate) || authDate <= 0) throw new Error("INVALID_AUTH_DATE");
  if (authDate > nowSeconds + 60) throw new Error("AUTH_DATE_IN_FUTURE");
  if (nowSeconds - authDate > MAX_AUTH_AGE_SECONDS) throw new Error("AUTH_DATA_EXPIRED");

  let user = null;
  const rawUser = params.get("user");
  if (rawUser) {
    try { user = JSON.parse(rawUser); } catch { throw new Error("INVALID_USER_DATA"); }
  }

  return {
    authDate,
    queryId: params.get("query_id") || null,
    user: user && typeof user === "object" ? {
      id: Number.isSafeInteger(user.id) ? user.id : null,
      firstName: typeof user.first_name === "string" ? user.first_name : "",
      lastName: typeof user.last_name === "string" ? user.last_name : "",
      username: typeof user.username === "string" ? user.username : "",
      languageCode: typeof user.language_code === "string" ? user.language_code : "",
      photoUrl: typeof user.photo_url === "string" ? user.photo_url : ""
    } : null
  };
}
