# Apex Clash

Browser-first occult action RPG built with React, Phaser, Express, and MongoDB.

## Status

Current target: `v3` browser release candidate path

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
- active technique bindings use a 2-slot model: `Q` and `E`, with `R` reserved for `Domain Surge`
- 3 authored region routes in the current slice: Shatter Block, Veil Shrine, and Cinder Ward
- the first full Shatter route is proven end to end in the browser gate: boon -> dungeon -> miniboss -> boss -> extract -> unlock
- the Veil continuation route is also proven end to end in the browser gate: deploy -> boon -> dungeon -> miniboss -> boss -> scroll reward -> quick bind -> extract
- the Cinder route is also proven end to end in the browser gate: deploy -> boon -> dungeon -> miniboss -> boss -> reward -> quick equip -> extract
- Veil miniboss rewards are distinct from the Shatter route
- Cinder miniboss rewards are distinct from both Shatter and Veil
- route rewards can now include consumables and materials, not just equippable charms
- Veil boss scroll rewards unlock class-specific skills
- backend-owned XP, level-up choices, session sync, and reward claims
- manual save snapshots plus profile-session resume
- Mongo runtime verification now proves live profile, session, and save-slot persistence against a real Mongo-backed server
- Mongo restart verification now proves re-login and progression recovery after server restart
- Docker browser-flow verification now proves the full three-route gameplay loop against the deployed web and API stack

Implemented but still not release-polished:
- scene dressing is still mostly prototype-grade
- combat readability is improving, but still not final-quality
- launcher/HUD/inventory UX is improved, but still not ship-grade
- reward pacing exists, but not at full content depth
- progression exists, but not at full `v3` scale

Missing for a credible `v3` release candidate:
- more authored dungeons and bosses
- broader loot, consumables, and materials
- sprite and audio production pipeline
- stronger first-run onboarding and presentation polish
- broader browser UX pass across all screens and flows

Active work:
- broader authored content and reward pacing beyond the current 3-route slice
- broader browser play coverage beyond the current three-route proof
- sprite and audio production pipeline
- browser bundle hardening beyond current chunk splitting
- multi-region progression toward the `v3` release candidate bar

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
`test:docker-browser-flow` boots the Docker Compose stack and runs the full browser gameplay flow against the deployed web and API surfaces.
`test:docker-deploy` boots the Docker Compose stack, verifies the host-facing web and API surfaces, and checks Mongo-backed auth/profile/save behavior through the deployed endpoints.
`test:mongo-restart` proves that a Mongo-backed user can log back in after a server restart and still retrieve the same profile region, cleared-route progression, and save slots.
`test:mongo-runtime` starts the API against a real Mongo URI, checks `/health` persistence mode, then verifies profile/session/save flows are actually backed by Mongo rather than the memory fallback.
`test:ui-flow-audit` verifies the player-facing browser flow surfaces for transitions, onboarding, save/resume visibility, reward banners, and bind confirmation.
`test:browser-flow` now proves the full Shatter, Veil, and Cinder routes, including Veil scroll quick-bind, Cinder reward quick-equip, extract, save-slot create, resume-mode toggle, manual sync, and persistent cleared-route progression in the hub.

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

Latest three-route verified timings:
- login: `450ms`
- Shatter boss clear: `3116ms`
- Veil boss clear: `7217ms`
- Cinder boss clear: `4897ms`
- Veil quick bind: `77ms`
- Cinder quick equip: `65ms`
- manual sync: `161ms`

Latest onboarding/readability verified timings:
- local browser-flow after scene guidance pass: all 3 routes still green
- first-run tutorial flag persists: `true`
- cleared route count remains: `3`

Latest combat-readability verification:
- local browser-flow after telegraph/danger-state pass: all 3 routes still green
- combat scenes now preserve route completion and save/resume behavior under the stronger feedback layer

Latest authored-shell verification:
- local browser-flow after route-briefing shell pass: all 3 routes still green
- live route focus, directive copy, and route ladder summary stay aligned with the active scene

Latest authored-scene verification:
- local browser-flow after scene-dressing pass: all 3 routes still green
- route landmarks and chamber dressing did not break the proven browser path

Latest pacing verification:
- local browser-flow after route-tempo pass: all 3 routes still green
- Veil boss clear now lands at `6318ms`
- Cinder miniboss clear now lands at `2983ms`
- Cinder boss clear now lands at `6282ms`

Latest scene-feedback verification:
- local browser-flow after chamber-callout pass: all 3 routes still green
- Veil miniboss clear now lands at `4300ms`
- Cinder boss clear now lands at `5635ms`

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
- 3-route dungeon progression
- persistent item rewards
- live loadout-to-combat stat sync across the active gameplay scenes
- three browser-proven full routes with real extract, unlock, reward, bind, equip, and cleared-route tracking behavior
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
   - add more dungeon layouts per region
   - improve reward pacing and encounter variety
   - broaden loot, consumables, and material loops
4. Replace placeholder presentation:
   - adopt sprite-backed actors and stronger animation states
   - add a real sound pipeline instead of only lightweight cues
5. Harden deployment:
   - keep Docker and non-Docker paths green
   - address Phaser bundle strategy once content growth justifies it
