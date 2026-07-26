import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGame } from './useGame';

describe('useGame.setRunFlags', () => {
  it('sets run flags immediately, outside the solve path', () => {
    const { result } = renderHook(() => useGame());
    act(() => {
      result.current.startNewGame('set-run-flags-seed', 'kritis');
    });

    act(() => {
      result.current.setRunFlags(['mailbox_scope_exceeded']);
    });

    expect(result.current.state.flags.mailbox_scope_exceeded).toBe(true);
  });

  it('is idempotent — re-setting an already-set flag does not create a new state object', () => {
    const { result } = renderHook(() => useGame());
    act(() => {
      result.current.startNewGame('idempotent-seed', 'kritis');
      result.current.setRunFlags(['peeked']);
    });

    const stateAfterFirst = result.current.state;

    act(() => {
      result.current.setRunFlags(['peeked']);
    });

    // Same reference proves no setState churn (would re-render / re-autosave).
    expect(result.current.state).toBe(stateAfterFirst);
    expect(result.current.state.flags.peeked).toBe(true);
  });

  it('adds only the newly-missing flags when some are already set', () => {
    const { result } = renderHook(() => useGame());
    act(() => {
      result.current.startNewGame('partial-seed', 'kritis');
      result.current.setRunFlags(['a']);
    });
    act(() => {
      result.current.setRunFlags(['a', 'b']);
    });
    expect(result.current.state.flags.a).toBe(true);
    expect(result.current.state.flags.b).toBe(true);
  });

  it('flags survive closeTerminal(false) — cancelling a level does not clear them', () => {
    const { result } = renderHook(() => useGame());
    act(() => {
      result.current.startNewGame('survives-cancel-seed', 'kritis');
      result.current.setRunFlags(['mailbox_scope_exceeded']);
    });

    act(() => {
      // Cancel path: no pending choice, just clears transient terminal state.
      result.current.closeTerminal(false);
    });

    expect(result.current.state.flags.mailbox_scope_exceeded).toBe(true);
  });

  it('empty flag list is a no-op', () => {
    const { result } = renderHook(() => useGame());
    act(() => {
      result.current.startNewGame('empty-seed', 'kritis');
    });
    const before = result.current.state;
    act(() => {
      result.current.setRunFlags([]);
    });
    expect(result.current.state).toBe(before);
  });
});
