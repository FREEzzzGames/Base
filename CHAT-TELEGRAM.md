# CHAT — Telegram account integration

## Target

Display the authenticated user's Telegram dialogs inside FREEzzz CHAT:

- private chats
- groups
- supergroups
- channels
- bots
- unread counts
- latest message
- message history
- sending messages

## Architecture

Mini App -> CHAT UI -> Telegram Chat Client Adapter -> authenticated backend -> MTProto -> Telegram.

The browser never receives the Telegram user session.

## State

- [x] Base/main remains the only working repository.
- [x] Frontend adapter contract: src/chat/telegram-client.ts
- [x] Backend API contract documented.
- [x] MTProto backend implementation (initial server adapter).
- [ ] Secure server-side session storage and authenticated FREEzzz identity binding.
- [ ] Telegram account connect flow.
- [ ] Dialog synchronization.
- [ ] Message history synchronization.
- [ ] Send-message endpoint.
- [ ] Production backend deployment behind an authenticated HTTPS gateway.
- [ ] End-to-end Mini App authentication binding.

A Bot API token is not sufficient for a user's complete Telegram dialog list. Full user-dialog access requires an authorized Telegram user client/MTProto session.
