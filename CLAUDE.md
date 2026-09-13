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
- `npm run test:e2e:chrome` — escape hatch: the same suite against the **installed** Google Chrome (`PW_CHANNEL=chrome`), for when Playwright's own browser binary is missing. Not the default, because the mobile specs assert pixel widths and CI runs the pinned bundled Chromium; a much newer local Chrome would diverge from CI in both directions.
- **A leftover server on :3000 makes e2e lie.** `playwright.config.ts` sets
  `reuseExistingServer: !process.env.CI`, so a server still running from an earlier
  run is reused — serving the OLD bundle. Style or component changes then appear to
  have no effect, and a probe ("does this test still fail without the fix?") passes
  for the wrong reason. Before trusting an e2e result after a code change, rebuild and
  stop only the listener on that port — never a broad `pkill` pattern, which can hit
  unrelated projects and still miss the actual node process:
  `lsof -tiTCP:3000 -sTCP:LISTEN | xargs -r kill` then `npm run build`.
  The `-sTCP:LISTEN` part matters: without it, `lsof` also lists every process
  *connected* to that port — a browser tab or a running `curl` — and the kill takes
  them with it (verified: an open client shows up as a second PID).
- **`boundingBox()` does not detect clipping.** It returns geometry regardless of an
  ancestor's `overflow: hidden`, so an element cut out of view still has a box. To
  assert something is actually visible, compare its rect against the nearest clipping
  ancestor (see `e2e/mobile-gui-layout.spec.ts`).
- **Never pipe an e2e run through `tail`.** Playwright prints the `N failed` summary *above* a long list of skipped test names, so a short tail shows only the skips and reads like a clean run — and the pipe replaces Playwright's exit code with `tail`'s `0`. Redirect to a file (`npx playwright test > out.txt 2>&1; echo $?`) and grep for `failed`. This is how a fully broken e2e run passed for weeks as "1 passed, 19 skipped".
- A full run is **83 tests: 61 pass, 22 skip**. The 22 are deliberate: 16 from four advanced tracks and 3 stateGoals levels whose solvability proof lives in the node engine suite (see `HARNESS_INCOMPATIBLE_TRACKS` / `HARNESS_INCOMPATIBLE_LEVELS` in `e2e/levels.spec.ts`), plus 3 pre-existing `test.fixme` in `e2e/game.spec.ts`. Anything else skipping is a defect.
- **`printf` does not interpret `\n`.** The shell engine writes it literally, so `printf 'a\nb\n' > file` produces ONE line containing `anb`. Multi-line files are written with `echo … > file` then `echo … >> file`. A level hint that got this wrong made the level unsolvable for anyone who followed it; `packScenarioLessons.test.ts` now runs every command from every hint and asserts they solve.
- **A level's scoring rules must be stated in its `taskText`.** Matching words in free-form prose rejects correct answers and accepts wrong ones. Report-style tasks declare a `schluessel: wert` schema in the task text and anchor their `matches` with `^`; a guard fails the build if a checked key is not in the task text.
- **`GameEvent.probability` is never read.** `selectNextEvent` picks `pool[hash % pool.length]`; only `chainEngine` has its own probability. An event declaring `probability: 1` has no priority whatsoever — it is one of N candidates. This broke the beginner tutorial chain silently for a long time (`evt_first_day` displaced on day 1 ⇒ all four `requires`-chained tutorials unreachable, 0 of 160 in simulation). Content that MUST be served needs `engine/onboarding.ts`, not a probability.
- **Two simulation guards depend on real randomness.** `chainEngine.scheduleChainEvents` calls `Math.random()` per trigger, so `kritisLatePacing.test.ts` can be green or red for identical content. `beginnerOnboarding.test.ts` stubs a seeded generator; when a pacing guard fails, re-run it before believing either result.
- The jsdom `WindowsLevel` specs run on **fake timers** (`client/src/test/fakeTimers.ts`): the 1.6 s success dwell is advanced, not waited out, so they no longer flake under machine load. Call `installFakeTimers()` at module scope, build users with `fakeTimerUser()`, and advance with `act(() => vi.advanceTimersByTime(SOLVE_DELAY_MS))`. A timeout in these specs now means something genuinely hangs.
- `npm run test:coverage`, `test:watch`, `test:all`

`npm run lint` runs ESLint (flat config, non-type-checked) over all three workspaces and also runs in CI; typechecking happens via `tsc` inside `npm run build`. Root vitest resolves `@kritis/shared` through `shared/dist` — after changing shared types, rebuild shared (`npm run build -w shared`) before running root tests directly with `npx vitest`.

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
