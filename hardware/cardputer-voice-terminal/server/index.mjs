import http from "node:http";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { timingSafeEqual } from "node:crypto";
import { WebSocketServer, WebSocket } from "ws";

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 8765);
const DEVICE_TOKEN = process.env.DEVICE_TOKEN || "";
const AI_CHAT_URL = process.env.AI_CHAT_URL || "http://127.0.0.1:11434/v1/chat/completions";
const AI_CHAT_MODEL = process.env.AI_CHAT_MODEL || "qwen3.5:4b";
const AI_CHAT_API_KEY = process.env.AI_CHAT_API_KEY || "";
const SPEECH_API_BASE_URL = (process.env.SPEECH_API_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
const SPEECH_API_KEY = process.env.SPEECH_API_KEY || "";
const STT_MODEL = process.env.STT_MODEL || "gpt-4o-mini-transcribe";
const TTS_MODEL = process.env.TTS_MODEL || "gpt-4o-mini-tts";
const TTS_VOICE = process.env.TTS_VOICE || "alloy";
const WHISPER_CLI = process.env.WHISPER_CLI || "whisper-cli";
const WHISPER_MODEL = process.env.WHISPER_MODEL || "";
const PIPER_BIN = process.env.PIPER_BIN || "piper";
const PIPER_MODEL = process.env.PIPER_MODEL || "";
const MAX_AUDIO_BYTES = 16000 * 2 * 45;
const REQUEST_TIMEOUT_MS = 120000;

export const THEMES = Object.freeze({
  red: ["красн", "red"], orange: ["оранж", "orange"], yellow: ["желт", "жёлт", "yellow"],
  green: ["зелен", "зелён", "green"], indigo: ["индиго", "indigo"], blue: ["син", "blue"],
  violet: ["фиолет", "пурпур", "violet", "purple"], white: ["бел", "white"], black: ["черн", "чёрн", "black"]
});

export function parseVoiceControls(text, current = { theme: "blue", volume: 72 }) {
  const normalized = String(text || "").toLowerCase();
  const result = { theme: null, volume: null };
  for (const [theme, aliases] of Object.entries(THEMES)) {
    if (aliases.some(alias => normalized.includes(alias)) && /(тем|цвет|палитр|экран|подсвет)/i.test(normalized)) {
      result.theme = theme;
      break;
    }
  }
  const numeric = normalized.match(/(?:громкост[ьи]?|звук)\D{0,20}(\d{1,3})\s*(?:%|процент|percent)?/i);
  if (numeric) result.volume = Math.max(0, Math.min(100, Number(numeric[1])));
  else if (/(выключи|отключи|без)\s*(?:звук|громкост)/i.test(normalized)) result.volume = 0;
  else if (/(включи|верни)\s*(?:звук|громкост)/i.test(normalized) && current.volume === 0) result.volume = 72;
  else if (/(громче|погромче|прибавь (?:звук|громкост)|увеличь громкост)/i.test(normalized)) result.volume = Math.min(100, current.volume + 10);
  else if (/(тише|потише|убавь (?:звук|громкост)|уменьши громкост)/i.test(normalized)) result.volume = Math.max(0, current.volume - 10);
  return result;
}

export function pcmToWav(pcm, sampleRate = 16000) {
  const data = Buffer.from(pcm);
  const wav = Buffer.alloc(44 + data.length);
  wav.write("RIFF", 0); wav.writeUInt32LE(36 + data.length, 4); wav.write("WAVE", 8);
  wav.write("fmt ", 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22); wav.writeUInt32LE(sampleRate, 24); wav.writeUInt32LE(sampleRate * 2, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write("data", 36);
  wav.writeUInt32LE(data.length, 40); data.copy(wav, 44);
  return wav;
}

export function parsePcmWav(wav) {
  const data = Buffer.from(wav);
  if (data.toString("ascii", 0, 4) !== "RIFF" || data.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("TTS output is not a RIFF/WAVE file");
  }
  let offset = 12, format = 0, channels = 0, sampleRate = 0, bits = 0, pcm = null;
  while (offset + 8 <= data.length) {
    const id = data.toString("ascii", offset, offset + 4);
    const size = data.readUInt32LE(offset + 4), start = offset + 8;
    if (start + size > data.length) throw new Error("Truncated WAV chunk");
    if (id === "fmt ") {
      format = data.readUInt16LE(start); channels = data.readUInt16LE(start + 2);
      sampleRate = data.readUInt32LE(start + 4); bits = data.readUInt16LE(start + 14);
    } else if (id === "data") pcm = data.subarray(start, start + size);
    offset = start + size + (size & 1);
  }
  if (format !== 1 || channels !== 1 || bits !== 16 || !sampleRate || !pcm) {
    throw new Error("TTS must produce mono PCM16 WAV");
  }
  return { sampleRate, pcm };
}

function run(command, args, timeoutMs = REQUEST_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    const stdout = [], stderr = [];
    let settled = false;
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      if (!settled) { settled = true; reject(new Error(command + " timed out")); }
    }, timeoutMs);
    child.stdout.on("data", chunk => stdout.push(chunk));
    child.stderr.on("data", chunk => stderr.push(chunk));
    child.on("error", error => {
      clearTimeout(timer);
      if (!settled) { settled = true; reject(error); }
    });
    child.on("close", code => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;
      if (code !== 0) reject(new Error(Buffer.concat(stderr).toString("utf8").slice(-1200) || command + " exited " + code));
      else resolve(Buffer.concat(stdout));
    });
  });
}

async function transcribe(pcm, dir) {
  if (SPEECH_API_KEY) {
    const form = new FormData();
    form.append("model", STT_MODEL);
    form.append("language", "ru");
    form.append("response_format", "json");
    form.append("file", new Blob([pcmToWav(pcm)], { type: "audio/wav" }), "cardputer.wav");
    const response = await fetch(SPEECH_API_BASE_URL + "/audio/transcriptions", {
      method: "POST", headers: { authorization: "Bearer " + SPEECH_API_KEY },
      body: form, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
    if (!response.ok) throw new Error("STT HTTP " + response.status + ": " + (await response.text()).slice(0, 300));
    return String((await response.json()).text || "").trim();
  }
  if (!WHISPER_MODEL) throw new Error("STT is not configured: set SPEECH_API_KEY or WHISPER_MODEL in .env");
  const wavPath = path.join(dir, "request.wav");
  await writeFile(wavPath, pcmToWav(pcm));
  const output = await run(WHISPER_CLI, ["-m", WHISPER_MODEL, "-f", wavPath, "-nt", "-l", "auto"]);
  return output.toString("utf8").split(/\r?\n/).map(line => line.trim()).filter(Boolean).join(" ")
    .replace(/^\[[^\]]+\]\s*/, "").trim();
}

async function askOllama(prompt, history) {
  const messages = [
    { role: "system", content: "Ты голосовой помощник FREEzzz HUB. Отвечай по-русски, кратко и естественно. Не утверждай, что выполнил действие на устройстве, если шлюз не подтвердил его." },
    ...history,
    { role: "user", content: prompt }
  ];
  const headers = { "content-type": "application/json" };
  if (AI_CHAT_API_KEY) headers.authorization = "Bearer " + AI_CHAT_API_KEY;
  const response = await fetch(AI_CHAT_URL, {
    method: "POST", headers,
    body: JSON.stringify({ model: AI_CHAT_MODEL, messages, temperature: 0.4, stream: false }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });
  if (!response.ok) throw new Error("Ollama HTTP " + response.status + ": " + (await response.text()).slice(0, 300));
  const body = await response.json();
  const answer = body.choices?.[0]?.message?.content ?? body.message?.content ?? body.response ?? body.reply ?? "";
  if (typeof answer !== "string" || !answer.trim()) throw new Error("Ollama returned an empty response");
  return answer.trim();
}

async function synthesize(text, dir) {
  if (SPEECH_API_KEY) {
    const response = await fetch(SPEECH_API_BASE_URL + "/audio/speech", {
      method: "POST",
      headers: { authorization: "Bearer " + SPEECH_API_KEY, "content-type": "application/json" },
      body: JSON.stringify({ model: TTS_MODEL, voice: TTS_VOICE, input: text, response_format: "wav" }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
    if (!response.ok) throw new Error("TTS HTTP " + response.status + ": " + (await response.text()).slice(0, 300));
    return parsePcmWav(Buffer.from(await response.arrayBuffer()));
  }
  if (!PIPER_MODEL) throw new Error("TTS is not configured: set SPEECH_API_KEY or PIPER_MODEL in .env");
  const wavPath = path.join(dir, "reply.wav"), textPath = path.join(dir, "reply.txt");
  await writeFile(textPath, text, "utf8");
  await run(PIPER_BIN, ["-m", PIPER_MODEL, "-f", wavPath, "--input-file", textPath]);
  return parsePcmWav(await readFile(wavPath));
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function sendJson(socket, type, fields = {}) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type, ...fields }));
}
async function sendAudio(socket, audio) {
  sendJson(socket, "audio.reply.begin", { sampleRate: audio.sampleRate, format: "pcm_s16le", channels: 1 });
  const frameBytes = Math.max(320, Math.floor(audio.sampleRate * 2 * 0.02));
  for (let offset = 0; offset < audio.pcm.length && socket.readyState === WebSocket.OPEN; offset += frameBytes) {
    while (socket.bufferedAmount > 128 * 1024 && socket.readyState === WebSocket.OPEN) await sleep(10);
    if (socket.readyState !== WebSocket.OPEN) break;
    socket.send(audio.pcm.subarray(offset, Math.min(offset + frameBytes, audio.pcm.length)), { binary: true });
    await sleep(20);
  }
  sendJson(socket, "audio.reply.end");
}
function sendError(socket, error, stage) {
  const message = String(error?.message || error).replace(/[\r\n]+/g, " ").slice(0, 180);
  console.error("[gateway][" + stage + "]", message);
  sendJson(socket, "error", { stage, message });
}
function createSession() {
  return { authenticated: false, recording: false, audio: [], audioBytes: 0, history: [], busy: false, theme: "blue", volume: 72 };
}
function tokenMatches(candidate) {
  if (!DEVICE_TOKEN || typeof candidate !== "string") return false;
  const expected = Buffer.from(DEVICE_TOKEN), actual = Buffer.from(candidate);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function createGatewayServer() {
  const server = http.createServer((req, res) => {
    if (req.method === "GET" && (req.url === "/health" || req.url === "/")) {
      res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
      res.end(JSON.stringify({
        ok: true, service: "freezzz-cardputer-gateway", pid: process.pid,
        chat: AI_CHAT_URL, model: AI_CHAT_MODEL,
        stt: Boolean(SPEECH_API_KEY || WHISPER_MODEL), tts: Boolean(SPEECH_API_KEY || PIPER_MODEL)
      }));
      return;
    }
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024, perMessageDeflate: false });
  server.on("upgrade", (req, socket, head) => {
    if (req.url?.split("?")[0] !== "/cardputer") { socket.destroy(); return; }
    wss.handleUpgrade(req, socket, head, ws => wss.emit("connection", ws, req));
  });
  wss.on("connection", socket => {
    const session = createSession();
    const authTimer = setTimeout(() => {
      if (!session.authenticated) socket.close(1008, "authentication timeout");
    }, 10000);
    socket.on("message", (data, isBinary) => {
      if (isBinary) {
        if (!session.authenticated || !session.recording || session.busy) return;
        const chunk = Buffer.from(data);
        session.audioBytes += chunk.length;
        if (session.audioBytes > MAX_AUDIO_BYTES) {
          session.recording = false; session.audio = []; session.audioBytes = 0;
          sendError(socket, new Error("Voice request exceeds 45 seconds"), "capture");
          return;
        }
        session.audio.push(chunk);
        return;
      }
      void (async () => {
        let message;
        try { message = JSON.parse(data.toString("utf8")); }
        catch { socket.close(1007, "invalid JSON"); return; }
        if (message.type === "auth") {
          if (!tokenMatches(message.token)) { socket.close(1008, "unauthorized"); return; }
          session.authenticated = true;
          clearTimeout(authTimer);
          sendJson(socket, "session.state", { state: "Ready" });
          console.log("[gateway] authenticated Cardputer connection");
          return;
        }
        if (!session.authenticated) { socket.close(1008, "authentication required"); return; }
        if (message.type === "audio.start") {
          if (session.busy) return;
          session.recording = true; session.audio = []; session.audioBytes = 0;
          return;
        }
        if (message.type === "audio.end") {
          if (!session.recording || session.busy) return;
          session.recording = false; session.busy = true;
          const pcm = Buffer.concat(session.audio, session.audioBytes);
          session.audio = []; session.audioBytes = 0;
          processVoiceRequest(socket, session, pcm)
            .catch(error => sendError(socket, error, error.stage || "voice"))
            .finally(() => { session.busy = false; });
        }
      })().catch(error => sendError(socket, error, "protocol"));
    });
    socket.on("close", () => {
      clearTimeout(authTimer); session.audio = []; session.history = [];
    });
    socket.on("error", error => console.error("[gateway] websocket:", error.message));
  });
  return { server, wss };
}

async function processVoiceRequest(socket, session, pcm) {
  if (!pcm.length) throw new Error("No audio received");
  const dir = await mkdtemp(path.join(os.tmpdir(), "freezzz-voice-"));
  try {
    sendJson(socket, "session.state", { state: "Transcribing" });
    let transcript;
    try { transcript = await transcribe(pcm, dir); }
    catch (error) { error.stage = "stt"; throw error; }
    if (!transcript) throw new Error("Speech was not recognized");
    sendJson(socket, "user.text", { text: transcript });
    const controls = parseVoiceControls(transcript, session);
    let answer;
    if (controls.theme || controls.volume !== null) {
      if (controls.theme) { session.theme = controls.theme; sendJson(socket, "device.theme", { theme: session.theme }); }
      if (controls.volume !== null) { session.volume = controls.volume; sendJson(socket, "device.volume", { volume: session.volume }); }
      const changes = [];
      if (controls.theme) changes.push("цветовая тема — " + session.theme);
      if (controls.volume !== null) changes.push("громкость — " + session.volume + "%");
      answer = "Готово. " + changes.join(", ") + ".";
    } else {
      sendJson(socket, "session.state", { state: "Thinking" });
      answer = await askOllama(transcript, session.history);
      session.history.push({ role: "user", content: transcript }, { role: "assistant", content: answer });
      if (session.history.length > 12) session.history.splice(0, session.history.length - 12);
    }
    sendJson(socket, "assistant.text", { text: answer });
    sendJson(socket, "session.state", { state: "Speaking" });
    let audio;
    try { audio = await synthesize(answer, dir); }
    catch (error) { sendError(socket, error, "tts"); return; }
    await sendAudio(socket, audio);
    sendJson(socket, "session.state", { state: "Ready" });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === new URL("file://" + path.resolve(process.argv[1])).href) {
  if (DEVICE_TOKEN.length < 32) {
    console.error("DEVICE_TOKEN must contain at least 32 characters; refusing to start.");
    process.exit(1);
  }
  if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
    console.error("PORT must be a valid TCP port.");
    process.exit(1);
  }
  const { server } = createGatewayServer();
  server.on("error", error => {
    if (error.code === "EADDRINUSE") {
      console.error("Gateway port " + PORT + " is already in use. Stop the old process; do not start a second copy.");
    } else console.error("[gateway] server error:", error);
    process.exit(1);
  });
  server.listen(PORT, HOST, () => {
    console.log("FREEzzz Cardputer Gateway v2 listening on http://" + HOST + ":" + PORT);
    console.log("WebSocket endpoint: /cardputer");
    console.log("Ollama: " + AI_CHAT_URL + " | model: " + AI_CHAT_MODEL);
    console.log("STT: " + (SPEECH_API_KEY ? "Speech API" : WHISPER_MODEL ? "local Whisper" : "NOT CONFIGURED"));
    console.log("TTS: " + (SPEECH_API_KEY ? "Speech API" : PIPER_MODEL ? "local Piper" : "NOT CONFIGURED"));
  });
}
