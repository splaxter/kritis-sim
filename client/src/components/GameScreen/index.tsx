// client/src/components/GameScreen/index.tsx
import { useEffect, lazy, Suspense } from 'react';
import { GameState, GameEvent, EventChoice, Scenario, ScenarioChoice, Skills, EventEffects } from '@kritis/shared';
import { StatsBar } from '../StatsBar';
import { EventCard } from '../EventCard';
import { ResultScreen, LearningResultCtas } from '../ResultScreen';
import { ScenarioCard } from '../ScenarioCard';
import { ScenarioResultScreen } from '../ScenarioResultScreen';
import { GamePhase, ContentType } from '../../hooks/useGame';
import { extractTaskText } from './extractTaskText';

// Lazy load Terminal - only needed when entering terminal mode
const Terminal = lazy(() => import('../Terminal').then(m => ({ default: m.Terminal })));
// Lazy load Windows GUI level - pulls in Fluent UI, only needed for GUI levels
const WindowsLevel = lazy(() => import('../WindowsLevel').then(m => ({ default: m.WindowsLevel })));

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
  onTerminalSolved: (skillGain: Partial<Skills>, setsFlags?: string[], solutionEffects?: EventEffects) => void;
  onTerminalCancel: () => void;
  onSave?: () => void;
  onLoad?: () => void;
  /** learning mode only: explicit next-step CTAs on the result screen */
  learningResultCtas?: LearningResultCtas;
  /** one-time free-play → learning nudge on the (standard) result screen */
  learningNudge?: { onDismiss: () => void };
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
  learningResultCtas,
  learningNudge,
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

  // Get terminal / GUI context from either event or scenario
  const terminalContext = currentEvent?.terminalContext || currentScenario?.terminalContext;
  const guiContext = currentEvent?.guiContext || currentScenario?.guiContext;

  // Learning-mode header shows a progress counter. With the track system a level
  // id no longer encodes a global "lesson N" (GUI levels have no number, tracks
  // are non-linear), so derive the current lesson from how many learning levels
  // are already done: the active one is "next" → completed + 1.
  const completedLearningLevels = state.completedEvents.filter((id) =>
    id.startsWith('learn_') || id.startsWith('gui_')
  ).length;
  const currentLessonNumber = completedLearningLevels + 1;

  // Quest summary shown in the terminal's persistent task panel
  const terminalTask =
    extractTaskText(currentEvent?.description) ??
    extractTaskText(currentScenario?.flavorText);

  if (phase === 'terminal' && (terminalContext || guiContext)) {
    return (
      <div className="min-h-screen p-4 flex flex-col relative z-10">
        <div className="mb-4">
          <StatsBar state={state} currentLessonNumber={currentLessonNumber} totalLessons={11} />
        </div>
        <div className="flex-1">
          <Suspense
            fallback={
              <div className="border border-terminal-border p-4 text-center">
                <div className="text-terminal-green animate-pulse">Wird geladen...</div>
              </div>
            }
          >
            {guiContext ? (
              <WindowsLevel
                context={guiContext}
                onSolved={onTerminalSolved}
                onCancel={onTerminalCancel}
                gameMode={state.gameMode}
                briefingOverride={
                  guiContext.briefingVariants?.find((v) => state.flags[v.flag])?.briefing
                }
              />
            ) : (
              <Terminal
                context={terminalContext!}
                task={terminalTask}
                onSolved={onTerminalSolved}
                onCancel={onTerminalCancel}
                gameMode={state.gameMode}
              />
            )}
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
                    learningCtas={learningResultCtas}
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
                <div className="text-gray-300 mb-4">Kein Ereignis verfügbar.</div>
                <button
                  onClick={onContinue}
                  className="px-6 py-3 bg-terminal-green/20 border border-terminal-green rounded hover:bg-terminal-green/30 transition-colors"
                >
                  [ENTER] Nächster Tag
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
        <StatsBar state={state} currentLessonNumber={currentLessonNumber} totalLessons={11} />
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
            learningCtas={learningResultCtas}
            learningNudge={learningNudge}
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
