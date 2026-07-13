import { describe, it, expect } from 'vitest';
import { learningPathEvents } from '../content/events/learning-path';

/**
 * Regression guard for the plain-pattern shadowing bug.
 *
 * At runtime (components/Terminal/useTerminal.ts) scenario beats are matched
 * first-match-wins in array order. A beat WITHOUT `patternRegex` matches via
 * `input.startsWith(pattern)` — so a bare beat sitting before another beat
 * whose command begins with that same prefix (e.g. `ps aux` before
 * `ps aux | grep miner`) swallows it, making the later, often `isSolution`,
 * beat unreachable and the instructed command show the wrong output.
 *
 * The fix is to anchor bare beats with a `^…$` regex. This test fails if any
 * plain-pattern beat shadows a later command in any learning terminal level.
 */
describe('learning-path terminal beats: no plain-pattern shadowing', () => {
  const levels = learningPathEvents.filter((e) => e.terminalContext);

  for (const level of levels) {
    it(`${level.id}: no bare beat shadows a later command`, () => {
      const cmds = level.terminalContext!.commands;
      const violations: string[] = [];

      for (let i = 0; i < cmds.length; i++) {
        const a = cmds[i];
        // A regex beat doesn't use startsWith, so it can't shadow this way.
        if (a.patternRegex || !a.pattern) continue;

        for (let j = i + 1; j < cmds.length; j++) {
          const b = cmds[j];
          if (!b.pattern || b.pattern === a.pattern) continue;
          if (b.pattern.startsWith(a.pattern)) {
            violations.push(
              `plain "${a.pattern}" (beat ${i}) shadows "${b.pattern}" ` +
                `(beat ${j}${b.isSolution ? ', isSolution' : ''})`
            );
          }
        }
      }

      expect(violations, violations.join('\n')).toEqual([]);
    });
  }
});
