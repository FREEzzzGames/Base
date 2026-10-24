# FREEzzz Platform — implementation status

Source of truth: `FREEzzzGames/Base`, `main`.

## Execution protocol
- One functional block per release.
- Typecheck + build + release smoke before Pages deployment.
- Build queue cancels obsolete in-progress builds.
- Production deployment is serialized and skips stale SHAs.
- No UI constructor.
- Local developer tools are build-gated and never included in the normal production build.

## 2026-10-11 Functional release block

- Added module lifecycle transitions and adapter hooks to the canonical module manager.
- Wired GAME and LIVE activity cleanup through module lifecycle adapters rather than duplicate navigation conditionals.
- Isolated event-bus listener failures so one listener cannot stop the remaining listeners.
- Added a HOME **Continue game** action for the most recently played local library ROM. This relaunches the selected ROM; it does not claim to restore an in-game save state.
- Added emulator launch preflight checks for system support, filename extension, non-empty ROM size and required browser APIs.
- Added localized recovery UI for render failures in LIVE, CHAT and LIBRARY, with a retry action that keeps the portal shell available.
- Added scripts/portal-core-smoke.mjs and made it a required CI step before build/deployment. It exercises event isolation, module lifecycle transitions and emulator preflight.
- Release acceptance still requires the matching GitHub Actions build/deploy/published-build verification. Real Telegram Android touch, DS touch, LIVE playback, CHAT connection, RADIO playback and frame-rate checks remain device/runtime tasks and must not be inferred from source tests.

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
- [x] 07 Module Manager — route transitions, adapter registration, lifecycle callbacks and isolated failures implemented.
- [ ] 08 Module Contract — registry foundation exists; full module adapters remain.
- [x] 09 Event Bus — navigation/profile/media events are wired; listener failures are isolated and unsubscribe removes empty listener sets.
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

## 2026-10-09 Ichiraku Ramen portrait release pass

- Rebranded the existing SPARK runtime as **Ichiraku Ramen // Shinobi Ops** without replacing the working combat simulation.
- Restored the 360×640 logical portrait viewport and removed the landscape-only gate, rotate-screen overlay, and the duplicated/stacked CSS override blocks.
- Retained vertical camera tracking and expanded the world height to 900 units; raised the ground plane so upper platforms and the lower arena remain visible across vertical camera movement.
- Reworked the UI palette toward ramen-shop reds, lantern amber, warm cream, and night-village charcoal; replaced the industrial skyline with layered night-market facades and lanterns.
- Renamed arena markers to Ichiraku, rooftops, market, and shrine; medkit pickups now identify as ramen recovery, while existing weapon, enemy, boss, and three-phase combat mechanics remain.
- Source commit: `98523c5163a90f4a289d6cc66a8ffddf1b4390bf`. This is a source change, not yet a runtime/device smoke-test claim; validate CI and published output before marking it released.

## 2026-10-09 Ichiraku menu backdrop implemented in code

- Added a procedural canvas-rendered night-village / ramen-shop backdrop directly to `public/spark.html`; no external image URL or separately loaded asset is required.
- The menu state now renders the backdrop as its full-screen canvas scene, including moonlight, mountain silhouettes, village buildings, warm ramen signage, lanterns, stools, sakura petals, and vignette lighting.
- Reduced the menu overlay opacity and styled the character panel so the scene remains visible behind the existing character selector.
- Gameplay rendering remains on the existing path after the menu state; existing character selection and combat mechanics are preserved.
- Source commit: `0ba9e69d51a174fb07874d16e059bf99762779a2`.
- Runtime/device appearance and mobile performance still require smoke testing after deployment.

## 2026-10-09 Ichiraku hub UI implementation

- Replaced the single centered start panel with a responsive portrait hub containing Home, Shinobi, Arsenal, Missions, and Settings screens.
- Added the supplied Ichiraku Ramen logo as a separate asset at `public/assets/ichiraku-logo.jpg`; the logo is not drawn into the menu background.
- Added a level/operation selector, operator selection panel, weapon cards tied to the existing four weapon definitions, settings toggle for sound effects, and a functional pause/resume/restart/home flow.
- Existing arena simulation, weapon pickups, enemy behaviors, combat controls, and boss logic are retained.
- Mission 1-1 launches the existing arena; additional mission cards are explicitly locked and are not represented as implemented levels.
- UI source commit: `b0bdbd4ebedd4c27a95fef264d4a5905cc4ae3a3`; follow-up interaction fixes: `209af0f119d32e907b780f3d927b945f176526`.
- Device-level visual verification remains pending; the concept board is a design target, not proof that every pictured asset or animation is implemented. Enemy and character art still needs a dedicated asset pass against the approved sprite reference.

## 2026-10-10 Portal release-gate correction

- Corrected the canonical project context: GAME is SPARK / Ichiraku Ramen: Shinobi Ops; CARGO DECK is only a legacy redirect, not the active runtime.
- Expanded `scripts/release-smoke.mjs` to require the published portal entry, SPARK console page, embedded SPARK game page, and core runtime modules. It also verifies that the console embeds SPARK and that the game page loads the SPARK runtime.
- This closes a validation gap: the previous smoke test could pass while the GAME route or its core runtime files were absent from the production artifact.
- Verified release commit: `73fbc69cc7ad6662d84352ff6b12f77e1883e7f1`; build, typecheck, ESLint, SPARK runtime validation, release smoke, Pages deployment, and published-build verification passed in [workflow run 38091886209](https://github.com/FREEzzzGames/Base/actions/runs/38091886209).
- Real Telegram Android touch, module-isolation, LIVE playback, CHAT connection, RADIO playback, LIBRARY import/emulation, and SPARK FPS remain device/runtime checks; they are not marked complete by this source-level gate.


## 2026-10-16 GAME catalog integration

- Added a searchable, category-filtered GAME catalog with 142 browser-game entries and 10 additional open-game projects/collections.
- Preserved SPARK / Ichiraku Ramen: Shinobi Ops as a featured in-portal game; external individual games can be launched in an iframe with an external-open fallback and source links.
- Added responsive mobile-first styling and RU/DE/EN catalog labels.
- **Verification status:** source commits are pushed to `main`; the latest GitHub Actions workflow must be checked for typecheck, lint, build, release smoke, Pages deployment, and published-build verification. External URLs, iframe restrictions, mobile touch, and per-game licensing/assets have not all been individually verified.


## 2026-10-19 EARTH CONTROL integration pass

- Registered `earth` as an independent route in the canonical module manager.
- Added a dedicated HOME card, bottom navigation entry, embedded monitor, and isolated stylesheet; the portal shell remains in control of navigation.
- Corrected the coordinate display to the Pforzheim area to match the configured weather request.
- Reworked the dashboard to a readable single-column layout on phone widths and expanded the embedded viewport height.
- Added RU/DE/EN localization for the dashboard and its portal entry; weather labels now use Open-Meteo weather codes rather than only showing day/night.
- Expanded the bottom navigation grid to seven destinations so EARTH is not clipped on narrow devices.
- The GitHub Actions run for the latest commit must pass typecheck, lint, architecture/interaction smoke, build and release smoke before this change is treated as released. Telegram-device visual and API checks are still required.

## 2026-10-21 GORD CONTROL LAB fidelity requirement

- Established a source-first standard for hero mechanics and skill animation: official MLBB hero data/patch notes first, original skill showcase/gameplay footage for trajectories, timing, hit areas and visual cues, with dated specialist guides used only for corroboration.
- The latest generic flash/spark pass is a visual foundation, **not** proof of high-fidelity implementation. Per-skill mechanics and visuals still require reference-by-reference work and verification.
- Do not claim “99% similarity” until each skill has been compared and remaining differences are documented. JavaScript syntax and CI success do not establish runtime or animation fidelity.
- Reference starting points: [official hero database](https://www.mobilelegends.com/en/hero), [official patch notes](https://www.mobilelegends.com/news/patch-notes), and specialist current-data guide pages linked from the simulator.


## 2026-10-24 RADIO Garden integration

- Replaced the RADIO route's Radio Browser station search/carousel/player UI with a direct Radio Garden entry and embedded view at `https://radio.garden/`.
- Added a prominent external-open action using the portal's external-link bridge and a plain official URL fallback for browsers/WebViews that block embedding.
- Removed the automatic Radio Browser preload and the old station-loader path from portal startup.
- Mobile iframe sizing and fallback-link styling added in `src/styles.css`.
- **Release verification pending:** the Pages workflow is currently blocked before typecheck/build by the existing Procedural Studio smoke assertion `Missing expected audio/project capability: await Tone.loaded()`. The Radio Garden embed itself still requires runtime verification in Telegram Android; external-site framing policy may prevent iframe playback. No claim of a successful deployment is made.

- Follow-up: the Procedural Studio smoke assertion was updated to check for `Tone.loaded()` rather than requiring the exact spelling `await Tone.loaded()`; the runtime uses `Tone.loaded()` inside a timeout race. The new Pages run must still verify typecheck/build/deployment.
