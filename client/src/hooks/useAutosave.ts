/**
 * Autosaves the run on every meaningful transition. All state mutations in
 * useGame (makeChoice/closeTerminal/continueGame/advanceDay/skipToNextDay/…)
 * produce a new `state` object, so a plain effect on (state, phase) fires
 * exactly once per transition. No debounce: writes are player-action-paced
 * (a handful per minute) and the payload is a few KB — if that ever changes,
 * debounce HERE, callers stay untouched.
 */
import { useEffect } from 'react';
import { GameState } from '@kritis/shared';
import { GamePhase } from './useGame';
import { writeAutosave, clearAutosave } from '../engine/autosave';

const ACTIVE_PHASES: readonly GamePhase[] = ['playing', 'terminal', 'result'];

export function useAutosave(
  playerId: string,
  state: GameState,
  phase: GamePhase
): void {
  useEffect(() => {
    if (ACTIVE_PHASES.includes(phase)) {
      writeAutosave(playerId, state);
    } else if (phase === 'gameover' || phase === 'storyEnding') {
      // Run is over (lost, won, or reached the authored campaign end) —
      // there is nothing to resume.
      clearAutosave(playerId);
    }
    // phase === 'menu': intentionally do nothing. useGame mounts with a fresh
    // createInitialState() in menu phase; writing here would clobber the
    // autosave we want to offer for resume.
  }, [playerId, state, phase]);
}
