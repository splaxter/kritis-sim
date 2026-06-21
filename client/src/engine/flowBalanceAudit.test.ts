import { describe, it, expect } from 'vitest';
import { allEvents } from '../content/events';
import { createInitialState } from './gameState';
import { getVisibleChoices } from './eventEngine';
import { GameEvent, GameModeId, GameState, EventChoice } from '@kritis/shared';

const MODES: GameModeId[] = ['beginner', 'learning', 'story', 'kritis', 'intermediate', 'hard'];

function eligibleForMode(e: GameEvent, mode: GameModeId): boolean {
  if (e.requiredModes && e.requiredModes.length > 0) return e.requiredModes.includes(mode);
  return true; // unrestricted events can appear in any non-cli mode
}

function classify(event: GameEvent, state: GameState): 'continue' | 'hands-on' | 'flavor' | 'decision' {
  const vc = getVisibleChoices(event, state);
  if (vc.length === 1 && vc[0].id === '__continue__') return 'continue';
  const handsOn = vc.some((c) => c.terminalCommand || c.guiCommand);
  if (vc.length === 1 && handsOn) return 'hands-on';
  if (vc.length === 1) return 'flavor';
  return 'decision';
}

// Net "goodness" of a choice's effects: skills + compliance + budget(scaled) help,
// stress hurts. Rough single number to compare options within one event.
function netEffect(c: EventChoice): number {
  const e = c.effects ?? {};
  const skills = Object.values(e.skills ?? {}).reduce((a, b) => a + (b ?? 0), 0);
  const rel = Object.values(e.relationships ?? {}).reduce((a, b) => a + (b ?? 0), 0);
  return skills + rel + (e.compliance ?? 0) + Math.round((e.budget ?? 0) / 1000) - (e.stress ?? 0);
}

const HIGH_STAKES = ['evt_real_trojan', 'evt_elo_fix_failure'];
const HIGH_STAKES_TITLES = ['Die breite Ausnahme', 'Audit-Fund'];

describe('flow + balance audit', () => {
  it('card-kind distribution per mode (flags __continue__ synthesis)', () => {
    const lines: string[] = [];
    const continueEvents = new Set<string>();

    // Result/consequence cards reveal a choice via `unlocks` flags set on the way
    // in (e.g. the NIS2 audit-day outcome). Simulate "arrived with the relevant
    // unlocks" so the guard only catches genuinely stuck events — i.e. skill-gated
    // with no ungated fallback (the Finding-4 concern), not intentional reveals.
    const allUnlockFlags: Record<string, boolean> = {};
    for (const e of allEvents) {
      for (const c of e.choices ?? []) {
        for (const u of c.unlocks ?? []) allUnlockFlags[u] = true;
      }
    }

    for (const mode of MODES) {
      const state = { ...createInitialState('SEED', mode), completedEvents: [], flags: { ...allUnlockFlags } };
      const eligible = allEvents.filter((e) => eligibleForMode(e, mode));
      const tally = { decision: 0, flavor: 0, 'hands-on': 0, continue: 0 } as Record<string, number>;
      for (const e of eligible) {
        const kind = classify(e, state);
        tally[kind]++;
        if (kind === 'continue') continueEvents.add(`${mode}:${e.id}`);
      }
      lines.push(
        `${mode.padEnd(13)} n=${String(eligible.length).padStart(3)}  decision=${tally.decision}  flavor=${tally.flavor}  hands-on=${tally['hands-on']}  continue=${tally.continue}`
      );
    }

    const report =
      '\n=== CARD-KIND DISTRIBUTION (base state, by mode) ===\n' +
      lines.join('\n') +
      `\n\n__continue__ synthesised for: ${continueEvents.size ? [...continueEvents].join(', ') : 'none'}\n`;

    // GUARD: __continue__ is a safety fallback, not normal content. At base state
    // (low skills) every non-learning event should still expose a real authored
    // choice — Finding 4 added ungated baselines for exactly this reason.
    expect([...continueEvents], `unexpected __continue__ fallback\n${report}`).toEqual([]);
  });

  it('high-stakes "tempting worse" options: effect spread is meaningful but not extreme', () => {
    const targets = allEvents.filter(
      (e) => HIGH_STAKES.includes(e.id) || HIGH_STAKES_TITLES.includes(e.title)
    );
    const lines: string[] = [];
    const flags: string[] = [];

    for (const e of targets) {
      const choices = e.choices ?? [];
      const nets = choices.map((c) => ({ id: c.id, net: netEffect(c), stress: c.effects?.stress ?? 0 }));
      const best = Math.max(...nets.map((n) => n.net));
      const worst = Math.min(...nets.map((n) => n.net));
      const spread = best - worst;
      lines.push(
        `${e.id.padEnd(24)} "${e.title}"  spread=${spread}  ` +
          nets.map((n) => `${n.id}:net=${n.net}`).join('  ')
      );
      // Heuristics for a "tempting worse" decision to actually bite:
      if (spread < 5) flags.push(`${e.id}: spread ${spread} too MILD (worse option barely worse)`);
      if (spread > 40) flags.push(`${e.id}: spread ${spread} too HARSH (cliff-edge punishment)`);
    }

    const report =
      '\n=== HIGH-STAKES CHOICE SPREAD ===\n' + lines.join('\n') + `\n\nflags: ${flags.length ? flags.join(' | ') : 'none'}\n`;

    expect(targets.length, `no high-stakes events matched\n${report}`).toBeGreaterThan(0);
    expect(flags, report).toEqual([]);
  });
});
