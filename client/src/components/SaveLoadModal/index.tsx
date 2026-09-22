/**
 * Save/Load Modal
 * UI for managing game saves
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { GameState } from '@kritis/shared';
import { useSaveLoad, formatSaveSlot } from '../../hooks/useSaveLoad';
import { AsciiFrame } from '../TerminalUI';

interface SaveLoadModalProps {
  mode: 'save' | 'load';
  playerId: string;
  currentState?: GameState;
  onLoad?: (state: GameState) => void;
  onClose: () => void;
}

const SAVE_SLOTS = [1, 2, 3, 4, 5];

const TITLE_ID = 'save-load-modal-title';

export function SaveLoadModal({
  mode,
  playerId,
  currentState,
  onLoad,
  onClose,
}: SaveLoadModalProps) {
  const {
    saves,
    loading,
    error,
    fetchSaves,
    saveGame,
    loadGame,
    deleteSave,
    clearError,
  } = useSaveLoad();

  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<'save' | 'delete' | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const dialogRef = useRef<HTMLDivElement>(null);
  const zeilenRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    fetchSaves(playerId);
  }, [playerId, fetchSaves]);

  /**
   * Der Fokus gehoert INS Modal — und danach zurueck, wo er herkam.
   *
   * Vorher passierte beides nicht: Wer „Spielstand laden" mit der Tastatur
   * oeffnete, sah das Modal und tabbte durch das Menue DAHINTER. Die
   * Pfeiltasten faerbten derweil eine Zeile im Modal ein. Auge und Tastatur
   * waren in zwei verschiedenen Raeumen.
   */
  useEffect(() => {
    const zuvorFokussiert = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    zeilenRefs.current[0]?.focus();
    return () => zuvorFokussiert?.focus();
  }, []);

  /** Auswahl bewegen und den Fokus mitnehmen — ein Tabstopp, dann Pfeile. */
  const fokussiereZeile = useCallback((index: number) => {
    setHighlightedIndex(index);
    zeilenRefs.current[index]?.focus();
  }, []);

  // Escape und die Tabulatorfalle haengen am Fenster; die Liste bedient sich
  // selbst (siehe onListeKeyDown). Frueher lag auch Enter hier — mit einem
  // Fokus im Modal haette das doppelt ausgeloest: einmal der Knopf, auf dem
  // der Fokus steht, und einmal der hervorgehobene Platz.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (confirmAction) setConfirmAction(null);
        else onClose();
        return;
      }
      if (e.key === 'Tab') {
        const fokussierbar = Array.from(
          dialogRef.current?.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [role="option"][tabindex="0"]'
          ) ?? []
        );
        const erstes = fokussierbar[0];
        const letztes = fokussierbar[fokussierbar.length - 1];
        if (e.shiftKey && document.activeElement === erstes) {
          e.preventDefault();
          letztes?.focus();
        } else if (!e.shiftKey && document.activeElement === letztes) {
          e.preventDefault();
          erstes?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmAction, onClose]);

  const handleSave = async (slot: number) => {
    if (!currentState) return;

    // Check if slot exists
    const existingSave = saves.find((s) => s.slot === slot);
    if (existingSave) {
      setSelectedSlot(slot);
      setConfirmAction('save');
      return;
    }

    const success = await saveGame(playerId, slot, currentState);
    if (success) {
      setSuccessMessage(`Spiel in Slot ${slot} gespeichert!`);
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1500);
    }
  };

  const handleConfirmSave = async () => {
    if (selectedSlot === null || !currentState) return;
    const success = await saveGame(playerId, selectedSlot, currentState);
    if (success) {
      setSuccessMessage(`Spiel in Slot ${selectedSlot} gespeichert!`);
      setTimeout(() => {
        setSuccessMessage(null);
        setConfirmAction(null);
        onClose();
      }, 1500);
    }
    setConfirmAction(null);
  };

  const handleLoad = async (slot: number) => {
    const state = await loadGame(playerId, slot);
    if (state && onLoad) {
      onLoad(state);
      onClose();
    }
  };

  const handleDelete = async (slot: number) => {
    setSelectedSlot(slot);
    setConfirmAction('delete');
  };

  const handleConfirmDelete = async () => {
    if (selectedSlot === null) return;
    await deleteSave(playerId, selectedSlot);
    setConfirmAction(null);
    setSelectedSlot(null);
  };

  const getSaveForSlot = (slot: number) => saves.find((s) => s.slot === slot);

  /** Die Hauptaktion auf einem Platz — dieselbe fuer Enter und fuer den Knopf. */
  const hauptaktion = (slot: number) => {
    if (mode === 'save') handleSave(slot);
    else if (getSaveForSlot(slot)) handleLoad(slot);
  };

  /**
   * Die Liste bedient sich selbst: ein Tabstopp, dann Pfeile — derselbe
   * Vertrag, den `role="listbox"` ueberall im Haus verspricht.
   */
  const onListeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      fokussiereZeile((highlightedIndex + 1) % SAVE_SLOTS.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      fokussiereZeile((highlightedIndex - 1 + SAVE_SLOTS.length) % SAVE_SLOTS.length);
    } else if (e.key === 'Home') {
      e.preventDefault();
      fokussiereZeile(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      fokussiereZeile(SAVE_SLOTS.length - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      hauptaktion(SAVE_SLOTS[highlightedIndex]);
    }
  };

  const ausgewaehlterSlot = SAVE_SLOTS[highlightedIndex];

  const beschriftung = (slot: number): string => {
    const save = getSaveForSlot(slot);
    return save ? `Slot ${slot}: ${formatSaveSlot(save)}` : `Slot ${slot}: leer`;
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={TITLE_ID}
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
    >
      <div className="w-full max-w-lg">
        <AsciiFrame
          title={mode === 'save' ? 'SPIEL SPEICHERN' : 'SPIEL LADEN'}
          variant="info"
        >
          <div className="p-4 space-y-4">
            <h2 id={TITLE_ID} className="sr-only">
              {mode === 'save' ? 'Spiel speichern' : 'Spiel laden'}
            </h2>
            {/* Error message */}
            {error && (
              <div className="text-terminal-danger border border-terminal-danger p-2 flex justify-between items-center">
                <span>[FEHLER] {error}</span>
                <button onClick={clearError} className="hover:underline">
                  [×]
                </button>
              </div>
            )}

            {/* Success message */}
            {successMessage && (
              <div className="text-terminal-green border border-terminal-green p-2 text-center">
                [OK] {successMessage}
              </div>
            )}

            {/* Confirmation dialog */}
            {confirmAction && (
              <div className="border border-terminal-warning p-3 space-y-3">
                <p className="text-terminal-warning">
                  {confirmAction === 'save'
                    ? `Slot ${selectedSlot} überschreiben?`
                    : `Slot ${selectedSlot} wirklich löschen?`}
                </p>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setConfirmAction(null)}
                    disabled={loading}
                    className="px-3 py-1 border border-terminal-border hover:border-terminal-green disabled:opacity-50"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={
                      confirmAction === 'save'
                        ? handleConfirmSave
                        : handleConfirmDelete
                    }
                    disabled={loading}
                    className={`px-3 py-1 border disabled:opacity-50 ${
                      confirmAction === 'delete'
                        ? 'border-terminal-danger text-terminal-danger hover:bg-terminal-danger/20'
                        : 'border-terminal-warning text-terminal-warning hover:bg-terminal-warning/20'
                    }`}
                  >
                    {loading ? 'Bitte warten...' : confirmAction === 'save' ? 'Überschreiben' : 'Löschen'}
                  </button>
                </div>
              </div>
            )}

            {/* Loading indicator */}
            {loading && (
              <div className="text-center text-terminal-green-dim animate-pulse">
                Lade...
              </div>
            )}

            {/* Save slots */}
            {!confirmAction && (
              <div
                role="listbox"
                aria-label={mode === 'save' ? 'Speicherplätze' : 'Gespeicherte Stände'}
                onKeyDown={onListeKeyDown}
                className="space-y-2"
              >
                {SAVE_SLOTS.map((slot, index) => {
                  const save = getSaveForSlot(slot);
                  const isEmpty = !save;
                  const isHighlighted = index === highlightedIndex;

                  return (
                    // Die Zeile IST die Auswahl — mit Rolle, Zustand und einem
                    // eigenen Namen. Vorher war sie ein eingefaerbtes div: Wer
                    // nicht hinsah, hoerte bei jedem Pfeildruck dasselbe.
                    // Die Knoepfe liegen deshalb ausserhalb der Liste, unten:
                    // Ein `option` darf keine Bedienelemente enthalten.
                    <div
                      key={slot}
                      id={`slot-${slot}`}
                      ref={(el) => { zeilenRefs.current[index] = el; }}
                      role="option"
                      aria-selected={isHighlighted}
                      aria-label={beschriftung(slot)}
                      tabIndex={isHighlighted ? 0 : -1}
                      onClick={() => fokussiereZeile(index)}
                      onDoubleClick={() => hauptaktion(slot)}
                      className={`flex items-center gap-2 border p-2 transition-colors cursor-pointer ${
                        isHighlighted
                          ? 'border-terminal-info bg-terminal-bg-highlight'
                          : 'border-terminal-border hover:border-terminal-info'
                      }`}
                    >
                      {/* Slot number */}
                      <span className="text-terminal-green-muted w-16">
                        Slot {slot}
                      </span>

                      {/* Slot content */}
                      <div className="flex-1">
                        {isEmpty ? (
                          <span className="text-terminal-green-muted italic">
                            — Leer —
                          </span>
                        ) : (
                          <span className="text-terminal-green-dim">
                            {formatSaveSlot(save)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Aktionen auf dem ausgewählten Platz — eine Stelle statt fünf
                Knopfpaaren, damit die Liste eine Liste bleiben kann. */}
            {!confirmAction && (
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => hauptaktion(ausgewaehlterSlot)}
                  disabled={loading || (mode === 'load' && !getSaveForSlot(ausgewaehlterSlot))}
                  className="px-3 py-1 min-h-11 border border-terminal-info text-terminal-info hover:bg-terminal-info/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {mode === 'save'
                    ? (getSaveForSlot(ausgewaehlterSlot) ? `Slot ${ausgewaehlterSlot} überschreiben` : `In Slot ${ausgewaehlterSlot} speichern`)
                    : `Slot ${ausgewaehlterSlot} laden`}
                </button>
                <button
                  onClick={() => handleDelete(ausgewaehlterSlot)}
                  disabled={loading || !getSaveForSlot(ausgewaehlterSlot)}
                  className="px-3 py-1 min-h-11 border border-terminal-danger text-terminal-danger hover:bg-terminal-danger/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Slot {ausgewaehlterSlot} löschen
                </button>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-between pt-2 border-t border-terminal-border">
              <span className="text-terminal-green-dim text-sm">
                [↑↓] Navigieren  [Enter] {mode === 'save' ? 'Speichern' : 'Laden'}
              </span>
              <button
                onClick={onClose}
                className="px-4 py-1 min-h-11 border border-terminal-border hover:border-terminal-green"
              >
                Schließen [ESC]
              </button>
            </div>
          </div>
        </AsciiFrame>
      </div>
    </div>
  );
}
