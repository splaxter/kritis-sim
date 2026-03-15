# KRITIS Admin Simulator

A text-based IT administration simulation game where you play as a sysadmin at a German municipal waste management company. Survive your 12-week probation period while dealing with broken printers, clueless bosses, and... a mysterious cyber threat?

## Game Modes

| Mode | Description |
|------|-------------|
| **Einsteiger** | For beginners - helpful hints and forgiving values |
| **Standard** | Classic experience - balanced challenge |
| **Schwer** | For pros - stricter consequences |
| **KRITIS** | Realistic simulation - 24 weeks with NIS2 audits |
| **Arcade** | Fast fun - 8 weeks, 30-second timer, combo scoring |
| **Story: Die Probezeit** | Linear narrative with sidequests and multiple endings |

## Adventure Mode: "Die Probezeit"

A 12-chapter IT thriller in 3 acts. *The Office* meets *Mr. Robot*.

**Premise:** You're the new sysadmin. Your predecessor left mysteriously. Between fixing printers and a boss who doesn't understand "this internet thing," your probation becomes an adventure uncovering a coordinated KRITIS cyberattack.

### Features
- **12 chapters** across 3 acts with branching story beats
- **15+ sidequests** that unlock dialogue options and change NPC behavior
- **Character memory** - NPCs remember your choices
- **3 endings** based on relationships, completed sidequests, and key decisions

### Endings
| Ending | How to Achieve |
|--------|----------------|
| **Der Held** (Good) | High relationships, sidequests completed, proper preparation |
| **Gerade so** (Neutral) | Middle path - some mistakes but core problem solved |
| **Pech gehabt** (Bad) | Poor relationships, no preparation, trust lost |

## Tech Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** Express + TypeScript + SQLite (sql.js)
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
├── server/                 # Express backend
│   └── src/
│       ├── db/             # SQLite database
│       └── routes/         # API routes
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

### Win/Lose Conditions
- **Win:** Survive the probation period
- **Lose:** Burnout (stress 100%), Fired (chef relationship -100), BSI fines (compliance 0%)

## Content Packs

The game supports extensible content packs for scenarios:

- **KRITIS Infrastructure** - Critical infrastructure scenarios
- **AMSE IT** - Vendor management scenarios
- *More coming soon...*

## Contributing

Contributions welcome! Please read the existing code style and add tests for new features.

## License

MIT

---

*Developed with Claude Code*
