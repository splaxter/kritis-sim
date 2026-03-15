// client/src/App.tsx
import { useGame } from './hooks/useGame';
import { GameScreen } from './components/GameScreen';
import { allEvents } from './content/events';
import { selectNextEvent } from './engine/eventEngine';
import { selectNextScenario } from './engine/scenarioEngine';
import { getAllScenarios } from './content/packs';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { SaveLoadModal } from './components/SaveLoadModal';
import { GameModeSelectModal } from './components/GameModeSelectModal';
import { useSaveLoad } from './hooks/useSaveLoad';
import { GameModeId, getGameModeConfig, GameEvent, Scenario } from '@kritis/shared';
import { getNextStoryContent } from './engine/adventureEngine';
import { adventureStoryEvents } from './content/adventure/story-events';

// Get or create player ID from localStorage
function getPlayerId(): string {
  const stored = localStorage.getItem('kritis_player_id');
  if (stored) return stored;
  const newId = `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem('kritis_player_id', newId);
  return newId;
}

function App() {
  const game = useGame();
  const [playerId] = useState(getPlayerId);
  const [saveLoadModal, setSaveLoadModal] = useState<{ show: boolean; mode: 'save' | 'load' }>({
    show: false,
    mode: 'save',
  });
  const [showModeSelect, setShowModeSelect] = useState(false);
  const { loadGame } = useSaveLoad();
  const [characters] = useState({
    chef: 'Bernd',
    gf: 'Dr. Müller',
    kaemmerer: 'Herr Schmidt',
    athos: 'Frau Weber',
    kollege: 'Thomas',
  });

  // Get all available scenarios
  const allScenarios = useMemo(() => getAllScenarios(), []);

  // Handle load game
  const handleLoadGame = useCallback((state: import('@kritis/shared').GameState) => {
    game.loadState(state);
    setSaveLoadModal({ show: false, mode: 'load' });
  }, [game]);

  // Keyboard shortcuts for save/load
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // ESC to close modal
      if (e.key === 'Escape' && saveLoadModal.show) {
        setSaveLoadModal({ ...saveLoadModal, show: false });
        return;
      }

      // Only allow save/load during gameplay
      if (game.phase !== 'playing' && game.phase !== 'result') return;

      // S for save (Ctrl+S or just S)
      if (e.key === 's' || e.key === 'S') {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
        }
        setSaveLoadModal({ show: true, mode: 'save' });
      }

      // L for load
      if (e.key === 'l' || e.key === 'L') {
        setSaveLoadModal({ show: true, mode: 'load' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [game.phase, saveLoadModal]);

  // Select next content (event or scenario) when needed
  useEffect(() => {
    if (game.phase === 'playing' && !game.currentEvent && !game.currentScenario) {
      // Adventure mode: use story-driven content selection
      if (game.state.isAdventureMode && game.state.adventureState) {
        const combinedEvents = [...allEvents, ...adventureStoryEvents];
        const result = getNextStoryContent(game.state, combinedEvents, allScenarios);

        if (result.content) {
          // Check if it's an event or scenario by looking for 'choices' vs 'steps'
          if ('choices' in result.content) {
            game.setEvent(result.content as GameEvent);
          } else if ('steps' in result.content) {
            game.setScenario(result.content as Scenario);
          }
        }
        return;
      }

      // Standard mode: probabilistic content selection
      // Use scenarios ~30% of the time after week 1, increasing with progression
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

      // Fall back to events
      const nextEvent = selectNextEvent(allEvents, game.state, game.state.seed);
      if (nextEvent) {
        game.setEvent(nextEvent);
      }
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
            className="w-full p-4 border border-terminal-green hover:bg-terminal-bg-highlight transition-colors text-lg mb-2"
          >
            [ NEUES SPIEL STARTEN ]
          </button>
          <button
            onClick={() => setSaveLoadModal({ show: true, mode: 'load' })}
            className="w-full p-3 border border-terminal-border hover:border-terminal-info hover:bg-terminal-bg-highlight transition-colors text-terminal-green-dim"
          >
            [ SPIEL LADEN ]
          </button>
        </div>

        {/* Game Mode Selection Modal */}
        {showModeSelect && (
          <GameModeSelectModal
            onSelect={handleModeSelect}
            onClose={() => setShowModeSelect(false)}
          />
        )}

        {/* Save/Load Modal */}
        {saveLoadModal.show && (
          <SaveLoadModal
            mode={saveLoadModal.mode}
            playerId={playerId}
            currentState={game.state}
            onLoad={handleLoadGame}
            onClose={() => setSaveLoadModal({ ...saveLoadModal, show: false })}
          />
        )}
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
        {showModeSelect && (
          <GameModeSelectModal
            onSelect={handleModeSelect}
            onClose={() => setShowModeSelect(false)}
          />
        )}
      </div>
    );
  }

  return (
    <>
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
      {saveLoadModal.show && (
        <SaveLoadModal
          mode={saveLoadModal.mode}
          playerId={playerId}
          currentState={game.state}
          onLoad={handleLoadGame}
          onClose={() => setSaveLoadModal({ ...saveLoadModal, show: false })}
        />
      )}
    </>
  );
}

export default App;
