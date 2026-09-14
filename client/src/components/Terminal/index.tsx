// client/src/components/Terminal/index.tsx
import '@xterm/xterm/css/xterm.css';
import { useEffect, useRef, useState } from 'react';
import { TerminalContext, Skills, GameModeId, EventEffects, SolvedBranch } from '@kritis/shared';
import { useTerminal } from './useTerminal';

interface TerminalProps {
  context: TerminalContext;
  onSolved: (
    skillGain: Partial<Skills>,
    setsFlags?: string[],
    solutionEffects?: EventEffects,
    branch?: SolvedBranch
  ) => void;
  onCancel: () => void;
  onFlagsSet: (flags: string[]) => void;
  gameMode?: GameModeId;
  /** Fallback task summary when the context has no taskText (extracted from the briefing) */
  task?: string;
}

/**
 * Hoechstmass des Aufgabenfelds im eingeklappten Zustand. Relativ zur
 * Bildschirmhoehe, weil eine feste Zahl genau den Fehler macht, den sie
 * verhindern soll: `max-h-48` (192 px) war fuer den Auftrag gemessen, der zum
 * Zeitpunkt der Messung der laengste war — der naechste laengere verschwand
 * wieder hinter der Kante. 70 vh deckt auf 320x568 rund 398 px ab und damit
 * jeden heutigen Auftrag; `32rem` deckelt das auf grossen Schirmen, damit ein
 * pathologisch langer Text das Terminal nicht unter den Falz schiebt. Wird das
 * Mass doch erreicht, erscheint der Aufklapp-Knopf — abgeschnitten OHNE Hinweis
 * wird es nie wieder.
 */
const AUFGABE_MAX_HOEHE = 'min(70vh, 32rem)';

export function Terminal({ context, onSolved, onCancel, onFlagsSet, gameMode = 'intermediate', task }: TerminalProps) {
  const [partialFeedback, setPartialFeedback] = useState<string | null>(null);
  const [aufgabeGanz, setAufgabeGanz] = useState(false);
  const [aufgabeGekuerzt, setAufgabeGekuerzt] = useState(false);
  const aufgabeRef = useRef<HTMLDivElement>(null);
  const { terminalRef, hintsRemaining, showHint } = useTerminal({
    context,
    onSolved,
    onPartialSolution: setPartialFeedback,
    onFlagsSet,
    gameMode,
  });

  const taskText = context.taskText ?? task;

  // Gemessen statt geraten: ob der Auftrag noch passt, entscheidet die
  // tatsaechliche Hoehe im Browser, nicht eine Zeichenzahl. Der Knopf erscheint
  // genau dann, wenn wirklich etwas unter der Kante liegt — bei einem kurzen
  // Auftrag sieht das Feld aus wie vorher. Neu gemessen wird auch nach dem
  // Aufklappen (dann steht der Einklapp-Knopf) und bei jeder Groessenaenderung,
  // also auch beim Drehen des Geraets.
  useEffect(() => {
    const feld = aufgabeRef.current;
    if (!feld) {
      setAufgabeGekuerzt(false);
      return;
    }
    const messen = () => setAufgabeGekuerzt(feld.scrollHeight > feld.clientHeight + 1);
    messen();
    const beobachter = new ResizeObserver(messen);
    beobachter.observe(feld);
    window.addEventListener('resize', messen);
    return () => {
      beobachter.disconnect();
      window.removeEventListener('resize', messen);
    };
  }, [taskText, aufgabeGanz]);

  return (
    <div className="flex h-full min-w-0 flex-col border border-terminal-border">
      {/* Header */}
      <div className="flex flex-col items-start gap-2 border-b border-terminal-border bg-terminal-bg-secondary p-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="min-w-0 break-all">Terminal: {context.hostname} [{context.type === 'linux' ? 'Linux' : 'Windows'}]</span>
        <button
          onClick={onCancel}
          className="inline-flex min-h-11 shrink-0 items-center text-terminal-danger hover:underline"
        >
          [ESC] Abbrechen
        </button>
      </div>

      {/*
        Persistent task panel — the quest stays reviewable while playing.

        Gescrollt wird nur der TEXT, nicht das ganze Feld: die Zeile „Aufgabe:"
        und der Aufklapp-Knopf stehen ausserhalb des Scrollbereichs, damit der
        Hinweis auf verborgenen Text nicht selbst verborgen werden kann.

        Die Geschichte dieser Kante in zwei Runden: erst max-h-28 (112 px), zu
        wenig fuer ein angesagtes Berichtsschema; dann max-h-48 (192 px), zu
        wenig fuer die Schreibanleitung in DAS KATASTER (316 px auf 320 px
        Breite). Beide Male war eine feste Zahl fuer den laengsten Auftrag von
        gestern gemessen. Jetzt ist das Mass relativ UND der Rest wird
        angekuendigt statt stillschweigend abgeschnitten.
      */}
      {taskText && (
        <div className="border-b border-terminal-border bg-terminal-bg-secondary px-3 py-2 text-sm">
          <span className="text-terminal-warning">📋 Aufgabe:</span>
          <div
            ref={aufgabeRef}
            id="aufgabentext"
            data-testid="aufgabentext"
            className="overflow-y-auto whitespace-pre-line text-terminal-green-muted"
            style={{ maxHeight: aufgabeGanz ? undefined : AUFGABE_MAX_HOEHE }}
          >
            {taskText}
          </div>
          {(aufgabeGekuerzt || aufgabeGanz) && (
            <button
              type="button"
              aria-expanded={aufgabeGanz}
              aria-controls="aufgabentext"
              onClick={() => setAufgabeGanz((offen) => !offen)}
              className="mt-1 inline-flex min-h-11 items-center text-terminal-warning hover:underline"
            >
              {aufgabeGanz ? '[▴] Aufgabe einklappen' : '[▾] Ganze Aufgabe anzeigen'}
            </button>
          )}
        </div>
      )}

      {/* Terminal area */}
      <div ref={terminalRef} className="flex-1 p-2" />

      {partialFeedback && (
        <div
          role="status"
          className="border-t border-terminal-warning bg-terminal-warning/10 px-3 py-2 text-sm text-terminal-warning"
        >
          {partialFeedback}
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-col gap-2 border-t border-terminal-border bg-terminal-bg-secondary p-2 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <span className="text-terminal-green-muted">[Tab] Autovervollständigung</span>
          <button
            onClick={showHint}
            disabled={hintsRemaining === 0}
            className={`inline-flex min-h-11 items-center ${
              hintsRemaining > 0 ? 'hover:underline' : 'text-terminal-green-muted'
            }`}
          >
            [?] Hinweis ({hintsRemaining} übrig)
          </button>
        </span>
        <span className="shrink-0 text-terminal-green-muted">
          [ESC] Abbrechen
        </span>
      </div>
    </div>
  );
}
