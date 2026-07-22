// client/src/components/Terminal/index.tsx
import '@xterm/xterm/css/xterm.css';
import { useState } from 'react';
import { TerminalContext, Skills, GameModeId, EventEffects } from '@kritis/shared';
import { useTerminal } from './useTerminal';

interface TerminalProps {
  context: TerminalContext;
  onSolved: (skillGain: Partial<Skills>, setsFlags?: string[], solutionEffects?: EventEffects) => void;
  onCancel: () => void;
  gameMode?: GameModeId;
  /** Fallback task summary when the context has no taskText (extracted from the briefing) */
  task?: string;
}

export function Terminal({ context, onSolved, onCancel, gameMode = 'intermediate', task }: TerminalProps) {
  const [partialFeedback, setPartialFeedback] = useState<string | null>(null);
  const { terminalRef, hintsRemaining, showHint } = useTerminal({
    context,
    onSolved,
    onPartialSolution: setPartialFeedback,
    gameMode,
  });

  const taskText = context.taskText ?? task;

  return (
    <div className="flex h-full min-w-0 flex-col border border-terminal-border">
      {/* Header */}
      <div className="flex flex-col items-start gap-2 border-b border-terminal-border bg-terminal-bg-secondary p-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="min-w-0 break-all">Terminal: {context.hostname} [{context.type === 'linux' ? 'Linux' : 'Windows'}]</span>
        <button
          onClick={onCancel}
          className="inline-flex min-h-11 shrink-0 items-center text-terminal-danger hover:underline"
        >
          [ESC] Abbrechen
        </button>
      </div>

      {/* Persistent task panel — the quest stays reviewable while playing */}
      {taskText && (
        <div className="border-b border-terminal-border bg-terminal-bg-secondary px-3 py-2 text-sm max-h-28 overflow-y-auto">
          <span className="text-terminal-warning">📋 Aufgabe:</span>
          <div className="whitespace-pre-line text-terminal-green-muted">{taskText}</div>
        </div>
      )}

      {/* Terminal area */}
      <div ref={terminalRef} className="flex-1 p-2" />

      {partialFeedback && (
        <div
          role="status"
          className="border-t border-terminal-warning bg-terminal-warning/10 px-3 py-2 text-sm text-terminal-warning"
        >
          {partialFeedback}
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-col gap-2 border-t border-terminal-border bg-terminal-bg-secondary p-2 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <span className="text-terminal-green-muted">[Tab] Autovervollständigung</span>
          <button
            onClick={showHint}
            disabled={hintsRemaining === 0}
            className={`inline-flex min-h-11 items-center ${
              hintsRemaining > 0 ? 'hover:underline' : 'text-terminal-green-muted'
            }`}
          >
            [?] Hinweis ({hintsRemaining} übrig)
          </button>
        </span>
        <span className="shrink-0 text-terminal-green-muted">
          [ESC] Abbrechen
        </span>
      </div>
    </div>
  );
}
