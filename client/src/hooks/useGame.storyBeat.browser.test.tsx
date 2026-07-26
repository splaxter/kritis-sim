import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { GameEvent } from '@kritis/shared';
import { useGame } from './useGame';

// A minimal pure hands-on story level: every choice opens the terminal, so the
// event can ONLY resolve through the solve path (closeTerminal). Exactly the
// shape of the AUDIT TRAIL CLI beats.
const terminalLevel: GameEvent = {
  id: 'test_terminal_beat',
  weekRange: [1, 12],
  probability: 1,
  category: 'story',
  title: 'Testlevel',
  description: 'Ein reines Terminal-Level als Pflicht-Beat.',
  involvedCharacters: [],
  choices: [
    {
      id: 'start',
      text: 'Terminal öffnen...',
      effects: {},
      resultText: 'Geschafft.',
      terminalCommand: true,
      setsFlags: ['test_level_done'],
    },
  ],
  terminalContext: {
    type: 'linux',
    hostname: 'test',
    username: 'timo',
    currentPath: '/home/timo',
    commands: [],
    solutions: [],
    hints: [],
  },
  tags: ['test'],
};

describe('useGame — story progression for solved hands-on beats', () => {
  it('a SOLVED terminal level advances the story beat like a dialog choice', () => {
    const { result } = renderHook(() => useGame());
    act(() => {
      result.current.startNewGame('beat-seed', 'story', 'audit-trail');
    });
    expect(result.current.state.storyState?.currentBeatIndex).toBe(0);

    act(() => {
      result.current.setEvent(terminalLevel);
    });
    act(() => {
      result.current.openTerminal(terminalLevel.choices[0]);
    });
    act(() => {
      result.current.closeTerminal(true, { linux: 3 });
    });

    const s = result.current.state;
    expect(s.storyState?.currentBeatIndex).toBe(1);
    expect(s.storyState?.totalBeatsCompleted).toBe(1);
    expect(s.completedEvents).toContain('test_terminal_beat');
    // Choice flags apply on solve, exactly like the dialog path.
    expect(s.flags.test_level_done).toBe(true);
  });

  it('CANCELLING the terminal does not advance the beat (retry stays possible)', () => {
    const { result } = renderHook(() => useGame());
    act(() => {
      result.current.startNewGame('cancel-seed', 'story', 'audit-trail');
      result.current.setEvent(terminalLevel);
    });
    act(() => {
      result.current.openTerminal(terminalLevel.choices[0]);
    });
    act(() => {
      result.current.closeTerminal(false);
    });

    const s = result.current.state;
    expect(s.storyState?.currentBeatIndex).toBe(0);
    expect(s.completedEvents).not.toContain('test_terminal_beat');
    expect(s.flags.test_level_done).toBeUndefined();
  });

  it('the dialog path (makeChoice) still advances exactly once — probation regression', () => {
    const { result } = renderHook(() => useGame());
    act(() => {
      result.current.startNewGame('probation-seed', 'story');
    });
    expect(result.current.state.storyState?.campaignId).toBe('probation');

    const dialog: GameEvent = {
      ...terminalLevel,
      id: 'test_dialog_beat',
      terminalContext: undefined,
      choices: [{ id: 'a', text: 'Weiter', effects: {}, resultText: 'ok' }],
    };
    act(() => {
      result.current.setEvent(dialog);
    });
    act(() => {
      result.current.makeChoice(dialog.choices[0]);
    });

    expect(result.current.state.storyState?.currentBeatIndex).toBe(1);
    expect(result.current.state.storyState?.totalBeatsCompleted).toBe(1);
  });

  it('outside story mode a solved terminal never touches storyState', () => {
    const { result } = renderHook(() => useGame());
    act(() => {
      result.current.startNewGame('kritis-seed', 'kritis');
      result.current.setEvent(terminalLevel);
    });
    act(() => {
      result.current.openTerminal(terminalLevel.choices[0]);
    });
    act(() => {
      result.current.closeTerminal(true);
    });

    expect(result.current.state.storyState).toBeUndefined();
    expect(result.current.state.completedEvents).toContain('test_terminal_beat');
  });

  it('a solved terminal level updates character memory from choice relationships', () => {
    const withRel: GameEvent = {
      ...terminalLevel,
      id: 'test_terminal_rel',
      choices: [
        {
          ...terminalLevel.choices[0],
          effects: { relationships: { kollegen: 2 } },
        },
      ],
    };
    const { result } = renderHook(() => useGame());
    act(() => {
      result.current.startNewGame('rel-seed', 'story', 'audit-trail');
      result.current.setEvent(withRel);
    });
    act(() => {
      result.current.openTerminal(withRel.choices[0]);
    });
    act(() => {
      result.current.closeTerminal(true);
    });

    const memory = result.current.state.storyState?.characterMemory ?? {};
    expect(memory.kollegen?.trustLevel).toBe(2);
    expect(memory.kollegen?.interactions).toBe(1);
  });
});
