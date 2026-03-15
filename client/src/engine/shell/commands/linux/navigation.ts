/**
 * Linux Navigation Commands
 * pwd, cd, ls, tree
 */

import { ShellCommand, ParsedArgs, ExecutionContext, CommandResult, Completion, CompletionContext, VFSNode } from '../../types';

// ANSI color codes
const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

export const pwdCommand: ShellCommand = {
  name: 'pwd',
  description: 'Print working directory',
  usage: 'pwd',

  execute(_args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    return {
      output: ctx.vfs.getCurrentPath(),
      exitCode: 0,
    };
  },
};

export const cdCommand: ShellCommand = {
  name: 'cd',
  description: 'Change directory',
  usage: 'cd [directory]',
  options: [
    { short: '-', description: 'Go to previous directory' },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    let target = args.positional[0];

    // cd with no args goes home
    if (!target) {
      target = ctx.vfs.getEnv('HOME') || '/';
    }

    // cd - goes to previous directory
    if (target === '-') {
      const oldPwd = ctx.vfs.getEnv('OLDPWD');
      if (!oldPwd) {
        return { output: '', exitCode: 1, error: 'cd: OLDPWD not set' };
      }
      target = oldPwd;
    }

    const currentPath = ctx.vfs.getCurrentPath();
    const result = ctx.vfs.setCurrentPath(target);

    if (!result.ok) {
      return { output: '', exitCode: 1, error: result.error };
    }

    // Set OLDPWD
    ctx.vfs.setEnv('OLDPWD', currentPath);

    // For cd -, print the new directory
    if (args.positional[0] === '-') {
      return { output: ctx.vfs.getCurrentPath(), exitCode: 0 };
    }

    return { output: '', exitCode: 0 };
  },

  getCompletions(partial: string, ctx: CompletionContext): Completion[] {
    // Only complete directories for cd
    const completions = ctx.vfs.getPathCompletions(partial);
    return completions.filter(c => c.type === 'directory');
  },
};

export const lsCommand: ShellCommand = {
  name: 'ls',
  aliases: ['dir'],
  description: 'List directory contents',
  usage: 'ls [OPTIONS] [FILE...]',
  options: [
    { short: 'a', long: 'all', description: 'Do not ignore entries starting with .' },
    { short: 'l', description: 'Use a long listing format' },
    { short: 'h', long: 'human-readable', description: 'Print human readable sizes' },
    { short: 'R', long: 'recursive', description: 'List subdirectories recursively' },
    { short: '1', description: 'List one file per line' },
    { long: 'color', description: 'Colorize the output' },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const showAll = args.flags['a'] || args.flags['all'];
    const longFormat = args.flags['l'];
    const humanReadable = args.flags['h'] || args.flags['human-readable'];
    const recursive = args.flags['R'] || args.flags['recursive'];
    const onePerLine = args.flags['1'];
    const colorize = args.flags['color'] !== false; // Default true

    const paths = args.positional.length > 0 ? args.positional : ['.'];
    const outputs: string[] = [];
    const multipleTargets = paths.length > 1;

    for (const path of paths) {
      const resolved = ctx.vfs.resolvePath(path);

      // Check if it's a file
      if (ctx.vfs.isFile(resolved)) {
        const stat = ctx.vfs.stat(resolved);
        if (stat.ok) {
          outputs.push(longFormat ? formatLongEntry(stat.value, humanReadable, colorize) : stat.value.name);
        }
        continue;
      }

      const result = ctx.vfs.readDirectory(resolved);

      if (!result.ok) {
        return { output: '', exitCode: 2, error: result.error };
      }

      let entries = result.value;

      // Filter hidden files unless -a
      if (!showAll) {
        entries = entries.filter(e => !e.name.startsWith('.'));
      }

      // Sort entries
      entries.sort((a, b) => a.name.localeCompare(b.name));

      if (multipleTargets) {
        outputs.push(`${path}:`);
      }

      if (longFormat) {
        // Calculate total blocks (simplified)
        const total = entries.reduce((sum, e) => sum + Math.ceil(e.size / 512), 0);
        outputs.push(`total ${total}`);
        outputs.push(...entries.map(e => formatLongEntry(e, humanReadable, colorize)));
      } else if (onePerLine) {
        outputs.push(...entries.map(e => colorizeEntry(e, colorize)));
      } else {
        // Grid format
        const names = entries.map(e => colorizeEntry(e, colorize));
        outputs.push(names.join('  '));
      }

      if (recursive) {
        for (const entry of entries) {
          if (entry.type === 'directory' && !entry.name.startsWith('.')) {
            const subPath = ctx.vfs.join(resolved, entry.name);
            outputs.push('');
            outputs.push(`${subPath}:`);
            const subResult = ctx.vfs.readDirectory(subPath);
            if (subResult.ok) {
              let subEntries = subResult.value;
              if (!showAll) {
                subEntries = subEntries.filter(e => !e.name.startsWith('.'));
              }
              subEntries.sort((a, b) => a.name.localeCompare(b.name));
              if (longFormat) {
                outputs.push(...subEntries.map(e => formatLongEntry(e, humanReadable, colorize)));
              } else {
                outputs.push(subEntries.map(e => colorizeEntry(e, colorize)).join('  '));
              }
            }
          }
        }
      }

      if (multipleTargets && paths.indexOf(path) < paths.length - 1) {
        outputs.push('');
      }
    }

    return { output: outputs.join('\n'), exitCode: 0 };
  },

  getCompletions(partial: string, ctx: CompletionContext): Completion[] {
    return ctx.vfs.getPathCompletions(partial);
  },
};

function formatPermissions(node: VFSNode): string {
  const typeChar = node.type === 'directory' ? 'd' : node.type === 'symlink' ? 'l' : '-';
  const p = node.permissions;

  const format = (perm: { read: boolean; write: boolean; execute: boolean }) =>
    (perm.read ? 'r' : '-') + (perm.write ? 'w' : '-') + (perm.execute ? 'x' : '-');

  return typeChar + format(p.owner) + format(p.group) + format(p.other);
}

function formatSize(size: number, humanReadable: boolean): string {
  if (!humanReadable) {
    return size.toString().padStart(8);
  }

  const units = ['', 'K', 'M', 'G', 'T'];
  let unitIndex = 0;
  let value = size;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  const formatted = unitIndex === 0 ? value.toString() : value.toFixed(1);
  return (formatted + units[unitIndex]).padStart(6);
}

function formatDate(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const day = date.getDate().toString().padStart(2);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${month} ${day} ${hours}:${minutes}`;
}

function formatLongEntry(node: VFSNode, humanReadable: boolean, colorize: boolean): string {
  const perms = formatPermissions(node);
  const links = '1';
  const owner = node.owner.padEnd(8);
  const group = node.group.padEnd(8);
  const size = formatSize(node.size, humanReadable);
  const date = formatDate(node.modified);
  const name = colorizeEntry(node, colorize);

  return `${perms} ${links} ${owner} ${group} ${size} ${date} ${name}`;
}

function colorizeEntry(node: VFSNode, colorize: boolean): string {
  if (!colorize) return node.name;

  if (node.type === 'directory') {
    return `${COLORS.blue}${COLORS.bold}${node.name}${COLORS.reset}`;
  }
  if (node.type === 'symlink') {
    return `${COLORS.cyan}${node.name}${COLORS.reset}`;
  }
  if (node.permissions.owner.execute) {
    return `${COLORS.green}${COLORS.bold}${node.name}${COLORS.reset}`;
  }
  if (node.name.endsWith('.log') || node.name.endsWith('.txt')) {
    return node.name;
  }
  if (node.name.endsWith('.tar') || node.name.endsWith('.gz') || node.name.endsWith('.zip')) {
    return `${COLORS.red}${node.name}${COLORS.reset}`;
  }

  return node.name;
}

export const treeCommand: ShellCommand = {
  name: 'tree',
  description: 'Display directory tree structure',
  usage: 'tree [directory]',
  options: [
    { short: 'a', description: 'Show hidden files' },
    { short: 'L', description: 'Max depth level', takesValue: true },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const showAll = args.flags['a'];
    const maxDepth = args.options['L'] ? parseInt(args.options['L'], 10) : Infinity;
    const path = args.positional[0] || '.';

    const resolved = ctx.vfs.resolvePath(path);
    const lines: string[] = [resolved];
    let dirs = 0;
    let files = 0;

    function traverse(dirPath: string, prefix: string, depth: number): void {
      if (depth > maxDepth) return;

      const result = ctx.vfs.readDirectory(dirPath);
      if (!result.ok) return;

      let entries = result.value;
      if (!showAll) {
        entries = entries.filter(e => !e.name.startsWith('.'));
      }
      entries.sort((a, b) => a.name.localeCompare(b.name));

      entries.forEach((entry, index) => {
        const isLast = index === entries.length - 1;
        const connector = isLast ? '└── ' : '├── ';
        const color = entry.type === 'directory' ? COLORS.blue : '';
        const reset = color ? COLORS.reset : '';

        lines.push(`${prefix}${connector}${color}${entry.name}${reset}`);

        if (entry.type === 'directory') {
          dirs++;
          const newPrefix = prefix + (isLast ? '    ' : '│   ');
          traverse(ctx.vfs.join(dirPath, entry.name), newPrefix, depth + 1);
        } else {
          files++;
        }
      });
    }

    traverse(resolved, '', 1);
    lines.push('');
    lines.push(`${dirs} directories, ${files} files`);

    return { output: lines.join('\n'), exitCode: 0 };
  },
};

export const navigationCommands: ShellCommand[] = [
  pwdCommand,
  cdCommand,
  lsCommand,
  treeCommand,
];
