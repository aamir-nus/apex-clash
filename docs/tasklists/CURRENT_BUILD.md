# Current Build

## Version

`0.1.0`

Target mini release tag: `v0.5-noqa`

Roadmap reference: [../ROADMAP.md](../ROADMAP.md)

## Active Milestone

Transition from combat sandbox to `v2` vertical slice

## Handoff Status

`0.1.0` is stable enough to hand off into `v2`.

Current handoff guarantees:

- browser shell, HUD, auth panel, inventory panel, and moveset panel all mount
- backend auth, player profile, and save contracts are documented and covered by controller-level checks
- default development admin login is available via `admin` / `admin`
- save persistence now goes through a repository boundary instead of controller-local storage
- smoke and contract tests define the accepted baseline before further scope growth

## Mini Release Status

Target: `v0.5-noqa`

Intent:

- recover to a PM-safe demo slice
- present one coherent map path instead of disconnected prototypes

Constraints:

- no QA signoff
- no production claim
- known bundle-size warning accepted for this tag

## Current Objectives

- [x] Establish MERN + Phaser monorepo foundation
- [x] Add JSON-driven bootstrap content
- [x] Add basic React shell and Phaser sandbox
- [x] Add request logging and server error handling
- [x] Add smoke-test command and baseline server tests
- [x] Add Dockerfiles and Docker Compose baseline
- [x] Document frontend UX and browser experience direction
- [x] Add combat damage and cooldown loop
- [x] Add XP and level-up progression
- [ ] Add hub scene and first dungeon scene
- [x] Build first-pass live HUD for browser play
- [x] Add first-pass sound cue system and event-driven audio hooks
- [x] Add save-slot sync payload and browser save controls
- [x] Route save-slot persistence through a repository boundary
- [ ] Persist save slots to Mongo-backed models in live DB runs
- [x] Route player profile persistence through a repository boundary
- [x] Build hub scene shell and hub-to-region entry flow
- [x] Build first authored region scene
- [x] Build first dungeon layout chain
- [ ] Add loot pickup and reward loop
- [x] Add first backend-owned dungeon reward claim loop
- [x] Add first miniboss and first boss encounter
- [ ] Add inventory and progression screens usable from browser flow
- [x] Make region exploration react to recent combat behavior with adaptive nodes and combat boons
- [x] Add first-pass combat and exploration animation language using Phaser tweens and runtime FX
- [x] Add first-pass cast windup, release timing, and recovery states for combat abilities
- [x] Surface cast-state and active effects in the HUD
- [x] Add enemy chase, windup telegraphs, and timed attack releases
- [x] Add floating combat text for readable damage feedback
- [x] Add level-up choice overlay and stat spending flow
- [x] Add scene transition overlay with timed handoff between hub, region, and combat
- [x] Add first dungeon and boss-room scene chain for demo-safe map progression
- [x] Restore gameplay boot path from selected save slot into the correct scene
- [x] Restore scene-local runtime state for region boons, dungeon relic progress, and boss HP from save data
- [x] Move level-up stat choices into the backend player progression service
- [x] Auto-sync authenticated runtime session outcomes through the backend save contract
- [x] Surface background save sync state and harden it against stale response overwrite
- [x] Move authenticated background runtime sync onto a dedicated backend session-state endpoint
- [x] Restore authenticated boot flow from backend profile session state when no save snapshot is selected

## Current Risks

- Phaser chunk remains large and should be split further once more scenes are added.
- Initial manual chunking is in place, but browser bundle behavior still needs manual verification as content grows.
- No sprite pipeline or authored tilemaps yet.
- No sound effect pipeline yet.
- Save repository supports Mongo, but live DB persistence is not manually verified yet.
- Too much temporary gameplay state still lives in the client and should move server-side before the slice grows, even though authenticated runtime state now auto-syncs through a dedicated backend session endpoint.
- Exploration adaptation is scene-local right now and should eventually be driven by backend progression/session state.
- Animation readability is better now, but still uses geometry placeholders rather than real sprite sheets.
- Enemy behavior is more readable, but still lacks richer pattern variety and authored encounter scripting.
- Combat XP now syncs through the backend progression service, but other runtime session outcomes still need the same server-owned path.
- Stat choices still persist only through saved runtime payloads, not through the backend player-profile model.

## Deferred Engineering Constraint

### Browser Bundle Size

Status:
Accepted for now and tracked.

Current state:

- Main shell bundle is reasonable after lazy loading.
- The Phaser gameplay chunk is still large and will keep growing as assets and scenes are added.

Decision:

- Do not spend time on aggressive chunk optimization yet.
- Continue building mechanics, HUD, progression, and scene structure first.
- Revisit after the first hub plus dungeon slice lands, when real chunk boundaries are clearer.

Planned mitigation later:

1. Split gameplay scenes and heavy systems into more granular lazy chunks.
2. Evaluate manual Rollup chunking for Phaser-adjacent runtime modules.
3. Keep art/audio assets external and cached instead of importing them into JS where possible.
4. Add a simple bundle budget check once content starts scaling.

## Next Actions

1. Build the `v2` execution tasklist and use it as the active work queue.
2. Implement hub scene shell plus region entry routing.
3. Verify live Mongo-backed save persistence through Docker and local DB runs.
4. Verify live Mongo-backed player profile persistence.
5. Verify manual browser resume flow from backend profile session state across hub, region, dungeon, and boss routes.
6. Add the first authored dungeon content slice.
7. Replace geometry placeholder scenes with authored tile/sprite content before any real external demo.
8. Move demo-progress persistence from save-only state into profile-aware progression services.
9. Verify browser load behavior after chunk splitting and push further scene-level chunking only if the warning or load latency returns.
