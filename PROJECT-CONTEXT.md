# FREEzzz Portal — Project Context

> Canonical project context for continued work.
> Last reviewed: 2026-10-07
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

## 5. GAME / CARGO DECK scope

Current game direction is **CARGO DECK**, a Telegram Mini App game.

Current development constraints:
- HTML5 / TypeScript / Vite architecture.
- Mobile-first vertical presentation.
- Current work has included a model-test arena and Space Marine source model calibration.
- Preserve the existing game architecture and public APIs unless a change is explicitly required.
- Performance target remains suitable for low-end Android and 60 FPS where practical.
- Avoid per-frame allocations in hot paths.
- VFX and combat systems remain modular.

Recent repository commits show the current game branch has been focused on:
- Space Marine source-axis / ground-pose calibration;
- rigid model pose optimization;
- recoil correction without cumulative transform mutation;
- temporarily stripped/controlled model-test arena presentation.

These recent GAME changes are part of the current Base/main state and must be considered before modifying GAME runtime.

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

## 8. Build and deployment rule

Required release chain:

`push to main → CI validation → typecheck → production build → release smoke / artifact validation → GitHub Pages deployment → published-build verification`

Rules:
- one functional block per release;
- obsolete builds should be cancelled;
- production deployment must not publish stale SHAs;
- typecheck/build/release smoke must pass before treating a change as deployable;
- do not claim a deployment is successful without checking the actual GitHub Actions run and published result.

## 9. Video / media rule

- Local video assets use the repository's local asset resolution mechanism.
- Do not reintroduce direct Pixabay/external video URLs where local assets are expected.
- GAME's internal video window was removed previously; `home-game.mp4` is retained where required by HOME.

## 10. Current repository checkpoint

At the latest repository inspection on 2026-10-07:
- repository exists and is accessible;
- default branch is `main);
- the latest observed commits are GAME/model-test changes from 2026-10-05;
- `README.md`, `IMPLEMENTATION-STATUS.md`, and `LAW-2.0.md` are present;
- `IMPLEMENTATION-STATUS.md` remains the implementation status source;
- deployment success must be re-verified from GitHub Actions before being described as currently green.

## 11. Working rule for future sessions

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
