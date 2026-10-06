import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { validateTelegramInitData } from "./telegram-auth.mjs";

function makeInitData(botToken, authDate) {
  const user = JSON.stringify({ id: 123456789, first_name: "Test", username: "tester" });
  const values = new URLSearchParams({ auth_date: String(authDate), user, query_id: "AA-test", signature: "test-signature" });
  const check = [...values.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k,v]) => k+"="+v).join("\n");
  const secret = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const hash = crypto.createHmac("sha256", secret).update(check).digest("hex");
  values.set("hash", hash);
  return values.toString();
}

test("valid Telegram initData is accepted", () => {
  const now = 1_800_000_000;
  const raw = makeInitData("123456:TEST", now - 30);
  const result = validateTelegramInitData(raw, "123456:TEST", now);
  assert.equal(result.user.id, 123456789);
  assert.equal(result.user.username, "tester");
});

test("tampered initData is rejected", () => {
  const now = 1_800_000_000;
  const raw = makeInitData("123456:TEST", now - 30).replace("tester", "attacker");
  assert.throws(() => validateTelegramInitData(raw, "123456:TEST", now), /INVALID_SIGNATURE/);
});

test("expired initData is rejected", () => {
  const now = 1_800_000_000;
  const raw = makeInitData("123456:TEST", now - 86401);
  assert.throws(() => validateTelegramInitData(raw, "123456:TEST", now), /AUTH_DATA_EXPIRED/);
});
