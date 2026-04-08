# API

Tracked backend contract reference for the current game slice.

## Base Rules

- JSON responses
- success payloads include `ok: true`
- error payloads include `ok: false` and an `error` string
- authenticated requests use `Authorization: Bearer <token>`

## Development Auth

Seeded local admin:

- username: `admin`
- password: `admin`

## Implemented Endpoints

### Health

- `GET /health`

Health payload includes:

- `mode`
- `version`
- `persistence.mode`
- `persistence.mongoConnected`
- `persistence.mongodbUriConfigured`

### Auth

- `POST /auth/guest`
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

### Content

- `GET /content/bootstrap`

Returns the bootstrap content bundle used by the client:

- classes
- enemies
- items
- regions
- skills

### Player

- `GET /player/profile`
- `PUT /player/profile/class`
- `PUT /player/loadout/item`
- `PUT /player/loadout/skills`
- `PUT /player/progression/reward`
- `PUT /player/progression/choice`
- `PUT /player/session-state`
- `POST /player/rewards/claim`

Player contract rules:

- profile state is server-owned
- progression rewards are applied server-side
- loadout changes are applied server-side and returned as recomputed profile state
- the client is expected to push recomputed loadout state into active gameplay scenes immediately after equip/bind actions
- browser-visible deploy controls are allowed to drive the same hub transition path as keyboard input
- browser-visible region, dungeon, and boss action controls are allowed to drive the same scene logic as keyboard input
- bound technique slots are capped at 2 active skills: `Q` and `E`
- `R` is reserved for `Domain Surge` and is not part of `PUT /player/loadout/skills`
- session-state updates merge into existing session keys
- unlocked region progression is stored server-side on the player profile as `unlockedRegionIds`
- cleared route progression is stored server-side on the player profile as `clearedRegionIds`
- reward claims are idempotent and duplicate claims return `reward: null`
- reward claims must include the correct route context via `regionId`
- reward claims may also include `sessionState` proof and are validated atomically against that proof in the same request
- miniboss reward claims also require `sessionState.dungeonRelicClaimed === true`
- miniboss reward claims also require `sessionState.dungeonRelicClaimedRegionId` to match the same dungeon route
- `veil_boss_scroll` also requires `sessionState.clearedBossRegionId` to match `veil_boss_vault`
- `veil_miniboss` returns a distinct class-specific epic item reward
- `cinder_miniboss` returns a distinct class-specific epic item reward
- reward claims may also return `bonusRewards` for consumables and materials
- duplicate reward claims are idempotent for both the primary reward and any bonus rewards
- `veil_boss_scroll` unlocks one class-specific skill and returns a `scroll` reward payload
- `cinder_boss_core` grants one class-specific epic item reward and can also return bonus consumables/materials

### Saves

- `GET /save-slots`
- `POST /save-slots`
- `GET /save/:slotId`
- `PUT /save/:slotId`

Save contract rules:

- save slots are explicit snapshots
- authenticated runtime session sync is separate from manual save snapshots
- authenticated users only see their own auth-owned save slots

## Current v3-Bound Expectations

Before calling the build `v3`-ready, these API expectations need to hold:

- Mongo-backed save and profile persistence verified in real runs
- progression, inventory, and session restore remain server-truth
- equipped weapon, charm, and bound skills must affect active combat state without a scene reload
- no regression in resume source, reward claim, or save-slot ownership behavior
- Dockerized web and API flows remain bootable and inspectable
- route-local runtime state must not bleed across redeploys or unlocked-route transitions
- the current authored routes remain contract-valid: `dungeon_miniboss` for `shatter_dungeon`
- the current authored routes remain contract-valid: `veil_miniboss` for `veil_dungeon`
- the current authored routes remain contract-valid: `cinder_miniboss` for `cinder_dungeon`
- the current authored routes remain contract-valid: `veil_boss_scroll` for `veil_boss_vault`

## Quality Harness

Current public regression gates:

- `npm run test:server`
- `npm run test:backend-contract`
- `npm run test:auth-profile-contract`
- `npm run test:skill-binding-contract`
- `npm run test:experience-audit`
- `npm run test:debug-audit`
- `npm run test:docker-browser-flow`
- `npm run test:docker-deploy`
- `npm run test:mongo-restart`
- `npm run test:mongo-runtime`
- `npm run test:ui-flow-audit`
- `npm run test:browser-flow`
- `npm run test:smoke`

The experience audit keeps the build aligned with the intended gameplay slice, not just backend response shapes. It checks current content breadth, Q/E skill-slot truth, first-run tutorial coverage, objective coverage, live profile sync coverage, and smoke-suite composition.
The debug audit keeps our troubleshooting surface honest. It checks request/error logs, reward and skill-equip rejection logs, save-slot mutation logs, and the client-side background sync error context.
The Docker browser-flow check boots the Compose stack and runs the same multi-route headless gameplay proof against the deployed web and API surfaces.
The Docker deploy check boots the Compose stack, verifies the host-facing web and API surfaces, and checks Mongo-backed auth/profile/save flows through the deployed endpoints.
The Mongo restart check proves that a Mongo-backed player can re-authenticate after a server restart and still recover the same profile region, cleared-route progression, and save slots.
The Mongo runtime check starts the API against a real Mongo URI, asserts `/health` reports `persistence.mode === "mongo"`, then verifies profile, session, and save-slot flows against that live backing store.
The UI flow audit checks the player-visible browser path: transition overlay messaging, onboarding visibility, save/resume visibility, reward banners, and reward-to-bind confirmation surfaces.
The browser flow check proves the first authored route through boon, dungeon, miniboss, boss, and extract, verifies unlocked-route visibility, creates a save slot, and verifies resume-mode and manual-sync behavior.
The browser flow check also proves the unlocked-route continuation paths: unlock -> Veil route -> Veil boss scroll reward -> quick bind -> extract -> Cinder route -> Cinder boss reward -> quick equip -> extract.
The browser flow check now also verifies that fully completed routes stay visibly cleared in the hub after extraction.
The browser flow check also covers the current onboarding/readability baseline: HUD objective surfacing, first-run completion persistence, and the guided three-route path remaining stable after scene-marker polish.
The next browser-hardening target is broader content pacing and richer authored route depth beyond the current three-route slice.
