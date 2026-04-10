# Common Issues

## Vite Build Warns About Large Chunks

Symptom:
- `phaser-runtime` exceeds Vite's chunk warning threshold

Current state:
- tracked and accepted for the current slice
- initial manual chunking is already in place

Mid-term fix:
- split more scene/runtime boundaries
- keep large assets out of JS bundles
- revisit once more authored content lands

## Game Loads But Resume Path Looks Wrong

Check:
- HUD `Resume:` label
- `save snapshot` means selected save-slot boot
- `profile-session` means backend profile session restore
- `fresh-start` means no persisted resume source was applied

## Background Sync Failed

Check:
- Save panel background sync line
- browser console for sync failure context
- API health at `http://localhost:4000/health`

Likely causes:
- API not running
- auth token expired or missing
- invalid runtime payload after a scene change

## Docker Starts But Web Cannot Reach API

Check:
- `docker compose ps`
- API health on `http://localhost:4000/health`
- web on `http://localhost:8080`

Then:
- run `docker compose down`
- rerun `docker compose up --build`

Note:
- Mongo is intentionally not published to a host port in Docker Compose, to avoid collisions with any local Mongo instance

## Browser Flow Fails With CORS Errors

Symptom:
- browser-flow or Docker browser-flow shows `API unavailable`
- console mentions `Access-Control-Allow-Origin`

Check:
- use `http://localhost:5173` for local browser-flow
- use `http://localhost:8080` for Docker browser-flow
- avoid mixing `127.0.0.1` for the web origin while the API is allowing `localhost`

Recommended commands:
- `npm run test:browser-flow`
- `npm run test:docker-browser-flow`

Fix:
- keep browser harness URLs on `localhost`
- do not switch the web origin to `127.0.0.1` unless the server CORS allowlist is updated too

## Mongo Runtime Check Fails

Check:
- local or Docker Mongo is running
- `MONGODB_URI` points at the active Mongo instance
- `/health` reports `persistence.mode: "mongo"`

Recommended command:
- `npm run test:mongo-runtime`

If it still fails:
- start Docker Mongo with `docker compose up -d mongo`
- verify `MONGODB_URI=mongodb://127.0.0.1:27017/apex-clash`
- rerun the runtime check outside the sandbox if local port binding is blocked
