# Telegram Client Backend

Server-side adapter for FREEzzz CHAT.

## API
- GET /api/telegram/status
- GET /api/telegram/connect
- GET /api/telegram/chats
- GET /api/telegram/chats/:chatId/messages?limit=50
- POST /api/telegram/chats/:chatId/messages
- POST /api/telegram/disconnect

## Security

The Mini App must never receive a Telegram user MTProto session. The backend owns the Telegram client session and exposes normalized chat/message data.

Required server configuration:
- TELEGRAM_API_ID
- TELEGRAM_API_HASH
- encrypted Telegram user-session storage
- application/session secret
- authenticated FREEzzz identity binding

Never put API hash, MTProto sessions, login codes, passwords or account credentials into the browser bundle.

## Flow

1. CHAT asks backend for status.
2. If disconnected, backend starts a controlled connection flow.
3. Authentication is completed server-side.
4. Backend reads the user's Telegram dialogs through an authorized MTProto client.
5. CHAT receives normalized dialogs.
6. Selecting a dialog loads messages.
7. Sending a message is proxied through the backend.
8. Disconnect revokes the server-side session.

CHAT remains isolated from HOME, LIVE, GAME, RADIO and LIBRARY.
