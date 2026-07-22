import { describe, it, expect } from 'vitest';
import { GameEvent, GameState, getGameModeConfig, getVisibleGameModes } from '@kritis/shared';
import { createInitialState, advanceDay } from './gameState';
import { selectNextEvent } from './eventEngine';
import { recordDecision, scheduleChainEvents, cleanupPendingEvent } from './chainEngine';
import { allEvents } from '../content/events';

/**
 * Chain pacing / scoping audit (report, not a hard gate).
 *
 * Simulates the real day loop per visible mode and counts how many chain
 * consequence events (isChainEvent) land in each week, to surface density
 * hotspots and mode-collisions before authoring more red-thread chains.
 *
 * Simplifications (all conservative — they OVER-count chain density, i.e. give
 * an upper bound, which is the safe direction for a "too noisy?" audit):
 *  - Scenarios are ignored. In the real loop scenarios take 10-50% of day slots
 *    (scenarioChance rises with the week), which DELAYS/THINS chains. Ignoring
 *    them => denser-than-real chains.
 *  - Worst-case choice strategy: always pick a choice that fires a chain trigger
 *    when one exists. A real player won't trigger every chain.
 *  - Numeric effects / game-over are not applied, so runs always reach the full
 *    length (no early burnout truncating the late weeks).
 */

const SEEDS = Array.from({ length: 40 }, (_, i) => `SEED-${i}`);

const byId = new Map(allEvents.map((e) => [e.id, e]));
const isGui = (e?: GameEvent) => !!e?.guiContext;

/** Worst-case: prefer a choice that schedules a chain; else first choice. */
function pickChoice(event: GameEvent) {
  const idx = event.choices.findIndex((c) => (c.chainTriggers?.length ?? 0) > 0);
  const i = idx >= 0 ? idx : 0;
  return { choice: event.choices[i], index: i };
}

function simulate(mode: ReturnType<typeof getVisibleGameModes>[number]['id']) {
  const config = getGameModeConfig(mode);
  const totalWeeks = config.gameLength.totalWeeks;
  const maxDays = totalWeeks * config.gameLength.daysPerWeek + 10;

  // week -> array (per seed) of chain-event counts; and a union of ids seen per week.
  const perWeekCounts: Record<number, number[]> = {};
  const perWeekIds: Record<number, Set<string>> = {};
  for (let w = 1; w <= totalWeeks; w++) {
    perWeekCounts[w] = [];
    perWeekIds[w] = new Set();
  }

  for (const seed of SEEDS) {
    let state: GameState = { ...createInitialState(seed, mode), completedEvents: [] };
    const weekChainCount: Record<number, number> = {};

    for (let d = 0; d < maxDays && state.currentWeek <= totalWeeks; d++) {
      const event = selectNextEvent(allEvents, state, state.seed);
      if (!event) {
        state = advanceDay(state);
        continue;
      }
      if (event.isChainEvent) {
        const w = state.currentWeek;
        weekChainCount[w] = (weekChainCount[w] ?? 0) + 1;
        perWeekIds[w]?.add(event.id);
      }
      const { choice, index } = pickChoice(event);
      state = recordDecision(state, event, choice, index);
      state = scheduleChainEvents(state, event, choice);
      state = cleanupPendingEvent(state, event.id);
      if (choice.setsFlags) {
        const flags = { ...state.flags };
        for (const f of choice.setsFlags) flags[f] = true;
        state = { ...state, flags };
      }
      state = { ...state, completedEvents: [...state.completedEvents, event.id] };
      state = advanceDay(state);
    }

    for (let w = 1; w <= totalWeeks; w++) perWeekCounts[w].push(weekChainCount[w] ?? 0);
  }

  return { totalWeeks, perWeekCounts, perWeekIds };
}

describe('chain pacing audit', () => {
  it('reports chain-event density per week per visible mode (worst-case upper bound)', { timeout: 20000 }, () => {
    const modes = getVisibleGameModes();
    const report: string[] = [];

    for (const m of modes) {
      const { totalWeeks, perWeekCounts, perWeekIds } = simulate(m.id);
      report.push(`\n### ${m.icon} ${m.name} (${m.id}) — ${totalWeeks} Wochen, ${SEEDS.length} seeds`);
      report.push('week | mean | max | chains seen');
      for (let w = 1; w <= totalWeeks; w++) {
        const counts = perWeekCounts[w];
        const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
        const max = Math.max(0, ...counts);
        if (max === 0) continue; // only show weeks with chain activity
        const ids = [...perWeekIds[w]].sort().join(', ');
        const hot = max >= 2 ? ' ⚠️' : '';
        report.push(`  ${String(w).padStart(2)} | ${mean.toFixed(2)} | ${String(max).padStart(2)} |${hot} ${ids}`);
      }
    }

    // eslint-disable-next-line no-console
    console.info('\n=== CHAIN PACING AUDIT (worst-case, scenarios excluded) ===' + report.join('\n') + '\n');
  });

  it('per-week chain throttle holds: at most one chain consequence per week, every mode', { timeout: 20000 }, () => {
    for (const m of getVisibleGameModes()) {
      const { perWeekCounts } = simulate(m.id);
      const worst = Math.max(0, ...Object.values(perWeekCounts).flat());
      expect(
        worst,
        `${m.id}: max chain events in any week across ${SEEDS.length} seeds = ${worst}`
      ).toBeLessThanOrEqual(1);
    }
  });

  it('learning mode never serves chain events (cliOnly excludes them)', () => {
    const { perWeekCounts } = simulate('learning');
    const total = Object.values(perWeekCounts).flat().reduce((a, b) => a + b, 0);
    expect(total, 'learning mode should surface zero chain events').toBe(0);
  });

  it('backup-chain consequences and the NIS2 audit window both fall in weeks 5-8 (collision check)', () => {
    // Static proximity: the data itself shows the overlap the sim quantifies.
    const backupConsequences = ['evt_backup_payoff', 'evt_backup_disaster']
      .map((id) => byId.get(id)!)
      .filter(Boolean);
    for (const e of backupConsequences) {
      expect(e.weekRange[0], `${e.id} starts by week 5`).toBeLessThanOrEqual(5);
    }
    const auditDay = byId.get('evt_nis2_audit_day');
    expect(auditDay, 'NIS2 audit-day event exists').toBeTruthy();
    // Overlap of [5..backup] and [audit.weekRange] is the documented hotspot.
    expect(auditDay!.weekRange[0]).toBeLessThanOrEqual(8);
  });
});
