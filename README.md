# Apex Clash

A browser-first Jujutsu Kaisen-inspired action RPG built with React, Phaser, Express, and MongoDB.

![1775836336323](image/README/1775836336323.png)

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (optional - falls back to in-memory storage)

### Local Development

```bash
# Install dependencies
npm install

# Start the API server
npm run dev:server

# Start the web client (in another terminal)
npm run dev:web
```

Open your browser to:

- **Web:** http://localhost:5173
- **API:** http://localhost:4000

**Dev Admin Credentials:** `admin` / `admin` (requires `ADMIN_USERNAME` and `ADMIN_PASSWORD` environment variables to be set)

### Docker

```bash
# Start all services (web, API, MongoDB)
docker compose up --build

# Stop all services
docker compose down
```

Docker services:

- **Web:** http://localhost:8080
- **API:** http://localhost:4000
- **MongoDB:** `mongodb://mongo:27017/apex-clash` (internal to Docker)

## How To Play

### The Game Loop

1. **Login** or continue as guest
2. **Pick a sorcerer class:**
   - Striker Sorcerer - Melee pressure, Black Flash synergy
   - Technique Fighter - Hybrid spacing, seals, barriers
   - Projection Sorcerer - Ranged cursed techniques
   - Heavenly Restriction - Cursed tool mastery, physical stats
3. **Enter Tokyo Jujutsu High** (the hub)
4. **Select a cursed region** to investigate:
   - Detention Center (Grade 3-4 curses)
   - Barrier Shrine (Grade 2-3 curses)
   - Shibuya Burn Sector (Grade 2-3 curses)
   - Collapsed Cathedral Barrier (Grade 1-2 curses)
   - Merger Ossuary (Grade 1-Special Grade curses)
5. **Explore and claim a boon** (temporary exploration buff)
6. **Enter the dungeon** (curse hunting ground)
7. **Claim the relic** (barrier fragment)
8. **Defeat the sentinel** (Grade 2/3 miniboss)
9. **Enter the domain** (boss vault)
10. **Defeat the boss** (Grade 1/Special Grade curse)
11. **Earn rewards** (scrolls, cursed tools, materials)
12. **Quick bind/equip** upgrades
13. **Extract** to hub or **continue** to next route

### Controls

- **WASD** - Movement
- **Space** - Dodge/Dash
- **Q / E** - Use technique skills
- **R** - Domain Surge (when unlocked)
- **Click** - Attack
- **Number keys** - Use consumables

## Project Structure

```
apex-clash/
├── web/                 # React shell + Phaser runtime
│   ├── src/
│   │   ├── components/  # UI panels and HUD
│   │   ├── game/        # Phaser scenes and config
│   │   └── api/         # API clients
├── server/              # Express API + persistence
│   └── src/
│       ├── controllers/ # Request handlers
│       ├── services/    # Business logic
│       ├── models/      # Mongoose schemas
│       └── routes/      # API routes
├── shared/content/      # JSON-driven game content
│   ├── classes.json     # Sorcerer classes
│   ├── enemies.json     # Curse types
│   ├── items.json       # Equipment, consumables
│   ├── regions.json     # Area definitions
│   ├── skills.json      # Cursed techniques
│   └── ...              # More content files
├── docs/                # Documentation
├── scripts/             # Validation and test scripts
└── docker-compose.yml  # Local dev stack
```

## Documentation

- **[Project Status](./docs/tasklists/PROJECT_STATUS.md)** - Current development status and what's complete
- **[API Docs](./docs/API.md)** - Backend API contracts
- **[Common Issues](./docs/COMMON_ISSUES.md)** - Setup and troubleshooting
- **[Roadmap](./docs/ROADMAP.md)** - Version goals and phase structure

## Quality Gates

```bash
# Validate content JSON files
npm run validate:content

# Run tests
npm run test -w server

# Run linter
npm run lint

# Build for production
npm run build
```

## Game Theme

**Jujutsu Kaisen-inspired Action RPG**

- **Sorcerer Grades:** Grade 4 (entry) → Grade 3 → Grade 2 → Grade 1 → Special Grade Candidate → Special Grade
- **Cursed Energy (CE):** Split into CE Output (burst damage) and CE Reserve (sustained combat)
- **Black Flash:** Timing-based damage amplifier (500ms window after CE use)
- **Domain Expansion:** Ultimate techniques for Grade 1+ sorcerers
- **Cursed Tools:** Weapons with unique identity passives

## Classes

| Class                          | Description                | Playstyle                                       |
| ------------------------------ | -------------------------- | ----------------------------------------------- |
| **Striker Sorcerer**     | Melee combat specialist    | Black Flash synergy, gap-close, combo finishers |
| **Technique Fighter**    | Hybrid spacing and control | Seals, barriers, zone control tools             |
| **Projection Sorcerer**  | Ranged technique user      | Area denial, burst damage, domain expansion     |
| **Heavenly Restriction** | Cursed tool master         | Physical stats, low CE, weapon specialist       |

## Progression Systems

### Dual Progression

- **Player Level:** Gained from all sources (kills, bosses, exploration)
- **Sorcerer Grade:** Earned by performance against stronger enemies

### Grade Promotion

Each grade has specific requirements:

- Level threshold
- Kill counts for specific grades
- Boss completions
- Trial clears
- Special grade defeats

### Technique Mastery

Your chosen technique has its own rank:

- Novice → Refined → Advanced → Grade 1 Caliber → Special Grade Caliber

Mastery increases through:

- Using techniques in combat
- Defeating bosses
- Landing Black Flash chains
- Domain clashes

## Endgame

### Anomaly Sectors

High-level dungeons with special modifiers:

- **Void Fracture** - CE drain, amplified damage, special grade invasions
- **Domain Remnant** - Domain instability, technique cost increase
- **Cursed Tool Graveyard** - Weapon drops, curse buildup

### First-Grade Trials

Challenge encounters that test your mastery:

- Combat Mastery, Black Flash, Domain Counter, Endurance
- Burnout Mastery, Technique Mastery
- Ascension Prep (pre-requisite for S-Class)

### S-Class Ascension

The final trial to become a Special Grade Sorcerer:

- 4-stage boss encounter
- Requires all first-grade trials complete
- Requires defeating 2 special grades
- Requires Special Grade Caliber technique mastery
