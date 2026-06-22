import { describe, it, expect } from 'vitest';
import { learningPathEvents } from '../content/events/learning-path';
import { allEvents } from '../content/events';
import { getAvailableEvents, selectNextEvent } from './eventEngine';
import { createInitialState } from './gameState';
import { GameState } from '@kritis/shared';

/**
 * "Der unsichtbare Speicherfresser" (learn_adv_phantom_storage): an advanced,
 * optional terminal lesson. The puzzle is the aha — df shows 100% full, du
 * can't account for it, lsof +L1 reveals a deleted-but-open file handle, and
 * the fix is restarting the holding service (NOT more deletion / a reboot).
 *
 * Guards the two things that would silently break it: a win condition that
 * doesn't actually require both the diagnosis AND the fix, and a first hint
 * that hands over the punchline command (killing the aha).
 */
const ID = 'learn_adv_phantom_storage';
const lesson = learningPathEvents.find((e) => e.id === ID)!;

describe(`learning lesson: ${ID}`, () => {
  it('exists as a learning-mode terminal lesson gated on the process lesson', () => {
    expect(lesson, `${ID} must be authored in learning-path.ts`).toBeDefined();
    expect(lesson.requiredModes).toContain('learning');
    expect(lesson.requires?.events).toContain('learn_06_zombie_hunt');
    expect(lesson.terminalContext).toBeDefined();
  });

  it('is a single hands-on lesson (one terminalCommand choice)', () => {
    const choices = lesson.choices ?? [];
    expect(choices.filter((c) => c.terminalCommand).length).toBe(1);
  });

  it('only wins on BOTH diagnose (lsof) AND fix (restart-service)', () => {
    const ctx = lesson.terminalContext!;
    const sol = ctx.solutions[0];
    expect(sol.allRequired).toBe(true);
    expect(sol.commands.sort()).toEqual(['lsof-deleted', 'restart-service']);

    // Each required token must actually be produced by some command, or the
    // lesson is unwinnable.
    const taught = new Set(
      ctx.commands.flatMap((c) => [c.pattern, c.teachesCommand].filter(Boolean) as string[])
    );
    for (const cmd of sol.commands) {
      expect(taught.has(cmd), `no command teaches "${cmd}" — lesson is unwinnable`).toBe(true);
    }
  });

  it('the lsof reveal matches the canonical `lsof +L1` (and a grep-deleted variant)', () => {
    const ctx = lesson.terminalContext!;
    const lsofCmd = ctx.commands.find((c) => c.teachesCommand === 'lsof-deleted')!;
    expect(lsofCmd, 'a command must teach the deleted-handle discovery').toBeDefined();
    const re = new RegExp(lsofCmd.patternRegex!);
    expect(re.test('lsof +L1')).toBe(true);
    expect(re.test('lsof | grep deleted')).toBe(true);
  });

  it('the first hint orients without revealing the solution command', () => {
    const ctx = lesson.terminalContext!;
    const firstHint = ctx.hints[0];
    // hints[0] must not hand over the punchline syntax.
    expect(/lsof\s*\+L1/i.test(firstHint), `first hint reveals lsof: "${firstHint}"`).toBe(false);
    expect(/systemctl\s+restart/i.test(firstHint), `first hint reveals the fix: "${firstHint}"`).toBe(false);
  });

  it('is reachable in learning mode once the process lesson is done, not before', () => {
    const base = createInitialState('SEED', 'learning');

    const before: GameState = { ...base, completedEvents: [] };
    expect(getAvailableEvents(allEvents, before).map((e) => e.id)).not.toContain(ID);

    const after: GameState = { ...base, completedEvents: ['learn_06_zombie_hunt'] };
    expect(getAvailableEvents(allEvents, after).map((e) => e.id)).toContain(ID);
  });

  it('never appears in a non-learning mode', () => {
    const story = { ...createInitialState('SEED', 'story'), completedEvents: ['learn_06_zombie_hunt'] };
    const pick = selectNextEvent(allEvents, story as GameState, story.seed);
    // Even if selected, it must not be this learning-only lesson.
    expect(pick?.id).not.toBe(ID);
    expect(getAvailableEvents(allEvents, story as GameState).map((e) => e.id)).not.toContain(ID);
  });
});
