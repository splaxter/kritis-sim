import { useEffect, useRef } from 'react';
import { AsciiFrame } from '../TerminalUI';

interface RunLeaveDialogProps {
  onContinue: () => void; // stay in the run (also what ESC does)
  onLeave: () => void;    // go to main menu
}

const TITLE_ID = 'run-leave-dialog-title';

export function RunLeaveDialog({ onContinue, onLeave }: RunLeaveDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    // Autofocus the safe default: staying in the run.
    continueRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // ESC = stay in the run. Never leaves.
        event.preventDefault();
        onContinue();
      } else if (event.key === 'Tab') {
        const buttons = Array.from(dialogRef.current?.querySelectorAll('button') ?? []);
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [onContinue]);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={TITLE_ID}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 overscroll-contain"
    >
      <div className="w-full max-w-md">
        <AsciiFrame title="RUN VERLASSEN" variant="warning">
          <div className="space-y-4 p-4">
            <h2 id={TITLE_ID} className="text-lg font-bold text-terminal-green">
              Run verlassen und zum Hauptmenü?
            </h2>
            <p className="text-sm leading-relaxed text-terminal-green-dim">
              Du kannst den Run später über „Weiter spielen" fortsetzen. Der aktuelle,
              noch nicht abgeschlossene Schritt wird möglicherweise neu gestartet.
            </p>
            <div className="flex flex-col gap-2 border-t border-terminal-border pt-4 sm:flex-row sm:justify-end">
              <button
                ref={continueRef}
                type="button"
                onClick={onContinue}
                className="inline-flex min-h-11 items-center justify-center border border-terminal-green px-4 py-2 text-sm font-bold text-terminal-green transition-colors hover:bg-terminal-green/10 focus-visible:ring-2 focus-visible:ring-terminal-green focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                Run fortsetzen
              </button>
              <button
                type="button"
                onClick={onLeave}
                className="inline-flex min-h-11 items-center justify-center border border-terminal-border px-4 py-2 text-sm text-terminal-danger transition-colors hover:border-terminal-danger hover:bg-terminal-danger/10 focus-visible:ring-2 focus-visible:ring-terminal-danger focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                Zum Hauptmenü
              </button>
            </div>
          </div>
        </AsciiFrame>
      </div>
    </div>
  );
}
