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

    // Handle pipes
    if (trimmed.includes('|')) {
      return this.executePipeline(trimmed);
    }

    // Handle command chaining
    if (trimmed.includes('&&') || trimmed.includes('||') || trimmed.includes(';')) {
      return this.executeChain(trimmed);
    }

    // Single command execution
    return this.executeSingle(trimmed);
  }

  private executeSingle(input: string): CommandResult {
    // Expand aliases
    const expanded = this.expandAliases(input);

    // Expand environment variables
    const withEnv = this.expandEnvVars(expanded);

    // Parse command
    const parsed = this.parseCommand(withEnv);

    // Execute
    return this.executeCommand(parsed.command, parsed);
  }

  executeCommand(name: string, args: ParsedArgs): CommandResult {
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

  private executePipeline(input: string): CommandResult {
    const stages = input.split('|').map(s => s.trim());
    let stdin = '';

    for (let i = 0; i < stages.length; i++) {
      const expanded = this.expandAliases(stages[i]);
      const withEnv = this.expandEnvVars(expanded);
      const parsed = this.parseCommand(withEnv);

      const command = this.commands.get(parsed.command);
      if (!command) {
        return {
          output: '',
          exitCode: 127,
          error: `${parsed.command}: command not found`,
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

      const result = command.execute(parsed, ctx);

      if (result.exitCode !== 0) {
        this.state.exitCode = result.exitCode;
        return result;
      }

      stdin = result.output;
    }

    this.state.exitCode = 0;
    return { output: stdin, exitCode: 0 };
  }

  private executeChain(input: string): CommandResult {
    // Split by ;, &&, || while preserving the operators
    const parts: { cmd: string; operator: string }[] = [];
    let current = '';
    let i = 0;

    while (i < input.length) {
      if (input[i] === ';') {
        parts.push({ cmd: current.trim(), operator: ';' });
        current = '';
        i++;
      } else if (input[i] === '&' && input[i + 1] === '&') {
        parts.push({ cmd: current.trim(), operator: '&&' });
        current = '';
        i += 2;
      } else if (input[i] === '|' && input[i + 1] === '|') {
        parts.push({ cmd: current.trim(), operator: '||' });
        current = '';
        i += 2;
      } else {
        current += input[i];
        i++;
      }
    }
    if (current.trim()) {
      parts.push({ cmd: current.trim(), operator: '' });
    }

    let lastResult: CommandResult = { output: '', exitCode: 0 };
    const outputs: string[] = [];

    for (let j = 0; j < parts.length; j++) {
      const { cmd, operator } = parts[j];
      const prevOperator = j > 0 ? parts[j - 1].operator : '';

      // Check if we should execute based on previous result
      if (prevOperator === '&&' && lastResult.exitCode !== 0) {
        continue;
      }
      if (prevOperator === '||' && lastResult.exitCode === 0) {
        continue;
      }

      lastResult = this.executeSingle(cmd);
      if (lastResult.output) {
        outputs.push(lastResult.output);
      }
      if (lastResult.error) {
        outputs.push(lastResult.error);
      }
    }

    return {
      output: outputs.join('\n'),
      exitCode: lastResult.exitCode,
    };
  }

  // ============================================================================
  // Parsing
  // ============================================================================

  parseCommand(input: string): ParsedArgs {
    const tokens = this.tokenize(input);
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
    const tokens: string[] = [];
    let current = '';
    let inQuote: string | null = null;
    let escape = false;

    for (let i = 0; i < input.length; i++) {
      const char = input[i];

      if (escape) {
        current += char;
        escape = false;
        continue;
      }

      if (char === '\\') {
        escape = true;
        continue;
      }

      if (char === '"' || char === "'") {
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
        if (current) {
          tokens.push(current);
          current = '';
        }
        continue;
      }

      current += char;
    }

    if (current) {
      tokens.push(current);
    }

    return tokens;
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
