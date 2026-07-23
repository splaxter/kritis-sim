// client/src/components/Terminal/session/applyEffects.ts
// The ONLY module that touches the xterm Terminal. It walks a flat, ordered
// TerminalEffect[] produced by TerminalSession and performs the corresponding
// external side effects (writes, clear, bell, drip scheduling, partial-feedback
// callback). It NEVER decides input semantics — the session already did.
import { Terminal } from '@xterm/xterm';
import { TerminalEffect } from './effects';
import { renderInput } from './renderInput';
import type { TerminalSession } from './TerminalSession';

export interface EffectContext {
  session: TerminalSession;
  onPartialSolution: (feedback: string) => void;
  registerDripTimer: (t: ReturnType<typeof setTimeout>) => void;
}

export function applyEffects(term: Terminal, effects: TerminalEffect[], ctx: EffectContext): void {
  for (const eff of effects) {
    switch (eff.type) {
      case 'writeLine':
        term.writeln(eff.text);
        break;
      case 'write':
        term.write(eff.text);
        break;
      case 'renderInput':
        term.write(renderInput(eff));
        break;
      case 'showPartial':
        ctx.onPartialSolution(eff.feedback);
        break;
      case 'showPage':
        // Dead branch — the session never emits `showPage`. Handled for
        // exhaustiveness only.
        for (const l of eff.lines) term.writeln(l);
        break;
      case 'bell':
        term.write('\x07');
        break;
      case 'clearScreen':
        term.clear();
        break;
      case 'updateHints':
        // No-op: React hint state is synced from session.getSnapshot() after
        // each effect batch (single source of truth — see useTerminal.syncState).
        break;
      case 'solved':
        // No-op: the visible banner is the preceding writeLine effects, and
        // onSolved fires inside the session on the confirming Enter.
        break;
      case 'scheduleDrip': {
        const t = setTimeout(() => applyEffects(term, ctx.session.tick('drip'), ctx), eff.delayMs);
        ctx.registerDripTimer(t);
        break;
      }
      default: {
        // Exhaustiveness guard — a new effect type surfaces here at compile time.
        const _never: never = eff;
        void _never;
      }
    }
  }
}
