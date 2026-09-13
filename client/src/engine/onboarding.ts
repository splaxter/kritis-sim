import { GameEvent, GameState, Scenario } from '@kritis/shared';

/**
 * Der gefuehrte Einstieg im Modus `beginner`.
 *
 * WARUM ES DAS BRAUCHT — zwei gemessene Befunde, nicht zwei Vermutungen:
 *
 * 1. `selectNextEvent` waehlt aus dem gefilterten Pool per
 *    `pool[hash % pool.length]`. Das deklarierte `probability` eines Events
 *    wird dabei NIE gelesen (nur `chainEngine` hat ein eigenes). Ein Event mit
 *    `probability: 1` hat also keinerlei Vorrang — es ist einer von N
 *    Kandidaten. Da rund 200 der ~370 Events auf 1 stehen, waere daraus auch
 *    nachtraeglich keine brauchbare Prioritaet zu machen.
 *
 * 2. Folge davon: `evt_first_day` wurde an Tag 1 regelmaessig von
 *    Zufallsereignissen verdraengt, und die vier Shell-Tutorials, die ueber
 *    `requires.events` daran und aneinander haengen, kamen ueberhaupt nicht
 *    vor. In 40 simulierten Einsteiger-Laeufen wurde KEIN einziges der vier
 *    Tutorials je serviert — weder vorher noch nach dem blossen Verbreitern
 *    ihres Zeitfensters. Das Fenster war nie die bindende Bedingung.
 *
 * Die Antwort ist deshalb nicht ein weiterer Wahrscheinlichkeitsregler,
 * sondern eine feste Reihenfolge: Der Einstieg ist eine AUTORISIERTE SEQUENZ,
 * kein Ziehungsergebnis. Genau so war die Tutorial-Kette ohnehin geschrieben —
 * Jens sagt am Ende von Lektion eins „die restlichen Befehle zeig ich dir
 * morgen".
 *
 * Die Regel ist bewusst eine reine Funktion ohne React-Bezug, damit sie sich
 * ohne gerenderte App pruefen laesst. Sie gilt NUR im Einsteigermodus; alle
 * anderen Modi laufen unveraendert ueber die regulaere Auswahl.
 */

/** Ein Schritt der Sequenz: ein Event oder ein Szenario, in dieser Reihenfolge. */
export interface OnboardingStep {
  kind: 'event' | 'scenario';
  id: string;
}

/**
 * Die autorisierte Reihenfolge der ersten acht Tage.
 *
 * Erst ankommen, dann drei praktische Handgriffe ohne Shell (beenden,
 * ablehnen, finden), dann die vier Terminal-Lektionen. Die GUI-Faelle stehen
 * bewusst VOR dem Terminal: ein Einsteiger soll etwas getan haben, bevor er
 * etwas tippt.
 */
export const ONBOARDING_SEQUENCE: readonly OnboardingStep[] = [
  { kind: 'event', id: 'evt_first_day' },
  { kind: 'scenario', id: 'INTERN-SC-011' },
  { kind: 'scenario', id: 'CLOUD365-SC-007' },
  { kind: 'scenario', id: 'TELEKOM-SC-007' },
  { kind: 'event', id: 'evt_tutorial_navigation' },
  { kind: 'event', id: 'evt_tutorial_files' },
  { kind: 'event', id: 'evt_tutorial_search' },
  { kind: 'event', id: 'evt_tutorial_network' },
];

/** Die drei Szenarien der Sequenz — von den Content-Guards mitbenutzt. */
export const ONBOARDING_SCENARIO_IDS = ONBOARDING_SEQUENCE.filter(
  (s) => s.kind === 'scenario'
).map((s) => s.id);

/** Der erste Arbeitstag. Ohne ihn startet die Tutorial-Kette nie. */
export const ONBOARDING_FIRST_EVENT_ID = ONBOARDING_SEQUENCE[0].id;

/**
 * Wochen 1-3, Tage 1-4.
 *
 * Acht Schritte auf zwoelf moegliche Tage: der Puffer faengt ausgefallene Tage
 * ab (abgebrochene Aufgabe, geladener Spielstand). In einem normalen Lauf ist
 * die Sequenz nach Woche 2 durch, und Woche 3 spielt bereits wieder regulaer.
 * Tag 5 bleibt in JEDER Woche frei — der gefuehrte Einstieg darf den Rest des
 * Spiels nicht verdraengen.
 */
const GUIDED_WEEKS = [1, 2, 3];
const GUIDED_DAYS = [1, 2, 3, 4];

/** Was an diesem Tag zwingend serviert wird. */
export type OnboardingContent =
  | { kind: 'event'; event: GameEvent }
  | { kind: 'scenario'; scenario: Scenario };

/** Der gefuehrte Einstieg gilt nur im Einsteigermodus und nur an diesen Tagen. */
export function isOnboardingWindow(state: GameState): boolean {
  return (
    state.gameMode === 'beginner' &&
    GUIDED_WEEKS.includes(state.currentWeek) &&
    GUIDED_DAYS.includes(state.currentDay)
  );
}

/**
 * Der Inhalt fuer diesen Tag — oder `null`, wenn die Regel nicht greift.
 *
 * Serviert wird der ERSTE noch nicht abgeschlossene Schritt, nicht der fuer
 * diesen Tag vorgesehene. Das macht die Regel selbstheilend: faellt ein Tag
 * aus, rutscht die Reihe nach, statt eine Luecke zu lassen. Ist die Sequenz
 * durch, gibt die Funktion `null` zurueck und die regulaere Auswahl uebernimmt
 * wieder — ab dann ist der Einstieg spurlos.
 *
 * Die Reihenfolge der Sequenz ERSETZT die `requires.events`-Kette der
 * Tutorials, sie widerspricht ihr nicht: Schritt n+1 kommt erst, wenn n in
 * `completedEvents` steht. Ihre `dayPreference` ist auf diesem Weg allerdings
 * wirkungslos — was hier beabsichtigt ist, denn genau die Kombination aus
 * Tagesvorliebe und Zufallsziehung hatte die Kette unerreichbar gemacht.
 *
 * Eine ID, die es nicht (mehr) gibt, wird uebersprungen statt zu werfen — ein
 * umbenanntes Level darf den Spielstart nicht zerlegen.
 */
export function getOnboardingContent(
  events: GameEvent[],
  scenarios: Scenario[],
  state: GameState
): OnboardingContent | null {
  if (!isOnboardingWindow(state)) return null;

  const eventsDone = state.completedEvents || [];
  const scenariosDone = state.completedScenarios || [];

  for (const step of ONBOARDING_SEQUENCE) {
    if (step.kind === 'event') {
      if (eventsDone.includes(step.id)) continue;
      const event = events.find((e) => e.id === step.id);
      if (event) return { kind: 'event', event };
    } else {
      if (scenariosDone.includes(step.id)) continue;
      const scenario = scenarios.find((s) => s.id === step.id);
      if (scenario) return { kind: 'scenario', scenario };
    }
  }
  return null;
}
