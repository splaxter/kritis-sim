import { useState, useCallback } from 'react';
import { GameState, EventChoice, GameEvent, Scenario, ScenarioChoice, GameModeId, EventEffects } from '@kritis/shared';
import {
  createInitialState,
  applyEffects,
  advanceDay,
  checkGameOver,
} from '../engine/gameState';
import { calculateScenarioEffects } from '../engine/scenarioEngine';
import {
  advanceStoryBeat,
  advanceSidequest,
  findSidequestByEvent,
  getSidequestRewards,
  updateCharacterMemory,
} from '../engine/adventureEngine';
import {
  recordDecision,
  scheduleChainEvents,
  cleanupPendingEvent,
} from '../engine/chainEngine';

export type GamePhase = 'menu' | 'playing' | 'terminal' | 'result' | 'gameover';
export type ContentType = 'event' | 'scenario';

interface UseGameReturn {
  state: GameState;
  phase: GamePhase;
  // Event handling
  currentEvent: GameEvent | null;
  lastChoice: EventChoice | null;
  // Scenario handling
  currentScenario: Scenario | null;
  lastScenarioChoice: ScenarioChoice | null;
  contentType: ContentType;
  // Game state
  gameOverReason: string | null;
  // Actions
  startNewGame: (seed?: string, mode?: GameModeId) => void;
  loadState: (state: GameState) => void;
  setEvent: (event: GameEvent) => void;
  setScenario: (scenario: Scenario) => void;
  makeChoice: (choice: EventChoice) => void;
  makeScenarioChoice: (choice: ScenarioChoice) => void;
  openTerminal: (choice: EventChoice) => void;
  openScenarioTerminal: (choice: ScenarioChoice) => void;
  closeTerminal: (solved: boolean) => void;
  continueGame: () => void;
  skipToNextDay: () => void;
}

export function useGame(): UseGameReturn {
  const [state, setState] = useState<GameState>(() => createInitialState());
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [contentType, setContentType] = useState<ContentType>('event');

  // Event state
  const [currentEvent, setCurrentEvent] = useState<GameEvent | null>(null);
  const [lastChoice, setLastChoice] = useState<EventChoice | null>(null);
  const [pendingTerminalChoice, setPendingTerminalChoice] = useState<EventChoice | null>(null);

  // Scenario state
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);
  const [lastScenarioChoice, setLastScenarioChoice] = useState<ScenarioChoice | null>(null);
  const [pendingScenarioTerminalChoice, setPendingScenarioTerminalChoice] = useState<ScenarioChoice | null>(null);

  const [gameOverReason, setGameOverReason] = useState<string | null>(null);

  const startNewGame = useCallback((seed?: string, mode: GameModeId = 'beginner') => {
    setState(createInitialState(seed, mode));
    setPhase('playing');
    setContentType('event');
    setCurrentEvent(null);
    setCurrentScenario(null);
    setLastChoice(null);
    setLastScenarioChoice(null);
    setPendingTerminalChoice(null);
    setPendingScenarioTerminalChoice(null);
    setGameOverReason(null);
  }, []);

  const loadState = useCallback((loadedState: GameState) => {
    setState(loadedState);
    setPhase('playing');
    setContentType('event');
    setCurrentEvent(null);
    setCurrentScenario(null);
    setLastChoice(null);
    setLastScenarioChoice(null);
    setPendingTerminalChoice(null);
    setPendingScenarioTerminalChoice(null);
    setGameOverReason(null);
  }, []);

  const setEvent = useCallback((event: GameEvent) => {
    setCurrentEvent(event);
    setCurrentScenario(null);
    setContentType('event');
    setPhase('playing');
  }, []);

  const setScenario = useCallback((scenario: Scenario) => {
    setCurrentScenario(scenario);
    setCurrentEvent(null);
    setContentType('scenario');
    setPhase('playing');
  }, []);

  const makeChoice = useCallback((choice: EventChoice) => {
    setState((prev) => {
      let newState = applyEffects(prev, choice.effects);

      // Chain system: Record the decision
      if (currentEvent) {
        const choiceIndex = currentEvent.choices.indexOf(choice);
        newState = recordDecision(newState, currentEvent, choice, choiceIndex);

        // Chain system: Schedule any consequence events
        newState = scheduleChainEvents(newState, currentEvent, choice);

        // Chain system: Clean up if this was a chain event
        newState = cleanupPendingEvent(newState, currentEvent.id);
      }

      // Set flags from choice
      if (choice.setsFlags) {
        const flags = { ...newState.flags };
        for (const flag of choice.setsFlags) {
          flags[flag] = true;
        }
        newState.flags = flags;
      }

      // Mark event as completed
      if (currentEvent) {
        newState.completedEvents = [...prev.completedEvents, currentEvent.id];
      }

      // Adventure mode: handle story progression and sidequests
      if (prev.isStoryMode && prev.storyState && currentEvent) {
        // Check if this is a sidequest event
        const sidequest = findSidequestByEvent(currentEvent.id);

        if (sidequest) {
          // Advance sidequest progress
          const updatedAdvState = advanceSidequest(prev, sidequest.id);
          newState.storyState = updatedAdvState;

          // Check if sidequest just completed
          if (updatedAdvState.completedSidequests.includes(sidequest.id) &&
              !prev.storyState.completedSidequests.includes(sidequest.id)) {
            // Apply sidequest rewards
            const rewards = getSidequestRewards(sidequest.id);
            if (rewards) {
              // Apply skill rewards
              if (Object.keys(rewards.skills).length > 0) {
                const skillEffects: EventEffects = { skills: rewards.skills };
                newState = applyEffects(newState, skillEffects);
              }

              // Apply relationship rewards
              if (Object.keys(rewards.relationships).length > 0) {
                const relEffects: EventEffects = { relationships: rewards.relationships };
                newState = applyEffects(newState, relEffects);
              }

              // Apply stress reduction
              if (rewards.stressReduction > 0) {
                newState.stress = Math.max(0, newState.stress - rewards.stressReduction);
              }

              // Apply budget bonus
              if (rewards.budgetBonus > 0) {
                newState.budget += rewards.budgetBonus;
              }

              // Set reward flags
              for (const flag of rewards.flags) {
                newState.flags[flag] = true;
              }
            }
          }
        } else {
          // Regular story beat - advance story
          newState.storyState = advanceStoryBeat(prev);
        }

        // Update character memory based on relationship changes
        if (choice.effects.relationships && newState.storyState) {
          let advState = newState.storyState;
          for (const [npcId, change] of Object.entries(choice.effects.relationships)) {
            if (change !== undefined && change !== 0) {
              advState = updateCharacterMemory(
                { ...newState, storyState: advState },
                npcId,
                currentEvent.id,
                change
              );
            }
          }
          newState.storyState = advState;
        }
      }

      return newState;
    });

    setLastChoice(choice);
    setPhase('result');
  }, [currentEvent]);

  const makeScenarioChoice = useCallback((choice: ScenarioChoice) => {
    setState((prev) => {
      // Calculate effects from scenario choice
      const effects = calculateScenarioEffects(choice);
      const newState = applyEffects(prev, effects);

      // Mark scenario as completed
      if (currentScenario) {
        newState.completedScenarios = [...(prev.completedScenarios || []), currentScenario.id];
      }

      // Handle triggered events
      if (choice.triggersEvent) {
        const flags = { ...newState.flags };
        flags[`triggered_${choice.triggersEvent}`] = true;
        newState.flags = flags;
      }

      return newState;
    });

    setLastScenarioChoice(choice);
    setPhase('result');
  }, [currentScenario]);

  const openTerminal = useCallback((choice: EventChoice) => {
    setPendingTerminalChoice(choice);
    setPhase('terminal');
  }, []);

  const openScenarioTerminal = useCallback((choice: ScenarioChoice) => {
    setPendingScenarioTerminalChoice(choice);
    setPhase('terminal');
  }, []);

  const closeTerminal = useCallback((solved: boolean) => {
    // Handle event terminal choice
    if (solved && pendingTerminalChoice) {
      setState((prev) => {
        let newState = applyEffects(prev, pendingTerminalChoice.effects);

        // Chain system: Record the decision
        if (currentEvent) {
          const choiceIndex = currentEvent.choices.indexOf(pendingTerminalChoice);
          newState = recordDecision(newState, currentEvent, pendingTerminalChoice, choiceIndex);

          // Chain system: Schedule any consequence events
          newState = scheduleChainEvents(newState, currentEvent, pendingTerminalChoice);

          // Chain system: Clean up if this was a chain event
          newState = cleanupPendingEvent(newState, currentEvent.id);
        }

        if (pendingTerminalChoice.setsFlags) {
          const flags = { ...newState.flags };
          for (const flag of pendingTerminalChoice.setsFlags) {
            flags[flag] = true;
          }
          newState.flags = flags;
        }

        if (currentEvent) {
          newState.completedEvents = [...prev.completedEvents, currentEvent.id];
        }

        return newState;
      });

      setLastChoice(pendingTerminalChoice);
      setPendingTerminalChoice(null);
      setPhase('result');
      return;
    }

    // Handle scenario terminal choice
    if (solved && pendingScenarioTerminalChoice) {
      setState((prev) => {
        const effects = calculateScenarioEffects(pendingScenarioTerminalChoice);
        const newState = applyEffects(prev, effects);

        if (currentScenario) {
          newState.completedScenarios = [...(prev.completedScenarios || []), currentScenario.id];
        }

        if (pendingScenarioTerminalChoice.triggersEvent) {
          const flags = { ...newState.flags };
          flags[`triggered_${pendingScenarioTerminalChoice.triggersEvent}`] = true;
          newState.flags = flags;
        }

        return newState;
      });

      setLastScenarioChoice(pendingScenarioTerminalChoice);
      setPendingScenarioTerminalChoice(null);
      setPhase('result');
      return;
    }

    // Terminal cancelled - go back to playing without completing
    setPendingTerminalChoice(null);
    setPendingScenarioTerminalChoice(null);
    setPhase('playing');
  }, [pendingTerminalChoice, pendingScenarioTerminalChoice, currentEvent, currentScenario]);

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
      setCurrentScenario(null);
      setLastChoice(null);
      setLastScenarioChoice(null);
      setPendingTerminalChoice(null);
      setPendingScenarioTerminalChoice(null);
      setPhase('playing');
    }
  }, [phase]);

  // Skip to next day without showing result screen (used when no content available)
  const skipToNextDay = useCallback(() => {
    setState((prev) => {
      const newState = advanceDay(prev);
      const gameOver = checkGameOver(newState);
      if (gameOver.isOver) {
        setGameOverReason(gameOver.reason || null);
        setPhase('gameover');
      }
      return newState;
    });
  }, []);

  return {
    state,
    phase,
    currentEvent,
    lastChoice,
    currentScenario,
    lastScenarioChoice,
    contentType,
    gameOverReason,
    startNewGame,
    loadState,
    setEvent,
    setScenario,
    makeChoice,
    makeScenarioChoice,
    openTerminal,
    openScenarioTerminal,
    closeTerminal,
    continueGame,
    skipToNextDay,
  };
}
