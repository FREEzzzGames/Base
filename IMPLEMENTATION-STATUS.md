# FREEzzz Platform — implementation status

Source of truth: `FREEzzzGames/Base`, `main`.

## Execution protocol
- One functional block per release.
- Typecheck + build + release smoke before Pages deployment.
- Build queue cancels obsolete in-progress builds.
- Production deployment is serialized and skips stale SHAs.
- No UI constructor.
- Local developer tools are build-gated and never included in the normal production build.

## Repository hygiene and quality gates (2026-10-09)

- Expanded `.gitignore` for Node/Vite, Android/Gradle, IDE, and local environment artifacts.
- Added ESLint with targeted correctness rules for TypeScript/JavaScript source.
- Centralized Android plugin and library versions in `android/gradle/libs.versions.toml`.
- Added KtLint and Android Lint steps to the Android workflow.
- Added ProGuard keep rules for `MainActivity` and `OverlayService`; release minification remains disabled pending a verified minified build.
- Lint gates are newly added; their first CI results must be checked and any existing findings fixed before treating them as green.

## LAW 2.0

- [x] 01 Source of Truth — Base/main fixed as the only repository.
- [x] 02 Architecture Foundation — module contract, registry, event bus and platform state introduced without rewriting existing module mechanics.
- [x] 03 Full Audit — route, dependency, runtime and UI audit completed for the current architecture pass.
- [x] 04 Green CI — validation and Pages deployment gates are active; current release is verified by GitHub Actions.
- [x] 05 Reproducible Build — deterministic build manifest, release smoke and SHA gate are implemented.
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


## 2026-10-05 Code Audit

- Separated static combat line-of-sight geometry from node collision geometry.
- Fixed tower/node line-of-sight being blocked by the node's own collision rectangle.
- Fixed projectile mob hit tracking to use stable mob IDs instead of mutable array indices.
- Added per-frame collision-geometry caching to avoid repeated allocations during movement/path resolution.
- Verified TypeScript typecheck, production build, release smoke, Pages artifact generation and published-build verification on the resulting validation chain.

## 2026-10-09 SPARK UI/mechanics audit

- Audited `public/spark.html` against the current SPARK gameplay: character selection, HP/energy/scrap HUD, weapon pickups, console repair, virtual movement stick, jump, dash, hold-to-fire, aim assist, enemy roster, Colossus phases/weak point, win/loss states, and mobile safe-area handling remain present.
- Removed redundant CRT/vignette overlays that stacked darkening effects; retained the scan-line and edge-light effects.
- Removed unused `.btn.small` and `.pad` CSS rules left over from earlier control layouts.
- Character/enemy/boss drawing remains in the same HTML runtime; no separate portal economy or old tender/mission interface was added.
- The audit confirms source-level presence only; runtime behavior still requires the published build and device smoke test to be checked.

## 2026-10-09 SPARK landscape and vertical traversal

- Changed the SPARK logical viewport to 960×540 for landscape play; portrait view is blocked by a rotate-device prompt.
- Added vertical camera tracking and expanded the playable world to support upper platform routes.
- Rebuilt platform placement as staggered, jump-reachable tiers and increased jump impulse to reach them.
- Repositioned selected weapon pickups on elevated routes and resized touch controls/HUD for landscape screens.
- Existing combat, enemy types, boss phases, repair, weapons, and operator selection remain in the same runtime.
- Source update committed; verify CI and perform a landscape-device smoke test before treating the build as runtime-validated.
