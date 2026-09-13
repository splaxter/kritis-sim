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

  it.each(SHELL_SZENARIEN)('%s: Hinweise eskalieren, der erste nennt keinen Befehl', (id) => {
    const hints = ctxOf(id).hints;
    expect(hints.length).toBeGreaterThanOrEqual(3);
    expect(hints[0].includes('`'), `erster Hinweis nennt einen Befehl: ${hints[0]}`).toBe(false);
    expect(hints[hints.length - 1].includes('`'), 'letzter Hinweis muss die Syntax geben').toBe(true);
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
  const offen = 'offen: Wiederherstellungstest seit 11/2024, Nachweis nach § 39 BSIG';

  const sollpfad = () => {
    const sh = shellOf(id);
    run(sh, 'cat wiederherstellung.txt');
    run(sh, 'cat nis2.txt');
    run(sh, `echo "${offen}" > ${bericht}`);
    return sh;
  };

  it('der Sollpfad loest', () => {
    expect(checkStateGoals(sollpfad(), goalsOf(id))).toBe(true);
  });

  /** Der Kern der Aufgabe: 30 von 30 erfolgreichen Laeufen belegen gar nichts. */
  it('wer nur das Sicherungsprotokoll liest, loest nicht', () => {
    const sh = shellOf(id);
    run(sh, 'cat sicherung_juni.txt');
    run(sh, `echo "alles in Ordnung, Sicherung laeuft" > ${bericht}`);
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
    run(sh, 'cat wiederherstellung.txt');
    run(sh, 'cat nis2.txt');
    run(sh, `echo "offen: Wiederherstellungstest seit 11/2024" > ${bericht}`);
    expect(checkStateGoals(sh, goalsOf(id))).toBe(false);
  });

  /** Alles aufzuzaehlen ist kein Bericht, sondern ein Abschreiben des Ordners. */
  it('den ganzen Ordner als offen zu melden loest nicht', () => {
    const sh = shellOf(id);
    run(sh, 'cat wiederherstellung.txt');
    run(sh, 'cat nis2.txt');
    run(
      sh,
      `echo "offen: Wiederherstellung, Nachweis § 39, Endpunktschutz, Perimeter" > ${bericht}`
    );
    expect(checkStateGoals(sh, goalsOf(id)), 'belegt Funktionierendes als offen').toBe(false);
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
  const richtig = 'Transfer abgeschlossen (10/10), Clients scheitern am Autodiscover-Eintrag';

  const alleLesen = (sh: ShellEngine) => {
    run(sh, 'cat migration_status.csv');
    run(sh, 'cat abnahmetest.txt');
    run(sh, 'cat dns_autodiscover.txt');
  };

  it('der Sollpfad loest', () => {
    const sh = shellOf(id);
    alleLesen(sh);
    run(sh, `echo "${richtig}" > ${befund}`);
    expect(checkStateGoals(sh, goalsOf(id))).toBe(true);
  });

  /** Wer nur die Statusliste liest, meldet einen Erfolg, den keiner merkt. */
  it('„Migration erfolgreich" allein loest nicht', () => {
    const sh = shellOf(id);
    run(sh, 'cat migration_status.csv');
    run(sh, `echo "Migration abgeschlossen, 10 von 10" > ${befund}`);
    expect(checkStateGoals(sh, goalsOf(id))).toBe(false);
  });

  /** Wer nur die Beschwerden zaehlt, rollt eine funktionierende Migration zurueck. */
  it('„Migration gescheitert" allein loest nicht', () => {
    const sh = shellOf(id);
    run(sh, 'cat abnahmetest.txt');
    run(sh, `echo "Migration gescheitert, Outlook geht nirgends" > ${befund}`);
    expect(checkStateGoals(sh, goalsOf(id))).toBe(false);
  });

  it('die richtige Ursache ohne den Transferstand loest nicht', () => {
    const sh = shellOf(id);
    alleLesen(sh);
    run(sh, `echo "Autodiscover zeigt auf den alten Server" > ${befund}`);
    expect(checkStateGoals(sh, goalsOf(id)), 'halbe Wahrheit').toBe(false);
  });

  it('ohne die Namensaufloesung gelesen zu haben loest es nicht', () => {
    const sh = shellOf(id);
    run(sh, 'cat migration_status.csv');
    run(sh, 'cat abnahmetest.txt');
    run(sh, `echo "${richtig}" > ${befund}`);
    expect(checkStateGoals(sh, goalsOf(id)), 'Ursache geraten statt belegt').toBe(false);
  });
});

describe('CLOUD365-SC-006 — Copilot und die zu weite Freigabe', () => {
  const id = 'CLOUD365-SC-006';
  const befund = '/home/timo/dsfa_befund.md';

  it('der Sollpfad loest', () => {
    const sh = shellOf(id);
    run(sh, 'cat berechtigungen.csv');
    run(sh, 'cat gruppen.csv');
    run(sh, `echo "zu weit: Personal/Gehaltsabrechnungen fuer 151 Personen lesbar" > ${befund}`);
    expect(checkStateGoals(sh, goalsOf(id))).toBe(true);
  });

  /** Der Koeder: dieselbe weite Freigabe, wo sie richtig ist. */
  it('das Projektarchiv mitzumelden loest nicht', () => {
    const sh = shellOf(id);
    run(sh, 'cat berechtigungen.csv');
    run(sh, 'cat gruppen.csv');
    run(sh, `echo "zu weit: Gehaltsabrechnungen und Archiv2019" > ${befund}`);
    expect(checkStateGoals(sh, goalsOf(id)), 'nach Muster statt nach Inhalt gesucht').toBe(false);
  });

  it('ohne die Gruppenliste gelesen zu haben loest es nicht', () => {
    const sh = shellOf(id);
    run(sh, 'cat berechtigungen.csv');
    run(sh, `echo "zu weit: Personal/Gehaltsabrechnungen" > ${befund}`);
    expect(checkStateGoals(sh, goalsOf(id)), '„alle" ohne Zahl ist keine Aussage').toBe(false);
  });

  it('die falsche Bibliothek zu melden loest nicht', () => {
    const sh = shellOf(id);
    run(sh, 'cat berechtigungen.csv');
    run(sh, 'cat gruppen.csv');
    run(sh, `echo "zu weit: Betrieb/Tourenplaene" > ${befund}`);
    expect(checkStateGoals(sh, goalsOf(id))).toBe(false);
  });
});

describe('TELEKOM-SC-001 — sporadische Ausfaelle', () => {
  const id = 'TELEKOM-SC-001';
  const meldung = '/home/timo/meldung.md';
  const richtig = 'Zeitfenster 10 bis 14 Uhr, Gateway durchgehend erreichbar';

  it('der Sollpfad loest', () => {
    const sh = shellOf(id);
    run(sh, 'grep ausfall ping_extern.csv');
    run(sh, 'cat ping_gateway.csv');
    run(sh, `echo "${richtig}" > ${meldung}`);
    expect(checkStateGoals(sh, goalsOf(id))).toBe(true);
  });

  /** Genau das Argument, mit dem die Hotline jede Meldung abraeumt. */
  it('ohne die Gegenmessung am Gateway loest es nicht', () => {
    const sh = shellOf(id);
    run(sh, 'grep ausfall ping_extern.csv');
    run(sh, `echo "${richtig}" > ${meldung}`);
    expect(checkStateGoals(sh, goalsOf(id))).toBe(false);
  });

  /** Die Messung gibt kein defektes Bauteil her. */
  it('eine erfundene Komponente loest nicht', () => {
    const sh = shellOf(id);
    run(sh, 'grep ausfall ping_extern.csv');
    run(sh, 'cat ping_gateway.csv');
    run(sh, `echo "10 bis 14 Uhr: defekter Verstärker am Verteiler" > ${meldung}`);
    expect(checkStateGoals(sh, goalsOf(id)), 'Diagnose vorweggenommen').toBe(false);
  });

  it('„geht manchmal nicht" loest nicht', () => {
    const sh = shellOf(id);
    run(sh, 'cat ping_extern.csv');
    run(sh, 'cat ping_gateway.csv');
    run(sh, `echo "Internet faellt sporadisch aus" > ${meldung}`);
    expect(checkStateGoals(sh, goalsOf(id))).toBe(false);
  });
});

describe('TELEKOM-SC-006 — Bandbreiteneinbruch', () => {
  const id = 'TELEKOM-SC-006';
  const befund = '/home/timo/befund_bandbreite.md';
  const richtig = 'gebucht 200 Mbit, Profil Business 50, gemessen 47 Mbit am Kabel';

  it('der Sollpfad loest', () => {
    const sh = shellOf(id);
    run(sh, 'cat leistungsschein.txt');
    run(sh, 'cat router_status.txt');
    run(sh, 'cat messung_kabel.csv');
    run(sh, `echo "${richtig}" > ${befund}`);
    expect(checkStateGoals(sh, goalsOf(id))).toBe(true);
  });

  /** Die WLAN-Messung streut staerker als der gesuchte Effekt. */
  it('nur mit der WLAN-Messung loest es nicht', () => {
    const sh = shellOf(id);
    run(sh, 'cat leistungsschein.txt');
    run(sh, 'cat router_status.txt');
    run(sh, 'cat messung_wlan.csv');
    run(sh, `echo "${richtig}" > ${befund}`);
    expect(checkStateGoals(sh, goalsOf(id)), 'kabelgebundene Messung fehlt').toBe(false);
  });

  it('ohne den Routerstatus loest es nicht', () => {
    const sh = shellOf(id);
    run(sh, 'cat leistungsschein.txt');
    run(sh, 'cat messung_kabel.csv');
    run(sh, `echo "${richtig}" > ${befund}`);
    expect(checkStateGoals(sh, goalsOf(id)), 'das ausgehandelte Profil ist der Kern').toBe(false);
  });

  it('„zu langsam" ohne die Zahlen loest nicht', () => {
    const sh = shellOf(id);
    run(sh, 'cat leistungsschein.txt');
    run(sh, 'cat router_status.txt');
    run(sh, 'cat messung_kabel.csv');
    run(sh, `echo "Leitung ist zu langsam, bitte pruefen" > ${befund}`);
    expect(checkStateGoals(sh, goalsOf(id))).toBe(false);
  });
});
