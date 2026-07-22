# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

KRITIS Admin Simulator — a German-language educational game about IT administration in critical infrastructure. UI text, game content, and most design docs are in German.

## Commands

npm workspaces monorepo: `client`, `server`, `shared`. Run everything from the repo root.

- `npm install` — install all workspaces
- `npm run dev` — Vite dev server at http://localhost:5173 (client only; no build step needed, `@kritis/shared` is aliased to `shared/src`)
- `npm run build` — builds shared → client (`tsc && vite build`) → server
- `npm start` — production Express server on :3000 (serves `client/dist`, `/api/health`, `/api/track`)
- `npm test` — builds shared, then runs node-env vitest tests (root `vitest.config.ts`; excludes `*.browser.test.tsx`)
- `npm run test:client` — jsdom browser tests (`client/vitest.config.ts`, includes `*.browser.test.tsx`)
- Single test: `npm test -- client/src/engine/gameState.test.ts` or `npm run test:client -- src/hooks/useAutosave.browser.test.tsx` (path relative to `client/`)
- `npm run test:e2e` — full build, then Playwright (`e2e/game.spec.ts`); its webServer starts prod on :3000 and probes `/api/health`
- `npm run test:coverage`, `test:watch`, `test:all`

There is no lint script. Typechecking happens via `tsc` inside `npm run build`. Root vitest resolves `@kritis/shared` through `shared/dist` — after changing shared types, rebuild shared (`npm run build -w shared`) before running root tests directly with `npx vitest`.

For runtime verification of changes, use `.claude/skills/verify/SKILL.md` — it documents how to drive the app (keyboard-first flow, story event order, autosave keys, gotchas like double-Enter landing on a day-transition screen).

## Architecture

**The backend is not a game backend.** The old Express/SQLite persistence API was deleted (`docs/BACKEND_REMOVAL.md`); the client makes no HTTP calls for gameplay. `server/` is now only: static SPA serving, `/api/health` (Docker HEALTHCHECK + Playwright probe), and an append-only NDJSON play-tracking log (`server/src/store.ts`, token-gated `/stats` page — see `docs/TRACKING.md`). Game saves must never move to the server.

**Persistence is localStorage-only**, keyed by pseudonymous `kritis_player_id`:
- Autosave: one versioned envelope per player at `kritis_autosave_<playerId>` (`client/src/engine/autosave.ts` + `hooks/useAutosave.ts`). All autosave functions are never-throw by design — a corrupt save must never break boot.
- 5 manual slots at `kritis_saves_<playerId>` (`hooks/useSaveLoad.ts`), meta-progression across runs in `engine/metaProgress.ts`.
- Telemetry (`engine/telemetry.ts`) fire-and-forgets run/lesson events to `POST /api/track`.

**Game core** lives in `client/src/`:
- `hooks/useGame.ts` — the state machine. Phases: `menu | playing | terminal | result | gameover | storyEnding`. Applies choice effects, advances days/weeks, checks game-over thresholds.
- `App.tsx` (~870 lines) — orchestrator: picks next content via `engine/eventEngine.ts` (events) or `engine/scenarioEngine.ts` (scenarios), drives story progression, act breaks, endings, autosave resume ("Weiter spielen"), and telemetry. Modals are lazy-loaded; `?preview=<id>` opens a dev-only GUI preview.
- `shared/src/config/gameModes.ts` — 6 modes (`beginner`, `learning`, `intermediate`, `hard` [hidden], `kritis`, `story`). Mode config drives starting stats, difficulty multipliers, game length, game-over thresholds, and feature flags (`cliOnly`, `showHints`). Menu flow and mode semantics: `docs/GAME_MODES_SPEC.md`.

**Two content systems** feed gameplay:
- Events (`content/events/`) — choice-driven cards, including learning-track levels (`engine/learningPath.ts`, surfaced via `LearningHub`).
- Scenario packs (`content/packs/*`) — vendor/NPC-flavored incidents; new packs register in `content/packs/index.ts`.
- Story mode (`content/adventure/`) — authored beat sequence (`story-events.ts`), chapters + chapter art, sidequests, endings; progression logic in `engine/adventureEngine.ts`, decision-chain follow-ups in `engine/chainEngine.ts`.

**Terminal emulation** (`engine/shell/`): `ShellEngine` (bash and PowerShell variants) + `VirtualFilesystem` + per-shell command implementations, seeded per scenario (`scenarioSeed.ts`), rendered with xterm.js in `components/Terminal`/`TerminalUI`. Solving a terminal level returns `skillGain`/`solutionFlags`/`solutionEffects` back through `useGame.closeTerminal`. Spec: `docs/specs/terminal-cli-specification.md`. The engine is multi-host: real `ssh`/`scp`/`ssh-keygen`/`ssh-copy-id` push/pop sessions across a host registry (`shell/hosts.ts`), with `systemctl`/`journalctl`/`ufw`/`chown`/`crontab` and an Ansible mini-engine; advanced levels win by declarative `stateGoals` (`shell/stateGoals.ts`) rather than canned command matching (both models supported — §11 of the spec). Windows GUI levels (`components/WindowsLevel/` — Explorer, Event Viewer, UAC, Settings apps) are the GUI counterpart with `guiSolution.ts` checking.

**Story immersion layer**: `contexts/StoryBackgroundContext` + `components/StoryBackground` render fullscreen noir artwork (`client/public/images/events/*.webp`) with crossfade/Ken-Burns behind story events; `hooks/useTypewriter.ts` for text reveal; opt-in sound in `audio/soundEngine.ts`. `prefers-reduced-motion` must stay respected.

## Conventions

- **Spec-driven workflow**: features get a dated pair in `docs/plans/` — `YYYY-MM-DD-<topic>-design.md` (approved design) plus an implementation plan. Read the relevant pair before touching a feature area; update the matching spec in `docs/` (GAME_MODES_SPEC, MODULAR_UI, VISUAL_FEEDBACK_SPEC, BLACKOUT_SLICE, TECHNICAL_DEBT) when behavior changes.
- **Content is test-constrained**: `engine/` contains audit tests (pacing, flow density, skill balance, campaign consistency) and `content/orthography.test.ts` that assert properties of the content data. Adding/altering events or scenarios can fail these — run `npm test` and treat failures as content feedback, not test bugs.
- Colocated tests: node-env logic tests as `*.test.ts` next to source; DOM/component tests as `*.browser.test.tsx` (client jsdom config only).
- Keyboard-first UI: arrows/Enter/Escape drive all menus and modals with focus traps — preserve this in any UI change.
