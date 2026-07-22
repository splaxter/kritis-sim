# After-Action-Feedback Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** A per-level, narrative after-action line on the terminal solve banner that recognises whether the player solved safely / riskily / efficiently — driven by a robust execution log, not bash history.

**Architecture:** ShellEngine gains an execution log (`CommandAttempt[]`) populated by `execute()` itself via a depth-guard (one entry per outer player command, sudo/internal re-entry excluded), with the attempt staying open across `execute→continueInput` password prompts. A pure `selectFeedback(rules, log)` picks the first matching authored `FeedbackRule` off `TerminalSolution.feedback`; `useTerminal` appends its text to `resultText`. V1 authors rules for sysd_04, net_03, net_01, ssh_02, and ssh_04 (after a goal-hardening correctness fix). A content audit compiles every feedback pattern.

**Tech Stack:** TypeScript, vitest (node + jsdom `*.browser.test.tsx`), xterm.js, npm workspaces (client/server/shared).

**Approved design:** `docs/plans/2026-07-22-after-action-feedback-design.md` — read first.

---

## Ground rules

- Run from repo root. After any `shared/src/` change: `npm run build -w shared` before root tests.
- TDD every task (failing test first, watch it fail, implement, watch it pass, commit).
- Engine code English/sparse; content German.
- Baseline on branch `feat/after-action-feedback`: `npm test` = 1081/1081 green, `npx tsc --noEmit -p client` clean.
- Commit trailer:
  ```
  Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_019TCUQa8a4FFeUawY2pZRfd
  ```

Key files (verified insertion points):
| File | Role |
|---|---|
| `client/src/engine/shell/ShellEngine.ts` | `execute` (l.103), `ctx.execute` re-entry (l.310), `continueInput` (l.353), `cancelPendingInput` (l.385), `pushSession` (l.1187), `getCurrentHost()` |
| `client/src/engine/shell/types.ts` | `CommandResult`, `ShellEngineInterface` |
| `shared/src/types/terminal.ts` | `TerminalSolution`, add feedback types |
| `client/src/components/Terminal/useTerminal.ts` | `announceSolved` (appends resultText) |
| `client/src/content/events/learning-path-advanced.ts` | the 5 V1 levels |
| `client/src/content/orthography.test.ts` (or a new audit) | content audit home |

---

# Phase A — Execution log in ShellEngine

### Task A1: CommandAttempt + basic per-command logging with depth guard

**Files:** Modify `client/src/engine/shell/ShellEngine.ts`, `client/src/engine/shell/types.ts`. Test: new `client/src/engine/shell/executionLog.test.ts`.

**Step 1 — failing tests:**

```ts
import { describe, it, expect } from 'vitest';
import { createShell } from './index';

describe('execution log — basic', () => {
  it('logs one attempt per outer command with sequence, host, exit code', () => {
    const shell = createShell({ type: 'bash', user: 'root', hostname: 'srv' });
    shell.execute('whoami');
    shell.execute('false'); // nonzero exit
    const log = shell.getExecutionLog();
    expect(log).toHaveLength(2);
    expect(log[0]).toMatchObject({ command: 'whoami', sequence: 1, hostBefore: 'local', hostAfter: 'local', exitCode: 0 });
    expect(log[1]).toMatchObject({ command: 'false', sequence: 2, exitCode: 1 });
  });

  it('sudo does NOT create a second attempt (depth guard)', () => {
    const shell = createShell({ type: 'bash', user: 'root', hostname: 'srv' });
    shell.execute('sudo whoami');
    const log = shell.getExecutionLog();
    expect(log).toHaveLength(1);
    expect(log[0].command).toBe('sudo whoami');
  });

  it('a chained line is a single attempt', () => {
    const shell = createShell({ type: 'bash', user: 'root', hostname: 'srv' });
    shell.execute('true && echo hi');
    expect(shell.getExecutionLog()).toHaveLength(1);
    expect(shell.getExecutionLog()[0].command).toBe('true && echo hi');
  });

  it('empty input logs nothing', () => {
    const shell = createShell({ type: 'bash', user: 'root', hostname: 'srv' });
    shell.execute('   ');
    expect(shell.getExecutionLog()).toHaveLength(0);
  });
});
```

Run: `npm test -- client/src/engine/shell/executionLog.test.ts` → FAIL (`getExecutionLog` not a function).

**Step 2 — implement.** In `types.ts` add the interface + `getExecutionLog(): CommandAttempt[]` to `ShellEngineInterface`:

```ts
export interface CommandAttempt {
  command: string;
  sequence: number;
  hostBefore: string;
  hostAfter: string;
  exitCode: number;
  authMethod?: 'publickey' | 'password';
}
```

In `ShellEngine.ts` add fields:
```ts
private executionLog: CommandAttempt[] = [];
private executionDepth = 0;
private attemptSeq = 0;
private openAttempt: CommandAttempt | null = null;
```

Rewrite `execute` (keep the pending early-return at l.106 unchanged, it fires BEFORE any logging):
```ts
execute(input: string, initialStdin?: string): CommandResult {
  if (this.pendingContinuation) {
    return { output: '', exitCode: 1, pendingInput: { ...this.pendingPrompt! } };
  }
  const trimmed = input.trim();
  if (!trimmed) return { output: '', exitCode: 0 };

  const outer = this.executionDepth === 0;
  if (outer) {
    this.openAttempt = {
      command: trimmed,
      sequence: ++this.attemptSeq,
      hostBefore: this.getCurrentHost().id,
      hostAfter: this.getCurrentHost().id,
      exitCode: 0,
    };
  }
  this.executionDepth++;
  try {
    const result = this.executeChain(trimmed, initialStdin);
    if (outer) this.settleAttempt(result);
    return result;
  } finally {
    this.executionDepth--;
  }
}

/** Finalise the open attempt unless the command is still awaiting input. */
private settleAttempt(result: CommandResult): void {
  if (!this.openAttempt) return;
  if (result.pendingInput) return; // stays open across the prompt
  this.openAttempt.exitCode = result.exitCode;
  this.openAttempt.hostAfter = this.getCurrentHost().id;
  this.executionLog.push(this.openAttempt);
  this.openAttempt = null;
}

getExecutionLog(): CommandAttempt[] {
  return [...this.executionLog];
}
```

Note: `ctx.execute` (l.310) re-enters `execute` at depth ≥1 → `outer` false → no new attempt, no settle. Correct.

**Step 3:** `npm test -- client/src/engine/shell/executionLog.test.ts` → PASS.
**Step 4:** full shell suite `npx vitest run client/src/engine/shell/` (no regressions) + `npx tsc --noEmit -p client`.
**Step 5:** commit `feat(shell): execution log — one CommandAttempt per outer command`.

---

### Task A2: pendingInput lifecycle + authMethod annotation + cancel

**Files:** Modify `client/src/engine/shell/ShellEngine.ts`. Test: extend `executionLog.test.ts`.

**Step 1 — failing tests** (build a two-host fixture like `ssh.test.ts`: local + web01 with an `admin` account password `pw`, and a key-auth variant). Write:

```ts
describe('execution log — pending input & ssh', () => {
  it('a password ssh login is ONE attempt, closed after the password, authMethod password', () => {
    const { shell } = makeSshFixture(); // local + web01 (admin/pw), password auth on
    const r1 = shell.execute('ssh admin@web01');
    expect(r1.pendingInput).toBeTruthy();
    expect(shell.getExecutionLog()).toHaveLength(0); // still open
    const r2 = shell.continueInput('pw');
    expect(r2.pendingInput).toBeFalsy();
    const log = shell.getExecutionLog();
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ command: 'ssh admin@web01', exitCode: 0, authMethod: 'password', hostBefore: 'local', hostAfter: 'web01' });
  });

  it('a key ssh login logs authMethod publickey, no prompt', () => {
    const { shell } = makeKeyFixture(); // player key seeded + trusted on web01
    shell.execute('ssh admin@web01');
    const log = shell.getExecutionLog();
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ authMethod: 'publickey', hostAfter: 'web01' });
  });

  it('three wrong passwords then correct → still ONE attempt', () => {
    const { shell } = makeSshFixture();
    shell.execute('ssh admin@web01');
    shell.continueInput('nope');
    shell.continueInput('nope');
    shell.continueInput('pw');
    expect(shell.getExecutionLog()).toHaveLength(1);
  });

  it('cancelling a pending prompt finalises the attempt with exit 130', () => {
    const { shell } = makeSshFixture();
    shell.execute('ssh admin@web01');
    shell.cancelPendingInput();
    const log = shell.getExecutionLog();
    expect(log).toHaveLength(1);
    expect(log[0].exitCode).toBe(130);
  });

  it('a nested execute inside a continuation does not open a second attempt', () => {
    // wrong-password path re-arms; ensure no spurious attempts appear
    const { shell } = makeSshFixture();
    shell.execute('ssh admin@web01');
    shell.continueInput('wrong'); // re-prompts
    expect(shell.getExecutionLog()).toHaveLength(0); // still open, no extra
  });
});
```

Run → FAIL.

**Step 2 — implement.** Wrap `continueInput`'s `next(line)` in the depth guard and settle afterwards; annotate on `pushSession`; finalise on cancel.

`continueInput` (l.353) — add depth guard + settle:
```ts
continueInput(line: string): CommandResult {
  const next = this.pendingContinuation;
  this.pendingContinuation = null;
  this.pendingPrompt = null;
  if (!next) return { output: '', exitCode: 1, error: 'shell: no pending input' };
  this.executionDepth++;
  let result: CommandResult;
  try {
    result = next(line);
    this.state.exitCode = result.exitCode;
  } catch (error) {
    this.cancelPendingInput(); // now also settles the open attempt (see below)
    this.state.exitCode = 1;
    this.executionDepth--;
    return { output: '', exitCode: 1, error: `shell: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
  this.executionDepth--;
  this.settleAttempt(result); // closes the attempt unless another prompt is owed
  return result;
}
```
(Keep the existing behaviour otherwise; just thread depth + settle. Ensure the catch path decrements depth and the throwing-continuation test in `pendingInput.test.ts` stays green.)

`cancelPendingInput` (l.385):
```ts
cancelPendingInput(): void {
  this.pendingContinuation = null;
  this.pendingPrompt = null;
  if (this.openAttempt) {
    this.openAttempt.exitCode = 130;
    this.openAttempt.hostAfter = this.getCurrentHost().id;
    this.executionLog.push(this.openAttempt);
    this.openAttempt = null;
  }
}
```

`pushSession` (l.1187) — after the successful push, annotate:
```ts
if (method && this.openAttempt) this.openAttempt.authMethod = method;
```
(Place it where `method` is in scope, after the session is actually pushed.)

**Step 3–4:** tests PASS; full shell suite + `pendingInput.test.ts` + `ssh.test.ts` green; tsc clean.
**Step 5:** commit `feat(shell): execution-log lifecycle across password prompts + authMethod`.

---

# Phase B — selectFeedback

### Task B1: shared feedback types

**Files:** Modify `shared/src/types/terminal.ts`.

Add (plain serializable data — content stays data):
```ts
export interface CommandMatcher {
  pattern: string;
  outcome?: 'attempted' | 'succeeded' | 'failed';
  authMethod?: 'publickey' | 'password';
}
export interface FeedbackRule {
  when: {
    commandMatches?: CommandMatcher;
    commandAbsent?: CommandMatcher;
    commandBefore?: Array<{ first: CommandMatcher; second: CommandMatcher }>;
    commandCount?: { matcher: CommandMatcher; min?: number; max?: number };
  };
  text: string;
}
```
Add `feedback?: FeedbackRule[];` to `TerminalSolution`.

`npm run build -w shared && npx tsc --noEmit -p client` clean. Commit `feat(shared): after-action feedback rule types`.

### Task B2: selectFeedback pure function

**Files:** Create `client/src/engine/shell/feedback.ts` + `client/src/engine/shell/feedback.test.ts`.

**Step 1 — failing tests** (drive with hand-built `CommandAttempt[]` logs — no shell needed):

```ts
import { selectFeedback } from './feedback';
const A = (command: string, o: Partial<CommandAttempt> = {}): CommandAttempt =>
  ({ command, sequence: 0, hostBefore: 'local', hostAfter: 'local', exitCode: 0, ...o });

it('commandMatches: succeeded requires exit 0', () => {
  const rules = [{ when: { commandMatches: { pattern: 'ufw enable', outcome: 'succeeded' } }, text: 'ok' }];
  expect(selectFeedback(rules, [A('ufw enable', { exitCode: 0 })])).toBe('ok');
  expect(selectFeedback(rules, [A('ufw enable', { exitCode: 1 })])).toBeNull();
});

it('outcome attempted covers success, failure and cancel(130)', () => {
  const rules = [{ when: { commandMatches: { pattern: 'kill 456' } }, text: 'r' }]; // default attempted
  expect(selectFeedback(rules, [A('kill 456', { exitCode: 1 })])).toBe('r');
  expect(selectFeedback(rules, [A('kill 456', { exitCode: 130 })])).toBe('r');
});

it('authMethod filters the matched attempt', () => {
  const rules = [{ when: { commandMatches: { pattern: 'ssh ', authMethod: 'publickey', outcome: 'succeeded' } }, text: 'pk' }];
  expect(selectFeedback(rules, [A('ssh admin@web01', { authMethod: 'publickey' })])).toBe('pk');
  expect(selectFeedback(rules, [A('ssh admin@web01', { authMethod: 'password' })])).toBeNull();
});

it('commandBefore compares first matching attempts by sequence; multiple pairs are AND', () => {
  const log = [A('journalctl -u api', { sequence: 1 }), A('systemctl start mysql', { sequence: 2 }), A('systemctl start api', { sequence: 3 })];
  const rules = [{ when: { commandBefore: [
    { first: { pattern: 'journalctl' }, second: { pattern: 'start mysql' } },
    { first: { pattern: 'start mysql' }, second: { pattern: 'start api' } },
  ] }, text: 'clean' }];
  expect(selectFeedback(rules, log)).toBe('clean');
});

it('commandBefore fails when both patterns match the SAME attempt (chained &&)', () => {
  const log = [A('ufw allow 22 && ufw enable', { sequence: 1 })];
  const rules = [{ when: { commandBefore: [{ first: { pattern: 'ufw allow.*22' }, second: { pattern: 'ufw enable' } }] }, text: 'x' }];
  expect(selectFeedback(rules, log)).toBeNull(); // strict order only BETWEEN attempts
});

it('commandCount counts matching attempts only', () => {
  const log = [A('systemctl start api', { sequence: 1 }), A('cat x'), A('systemctl restart api', { sequence: 3 })];
  const rules = [{ when: { commandCount: { matcher: { pattern: 'systemctl (re)?start api' }, min: 2 } }, text: 'twice' }];
  expect(selectFeedback(rules, log)).toBe('twice');
});

it('first matching rule wins (risk before praise)', () => {
  const rules = [
    { when: { commandMatches: { pattern: 'rm .*authorized_keys' } }, text: 'risk' },
    { when: { commandMatches: { pattern: 'sed' } }, text: 'praise' },
  ];
  expect(selectFeedback(rules, [A('rm ~/.ssh/authorized_keys'), A('sed -i ...')])).toBe('risk');
});

it('no match → null; AND across a rule; commandAbsent inverts', () => {
  expect(selectFeedback([{ when: { commandMatches: { pattern: 'zzz' } }, text: 't' }], [A('ls')])).toBeNull();
  expect(selectFeedback([{ when: { commandAbsent: { pattern: 'daemon-reload' } }, text: 'noreload' }], [A('ls')])).toBe('noreload');
});

it('invalid regex → null, warns once', () => {
  const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  expect(selectFeedback([{ when: { commandMatches: { pattern: '([' } }, text: 't' }], [A('ls')])).toBeNull();
  selectFeedback([{ when: { commandMatches: { pattern: '([' } }, text: 't' }], [A('ls')]);
  expect(spy).toHaveBeenCalledTimes(1);
  spy.mockRestore();
});
```

Run → FAIL.

**Step 2 — implement `feedback.ts`:**
- `matchOutcome(a, outcome)`: attempted → true; succeeded → `a.exitCode === 0`; failed → `a.exitCode !== 0`.
- `attemptMatches(a, m)`: `safeRegex(m.pattern)` (reuse the `warnedPatterns` Set + one-time warn; return false on invalid), test `a.command`, AND `matchOutcome(a, m.outcome ?? 'attempted')`, AND (`m.authMethod` ? `a.authMethod === m.authMethod` : true).
- `firstMatch(log, m)`: first attempt (by array order = sequence order) satisfying `attemptMatches`.
- `commandBefore` pair holds iff `firstMatch(first)` and `firstMatch(second)` both exist AND `first.sequence < second.sequence` (strictly less — same-attempt fails).
- `ruleHolds(rule, log)`: AND of every declared `when` sub-condition (commandMatches → some match; commandAbsent → none match; commandBefore → every pair holds; commandCount → count of matching attempts within [min,max]).
- `selectFeedback(rules, log)`: return the first rule's `text` whose `ruleHolds`; else null.
- Reuse a module-level `warnedPatterns` Set for the one-time invalid-regex warning.

**Step 3–4:** PASS; tsc clean. **Step 5:** commit `feat(shell): selectFeedback rule evaluation`.

### Task B3: content audit — every feedback pattern compiles

**Files:** add to `client/src/content/orthography.test.ts` (or new `client/src/content/feedbackAudit.test.ts`).

Test: walk `allEvents`, for each event's `terminalContext?.solutions[].feedback?[].when`, collect every `CommandMatcher.pattern` (commandMatches/Absent, commandBefore.first/second, commandCount.matcher) and assert `new RegExp(pattern)` does not throw. Fails loudly if any authored pattern is invalid. Commit `test(content): audit compiles all feedback patterns`.

---

# Phase C — useTerminal integration

### Task C1: append selectFeedback to the solve banner

**Files:** Modify `client/src/components/Terminal/useTerminal.ts` (`announceSolved`). Test: `client/src/components/Terminal/Terminal.feedback.browser.test.tsx`.

In `announceSolved(solution)`: after computing the base `resultText`, compute
```ts
const extra = solution.feedback ? selectFeedback(solution.feedback, shellRef.current!.getExecutionLog()) : null;
const resultText = extra ? `${solution.resultText}\n\n${extra}` : solution.resultText;
```
and render `resultText` as today. (Only the string being written changes.)

**Browser test** (pattern from `Terminal.multihost.browser.test.tsx`): a two-host context whose solution has a `feedback` rule keyed on a risky command; drive the risky path via `term.input(...)`, solve, assert the banner text contains the risky line; a second test drives the clean path and asserts the line is ABSENT (no false praise). Run `npm run test:client -- src/components/Terminal/`. Commit `feat(terminal): after-action feedback line on the solve banner`.

---

# Phase D — content (V1 levels)

All in `client/src/content/events/learning-path-advanced.ts`; lesson tests in the matching `client/src/engine/*TrackLessons.test.ts`. Texts are PLACEHOLDERS for the user's German pass — keep them terse, canon-voiced.

### Task D1: sysd_04 feedback
Add to sysd_04 solution:
```ts
feedback: [
  { when: { commandCount: { matcher: { pattern: 'systemctl\\s+(re)?start\\s+leitstand-api' }, min: 2 } },
    text: '⚠ Du hast die API erneut gestartet, obwohl ihre Abhängigkeit noch fehlte. Das Journal hätte dir den Umweg erspart.' },
  { when: { commandBefore: [
      { first: { pattern: 'journalctl', outcome: 'succeeded' }, second: { pattern: 'systemctl\\s+start\\s+mysql', outcome: 'succeeded' } },
      { first: { pattern: 'systemctl\\s+start\\s+mysql', outcome: 'succeeded' }, second: { pattern: 'systemctl\\s+start\\s+leitstand-api', outcome: 'succeeded' } },
    ] },
    text: '⚡ Erst die Ursache gelesen, dann die Abhängigkeit zuerst gestartet — kein Blindflug.' },
],
```
Lesson test (`systemdTrackLessons.test.ts`): drive the blind-restart path (start api → fails → start api again → still fails → start mysql → start api) and assert `selectFeedback(sol.feedback, shell.getExecutionLog())` returns the ⚠ line; drive the clean path (journalctl → mysql → api) and assert the ⚡ line. NOTE: lesson tests drive via `shell.execute()`, which now populates the log — so this works. Commit `feat(learning): sysd_04 after-action feedback`.

### Task D2: net_03 feedback (4-case ordering)
```ts
feedback: [
  // risky: deny effective AND enabled before port 22 allowed
  { when: { commandBefore: [
      { first: { pattern: 'ufw\\s+default\\s+deny', outcome: 'succeeded' }, second: { pattern: 'ufw\\s+enable', outcome: 'succeeded' } },
      { first: { pattern: 'ufw\\s+enable', outcome: 'succeeded' }, second: { pattern: 'ufw\\s+allow.*22', outcome: 'succeeded' } },
    ] },
    text: '⚠ Die Firewall war aktiv, bevor SSH freigegeben war. Auf einem entfernten Server wäre der nächste Login ausgesperrt.' },
  { when: { commandBefore: [
      { first: { pattern: 'ufw\\s+enable', outcome: 'succeeded' }, second: { pattern: 'ufw\\s+default\\s+deny', outcome: 'succeeded' } },
      { first: { pattern: 'ufw\\s+default\\s+deny', outcome: 'succeeded' }, second: { pattern: 'ufw\\s+allow.*22', outcome: 'succeeded' } },
    ] },
    text: '⚠ Die Firewall war aktiv, bevor SSH freigegeben war. Auf einem entfernten Server wäre der nächste Login ausgesperrt.' },
  // safe: port 22 allowed before both the deny and the enable
  { when: { commandBefore: [
      { first: { pattern: 'ufw\\s+allow.*22', outcome: 'succeeded' }, second: { pattern: 'ufw\\s+default\\s+deny', outcome: 'succeeded' } },
      { first: { pattern: 'ufw\\s+allow.*22', outcome: 'succeeded' }, second: { pattern: 'ufw\\s+enable', outcome: 'succeeded' } },
    ] },
    text: '✓ Erst Port 22 freigegeben, dann gesperrt und aktiviert — dein Zugang blieb die ganze Zeit offen.' },
],
```
Lesson test (`netTrackLessons.test.ts`): the four documented orderings (enable→allow22→deny, deny→allow22→enable = ✓; deny→enable→allow22, enable→deny→allow22 = ⚠), plus the chained `ufw allow 22 && ufw enable` case → null (no line). Commit `feat(learning): net_03 after-action feedback`.

### Task D3: net_01 feedback
```ts
feedback: [
  { when: { commandMatches: { pattern: 'kill\\s+.*\\b(456|1234|2345)\\b' } }, // sshd/apache/mysqld default pids — verify against the level's host listeners
    text: '⚠ Du hast einen legitimen Dienst ins Visier genommen. Erst PID und Soll-Port abgleichen, dann gezielt beenden.' },
],
```
FIRST verify the level's legit listener PIDs (read net_01's host spec / DEFAULT_LISTENERS) and match those exact PIDs. Lesson test: attempting `kill <legit-pid>` (even before killing the rogue) yields the ⚠ line; a clean solve (only `kill <rogue-pid>`) yields null. Commit `feat(learning): net_01 after-action feedback`.

### Task D4: ssh_04 goal-hardening (correctness) THEN feedback
**Correctness fix first:** add to ssh_04's solution stateGoals the preservation requirement so an emptied file can't win:
```ts
{ host: 'db01', file: '/home/admin/.ssh/authorized_keys', matches: 'jens@ws-jens' },
{ host: 'db01', file: '/home/admin/.ssh/authorized_keys', matches: 'henry@ws-henry' },
```
(verify the exact comments/host/path against the current ssh_04 authoring). Lesson test: a solve that empties/rm's the file no longer satisfies the goals (was previously a false win).
**Then feedback:**
```ts
feedback: [
  { when: { commandMatches: { pattern: '(rm\\s+.*authorized_keys|chmod\\s+0?00|truncate\\s+.*authorized_keys|>\\s*.*authorized_keys)' } },
    text: '⚠ Beinahe die ganze Schlüsseldatei geopfert — das hätte auch Jens und Henry ausgesperrt.' },
  { when: { commandCount: { matcher: { pattern: "sed\\s+-i.*wartung@extern", outcome: 'succeeded' }, max: 1 } },
    text: '⚡ Genau eine verdächtige Zeile entfernt; die legitimen Schlüssel blieben erhalten.' },
],
```
Lesson tests: trap-attempt path → ⚠; clean targeted sed → ⚡. Commit `fix(learning): ssh_04 requires preserving legit keys + after-action feedback`.

### Task D5: ssh_02 feedback (needs authMethod)
```ts
feedback: [
  { when: { commandBefore: [
      { first: { pattern: 'systemctl\\s+restart\\s+ssh', outcome: 'succeeded' },
        second: { pattern: 'ssh\\s+admin@web01', outcome: 'succeeded', authMethod: 'publickey' } },
    ] },
    text: '⚠ Erst gehärtet und neu gestartet, dann den Schlüssel getestet — auf einem entfernten Server ein Blindflug.' },
  { when: { commandBefore: [
      { first: { pattern: 'ssh\\s+admin@web01', outcome: 'succeeded', authMethod: 'publickey' },
        second: { pattern: 'systemctl\\s+restart\\s+ssh', outcome: 'succeeded' } },
    ] },
    text: '✓ Schlüsselzugang bestätigt, bevor die Passwort-Anmeldung abgeschaltet wurde.' },
],
```
Lesson test (`sshTrackLessons.test.ts`): drive login-then-restart → ✓; harden+restart-then-login → ⚠. This exercises the authMethod on the log (publickey). Commit `feat(learning): ssh_02 after-action feedback`.

---

# Phase E — verification

### Task E1: full sweep
1. `npm run build` clean.
2. `npm test` — ALL green incl. the new executionLog/feedback tests, the 5 lesson suites, the feedback content audit, orthography, and the pacing audits (raised timeouts already in place).
3. `npm run test:client -- src/components/Terminal/ src/hooks/` — Terminal.feedback + existing green; classify any jsdom flake by isolation.
4. `npm run test:e2e` — the advanced tracks are already documented-skip in `e2e/levels.spec.ts`; confirm 0 failures. (Feedback is narrative-only, no new e2e needed.)
5. Report each audit by name; confirm no regression.
Commit any incidental fixes. No separate commit if clean.

---

## Execution order
A1 → A2 → B1 → B2 → B3 → C1 → D1 → D2 → D3 → D4 → D5 → E1. A/B/C are prerequisites for all content. D-tasks are independent of each other (any order). German placeholder texts get the user's prose pass after Phase D.
