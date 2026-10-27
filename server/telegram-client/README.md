# Telegram Client Backend (legacy single-account adapter)

This package is a **service-to-service adapter**, not a browser-facing Mini App API. The main multi-user Telegram gateway is implemented in `server/index.mjs`; prefer that service for FREEzzz CHAT.

## API
- GET /api/telegram/status
- GET /api/telegram/chats
- GET /api/telegram/chats/:chatId/messages?limit=50
- POST /api/telegram/chats/:chatId/messages

Every endpoint requires `Authorization: Bearer <TELEGRAM_CLIENT_API_SECRET>`. The secret must be at least 32 characters and must never be placed in the browser bundle. Unauthorized requests receive HTTP 401.

## Required server configuration
- `TELEGRAM_API_ID`
- `TELEGRAM_API_HASH`
- `TELEGRAM_SESSION`
- `TELEGRAM_CLIENT_API_SECRET` (32+ characters)

## Important limitation
This legacy adapter uses one `TELEGRAM_SESSION` for the entire service. It does not bind the session to individual verified Telegram users and must not be used as the public multi-user gateway. Do not deploy it as a replacement for `server/index.mjs` until per-user session isolation and authenticated identity binding are implemented.

Never put API hash, MTProto sessions, login codes, passwords or account credentials into the browser bundle.
