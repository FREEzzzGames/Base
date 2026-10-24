# FREEzzz Portal — Project Context

> Canonical project context for continued work.
> Last reviewed: 2026-10-11
> Repository: FREEzzzGames/Base
> Branch: main

## 1. Source of truth

- **Only working repository:** `FREEzzzGames/Base`
- **Only working branch:** `main`
- Do not use GameTEST or other repositories as the working base.
- Existing code is the baseline. Changes must be incremental and must not replace working modules without an explicit requirement.
- The project is currently treated as a **Telegram Mini App**. Android host and standalone-web variants are parked unless explicitly reactivated.

## 2. Portal architecture

The portal is split into independent functional clusters:

- **HOME** — mandatory initial screen.
- **LIVE** — streamer/channel catalog. Static creator list; clicking a creator opens the YouTube channel in the lower content area rather than redirecting the whole portal.
- **CHAT** — Windows-98-inspired market/chat cluster.
- **GAME** — game catalog/runtime.
- **RADIO** — independent radio integration.
- **LIBRARY** — independent library/catalog.
- **MIHI** — independent module; failures must not break the rest of the portal.

A failure in one cluster must not prevent the other clusters from loading.

## 3. Global UI rules

- Start on **HOME**, never CHAT.
- Vertical mobile-first layout, target 9:16.
- RU / DE / EN language selector remains visible and centered at the top.
- Localization must not be hard-coded into module logic.
- Keep controls minimal and functional.
- The main BAR is a single coordinated layer; buttons must remain above video/content layers.
- No obsolete BAR layers, old placement remnants, or red neon background under the BAR.
- Do not restore removed portal UI or mechanics unless explicitly requested.
- Existing responsive behavior must be preserved while fixing scaling/positioning.

## 4. Portal economy

The portal has **no system-level economy**.

The previously planned portal-economy Stage 21 is permanently excluded:
- no Marketplace;
- no portal Collection economy;
- no Auctions;
- no portal coins/currency;
- no buying/selling layer.

Game-specific gameplay mechanics are separate from portal infrastructure.

## 5. GAME / SPARK scope

The current GAME route is **SPARK / Ichiraku Ramen: Shinobi Ops**, embedded by `src/spark-console.html` and backed by the runtime in `public/spark.html` and `public/spark-*.js`.

- Preserve the eight-shinobi action-platformer/shooter and its existing combat simulation.
- Do not restore CARGO DECK as the active GAME runtime; its legacy URL redirects to SPARK.
- The console provides movement, jump, weapon selection, shield, blink, fire, menu and restart controls.
- Keep portrait/mobile Telegram Mini App presentation and optimize rendering for low-end Android.
- Avoid per-frame allocations and expensive repeated background rendering.
- A successful build or source audit does not prove touch behavior or frame rate on a real Android/Telegram WebView device; those remain explicit runtime verification tasks.


## 6. Telegram boundary

- Telegram WebApp SDK integration is isolated at the platform boundary.
- Telegram-specific behavior must not leak into unrelated portal modules.
- Standalone Android implementation is parked.
- Standalone web implementation is parked unless explicitly activated.

## 7. Development law

`LAW-2.0.md` is canonical and remains a 31-stage development plan.

Current documented status includes:
- Source of Truth;
- Architecture Foundation;
- Full Audit;
- Green CI;
- Reproducible Build;
- constructor concept removed;
- developer diagnostics gated behind `VITE_FREEZZ_DEV_TOOLS=1);
- portal economy excluded.

The remaining LAW stages must not be renumbered.

## 8. Repository hygiene and quality gates

- `.gitignore` excludes Node/Vite build output, Android/Gradle artifacts, local IDE state, and local environment files.
- ESLint runs targeted correctness rules on TypeScript/JavaScript source in the main CI workflow.
- Android plugin and library versions are centralized in `android/gradle/libs.versions.toml`.
- Android Lint and KtLint run in the Android-specific workflow when Android files change.
- ProGuard keep rules cover `MainActivity` and `OverlayService`; release minification stays disabled until a minified release is built and verified.
- Material changes to functionality, architecture, build, or deployment must update `IMPLEMENTATION-STATUS.md` and this document.

## 9. Build and deployment rule

Required release chain:

`push to main → CI validation → typecheck → production build → release smoke / artifact validation → GitHub Pages deployment → published-build verification`

Rules:
- one functional block per release;
- obsolete builds should be cancelled;
- production deployment must not publish stale SHAs;
- typecheck/build/release smoke must pass before treating a change as deployable;
- do not claim a deployment is successful without checking the actual GitHub Actions run and published result.

## 10. Video / media rule

- Local video assets use the repository's local asset resolution mechanism.
- Do not reintroduce direct Pixabay/external video URLs where local assets are expected.
- GAME's internal video window was removed previously; `home-game.mp4` is retained where required by HOME.

## 11. Current repository checkpoint

At the latest repository inspection on 2026-10-10:
- repository exists and is accessible;
- default branch is `main);
- the GAME route is the open-games catalog with SPARK / Ichiraku Ramen: Shinobi Ops retained as a featured in-portal game; CARGO DECK is not the active runtime;
- `README.md`, `IMPLEMENTATION-STATUS.md`, and `LAW-2.0.md` are present;
- `IMPLEMENTATION-STATUS.md` remains the implementation status source;
- deployment success must be re-verified from GitHub Actions and the published build before being described as currently green.

## 12. Working rule for future sessions

Before changing code:

1. Inspect the current `main) state.
2. Read `IMPLEMENTATION-STATUS.md` and `LAW-2.0.md`.
3. Identify the affected portal cluster/module.
4. Preserve module independence and existing public APIs.
5. Make the smallest coherent change.
6. Run typecheck/build/smoke validation.
7. Verify the complete deployment chain before declaring the change deployed.
8. Update this context/status document when project architecture, constraints, or stable behavior materially changes.

This document is project context, not a replacement for the actual implementation or `LAW-2.0.md`.


## 13. 2026-10-11 implementation update

- The module manager now tracks the active view, validates routes, supports per-module lifecycle adapters, and isolates adapter failures.
- GAME and LIVE use lifecycle adapters for activity cleanup; event listeners are individually isolated.
- HOME can explicitly relaunch the last played local library ROM. This is a relaunch shortcut, not an emulator save-state restore.
- Emulator launch preflight validates the selected system, extension, non-empty file size, IndexedDB and object-URL support before boot.
- LIVE, CHAT and LIBRARY have a localized render-failure fallback with a retry action.
- CI now runs portal architecture smoke tests before the production build.
- The current EmulatorJS system registry includes NES/Game Boy/Master System/Mega Drive/SNES/GBA/PlayStation/Nintendo DS. Nintendo 3DS is not currently a supported core in this registry and must not be represented as implemented without adding and validating a compatible core.
- Device-level Telegram runtime validation remains separate from source/build tests.


## 14. 2026-10-16 GAME open-source catalog integration

- Added `src/open-games-catalog.ts`: 142 individual browser-game candidates plus 10 external open-game projects/collections, with category filters, search, source links, and in-portal iframe launch for individual games.
- Replaced the single-game GAME route with the catalog while preserving SPARK as the featured original FREEzzz game and retaining the existing independent GAME route/lifecycle.
- Added responsive mobile-first catalog styles in `src/styles.css`; localization is included for RU/DE/EN.
- External games remain hosted at their source URLs; the portal does not copy their code or assets. Iframe restrictions and rights to names/assets vary by project. Individual mobile runtime and license audits are still required.
- Source implementation commits: `5ff52bb58b00a45b5cd0d086b34836e428702742`, `753dcdaf11a581a3fed05b64100f85c50f275c98`, `ed199638e8b262c3cf6b4493b26a4580784dad6f`, `5f97f4a89a33f8fa7e7e8130fa7ded7199d1b445`, `8b206c59b30022a852819f7b18bd4e511c735fc0`.
- CI and published-build verification must pass before marking this feature released; Telegram Android touch behavior and iframe compatibility remain device/runtime checks.


## 15. 2026-10-19 EARTH CONTROL module

- Added an independent `EARTH` portal route and HOME card, keeping the existing clusters intact.
- The standalone `public/earth-control.html` dashboard includes an animated stylized globe, solar-orbit visualization, lunar phase/illumination estimate, atmosphere reference values, and Open-Meteo current weather for Pforzheim.
- The dashboard is embedded in the portal and receives the active RU/DE/EN language via its query string; dashboard labels and weather conditions are localized.
- Mobile layout uses a single-column panel stack at phone widths; the portal navigation has seven destinations and the stylesheet reserves seven tab columns.
- The coordinates displayed are Pforzheim-area coordinates and align with the weather query. The globe is illustrative, not a live satellite image. Satellite positions/count remain explicitly unavailable until a validated live orbital feed is integrated.
- The astronomical values are approximate visual estimates, not precision ephemerides. Device-level Telegram WebView behavior and external Open-Meteo reachability require runtime verification.

## 16. GORD CONTROL LAB fidelity standard (2026-10-21)

- Treat original Mobile Legends: Bang Bang skill demonstrations and current in-game behavior as the reference of truth for the standalone `public/gord-control-lab.html` simulator.
- Before implementing or changing a hero skill, inspect current official hero information and patch notes, then compare against original gameplay/skill showcase footage when available. Community guides may corroborate numeric values, but must not replace original footage for animation timing, trajectories, hit areas, or cast behavior.
- Record per skill: cast/charge time, projectile path and speed, bounce/targeting rules, area and hit timing, duration/tick count, steering/recast behavior, crowd control, cooldown, damage formula, and visual/audio cues where observable.
- Separate verified behavior from approximation. Do not describe a hero or skill as 99% faithful until its mechanics and animation have been compared against references and validated in the simulator; report gaps explicitly.
- Implement skill-specific visuals rather than applying one generic burst to every ability. Preserve per-hero palettes only as a fallback; projectile trails, impact flashes, sparks, area telegraphs, beam width/steering, and animation timing should follow the reference skill.
- Validate each change in this order: reference comparison → mechanic implementation → visual timing/effects → JavaScript syntax → automated build/CI → published URL and Android/Telegram runtime. CI success alone does not prove touch behavior or visual fidelity.
- Current source links to start with: official MLBB hero database `https://www.mobilelegends.com/en/hero`, official patch notes `https://www.mobilelegends.com/news/patch-notes`; use official hero videos where available and cross-check current stats against a dated specialist guide.


## 17. 2026-10-24 RADIO Garden replacement

- The RADIO route now presents Radio Garden at `https://radio.garden/` instead of the portal's Radio Browser genre/search/carousel interface.
- The route contains an embedded view, a direct external-open button routed through `openExternalUrl`, and a visible official URL fallback. If Radio Garden refuses iframe embedding, the external link remains available.
- Portal-owned ads are not added. The portal cannot guarantee the absence of advertising or commercial UI served by Radio Garden itself.
- The Radio Browser station loader and automatic HOME preload were removed from the active route.
- An outdated Procedural Studio smoke assertion was found to require the exact text `await Tone.loaded()`, although the current implementation correctly calls `Tone.loaded()` inside a timeout race. The assertion was changed to check `Tone.loaded()` as the capability. Re-run and verify the full release chain after this correction. Test actual iframe and external-link behavior in Telegram Android before claiming runtime compatibility.
