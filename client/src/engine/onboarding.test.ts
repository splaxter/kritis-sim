import { describe, it, expect } from 'vitest';
import { GameState, GameModeId } from '@kritis/shared';
import { createInitialState } from './gameState';
import { getAllScenarios } from '../content/packs';
import { allEvents } from '../content/events';
import {
  ONBOARDING_FIRST_EVENT_ID,
  ONBOARDING_SCENARIO_IDS,
  ONBOARDING_SEQUENCE,
  getOnboardingContent,
  isOnboardingWindow,
} from './onboarding';

const alleSzenarien = getAllScenarios();

const zustand = (over: Partial<GameState> = {}, mode: GameModeId = 'beginner'): GameState => ({
  ...createInitialState('onb-seed', mode),
  completedEvents: [],
  completedScenarios: [],
  ...over,
});

const einstieg = (state: GameState, szenarien = alleSzenarien, events = allEvents) =>
  getOnboardingContent(events, szenarien, state);

/** Zustand, in dem die ersten n Schritte der Sequenz erledigt sind. */
const nachSchritten = (n: number, over: Partial<GameState> = {}): GameState => {
  const fertig = ONBOARDING_SEQUENCE.slice(0, n);
  return zustand({
    completedEvents: fertig.filter((s) => s.kind === 'event').map((s) => s.id),
    completedScenarios: fertig.filter((s) => s.kind === 'scenario').map((s) => s.id),
    ...over,
  });
};

const idOf = (c: unknown) => {
  const x = c as { kind: string; event?: { id: string }; scenario?: { id: string } };
  return x.kind === 'event' ? x.event!.id : x.scenario!.id;
};

describe('getOnboardingContent — die autorisierte Reihenfolge', () => {
  it('serviert alle acht Schritte in der vorgesehenen Reihenfolge', () => {
    const gesehen: string[] = [];
    for (let n = 0; n < ONBOARDING_SEQUENCE.length; n++) {
      const c = einstieg(nachSchritten(n, { currentDay: 1 }));
      expect(c, `Schritt ${n + 1} fehlt`).not.toBeNull();
      expect(c!.kind, `Schritt ${n + 1} hat die falsche Art`).toBe(ONBOARDING_SEQUENCE[n].kind);
      gesehen.push(idOf(c));
    }
    expect(gesehen).toEqual(ONBOARDING_SEQUENCE.map((s) => s.id));
  });

  it('die ersten vier Schritte sind erster Tag plus die drei Einstiegsfaelle', () => {
    expect(ONBOARDING_SEQUENCE.slice(0, 4).map((s) => s.id)).toEqual([
      ONBOARDING_FIRST_EVENT_ID,
      ...ONBOARDING_SCENARIO_IDS,
    ]);
  });

  it('ist die Sequenz durch, gibt die Regel den Tag wieder frei', () => {
    const c = einstieg(nachSchritten(ONBOARDING_SEQUENCE.length, { currentDay: 1 }));
    expect(c).toBeNull();
  });

  it('Tag 5 bleibt in jeder Woche der regulaeren Auswahl', () => {
    for (const week of [1, 2, 3]) {
      expect(einstieg(nachSchritten(0, { currentWeek: week, currentDay: 5 })), `w${week}`).toBeNull();
    }
  });

  it('ab Woche 4 greift die Regel nicht mehr, auch wenn noch etwas offen ist', () => {
    // Der Puffer ist bewusst endlich: ein Einsteiger, der nach drei Wochen noch
    // im Tutorial haengt, soll nicht ewig darin festgehalten werden.
    expect(einstieg(nachSchritten(0, { currentWeek: 4, currentDay: 1 }))).toBeNull();
  });

  it.each(['intermediate', 'kritis', 'learning', 'story'] as GameModeId[])(
    'Modus %s bekommt den gefuehrten Einstieg nicht aufgezwungen',
    (mode) => {
      for (const tag of [1, 2, 3, 4]) {
        expect(einstieg(zustand({ currentDay: tag }, mode)), `Tag ${tag}`).toBeNull();
      }
    }
  );

  /**
   * Selbstheilung: faellt ein Tag aus (abgebrochene Aufgabe, geladener
   * Spielstand), rutscht die Reihe nach, statt eine Luecke zu lassen.
   */
  it('holt einen ausgefallenen Schritt am naechsten Tag nach', () => {
    const c = einstieg(nachSchritten(0, { currentWeek: 2, currentDay: 3 }));
    expect(idOf(c)).toBe(ONBOARDING_FIRST_EVENT_ID);
  });

  it('ein bereits abgeschlossener Schritt wird nicht wiederholt', () => {
    const c = einstieg(nachSchritten(2, { currentDay: 3 }));
    expect(idOf(c)).toBe(ONBOARDING_SEQUENCE[2].id);
  });

  /**
   * Die Sequenz ERSETZT die requires-Kette der Tutorials — sie darf ihr nicht
   * widersprechen. Ein Tutorial erscheint erst, wenn sein Vorgaenger wirklich
   * in completedEvents steht.
   */
  it('kein Tutorial erscheint vor seinem Vorgaenger', () => {
    const tutorials = ONBOARDING_SEQUENCE.filter((s) => s.id.startsWith('evt_tutorial_'));
    expect(tutorials.length).toBe(4);
    for (let i = 1; i < tutorials.length; i++) {
      const vorher = ONBOARDING_SEQUENCE.findIndex((s) => s.id === tutorials[i - 1].id);
      // Zustand: alles bis einschliesslich des Vorgaengers fehlt noch.
      const c = einstieg(nachSchritten(vorher, { currentWeek: 2, currentDay: 1 }));
      expect(idOf(c), `${tutorials[i].id} ohne Vorgaenger`).toBe(tutorials[i - 1].id);
    }
  });

  it('eine unbekannte ID wird uebersprungen statt zu werfen', () => {
    // Kein Absturz beim Spielstart, wenn ein Level spaeter umbenannt wird.
    const ohneErstes = allEvents.filter((e) => e.id !== ONBOARDING_FIRST_EVENT_ID);
    const c = einstieg(nachSchritten(0, { currentDay: 1 }), alleSzenarien, ohneErstes);
    expect(idOf(c)).toBe(ONBOARDING_SEQUENCE[1].id);
  });

  it('leere Registrys liefern null, nicht eine Ausnahme', () => {
    expect(getOnboardingContent([], [], zustand({ currentDay: 1 }))).toBeNull();
  });
});

describe('isOnboardingWindow', () => {
  it('umfasst Wochen 1 bis 3, Tage 1 bis 4, nur im Einsteigermodus', () => {
    const fenster: string[] = [];
    for (const mode of ['beginner', 'intermediate'] as GameModeId[]) {
      for (const week of [1, 2, 3, 4]) {
        for (const tag of [1, 2, 3, 4, 5]) {
          if (isOnboardingWindow(zustand({ currentWeek: week, currentDay: tag }, mode))) {
            fenster.push(`${mode}-w${week}d${tag}`);
          }
        }
      }
    }
    expect(fenster).toEqual([
      'beginner-w1d1', 'beginner-w1d2', 'beginner-w1d3', 'beginner-w1d4',
      'beginner-w2d1', 'beginner-w2d2', 'beginner-w2d3', 'beginner-w2d4',
      'beginner-w3d1', 'beginner-w3d2', 'beginner-w3d3', 'beginner-w3d4',
    ]);
  });

  it('zwoelf Tage fuer acht Schritte — der Puffer ist echt', () => {
    expect(ONBOARDING_SEQUENCE.length).toBeLessThan(12);
  });
});

describe('die Bausteine der Sequenz gibt es wirklich', () => {
  it.each(ONBOARDING_SEQUENCE.map((s) => [s.id, s.kind]))(
    '%s ist als %s in der Registry',
    (id, kind) => {
      const gefunden =
        kind === 'event'
          ? allEvents.find((e) => e.id === id)
          : alleSzenarien.find((s) => s.id === id);
      expect(gefunden, `${id} fehlt`).toBeDefined();
    }
  );

  /**
   * Gegenprobe zum Modus-Gate: Es waere ein stiller Totalausfall, wenn das Gate
   * einen Schritt ausgerechnet aus dem Modus aussperrt, fuer den er gebaut ist.
   * Der gefuehrte Einstieg wuerde ihn dann zwar servieren, die regulaere
   * Auswahl ihn danach aber nie wieder anbieten.
   */
  it.each(ONBOARDING_SCENARIO_IDS)('%s ist auch im regulaeren Einsteiger-Pool', (id) => {
    const s = alleSzenarien.find((x) => x.id === id)!;
    expect(s.requiredModes ?? ['beginner']).toContain('beginner');
  });

  it.each(ONBOARDING_SEQUENCE.filter((s) => s.kind === 'event').map((s) => s.id))(
    '%s ist auch im regulaeren Einsteiger-Pool',
    (id) => {
      const e = allEvents.find((x) => x.id === id)!;
      expect(e.requiredModes ?? ['beginner']).toContain('beginner');
    }
  );
});
