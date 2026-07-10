# KRITIS Admin Simulator

[![CI](https://github.com/splaxter/kritis-sim/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/splaxter/kritis-sim/actions/workflows/ci.yml)

A text-based IT administration simulation game where you play as a sysadmin at a German municipal waste management company. Survive your 12-week probation period while dealing with broken printers, clueless bosses, and... a mysterious cyber threat?

## Game Modes

The main menu has three primary entries — **Neues Spiel**, **Lernbereich** and **Spielstände** (plus a contextual **Weiterspielen** when a save exists). Starting a new game first asks you to pick an experience:

| Experience | Description |
|------------|-------------|
| **Freie Simulation** | Hands-on: dynamic IT weeks with Terminal & GUI scenarios and event chains, free choice of challenge — sub-levels **Einsteiger** (beginner hints, forgiving values), **Standard** (balanced baseline, 1.0x effects) and **KRITIS** (realistic, 24 weeks with NIS2 audits) |
| **Story: Die Probezeit** (Casual) | Narrative campaign — mostly text & choices, with sidequests and multiple endings |

The **Lernbereich** (learning mode) is its own primary menu entry: security training with 31 lessons across 8 tracks — Linux terminal (16 CLI lessons), Windows GUI apps (Task Manager, Event Viewer, UAC, Explorer, Settings) and the 5-level "Blackout" incident.

Additionally, a `Schwer` (hard) mode still exists in code as a hidden configuration. An unused Arcade mode (timer + combo scoring) was removed in 2026-07; recover it from git history if ever needed.

## Adventure Mode: "Die Probezeit"

A 12-chapter IT thriller in 3 acts. *The Office* meets *Mr. Robot*.

**Premise:** You're the new sysadmin. Your predecessor left mysteriously. Between fixing printers and a boss who doesn't understand "this internet thing," your probation becomes an adventure uncovering a coordinated KRITIS cyberattack.

### Features
- **12 chapters** across 3 acts with branching story beats
- **Optional sidequests** that unlock hidden dialogue options
- **Character memory** - NPCs remember your choices
- **3 endings** based on relationships, completed sidequests, and key decisions
- **Cinematic presentation** - fullscreen noir artwork per scene, a typewriter text effect, chapter title cards, and optional procedural sound (toggle with `[M]`, off by default)

### Endings
| Ending | How to Achieve |
|--------|----------------|
| **Der Held** (Good) | High relationships, sidequests completed, proper preparation |
| **Gerade so** (Neutral) | Middle path - some mistakes but core problem solved |
| **Pech gehabt** (Bad) | Poor relationships, no preparation, trust lost |

## Tech Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Server:** Minimal Express static server (health check + SPA serving; game state lives in browser localStorage)
- **Shared:** TypeScript types and game configuration
- **Testing:** Vitest + Playwright (E2E)

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── content/        # Game content
│   │   │   ├── adventure/  # Story mode chapters, sidequests, events
│   │   │   ├── events/     # Random events by week
│   │   │   └── packs/      # Content packs (scenarios)
│   │   ├── engine/         # Game logic
│   │   └── hooks/          # React hooks
├── server/                 # Minimal static file server (health check + SPA)
├── shared/                 # Shared types and config
│   └── src/
│       ├── config/         # Game mode configurations
│       └── types/          # TypeScript interfaces
└── e2e/                    # End-to-end tests
```

## Game Mechanics

### Skills
- **Netzwerk** - Network administration
- **Linux** - Linux systems
- **Windows** - Windows systems
- **Security** - IT security
- **Troubleshooting** - Problem solving
- **Soft Skills** - Communication and teamwork

### Relationships
- **Chef** - Your boss (critical for survival)
- **Kollegen** - Your IT colleagues
- **Kämmerer** - Budget controller
- **Fachabteilung** - Other departments
- **GF** - Executive management (Geschäftsführung)

### Win/Lose Conditions
- **Win:** Survive the probation period
- **Lose:** Burnout (stress 100%), Fired (chef relationship -100), BSI fines (compliance 0%)

Every run ends on a summary "Bilanz" (weeks survived, skill/relationship changes,
what you focused on). The story ending also teases what you *didn't* see, and a
per-browser tally tracks runs played and distinct endings reached.

For a verified content breakdown (events, chains, chapters, lessons, packs), see
[`docs/CONTENT_INVENTORY.md`](docs/CONTENT_INVENTORY.md).

## Content Packs

The game supports extensible content packs for scenarios:

- **KRITIS Infrastructure** - Critical infrastructure scenarios
- **AMSE IT** - Vendor management scenarios
- **Cloud365** - Microsoft 365 and Azure scenarios
- **Telekom Business** - WAN provider and SLA scenarios
- **Internal Organization** - office politics, budget, team, and compliance scenarios

## Contributing

Contributions welcome! Please read the existing code style and add tests for new features.

## License

MIT

---

*Developed with Claude Code*
