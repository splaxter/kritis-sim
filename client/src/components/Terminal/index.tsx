// client/src/components/Terminal/index.tsx
import '@xterm/xterm/css/xterm.css';
import { TerminalContext, Skills } from '@kritis/shared';
import { useTerminal } from './useTerminal';

interface TerminalProps {
  context: TerminalContext;
  onSolved: (skillGain: Partial<Skills>) => void;
  onCancel: () => void;
}

export function Terminal({ context, onSolved, onCancel }: TerminalProps) {
  const { terminalRef, hintsRemaining, showHint } = useTerminal({
    context,
    onSolved,
    onPartialSolution: (_feedback) => {
      // TODO: Display partial solution feedback to user
    },
  });

  return (
    <div className="border border-terminal-border h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-2 border-b border-terminal-border bg-terminal-bg-secondary">
        <span>Terminal: {context.hostname} [{context.type === 'linux' ? 'Linux' : 'Windows'}]</span>
        <button onClick={onCancel} className="text-terminal-danger hover:underline">
          [ESC] Abbrechen
        </button>
      </div>

      {/* Terminal area */}
      <div ref={terminalRef} className="flex-1 p-2" />

      {/* Footer */}
      <div className="p-2 border-t border-terminal-border bg-terminal-bg-secondary flex justify-between text-sm">
        <span className="flex gap-4">
          <span className="text-terminal-green-muted">[Tab] Autovervollständigung</span>
          <button
            onClick={showHint}
            disabled={hintsRemaining === 0}
            className={hintsRemaining > 0 ? 'hover:underline' : 'text-terminal-green-muted'}
          >
            [H] Hinweis ({hintsRemaining} übrig)
          </button>
        </span>
        <span className="text-terminal-green-muted">
          [ESC] Abbrechen
        </span>
      </div>
    </div>
  );
}
