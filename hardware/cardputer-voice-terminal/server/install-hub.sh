#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "$(id -u)" -eq 0 ]]; then
  echo "Run as the normal Ubuntu user (monk), not with sudo."
  exit 1
fi
command -v sudo >/dev/null 2>&1 || { echo "sudo is required."; exit 1; }
command -v apt-get >/dev/null 2>&1 || { echo "This installer requires Ubuntu/Debian with apt-get."; exit 1; }

echo "== Install system prerequisites =="
sudo apt-get update
sudo apt-get install -y git curl openssl iproute2 pipx

for command in curl git node npm python3 openssl ip pipx; do
  command -v "$command" >/dev/null 2>&1 || { echo "Missing command after package installation: $command"; exit 1; }
done

NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
if (( NODE_MAJOR < 22 )); then
  echo "Node.js 22+ is required; found $(node --version). Install Node.js 22+ and rerun."
  exit 1
fi

RUN_USER="$USER"
RUN_HOME="$(getent passwd "$RUN_USER" | cut -d: -f6)"
ROOT="/opt/freezzz-cardputer"
SERVER="$ROOT/server"
HUB_IP="$(ip -4 route get 1.1.1.1 | awk '{for(i=1;i<=NF;i++) if($i=="src"){print $(i+1); exit}}')"
[[ -n "$HUB_IP" ]] || { echo "Could not determine HUB LAN IPv4 address."; exit 1; }

echo "HUB LAN address: $HUB_IP"
read -r -s -p "AgentWebUI login password: " AGENT_PASSWORD
echo
[[ -n "$AGENT_PASSWORD" ]] || { echo "AgentWebUI password is required."; exit 1; }
read -r -s -p "Speech API key (STT/TTS): " SPEECH_API_KEY
echo
[[ -n "$SPEECH_API_KEY" ]] || { echo "Speech API key is required for voice input/output."; exit 1; }
DEVICE_TOKEN="$(openssl rand -hex 32)"
export AGENT_PASSWORD SPEECH_API_KEY DEVICE_TOKEN HUB_IP RUN_USER RUN_HOME ROOT SERVER
FIRMWARE="$ROOT/firmware"
export FIRMWARE

echo "== Speech processing will use the configured cloud API; no local speech models are installed =="

echo "== Fetch Cardputer gateway sources =="
sudo mkdir -p "$SERVER"
sudo chown -R "$RUN_USER:$RUN_USER" "$ROOT"
RAW="https://raw.githubusercontent.com/FREEzzzGames/Base/main/hardware/cardputer-voice-terminal"
for file in index.mjs package.json; do
  curl -fsSL "$RAW/server/$file" -o "$SERVER/$file"
done
curl -fsSL "$RAW/server/.env.example" -o "$SERVER/.env.example"

echo "== Fetch Cardputer firmware sources =="
sudo mkdir -p "$FIRMWARE/src"
sudo chown -R "$RUN_USER:$RUN_USER" "$ROOT"
curl -fsSL "$RAW/firmware/platformio.ini" -o "$FIRMWARE/platformio.ini"
curl -fsSL "$RAW/firmware/src/main.cpp" -o "$FIRMWARE/src/main.cpp"

echo "== Install PlatformIO if needed =="
if ! command -v pio >/dev/null 2>&1; then
  pipx install platformio
  export PATH="$RUN_HOME/.local/bin:$PATH"
fi
command -v pio >/dev/null 2>&1 || { echo "PlatformIO installation failed."; exit 1; }

echo "== Generate private device configuration ==" 
python3 - <<'PY'
import json, os
from pathlib import Path
firmware = Path(os.environ["FIRMWARE"])
header = (
    "#pragma once\n"
    "#define FREEZZ_HUB_HOST " + json.dumps(os.environ["HUB_IP"]) + "\n"
    "#define FREEZZ_HUB_PORT 8765\n"
    "#define FREEZZ_DEVICE_TOKEN " + json.dumps(os.environ["DEVICE_TOKEN"]) + "\n"
)
target = firmware / "src" / "device_config.h"
target.write_text(header)
target.chmod(0o600)
PY

echo "== Write private gateway credentials =="
python3 - <<'PY'
import json, os
from pathlib import Path

server = Path(os.environ["SERVER"])
template = (server / ".env.example").read_text()
values = {
    "HOST": "0.0.0.0",
    "PORT": "8765",
    "DEVICE_TOKEN": os.environ["DEVICE_TOKEN"],
    "SPEECH_API_BASE_URL": "https://api.openai.com/v1",
    "SPEECH_API_KEY": os.environ["SPEECH_API_KEY"],
    "STT_MODEL": "gpt-4o-mini-transcribe",
    "TTS_MODEL": "gpt-4o-mini-tts",
    "TTS_VOICE": "alloy",
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

PY

echo "== Build firmware with this HUB address and this device token =="
cd "$FIRMWARE"
pio run
mkdir -p "$ROOT/output"
cp .pio/build/cardputer-adv/firmware.bin "$ROOT/output/cardputer-adv-firmware.bin"
chmod 600 "$ROOT/output/cardputer-adv-firmware.bin"

echo "== Install gateway dependencies =="
cd "$SERVER"
npm install --omit=dev

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
sudo systemctl restart freezzz-cardputer-gateway.service
sleep 2
curl -fsS --max-time 5 http://127.0.0.1:8765/health

echo
echo "=== INSTALLATION COMPLETE ==="
echo "Gateway: ws://$HUB_IP:8765/cardputer"
echo "Device token is embedded in the private, device-specific firmware."
echo "Firmware BIN: $ROOT/output/cardputer-adv-firmware.bin"
echo "On Cardputer, select your 2.4 GHz Wi-Fi network and enter its password."
echo "Service logs: sudo journalctl -u freezzz-cardputer-gateway -n 60 --no-pager"
