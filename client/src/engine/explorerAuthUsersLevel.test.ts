import { describe, it, expect } from 'vitest';
import { guiLevelEvents } from '../content/events/gui-levels';
import { allEvents } from '../content/events';
import { getAvailableEvents } from './eventEngine';
import { createInitialState } from './gameState';
import { GameState } from '@kritis/shared';

/**
 * gui_explorer_auth_users: advanced ACL follow-up. The obvious "Jeder" is gone;
 * the over-grant is now "Authentifizierte Benutzer" (every AD account) with
 * write access — nearly as broad, but reads as harmless. Guards that the trap
 * is set up correctly: only the broad principal is removable, the legit
 * department groups are critical (blocked + taught), and the win removes the
 * right one.
 */
const ID = 'gui_explorer_auth_users';
const level = guiLevelEvents.find((e) => e.id === ID)!;

describe(`GUI level: ${ID}`, () => {
  it('exists as an advanced learning GUI level gated on the basic share level', () => {
    expect(level, `${ID} must be authored in gui-levels.ts`).toBeDefined();
    expect(level.requiredModes).toContain('learning');
    expect(level.requires?.events).toContain('gui_explorer_open_share');
    expect(level.guiContext?.app).toBe('explorer');
  });

  it('is a single hands-on level (one guiCommand choice)', () => {
    expect((level.choices ?? []).filter((c) => c.guiCommand).length).toBe(1);
  });

  it('the only over-broad, removable entry is "Authentifizierte Benutzer"', () => {
    const entries = level.guiContext!.state.explorer!.entries;
    const broad = entries.filter((e) => e.overlyBroad);
    expect(broad.map((e) => e.id)).toEqual(['authenticated_users']);
    expect(broad[0].principal).toBe('Authentifizierte Benutzer');

    // Every legit group must be critical (removal blocked WITH feedback), so a
    // wrong click teaches instead of silently "passing".
    for (const e of entries) {
      if (e.overlyBroad) continue;
      expect(e.critical, `${e.id} must be critical (blocked + riskFeedback)`).toBe(true);
      expect(e.riskFeedback, `${e.id} needs riskFeedback`).toBeTruthy();
    }
  });

  it('wins only by removing the broad principal', () => {
    const sol = level.guiContext!.solutions[0];
    expect(sol.interactions).toEqual(['remove:authenticated_users']);
    expect(sol.allRequired).toBe(true);
  });

  it('the first hint does not name the answer ("Authentifizierte Benutzer" + entfernen)', () => {
    const first = level.guiContext!.hints[0];
    const namesAnswerAndAction = /Authentifizierte Benutzer/i.test(first) && /entfern/i.test(first);
    expect(namesAnswerAndAction, `first hint gives away the answer: "${first}"`).toBe(false);
  });

  it('is reachable in learning mode only after the basic share level', () => {
    const base = createInitialState('SEED', 'learning');
    const before: GameState = { ...base, completedEvents: ['learn_09_windows_realm'] };
    expect(getAvailableEvents(allEvents, before).map((e) => e.id)).not.toContain(ID);

    const after: GameState = {
      ...base,
      completedEvents: ['learn_09_windows_realm', 'gui_explorer_open_share'],
    };
    expect(getAvailableEvents(allEvents, after).map((e) => e.id)).toContain(ID);
  });
});
