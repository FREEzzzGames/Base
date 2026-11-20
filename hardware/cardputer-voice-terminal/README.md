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
                                         |-- облачный STT/TTS API (без локальных моделей)
                                         |-- AgentWebUI API (существующие агенты HUB)
                                         `-- обратно: текст + PCM16
```

Gateway — транспортный адаптер. При заданном AGENTWEBUI_URL он входит в существующий AgentWebUI, создаёт диалог с первым доступным агентом (или использует AGENTWEBUI_TARGET), отправляет текст и получает завершённый ответ через SSE. Пароль хранится только в `.env` на HUB и никогда не передаётся Cardputer. Cloudflare worker из workers/agent-system не является локальным audio runtime.

## Сборка прошивки
Прошивка универсальная: Wi-Fi и параметры HUB не вшиваются в BIN. Из корня репозитория выполнить:
```bash
pio run -d hardware/cardputer-voice-terminal/firmware
```
Образ после успешной сборки: firmware/.pio/build/cardputer-adv/firmware.bin.

При первом запуске Cardputer автоматически откроет экран настройки. Введи по очереди Wi-Fi SSID, пароль Wi-Fi, IP/hostname HUB и Device Token. Enter подтверждает поле; Backspace удаляет символ. Пароль Wi-Fi на экране маскируется. Настройки сохраняются во внутренней NVS-памяти. Для повторной настройки удерживай верхнюю кнопку G0 при включении устройства.

## Gateway на Ubuntu
Требуется Node.js 22+, работающий AgentWebUI на HUB (в текущей конфигурации `http://192.168.0.207:3000`) и ключ совместимого облачного Speech API для распознавания и синтеза речи. Локальные Whisper.cpp, Piper, CMake и модели не устанавливаются.

```bash
cd hardware/cardputer-voice-terminal/server
npm install
cp .env.example .env
# заполнить DEVICE_TOKEN, пароль AgentWebUI и SPEECH_API_KEY
npm start
```

Команда `npm start` автоматически загружает переменные из файла `.env` средствами Node.js 22+ (`--env-file`). Переменные, уже заданные в окружении процесса, имеют приоритет над значениями из файла. Если `.env` отсутствует, Node завершит запуск с понятной ошибкой; сначала скопируйте `.env.example`.

По умолчанию WebSocket слушает 0.0.0.0:8765/cardputer. Разрешить TCP/8765 только в доверенной домашней сети. Не публиковать gateway в интернет.

## Переменные gateway
- DEVICE_TOKEN — тот же случайный токен, что в secrets.h.
- SPEECH_API_BASE_URL — базовый URL OpenAI-compatible Speech API (по умолчанию `https://api.openai.com/v1`).
- SPEECH_API_KEY — ключ Speech API; используется только на HUB для STT и TTS.
- STT_MODEL — модель распознавания (по умолчанию `gpt-4o-mini-transcribe`).
- TTS_MODEL — модель синтеза (по умолчанию `gpt-4o-mini-tts`).
- TTS_VOICE — голос синтеза (по умолчанию `alloy`).
- WHISPER_CLI / WHISPER_MODEL и PIPER_BIN / PIPER_MODEL — необязательный локальный fallback, не требуется для основной схемы.
- AGENTWEBUI_URL — адрес существующего AgentWebUI; для сервиса на том же Ubuntu PC: `http://127.0.0.1:3000`.
- AGENTWEBUI_PASSWORD — пароль входа AgentWebUI. Gateway выполняет `POST /api/login` и хранит session cookie в памяти процесса.
- AGENTWEBUI_TARGET — необязательная цель, например `agent:ID`; если не задана, выбирается первый агент из `/api/agents`.
- AGENTWEBUI_MODEL — запасная модель, если список агентов пуст (по умолчанию `local/small`).
- AI_CHAT_URL / AI_CHAT_MODEL / AI_CHAT_API_KEY — необязательный запасной OpenAI-compatible endpoint; используется только если AGENTWEBUI_URL не задан.
- PORT — TCP порт, по умолчанию 8765.

В `.env.example` приоритетно настроен AgentWebUI. Установите `AGENTWEBUI_PASSWORD` в локальном `.env` на пароль входа AgentWebUI. Не помещайте пароль в `secrets.h` и не отправляйте его в прошивку. Если AgentWebUI запущен в другом контейнере/на другом хосте, укажите адрес, доступный с Ubuntu-хоста.

### Автоматическая установка на FREEzzz HUB

На Ubuntu-хосте из Termux/SSH запустить одной командой:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/FREEzzzGames/Base/main/hardware/cardputer-voice-terminal/server/install-hub.sh)
```

Скрипт НЕ устанавливает Whisper.cpp/Piper, НЕ скачивает локальные модели и НЕ требует CMake. Он настраивает облачный STT/TTS, подключает Gateway к существующему AgentWebUI, создаёт случайный DEVICE_TOKEN, собирает BIN с введёнными Wi-Fi credentials и устанавливает systemd-сервис. При запуске нужно ввести пароль AgentWebUI и ключ Speech API. Скрипт создаст DEVICE_TOKEN и сохранит его только в локальном `.env` на HUB с правами 600. После установки он покажет токен в терминале — введи его на Cardputer в поле Device Token. Wi-Fi SSID и пароль вводятся непосредственно на Cardputer. BIN собирается отдельно через GitHub Actions и не содержит персональных секретов.

## Протокол
Клиент отправляет auth, audio.start, бинарные PCM16-фреймы и audio.end. Gateway отправляет user.text, assistant.text, device.theme / device.volume, audio.reply.begin, бинарные PCM16-фреймы и audio.reply.end.

## Ограничения первой версии
- Wake word намеренно отсутствует.
- Wi-Fi и токен задаются при сборке в локальном secrets.h; на устройстве нет экрана настройки.
- Для входа Gateway нужен действующий пароль AgentWebUI в локальном `.env`; сам пароль не может быть автоматически угадан или обойдён. Устройство авторизуется отдельным DEVICE_TOKEN.
- Для распознавания и озвучивания нужен ключ Speech API с доступом к STT/TTS; он не передаётся Cardputer. Диалоги и ответы ИИ обрабатывает AgentWebUI.
- CI может проверить host gateway и компиляцию; реальную запись/воспроизведение, LED и качество распознавания нужно проверить на физическом Cardputer ADV.

## LED hardware note

On Cardputer ADV the onboard SK6812 data line is GPIO21. Its power rail is shared with the display backlight on GPIO38; firmware deliberately does not configure or toggle GPIO38, so M5GFX retains control of screen brightness and backlight power.
