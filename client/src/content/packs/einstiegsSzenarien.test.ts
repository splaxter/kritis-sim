import { describe, it, expect } from 'vitest';
import { Scenario, GuiContext } from '@kritis/shared';
import { getScenarioById } from './index';
import { findMetGuiSolution } from '../../components/WindowsLevel/guiSolution';

/**
 * Guards fuer die praktischen Szenario-Aufgaben.
 *
 * Diese Szenarien sind die ersten ueberhaupt, die `guiCommand` benutzen — die
 * Verdrahtung (App.tsx -> useGame.openScenarioTerminal -> GameScreen) existiert
 * seit langem, ist im Szenario-Pfad aber noch nie gelaufen. Deshalb pruefen die
 * Tests hier nicht nur den Inhalt, sondern auch, dass die Daten die Form haben,
 * die dieser Pfad voraussetzt.
 *
 * Wichtiger als jede Positivprobe sind die GEGENPROBEN: eine Aufgabe, die auch
 * bei der falschen Handlung loest, bringt einem Einsteiger genau nichts bei.
 */

const EINSTIEG = ['INTERN-SC-011', 'CLOUD365-SC-007', 'TELEKOM-SC-007'];

/** Alle Szenarien mit praktischer GUI-Aufgabe — Einstieg plus Ausbauten. */
const GUI_SZENARIEN = [...EINSTIEG, 'INTERN-SC-004'];

const szenario = (id: string): Scenario => {
  const s = getScenarioById(id);
  if (!s) throw new Error(`Szenario ${id} nicht in der Registry`);
  return s;
};
const gui = (id: string): GuiContext => {
  const c = szenario(id).guiContext;
  if (!c) throw new Error(`Szenario ${id} hat keinen guiContext`);
  return c;
};

describe('Einstiegsszenarien — der Rahmen', () => {
  it.each(EINSTIEG)('%s hat Schwierigkeit 1 und ist damit unter dem bisherigen Boden', (id) => {
    // Das war der Befund aus TECHNICAL_DEBT: alle 42 Szenarien lagen auf 2-5.
    expect(szenario(id).difficulty).toBe(1);
  });

  it('die drei verteilen sich auf die drei bisher passiven Packs', () => {
    const packs = EINSTIEG.map((id) => id.split('-SC-')[0]);
    expect(new Set(packs).size, 'zwei Einstiegsfaelle im selben Pack').toBe(3);
  });

  it.each(EINSTIEG)('%s ist ohne Shell-Vorwissen loesbar (GUI, kein Terminal)', (id) => {
    const s = szenario(id);
    expect(s.guiContext, 'Einstieg muss GUI sein').toBeDefined();
    expect(s.terminalContext, 'ein Einsteiger hat noch keine Shell gesehen').toBeUndefined();
  });

  /**
   * Gemessener Befund, kein Geschmacksurteil: Ohne dieses Gate landeten die
   * drei in Woche 1 jedes KRITIS-Laufs (Frueh-Cap ist ueberall 2) und
   * vergroesserten den Frueh-Pool von 9 auf 12 Szenarien. Der KRITIS-Verlauf
   * verschob sich dadurch so weit, dass `kritisLatePacing` in Woche 23 auf
   * leere Tage lief: 0 tote Tage auf main, 32 von 200 Laeufen mit ihnen im
   * Pool, wieder 0 ohne sie.
   */
  it.each(EINSTIEG)('%s laeuft nur in Einsteiger und Standard, nicht in KRITIS', (id) => {
    const modi = szenario(id).requiredModes;
    expect(modi, 'ohne Gate landet der Fall in jedem Modus').toBeDefined();
    expect(modi).toContain('beginner');
    expect(modi).not.toContain('kritis');
  });

  it.each(EINSTIEG)('%s stellt keine Zugangsvoraussetzung', (id) => {
    for (const choice of szenario(id).choices) {
      expect(choice.requiresSkill, 'ein Einstiegsfall darf nichts voraussetzen').toBeUndefined();
    }
  });
});

describe('Praktische GUI-Szenarien — Form, die der Szenario-Pfad voraussetzt', () => {
  it.each(GUI_SZENARIEN)('%s: genau eine Option oeffnet die Aufgabe', (id) => {
    const oeffnend = szenario(id).choices.filter((c) => c.guiCommand);
    expect(oeffnend.length, 'ohne guiCommand wird der guiContext nie geoeffnet').toBe(1);
  });

  it.each(GUI_SZENARIEN)('%s: es gibt mindestens zwei Optionen ohne praktische Aufgabe', (id) => {
    // Abgeben und Nachfragen muessen moeglich bleiben — sonst ist der Fall ein
    // Zwang, kein Angebot.
    const andere = szenario(id).choices.filter((c) => !c.guiCommand && !c.terminalCommand);
    expect(andere.length).toBeGreaterThanOrEqual(2);
  });

  it.each(GUI_SZENARIEN)('%s: die Alternativen behaupten keinen eigenen praktischen Abschluss', (id) => {
    const s = szenario(id);
    const praktisch = s.choices.find((c) => c.guiCommand)!;
    for (const andere of s.choices.filter((c) => c !== praktisch)) {
      // Keine Alternative darf das Ergebnis der Aufgabe vorwegnehmen: sie darf
      // erzaehlen, dass jemand ANDERES es erledigt hat, aber nicht so tun, als
      // haette der Spieler selbst gehandelt.
      expect(andere.outcome, 'nur der eigene Weg ist PERFECT').not.toBe('PERFECT');
    }
  });

  it.each(GUI_SZENARIEN)('%s: der Seed-Zustand passt zur App', (id) => {
    const c = gui(id);
    const feld: Record<string, unknown> = {
      taskmanager: c.state.taskManager,
      uac: c.state.uac,
      explorer: c.state.explorer,
      eventviewer: c.state.eventViewer,
    };
    expect(feld[c.app], `state.${c.app} fehlt`).toBeDefined();
  });

  it.each(GUI_SZENARIEN)('%s: Hinweise eskalieren, der erste verraet die Handlung nicht', (id) => {
    const hints = gui(id).hints;
    expect(hints.length).toBeGreaterThanOrEqual(3);
    // Der letzte Hinweis nennt die konkrete Handlung, der erste orientiert nur.
    expect(hints[hints.length - 1].length).toBeGreaterThan(hints[0].length / 2);
    for (const sol of gui(id).solutions) {
      for (const token of sol.interactions) {
        expect(hints[0], `erster Hinweis enthaelt den Loesungstoken ${token}`).not.toContain(token);
      }
    }
  });

  it.each(GUI_SZENARIEN)('%s: nichts ist ohne Interaktion geloest', (id) => {
    expect(findMetGuiSolution(gui(id).solutions, [])).toBeNull();
  });
});

describe('INTERN-SC-011 — der haltende Prozess', () => {
  const sols = () => gui('INTERN-SC-011').solutions;

  it('den richtigen Prozess zu beenden loest', () => {
    const met = findMetGuiSolution(sols(), ['select:Tourenplanung.exe', 'endtask:Tourenplanung.exe']);
    expect(met).not.toBeNull();
    expect(met!.resultText).toMatch(/keine Rückmeldung/i);
  });

  it('bloss auszuwaehlen loest nicht', () => {
    expect(findMetGuiSolution(sols(), ['select:Tourenplanung.exe'])).toBeNull();
  });

  /** Der Kern des Levels: die groesste Zahl ist nicht der Schuldige. */
  it('den Sicherungslauf zu beenden loest nicht', () => {
    expect(
      findMetGuiSolution(sols(), ['select:veeam-agent.exe', 'endtask:veeam-agent.exe'])
    ).toBeNull();
  });

  it('wer zuerst das Backup abschiesst, bekommt die schlechtere Fassung', () => {
    const met = findMetGuiSolution(sols(), [
      'endtask:veeam-agent.exe',
      'endtask:Tourenplanung.exe',
    ]);
    expect(met).not.toBeNull();
    expect(met!.setsFlags).toContain('onb_backup_abgebrochen');
    // Und sie ist wirklich schlechter, nicht nur anders formuliert.
    const sauber = findMetGuiSolution(sols(), ['endtask:Tourenplanung.exe'])!;
    expect(met!.skillGain.windows!).toBeLessThan(sauber.skillGain.windows!);
  });

  it('der saubere Weg kommt nicht versehentlich an der Falle vorbei', () => {
    // Risiko vor Lob: die Falle steht VOR der sauberen Loesung, sonst gaebe die
    // erste Treffer-Regel dem Backup-Killer den vollen Erfolgstext.
    const s = sols();
    expect(s[0].interactions).toContain('endtask:veeam-agent.exe');
    expect(s[s.length - 1].interactions).toEqual(['endtask:Tourenplanung.exe']);
  });

  it('kritische Windows-Prozesse sind als solche markiert', () => {
    const procs = gui('INTERN-SC-011').state.taskManager!.processes;
    for (const name of ['System', 'svchost.exe']) {
      expect(procs.find((p) => p.name === name)?.critical, `${name} nicht geschuetzt`).toBe(true);
    }
  });

  it('der Ablenker hat wirklich die hoechste CPU-Last', () => {
    // Ohne das waere die Lektion keine: der Fall lebt davon, dass der falsche
    // Prozess der auffaelligere ist.
    const procs = gui('INTERN-SC-011').state.taskManager!.processes;
    const top = [...procs].sort((a, b) => b.cpu - a.cpu)[0];
    expect(top.name).toBe('veeam-agent.exe');
    expect(procs.find((p) => p.name === 'Tourenplanung.exe')!.cpu).toBe(0);
  });
});

describe('CLOUD365-SC-007 — die unbestellte Rechteanforderung', () => {
  const sols = () => gui('CLOUD365-SC-007').solutions;

  it('ablehnen loest', () => {
    expect(findMetGuiSolution(sols(), ['answer:uac:no'])).not.toBeNull();
  });

  it('zustimmen loest nicht', () => {
    expect(findMetGuiSolution(sols(), ['answer:uac:yes'])).toBeNull();
  });

  /**
   * Vertragstest. „Unbekannter Herausgeber = Schadsoftware" ist die bequeme
   * Regel und sie ist falsch — in jeder Firma laufen legitime unsignierte
   * Werkzeuge. Der Ergebnistext muss an Auftrag und Herkunft haengen.
   */
  it('die Begruendung haengt an Auftrag und Herkunft, nicht an der Signatur allein', () => {
    const text = sols()[0].resultText;
    expect(text).toMatch(/Auftrag/i);
    expect(text).toMatch(/Anhang|Mail|Herkunft/i);
    expect(text, 'die Signatur darf nicht als alleiniger Beweis auftreten').toMatch(
      /allein noch kein Beweis|nicht allein/i
    );
  });

  it('der Dialog liefert die Gruende sichtbar mit', () => {
    const uac = gui('CLOUD365-SC-007').state.uac!;
    expect(uac.verifiedPublisher).toBe(false);
    expect(uac.fileOrigin, 'ohne Herkunft ist der Fall nicht entscheidbar').toBeTruthy();
    expect(uac.riskFeedback, 'die riskante Wahl braucht eine Rueckmeldung').toBeTruthy();
  });
});

describe('TELEKOM-SC-007 — die richtige Vertragsfassung', () => {
  const sols = () => gui('TELEKOM-SC-007').solutions;

  it('die gueltige Fassung des betroffenen Standorts loest', () => {
    expect(findMetGuiSolution(sols(), ['open:anschluss_betriebshof'])).not.toBeNull();
  });

  it('die ersetzte Fassung loest nicht', () => {
    expect(findMetGuiSolution(sols(), ['open:anschluss_betriebshof_alt'])).toBeNull();
  });

  it('der falsche Standort loest nicht', () => {
    expect(findMetGuiSolution(sols(), ['open:anschluss_kompostwerk'])).toBeNull();
  });

  it('den Ordner nur zu oeffnen loest nicht', () => {
    expect(
      findMetGuiSolution(sols(), ['openfolder:ordner_betriebshof', 'select:anschluss_betriebshof'])
    ).toBeNull();
  });

  it('die falschen Fassungen sind unterscheidbar, ohne die Loesung zu verraten', () => {
    const items = gui('TELEKOM-SC-007').state.explorer!.items!;
    const alt = items.find((i) => i.id === 'anschluss_betriebshof_alt')!;
    const neu = items.find((i) => i.id === 'anschluss_betriebshof')!;
    const fremd = items.find((i) => i.id === 'anschluss_kompostwerk')!;

    expect(alt.preview, 'die alte Fassung muss sich zu erkennen geben').toMatch(/ERSETZT/);
    expect(neu.preview).not.toMatch(/ERSETZT/);
    // Die Kennungen muessen sich unterscheiden — sonst waere die Verwechslung
    // folgenlos und der Fall belanglos.
    const kennung = (t: string) => t.match(/DTAG-[\d-]+/)![0];
    expect(new Set([alt, neu, fremd].map((i) => kennung(i.preview!))).size).toBe(3);
  });

  it('der Abschluss behauptet kein eroeffnetes Provider-Ticket', () => {
    const choice = szenario('TELEKOM-SC-007').choices.find((c) => c.guiCommand)!;
    expect(choice.consequence).toMatch(/noch nicht|nächste/i);
  });
});

describe('INTERN-SC-004 — die Disposition steht', () => {
  const sols = () => gui('INTERN-SC-004').solutions;

  it('den richtigen Fehlereintrag zu melden loest', () => {
    const met = findMetGuiSolution(sols(), ['select:ev_db_verbindung', 'report:ev_db_verbindung']);
    expect(met).not.toBeNull();
    expect(met!.resultText).toMatch(/4103/);
  });

  it('bloss auszuwaehlen loest nicht', () => {
    expect(findMetGuiSolution(sols(), ['select:ev_db_verbindung'])).toBeNull();
  });

  /**
   * Der Kern: eine Warnung ist keine Ursache. Die Nacht ist voll davon, und
   * zwei davon liegen zeitlich sogar naeher an Sabines Anruf.
   */
  it.each(['ev_zertifikat', 'ev_druckwarteschlange', 'ev_lizenz'])(
    'die unabhaengige Meldung %s zu melden loest nicht',
    (eintrag) => {
      expect(findMetGuiSolution(sols(), [`select:${eintrag}`, `report:${eintrag}`])).toBeNull();
    }
  );

  it('der erfolgreiche Sicherungslauf ist kein Befund', () => {
    expect(findMetGuiSolution(sols(), ['report:ev_backup_ok'])).toBeNull();
  });

  /**
   * Die Wiederholung um 05:34 ist dieselbe Stoerung, aber der falsche Beleg:
   * sie nennt weder den Beginn noch die letzte funktionierende Verbindung.
   */
  it('die Wiederholungsmeldung statt der ersten loest nicht', () => {
    expect(findMetGuiSolution(sols(), ['report:ev_db_wiederholung'])).toBeNull();
  });

  it('der Ergebnistext behauptet keine Reparatur', () => {
    const choice = szenario('INTERN-SC-004').choices.find((c) => c.guiCommand)!;
    expect(choice.consequence).not.toMatch(/neu ?gestartet|repariert|behoben/i);
    // Der Neustart passiert, aber ausdruecklich durch jemand anderen.
    expect(choice.consequence).toMatch(/Rufbereitschaft/);
  });

  it('der entscheidende Eintrag traegt den Beleg in den Details', () => {
    const eintraege = gui('INTERN-SC-004').state.eventViewer!.entries;
    const treffer = eintraege.find((e) => e.id === 'ev_db_verbindung')!;
    expect(treffer.level).toBe('Fehler');
    expect(treffer.message, 'ohne letzte erfolgreiche Verbindung ist es keine Eingrenzung')
      .toMatch(/[Ll]etzte erfolgreiche Verbindung/);
  });
});
