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

// Join the text of every writeLine effect (for substring assertions).
const linesText = (fx: TerminalEffect[]) =>
  fx.filter((e): e is Extract<TerminalEffect, { type: 'writeLine' }> => e.type === 'writeLine')
    .map(e => e.text).join('\n');

const lastRender = (fx: TerminalEffect[]) =>
  [...fx].reverse().find((e): e is Extract<TerminalEffect, { type: 'renderInput' }> => e.type === 'renderInput');

const updateHints = (fx: TerminalEffect[]) =>
  fx.find((e): e is Extract<TerminalEffect, { type: 'updateHints' }> => e.type === 'updateHints');

// Type each character in `s`; the returned list is the result of the final char.
function type(session: TerminalSession, s: string): TerminalEffect[] {
  let fx: TerminalEffect[] = [];
  for (const ch of s) fx = session.handleData(ch);
  return fx;
}

describe('TerminalSession Tab completion', () => {
  it('single-match Tab fills the token', () => {
    const { session } = makeSession({ commands: [{ pattern: 'diagnose-net', output: 'x' }] });
    type(session, 'diag');
    const fx = session.handleData('\t');
    const render = lastRender(fx);
    expect(render).toBeDefined();
    expect(render!.line).toContain('diagnose-net');
  });

  it('no-match on a non-empty line rings the bell (no redraw)', () => {
    const { session } = makeSession({ commands: [] });
    type(session, 'zzz');
    const fx = session.handleData('\t');
    expect(fx).toContainEqual({ type: 'bell' });
    // The line is untouched — no fresh renderInput redraw for the bell.
    expect(lastRender(fx)).toBeUndefined();
  });

  it('empty-line Tab lists the available commands (cyan grid)', () => {
    const { session } = makeSession({ commands: [{ pattern: 'diagnose-net', output: 'x' }] });
    const fx = session.handleData('\t');
    const text = linesText(fx);
    // The real shell has built-in commands; empty-line Tab lists them.
    expect(text).toContain('ls');
    expect(text).toContain('grep');
    // Cyan-coded grid rows.
    expect(text).toContain('\x1b[36m');
  });

  it('multi-match fills the common prefix, then a second Tab lists options', () => {
    const { session } = makeSession({
      commands: [{ pattern: 'deploy-web', output: 'x' }, { pattern: 'deploy-db', output: 'x' }],
    });
    type(session, 'dep');
    const first = session.handleData('\t');
    // First Tab: fill the longest common prefix.
    expect(lastRender(first)!.line).toBe('deploy-');
    // Second Tab (token now equals lcp): list both options as a cyan grid.
    const second = session.handleData('\t');
    const text = linesText(second);
    expect(text).toContain('deploy-web');
    expect(text).toContain('deploy-db');
    expect(text).toContain('\x1b[36m');
  });
});

describe('TerminalSession hints', () => {
  it('? on an empty line shows the next hint and emits updateHints', () => {
    const { session } = makeSession({ hints: ['Hinweis A', 'Hinweis B'] });

    const fx1 = session.handleData('?');
    expect(linesText(fx1)).toContain('\x1b[33m💡 Hinweis A\x1b[0m');
    expect(updateHints(fx1)).toEqual({ type: 'updateHints', count: 1 });
    expect(session.getSnapshot().hintsUsed).toBe(1);

    const fx2 = session.handleData('?');
    expect(linesText(fx2)).toContain('\x1b[33m💡 Hinweis B\x1b[0m');
    expect(updateHints(fx2)).toEqual({ type: 'updateHints', count: 2 });
    expect(session.getSnapshot().hintsUsed).toBe(2);

    const fx3 = session.handleData('?');
    expect(linesText(fx3)).toContain('Keine weiteren Hinweise verfügbar.');
    // Exhausted: no further increment, no updateHints.
    expect(updateHints(fx3)).toBeUndefined();
    expect(session.getSnapshot().hintsUsed).toBe(2);
  });

  it('? on a non-empty line inserts it as a character (Task 5 regression guard)', () => {
    const { session } = makeSession({ hints: ['Hinweis A'] });
    type(session, 'a');
    const fx = session.handleData('?');
    expect(lastRender(fx)!.line).toBe('a?');
    expect(updateHints(fx)).toBeUndefined();
    expect(session.getSnapshot().hintsUsed).toBe(0);
  });

  it('handleHintRequest mirrors the footer button (no emoji, guarded when exhausted)', () => {
    const { session } = makeSession({ hints: ['Nur einer'] });

    const fx1 = session.handleHintRequest();
    // showHint wording: \r\n prefix, NO 💡 emoji.
    expect(linesText(fx1)).toContain('\r\n\x1b[33mNur einer\x1b[0m');
    expect(linesText(fx1)).not.toContain('💡');
    expect(updateHints(fx1)).toEqual({ type: 'updateHints', count: 1 });
    expect(session.getSnapshot().hintsUsed).toBe(1);

    // Exhausted: showHint emits nothing (guarded by hintsUsed < hints.length).
    const fx2 = session.handleHintRequest();
    expect(fx2).toEqual([]);
    expect(session.getSnapshot().hintsUsed).toBe(1);
  });
});
