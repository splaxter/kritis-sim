# KRITIS Admin Simulator - Game Design Document

**Date:** 2026-03-14
**Status:** Approved
**Version:** 1.0

---

## Overview

"Papers, Please" meets "Reigns" meets German kommunale IT - with real educational value.

A narrative decision game where you're a sysadmin in Probezeit at a KRITIS waste management AöR. Every choice affects relationships, compliance, budget, stress, and your career. Real IT troubleshooting skills help you succeed.

### Key Decisions

| Aspect | Decision |
|--------|----------|
| **Architecture** | Monorepo (client + server + shared), hybrid for future ulTimote integration |
| **Frontend** | Vite + React + TypeScript |
| **Backend** | Express + better-sqlite3 |
| **Terminal** | xterm.js (local echo mode) |
| **UI** | Retro terminal aesthetic (green on black) |
| **Language** | German only |
| **Scope** | Act 1 (Probezeit, 12 weeks, ~30 events) |
| **Progression** | Roguelike meta (skills, commands persist across runs) |
| **Education** | Real troubleshooting skills, teachable moments |
| **Deploy** | Coolify via Docker Compose at kritis-sim.timoklinge.com |

---

## 1. Core Architecture

```
kritis_game/
├── client/                    # Vite + React + TypeScript
│   ├── src/
│   │   ├── components/
│   │   │   ├── Terminal/      # xterm.js wrapper
│   │   │   ├── GameScreen/    # Main game UI
│   │   │   ├── StatsBar/      # Skills, relationships, week counter
│   │   │   └── EventCard/     # Event display with choices
│   │   ├── engine/
│   │   │   ├── gameState.ts   # State machine
│   │   │   ├── skillSystem.ts # 6 skill domains
│   │   │   ├── eventEngine.ts # Event selection, prerequisites
│   │   │   └── terminal.ts    # Command parser + context
│   │   ├── content/
│   │   │   ├── events/        # 30 Act 1 events
│   │   │   ├── characters/    # NPCs with traits
│   │   │   └── commands/      # Terminal command definitions
│   │   └── hooks/
│   │       └── useGame.ts     # React hook for game state
│   └── index.html
├── server/                    # Express + better-sqlite3
│   ├── src/
│   │   ├── index.ts           # Express app
│   │   ├── routes/
│   │   │   ├── saves.ts       # CRUD for save games
│   │   │   └── meta.ts        # Achievements, unlocks
│   │   └── db/
│   │       ├── schema.sql
│   │       └── database.ts
│   └── data/
│       └── kritis.db          # SQLite file
├── shared/                    # Shared TypeScript types
│   └── types/
│       ├── events.ts
│       ├── skills.ts
│       ├── saves.ts
│       └── terminal.ts
├── package.json               # Workspace root
├── docker-compose.yml
└── Dockerfile
```

---

## 2. Game State & Skills

### Skills (The Teachable Part)

```typescript
interface Skills {
  netzwerk: number;       // 0-100: DNS, Firewall, VLANs, Routing
  linux: number;          // 0-100: CLI, systemd, logs, permissions
  windows: number;        // 0-100: AD, GPO, PowerShell, Event Viewer
  security: number;       // 0-100: Patching, Phishing, BSI, NIS2
  troubleshooting: number; // 0-100: Systematic debugging approach
  softSkills: number;     // 0-100: Communication, documentation, politics
}
```

### Full Game State

```typescript
interface GameState {
  // Progress
  currentWeek: number;        // 1-12 for Act 1
  currentDay: number;         // 1-5 (Montag-Freitag)

  // Skills
  skills: Skills;

  // Relationships
  relationships: {
    chef: number;             // -100 to +100
    gf: number;               // Geschäftsführer
    kaemmerer: number;        // Controls budget
    fachabteilung: number;    // Users/Athos
    kollegen: number;         // IT team
  };

  // Resources
  stress: number;             // 0-100, 100 = burnout
  budget: number;             // Remaining IT budget in €
  compliance: number;         // 0-100, BSI/NIS2 score

  // Narrative
  activeEvents: string[];
  completedEvents: string[];
  flags: Record<string, boolean>;

  // Terminal state
  unlockedCommands: string[];
  terminalHistory: string[];
}
```

### Skill Checks

Events can require minimum skill levels:

```typescript
interface SkillCheck {
  skill: keyof Skills;
  threshold: number;
  bonus?: number;
}

// Example: Option only visible if linux >= 30
{
  text: "journalctl -u apache2 --since '1 hour ago'",
  requires: { skill: 'linux', threshold: 30 },
  effects: { troubleshooting: +10, stress: -5 },
  terminalCommand: true,
}
```

---

## 3. Event System

```typescript
interface GameEvent {
  id: string;

  // Scheduling
  weekRange: [number, number];
  dayPreference?: number[];
  probability: number;

  // Prerequisites
  requires?: {
    events?: string[];
    flags?: string[];
    skills?: Partial<Skills>;
    relationships?: Partial<Relationships>;
  };

  // Content
  category: EventCategory;
  title: string;
  description: string;
  involvedCharacters: string[];
  choices: EventChoice[];

  // Terminal integration
  terminalContext?: TerminalContext;

  tags: string[];
}

type EventCategory =
  | 'support'      // Printer, password resets
  | 'security'     // Patches, phishing, alerts
  | 'compliance'   // NIS2, BSI, audits
  | 'politics'     // Credit, blame, meetings
  | 'budget'       // Purchasing decisions
  | 'crisis'       // Server down, ransomware
  | 'team'         // Colleague issues
  | 'personal'     // Stress, overtime
  | 'absurd';      // Fun weird stuff
```

### Event Choices

```typescript
interface EventChoice {
  id: string;
  text: string;

  requires?: SkillCheck;
  hidden?: boolean;

  effects: {
    skills?: Partial<Skills>;
    relationships?: Partial<Relationships>;
    stress?: number;
    budget?: number;
    compliance?: number;
  };

  resultText: string;
  teachingMoment?: string;      // Educational explanation

  terminalCommand?: boolean;
  terminalSolution?: string;

  triggersEvent?: string;
  setsFlags?: string[];
  unlocks?: string[];
}
```

---

## 4. Characters & Relationships

```typescript
interface Character {
  id: string;
  role: CharacterRole;
  namePool: string[];
  traits: CharacterTrait[];

  dialogue: {
    hostile: string[];    // relationship < -50
    cold: string[];       // -50 to -10
    neutral: string[];    // -10 to +30
    friendly: string[];   // +30 to +70
    trusting: string[];   // > +70
  };

  asciiAvatar?: string;
  color: string;
}

type CharacterRole =
  | 'chef'
  | 'gf'
  | 'kaemmerer'
  | 'athos'
  | 'kollege'
  | 'azubi'
  | 'extern';
```

### Character Traits

Traits are randomly assigned per playthrough, affecting dialogue and events:

- **Chef Traits**: credit_thief, micromanager, absent, supportive, chaotic
- **Kämmerer Traits**: sparsam, IT-feindlich, pragmatisch
- **Kollege Traits**: hilfsbereit, überfordert, alteingesessen

---

## 5. Terminal Integration

Using **xterm.js** in local echo mode for professional terminal feel and future expandability.

### Terminal Context

```typescript
interface TerminalContext {
  type: 'linux' | 'windows';
  hostname: string;
  username: string;
  currentPath: string;
  commands: TerminalCommand[];
  solutions: TerminalSolution[];
  hints: string[];
  hintsUsed: number;
}

interface TerminalCommand {
  pattern: string | RegExp;
  output: string | ((args: string[], context: TerminalContext) => string);
  teachesCommand?: string;
  skillGain?: Partial<Skills>;
  isPartialSolution?: boolean;
  wrongApproachFeedback?: string;
}
```

### Example: Apache Down Scenario

```typescript
const apacheDownContext: TerminalContext = {
  type: 'linux',
  hostname: 'awrm-web01',
  username: 'admin',
  currentPath: '~',

  commands: [
    {
      pattern: 'systemctl status apache2',
      output: `● apache2.service - The Apache HTTP Server
   Active: failed (Result: exit-code)`,
      teachesCommand: 'systemctl status',
      skillGain: { linux: 2 },
    },
    {
      pattern: /^journalctl.*apache2/,
      output: `Permission denied: /var/log/apache2/error.log`,
      teachesCommand: 'journalctl',
      skillGain: { linux: 3, troubleshooting: 2 },
    },
    {
      pattern: /^sudo\s+chmod\s+755\s+\/var\/log\/apache2/,
      output: '→ SOLUTION',
      skillGain: { linux: 5, troubleshooting: 5 },
    },
    {
      pattern: /reboot/,
      isPartialSolution: true,
      wrongApproachFeedback: 'Das Problem kommt wieder.',
    },
  ],

  hints: [
    'Was sagt der Service-Status?',
    'journalctl zeigt mehr Details.',
    '"Permission denied" → Berechtigungen prüfen!',
  ],
};
```

### Dual Environment Support

- **Linux**: bash prompt, systemctl, journalctl, chmod, chown, grep, etc.
- **Windows**: PowerShell prompt, Get-Service, Get-EventLog, gpupdate, etc.

---

## 6. Meta-Progression (Roguelike)

```typescript
interface MetaProgression {
  playerId: string;

  // Stats
  totalRuns: number;
  completedRuns: number;
  bestWeekReached: number;

  // Persistent learning
  achievements: string[];
  learnedCommands: string[];
  learnedConcepts: string[];

  // Unlocks
  unlocks: {
    characters: string[];
    events: string[];
    dialogueOptions: string[];
    startingBonuses: string[];
  };

  careerLevel: CareerLevel;
  totalXp: number;
}

type CareerLevel =
  | 'praktikant'    // Heavy hints
  | 'azubi'         // Some hints
  | 'junior'        // Fewer hints
  | 'admin'         // Full difficulty
  | 'senior'        // Bonus hard events
  | 'it_leiter';    // You've become the chef
```

### Achievements

| Achievement | Description | Reward |
|-------------|-------------|--------|
| Probezeit überstanden | Week 12 reached | +5 Soft Skills start |
| Druckerflüsterer | 5 printer events, no stress | Printer shortcut dialogue |
| Log-Meister | journalctl used 10x | +10 Linux, +5 Troubleshooting |
| Reboot ist keine Lösung | Act 1 without "reboot" | +15 Troubleshooting |
| BSI würde weinen | 100% compliance | Secret event unlock |

### Learning Carries Over

- First run: Command hidden or shows "[Skill zu niedrig]"
- After discovery: Shows with hint tooltip
- After 3+ successful uses: Shows normally, in quick reference

---

## 7. Database Schema

```sql
-- Players (persistent)
CREATE TABLE players (
  id TEXT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  total_runs INTEGER DEFAULT 0,
  completed_runs INTEGER DEFAULT 0,
  career_level TEXT DEFAULT 'praktikant',
  total_xp INTEGER DEFAULT 0
);

-- Learned commands
CREATE TABLE learned_commands (
  player_id TEXT REFERENCES players(id),
  command TEXT,
  times_used INTEGER DEFAULT 0,
  times_successful INTEGER DEFAULT 0,
  PRIMARY KEY (player_id, command)
);

-- Achievements
CREATE TABLE player_achievements (
  player_id TEXT REFERENCES players(id),
  achievement_id TEXT,
  unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (player_id, achievement_id)
);

-- Save games
CREATE TABLE saves (
  id TEXT PRIMARY KEY,
  player_id TEXT REFERENCES players(id),
  slot INTEGER DEFAULT 1,
  game_state JSON,
  current_week INTEGER,
  stress INTEGER,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(player_id, slot)
);

-- Run history
CREATE TABLE run_history (
  id TEXT PRIMARY KEY,
  player_id TEXT REFERENCES players(id),
  outcome TEXT,
  week_reached INTEGER,
  final_skills JSON,
  seed TEXT,
  ended_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### API Endpoints

```
POST   /api/saves              # Create save
GET    /api/saves/:playerId    # List saves
PUT    /api/saves/:id          # Update save
DELETE /api/saves/:id          # Delete save

GET    /api/players/:id        # Get meta-progression
POST   /api/players            # Create player
POST   /api/players/:id/learn  # Record learned command
GET    /api/players/:id/achievements
POST   /api/players/:id/achievements
```

---

## 8. UI Design

### Terminal Aesthetic

- **Background**: #0a0a0a (deep black)
- **Primary text**: #00ff00 (classic green)
- **Secondary**: #00aa00 (dimmed green)
- **Warning**: #ffaa00 (orange)
- **Danger**: #ff4444 (red)
- **Success**: #44ff44 (bright green)
- **Font**: JetBrains Mono / Fira Code

### Main Game Screen Layout

```
┌─────────────────────────────────────────────────────────┐
│ KRITIS ADMIN SIMULATOR              Woche 3 | Mittwoch │
├─────────────────────────────────────────────────────────┤
│  ┌─ SKILLS ───────────┐  ┌─ BEZIEHUNGEN ────────────┐  │
│  │ Netzwerk     ██░░ │  │ Chef        ██████░░ +42 │  │
│  │ Linux       ████░ │  │ GF          ████░░░░ +15 │  │
│  │ ...               │  │ ...                      │  │
│  └───────────────────┘  └──────────────────────────┘  │
│                                                         │
│  Stress: ████████░░░░ 42   Budget: €12.450   Compl: 67%│
├─────────────────────────────────────────────────────────┤
│  > EREIGNIS: Apache antwortet nicht                    │
│                                                         │
│  [Narrative text...]                                   │
│                                                         │
│  [1] Server neustarten                                 │
│  [2] Monitoring checken                                │
│  [3] > Terminal öffnen                    [EMPFOHLEN]  │
│  [4] Ticket eskalieren                                 │
├─────────────────────────────────────────────────────────┤
│  [1-4] Auswählen   [H] Hilfe   [S] Speichern          │
└─────────────────────────────────────────────────────────┘
```

### Responsive

- Desktop: Full layout
- Tablet: Collapsed stats
- Mobile: Stats in menu, fullscreen terminal

---

## 9. Deployment

### Docker Compose

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_PATH=/data/kritis.db
    volumes:
      - kritis-data:/data
volumes:
  kritis-data:
```

### Coolify

- **Domain**: kritis-sim.timoklinge.com
- **Auto-deploy**: On push to main
- **Persistent volume**: /data for SQLite

---

## 10. Act 1 Event Categories

Target: ~30 events across 12 weeks

| Category | Count | Examples |
|----------|-------|----------|
| Support | 6 | Drucker-Apokalypse, Passwort-Reset-Welle, "Internet geht nicht" |
| Security | 5 | Phishing-Mail, Sophos-Alert, Patch-Dienstag, USB-Stick gefunden |
| Compliance | 4 | NIS2-Deadline, BSI-Audit-Ankündigung, Dokumentationspflicht |
| Politics | 5 | Chef nimmt Credit, Meeting-Marathon, Kämmerer will sparen |
| Crisis | 4 | Server down, Ransomware-Verdacht, Backup-Test, Stromausfall |
| Team | 3 | Kollege macht Fehler, Azubi-Betreuung, Urlaubsvertretung |
| Personal | 2 | Überstunden-Anfrage, Burnout-Warnsignale |
| Absurd | 1 | Server-Raum-Taube, CEO-Neffe braucht "IT-Hilfe" |

---

## Future Considerations

### Act 2+ (Post-MVP)
- Side business subplot (InfraMap development)
- Robert partnership, Henry co-founder
- More complex terminal scenarios
- Real container connections (ulTimote integration)

### ulTimote Integration
- Multiplayer "party voting" mode
- Shared decision-making
- Competitive scoring
- Reuse WebSocket infrastructure

---

**Document Status**: Approved for implementation
