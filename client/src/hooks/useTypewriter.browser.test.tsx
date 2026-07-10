import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTypewriter } from './useTypewriter';

describe('useTypewriter', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('reveals text progressively at the given speed', () => {
    const { result } = renderHook(() => useTypewriter('Hallo Welt', { charsPerSecond: 10 }));
    expect(result.current.text).toBe('');
    expect(result.current.done).toBe(false);
    act(() => { vi.advanceTimersByTime(500); }); // 10 cps * 0.5s = 5 Zeichen
    expect(result.current.text).toBe('Hallo');
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current.text).toBe('Hallo Welt');
    expect(result.current.done).toBe(true);
  });

  it('skip() completes instantly', () => {
    const { result } = renderHook(() => useTypewriter('Hallo Welt', { charsPerSecond: 10 }));
    act(() => { result.current.skip(); });
    expect(result.current.text).toBe('Hallo Welt');
    expect(result.current.done).toBe(true);
  });

  it('restarts when the input text changes', () => {
    const { result, rerender } = renderHook(
      ({ t }) => useTypewriter(t, { charsPerSecond: 10 }),
      { initialProps: { t: 'Erster' } }
    );
    act(() => { result.current.skip(); });
    rerender({ t: 'Zweiter Text' });
    expect(result.current.done).toBe(false);
    expect(result.current.text).toBe('');
  });

  it('is instant when disabled (reduced motion / non-story)', () => {
    const { result } = renderHook(() => useTypewriter('Hallo', { charsPerSecond: 10, enabled: false }));
    expect(result.current.text).toBe('Hallo');
    expect(result.current.done).toBe(true);
  });
});
