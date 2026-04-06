# Smoke Tests

## Automated

- [x] `npm run validate:content`
- [x] `npm run test:server`
- [x] `npm run test:backend-contract`
- [x] `npm run test:auth-profile-contract`
- [x] Profile repository behavior is covered by controller-level persistence assertions
- [x] `npm run lint`
- [x] `npm run build`
- [x] `npm run test:smoke`

## Manual

### Local Dev

- [ ] Start server with `npm run dev:server`
- [ ] Start web with `npm run dev:web`
- [ ] Confirm `GET /health` returns `ok: true`
- [ ] Confirm archetype selection updates the build summary
- [ ] Confirm Phaser sandbox mounts without runtime errors
- [ ] Confirm player movement works with `WASD` and arrow keys
- [ ] Confirm contact with enemy displays sandbox feedback text
- [ ] Confirm launcher layout remains readable at laptop width
- [ ] Confirm HUD and helper text remain readable over gameplay canvas
- [ ] Confirm audio toggles and sound cues work once added
- [ ] Confirm kills grant XP and trigger level-up behavior
- [ ] Confirm authenticated combat XP gain updates persisted profile level/xp state
- [ ] Confirm save slot creation and sync complete without API errors
- [ ] Confirm authenticated exploration boon or dungeon progress reaches the backend without pressing manual save
- [ ] Confirm background save status surfaces pending, synced, and failure states without going silent
- [ ] Confirm authenticated runtime session sync uses the dedicated profile/session endpoint and manual save remains a separate snapshot action
- [ ] Confirm authenticated boot resumes from backend profile session state when no explicit save snapshot is selected
- [ ] Confirm login works with seeded dev admin `admin` / `admin`
- [ ] Confirm authenticated save slot is isolated from guest save listing

### Docker

- [ ] Run `docker compose up --build`
- [ ] Open web app at `http://localhost:8080`
- [ ] Confirm API health at `http://localhost:4000/health`
- [ ] Confirm web app loads bootstrap content through the Dockerized API
- [ ] Confirm authenticated save slot persists after server restart when Mongo is connected

## Known Gaps

- No end-to-end browser automation yet
- Save repository now supports Mongo when connected, but live DB persistence still needs manual verification
- No Phaser gameplay assertions beyond mount success
- Phaser/runtime chunking is improved, but the Phaser core chunk still exceeds the current warning threshold and browser load behavior still needs manual verification as more scenes and assets land
