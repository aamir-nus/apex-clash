# V2 Execution Checklist

This is the active delivery list for the `v2` vertical slice.

## Build

- [x] Create `HubScene`
- [x] Add launcher to hub transition
- [x] Create `RegionScene`
- [ ] Create first dungeon layout chain
- [x] Add region entry and return flow
- [ ] Add loot drops and pickup handling
- [ ] Add first inventory screen
- [ ] Add first progression or stat allocation screen
- [ ] Add first miniboss encounter
- [ ] Add first boss encounter
- [x] Add adaptive region exploration nodes keyed off recent combat behavior
- [x] Feed exploration boons back into combat runtime
- [x] Add first-pass action animation timing for movement, strikes, projectiles, dodge, hits, and POIs
- [x] Add first-pass combat windup and recovery timing instead of instant ability resolution
- [x] Surface live cast-state and active effects in the HUD
- [x] Add enemy chase plus telegraphed timed attacks
- [x] Add floating combat text for damage readability
- [x] Add first level-up choice flow and stat allocation overlay
- [x] Add timed scene transition overlay between active scenes
- [x] Route save slots through a persistence repository with memory fallback
- [ ] Verify Mongo-backed save slot persistence against a live database
- [x] Route player profiles through a persistence repository with memory fallback
- [ ] Verify Mongo-backed player profile persistence against a live database
- [ ] Move auth, save, inventory, and progression source-of-truth logic to backend services
- [x] Move level-up choice persistence to backend progression service
- [x] Move combat XP reward application to backend progression service
- [ ] Move loadout validation and stat application to backend responses
- [ ] Add data definitions for region, dungeon, loot, and enemy slice

## Test

- [x] Backend tests cover current save flow contract and invalid archetype rejection
- [x] Backend request-contract script reports expected responses and logs
- [x] Auth and player-profile contract script reports expected responses and logs
- [ ] Smoke test passes after each major feature merge
- [ ] Manual browser test: start in hub, enter region, clear encounter, return, save
- [ ] Manual browser test: level-up and save persistence remain intact
- [ ] Manual backend test: save slot survives process restart when Mongo is available
- [ ] Manual Docker test: slice boots and API responds correctly

## Bugfix

- [x] Fix any blocker found during build or test phase before moving forward
- [x] Update smoke tests when new regressions appear
- [x] Tighten logs for unclear gameplay or API failure points

## Commit

- [ ] Group completed feature pass into one coherent commit
- [ ] Update changelog and tasklists before commit
- [ ] Verify branch state is clean after commit
