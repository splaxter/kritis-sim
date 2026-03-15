# Terminal CLI Emulation Specification

## Overview

This specification defines a comprehensive terminal/CLI emulator for KRITIS Admin Simulator that provides realistic Linux Bash and Windows PowerShell experiences with full command implementations, virtual filesystem, and advanced features like tab completion.

---

## Table of Contents

1. [Architecture](#1-architecture)
2. [Virtual Filesystem](#2-virtual-filesystem)
3. [Command Implementations](#3-command-implementations)
4. [Tab Completion](#4-tab-completion)
5. [Shell Features](#5-shell-features)
6. [Input Handling](#6-input-handling)
7. [Type Definitions](#7-type-definitions)
8. [Integration Points](#8-integration-points)
9. [Future: Zsh Support](#9-future-zsh-support)
10. [Implementation Phases](#10-implementation-phases)

---

## 1. Architecture

### 1.1 System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Terminal Component                        │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    xterm.js Display                      ││
│  └─────────────────────────────────────────────────────────┘│
│                            ▲                                 │
│                            │                                 │
│  ┌─────────────────────────┴───────────────────────────────┐│
│  │                  useTerminal Hook                        ││
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  ││
│  │  │ Input       │  │ Command      │  │ Output         │  ││
│  │  │ Handler     │  │ Executor     │  │ Formatter      │  ││
│  │  └─────────────┘  └──────────────┘  └────────────────┘  ││
│  └─────────────────────────────────────────────────────────┘│
│                            ▲                                 │
│                            │                                 │
│  ┌─────────────────────────┴───────────────────────────────┐│
│  │                   Shell Engine                           ││
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  ││
│  │  │ Command     │  │ Tab          │  │ History        │  ││
│  │  │ Registry    │  │ Completer    │  │ Manager        │  ││
│  │  └─────────────┘  └──────────────┘  └────────────────┘  ││
│  └─────────────────────────────────────────────────────────┘│
│                            ▲                                 │
│                            │                                 │
│  ┌─────────────────────────┴───────────────────────────────┐│
│  │                Virtual Filesystem                        ││
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  ││
│  │  │ VFS State   │  │ Path         │  │ Permissions    │  ││
│  │  │             │  │ Resolver     │  │ System         │  ││
│  │  └─────────────┘  └──────────────┘  └────────────────┘  ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Core Modules

| Module | Responsibility |
|--------|----------------|
| **VirtualFilesystem** | File/directory state, permissions, content |
| **ShellEngine** | Command parsing, execution, piping |
| **CommandRegistry** | Built-in command implementations |
| **TabCompleter** | Context-aware auto-completion |
| **HistoryManager** | Command history with navigation |
| **OutputFormatter** | ANSI colors, formatting, paging |

---

## 2. Virtual Filesystem

### 2.1 VFS Structure

```typescript
interface VFSNode {
  name: string;
  type: 'file' | 'directory' | 'symlink';
  permissions: VFSPermissions;
  owner: string;
  group: string;
  size: number;
  created: Date;
  modified: Date;
  content?: string;           // For files
  children?: VFSNode[];       // For directories
  target?: string;            // For symlinks
  hidden?: boolean;           // Starts with .
}

interface VFSPermissions {
  owner: { read: boolean; write: boolean; execute: boolean };
  group: { read: boolean; write: boolean; execute: boolean };
  other: { read: boolean; write: boolean; execute: boolean };
}

interface VFSState {
  root: VFSNode;
  currentPath: string;
  currentUser: string;
  currentGroup: string;
  homeDirectory: string;
  environmentVariables: Record<string, string>;
}
```

### 2.2 Default Filesystem Template (Linux)

```
/
├── home/
│   └── admin/
│       ├── .bashrc
│       ├── .bash_history
│       └── Documents/
├── var/
│   ├── log/
│   │   ├── syslog
│   │   ├── auth.log
│   │   ├── kern.log
│   │   └── apache2/
│   │       ├── access.log
│   │       └── error.log
│   └── www/
│       └── html/
│           └── index.html
├── etc/
│   ├── passwd
│   ├── shadow (no read permission)
│   ├── hosts
│   ├── resolv.conf
│   ├── network/
│   │   └── interfaces
│   └── ssh/
│       └── sshd_config
├── tmp/
├── usr/
│   ├── bin/
│   └── local/
├── opt/
└── root/ (no access)
```

### 2.3 Default Filesystem Template (Windows)

```
C:\
├── Users\
│   └── admin.mueller\
│       ├── Desktop\
│       ├── Documents\
│       └── Downloads\
├── Windows\
│   └── System32\
│       └── drivers\
│           └── etc\
│               └── hosts
├── Program Files\
├── Program Files (x86)\
└── Logs\
    ├── Application.log
    └── System.log
```

### 2.4 VFS Operations

```typescript
interface VirtualFilesystem {
  // Navigation
  getCurrentPath(): string;
  setCurrentPath(path: string): Result<void, string>;
  resolvePath(path: string): string;  // Handles ., .., ~, relative

  // Reading
  exists(path: string): boolean;
  isFile(path: string): boolean;
  isDirectory(path: string): boolean;
  readFile(path: string): Result<string, string>;
  readDirectory(path: string): Result<VFSNode[], string>;
  stat(path: string): Result<VFSNode, string>;

  // Writing
  writeFile(path: string, content: string): Result<void, string>;
  createDirectory(path: string): Result<void, string>;
  remove(path: string, recursive?: boolean): Result<void, string>;
  move(src: string, dest: string): Result<void, string>;
  copy(src: string, dest: string): Result<void, string>;

  // Permissions
  checkPermission(path: string, action: 'read' | 'write' | 'execute'): boolean;
  chmod(path: string, mode: string): Result<void, string>;

  // Search
  find(path: string, pattern: string, options?: FindOptions): string[];
  grep(path: string, pattern: string, options?: GrepOptions): GrepResult[];
}
```

### 2.5 Scenario-Specific VFS

Each scenario can define its own VFS overlay:

```typescript
interface TerminalContext {
  // ... existing fields

  // NEW: Virtual filesystem configuration
  vfsTemplate?: 'linux-server' | 'windows-workstation' | 'firewall' | 'custom';
  vfsOverlay?: VFSOverlay;  // Scenario-specific files/content
}

interface VFSOverlay {
  files: {
    path: string;
    content: string;
    permissions?: VFSPermissions;
  }[];
  directories?: string[];
}
```

---

## 3. Command Implementations

### 3.1 Command Interface

```typescript
interface ShellCommand {
  name: string;
  aliases?: string[];
  description: string;
  usage: string;
  examples: string[];

  // Execution
  execute(args: ParsedArgs, context: ExecutionContext): CommandResult;

  // Completion
  getCompletions?(partial: string, context: CompletionContext): Completion[];

  // Validation
  validateArgs?(args: string[]): ValidationResult;
}

interface ParsedArgs {
  positional: string[];
  flags: Record<string, boolean>;      // -f, --force
  options: Record<string, string>;     // -n 10, --lines=10
  raw: string;                         // Original input
}

interface CommandResult {
  output: string;
  exitCode: number;
  error?: string;
  sideEffects?: SideEffect[];
}

interface ExecutionContext {
  vfs: VirtualFilesystem;
  env: Record<string, string>;
  stdin?: string;                      // For piped input
  shell: ShellState;
}
```

### 3.2 Linux/Bash Commands

#### Navigation & Filesystem

| Command | Priority | Description |
|---------|----------|-------------|
| `pwd` | P0 | Print working directory |
| `cd` | P0 | Change directory (supports -, ~, .., absolute, relative) |
| `ls` | P0 | List directory contents (-l, -a, -la, -lh, -R, colors) |
| `tree` | P1 | Display directory tree structure |
| `mkdir` | P1 | Create directories (-p for parents) |
| `rmdir` | P2 | Remove empty directories |
| `touch` | P1 | Create empty file / update timestamp |
| `rm` | P1 | Remove files (-r, -f, -rf) |
| `cp` | P1 | Copy files (-r for directories) |
| `mv` | P1 | Move/rename files |
| `ln` | P2 | Create links (-s for symbolic) |

#### File Viewing & Editing

| Command | Priority | Description |
|---------|----------|-------------|
| `cat` | P0 | Display file contents (multiple files, -n for line numbers) |
| `head` | P0 | Show first N lines (-n, default 10) |
| `tail` | P0 | Show last N lines (-n, -f simulation) |
| `less` | P1 | Paged file viewer (q to quit, /search, n/N) |
| `more` | P2 | Simple pager |
| `nano` | P2 | Simple text editor (simulated) |
| `wc` | P1 | Word/line/byte count (-l, -w, -c) |

#### Search & Filter

| Command | Priority | Description |
|---------|----------|-------------|
| `grep` | P0 | Search file contents (-i, -r, -n, -v, -c, regex) |
| `find` | P1 | Find files (-name, -type, -size, -mtime) |
| `locate` | P2 | Quick file search (simulated database) |
| `which` | P1 | Show command location |
| `whereis` | P2 | Locate binary/source/manual |

#### Text Processing

| Command | Priority | Description |
|---------|----------|-------------|
| `echo` | P0 | Print text (supports $VAR expansion) |
| `sort` | P1 | Sort lines (-r, -n, -u) |
| `uniq` | P1 | Filter duplicate lines (-c, -d) |
| `cut` | P1 | Cut columns (-d delimiter, -f fields) |
| `awk` | P2 | Pattern processing (basic support) |
| `sed` | P2 | Stream editor (basic s/old/new/g) |
| `tr` | P2 | Translate characters |
| `diff` | P2 | Compare files |

#### System Information

| Command | Priority | Description |
|---------|----------|-------------|
| `uname` | P0 | System information (-a, -r, -s) |
| `hostname` | P0 | Show hostname |
| `whoami` | P0 | Current username |
| `id` | P1 | User/group IDs |
| `uptime` | P1 | System uptime |
| `date` | P1 | Current date/time |
| `df` | P1 | Disk space (-h) |
| `du` | P1 | Directory size (-h, -s) |
| `free` | P1 | Memory usage (-h) |
| `ps` | P1 | Process list (aux) |
| `top` | P2 | Process monitor (simulated snapshot) |
| `kill` | P1 | Kill process (simulated) |

#### Network

| Command | Priority | Description |
|---------|----------|-------------|
| `ping` | P0 | ICMP ping (simulated responses) |
| `ifconfig` | P0 | Network interfaces |
| `ip` | P1 | IP configuration (addr, route, link) |
| `netstat` | P1 | Network statistics (-tulpn) |
| `ss` | P1 | Socket statistics |
| `curl` | P1 | HTTP requests (simulated) |
| `wget` | P2 | Download files (simulated) |
| `dig` | P1 | DNS lookup |
| `nslookup` | P1 | DNS lookup (legacy) |
| `traceroute` | P2 | Trace route |
| `ssh` | P2 | SSH client (simulated connection) |
| `scp` | P2 | Secure copy (simulated) |
| `nc` | P2 | Netcat |

#### Permissions & Users

| Command | Priority | Description |
|---------|----------|-------------|
| `chmod` | P1 | Change permissions |
| `chown` | P2 | Change owner |
| `sudo` | P1 | Execute as root (password prompt) |
| `su` | P2 | Switch user |
| `passwd` | P2 | Change password (simulated) |

#### Archives & Compression

| Command | Priority | Description |
|---------|----------|-------------|
| `tar` | P2 | Archive files (-cvf, -xvf, -tvf) |
| `gzip` | P2 | Compress files |
| `gunzip` | P2 | Decompress files |
| `zip` | P2 | Create zip archive |
| `unzip` | P2 | Extract zip archive |

#### Shell Built-ins

| Command | Priority | Description |
|---------|----------|-------------|
| `help` | P0 | Show available commands |
| `man` | P1 | Manual pages (simulated) |
| `history` | P0 | Command history |
| `clear` | P0 | Clear screen |
| `exit` | P0 | Exit shell (cancel terminal) |
| `export` | P1 | Set environment variable |
| `env` | P1 | Show environment variables |
| `alias` | P2 | Create command alias |
| `source` | P2 | Execute script |
| `type` | P2 | Show command type |

### 3.3 Windows/PowerShell Commands

#### Navigation & Filesystem

| Command | Alias | Priority | Description |
|---------|-------|----------|-------------|
| `Get-Location` | `pwd`, `gl` | P0 | Print working directory |
| `Set-Location` | `cd`, `sl` | P0 | Change directory |
| `Get-ChildItem` | `ls`, `dir`, `gci` | P0 | List directory |
| `New-Item` | `ni` | P1 | Create file/directory |
| `Remove-Item` | `rm`, `del`, `ri` | P1 | Remove items |
| `Copy-Item` | `cp`, `copy`, `ci` | P1 | Copy items |
| `Move-Item` | `mv`, `move`, `mi` | P1 | Move items |
| `Rename-Item` | `ren`, `rni` | P1 | Rename item |

#### File Operations

| Command | Alias | Priority | Description |
|---------|-------|----------|-------------|
| `Get-Content` | `cat`, `type`, `gc` | P0 | Read file content |
| `Set-Content` | `sc` | P1 | Write file content |
| `Add-Content` | `ac` | P2 | Append to file |
| `Select-String` | `sls` | P0 | Search text (like grep) |
| `Out-File` | | P1 | Write output to file |

#### System Information

| Command | Priority | Description |
|---------|----------|-------------|
| `Get-Process` | P1 | List processes |
| `Stop-Process` | P1 | Kill process |
| `Get-Service` | P1 | List services |
| `Start-Service` | P2 | Start service |
| `Stop-Service` | P2 | Stop service |
| `Get-ComputerInfo` | P1 | System information |
| `Get-Date` | P1 | Current date/time |

#### Network

| Command | Priority | Description |
|---------|----------|-------------|
| `Test-NetConnection` | P0 | Test network connectivity (port, ping) |
| `Test-Connection` | P0 | Ping |
| `Get-NetIPAddress` | P1 | IP addresses |
| `Get-NetIPConfiguration` | P1 | Network configuration |
| `Get-DnsClientServerAddress` | P1 | DNS servers |
| `Set-DnsClientServerAddress` | P1 | Set DNS servers |
| `Resolve-DnsName` | P1 | DNS lookup |
| `Get-NetTCPConnection` | P1 | TCP connections |

#### Other

| Command | Alias | Priority | Description |
|---------|-------|----------|-------------|
| `Write-Output` | `echo` | P0 | Print output |
| `Clear-Host` | `cls`, `clear` | P0 | Clear screen |
| `Get-Help` | `help` | P0 | Get help |
| `Get-Command` | `gcm` | P1 | List commands |
| `Get-History` | `h`, `history` | P0 | Command history |
| `Where-Object` | `?`, `where` | P1 | Filter objects |
| `Select-Object` | `select` | P1 | Select properties |
| `Sort-Object` | `sort` | P1 | Sort objects |
| `Format-List` | `fl` | P2 | Format as list |
| `Format-Table` | `ft` | P2 | Format as table |

### 3.4 Command Implementation Examples

#### `ls` Implementation

```typescript
const lsCommand: ShellCommand = {
  name: 'ls',
  aliases: ['dir'],
  description: 'List directory contents',
  usage: 'ls [OPTIONS] [PATH...]',
  examples: [
    'ls',
    'ls -la',
    'ls -lh /var/log',
    'ls *.txt',
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const showAll = args.flags['a'] || args.flags['all'];
    const longFormat = args.flags['l'];
    const humanReadable = args.flags['h'];
    const recursive = args.flags['R'];

    const paths = args.positional.length > 0 ? args.positional : ['.'];
    const results: string[] = [];

    for (const path of paths) {
      const resolved = ctx.vfs.resolvePath(path);
      const entries = ctx.vfs.readDirectory(resolved);

      if (entries.isErr()) {
        return { output: '', exitCode: 1, error: entries.error };
      }

      let filtered = entries.value;
      if (!showAll) {
        filtered = filtered.filter(e => !e.hidden);
      }

      if (longFormat) {
        results.push(formatLongListing(filtered, humanReadable));
      } else {
        results.push(formatShortListing(filtered));
      }
    }

    return { output: results.join('\n'), exitCode: 0 };
  },

  getCompletions(partial: string, ctx: CompletionContext): Completion[] {
    // Complete paths
    return ctx.vfs.getPathCompletions(partial);
  }
};

function formatLongListing(entries: VFSNode[], humanReadable: boolean): string {
  // -rw-r--r--  1 admin admin  4096 Mar 14 10:30 file.txt
  return entries.map(e => {
    const perms = formatPermissions(e.permissions, e.type);
    const size = humanReadable ? formatHumanSize(e.size) : e.size.toString();
    const date = formatDate(e.modified);
    const color = e.type === 'directory' ? '\x1b[34m' : '';
    const reset = color ? '\x1b[0m' : '';
    return `${perms}  1 ${e.owner} ${e.group} ${size.padStart(8)} ${date} ${color}${e.name}${reset}`;
  }).join('\n');
}
```

#### `grep` Implementation

```typescript
const grepCommand: ShellCommand = {
  name: 'grep',
  description: 'Search for patterns in files',
  usage: 'grep [OPTIONS] PATTERN [FILE...]',
  examples: [
    'grep "error" /var/log/syslog',
    'grep -i "warning" *.log',
    'grep -rn "TODO" src/',
    'grep -v "debug" app.log',
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const ignoreCase = args.flags['i'];
    const recursive = args.flags['r'] || args.flags['R'];
    const lineNumbers = args.flags['n'];
    const invert = args.flags['v'];
    const countOnly = args.flags['c'];

    const pattern = args.positional[0];
    const paths = args.positional.slice(1);

    if (!pattern) {
      return { output: '', exitCode: 2, error: 'grep: missing pattern' };
    }

    const regex = new RegExp(pattern, ignoreCase ? 'i' : '');
    const results: string[] = [];

    for (const path of paths) {
      const content = ctx.vfs.readFile(path);
      if (content.isErr()) continue;

      const lines = content.value.split('\n');
      let matchCount = 0;

      lines.forEach((line, idx) => {
        const matches = regex.test(line);
        if (matches !== invert) {
          matchCount++;
          if (!countOnly) {
            const prefix = lineNumbers ? `${idx + 1}:` : '';
            const filePrefix = paths.length > 1 ? `${path}:` : '';
            results.push(`${filePrefix}${prefix}${highlightMatch(line, regex)}`);
          }
        }
      });

      if (countOnly) {
        results.push(`${path}:${matchCount}`);
      }
    }

    return {
      output: results.join('\n'),
      exitCode: results.length > 0 ? 0 : 1
    };
  },

  getCompletions(partial: string, ctx: CompletionContext): Completion[] {
    // After pattern, complete file paths
    if (ctx.argIndex > 0) {
      return ctx.vfs.getPathCompletions(partial);
    }
    return [];
  }
};
```

---

## 4. Tab Completion

### 4.1 Completion System Architecture

```typescript
interface CompletionEngine {
  // Get completions for current input
  complete(input: string, cursorPos: number): CompletionResult;

  // Register custom completers
  registerCompleter(name: string, completer: Completer): void;
}

interface CompletionResult {
  completions: Completion[];
  replaceStart: number;
  replaceEnd: number;
  commonPrefix?: string;
}

interface Completion {
  value: string;           // The completion text
  display: string;         // What to show in list
  type: CompletionType;    // For styling
  description?: string;    // Optional description
  sortOrder?: number;      // Custom sort order
}

type CompletionType =
  | 'command'
  | 'file'
  | 'directory'
  | 'option'
  | 'argument'
  | 'variable'
  | 'alias'
  | 'history';
```

### 4.2 Completion Types

#### 4.2.1 Command Completion

When input is at the start of a command:

```
$ ca<TAB>
cat  cal  case
```

Implementation:
```typescript
function completeCommand(partial: string, registry: CommandRegistry): Completion[] {
  const commands = registry.getAllCommands();
  return commands
    .filter(cmd => cmd.name.startsWith(partial))
    .map(cmd => ({
      value: cmd.name,
      display: cmd.name,
      type: 'command',
      description: cmd.description,
    }));
}
```

#### 4.2.2 Path Completion

For file and directory arguments:

```
$ cat /var/lo<TAB>
$ cat /var/log/

$ ls /var/log/sy<TAB>
$ ls /var/log/syslog
```

Implementation:
```typescript
function completePath(partial: string, vfs: VirtualFilesystem): Completion[] {
  const dir = dirname(partial);
  const prefix = basename(partial);

  const entries = vfs.readDirectory(dir);
  if (entries.isErr()) return [];

  return entries.value
    .filter(e => e.name.startsWith(prefix))
    .map(e => ({
      value: join(dir, e.name) + (e.type === 'directory' ? '/' : ''),
      display: e.name + (e.type === 'directory' ? '/' : ''),
      type: e.type === 'directory' ? 'directory' : 'file',
    }));
}
```

#### 4.2.3 Option Completion

For command flags and options:

```
$ ls -<TAB>
-a  -l  -h  -R  --all  --long  --human-readable

$ grep --ig<TAB>
$ grep --ignore-case
```

Implementation:
```typescript
function completeOptions(partial: string, command: ShellCommand): Completion[] {
  const options = command.getOptions();
  const isLong = partial.startsWith('--');

  return options
    .filter(opt => {
      if (isLong) return opt.long?.startsWith(partial.slice(2));
      return opt.short?.startsWith(partial.slice(1));
    })
    .map(opt => ({
      value: isLong ? `--${opt.long}` : `-${opt.short}`,
      display: isLong ? `--${opt.long}` : `-${opt.short}`,
      type: 'option',
      description: opt.description,
    }));
}
```

#### 4.2.4 Variable Completion

For environment variables:

```
$ echo $HO<TAB>
$ echo $HOME

$ echo $PA<TAB>
$PATH  $PAGER
```

#### 4.2.5 History Completion

```
$ !gr<TAB>
grep "error" /var/log/syslog
grep -rn "TODO" src/
```

### 4.3 Tab Completion Behavior

#### Single Match
```
$ ca<TAB>
$ cat   (completes and adds space)
```

#### Multiple Matches - Common Prefix
```
$ /var/log/sys<TAB>
$ /var/log/syslog   (completes common prefix)
```

#### Multiple Matches - Show List
```
$ ls /var/lo<TAB><TAB>
local/  log/  lock/
$ ls /var/lo
```

#### Directory Completion
```
$ cd /va<TAB>
$ cd /var/  (adds trailing slash, no space)
```

### 4.4 Context-Aware Completion

Commands can provide custom completion logic:

```typescript
// Example: git-style completion
const gitCommand: ShellCommand = {
  name: 'git',

  getCompletions(partial: string, ctx: CompletionContext): Completion[] {
    if (ctx.argIndex === 0) {
      // Complete subcommands
      return ['add', 'commit', 'push', 'pull', 'status', 'log']
        .filter(s => s.startsWith(partial))
        .map(s => ({ value: s, display: s, type: 'argument' }));
    }

    if (ctx.args[0] === 'add') {
      // Complete file paths
      return ctx.vfs.getPathCompletions(partial);
    }

    return [];
  }
};
```

---

## 5. Shell Features

### 5.1 Piping

Support basic pipe operations:

```bash
cat /var/log/syslog | grep "error" | head -n 5
```

Implementation:
```typescript
interface PipelineStage {
  command: string;
  args: ParsedArgs;
}

function executePipeline(stages: PipelineStage[], ctx: ExecutionContext): CommandResult {
  let stdin = '';

  for (const stage of stages) {
    const command = ctx.registry.get(stage.command);
    const result = command.execute(stage.args, { ...ctx, stdin });

    if (result.exitCode !== 0) {
      return result; // Pipeline fails on first error
    }

    stdin = result.output;
  }

  return { output: stdin, exitCode: 0 };
}
```

### 5.2 Redirection

Support output redirection:

```bash
echo "hello" > file.txt      # Overwrite
echo "world" >> file.txt     # Append
cat < file.txt               # Input redirect
grep "error" 2>&1            # Stderr to stdout
```

### 5.3 Command Chaining

```bash
mkdir test && cd test        # Run second if first succeeds
rm file.txt || echo "failed" # Run second if first fails
cmd1; cmd2; cmd3             # Run all regardless of exit codes
```

### 5.4 Environment Variables

```bash
export PATH="/custom/bin:$PATH"
echo $HOME
echo ${USER:-default}
VAR=value command            # Temporary variable
```

### 5.5 Globbing

Support wildcards:

```bash
ls *.txt                     # All .txt files
rm log-202[0-3]-*.log        # Bracket expressions
cp src/**/*.ts dist/         # Recursive glob (optional)
```

Implementation:
```typescript
function expandGlob(pattern: string, vfs: VirtualFilesystem): string[] {
  const dir = dirname(pattern);
  const glob = basename(pattern);

  const entries = vfs.readDirectory(dir);
  if (entries.isErr()) return [];

  const regex = globToRegex(glob);
  return entries.value
    .filter(e => regex.test(e.name))
    .map(e => join(dir, e.name));
}

function globToRegex(glob: string): RegExp {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`);
}
```

### 5.6 Command History

```bash
history              # Show history
!10                  # Run command #10
!!                   # Run last command
!grep                # Run last command starting with "grep"
^old^new             # Replace in last command
```

Arrow key navigation:
- **Up**: Previous command
- **Down**: Next command
- **Ctrl+R**: Reverse search

### 5.7 Aliases

```bash
alias ll='ls -la'
alias grep='grep --color=auto'
unalias ll
```

---

## 6. Input Handling

### 6.1 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Enter** | Execute command |
| **Tab** | Auto-complete |
| **Tab Tab** | Show all completions |
| **Up/Down** | Navigate history |
| **Left/Right** | Move cursor |
| **Ctrl+A** | Move to line start |
| **Ctrl+E** | Move to line end |
| **Ctrl+W** | Delete word backward |
| **Ctrl+U** | Delete to line start |
| **Ctrl+K** | Delete to line end |
| **Ctrl+L** | Clear screen |
| **Ctrl+C** | Cancel current input |
| **Ctrl+D** | Exit (if empty) / Delete char |
| **Ctrl+R** | Reverse history search |
| **Alt+B** | Move word backward |
| **Alt+F** | Move word forward |
| **Home** | Move to line start |
| **End** | Move to line end |
| **Delete** | Delete character forward |
| **Backspace** | Delete character backward |

### 6.2 Line Editing State

```typescript
interface LineEditState {
  buffer: string;
  cursorPosition: number;
  historyIndex: number;
  searchMode: boolean;
  searchQuery: string;
  savedBuffer?: string;      // For history navigation
}
```

---

## 7. Type Definitions

### 7.1 Shell State

```typescript
interface ShellState {
  type: 'bash' | 'zsh' | 'powershell';
  vfs: VirtualFilesystem;
  env: Record<string, string>;
  aliases: Record<string, string>;
  history: CommandHistory;
  exitCode: number;
  jobs: Job[];                 // Background jobs (future)
}

interface CommandHistory {
  entries: HistoryEntry[];
  maxSize: number;
  position: number;

  add(command: string): void;
  get(index: number): string | undefined;
  search(query: string): HistoryEntry[];
  navigateUp(): string | undefined;
  navigateDown(): string | undefined;
}

interface HistoryEntry {
  command: string;
  timestamp: Date;
  exitCode: number;
  duration?: number;
}
```

### 7.2 Enhanced Terminal Context

```typescript
interface TerminalContext {
  // Existing
  type: 'linux' | 'windows';
  hostname: string;
  username: string;
  currentPath: string;
  commands: TerminalCommand[];      // Scenario-specific commands (keep for compatibility)
  solutions: TerminalSolution[];
  hints: string[];

  // NEW: Full CLI mode
  fullCliMode: boolean;             // Enable full CLI emulation
  shellType?: 'bash' | 'zsh' | 'powershell';
  vfsTemplate?: VFSTemplate;
  vfsOverlay?: VFSOverlay;
  initialEnv?: Record<string, string>;
  sudoPassword?: string;
  networkConfig?: NetworkConfig;

  // Solution detection in full CLI mode
  solutionConditions?: SolutionCondition[];
}

interface SolutionCondition {
  type: 'file_exists' | 'file_contains' | 'command_executed' | 'env_set' | 'custom';
  path?: string;
  pattern?: string;
  command?: string;
  check?: (state: ShellState) => boolean;
}

interface NetworkConfig {
  interfaces: NetworkInterface[];
  dnsServers: string[];
  routes: Route[];
  hosts: Record<string, string>;    // /etc/hosts entries

  // Simulated responses
  pingResponses: Record<string, PingResponse>;
  dnsResponses: Record<string, DNSResponse>;
  httpResponses: Record<string, HTTPResponse>;
}
```

---

## 8. Integration Points

### 8.1 Game State Integration

```typescript
// Commands can modify game state
interface CommandSideEffect {
  type: 'skill_gain' | 'flag_set' | 'relationship_change' | 'stress_change';
  payload: any;
}

// Example: Successfully diagnosing an issue gains skills
const diagnosisCommand = {
  execute(args, ctx) {
    return {
      output: 'Issue identified: misconfigured firewall rule',
      exitCode: 0,
      sideEffects: [
        { type: 'skill_gain', payload: { troubleshooting: 3, netzwerk: 2 } },
        { type: 'flag_set', payload: 'firewall_issue_found' }
      ]
    };
  }
};
```

### 8.2 Scenario Commands

Keep backward compatibility with scenario-specific commands:

```typescript
// Scenario-specific commands override built-ins
function getCommand(name: string, ctx: TerminalContext, registry: CommandRegistry): ShellCommand {
  // First check scenario-specific commands
  const scenarioCmd = ctx.commands.find(c => c.pattern === name);
  if (scenarioCmd) {
    return wrapScenarioCommand(scenarioCmd);
  }

  // Fall back to built-in
  return registry.get(name);
}
```

### 8.3 Educational Feedback

```typescript
interface CommandFeedback {
  tip?: string;           // Helpful tip
  warning?: string;       // Potential issue
  lesson?: string;        // Educational content
  reference?: string;     // BSI/documentation reference
}

// Example: Feedback for insecure command
if (command === 'chmod' && args.includes('777')) {
  return {
    ...result,
    feedback: {
      warning: 'chmod 777 grants full access to everyone!',
      lesson: 'Use minimum necessary permissions (e.g., 644 for files, 755 for directories)',
      reference: 'BSI IT-Grundschutz: SYS.1.3.A3'
    }
  };
}
```

---

## 9. Future: Zsh Support

### 9.1 Zsh-Specific Features

| Feature | Description | Priority |
|---------|-------------|----------|
| **Extended Globbing** | `**/*.ts`, `*(.)` qualifiers | P2 |
| **Better Completion** | Context-aware, descriptions | P1 |
| **Syntax Highlighting** | Real-time command coloring | P2 |
| **Auto-suggestions** | Fish-style history suggestions | P2 |
| **Spelling Correction** | `Did you mean...?` | P3 |
| **Prompt Themes** | Custom PS1 with git info | P2 |
| **Named Directories** | `hash -d` shortcuts | P3 |
| **Suffix Aliases** | `alias -s txt=cat` | P3 |

### 9.2 Zsh vs Bash Differences

```typescript
interface ShellDialect {
  name: 'bash' | 'zsh';

  // Syntax differences
  arrayIndexing: 'zero-based' | 'one-based';  // bash: 0, zsh: 1
  globQualifiers: boolean;                     // zsh only
  extendedGlob: boolean;                       // zsh: **/* default

  // Completion differences
  completionStyle: 'basic' | 'menu' | 'menu-select';

  // Prompt
  promptExpansion: 'bash' | 'zsh';            // Different % escapes
}
```

### 9.3 Implementation Approach

1. **Abstract Shell Interface**: Create common interface for all shells
2. **Dialect Handlers**: Implement bash/zsh-specific parsing
3. **Feature Flags**: Enable/disable features per shell type
4. **Completion Engines**: Separate completion logic per shell

```typescript
interface ShellDialectHandler {
  parse(input: string): ParsedCommand;
  expandVariables(input: string, env: Record<string, string>): string;
  expandGlobs(pattern: string, vfs: VirtualFilesystem): string[];
  getPrompt(template: string, state: ShellState): string;
  getCompletionEngine(): CompletionEngine;
}

class BashDialect implements ShellDialectHandler { ... }
class ZshDialect implements ShellDialectHandler { ... }
```

---

## 10. Implementation Phases

### Phase 1: Core Infrastructure (P0)

**Goal**: Replace current pattern-matching with real command execution

**Tasks**:
1. [ ] Create `VirtualFilesystem` class with basic operations
2. [ ] Create `CommandRegistry` with command interface
3. [ ] Implement core navigation: `pwd`, `cd`, `ls`
4. [ ] Implement core file ops: `cat`, `head`, `tail`
5. [ ] Implement search: `grep` (basic)
6. [ ] Implement info: `echo`, `whoami`, `hostname`
7. [ ] Update `useTerminal` to use new engine
8. [ ] Maintain backward compatibility with scenario commands

**Deliverables**:
- Working filesystem navigation
- Basic file viewing
- Tab completion for paths and commands

### Phase 2: Extended Commands (P1)

**Goal**: Full Linux admin toolkit

**Tasks**:
1. [ ] Implement: `find`, `wc`, `sort`, `uniq`, `cut`
2. [ ] Implement: `mkdir`, `rm`, `cp`, `mv`, `touch`
3. [ ] Implement: `chmod`, `sudo` (with password prompt)
4. [ ] Implement: `ps`, `kill`, `df`, `du`, `free`
5. [ ] Implement: `ping`, `ifconfig`/`ip`, `netstat`, `dig`
6. [ ] Implement: `history` with navigation
7. [ ] Implement: `less` with paging
8. [ ] Add command piping support

**Deliverables**:
- Comprehensive command set
- Working pipes
- History navigation

### Phase 3: Windows PowerShell (P1)

**Goal**: Full Windows admin toolkit

**Tasks**:
1. [ ] Create PowerShell command registry
2. [ ] Implement: `Get-ChildItem`, `Set-Location`, `Get-Content`
3. [ ] Implement: `Test-NetConnection`, `Test-Connection`
4. [ ] Implement: `Get-Process`, `Get-Service`
5. [ ] Implement: `Get-NetIPConfiguration`, `Resolve-DnsName`
6. [ ] Add PowerShell-style piping with objects

**Deliverables**:
- Working PowerShell emulation
- Network diagnostic commands

### Phase 4: Advanced Features (P2)

**Goal**: Professional shell experience

**Tasks**:
1. [ ] Implement redirection (`>`, `>>`, `<`, `2>&1`)
2. [ ] Implement command chaining (`&&`, `||`, `;`)
3. [ ] Implement globbing (`*`, `?`, `[...]`)
4. [ ] Implement environment variables (`$VAR`, `export`)
5. [ ] Implement aliases
6. [ ] Add syntax highlighting
7. [ ] Add `man` pages

**Deliverables**:
- Full shell scripting support
- Professional UX

### Phase 5: Zsh Support (P3)

**Goal**: Zsh as alternative shell

**Tasks**:
1. [ ] Create `ZshDialect` handler
2. [ ] Implement extended globbing
3. [ ] Implement enhanced completion
4. [ ] Add auto-suggestions
5. [ ] Add spelling correction
6. [ ] Create zsh prompt themes

**Deliverables**:
- Fully functional zsh emulation
- Modern shell experience

---

## Appendix A: VFS Template Examples

### Linux Server Template

```typescript
const linuxServerTemplate: VFSTemplate = {
  name: 'linux-server',
  structure: {
    '/': {
      'etc': {
        'passwd': { content: 'root:x:0:0:root:/root:/bin/bash\nadmin:x:1000:1000:Admin:/home/admin:/bin/bash' },
        'hosts': { content: '127.0.0.1 localhost\n10.10.1.1 server1.local' },
        'resolv.conf': { content: 'nameserver 8.8.8.8\nnameserver 8.8.4.4' },
      },
      'var': {
        'log': {
          'syslog': { content: 'Mar 14 10:00:00 server1 systemd[1]: Started...' },
          'auth.log': { content: 'Mar 14 10:01:00 server1 sshd[1234]: Accepted...' },
        },
      },
      'home': {
        'admin': {
          '.bashrc': { content: 'export PS1="\\u@\\h:\\w\\$ "' },
          'scripts': {},
        },
      },
    },
  },
  currentPath: '/home/admin',
  currentUser: 'admin',
};
```

### Windows Workstation Template

```typescript
const windowsWorkstationTemplate: VFSTemplate = {
  name: 'windows-workstation',
  structure: {
    'C:': {
      'Users': {
        'admin.mueller': {
          'Desktop': {},
          'Documents': {
            'notes.txt': { content: 'Meeting notes...' },
          },
        },
      },
      'Windows': {
        'System32': {
          'drivers': {
            'etc': {
              'hosts': { content: '127.0.0.1 localhost' },
            },
          },
        },
      },
    },
  },
  currentPath: 'C:\\Users\\admin.mueller',
  currentUser: 'admin.mueller',
};
```

---

## Appendix B: Network Simulation

```typescript
interface NetworkSimulation {
  // Ping responses
  ping: {
    '8.8.8.8': { reachable: true, latency: 15 },
    '10.10.1.1': { reachable: true, latency: 2 },
    '192.168.1.1': { reachable: false, error: 'Host unreachable' },
  };

  // DNS responses
  dns: {
    'google.com': { ip: '142.250.185.78', ttl: 300 },
    'internal.local': { ip: '10.10.1.50', ttl: 3600 },
  };

  // HTTP responses (for curl)
  http: {
    'https://api.example.com/health': { status: 200, body: '{"status":"ok"}' },
    'http://internal:8080': { status: 503, body: 'Service Unavailable' },
  };

  // Port connectivity (for Test-NetConnection, telnet)
  ports: {
    '10.10.1.1:22': { open: true, service: 'ssh' },
    '10.10.1.1:8443': { open: false },
    '10.10.1.1:443': { open: true, service: 'https' },
  };
}
```

---

## Appendix C: Command Output Formatting

### ANSI Color Codes

```typescript
const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',

  // Colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // Background
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

// Usage
function colorize(text: string, color: string): string {
  return `${ANSI[color]}${text}${ANSI.reset}`;
}

// ls output coloring
function colorizeEntry(entry: VFSNode): string {
  if (entry.type === 'directory') return colorize(entry.name, 'blue');
  if (entry.permissions.owner.execute) return colorize(entry.name, 'green');
  if (entry.name.endsWith('.log')) return colorize(entry.name, 'yellow');
  return entry.name;
}
```

---

## Appendix D: Error Messages

```typescript
const ERROR_MESSAGES = {
  // Navigation
  'cd: not a directory': (path: string) => `cd: ${path}: Not a directory`,
  'cd: no such file': (path: string) => `cd: ${path}: No such file or directory`,
  'cd: permission denied': (path: string) => `cd: ${path}: Permission denied`,

  // File operations
  'cat: no such file': (path: string) => `cat: ${path}: No such file or directory`,
  'cat: is a directory': (path: string) => `cat: ${path}: Is a directory`,
  'cat: permission denied': (path: string) => `cat: ${path}: Permission denied`,

  // Commands
  'command not found': (cmd: string) => `${cmd}: command not found`,
  'syntax error': (detail: string) => `syntax error: ${detail}`,

  // sudo
  'sudo: incorrect password': () => 'Sorry, try again.',
  'sudo: not in sudoers': (user: string) => `${user} is not in the sudoers file. This incident will be reported.`,
};
```

---

*Document Version: 1.0*
*Last Updated: 2026-03-14*
*Author: Claude Code*
