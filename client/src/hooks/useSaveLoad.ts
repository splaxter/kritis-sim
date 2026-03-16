/**
 * Save/Load Hook
 * Manages game save and load operations via localStorage
 */

import { useState, useCallback } from 'react';
import { GameState } from '@kritis/shared';

const STORAGE_KEY = 'kritis_saves';
const MAX_SLOTS = 5;

interface SaveSlot {
  id: string;
  slot: number;
  current_week: number | null;
  stress: number | null;
  updated_at: string;
  gameState: GameState | null;
}

interface UseSaveLoadReturn {
  saves: SaveSlot[];
  loading: boolean;
  error: string | null;
  fetchSaves: (playerId: string) => Promise<void>;
  saveGame: (playerId: string, slot: number, gameState: GameState) => Promise<boolean>;
  loadGame: (playerId: string, slot: number) => Promise<GameState | null>;
  deleteSave: (playerId: string, slot: number) => Promise<boolean>;
  clearError: () => void;
}

function getStorageKey(playerId: string): string {
  return `${STORAGE_KEY}_${playerId}`;
}

function getSavesFromStorage(playerId: string): SaveSlot[] {
  try {
    const data = localStorage.getItem(getStorageKey(playerId));
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load saves from localStorage:', e);
  }
  return [];
}

function saveSavesToStorage(playerId: string, saves: SaveSlot[]): void {
  try {
    localStorage.setItem(getStorageKey(playerId), JSON.stringify(saves));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

export function useSaveLoad(): UseSaveLoadReturn {
  const [saves, setSaves] = useState<SaveSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSaves = useCallback(async (playerId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = getSavesFromStorage(playerId);
      setSaves(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setSaves([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveGame = useCallback(
    async (playerId: string, slot: number, gameState: GameState): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        const currentSaves = getSavesFromStorage(playerId);

        const newSave: SaveSlot = {
          id: `${playerId}-${slot}`,
          slot,
          current_week: gameState.currentWeek,
          stress: gameState.stress,
          updated_at: new Date().toISOString(),
          gameState,
        };

        // Find existing slot or add new
        const existingIndex = currentSaves.findIndex(s => s.slot === slot);
        if (existingIndex >= 0) {
          currentSaves[existingIndex] = newSave;
        } else {
          currentSaves.push(newSave);
        }

        // Sort by slot number
        currentSaves.sort((a, b) => a.slot - b.slot);

        saveSavesToStorage(playerId, currentSaves);
        setSaves(currentSaves);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen');
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const loadGame = useCallback(
    async (playerId: string, slot: number): Promise<GameState | null> => {
      setLoading(true);
      setError(null);
      try {
        const currentSaves = getSavesFromStorage(playerId);
        const save = currentSaves.find(s => s.slot === slot);
        if (!save || !save.gameState) {
          setError('Spielstand nicht gefunden');
          return null;
        }
        return save.gameState;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Laden fehlgeschlagen');
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const deleteSave = useCallback(
    async (playerId: string, slot: number): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        const currentSaves = getSavesFromStorage(playerId);
        const filtered = currentSaves.filter(s => s.slot !== slot);
        saveSavesToStorage(playerId, filtered);
        setSaves(filtered);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Löschen fehlgeschlagen');
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    saves,
    loading,
    error,
    fetchSaves,
    saveGame,
    loadGame,
    deleteSave,
    clearError,
  };
}

// Helper to format save slot for display
export function formatSaveSlot(save: SaveSlot): string {
  const week = save.current_week ?? '?';
  const stress = save.stress ?? '?';
  const date = new Date(save.updated_at).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  return `Woche ${week} | Stress: ${stress}% | ${date}`;
}
