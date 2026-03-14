// client/src/components/GameScreen/index.tsx
import { useEffect } from 'react';
import { GameState, GameEvent, EventChoice } from '@kritis/shared';
import { StatsBar } from '../StatsBar';
import { EventCard } from '../EventCard';
import { ResultScreen } from '../ResultScreen';
import { Terminal } from '../Terminal';
import { GamePhase } from '../../hooks/useGame';

interface GameScreenProps {
  state: GameState;
  phase: GamePhase;
  currentEvent: GameEvent | null;
  lastChoice: EventChoice | null;
  characters: Record<string, string>;
  onChoice: (choice: EventChoice) => void;
  onContinue: () => void;
  onTerminalSolved: () => void;
  onTerminalCancel: () => void;
}

export function GameScreen({
  state,
  phase,
  currentEvent,
  lastChoice,
  characters,
  onChoice,
  onContinue,
  onTerminalSolved,
  onTerminalCancel,
}: GameScreenProps) {
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase === 'result' && e.key === 'Enter') {
        onContinue();
      }
      if (phase === 'terminal' && e.key === 'Escape') {
        onTerminalCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, onContinue, onTerminalCancel]);

  if (phase === 'terminal' && currentEvent?.terminalContext) {
    return (
      <div className="min-h-screen p-4 flex flex-col">
        <div className="mb-4">
          <StatsBar state={state} />
        </div>
        <div className="flex-1">
          <Terminal
            context={currentEvent.terminalContext}
            onSolved={onTerminalSolved}
            onCancel={onTerminalCancel}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 flex flex-col">
      <div className="mb-4">
        <StatsBar state={state} />
      </div>

      <div className="flex-1">
        {phase === 'playing' && currentEvent && (
          <EventCard
            event={currentEvent}
            state={state}
            onChoice={onChoice}
            characters={characters}
          />
        )}

        {phase === 'result' && lastChoice && (
          <ResultScreen
            choice={lastChoice}
            onContinue={onContinue}
            characters={characters}
          />
        )}

        {phase === 'playing' && !currentEvent && (
          <div className="border border-terminal-border p-8 text-center">
            <div className="text-terminal-green-dim mb-4">Kein Ereignis verfügbar.</div>
            <button
              onClick={onContinue}
              className="p-3 border border-terminal-green hover:bg-terminal-bg-highlight"
            >
              [ENTER] Nächster Tag
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
