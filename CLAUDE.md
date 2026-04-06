# Apex Clash Project Context

## What This Repo Is

A browser-first action RPG built with:
- React for launcher, HUD-adjacent UI, auth, inventory, and save surfaces
- Phaser for movement, combat, dungeon flow, and scene runtime
- Express for auth, content bootstrap, progression, rewards, and save contracts
- Mongo-ready repositories with in-memory fallback during tests or no-DB runs

Current delivery target:
- hardened `v2` vertical slice

Current release reality:
- not the full PRD `v1`
- coherent playable slice with persistence, progression, dungeon flow, and early rewards

## Project Structure

```text
apex-clash/
├── web/
│   ├── src/
│   │   ├── components/      React UI panels and HUD
│   │   ├── hooks/           UI/runtime integration hooks
│   │   ├── api/             browser API clients
│   │   └── game/
│   │       ├── config/      Phaser boot config
│   │       ├── runtime/     event bridge between Phaser and React
│   │       └── scenes/      Hub, region, dungeon, boss, combat scenes
├── server/
│   └── src/
│       ├── controllers/     Express request handlers
│       ├── routes/          API route registration
│       ├── services/        game/business logic
│       ├── models/          Mongoose schemas
│       └── middleware/      auth, request logging, error handling
├── shared/content/          JSON definitions for classes, items, enemies, regions, skills
├── docs/                    roadmap, API, common issues, tasklists
├── scripts/                 validation and contract scripts
└── docker-compose.yml
```

## Core Game Mechanics

Current playable loop:

1. Login or continue as guest
2. Pick an archetype
3. Enter the hub
4. Move into the region
5. Explore and pick up a temporary exploration boon
6. Enter the dungeon
7. Claim the relic
8. Defeat the dungeon miniboss sentinel
9. Enter the boss vault
10. Defeat the boss
11. Gain XP, session progress, and class-specific item reward
12. Save or resume later from save snapshot or profile session state

### Progression Ownership

Server-owned now:
- auth identity
- player profile
- computed stats
- level-up stat choice persistence
- combat XP reward application
- session-state sync
- dungeon reward claims

Still partly runtime-local:
- some scene-specific pacing and encounter staging
- most authored combat content

### Save vs Session Model

There are two persistence paths:

- Save snapshot:
  - explicit
  - chosen from save slots
  - manual `Sync Current Run`
- Profile session state:
  - background sync for authenticated users
  - stores active region/session outcomes
  - supports resume without selecting a save slot

HUD shows current resume source:
- `fresh-start`
- `save-snapshot`
- `profile-session`

## Important Runtime Files

Frontend:
- `web/src/App.jsx`
- `web/src/components/GameCanvas.jsx`
- `web/src/components/GameHud.jsx`
- `web/src/components/InventoryPanel.jsx`
- `web/src/components/SavePanel.jsx`
- `web/src/hooks/useGameRuntime.js`
- `web/src/hooks/usePlayerProfile.js`
- `web/src/hooks/useSaveSlots.js`
- `web/src/game/scenes/BootScene.js`
- `web/src/game/scenes/HubScene.js`
- `web/src/game/scenes/RegionScene.js`
- `web/src/game/scenes/DungeonScene.js`
- `web/src/game/scenes/BossScene.js`
- `web/src/game/scenes/CombatSandboxScene.js`

Backend:
- `server/src/controllers/playerController.js`
- `server/src/controllers/saveController.js`
- `server/src/services/playerProfileService.js`
- `server/src/services/saveSlotRepository.js`
- `server/src/services/playerProfileRepository.js`
- `server/src/services/contentService.js`

## How To Run

Local dev:

```bash
npm install
npm run dev:server
npm run dev:web
```

Docker:

```bash
docker compose up --build
docker compose down
```

Defaults:
- Web dev: `http://localhost:5173`
- Web docker: `http://localhost:8080`
- API: `http://localhost:4000`
- Mongo: `mongodb://localhost:27017/apex-clash`
- Dev admin: `admin` / `admin`

## Quality Gates

Use these before calling a pass stable:

```bash
npm run validate:content
npm run test:server
npm run test:auth-profile-contract
npm run lint
npm run build
npm run test:smoke
```

## Docs To Read First

- [README.md](./README.md)
- [docs/README.md](./docs/README.md)
- [docs/API.md](./docs/API.md)
- [docs/COMMON_ISSUES.md](./docs/COMMON_ISSUES.md)
- [docs/ROADMAP.md](./docs/ROADMAP.md)
- [docs/tasklists/CURRENT_BUILD.md](./docs/tasklists/CURRENT_BUILD.md)
- [docs/tasklists/SMOKE_TESTS.md](./docs/tasklists/SMOKE_TESTS.md)

## Current Constraints

- Phaser core chunk is still large
- Mongo support exists but live Docker/manual verification is still pending
- visual pipeline is still geometry-heavy rather than sprite-driven
- content depth is still vertical-slice depth, not full-game depth

## Near-Term Priorities

1. Make rewards and progression feel stronger in-play
2. Verify live Mongo persistence
3. Improve authored dungeon and boss pacing
4. Add sprite/audio pipeline
5. Keep moving business logic off the client when possible
