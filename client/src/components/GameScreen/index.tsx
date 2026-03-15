// client/src/components/GameScreen/index.tsx
import { useEffect } from 'react';
import { GameState, GameEvent, EventChoice, Scenario, ScenarioChoice } from '@kritis/shared';
import { StatsBar } from '../StatsBar';
import { EventCard } from '../EventCard';
import { ResultScreen } from '../ResultScreen';
import { ScenarioCard } from '../ScenarioCard';
import { ScenarioResultScreen } from '../ScenarioResultScreen';
import { Terminal } from '../Terminal';
import { GamePhase, ContentType } from '../../hooks/useGame';

interface GameScreenProps {
  state: GameState;
  phase: GamePhase;
  contentType: ContentType;
  currentEvent: GameEvent | null;
  currentScenario: Scenario | null;
  lastChoice: EventChoice | null;
  lastScenarioChoice: ScenarioChoice | null;
  characters: Record<string, string>;
  onChoice: (choice: EventChoice) => void;
  onScenarioChoice: (choice: ScenarioChoice) => void;
  onContinue: () => void;
  onTerminalSolved: () => void;
  onTerminalCancel: () => void;
  onSave?: () => void;
  onLoad?: () => void;
}

export function GameScreen({
  state,
  phase,
  contentType,
  currentEvent,
  currentScenario,
  lastChoice,
  lastScenarioChoice,
  characters,
  onChoice,
  onScenarioChoice,
  onContinue,
  onTerminalSolved,
  onTerminalCancel,
  onSave,
  onLoad,
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

  // Get terminal context from either event or scenario
  const terminalContext = currentEvent?.terminalContext || currentScenario?.terminalContext;

  if (phase === 'terminal' && terminalContext) {
    return (
      <div className="min-h-screen p-4 flex flex-col">
        <div className="mb-4">
          <StatsBar state={state} />
        </div>
        <div className="flex-1">
          <Terminal
            context={terminalContext}
            onSolved={onTerminalSolved}
            onCancel={onTerminalCancel}
            gameMode={state.gameMode}
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
        {/* Event display */}
        {phase === 'playing' && contentType === 'event' && currentEvent && (
          <EventCard
            event={currentEvent}
            state={state}
            onChoice={onChoice}
            characters={characters}
          />
        )}

        {/* Scenario display */}
        {phase === 'playing' && contentType === 'scenario' && currentScenario && (
          <ScenarioCard
            scenario={currentScenario}
            onChoice={onScenarioChoice}
          />
        )}

        {/* Event result */}
        {phase === 'result' && contentType === 'event' && lastChoice && (
          <ResultScreen
            choice={lastChoice}
            onContinue={onContinue}
            characters={characters}
          />
        )}

        {/* Scenario result */}
        {phase === 'result' && contentType === 'scenario' && lastScenarioChoice && (
          <ScenarioResultScreen
            choice={lastScenarioChoice}
            bsiReference={currentScenario?.bsiReference}
            onContinue={onContinue}
          />
        )}

        {/* No content available */}
        {phase === 'playing' && !currentEvent && !currentScenario && (
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

      {/* Footer with save/load hints */}
      <div className="mt-4 pt-2 border-t border-terminal-border text-sm text-terminal-green-muted flex justify-between">
        <span>Woche {state.currentWeek} / Tag {state.currentDay}</span>
        <span>
          {onSave && (
            <button onClick={onSave} className="hover:text-terminal-info mr-4">
              [S] Speichern
            </button>
          )}
          {onLoad && (
            <button onClick={onLoad} className="hover:text-terminal-info">
              [L] Laden
            </button>
          )}
        </span>
      </div>
    </div>
  );
}
