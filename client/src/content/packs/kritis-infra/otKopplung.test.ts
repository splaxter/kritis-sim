import { describe, it, expect } from 'vitest';
import { createShellFromContext, checkStateGoals } from '../../../engine/shell';
import { getAllScenarios } from '../index';

/**
 * KRITIS-SC-013 — „Die Kopplung ist keine Grenze".
 *
 * Der Wert des Falls liegt nicht darin, DASS er loesbar ist, sondern darin,
 * dass die drei plausiblen Irrwege wirklich scheitern. Genau das steht hier:
 * Jeder von ihnen wird gefahren und muss rot sein. Ohne diese Gegenproben
 * waere die Lehre eine Behauptung des Ergebnistextes.
 */

const szenario = () => {
  const sc = getAllScenarios().find((s) => s.id === 'KRITIS-SC-013');
  if (!sc?.terminalContext) throw new Error('KRITIS-SC-013 nicht gefunden — Test veraltet?');
  return sc.terminalContext;
};

const geloest = (zeilen: string[]): boolean => {
  const ctx = szenario();
  const shell = createShellFromContext(ctx);
  for (const z of zeilen) shell.execute(z);
  return checkStateGoals(shell, ctx.solutions![0].stateGoals!);
};

/** Einzelnes Ziel, damit die Gegenproben benennen koennen, WAS gerissen ist. */
const zielErfuellt = (zeilen: string[], index: number): boolean => {
  const ctx = szenario();
  const shell = createShellFromContext(ctx);
  for (const z of zeilen) shell.execute(z);
  return checkStateGoals(shell, [ctx.solutions![0].stateGoals![index]]);
};

const BODEN = 'sudo nft add rule inet filter forward drop';
const WEG_ZU = 'sudo nft delete rule inet filter forward handle 6';

describe('KRITIS-SC-013 — die Kopplung wird zur Grenze', () => {
  it('der angesagte Weg loest: Boden ans Ende, dann die Regel des infizierten Rechners', () => {
    expect(geloest([BODEN, WEG_ZU])).toBe(true);
  });

  it('die Reihenfolge der beiden Schritte ist egal — die Wirkung zaehlt', () => {
    expect(geloest([WEG_ZU, BODEN])).toBe(true);
  });

  it('eine eigene Sperre statt der Loeschung ist genauso richtig', () => {
    // Nicht die Formulierung wird geprueft, sondern das Urteil: Wer die
    // Ausnahme ueberstimmt statt sie zu entfernen, hat dasselbe erreicht.
    expect(geloest([
      BODEN,
      'sudo nft insert rule inet filter forward position 6 ip saddr 10.10.0.100 tcp dport 3389 drop',
    ])).toBe(true);
  });
});

describe('Die drei Irrwege scheitern wirklich', () => {
  it('zu wenig (I): nur die eine Regel loeschen — die Grundhaltung laesst den Rest durch', () => {
    expect(geloest([WEG_ZU])).toBe(false);
    // Und zwar genau daran: Das uebrige Buueronetz kommt weiterhin ins OT-Netz,
    // ohne dass es je eine Regel erlaubt haette.
    expect(zielErfuellt([WEG_ZU], 1)).toBe(false);
    expect(zielErfuellt([WEG_ZU], 2)).toBe(false); // und die Fernwartung nach draussen auch
  });

  it('zu wenig (II): nur den Boden einziehen — der infizierte Rechner hat seine eigene Regel', () => {
    expect(geloest([BODEN])).toBe(false);
    expect(zielErfuellt([BODEN], 0)).toBe(false);
    // Der Rest ist damit aber schon dicht — der Boden wirkt, er reicht nur nicht.
    expect(zielErfuellt([BODEN], 1)).toBe(true);
    expect(zielErfuellt([BODEN], 2)).toBe(true);
  });

  it('zu viel: den Boden nach OBEN setzen nimmt die Alarmierung mit', () => {
    const obenDicht = ['sudo nft insert rule inet filter forward drop', WEG_ZU];
    expect(geloest(obenDicht)).toBe(false);
    // Alles gesperrt — auch das, was die Anlage zum Melden braucht.
    expect(zielErfuellt(obenDicht, 3)).toBe(false); // Alarmweiterleitung
    expect(zielErfuellt(obenDicht, 4)).toBe(false); // Historian
  });

  it('alles plattmachen ist das Gegenteil von isolieren', () => {
    // Ohne Basiskette filtert niemand mehr: Nach `flush ruleset` kommt wieder
    // alles durch, die drei Sperrziele reissen sofort.
    expect(geloest(['sudo nft flush ruleset'])).toBe(false);
    expect(zielErfuellt(['sudo nft flush ruleset'], 0)).toBe(false);
  });
});

describe('Der Fund, den kein eingehendes Regelwerk je gesehen haette', () => {
  it('die Fernwartung geht HINAUS und kommt vorher ungehindert durch', () => {
    const ctx = szenario();
    const raus = ctx.solutions![0].stateGoals!.find(
      (g) => g.nftVerdict?.to === '203.0.113.90'
    );
    expect(raus?.nftVerdict?.expect, 'das Relay muss gesperrt werden').toBe('drop');
    // Vor der Massnahme: ungehindert — deshalb steht es ueberhaupt im Fall.
    expect(zielErfuellt([], 2)).toBe(false);
  });

  it('das Ereignisprotokoll belegt den Weg, statt ihn zu behaupten', () => {
    const journal = (szenario().journal ?? []).map((e) => e.message).join('\n');
    expect(journal).toContain('SRC=10.20.5.11 DST=203.0.113.90');
    expect(journal).toContain('DPT=443');
  });
});
