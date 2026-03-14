import { useState, useCallback } from 'react';
import { GameState, EventChoice, GameEvent } from '@kritis/shared';
import {
  createInitialState,
  applyEffects,
  advanceDay,
  checkGameOver,
} from '../engine/gameState';

export type GamePhase = 'menu' | 'playing' | 'terminal' | 'result' | 'gameover';

interface UseGameReturn {
  state: GameState;
  phase: GamePhase;
  currentEvent: GameEvent | null;
  lastChoice: EventChoice | null;
  gameOverReason: string | null;
  startNewGame: (seed?: string) => void;
  setEvent: (event: GameEvent) => void;
  makeChoice: (choice: EventChoice) => void;
  openTerminal: () => void;
  closeTerminal: (solved: boolean) => void;
  continueGame: () => void;
}

export function useGame(): UseGameReturn {
  const [state, setState] = useState<GameState>(() => createInitialState());
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [currentEvent, setCurrentEvent] = useState<GameEvent | null>(null);
  const [lastChoice, setLastChoice] = useState<EventChoice | null>(null);
  const [gameOverReason, setGameOverReason] = useState<string | null>(null);

  const startNewGame = useCallback((seed?: string) => {
    setState(createInitialState(seed));
    setPhase('playing');
    setCurrentEvent(null);
    setLastChoice(null);
    setGameOverReason(null);
  }, []);

  const setEvent = useCallback((event: GameEvent) => {
    setCurrentEvent(event);
    setPhase('playing');
  }, []);

  const makeChoice = useCallback((choice: EventChoice) => {
    setState((prev) => {
      const newState = applyEffects(prev, choice.effects);

      if (choice.setsFlags) {
        const flags = { ...newState.flags };
        for (const flag of choice.setsFlags) {
          flags[flag] = true;
        }
        newState.flags = flags;
      }

      if (currentEvent) {
        newState.completedEvents = [...prev.completedEvents, currentEvent.id];
      }

      return newState;
    });

    setLastChoice(choice);
    setPhase('result');
  }, [currentEvent]);

  const openTerminal = useCallback(() => {
    setPhase('terminal');
  }, []);

  const closeTerminal = useCallback((solved: boolean) => {
    if (solved && lastChoice) {
      setPhase('result');
    } else {
      setPhase('playing');
    }
  }, [lastChoice]);

  const continueGame = useCallback(() => {
    setState((prev) => {
      const newState = advanceDay(prev);
      const gameOver = checkGameOver(newState);
      if (gameOver.isOver) {
        setGameOverReason(gameOver.reason || null);
        setPhase('gameover');
      }
      return newState;
    });

    if (phase !== 'gameover') {
      setCurrentEvent(null);
      setLastChoice(null);
      setPhase('playing');
    }
  }, [phase]);

  return {
    state,
    phase,
    currentEvent,
    lastChoice,
    gameOverReason,
    startNewGame,
    setEvent,
    makeChoice,
    openTerminal,
    closeTerminal,
    continueGame,
  };
}
