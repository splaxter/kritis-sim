/**
 * Shell Engine - Command parsing, execution, and shell features
 */

import {
  ShellEngineInterface,
  ShellState,
  ShellCommand,
  ParsedArgs,
  CommandResult,
  ExecutionContext,
  Completion,
  HistoryEntry,
  VirtualFilesystemInterface,
  CompletionContext,
} from './types';

export class ShellEngine implements ShellEngineInterface {
  private vfs: VirtualFilesystemInterface;
  private commands: Map<string, ShellCommand> = new Map();
  private aliases: Map<string, string> = new Map();
  private state: ShellState;

  constructor(
    vfs: VirtualFilesystemInterface,
    shellType: 'bash' | 'powershell' = 'bash'
  ) {
    this.vfs = vfs;
    this.state = {
      type: shellType,
      history: [],
      historyIndex: -1,
      aliases: {},
      exitCode: 0,
      env: {},
    };

    // Default aliases
    if (shellType === 'bash') {
      this.aliases.set('ll', 'ls -la');
      this.aliases.set('la', 'ls -a');
      this.aliases.set('l', 'ls -CF');
      this.aliases.set('..', 'cd ..');
      this.aliases.set('...', 'cd ../..');
    }
  }

  // ============================================================================
  // Command Registration
  // ============================================================================

  registerCommand(command: ShellCommand): void {
    this.commands.set(command.name, command);
    if (command.aliases) {
      for (const alias of command.aliases) {
        this.commands.set(alias, command);
      }
    }
  }

  registerCommands(commands: ShellCommand[]): void {
    for (const cmd of commands) {
      this.registerCommand(cmd);
    }
  }

  getCommand(name: string): ShellCommand | undefined {
    return this.commands.get(name);
  }

  getAllCommands(): ShellCommand[] {
    // Get unique commands (exclude aliases pointing to same command)
    const seen = new Set<ShellCommand>();
    const result: ShellCommand[] = [];
    for (const cmd of this.commands.values()) {
      if (!seen.has(cmd)) {
        seen.add(cmd);
        result.push(cmd);
      }
    }
    return result;
  }

  // ============================================================================
  // Execution
  // ============================================================================

  execute(input: string): CommandResult {
    const trimmed = input.trim();

    if (!trimmed) {
      return { output: '', exitCode: 0 };
    }

    // Command chaining (;, &&, ||) has the lowest precedence, so split it first.
    // A single segment with no operators falls through to executePipeline.
    return this.executeChain(trimmed);
  }

  private executeChain(input: string): CommandResult {
    // Split into segments, recording the operator that PRECEDES each segment.
    const segments = this.splitChain(input);

    let lastResult: CommandResult = { output: '', exitCode: 0 };
    const outputs: string[] = [];
    let executedAny = false;

    for (const { cmd, operator } of segments) {
      // Short-circuit based on the operator before this segment.
      if (operator === '&&' && lastResult.exitCode !== 0) {
        continue;
      }
      if (operator === '||' && lastResult.exitCode === 0) {
        continue;
      }

      lastResult = this.executePipeline(cmd);
      executedAny = true;
      if (lastResult.output) {
        outputs.push(lastResult.output);
      }
      if (lastResult.error) {
        outputs.push(lastResult.error);
      }
    }

    // Single command (no chaining): preserve the raw result, including its
    // error field, so callers can render stderr separately from stdout.
    if (segments.length === 1 && executedAny) {
      return lastResult;
    }

    return {
      output: outputs.join('\n'),
      exitCode: lastResult.exitCode,
    };
  }

  private executePipeline(input: string): CommandResult {
    const stages = this.splitPipes(input);

    let stdin = '';
    let result: CommandResult = { output: '', exitCode: 0 };

    for (let i = 0; i < stages.length; i++) {
      result = this.executeStage(stages[i], stdin);

      if (result.exitCode !== 0) {
        this.state.exitCode = result.exitCode;
        return result;
      }

      stdin = result.output;
    }

    this.state.exitCode = result.exitCode;
    return result;
  }

  /**
   * Run a single simple command: expand aliases/env vars, apply I/O
   * redirection (`<`, `>`, `>>`), then execute. `pipedStdin` is the output of
   * the previous pipeline stage (overridden by an explicit `< file`).
   */
  private executeStage(input: string, pipedStdin: string): CommandResult {
    const expanded = this.expandAliases(input);
    const withEnv = this.expandEnvVars(expanded);
    const { command: cmdString, redirects } = this.parseRedirection(withEnv);

    let stdin = pipedStdin;

    // Input redirection: `< file` feeds the file as stdin.
    const inRedirect = redirects.find(r => r.type === '<');
    if (inRedirect) {
      const path = this.vfs.resolvePath(inRedirect.file);
      const read = this.vfs.readFile(path);
      if (!read.ok) {
        return { output: '', exitCode: 1, error: `bash: ${inRedirect.file}: ${read.error}` };
      }
      stdin = read.value;
    }

    const parsed = this.parseCommand(cmdString);
    const result = this.executeCommand(parsed.command, parsed, stdin);

    // Output redirection: `>` truncates, `>>` appends. Only stdout is
    // redirected; stderr (result.error) still flows to the terminal.
    const outRedirects = redirects.filter(r => r.type === '>' || r.type === '>>');
    if (outRedirects.length > 0) {
      // bash applies multiple redirects but only the last one ends up with the
      // content; earlier targets are created/truncated empty.
      for (let i = 0; i < outRedirects.length; i++) {
        const rd = outRedirects[i];
        const isLast = i === outRedirects.length - 1;
        const content = isLast ? this.ensureTrailingNewline(result.output) : '';
        const path = this.vfs.resolvePath(rd.file);
        const write = rd.type === '>>'
          ? this.vfs.appendFile(path, content)
          : this.vfs.writeFile(path, content);
        if (!write.ok) {
          return { output: '', exitCode: 1, error: `bash: ${rd.file}: ${write.error}` };
        }
      }
      // stdout was redirected; nothing prints, but stderr/exit code remain.
      return { output: '', exitCode: result.exitCode, error: result.error };
    }

    return result;
  }

  executeCommand(name: string, args: ParsedArgs, stdin?: string): CommandResult {
    const command = this.commands.get(name);

    if (!command) {
      return {
        output: '',
        exitCode: 127,
        error: `${name}: command not found`,
      };
    }

    const ctx: ExecutionContext = {
      vfs: this.vfs,
      env: { ...this.state.env },
      stdin,
      shell: this.state,
      cwd: this.vfs.getCurrentPath(),
      user: this.vfs.getUser(),
    };

    try {
      const result = command.execute(args, ctx);
      this.state.exitCode = result.exitCode;
      return result;
    } catch (error) {
      return {
        output: '',
        exitCode: 1,
        error: `${name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // ============================================================================
  // Quote-aware operator splitting
  // ============================================================================

  /** Split on `;`, `&&`, `||` outside quotes, tagging each segment with the operator before it. */
  private splitChain(input: string): { cmd: string; operator: string }[] {
    const segments: { cmd: string; operator: string }[] = [];
    let current = '';
    let pendingOp = '';
    let quote: string | null = null;

    for (let i = 0; i < input.length; i++) {
      const char = input[i];

      if (quote) {
        current += char;
        if (char === quote) quote = null;
        continue;
      }
      if (char === '"' || char === "'") {
        quote = char;
        current += char;
        continue;
      }

      if (char === ';') {
        segments.push({ cmd: current.trim(), operator: pendingOp });
        pendingOp = ';';
        current = '';
        continue;
      }
      if (char === '&' && input[i + 1] === '&') {
        segments.push({ cmd: current.trim(), operator: pendingOp });
        pendingOp = '&&';
        current = '';
        i++;
        continue;
      }
      if (char === '|' && input[i + 1] === '|') {
        segments.push({ cmd: current.trim(), operator: pendingOp });
        pendingOp = '||';
        current = '';
        i++;
        continue;
      }

      current += char;
    }

    segments.push({ cmd: current.trim(), operator: pendingOp });
    return segments.filter(s => s.cmd.length > 0);
  }

  /** Split on a single `|` (not `||`) outside quotes. */
  private splitPipes(input: string): string[] {
    const parts: string[] = [];
    let current = '';
    let quote: string | null = null;

    for (let i = 0; i < input.length; i++) {
      const char = input[i];

      if (quote) {
        current += char;
        if (char === quote) quote = null;
        continue;
      }
      if (char === '"' || char === "'") {
        quote = char;
        current += char;
        continue;
      }

      if (char === '|') {
        // `||` is a chain operator handled upstream, not a pipe.
        if (input[i + 1] === '|') {
          current += '||';
          i++;
          continue;
        }
        parts.push(current.trim());
        current = '';
        continue;
      }

      current += char;
    }

    parts.push(current.trim());
    const stages = parts.filter(s => s.length > 0);
    return stages.length > 0 ? stages : [''];
  }

  /**
   * Extract `<`, `>`, `>>` redirections from a simple command, returning the
   * command with redirections stripped plus the list of redirect targets.
   * Quote-aware so `echo ">"` is not treated as a redirect.
   */
  parseRedirection(input: string): { command: string; redirects: { type: '<' | '>' | '>>'; file: string }[] } {
    const redirects: { type: '<' | '>' | '>>'; file: string }[] = [];
    let command = '';
    let quote: string | null = null;
    let i = 0;

    while (i < input.length) {
      const char = input[i];

      if (quote) {
        command += char;
        if (char === quote) quote = null;
        i++;
        continue;
      }
      if (char === '"' || char === "'") {
        quote = char;
        command += char;
        i++;
        continue;
      }

      if (char === '>' || char === '<') {
        let type: '<' | '>' | '>>' = char as '<' | '>';
        i++;
        if (char === '>' && input[i] === '>') {
          type = '>>';
          i++;
        }
        // Skip whitespace between operator and filename.
        while (input[i] === ' ') i++;
        // Read the filename token (quote-aware, stops at space or next operator).
        let file = '';
        let fileQuote: string | null = null;
        while (i < input.length) {
          const fc = input[i];
          if (fileQuote) {
            if (fc === fileQuote) { fileQuote = null; i++; continue; }
            file += fc;
            i++;
            continue;
          }
          if (fc === '"' || fc === "'") { fileQuote = fc; i++; continue; }
          if (fc === ' ' || fc === '>' || fc === '<') break;
          file += fc;
          i++;
        }
        if (file) {
          redirects.push({ type, file });
        }
        continue;
      }

      command += char;
      i++;
    }

    return { command: command.trim(), redirects };
  }

  private ensureTrailingNewline(text: string): string {
    if (text === '' || text.endsWith('\n')) return text;
    return text + '\n';
  }

  // ============================================================================
  // Parsing
  // ============================================================================

  parseCommand(input: string): ParsedArgs {
    const richTokens = this.tokenizeRich(input);
    // Glob-expand unquoted tokens containing wildcards (skip the command name).
    const tokens: string[] = [];
    richTokens.forEach((tok, index) => {
      if (index > 0 && !tok.quoted && /[*?]/.test(tok.value)) {
        tokens.push(...this.expandGlob(tok.value));
      } else {
        tokens.push(tok.value);
      }
    });
    const command = tokens[0] || '';
    const positional: string[] = [];
    const flags: Record<string, boolean> = {};
    const options: Record<string, string> = {};

    let i = 1;
    while (i < tokens.length) {
      const token = tokens[i];

      if (token.startsWith('--')) {
        // Long option
        const [key, value] = token.slice(2).split('=');
        if (value !== undefined) {
          options[key] = value;
        } else if (i + 1 < tokens.length && !tokens[i + 1].startsWith('-')) {
          // Check if next token is a value
          const nextToken = tokens[i + 1];
          // Simple heuristic: if command expects value for this option
          // For now, just set as flag
          flags[key] = true;
        } else {
          flags[key] = true;
        }
      } else if (token.startsWith('-') && token.length > 1) {
        // Short option(s)
        const chars = token.slice(1);
        for (let j = 0; j < chars.length; j++) {
          const char = chars[j];
          // Check if it's an option with value (e.g., -n10 or -n 10)
          if (j === chars.length - 1 && i + 1 < tokens.length && !tokens[i + 1].startsWith('-')) {
            // Could be a value for this option
            // For simplicity, we'll handle common cases
            const nextToken = tokens[i + 1];
            if (/^\d+$/.test(nextToken) || !nextToken.startsWith('-')) {
              // Likely a value
              options[char] = nextToken;
              i++;
              break;
            }
          }
          flags[char] = true;
        }
      } else {
        // Positional argument
        positional.push(token);
      }
      i++;
    }

    return {
      command,
      positional,
      flags,
      options,
      raw: input,
    };
  }

  private tokenize(input: string): string[] {
    return this.tokenizeRich(input).map(t => t.value);
  }

  /**
   * Like tokenize, but records whether each token was (at least partly) quoted.
   * Quoted tokens are exempt from glob expansion, matching shell behaviour
   * (e.g. `grep "a*b" file` must not expand `a*b`).
   */
  private tokenizeRich(input: string): { value: string; quoted: boolean }[] {
    const tokens: { value: string; quoted: boolean }[] = [];
    let current = '';
    let started = false;
    let quotedSoFar = false;
    let inQuote: string | null = null;
    let escape = false;

    const flush = () => {
      if (started) {
        tokens.push({ value: current, quoted: quotedSoFar });
        current = '';
        started = false;
        quotedSoFar = false;
      }
    };

    for (let i = 0; i < input.length; i++) {
      const char = input[i];

      if (escape) {
        current += char;
        started = true;
        // A backslash-escaped wildcard is literal, like a quoted one.
        if (char === '*' || char === '?') quotedSoFar = true;
        escape = false;
        continue;
      }

      if (char === '\\') {
        escape = true;
        continue;
      }

      if (char === '"' || char === "'") {
        started = true;
        quotedSoFar = true;
        if (inQuote === char) {
          inQuote = null;
        } else if (!inQuote) {
          inQuote = char;
        } else {
          current += char;
        }
        continue;
      }

      if (char === ' ' && !inQuote) {
        flush();
        continue;
      }

      current += char;
      started = true;
    }

    flush();
    return tokens;
  }

  /** Expand a glob pattern to matching paths, preserving the directory prefix. */
  private expandGlob(token: string): string[] {
    const matches = this.vfs.glob(token);
    // VFS.glob returns the original pattern unchanged when nothing matches;
    // in that case bash leaves the literal pattern in place.
    if (matches.length === 1 && matches[0] === token) {
      return [token];
    }
    // glob() returns absolute paths; re-attach the pattern's directory prefix
    // so `*.txt` expands to bare names and `logs/*.log` keeps the `logs/` part.
    const slash = token.lastIndexOf('/');
    const prefix = slash >= 0 ? token.slice(0, slash + 1) : '';
    return matches.map(m => prefix + this.vfs.basename(m)).sort();
  }

  private expandAliases(input: string): string {
    const parts = input.split(/\s+/);
    const cmd = parts[0];

    if (this.aliases.has(cmd)) {
      parts[0] = this.aliases.get(cmd)!;
      return parts.join(' ');
    }

    return input;
  }

  private expandEnvVars(input: string): string {
    // $VAR or ${VAR}
    return input
      .replace(/\$\{(\w+)\}/g, (_, name) => this.vfs.getEnv(name) || this.state.env[name] || '')
      .replace(/\$(\w+)/g, (_, name) => this.vfs.getEnv(name) || this.state.env[name] || '');
  }

  // ============================================================================
  // Completion
  // ============================================================================

  complete(input: string, cursorPos: number): Completion[] {
    const beforeCursor = input.slice(0, cursorPos);
    const tokens = this.tokenize(beforeCursor);

    // Empty input - show all commands
    if (tokens.length === 0 || (tokens.length === 1 && !beforeCursor.endsWith(' '))) {
      const prefix = tokens[0] || '';
      return this.getCommandCompletions(prefix);
    }

    // Completing arguments
    const currentArg = beforeCursor.endsWith(' ') ? '' : tokens[tokens.length - 1];
    const commandName = tokens[0];
    const command = this.commands.get(commandName);

    const ctx: CompletionContext = {
      vfs: this.vfs,
      input,
      cursorPos,
      args: tokens.slice(1),
      argIndex: beforeCursor.endsWith(' ') ? tokens.length - 1 : tokens.length - 2,
      currentArg,
    };

    // Check if completing an option
    if (currentArg.startsWith('-')) {
      return this.getOptionCompletions(currentArg, command);
    }

    // Try command-specific completion
    if (command?.getCompletions) {
      const completions = command.getCompletions(currentArg, ctx);
      if (completions.length > 0) {
        return completions;
      }
    }

    // Default to path completion
    return this.vfs.getPathCompletions(currentArg);
  }

  private getCommandCompletions(prefix: string): Completion[] {
    const seen = new Set<string>();
    const completions: Completion[] = [];

    for (const [name, cmd] of this.commands.entries()) {
      if (name.toLowerCase().startsWith(prefix.toLowerCase()) && !seen.has(name)) {
        seen.add(name);
        completions.push({
          value: name,
          display: name,
          type: 'command',
          description: cmd.description,
        });
      }
    }

    // Also include aliases
    for (const [alias] of this.aliases) {
      if (alias.toLowerCase().startsWith(prefix.toLowerCase()) && !seen.has(alias)) {
        seen.add(alias);
        completions.push({
          value: alias,
          display: alias,
          type: 'command',
          description: `Alias for: ${this.aliases.get(alias)}`,
        });
      }
    }

    return completions.sort((a, b) => a.value.localeCompare(b.value));
  }

  private getOptionCompletions(partial: string, command?: ShellCommand): Completion[] {
    if (!command?.options) return [];

    const isLong = partial.startsWith('--');
    const prefix = isLong ? partial.slice(2) : partial.slice(1);

    return command.options
      .filter(opt => {
        if (isLong && opt.long) {
          return opt.long.startsWith(prefix);
        }
        if (!isLong && opt.short) {
          return opt.short.startsWith(prefix);
        }
        return false;
      })
      .map(opt => ({
        value: isLong ? `--${opt.long}` : `-${opt.short}`,
        display: isLong ? `--${opt.long}` : `-${opt.short}`,
        type: 'option' as const,
        description: opt.description,
      }));
  }

  // ============================================================================
  // History
  // ============================================================================

  addToHistory(command: string): void {
    const trimmed = command.trim();
    if (!trimmed) return;

    // Don't add duplicates of the last command
    if (this.state.history.length > 0 &&
        this.state.history[this.state.history.length - 1].command === trimmed) {
      return;
    }

    this.state.history.push({
      command: trimmed,
      timestamp: new Date(),
    });

    // Keep history limited
    if (this.state.history.length > 1000) {
      this.state.history.shift();
    }

    // Reset navigation index
    this.state.historyIndex = this.state.history.length;
  }

  getHistory(): HistoryEntry[] {
    return [...this.state.history];
  }

  navigateHistory(direction: 'up' | 'down'): string | undefined {
    if (this.state.history.length === 0) return undefined;

    if (direction === 'up') {
      if (this.state.historyIndex > 0) {
        this.state.historyIndex--;
        return this.state.history[this.state.historyIndex].command;
      }
    } else {
      if (this.state.historyIndex < this.state.history.length - 1) {
        this.state.historyIndex++;
        return this.state.history[this.state.historyIndex].command;
      } else {
        this.state.historyIndex = this.state.history.length;
        return '';
      }
    }

    return undefined;
  }

  searchHistory(query: string): HistoryEntry[] {
    return this.state.history.filter(entry =>
      entry.command.includes(query)
    );
  }

  // ============================================================================
  // State
  // ============================================================================

  getState(): ShellState {
    return { ...this.state };
  }

  getVfs(): VirtualFilesystemInterface {
    return this.vfs;
  }

  getEnv(): Record<string, string> {
    return { ...this.state.env };
  }

  setEnv(key: string, value: string): void {
    this.state.env[key] = value;
    this.vfs.setEnv(key, value);
  }

  setAlias(name: string, value: string): void {
    this.aliases.set(name, value);
    this.state.aliases[name] = value;
  }

  removeAlias(name: string): boolean {
    const had = this.aliases.has(name);
    this.aliases.delete(name);
    delete this.state.aliases[name];
    return had;
  }
}
