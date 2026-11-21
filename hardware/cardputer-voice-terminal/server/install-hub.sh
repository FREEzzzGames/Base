#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "$(id -u)" -eq 0 ]]; then
  echo "Run as the normal Ubuntu user (monk), not with sudo."
  exit 1
fi
for command in sudo curl node npm python3 openssl tailscale readlink; do
  command -v "$command" >/dev/null 2>&1 || { echo "Missing required command: $command"; exit 1; }
done

NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
(( NODE_MAJOR >= 22 )) || { echo "Node.js 22+ required; found $(node --version)."; exit 1; }

RUN_USER="$USER"
RUN_HOME="$(getent passwd "$RUN_USER" | cut -d: -f6)"
ROOT="/opt/freezzz-cardputer"
SERVER="$ROOT/server"
FIRMWARE="$ROOT/firmware"
RAW="https://raw.githubusercontent.com/FREEzzzGames/Base/feat/cardputer-global-wss-gateway/hardware/cardputer-voice-terminal"

echo "== FREEzzz Cardputer Gateway: clean replacement =="
echo "Existing .env and DEVICE_TOKEN will be preserved."
sudo mkdir -p "$SERVER" "$FIRMWARE/src"
sudo chown -R "$RUN_USER:$RUN_USER" "$ROOT"

if [[ -f "$SERVER/.env" ]]; then
  cp -a "$SERVER/.env" "$SERVER/.env.backup-$(date +%Y%m%d-%H%M%S)"
else
  echo "No previous .env found; creating a new private configuration."
  curl -fsSL "$RAW/server/.env.example" -o "$SERVER/.env"
fi

echo "== Stop the old service and check for orphaned listeners =="
sudo systemctl stop freezzz-cardputer-gateway.service 2>/dev/null || true
sleep 1
command -v fuser >/dev/null 2>&1 || sudo apt-get install -y psmisc
PIDS="$(sudo fuser -n tcp 8765 2>/dev/null || true)"
if [[ -n "$PIDS" ]]; then
  for pid in $PIDS; do
    CMD="$(ps -p "$pid" -o args= 2>/dev/null || true)"
    CWD="$(sudo readlink -f "/proc/$pid/cwd" 2>/dev/null || true)"
    if [[ "$CWD" == "$SERVER" && "$CMD" == *"index.mjs"* ]]; then
      echo "Stopping orphaned old Gateway process PID $pid"
      sudo kill "$pid"
    else
      echo "Port 8765 is occupied by another process (PID $pid): $CMD"
      echo "Refusing to kill an unrelated process. Resolve this listener and rerun."
      exit 1
    fi
  done
fi

echo "== Replace Gateway source =="
curl -fsSL "$RAW/server/index.mjs" -o "$SERVER/index.mjs"
curl -fsSL "$RAW/server/package.json" -o "$SERVER/package.json"
curl -fsSL "$RAW/server/.env.example" -o "$SERVER/.env.example"
chmod 600 "$SERVER/.env"

echo "== Preserve token and set local Ollama defaults =="
python3 - "$SERVER/.env" <<'PY'
import os, re, secrets, sys
from pathlib import Path

p = Path(sys.argv[1])
lines = p.read_text().splitlines() if p.exists() else []
values = {}
for line in lines:
    if not line or line.lstrip().startswith("#") or "=" not in line:
        continue
    k, v = line.split("=", 1)
    values[k.strip()] = v.strip().strip('"').strip("'")

token = values.get("DEVICE_TOKEN", "")
if len(token) < 32 or token.startswith("REPLACE"):
    token = secrets.token_hex(32)

defaults = {
    "HOST": "127.0.0.1",
    "PORT": "8765",
    "DEVICE_TOKEN": token,
    "AI_CHAT_URL": values.get("AI_CHAT_URL") or "http://127.0.0.1:11434/v1/chat/completions",
    "AI_CHAT_MODEL": values.get("AI_CHAT_MODEL") or "qwen3.5:4b",
}
seen = set()
out = []
for line in lines:
    if line and not line.lstrip().startswith("#") and "=" in line:
        key = line.split("=", 1)[0].strip()
        if key in defaults:
            if key not in seen:
                out.append(key + "=" + defaults[key])
                seen.add(key)
            continue
    out.append(line)
for key, value in defaults.items():
    if key not in seen:
        out.append(key + "=" + value)
p.write_text("\n".join(out).rstrip() + "\n")
p.chmod(0o600)
PY

echo "== Install runtime dependency =="
cd "$SERVER"
npm install --omit=dev

echo "== Install a single systemd-managed Gateway process =="
NODE_BIN="$(command -v node)"
sudo tee /etc/systemd/system/freezzz-cardputer-gateway.service >/dev/null <<UNIT
[Unit]
Description=FREEzzz Cardputer Voice Gateway v2
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$RUN_USER
WorkingDirectory=$SERVER
ExecStart=$NODE_BIN --env-file=.env index.mjs
Restart=on-failure
RestartSec=5
KillMode=control-group
TimeoutStopSec=10
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ReadWritePaths=$SERVER /tmp

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable freezzz-cardputer-gateway.service
sudo systemctl start freezzz-cardputer-gateway.service
sleep 2
sudo systemctl is-active --quiet freezzz-cardputer-gateway.service || {
  sudo journalctl -u freezzz-cardputer-gateway -n 50 --no-pager
  exit 1
}
curl -fsS --max-time 5 http://127.0.0.1:8765/health
echo

echo "== Configure public TLS WebSocket through Tailscale Funnel =="
FUNNEL_OUTPUT="$(tailscale funnel --bg --https=443 127.0.0.1:8765 2>&1 || true)"
printf '%s\n' "$FUNNEL_OUTPUT"
FUNNEL_HOST="$(printf '%s\n' "$FUNNEL_OUTPUT" | grep -Eo '[A-Za-z0-9.-]+\.ts\.net' | head -1 || true)"
if [[ -z "$FUNNEL_HOST" ]]; then
  FUNNEL_HOST="$(tailscale status --json | python3 -c 'import json,sys; d=json.load(sys.stdin); print((d.get("Self",{}).get("DNSName","") or "").rstrip("."))')"
fi
[[ "$FUNNEL_HOST" == *.ts.net ]] || {
  echo "Could not obtain the public Tailscale DNS name."
  echo "If Tailscale printed an approval URL, open it on the phone, approve Funnel, then rerun this script."
  tailscale funnel status || true
  exit 1
}
FUNNEL_STATUS="$(tailscale funnel status 2>&1 || true)"
echo "$FUNNEL_STATUS"
echo "$FUNNEL_STATUS" | grep -q "127.0.0.1:8765" || {
  echo "Tailscale Funnel is not forwarding HTTPS traffic to the Gateway. Check Funnel policy, MagicDNS and HTTPS in the Tailscale admin console."
  exit 1
}

echo "== Fetch the official Let's Encrypt root certificate for verified TLS =="
curl -fsSL https://letsencrypt.org/certs/isrgrootx1.pem -o "$FIRMWARE/src/isrgrootx1.pem"
openssl x509 -in "$FIRMWARE/src/isrgrootx1.pem" -noout -subject | grep -q "ISRG Root X1" || {
  echo "Downloaded TLS root certificate did not validate as ISRG Root X1."
  exit 1
}
python3 - "$FIRMWARE/src/isrgrootx1.pem" "$FIRMWARE/src/tls_ca.h" <<'PY'
import sys
from pathlib import Path
pem = Path(sys.argv[1]).read_text().strip()
Path(sys.argv[2]).write_text(
    "#pragma once\n"
    "static const char FREEZZ_TLS_CA_CERT[] PROGMEM = R\"FREEZZ_CA(\n"
    + pem + "\n"
    ")FREEZZ_CA\";\n"
)
PY

echo "== Fetch and configure Cardputer firmware =="
curl -fsSL "$RAW/firmware/platformio.ini" -o "$FIRMWARE/platformio.ini"
curl -fsSL "$RAW/firmware/src/main.cpp" -o "$FIRMWARE/src/main.cpp"
python3 - "$FIRMWARE/src/device_config.h" "$FUNNEL_HOST" "$SERVER/.env" <<'PY'
import sys
from pathlib import Path
env = {}
for line in Path(sys.argv[3]).read_text().splitlines():
    if line and not line.lstrip().startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
token = env.get("DEVICE_TOKEN", "")
if len(token) < 32:
    raise SystemExit("Invalid DEVICE_TOKEN in .env")
import json
Path(sys.argv[1]).write_text(
    "#pragma once\n"
    "#define FREEZZ_HUB_HOST " + json.dumps(sys.argv[2]) + "\n"
    "#define FREEZZ_HUB_PORT 443\n"
    "#define FREEZZ_HUB_TLS 1\n"
    "#define FREEZZ_DEVICE_TOKEN " + json.dumps(token) + "\n"
)
PY
chmod 600 "$FIRMWARE/src/device_config.h"

echo "== Build the WSS-enabled Cardputer ADV firmware =="
if ! command -v pio >/dev/null 2>&1; then
  command -v pipx >/dev/null 2>&1 || { echo "Install pipx, then rerun: sudo apt-get install pipx"; exit 1; }
  pipx install platformio
  export PATH="$RUN_HOME/.local/bin:$PATH"
fi
command -v pio >/dev/null 2>&1 || { echo "PlatformIO is not available in PATH."; exit 1; }
cd "$FIRMWARE"
pio run

mkdir -p "$ROOT/output"
cp "$FIRMWARE/.pio/build/cardputer-adv/firmware.bin" "$ROOT/output/cardputer-adv-global-wss.bin"
chmod 600 "$ROOT/output/cardputer-adv-global-wss.bin"

echo
echo "=== BUILD AND DEPLOY COMPLETE ==="
echo "Public endpoint: wss://$FUNNEL_HOST/cardputer"
echo "Local Ollama: $(grep '^AI_CHAT_URL=' "$SERVER/.env" | cut -d= -f2-)"
echo "Model: $(grep '^AI_CHAT_MODEL=' "$SERVER/.env" | cut -d= -f2-)"
echo "Firmware BIN: $ROOT/output/cardputer-adv-global-wss.bin"
echo "Gateway health: http://127.0.0.1:8765/health"
echo "Speech STT/TTS must be configured in .env (Speech API key or local Whisper/Piper models)."
echo "Flash the new BIN to Cardputer. Saved Wi-Fi networks in NVS are not erased."
echo "Logs: sudo journalctl -u freezzz-cardputer-gateway -n 60 --no-pager"
