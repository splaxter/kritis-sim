# KRITIS Admin Simulator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a narrative sysadmin game with terminal-based UI, real IT troubleshooting education, and roguelike meta-progression.

**Architecture:** Monorepo with Vite+React+TypeScript client, Express+SQLite server, and shared types. xterm.js for terminal emulation. Game state managed in React, persisted via REST API.

**Tech Stack:** Vite, React 18, TypeScript, xterm.js, Express, better-sqlite3, TailwindCSS, npm workspaces, Docker

---

## Phase 1: Project Setup

### Task 1: Initialize Monorepo Structure

**Files:**
- Create: `package.json`
- Create: `client/package.json`
- Create: `server/package.json`
- Create: `shared/package.json`
- Create: `tsconfig.base.json`
- Create: `.gitignore`

**Step 1: Create root package.json with workspaces**

```json
{
  "name": "kritis-game",
  "private": true,
  "workspaces": [
    "client",
    "server",
    "shared"
  ],
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:client": "npm run dev -w client",
    "dev:server": "npm run dev -w server",
    "build": "npm run build -w shared && npm run build -w client && npm run build -w server",
    "start": "npm run start -w server"
  },
  "devDependencies": {
    "concurrently": "^8.2.2",
    "typescript": "^5.4.0"
  }
}
```

**Step 2: Create base TypeScript config**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true
  }
}
```

**Step 3: Create .gitignore**

```
node_modules/
dist/
*.db
.env
.env.local
.DS_Store
```

**Step 4: Create shared package.json**

```json
{
  "name": "@kritis/shared",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  }
}
```

**Step 5: Commit**

```bash
git add package.json tsconfig.base.json .gitignore shared/package.json
git commit -m "chore: initialize monorepo structure with npm workspaces"
```

---

### Task 2: Setup Shared Types Package

**Files:**
- Create: `shared/tsconfig.json`
- Create: `shared/src/index.ts`
- Create: `shared/src/types/skills.ts`
- Create: `shared/src/types/gameState.ts`
- Create: `shared/src/types/events.ts`
- Create: `shared/src/types/characters.ts`
- Create: `shared/src/types/terminal.ts`
- Create: `shared/src/types/meta.ts`

**Step 1: Create shared tsconfig.json**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

**Step 2: Create skills types**

```typescript
// shared/src/types/skills.ts
export interface Skills {
  netzwerk: number;
  linux: number;
  windows: number;
  security: number;
  troubleshooting: number;
  softSkills: number;
}

export interface SkillCheck {
  skill: keyof Skills;
  threshold: number;
  bonus?: number;
}

export const DEFAULT_SKILLS: Skills = {
  netzwerk: 20,
  linux: 20,
  windows: 20,
  security: 20,
  troubleshooting: 20,
  softSkills: 20,
};
```

**Step 3: Create gameState types**

```typescript
// shared/src/types/gameState.ts
import { Skills } from './skills';

export interface Relationships {
  chef: number;
  gf: number;
  kaemmerer: number;
  fachabteilung: number;
  kollegen: number;
}

export interface GameState {
  currentWeek: number;
  currentDay: number;
  skills: Skills;
  relationships: Relationships;
  stress: number;
  budget: number;
  compliance: number;
  activeEvents: string[];
  completedEvents: string[];
  flags: Record<string, boolean>;
  unlockedCommands: string[];
  terminalHistory: string[];
  seed: string;
  runNumber: number;
}

export const DEFAULT_RELATIONSHIPS: Relationships = {
  chef: 0,
  gf: 0,
  kaemmerer: -10,
  fachabteilung: 0,
  kollegen: 10,
};

export const DEFAULT_GAME_STATE: Omit<GameState, 'seed' | 'runNumber'> = {
  currentWeek: 1,
  currentDay: 1,
  skills: {
    netzwerk: 20,
    linux: 20,
    windows: 20,
    security: 20,
    troubleshooting: 20,
    softSkills: 20,
  },
  relationships: DEFAULT_RELATIONSHIPS,
  stress: 20,
  budget: 15000,
  compliance: 50,
  activeEvents: [],
  completedEvents: [],
  flags: {},
  unlockedCommands: ['help', 'ls', 'cd', 'pwd'],
  terminalHistory: [],
};
```

**Step 4: Create events types**

```typescript
// shared/src/types/events.ts
import { Skills } from './skills';
import { Relationships } from './gameState';
import { SkillCheck } from './skills';
import { TerminalContext } from './terminal';

export type EventCategory =
  | 'support'
  | 'security'
  | 'compliance'
  | 'politics'
  | 'budget'
  | 'crisis'
  | 'team'
  | 'personal'
  | 'absurd';

export interface EventEffects {
  skills?: Partial<Skills>;
  relationships?: Partial<Relationships>;
  stress?: number;
  budget?: number;
  compliance?: number;
}

export interface EventChoice {
  id: string;
  text: string;
  requires?: SkillCheck;
  hidden?: boolean;
  effects: EventEffects;
  resultText: string;
  teachingMoment?: string;
  terminalCommand?: boolean;
  terminalSolution?: string;
  triggersEvent?: string;
  setsFlags?: string[];
  unlocks?: string[];
}

export interface GameEvent {
  id: string;
  weekRange: [number, number];
  dayPreference?: number[];
  probability: number;
  requires?: {
    events?: string[];
    flags?: string[];
    skills?: Partial<Skills>;
    relationships?: Partial<Relationships>;
  };
  category: EventCategory;
  title: string;
  description: string;
  involvedCharacters: string[];
  choices: EventChoice[];
  terminalContext?: TerminalContext;
  tags: string[];
}
```

**Step 5: Create characters types**

```typescript
// shared/src/types/characters.ts
export type CharacterRole =
  | 'chef'
  | 'gf'
  | 'kaemmerer'
  | 'athos'
  | 'kollege'
  | 'azubi'
  | 'extern';

export interface CharacterTrait {
  id: string;
  name: string;
  probability: number;
  modifiers: {
    eventVariations?: Record<string, string>;
    relationshipDecay?: number;
    skillCheckBonus?: Partial<Record<string, number>>;
  };
}

export interface Character {
  id: string;
  role: CharacterRole;
  namePool: string[];
  traits: CharacterTrait[];
  dialogue: {
    hostile: string[];
    cold: string[];
    neutral: string[];
    friendly: string[];
    trusting: string[];
  };
  asciiAvatar?: string;
  color: string;
}

export interface ActiveCharacter {
  id: string;
  role: CharacterRole;
  name: string;
  activeTraits: string[];
  color: string;
}
```

**Step 6: Create terminal types**

```typescript
// shared/src/types/terminal.ts
import { Skills } from './skills';
import { EventEffects } from './events';

export type TerminalType = 'linux' | 'windows';

export interface TerminalCommand {
  pattern: string;
  patternRegex?: string;
  output: string;
  teachesCommand?: string;
  skillGain?: Partial<Skills>;
  isPartialSolution?: boolean;
  wrongApproachFeedback?: string;
  isSolution?: boolean;
}

export interface TerminalSolution {
  commands: string[];
  allRequired: boolean;
  resultText: string;
  skillGain: Partial<Skills>;
  effects: EventEffects;
}

export interface TerminalContext {
  type: TerminalType;
  hostname: string;
  username: string;
  currentPath: string;
  commands: TerminalCommand[];
  solutions: TerminalSolution[];
  hints: string[];
}
```

**Step 7: Create meta-progression types**

```typescript
// shared/src/types/meta.ts
import { Skills } from './skills';

export type CareerLevel =
  | 'praktikant'
  | 'azubi'
  | 'junior'
  | 'admin'
  | 'senior'
  | 'it_leiter';

export interface LearnedCommand {
  command: string;
  timesUsed: number;
  timesSuccessful: number;
  firstLearnedRun: number;
  description?: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  hidden: boolean;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface PlayerMeta {
  id: string;
  totalRuns: number;
  completedRuns: number;
  bestWeekReached: number;
  careerLevel: CareerLevel;
  totalXp: number;
  achievements: string[];
  learnedCommands: LearnedCommand[];
}

export interface SaveGame {
  id: string;
  playerId: string;
  slot: number;
  gameState: string;
  currentWeek: number;
  stress: number;
  updatedAt: string;
}
```

**Step 8: Create index exports**

```typescript
// shared/src/index.ts
export * from './types/skills';
export * from './types/gameState';
export * from './types/events';
export * from './types/characters';
export * from './types/terminal';
export * from './types/meta';
```

**Step 9: Build shared package**

```bash
cd shared && npm run build && cd ..
```

**Step 10: Commit**

```bash
git add shared/
git commit -m "feat: add shared types for game state, events, terminal, meta"
```

---

### Task 3: Setup Client (Vite + React)

**Files:**
- Create: `client/package.json`
- Create: `client/tsconfig.json`
- Create: `client/vite.config.ts`
- Create: `client/index.html`
- Create: `client/src/main.tsx`
- Create: `client/src/App.tsx`
- Create: `client/src/index.css`
- Create: `client/tailwind.config.js`
- Create: `client/postcss.config.js`

**Step 1: Create client package.json**

```json
{
  "name": "@kritis/client",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@kritis/shared": "*",
    "@xterm/xterm": "^5.4.0",
    "@xterm/addon-fit": "^0.9.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.18",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "vite": "^5.1.0"
  }
}
```

**Step 2: Create client tsconfig.json**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "outDir": "./dist",
    "rootDir": "./src",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client"]
  },
  "include": ["src/**/*"],
  "references": [{ "path": "../shared" }]
}
```

**Step 3: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

**Step 4: Create tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: '#0a0a0a',
          'bg-secondary': '#1a1a1a',
          'bg-highlight': '#2a2a2a',
          green: '#00ff00',
          'green-dim': '#00aa00',
          'green-muted': '#006600',
          warning: '#ffaa00',
          danger: '#ff4444',
          success: '#44ff44',
          info: '#4488ff',
          border: '#333333',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
```

**Step 5: Create postcss.config.js**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

**Step 6: Create index.html**

```html
<!DOCTYPE html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>KRITIS Admin Simulator</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
  </head>
  <body class="bg-terminal-bg text-terminal-green font-mono">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 7: Create index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
}

/* Scrollbar styling for terminal aesthetic */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #1a1a1a;
}

::-webkit-scrollbar-thumb {
  background: #333333;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #444444;
}
```

**Step 8: Create main.tsx**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**Step 9: Create App.tsx placeholder**

```tsx
function App() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="border border-terminal-border p-8 text-center">
        <h1 className="text-2xl mb-4">KRITIS ADMIN SIMULATOR</h1>
        <p className="text-terminal-green-dim">v1.0 - Loading...</p>
      </div>
    </div>
  );
}

export default App;
```

**Step 10: Install dependencies and test**

```bash
npm install
npm run dev:client
```

Expected: Vite dev server starts at http://localhost:5173

**Step 11: Commit**

```bash
git add client/
git commit -m "feat: setup Vite + React + TypeScript + Tailwind client"
```

---

### Task 4: Setup Server (Express + SQLite)

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/src/index.ts`
- Create: `server/src/db/schema.sql`
- Create: `server/src/db/database.ts`

**Step 1: Create server package.json**

```json
{
  "name": "@kritis/server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@kritis/shared": "*",
    "better-sqlite3": "^9.4.3",
    "cors": "^2.8.5",
    "express": "^4.18.3",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.9",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/uuid": "^9.0.8",
    "tsx": "^4.7.1"
  }
}
```

**Step 2: Create server tsconfig.json**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "lib": ["ES2022"],
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "references": [{ "path": "../shared" }]
}
```

**Step 3: Create database schema**

```sql
-- server/src/db/schema.sql

-- Players (persistent meta-progression)
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  total_runs INTEGER DEFAULT 0,
  completed_runs INTEGER DEFAULT 0,
  best_week INTEGER DEFAULT 0,
  career_level TEXT DEFAULT 'praktikant',
  total_xp INTEGER DEFAULT 0
);

-- Learned commands (persist across runs)
CREATE TABLE IF NOT EXISTS learned_commands (
  player_id TEXT REFERENCES players(id),
  command TEXT,
  times_used INTEGER DEFAULT 0,
  times_successful INTEGER DEFAULT 0,
  first_learned_run INTEGER,
  description TEXT,
  PRIMARY KEY (player_id, command)
);

-- Player achievements
CREATE TABLE IF NOT EXISTS player_achievements (
  player_id TEXT REFERENCES players(id),
  achievement_id TEXT,
  unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  run_number INTEGER,
  PRIMARY KEY (player_id, achievement_id)
);

-- Save games
CREATE TABLE IF NOT EXISTS saves (
  id TEXT PRIMARY KEY,
  player_id TEXT REFERENCES players(id),
  slot INTEGER DEFAULT 1,
  game_state TEXT,
  current_week INTEGER,
  stress INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(player_id, slot)
);

-- Run history
CREATE TABLE IF NOT EXISTS run_history (
  id TEXT PRIMARY KEY,
  player_id TEXT REFERENCES players(id),
  run_number INTEGER,
  outcome TEXT,
  week_reached INTEGER,
  final_skills TEXT,
  final_relationships TEXT,
  commands_used TEXT,
  events_completed TEXT,
  seed TEXT,
  started_at DATETIME,
  ended_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Step 4: Create database.ts**

```typescript
// server/src/db/database.ts
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DB_PATH = process.env.DATABASE_PATH || join(__dirname, '../../data/kritis.db');

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

export function initializeDatabase(): void {
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  db.exec(schema);
  console.log('Database initialized');
}
```

**Step 5: Create Express server**

```typescript
// server/src/index.ts
import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase } from './db/database.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
initializeDatabase();

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '../../client/dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

**Step 6: Create data directory**

```bash
mkdir -p server/data
echo "*.db" > server/data/.gitignore
```

**Step 7: Install and test**

```bash
npm install
npm run dev:server
```

Expected: Server starts at http://localhost:3000

**Step 8: Test health endpoint**

```bash
curl http://localhost:3000/api/health
```

Expected: `{"status":"ok","timestamp":"..."}`

**Step 9: Commit**

```bash
git add server/
git commit -m "feat: setup Express server with SQLite database"
```

---

## Phase 2: Core Game Engine

### Task 5: Game State Hook

**Files:**
- Create: `client/src/hooks/useGame.ts`
- Create: `client/src/engine/gameState.ts`

**Step 1: Create game state engine**

```typescript
// client/src/engine/gameState.ts
import {
  GameState,
  DEFAULT_GAME_STATE,
  Skills,
  Relationships,
  EventEffects,
} from '@kritis/shared';

export function createInitialState(seed?: string): GameState {
  return {
    ...DEFAULT_GAME_STATE,
    seed: seed || generateSeed(),
    runNumber: 1,
  };
}

export function generateSeed(): string {
  return `KRITIS-${Date.now().toString(36).toUpperCase()}`;
}

export function applyEffects(state: GameState, effects: EventEffects): GameState {
  const newState = { ...state };

  if (effects.skills) {
    newState.skills = { ...state.skills };
    for (const [key, value] of Object.entries(effects.skills)) {
      if (value !== undefined) {
        newState.skills[key as keyof Skills] = Math.max(
          0,
          Math.min(100, state.skills[key as keyof Skills] + value)
        );
      }
    }
  }

  if (effects.relationships) {
    newState.relationships = { ...state.relationships };
    for (const [key, value] of Object.entries(effects.relationships)) {
      if (value !== undefined) {
        newState.relationships[key as keyof Relationships] = Math.max(
          -100,
          Math.min(100, state.relationships[key as keyof Relationships] + value)
        );
      }
    }
  }

  if (effects.stress !== undefined) {
    newState.stress = Math.max(0, Math.min(100, state.stress + effects.stress));
  }

  if (effects.budget !== undefined) {
    newState.budget = Math.max(0, state.budget + effects.budget);
  }

  if (effects.compliance !== undefined) {
    newState.compliance = Math.max(0, Math.min(100, state.compliance + effects.compliance));
  }

  return newState;
}

export function advanceDay(state: GameState): GameState {
  const newDay = state.currentDay + 1;
  if (newDay > 5) {
    return {
      ...state,
      currentDay: 1,
      currentWeek: state.currentWeek + 1,
    };
  }
  return { ...state, currentDay: newDay };
}

export function checkGameOver(state: GameState): { isOver: boolean; reason?: string } {
  if (state.stress >= 100) {
    return { isOver: true, reason: 'burnout' };
  }
  if (state.relationships.chef <= -100) {
    return { isOver: true, reason: 'fired' };
  }
  if (state.compliance <= 0) {
    return { isOver: true, reason: 'bsi_bussgeld' };
  }
  if (state.currentWeek > 12) {
    return { isOver: true, reason: 'probezeit_complete' };
  }
  return { isOver: false };
}
```

**Step 2: Create useGame hook**

```typescript
// client/src/hooks/useGame.ts
import { useState, useCallback } from 'react';
import { GameState, EventChoice, GameEvent } from '@kritis/shared';
import {
  createInitialState,
  applyEffects,
  advanceDay,
  checkGameOver,
} from '../engine/gameState';

export type GamePhase = 'menu' | 'playing' | 'terminal' | 'result' | 'gameover';

interface UseGameReturn {
  state: GameState;
  phase: GamePhase;
  currentEvent: GameEvent | null;
  lastChoice: EventChoice | null;
  gameOverReason: string | null;
  startNewGame: (seed?: string) => void;
  setEvent: (event: GameEvent) => void;
  makeChoice: (choice: EventChoice) => void;
  openTerminal: () => void;
  closeTerminal: (solved: boolean) => void;
  continueGame: () => void;
}

export function useGame(): UseGameReturn {
  const [state, setState] = useState<GameState>(() => createInitialState());
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [currentEvent, setCurrentEvent] = useState<GameEvent | null>(null);
  const [lastChoice, setLastChoice] = useState<EventChoice | null>(null);
  const [gameOverReason, setGameOverReason] = useState<string | null>(null);

  const startNewGame = useCallback((seed?: string) => {
    setState(createInitialState(seed));
    setPhase('playing');
    setCurrentEvent(null);
    setLastChoice(null);
    setGameOverReason(null);
  }, []);

  const setEvent = useCallback((event: GameEvent) => {
    setCurrentEvent(event);
    setPhase('playing');
  }, []);

  const makeChoice = useCallback((choice: EventChoice) => {
    setState((prev) => {
      const newState = applyEffects(prev, choice.effects);

      if (choice.setsFlags) {
        const flags = { ...newState.flags };
        for (const flag of choice.setsFlags) {
          flags[flag] = true;
        }
        newState.flags = flags;
      }

      if (currentEvent) {
        newState.completedEvents = [...prev.completedEvents, currentEvent.id];
      }

      return newState;
    });

    setLastChoice(choice);
    setPhase('result');
  }, [currentEvent]);

  const openTerminal = useCallback(() => {
    setPhase('terminal');
  }, []);

  const closeTerminal = useCallback((solved: boolean) => {
    if (solved && lastChoice) {
      setPhase('result');
    } else {
      setPhase('playing');
    }
  }, [lastChoice]);

  const continueGame = useCallback(() => {
    setState((prev) => {
      const newState = advanceDay(prev);
      const gameOver = checkGameOver(newState);
      if (gameOver.isOver) {
        setGameOverReason(gameOver.reason || null);
        setPhase('gameover');
      }
      return newState;
    });

    if (phase !== 'gameover') {
      setCurrentEvent(null);
      setLastChoice(null);
      setPhase('playing');
    }
  }, [phase]);

  return {
    state,
    phase,
    currentEvent,
    lastChoice,
    gameOverReason,
    startNewGame,
    setEvent,
    makeChoice,
    openTerminal,
    closeTerminal,
    continueGame,
  };
}
```

**Step 3: Commit**

```bash
git add client/src/hooks/ client/src/engine/
git commit -m "feat: add game state engine and useGame hook"
```

---

### Task 6: Event Engine

**Files:**
- Create: `client/src/engine/eventEngine.ts`
- Create: `client/src/content/events/index.ts`
- Create: `client/src/content/events/week1.ts`

**Step 1: Create event engine**

```typescript
// client/src/engine/eventEngine.ts
import { GameEvent, GameState, EventChoice, Skills } from '@kritis/shared';

export function getAvailableEvents(
  events: GameEvent[],
  state: GameState
): GameEvent[] {
  return events.filter((event) => {
    // Check week range
    if (state.currentWeek < event.weekRange[0] || state.currentWeek > event.weekRange[1]) {
      return false;
    }

    // Check day preference
    if (event.dayPreference && !event.dayPreference.includes(state.currentDay)) {
      return false;
    }

    // Check if already completed
    if (state.completedEvents.includes(event.id)) {
      return false;
    }

    // Check prerequisites
    if (event.requires) {
      if (event.requires.events) {
        for (const reqEvent of event.requires.events) {
          if (!state.completedEvents.includes(reqEvent)) {
            return false;
          }
        }
      }

      if (event.requires.flags) {
        for (const flag of event.requires.flags) {
          if (!state.flags[flag]) {
            return false;
          }
        }
      }

      if (event.requires.skills) {
        for (const [skill, value] of Object.entries(event.requires.skills)) {
          if (state.skills[skill as keyof Skills] < (value || 0)) {
            return false;
          }
        }
      }
    }

    return true;
  });
}

export function selectNextEvent(
  events: GameEvent[],
  state: GameState,
  seed: string
): GameEvent | null {
  const available = getAvailableEvents(events, state);
  if (available.length === 0) return null;

  // Simple seeded random selection
  const hash = simpleHash(seed + state.currentWeek + state.currentDay);
  const index = hash % available.length;
  return available[index];
}

export function getVisibleChoices(
  event: GameEvent,
  state: GameState
): EventChoice[] {
  return event.choices.filter((choice) => {
    if (choice.hidden) return false;

    if (choice.requires) {
      const skillValue = state.skills[choice.requires.skill];
      return skillValue >= choice.requires.threshold;
    }

    return true;
  });
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}
```

**Step 2: Create week 1 events**

```typescript
// client/src/content/events/week1.ts
import { GameEvent } from '@kritis/shared';

export const week1Events: GameEvent[] = [
  {
    id: 'evt_first_day',
    weekRange: [1, 1],
    dayPreference: [1],
    probability: 1,
    category: 'personal',
    title: 'Der erste Tag',
    description: `Du betrittst das Büro der IT-Abteilung. Kaffeeduft, das Summen von Servern aus dem Nebenraum, und ein Schreibtisch voller Post-its erwartet dich.

Dein Chef {chef} kommt auf dich zu: "Ah, der Neue! Gut dass du da bist. Wir haben hier einiges zu tun. Erstmal: Passwort ändern, Systeme kennenlernen. Und wenn du Fragen hast - frag lieber einmal zu viel als einmal zu wenig."

Was antwortest du?`,
    involvedCharacters: ['chef'],
    choices: [
      {
        id: 'enthusiastic',
        text: '"Ich freue mich auf die Herausforderung!"',
        effects: { relationships: { chef: 5 }, stress: 5 },
        resultText: '{chef} nickt zufrieden. "Die richtige Einstellung. Du wirst sie brauchen."',
      },
      {
        id: 'professional',
        text: '"Verstanden. Wo finde ich die Dokumentation?"',
        effects: { relationships: { chef: 10 }, skills: { troubleshooting: 2 } },
        resultText: '{chef} grinst. "Ein Dokumentationsleser! Selten. Confluence, aber erwarte nicht zu viel."',
        teachingMoment: 'Dokumentation zuerst zu lesen zeigt Professionalität und spart später Zeit.',
      },
      {
        id: 'nervous',
        text: '"Äh, klar. Wird schon..."',
        effects: { relationships: { chef: -5 }, stress: 10 },
        resultText: '{chef} runzelt die Stirn. "Selbstvertrauen kommt mit der Erfahrung. Hoffe ich."',
      },
    ],
    tags: ['intro', 'onboarding'],
  },
  {
    id: 'evt_password_reset_wave',
    weekRange: [1, 2],
    probability: 0.9,
    category: 'support',
    title: 'Die Passwort-Reset-Welle',
    description: `Montagmorgen. Dein Ticketsystem explodiert.

"Passwort vergessen" - 12 Tickets.
"Kann mich nicht anmelden" - 8 Tickets.
"Mein Account ist gesperrt" - 5 Tickets.

{kollege} schaut rüber: "Willkommen im Montag. Das ist normal nach dem Wochenende."

Wie gehst du vor?`,
    involvedCharacters: ['kollege'],
    choices: [
      {
        id: 'bulk_reset',
        text: 'Alle Passwörter auf einmal zurücksetzen (Massenreset im AD)',
        requires: { skill: 'windows', threshold: 30 },
        effects: { skills: { windows: 5 }, stress: -5, relationships: { fachabteilung: 10 } },
        resultText: 'Du öffnest PowerShell und setzt alle betroffenen Accounts mit einem Skript zurück. In 10 Minuten erledigt.',
        teachingMoment: 'Get-ADUser + Set-ADAccountPassword in einer Pipeline spart Stunden.',
        unlocks: ['Get-ADUser'],
      },
      {
        id: 'one_by_one',
        text: 'Jeden einzeln anrufen und manuell zurücksetzen',
        effects: { stress: 15, relationships: { fachabteilung: 5 } },
        resultText: 'Drei Stunden später bist du durch. Dein Kaffee ist längst kalt.',
      },
      {
        id: 'delegate',
        text: 'Die Hälfte an {kollege} delegieren',
        effects: { relationships: { kollegen: -5 }, stress: 5 },
        resultText: '{kollege} seufzt, hilft aber. "Beim nächsten Mal zeig ich dir, wie man das skriptet."',
      },
    ],
    tags: ['support', 'ad', 'windows'],
  },
  {
    id: 'evt_drucker_fluch',
    weekRange: [1, 3],
    probability: 0.85,
    category: 'support',
    title: 'Der Druckerfluch',
    description: `Das Telefon klingelt. Athos-Abteilung.

"Der Drucker geht nicht! Wir müssen dringend Abfuhrbescheide drucken!"

Du gehst hin. Der Drucker zeigt "Bereit" an. Papier ist drin. Toner voll.

Was machst du?`,
    involvedCharacters: ['athos'],
    choices: [
      {
        id: 'check_queue',
        text: 'Druckerwarteschlange am Server prüfen',
        effects: { skills: { windows: 3, troubleshooting: 5 }, stress: -5 },
        resultText: 'Bingo. 47 hängende Druckaufträge. Du leerst die Queue, startest den Spooler neu. Druckt.',
        teachingMoment: 'Immer zuerst die Warteschlange prüfen. Get-PrintJob oder Druckerverwaltung.',
        terminalCommand: true,
      },
      {
        id: 'restart_printer',
        text: 'Drucker aus- und wieder einschalten',
        effects: { stress: 5 },
        resultText: 'Drucker startet neu... zeigt wieder "Bereit". Druckt immer noch nicht. Das Problem liegt woanders.',
        teachingMoment: 'Neustart hilft nur bei Hardware-Problemen. Hier war es der Spooler-Dienst.',
      },
      {
        id: 'reinstall_driver',
        text: 'Treiber neu installieren',
        effects: { stress: 10, skills: { windows: 2 } },
        resultText: 'Eine Stunde später: Treiber neu, Problem bestand weiter. Es war der Spooler-Dienst.',
      },
    ],
    terminalContext: {
      type: 'windows',
      hostname: 'WARM-PC-042',
      username: 'admin',
      currentPath: 'C:\\>',
      commands: [
        {
          pattern: 'Get-PrintJob',
          output: `JobId  PrinterName      Document                    Status
-----  -----------      --------                    ------
142    HP-LaserJet-4    Abfuhrbescheid_2026.pdf    Spooling
143    HP-LaserJet-4    Abfuhrbescheid_2026.pdf    Error
... (45 weitere Einträge)`,
          teachesCommand: 'Get-PrintJob',
          skillGain: { windows: 2 },
        },
        {
          pattern: 'Clear-PrintQueue',
          output: 'Warteschlange wurde geleert.',
          skillGain: { windows: 2 },
          isSolution: true,
        },
        {
          pattern: 'Restart-Service -Name Spooler',
          output: 'Dienst wird neu gestartet...',
          skillGain: { windows: 3 },
          isSolution: true,
        },
      ],
      solutions: [
        {
          commands: ['Clear-PrintQueue', 'Restart-Service'],
          allRequired: false,
          resultText: 'Der Drucker rattert los. 47 Abfuhrbescheide werden gedruckt.',
          skillGain: { windows: 5, troubleshooting: 5 },
          effects: { relationships: { fachabteilung: 10 }, stress: -10 },
        },
      ],
      hints: [
        'Tipp: PowerShell kann Druckaufträge anzeigen. Get-PrintJob?',
        'Tipp: Die Warteschlange scheint voll zu sein...',
        'Tipp: Clear-PrintQueue oder Spooler-Dienst neu starten',
      ],
    },
    tags: ['support', 'drucker', 'windows', 'terminal'],
  },
];
```

**Step 3: Create events index**

```typescript
// client/src/content/events/index.ts
import { GameEvent } from '@kritis/shared';
import { week1Events } from './week1';

export const allEvents: GameEvent[] = [
  ...week1Events,
  // Future: ...week2Events, etc.
];

export function getEventById(id: string): GameEvent | undefined {
  return allEvents.find((e) => e.id === id);
}
```

**Step 4: Commit**

```bash
git add client/src/engine/eventEngine.ts client/src/content/
git commit -m "feat: add event engine and week 1 events with terminal integration"
```

---

## Phase 3: UI Components

### Task 7: Stats Bar Component

**Files:**
- Create: `client/src/components/StatsBar/index.tsx`
- Create: `client/src/components/StatsBar/SkillBar.tsx`
- Create: `client/src/components/StatsBar/RelationshipBar.tsx`

**Step 1: Create SkillBar**

```tsx
// client/src/components/StatsBar/SkillBar.tsx
interface SkillBarProps {
  name: string;
  value: number;
  maxValue?: number;
}

export function SkillBar({ name, value, maxValue = 100 }: SkillBarProps) {
  const percentage = (value / maxValue) * 100;
  const blocks = Math.floor(percentage / 10);

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-28 text-terminal-green-dim">{name}</span>
      <div className="flex-1 flex items-center gap-1">
        <span className="font-mono">
          {'█'.repeat(blocks)}
          {'░'.repeat(10 - blocks)}
        </span>
        <span className="w-8 text-right">{value}</span>
      </div>
    </div>
  );
}
```

**Step 2: Create RelationshipBar**

```tsx
// client/src/components/StatsBar/RelationshipBar.tsx
interface RelationshipBarProps {
  name: string;
  value: number;
  color?: string;
}

export function RelationshipBar({ name, value, color }: RelationshipBarProps) {
  const normalized = ((value + 100) / 200) * 100;
  const blocks = Math.floor(normalized / 10);
  const sign = value >= 0 ? '+' : '';

  const barColor = value < -30
    ? 'text-terminal-danger'
    : value > 30
      ? 'text-terminal-success'
      : 'text-terminal-green';

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-24 text-terminal-green-dim" style={{ color }}>{name}</span>
      <div className={`flex-1 flex items-center gap-1 ${barColor}`}>
        <span className="font-mono">
          {'█'.repeat(blocks)}
          {'░'.repeat(10 - blocks)}
        </span>
        <span className="w-10 text-right">{sign}{value}</span>
      </div>
    </div>
  );
}
```

**Step 3: Create StatsBar**

```tsx
// client/src/components/StatsBar/index.tsx
import { GameState } from '@kritis/shared';
import { SkillBar } from './SkillBar';
import { RelationshipBar } from './RelationshipBar';

interface StatsBarProps {
  state: GameState;
}

const DAYS = ['', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];

const SKILL_LABELS: Record<string, string> = {
  netzwerk: 'Netzwerk',
  linux: 'Linux',
  windows: 'Windows',
  security: 'Security',
  troubleshooting: 'Troubleshoot',
  softSkills: 'Soft Skills',
};

const RELATIONSHIP_LABELS: Record<string, { name: string; color: string }> = {
  chef: { name: 'Chef', color: '#ff8800' },
  gf: { name: 'GF', color: '#aa44ff' },
  kaemmerer: { name: 'Kämmerer', color: '#ff4444' },
  fachabteilung: { name: 'Fachabtlg.', color: '#44aaff' },
  kollegen: { name: 'Kollegen', color: '#44ff88' },
};

export function StatsBar({ state }: StatsBarProps) {
  const stressColor = state.stress > 80
    ? 'text-terminal-danger'
    : state.stress > 50
      ? 'text-terminal-warning'
      : 'text-terminal-green';

  return (
    <div className="border border-terminal-border p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-terminal-border">
        <span className="text-lg">KRITIS ADMIN SIMULATOR</span>
        <span className="text-terminal-green-dim">
          Woche {state.currentWeek} | {DAYS[state.currentDay]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Skills */}
        <div>
          <div className="text-terminal-green-dim mb-2 text-sm">─ SKILLS ─</div>
          <div className="space-y-1">
            {Object.entries(state.skills).map(([key, value]) => (
              <SkillBar key={key} name={SKILL_LABELS[key] || key} value={value} />
            ))}
          </div>
        </div>

        {/* Relationships */}
        <div>
          <div className="text-terminal-green-dim mb-2 text-sm">─ BEZIEHUNGEN ─</div>
          <div className="space-y-1">
            {Object.entries(state.relationships).map(([key, value]) => (
              <RelationshipBar
                key={key}
                name={RELATIONSHIP_LABELS[key]?.name || key}
                value={value}
                color={RELATIONSHIP_LABELS[key]?.color}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="mt-4 pt-2 border-t border-terminal-border flex gap-8 text-sm">
        <span className={stressColor}>
          Stress: {'█'.repeat(Math.floor(state.stress / 10))}
          {'░'.repeat(10 - Math.floor(state.stress / 10))} {state.stress}/100
        </span>
        <span>Budget: €{state.budget.toLocaleString('de-DE')}</span>
        <span>Compliance: {state.compliance}%</span>
      </div>
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add client/src/components/StatsBar/
git commit -m "feat: add StatsBar component with skills and relationships display"
```

---

### Task 8: Event Card Component

**Files:**
- Create: `client/src/components/EventCard/index.tsx`

**Step 1: Create EventCard**

```tsx
// client/src/components/EventCard/index.tsx
import { GameEvent, EventChoice, GameState } from '@kritis/shared';
import { getVisibleChoices } from '../../engine/eventEngine';

interface EventCardProps {
  event: GameEvent;
  state: GameState;
  onChoice: (choice: EventChoice) => void;
  characters?: Record<string, string>;
}

export function EventCard({ event, state, onChoice, characters = {} }: EventCardProps) {
  const visibleChoices = getVisibleChoices(event, state);

  const replaceCharacterNames = (text: string): string => {
    let result = text;
    for (const [role, name] of Object.entries(characters)) {
      result = result.replace(new RegExp(`\\{${role}\\}`, 'g'), name);
    }
    return result;
  };

  return (
    <div className="border border-terminal-border p-4">
      <div className="text-terminal-green-dim mb-2 text-sm">─ EREIGNIS ─</div>

      <h2 className="text-xl mb-4">&gt; {event.title}</h2>

      <div className="whitespace-pre-wrap mb-6 text-terminal-green-dim leading-relaxed">
        {replaceCharacterNames(event.description)}
      </div>

      <div className="space-y-2">
        {visibleChoices.map((choice, index) => {
          const isRecommended = choice.requires &&
            state.skills[choice.requires.skill] >= choice.requires.threshold + 20;

          return (
            <button
              key={choice.id}
              onClick={() => onChoice(choice)}
              className="w-full text-left p-2 border border-terminal-border hover:bg-terminal-bg-highlight hover:border-terminal-green transition-colors flex justify-between items-center"
            >
              <span>
                <span className="text-terminal-green-dim">[{index + 1}]</span>{' '}
                {choice.terminalCommand && <span className="text-terminal-info">&gt; </span>}
                {replaceCharacterNames(choice.text)}
              </span>
              {isRecommended && (
                <span className="text-terminal-success text-sm">[EMPFOHLEN]</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 pt-2 border-t border-terminal-border text-sm text-terminal-green-muted">
        [1-{visibleChoices.length}] Auswählen   [H] Hilfe   [S] Speichern   [M] Menü
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add client/src/components/EventCard/
git commit -m "feat: add EventCard component with choice display"
```

---

### Task 9: Result Screen Component

**Files:**
- Create: `client/src/components/ResultScreen/index.tsx`

**Step 1: Create ResultScreen**

```tsx
// client/src/components/ResultScreen/index.tsx
import { EventChoice, EventEffects } from '@kritis/shared';

interface ResultScreenProps {
  choice: EventChoice;
  onContinue: () => void;
  characters?: Record<string, string>;
}

export function ResultScreen({ choice, onContinue, characters = {} }: ResultScreenProps) {
  const replaceCharacterNames = (text: string): string => {
    let result = text;
    for (const [role, name] of Object.entries(characters)) {
      result = result.replace(new RegExp(`\\{${role}\\}`, 'g'), name);
    }
    return result;
  };

  const renderEffects = (effects: EventEffects) => {
    const items: JSX.Element[] = [];

    if (effects.skills) {
      for (const [skill, value] of Object.entries(effects.skills)) {
        if (value) {
          const color = value > 0 ? 'text-terminal-success' : 'text-terminal-danger';
          const sign = value > 0 ? '+' : '';
          items.push(
            <div key={`skill-${skill}`} className={color}>
              {skill.charAt(0).toUpperCase() + skill.slice(1)} {sign}{value}
            </div>
          );
        }
      }
    }

    if (effects.relationships) {
      for (const [rel, value] of Object.entries(effects.relationships)) {
        if (value) {
          const color = value > 0 ? 'text-terminal-success' : 'text-terminal-danger';
          const sign = value > 0 ? '+' : '';
          items.push(
            <div key={`rel-${rel}`} className={color}>
              {rel.charAt(0).toUpperCase() + rel.slice(1)} {sign}{value}
            </div>
          );
        }
      }
    }

    if (effects.stress) {
      const color = effects.stress < 0 ? 'text-terminal-success' : 'text-terminal-danger';
      const sign = effects.stress > 0 ? '+' : '';
      items.push(
        <div key="stress" className={color}>
          Stress {sign}{effects.stress}
        </div>
      );
    }

    if (effects.budget) {
      const color = effects.budget > 0 ? 'text-terminal-success' : 'text-terminal-danger';
      const sign = effects.budget > 0 ? '+' : '';
      items.push(
        <div key="budget" className={color}>
          Budget {sign}€{Math.abs(effects.budget).toLocaleString('de-DE')}
        </div>
      );
    }

    if (effects.compliance) {
      const color = effects.compliance > 0 ? 'text-terminal-success' : 'text-terminal-danger';
      const sign = effects.compliance > 0 ? '+' : '';
      items.push(
        <div key="compliance" className={color}>
          Compliance {sign}{effects.compliance}%
        </div>
      );
    }

    return items;
  };

  return (
    <div className="border border-terminal-border p-6">
      <div className="text-terminal-success text-xl mb-4">
        ✓ ENTSCHEIDUNG GETROFFEN
      </div>

      <div className="mb-6 text-terminal-green-dim leading-relaxed">
        {replaceCharacterNames(choice.resultText)}
      </div>

      {choice.teachingMoment && (
        <div className="border border-terminal-info p-4 mb-6">
          <div className="text-terminal-info mb-2">─ LERNEFFEKT ─</div>
          <div className="text-terminal-green-dim">
            {choice.teachingMoment}
          </div>
          {choice.unlocks && choice.unlocks.length > 0 && (
            <div className="mt-2 text-terminal-success">
              Neuer Befehl gelernt: {choice.unlocks.join(', ')}
            </div>
          )}
        </div>
      )}

      <div className="border border-terminal-border p-4 mb-6">
        <div className="text-terminal-green-dim mb-2">─ AUSWIRKUNGEN ─</div>
        <div className="grid grid-cols-2 gap-2">
          {renderEffects(choice.effects)}
        </div>
      </div>

      <button
        onClick={onContinue}
        className="w-full p-3 border border-terminal-green hover:bg-terminal-bg-highlight transition-colors text-center"
      >
        [ENTER] Weiter
      </button>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add client/src/components/ResultScreen/
git commit -m "feat: add ResultScreen component with effects display"
```

---

### Task 10: Terminal Component with xterm.js

**Files:**
- Create: `client/src/components/Terminal/index.tsx`
- Create: `client/src/components/Terminal/useTerminal.ts`

**Step 1: Create useTerminal hook**

```typescript
// client/src/components/Terminal/useTerminal.ts
import { useEffect, useRef, useCallback, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { TerminalContext, TerminalCommand, Skills } from '@kritis/shared';

interface UseTerminalOptions {
  context: TerminalContext;
  onSolved: (skillGain: Partial<Skills>) => void;
  onPartialSolution: (feedback: string) => void;
}

export function useTerminal({ context, onSolved, onPartialSolution }: UseTerminalOptions) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [currentLine, setCurrentLine] = useState('');
  const [hintsUsed, setHintsUsed] = useState(0);
  const [commandsUsed, setCommandsUsed] = useState<string[]>([]);

  const getPrompt = useCallback(() => {
    if (context.type === 'linux') {
      return `${context.username}@${context.hostname}:${context.currentPath}$ `;
    }
    return `PS ${context.currentPath}> `;
  }, [context]);

  const executeCommand = useCallback((input: string): string => {
    const trimmed = input.trim();
    if (!trimmed) return '';

    // Find matching command
    for (const cmd of context.commands) {
      let matches = false;

      if (cmd.patternRegex) {
        matches = new RegExp(cmd.patternRegex).test(trimmed);
      } else {
        matches = trimmed.startsWith(cmd.pattern) || trimmed === cmd.pattern;
      }

      if (matches) {
        setCommandsUsed((prev) => [...prev, trimmed]);

        if (cmd.isSolution) {
          setTimeout(() => onSolved(cmd.skillGain || {}), 100);
          return cmd.output;
        }

        if (cmd.isPartialSolution) {
          onPartialSolution(cmd.wrongApproachFeedback || 'Das hat nicht wie erwartet funktioniert.');
          return cmd.output;
        }

        return cmd.output;
      }
    }

    return `${trimmed.split(' ')[0]}: Befehl nicht gefunden`;
  }, [context, onSolved, onPartialSolution]);

  const showHint = useCallback(() => {
    if (hintsUsed < context.hints.length && xtermRef.current) {
      const hint = context.hints[hintsUsed];
      xtermRef.current.writeln(`\r\n\x1b[33m${hint}\x1b[0m`);
      xtermRef.current.write(getPrompt());
      setHintsUsed((prev) => prev + 1);
    }
  }, [hintsUsed, context.hints, getPrompt]);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontFamily: 'JetBrains Mono, Fira Code, monospace',
      fontSize: 14,
      theme: {
        background: '#0a0a0a',
        foreground: '#00ff00',
        cursor: '#00ff00',
        cursorAccent: '#0a0a0a',
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Welcome message
    term.writeln(`Connected to ${context.hostname}`);
    term.writeln('');
    term.write(getPrompt());

    let line = '';

    term.onData((data) => {
      switch (data) {
        case '\r': // Enter
          term.writeln('');
          if (line.trim()) {
            const output = executeCommand(line);
            if (output) {
              term.writeln(output);
            }
          }
          line = '';
          setCurrentLine('');
          term.write(getPrompt());
          break;

        case '\u007F': // Backspace
          if (line.length > 0) {
            line = line.slice(0, -1);
            setCurrentLine(line);
            term.write('\b \b');
          }
          break;

        case '\t': // Tab - show hint
          showHint();
          break;

        default:
          if (data >= ' ') {
            line += data;
            setCurrentLine(line);
            term.write(data);
          }
      }
    });

    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, [context, getPrompt, executeCommand, showHint]);

  return {
    terminalRef,
    hintsUsed,
    hintsRemaining: context.hints.length - hintsUsed,
    commandsUsed,
    showHint,
  };
}
```

**Step 2: Create Terminal component**

```tsx
// client/src/components/Terminal/index.tsx
import '@xterm/xterm/css/xterm.css';
import { TerminalContext, Skills } from '@kritis/shared';
import { useTerminal } from './useTerminal';

interface TerminalProps {
  context: TerminalContext;
  onSolved: (skillGain: Partial<Skills>) => void;
  onCancel: () => void;
}

export function Terminal({ context, onSolved, onCancel }: TerminalProps) {
  const { terminalRef, hintsRemaining, showHint } = useTerminal({
    context,
    onSolved,
    onPartialSolution: (feedback) => {
      console.log('Partial solution:', feedback);
    },
  });

  return (
    <div className="border border-terminal-border h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-2 border-b border-terminal-border bg-terminal-bg-secondary">
        <span>Terminal: {context.hostname} [{context.type === 'linux' ? 'Linux' : 'Windows'}]</span>
        <button onClick={onCancel} className="text-terminal-danger hover:underline">
          [ESC] Abbrechen
        </button>
      </div>

      {/* Terminal area */}
      <div ref={terminalRef} className="flex-1 p-2" />

      {/* Footer */}
      <div className="p-2 border-t border-terminal-border bg-terminal-bg-secondary flex justify-between text-sm">
        <span>
          <button
            onClick={showHint}
            disabled={hintsRemaining === 0}
            className={hintsRemaining > 0 ? 'hover:underline' : 'text-terminal-green-muted'}
          >
            [T] Tipp anzeigen ({hintsRemaining} übrig)
          </button>
        </span>
        <span className="text-terminal-green-muted">
          [?] Befehlsreferenz
        </span>
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add client/src/components/Terminal/
git commit -m "feat: add Terminal component with xterm.js integration"
```

---

### Task 11: Main Game Screen

**Files:**
- Create: `client/src/components/GameScreen/index.tsx`
- Modify: `client/src/App.tsx`

**Step 1: Create GameScreen**

```tsx
// client/src/components/GameScreen/index.tsx
import { useEffect } from 'react';
import { GameState, GameEvent, EventChoice } from '@kritis/shared';
import { StatsBar } from '../StatsBar';
import { EventCard } from '../EventCard';
import { ResultScreen } from '../ResultScreen';
import { Terminal } from '../Terminal';
import { GamePhase } from '../../hooks/useGame';

interface GameScreenProps {
  state: GameState;
  phase: GamePhase;
  currentEvent: GameEvent | null;
  lastChoice: EventChoice | null;
  characters: Record<string, string>;
  onChoice: (choice: EventChoice) => void;
  onContinue: () => void;
  onTerminalSolved: () => void;
  onTerminalCancel: () => void;
}

export function GameScreen({
  state,
  phase,
  currentEvent,
  lastChoice,
  characters,
  onChoice,
  onContinue,
  onTerminalSolved,
  onTerminalCancel,
}: GameScreenProps) {
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase === 'result' && e.key === 'Enter') {
        onContinue();
      }
      if (phase === 'terminal' && e.key === 'Escape') {
        onTerminalCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, onContinue, onTerminalCancel]);

  if (phase === 'terminal' && currentEvent?.terminalContext) {
    return (
      <div className="min-h-screen p-4 flex flex-col">
        <div className="mb-4">
          <StatsBar state={state} />
        </div>
        <div className="flex-1">
          <Terminal
            context={currentEvent.terminalContext}
            onSolved={onTerminalSolved}
            onCancel={onTerminalCancel}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 flex flex-col">
      <div className="mb-4">
        <StatsBar state={state} />
      </div>

      <div className="flex-1">
        {phase === 'playing' && currentEvent && (
          <EventCard
            event={currentEvent}
            state={state}
            onChoice={onChoice}
            characters={characters}
          />
        )}

        {phase === 'result' && lastChoice && (
          <ResultScreen
            choice={lastChoice}
            onContinue={onContinue}
            characters={characters}
          />
        )}

        {phase === 'playing' && !currentEvent && (
          <div className="border border-terminal-border p-8 text-center">
            <div className="text-terminal-green-dim mb-4">Kein Ereignis verfügbar.</div>
            <button
              onClick={onContinue}
              className="p-3 border border-terminal-green hover:bg-terminal-bg-highlight"
            >
              [ENTER] Nächster Tag
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Update App.tsx**

```tsx
// client/src/App.tsx
import { useGame } from './hooks/useGame';
import { GameScreen } from './components/GameScreen';
import { allEvents } from './content/events';
import { selectNextEvent } from './engine/eventEngine';
import { useEffect, useState } from 'react';

function App() {
  const game = useGame();
  const [characters] = useState({
    chef: 'Bernd',
    gf: 'Dr. Müller',
    kaemmerer: 'Herr Schmidt',
    athos: 'Frau Weber',
    kollege: 'Thomas',
  });

  // Select next event when needed
  useEffect(() => {
    if (game.phase === 'playing' && !game.currentEvent) {
      const nextEvent = selectNextEvent(allEvents, game.state, game.state.seed);
      if (nextEvent) {
        game.setEvent(nextEvent);
      }
    }
  }, [game.phase, game.currentEvent, game.state]);

  if (game.phase === 'menu') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="border border-terminal-border p-8 text-center max-w-lg">
          <h1 className="text-3xl mb-2">KRITIS ADMIN SIMULATOR</h1>
          <div className="text-terminal-green-dim mb-6">v1.0 - Probezeit Edition</div>

          <div className="text-left mb-6 text-terminal-green-dim text-sm">
            <p className="mb-2">Du bist der neue Sysadmin bei einer kommunalen Abfallwirtschaft.</p>
            <p className="mb-2">12 Wochen Probezeit. Drucker reparieren. Server retten. Überleben.</p>
            <p>Deine IT-Skills entscheiden, ob du bleibst oder fliegst.</p>
          </div>

          <button
            onClick={() => game.startNewGame()}
            className="w-full p-4 border border-terminal-green hover:bg-terminal-bg-highlight transition-colors text-lg"
          >
            [ NEUES SPIEL STARTEN ]
          </button>
        </div>
      </div>
    );
  }

  if (game.phase === 'gameover') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="border border-terminal-border p-8 text-center max-w-lg">
          <h1 className="text-2xl mb-4">
            {game.gameOverReason === 'probezeit_complete'
              ? '🎉 PROBEZEIT ÜBERSTANDEN!'
              : '❌ GAME OVER'}
          </h1>
          <p className="text-terminal-green-dim mb-6">
            {game.gameOverReason === 'burnout' && 'Du bist ausgebrannt. Die Arbeit war zu viel.'}
            {game.gameOverReason === 'fired' && 'Dein Chef hat dich gefeuert.'}
            {game.gameOverReason === 'bsi_bussgeld' && 'BSI-Compliance bei 0%. Massive Bußgelder.'}
            {game.gameOverReason === 'probezeit_complete' && 'Du hast die 12 Wochen überstanden!'}
          </p>
          <button
            onClick={() => game.startNewGame()}
            className="w-full p-4 border border-terminal-green hover:bg-terminal-bg-highlight"
          >
            [ NOCHMAL VERSUCHEN ]
          </button>
        </div>
      </div>
    );
  }

  return (
    <GameScreen
      state={game.state}
      phase={game.phase}
      currentEvent={game.currentEvent}
      lastChoice={game.lastChoice}
      characters={characters}
      onChoice={(choice) => {
        if (choice.terminalCommand && game.currentEvent?.terminalContext) {
          game.openTerminal();
        } else {
          game.makeChoice(choice);
        }
      }}
      onContinue={game.continueGame}
      onTerminalSolved={() => {
        if (game.lastChoice || game.currentEvent?.choices[0]) {
          game.makeChoice(game.lastChoice || game.currentEvent!.choices[0]);
        }
        game.closeTerminal(true);
      }}
      onTerminalCancel={() => game.closeTerminal(false)}
    />
  );
}

export default App;
```

**Step 3: Commit**

```bash
git add client/src/components/GameScreen/ client/src/App.tsx
git commit -m "feat: add GameScreen and wire up main game flow"
```

---

## Phase 4: Server API Routes

### Task 12: Player and Save Routes

**Files:**
- Create: `server/src/routes/players.ts`
- Create: `server/src/routes/saves.ts`
- Modify: `server/src/index.ts`

**Step 1: Create players route**

```typescript
// server/src/routes/players.ts
import { Router } from 'express';
import { db } from '../db/database.js';
import { v4 as uuid } from 'uuid';

export const playersRouter = Router();

// Get player by ID
playersRouter.get('/:id', (req, res) => {
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }

  const achievements = db.prepare(
    'SELECT achievement_id FROM player_achievements WHERE player_id = ?'
  ).all(req.params.id);

  const commands = db.prepare(
    'SELECT * FROM learned_commands WHERE player_id = ?'
  ).all(req.params.id);

  res.json({
    ...player,
    achievements: achievements.map((a: any) => a.achievement_id),
    learnedCommands: commands,
  });
});

// Create new player
playersRouter.post('/', (req, res) => {
  const id = uuid();
  db.prepare(
    'INSERT INTO players (id) VALUES (?)'
  ).run(id);

  res.status(201).json({ id });
});

// Add XP to player
playersRouter.put('/:id/xp', (req, res) => {
  const { xp } = req.body;
  if (typeof xp !== 'number') {
    return res.status(400).json({ error: 'XP must be a number' });
  }

  const result = db.prepare(
    'UPDATE players SET total_xp = total_xp + ? WHERE id = ?'
  ).run(xp, req.params.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Player not found' });
  }

  res.json({ success: true });
});

// Record learned command
playersRouter.post('/:id/learn', (req, res) => {
  const { command, successful, description } = req.body;

  const existing = db.prepare(
    'SELECT * FROM learned_commands WHERE player_id = ? AND command = ?'
  ).get(req.params.id, command);

  if (existing) {
    db.prepare(`
      UPDATE learned_commands
      SET times_used = times_used + 1,
          times_successful = times_successful + ?
      WHERE player_id = ? AND command = ?
    `).run(successful ? 1 : 0, req.params.id, command);
  } else {
    const player = db.prepare('SELECT total_runs FROM players WHERE id = ?').get(req.params.id) as any;
    db.prepare(`
      INSERT INTO learned_commands (player_id, command, times_used, times_successful, first_learned_run, description)
      VALUES (?, ?, 1, ?, ?, ?)
    `).run(req.params.id, command, successful ? 1 : 0, player?.total_runs || 1, description || null);
  }

  res.json({ success: true });
});

// Unlock achievement
playersRouter.post('/:id/achievements', (req, res) => {
  const { achievementId, runNumber } = req.body;

  try {
    db.prepare(`
      INSERT INTO player_achievements (player_id, achievement_id, run_number)
      VALUES (?, ?, ?)
    `).run(req.params.id, achievementId, runNumber || 1);
    res.status(201).json({ success: true });
  } catch (e: any) {
    if (e.code === 'SQLITE_CONSTRAINT') {
      res.json({ success: true, alreadyUnlocked: true });
    } else {
      throw e;
    }
  }
});
```

**Step 2: Create saves route**

```typescript
// server/src/routes/saves.ts
import { Router } from 'express';
import { db } from '../db/database.js';
import { v4 as uuid } from 'uuid';

export const savesRouter = Router();

// List saves for player
savesRouter.get('/:playerId', (req, res) => {
  const saves = db.prepare(
    'SELECT id, slot, current_week, stress, updated_at FROM saves WHERE player_id = ? ORDER BY slot'
  ).all(req.params.playerId);
  res.json(saves);
});

// Get specific save
savesRouter.get('/:playerId/:slot', (req, res) => {
  const save = db.prepare(
    'SELECT * FROM saves WHERE player_id = ? AND slot = ?'
  ).get(req.params.playerId, parseInt(req.params.slot));

  if (!save) {
    return res.status(404).json({ error: 'Save not found' });
  }

  res.json({
    ...save,
    gameState: JSON.parse((save as any).game_state),
  });
});

// Create or update save
savesRouter.put('/:playerId/:slot', (req, res) => {
  const { gameState } = req.body;
  const slot = parseInt(req.params.slot);
  const playerId = req.params.playerId;

  const existing = db.prepare(
    'SELECT id FROM saves WHERE player_id = ? AND slot = ?'
  ).get(playerId, slot);

  if (existing) {
    db.prepare(`
      UPDATE saves
      SET game_state = ?, current_week = ?, stress = ?, updated_at = CURRENT_TIMESTAMP
      WHERE player_id = ? AND slot = ?
    `).run(
      JSON.stringify(gameState),
      gameState.currentWeek,
      gameState.stress,
      playerId,
      slot
    );
  } else {
    const id = uuid();
    db.prepare(`
      INSERT INTO saves (id, player_id, slot, game_state, current_week, stress)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      playerId,
      slot,
      JSON.stringify(gameState),
      gameState.currentWeek,
      gameState.stress
    );
  }

  res.json({ success: true });
});

// Delete save
savesRouter.delete('/:playerId/:slot', (req, res) => {
  const result = db.prepare(
    'DELETE FROM saves WHERE player_id = ? AND slot = ?'
  ).run(req.params.playerId, parseInt(req.params.slot));

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Save not found' });
  }

  res.json({ success: true });
});
```

**Step 3: Update server index.ts**

```typescript
// server/src/index.ts
import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase } from './db/database.js';
import { playersRouter } from './routes/players.js';
import { savesRouter } from './routes/saves.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
initializeDatabase();

// API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/players', playersRouter);
app.use('/api/saves', savesRouter);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '../../client/dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

**Step 4: Test API**

```bash
# Start server
npm run dev:server

# Test player creation
curl -X POST http://localhost:3000/api/players
# Expected: {"id":"<uuid>"}

# Test save
curl -X PUT http://localhost:3000/api/saves/<player-id>/1 \
  -H "Content-Type: application/json" \
  -d '{"gameState":{"currentWeek":2,"stress":30}}'
```

**Step 5: Commit**

```bash
git add server/src/routes/ server/src/index.ts
git commit -m "feat: add player and save API routes"
```

---

## Phase 5: Docker & Deployment

### Task 13: Docker Configuration

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `.dockerignore`

**Step 1: Create Dockerfile**

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/
COPY shared/package*.json ./shared/

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy built files
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/src/db/schema.sql ./server/dist/db/
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server/package.json ./server/

# Create data directory
RUN mkdir -p /data

ENV NODE_ENV=production
ENV DATABASE_PATH=/data/kritis.db

EXPOSE 3000

CMD ["node", "server/dist/index.js"]
```

**Step 2: Create docker-compose.yml**

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
    restart: unless-stopped

volumes:
  kritis-data:
    driver: local
```

**Step 3: Create .dockerignore**

```
node_modules
dist
*.db
.git
.env
.env.local
*.log
```

**Step 4: Test Docker build**

```bash
docker compose build
docker compose up -d
curl http://localhost:3000/api/health
docker compose down
```

**Step 5: Commit**

```bash
git add Dockerfile docker-compose.yml .dockerignore
git commit -m "feat: add Docker configuration for Coolify deployment"
```

---

### Task 14: Final Integration Test

**Step 1: Full build test**

```bash
npm run build
```

Expected: All packages build successfully

**Step 2: Start full stack**

```bash
npm run dev
```

Expected: Both client and server start

**Step 3: Play through first event**

1. Open http://localhost:5173
2. Click "NEUES SPIEL STARTEN"
3. First event should appear
4. Make a choice
5. See result screen
6. Continue to next event

**Step 4: Test terminal flow**

1. Navigate to an event with terminal option
2. Select terminal choice
3. Type commands
4. Use hints
5. Solve and return to game

**Step 5: Commit final state**

```bash
git add .
git commit -m "feat: complete MVP implementation of KRITIS Admin Simulator"
```

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | 1-4 | Project setup: monorepo, shared types, client, server |
| 2 | 5-6 | Core engine: game state, events |
| 3 | 7-11 | UI components: stats, events, results, terminal, game screen |
| 4 | 12 | Server API: players, saves |
| 5 | 13-14 | Docker, deployment, testing |

**Total tasks: 14**
**Estimated commits: ~14**

After completing this plan, you'll have a working MVP with:
- Terminal-based UI
- 3 playable events for Week 1
- xterm.js terminal integration
- Save/load via API
- Docker deployment ready for Coolify
