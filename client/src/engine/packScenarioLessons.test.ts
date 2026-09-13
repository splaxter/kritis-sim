import { describe, it, expect } from 'vitest';
import { Scenario, TerminalContext } from '@kritis/shared';
import { getScenarioById } from '../content/packs';
import { createShellFromContext, checkStateGoals } from './shell';
import { ShellEngine } from './shell/ShellEngine';

/**
 * Durchstich durch die praktischen Shell-Aufgaben der Anbieter-Packs mit der
 * ECHTEN Shell: fuer jede Aufgabe den Sollpfad fahren und die authored
 * stateGoals pruefen, dazu die Fehlwege.
 *
 * Ein Lerninhalt, der sich nicht loesen laesst, ist schlimmer als keiner — und
 * einer, der sich auch falsch loesen laesst, bringt das Falsche bei. Die
 * Negativtests sind hier deshalb wichtiger als die Positivtests.
 */

const szenario = (id: string): Scenario => {
  const s = getScenarioById(id);
  if (!s) throw new Error(`Szenario ${id} nicht in der Registry`);
  return s;
};
const ctxOf = (id: string): TerminalContext => {
  const c = szenario(id).terminalContext;
  if (!c) throw new Error(`Szenario ${id} hat keinen terminalContext`);
  return c;
};
const goalsOf = (id: string) => {
  const g = ctxOf(id).solutions[0].stateGoals;
  if (!g) throw new Error(`Szenario ${id} hat keine stateGoals`);
  return g;
};
const shellOf = (id: string): ShellEngine => createShellFromContext(ctxOf(id));

const run = (shell: ShellEngine, cmd: string) => {
  const r = shell.execute(cmd);
  expect(shell.hasPendingInput(), `unerwartete Eingabeaufforderung nach "${cmd}"`).toBe(false);
  return r;
};

/** Alle Szenarien, die in diesem Zug eine praktische Shell-Aufgabe bekommen. */
const SHELL_SZENARIEN = [
  'INTERN-SC-003',
  'CLOUD365-SC-002',
  'CLOUD365-SC-006',
  'TELEKOM-SC-001',
  'TELEKOM-SC-006',
];

describe('Gemeinsame Vertraege aller praktischen Shell-Aufgaben', () => {
  it.each(SHELL_SZENARIEN)('%s: unmittelbar nach dem Start ist nichts geloest', (id) => {
    // Die Falle aus dem Kataster-Bau: seedVfsFromScenario materialisiert jeden
    // in taskText/hints genannten Pfad und fuellt ihn mit dem Dateinamen. Ein
    // Inhaltsziel, das der Platzhalter schon erfuellt, waere ein Level, das
    // beim Oeffnen gewonnen ist.
    expect(checkStateGoals(shellOf(id), goalsOf(id))).toBe(false);
  });

  it.each(SHELL_SZENARIEN)('%s: genau eine Option oeffnet die Shell', (id) => {
    const oeffnend = szenario(id).choices.filter((c) => c.terminalCommand);
    expect(oeffnend.length).toBe(1);
  });

  it.each(SHELL_SZENARIEN)('%s: es bleiben mindestens zwei Optionen ohne Aufgabe', (id) => {
    const andere = szenario(id).choices.filter((c) => !c.terminalCommand && !c.guiCommand);
    expect(andere.length).toBeGreaterThanOrEqual(2);
  });

  /**
   * Das Berichtsschema muss im AUFTRAG stehen. Eine Bewertung, deren Regeln der
   * Spieler nicht kennt, ist keine Pruefung, sondern Raten — und genau daran
   * scheiterte die erste Fassung: sie wies richtige Befunde ab und nahm falsche
   * an, weil sie Woerter im Fliesstext suchte.
   */
  it.each(SHELL_SZENARIEN)('%s: jedes geprüfte Berichtsfeld ist im Auftrag angesagt', (id) => {
    const auftrag = ctxOf(id).taskText ?? '';
    let geprueft = 0;
    for (const goal of goalsOf(id)) {
      for (const feld of (goal as { reportFields?: { key: string }[] }).reportFields ?? []) {
        geprueft++;
        expect(auftrag, `Feld "${feld.key}" wird geprueft, steht aber nicht im Auftrag`)
          .toContain(`${feld.key}:`);
      }
    }
    expect(geprueft, 'kein einziges Berichtsfeld — prueft dieses Level ueberhaupt etwas?')
      .toBeGreaterThan(0);
  });

  /**
   * Ein Bericht ist erst einer, wenn jede Angabe GENAU EINMAL dasteht. Die
   * Regex-Fassung konnte das nicht ausdruecken, also bestand ein Bericht, der
   * „clients: fehlgeschlagen" sagte und zwei Zeilen spaeter „clients: ok".
   */
  it.each(SHELL_SZENARIEN)('%s: ein widersprüchlicher Bericht löst nicht', (id) => {
    const felder = goalsOf(id).flatMap(
      (g) => (g as { file?: string; reportFields?: { key: string }[] }).reportFields
        ?.map((f) => ({ key: f.key, file: (g as { file: string }).file })) ?? []
    );
    expect(felder.length).toBeGreaterThan(0);

    const sh = shellOf(id);
    for (const befehl of ctxOf(id).hints.flatMap((h) =>
      [...h.matchAll(/`([^`]+)`/g)].map((m) => m[1])
    ).filter((c) => /\s/.test(c.trim()))) {
      run(sh, befehl);
    }
    expect(checkStateGoals(sh, goalsOf(id)), 'Vorbedingung: der Sollweg loest').toBe(true);

    // Eine zweite, widersprechende Angabe zum ERSTEN Feld anhaengen.
    const f = felder[0];
    run(sh, `echo "${f.key}: nachtraeglich-etwas-anderes" >> ${f.file}`);
    expect(
      checkStateGoals(sh, goalsOf(id)),
      `zwei Angaben zu "${f.key}" gelten weiterhin als eine`
    ).toBe(false);
  });

  it.each(SHELL_SZENARIEN)('%s: Hinweise eskalieren, der erste nennt keinen Befehl', (id) => {
    const hints = ctxOf(id).hints;
    expect(hints.length).toBeGreaterThanOrEqual(3);
    expect(hints[0].includes('`'), `erster Hinweis nennt einen Befehl: ${hints[0]}`).toBe(false);
    expect(hints[hints.length - 1].includes('`'), 'letzter Hinweis muss die Syntax geben').toBe(true);
  });

  /**
   * Die Hinweiskette muss ein FUNKTIONIERENDER Weg sein, kein gut gemeinter.
   *
   * Anlass: Die erste Fassung riet zu `printf 'a\\nb\\n' > datei`. Diese Shell
   * interpretiert `\\n` in printf aber NICHT — heraus kam eine einzige Zeile
   * „anzahl: 9nzeitfenster: 10-14n", und wer dem letzten Hinweis folgte, konnte
   * das Level nicht loesen. Ein Hinweis, der nicht funktioniert, ist schlimmer
   * als keiner: der Spieler sucht den Fehler bei sich.
   */
  it.each(SHELL_SZENARIEN)('%s: die Hinweise sind zusammen ein loesbarer Weg', (id) => {
    const sh = shellOf(id);
    const befehle = ctxOf(id)
      .hints.flatMap((h) => [...h.matchAll(/`([^`]+)`/g)].map((m) => m[1]))
      // Hinweise erklaeren gelegentlich einen Operator (`>`), das ist kein Befehl.
      .filter((c) => /\s/.test(c.trim()));
    expect(befehle.length, 'kein einziger Befehl in den Hinweisen').toBeGreaterThan(0);
    for (const befehl of befehle) run(sh, befehl);
    expect(
      checkStateGoals(sh, goalsOf(id)),
      `wer den Hinweisen folgt, loest nicht:\n  ${befehle.join('\n  ')}`
    ).toBe(true);
  });

  it.each(SHELL_SZENARIEN)('%s: kein Inhaltsziel wird vom Platzhalter erfuellt', (id) => {
    for (const goal of goalsOf(id)) {
      const g = goal as { file?: string; matches?: string };
      if (!g.file || !g.matches) continue;
      const name = g.file.split('/').pop()!;
      expect(
        new RegExp(g.matches).test(name),
        `${g.file}: der Dateiname erfuellt sein eigenes Inhaltsziel`
      ).toBe(false);
    }
  });
});

describe('INTERN-SC-003 — Statusbericht fuer den Aufsichtsrat', () => {
  const id = 'INTERN-SC-003';
  const bericht = '/home/timo/statusbericht.md';
  const offen = 'offen: wiederherstellungstest, nachweis-39';

  const lesen = (sh: ShellEngine) => {
    run(sh, 'cat wiederherstellung.txt');
    run(sh, 'cat nis2.txt');
  };

  it('der Sollpfad loest', () => {
    const sh = shellOf(id);
    lesen(sh);
    run(sh, `echo "${offen}" > ${bericht}`);
    expect(checkStateGoals(sh, goalsOf(id))).toBe(true);
  });

  /**
   * DER Befund aus dem Review: „offen: Nachweis des Wiederherstellungstests"
   * enthaelt beide Suchwoerter und galt damit als ZWEI Befunde — obwohl der
   * § 39-Nachweis gar nicht vorkam. Als Liste gelesen ist das ein einziger
   * Eintrag, der auf keinen der beiden geforderten passt.
   */
  it('ein Befund zaehlt nicht als zwei', () => {
    const sh = shellOf(id);
    lesen(sh);
    run(sh, `echo "offen: Nachweis des Wiederherstellungstests" > ${bericht}`);
    expect(checkStateGoals(sh, goalsOf(id)), 'ein Eintrag, zwei Bedingungen').toBe(false);
  });

  /** Der Kern der Aufgabe: 30 von 30 erfolgreichen Laeufen belegen gar nichts. */
  it('wer nur das Sicherungsprotokoll liest, loest nicht', () => {
    const sh = shellOf(id);
    run(sh, 'cat sicherung_juni.txt');
    run(sh, `echo "offen: keine" > ${bericht}`);
    expect(checkStateGoals(sh, goalsOf(id)), 'Sicherungsbilanz ist kein Nachweis').toBe(false);
  });

  it('ohne den Wiederherstellungsnachweis gelesen zu haben loest es nicht', () => {
    const sh = shellOf(id);
    run(sh, 'cat nis2.txt');
    run(sh, `echo "${offen}" > ${bericht}`);
    expect(checkStateGoals(sh, goalsOf(id)), 'Behauptung ohne Quelle').toBe(false);
  });

  it('den Nachweis nach § 39 zu vergessen loest nicht', () => {
    const sh = shellOf(id);
    lesen(sh);
    run(sh, `echo "offen: wiederherstellungstest" > ${bericht}`);
    expect(checkStateGoals(sh, goalsOf(id))).toBe(false);
  });

  /** Alles aufzuzaehlen ist kein Bericht, sondern ein Abschreiben des Ordners. */
  it('den ganzen Ordner als offen zu melden loest nicht', () => {
    const sh = shellOf(id);
    lesen(sh);
    run(
      sh,
      `echo "offen: wiederherstellungstest, nachweis-39, endpunktschutz, perimeter" > ${bericht}`
    );
    expect(checkStateGoals(sh, goalsOf(id)), 'belegt Funktionierendes als offen').toBe(false);
  });

  /**
   * Gegenprobe zur Gegenprobe: Belegtes zu ERWAEHNEN ist richtig und darf den
   * Abschluss nicht verhindern. Die Sperre gilt fuer EINTRAEGE der offen-Liste,
   * nicht fuer die Datei.
   */
  it('Funktionierendes ausserhalb der offen-Liste zu nennen ist erlaubt', () => {
    const sh = shellOf(id);
    lesen(sh);
    run(sh, `echo "${offen}" > ${bericht}`);
    run(sh, `echo "belegt: endpunktschutz, perimeter" >> ${bericht}`);
    expect(checkStateGoals(sh, goalsOf(id))).toBe(true);
  });

  it('auch grep statt cat zaehlt als gelesen — der Weg ist frei', () => {
    // fileRead wird an der VFS-Grenze aufgezeichnet, nicht am Kommandonamen.
    const sh = shellOf(id);
    run(sh, 'grep -i wiederherstellungstest wiederherstellung.txt');
    run(sh, 'grep -n "39" nis2.txt');
    run(sh, `echo "${offen}" > ${bericht}`);
    expect(checkStateGoals(sh, goalsOf(id))).toBe(true);
  });
});

describe('CLOUD365-SC-002 — Migrationstag', () => {
  const id = 'CLOUD365-SC-002';
  const befund = '/home/timo/befund.md';

  /** Schreibt den Bericht im angesagten Schema. */
  const schreibe = (sh: ShellEngine, transfer: string, clients: string, ursache: string) => {
    run(sh, `echo "transfer: ${transfer}" > ${befund}`);
    run(sh, `echo "clients: ${clients}" >> ${befund}`);
    run(sh, `echo "ursache: ${ursache}" >> ${befund}`);
  };

  const alleLesen = (sh: ShellEngine) => {
    run(sh, 'cat migration_status.csv');
    run(sh, 'cat abnahmetest.txt');
    run(sh, 'cat dns_autodiscover.txt');
  };

  it('der Sollpfad loest', () => {
    const sh = shellOf(id);
    alleLesen(sh);
    schreibe(sh, 'abgeschlossen', 'fehlgeschlagen', 'autodiscover');
    expect(checkStateGoals(sh, goalsOf(id))).toBe(true);
  });

  /**
   * DER Befund aus dem Review: Die alte Wortsuche nahm einen Bericht an, der
   * den Vorfall ausdruecklich verneinte — er enthielt zufaellig
   * „abgeschlossen" und „Autodiscover". Mit benannten Zeilen geht das nicht
   * mehr durch.
   */
  it('ein Bericht, der den Vorfall verneint, loest nicht', () => {
    const sh = shellOf(id);
    alleLesen(sh);
    run(
      sh,
      `echo "Transfer abgeschlossen, Autodiscover korrekt. Alle Outlook-Tests bestanden; keine offenen Probleme." > ${befund}`
    );
    expect(checkStateGoals(sh, goalsOf(id)), 'Fliesstext mit den richtigen Woertern').toBe(false);
  });

  /**
   * Review-Befund: Die Ursache durfte nur buchstabiert, nicht beschrieben
   * werden — „ursache: DNS-Eintrag autodiscover.… zeigt auf exch01.…" fiel
   * durch, weil die Pruefung „Autodiscover" als erstes Wort verlangte. Der
   * Auftrag verlangt das nirgends.
   */
  it('eine ausfuehrliche Ursachenbeschreibung loest', () => {
    const sh = shellOf(id);
    alleLesen(sh);
    schreibe(
      sh,
      'abgeschlossen',
      'fehlgeschlagen',
      'DNS-Eintrag autodiscover.warm-entsorgung.de zeigt weiterhin auf exch01.warm-entsorgung.local'
    );
    expect(checkStateGoals(sh, goalsOf(id))).toBe(true);
  });

  /** Review-Befund: nachtraeglich widersprochen, trotzdem geloest. */
  it('ein nachtraeglicher Widerspruch nimmt die Loesung zurueck', () => {
    const sh = shellOf(id);
    alleLesen(sh);
    schreibe(sh, 'abgeschlossen', 'fehlgeschlagen', 'autodiscover');
    expect(checkStateGoals(sh, goalsOf(id)), 'Vorbedingung').toBe(true);
    run(sh, `echo "clients: ok" >> ${befund}`);
    expect(checkStateGoals(sh, goalsOf(id)), 'zwei Angaben zu clients').toBe(false);
  });

  it('„clients: ok" loest nicht', () => {
    const sh = shellOf(id);
    alleLesen(sh);
    schreibe(sh, 'abgeschlossen', 'ok', 'autodiscover');
    expect(checkStateGoals(sh, goalsOf(id))).toBe(false);
  });

  /** Wer nur die Beschwerden zaehlt, rollt eine funktionierende Migration zurueck. */
  it('den Transfer fuer gescheitert zu erklaeren loest nicht', () => {
    const sh = shellOf(id);
    alleLesen(sh);
    schreibe(sh, 'unvollstaendig', 'fehlgeschlagen', 'autodiscover');
    expect(checkStateGoals(sh, goalsOf(id))).toBe(false);
  });

  it('ohne die Namensaufloesung gelesen zu haben loest es nicht', () => {
    const sh = shellOf(id);
    run(sh, 'cat migration_status.csv');
    run(sh, 'cat abnahmetest.txt');
    schreibe(sh, 'abgeschlossen', 'fehlgeschlagen', 'autodiscover');
    expect(checkStateGoals(sh, goalsOf(id)), 'Ursache geraten statt belegt').toBe(false);
  });
});

describe('CLOUD365-SC-006 — Copilot und die zu weite Freigabe', () => {
  const id = 'CLOUD365-SC-006';
  const befund = '/home/timo/dsfa_befund.md';

  const lesen = (sh: ShellEngine) => {
    run(sh, 'cat berechtigungen.csv');
    run(sh, 'cat gruppen.csv');
  };
  const schreibe = (sh: ShellEngine, bibliothek: string, betroffene: string) => {
    run(sh, `echo "bibliothek: ${bibliothek}" > ${befund}`);
    run(sh, `echo "betroffene: ${betroffene}" >> ${befund}`);
  };

  it('der Sollpfad loest', () => {
    const sh = shellOf(id);
    lesen(sh);
    schreibe(sh, 'Personal/Gehaltsabrechnungen', '151');
    expect(checkStateGoals(sh, goalsOf(id))).toBe(true);
  });

  /**
   * Befund aus dem Review: Die Sperre lag auf der GANZEN Datei, also verhinderte
   * ausgerechnet die richtige Feststellung „Archiv2019 ist nicht betroffen" den
   * Abschluss. Sie haengt jetzt an der bibliothek-Zeile.
   */
  it('Archiv2019 ausserhalb der bibliothek-Zeile zu erwaehnen ist erlaubt', () => {
    const sh = shellOf(id);
    lesen(sh);
    schreibe(sh, 'Personal/Gehaltsabrechnungen', '151');
    run(sh, `echo "geprueft und nicht betroffen: Projekte/Archiv2019" >> ${befund}`);
    expect(checkStateGoals(sh, goalsOf(id))).toBe(true);
  });

  /** Der Koeder: dieselbe weite Freigabe, wo sie richtig ist. */
  it('das Projektarchiv als Befund zu melden loest nicht', () => {
    const sh = shellOf(id);
    lesen(sh);
    schreibe(sh, 'Personal/Gehaltsabrechnungen und Projekte/Archiv2019', '151');
    expect(checkStateGoals(sh, goalsOf(id)), 'nach Muster statt nach Inhalt gesucht').toBe(false);
  });

  it('die Bibliothek darf beschrieben statt buchstabiert werden', () => {
    const sh = shellOf(id);
    lesen(sh);
    schreibe(sh, 'Standort Personal, Bibliothek Gehaltsabrechnungen', '151 Personen');
    expect(checkStateGoals(sh, goalsOf(id))).toBe(true);
  });

  it('ohne die Zahl der Betroffenen loest es nicht', () => {
    const sh = shellOf(id);
    lesen(sh);
    run(sh, `echo "bibliothek: Personal/Gehaltsabrechnungen" > ${befund}`);
    expect(checkStateGoals(sh, goalsOf(id)), '„alle" ohne Zahl ist keine Aussage').toBe(false);
  });

  it('ohne die Gruppenliste gelesen zu haben loest es nicht', () => {
    const sh = shellOf(id);
    run(sh, 'cat berechtigungen.csv');
    schreibe(sh, 'Personal/Gehaltsabrechnungen', '151');
    expect(checkStateGoals(sh, goalsOf(id))).toBe(false);
  });

  it('die falsche Bibliothek zu melden loest nicht', () => {
    const sh = shellOf(id);
    lesen(sh);
    schreibe(sh, 'Betrieb/Tourenplaene', '151');
    expect(checkStateGoals(sh, goalsOf(id))).toBe(false);
  });
});

describe('TELEKOM-SC-001 — sporadische Ausfaelle', () => {
  const id = 'TELEKOM-SC-001';
  const meldung = '/home/timo/meldung.md';

  const lesen = (sh: ShellEngine) => {
    run(sh, 'grep ausfall ping_extern.csv');
    run(sh, 'cat ping_gateway.csv');
  };
  const schreibe = (sh: ShellEngine, anzahl: string, fenster: string, lokal: string, ursache: string) => {
    run(sh, `echo "anzahl: ${anzahl}" > ${meldung}`);
    run(sh, `echo "zeitfenster: ${fenster}" >> ${meldung}`);
    run(sh, `echo "lokal: ${lokal}" >> ${meldung}`);
    run(sh, `echo "ursache: ${ursache}" >> ${meldung}`);
  };

  it('der Sollpfad loest', () => {
    const sh = shellOf(id);
    lesen(sh);
    schreibe(sh, '9', '10-14', 'erreichbar', 'unbekannt');
    expect(checkStateGoals(sh, goalsOf(id))).toBe(true);
  });

  /**
   * Befund aus dem Review: Die genau gemessene Spanne wurde abgewiesen, weil die
   * alte Pruefung stumpf nach „14" suchte. Beide Schreibweisen sind richtig.
   */
  it.each([
    ['volle Stunden', '10-14'],
    ['mit "bis"', '10 bis 14'],
    ['die gemessene Spanne', '10:04-13:58'],
    ['mit Gedankenstrich', '10:04–13:58'],
  ])('das Zeitfenster als %s loest', (_l, fenster) => {
    const sh = shellOf(id);
    lesen(sh);
    schreibe(sh, '9', fenster, 'erreichbar', 'unbekannt');
    expect(checkStateGoals(sh, goalsOf(id))).toBe(true);
  });

  /**
   * Review-Befund: zu enge Fenster gingen durch. Die Ausfaelle laufen von
   * 10:04 bis 13:58 — ein Fenster, das um 13 Uhr endet, deckt den letzten
   * Ausfall nicht ab, und „10:59-13:00" deckt nicht einmal den ersten.
   */
  it.each([
    ['zu frueh beendet', '10-13'],
    ['weder Anfang noch Ende', '10:59-13:00'],
    ['nur eine Stunde', '11-12'],
    ['rueckwaerts', '14-10'],
  ])('ein falsches Zeitfenster (%s) loest nicht', (_l, fenster) => {
    const sh = shellOf(id);
    lesen(sh);
    schreibe(sh, '9', fenster, 'erreichbar', 'unbekannt');
    expect(checkStateGoals(sh, goalsOf(id))).toBe(false);
  });

  it('eine falsche Zahl loest nicht', () => {
    const sh = shellOf(id);
    lesen(sh);
    schreibe(sh, '13', '10-14', 'erreichbar', 'unbekannt');
    expect(checkStateGoals(sh, goalsOf(id))).toBe(false);
  });

  /** Genau das Argument, mit dem die Hotline jede Meldung abraeumt. */
  it('ohne die Gegenmessung am Gateway loest es nicht', () => {
    const sh = shellOf(id);
    run(sh, 'grep ausfall ping_extern.csv');
    schreibe(sh, '9', '10-14', 'erreichbar', 'unbekannt');
    expect(checkStateGoals(sh, goalsOf(id))).toBe(false);
  });

  /** Der Kern: die Messung gibt kein defektes Bauteil her. */
  it('eine erfundene Komponente als Ursache loest nicht', () => {
    const sh = shellOf(id);
    lesen(sh);
    schreibe(sh, '9', '10-14', 'erreichbar', 'defekter Verstaerker am Verteiler');
    expect(checkStateGoals(sh, goalsOf(id)), 'Diagnose vorweggenommen').toBe(false);
  });

  it('„geht manchmal nicht" loest nicht', () => {
    const sh = shellOf(id);
    lesen(sh);
    run(sh, `echo "Internet faellt sporadisch aus" > ${meldung}`);
    expect(checkStateGoals(sh, goalsOf(id))).toBe(false);
  });

  /** Die Messdaten muessen die Erzaehlung decken (Review-Befund 3). */
  it('die Erzaehlung deckt sich mit der Messreihe', () => {
    const csv = ctxOf(id).vfsOverlay!.files!.find((f) => f.path.endsWith('ping_extern.csv'))!.content;
    const ausfallZeilen = csv.split('\n').filter((z) => z.includes('ausfall'));
    expect(ausfallZeilen.length, 'neun Messrunden mit Ausfall').toBe(9);
    // Jede Ausfallzeile fuehrt ALLE drei Ziele als ausgefallen.
    for (const z of ausfallZeilen) {
      expect(z.split(';').filter((f) => f.trim() === 'ausfall').length, z).toBe(3);
    }
    expect(ctxOf(id).solutions[0].resultText).toMatch(/[Nn]eun Ausfälle/);
    expect(ctxOf(id).solutions[0].resultText).toMatch(/10:04/);
    expect(ctxOf(id).solutions[0].resultText).toMatch(/13:58/);
  });
});

describe('TELEKOM-SC-006 — Bandbreiteneinbruch', () => {
  const id = 'TELEKOM-SC-006';
  const befund = '/home/timo/befund_bandbreite.md';

  const lesen = (sh: ShellEngine) => {
    run(sh, 'cat leistungsschein.txt');
    run(sh, 'cat router_status.txt');
    run(sh, 'cat messung_kabel.csv');
  };
  const schreibe = (sh: ShellEngine, gebucht: string, profil: string, gemessen: string) => {
    run(sh, `echo "gebucht: ${gebucht}" > ${befund}`);
    run(sh, `echo "profil: ${profil}" >> ${befund}`);
    run(sh, `echo "gemessen: ${gemessen}" >> ${befund}`);
  };

  it('der Sollpfad loest', () => {
    const sh = shellOf(id);
    lesen(sh);
    schreibe(sh, '200', 'Business 50', '47');
    expect(checkStateGoals(sh, goalsOf(id))).toBe(true);
  });

  it.each([
    ['Profil als blosse Zahl', '50', '47'],
    ['Sync-Wert statt Profilname', '52', '47'],
    ['gerundet nach unten', 'Business 50', '46'],
    ['mit Nachkommastelle', 'Business 50', '47.2'],
  ])('%s loest ebenfalls', (_l, profil, gemessen) => {
    const sh = shellOf(id);
    lesen(sh);
    schreibe(sh, '200', profil, gemessen);
    expect(checkStateGoals(sh, goalsOf(id))).toBe(true);
  });

  /** Die WLAN-Messung streut staerker als der gesuchte Effekt. */
  it('nur mit der WLAN-Messung loest es nicht', () => {
    const sh = shellOf(id);
    run(sh, 'cat leistungsschein.txt');
    run(sh, 'cat router_status.txt');
    run(sh, 'cat messung_wlan.csv');
    schreibe(sh, '200', 'Business 50', '47');
    expect(checkStateGoals(sh, goalsOf(id)), 'kabelgebundene Messung fehlt').toBe(false);
  });

  it('ein WLAN-Wert als Messergebnis loest nicht', () => {
    const sh = shellOf(id);
    lesen(sh);
    schreibe(sh, '200', 'Business 50', '18.4');
    expect(checkStateGoals(sh, goalsOf(id))).toBe(false);
  });

  it('ohne den Routerstatus loest es nicht', () => {
    const sh = shellOf(id);
    run(sh, 'cat leistungsschein.txt');
    run(sh, 'cat messung_kabel.csv');
    schreibe(sh, '200', 'Business 50', '47');
    expect(checkStateGoals(sh, goalsOf(id)), 'das ausgehandelte Profil ist der Kern').toBe(false);
  });

  it('„zu langsam" ohne die Zahlen loest nicht', () => {
    const sh = shellOf(id);
    lesen(sh);
    run(sh, `echo "Leitung ist zu langsam, bitte pruefen" > ${befund}`);
    expect(checkStateGoals(sh, goalsOf(id))).toBe(false);
  });
});
