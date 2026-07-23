# useTerminal Extraction Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract the ~890-line `useTerminal.ts` xterm input loop into a framework-free, unit-testable `TerminalSession` (state + semantic `TerminalEffect[]`), a pure `renderInput` renderer, and a thin xterm adapter hook — with zero visible behavior change.

**Architecture:** Approach A (pure session + effects). A `TerminalSession` owns all mutable state and every decision; each input method returns a flat, ordered `TerminalEffect[]`. The xterm adapter (the surviving hook) only wires `term.onData` → session → applies effects, runs timers, and mirrors React state. The `ShellEngine` is injected into the session; `requestInput` is internalized as `pendingInput{prompt,mask,resume}`. A pure `renderInput` module owns all ANSI cursor math. Migration is strangler-style: build the session in parallel via node-env TDD, then flip the adapter in one wiring task.

**Tech Stack:** TypeScript, React 18, `@xterm/xterm`, Vitest (node-env `*.test.ts` + jsdom `*.browser.test.tsx`), the existing `ShellEngine` (`client/src/engine/shell`).

**Acceptance bar (every task keeps this true):**
- All existing Terminal `*.browser.test.tsx` stay green unchanged (semantic-`.toContain` assertions).
- New node-env session + renderer tests are green.
- No visible behavior change: the final rendered terminal state and solve/partial/hint flows are identical to today.

---

## Orientation — read before starting

Source under refactor: `client/src/components/Terminal/useTerminal.ts` (the whole file is one mount `useEffect([context, shell, isBeginnerMode])`, lines 132–880). Key regions to port (cite these line numbers when porting logic — **move the exact behavior, do not rewrite from memory**):

- **Init/banner:** 169–210 (prompt, `Connected to…`, tip line, beginner auto-hint, initial idle timer).
- **Closure state:** 212–246 (`line/cursorPos/savedLine`, `solved/pendingSkillGain/pendingSolutionEffects`, `pendingActive/pendingMask/pendingLine/pendingCmdName`, `creditedCommands/liveSkillGain`, `streaming/streamTimer`, `tabCompletions/tabIndex`, `availableCommands`).
- **Redraw + streaming helpers:** `rewriteLine` 249–267, `isPingReplyLine` 271–272, `emitScenarioOutput` 278–310, `resetLineAndPrompt` 312–318, `writeShellError` 321–334, `announceSolved` 338–372, `creditSkillDrip` 374–379, `handleShellResult` 384–430.
- **`term.onData` handler:** 432–850 — streaming guard (438–440), solved guard (444–450), pending-input branch (455–493), escape-sequence branch (496–554: arrows/Home/End/Delete), main `switch` (556–849: Enter with history-expansion + canned-command matching loop + shell execute; Backspace; Ctrl-C/L/U/K/A/E/W; Tab; `?`; default printable).
- **Adapter-level concerns that stay in the hook:** resize listener (852–856), Tab `keydown` preventDefault (859–869), cleanup (871–879), the returned API (882–889: `terminalRef, hintsUsed, hintsRemaining, commandsUsed, showHint, shell`).

Supporting modules (unchanged, reused): `prompt.ts` (`buildPrompt`), `completion.ts` (`gatherCompletions/applyCompletionToLine/longestCommonPrefix/tokenUnderCursor`), `engine/shell` exports (`createShellFromContext, ShellEngine, checkStateGoals, selectFeedback, formatGrid, resolveTemplateIds, Completion, CommandResult`).

`ShellEngine` public surface the session uses: `execute(input)`, `continueInput(line)`, `cancelPendingInput()`, `getPromptInfo()`, `navigateHistory('up'|'down')`, `addToHistory(cmd)`, `expandHistory(input)`, `getExecutionLog()`, `setTermCols(n)`. All deterministic; safe to drive under fake timers.

**Test-harness reality (the green bar):** existing browser tests (`Terminal.feedback/multihost/partialFeedback/taskPanel.browser.test.tsx`) mock `@xterm/xterm` with a class that pushes every `write`/`writeln` into a `buffer: string[]`, drive input via `emitData(char)`, and assert `buffer.join('')` `.toContain(...)`. They do **not** assert exact escape sequences. Therefore the extraction may render via full-line redraws as long as visible text and banners still appear in the buffer.

**Behavior notes / allowed simplifications:**
- `currentLine` React state (`useState('')` at line 32, `setCurrentLine` throughout) is set but **never read** — dead state. It may be dropped; that only removes unobservable re-renders. Everything else in the returned API must stay.
- `hintsUsed`/`hintsRemaining`/`showHint`/`terminalRef`/`shell` are consumed by `index.tsx` → must be preserved. `commandsUsed` is returned but unused by `index.tsx`; keep it in the API (derive from snapshot) to avoid an API change.

---

## Task 1: Reusable mock-xterm test harness

Extract the duplicated `@xterm/xterm` mock + drive helpers into one shared module so new characterization tests reuse it. Pure test-scaffolding refactor — no source change.

**Files:**
- Create: `client/src/components/Terminal/testHarness.ts`
- Modify: `client/src/components/Terminal/Terminal.feedback.browser.test.tsx`, `Terminal.multihost.browser.test.tsx`, `Terminal.partialFeedback.browser.test.tsx`, `Terminal.taskPanel.browser.test.tsx` (replace their inline mock/helpers with imports)

**Step 1: Create the harness**

```ts
// client/src/components/Terminal/testHarness.ts
// Shared mock-xterm for Terminal browser tests: captures every write/writeln
// into a buffer and drives input via emitData. Assertions are semantic
// (buffer.join('') .toContain(...)), never byte-exact escape sequences.
import { vi } from 'vitest';

type DataHandler = (data: string) => void;

export interface MockTerm {
  emitData: (data: string) => void;
  buffer: string[];
  cols: number;
}

export const terminalMock = vi.hoisted(() => ({
  instances: [] as MockTerm[],
  Terminal: class {
    private handlers: DataHandler[] = [];
    buffer: string[] = [];
    cols = 80;
    constructor() {
      terminalMock.instances.push(this as unknown as MockTerm);
    }
    loadAddon() {}
    open() {}
    focus() {}
    write(data: string) { this.buffer.push(data); }
    writeln(data: string) { this.buffer.push(data + '\n'); }
    clear() {}
    dispose() {}
    onData(handler: DataHandler) {
      this.handlers.push(handler);
      return { dispose: () => {} };
    }
    emitData(data: string) { this.handlers.forEach((h) => h(data)); }
  },
  FitAddon: class { fit() {} },
}));

export function installXtermMock() {
  vi.mock('@xterm/xterm', () => ({ Terminal: terminalMock.Terminal }));
  vi.mock('@xterm/addon-fit', () => ({ FitAddon: terminalMock.FitAddon }));
}

export const type = (term: { emitData: (d: string) => void }, text: string) => {
  for (const char of text) term.emitData(char);
};
export const enter = (term: { emitData: (d: string) => void }, text: string) => {
  type(term, text);
  term.emitData('\r');
};
export const written = (term: { buffer: string[] }) => term.buffer.join('');
export const latestTerm = () => terminalMock.instances.at(-1)!;
export const resetTerms = () => { terminalMock.instances.length = 0; };
```

> Note: `vi.mock` is hoisted; because `terminalMock` uses `vi.hoisted`, importing `installXtermMock()` and calling it at module top-level in each test file keeps the hoist semantics intact. If a test file's `vi.mock` must remain literally in that file for hoisting, keep the two `vi.mock` lines inline there and import only `terminalMock`, `type`, `enter`, `written`, `latestTerm`, `resetTerms`. Verify by running the tests (Step 3) — green means hoisting works.

**Step 2: Rewrite each existing browser test to import from the harness**

Remove the inline `terminalMock`/`type`/`enter`/`written` definitions; import them. Keep each test's `context` fixtures and `it(...)` bodies byte-for-byte otherwise.

**Step 3: Run the four browser tests**

Run: `npm run test:client -- src/components/Terminal/Terminal.feedback.browser.test.tsx src/components/Terminal/Terminal.multihost.browser.test.tsx src/components/Terminal/Terminal.partialFeedback.browser.test.tsx src/components/Terminal/Terminal.taskPanel.browser.test.tsx`
Expected: PASS, same count as before.

**Step 4: Commit**

```bash
git add client/src/components/Terminal/testHarness.ts client/src/components/Terminal/Terminal.*.browser.test.tsx
git commit -m "test(terminal): extract shared mock-xterm harness"
```

---

## Task 2: Characterization tests for the delicate uncovered paths

Lock current behavior on paths the four existing tests don't cover, so the extraction can't silently change them. Semantic assertions only (visible text + ANSI color markers where they matter, e.g. the green banner `\x1b[32m`, cyan resultText `\x1b[36m`, yellow hint `\x1b[33m`).

**Files:**
- Create: `client/src/components/Terminal/Terminal.characterization.browser.test.tsx`

**Step 1: Write the characterization tests**

Cover, one `it` each, driving via `enter`/`type` and asserting on `written(term)`:
1. **Line edit + backspace:** type `lss`, backspace, type `s` → running `ls` produces its output (no crash, prompt returns).
2. **History recall:** run `ls`, then `emitData('\x1b[A')` (up arrow) → buffer shows `ls` recalled; Enter runs it again.
3. **Ctrl-U / Ctrl-A / Ctrl-E:** type a partial command, `\x15` clears it (next Enter is a no-op prompt); confirm no stray execution.
4. **Tab single completion:** in a context with one scenario command, type its unique prefix + `\t` → buffer contains the completed token.
5. **`?` hint on empty line:** context with `hints: ['Erster Hinweis']`; `emitData('?')` on empty line → buffer contains `💡 Erster Hinweis` in yellow; `hintsRemaining` drops (assert via a second `?` → "Keine weiteren Hinweise").
6. **Ping streaming (fake timers):** context with a `ping`-style scenario command whose output has `icmp_seq` reply lines; `vi.useFakeTimers()`, run it, advance timers by 450ms steps, assert reply lines appear paced and the prompt/solution follows.
7. **Pending password is masked:** ssh into a `hosts` account (as in the feedback test), assert the typed password text does **not** appear literally in the buffer between the prompt and the next line.
8. **Ctrl-C aborts a pending prompt:** ssh to trigger the password prompt, `emitData('\x03')` → buffer shows `^C` and a fresh prompt, session not solved.

Use `beforeEach(resetTerms)` and `installXtermMock()`/inline `vi.mock` per Task 1's note.

**Step 2: Run and confirm all pass against current code**

Run: `npm run test:client -- src/components/Terminal/Terminal.characterization.browser.test.tsx`
Expected: PASS (they characterize existing behavior).

**Step 3: Commit**

```bash
git add client/src/components/Terminal/Terminal.characterization.browser.test.tsx
git commit -m "test(terminal): characterize editing, history, tab, hint, streaming, pending paths"
```

---

## Task 3: `TerminalEffect` type + pure `renderInput` renderer (node-env)

Leaf modules, no wiring yet.

**Files:**
- Create: `client/src/components/Terminal/session/effects.ts`
- Create: `client/src/components/Terminal/session/renderInput.ts`
- Test: `client/src/components/Terminal/session/renderInput.test.ts`

**Step 1: Define the effect union**

```ts
// client/src/components/Terminal/session/effects.ts
export type TerminalEffect =
  | { type: 'writeLine'; text: string }
  | { type: 'renderInput'; prompt: string; line: string; cursor: number }
  | { type: 'showPartial'; feedback: string }
  | { type: 'showPage'; lines: string[]; pingLike: boolean }
  | { type: 'bell' }
  | { type: 'clearScreen' }
  | { type: 'updateHints'; count: number }
  | { type: 'solved'; resultText: string; skillGain: import('@kritis/shared').Skills extends never ? never : Partial<import('@kritis/shared').Skills> }
  | { type: 'scheduleDrip'; delayMs: number };
```

> `clearScreen` is added (not in the design's illustrative list) because `term.clear()` is a real external action used by Ctrl-L and `result.clearScreen`; keep it a distinct effect rather than smuggling it into `writeLine`. Import `Skills` normally at the top instead of the conditional above if simpler:
> ```ts
> import { Skills } from '@kritis/shared';
> // ... | { type: 'solved'; resultText: string; skillGain: Partial<Skills> }
> ```

**Step 2: Write the failing renderer test**

```ts
// client/src/components/Terminal/session/renderInput.test.ts
import { describe, it, expect } from 'vitest';
import { renderInput } from './renderInput';

describe('renderInput', () => {
  it('redraws prompt + line with cursor at end (no reposition)', () => {
    const out = renderInput({ prompt: 'timo@ws:~$ ', line: 'ls -la', cursor: 6 });
    expect(out).toContain('timo@ws:~$ ls -la');
    // cursor at end → no explicit column move appended
    expect(out).not.toMatch(/\x1b\[\d+G$/);
  });

  it('positions the cursor mid-line via a column escape', () => {
    const prompt = 'timo@ws:~$ ';
    const out = renderInput({ prompt, line: 'ls -la', cursor: 3 });
    // column is 1-based: prompt.length + cursor + 1
    expect(out).toContain(`\x1b[${prompt.length + 3 + 1}G`);
  });

  it('clears the previous line content before redrawing', () => {
    const out = renderInput({ prompt: '$ ', line: '', cursor: 0 });
    expect(out).toContain('\x1b[K'); // erase-to-end so stale chars are gone
  });
});
```

Run: `npm test -- client/src/components/Terminal/session/renderInput.test.ts`
Expected: FAIL ("renderInput is not a function" / module not found).

**Step 3: Implement the pure renderer**

```ts
// client/src/components/Terminal/session/renderInput.ts
// Pure ANSI: full-line redraw of the input area. Return-to-col-1, erase line,
// write prompt+line, then reposition the cursor when it is not at the end.
// Full redraw (vs incremental writes) yields the identical VISIBLE state,
// which is all the semantic browser tests observe.
export interface RenderInputState {
  prompt: string;
  line: string;
  cursor: number;
}

export function renderInput({ prompt, line, cursor }: RenderInputState): string {
  let out = '\r\x1b[K' + prompt + line;
  if (cursor < line.length) {
    out += '\x1b[' + (prompt.length + cursor + 1) + 'G';
  }
  return out;
}
```

Run: `npm test -- client/src/components/Terminal/session/renderInput.test.ts`
Expected: PASS.

**Step 4: Commit**

```bash
git add client/src/components/Terminal/session/effects.ts client/src/components/Terminal/session/renderInput.ts client/src/components/Terminal/session/renderInput.test.ts
git commit -m "feat(terminal): pure renderInput renderer + TerminalEffect type"
```

---

## Task 4: `TerminalSession` skeleton — construction, snapshot, init effects

Create the session with the injected shell and the initialization output. No keystroke handling yet beyond what init needs.

**Files:**
- Create: `client/src/components/Terminal/session/TerminalSession.ts`
- Test: `client/src/components/Terminal/session/TerminalSession.test.ts`

**Design of the class (port state from `useTerminal.ts:212–246`):**

```ts
export interface TerminalSessionDeps {
  shell: ShellEngine;
  context: TerminalContext;
  gameMode: GameModeId;
  onSolved: (skillGain: Partial<Skills>, setsFlags?: string[], effects?: EventEffects) => void;
  onPartialSolution: (feedback: string) => void;
}
export interface TerminalSnapshot {
  hintsUsed: number;
  commandsUsed: string[];
  solved: boolean;
  // NEVER include line/pendingLine/password material here.
}
export class TerminalSession {
  constructor(deps: TerminalSessionDeps);
  init(): TerminalEffect[];              // banner + optional beginner auto-hint + first prompt
  handleData(data: string): TerminalEffect[];  // all keystrokes (Task 6–10)
  handleHintRequest(): TerminalEffect[]; // the footer [?] button / idle auto-hint
  tick(kind: 'drip'): TerminalEffect[];  // paced streaming advance (Task 9)
  getSnapshot(): TerminalSnapshot;
}
```

Internal state fields mirror the closure vars: `line/cursorPos/savedLine`, `solved/pendingSkillGain/pendingSolutionEffects`, `pendingInput: {prompt,mask,resume} | null`, `creditedCommands: Set<string>/liveSkillGain`, streaming queue state, `tabCompletions/tabIndex`, `hintsUsed/commandsUsed/teachedCommands`, and a cached `prompt` string kept in sync via `getPromptInfo()` (port `getTermPrompt` 158–167 as a private method).

**Step 1: Write failing init test**

```ts
// client/src/components/Terminal/session/TerminalSession.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createShellFromContext } from '../../../engine/shell';
import { TerminalContext } from '@kritis/shared';
import { TerminalSession } from './TerminalSession';

const ctx: TerminalContext = {
  type: 'linux', hostname: 'ws-admin', username: 'timo',
  currentPath: '/home/timo', hints: [], commands: [], solutions: [],
};

function makeSession(overrides: Partial<TerminalContext> = {}, gameMode = 'intermediate' as const) {
  const context = { ...ctx, ...overrides };
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

// helper: flatten writeLine/renderInput text from an effect list
const text = (effects: ReturnType<TerminalSession['init']>) =>
  effects.map(e => 'text' in e ? e.text : e.type === 'renderInput' ? e.prompt + e.line : '').join('\n');

describe('TerminalSession.init', () => {
  it('emits the connect banner and the first prompt', () => {
    const { session } = makeSession();
    const effects = session.init();
    expect(text(effects)).toContain('Connected to ws-admin');
    expect(effects.at(-1)).toMatchObject({ type: 'renderInput', line: '' });
  });

  it('auto-shows the first hint only in beginner mode', () => {
    const beginner = makeSession({ hints: ['Tipp eins'] }, 'beginner');
    expect(text(beginner.session.init())).toContain('Tipp eins');
    expect(beginner.session.getSnapshot().hintsUsed).toBe(1);

    const learning = makeSession({ hints: ['Tipp eins'] }, 'learning');
    expect(text(learning.session.init())).not.toContain('Tipp eins');
    expect(learning.session.getSnapshot().hintsUsed).toBe(0);
  });
});
```

Run: `npm test -- client/src/components/Terminal/session/TerminalSession.test.ts`
Expected: FAIL (module/methods missing).

**Step 2: Implement constructor + `init()` + `getSnapshot()` + private `computePrompt()`**

Port from `useTerminal.ts`: prompt building 158–167; banner 171–172; beginner auto-hint 176–180 (note: only `gameMode === 'beginner'`, not `learning`); return `[writeLine('Connected to …'), writeLine(tip), writeLine(''), …optional hint…, renderInput({prompt, line:'', cursor:0})]`. `handleData`/`handleHintRequest`/`tick` may be stubs returning `[]` for now.

Run: `npm test -- client/src/components/Terminal/session/TerminalSession.test.ts`
Expected: PASS.

**Step 3: Commit**

```bash
git add client/src/components/Terminal/session/TerminalSession.ts client/src/components/Terminal/session/TerminalSession.test.ts
git commit -m "feat(terminal): TerminalSession skeleton with init + snapshot"
```

---

## Task 5: Line editing + control keys in the session

Port the printable-char, Backspace, Delete, arrows (Left/Right/Home/End), Ctrl-U/K/A/E/W, Ctrl-C, Ctrl-L. Every edit ends by emitting a single `renderInput` effect (full redraw) — the visible result matches today's incremental writes.

**Files:**
- Modify: `client/src/components/Terminal/session/TerminalSession.ts`
- Test: `client/src/components/Terminal/session/TerminalSession.editing.test.ts`

**Step 1: Write failing editing tests**

Test (node-env), one `it` each: printable insert at cursor; Left/Right move; Home/End; Backspace mid-line; Delete (`\x1b[3~`); Ctrl-U clears; Ctrl-W deletes word; Ctrl-A/Ctrl-E; Ctrl-C emits `^C` writeLine + fresh `renderInput` with empty line; Ctrl-L emits `clearScreen` + `renderInput` preserving the current line. Assert on the final `renderInput` `line`/`cursor` and any `writeLine`. Port exact semantics from `useTerminal.ts` — arrows 496–554, switch cases 682–755, Ctrl-L 705–711 (preserves line), `?`-insert-as-char path 823–830.

**Step 2: Run → FAIL. Step 3: Implement `handleData` routing** for: `data.startsWith('\x1b[')` escape branch; the printable/`default` branch (834–848); the control cases. Route `?` on a non-empty line to char-insert (807–831 only hints when `line.length === 0` — Task 8 owns the hint side). **Step 4: Run → PASS. Step 5: Commit** `feat(terminal): line editing and control keys in TerminalSession`.

---

## Task 6: Enter — history expansion + canned scenario-command matching

Port the Enter branch's first half: history expansion (565–577), `addToHistory` (581), and the `context.commands` matching loop (586–663) covering `isSolution` (announce), `isPartialSolution` (partial feedback + prompt), and non-solution scenario output with post-output solution check. Streaming (`emitScenarioOutput`) is emitted as a `showPage{pingLike}` effect here; its paced advance is Task 9.

**Files:**
- Modify: `client/src/components/Terminal/session/TerminalSession.ts` (add `announceSolved`, `checkSolutions`, `creditSkillDrip`, `isPingReplyLine` as private methods — port 338–379, 72–93, 271–272)
- Test: `client/src/components/Terminal/session/TerminalSession.enter.test.ts`

**Step 1: Failing tests** — using a context with scenario `commands`: (a) an `isSolution` command emits a `solved` effect whose `resultText` matches and `skillGain` equals the command's; (b) an `isPartialSolution` command triggers `onPartialSolution` and returns to prompt without solving; (c) a non-solution scenario command whose `pattern` completes a multi-step `solutions[].commands` emits `solved`; (d) history expansion `!!` echoes the expanded command. Assert via effects + the `onPartialSolution` spy. **Step 2: FAIL. Step 3: Implement.** Port the loop exactly; `announceSolved` sets `solved=true`, computes `pendingSkillGain = mergeSkillGain(liveSkillGain, skillGain)`, appends `selectFeedback(solution.feedback, shell.getExecutionLog())` when present (350–359), and emits a single `solved` effect carrying the full banner text (move the banner box `writeLine`s into effects, or emit them as `writeLine` effects preceding `solved` — keep the exact strings from 345–368). **Step 4: PASS. Step 5: Commit** `feat(terminal): Enter — history expansion and scenario-command matching`.

---

## Task 7: Enter — real shell execution + `handleShellResult` + pending input

Port the no-scenario-match path (668–673) and `handleShellResult` (384–430): output, `writeShellError` (321–334), pending-input arming, `creditSkillDrip` on exit 0, solution check, fresh prompt. Then port the pending-input branch of `onData` (455–493) as session-internal routing, internalizing `requestInput` as `pendingInput{prompt,mask,resume}`.

**Files:**
- Modify: `client/src/components/Terminal/session/TerminalSession.ts`
- Test: `client/src/components/Terminal/session/TerminalSession.pending.test.ts`

**Design — the single processing path (design §5 invariant):** both `execute()` (Enter) and `continueInput()` (pending resume) funnel their `CommandResult` through one private `handleShellResult(result, cmdName)`. `pendingInput` is set when `result.pendingInput` is present; it stores `resume: (answer) => this.handleShellResult(this.shell.continueInput(answer), cmdName)`. **Invariants to encode + test:** clear `pendingInput` **before** calling `resume` (so a chained follow-up prompt sets cleanly); a masked answer produces **no** echo `writeLine`/no char in any effect; Ctrl-C calls `shell.cancelPendingInput()`, clears `pendingInput`, emits `^C` + fresh prompt, and is idempotent (a second Ctrl-C after abort does nothing to a null pending); the password string never appears in any emitted effect nor in `getSnapshot()`.

**Step 1: Failing tests** (use the multihost ssh fixture: `hosts:[{id,hostname,accounts:[{name,password}]}]`): (a) `ssh admin@web01` emits a `renderInput`/prompt-style effect for the password and sets pending; typing the password emits no echo; Enter with the right password logs in (prompt host changes); (b) wrong password re-prompts (pending set again) with `pendingInput` cleared-then-reset; (c) Ctrl-C mid-prompt emits `^C`, clears pending, second Ctrl-C is a no-op; (d) after a successful `execute` with exit 0 of a `commandSkillGain` command, `liveSkillGain` credited once (second use not double-credited); (e) a `stateGoals` solution completes via `handleShellResult`’s solution check and emits `solved`. Assert password absence: `JSON.stringify(effects)` does not contain the password, and `getSnapshot()` has no password field. **Step 2: FAIL. Step 3: Implement.** **Step 4: PASS. Step 5: Commit** `feat(terminal): shell execution, handleShellResult, and internalized pending input`.

---

## Task 8: Tab completion + hint requests in the session

Port Tab (757–805) and the `?`/hint-on-empty-line (807–822) plus `handleHintRequest()` (the footer button, port `showHint` 122–129). Completion uses the existing `gatherCompletions/applyCompletionToLine/longestCommonPrefix/tokenUnderCursor` + `formatGrid`; the list-print becomes `writeLine` effects; a single completion / common-prefix fill becomes a `renderInput`. The visual bell becomes a `bell` effect.

**Files:**
- Modify: `client/src/components/Terminal/session/TerminalSession.ts`
- Test: `client/src/components/Terminal/session/TerminalSession.completion.test.ts`

**Step 1: Failing tests:** single-match Tab fills the token (final `renderInput.line` contains it); no-match on non-empty line emits `bell`; empty-line Tab lists available/scenario commands; multi-match fills the longest common prefix then (second Tab) lists; `?` on empty line emits the yellow hint `writeLine` and increments `hintsUsed`; `?` past the last hint emits "Keine weiteren Hinweise"; `handleHintRequest()` mirrors `?` and emits `updateHints`. **Step 2: FAIL. Step 3: Implement.** Emit `updateHints{count}` after any hint increment so the adapter can sync React state. **Step 4: PASS. Step 5: Commit** `feat(terminal): tab completion and hint requests in TerminalSession`.

---

## Task 9: Streaming (`showPage`/`tick`) + solved/streaming input guards

Port `emitScenarioOutput` pacing (278–310) into session-owned state advanced by `tick('drip')`, and the two `onData` head guards: streaming swallows input (438–440), solved swallows all but Enter which fires `onSolved` (444–450).

**Files:**
- Modify: `client/src/components/Terminal/session/TerminalSession.ts`
- Test: `client/src/components/Terminal/session/TerminalSession.streaming.test.ts`

**Design:** a ping-like result emits an immediate `showPage{lines, pingLike:true}` (adapter writes the non-reply lines instantly and the reply lines are the paced set) — but to keep decisions in the session, model it as: session writes ready lines via `writeLine` effects and, when the next line is a ping reply, emits `scheduleDrip{delayMs:450}` instead of continuing; the adapter’s timer calls `tick('drip')`, which emits the next line + either another `scheduleDrip` or the finishing effects (solution check → `solved`, or `renderInput` prompt). While the queue is non-empty, `streaming` is true and `handleData` returns `[]` (input swallowed). Preserve `isPingReplyLine` regex (271–272) and 450ms exactly.

**Step 1: Failing tests (node-env, no real timers needed — drive `tick` directly):** a ping command emits the header line(s) + first reply + `scheduleDrip{450}`; each `tick('drip')` emits one more reply until done, then the prompt/solution; `handleData('x')` returns `[]` while streaming; when `solved`, `handleData('\r')` calls `onSolved(pendingSkillGain, undefined, pendingSolutionEffects)` and unsets solved, any other key returns `[]`. **Step 2: FAIL. Step 3: Implement.** **Step 4: PASS. Step 5: Commit** `feat(terminal): session-owned paced streaming and solved/streaming guards`.

---

## Task 10: Full-flow session parity tests

Before touching the hook, prove the session reproduces the four existing browser-test scenarios at the effect level (node-env, real injected shell), so the adapter flip is low-risk.

**Files:**
- Test: `client/src/components/Terminal/session/TerminalSession.parity.test.ts`

**Step 1: Write tests** mirroring `Terminal.feedback` (risky path appends risk line; clean path omits it), `Terminal.multihost` (ssh + continueInput + stateGoals solve), and `Terminal.partialFeedback` (partial → `onPartialSolution`). Drive the session with `init()` then a sequence of `handleData` calls (char-by-char + `\r`), collect all effects, and assert the concatenated `writeLine`/`solved.resultText` text `.toContain(...)` the same markers the browser tests use. **Step 2: Run → PASS** (green means the session is behavior-faithful). If any fails, fix the session (not the test) — it reveals a port gap. **Step 3: Commit** `test(terminal): full-flow parity of TerminalSession against browser scenarios`.

---

## Task 11: Flip the adapter — rewrite `useTerminal` to drive the session

Replace the giant `useEffect` body with a thin adapter: instantiate `TerminalSession`, apply `init()` effects, forward `term.onData` → `session.handleData` → `applyEffects`, run `scheduleDrip` timers → `session.tick('drip')`, keep the resize listener / Tab preventDefault / idle-timer(beginner) / cleanup, and mirror React state from `updateHints`/`solved` effects + `getSnapshot()`.

**Files:**
- Modify: `client/src/components/Terminal/useTerminal.ts`
- Create: `client/src/components/Terminal/session/applyEffects.ts` (the effect→xterm interpreter)

**Design of `applyEffects(term, effects, ctx)`** — the ONLY place that touches xterm. Deterministic translation: `writeLine`→`term.writeln`; `renderInput`→`term.write(renderInput(state))`; `showPartial`→`onPartialSolution(feedback)`; `bell`→`term.write('\x07')`; `clearScreen`→`term.clear()`; `updateHints`→`setHintsUsed(count)`; `solved`→(write banner already carried as preceding `writeLine`s; the `solved` effect just marks state) — keep the banner strings in the session's emitted `writeLine`s so `applyEffects` only writes; `scheduleDrip`→`setTimeout(() => applyEffects(term, session.tick('drip'), ctx), delayMs)` (store the timer for cleanup). The adapter must **never** inspect `data` to decide input type — it forwards every keystroke to `session.handleData`.

**Step 1:** Rewrite `useTerminal.ts`. Keep the returned API identical: `{ terminalRef, hintsUsed, hintsRemaining: context.hints.length - hintsUsed, commandsUsed, showHint, shell }`. `showHint` now calls `applyEffects(term, session.handleHintRequest(), ctx)`. Drop the dead `currentLine` state. The idle timer (beginner) calls `session.handleHintRequest()` on fire. Construct the session inside the mount `useEffect`; the `shell` `useMemo` stays and is injected into the session.

**Step 2: Run the whole Terminal browser suite**

Run: `npm run test:client -- src/components/Terminal/`
Expected: PASS — all four original tests + the characterization suite, unchanged.

**Step 3: Run the node-env session/renderer suite**

Run: `npm test -- client/src/components/Terminal/session/`
Expected: PASS.

**Step 4: Full build + typecheck**

Run: `npm run build`
Expected: succeeds (tsc clean).

**Step 5: Commit**

```bash
git add client/src/components/Terminal/useTerminal.ts client/src/components/Terminal/session/applyEffects.ts
git commit -m "refactor(terminal): drive useTerminal via extracted TerminalSession"
```

---

## Task 12: Full-suite regression + e2e smoke

**Step 1:** `npm test` → Expected: PASS (node suite unaffected).
**Step 2:** `npm run test:client` → Expected: PASS (all jsdom incl. Terminal).
**Step 3:** `npm run test:e2e` → Expected: PASS/skip as before (the game still boots, a terminal level still solves). If e2e is too slow for the loop, at minimum run `npm run test:e2e -- --grep terminal` or the relevant per-level spec.
**Step 4:** Manual runtime check per `.claude/skills/verify/SKILL.md` — drive one CLI level (e.g. a learning terminal beat) keyboard-first, confirm: prompt, editing, Tab, `?` hint, ssh password mask, a ping level's pacing, and the solve banner + `[ENTER]` advance all look identical to before.
**Step 5: Commit** any doc note if behavior parity surfaced a nuance: update `docs/plans/2026-07-23-useterminal-extraction-design.md` "Abnahme-Schwelle" with the final green counts. Otherwise nothing to commit.

---

## Final review

After Task 12, dispatch a final code review over the whole branch diff (design-compliance + quality): confirm (1) the adapter never branches on input semantics, (2) no password reaches any effect/log/snapshot, (3) `pendingInput` is cleared before `resume`, (4) one processing path serves both `execute` and `continueInput`, (5) ESC behavior is unchanged and no `unhandledEscape`/global-nav API was introduced, (6) the returned hook API is unchanged. Then use superpowers:finishing-a-development-branch.

## Not in scope (guard against creep)
- No global ESC/back navigation, no visible back buttons, no `{player}` token — those are the **second** design (`2026-07-23-terminal-navigation-personalization-design.md`).
- No callback-free shell continuation (`AwaitInput{continuationId}`) — later, separate step.
- No ShellEngine, content, or level changes.
