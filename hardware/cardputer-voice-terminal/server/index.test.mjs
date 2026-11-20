import test from "node:test";
import assert from "node:assert/strict";
import { parseVoiceControls, pcmToWav, parsePcmWav } from "./index.mjs";

test("recognizes all nine screen palettes", () => {
  const cases = [
    ["поставь красную тему", "red"],
    ["включи оранжевую палитру", "orange"],
    ["сделай желтый цвет экрана", "yellow"],
    ["поставь зеленую тему", "green"],
    ["сделай голубую тему", "cyan"],
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
