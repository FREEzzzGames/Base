import test from "node:test";
import assert from "node:assert/strict";
import { parseVoiceControls, pcmToWav, parsePcmWav, createGatewayServer } from "./index.mjs";

test("recognizes all nine screen palettes", () => {
  const cases = [
    ["поставь красную тему", "red"],
    ["включи оранжевую палитру", "orange"],
    ["сделай желтый цвет экрана", "yellow"],
    ["поставь зеленую тему", "green"],
    ["поставь индиго тему", "indigo"],
    ["включи синюю тему", "blue"],
    ["фиолетовая цветовая тема", "violet"],
    ["поставь белую тему", "white"],
    ["включи черную тему", "black"]
  ];
  for (const [phrase, expected] of cases) {
    assert.equal(parseVoiceControls(phrase).theme, expected, phrase);
  }
});

test("parses absolute and relative volume commands", () => {
  assert.equal(parseVoiceControls("громкость 35 процентов").volume, 35);
  assert.equal(parseVoiceControls("выключи звук").volume, 0);
  assert.equal(parseVoiceControls("сделай громче", { volume: 40 }).volume, 50);
  assert.equal(parseVoiceControls("убавь громкость", { volume: 40 }).volume, 30);
  assert.equal(parseVoiceControls("сделай потише", { volume: 40 }).volume, 30);
  assert.equal(parseVoiceControls("прибавь громкость", { volume: 40 }).volume, 50);
});

test("wraps mono PCM16 in a valid WAV header and reads it back", () => {
  const pcm = Buffer.from([1, 0, 2, 0, 3, 0, 4, 0]);
  const wav = pcmToWav(pcm, 16000);
  assert.equal(wav.toString("ascii", 0, 4), "RIFF");
  assert.equal(wav.readUInt32LE(24), 16000);
  assert.equal(wav.readUInt16LE(22), 1);
  assert.equal(wav.readUInt16LE(34), 16);
  const parsed = parsePcmWav(wav);
  assert.equal(parsed.sampleRate, 16000);
  assert.deepEqual(parsed.pcm, pcm);
});

test("rejects non-mono TTS WAV output", () => {
  const wav = pcmToWav(Buffer.alloc(16), 22050);
  wav.writeUInt16LE(2, 22);
  assert.throws(() => parsePcmWav(wav), /mono PCM16/);
});


test("health endpoint reports the active local Ollama target without secrets", async t => {
  const { server, wss } = createGatewayServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  t.after(async () => {
    await new Promise(resolve => wss.close(() => server.close(resolve)));
  });
  const address = server.address();
  const response = await fetch("http://127.0.0.1:" + address.port + "/health");
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.service, "freezzz-cardputer-gateway");
  assert.equal(typeof body.model, "string");
  assert.equal("token" in body, false);
  assert.equal("apiKey" in body, false);
});
