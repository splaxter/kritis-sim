# Pipe and Process Evidence Level Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Require both taught pipe steps in `learn_05` and make `learn_06` identify the suspicious process from evidence instead of announcing a Cryptominer up front.

**Architecture:** This is a content-only correction backed by behavioral lesson tests. `learn_05` uses the existing multi-step `TerminalSolution` mechanism with `step_find` and `step_count`; `learn_06` changes prose while leaving its command and solution mechanics intact.

**Tech Stack:** TypeScript, Vitest, `TerminalSession`, existing scripted learning-level content.

---

### Task 1: Make both pipe steps mechanically required

**Files:**
- Modify: `client/src/engine/pipeFilterLesson.test.ts`
- Modify: `client/src/content/events/learning-path.ts`

**Step 1: Replace the obsolete completion assertion with failing structural assertions**

In `client/src/engine/pipeFilterLesson.test.ts`, replace the test named
`the core find (the backdoor account) solves the level via every path` with:

```ts
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
```

**Step 2: Run the focused test and verify it fails**

Run:

```bash
npx vitest run --root client --config vitest.config.ts src/engine/pipeFilterLesson.test.ts
```

Expected: FAIL because the Find beats still have `isSolution: true` and
`ctx.solutions` is empty.

**Step 3: Implement the multi-step solution**

In `client/src/content/events/learning-path.ts`:

- Remove `isSolution: true` from all three commands whose `teachesCommand` is
  `step_find`.
- Replace `solutions: []` and its obsolete bonus comment with:

```ts
solutions: [
  {
    commands: ['step_find', 'step_count'],
    allRequired: true,
    resultText: 'Fake-Account gefunden und Benutzerbestand mit einer zweiten Pipe geprüft.',
    skillGain: { linux: 5, security: 5, troubleshooting: 2 },
    effects: { stress: -5 },
  },
],
```

**Step 4: Add a real-session regression test**

Add these imports to `client/src/engine/pipeFilterLesson.test.ts`:

```ts
import { vi } from 'vitest';
import { createShellFromContext } from './shell';
import { TerminalSession } from '../components/Terminal/session/TerminalSession';
```

Add helpers:

```ts
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
```

Add:

```ts
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
```

If the existing Vitest import already includes `describe`, `it`, `expect`, add
`vi` to that import instead of creating a duplicate import.

**Step 5: Run the pipe lesson tests**

Run:

```bash
npx vitest run --root client --config vitest.config.ts src/engine/pipeFilterLesson.test.ts src/engine/learningPathShadowing.test.ts
```

Expected: PASS.

**Step 6: Commit**

```bash
git add client/src/content/events/learning-path.ts client/src/engine/pipeFilterLesson.test.ts
git commit -m "fix(learning): require both pipe lesson steps"
```

### Task 2: Make the CPU diagnosis evidence-first

**Files:**
- Create: `client/src/engine/zombieHuntLesson.test.ts`
- Modify: `client/src/content/events/learning-path.ts`

**Step 1: Write the failing content test**

Create `client/src/engine/zombieHuntLesson.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { learningPathEvents } from '../content/events/learning-path';

const lesson = learningPathEvents.find((event) => event.id === 'learn_06_zombie_hunt')!;
const ctx = lesson.terminalContext!;

describe('learning lesson: learn_06_zombie_hunt', () => {
  it('does not diagnose a Cryptominer before process evidence is inspected', () => {
    expect(lesson.description).not.toMatch(/Cryptominer|Bitcoin/i);
    expect(lesson.description).toContain('unbekannter Prozess');
  });

  it('contains concrete process evidence for the later diagnosis', () => {
    const ps = ctx.commands.find((command) => command.pattern === 'ps aux')!;
    expect(ps.output).toContain('malware');
    expect(ps.output).toContain('99.0');
    expect(ps.output).toContain('/tmp/.hidden/miner.sh');
  });

  it('does not claim an unproven cryptocurrency after completion', () => {
    const visibleCompletionText = [
      ...lesson.choices.map((choice) => choice.resultText ?? ''),
      ...ctx.solutions.map((solution) => solution.resultText),
    ].join('\n');

    expect(visibleCompletionText).not.toMatch(/Bitcoin/i);
  });
});
```

**Step 2: Run the new test and verify it fails**

Run:

```bash
npx vitest run --root client --config vitest.config.ts src/engine/zombieHuntLesson.test.ts
```

Expected: FAIL because the description says `Cryptominer` and the result claims
Bitcoin mining.

**Step 3: Rewrite only the premature and unsupported prose**

In `client/src/content/events/learning-path.ts`:

- Replace:

```text
Irgendein Prozess frisst 99% CPU. Das riecht nach Cryptominer.
```

with:

```text
Ein unbekannter Prozess treibt die CPU auf 99 %. Finde heraus, was
dahintersteckt, bevor du ihn beendest.
```

- In the `ps aux` output, replace the immediate declaration with:

```text
# PID 6666 läuft unter "malware" aus /tmp/.hidden/miner.sh.
# Das sieht nach einem Cryptominer aus.
```

- Replace the post-terminal sentence claiming Bitcoin mining with:

```text
Der verdächtige Miner-Prozess ist beendet. Er lief unter dem Backdoor-Account
"malware" und trieb die CPU auf 99 %.
```

Keep the existing box, command mechanics and later service transition.

**Step 4: Run both affected lesson suites**

Run:

```bash
npx vitest run --root client --config vitest.config.ts src/engine/pipeFilterLesson.test.ts src/engine/zombieHuntLesson.test.ts src/engine/learningPathShadowing.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add client/src/content/events/learning-path.ts client/src/engine/zombieHuntLesson.test.ts
git commit -m "content(learning): diagnose CPU miner from evidence"
```

### Task 3: Verify the complete correction

**Files:**
- Verify only; no expected source changes.

**Step 1: Run the complete Node suite**

Run:

```bash
npm test
```

Expected: PASS with zero failed tests.

**Step 2: Run TypeScript and production build**

Run:

```bash
npm run build
```

Expected: exit code 0.

**Step 3: Check patch hygiene**

Run:

```bash
git diff --check main...HEAD
git status --short
```

Expected: no whitespace errors and a clean worktree.

**Step 4: Review the final diff**

Run:

```bash
git diff --stat main...HEAD
git diff main...HEAD -- client/src/content/events/learning-path.ts client/src/engine/pipeFilterLesson.test.ts client/src/engine/zombieHuntLesson.test.ts
```

Expected: only the approved mechanics, prose and regression tests changed.
