import { useEffect, useRef, useState, useCallback } from 'react';

interface TypewriterOptions {
  charsPerSecond?: number;
  /** false → Text sofort vollständig (reduced motion, Nicht-Story-Modus). */
  enabled?: boolean;
}

const TICK_MS = 20; // ≈50 fps, smooth time-based reveal

/**
 * Progressive Textanzeige für Story-Events. skip() zeigt sofort alles;
 * der Aufrufer entscheidet, welche Eingabe skippt (EventCard: Enter/Ziffern).
 */
export function useTypewriter(fullText: string, options: TypewriterOptions = {}) {
  const { charsPerSecond = 500, enabled = true } = options;
  const [visibleChars, setVisibleChars] = useState(enabled ? 0 : fullText.length);
  const intervalRef = useRef<number | null>(null);
  const startRef = useRef(0);

  useEffect(() => {
    setVisibleChars(enabled ? 0 : fullText.length);
    if (!enabled) return;

    startRef.current = Date.now();
    intervalRef.current = window.setInterval(() => {
      const revealed = Math.floor(((Date.now() - startRef.current) / 1000) * charsPerSecond);
      setVisibleChars(() => {
        const next = Math.min(revealed, fullText.length);
        if (next >= fullText.length && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return next;
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
