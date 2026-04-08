# Apex Clash Version Roadmap

## Version Ladder

- `v1`: combat and progression sandbox
- `v2`: first playable game loop
- `v3`: content-complete browser release candidate
- `final`: expanded target-state game

This document defines the tracked workflow target. Current build focus is `v3`.

## v3

### Purpose

Reach the content-complete browser release candidate.

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
- the release-candidate content scope is represented at a shippable quality bar

## Current Work Focus

Current truth split:

- browser-proven:
  - Shatter, Veil, and Cinder full route flow
  - save/resume, reward claim, quick bind, quick equip, and cleared-route tracking
  - backend-owned profile, loadout, progression, and reward contracts
- implemented but not polished enough to call release-ready:
  - launcher, HUD, route progression presentation, and inventory/moveset UX
  - combat presentation and scene dressing
  - reward pacing and authored encounter depth
- still missing for `v3`:
  - broader content volume
  - live Mongo gameplay verification
  - sprite/audio production pipeline
  - stronger onboarding and presentation polish

Near-term `v3` work should bias toward:

1. live Mongo persistence verification in real gameplay flows
2. scene polish on the proven 3-route path: hub, region, dungeon, boss readability
3. expanding from the current 3 authored region routes into broader dungeon content
4. broader scroll, consumable, material, and progression reward loops
5. sprite, tileset, and sound pipeline adoption

Current verified browser baseline:
- auth/login works with seeded admin
- hub -> region deploy is browser-control stable
- first full Shatter route is clearable in the headless browser gate
- Veil continuation route is clearable in the headless browser gate
- Veil scroll reward -> quick bind -> extract is clearable in the headless browser gate
- Cinder continuation route is clearable in the headless browser gate
- Cinder boss reward -> quick equip -> extract is clearable in the headless browser gate
- unlocked and cleared route progression persists on the player profile and is reflected in the hub
- the hub exposes a route-ladder summary with completion percentage and full authored-route clear state
- Mongo runtime verification now proves health, profile, session, and save-slot persistence against a live Mongo-backed server
- Mongo restart verification now proves re-login and progression recovery after server restart
- Docker browser-flow verification now proves the multi-route gameplay loop against the deployed web and API stack
- save-slot create, resume toggle, and manual sync all pass in the headless browser gate
- first-run route guidance now has scene markers and stronger HUD objective surfacing on the proven path
- combat readability now has stronger threat markers, danger-state washes, and clearer vulnerability signaling on the proven path
- the browser shell now uses route-specific field briefings and directive framing tied to the active route

Current mechanic-hardening target:
- broader reward pacing and authored content depth still need to reach the same UX bar

## Current Milestone

`v1` in repo-version terms means:
- the three-route vertical slice is browser-proven end to end
- reward, loadout, progression, save, and resume contracts are stable under the current harness
- the hub reflects unlocked and cleared route progression clearly

`v1` does not mean the PRD-complete game is done.

## Next Tasks

1. Polish the proven path visually and continue reducing text-only onboarding while strengthening live combat clarity and route framing.
2. Expand authored dungeon layouts, encounter variety, and reward pacing.
3. Move from placeholder presentation toward sprite/audio production quality.
4. Revisit bundle strategy after more real content lands.
5. Add broader browser play coverage beyond the current three-route proof.

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
