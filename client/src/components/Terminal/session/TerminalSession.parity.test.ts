// Full-flow PARITY of TerminalSession against the existing browser scenarios.
//
// The four Terminal.*.browser.test.tsx tests drive the OLD useTerminal hook
// through a mock xterm and assert on the concatenated write buffer. This suite
// reproduces three of those scenarios at the EFFECT level (feedback, multihost,
// partial) to prove the framework-free session is behavior-faithful BEFORE the
// hook is flipped onto it (Task 11).
//
// NOT mirrored: Terminal.taskPanel.browser.test.tsx — that is a pure UI/DOM
// test about the React task panel and has no session-level analogue.
import { describe, it, expect, vi } from 'vitest';
import { createShellFromContext } from '../../../engine/shell';
import { TerminalContext, GameModeId } from '@kritis/shared';
import { TerminalSession } from './TerminalSession';
import { TerminalEffect } from './effects';

const RISK_LINE = '⚠ RISKANT-MARKER: legitime Datei angetastet.';

function makeSession(overrides: Partial<TerminalContext>, gameMode: GameModeId = 'intermediate') {
  const context = { ...overrides } as TerminalContext;
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

// Feed a string char-by-char, then a final Enter; return every effect emitted
// across the whole line (mirrors how the browser `enter()` helper drives xterm).
function typeAndEnter(session: TerminalSession, s: string): TerminalEffect[] {
  const all: TerminalEffect[] = [];
  for (const ch of s) all.push(...session.handleData(ch));
  all.push(...session.handleData('\r'));
  return all;
}

// Project the effect stream into the same "written buffer" the browser tests
// assert on: visible output (writeLine/write), the prompt+line of each redraw,
// the solve banner's resultText, and any partial-feedback text — concatenated
// in emission order.
function written(fx: TerminalEffect[]): string {
  const parts: string[] = [];
  for (const e of fx) {
    switch (e.type) {
      case 'writeLine':
      case 'write': parts.push(e.text); break;
      case 'renderInput': parts.push(e.prompt + e.line); break;
      case 'solved': parts.push(e.resultText); break;
      case 'showPartial': parts.push(e.feedback); break;
      default: break;
    }
  }
  return parts.join('\n');
}

const solvedEffect = (fx: TerminalEffect[]) =>
  fx.find((e): e is Extract<TerminalEffect, { type: 'solved' }> => e.type === 'solved');

const showPartialEffect = (fx: TerminalEffect[]) =>
  fx.find((e): e is Extract<TerminalEffect, { type: 'showPartial' }> => e.type === 'showPartial');

const lastRenderPrompt = (fx: TerminalEffect[]) =>
  [...fx].reverse().find(
    (e): e is Extract<TerminalEffect, { type: 'renderInput' }> => e.type === 'renderInput')?.prompt;

// --- Mirrors Terminal.feedback.browser.test.tsx ---
const feedbackContext: TerminalContext = {
  type: 'linux', hostname: 'ws-admin', username: 'timo', currentPath: '/home/timo',
  hints: [], commands: [],
  solutions: [{
    commands: [], allRequired: false,
    stateGoals: [{ host: 'web01', file: '/tmp/done.txt', fileExists: true }],
    resultText: 'Geschafft!', skillGain: { linux: 3 }, effects: {},
    feedback: [{ when: { commandMatches: { pattern: 'rm\\s' } }, text: RISK_LINE }],
  }],
  hosts: [{ id: 'web01', hostname: 'web01', accounts: [{ name: 'admin', password: 'pw123' }] }],
};

describe('TerminalSession parity: after-action feedback on the solve banner', () => {
  it('the risky path appends the risk line below the resultText', () => {
    const { session } = makeSession({ ...feedbackContext });
    const fx: TerminalEffect[] = [...session.init()];

    fx.push(...typeAndEnter(session, 'ssh admin@web01'));
    fx.push(...typeAndEnter(session, 'pw123'));
    expect(written(fx)).toContain('admin@web01');

    fx.push(...typeAndEnter(session, 'rm -f /tmp/keep.txt'));
    fx.push(...typeAndEnter(session, 'touch /tmp/done.txt'));

    const banner = written(fx);
    expect(banner).toContain('AUFGABE ABGESCHLOSSEN');
    expect(banner).toContain('Geschafft!');
    expect(banner).toContain(RISK_LINE);
    // The risk line is carried in the solved effect's resultText too.
    expect(solvedEffect(fx)!.resultText).toContain(RISK_LINE);
  });

  it('the clean path shows no false praise — the risk line is absent', () => {
    const { session } = makeSession({ ...feedbackContext });
    const fx: TerminalEffect[] = [...session.init()];

    fx.push(...typeAndEnter(session, 'ssh admin@web01'));
    fx.push(...typeAndEnter(session, 'pw123'));
    expect(written(fx)).toContain('admin@web01');

    fx.push(...typeAndEnter(session, 'touch /tmp/done.txt'));

    const banner = written(fx);
    expect(banner).toContain('AUFGABE ABGESCHLOSSEN');
    expect(banner).toContain('Geschafft!');
    expect(banner).not.toContain(RISK_LINE);
    expect(solvedEffect(fx)!.resultText).not.toContain(RISK_LINE);
  });
});

// --- Mirrors Terminal.multihost.browser.test.tsx ---
const multihostContext: TerminalContext = {
  type: 'linux', hostname: 'ws-admin', username: 'timo', currentPath: '/home/timo',
  hints: [], commands: [],
  solutions: [{
    commands: [], allRequired: false,
    stateGoals: [{ host: 'web01', file: '/tmp/done.txt', fileExists: true }],
    resultText: 'Geschafft!', skillGain: { linux: 3 }, effects: {},
  }],
  hosts: [{ id: 'web01', hostname: 'web01', accounts: [{ name: 'admin', password: 'pw123' }] }],
  commandSkillGain: { ssh: { linux: 2 } },
};

describe('TerminalSession parity: multi-host ssh login + remote stateGoal solve', () => {
  it('walks ssh password auth to a remote solve with merged skill gain', () => {
    const { session, onSolved } = makeSession({ ...multihostContext });
    const fx: TerminalEffect[] = [...session.init()];

    // 1. ssh arms a masked password prompt.
    const arm = typeAndEnter(session, 'ssh admin@web01');
    fx.push(...arm);
    expect(written(arm)).toContain("admin@web01's password: ");

    // 2. The password is never echoed anywhere.
    const login = typeAndEnter(session, 'pw123');
    fx.push(...login);
    expect(JSON.stringify(login)).not.toContain('pw123');

    // 3. Logged in: the next prompt reflects the remote session.
    expect(lastRenderPrompt(login)).toContain('admin@web01');

    // 4. Creating the goal file on web01 solves the level.
    const solve = typeAndEnter(session, 'touch /tmp/done.txt');
    fx.push(...solve);
    const solved = solvedEffect(solve);
    expect(solved).toBeDefined();
    expect(written(solve)).toContain('AUFGABE ABGESCHLOSSEN');
    expect(written(solve)).toContain('Geschafft!');
    expect(onSolved).not.toHaveBeenCalled();

    // 5. Solution gain {linux:3} + live ssh drip {linux:2} sum on the banner.
    expect(solved!.skillGain).toEqual({ linux: 5 });

    // 6. Enter confirms → onSolved fires exactly once with the merged gain.
    session.handleData('\r');
    expect(onSolved).toHaveBeenCalledTimes(1);
    expect(onSolved).toHaveBeenCalledWith({ linux: 5 }, undefined, {});
  });
});

// --- Mirrors Terminal.partialFeedback.browser.test.tsx ---
const partialContext: TerminalContext = {
  type: 'linux', hostname: 'srv-test', username: 'azubi', currentPath: '/home/azubi',
  hints: [],
  commands: [{
    pattern: 'unsafe-fix',
    output: 'Rollback gestartet, aber Ursache nicht geprueft.',
    isPartialSolution: true,
    wrongApproachFeedback: 'Pruefe erst die Ursache, sonst kommt der Fehler zurueck.',
  }],
  solutions: [],
};

describe('TerminalSession parity: partial-solution feedback', () => {
  it('an isPartialSolution command emits showPartial with the wrong-approach text', () => {
    const { session } = makeSession({ ...partialContext });
    const fx: TerminalEffect[] = [...session.init(), ...typeAndEnter(session, 'unsafe-fix')];

    const partial = showPartialEffect(fx);
    expect(partial).toBeDefined();
    expect(partial!.feedback).toContain('Pruefe erst die Ursache');
    // The command output is shown, and the level is NOT marked solved.
    expect(written(fx)).toContain('Rollback gestartet');
    expect(solvedEffect(fx)).toBeUndefined();
    expect(session.getSnapshot().solved).toBe(false);
  });
});
