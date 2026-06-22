export interface LearningTrackLevel {
  /** id of the GameEvent (learning level) */
  eventId: string;
  /** ★ advanced/applied node — excluded from a track's CORE completion */
  optional?: boolean;
}

export interface LearningTrack {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  /** display order in the hub (ascending) */
  order: number;
  /** the mandatory prologue track */
  isFoundations?: boolean;
  /** the graduation track (hub-gated, not requires-gated) */
  isFinale?: boolean;
  /** finale only: how many CORE tracks (excl. Foundations) must be complete */
  unlockAfterTracksCompleted?: number;
  levels: LearningTrackLevel[];
}

/** Per-run learning progress that is NOT derivable from completedEvents. */
export interface LearningState {
  /** the track the player last actively chose — drives "recommended next" */
  lastTrackId?: string;
}
