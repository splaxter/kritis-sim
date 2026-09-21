import { describe, it, expect } from 'vitest';
import { createShellFromContext, checkStateGoals } from './shell';
import { alleTerminalLevel } from './terminalLevelRegistry';

/**
 * Kein Level ist geloest, bevor jemand etwas getippt hat.
 *
 * Der Wachhund, den es haette geben muessen. `useTerminal` hat die Shell
 * gebaut, indem es elf Felder des Kontexts einzeln abgeschrieben hat — und
 * sieben vergessen: `services`, `journal`, `firewall`, `nft`, `listeners`,
 * `connections`, `mailboxes`. Alle Pruefungen bauten die Shell aus dem VOLLEN
 * Kontext und waren gruen; im Spiel lief der Spieler gegen einen ungesaeten
 * Host.
 *
 * Bei `learn_net_01_open_doors` hiess das: Der Lauscher auf Port 31337, den
 * man finden und beenden sollte, existierte nie — und die Bedingung „kein
 * Lauscher auf 31337" war damit von Anfang an wahr. Das Level loeste sich beim
 * ersten Enter selbst. Aufgefallen ist es erst beim Spielen.
 *
 * Diese Pruefung faengt die ganze Klasse, egal woher der fehlende Zustand
 * kommt: Wenn die Gewinnbedingung schon im Ausgangszustand erfuellt ist, ist
 * entweder der Seed unvollstaendig oder die Bedingung falsch.
 */

const level = alleTerminalLevel().filter((e) =>
  (e.terminalContext?.solutions ?? []).some((l) => (l.stateGoals ?? []).length > 0)
);

describe('Der Ausgangszustand loest kein Level', () => {
  it('es gibt ueberhaupt Level mit Zustandszielen zu pruefen', () => {
    expect(level.length).toBeGreaterThan(30);
  });

  it.each(level.map((e) => [e.id, e] as const))('%s ist am Anfang NICHT geloest', (_id, e) => {
    const ctx = e.terminalContext!;
    const shell = createShellFromContext(ctx);
    for (const loesung of ctx.solutions ?? []) {
      const ziele = loesung.stateGoals ?? [];
      if (ziele.length === 0) continue;
      expect(
        checkStateGoals(shell, ziele),
        `${e.id}: die Gewinnbedingung ist schon im Ausgangszustand erfuellt — ` +
          'entweder fehlt dem Level sein Ausgangszustand (Seed) oder die Bedingung prueft das Falsche'
      ).toBe(false);
    }
  });
});
