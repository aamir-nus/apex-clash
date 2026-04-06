# Apex Clash

Browser-first occult pixel action RPG scaffold built on React, Phaser, Express, and MongoDB.

## Release Note

Current mini release target: `v0.5-noqa`

This tag is a demo-recovery build, not a QA-approved release. It exists to present one coherent playable flow:

- hub
- region
- dungeon
- boss room
- return / save path

Known release status:

- `NO QA SIGNOFF`
- bundle-size warning still present
- gameplay and persistence flow improved, but not production-ready

## Stack

- Frontend: React + Phaser + Vite
- Backend: Node.js + Express + MongoDB-ready runtime
- Shared content: JSON definitions for archetypes, enemies, items, regions, and skills
- Future desktop target: Electron wrapping the web build

## Repo Layout

```text
web/            React shell + Phaser runtime
server/         Express API and persistence shell
shared/         JSON-driven game content
docs/           Versioned product docs and tasklists
docs/tasklists/ Active execution memory
docs/v1..final/ Version-specific design targets
```

## Current State

This repo now includes:

- a workspace-based monorepo skeleton
- an Express API with content bootstrap, guest session, request logging, and save-slot scaffolding
- a React shell that mounts a Phaser combat sandbox with live HUD and browser audio cues
- progression-aware combat with XP, level-ups, cooldowns, and wave respawns
- browser save-slot controls wired to the scaffold API
- auth, player profile, inventory/loadout, and save-slot business logic owned by the backend API
- initial shared content definitions aligned to the v1 scope
- tasklists, smoke-test docs, and Docker packaging baseline

## Local Setup

1. Copy `.env.example` to `.env` if needed.
2. Install dependencies with `npm install`.
3. Run `npm run dev:server`.
4. Run `npm run dev:web`.

Server default: `http://localhost:4000`

Web default: `http://localhost:5173`

Default dev admin:

- username: `admin`
- password: `admin`

## Quality Gate

- `npm run validate:content`
- `npm run test:server`
- `npm run lint`
- `npm run build`
- `npm run test:smoke`

Task tracking and session memory live under [docs/tasklists/README.md](/Users/aamirsyedaltaf/Documents/apex-clash/docs/tasklists/README.md).
Versioned product docs are indexed in [docs/README.md](/Users/aamirsyedaltaf/Documents/apex-clash/docs/README.md).
API contracts are documented in [docs/API.md](/Users/aamirsyedaltaf/Documents/apex-clash/docs/API.md).

## Backend Verification

The current backend contract is covered by controller and logging tests:

- content bootstrap shape
- guest session creation
- save-slot create, read, and update flows
- invalid archetype rejection
- request logging with request IDs
- error logging with structured request context

Current backend logs are structured as timestamped event lines with JSON context so request flow and save mutations are easy to trace during iteration.

Useful backend checks:

- `npm run test:server`
- `npm run test:backend-contract`
- `npm run test:auth-profile-contract`

Current save-slot persistence uses a repository boundary:

- memory fallback during no-DB runs and isolated tests
- Mongo-backed storage automatically when the server has a live Mongo connection

Current player-profile persistence uses the same pattern.

## Docker

Run the stack with:

```bash
docker compose up --build
```

Services:

- Web: `http://localhost:8080`
- API: `http://localhost:4000`
- MongoDB: `mongodb://localhost:27017/apex-clash`
