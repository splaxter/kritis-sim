/**
 * Linux File Operation Commands
 * cat, head, tail, less, wc, touch, mkdir, rm, cp, mv, chmod
 */

import { ShellCommand, ParsedArgs, ExecutionContext, CommandResult, Completion, CompletionContext } from '../../types';

export const catCommand: ShellCommand = {
  name: 'cat',
  description: 'Concatenate and display files',
  usage: 'cat [OPTIONS] [FILE...]',
  options: [
    { short: 'n', long: 'number', description: 'Number all output lines' },
    { short: 'b', long: 'number-nonblank', description: 'Number nonempty output lines' },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    // Handle stdin (from pipe)
    if (args.positional.length === 0 && ctx.stdin) {
      let output = ctx.stdin;
      if (args.flags['n'] || args.flags['number']) {
        output = output.split('\n').map((line, i) => `${(i + 1).toString().padStart(6)}  ${line}`).join('\n');
      }
      return { output, exitCode: 0 };
    }

    if (args.positional.length === 0) {
      return { output: '', exitCode: 0 };
    }

    const showLineNumbers = args.flags['n'] || args.flags['number'];
    const numberNonBlank = args.flags['b'] || args.flags['number-nonblank'];
    const outputs: string[] = [];
    let lineNum = 1;

    for (const file of args.positional) {
      const result = ctx.vfs.readFile(file);
      if (!result.ok) {
        return { output: '', exitCode: 1, error: result.error };
      }

      let content = result.value;
      if (showLineNumbers || numberNonBlank) {
        content = content.split('\n').map(line => {
          if (numberNonBlank && line.trim() === '') {
            return line;
          }
          return `${(lineNum++).toString().padStart(6)}  ${line}`;
        }).join('\n');
      }
      outputs.push(content);
    }

    return { output: outputs.join('\n'), exitCode: 0 };
  },

  getCompletions(partial: string, ctx: CompletionContext): Completion[] {
    return ctx.vfs.getPathCompletions(partial);
  },
};

export const headCommand: ShellCommand = {
  name: 'head',
  description: 'Output the first part of files',
  usage: 'head [OPTIONS] [FILE...]',
  options: [
    { short: 'n', long: 'lines', description: 'Print the first NUM lines', takesValue: true },
    { short: 'c', long: 'bytes', description: 'Print the first NUM bytes', takesValue: true },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const numLines = parseInt(args.options['n'] || args.options['lines'] || '10', 10);
    const numBytes = args.options['c'] || args.options['bytes'];

    // Handle stdin
    const content = args.positional.length === 0 && ctx.stdin
      ? ctx.stdin
      : null;

    if (content !== null) {
      if (numBytes) {
        return { output: content.slice(0, parseInt(numBytes, 10)), exitCode: 0 };
      }
      const lines = content.split('\n').slice(0, numLines);
      return { output: lines.join('\n'), exitCode: 0 };
    }

    if (args.positional.length === 0) {
      return { output: '', exitCode: 0 };
    }

    const outputs: string[] = [];
    const multipleFiles = args.positional.length > 1;

    for (const file of args.positional) {
      const result = ctx.vfs.readFile(file);
      if (!result.ok) {
        return { output: '', exitCode: 1, error: result.error };
      }

      if (multipleFiles) {
        outputs.push(`==> ${file} <==`);
      }

      if (numBytes) {
        outputs.push(result.value.slice(0, parseInt(numBytes, 10)));
      } else {
        const lines = result.value.split('\n').slice(0, numLines);
        outputs.push(lines.join('\n'));
      }
    }

    return { output: outputs.join('\n'), exitCode: 0 };
  },

  getCompletions(partial: string, ctx: CompletionContext): Completion[] {
    return ctx.vfs.getPathCompletions(partial);
  },
};

export const tailCommand: ShellCommand = {
  name: 'tail',
  description: 'Output the last part of files',
  usage: 'tail [OPTIONS] [FILE...]',
  options: [
    { short: 'n', long: 'lines', description: 'Output the last NUM lines', takesValue: true },
    { short: 'f', long: 'follow', description: 'Output appended data as file grows (simulated)' },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const numLines = parseInt(args.options['n'] || args.options['lines'] || '10', 10);
    const follow = args.flags['f'] || args.flags['follow'];

    // Handle stdin
    if (args.positional.length === 0 && ctx.stdin) {
      const lines = ctx.stdin.split('\n');
      const output = lines.slice(-numLines).join('\n');
      return { output, exitCode: 0 };
    }

    if (args.positional.length === 0) {
      return { output: '', exitCode: 0 };
    }

    const outputs: string[] = [];
    const multipleFiles = args.positional.length > 1;

    for (const file of args.positional) {
      const result = ctx.vfs.readFile(file);
      if (!result.ok) {
        return { output: '', exitCode: 1, error: result.error };
      }

      if (multipleFiles) {
        outputs.push(`==> ${file} <==`);
      }

      const lines = result.value.split('\n');
      outputs.push(lines.slice(-numLines).join('\n'));
    }

    if (follow) {
      outputs.push('\x1b[90m[tail -f simulated - press Ctrl+C to stop]\x1b[0m');
    }

    return { output: outputs.join('\n'), exitCode: 0 };
  },

  getCompletions(partial: string, ctx: CompletionContext): Completion[] {
    return ctx.vfs.getPathCompletions(partial);
  },
};

export const lessCommand: ShellCommand = {
  name: 'less',
  aliases: ['more'],
  description: 'View file contents with paging',
  usage: 'less [FILE]',

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const content = args.positional.length === 0 && ctx.stdin
      ? ctx.stdin
      : null;

    if (content !== null) {
      return {
        output: content + '\n\x1b[7m(END)\x1b[0m',
        exitCode: 0,
      };
    }

    if (args.positional.length === 0) {
      return { output: '', exitCode: 0 };
    }

    const file = args.positional[0];
    const result = ctx.vfs.readFile(file);
    if (!result.ok) {
      return { output: '', exitCode: 1, error: result.error };
    }

    return {
      output: result.value + '\n\x1b[7m(END)\x1b[0m',
      exitCode: 0,
    };
  },

  getCompletions(partial: string, ctx: CompletionContext): Completion[] {
    return ctx.vfs.getPathCompletions(partial);
  },
};

export const wcCommand: ShellCommand = {
  name: 'wc',
  description: 'Print line, word, and byte counts',
  usage: 'wc [OPTIONS] [FILE...]',
  options: [
    { short: 'l', long: 'lines', description: 'Print the newline counts' },
    { short: 'w', long: 'words', description: 'Print the word counts' },
    { short: 'c', long: 'bytes', description: 'Print the byte counts' },
    { short: 'm', long: 'chars', description: 'Print the character counts' },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const showLines = args.flags['l'] || args.flags['lines'];
    const showWords = args.flags['w'] || args.flags['words'];
    const showBytes = args.flags['c'] || args.flags['bytes'];
    const showChars = args.flags['m'] || args.flags['chars'];
    const showAll = !showLines && !showWords && !showBytes && !showChars;

    function count(content: string): { lines: number; words: number; bytes: number; chars: number } {
      const lines = content.split('\n').length - (content.endsWith('\n') ? 1 : 0);
      const words = content.trim().split(/\s+/).filter(w => w).length;
      const bytes = new TextEncoder().encode(content).length;
      const chars = content.length;
      return { lines, words, bytes, chars };
    }

    function formatCounts(c: { lines: number; words: number; bytes: number; chars: number }, name?: string): string {
      const parts: string[] = [];
      if (showAll || showLines) parts.push(c.lines.toString().padStart(7));
      if (showAll || showWords) parts.push(c.words.toString().padStart(7));
      if (showAll || showBytes) parts.push(c.bytes.toString().padStart(7));
      if (showChars) parts.push(c.chars.toString().padStart(7));
      if (name) parts.push(` ${name}`);
      return parts.join(' ');
    }

    // Handle stdin
    if (args.positional.length === 0 && ctx.stdin) {
      const c = count(ctx.stdin);
      return { output: formatCounts(c), exitCode: 0 };
    }

    if (args.positional.length === 0) {
      return { output: '', exitCode: 0 };
    }

    const outputs: string[] = [];
    let totalLines = 0, totalWords = 0, totalBytes = 0, totalChars = 0;

    for (const file of args.positional) {
      const result = ctx.vfs.readFile(file);
      if (!result.ok) {
        return { output: '', exitCode: 1, error: result.error };
      }

      const c = count(result.value);
      totalLines += c.lines;
      totalWords += c.words;
      totalBytes += c.bytes;
      totalChars += c.chars;

      outputs.push(formatCounts(c, file));
    }

    if (args.positional.length > 1) {
      outputs.push(formatCounts({ lines: totalLines, words: totalWords, bytes: totalBytes, chars: totalChars }, 'total'));
    }

    return { output: outputs.join('\n'), exitCode: 0 };
  },

  getCompletions(partial: string, ctx: CompletionContext): Completion[] {
    return ctx.vfs.getPathCompletions(partial);
  },
};

export const touchCommand: ShellCommand = {
  name: 'touch',
  description: 'Create empty file or update timestamp',
  usage: 'touch FILE...',

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    if (args.positional.length === 0) {
      return { output: '', exitCode: 1, error: 'touch: missing file operand' };
    }

    for (const file of args.positional) {
      if (!ctx.vfs.exists(file)) {
        const result = ctx.vfs.writeFile(file, '');
        if (!result.ok) {
          return { output: '', exitCode: 1, error: result.error };
        }
      }
      // If file exists, we would update timestamp (simplified here)
    }

    return { output: '', exitCode: 0 };
  },

  getCompletions(partial: string, ctx: CompletionContext): Completion[] {
    return ctx.vfs.getPathCompletions(partial);
  },
};

export const mkdirCommand: ShellCommand = {
  name: 'mkdir',
  description: 'Create directories',
  usage: 'mkdir [OPTIONS] DIRECTORY...',
  options: [
    { short: 'p', long: 'parents', description: 'Make parent directories as needed' },
    { short: 'v', long: 'verbose', description: 'Print a message for each created directory' },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    if (args.positional.length === 0) {
      return { output: '', exitCode: 1, error: 'mkdir: missing operand' };
    }

    const recursive = args.flags['p'] || args.flags['parents'];
    const verbose = args.flags['v'] || args.flags['verbose'];
    const outputs: string[] = [];

    for (const dir of args.positional) {
      const result = ctx.vfs.mkdir(dir, recursive);
      if (!result.ok) {
        return { output: '', exitCode: 1, error: result.error };
      }
      if (verbose) {
        outputs.push(`mkdir: created directory '${dir}'`);
      }
    }

    return { output: outputs.join('\n'), exitCode: 0 };
  },

  getCompletions(partial: string, ctx: CompletionContext): Completion[] {
    return ctx.vfs.getPathCompletions(partial).filter(c => c.type === 'directory');
  },
};

export const rmCommand: ShellCommand = {
  name: 'rm',
  description: 'Remove files or directories',
  usage: 'rm [OPTIONS] FILE...',
  options: [
    { short: 'r', long: 'recursive', description: 'Remove directories and their contents recursively' },
    { short: 'f', long: 'force', description: 'Ignore nonexistent files, never prompt' },
    { short: 'v', long: 'verbose', description: 'Explain what is being done' },
    { short: 'i', description: 'Prompt before every removal' },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    if (args.positional.length === 0) {
      return { output: '', exitCode: 1, error: 'rm: missing operand' };
    }

    const recursive = args.flags['r'] || args.flags['R'] || args.flags['recursive'];
    const force = args.flags['f'] || args.flags['force'];
    const verbose = args.flags['v'] || args.flags['verbose'];
    const outputs: string[] = [];

    for (const file of args.positional) {
      if (!ctx.vfs.exists(file)) {
        if (!force) {
          return { output: '', exitCode: 1, error: `rm: cannot remove '${file}': No such file or directory` };
        }
        continue;
      }

      const result = ctx.vfs.remove(file, recursive);
      if (!result.ok) {
        if (!force) {
          return { output: '', exitCode: 1, error: result.error };
        }
        continue;
      }

      if (verbose) {
        outputs.push(`removed '${file}'`);
      }
    }

    return { output: outputs.join('\n'), exitCode: 0 };
  },

  getCompletions(partial: string, ctx: CompletionContext): Completion[] {
    return ctx.vfs.getPathCompletions(partial);
  },
};

export const cpCommand: ShellCommand = {
  name: 'cp',
  description: 'Copy files and directories',
  usage: 'cp [OPTIONS] SOURCE... DEST',
  options: [
    { short: 'r', long: 'recursive', description: 'Copy directories recursively' },
    { short: 'v', long: 'verbose', description: 'Explain what is being done' },
    { short: 'f', long: 'force', description: 'Overwrite existing files' },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    if (args.positional.length < 2) {
      return { output: '', exitCode: 1, error: 'cp: missing file operand' };
    }

    const recursive = args.flags['r'] || args.flags['R'] || args.flags['recursive'];
    const verbose = args.flags['v'] || args.flags['verbose'];
    const sources = args.positional.slice(0, -1);
    const dest = args.positional[args.positional.length - 1];
    const outputs: string[] = [];

    for (const src of sources) {
      const result = ctx.vfs.copy(src, dest, recursive);
      if (!result.ok) {
        return { output: '', exitCode: 1, error: result.error };
      }
      if (verbose) {
        outputs.push(`'${src}' -> '${dest}'`);
      }
    }

    return { output: outputs.join('\n'), exitCode: 0 };
  },

  getCompletions(partial: string, ctx: CompletionContext): Completion[] {
    return ctx.vfs.getPathCompletions(partial);
  },
};

export const mvCommand: ShellCommand = {
  name: 'mv',
  description: 'Move or rename files',
  usage: 'mv [OPTIONS] SOURCE... DEST',
  options: [
    { short: 'v', long: 'verbose', description: 'Explain what is being done' },
    { short: 'f', long: 'force', description: 'Do not prompt before overwriting' },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    if (args.positional.length < 2) {
      return { output: '', exitCode: 1, error: 'mv: missing file operand' };
    }

    const verbose = args.flags['v'] || args.flags['verbose'];
    const sources = args.positional.slice(0, -1);
    const dest = args.positional[args.positional.length - 1];
    const outputs: string[] = [];

    for (const src of sources) {
      const result = ctx.vfs.move(src, dest);
      if (!result.ok) {
        return { output: '', exitCode: 1, error: result.error };
      }
      if (verbose) {
        outputs.push(`renamed '${src}' -> '${dest}'`);
      }
    }

    return { output: outputs.join('\n'), exitCode: 0 };
  },

  getCompletions(partial: string, ctx: CompletionContext): Completion[] {
    return ctx.vfs.getPathCompletions(partial);
  },
};

export const chmodCommand: ShellCommand = {
  name: 'chmod',
  description: 'Change file permissions',
  usage: 'chmod MODE FILE...',
  options: [
    { short: 'R', long: 'recursive', description: 'Change files and directories recursively' },
    { short: 'v', long: 'verbose', description: 'Output a diagnostic for every file processed' },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    if (args.positional.length < 2) {
      return { output: '', exitCode: 1, error: 'chmod: missing operand' };
    }

    const mode = args.positional[0];
    const files = args.positional.slice(1);
    const verbose = args.flags['v'] || args.flags['verbose'];
    const outputs: string[] = [];

    for (const file of files) {
      const result = ctx.vfs.chmod(file, mode);
      if (!result.ok) {
        return { output: '', exitCode: 1, error: result.error };
      }
      if (verbose) {
        outputs.push(`mode of '${file}' changed to ${mode}`);
      }
    }

    return { output: outputs.join('\n'), exitCode: 0 };
  },

  getCompletions(partial: string, ctx: CompletionContext): Completion[] {
    return ctx.vfs.getPathCompletions(partial);
  },
};

export const fileOpsCommands: ShellCommand[] = [
  catCommand,
  headCommand,
  tailCommand,
  lessCommand,
  wcCommand,
  touchCommand,
  mkdirCommand,
  rmCommand,
  cpCommand,
  mvCommand,
  chmodCommand,
];
