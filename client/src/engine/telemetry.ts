/**
 * Fire-and-forget team play-tracking. POSTs TrackEnvelopes to /api/track and
 * swallows every error: the dev server has no /api/track, players may be
 * offline, and telemetry must NEVER interfere with playing the game. Same
 * never-throw philosophy as autosave.ts / metaProgress.ts.
 */
import {
  TrackEnvelope,
  TELEMETRY_VERSION,
  GameModeId,
  CampaignId,
  RunCompletedPayload,
} from '@kritis/shared';

const NAME_KEY = 'kritis_player_name';

function readName(): string | undefined {
  try {
    return localStorage.getItem(NAME_KEY) || undefined;
  } catch {
    return undefined;
  }
}

function post(payload: TrackEnvelope | TrackEnvelope[]): void {
  try {
    void fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true, // survive the tab closing right after a run ends
    }).catch(() => {
      /* offline / no backend — ignore */
    });
  } catch {
    /* fetch unavailable — ignore */
  }
}

function base(playerId: string, seed?: string) {
  return {
    v: TELEMETRY_VERSION,
    playerId,
    playerName: readName(),
    ts: new Date().toISOString(),
    seed,
  };
}

export function trackRunStarted(
  playerId: string,
  seed: string,
  mode: GameModeId,
  campaignId?: CampaignId
): void {
  post({ ...base(playerId, seed), type: 'run_started', payload: { mode, campaignId } });
}

/** Fire once when a hidden campaign is unlocked, so the find-rate of a secret is
 *  visible even for players who never start it. */
export function trackCampaignUnlocked(playerId: string, campaignId: CampaignId): void {
  post({ ...base(playerId), type: 'campaign_unlocked', payload: { campaignId } });
}

export function trackRunCompleted(
  playerId: string,
  seed: string,
  payload: RunCompletedPayload
): void {
  post({ ...base(playerId, seed), type: 'run_completed', payload });
}

export function trackLessonCompleted(
  playerId: string,
  lessonId: string,
  trackId?: string
): void {
  post({ ...base(playerId), type: 'lesson_completed', payload: { lessonId, trackId } });
}

export function trackPlayerNamed(playerId: string, name: string): void {
  post({ ...base(playerId), type: 'player_named', payload: { name } });
}
