# Apex Clash

Browser-first occult action RPG built with React, Phaser, Express, and MongoDB.

## Status

Current target: `v3` browser release candidate path

Working now:
- browser launcher and Phaser play surface
- auth, player profile, inventory, and save slots
- hub -> region -> dungeon -> miniboss -> boss flow
- hub deployment now has explicit browser controls as well as keyboard input, so scene transitions are testable without fragile focus assumptions
- region, dungeon, and boss scenes now expose visible action controls in the browser shell for stable onboarding, accessibility, and automation
- inventory and moveset changes now sync into active combat, dungeon, and boss scenes without needing a scene restart
- active technique bindings use a 2-slot model: `Q` and `E`, with `R` reserved for `Domain Surge`
- 3 authored region routes in the current slice: Shatter Block, Veil Shrine, and Cinder Ward
- the first full Shatter route is proven end to end in the browser gate: boon -> dungeon -> miniboss -> boss -> extract -> unlock
- the Veil continuation route is also proven end to end in the browser gate: deploy -> boon -> dungeon -> miniboss -> boss -> scroll reward -> quick bind -> extract
- Veil miniboss rewards are distinct from the Shatter route
- Cinder miniboss rewards are distinct from both Shatter and Veil
- route rewards can now include consumables and materials, not just equippable charms
- Veil boss scroll rewards unlock class-specific skills
- backend-owned XP, level-up choices, session sync, and reward claims
- manual save snapshots plus profile-session resume

In progress:
- broader authored content and reward pacing beyond the current 3-route slice
- Cinder route browser hardening to the same bar as Shatter and Veil
- live Mongo-backed persistence verification in gameplay flows
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
npm run test:experience-audit
npm run test:ui-flow-audit
npm run test:browser-flow
npm run lint
npm run build
npm run test:smoke
```

`test:experience-audit` reports gameplay/UX coverage metrics for class count, region count, item and skill breadth, objective coverage, tutorial coverage, live loadout sync coverage, and smoke-suite composition.
`test:debug-audit` verifies that request, error, reward-rejection, save, and background sync debug hooks are still present with the expected context fields.
`test:ui-flow-audit` verifies the player-facing browser flow surfaces for transitions, onboarding, save/resume visibility, reward banners, and bind confirmation.
`test:browser-flow` now proves the first full Shatter route, the Veil continuation route, Veil scroll reward -> quick bind, extract, save-slot create, resume-mode toggle, and manual sync.

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

It is a hardened vertical slice on the path to `v3`, with:
- real backend contracts
- resumable session state
- 3-route dungeon progression
- persistent item rewards
- live loadout-to-combat stat sync across the active gameplay scenes
- two browser-proven full routes with real extract, unlock, reward, and bind behavior

Still missing for a spec-faithful `v3`:
- stable third-route browser-proven progression
- more authored dungeons and bosses
- broader loot, consumables, and materials
- Mongo-backed gameplay verification
- sprite/audio production pipeline
