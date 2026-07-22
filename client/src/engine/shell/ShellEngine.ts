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
  AnsibleRunRecord,
  AnsibleRunMode,
  CommandAttempt,
} from './types';
import { HostState, wrapVfsAsHost } from './hosts';

export class ShellEngine implements ShellEngineInterface {
  private commands: Map<string, ShellCommand> = new Map();
  private aliases: Map<string, string> = new Map();
  private state: ShellState;
  private termCols = 80;
  private hosts = new Map<string, HostState>();
  /** Bottom entry is the local session; ssh pushes, exit pops (never below 1). */
  private sessionStack: { hostId: string; user: string }[] = [];
  /** Successful SSH logins as `${hostId}::${method}`; survives session pop. */
  private loginRecords = new Set<string>();
  /** Every ansible-playbook invocation (playbook stored as basename). */
  private ansibleRuns: AnsibleRunRecord[] = [];
  /** Set while a command waits for another input line (password prompt etc.). */
  private pendingContinuation: ((line: string) => CommandResult) | null = null;
  private pendingPrompt: { prompt: string; mask: boolean } | null = null;
  /** One CommandAttempt per outer player command, in issue order. */
  private executionLog: CommandAttempt[] = [];
  /** Re-entry counter: only the outermost execute (0→1) opens an attempt. */
  private executionDepth = 0;
  /** Monotonic, 1-based attempt sequence. */
  private attemptSeq = 0;
  /**
   * The attempt of the current/most-recent outer command. Stays non-null across
   * password prompts (execute→continueInput) until finalised, so it is NOT tied
   * to executionDepth.
   */
  private openAttempt: CommandAttempt | null = null;

  constructor(
    vfs: VirtualFilesystemInterface,
    shellType: 'bash' | 'powershell' = 'bash'
  ) {
    const local = wrapVfsAsHost(vfs);
    this.hosts.set(local.id, local);
    this.sessionStack.push({ hostId: local.id, user: vfs.getUser() });
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

  execute(input: string, initialStdin?: string): CommandResult {
    // While an input line is owed, refuse to run anything: re-show the prompt.
    // Callers should route the line through continueInput instead.
    if (this.pendingContinuation) {
      return { output: '', exitCode: 1, pendingInput: { ...this.pendingPrompt! } };
    }

    const trimmed = input.trim();

    if (!trimmed) {
      return { output: '', exitCode: 0 };
    }

    // Only the outermost execute opens an attempt. Internal re-entries
    // (sudo/source via ctx.execute) run at depth ≥1 and reuse the open attempt.
    const outer = this.executionDepth === 0;
    if (outer) {
      const hostId = this.getCurrentHost().id;
      this.openAttempt = {
        command: trimmed,
        sequence: ++this.attemptSeq,
        hostBefore: hostId,
        hostAfter: hostId,
        exitCode: 0,
      };
    }
    this.executionDepth++;
    try {
      // Command chaining (;, &&, ||) has the lowest precedence, so split it
      // first. A single segment with no operators falls through to
      // executePipeline. initialStdin lets a wrapper (sudo) forward its own
      // piped stdin so `echo x | sudo tee f` reaches tee — the first stage
      // would otherwise get no stdin.
      const result = this.executeChain(trimmed, initialStdin);
      if (outer) this.settleAttempt(result);
      return result;
    } catch (err) {
      // Defensive: an unexpected throw in the stage plumbing (not a command,
      // which executeCommand already catches) must still close the attempt —
      // one entry per outer command, always. Degrades to a failed entry.
      if (outer) this.closeOpenAttempt(1);
      throw err;
    } finally {
      this.executionDepth--;
    }
  }

  /** Snapshot of the execution log (one entry per finalised outer command). */
  getExecutionLog(): CommandAttempt[] {
    return [...this.executionLog];
  }

  /** Close the open attempt with an explicit exit code (host captured now). */
  private closeOpenAttempt(exitCode: number): void {
    if (!this.openAttempt) return;
    this.openAttempt.exitCode = exitCode;
    this.openAttempt.hostAfter = this.getCurrentHost().id;
    this.executionLog.push(this.openAttempt);
    this.openAttempt = null;
  }

  /** Finalise the open attempt unless the command is still awaiting input. */
  private settleAttempt(result: CommandResult): void {
    if (!this.openAttempt) return;
    if (result.pendingInput) return; // stays open across the prompt
    this.closeOpenAttempt(result.exitCode);
  }

  private executeChain(input: string, initialStdin?: string): CommandResult {
    // Split into segments, recording the operator that PRECEDES each segment.
    const segments = this.splitChain(input);

    let lastResult: CommandResult = { output: '', exitCode: 0 };
    const outputs: string[] = [];
    let executedAny = false;
    // Forwarded stdin (from a sudo wrapper) feeds only the FIRST segment.
    let pendingInitialStdin = initialStdin;

    for (const { cmd, operator } of segments) {
      // Short-circuit based on the operator before this segment.
      if (operator === '&&' && lastResult.exitCode !== 0) {
        continue;
      }
      if (operator === '||' && lastResult.exitCode === 0) {
        continue;
      }

      lastResult = this.executePipeline(cmd, pendingInitialStdin);
      pendingInitialStdin = undefined;
      executedAny = true;
      if (lastResult.output) {
        outputs.push(lastResult.output);
      }
      if (lastResult.error) {
        outputs.push(lastResult.error);
      }
      // A command awaiting input aborts the remaining chain segments —
      // deviation from bash, but keeps hasPendingInput() ⟺ result.pendingInput.
      if (lastResult.pendingInput) {
        break;
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
      ...(lastResult.pendingInput ? { pendingInput: lastResult.pendingInput } : {}),
    };
  }

  private executePipeline(input: string, initialStdin?: string): CommandResult {
    const stages = this.splitPipes(input);

    // Real pipelines run EVERY stage, even when an earlier one fails:
    // `grep x missing.log | wc -l` prints grep's error on stderr AND wc's `0`.
    // A failing stage simply contributes empty stdout to the next stage.
    // The pipeline's exit code is the LAST stage's (bash without pipefail).
    // The first stage has NO stdin (undefined); later stages always have one,
    // even if it's empty — that difference matters to grep/wc/cat.
    let stdin: string | undefined = initialStdin;
    let result: CommandResult = { output: '', exitCode: 0 };
    const errors: string[] = [];

    for (let i = 0; i < stages.length; i++) {
      const isLast = i === stages.length - 1;
      result = this.executeStage(stages[i], stdin, isLast);
      if (result.error) {
        errors.push(result.error);
      }
      // A stage awaiting input aborts the pipeline: later stages never run.
      if (result.pendingInput) {
        this.state.exitCode = result.exitCode;
        return {
          ...result,
          error: errors.length > 0 ? errors.join('\n') : undefined,
        };
      }
      stdin = result.output;
    }

    this.state.exitCode = result.exitCode;
    return {
      ...result,
      error: errors.length > 0 ? errors.join('\n') : undefined,
    };
  }

  /**
   * Run a single simple command: expand aliases/env vars, apply I/O
   * redirection (`<`, `>`, `>>`), then execute. `pipedStdin` is the output of
   * the previous pipeline stage (overridden by an explicit `< file`).
   */
  private executeStage(input: string, pipedStdin: string | undefined, isLastStage = true): CommandResult {
    // Captured once: redirects apply on the host the stage STARTED on, even
    // when the command itself pops the session (e.g. `exit > file`).
    const vfs = this.getVfs();
    const expanded = this.expandAliases(input);
    const withEnv = this.expandEnvVars(expanded);
    const { command: cmdString, redirects } = this.parseRedirection(withEnv);

    // Bare `VAR=value` (no command) is a shell variable assignment. The value
    // must be a single word or quoted string — `VAR=1 cmd` is not handled here.
    const assignMatch = cmdString.match(/^(\w+)=("[^"]*"|'[^']*'|\S*)$/);
    if (assignMatch) {
      const [, name, rawValue] = assignMatch;
      // Strip one layer of quotes, like the shell would.
      const value = rawValue.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
      this.state.env[name] = value;
      vfs.setEnv(name, value);
      return { output: '', exitCode: 0 };
    }

    let stdin = pipedStdin;

    // Input redirection: `< file` feeds the file as stdin.
    const inRedirect = redirects.find(r => r.type === '<');
    if (inRedirect) {
      const path = vfs.resolvePath(inRedirect.file);
      const read = vfs.readFile(path);
      if (!read.ok) {
        return { output: '', exitCode: 1, error: `bash: ${inRedirect.file}: ${read.error}` };
      }
      stdin = read.value;
    }

    const parsed = this.parseCommand(cmdString);
    const hasStdoutRedirect = redirects.some(r => r.type === '>' || r.type === '>>');
    const isTty = isLastStage && !hasStdoutRedirect;
    const result = this.executeCommand(parsed.command, parsed, stdin, isTty);

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
        const path = vfs.resolvePath(rd.file);
        const write = rd.type === '>>'
          ? vfs.appendFile(path, content)
          : vfs.writeFile(path, content);
        if (!write.ok) {
          return { output: '', exitCode: 1, error: `bash: ${rd.file}: ${write.error}` };
        }
      }
      // stdout was redirected; nothing prints, but stderr/exit code remain.
      return { output: '', exitCode: result.exitCode, error: result.error };
    }

    return result;
  }

  executeCommand(name: string, args: ParsedArgs, stdin?: string, isTty = true): CommandResult {
    const canonical = this.resolveName(name);
    const command = this.commands.get(canonical);

    if (!command) {
      // Match the real shells' wording exactly.
      const error = this.state.type === 'powershell'
        ? `${name} : The term '${name}' is not recognized as the name of a cmdlet, function, script file, or operable program, or was misspelled.`
        : `bash: ${name}: command not found`;
      return {
        output: '',
        exitCode: 127,
        error,
      };
    }

    // Every real tool answers `--help` (bash) or `-?` (PowerShell); generate it
    // from the command metadata so players' reflexes work on all commands.
    if ((args.flags['help'] || args.flags['?']) && canonical !== 'help' && canonical !== 'Get-Help') {
      return { output: this.formatHelp(command), exitCode: 0 };
    }

    const vfs = this.getVfs();
    const ctx: ExecutionContext = {
      vfs,
      env: { ...this.state.env },
      stdin,
      shell: this.state,
      cwd: vfs.getCurrentPath(),
      user: vfs.getUser(),
      isTty,
      termCols: this.termCols,
      commands: this.commands,
      execute: (input: string, nestedStdin?: string) => this.execute(input, nestedStdin),
      host: this.getCurrentHost(),
      resolveHost: (nameOrIp: string) => this.resolveHost(nameOrIp),
      pushSession: (hostId: string, user: string, method?: 'publickey' | 'password') =>
        this.pushSession(hostId, user, method),
      popSession: () => {
        const closing = this.getCurrentHost();
        return this.popSession() ? { closedHostname: closing.hostname } : null;
      },
      sessionDepth: this.sessionStack.length,
      sessionSourceHost:
        this.sessionStack.length > 1
          ? this.hosts.get(this.sessionStack[this.sessionStack.length - 2].hostId)
          : undefined,
      recordAnsibleRun: (run: AnsibleRunRecord) => this.recordAnsibleRun(run),
      requestInput: (prompt: string, mask: boolean, next: (line: string) => CommandResult) => {
        this.pendingContinuation = next;
        this.pendingPrompt = { prompt, mask };
        return { output: '', exitCode: 0, pendingInput: { prompt, mask } };
      },
    };

    try {
      const result = command.execute(args, ctx);
      this.state.exitCode = result.exitCode;
      return result;
    } catch (error) {
      // The command may have armed a continuation before throwing — drop it.
      // Only the pending state is cleared here (NOT the open attempt): the
      // outer execute still settles the attempt with the real exit code (1),
      // so a throwing command is logged as a failure, not a user cancel (130).
      this.pendingContinuation = null;
      this.pendingPrompt = null;
      this.state.exitCode = 1;
      return {
        output: '',
        exitCode: 1,
        error: `${name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // ============================================================================
  // Interactive input continuations
  // ============================================================================

  /**
   * Feed the pending continuation the line the player typed. Cleared BEFORE
   * the run so a continuation that calls ctx.requestInput again (chaining)
   * lands its new continuation cleanly.
   */
  continueInput(line: string): CommandResult {
    const next = this.pendingContinuation;
    this.pendingContinuation = null;
    this.pendingPrompt = null;
    if (!next) {
      return { output: '', exitCode: 1, error: 'shell: no pending input' };
    }
    // The continuation runs at depth ≥1 so a nested execute it triggers never
    // opens a second attempt; it settles the SAME open attempt from execute.
    this.executionDepth++;
    let result: CommandResult;
    try {
      result = next(line);
      this.state.exitCode = result.exitCode;
    } catch (error) {
      // A throwing continuation must not wedge the engine — even one that
      // re-armed a new continuation before throwing. Close the owed attempt as
      // a failure (exit 1), NOT a user cancel (130), then clear pending state
      // WITHOUT re-closing.
      this.closeOpenAttempt(1);
      this.pendingContinuation = null;
      this.pendingPrompt = null;
      this.state.exitCode = 1;
      this.executionDepth--;
      return {
        output: '',
        exitCode: 1,
        error: `shell: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
    this.executionDepth--;
    this.settleAttempt(result); // closes the attempt unless another prompt is owed
    return result;
  }

  hasPendingInput(): boolean {
    return this.pendingContinuation !== null;
  }

  getPendingPrompt(): { prompt: string; mask: boolean } | null {
    return this.pendingPrompt ? { ...this.pendingPrompt } : null;
  }

  cancelPendingInput(): void {
    this.pendingContinuation = null;
    this.pendingPrompt = null;
    // A genuine user cancel finalises the owed attempt as SIGINT (130).
    this.closeOpenAttempt(130);
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

  /** GNU-style --help text generated from a command's own metadata. */
  private formatHelp(command: ShellCommand): string {
    const lines = [`Usage: ${command.usage}`, command.description];
    if (command.options && command.options.length > 0) {
      lines.push('');
      lines.push('Options:');
      for (const opt of command.options) {
        const names = [
          opt.short ? `-${opt.short}` : '',
          opt.long ? `--${opt.long}` : '',
        ].filter(Boolean).join(', ');
        lines.push(`  ${names.padEnd(26)} ${opt.description}`);
      }
    }
    return lines.join('\n');
  }

  private ensureTrailingNewline(text: string): string {
    if (text === '' || text.endsWith('\n')) return text;
    return text + '\n';
  }

  // ============================================================================
  // Parsing
  // ============================================================================

  /**
   * Resolve a command name to a registered command. PowerShell is
   * case-insensitive (`get-process` === `Get-Process`), so fall back to a
   * case-folded match there. Bash stays case-sensitive.
   */
  private resolveName(name: string): string {
    if (!name || this.commands.has(name)) return name;
    if (this.state.type === 'powershell') {
      const lower = name.toLowerCase();
      for (const key of this.commands.keys()) {
        if (key.toLowerCase() === lower) return key;
      }
    }
    return name;
  }

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
    const command = this.resolveName(tokens[0] || '');
    const positional: string[] = [];
    const flags: Record<string, boolean> = {};
    const options: Record<string, string> = {};

    const spec = this.commands.get(command)?.options ?? [];

    // PowerShell parses `-ParameterName value` (single dash, long name,
    // case-insensitive, prefix-abbreviated). Handle it separately from the
    // bash getopt path so `-ComputerName 10.0.0.1` binds instead of turning
    // into a cluster of one-letter flags.
    if (this.state.type === 'powershell') {
      this.parsePowerShellParams(tokens, spec, positional, flags, options);
      return { command, positional, flags, options, raw: input };
    }

    // Only options the target command declares with `takesValue: true` consume
    // the following token. Without this, a boolean flag greedily swallows the
    // next argument — e.g. `grep -n "185" auth.log` would treat "185" as the
    // value of -n and lose the filename. getopt behaviour, driven by metadata.
    const shortTakesValue = new Set(
      spec.filter(o => o.takesValue && o.short).map(o => o.short as string)
    );
    const longTakesValue = new Set(
      spec.filter(o => o.takesValue && o.long).map(o => o.long as string)
    );

    let i = 1;
    while (i < tokens.length) {
      const token = tokens[i];

      if (token.startsWith('--')) {
        // Long option
        const [key, value] = token.slice(2).split('=');
        if (value !== undefined) {
          options[key] = value;
        } else if (
          longTakesValue.has(key) &&
          i + 1 < tokens.length &&
          !tokens[i + 1].startsWith('-')
        ) {
          // `--lines 10` form — only when the command declares a value.
          options[key] = tokens[i + 1];
          i++;
        } else {
          flags[key] = true;
        }
      } else if (token.startsWith('-') && token.length > 1) {
        // Short option(s), possibly clustered (e.g. -in)
        const chars = token.slice(1);
        for (let j = 0; j < chars.length; j++) {
          const char = chars[j];
          if (shortTakesValue.has(char)) {
            const rest = chars.slice(j + 1);
            if (rest.length > 0) {
              // Attached value: -n10
              options[char] = rest;
            } else if (i + 1 < tokens.length) {
              // Separated value: -n 10
              options[char] = tokens[i + 1];
              i++;
            } else {
              flags[char] = true;
            }
            break;
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

  /**
   * PowerShell-style parameter binding: `-Name value`, `-Name:value`, switch
   * parameters (`-Force`), case-insensitive matching, and unambiguous prefix
   * abbreviation (`-Comp` → `-ComputerName`). Values that don't match a
   * declared parameter fall through as positional arguments, matching how
   * PowerShell binds positional parameters. Results are written under the
   * parameter's declared (canonical) name so handlers read `options['Name']`.
   */
  private parsePowerShellParams(
    tokens: string[],
    spec: { short?: string; long?: string; takesValue?: boolean }[],
    positional: string[],
    flags: Record<string, boolean>,
    options: Record<string, string>
  ): void {
    const longParams = spec.filter(o => o.long).map(o => o.long as string);

    const resolveParam = (typed: string): string | null => {
      const lower = typed.toLowerCase();
      // Exact (case-insensitive) match wins.
      const exact = longParams.find(p => p.toLowerCase() === lower);
      if (exact) return exact;
      // Otherwise an unambiguous prefix, like real PowerShell abbreviation.
      const prefixed = longParams.filter(p => p.toLowerCase().startsWith(lower));
      return prefixed.length === 1 ? prefixed[0] : null;
    };

    let i = 1;
    while (i < tokens.length) {
      const token = tokens[i];

      // `-?` is PowerShell's help switch.
      if (token === '-?') {
        flags['?'] = true;
        i++;
        continue;
      }

      // A parameter looks like `-Word` (letter after the dash). `-5` or a bare
      // `-` is treated as a positional value.
      if (token.length > 1 && token[0] === '-' && /[A-Za-z]/.test(token[1])) {
        const body = token.slice(1);
        const colon = body.indexOf(':');
        const typedName = colon >= 0 ? body.slice(0, colon) : body;
        const inlineValue = colon >= 0 ? body.slice(colon + 1) : undefined;

        const canonical = resolveParam(typedName);
        const declared = canonical
          ? spec.find(o => o.long === canonical)
          : undefined;
        const key = canonical ?? typedName;

        if (inlineValue !== undefined) {
          // `-Param:value` — switches take `:$true/$false`, others a value.
          if (declared && !declared.takesValue) {
            flags[key] = /^(true|\$true)$/i.test(inlineValue);
          } else {
            options[key] = inlineValue;
          }
        } else if (declared?.takesValue && i + 1 < tokens.length && !/^-[A-Za-z]/.test(tokens[i + 1])) {
          options[key] = tokens[i + 1];
          i++;
        } else {
          // Switch parameter, or an unknown `-Flag`.
          flags[key] = true;
        }
      } else {
        positional.push(token);
      }
      i++;
    }
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
    const matches = this.getVfs().glob(token);
    // VFS.glob returns the original pattern unchanged when nothing matches;
    // in that case bash leaves the literal pattern in place.
    if (matches.length === 1 && matches[0] === token) {
      return [token];
    }
    // glob() returns absolute paths; re-attach the pattern's directory prefix
    // so `*.txt` expands to bare names and `logs/*.log` keeps the `logs/` part.
    const slash = token.lastIndexOf('/');
    const prefix = slash >= 0 ? token.slice(0, slash + 1) : '';
    return matches.map(m => prefix + this.getVfs().basename(m)).sort();
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
    // $?, then $VAR or ${VAR}. Skip anything inside single quotes.
    let quote: string | null = null;
    let result = '';
    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      if (quote === "'") {
        result += char;
        if (char === "'") quote = null;
        continue;
      }
      if (char === "'" && !quote) {
        quote = "'";
        result += char;
        continue;
      }
      if (char === '"') {
        quote = quote === '"' ? null : '"';
        result += char;
        continue;
      }
      if (char === '$') {
        if (input[i + 1] === '?') {
          // bash's $? is the numeric exit code; PowerShell's is a boolean.
          result += this.state.type === 'powershell'
            ? (this.state.exitCode === 0 ? 'True' : 'False')
            : this.state.exitCode.toString();
          i++;
          continue;
        }
        const braced = input.slice(i + 1).match(/^\{(\w+)\}/);
        const plain = input.slice(i + 1).match(/^(\w+)/);
        const name = braced?.[1] ?? plain?.[1];
        if (name) {
          result += this.getVfs().getEnv(name) || this.state.env[name] || '';
          i += (braced ? braced[0].length : plain![0].length);
          continue;
        }
      }
      result += char;
    }
    return result;
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
    // Resolve case-insensitively so PowerShell (`get-content -<tab>`) completes.
    const command = this.commands.get(this.resolveName(commandName));

    const ctx: CompletionContext = {
      vfs: this.getVfs(),
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
    return this.getVfs().getPathCompletions(currentArg);
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

    // PowerShell parameters are single-dash long names, matched
    // case-insensitively: `-Comp` → `-ComputerName`.
    if (this.state.type === 'powershell') {
      const prefix = partial.replace(/^-+/, '').toLowerCase();
      return command.options
        .filter(opt => opt.long && opt.long.toLowerCase().startsWith(prefix))
        .map(opt => ({
          value: `-${opt.long}`,
          display: `-${opt.long}`,
          type: 'option' as const,
          description: opt.description,
        }));
    }

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

  /**
   * Bash history expansion: `!!` (previous command), `!N` (history entry N,
   * matching the numbers `history` prints), `!$` (last word of the previous
   * command). Single-quoted text is left alone. Callers should echo the
   * expanded line before running it, like real bash does.
   */
  expandHistory(input: string): { expanded: string; changed: boolean } {
    const history = this.state.history;
    if (history.length === 0 || !input.includes('!')) {
      return { expanded: input, changed: false };
    }

    const last = history[history.length - 1].command;
    const lastWord = last.trim().split(/\s+/).pop() || '';

    let result = '';
    let changed = false;
    let quote: string | null = null;

    for (let i = 0; i < input.length; i++) {
      const char = input[i];

      if (quote) {
        result += char;
        if (char === quote) quote = null;
        continue;
      }
      if (char === "'" || char === '"') {
        // Bash expands history inside double quotes too, but keeping it
        // literal there avoids surprises; single quotes are always literal.
        quote = char;
        result += char;
        continue;
      }

      if (char === '!') {
        if (input[i + 1] === '!') {
          result += last;
          changed = true;
          i++;
          continue;
        }
        if (input[i + 1] === '$') {
          result += lastWord;
          changed = true;
          i++;
          continue;
        }
        const num = input.slice(i + 1).match(/^\d+/);
        if (num) {
          const entry = history[parseInt(num[0], 10) - 1];
          if (!entry) {
            return { expanded: `!${num[0]}: event not found`, changed: false };
          }
          result += entry.command;
          changed = true;
          i += num[0].length;
          continue;
        }
      }

      result += char;
    }

    return { expanded: result, changed };
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
    return this.getCurrentHost().vfs;
  }

  // ============================================================================
  // Hosts & sessions
  // ============================================================================

  registerHost(host: HostState): void {
    if (this.hosts.has(host.id)) {
      throw new Error(`registerHost: duplicate host id '${host.id}'`);
    }
    this.hosts.set(host.id, host);
  }

  getHost(id: string): HostState | undefined {
    return this.hosts.get(id);
  }

  getBaseHost(): HostState {
    return this.hosts.get(this.sessionStack[0].hostId)!;
  }

  getCurrentHost(): HostState {
    return this.hosts.get(this.sessionStack[this.sessionStack.length - 1].hostId)!;
  }

  /** Match a host by id, full hostname, short hostname (before first '.'), or IP. */
  resolveHost(nameOrIp: string): HostState | undefined {
    const byId = this.hosts.get(nameOrIp);
    if (byId) return byId;
    for (const host of this.hosts.values()) {
      if (host.hostname === nameOrIp) return host;
      if (host.hostname.split('.')[0] === nameOrIp) return host;
      if (host.ip === nameOrIp) return host;
    }
    return undefined;
  }

  pushSession(hostId: string, user: string, method?: 'publickey' | 'password'): void {
    const host = this.hosts.get(hostId);
    if (!host) {
      throw new Error(`pushSession: unknown host '${hostId}'`);
    }
    // An SSH login opens a session AND is recorded (with its auth method) so a
    // loggedIn stateGoal can assert the player actually logged in.
    if (method) this.recordLogin(hostId, method);
    host.vfs.setUser(user);
    this.sessionStack.push({ hostId, user });
    // Annotate the open attempt with the auth method that opened this session,
    // so the execution log distinguishes publickey from password logins.
    if (method && this.openAttempt) this.openAttempt.authMethod = method;
  }

  /** Record a successful SSH login; persists across session pop (`exit`). */
  recordLogin(hostId: string, method: 'publickey' | 'password'): void {
    this.loginRecords.add(`${hostId}::${method}`);
  }

  /**
   * Has the player logged into `hostId` (any host when omitted) via `method`
   * (any method when omitted)? Used by the loggedIn stateGoal evaluator.
   */
  hasLoggedIn(hostId?: string, method?: 'publickey' | 'password'): boolean {
    for (const rec of this.loginRecords) {
      const sep = rec.lastIndexOf('::');
      const h = rec.slice(0, sep);
      const m = rec.slice(sep + 2);
      if (hostId !== undefined && h !== hostId) continue;
      if (method !== undefined && m !== method) continue;
      return true;
    }
    return false;
  }

  /**
   * Record an ansible-playbook invocation. The playbook is normalized to its
   * BASENAME (authors assert 'harden-fleet.yml', the player may type any
   * path). Like loginRecords, the list survives for the whole session.
   */
  recordAnsibleRun(run: AnsibleRunRecord): void {
    const basename = run.playbook.split('/').pop() ?? run.playbook;
    this.ansibleRuns.push({ ...run, playbook: basename });
  }

  /**
   * Has a recorded ansible-playbook run matching ALL provided fields? The
   * playbook query is basename-matched; omitted fields match anything. Used
   * by the ansibleRan stateGoal evaluator.
   */
  hasAnsibleRun(query: { playbook?: string; mode?: AnsibleRunMode; ok?: boolean }): boolean {
    const wantedPlaybook = query.playbook?.split('/').pop();
    return this.ansibleRuns.some(run =>
      (wantedPlaybook === undefined || run.playbook === wantedPlaybook)
      && (query.mode === undefined || run.mode === query.mode)
      && (query.ok === undefined || run.ok === query.ok)
    );
  }

  /** Returns false at depth 1 — the base session is never popped. */
  popSession(): boolean {
    if (this.sessionStack.length <= 1) return false;
    this.sessionStack.pop();
    // Restore the resumed session's user — the closed session may have logged
    // into the same host as a different user.
    const top = this.sessionStack[this.sessionStack.length - 1];
    this.hosts.get(top.hostId)!.vfs.setUser(top.user);
    return true;
  }

  getSessionDepth(): number {
    return this.sessionStack.length;
  }

  getPromptInfo(): { hostname: string; username: string; path: string; home: string } {
    const top = this.sessionStack[this.sessionStack.length - 1];
    const host = this.getCurrentHost();
    const vfs = host.vfs;
    return {
      hostname: host.hostname,
      username: top.user,
      path: vfs.getCurrentPath(),
      home: vfs.getEnv('HOME') ?? vfs.getEnv('USERPROFILE') ?? '',
    };
  }

  setTermCols(cols: number): void {
    if (cols > 0) this.termCols = cols;
  }

  getEnv(): Record<string, string> {
    return { ...this.state.env };
  }

  setEnv(key: string, value: string): void {
    this.state.env[key] = value;
    this.getVfs().setEnv(key, value);
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
