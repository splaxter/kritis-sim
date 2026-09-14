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
 * Die Routen mit FESTER Reihenfolge — nur sie haben ein „bis dahin", gegen das
 * sich eine Wissensbilanz rechnen laesst. Die Simulationsmodi fehlen hier
 * bewusst: `selectNextEvent` waehlt gleichverteilt aus einem Pool, da gibt es
 * kein Vorher.
 */
export interface Route {
  name: string;
  level: GameEvent[];
}

export function festeRouten(): Route[] {
  const nachId = new Map<string, GameEvent>();
  for (const e of [...allEvents, ...learningPathEvents, ...blackoutEvents, ...nis2Events, ...tutorialEvents]) {
    if (!nachId.has(e.id)) nachId.set(e.id, e);
  }

  const einstieg: GameEvent[] = [];
  for (const schritt of ONBOARDING_SEQUENCE) {
    if (schritt.kind === 'event') {
      const e = nachId.get(schritt.id);
      if (e) einstieg.push(e);
    } else {
      const s = getScenarioById(schritt.id);
      if (s) einstieg.push({ id: s.id, title: s.title, description: s.flavorText ?? '', terminalContext: s.terminalContext } as unknown as GameEvent);
    }
  }

  const lernpfad = LEARNING_TRACKS.flatMap(
    (t) => t.levels.map((l) => nachId.get(l.eventId)).filter((e): e is GameEvent => !!e)
  );

  return [
    { name: 'Einstieg (gefuehrt)', level: einstieg },
    { name: 'Lernpfad', level: lernpfad },
    ...(['probation', 'audit-trail', 'kataster'] as const).map((id) => ({
      name: `Story · ${getCampaign(id).title}`,
      level: getCampaign(id).storyEvents,
    })),
  ];
}
