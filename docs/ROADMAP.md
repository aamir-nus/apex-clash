# Apex Clash Version Roadmap

## Version Ladder

- `v1`: combat and progression sandbox
- `v2`: first playable game loop
- `v3`: content-complete browser release candidate
- `final`: expanded target-state game

This document defines what each version should look like so future sessions can build against a stable target.

Detailed version docs:

- [v1](./v1/PRD.md)
- `v2`: active vertical-slice planning is maintained alongside the tracked API and roadmap docs
- `v3`: content-complete browser release candidate target
- `final`: expanded target-state game target

## v1

### Purpose

Prove the core stack and the combat feel.

### Expected Shape

- browser-first React + Phaser runtime
- Express API scaffold
- JSON-driven class, enemy, item, region, and skill content
- single combat sandbox scene
- live HUD, cooldowns, combat feed, and first-pass sound cues
- XP, level-up, and save-slot payload scaffolding

### Exit Criteria

- combat loop is responsive
- archetypes feel distinct at a basic stat and input level
- smoke-test gate passes reliably
- backend logs are readable and useful during iteration
- auth/profile/save contracts are explicit enough to hand off into `v2`

## v2

### Purpose

Turn the sandbox into a real playable vertical slice aligned to the `occult_action_rpg_prd_and_design_v_2` spec.

### Expected Shape

- one hub scene
- one playable region
- three dungeon layouts total within the first region slice
- one miniboss and one boss encounter
- authored map data instead of placeholder arena-only layout
- first usable inventory and skill progression screens
- Mongo-backed save persistence replacing in-memory save slots
- repository-backed persistence boundary for save and profile state
- sprite, tileset, and sound-effect pipeline in place
- browser HUD refined for actual play sessions rather than sandbox inspection
- first loot, scroll, and region unlock loop from hub to combat content and back

### Systems Required

- region transition flow
- enemy waves and encounter scripting
- loot drops and pickups
- level-up rewards with meaningful stat or skill decisions
- save/load loop from browser UI
- better request and gameplay logging for slice debugging
- one coherent hub menu flow for launching runs, viewing saves, and checking progression
- data-driven region, dungeon, enemy, and reward definitions matching the v2 PRD

### Exit Criteria

- player can start from hub, clear content, and return with progression intact
- one session feels like a small but real game loop
- no critical persistence or navigation bugs
- Dockerized stack is usable for local slice verification
- the vertical slice clearly demonstrates the intended browser UX, audio feedback, and content pipeline

## v3

### Purpose

Reach the content-complete browser release candidate defined by the v2 design doc's initial shipping scope.

### Expected Shape

- 1 hub area
- 3 combat regions
- 9 dungeon layouts
- 4 starting archetypes fully represented
- 3 major bosses plus final boss
- progression cap around level 20
- stable browser UX for launcher, HUD, save slots, settings, and progression screens
- stronger 8-bit identity across art, UI, audio, and map dressing
- production-safe Mongo persistence and clearer deploy workflow
- scroll unlocks, itemization, and class progression all functioning across the full browser run

### Systems Required

- full region unlock flow
- refined combat with readable enemy tiers
- content-driven loot and scroll unlocks
- class differentiation by level 5 and beyond
- basic telemetry or session diagnostics
- bundle and asset strategy reviewed after real content load lands

### Exit Criteria

- one full run is possible in browser
- the build is stable enough for external playtesting
- progression, boss flow, and save integrity are reliable
- browser packaging is clean enough that Electron can remain a later wrapper instead of a blocker
- the v1 content scope from the design doc is represented at a shippable quality bar

## Final

### Purpose

Deliver the expanded target-state single-player occult action RPG.

### Expected Shape

- multi-region world structure with layered progression
- richer class branches and deeper build identity
- elite encounters, anomaly content, remixed dungeons, and endgame loops
- stronger audiovisual identity, including authored sprite sets, effects, and sound design
- robust content production pipeline for maps, enemies, items, quests, and bosses
- browser build plus optional Electron packaging

### Final-State Themes

- replayable progression
- strong class fantasy
- readable action under pressure
- exploration that matters
- extensible content architecture without major engine rewrites

## Practical Rule

Build forward in order:

1. `v1` proves the runtime.
2. `v2` proves the playable loop.
3. `v3` proves the initial game.
4. `final` expands the game without breaking the browser-first foundation.
