import { describe, it, expect, vi } from 'vitest';
import { GameModeId, TerminalContext } from '@kritis/shared';
import { createShellFromContext } from '../../../engine/shell';
import { TerminalSession } from '../../../components/Terminal/session/TerminalSession';
import { katasterStoryEvents } from './events';
import { katasterChapters } from './chapters';

const byId = new Map(katasterStoryEvents.map((e) => [e.id, e]));
const l3 = byId.get('kt_l3_null_von_280')!;
const einkauf = byId.get('kt_l3_einkauf')!;
const l4 = byId.get('kt_l4_acht_monate')!;
const befund = byId.get('kt_l4_befund')!;

function makeSession(ctx: TerminalContext, gameMode: GameModeId = 'story') {
  const shell = createShellFromContext({
    type: ctx.type,
    hostname: ctx.hostname,
    username: ctx.username,
    currentPath: ctx.currentPath,
    vfsOverlay: ctx.vfsOverlay,
    commands: ctx.commands,
    hints: ctx.hints,
    taskText: ctx.taskText,
  });
  const session = new TerminalSession({
    shell,
    context: ctx,
    gameMode,
    onSolved: vi.fn(),
    onFlagsSet: vi.fn(),
  });
  return { session, shell };
}

function run(session: TerminalSession, cmd: string) {
  for (const ch of cmd) session.handleData(ch);
  return session.handleData('\r');
}

function outputOf(session: TerminalSession, cmd: string): string {
  return run(session, cmd)
    .filter((e): e is { type: 'writeLine'; text: string } => e.type === 'writeLine')
    .map((e) => e.text)
    .join('\n');
}

describe('DAS KATASTER Akt 2 / Kapitel „Was in den Verträgen steht"', () => {
  it('ch02 spielt L3 → Einkauf-Dialog → L4 → Befund-Dialog', () => {
    const ch02 = katasterChapters.find((c) => c.id === 'kt_ch02_vertraege')!;
    expect(ch02.storyBeats.map((b) => b.eventId)).toEqual([
      'kt_l3_null_von_280',
      'kt_l3_einkauf',
      'kt_l4_acht_monate',
      'kt_l4_befund',
    ]);
  });

  it('die Entscheidungs-Dialoge stehen NACH ihrem Level', () => {
    const order = katasterChapters
      .find((c) => c.id === 'kt_ch02_vertraege')!
      .storyBeats.map((b) => b.eventId);
    expect(order.indexOf('kt_l3_einkauf')).toBeGreaterThan(order.indexOf('kt_l3_null_von_280'));
    expect(order.indexOf('kt_l4_befund')).toBeGreaterThan(order.indexOf('kt_l4_acht_monate'));
  });

  it('jeder Dialog bietet mindestens zwei ungated Optionen mit Konsequenztext', () => {
    for (const dialog of [einkauf, befund]) {
      const open = dialog.choices.filter((c) => !c.requires && !c.hidden);
      expect(open.length, dialog.id).toBeGreaterThanOrEqual(2);
      for (const c of dialog.choices) {
        expect(c.resultText.length, `${dialog.id}/${c.id}`).toBeGreaterThan(40);
      }
    }
  });
});

describe('L3 „Null von 280" — in der echten Shell lösbar', () => {
  it("awk -F';' findet genau das Produkt mit Belegung 0", () => {
    const { session } = makeSession(l3.terminalContext!);
    const out = outputOf(
      session,
      "awk -F';' '$3 == 0' /srv/verwaltung/lizenzen/lizenzserver_export_2026-09.csv"
    );
    expect(out).toMatch(/Archiv-Suite CAL;280;0/);
    // Genau eine Auffaelligkeit — sonst ist der Fund Zufall statt Analyse.
    expect(out.split('\n').filter((l) => l.includes(';')).length).toBe(1);
  });

  it('der Sollpfad löst: beide Quellen lesen und die Zahl festhalten', () => {
    const { session } = makeSession(l3.terminalContext!);
    run(session, "awk -F';' '$3 == 0' /srv/verwaltung/lizenzen/lizenzserver_export_2026-09.csv");
    run(session, 'cat /srv/verwaltung/vertragsakten/rahmenvertrag_lizenzen.txt');
    run(session, 'echo "Rahmenvertrag Lizenzen 9 - 280 CAL ungenutzt" >> /home/timo/quellen.md');
    expect(session.getSnapshot().solved).toBe(true);
  });

  it('nur der Export, ohne den Vertrag, löst NICHT — die Pflicht steht im Vertrag', () => {
    const { session } = makeSession(l3.terminalContext!);
    run(session, 'cat /srv/verwaltung/lizenzen/lizenzserver_export_2026-09.csv');
    run(session, 'echo "280 CAL ungenutzt" >> /home/timo/quellen.md');
    expect(session.getSnapshot().solved).toBe(false);
  });

  it('setzt auf der Quellenliste aus L1 auf (Kontinuität statt Neuanfang)', () => {
    const seeded = l3.terminalContext!.vfsOverlay!.files!.find(
      (f) => f.path === '/home/timo/quellen.md'
    )!;
    expect(seeded.content).toMatch(/Komm\.ONE/);
  });

  it('die Audit-Klausel nennt Frist und Folge — sonst ist sie keine Pflicht', () => {
    const vertrag = l3.terminalContext!.vfsOverlay!.files!.find((f) =>
      f.path.endsWith('rahmenvertrag_lizenzen.txt')
    )!;
    expect(vertrag.content).toMatch(/jährlich/);
    expect(vertrag.content).toMatch(/30\. Juni/);
    expect(vertrag.content).toMatch(/Kosten\n\s*trägt der Kunde/);
  });
});

describe('L4 „Acht Monate" — ein Name ist kein Nachweis', () => {
  it('die beiden Quellen widersprechen sich wirklich', () => {
    const files = l4.terminalContext!.vfsOverlay!.files!;
    const kalb = files.find((f) => f.path.endsWith('kataster_kalb.csv'))!.content;
    const queues = files.find((f) => f.path.endsWith('queues_2026-09.csv'))!.content;
    // Kataster: Technikwartung hat einen Aufpasser …
    expect(kalb).toMatch(/Technikwartung;[^;]*;Bjorg Jörgensen/);
    // … das Ticketsystem sagt: seit Januar nichts.
    expect(queues).toMatch(/Technikwartung;\d+;2026-01-14/);
  });

  it('sort findet die älteste aktive Queue oben', () => {
    const { session } = makeSession(l4.terminalContext!);
    const out = outputOf(
      session,
      "cut -d';' -f1,3 /srv/verwaltung/ticket-export/queues_2026-09.csv | sort -t';' -k2"
    );
    const rows = out.split('\n').filter((l) => /\d{4}-\d{2}-\d{2}/.test(l));
    expect(rows[0]).toMatch(/Archivierung/); // 2025-11 ist aelter …
    expect(rows[1]).toMatch(/Technikwartung/); // … dann kommt der eigentliche Fund
  });

  it('der Sollpfad löst: beide lesen, Befund mit Queue UND Datum schreiben', () => {
    const { session } = makeSession(l4.terminalContext!);
    run(session, 'cat /srv/verwaltung/kataster_alt/kataster_kalb.csv');
    run(session, 'cat /srv/verwaltung/ticket-export/queues_2026-09.csv');
    run(
      session,
      'echo "Technikwartung - Aufpasser eingetragen, letzte Aktion 2026-01-14" >> /home/timo/befund_aufpasser.txt'
    );
    expect(session.getSnapshot().solved).toBe(true);
  });

  it('ein Befund ohne Datum löst NICHT — „irgendwann" ist kein Befund', () => {
    const { session } = makeSession(l4.terminalContext!);
    run(session, 'cat /srv/verwaltung/kataster_alt/kataster_kalb.csv');
    run(session, 'cat /srv/verwaltung/ticket-export/queues_2026-09.csv');
    run(session, 'echo "Technikwartung - schon laenger nichts passiert" >> /home/timo/befund_aufpasser.txt');
    expect(session.getSnapshot().solved).toBe(false);
  });
});

describe('Akt 2 — die Flag-Wirkung der Entscheidungen', () => {
  it('der Einkauf-Dialog trägt K5 und die Verwaisung, nie beides zugleich', () => {
    const flagsOf = (id: string) => einkauf.choices.find((c) => c.id === id)!.setsFlags ?? [];
    expect(flagsOf('kt_l3_einkauf_uebergeben')).toEqual(['kat_purchasing_informed']);
    expect(flagsOf('kt_l3_einkauf_offen')).toEqual(['kat_orphan_license']);
    expect(flagsOf('kt_l3_einkauf_selbst')).toEqual([]);
    for (const c of einkauf.choices) {
      const f = c.setsFlags ?? [];
      expect(f.includes('kat_purchasing_informed') && f.includes('kat_orphan_license')).toBe(false);
    }
  });

  /** Ehrlichkeit wird belohnt, auch wenn das Grid dadurch schlechter aussieht. */
  it('beide ehrlichen Wege setzen K3, nur das Schönen setzt das Lügen-Flag', () => {
    const flagsOf = (id: string) => befund.choices.find((c) => c.id === id)!.setsFlags ?? [];
    expect(flagsOf('kt_l4_befund_zurueckstufen')).toEqual(['kat_stale_owner_found']);
    expect(flagsOf('kt_l4_befund_nachfragen')).toEqual(['kat_stale_owner_found']);
    expect(flagsOf('kt_l4_befund_gruen')).toEqual(['kat_gap_concealed']);
  });

  it('L3 setzt die Lizenz-Quelle für K1', () => {
    expect(l3.choices[0].setsFlags).toContain('kat_source_license');
  });
});

const l5 = byId.get('kt_l5_verweis_ins_leere')!;
const melden = byId.get('kt_l5_melden')!;
const l6 = byId.get('kt_l6_erinnerung')!;

describe('L5 „Der Verweis ins Leere" — der Negativbefund', () => {
  it('der Verweis in § 7 geht wirklich ins Leere', () => {
    const { session } = makeSession(l5.terminalContext!);
    const dv = outputOf(session, 'cat /srv/verwaltung/dienstvereinbarungen/dv_protokollierung.txt');
    expect(dv).toMatch(/IT-Notfallhandbuch/);
    // … und im ganzen Baum liegt nichts, was so heisst.
    const treffer = outputOf(session, 'find / -iname "*notfall*"');
    expect(treffer.trim()).toBe('');
  });

  it('find ohne Treffer endet erfolgreich — das ist der Beweis, nicht der Fehler', () => {
    const { session } = makeSession(l5.terminalContext!);
    run(session, 'find / -iname "*notfall*"');
    expect(outputOf(session, 'echo $?')).toMatch(/\b0\b/);
  });

  it('der Sollpfad löst: lesen, suchen, protokollieren', () => {
    const { session } = makeSession(l5.terminalContext!);
    run(session, 'cat /srv/verwaltung/dienstvereinbarungen/dv_protokollierung.txt');
    run(session, 'find / -iname "*notfall*"');
    run(session, 'echo "Suche nach *notfall* im gesamten Baum: kein Treffer (find -iname)" >> /home/timo/suchprotokoll.txt');
    expect(session.getSnapshot().solved).toBe(true);
  });

  /** Das Protokoll ohne Suche ist eine Behauptung — genau das lehrt das Level. */
  it('das Protokoll behaupten, ohne gesucht zu haben, löst NICHT', () => {
    const { session } = makeSession(l5.terminalContext!);
    run(session, 'cat /srv/verwaltung/dienstvereinbarungen/dv_protokollierung.txt');
    run(session, 'echo "Suche nach notfall: kein Treffer" >> /home/timo/suchprotokoll.txt');
    expect(session.getSnapshot().solved).toBe(false);
  });

  it('suchen ohne zu protokollieren löst auch NICHT', () => {
    const { session } = makeSession(l5.terminalContext!);
    run(session, 'cat /srv/verwaltung/dienstvereinbarungen/dv_protokollierung.txt');
    run(session, 'find / -iname "*notfall*"');
    expect(session.getSnapshot().solved).toBe(false);
  });
});

describe('L6 „Die Erinnerung, die niemand liest" — Frist aus Regel', () => {
  it('grep -ril findet genau das Behördenanschreiben, nicht die Werbung', () => {
    const { session } = makeSession(l6.terminalContext!);
    const out = outputOf(session, 'grep -ril bundesamt /srv/mailexport/info');
    expect(out).toMatch(/2026-06-24_bundesamt\.eml/);
    expect(out).not.toMatch(/toner|bewerbung/);
  });

  it('das Anschreiben zitiert ausschließlich geltendes Recht', () => {
    const mail = l6.terminalContext!.vfsOverlay!.files!.find((f) =>
      f.path.endsWith('bundesamt.eml')
    )!.content;
    expect(mail).toMatch(/§ 39 BSIG/);
    expect(mail).toMatch(/alle drei Jahre/);
    expect(mail).toMatch(/aufgedeckten Sicherheitsmängel/);
    expect(mail).not.toMatch(/§ ?8a|§ ?8b/);
  });

  it('der Sollpfad löst: Datum UND Fundstelle', () => {
    const { session } = makeSession(l6.terminalContext!);
    run(session, 'grep -ril bundesamt /srv/mailexport/info');
    run(session, 'cat /srv/mailexport/info/2026-06-24_bundesamt.eml');
    run(session, 'cat /srv/verwaltung/nachweise/ablage_kalb.txt');
    run(session, 'echo "Nachweis 2027 (13.05.2024 + 3 Jahre, 39 BSIG)" >> /home/timo/quellen.md');
    expect(session.getSnapshot().solved).toBe(true);
  });

  /** Eine Zahl ohne Herleitung ist keine Frist — das ist der Merksatz des Levels. */
  it('nur das Datum, ohne die Regel, löst NICHT', () => {
    const { session } = makeSession(l6.terminalContext!);
    run(session, 'cat /srv/mailexport/info/2026-06-24_bundesamt.eml');
    run(session, 'cat /srv/verwaltung/nachweise/ablage_kalb.txt');
    run(session, 'echo "Nachweis faellig 2027" >> /home/timo/quellen.md');
    expect(session.getSnapshot().solved).toBe(false);
  });

  it('die Rechnung geht auf: letzter Nachweis 2024 plus drei Jahre', () => {
    const ablage = l6.terminalContext!.vfsOverlay!.files!.find((f) =>
      f.path.endsWith('ablage_kalb.txt')
    )!.content;
    expect(ablage).toMatch(/2024-05-13/);
    expect(l6.choices[0].resultText).toMatch(/13\.05\.2024/);
    // Der Dreijahresrhythmus ist auch in Kalbs Historie sichtbar (2018/2021/2024).
    expect(ablage).toMatch(/2018-04-19/);
    expect(ablage).toMatch(/2021-04-27/);
  });
});

describe('Kapitel 3 — Kernentscheidung Melden', () => {
  it('ch03 spielt L5 → Melden-Dialog → L6', () => {
    const ch03 = katasterChapters.find((c) => c.id === 'kt_ch03_papier')!;
    expect(ch03.storyBeats.map((b) => b.eventId)).toEqual([
      'kt_l5_verweis_ins_leere',
      'kt_l5_melden',
      'kt_l6_erinnerung',
    ]);
  });

  it('zwei Wege melden, einer verschweigt — und das kostet später doppelt', () => {
    const flagsOf = (id: string) => melden.choices.find((c) => c.id === id)!.setsFlags ?? [];
    expect(flagsOf('kt_l5_melden_offen')).toEqual(['kat_gap_reported']);
    expect(flagsOf('kt_l5_melden_intern')).toEqual(['kat_gap_reported']);
    expect(flagsOf('kt_l5_melden_spaeter')).toEqual(['kat_gap_concealed']);
  });

  it('L5 und L6 erschließen die restlichen beiden Quellen für K1', () => {
    expect(l5.choices[0].setsFlags).toContain('kat_source_dv');
    expect(l6.choices[0].setsFlags).toContain('kat_source_law');
  });
});
