# Learning Path Topic/Track Hub — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the hidden linear learning chain with a topic/track hub: a mandatory Foundations gate, then five parallel tracks the player can choose from, driven by an explicit `LEARNING_TRACKS` registry.

**Architecture:** A new `LEARNING_TRACKS` registry (mirrors `adventureChapters`) layers grouping/order/recommendation over the existing learning events. `requires.events` stays the source of truth for *unlocking*; the registry drives *display, order, and recommendation*. Learning mode stops auto-serving via `selectNextEvent` and instead renders a `LearningHub`; the Result screen offers explicit next-step CTAs. Finale is hub-gated (≥3 completed core tracks, Foundations excluded).

**Tech Stack:** TypeScript, React, Vitest, npm workspaces (`shared`, `client`). Tests run with `npm run test:client` (builds shared first) or directly via `npx vitest run --root client --config vitest.config.ts <file>`.

**Design doc:** `docs/plans/2026-06-22-learning-topic-selection-design.md` (read it first).

**Conventions:**
- Commit message trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- Branch: implement on `feat/story-act2-and-systems` (per decision).
- TDD: failing test → run (fail) → minimal impl → run (pass) → commit.

---

## Phase 0 — Shared types

### Task 0.1: Add `LearningTrack` / `LearningState` types

**Files:**
- Create: `shared/src/types/learning.ts`
- Modify: `shared/src/index.ts` (export the new types)
- Modify: `shared/src/types/gameState.ts` (add `learningState?` field)

**Step 1: Create the type module**

```ts
// shared/src/types/learning.ts
export interface LearningTrackLevel {
  /** id of the GameEvent (learning level) */
  eventId: string;
  /** ★ advanced/applied node — excluded from a track's CORE completion */
  optional?: boolean;
}

export interface LearningTrack {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  /** display order in the hub (ascending) */
  order: number;
  /** the mandatory prologue track */
  isFoundations?: boolean;
  /** the graduation track (hub-gated, not requires-gated) */
  isFinale?: boolean;
  /** finale only: how many CORE tracks (excl. Foundations) must be complete */
  unlockAfterTracksCompleted?: number;
  levels: LearningTrackLevel[];
}

/** Per-run learning progress that is NOT derivable from completedEvents. */
export interface LearningState {
  /** the track the player last actively chose — drives "recommended next" */
  lastTrackId?: string;
}
```

**Step 2: Export from the shared barrel**

In `shared/src/index.ts`, add (next to the other type re-exports):
```ts
export * from './types/learning';
```

**Step 3: Add `learningState` to `GameState`**

In `shared/src/types/gameState.ts`, near `storyState?: AdventureState;` (line ~53), add an import and field:
```ts
import { LearningState } from './learning';
// ...
  learningState?: LearningState;
```
Do NOT add it to the inline initial-state literal (it stays undefined for non-learning modes; the client sets it on new game — Task 4.1).

**Step 4: Build shared**

Run: `npm run build -w shared`
Expected: compiles, no type errors.

**Step 5: Commit**
```bash
git add shared/src/types/learning.ts shared/src/index.ts shared/src/types/gameState.ts
git commit -m "feat(learning): add LearningTrack and LearningState types"
```

---

## Phase 1 — Track registry

### Task 1.1: Create `LEARNING_TRACKS` registry + helpers

**Files:**
- Create: `client/src/content/events/learning-tracks.ts`
- Test: `client/src/content/events/learning-tracks.test.ts`

**Step 1: Write the failing consistency test**

```ts
// client/src/content/events/learning-tracks.test.ts
import { describe, it, expect } from 'vitest';
import { allEvents } from './index';
import { LEARNING_TRACKS, getFoundationsExitLevelId } from './learning-tracks';
import { GameEvent } from '@kritis/shared';

const learningEvents: GameEvent[] = allEvents.filter(
  (e) => e.requiredModes?.includes('learning')
);
const learningIds = new Set(learningEvents.map((e) => e.id));
const trackLevelIds = LEARNING_TRACKS.flatMap((t) => t.levels.map((l) => l.eventId));

describe('LEARNING_TRACKS registry', () => {
  it('every track level id resolves to a real learning event', () => {
    const dangling = trackLevelIds.filter((id) => !learningIds.has(id));
    expect(dangling, `dangling track levels:\n${dangling.join('\n')}`).toEqual([]);
  });

  it('every learning event is mapped to exactly one track (no orphans, no dupes)', () => {
    const counts = new Map<string, number>();
    for (const id of trackLevelIds) counts.set(id, (counts.get(id) ?? 0) + 1);
    const orphans = [...learningIds].filter((id) => !counts.has(id));
    const dupes = [...counts].filter(([, n]) => n > 1).map(([id]) => id);
    expect(orphans, `learning events missing from every track:\n${orphans.join('\n')}`).toEqual([]);
    expect(dupes, `learning events in more than one track:\n${dupes.join('\n')}`).toEqual([]);
  });

  it('has exactly one Foundations and one Finale track', () => {
    expect(LEARNING_TRACKS.filter((t) => t.isFoundations)).toHaveLength(1);
    expect(LEARNING_TRACKS.filter((t) => t.isFinale)).toHaveLength(1);
  });

  it('getFoundationsExitLevelId returns the last foundations level', () => {
    expect(getFoundationsExitLevelId(LEARNING_TRACKS)).toBe('learn_04_grep_hunter');
  });
});
```

**Step 2: Run to verify it fails**

Run: `npx vitest run --root client --config vitest.config.ts src/content/events/learning-tracks.test.ts`
Expected: FAIL — module `./learning-tracks` not found.

**Step 3: Create the registry**

```ts
// client/src/content/events/learning-tracks.ts
import { LearningTrack } from '@kritis/shared';

export const LEARNING_TRACKS: LearningTrack[] = [
  {
    id: 'foundations',
    title: 'Grundlagen',
    description: 'Terminal, Navigation, Dateien, einfache Suche. Der Pflicht-Einstieg.',
    icon: '🌱',
    order: 0,
    isFoundations: true,
    levels: [
      { eventId: 'learn_01_awakening' },
      { eventId: 'learn_02_hidden_notes' },
      { eventId: 'learn_03_forensics' },
      { eventId: 'learn_04_grep_hunter' },
    ],
  },
  {
    id: 'linux_services',
    title: 'Linux & Services',
    description: 'Pipes, Prozesse, Dienste — den Server im Griff.',
    icon: '🐧',
    order: 1,
    levels: [
      { eventId: 'learn_05_pipe_filter' },
      { eventId: 'learn_06_zombie_hunt' },
      { eventId: 'learn_07_necromancer' },
      { eventId: 'learn_adv_phantom_storage', optional: true },
    ],
  },
  {
    id: 'network_dns',
    title: 'Netzwerk & DNS',
    description: 'Verbindungen, Namensauflösung und Vertrauen (TLS).',
    icon: '🌐',
    order: 2,
    levels: [
      { eventId: 'learn_08_network_recon' },
      { eventId: 'learn_adv_dns_splitbrain', optional: true },
      { eventId: 'gui_eventviewer_cert_expiry', optional: true },
    ],
  },
  {
    id: 'windows_security',
    title: 'Windows-Sicherheit',
    description: 'Prozesse, Protokolle, UAC und Härtung in der Windows-GUI.',
    icon: '🪟',
    order: 3,
    levels: [
      { eventId: 'learn_09_windows_realm', optional: true }, // optional PowerShell lead-in
      { eventId: 'gui_taskmanager_rogue' },
      { eventId: 'gui_taskmanager_doppelganger' },
      { eventId: 'gui_eventviewer_bruteforce' },
      { eventId: 'gui_eventviewer_persistence' },
      { eventId: 'gui_uac_unsigned_exe' },
      { eventId: 'gui_uac_legit_install' },
      { eventId: 'gui_settings_reharden' },
    ],
  },
  {
    id: 'access_hardening',
    title: 'Access & Hardening',
    description: 'Wer darf was? Berechtigungen, Least Privilege, Access-Lifecycle.',
    icon: '🔑',
    order: 4,
    levels: [
      { eventId: 'gui_explorer_open_share' },
      { eventId: 'gui_explorer_auth_users' },
      { eventId: 'learn_adv_ssh_orphan' },
      { eventId: 'learn_adv_cron_privesc' },
    ],
  },
  {
    id: 'incident_response',
    title: 'Incident Response',
    description: 'Wenn es brennt: Triage, Beweissicherung, Eindämmung.',
    icon: '🚨',
    order: 5,
    levels: [
      { eventId: 'learn_10_incident_boss' },
      { eventId: 'learn_adv_evidence_first', optional: true },
    ],
  },
  {
    id: 'finale',
    title: 'Finale: Root Awakening',
    description: 'Die Abschlussprüfung. Schalte 3 Tracks frei.',
    icon: '🎓',
    order: 6,
    isFinale: true,
    unlockAfterTracksCompleted: 3,
    levels: [{ eventId: 'learn_11_final_boss' }],
  },
];

/** Last level id of the Foundations track — the gate all other tracks open after. */
export function getFoundationsExitLevelId(tracks: LearningTrack[]): string {
  const f = tracks.find((t) => t.isFoundations);
  if (!f || f.levels.length === 0) throw new Error('No foundations track defined');
  return f.levels[f.levels.length - 1].eventId;
}
```

**Step 4: Run to verify it passes**

Run: `npx vitest run --root client --config vitest.config.ts src/content/events/learning-tracks.test.ts`
Expected: PASS (4 tests). If "orphans" fails, a learning event id is missing from the table — reconcile against `grep "requiredModes: \['learning'\]"`.

**Step 5: Commit**
```bash
git add client/src/content/events/learning-tracks.ts client/src/content/events/learning-tracks.test.ts
git commit -m "feat(learning): add LEARNING_TRACKS registry with consistency tests"
```

---

## Phase 2 — Rewrite `requires.events` (loosen historical cross-track gates)

> Goal: order becomes track-internal; every non-Foundations track-entry gates on the Foundations exit (`learn_04_grep_hunter`). Do these as small edits; after each file, run the registry test + a new cross-track guard (Task 2.3).

### Task 2.1: Loosen gates in `learning-path.ts`

**Files:** Modify `client/src/content/events/learning-path.ts`

**Step 1:** Apply these `requires.events` changes (leave everything else untouched):
- `learn_08_network_recon`: `['learn_07_necromancer']` → `['learn_04_grep_hunter']`
- `learn_10_incident_boss`: `['learn_09_windows_realm']` → `['learn_04_grep_hunter']`
- `learn_adv_ssh_orphan`: `['learn_08_network_recon']` → `['gui_explorer_auth_users']`
- `learn_adv_cron_privesc`: `['learn_06_zombie_hunt']` → `['learn_adv_ssh_orphan']`
- `learn_09_windows_realm`: `['learn_08_network_recon']` → `['learn_04_grep_hunter']`
- `learn_11_final_boss`: `['learn_10_incident_boss']` → `['learn_04_grep_hunter']` (Foundations safety net only; real gate is hub-side `isFinaleUnlocked`)
- Unchanged (real gates): `learn_05`←`04`, `06`←`05`, `07`←`06`, `learn_adv_phantom_storage`←`06`, `learn_adv_dns_splitbrain`←`08`, `learn_adv_evidence_first`←`10`.

**Step 2: Build + registry test**

Run: `npx vitest run --root client --config vitest.config.ts src/content/events/learning-tracks.test.ts`
Expected: PASS (unchanged — this test doesn't assert requires yet).

**Step 3: Commit**
```bash
git add client/src/content/events/learning-path.ts
git commit -m "feat(learning): make terminal-level prerequisites track-internal"
```

### Task 2.2: Loosen gates in `gui-levels.ts`

**Files:** Modify `client/src/content/events/gui-levels.ts`

**Step 1:** Apply:
- `gui_taskmanager_rogue`: `['learn_01_awakening']` → `['learn_04_grep_hunter']`
- `gui_taskmanager_doppelganger`: `['gui_taskmanager_rogue', 'learn_07_necromancer']` → `['gui_taskmanager_rogue']`
- `gui_eventviewer_bruteforce`: `['learn_04_grep_hunter']` → keep (already Foundations exit)
- `gui_eventviewer_persistence`: `['gui_eventviewer_bruteforce', 'learn_06_zombie_hunt']` → `['gui_eventviewer_bruteforce']`
- `gui_uac_unsigned_exe`: `['learn_02_hidden_notes']` → `['learn_04_grep_hunter']`
- `gui_uac_legit_install`: `['gui_uac_unsigned_exe', 'learn_08_network_recon']` → `['gui_uac_unsigned_exe']`
- `gui_settings_reharden`: `['gui_eventviewer_persistence', 'learn_10_incident_boss']` → `['gui_eventviewer_persistence']`
- `gui_explorer_open_share`: `['learn_09_windows_realm']` → `['learn_04_grep_hunter']`
- `gui_explorer_auth_users`: `['gui_explorer_open_share']` → keep (real gate)
- `gui_eventviewer_cert_expiry`: `['gui_eventviewer_bruteforce']` → `['learn_adv_dns_splitbrain']`

**Step 2: Commit**
```bash
git add client/src/content/events/gui-levels.ts
git commit -m "feat(learning): make GUI-level prerequisites track-internal"
```

### Task 2.3: Cross-track prerequisite guard test

**Files:** Modify `client/src/content/events/learning-tracks.test.ts`

**Step 1: Add failing test**

```ts
import { allEvents } from './index';
// ... existing imports ...

// Map every learning level id → its track id.
const trackOfLevel = new Map<string, string>();
for (const t of LEARNING_TRACKS) for (const l of t.levels) trackOfLevel.set(l.eventId, t.id);

const eventById = new Map(allEvents.map((e) => [e.id, e]));
const FOUNDATIONS_EXIT = getFoundationsExitLevelId(LEARNING_TRACKS);

// Genuine pedagogical cross-references we KEEP (level → its non-track-internal require).
// Foundations-exit gates are allowed everywhere and are not listed here.
const ALLOWED_CROSS_TRACK: Record<string, string[]> = {
  // (none beyond the Foundations gate — all real gates are track-internal)
};

describe('LEARNING_TRACKS prerequisites', () => {
  it('every non-foundations track-entry gates on the Foundations exit', () => {
    const bad: string[] = [];
    for (const t of LEARNING_TRACKS) {
      if (t.isFoundations) continue;
      const first = t.levels[0];
      const reqs = eventById.get(first.eventId)?.requires?.events ?? [];
      if (!reqs.includes(FOUNDATIONS_EXIT)) bad.push(`${t.id}/${first.eventId} requires ${JSON.stringify(reqs)}`);
    }
    expect(bad, `track entries not gated on Foundations:\n${bad.join('\n')}`).toEqual([]);
  });

  it('no requires.events points into a different track (except Foundations exit / allowlist)', () => {
    const bad: string[] = [];
    for (const t of LEARNING_TRACKS) {
      for (const lvl of t.levels) {
        const reqs = eventById.get(lvl.eventId)?.requires?.events ?? [];
        for (const r of reqs) {
          if (r === FOUNDATIONS_EXIT) continue;
          const rTrack = trackOfLevel.get(r);
          const sameTrack = rTrack === t.id;
          const allowed = (ALLOWED_CROSS_TRACK[lvl.eventId] ?? []).includes(r);
          if (!sameTrack && !allowed) bad.push(`${t.id}/${lvl.eventId} → "${r}" (track ${rTrack ?? 'none'})`);
        }
      }
    }
    expect(bad, `cross-track prerequisites:\n${bad.join('\n')}`).toEqual([]);
  });
});
```

**Step 2: Run**

Run: `npx vitest run --root client --config vitest.config.ts src/content/events/learning-tracks.test.ts`
Expected: PASS. If a cross-track require trips it, either rechain it track-internally (preferred) or add it to `ALLOWED_CROSS_TRACK` with a comment justifying the pedagogy.

**Step 3: Commit**
```bash
git add client/src/content/events/learning-tracks.test.ts
git commit -m "test(learning): guard track-internal prerequisites"
```

---

## Phase 3 — Engine (`learningPath.ts`)

### Task 3.1: `getTrackState` / `getTrackProgress` / `getNextInTrack`

**Files:**
- Create: `client/src/engine/learningPath.ts`
- Test: `client/src/engine/learningPath.test.ts`

**Step 1: Write failing tests**

```ts
// client/src/engine/learningPath.test.ts
import { describe, it, expect } from 'vitest';
import { GameState } from '@kritis/shared';
import { LEARNING_TRACKS } from '../content/events/learning-tracks';
import { allEvents } from '../content/events';
import {
  getTrackState, getTrackProgress, getNextInTrack,
  getRecommendedNext, isFinaleUnlocked,
} from './learningPath';

const track = (id: string) => LEARNING_TRACKS.find((t) => t.id === id)!;

// minimal learning GameState with a given set of completed event ids
function state(completed: string[], lastTrackId?: string): GameState {
  return {
    completedEvents: completed,
    flags: {},
    gameMode: 'learning',
    isStoryMode: false,
    learningState: { lastTrackId },
  } as unknown as GameState;
}

describe('learningPath engine', () => {
  it('foundations is available from the start; other tracks are locked', () => {
    expect(getTrackState(track('foundations'), state([]), allEvents)).toBe('available');
    expect(getTrackState(track('linux_services'), state([]), allEvents)).toBe('locked');
  });

  it('tracks unlock once Foundations core is complete', () => {
    const done = ['learn_01_awakening', 'learn_02_hidden_notes', 'learn_03_forensics', 'learn_04_grep_hunter'];
    expect(getTrackState(track('foundations'), state(done), allEvents)).toBe('completed');
    expect(getTrackState(track('linux_services'), state(done), allEvents)).toBe('available');
  });

  it('getTrackProgress counts only CORE levels', () => {
    const done = ['learn_01_awakening','learn_02_hidden_notes','learn_03_forensics','learn_04_grep_hunter','learn_05_pipe_filter'];
    const p = getTrackProgress(track('linux_services'), state(done), allEvents);
    expect(p.totalCore).toBe(3); // 05,06,07 — phantom_storage (★) excluded
    expect(p.doneCore).toBe(1);
  });

  it('getNextInTrack returns the first not-done unlocked level', () => {
    const done = ['learn_01_awakening','learn_02_hidden_notes','learn_03_forensics','learn_04_grep_hunter'];
    expect(getNextInTrack(track('linux_services'), state(done), allEvents)?.id).toBe('learn_05_pipe_filter');
  });
});
```

**Step 2: Run (fail)**

Run: `npx vitest run --root client --config vitest.config.ts src/engine/learningPath.test.ts`
Expected: FAIL — `./learningPath` not found.

**Step 3: Implement**

```ts
// client/src/engine/learningPath.ts
import { GameState, GameEvent, LearningTrack } from '@kritis/shared';
import { LEARNING_TRACKS, getFoundationsExitLevelId } from '../content/events/learning-tracks';

export type TrackState = 'locked' | 'available' | 'in_progress' | 'completed';

const isDone = (state: GameState, id: string) => state.completedEvents.includes(id);

function reqsMet(state: GameState, ev: GameEvent | undefined): boolean {
  const reqs = ev?.requires?.events ?? [];
  return reqs.every((r) => isDone(state, r));
}

function coreLevels(track: LearningTrack) {
  return track.levels.filter((l) => !l.optional);
}

export function isFoundationsComplete(state: GameState, tracks = LEARNING_TRACKS): boolean {
  const f = tracks.find((t) => t.isFoundations);
  return !!f && coreLevels(f).every((l) => isDone(state, l.eventId));
}

export function isTrackComplete(track: LearningTrack, state: GameState): boolean {
  return coreLevels(track).every((l) => isDone(state, l.eventId));
}

export function getTrackState(track: LearningTrack, state: GameState, events: GameEvent[]): TrackState {
  if (track.isFinale) return isFinaleUnlocked(state) ? (isTrackComplete(track, state) ? 'completed' : 'available') : 'locked';
  if (!track.isFoundations && !isFoundationsComplete(state)) return 'locked';
  if (isTrackComplete(track, state)) return 'completed';
  const anyDone = track.levels.some((l) => isDone(state, l.eventId));
  return anyDone ? 'in_progress' : 'available';
}

export function getTrackProgress(track: LearningTrack, state: GameState, events: GameEvent[]) {
  const byId = new Map(events.map((e) => [e.id, e]));
  const core = coreLevels(track);
  const levels = track.levels.map((l) => {
    const done = isDone(state, l.eventId);
    const unlocked = reqsMet(state, byId.get(l.eventId));
    const levelState = done ? 'done' : l.optional ? (unlocked ? 'advanced' : 'locked') : unlocked ? 'next' : 'locked';
    return { id: l.eventId, optional: !!l.optional, state: levelState as 'done' | 'next' | 'locked' | 'advanced' };
  });
  return { doneCore: core.filter((l) => isDone(state, l.eventId)).length, totalCore: core.length, levels };
}

export function getNextInTrack(track: LearningTrack, state: GameState, events: GameEvent[]): GameEvent | null {
  const byId = new Map(events.map((e) => [e.id, e]));
  for (const l of track.levels) {
    if (isDone(state, l.eventId)) continue;
    const ev = byId.get(l.eventId);
    if (ev && reqsMet(state, ev)) return ev;
  }
  return null;
}

export function isFinaleUnlocked(state: GameState, tracks = LEARNING_TRACKS): boolean {
  const finale = tracks.find((t) => t.isFinale);
  const need = finale?.unlockAfterTracksCompleted ?? 3;
  const completedCore = tracks.filter((t) => !t.isFoundations && !t.isFinale && isTrackComplete(t, state)).length;
  return completedCore >= need;
}
```

**Step 4: Run (pass)**

Run: `npx vitest run --root client --config vitest.config.ts src/engine/learningPath.test.ts`
Expected: PASS (4 tests).

**Step 5: Commit**
```bash
git add client/src/engine/learningPath.ts client/src/engine/learningPath.test.ts
git commit -m "feat(learning): track-state and next-in-track engine helpers"
```

### Task 3.2: `getRecommendedNext` (intent-first) + `isFinaleUnlocked`

**Files:** Modify `client/src/engine/learningPath.ts` + its test.

**Step 1: Add failing tests**

```ts
describe('getRecommendedNext (intent first)', () => {
  it('recommends the next Foundations level while Foundations is incomplete', () => {
    expect(getRecommendedNext(state(['learn_01_awakening']), allEvents)?.id).toBe('learn_02_hidden_notes');
  });

  it('continues the lastTrackId track when several are in progress', () => {
    const done = ['learn_01_awakening','learn_02_hidden_notes','learn_03_forensics','learn_04_grep_hunter',
      'learn_05_pipe_filter', 'learn_08_network_recon']; // linux_services + network_dns both started
    expect(getRecommendedNext(state(done, 'network_dns'), allEvents)?.id).toBe('learn_adv_dns_splitbrain');
    expect(getRecommendedNext(state(done, 'linux_services'), allEvents)?.id).toBe('learn_06_zombie_hunt');
  });

  it('isFinaleUnlocked requires 3 completed CORE tracks (Foundations excluded)', () => {
    const f = ['learn_01_awakening','learn_02_hidden_notes','learn_03_forensics','learn_04_grep_hunter'];
    const linux = ['learn_05_pipe_filter','learn_06_zombie_hunt','learn_07_necromancer'];
    const net = ['learn_08_network_recon'];
    const ir = ['learn_10_incident_boss'];
    expect(isFinaleUnlocked(state([...f, ...linux, ...net]))).toBe(false); // 2 core tracks
    expect(isFinaleUnlocked(state([...f, ...linux, ...net, ...ir]))).toBe(true); // 3 core tracks
  });
});
```

**Step 2: Run (fail)** — `getRecommendedNext is not a function`.

**Step 3: Implement** (append to `learningPath.ts`):

```ts
export function getRecommendedNext(state: GameState, events: GameEvent[]): GameEvent | null {
  const tracks = [...LEARNING_TRACKS].sort((a, b) => a.order - b.order);
  const foundations = tracks.find((t) => t.isFoundations);
  if (foundations && !isFoundationsComplete(state)) return getNextInTrack(foundations, state, events);

  const open = tracks.filter((t) => !t.isFoundations && !t.isFinale);
  const inProgress = open.filter((t) => getTrackState(t, state, events) === 'in_progress');
  if (inProgress.length > 0) {
    const last = state.learningState?.lastTrackId;
    const chosen = inProgress.find((t) => t.id === last) ?? inProgress[0]; // intent first, registry order fallback
    const next = getNextInTrack(chosen, state, events);
    if (next) return next;
  }
  const notStarted = open.find((t) => getTrackState(t, state, events) === 'available');
  if (notStarted) return getNextInTrack(notStarted, state, events);

  const finale = tracks.find((t) => t.isFinale);
  if (finale && isFinaleUnlocked(state) && !isTrackComplete(finale, state)) return getNextInTrack(finale, state, events);

  // fall back to any remaining advanced node
  for (const t of open) { const n = getNextInTrack(t, state, events); if (n) return n; }
  return null;
}
```

**Step 4: Run (pass).**

**Step 5: Commit**
```bash
git add client/src/engine/learningPath.ts client/src/engine/learningPath.test.ts
git commit -m "feat(learning): intent-first recommendation and finale unlock"
```

---

## Phase 4 — Flow wiring (single source of truth)

### Task 4.1: Initialize `learningState` on a new learning game

**Files:** Modify `client/src/engine/gameState.ts` (the branch that sets `isStoryMode`/`storyState` per mode, ~line 47).

**Step 1:** In the learning-mode setup, add `learningState: {}` to the returned state (alongside `mentorModeEnabled`). For non-learning modes, leave it undefined.

**Step 2:** Add a quick test in `client/src/engine/gameState.test.ts`:
```ts
it('learning mode initializes learningState', () => {
  const s = createNewGame(/* mode */ 'learning'); // match the actual factory signature in this file
  expect(s.learningState).toBeDefined();
});
```
(Read the file first to use the real factory name/signature.)

**Step 3:** Run that test → PASS.

**Step 4: Commit**
```bash
git add client/src/engine/gameState.ts client/src/engine/gameState.test.ts
git commit -m "feat(learning): init learningState for learning mode"
```

### Task 4.2: Route learning mode to the hub instead of auto-serving

**Files:** Modify `client/src/App.tsx` (the content-selection `useEffect`, ~lines 88–151) and the render path.

**Context:** Today, learning mode falls through to `selectNextEvent` (App.tsx ~line 141) which auto-serves the next level. We must stop that and render the hub.

**Step 1: Write a regression test first** (`client/src/App.learning.test.tsx` or extend an existing App/integration test):
```tsx
// Render App, select learning mode, assert the hub heading is shown and NO level/terminal is mounted.
// Use @testing-library/react. Query for the hub title (e.g. "Lernpfad") and assert
// queryByText(/Lektion 1|Das Erwachen/) is null right after entering learning mode.
```
(Mirror the existing component-test setup in `client/src/**/*.test.tsx`.)

**Step 2: Run (fail)** — currently the first level auto-loads.

**Step 3: Implement:**
- In the content-selection `useEffect`, add a learning-mode branch BEFORE the `selectNextEvent` fallback:
  ```ts
  const cliOnly = getGameModeConfig(game.state.gameMode).features.cliOnly === true;
  if (cliOnly) {
    // Learning mode is hub-driven; do NOT auto-serve. The hub (rendered below)
    // owns level selection. Leaving currentEvent null shows the hub.
    return;
  }
  ```
  Place it so learning never reaches `selectNextEvent`. (Keep `selectNextEvent` for other modes.)
- In the render tree, when `game.phase === 'playing' && cliOnly && !game.currentEvent && !game.currentScenario`, render `<LearningHub state={game.state} onPick={handlePickLearningLevel} />`.
- `handlePickLearningLevel(level: GameEvent)`: set `game.state.learningState.lastTrackId` to the level's track (look up via `trackOfLevel`), then `game.setEvent(level)`. Add a small `setLastTrack(trackId)` action in `useGame` (mirror how other state updates are done).

**Step 4: Run (pass)** — hub shows on learning start; selecting a level loads it.

**Step 5: Commit**
```bash
git add client/src/App.tsx client/src/hooks/useGame.ts client/src/App.learning.test.tsx
git commit -m "feat(learning): hub-driven selection, stop auto-serving in learning mode"
```

---

## Phase 5 — Hub UI

### Task 5.1: `LearningHub` component

**Files:**
- Create: `client/src/components/LearningHub/index.tsx`
- Test: `client/src/components/LearningHub/index.test.tsx`

**Step 1: Write failing render tests**
```tsx
// Renders: a "Nächste empfohlene Lektion" CTA; a Foundations card; locked badges
// on other tracks before Foundations is done; progress "x/y" per track; clicking a
// level's "next" entry calls onPick with that GameEvent.
```

**Step 2: Run (fail).**

**Step 3: Implement** a presentational component that:
- Computes per-track `getTrackState` + `getTrackProgress` and `getRecommendedNext(state, allEvents)`.
- Renders the recommended CTA at the top (calls `onPick(recommended)`).
- Renders one card per track (sorted by `order`): icon, title, `doneCore/totalCore` bar, state badge; expandable list with glyphs (✓ done · ▶ next · 🔒 locked · ★ advanced). The "next"/"advanced" entries are buttons that call `onPick`.
- Finale card: locked copy "Schließe 3 Tracks ab" until `isFinaleUnlocked`, then a highlighted graduation card.

Keep styling consistent with existing components (reuse Tailwind classes from e.g. `GameModeSelectModal`).

**Step 4: Run (pass).**

**Step 5: Commit**
```bash
git add client/src/components/LearningHub
git commit -m "feat(learning): LearningHub topic-selection screen"
```

---

## Phase 6 — Result-screen CTAs

### Task 6.1: Next-step CTAs after solving a learning level

**Files:** Modify `client/src/components/ResultScreen/index.tsx` (+ the props passed from `GameScreen`/`App`). Read these first; `GameScreen/index.tsx:74-75` already has learning-specific code to replace.

**Step 1: Write failing tests** (`ResultScreen` learning variant):
- track continues → primary CTA labelled "Nächste Lektion" fires `onNextLesson`.
- track complete → primary CTA "Zurück zum Lernpfad" fires `onBackToHub`.
- finale unlocked (and current level not the finale) → CTA "Finale starten" fires `onStartFinale`.

**Step 2: Run (fail).**

**Step 3: Implement:** compute, from the just-completed `currentEvent`, its track (`trackOfLevel`), `getNextInTrack`, and `isFinaleUnlocked`. Render exactly one primary CTA per the three cases (plus an always-present secondary "Zurück zum Lernpfad"). Wire handlers in `App`: `onNextLesson` → `game.setEvent(next)`; `onBackToHub` → clear current event (returns to hub); `onStartFinale` → `game.setEvent(final_boss)`. No automatic screen-switch — the screen waits for a click.

**Step 4: Run (pass).**

**Step 5: Commit**
```bash
git add client/src/components/ResultScreen client/src/components/GameScreen/index.tsx client/src/App.tsx
git commit -m "feat(learning): explicit next-step CTAs on the result screen"
```

---

## Phase 7 — Content copy (re-titling)

### Task 7.1: Track-relative titles

**Files:** Modify `client/src/content/events/learning-path.ts`, `gui-levels.ts`.

**Step 1:** Rename the global "Lektion N: …" titles to track-relative names, e.g.:
- `learn_01_awakening`: "Grundlagen 1: Das Erwachen"
- `learn_05_pipe_filter`: "Linux & Services 1: Der Filter"
- … (one per level; GUI levels keep "GUI-Lektion" framing but drop cross-track numbering).
Only `title` strings change. Do not touch `id`, `requires`, or terminal/GUI logic.

**Step 2:** Run the full learning suite:
`npx vitest run --root client --config vitest.config.ts src/content/events src/engine/learningPath.test.ts`
Expected: PASS. If a test asserts a specific old title, update it.

**Step 3: Commit**
```bash
git add client/src/content/events/learning-path.ts client/src/content/events/gui-levels.ts
git commit -m "feat(learning): track-relative level titles"
```

---

## Phase 8 — Regression sweep

### Task 8.1: Run the whole suite and fix fallout

**Step 1:** Run: `npm run test:client`
Expected: green. Likely needers of updates (read failures, don't guess):
- `campaignPacing.test.ts`, `flowBalanceAudit.test.ts`, `skillBalanceAudit.test.ts`, `packs.test.ts`, `guiLearningIntegration.test.ts` — any that assert the old linear `requires` chain or auto-serve order.
- Hint-escalation tests should be unaffected (level text/hints unchanged).

**Step 2:** For each failure: if it encodes the OLD linearity, update it to assert the new track-internal rules (reuse helpers from `learning-tracks.test.ts`). Do not weaken a test just to make it pass — confirm the new behavior is correct first.

**Step 3:** Manual smoke (optional but recommended): `npm run dev`, start Learning mode, verify hub appears, Foundations gates the rest, picking a track auto-advances, Result CTAs behave, Finale unlocks after 3 tracks. Use the `run` skill if helpful.

**Step 4: Commit** any test updates:
```bash
git add -A
git commit -m "test(learning): update suites for track-based learning path"
```

---

## Done criteria
- `npm run test:client` green, including new `learning-tracks.test.ts` and `learningPath.test.ts`.
- Starting Learning shows the hub (regression test proves it).
- Every learning event belongs to exactly one track; no cross-track prereqs outside the (currently empty) allowlist.
- Hub: Foundations gate → 5 parallel tracks → hub-gated Finale at 3 core tracks.
- Result screen shows the correct single primary CTA per case; no surprise screen-switch.

## Notes / risks
- `selectNextEvent`'s cliOnly branch + GUI anti-clustering become dead for learning; leave intact (other modes) but do not call for learning.
- If `npm run test:client` is slow, target files with `npx vitest run --root client --config vitest.config.ts <path>` during development.
