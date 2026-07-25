/**
 * Cross-run meta progress — the one thing that outlives a single run.
 * One versioned envelope per player under 'kritis_meta_<playerId>'. Written
 * when a run ends (before the autosave is cleared) and read on the menu/ending
 * screens to answer "how many endings have I seen?".
 *
 * Same never-throw philosophy as autosave.ts: a broken meta blob must never
 * break boot or gameplay. The old server-side meta layer was removed
 * (docs/BACKEND_REMOVAL.md); this is a deliberately small localStorage-only
 * replacement, not a revival of that schema.
 */
import { GameModeId, CampaignId } from '@kritis/shared';

export const META_VERSION = 2;
const META_KEY = 'kritis_meta';

export interface MetaProgress {
  version: number;
  runsCompleted: number;
  /** Distinct story endings reached, PER campaign (a probation ending never
   *  counts toward AUDIT TRAIL's set and vice versa). */
  endingsSeenByCampaign: Partial<Record<CampaignId, string[]>>;
  /** Best ending/run score per mode (story score, or 0 for modes without one). */
  bestScoreByMode: Partial<Record<GameModeId, number>>;
  lastRunAt: string; // ISO timestamp
  /** Run seeds already counted — makes recordRun idempotent across re-renders. */
  countedSeeds: string[];
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function storageKey(playerId: string): string {
  return `${META_KEY}_${playerId}`;
}

function emptyMeta(): MetaProgress {
  return {
    version: META_VERSION,
    runsCompleted: 0,
    endingsSeenByCampaign: {},
    bestScoreByMode: {},
    lastRunAt: new Date(0).toISOString(),
    countedSeeds: [],
  };
}

export function readMeta(
  playerId: string,
  storage: StorageLike = localStorage
): MetaProgress {
  try {
    const raw = storage.getItem(storageKey(playerId));
    if (!raw) return emptyMeta();
    const parsed = JSON.parse(raw) as (Partial<MetaProgress> & { endingsSeen?: string[] }) | null;
    if (!parsed || typeof parsed !== 'object' || typeof parsed.runsCompleted !== 'number') {
      storage.removeItem(storageKey(playerId));
      return emptyMeta();
    }
    // Migrate the v1 flat `endingsSeen` under 'probation' (fill, not discard) —
    // pre-campaign progress belonged to the only campaign that then existed.
    let endingsSeenByCampaign: Partial<Record<CampaignId, string[]>>;
    if (parsed.version === 1 && Array.isArray(parsed.endingsSeen)) {
      endingsSeenByCampaign = { probation: parsed.endingsSeen };
    } else if (parsed.version === META_VERSION && parsed.endingsSeenByCampaign && typeof parsed.endingsSeenByCampaign === 'object') {
      endingsSeenByCampaign = parsed.endingsSeenByCampaign;
    } else if (parsed.version === 1) {
      endingsSeenByCampaign = {}; // v1 with no endings list
    } else {
      // Unknown/newer/corrupt schema — discard rather than guess.
      storage.removeItem(storageKey(playerId));
      return emptyMeta();
    }
    // Fill any gaps defensively — an older/partial blob shouldn't crash callers.
    return {
      version: META_VERSION,
      runsCompleted: parsed.runsCompleted,
      endingsSeenByCampaign,
      bestScoreByMode: parsed.bestScoreByMode ?? {},
      lastRunAt: typeof parsed.lastRunAt === 'string' ? parsed.lastRunAt : new Date(0).toISOString(),
      countedSeeds: Array.isArray(parsed.countedSeeds) ? parsed.countedSeeds : [],
    };
  } catch {
    return emptyMeta();
  }
}

export interface RunRecord {
  mode: GameModeId;
  /** Unique per run — used to dedupe repeat calls on the same finished run. */
  seed: string;
  /** Campaign this run belonged to (story runs); endings are tracked per campaign. */
  campaignId: CampaignId;
  /** Story ending id (campaign-specific string), only for completed story runs. */
  ending?: string;
  /** Numeric score if the mode produced one (story ending score). */
  score?: number;
}

/**
 * Record a finished run. Idempotent per seed: calling it repeatedly (e.g. on
 * every render of the ending screen) counts the run exactly once. Returns the
 * updated meta so callers can render it without a second read.
 */
export function recordRun(
  playerId: string,
  run: RunRecord,
  storage: StorageLike = localStorage
): MetaProgress {
  const meta = readMeta(playerId, storage);
  // Dedupe on (campaignId, seed): the same seed replayed in a DIFFERENT campaign
  // is a distinct run and must not be suppressed by the first campaign's record.
  const dedupeKey = `${run.campaignId}::${run.seed}`;
  if (meta.countedSeeds.includes(dedupeKey)) {
    return meta; // already counted this run
  }

  const endingsSeenByCampaign = { ...meta.endingsSeenByCampaign };
  if (run.ending) {
    const seen = endingsSeenByCampaign[run.campaignId] ?? [];
    if (!seen.includes(run.ending)) {
      endingsSeenByCampaign[run.campaignId] = [...seen, run.ending];
    }
  }

  const bestScoreByMode = { ...meta.bestScoreByMode };
  if (typeof run.score === 'number') {
    const prev = bestScoreByMode[run.mode] ?? -Infinity;
    if (run.score > prev) bestScoreByMode[run.mode] = run.score;
  }

  // Keep the (campaignId::seed) list bounded; the tail dedupes recent runs.
  const countedSeeds = [...meta.countedSeeds, dedupeKey].slice(-200);

  const updated: MetaProgress = {
    version: META_VERSION,
    runsCompleted: meta.runsCompleted + 1,
    endingsSeenByCampaign,
    bestScoreByMode,
    lastRunAt: new Date().toISOString(),
    countedSeeds,
  };

  try {
    storage.setItem(storageKey(playerId), JSON.stringify(updated));
  } catch {
    /* quota/private-mode — meta is best-effort, never block the run end */
  }
  return updated;
}
