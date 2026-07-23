import { describe, it, expect, vi } from 'vitest';
import { createShellFromContext } from '../../../engine/shell';
import { TerminalContext, GameModeId } from '@kritis/shared';
import { TerminalSession } from './TerminalSession';
import { TerminalEffect } from './effects';

// A multi-host context: `ssh admin@web01` triggers a masked password prompt,
// and a remote-file stateGoal solves the level (mirrors Terminal.multihost).
const baseCtx: TerminalContext = {
  type: 'linux', hostname: 'ws-admin', username: 'timo', currentPath: '/home/timo',
  hints: [], commands: [], solutions: [],
  hosts: [{ id: 'web01', hostname: 'web01', accounts: [{ name: 'admin', password: 'pw123' }] }],
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

// Feed a string char-by-char, then Enter; return ALL effects emitted across
// every keystroke (so masked-echo assertions can inspect per-keystroke output).
function typeAndEnter(session: TerminalSession, s: string): TerminalEffect[] {
  const all: TerminalEffect[] = [];
  for (const ch of s) all.push(...session.handleData(ch));
  all.push(...session.handleData('\r'));
  return all;
}

// Concatenate the text of every writeLine + write effect (all visible output).
const allText = (fx: TerminalEffect[]) =>
  fx
    .filter((e): e is Extract<TerminalEffect, { type: 'writeLine' | 'write' }> =>
      e.type === 'writeLine' || e.type === 'write')
    .map(e => e.text)
    .join('\n');

const solvedEffect = (fx: TerminalEffect[]) =>
  fx.find((e): e is Extract<TerminalEffect, { type: 'solved' }> => e.type === 'solved');

const passwordPrompts = (fx: TerminalEffect[]) =>
  fx.filter(e => (e.type === 'write' || e.type === 'writeLine') && e.text.includes("password: "));

describe('TerminalSession pending input (ssh password prompts)', () => {
  it('a) ssh arms a masked password prompt; the password never leaks', () => {
    const { session } = makeSession();

    const arm = typeAndEnter(session, 'ssh admin@web01');
    expect(allText(arm)).toContain("admin@web01's password: ");
    expect(session.getSnapshot().solved).toBe(false);

    // Feed the masked password char-by-char: NONE of those effects echo it.
    const keyFx: TerminalEffect[] = [];
    for (const ch of 'pw123') keyFx.push(...session.handleData(ch));
    expect(JSON.stringify(keyFx)).not.toContain('pw123');
    expect(allText(keyFx)).toBe(''); // masked → no echo at all

    // Enter completes login: the next prompt reflects the remote session.
    const login = session.handleData('\r');
    const nextPrompt = [...login].reverse().find(
      (e): e is Extract<TerminalEffect, { type: 'renderInput' }> => e.type === 'renderInput');
    expect(nextPrompt?.prompt).toContain('admin@web01');

    // Nothing anywhere leaked the password.
    expect(JSON.stringify([...arm, ...keyFx, ...login])).not.toContain('pw123');
    expect(session.getSnapshot()).not.toHaveProperty('pendingBuffer');
    expect(JSON.stringify(session.getSnapshot())).not.toContain('pw123');
  });

  it('b) a wrong password re-arms a fresh (still masked) password prompt', () => {
    const { session } = makeSession();

    typeAndEnter(session, 'ssh admin@web01'); // arm
    // Wrong answer → continueInput returns pendingInput again (retry).
    const retry = typeAndEnter(session, 'nope');
    expect(passwordPrompts(retry).length).toBeGreaterThanOrEqual(1);

    // Still pending & not solved: a masked answer still echoes nothing.
    expect(session.getSnapshot().solved).toBe(false);
    const echo: TerminalEffect[] = [];
    for (const ch of 'x') echo.push(...session.handleData(ch));
    expect(allText(echo)).toBe('');
  });

  it('c) Ctrl+C aborts the pending prompt exactly once (idempotent)', () => {
    const { session, shell } = makeSession();
    const cancelSpy = vi.fn();
    const origCancel = shell.cancelPendingInput.bind(shell);
    shell.cancelPendingInput = () => { cancelSpy(); origCancel(); };

    typeAndEnter(session, 'ssh admin@web01'); // arm

    const abort = session.handleData('\x03');
    expect(allText(abort)).toContain('^C');
    expect(cancelSpy).toHaveBeenCalledTimes(1);

    // Pending cleared: a normal command now executes normally.
    const pwd = typeAndEnter(session, 'pwd');
    expect(allText(pwd)).toContain('/home/timo');

    // A SECOND Ctrl+C (not pending) hits the normal handler, never re-cancels.
    const abort2 = session.handleData('\x03');
    expect(allText(abort2)).toContain('^C');
    expect(cancelSpy).toHaveBeenCalledTimes(1);
  });

  it('d) skill drip is credited once on exit 0, even when the command runs twice', () => {
    const { session } = makeSession({
      commandSkillGain: { pwd: { linux: 1 } },
      solutions: [{ commands: [], allRequired: false, stateGoals: [{ file: '/tmp/drip', fileExists: true }], resultText: 'ok', skillGain: {}, effects: {} }],
    });

    typeAndEnter(session, 'pwd');
    typeAndEnter(session, 'pwd'); // second run must NOT credit the drip again

    const fx = typeAndEnter(session, 'touch /tmp/drip'); // triggers the stateGoal solve
    const solved = solvedEffect(fx);
    expect(solved).toBeDefined();
    // Merged gain = live drip {linux:1} (once) + solution {} = {linux:1}, not {linux:2}.
    expect(solved!.skillGain).toEqual({ linux: 1 });
  });

  it('e) a stateGoals solution completes via handleShellResult (ssh + remote touch)', () => {
    const { session } = makeSession({
      solutions: [{ commands: [], allRequired: false, stateGoals: [{ host: 'web01', file: '/tmp/x', fileExists: true }], resultText: 'ok', skillGain: {}, effects: {} }],
    });

    typeAndEnter(session, 'ssh admin@web01'); // arms the password prompt
    for (const ch of 'pw123') session.handleData(ch);
    session.handleData('\r'); // submit the password → logged in

    const fx = typeAndEnter(session, 'touch /tmp/x');
    expect(solvedEffect(fx)).toBeDefined();
    expect(allText(fx)).toContain('AUFGABE ABGESCHLOSSEN');
  });

  it('f) the password never appears in the execution log', () => {
    const { session, shell } = makeSession();
    typeAndEnter(session, 'ssh admin@web01');
    for (const ch of 'pw123') session.handleData(ch);
    session.handleData('\r');

    const log = shell.getExecutionLog();
    expect(log.some(a => a.command.includes('pw123'))).toBe(false);
    expect(log.some(a => a.command.includes('ssh admin@web01'))).toBe(true);
  });
});
