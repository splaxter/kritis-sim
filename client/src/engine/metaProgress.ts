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
import { EndingType, GameModeId } from '@kritis/shared';

export const META_VERSION = 1;
const META_KEY = 'kritis_meta';

export interface MetaProgress {
  version: number;
  runsCompleted: number;
  /** Distinct story endings the player has reached. */
  endingsSeen: EndingType[];
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
    endingsSeen: [],
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
    const parsed = JSON.parse(raw) as Partial<MetaProgress> | null;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      parsed.version !== META_VERSION ||
      typeof parsed.runsCompleted !== 'number'
    ) {
      storage.removeItem(storageKey(playerId));
      return emptyMeta();
    }
    // Fill any gaps defensively — an older/partial blob shouldn't crash callers.
    return {
      version: META_VERSION,
      runsCompleted: parsed.runsCompleted,
      endingsSeen: Array.isArray(parsed.endingsSeen) ? parsed.endingsSeen : [],
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
  /** Story endings only. */
  ending?: EndingType;
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
  if (meta.countedSeeds.includes(run.seed)) {
    return meta; // already counted this run
  }

  const endingsSeen = [...meta.endingsSeen];
  if (run.ending && !endingsSeen.includes(run.ending)) {
    endingsSeen.push(run.ending);
  }

  const bestScoreByMode = { ...meta.bestScoreByMode };
  if (typeof run.score === 'number') {
    const prev = bestScoreByMode[run.mode] ?? -Infinity;
    if (run.score > prev) bestScoreByMode[run.mode] = run.score;
  }

  // Keep the seed list bounded; the tail is enough to dedupe recent runs.
  const countedSeeds = [...meta.countedSeeds, run.seed].slice(-200);

  const updated: MetaProgress = {
    version: META_VERSION,
    runsCompleted: meta.runsCompleted + 1,
    endingsSeen,
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

export const TOTAL_STORY_ENDINGS = 3;
