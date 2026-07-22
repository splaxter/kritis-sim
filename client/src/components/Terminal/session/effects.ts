// client/src/components/Terminal/session/effects.ts
import { Skills } from '@kritis/shared';

// `clearScreen` is a distinct effect (not folded into `writeLine`) because
// `term.clear()` is a real external action used by Ctrl-L and `result.clearScreen`.
export type TerminalEffect =
  | { type: 'writeLine'; text: string }
  | { type: 'renderInput'; prompt: string; line: string; cursor: number }
  | { type: 'showPartial'; feedback: string }
  | { type: 'showPage'; lines: string[]; pingLike: boolean }
  | { type: 'bell' }
  | { type: 'clearScreen' }
  | { type: 'updateHints'; count: number }
  | { type: 'solved'; resultText: string; skillGain: Partial<Skills> }
  | { type: 'scheduleDrip'; delayMs: number };
