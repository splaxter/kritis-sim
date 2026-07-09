# CLI Realism Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the in-game shell feel real: every path a quest mentions exists in the virtual filesystem (auto-seeded from the level's canned commands), the prompt behaves like real bash (`~`, root `#`), `ls` prints aligned columns, and fake exit-code lines disappear.

**Architecture:** A new pure module `scenarioSeed.ts` parses each level's canned `commands[]`, `hints`, and `taskText` and materializes referenced files/dirs into the VFS at shell creation (never overwriting existing nodes, so templates/overlays win). Small targeted edits polish the prompt, `ls` grid layout, and solution output in `useTerminal.ts`. A content-wide vitest guard builds the seeded shell for all ~49 terminal contexts and asserts consistency forever.

**Tech Stack:** TypeScript, vitest (run via `npm run test:client -- <file>` from repo root; this builds `shared` first), xterm.js frontend (no changes to xterm itself).

**Design doc:** `docs/plans/2026-07-09-cli-realism-design.md`

**Key existing files to understand first:**
- `client/src/engine/shell/index.ts` — `createShell` / `createShellFromContext` (seeding hooks in here)
- `client/src/engine/shell/VirtualFilesystem.ts` — `addFile` (auto-creates parent dirs), `addDirectory`, `resolvePath` (handles `~`, env vars), `exists`, `isFile`
- `client/src/engine/shell/commands/linux/navigation.ts` — `lsCommand` (grid branch), `colorizeEntry`
- `client/src/components/Terminal/useTerminal.ts` — prompt building (duplicated at :88 and :134), solution banners (:425, :453), completion grid (:642)
- `shared/src/types/terminal.ts` — `TerminalContext` (has `commands`, `hints`, `taskText`, `vfsOverlay`, `templateIds`)
- `shared/src/types/events.ts:74` + `shared/src/types/scenarios.ts:56` — where `terminalContext` hangs off content

---

### Task 1: Realistic prompt (`~` abbreviation, root `#`)

**Files:**
- Create: `client/src/components/Terminal/prompt.ts`
- Test: `client/src/components/Terminal/prompt.test.ts`
- Modify: `client/src/components/Terminal/useTerminal.ts` (both prompt builders)
- Modify: `client/src/engine/shell/VirtualFilesystem.ts:637` (root's home is `/root`)

**Step 1: Write the failing test**

`client/src/components/Terminal/prompt.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildPrompt } from './prompt';

describe('buildPrompt', () => {
  it('collapses home to ~ for linux', () => {
    expect(buildPrompt({ type: 'linux', username: 'azubi', hostname: 'srv', path: '/home/azubi', home: '/home/azubi' }))
      .toBe('azubi@srv:~$ ');
  });

  it('collapses home subdirectories to ~/…', () => {
    expect(buildPrompt({ type: 'linux', username: 'azubi', hostname: 'srv', path: '/home/azubi/logs', home: '/home/azubi' }))
      .toBe('azubi@srv:~/logs$ ');
  });

  it('does not collapse sibling dirs that merely share the prefix', () => {
    expect(buildPrompt({ type: 'linux', username: 'azubi', hostname: 'srv', path: '/home/azubi2', home: '/home/azubi' }))
      .toBe('azubi@srv:/home/azubi2$ ');
  });

  it('uses # for root', () => {
    expect(buildPrompt({ type: 'linux', username: 'root', hostname: 'srv', path: '/var/log', home: '/root' }))
      .toBe('root@srv:/var/log# ');
  });

  it('shows ~ with # when root is at home', () => {
    expect(buildPrompt({ type: 'linux', username: 'root', hostname: 'srv', path: '/root', home: '/root' }))
      .toBe('root@srv:~# ');
  });

  it('keeps the PowerShell prompt unchanged', () => {
    expect(buildPrompt({ type: 'windows', username: 'admin', hostname: 'dc01', path: 'C:\\Users\\admin' }))
      .toBe('PS C:\\Users\\admin> ');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:client -- src/components/Terminal/prompt.test.ts`
Expected: FAIL — `Cannot find module './prompt'` (or equivalent).

**Step 3: Write minimal implementation**

`client/src/components/Terminal/prompt.ts`:

```ts
// client/src/components/Terminal/prompt.ts
// Single source of truth for the shell prompt, shaped like real bash/PS:
// bash abbreviates $HOME to ~ and gives root a # instead of $.

export interface PromptOptions {
  type: 'linux' | 'windows';
  username: string;
  hostname: string;
  path: string;
  home?: string;
}

export function buildPrompt(opts: PromptOptions): string {
  if (opts.type === 'linux') {
    let path = opts.path;
    if (opts.home && (path === opts.home || path.startsWith(opts.home + '/'))) {
      path = '~' + path.slice(opts.home.length);
    }
    const promptChar = opts.username === 'root' ? '#' : '$';
    return `${opts.username}@${opts.hostname}:${path}${promptChar} `;
  }
  return `PS ${opts.path}> `;
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:client -- src/components/Terminal/prompt.test.ts`
Expected: PASS (6 tests).

**Step 5: Wire into useTerminal (replace BOTH duplicated builders)**

In `client/src/components/Terminal/useTerminal.ts`:

Add import:
```ts
import { buildPrompt } from './prompt';
```

Replace the body of `getPrompt` (the `useCallback` around line 88):
```ts
  const getPrompt = useCallback(() => {
    const vfs = shellRef.current?.getVfs();
    return buildPrompt({
      type: context.type,
      username: context.username,
      hostname: context.hostname,
      path: vfs?.getCurrentPath() || context.currentPath,
      home: vfs?.getEnv('HOME'),
    });
  }, [context.type, context.username, context.hostname, context.currentPath]);
```

Replace the body of the inner `getTermPrompt` (around line 134) with the same call:
```ts
    const getTermPrompt = () => {
      const vfs = shellRef.current?.getVfs();
      return buildPrompt({
        type: context.type,
        username: context.username,
        hostname: context.hostname,
        path: vfs?.getCurrentPath() || context.currentPath,
        home: vfs?.getEnv('HOME'),
      });
    };
```

**Step 6: Root's home is `/root`, not `/home/root`**

In `client/src/engine/shell/VirtualFilesystem.ts`, `createLinuxFilesystem` (~line 637), change:
```ts
    home: `/home/${user}`,
```
to:
```ts
    home: user === 'root' ? '/root' : `/home/${user}`,
```
Then a few lines below, keep `vfs.addDirectory(`/home/${user}`)` but make it conditional so no bogus `/home/root` exists:
```ts
  if (user !== 'root') {
    vfs.addDirectory(`/home/${user}`);
    vfs.addDirectory(`/home/${user}/Documents`);
    vfs.addDirectory(`/home/${user}/.ssh`);
  } else {
    vfs.addDirectory('/root/.ssh');
  }
```
(Adjust to the actual lines — there are three `/home/${user}` addDirectory calls at ~649-651.)

**Step 7: Run the whole shell + terminal test suites**

Run: `npm run test:client -- src/engine/shell src/components/Terminal`
Expected: PASS. If any existing test asserted `/home/root` or a `$`-prompt for root, update it to the new authentic behavior.

**Step 8: Commit**

```bash
git add client/src/components/Terminal/prompt.ts client/src/components/Terminal/prompt.test.ts client/src/components/Terminal/useTerminal.ts client/src/engine/shell/VirtualFilesystem.ts
git commit -m "feat(terminal): authentic bash prompt — ~ for home, # for root"
```

---

### Task 2: Real `ls` columns (ANSI-aware grid layout)

**Files:**
- Create: `client/src/engine/shell/gridLayout.ts`
- Test: `client/src/engine/shell/gridLayout.test.ts`
- Modify: `client/src/engine/shell/types.ts` (add `termCols` to `ExecutionContext`)
- Modify: `client/src/engine/shell/ShellEngine.ts` (store + expose `termCols`)
- Modify: `client/src/engine/shell/commands/linux/navigation.ts` (ls grid branch)
- Modify: `client/src/components/Terminal/useTerminal.ts` (feed `term.cols`, reuse for completion grid)

**Step 1: Write the failing test**

`client/src/engine/shell/gridLayout.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { formatGrid } from './gridLayout';

describe('formatGrid', () => {
  it('lays items into width-fitted columns, filling top-to-bottom like GNU ls', () => {
    // colW = 5+2 = 7 → 3 cols at width 21 → 2 rows, vertical fill
    const lines = formatGrid(['aaaaa', 'b', 'cc', 'ddd', 'e'], 21);
    expect(lines).toEqual([
      'aaaaa  cc     e',
      'b      ddd',
    ]);
  });

  it('falls back to one column when the terminal is narrower than the widest item', () => {
    expect(formatGrid(['file-with-a-long-name.log', 'a'], 10))
      .toEqual(['file-with-a-long-name.log', 'a']);
  });

  it('pads by visible length, ignoring ANSI color codes', () => {
    const blue = '\x1b[34m\x1b[1mdir\x1b[0m';
    const lines = formatGrid([blue, 'file1', 'file2'], 80);
    // one row; the colored entry still gets exactly (maxLen+2 - 3) spaces after it
    expect(lines).toHaveLength(1);
    expect(lines[0].replace(/\x1b\[[0-9;]*m/g, '')).toBe('dir    file1  file2');
  });

  it('returns [] for no items', () => {
    expect(formatGrid([], 80)).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:client -- src/engine/shell/gridLayout.test.ts`
Expected: FAIL — module not found.

**Step 3: Write minimal implementation**

`client/src/engine/shell/gridLayout.ts`:

```ts
// client/src/engine/shell/gridLayout.ts
// GNU-ls-style grid: uniform column width, fill top-to-bottom then left-to-
// right. Width math uses the *visible* length so colored entries align.

const ANSI_RE = /\x1b\[[0-9;]*m/g;

export function visibleLength(s: string): number {
  return s.replace(ANSI_RE, '').length;
}

export function formatGrid(items: string[], width: number = 80): string[] {
  if (items.length === 0) return [];

  const colWidth = Math.max(...items.map(visibleLength)) + 2;
  const cols = Math.max(1, Math.floor(width / colWidth));
  const rows = Math.ceil(items.length / cols);

  const lines: string[] = [];
  for (let row = 0; row < rows; row++) {
    let line = '';
    for (let col = 0; col < cols; col++) {
      const index = col * rows + row;
      if (index >= items.length) break;
      const item = items[index];
      line += item + ' '.repeat(colWidth - visibleLength(item));
    }
    lines.push(line.replace(/\s+$/, ''));
  }
  return lines;
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:client -- src/engine/shell/gridLayout.test.ts`
Expected: PASS (4 tests).

**Step 5: Thread terminal width into the execution context**

`client/src/engine/shell/types.ts` — inside `ExecutionContext` (after `isTty`):
```ts
  /** Terminal width in columns (for grid layouts); 80 when unknown. */
  termCols?: number;
```

`client/src/engine/shell/ShellEngine.ts`:
- Add a field near the other private state: `private termCols = 80;`
- Add a setter (near `getVfs`/public API):
```ts
  setTermCols(cols: number): void {
    if (cols > 0) this.termCols = cols;
  }
```
- In `executeCommand`, add to the `ctx` literal (line ~255): `termCols: this.termCols,`

**Step 6: Use it in ls's grid branch**

`client/src/engine/shell/commands/linux/navigation.ts` — import `formatGrid` from `../../gridLayout`. Replace the two grid branches (main listing ~line 152-156 and the recursive one ~line 176):

```ts
      } else {
        // Grid format — width-fitted columns like real ls
        const names = entries.map(e => colorizeEntry(e, colorize));
        outputs.push(...formatGrid(names, ctx.termCols ?? 80));
      }
```
(and equivalently for `subEntries` in the recursive branch).

**Step 7: Feed real width from xterm**

`client/src/components/Terminal/useTerminal.ts`, in the init effect after `fitAddon.fit();`:
```ts
    shellRef.current?.setTermCols(term.cols);
```
and in `handleResize`:
```ts
    const handleResize = () => {
      fitAddon.fit();
      shellRef.current?.setTermCols(term.cols);
    };
```
Also reuse the shared layout in `printCompletionList` (~line 642): replace the manual `maxLen/colW/cols` loop with:
```ts
            const printCompletionList = (comps: Completion[]) => {
              const items = comps.map(c => c.display || c.value);
              term.writeln('');
              for (const row of formatGrid(items, term.cols || 80)) {
                term.writeln('\x1b[36m' + row + '\x1b[0m');
              }
              term.write(prompt + line);
              if (cursorPos < line.length) {
                term.write('\x1b[' + (prompt.length + cursorPos + 1) + 'G');
              }
            };
```
Import `formatGrid` in useTerminal from `../../engine/shell` (add `export * from './gridLayout';` to `client/src/engine/shell/index.ts`).

**Step 8: Run shell + terminal suites**

Run: `npm run test:client -- src/engine/shell src/components/Terminal`
Expected: PASS. `ShellEngine.test.ts` may assert old `join('  ')` grid output for ls — update those assertions to the new column output (or to `ls -1` where layout is irrelevant).

**Step 9: Commit**

```bash
git add client/src/engine/shell/gridLayout.ts client/src/engine/shell/gridLayout.test.ts client/src/engine/shell/types.ts client/src/engine/shell/ShellEngine.ts client/src/engine/shell/commands/linux/navigation.ts client/src/engine/shell/index.ts client/src/components/Terminal/useTerminal.ts
git commit -m "feat(shell): GNU-style ls column grid, ANSI-aware, sized to terminal width"
```

---

### Task 3: currentPath sanitizing + fix the 8 content typos

**Files:**
- Modify: `client/src/engine/shell/index.ts` (`createShellFromContext`)
- Test: extend `client/src/engine/shell/ShellEngine.test.ts` (or a new `createShell.test.ts`)
- Modify (content typos, exact locations):
  - `client/src/content/events/week2-4.ts:159` — `'~$'` → `'~'`
  - `client/src/content/events/week2-4.ts:373` — `'/backup$'` → `'/backup'`
  - `client/src/content/events/week2-4.ts:789` — `'C:\\>'` → `'C:\\'`
  - `client/src/content/events/week1.ts:122` — `'C:\\>'` → `'C:\\'`
  - `client/src/content/events/week5-8.ts:1286` — `'C:\\>'` → `'C:\\'`
  - `client/src/content/events/chains/colleague-chain.ts:76` — `'/opt/baramundi$'` → `'/opt/baramundi'`
  - `client/src/content/packs/amse-it/scenarios.ts:50` — `'C:\\Users\\admin.mueller>'` → `'C:\\Users\\admin.mueller'`
  - `client/src/content/packs/amse-it/scenarios.ts:437` — same fix

**Step 1: Write the failing test**

Add to `client/src/engine/shell/ShellEngine.test.ts` (new describe at the end):

```ts
import { createShellFromContext } from './index';

describe('createShellFromContext currentPath sanitizing', () => {
  it('strips a trailing prompt char from linux paths', () => {
    const shell = createShellFromContext({
      type: 'linux', hostname: 'h', username: 'admin', currentPath: '/backup$',
    });
    expect(shell.getVfs().getCurrentPath()).toBe('/backup');
  });

  it('strips the > from C:\\> style paths', () => {
    const shell = createShellFromContext({
      type: 'windows', hostname: 'h', username: 'admin', currentPath: 'C:\\>',
    });
    expect(shell.getVfs().getCurrentPath()).toBe('C:\\');
  });

  it('resolves ~ to the home directory instead of creating a literal ~ dir', () => {
    const shell = createShellFromContext({
      type: 'linux', hostname: 'h', username: 'admin', currentPath: '~$',
    });
    expect(shell.getVfs().getCurrentPath()).toBe('/home/admin');
    expect(shell.getVfs().exists('/home/admin/~$')).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:client -- src/engine/shell/ShellEngine.test.ts`
Expected: FAIL — paths keep their `$`/`>` suffix.

**Step 3: Implement sanitizing**

In `client/src/engine/shell/index.ts`, `createShellFromContext`, replace the currentPath block:

```ts
  // Set the initial working directory. Content occasionally bakes a prompt
  // character into the path ('/backup$', 'C:\>'), which would otherwise
  // create a literal directory of that name — strip it defensively.
  const vfs = shell.getVfs();
  const startPath = (context.currentPath || '').trim().replace(/[$>\s]+$/, '');
  if (startPath) {
    vfs.addDirectory(startPath);
    vfs.setCurrentPath(startPath);
  }
```

Note: `'C:\\>'` → `'C:\\'` still ends with `\` — `addDirectory('C:\\')` and `setCurrentPath('C:\\')` must be no-op-safe (resolvePath already returns `C:\` for empty Windows parts; verify the mkdir of the drive root doesn't throw — if it does, guard with `if (!vfs.exists(resolved))` semantics by checking `vfs.exists(startPath)` first).

**Step 4: Run test to verify it passes**

Run: `npm run test:client -- src/engine/shell/ShellEngine.test.ts`
Expected: PASS.

**Step 5: Fix the 8 content values** (list above — mechanical edits).

**Step 6: Add a content guard so typos can't return**

Add to `client/src/content/content.test.ts`:

```ts
import { allEvents } from './events';
import { getAllScenarios as getScenarios } from './packs';

describe('Terminal context path hygiene', () => {
  const contexts = [
    ...allEvents.filter(e => e.terminalContext).map(e => ({ id: e.id, ctx: e.terminalContext! })),
    ...getScenarios().filter(s => s.terminalContext).map(s => ({ id: s.id, ctx: s.terminalContext! })),
  ];

  it('no currentPath ends with a prompt character', () => {
    const bad = contexts.filter(({ ctx }) => /[$>]\s*$/.test(ctx.currentPath) && ctx.currentPath !== 'C:\\');
    expect(bad.map(b => `${b.id}: ${b.ctx.currentPath}`)).toEqual([]);
  });
});
```
(Adapt imports to what content.test.ts already has — `allEvents` and `getAllScenarios` are already imported there.)

**Step 7: Run content + shell suites**

Run: `npm run test:client -- src/content/content.test.ts src/engine/shell/ShellEngine.test.ts`
Expected: PASS.

**Step 8: Commit**

```bash
git add client/src/engine/shell/index.ts client/src/engine/shell/ShellEngine.test.ts client/src/content
git commit -m "fix(terminal): sanitize currentPath prompt-char typos; guard in content tests"
```

---

### Task 4: Scenario seeder — path extraction & output parsing (pure functions)

**Files:**
- Create: `client/src/engine/shell/scenarioSeed.ts`
- Test: `client/src/engine/shell/scenarioSeed.test.ts`

This task builds the pure parsing layer; Task 5 applies it to a VFS.

**Step 1: Write the failing tests**

`client/src/engine/shell/scenarioSeed.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  stripCoachingComments,
  parseLsOutput,
  extractPathsFromPattern,
  extractPathsFromText,
  stubContent,
} from './scenarioSeed';

describe('stripCoachingComments', () => {
  it('removes a trailing blank-line + # block', () => {
    expect(stripCoachingComments('line1\nline2\n\n# Das ist der Miner!'))
      .toBe('line1\nline2');
  });

  it('keeps # lines inside real content (configs)', () => {
    const conf = '# main config\nPort 22\nPermitRootLogin no';
    expect(stripCoachingComments(conf)).toBe(conf);
  });
});

describe('parseLsOutput', () => {
  it('parses long-format lines (perms column decides dir vs file)', () => {
    const out = [
      'total 24',
      'drwxr-xr-x 2 root root 4096 Jan  5 10:00 archive',
      '-rw-r--r-- 1 root root  812 Jan  5 10:00 access.log',
    ].join('\n');
    expect(parseLsOutput(out)).toEqual([
      { name: 'archive', isDir: true },
      { name: 'access.log', isDir: false },
    ]);
  });

  it('parses grid output split on 2+ spaces; trailing slash means dir', () => {
    expect(parseLsOutput('access.log  error.log  backup/')).toEqual([
      { name: 'access.log', isDir: false },
      { name: 'error.log', isDir: false },
      { name: 'backup', isDir: true },
    ]);
  });

  it('skips comment/coaching lines and . / ..', () => {
    const out = 'drwxr-xr-x 2 r r 4096 Jan 5 10:00 .\n-rw-r--r-- 1 r r 10 Jan 5 10:00 x.log\n# schau dir x.log an!';
    expect(parseLsOutput(out)).toEqual([{ name: 'x.log', isDir: false }]);
  });

  it('parses PowerShell dir output (Mode column)', () => {
    const out = [
      '    Directory: C:\\Users\\admin',
      'Mode                 LastWriteTime         Length Name',
      '----                 -------------         ------ ----',
      'd-----         05.01.2026     10:00                logs',
      '-a----         05.01.2026     10:00           1024 report.txt',
    ].join('\n');
    expect(parseLsOutput(out)).toEqual([
      { name: 'logs', isDir: true },
      { name: 'report.txt', isDir: false },
    ]);
  });
});

describe('extractPathsFromPattern', () => {
  it('cat-like: seeds the positional arg as a file with the output as content', () => {
    expect(extractPathsFromPattern('cat /var/log/auth.log', 'out')).toEqual([
      { path: '/var/log/auth.log', kind: 'file', content: 'out' },
    ]);
  });

  it('cat in a pipeline seeds the file but NOT the transformed output as content', () => {
    expect(extractPathsFromPattern('cat access.log | grep 404', 'filtered')).toEqual([
      { path: 'access.log', kind: 'file' },
    ]);
  });

  it('sudo prefix is ignored', () => {
    expect(extractPathsFromPattern('sudo cat /etc/shadow', 'x')).toEqual([
      { path: '/etc/shadow', kind: 'file', content: 'x' },
    ]);
  });

  it('ls: emits a listing marker with the target dir', () => {
    expect(extractPathsFromPattern('ls -la /backup', 'total 0')).toEqual([
      { path: '/backup', kind: 'listing', output: 'total 0' },
    ]);
  });

  it('cd seeds a directory', () => {
    expect(extractPathsFromPattern('cd /tmp/.hidden', '')).toEqual([
      { path: '/tmp/.hidden', kind: 'dir' },
    ]);
  });

  it('grep: skips the regex arg, seeds the file arg', () => {
    expect(extractPathsFromPattern('grep "Failed password" /var/log/auth.log', 'x')).toEqual([
      { path: '/var/log/auth.log', kind: 'file' },
    ]);
  });

  it('non-path words are not seeded', () => {
    expect(extractPathsFromPattern('kill 6666', '')).toEqual([]);
    expect(extractPathsFromPattern('ps aux', '')).toEqual([{ path: '.', kind: 'none' }].filter(p => p.kind !== 'none'));
  });

  it('Get-Content works like cat', () => {
    expect(extractPathsFromPattern('Get-Content C:\\Logs\\backup.log', 'out')).toEqual([
      { path: 'C:\\Logs\\backup.log', kind: 'file', content: 'out' },
    ]);
  });
});

describe('extractPathsFromText', () => {
  it('finds absolute unix paths in hints/taskText', () => {
    expect(extractPathsFromText('Der Eindringling hat Spuren in /var/log/auth.log hinterlassen. Check /opt/scada!'))
      .toEqual([
        { path: '/var/log/auth.log', kind: 'file' },
        { path: '/opt/scada', kind: 'dir' },
      ]);
  });

  it('finds windows paths', () => {
    expect(extractPathsFromText('Schau in C:\\Users\\svc-backup\\AppData nach.'))
      .toEqual([{ path: 'C:\\Users\\svc-backup\\AppData', kind: 'dir' }]);
  });

  it('classifies dotted basenames as files, others as dirs; ignores URLs', () => {
    expect(extractPathsFromText('siehe https://x.de/foo und /etc/ssh/sshd_config'))
      .toEqual([{ path: '/etc/ssh/sshd_config', kind: 'dir' }]);
    expect(extractPathsFromText('lies /opt/notes.txt'))
      .toEqual([{ path: '/opt/notes.txt', kind: 'file' }]);
  });
});

describe('stubContent', () => {
  it('gives .log files plausible log lines', () => {
    expect(stubContent('access.log')).toMatch(/\d{2}:\d{2}/);
  });
  it('gives .sh files a shebang', () => {
    expect(stubContent('miner.sh')).toMatch(/^#!\/bin\/bash/);
  });
  it('gives .conf files a comment header', () => {
    expect(stubContent('app.conf')).toMatch(/^#/);
  });
  it('unknown extensions get a single generic line', () => {
    expect(stubContent('S7-1200_FW_4.6.2.upd').length).toBeGreaterThan(0);
  });
});
```

Note on the `ps aux` expectation: the cleanest contract is that non-path-bearing patterns return `[]` — write the test as `expect(extractPathsFromPattern('ps aux', '')).toEqual([])` (fix the placeholder line above to exactly that).

**Step 2: Run tests to verify they fail**

Run: `npm run test:client -- src/engine/shell/scenarioSeed.test.ts`
Expected: FAIL — module not found.

**Step 3: Implement the parsing layer**

`client/src/engine/shell/scenarioSeed.ts`:

```ts
// client/src/engine/shell/scenarioSeed.ts
// Materializes the paths a level *talks about* into the VFS so free
// exploration confirms the story instead of contradicting it. Canned
// scenario output stays authoritative for scripted commands; everything
// seeded here is a consistent superset underneath. Seeding never overwrites
// existing nodes, so base fs, templates and explicit overlays always win.

export interface SeedPath {
  path: string;
  kind: 'file' | 'dir' | 'listing';
  /** Verbatim file content (exact single-command cat only). */
  content?: string;
  /** Canned ls output to parse into directory entries (kind: 'listing'). */
  output?: string;
}

// Commands whose canned output IS the file content (single-stage only).
const CAT_COMMANDS = new Set(['cat', 'less', 'more', 'head', 'tail', 'type', 'get-content', 'gc']);
// Commands whose canned output is a directory listing.
const LS_COMMANDS = new Set(['ls', 'dir', 'get-childitem', 'gci']);
// Commands whose positional args are directories.
const DIR_ARG_COMMANDS = new Set(['cd', 'set-location', 'sl', 'pushd', 'tree', 'find', 'du']);
// Commands whose positional args include files (beyond the cat set).
const FILE_ARG_COMMANDS = new Set([
  'grep', 'egrep', 'zgrep', 'wc', 'sort', 'uniq', 'awk', 'sed', 'stat', 'file',
  'chmod', 'chown', 'rm', 'cp', 'mv', 'ln', 'tar', 'unzip', 'gzip', 'gunzip',
  'sha256sum', 'md5sum', 'openssl', 'select-string',
]);
// First positional is a pattern/expression, not a file.
const SKIP_FIRST_ARG = new Set(['grep', 'egrep', 'zgrep', 'awk', 'sed', 'select-string']);

const looksLikePath = (token: string): boolean =>
  token.includes('/') || /^[A-Za-z]:\\/.test(token) || /\.[A-Za-z0-9]{1,4}$/.test(token);

const isDirLike = (path: string): boolean => {
  const base = path.replace(/[/\\]+$/, '').split(/[/\\]/).pop() || '';
  return base.indexOf('.') <= 0; // 'logs' → dir, '.ssh' → dir, 'x.log' → file
};

const stripQuotes = (s: string): string => s.replace(/^['"]|['"]$/g, '');

export function stripCoachingComments(output: string): string {
  const lines = output.split('\n');
  let blank = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim() === '') { blank = i; break; }
    if (!lines[i].trimStart().startsWith('#')) return output;
  }
  if (blank === -1) return output;
  return lines.slice(0, blank).join('\n').replace(/\n+$/, '');
}

export function parseLsOutput(output: string): { name: string; isDir: boolean }[] {
  const entries: { name: string; isDir: boolean }[] = [];
  for (const raw of output.split('\n')) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;
    if (/^total\s+\d+/.test(line)) continue;
    if (line.trimStart().startsWith('#')) continue;
    if (/^\s*(Directory:|Mode\s|----)/.test(line)) continue;

    // Unix long format: perms, links, owner, group, size, date(3), name
    const unixLong = line.match(/^([dl-])[rwxsStT-]{9}[+.@]?\s+\S+\s+\S+\s+\S+\s+\S+\s+\S+\s+\S+\s+\S+\s+(.+)$/);
    if (unixLong) {
      const name = unixLong[2].split(' -> ')[0].trim();
      if (name === '.' || name === '..') continue;
      entries.push({ name, isDir: unixLong[1] === 'd' });
      continue;
    }

    // PowerShell table: Mode column then name at the end
    const psRow = line.match(/^([d-])[a-rhs-]{4,5}\s+\S+.*\s(\S+)$/);
    if (psRow && /^\d{2}[./]\d{2}[./]\d{4}/.test(line.slice(7).trimStart())) {
      entries.push({ name: psRow[2], isDir: psRow[1] === 'd' });
      continue;
    }

    // Grid: names split on 2+ spaces
    for (const token of line.split(/\s{2,}/)) {
      const t = token.trim();
      if (!t || t === '.' || t === '..') continue;
      if (t.endsWith('/')) entries.push({ name: t.slice(0, -1), isDir: true });
      else entries.push({ name: t, isDir: false });
    }
  }
  return entries;
}

export function extractPathsFromPattern(pattern: string, output: string): SeedPath[] {
  const stages = pattern.split('|').map(s => s.trim()).filter(Boolean);
  if (stages.length === 0) return [];
  const results: SeedPath[] = [];

  stages.forEach((stage, stageIndex) => {
    let tokens = stage.split(/\s+/);
    if (tokens[0] === 'sudo') tokens = tokens.slice(1);
    const cmd = (tokens[0] || '').toLowerCase();
    const positionals = tokens.slice(1)
      .filter(t => !t.startsWith('-'))
      .map(stripQuotes)
      // stop at redirects
      .filter(t => t !== '>' && t !== '>>' && t !== '<');

    if (CAT_COMMANDS.has(cmd)) {
      for (const p of positionals) {
        if (stages.length === 1 && stageIndex === 0) {
          results.push({ path: p, kind: 'file', content: stripCoachingComments(output) });
        } else {
          results.push({ path: p, kind: 'file' });
        }
      }
    } else if (LS_COMMANDS.has(cmd)) {
      // Listing only meaningful for the first stage (its canned output).
      if (stageIndex === 0) {
        results.push({ path: positionals[0] || '.', kind: 'listing', output });
      } else if (positionals[0]) {
        results.push({ path: positionals[0], kind: 'dir' });
      }
    } else if (DIR_ARG_COMMANDS.has(cmd)) {
      for (const p of positionals) {
        if (p !== '-' && p !== '~') results.push({ path: p, kind: 'dir' });
      }
    } else if (FILE_ARG_COMMANDS.has(cmd)) {
      const args = SKIP_FIRST_ARG.has(cmd) ? positionals.slice(1) : positionals;
      for (const p of args) {
        if (looksLikePath(p)) results.push({ path: p, kind: isDirLike(p) ? 'dir' : 'file' });
      }
    }
  });

  return results;
}

const UNIX_PATH_RE = /(?<![\w:/])\/(?:[\w.\-+]+\/)*[\w.\-+]+\/?/g;
const WIN_PATH_RE = /[A-Za-z]:\\(?:[\w.\-+ ]+\\)*[\w.\-+]+/g;

export function extractPathsFromText(text: string): SeedPath[] {
  const results: SeedPath[] = [];
  const seen = new Set<string>();
  const push = (path: string) => {
    const clean = path.replace(/[.,;:!?)]+$/, '').replace(/\/+$/, '');
    if (clean.length < 2 || seen.has(clean)) return;
    seen.add(clean);
    results.push({ path: clean, kind: isDirLike(clean) ? 'dir' : 'file' });
  };
  for (const m of text.match(UNIX_PATH_RE) || []) {
    // skip URL remainders (the regex lookbehind already excludes '://', belt & braces)
    if (text.includes('//' + m) || text.includes(':' + m)) continue;
    push(m);
  }
  for (const m of text.match(WIN_PATH_RE) || []) push(m);
  return results;
}

export function stubContent(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('.log')) {
    return [
      'Jan  5 08:12:01 srv systemd[1]: Started Session 12 of user admin.',
      'Jan  5 08:15:33 srv CRON[812]: (root) CMD (run-parts /etc/cron.hourly)',
      'Jan  5 08:17:09 srv systemd[1]: Reached target Timers.',
      '',
    ].join('\n');
  }
  if (/\.(conf|cfg|ini|cnf)$/.test(lower)) return `# ${name}\n# Konfigurationsdatei\n`;
  if (lower.endsWith('.sh')) return `#!/bin/bash\n# ${name}\n`;
  if (/\.(txt|md)$/.test(lower)) return `${name}\n`;
  return `[${name}]\n`;
}
```

**Iterate on the regexes until Step 1's tests pass exactly** — the tests are the contract; adjust implementation, not tests (except the noted `ps aux` line). The unix-long-format regex above expects 8 whitespace-separated fields before the name (perms links owner group size month day time); verify against the test fixtures and real content examples (learning-path.ts:2490, kritis scenarios.ts:112).

**Step 4: Run tests until they pass**

Run: `npm run test:client -- src/engine/shell/scenarioSeed.test.ts`
Expected: PASS (all describes).

**Step 5: Commit**

```bash
git add client/src/engine/shell/scenarioSeed.ts client/src/engine/shell/scenarioSeed.test.ts
git commit -m "feat(shell): scenario seed parsing — canned cat/ls/paths → seedable entries"
```

---

### Task 5: Apply seeds to the VFS + wire into shell creation

**Files:**
- Modify: `client/src/engine/shell/scenarioSeed.ts` (add `seedVfsFromScenario`)
- Modify: `client/src/engine/shell/index.ts` (`createShellFromContext` signature + call)
- Modify: `client/src/components/Terminal/useTerminal.ts` (pass commands/hints/taskText)
- Test: extend `client/src/engine/shell/scenarioSeed.test.ts`

**Step 1: Write the failing tests**

Append to `scenarioSeed.test.ts`:

```ts
import { seedVfsFromScenario } from './scenarioSeed';
import { createShellFromContext } from './index';

describe('seedVfsFromScenario (via createShellFromContext)', () => {
  const base = { type: 'linux' as const, hostname: 'srv', username: 'admin' };

  it('a canned cat makes the file really exist with the canned content', () => {
    const shell = createShellFromContext({
      ...base, currentPath: '/var/log',
      commands: [{ pattern: 'cat /var/log/tickets/t-1001.txt', output: 'Ticket 1001\nDrucker brennt' }],
    });
    expect(shell.execute('cat /var/log/tickets/t-1001.txt').output).toBe('Ticket 1001\nDrucker brennt');
    // parent dir materialized too — cd works
    expect(shell.execute('cd /var/log/tickets').exitCode).toBe(0);
  });

  it('a canned ls materializes the advertised entries in the target dir', () => {
    const shell = createShellFromContext({
      ...base, currentPath: '/backup',
      commands: [{
        pattern: 'ls -la /backup',
        output: 'total 8\ndrwxr-xr-x 2 root root 4096 Jan  5 10:00 daily\n-rw-r--r-- 1 root root  812 Jan  5 10:00 backup_dc01.tar.gz',
      }],
    });
    const vfs = shell.getVfs();
    expect(vfs.exists('/backup/daily')).toBe(true);
    expect(vfs.isFile('/backup/backup_dc01.tar.gz')).toBe(true);
  });

  it('a relative canned ls resolves against currentPath', () => {
    const shell = createShellFromContext({
      ...base, currentPath: '/home/azubi/logs',
      commands: [{ pattern: 'ls', output: 'access.log  error.log  system.log' }],
    });
    expect(shell.getVfs().isFile('/home/azubi/logs/access.log')).toBe(true);
    expect(shell.execute('cat error.log').exitCode).toBe(0);
  });

  it('never overwrites existing files (overlay wins over seed)', () => {
    const shell = createShellFromContext({
      ...base, currentPath: '/opt',
      vfsOverlay: { files: [{ path: '/opt/real.txt', content: 'HAND AUTHORED' }] },
      commands: [{ pattern: 'cat /opt/real.txt', output: 'CANNED' }],
    });
    expect(shell.execute('cat /opt/real.txt').output).toBe('HAND AUTHORED');
  });

  it('paths mentioned in hints and taskText exist', () => {
    const shell = createShellFromContext({
      ...base, currentPath: '/home/admin',
      taskText: 'Der Eindringling hat Spuren in /var/log/intrusion.log hinterlassen.',
      hints: ['Schau mal unter /opt/scada/logs nach.'],
      commands: [],
    });
    expect(shell.getVfs().isFile('/var/log/intrusion.log')).toBe(true);
    expect(shell.execute('cd /opt/scada/logs').exitCode).toBe(0);
  });

  it('ls-seeded files without canned cat get non-empty stub content', () => {
    const shell = createShellFromContext({
      ...base, currentPath: '/backup',
      commands: [{ pattern: 'ls /backup', output: 'notes.log' }],
    });
    const out = shell.execute('cat /backup/notes.log').output;
    expect(out.length).toBeGreaterThan(0);
  });

  it('windows contexts seed Get-Content paths', () => {
    const shell = createShellFromContext({
      type: 'windows', hostname: 'dc01', username: 'admin', currentPath: 'C:\\Users\\admin',
      commands: [{ pattern: 'Get-Content C:\\Logs\\backup.log', output: 'Backup OK' }],
    });
    expect(shell.getVfs().isFile('C:\\Logs\\backup.log')).toBe(true);
  });
});
```

(If `createShellFromContext`'s param type needs `commands?/hints?/taskText?` added first for TS to compile, that's fine — the test drives the signature.)

**Step 2: Run tests to verify they fail**

Run: `npm run test:client -- src/engine/shell/scenarioSeed.test.ts`
Expected: FAIL (missing export / signature).

**Step 3: Implement `seedVfsFromScenario`**

Append to `scenarioSeed.ts`:

```ts
import type { VirtualFilesystem } from './VirtualFilesystem';

export interface ScenarioSeedInput {
  commands?: { pattern: string; output: string }[];
  hints?: string[];
  taskText?: string;
}

export function seedVfsFromScenario(vfs: VirtualFilesystem, input: ScenarioSeedInput): void {
  const seeds: SeedPath[] = [];
  for (const cmd of input.commands || []) {
    seeds.push(...extractPathsFromPattern(cmd.pattern, cmd.output));
  }
  const textSources = [...(input.hints || []), input.taskText || ''];
  for (const text of textSources) {
    seeds.push(...extractPathsFromText(text));
  }

  // Two passes: content-bearing cat seeds first so they win over stub seeds
  // from ls listings / bare path mentions. Nothing ever overwrites an
  // existing node (templates/overlays/base fs stay authoritative).
  const ensureFile = (path: string, content?: string) => {
    const resolved = vfs.resolvePath(path);
    if (vfs.exists(resolved)) return;
    const name = resolved.split(/[/\\]/).pop() || '';
    vfs.addFile(resolved, content ?? stubContent(name));
  };
  const ensureDir = (path: string) => {
    const resolved = vfs.resolvePath(path);
    if (vfs.exists(resolved)) return;
    vfs.addDirectory(resolved);
  };

  for (const seed of seeds) {
    if (seed.kind === 'file' && seed.content !== undefined) ensureFile(seed.path, seed.content);
  }
  for (const seed of seeds) {
    if (seed.kind === 'file' && seed.content === undefined) ensureFile(seed.path);
    else if (seed.kind === 'dir') ensureDir(seed.path);
    else if (seed.kind === 'listing' && seed.output) {
      ensureDir(seed.path);
      const dir = vfs.resolvePath(seed.path);
      const sep = dir.includes('\\') ? '\\' : '/';
      for (const entry of parseLsOutput(seed.output)) {
        const full = dir.replace(/[/\\]$/, '') + sep + entry.name;
        if (entry.isDir) ensureDir(full);
        else ensureFile(full);
      }
    }
  }
}
```

**Step 4: Wire into `createShellFromContext`**

`client/src/engine/shell/index.ts` — extend the context param type and call the seeder AFTER currentPath is set (so relative listings resolve against the level's start dir) but note seeding must not overwrite anything created by templates/overlay (guaranteed by the exists-checks):

```ts
import { seedVfsFromScenario } from './scenarioSeed';

export function createShellFromContext(context: {
  type: 'linux' | 'windows';
  hostname: string;
  username: string;
  currentPath: string;
  vfsOverlay?: { files?: { path: string; content: string }[]; directories?: string[] };
  env?: Record<string, string>;
  templates?: VFSTemplate[];
  /** Canned scenario commands — used to auto-seed the VFS so quest paths exist. */
  commands?: { pattern: string; output: string }[];
  hints?: string[];
  taskText?: string;
}): ShellEngine {
  // ... existing createShell + sanitized currentPath block from Task 3 ...

  // Materialize every path the scenario talks about (canned cat/ls outputs,
  // hint/task mentions) so free exploration matches the story.
  seedVfsFromScenario(vfs, {
    commands: context.commands,
    hints: context.hints,
    taskText: context.taskText,
  });

  return shell;
}
```

Also add `export * from './scenarioSeed';` to the exports at the top of `index.ts`.

**Step 5: Pass the data from useTerminal**

`client/src/components/Terminal/useTerminal.ts`, in the `useMemo` (~line 33):

```ts
    return createShellFromContext({
      type: context.type,
      hostname: context.hostname,
      username: context.username,
      currentPath: context.currentPath,
      vfsOverlay: context.vfsOverlay,
      env: context.env,
      templates,
      commands: context.commands,
      hints: context.hints,
      taskText: context.taskText,
    });
  }, [context]);
```
(Collapsing the dep array to `[context]` is safe — the effect that owns the terminal already depends on `context` as a whole.)

**Step 6: Run the full shell + terminal suites**

Run: `npm run test:client -- src/engine/shell src/components/Terminal`
Expected: PASS. Watch for existing tests that assert "No such file" for paths that now get seeded — those tests should be updated only if they were asserting the *bug* (e.g. exploration dead-ends); keep tests that assert genuinely-nonexistent paths error correctly (use a path no scenario mentions).

**Step 7: Commit**

```bash
git add client/src/engine/shell/scenarioSeed.ts client/src/engine/shell/scenarioSeed.test.ts client/src/engine/shell/index.ts client/src/components/Terminal/useTerminal.ts
git commit -m "feat(shell): auto-seed VFS from scenario commands, hints and task text"
```

---

### Task 6: Drop fake exit-code lines

**Files:**
- Modify: `client/src/components/Terminal/useTerminal.ts` (~lines 424-426 and ~453)
- Check: `client/src/components/Terminal/Terminal.partialFeedback.browser.test.tsx` (may assert the removed line)

**Step 1: Remove the solution exit-code line**

In the `cmd.isSolution` branch, delete:
```ts
                    // Show realistic exit code
                    term.writeln('\x1b[90m[Process completed with exit code 0]\x1b[0m');
                    term.writeln('');
```
(keep the surrounding blank-line `term.writeln('')` so the banner still has breathing room — end state: output, blank line, success banner).

**Step 2: Remove the partial-solution exit-code line**

In the `cmd.isPartialSolution` branch, delete:
```ts
                  term.writeln('\x1b[33m[Exit code 1 - Teilweise erfolgreich]\x1b[0m');
```
(The yellow partial-feedback panel below the terminal already communicates this.)

**Step 3: Run terminal tests**

Run: `npm run test:client -- src/components/Terminal`
Expected: PASS. If `Terminal.partialFeedback.browser.test.tsx` or `Terminal.taskPanel.browser.test.tsx` assert the removed strings, update them (browser tests may need `npm run test:e2e` or the vitest browser runner — check how they're executed; if they don't run under `test:client`, run the repo's standard `npm test`).

**Step 4: Commit**

```bash
git add client/src/components/Terminal/useTerminal.ts client/src/components/Terminal/Terminal.partialFeedback.browser.test.tsx
git commit -m "feat(terminal): drop fake exit-code lines — real shells don't print those"
```

---

### Task 7: Content-wide guard test (all 49 contexts stay consistent)

**Files:**
- Create: `client/src/content/terminal-contexts.test.ts`

**Step 1: Write the test** (it should PASS immediately if Tasks 3-5 are correct — any failure it reports is a real content/seeder gap to fix before committing):

```ts
/**
 * Terminal context consistency guard.
 * Builds the real (seeded) shell for EVERY terminal context in the game and
 * asserts the quest's world is actually there: start dir exists, prompts are
 * clean, and every path mentioned in commands/hints/taskText exists in the
 * VFS. New levels are covered automatically.
 */
import { describe, it, expect } from 'vitest';
import { allEvents } from './events';
import { getAllScenarios } from './packs';
import {
  createShellFromContext,
  resolveTemplateIds,
  extractPathsFromPattern,
  extractPathsFromText,
} from '../engine/shell';
import type { TerminalContext } from '@kritis/shared';

const contexts: { id: string; ctx: TerminalContext }[] = [
  ...allEvents
    .filter(e => e.terminalContext)
    .map(e => ({ id: e.id, ctx: e.terminalContext! })),
  ...getAllScenarios()
    .filter(s => s.terminalContext)
    .map(s => ({ id: s.id, ctx: s.terminalContext! })),
];

function buildShell(ctx: TerminalContext) {
  return createShellFromContext({
    type: ctx.type,
    hostname: ctx.hostname,
    username: ctx.username,
    currentPath: ctx.currentPath,
    vfsOverlay: ctx.vfsOverlay,
    env: ctx.env,
    templates: ctx.templateIds ? resolveTemplateIds(ctx.templateIds) : undefined,
    commands: ctx.commands,
    hints: ctx.hints,
    taskText: ctx.taskText,
  });
}

describe(`terminal contexts (${contexts.length} total)`, () => {
  it('found a plausible number of contexts', () => {
    expect(contexts.length).toBeGreaterThanOrEqual(45);
  });

  it.each(contexts.map(c => [c.id, c] as const))('%s: world matches the quest', (_id, { ctx }) => {
    const shell = buildShell(ctx);
    const vfs = shell.getVfs();

    // Start dir exists and prompt path carries no baked-in prompt chars
    expect(vfs.getCurrentPath()).not.toMatch(/[$>]$|~\$/);
    expect(vfs.exists(vfs.getCurrentPath())).toBe(true);

    // Every extractable path from canned commands exists
    for (const cmd of ctx.commands) {
      for (const seed of extractPathsFromPattern(cmd.pattern, cmd.output)) {
        if (seed.kind === 'listing') continue; // listing target checked via dir below
        const resolved = vfs.resolvePath(seed.path);
        expect(vfs.exists(resolved), `${_id}: missing ${seed.kind} ${seed.path}`).toBe(true);
      }
    }

    // Every path mentioned in hints/taskText exists
    for (const text of [...ctx.hints, ctx.taskText || '']) {
      for (const seed of extractPathsFromText(text)) {
        const resolved = vfs.resolvePath(seed.path);
        expect(vfs.exists(resolved), `${_id}: hint/task path missing ${seed.path}`).toBe(true);
      }
    }
  });
});
```

Note: `vfs.getCurrentPath()` for Windows contexts sanitized from `'C:\\>'` is `'C:\\'` — make sure the prompt-char regex doesn't false-positive on the trailing backslash (it doesn't: `[$>]$` only matches `$`/`>`).

**Step 2: Run it**

Run: `npm run test:client -- src/content/terminal-contexts.test.ts`
Expected: PASS for all contexts. **If specific contexts fail**, the failure message names the level and the missing path — fix by improving the seeder heuristics (preferred, in `scenarioSeed.ts` with a unit test reproducing the pattern) or, for genuinely odd one-offs, adding an explicit `vfsOverlay` entry to that level. Do NOT weaken the test.

Likely trouble spots from the audit (verify these pass): learn_10 (`/var/log` + `access.log` from taskText), kritis SC-001 (`operations.log` relative to `/opt/scada/logs`), SC-008 (`cd netzwerk` relative dirs from canned ls), blackout C2 (`kern.log`, `nginx/`), tutorials (`~/logs` files), week5-8 `/backup` tarballs, colleague-chain fictional `bms` tool (no seedable paths — fine).

**Step 3: Full test suite**

Run: `npm test`
Expected: PASS (shared build + all vitest suites).

**Step 4: Commit**

```bash
git add client/src/content/terminal-contexts.test.ts
git commit -m "test(content): guard — every quest-referenced path exists in the seeded VFS"
```

---

### Task 8: End-to-end verification in the running game

**Step 1:** Use the @verify skill (or `npm run dev` manually) and drive one affected level, e.g. the learning-path forensics lesson (`learn_03`, start dir `/home/azubi/logs`):
- Prompt shows `azubi@…:~/logs$` (tilde, not `/home/azubi/logs`).
- `ls` shows aligned columns including `access.log error.log system.log` (colored dirs).
- `cat access.log` prints content (stub or canned) — **no** "No such file or directory".
- `cd /var/log && ls` works; solving a level shows the banner **without** `[Process completed with exit code 0]`.
- A root-user level (e.g. learn_06, `warm-srv-01`) shows `root@warm-srv-01:~#`.

**Step 2:** Fix anything observed, re-run `npm test`, commit fixes.

---

## Execution notes

- Tasks 1-3 are independent of 4-5; 5 depends on 4 and 3 (sanitizing lives in the same function); 7 depends on 3+4+5; 6 is independent.
- Commit after every task; never batch tasks into one commit.
- If an existing test breaks, decide: was it asserting the old *bug* (update it) or real behavior (your change is wrong — fix the change).
