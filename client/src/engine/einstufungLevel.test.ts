import { describe, it, expect } from 'vitest';
import { einstufungEvents } from '../content/events/learning-path-einstufung';
import { createShellFromContext, checkStateGoals } from './shell';
import { ShellEngine } from './shell/ShellEngine';
import { TerminalContext } from '@kritis/shared';

/**
 * Durchstich durch den Einstufungstest mit der ECHTEN Shell. Ein Level, das die
 * Grundlagen ersetzt, muss selbst loesbar sein — und zwar auf dem Weg, den die
 * Hinweise beschreiben.
 */
const ev = einstufungEvents.find((e) => e.id === 'learn_00_einstufung')!;
const ctx = (): TerminalContext => ev.terminalContext!;
const goals = () => ctx().solutions[0].stateGoals!;
const fresh = (): ShellEngine => createShellFromContext(ctx());

/**
 * grep faerbt Treffer ein — die Ausgabe traegt ANSI-Codes mitten im Text. Fuer
 * Inhaltszusicherungen muessen die weg, sonst prueft man die Farbe mit.
 */
const ohneFarbe = (s: string) => s.replace(new RegExp(String.fromCharCode(27) + '\\[[0-9;]*m', 'g'), '');

const run = (shell: ShellEngine, cmd: string) => {
  const r = shell.execute(cmd);
  expect(shell.hasPendingInput(), `unerwartete Eingabeaufforderung nach "${cmd}"`).toBe(false);
  return r;
};

describe('Einstufungstest — der Sollpfad loest', () => {
  it('grep -rn plus Umleitung erfuellt alle Ziele', () => {
    const shell = fresh();
    expect(checkStateGoals(shell, goals()), 'am Anfang darf nichts erfuellt sein').toBe(false);

    run(shell, 'ls -a');
    run(shell, 'grep -rn svc-backup /srv/export > /home/timo/befund.txt');
    run(shell, 'cat /home/timo/befund.txt');

    expect(checkStateGoals(shell, goals())).toBe(true);
  });

  it('grep findet den Treffer in Zeile 3 der Altbestands-Datei', () => {
    const shell = fresh();
    const ausgabe = ohneFarbe(run(shell, 'grep -rn svc-backup /srv/export').output);
    expect(ausgabe).toContain('dienste_2025-11.csv');
    // Die Zeilennummer ist der eigentliche Lerninhalt — ein Fund ohne
    // Fundstelle ist eine Behauptung. (Zeile 3: Kopfzeile, Spaltenzeile,
    // Treffer. Im Entwurf stand faelschlich 4 — der Durchstich hat es gefunden.)
    expect(ausgabe).toMatch(/dienste_2025-11\.csv:3:/);
  });

  it('die versteckte Notiz ist ohne -a nicht zu sehen', () => {
    const shell = fresh();
    expect(ohneFarbe(run(shell, 'ls').output)).not.toContain('.notiz');
    expect(ohneFarbe(run(shell, 'ls -a').output)).toContain('.notiz');
  });
});

describe('Einstufungstest — was NICHT reicht', () => {
  it('nur den Dateinamen aufschreiben loest nicht', () => {
    const shell = fresh();
    run(shell, 'grep -rn svc-backup /srv/export');
    run(shell, 'echo "dienste_2025-11.csv" > /home/timo/befund.txt');
    expect(checkStateGoals(shell, goals()), 'Fundstelle fehlt').toBe(false);
  });

  /**
   * Die Falle aus dem Kataster-Bau: `commandRan` matcht die Kommandozeile als
   * TEXT. Ohne Verankerung wuerde das blosse BEHAUPTEN einer Suche genuegen.
   */
  it('eine behauptete Suche erfuellt das Suchziel nicht', () => {
    const shell = fresh();
    run(shell, 'echo "ich habe grep -rn benutzt, Treffer in dienste_2025-11.csv Zeile 3" > /home/timo/befund.txt');
    expect(checkStateGoals(shell, goals()), 'Behaupten ersetzt das Suchen').toBe(false);
  });

  it('die ganze Datei blind kopieren loest nicht', () => {
    const shell = fresh();
    run(shell, 'cat /srv/export/altbestand/dienste_2025-11.csv > /home/timo/befund.txt');
    expect(checkStateGoals(shell, goals())).toBe(false);
  });
});

describe('Einstufungstest — Aufbau', () => {
  it('der erste Hinweis orientiert, der letzte nennt die Syntax', () => {
    const hints = ctx().hints;
    expect(hints.length).toBeGreaterThanOrEqual(3);
    expect(hints[0].includes('`'), `erster Hinweis nennt einen Befehl: ${hints[0]}`).toBe(false);
    expect(hints[hints.length - 1].includes('`')).toBe(true);
  });

  it('bestehen setzt das Skip-Flag, ablehnen nicht', () => {
    const start = ev.choices.find((c) => c.id === 'einstufung_start')!;
    const ablehnen = ev.choices.find((c) => c.id === 'einstufung_lieber_nicht')!;
    expect(start.setsFlags).toContain('learn_foundations_proven');
    expect(ablehnen.setsFlags ?? []).not.toContain('learn_foundations_proven');
  });

  it('bietet zwei ungated Optionen — der Test ist nie eine Sackgasse', () => {
    const offen = ev.choices.filter((c) => !c.requires && !c.hidden);
    expect(offen.length).toBeGreaterThanOrEqual(2);
  });

  /**
   * `seedVfsFromScenario` materialisiert jeden in taskText/hints genannten Pfad
   * und fuellt ihn mit dem Dateinamen. Hiesse die Ergebnisdatei nach dem
   * gesuchten Konto, faende die Suche ihr eigenes Ergebnis.
   */
  it('der Name der Ergebnisdatei enthaelt nicht, wonach gesucht wird', () => {
    const ziel = '/home/timo/befund.txt';
    expect(ctx().taskText).toContain(ziel);
    expect(ziel).not.toContain('svc-backup');
    expect(ziel).not.toContain('dienste');
  });
});
