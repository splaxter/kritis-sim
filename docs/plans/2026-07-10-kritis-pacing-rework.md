# KRITIS Pacing Rework Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Break the "120 identical single-card days" monotony of long runs (esp. KRITIS, 24 weeks) with quiet-day fast-forward, week-end recaps and category rotation — plus content fixes: second choices for single-choice flavor events and a D1 scenario tier.

**Architecture:** All new pacing logic lives in a new pure engine module `client/src/engine/pacingEngine.ts` (same state-in/state-out style as `eventEngine.ts`/`gameState.ts`); `useGame.ts` gets a small interstitial state machine; `App.tsx` only triggers + renders. Per-mode opt-in via a new `features.pacing` block in `shared/src/config/gameModes.ts`, so story/learning modes are structurally untouched. Content fixes are pure data edits guarded by new audit tests.

**Tech Stack:** TypeScript monorepo (npm workspaces), React 18 client, vitest (jsdom, run via `npm run test:client -- <file>` from repo root), `@kritis/shared` aliased to `shared/src` in `client/vitest.config.ts`.

---

## Research findings this plan relies on (verified 2026-07-10)

- **Day loop:** `advanceDay` in `client/src/engine/gameState.ts:127-148`. Stress decay: `PER_DAY_STRESS_DECAY = 4` every day + `WEEKEND_STRESS_BONUS = 4` on rollover, both × `stressDecayRate` (lines 118-125 document the burnout-balance bug: event stress income is ~12-30/week, decay is tuned at the margin). **Any multi-day skip must therefore be implemented as N literal `advanceDay` calls** — this makes the stress curve for skipped days *exactly identical* to playing them idle, provable by test.
- **One-card-per-day serving:** `App.tsx:243-321`. Scenario gate `Math.min(0.5, 0.1 + (week-1)*0.05)` at `App.tsx:296-298` (duplicated hash logic in `App.tsx:323-331`, `scenarioEngine.ts:191-199`, `eventEngine.ts:215-223`, `kritisLatePacing.test.ts:83-88` — DRY opportunity). Event fallback via `selectNextEvent` at `App.tsx:310`.
- **`selectNextEvent`:** `eventEngine.ts:79-150`. Priority 1 = activated chain events (weekly throttle); Priority 2 = hash pick `hash % pool.length` (lines 145-149), seeded by `seed + week + day + completedEvents.length`. Existing anti-clustering precedent: `MAX_CONSECUTIVE_GUI = 2` (lines 134-143) — the category-rotation penalty follows the same pattern but as a *weighted* deterministic pick (pattern already exists in `selectNextScenario`, `scenarioEngine.ts:51-83`).
- **Mode config:** `shared/src/config/gameModes.ts` (`GAME_MODES`), types in `shared/src/types/gameMode.ts:44-48` (`GameModeFeatures` has precedent for optional feature flags: `cliOnly?`). Mode ids: `beginner | learning | story | kritis | intermediate | hard` — **"Standard" is `intermediate`**.
- **Week rollover UI hook point:** `useGame.ts` — `continueGame` (lines 340-360) and `skipToNextDay` (lines 362-373) both call `advanceDay` + `checkGameOver`. Phases: `'menu' | 'playing' | 'terminal' | 'result' | 'gameover' | 'storyEnding'` (line 23).
- **Run summary:** `client/src/engine/runSummary.ts` — `buildRunSummary` is pure; exports reusable `StatDelta<K>` (lines 18-23). `DecisionRecord` records `week`/`day` per decision (`shared/src/types/gameState.ts:14-21`) → "events resolved this week" is derivable. Stat deltas per week are NOT derivable from existing state → new optional `weekStart` snapshot needed.
- **Audit tests (the contract, all must stay green):**
  - `client/src/engine/skillBalanceAudit.test.ts` — GUI skill budget only; unaffected by this plan.
  - `client/src/engine/flowBalanceAudit.test.ts` — card-kind distribution; guard = no `__continue__` synthesis; classifies single-choice non-hands-on as `flavor` (line 19). New second choices move events `flavor → decision`; no numeric guard on that tally, safe.
  - `client/src/engine/campaignPacing.test.ts` — story-mode walk over authored chapters using `advanceDay` directly. Structural changes must keep it green (they do: story mode is opted out).
  - `client/src/engine/kritisLatePacing.test.ts` — static pool guards + 40-seed 24-week simulation replicating App's serving loop; calls `selectNextEvent` directly, so category rotation flows through automatically. Guard: zero dead days in weeks 13-24.
  - `client/src/engine/chainPacingAudit.test.ts`, `chainThrottle.test.ts`, `chainFlowDensity.test.ts` — chain throttle invariants; untouched by rotation (Priority 1 path unchanged).
  - `client/src/content/packs/packs.test.ts` — scenario contract: required fields, valid category/urgency/outcome, ≥1 PERFECT/PERFECT_ALTERNATIVE/SUCCESS outcome (lines 270-278), lessons > 10 chars, `realWorldReference` > 10 chars (lines 280-294), `involvedNpcs` must resolve to real contacts (lines 256-268), first terminal hint must not leak a solution (lines 345-372; only applies if `terminalContext` present — **new D1 scenarios are deliberately choice-only**, no terminalContext, so VFS/hint guards stay trivially green).
  - `client/src/content/content.test.ts` — ID uniqueness, prerequisite resolution, required fields.
- **Single-choice events (probe over `allEvents`, 252 events):** 14 real flavor events (all in `client/src/content/events/story/random-events.ts`), 4 single-choice chain payoffs (`story-week7-10.ts:260,327`, `story-week9-12.ts:256,357`), 4 beginner terminal tutorials (`evt_tutorial_*` — excluded: single-choice is fine for tutorials), 31 learning levels (`learn_*`, `gui_*`, `blk_*` — excluded: hands-on levels where the single choice opens the terminal/GUI, classified `hands-on` by flowBalanceAudit).
- **Scenario difficulty distribution:** D1: **0**, D2: 9, D3: 20, D4: 10, D5: 3. `getAvailableScenarios` (`scenarioEngine.ts:11-48`) caps early game at `min(2, modeMax)` → D1 scenarios are served from week 1 in every mode.
- **Test command (verified working):** `npm run test:client -- src/engine/gameState.test.ts` (prebuilds shared, but vitest aliases `@kritis/shared` → `shared/src`, so shared/src edits are picked up directly).

## Design decisions (locked)

1. **Quiet-day trigger lives in the engine** (`planQuietDaySkip` in `pacingEngine.ts`), App only calls it and renders. Conditions (all must hold): mode has `features.pacing.quietDayCompression`; not story mode; `currentDay <= 3` (a skip never crosses the weekend rollover, so it never collides with the week recap); at most **one skip per week** (`state.lastQuietSkipWeek`); the scenario roll for today would NOT fire; no activated chain event is waiting; `selectNextEvent` would serve a *quiet* event. Skip length is fixed at 2 days (YAGNI; the type carries `days` so 3 is a config change later).
2. **"Quiet" classification** is data-driven, not an id list: category ∈ {absurd, support, personal}, not a chain event, no terminal/GUI context, no chainTriggers/setsFlags/triggersEvent on any choice, and all choice effects small (|stress| ≤ 8, |compliance| ≤ 5, |budget| ≤ 1000, Σ|skills| ≤ 3, Σ|relationships| ≤ 5).
3. **Skip = N × `advanceDay`, zero extra numeric effects.** The interstitial is flavor text only. This is the balance-equivalence guarantee: stress after a skip ≡ stress after playing those days with zero-effect choices. (The only run-level difference: 2 low-stakes event resolutions don't happen — their effects are capped at ±8 stress by the quiet classifier, and a simulation test bounds the divergence.)
4. **Quiet days are not marked completed** — the un-served filler event stays in the pool; the per-week throttle prevents skip-chaining.
5. **Week recap is built from the pre-rollover state** + a `weekStart` snapshot written by `advanceDay` on rollover (old saves without the snapshot degrade to a recap without deltas — autosave envelope version stays 1, both new `GameState` fields are optional).
6. **Interstitial state lives in `useGame`** as `interstitial: Interstitial | null`, not a new phase — phase stays `'playing'`, the content-selection effect simply refuses to serve while an interstitial is pending. Quiet-day state application happens on *dismiss*, so an autosave taken mid-interstitial resumes by deterministically re-planning the same skip.
7. **Story mode is a non-goal.** Its serving path (`App.tsx:246-280`) returns before the pacing hook; `planQuietDaySkip` additionally hard-returns `null` for `isStoryMode`; config has pacing off; a guard test pins all three.

---

## Task 1: Per-mode pacing config (`features.pacing`)

**Files:**
- Modify: `shared/src/types/gameMode.ts` (extend `GameModeFeatures`, lines 44-48)
- Modify: `shared/src/config/gameModes.ts` (add `pacing` to each mode's `features`, lines 39-41, 74-77, 110-112, 145-147, 180-182, 215-217)
- Test: Create `client/src/engine/pacingConfig.test.ts`

**Steps:**

1. Write the failing test:

```ts
// client/src/engine/pacingConfig.test.ts
import { describe, it, expect } from 'vitest';
import { getGameModeConfig, GameModeId } from '@kritis/shared';

const ALL_MODES: GameModeId[] = ['beginner', 'learning', 'story', 'kritis', 'intermediate', 'hard'];

describe('pacing feature flags', () => {
  it('quiet-day compression is ON for the long/standard runs and OFF for guided modes', () => {
    expect(getGameModeConfig('kritis').features.pacing?.quietDayCompression).toBe(true);
    expect(getGameModeConfig('intermediate').features.pacing?.quietDayCompression).toBe(true);
    expect(getGameModeConfig('hard').features.pacing?.quietDayCompression).toBe(true);
    // NON-GOAL guards: beat-driven / tutorial modes are untouched.
    expect(getGameModeConfig('story').features.pacing?.quietDayCompression ?? false).toBe(false);
    expect(getGameModeConfig('beginner').features.pacing?.quietDayCompression ?? false).toBe(false);
    expect(getGameModeConfig('learning').features.pacing?.quietDayCompression ?? false).toBe(false);
  });

  it('week recap is ON for every day-loop mode, OFF for story and learning', () => {
    for (const m of ['beginner', 'intermediate', 'hard', 'kritis'] as GameModeId[]) {
      expect(getGameModeConfig(m).features.pacing?.weekRecap, m).toBe(true);
    }
    expect(getGameModeConfig('story').features.pacing?.weekRecap ?? false).toBe(false);
    expect(getGameModeConfig('learning').features.pacing?.weekRecap ?? false).toBe(false);
  });

  it('every mode declares pacing explicitly (no accidental undefined)', () => {
    for (const m of ALL_MODES) {
      expect(getGameModeConfig(m).features.pacing, m).toBeDefined();
    }
  });
});
```

2. Run → fail: `npm run test:client -- src/engine/pacingConfig.test.ts`
3. Implement. In `shared/src/types/gameMode.ts` extend `GameModeFeatures`:

```ts
export interface GameModePacing {
  /** Compress low-stakes filler days into a "Ruhige Tage" interstitial. */
  quietDayCompression: boolean;
  /** Show a compact week recap at each week rollover. */
  weekRecap: boolean;
}

export interface GameModeFeatures {
  showHints: boolean;
  /** If true, only show events with terminalContext (CLI-only mode) */
  cliOnly?: boolean;
  /** Pacing interstitials (quiet-day fast-forward, week recap). */
  pacing?: GameModePacing;
}
```

In `shared/src/config/gameModes.ts`, add to each `features` block:

| mode | quietDayCompression | weekRecap |
|---|---|---|
| beginner | `false` | `true` |
| learning | `false` | `false` |
| intermediate | `true` | `true` |
| hard | `true` | `true` |
| kritis | `true` | `true` |
| story | `false` | `false` |

e.g. for kritis (lines 180-182):

```ts
    features: {
      showHints: false,
      pacing: { quietDayCompression: true, weekRecap: true },
    },
```

4. Run → pass. Also run `npm run test:client -- src/engine/gameState.test.ts` (uses mode config heavily).
5. Commit: `feat(pacing): per-mode pacing feature flags (quiet-day compression, week recap)`

## Task 2: Shared hash util + `wouldServeScenario` + quiet-event classifier

**Files:**
- Create: `client/src/engine/hash.ts`
- Create: `client/src/engine/pacingEngine.ts`
- Test: Create `client/src/engine/pacingEngine.test.ts`
- Modify (DRY, mechanical): `client/src/engine/eventEngine.ts:215-223`, `client/src/engine/scenarioEngine.ts:191-199` — delete local `simpleHash`, import from `./hash`. (Leave `App.tsx`'s copy until Task 6, `kritisLatePacing.test.ts`'s copy stays — it intentionally replicates the app loop.)

**Steps:**

1. Failing test:

```ts
// client/src/engine/pacingEngine.test.ts
import { describe, it, expect } from 'vitest';
import { GameEvent } from '@kritis/shared';
import { createInitialState } from './gameState';
import { isQuietEvent, wouldServeScenario } from './pacingEngine';
import { simpleHash } from './hash';

const base = (over: Partial<GameEvent>): GameEvent => ({
  id: 'evt_x', weekRange: [1, 12], probability: 1, category: 'absurd',
  title: 't', description: 'd', involvedCharacters: [], tags: [],
  choices: [{ id: 'a', text: 'a', effects: { stress: 3 }, resultText: 'r' }],
  ...over,
});

describe('isQuietEvent', () => {
  it('accepts small absurd/support/personal filler', () => {
    expect(isQuietEvent(base({ category: 'absurd' }))).toBe(true);
    expect(isQuietEvent(base({ category: 'support' }))).toBe(true);
    expect(isQuietEvent(base({ category: 'personal' }))).toBe(true);
  });
  it('rejects serious categories, chain events and hands-on levels', () => {
    expect(isQuietEvent(base({ category: 'crisis' }))).toBe(false);
    expect(isQuietEvent(base({ category: 'security' }))).toBe(false);
    expect(isQuietEvent(base({ isChainEvent: true }))).toBe(false);
    expect(isQuietEvent(base({ terminalContext: {} as never }))).toBe(false);
    expect(isQuietEvent(base({ guiContext: {} as never }))).toBe(false);
  });
  it('rejects big effects and plot-relevant choices', () => {
    expect(isQuietEvent(base({ choices: [{ id: 'a', text: 'a', effects: { stress: 10 }, resultText: 'r' }] }))).toBe(false);
    expect(isQuietEvent(base({ choices: [{ id: 'a', text: 'a', effects: {}, resultText: 'r', setsFlags: ['f'] }] }))).toBe(false);
    expect(isQuietEvent(base({ choices: [{ id: 'a', text: 'a', effects: {}, resultText: 'r', chainTriggers: [{ targetEventId: 'x', delayWeeks: 1 }] }] }))).toBe(false);
  });
});

describe('wouldServeScenario', () => {
  it('replicates the App gate bit-for-bit', () => {
    const state = { ...createInitialState('SEED-A', 'kritis'), currentWeek: 7, currentDay: 2 };
    const chance = Math.min(0.5, 0.1 + (state.currentWeek - 1) * 0.05);
    const h = simpleHash(state.seed + state.currentWeek + state.currentDay + state.completedEvents.length);
    expect(wouldServeScenario(state, state.seed)).toBe((h % 100) < chance * 100);
  });
  it('is deterministic', () => {
    const state = createInitialState('SEED-B', 'intermediate');
    expect(wouldServeScenario(state, state.seed)).toBe(wouldServeScenario(state, state.seed));
  });
});
```

2. Run → fail (module missing): `npm run test:client -- src/engine/pacingEngine.test.ts`
3. Implement `client/src/engine/hash.ts` (move the identical function from `eventEngine.ts:215-223`):

```ts
/** Deterministic 32-bit string hash shared by all seeded content picks. */
export function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}
```

`client/src/engine/pacingEngine.ts` (first slice):

```ts
/**
 * Pacing engine — quiet-day fast-forward + week recap. Pure functions only:
 * same (state, events, seed) → same plan/recap. UI lives in App/components.
 */
import { GameEvent, GameState, EventCategory, getGameModeConfig } from '@kritis/shared';
import { simpleHash } from './hash';

const QUIET_CATEGORIES: ReadonlySet<EventCategory> = new Set(['absurd', 'support', 'personal']);

/** A day is compressible only if the event it would serve is low-stakes filler. */
export function isQuietEvent(e: GameEvent): boolean {
  if (e.isChainEvent || e.terminalContext || e.guiContext) return false;
  if (!QUIET_CATEGORIES.has(e.category)) return false;
  if (e.chainTriggers?.length) return false;
  return (e.choices ?? []).every((c) => {
    if (c.chainTriggers?.length || c.setsFlags?.length || c.triggersEvent) return false;
    const ef = c.effects ?? {};
    const skillSum = Object.values(ef.skills ?? {}).reduce((a, b) => a + Math.abs(b ?? 0), 0);
    const relSum = Object.values(ef.relationships ?? {}).reduce((a, b) => a + Math.abs(b ?? 0), 0);
    return (
      Math.abs(ef.stress ?? 0) <= 8 &&
      Math.abs(ef.compliance ?? 0) <= 5 &&
      Math.abs(ef.budget ?? 0) <= 1000 &&
      skillSum <= 3 && relSum <= 5
    );
  });
}

/** The App's scenario-day gate, extracted verbatim (was App.tsx:296-298). */
export function wouldServeScenario(state: GameState, seed: string): boolean {
  const scenarioChance = Math.min(0.5, 0.1 + (state.currentWeek - 1) * 0.05);
  const hash = simpleHash(seed + state.currentWeek + state.currentDay + state.completedEvents.length);
  return (hash % 100) < scenarioChance * 100;
}
```

Swap `eventEngine.ts` and `scenarioEngine.ts` to `import { simpleHash } from './hash';` and delete their private copies.

4. Run → pass, plus regression: `npm run test:client -- src/engine/pacingEngine.test.ts src/engine/eventEngine.test.ts src/engine/scenarioEngine.test.ts src/engine/kritisLatePacing.test.ts`
5. Commit: `feat(pacing): quiet-event classifier + shared seeded hash (DRY scenario gate)`

## Task 3: `planQuietDaySkip` + `applyQuietDays` (stress-curve equivalence)

**Files:**
- Modify: `shared/src/types/gameState.ts` (add optional field after `mentorModeEnabled?`, line 57)
- Modify: `client/src/engine/pacingEngine.ts`
- Test: Extend `client/src/engine/pacingEngine.test.ts`

**Steps:**

1. Failing tests (append to `pacingEngine.test.ts`):

```ts
import { advanceDay } from './gameState';
import { planQuietDaySkip, applyQuietDays } from './pacingEngine';
import { allEvents } from '../content/events';

// A pool that guarantees a quiet pick: one always-available quiet filler.
const quietPool: GameEvent[] = [base({ id: 'evt_quiet_1', weekRange: [1, 24] })];

function kritisState(over: Partial<ReturnType<typeof createInitialState>> = {}) {
  return { ...createInitialState('QUIET-SEED', 'kritis'), flags: { kritis_mode: true }, ...over };
}

describe('planQuietDaySkip', () => {
  it('plans a 2-day skip on a quiet, scenario-free, chain-free early-week day', () => {
    // Find a (seed, day) whose scenario roll is off — deterministic search keeps the test seed-stable.
    let state = kritisState({ currentWeek: 2, currentDay: 1 });
    while (wouldServeScenario(state, state.seed) || state.currentDay > 3) {
      state = { ...state, currentDay: state.currentDay + 1 };
      if (state.currentDay > 3) { state = { ...state, currentWeek: state.currentWeek + 1, currentDay: 1 }; }
    }
    const plan = planQuietDaySkip(quietPool, state, state.seed);
    expect(plan).not.toBeNull();
    expect(plan!.days).toBe(2);
    expect(plan!.week).toBe(state.currentWeek);
    expect(plan!.summary).toMatch(/Montag|Dienstag|Mittwoch|Donnerstag/);
  });

  it('never plans in story/learning/beginner mode (NON-GOAL guard)', () => {
    for (const mode of ['story', 'learning', 'beginner'] as const) {
      const s = { ...createInitialState('QUIET-SEED', mode), currentWeek: 2, currentDay: 1 };
      expect(planQuietDaySkip(quietPool, s, s.seed), mode).toBeNull();
    }
  });

  it('never plans on day 4/5 (skip must not cross the weekend rollover)', () => {
    expect(planQuietDaySkip(quietPool, kritisState({ currentWeek: 2, currentDay: 4 }), 'QUIET-SEED')).toBeNull();
    expect(planQuietDaySkip(quietPool, kritisState({ currentWeek: 2, currentDay: 5 }), 'QUIET-SEED')).toBeNull();
  });

  it('at most one skip per week', () => {
    const s = kritisState({ currentWeek: 2, currentDay: 1, lastQuietSkipWeek: 2 });
    expect(planQuietDaySkip(quietPool, s, s.seed)).toBeNull();
  });

  it('never plans while a chain consequence is activatable', () => {
    const s = kritisState({
      currentWeek: 9, currentDay: 1,
      pendingChainEvents: [{ eventId: 'evt_weekend_hero', availableWeek: 9, sourceEventId: 'x', sourceChoiceId: 'y', triggeredAt: { week: 8, day: 2 } }],
    });
    expect(planQuietDaySkip(allEvents, s, s.seed)).toBeNull();
  });

  it('never plans when the day would serve a non-quiet event', () => {
    const loudPool = [base({ id: 'evt_loud', category: 'crisis', weekRange: [1, 24] })];
    expect(planQuietDaySkip(loudPool, kritisState({ currentWeek: 2, currentDay: 1 }), 'QUIET-SEED')).toBeNull();
  });

  it('is deterministic: same state+seed → identical plan', () => {
    const s = kritisState({ currentWeek: 2, currentDay: 1 });
    expect(planQuietDaySkip(quietPool, s, s.seed)).toEqual(planQuietDaySkip(quietPool, s, s.seed));
  });
});

describe('applyQuietDays — stress-curve equivalence', () => {
  it('skipping N days ≡ N advanceDay calls (decay applied per skipped day)', () => {
    const s = kritisState({ currentWeek: 3, currentDay: 2, stress: 60 });
    const plan = { days: 2, fromDay: 2, toDay: 3, week: 3, summary: 'x' };
    const skipped = applyQuietDays(s, plan);
    const manual = advanceDay(advanceDay(s));
    expect(skipped.stress).toBe(manual.stress);
    expect(skipped.currentDay).toBe(manual.currentDay);
    expect(skipped.currentWeek).toBe(manual.currentWeek);
    // Identical apart from the throttle marker:
    expect({ ...skipped, lastQuietSkipWeek: undefined }).toEqual({ ...manual, lastQuietSkipWeek: undefined });
  });

  it('records the per-week throttle marker', () => {
    const s = kritisState({ currentWeek: 3, currentDay: 2 });
    expect(applyQuietDays(s, { days: 2, fromDay: 2, toDay: 3, week: 3, summary: 'x' }).lastQuietSkipWeek).toBe(3);
  });
});
```

2. Run → fail: `npm run test:client -- src/engine/pacingEngine.test.ts`
3. Implement. `shared/src/types/gameState.ts` (after line 57):

```ts
  // Pacing: week of the last quiet-day fast-forward (throttle: one per week)
  lastQuietSkipWeek?: number;
```

`pacingEngine.ts` additions:

```ts
import { getActivatedChainEvents } from './chainEngine';
import { selectNextEvent } from './eventEngine';
import { advanceDay } from './gameState';

export interface QuietDaysPlan {
  days: number;      // fixed at 2 for now
  fromDay: number;   // first skipped day (the current day)
  toDay: number;     // last skipped day; toDay <= 5 guaranteed by planQuietDaySkip
  week: number;
  summary: string;   // German interstitial copy, deterministic from seed
}

const WEEKDAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
const QUIET_SUMMARIES = [
  'Routine. Backups liefen, niemand hat den Serverraum angezündet.',
  'Zwei Tage ohne Eskalation. Du dokumentierst sogar etwas. Freiwillig.',
  'Tickets kommen, Tickets gehen. Der Drucker im 2. OG bleibt still — verdächtig still.',
  'Nichts brennt. Bjorg erzählt zweimal denselben Witz. Du überlebst beides.',
];

const SKIP_DAYS = 2;

export function planQuietDaySkip(
  events: GameEvent[],
  state: GameState,
  seed: string
): QuietDaysPlan | null {
  const features = getGameModeConfig(state.gameMode).features;
  if (!features.pacing?.quietDayCompression) return null;
  if (state.isStoryMode) return null; // belt & braces on top of config
  if (state.currentDay > 5 - SKIP_DAYS) return null; // never cross the rollover
  if (state.lastQuietSkipWeek === state.currentWeek) return null; // 1/week throttle
  if (wouldServeScenario(state, seed)) return null; // a real scenario is due today
  if (getActivatedChainEvents(state, events).length > 0) return null; // consequences first
  const next = selectNextEvent(events, state, seed);
  if (!next || !isQuietEvent(next)) return null;

  const fromDay = state.currentDay;
  const toDay = fromDay + SKIP_DAYS - 1;
  const flavor = QUIET_SUMMARIES[simpleHash(seed + state.currentWeek + fromDay) % QUIET_SUMMARIES.length];
  return {
    days: SKIP_DAYS,
    fromDay,
    toDay,
    week: state.currentWeek,
    summary: `${WEEKDAYS[fromDay - 1]}–${WEEKDAYS[toDay - 1]}: ${flavor}`,
  };
}

/**
 * Applies a quiet-day skip. IMPORTANT (balance contract): the skip is exactly
 * `plan.days` × advanceDay — passive stress decay (+4/day × mode rate, see
 * gameState.ts:118-125) is applied per skipped day, so the stress curve is
 * identical to idling through those days. No other numeric effects.
 */
export function applyQuietDays(state: GameState, plan: QuietDaysPlan): GameState {
  let s = state;
  for (let i = 0; i < plan.days; i++) s = advanceDay(s);
  return { ...s, lastQuietSkipWeek: plan.week };
}
```

4. Run → pass. Regression: `npm run test:client -- src/engine/gameState.test.ts src/engine/chainThrottle.test.ts`
5. Commit: `feat(pacing): engine-pure quiet-day skip plan + decay-equivalent multi-day apply`

## Task 4: `weekStart` snapshot + `buildWeekRecap`

**Files:**
- Modify: `shared/src/types/gameState.ts` (second optional field)
- Modify: `client/src/engine/gameState.ts` — `createInitialState` (return object, lines 15-57) and `advanceDay` (rollover branch, lines 138-146)
- Modify: `client/src/engine/pacingEngine.ts`
- Test: Extend `client/src/engine/pacingEngine.test.ts`; extend `client/src/engine/gameState.test.ts` (`advanceDay` describe block, lines 543-628)

**Steps:**

1. Failing tests:

```ts
// gameState.test.ts, inside describe('advanceDay')
it('writes a weekStart snapshot on rollover (for the week recap)', () => {
  const state = createGameState({ currentWeek: 1, currentDay: 5, stress: 30, budget: 9000, compliance: 55 });
  const newState = advanceDay(state);
  expect(newState.weekStart).toEqual({
    week: 2,
    stress: newState.stress, // post-decay value: the new week starts here
    budget: 9000,
    compliance: 55,
  });
});
it('does not touch weekStart mid-week', () => {
  const state = createGameState({ currentWeek: 2, currentDay: 2, weekStart: { week: 2, stress: 20, budget: 1, compliance: 2 } });
  expect(advanceDay(state).weekStart).toEqual(state.weekStart);
});
```

```ts
// pacingEngine.test.ts
import { buildWeekRecap } from './pacingEngine';

describe('buildWeekRecap', () => {
  it('aggregates the closing week: decisions, event ids, open chains, stat deltas', () => {
    const s = {
      ...kritisState({ currentWeek: 3, currentDay: 5, stress: 44, budget: 9000, compliance: 48 }),
      weekStart: { week: 3, stress: 50, budget: 10000, compliance: 45 },
      decisions: [
        { eventId: 'evt_a', choiceIndex: 0, choiceId: 'x', week: 2, day: 1, tags: [] },
        { eventId: 'evt_b', choiceIndex: 0, choiceId: 'x', week: 3, day: 1, tags: [] },
        { eventId: 'evt_c', choiceIndex: 1, choiceId: 'y', week: 3, day: 4, tags: [] },
      ],
      pendingChainEvents: [{ eventId: 'evt_weekend_hero', availableWeek: 9, sourceEventId: 'a', sourceChoiceId: 'b', triggeredAt: { week: 3, day: 1 } }],
    };
    const recap = buildWeekRecap(s);
    expect(recap.week).toBe(3);
    expect(recap.eventIdsThisWeek).toEqual(['evt_b', 'evt_c']);
    expect(recap.openChains).toBe(1);
    expect(recap.deltas).toEqual({
      stress: { key: 'stress', start: 50, end: 44, delta: -6 },
      budget: { key: 'budget', start: 10000, end: 9000, delta: -1000 },
      compliance: { key: 'compliance', start: 45, end: 48, delta: 3 },
    });
  });

  it('degrades gracefully without a snapshot (old saves): deltas are null', () => {
    const s = { ...kritisState({ currentWeek: 3, currentDay: 5 }), weekStart: undefined };
    expect(buildWeekRecap(s).deltas).toBeNull();
  });
});
```

2. Run → fail: `npm run test:client -- src/engine/pacingEngine.test.ts src/engine/gameState.test.ts`
3. Implement. `shared/src/types/gameState.ts`:

```ts
  // Pacing: stats at the start of the current week (written by advanceDay on
  // rollover; optional so pre-existing saves keep loading — recap then omits deltas)
  weekStart?: { week: number; stress: number; budget: number; compliance: number };
```

`gameState.ts` — in `createInitialState`'s returned object add:

```ts
    weekStart: { week: 1, stress: config.startingStats.stress, budget: config.startingStats.budget, compliance: config.startingStats.compliance },
```

In `advanceDay`'s rollover branch (lines 138-146):

```ts
  if (isWeekend) {
    // Weekend - advance to next week
    return {
      ...state,
      currentDay: 1,
      currentWeek: state.currentWeek + 1,
      stress: newStress,
      weekStart: { week: state.currentWeek + 1, stress: newStress, budget: state.budget, compliance: state.compliance },
    };
  }
```

`pacingEngine.ts` — reuse `StatDelta` from `runSummary.ts` (already exported):

```ts
import { StatDelta } from './runSummary';

export interface WeekRecap {
  week: number;
  eventIdsThisWeek: string[]; // resolve titles in the UI via getEventById
  openChains: number;
  deltas: {
    stress: StatDelta<'stress'>;
    budget: StatDelta<'budget'>;
    compliance: StatDelta<'compliance'>;
  } | null;
}

/** Build the recap from the PRE-rollover state (week W, day 5). Pure. */
export function buildWeekRecap(state: GameState): WeekRecap {
  const ws = state.weekStart?.week === state.currentWeek ? state.weekStart : undefined;
  const delta = <K extends string>(key: K, start: number, end: number): StatDelta<K> =>
    ({ key, start, end, delta: end - start });
  return {
    week: state.currentWeek,
    eventIdsThisWeek: state.decisions.filter((d) => d.week === state.currentWeek).map((d) => d.eventId),
    openChains: state.pendingChainEvents.length,
    deltas: ws
      ? {
          stress: delta('stress', ws.stress, state.stress),
          budget: delta('budget', ws.budget, state.budget),
          compliance: delta('compliance', ws.compliance, state.compliance),
        }
      : null,
  };
}
```

4. Run → pass. Regression (advanceDay is used by every sim): `npm run test:client -- src/engine/campaignPacing.test.ts src/engine/kritisLatePacing.test.ts src/engine/autosave.test.ts`
5. Commit: `feat(pacing): weekStart snapshot + pure week recap builder`

## Task 5: `useGame` interstitial state machine

**Files:**
- Modify: `client/src/hooks/useGame.ts` (phases at line 23 unchanged; `continueGame` 340-360, `skipToNextDay` 362-373; new state + actions)
- Test: Create `client/src/hooks/useGame.pacing.test.tsx`

**Steps:**

1. Failing test (renderHook, mirrors the existing `useGame.skillgain.browser.test.tsx` style):

```tsx
// client/src/hooks/useGame.pacing.test.tsx
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGame } from './useGame';
import { QuietDaysPlan } from '../engine/pacingEngine';

describe('useGame pacing interstitials', () => {
  it('startQuietDays parks an interstitial; dismiss applies exactly plan.days advanceDay calls', () => {
    const { result } = renderHook(() => useGame());
    act(() => result.current.startNewGame('PACE-SEED', 'kritis'));
    const stressBefore = result.current.state.stress;
    const plan: QuietDaysPlan = { days: 2, fromDay: 1, toDay: 2, week: 1, summary: 'Montag–Dienstag: Routine.' };

    act(() => result.current.startQuietDays(plan));
    expect(result.current.interstitial).toEqual({ kind: 'quietDays', plan });
    expect(result.current.state.currentDay).toBe(1); // nothing applied yet

    act(() => result.current.dismissInterstitial());
    expect(result.current.interstitial).toBeNull();
    expect(result.current.state.currentDay).toBe(3);
    expect(result.current.state.currentWeek).toBe(1);
    // kritis stressDecayRate 1.2 → round(4*1.2)=5 per day, 2 days = 10
    expect(result.current.state.stress).toBe(Math.max(0, stressBefore - 10));
    expect(result.current.state.lastQuietSkipWeek).toBe(1);
  });

  it('continueGame on day 5 queues a weekRecap interstitial (kritis: weekRecap on)', () => {
    const { result } = renderHook(() => useGame());
    act(() => result.current.startNewGame('PACE-SEED', 'kritis'));
    // walk to day 5 via skipToNextDay (no recap while weekRecap days are mid-week)
    for (let i = 0; i < 4; i++) act(() => result.current.skipToNextDay());
    expect(result.current.state.currentDay).toBe(5);
    act(() => result.current.continueGame());
    expect(result.current.state.currentWeek).toBe(2);
    expect(result.current.interstitial?.kind).toBe('weekRecap');
    act(() => result.current.dismissInterstitial());
    expect(result.current.interstitial).toBeNull();
  });

  it('story mode never queues interstitials', () => {
    const { result } = renderHook(() => useGame());
    act(() => result.current.startNewGame('PACE-SEED', 'story'));
    for (let i = 0; i < 5; i++) act(() => result.current.skipToNextDay());
    expect(result.current.state.currentWeek).toBe(2);
    expect(result.current.interstitial).toBeNull();
  });
});
```

2. Run → fail: `npm run test:client -- src/hooks/useGame.pacing.test.tsx`
3. Implement in `useGame.ts`:

```ts
import { QuietDaysPlan, WeekRecap, applyQuietDays, buildWeekRecap } from '../engine/pacingEngine';
import { getGameModeConfig } from '@kritis/shared'; // extend existing import

export type Interstitial =
  | { kind: 'quietDays'; plan: QuietDaysPlan }
  | { kind: 'weekRecap'; recap: WeekRecap };
```

Add state + actions inside the hook:

```ts
const [interstitial, setInterstitial] = useState<Interstitial | null>(null);

// Single day-advance path shared by continueGame / skipToNextDay: advances the
// day, runs game-over, and queues the week recap when the week rolls over
// (built from the PRE-rollover state; gated per mode; suppressed on game over).
const advanceOneDay = useCallback((prev: GameState): GameState => {
  const newState = advanceDay(prev);
  const gameOver = checkGameOver(newState);
  if (gameOver.isOver) {
    setGameOverReason(gameOver.reason || null);
    setPhase('gameover');
    return newState;
  }
  const pacing = getGameModeConfig(prev.gameMode).features.pacing;
  if (newState.currentWeek > prev.currentWeek && pacing?.weekRecap) {
    setInterstitial({ kind: 'weekRecap', recap: buildWeekRecap(prev) });
  }
  return newState;
}, []);

const startQuietDays = useCallback((plan: QuietDaysPlan) => {
  setInterstitial({ kind: 'quietDays', plan });
}, []);

const dismissInterstitial = useCallback(() => {
  setInterstitial((current) => {
    if (current?.kind === 'quietDays') {
      setState((prev) => {
        const skipped = applyQuietDays(prev, current.plan);
        const gameOver = checkGameOver(skipped); // defensive; decay-only can't burn out
        if (gameOver.isOver) {
          setGameOverReason(gameOver.reason || null);
          setPhase('gameover');
        }
        return skipped;
      });
    }
    return null;
  });
}, []);
```

Refactor `continueGame` (line 340) and `skipToNextDay` (line 363) to use `advanceOneDay(prev)` instead of their inline `advanceDay`+`checkGameOver` blocks (behaviour identical plus recap queueing). Reset `interstitial` to `null` in `startNewGame` and `loadState`. Export `interstitial`, `startQuietDays`, `dismissInterstitial` in `UseGameReturn` and the returned object.

4. Run → pass: `npm run test:client -- src/hooks/useGame.pacing.test.tsx src/hooks/useGame.skillgain.browser.test.tsx src/hooks/useAutosave.browser.test.tsx`
5. Commit: `feat(pacing): interstitial state machine in useGame (quiet days, week recap)`

## Task 6: Interstitial UI + App wiring

**Files:**
- Create: `client/src/components/Interstitials/InterstitialScreen.tsx`
- Modify: `client/src/App.tsx` — content-selection effect (243-321: interstitial guard + quiet-day trigger + `wouldServeScenario` swap), delete now-unused local `simpleHash` (323-331), render branch before the final `GameScreen` return (~778)
- Test: Create `client/src/components/Interstitials/InterstitialScreen.test.tsx`

**Steps:**

1. Failing component test:

```tsx
// client/src/components/Interstitials/InterstitialScreen.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InterstitialScreen } from './InterstitialScreen';

const quiet = { kind: 'quietDays' as const, plan: { days: 2, fromDay: 3, toDay: 4, week: 6, summary: 'Mittwoch–Donnerstag: Routine. Backups liefen, niemand hat den Serverraum angezündet.' } };
const recap = { kind: 'weekRecap' as const, recap: { week: 6, eventIdsThisWeek: ['evt_random_toner'], openChains: 1, deltas: { stress: { key: 'stress' as const, start: 50, end: 44, delta: -6 }, budget: { key: 'budget' as const, start: 10000, end: 9000, delta: -1000 }, compliance: { key: 'compliance' as const, start: 45, end: 48, delta: 3 } } } };

describe('InterstitialScreen', () => {
  it('renders quiet days summary and continues on click', () => {
    const onContinue = vi.fn();
    render(<InterstitialScreen interstitial={quiet} onContinue={onContinue} />);
    expect(screen.getByText(/Ruhige Tage/i)).toBeInTheDocument();
    expect(screen.getByText(/Mittwoch–Donnerstag/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /weiter/i }));
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it('renders the week recap and continues on Enter (skippable)', () => {
    const onContinue = vi.fn();
    render(<InterstitialScreen interstitial={recap} onContinue={onContinue} />);
    expect(screen.getByText(/Woche 6/)).toBeInTheDocument();
    expect(screen.getByText(/Offene Konsequenzen: 1/)).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onContinue).toHaveBeenCalledOnce();
  });
});
```

2. Run → fail: `npm run test:client -- src/components/Interstitials/InterstitialScreen.test.tsx`
3. Implement `InterstitialScreen.tsx` (terminal-green house style; German copy; Enter/Space/tap all continue):

```tsx
import { useEffect } from 'react';
import { getEventById } from '../../content/events';
import type { Interstitial } from '../../hooks/useGame';

const fmt = (n: number) => (n > 0 ? `+${n}` : `${n}`);

export function InterstitialScreen({ interstitial, onContinue }: { interstitial: Interstitial; onContinue: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onContinue(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onContinue]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="border border-terminal-border p-8 max-w-xl w-full">
        {interstitial.kind === 'quietDays' ? (
          <>
            <div className="text-terminal-green-dim text-xs tracking-widest mb-2">RUHIGE TAGE</div>
            <p className="text-terminal-green leading-relaxed mb-6 whitespace-pre-line">{interstitial.plan.summary}</p>
            <p className="text-terminal-green-muted text-xs mb-6">Der Stress sinkt wie an normalen Tagen weiter.</p>
          </>
        ) : (
          <>
            <div className="text-terminal-green-dim text-xs tracking-widest mb-2">WOCHE {interstitial.recap.week} — BILANZ</div>
            <ul className="text-terminal-green text-sm space-y-1 mb-4">
              <li>Ereignisse entschieden: {interstitial.recap.eventIdsThisWeek.length}</li>
              {interstitial.recap.eventIdsThisWeek.slice(0, 4).map((id) => (
                <li key={id} className="text-terminal-green-dim pl-4">· {getEventById(id)?.title ?? id}</li>
              ))}
              <li>Offene Konsequenzen: {interstitial.recap.openChains}</li>
            </ul>
            {interstitial.recap.deltas && (
              <div className="text-terminal-green-dim text-sm mb-6">
                Stress {fmt(interstitial.recap.deltas.stress.delta)} · Budget {fmt(interstitial.recap.deltas.budget.delta)} € · Compliance {fmt(interstitial.recap.deltas.compliance.delta)}
              </div>
            )}
          </>
        )}
        <button onClick={onContinue} className="w-full p-3 border border-terminal-green hover:bg-terminal-bg-highlight">
          [ WEITER ]
        </button>
        <div className="text-terminal-green-muted text-xs mt-2 text-center">[Enter] Weiter</div>
      </div>
    </div>
  );
}
```

App wiring (`App.tsx`):
- Effect (line 243): extend the outer condition with `&& !game.interstitial` and add `game.interstitial` to the dependency array (line 321).
- In the standard-mode branch, replace the inline gate (296-298) with `wouldServeScenario(game.state, game.state.seed)` (import from `./engine/pacingEngine`) and delete the now-unused local `simpleHash` (323-331).
- Quiet-day trigger, inserted directly after the cliOnly early-return (line 290), before the scenario roll:

```ts
      // Quiet-day fast-forward: if today would just serve low-stakes filler,
      // compress it into a "Ruhige Tage" interstitial (engine decides; per-mode).
      const quietPlan = planQuietDaySkip(allEvents, game.state, game.state.seed);
      if (quietPlan) {
        game.startQuietDays(quietPlan);
        return;
      }
```

- Render branch, after the learning-hub early return (~line 776), before the final `GameScreen` return:

```tsx
  if (game.interstitial && game.phase === 'playing') {
    return (
      <>
        <StoryBackground />
        <InterstitialScreen interstitial={game.interstitial} onContinue={game.dismissInterstitial} />
      </>
    );
  }
```

4. Run → pass: `npm run test:client -- src/components/Interstitials/InterstitialScreen.test.tsx` then the touched suites: `npm run test:client -- src/hooks src/engine/pacingEngine.test.ts`. Manual sanity: `/verify` or `npm run dev` → new KRITIS run → play Monday, watch for "RUHIGE TAGE" on a filler day and the "WOCHE 1 — BILANZ" card after Friday.
5. Commit: `feat(pacing): quiet-day + week-recap interstitials wired into App`

## Task 7: Category-rotation penalty in `selectNextEvent`

**Files:**
- Modify: `client/src/engine/eventEngine.ts` (replace the plain hash pick, lines 145-149)
- Test: Extend `client/src/engine/eventEngine.test.ts`

**Steps:**

1. Failing tests (append inside the existing `selectNextEvent` describe; reuse the file's event-factory helpers):

```ts
describe('category rotation penalty', () => {
  const mk = (id: string, category: EventCategory): GameEvent => ({
    id, weekRange: [1, 12], probability: 1, category, title: id, description: 'd',
    involvedCharacters: [], tags: [], choices: [{ id: 'a', text: 'a', effects: {}, resultText: 'r' }],
  });
  const pool = [
    mk('evt_a1', 'absurd'), mk('evt_a2', 'absurd'), mk('evt_a3', 'absurd'),
    mk('evt_s1', 'security'), mk('evt_c1', 'compliance'), mk('evt_t1', 'team'),
  ];

  it('is deterministic for a fixed seed', () => {
    const state = { ...createInitialState('ROT-SEED', 'kritis'), flags: { kritis_mode: true } };
    expect(selectNextEvent(pool, state, 'ROT-SEED')?.id).toBe(selectNextEvent(pool, state, 'ROT-SEED')?.id);
  });

  it('down-weights the categories of the last two served events (never a 3rd repeat while alternatives exist)', () => {
    // Across many seeds: after two absurd events in a row, the pick is
    // never absurd again as long as other categories are available.
    for (let i = 0; i < 25; i++) {
      const state = {
        ...createInitialState(`ROT-${i}`, 'kritis'),
        flags: { kritis_mode: true },
        completedEvents: ['evt_a1', 'evt_a2'],
      };
      const picked = selectNextEvent(pool, state, `ROT-${i}`);
      expect(picked?.category, `seed ROT-${i}`).not.toBe('absurd');
    }
  });

  it('falls back gracefully when every remaining event shares the recent category', () => {
    const onlyAbsurd = [mk('evt_a1', 'absurd'), mk('evt_a2', 'absurd'), mk('evt_a3', 'absurd')];
    const state = {
      ...createInitialState('ROT-X', 'kritis'),
      flags: { kritis_mode: true },
      completedEvents: ['evt_a1', 'evt_a2'],
    };
    expect(selectNextEvent(onlyAbsurd, state, 'ROT-X')?.id).toBe('evt_a3');
  });
});
```

Note: the "never a 3rd repeat" test wants a hard guarantee — implement rotation as *filter-then-weighted-pick*: first prefer non-recent categories (like the GUI anti-clustering guard at lines 134-143), which gives the hard guarantee while `weights` keep variety among the remaining categories.

2. Run → fail: `npm run test:client -- src/engine/eventEngine.test.ts`
3. Implement — replace lines 145-149 of `eventEngine.ts`:

```ts
  // Category rotation: don't serve the same category three days in a row.
  // Look at the categories of the last CATEGORY_WINDOW completed events; if
  // BOTH match, prefer events from other categories while any exist (same
  // hard-guard pattern as the GUI anti-clustering above). Deterministic and
  // seed-stable: the pick below still uses the same seeded hash.
  const CATEGORY_WINDOW = 2;
  const recentCats = state.completedEvents
    .slice(-CATEGORY_WINDOW)
    .map((id) => byId.get(id)?.category)
    .filter((c): c is NonNullable<typeof c> => Boolean(c));
  if (recentCats.length === CATEGORY_WINDOW && recentCats.every((c) => c === recentCats[0])) {
    const fresh = pool.filter((e) => e.category !== recentCats[0]);
    if (fresh.length > 0) pool = fresh;
  }

  // Include completed events count so selection varies as you progress through a day
  const hashInput = seed + state.currentWeek + state.currentDay + state.completedEvents.length;
  const hash = simpleHash(hashInput);
  const index = hash % pool.length;
  return pool[index];
```

(Chain Priority-1 path, chain throttle and GUI guard are untouched; rotation only reshapes the Priority-2 pool. `byId` already exists at line 115.)

4. Run → pass, then the heavyweight contracts (rotation changes which events serve on which seeds — these must still hold): `npm run test:client -- src/engine/eventEngine.test.ts src/engine/kritisLatePacing.test.ts src/engine/chainPacingAudit.test.ts src/engine/chainFlowDensity.test.ts src/engine/chainThrottle.test.ts src/engine/sidequestFlow.test.ts src/engine/guiLearningIntegration.test.ts`
   - If `kritisLatePacing` finds a dead late-game day on some seed: the rotation filter can only shrink the pool when alternatives exist, so a dead day would indicate a bug in the filter (empty-pool fallback) — fix the filter, don't loosen the guard.
5. Commit: `feat(engine): category-rotation penalty in selectNextEvent (no 3rd same-category day)`

## Task 8: Compression-aware KRITIS pacing simulation + story guard

**Files:**
- Test: Create `client/src/engine/pacingSimulation.test.ts`

This is the balance-audit extension demanded by the stress-economy contract (`gameState.ts:118-125`, memory: careful=safe / normal=hovers / reckless=burns).

**Steps:**

1. Write the simulation test (it should pass immediately if Tasks 2-7 are correct — it is the *audit*, red only on regressions):

```ts
// client/src/engine/pacingSimulation.test.ts
import { describe, it, expect } from 'vitest';
import { GameState, getGameModeConfig } from '@kritis/shared';
import { allEvents } from '../content/events';
import { getAllScenarios } from '../content/packs';
import { createInitialState, advanceDay, applyEffects, checkGameOver } from './gameState';
import { selectNextEvent, getVisibleChoices } from './eventEngine';
import { selectNextScenario, calculateScenarioEffects } from './scenarioEngine';
import { recordDecision, scheduleChainEvents, cleanupPendingEvent } from './chainEngine';
import { planQuietDaySkip, applyQuietDays, wouldServeScenario } from './pacingEngine';
import { simpleHash } from './hash';

const allScenarios = getAllScenarios();
const SEEDS = Array.from({ length: 40 }, (_, i) => `PACE-${i}`);
const pick = (seed: string, n: number) => (n > 0 ? simpleHash(seed) % n : 0);

interface RunTrace { weeklyStress: number[]; skips: number; deadDays: number; burnedOut: boolean; }

/** Mirrors App.tsx's serving loop; `compress` toggles the quiet-day feature. */
function playKritis(seed: string, compress: boolean): RunTrace {
  const cfg = getGameModeConfig('kritis');
  const totalWeeks = cfg.gameLength.totalWeeks;
  let state: GameState = { ...createInitialState(seed, 'kritis'), flags: { kritis_mode: true } };
  const weeklyStress: number[] = [];
  let skips = 0, deadDays = 0, week = state.currentWeek;

  for (let guard = 0; guard < totalWeeks * 5 + 8 && state.currentWeek <= totalWeeks; guard++) {
    if (state.currentWeek !== week) { weeklyStress.push(state.stress); week = state.currentWeek; }

    if (compress) {
      const plan = planQuietDaySkip(allEvents, state, state.seed);
      if (plan) { state = applyQuietDays(state, plan); skips++; continue; }
    }

    let handled = false;
    if (wouldServeScenario(state, state.seed) && allScenarios.length > 0) {
      const sc = selectNextScenario(allScenarios, state, state.seed);
      if (sc) {
        const choice = sc.choices[pick(state.seed + sc.id, sc.choices.length)] ?? sc.choices[0];
        if (choice) state = applyEffects(state, calculateScenarioEffects(choice));
        state = { ...state, completedScenarios: [...(state.completedScenarios || []), sc.id] };
        handled = true;
      }
    }
    if (!handled) {
      const ev = selectNextEvent(allEvents, state, state.seed);
      if (!ev) { if (state.currentWeek >= 13) deadDays++; }
      else {
        const visible = getVisibleChoices(ev, state);
        const choice = visible[pick(state.seed + ev.id, visible.length)] ?? visible[0];
        if (choice) {
          state = applyEffects(state, choice.effects ?? {});
          const idx = ev.choices.indexOf(choice);
          state = recordDecision(state, ev, choice, idx >= 0 ? idx : 0);
          state = scheduleChainEvents(state, ev, choice);
          state = cleanupPendingEvent(state, ev.id);
          if (choice.setsFlags) state = { ...state, flags: { ...state.flags, ...Object.fromEntries(choice.setsFlags.map((f) => [f, true])) } };
          state = { ...state, completedEvents: [...state.completedEvents, ev.id] };
        }
      }
    }
    if (checkGameOver(state).isOver) break;
    state = advanceDay(state);
  }
  return { weeklyStress, skips, deadDays, burnedOut: state.stress >= cfg.thresholds.stressGameOver };
}

describe('KRITIS pacing with quiet-day compression (40 seeds, 24 weeks)', () => {
  const runs = SEEDS.map((s) => ({ seed: s, off: playKritis(s, false), on: playKritis(s, true) }));

  it('the feature actually fires (some seeds compress at least once)', () => {
    expect(runs.reduce((a, r) => a + r.on.skips, 0)).toBeGreaterThan(0);
  });

  it('compression never creates dead late-game days', () => {
    const bad = runs.filter((r) => r.on.deadDays > 0).map((r) => r.seed);
    expect(bad).toEqual([]);
  });

  it('STRESS-CURVE EQUIVALENCE: per-week stress divergence is bounded by the skipped filler effects (≤8 per skip)', () => {
    // Decay is applied identically per calendar day (applyQuietDays == N×advanceDay).
    // The ONLY divergence source: quiet events not resolved (each capped at |stress|≤8
    // by isQuietEvent) plus knock-on selection differences. Bound it generously but
    // meaningfully; a decay bug (e.g. skipping days without decay) blows way past this.
    const violations: string[] = [];
    for (const r of runs) {
      const weeks = Math.min(r.off.weeklyStress.length, r.on.weeklyStress.length);
      let cumSkips = 0;
      for (let w = 0; w < weeks; w++) {
        cumSkips = Math.min(cumSkips + 1, r.on.skips); // ≤1 skip/week by throttle
        const bound = 8 * cumSkips + 25; // skipped-filler cap + selection-drift allowance
        const diff = Math.abs(r.on.weeklyStress[w] - r.off.weeklyStress[w]);
        if (diff > bound) violations.push(`${r.seed} w${w + 1}: |Δstress|=${diff} > ${bound}`);
      }
    }
    expect(violations, violations.join('\n')).toEqual([]);
  });

  it('compression never turns a surviving run into a burnout', () => {
    const flipped = runs.filter((r) => !r.off.burnedOut && r.on.burnedOut).map((r) => r.seed);
    expect(flipped).toEqual([]);
  });

  it('NON-GOAL: story mode never plans a skip on any authored state', () => {
    let s = { ...createInitialState('PACE-STORY', 'story') };
    for (let d = 0; d < 10; d++) {
      expect(planQuietDaySkip(allEvents, s, s.seed)).toBeNull();
      s = advanceDay(s);
    }
  });
});
```

2. Run: `npm run test:client -- src/engine/pacingSimulation.test.ts` — expect green; if the equivalence bound trips, investigate with `systematic-debugging` (most likely: decay not applied per skipped day, or skips firing more than once per week).
3. Re-run the pre-existing balance audits unchanged (they are the contract): `npm run test:client -- src/engine/skillBalanceAudit.test.ts src/engine/flowBalanceAudit.test.ts src/engine/campaignPacing.test.ts src/engine/kritisLatePacing.test.ts src/engine/chainPacingAudit.test.ts`
4. Commit: `test(pacing): compression-aware 24-week balance simulation + story non-goal guard`

## Task 9: Second choices for the 14 single-choice flavor events

**Files:**
- Test: Extend `client/src/engine/flowBalanceAudit.test.ts` (new guard `it` block)
- Modify: `client/src/content/events/story/random-events.ts` (line refs per event below)

Excluded by design (state in the guard): `evt_tutorial_*` (beginner terminal tutorials — single-choice is intentional) and all hands-on levels (`terminalContext`/`guiContext` present: `learn_*`, `gui_*`, `blk_*` — their one choice opens the level).

**The 14 events** (all in `random-events.ts`): `evt_random_windows_update` (L11), `evt_random_toner` (L67), `evt_random_heater` (L91), `evt_random_screenshot` (L146), `evt_random_coffee` (L200), `evt_random_steam` (L253), `evt_random_projector` (L275), `evt_random_backup_movies` (L329), `evt_random_teams` (L353), `evt_random_bsod_presentation` (L377), `evt_random_kurz_schauen` (L401), `evt_random_scanner` (L456), `evt_random_saved_password` (L479), `evt_random_cake` (L504).

**Steps:**

1. Failing guard test (append to `flowBalanceAudit.test.ts`):

```ts
  it('GUARD: every non-tutorial, non-hands-on event offers >= 2 choices (Finding: single-choice flavor cards)', () => {
    const offenders = allEvents
      .filter((e) => !e.terminalContext && !e.guiContext)          // hands-on levels: 1 choice opens the level
      .filter((e) => !e.id.startsWith('evt_tutorial'))             // tutorials: single-choice by design
      .filter((e) => (e.choices ?? []).length < 2)
      .map((e) => e.id);
    expect(offenders, `single-choice non-interactive events:\n${offenders.join('\n')}`).toEqual([]);
  });
```

2. Run → fail listing exactly the 14 ids above + the 4 chain payoffs (fixed in Task 10; implement Tasks 9+10 against this one guard, it goes green at the end of Task 10): `npm run test:client -- src/engine/flowBalanceAudit.test.ts`
3. Author the second choices. Rules (from choice-design principles): both options ungated (no `requires`), meaningfully different in *approach*, small differentiated effects that trade stress against relationships/skills/compliance — never a strictly-better option; keep net stress income roughly unchanged (stress economy: +12-30/week). House tone: deadpan German IT-Alltag. Note the file uses ASCII umlaut spelling (`ae`/`ue`/`oe`) — match it. Exact additions (append each to the event's `choices` array):

```ts
// evt_random_windows_update (nach 'let_finish'):
{
  id: 'defer_and_fix_wsus',
  text: 'Neustarts unterbrechen und das WSUS-Wartungsfenster endlich nachziehen',
  effects: { stress: 3, skills: { windows: 1 } },
  resultText: 'Du verschiebst die Neustarts auf 22 Uhr und korrigierst die WSUS-Richtlinie. Naechsten Dienstag merkt es niemand. Genau das ist der Plan.',
},
// evt_random_toner (nach 'find_alternative'):
{
  id: 'get_master_key',
  text: 'Hausmeister mit Generalschluessel auftreiben',
  effects: { stress: 1, relationships: { fachabteilung: 2 } },
  resultText: 'Der Hausmeister oeffnet den Schrank in 4 Minuten. Du notierst dir: Ersatztoner gehoert nicht hinter Schloss und Urlaub.',
},
// evt_random_heater (nach 'remove_heater'):
{
  id: 'find_owner_first',
  text: 'Erst den Besitzer ermitteln und persoenlich ansprechen',
  effects: { stress: 3, relationships: { kollegen: 2 }, compliance: -2 },
  resultText: 'Es war Herr Krause aus dem Ordnungsamt. "Mir war kalt." Ihr einigt euch: Heizluefter raus, dafuer bekommt er den Platz am Fenster. Diplomatie.',
},
// evt_random_screenshot (nach 'call_user'):
{
  id: 'reply_with_guide',
  text: 'Per Mail antworten - mit Anleitung, wie man brauchbare Screenshots macht',
  effects: { stress: 2, skills: { softSkills: 1 } },
  resultText: 'Du schickst eine freundliche Anleitung. Antwort nach einer Stunde: ein Foto vom Monitor, mit Handy. Immerhin ist die Fehlermeldung lesbar.',
},
// evt_random_coffee (nach 'emergency_coffee'):
{
  id: 'repair_machine',
  text: 'Maschine selbst aufschrauben - ist ja auch nur Hardware',
  effects: { stress: 4, skills: { troubleshooting: 1 }, relationships: { kollegen: 3 } },
  resultText: 'Verkalktes Ventil. 20 Minuten und ein Essigbad spaeter laeuft sie wieder. Die IT feiert dich mehr als fuer jede Serverrettung.',
},
// evt_random_steam (nach 'say_no'):
{
  id: 'explain_why',
  text: 'Erklaeren warum: Lizenz, Bandbreite, Angriffsflaeche',
  effects: { stress: 1, skills: { softSkills: 1 } },
  resultText: '"Also theoretisch ginge es?" Du seufzt. "Nein." Aber er hat zugehoert - beim naechsten Mal fragt er VOR dem Installieren.',
},
// evt_random_projector (nach 'fix_projector'):
{
  id: 'ticket_first',
  text: 'Erst ein Ticket anlegen - was nicht dokumentiert ist, existiert nicht',
  effects: { stress: 1, compliance: 2 },
  resultText: 'Ticket, Kabel, geloest, geschlossen. Dauert 5 Minuten laenger und ist das einzige Mal diese Woche, dass die Statistik die Wahrheit sagt.',
},
// evt_random_backup_movies (nach 'investigate_owner'):
{
  id: 'fix_backup_first',
  text: 'Erst ein echtes Backup-Ziel einrichten, dann aufraeumen',
  effects: { stress: 3, skills: { linux: 1 } },
  resultText: 'Neues Backup-Ziel, Job getestet, DANN formatiert. Die Filme sind weg, die Backups laufen. In dieser Reihenfolge fragt auch kein Auditor nach.',
},
// evt_random_teams (nach 'enjoy_silence'):
{
  id: 'status_mail',
  text: 'Proaktiv eine Status-Mail schreiben: "Kein lokales Problem"',
  effects: { stress: -2, relationships: { chef: 2 } },
  resultText: '"Microsoft-Stoerung, bundesweit, wir koennen nichts tun." Drei Minuten Arbeit, null Anrufe. {chef} lobt die "schnelle Kommunikation".',
},
// evt_random_bsod_presentation (nach 'sprint_to_pc'):
{
  id: 'remote_defer',
  text: 'Per Fernwartung den Neustart verschieben - unsichtbar',
  effects: { stress: 6, skills: { windows: 1 } },
  resultText: 'Du verbindest dich remote und klickst das Popup weg, waehrend die {gf} weiterredet. Niemand hat etwas gesehen. Der eleganteste Save des Monats.',
},
// evt_random_kurz_schauen (nach 'finish_task'):
{
  id: 'timebox_it',
  text: 'Nach 30 Minuten abbrechen und einen Termin vereinbaren',
  effects: { stress: 3, relationships: { fachabteilung: -2 } },
  resultText: '"Da muss ich tiefer rein, ich komme Donnerstag vorbei." Frau Schmidt ist enttaeuscht. Dein Kalender ist es nicht.',
},
// evt_random_scanner (nach 'fix_scanner'):
{
  id: 'call_service',
  text: 'Wartungsvertrag pruefen und den Techniker bestellen',
  effects: { stress: 1, budget: -300 },
  resultText: 'Es gibt tatsaechlich einen Wartungsvertrag. Der Techniker kommt am Nachmittag und tauscht die Einzugsrollen. Haette man 2022 schon machen koennen.',
},
// evt_random_saved_password (nach 'delete_password'):
{
  id: 'disable_autofill_gpo',
  text: 'Autofill auf allen Shared PCs per GPO abschalten',
  effects: { stress: 4, skills: { windows: 1 } },
  resultText: 'Eine GPO spaeter speichert kein Browser auf Shared PCs mehr Passwoerter. Das eine geloeschte Passwort war ein Symptom. Das hier ist die Ursache.',
},
// evt_random_cake (nach 'eat_cake'):
{
  id: 'save_piece',
  text: 'Ein Stueck fuer Jens beiseitestellen - der haengt im Serverraum',
  effects: { stress: -1, relationships: { kollegen: 3 } },
  resultText: 'Jens kommt um 15 Uhr hoch, sieht den Teller mit seinem Namen drauf und sagt nur: "Deshalb bist du mein Lieblingskollege."',
},
```

4. Run: `npm run test:client -- src/engine/flowBalanceAudit.test.ts` → still red (only the 4 chain payoffs remain) — that is the expected intermediate state. Also run `npm run test:client -- src/content/content.test.ts` (must be green: choice ids unique per event, required fields).
5. Commit: `feat(content): second choices for all 14 single-choice random flavor events`

## Task 10: Second choices for the 4 single-choice chain payoffs

**Files:**
- Modify: `client/src/content/events/story/story-week7-10.ts` (`evt_elo_fix_success` choices at L276-283, `evt_personalrat_escalation` choices at L341-348)
- Modify: `client/src/content/events/story/story-week9-12.ts` (`evt_weekend_hero` choices at L272-279, `evt_colleague_grateful` choices at L373-380)
- Test: the Task 9 guard in `flowBalanceAudit.test.ts` (goes green here)

These are consequence/payoff beats — the second option is a *real second reaction* (per choice-design principles), trading the reward's shape, not its existence. Effects sized against the existing choice so neither dominates:

```ts
// evt_elo_fix_success (existing: document_fix → kaemmerer+15, troubleshooting+5, stress-5):
{
  id: 'leverage_moment',
  text: 'Den Moment nutzen: gleich den Wartungsvertrag fuer ELO ansprechen',
  effects: { relationships: { kaemmerer: 10 }, budget: 2000, stress: 2 },
  resultText: '"Wo Sie gerade da sind: ELO braucht einen Wartungsvertrag, sonst stehe ich naechstes Mal wieder alleine da." {kaemmerer} nickt langsam. "Schicken Sie mir ein Angebot." Kein Runbook, aber Budget.',
},
// evt_personalrat_escalation (existing: full_disclosure → compliance+5, stress+10, chef-5):
{
  id: 'formal_process',
  text: 'Auf das formale Verfahren verweisen und den Datenschutzbeauftragten selbst einladen',
  effects: { compliance: 3, stress: 6, relationships: { chef: -3, kollegen: -3 } },
  resultText: 'Du machst es offiziell: DSB-Pruefung, Protokoll, Fristen. Korrekt, aber kuehl - der Personalrat haette das persoenliche Gespraech bevorzugt. Immerhin: Alles ist dokumentiert.',
},
// evt_weekend_hero (existing: humble_response → chef+10, stress-10):
{
  id: 'address_oncall',
  text: 'Die Gelegenheit nutzen: eine echte Rufbereitschaftsregelung vorschlagen',
  effects: { relationships: { chef: 5 }, compliance: 3, stress: -5 },
  resultText: '"Danke. Aber damit das nicht vom Zufall abhaengt: Wir brauchen eine Rufbereitschaft." {chef} verzieht das Gesicht - Budget. Aber er nimmt es mit in die Leitungsrunde.',
},
// evt_colleague_grateful (existing: accept_thanks → kollegen+15, stress-5):
{
  id: 'set_boundary',
  text: 'Danke annehmen - und die Grenze klarmachen',
  effects: { relationships: { kollegen: 8 }, compliance: 2, stress: -2 },
  resultText: '"Gerne. Aber beim naechsten Mal laeuft das ueber ein Ticket, nicht ueber Vertrauen." Er grinst schief. "Fair." Weniger Kumpel, mehr Kollege - und alle wissen, woran sie sind.',
},
```

**Steps:**

1. Guard from Task 9 is the failing test: `npm run test:client -- src/engine/flowBalanceAudit.test.ts` → red, listing exactly these 4 ids.
2. Add the four choices above.
3. Run → green: `npm run test:client -- src/engine/flowBalanceAudit.test.ts src/content/content.test.ts src/engine/chainPacingAudit.test.ts src/engine/campaignPacing.test.ts` (campaignPacing walks story beats with `pickChoice('first')` — appended choices don't shift `choices[0]`, and `calmest`/`hardest` re-sort; its guards are strategy-based, not id-based, so it must stay green).
4. Commit: `feat(content): real second reactions for single-choice chain payoff events`

## Task 11: D1 entry-level pack scenarios (5 new)

**Files:**
- Test: Extend `client/src/content/packs/packs.test.ts`
- Modify: `client/src/content/packs/internal/scenarios.ts` (append 2), `client/src/content/packs/cloud365/scenarios.ts` (append 1), `client/src/content/packs/telekom/scenarios.ts` (append 1), `client/src/content/packs/amse-it/scenarios.ts` (append 1)

All five are **choice-only** (no `terminalContext`, no `guiContext`) — this keeps the terminal hint/VFS guards (`packs.test.ts:297-373`, `terminal-contexts.test.ts`) trivially satisfied. `involvedNpcs` only where an existing contact fits (validated by `packs.test.ts:256-268`); omit otherwise. Score scale for D1 (gentler than D3 house scale): PERFECT 100 / SUCCESS 60 / PARTIAL_SUCCESS 25 / FAIL -40 / CRITICAL_FAIL -80.

**Steps:**

1. Failing test (append to `packs.test.ts` inside `Scenario Content Validation`):

```ts
    it('a difficulty-1 tier exists: >= 4 D1 scenarios across >= 3 packs', () => {
      const d1 = getScenariosByDifficulty(1, 1);
      expect(d1.length, d1.map((s) => s.id).join(', ')).toBeGreaterThanOrEqual(4);
      const packPrefixes = new Set(d1.map((s) => s.id.split('-')[0]));
      expect(packPrefixes.size).toBeGreaterThanOrEqual(3);
    });
```

2. Run → fail: `npm run test:client -- src/content/packs/packs.test.ts`
3. Author the scenarios. Skeletons below are complete in ids/titles/outcome structure/score values; the German prose bodies (`flavorText`, `consequence`, `lesson`) are authoring steps — beats and tone noted per field, deadpan IT-Alltag, each `lesson`/`realWorldReference` > 10 chars (guard), each has PERFECT+SUCCESS outcomes (guard).

**`INTERN-SC-011` — „Der Anruf: Passwort vergessen"** (internal, password-reset hygiene)
`category: 'security_incident'`, `difficulty: 1`, `urgency: 'medium'`, `tags: ['helpdesk', 'social_engineering', 'passwords']`, `bsiReference: 'BSI IT-Grundschutz: ORP.4 Identitäts- und Berechtigungsmanagement'`.
flavorText beat: Anruf, angeblich Büro der Bürgermeisterin, braucht SOFORT ein neues Passwort, Termin in 5 Minuten, Nummer unterdrückt.
- `A` „Passwort sofort zurücksetzen — ist ja die Bürgermeisterin" → `FAIL`, -40/-5. Lesson: Identität am Telefon ist eine Behauptung, kein Beweis.
- `B` „Über die offizielle Vorwahl im Sekretariat zurückrufen und dann zurücksetzen" → `PERFECT`, 100/+15. Beat: Rückruf kostet 90 Sekunden, ist wasserdicht.
- `C` „Reset nur mit Ticket + persönlichem Erscheinen mit Dienstausweis" → `SUCCESS`, 60/+5. Beat: korrekt, aber unflexibel — es GIBT ein definiertes Rückruf-Verfahren.
- `D` „Sicherheitsfrage stellen: Geburtsdatum" → `PARTIAL_SUCCESS`, 25/0. Lesson: wissensbasierte Prüfung ist googlebar.
realWorldReference: CEO-Fraud/Vishing gegen Kommunen; Helpdesk als beliebtester Einstiegspunkt (vgl. MGM Resorts 2023).

**`INTERN-SC-012` — „Der neue Multifunktionsdrucker"** (internal, printer basics + security twist)
`category: 'troubleshooting'`, `difficulty: 1`, `urgency: 'low'`, `tags: ['printer', 'hardening', 'defaults']`.
flavorText beat: Neuer Drucker fürs Bauamt, „anschließen und fertig" sagt der Lieferant; Weboberfläche: admin/admin, Scan-to-SMB will Domänen-Zugangsdaten.
- `A` „Anschließen, testen, fertig — die Leute warten" → `FAIL`, -40/0. Lesson: Standardpasswörter sind der klassische Fußabdruck im Netz.
- `B` „Admin-Passwort ändern, Firmware prüfen, Scan-Konto mit minimalen Rechten anlegen" → `PERFECT`, 100/+10.
- `C` „Nur das Admin-Passwort ändern, Rest später" → `SUCCESS`, 60/+5.
- `D` „Das Scan-Konto mit dem eigenen Admin-Account einrichten — geht schneller" → `CRITICAL_FAIL`, -80/-10. Lesson: Admin-Credentials im Drucker-Klartextspeicher = Geschenk an den nächsten Angreifer.
realWorldReference: Drucker als vergessene Netzwerkgeräte; Credential-Harvesting aus MFP-Adressbüchern.

**`CLOUD365-SC-007` — „Die Mahnung von ‚Microsoft'"** (cloud365, phishing triage)
`category: 'security_incident'`, `difficulty: 1`, `urgency: 'medium'`, `tags: ['phishing', 'mail', 'awareness']`, `bsiReference: 'BSI IT-Grundschutz: CON.3 / OPS.1.1.4 Schutz vor Schadprogrammen'`.
flavorText beat: Frau Berger leitet eine Mail weiter: „Ihr Microsoft-Konto wird in 24h gesperrt", Link auf `micros0ft-verify.com`, sie hat NOCH nicht geklickt — wer noch?
- `A` „Link in der eigenen VM öffnen, ‚nur mal gucken'" → `FAIL`, -40/0. Lesson: Triage braucht Header und Ruhe, keine Neugier.
- `B` „Header prüfen, Absender-Domain blocken, Quarantäne-Suche: wer hat sie noch bekommen, wer hat geklickt" → `PERFECT`, 100/+15.
- `C` „Mail löschen lassen und gut" → `PARTIAL_SUCCESS`, 25/0. Beat: dieselbe Mail liegt in 30 weiteren Postfächern.
- `D` „Frau Berger loben und die Mail als Awareness-Beispiel (anonymisiert) rundschicken" → `SUCCESS`, 60/+10. Beat: Meldekultur belohnen ist die halbe Miete — die technische Suche fehlt aber.
realWorldReference: Credential-Phishing als Einstieg Nr. 1; Melden-statt-Klicken-Kultur.

**`TELEKOM-SC-007` — „Homeoffice: ‚Das VPN ist kaputt'"** (telekom, VPN basics + security twist)
`category: 'troubleshooting'`, `difficulty: 1`, `urgency: 'medium'`, `tags: ['vpn', 'remote_work', 'mfa']`.
flavorText beat: Herr Weber aus dem Hotel: VPN verbindet nicht. Hotel-WLAN mit Captive Portal, Browser noch nie geöffnet. Sein Vorschlag: „Ich schick mir die Unterlagen einfach an meine private GMX-Adresse."
- `A` „Erst Browser öffnen, Hotel-Portal bestätigen, dann VPN" → `PERFECT`, 100/+10. Beat: Captive Portal — 90% aller ‚VPN kaputt im Hotel'-Fälle.
- `B` „VPN-Client komplett neu installieren lassen" → `PARTIAL_SUCCESS`, 25/0. Beat: 40 Minuten, dann geht es — weil beim Neustart das Portal aufging.
- `C` „‚Dann halt private Mail, aber nur diesmal'" → `CRITICAL_FAIL`, -80/-10. Lesson: Dienstliche Daten auf Privat-Accounts = Datenabfluss mit Ansage (DSGVO).
- `D` „Handy-Hotspot als sauberen Workaround einrichten" → `SUCCESS`, 60/+5.
realWorldReference: Schatten-IT entsteht, wenn der offizielle Weg klemmt und niemand einen sicheren Workaround anbietet.

**`AMSE-SC-009` — „Das Werbegeschenk"** (amse-it, USB hygiene; `involvedNpcs: ['AMSE-MARCO']` — existing contact)
`category: 'security_incident'`, `difficulty: 1`, `urgency: 'low'`, `tags: ['usb', 'awareness', 'vendors']`.
flavorText beat: Nach dem AMSE-Termin liegen drei USB-Sticks mit Logo im Besprechungsraum — „Produktkatalog drauf", sagt Marco. Einer steckt schon im PC der Fachabteilung.
- `A` „Selbst kurz reinschauen — ist ja von AMSE" → `FAIL`, -40/0. Lesson: Herkunft gefühlt bekannt ≠ Inhalt geprüft; Sticks sind das älteste Trojanische Pferd.
- `B` „Sticks einsammeln, den gesteckten PC prüfen, kurze Awareness-Info an alle" → `PERFECT`, 100/+10.
- `C` „In der isolierten Analyse-Station prüfen, dann freigeben" → `SUCCESS`, 60/+5.
- `D` „Kommentarlos in den Schredder" → `PARTIAL_SUCCESS`, 25/-5. Beat: Risiko weg, Lerneffekt null, Marco ist beleidigt.
realWorldReference: USB-Drop-Angriffe; BadUSB — Awareness wirkt besser als stilles Entsorgen.

4. Run → pass: `npm run test:client -- src/content/packs/packs.test.ts src/content/content.test.ts src/engine/kritisLatePacing.test.ts src/engine/pacingSimulation.test.ts` (last two: new scenarios shift the weighted scenario pick on some seeds — the guards are distribution-based and must stay green).
5. Commit: `feat(content): D1 entry-level scenario tier (5 scenarios across 4 packs)`

## Task 12: Full verification pass

**Files:** none (verification only)

**Steps:**

1. Full client suite: `npm run test:client` → all green. Named balance/pacing audits to eyeball in the output (the contract): `skillBalanceAudit`, `flowBalanceAudit`, `campaignPacing`, `kritisLatePacing`, `chainPacingAudit`, `chainThrottle`, `chainFlowDensity`, `pacingSimulation`, `pacingConfig`, `storyGuiBeats`, `campaignConsistency`, `guiLearningIntegration`.
2. Full monorepo: `npm test` (builds shared first — catches any `shared/src` type export misses).
3. Type/build check: `npm run build`.
4. Manual smoke via the `verify` skill (or `npm run dev`): one KRITIS run through week 1-2 — quiet-day interstitial appears on a filler day and is Enter-skippable; week recap after Friday; stress bar behaves; story mode run shows neither.
5. Commit anything outstanding, then use `finishing-a-development-branch`.

## Risk notes for the implementer

- **Seed-shift is expected, dead days are not.** Tasks 7 and 11 change which content lands on which seed/day. Every affected audit is distribution- or invariant-based (no test pins a specific event to a specific seed — verified), so failures there mean a real invariant broke, not "update the expectation".
- **Do not add numeric effects to the quiet-day skip.** The equivalence proof in Tasks 3/8 depends on skip ≡ N×`advanceDay`. If design later wants flavor effects, they must go through `applyEffects` and the simulation bound must be re-derived.
- **`weekStart`/`lastQuietSkipWeek` are optional on purpose** — autosave envelope version stays 1; old saves load and degrade gracefully (no recap deltas, skip throttle starts fresh).
- **`getVisibleChoices` fallback:** new second choices must stay ungated (no `requires`/`hidden`/`unlocks`) or the flowBalanceAudit `__continue__` guard fires at base state.
