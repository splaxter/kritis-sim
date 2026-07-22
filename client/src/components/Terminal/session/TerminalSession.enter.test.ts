import { describe, it, expect, vi } from 'vitest';
import { createShellFromContext } from '../../../engine/shell';
import { TerminalContext, GameModeId } from '@kritis/shared';
import { TerminalSession } from './TerminalSession';
import { TerminalEffect } from './effects';

const baseCtx: TerminalContext = {
  type: 'linux', hostname: 'ws-admin', username: 'timo',
  currentPath: '/home/timo', hints: [], commands: [], solutions: [],
};

function makeSession(overrides: Partial<TerminalContext> = {}, gameMode: GameModeId = 'intermediate') {
  const context = { ...baseCtx, ...overrides };
  const shell = createShellFromContext({
    type: context.type, hostname: context.hostname, username: context.username,
    currentPath: context.currentPath, commands: context.commands,
    hints: context.hints, taskText: context.taskText, hosts: context.hosts,
  });
  const onSolved = vi.fn();
  const onPartialSolution = vi.fn();
  const session = new TerminalSession({ shell, context, gameMode, onSolved, onPartialSolution });
  return { session, shell, onSolved, onPartialSolution };
}

// Collect the text of every writeLine effect in order.
const lines = (fx: TerminalEffect[]) =>
  fx.filter((e): e is Extract<TerminalEffect, { type: 'writeLine' }> => e.type === 'writeLine').map(e => e.text);

const solvedEffect = (fx: TerminalEffect[]) =>
  fx.find((e): e is Extract<TerminalEffect, { type: 'solved' }> => e.type === 'solved');

const lastRender = (fx: TerminalEffect[]) =>
  [...fx].reverse().find((e): e is Extract<TerminalEffect, { type: 'renderInput' }> => e.type === 'renderInput');

// Type each character in `s` one at a time; the returned list is the Enter result.
function typeAndEnter(session: TerminalSession, s: string): TerminalEffect[] {
  for (const ch of s) session.handleData(ch);
  return session.handleData('\r');
}

describe('TerminalSession Enter', () => {
  it('isSolution command: emits output, banner and a flat solved effect', () => {
    const { session } = makeSession({
      commands: [{ pattern: 'fix-it', output: 'behoben', isSolution: true, skillGain: { linux: 2 } }],
      solutions: [],
    });
    const fx = typeAndEnter(session, 'fix-it');
    expect(lines(fx)).toContain('behoben');
    expect(lines(fx)).toContain('\x1b[32m║  ✓ AUFGABE ABGESCHLOSSEN                                     ║\x1b[0m');
    const solved = solvedEffect(fx);
    expect(solved).toBeDefined();
    expect(solved!.skillGain).toMatchObject({ linux: 2 });
    // solved must be the flat LAST element.
    expect(fx[fx.length - 1]).toBe(solved);
    expect(session.getSnapshot().solved).toBe(true);
  });

  it('isPartialSolution: emits output + showPartial, does not mark solved', () => {
    const { session } = makeSession({
      commands: [{ pattern: 'halb', output: 'teilweise', isPartialSolution: true, wrongApproachFeedback: 'Nicht ganz.' }],
      solutions: [],
    });
    const fx = typeAndEnter(session, 'halb');
    expect(lines(fx)).toContain('teilweise');
    expect(fx).toContainEqual({ type: 'showPartial', feedback: 'Nicht ganz.' });
    expect(solvedEffect(fx)).toBeUndefined();
    expect(session.getSnapshot().solved).toBe(false);
    expect(lastRender(fx)).toMatchObject({ line: '', cursor: 0 });
  });

  it('multi-step non-solution command completing a solution announces solved', () => {
    const { session } = makeSession({
      commands: [{ pattern: 'schritt1', output: 'ok1' }],
      solutions: [{ commands: ['schritt1'], allRequired: false, resultText: 'fertig', skillGain: { linux: 1 }, effects: {} }],
    });
    const fx = typeAndEnter(session, 'schritt1');
    expect(lines(fx)).toContain('ok1');
    const solved = solvedEffect(fx);
    expect(solved).toBeDefined();
    expect(solved!.skillGain).toMatchObject({ linux: 1 });
    // resultText appears cyan in the banner.
    expect(lines(fx)).toContain('\x1b[36mfertig\x1b[0m');
  });

  it('history expansion !! echoes the expanded command', () => {
    const { session } = makeSession({ commands: [], solutions: [] });
    // First: `ls` matches no scenario command, but is added to history.
    typeAndEnter(session, 'ls');
    // Then: `!!` expands to `ls`; the changed branch echoes it.
    const fx = typeAndEnter(session, '!!');
    expect(lines(fx)).toContain('ls');
  });

  it('after-action feedback is appended to the solve banner', () => {
    const { session } = makeSession({
      commands: [{ pattern: 'done', output: 'ok' }],
      solutions: [{
        commands: ['done'], allRequired: false, resultText: 'fertig', skillGain: {}, effects: {},
        feedback: [{ when: { commandAbsent: { pattern: 'zzznever' } }, text: '⚠ RISK' }],
      }],
    });
    const fx = typeAndEnter(session, 'done');
    expect(solvedEffect(fx)).toBeDefined();
    // The feedback line is appended after resultText, cyan.
    expect(lines(fx)).toContain('\x1b[36m⚠ RISK\x1b[0m');
  });
});
