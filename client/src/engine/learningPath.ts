import { GameState, GameEvent, LearningTrack } from '@kritis/shared';
import { LEARNING_TRACKS } from '../content/events/learning-tracks';

export type TrackState = 'locked' | 'available' | 'in_progress' | 'completed';

const isDone = (state: GameState, id: string) => state.completedEvents.includes(id);

/**
 * Sind die Voraussetzungen eines Levels erfuellt?
 *
 * Der Einstufungstest ersetzt die vier Grundlagen — und zwar auch dort, wo sie
 * als `requires.events` verlangt werden. Ohne diesen Zweig oeffnet das Flag nur
 * den Track, waehrend jedes erste Level an seiner eigenen Voraussetzung haengen
 * bleibt: der Lernpfad haette gar keine Empfehlung mehr gehabt. Beim Schreiben
 * des Skip-Tests aufgefallen, nicht im Entwurf.
 */
function reqsMet(state: GameState, ev: GameEvent | undefined): boolean {
  const reqs = ev?.requires?.events ?? [];
  const skipped = isFoundationsSkipped(state);
  return reqs.every((r) => isDone(state, r) || (skipped && isFoundationsLevel(r)));
}

/** Gehoert diese Event-Id zu den Kern-Leveln der Grundlagen? */
function isFoundationsLevel(id: string, tracks = LEARNING_TRACKS): boolean {
  const f = tracks.find((t) => t.isFoundations);
  return !!f && coreLevels(f).some((l) => l.eventId === id);
}

function coreLevels(track: LearningTrack) {
  return track.levels.filter((l) => !l.optional);
}

/** The track a given learning level belongs to, or undefined if none. */
export function getTrackOfLevel(levelId: string, tracks = LEARNING_TRACKS): LearningTrack | undefined {
  return tracks.find((t) => t.levels.some((l) => l.eventId === levelId));
}

/**
 * Flag des bestandenen Einstufungstests (`learn_00_einstufung`).
 *
 * BEWUSST kein Eintrag der vier Grundlagen-Level in `completedEvents`: das waere
 * eine Behauptung ueber etwas, das nicht stattgefunden hat — genau die Sorte
 * Luege, die DAS KATASTER bestraft. Die Grundlagen bleiben spielbar und werden
 * im Hub als „uebersprungen" ausgewiesen, nicht als gespielt.
 */
export const FOUNDATIONS_PROVEN_FLAG = 'learn_foundations_proven';

/** Wurde der Einstufungstest bestanden? */
export function isFoundationsSkipped(state: GameState): boolean {
  return !!state.flags?.[FOUNDATIONS_PROVEN_FLAG];
}

export function isFoundationsComplete(state: GameState, tracks = LEARNING_TRACKS): boolean {
  // Einmal bewiesen zaehlt wie durchgespielt — der Riegel soll Koennen sichern,
  // nicht Anwesenheit.
  if (isFoundationsSkipped(state)) return true;
  const f = tracks.find((t) => t.isFoundations);
  return !!f && coreLevels(f).every((l) => isDone(state, l.eventId));
}

export function isTrackComplete(track: LearningTrack, state: GameState): boolean {
  return coreLevels(track).every((l) => isDone(state, l.eventId));
}

export function getTrackState(track: LearningTrack, state: GameState, events: GameEvent[]): TrackState {
  if (track.isFinale) return isFinaleUnlocked(state) ? (isTrackComplete(track, state) ? 'completed' : 'available') : 'locked';
  if (!track.isFoundations && !isFoundationsComplete(state)) return 'locked';
  if (isTrackComplete(track, state)) return 'completed';
  const anyDone = track.levels.some((l) => isDone(state, l.eventId));
  return anyDone ? 'in_progress' : 'available';
}

export function getTrackProgress(track: LearningTrack, state: GameState, events: GameEvent[]) {
  const byId = new Map(events.map((e) => [e.id, e]));
  const core = coreLevels(track);
  const levels = track.levels.map((l) => {
    const done = isDone(state, l.eventId);
    const unlocked = reqsMet(state, byId.get(l.eventId));
    const levelState = done ? 'done' : l.optional ? (unlocked ? 'advanced' : 'locked') : unlocked ? 'next' : 'locked';
    return { id: l.eventId, optional: !!l.optional, state: levelState as 'done' | 'next' | 'locked' | 'advanced' };
  });
  return { doneCore: core.filter((l) => isDone(state, l.eventId)).length, totalCore: core.length, levels };
}

export function getNextInTrack(track: LearningTrack, state: GameState, events: GameEvent[]): GameEvent | null {
  const byId = new Map(events.map((e) => [e.id, e]));
  for (const l of track.levels) {
    if (isDone(state, l.eventId)) continue;
    const ev = byId.get(l.eventId);
    if (ev && reqsMet(state, ev)) return ev;
  }
  return null;
}

export function isFinaleUnlocked(state: GameState, tracks = LEARNING_TRACKS): boolean {
  const finale = tracks.find((t) => t.isFinale);
  const need = finale?.unlockAfterTracksCompleted ?? 3;
  const completedCore = tracks.filter((t) => !t.isFoundations && !t.isFinale && isTrackComplete(t, state)).length;
  return completedCore >= need;
}

export function getRecommendedNext(state: GameState, events: GameEvent[]): GameEvent | null {
  const tracks = [...LEARNING_TRACKS].sort((a, b) => a.order - b.order);
  const foundations = tracks.find((t) => t.isFoundations);
  if (foundations && !isFoundationsComplete(state)) return getNextInTrack(foundations, state, events);

  const open = tracks.filter((t) => !t.isFoundations && !t.isFinale);
  // continuable = unlocked, at least one level done, still has a playable next (core or optional)
  const continuable = open.filter((t) => {
    if (getTrackState(t, state, events) === 'locked') return false;
    const anyDone = t.levels.some((l) => isDone(state, l.eventId));
    return anyDone && getNextInTrack(t, state, events) != null;
  });
  if (continuable.length > 0) {
    const last = state.learningState?.lastTrackId;
    const chosen = continuable.find((t) => t.id === last) ?? continuable[0];
    const next = getNextInTrack(chosen, state, events);
    if (next) return next;
  }
  const notStarted = open.find((t) => getTrackState(t, state, events) === 'available'
    && !t.levels.some((l) => isDone(state, l.eventId)));
  if (notStarted) { const n = getNextInTrack(notStarted, state, events); if (n) return n; }

  const finale = tracks.find((t) => t.isFinale);
  if (finale && isFinaleUnlocked(state) && !isTrackComplete(finale, state)) return getNextInTrack(finale, state, events);

  for (const t of open) { const n = getNextInTrack(t, state, events); if (n) return n; }
  return null;
}
