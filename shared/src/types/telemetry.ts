/**
 * Team play-tracking wire contract. The client builds these envelopes and POSTs
 * them to /api/track; the server validates structurally and appends them to an
 * event log. Keep this the single source of truth for the payload shape — the
 * server parses defensively (it can't trust the wire) but reads these fields.
 */
import { GameModeId } from './gameMode';
import { EndingType } from './adventure';
import { DecisionRecord } from './gameState';

export const TELEMETRY_VERSION = 1;

export type TrackEventType =
  | 'run_started'
  | 'run_completed'
  | 'lesson_completed'
  | 'player_named';

/** Mirrors RunOutcome in client/src/engine/runSummary.ts (kept in sync by tests). */
export type TrackRunOutcome = 'victory' | 'burnout' | 'fired' | 'bsi_bussgeld' | 'ended';

export interface RunStartedPayload {
  mode: GameModeId;
}

export interface RunCompletedPayload {
  mode: GameModeId;
  outcome: TrackRunOutcome;
  weekReached: number;
  totalWeeks: number;
  survived: boolean;
  score?: number;
  ending?: EndingType;
  sidequestsCompleted?: number;
  /** Full per-choice history for this run — the "what they played" detail. */
  decisions: DecisionRecord[];
}

export interface LessonCompletedPayload {
  lessonId: string;
  trackId?: string;
}

export interface PlayerNamedPayload {
  name: string;
}

interface BaseEnvelope {
  v: number;
  playerId: string;
  /** Latest self-chosen display name, echoed on every event (optional). */
  playerName?: string;
  ts: string; // client ISO timestamp
  /** Run seed — dedupe key for run_started / run_completed. */
  seed?: string;
}

export type TrackEnvelope =
  | (BaseEnvelope & { type: 'run_started'; payload: RunStartedPayload })
  | (BaseEnvelope & { type: 'run_completed'; payload: RunCompletedPayload })
  | (BaseEnvelope & { type: 'lesson_completed'; payload: LessonCompletedPayload })
  | (BaseEnvelope & { type: 'player_named'; payload: PlayerNamedPayload });
