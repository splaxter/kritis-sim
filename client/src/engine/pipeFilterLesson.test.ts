import { describe, it, expect, vi } from 'vitest';
import { learningPathEvents } from '../content/events/learning-path';
import { createShellFromContext } from './shell';
import { TerminalSession } from '../components/Terminal/session/TerminalSession';

/**
 * "Der Filter" (learn_05_pipe_filter): the pipes foundations lesson.
 *
 * Regression guard against the shadowing bug that made it unwinnable as
 * instructed: a plain `cat /etc/passwd` beat matched via startsWith swallowed
 * every `cat /etc/passwd | …` pipe command, so the scripted pipe solutions
 * behind it were unreachable. All beats are now anchored regexes, and the case
 * is solved only after both instructed pipe steps (find + count) are done.
 */
const ID = 'learn_05_pipe_filter';
const lesson = learningPathEvents.find((e) => e.id === ID)!;
const ctx = lesson.terminalContext!;

/** Mirror useTerminal's first-match-wins scenario command routing. */
function route(input: string) {
  return ctx.commands.find((c) =>
    c.patternRegex
      ? new RegExp(c.patternRegex).test(input)
      : input.startsWith(c.pattern) || input === c.pattern
  );
}

function makeSession() {
  const shell = createShellFromContext({
    type: ctx.type,
    hostname: ctx.hostname,
    username: ctx.username,
    currentPath: ctx.currentPath,
    commands: ctx.commands,
    hints: ctx.hints,
  });
  return new TerminalSession({
    shell,
    context: ctx,
    gameMode: 'learning',
    onSolved: vi.fn(),
    onPartialSolution: vi.fn(),
  });
}

function enter(session: TerminalSession, command: string) {
  for (const char of command) session.handleData(char);
  return session.handleData('\r');
}

describe(`learning lesson: ${ID}`, () => {
  it('every scripted beat is an anchored regex (no startsWith shadowing)', () => {
    for (const cmd of ctx.commands) {
      expect(cmd.patternRegex, `beat "${cmd.pattern}" must use an anchored regex`).toBeDefined();
      expect(cmd.patternRegex!.startsWith('^')).toBe(true);
      expect(() => new RegExp(cmd.patternRegex!)).not.toThrow();
    }
  });

  it('the plain-cat beat only matches plain cat, never a piped command', () => {
    const plain = route('cat /etc/passwd')!;
    expect(plain.output).toContain('Du brauchst Pipes');
    // The bug: these used to hit the plain-cat beat instead of their own.
    expect(route('cat /etc/passwd | grep malware')).not.toBe(plain);
    expect(route('cat /etc/passwd | wc -l')).not.toBe(plain);
    expect(route('cat /etc/passwd | grep bash')).not.toBe(plain);
  });

  it('the instructed pipe commands reach their own beats', () => {
    expect(route('cat /etc/passwd | grep malware')?.teachesCommand).toBe('step_find');
    expect(route('cat /etc/passwd | wc -l')?.teachesCommand).toBe('step_count');
    // whitespace / quoting tolerance
    expect(route('cat /etc/passwd|grep "malware"')?.teachesCommand).toBe('step_find');
    expect(route('cat /etc/passwd  |  wc -l')?.teachesCommand).toBe('step_count');
  });

  it('wc without -l gets a nudge, not a completion', () => {
    const beat = route('cat /etc/passwd | wc')!;
    expect(beat.isSolution).toBeFalsy();
    expect(beat.output).toContain('-l');
  });

  it('requires both the find and count steps', () => {
    for (const input of [
      'cat /etc/passwd | grep malware',
      'cat /etc/passwd | grep ":0:" | grep -v root',
      'grep malware /etc/passwd',
    ]) {
      expect(route(input)?.teachesCommand).toBe('step_find');
      expect(route(input)?.isSolution).toBeFalsy();
    }

    expect(route('cat /etc/passwd | wc -l')?.teachesCommand).toBe('step_count');
    expect(ctx.solutions).toHaveLength(1);
    expect(ctx.solutions[0]).toMatchObject({
      commands: ['step_find', 'step_count'],
      allRequired: true,
    });
  });

  it('the first hint never hands over a full solution command', () => {
    expect(/\|\s*grep\s+["\']?malware/i.test(ctx.hints[0])).toBe(false);
  });

  it.each([
    ['cat /etc/passwd | grep malware', 'cat /etc/passwd | wc -l'],
    ['cat /etc/passwd | wc -l', 'cat /etc/passwd | grep malware'],
  ])('solves only after both steps: %s then %s', (first, second) => {
    const session = makeSession();

    enter(session, first);
    expect(session.getSnapshot().solved).toBe(false);

    enter(session, second);
    expect(session.getSnapshot().solved).toBe(true);
  });
});
