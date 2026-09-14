import { describe, it, expect } from 'vitest';
import type { GameEvent } from '@kritis/shared';
import { listCampaigns } from './index';

/**
 * Wer einen Befund in eine Datei schreiben soll, muss wissen, WIE.
 *
 * Der Anlass: „ich find gleich die erste kataster aufgabe etwas schwierig wenn
 * man keine vorerfahrung in der cli hat". Nachgemessen stimmte das und zwar
 * strukturell — alle sechs Terminal-Level von DAS KATASTER enden damit, dass
 * der Spieler einen Befund selbst in eine Datei schreibt, und die Shell hier
 * hat keinen Editor (kein `nano`, kein `vi`). Die Umlenkung `>>` ist der
 * einzige Weg. Beigebracht wurde sie nie: die vier Grundlagen-Tutorials tragen
 * `requiredModes: ['beginner']`, der gefuehrte Einstieg laeuft nur im
 * Einsteigermodus — ein Story-Spieler hatte vorher NULL Terminalkontakt.
 *
 * Die Regel, die daraus folgt: das erste Level einer Kampagne, das Schreiben
 * verlangt, zeigt die Umlenkung — und zwar im Aufgabenfeld, das stehen bleibt,
 * nicht nur im Mentorhinweis, der mit dem Briefing verschwindet. Spaetere
 * Level duerfen darauf aufbauen.
 */

interface Schreibziel {
  event: GameEvent;
  ziele: string[];
}

/** Terminal-Level, deren Sieg davon abhaengt, was in einer Datei STEHT. */
function schreibLevel(events: GameEvent[]): Schreibziel[] {
  const treffer: Schreibziel[] = [];
  for (const event of events) {
    const ctx = event.terminalContext;
    if (!ctx) continue;
    const ziele: string[] = [];
    for (const loesung of ctx.solutions ?? []) {
      for (const goal of loesung.stateGoals ?? []) {
        // `fileRead` ist Lesen, nicht Schreiben. Gemeint sind nur Ziele, die
        // eine Bedingung an den INHALT einer Datei stellen.
        const schreibt =
          goal.file &&
          (goal.matches !== undefined ||
            goal.absentMatches !== undefined ||
            goal.reportFields !== undefined);
        if (schreibt && goal.file) ziele.push(goal.file);
      }
    }
    if (ziele.length > 0) treffer.push({ event, ziele });
  }
  return treffer;
}

const kampagnen = listCampaigns().map((c) => ({
  campaign: c,
  schreiber: schreibLevel([...c.storyEvents, ...c.sidequestEvents]),
}));

describe('Schreiben ohne Editor wird erklaert, bevor es verlangt wird', () => {
  it('mindestens eine Kampagne verlangt ueberhaupt Schreiben (sonst prueft der Test nichts)', () => {
    const gesamt = kampagnen.reduce((n, k) => n + k.schreiber.length, 0);
    expect(gesamt, 'kein einziges Schreib-Level gefunden — Erkennung veraltet?').toBeGreaterThan(0);
  });

  it.each(kampagnen.filter((k) => k.schreiber.length > 0).map((k) => [k.campaign.id, k] as const))(
    '%s: das erste Schreib-Level zeigt die Umlenkung im Aufgabenfeld',
    (_id, k) => {
      const erstes = k.schreiber[0];
      const aufgabe = erstes.event.terminalContext?.taskText ?? '';
      expect(
        aufgabe,
        `${erstes.event.id} laesst nach ${erstes.ziele[0]} schreiben, sagt aber nicht wie.\n` +
          'Die Shell hat keinen Editor — ohne >> ist die Aufgabe fuer einen Neuling nicht loesbar.\n' +
          `Aufgabentext: ${aufgabe}`
      ).toContain('>>');
    }
  );

  it.each(kampagnen.filter((k) => k.schreiber.length > 0).map((k) => [k.campaign.id, k] as const))(
    '%s: der Unterschied zwischen anhaengen und ueberschreiben steht dabei',
    (_id, k) => {
      const erstes = k.schreiber[0];
      const ctx = erstes.event.terminalContext;
      const text = [ctx?.taskText, erstes.event.mentorNote, erstes.event.description]
        .filter(Boolean)
        .join('\n');
      // `>` allein loescht die Datei von gestern. Wer nur `>>` zeigt, erklaert
      // nicht, warum man das Zeichen zweimal tippt.
      expect(
        /überschreib|ueberschreib/i.test(text),
        `${erstes.event.id} zeigt >>, erklaert aber nicht, was > allein tut`
      ).toBe(true);
    }
  );
});

describe('Die Voraussetzung der Karte deckt sich mit dem, was die Level verlangen', () => {
  it('eine Kampagne mit Schreib-Leveln nennt das Schreiben in ihrer Voraussetzung', () => {
    for (const k of kampagnen) {
      if (k.schreiber.length === 0) continue;
      const text = (k.campaign.menu.prerequisite ?? '').toLowerCase();
      expect(
        text,
        `${k.campaign.id} hat ${k.schreiber.length} Schreib-Level, kuendigt aber nur Lesen an`
      ).toMatch(/schreib|protokoll/);
    }
  });
});
