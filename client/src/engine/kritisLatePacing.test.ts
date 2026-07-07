import { describe, it, expect } from 'vitest';
import { allEvents } from '../content/events';
import { GameEvent } from '@kritis/shared';

/**
 * Late-game pool guard for KRITIS mode (weeks 13-24).
 *
 * KRITIS runs 24 weeks; events never repeat and selectNextEvent returns null
 * (a dead, empty day) when the filtered pool is empty. This test asserts the
 * AUTHORED pool is big enough that weeks 13-24 cannot run dry. The realistic
 * day-loop simulation lives in the same file (added in a later task) and is
 * the behavioural counterpart; this static check is the fast authoring guard.
 */

// An event that can serve a "normal" KRITIS late-game day: eligible for the
// mode, not a chain consequence, not gated behind other events or flags
// (kritis_mode is always set in KRITIS mode, so it doesn't count as a gate).
function isUngatedKritisEvent(e: GameEvent): boolean {
  if (e.requiredModes && !e.requiredModes.includes('kritis')) return false;
  if (e.isChainEvent) return false;
  if (e.requires?.events?.length) return false;
  const gateFlags = (e.requires?.flags ?? []).filter((f) => f !== 'kritis_mode');
  if (gateFlags.length > 0) return false;
  if (e.requires?.skills && Object.keys(e.requires.skills).length > 0) return false;
  return true;
}

const LATE_WEEKS = Array.from({ length: 12 }, (_, i) => i + 13); // 13..24
// Each week has 5 days; require headroom above that so earlier consumption
// of wide-window events can't starve a week.
const MIN_UNGATED_POOL_PER_WEEK = 6;
// 60 late days minus a conservative scenario share still needs ~45 events.
const MIN_UNGATED_LATE_STARTERS = 45;

const ungated = allEvents.filter(isUngatedKritisEvent);
const coversWeek = (e: GameEvent, w: number) => e.weekRange[0] <= w && w <= e.weekRange[1];

describe('KRITIS late-game pool (weeks 13-24)', () => {
  it('at least 45 ungated events START in weeks 13-24 (fresh late-game supply)', () => {
    const lateStarters = ungated.filter((e) => e.weekRange[0] >= 13);
    expect(
      lateStarters.length,
      `only ${lateStarters.length} ungated events start in weeks 13-24: ` +
        lateStarters.map((e) => e.id).join(', ')
    ).toBeGreaterThanOrEqual(MIN_UNGATED_LATE_STARTERS);
  });

  it(`every late week has >= ${MIN_UNGATED_POOL_PER_WEEK} ungated events in range (pool > days/week)`, () => {
    const report = LATE_WEEKS.map((w) => {
      const pool = ungated.filter((e) => coversWeek(e, w));
      return { week: w, n: pool.length, ids: pool.map((e) => e.id) };
    });
    const thin = report.filter((r) => r.n < MIN_UNGATED_POOL_PER_WEEK);
    const table = report.map((r) => `  week ${r.week}: ${r.n} events`).join('\n');
    expect(thin, `weeks with a thin pool:\n${table}`).toEqual([]);
  });
});
