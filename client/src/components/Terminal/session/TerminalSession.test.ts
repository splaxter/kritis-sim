import { describe, it, expect, vi } from 'vitest';
import { createShellFromContext } from '../../../engine/shell';
import { TerminalContext, GameModeId } from '@kritis/shared';
import { TerminalSession } from './TerminalSession';

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
  const session = new TerminalSession({ shell, context, gameMode, onSolved });
  return { session, shell, onSolved };
}

const textOf = (effects: ReturnType<TerminalSession['init']>) =>
  effects.map(e => 'text' in e ? e.text : e.type === 'renderInput' ? e.prompt + e.line : '').join('\n');

describe('TerminalSession.init', () => {
  it('emits the connect banner and ends on the first prompt', () => {
    const { session } = makeSession();
    const effects = session.init();
    expect(textOf(effects)).toContain('Connected to ws-admin');
    expect(effects.at(-1)).toMatchObject({ type: 'renderInput', line: '', cursor: 0 });
  });

  it('auto-shows the first hint only in beginner mode', () => {
    const beginner = makeSession({ hints: ['Tipp eins'] }, 'beginner');
    expect(textOf(beginner.session.init())).toContain('Tipp eins');
    expect(beginner.session.getSnapshot().hintsUsed).toBe(1);
  });

  it('does NOT auto-show the hint in learning mode', () => {
    const learning = makeSession({ hints: ['Tipp eins'] }, 'learning');
    expect(textOf(learning.session.init())).not.toContain('Tipp eins');
    expect(learning.session.getSnapshot().hintsUsed).toBe(0);
  });

  it('snapshot never leaks input-line state (only hintsUsed/commandsUsed/solved keys)', () => {
    const { session } = makeSession();
    session.init();
    expect(Object.keys(session.getSnapshot()).sort()).toEqual(['commandsUsed', 'hintsUsed', 'solved']);
  });
});

describe('TerminalSession.handleIdleHint', () => {
  it('reveals the next hint with the 💡 line + bare prompt and increments hintsUsed', () => {
    const { session } = makeSession({ hints: ['Erster Hinweis', 'Zweiter Hinweis'] }, 'learning');
    const effects = session.handleIdleHint();
    // blank line, yellow 💡 hint, then a bare fresh prompt written (no newline).
    expect(effects).toEqual([
      { type: 'writeLine', text: '' },
      { type: 'writeLine', text: '\x1b[33m💡 Erster Hinweis\x1b[0m' },
      expect.objectContaining({ type: 'write' }),
    ]);
    expect(effects.at(-1)).toMatchObject({ type: 'write' });
    expect(session.getSnapshot().hintsUsed).toBe(1);
  });

  it('does NOT touch the input line/cursor (no renderInput; line survives)', () => {
    const { session } = makeSession({ hints: ['Nur ein Hinweis'] });
    session.handleData('l');
    session.handleData('s'); // typed "ls" but not entered
    const effects = session.handleIdleHint();
    expect(effects.some(e => e.type === 'renderInput')).toBe(false);
    // The still-typed line runs unchanged on the next Enter.
    const enterText = session.handleData('\r').map(e => 'text' in e ? e.text : '').join('\n');
    expect(enterText).not.toContain('command not found');
  });

  it('emits nothing (and reveals no "Keine weiteren") once hints are exhausted', () => {
    const { session } = makeSession({ hints: ['Einziger Hinweis'] });
    session.handleIdleHint();                       // consumes the only hint
    expect(session.getSnapshot().hintsUsed).toBe(1);
    const again = session.handleIdleHint();
    expect(again).toEqual([]);
    expect(session.getSnapshot().hintsUsed).toBe(1);
  });

  it('returns [] with no hints configured', () => {
    const { session } = makeSession({ hints: [] });
    expect(session.handleIdleHint()).toEqual([]);
  });
});
