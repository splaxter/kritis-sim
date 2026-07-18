# Advanced CLI Levels Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Multi-host ShellEngine (real `ssh`/`scp`/`ssh-keygen`/`ssh-copy-id`, Ansible mini-engine with real idempotency, `journalctl`, `ufw`, `crontab`, `chown`, state-based solution detection) plus 4 new learning tracks with 16 levels.

**Architecture:** The ShellEngine gains a host registry (each host: own VFS + services + journal + firewall + accounts) and a session stack that `ssh`/`exit` push/pop. Commands reach host state through `ExecutionContext`. Levels declare hosts in `terminalContext.hosts` and win by reaching declarative `stateGoals` (checked after every command) instead of canned-command tagging. Content lives in a new `learning-path-advanced.ts` + 4 new tracks in `learning-tracks.ts`.

**Tech Stack:** TypeScript, vitest (node env for engine, jsdom for `*.browser.test.tsx`), xterm.js terminal UI, npm workspaces (`client`, `server`, `shared`).

**Approved design:** `docs/plans/2026-07-18-advanced-cli-levels-design.md` — read it first.

---

## Ground rules for the executor

- Run everything from the repo root.
- After ANY change to `shared/src/`, run `npm run build -w shared` before running root tests (root vitest resolves `@kritis/shared` through `shared/dist`).
- Single test run: `npm test -- client/src/engine/shell/hosts.test.ts` (path from repo root).
- Game content (titles, briefings, hints, result texts) is **German**. Engine code/comments English, matching the existing files.
- Hint ladder rule (project convention, guarded by tests): `hints[0]` orients without naming the command; the exact syntax comes only in the LAST hint.
- Levels complete on the core find via `stateGoals` — do NOT hard-gate every instructed step.
- Existing content guards must stay green: `client/src/engine/learningPathShadowing.test.ts`, `client/src/content/orthography.test.ts`, pacing/flow/skill-balance audits in `client/src/engine/`. Treat their failures as content feedback and fix the content.
- Commit after every task with the trailer used in this repo.

Key existing files you will touch repeatedly:

| File | Role |
|---|---|
| `client/src/engine/shell/types.ts` | `ShellCommand`, `ExecutionContext`, `CommandResult`, VFS interface |
| `client/src/engine/shell/ShellEngine.ts` | parser/executor, will own hosts + session stack |
| `client/src/engine/shell/index.ts` | `createShell` / `createShellFromContext` |
| `client/src/engine/shell/commands/linux/index.ts` | aggregates command arrays into `allLinuxCommands` |
| `client/src/engine/shell/commands/linux/system.ts` | `systemctl` (static `SYSTEMD_UNITS` table today, lines ~457–577) |
| `client/src/components/Terminal/useTerminal.ts` | xterm loop: canned-command match first, then `shell.execute()`; solution check via `teachedCommands` |
| `client/src/components/Terminal/prompt.ts` | `buildPrompt` |
| `shared/src/types/terminal.ts` | `TerminalContext`, `TerminalCommand`, `TerminalSolution` |
| `client/src/content/events/learning-path.ts` | existing `learningPathEvents` (GameEvent shape exemplar: `learn_01_awakening`) |
| `client/src/content/events/learning-tracks.ts` | `LEARNING_TRACKS` |

---

# Phase A — Engine foundation

### Task A1: Shared types for hosts + stateGoals

**Files:**
- Modify: `shared/src/types/terminal.ts`

**Step 1: Add the types** (no test yet — pure type additions; the compiler is the test)

Append to `shared/src/types/terminal.ts`:

```ts
// ============================================================================
// Multi-host terminal levels
// ============================================================================

export interface TerminalJournalEntry {
  /** 'YYYY-MM-DD HH:MM:SS' — string-comparable, no Date parsing needed */
  ts: string;
  unit: string;
  priority?: 'err' | 'warning' | 'info';
  message: string;
}

export interface TerminalUnitPrecondition {
  /** Check the CURRENT content of this file on the host ... */
  file?: string;
  /** ... or check the LOADED unit-file content (daemon-reload semantics). */
  unitFileMatches?: string;
  /** Regex the file content must match (multiline). */
  matches?: string;
  /** Invert: precondition holds when file/matches is absent. */
  absent?: boolean;
  /** Journal line appended when the precondition fails on start/restart. */
  failMessage: string;
}

export interface TerminalServiceSpec {
  unit: string; // 'telemetryd.service'
  active?: 'active' | 'inactive' | 'failed';
  enabled?: 'enabled' | 'disabled' | 'static';
  desc?: string;
  exec?: string;
  /** Path of the unit file; enables daemon-reload semantics. */
  unitFile?: string;
  startRequires?: TerminalUnitPrecondition[];
}

export interface TerminalFirewallSpec {
  enabled?: boolean;
  defaultIncoming?: 'allow' | 'deny';
  rules?: { action: 'allow' | 'deny'; port: number; proto?: 'tcp' | 'udp'; from?: string }[];
}

export interface TerminalHostSpec {
  id: string;               // 'web01'
  hostname: string;         // 'web01.stadtwerke.local'
  ip?: string;              // '10.0.20.11'
  templateIds?: VFSTemplateId[];
  vfsOverlay?: VFSOverlay;
  /** Login accounts; password only where a level teaches password auth. */
  accounts?: { name: string; password?: string }[];
  services?: TerminalServiceSpec[];
  journal?: TerminalJournalEntry[];
  firewall?: TerminalFirewallSpec;
}

/** Declarative win condition, checked against live engine state after every command. */
export interface StateGoal {
  /** Host id; defaults to the primary (first) host. */
  host?: string;
  file?: string;
  /** Regex (multiline) the file must match. */
  matches?: string;
  /** Regex the file must NOT match. */
  absentMatches?: string;
  fileExists?: boolean;
  fileAbsent?: boolean;
  service?: string;
  serviceState?: 'active' | 'inactive' | 'failed';
  serviceEnabled?: boolean;
  firewallRule?: { action: 'allow' | 'deny'; port: number; present?: boolean };
  firewallDefaultIncoming?: 'allow' | 'deny';
}
```

Extend the two existing interfaces:

```ts
export interface TerminalSolution {
  commands: string[];
  allRequired: boolean;
  /** When set, these state conditions must ALL hold (in addition to `commands`, which may be []). */
  stateGoals?: StateGoal[];
  resultText: string;
  skillGain: Partial<Skills>;
  effects: EventEffects;
}
```

And on `TerminalContext` add:

```ts
  /** Multi-host levels: first entry is the primary host the player starts on. */
  hosts?: TerminalHostSpec[];
  /** Live skill drip: first successful use (exit 0) of a command name grants this. */
  commandSkillGain?: Record<string, Partial<Skills>>;
```

**Step 2: Build + typecheck**

Run: `npm run build -w shared && npm run build`
Expected: clean build (additive optional fields break nothing).

**Step 3: Commit** — `feat(shared): host specs, stateGoals, live command skill gain types`

---

### Task A2: HostState + host registry in the engine

**Files:**
- Create: `client/src/engine/shell/hosts.ts`
- Test: `client/src/engine/shell/hosts.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { createHostState } from './hosts';

describe('createHostState', () => {
  it('builds a host with its own VFS, default services and firewall', () => {
    const host = createHostState({ id: 'web01', hostname: 'web01.stadtwerke.local', ip: '10.0.20.11' });
    expect(host.vfs.exists('/etc')).toBe(true);
    expect(host.services.find(s => s.unit === 'ssh.service')?.active).toBe('active');
    expect(host.firewall.defaultIncoming).toBe('allow');
    expect(host.sshdEffective.passwordAuthentication).toBe(true);
  });

  it('applies spec overrides: overlay files, services, journal, firewall, accounts', () => {
    const host = createHostState({
      id: 'db01', hostname: 'db01', accounts: [{ name: 'admin', password: 'x' }],
      vfsOverlay: { files: [{ path: '/etc/motd', content: 'hi' }] },
      services: [{ unit: 'telemetryd.service', active: 'failed', desc: 'Telemetry' }],
      journal: [{ ts: '2026-07-18 06:00:00', unit: 'telemetryd', message: 'boom' }],
      firewall: { defaultIncoming: 'deny', rules: [{ action: 'allow', port: 22 }] },
    });
    expect(host.vfs.readFile('/etc/motd')).toMatchObject({ ok: true, value: 'hi' });
    expect(host.services.find(s => s.unit === 'telemetryd.service')?.active).toBe('failed');
    expect(host.journal).toHaveLength(1);
    expect(host.firewall.rules[0]).toMatchObject({ action: 'allow', port: 22 });
    expect(host.accounts.map(a => a.name)).toContain('admin');
  });

  it('re-parses sshd_config on refreshSshdEffective', () => {
    const host = createHostState({ id: 'w', hostname: 'w' });
    host.vfs.addFile('/etc/ssh/sshd_config', 'PermitRootLogin no\nPasswordAuthentication no\n');
    // not yet applied
    expect(host.sshdEffective.passwordAuthentication).toBe(true);
    host.refreshSshdEffective();
    expect(host.sshdEffective).toEqual({ permitRootLogin: false, passwordAuthentication: false });
  });
});
```

Run: `npm test -- client/src/engine/shell/hosts.test.ts` — Expected: FAIL (module not found).

**Step 2: Implement `hosts.ts`**

```ts
/**
 * Multi-host state: each simulated machine owns a VFS plus mutable
 * service/journal/firewall/account state that commands operate on.
 */
import {
  TerminalHostSpec, TerminalServiceSpec, TerminalJournalEntry,
  TerminalUnitPrecondition,
} from '@kritis/shared';
import { VirtualFilesystemInterface } from './types';
import { createLinuxFilesystem } from './VirtualFilesystem';
import { resolveTemplateIds, applyTemplate } from './templates';

export interface SystemdUnitState {
  unit: string;
  active: 'active' | 'inactive' | 'failed';
  sub: 'running' | 'exited' | 'dead' | 'failed';
  enabled: 'enabled' | 'disabled' | 'static';
  pid?: number;
  exec?: string;
  desc: string;
  unitFile?: string;
  /** Snapshot of the unit file at load time — daemon-reload refreshes it. */
  loadedUnitContent?: string;
  startRequires?: TerminalUnitPrecondition[];
}

export interface UfwRule { action: 'allow' | 'deny'; port: number; proto?: 'tcp' | 'udp'; from?: string }
export interface FirewallState {
  enabled: boolean;
  defaultIncoming: 'allow' | 'deny';
  defaultOutgoing: 'allow' | 'deny';
  rules: UfwRule[];
}

export interface HostState {
  id: string;
  hostname: string;
  ip?: string;
  vfs: VirtualFilesystemInterface;
  services: SystemdUnitState[];
  journal: TerminalJournalEntry[];
  firewall: FirewallState;
  accounts: { name: string; password?: string }[];
  sshdEffective: { permitRootLogin: boolean; passwordAuthentication: boolean };
  refreshSshdEffective(): void;
  appendJournal(entry: TerminalJournalEntry): void;
}

/** Same defaults the old static systemctl table had — kept consistent with `ps`. */
export const DEFAULT_UNITS: Omit<SystemdUnitState, 'loadedUnitContent'>[] = [
  { unit: 'ssh.service', active: 'active', sub: 'running', enabled: 'enabled', pid: 456, exec: '/usr/sbin/sshd -D', desc: 'OpenBSD Secure Shell server' },
  { unit: 'apache2.service', active: 'active', sub: 'running', enabled: 'enabled', pid: 1234, exec: '/usr/sbin/apache2 -k start', desc: 'The Apache HTTP Server' },
  { unit: 'mysql.service', active: 'active', sub: 'running', enabled: 'enabled', pid: 2345, exec: '/usr/sbin/mysqld', desc: 'MySQL Community Server' },
  { unit: 'cron.service', active: 'active', sub: 'running', enabled: 'enabled', pid: 512, exec: '/usr/sbin/cron -f', desc: 'Regular background program processing daemon' },
  { unit: 'systemd-journald.service', active: 'active', sub: 'running', enabled: 'static', pid: 210, exec: '/lib/systemd/systemd-journald', desc: 'Journal Service' },
  { unit: 'networking.service', active: 'active', sub: 'exited', enabled: 'enabled', desc: 'Raise network interfaces' },
  { unit: 'ufw.service', active: 'active', sub: 'exited', enabled: 'enabled', desc: 'Uncomplicated firewall' },
];

function parseSshdConfig(content: string | undefined) {
  const get = (key: string) => content?.match(new RegExp(`^\\s*${key}\\s+(\\S+)`, 'm'))?.[1];
  return {
    permitRootLogin: get('PermitRootLogin') !== 'no',
    passwordAuthentication: get('PasswordAuthentication') !== 'no',
  };
}

export function createHostState(spec: TerminalHostSpec, opts?: { user?: string }): HostState {
  const vfs = createLinuxFilesystem({ user: opts?.user ?? 'root', hostname: spec.hostname });
  if (spec.templateIds) for (const t of resolveTemplateIds(spec.templateIds)) applyTemplate(vfs, t);
  for (const d of spec.vfsOverlay?.directories ?? []) vfs.addDirectory(d);
  for (const f of spec.vfsOverlay?.files ?? []) vfs.addFile(f.path, f.content);

  const services: SystemdUnitState[] = DEFAULT_UNITS.map(u => ({ ...u }));
  for (const s of spec.services ?? []) {
    const existing = services.find(x => x.unit === s.unit);
    const merged: SystemdUnitState = {
      unit: s.unit,
      active: s.active ?? existing?.active ?? 'active',
      sub: (s.active ?? 'active') === 'active' ? 'running' : (s.active === 'failed' ? 'failed' : 'dead'),
      enabled: s.enabled ?? existing?.enabled ?? 'enabled',
      exec: s.exec ?? existing?.exec,
      pid: existing?.pid,
      desc: s.desc ?? existing?.desc ?? s.unit,
      unitFile: s.unitFile,
      startRequires: s.startRequires,
    };
    if (merged.unitFile) {
      const read = vfs.readFile(merged.unitFile);
      merged.loadedUnitContent = read.ok ? read.value : '';
    }
    if (existing) Object.assign(existing, merged); else services.push(merged);
  }

  const host: HostState = {
    id: spec.id,
    hostname: spec.hostname,
    ip: spec.ip,
    vfs,
    services,
    journal: [...(spec.journal ?? [])],
    firewall: {
      enabled: spec.firewall?.enabled ?? true,
      defaultIncoming: spec.firewall?.defaultIncoming ?? 'allow',
      defaultOutgoing: 'allow',
      rules: [...(spec.firewall?.rules ?? [])],
    },
    accounts: [...(spec.accounts ?? [{ name: 'root' }, { name: 'admin' }])],
    sshdEffective: { permitRootLogin: true, passwordAuthentication: true },
    refreshSshdEffective() {
      const read = vfs.readFile('/etc/ssh/sshd_config');
      this.sshdEffective = parseSshdConfig(read.ok ? read.value : undefined);
    },
    appendJournal(entry) { this.journal.push(entry); },
  };
  // Initial parse only if the level shipped an sshd_config; otherwise permissive defaults.
  if (vfs.exists('/etc/ssh/sshd_config')) host.refreshSshdEffective();
  return host;
}
```

Note: the third test seeds the config AFTER creation, so keep the "initial parse only when file exists at creation" ordering exactly as above — create first without the file. Adjust the test if needed so creation happens before `addFile` (it does).

**Step 3: Run** `npm test -- client/src/engine/shell/hosts.test.ts` — Expected: PASS.

**Step 4:** Export from `client/src/engine/shell/index.ts`: `export * from './hosts';`

**Step 5: Commit** — `feat(shell): host state factory with services/journal/firewall`

---

### Task A3: ShellEngine host registry + session stack

**Files:**
- Modify: `client/src/engine/shell/ShellEngine.ts`, `client/src/engine/shell/types.ts`
- Test: extend `client/src/engine/shell/ShellEngine.test.ts` (new `describe('multi-host sessions')`)

**Step 1: Failing test**

```ts
import { createHostState } from './hosts';

describe('multi-host sessions', () => {
  function makeEngine() {
    const shell = createShell({ type: 'bash', user: 'admin', hostname: 'ws01' });
    const web = createHostState({ id: 'web01', hostname: 'web01' });
    shell.registerHost(web);
    return { shell, web };
  }

  it('starts on the local host at depth 1', () => {
    const { shell } = makeEngine();
    expect(shell.getSessionDepth()).toBe(1);
    expect(shell.getPromptInfo().hostname).toBe('ws01');
  });

  it('pushSession switches vfs/prompt, popSession returns', () => {
    const { shell, web } = makeEngine();
    web.vfs.addFile('/etc/marker', 'remote');
    shell.pushSession('web01', 'admin');
    expect(shell.getPromptInfo()).toMatchObject({ hostname: 'web01', username: 'admin' });
    expect(shell.execute('cat /etc/marker').output).toBe('remote');
    expect(shell.popSession()).toBe(true);
    expect(shell.getPromptInfo().hostname).toBe('ws01');
    expect(shell.popSession()).toBe(false); // never pops the base session
  });

  it('exit builtin pops a pushed session instead of ending', () => {
    const { shell } = makeEngine();
    shell.pushSession('web01', 'admin');
    const r = shell.execute('exit');
    expect(r.output).toContain('Connection to web01 closed');
    expect(shell.getSessionDepth()).toBe(1);
  });
});
```

Run — Expected: FAIL (`registerHost` not a function).

**Step 2: Implement**

In `types.ts`, extend `ExecutionContext` (all optional → no breakage):

```ts
  /** Multi-host: state of the host this command runs on. */
  host?: import('./hosts').HostState;
  /** Resolve another registered host by id, hostname or IP. */
  resolveHost?: (nameOrIp: string) => import('./hosts').HostState | undefined;
  /** Open a session on another host (ssh) / leave it (exit). */
  pushSession?: (hostId: string, user: string) => void;
  popSession?: () => { closedHostname: string } | null;
  sessionDepth?: number;
```

In `ShellEngine.ts`:
- Fields: `private hosts = new Map<string, HostState>();` and `private sessionStack: { hostId: string; user: string }[] = [];`
- Constructor: wrap the passed vfs as the base host: `this.hosts.set('local', { id: 'local', hostname: <from vfs env HOSTNAME or 'localhost'>, vfs, services: DEFAULT_UNITS.map(u => ({...u})), journal: [], firewall: {enabled: true, defaultIncoming: 'allow', defaultOutgoing: 'allow', rules: []}, accounts: [{name: vfs.getUser()}], sshdEffective: {permitRootLogin: true, passwordAuthentication: true}, refreshSshdEffective() {...}, appendJournal(e) { this.journal.push(e); } })` — reuse a small helper `wrapVfsAsHost(vfs)` placed in `hosts.ts` to avoid duplicating the literal. Push base session `{ hostId: 'local', user: vfs.getUser() }`.
- `registerHost(host: HostState)`, `getHost(id)`, `resolveHost(nameOrIp)` (match id, hostname, hostname short form before first `.`, or ip).
- `getCurrentHost(): HostState` = host of top session; **`getVfs()` now returns `this.getCurrentHost().vfs`** (remove the private `vfs` field usages in `execute`/`complete`/ctx construction in favor of `this.getVfs()`).
- `pushSession(hostId, user)`: throw if unknown host; push; `host.vfs.setUser(user)`.
- `popSession()`: refuse at depth 1 (return false).
- `getSessionDepth()`, `getPromptInfo(): { hostname; username; path; home }` (from current host vfs + session user).
- In `executeCommand`, add the new ctx fields (`host: this.getCurrentHost()`, `resolveHost: (n) => this.resolveHost(n)`, `pushSession: ...`, `popSession: () => {...}`, `sessionDepth: this.sessionStack.length`).
- `exit` builtin (`client/src/engine/shell/commands/linux/builtins.ts:295`): if `ctx.sessionDepth && ctx.sessionDepth > 1 && ctx.popSession`, pop and return `{ output: 'logout\nConnection to <hostname> closed.', exitCode: 0 }`; otherwise keep existing behavior.

**Step 3: Run** the ShellEngine suite: `npm test -- client/src/engine/shell/ShellEngine.test.ts` — Expected: PASS, including all pre-existing cases (getVfs delegation must not break them).

**Step 4:** Wire `createShellFromContext` (in `engine/shell/index.ts`): accept `hosts?: TerminalHostSpec[]`; for each spec call `createHostState(spec)` and `shell.registerHost(...)`. Primary host stays the implicit local one built from `hostname`/`username`/templates/overlay — multi-host levels simply list additional hosts. Also register a lookup so hostnames of specs resolve. Add a test in `ShellEngine.test.ts` that `createShellFromContext({..., hosts: [{id: 'web01', hostname: 'web01'}]})` lets `resolveHost('web01')` succeed.

**Step 5: Commit** — `feat(shell): host registry + ssh session stack, exit pops sessions`

---

### Task A4: systemctl on mutable per-host state (+ preconditions, daemon-reload)

**Files:**
- Modify: `client/src/engine/shell/commands/linux/system.ts` (lines ~457–577)
- Test: `client/src/engine/shell/systemctlState.test.ts`

**Step 1: Failing tests** (representative — write all of these):

```ts
// helpers: createShell + registerHost with a telemetryd unit whose
// startRequires: [{ file: '/etc/telemetryd.conf', failMessage: 'telemetryd: config /etc/telemetryd.conf missing' }]
it('sudo systemctl start fails while the precondition is unmet and logs to the journal', ...);
// expect exitCode 1, unit stays 'failed', host.journal last entry contains failMessage
it('after creating the config, restart succeeds and the unit is active', ...);
it('stop sets inactive; enable/disable flip the enabled state', ...);
it('unit with unitFile uses the LOADED content until daemon-reload', () => {
  // unit file has ExecStart=/usr/bin/telemtryd (typo), startRequires: [{ unitFileMatches: 'ExecStart=/usr/bin/telemetryd', failMessage: '...' }]
  // fix the file via vfs.writeFile → restart STILL fails (loaded content stale)
  // sudo systemctl daemon-reload → restart succeeds
});
it('restarting ssh re-parses sshd_config (sshdEffective flips)', ...);
```

Run — Expected: FAIL.

**Step 2: Implement.** In `system.ts`:
- Delete the module-level `SYSTEMD_UNITS` const; every code path reads `ctx.host!.services` (fall back to a local `DEFAULT_UNITS.map(...)` copy ONLY if `ctx.host` is somehow absent, so nothing crashes).
- `findUnit` becomes `(host, name)`.
- `start`/`restart`: evaluate `startRequires` — for `{file, matches}` read the live VFS; for `{unitFileMatches}` test `unit.loadedUnitContent`; honor `absent`. On failure: `active='failed'`, `sub='failed'`, append journal entries `{ts: '2026-07-18 09:15:00', unit: unit.unit.replace('.service',''), priority: 'err', message: p.failMessage}`, return exit 1 with `Job for X.service failed because the control process exited with error code.\nSee "systemctl status X.service" and "journalctl -xeu X.service" for details.`
- On success: `active='active'`, `sub='running'`, journal info line `Started <desc>.`
- `stop` → inactive/dead + journal. `enable`/`disable` mutate `enabled` and print the real symlink lines (`Created symlink /etc/systemd/system/multi-user.target.wants/X.service → /lib/systemd/system/X.service.`).
- `daemon-reload`: for every unit with `unitFile`, re-snapshot `loadedUnitContent` from the VFS.
- `status` shows the stored journal's last 3 lines for that unit under the header (real systemctl does) — nice-to-have, include it.
- After a successful start/restart of `ssh.service`, call `ctx.host.refreshSshdEffective()`.

**Step 3: Run** `npm test -- client/src/engine/shell/systemctlState.test.ts client/src/engine/shell/ShellEngine.test.ts client/src/engine/shell/Extended.test.ts` — Expected: PASS (existing systemctl tests may reference the old static table — update them to go through a host).

**Step 4: Commit** — `feat(shell): systemctl mutates per-host units, preconditions + daemon-reload`

---

### Task A5: journalctl

**Files:**
- Create: `client/src/engine/shell/commands/linux/journal.ts`
- Modify: `client/src/engine/shell/commands/linux/index.ts` (spread new array into `allLinuxCommands`)
- Test: `client/src/engine/shell/journalctl.test.ts`

**Step 1: Failing tests:** filtering by `-u telemetryd` (accepts with/without `.service`), `-n 5` tail, `--since '2026-07-18 06:00' --until '2026-07-18 07:00'` (string compare on the ISO ts), `-p err`, plain `journalctl` prints all entries oldest-first in syslog format (`Jul 18 06:00:00 web01 telemetryd[812]: message`), output is grep-able through a pipe (`journalctl -u sshd | grep Failed`).

**Step 2: Implement** `journalctlCommand` reading `ctx.host!.journal`. Options spec: `-u/--unit` (takesValue), `-n/--lines` (takesValue), `--since` (takesValue), `--until` (takesValue), `-p/--priority` (takesValue), `--no-pager`, `-x`, `-e`, `-f` (print `-- Logs begin ... --` then a note `journalctl -f wird in dieser Simulation nicht unterstützt (kein Follow-Modus).` with exit 0). Format month names from the ISO ts (`Jul 18`). PID: derive a stable fake pid from the unit name (sum of char codes % 900 + 100) so output is deterministic.

**Step 3: Run** — PASS. **Step 4:** register in `commands/linux/index.ts`. **Step 5: Commit** — `feat(shell): journalctl over per-host journal`

---

### Task A6: Interactive input continuation (password prompts)

**Files:**
- Modify: `client/src/engine/shell/types.ts` (`CommandResult`), `client/src/engine/shell/ShellEngine.ts`
- Test: `client/src/engine/shell/pendingInput.test.ts`

`ssh`/`ssh-copy-id` need a `password:` prompt. Mechanism: a command may return `pendingInput` and register a continuation on the engine.

**Step 1: Failing test**

```ts
it('a command can request further input and consume the next line', () => {
  const shell = createShell({ type: 'bash' });
  shell.registerCommand({
    name: 'askname', description: '', usage: 'askname',
    execute(_args, ctx) {
      return ctx.requestInput!('name: ', false, (line) => ({ output: `hello ${line}`, exitCode: 0 }));
    },
  });
  const r1 = shell.execute('askname');
  expect(r1.pendingInput).toEqual({ prompt: 'name: ', mask: false });
  expect(shell.hasPendingInput()).toBe(true);
  const r2 = shell.continueInput('Timo');
  expect(r2.output).toBe('hello Timo');
  expect(shell.hasPendingInput()).toBe(false);
});
it('cancelPendingInput clears the continuation', ...);
it('while pending, execute() refuses and returns the pending prompt again', ...);
```

**Step 2: Implement**
- `CommandResult` gains `pendingInput?: { prompt: string; mask: boolean }`.
- `ExecutionContext` gains `requestInput?: (prompt: string, mask: boolean, next: (line: string) => CommandResult) => CommandResult;`
- Engine: `private pendingContinuation: ((line: string) => CommandResult) | null`; `requestInput` stores it and returns `{ output: '', exitCode: 0, pendingInput: { prompt, mask } }`. `continueInput(line)` runs+clears it — **and if the returned result again carries `pendingInput`, keep the new continuation** (multi-step prompts, e.g. 3 password attempts). `cancelPendingInput()`, `hasPendingInput()`, `getPendingPrompt()`.

**Step 3–4: Run, PASS, Commit** — `feat(shell): interactive input continuations for password prompts`

---

### Task A7: SSH auth core + ssh command

**Files:**
- Create: `client/src/engine/shell/sshAuth.ts` (shared by ssh/scp/ssh-copy-id/ansible)
- Create: `client/src/engine/shell/commands/linux/remote.ts`
- Modify: `commands/linux/index.ts`
- Test: `client/src/engine/shell/ssh.test.ts`

**Step 1: Failing tests** (the auth matrix — write ALL of these):

```ts
// setup helper: engine with local host (user 'timo') + web01 (accounts admin/pw 'sonnenblume23', root)
it('unknown host: "ssh: Could not resolve hostname nix: Name or service not known", exit 255', ...);
it('firewall deny 22 on target: "connect to host web01 port 22: Connection timed out"', ...);
it('no key, password auth enabled: prompts "admin@web01's password:" (masked)', ...);
it('correct password logs in: session depth 2, prompt hostname web01, "Last login" banner', ...);
it('wrong password 3x: "Permission denied (password)." back at local prompt', ...);
it('key auth: pubkey in local ~/.ssh + line in remote authorized_keys → no prompt, logged in', ...);
it('private key world-readable: UNPROTECTED PRIVATE KEY warning, key ignored → falls back/denied', ...);
it('PasswordAuthentication no + no key: "Permission denied (publickey)."', ...);
it('PermitRootLogin no blocks root even with valid key', ...);
it('ssh works from inside an ssh session (jumphost chain, depth 3), exit unwinds one at a time', ...);
```

**Step 2: Implement**

`sshAuth.ts`:

```ts
export type SshAuthResult =
  | { kind: 'ok'; method: 'publickey' | 'password' }
  | { kind: 'needs-password' }
  | { kind: 'denied'; message: string }
  | { kind: 'unreachable'; message: string };

export function checkKeyAuth(sourceVfs, sourceUser, target: HostState, targetUser: string):
  { ok: boolean; warning?: string } { /* iterate ~/.ssh/*.pub on source (home = sourceUser homedir),
     require sibling private key; if private key perms have group/other read → warning + skip;
     compare trimmed pubkey line against target authorized_keys of targetUser
     (path: targetUser === 'root' ? '/root/.ssh/authorized_keys' : `/home/${targetUser}/.ssh/authorized_keys`) */ }

export function attemptSsh(ctx, targetName, targetUser): SshAuthResult { /* resolve host (unreachable),
  firewall check: target.firewall.enabled && defaultIncoming === 'deny' && no allow-22 rule → unreachable timeout;
  explicit deny-22 rule → unreachable timeout;
  account exists? PermitRootLogin gate for root; key auth; else password-auth possible? needs-password : denied */ }
```

`remote.ts` — `sshCommand`: parse `[user@]host`, run `attemptSsh`; on `ok` push session + banner; on `needs-password` use `ctx.requestInput` with up to 3 attempts (compare against `target.accounts` password), masked. Exit code 255 on failures, like real ssh.

**Step 3: Run** `npm test -- client/src/engine/shell/ssh.test.ts` — PASS.
**Step 4: Commit** — `feat(shell): real ssh with key/password auth, firewall + sshd_config gating`

---

### Task A8: ssh-keygen, ssh-copy-id, scp

**Files:**
- Modify: `client/src/engine/shell/commands/linux/remote.ts`
- Test: `client/src/engine/shell/sshTools.test.ts`

**Step 1: Failing tests:**

```ts
it('ssh-keygen -t ed25519 defaults: writes ~/.ssh/id_ed25519 (600) + .pub, prints fingerprint art header', ...);
it('ssh-keygen -f custom path honored; existing file → overwrite y/n prompt via pendingInput', ...);
it('pub key material is deterministic and contains user@hostname comment', ...);
it('ssh-copy-id user@host with password auth: prompts, appends key to remote authorized_keys, creates .ssh 700', ...);
it('ssh-copy-id when PasswordAuthentication no and no key: real-style error, nothing written', ...);
it('ssh-copy-id is idempotent: second run says "All keys were skipped because they already exist"', ...);
it('scp localfile user@host:/path copies content across VFS (key auth)', ...);
it('scp user@host:/remote/file . copies to cwd; prints progress line "file 100%"', ...);
it('scp to unauthorized host: Permission denied, nothing written', ...);
```

**Step 2: Implement.** Key material: `ssh-ed25519 AAAAC3<base36 of a module counter + user + host hash> <user>@<hostname>` — deterministic, no `Math.random`. `scp` parses `user@host:path` on either side (exactly one side remote — both-remote returns a friendly error), auth via `attemptSsh`-style check (key first, password prompt fallback), then cross-VFS `readFile`/`writeFile` with target directory checks (`scp: /nope/x: No such file or directory`).

**Step 3–4:** Run, PASS, Commit — `feat(shell): ssh-keygen, ssh-copy-id, scp across hosts`

---

### Task A9: ufw + chown + crontab

**Files:**
- Create: `client/src/engine/shell/commands/linux/firewallCmd.ts` (ufw)
- Modify: `client/src/engine/shell/commands/linux/fileops.ts` (chown next to chmod), `system.ts` (crontab), `commands/linux/index.ts`
- Test: `client/src/engine/shell/ufw.test.ts`, extend `Extended.test.ts` for chown/crontab

**Step 1: Failing tests:**

```ts
// ufw (all state-changing subcommands require root — non-root: "ERROR: You need to be root to run this script")
it('ufw status shows Status: active + rules table', ...);
it('sudo ufw allow 22/tcp adds a rule ("Rule added")', ...);
it('sudo ufw deny 4444 adds deny rule; ufw status numbered lists [ 1]…', ...);
it('sudo ufw delete 2 removes the second rule', ...);
it('sudo ufw default deny incoming flips the default', ...);
it('after deny 22, a NEW ssh to this host times out but the EXISTING session keeps working', ...);
// chown
it('sudo chown admin:admin /file changes VFSNode owner+group; non-root gets Operation not permitted', ...);
// crontab
it('crontab -l prints /var/spool/cron/crontabs/<user>, or "no crontab for <user>"', ...);
it('crontab -e prints the no-editor note pointing at the spool file', ...);
it('sudo crontab -u root -l reads root\'s crontab', ...);
```

**Step 2: Implement.** ufw operates on `ctx.host!.firewall`; service-name ports: ssh→22, http→80, https→443. Output formats copied from real ufw (`To  Action  From` table). chown: `-R` recursive, mutate `stat` node owner/group via a VFS helper — add `chown(path, owner, group?, recursive?)` to `VirtualFilesystem` + interface. crontab: purely file-backed at `/var/spool/cron/crontabs/<user>` so `sed`/`tee`/`cat` work on it.

**Step 3–4:** Run, PASS, Commit — `feat(shell): ufw firewall state, chown, file-backed crontab`

---

### Task A10: Ansible mini-engine

**Files:**
- Create: `client/src/engine/shell/ansible/miniYaml.ts` (playbook-subset parser)
- Create: `client/src/engine/shell/ansible/inventory.ts`
- Create: `client/src/engine/shell/ansible/modules.ts` (lineinfile, copy, service, user)
- Create: `client/src/engine/shell/ansible/runPlaybook.ts`
- Create: `client/src/engine/shell/commands/linux/ansible.ts` (`ansible-playbook` command)
- Tests: `client/src/engine/shell/ansible/miniYaml.test.ts`, `.../runPlaybook.test.ts`

This is the biggest task — split into 4 sub-cycles, each red/green/commit:

**A10.1 miniYaml:** Parses ONLY the subset our levels use: a top-level list of plays; keys `name`, `hosts`, `become` (bool), `tasks`; each task: `name` + exactly one module key with a nested map of scalar params. 2-space indentation, `- ` list items, single/double-quoted or bare scalars, `#` comments. Parse errors carry the line number (`ERROR! Syntax Error while loading YAML.\n  line 7, column 3`). Test: round-trips this exact fixture:

```yaml
---
- name: Harden SSH
  hosts: web
  become: true
  tasks:
    - name: Disallow root login
      lineinfile:
        path: /etc/ssh/sshd_config
        regexp: '^#?PermitRootLogin'
        line: 'PermitRootLogin no'
    - name: Restart sshd
      service:
        name: ssh
        state: restarted
```

plus error-position tests for bad indentation and an unknown module (unknown module error comes from runPlaybook, not the parser).

**A10.2 inventory:** INI subset: `[group]` headers, one hostname per line, comments. `resolveHosts(inventory, pattern)` supports a group name, `all`, and a single hostname.

**A10.3 modules:** Each module: `(host: HostState, params, check: boolean) => { changed: boolean; failed?: string; diff?: {before: string; after: string} }`.
- `lineinfile`: `path`, `regexp?`, `line?`, `state: present|absent`. present: if a line matches regexp → replace first match with `line` (changed if different), else append `line`. absent: remove matching lines. Missing file + present → create (changed). Missing required params → failed with ansible-style msg.
- `copy`: `content`/`src` (src read from the CONTROLLER host vfs), `dest`, `mode?`. changed iff content differs; apply mode via vfs.chmod.
- `service`: `name`, `state: started|stopped|restarted`, `enabled?`. Reuses the same unit-mutation logic as systemctl (export a helper `applyServiceState(host, unit, state)` from `system.ts` in Task A4 — refactor there if you didn't). `restarted` is always `changed`; `started` only when not active. Honors `startRequires` → failed with the journal message.
- `user`: `name`, `state: present|absent`. present: ensure account + `/home/<name>` (changed when created). absent: drop account (changed when existed).
- become: false + a task touching `/etc/...` → failed `Permission denied`, ansible-style.

**A10.4 runPlaybook + command:** `ansible-playbook [-i inventory] [--check] [--diff] [--syntax-check] playbook.yml`. Default inventory `/etc/ansible/hosts`, else `-i`. For each play: `PLAY [name] ****`, connection check per host — targets must be reachable AND key-authenticated from the controller (reuse `checkKeyAuth`; controller user = current session user); unreachable hosts print the real `UNREACHABLE!` fatal JSON-ish line and are skipped in the recap `unreachable=1`. Then per task × host: `ok:`/`changed:`/`fatal:` lines; `--diff` prints `--- before` / `+++ after` blocks for lineinfile/copy. `--check` computes without applying. `PLAY RECAP` with `ok= changed= unreachable= failed=` counts. Exit 0 unless failed/unreachable > 0 (exit 2). Idempotency test: run twice for real, first run `changed=2`, second `changed=0` and every task `ok:`.

**Run after each sub-cycle:** `npm test -- client/src/engine/shell/ansible/` — then register the command, commit per sub-cycle: `feat(shell): ansible mini-yaml parser` / `inventory` / `modules with check+diff` / `ansible-playbook runner`.

---

### Task A11: stateGoals evaluator

**Files:**
- Create: `client/src/engine/shell/stateGoals.ts`
- Test: `client/src/engine/shell/stateGoals.test.ts`

**Step 1: Failing tests:** one per goal kind — `matches`, `absentMatches`, `fileExists`, `fileAbsent`, `serviceState`, `serviceEnabled`, `firewallRule` (present + `present: false`), `firewallDefaultIncoming`, `host: 'web01'` targeting a registered host, default host = engine's base host, unknown host → false (never throws), all-of semantics of `checkStateGoals`.

**Step 2: Implement:**

```ts
import { StateGoal } from '@kritis/shared';
import { ShellEngine } from './ShellEngine';

export function checkStateGoal(engine: ShellEngine, goal: StateGoal): boolean { /* resolve host
  (goal.host ? engine.resolveHost(goal.host) : engine.getBaseHost()) — add getBaseHost() accessor;
  evaluate every set field, AND them; regexes with 'm' flag; read errors → false */ }
export function checkStateGoals(engine: ShellEngine, goals: StateGoal[]): boolean {
  return goals.length > 0 && goals.every(g => checkStateGoal(engine, g));
}
```

**Step 3–4:** Run, PASS, export from `engine/shell/index.ts`, Commit — `feat(shell): declarative stateGoal evaluation`

---

### Task A12: useTerminal integration

**Files:**
- Modify: `client/src/components/Terminal/useTerminal.ts`, `client/src/components/Terminal/prompt.ts` (only if needed)
- Test: `client/src/components/Terminal/Terminal.multihost.browser.test.tsx` (jsdom — run with `npm run test:client -- src/components/Terminal/Terminal.multihost.browser.test.tsx`)

Four integration points (surgical edits, the file is delicate — read it fully first):

1. **Prompt from the engine.** `getPrompt`/`getTermPrompt` currently read `context.hostname/username`. Change both to prefer `shellRef.current?.getPromptInfo()` so pushed ssh sessions change the prompt. (`buildPrompt` signature already takes the fields — just feed it live values.)
2. **stateGoals checking.** In `checkSolutions`, a solution now matches when: (`commands` empty OR command condition met as today) AND (`stateGoals` absent OR `checkStateGoals(shellRef.current!, solution.stateGoals)`). Call the solution check ALSO after every real `shell.execute()` (today it only runs on canned matches) — after the `const result = shellRef.current.execute(trimmed);` branch, run the same solved-banner code path as the canned branch (extract that banner block into a local `announceSolved(solution)` helper to avoid duplicating the box-drawing).
3. **pendingInput loop.** After any `execute`/`continueInput` result: if `result.pendingInput`, write its prompt (no newline), set a local `pendingMask` flag; while pending, Enter routes the typed line to `shell.continueInput(line)` (echo `*` per char when masked, else normal echo), Ctrl+C calls `shell.cancelPendingInput()`. Canned-command matching and history must be BYPASSED while pending (passwords must not enter history).
4. **Live skill drip.** Track a `Set` of command names already credited; after a real command with `exitCode === 0`, if `context.commandSkillGain?.[commandName]` and unseen, accumulate into a `liveSkillGainRef`; merge it into `pendingSkillGain` when solved. (Command name = first token of the trimmed line after history expansion.)

**Browser test:** render the Terminal with a two-host context (`hosts: [{id: 'web01', ...accounts admin+password}]`, a solution with `stateGoals` on web01, `commandSkillGain`), then drive `term.input(...)`? — follow the existing pattern in `Terminal.partialFeedback.browser.test.tsx` for how keystrokes are simulated; assert: password prompt masks input, prompt shows `admin@web01`, touching the goal file on web01 pops the AUFGABE ABGESCHLOSSEN banner, and `onSolved` receives merged live + solution skillGain.

**Run:** `npm run test:client` — all browser tests green (the two existing Terminal browser tests are the regression canaries for the refactor).

**Commit** — `feat(terminal): multi-host prompt, stateGoal solutions, password prompts, live skill drip`

---

# Phase B — Content: 4 tracks × 4 levels

### Task B1: Register tracks

**Files:**
- Modify: `client/src/content/events/learning-tracks.ts`
- Create: `client/src/content/events/learning-path-advanced.ts` (empty `export const advancedLearningEvents: GameEvent[] = []` for now)
- Modify: `client/src/content/events/index.ts` (aggregate the new array exactly like `learningPathEvents` is aggregated — check how `learningPathEvents` flows into the event pool and mirror it; the LearningHub finds levels by `eventId`)

Append to `LEARNING_TRACKS` (and bump `finale` to `order: 11`):

```ts
  {
    id: 'ssh_remote', title: 'SSH & Remote-Zugriff',
    description: 'Schlüssel statt Passwörter: sichere Fernzugriffe über Zonen hinweg.',
    icon: '🗝️', order: 7,
    levels: [
      { eventId: 'learn_ssh_01_first_key' },
      { eventId: 'learn_ssh_02_open_door' },
      { eventId: 'learn_ssh_03_jumphost' },
      { eventId: 'learn_ssh_04_key_graveyard', optional: true },
    ],
  },
  {
    id: 'systemd_journal', title: 'systemd & Journal',
    description: 'Dienste verstehen, Logs lesen, Ursachen statt Symptome.',
    icon: '⚙️', order: 8,
    levels: [
      { eventId: 'learn_sysd_01_silent_service' },
      { eventId: 'learn_sysd_02_time_travel' },
      { eventId: 'learn_sysd_03_revenant' },
      { eventId: 'learn_sysd_04_chain_reaction' },
    ],
  },
  {
    id: 'net_forensics', title: 'Netz-Forensik',
    description: 'Offene Ports, fremde Verbindungen, saubere Firewalls.',
    icon: '🕸️', order: 9,
    levels: [
      { eventId: 'learn_net_01_open_doors' },
      { eventId: 'learn_net_02_backchannel' },
      { eventId: 'learn_net_03_the_wall' },
      { eventId: 'learn_net_04_spider', optional: true },
    ],
  },
  {
    id: 'ansible_config', title: 'Ansible & Konfigurationsmanagement',
    description: 'Eine Wahrheit für alle Hosts: Playbooks, Drift, Idempotenz.',
    icon: '📜', order: 10,
    levels: [
      { eventId: 'learn_ans_01_inventory' },
      { eventId: 'learn_ans_02_drift' },
      { eventId: 'learn_ans_03_broken_playbook' },
      { eventId: 'learn_ans_04_fleet_hardening' },
    ],
  },
```

Run `npm test` — the LearningHub/track tests will fail on missing eventIds until B2–B5 land; if the suite enforces existence NOW, keep this commit combined with B2's first level or temporarily seed all 16 ids in B2–B5 order within the same PR-sized commit series. Prefer: implement B2 first, then commit B1+B2 together.

### Task B2: Track SSH & Remote-Zugriff (4 levels + lesson test)

**Files:**
- Modify: `client/src/content/events/learning-path-advanced.ts`
- Test: `client/src/engine/sshTrackLessons.test.ts`

Level 1 is spelled out COMPLETELY below — it is the pattern for all 15 others (GameEvent shape copied from `learn_01_awakening` in `learning-path.ts:93`; peer review of German text by the user afterwards). For the remaining levels this plan gives exact specs; write them in the same voice (noir, terse, Du-Form, mentors per character canon: Jens/Henry kompetent, Bjorg lauter Delegierer, Bert souveräner Chef).

**Level `learn_ssh_01_first_key` — „SSH 1: Der erste Schlüssel“ (complete):**

```ts
{
  id: 'learn_ssh_01_first_key',
  weekRange: [1, 12],
  probability: 1,
  requiredModes: ['learning'],
  category: 'training',
  involvedCharacters: ['bert'],
  title: 'SSH 1: Der erste Schlüssel',
  description: `\`\`\`
╔══════════════════════════════════════════════════════════════╗
║  TICKET #4711 — Zugriff web01                                ║
║  Melder: Bert (IT-Leitung)                                   ║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

Bert lehnt sich in deine Tür: „Der Webserver braucht ab heute
gepflegte Zugänge. Passwörter tippen wir hier nicht mehr durch
die Gegend — bau dir ein SSH-Schlüsselpaar und hinterleg es
auf web01. Das Admin-Passwort steht im Safe-Zettel in deinem
Home. Danach will ich sehen, dass du OHNE Passwort raufkommst.“

**Deine Aufgabe:**
- Erzeuge ein Schlüsselpaar (ed25519)
- Hinterlege den öffentlichen Schlüssel auf web01 (User: admin)
- Logge dich passwortlos auf web01 ein`,
  mentorNote: 'Öffentlicher Schlüssel = Schloss (darf jeder sehen), privater Schlüssel = Schlüssel (bleibt bei dir, Rechte 600).',
  choices: [
    {
      id: 'start',
      text: 'Terminal öffnen...',
      terminalCommand: true,
      effects: {},
    },
    {
      id: 'later',
      text: 'Erst das Ticket zu Ende lesen (kostet Zeit, +Kontext)',
      effects: { stress: -2 },
      resultText: 'Du atmest durch und liest das Ticket zweimal. Kein Ruhm, aber ein klarer Kopf.',
    },
  ],
  terminalContext: {
    type: 'linux',
    hostname: 'ws-admin',
    username: 'timo',
    currentPath: '/home/timo',
    taskText: 'Schlüsselpaar erzeugen, Public Key auf web01 (admin) hinterlegen, passwortlos einloggen.',
    vfsOverlay: {
      files: [
        { path: '/home/timo/safe-zettel.txt', content: 'web01 / admin\nPasswort: sonnenblume23\n(NACH KEY-ROLLOUT VERNICHTEN — Bert)' },
      ],
    },
    hosts: [
      {
        id: 'web01',
        hostname: 'web01',
        ip: '10.0.20.11',
        templateIds: ['linux-webserver'],
        accounts: [{ name: 'admin', password: 'sonnenblume23' }, { name: 'root' }],
      },
    ],
    commands: [],
    commandSkillGain: {
      'ssh-keygen': { linux: 2, security: 1 },
      'ssh-copy-id': { linux: 1, security: 2 },
      'ssh': { linux: 2 },
    },
    solutions: [
      {
        commands: [],
        allRequired: false,
        stateGoals: [
          { host: 'web01', file: '/home/admin/.ssh/authorized_keys', matches: 'ssh-ed25519' },
        ],
        resultText:
          'Der Schlüssel liegt auf web01. Beim nächsten `ssh admin@web01` fragt niemand mehr nach einem Passwort — und der Safe-Zettel kann in den Schredder.\n\nMerke: Der PRIVATE Schlüssel hat deinen Rechner nie verlassen. Genau so soll es sein.',
        skillGain: { linux: 3, security: 3 },
        effects: { stress: -3 },
      },
    ],
    hints: [
      '🤖 Jens: Erst brauchst du ein Schlüsselpaar. Es gibt ein Standard-Werkzeug dafür — der Name beginnt mit ssh-…',
      '🤖 Jens: `ssh-keygen -t ed25519` erzeugt das Paar in ~/.ssh/. Die Passphrase darfst du hier leer lassen.',
      '🤖 Jens: Zum Verteilen gibt es ssh-copy-id. Das Admin-Passwort steht im Safe-Zettel (`cat safe-zettel.txt`).',
      '🤖 Jens: Komplett: `ssh-keygen -t ed25519` → `ssh-copy-id admin@web01` (Passwort: siehe Zettel) → `ssh admin@web01`.',
    ],
  },
  tags: ['learning', 'ssh', 'terminal'],
},
```

*(Field check against the real `GameEvent`/choice types before writing all levels — e.g. whether `terminalCommand: true` sits on the choice and `terminalContext` on the event, exactly as in `learn_01_awakening`.)*

**Level specs 2–4 (same file, same shape):**

- **`learn_ssh_02_open_door` — „SSH 2: Die offene Tür“** — requires: `learn_ssh_01_first_key`. Start on ws-admin; host web01 like level 1 but `vfsOverlay` ships `/etc/ssh/sshd_config` with `PermitRootLogin yes` + `PasswordAuthentication yes` and an audit note from Bert in the briefing. Player: ssh to web01, harden both settings via `sed -i`, `sudo systemctl restart ssh`. stateGoals (all on web01): sshd_config `matches: '^PermitRootLogin no'`, `matches: '^PasswordAuthentication no'`, service ssh `serviceState: 'active'`. Teaching beat in resultText: „Erst Schlüssel testen, DANN Passwort-Auth abdrehen — sonst sperrst du dich aus.“ Hints ladder ends with the exact two `sed -i 's/^.../.../' /etc/ssh/sshd_config` lines + restart.
- **`learn_ssh_03_jumphost` — „SSH 3: Sprung durch die Zone“** — requires level 2. Hosts: `jump01` (accounts admin, player's key preinstalled via overlay authorized_keys containing the deterministic key? NO — key material is generated at runtime. Instead: jump01 allows password auth with a briefing-provided password; db01 (`firewall: { defaultIncoming: 'deny', rules: [{action: 'allow', port: 22, from: '10.0.30.5'}] }` — simulate „nur vom Jumphost erreichbar“: implement `from` matching in Task A7 as: direct ssh from base host fails when a `from` is set that matches jump01's ip; ssh FROM jump01 succeeds. Keep it that simple.) Player: generate key, copy to jump01, ssh jump01 → from there ssh db01 (password from briefing), fetch `/var/dbdumps/status.txt` proof. stateGoal: db01 journal? — simpler core find: file `/home/admin/proof.txt` created on jump01 via `scp db01:/var/dbdumps/status.txt proof.txt`? Keep the core find: `{ host: 'jump01', file: '/home/admin/proof.txt', fileExists: true }` — briefing says „hol den Statusbericht bis auf den Jumphost“. resultText explains Netzsegmentierung/KRITIS-Zonen.
- **`learn_ssh_04_key_graveyard` ★ — „SSH ★: Der Schlüsselfriedhof“** — requires level 3, `optional: true` in track. Hosts web01/jump01/db01, each with authorized_keys overlays containing legit keys (comments `jens@ws-jens`, `henry@ws-henry`) and on db01 one rogue key `ssh-ed25519 AAAA…fenris wartung@extern-2019`. Player audits (`ssh` + `cat`/`grep` per host), secures evidence FIRST (`scp db01:/home/admin/.ssh/authorized_keys ~/evidenz_db01.txt` — evidence-first callback), then removes the rogue line (`sed -i '/wartung@extern/d' …`). stateGoals: local `~/evidenz_db01.txt` `matches: 'wartung@extern'` AND db01 authorized_keys `absentMatches: 'wartung@extern'`. FENRIS lore hook in resultText.

**Lesson test** (`client/src/engine/sshTrackLessons.test.ts`, pattern: `sshOrphanLesson.test.ts`): for each level, build the shell via `createShellFromContext(event.terminalContext)`, drive the documented solution path with `shell.execute(...)` (+ `continueInput` for passwords), assert `checkStateGoals` flips to true — and for at least level 2 also assert an ALTERNATIVE path (e.g. `echo`-append instead of `sed -i`) also wins. Assert hints follow the ladder rule (first hint contains no backtick-command, last does).

**Run:** `npm test -- client/src/engine/sshTrackLessons.test.ts`, then the full `npm test` (orthography + shadowing + audits). **Commit** — `feat(learning): SSH & Remote-Zugriff track (4 levels)` (combined with B1's registration).

### Task B3: Track systemd & Journal

Same file/test pattern (`client/src/engine/systemdTrackLessons.test.ts`). All levels single-host (`hosts` omitted — base host), which exercises the backward-compatible path.

- **`learn_sysd_01_silent_service` — „systemd 1: Der stumme Dienst“**: service `telemetryd.service` (`active: 'failed'`, `startRequires: [{ file: '/etc/telemetryd.conf', failMessage: 'telemetryd[812]: FATAL: /etc/telemetryd.conf: No such file or directory' }]`), journal seeded with the failure trail. Player: status → journalctl -u → `echo`/`tee` the config (content given in briefing: `interval=60`) → `sudo systemctl start` → `sudo systemctl enable`. stateGoals: serviceState active AND serviceEnabled true. Bjorg delegates it loudly per phone („Mach du das, ich bin im Termin“).
- **`learn_sysd_02_time_travel` — „systemd 2: Die Zeitreise“**: journal seeded with ~40 sshd entries; brute-force burst starts `2026-07-17 02:13:44` from `185.220.101.34`. Player narrows with `--since/--until` + grep. Core find is INFORMATION, not state — so the goal is an action: briefing says „trag die Angreifer-IP in /etc/ssh/denylist.txt ein“. stateGoal: file matches the IP. (Pattern for future forensic levels: convert a find into a small write.)
- **`learn_sysd_03_revenant` — „systemd 3: Der Wiedergänger“**: unit `pumpmon.service` with `unitFile: '/etc/systemd/system/pumpmon.service'`, file has `ExecStart=/usr/local/bin/pumpmond --confg /etc/pumpmon.yml` (typo `--confg`), `startRequires: [{ unitFileMatches: 'ExecStart=/usr/local/bin/pumpmond --config /etc/pumpmon\\.yml', failMessage: 'pumpmond: unknown option --confg' }]`. Player: journalctl → fix via sed -i → restart fails AGAIN (stale loaded unit!) → journal/hint points to `daemon-reload` → restart works. stateGoals: serviceState active. This level exists to teach daemon-reload — the double-failure is the lesson.
- **`learn_sysd_04_chain_reaction` — „systemd 4: Die Kettenreaktion“**: `leitstand-api.service` failed with `startRequires: [{ file: '/run/mysqld/mysqld.sock', failMessage: 'leitstand-api: cannot connect to database socket /run/mysqld/mysqld.sock' }]`; `mysql.service` is `inactive` (someone stopped it), and starting mysql creates the socket — implement via a second precondition-free unit whose successful start writes the socket file: give mysql a `startRequires: []` and in the LEVEL overlay note; the socket must appear when mysql starts. **Engine touch-up (do in this task, TDD):** in systemctl start success path, if the unit is `mysql.service`, ensure `/run/mysqld/mysqld.sock` exists — generalize as `TerminalServiceSpec.createsOnStart?: string[]` (files touched on successful start) instead of hardcoding. stateGoals: both services active. Lesson: dependency thinking — `systemctl status` shows WHY, don't blind-restart the API five times.

**Commit** — `feat(learning): systemd & Journal track (4 levels)`

### Task B4: Track Netz-Forensik

Test: `client/src/engine/netTrackLessons.test.ts`.

- **`learn_net_01_open_doors` — „Netz 1: Offene Türen“**: single host; briefing ships the Soll-Portliste (22, 80, 443). `ss -tulpen` (existing command — seed its data via the level's canned `commands`? NO: check how `ss` sources its table; if static, add a per-host `listeners` field to `HostState` in this task (TDD) and make `ss`/`netstat` read `ctx.host.listeners` with the current static list as default). Rogue listener: `0.0.0.0:31337  users:(("nc",pid=6666))`. Core find→action: kill the process (`sudo kill 6666` — verify `kill` marks the listener gone) or briefing asks to record the PID in `/root/incident/port-befund.txt`. Prefer the kill: stateGoal — add `listenerAbsent?: { port: number }` to StateGoal in this task (tiny extension + test). 
- **`learn_net_02_backchannel` — „Netz 2: Der Rückkanal“**: `ss -tp` shows an ESTABLISHED connection to `91.203.5.77:443` from `updater` pid 4242; `/etc/hosts` contains a poisoned line `91.203.5.77 update.vendor.de`. Player: find connection, `cat /etc/hosts`, secure evidence (`cp /etc/hosts /root/incident/hosts.bak`), remove the line (`sed -i`). stateGoals: backup exists+matches IP, `/etc/hosts` absentMatches IP.
- **`learn_net_03_the_wall` — „Netz 3: Die Mauer“**: firewall default allow with no rules; briefing: nur 22/80/443 rein, Rest zu — „und sperr dich nicht aus“. stateGoals: allow-22 rule present AND defaultIncoming deny AND firewall enabled. If the player sets default deny FIRST without allow 22, ufw prints the real warning (`Command may disrupt existing ssh connections.`) — and a partial-feedback canned response? No: implement the warning inside ufw (A9 already prints it — verify). Hints escalate to the correct ORDER as the final hint.
- **`learn_net_04_spider` ★ — „Netz 4: Die Spinne im Netz“ (Boss)**: hosts web01+db01, journal on web01 shows lateral movement from db01 (`Accepted publickey for admin from 10.0.20.12`), db01 has the rogue listener + a cron backdoor line in `/var/spool/cron/crontabs/root` (`* * * * * /tmp/.hidden/beacon.sh`). Player: journal forensics on web01 → ssh db01 → evidence (`scp` the crontab home) → remove cron line → `sudo ufw deny 31337` on db01 (containment). stateGoals: evidence file local matches 'beacon', db01 crontab absentMatches 'beacon', db01 firewallRule deny 31337 present. Synthesis of all three prior tracks.

**Commit** — `feat(learning): Netz-Forensik track (4 levels)`

### Task B5: Track Ansible & Konfigurationsmanagement

Test: `client/src/engine/ansibleTrackLessons.test.ts`. All levels start on `ansible01` (controller) with `/etc/ansible/hosts` inventory + playbooks in `/opt/playbooks/`, hosts web01/web02/web03 registered with key auth PRE-INSTALLED (overlay authorized_keys must match a pre-generated keypair shipped in the controller's overlay `~/.ssh/` — fixed literal key material in the overlay on BOTH sides, no runtime keygen needed).

- **`learn_ans_01_inventory` — „Ansible 1: Die Inventur“**: read inventory + `motd.yml` playbook (copy module writes `/etc/motd`), run `--check`, then run for real, verify on one host via ssh. stateGoals: web01+web02 `/etc/motd` matches the content. Lesson text: check first, apply second.
- **`learn_ans_02_drift` — „Ansible 2: Der Drift“**: web02's `sshd_config` hand-edited by Bjorg (`PermitRootLogin yes` — the others say no; briefing has his „hab ich nur kurz zum Testen aufgemacht“-Mail). `ansible-playbook harden.yml --check --diff` exposes exactly web02 as `changed`. Apply, run again → `changed=0`. stateGoals: web02 sshd_config matches `^PermitRootLogin no`. resultText spells out Idempotenz („Der zweite Lauf ist der Beweis“).
- **`learn_ans_03_broken_playbook` — „Ansible 3: Das kaputte Playbook“**: `deploy.yml` has `pathh:` instead of `path:` in a lineinfile task → run fails with the module's missing-param error naming the task. Fix via `sed -i 's/pathh:/path:/' /opt/playbooks/deploy.yml`, run clean. stateGoals: playbook absentMatches 'pathh', all three webs have the deployed line.
- **`learn_ans_04_fleet_hardening` — „Ansible 4: Die Flottenhärtung“**: synthesis. Briefing gives the full target policy; `/opt/playbooks/harden-fleet.yml` exists but only covers PermitRootLogin — player EXTENDS it (append a second lineinfile task + a service restart task via `tee -a` / here-style `echo >>`; final hint shows the exact YAML block to append). stateGoals: all three webs match both hardened lines AND ssh active; spot-check encouraged via `ssh web03`. This is the track finale — `skillGain` highest of the track.

**Commit** — `feat(learning): Ansible track (4 levels)`

---

# Phase C — Verification & docs

### Task C1: Full suite + audits

1. `npm run build` (typecheck path) — fix any type fallout.
2. `npm test` — ALL node tests including orthography (German content!), shadowing, pacing/flow-density/skill-balance audits. Audit failures = content feedback: adjust `skillGain` numbers/probability/weekRange until green, never weaken the audits.
3. `npm run test:client` — browser tests.
4. `npm run test:e2e` — the per-level proof suite in `e2e/` may enumerate learning levels; if it does, add proofs for the 16 new levels following its existing per-level pattern (check `e2e/game.spec.ts` and recent commit `b258379` for the pattern).

### Task C2: Docs + verify skill

- Update `docs/GAME_MODES_SPEC.md` (learning mode track list) and `docs/specs/terminal-cli-specification.md` (new commands, multi-host, pendingInput, stateGoals).
- Update `.claude/skills/verify/SKILL.md` gotchas if the password-prompt flow adds a keyboard-flow quirk.
- Run the app once via the verify skill flow (`npm run dev`) and play `learn_ssh_01_first_key` end-to-end manually.

**Final commit** — `docs: advanced CLI levels — spec + verify updates`

---

## Execution order & dependencies

A1 → A2 → A3 → A4 → A5 (needs A4's journal) → A6 → A7 (needs A3+A6) → A8 → A9 → A10 (needs A7's checkKeyAuth) → A11 → A12 (needs A11) → B1+B2 together → B3 → B4 (extends StateGoal/HostState — small engine TDD detours are expected and noted) → B5 → C1 → C2.

Content German-text quality is reviewed by the user (level designer) after Phase B — flag anything you were unsure about in the handoff notes.
