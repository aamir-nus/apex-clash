# Apex Clash PRD

## Product Summary

Apex Clash is a browser-first single-player top-down 2D pixel action RPG built on the MERN stack. The game pairs Pokemon-like exploration and progression with real-time PvE combat inspired by action MOBAs, while staying legally distinct from licensed anime IP.

Version progression is defined in [../ROADMAP.md](../ROADMAP.md).

## v1 Goal

Ship a fun vertical slice that proves three things:

1. Combat is readable and responsive.
2. Starting archetypes feel distinct quickly.
3. Content can be added through JSON-driven definitions instead of hardcoded one-offs.

## Version Targets

- `v1`: prove combat, stack viability, and content-driven scaffolding
- `v2`: ship the first real hub-to-combat playable loop
- `v3`: reach content-complete browser release candidate scope
- `final`: expand into the full target-state game

## Design Pillars

1. Readable action
2. Build identity
3. Rewarded exploration
4. Controlled scope
5. Replayable progression

## v1 Scope

- 1 hub area
- 3 combat regions
- 9 dungeon layouts
- 4 starting archetypes
- Level cap 20
- 3 major bosses and 1 final boss
- 20 skills, 25 scrolls, 50 items, 30 to 40 enemies

## Core Loop

1. Start from hub
2. Enter region or dungeon
3. Fight enemies and minibosses
4. Collect XP, scrolls, tools, and materials
5. Spend stat points and unlock skills
6. Return to hub and push the next region

## Archetypes

- Close Combat Sorcerer: melee burst and stagger
- Mid-Range Sorcerer: hybrid melee and projectile spacing
- Long-Range Sorcerer: control-heavy projectile build
- Heavenly Restriction: high body stats, lower CE growth, weapon affinity

## Combat Model

- Real-time top-down PvE
- Basic attack
- Dodge
- 3 active skills
- 2 passives
- 1 late-game ultimate

Base stats:

- HP
- CE or MP
- Attack
- Defense
- Speed
- Technique
- Perception
- Crit
- Poise

## Enemy Model

- Grade 4 to 3: FSM
- Grade 2: FSM plus utility scoring
- Grade 1: utility AI with better combo and reaction logic
- Special Grade: scripted boss phases plus utility behaviors

## Out of Scope for v1

- Multiplayer
- Open-world scale content
- LLM-driven combat AI
- Full story ingestion pipeline
- AI-generated skins every 10 levels
- Live-service features

## Success Criteria

- First fun playable loop within 10 minutes
- Distinct class feel by level 5
- Fair deaths with readable combat feedback
- One full run lands in the 4 to 6 hour range
