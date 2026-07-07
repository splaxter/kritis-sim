import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAutosave } from './useAutosave';
import { GamePhase } from './useGame';
import { readAutosave, writeAutosave } from '../engine/autosave';
import { createInitialState } from '../engine/gameState';
import { GameState } from '@kritis/shared';

const PLAYER = 'player-hook-test';

function renderAutosave(initial: { state: GameState; phase: GamePhase }) {
  return renderHook(
    ({ state, phase }: { state: GameState; phase: GamePhase }) =>
      useAutosave(PLAYER, state, phase),
    { initialProps: initial }
  );
}

describe('useAutosave', () => {
  beforeEach(() => localStorage.clear());

  it('does NOT write in menu phase (never clobbers an existing autosave)', () => {
    const existing = { ...createInitialState('OLD', 'beginner'), currentWeek: 5 };
    writeAutosave(PLAYER, existing);

    renderAutosave({ state: createInitialState('FRESH'), phase: 'menu' });

    expect(readAutosave(PLAYER)!.gameState.currentWeek).toBe(5);
  });

  it('writes on every state change while playing / terminal / result', () => {
    const s1 = createInitialState('SEED', 'intermediate');
    const { rerender } = renderAutosave({ state: s1, phase: 'playing' });
    expect(readAutosave(PLAYER)!.gameState).toEqual(s1);

    const s2 = { ...s1, currentDay: 2, stress: 33 };
    rerender({ state: s2, phase: 'result' });
    expect(readAutosave(PLAYER)!.gameState).toEqual(s2);

    const s3 = { ...s2, currentDay: 3 };
    rerender({ state: s3, phase: 'terminal' });
    expect(readAutosave(PLAYER)!.gameState).toEqual(s3);
  });

  it('clears the autosave on gameover', () => {
    const s = createInitialState('SEED');
    const { rerender } = renderAutosave({ state: s, phase: 'playing' });
    expect(readAutosave(PLAYER)).not.toBeNull();

    rerender({ state: s, phase: 'gameover' });
    expect(readAutosave(PLAYER)).toBeNull();
  });

  it('clears the autosave on storyEnding (authored campaign end)', () => {
    const s = createInitialState('SEED', 'story');
    const { rerender } = renderAutosave({ state: s, phase: 'playing' });

    rerender({ state: s, phase: 'storyEnding' });
    expect(readAutosave(PLAYER)).toBeNull();
  });
});
