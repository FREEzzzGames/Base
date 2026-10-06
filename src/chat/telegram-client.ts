import { getTelegramWebApp } from "../platform-bridge";

export type TelegramChatKind = "private" | "group" | "supergroup" | "channel" | "bot";

export interface TelegramChat {
  id: string;
  kind: TelegramChatKind;
  title: string;
  username?: string;
  avatarUrl?: string;
  unreadCount: number;
  lastMessage?: { id: string; text: string; date: string; outgoing: boolean };
}

export interface TelegramMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  text: string;
  date: string;
  outgoing: boolean;
}

export interface TelegramChatClient {
  getStatus(): Promise<{ connected: boolean; accountName?: string; pending?: string; configured?: boolean }>;
  getChats(signal?: AbortSignal): Promise<TelegramChat[]>;
  getMessages(chatId: string, limit?: number, signal?: AbortSignal): Promise<TelegramMessage[]>;
  sendMessage(chatId: string, text: string): Promise<void>;
  connect(phoneNumber: string): Promise<{ connected: boolean; awaiting?: string }>;
  submitCode(code: string): Promise<{ awaiting?: string }>;
  submitPassword(password: string): Promise<{ awaiting?: string }>;
  disconnect(): Promise<void>;
}

const configuredBase = String(import.meta.env.VITE_TELEGRAM_AUTH_URL || "https://freezzz-telegram-auth.onrender.com").trim();
const DEFAULT_BASE = configuredBase.replace(/\/$/, "").replace(/\/api\/telegram$/, "");
const initData = () => getTelegramWebApp()?.initData || "";

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string,string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Telegram-Init-Data": initData()
  };
  const response = await fetch(url, {
    credentials: "omit",
    ...init,
    headers: { ...headers, ...(init.headers as Record<string,string> || {}) }
  });
  let payload: unknown = null;
  try { payload = await response.json(); } catch {}
  if (!response.ok) {
    const code = typeof payload === "object" && payload && "error" in payload ? String((payload as {error?:unknown}).error || "") : "";
    throw new Error(code || `TELEGRAM_API_${response.status}`);
  }
  return payload as T;
}

export function createTelegramChatClient(baseUrl = DEFAULT_BASE): TelegramChatClient {
  const base = baseUrl.replace(/\/$/, "").replace(/\/api\/telegram$/, "");
  const apiBase = `${base}/api/telegram`;
  return {
    getStatus: () => request(`${apiBase}/status`),
    getChats: (signal) => request<TelegramChat[]>(`${apiBase}/chats`, { signal }),
    getMessages: (chatId, limit = 50, signal) =>
      request<TelegramMessage[]>(
        `${apiBase}/chats/${encodeURIComponent(chatId)}/messages?limit=${Math.min(Math.max(limit, 1), 100)}`,
        { signal }
      ),
    sendMessage: async (chatId, text) => {
      await request(`${apiBase}/chats/${encodeURIComponent(chatId)}/messages`, {
        method: "POST", body: JSON.stringify({ text })
      });
    },
    connect: (phoneNumber) => request<{ connected:boolean; awaiting?:string }>(`${apiBase}/connect`, {
      method: "POST", body: JSON.stringify({ phoneNumber })
    }),
    submitCode: (code) => request<{ awaiting?:string }>(`${apiBase}/connect/code`, {
      method: "POST", body: JSON.stringify({ value: code })
    }),
    submitPassword: (password) => request<{ awaiting?:string }>(`${apiBase}/connect/password`, {
      method: "POST", body: JSON.stringify({ value: password })
    }),
    disconnect: async () => { await request(`${apiBase}/disconnect`, { method: "POST" }); }
  };
}
