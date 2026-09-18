import { describe, it, expect } from 'vitest';
import type { GameState, GameModeId } from '@kritis/shared';
import { getAvailableScenarios } from './scenarioEngine';
import { getAllScenarios } from '../content/packs';

/**
 * Wer sieht welchen Fall — gemessen statt angenommen.
 *
 * Die Auswahl gibt es zweimal: `Scenario.difficulty` ist nicht nur ein
 * Schwierigkeitsgrad, sondern auch ein TOR. Sie wird gegen zwei Deckel
 * geprueft — den des Spielmodus (`maxScenarioDifficulty`) und den des
 * Fortschritts (frueh 2, Mitte 3, spaet Modus-Maximum). Wer eine 5 vergibt,
 * entscheidet damit nebenbei, dass die Modi `learning` und `story` den Fall
 * NIE zu sehen bekommen. Das faellt beim Schreiben nicht auf, weil beides
 * dasselbe Feld ist.
 *
 * Deshalb steht es hier: als Zahl, nicht als Gefuehl.
 */

const MODI: GameModeId[] = ['beginner', 'learning', 'intermediate', 'hard', 'kritis', 'story'];
const WOCHEN: Record<string, number> = {
  beginner: 12, learning: 12, intermediate: 12, hard: 12, kritis: 24, story: 12,
};

const zustand = (gameMode: GameModeId, currentWeek: number): GameState =>
  ({
    seed: 'S', runNumber: 1, gameMode, currentWeek, currentDay: 1,
    skills: {}, relationships: {}, stress: 10, budget: 1, compliance: 50,
    activeEvents: [], completedEvents: [], completedScenarios: [],
    flags: {}, unlockedCommands: [], terminalHistory: [], isStoryMode: false,
    decisions: [], pendingChainEvents: [],
  }) as unknown as GameState;

/** In welchen Modi taucht der Fall irgendwann im Topf auf? */
function modiMitZugang(id: string): GameModeId[] {
  const alle = getAllScenarios();
  return MODI.filter((m) =>
    Array.from({ length: WOCHEN[m] }, (_, i) => i + 1).some((w) =>
      getAvailableScenarios(alle, zustand(m, w)).some((s) => s.id === id)
    )
  );
}

/** Ab welcher Woche im genannten Modus? null = nie. */
function abWoche(id: string, mode: GameModeId): number | null {
  const alle = getAllScenarios();
  for (let w = 1; w <= WOCHEN[mode]; w++) {
    if (getAvailableScenarios(alle, zustand(mode, w)).some((s) => s.id === id)) return w;
  }
  return null;
}

describe('Jeder Fall ist irgendwo erreichbar', () => {
  it('kein Szenario faellt durch beide Deckel', () => {
    const nirgends = getAllScenarios()
      .filter((s) => modiMitZugang(s.id).length === 0)
      .map((s) => `${s.id} (Schwierigkeit ${s.difficulty}, Modi ${JSON.stringify(s.requiredModes ?? 'alle')})`);
    expect(
      nirgends,
      'Szenario in keinem Modus erreichbar — Schwierigkeit senken oder requiredModes pruefen'
    ).toEqual([]);
  });
});

describe('Die Faelle des ISB erreichen den Lernmodus', () => {
  // Es sind Uebungen: OT-Segmentierung, Rueckspielprobe, personenbezogener
  // Zugriff. Genau dafuer gibt es den Lernmodus — ein Fall, den er nicht sieht,
  // ist am Publikum vorbei gebaut.
  it.each(['KRITIS-SC-013', 'KRITIS-SC-014', 'KRITIS-SC-015'])(
    '%s ist in learning und story erreichbar',
    (id) => {
      const modi = modiMitZugang(id);
      expect(modi, `${id} erreicht den Lernmodus nicht — Schwierigkeit 5 schliesst ihn aus`).toContain('learning');
      expect(modi).toContain('story');
    }
  );

  it('sie kommen erst im letzten Drittel — das ist Absicht, aber es soll dastehen', () => {
    // Der Fortschrittsdeckel liegt frueh bei 2 und in der Mitte bei 3. Ein Fall
    // der Schwierigkeit 4 ist damit strukturell ein Spaetfall. Wer das aendern
    // will, aendert die Schwierigkeit — und sollte es hier sehen.
    for (const id of ['KRITIS-SC-013', 'KRITIS-SC-014', 'KRITIS-SC-015']) {
      expect(abWoche(id, 'learning'), id).toBe(8);
      expect(abWoche(id, 'kritis'), id).toBe(16);
    }
  });
});

describe('Die drei haengen NICHT aneinander', () => {
  it('keiner setzt einen anderen voraus — die Auswahl kennt keine Reihenfolge', () => {
    // `selectNextScenario` zieht gewichtet aus dem ganzen Topf; ein Szenario
    // hat kein `requires`. Ein Text, der „Punkt 1/2/3" verspricht, verspricht
    // deshalb etwas, das die Engine nicht einhaelt — in einer Simulation ueber
    // 200 Laeufe kam jede der sechs Reihenfolgen vor und in 43 Laeufen keiner
    // der drei. Die Faelle nennen ihren Abschnitt, nicht ihre Nummer.
    const texte = getAllScenarios()
      .filter((s) => ['KRITIS-SC-013', 'KRITIS-SC-014', 'KRITIS-SC-015'].includes(s.id))
      .map((s) => `${s.id}: ${s.flavorText}`);
    expect(texte).toHaveLength(3);
    for (const t of texte) {
      expect(t, 'Ordnungszahl verspricht eine Reihenfolge, die die Auswahl nicht einhaelt').not.toMatch(
        /\bPunkt [123]\b/
      );
    }
  });
});
