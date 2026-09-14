import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Jeder Ergebnisbildschirm bekommt den erreichten Loesungszweig.
 *
 * Diese Pruefung existiert, weil derselbe Fehler dreimal passiert ist: Der
 * Befund einer geloesten Aufgabe erreichte zuerst gar keinen
 * Ergebnisbildschirm, dann nur den von SZENARIEN, dann nur den ausserhalb des
 * Story-Modus. Jedes Mal war die Ursache dieselbe — repariert wurde der
 * gemeldete Pfad statt aller.
 *
 * Der Test liest den Quelltext, statt zu rendern. Das ist grob, faengt aber
 * genau die Luecke: eine neu hinzugefuegte Render-Stelle ohne `solvedBranch`.
 */

const HIER = import.meta.dirname ?? fileURLToPath(new URL('.', import.meta.url));
const quelle = readFileSync(join(HIER, 'index.tsx'), 'utf8');

/** Alle JSX-Aufrufe eines Ergebnisbildschirms samt ihrer Attribute. */
function aufrufe(komponente: string): string[] {
  const treffer: string[] = [];
  const re = new RegExp(`<${komponente}\\b`, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(quelle))) {
    const start = m.index;
    const ende = quelle.indexOf('/>', start);
    expect(ende, `<${komponente}> bei ${start} ist nicht selbstschliessend`).toBeGreaterThan(start);
    treffer.push(quelle.slice(start, ende));
  }
  return treffer;
}

describe('GameScreen — der erreichte Zweig erreicht JEDEN Ergebnisbildschirm', () => {
  it.each(['ResultScreen', 'ScenarioResultScreen'])(
    'jeder <%s> bekommt solvedBranch',
    (komponente) => {
      const gefunden = aufrufe(komponente);
      expect(gefunden.length, `kein <${komponente}> gefunden — Test veraltet?`).toBeGreaterThan(0);
      gefunden.forEach((jsx, i) => {
        expect(
          jsx,
          `<${komponente}> Nr. ${i + 1} reicht solvedBranch nicht durch:\n${jsx}`
        ).toContain('solvedBranch=');
      });
    }
  );

  it('beide Bildschirme werden im Story- UND im Normalpfad gerendert', () => {
    // Sonst wuerde der Test oben gruen, weil ein Pfad ganz fehlt.
    expect(aufrufe('ResultScreen').length, 'Story- und Normalpfad erwartet').toBe(2);
    expect(aufrufe('ScenarioResultScreen').length, 'Story- und Normalpfad erwartet').toBe(2);
  });
});
