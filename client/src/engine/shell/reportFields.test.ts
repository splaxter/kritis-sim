import { describe, it, expect } from 'vitest';
import { checkReportFields } from './stateGoals';

/**
 * Der Berichts-Pruefer. Er existiert, weil ein `matches` ueber die ganze Datei
 * genau das nicht ausdruecken kann, was einen Bericht ausmacht: dass jede
 * Angabe einmal dasteht und fuer sich stimmt.
 *
 * Die Faelle hier sind die aus dem Review — jeder davon kam vorher durch oder
 * fiel faelschlich durch.
 */

describe('checkReportFields — genau eine Angabe je Schluessel', () => {
  it('nimmt einen vollstaendigen Bericht an', () => {
    const bericht = 'transfer: abgeschlossen\nclients: fehlgeschlagen\nursache: autodiscover\n';
    expect(
      checkReportFields(bericht, [
        { key: 'transfer', matches: '^abgeschlossen$' },
        { key: 'clients', matches: '^fehlgeschlagen$' },
        { key: 'ursache', matches: 'autodiscover' },
      ])
    ).toBe(true);
  });

  /** Review-Befund: „clients: fehlgeschlagen" und darunter „clients: ok". */
  it('weist einen Bericht ab, der sich selbst widerspricht', () => {
    const bericht =
      'transfer: abgeschlossen\nclients: fehlgeschlagen\nursache: autodiscover\nclients: ok\n';
    expect(
      checkReportFields(bericht, [{ key: 'clients', matches: '^fehlgeschlagen$' }]),
      'zwei Angaben zum selben Feld sind keine Angabe'
    ).toBe(false);
  });

  it('weist eine fehlende Angabe ab', () => {
    expect(checkReportFields('transfer: abgeschlossen\n', [{ key: 'clients' }])).toBe(false);
  });

  it('eine blosse Nennung ohne Bedingung genuegt, wenn sie genau einmal dasteht', () => {
    expect(checkReportFields('clients: irgendwas\n', [{ key: 'clients' }])).toBe(true);
  });

  it('der Schluessel wird ohne Ruecksicht auf Gross- und Kleinschreibung gelesen', () => {
    expect(checkReportFields('Clients: ok\n', [{ key: 'clients', matches: '^ok$' }])).toBe(true);
  });

  it('Zeilen ohne Doppelpunkt stoeren nicht', () => {
    const bericht = 'Auswertung vom 21.04.\n\nclients: ok\n-- Ende --\n';
    expect(checkReportFields(bericht, [{ key: 'clients', matches: '^ok$' }])).toBe(true);
  });
});

describe('checkReportFields — der Wert, nicht die Wortstellung', () => {
  /** Review-Befund: eine richtige Beschreibung wurde abgewiesen. */
  it('nimmt eine ausfuehrliche Ursachenbeschreibung an', () => {
    const bericht =
      'transfer: abgeschlossen\nclients: fehlgeschlagen\n' +
      'ursache: DNS-Eintrag autodiscover.warm-entsorgung.de zeigt weiterhin auf exch01.warm-entsorgung.local\n';
    expect(checkReportFields(bericht, [{ key: 'ursache', matches: '[Aa]utodiscover' }])).toBe(true);
  });

  it('prueft den Wert, nicht den Rest der Datei', () => {
    // „autodiscover" steht in einer ANDEREN Zeile — das darf das Feld nicht
    // erfuellen.
    const bericht = 'notiz: autodiscover ist ein Thema\nursache: unbekannt\n';
    expect(checkReportFields(bericht, [{ key: 'ursache', matches: 'autodiscover' }])).toBe(false);
  });

  it('absentMatches bezieht sich ebenfalls nur auf den Wert', () => {
    const bericht = 'notiz: Archiv2019 ist nicht betroffen\nbibliothek: Personal/Gehalt\n';
    expect(
      checkReportFields(bericht, [{ key: 'bibliothek', absentMatches: 'Archiv2019' }]),
      'eine richtige Feststellung woanders darf nicht sperren'
    ).toBe(true);
    expect(
      checkReportFields('bibliothek: Personal/Gehalt und Archiv2019\n', [
        { key: 'bibliothek', absentMatches: 'Archiv2019' },
      ])
    ).toBe(false);
  });
});

describe('checkReportFields — Listenwerte als ganze Eintraege', () => {
  /**
   * Review-Befund: „offen: Nachweis des Wiederherstellungstests" erfuellte
   * ZWEI Bedingungen, obwohl nur ein Befund dastand. Als Liste gelesen ist das
   * ein einziger Eintrag, der auf keinen der beiden geforderten passt.
   */
  it('ein Eintrag zaehlt nicht als zwei', () => {
    expect(
      checkReportFields('offen: Nachweis des Wiederherstellungstests\n', [
        { key: 'offen', requiredItems: ['wiederherstellungstest', 'nachweis-39'] },
      ])
    ).toBe(false);
  });

  it('nimmt die Liste an, wenn beide Eintraege wirklich dastehen', () => {
    expect(
      checkReportFields('offen: wiederherstellungstest, nachweis-39\n', [
        { key: 'offen', requiredItems: ['wiederherstellungstest', 'nachweis-39'] },
      ])
    ).toBe(true);
  });

  it('Reihenfolge und Leerzeichen sind egal', () => {
    expect(
      checkReportFields('offen:   nachweis-39 ,wiederherstellungstest  \n', [
        { key: 'offen', requiredItems: ['wiederherstellungstest', 'nachweis-39'] },
      ])
    ).toBe(true);
  });

  it('verbotene Eintraege fallen durch', () => {
    expect(
      checkReportFields('offen: wiederherstellungstest, nachweis-39, perimeter\n', [
        {
          key: 'offen',
          requiredItems: ['wiederherstellungstest'],
          forbiddenItems: ['perimeter', 'endpunktschutz'],
        },
      ])
    ).toBe(false);
  });

  it('ein Eintrag muss GANZ passen, nicht nur enthalten sein', () => {
    expect(
      checkReportFields('offen: perimeter-regelwerk\n', [
        { key: 'offen', forbiddenItems: ['perimeter'] },
      ]),
      'Teilwort ist kein Eintrag'
    ).toBe(true);
  });
});
