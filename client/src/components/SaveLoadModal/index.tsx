/**
 * Save/Load Modal
 * UI for managing game saves
 */

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    fetchSaves(playerId);
  }, [playerId, fetchSaves]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (confirmAction) {
        if (e.key === 'Escape') {
          setConfirmAction(null);
        }
        return;
      }

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(prev => (prev - 1 + SAVE_SLOTS.length) % SAVE_SLOTS.length);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex(prev => (prev + 1) % SAVE_SLOTS.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const slot = SAVE_SLOTS[highlightedIndex];
        if (mode === 'save') {
          handleSave(slot);
        } else {
          const save = getSaveForSlot(slot);
          if (save) handleLoad(slot);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmAction, highlightedIndex, mode, saves, onClose]);

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

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="w-full max-w-lg">
        <AsciiFrame
          title={mode === 'save' ? 'SPIEL SPEICHERN' : 'SPIEL LADEN'}
          variant="info"
        >
          <div className="p-4 space-y-4">
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
              <div className="space-y-2">
                {SAVE_SLOTS.map((slot, index) => {
                  const save = getSaveForSlot(slot);
                  const isEmpty = !save;
                  const isHighlighted = index === highlightedIndex;

                  return (
                    <div
                      key={slot}
                      onMouseEnter={() => setHighlightedIndex(index)}
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

                      {/* Actions */}
                      <div className="flex gap-1">
                        {mode === 'save' ? (
                          <button
                            onClick={() => handleSave(slot)}
                            disabled={loading}
                            className="px-2 py-1 text-sm border border-terminal-green text-terminal-green hover:bg-terminal-green/20 disabled:opacity-50"
                          >
                            {isEmpty ? 'Speichern' : 'Überschr.'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleLoad(slot)}
                            disabled={loading || isEmpty}
                            className="px-2 py-1 text-sm border border-terminal-info text-terminal-info hover:bg-terminal-info/20 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Laden
                          </button>
                        )}
                        {!isEmpty && (
                          <button
                            onClick={() => handleDelete(slot)}
                            disabled={loading}
                            className="px-2 py-1 text-sm border border-terminal-danger text-terminal-danger hover:bg-terminal-danger/20 disabled:opacity-50"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-between pt-2 border-t border-terminal-border">
              <span className="text-terminal-green-dim text-sm">
                [↑↓] Navigieren  [Enter] {mode === 'save' ? 'Speichern' : 'Laden'}
              </span>
              <button
                onClick={onClose}
                className="px-4 py-1 border border-terminal-border hover:border-terminal-green"
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
