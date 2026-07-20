import { describe, it, expect } from 'vitest';
import { allEvents } from './index';
import { LEARNING_TRACKS, getFoundationsExitLevelId, getTrackPosition } from './learning-tracks';
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

describe('getTrackPosition', () => {
  it('returns 1-based index over CORE levels for a core level', () => {
    // ssh_remote: [first_key, open_door, jumphost, key_graveyard(optional)]
    // → 3 core levels; jumphost is the 3rd.
    expect(getTrackPosition('learn_ssh_03_jumphost')).toEqual({
      trackTitle: 'SSH & Remote-Zugriff',
      indexInTrack: 3,
      coreCount: 3,
      isOptional: false,
    });
    expect(getTrackPosition('learn_ssh_01_first_key')).toEqual({
      trackTitle: 'SSH & Remote-Zugriff',
      indexInTrack: 1,
      coreCount: 3,
      isOptional: false,
    });
  });

  it('marks an optional level and does not consume a core index', () => {
    expect(getTrackPosition('learn_ssh_04_key_graveyard')).toEqual({
      trackTitle: 'SSH & Remote-Zugriff',
      indexInTrack: 0,
      coreCount: 3,
      isOptional: true,
    });
  });

  it('returns null for an id that is in no track', () => {
    expect(getTrackPosition('not_a_real_event_id')).toBeNull();
  });
});

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
