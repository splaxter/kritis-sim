# True Branching Endings Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the single hidden-scalar ending (good/neutral/bad by score threshold) with 5 truly branching endings that combine story facts (ransom decision, official/underground path) with the score as a quality axis — and make `completedSidequests` genuinely count.

**Architecture:** `determineEnding` (shared/src/types/adventure.ts) becomes a pure decision tree over `{score, completedSidequests, storyPath, endingFlags}` returning a new `AdventureEndingId` union; `calculateAdventureEnding` (client/src/engine/adventureEngine.ts) feeds it derived flags. `ADVENTURE_ENDINGS` (client/src/content/adventure/endings.ts) is re-keyed to the 5 ids with two newly authored German texts. Downstream consumers (EndingScreen, metaProgress incl. localStorage migration, telemetry payload type, App.tsx replay teaser) switch from `EndingType` to `AdventureEndingId`; a new branched act-3 opening beat in ch09 signals the player's trajectory in-run.

**Tech Stack:** TypeScript monorepo (npm workspaces: shared/client), React 18, vitest (`npm run build -w shared && npx vitest run <path>` — the shared package must be rebuilt before every test run that touches shared code).

---

## Research findings (verified 2026-07-10)

### Current mechanism

- `shared/src/types/adventure.ts:146` — `export type EndingType = 'good' | 'neutral' | 'bad'`.
- `calculateEndingScore` (adventure.ts:220-246): 0–100 from relationships (chef 0–50, kollegen 0–20), +10 per completed sidequest, flag bonuses (`saved_early` +20, `found_evidence` +15, `team_prepared` +10, `trusted_by_all` +15) and penalties (`burned_bridges` −30, `ignored_warnings` −20, `blamed_others` −15). **Base state (relationships 0/0, nothing else) scores exactly 35.**
- `determineEnding` (adventure.ts:256-264): pure threshold — good ≥65, neutral ≥35, bad <35. **Ignores its `completedSidequests` and `storyPath` parameters** (documented as intentional at the time).
- `calculateAdventureEnding` (client/src/engine/adventureEngine.ts:474-486) is the only production call site; it composes `deriveEndingFlags` (line 457, from `ENDING_FLAG_SOURCES` at 447-455 + characterMemory trust) and `deriveStoryPath` (line 468: `chose_official_route` → official; `going_solo`/`wants_solo` → underground; else neutral).

### Story facts available at campaign end (all verified in content)

- **The path fork is mandatory and binary at campaign end.** `adv_chef_confrontation` (story-events.ts:933, ch06 beat02, non-optional, unbranched) has exactly 3 choices: one sets `chose_official_route`+`chef_informed` (line 951), the other two set `going_solo` (959, 966). `chose_official_route` can also be set earlier in `adv_late_night` (line 541: `called_bsi`). ⇒ **`deriveStoryPath` never returns `'neutral'` for a completed campaign** (kept only as a defensive fallback).
- **The ransom decision is mandatory and exclusive.** `adv_final_decision` (story-events.ts:2387, ch11 beat04): `no_ransom`+`final_resolve` (2407) | `feigned_negotiation`+`final_resolve` (2415) | `recommended_payment`+`ignored_warnings` (2422). `recommended_payment` and `ignored_warnings` are set **nowhere else** (grep-verified) — this is the "complicit" story fact.
- **The climax always resolves**: `adv_climax` (2509) always sets `climax_resolved` (+ one of `attack_repelled`/`improvised_win`/`hard_cut`), so even the complicit run ends with the pivot repelled — the bad_complicit text must respect that.
- Stefan/FENRIS/Brandt canon for the underground text: `adv_attacker_identity` (2243, Viktor Brandt = insider via Fernwartung, FENRIS signs its loaders, 23:47), `adv_predecessor_truth` (2295, Stefan lives at the Ostsee, PROJEKT_X = his own dossier; flags `stefan_returns`, `stefan_protected`, `stefan_dossier_complete`, `stefan_trusts_you`), `adv_real_target` (2343, pivot to Stadtwerke via Verbundkoppel).
- Bad-quality flags actually reachable in play: `burned_bridges` (`lone_wolf`, adv_alone_in_crisis:2228), `blamed_others` (adv_mayor_call:2155), `ignored_warnings` (only via ransom payment).

### The ending decision tree (design)

Ordered rules; first match wins — **total by construction** (rule 5 is the unconditioned remainder) and each branch reachable:

| # | Condition | Ending id | Quality | Narrative |
|---|-----------|-----------|---------|-----------|
| 1 | `endingFlags` contains `recommended_payment` | `bad_complicit` | bad | Paid the ransom, ignored own evidence — story fact trumps score |
| 2 | else `score < 35` | `bad_burned` | bad | Burned bridges, blamed others, got crushed (existing "Pech gehabt" text) |
| 3 | else `score >= 65` **or** (`score >= 55` and `completedSidequests >= 3`) and `storyPath === 'underground'` | `good_underground` | good | FENRIS exposed via Stefan's route (new text "Stefans Weg") |
| 4 | same good bar, `storyPath !== 'underground'` (official + defensive neutral) | `good_official` | good | FENRIS exposed through proper channels (existing "Der Held" text — already BSI/Reinhardt-flavored) |
| 5 | else | `neutral_survived` | neutral | Survived, truth half-buried (existing "Gerade so" text) |

`completedSidequests` now genuinely counts: 3+ completed sidequests lower the good bar from 65 to 55 (on top of their existing +10-each score contribution). Sidequests still **never gate** the good tier (canon: campaign must resolve without the sidequest layer). Score stays the quality axis; story facts do the branching. 5 endings (spec target 5–6; a 6th neutral split adds no distinct narrative — YAGNI).

### Downstream consumers of "exactly 3 endings" (all found)

| Consumer | Location | What breaks |
|---|---|---|
| `ADVENTURE_ENDINGS` | client/src/content/adventure/endings.ts:10 | `Record<EndingType, …>` keyed good/neutral/bad |
| EndingScreen | client/src/components/EndingScreen/index.tsx:24 (`ending: EndingType`), replay block 110-137 | text lookup + `endingsSeen/totalEndings` display |
| metaProgress | client/src/engine/metaProgress.ts:21 (`endingsSeen: EndingType[]`), :82, :133 (`TOTAL_STORY_ENDINGS = 3`) | **persisted** legacy values `'good'|'neutral'|'bad'` in localStorage need read-time migration |
| App.tsx | :510 menu "Story-Enden: x/3", :620-646 replay teaser (`otherEndingTitles`, `untakenForkHint`) | teaser filters `Object.keys(ADVENTURE_ENDINGS)` |
| telemetry | shared/src/types/telemetry.ts:33 (`ending?: EndingType`), client/src/engine/telemetry.test.ts:38-44 | payload type (fire-and-forget; no server reader — backend removed) |
| Tests | client/src/engine/adventureEnding.test.ts:43-54 + 118-156, adventureEngine.test.ts:338-346, metaProgress.test.ts:24-34, EndingScreen.browser.test.tsx:20-45 (asserts keys `['bad','good','neutral']` and "1/3") | threshold + key-set assertions |
| RunSummaryScreen | client/src/components/RunSummaryScreen/ | **NOT a real consumer** — only its test constructs `meta.endingsSeen: []`; component renders no ending ids. No change needed. |
| Saves | autosave persists `GameState` only; the ending is recomputed from flags at display time → old mid-run saves keep working unchanged. Only metaProgress persists ending ids. | migration in Task 4 |

### Act-break / in-run-signaling mechanism (for Task 7)

The act-break ("Fortsetzung folgt", `isAtAuthoredStoryEnd` in adventureEngine.ts:188 + `getActBreakBody` in content/adventure/actBreaks.ts) **no longer fires** — all 12 chapters are authored (campaignConsistency.test.ts:23-36, `KNOWN_WIP_CHAPTERS = []`). The right hook is therefore the ordinary beat mechanism: a new beat in `ch09_attack` (chapters.ts:166-181) using the existing `branchCondition`/`alternateEventId` pattern (as ch04 beat04 and ch06 beat03 already do). Chef-standing reflection uses the existing `unlocks: ['flag']` choice gate (eventEngine.ts:156-179 shows choices with `unlocks` render only when the flag is set). Guards that auto-cover new ch09 beats: campaignConsistency "no dangling beat refs" + "Act 3 choice design rules" (≥2 ungated choices, resultText non-empty; campaignConsistency.test.ts:174-202).

**Known wrinkle:** inserting a beat into ch09 shifts `currentBeatIndex` for autosaves parked mid-ch09 by one beat (they resume on valid, slightly offset content — no crash, self-heals at chapter end). Accepted; noted here deliberately.

---

## Task 1: Shared types — `AdventureEndingId` + reworked `determineEnding`

**Files:**
- Modify: `shared/src/types/adventure.ts` (replace lines 248-264; add types near line 146)
- Test: `client/src/engine/adventureEnding.test.ts` (replace `describe('determineEnding thresholds')`, lines 43-54)
- Test: `client/src/engine/adventureEngine.test.ts` (update lines 338-346)

**Step 1.1 — failing test.** In `client/src/engine/adventureEnding.test.ts`, replace the `determineEnding thresholds` describe block (lines 43-54) with:

```ts
import { ENDING_IDS, endingQuality, EndingInput } from '@kritis/shared';
// (merge into the existing @kritis/shared import at the top of the file)

describe('determineEnding decision tree', () => {
  const base: EndingInput = {
    score: 50,
    completedSidequests: 0,
    storyPath: 'official',
    endingFlags: [],
  };

  // Table-driven: every branch + every boundary.
  const cases: Array<[string, Partial<EndingInput>, string]> = [
    // Rule 1: complicity trumps everything, even a hero score.
    ['payment recommended, high score', { score: 90, endingFlags: ['recommended_payment'] }, 'bad_complicit'],
    ['payment recommended, low score', { score: 10, endingFlags: ['recommended_payment'] }, 'bad_complicit'],
    ['payment recommended, underground', { score: 90, storyPath: 'underground', endingFlags: ['recommended_payment'] }, 'bad_complicit'],
    // Rule 2: crushed.
    ['score 34 official', { score: 34 }, 'bad_burned'],
    ['score 0 underground', { score: 0, storyPath: 'underground' }, 'bad_burned'],
    // Rule 3/4: good tier, path split.
    ['score 65 official', { score: 65 }, 'good_official'],
    ['score 65 underground', { score: 65, storyPath: 'underground' }, 'good_underground'],
    ['score 100 neutral-path fallback', { score: 100, storyPath: 'neutral' }, 'good_official'],
    // Sidequests genuinely count: 3+ lower the good bar to 55.
    ['score 55 + 3 sidequests official', { score: 55, completedSidequests: 3 }, 'good_official'],
    ['score 55 + 3 sidequests underground', { score: 55, completedSidequests: 3, storyPath: 'underground' }, 'good_underground'],
    ['score 55 + 2 sidequests is NOT good', { score: 55, completedSidequests: 2 }, 'neutral_survived'],
    ['score 54 + 3 sidequests is NOT good', { score: 54, completedSidequests: 3 }, 'neutral_survived'],
    // Rule 5: remainder.
    ['score 35 base', { score: 35 }, 'neutral_survived'],
    ['score 64 official', { score: 64 }, 'neutral_survived'],
    ['score 64 underground', { score: 64, storyPath: 'underground' }, 'neutral_survived'],
  ];

  it.each(cases)('%s → %s', (_name, overrides, expected) => {
    expect(determineEnding({ ...base, ...overrides })).toBe(expected);
  });

  it('is total: every score×path×flag×sidequest combo yields exactly one known id', () => {
    for (let score = 0; score <= 100; score += 5) {
      for (const storyPath of ['official', 'underground', 'neutral'] as const) {
        for (const endingFlags of [[], ['recommended_payment'], ['burned_bridges']]) {
          for (const completedSidequests of [0, 3, 6]) {
            const id = determineEnding({ score, completedSidequests, storyPath, endingFlags });
            expect(ENDING_IDS).toContain(id);
          }
        }
      }
    }
  });

  it('endingQuality maps every id to a quality tier', () => {
    expect(endingQuality('good_official')).toBe('good');
    expect(endingQuality('good_underground')).toBe('good');
    expect(endingQuality('neutral_survived')).toBe('neutral');
    expect(endingQuality('bad_complicit')).toBe('bad');
    expect(endingQuality('bad_burned')).toBe('bad');
  });
});
```

**Step 1.2 — run, expect failure.**
```bash
npm run build -w shared && npx vitest run client/src/engine/adventureEnding.test.ts
```
Expected: FAIL — `@kritis/shared` has no export `ENDING_IDS` / `endingQuality`, and `determineEnding` rejects the object argument.

**Step 1.3 — implementation.** In `shared/src/types/adventure.ts`, below line 146 (`EndingType`), add:

```ts
/**
 * The five true endings. `EndingType` survives as the QUALITY axis
 * (good/neutral/bad); the id carries the narrative branch.
 */
export type AdventureEndingId =
  | 'good_official'
  | 'good_underground'
  | 'neutral_survived'
  | 'bad_complicit'
  | 'bad_burned';

export const ENDING_IDS: readonly AdventureEndingId[] = [
  'good_official',
  'good_underground',
  'neutral_survived',
  'bad_complicit',
  'bad_burned',
] as const;

export function endingQuality(id: AdventureEndingId): EndingType {
  if (id === 'good_official' || id === 'good_underground') return 'good';
  if (id === 'neutral_survived') return 'neutral';
  return 'bad';
}
```

Replace `determineEnding` (lines 248-264, including its old doc comment) with:

```ts
export interface EndingInput {
  /** Quality axis from calculateEndingScore, clamped 0–100. */
  score: number;
  completedSidequests: number;
  storyPath: StoryPath;
  /** Derived ending flags (deriveEndingFlags), incl. recommended_payment. */
  endingFlags: string[];
}

/**
 * Ending decision tree — ordered rules, first match wins, total by
 * construction (the last rule is the unconditioned remainder):
 *   1. recommended_payment           → bad_complicit   (story fact trumps score)
 *   2. score < 35                    → bad_burned
 *   3. good bar reached + underground→ good_underground
 *   4. good bar reached + otherwise  → good_official   ('neutral' path is a
 *      defensive fallback only — adv_chef_confrontation forces the fork)
 *   5. remainder                     → neutral_survived
 * Good bar: score >= 65, OR score >= 55 with >= 3 completed sidequests —
 * sidequests help (here and via +10 score each) but never gate the good tier.
 */
export function determineEnding(input: EndingInput): AdventureEndingId {
  const { score, completedSidequests, storyPath, endingFlags } = input;
  if (endingFlags.includes('recommended_payment')) return 'bad_complicit';
  if (score < 35) return 'bad_burned';
  const goodBar = score >= 65 || (score >= 55 && completedSidequests >= 3);
  if (!goodBar) return 'neutral_survived';
  return storyPath === 'underground' ? 'good_underground' : 'good_official';
}
```

**Step 1.4 — fix the other direct caller's assertions.** In `client/src/engine/adventureEngine.test.ts` lines 338-346, replace the old positional calls:

```ts
    expect(determineEnding({ score: 75, completedSidequests: 0, storyPath: 'official', endingFlags: [] })).toBe('good_official');
    expect(determineEnding({ score: 65, completedSidequests: 0, storyPath: 'official', endingFlags: [] })).toBe('good_official');
    // (keep surrounding structure; the 64/34 lines:)
    expect(determineEnding({ score: 64, completedSidequests: 3, storyPath: 'official', endingFlags: [] })).toBe('neutral_survived');
    expect(determineEnding({ score: 34, completedSidequests: 3, storyPath: 'official', endingFlags: [] })).toBe('bad_burned');
```

Note: `calculateAdventureEnding` in adventureEngine.ts still calls the old signature — TypeScript build of shared succeeds (shared doesn't import client), but the engine integration tests in adventureEnding.test.ts (`calculateAdventureEnding … toBe('good')`) will fail until Task 2. **Run only the two touched describe blocks now**; Task 2 restores full-file green.

**Step 1.5 — run, expect pass.**
```bash
npm run build -w shared && npx vitest run client/src/engine/adventureEnding.test.ts -t 'determineEnding'
npx vitest run client/src/engine/adventureEngine.test.ts
```
Expected: the `determineEnding` blocks pass (other blocks in adventureEnding.test.ts still red — fixed next task).

**Step 1.6 — commit.**
```bash
git add shared/src/types/adventure.ts client/src/engine/adventureEnding.test.ts client/src/engine/adventureEngine.test.ts
git commit -m "feat(endings): decision-tree determineEnding with 5 AdventureEndingIds

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 2: Engine — derive `recommended_payment`, return ending ids

**Files:**
- Modify: `client/src/engine/adventureEngine.ts` (ENDING_FLAG_SOURCES 447-455, `calculateAdventureEnding` 474-486)
- Test: `client/src/engine/adventureEnding.test.ts` (integration blocks, lines 56-156)

**Step 2.1 — failing test.** In `adventureEnding.test.ts`, update the integration expectations to ids and add the complicity derivation:

```ts
// in describe('deriveEndingFlags'):
  it('passes recommended_payment through as an ending fact', () => {
    const s = storyState({ flags: { recommended_payment: true } });
    expect(deriveEndingFlags(s)).toContain('recommended_payment');
  });

// in describe('calculateAdventureEnding …') change expectations:
//   hero profile        → 'good_official'
//   middling profile    → 'neutral_survived'
//   scorched-earth      → 'bad_burned'
// and add:
  it('ransom payment forces bad_complicit even on a hero profile', () => {
    const s = storyState({
      flags: {
        isolated_systems: true, has_stefan_dossier: true, restore_tested: true,
        chose_official_route: true, recommended_payment: true, ignored_warnings: true,
      },
    });
    s.relationships.chef = 40;
    s.relationships.kollegen = 60;
    expect(calculateAdventureEnding(s)).toBe('bad_complicit');
  });
  it('hero profile on the solo route => good_underground', () => {
    const s = storyState({ flags: { isolated_systems: true, has_stefan_dossier: true, restore_tested: true, going_solo: true } });
    s.relationships.chef = 40;
    s.relationships.kollegen = 60;
    s.storyState!.characterMemory = {
      chef: { npcId: 'chef', interactions: 5, trustLevel: 60, memorableEvents: [], currentArc: 'friend' },
      kollegen: { npcId: 'kollegen', interactions: 9, trustLevel: 80, memorableEvents: [], currentArc: 'ally' },
    };
    expect(calculateAdventureEnding(s)).toBe('good_underground');
  });
```

Also update `describe('campaign paths reach all three endings')` (lines 118-156): rename to `'campaign walkability + ending profiles'` and change the three `toBe('good'/'bad'/'neutral')` to `'good_official'/'bad_burned'/'neutral_survived'`.

**Step 2.2 — run, expect failure.**
```bash
npm run build -w shared && npx vitest run client/src/engine/adventureEnding.test.ts
```
Expected: FAIL — `calculateAdventureEnding` still returns `'good'`; `deriveEndingFlags` drops `recommended_payment` (not in ENDING_FLAG_SOURCES, not in storyState.endingFlags).

**Step 2.3 — implementation.** In `adventureEngine.ts`:

1. Add to `ENDING_FLAG_SOURCES` (after line 453 `ignored_warnings`):
```ts
  recommended_payment: ['recommended_payment'],
```
2. Replace `calculateAdventureEnding` (474-486):
```ts
export function calculateAdventureEnding(state: GameState): AdventureEndingId {
  if (!state.storyState) {
    return 'neutral_survived';
  }

  const endingFlags = deriveEndingFlags(state);
  const score = calculateEndingScore(
    { chef: state.relationships.chef, kollegen: state.relationships.kollegen },
    state.storyState.completedSidequests,
    endingFlags
  );

  return determineEnding({
    score,
    completedSidequests: state.storyState.completedSidequests.length,
    storyPath: deriveStoryPath(state),
    endingFlags,
  });
}
```
3. Update the import at line 14: swap `EndingType` for `AdventureEndingId` (keep the rest).

**Step 2.4 — run, expect pass.**
```bash
npm run build -w shared && npx vitest run client/src/engine/adventureEnding.test.ts client/src/engine/adventureEngine.test.ts
```

**Step 2.5 — commit.**
```bash
git add client/src/engine/adventureEngine.ts client/src/engine/adventureEnding.test.ts
git commit -m "feat(endings): engine derives complicity fact and returns branching ending ids

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 3: Content — 5 ending texts + EndingScreen prop

**Files:**
- Modify: `client/src/content/adventure/endings.ts` (re-key record, add 2 texts)
- Modify: `client/src/components/EndingScreen/index.tsx` (line 1 import, line 24 prop type)
- Test: `client/src/components/EndingScreen/EndingScreen.browser.test.tsx` (lines 20, 26-34, 44-45)

**Step 3.1 — failing test.** In `EndingScreen.browser.test.tsx`: change every `ending: 'good'` / `ADVENTURE_ENDINGS.good` to `'good_official'` / `ADVENTURE_ENDINGS.good_official`, the replay fixture to `endingsSeen: 2, totalEndings: 5` (assertion `/2\/5/`), `otherEndingTitles` to two of the new titles, and the completeness assertion (line 44) to:

```ts
    expect(Object.keys(ADVENTURE_ENDINGS).sort()).toEqual(
      ['bad_burned', 'bad_complicit', 'good_official', 'good_underground', 'neutral_survived'],
    );
```
(keep the loop asserting every entry has title/paragraphs/epilogue).

**Step 3.2 — run, expect failure.**
```bash
npm run build -w shared && npx vitest run client/src/components/EndingScreen/EndingScreen.browser.test.tsx
```
Expected: FAIL — `ADVENTURE_ENDINGS.good_official` undefined.

**Step 3.3 — implementation.** In `endings.ts`: change the import to `AdventureEndingId`, re-key the record, keep the three existing texts verbatim under their closest new ids (`good` → `good_official`, `neutral` → `neutral_survived`, `bad` → `bad_burned`; update the inner `id:` fields to match the key), and add the two new entries:

```ts
export const ADVENTURE_ENDINGS: Record<AdventureEndingId, AdventureEndingText> = {
  good_official: { id: 'good_official', /* existing "Der Held" text unchanged */ },

  good_underground: {
    id: 'good_underground',
    title: 'Stefans Weg',
    paragraphs: [
      'Der Chef legt eine Mappe auf den Tisch — aber diesmal bist du es, der nervös ist. Bert hat erst vor achtundvierzig Stunden erfahren, was du monatelang an ihm vorbei ermittelt hast. Er blättert lange. Dann schiebt er dir die Mappe zu: "Unbefristet." Pause. "Und beim nächsten Mal", sagt er ruhig, "trauen Sie mir früher. Ich bin auf Ihrer Seite. War ich die ganze Zeit."',
      'Es war nicht der Dienstweg, der FENRIS zu Fall gebracht hat. Es war Stefans Ordner. Vierzehn Monate Dokumentation, versteckt gehalten von einem Mann, den alle für verrückt erklärt hatten — und zu Ende geführt von dir, im Alleingang, mit Jens als einzigem Mitwisser. Als ihr die Beweismappe schließlich übergeben habt, komplett, mit Honeypot-Mitschnitten und lückenloser Timeline, brauchte Frau Dr. Reinhardt vom BSI zehn Minuten. "Damit", sagte sie, "können wir arbeiten."',
      'Viktor Brandt sitzt in Untersuchungshaft. Seine Wartungsfirma hat in sechs Kommunen die Verträge verloren, und FENRIS\' Infrastruktur wird Server um Server zerlegt. Offiziell war es "ein Hinweis aus der Verwaltung". Inoffiziell wissen die, die es wissen müssen, genau, wessen Weg das war: Stefan hat ihn begonnen. Du bist ihn zu Ende gegangen.',
      'Jens drückt dir wortlos einen Kaffee in die Hand — das ist bei ihm eine Rede. Henry boxt dir gegen die Schulter. Und Bjorg erzählt im Flur jedem, der nicht schnell genug wegläuft, er habe "von Anfang an gewusst, dass da was im Busch ist — Bauchgefühl, kennste? Kennste?" Er wusste nichts. Niemand korrigiert ihn.',
      'Die Müllabfuhr fährt. Das Wasser läuft. Das Licht brennt. Und in einem Büro an der Ostsee packt ein Mann seine Sachen, um nach Hause zu kommen.',
    ],
    epilogue:
      'Drei Monate später: Stefan sitzt zwei Büros weiter, offiziell rehabilitiert, mit einer Kaffeetasse, auf der "Ich hatte recht" steht — ein Geschenk von Jens, der dafür extra einen Druckauftrag ausgelöst hat. Auf deinem Schreibtisch liegt PROJEKT_X, abgeschlossen, mit zwei Namen auf dem Deckblatt: seinem und deinem. Und um 23:47 ist im Netzwerk: nichts. Ihr schaut trotzdem beide noch manchmal hin. Alte Gewohnheit. Gemeinsame Gewohnheit.',
  },

  neutral_survived: { id: 'neutral_survived', /* existing "Gerade so" text unchanged */ },

  bad_complicit: {
    id: 'bad_complicit',
    title: 'Der teure Frieden',
    paragraphs: [
      'Die 500 Bitcoin sind weg. Das versprochene Entschlüsselungs-Tool war ein halbgares Stück Software, das die Hälfte der Dateien geschrottet hat — den Rest habt ihr am Ende doch selbst wiederherstellen müssen, aus den Backups, für die niemand dir danken wird. Der Kämmerer nennt es trotzdem "eine betriebswirtschaftlich vertretbare Entscheidung". Er ist der Einzige.',
      'Den Pivot aufs Stromnetz habt ihr in letzter Sekunde abgewehrt — das rechnet dir niemand an, denn offiziell hat es ihn nie gegeben. Die Beweismappe gegen Brandt wurde nie finalisiert: Wer zahlt, will keinen Prozess, bei dem die eigene Zahlung im Protokoll steht. Brandts Firma verliert still den Wartungsvertrag und macht weiter — eine Kommune weiter, ein Fernwartungsfenster weiter. FENRIS hat, was es wollte: Geld, Ruhe und ein Erfolgsmodell.',
      'Bert unterschreibt deine Weiterbeschäftigung. Er ist nicht nachtragend, das ist nicht seine Art. Aber als er dir die Mappe gibt, sagt er leise: "Sie wussten es besser. Ich habe es in Ihrem Gesicht gesehen, als Sie es empfohlen haben." Er lässt die Tür offen, als er geht. Das ist das Schlimmste daran.',
      'Jens beantragt in derselben Woche seine Versetzung in die Leitstelle der Stadtwerke. Er verabschiedet sich korrekt, mit Handschlag — Jens ist Profi. Aber das lange, langsame Nicken bekommst du nicht mehr. Henry hilft ihm beim Kistentragen. Nur Bjorg findet alles halb so wild: "Geld ist Geld, Daten sind Daten — Hauptsache, der Laden läuft, kennste?" Zum ersten Mal ist seine Stimme die lauteste im Raum, weil die anderen schweigen.',
    ],
    epilogue:
      'Drei Monate später: Die Systeme laufen, die Müllabfuhr fährt, und im Haushaltsplan steht eine neue Position namens "IT-Sonderaufwand", über die niemand spricht. Um 23:47 wirfst du einen Blick auf die Logs — Gewohnheit. Da ist ein Eintrag. Ein Verbindungsversuch, sauber abgewiesen, mit einer Signatur, die du kennst. Sie sind zurück. Natürlich sind sie zurück. Du hast die nächste Welle selbst bezahlt.',
  },

  bad_burned: { id: 'bad_burned', /* existing "Pech gehabt" text unchanged */ },
};
```

Canon check (docs in memory): Bert = competent, supportive, not vindictive ✓ (he re-signs even in bad_complicit, disappointment stays professional); Jens/Henry competent ✓ (Jens' transfer is a professional consequence, not a tantrum); Bjorg = loud boomer-humor delegator ✓ ("kennste?"); Stefan/FENRIS/Brandt facts match adv_attacker_identity / adv_predecessor_truth / adv_real_target.

In `EndingScreen/index.tsx`: line 1 `import { AdventureEndingId } from '@kritis/shared';`, line 24 `ending: AdventureEndingId;`. No render logic changes — the replay block (110-137) is data-driven.

**Step 3.4 — run, expect pass.**
```bash
npm run build -w shared && npx vitest run client/src/components/EndingScreen/EndingScreen.browser.test.tsx
```

**Step 3.5 — commit.**
```bash
git add client/src/content/adventure/endings.ts client/src/components/EndingScreen/index.tsx client/src/components/EndingScreen/EndingScreen.browser.test.tsx
git commit -m "feat(endings): author Stefans Weg and Der teure Frieden; re-key ending texts to 5 ids

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 4: metaProgress — id-typed `endingsSeen` + legacy migration

**Files:**
- Modify: `client/src/engine/metaProgress.ts` (lines 12, 21, 82, 67, 133)
- Test: `client/src/engine/metaProgress.test.ts`

**Step 4.1 — failing test.** In `metaProgress.test.ts`, update existing literals (`'neutral'` → `'neutral_survived'`, `'good'` → `'good_official'`, assertion `['good','neutral']` → `['good_official','neutral_survived']`) and add:

```ts
  it('migrates legacy 3-ending ids in stored meta on read', () => {
    const s = memoryStorage(); // use the file's existing in-memory storage helper
    s.setItem('kritis_meta_p1', JSON.stringify({
      version: 1, runsCompleted: 2, endingsSeen: ['good', 'bad'],
      bestScoreByMode: {}, lastRunAt: new Date().toISOString(), countedSeeds: ['a'],
    }));
    const meta = readMeta('p1', s);
    expect(meta.endingsSeen.sort()).toEqual(['bad_burned', 'good_official']);
    expect(meta.runsCompleted).toBe(2); // migration must not reset progress
  });

  it('TOTAL_STORY_ENDINGS matches the id universe', () => {
    expect(TOTAL_STORY_ENDINGS).toBe(5);
  });
```

**Step 4.2 — run, expect failure.**
```bash
npm run build -w shared && npx vitest run client/src/engine/metaProgress.test.ts
```
Expected: FAIL — migration missing, constant still 3.

**Step 4.3 — implementation.** In `metaProgress.ts`:

```ts
import { AdventureEndingId, ENDING_IDS, GameModeId } from '@kritis/shared'; // line 12

// MetaProgress (line 21):    endingsSeen: AdventureEndingId[];
// RunRecord   (line 82):     ending?: AdventureEndingId;

/** Pre-branching metas stored 'good'|'neutral'|'bad' — map to closest new id. */
const LEGACY_ENDING_MAP: Record<string, AdventureEndingId> = {
  good: 'good_official',      // old good text was the BSI/official ending
  neutral: 'neutral_survived',
  bad: 'bad_burned',
};

function migrateEndingsSeen(raw: unknown): AdventureEndingId[] {
  if (!Array.isArray(raw)) return [];
  const out = new Set<AdventureEndingId>();
  for (const e of raw) {
    if (typeof e !== 'string') continue;
    if ((ENDING_IDS as readonly string[]).includes(e)) out.add(e as AdventureEndingId);
    else if (LEGACY_ENDING_MAP[e]) out.add(LEGACY_ENDING_MAP[e]);
  }
  return [...out];
}

// readMeta line 67 becomes:
//   endingsSeen: migrateEndingsSeen(parsed.endingsSeen),

export const TOTAL_STORY_ENDINGS = ENDING_IDS.length; // line 133
```

Keep `META_VERSION = 1` — migration is value-level, wiping `runsCompleted` for a version bump would be user-hostile.

**Step 4.4 — run, expect pass.** Same command as 4.2.

**Step 4.5 — commit.**
```bash
git add client/src/engine/metaProgress.ts client/src/engine/metaProgress.test.ts
git commit -m "feat(endings): metaProgress tracks 5 ending ids, migrates legacy good/neutral/bad

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 5: Telemetry type + App.tsx + full-suite/typecheck gate

**Files:**
- Modify: `shared/src/types/telemetry.ts` (line 8 import, line 33)
- Modify: `client/src/App.tsx` (only if tsc complains — the data flow is already generic; line 510 and 623-638 pick up 5 endings automatically via `TOTAL_STORY_ENDINGS` and `Object.keys(ADVENTURE_ENDINGS)`)
- Test: `client/src/engine/telemetry.test.ts` (lines 38, 44)

**Step 5.1 — failing test.** In `telemetry.test.ts` change `ending: 'good'` → `ending: 'good_official'` (line 38) and the assertion (line 44) to `toBe('good_official')`.

**Step 5.2 — run, expect failure (type-level).**
```bash
npm run build -w shared && npx vitest run client/src/engine/telemetry.test.ts
```
vitest (esbuild) may pass at runtime — the authoritative failure is the typecheck:
```bash
npm run build
```
Expected: tsc error in client — `RunCompletedPayload.ending` is `EndingType`, got `AdventureEndingId`.

**Step 5.3 — implementation.** `shared/src/types/telemetry.ts`: line 8 `import { AdventureEndingId } from './adventure';`, line 33 `ending?: AdventureEndingId;`. Telemetry is fire-and-forget (backend removed per docs/plans/2026-07-07-backend-removal.md) — no reader migration needed.

**Step 5.4 — gate: whole suite + typecheck must be green.**
```bash
npm run build && npm test
```
Expected: both pass. This commit is the "no consumer left behind" checkpoint — any missed 3-ending assumption surfaces here.

**Step 5.5 — commit.**
```bash
git add shared/src/types/telemetry.ts client/src/engine/telemetry.test.ts client/src/App.tsx
git commit -m "feat(endings): telemetry carries branching ending ids; typecheck gate green

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 6: Reachability proof — every ending, from real play profiles

**Files:**
- Test: `client/src/engine/adventureEnding.test.ts` (new describe block)

**Step 6.1 — failing-first test.** Add a table that builds each profile ONLY from flags actually set by authored choices (see research section for provenance) and asserts the full mapping — this is the tree's reachability proof and its regression lock:

```ts
describe('every ending is reachable from an authored play profile', () => {
  type Profile = {
    name: string;
    flags: Record<string, boolean>;
    chef?: number;
    kollegen?: number;
    trust?: boolean; // give 2 NPCs trust >= 50 (trusted_by_all)
    sidequests?: string[];
    expected: string;
  };

  const profiles: Profile[] = [
    {
      // ch06 official_route, ch10 backup, ch11 no_ransom, ch12 lessons_learned
      name: 'official hero',
      flags: { chose_official_route: true, isolated_systems: true, has_stefan_dossier: true, restore_tested: true, no_ransom: true },
      chef: 40, kollegen: 60, trust: true,
      expected: 'good_official',
    },
    {
      // ch06 go_solo, ch11 take_his_files (stefan_dossier_complete+found_evidence), climax repelled
      name: 'underground hero (Stefans Weg)',
      flags: { going_solo: true, stefan_dossier_complete: true, found_evidence: true, attack_repelled: true, restore_tested: true },
      chef: 20, kollegen: 60, trust: true,
      expected: 'good_underground',
    },
    {
      // fork taken (mandatory), nothing else distinguished — base score 35
      name: 'muddled-through survivor',
      flags: { chose_official_route: true },
      expected: 'neutral_survived',
    },
    {
      // ch11 recommend_payment — even alongside good facts
      name: 'complicit (paid the ransom)',
      flags: { chose_official_route: true, recommended_payment: true, ignored_warnings: true, has_stefan_dossier: true },
      chef: 30, kollegen: 20,
      expected: 'bad_complicit',
    },
    {
      // ch10 lone_wolf (burned_bridges) + ch10 mayor blame + hostile relationships
      name: 'burned (went loud, got crushed)',
      flags: { going_solo: true, burned_bridges: true, lone_wolf: true, blamed_others: true },
      chef: -40, kollegen: -20,
      expected: 'bad_burned',
    },
  ];

  it.each(profiles.map((p) => [p.name, p] as const))('%s → %s', (_n, p) => {
    const s = storyState({ flags: p.flags });
    s.relationships.chef = p.chef ?? 0;
    s.relationships.kollegen = p.kollegen ?? 0;
    if (p.trust) {
      s.storyState!.characterMemory = {
        chef: { npcId: 'chef', interactions: 5, trustLevel: 60, memorableEvents: [], currentArc: 'friend' },
        kollegen: { npcId: 'kollegen', interactions: 9, trustLevel: 80, memorableEvents: [], currentArc: 'ally' },
      };
    }
    if (p.sidequests) s.storyState!.completedSidequests = p.sidequests;
    expect(calculateAdventureEnding(s)).toBe(p.expected);
  });

  it('every ending id has a reaching profile (coverage of the id universe)', () => {
    expect(new Set(profiles.map((p) => p.expected))).toEqual(new Set(ENDING_IDS));
  });

  it('sidequests bump a near-miss into the good tier (they genuinely count)', () => {
    const near = storyState({ flags: { chose_official_route: true, restore_tested: true, has_stefan_dossier: true } });
    // score without sidequests: 35 (relationships 0) + 10 + 15 = 60 → neutral
    expect(calculateAdventureEnding(near)).toBe('neutral_survived');
    near.storyState!.completedSidequests = ['sq_coffee_machine', 'sq_haunted_printer', 'sq_network_optimization'];
    // +30 score AND >= 3 quests → good bar (90 >= 65 anyway) → good_official
    expect(calculateAdventureEnding(near)).toBe('good_official');
  });
});
```

**Step 6.2 — run.**
```bash
npm run build -w shared && npx vitest run client/src/engine/adventureEnding.test.ts
```
Expected: PASS if Tasks 1-2 were faithful (this is a proof, not new behavior). If any profile fails, fix the tree/derivation — not the profile — unless the profile's arithmetic is wrong (recompute against calculateEndingScore before touching production code).

**Step 6.3 — commit.**
```bash
git add client/src/engine/adventureEnding.test.ts
git commit -m "test(endings): reachability proof — each of the 5 endings from an authored play profile

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 7: In-run signaling — branched act-3 opening beat in ch09

**Files:**
- Modify: `client/src/content/adventure/chapters.ts` (ch09 storyBeats, line ~171)
- Modify: `client/src/content/adventure/story-events.ts` (2 new events, insert after `adv_ransomware_strike`)
- Test: `client/src/engine/adventureEnding.test.ts` (walkCampaign assertions, lines 118-145)

**Step 7.1 — failing test.** In the walk tests (adventureEnding.test.ts:118-145):

```ts
// in 'hero path' walk (flags include chose_official_route):
    expect(served).toContain('adv_storm_briefing_official');
// in 'alternate path' walk (empty flags → solo variant serves as alternate):
    expect(served).toContain('adv_storm_briefing_solo');
```

**Step 7.2 — run, expect failure.**
```bash
npm run build -w shared && npx vitest run client/src/engine/adventureEnding.test.ts
```
Expected: FAIL — events not served (not authored, not in ch09).

**Step 7.3 — implementation.**

1. `chapters.ts` — insert into `ch09_attack.storyBeats` directly AFTER `beat01` (`adv_ransomware_strike`), before `beat_gui_contain`:

```ts
      {
        id: 'beat01b_storm_briefing',
        eventId: 'adv_storm_briefing_official',
        isOptional: false,
        branchCondition: 'chose_official_route',
        alternateEventId: 'adv_storm_briefing_solo',
      },
```
(Known wrinkle from research: shifts `currentBeatIndex` for autosaves parked mid-ch09 by one — resumes on valid content, self-heals at chapter end. Accepted.)

2. `story-events.ts` — insert after the `adv_ransomware_strike` object (line ~1896). Both events reflect the trajectory (path + chef standing) so the eventual ending doesn't feel arbitrary; chef standing uses the `unlocks` flag-gate (renders only when the flag is set — eventEngine.ts:156-179):

```ts
  {
    id: 'adv_storm_briefing_official',
    title: 'Lagebesprechung im Sturm',
    category: 'story',
    weekRange: [9, 9],
    probability: 1,
    description: `Eine Stunde nach dem Einschlag zieht Jens dich in den Serverraum. Auf seinem Block: drei Stichpunkte, mehr braucht er nie.

"Kurze Standortbestimmung", sagt er. "Wir sind offiziell unterwegs. Reinhardt beim BSI hat unser Aktenzeichen, die Meldekette steht, und Bert weiß, was wir wissen. Das heißt: Wenn das hier vorbei ist, gibt es Akten, Zeugen und einen sauberen Fall — oder es gibt sehr offizielle Fragen, warum es keinen gibt."

Er schaut dich an. "Wie wir JETZT auftreten, entscheidet, welche von beiden Geschichten am Ende über uns erzählt wird."`,
    involvedCharacters: ['kollege'],
    tags: ['story', 'chapter9', 'act3', 'signal'],
    choices: [
      {
        id: 'by_the_book',
        text: 'Nach Plan: Meldung raus, Protokoll ab jetzt lückenlos',
        effects: { compliance: 8, skills: { security: 3 } },
        resultText: 'Du setzt die Erstmeldung ab, startest das Vorfallsprotokoll, Zeitstempel ab Minute eins. Jens nickt. "Genau so. Stefan hatte recht — aber recht haben reicht nicht. Man muss es auch BEWEISEN können." Der offizielle Weg trägt jetzt — oder nie.',
        setsFlags: ['storm_briefing_done'],
        teachingMoment: 'Im Ernstfall zählt die Dokumentation ab der ersten Minute: Erstmeldung, Zeitstempel, Entscheidungslog. Ein sauber geführter Vorfall ist später der Unterschied zwischen Fall und Vermutung.',
      },
      {
        id: 'people_first',
        text: 'Erst das Team sortieren, dann die Behörden',
        effects: { relationships: { kollegen: 6 }, stress: 4 },
        resultText: 'Du stellst dich erst vor die Mannschaft: Wer macht was, wer macht Pause, wer ruft wen an. Die Meldung geht zwanzig Minuten später raus — dafür rennt jetzt niemand kopflos. Jens: "Auch eine Antwort. Vielleicht die bessere."',
        setsFlags: ['storm_briefing_done'],
      },
      {
        id: 'lean_on_bert',
        text: 'Bert dazuholen — er steht hinter euch, nutzt das',
        unlocks: ['chef_informed'],
        effects: { relationships: { chef: 6 }, stress: -3 },
        resultText: 'Bert kommt sofort, hört zwei Minuten zu und übernimmt dann genau die Front, die ihr nicht braucht: Bürgermeister, Presse, Kämmerer. "Machen Sie Ihren Job", sagt er. "Den Lärm mache ich weg." Es ist gut, den Chef im Rücken zu haben statt im Nacken.',
        setsFlags: ['storm_briefing_done'],
      },
    ],
  },

  {
    id: 'adv_storm_briefing_solo',
    title: 'Nur wir beide',
    category: 'story',
    weekRange: [9, 9],
    probability: 1,
    description: `Eine Stunde nach dem Einschlag zieht Jens dich in den Serverraum und schließt die Tür.

"Kurze Standortbestimmung", sagt er leise. "Niemand außer uns kennt das ganze Bild. Kein Aktenzeichen, kein BSI im Rücken, kein Bert im Boot — nur Stefans Ordner, unsere Logs und wir zwei. Wenn wir jetzt mit allem rausgehen, fragt jeder als Erstes: Warum erst jetzt?"

Er lehnt sich an das Rack. "Der Alleingang war deine Entscheidung. Ich bin mitgegangen. Aber ab heute Nacht kostet er — oder er zahlt sich aus. Wie spielen wir es?"`,
    involvedCharacters: ['kollege'],
    tags: ['story', 'chapter9', 'act3', 'signal'],
    choices: [
      {
        id: 'stay_dark',
        text: 'Dunkel bleiben: erst die Krise, dann die Wahrheit — mit wasserdichten Beweisen',
        effects: { skills: { security: 4 }, stress: 6 },
        resultText: 'Ihr bleibt im Schatten. Jede Beobachtung wandert in Stefans Ordner, jeder Log wird gesichert, nichts wird erklärt. Wenn ihr auftaucht, dann mit einem Fall, den niemand mehr wegdiskutieren kann. "Wie Stefan", sagt Jens. "Nur schlauer. Hoffentlich."',
        setsFlags: ['storm_briefing_done'],
      },
      {
        id: 'come_clean',
        text: 'Jetzt reinen Tisch machen: Bert alles zeigen, bevor es die Lage tut',
        effects: { relationships: { chef: 5 }, compliance: 5, stress: 4 },
        resultText: 'Du legst Bert mitten im Chaos den ganzen Ordner hin. Er blättert, wird blass, und sagt dann den Satz, den du nicht erwartet hast: "Das besprechen wir, wenn das hier vorbei ist. Jetzt sagen Sie mir, was Sie brauchen." Vielleicht hast du ihn unterschätzt.',
        setsFlags: ['storm_briefing_done', 'chef_informed'],
        teachingMoment: 'Verdeckte Ermittlungen im eigenen Haus haben ein Ablaufdatum: Spätestens im Ernstfall braucht die Leitung das volle Bild — wer Wissen zurückhält, trägt die Verantwortung für Entscheidungen, die ohne dieses Wissen fallen.',
      },
      {
        id: 'own_it',
        text: 'Den Alleingang annehmen: "Wir zwei reichen. Bis jetzt hat es gereicht."',
        unlocks: ['distrust_chef'],
        effects: { relationships: { kollegen: 5 }, stress: 8 },
        resultText: 'Du hast Bert damals außen vor gelassen, und du bleibst dabei — wenn der Insider Zugang zur Führungsebene hatte, war das richtig. Jens atmet durch. "Okay. Dann so. Aber wenn wir das überleben, gibst du einen aus. Einen GROSSEN." Zwei gegen FENRIS. Es muss reichen.',
        setsFlags: ['storm_briefing_done'],
      },
    ],
  },
```

Design notes: both events have ≥2 ungated choices with non-empty resultText (Act-3 rules test, campaignConsistency.test.ts:184-201, auto-covers them); no `terminalContext` (no VFS seeding needed); the gated third options surface only when the matching chef-flag is set, reflecting "how the chef stands"; no new flags feed the ending tree (signaling, not scoring).

**Step 7.4 — run, expect pass (incl. consistency guards).**
```bash
npm run build -w shared && npx vitest run client/src/engine/adventureEnding.test.ts client/src/engine/campaignConsistency.test.ts
npm test
```
Expected: all green (full suite catches pacing/flow tests if any count beats).

**Step 7.5 — commit.**
```bash
git add client/src/content/adventure/chapters.ts client/src/content/adventure/story-events.ts client/src/engine/adventureEnding.test.ts
git commit -m "feat(story): act-3 opening briefing reflects path and chef standing before the endings branch

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Out of scope / explicitly not done

- `AdventureEnding`/`EndingRequirements` interfaces in shared/src/types/adventure.ts:175-199 are dead weight (no production consumer — client uses its own `AdventureEndingText`); leave untouched (removal is a separate cleanup).
- No 6th ending (neutral split) — no distinct narrative payoff today.
- No changes to `calculateEndingScore` weights or the stress/burnout economy.
- EndingScreen `untakenForkHint` copy (App.tsx:632-637) still keys off `storyPath` and stays valid; the replay teaser now naturally lists 4 other titles.
