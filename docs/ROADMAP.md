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

Near-term `v3` work should bias toward:

1. live Mongo persistence verification in real gameplay flows
2. expanding from the current 3 authored region routes into broader dungeon content
3. broader scroll, consumable, material, and progression reward loops
4. sprite, tileset, and sound pipeline adoption
5. manual browser regression checks for resume, rewards, saves, transitions, combat flow, and live loadout-to-fight sync

Current verified browser baseline:
- auth/login works with seeded admin
- hub -> region deploy is browser-control stable
- first full Shatter route is clearable in the headless browser gate
- save-slot create, resume toggle, and manual sync all pass in the headless browser gate

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
