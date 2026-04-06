# Apex Clash

Browser-first occult action RPG built with React, Phaser, Express, and MongoDB.

## Status

Current target: `v2` vertical slice

Working now:
- browser launcher and Phaser play surface
- auth, player profile, inventory, and save slots
- hub -> region -> dungeon -> miniboss -> boss flow
- backend-owned XP, level-up choices, session sync, and reward claims
- manual save snapshots plus profile-session resume

In progress:
- stronger authored content and reward pacing
- live Mongo verification in Docker
- sprite/audio pipeline
- browser bundle hardening beyond current chunk splitting

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
- MongoDB: `mongodb://localhost:27017/apex-clash`

## Test Commands

```bash
npm run validate:content
npm run test:server
npm run test:auth-profile-contract
npm run lint
npm run build
npm run test:smoke
```

## Game Flow

Simple loop:

```text
Login or guest -> pick archetype -> enter hub -> explore region -> clear dungeon
-> defeat miniboss -> defeat boss -> earn reward -> sync progress -> continue or save
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
docker-compose.yml  local web/api/mongo stack
```

## Docs

- [Docs Index](./docs/README.md)
- [API Docs](./docs/API.md)
- [Common Issues](./docs/COMMON_ISSUES.md)
- [Roadmap](./docs/ROADMAP.md)
- [Current Build](./docs/tasklists/CURRENT_BUILD.md)
- [Smoke Tests](./docs/tasklists/SMOKE_TESTS.md)

## Release Reality

This is not the full product `v1` from the PRD yet.

It is a progressively hardened `v2` slice with:
- real backend contracts
- resumable session state
- early dungeon progression
- persistent item rewards
