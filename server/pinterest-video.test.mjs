import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyPinterestAiText,
  validatePinterestPageUrl,
  validatePinimgVideoUrl
} from "./pinterest-video.mjs";

test("accepts Pinterest and short pin links", () => {
  assert.equal(validatePinterestPageUrl("https://www.pinterest.com/pin/123456/").hostname, "www.pinterest.com");
  assert.equal(validatePinterestPageUrl("https://pin.it/AbCd123").hostname, "pin.it");
});

test("rejects non-Pinterest pages", () => {
  assert.throws(() => validatePinterestPageUrl("https://example.com/pin/1"), /INVALID_PINTEREST_URL/);
  assert.throws(() => validatePinterestPageUrl("http://pinterest.com/pin/1"), /INVALID_PINTEREST_URL/);
});

test("accepts only HTTPS Pinterest video CDN MP4 URLs", () => {
  assert.equal(validatePinimgVideoUrl("https://v1.pinimg.com/videos/test.mp4").pathname, "/videos/test.mp4");
  assert.throws(() => validatePinimgVideoUrl("https://example.com/videos/test.mp4"), /INVALID_VIDEO_URL/);
  assert.throws(() => validatePinimgVideoUrl("https://v1.pinimg.com/images/test.jpg"), /INVALID_VIDEO_URL/);
});

test("classifies explicit AI labels as verified", () => {
  assert.equal(classifyPinterestAiText("AI-generated cinematic video").classification, "AI_VERIFIED");
});

test("classifies AI tools with video context as likely", () => {
  assert.equal(classifyPinterestAiText("Made with Kling AI video").classification, "AI_LIKELY");
});

test("does not classify ordinary video as AI", () => {
  assert.equal(classifyPinterestAiText("A beautiful travel video from Paris").classification, "UNKNOWN");
});
