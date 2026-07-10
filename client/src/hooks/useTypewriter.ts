import { useEffect, useRef, useState, useCallback } from 'react';

interface TypewriterOptions {
  charsPerSecond?: number;
  /** false → Text sofort vollständig (reduced motion, Nicht-Story-Modus). */
  enabled?: boolean;
}

const TICK_MS = 100;

/**
 * Progressive Textanzeige für Story-Events. skip() zeigt sofort alles;
 * der Aufrufer entscheidet, welche Eingabe skippt (EventCard: Enter/Ziffern).
 */
export function useTypewriter(fullText: string, options: TypewriterOptions = {}) {
  const { charsPerSecond = 500, enabled = true } = options;
  const [visibleChars, setVisibleChars] = useState(enabled ? 0 : fullText.length);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    setVisibleChars(enabled ? 0 : fullText.length);
    if (!enabled) return;

    const perTick = Math.max(1, Math.round((charsPerSecond * TICK_MS) / 1000));
    intervalRef.current = window.setInterval(() => {
      setVisibleChars((prev) => {
        const next = prev + perTick;
        if (next >= fullText.length && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return Math.min(next, fullText.length);
      });
    }, TICK_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [fullText, charsPerSecond, enabled]);

  const skip = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setVisibleChars(fullText.length);
  }, [fullText]);

  return {
    text: fullText.slice(0, visibleChars),
    done: visibleChars >= fullText.length,
    skip,
  };
}
