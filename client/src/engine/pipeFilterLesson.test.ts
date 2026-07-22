import { describe, it, expect } from 'vitest';
import { learningPathEvents } from '../content/events/learning-path';

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

  it('the core find (the backdoor account) solves the level via every path', () => {
    // Design: finding the malware account completes the level (isSolution),
    // whether via pipe, UID-0 filter, or direct grep. Counting users (wc -l)
    // is rewarded extra, not a hard gate — the player is never stuck.
    expect(route('cat /etc/passwd | grep malware')?.isSolution).toBe(true);
    expect(route('cat /etc/passwd | grep ":0:" | grep -v root')?.isSolution).toBe(true);
    expect(route('grep malware /etc/passwd')?.isSolution).toBe(true);

    expect(route('cat /etc/passwd | wc -l')?.isSolution).toBeFalsy();
    expect(ctx.solutions).toEqual([]);
  });

  it('the first hint never hands over a full solution command', () => {
    expect(/\|\s*grep\s+["\']?malware/i.test(ctx.hints[0])).toBe(false);
  });
});
