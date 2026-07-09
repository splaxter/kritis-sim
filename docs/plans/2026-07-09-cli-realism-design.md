# CLI Realism: Auto-Seeded VFS + Shell Polish

**Date:** 2026-07-09
**Status:** Approved

## Problem

Audit of all 49 terminal contexts across the content files found that ~40 reference
paths that do not exist in the virtual filesystem:

- Only 4 levels (learn_01–04) back their story with real files via `vfsOverlay`;
  10 use `templateIds` (often incompletely); **35 rely purely on canned scenario
  output** with nothing in the VFS.
- Canned `ls` outputs advertise files (`access.log`, `S7-1200_FW_4.6.2.upd`, …)
  that `cat`/`cd` cannot reach — "No such file or directory" unless the player
  types an exactly scripted command. All Windows/PowerShell levels are 100% canned.
- 8 `currentPath` values bake prompt characters into the path (`'~$'`,
  `'/backup$'`, `'/opt/baramundi$'`, `'C:\>'`, `'C:\Users\admin.mueller>'`),
  creating literal `~$` directories and double-`$` prompts.
- Template mismatches: e.g. SC-001 starts in `/opt/scada/logs` (empty per the
  scada template) while its hints point there; the real `operations.log` lives
  in `/var/log/scada`.
- Prompt shows `/home/azubi` instead of `~`, root gets `$` instead of `#`;
  grid `ls` is unaligned; a fake `[Process completed with exit code 0]` line
  prints after solutions.

## Decision

Fix the missing-paths class in the **engine** (auto-seed the VFS from each
level's scenario definition) rather than hand-authoring overlays for ~40 levels.
All levels improve at once and future levels get it for free. Plus four polish
items: prompt `~`/`#`, currentPath typo fixes, real ls columns, drop the fake
exit-code line.

## Design

### 1. Auto-seed module (`client/src/engine/shell/scenarioSeed.ts`)

`seedVfsFromScenario(vfs, commands, hints, taskText)` runs at shell creation:

- **`cat`-style patterns** (`cat`, `type`, `Get-Content`, `less`, `head`,
  `tail`): create the file at that path; content = canned output with a trailing
  coaching-comment block (blank line followed by `# …` lines at the end)
  stripped. Free exploration (`head`, `grep`) then sees the same content the
  scripted `cat` shows.
- **Canned `ls`/`dir`/`Get-ChildItem` outputs**: parse the output — long-format
  lines via the permissions column (`drwx…` → directory), grids via 2+-space
  splitting, trailing `/` → directory; skip `total`/`#` lines — and create the
  listed entries in the target directory (positional arg of the pattern, else
  the level's `currentPath`).
- **Path arguments in other patterns** (`cd`, `grep … <file>`, `tar`, `rm`, …)
  and **absolute paths in hints/taskText** (`/var/log/tickets`, `C:\Users\…`):
  ensure they exist — directory if the last segment has no extension, file
  otherwise.
- **Stub contents**: files seeded without a canned `cat` get a small plausible
  stub by extension (`.log` → a few timestamped lines, `.conf` → commented
  config header, `.sh` → shebang + comment) so cat-ing them never prints
  nothing.
- **Precedence — seeding never overwrites**: base FS → templates → auto-seed
  (skips anything that already exists) → explicit `vfsOverlay` (always wins).
  learn_01–04's hand-built files stay untouched.

### 2. Wiring

`createShellFromContext` gains optional `commands`, `hints`, `taskText`
(useTerminal already holds the full `TerminalContext`). `currentPath` is
sanitized defensively (strip trailing `$`, `>`, whitespace), and the 8 content
typos are fixed at the source.

### 3. Prompt realism

One shared prompt function (currently duplicated in `useTerminal.ts`). Linux:
home collapses to `~` (`azubi@host:~/logs$`), root gets `#`. PowerShell prompt
unchanged.

### 4. Real `ls` columns

Grid output fills top-to-bottom into width-fitted columns like GNU ls, padded by
*visible* length (ANSI-stripped — colored names would break `padEnd`). Terminal
width flows in via a `termCols` field on `ShellEngine` that `useTerminal`
updates on fit/resize; default 80. The tab-completion grid in `useTerminal`
reuses the same layout helper.

### 5. Drop fake exit-code lines

Remove `[Process completed with exit code 0]` after solutions and the
`[Exit code 1 - Teilweise erfolgreich]` line for partial solutions (the
partial-feedback panel remains). Success banner stays.

### 6. Guard tests

- Unit tests for the seeder (ls-long/grid parsing, cat seeding, PS paths,
  no-overwrite rule) and the column layout helper.
- Content-wide integration test: for **all 49 contexts**, build the seeded
  shell and assert (a) the start dir exists, (b) the prompt contains no `$$` /
  `>>` artifacts, (c) every absolute path referenced in hints/taskText/
  cat-patterns exists in the VFS. Locks future levels into consistency.

## Accepted limits

Canned outputs stay authoritative when the player types the exact scripted
command; the real VFS becomes a consistent superset, so off-script exploration
confirms the story instead of contradicting it. Auto-generated contents are
plausible, not curated — flagship levels can still add hand overlays later.
