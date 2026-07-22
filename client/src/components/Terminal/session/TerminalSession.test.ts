import { describe, it, expect, vi } from 'vitest';
import { createShellFromContext } from '../../../engine/shell';
import { TerminalContext } from '@kritis/shared';
import { TerminalSession } from './TerminalSession';

const baseCtx: TerminalContext = {
  type: 'linux', hostname: 'ws-admin', username: 'timo',
  currentPath: '/home/timo', hints: [], commands: [], solutions: [],
};

function makeSession(overrides: Partial<TerminalContext> = {}, gameMode = 'intermediate' as const) {
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
