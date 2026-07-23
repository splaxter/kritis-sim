import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGame } from './useGame';

describe('useGame.returnToMenu', () => {
  it('sets phase to menu and clears transient content without resetting the run', () => {
    const { result } = renderHook(() => useGame());
    act(() => {
      result.current.startNewGame('return-to-menu-seed', 'kritis');
    });

    // Capture the running GameState (seed + mode prove this specific run persists).
    const stateBefore = result.current.state;
    const seedBefore = result.current.state.seed;
    const modeBefore = result.current.state.gameMode;

    act(() => {
      result.current.returnToMenu();
    });

    expect(result.current.phase).toBe('menu');
    expect(result.current.currentEvent).toBeNull();
    expect(result.current.currentScenario).toBeNull();

    // The run's GameState must be untouched — returnToMenu must NOT create a
    // fresh state. Same object reference + same seed/mode prove no setState ran.
    expect(result.current.state).toBe(stateBefore);
    expect(result.current.state.seed).toBe(seedBefore);
    expect(result.current.state.gameMode).toBe(modeBefore);
  });
});
