import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
test("disabled audio returns without requiring Web Audio APIs", () => {
 const sandbox = { globalThis: {} };
 vm.runInNewContext(readFileSync("public/spark-audio.js", "utf8"), sandbox);
 assert.doesNotThrow(() => sandbox.globalThis.SparkAudio.beep(false, 440, 0.1));
});
test("unsupported audio APIs fail gracefully", () => {
 const sandbox = { globalThis: {} };
 vm.runInNewContext(readFileSync("public/spark-audio.js", "utf8"), sandbox);
 assert.doesNotThrow(() => sandbox.globalThis.SparkAudio.beep(true, 440, 0.1));
});
