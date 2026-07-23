// client/src/components/Terminal/session/TerminalSession.ts
// Framework-free, unit-testable owner of the terminal input loop. It holds all
// state that useTerminal.ts previously kept in closure/refs and returns a flat,
// ordered TerminalEffect[] from each input method. The ShellEngine is injected
// (deps.shell) — the session never calls createShellFromContext itself.
//
// Task 4 scope: constructor, getSnapshot(), init() (connect banner + optional
// beginner auto-hint + first prompt) and the private prompt computation. The
// keystroke methods (handleData/handleHintRequest/tick) are STUBS returning [].
import { TerminalContext, Skills, GameModeId, EventEffects, FeedbackRule, TerminalSolution } from '@kritis/shared';
import { ShellEngine, checkStateGoals, selectFeedback, CommandResult, Completion, formatGrid } from '../../../engine/shell';
import { buildPrompt } from '../prompt';
import { gatherCompletions, applyCompletionToLine, longestCommonPrefix, tokenUnderCursor } from '../completion';
import { TerminalEffect } from './effects';

/** Sum two skill-gain maps; overlapping keys add up (live drip + solution gain). */
function mergeSkillGain(a: Partial<Skills>, b: Partial<Skills>): Partial<Skills> {
  const out: Partial<Skills> = { ...a };
  for (const [key, value] of Object.entries(b) as [keyof Skills, number][]) {
    out[key] = (out[key] ?? 0) + value;
  }
  return out;
}
// renderInput is used by later tasks (handleData/tab/history redraws); kept here
// so the class shape is stable. Referenced now via a discarded call would be
// premature, so we only import the type surface we need.
import { renderInput } from './renderInput';

export interface TerminalSessionDeps {
  shell: ShellEngine;
  context: TerminalContext;
  gameMode: GameModeId;
  onSolved: (skillGain: Partial<Skills>, setsFlags?: string[], effects?: EventEffects) => void;
  onPartialSolution: (feedback: string) => void;
}

export interface TerminalSnapshot {
  hintsUsed: number;
  commandsUsed: string[];
  solved: boolean;
  // NEVER include line/pendingLine/password material here.
}

export class TerminalSession {
  // --- input line state (used by later tasks: handleData) ---
  private line = '';
  private cursorPos = 0;
  private savedLine = '';

  // --- solution state ---
  private solved = false;
  private pendingSkillGain: Partial<Skills> = {};
  private pendingSolutionEffects: EventEffects | undefined = undefined;

  // --- masked/interactive input (e.g. ssh password prompts) ---
  // When set, the next keystrokes feed the buffered answer, NOT the command
  // line. `resume(answer)` funnels shell.continueInput back through the single
  // handleShellResult path (which may re-arm pendingInput for a retry/chain).
  private pendingInput: { prompt: string; mask: boolean; resume: (answer: string) => TerminalEffect[] } | null = null;
  // Buffered pending answer — LOCAL state, NEVER echoed when masked, NEVER
  // exposed via getSnapshot() (would leak passwords).
  private pendingBuffer = '';
  private pendingMask = false;
  private pendingCmdName = '';

  // beginner + learning modes get extra error tips (see writeShellError).
  private readonly isBeginnerMode: boolean;

  // --- credited commands + live skill drip ---
  private creditedCommands = new Set<string>();
  private liveSkillGain: Partial<Skills> = {};

  // --- streaming queue state (drip output) ---
  // Paced ping-style output: `streamQueue` holds the full line list, `streamIdx`
  // the next line to write, `streamDone` the continuation to run when the queue
  // drains (solution banner / fresh prompt / shell tail). While `streaming` is
  // true, handleData swallows every keystroke (see the guard head).
  private streamQueue: string[] = [];
  private streamIdx = 0;
  private streaming = false;
  private streamDone: (() => TerminalEffect[]) | null = null;

  // --- tab completion state ---
  private tabCompletions: string[] = [];
  private tabIndex = 0;
  // Terminal width for completion grid layout. The session has no xterm; the
  // adapter mirrors term.cols here (also forwarded to shell.setTermCols).
  private termCols = 80;
  // First-token completion pool: the scenario command patterns.
  private readonly availableCommands: string[];

  // --- hint / command tracking (exposed via snapshot) ---
  private hintsUsed = 0;
  private commandsUsed: string[] = [];
  private teachedCommands = new Set<string>();

  // --- cached prompt string ---
  private prompt = '';

  constructor(private deps: TerminalSessionDeps) {
    this.isBeginnerMode = deps.gameMode === 'beginner' || deps.gameMode === 'learning';
    this.availableCommands = deps.context.commands.map(cmd => cmd.pattern);
    this.prompt = this.computePrompt();
  }

  // Adapter mirrors xterm's column count here so the completion grid wraps like
  // the real terminal (the hook used `term.cols || 80`).
  setTermCols(cols: number): void {
    this.termCols = cols;
  }

  private computePrompt(): string {
    const { context } = this.deps;
    const info = this.deps.shell.getPromptInfo();
    return buildPrompt({
      type: context.type,
      username: info?.username ?? context.username,
      hostname: info?.hostname ?? context.hostname,
      path: info?.path || context.currentPath,
      home: info?.home,
    });
  }

  init(): TerminalEffect[] {
    const { context, gameMode } = this.deps;
    const effects: TerminalEffect[] = [];

    effects.push({ type: 'writeLine', text: `Connected to ${context.hostname}` });
    effects.push({ type: 'writeLine', text: '\x1b[90mTipp: Tab für Autovervollständigung, ↑/↓ für History, ? für Hinweise\x1b[0m' });
    effects.push({ type: 'writeLine', text: '' });

    // Auto-show first hint only in beginner mode (not learning mode).
    if (gameMode === 'beginner' && context.hints.length > 0) {
      effects.push({ type: 'writeLine', text: `\x1b[33m💡 ${context.hints[0]}\x1b[0m` });
      effects.push({ type: 'writeLine', text: '' });
      this.hintsUsed = 1;
    }

    this.prompt = this.computePrompt();
    effects.push({ type: 'renderInput', prompt: this.prompt, line: '', cursor: 0 });
    return effects;
  }

  // Emit a single full-line redraw of the current input area. Every edit path
  // ends here so the pure renderInput renderer reproduces the identical visible
  // state (behavior-preserving vs. the original incremental writes).
  private render(): TerminalEffect {
    return { type: 'renderInput', prompt: this.prompt, line: this.line, cursor: this.cursorPos };
  }

  handleData(data: string): TerminalEffect[] {
    // While paced output is animating (e.g. ping), ignore keystrokes so the
    // drip isn't interrupted or interleaved with a new command. This guard sits
    // ABOVE everything else (matches useTerminal.ts's onData head).
    if (this.streaming) {
      return [];
    }

    // After solving, swallow all input except Enter, which advances. Enter
    // fires the injected onSolved callback (skillGain, setsFlags=undefined,
    // effects) exactly once and clears the solved latch; every other key is
    // swallowed so the solution banner stays on screen.
    if (this.solved) {
      if (data === '\r') {
        this.solved = false;
        this.deps.onSolved(this.pendingSkillGain, undefined, this.pendingSolutionEffects);
      }
      return [];
    }

    // A command owns the next line (ssh password prompt etc.). The buffered
    // answer bypasses history/canned matching; masked input echoes NOTHING
    // (like real ssh) and never lands in an effect, the exec log, or the
    // snapshot. History, arrows and tab are disabled while pending.
    if (this.pendingInput) {
      if (data === '\r') {
        const answer = this.pendingBuffer;
        const resume = this.pendingInput.resume;
        // INVARIANT 2: clear pending BEFORE the continuation so a synchronous
        // follow-up prompt (retry / chained question) can re-arm pendingInput.
        this.pendingInput = null;
        this.pendingBuffer = '';
        // SINGLE PATH: resume() routes shell.continueInput through handleShellResult.
        return [{ type: 'writeLine', text: '' }, ...resume(answer)];
      }
      if (data === '\x03') {
        // INVARIANT 4: Ctrl+C closes the pending continuation exactly once. A
        // second Ctrl+C (pendingInput already null) falls through to the normal
        // handler below and never re-calls cancelPendingInput.
        this.deps.shell.cancelPendingInput();
        this.pendingInput = null;
        this.pendingBuffer = '';
        return [{ type: 'writeLine', text: '^C' }, this.resetLineAndPrompt()];
      }
      if (data === '') { // Backspace edits the buffered answer
        if (this.pendingBuffer.length > 0) {
          this.pendingBuffer = this.pendingBuffer.slice(0, -1);
          if (!this.pendingMask) return [{ type: 'write', text: '\b \b' }];
        }
        return [];
      }
      if (data.startsWith('\x1b') || data === '\t') {
        return [];
      }
      if (data >= ' ') {
        this.pendingBuffer += data;
        // INVARIANT 3: masked answers echo nothing; unmasked echo the char inline.
        if (!this.pendingMask) return [{ type: 'write', text: data }];
      }
      return [];
    }

    // --- escape sequences (arrow keys, Home/End, Delete) ---
    if (data.startsWith('\x1b[')) {
      const seq = data.slice(2);
      switch (seq) {
        case 'A': // Up arrow - history navigation
          if (this.savedLine === '' && this.line !== '') {
            this.savedLine = this.line;
          }
          {
            const prevCmd = this.deps.shell.navigateHistory('up');
            if (prevCmd !== undefined) {
              this.line = prevCmd;
              this.cursorPos = prevCmd.length;
              return [this.render()];
            }
          }
          return [];

        case 'B': // Down arrow - history navigation
          {
            const nextCmd = this.deps.shell.navigateHistory('down');
            if (nextCmd !== undefined) {
              this.line = nextCmd;
              this.cursorPos = nextCmd.length;
              return [this.render()];
            }
            if (this.savedLine !== '') {
              this.line = this.savedLine;
              this.cursorPos = this.savedLine.length;
              this.savedLine = '';
              return [this.render()];
            }
          }
          return [];

        case 'C': // Right arrow
          if (this.cursorPos < this.line.length) {
            this.cursorPos++;
            return [this.render()];
          }
          return [];

        case 'D': // Left arrow
          if (this.cursorPos > 0) {
            this.cursorPos--;
            return [this.render()];
          }
          return [];

        case 'H': // Home
          this.cursorPos = 0;
          return [this.render()];

        case 'F': // End
          this.cursorPos = this.line.length;
          return [this.render()];

        case '3~': // Delete
          if (this.cursorPos < this.line.length) {
            this.line = this.line.slice(0, this.cursorPos) + this.line.slice(this.cursorPos + 1);
            return [this.render()];
          }
          return [];
      }
      // Unrecognized escape sequence — fall through like the original.
      return [];
    }

    // --- control chars + printable default ---
    switch (data) {
      case '': // Backspace
        if (this.cursorPos > 0) {
          this.line = this.line.slice(0, this.cursorPos - 1) + this.line.slice(this.cursorPos);
          this.cursorPos--;
          return [this.render()];
        }
        return [];

      case '\x03': // Ctrl+C — echo ^C, reset to a fresh empty prompt
        this.line = '';
        this.cursorPos = 0;
        return [{ type: 'writeLine', text: '^C' }, this.render()];

      case '\x0c': // Ctrl+L — clear screen, preserve the current line & cursor
        return [{ type: 'clearScreen' }, this.render()];

      case '\x15': // Ctrl+U — clear line
        this.line = '';
        this.cursorPos = 0;
        return [this.render()];

      case '\x0b': // Ctrl+K — clear to end of line
        this.line = this.line.slice(0, this.cursorPos);
        return [this.render()];

      case '\x01': // Ctrl+A — move to start
        this.cursorPos = 0;
        return [this.render()];

      case '\x05': // Ctrl+E — move to end
        this.cursorPos = this.line.length;
        return [this.render()];

      case '\x17': // Ctrl+W — delete word backwards
        if (this.cursorPos > 0) {
          let newPos = this.cursorPos - 1;
          // Skip trailing spaces
          while (newPos > 0 && this.line[newPos] === ' ') newPos--;
          // Find word boundary
          while (newPos > 0 && this.line[newPos - 1] !== ' ') newPos--;
          this.line = this.line.slice(0, newPos) + this.line.slice(this.cursorPos);
          this.cursorPos = newPos;
          return [this.render()];
        }
        return [];

      case '\t': // Tab — bash-style completion (fill common prefix, then list).
        return this.handleTab();

      case '?': // ? — on a non-empty line insert it as a char (glob etc.); on an
        // empty line reveal the next hint (so `help`/`head`/`history` stay
        // typeable). The [Hinweis] footer button uses handleHintRequest().
        if (this.line.length > 0) {
          this.line = this.line.slice(0, this.cursorPos) + data + this.line.slice(this.cursorPos);
          this.cursorPos++;
          return [this.render()];
        }
        {
          const hints = this.deps.context.hints;
          if (this.hintsUsed < hints.length) {
            const hint = hints[this.hintsUsed];
            this.hintsUsed++;
            return [
              { type: 'writeLine', text: '' },
              { type: 'writeLine', text: `\x1b[33m💡 ${hint}\x1b[0m` },
              this.render(),
              { type: 'updateHints', count: this.hintsUsed },
            ];
          }
          return [
            { type: 'writeLine', text: '' },
            { type: 'writeLine', text: '\x1b[33mKeine weiteren Hinweise verfügbar.\x1b[0m' },
            this.render(),
          ];
        }

      case '\r': // Enter
        return this.handleEnter();

      default:
        if (data >= ' ') {
          // Insert printable character at cursor position.
          this.line = this.line.slice(0, this.cursorPos) + data + this.line.slice(this.cursorPos);
          this.cursorPos++;
          return [this.render()];
        }
        // Any other unowned control keystroke — no-op.
        return [];
    }
  }
  // A fresh, empty prompt after an action completes (mirrors the source's
  // resetLineAndPrompt: clears the line and re-renders at the computed prompt).
  private resetLineAndPrompt(): TerminalEffect {
    this.line = '';
    this.cursorPos = 0;
    this.prompt = this.computePrompt();
    return { type: 'renderInput', prompt: this.prompt, line: '', cursor: 0 };
  }

  // Enter branch — FIRST HALF: history expansion, add-to-history, and the
  // scenario-command matching loop (isSolution / isPartialSolution /
  // non-solution + post-output solution check). Lines that match no scenario
  // command fall through to a fresh prompt for now; Task 7 wires shell.execute.
  private handleEnter(): TerminalEffect[] {
    // Reset tab completion state (Tab is a later task; keep the shared state clean).
    this.tabCompletions = [];
    this.tabIndex = 0;

    const effects: TerminalEffect[] = [];
    effects.push({ type: 'writeLine', text: '' });

    const trimmedLine = this.line.trim();
    if (trimmedLine) {
      // Bash history expansion (!!, !N, !$). When it changes the line, real
      // bash echoes the expanded command before running it.
      const expansion = this.deps.shell.expandHistory(trimmedLine);
      if (expansion.changed) {
        effects.push({ type: 'writeLine', text: expansion.expanded });
      } else if (expansion.expanded !== trimmedLine && !expansion.changed) {
        // `!5: event not found` style errors: show and abort.
        effects.push({ type: 'writeLine', text: `\x1b[31m${expansion.expanded}\x1b[0m` });
        effects.push(this.resetLineAndPrompt());
        return effects;
      }
      const trimmed = expansion.changed ? expansion.expanded.trim() : trimmedLine;

      // Add to shell history BEFORE the scenario loop so `!!`/history works even
      // for lines that match no scenario command.
      this.deps.shell.addToHistory(trimmed);
      this.savedLine = '';

      // First, check scenario-specific commands (for solutions/partial solutions).
      for (const cmd of this.deps.context.commands) {
        let matches = false;
        if (cmd.patternRegex) {
          matches = new RegExp(cmd.patternRegex).test(trimmed);
        } else {
          matches = trimmed.startsWith(cmd.pattern) || trimmed === cmd.pattern;
        }

        if (matches) {
          this.commandsUsed.push(trimmed);
          const output = cmd.output;

          // Ping-style commands stream their reply lines over time (see
          // emitScenarioOutput): pace the icmp/reply lines instead of dumping.
          const isPingLike =
            cmd.teachesCommand === 'ping' ||
            cmd.pattern.startsWith('ping') ||
            /^PING /.test(output);

          // Track executed commands for solution checking: store both the full
          // pattern and the short teachesCommand form for flexible matching.
          this.teachedCommands.add(cmd.pattern);
          if (cmd.teachesCommand) {
            this.teachedCommands.add(cmd.teachesCommand);
          }

          // Also execute cd in the shell engine so the prompt path updates.
          if (trimmed.startsWith('cd ') || trimmed === 'cd') {
            this.deps.shell.execute(trimmed);
          }

          if (cmd.isSolution) {
            // Output (paced if ping-like), then the success banner as the
            // continuation once all lines are on screen.
            effects.push(...this.emitScenarioOutput(output, isPingLike,
              () => this.announceSolved({ skillGain: cmd.skillGain })));
            return effects;
          }

          if (cmd.isPartialSolution) {
            for (const l of output.split('\n')) effects.push({ type: 'writeLine', text: l });
            effects.push({ type: 'writeLine', text: '' });
            effects.push({
              type: 'showPartial',
              feedback: cmd.wrongApproachFeedback || 'Das hat nicht wie erwartet funktioniert.',
            });
            effects.push(this.resetLineAndPrompt());
            return effects;
          }

          // Non-solution scenario command — show output (paced if ping-like),
          // then either the success banner (if this completed a multi-step
          // solution) or a fresh prompt.
          effects.push(...this.emitScenarioOutput(output, isPingLike, () => {
            const solution = this.checkSolutions(this.teachedCommands);
            return solution ? this.announceSolved(solution) : [this.resetLineAndPrompt()];
          }));
          return effects;
        }
      }

      // No scenario match — run the real shell and route the result through the
      // single shell-result tail: output/errors, pending-input prompt, solution
      // check (incl. stateGoals), skill drip, fresh prompt.
      const cmdName = trimmed.split(/\s+/)[0];
      const result = this.deps.shell.execute(trimmed);
      effects.push(...this.handleShellResult(result, cmdName));
      return effects;
    }

    effects.push(this.resetLineAndPrompt());
    return effects;
  }

  // Check if any solution condition is met: the command condition (when
  // commands are listed) AND all stateGoals (when present) must hold.
  private checkSolutions(teached: Set<string>): TerminalSolution | null {
    const { context } = this.deps;
    if (!context.solutions || context.solutions.length === 0) return null;

    for (const solution of context.solutions) {
      // A solution with neither commands nor stateGoals would be vacuously
      // true — treat it as an authoring mistake and never match it.
      if (solution.commands.length === 0 && !solution.stateGoals) continue;

      const commandsMet = solution.commands.length === 0
        || (solution.allRequired
          ? solution.commands.every(cmd => teached.has(cmd))
          : solution.commands.some(cmd => teached.has(cmd)));
      if (!commandsMet) continue;

      if (solution.stateGoals) {
        if (!checkStateGoals(this.deps.shell, solution.stateGoals)) continue;
      }
      return solution;
    }
    return null;
  }

  // Success banner + [ENTER] confirmation — shared by the canned-command and
  // (Task 7) real-shell solve paths. Live skill drip is merged in here. Emits
  // the visible banner writeLines, then a flat `solved` marker as the LAST
  // element (never nested); sets this.solved and the pending payloads.
  private announceSolved(solution: {
    resultText?: string;
    skillGain?: Partial<Skills>;
    effects?: EventEffects;
    feedback?: FeedbackRule[];
  }): TerminalEffect[] {
    const effects: TerminalEffect[] = [];
    effects.push({ type: 'writeLine', text: '' });
    effects.push({ type: 'writeLine', text: '\x1b[32m╔══════════════════════════════════════════════════════════════╗\x1b[0m' });
    effects.push({ type: 'writeLine', text: '\x1b[32m║  ✓ AUFGABE ABGESCHLOSSEN                                     ║\x1b[0m' });
    effects.push({ type: 'writeLine', text: '\x1b[32m╚══════════════════════════════════════════════════════════════╝\x1b[0m' });
    effects.push({ type: 'writeLine', text: '' });

    let resultTextOut = '';
    if (solution.resultText) {
      // Append the after-action line (how it was solved) below the base
      // resultText (what was achieved); only the written string changes.
      const extra = solution.feedback
        ? selectFeedback(solution.feedback, this.deps.shell.getExecutionLog())
        : null;
      const resultText = extra ? `${solution.resultText}\n\n${extra}` : solution.resultText;
      resultTextOut = resultText;
      for (const line of resultText.split('\n')) {
        effects.push({ type: 'writeLine', text: '\x1b[36m' + line + '\x1b[0m' });
      }
      effects.push({ type: 'writeLine', text: '' });
    }

    // Wait for the player to confirm with Enter (all modes) so the solution
    // stays readable instead of auto-advancing.
    effects.push({
      type: 'writeLine',
      text: this.deps.gameMode === 'learning'
        ? '\x1b[33m[ENTER] Weiter zur nächsten Lektion...\x1b[0m'
        : '\x1b[33m[ENTER] Weiter...\x1b[0m',
    });

    this.solved = true;
    this.pendingSkillGain = mergeSkillGain(this.liveSkillGain, solution.skillGain || {});
    this.pendingSolutionEffects = solution.effects || {};

    // Flat state marker for the adapter (the visible banner is the writeLines above).
    effects.push({ type: 'solved', resultText: resultTextOut, skillGain: this.pendingSkillGain });
    return effects;
  }

  private creditSkillDrip(cmdName: string): void {
    const gain = this.deps.context.commandSkillGain?.[cmdName];
    if (!gain || this.creditedCommands.has(cmdName)) return;
    this.creditedCommands.add(cmdName);
    this.liveSkillGain = mergeSkillGain(this.liveSkillGain, gain);
  }

  // Writes an error line plus a beginner/learning-mode tip for common cases.
  private writeShellError(error: string): TerminalEffect[] {
    const out: TerminalEffect[] = [{ type: 'writeLine', text: `\x1b[31m${error}\x1b[0m` }];
    if (this.isBeginnerMode) {
      if (error.includes('command not found') || error.includes('not recognized')) {
        out.push({ type: 'writeLine', text: '\x1b[33m💡 Tipp: Tippe "help" für eine Liste verfügbarer Befehle.\x1b[0m' });
      } else if (error.includes('No such file') || error.includes('cannot find')) {
        out.push({ type: 'writeLine', text: '\x1b[33m💡 Tipp: Nutze "ls" um zu sehen, welche Dateien und Ordner existieren.\x1b[0m' });
      } else if (error.includes('Permission denied')) {
        out.push({ type: 'writeLine', text: '\x1b[33m💡 Tipp: Du hast keine Berechtigung für diese Aktion. Vielleicht mit "sudo"?\x1b[0m' });
      } else if (error.includes('not a directory')) {
        out.push({ type: 'writeLine', text: '\x1b[33m💡 Tipp: Du versuchst, in eine Datei zu wechseln. Nutze "cd" nur für Ordner.\x1b[0m' });
      }
    }
    return out;
  }

  // Tail of every real shell.execute/continueInput result: print output+errors,
  // then either arm the pending-input prompt, announce a solve, or write a fresh
  // prompt. Both entry points (Enter's execute and the pending resume's
  // continueInput) funnel through here — the SINGLE processing path. Solutions
  // are NEVER checked while a password prompt is still owed.
  private handleShellResult(result: CommandResult, cmdName: string): TerminalEffect[] {
    const effects: TerminalEffect[] = [];

    if (result.clearScreen) {
      effects.push({ type: 'clearScreen' });
      effects.push(...this.finishShellResult(result, cmdName));
      return effects;
    }

    // Live network command (ping etc.): pace the reply lines so it feels like
    // the host is actually being probed, then write any stderr and finish up.
    if (!result.pendingInput && result.output && result.output.split('\n').some(l => this.isPingReplyLine(l))) {
      return this.emitScenarioOutput(result.output, true, () => {
        const tail: TerminalEffect[] = [];
        if (result.error) tail.push(...this.writeShellError(result.error));
        tail.push(...this.finishShellResult(result, cmdName));
        return tail;
      });
    }

    // Show stdout AND stderr — a pipeline can produce both
    // (`grep x missing | wc -l` prints grep's error and wc's 0).
    if (result.output) {
      for (const shellLine of result.output.split('\n')) {
        effects.push({ type: 'writeLine', text: shellLine });
      }
    }
    if (result.error) {
      effects.push(...this.writeShellError(result.error));
    }
    effects.push(...this.finishShellResult(result, cmdName));
    return effects;
  }

  // Tail of a shell result once its output/errors are on screen: arm the
  // pending-input prompt, credit skill drip + announce a solve, or write a fresh
  // prompt. Shared by the instant path and the ping drip's `done` continuation.
  private finishShellResult(result: CommandResult, cmdName: string): TerminalEffect[] {
    if (result.pendingInput) {
      // Arm pending-input. The next line is fed to shell.continueInput and its
      // CommandResult routed back through handleShellResult (re-arming is allowed).
      this.pendingMask = result.pendingInput.mask;
      this.pendingCmdName = cmdName;
      this.pendingBuffer = '';
      this.pendingInput = {
        prompt: result.pendingInput.prompt,
        mask: result.pendingInput.mask,
        resume: (answer: string) =>
          this.handleShellResult(this.deps.shell.continueInput(answer), cmdName),
      };
      // Prompt is written WITHOUT a newline (real ssh: `…password: ` inline).
      return [{ type: 'write', text: result.pendingInput.prompt }];
    }
    if (result.exitCode === 0) {
      this.creditSkillDrip(cmdName);
    }
    const solution = this.checkSolutions(this.teachedCommands);
    if (solution) {
      return this.announceSolved(solution);
    }
    return [this.resetLineAndPrompt()];
  }

  // Tab completion: gather completions for the token under the cursor and either
  // fill it (single match), fill the longest common prefix, or list every option
  // as a cyan grid (bash's second-Tab behavior). Mirrors useTerminal's `\t` case.
  private handleTab(): TerminalEffect[] {
    const effects: TerminalEffect[] = [];

    // Print all matches as an aligned column grid, then redraw prompt + input.
    const printCompletionList = (comps: Completion[]): TerminalEffect[] => {
      const out: TerminalEffect[] = [];
      const items = comps.map(c => c.display || c.value);
      out.push({ type: 'writeLine', text: '' });
      for (const row of formatGrid(items, this.termCols || 80)) {
        out.push({ type: 'writeLine', text: '\x1b[36m' + row + '\x1b[0m' });
      }
      // Redraw prompt + current line (renderInput repositions the cursor too).
      out.push(this.render());
      return out;
    };

    const completions = gatherCompletions(this.deps.shell, this.availableCommands, this.line, this.cursorPos);

    if (completions.length === 0) {
      if (this.line.length === 0) {
        effects.push({ type: 'writeLine', text: '' });
        effects.push({ type: 'writeLine', text: '\x1b[36mVerfügbare Befehle: help, ls, cd, cat, grep, ...\x1b[0m' });
        effects.push({ type: 'writeLine', text: '\x1b[36mSzenario-Befehle: ' + this.availableCommands.slice(0, 3).join(', ') + (this.availableCommands.length > 3 ? ', ...' : '') + '\x1b[0m' });
        effects.push(this.render());
      } else {
        effects.push({ type: 'bell' }); // visual bell — nothing matches
      }
    } else if (completions.length === 1) {
      const r = applyCompletionToLine(this.line, this.cursorPos, completions[0]);
      this.line = r.line;
      this.cursorPos = r.cursor;
      effects.push(this.render());
    } else {
      // Several matches: first fill the longest common prefix (also corrects
      // case, e.g. `get-c` → `Get-C`); when it can't extend further, list all.
      const token = tokenUnderCursor(this.line, this.cursorPos);
      const lcp = longestCommonPrefix(completions.map(c => c.value));
      if (lcp !== token) {
        const r = applyCompletionToLine(this.line, this.cursorPos, { value: lcp, display: lcp, type: 'argument' }, false);
        this.line = r.line;
        this.cursorPos = r.cursor;
        effects.push(this.render());
      } else {
        effects.push(...printCompletionList(completions));
      }
    }

    // Cycling is gone; keep the shared tab state clean.
    this.tabCompletions = [];
    this.tabIndex = -1;
    return effects;
  }

  // Footer [Hinweis] button / idle auto-hint. Mirrors the hook's `showHint`:
  // NO 💡 emoji, a `\r\n`-prefixed yellow line, guarded so an exhausted hint
  // list emits nothing. Emits updateHints so the adapter can sync React state.
  handleHintRequest(): TerminalEffect[] {
    const hints = this.deps.context.hints;
    if (this.hintsUsed < hints.length) {
      const hint = hints[this.hintsUsed];
      this.hintsUsed++;
      return [
        { type: 'writeLine', text: `\r\n\x1b[33m${hint}\x1b[0m` },
        this.render(),
        { type: 'updateHints', count: this.hintsUsed },
      ];
    }
    return [];
  }

  // Beginner idle auto-hint — reproduces the old showIdleSuggestion output:
  // blank line, yellow 💡 hint, then a bare fresh prompt (does NOT clear or
  // rewrite the current input line), and reveals nothing once hints are
  // exhausted. The input line/cursor state is intentionally left untouched.
  // Distinct from handleHintRequest (footer button) by design.
  handleIdleHint(): TerminalEffect[] {
    const hints = this.deps.context.hints;
    if (this.hintsUsed >= hints.length) return [];
    const hint = hints[this.hintsUsed];
    this.hintsUsed++;
    return [
      { type: 'writeLine', text: '' },
      { type: 'writeLine', text: '\x1b[33m💡 ' + hint + '\x1b[0m' },
      { type: 'write', text: this.computePrompt() }, // bare fresh prompt, matches term.write(getTermPrompt())
    ];
  }

  // A "reply/attempt" line of a ping-style command — the lines we pace out over
  // time instead of dumping instantly. Regex unchanged from useTerminal.ts.
  private isPingReplyLine(l: string): boolean {
    return /icmp_seq|bytes from|Request timeout|no answer|timed out|Destination.*Unreachable|packet loss/i.test(l);
  }

  // Emit a scenario command's output. For ping-like commands the reply lines are
  // paced one per drip (450ms) so it feels like the host is really being probed;
  // everything else prints instantly. `done` runs once all output is on screen
  // (fresh prompt / solution banner / shell tail). If there is nothing to pace
  // (no reply lines), the fast path prints everything and runs `done` INLINE so
  // synchronous solves still surface the `solved` effect in the same return.
  private emitScenarioOutput(output: string, pingLike: boolean, done: () => TerminalEffect[]): TerminalEffect[] {
    const outLines = output.split('\n');
    if (!pingLike || !outLines.some(l => this.isPingReplyLine(l))) {
      const effects: TerminalEffect[] = outLines.map(l => ({ type: 'writeLine', text: l }));
      effects.push(...done());
      return effects;
    }

    // Paced path: write ONLY the leading non-reply lines now (e.g. the
    // `PING host` header), then position the queue AT the first reply line and
    // request a drip. EVERY reply line — including the first — is delayed 450ms,
    // matching the original setTimeout stepping (useTerminal.ts 289–309).
    this.streaming = true;
    this.streamQueue = outLines;
    this.streamIdx = 0;
    this.streamDone = done;

    const effects: TerminalEffect[] = [];
    while (this.streamIdx < this.streamQueue.length && !this.isPingReplyLine(this.streamQueue[this.streamIdx])) {
      effects.push({ type: 'writeLine', text: this.streamQueue[this.streamIdx] });
      this.streamIdx++;
    }
    // The first reply line is written on the first tick('drip'), 450ms later.
    effects.push({ type: 'scheduleDrip', delayMs: 450 });
    return effects;
  }

  // Write one drip "chunk" (the timer callback of the original setTimeout): the
  // reply line at the cursor plus the following instant non-reply lines, stopping
  // before the next reply line. If more reply lines remain, request another drip;
  // otherwise finish (streaming off + run the captured `done` continuation).
  // streamIdx points at a reply line whenever there is more to write.
  private stepStream(): TerminalEffect[] {
    const effects: TerminalEffect[] = [];
    // The reply line itself.
    if (this.streamIdx < this.streamQueue.length) {
      effects.push({ type: 'writeLine', text: this.streamQueue[this.streamIdx] });
      this.streamIdx++;
    }
    // Trailing instant non-reply lines up to the next reply line (or the end).
    while (this.streamIdx < this.streamQueue.length && !this.isPingReplyLine(this.streamQueue[this.streamIdx])) {
      effects.push({ type: 'writeLine', text: this.streamQueue[this.streamIdx] });
      this.streamIdx++;
    }
    if (this.streamIdx < this.streamQueue.length) {
      // Another reply line remains — pace it on the next drip.
      effects.push({ type: 'scheduleDrip', delayMs: 450 });
      return effects;
    }
    // Queue drained: leave streaming mode and run the continuation.
    const done = this.streamDone;
    this.streaming = false;
    this.streamQueue = [];
    this.streamIdx = 0;
    this.streamDone = null;
    if (done) effects.push(...done());
    return effects;
  }

  tick(kind: 'drip'): TerminalEffect[] {
    if (kind !== 'drip' || !this.streaming) return [];
    return this.stepStream();
  }

  getSnapshot(): TerminalSnapshot {
    return { hintsUsed: this.hintsUsed, commandsUsed: [...this.commandsUsed], solved: this.solved };
  }
}
