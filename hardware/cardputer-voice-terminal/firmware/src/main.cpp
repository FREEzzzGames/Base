#include <Arduino.h>
#include <WiFi.h>
#include <M5Cardputer.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <FastLED.h>
#include <U8g2lib.h>
#include <freertos/FreeRTOS.h>
#include <freertos/stream_buffer.h>
#include <cstring>
#include <vector>
#include <Preferences.h>

namespace {
struct DeviceConfig {
  String wifiSsid;
  String wifiPassword;
  String hubHost;
  String deviceToken;
};
DeviceConfig deviceConfig;
Preferences preferences;
bool setupMode = false;
uint8_t setupField = 0;
String setupInput;
const char* setupLabels[] = {"Wi-Fi SSID", "Wi-Fi password", "HUB IPv4 / host", "Device token"};

constexpr uint32_t kSampleRate = 16000;
constexpr size_t kSamplesPerFrame = 320;  // 20 ms mono PCM16
constexpr size_t kFrameBytes = kSamplesPerFrame * sizeof(int16_t);
constexpr uint8_t kLedDataPin = 21;       // SK6812 data GPIO21 on Cardputer ADV

struct Palette {
  const char* name;
  uint16_t background;
  uint16_t foreground;
  uint16_t accent;
  CRGB led;
};

const Palette kPalettes[] = {
  {"red",    0x0000, 0xFFFF, 0xF800, CRGB(255, 35, 35)},
  {"orange", 0x0000, 0xFFFF, 0xFD20, CRGB(255, 125, 0)},
  {"yellow", 0x0000, 0xFFFF, 0xFFE0, CRGB(255, 220, 0)},
  {"green",  0x0000, 0xFFFF, 0x07E0, CRGB(0, 255, 80)},
  {"blue",   0x0000, 0xFFFF, 0x249F, CRGB(35, 110, 255)},
  {"indigo", 0x0000, 0xFFFF, 0x4810, CRGB(75, 0, 130)},
  {"violet", 0x0000, 0xFFFF, 0xA81F, CRGB(175, 70, 255)},
  {"white",  0xFFFF, 0x0000, 0x0000, CRGB(255, 255, 255)},
  {"black",  0x0000, 0xFFFF, 0xFFFF, CRGB(235, 235, 235)}
};

CRGB led[1];
WebSocketsClient socketClient;
StreamBufferHandle_t speakerStream = nullptr;
volatile bool pttActive = false;
volatile bool replyActive = false;
volatile bool replyEnded = false;
volatile uint32_t replySampleRate = kSampleRate;
volatile bool conversationActive = false;
bool hubStarted = false;
bool hubAuthenticated = false;
uint32_t lastWifiRetryAt = 0;
bool previousSpace = false;
uint8_t volumePercent = 72;
uint8_t paletteIndex = 5;
uint32_t lastScrollAt = 0;
int scrollOffset = 0;
String connectionState = "Wi-Fi connecting";
String lastUserText;
String lastAssistantText;

static const lgfx::U8g2font kCyrillicFont(u8g2_font_6x12_t_cyrillic);

const Palette& palette() {
  return kPalettes[paletteIndex];
}

void updateLed() {
  led[0] = conversationActive ? palette().led : CRGB::Black;
  FastLED.show();
}

void setPalette(const char* name) {
  for (uint8_t i = 0; i < sizeof(kPalettes) / sizeof(kPalettes[0]); ++i) {
    if (strcmp(name, kPalettes[i].name) == 0) {
      paletteIndex = i;
      updateLed();
      return;
    }
  }
}

void drawWrapped(const String& value, int x, int y, int maxWidth, int maxLines, int lineHeight) {
  if (value.length() == 0) return;
  std::vector<String> lines;
  String line;
  String normalized = value;
  normalized.replace('\n', ' ');
  normalized.replace('\r', ' ');
  int pos = 0;
  while (pos < static_cast<int>(normalized.length())) {
    int next = normalized.indexOf(' ', pos);
    if (next < 0) next = normalized.length();
    String word = normalized.substring(pos, next);
    String candidate = line.length() == 0 ? word : line + " " + word;
    if (line.length() > 0 && M5Cardputer.Display.textWidth(candidate) > maxWidth) {
      lines.push_back(line);
      line = word;
    } else {
      line = candidate;
    }
    pos = next + 1;
  }
  if (line.length() > 0) lines.push_back(line);

  int first = lines.size() > maxLines ? static_cast<int>(lines.size()) - maxLines : 0;
  first = max(0, first - scrollOffset);
  int last = min(static_cast<int>(lines.size()), first + maxLines);
  for (int i = first; i < last; ++i) {
    M5Cardputer.Display.drawString(lines[i], x, y);
    y += lineHeight;
  }
}

void renderScreen() {
  const auto& p = palette();
  M5Cardputer.Display.fillScreen(p.background);
  M5Cardputer.Display.setFont(&kCyrillicFont);
  M5Cardputer.Display.setTextSize(1);
  M5Cardputer.Display.setTextColor(p.accent, p.background);
  M5Cardputer.Display.drawString("FREEzzz HUB", 4, 2);
  M5Cardputer.Display.setTextColor(p.foreground, p.background);
  M5Cardputer.Display.drawString(connectionState, 150, 2);
  M5Cardputer.Display.drawFastHLine(4, 15, 232, p.accent);

  M5Cardputer.Display.setTextColor(p.accent, p.background);
  M5Cardputer.Display.drawString("YOU", 4, 20);
  M5Cardputer.Display.setTextColor(p.foreground, p.background);
  drawWrapped(lastUserText, 4, 33, 232, 3, 13);

  M5Cardputer.Display.drawFastHLine(4, 76, 232, p.accent);
  M5Cardputer.Display.setTextColor(p.accent, p.background);
  M5Cardputer.Display.drawString("AI", 4, 80);
  M5Cardputer.Display.setTextColor(p.foreground, p.background);
  drawWrapped(lastAssistantText, 4, 93, 232, 3, 13);
}

void sendJson(JsonDocument& doc) {
  String payload;
  serializeJson(doc, payload);
  socketClient.sendTXT(payload);
}

void sendSimple(const char* type) {
  JsonDocument doc;
  doc["type"] = type;
  sendJson(doc);
}

void startCapture() {
  if (!socketClient.isConnected() || !hubAuthenticated || replyActive || pttActive) return;
  M5Cardputer.Speaker.end();  // Cardputer ADV shares the audio path between mic and speaker.
  if (!M5Cardputer.Mic.begin()) {
    connectionState = "Mic error";
    renderScreen();
    return;
  }
  pttActive = true;
  conversationActive = true;
  updateLed();
  connectionState = "Listening";
  renderScreen();
  sendSimple("audio.start");
}

void stopCapture() {
  if (!pttActive) return;
  pttActive = false;
  M5Cardputer.Mic.end();
  sendSimple("audio.end");
  connectionState = "Processing";
  renderScreen();
}

void handleServerText(uint8_t* payload, size_t length) {
  JsonDocument doc;
  if (deserializeJson(doc, payload, length)) return;
  const char* type = doc["type"] | "";
  if (strcmp(type, "session.state") == 0) {
    const char* state = doc["state"] | "Ready";
    if (strcmp(state, "Ready") == 0) hubAuthenticated = true;
    connectionState = state;
  } else if (strcmp(type, "user.text") == 0) {
    lastUserText = String((const char*)(doc["text"] | ""));
    scrollOffset = 0;
  } else if (strcmp(type, "assistant.text") == 0) {
    lastAssistantText = String((const char*)(doc["text"] | ""));
    scrollOffset = 0;
    connectionState = "Speaking";
    conversationActive = true;
    updateLed();
  } else if (strcmp(type, "device.theme") == 0) {
    setPalette(doc["theme"] | "blue");
  } else if (strcmp(type, "device.volume") == 0) {
    volumePercent = constrain(static_cast<int>(doc["volume"] | 72), 0, 100);
    M5Cardputer.Speaker.setVolume(static_cast<uint8_t>(volumePercent * 255 / 100));
  } else if (strcmp(type, "audio.reply.begin") == 0) {
    replySampleRate = doc["sampleRate"] | kSampleRate;
    replyEnded = false;
    replyActive = true;
    if (speakerStream) xStreamBufferReset(speakerStream);
    M5Cardputer.Mic.end();
    M5Cardputer.Speaker.begin();
    M5Cardputer.Speaker.setVolume(static_cast<uint8_t>(volumePercent * 255 / 100));
    connectionState = "Speaking";
    conversationActive = true;
    updateLed();
  } else if (strcmp(type, "audio.reply.end") == 0) {
    replyEnded = true;
  } else if (strcmp(type, "error") == 0) {
    connectionState = "Server error";
    if (!replyActive) {
      conversationActive = false;
      updateLed();
    }
  }
  renderScreen();
}

void onSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED: {
      hubAuthenticated = false;
      connectionState = "Authenticating";
      JsonDocument doc;
      doc["type"] = "auth";
      doc["token"] = deviceConfig.deviceToken;
      sendJson(doc);
      renderScreen();
      break;
    }
    case WStype_DISCONNECTED:
      hubAuthenticated = false;
      connectionState = "Disconnected";
      if (pttActive) M5Cardputer.Mic.end();
      pttActive = false;
      replyActive = false;
      replyEnded = false;
      conversationActive = false;
      updateLed();
      renderScreen();
      break;
    case WStype_TEXT:
      handleServerText(payload, length);
      break;
    case WStype_BIN:
      if (replyActive && speakerStream) {
        xStreamBufferSend(speakerStream, payload, length, 0);
      }
      break;
    case WStype_ERROR:
      connectionState = "Network error";
      renderScreen();
      break;
    default:
      break;
  }
}

void speakerTask(void*) {
  int16_t pcm[kSamplesPerFrame];
  for (;;) {
    if (!replyActive || !speakerStream) {
      vTaskDelay(pdMS_TO_TICKS(10));
      continue;
    }
    const size_t bytes = xStreamBufferReceive(
      speakerStream, reinterpret_cast<uint8_t*>(pcm), sizeof(pcm), pdMS_TO_TICKS(40));
    if (bytes >= sizeof(int16_t)) {
      while (M5Cardputer.Speaker.isPlaying()) vTaskDelay(1);
      M5Cardputer.Speaker.playRaw(pcm, bytes / sizeof(int16_t), replySampleRate, false, 1, 0);
      continue;
    }
    if (replyEnded && !M5Cardputer.Speaker.isPlaying()) {
      M5Cardputer.Speaker.end();
      replyActive = false;
      replyEnded = false;
      M5Cardputer.Mic.end();
      conversationActive = false;
      updateLed();
      connectionState = "Ready";
      renderScreen();
    }
    vTaskDelay(pdMS_TO_TICKS(2));
  }
}

void startHubSocket() {
  if (hubStarted || WiFi.status() != WL_CONNECTED) return;
  socketClient.begin(deviceConfig.hubHost.c_str(), 8765, "/cardputer");
  socketClient.onEvent(onSocketEvent);
  socketClient.setReconnectInterval(3000);
  socketClient.enableHeartbeat(15000, 3000, 2);
  hubStarted = true;
  connectionState = "Connecting HUB";
  renderScreen();
}

void loadConfig() {
  preferences.begin("freezzz", true);
  deviceConfig.wifiSsid = preferences.getString("ssid", "");
  deviceConfig.wifiPassword = preferences.getString("pass", "");
  deviceConfig.hubHost = preferences.getString("hub", "");
  deviceConfig.deviceToken = preferences.getString("token", "");
  preferences.end();
}

void saveConfig() {
  preferences.begin("freezzz", false);
  preferences.putString("ssid", deviceConfig.wifiSsid);
  preferences.putString("pass", deviceConfig.wifiPassword);
  preferences.putString("hub", deviceConfig.hubHost);
  preferences.putString("token", deviceConfig.deviceToken);
  preferences.end();
}

void drawSetup() {
  M5Cardputer.Display.fillScreen(TFT_BLACK);
  M5Cardputer.Display.setFont(&kCyrillicFont);
  M5Cardputer.Display.setTextColor(TFT_CYAN, TFT_BLACK);
  M5Cardputer.Display.drawString("FREEzzz HUB / SETUP", 4, 4);
  M5Cardputer.Display.setTextColor(TFT_WHITE, TFT_BLACK);
  M5Cardputer.Display.drawString(String("Field ") + String(setupField + 1) + "/4", 4, 23);
  M5Cardputer.Display.drawString(setupLabels[setupField], 4, 43);
  String shown = setupInput;
  if (setupField == 1) { shown = ""; for (size_t i = 0; i < setupInput.length(); ++i) shown += '*'; }
  if (shown.length() > 30) shown = shown.substring(shown.length() - 30);
  M5Cardputer.Display.drawString(shown + "_", 4, 62);
  M5Cardputer.Display.setTextColor(TFT_YELLOW, TFT_BLACK);
  M5Cardputer.Display.drawString("Type value, ENTER=next", 4, 99);
  M5Cardputer.Display.drawString("BACKSPACE=delete", 4, 116);
}

void setupWizard() {
  setupMode = true;
  setupField = 0;
  setupInput = "";
  connectionState = "Setup";
  drawSetup();
  while (setupMode) {
    M5Cardputer.update();
    if (M5Cardputer.Keyboard.isChange() && M5Cardputer.Keyboard.isPressed()) {
      auto keys = M5Cardputer.Keyboard.keysState();
      if (keys.backspace || keys.del) {
        if (setupInput.length()) setupInput.remove(setupInput.length() - 1);
      }
      for (char c : keys.word) {
        if (c >= 32 && c <= 126 && setupInput.length() < 96) setupInput += c;
      }
      if (keys.enter) {
        if (setupInput.length()) {
          switch (setupField) {
            case 0: deviceConfig.wifiSsid = setupInput; break;
            case 1: deviceConfig.wifiPassword = setupInput; break;
            case 2: deviceConfig.hubHost = setupInput; break;
            case 3: deviceConfig.deviceToken = setupInput; break;
          }
          setupInput = "";
          if (++setupField >= 4) {
            saveConfig();
            setupMode = false;
            break;
          }
        }
      }
      drawSetup();
    }
    delay(5);
  }
}

void connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.begin(deviceConfig.wifiSsid.c_str(), deviceConfig.wifiPassword.c_str());
  connectionState = "Wi-Fi connecting";
  renderScreen();
  const uint32_t started = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - started < 15000) {
    delay(100);
    M5Cardputer.update();
  }
  if (WiFi.status() == WL_CONNECTED) {
    startHubSocket();
  } else {
    connectionState = "Wi-Fi retrying";
    lastWifiRetryAt = millis();
  }
  renderScreen();
}
}  // namespace

void setup() {
  auto config = M5.config();
  config.serial_baudrate = 115200;
  M5Cardputer.begin(config, true);
  Serial.begin(115200);
  M5Cardputer.Display.setRotation(1);
  M5Cardputer.Display.setFont(&kCyrillicFont);
  M5Cardputer.Display.setTextSize(1);

  FastLED.addLeds<SK6812, kLedDataPin, GRB>(led, 1);
  FastLED.setBrightness(28);
  updateLed();

  M5Cardputer.Speaker.setVolume(static_cast<uint8_t>(volumePercent * 255 / 100));
  M5Cardputer.Speaker.end();
  loadConfig();
  M5Cardputer.update();
  if (deviceConfig.wifiSsid.isEmpty() || deviceConfig.hubHost.isEmpty() || deviceConfig.deviceToken.isEmpty() ||
      M5Cardputer.BtnA.isPressed()) {
    setupWizard();
  }
  speakerStream = xStreamBufferCreate(8192, 1);
  if (speakerStream) {
    xTaskCreatePinnedToCore(speakerTask, "voice-speaker", 4096, nullptr, 2, nullptr, 0);
  }

  lastAssistantText = "Удерживайте ПРОБЕЛ для разговора";
  renderScreen();
  connectWifi();
}

void loop() {
  M5Cardputer.update();
  if (WiFi.status() != WL_CONNECTED && millis() - lastWifiRetryAt > 5000) {
    lastWifiRetryAt = millis();
    WiFi.disconnect();
    WiFi.begin(deviceConfig.wifiSsid.c_str(), deviceConfig.wifiPassword.c_str());
    connectionState = "Wi-Fi reconnecting";
    renderScreen();
  } else if (WiFi.status() == WL_CONNECTED && !hubStarted) {
    startHubSocket();
  }
  if (hubStarted) socketClient.loop();

  const bool spaceDown = M5Cardputer.Keyboard.isKeyPressed(' ');
  if (spaceDown && !previousSpace) startCapture();
  if (!spaceDown && previousSpace) stopCapture();
  previousSpace = spaceDown;

  if (pttActive && socketClient.isConnected()) {
    static int16_t frame[kSamplesPerFrame];
    if (M5Cardputer.Mic.record(frame, kSamplesPerFrame, kSampleRate)) {
      socketClient.sendBIN(reinterpret_cast<uint8_t*>(frame), kFrameBytes);
    }
  }

  if (M5Cardputer.Keyboard.isKeyPressed(';') && millis() - lastScrollAt > 180) {
    ++scrollOffset;
    lastScrollAt = millis();
    renderScreen();
  } else if (M5Cardputer.Keyboard.isKeyPressed('.') && millis() - lastScrollAt > 180) {
    if (scrollOffset > 0) --scrollOffset;
    lastScrollAt = millis();
    renderScreen();
  }
  delay(1);
}
