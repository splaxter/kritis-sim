/**
 * After-action feedback — a pure evaluator over the shell's execution log.
 *
 * `selectFeedback(rules, log)` picks the first authored `FeedbackRule` whose
 * `when` conditions all hold and returns its `text`, else null. All conditions
 * of ONE rule are AND-verknüpft; rules are tried top-to-bottom (author orders
 * risk before praise). Never throws — an invalid regex yields no match plus a
 * single console warning.
 */
import { CommandMatcher, FeedbackRule } from '@kritis/shared';
import { CommandAttempt } from './types';

/** Patterns already warned about, so an invalid regex warns exactly once. */
const warnedPatterns = new Set<string>();

/** Compile an authored regex; invalid patterns warn once and yield null. */
function safeRegex(pattern: string): RegExp | null {
  try {
    return new RegExp(pattern);
  } catch {
    if (!warnedPatterns.has(pattern)) {
      warnedPatterns.add(pattern);
      console.warn(`selectFeedback: ignoring invalid feedback pattern: ${pattern}`);
    }
    return null;
  }
}

/** attempted → any exit; succeeded → exit 0; failed → exit ≠ 0. */
function matchOutcome(a: CommandAttempt, outcome: CommandMatcher['outcome']): boolean {
  switch (outcome ?? 'attempted') {
    case 'succeeded':
      return a.exitCode === 0;
    case 'failed':
      return a.exitCode !== 0;
    default:
      return true;
  }
}

/** True iff this attempt satisfies the matcher (pattern AND outcome AND authMethod). */
function attemptMatches(a: CommandAttempt, m: CommandMatcher): boolean {
  const re = safeRegex(m.pattern);
  if (!re) return false;
  if (!re.test(a.command)) return false;
  if (!matchOutcome(a, m.outcome)) return false;
  if (m.authMethod && a.authMethod !== m.authMethod) return false;
  return true;
}

/** First matching attempt in log order (the log is already sequence-ordered). */
function firstMatch(log: CommandAttempt[], m: CommandMatcher): CommandAttempt | null {
  for (const a of log) {
    if (attemptMatches(a, m)) return a;
  }
  return null;
}

/** A pair holds iff both match and the first's sequence is STRICTLY before the second's. */
function pairHolds(log: CommandAttempt[], pair: { first: CommandMatcher; second: CommandMatcher }): boolean {
  const first = firstMatch(log, pair.first);
  const second = firstMatch(log, pair.second);
  if (!first || !second) return false;
  return first.sequence < second.sequence;
}

/** AND of every declared `when` sub-condition. */
function ruleHolds(rule: FeedbackRule, log: CommandAttempt[]): boolean {
  const w = rule.when;

  if (w.commandMatches && !firstMatch(log, w.commandMatches)) return false;

  if (w.commandAbsent && firstMatch(log, w.commandAbsent)) return false;

  if (w.commandBefore) {
    for (const pair of w.commandBefore) {
      if (!pairHolds(log, pair)) return false;
    }
  }

  if (w.commandCount) {
    const { matcher, min, max } = w.commandCount;
    const count = log.reduce((n, a) => (attemptMatches(a, matcher) ? n + 1 : n), 0);
    if (min !== undefined && count < min) return false;
    if (max !== undefined && count > max) return false;
  }

  return true;
}

/** Return the first matching rule's text, else null. */
export function selectFeedback(rules: FeedbackRule[], log: CommandAttempt[]): string | null {
  for (const rule of rules) {
    if (ruleHolds(rule, log)) return rule.text;
  }
  return null;
}
