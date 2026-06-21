import { describe, it, expect } from 'vitest';
import { createInitialState } from './gameState';
import { isAtAuthoredStoryEnd } from './adventureEngine';
import { adventureChapters } from '../content/adventure/chapters';
import { adventureStoryEvents } from '../content/adventure/story-events';
import { allEvents } from '../content/events';
import { getAllScenarios } from '../content/packs';
import { getActBreakBody, ACT_BREAK_DEFAULT } from '../content/adventure/actBreaks';
import { getLastCompletedAct } from './adventureEngine';
import { GameState } from '@kritis/shared';

const combined = [...allEvents, ...adventureStoryEvents];
const scenarios = getAllScenarios();
const contentIds = new Set([...combined.map((e) => e.id), ...scenarios.map((s) => s.id)]);

// The boundary: first chapter whose beats reference unwritten content.
const firstUnauthoredIdx = adventureChapters.findIndex((ch) =>
  ch.storyBeats.some(
    (b) => !contentIds.has(b.eventId) && (!b.alternateEventId || !contentIds.has(b.alternateEventId))
  )
);

function stateAt(chapterId: string, beatIndex = 0): GameState {
  const s = createInitialState('SEED', 'story');
  s.storyState!.currentChapter = chapterId;
  s.storyState!.currentBeatIndex = beatIndex;
  return s;
}

describe('story act-break trigger (no false-victory dead-air)', () => {
  it('act-break fires exactly at the first unauthored chapter', () => {
    if (firstUnauthoredIdx === -1) {
      // Whole campaign authored — the run ends via real completion, not act-break.
      return;
    }
    const boundary = adventureChapters[firstUnauthoredIdx];
    expect(
      isAtAuthoredStoryEnd(stateAt(boundary.id, 0), combined, scenarios),
      `expected act-break at unauthored chapter ${boundary.id}`
    ).toBe(true);
  });

  it('does NOT fire inside the last authored chapter', () => {
    if (firstUnauthoredIdx <= 0) return;
    const lastAuthored = adventureChapters[firstUnauthoredIdx - 1];
    expect(
      isAtAuthoredStoryEnd(stateAt(lastAuthored.id, 0), combined, scenarios),
      `act-break must not fire in authored chapter ${lastAuthored.id}`
    ).toBe(false);
  });

  it('the boundary is reachable: the last authored chapter unlocks the unauthored one', () => {
    if (firstUnauthoredIdx <= 0) return;
    const lastAuthored = adventureChapters[firstUnauthoredIdx - 1];
    const boundary = adventureChapters[firstUnauthoredIdx];
    expect(lastAuthored.completionUnlocks, `${lastAuthored.id} must unlock ${boundary.id}`).toContain(boundary.id);
  });
});

describe('act-break copy seam (label + per-act body, no stale copy)', () => {
  it('the current boundary shows the completed act + its bespoke body', () => {
    if (firstUnauthoredIdx <= 0) return;
    const lastAuthored = adventureChapters[firstUnauthoredIdx - 1];
    // The completed act = the last authored chapter's act → "AKT {n} — ENDE".
    const s = stateAt(adventureChapters[firstUnauthoredIdx].id, 0);
    s.storyState!.completedChapters = [lastAuthored.id];
    expect(getLastCompletedAct(s)).toBe(lastAuthored.act);
  });

  it('an act with bespoke copy uses it; any other act falls back (never stale)', () => {
    // Act 2 is bespoke (reprises "Es passiert heute").
    expect(getActBreakBody(2).some((p) => /Es passiert heute/.test(p.text))).toBe(true);
    // Act 3 has no bespoke copy yet → generic fallback, NOT the Act-2 text.
    expect(getActBreakBody(3)).toBe(ACT_BREAK_DEFAULT);
    expect(getActBreakBody(3).some((p) => /Es passiert heute|AKT 2|Akt 1 und 2/.test(p.text))).toBe(false);
  });

  it('every act-break body ends with a continuation tagline + note', () => {
    for (const body of [getActBreakBody(2), ACT_BREAK_DEFAULT]) {
      expect(body.some((p) => p.tagline && /FORTSETZUNG FOLGT/.test(p.text))).toBe(true);
      expect(body.some((p) => p.note)).toBe(true);
    }
  });
});
