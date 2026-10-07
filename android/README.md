# FREEzzzyPortal Android

Native Android host for FREEzzzyPortal.

## Overlay mode

The app requests Android's `SYSTEM_ALERT_WINDOW` permission and uses a foreground service with a `TYPE_APPLICATION_OVERLAY` window. CHAT, LIVE and RADIO remain available while another Android application is in the foreground.

- CHAT: Telegram Web.
- LIVE: FREEzzzyPortal live route.
- RADIO: FREEzzzyPortal radio route.
- Floating window is draggable from its header.

## Build

`gradle -p android assembleDebug`
