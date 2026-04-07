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
- `npm run test:ui-flow-audit`
- `npm run test:browser-flow`
- `npm run test:smoke`

The experience audit keeps the build aligned with the intended gameplay slice, not just backend response shapes. It checks current content breadth, Q/E skill-slot truth, first-run tutorial coverage, objective coverage, live profile sync coverage, and smoke-suite composition.
The debug audit keeps our troubleshooting surface honest. It checks request/error logs, reward and skill-equip rejection logs, save-slot mutation logs, and the client-side background sync error context.
The UI flow audit checks the player-visible browser path: transition overlay messaging, onboarding visibility, save/resume visibility, reward banners, and reward-to-bind confirmation surfaces.
The browser flow check currently proves the first authored route through boon, dungeon, miniboss, boss, and extract, verifies unlocked-route visibility, creates a save slot, and verifies resume-mode and manual-sync behavior.
The browser flow check now also proves the unlocked-route continuation path: unlock -> Veil route -> Veil boss scroll reward -> quick bind -> extract.
The next browser-hardening target is the Cinder continuation path and broader multi-route content pacing.
