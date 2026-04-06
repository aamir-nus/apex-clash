# Apex Clash Technical Design

Version rollout targets are tracked in [../ROADMAP.md](../ROADMAP.md).

## Architecture

- `web/`: React shell plus Phaser runtime
- `server/`: Express API for bootstrap, guest session, and save-slot flows
- `shared/content/`: JSON-driven class, enemy, item, region, and skill definitions

Browser-first is the default deployment target. Electron wraps the same web build later.

## Frontend

React owns:

- shell UI
- save slot screens
- settings and meta screens
- Phaser mount lifecycle

Phaser owns:

- movement
- combat
- enemy behaviors
- region and dungeon runtime
- HUD overlays

Initial scenes:

- `BootScene`
- `CombatSandboxScene`

## Backend

Express responsibilities:

- `POST /auth/guest`
- `GET /content/bootstrap`
- `GET /save-slots`
- `POST /save-slots`
- `GET /save/:slotId`
- `PUT /save/:slotId`

MongoDB is configured as the long-term persistence store, but the initial scaffold tolerates running without a live DB so gameplay iteration is not blocked.

## Data Strategy

Author core content in JSON first:

- archetypes
- enemies
- skills
- items
- regions

This keeps balancing and iteration fast while the runtime stabilizes.

## Milestones

1. Combat sandbox
2. Progression vertical slice
3. Hub plus region plus dungeon slice
4. Content expansion
5. Ship prep and Electron wrap

## Version Mapping

- `v1`: combat sandbox plus progression and save scaffolding
- `v2`: hub, first authored region or dungeon, and Mongo-backed save flow
- `v3`: broader content-complete browser release candidate
- `final`: expanded endgame and content scale on the same architecture

## Immediate Build Priorities

1. Replace placeholder rectangle combat with sprite-based entities and real attacks.
2. Add damage, cooldown, and XP systems to Phaser.
3. Wire save slot CRUD to Mongo-backed models.
4. Add hub scene and one real dungeon map authored in Tiled.
