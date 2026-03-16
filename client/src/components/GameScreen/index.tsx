// client/src/components/GameScreen/index.tsx
import { useEffect, lazy, Suspense } from 'react';
import { GameState, GameEvent, EventChoice, Scenario, ScenarioChoice } from '@kritis/shared';
import { StatsBar } from '../StatsBar';
import { EventCard } from '../EventCard';
import { ResultScreen } from '../ResultScreen';
import { ScenarioCard } from '../ScenarioCard';
import { ScenarioResultScreen } from '../ScenarioResultScreen';
import { GamePhase, ContentType } from '../../hooks/useGame';

// Lazy load Terminal - only needed when entering terminal mode
const Terminal = lazy(() => import('../Terminal').then(m => ({ default: m.Terminal })));

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
  const isStoryMode = state.isStoryMode;

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
      <div className="min-h-screen p-4 flex flex-col relative z-10">
        <div className="mb-4">
          <StatsBar state={state} />
        </div>
        <div className="flex-1">
          <Suspense
            fallback={
              <div className="border border-terminal-border p-4 text-center">
                <div className="text-terminal-green animate-pulse">Terminal wird geladen...</div>
              </div>
            }
          >
            <Terminal
              context={terminalContext}
              onSolved={onTerminalSolved}
              onCancel={onTerminalCancel}
              gameMode={state.gameMode}
            />
          </Suspense>
        </div>
      </div>
    );
  }

  // Story mode layout - minimal chrome, content over background
  if (isStoryMode) {
    return (
      <div className="min-h-screen flex flex-col relative">
        {/* Floating stats bar at top */}
        <div className="fixed top-0 left-0 right-0 z-20 p-3">
          <div className="max-w-3xl mx-auto">
            <div className="bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2 border border-terminal-green/20">
              <div className="flex justify-between items-center text-sm">
                <span className="text-terminal-green/70">
                  Woche {state.currentWeek} / Tag {state.currentDay}
                </span>
                <div className="flex gap-4 text-terminal-green/50">
                  <span>Stress: {state.stress}%</span>
                  <span>Compliance: {state.compliance}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1">
          {phase === 'playing' && contentType === 'event' && currentEvent && (
            <EventCard
              event={currentEvent}
              state={state}
              onChoice={onChoice}
              characters={characters}
            />
          )}

          {phase === 'playing' && contentType === 'scenario' && currentScenario && (
            <div className="relative z-10 min-h-screen flex flex-col justify-end p-4 pb-8">
              <div className="flex-1 min-h-[30vh]" />
              <div className="max-w-3xl mx-auto w-full">
                <div className="bg-black/85 backdrop-blur-md border border-terminal-green/40 rounded-lg p-5">
                  <ScenarioCard
                    scenario={currentScenario}
                    onChoice={onScenarioChoice}
                  />
                </div>
              </div>
            </div>
          )}

          {phase === 'result' && contentType === 'event' && lastChoice && (
            <div className="relative z-10 min-h-screen flex flex-col justify-end p-4 pb-8">
              <div className="flex-1 min-h-[30vh]" />
              <div className="max-w-3xl mx-auto w-full">
                <div className="bg-black/85 backdrop-blur-md border border-terminal-green/40 rounded-lg overflow-hidden">
                  <ResultScreen
                    choice={lastChoice}
                    onContinue={onContinue}
                    characters={characters}
                    mentorNote={currentEvent?.mentorNote}
                    mentorModeEnabled={state.mentorModeEnabled}
                    isStoryMode={true}
                  />
                </div>
              </div>
            </div>
          )}

          {phase === 'result' && contentType === 'scenario' && lastScenarioChoice && (
            <div className="relative z-10 min-h-screen flex flex-col justify-end p-4 pb-8">
              <div className="flex-1 min-h-[30vh]" />
              <div className="max-w-3xl mx-auto w-full">
                <div className="bg-black/85 backdrop-blur-md border border-terminal-green/40 rounded-lg p-5">
                  <ScenarioResultScreen
                    choice={lastScenarioChoice}
                    bsiReference={currentScenario?.bsiReference}
                    onContinue={onContinue}
                  />
                </div>
              </div>
            </div>
          )}

          {phase === 'playing' && !currentEvent && !currentScenario && (
            <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
              <div className="bg-black/85 backdrop-blur-md border border-terminal-green/40 rounded-lg p-8 text-center">
                <div className="text-gray-300 mb-4">Kein Ereignis verfugbar.</div>
                <button
                  onClick={onContinue}
                  className="px-6 py-3 bg-terminal-green/20 border border-terminal-green rounded hover:bg-terminal-green/30 transition-colors"
                >
                  [ENTER] Nachster Tag
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Standard mode layout
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
            mentorNote={currentEvent?.mentorNote}
            mentorModeEnabled={state.mentorModeEnabled}
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
            <div className="text-terminal-green-dim mb-4">Kein Ereignis verfugbar.</div>
            <button
              onClick={onContinue}
              className="p-3 border border-terminal-green hover:bg-terminal-bg-highlight"
            >
              [ENTER] Nachster Tag
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
