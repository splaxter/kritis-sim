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

  handleData(_data: string): TerminalEffect[] { return []; }        // stub — later task
  handleHintRequest(): TerminalEffect[] { return []; }              // stub — later task
  tick(_kind: 'drip'): TerminalEffect[] { return []; }              // stub — later task

  getSnapshot(): TerminalSnapshot {
    return { hintsUsed: this.hintsUsed, commandsUsed: [...this.commandsUsed], solved: this.solved };
  }
}
