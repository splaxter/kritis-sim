import { describe, it, expect } from 'vitest';
import { learningPathEvents } from '../content/events/learning-path';
import { allEvents } from '../content/events';
import { getAvailableEvents } from './eventEngine';
import { createInitialState } from './gameState';
import { GameState } from '@kritis/shared';

/**
 * learn_adv_ssh_orphan: offboarding / access lifecycle. An ex-admin's SSH key
 * lingers in authorized_keys. Two guard requirements (reviewer-set):
 *  1. the remove win-token is satisfied ONLY by targeted removal of the
 *     ex-admin key — not rm authorized_keys, chmod 000, or "delete all keys".
 *  2. removing the ACTIVE deploy key is a trap that does NOT win and explains
 *     itself.
 */
const ID = 'learn_adv_ssh_orphan';
const lesson = learningPathEvents.find((e) => e.id === ID)!;
const ctx = lesson?.terminalContext;

describe(`learning lesson: ${ID}`, () => {
  it('is a learning-mode terminal lesson gated on the Explorer ACL lesson', () => {
    expect(lesson, `${ID} must be authored in learning-path.ts`).toBeDefined();
    expect(lesson.requiredModes).toContain('learning');
    expect(lesson.requires?.events).toContain('gui_explorer_auth_users');
  });

  it('wins on BOTH identify-orphan AND remove-orphan', () => {
    const sol = ctx!.solutions[0];
    expect(sol.allRequired).toBe(true);
    expect(sol.commands.sort()).toEqual(['identify-orphan', 'remove-orphan']);

    const taught = new Set(
      ctx!.commands.flatMap((c) => [c.pattern, c.teachesCommand].filter(Boolean) as string[])
    );
    for (const cmd of sol.commands) {
      expect(taught.has(cmd), `no command teaches "${cmd}"`).toBe(true);
    }
  });

  // GUARD 1: the win-token is only the targeted removal — never a blanket nuke.
  it('remove-orphan only credits targeted removal of the ex-admin key', () => {
    const rm = ctx!.commands.find((c) => c.teachesCommand === 'remove-orphan')!;
    const re = new RegExp(rm.patternRegex!);
    expect(re.test("sed -i '/stefan@old-laptop/d' /home/deploy/.ssh/authorized_keys")).toBe(true);
    expect(re.test("sed -i '/stefan/d' authorized_keys")).toBe(true);
    // none of these may satisfy the win token:
    expect(re.test('rm /home/deploy/.ssh/authorized_keys')).toBe(false);
    expect(re.test('chmod 000 /home/deploy/.ssh/authorized_keys')).toBe(false);
    expect(re.test("sed -i '/ssh-rsa/d' authorized_keys")).toBe(false); // delete all keys
    expect(re.test("sed -i '/ansible@warm-automation/d' authorized_keys")).toBe(false); // active key
  });

  // GUARD 2: removing the active key is a non-winning trap that explains itself.
  it('the active deploy key is a trap that does not win and explains why', () => {
    const re = (c: { patternRegex?: string }) => new RegExp(c.patternRegex!);
    const activeTrap = ctx!.commands.find(
      (c) => c.patternRegex && re(c).test("sed -i '/ansible@warm-automation/d' authorized_keys")
    )!;
    expect(activeTrap, 'an active-key trap must exist').toBeDefined();
    expect(activeTrap.teachesCommand).toBeUndefined(); // cannot satisfy remove-orphan
    expect(activeTrap.wrongApproachFeedback).toBeTruthy();
    expect(activeTrap.output).toMatch(/aktiv/i);
  });

  it('every destructive trap teaches nothing and warns', () => {
    const traps = ctx!.commands.filter((c) => c.wrongApproachFeedback);
    expect(traps.length).toBeGreaterThanOrEqual(3); // active-key, nuke-file, chmod-000
    for (const t of traps) expect(t.teachesCommand).toBeUndefined();
  });

  it('the first hint does not name the orphan key or the sed fix', () => {
    const first = ctx!.hints[0];
    expect(/sed|stefan@old-laptop/.test(first), `first hint gives it away: "${first}"`).toBe(false);
  });

  it('is reachable in learning mode only after the Explorer ACL lesson', () => {
    const base = createInitialState('SEED', 'learning');
    // Not yet unlocked: the Explorer ACL prereq (gui_explorer_auth_users) is missing.
    const before: GameState = { ...base, completedEvents: ['learn_04_grep_hunter', 'gui_explorer_open_share'] };
    expect(getAvailableEvents(allEvents, before).map((e) => e.id)).not.toContain(ID);
    // Full transitive chain: learn_04_grep_hunter ← gui_explorer_open_share ← gui_explorer_auth_users.
    const after: GameState = {
      ...base,
      completedEvents: ['learn_04_grep_hunter', 'gui_explorer_open_share', 'gui_explorer_auth_users'],
    };
    expect(getAvailableEvents(allEvents, after).map((e) => e.id)).toContain(ID);
  });
});
