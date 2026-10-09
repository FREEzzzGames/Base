# SPARK runtime architecture

## Runtime entry

- `spark.html` owns the DOM, layout, HUD, menus, and touch-control markup.
- `spark.js` is the runtime entry point and owns private game-session state.
- `spark-physics.js` contains pure, allocation-free geometry/collision primitives.
- `spark-effects.js` owns bounded particle-burst and projectile creation primitives; the runtime passes its active pools into these functions.
- `spark-audio.js` owns lazy Web Audio context creation and short sound effects.
- The game remains dependency-free and uses Canvas 2D.

## Subsystem boundaries inside `spark.js`

| Subsystem | Responsibilities | Invariants |
| --- | --- | --- |
| Data | Characters, weapon tuning, pickups, level specifications | Data definitions do not perform simulation work |
| Viewport | Logical 360×640 canvas, DPR scaling, safe-area-aware UI | Resize never changes world coordinates |
| Hub/UI | Character and weapon selection, screen navigation | UI selection is separate from in-game simulation |
| Input | Keyboard, pointer, touch and Telegram WebView fallback | Pause/hidden state clears held input |
| Session lifecycle | Reset, pause, resume, win/death timers | Reset cancels session timers and resets fixed-step clock |
| Physics | Platform collision and segment-based projectile collision | Simulation coordinates remain authoritative |
| Combat/AI | Player weapons, enemy behaviors, boss phases and damage | Damage and AI execute only during fixed simulation steps |
| Pickups | Timed energy/medkit respawn | Respawn clock advances only while the game is running |
| Rendering | Actor rigs, background, HUD effects, projectiles and VFX | Render smoothing never mutates collision coordinates |
| Main loop | Fixed-step updates, render interpolation, draw | Delta time is clamped; catch-up work is bounded |

## Frame lifecycle

1. The browser schedules the next animation frame.
2. If the document is hidden, the accumulator and timestamp are reset and no simulation work is performed.
3. Elapsed time is clamped; simulation advances at 1/60 s with a maximum of five steps per rendered frame.
4. Render-only actor smoothing runs after simulation updates.
5. Canvas rendering draws the current state.

## Change policy

- Preserve existing public UI IDs and the `spark.html` entry path.
- Keep gameplay tuning and visuals separate from simulation correctness changes.
- Avoid allocating temporary arrays/objects inside per-frame hot loops.
- Keep Canvas 2D and bounded VFX for low-end Android / Telegram WebView.
- Do not claim device performance or gameplay correctness without an actual runtime test.
- Make large subsystem extractions incrementally, with CI validation after each move.

## Extracted subsystem modules

- `spark-data.js`: immutable character/weapon definitions and player-state factory.
- `spark-ai.js`: target selection, boss phase decisions, and all per-enemy movement/attack decisions; combat effects are injected from the runtime to preserve existing projectiles, damage, and VFX.
- `spark-render.js`: render-only pose smoothing, actor interpolation, depth scaling, reusable 2D two-bone IK, pivot transforms, gait-angle math, and skeletal rig drawing primitives. Detailed character/boss art remains in runtime to avoid visual regressions.
- `spark-simulation.js`: fixed-step scheduler, delta clamp, catch-up limit and hidden-tab reset.
- `spark-session.js`: session timer ownership and cancellation.
- The runtime retains the existing gameplay update and detailed actor drawing code to avoid changing combat timing or visual output during this architecture pass.
