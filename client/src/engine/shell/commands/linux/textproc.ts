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
    { short: 'w', long: 'word-regexp', description: 'Match only whole words' },
    { short: 'o', long: 'only-matching', description: 'Print only the matched parts of a line' },
    { short: 'E', long: 'extended-regexp', description: 'Interpret pattern as extended regular expression' },
    { short: 'A', long: 'after-context', description: 'Print NUM lines of trailing context', takesValue: true },
    { short: 'B', long: 'before-context', description: 'Print NUM lines of leading context', takesValue: true },
    { short: 'C', long: 'context', description: 'Print NUM lines of context', takesValue: true },
    { short: 'H', description: 'Print the file name for each match' },
    { short: 'h', description: 'Suppress the file name prefix' },
    { long: 'color', description: 'Highlight matching text' },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const pattern = args.positional[0];
    if (pattern === undefined) {
      return {
        output: '',
        exitCode: 2,
        error: "usage: grep [OPTION]... PATTERNS [FILE...]\nTry 'grep --help' for more information.",
      };
    }

    const ignoreCase = !!(args.flags['i'] || args.flags['ignore-case']);
    // Coerce to a real boolean: the match test below is `matches !== invert`,
    // so an `undefined` here would make every non-matching line "match".
    const invert = !!(args.flags['v'] || args.flags['invert-match']);
    const showLineNumbers = !!(args.flags['n'] || args.flags['line-number']);
    const countOnly = !!(args.flags['c'] || args.flags['count']);
    const recursive = !!(args.flags['r'] || args.flags['R'] || args.flags['recursive']);
    const filesOnly = !!(args.flags['l'] || args.flags['files-with-matches']);
    const wordMatch = !!(args.flags['w'] || args.flags['word-regexp']);
    const onlyMatching = !!(args.flags['o'] || args.flags['only-matching']);
    // Like real grep, only colorize when writing to a terminal. Piped or
    // redirected output must stay clean so wc/sort/cut see plain text.
    const colorize = ctx.isTty !== false;
    const contextNum = parseInt(args.options['C'] || args.options['context'] || '0', 10) || 0;
    const after = parseInt(args.options['A'] || args.options['after-context'] || '0', 10) || contextNum;
    const before = parseInt(args.options['B'] || args.options['before-context'] || '0', 10) || contextNum;

    const regexSource = wordMatch ? `\\b(?:${pattern})\\b` : pattern;
    let regex: RegExp;
    let highlight: RegExp;
    try {
      regex = new RegExp(regexSource, ignoreCase ? 'i' : '');
      highlight = new RegExp(regexSource, ignoreCase ? 'gi' : 'g');
    } catch (e) {
      return { output: '', exitCode: 2, error: `grep: Invalid regular expression` };
    }

    const results: string[] = [];
    const errors: string[] = [];
    let totalMatches = 0;

    function searchContent(content: string, fileName: string, showFile: boolean): void {
      const lines = content.split('\n');
      // Trailing newline produces a phantom empty last "line" — drop it.
      if (lines.length > 0 && lines[lines.length - 1] === '') {
        lines.pop();
      }

      const matchIdx: number[] = [];
      for (let i = 0; i < lines.length; i++) {
        if (regex.test(lines[i]) !== invert) {
          matchIdx.push(i);
        }
      }
      totalMatches += matchIdx.length;

      if (filesOnly) {
        if (matchIdx.length > 0) results.push(fileName);
        return;
      }
      if (countOnly) {
        results.push(showFile ? `${fileName}:${matchIdx.length}` : matchIdx.length.toString());
        return;
      }

      // -o prints each match on its own line (used to extract IPs, tokens,
      // etc. before piping into sort | uniq -c). Context is ignored.
      if (onlyMatching && !invert) {
        const globalRe = new RegExp(regexSource, ignoreCase ? 'gi' : 'g');
        for (const idx of matchIdx) {
          let m: RegExpExecArray | null;
          globalRe.lastIndex = 0;
          while ((m = globalRe.exec(lines[idx])) !== null) {
            const piece = colorize ? `${COLORS.red}${m[0]}${COLORS.reset}` : m[0];
            const filePart = showFile
              ? (colorize ? `${COLORS.magenta}${fileName}${COLORS.reset}:` : `${fileName}:`)
              : '';
            const numPart = showLineNumbers
              ? (colorize ? `${COLORS.green}${idx + 1}${COLORS.reset}:` : `${idx + 1}:`)
              : '';
            results.push(filePart + numPart + piece);
            // Guard against zero-width matches spinning forever.
            if (m.index === globalRe.lastIndex) globalRe.lastIndex++;
          }
        }
        return;
      }

      const isMatch = new Set(matchIdx);
      // Which lines to print: matches plus surrounding context.
      const toPrint = new Set<number>();
      for (const idx of matchIdx) {
        for (let j = Math.max(0, idx - before); j <= Math.min(lines.length - 1, idx + after); j++) {
          toPrint.add(j);
        }
      }

      const sorted = Array.from(toPrint).sort((a, b) => a - b);
      let prev = -2;
      for (const i of sorted) {
        // Real grep prints `--` between non-adjacent context groups.
        if ((before > 0 || after > 0) && prev >= 0 && i > prev + 1) {
          results.push('--');
        }
        prev = i;

        const line = lines[i];
        const match = isMatch.has(i);
        // Context lines use `-` separators, match lines use `:`.
        const sep = match ? ':' : '-';

        let output = line;
        if (colorize && match && !invert) {
          output = line.replace(highlight, m => `${COLORS.red}${m}${COLORS.reset}`);
        }

        const filePart = showFile
          ? (colorize ? `${COLORS.magenta}${fileName}${COLORS.reset}${sep}` : `${fileName}${sep}`)
          : '';
        const numPart = showLineNumbers
          ? (colorize ? `${COLORS.green}${i + 1}${COLORS.reset}${sep}` : `${i + 1}${sep}`)
          : '';

        results.push(filePart + numPart + output);
      }
    }

    // Recursively collect files under a directory, keeping the display path
    // relative to what the user typed (grep -r x logs -> logs/app.log:...).
    function collectFiles(displayPath: string, out: string[]): void {
      const dir = ctx.vfs.readDirectory(displayPath);
      if (!dir.ok) return;
      const entries = [...dir.value].sort((a, b) => a.name.localeCompare(b.name));
      for (const entry of entries) {
        const childPath = displayPath === '/' ? `/${entry.name}` : `${displayPath.replace(/\/$/, '')}/${entry.name}`;
        if (entry.type === 'directory') {
          collectFiles(childPath, out);
        } else {
          out.push(childPath);
        }
      }
    }

    const fileArgs = args.positional.slice(1);
    if (fileArgs.length === 0 && !recursive) {
      if (ctx.stdin !== undefined) {
        searchContent(ctx.stdin, '(standard input)', false);
        return { output: results.join('\n'), exitCode: totalMatches > 0 ? 0 : 1 };
      }
      // Real grep would wait for terminal input here; we can't.
      return {
        output: '',
        exitCode: 2,
        error: "usage: grep [OPTION]... PATTERNS [FILE...]\nTry 'grep --help' for more information.",
      };
    }

    // `grep -r PATTERN` with no path searches the current directory.
    const searchArgs = fileArgs.length > 0 ? fileArgs : ['.'];
    const fileList: string[] = [];
    for (const file of searchArgs) {
      if (ctx.vfs.isDirectory(ctx.vfs.resolvePath(file))) {
        if (recursive) {
          collectFiles(file, fileList);
        } else {
          errors.push(`grep: ${file}: Is a directory`);
        }
      } else if (!ctx.vfs.exists(ctx.vfs.resolvePath(file))) {
        errors.push(`grep: ${file}: No such file or directory`);
      } else {
        fileList.push(file);
      }
    }

    const showFile = !args.flags['h'] && (fileList.length > 1 || !!args.flags['H'] || recursive);

    for (const file of fileList) {
      const result = ctx.vfs.readFile(file);
      if (!result.ok) {
        errors.push(`grep: ${file}: Permission denied`);
        continue;
      }
      searchContent(result.value, file, showFile);
    }

    return {
      output: results.join('\n'),
      exitCode: errors.length > 0 ? 2 : totalMatches > 0 ? 0 : 1,
      error: errors.length > 0 ? errors.join('\n') : undefined,
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
    let namePattern: RegExp | null = null;
    let typeFilter: string | null = null;
    let maxDepth = Infinity;

    // find's `-name`/`-type` predicates are single-dash LONG words that the
    // generic getopt parser would shred into `-n -a -m -e`. Re-tokenize the
    // raw input (quote-aware) and parse the expression ourselves.
    const tokens: string[] = [];
    {
      let cur = '';
      let quote: string | null = null;
      let started = false;
      for (const ch of args.raw) {
        if (quote) {
          if (ch === quote) { quote = null; continue; }
          cur += ch;
          continue;
        }
        if (ch === '"' || ch === "'") { quote = ch; started = true; continue; }
        if (ch === ' ') {
          if (started || cur) { tokens.push(cur); cur = ''; started = false; }
          continue;
        }
        cur += ch;
        started = true;
      }
      if (started || cur) tokens.push(cur);
    }

    const posTokens = tokens.slice(1); // drop the 'find' itself
    const paths: string[] = [];
    let i = 0;

    // Collect start paths (everything before the first predicate)
    while (i < posTokens.length && !posTokens[i].startsWith('-')) {
      paths.push(posTokens[i]);
      i++;
    }
    if (paths.length === 0) paths.push('.');

    // Parse predicates
    while (i < posTokens.length) {
      const opt = posTokens[i];
      if ((opt === '-name' || opt === '-iname') && i + 1 < posTokens.length) {
        const pattern = posTokens[++i]
          .replace(/[.+^${}()|[\]\\]/g, '\\$&')
          .replace(/\*/g, '.*')
          .replace(/\?/g, '.');
        // -name is case-sensitive; only -iname folds case, like real find.
        namePattern = new RegExp(`^${pattern}$`, opt === '-iname' ? 'i' : '');
      } else if (opt === '-type' && i + 1 < posTokens.length) {
        typeFilter = posTokens[++i];
      } else if (opt === '-maxdepth' && i + 1 < posTokens.length) {
        maxDepth = parseInt(posTokens[++i], 10);
      } else if (opt.startsWith('-')) {
        return {
          output: '',
          exitCode: 1,
          error: `find: unknown predicate '${opt}'`,
        };
      }
      i++;
    }

    const results: string[] = [];
    const errors: string[] = [];

    // Real find echoes paths relative to what you typed: `find . -name x`
    // prints `./logs/x`, not `/home/user/logs/x`.
    function search(displayPath: string, depth: number): void {
      if (depth > maxDepth) return;

      const dirResult = ctx.vfs.readDirectory(displayPath);
      if (!dirResult.ok) return;

      const entries = [...dirResult.value].sort((a, b) => a.name.localeCompare(b.name));
      for (const entry of entries) {
        const fullPath = `${displayPath.replace(/\/$/, '')}/${entry.name}`;

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
      if (!ctx.vfs.exists(resolved)) {
        errors.push(`find: '${path}': No such file or directory`);
        continue;
      }
      // Include the starting path itself if it passes the filters.
      const baseName = ctx.vfs.basename(resolved);
      const baseIsDir = ctx.vfs.isDirectory(resolved);
      let baseMatch = true;
      if (namePattern && !namePattern.test(baseName)) baseMatch = false;
      if (typeFilter === 'f' && baseIsDir) baseMatch = false;
      if (typeFilter === 'd' && !baseIsDir) baseMatch = false;
      if (baseMatch) {
        results.push(path);
      }
      if (baseIsDir) {
        search(path, 1);
      }
    }

    return {
      output: results.join('\n'),
      exitCode: errors.length > 0 ? 1 : 0,
      error: errors.length > 0 ? errors.join('\n') : undefined,
    };
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
    { short: 't', long: 'field-separator', description: 'Use SEP instead of whitespace', takesValue: true },
    { short: 'k', long: 'key', description: 'Sort via a key; KEYDEF is F[.C][OPTS]', takesValue: true },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const reverse = args.flags['r'] || args.flags['reverse'];
    const numeric = args.flags['n'] || args.flags['numeric-sort'];
    const unique = args.flags['u'] || args.flags['unique'];
    const ignoreCase = args.flags['f'] || args.flags['ignore-case'];
    const sep = args.options['t'] || args.options['field-separator'];
    const keySpec = args.options['k'] || args.options['key'];

    // -k F[,F][n][r]: which field to sort on, plus per-key modifiers.
    let keyField: number | null = null;
    let keyNumeric = numeric;
    let keyReverse = reverse;
    if (keySpec) {
      const m = keySpec.match(/^(\d+)/);
      if (m) keyField = parseInt(m[1], 10);
      if (/n/.test(keySpec)) keyNumeric = true;
      if (/r/.test(keySpec)) keyReverse = true;
    }

    // Split a line into fields the way sort does: with -t on that char,
    // otherwise on runs of whitespace (leading blanks ignored).
    const fieldOf = (line: string): string => {
      if (keyField === null) return line;
      const parts = sep !== undefined ? line.split(sep) : line.trim().split(/\s+/);
      return parts[keyField - 1] ?? '';
    };

    let content = '';

    if (args.positional.length === 0) {
      if (ctx.stdin !== undefined) {
        content = ctx.stdin;
      } else {
        return { output: '', exitCode: 0 };
      }
    } else {
      for (const file of args.positional) {
        const result = ctx.vfs.readFile(file);
        if (!result.ok) {
          return { output: '', exitCode: 1, error: `sort: cannot read: ${file}: No such file or directory` };
        }
        content += result.value + (result.value.endsWith('\n') ? '' : '\n');
      }
    }

    let lines = content.split('\n').filter(l => l !== '');

    // Sort
    lines.sort((a, b) => {
      const rawA = fieldOf(a);
      const rawB = fieldOf(b);

      let result: number;
      if (keyNumeric) {
        result = (parseFloat(rawA) || 0) - (parseFloat(rawB) || 0);
      } else {
        const cmpA = ignoreCase ? rawA.toLowerCase() : rawA;
        const cmpB = ignoreCase ? rawB.toLowerCase() : rawB;
        result = cmpA.localeCompare(cmpB);
      }
      return keyReverse ? -result : result;
    });

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

    const format = args.positional[0];
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

/** Read a command's input: joined file contents, or stdin, or ''. */
function readInput(args: ParsedArgs, ctx: ExecutionContext, files: string[]): { content: string; error?: string } {
  if (files.length === 0) {
    return { content: ctx.stdin ?? '' };
  }
  let content = '';
  for (const file of files) {
    const result = ctx.vfs.readFile(file);
    if (!result.ok) {
      return { content: '', error: `${file}: No such file or directory` };
    }
    content += result.value + (result.value.endsWith('\n') ? '' : '\n');
  }
  return { content };
}

export const sedCommand: ShellCommand = {
  name: 'sed',
  description: 'Stream editor for filtering and transforming text',
  usage: 'sed [OPTIONS] SCRIPT [FILE...]',
  options: [
    { short: 'n', long: 'quiet', description: 'Suppress automatic printing of pattern space' },
    { short: 'e', long: 'expression', description: 'Add the script to the commands to be executed', takesValue: true },
    { short: 'E', description: 'Use extended regular expressions' },
    { short: 'r', description: 'Use extended regular expressions' },
    { short: 'i', long: 'in-place', description: 'Edit files in place' },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const quiet = !!(args.flags['n'] || args.flags['quiet']);
    const inPlace = !!(args.flags['i'] || args.flags['in-place']);

    // The script can come from -e or from the first positional argument.
    const scripts: string[] = [];
    if (args.options['e']) scripts.push(args.options['e']);
    if (args.options['expression']) scripts.push(args.options['expression']);

    const positional = [...args.positional];
    if (scripts.length === 0) {
      const script = positional.shift();
      if (script === undefined) {
        return { output: '', exitCode: 1, error: 'usage: sed [OPTION]... {script} [input-file]...' };
      }
      scripts.push(script);
    }
    const files = positional;

    // Parse each script fragment into an operation. Multiple `;`-separated
    // commands within one fragment are supported.
    type Op =
      | { kind: 'subst'; re: RegExp; repl: string; global: boolean; print: boolean }
      | { kind: 'print'; re: RegExp }
      | { kind: 'deleteRe'; re: RegExp }
      | { kind: 'deleteLine'; line: number };

    const ops: Op[] = [];
    const flags = (args.flags['E'] || args.flags['r']) ? '' : ''; // JS regex is already ERE-like
    void flags;

    for (const fragment of scripts) {
      for (const raw of fragment.split(';')) {
        const cmd = raw.trim();
        if (!cmd) continue;

        // s/pattern/replacement/flags   (any delimiter after s)
        const s = cmd.match(/^s(.)(.*)$/);
        if (cmd.startsWith('s') && s) {
          const delim = s[1];
          const rest = s[2];
          const parts: string[] = [];
          let buf = '';
          for (let k = 0; k < rest.length; k++) {
            if (rest[k] === '\\' && rest[k + 1] === delim) { buf += delim; k++; continue; }
            if (rest[k] === delim) { parts.push(buf); buf = ''; continue; }
            buf += rest[k];
          }
          parts.push(buf);
          const [pat, repl, sflags = ''] = parts;
          try {
            ops.push({
              kind: 'subst',
              re: new RegExp(pat, sflags.includes('g') || sflags.includes('i')
                ? (sflags.includes('g') ? 'g' : '') + (sflags.includes('i') ? 'i' : '')
                : ''),
              repl: repl.replace(/\\(\d)/g, '$$$1'), // \1 -> $1 backrefs
              global: sflags.includes('g'),
              print: sflags.includes('p'),
            });
          } catch {
            return { output: '', exitCode: 1, error: `sed: -e expression: unknown regex` };
          }
          continue;
        }

        // /regex/d  or  /regex/p
        const reCmd = cmd.match(/^\/(.*)\/([dp])$/);
        if (reCmd) {
          try {
            const re = new RegExp(reCmd[1]);
            ops.push(reCmd[2] === 'd' ? { kind: 'deleteRe', re } : { kind: 'print', re });
          } catch {
            return { output: '', exitCode: 1, error: `sed: -e expression: unknown regex` };
          }
          continue;
        }

        // Nd  (delete line number N)
        const lineDel = cmd.match(/^(\d+)d$/);
        if (lineDel) {
          ops.push({ kind: 'deleteLine', line: parseInt(lineDel[1], 10) });
          continue;
        }

        return { output: '', exitCode: 1, error: `sed: -e expression #1, char 1: unknown command: \`${cmd[0]}'` };
      }
    }

    const runOn = (content: string): string => {
      const hadTrailing = content.endsWith('\n');
      const lines = content.split('\n');
      if (hadTrailing) lines.pop();

      const out: string[] = [];
      for (let idx = 0; idx < lines.length; idx++) {
        let line = lines[idx];
        let deleted = false;
        let explicitPrint = false;

        for (const op of ops) {
          if (op.kind === 'subst') {
            const re = new RegExp(op.re.source, op.re.flags);
            if (re.test(line)) {
              line = line.replace(op.global ? re : new RegExp(op.re.source, op.re.flags.replace('g', '')), op.repl);
              if (op.print) explicitPrint = true;
            }
          } else if (op.kind === 'print') {
            if (op.re.test(line)) explicitPrint = true;
          } else if (op.kind === 'deleteRe') {
            if (op.re.test(line)) deleted = true;
          } else if (op.kind === 'deleteLine') {
            if (idx + 1 === op.line) deleted = true;
          }
        }

        if (deleted) continue;
        // In -n mode nothing prints unless a `p` flag/command asked for it.
        if (quiet) {
          if (explicitPrint) out.push(line);
        } else {
          out.push(line);
          if (explicitPrint) out.push(line); // p on a non-n line prints twice
        }
      }
      return out.join('\n');
    };

    const input = readInput(args, ctx, files);
    if (input.error) {
      return { output: '', exitCode: 2, error: `sed: can't read ${input.error}` };
    }

    // -i writes each file back instead of printing.
    if (inPlace && files.length > 0) {
      for (const file of files) {
        const read = ctx.vfs.readFile(file);
        if (!read.ok) continue;
        const edited = runOn(read.value.endsWith('\n') ? read.value : read.value + '\n');
        ctx.vfs.writeFile(file, edited + (edited ? '\n' : ''));
      }
      return { output: '', exitCode: 0 };
    }

    return { output: runOn(input.content), exitCode: 0 };
  },

  getCompletions(partial: string, ctx: CompletionContext): Completion[] {
    return ctx.vfs.getPathCompletions(partial);
  },
};

export const awkCommand: ShellCommand = {
  name: 'awk',
  description: 'Pattern scanning and text processing language',
  usage: "awk [-F sep] 'program' [FILE...]",
  options: [
    { short: 'F', description: 'Set the input field separator', takesValue: true },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const positional = [...args.positional];
    const program = positional.shift();
    if (program === undefined) {
      return { output: '', exitCode: 2, error: 'usage: awk [-F fs] \'prog\' [file ...]' };
    }
    const files = positional;

    // Field separator: -F',' or -F ',' — default is whitespace runs.
    const fsOpt = args.options['F'];
    const splitFields = (line: string): string[] => {
      if (fsOpt === undefined) return line.trim() === '' ? [] : line.trim().split(/\s+/);
      if (fsOpt === ' ') return line.trim() === '' ? [] : line.trim().split(/\s+/);
      // Treat a single char literally; longer separators as regex.
      const re = new RegExp(fsOpt.length === 1 ? fsOpt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : fsOpt);
      return line.split(re);
    };

    // Split "END { ... }" off the front/back; keep the main rule.
    let mainRule = program.trim();
    let endAction: string | null = null;
    let beginAction: string | null = null;
    const endMatch = mainRule.match(/\bEND\s*\{([^}]*)\}/);
    if (endMatch) {
      endAction = endMatch[1].trim();
      mainRule = mainRule.replace(endMatch[0], '').trim();
    }
    const beginMatch = mainRule.match(/\bBEGIN\s*\{([^}]*)\}/);
    if (beginMatch) {
      beginAction = beginMatch[1].trim();
      mainRule = mainRule.replace(beginMatch[0], '').trim();
    }

    // Main rule = optional pattern + optional { action }. A program made up of
    // only BEGIN/END blocks has NO per-record rule, so nothing prints per line.
    let pattern = '';
    let action = '';
    const hasMainRule = mainRule.trim() !== '';
    const braceIdx = mainRule.indexOf('{');
    if (braceIdx >= 0) {
      pattern = mainRule.slice(0, braceIdx).trim();
      action = mainRule.slice(braceIdx + 1, mainRule.lastIndexOf('}')).trim();
    } else {
      pattern = mainRule.trim();
    }

    const input = readInput(args, ctx, files);
    if (input.error) {
      return { output: '', exitCode: 2, error: `awk: can't open file ${input.error.split(':')[0]}` };
    }

    const hadTrailing = input.content.endsWith('\n');
    const allLines = input.content.split('\n');
    if (hadTrailing) allLines.pop();

    const out: string[] = [];
    let NR = 0;
    const emptyInput = input.content === '';

    // Evaluate a pattern against the current record. Supports /re/, !/re/,
    // $N (op) "str"/num, $N ~ /re/, NR/NF comparisons, and bare truthy exprs.
    const testPattern = (pat: string, fields: string[], nf: number): boolean => {
      if (pat === '') return true;

      const reOnly = pat.match(/^!?\/(.*)\/$/);
      if (reOnly) {
        const neg = pat.startsWith('!');
        const hit = new RegExp(reOnly[1]).test(fields.join(' ') || '');
        return neg ? !hit : hit;
      }

      // $N ~ /re/   or   $N !~ /re/
      const reCmp = pat.match(/^\$(\w+)\s*(!?~)\s*\/(.*)\/$/);
      if (reCmp) {
        const val = fieldValue(reCmp[1], fields, nf);
        const hit = new RegExp(reCmp[3]).test(val);
        return reCmp[2] === '~' ? hit : !hit;
      }

      // left OP right  (==, !=, <, >, <=, >=)
      const cmp = pat.match(/^(.+?)\s*(==|!=|<=|>=|<|>)\s*(.+)$/);
      if (cmp) {
        const left = operandValue(cmp[1].trim(), fields, nf);
        const right = operandValue(cmp[3].trim(), fields, nf);
        const bothNum = !isNaN(Number(left)) && !isNaN(Number(right));
        const l: number | string = bothNum ? Number(left) : left;
        const r: number | string = bothNum ? Number(right) : right;
        switch (cmp[2]) {
          case '==': return l === r;
          case '!=': return l !== r;
          case '<': return l < r;
          case '>': return l > r;
          case '<=': return l <= r;
          case '>=': return l >= r;
        }
      }

      // Bare expression: truthy if non-empty / non-zero.
      const v = operandValue(pat, fields, nf);
      return v !== '' && v !== '0';
    };

    function fieldValue(ref: string, fields: string[], nf: number): string {
      if (ref === '0') return fields.join(fsOpt && fsOpt !== ' ' ? fsOpt : ' ');
      if (ref === 'NF') return fields[nf - 1] ?? '';
      const n = parseInt(ref, 10);
      if (!isNaN(n)) return fields[n - 1] ?? '';
      return '';
    }

    function operandValue(tok: string, fields: string[], nf: number): string {
      tok = tok.trim();
      if (tok === 'NR') return String(NR);
      if (tok === 'NF') return String(nf);
      if (tok.startsWith('$')) return fieldValue(tok.slice(1), fields, nf);
      const str = tok.match(/^"(.*)"$/);
      if (str) return str[1];
      return tok; // bare number/identifier
    }

    // Run a `print ...` action and append to out.
    const runAction = (act: string, fields: string[], nf: number): void => {
      const a = act.trim();
      if (a === '' || a === 'print' || a === 'print $0') {
        out.push(fields.join(fsOpt && fsOpt !== ' ' ? fsOpt : ' ') || (nf === 0 ? '' : ''));
        return;
      }
      const printMatch = a.match(/^print\s+(.*)$/);
      if (printMatch) {
        // Comma-separated args joined by OFS (space); adjacent args concatenate.
        const pieces = splitTopLevel(printMatch[1], ',').map(seg => {
          return splitTopLevel(seg, ' ')
            .filter(t => t !== '')
            .map(t => operandValue(t, fields, nf))
            .join('');
        });
        out.push(pieces.join(' '));
        return;
      }
      // Unknown action: print the record (closest sensible fallback).
      out.push(fields.join(' '));
    };

    if (beginAction) runAction(beginAction, [], 0);

    if (!emptyInput) {
      for (const line of allLines) {
        NR++;
        const fields = splitFields(line);
        const nf = fields.length;
        if (hasMainRule && testPattern(pattern, fields, nf)) {
          runAction(action, fields, nf);
        }
      }
    }

    if (endAction) {
      // END sees the final NR; fields are those of the last record.
      const lastFields = allLines.length ? splitFields(allLines[allLines.length - 1]) : [];
      runAction(endAction, lastFields, lastFields.length);
    }

    return { output: out.join('\n'), exitCode: 0 };
  },

  getCompletions(partial: string, ctx: CompletionContext): Completion[] {
    return ctx.vfs.getPathCompletions(partial);
  },
};

/** Split a string on a delimiter char, but not inside quotes or /regex/. */
function splitTopLevel(input: string, delim: string): string[] {
  const parts: string[] = [];
  let buf = '';
  let quote: string | null = null;
  let inRe = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quote) {
      buf += c;
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") { quote = c; buf += c; continue; }
    if (c === '/') { inRe = !inRe; buf += c; continue; }
    if (c === delim && !inRe) { parts.push(buf); buf = ''; continue; }
    buf += c;
  }
  parts.push(buf);
  return parts.map(p => p.trim());
}

export const textProcCommands: ShellCommand[] = [
  grepCommand,
  findCommand,
  sortCommand,
  uniqCommand,
  cutCommand,
  echoCommand,
  printfCommand,
  sedCommand,
  awkCommand,
];
