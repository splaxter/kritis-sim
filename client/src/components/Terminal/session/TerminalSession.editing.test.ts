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

const lastRender = (fx: TerminalEffect[]) =>
  [...fx].reverse().find((e): e is Extract<TerminalEffect, { type: 'renderInput' }> => e.type === 'renderInput');

// Type each character in `s` one at a time, returning the last effect list.
function typeStr(session: TerminalSession, s: string): TerminalEffect[] {
  let fx: TerminalEffect[] = [];
  for (const ch of s) fx = session.handleData(ch);
  return fx;
}

describe('TerminalSession editing', () => {
  it('inserts printable chars then moves cursor with Right/Left', () => {
    const { session } = makeSession();
    let fx = typeStr(session, 'abc');
    expect(lastRender(fx)).toMatchObject({ line: 'abc', cursor: 3 });
    fx = session.handleData('\x1b[D'); // Left
    expect(lastRender(fx)).toMatchObject({ line: 'abc', cursor: 2 });
    fx = session.handleData('\x1b[C'); // Right
    expect(lastRender(fx)).toMatchObject({ line: 'abc', cursor: 3 });
  });

  it('Home and End move to line boundaries', () => {
    const { session } = makeSession();
    typeStr(session, 'abc');
    let fx = session.handleData('\x1b[H'); // Home
    expect(lastRender(fx)).toMatchObject({ cursor: 0 });
    fx = session.handleData('\x1b[F'); // End
    expect(lastRender(fx)).toMatchObject({ cursor: 3 });
  });

  it('Backspace removes the char before the cursor mid-line', () => {
    const { session } = makeSession();
    typeStr(session, 'abc');
    session.handleData('\x1b[D'); // Left -> cursor 2
    const fx = session.handleData(''); // Backspace
    expect(lastRender(fx)).toMatchObject({ line: 'ac', cursor: 1 });
  });

  it('Delete removes the char at the cursor', () => {
    const { session } = makeSession();
    typeStr(session, 'abc');
    session.handleData('\x1b[H'); // Home -> cursor 0
    const fx = session.handleData('\x1b[3~'); // Delete
    expect(lastRender(fx)).toMatchObject({ line: 'bc', cursor: 0 });
  });

  it('Ctrl-U clears the whole line', () => {
    const { session } = makeSession();
    typeStr(session, 'abc');
    const fx = session.handleData('\x15');
    expect(lastRender(fx)).toMatchObject({ line: '', cursor: 0 });
  });

  it('Ctrl-K clears to end of line', () => {
    const { session } = makeSession();
    typeStr(session, 'abc');
    session.handleData('\x1b[D'); // cursor 2
    const fx = session.handleData('\x0b');
    expect(lastRender(fx)).toMatchObject({ line: 'ab', cursor: 2 });
  });

  it('Ctrl-W deletes the previous word', () => {
    const { session } = makeSession();
    typeStr(session, 'ls -la');
    const fx = session.handleData('\x17');
    expect(lastRender(fx)).toMatchObject({ line: 'ls ', cursor: 3 });
  });

  it('Ctrl-A and Ctrl-E jump to start and end', () => {
    const { session } = makeSession();
    typeStr(session, 'abc');
    let fx = session.handleData('\x01');
    expect(lastRender(fx)).toMatchObject({ cursor: 0 });
    fx = session.handleData('\x05');
    expect(lastRender(fx)).toMatchObject({ cursor: 3 });
  });

  it('Ctrl-C writes ^C and resets to an empty prompt', () => {
    const { session } = makeSession();
    typeStr(session, 'abc');
    const fx = session.handleData('\x03');
    expect(fx).toContainEqual({ type: 'writeLine', text: '^C' });
    expect(lastRender(fx)).toMatchObject({ line: '', cursor: 0 });
  });

  it('Ctrl-L clears the screen and preserves the current line', () => {
    const { session } = makeSession();
    typeStr(session, 'abc');
    const fx = session.handleData('\x0c');
    expect(fx).toContainEqual({ type: 'clearScreen' });
    expect(lastRender(fx)).toMatchObject({ line: 'abc', cursor: 3 });
  });

  it('Up arrow recalls the previous command from history', () => {
    const { session, shell } = makeSession();
    shell.addToHistory('ls');
    const fx = session.handleData('\x1b[A');
    expect(lastRender(fx)).toMatchObject({ line: 'ls' });
  });

  it('inserts ? as a char on a non-empty line but not on an empty line', () => {
    const { session } = makeSession();
    session.handleData('a');
    const fx = session.handleData('?');
    expect(lastRender(fx)).toMatchObject({ line: 'a?', cursor: 2 });

    // On an empty line, ? triggers the hint path instead of inserting a char.
    // With no hints configured it reports "keine weiteren" and leaves the line empty.
    const { session: empty } = makeSession();
    const fxEmpty = empty.handleData('?');
    expect(lastRender(fxEmpty)).toMatchObject({ line: '', cursor: 0 });
    expect(fxEmpty.filter(e => e.type === 'writeLine').map(e => (e as { text: string }).text).join('\n'))
      .toContain('Keine weiteren Hinweise verfügbar.');
  });
});
