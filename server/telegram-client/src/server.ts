import express from "express";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { Api } from "telegram";
import * as readline from "node:readline/promises";

const PORT = Number(process.env.PORT || 8787);
const API_ID = Number(process.env.TELEGRAM_API_ID || 0);
const API_HASH = process.env.TELEGRAM_API_HASH || "";
const SESSION = process.env.TELEGRAM_SESSION || "";

if (!API_ID || !API_HASH) {
  throw new Error("TELEGRAM_API_ID and TELEGRAM_API_HASH are required");
}

const app = express();
app.use(express.json({ limit: "64kb" }));

const client = new TelegramClient(new StringSession(SESSION), API_ID, API_HASH, {
  connectionRetries: 5
});

async function ensureConnected() {
  if (!client.connected) await client.connect();
  if (!await client.checkAuthorization()) {
    throw new Error("TELEGRAM_AUTH_REQUIRED");
  }
}

function normalizeDialog(dialog: any) {
  const entity = dialog.entity;
  const id = String(entity?.id ?? dialog.id);
  const unreadCount = Number(dialog.unreadCount || 0);
  let kind = "private";
  if (entity instanceof Api.Channel) kind = entity.broadcast ? "channel" : "supergroup";
  else if (entity instanceof Api.Chat) kind = "group";
  else if (entity instanceof Api.User) kind = entity.bot ? "bot" : "private";
  const title =
    entity?.title ||
    [entity?.firstName, entity?.lastName].filter(Boolean).join(" ") ||
    entity?.username ||
    id;
  return {
    id,
    kind,
    title,
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

function normalizeMessage(message: any, chatId: string) {
  const sender = message.sender;
  const senderName =
    [sender?.firstName, sender?.lastName].filter(Boolean).join(" ") ||
    sender?.title ||
    sender?.username ||
    String(message.senderId ?? "");
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

app.get("/api/telegram/status", async (_req, res) => {
  try {
    await ensureConnected();
    res.json({ connected: true });
  } catch {
    res.json({ connected: false });
  }
});

app.get("/api/telegram/chats", async (_req, res) => {
  try {
    await ensureConnected();
    const dialogs = await client.getDialogs({ limit: 200 });
    res.json(dialogs.map(normalizeDialog));
  } catch (error) {
    res.status(503).json({ error: error instanceof Error ? error.message : "TELEGRAM_UNAVAILABLE" });
  }
});

app.get("/api/telegram/chats/:chatId/messages", async (req, res) => {
  try {
    await ensureConnected();
    const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 100);
    const entity = await client.getEntity(req.params.chatId);
    const messages = await client.getMessages(entity, { limit });
    res.json(messages.map(message => normalizeMessage(message, req.params.chatId)));
  } catch (error) {
    res.status(503).json({ error: error instanceof Error ? error.message : "TELEGRAM_UNAVAILABLE" });
  }
});

app.post("/api/telegram/chats/:chatId/messages", async (req, res) => {
  try {
    await ensureConnected();
    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
    if (!text || text.length > 4096) return res.status(400).json({ error: "INVALID_MESSAGE" });
    const entity = await client.getEntity(req.params.chatId);
    await client.sendMessage(entity, { message: text });
    res.status(204).end();
  } catch (error) {
    res.status(503).json({ error: error instanceof Error ? error.message : "TELEGRAM_UNAVAILABLE" });
  }
});

app.listen(PORT, () => {
  console.log(`FREEzzz Telegram client listening on :${PORT}`);
});
