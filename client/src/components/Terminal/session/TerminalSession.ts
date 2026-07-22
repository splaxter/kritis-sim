// client/src/components/Terminal/session/TerminalSession.ts
// Framework-free, unit-testable owner of the terminal input loop. It holds all
// state that useTerminal.ts previously kept in closure/refs and returns a flat,
// ordered TerminalEffect[] from each input method. The ShellEngine is injected
// (deps.shell) — the session never calls createShellFromContext itself.
//
// Task 4 scope: constructor, getSnapshot(), init() (connect banner + optional
// beginner auto-hint + first prompt) and the private prompt computation. The
// keystroke methods (handleData/handleHintRequest/tick) are STUBS returning [].
import { TerminalContext, Skills, GameModeId, EventEffects } from '@kritis/shared';
import { ShellEngine } from '../../../engine/shell';
import { buildPrompt } from '../prompt';
import { TerminalEffect } from './effects';
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
  private pendingInput: { prompt: string; mask: boolean; resume: (answer: string) => void } | null = null;

  // --- credited commands + live skill drip ---
  private creditedCommands = new Set<string>();
  private liveSkillGain: Partial<Skills> = {};

  // --- streaming queue state (drip output) ---
  private streamQueue: string[] = [];
  private streaming = false;

  // --- tab completion state ---
  private tabCompletions: string[] = [];
  private tabIndex = 0;

  // --- hint / command tracking (exposed via snapshot) ---
  private hintsUsed = 0;
  private commandsUsed: string[] = [];
  private teachedCommands = new Set<string>();

  // --- cached prompt string ---
  private prompt = '';

  constructor(private deps: TerminalSessionDeps) {
    this.prompt = this.computePrompt();
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
    // NOTE: Enter (`\r`), Tab (`\t`), the empty-line `?` hint, and the
    // pending-input / streaming / solved branches are owned by later tasks.
    // Anything not handled below falls through to `return []`.

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

      case '?': // ? — insert as a normal char only on a non-empty line.
        // The empty-line hint branch is deferred to Task 8; return [] for now.
        if (this.line.length > 0) {
          this.line = this.line.slice(0, this.cursorPos) + data + this.line.slice(this.cursorPos);
          this.cursorPos++;
          return [this.render()];
        }
        return [];

      default:
        if (data >= ' ') {
          // Insert printable character at cursor position.
          this.line = this.line.slice(0, this.cursorPos) + data + this.line.slice(this.cursorPos);
          this.cursorPos++;
          return [this.render()];
        }
        // Enter (`\r`), Tab (`\t`), and any other unowned keystroke — later task.
        return [];
    }
  }
  handleHintRequest(): TerminalEffect[] { return []; }              // stub — later task
  tick(_kind: 'drip'): TerminalEffect[] { return []; }              // stub — later task

  getSnapshot(): TerminalSnapshot {
    return { hintsUsed: this.hintsUsed, commandsUsed: [...this.commandsUsed], solved: this.solved };
  }
}
