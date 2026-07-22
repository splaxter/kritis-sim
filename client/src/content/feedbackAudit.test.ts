/**
 * Content audit: every authored after-action feedback pattern must compile.
 *
 * Walks all events, collects every `CommandMatcher.pattern` reachable from a
 * solution's `feedback` rules (commandMatches / commandAbsent / commandBefore
 * first+second / commandCount.matcher) and asserts `new RegExp(pattern)` never
 * throws. Guards future authoring; passes trivially while no feedback exists.
 */
import { describe, it, expect } from 'vitest';
import { allEvents } from './events';
import type { CommandMatcher, FeedbackRule } from '@kritis/shared';

function matchersOf(rule: FeedbackRule): CommandMatcher[] {
  const w = rule.when;
  const out: CommandMatcher[] = [];
  if (w.commandMatches) out.push(w.commandMatches);
  if (w.commandAbsent) out.push(w.commandAbsent);
  if (w.commandBefore) {
    for (const pair of w.commandBefore) out.push(pair.first, pair.second);
  }
  if (w.commandCount) out.push(w.commandCount.matcher);
  return out;
}

describe('feedback content audit', () => {
  it('every authored feedback pattern compiles', () => {
    const bad: { event: string; pattern: string; error: string }[] = [];

    for (const event of allEvents) {
      const solutions = event.terminalContext?.solutions ?? [];
      for (const solution of solutions) {
        for (const rule of solution.feedback ?? []) {
          for (const matcher of matchersOf(rule)) {
            try {
              new RegExp(matcher.pattern);
            } catch (e) {
              bad.push({ event: event.id, pattern: matcher.pattern, error: String(e) });
            }
          }
        }
      }
    }

    expect(bad, `invalid feedback regex patterns:\n${JSON.stringify(bad, null, 2)}`).toEqual([]);
  });
});
