import http from "node:http";
import os from "node:os";
import path from "node:path";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { WebSocketServer, WebSocket } from "ws";

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 8765);
const DEVICE_TOKEN = process.env.DEVICE_TOKEN || "";
const WHISPER_CLI = process.env.WHISPER_CLI || "whisper-cli";
const WHISPER_MODEL = process.env.WHISPER_MODEL || "";
const PIPER_BIN = process.env.PIPER_BIN || "piper";
const PIPER_MODEL = process.env.PIPER_MODEL || "";
const SPEECH_API_BASE_URL = (process.env.SPEECH_API_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
const SPEECH_API_KEY = process.env.SPEECH_API_KEY || "";
const STT_MODEL = process.env.STT_MODEL || "gpt-4o-mini-transcribe";
const TTS_MODEL = process.env.TTS_MODEL || "gpt-4o-mini-tts";
const TTS_VOICE = process.env.TTS_VOICE || "alloy";
const AI_CHAT_URL = process.env.AI_CHAT_URL || "";
const AI_CHAT_MODEL = process.env.AI_CHAT_MODEL || "";
const AI_CHAT_API_KEY = process.env.AI_CHAT_API_KEY || "";
const AGENTWEBUI_URL = (process.env.AGENTWEBUI_URL || "").replace(/\/$/, "");
const AGENTWEBUI_PASSWORD = process.env.AGENTWEBUI_PASSWORD || "";
const AGENTWEBUI_TARGET = process.env.AGENTWEBUI_TARGET || "";
const AGENTWEBUI_MODEL = process.env.AGENTWEBUI_MODEL || "local/small";
let agentWebUiCookie = "";
const MAX_AUDIO_BYTES = 16000 * 2 * 45;

export const THEMES = Object.freeze({
  red: ["красн", "red"],
  orange: ["оранж", "orange"],
  yellow: ["желт", "жёлт", "yellow"],
  green: ["зелен", "зелён", "green"],
  indigo: ["индиго", "indigo"],
  blue: ["син", "blue"],
  violet: ["фиолет", "пурпур", "violet", "purple"],
  white: ["бел", "white"],
  black: ["черн", "чёрн", "black"]
});

export function parseVoiceControls(text, current = { theme: "blue", volume: 72 }) {
  const normalized = String(text || "").toLowerCase();
  const result = { theme: null, volume: null };
  for (const [theme, aliases] of Object.entries(THEMES)) {
    if (aliases.some(alias => normalized.includes(alias)) &&
        /(тем|цвет|палитр|экран|подсвет)/i.test(normalized)) {
      result.theme = theme;
      break;
    }
  }

  const numeric = normalized.match(/(?:громкост[ьи]?|звук)\D{0,20}(\d{1,3})\s*(?:%|процент|percent)?/i);
  if (numeric) {
    result.volume = Math.max(0, Math.min(100, Number(numeric[1])));
  } else if (/(выключи|отключи|без)\s*(?:звук|громкост)/i.test(normalized)) {
    result.volume = 0;
  } else if (/(включи|верни)\s*(?:звук|громкост)/i.test(normalized) && current.volume === 0) {
    result.volume = 72;
  } else if (/(громче|погромче|прибавь (?:звук|громкост)|увеличь громкост)/i.test(normalized)) {
    result.volume = Math.min(100, current.volume + 10);
  } else if (/(тише|потише|убавь (?:звук|громкост)|уменьши громкост)/i.test(normalized)) {
    result.volume = Math.max(0, current.volume - 10);
  }
  return result;
}

export function pcmToWav(pcm, sampleRate = 16000) {
  const data = Buffer.from(pcm);
  const wav = Buffer.alloc(44 + data.length);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + data.length, 4);
  wav.write("WAVE", 8);
  wav.write("fmt ", 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(data.length, 40);
  data.copy(wav, 44);
  return wav;
}

export function parsePcmWav(wav) {
  const data = Buffer.from(wav);
  if (data.toString("ascii", 0, 4) !== "RIFF" || data.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("TTS output is not a RIFF/WAVE file");
  }
  let offset = 12;
  let format = 0, channels = 0, sampleRate = 0, bits = 0, pcm = null;
  while (offset + 8 <= data.length) {
    const id = data.toString("ascii", offset, offset + 4);
    const size = data.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (start + size > data.length) throw new Error("Truncated WAV chunk");
    if (id === "fmt ") {
      format = data.readUInt16LE(start);
      channels = data.readUInt16LE(start + 2);
      sampleRate = data.readUInt32LE(start + 4);
      bits = data.readUInt16LE(start + 14);
    } else if (id === "data") {
      pcm = data.subarray(start, start + size);
    }
    offset = start + size + (size & 1);
  }
  if (format !== 1 || channels !== 1 || bits !== 16 || !sampleRate || !pcm) {
    throw new Error("Piper must produce mono PCM16 WAV");
  }
  return { sampleRate, pcm };
}

function run(command, args, input, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"] });
    const stdout = [], stderr = [];
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.stdout.on("data", chunk => stdout.push(chunk));
    child.stderr.on("data", chunk => stderr.push(chunk));
    child.on("error", error => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", code => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(Buffer.concat(stderr).toString("utf8").slice(-2000) || command + " exited " + code));
      } else {
        resolve({ stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr).toString("utf8") });
      }
    });
    child.stdin.end(input || undefined);
  });
}

async function transcribe(pcm, dir) {
  const wav = pcmToWav(pcm, 16000);
  if (SPEECH_API_KEY) {
    const form = new FormData();
    form.append("model", STT_MODEL);
    form.append("language", "ru");
    form.append("response_format", "json");
    form.append("file", new Blob([wav], { type: "audio/wav" }), "cardputer.wav");
    const response = await fetch(SPEECH_API_BASE_URL + "/audio/transcriptions", {
      method: "POST",
      headers: { authorization: "Bearer " + SPEECH_API_KEY },
      body: form,
      signal: AbortSignal.timeout(120000)
    });
    if (!response.ok) throw new Error("Speech STT HTTP " + response.status + ": " + (await response.text()).slice(0, 500));
    const result = await response.json();
    return String(result.text || "").trim();
  }
  if (!WHISPER_MODEL) throw new Error("Set SPEECH_API_KEY for cloud speech or configure WHISPER_MODEL for local STT");
  const wavPath = path.join(dir, "request.wav");
  await writeFile(wavPath, wav);
  const result = await run(WHISPER_CLI, ["-m", WHISPER_MODEL, "-f", wavPath, "-nt", "-l", "auto"]);
  return result.stdout.toString("utf8").split(/\r?\n/).map(line => line.trim()).filter(Boolean).join(" ")
    .replace(/^\[[^\]]+\]\s*/, "").trim();
}

async function agentWebUiRequest(route, options = {}, retry = true) {
  if (!AGENTWEBUI_URL) throw new Error("AGENTWEBUI_URL is not configured");
  const headers = { ...(options.headers || {}) };
  if (agentWebUiCookie) headers.cookie = agentWebUiCookie;
  const response = await fetch(AGENTWEBUI_URL + route, {
    ...options, headers, signal: options.signal || AbortSignal.timeout(120000)
  });
  if (response.status === 401 && retry && AGENTWEBUI_PASSWORD) {
    const login = await fetch(AGENTWEBUI_URL + "/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: AGENTWEBUI_PASSWORD }),
      signal: AbortSignal.timeout(15000)
    });
    if (!login.ok) throw new Error("AgentWebUI login failed: HTTP " + login.status);
    const cookies = typeof login.headers.getSetCookie === "function"
      ? login.headers.getSetCookie() : [login.headers.get("set-cookie") || ""];
    agentWebUiCookie = cookies.map(value => value.split(";")[0]).filter(Boolean).join("; ");
    if (!agentWebUiCookie) throw new Error("AgentWebUI login did not return a session cookie");
    return agentWebUiRequest(route, options, false);
  }
  if (!response.ok) {
    throw new Error("AgentWebUI HTTP " + response.status + " at " + route + ": " +
      (await response.text()).slice(0, 500));
  }
  return response;
}

async function agentWebUiJson(route, options) {
  const response = await agentWebUiRequest(route, options);
  return response.json();
}

export function extractAssistantText(chat) {
  const messages = Array.isArray(chat?.messages) ? chat.messages : [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (!["assistant", "agent"].includes(String(message?.role || "").toLowerCase())) continue;
    const parts = Array.isArray(message.parts) ? message.parts : [];
    const text = parts.map(part => {
      if (typeof part === "string") return part;
      if (part?.type && part.type !== "text") return "";
      return typeof part?.text === "string" ? part.text : "";
    }).join("");
    if (text.trim()) return text.trim();
    if (typeof message.content === "string" && message.content.trim()) return message.content.trim();
  }
  return "";
}

async function askAgentWebUi(prompt, session) {
  if (!AGENTWEBUI_URL) throw new Error("AGENTWEBUI_URL is not configured");
  if (!AGENTWEBUI_PASSWORD) throw new Error("AGENTWEBUI_PASSWORD is required for AgentWebUI sign-in");
  let target = AGENTWEBUI_TARGET;
  if (!target) {
    const agentsResponse = await agentWebUiJson("/api/agents");
    const agents = Array.isArray(agentsResponse) ? agentsResponse :
      (agentsResponse.agents || agentsResponse.items || []);
    const first = agents.find(agent => agent && (agent.id || agent.agent_id));
    if (first) target = "agent:" + (first.id || first.agent_id);
    else target = "model:" + AGENTWEBUI_MODEL;
  }
  if (!session.agentChatId) {
    const created = await agentWebUiJson("/api/chats", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ target })
    });
    session.agentChatId = created?.id || created?.chat?.id;
    if (!session.agentChatId) throw new Error("AgentWebUI did not return a chat id");
  }
  const chatId = session.agentChatId;
  await agentWebUiRequest("/api/chats/" + encodeURIComponent(chatId) + "/messages", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: prompt })
  });
  // The events endpoint is an SSE stream and closes when the current reply finishes.
  const events = await agentWebUiRequest("/api/chats/" + encodeURIComponent(chatId) + "/events", {
    headers: { accept: "text/event-stream" },
    signal: AbortSignal.timeout(120000)
  });
  if (events.body) {
    const reader = events.body.getReader();
    try {
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }
    } finally {
      reader.releaseLock();
    }
  }
  const saved = await agentWebUiJson("/api/chats/" + encodeURIComponent(chatId));
  const answer = extractAssistantText(saved);
  if (!answer) throw new Error("AgentWebUI chat finished without an assistant text reply");
  return answer;
}

async function askCoordinator(text, history, session) {
  if (AGENTWEBUI_URL) return askAgentWebUi(text, session);
  if (!AI_CHAT_URL) throw new Error("Set AGENTWEBUI_URL to connect the FREEzzz HUB agent system");
  const messages = [
    {
      role: "system",
      content: "Ты голосовой помощник FREEzzz HUB. Отвечай по-русски, кратко и естественно. Команды управления цветом экрана и громкостью обрабатывает локальный шлюз; не утверждай, что выполнил действие, если оно не было передано устройству."
    },
    ...history,
    { role: "user", content: text }
  ];
  const headers = { "content-type": "application/json" };
  if (AI_CHAT_API_KEY) headers.authorization = "Bearer " + AI_CHAT_API_KEY;
  const response = await fetch(AI_CHAT_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ model: AI_CHAT_MODEL || "local-agent", messages, temperature: 0.4, stream: false }),
    signal: AbortSignal.timeout(120000)
  });
  if (!response.ok) throw new Error("AI coordinator HTTP " + response.status + ": " + (await response.text()).slice(0, 500));
  const body = await response.json();
  const answer = body.choices?.[0]?.message?.content ?? body.reply ?? body.text ?? "";
  if (typeof answer !== "string" || !answer.trim()) throw new Error("AI coordinator returned an empty answer");
  return answer.trim();
}

async function synthesize(text, dir) {
  if (SPEECH_API_KEY) {
    const response = await fetch(SPEECH_API_BASE_URL + "/audio/speech", {
      method: "POST",
      headers: {
        authorization: "Bearer " + SPEECH_API_KEY,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: TTS_MODEL,
        voice: TTS_VOICE,
        input: text,
        response_format: "wav"
      }),
      signal: AbortSignal.timeout(120000)
    });
    if (!response.ok) throw new Error("Speech TTS HTTP " + response.status + ": " + (await response.text()).slice(0, 500));
    return parsePcmWav(Buffer.from(await response.arrayBuffer()));
  }
  if (!PIPER_MODEL) throw new Error("Set SPEECH_API_KEY for cloud speech or configure PIPER_MODEL for local TTS");
  const wavPath = path.join(dir, "reply.wav");
  const textPath = path.join(dir, "reply.txt");
  await writeFile(textPath, text, "utf8");
  await run(PIPER_BIN, ["-m", PIPER_MODEL, "-f", wavPath, "--input-file", textPath]);
  return parsePcmWav(await readFile(wavPath));
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function sendJson(socket, type, fields = {}) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type, ...fields }));
}

async function sendAudio(socket, audio) {
  await sendJson(socket, "audio.reply.begin", { sampleRate: audio.sampleRate, format: "pcm_s16le", channels: 1 });
  const frameBytes = Math.max(320, Math.floor(audio.sampleRate * 2 * 0.02));
  for (let offset = 0; offset < audio.pcm.length && socket.readyState === WebSocket.OPEN; offset += frameBytes) {
    socket.send(audio.pcm.subarray(offset, Math.min(offset + frameBytes, audio.pcm.length)), { binary: true });
    await sleep(20);
  }
  await sendJson(socket, "audio.reply.end");
}

function sendError(socket, error) {
  void sendJson(socket, "error", { message: String(error?.message || error).slice(0, 240) });
}

function createSession() {
  return {
    authenticated: false, recording: false, audio: [], audioBytes: 0, agentChatId: null,
    theme: "blue", volume: 72, history: [], busy: false
  };
}

export function createGatewayServer() {
  const server = http.createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
      res.end(JSON.stringify({ ok: true, service: "freezzz-cardputer-gateway" }));
      return;
    }
    res.writeHead(404);
    res.end("not found");
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });
  server.on("upgrade", (req, socket, head) => {
    if (req.url?.split("?")[0] !== "/cardputer") {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, ws => wss.emit("connection", ws, req));
  });

  wss.on("connection", socket => {
    const session = createSession();
    socket.on("message", (data, isBinary) => {
      if (isBinary) {
        if (!session.authenticated || !session.recording || session.busy) return;
        const chunk = Buffer.from(data);
        session.audioBytes += chunk.length;
        if (session.audioBytes > MAX_AUDIO_BYTES) {
          session.recording = false;
          session.audio = [];
          sendError(socket, new Error("Voice request exceeds 45 seconds"));
          return;
        }
        session.audio.push(chunk);
        return;
      }
      void (async () => {
        const message = JSON.parse(data.toString("utf8"));
        if (message.type === "auth") {
          if (!DEVICE_TOKEN || message.token !== DEVICE_TOKEN) {
            socket.close(1008, "unauthorized");
            return;
          }
          session.authenticated = true;
          await sendJson(socket, "session.state", { state: "Ready" });
          return;
        }
        if (!session.authenticated) {
          socket.close(1008, "authentication required");
          return;
        }
        if (message.type === "audio.start") {
          if (session.busy) return;
          session.recording = true;
          session.audio = [];
          session.audioBytes = 0;
          return;
        }
        if (message.type === "audio.end") {
          if (!session.recording || session.busy) return;
          session.recording = false;
          session.busy = true;
          const pcm = Buffer.concat(session.audio, session.audioBytes);
          session.audio = [];
          processVoiceRequest(socket, session, pcm)
            .catch(error => sendError(socket, error))
            .finally(() => { session.busy = false; });
        }
      })().catch(error => sendError(socket, error));
    });
    socket.on("close", () => {
      session.audio = [];
      session.history = [];
    });
  });
  return { server, wss };
}

async function processVoiceRequest(socket, session, pcm) {
  if (!pcm.length) throw new Error("No audio received");
  const dir = await mkdtemp(path.join(os.tmpdir(), "freezzz-voice-"));
  try {
    await sendJson(socket, "session.state", { state: "Transcribing" });
    const transcript = await transcribe(pcm, dir);
    if (!transcript) throw new Error("Speech was not recognized");
    await sendJson(socket, "user.text", { text: transcript });

    const controls = parseVoiceControls(transcript, session);
    let answer;
    if (controls.theme || controls.volume !== null) {
      if (controls.theme) {
        session.theme = controls.theme;
        await sendJson(socket, "device.theme", { theme: session.theme });
      }
      if (controls.volume !== null) {
        session.volume = controls.volume;
        await sendJson(socket, "device.volume", { volume: session.volume });
      }
      const changes = [];
      if (controls.theme) changes.push("цветовая тема — " + session.theme);
      if (controls.volume !== null) changes.push("громкость — " + session.volume + "%");
      answer = "Готово. " + changes.join(", ") + ".";
    } else {
      await sendJson(socket, "session.state", { state: "Thinking" });
      answer = await askCoordinator(transcript, session.history, session);
      session.history.push({ role: "user", content: transcript }, { role: "assistant", content: answer });
      if (session.history.length > 12) session.history.splice(0, session.history.length - 12);
    }

    await sendJson(socket, "assistant.text", { text: answer });
    await sendJson(socket, "session.state", { state: "Speaking" });
    const audio = await synthesize(answer, dir);
    await sendAudio(socket, audio);
    await sendJson(socket, "session.state", { state: "Ready" });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === new URL("file://" + path.resolve(process.argv[1])).href) {
  if (!DEVICE_TOKEN) {
    console.error("DEVICE_TOKEN is required; refusing to start an unauthenticated LAN gateway.");
    process.exit(1);
  }
  const { server } = createGatewayServer();
  server.listen(PORT, HOST, () => {
    console.log("FREEzzz Cardputer gateway listening on ws://" + HOST + ":" + PORT + "/cardputer");
    console.log("LAN-only service. Do not expose this port to the public internet.");
  });
}
