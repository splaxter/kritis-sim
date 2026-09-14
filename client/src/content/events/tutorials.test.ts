import { describe, it, expect } from 'vitest';
import { tutorialEvents } from './tutorials';

/**
 * Die vier Einsteiger-Tutorials. Playtest-Befunde, die hier festgehalten sind:
 *
 * - Die Abschlusstexte behaupteten Beherrschung („Du hast die Grundbefehle
 *   gemeistert!"). Eine Uebung mit drei abgetippten Befehlen belegt das nicht.
 *   Sie sagen jetzt, was sie BELEGT — und was ausdruecklich nicht.
 * - Der zweite Netzwerk-Hinweis behauptete, ein nacktes `ping` laufe ewig,
 *   waehrend die Simulation nach drei Antworten von selbst endete.
 */

const byId = (id: string) => {
  const e = tutorialEvents.find((x) => x.id === id);
  if (!e) throw new Error(`${id} fehlt`);
  return e;
};
const loesungstext = (id: string) => byId(id).terminalContext!.solutions[0].resultText!;

const ALLE = tutorialEvents.map((e) => e.id);

describe('Tutorials — kein Abschlusstext behauptet Beherrschung', () => {
  it.each(ALLE)('%s: der Abschlusstext verspricht keine Meisterschaft', (id) => {
    const t = loesungstext(id);
    expect(t, 'eine Uebung mit abgetippten Befehlen belegt keine Beherrschung')
      .not.toMatch(/gemeistert|beherrschst|Meister/i);
  });

  it.each(ALLE)('%s: der Abschlusstext benennt auch die Grenze der Uebung', (id) => {
    const t = loesungstext(id);
    // „noch nicht", „NICHT fest", „steht nicht in der Ausgabe" — irgendeine
    // ausdrueckliche Einschraenkung muss da sein.
    expect(t, 'kein Satz darueber, was die Uebung NICHT zeigt').toMatch(
      /noch nicht|nicht fest|nicht in der Ausgabe|zwei verschiedene|keine Diagnose/i
    );
  });

  it.each(ALLE)('%s: der Abschlusstext ist mehr als ein Ausruf', (id) => {
    expect(loesungstext(id).length).toBeGreaterThan(120);
  });
});

describe('Tutorials — die Simulation widerspricht ihren Hinweisen nicht', () => {
  const netz = byId('evt_tutorial_network');

  it('das nackte ping zeigt, dass es abgebrochen werden musste', () => {
    const bare = netz.terminalContext!.commands.find((c) => c.pattern === 'ping mail.warm.local')!;
    expect(bare.output, 'ohne Abbruchzeile endet es scheinbar von selbst').toMatch(/\^C/);
  });

  it('der Hinweis behauptet nichts, was die Ausgabe widerlegt', () => {
    const hinweise = netz.terminalContext!.hints.join('\n');
    const bare = netz.terminalContext!.commands.find((c) => c.pattern === 'ping mail.warm.local')!;
    // Wenn ein Hinweis von „laeuft ewig"/Abbruch spricht, muss die Ausgabe das zeigen.
    if (/ewig|Strg\+C|abbrechen/i.test(hinweise)) {
      expect(bare.output).toMatch(/\^C|Strg\+C/);
    }
  });

  it('die begrenzte Fassung endet dagegen von selbst', () => {
    const drei = netz.terminalContext!.commands.find((c) => c.pattern === 'ping -c 3 mail.warm.local')!;
    expect(drei.output).not.toMatch(/\^C/);
    expect(drei.output).toMatch(/3 packets transmitted/);
  });

  it('der Netzwerk-Abschluss trennt Erreichbarkeit von Dienstverfuegbarkeit', () => {
    const t = loesungstext('evt_tutorial_network');
    expect(t).toMatch(/Ping/);
    expect(t, 'genau das ist die Lektion').toMatch(/nicht.*Mailserver|Mail funktioniert/i);
  });
});
