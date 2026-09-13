import { useCallback, useEffect, useRef, useState } from 'react';
import { EventEffects, GuiContext, Skills, SolvedBranch } from '@kritis/shared';
import { findMetGuiSolution } from './guiSolution';

interface UseGuiLevelArgs {
  context: GuiContext;
  onSolved: (
    skillGain: Partial<Skills>,
    setsFlags?: string[],
    solutionEffects?: EventEffects,
    branch?: SolvedBranch
  ) => void;
}

interface UseGuiLevelResult {
  /** Record a player interaction (e.g. 'select:x', 'endtask:x'). */
  emit: (interaction: string) => void;
  /**
   * Take back an interaction that is no longer true.
   *
   * `performed` is a HISTORY, and every matcher in guiSolution.ts is positive
   * (`includes`), so a token that was once emitted counts forever. For an app
   * whose interactions are assignments rather than events — the Pflichten-
   * kataster assigns an owner, a cycle, a piece of evidence — that is wrong:
   * assigning Henry, removing him again and then finishing would still satisfy
   * a solution that requires Henry. The app calls this with the SUPERSEDED
   * token so `performed` keeps describing the register's current state.
   *
   * Removing a token can never newly satisfy a solution (all matchers are
   * positive), so this deliberately does not re-check for a win.
   *
   * GILT AUCH FUER HANDLUNGS-TOKEN wie `submit`. Die sind zwar Ereignisse und
   * keine Zustaende — aber ihre VORAUSSETZUNG ist ein Zustand. Bleibt ein
   * einmal abgeschicktes `submit` im Verlauf stehen, loest eine spaetere
   * Feldaenderung das Level, ohne dass jemand abgeschickt hat; im schlimmsten
   * Fall mit inzwischen leerem Pflichtfeld. Wer eine Formular-App baut, muss
   * das Absende-Token bei jeder Aenderung zuruecknehmen (siehe
   * `invalidateSubmit` in apps/Meldung.tsx). Im Review zu PR #14 gefunden.
   */
  retract: (interaction: string) => void;
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

/** Verweildauer der Erfolgsanzeige. Exportiert, damit Tests sie exakt
 *  vorspulen koennen, statt sie abzusitzen (src/test/fakeTimers.ts). */
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
            // Der ERREICHTE Zweig muss den Ergebnisbildschirm erreichen.
            // Vorher endete sein Text nach 1,6 s in der GUI, und der Spieler
            // bekam die Erfolgsgeschichte der Choice — bei einem Fallen-Zweig
            // also eine Fassung, die es so nicht gegeben hat.
            onSolved(met.skillGain, met.setsFlags, undefined, {
              resultText: met.resultText,
              outcome: met.outcome,
            });
          }, SOLVE_DELAY_MS);
        }
        return next;
      });
    },
    [context.solutions, onSolved]
  );

  const retract = useCallback((interaction: string) => {
    // Nach dem Sieg ist das Level eingefroren — dasselbe Wachthaus wie in emit.
    if (solvedRef.current) return;
    setPerformed((prev) => prev.filter((i) => i !== interaction));
  }, []);

  const showHint = useCallback(() => {
    setVisibleHints((prev) => {
      if (prev.length >= context.hints.length) return prev;
      return [...prev, context.hints[prev.length]];
    });
  }, [context.hints]);

  return {
    emit,
    retract,
    performed,
    solved,
    resultText,
    hintsRemaining: Math.max(0, context.hints.length - visibleHints.length),
    visibleHints,
    showHint,
  };
}
