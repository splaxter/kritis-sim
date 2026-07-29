import { describe, expect, it } from 'vitest';
import { readUnlockedCampaigns, unlockCampaign, UNLOCKS_VERSION } from './unlocks';

/** Minimal in-memory Storage stand-in (same pattern as the meta/autosave tests). */
function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

const KEY = 'kritis_unlocks_p1';

describe('secret unlocks', () => {
  it('a fresh player has nothing unlocked', () => {
    expect(readUnlockedCampaigns('p1', fakeStorage())).toEqual([]);
  });

  it('persists an unlock per player under a versioned envelope', () => {
    const storage = fakeStorage();

    expect(unlockCampaign('p1', 'audit-trail', storage)).toEqual(['audit-trail']);

    expect(JSON.parse(storage.getItem(KEY)!)).toEqual({
      version: UNLOCKS_VERSION,
      campaigns: ['audit-trail'],
    });
    // Survives a reload…
    expect(readUnlockedCampaigns('p1', storage)).toEqual(['audit-trail']);
    // …but belongs to THAT player only.
    expect(readUnlockedCampaigns('p2', storage)).toEqual([]);
  });

  it('is idempotent — the same code twice writes no duplicate', () => {
    const storage = fakeStorage();
    unlockCampaign('p1', 'audit-trail', storage);

    expect(unlockCampaign('p1', 'audit-trail', storage)).toEqual(['audit-trail']);
    expect(readUnlockedCampaigns('p1', storage)).toEqual(['audit-trail']);
  });

  it('keeps earlier unlocks when a second one is added', () => {
    const storage = fakeStorage();
    unlockCampaign('p1', 'audit-trail', storage);

    expect(unlockCampaign('p1', 'ghost-campaign', storage)).toEqual(['audit-trail', 'ghost-campaign']);
  });

  it('degrades to "nothing unlocked" on a corrupt or foreign-version blob', () => {
    for (const raw of [
      'not json',
      'null',
      '{}',
      '[]',
      JSON.stringify({ version: 99, campaigns: ['audit-trail'] }),
      JSON.stringify({ version: UNLOCKS_VERSION, campaigns: 'audit-trail' }),
    ]) {
      const storage = fakeStorage({ [KEY]: raw });
      expect(readUnlockedCampaigns('p1', storage), raw).toEqual([]);
      // The unusable blob is dropped, not kept around to fail again — except for
      // the parse error, which never gets that far.
      if (raw !== 'not json') expect(storage.getItem(KEY)).toBeNull();
    }
  });

  it('drops non-string ids from a hand-edited blob', () => {
    const storage = fakeStorage({
      [KEY]: JSON.stringify({ version: UNLOCKS_VERSION, campaigns: ['audit-trail', 42, null, { id: 'x' }] }),
    });

    expect(readUnlockedCampaigns('p1', storage)).toEqual(['audit-trail']);
  });

  it('never throws when storage itself is unavailable (private mode/quota)', () => {
    const hostile = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('quota'); },
      removeItem: () => { throw new Error('blocked'); },
    };

    expect(readUnlockedCampaigns('p1', hostile)).toEqual([]);
    // A failed write still reveals the campaign for this session.
    expect(unlockCampaign('p1', 'audit-trail', hostile)).toEqual(['audit-trail']);
  });
});
