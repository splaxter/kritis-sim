/**
 * Secret unlocks — player-level flags that are neither a save nor meta progress.
 * A hidden campaign stays out of the campaign picker until the player enters its
 * code; the unlock then persists per player under 'kritis_unlocks_<playerId>'.
 *
 * Same never-throw philosophy as autosave.ts / metaProgress.ts: a corrupt or
 * hand-edited blob must never break the menu. The failure mode is "nothing
 * unlocked", which only re-hides the secret — it can never block a run.
 *
 * Ids are stored as plain strings and matched against the campaign registry by
 * the caller (listVisibleCampaigns), so this module imports no content and a
 * stale id from an older build simply stops matching.
 */
export const UNLOCKS_VERSION = 1;
const UNLOCKS_KEY = 'kritis_unlocks';

interface UnlocksEnvelope {
  version: number;
  campaigns: string[];
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function storageKey(playerId: string): string {
  return `${UNLOCKS_KEY}_${playerId}`;
}

/** Campaign ids this player has unlocked. Empty for a fresh player. */
export function readUnlockedCampaigns(
  playerId: string,
  storage: StorageLike = localStorage
): string[] {
  try {
    const raw = storage.getItem(storageKey(playerId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<UnlocksEnvelope> | null;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      parsed.version !== UNLOCKS_VERSION ||
      !Array.isArray(parsed.campaigns)
    ) {
      storage.removeItem(storageKey(playerId));
      return [];
    }
    // Keep only strings: a hand-edited blob must not push objects into the
    // picker's filter.
    return parsed.campaigns.filter((id): id is string => typeof id === 'string');
  } catch {
    return [];
  }
}

/**
 * Persist an unlock and return the resulting id list, so the caller can render
 * it without a second read. Idempotent — entering the same code twice writes no
 * duplicate. Best-effort like meta progress: a failed write (quota, private
 * mode) still reveals the campaign for this session.
 */
export function unlockCampaign(
  playerId: string,
  campaignId: string,
  storage: StorageLike = localStorage
): string[] {
  const current = readUnlockedCampaigns(playerId, storage);
  if (current.includes(campaignId)) return current;
  const campaigns = [...current, campaignId];
  try {
    const envelope: UnlocksEnvelope = { version: UNLOCKS_VERSION, campaigns };
    storage.setItem(storageKey(playerId), JSON.stringify(envelope));
  } catch {
    /* quota/private-mode — the unlock still applies to this session */
  }
  return campaigns;
}
