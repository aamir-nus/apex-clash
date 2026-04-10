# Apex Clash

Browser-first occult action RPG built with React, Phaser, Express, and MongoDB.

## Status

Current target: `v3` browser release candidate path

## Demo Readiness

Current demo target:
- one stable browser-first demo path that can be presented without explaining away broken transitions, missing save behavior, or reward/loadout drift

Demo-ready requirements:
- login or register works cleanly
- hub -> Shatter -> Veil -> Cinder route flow completes in the browser gate
- reward -> quick bind / quick equip -> extract flow is visible and understandable
- cleared-route progression, save-slot create, resume toggle, and manual sync all work
- scene transitions are readable and do not bleed stale route state
- local smoke passes
- deployed Docker browser-flow passes

Current honest status:
- core demo path: ready
- browser proof: green
- deploy proof: green
- presentation polish: demo-ready on the proven 4-route slice
- content breadth: below full `v3` target
- JJK migration: Phase 1 terminology pass and Phase 2 system pass complete; Phase 3 content expansion remains

Browser-proven now:
- browser launcher and Phaser play surface
- auth, player profile, inventory, and save slots
- hub -> region -> dungeon -> miniboss -> boss flow
- hub deployment now has explicit browser controls as well as keyboard input, so scene transitions are testable without fragile focus assumptions
- region, dungeon, and boss scenes now expose visible action controls in the browser shell for stable onboarding, accessibility, and automation
- inventory and moveset changes now sync into active combat, dungeon, and boss scenes without needing a scene restart
- first-route onboarding now uses stronger HUD objective calls and pulsing in-scene target markers instead of relying only on text
- combat, dungeon, and boss encounters now have stronger live telegraph emphasis: threat markers, danger washes, and clearer vulnerability-state color changes
- the browser shell now frames the active route as a field briefing instead of a generic status dashboard
- hub, region, dungeon, and boss scenes now have stronger authored dressing and route landmarks instead of reading as flat test chambers
- Veil and Cinder route pacing now has less dead time: cleaner window timing, lighter backlash, and limited off-window chip progress
- boon claim, sentinel break, rupture windows, and boss clears now trigger in-scene callouts and short chamber flashes
- combat sandbox and boss clears now have stronger hit-state callouts, wave-break framing, and route-clear emphasis
- boss extract now carries a route-clear recovery summary back into the hub, so return flow lands with visible payoff instead of an abrupt reset
- the proven demo slice now has a minimal synth-audio byte layer for danger, route clear, extract, and hub return moments
- active technique bindings use a 2-slot model: `Q` and `E`, with `R` reserved for `Domain Surge`
- 4 authored region routes in the current slice: Shatter Block, Veil Shrine, Cinder Ward, and Night Cathedral
- 12 authored dungeon chamber layouts now back the 4 current routes, selected from recent combat style and surfaced in-region before deployment
- route forecasts now surface authored enemy-family mixes from content before entering the chamber
- the first full Shatter route is proven end to end in the browser gate: boon -> dungeon -> miniboss -> boss -> extract -> unlock
- the Veil continuation route is also proven end to end in the browser gate: deploy -> boon -> dungeon -> miniboss -> boss -> scroll reward -> quick bind -> extract
- the Cinder route is also proven end to end in the browser gate: deploy -> boon -> dungeon -> miniboss -> boss -> reward -> quick equip -> extract
- the Night Cathedral final-ascent route is also proven end to end in the browser gate: deploy -> boon -> dungeon -> miniboss -> boss -> final scroll reward -> quick bind -> extract
- Veil miniboss rewards are distinct from the Shatter route
- Cinder miniboss rewards are distinct from both Shatter and Veil
- route rewards can now include consumables and materials, not just equippable charms
- Shatter boss scroll rewards now unlock class-specific skills and extend the scroll path beyond Veil alone
- Veil boss scroll rewards unlock class-specific skills
- inventory now supports stackable consumables/materials, consumable use, and recipe crafting
- the longer browser path now proves consumable use, at least one successful craft, snapshot resume, live-profile resume, snapshot return, and manual sync on the expanded four-route run
- inventory, moveset, and save panels now surface clearer next-step guidance, active slot counts, gear/stash grouping, recipe readiness, and run-recovery state
- first-run onboarding now uses a staged route checklist in the shell, with stronger live emphasis on deploy, boon, dungeon, and boss milestones
- route cards and route briefings now surface reward shape, unlock payoff, and route hazard framing instead of acting like generic progress boxes
- operator summary now exposes active tonics, ready crafts, and the next unlock target so progression state is visible without panel-hopping
- the live HUD now surfaces current route payoff and active tonic effects so run-state remains readable during combat and boss flow
- boss-clear moments now carry route-specific unlock payoff into the objective, active effects, and combat feed before extraction
- hub return now auto-focuses the next uncleared unlocked route and surfaces the recommended next deployment in the post-extract state
- save and resume surfaces now explain the consequence of choosing live profile state versus a pinned snapshot during longer runs
- inventory and reward surfaces now spell out stat-modifier impact so newly earned gear and crafted items read like build changes instead of generic loot
- moveset surfaces now spell out combat role and build impact so new scrolls and rebound slots read like real technique decisions instead of raw cooldown cards
- the live HUD now carries that same skill-role language, so bound techniques remain readable during active route play instead of only in the side panel
- the live HUD now gives actionable route guidance for tonic timing, ready crafts, and the next unlock push instead of only describing current state
- the current combat slice now includes Phase 2 JJK systems: CE Output vs CE Reserve, Black Flash timing windows, technique burnout, domain/anti-domain setup, and cursed tool identity passives
- backend-owned XP, level-up choices, session sync, and reward claims
- manual save snapshots plus profile-session resume
- Mongo runtime verification now proves live profile, session, and save-slot persistence against a real Mongo-backed server
- Mongo restart verification now proves re-login and progression recovery after server restart
- Docker browser-flow verification now proves the full four-route gameplay loop against the deployed web and API stack

Implemented but still not release-polished:
- scene dressing is still mostly prototype-grade
- combat readability is improving, but still not final-quality
- launcher/HUD/inventory UX is improved, but still not ship-grade
- reward pacing exists, but not at full content depth
- dungeon content is broader than before, but still below the full `v3` content-complete bar
- progression exists, but not at full `v3` scale

Missing for a credible `v3` release candidate:
- more authored dungeons and bosses
- broader loot, consumables, and materials
- sprite and audio production pipeline
- deeper authored audio identity beyond the current synth cue layer
- broader release-candidate presentation polish beyond the current first-run route checklist
- broader browser UX pass across all screens and flows

Active work:
- broader authored content and reward pacing beyond the current 4-route slice
- Phase 3 JJK content expansion on top of the completed terminology and system passes
- broader browser play coverage beyond the current four-route proof
- sprite and audio production pipeline
- browser bundle hardening beyond the current audited Phaser budget
- multi-region progression toward the `v3` release candidate bar
- demo-ready polish on first-run presentation, route payoff, and scene-to-scene readability
- deeper scene polish beyond the current demo-ready bar

Current execution order:
1. `v3 content expansion`
2. `v3 release hardening`
3. `final-product expansion`

Known issue:
- `phaser-runtime` still exceeds Vite's chunk warning threshold

## Setup

### Local Dev

```bash
npm install
npm run dev:server
npm run dev:web
```

Defaults:
- Web: `http://localhost:5173`
- API: `http://localhost:4000`
- Dev admin: `admin` / `admin`

### Docker

Start:

```bash
docker compose up --build
```

Stop:

```bash
docker compose down
```

Services:
- Web: `http://localhost:8080`
- API: `http://localhost:4000`
- MongoDB: internal to Docker Compose at `mongodb://mongo:27017/apex-clash`

## Test Commands

```bash
npm run validate:content
npm run test:server
npm run test:backend-contract
npm run test:auth-profile-contract
npm run test:debug-audit
npm run test:docker-browser-flow
npm run test:docker-deploy
npm run test:experience-audit
npm run test:mongo-restart
npm run test:mongo-runtime
npm run test:ui-flow-audit
npm run test:browser-flow
npm run lint
npm run build
npm run test:smoke
```

`test:experience-audit` reports gameplay/UX coverage metrics for class count, region count, item and skill breadth, objective coverage, tutorial coverage, live loadout sync coverage, and smoke-suite composition.
`test:debug-audit` verifies that request, error, reward-rejection, save, and background sync debug hooks are still present with the expected context fields.
`test:bundle-audit` enforces explicit bundle budgets so the known Phaser chunk stays within a tracked ceiling and the smaller app/runtime chunks do not drift silently.
`test:docker-browser-flow` boots the Docker Compose stack and runs the full browser gameplay flow against the deployed web and API surfaces.
`test:docker-deploy` boots the Docker Compose stack, verifies the host-facing web and API surfaces, and checks Mongo-backed auth/profile/save behavior through the deployed endpoints.
`test:release-hardening` runs the current full release gate in order: local smoke, deployed Docker browser-flow, then deployed Docker persistence verification.
`test:mongo-restart` proves that a Mongo-backed user can log back in after a server restart and still retrieve the same profile region, cleared-route progression, and save slots.
`test:mongo-runtime` starts the API against a real Mongo URI, checks `/health` persistence mode, then verifies profile/session/save flows are actually backed by Mongo rather than the memory fallback.
`test:ui-flow-audit` verifies the player-facing browser flow surfaces for transitions, onboarding, save/resume visibility, reward banners, and bind confirmation.
`test:browser-flow` now proves the full Shatter, Veil, Cinder, and Night Cathedral routes, including scroll quick-bind, reward quick-equip, consumable use, crafting, save-slot create, snapshot/live resume toggles, manual sync, and persistent cleared-route progression in the hub.

Latest verified browser-flow timings:
- login: `249ms`
- hub to region transition: `567ms`
- claim boon: `103ms`
- region to dungeon transition: `437ms`
- claim relic: `378ms`
- miniboss clear: `15421ms`
- dungeon to boss transition: `419ms`
- boss clear: `3911ms`
- extract to hub: `404ms`
- save slot create: `172ms`
- manual sync: `148ms`

Latest multi-route verified timings:
- login: `466ms`
- Shatter miniboss clear: `1515ms`
- Shatter boss clear: `3144ms`
- Veil miniboss clear: `5848ms`
- Veil boss clear: `10962ms`
- quick bind reward: `68ms`
- manual sync: `152ms`

Latest four-route verified timings:
- login: `536ms`
- Shatter boss clear: `3899ms`
- Veil boss clear: `7265ms`
- Cinder boss clear: `6081ms`
- Night boss clear: `3876ms`
- Veil quick bind: `212ms`
- Cinder quick equip: `215ms`
- Night quick bind: `207ms`
- manual sync: `225ms`

Latest longer-run verification:
- `useFieldTonicMs`: `161ms`
- `craftResinElixirMs`: `236ms`
- `craftFurnaceDraughtMs`: `183ms` when materials support the optional second craft
- `snapshotResumeBootWorks`: `true`
- `liveResumeBootMs`: `292ms`
- `snapshotResumeReturnMs`: `307ms`

Latest bundle audit:
- `phaserChunkKb`: `1179.7`
- `gameRuntimeChunkKb`: `110.07`
- `reactChunkKb`: `138.54`
- `appChunkKb`: `45.42`
- `gameCanvasChunkKb`: `2.23`

Latest expanded-content verification:
- `test:experience-audit` reports `12` dungeon layouts
- `test:experience-audit` reports `12` enemy families
- `test:experience-audit` reports `19` skills
- `test:experience-audit` reports `5` consumables
- boss-scroll unlock routing now covers Shatter, Veil, and Night Cathedral
- inventory use/craft is backend-owned and now part of the proven profile contract

Latest onboarding/readability verified timings:
- local browser-flow after scene guidance pass: the guided route path stayed green and later expanded to 4 routes
- first-run tutorial flag persists: `true`
- cleared route count now reaches: `4`

Latest combat-readability verification:
- local browser-flow after telegraph/danger-state pass: the proven route path stayed green and later expanded to 4 routes
- combat scenes now preserve route completion and save/resume behavior under the stronger feedback layer

Latest authored-shell verification:
- local browser-flow after route-briefing shell pass: the proven route path stayed green and later expanded to 4 routes
- live route focus, directive copy, and route ladder summary stay aligned with the active scene

Latest authored-scene verification:
- local browser-flow after scene-dressing pass: the proven route path stayed green and later expanded to 4 routes
- route landmarks and chamber dressing did not break the proven browser path

Latest pacing verification:
- local browser-flow after route-tempo pass: the proven route path stayed green and later expanded to 4 routes
- Veil boss clear now lands at `6318ms`
- Cinder miniboss clear now lands at `2983ms`
- Cinder boss clear now lands at `6282ms`

Latest scene-feedback verification:
- local browser-flow after chamber-callout pass: the proven route path stayed green and later expanded to 4 routes
- Veil miniboss clear now lands at `4300ms`
- Cinder boss clear now lands at `5635ms`

Latest impact-feedback verification:
- local browser-flow after combat-hit and clear-emphasis pass: the proven route path stayed green and later expanded to 4 routes
- Shatter boss clear now lands at `3494ms`
- Cinder boss clear now lands at `5964ms`

Latest demo-ready gate:
- `npm run test:smoke` passed
- `npm run test:docker-browser-flow` passed
- current demo-ready claim applies to the proven 4-route browser/deployed slice, not the full `v3` scope
- extract and hub-return payoff is now part of that proven demo slice

Latest release-hardening gate:
- `npm run test:release-hardening` passed
- sequence proved: local smoke -> Docker browser-flow -> Docker deploy persistence
- Docker browser-flow now also proves the longer run with consumable use, at least one successful craft, snapshot/live resume switching, and manual sync

## Demo Checklist

Tracked public demo bar:
- browser gate green on all 4 routes
- Docker browser gate green
- save/resume path green
- reward/bind/equip feedback green
- no known route-state regression

Local iterative checklist lives in `docs/tasklists/DEMO_READY_CHECKLIST.md` and is intentionally not tracked in git.

## Game Flow

Simple loop:

```text
Login or guest -> pick archetype -> enter hub -> explore region -> clear dungeon
-> defeat miniboss -> defeat boss -> earn reward -> equip/bind upgrades -> sync progress -> continue or save
```

HTML flow:

<div>
  <strong>Launcher</strong>
  <span> -> </span>
  <strong>Hub</strong>
  <span> -> </span>
  <strong>Region</strong>
  <span> -> </span>
  <strong>Dungeon</strong>
  <span> -> </span>
  <strong>Miniboss</strong>
  <span> -> </span>
  <strong>Boss</strong>
  <span> -> </span>
  <strong>Reward + Save/Resume</strong>
</div>

## Repo Layout

```text
web/                React shell + Phaser runtime
server/             Express API + persistence layer
shared/content/     JSON-driven game definitions
scripts/            validation and contract checks
docs/               roadmap, API, issues, and tasklists
docs/               public API and workflow docs
docker-compose.yml  local web/api/mongo stack
```

## Docs

- [Docs Index](./docs/README.md)
- [API Docs](./docs/API.md)
- [Common Issues](./docs/COMMON_ISSUES.md)
- [Roadmap](./docs/ROADMAP.md)

## Release Reality

This is not the full product `v1` from the PRD yet.

This repository milestone is `v1` in repo-version terms, not the final PRD-complete game.

## Since v1

Key differences over the `v1` tag (`v1.0` baseline):

- deployed-stack verification is much stronger:
  - live Mongo runtime check
  - Mongo restart check
  - Docker deploy check
  - Docker browser gameplay check
- auth identity is now Mongo-aware instead of process-local only
- `/health` now reports persistence mode and Mongo connection status
- scene guidance is stronger:
  - field-brief shell framing
  - route-specific directives
  - first-run route markers
  - stronger HUD objective surfacing
- combat readability is stronger:
  - clearer threat focus
  - stronger danger-state feedback
  - better boss and sentinel vulnerability signaling
- Docker definitions are more production-minded:
  - healthchecks
  - startup ordering
  - restart policy

This is a better `v1.x` hardening/polish cut, not a new scope tier.

Compared with `v0.5`, this `v1` milestone adds:
- three browser-proven authored routes instead of one partial route
- backend-owned reward, progression, and loadout contracts across the full slice
- Veil scroll unlock -> quick bind flow
- Cinder boss reward -> quick equip flow
- persistent unlocked and cleared route progression in the hub
- stable browser automation for the end-to-end gameplay loop

It is still a hardened vertical slice on the path to `v3`, with:
- real backend contracts
- resumable session state
- multi-route dungeon progression
- persistent item rewards
- live loadout-to-combat stat sync across the active gameplay scenes
- four browser-proven full routes with real extract, unlock, reward, bind, equip, and cleared-route tracking behavior
- cleared routes persist on the player profile and render distinctly in the hub progression cards
- the hub now shows an explicit Blacksite route ladder summary with clear percentage and authored-route completion state
- deploy-grade browser gameplay verification now runs against the Docker Compose web/API stack

Still missing for a spec-faithful `v3`:
- more authored dungeons and bosses
- broader loot, consumables, and materials
- sprite/audio production pipeline
- a real production-polish pass on scene visuals, combat readability, onboarding, and browser UX

## Next Steps

Immediate task breakdown:
1. Stabilize real persistence:
   - confirm save snapshot and live profile resume behave the same after restart
2. Polish the proven path:
   - improve hub, region, dungeon, and boss visual dressing
   - keep replacing instructional text with visual markers and stronger objective guidance
   - keep sharpening combat telegraphs, hit feedback, and scene clarity
   - keep making the shell and scene framing feel authored instead of scaffold-like
3. Expand authored content:
   - add more dungeon layouts and final-chapter content depth
   - improve reward pacing and encounter variety
   - broaden loot, consumables, and material loops
4. Replace placeholder presentation:
   - adopt sprite-backed actors and stronger animation states
   - add a real sound pipeline instead of only lightweight cues
5. Harden deployment:
   - keep Docker and non-Docker paths green
   - address Phaser bundle strategy once content growth justifies it
