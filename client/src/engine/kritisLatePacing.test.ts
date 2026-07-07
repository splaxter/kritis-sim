import { describe, it, expect } from 'vitest';
import { allEvents } from '../content/events';
import { GameEvent, GameState, getGameModeConfig } from '@kritis/shared';
import { createInitialState, advanceDay, applyEffects } from './gameState';
import { selectNextEvent, getVisibleChoices } from './eventEngine';
import { selectNextScenario, calculateScenarioEffects } from './scenarioEngine';
import { recordDecision, scheduleChainEvents, cleanupPendingEvent } from './chainEngine';
import { getAllScenarios } from '../content/packs';

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

describe('NIS2 Nachaudit arc (weeks 15-22)', () => {
  const byId = new Map(allEvents.map((e) => [e.id, e]));
  it('the arc exists and is wired announcement -> day -> result', () => {
    const ank = byId.get('evt_nis2_nachaudit_ankuendigung');
    const tag = byId.get('evt_nis2_nachaudit_tag');
    const erg = byId.get('evt_nis2_nachaudit_ergebnis');
    expect(ank, 'announcement missing').toBeTruthy();
    expect(tag?.requires?.flags).toContain('nachaudit_announced');
    expect(erg?.requires?.events).toContain('evt_nis2_nachaudit_tag');
    // announcement is reachable without prior-arc flags (works for every first-audit outcome)
    expect((ank!.requires?.flags ?? []).filter((f) => f !== 'kritis_mode')).toEqual([]);
    expect(ank!.weekRange[0]).toBeGreaterThanOrEqual(13);
  });
});

describe('KRITIS 24-week simulation: no dead days in weeks 13-24', () => {
  const allScenarios = getAllScenarios();
  const SEEDS = Array.from({ length: 40 }, (_, i) => `LATE-${i}`);

  function simpleHash(str: string): number {
    let h = 0;
    for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h = h & h; }
    return Math.abs(h);
  }
  const pick = (seed: string, n: number) => (n > 0 ? simpleHash(seed) % n : 0);

  function playKritis(seed: string): { deadDays: { week: number; day: number }[] } {
    const cfg = getGameModeConfig('kritis');
    const totalWeeks = cfg.gameLength.totalWeeks;
    const maxDays = totalWeeks * cfg.gameLength.daysPerWeek + 4;
    let state: GameState = {
      ...createInitialState(seed, 'kritis'),
      completedEvents: [], completedScenarios: [], decisions: [], pendingChainEvents: [],
      flags: { kritis_mode: true },
    };
    const deadDays: { week: number; day: number }[] = [];

    for (let d = 0; d < maxDays && state.currentWeek <= totalWeeks; d++) {
      const week = state.currentWeek;
      const scenarioChance = Math.min(0.5, 0.1 + (week - 1) * 0.05);
      const h = simpleHash(state.seed + week + state.currentDay + state.completedEvents.length);
      const useScenario = (h % 100) < scenarioChance * 100;

      let handled = false;
      if (useScenario && allScenarios.length > 0) {
        const sc = selectNextScenario(allScenarios, state, state.seed);
        if (sc) {
          const choices = sc.choices ?? [];
          const choice = choices[pick(state.seed + sc.id, choices.length)] ?? choices[0];
          if (choice) state = applyEffects(state, calculateScenarioEffects(choice));
          state = { ...state, completedScenarios: [...(state.completedScenarios || []), sc.id] };
          handled = true;
        }
      }
      if (!handled) {
        const ev = selectNextEvent(allEvents, state, state.seed);
        if (!ev) {
          if (week >= 13) deadDays.push({ week, day: state.currentDay });
        } else {
          const visible = getVisibleChoices(ev, state);
          const choice = visible[pick(state.seed + ev.id, visible.length)] ?? visible[0];
          if (choice) {
            state = applyEffects(state, choice.effects ?? {});
            const idx = ev.choices.indexOf(choice);
            state = recordDecision(state, ev, choice, idx >= 0 ? idx : 0);
            state = scheduleChainEvents(state, ev, choice);
            state = cleanupPendingEvent(state, ev.id);
            if (choice.setsFlags) {
              const flags = { ...state.flags };
              for (const f of choice.setsFlags) flags[f] = true;
              state = { ...state, flags };
            }
            state = { ...state, completedEvents: [...state.completedEvents, ev.id] };
          }
        }
      }
      state = advanceDay(state);
    }
    return { deadDays };
  }

  it('40 seeded full-length runs never hit an empty day in weeks 13-24', () => {
    const failures: string[] = [];
    for (const seed of SEEDS) {
      const { deadDays } = playKritis(seed);
      if (deadDays.length > 0) {
        failures.push(`${seed}: ${deadDays.map((x) => `w${x.week}d${x.day}`).join(', ')}`);
      }
    }
    expect(failures, `dead late-game days found:\n${failures.join('\n')}`).toEqual([]);
  });
});
