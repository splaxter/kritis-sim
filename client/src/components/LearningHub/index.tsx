/**
 * Learning Hub — topic-selection screen for learning mode.
 * Shows a recommended-next CTA and one card per learning track with
 * per-level progress. Standalone: not wired into App yet.
 */

import { GameState, GameEvent } from '@kritis/shared';
import { allEvents } from '../../content/events';
import { LEARNING_TRACKS } from '../../content/events/learning-tracks';
import {
  getTrackState,
  getTrackProgress,
  getRecommendedNext,
  TrackState,
} from '../../engine/learningPath';

interface LearningHubProps {
  state: GameState;
  onPick: (level: GameEvent) => void;
}

const STATE_BADGE: Record<TrackState, string> = {
  locked: 'Gesperrt',
  available: 'Verfügbar',
  in_progress: 'Begonnen',
  completed: 'Abgeschlossen',
};

const LEVEL_GLYPH: Record<'done' | 'next' | 'locked' | 'advanced', string> = {
  done: '✓',
  next: '▶',
  locked: '🔒',
  advanced: '★',
};

const eventById = (id: string): GameEvent | undefined => allEvents.find((e) => e.id === id);
const levelTitle = (id: string): string => eventById(id)?.title ?? id;

export function LearningHub({ state, onPick }: LearningHubProps) {
  const recommended = getRecommendedNext(state, allEvents);
  const tracks = [...LEARNING_TRACKS].sort((a, b) => a.order - b.order);

  return (
    <div className="w-full max-w-2xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-bold text-terminal-green">Lernpfad</h1>

      {recommended && (
        <button
          onClick={() => onPick(recommended)}
          className="w-full border border-terminal-info bg-terminal-info/10 hover:border-terminal-green p-3 text-left transition-colors"
        >
          <div className="text-xs text-terminal-info tracking-wide">Nächste empfohlene Lektion</div>
          <div className="font-bold">{recommended.title}</div>
        </button>
      )}

      <div className="space-y-3">
        {tracks.map((track) => {
          const trackState = getTrackState(track, state, allEvents);
          const progress = getTrackProgress(track, state, allEvents);
          const isLocked = trackState === 'locked';
          const lockReason = isLocked
            ? track.isFinale
              ? 'Schließe 3 Tracks ab'
              : 'Schließe zuerst die Grundlagen ab'
            : null;

          return (
            <div key={track.id} className="border border-terminal-border p-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{track.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{track.title}</span>
                    <span className="text-terminal-green-dim text-sm">
                      {progress.doneCore}/{progress.totalCore}
                    </span>
                  </div>
                  {lockReason && (
                    <div className="text-terminal-green-dim text-sm">{lockReason}</div>
                  )}
                </div>
                <span className="text-xs border border-terminal-border px-1.5 py-0.5 tracking-wide">
                  {STATE_BADGE[trackState]}
                </span>
              </div>

              <ul className="mt-2 space-y-1">
                {progress.levels.map((level) => {
                  const title = levelTitle(level.id);
                  const glyph = LEVEL_GLYPH[level.state];
                  const clickable = level.state === 'next' || level.state === 'advanced';

                  if (clickable) {
                    return (
                      <li key={level.id}>
                        <button
                          onClick={() => {
                            const ev = eventById(level.id);
                            if (ev) onPick(ev);
                          }}
                          className="w-full text-left text-sm px-2 py-1 border border-terminal-border hover:border-terminal-green transition-colors"
                        >
                          <span className="mr-2">{glyph}</span>
                          {title}
                        </button>
                      </li>
                    );
                  }

                  return (
                    <li key={level.id} className="text-sm px-2 py-1 text-terminal-green-dim">
                      <span className="mr-2">{glyph}</span>
                      {title}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
