import { describe, it, expect } from 'vitest';
import { GameModeId, GameState, getGameModeConfig } from '@kritis/shared';
import { createInitialState, advanceDay, applyEffects } from './gameState';
import { selectNextEvent, getVisibleChoices } from './eventEngine';
import { selectNextScenario, calculateScenarioEffects } from './scenarioEngine';
import { recordDecision, scheduleChainEvents, cleanupPendingEvent, getActivatedChainEvents } from './chainEngine';
import { allEvents } from '../content/events';
import { getAllScenarios } from '../content/packs';

/**
 * REALISTIC flow / density audit (companion to chainPacingAudit, which is a
 * worst-case upper bound). Mirrors the real App day loop: the scenario/event
 * split (scenarioChance), hash-varied choices (NOT chain-maximising), and
 * applied effects. Answers: how often do chain consequences actually appear,
 * does the throttle hold in normal play, and are weeks 5-12 dominated by them?
 *
 * Scoped to the modes where chains appear: beginner/kritis/intermediate/hard
 * (learning is cliOnly = no chains; story uses its own beat-driven flow).
 * Game-over is NOT applied so every run reaches full length — we want to see
 * the late-week density "if you survive", which is the domination question.
 */
const allScenarios = getAllScenarios();
const MODES: GameModeId[] = ['beginner', 'kritis', 'intermediate', 'hard'];
const SEEDS = Array.from({ length: 40 }, (_, i) => `S${i}`);

// Same hash App.tsx uses for the scenario/event split, so we reproduce it.
function simpleHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h = h & h;
  }
  return Math.abs(h);
}
const pick = (seed: string, n: number) => (n > 0 ? simpleHash(seed) % n : 0);

interface WeekStat { chains: number; nonChainEvents: number; scenarios: number }

function playRealistic(mode: GameModeId, seed: string) {
  const cfg = getGameModeConfig(mode);
  const totalWeeks = cfg.gameLength.totalWeeks;
  const maxDays = totalWeeks * cfg.gameLength.daysPerWeek + 4;
  let state: GameState = {
    ...createInitialState(seed, mode),
    completedEvents: [],
    completedScenarios: [],
    decisions: [],
    pendingChainEvents: [],
    flags: {},
  };
  const perWeek: Record<number, WeekStat> = {};
  for (let w = 1; w <= totalWeeks; w++) perWeek[w] = { chains: 0, nonChainEvents: 0, scenarios: 0 };
  let deferredChainDays = 0; // a chain was available but a non-chain was served (throttle/holding)

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
        perWeek[week].scenarios++;
        handled = true;
      }
    }

    if (!handled) {
      const chainsAvailable = getActivatedChainEvents(state, allEvents).length;
      const ev = selectNextEvent(allEvents, state, state.seed);
      if (ev) {
        if (ev.isChainEvent) perWeek[week].chains++;
        else {
          perWeek[week].nonChainEvents++;
          if (chainsAvailable > 0) deferredChainDays++; // a chain was held back
        }
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
  return { perWeek, totalWeeks, deferredChainDays };
}

describe('chain flow density (realistic)', () => {
  it('chain consequences stay sparse and the throttle holds in normal play', () => {
    const report: string[] = [];
    let globalMaxChainsPerWeek = 0;

    for (const mode of MODES) {
      const runs = SEEDS.map((s) => playRealistic(mode, s));
      const totalWeeks = runs[0].totalWeeks;

      let chainsPerRunSum = 0;
      const mid = { chains: 0, content: 0 }; // weeks 5-12
      const weekChainMeans: number[] = [];

      for (let w = 1; w <= totalWeeks; w++) {
        let wkChains = 0;
        for (const r of runs) {
          const s = r.perWeek[w];
          wkChains += s.chains;
          globalMaxChainsPerWeek = Math.max(globalMaxChainsPerWeek, s.chains);
          if (w >= 5 && w <= 12) {
            mid.chains += s.chains;
            mid.content += s.chains + s.nonChainEvents + s.scenarios;
          }
        }
        weekChainMeans[w] = wkChains / runs.length;
      }
      for (const r of runs) for (let w = 1; w <= totalWeeks; w++) chainsPerRunSum += r.perWeek[w].chains;

      const chainsPerRun = chainsPerRunSum / runs.length;
      const midShare = mid.content ? (mid.chains / mid.content) * 100 : 0;
      const deferMean = runs.reduce((a, r) => a + r.deferredChainDays, 0) / runs.length;
      const peakWeek = weekChainMeans.indexOf(Math.max(...weekChainMeans.slice(1)));

      report.push(
        `${mode.padEnd(12)} chains/run=${chainsPerRun.toFixed(1)}  wk5-12 chain-share=${midShare.toFixed(0)}%  ` +
          `peak wk${peakWeek} (${weekChainMeans[peakWeek].toFixed(2)}/wk)  held-back/run=${deferMean.toFixed(1)}`
      );
    }


    console.info('\n=== CHAIN FLOW DENSITY (realistic, 40 seeds/mode) ===\n' + report.join('\n') + '\n');

    // Throttle must hold in realistic play too: never more than one chain in a week.
    expect(globalMaxChainsPerWeek, 'a week served >1 chain consequence').toBeLessThanOrEqual(1);
  });
});
