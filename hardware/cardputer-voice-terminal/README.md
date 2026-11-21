# FREEzzz Voice Terminal — Cardputer ADV

Голосовой клиент для M5Stack Cardputer ADV. Устройство подключается к FREEzzz HUB через защищённый WebSocket независимо от того, к какой Wi-Fi сети оно подключено.

## Возможности
- Удержание Space — запись голоса; отпускание — отправка на HUB.
- PCM 16 kHz / mono / 16-bit.
- Ответ ИИ отображается на экране и возвращается как PCM audio.
- Голосовые команды меняют цветовую палитру и громкость.
- RGB LED показывает активность разговора.
- До 8 сохранённых Wi-Fi сетей 2,4 GHz; устройство автоматически выбирает доступную сеть.
- Адрес HUB — публичное DNS-имя Tailscale Funnel, а не частный IP вида 192.168.x.x.
- WSS/TLS с проверкой цепочки сертификата ISRG Root X1; секрет DEVICE_TOKEN остаётся на устройстве и HUB.

## Архитектура

```text
Cardputer ADV
  |  любой Wi-Fi с доступом в интернет
  |  WSS :443 /cardputer + DEVICE_TOKEN
  v
Tailscale Funnel (публичный TLS endpoint)
  |
  v
FREEzzz HUB Gateway (127.0.0.1:8765)
  |-- локальный Ollama: qwen3.5:4b
  |-- STT: Speech API или локальный Whisper.cpp
  `-- TTS: Speech API или локальный Piper
```

Funnel публикует только Gateway на локальном порту 8765. Сам Gateway привязан к loopback 127.0.0.1; Ollama на порт 11434 наружу не публикуется. На роутере не требуется пробрасывать порты. Cardputer не должен устанавливать Tailscale.

## Развёртывание на Ubuntu

Запускать от обычного пользователя Ubuntu (например, monk), не от root:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/FREEzzzGames/Base/feat/cardputer-global-wss-gateway/hardware/cardputer-voice-terminal/server/install-hub.sh)
```

Скрипт выполняет миграцию существующей установки:
1. Сохраняет резервную копию .env и прежний DEVICE_TOKEN.
2. Останавливает старый systemd Gateway и проверяет, не остался ли отдельный процесс на порту 8765.
3. Заменяет Gateway новым исходником.
4. Оставляет текущие параметры Ollama, а если их нет — задаёт http://127.0.0.1:11434/v1/chat/completions и qwen3.5:4b.
5. Привязывает Gateway к 127.0.0.1:8765 и устанавливает один systemd-процесс.
6. Настраивает Tailscale Funnel на HTTPS 443 и получает DNS-имя *.ts.net.
7. Загружает официальный корневой сертификат ISRG Root X1, генерирует приватную конфигурацию и собирает BIN для Cardputer ADV.
8. Сохраняет BIN в /opt/freezzz-cardputer/output/cardputer-adv-global-wss.bin.

Если Tailscale попросит разрешить Funnel, открой ссылку авторизации, которую покажет терминал, подтверди включение и повтори команду. Tailscale Funnel должен быть разрешён для tailnet, MagicDNS и HTTPS должны быть включены.

## Речь (STT/TTS)

Gateway не подменяет отсутствующие речевые движки и не отправляет запросы к Ollama для распознавания аудио. Для полноценного голосового цикла необходимо настроить:
- STT: SPEECH_API_KEY с доступом к Speech API либо локальный WHISPER_MODEL и whisper-cli.
- TTS: тот же SPEECH_API_KEY с доступом к TTS либо локальный PIPER_MODEL и piper.

Текущие значения .env сохраняются при обновлении. Если STT или TTS не настроены, Gateway явно сообщит об этом; ошибка будет видна на экране Cardputer и в journalctl.

## Проверка

```bash
curl -fsS http://127.0.0.1:8765/health
sudo systemctl status freezzz-cardputer-gateway --no-pager
sudo tailscale funnel status
sudo journalctl -u freezzz-cardputer-gateway -n 80 --no-pager
```

Ожидаемый публичный адрес: wss://<имя-устройства>.<tailnet>.ts.net/cardputer.

## Сборка вручную

```bash
pio run -d hardware/cardputer-voice-terminal/firmware
```

Для WSS требуется приватный firmware/src/device_config.h с FREEZZ_HUB_HOST, FREEZZ_HUB_PORT=443, FREEZZ_HUB_TLS=1, FREEZZ_DEVICE_TOKEN, а также firmware/src/tls_ca.h с PEM ISRG Root X1. Их генерирует установочный скрипт; они не коммитятся.

Сохранённые Wi-Fi сети находятся во внутренней NVS-памяти Cardputer и не стираются перепрошивкой. Поддерживаются сети 2,4 GHz; 5 GHz не поддерживается.

## Безопасность
- Не публиковать порт 8765 напрямую.
- Не публиковать Ollama 11434.
- Не добавлять .env, device_config.h или tls_ca.h в Git.
- Не использовать beginSSL() без CA-проверки: для публичного WSS применяется beginSslWithCA().
