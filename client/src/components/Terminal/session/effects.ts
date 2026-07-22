// client/src/components/Terminal/session/effects.ts
import { Skills } from '@kritis/shared';

// `clearScreen` is a distinct effect (not folded into `writeLine`) because
// `term.clear()` is a real external action used by Ctrl-L and `result.clearScreen`.
export type TerminalEffect =
  | { type: 'writeLine'; text: string }
  // Raw write WITHOUT a trailing newline (maps to term.write, not term.writeln).
  // Needed for the pending-input prompt (real ssh writes `password: ` inline)
  // and for inline echo/erase of NON-masked pending answers (ssh-keygen/ufw
  // prompts) — writeLine would force a newline and corrupt the line.
  | { type: 'write'; text: string }
  | { type: 'renderInput'; prompt: string; line: string; cursor: number }
  | { type: 'showPartial'; feedback: string }
  | { type: 'showPage'; lines: string[]; pingLike: boolean }
  | { type: 'bell' }
  | { type: 'clearScreen' }
  | { type: 'updateHints'; count: number }
  | { type: 'solved'; resultText: string; skillGain: Partial<Skills> }
  | { type: 'scheduleDrip'; delayMs: number };
