import { describe, it, expect } from 'vitest';
import { learningPathEvents } from '../content/events/learning-path';
import { allEvents } from '../content/events';
import { getAvailableEvents } from './eventEngine';
import { createInitialState } from './gameState';
import { GameState } from '@kritis/shared';

/**
 * learn_adv_dns_splitbrain: DNS split-brain with a LOCAL twist. dig returns the
 * correct IP, but curl hits the wrong one because /etc/hosts is consulted first
 * (and nscd cached it). The fix is host-local: remove the override AND flush
 * the cache — never touch the (correct) DNS server. Guards that the win needs
 * both fix steps and that the puzzle isn't spoiled by the first hint.
 */
const ID = 'learn_adv_dns_splitbrain';
const lesson = learningPathEvents.find((e) => e.id === ID)!;

describe(`learning lesson: ${ID}`, () => {
  it('is a learning-mode terminal lesson gated on the network lesson', () => {
    expect(lesson, `${ID} must be authored in learning-path.ts`).toBeDefined();
    expect(lesson.requiredModes).toContain('learning');
    expect(lesson.requires?.events).toContain('learn_08_network_recon');
    expect(lesson.terminalContext?.type).toBe('linux');
  });

  it('only wins on BOTH remove-override AND flush-cache', () => {
    const ctx = lesson.terminalContext!;
    const sol = ctx.solutions[0];
    expect(sol.allRequired).toBe(true);
    expect(sol.commands.sort()).toEqual(['flush-cache', 'remove-override']);

    const taught = new Set(
      ctx.commands.flatMap((c) => [c.pattern, c.teachesCommand].filter(Boolean) as string[])
    );
    for (const cmd of sol.commands) {
      expect(taught.has(cmd), `no command teaches "${cmd}"`).toBe(true);
    }
  });

  it('the dig/getent split is authored (DNS correct, resolver wrong)', () => {
    const ctx = lesson.terminalContext!;
    const dig = ctx.commands.find((c) => c.teachesCommand === 'dig')!;
    const getent = ctx.commands.find((c) => c.teachesCommand === 'getent')!;
    expect(dig.output).toContain('10.0.9.20'); // DNS = correct/new
    expect(getent.output).toContain('10.0.5.10'); // resolver = stale/old
  });

  it('touching the DNS server is flagged as the wrong approach', () => {
    const ctx = lesson.terminalContext!;
    const dnsTrap = ctx.commands.find((c) => /nsupdate|rndc|named/.test(c.patternRegex ?? ''))!;
    expect(dnsTrap, 'an nsupdate/rndc trap must exist').toBeDefined();
    expect(dnsTrap.teachesCommand).toBeUndefined(); // must not count toward the win
    expect(dnsTrap.wrongApproachFeedback).toBeTruthy();
  });

  it('the first hint orients without revealing the /etc/hosts fix', () => {
    const first = lesson.terminalContext!.hints[0];
    expect(/\/etc\/hosts/.test(first), `first hint reveals the file: "${first}"`).toBe(false);
    expect(/sed|resolvectl/.test(first), `first hint reveals the fix command: "${first}"`).toBe(false);
  });

  it('is reachable in learning mode only after the network lesson', () => {
    const base = createInitialState('SEED', 'learning');
    const before: GameState = { ...base, completedEvents: [] };
    expect(getAvailableEvents(allEvents, before).map((e) => e.id)).not.toContain(ID);
    const after: GameState = { ...base, completedEvents: ['learn_08_network_recon'] };
    expect(getAvailableEvents(allEvents, after).map((e) => e.id)).toContain(ID);
  });
});
