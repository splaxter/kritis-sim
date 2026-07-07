import { describe, it, expect } from 'vitest';
import { learningPathEvents } from '../content/events/learning-path';
import { allEvents } from '../content/events';
import { getAvailableEvents } from './eventEngine';
import { createInitialState } from './gameState';
import { GameState } from '@kritis/shared';

/**
 * learn_adv_cron_privesc: "looks harmless, dangerous because of file perms".
 * A root cron runs a clean 755 script that SOURCES a world-writable helper.
 * The didactic core: follow the include chain and fix the RIGHT file's perms
 * (remove world-write) — not the already-safe obvious script, not the job.
 */
const ID = 'learn_adv_cron_privesc';
const lesson = learningPathEvents.find((e) => e.id === ID)!;

describe(`learning lesson: ${ID}`, () => {
  it('is a learning-mode terminal lesson gated on the SSH-orphan lesson', () => {
    expect(lesson, `${ID} must be authored in learning-path.ts`).toBeDefined();
    expect(lesson.requiredModes).toContain('learning');
    expect(lesson.requires?.events).toContain('learn_adv_ssh_orphan');
  });

  it('wins on BOTH find-writable AND fix-perms', () => {
    const ctx = lesson.terminalContext!;
    const sol = ctx.solutions[0];
    expect(sol.allRequired).toBe(true);
    expect(sol.commands.sort()).toEqual(['find-writable', 'fix-perms']);

    const taught = new Set(
      ctx.commands.flatMap((c) => [c.pattern, c.teachesCommand].filter(Boolean) as string[])
    );
    for (const cmd of sol.commands) {
      expect(taught.has(cmd), `no command teaches "${cmd}"`).toBe(true);
    }
  });

  it('fix-perms credits removing world-write on the HELPER, not making it worse or the wrong file', () => {
    const ctx = lesson.terminalContext!;
    const fix = ctx.commands.find((c) => c.teachesCommand === 'fix-perms')!;
    const re = new RegExp(fix.patternRegex!);
    expect(re.test('chmod o-w /opt/scripts/helpers/cleanup.sh')).toBe(true);
    expect(re.test('chmod 755 /opt/scripts/helpers/cleanup.sh')).toBe(true);
    expect(re.test('chmod 777 /opt/scripts/helpers/cleanup.sh')).toBe(false); // worse, not a fix
    expect(re.test('chmod 755 /opt/scripts/run-maintenance.sh')).toBe(false); // already-safe wrong file
  });

  it('no trap can satisfy the win, and the three key traps are present', () => {
    const ctx = lesson.terminalContext!;
    const traps = ctx.commands.filter((c) => c.wrongApproachFeedback);
    expect(traps.length).toBeGreaterThanOrEqual(3);
    for (const t of traps) {
      expect(t.teachesCommand, `trap "${t.pattern}" must not teach a win token`).toBeUndefined();
    }
    // The three didactic traps, identified by their distinctive feedback text.
    const out = ctx.commands.map((c) => c.output).join('\n');
    expect(out).toContain('Falsche Richtung'); // chmod 777 — making it worse
    expect(out).toContain('bereits korrekt'); // chmod the already-safe obvious script
    expect(out).toContain('legitim'); // disabling the legitimate cron job
  });

  it('the first hint frames the include-chain risk without naming the fix', () => {
    const first = lesson.terminalContext!.hints[0];
    expect(/chmod|cleanup\.sh/.test(first), `first hint reveals the fix: "${first}"`).toBe(false);
  });

  it('is reachable in learning mode only after the SSH-orphan lesson', () => {
    const base = createInitialState('SEED', 'learning');
    // Not yet unlocked: learn_adv_ssh_orphan itself is missing, even though its
    // own prereqs are complete.
    const before: GameState = {
      ...base,
      completedEvents: ['learn_04_grep_hunter', 'gui_explorer_open_share', 'gui_explorer_auth_users'],
    };
    expect(getAvailableEvents(allEvents, before).map((e) => e.id)).not.toContain(ID);
    // Full transitive chain ending in learn_adv_ssh_orphan (which needs
    // gui_explorer_auth_users ← gui_explorer_open_share ← learn_04_grep_hunter).
    const after: GameState = {
      ...base,
      completedEvents: [
        'learn_04_grep_hunter',
        'gui_explorer_open_share',
        'gui_explorer_auth_users',
        'learn_adv_ssh_orphan',
      ],
    };
    expect(getAvailableEvents(allEvents, after).map((e) => e.id)).toContain(ID);
  });
});
