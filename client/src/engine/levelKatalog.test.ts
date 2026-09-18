import { describe, it, expect } from 'vitest';
import { levelKatalog } from './levelKatalog';
import { alleTerminalLevel } from './terminalLevelRegistry';
import { getAllScenarios } from '../content/packs';

/**
 * Der Katalog ist eine Behauptung ueber den Bestand — also wird er gegen den
 * Bestand geprueft, nicht gegen eine Zahl im Kopf.
 *
 * Die Lehre dahinter steht in CLAUDE.md: Vor dem Behaupten einer Deckung den
 * Gesamtbestand und ALLE Teilmengen namentlich abgleichen, sonst faellt ein
 * verschwundenes Element durch jede Zusicherung.
 */

const katalog = levelKatalog();

describe('Der Katalog deckt den Bestand', () => {
  it('enthaelt jedes Terminal-Level der Registry — namentlich', () => {
    const imKatalog = new Set(katalog.filter((l) => l.art !== 'gui').map((l) => l.id));
    const fehlend = alleTerminalLevel()
      .map((e) => e.id)
      .filter((id) => !imKatalog.has(id));
    expect(fehlend, 'Terminal-Level fehlt im Katalog').toEqual([]);
  });

  it('enthaelt jedes Szenario mit Aufgabe — namentlich', () => {
    const imKatalog = new Set(katalog.map((l) => l.id));
    const fehlend = getAllScenarios()
      .filter((s) => s.terminalContext || s.guiContext)
      .map((s) => s.id)
      .filter((id) => !imKatalog.has(id));
    expect(fehlend, 'Szenario mit Aufgabe fehlt im Katalog').toEqual([]);
  });

  it('erfindet nichts: jeder Eintrag traegt genau einen Kontext', () => {
    for (const l of katalog) {
      const kontexte = [l.terminalContext, l.guiContext].filter(Boolean).length;
      expect(kontexte, `${l.id} (${l.art}) hat ${kontexte} Kontexte`).toBe(1);
    }
  });

  it('jeder Eintrag laesst sich oeffnen — Art und Kontext passen zusammen', () => {
    for (const l of katalog) {
      if (l.art === 'gui') expect(l.guiContext, l.id).toBeTruthy();
      else expect(l.terminalContext, l.id).toBeTruthy();
    }
  });

  it('Eintraege sind eindeutig ueber ID und Art', () => {
    const schluessel = katalog.map((l) => `${l.id}|${l.art}`);
    expect(new Set(schluessel).size).toBe(schluessel.length);
  });
});

describe('Der Katalog sagt die Wahrheit ueber das Gewinnmodell', () => {
  it('„Zustandsziele" heisst, dass es welche gibt', () => {
    for (const l of katalog.filter((x) => x.gewinnmodell === 'zustandsziele')) {
      const ziele = (l.terminalContext?.solutions ?? []).flatMap((s) => s.stateGoals ?? []);
      expect(ziele.length, l.id).toBe(l.bedingungen);
      expect(ziele.length).toBeGreaterThan(0);
    }
  });

  it('„Befehlsmuster" heisst, dass es KEINE Zustandsziele gibt', () => {
    for (const l of katalog.filter((x) => x.gewinnmodell === 'befehlsmuster')) {
      const ziele = (l.terminalContext?.solutions ?? []).flatMap((s) => s.stateGoals ?? []);
      expect(ziele.length, l.id).toBe(0);
    }
  });

  it('der gemeldete Host-Zustand ist der tatsaechlich gesaete', () => {
    for (const l of katalog.filter((x) => x.hostZustand.length > 0)) {
      const ctx = l.terminalContext as unknown as Record<string, unknown>;
      for (const feld of l.hostZustand) {
        expect(ctx[feld], `${l.id}: ${feld} gemeldet, aber nicht gesaet`).toBeDefined();
      }
    }
  });
});

describe('Der Zugang, den der Katalog anzeigt, ist gerechnet', () => {
  it('jedes Szenario nennt Schwierigkeit und Modi', () => {
    for (const l of katalog.filter((x) => x.quelle === 'pack')) {
      expect(l.schwierigkeit, l.id).toBeGreaterThanOrEqual(1);
      expect(l.modi, l.id).toBeDefined();
      // „nirgends erreichbar" waere ein echter Befund und soll sichtbar sein,
      // nicht stillschweigend als leere Liste durchgehen.
      expect(l.modi!.length, `${l.id} ist in keinem Modus erreichbar`).toBeGreaterThan(0);
    }
  });

  it('Lernpfad-Level sind ihrem Track zugeordnet, nicht dem Sammeltopf', () => {
    const lernpfad = katalog.filter((l) => l.quelle === 'lernpfad');
    expect(lernpfad.length).toBeGreaterThan(30);
    for (const l of lernpfad) expect(l.gruppe, l.id).not.toBe('Ereignisse');
  });
});
