import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyPinterestAiText,
  extractPinterestVideoUrl,
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

test("extracts available MP4 even when AI origin is unconfirmed", () => {
  const html = '<meta property="og:description" content="Edited with AI">' +
    '<script>{"contentUrl":"https://v1.pinimg.com/videos/test-video.mp4"}</script>';
  assert.equal(classifyPinterestAiText("A video from a creator").classification, "UNKNOWN");
  assert.equal(extractPinterestVideoUrl(html), "https://v1.pinimg.com/videos/test-video.mp4");
});

test("extracts MP4 URLs from escaped Pinterest page data", () => {
  const html = String.raw`"url":"https:\/\/v1.pinimg.com\/videos\/escaped.mp4"`;
  assert.equal(extractPinterestVideoUrl(html), "https://v1.pinimg.com/videos/escaped.mp4");
});


test("extracts a video URL from Pinterest nested video_list JSON", () => {
  const html = String.raw\`<script type="application/json">{"pin":{"videos":{"video_list":{"V_720P":{"url":"https:\u002F\u002Fv1.pinimg.com\u002Fvideos\u002Fjson-video.mp4"}}}}}</script>\`;
  assert.equal(extractPinterestVideoUrl(html), "https://v1.pinimg.com/videos/json-video.mp4");
});

test("extracts a video URL from Pinterest executable embedded state JSON", () => {
  const html = String.raw\`<script>window.__PWS_DATA__ = {"resource_response":{"data":{"videos":{"video_list":{"V_1080P":{"url":"https:\u002F\u002Fv1.pinimg.com\u002Fvideos\u002Fstate-video.mp4"}}}}}};</script>\`;
  assert.equal(extractPinterestVideoUrl(html), "https://v1.pinimg.com/videos/state-video.mp4");
});

test("ignores non-Pinterest and non-MP4 URLs inside JSON", () => {
  const html = '<script type="application/json">' +
    '{"videos":{"video_list":{"a":{"url":"https://example.com/video.mp4"},"b":{"url":"https://v1.pinimg.com/images/photo.jpg"}}}}</script>';
  assert.equal(extractPinterestVideoUrl(html), null);
});
