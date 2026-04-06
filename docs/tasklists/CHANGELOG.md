# Changelog

## 0.1.0 - 2026-04-06

- Created initial monorepo scaffold for `web`, `server`, `shared`, and `docs`.
- Added React shell and Phaser combat sandbox with archetype-driven runtime stats.
- Added Express bootstrap, guest auth stub, and save-slot scaffold endpoints.
- Added shared JSON content definitions.
- Added request logging, error handling, smoke-test scripts, and baseline server tests.
- Added Dockerfiles and `docker-compose.yml` for web, server, and Mongo services.
- Added frontend experience direction doc and upgraded the web shell to a more intentional browser-game launcher layout.
- Added a live browser HUD, runtime bridge from Phaser to React, first-pass cooldown/feed UI, and synthesized sound cues.
- Documented the current Phaser bundle-size issue as an accepted short-term constraint with deferred mitigation.
- Added progression-aware combat scaling, level-ups, wave respawns, and browser save-slot sync against the scaffold API.
- Tightened backend observability with request IDs, explicit save-slot mutation logs, and tests covering request/error logging behavior.
- Synced roadmap and active tasklists to the detailed `v2` design doc and created dedicated v2 execution, bugfix, and commit planning docs.
- Added the first v2 gameplay shell by routing boot into a hub scene with transitions into and back from the combat slice.
- Added a backend contract-check script, fixed save payload validation/defaulting issues, and documented the resolved backend bugs.
- Added a detailed versioned API specification for the current backend contract and planned v2 extensions.
- Added seeded local development admin credentials and documented the auth contract in the v2 API spec.
- Moved save-slot persistence behind a repository layer with Mongo-ready storage and in-memory fallback for tests and no-DB runs.
- Moved player-profile persistence behind a repository layer with Mongo-ready storage and in-memory fallback for tests and no-DB runs.
- Added adaptive region exploration nodes that react to recent combat style and grant temporary combat boons.
- Added first-pass Phaser tween-driven action animation for combat impacts, dodge flow, projectiles, enemy defeat, and exploration node pulsing.
- Added cast windup, telegraph, release, and recovery timing so combat actions no longer resolve instantly.
- Added HUD cast-state/effect readouts, enemy chase with telegraphed attacks, and floating combat text for clearer combat readability.
- Added a level-up choice overlay plus scene transition overlays for hub, region, and combat handoff.
- Added a demo-safe scene chain of region -> dungeon -> boss room with selected-save restore into the correct scene.
- Extended save restoration so region boons, dungeon relic progress, and boss-room HP state restore into the correct scene.
- Moved level-up stat choices into a backend progression endpoint and synced live profile stat updates back into combat runtime.
- Moved combat XP reward application into a backend progression endpoint and synced profile level/xp updates back into the active combat runtime.
- Added initial Vite manual chunking for Phaser, React, and game runtime modules to reduce browser bundle risk in the current slice.
- Marked the recovery build target as `v0.5-noqa` to reflect that this is a mini release without QA signoff.
- Reaffirmed backend-first ownership for business logic and updated v2 execution docs to move auth, save, inventory, and progression rules server-side.
- Added the first region scene shell and a real hub -> region -> combat -> region -> hub gameplay chain.
