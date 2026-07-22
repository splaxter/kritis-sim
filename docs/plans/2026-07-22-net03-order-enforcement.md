# net_03 Order Enforcement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** An unsafe firewall-hardening order in net_03 (activating the wall before opening port 22) mechanically drops the player's own SSH session, so the "open access first, then raise the wall" lesson is enforced, not just graded.

**Architecture:** `ExecutionContext` gains `sessionSourceHost` (the previous session frame's host); `ufw`'s shared `confirmSshDisrupt` path, after applying an `enable`/`default deny` on "y", checks `port22Blocked(ctx.host, ctx.sessionSourceHost)` and pops the session if the player just cut their own inbound path. net_03 is restructured as a two-host ssh level (ws-timo → srv-web) with all firewall goals on srv-web; its two ⚠ after-action rules are removed (the drop replaces them), the ✓ OR-form stays.

**Tech Stack:** TypeScript, vitest (node), Playwright (unaffected), npm workspaces.

**Approved design:** `docs/plans/2026-07-22-net03-order-enforcement-design.md` — read first.

---

## Ground rules
- Branch `feat/net03-order-enforcement`; verify `git branch --show-current`, never switch. Baseline: `npm test` green (1114 on main at branch point), `npx tsc --noEmit -p client` clean.
- TDD strictly (red → green → commit). Engine English/sparse; content German.
- After any `shared/src/` change: `npm run build -w shared` before root tests. (This feature likely needs NO shared change — `sessionSourceHost` is client-side `ExecutionContext` in `client/src/engine/shell/types.ts`.)
- Commit trailer:
  ```
  Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_019TCUQa8a4FFeUawY2pZRfd
  ```

Verified insertion points:
| File | Spot |
|---|---|
| `client/src/engine/shell/types.ts` | `ExecutionContext` (add `sessionSourceHost?`) |
| `client/src/engine/shell/ShellEngine.ts` | ctx build ~l.371 (`host`, `resolveHost`, `sessionDepth`); `sessionStack` l.29; `getCurrentHost` |
| `client/src/engine/shell/sshAuth.ts` | `port22Blocked(target, source): boolean` l.85 |
| `client/src/engine/shell/commands/linux/firewallCmd.ts` | `confirmSshDisrupt` ~l.107; `enable` and `default deny` call sites ~l.124/148 |
| `client/src/content/events/learning-path-advanced.ts` | `learn_net_03_the_wall` |
| `client/src/engine/shell/ufw.test.ts`, `client/src/engine/netTrackLessons.test.ts` | tests |

---

### Task 1: ExecutionContext.sessionSourceHost

**Files:** Modify `client/src/engine/shell/types.ts`, `client/src/engine/shell/ShellEngine.ts`. Test: extend `client/src/engine/shell/executionLog.test.ts` (or `ShellEngine.test.ts`).

**Step 1 — failing test** (probe command reads ctx.sessionSourceHost):
```ts
import { createHostState } from './hosts';
it('sessionSourceHost names the previous frame host, undefined at depth 1', () => {
  const shell = createShell({ type: 'bash', user: 'timo', hostname: 'ws-timo' });
  const web = createHostState({ id: 'srv-web', hostname: 'srv-web', accounts: [{ name: 'timo', password: 'pw' }] });
  shell.registerHost(web);
  let seen: string | undefined | null = null;
  shell.registerCommand({ name: 'probe', description: '', usage: 'probe',
    execute: (_a, ctx) => { seen = ctx.sessionSourceHost ? ctx.sessionSourceHost.id : undefined; return { output: '', exitCode: 0 }; } });

  shell.execute('probe');
  expect(seen).toBeUndefined();          // depth 1 → no source

  shell.pushSession('srv-web', 'timo');
  shell.execute('probe');
  expect(seen).toBe('local');            // depth 2 → previous frame is the base host
});
```
Run: `npm test -- client/src/engine/shell/executionLog.test.ts` → FAIL (`sessionSourceHost` undefined always / not on type).

**Step 2 — implement.**
`types.ts` — add to `ExecutionContext`:
```ts
  /** Host of the PREVIOUS session frame (where the current ssh came from); undefined at depth 1. */
  sessionSourceHost?: import('./hosts').HostState;
```
`ShellEngine.ts` — in the ctx object built ~l.371, add:
```ts
  sessionSourceHost:
    this.sessionStack.length > 1
      ? this.hosts.get(this.sessionStack[this.sessionStack.length - 2].hostId)
      : undefined,
```
**Step 3–4:** test PASS; full shell suite `npx vitest run client/src/engine/shell/` green; `npx tsc --noEmit -p client` clean.
**Step 5:** commit `feat(shell): ExecutionContext.sessionSourceHost for the previous session frame`.

---

### Task 2: ufw drops the session on an unsafe enable/deny

**Files:** Modify `client/src/engine/shell/commands/linux/firewallCmd.ts`. Test: `client/src/engine/shell/ufw.test.ts`.

**Step 1 — failing tests.** Fixture: base host `ws-timo` (give it `ip: '10.0.10.5'`), registered `srv-web` (`ip: '10.0.20.11'`, account timo/pw, `firewall: { enabled: false, defaultIncoming: 'allow' }`); `shell.pushSession('srv-web','timo')` to get to depth 2 as root-or-timo (ufw needs sudo → run the fixture as root on srv-web, or use `sudo ufw`). Drive via `execute` + `continueInput('y')`. Write:
- **deny → enable drop:** `sudo ufw default deny incoming` (over ssh, no allow-22 → prompt) → `continueInput('y')` → firewall.defaultIncoming deny, **session still depth 2** (firewall disabled → no drop). Then `sudo ufw enable` → prompt → `continueInput('y')` → output contains `Connection to srv-web closed by remote host.`, `getSessionDepth() === 1`.
- **enable → deny drop:** `sudo ufw enable` (default-allow → NO prompt, just enables) → still depth 2. Then `sudo ufw default deny incoming` → prompt → `y` → dropped, depth 1, drop line present.
- **deny while disabled = no drop:** `sudo ufw default deny incoming` → prompt → `y` → defaultIncoming deny, **depth still 2**, output has NO drop line.
- **"n" leaves everything:** `sudo ufw enable` (after a deny) → prompt → `continueInput('n')` → `Aborted`, firewall.enabled unchanged, depth unchanged.
- **source-restricted allow does NOT save you:** add `sudo ufw allow from 10.0.99.9 to any port 22` (a DIFFERENT ip), then `deny`, then `enable` + `y` → still dropped (ws-timo 10.0.10.5 not admitted → port22Blocked true).
- **a GLOBAL allow-22 prevents the prompt entirely:** `sudo ufw allow 22/tcp` → `sudo ufw default deny incoming` (no prompt, hasAllow22) → `sudo ufw enable` (no prompt) → depth still 2, no drop.
- **execution log:** after the confirmed drop, the ufw attempt's `hostBefore==='srv-web'`, `hostAfter==='local'` (ws-timo base id), `exitCode===0`.

Run → FAIL (no drop happens today).

**Step 2 — implement.** Import `port22Blocked` from `../../sshAuth`. Change `confirmSshDisrupt` so that on "y", after `proceed()` succeeds, it drops the session if the source is now cut:
```ts
const confirmSshDisrupt = (proceed: () => CommandResult): CommandResult =>
  ctx.requestInput(SSH_DISRUPT_PROMPT, false, answer => {
    const a = answer.trim().toLowerCase();
    if (a !== 'y' && a !== 'yes') return { output: 'Aborted', exitCode: 1 };
    const result = proceed();
    // If applying the change cut THIS session's own inbound path, drop it.
    // The source is the previous session frame (where the ssh came from).
    if (
      result.exitCode === 0 &&
      ctx.host && ctx.sessionSourceHost &&
      port22Blocked(ctx.host, ctx.sessionSourceHost) &&
      ctx.popSession
    ) {
      const closed = ctx.host.hostname;
      ctx.popSession();
      return { ...result, output: `${result.output}\nConnection to ${closed} closed by remote host.` };
    }
    return result;
  });
```
The `enable`/`default deny` guards are UNCHANGED (they already fire the prompt only when 22 would be blocked / over ssh). The drop is purely additive and gated by the post-apply `port22Blocked`, so `default deny` while the firewall is still disabled prompts but does NOT drop (port22Blocked is false when `!firewall.enabled`).

**Step 3–4:** tests PASS; full shell suite green (existing ufw disrupt y/n tests may now see a drop on 'y' — UPDATE those to expect the pop, do not weaken them); `npx tsc --noEmit -p client` clean.
**Step 5:** commit `feat(shell): unsafe ufw enable/deny over ssh drops the caller's session`.

---

### Task 3: net_03 restructured as a two-host ssh level

**Files:** Modify `client/src/content/events/learning-path-advanced.ts` (`learn_net_03_the_wall`). Test: `client/src/engine/netTrackLessons.test.ts`.

**Step 1 — failing lesson tests** (drive via real password login, NOT direct pushSession):
- **safe path wins:** `createShellFromContext(net_03.terminalContext)` → `ssh timo@srv-web` + `continueInput('<pw>')` (depth 2) → `sudo ufw allow 22/tcp`,`allow 80/tcp`,`allow 443/tcp`,`default deny incoming`,`enable` → `getSessionDepth()===2` (survived) AND `checkStateGoals(shell, net_03.solutions[0].stateGoals)` true. Assert EVERY goal has `host:'srv-web'`.
- **unsafe path loses + retry:** fresh engine → ssh in → `sudo ufw default deny incoming`→ (may prompt, answer y) → `sudo ufw enable` → `continueInput('y')` → dropped (depth 1), `checkStateGoals` false. Then a BRAND NEW engine from the same context, safe path → wins (proves retry via fresh shell).
- **feedback:** on the safe won run, `selectFeedback(net_03.solutions[0].feedback, shell.getExecutionLog())` matches `/^✓/`; assert the feedback array has NO `⚠` rule (map over it).

**Step 2 — restructure the content.** In `learn_net_03_the_wall.terminalContext`:
- Primary host: `hostname: 'ws-timo'`, `username: 'timo'` (give the primary host an ip via… primary host ip isn't a TerminalContext field — the source-aware drop for the LESSON only needs the basic no-allow-22 block, which works regardless of source ip; the ip-specific source test lives in ufw.test.ts Task 2 with an explicitly-built ws-timo host). Remove the primary-host `firewall` block.
- Add `hosts: [{ id: 'srv-web', hostname: 'srv-web', ip: '10.0.20.11', accounts: [{ name: 'timo', password: '<pw from briefing>' }], firewall: { enabled: false, defaultIncoming: 'allow' } }]`.
- Move all FIVE firewall goals onto srv-web with explicit `host:'srv-web'`: `{host:'srv-web', firewallRule:{action:'allow',port:22}}`, `…port:80`, `…port:443`, `{host:'srv-web', firewallDefaultIncoming:'deny'}`, `{host:'srv-web', firewallEnabled:true}`.
- **Remove the two ⚠ FeedbackRules**; keep the two ✓ OR-form rules (allow22<deny, allow22<enable). Update the ✓ text to the design's: `✓ Port 22 war freigegeben, bevor die Firewall deinen Zugang beschränken konnte — die SSH-Verbindung blieb bestehen.`
- Rewrite `description`/`taskText`/`mentorNote`/`hints`/`resultText` to the design's German content (briefing Bert, task, [ESC]-recovery hint in taskText, result). Password stated openly in the briefing. Hint ladder preserved (hints[0] no backtick, last exact syntax). commandSkillGain keyed on first tokens (`ssh`, `sudo`).

**Step 3–4:** lesson tests PASS; full `npm test` green incl. orthography (German), feedbackAudit, learningPathShadowing, learning-tracks registry, pacing/skill audits — tune skillGain/weekRange only if an audit complains, never weaken audits; `npx tsc --noEmit -p client` clean.
**Step 5:** commit `feat(learning): net_03 enforces the safe firewall order via a real session drop`.

---

### Task 4: full sweep

1. `npm run build` clean.
2. `npm test` — all green, report count. Confirm by name: orthography, feedbackAudit, ufw, netTrackLessons, executionLog, learningPathShadowing, pacing audits.
3. `npm run test:client -- src/components/Terminal/` — the multihost/feedback Terminal tests unaffected; classify any jsdom flake by isolation.
4. `npm run test:e2e` — net_03 is documented-skip in the per-level harness; feedback/drop are node-tested. Confirm 0 failures.
5. Manual note: net_03 now REQUIRES an ssh login + a drop path — confirm the lesson tests exercise both the survive-on-safe and drop-on-unsafe branches. No production fix committed if clean.

---

## Execution order
Task 1 (sessionSourceHost) → Task 2 (drop, needs Task 1's ctx field) → Task 3 (content, needs Task 2's drop) → Task 4 (sweep). German content in Task 3 gets the user's final prose pass after (texts are already user-provided in the design).
