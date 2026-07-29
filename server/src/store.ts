/**
 * Append-only event store for team play-tracking. One NDJSON line per event
 * under DATA_DIR/events.jsonl. No database: at team scale (dozens of players,
 * KB-sized events) a flat log read on demand is simpler and safer than reviving
 * the old sql.js layer (whose full-rewrite-per-mutation was its downfall).
 *
 * Everything here is defensive: the file is untrusted (hand-edited, partially
 * written on crash, or version-skewed), so reads skip anything unparseable and
 * the aggregator only touches fields it can prove are present.
 */
import { promises as fs } from 'fs';
import { join } from 'path';

export function dataDir(): string {
  return process.env.DATA_DIR || join(process.cwd(), 'data');
}

function eventsPath(): string {
  return join(dataDir(), 'events.jsonl');
}

/** What we persist. Mirrors shared TrackEnvelope but typed loosely on the read path. */
export interface StoredEvent {
  v?: number;
  type?: string;
  playerId?: string;
  playerName?: string;
  ts?: string;
  seed?: string;
  payload?: Record<string, unknown>;
  /** Server-stamped receive time (client ts is untrusted). */
  receivedAt?: string;
}

// Serialize writes so concurrent requests can't interleave partial lines.
let writeChain: Promise<void> = Promise.resolve();

export async function appendEvent(event: StoredEvent): Promise<void> {
  const line = JSON.stringify(event) + '\n';
  writeChain = writeChain.then(async () => {
    try {
      await fs.mkdir(dataDir(), { recursive: true });
      await fs.appendFile(eventsPath(), line, 'utf8');
    } catch (e) {
      // Never throw into the request path — tracking is best-effort.
      console.error('appendEvent failed:', e);
    }
  });
  await writeChain;
}

export async function readEvents(): Promise<StoredEvent[]> {
  let raw: string;
  try {
    raw = await fs.readFile(eventsPath(), 'utf8');
  } catch {
    return []; // no file yet
  }
  const out: StoredEvent[] = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') out.push(parsed as StoredEvent);
    } catch {
      // Skip a corrupt/half-written line rather than failing the whole read.
    }
  }
  return out;
}

// ── Aggregation ────────────────────────────────────────────────────────────

export interface PlayerModeStat {
  mode: string;
  runsStarted: number;
  runsCompleted: number;
  bestScore?: number;
  bestWeekReached: number;
}

/**
 * One finished run, kept individually instead of only as a counter. `outcome`
 * and `ending` are what distinguish "played the campaign to its end" from "ran
 * out of weeks in week 12" — the counters alone cannot tell those apart, which
 * made a completed-looking row unreadable.
 */
export interface CompletedRunStat {
  mode: string;
  campaignId?: string;
  /** TrackRunOutcome — 'victory' | 'burnout' | 'fired' | 'bsi_bussgeld' | 'ended'. */
  outcome?: string;
  weekReached?: number;
  totalWeeks?: number;
  /** Campaign ending id; ABSENT means the run ended without reaching an ending. */
  ending?: string;
  score?: number;
  /** When it was recorded (receivedAt, else the client ts). */
  at?: string;
}

/** Keep a player's run list bounded — the tail is what anyone reads anyway. */
const MAX_COMPLETED_RUNS = 50;

export interface PlayerStat {
  playerId: string;
  name?: string;
  firstSeen?: string;
  lastSeen?: string;
  runsStarted: number;
  runsCompleted: number;
  endingsSeen: string[];
  lessonsCompleted: string[];
  perMode: PlayerModeStat[];
  /** Finished runs, newest last, capped at MAX_COMPLETED_RUNS. */
  completedRuns: CompletedRunStat[];
  /** Campaigns this player STARTED (from run_started; needs campaignId). */
  campaignsStarted: string[];
  /** Hidden campaigns this player unlocked — the find-rate of a secret. */
  campaignsUnlocked: string[];
}

export interface StatsAggregate {
  generatedAt: string;
  totalEvents: number;
  players: PlayerStat[];
}

const VALID_PLAYER = /^player-[\w-]{3,60}$/;

/** Fold the event log into per-player stats. Pure; safe on messy input. */
export function aggregate(events: StoredEvent[], now: string): StatsAggregate {
  // First pass: collect tombstoned players so their events are dropped entirely.
  const deleted = new Set<string>();
  for (const e of events) {
    if (e.type === 'player_deleted' && typeof e.playerId === 'string') {
      deleted.add(e.playerId);
    }
  }

  const byPlayer = new Map<string, PlayerStat>();
  const modeOf = new Map<string, Map<string, PlayerModeStat>>();
  // Dedupe run_* by (playerId|seed) so client retries never double-count.
  const seenStart = new Set<string>();
  const seenComplete = new Set<string>();
  const seenLesson = new Set<string>();

  const ensure = (id: string): PlayerStat => {
    let p = byPlayer.get(id);
    if (!p) {
      p = {
        playerId: id,
        runsStarted: 0,
        runsCompleted: 0,
        endingsSeen: [],
        lessonsCompleted: [],
        perMode: [],
        completedRuns: [],
        campaignsStarted: [],
        campaignsUnlocked: [],
      };
      byPlayer.set(id, p);
      modeOf.set(id, new Map());
    }
    return p;
  };
  const ensureMode = (id: string, mode: string): PlayerModeStat => {
    const modes = modeOf.get(id)!;
    let m = modes.get(mode);
    if (!m) {
      m = { mode, runsStarted: 0, runsCompleted: 0, bestWeekReached: 0 };
      modes.set(mode, m);
    }
    return m;
  };

  for (const e of events) {
    const id = e.playerId;
    if (typeof id !== 'string' || !VALID_PLAYER.test(id) || deleted.has(id)) continue;

    const p = ensure(id);
    const stamp = e.receivedAt || e.ts;
    if (typeof stamp === 'string') {
      if (!p.firstSeen || stamp < p.firstSeen) p.firstSeen = stamp;
      if (!p.lastSeen || stamp > p.lastSeen) p.lastSeen = stamp;
    }
    if (typeof e.playerName === 'string' && e.playerName.trim()) {
      p.name = e.playerName.trim().slice(0, 40);
    }

    const pl = e.payload ?? {};
    switch (e.type) {
      case 'run_started': {
        const mode = typeof pl.mode === 'string' ? pl.mode : 'unknown';
        const key = `${id}|${e.seed ?? ''}|${mode}`;
        if (e.seed && seenStart.has(key)) break;
        if (e.seed) seenStart.add(key);
        p.runsStarted++;
        ensureMode(id, mode).runsStarted++;
        // Older run_started events carry no campaignId — nothing to attribute.
        if (typeof pl.campaignId === 'string' && pl.campaignId
            && !p.campaignsStarted.includes(pl.campaignId)) {
          p.campaignsStarted.push(pl.campaignId);
        }
        break;
      }
      case 'run_completed': {
        const mode = typeof pl.mode === 'string' ? pl.mode : 'unknown';
        // Include the campaign so the SAME seed completed in two campaigns counts
        // as two runs (and both endings are kept). Old story telemetry without a
        // campaignId falls back to 'probation'.
        const campaign = typeof pl.campaignId === 'string' && pl.campaignId
          ? pl.campaignId
          : (mode === 'story' ? 'probation' : '');
        const key = `${id}|${e.seed ?? ''}|${mode}|${campaign}`;
        if (e.seed && seenComplete.has(key)) break;
        if (e.seed) seenComplete.add(key);
        p.runsCompleted++;
        const m = ensureMode(id, mode);
        m.runsCompleted++;
        if (typeof pl.weekReached === 'number' && pl.weekReached > m.bestWeekReached) {
          m.bestWeekReached = pl.weekReached;
        }
        if (typeof pl.score === 'number' && (m.bestScore === undefined || pl.score > m.bestScore)) {
          m.bestScore = pl.score;
        }
        if (typeof pl.ending === 'string' && !p.endingsSeen.includes(pl.ending)) {
          p.endingsSeen.push(pl.ending);
        }
        // Keep the run itself, not just the counters: outcome + ending are the
        // only way to read "finished the story" apart from "run ended somehow".
        if (p.completedRuns.length < MAX_COMPLETED_RUNS) {
          p.completedRuns.push({
            mode,
            campaignId: campaign || undefined,
            outcome: typeof pl.outcome === 'string' ? pl.outcome : undefined,
            weekReached: typeof pl.weekReached === 'number' ? pl.weekReached : undefined,
            totalWeeks: typeof pl.totalWeeks === 'number' ? pl.totalWeeks : undefined,
            ending: typeof pl.ending === 'string' ? pl.ending : undefined,
            score: typeof pl.score === 'number' ? pl.score : undefined,
            at: typeof stamp === 'string' ? stamp : undefined,
          });
        }
        break;
      }
      case 'campaign_unlocked': {
        const campaignId = typeof pl.campaignId === 'string' ? pl.campaignId : undefined;
        if (!campaignId) break;
        if (!p.campaignsUnlocked.includes(campaignId)) p.campaignsUnlocked.push(campaignId);
        break;
      }
      case 'lesson_completed': {
        const lessonId = typeof pl.lessonId === 'string' ? pl.lessonId : undefined;
        if (!lessonId) break;
        const key = `${id}|${lessonId}`;
        if (seenLesson.has(key)) break;
        seenLesson.add(key);
        if (!p.lessonsCompleted.includes(lessonId)) p.lessonsCompleted.push(lessonId);
        break;
      }
      // player_named carries no counter — the name was applied above.
    }
  }

  const players = [...byPlayer.values()].map((p) => ({
    ...p,
    perMode: [...(modeOf.get(p.playerId)?.values() ?? [])].sort((a, b) =>
      a.mode.localeCompare(b.mode)
    ),
  }));
  players.sort((a, b) => (b.lastSeen ?? '').localeCompare(a.lastSeen ?? ''));

  return { generatedAt: now, totalEvents: events.length, players };
}
