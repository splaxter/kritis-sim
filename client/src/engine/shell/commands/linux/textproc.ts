/**
 * Linux Text Processing and Search Commands
 * grep, find, sort, uniq, cut, echo, printf
 */

import { ShellCommand, ParsedArgs, ExecutionContext, CommandResult, Completion, CompletionContext } from '../../types';

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

export const grepCommand: ShellCommand = {
  name: 'grep',
  description: 'Search for patterns in files',
  usage: 'grep [OPTIONS] PATTERN [FILE...]',
  options: [
    { short: 'i', long: 'ignore-case', description: 'Ignore case distinctions' },
    { short: 'v', long: 'invert-match', description: 'Select non-matching lines' },
    { short: 'n', long: 'line-number', description: 'Print line number with output lines' },
    { short: 'c', long: 'count', description: 'Print only a count of matching lines' },
    { short: 'r', long: 'recursive', description: 'Read all files under each directory recursively' },
    { short: 'l', long: 'files-with-matches', description: 'Print only names of files with matches' },
    { short: 'H', description: 'Print the file name for each match' },
    { short: 'h', description: 'Suppress the file name prefix' },
    { long: 'color', description: 'Highlight matching text' },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const pattern = args.positional[0];
    if (!pattern) {
      return { output: '', exitCode: 2, error: 'grep: missing pattern' };
    }

    const ignoreCase = args.flags['i'] || args.flags['ignore-case'];
    const invert = args.flags['v'] || args.flags['invert-match'];
    const showLineNumbers = args.flags['n'] || args.flags['line-number'];
    const countOnly = args.flags['c'] || args.flags['count'];
    const recursive = args.flags['r'] || args.flags['R'] || args.flags['recursive'];
    const filesOnly = args.flags['l'] || args.flags['files-with-matches'];
    const colorize = args.flags['color'] !== false;

    let regex: RegExp;
    try {
      regex = new RegExp(pattern, ignoreCase ? 'gi' : 'g');
    } catch (e) {
      return { output: '', exitCode: 2, error: `grep: invalid pattern '${pattern}'` };
    }

    const files = args.positional.slice(1);
    const results: string[] = [];
    let totalMatches = 0;

    function searchContent(content: string, fileName: string, showFile: boolean): void {
      const lines = content.split('\n');
      let fileMatches = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const matches = regex.test(line);
        regex.lastIndex = 0; // Reset regex state

        if (matches !== invert) {
          fileMatches++;
          totalMatches++;

          if (countOnly) continue;
          if (filesOnly) {
            results.push(fileName);
            return;
          }

          let output = line;
          if (colorize && !invert) {
            output = line.replace(new RegExp(pattern, ignoreCase ? 'gi' : 'g'),
              match => `${COLORS.red}${match}${COLORS.reset}`);
          }

          const prefix = [
            showFile ? `${COLORS.magenta}${fileName}${COLORS.reset}:` : '',
            showLineNumbers ? `${COLORS.green}${i + 1}${COLORS.reset}:` : '',
          ].filter(Boolean).join('');

          results.push(prefix + output);
        }
      }

      if (countOnly) {
        results.push(showFile ? `${fileName}:${fileMatches}` : fileMatches.toString());
      }
    }

    // Handle stdin
    if (files.length === 0) {
      if (ctx.stdin) {
        searchContent(ctx.stdin, '(standard input)', false);
      } else {
        return { output: '', exitCode: 2, error: 'grep: no files specified' };
      }
    } else {
      const showFile = files.length > 1 || args.flags['H'];
      const hideFile = args.flags['h'];

      for (const file of files) {
        const result = ctx.vfs.readFile(file);
        if (!result.ok) {
          results.push(`grep: ${file}: No such file or directory`);
          continue;
        }
        searchContent(result.value, file, showFile && !hideFile);
      }
    }

    return {
      output: results.join('\n'),
      exitCode: totalMatches > 0 ? 0 : 1,
    };
  },

  getCompletions(partial: string, ctx: CompletionContext): Completion[] {
    // After pattern, complete file paths
    if (ctx.argIndex > 0) {
      return ctx.vfs.getPathCompletions(partial);
    }
    return [];
  },
};

export const findCommand: ShellCommand = {
  name: 'find',
  description: 'Search for files in a directory hierarchy',
  usage: 'find [PATH...] [EXPRESSION]',
  options: [
    { short: 'name', description: 'Match file name pattern', takesValue: true },
    { short: 'type', description: 'Match file type (f=file, d=directory)', takesValue: true },
    { short: 'maxdepth', description: 'Maximum depth to search', takesValue: true },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    let paths = ['.'];
    let namePattern: RegExp | null = null;
    let typeFilter: string | null = null;
    let maxDepth = Infinity;

    // Parse arguments
    const posArgs = args.positional;
    let i = 0;

    // Collect paths (before any -option)
    while (i < posArgs.length && !posArgs[i].startsWith('-')) {
      paths = i === 0 ? [posArgs[i]] : [...paths.slice(0, -1), posArgs[i]];
      i++;
    }
    if (paths.length === 0) paths = ['.'];

    // Parse options
    while (i < posArgs.length) {
      const opt = posArgs[i];
      if (opt === '-name' && i + 1 < posArgs.length) {
        const pattern = posArgs[++i]
          .replace(/\*/g, '.*')
          .replace(/\?/g, '.');
        namePattern = new RegExp(`^${pattern}$`, 'i');
      } else if (opt === '-type' && i + 1 < posArgs.length) {
        typeFilter = posArgs[++i];
      } else if (opt === '-maxdepth' && i + 1 < posArgs.length) {
        maxDepth = parseInt(posArgs[++i], 10);
      }
      i++;
    }

    const results: string[] = [];

    function search(dirPath: string, depth: number): void {
      if (depth > maxDepth) return;

      const dirResult = ctx.vfs.readDirectory(dirPath);
      if (!dirResult.ok) return;

      for (const entry of dirResult.value) {
        const fullPath = ctx.vfs.join(dirPath, entry.name);

        // Apply filters
        let match = true;

        if (namePattern && !namePattern.test(entry.name)) {
          match = false;
        }

        if (typeFilter) {
          if (typeFilter === 'f' && entry.type !== 'file') match = false;
          if (typeFilter === 'd' && entry.type !== 'directory') match = false;
        }

        if (match) {
          results.push(fullPath);
        }

        if (entry.type === 'directory') {
          search(fullPath, depth + 1);
        }
      }
    }

    for (const path of paths) {
      const resolved = ctx.vfs.resolvePath(path);
      // Include the starting path if it matches
      if (ctx.vfs.isDirectory(resolved)) {
        results.push(resolved);
        search(resolved, 1);
      } else if (ctx.vfs.exists(resolved)) {
        results.push(resolved);
      }
    }

    return { output: results.join('\n'), exitCode: 0 };
  },

  getCompletions(partial: string, ctx: CompletionContext): Completion[] {
    return ctx.vfs.getPathCompletions(partial).filter(c => c.type === 'directory');
  },
};

export const sortCommand: ShellCommand = {
  name: 'sort',
  description: 'Sort lines of text',
  usage: 'sort [OPTIONS] [FILE...]',
  options: [
    { short: 'r', long: 'reverse', description: 'Reverse the result of comparisons' },
    { short: 'n', long: 'numeric-sort', description: 'Compare according to string numerical value' },
    { short: 'u', long: 'unique', description: 'Output only unique lines' },
    { short: 'f', long: 'ignore-case', description: 'Fold lower case to upper case characters' },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const reverse = args.flags['r'] || args.flags['reverse'];
    const numeric = args.flags['n'] || args.flags['numeric-sort'];
    const unique = args.flags['u'] || args.flags['unique'];
    const ignoreCase = args.flags['f'] || args.flags['ignore-case'];

    let content = '';

    if (args.positional.length === 0) {
      if (ctx.stdin) {
        content = ctx.stdin;
      } else {
        return { output: '', exitCode: 0 };
      }
    } else {
      for (const file of args.positional) {
        const result = ctx.vfs.readFile(file);
        if (!result.ok) {
          return { output: '', exitCode: 1, error: result.error };
        }
        content += result.value + '\n';
      }
    }

    let lines = content.split('\n').filter(l => l !== '');

    // Sort
    lines.sort((a, b) => {
      let cmpA = ignoreCase ? a.toLowerCase() : a;
      let cmpB = ignoreCase ? b.toLowerCase() : b;

      if (numeric) {
        const numA = parseFloat(a) || 0;
        const numB = parseFloat(b) || 0;
        return numA - numB;
      }

      return cmpA.localeCompare(cmpB);
    });

    if (reverse) {
      lines.reverse();
    }

    if (unique) {
      lines = [...new Set(lines)];
    }

    return { output: lines.join('\n'), exitCode: 0 };
  },

  getCompletions(partial: string, ctx: CompletionContext): Completion[] {
    return ctx.vfs.getPathCompletions(partial);
  },
};

export const uniqCommand: ShellCommand = {
  name: 'uniq',
  description: 'Report or omit repeated lines',
  usage: 'uniq [OPTIONS] [INPUT [OUTPUT]]',
  options: [
    { short: 'c', long: 'count', description: 'Prefix lines by the number of occurrences' },
    { short: 'd', long: 'repeated', description: 'Only print duplicate lines' },
    { short: 'u', description: 'Only print unique lines' },
    { short: 'i', long: 'ignore-case', description: 'Ignore differences in case' },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const showCount = args.flags['c'] || args.flags['count'];
    const onlyRepeated = args.flags['d'] || args.flags['repeated'];
    const onlyUnique = args.flags['u'];
    const ignoreCase = args.flags['i'] || args.flags['ignore-case'];

    let content = '';

    if (args.positional.length === 0) {
      if (ctx.stdin) {
        content = ctx.stdin;
      } else {
        return { output: '', exitCode: 0 };
      }
    } else {
      const result = ctx.vfs.readFile(args.positional[0]);
      if (!result.ok) {
        return { output: '', exitCode: 1, error: result.error };
      }
      content = result.value;
    }

    const lines = content.split('\n');
    const results: string[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const compareLine = ignoreCase ? line.toLowerCase() : line;
      let count = 1;

      while (i + count < lines.length) {
        const nextLine = ignoreCase ? lines[i + count].toLowerCase() : lines[i + count];
        if (nextLine === compareLine) {
          count++;
        } else {
          break;
        }
      }

      const isRepeated = count > 1;

      if (onlyRepeated && !isRepeated) {
        i += count;
        continue;
      }
      if (onlyUnique && isRepeated) {
        i += count;
        continue;
      }

      if (showCount) {
        results.push(`${count.toString().padStart(7)} ${line}`);
      } else {
        results.push(line);
      }

      i += count;
    }

    return { output: results.join('\n'), exitCode: 0 };
  },

  getCompletions(partial: string, ctx: CompletionContext): Completion[] {
    return ctx.vfs.getPathCompletions(partial);
  },
};

export const cutCommand: ShellCommand = {
  name: 'cut',
  description: 'Remove sections from each line',
  usage: 'cut [OPTIONS] [FILE...]',
  options: [
    { short: 'd', long: 'delimiter', description: 'Use DELIM instead of TAB', takesValue: true },
    { short: 'f', long: 'fields', description: 'Select only these fields', takesValue: true },
    { short: 'c', long: 'characters', description: 'Select only these characters', takesValue: true },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const delimiter = args.options['d'] || args.options['delimiter'] || '\t';
    const fields = args.options['f'] || args.options['fields'];
    const chars = args.options['c'] || args.options['characters'];

    if (!fields && !chars) {
      return { output: '', exitCode: 1, error: 'cut: you must specify a list of bytes, characters, or fields' };
    }

    function parseRanges(spec: string): number[] {
      const indices: Set<number> = new Set();
      const parts = spec.split(',');

      for (const part of parts) {
        if (part.includes('-')) {
          const [start, end] = part.split('-').map(s => s ? parseInt(s, 10) : null);
          const s = start || 1;
          const e = end || 1000; // Max reasonable
          for (let i = s; i <= e; i++) {
            indices.add(i);
          }
        } else {
          indices.add(parseInt(part, 10));
        }
      }

      return Array.from(indices).sort((a, b) => a - b);
    }

    let content = '';

    if (args.positional.length === 0) {
      if (ctx.stdin) {
        content = ctx.stdin;
      } else {
        return { output: '', exitCode: 0 };
      }
    } else {
      for (const file of args.positional) {
        const result = ctx.vfs.readFile(file);
        if (!result.ok) {
          return { output: '', exitCode: 1, error: result.error };
        }
        content += result.value + '\n';
      }
    }

    const lines = content.split('\n');
    const results: string[] = [];

    for (const line of lines) {
      if (fields) {
        const indices = parseRanges(fields);
        const parts = line.split(delimiter);
        const selected = indices
          .filter(i => i > 0 && i <= parts.length)
          .map(i => parts[i - 1]);
        results.push(selected.join(delimiter));
      } else if (chars) {
        const indices = parseRanges(chars);
        const selected = indices
          .filter(i => i > 0 && i <= line.length)
          .map(i => line[i - 1]);
        results.push(selected.join(''));
      }
    }

    return { output: results.join('\n'), exitCode: 0 };
  },

  getCompletions(partial: string, ctx: CompletionContext): Completion[] {
    return ctx.vfs.getPathCompletions(partial);
  },
};

export const echoCommand: ShellCommand = {
  name: 'echo',
  description: 'Display a line of text',
  usage: 'echo [OPTIONS] [STRING...]',
  options: [
    { short: 'n', description: 'Do not output the trailing newline' },
    { short: 'e', description: 'Enable interpretation of backslash escapes' },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const noNewline = args.flags['n'];
    const interpretEscapes = args.flags['e'];

    let output = args.positional.join(' ');

    if (interpretEscapes) {
      output = output
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\r/g, '\r')
        .replace(/\\\\/g, '\\');
    }

    if (!noNewline) {
      output += '';
    }

    return { output, exitCode: 0 };
  },
};

export const printfCommand: ShellCommand = {
  name: 'printf',
  description: 'Format and print data',
  usage: 'printf FORMAT [ARGUMENT...]',

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    if (args.positional.length === 0) {
      return { output: '', exitCode: 1, error: 'printf: missing format string' };
    }

    let format = args.positional[0];
    const values = args.positional.slice(1);

    // Simple printf implementation
    let output = format;
    let valueIndex = 0;

    output = output.replace(/%([sdf])/g, (_, type) => {
      const value = values[valueIndex++] || '';
      switch (type) {
        case 's': return value;
        case 'd': return parseInt(value, 10).toString();
        case 'f': return parseFloat(value).toString();
        default: return value;
      }
    });

    // Handle escape sequences
    output = output
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\r/g, '\r')
      .replace(/\\\\/g, '\\');

    return { output, exitCode: 0 };
  },
};

export const textProcCommands: ShellCommand[] = [
  grepCommand,
  findCommand,
  sortCommand,
  uniqCommand,
  cutCommand,
  echoCommand,
  printfCommand,
];
