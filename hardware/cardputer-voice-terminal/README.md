# FREEzzz Voice Terminal — Cardputer ADV

Минимальный голосовой клиент для M5Stack Cardputer ADV. Экран не содержит меню и графики: только последние две реплики, прокрутка и цветовая палитра. Единственная клавиша начала записи — удержание Space.

## Функции
- Space down: захват PCM 16 kHz / mono / 16-bit.
- Space up: завершить запись и отправить аудио на FREEzzz HUB.
- Голосовой ответ возвращается потоком PCM и воспроизводится через ES8311.
- Экран показывает последние реплики пользователя и помощника; клавиши `;` и `.` прокручивают текст вверх и вниз.
- Голосовые команды меняют палитру (red, orange, yellow, green, blue, indigo, violet, white, black) и громкость.
- RGB LED включён во время активного разговора и следует акцентному цвету палитры.
- Нет wake word, экранных меню, локальных настроек или файлового менеджера.

## Схема
```
Cardputer ADV -- WebSocket + PCM16 --> FREEzzz HUB gateway
                                         |-- whisper.cpp (STT)
                                         |-- AgentWebUI API (существующие агенты HUB)
                                         |-- Piper (TTS)
                                         `-- обратно: текст + PCM16
```

Gateway — транспортный адаптер. При заданном AGENTWEBUI_URL он входит в существующий AgentWebUI, создаёт диалог с первым доступным агентом (или использует AGENTWEBUI_TARGET), отправляет текст и получает завершённый ответ через SSE. Пароль хранится только в `.env` на HUB и никогда не передаётся Cardputer. Cloudflare worker из workers/agent-system не является локальным audio runtime.

## Сборка прошивки
1. Скопировать firmware/include/secrets.h.example в firmware/include/secrets.h.
2. Указать SSID, пароль Wi-Fi, IP FREEzzz HUB и случайный токен устройства.
3. Из корня репозитория выполнить:
```bash
pio run -d hardware/cardputer-voice-terminal/firmware
```
Образ после успешной сборки: firmware/.pio/build/cardputer-adv/firmware.bin.

## Gateway на Ubuntu
Требуется Node.js 22+, whisper.cpp (whisper-cli + модель), Piper CLI + голосовая модель и работающий AgentWebUI на HUB (в текущей конфигурации `http://192.168.0.207:3000`).

```bash
cd hardware/cardputer-voice-terminal/server
npm install
cp .env.example .env
# заполнить DEVICE_TOKEN, пароль AgentWebUI и пути к моделям
npm start
```

Команда `npm start` автоматически загружает переменные из файла `.env` средствами Node.js 22+ (`--env-file`). Переменные, уже заданные в окружении процесса, имеют приоритет над значениями из файла. Если `.env` отсутствует, Node завершит запуск с понятной ошибкой; сначала скопируйте `.env.example`.

По умолчанию WebSocket слушает 0.0.0.0:8765/cardputer. Разрешить TCP/8765 только в доверенной домашней сети. Не публиковать gateway в интернет.

### Установка STT/TTS на Ubuntu

Whisper.cpp собирается из официального исходного репозитория; для русского используется модель `small` (около 466 MiB). Piper устанавливается в отдельное Python venv и использует официальный голос `ru_RU-irina-medium`.

```bash
sudo apt update
sudo apt install -y git cmake build-essential python3-venv

sudo git clone --depth 1 https://github.com/ggml-org/whisper.cpp.git /opt/whisper.cpp
sudo cmake -S /opt/whisper.cpp -B /opt/whisper.cpp/build -DCMAKE_BUILD_TYPE=Release
sudo cmake --build /opt/whisper.cpp/build -j2
sudo bash /opt/whisper.cpp/models/download-ggml-model.sh small

sudo mkdir -p /opt/piper/voices
sudo python3 -m venv /opt/piper/venv
sudo /opt/piper/venv/bin/pip install --upgrade pip
sudo /opt/piper/venv/bin/pip install piper-tts
sudo /opt/piper/venv/bin/python -m piper.download_voices ru_RU-irina-medium --data-dir /opt/piper/voices
```

Установленные пути для `.env`:
- `WHISPER_CLI=/opt/whisper.cpp/build/bin/whisper-cli`
- `WHISPER_MODEL=/opt/whisper.cpp/models/ggml-small.bin`
- `PIPER_BIN=/opt/piper/venv/bin/piper`
- `PIPER_MODEL=/opt/piper/voices/ru_RU-irina-medium.onnx`

Piper запускается через `-m`, `-f`, `--input-file`; Gateway не зависит от устаревших флагов предыдущих версий CLI.

## Переменные gateway
- DEVICE_TOKEN — тот же случайный токен, что в secrets.h.
- WHISPER_CLI, WHISPER_MODEL — whisper.cpp executable и модель.
- PIPER_BIN, PIPER_MODEL — Piper executable и модель.
- AGENTWEBUI_URL — адрес существующего AgentWebUI; для сервиса на том же Ubuntu PC: `http://127.0.0.1:3000`.
- AGENTWEBUI_PASSWORD — пароль входа AgentWebUI. Gateway выполняет `POST /api/login` и хранит session cookie в памяти процесса.
- AGENTWEBUI_TARGET — необязательная цель, например `agent:ID`; если не задана, выбирается первый агент из `/api/agents`.
- AGENTWEBUI_MODEL — запасная модель, если список агентов пуст (по умолчанию `local/small`).
- AI_CHAT_URL / AI_CHAT_MODEL / AI_CHAT_API_KEY — необязательный запасной OpenAI-compatible endpoint; используется только если AGENTWEBUI_URL не задан.
- PORT — TCP порт, по умолчанию 8765.

В `.env.example` приоритетно настроен AgentWebUI. Установите `AGENTWEBUI_PASSWORD` в локальном `.env` на пароль входа AgentWebUI. Не помещайте пароль в `secrets.h` и не отправляйте его в прошивку. Если AgentWebUI запущен в другом контейнере/на другом хосте, укажите адрес, доступный с Ubuntu-хоста.

## Протокол
Клиент отправляет auth, audio.start, бинарные PCM16-фреймы и audio.end. Gateway отправляет user.text, assistant.text, device.theme / device.volume, audio.reply.begin, бинарные PCM16-фреймы и audio.reply.end.

## Ограничения первой версии
- Wake word намеренно отсутствует.
- Wi-Fi и токен задаются при сборке в локальном secrets.h; на устройстве нет экрана настройки.
- Для входа Gateway нужен действующий пароль AgentWebUI в локальном `.env`; сам пароль не может быть автоматически угадан или обойдён. Устройство авторизуется отдельным DEVICE_TOKEN.
- CI может проверить host gateway и компиляцию; реальную запись/воспроизведение, LED и качество распознавания нужно проверить на физическом Cardputer ADV.

## LED hardware note

On Cardputer ADV the onboard SK6812 data line is GPIO21. Its power rail is shared with the display backlight on GPIO38; firmware deliberately does not configure or toggle GPIO38, so M5GFX retains control of screen brightness and backlight power.
