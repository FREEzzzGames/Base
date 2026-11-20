#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "$(id -u)" -eq 0 ]]; then
  echo "Run as the normal Ubuntu user (monk), not with sudo."
  exit 1
fi
for command in sudo curl git cmake node npm python3 openssl ip; do
  command -v "$command" >/dev/null 2>&1 || { echo "Missing command: $command"; exit 1; }
done

NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
if (( NODE_MAJOR < 22 )); then
  echo "Node.js 22+ is required; found $(node --version)."
  exit 1
fi

RUN_USER="$USER"
RUN_HOME="$(getent passwd "$RUN_USER" | cut -d: -f6)"
ROOT="/opt/freezzz-cardputer"
SERVER="$ROOT/server"
FIRMWARE="$ROOT/firmware"
WHISPER="/opt/whisper.cpp"
PIPER="/opt/piper"
HUB_IP="$(ip -4 route get 1.1.1.1 | awk '{for(i=1;i<=NF;i++) if($i=="src"){print $(i+1); exit}}')"
[[ -n "$HUB_IP" ]] || { echo "Could not determine HUB LAN IPv4 address."; exit 1; }

echo "HUB LAN address: $HUB_IP"
read -r -s -p "AgentWebUI login password: " AGENT_PASSWORD
echo
[[ -n "$AGENT_PASSWORD" ]] || { echo "AgentWebUI password is required."; exit 1; }
read -r -p "2.4 GHz Wi-Fi SSID for Cardputer: " WIFI_SSID
read -r -s -p "Wi-Fi password: " WIFI_PASSWORD
echo
[[ -n "$WIFI_SSID" && -n "$WIFI_PASSWORD" ]] || { echo "Wi-Fi SSID and password are required."; exit 1; }

DEVICE_TOKEN="$(openssl rand -hex 32)"
export AGENT_PASSWORD WIFI_SSID WIFI_PASSWORD DEVICE_TOKEN HUB_IP RUN_USER RUN_HOME ROOT SERVER FIRMWARE WHISPER PIPER

echo "== Install build prerequisites =="
sudo apt-get update
sudo apt-get install -y git cmake build-essential python3-venv curl

echo "== Build Whisper.cpp and download Russian speech model =="
if [[ ! -d "$WHISPER/.git" ]]; then
  sudo git clone --depth 1 https://github.com/ggml-org/whisper.cpp.git "$WHISPER"
fi
sudo cmake -S "$WHISPER" -B "$WHISPER/build" -DCMAKE_BUILD_TYPE=Release
sudo cmake --build "$WHISPER/build" -j2
if [[ ! -s "$WHISPER/models/ggml-small.bin" ]]; then
  (cd "$WHISPER" && sudo bash models/download-ggml-model.sh small)
fi
test -x "$WHISPER/build/bin/whisper-cli"
test -s "$WHISPER/models/ggml-small.bin"

echo "== Install Piper TTS and Russian voice =="
sudo mkdir -p "$PIPER/voices"
if [[ ! -x "$PIPER/venv/bin/piper" ]]; then
  sudo python3 -m venv "$PIPER/venv"
  sudo "$PIPER/venv/bin/pip" install --upgrade pip
  sudo "$PIPER/venv/bin/pip" install piper-tts
fi
if [[ ! -s "$PIPER/voices/ru_RU-irina-medium.onnx" ]]; then
  sudo "$PIPER/venv/bin/python" -m piper.download_voices ru_RU-irina-medium --data-dir "$PIPER/voices"
fi
test -x "$PIPER/venv/bin/piper"
test -s "$PIPER/voices/ru_RU-irina-medium.onnx"

echo "== Fetch Cardputer gateway and firmware sources =="
sudo mkdir -p "$SERVER" "$FIRMWARE/src" "$FIRMWARE/include"
sudo chown -R "$RUN_USER:$RUN_USER" "$ROOT"
RAW="https://raw.githubusercontent.com/FREEzzzGames/Base/main/hardware/cardputer-voice-terminal"
for file in index.mjs package.json; do
  curl -fsSL "$RAW/server/$file" -o "$SERVER/$file"
done
curl -fsSL "$RAW/server/.env.example" -o "$SERVER/.env.example"
curl -fsSL "$RAW/firmware/platformio.ini" -o "$FIRMWARE/platformio.ini"
curl -fsSL "$RAW/firmware/src/main.cpp" -o "$FIRMWARE/src/main.cpp"

echo "== Write private gateway and firmware credentials =="
python3 - <<'PY'
import json, os
from pathlib import Path

server = Path(os.environ["SERVER"])
template = (server / ".env.example").read_text()
values = {
    "HOST": "0.0.0.0",
    "PORT": "8765",
    "DEVICE_TOKEN": os.environ["DEVICE_TOKEN"],
    "WHISPER_CLI": os.environ["WHISPER"] + "/build/bin/whisper-cli",
    "WHISPER_MODEL": os.environ["WHISPER"] + "/models/ggml-small.bin",
    "PIPER_BIN": os.environ["PIPER"] + "/venv/bin/piper",
    "PIPER_MODEL": os.environ["PIPER"] + "/voices/ru_RU-irina-medium.onnx",
    "AGENTWEBUI_URL": "http://" + os.environ["HUB_IP"] + ":3000",
    "AGENTWEBUI_PASSWORD": os.environ["AGENT_PASSWORD"],
    "AGENTWEBUI_TARGET": "",
    "AGENTWEBUI_MODEL": "local/small",
    "AI_CHAT_URL": "",
    "AI_CHAT_MODEL": "",
    "AI_CHAT_API_KEY": "",
}
lines = []
for line in template.splitlines():
    key = line.split("=", 1)[0] if "=" in line and not line.lstrip().startswith("#") else None
    if key in values:
        lines.append(key + "=" + json.dumps(values[key], ensure_ascii=False))
    else:
        lines.append(line)
(server / ".env").write_text("\n".join(lines) + "\n")
(server / ".env").chmod(0o600)

firmware = Path(os.environ["FIRMWARE"])
secrets = (
    "#pragma once\n"
    "#define WIFI_SSID " + json.dumps(os.environ["WIFI_SSID"], ensure_ascii=False) + "\n"
    "#define WIFI_PASSWORD " + json.dumps(os.environ["WIFI_PASSWORD"], ensure_ascii=False) + "\n"
    "#define HUB_HOST " + json.dumps(os.environ["HUB_IP"]) + "\n"
    "#define HUB_PORT 8765\n"
    '#define HUB_PATH "/cardputer"\n'
    "#define DEVICE_TOKEN " + json.dumps(os.environ["DEVICE_TOKEN"]) + "\n"
)
(firmware / "include" / "secrets.h").write_text(secrets)
PY
chmod 600 "$FIRMWARE/include/secrets.h"

echo "== Install gateway dependencies =="
cd "$SERVER"
npm install --omit=dev

echo "== Install PlatformIO and compile the device firmware =="
sudo -u "$RUN_USER" python3 -m venv "$ROOT/platformio-venv"
sudo -u "$RUN_USER" "$ROOT/platformio-venv/bin/pip" install --upgrade platformio
sudo -u "$RUN_USER" "$ROOT/platformio-venv/bin/pio" run -d "$FIRMWARE"
BIN="$FIRMWARE/.pio/build/cardputer-adv/firmware.bin"
test -s "$BIN"
cp "$BIN" "$RUN_HOME/Cardputer-ADV.bin"
chown "$RUN_USER:$RUN_USER" "$RUN_HOME/Cardputer-ADV.bin"

echo "== Install and start systemd gateway service =="
NODE_BIN="$(command -v node)"
sudo tee /etc/systemd/system/freezzz-cardputer-gateway.service >/dev/null <<UNIT
[Unit]
Description=FREEzzz Cardputer Voice Gateway
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$RUN_USER
WorkingDirectory=$SERVER
ExecStart=$NODE_BIN --env-file=.env index.mjs
Restart=always
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ReadWritePaths=$SERVER /tmp

[Install]
WantedBy=multi-user.target
UNIT
sudo ufw allow from 192.168.0.0/24 to any port 8765 proto tcp >/dev/null 2>&1 || true
sudo systemctl daemon-reload
sudo systemctl enable --now freezzz-cardputer-gateway.service
sleep 2
curl -fsS --max-time 5 http://127.0.0.1:8765/health

echo
echo "=== INSTALLATION COMPLETE ==="
echo "Gateway: ws://$HUB_IP:8765/cardputer"
echo "Firmware: $RUN_HOME/Cardputer-ADV.bin"
sha256sum "$RUN_HOME/Cardputer-ADV.bin"
echo "Service logs: sudo journalctl -u freezzz-cardputer-gateway -n 60 --no-pager"
