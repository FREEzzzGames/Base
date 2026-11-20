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
                                         |-- AI_CHAT_URL (локальный AI coordinator / OpenAI-compatible API)
                                         |-- Piper (TTS)
                                         `-- обратно: текст + PCM16
```

Gateway — транспортный адаптер, а не сам ИИ-координатор. Он передаёт распознанную речь на локальный AI endpoint. Cloudflare worker из workers/agent-system не является локальным audio runtime.

## Первоначальная настройка Cardputer ADV

При первом включении прошивка показывает найденные Wi-Fi сети и просит ввести SSID, пароль, адрес ПК с FREEzzz HUB и DEVICE_TOKEN. Данные сохраняются во внутренней памяти Cardputer. При следующих включениях устройство автоматически подключается к сохранённой сети и HUB.

Чтобы подключить другую сеть, например точку доступа телефона, включите Cardputer с удерживаемой клавишей G. Введите SSID и пароль новой сети. Затем устройство автоматически подключится к сохранённому адресу HUB и токену.

Точка доступа телефона подходит, когда ПК с FREEzzz HUB доступен в её сети. Если ПК остаётся в другой сети, нужен VPN или настроенная маршрутизация. Для постоянного адреса ПК задайте DHCP reservation на роутере. Некоторые публичные/гостевые Wi-Fi блокируют связь между устройствами.

Пароль Wi-Fi и токен хранятся во внутренней flash памяти устройства. Не публикуйте их вместе с образом или исходниками.

## Сборка прошивки

```bash
pio run -d hardware/cardputer-voice-terminal/firmware
```
Образ после успешной сборки: firmware/.pio/build/cardputer-adv/firmware.bin. Настройка сети при сборке и локальный secrets.h больше не требуются.

## Gateway на Ubuntu
Требуется Node.js 22+, whisper.cpp (whisper-cli + модель), Piper CLI + голосовая модель и локальный FREEzzz AI coordinator с OpenAI-compatible Chat Completions API.

```bash
cd hardware/cardputer-voice-terminal/server
npm install
cp .env.example .env
# заполнить пути к моделям и AI endpoint
npm start
```

По умолчанию WebSocket слушает 0.0.0.0:8765/cardputer. Разрешить TCP/8765 только в доверенной домашней сети. Не публиковать gateway в интернет.

## Переменные gateway
- DEVICE_TOKEN — тот же случайный токен, что в secrets.h.
- WHISPER_CLI, WHISPER_MODEL — whisper.cpp executable и модель.
- PIPER_BIN, PIPER_MODEL — Piper executable и модель.
- AI_CHAT_URL — локальный endpoint координатора, совместимый с OpenAI Chat Completions.
- AI_CHAT_MODEL, AI_CHAT_API_KEY — модель и необязательный локальный API key.
- PORT — TCP порт, по умолчанию 8765.

## Протокол
Клиент отправляет auth, audio.start, бинарные PCM16-фреймы и audio.end. Gateway отправляет user.text, assistant.text, device.theme / device.volume, audio.reply.begin, бинарные PCM16-фреймы и audio.reply.end.

## Ограничения первой версии
- Wake word намеренно отсутствует.
- Wi-Fi и токен задаются при сборке в локальном secrets.h; на устройстве нет экрана настройки.
- AI endpoint должен быть предоставлен локальным FREEzzz HUB runtime. В текущем Base cloud worker не является локальным агентным runtime.
- CI может проверить host gateway и компиляцию; реальную запись/воспроизведение, LED и качество распознавания нужно проверить на физическом Cardputer ADV.


## LED hardware note

On Cardputer ADV the onboard SK6812 data line is GPIO21. Its power rail is shared with the display backlight on GPIO38; firmware deliberately does not configure or toggle GPIO38, so M5GFX retains control of screen brightness and backlight power.
