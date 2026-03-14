// client/src/App.tsx
import { useGame } from './hooks/useGame';
import { GameScreen } from './components/GameScreen';
import { allEvents } from './content/events';
import { selectNextEvent } from './engine/eventEngine';
import { useEffect, useState } from 'react';

function App() {
  const game = useGame();
  const [characters] = useState({
    chef: 'Bernd',
    gf: 'Dr. Müller',
    kaemmerer: 'Herr Schmidt',
    athos: 'Frau Weber',
    kollege: 'Thomas',
  });

  // Select next event when needed
  useEffect(() => {
    if (game.phase === 'playing' && !game.currentEvent) {
      const nextEvent = selectNextEvent(allEvents, game.state, game.state.seed);
      if (nextEvent) {
        game.setEvent(nextEvent);
      }
    }
  }, [game.phase, game.currentEvent, game.state]);

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
            onClick={() => game.startNewGame()}
            className="w-full p-4 border border-terminal-green hover:bg-terminal-bg-highlight transition-colors text-lg"
          >
            [ NEUES SPIEL STARTEN ]
          </button>
        </div>
      </div>
    );
  }

  if (game.phase === 'gameover') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="border border-terminal-border p-8 text-center max-w-lg">
          <h1 className="text-2xl mb-4">
            {game.gameOverReason === 'probezeit_complete'
              ? '🎉 PROBEZEIT ÜBERSTANDEN!'
              : '❌ GAME OVER'}
          </h1>
          <p className="text-terminal-green-dim mb-6">
            {game.gameOverReason === 'burnout' && 'Du bist ausgebrannt. Die Arbeit war zu viel.'}
            {game.gameOverReason === 'fired' && 'Dein Chef hat dich gefeuert.'}
            {game.gameOverReason === 'bsi_bussgeld' && 'BSI-Compliance bei 0%. Massive Bußgelder.'}
            {game.gameOverReason === 'probezeit_complete' && 'Du hast die 12 Wochen überstanden!'}
          </p>
          <button
            onClick={() => game.startNewGame()}
            className="w-full p-4 border border-terminal-green hover:bg-terminal-bg-highlight"
          >
            [ NOCHMAL VERSUCHEN ]
          </button>
        </div>
      </div>
    );
  }

  return (
    <GameScreen
      state={game.state}
      phase={game.phase}
      currentEvent={game.currentEvent}
      lastChoice={game.lastChoice}
      characters={characters}
      onChoice={(choice) => {
        if (choice.terminalCommand && game.currentEvent?.terminalContext) {
          game.openTerminal();
        } else {
          game.makeChoice(choice);
        }
      }}
      onContinue={game.continueGame}
      onTerminalSolved={() => {
        if (game.lastChoice || game.currentEvent?.choices[0]) {
          game.makeChoice(game.lastChoice || game.currentEvent!.choices[0]);
        }
        game.closeTerminal(true);
      }}
      onTerminalCancel={() => game.closeTerminal(false)}
    />
  );
}

export default App;
