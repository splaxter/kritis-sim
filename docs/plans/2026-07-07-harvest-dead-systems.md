# Harvest Dead Systems: Show Standard Mode, Delete Arcade — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** (A) Expose the fully-configured but hidden `intermediate` ("Standard", 1.0× effects) game mode in the mode selector, fixing the difficulty-ladder gap (today: beginner 0.7× → kritis 1.3× with nothing between). `hard` (1.5×) stays hidden. (B) Delete the dead arcade system end-to-end: scoring engine, timer hook, state fields, display paths, mode config, type-union member, and server schema entries. The arcade UI in EventCard is unreachable (its `arcade` prop is never passed by either GameScreen call site), `useArcadeTimer` has zero call sites, and `arcade` is not in `VISIBLE_MODES` — nothing observable changes for players. Everything stays restorable from git history if arcade is ever revived.

**Architecture:** npm-workspaces monorepo (`client` / `server` / `shared`). Game-mode configs and the `VISIBLE_MODES` list live in `shared` (NOT client — the mode picker in `client/src/components/GameModeSelectModal/index.tsx` renders dynamically from `getVisibleGameModes()`, so Task A is a one-array change in `shared/src/types/gameMode.ts:9` plus tests/docs). Arcade deletion must run leaf-to-root: client UI consumers first, client state init next, and the `shared` type union + `server` zod schema last, because removing `'arcade'` from `GameModeId` forces the `GAME_MODES` record entry (typed `Record<GameModeId, …>`) out in the same commit, and typecheck is the safety net at each step.

**Tech Stack:** TypeScript 5.4, React 18 + Vite, vitest 4 (two suites: root node-env config `vitest.config.ts`, client jsdom config `client/vitest.config.ts` — DOM tests MUST be named `*.browser.test.tsx` or the root node-env suite picks them up and fails), zod (server validation), Playwright e2e.

---

## Verified baseline (2026-07-07, branch `feat/blackout-slice`)

Run these before starting so you can tell your failures from pre-existing ones:

- `npm run build` — **green** (tsc for shared → client → server; this is the typecheck gate, there is no separate `typecheck` script).
- `npm run test:client` — **green**: `Test Files 43 passed (43)`, `Tests 378 passed (378)`. (If it flakes, rerun — it is sensitive to a concurrently running root suite because both build `shared`.)
- `npm test` — **RED with 4 pre-existing failures unrelated to this plan** (DOM tests misnamed `.test.tsx` instead of `.browser.test.tsx`, failing with `ReferenceError: document is not defined` under the root node environment): `client/src/App.learningHub.test.tsx`, `client/src/components/LearningHub/index.test.tsx`, `client/src/components/ResultScreen/ResultScreen.learningCtas.test.tsx`, `client/src/components/Terminal/Terminal.partialFeedback.test.tsx`. Baseline: `Test Files 4 failed | 32 passed (36)`, `Tests 12 failed | 379 passed | 2 todo (393)`. **"Green" for this plan means: no failures beyond these 4 files / 12 tests.** Do not fix them here (out of scope).

Audit-verified facts this plan relies on:

- `VISIBLE_MODES` is at `/Users/timoklinge/Projekte/kritis_game/shared/src/types/gameMode.ts:9`: `['beginner', 'learning', 'story', 'kritis']`. `RECOMMENDED_MODE_ID = 'beginner'` (line 12) — unchanged by this plan.
- `shared/src/config/gameModes.ts` has full configs for `intermediate` (lines 84–119, name "Standard", 1.0×) and `arcade` (lines 195–231, the ONLY mode with `timerEnabled: true` / `timerSeconds` / `comboScoringEnabled: true`).
- `formatScore` + `getMultiplier` (from `client/src/engine/arcadeScoring.ts`) and `formatArcadeTime` (from `client/src/hooks/useArcadeTimer.ts`) are imported ONLY by `client/src/components/EventCard/index.tsx` (lines 4–5) and used ONLY inside its arcade-gated UI (lines 271–315) behind the `arcade` prop — which neither EventCard call site in `client/src/components/GameScreen/index.tsx` (lines 146, 230) passes. **They die with the arcade UI; nothing else uses them.** `useArcadeTimer()` itself and `getTimerColor` have zero call sites.
- `client/src/engine/gameState.ts:39–44` initializes `arcadeScore`/`comboMultiplier`/`comboStreak` when `mode === 'arcade'`; typed in `shared/src/types/gameState.ts:47–51`; validated in `server/src/validation/gameStateSchema.ts:73–76`; `'arcade'` is in the zod mode enum at `gameStateSchema.ts:31`. `DEFAULT_GAME_STATE` has no arcade fields.
- Display paths: `client/src/App.tsx:415–422` (game-over screen) and `client/src/components/StatsBar/index.tsx:105–113`, both gated on `gameMode === 'arcade'` (unreachable — arcade is not selectable).
- Arcade tests to touch (all in `client/src/engine/gameState.test.ts`): lines 131–138, 166–172, 754–762. No arcade references in `server/src/routes/saves.test.ts`, `e2e/`, or any `*.browser.test.tsx`.
- `client/src/engine/chainPacingAudit.test.ts` iterates `getVisibleGameModes()` — Task A grows its coverage to include `intermediate`. The backup chain already lists `intermediate` in `requiredModes` (`client/src/content/events/chains/backup-chain.ts:27`), so this is expected to pass; if it fails, that is a real pacing finding in chain content, not a reason to hide the mode.
- e2e (`e2e/game.spec.ts`) selects modes via `page.locator('text=Einsteiger').first()` and Enter-for-default — adding a "Standard" card breaks neither.
- No consumers of `features.timerEnabled` / `timerSeconds` / `comboScoringEnabled` exist outside `shared/src/types/gameMode.ts` + `shared/src/config/gameModes.ts` (verified by grep), so those feature flags are arcade-only plumbing and get deleted too.

Work on the current branch (or branch off it); commit after each task with conventional-commit messages as given.

---

## Task 1 (A): Failing test — Standard mode is visible

**Files:**
- Create: `/Users/timoklinge/Projekte/kritis_game/client/src/components/GameModeSelectModal/GameModeSelectModal.browser.test.tsx`
  (MUST use the `.browser.test.tsx` suffix — plain `.test.tsx` gets picked up by the root node-env suite and fails with `document is not defined`.)

**Steps:**

1. Write the test file:

   ```tsx
   import { describe, it, expect, vi } from 'vitest';
   import { render, screen } from '@testing-library/react';
   import { VISIBLE_MODES } from '@kritis/shared';
   import { GameModeSelectModal } from './index';

   describe('GameModeSelectModal — Standard mode exposed', () => {
     it('VISIBLE_MODES includes intermediate (Standard, 1.0x) between story and kritis', () => {
       expect(VISIBLE_MODES).toEqual(['beginner', 'learning', 'story', 'intermediate', 'kritis']);
     });

     it('renders the Standard mode card', () => {
       render(<GameModeSelectModal onSelect={vi.fn()} onClose={vi.fn()} />);
       expect(screen.getByText('Standard')).toBeInTheDocument();
       expect(screen.getByText(/klassische Spielerlebnis/)).toBeInTheDocument();
     });

     it('keeps Einsteiger as the recommended, pre-selected mode', () => {
       render(<GameModeSelectModal onSelect={vi.fn()} onClose={vi.fn()} />);
       expect(screen.getByText('★ EMPFOHLEN')).toBeInTheDocument();
       // The recommended badge sits on the Einsteiger card, which is also pre-selected.
       expect(screen.getByText('[*]')).toBeInTheDocument();
       expect(screen.getByText('Einsteiger')).toBeInTheDocument();
     });
   });
   ```

2. Run it and confirm it FAILS (first test: array mismatch; second test: 'Standard' not found):

   ```bash
   cd /Users/timoklinge/Projekte/kritis_game && npx vitest run --root client --config vitest.config.ts src/components/GameModeSelectModal
   ```

   Expected: `Tests 2 failed | 1 passed` (the Einsteiger test already passes).

3. Commit:

   ```bash
   git add client/src/components/GameModeSelectModal/GameModeSelectModal.browser.test.tsx
   git commit -m "test(modes): expect Standard (intermediate) in the mode selector"
   ```

---

## Task 2 (A): Expose `intermediate`, update README, verify chain pacing

**Files:**
- Modify: `/Users/timoklinge/Projekte/kritis_game/shared/src/types/gameMode.ts` (line 9)
- Modify: `/Users/timoklinge/Projekte/kritis_game/README.md` (lines 7–16, mode table + hidden-modes note)
- Modify: `/Users/timoklinge/Projekte/kritis_game/docs/GAME_MODES_SPEC.md` (Hidden Modes section ~line 289; Mode Selection Order + `VISIBLE_MODES` snippet ~lines 315–334)
- Test: `client/src/components/GameModeSelectModal/GameModeSelectModal.browser.test.tsx` (from Task 1), `client/src/engine/chainPacingAudit.test.ts`

**Steps:**

1. In `shared/src/types/gameMode.ts:9`, insert `'intermediate'` between `'story'` and `'kritis'` (reads as a difficulty ladder: 0.7× → learning → story → 1.0× → 1.3×; `hard` stays hidden by decision):

   ```ts
   export const VISIBLE_MODES: GameModeId[] = ['beginner', 'learning', 'story', 'intermediate', 'kritis'];
   ```

2. Rebuild shared and rerun the Task 1 test — now green:

   ```bash
   cd /Users/timoklinge/Projekte/kritis_game && npm run build -w shared && npx vitest run --root client --config vitest.config.ts src/components/GameModeSelectModal
   ```

   Expected: `Tests 3 passed (3)`.

3. Run the chain-pacing audit, which now also simulates `intermediate`:

   ```bash
   npx vitest run client/src/engine/chainPacingAudit.test.ts
   ```

   Expected: pass. If it fails, the failure names a real chain-pacing violation for `intermediate` — fix the chain content constraint it reports (do NOT remove `intermediate` from `VISIBLE_MODES` to silence it).

4. Update `README.md`: change "currently exposes four modes" (line 7) to "five modes"; add a table row after Lernmodus (keep the table's mode order matching `VISIBLE_MODES`):

   ```
   | **Standard** | The classic baseline experience - balanced challenge, 1.0x effects |
   ```

   (Place it between the Story and KRITIS rows to match picker order.) Change line 16 to: `` Additional modes (`Schwer`, `Arcade`) still exist in code as hidden/legacy configurations, but are not shown in the current mode selection screen. `` (Task 8 removes the Arcade mention.)

5. Update `docs/GAME_MODES_SPEC.md`: retitle "Hidden Modes (3)" to "Hidden Modes (2)" and delete the "Intermediate (Standard)" subsection; add Standard to the "Mode Selection Order" list (position 4, `💼`); update the `VISIBLE_MODES` snippet in "Type Definition Update" to the new five-element array.

6. Full gates:

   ```bash
   npm run build && npm test; npm run test:client
   ```

   Expected: build green; `npm test` shows only the 4 known pre-existing failing files (12 tests); `npm run test:client` fully green, now `Tests 381 passed` (378 + the 3 new).

7. Commit:

   ```bash
   git add shared/src/types/gameMode.ts README.md docs/GAME_MODES_SPEC.md
   git commit -m "feat(modes): expose Standard (intermediate) difficulty in the mode selector"
   ```

---

## Task 3 (B): Arcade inventory verification — greps before deleting

**Files:** none modified — verification only.

**Steps:**

1. Enumerate every arcade reference in source:

   ```bash
   cd /Users/timoklinge/Projekte/kritis_game && grep -rn -i "arcade" client/src server/src shared/src e2e --include="*.ts" --include="*.tsx"
   ```

   Expected hits, and ONLY these (if you see anything else, stop and re-plan that file into the right task below):

   - `client/src/engine/arcadeScoring.ts` — whole file (323 lines), delete in Task 4
   - `client/src/hooks/useArcadeTimer.ts` — whole file (193 lines), delete in Task 4
   - `client/src/components/EventCard/index.tsx` — lines 4–5, 8–20, 27, 30, 187, 213–218, 268, 271–315, 317–319, 333–338 → Task 4
   - `client/src/App.tsx` — lines 415–422 → Task 5
   - `client/src/components/StatsBar/index.tsx` — lines 105–113 → Task 5
   - `client/src/engine/gameState.ts` — lines 39–44 → Task 6
   - `client/src/engine/gameState.test.ts` — lines 131–138, 166–172, 754–762 → Task 6
   - `shared/src/types/gameState.ts` — lines 47–51 → Task 7
   - `shared/src/types/gameMode.ts` — line 6 (`'arcade'` in union) → Task 7
   - `shared/src/config/gameModes.ts` — lines 195–231 (config entry) plus the `timerEnabled`/`timerSeconds`/`comboScoringEnabled` feature lines in all modes → Task 7
   - `server/src/validation/gameStateSchema.ts` — lines 31, 73–76 → Task 7
   - `client/src/content/events/chains/backup-chain.ts` — line 26, comment only → Task 7

2. Confirm the helpers have no other importers (expect ONLY `client/src/components/EventCard/index.tsx:4` and `:5`):

   ```bash
   grep -rn "arcadeScoring\|useArcadeTimer" client/src server/src shared/src --include="*.ts" --include="*.tsx" | grep -v "client/src/engine/arcadeScoring.ts" | grep -v "client/src/hooks/useArcadeTimer.ts"
   ```

3. Confirm no EventCard call site passes the `arcade` prop (expect only lines 146 and 230 of GameScreen, neither with `arcade=`):

   ```bash
   grep -rn "arcade=" client/src --include="*.tsx"
   ```

   Expected: no output (exit 1).

4. Confirm the feature flags are consumed nowhere outside the shared type/config (expect no output):

   ```bash
   grep -rn "timerEnabled\|comboScoringEnabled\|timerSeconds" client/src server/src | grep -v node_modules
   ```

No commit for this task.

---

## Task 4 (B): Remove arcade UI from EventCard; delete scoring engine and timer hook

**Files:**
- Modify: `/Users/timoklinge/Projekte/kritis_game/client/src/components/EventCard/index.tsx`
- Delete: `/Users/timoklinge/Projekte/kritis_game/client/src/engine/arcadeScoring.ts`
- Delete: `/Users/timoklinge/Projekte/kritis_game/client/src/hooks/useArcadeTimer.ts`
- Test: existing `client/src/components/EventCard/EventCard.browser.test.tsx` (has no arcade references — must stay green)

**Steps:**

1. In `EventCard/index.tsx`, remove (line numbers pre-edit; work bottom-up so they stay valid):
   - Lines 333–338 (footer): replace the `arcade?.enabled ? … : …` ternary with just the non-arcade branch: `<span>{cardKind === 'decision' ? \`[1-${visibleChoices.length}] / [Enter] Auswahlen   [S] Speichern\` : '[Enter] Weiter   [S] Speichern'}</span>`
   - Lines 317–319: replace `{arcade?.enabled ? '- ARCADE EREIGNIS -' : '- EREIGNIS -'}` with `- EREIGNIS -`
   - Lines 271–315: the entire `{arcade?.enabled && (…Arcade Header…)}` block (score, streak, timer, popup)
   - Line 268: comment `// Standard/Arcade mode layout` → `// Standard mode layout`
   - Lines 213–218: the `getTimerBarColor` function (only used by the deleted header)
   - Line 187: drop the `${arcade?.enabled && arcade.progress <= 0.25 ? 'hover:border-red-500' : ''}` fragment from the className template
   - Line 30: remove `arcade` from the destructured props
   - Lines 22–28: remove `arcade?: ArcadeState;` from `EventCardProps`
   - Lines 8–20: the `ArcadeState` interface
   - Lines 4–5: the two imports (`formatArcadeTime`, `formatScore, getMultiplier`)

2. Delete the two dead files:

   ```bash
   cd /Users/timoklinge/Projekte/kritis_game && git rm client/src/engine/arcadeScoring.ts client/src/hooks/useArcadeTimer.ts
   ```

3. Typecheck + both suites:

   ```bash
   npm run build && npm test; npm run test:client
   ```

   Expected: build green (proves nothing else imported the deleted files); `npm test` only the 4 known pre-existing failures; `npm run test:client` fully green including `EventCard.browser.test.tsx`.

4. Commit:

   ```bash
   git add -A && git commit -m "refactor(arcade): delete unwired scoring engine, timer hook, and EventCard arcade UI"
   ```

---

## Task 5 (B): Remove arcade score displays (App game-over screen, StatsBar)

**Files:**
- Modify: `/Users/timoklinge/Projekte/kritis_game/client/src/App.tsx` (lines 415–422)
- Modify: `/Users/timoklinge/Projekte/kritis_game/client/src/components/StatsBar/index.tsx` (lines 105–113)

**Steps:**

1. In `App.tsx`, delete lines 415–422: the `{/* Show arcade score if applicable */}` comment plus the `{game.state.gameMode === 'arcade' && game.state.arcadeScore !== undefined && (…ARCADE SCORE…)}` block on the game-over screen.

2. In `StatsBar/index.tsx`, delete lines 105–113: the `{/* Arcade score display */}` comment plus the `{state.gameMode === 'arcade' && state.arcadeScore !== undefined && (…Score…comboMultiplier…)}` span.

3. Verify:

   ```bash
   npm run build && npm test; npm run test:client
   ```

   Expected: same green-state as Task 4.

4. Commit:

   ```bash
   git add client/src/App.tsx client/src/components/StatsBar/index.tsx
   git commit -m "refactor(arcade): remove unreachable arcade score displays"
   ```

---

## Task 6 (B): Remove arcade state initialization + update engine tests

**Files:**
- Modify: `/Users/timoklinge/Projekte/kritis_game/client/src/engine/gameState.ts` (lines 39–44)
- Modify: `/Users/timoklinge/Projekte/kritis_game/client/src/engine/gameState.test.ts` (lines 131–138, 166–172, 754–762)

**Steps:**

1. Update tests FIRST (they still reference `'arcade'`, which remains a valid `GameModeId` until Task 7, so this order keeps every intermediate state compiling):
   - Delete the test `'creates arcade mode with arcade-specific fields'` (lines 131–138).
   - Rewrite `'enables mentor mode for beginner, disables for arcade'` (lines 166–172) to use `intermediate` (freshly player-facing since Task 2; also `mentorModeEnabled: false`): rename to `'enables mentor mode for beginner, disables for intermediate'` and replace both `'arcade'` usages with `'intermediate'`, asserting `intermediateState.mentorModeEnabled` is `false`.
   - Delete the test `'triggers after week 8 (arcade mode)'` (lines 754–762) — mode-specific game-length victory is still covered by the kritis 24-week test directly above it.

2. In `gameState.ts`, delete lines 39–44 (the `// Initialize arcade fields if arcade mode` comment and the `...(mode === 'arcade' ? { arcadeScore: 0, comboMultiplier: 1, comboStreak: 0 } : {})` spread).

3. Run the touched suite, then the gates:

   ```bash
   npx vitest run client/src/engine/gameState.test.ts
   npm run build && npm test; npm run test:client
   ```

   Expected: `gameState.test.ts` green (3 fewer/changed tests); gates in the same green-state as before.

4. Commit:

   ```bash
   git add client/src/engine/gameState.ts client/src/engine/gameState.test.ts
   git commit -m "refactor(arcade): drop arcade state initialization from the client engine"
   ```

---

## Task 7 (B): Remove arcade from shared types/config and server schema (the type ripple — one commit)

These four files must change together: removing `'arcade'` from `GameModeId` immediately makes `GAME_MODES` (typed `Record<GameModeId, GameModeConfig>`) fail to compile until its `arcade` entry is gone, and vice versa.

**Files:**
- Modify: `/Users/timoklinge/Projekte/kritis_game/shared/src/types/gameMode.ts` (lines 6, 44–51)
- Modify: `/Users/timoklinge/Projekte/kritis_game/shared/src/config/gameModes.ts` (lines 195–231 + feature lines in every mode)
- Modify: `/Users/timoklinge/Projekte/kritis_game/shared/src/types/gameState.ts` (lines 47–51)
- Modify: `/Users/timoklinge/Projekte/kritis_game/server/src/validation/gameStateSchema.ts` (lines 31, 73–76)
- Modify: `/Users/timoklinge/Projekte/kritis_game/client/src/content/events/chains/backup-chain.ts` (line 26, comment only)

**Steps:**

1. `shared/src/types/gameMode.ts`:
   - Line 6: remove `| 'arcade'` from the `GameModeId` union.
   - Lines 44–51 (`GameModeFeatures`): remove `timerEnabled: boolean;`, `timerSeconds?: number;`, `comboScoringEnabled: boolean;` — arcade-only plumbing with zero consumers (verified in Task 3 step 4). Keep `showHints` and `cliOnly`.

2. `shared/src/config/gameModes.ts`:
   - Delete the entire `arcade:` entry (lines 195–231).
   - In each remaining mode's `features` block, delete the now-untyped `timerEnabled: false,` and `comboScoringEnabled: false,` lines (beginner :41/:42, learning :78/:79, intermediate :116/:117, hard :153/:154, kritis :190/:191, story :265/:266).

3. `shared/src/types/gameState.ts`: delete lines 47–51 (`// Arcade mode specific` comment + `arcadeScore?` / `comboMultiplier?` / `comboStreak?`).

4. `server/src/validation/gameStateSchema.ts`: remove `'arcade',` from `GameModeIdSchema` (line 31) and lines 73–76 (`// Arcade mode specific (optional)` + the three optional zod fields). Save-compat note: a persisted save with `gameMode: 'arcade'` would now fail validation — acceptable, arcade was never selectable in the shipped picker so no such saves exist; restorable from git if needed. (You will notice this enum is already stale in other ways — missing `learning`/`story`, has `adventure`. Do NOT fix that here; out of scope.)

5. `client/src/content/events/chains/backup-chain.ts` line 26: delete the sentence `arcade is excluded (score mode, not narrative).` from the comment (the `requiredModes` array itself never listed arcade).

6. Verify — typecheck is the real gate for this step:

   ```bash
   npm run build && npm test; npm run test:client
   ```

   Expected: build green across all three workspaces; suites in the same green-state as before.

7. Commit:

   ```bash
   git add shared/src/types/gameMode.ts shared/src/config/gameModes.ts shared/src/types/gameState.ts server/src/validation/gameStateSchema.ts client/src/content/events/chains/backup-chain.ts
   git commit -m "refactor(arcade)!: remove arcade mode from shared types, config, and server schema"
   ```

---

## Task 8 (B): Docs sweep, final dangle-check, full suite

**Files:**
- Modify: `/Users/timoklinge/Projekte/kritis_game/README.md` (line 16 area — hidden-modes note)
- Modify: `/Users/timoklinge/Projekte/kritis_game/GAME_FLOW_COVERAGE.md` (line 11 table row, "### Arcade" section ~lines 79–90, line 308 bullet)
- Modify: `/Users/timoklinge/Projekte/kritis_game/docs/GAME_MODES_SPEC.md` ("### Arcade" hidden-mode subsection ~line 304, `GameModeId` snippet ~line 330)

**Steps:**

1. `README.md`: change the hidden-modes note to only mention `Schwer`: `` Additionally, a `Schwer` (hard) mode still exists in code as a hidden configuration. `` Append a sentence for posterity: `An unused Arcade mode (timer + combo scoring) was removed in 2026-07; recover it from git history if ever needed.`

2. `GAME_FLOW_COVERAGE.md`: delete the `| Arcade | 8 | 30s | … |` row from the mode table (line 11), the whole `### Arcade` section (~lines 79–90, through its settings table), and the line-308 bullet `- Arcade combo system exists but visual feedback could be enhanced`.

3. `docs/GAME_MODES_SPEC.md`: retitle "Hidden Modes (2)" → "Hidden Modes (1)" (only Hard remains); delete the `### Arcade` subsection (~lines 304–307); remove `| 'arcade'` from the `GameModeId` snippet in "Type Definition Update" (~line 330).

4. Final dangle-check — expect ZERO output from the source grep (docs may still say "Arcade" only in the README removal note):

   ```bash
   cd /Users/timoklinge/Projekte/kritis_game && grep -rn -i "arcade" client/src server/src shared/src e2e --include="*.ts" --include="*.tsx"
   ```

   Expected: no output (exit 1). If anything prints, delete it and rerun the gates.

5. Full final verification:

   ```bash
   npm run build && npm test; npm run test:client
   ```

   Expected: build green; `npm test` shows ONLY the 4 pre-existing failing DOM-test files (12 tests) from the baseline; `npm run test:client` fully green (381 tests). Optionally also `npm run test:e2e` (builds everything + Playwright; the specs click `text=Einsteiger` and are unaffected).

6. Commit:

   ```bash
   git add README.md GAME_FLOW_COVERAGE.md docs/GAME_MODES_SPEC.md
   git commit -m "docs: remove arcade mode from mode tables and coverage docs"
   ```

---

## Revival note

The arcade system (scoring curve, streak multipliers, grade calculation, countdown timer with pause/resume) was deleted, not archived. To inspect or restore it:

```bash
git log --oneline --all -- client/src/engine/arcadeScoring.ts client/src/hooks/useArcadeTimer.ts
git show <last-commit-before-deletion>:client/src/engine/arcadeScoring.ts
```
