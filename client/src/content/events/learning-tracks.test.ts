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
