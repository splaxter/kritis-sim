import { describe, it, expect } from 'vitest';
import { befehleImText, bilanziere, LINUX_BEFEHLE } from './wissensbilanz';
import { festeRouten } from './terminalLevelRegistry';

/**
 * Verlangt das Spiel je einen Befehl, den es nie gezeigt hat?
 *
 * Die Frage stellt sich, weil die Antwort zweimal „ja" war und beide Male ein
 * Mensch sie gefunden hat: DAS KATASTER verlangte im ersten Level `find`,
 * `wc -l`, `grep -r` und eine Umlenkung, und ein Story-Spieler hatte davon nie
 * eines gesehen — die Grundlagen-Tutorials tragen `requiredModes: ['beginner']`.
 */

describe('Befehle aus einem Text lesen', () => {
  it('erkennt Befehle mitten in deutscher Prosa', () => {
    const gefunden = befehleImText(
      'Umfang von /srv feststellen (find + wc -l); danach mit grep -r suchen.',
      LINUX_BEFEHLE
    );
    expect([...gefunden].sort()).toEqual(['find', 'grep', 'wc']);
  });

  it('haelt Umlenkung und Pipe auseinander', () => {
    expect([...befehleImText('echo "x" >> datei', LINUX_BEFEHLE)]).toContain('>>');
    expect([...befehleImText('echo "x" >> datei', LINUX_BEFEHLE)]).not.toContain('>');
    expect([...befehleImText('echo "x" > datei', LINUX_BEFEHLE)]).toContain('>');
    expect([...befehleImText('cat a | wc -l', LINUX_BEFEHLE)]).toContain('|');
  });

  /**
   * Der Grund fuer die Kontextregel. `du`, `dir` und `man` sind Befehle UND
   * deutsche Woerter; `Groß/Klein` enthaelt einen Schraegstrich und ist trotzdem
   * kein Pfad. Ohne diese Regel meldete die Bilanz „du" als ungelernten Befehl.
   */
  it('faellt nicht auf deutsche Woerter herein, die auch Befehle sind', () => {
    expect([...befehleImText('Mit grep -i ignorierst du Groß/Klein.', LINUX_BEFEHLE)]).toEqual(['grep']);
    expect([...befehleImText('Schau dir das an, man weiß ja nie.', LINUX_BEFEHLE)]).toEqual([]);
    // Mit echtem Argument zaehlen sie sehr wohl.
    expect([...befehleImText('du -sh /var/log', LINUX_BEFEHLE)]).toContain('du');
    expect([...befehleImText('man grep', LINUX_BEFEHLE)]).toContain('man');
  });

  it('faerbt PowerShell nicht auf Linux ab', () => {
    // `dir`, `gc`, `ci` sind PowerShell-Aliasse. In einem Linux-Level sind sie
    // keine Befehle, sondern deutsche Silben.
    expect([...befehleImText('Sieh dir /var/log an', LINUX_BEFEHLE)]).toEqual([]);
  });
});

const bilanzen = festeRouten().map((r) => ({ route: r.name, bilanz: bilanziere(r.name, r.level) }));

describe('Wissensbilanz je Route', () => {
  it('die Routen sind nicht leer (sonst prueft der Rest nichts)', () => {
    const gesamt = bilanzen.reduce((n, b) => n + b.bilanz.terminalLevel, 0);
    expect(gesamt, 'kein einziges Terminal-Level auf einer festen Route').toBeGreaterThan(40);
  });

  /**
   * Die harte Regel. „Unloesbar" heisst: der Befehl steht NIRGENDS — nicht im
   * Auftrag, nicht in einem Hinweis, nicht in einer vorgefuehrten Zeile — und
   * die Route hat ihn vorher nie gezeigt. Wer ihn nicht von aussen mitbringt,
   * kommt nicht weiter.
   */
  it.each(bilanzen.map((b) => [b.route, b] as const))(
    '%s verlangt nichts, was nirgends steht',
    (_name, { bilanz }) => {
      const schlimm = bilanz.befunde.filter((f) => f.unloesbar.length > 0);
      expect(
        schlimm.map((f) => `${f.eventId}: ${f.unloesbar.join(', ')}`),
        'diese Level brauchen Wissen, das das Spiel nie vermittelt hat'
      ).toEqual([]);
    }
  );
});

/**
 * Die weiche Regel als Ratsche. „Nur im Hinweis" heisst: der Befehl ist neu und
 * wird erst im Hinweis erklaert, nicht im Auftrag. Loesbar — aber es ist genau
 * der Fall, ueber den sich der Auftraggeber beschwert hat: sich Hinweise
 * abzuholen, um den ersten Schritt zu tun, fuehlt sich nicht nach Lernen an.
 *
 * Die Zahlen sind der gemessene Stand, kein Ziel. Sie duerfen sinken, nicht
 * steigen: ein neues Level, das seinen Befehl erst im Hinweis nennt, faellt auf.
 */
const RATSCHE: Record<string, number> = {
  'Einstieg (gefuehrt)': 0,
  Lernpfad: 5,
  'Story · Die Probezeit': 0,
  'Story · Audit Trail': 3,
  'Story · Das Kataster': 3,
};

describe('Neue Befehle gehoeren in den Auftrag, nicht erst in den Hinweis', () => {
  it.each(bilanzen.map((b) => [b.route, b] as const))(
    '%s wird nicht schlechter',
    (name, { bilanz }) => {
      const betroffen = bilanz.befunde.filter((f) => f.nurImHinweis.length > 0);
      const grenze = RATSCHE[name];
      expect(grenze, `Route "${name}" fehlt in der Ratsche`).toBeDefined();
      expect(
        betroffen.length,
        `${betroffen.map((f) => `${f.eventId}: ${f.nurImHinweis.join(', ')}`).join(' | ')}\n` +
          'Wurde es besser? Dann die Zahl in RATSCHE senken.'
      ).toBeLessThanOrEqual(grenze);
    }
  );
});
