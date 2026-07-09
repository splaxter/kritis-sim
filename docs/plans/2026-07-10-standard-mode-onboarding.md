# Standard/KRITIS Mode Onboarding Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Give first-time Standard (`intermediate`) and KRITIS players a fair start: week-1 mentor notes in all modes, two deterministic first-days orientation events that name the three lose conditions in fiction, and an always-available stats-bar legend explaining each meter's danger threshold.

**Architecture:** Three independent slices. (1) A pure derived selector `isMentorModeActive(state)` in `client/src/engine/gameState.ts` (mentor notes on in week 1 everywhere, persistent flag keeps beginner/learning on forever) consumed by `GameScreen`. (2) A new PRIORITY-0 step in `selectNextEvent` (`client/src/engine/eventEngine.ts`) that deterministically serves events carrying a dedicated `week1-onboarding` tag, plus two new authored events in `client/src/content/events/orientation.ts` chained off `evt_first_day` — exactly mirroring how `tutorials.ts` chains off it for beginner. (3) A keyboard-accessible `?` toggle on `StatsBar` rendering one line per meter from the mode's real `config.thresholds`.

**Tech Stack:** TypeScript monorepo, React 18, vitest (jsdom + @testing-library/react), shared types in `shared/src/types/`, mode config in `shared/src/config/gameModes.ts`.

---

## Verified research summary (read this before starting)

- **Mentor mode today:** `client/src/engine/gameState.ts:56` — `mentorModeEnabled: mode === 'beginner' || mode === 'learning'`. Consumed ONLY at `client/src/components/GameScreen/index.tsx:188` and `:263` (`mentorModeEnabled={state.mentorModeEnabled}` → `ResultScreen` → `MentorNote`, which renders nothing when `isEnabled` is false or `note` is empty — `client/src/components/MentorNote/index.tsx:7`).
- **Event selection:** `selectNextEvent` (`client/src/engine/eventEngine.ts:79-150`) has NO deterministic priority except chain events; it hash-picks from the available pool. Even `evt_first_day` (`client/src/content/events/week1.ts:5`, `dayPreference: [1]`, tags `['intro', 'onboarding']`) is currently only *probabilistically* served on day 1 — it competes with e.g. `evt_password_reset_wave` (`weekRange: [1, 2]`, no dayPreference). The beginner tutorials (`client/src/content/events/tutorials.ts`) all `require: { events: ['evt_first_day'] }`, so they are best-effort too. Our fix makes day 1 deterministic for everyone.
- **`probability` field is dead for events** — nothing in `eventEngine.ts` reads it (only `chainEngine.ts:124` reads `trigger.probability`). Don't rely on it.
- **One event per day:** `continueGame` in `client/src/hooks/useGame.ts:340` advances the day after every result. "1-2 orientation events" therefore means day 2 + day 3 (day 1 stays `evt_first_day`).
- **Scenario preemption:** `client/src/App.tsx:292-307` rolls scenarios with `scenarioChance = min(0.5, 0.1 + (week-1)*0.05)` — a 10% chance in week 1 that a scenario displaces the day's event. The comment says "after week 1" but the code doesn't enforce it. Two audit tests copy this formula verbatim: `client/src/engine/chainFlowDensity.test.ts:57-59` and `client/src/engine/kritisLatePacing.test.ts:103-105`.
- **CRITICAL tag collision:** the generic `onboarding` tag is already used on later events (`client/src/content/events/week5-8.ts:768` — `evt_new_employee_onboarding`, and `week19-24.ts:52`). The priority mechanism MUST use a new dedicated tag (`week1-onboarding`), otherwise week-5+ events get force-served and wreck pacing.
- **Story/learning modes are unaffected by `selectNextEvent` changes:** story mode branches into `getNextStoryContent` before the event path (`App.tsx:260-280`); learning mode returns early at `App.tsx:288-290`, and `getAvailableEvents` cliOnly filtering (`eventEngine.ts:15-24`) excludes non-learning events anyway.
- **Audit-test constraints on new content:**
  - `flowBalanceAudit.test.ts:73` — every non-learning event must expose ≥1 ungated authored choice at base state (no `__continue__` synthesis). Our house rule (≥2 ungated choices) satisfies this.
  - `content.test.ts` — unique ids, `evt_` prefix, all `requires.events` must exist, `weekRange.length === 2`, every choice has `id`+`text`. Minimum-count floors (`content.test.ts:159-160`: >50 events, >30 scenarios) only get easier.
  - `chainFlowDensity.test.ts` / `kritisLatePacing.test.ts` — simulate the App loop with 40 seeds; they assert chain sparsity and late-week (13-24) pool depth. Two extra non-chain week-1 events can't break those assertions, but keep their copied scenario formula in sync with App.tsx (Task 4).
  - `campaignPacing.test.ts` — story mode only; orientation events carry `requiredModes: ['intermediate', 'kritis']` so they can't leak in.
  - `gameState.test.ts:157-163` asserts `intermediateState.mentorModeEnabled === false` — we do NOT change `createInitialState`, so this stays green (week-1 visibility is a derived selector, not stored state; also keeps old saves working with zero migration).
- **Character canon:** `App.tsx:138-144` — `chef: 'Bert'`, `kollege: 'Bjorg'`. `{chef}`/`{kollege}` placeholders resolve to those. Jens and Henry are named literally in event text (see `tutorials.ts`, `week1.ts:74`). Bert = tech-savvy, competent, supportive. Bjorg = loud delegator, boomer humor. Jens/Henry = competent colleagues.
- **Test command (verified working):** `npm run test:client -- src/engine/eventEngine.test.ts` (runs `npm run build -w shared` first, then vitest with the file filter).

**Explicit NON-GOAL:** `features.showHints` stays `false` for `intermediate` (`shared/src/config/gameModes.ts:111`), `hard` (`:146`) and `kritis` (`:181`). Terminal-level hints remain a difficulty differentiator between Beginner/Learning and the harder modes. No change to `gameModes.ts` anywhere in this plan.

---

## Task 1: `isMentorModeActive` — week-1 mentor notes in all modes

**Files:**
- Modify: `client/src/engine/gameState.ts` (add function after `checkGameOver`, ~line 168)
- Modify: `client/src/components/GameScreen/index.tsx` (lines 188, 263 + import)
- Test: `client/src/engine/gameState.test.ts` (new `describe` block after the `createInitialState` block, ~line 164)

### Step 1.1 — Write the failing test

Add to `client/src/engine/gameState.test.ts`. Extend the import at line 2-8 with `isMentorModeActive`:

```ts
import {
  createInitialState,
  generateSeed,
  applyEffects,
  advanceDay,
  checkGameOver,
  isMentorModeActive,
} from './gameState';
```

New block (insert after the `createInitialState` describe, before `applyEffects`):

```ts
describe('isMentorModeActive', () => {
  it('is active in week 1 for every mode (first-week onboarding)', () => {
    const modes = ['beginner', 'learning', 'intermediate', 'hard', 'kritis', 'story'] as const;
    for (const mode of modes) {
      const state = createInitialState(undefined, mode);
      expect(isMentorModeActive(state), mode).toBe(true);
    }
  });

  it('switches off from week 2 in intermediate/hard/kritis/story', () => {
    const modes = ['intermediate', 'hard', 'kritis', 'story'] as const;
    for (const mode of modes) {
      const state = { ...createInitialState(undefined, mode), currentWeek: 2 };
      expect(isMentorModeActive(state), mode).toBe(false);
    }
  });

  it('stays on beyond week 1 for beginner and learning (persistent flag)', () => {
    for (const mode of ['beginner', 'learning'] as const) {
      const state = { ...createInitialState(undefined, mode), currentWeek: 7 };
      expect(isMentorModeActive(state), mode).toBe(true);
    }
  });

  it('turns off exactly at the week-1 → week-2 rollover via advanceDay', () => {
    let state = createInitialState(undefined, 'intermediate');
    expect(isMentorModeActive(state)).toBe(true);
    state = { ...state, currentDay: 5 };
    state = advanceDay(state);
    expect(state.currentWeek).toBe(2);
    expect(isMentorModeActive(state)).toBe(false);
  });
});
```

### Step 1.2 — Run, expect failure

```bash
npm run test:client -- src/engine/gameState.test.ts
```

Expected: `SyntaxError`/`TypeError` — `isMentorModeActive` is not exported (4 new tests fail, all existing pass).

### Step 1.3 — Minimal implementation

Append to `client/src/engine/gameState.ts` (after `checkGameOver`, line 168):

```ts
/**
 * Mentor notes are visible when the run's persistent mentor flag is on
 * (beginner/learning, set in createInitialState) OR during week 1 of ANY
 * mode — so a first-time Standard/KRITIS/Schwer player gets the orientation
 * notes, and from week 2 the training wheels come off automatically.
 *
 * Derived (not stored) on purpose: no save migration, and old saves in
 * week >= 2 behave exactly as before.
 */
export function isMentorModeActive(state: GameState): boolean {
  return state.mentorModeEnabled === true || state.currentWeek === 1;
}
```

### Step 1.4 — Run, expect pass

```bash
npm run test:client -- src/engine/gameState.test.ts
```

Expected: all tests pass (existing 60 + 4 new). Note the existing assertions at lines 58/145/161-162 about the *stored* flag stay untouched and green.

### Step 1.5 — Wire the consumer

In `client/src/components/GameScreen/index.tsx`:
- Line 9 area, add import: `import { isMentorModeActive } from '../../engine/gameState';`
- Line 188: `mentorModeEnabled={state.mentorModeEnabled}` → `mentorModeEnabled={isMentorModeActive(state)}`
- Line 263: same replacement.

These are the only two consumers of `state.mentorModeEnabled` outside the engine (verified by grep).

### Step 1.6 — Verify no regressions + commit

```bash
npm run test:client
git add client/src/engine/gameState.ts client/src/engine/gameState.test.ts client/src/components/GameScreen/index.tsx
git commit -m "feat(onboarding): mentor notes active during week 1 in every mode

Derived isMentorModeActive(state) — persistent flag (beginner/learning)
OR currentWeek === 1. Off automatically from week 2 in standard/kritis/
hard/story. No stored-state change, no save migration.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 2: Deterministic PRIORITY-0 onboarding selection in the engine

**Files:**
- Modify: `client/src/engine/eventEngine.ts` (`selectNextEvent`, lines 79-114)
- Modify: `client/src/content/events/week1.ts` (line 38 — tag `evt_first_day`)
- Test: `client/src/engine/eventEngine.test.ts` (new `describe` inside `selectNextEvent`, after line 225)

**Design note:** we key on a NEW dedicated tag `week1-onboarding`, NOT the existing `onboarding` tag — that one already decorates week-5-8 and week-19-24 events (`week5-8.ts:768`, `week19-24.ts:52`) and prioritizing it would force-serve mid-game events. Side effect (intended): `evt_first_day` becomes guaranteed on day 1 in beginner/intermediate/hard/kritis, which also makes the beginner tutorial chain and `evt_zwischenbilanz` (`week5-8.ts:969`, requires `evt_first_day`) reliably reachable.

### Step 2.1 — Write the failing tests

Add inside `describe('selectNextEvent', ...)` in `client/src/engine/eventEngine.test.ts` (after the existing `it('considers week and day in selection')`, ~line 225). Also extend the import at line 2 with `ONBOARDING_PRIORITY_TAG`:

```ts
describe('week1-onboarding priority', () => {
  it('serves an available onboarding-tagged event before anything else, for any seed', () => {
    const events = [
      createEvent({ id: 'evt_random_a' }),
      createEvent({ id: 'evt_welcome', tags: [ONBOARDING_PRIORITY_TAG] }),
      createEvent({ id: 'evt_random_b' }),
    ];
    for (const seed of ['A', 'B', 'C', 'D', 'E']) {
      const state = createGameState({ seed });
      expect(selectNextEvent(events, state, seed)?.id).toBe('evt_welcome');
    }
  });

  it('orders competing onboarding events by earliest dayPreference', () => {
    const events = [
      createEvent({ id: 'evt_later', tags: [ONBOARDING_PRIORITY_TAG], dayPreference: [2, 3] }),
      createEvent({ id: 'evt_earlier', tags: [ONBOARDING_PRIORITY_TAG], dayPreference: [1, 2] }),
    ];
    const state = createGameState({ currentDay: 2 });
    expect(selectNextEvent(events, state, 'SEED')?.id).toBe('evt_earlier');
  });

  it('falls back to normal selection once onboarding events are completed', () => {
    const events = [
      createEvent({ id: 'evt_random' }),
      createEvent({ id: 'evt_welcome', tags: [ONBOARDING_PRIORITY_TAG] }),
    ];
    const state = createGameState({ completedEvents: ['evt_welcome'] });
    expect(selectNextEvent(events, state, 'SEED')?.id).toBe('evt_random');
  });

  it('respects requiredModes / prerequisites on onboarding events', () => {
    const events = [
      createEvent({ id: 'evt_random' }),
      createEvent({
        id: 'evt_ori',
        tags: [ONBOARDING_PRIORITY_TAG],
        requiredModes: ['intermediate'],
      }),
    ];
    const state = createGameState({ gameMode: 'beginner' });
    expect(selectNextEvent(events, state, 'SEED')?.id).toBe('evt_random');
  });
});
```

### Step 2.2 — Run, expect failure

```bash
npm run test:client -- src/engine/eventEngine.test.ts
```

Expected: import error — `ONBOARDING_PRIORITY_TAG` not exported.

### Step 2.3 — Minimal implementation

In `client/src/engine/eventEngine.ts`, add the constant above `selectNextEvent` and restructure the top of the function so `available` is computed once (currently computed at line 112):

```ts
/**
 * Events carrying this tag are served deterministically — before chains,
 * before the hash pick — whenever they are available. Reserved for week-1
 * orientation content (weekRange [1,1]); a content guard test enforces that
 * so a mis-tagged mid-game event can't hijack the queue. Note: this is
 * deliberately NOT the generic 'onboarding' tag, which already decorates
 * week-5+ events.
 */
export const ONBOARDING_PRIORITY_TAG = 'week1-onboarding';

export function selectNextEvent(
  events: GameEvent[],
  state: GameState,
  seed: string
): GameEvent | null {
  const available = getAvailableEvents(events, state);

  // PRIORITY 0: week-1 onboarding. Available orientation events are served
  // in a fixed order (earliest dayPreference, then authored order) so the
  // first days of a run are identical for every seed. Empty outside week 1
  // (weekRange gate) or once completed. cliOnly (learning) never has these
  // in `available`; story mode doesn't call selectNextEvent at all.
  const onboardingPool = available.filter((e) => e.tags.includes(ONBOARDING_PRIORITY_TAG));
  if (onboardingPool.length > 0) {
    return [...onboardingPool].sort(
      (a, b) => (a.dayPreference?.[0] ?? 99) - (b.dayPreference?.[0] ?? 99)
    )[0];
  }
```

Then keep the existing chain-throttle block (lines 84-109) unchanged, and at the former line 111-113 replace

```ts
  // PRIORITY 2: Regular event selection (existing logic)
  const available = getAvailableEvents(events, state);
  if (available.length === 0) return null;
```

with

```ts
  // PRIORITY 2: Regular event selection (existing logic)
  if (available.length === 0) return null;
```

In `client/src/content/events/week1.ts:38`, tag the anchor event:

```ts
    tags: ['intro', 'onboarding', 'week1-onboarding'],
```

(String literal in content, constant in engine — content files don't import from engine anywhere; the guard test in Task 3 pins them together.)

### Step 2.4 — Run, expect pass

```bash
npm run test:client -- src/engine/eventEngine.test.ts
```

Expected: all pass (19 existing + 4 new). The existing determinism tests (`is deterministic with the same seed`, line 183) still pass because their fixture events carry no priority tag.

### Step 2.5 — Full suite guard + commit

```bash
npm run test:client
```

Watch specifically: `chainThrottle.test.ts`, `chainFlowDensity.test.ts`, `chainPacingAudit.test.ts` (they call `selectNextEvent` with real content — `evt_first_day` now always wins day 1; chain assertions are about weeks 5+, so they must stay green; if a fixture in `chainThrottle.test.ts` accidentally includes `evt_first_day` uncompleted, add it to `completedEvents` in that fixture rather than weakening the priority).

```bash
git add client/src/engine/eventEngine.ts client/src/engine/eventEngine.test.ts client/src/content/events/week1.ts
git commit -m "feat(engine): deterministic week1-onboarding priority in selectNextEvent

New ONBOARDING_PRIORITY_TAG served before chains and the hash pick,
ordered by earliest dayPreference. evt_first_day carries the tag, so
day 1 is now guaranteed in every free-play mode (also fixes the
probabilistic reachability of the beginner tutorial chain).

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 3: Author the two orientation events (Standard + KRITIS)

**Files:**
- Create: `client/src/content/events/orientation.ts`
- Modify: `client/src/content/events/index.ts` (import + spread into `allEvents`, lines 2-30)
- Test: `client/src/content/events/orientation.test.ts` (new)

Fiction: day 1 = existing `evt_first_day` (Bert's welcome — unchanged). Day 2 = Bert's walk-through naming the three lose conditions and pointing at the stats bar. Day 3 = Bjorg dumps a ticket pile, Jens offers help. Both events: ≥ 3 ungated choices with small differentiated effects (house rule ≥ 2; `flowBalanceAudit` guard).

### Step 3.1 — Write the failing test

Create `client/src/content/events/orientation.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { orientationEvents } from './orientation';
import { allEvents } from './index';
import { ONBOARDING_PRIORITY_TAG } from '../../engine/eventEngine';

describe('standard/kritis orientation events', () => {
  it('both events exist and are registered in allEvents', () => {
    const ids = new Set(allEvents.map((e) => e.id));
    expect(ids.has('evt_orientation_rundgang')).toBe(true);
    expect(ids.has('evt_orientation_erste_aufgabe')).toBe(true);
    expect(orientationEvents).toHaveLength(2);
  });

  it('are scoped to intermediate + kritis, week 1, priority-tagged', () => {
    for (const e of orientationEvents) {
      expect(e.requiredModes, e.id).toEqual(['intermediate', 'kritis']);
      expect(e.weekRange, e.id).toEqual([1, 1]);
      expect(e.tags, e.id).toContain(ONBOARDING_PRIORITY_TAG);
      expect(e.mentorNote, e.id).toBeTruthy();
    }
  });

  it('chain deterministically: rundgang after first_day (day 2), aufgabe after rundgang (day 3)', () => {
    const rundgang = orientationEvents.find((e) => e.id === 'evt_orientation_rundgang')!;
    const aufgabe = orientationEvents.find((e) => e.id === 'evt_orientation_erste_aufgabe')!;
    expect(rundgang.requires?.events).toEqual(['evt_first_day']);
    expect(rundgang.dayPreference).toEqual([2]);
    expect(aufgabe.requires?.events).toEqual(['evt_orientation_rundgang']);
    expect(aufgabe.dayPreference).toEqual([3]);
  });

  it('rundgang names all three lose conditions and points at the stats bar', () => {
    const d = orientationEvents.find((e) => e.id === 'evt_orientation_rundgang')!.description;
    expect(d).toMatch(/brennt aus|Burnout/); // stress → burnout
    expect(d).toMatch(/Vertrauen/); // chef → fired
    expect(d).toMatch(/Compliance/);
    expect(d).toMatch(/Bußgeld/); // BSI fine
    expect(d).toMatch(/Statusleiste/); // points at the stats bar
  });

  it('every orientation event offers >= 2 ungated choices (house rule)', () => {
    for (const e of orientationEvents) {
      const ungated = e.choices.filter((c) => !c.requires && !c.hidden && !(c.unlocks?.length));
      expect(ungated.length, e.id).toBeGreaterThanOrEqual(2);
    }
  });

  // GUARD: the priority tag means "serve immediately when available" — it is
  // reserved for week-1 content. A mid-game event carrying it would hijack
  // the queue on its first eligible day.
  it('every priority-tagged event in the whole pool is week-1-only', () => {
    const tagged = allEvents.filter((e) => e.tags.includes(ONBOARDING_PRIORITY_TAG));
    expect(tagged.length).toBeGreaterThanOrEqual(3); // first_day + 2 orientation
    for (const e of tagged) {
      expect(e.weekRange, e.id).toEqual([1, 1]);
    }
  });
});
```

### Step 3.2 — Run, expect failure

```bash
npm run test:client -- src/content/events/orientation.test.ts
```

Expected: `Cannot find module './orientation'`.

### Step 3.3 — Implementation: the content file

Create `client/src/content/events/orientation.ts`:

```ts
import { GameEvent } from '@kritis/shared';

/**
 * Week-1 orientation for Standard (intermediate) and KRITIS mode.
 *
 * Beginner/learning get tutorials and mentor notes; these two events give
 * everyone else a fair start. Day 2: Bert names the three lose conditions
 * in fiction and points at the stats bar. Day 3: Bjorg delegates, Jens
 * offers help — the office in miniature. Both carry the 'week1-onboarding'
 * tag so selectNextEvent serves them deterministically (PRIORITY 0).
 *
 * Character canon: Bert (Chef) = tech-savvy, competent, supportive.
 * Bjorg = loud delegator with boomer humor. Jens/Henry = the competent
 * colleagues.
 */
export const orientationEvents: GameEvent[] = [
  {
    id: 'evt_orientation_rundgang',
    weekRange: [1, 1],
    dayPreference: [2],
    probability: 1,
    requiredModes: ['intermediate', 'kritis'],
    requires: { events: ['evt_first_day'] },
    category: 'team',
    title: 'Rundgang mit dem Chef',
    description: `{chef} nimmt dich am zweiten Tag mit auf einen Rundgang: Serverraum, Leitwarte, Kaffeeküche — in genau dieser Reihenfolge.

"Kurz zur Lage, damit du weißt, worauf es hier ankommt. Drei Dinge können dir die Probezeit ruinieren." Er zählt an den Fingern ab. "Erstens: du selbst. Wer dauerhaft am Limit fährt, brennt aus — behalte deinen Stresspegel im Auge. Zweitens: ich. Wenn ich das Vertrauen in dich verliere, kann ich dich nicht halten. Drittens: das BSI. Wir sind kritische Infrastruktur — rutscht unsere Compliance auf null, gibt es ein Bußgeld, und dann war's das für uns beide."

Er deutet auf deinen Monitor. "Alle drei Werte siehst du oben in der Statusleiste. Rot ist schlecht. Fragen?"`,
    involvedCharacters: ['chef'],
    choices: [
      {
        id: 'ask_compliance',
        text: '"Was genau passiert, wenn die Compliance kippt?"',
        effects: { skills: { security: 2 }, compliance: 2, relationships: { chef: 3 } },
        resultText: '{chef} nickt anerkennend. "Gute Frage. NIS2-Audit, Mängelbericht, Bußgeld — und mein Kopf rollt zuerst, deiner direkt danach. Deshalb: dokumentieren, patchen, und bei Funden nicht wegducken. Lieber eine unangenehme Wahrheit früh als eine Katastrophe spät."',
      },
      {
        id: 'ask_stress',
        text: '"Und wie hält man den Stress hier im Rahmen?"',
        effects: { stress: -3, relationships: { chef: 3 } },
        resultText: '"Indem man nicht jeden Brand selbst löscht", sagt {chef} trocken. "Priorisieren, delegieren, Feierabend machen. Das Wochenende hilft — aber nur, wenn du es nicht durcharbeitest. Ich hab hier schon gute Leute am Burnout verloren. Dich verliere ich nicht, klar?"',
      },
      {
        id: 'confident',
        text: '"Verstanden. Ich behalte alle drei im Blick."',
        effects: { relationships: { chef: 5 } },
        resultText: '{chef} klopft dir auf die Schulter. "Gut. Mehr verlange ich am zweiten Tag gar nicht. Wenn was ist: mein Büro ist das mit der offenen Tür."',
      },
    ],
    mentorNote:
      'Die drei Niederlagen-Bedingungen: Stress erreicht das Maximum → Burnout. Chef-Beziehung fällt auf das Minimum → Kündigung. Compliance fällt auf null → BSI-Bußgeld. Alle drei stehen oben in der Statusleiste — der [?]-Knopf dort erklärt jede Anzeige mit ihrer Gefahrengrenze.',
    tags: ['onboarding', 'intro', 'week1-onboarding'],
  },
  {
    id: 'evt_orientation_erste_aufgabe',
    weekRange: [1, 1],
    dayPreference: [3],
    probability: 1,
    requiredModes: ['intermediate', 'kritis'],
    requires: { events: ['evt_orientation_rundgang'] },
    category: 'team',
    title: 'Bjorgs Willkommensgeschenk',
    description: `Bjorg steuert mit einem Stapel Tickets auf deinen Schreibtisch zu. Man hört ihn, bevor man ihn sieht.

"Der Neue! Perfekt. Einarbeitung ist, wenn man arbeitet, ne? Haha!" Der Stapel landet vor dir. "Alles Kleinkram: zwei Passwörter, ein Drucker, einmal 'Internet ist langsam'. Bis Mittag? Super, danke dir!"

Er ist weg, bevor du antworten kannst. Vom Nachbartisch schaut Jens auf: "Er macht das mit jedem Neuen. Die Tickets sind wirklich Kleinkram — aber sag Bescheid, wenn du bei einem eine zweite Meinung willst."`,
    involvedCharacters: ['kollege'],
    choices: [
      {
        id: 'accept_help',
        text: 'Jens beim Wort nehmen und die kniffligen Tickets gemeinsam durchgehen',
        effects: { relationships: { kollegen: 5 }, skills: { troubleshooting: 2 }, stress: 3 },
        resultText: 'Jens zeigt dir nebenbei die Sammelantwort-Funktion im Ticketsystem. Bis Mittag ist der Stapel weg — und du weißt jetzt, wen du hier fragen kannst.',
      },
      {
        id: 'solo',
        text: 'Alleine durchbeißen — du willst zeigen, was du kannst',
        effects: { skills: { troubleshooting: 3, windows: 2 }, stress: 8 },
        resultText: 'Du schaffst es — knapp. Beim "Internet ist langsam"-Ticket verlierst du eine Stunde an einen Klassiker: loses Patchkabel. Gelernt hast du trotzdem etwas. Und Stress angesammelt auch.',
      },
      {
        id: 'push_back',
        text: '"Ich nehme die Hälfte — den Rest priorisieren wir zusammen, Bjorg."',
        effects: { skills: { softSkills: 3 }, relationships: { kollegen: 2 }, stress: 2 },
        resultText: 'Bjorg blinzelt kurz — damit hat er nicht gerechnet. "Na gut, Chef-Allüren hat er schon mal. Haha!" Er nimmt drei Tickets zurück. Jens grinst in seinen Kaffee.',
      },
    ],
    mentorNote:
      'Delegieren und Grenzen setzen sind Stress-Management. Fast jede Entscheidung kostet oder spart Stress — und abgebaut wird er nur über Feierabende und Wochenenden. Wer alles alleine macht, gewinnt Skills, bezahlt aber mit dem Wert, der zum Burnout führt.',
    tags: ['onboarding', 'team', 'week1-onboarding'],
  },
];
```

Register in `client/src/content/events/index.ts` — add import after line 2 and spread right after `...week1Events`:

```ts
import { orientationEvents } from './orientation';
// ...
export const allEvents: GameEvent[] = [
  ...week1Events,
  ...orientationEvents,
  // ... rest unchanged
```

### Step 3.4 — Run, expect pass

```bash
npm run test:client -- src/content/events/orientation.test.ts src/content/content.test.ts src/engine/flowBalanceAudit.test.ts
```

Expected: all pass — orientation tests green, `content.test.ts` prerequisite/uniqueness/floor checks green, `flowBalanceAudit` shows the two new events as `decision` kind with no `__continue__` synthesis.

### Step 3.5 — Commit

```bash
git add client/src/content/events/orientation.ts client/src/content/events/orientation.test.ts client/src/content/events/index.ts
git commit -m "feat(content): week-1 orientation events for Standard and KRITIS

Day 2: Bert names the three lose conditions in fiction (burnout, fired,
BSI-Bußgeld) and points at the stats bar. Day 3: Bjorg delegates a ticket
pile, Jens offers help. Both week1-onboarding-tagged, >= 3 ungated
choices, mentor notes included. Guard test pins the priority tag to
weekRange [1,1].

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---## Task 4: End-to-end determinism — first-week integration test + week-1 scenario gate

**Files:**
- Test (create): `client/src/engine/onboardingFlow.test.ts`
- Modify: `client/src/App.tsx` (line 295: scenario roll condition; lines 292-294 comment)
- Modify: `client/src/engine/chainFlowDensity.test.ts` (lines 57-59 — keep sim faithful)
- Modify: `client/src/engine/kritisLatePacing.test.ts` (lines 103-105 — keep sim faithful)

**Why the App change:** `App.tsx:296` gives week 1 a 10% scenario chance per day, which could displace an orientation day. The comment at line 293 already claims "after week 1"; we make the code match. TDD exception: `App.tsx` has no unit harness — the behavior is pinned by updating the two simulation tests that replicate its loop, plus the engine-level integration test below.

### Step 4.1 — Write the integration test (passes for the engine path already; guards it forever)

Create `client/src/engine/onboardingFlow.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { GameModeId, GameState } from '@kritis/shared';
import { createInitialState, advanceDay, applyEffects } from './gameState';
import { selectNextEvent, getVisibleChoices } from './eventEngine';
import { allEvents } from '../content/events';

/**
 * Mirrors the App day loop for the first in-game days. Scenarios are not
 * simulated on purpose: App.tsx skips the scenario roll during week 1
 * (see "Standard mode: probabilistic content selection"), so days 1-3 are
 * pure selectNextEvent.
 */
function firstDaysServed(mode: GameModeId, seed: string, days: number): string[] {
  let state: GameState = createInitialState(seed, mode);
  const served: string[] = [];
  for (let d = 0; d < days; d++) {
    const ev = selectNextEvent(allEvents, state, seed);
    if (ev) {
      served.push(ev.id);
      const choice = getVisibleChoices(ev, state)[0];
      state = applyEffects(state, choice.effects ?? {});
      state = { ...state, completedEvents: [...state.completedEvents, ev.id] };
    } else {
      served.push('(none)');
    }
    state = advanceDay(state);
  }
  return served;
}

const SEEDS = Array.from({ length: 25 }, (_, i) => `SEED-${i}`);

describe('first-week onboarding flow is deterministic', () => {
  for (const mode of ['intermediate', 'kritis'] as GameModeId[]) {
    it(`${mode}: days 1-3 are first_day -> rundgang -> erste_aufgabe for every seed`, () => {
      for (const seed of SEEDS) {
        expect(firstDaysServed(mode, seed, 3), `${mode}/${seed}`).toEqual([
          'evt_first_day',
          'evt_orientation_rundgang',
          'evt_orientation_erste_aufgabe',
        ]);
      }
    });
  }

  it('beginner: day 1 is always evt_first_day (tutorial prerequisite guaranteed)', () => {
    for (const seed of SEEDS) {
      expect(firstDaysServed('beginner', seed, 1)[0]).toBe('evt_first_day');
    }
  });

  it('orientation events never leak into beginner or hard mode', () => {
    for (const mode of ['beginner', 'hard'] as GameModeId[]) {
      for (const seed of SEEDS) {
        const ids = firstDaysServed(mode, seed, 5);
        expect(ids, `${mode}/${seed}`).not.toContain('evt_orientation_rundgang');
        expect(ids, `${mode}/${seed}`).not.toContain('evt_orientation_erste_aufgabe');
      }
    }
  });
});
```

### Step 4.2 — Run, expect pass (engine path is already deterministic after Tasks 2+3)

```bash
npm run test:client -- src/engine/onboardingFlow.test.ts
```

Expected: 4 tests pass. If the intermediate/kritis sequence test fails, debug the priority pool ordering (Task 2) before proceeding — do not weaken the test.

### Step 4.3 — Close the App-level hole (scenario roll)

`client/src/App.tsx` lines 292-295, change

```ts
      // Standard mode: probabilistic content selection
      // Use scenarios ~30% of the time after week 1, increasing with progression
      // Skip scenarios entirely in CLI-only mode
      if (!cliOnly) {
```

to

```ts
      // Standard mode: probabilistic content selection
      // Use scenarios ~30% of the time after week 1, increasing with progression.
      // Week 1 is event-only so the deterministic onboarding sequence
      // (evt_first_day -> orientation, see selectNextEvent PRIORITY 0) cannot
      // be displaced by a scenario. Skip scenarios entirely in CLI-only mode.
      if (!cliOnly && game.state.currentWeek > 1) {
```

Keep the two audit simulations faithful to the app loop:

`client/src/engine/chainFlowDensity.test.ts:59` — change

```ts
    const useScenario = (h % 100) < scenarioChance * 100;
```

to

```ts
    const useScenario = week > 1 && (h % 100) < scenarioChance * 100; // App skips scenarios in week 1
```

`client/src/engine/kritisLatePacing.test.ts:105` — same one-line change (the surrounding loop also names the variable `week`; verify before editing).

### Step 4.4 — Run the affected suites, expect pass

```bash
npm run test:client -- src/engine/chainFlowDensity.test.ts src/engine/kritisLatePacing.test.ts src/engine/chainPacingAudit.test.ts
```

Expected: all pass. These tests assert chain sparsity (≤1 chain/week) and late-game pool depth (weeks 13-24) — removing week-1 scenarios and adding two week-1 events does not touch either bound. `chainPacingAudit.test.ts` ignores the scenario split entirely (see its header comment, line 18).

### Step 4.5 — Full suite + commit

```bash
npm run test:client
git add client/src/App.tsx client/src/engine/onboardingFlow.test.ts client/src/engine/chainFlowDensity.test.ts client/src/engine/kritisLatePacing.test.ts
git commit -m "feat(onboarding): week 1 is event-only; pin deterministic first-week sequence

App scenario roll now starts in week 2 (as its comment always claimed),
so the day-1..3 onboarding chain can't be displaced. Sim copies in
chainFlowDensity/kritisLatePacing updated to match. New integration
test: 25 seeds x intermediate/kritis all serve first_day -> rundgang ->
erste_aufgabe.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 5: Mentor notes for the existing week-1 events

Week-1 mentor mode (Task 1) is inert on events without a `mentorNote` (`MentorNote` renders null on empty note). The three `week1.ts` events have none.

**Files:**
- Modify: `client/src/content/events/week1.ts` (events at lines 5, 41, 82)
- Test: `client/src/content/events/orientation.test.ts` (extend)

### Step 5.1 — Write the failing test

Add to `client/src/content/events/orientation.test.ts` (import `week1Events` from `./week1`):

```ts
import { week1Events } from './week1';

describe('week-1 mentor coverage', () => {
  it('every core week-1 event carries a mentorNote (mentor mode is on in week 1 everywhere)', () => {
    for (const e of week1Events) {
      expect(e.mentorNote, e.id).toBeTruthy();
    }
  });
});
```

### Step 5.2 — Run, expect failure

```bash
npm run test:client -- src/content/events/orientation.test.ts
```

Expected: fails listing `evt_first_day`, `evt_password_reset_wave`, `evt_drucker_fluch`.

### Step 5.3 — Minimal implementation

Add one `mentorNote` per event in `client/src/content/events/week1.ts` (place after the `choices` array, before `tags`, matching the `GameEvent` field order used in `orientation.ts`):

- `evt_first_day` (line 5ff):
  ```ts
  mentorNote:
    'Der erste Eindruck zählt: Die Chef-Beziehung ist eine der drei Niederlagen-Bedingungen — fällt sie auf das Minimum, ist die Probezeit vorbei. Deine Antworten bewegen die Werte oben in der Statusleiste.',
  ```
- `evt_password_reset_wave` (line 41ff):
  ```ts
  mentorNote:
    'Wiederkehrende Massenaufgaben skripten statt klicken: Get-ADUser + Set-ADAccountPassword in einer PowerShell-Pipeline machen aus drei Stunden zehn Minuten — und sparen Stress, den du sonst mit ins Wochenende nimmst.',
  ```
- `evt_drucker_fluch` (line 82ff):
  ```ts
  mentorNote:
    '"Bereit" am Gerät heißt nicht bereit am Server: Erst Druckerwarteschlange und Spooler-Dienst prüfen, dann Hardware und Treiber. Systematisches Eingrenzen schlägt Raten — auch beim Stresspegel.',
  ```

### Step 5.4 — Run, expect pass, commit

```bash
npm run test:client -- src/content/events/orientation.test.ts src/content/content.test.ts
git add client/src/content/events/week1.ts client/src/content/events/orientation.test.ts
git commit -m "feat(content): mentor notes for the three core week-1 events

Week-1 mentor mode is now on in every mode; without notes it renders
nothing. Guard test: every week1.ts event carries a mentorNote.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 6: StatsBar threshold legend (`?` toggle)

**Files:**
- Modify: `client/src/components/StatsBar/index.tsx` (header block, lines 96-109; imports line 1)
- Test (create): `client/src/components/StatsBar/StatsBar.legend.browser.test.tsx`

The legend derives every number from `modeConfig` (already destructured at lines 75-77: `totalWeeks`, `stressGameOver`, `complianceGameOver`, `chefRelationshipGameOver`) — same source as `getDefeatWarnings` (`bands.ts:72-87`), so a mode that moves a threshold moves its legend for free. Native `<button>` = keyboard-accessible (Enter/Space) with `aria-expanded`/`aria-controls`. The global shortcuts (`useKeyboardShortcuts.ts`: Escape/S/L) are untouched.

### Step 6.1 — Write the failing test

Create `client/src/components/StatsBar/StatsBar.legend.browser.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createInitialState } from '../../engine/gameState';
import { StatsBar } from './index';

describe('StatsBar threshold legend', () => {
  it('has a keyboard-accessible toggle that reveals the three lose thresholds', async () => {
    const user = userEvent.setup();
    render(<StatsBar state={createInitialState('SEED', 'intermediate')} />);

    const toggle = screen.getByRole('button', { name: /Werte-Erklärung/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/Burnout/)).not.toBeInTheDocument();

    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/Bei 100 → Burnout/)).toBeInTheDocument();
    expect(screen.getByText(/auf -100 → Kündigung/)).toBeInTheDocument();
    expect(screen.getByText(/auf 0% → BSI-Bußgeld/)).toBeInTheDocument();
    expect(screen.getByText(/12 Wochen Probezeit/)).toBeInTheDocument();

    await user.click(toggle);
    expect(screen.queryByText(/Burnout/)).not.toBeInTheDocument();
  });

  it('uses mode-specific thresholds (hard: burnout 90, compliance 10%, chef -80)', async () => {
    const user = userEvent.setup();
    render(<StatsBar state={createInitialState('SEED', 'hard')} />);
    await user.click(screen.getByRole('button', { name: /Werte-Erklärung/ }));
    expect(screen.getByText(/Bei 90 → Burnout/)).toBeInTheDocument();
    expect(screen.getByText(/auf 10% → BSI-Bußgeld/)).toBeInTheDocument();
    expect(screen.getByText(/auf -80 → Kündigung/)).toBeInTheDocument();
  });

  it('kritis shows the 24-week goal', async () => {
    const user = userEvent.setup();
    render(<StatsBar state={createInitialState('SEED', 'kritis')} />);
    await user.click(screen.getByRole('button', { name: /Werte-Erklärung/ }));
    expect(screen.getByText(/24 Wochen Probezeit/)).toBeInTheDocument();
  });
});
```

### Step 6.2 — Run, expect failure

```bash
npm run test:client -- src/components/StatsBar/StatsBar.legend.browser.test.tsx
```

Expected: `Unable to find an accessible element with the role "button" and name /Werte-Erklärung/`.

### Step 6.3 — Minimal implementation

In `client/src/components/StatsBar/index.tsx`:

1. Line 1: `import { useState } from 'react';` (new first import).
2. Inside `StatsBar` (after line 83 `const warnings = ...`): `const [showLegend, setShowLegend] = useState(false);`
3. In the header's right-hand cluster (lines 104-108), add the button next to the week display:

```tsx
        <div className="flex items-center gap-4">
          <span className="text-terminal-green-dim">
            Woche {state.currentWeek}/{totalWeeks} | {DAYS[state.currentDay]}
          </span>
          <button
            type="button"
            onClick={() => setShowLegend((v) => !v)}
            aria-expanded={showLegend}
            aria-controls="stats-legend"
            aria-label="Werte-Erklärung anzeigen"
            title="Was bedeuten die Anzeigen?"
            className="border border-terminal-border px-2 py-0.5 text-terminal-green-dim hover:text-terminal-green focus:outline-none focus-visible:ring-1 focus-visible:ring-terminal-green"
          >
            ?
          </button>
        </div>
```

4. Directly below the closing header `</div>` (after line 109), render the panel:

```tsx
      {/* Meter legend — derived from the mode's real thresholds, same source as getDefeatWarnings */}
      {showLegend && (
        <div
          id="stats-legend"
          className="mb-4 border border-terminal-border p-3 text-sm text-terminal-green-dim space-y-1"
        >
          <div>Stress: steigt durch Entscheidungen, sinkt über Nacht und am Wochenende. Bei {stressGameOver} → Burnout, Spiel vorbei.</div>
          <div>Chef-Beziehung: fällt sie auf {chefRelationshipGameOver} → Kündigung, Spiel vorbei.</div>
          <div>Compliance: fällt sie auf {complianceGameOver}% → BSI-Bußgeld, Spiel vorbei.</div>
          <div>Budget: kein Game Over — aber ohne Geld keine Anschaffungen und Maßnahmen.</div>
          <div>Skills &amp; übrige Beziehungen: kein Game Over — sie schalten bessere Optionen in Ereignissen frei.</div>
          <div>Ziel: {totalWeeks} Wochen Probezeit überstehen.</div>
        </div>
      )}
```

(Learning mode is unaffected — it returns the minimal `LearningModeHeader` at line 71-73 before this code.)

### Step 6.4 — Run, expect pass, then verify component suites

```bash
npm run test:client -- src/components/StatsBar
```

Expected: legend tests + existing `bands.test.ts` all pass.

### Step 6.5 — Commit

```bash
git add client/src/components/StatsBar/index.tsx client/src/components/StatsBar/StatsBar.legend.browser.test.tsx
git commit -m "feat(ui): stats-bar legend toggle explains every meter and its lose threshold

Keyboard-accessible [?] button in the StatsBar header; one line per
meter, numbers derived from the mode's config.thresholds (same source
as getDefeatWarnings), so per-mode thresholds render correctly.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 7: Final verification sweep

**Files:** none (verification only).

### Step 7.1 — Full test run

```bash
npm run test:client
```

Expected: green. Pay attention to the audit suites this feature brushes against:
- `src/engine/flowBalanceAudit.test.ts` — new events classified `decision`, `__continue__` list stays empty.
- `src/engine/chainFlowDensity.test.ts` / `chainPacingAudit.test.ts` / `chainThrottle.test.ts` — chain throttle unaffected (orientation events are non-chain, week 1).
- `src/engine/kritisLatePacing.test.ts` — weeks 13-24 pool untouched.
- `src/engine/campaignPacing.test.ts` — story mode untouched (orientation is mode-gated; story flow never calls `selectNextEvent`).
- `src/content/content.test.ts` — ids/prefixes/prereqs/floors.

### Step 7.2 — Type check

```bash
npm run build -w shared && npx tsc --noEmit -p client
```

Expected: no errors.

### Step 7.3 — Manual smoke (optional but recommended)

`npm run dev`, start a new run in **Standard**: day 1 must be "Der erste Tag", day 2 "Rundgang mit dem Chef" (mentor note visible on the result screen), day 3 "Bjorgs Willkommensgeschenk"; the `?` button on the stats bar toggles the legend; from week 2, mentor notes disappear. Repeat mode select with **KRITIS** for day 1-3 only.

### Step 7.4 — Confirm the non-goal

`git diff main -- shared/src/config/gameModes.ts` must be empty: `showHints` remains `false` for intermediate/hard/kritis. Terminal hints stay a Beginner/Learning privilege by design.
