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

## Mongo Persistence Not Verified Yet

Current state:
- repository layers support Mongo
- live Docker/manual persistence verification is still pending

Do not assume persistence is production-ready until local and Docker verification have both passed.
