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
#include <algorithm>
#include <vector>
#include <Preferences.h>
#if __has_include("device_config.h")
#include "device_config.h"
#endif
#if __has_include("tls_ca.h")
#include "tls_ca.h"
#define FREEZZ_HAS_TLS_CA 1
#else
#define FREEZZ_HAS_TLS_CA 0
#endif

namespace {
#ifndef FREEZZ_HUB_HOST
#define FREEZZ_HUB_HOST ""
#endif
#ifndef FREEZZ_HUB_PORT
#define FREEZZ_HUB_PORT 8765
#endif
#ifndef FREEZZ_DEVICE_TOKEN
#define FREEZZ_DEVICE_TOKEN ""
#endif
#ifndef FREEZZ_HUB_TLS
#define FREEZZ_HUB_TLS 0
#endif

struct DeviceConfig {
  String wifiSsid;  // Temporary selection while provisioning a new network.
  String hubHost = FREEZZ_HUB_HOST;
  uint16_t hubPort = FREEZZ_HUB_PORT;
  String deviceToken = FREEZZ_DEVICE_TOKEN;
};
struct WifiCredential {
  String ssid;
  String password;
};
DeviceConfig deviceConfig;
Preferences preferences;
std::vector<WifiCredential> knownNetworks;
bool setupMode = false;
uint8_t setupField = 0;
String setupInput;
String setupStatus;
std::vector<String> wifiNetworks;
int wifiSelection = 0;
constexpr size_t kMaxKnownNetworks = 8;

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
    const char* detail = doc["message"] | "Unknown gateway error";
    lastAssistantText = String("Ошибка: ") + detail;
    scrollOffset = 0;
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
  socketClient.onEvent(onSocketEvent);
#if FREEZZ_HUB_TLS
#if FREEZZ_HAS_TLS_CA
  socketClient.beginSslWithCA(deviceConfig.hubHost.c_str(), deviceConfig.hubPort, "/cardputer", FREEZZ_TLS_CA_CERT);
#else
  connectionState = "TLS CA missing";
  renderScreen();
  return;
#endif
#else
  socketClient.begin(deviceConfig.hubHost.c_str(), deviceConfig.hubPort, "/cardputer");
#endif
  socketClient.setReconnectInterval(3000);
  socketClient.enableHeartbeat(15000, 3000, 2);
  hubStarted = true;
  connectionState = "Connecting HUB";
  renderScreen();
}

void loadConfig() {
  preferences.begin("freezzz", true);
  if (deviceConfig.hubHost.isEmpty()) deviceConfig.hubHost = preferences.getString("hub", "");
  deviceConfig.hubPort = preferences.getUShort("port", FREEZZ_HUB_PORT);
  if (deviceConfig.deviceToken.isEmpty()) deviceConfig.deviceToken = preferences.getString("token", "");
  const uint8_t count = preferences.getUChar("wifiCount", 0);
  for (uint8_t i = 0; i < count && i < kMaxKnownNetworks; ++i) {
    const String ssid = preferences.getString((String("s") + i).c_str(), "");
    const String pass = preferences.getString((String("p") + i).c_str(), "");
    if (!ssid.isEmpty()) knownNetworks.push_back({ssid, pass});
  }
  // One-time migration from the previous single-network configuration.
  if (knownNetworks.empty()) {
    const String oldSsid = preferences.getString("ssid", "");
    if (!oldSsid.isEmpty()) knownNetworks.push_back({oldSsid, preferences.getString("pass", "")});
  }
  preferences.end();
}

void saveKnownNetworks() {
  preferences.begin("freezzz", false);
  preferences.putUChar("wifiCount", static_cast<uint8_t>(knownNetworks.size()));
  for (size_t i = 0; i < knownNetworks.size(); ++i) {
    preferences.putString((String("s") + i).c_str(), knownNetworks[i].ssid);
    preferences.putString((String("p") + i).c_str(), knownNetworks[i].password);
  }
  for (size_t i = knownNetworks.size(); i < kMaxKnownNetworks; ++i) {
    preferences.remove((String("s") + i).c_str());
    preferences.remove((String("p") + i).c_str());
  }
  preferences.remove("ssid");
  preferences.remove("pass");
  preferences.end();
}

void rememberNetwork(const String& ssid, const String& password) {
  for (auto& item : knownNetworks) {
    if (item.ssid == ssid) {
      item.password = password;
      saveKnownNetworks();
      return;
    }
  }
  if (knownNetworks.size() >= kMaxKnownNetworks) knownNetworks.erase(knownNetworks.begin());
  knownNetworks.push_back({ssid, password});
  saveKnownNetworks();
}

void scanWifiNetworks() {
  wifiNetworks.clear();
  WiFi.mode(WIFI_STA);
  WiFi.disconnect(false, false);
  const int count = WiFi.scanNetworks(false, true);
  for (int i = 0; i < count; ++i) {
    if (WiFi.encryptionType(i) == WIFI_AUTH_OPEN) continue;
    const String ssid = WiFi.SSID(i);
    if (ssid.isEmpty()) continue;
    if (std::find(wifiNetworks.begin(), wifiNetworks.end(), ssid) == wifiNetworks.end()) {
      wifiNetworks.push_back(ssid);
    }
  }
  WiFi.scanDelete();
  wifiNetworks.push_back("[ RESCAN ]");
  wifiSelection = 0;
}

bool connectToNetwork(const String& ssid, const String& password, uint32_t timeoutMs) {
  WiFi.disconnect(false, false);
  WiFi.begin(ssid.c_str(), password.c_str());
  const uint32_t started = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - started < timeoutMs) {
    delay(100);
    M5Cardputer.update();
  }
  return WiFi.status() == WL_CONNECTED;
}

bool connectKnownNetworks() {
  if (knownNetworks.empty()) return false;
  connectionState = "Scanning Wi-Fi";
  renderScreen();
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  scanWifiNetworks();
  for (const auto& network : knownNetworks) {
    if (std::find(wifiNetworks.begin(), wifiNetworks.end(), network.ssid) == wifiNetworks.end()) continue;
    connectionState = "Wi-Fi: " + network.ssid;
    renderScreen();
    if (connectToNetwork(network.ssid, network.password, 12000)) {
      setupMode = false;
      return true;
    }
  }
  return false;
}

void drawSetup() {
  M5Cardputer.Display.fillScreen(TFT_BLACK);
  M5Cardputer.Display.setFont(&kCyrillicFont);
  M5Cardputer.Display.setTextColor(TFT_CYAN, TFT_BLACK);
  M5Cardputer.Display.drawString("FREEzzz HUB / WIFI", 4, 3);
  M5Cardputer.Display.setTextColor(TFT_WHITE, TFT_BLACK);
  if (setupField == 0) {
    M5Cardputer.Display.drawString("Known networks: " + String(knownNetworks.size()), 4, 19);
    const int first = max(0, min(wifiSelection - 2, (int)wifiNetworks.size() - 5));
    for (int i = first; i < min((int)wifiNetworks.size(), first + 5); ++i) {
      M5Cardputer.Display.setTextColor(i == wifiSelection ? TFT_YELLOW : TFT_WHITE, TFT_BLACK);
      M5Cardputer.Display.drawString(String(i == wifiSelection ? "> " : "  ") + wifiNetworks[i], 4, 37 + (i - first) * 15);
    }
    M5Cardputer.Display.setTextColor(TFT_CYAN, TFT_BLACK);
    M5Cardputer.Display.drawString("; / . move  ENTER select", 4, 116);
  } else {
    M5Cardputer.Display.drawString("Network: " + deviceConfig.wifiSsid, 4, 24);
    M5Cardputer.Display.drawString("Wi-Fi password:", 4, 45);
    String masked;
    for (size_t i = 0; i < setupInput.length(); ++i) masked += '*';
    M5Cardputer.Display.drawString(masked + "_", 4, 66);
    M5Cardputer.Display.setTextColor(TFT_YELLOW, TFT_BLACK);
    M5Cardputer.Display.drawString(setupStatus.isEmpty() ? "ENTER connect  DEL erase" : setupStatus, 4, 100);
  }
}

void setupWizard() {
  setupMode = true;
  setupField = 0;
  setupInput = "";
  setupStatus = "";
  connectionState = "Wi-Fi setup";
  scanWifiNetworks();
  drawSetup();
  while (setupMode) {
    M5Cardputer.update();
    if (M5Cardputer.Keyboard.isChange() && M5Cardputer.Keyboard.isPressed()) {
      auto keys = M5Cardputer.Keyboard.keysState();
      if (setupField == 0) {
        if (std::find(keys.word.begin(), keys.word.end(), ';') != keys.word.end() && wifiSelection + 1 < (int)wifiNetworks.size()) ++wifiSelection;
        if (std::find(keys.word.begin(), keys.word.end(), '.') != keys.word.end() && wifiSelection > 0) --wifiSelection;
        if (keys.enter && wifiSelection >= 0 && wifiSelection < (int)wifiNetworks.size()) {
          const String selected = wifiNetworks[wifiSelection];
          if (selected == "[ RESCAN ]") {
            scanWifiNetworks();
          } else {
            deviceConfig.wifiSsid = selected;
            setupInput = "";
            setupStatus = "";
            setupField = 1;
          }
        }
      } else {
        if (keys.del && setupInput.length()) setupInput.remove(setupInput.length() - 1);
        for (char ch : keys.word) {
          if (ch >= 32 && ch <= 126 && setupInput.length() < 63) setupInput += ch;
        }
        if (keys.enter && setupInput.length()) {
          setupStatus = "Connecting...";
          drawSetup();
          if (connectToNetwork(deviceConfig.wifiSsid, setupInput, 15000)) {
            rememberNetwork(deviceConfig.wifiSsid, setupInput);
            setupMode = false;
          } else {
            setupStatus = "Failed - retry password";
            WiFi.disconnect(false, false);
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
  if (!connectKnownNetworks()) {
    setupWizard();
  }
  if (WiFi.status() == WL_CONNECTED) {
    connectionState = "Wi-Fi connected";
    startHubSocket();
  } else {
    connectionState = "Wi-Fi unavailable";
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
  M5Cardputer.Display.setRotation(0);
  M5Cardputer.Display.setFont(&kCyrillicFont);
  M5Cardputer.Display.setTextSize(1);

  FastLED.addLeds<SK6812, kLedDataPin, GRB>(led, 1);
  FastLED.setBrightness(28);
  updateLed();

  M5Cardputer.Speaker.setVolume(static_cast<uint8_t>(volumePercent * 255 / 100));
  M5Cardputer.Speaker.end();
  loadConfig();
  M5Cardputer.update();
  if (deviceConfig.hubHost.isEmpty() || deviceConfig.deviceToken.isEmpty() || deviceConfig.hubPort == 0) {
    connectionState = "HUB config missing";
    renderScreen();
    return;
  }
  if (M5Cardputer.BtnA.isPressed()) setupWizard();
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
  if (WiFi.status() != WL_CONNECTED && millis() - lastWifiRetryAt > 15000) {
    lastWifiRetryAt = millis();
    if (!connectKnownNetworks()) {
      setupMode = true;
      setupWizard();
    }
    if (WiFi.status() == WL_CONNECTED) {
      connectionState = "Wi-Fi connected";
      renderScreen();
    }
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
