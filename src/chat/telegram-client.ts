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
  getStatus(): Promise<{ connected: boolean; accountName?: string }>;
  getChats(signal?: AbortSignal): Promise<TelegramChat[]>;
  getMessages(chatId: string, limit?: number, signal?: AbortSignal): Promise<TelegramMessage[]>;
  sendMessage(chatId: string, text: string): Promise<void>;
  connect(): Promise<{ url: string }>;
  disconnect(): Promise<void>;
}

const DEFAULT_BASE = "/api/telegram";

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    ...init,
    headers: { Accept: "application/json", "Content-Type": "application/json", ...(init.headers || {}) }
  });
  if (!response.ok) throw new Error(`TELEGRAM_API_${response.status}`);
  return response.json() as Promise<T>;
}

export function createTelegramChatClient(baseUrl = DEFAULT_BASE): TelegramChatClient {
  const base = baseUrl.replace(/\/$/, "");
  return {
    getStatus: () => request(`${base}/status`),
    getChats: (signal) => request<TelegramChat[]>(`${base}/chats`, { signal }),
    getMessages: (chatId, limit = 50, signal) =>
      request<TelegramMessage[]>(
        `${base}/chats/${encodeURIComponent(chatId)}/messages?limit=${Math.min(Math.max(limit, 1), 100)}`,
        { signal }
      ),
    sendMessage: async (chatId, text) => {
      await request(`${base}/chats/${encodeURIComponent(chatId)}/messages`, {
        method: "POST", body: JSON.stringify({ text })
      });
    },
    connect: () => request<{ url: string }>(`${base}/connect`),
    disconnect: async () => { await request(`${base}/disconnect`, { method: "POST" }); }
  };
}
