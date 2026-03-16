// client/src/App.tsx
import { useGame } from './hooks/useGame';
import { GameScreen } from './components/GameScreen';
import { allEvents } from './content/events';
import { selectNextEvent } from './engine/eventEngine';
import { selectNextScenario } from './engine/scenarioEngine';
import { getAllScenarios } from './content/packs';
import { useEffect, useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useSaveLoad } from './hooks/useSaveLoad';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { GameModeId, getGameModeConfig, GameEvent, Scenario } from '@kritis/shared';
import { getNextStoryContent } from './engine/adventureEngine';
import { adventureStoryEvents } from './content/adventure/story-events';
import { IntroScreen } from './components/IntroScreen';
import { StoryBackgroundProvider, useStoryBackground } from './contexts/StoryBackgroundContext';
import { StoryBackground } from './components/StoryBackground';

// Lazy load modals - only needed when user opens them
const SaveLoadModal = lazy(() => import('./components/SaveLoadModal').then(m => ({ default: m.SaveLoadModal })));
const GameModeSelectModal = lazy(() => import('./components/GameModeSelectModal').then(m => ({ default: m.GameModeSelectModal })));

// Get or create player ID from localStorage
function getPlayerId(): string {
  const stored = localStorage.getItem('kritis_player_id');
  if (stored) return stored;
  const newId = `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem('kritis_player_id', newId);
  return newId;
}

function AppContent() {
  const game = useGame();
  const [playerId] = useState(getPlayerId);
  const [showIntro, setShowIntro] = useState(true);
  const [saveLoadModal, setSaveLoadModal] = useState<{ show: boolean; mode: 'save' | 'load' }>({
    show: false,
    mode: 'save',
  });
  const [showModeSelect, setShowModeSelect] = useState(false);
  const [menuIndex, setMenuIndex] = useState(0);
  const { loadGame } = useSaveLoad();
  const [characters] = useState({
    chef: 'Bert',
    gf: 'Dr. Müller',
    kaemmerer: 'Herr Schmidt',
    athos: 'Frau Weber',
    kollege: 'Bjorg',
  });
  const { setStoryMode } = useStoryBackground();

  // Sync story mode state with context
  useEffect(() => {
    setStoryMode(game.state.isStoryMode);
  }, [game.state.isStoryMode, setStoryMode]);

  // Get all available scenarios
  const allScenarios = useMemo(() => getAllScenarios(), []);

  // Handle load game
  const handleLoadGame = useCallback((state: import('@kritis/shared').GameState) => {
    game.loadState(state);
    setSaveLoadModal({ show: false, mode: 'load' });
  }, [game]);

  // Keyboard shortcuts for save/load
  useKeyboardShortcuts({
    onSave: useCallback(() => setSaveLoadModal({ show: true, mode: 'save' }), []),
    onLoad: useCallback(() => setSaveLoadModal({ show: true, mode: 'load' }), []),
    onEscape: useCallback(() => setSaveLoadModal(prev => ({ ...prev, show: false })), []),
    isEnabled: game.phase === 'playing' || game.phase === 'result',
    isModalOpen: saveLoadModal.show,
  });

  // Select next content (event or scenario) when needed
  useEffect(() => {
    if (game.phase === 'playing' && !game.currentEvent && !game.currentScenario) {
      // Adventure mode: use story-driven content selection
      if (game.state.isStoryMode && game.state.storyState) {
        const combinedEvents = [...allEvents, ...adventureStoryEvents];
        const result = getNextStoryContent(game.state, combinedEvents, allScenarios);

        if (result.content) {
          // Check if it's an event or scenario by looking for 'choices' vs 'steps'
          if ('choices' in result.content) {
            game.setEvent(result.content as GameEvent);
          } else if ('steps' in result.content) {
            game.setScenario(result.content as Scenario);
          }
        } else {
          // No adventure content available - advance to next day
          console.warn('No adventure content available, advancing to next day');
          game.skipToNextDay();
        }
        return;
      }

      // Check if we're in CLI-only mode (learning mode)
      const modeConfig = getGameModeConfig(game.state.gameMode);
      const cliOnly = modeConfig.features.cliOnly === true;

      // Standard mode: probabilistic content selection
      // Use scenarios ~30% of the time after week 1, increasing with progression
      // Skip scenarios entirely in CLI-only mode
      if (!cliOnly) {
        const scenarioChance = Math.min(0.5, 0.1 + (game.state.currentWeek - 1) * 0.05);
        const hash = simpleHash(game.state.seed + game.state.currentWeek + game.state.currentDay + game.state.completedEvents.length);
        const useScenario = (hash % 100) < (scenarioChance * 100);

        if (useScenario && allScenarios.length > 0) {
          const nextScenario = selectNextScenario(allScenarios, game.state, game.state.seed);
          if (nextScenario) {
            game.setScenario(nextScenario);
            return;
          }
        }
      }

      // Fall back to events
      const nextEvent = selectNextEvent(allEvents, game.state, game.state.seed);
      if (nextEvent) {
        game.setEvent(nextEvent);
        return;
      }

      // No content available - advance to next day to prevent infinite loop
      // This can happen if all events/scenarios have been completed for this week
      console.warn('No content available for this day, advancing to next day');
      game.skipToNextDay();
    }
  }, [game.phase, game.currentEvent, game.currentScenario, game.state, allScenarios]);

  function simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  // Handle mode selection and start game
  const handleModeSelect = useCallback((mode: GameModeId) => {
    setShowModeSelect(false);
    game.startNewGame(undefined, mode);
  }, [game]);

  // Main menu keyboard navigation
  const menuItems = ['new', 'load'] as const;

  useEffect(() => {
    if (game.phase !== 'menu' || showModeSelect || saveLoadModal.show || showIntro) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        setMenuIndex(prev => (prev + 1) % menuItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (menuItems[menuIndex] === 'new') {
          setShowModeSelect(true);
        } else {
          setSaveLoadModal({ show: true, mode: 'load' });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [game.phase, showModeSelect, saveLoadModal.show, menuIndex, showIntro]);

  // Show intro screen on first load
  if (showIntro) {
    return <IntroScreen onEnter={() => setShowIntro(false)} />;
  }

  if (game.phase === 'menu') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="border border-terminal-border p-8 text-center max-w-lg">
          <h1 className="text-3xl mb-2">KRITIS ADMIN SIMULATOR</h1>
          <div className="text-terminal-green-dim mb-6">v1.0 - Probezeit Edition</div>

          <div className="text-left mb-6 text-terminal-green-dim text-sm">
            <p className="mb-2">Du bist der neue Sysadmin bei einer kommunalen Abfallwirtschaft.</p>
            <p className="mb-2">12 Wochen Probezeit. Drucker reparieren. Server retten. Überleben.</p>
            <p>Deine IT-Skills entscheiden, ob du bleibst oder fliegst.</p>
          </div>

          <button
            onClick={() => setShowModeSelect(true)}
            onMouseEnter={() => setMenuIndex(0)}
            className={`w-full p-4 border transition-colors text-lg mb-2 ${
              menuIndex === 0
                ? 'border-terminal-green bg-terminal-bg-highlight'
                : 'border-terminal-border hover:border-terminal-green'
            }`}
          >
            {menuIndex === 0 ? '> ' : '  '}[ NEUES SPIEL STARTEN ]
          </button>
          <button
            onClick={() => setSaveLoadModal({ show: true, mode: 'load' })}
            onMouseEnter={() => setMenuIndex(1)}
            className={`w-full p-3 border transition-colors ${
              menuIndex === 1
                ? 'border-terminal-info bg-terminal-bg-highlight text-terminal-green'
                : 'border-terminal-border text-terminal-green-dim hover:border-terminal-info'
            }`}
          >
            {menuIndex === 1 ? '> ' : '  '}[ SPIEL LADEN ]
          </button>

          <div className="text-terminal-green-dim text-xs mt-4">
            [↑↓] Navigieren  [Enter] Auswählen
          </div>
        </div>

        {/* Game Mode Selection Modal */}
        <Suspense fallback={null}>
          {showModeSelect && (
            <GameModeSelectModal
              onSelect={handleModeSelect}
              onClose={() => setShowModeSelect(false)}
            />
          )}
        </Suspense>

        {/* Save/Load Modal */}
        <Suspense fallback={null}>
          {saveLoadModal.show && (
            <SaveLoadModal
              mode={saveLoadModal.mode}
              playerId={playerId}
              currentState={game.state}
              onLoad={handleLoadGame}
              onClose={() => setSaveLoadModal({ ...saveLoadModal, show: false })}
            />
          )}
        </Suspense>
      </div>
    );
  }

  if (game.phase === 'gameover') {
    const modeConfig = getGameModeConfig(game.state.gameMode);
    const isVictory = game.gameOverReason === 'probezeit_complete';

    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="border border-terminal-border p-8 text-center max-w-lg">
          <h1 className="text-2xl mb-4">
            {isVictory
              ? '🎉 PROBEZEIT ÜBERSTANDEN!'
              : '❌ GAME OVER'}
          </h1>
          <p className="text-terminal-green-dim mb-4">
            {game.gameOverReason === 'burnout' && 'Du bist ausgebrannt. Die Arbeit war zu viel.'}
            {game.gameOverReason === 'fired' && 'Dein Chef hat dich gefeuert.'}
            {game.gameOverReason === 'bsi_bussgeld' && 'BSI-Compliance zu niedrig. Massive Bußgelder.'}
            {game.gameOverReason === 'probezeit_complete' && `Du hast die ${modeConfig.gameLength.totalWeeks} Wochen überstanden!`}
          </p>

          {/* Show arcade score if applicable */}
          {game.state.gameMode === 'arcade' && game.state.arcadeScore !== undefined && (
            <div className="mb-4 p-3 border border-terminal-info">
              <div className="text-terminal-info text-lg">
                ARCADE SCORE: {game.state.arcadeScore.toLocaleString('de-DE')}
              </div>
            </div>
          )}

          {/* Mode info */}
          <div className="text-terminal-green-dim text-sm mb-6">
            Modus: {modeConfig.icon} {modeConfig.name}
          </div>

          <button
            onClick={() => setShowModeSelect(true)}
            className="w-full p-4 border border-terminal-green hover:bg-terminal-bg-highlight"
          >
            [ NOCHMAL VERSUCHEN ]
          </button>
        </div>

        {/* Game Mode Selection Modal */}
        <Suspense fallback={null}>
          {showModeSelect && (
            <GameModeSelectModal
              onSelect={handleModeSelect}
              onClose={() => setShowModeSelect(false)}
            />
          )}
        </Suspense>
      </div>
    );
  }

  return (
    <>
      {/* Persistent story mode background */}
      <StoryBackground />

      <GameScreen
        state={game.state}
        phase={game.phase}
        contentType={game.contentType}
        currentEvent={game.currentEvent}
        currentScenario={game.currentScenario}
        lastChoice={game.lastChoice}
        lastScenarioChoice={game.lastScenarioChoice}
        characters={characters}
        onChoice={(choice) => {
          if (choice.terminalCommand && game.currentEvent?.terminalContext) {
            game.openTerminal(choice);
          } else {
            game.makeChoice(choice);
          }
        }}
        onScenarioChoice={(choice) => {
          if (choice.terminalCommand && game.currentScenario?.terminalContext) {
            game.openScenarioTerminal(choice);
          } else {
            game.makeScenarioChoice(choice);
          }
        }}
        onContinue={game.continueGame}
        onTerminalSolved={() => game.closeTerminal(true)}
        onTerminalCancel={() => game.closeTerminal(false)}
        onSave={() => setSaveLoadModal({ show: true, mode: 'save' })}
        onLoad={() => setSaveLoadModal({ show: true, mode: 'load' })}
      />

      {/* Save/Load Modal */}
      <Suspense fallback={null}>
        {saveLoadModal.show && (
          <SaveLoadModal
            mode={saveLoadModal.mode}
            playerId={playerId}
            currentState={game.state}
            onLoad={handleLoadGame}
            onClose={() => setSaveLoadModal({ ...saveLoadModal, show: false })}
          />
        )}
      </Suspense>
    </>
  );
}

// Main App wrapper with providers
function App() {
  return (
    <StoryBackgroundProvider>
      <AppContent />
    </StoryBackgroundProvider>
  );
}

export default App;
