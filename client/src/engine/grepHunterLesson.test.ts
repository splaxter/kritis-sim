import { describe, it, expect } from 'vitest';
import { learningPathEvents } from '../content/events/learning-path';
import { createShellFromContext } from './shell';
import { TerminalContext } from '@kritis/shared';

/**
 * "Der Grep-Jäger" (learn_04_grep_hunter): the grep foundations lesson.
 *
 * Guards the two things that broke it in playtesting:
 * 1. The world must be real — every file the quest/ls mentions exists in the
 *    VFS, and real grep output agrees with the scripted beats (no phantom
 *    "system.log", no canned output lines grep would never print).
 * 2. Command routing — scripted beats are matched first-come-first-serve, so
 *    a broad catch-all must never shadow a legitimate grep (the old
 *    `grep .*auth.log` nudge swallowed every auth.log search).
 */
const ID = 'learn_04_grep_hunter';
const lesson = learningPathEvents.find((e) => e.id === ID)!;
const ctx = lesson.terminalContext!;

const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, '');

/** Mirror useTerminal's first-match-wins scenario command routing. */
function route(input: string) {
  return ctx.commands.find((c) =>
    c.patternRegex
      ? new RegExp(c.patternRegex).test(input)
      : input.startsWith(c.pattern) || input === c.pattern
  );
}

/** Run a command through the real shell engine (VFS fallback path). */
function shellRun(input: string) {
  const shell = createShellFromContext(ctx as TerminalContext & { type: 'linux' });
  const result = shell.execute(input);
  return { ...result, output: stripAnsi(result.output) };
}

describe(`learning lesson: ${ID}`, () => {
  it('quest text and ls only mention files that exist in the VFS', () => {
    const files = (ctx.vfsOverlay?.files ?? []).map((f) => f.path);
    for (const name of ['syslog', 'auth.log', 'kern.log']) {
      expect(files).toContain(`/var/log/${name}`);
    }
    // The old quest text pointed at a non-existent system.log
    expect(lesson.description).not.toContain('system.log');
    expect(ctx.taskText).toBeDefined();
    expect(ctx.taskText).not.toContain('system.log');
  });

  it('real grep "ALERT" syslog agrees with the scripted beat (3 alert lines)', () => {
    const real = shellRun('grep "ALERT" syslog');
    const realLines = real.output.split('\n').filter(Boolean);
    expect(realLines).toHaveLength(3);

    const beat = route('grep "ALERT" syslog')!;
    for (const line of realLines) {
      expect(beat.output).toContain(line);
    }
  });

  it('real grep -c "ERROR" syslog agrees with the scripted count', () => {
    const real = shellRun('grep -c "ERROR" syslog');
    const beat = route('grep -c "ERROR" syslog')!;
    expect(real.output.trim()).toBe(beat.output.split('\n')[0].trim());
  });

  it('real grep -n "185" auth.log yields exactly the line numbers the beat shows', () => {
    const real = shellRun('grep -n "185" auth.log');
    const realNumbers = real.output
      .split('\n')
      .filter(Boolean)
      .map((l) => l.split(':')[0]);
    expect(realNumbers).toEqual(['47', '48', '49', '52', '55']);
  });

  it('the failed-passwords beat only shows lines grep -i failed would match', () => {
    const beat = route('grep -i "failed" auth.log')!;
    const logLines = beat.output.split('\n').filter((l) => l.startsWith('Mar 15'));
    expect(logLines.length).toBeGreaterThan(0);
    for (const line of logLines) {
      expect(line.toLowerCase()).toContain('failed');
    }
  });

  it('the wrong-file nudge only fires for ALERT on auth.log, never for real searches', () => {
    const nudge = ctx.commands.find((c) => c.output.includes('nicht die ALERT-Meldungen'))!;
    expect(route('grep "ALERT" auth.log')).toBe(nudge);
    // These are legitimate searches and must reach their own beats
    expect(route('grep -i "failed" auth.log')).not.toBe(nudge);
    expect(route('grep -n "185" auth.log')).not.toBe(nudge);
    expect(route('grep "Accepted" auth.log')).not.toBe(nudge);
  });

  it('the lesson is winnable via every hinted path, with or without quotes', () => {
    for (const input of [
      'grep "185.234" syslog',
      'grep 185 syslog',
      'grep 185 auth.log',
      'grep -n 185 auth.log',
      'grep Accepted auth.log',
    ]) {
      const beat = route(input);
      expect(beat?.isSolution, `"${input}" must reach a solution beat`).toBe(true);
    }
  });

  it('unscripted greps fall through to real, correct output (no dead world)', () => {
    // Not a scripted beat — must be answered truthfully by the VFS
    expect(route('grep ERROR syslog')).toBeUndefined();
    const real = shellRun('grep ERROR syslog');
    expect(real.output.split('\n').filter(Boolean)).toHaveLength(7);

    expect(route('cat syslog')).toBeUndefined();
    expect(shellRun('cat syslog').output).toContain('UNAUTHORIZED_ACCESS from 185.234.72.15');
  });

  it('hints escalate: first orients, only the last hands over exact syntax', () => {
    expect(/grep\s+["']?185/i.test(ctx.hints[0])).toBe(false);
    expect(/grep\s+["']?185/i.test(ctx.hints[ctx.hints.length - 1])).toBe(true);
  });
});
