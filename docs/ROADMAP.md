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
- 5 combat regions
- 20 dungeon layouts
- 4 starting archetypes fully represented
- 5 route bosses including a post-cathedral endgame boss
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
  - Shatter, Veil, Cinder, Night Cathedral, and Merger Ossuary full route flow
  - save/resume, reward claim, quick bind, quick equip, and cleared-route tracking
  - backend-owned profile, loadout, progression, and reward contracts
  - grade, mastery, trial, anomaly, and ascension state surfaced in the shell and live HUD
  - longer browser proof for consumable use, crafting, snapshot/live resume, and manual sync
  - JJK migration Phases 1 through 5
- implemented but not polished enough to call release-ready:
  - launcher, HUD, route progression presentation, and inventory/moveset UX
  - combat presentation and scene dressing
  - reward pacing and authored encounter depth
- still missing for `v3`:
  - broader content volume
  - live Mongo gameplay verification
  - sprite/audio production pipeline
  - broader onboarding and presentation polish across the full release-candidate flow

Near-term `v3` work should bias toward:

1. Phase 3 JJK content expansion on top of the completed terminology and system passes
2. scene polish on the proven 5-route path: hub, region, dungeon, boss readability
3. expanding from the current 5 authored region routes into broader dungeon content
4. broader scroll, consumable, material, and progression reward loops
5. sprite, tileset, and sound pipeline adoption

Current verified browser baseline:
- auth/login works with seeded admin
- hub -> region deploy is browser-control stable
- first full Shatter route is clearable in the headless browser gate
- Veil continuation route is clearable in the headless browser gate
- Veil scroll reward -> quick bind -> extract is clearable in the headless browser gate
- Shatter boss scroll rewards now unlock class-specific skills and broaden the scroll route beyond Veil alone
- Cinder continuation route is clearable in the headless browser gate
- Cinder boss reward -> quick equip -> extract is clearable in the headless browser gate
- Night Cathedral continuation route is clearable in the headless browser gate
- Merger Ossuary continuation route is clearable in the headless browser gate
- Night boss scroll reward -> quick bind -> extract is clearable in the headless browser gate
- the longer five-route browser path now proves consumable use, at least one successful craft, snapshot resume, live-profile resume, snapshot return, and manual sync
- inventory, moveset, and save panels now have clearer action-oriented guidance and grouped state presentation
  - the current 5 routes now map onto 20 authored dungeon chamber layouts selected from combat-read state
  - route forecasts now surface authored enemy-family mixes from content before the chamber begins
- a single `test:release-hardening` gate now proves local smoke plus deployed browser/deploy verification in sequence
- unlocked and cleared route progression persists on the player profile and is reflected in the hub
- the hub exposes a route-ladder summary with completion percentage and full authored-route clear state
- Mongo runtime verification now proves health, profile, session, and save-slot persistence against a live Mongo-backed server
- Mongo restart verification now proves re-login and progression recovery after server restart
- Docker browser-flow verification now proves the multi-route gameplay loop against the deployed web and API stack
- save-slot create, resume toggle, and manual sync all pass in the headless browser gate
- first-run route guidance now has scene markers and stronger HUD objective surfacing on the proven path
- first-run route guidance now also has a staged shell checklist that tracks deploy, boon, dungeon, and boss progress on the stable onboarding path
- route briefings now expose reward shape, unlock payoff, and route hazard framing directly in the shell so route selection reads as authored progression
- operator summary now exposes active tonics, ready crafts, and the next unlock target so run-state payoff reads clearly during the longer browser path
- the live HUD now exposes current route payoff and active tonic state so combat readability stays aligned with progression state
- boss-clear moments now expose route-specific unlock payoff through the live objective, effect chips, and combat feed before hub extraction
- hub return now highlights the next uncleared unlocked route and pushes a clearer next-deployment recommendation into the post-extract state
- save and resume surfaces now explain the consequence of live profile state versus a pinned snapshot during the longer browser path
- inventory and reward surfaces now expose stat-modifier impact so route rewards and crafted items read as real build shifts
- moveset surfaces now expose combat role and build impact so scroll unlocks and rebound slots read as real build decisions
- the live HUD now echoes bound-skill role language so combat readability does not depend on reopening the moveset panel
- the live HUD now turns tonic, craft, and unlock state into explicit next-step guidance during active play
- the current combat slice now includes Phase 2 JJK systems: CE Output vs CE Reserve, Black Flash timing windows, technique burnout, domain/anti-domain setup, and cursed tool identity passives
- combat readability now has stronger threat markers, danger-state washes, and clearer vulnerability signaling on the proven path
- the browser shell now uses route-specific field briefings and directive framing tied to the active route
- the core route spaces now have stronger authored landmarks and chamber dressing without breaking the proven browser path
- Veil and Cinder route pacing has been tightened so browser-proven encounters spend less time stalled on closed cycles
- key route moments now use in-scene callouts and chamber flashes instead of relying only on HUD text
- the combat sandbox and boss clears now have stronger hit-state and route-clear emphasis without breaking the browser proof
- boss extract now hands a route-recovery summary back into the hub so the return flow has visible payoff
- the proven route loop now has a minimal synth-audio cue layer for danger, route clear, extract, and hub return moments

Current mechanic-hardening target:
- broader reward pacing and authored content depth still need to reach the same UX bar beyond the current 20 dungeon layouts
- the longer manual browser run is still the one open accountability item before Phase 1 is honestly closed

Current JJK migration status:
- Phase 1 terminology pass: complete
- Phase 2 system pass: complete
- Phase 3 content expansion: active next step
- latest Phase 3 content pass added 4 more authored chambers, 4 more curse families, late-route Black Flash/domain crafting payoff, and a fifth endgame route beyond Night Cathedral
- latest mechanic pass now makes those added curse families affect both dungeon-sentinel pressure and boss cadence directly on the proven five-route path

## Demo-Ready Bar

Near-term demo-ready requirements:

1. local smoke is green
2. Docker browser-flow is green
3. the five-route browser path stays regression-free
4. save/resume and reward/loadout sync remain stable
5. scene readability is strong enough that a presenter does not need to narrate around the UI

Current demo status:
- requirements 1, 2, 3, 4, and 5: currently green on the proven 5-route slice
- demo-ready today means presentable vertical slice, not full `v3` completeness

## Current Milestone

`v1` in repo-version terms means:
- the multi-route vertical slice is browser-proven end to end
- reward, loadout, progression, save, and resume contracts are stable under the current harness
- the hub reflects unlocked and cleared route progression clearly

`v1` does not mean the PRD-complete game is done.

## Execution Order

Build toward `final` in three explicit phases:

1. `v3 content expansion`
2. `v3 release hardening`
3. `final-product expansion`

The rule is strict:
- do not jump ahead on polish while content milestones are still missing
- do not call a phase stable until its gate is green
- keep `test:release-hardening` green while adding scope

## Phase 1: v3 Content Expansion

Target:
- finish the minimum content bar for a credible browser release candidate

Required outcomes:
- 20 authored dungeon layouts across the current routes
- at least 1 final-chapter route or final-boss climb beyond the earlier 3-route loop
- more enemy families with clearer route-specific behavior identity
- broader scroll, consumable, and material reward usage across the full run
- stackable consumables/materials, consumable use, and crafting are now live in the profile loop
- late-route materials now also pay into Black Flash and domain-response crafting
- stronger class progression through level 20 pacing, not just the early slice

Task order:
1. Verify one longer manual browser run through the expanded content path.
2. Keep broadening route-specific chambers, curse families, and endgame craft payoffs without regressing the five-route browser proof.
3. Push the same route-specific identity deeper into boss behavior and late-route reward usage.

Gate:
- `npm run test:smoke`
- `npm run test:release-hardening`
- browser flow still green on the current proven routes
- expanded content path is manually clearable without debug intervention

## Phase 2: v3 Release Hardening

Target:
- turn the broader content slice into a real browser release candidate

Required outcomes:
- browser UX is stable across launcher, save, inventory, moveset, and route progression
- onboarding is strong enough that a new player can start without verbal guidance
- persistence is reliable in local and Docker-backed runs
- bundle, deploy, and regression gates are strong enough for external playtesting

Task order:
1. Continue reducing text-only onboarding and replace it with stronger live guidance.
2. Harden save/resume under longer runs and broader route progression.
3. Strengthen browser-flow automation to cover the expanded content path.
4. Revisit bundle strategy after the expanded content load is real.
5. Fix release-grade UX drift in inventory, moveset, and route progression surfaces.

Gate:
- `npm run test:release-hardening`
- no known route-state regressions
- no silent background sync failures
- stable Docker/browser run for the release-candidate path

## Phase 3: Final-Product Expansion

Target:
- move from a release candidate to the intended full game

Required outcomes:
- larger multi-region world structure
- deeper class branches and progression identity
- elite encounters, anomaly content, remixed dungeons, and endgame loops
- real sprite/audio production pipeline
- broader content-authoring pipeline for maps, enemies, items, bosses, and quests

Task order:
1. Expand world structure beyond the current hub + 3 core routes.
2. Add deeper class trees and stronger late-game identity.
3. Add elite hunts, anomaly zones, remixed dungeons, and endgame systems.
4. Replace synth/demo presentation with real sprite/audio production assets.
5. Scale content authoring and regression gates to support ongoing expansion.

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
