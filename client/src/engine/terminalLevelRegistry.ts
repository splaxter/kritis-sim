import type { GameEvent } from '@kritis/shared';
import { allEvents } from '../content/events';
import { learningPathEvents } from '../content/events/learning-path';
import { blackoutEvents } from '../content/events/blackout';
import { nis2Events } from '../content/events/learning-path-nis2';
import { tutorialEvents } from '../content/events/tutorials';
import { getCampaign } from '../content/campaigns';
import { getAllScenarios, getScenarioById } from '../content/packs';
import { ONBOARDING_SEQUENCE } from './onboarding';
import { LEARNING_TRACKS } from '../content/events/learning-tracks';
import type { Routenlevel } from './wissensbilanz';

/**
 * Jedes Terminal-Level des Spiels, aus allen Quellen und entdoppelt.
 *
 * Es gibt keine solche Liste — Ereignisse, Lernpfad, Kampagnen und Packs
 * registrieren sich getrennt, und mehrere Sammlungen enthalten dieselben
 * Ereignisse. Genau deshalb konnte eine Luecke („dieser Befehl wurde nie
 * gezeigt") jahrelang unbemerkt bleiben: es gab keine Stelle, an der man ALLE
 * haette fragen koennen.
 */
export function alleTerminalLevel(): GameEvent[] {
  const ausEvents = [...allEvents, ...learningPathEvents, ...blackoutEvents, ...nis2Events, ...tutorialEvents];
  const ausKampagnen = (['probation', 'audit-trail', 'kataster'] as const).flatMap((id) => {
    const k = getCampaign(id);
    return [...k.storyEvents, ...k.sidequestEvents];
  });
  const ausPacks = getAllScenarios().map(
    (s) => ({ id: s.id, title: s.title, description: s.flavorText ?? '', terminalContext: s.terminalContext }) as unknown as GameEvent
  );

  const nachId = new Map<string, GameEvent>();
  for (const e of [...ausEvents, ...ausKampagnen, ...ausPacks]) {
    if (e.terminalContext && !nachId.has(e.id)) nachId.set(e.id, e);
  }
  return [...nachId.values()];
}

/**
 * Die Routen, auf denen es ueberhaupt ein „bis dahin" gibt.
 *
 * Zwei Dinge waren in der ersten Fassung falsch und sind hier korrigiert:
 *
 * - Der Lernpfad ist KEINE lineare Kette. Nach den Grundlagen sind alle Tracks
 *   frei waehlbar (`getTrackState`), und wer direkt in Netz-Forensik einsteigt,
 *   hat die vorher gelisteten Tracks nie gesehen. Eine Route pro Track, jede
 *   mit den Grundlagen davor — das ist das garantierte Vorwissen, mehr nicht.
 * - Optionale Lektionen sind keine Pflichtvorgeschichte. Sie werden geprueft,
 *   zaehlen aber nicht zum Wissen der Level DANACH (`pflicht: false`).
 *
 * Das Finale verlangt drei abgeschlossene Tracks, aber nicht WELCHE. Garantiert
 * sind deshalb nur die Grundlagen — alles andere waere geraten.
 *
 * Die Simulationsmodi fehlen bewusst: `selectNextEvent` waehlt gleichverteilt
 * aus einem Pool, da gibt es kein Vorher.
 */
export interface Route {
  name: string;
  level: Routenlevel[];
}

export function festeRouten(): Route[] {
  const nachId = new Map<string, GameEvent>();
  for (const e of [...allEvents, ...learningPathEvents, ...blackoutEvents, ...nis2Events, ...tutorialEvents]) {
    if (!nachId.has(e.id)) nachId.set(e.id, e);
  }

  const einstieg: Routenlevel[] = [];
  for (const schritt of ONBOARDING_SEQUENCE) {
    if (schritt.kind === 'event') {
      const e = nachId.get(schritt.id);
      if (e) einstieg.push({ event: e, pflicht: true });
    } else {
      const s = getScenarioById(schritt.id);
      if (s) einstieg.push({
        event: { id: s.id, title: s.title, description: s.flavorText ?? '', terminalContext: s.terminalContext } as unknown as GameEvent,
        pflicht: true,
      });
    }
  }

  const trackLevel = (trackId: string): Routenlevel[] => {
    const track = LEARNING_TRACKS.find((t) => t.id === trackId);
    if (!track) return [];
    return track.levels
      .map((l) => ({ event: nachId.get(l.eventId), pflicht: !l.optional }))
      .filter((x): x is Routenlevel => !!x.event);
  };

  const grundlagen = LEARNING_TRACKS.find((t) => t.isFoundations);
  const grundlagenLevel = grundlagen ? trackLevel(grundlagen.id) : [];

  const lernpfadRouten: Route[] = LEARNING_TRACKS.filter((t) => !t.isFoundations).map((t) => ({
    name: `Lernpfad · ${t.title}`,
    level: [...grundlagenLevel, ...trackLevel(t.id)],
  }));

  return [
    { name: 'Einstieg (gefuehrt)', level: einstieg },
    { name: 'Lernpfad · Grundlagen', level: grundlagenLevel },
    ...lernpfadRouten,
    ...(['probation', 'audit-trail', 'kataster'] as const).map((id) => ({
      name: `Story · ${getCampaign(id).title}`,
      level: getCampaign(id).storyEvents.map((event) => ({ event, pflicht: true })),
    })),
  ];
}
