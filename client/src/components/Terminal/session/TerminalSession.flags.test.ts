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
  const onFlagsSet = vi.fn();
  const session = new TerminalSession({ shell, context, gameMode, onSolved, onFlagsSet });
  return { session, onSolved, onFlagsSet };
}

function typeAndEnter(session: TerminalSession, s: string): TerminalEffect[] {
  for (const ch of s) session.handleData(ch);
  return session.handleData('\r');
}

describe('TerminalSession — setsFlags (honeypot mechanic)', () => {
  it('fires onFlagsSet the moment a non-solution command with setsFlags matches, without solving', () => {
    const { session, onFlagsSet } = makeSession({
      commands: [{ pattern: 'cat pst_export.pst', output: '...', setsFlags: ['mailbox_scope_exceeded'] }],
      solutions: [],
    });
    typeAndEnter(session, 'cat pst_export.pst');
    expect(onFlagsSet).toHaveBeenCalledWith(['mailbox_scope_exceeded']);
    // The level is NOT solved by reading the honeypot.
    expect(session.getSnapshot().solved).toBe(false);
  });

  it('does not fire onFlagsSet for commands without setsFlags', () => {
    const { session, onFlagsSet } = makeSession({
      commands: [{ pattern: 'cat access.log', output: 'entry' }],
      solutions: [],
    });
    typeAndEnter(session, 'cat access.log');
    expect(onFlagsSet).not.toHaveBeenCalled();
  });

  it('fires even when the setsFlags command is also a solution (flag + solve both happen)', () => {
    const { session, onFlagsSet } = makeSession({
      commands: [{ pattern: 'reveal', output: 'done', isSolution: true, setsFlags: ['peeked'] }],
      solutions: [],
    });
    typeAndEnter(session, 'reveal');
    expect(onFlagsSet).toHaveBeenCalledWith(['peeked']);
    expect(session.getSnapshot().solved).toBe(true);
  });

  it('fires once per matching command entry (each authored read form emits)', () => {
    // Each TerminalCommand whose pattern the read matches emits the flag. The
    // full per-read-path coverage matrix (cat/type/gc/Select-String/pipelines/
    // path variants) lives with the actual level content in Task 13.
    const { session, onFlagsSet } = makeSession({
      commands: [
        { pattern: 'cat pst', output: '...', setsFlags: ['mailbox_scope_exceeded'] },
        { pattern: 'Get-Content pst', output: '...', setsFlags: ['mailbox_scope_exceeded'] },
      ],
      solutions: [],
    });
    typeAndEnter(session, 'cat pst');
    typeAndEnter(session, 'Get-Content pst');
    expect(onFlagsSet).toHaveBeenCalledTimes(2);
    expect(onFlagsSet).toHaveBeenNthCalledWith(1, ['mailbox_scope_exceeded']);
    expect(onFlagsSet).toHaveBeenNthCalledWith(2, ['mailbox_scope_exceeded']);
  });
});
