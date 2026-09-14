import { describe, it, expect } from 'vitest';
import { tutorialEvents } from './tutorials';

/**
 * Die vier Einsteiger-Tutorials. Playtest-Befunde, die hier festgehalten sind:
 *
 * - Die Abschlusstexte behaupteten Beherrschung („Du hast die Grundbefehle
 *   gemeistert!"). Eine Uebung mit drei abgetippten Befehlen belegt das nicht.
 *   Sie sagen jetzt, was sie BELEGT — und was ausdruecklich nicht.
 * - Der zweite Netzwerk-Hinweis behauptete, ein nacktes `ping` laufe ewig,
 *   waehrend die Simulation nach drei Antworten von selbst endete.
 */

const byId = (id: string) => {
  const e = tutorialEvents.find((x) => x.id === id);
  if (!e) throw new Error(`${id} fehlt`);
  return e;
};
const loesungstext = (id: string) => byId(id).terminalContext!.solutions[0].resultText!;

const ALLE = tutorialEvents.map((e) => e.id);

describe('Tutorials — kein Abschlusstext behauptet Beherrschung', () => {
  it.each(ALLE)('%s: der Abschlusstext verspricht keine Meisterschaft', (id) => {
    const t = loesungstext(id);
    expect(t, 'eine Uebung mit abgetippten Befehlen belegt keine Beherrschung')
      .not.toMatch(/gemeistert|beherrschst|Meister/i);
  });

  /**
   * Rauchprobe, kein Beweis — und das steht hier absichtlich.
   *
   * Ob ein Text mehr verspricht, als die Uebung hergibt, entscheidet kein
   * Regex; das muss jemand lesen. Was sich maschinell sagen laesst: Ein Text,
   * der ueberhaupt keine Verneinung enthaelt, benennt auch keine Grenze. Eine
   * laengere Wortliste waere genau der Fehler, der in den Anbieter-Packs schon
   * einmal richtige Antworten abgewiesen hat.
   */
  it.each(ALLE)('%s: der Abschlusstext enthaelt ueberhaupt eine Einschraenkung', (id) => {
    expect(loesungstext(id), 'kein einziges „nicht/nie/kein" — benennt der Text eine Grenze?')
      .toMatch(/\b(nicht|nie|kein|keine|keiner)\b/i);
  });

  it.each(ALLE)('%s: der Abschlusstext ist mehr als ein Ausruf', (id) => {
    expect(loesungstext(id).length).toBeGreaterThan(120);
  });
});

describe('Tutorials — die Simulation widerspricht ihren Hinweisen nicht', () => {
  const netz = byId('evt_tutorial_network');

  it('das nackte ping zeigt, dass es abgebrochen werden musste', () => {
    const bare = netz.terminalContext!.commands.find((c) => c.pattern === 'ping mail.warm.local')!;
    expect(bare.output, 'ohne Abbruchzeile endet es scheinbar von selbst').toMatch(/\^C/);
  });

  it('der Hinweis behauptet nichts, was die Ausgabe widerlegt', () => {
    const hinweise = netz.terminalContext!.hints.join('\n');
    const bare = netz.terminalContext!.commands.find((c) => c.pattern === 'ping mail.warm.local')!;
    // Wenn ein Hinweis von „laeuft ewig"/Abbruch spricht, muss die Ausgabe das zeigen.
    if (/ewig|Strg\+C|abbrechen/i.test(hinweise)) {
      expect(bare.output).toMatch(/\^C|Strg\+C/);
    }
  });

  it('die begrenzte Fassung endet dagegen von selbst', () => {
    const drei = netz.terminalContext!.commands.find((c) => c.pattern === 'ping -c 3 mail.warm.local')!;
    expect(drei.output).not.toMatch(/\^C/);
    expect(drei.output).toMatch(/3 packets transmitted/);
  });

  it('der Netzwerk-Abschluss trennt Erreichbarkeit von Dienstverfuegbarkeit', () => {
    const t = loesungstext('evt_tutorial_network');
    expect(t).toMatch(/Ping/);
    expect(t, 'genau das ist die Lektion').toMatch(/„Erreichbar" und „funktioniert"/);
  });

  /**
   * Der Kern von Variante B: Die Lektion wird BEWIESEN, nicht behauptet. Ohne
   * den Port-Test bliebe „Ping sagt nichts ueber den Dienst" ein Merksatz im
   * Abschlusstext — mit ihm steht es auf dem Schirm.
   */
  it('das Netzwerk-Tutorial verlangt den Dienst-Test, nicht nur Ping und DNS', () => {
    const ctx = byId('evt_tutorial_network').terminalContext!;
    expect(ctx.solutions[0].commands, 'ping und nslookup allein beantworten die Frage nicht')
      .toContain('portcheck');
    const pruefer = ctx.commands.filter((c) => c.teachesCommand === 'portcheck');
    expect(pruefer.length, 'nc UND telnet — beide Schreibweisen sind gaengig').toBe(2);
    for (const c of pruefer) {
      expect(c.output, 'der Dienst muss erkennbar WEG sein').toMatch(/refused/i);
    }
  });

  it('die Antwortoption nimmt den Befund nicht vorweg', () => {
    // War: „Server ist erreichbar - war wohl nur ein Timeout!" — also genau der
    // voreilige Schluss, den das Level korrigiert.
    const choice = byId('evt_tutorial_network').choices[0];
    expect(choice.text).not.toMatch(/erreichbar|Timeout/i);
  });
});

describe('Tutorials — die Lektion wird bewiesen, nicht behauptet', () => {
  /**
   * Variante B des Playtest-Punkts „ask for interpretation": Die Einsicht ist
   * eine HANDLUNG, kein Merksatz im Abschlusstext.
   */
  it('das Such-Tutorial verlangt den Blick ueber den Filter hinaus', () => {
    const ctx = byId('evt_tutorial_search').terminalContext!;
    expect(ctx.solutions[0].commands, 'grep allein liefert drei Zeilen ohne Kontext')
      .toContain('kontext');
    const kontext = ctx.commands.filter((c) => c.teachesCommand === 'kontext');
    expect(kontext.length, '`cat` und `grep -A` — beide Wege sind richtig').toBe(2);
    for (const c of kontext) {
      expect(c.output, 'der Kontext muss die Aufloesung zeigen').toMatch(/erfolgreich/);
    }
  });

  /**
   * Der Filter zeigt drei Fehler, die Datei zeigt einen geheilten Aussetzer.
   * Genau dieser Unterschied ist die Lektion — also muss er in den Daten
   * wirklich stecken und nicht nur im Text behauptet sein.
   */
  it('die gefilterte und die vollstaendige Sicht widersprechen sich wirklich', () => {
    const ctx = byId('evt_tutorial_search').terminalContext!;
    const gefiltert = ctx.commands.find((c) => c.pattern === 'grep ERROR error.log')!.output;
    const ganz = ctx.commands.find((c) => c.pattern === 'cat error.log')!.output;
    expect(gefiltert, 'der Filter darf die Aufloesung NICHT zeigen').not.toMatch(/erfolgreich/);
    expect(ganz, 'die ganze Datei muss sie zeigen').toMatch(/Retry 3\/3 erfolgreich/);
    // Und die Zaehlung bleibt stimmig.
    expect(gefiltert.trim().split('\n').length).toBe(3);
    expect(ctx.commands.find((c) => c.pattern === 'grep -c ERROR error.log')!.output.trim()).toBe('3');
  });

  it('das Datei-Tutorial benennt die Falle von tail', () => {
    const t = loesungstext('evt_tutorial_files');
    // system.log endet auf „Backup erfolgreich" — wer nur das Ende liest,
    // sieht die WARN-Zeile davor nie.
    expect(t).toMatch(/tail/);
    expect(t).toMatch(/08:15:22|WARN/);
  });

  it('kein Abschlusstext erfindet Daten, die im Log nicht stehen', () => {
    // Eigener Fehler aus dieser Runde: Ein Text sprach von „Backup-Fehlern aus
    // drei aufeinanderfolgenden Naechten" — tatsaechlich liegen alle drei
    // Zeilen in derselben Minute. Und system.log enthaelt gar kein ERROR.
    const suche = byId('evt_tutorial_search').terminalContext!;
    const zeiten = suche.commands.find((c) => c.pattern === 'grep ERROR error.log')!.output
      .match(/\d{4}-\d{2}-\d{2}/g)!;
    expect(new Set(zeiten).size, 'alle Treffer stammen vom selben Tag').toBe(1);
    expect(loesungstext('evt_tutorial_search')).not.toMatch(/Nächt|Naecht/i);

    const dateien = byId('evt_tutorial_files').terminalContext!;
    const systemLog = dateien.commands.find((c) => c.pattern === 'cat system.log')!.output;
    expect(systemLog).not.toMatch(/ERROR/);
    expect(loesungstext('evt_tutorial_files')).not.toMatch(/ERROR/);
  });
});
