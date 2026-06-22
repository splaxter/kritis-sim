import { describe, it, expect } from 'vitest';
import { learningPathEvents } from '../content/events/learning-path';
import { allEvents } from '../content/events';
import { getAvailableEvents } from './eventEngine';
import { createInitialState } from './gameState';
import { GameState } from '@kritis/shared';

/**
 * learn_adv_evidence_first: IR discipline — "erst sichern, dann reparieren".
 * The engine can't enforce ORDER on terminal solutions, so the design carries
 * the lesson differently: the win is PRESERVATION (copy the live log off the
 * rotation + a durable journald copy), and every remediation action
 * (logrotate -f, restart, block, rm) is a trap that must NOT count toward the
 * win and must warn the player. This test locks that contract down.
 */
const ID = 'learn_adv_evidence_first';
const lesson = learningPathEvents.find((e) => e.id === ID)!;

describe(`learning lesson: ${ID}`, () => {
  it('is a learning-mode terminal lesson gated on the incident-response boss', () => {
    expect(lesson, `${ID} must be authored in learning-path.ts`).toBeDefined();
    expect(lesson.requiredModes).toContain('learning');
    expect(lesson.requires?.events).toContain('learn_10_incident_boss');
  });

  it('wins on PRESERVATION (copy + durable journald), not on any fix', () => {
    const ctx = lesson.terminalContext!;
    const sol = ctx.solutions[0];
    expect(sol.allRequired).toBe(true);
    expect(sol.commands.sort()).toEqual(['preserve-copy', 'preserve-journal']);

    const taught = new Set(
      ctx.commands.flatMap((c) => [c.pattern, c.teachesCommand].filter(Boolean) as string[])
    );
    for (const cmd of sol.commands) {
      expect(taught.has(cmd), `no command teaches "${cmd}"`).toBe(true);
    }
  });

  it('every remediation action is a non-winning trap with feedback', () => {
    const ctx = lesson.terminalContext!;
    // logrotate -f, restart, iptables/block, rm/truncate — each must give
    // feedback and teach nothing (so it can never satisfy the preservation
    // win). Fragments are chosen to be unique to the trap (e.g. "--force" so we
    // don't match the legitimate `cat /etc/logrotate` diagnostic).
    const trapSignatures = ['--force', 'systemctl', 'iptables', 'truncate'];
    for (const sig of trapSignatures) {
      const trap = ctx.commands.find((c) => (c.patternRegex ?? c.pattern).includes(sig))!;
      expect(trap, `a trap for "${sig}" must exist`).toBeDefined();
      expect(trap.teachesCommand, `"${sig}" trap must not teach a win token`).toBeUndefined();
      expect(trap.wrongApproachFeedback, `"${sig}" trap needs wrongApproachFeedback`).toBeTruthy();
    }
  });

  it('the first hint teaches the "secure first" instinct without naming the commands', () => {
    const first = lesson.terminalContext!.hints[0];
    expect(/cp\s|journalctl/.test(first), `first hint reveals the command: "${first}"`).toBe(false);
    expect(/repar/i.test(first), 'first hint should frame the secure-vs-repair order').toBe(true);
  });

  it('is reachable in learning mode only after the incident-response boss', () => {
    const base = createInitialState('SEED', 'learning');
    const before: GameState = { ...base, completedEvents: [] };
    expect(getAvailableEvents(allEvents, before).map((e) => e.id)).not.toContain(ID);
    const after: GameState = { ...base, completedEvents: ['learn_10_incident_boss'] };
    expect(getAvailableEvents(allEvents, after).map((e) => e.id)).toContain(ID);
  });
});
