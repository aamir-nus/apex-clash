# v0.5-noqa

Status: `NO QA SIGNOFF`

Purpose:

- bank a coherent internal mini release after demo recovery work
- present one playable flow instead of fragmented prototype scenes

Included path:

- hub
- region
- dungeon
- boss room
- return / save slot path

Included systems:

- auth and backend-backed player profile scaffolding
- save-slot repository flow
- selected save-slot restore into gameplay boot
- combat timing, telegraphs, HUD cast state, level-up choice overlay
- scene transition overlays between core scenes

Known gaps:

- not externally demo-safe without a guided explanation
- no QA pass
- no sprite pipeline
- no full save/load restoration of every runtime variable
- dungeon/boss content is still minimal and authored at prototype depth
- browser bundle risk still needs long-term hardening; the Phaser core chunk still exceeds Vite's warning threshold even after initial chunk splitting

Mid-term fixes for next release:

- move exploration boon and encounter outcome sync into backend-owned progression/session state
- verify Mongo-backed save/profile persistence in live Docker runs
- replace geometry placeholder actors with sprite-backed animation states
- build one authored dungeon slice with stronger loot/miniboss pacing
- continue bundle hardening with scene- and asset-level chunk boundaries if browser loads regress

Validation used for this tag:

- `npm run test:server`
- `npm run lint`
- `npm run build`
- `npm run test:auth-profile-contract`
- `npm run test:smoke`
