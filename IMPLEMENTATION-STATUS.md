# FREEzzz Platform — implementation status

Source of truth: `FREEzzzGames/Base`, `main`.

## Execution protocol
- One functional block per release.
- Typecheck + build + release smoke before Pages deployment.
- Build queue cancels obsolete in-progress builds.
- Production deployment is serialized and skips stale SHAs.
- No UI constructor.
- Local developer tools are build-gated and never included in the normal production build.

## LAW 2.0

- [x] 01 Source of Truth — Base/main fixed as the only repository.
- [x] 02 Architecture Foundation — module contract, registry, event bus and platform state introduced without rewriting existing module mechanics.
- [~] 03 Full Audit — in progress; route, dependency, runtime and UI audit continues.
- [~] 04 Green CI — workflow contains typecheck/build/release-smoke gates; production run still requires external GitHub Actions confirmation.
- [~] 05 Reproducible Build — deterministic build manifest and release smoke are implemented; production verification pending.
- [x] Constructor concept removed from runtime and CSS.
- [x] Local developer diagnostics isolated behind `VITE_FREEZZ_DEV_TOOLS=1`.
- [x] Portal economy remains excluded.
- [ ] 06 Composition Root
- [ ] 07 Module Manager
- [ ] 08 Module Contract — registry foundation exists; full module adapters remain.
- [ ] 09 Event Bus — foundation exists; module events remain to be wired.
- [ ] 10 Platform State — foundation exists; full persistence/adapters remain.
- [ ] 11 Web UI / Logic separation
- [ ] 12 Web Adapters
- [ ] 13 Responsive
- [ ] 14 Touch / Keyboard / TV
- [ ] 15 Runtime Smoke
- [ ] 16 LIVE Creator Registry
- [ ] 17 LIVE Provider Registry
- [ ] 18 LIVE Status Service
- [ ] 19 LIVE Playback Resolver
- [ ] 20 LIVE UX
- [ ] 21 CHAT production module
- [ ] 22 RADIO
- [ ] 23 LIBRARY
- [ ] 24 GAME Runtime
- [ ] 25 Rust/WASM where justified
- [ ] 26 GAME Catalog / Runtime separation
- [ ] 27 Telegram adapter
- [ ] 28 Android host
- [ ] 29 Web/Telegram/Android/TV convergence
- [ ] 30 Security / Performance
- [ ] 31 Production Gate
