import { describe, it, expect } from 'vitest';
import { createShellFromContext, checkStateGoals } from '../../../engine/shell';
import { getAllScenarios } from '../index';
import { alleTerminalLevel } from '../../../engine/terminalLevelRegistry';
import { sollpfad } from '../../../engine/sollpfad';
import { fahreZeilen } from '../../../engine/sollpfadFahrer';

/**
 * Die sechs AMSE-Faelle, die bis eben „gedost" waren.
 *
 * Alle sechs handeln von derselben Sache: Ein Dienstleister behauptet etwas,
 * und man braucht einen Beleg statt eines Gefuehls. Das funktioniert nur,
 * wenn die Messung im Spiel auch eine ist — bis zum Umbau war
 * `Test-NetConnection` fuer unbekannte Ziele ein Muenzwurf, und die
 * Firewallregeln waren Text in einer vorgefertigten Ausgabe.
 *
 * Deshalb steht zu jedem Fall der angesagte Weg, ein gleichwertiger anderer
 * wo es ihn gibt, und die Fehlgriffe — jeder gefahren, jeder rot.
 */

const kontext = (id: string) => {
  const sc = getAllScenarios().find((s) => s.id === id);
  if (!sc?.terminalContext) throw new Error(`${id} nicht gefunden — Test veraltet?`);
  return sc.terminalContext;
};

function fahre(id: string, zeilen: string[]) {
  const ctx = kontext(id);
  const shell = createShellFromContext(ctx);
  const ausgaben = zeilen.map((z) => shell.execute(z));
  return { shell, ausgaben, ziele: ctx.solutions![0].stateGoals! };
}

const geloest = (id: string, zeilen: string[]): boolean => {
  const { shell, ziele } = fahre(id, zeilen);
  return checkStateGoals(shell, ziele);
};

const zielErfuellt = (id: string, zeilen: string[], index: number): boolean => {
  const ctx = kontext(id);
  const shell = createShellFromContext(ctx);
  for (const z of zeilen) shell.execute(z);
  return checkStateGoals(shell, [ctx.solutions![0].stateGoals![index]]);
};

// ── AMSE-SC-001: „Ist erledigt" ist eine Behauptung ──────────────────────────

const NACHWEIS = 'C:\\Users\\admin.mueller\\nachweis.txt';
const MESSEN1 = [
  'Test-NetConnection ziel-server.warm.local -Port 8443',
  'Test-NetConnection ziel-server.warm.local -Port 443',
];
const SCHREIBEN1 = [
  `echo "adresse: 10.10.5.100" > ${NACHWEIS}`,
  `echo "port8443: zu" >> ${NACHWEIS}`,
  `echo "port443: offen" >> ${NACHWEIS}`,
];

describe('AMSE-SC-001 — der Beleg muss gemessen sein', () => {
  it('die Messung ist reproduzierbar, nicht gewuerfelt', () => {
    // Der Anlass des ganzen Umbaus: Frueher entschied hier Math.random().
    const { shell } = fahre('AMSE-SC-001', []);
    const antworten = new Set<string>();
    for (let i = 0; i < 10; i++) {
      antworten.add(shell.execute(MESSEN1[0]).output);
    }
    expect(antworten.size, 'dieselbe Frage, verschiedene Antworten').toBe(1);
  });

  it('die beiden Messungen sagen Verschiedenes — darin liegt das Argument', () => {
    const { ausgaben } = fahre('AMSE-SC-001', MESSEN1);
    expect(ausgaben[0].output).toContain('TcpTestSucceeded : False');
    expect(ausgaben[1].output).toContain('TcpTestSucceeded : True');
    expect(ausgaben[0].output, 'und beide nennen dieselbe Kiste').toContain('10.10.5.100');
  });

  it('der angesagte Weg loest', () => {
    expect(geloest('AMSE-SC-001', [...MESSEN1, ...SCHREIBEN1])).toBe(true);
  });

  it('ohne die Messung traegt der Nachweis nicht — auch wenn er stimmt', () => {
    // Genau das hat Marco geliefert: eine richtige Behauptung ohne Beleg.
    expect(geloest('AMSE-SC-001', SCHREIBEN1)).toBe(false);
    expect(zielErfuellt('AMSE-SC-001', SCHREIBEN1, 1), 'der Text allein ist richtig').toBe(true);
  });

  it('die falsche Richtung: 8443 als offen zu melden faellt durch', () => {
    const falsch = SCHREIBEN1.map((z) => z.replace('port8443: zu', 'port8443: offen'));
    expect(geloest('AMSE-SC-001', [...MESSEN1, ...falsch])).toBe(false);
  });

  it('die Adresse kommt aus der Antwort, nicht aus einer Datei', () => {
    const falsch = SCHREIBEN1.map((z) => z.replace('10.10.5.100', '10.10.5.1'));
    expect(geloest('AMSE-SC-001', [...MESSEN1, ...falsch])).toBe(false);
  });
});

// ── AMSE-SC-002: etwas, das auf die Sekunde regelmaessig ist, ist ein Timer ──

const BELEG = '/home/admin/beleg.md';
const LESEN2 = ['cat /var/log/vpn/ipsec.log', 'cat /var/log/vpn/ipsec.conf.export'];
const SCHREIBEN2 = [
  `echo "intervall: 30" > ${BELEG}`,
  `echo "ursache: lifetime" >> ${BELEG}`,
  `echo "wert: 1800" >> ${BELEG}`,
];
const ersetze2 = (alt: string, neu: string) => SCHREIBEN2.map((z) => z.replace(alt, neu));

describe('AMSE-SC-002 — der Timer steht in der Konfiguration', () => {
  it('der angesagte Weg loest', () => {
    expect(geloest('AMSE-SC-002', [...LESEN2, ...SCHREIBEN2])).toBe(true);
  });

  it('beide Quellen muessen gelesen sein', () => {
    expect(geloest('AMSE-SC-002', [LESEN2[0], ...SCHREIBEN2])).toBe(false);
    expect(geloest('AMSE-SC-002', [LESEN2[1], ...SCHREIBEN2])).toBe(false);
  });

  it('die erste Zeitangabe abzuschreiben ist die Falle', () => {
    // ikelifetime=86400s steht ueber dem gesuchten Wert und sieht genauso aus.
    expect(geloest('AMSE-SC-002', [...LESEN2, ...ersetze2('wert: 1800', 'wert: 86400')])).toBe(false);
  });

  it('„ursache: leitung" ist Marcos Vermutung und im Protokoll widerlegt', () => {
    expect(geloest('AMSE-SC-002', [...LESEN2, ...ersetze2('ursache: lifetime', 'ursache: leitung')])).toBe(false);
  });

  it('das Protokoll traegt beides: den Takt und die erreichbare Gegenstelle', () => {
    const { ausgaben } = fahre('AMSE-SC-002', LESEN2);
    expect(ausgaben[0].output, 'drei Abbrueche im 30-Minuten-Takt')
      .toMatch(/08:30:01[\s\S]*09:00:03[\s\S]*09:30:05/);
    expect(ausgaben[0].output, 'und die Gegenstelle war da').toMatch(/DPD: peer responded/);
    expect(ausgaben[1].output, 'beide Zeitwerte stehen da').toMatch(/ikelifetime=86400s[\s\S]*lifetime=1800s/);
  });
});

// ── AMSE-SC-004: die Regel aus der falschen Konfiguration ───────────────────

const WEG = 'sudo nft delete rule inet filter input handle 7';

describe('AMSE-SC-004 — entfernen, ohne den eigenen Zugang mitzunehmen', () => {
  it('der Ausgangszustand ist die Geschichte: das fremde Netz kommt herein', () => {
    const ctx = kontext('AMSE-SC-004');
    const shell = createShellFromContext(ctx);
    expect(checkStateGoals(shell, [ctx.solutions![0].stateGoals![1]]), 'noch offen').toBe(false);
  });

  it('der angesagte Weg loest', () => {
    expect(geloest('AMSE-SC-004', ['cat /etc/firewall/netzverzeichnis.txt', WEG])).toBe(true);
  });

  it('eine eigene Sperre davor tut es auch — geprueft wird das Urteil', () => {
    expect(geloest('AMSE-SC-004', [
      'cat /etc/firewall/netzverzeichnis.txt',
      'sudo nft insert rule inet filter input position 7 ip saddr 10.42.0.0/16 drop',
    ])).toBe(true);
  });

  it('flush ruleset raeumt die Regel weg UND die ganze Wall', () => {
    const zeilen = ['cat /etc/firewall/netzverzeichnis.txt', 'sudo nft flush ruleset'];
    expect(zielErfuellt('AMSE-SC-004', zeilen, 1), 'ohne Regelwerk filtert niemand').toBe(false);
    expect(geloest('AMSE-SC-004', zeilen)).toBe(false);
  });

  it('beim Aufraeumen den eigenen ssh-Zugang mitzunehmen faellt auf', () => {
    const zeilen = [
      'cat /etc/firewall/netzverzeichnis.txt',
      WEG,
      'sudo nft delete rule inet filter input handle 8',
    ];
    expect(zielErfuellt('AMSE-SC-004', zeilen, 1), 'das fremde Netz ist draussen').toBe(true);
    expect(zielErfuellt('AMSE-SC-004', zeilen, 5), 'und du auch').toBe(false);
    expect(geloest('AMSE-SC-004', zeilen)).toBe(false);
  });

  it('ohne das Netzverzeichnis ist das Entfernen ein Bauchgefuehl', () => {
    expect(geloest('AMSE-SC-004', [WEG])).toBe(false);
  });

  it('die beiden Dateien tragen, was sie sollen', () => {
    const { ausgaben } = fahre('AMSE-SC-004', [
      'cat /etc/firewall/netzverzeichnis.txt',
      'cat /etc/firewall/aenderungen.log',
    ]);
    expect(ausgaben[0].output).toMatch(/10\.42\.0\.0\/16\s+Stadtwerke Nachbarstadt/);
    expect(ausgaben[1].output, 'kein Ticket, keine Begruendung').toMatch(/admin_amse.*ohne Ticket/);
  });
});

// ── AMSE-SC-005: Leitung und Namen sind zwei Fragen ─────────────────────────

const BEFUND5 = 'C:\\Users\\admin.mueller\\befund.txt';
const UMGEHUNG = 'Set-DnsClientServerAddress -InterfaceIndex 12 -ServerAddresses 1.1.1.1';
const SCHREIBEN5 = [
  `echo "leitung: ok" > ${BEFUND5}`,
  `echo "dns: 10.10.1.10" >> ${BEFUND5}`,
  `echo "ursache: namensdienst" >> ${BEFUND5}`,
];

describe('AMSE-SC-005 — die Leitung steht, die Namen sind weg', () => {
  it('die Trennung ist im Spiel wirklich messbar', () => {
    const { ausgaben } = fahre('AMSE-SC-005', [
      'Test-NetConnection 8.8.8.8',
      'Resolve-DnsName google.de',
      'Get-DnsClientServerAddress',
    ]);
    expect(ausgaben[0].output, 'die Adresse antwortet').toContain('PingSucceeded          : True');
    expect(ausgaben[1].exitCode, 'der Name nicht').toBe(1);
    expect(ausgaben[2].output, 'und beide Resolver gehoeren dem Dienstleister').toContain('10.10.1.10');
  });

  it('die Umgehung wirkt wirklich — danach loest derselbe Name auf', () => {
    const { shell } = fahre('AMSE-SC-005', [UMGEHUNG]);
    expect(shell.execute('Resolve-DnsName google.de').exitCode).toBe(0);
  });

  it('der angesagte Weg loest', () => {
    expect(geloest('AMSE-SC-005', [UMGEHUNG, ...SCHREIBEN5])).toBe(true);
  });

  it('den Befund zu schreiben, ohne die Umgehung zu bauen, loest nicht', () => {
    expect(geloest('AMSE-SC-005', SCHREIBEN5)).toBe(false);
  });

  it('„ursache: leitung" ist genau die Fehldiagnose, die 25 Minuten gekostet hat', () => {
    const falsch = SCHREIBEN5.map((z) => z.replace('ursache: namensdienst', 'ursache: leitung'));
    expect(geloest('AMSE-SC-005', [UMGEHUNG, ...falsch])).toBe(false);
  });

  it('ein anderer Resolver als 1.1.1.1 genuegt der Bedingung nicht', () => {
    // Die Bedingung prueft, dass die Umgehung WIRKLICH eingetragen ist.
    expect(geloest('AMSE-SC-005', [
      'Set-DnsClientServerAddress -InterfaceIndex 12 -ServerAddresses 10.10.1.11',
      ...SCHREIBEN5,
    ])).toBe(false);
  });
});

// ── AMSE-SC-007: der Auszug ist leicht, der Abgleich ist die Arbeit ─────────

const ABGLEICH = '/srv/doku/abgleich.md';
const EXPORT = 'sudo nft list ruleset > /srv/doku/regelwerk.txt';
const SCHREIBEN7 = [
  `echo "regeln: 6" > ${ABGLEICH}`,
  `echo "ohne_zweck: 3389" >> ${ABGLEICH}`,
];

describe('AMSE-SC-007 — Dokumentation findet, was sich nicht aufschreiben laesst', () => {
  it('der angesagte Weg loest', () => {
    expect(geloest('AMSE-SC-007', [EXPORT, 'cat /etc/firewall/regelzweck.txt', ...SCHREIBEN7])).toBe(true);
  });

  it('der Auszug muss aus der Kiste kommen, nicht aus der Tastatur', () => {
    const gefaelscht = [
      'echo "        type filter hook input priority 0; policy drop;" > /srv/doku/regelwerk.txt',
      'echo "        tcp dport 3389 accept" >> /srv/doku/regelwerk.txt',
      'cat /etc/firewall/regelzweck.txt',
      ...SCHREIBEN7,
    ];
    expect(zielErfuellt('AMSE-SC-007', gefaelscht, 1), 'die Datei sieht richtig aus').toBe(true);
    expect(zielErfuellt('AMSE-SC-007', gefaelscht, 0), 'nur hat niemand die Kiste gefragt').toBe(false);
    expect(geloest('AMSE-SC-007', gefaelscht)).toBe(false);
  });

  it('den Regelsatz nur anzusehen, ohne ihn abzulegen, ist keine Dokumentation', () => {
    expect(geloest('AMSE-SC-007', [
      'sudo nft list ruleset', 'cat /etc/firewall/regelzweck.txt', ...SCHREIBEN7,
    ])).toBe(false);
  });

  it('die Zaehlung ist die Arbeit: fuenf Regeln zu zaehlen ist der naheliegende Fehler', () => {
    // Rueckkanal und Loopback sind auch Regeln, auch wenn sie technisch
    // notwendig sind.
    const falsch = SCHREIBEN7.map((z) => z.replace('regeln: 6', 'regeln: 5'));
    expect(geloest('AMSE-SC-007', [EXPORT, 'cat /etc/firewall/regelzweck.txt', ...falsch])).toBe(false);
  });

  it('die Regel ohne Zweck ist die ohne Quelleinschraenkung', () => {
    const falsch = SCHREIBEN7.map((z) => z.replace('ohne_zweck: 3389', 'ohne_zweck: 8443'));
    expect(geloest('AMSE-SC-007', [EXPORT, 'cat /etc/firewall/regelzweck.txt', ...falsch])).toBe(false);
  });

  it('die Zweckbindung beschreibt genau fuenf der sechs Regeln', () => {
    const { ausgaben } = fahre('AMSE-SC-007', ['sudo nft list ruleset', 'cat /etc/firewall/regelzweck.txt']);
    expect(ausgaben[0].output).toMatch(/tcp dport 3389 accept/);
    expect(ausgaben[1].output, 'und 3389 kommt dort nicht vor').not.toMatch(/3389/);
  });
});

// ── AMSE-SC-008: die Sitzung ist das Symptom, die offene Tuer das Problem ───

const ZUSCHNUEREN = [
  'cat /etc/firewall/netzverzeichnis.txt',
  'sudo kill 4711',
  'sudo ufw delete allow 22',
  'sudo ufw allow from 203.0.113.50 to any port 22',
  'sudo ufw allow from 10.10.0.50 to any port 22',
];

describe('AMSE-SC-008 — von wo, nicht nur wer', () => {
  it('die offene Sitzung ist im Spiel wirklich da', () => {
    const { ausgaben } = fahre('AMSE-SC-008', ['ss -tnp', 'ps aux']);
    expect(ausgaben[0].output).toMatch(/85\.214\.47\.123/);
    expect(ausgaben[1].output).toMatch(/admin_amse/);
  });

  it('der angesagte Weg loest', () => {
    expect(geloest('AMSE-SC-008', ZUSCHNUEREN)).toBe(true);
  });

  it('nur die Sitzung zu kappen laesst die Tuer offen', () => {
    const zeilen = ['cat /etc/firewall/netzverzeichnis.txt', 'sudo kill 4711'];
    expect(zielErfuellt('AMSE-SC-008', zeilen, 1), 'die Sitzung ist weg').toBe(true);
    expect(zielErfuellt('AMSE-SC-008', zeilen, 2), 'der Port steht fuer jeden offen').toBe(false);
    expect(geloest('AMSE-SC-008', zeilen)).toBe(false);
  });

  it('nur zuzuschnueren laesst die laufende Sitzung laufen', () => {
    // Eine bestehende Verbindung kuemmert sich nicht um neue Regeln.
    const zeilen = ZUSCHNUEREN.filter((z) => !z.startsWith('sudo kill'));
    expect(zielErfuellt('AMSE-SC-008', zeilen, 2), 'die Tuer ist zu').toBe(true);
    expect(zielErfuellt('AMSE-SC-008', zeilen, 1), 'er sitzt aber noch drin').toBe(false);
    expect(geloest('AMSE-SC-008', zeilen)).toBe(false);
  });

  it('wer nur den Dienstleister eintraegt, sperrt sich selbst aus', () => {
    const zeilen = ZUSCHNUEREN.filter((z) => !z.includes('10.10.0.50'));
    expect(zielErfuellt('AMSE-SC-008', zeilen, 3), 'AMSE kommt herein').toBe(true);
    expect(zielErfuellt('AMSE-SC-008', zeilen, 4), 'du nicht mehr').toBe(false);
    expect(geloest('AMSE-SC-008', zeilen)).toBe(false);
  });

  it('die private Adresse des Technikers gegen den Vertrag: beides steht da', () => {
    const { ausgaben } = fahre('AMSE-SC-008', [
      'cat /etc/firewall/netzverzeichnis.txt',
      'cat /etc/firewall/wartungsvertrag.txt',
    ]);
    expect(ausgaben[0].output).toMatch(/85\.214\.0\.0\/16\s+Deutsche Telekom AG/);
    expect(ausgaben[1].output).toMatch(/ausschließlich aus dem/);
  });
});

// ── Und fuer alle sechs: der Erfolg liegt am ENDE des angesagten Wegs ───────

describe('Kein angesagter Schritt laeuft ins Leere', () => {
  /**
   * Siehe kritis-infra/echteMechanik.test.ts: Ein Schritt, den der Auftrag
   * ansagt und die Gewinnbedingung nicht verlangt, kommt im Spiel nie zur
   * Ausfuehrung — nach dem Erfolg wartet die Sitzung auf das bestaetigende
   * Enter. Gefahren wird deshalb durch die echte Sitzung, nicht an ihr vorbei.
   */
  const IDS = ['AMSE-SC-001', 'AMSE-SC-002', 'AMSE-SC-004', 'AMSE-SC-005', 'AMSE-SC-007', 'AMSE-SC-008'];

  it.each(IDS.map((id) => [id] as const))('%s loest genau nach der letzten Zeile', (id) => {
    const e = alleTerminalLevel().find((x) => x.id === id);
    if (!e?.terminalContext) throw new Error(`${id} nicht gefunden — Test veraltet?`);
    const pfad = sollpfad(e)!;
    expect(pfad.zeilen.length, `${id} hat keinen sichtbaren Weg`).toBeGreaterThan(0);
    const fahrt = fahreZeilen(e.terminalContext, pfad.zeilen.map((cmd) => ({ cmd })));
    expect(
      fahrt.geloestNachZeile,
      `${id} loest nach Zeile ${fahrt.geloestNachZeile} von ${pfad.zeilen.length} — ` +
        'die Zeilen danach kommen im Spiel nie zur Ausfuehrung'
    ).toBe(pfad.zeilen.length);
  });
});
