import { useCallback, useEffect, useRef, useState } from 'react';
import { GuiContext, Skills } from '@kritis/shared';
import { findMetGuiSolution } from './guiSolution';

interface UseGuiLevelArgs {
  context: GuiContext;
  onSolved: (skillGain: Partial<Skills>, setsFlags?: string[]) => void;
}

interface UseGuiLevelResult {
  /** Record a player interaction (e.g. 'select:x', 'endtask:x'). */
  emit: (interaction: string) => void;
  /** Interactions performed so far, in order. */
  performed: string[];
  /** True once a solution has been met (level locked / animating out). */
  solved: boolean;
  /** Result text from the met solution, shown briefly before advancing. */
  resultText: string | null;
  /** Hints. */
  hintsRemaining: number;
  visibleHints: string[];
  showHint: () => void;
}

export const SOLVE_DELAY_MS = 1600;

export function useGuiLevel({ context, onSolved }: UseGuiLevelArgs): UseGuiLevelResult {
  const [performed, setPerformed] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);
  const [resultText, setResultText] = useState<string | null>(null);
  const [visibleHints, setVisibleHints] = useState<string[]>([]);
  const solvedRef = useRef(false);
  const solveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cancel the pending onSolved callback if the level is torn down (e.g. the
  // player hits ESC during the 1.6s success animation). Without this the
  // timeout would still fire after unmount and complete a cancelled level.
  useEffect(() => {
    return () => {
      if (solveTimerRef.current !== null) {
        clearTimeout(solveTimerRef.current);
        solveTimerRef.current = null;
      }
    };
  }, []);

  const emit = useCallback(
    (interaction: string) => {
      if (solvedRef.current) return;

      setPerformed((prev) => {
        const next = [...prev, interaction];
        const met = findMetGuiSolution(context.solutions, next);
        if (met) {
          solvedRef.current = true;
          setSolved(true);
          setResultText(met.resultText);
          solveTimerRef.current = setTimeout(() => {
            solveTimerRef.current = null;
            onSolved(met.skillGain, met.setsFlags);
          }, SOLVE_DELAY_MS);
        }
        return next;
      });
    },
    [context.solutions, onSolved]
  );

  const showHint = useCallback(() => {
    setVisibleHints((prev) => {
      if (prev.length >= context.hints.length) return prev;
      return [...prev, context.hints[prev.length]];
    });
  }, [context.hints]);

  return {
    emit,
    performed,
    solved,
    resultText,
    hintsRemaining: Math.max(0, context.hints.length - visibleHints.length),
    visibleHints,
    showHint,
  };
}
