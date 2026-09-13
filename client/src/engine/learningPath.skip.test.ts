import { describe, it, expect } from 'vitest';
import { GameState } from '@kritis/shared';
import { LEARNING_TRACKS } from '../content/events/learning-tracks';
import { allEvents } from '../content/events';
import {
  getNextInTrack,
  FOUNDATIONS_PROVEN_FLAG,
  isFoundationsComplete,
  isFoundationsSkipped,
  getTrackState,
  getRecommendedNext,
} from './learningPath';

const foundations = LEARNING_TRACKS.find((t) => t.isFoundations)!;
const foundationsCore = foundations.levels.filter((l) => !l.optional).map((l) => l.eventId);

function mkState(over: Partial<GameState> = {}): GameState {
  return { completedEvents: [], flags: {}, ...over } as unknown as GameState;
}

/**
 * Der Einstufungstest ersetzt die vier Grundlagen. Er ist eine Abkuerzung fuer
 * Leute, die das laengst koennen — kein zweites Tor und keine Selbstauskunft:
 * wer durchwill, zeigt es einmal.
 */
describe('Grundlagen-Skip — der Riegel oeffnet sich nur gegen Nachweis', () => {
  it('ohne alles bleibt jeder andere Track zu', () => {
    const state = mkState();
    expect(isFoundationsComplete(state)).toBe(false);
    for (const t of LEARNING_TRACKS) {
      if (t.isFoundations) continue;
      expect(getTrackState(t, state, allEvents), t.id).toBe('locked');
    }
  });

  it('das Flag oeffnet dieselben Tracks wie die vier durchgespielten Level', () => {
    const durchgespielt = mkState({ completedEvents: [...foundationsCore] });
    const bewiesen = mkState({ flags: { [FOUNDATIONS_PROVEN_FLAG]: true } });

    expect(isFoundationsComplete(durchgespielt)).toBe(true);
    expect(isFoundationsComplete(bewiesen)).toBe(true);

    for (const t of LEARNING_TRACKS) {
      if (t.isFoundations || t.isFinale) continue;
      expect(getTrackState(t, bewiesen, allEvents), t.id).toBe(
        getTrackState(t, durchgespielt, allEvents)
      );
    }
  });

  it('isFoundationsSkipped unterscheidet Abkuerzung von Durchspielen', () => {
    expect(isFoundationsSkipped(mkState({ flags: { [FOUNDATIONS_PROVEN_FLAG]: true } }))).toBe(true);
    // Wer sie wirklich gespielt hat, hat NICHT uebersprungen — der Hub zeigt
    // beides verschieden an.
    expect(isFoundationsSkipped(mkState({ completedEvents: [...foundationsCore] }))).toBe(false);
  });

  /**
   * Die vier Level duerfen NICHT als gespielt gelten. Sonst behauptet der
   * Spielstand etwas, das nicht passiert ist — dieselbe Luege, die das
   * Kataster bestraft.
   */
  it('der Skip traegt keine Level in completedEvents ein', () => {
    const bewiesen = mkState({ flags: { [FOUNDATIONS_PROVEN_FLAG]: true } });
    for (const id of foundationsCore) {
      expect(bewiesen.completedEvents, id).not.toContain(id);
    }
    // … und die Grundlagen bleiben spielbar.
    expect(getTrackState(foundations, bewiesen, allEvents)).not.toBe('locked');
  });

  it('nach dem Skip empfiehlt der Hub einen echten Track, nicht die Grundlagen', () => {
    const bewiesen = mkState({ flags: { [FOUNDATIONS_PROVEN_FLAG]: true } });
    const next = getRecommendedNext(bewiesen, allEvents);
    expect(next).not.toBeNull();
    expect(foundationsCore, 'empfiehlt weiter die Grundlagen').not.toContain(next!.id);
  });

  it('der Test selbst ist kein Track-Level — sonst muesste man ihn abschliessen', () => {
    const alleLevelIds = LEARNING_TRACKS.flatMap((t) => t.levels.map((l) => l.eventId));
    expect(alleLevelIds).not.toContain('learn_00_einstufung');
  });
});

/**
 * Der Fund beim Schreiben dieser Tests: der Riegel allein genuegt nicht. Die
 * ersten Level der anderen Tracks verlangen die Grundlagen zusaetzlich per
 * `requires.events` — ohne Sonderbehandlung oeffnet das Flag den Track und
 * sperrt trotzdem jedes Level darin.
 */
describe('Grundlagen-Skip — auch requires.events erkennt den Nachweis an', () => {
  it('mindestens ein Level verlangt ueberhaupt eine Grundlagen-Voraussetzung', () => {
    const mitGrundlagenReq = allEvents.filter((e) =>
      (e.requires?.events ?? []).some((r) => foundationsCore.includes(r))
    );
    expect(mitGrundlagenReq.length, 'sonst testet der naechste Fall nichts').toBeGreaterThan(0);
  });

  it('nach dem Skip ist in jedem freigeschalteten Track ein Level spielbar', () => {
    const bewiesen = mkState({ flags: { [FOUNDATIONS_PROVEN_FLAG]: true } });
    const offen = LEARNING_TRACKS.filter((t) => !t.isFoundations && !t.isFinale);
    const spielbar = offen.filter((t) => getNextInTrack(t, bewiesen, allEvents) != null);
    expect(spielbar.length, 'kein Track hat ein spielbares Level').toBe(offen.length);
  });

  it('ohne Skip bleiben dieselben Level gesperrt', () => {
    const nichts = mkState();
    const offen = LEARNING_TRACKS.filter((t) => !t.isFoundations && !t.isFinale);
    for (const t of offen) {
      expect(getTrackState(t, nichts, allEvents), t.id).toBe('locked');
    }
  });
});
