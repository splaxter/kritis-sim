import { describe, it, expect } from 'vitest';
import {
  writeAutosave,
  readAutosave,
  clearAutosave,
  migrateLoadedGameState,
  AUTOSAVE_VERSION,
} from './autosave';
import { createInitialState, applyEffects, advanceDay } from './gameState';
import { GameState } from '@kritis/shared';

const PLAYER = 'player-test-1';

/** Minimal Storage stub — same surface autosave.ts needs. */
function memoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    _store: store,
  };
}

/** A realistic mid-run state: skills/stress moved, days advanced, per-mode extras set. */
function midRunState(): GameState {
  let s = createInitialState('AUTOSAVE_SEED', 'intermediate');
  s = applyEffects(s, { skills: { linux: 7 }, stress: 12, budget: -500 });
  s = advanceDay(advanceDay(s));
  return {
    ...s,
    completedEvents: ['ev_printer_fire'],
    completedScenarios: ['scn_backup_check'],
    flags: { blackout_l4_full_chain: true },
    learningState: { lastTrackId: 'blackout' },
    decisions: [
      {
        eventId: 'ev_printer_fire',
        choiceId: 'fix',
        choiceIndex: 0,
        week: 1,
        day: 1,
      } as GameState['decisions'][number],
    ],
  };
}

describe('autosave storage module', () => {
  it('round-trips a full mid-run GameState losslessly', () => {
    const storage = memoryStorage();
    const state = midRunState();

    writeAutosave(PLAYER, state, storage);
    const loaded = readAutosave(PLAYER, storage);

    expect(loaded).not.toBeNull();
    expect(loaded!.version).toBe(AUTOSAVE_VERSION);
    expect(loaded!.gameState).toEqual(state); // deep equality — nothing dropped
  });

  it('is keyed per player and uses its own slot (kritis_autosave_<id>)', () => {
    const storage = memoryStorage();
    writeAutosave(PLAYER, midRunState(), storage);
    expect(storage._store.has(`kritis_autosave_${PLAYER}`)).toBe(true);
    expect(readAutosave('someone-else', storage)).toBeNull();
  });

  it('returns null (and does not throw) for corrupted JSON, and discards it', () => {
    const storage = memoryStorage();
    storage.setItem(`kritis_autosave_${PLAYER}`, '{"version":1,"gameSta…TRUNCATED');
    expect(() => readAutosave(PLAYER, storage)).not.toThrow();
    expect(readAutosave(PLAYER, storage)).toBeNull();
    expect(storage._store.has(`kritis_autosave_${PLAYER}`)).toBe(false);
  });

  it('discards saves with an incompatible version', () => {
    const storage = memoryStorage();
    storage.setItem(
      `kritis_autosave_${PLAYER}`,
      JSON.stringify({ version: 999, updatedAt: 'x', gameState: midRunState() })
    );
    expect(readAutosave(PLAYER, storage)).toBeNull();
    expect(storage._store.has(`kritis_autosave_${PLAYER}`)).toBe(false);
  });

  it('discards structurally invalid payloads (valid JSON, wrong shape)', () => {
    const storage = memoryStorage();
    storage.setItem(
      `kritis_autosave_${PLAYER}`,
      JSON.stringify({ version: 1, updatedAt: 'x', gameState: { nope: true } })
    );
    expect(readAutosave(PLAYER, storage)).toBeNull();
  });

  it('returns null when no autosave exists', () => {
    expect(readAutosave(PLAYER, memoryStorage())).toBeNull();
  });

  it('clearAutosave removes the slot', () => {
    const storage = memoryStorage();
    writeAutosave(PLAYER, midRunState(), storage);
    clearAutosave(PLAYER, storage);
    expect(readAutosave(PLAYER, storage)).toBeNull();
  });

  it('write failures never throw (quota, private mode)', () => {
    const storage = {
      ...memoryStorage(),
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(() => writeAutosave(PLAYER, midRunState(), storage)).not.toThrow();
  });
});

describe('migrateLoadedGameState — campaignId soft-fill', () => {
  it('fills a missing campaignId on a story state with probation', () => {
    const story = createInitialState('MIG_SEED', 'story');
    // Simulate a pre-campaign save: strip the field the old writer never set.
    delete (story.storyState as { campaignId?: string }).campaignId;

    const migrated = migrateLoadedGameState(story);
    expect(migrated.storyState?.campaignId).toBe('probation');
  });

  it('leaves an existing campaignId untouched', () => {
    const story = createInitialState('MIG_SEED2', 'story');
    (story.storyState as { campaignId?: string }).campaignId = 'audit-trail';
    expect(migrateLoadedGameState(story).storyState?.campaignId).toBe('audit-trail');
  });

  it('is a no-op for non-story states (no storyState)', () => {
    const s = createInitialState('MIG_SEED3', 'intermediate');
    expect(migrateLoadedGameState(s)).toBe(s);
  });

  it('readAutosave migrates a pre-campaign envelope on load', () => {
    const storage = memoryStorage();
    const story = createInitialState('MIG_SEED4', 'story');
    delete (story.storyState as { campaignId?: string }).campaignId;
    // Hand-write a valid version-1 envelope with the legacy (campaignId-less) state.
    storage.setItem(
      `kritis_autosave_${PLAYER}`,
      JSON.stringify({ version: AUTOSAVE_VERSION, updatedAt: '2026-01-01T00:00:00Z', gameState: story }),
    );

    const envelope = readAutosave(PLAYER, storage);
    expect(envelope).not.toBeNull();
    expect(envelope!.gameState.storyState?.campaignId).toBe('probation');
  });
});
