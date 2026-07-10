import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { GameEvent, EventChoice } from '@kritis/shared';
import { useGame } from './useGame';

// Minimal terminal/GUI event: one choice that opens a hands-on level.
const choice: EventChoice = {
  id: 'go',
  text: 'open',
  effects: { skills: { windows: 3, security: 1 } },
  resultText: 'done',
  guiCommand: true,
};

const event: GameEvent = {
  id: 'test_gui_event',
  weekRange: [1, 12],
  probability: 1,
  category: 'training',
  involvedCharacters: [],
  title: 'Test',
  description: 'Test',
  choices: [choice],
  tags: [],
};

describe('useGame.closeTerminal — solution skillGain', () => {
  it('applies choice.effects PLUS solution skillGain (additive) on solve', () => {
    const { result } = renderHook(() => useGame());

    // intermediate mode → 1.0 effect multiplier (skills are additive anyway).
    act(() => result.current.startNewGame('SEED', 'intermediate'));
    const before = { ...result.current.state.skills };

    act(() => result.current.setEvent(event));
    act(() => result.current.openTerminal(choice));
    act(() => result.current.closeTerminal(true, { windows: 6, security: 4 }));

    const after = result.current.state.skills;
    // windows: +3 (choice) +6 (skillGain) = +9 ; security: +1 +4 = +5
    expect(after.windows).toBe(before.windows + 9);
    expect(after.security).toBe(before.security + 5);
    expect(result.current.phase).toBe('result');
  });

  it('applies only choice.effects when no skillGain is passed', () => {
    const { result } = renderHook(() => useGame());
    act(() => result.current.startNewGame('SEED', 'intermediate'));
    const before = { ...result.current.state.skills };

    act(() => result.current.setEvent(event));
    act(() => result.current.openTerminal(choice));
    act(() => result.current.closeTerminal(true));

    const after = result.current.state.skills;
    expect(after.windows).toBe(before.windows + 3);
    expect(after.security).toBe(before.security + 1);
  });

  it('applies terminal solution effects such as stress relief', () => {
    const { result } = renderHook(() => useGame());
    act(() => result.current.startNewGame('SEED', 'intermediate'));
    const before = result.current.state.stress;

    act(() => result.current.setEvent(event));
    act(() => result.current.openTerminal(choice));
    act(() => result.current.closeTerminal(true, undefined, undefined, { stress: -10 }));

    expect(result.current.state.stress).toBe(before - 10);
  });

  it('sets solution flags (e.g. full vs partial) on solve', () => {
    const { result } = renderHook(() => useGame());
    act(() => result.current.startNewGame('SEED', 'intermediate'));
    act(() => result.current.setEvent(event));
    act(() => result.current.openTerminal(choice));
    act(() => result.current.closeTerminal(true, { windows: 1 }, ['gui_persistence_full']));

    expect(result.current.state.flags['gui_persistence_full']).toBe(true);
  });

  it('does not apply any effects when the level is cancelled', () => {
    const { result } = renderHook(() => useGame());
    act(() => result.current.startNewGame('SEED', 'intermediate'));
    const before = { ...result.current.state.skills };

    act(() => result.current.setEvent(event));
    act(() => result.current.openTerminal(choice));
    act(() => result.current.closeTerminal(false, { windows: 6 }));

    expect(result.current.state.skills.windows).toBe(before.windows);
    expect(result.current.phase).toBe('playing');
  });
});
