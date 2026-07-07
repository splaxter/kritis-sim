/**
 * Autosave slot — separate from the 5 manual slots in useSaveLoad.ts
 * ('kritis_saves_<playerId>'). One versioned envelope per player under
 * 'kritis_autosave_<playerId>'. All functions are never-throw (same soft-fail
 * philosophy as getSavesFromStorage in useSaveLoad.ts): a broken autosave must
 * never break boot or gameplay.
 */
import { GameState } from '@kritis/shared';

export const AUTOSAVE_VERSION = 1;
const AUTOSAVE_KEY = 'kritis_autosave';

export interface AutosaveEnvelope {
  version: number;
  updatedAt: string; // ISO timestamp
  gameState: GameState;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function storageKey(playerId: string): string {
  return `${AUTOSAVE_KEY}_${playerId}`;
}

export function writeAutosave(
  playerId: string,
  gameState: GameState,
  storage: StorageLike = localStorage
): void {
  try {
    const envelope: AutosaveEnvelope = {
      version: AUTOSAVE_VERSION,
      updatedAt: new Date().toISOString(),
      gameState,
    };
    storage.setItem(storageKey(playerId), JSON.stringify(envelope));
  } catch (e) {
    // Quota/private-mode failures must never break gameplay.
    console.error('Autosave write failed:', e);
  }
}

export function readAutosave(
  playerId: string,
  storage: StorageLike = localStorage
): AutosaveEnvelope | null {
  try {
    const raw = storage.getItem(storageKey(playerId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<AutosaveEnvelope> | null;
    const gs = parsed?.gameState as Partial<GameState> | undefined;
    const valid =
      !!parsed &&
      typeof parsed === 'object' &&
      parsed.version === AUTOSAVE_VERSION &&
      !!gs &&
      typeof gs === 'object' &&
      typeof gs.currentWeek === 'number' &&
      typeof gs.currentDay === 'number' &&
      typeof gs.gameMode === 'string' &&
      typeof gs.seed === 'string';

    if (!valid) {
      // Incompatible or corrupt — discard so we don't re-check every boot.
      storage.removeItem(storageKey(playerId));
      return null;
    }
    return parsed as AutosaveEnvelope;
  } catch (e) {
    console.error('Autosave read failed, discarding:', e);
    try {
      storage.removeItem(storageKey(playerId));
    } catch {
      /* ignore */
    }
    return null;
  }
}

export function clearAutosave(
  playerId: string,
  storage: StorageLike = localStorage
): void {
  try {
    storage.removeItem(storageKey(playerId));
  } catch {
    /* ignore */
  }
}
