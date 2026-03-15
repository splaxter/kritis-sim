/**
 * Save/Load Hook
 * Manages game save and load operations via API
 */

import { useState, useCallback } from 'react';
import { GameState } from '@kritis/shared';

const API_BASE = '/api';

interface SaveSlot {
  id: string;
  slot: number;
  current_week: number | null;
  stress: number | null;
  updated_at: string;
}

interface SaveData {
  id: string;
  player_id: string;
  slot: number;
  current_week: number | null;
  stress: number | null;
  created_at: string;
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

export function useSaveLoad(): UseSaveLoadReturn {
  const [saves, setSaves] = useState<SaveSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSaves = useCallback(async (playerId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/saves/${playerId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch saves');
      }
      const data = await response.json();
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
        const response = await fetch(`${API_BASE}/saves/${playerId}/${slot}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameState }),
        });
        if (!response.ok) {
          throw new Error('Failed to save game');
        }
        // Refresh saves list
        await fetchSaves(playerId);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [fetchSaves]
  );

  const loadGame = useCallback(
    async (playerId: string, slot: number): Promise<GameState | null> => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE}/saves/${playerId}/${slot}`);
        if (!response.ok) {
          throw new Error('Failed to load save');
        }
        const data: SaveData = await response.json();
        return data.gameState;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
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
        const response = await fetch(`${API_BASE}/saves/${playerId}/${slot}`, {
          method: 'DELETE',
        });
        if (!response.ok && response.status !== 204) {
          throw new Error('Failed to delete save');
        }
        // Refresh saves list
        await fetchSaves(playerId);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [fetchSaves]
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
