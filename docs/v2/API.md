# V2 API Specification

This document defines the expected backend API contract for the current scaffold and the near-term `v2` vertical slice.

## Status

- Implemented now: `GET /health`, `POST /auth/guest`, `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `GET /content/bootstrap`, `GET /player/profile`, `PUT /player/profile/class`, `PUT /player/progression/reward`, `PUT /player/progression/choice`, `PUT /player/loadout/item`, `PUT /player/loadout/skills`, `GET /save-slots`, `POST /save-slots`, `GET /save/:slotId`, `PUT /save/:slotId`
- Planned next: session lifecycle endpoints, Mongo-backed persistence, inventory/progression endpoints once the hub-to-region slice grows

## Base Rules

- Response format uses JSON
- Success payloads include `ok: true`
- Error payloads include `ok: false` and an `error` string
- Server logs should emit structured request context with request IDs where middleware is active

## Health

### `GET /health`

Health and service metadata endpoint.

Response:

```json
{
  "ok": true,
  "version": "0.1.0",
  "mode": "scaffold"
}
```

## Auth

Development default credentials:

- Username: `admin`
- Password: `admin`
- Role: `admin`

Notes:

- These credentials are seeded automatically for local development only
- They are in-memory and reset on server restart
- They must be replaced before any shared or production deployment

### `POST /auth/guest`

Creates a guest session identity for browser play.

Request body:

- none

Response:

```json
{
  "ok": true,
  "data": {
    "userId": "guest-profile",
    "mode": "guest"
  }
}
```

Notes:

- Current implementation is a stub identity, not real auth
- Expected to evolve later into guest-slot association or token-backed session creation

### `POST /auth/register`

Creates a player account.

Request body:

```json
{
  "username": "playerone",
  "password": "secret12"
}
```

Success response:

```json
{
  "ok": true,
  "data": {
    "id": "user-uuid",
    "username": "playerone",
    "role": "player"
  }
}
```

Validation error response:

```json
{
  "ok": false,
  "error": "Username and password must be valid"
}
```

Rules:

- `username` is normalized to lowercase
- `password` must be at least 6 characters
- duplicate usernames are rejected

### `POST /auth/login`

Creates an authenticated session token.

Request body:

```json
{
  "username": "admin",
  "password": "admin"
}
```

Success response:

```json
{
  "ok": true,
  "data": {
    "token": "session-token",
    "user": {
      "id": "user-uuid",
      "username": "admin",
      "role": "admin"
    }
  }
}
```

Authentication error response:

```json
{
  "ok": false,
  "error": "Invalid credentials"
}
```

Contract notes:

- the seeded development admin can authenticate with `admin` / `admin`
- player registrations authenticate with the same endpoint
- authenticated client requests use `Authorization: Bearer <token>`

### `GET /auth/me`

Returns the current authenticated user.

Headers:

- `Authorization: Bearer <token>`

Success response:

```json
{
  "ok": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "username": "admin",
      "role": "admin"
    }
  }
}
```

Authentication error response:

```json
{
  "ok": false,
  "error": "Not authenticated"
}
```

## Content

### `GET /content/bootstrap`

Returns the static content bundle required to boot the game client.

Response shape:

```json
{
  "ok": true,
  "data": {
    "classes": [],
    "enemies": [],
    "items": [],
    "regions": [],
    "skills": []
  }
}
```

Current expectations:

- `classes` contains archetype definitions with `id`, `name`, `combatStyle`, and `baseStats`
- `enemies` contains enemy definitions for initial combat tuning
- `items` contains early gear and charm definitions
- `regions` contains hub and region metadata
- `skills` contains early skill definitions

## Player Profile And Progression

All player-profile endpoints require:

- `Authorization: Bearer <token>`

### `GET /player/profile`

Returns the authenticated player's persisted profile and computed loadout state.

Success response:

```json
{
  "ok": true,
  "data": {
    "userId": "user-uuid",
    "classType": "close_combat",
    "level": 1,
    "xp": 0,
    "xpToNextLevel": 30,
    "pendingStatPoints": 0,
    "statAllocations": {
      "attack": 0,
      "defense": 0,
      "speed": 0
    },
    "computedStats": {
      "hp": 118,
      "ce": 52,
      "attack": 17,
      "defense": 11,
      "speed": 11,
      "technique": 8,
      "perception": 10,
      "crit": 6,
      "poise": 12
    },
    "inventoryItems": [],
    "equippedItems": [],
    "availableSkills": [],
    "equippedSkills": [],
    "classOptions": []
  }
}
```

### `PUT /player/profile/class`

Resets the player's class and starter loadout to a valid archetype.

Request body:

```json
{
  "classType": "heavenly_restriction"
}
```

Validation error response:

```json
{
  "ok": false,
  "error": "Invalid classType"
}
```

### `PUT /player/progression/reward`

Applies combat-earned XP on the server and returns the updated profile.

Request body:

```json
{
  "level": 2,
  "xp": 45,
  "pendingStatPoints": 0,
  "xpGained": 20,
  "source": "combat"
}
```

Success response contract:

- same payload shape as `GET /player/profile`

Rules:

- server owns level-up resolution
- `xpGained` must be a non-negative number
- level thresholds currently use the vertical-slice formula `30 + (level - 1) * 20`

### `PUT /player/progression/choice`

Consumes one pending stat point and recalculates computed stats.

Request body:

```json
{
  "optionId": "attack",
  "runtimeState": {
    "level": 2,
    "xp": 8,
    "xpToNextLevel": 50,
    "pendingStatPoints": 1
  }
}
```

Validation error responses:

```json
{
  "ok": false,
  "error": "No pending stat points"
}
```

```json
{
  "ok": false,
  "error": "Invalid progression option"
}
```

### `PUT /player/loadout/item`

Equips a compatible item already present in the player's inventory.

Request body:

```json
{
  "itemId": "grave_polearm"
}
```

Validation errors:

- `Item not available`
- `Item incompatible with classType`

### `PUT /player/loadout/skills`

Updates the equipped skill list using already unlocked skill ids.

Request body:

```json
{
  "skillIds": ["predator_sense", "bone_breaker"]
}
```

Validation errors:

- `Skill not unlocked`

## Save Slots

### `GET /save-slots`

Lists save slots in summary form.

Response:

```json
{
  "ok": true,
  "data": [
    {
      "id": "slot-1",
      "label": "Vertical Slice",
      "level": 1,
      "regionId": "hub_blacksite",
      "archetypeId": "close_combat"
    }
  ]
}
```

Contract notes:

- This endpoint returns summary data only
- Full progression data belongs to `GET /save/:slotId`

### `POST /save-slots`

Creates a new save slot.

Request body:

```json
{
  "label": "Browser Slice",
  "archetypeId": "long_range"
}
```

Required or validated fields:

- `archetypeId`: must match a valid class id from shared content
- `label`: optional; server will default if omitted

Success response:

```json
{
  "ok": true,
  "data": {
    "id": "slot-2",
    "label": "Browser Slice",
    "level": 1,
    "regionId": "hub_blacksite",
    "archetypeId": "long_range",
    "playerState": {
      "level": 1,
      "xp": 0,
      "xpToNextLevel": 30,
      "hp": 96,
      "maxHp": 96,
      "ce": 96,
      "maxCe": 96,
      "attack": 11,
      "defense": 7,
      "speed": 10,
      "pendingStatPoints": 0
    },
    "sessionSummary": {
      "enemiesRemaining": 3,
      "combatFeed": []
    }
  }
}
```

Validation error response:

```json
{
  "ok": false,
  "error": "Invalid archetypeId"
}
```

Implementation notes:

- Default player stats are derived from shared class definitions
- Response payload must be serialized, not a live mutable in-memory reference

### `GET /save/:slotId`

Returns the full save-slot payload.

Success response:

```json
{
  "ok": true,
  "data": {
    "id": "slot-2",
    "label": "Backend Contract",
    "level": 4,
    "regionId": "hub_blacksite",
    "archetypeId": "long_range",
    "playerState": {
      "level": 4,
      "xp": 18,
      "xpToNextLevel": 30,
      "hp": 96,
      "maxHp": 96,
      "ce": 96,
      "maxCe": 96,
      "attack": 11,
      "defense": 7,
      "speed": 10,
      "pendingStatPoints": 3
    },
    "sessionSummary": {
      "enemiesRemaining": 0,
      "combatFeed": []
    }
  }
}
```

Not-found response:

```json
{
  "ok": false,
  "error": "Save slot not found"
}
```

Contract notes:

- The obsolete `stats` object is not valid and must not be returned
- `playerState` is the single progression source of truth for runtime sync

### `PUT /save/:slotId`

Updates an existing save slot.

Request body example:

```json
{
  "archetypeId": "long_range",
  "level": 4,
  "playerState": {
    "level": 4,
    "xp": 18,
    "pendingStatPoints": 3
  },
  "sessionSummary": {
    "enemiesRemaining": 0,
    "combatFeed": []
  }
}
```

Merge rules:

- `level` may be set directly or derived from `playerState.level`
- `playerState` merges into the stored object
- `sessionSummary` merges into the stored object
- unspecified fields remain intact

Success response:

- full updated slot payload, same shape as `GET /save/:slotId`

Not-found response:

```json
{
  "ok": false,
  "error": "Save slot not found"
}
```

## Logging Contract

### Request Logs

When middleware is active, requests should log:

- request start
- request completion
- `requestId`
- HTTP method
- path
- status code on completion
- duration

Example:

```text
[2026-04-06T06:31:43.047Z] INFO HTTP request started {"requestId":"req-1","method":"POST","path":"/save-slots"}
[2026-04-06T06:31:43.058Z] INFO HTTP request completed {"requestId":"req-1","method":"POST","path":"/save-slots","statusCode":201,"durationMs":11}
```

### Save Mutation Logs

Save creation and updates should log explicit events.

Example:

```text
[2026-04-06T08:40:37.013Z] INFO Save slot created {"requestId":"req-create-slot","slotId":"slot-2","archetypeId":"long_range"}
[2026-04-06T08:40:37.014Z] INFO Save slot updated {"requestId":"req-update-slot","slotId":"slot-2","level":4,"enemiesRemaining":0}
```

### Warning Logs

Expected warning cases currently include:

- invalid archetype on save creation
- update for missing save slot

## Verified Commands

- `npm run test:server`
- `npm run test:backend-contract`

## Planned API Additions

Not implemented yet, but expected during `v2` and beyond:

- `POST /session/start`
- `POST /session/end`
- inventory or loot sync endpoints
- progression or skill allocation endpoints
- Mongo-backed repository layer under the same response contract
