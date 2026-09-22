import { describe, it, expect } from 'vitest';
import { createShellFromContext, checkStateGoals } from '../../../engine/shell';
import { getAllScenarios } from '../index';

/**
 * Die Faelle, die bis eben „gedost" waren: vorgefertigte Ausgaben auf
 * Befehlsmuster, ohne dass die Maschine etwas getan haette. Der Umbau ist nur
 * dann etwas wert, wenn sich die IRRWEGE pruefen lassen — solange der
 * Ergebnistext die Lehre behauptet und keine Bedingung sie traegt, fuehrt
 * jeder Weg zum Erfolg.
 *
 * Deshalb steht hier zu jedem Fall: der angesagte Weg, mindestens ein
 * gleichwertiger anderer, und die plausiblen Fehlgriffe — jeder gefahren,
 * jeder rot.
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

/** Einzelnes Ziel, damit eine Gegenprobe benennen kann, WAS gerissen ist. */
const zielErfuellt = (id: string, zeilen: string[], index: number): boolean => {
  const ctx = kontext(id);
  const shell = createShellFromContext(ctx);
  for (const z of zeilen) shell.execute(z);
  return checkStateGoals(shell, [ctx.solutions![0].stateGoals![index]]);
};

// ── KRITIS-SC-002: PLC03 antwortet nicht mehr ────────────────────────────────

const REPARATUR = [
  'ssh plc03',
  'sudo rm /run/modbus/modbus.lock',
  'sudo systemctl start modbus',
  'exit',
];

describe('KRITIS-SC-002 — die Messung trennt Leitung, Geraet und Dienst', () => {
  it('die drei Ebenen sagen wirklich Verschiedenes', () => {
    const { ausgaben } = fahre('KRITIS-SC-002', [
      'ping -c 1 10.0.0.12',
      'nc -zv 10.0.0.12 502',
      'nc -zv 10.0.0.10 502',
    ]);
    expect(ausgaben[0].exitCode, 'das Geraet lebt').toBe(0);
    expect(ausgaben[1].error, 'der Dienst nicht').toMatch(/Connection refused/);
    expect(ausgaben[2].exitCode, 'die Nachbarn liefern').toBe(0);
  });

  it('„refused" und nicht „timed out" — das unterscheidet Dienst von Filter', () => {
    // Der fachliche Kern der Messung: Eine Sperre schweigt, ein fehlender
    // Dienst antwortet mit RST. Wer das verwechselt, sucht in der Firewall.
    const { ausgaben } = fahre('KRITIS-SC-002', ['nc -zv 10.0.0.12 502']);
    expect(ausgaben[0].error).not.toMatch(/timed out/);
  });

  it('der angesagte Weg loest — und der Port ist danach wirklich offen', () => {
    const { shell, ziele } = fahre('KRITIS-SC-002', REPARATUR);
    expect(checkStateGoals(shell, ziele)).toBe(true);
    expect(shell.execute('nc -zv 10.0.0.12 502').exitCode, 'von aussen messbar').toBe(0);
  });

  it('restart tut es auch — geprueft wird der Zustand, nicht die Formulierung', () => {
    expect(geloest('KRITIS-SC-002', [
      'ssh plc03', 'sudo rm /run/modbus/modbus.lock', 'sudo systemctl restart modbus', 'exit',
    ])).toBe(true);
  });

  it('ohne die Sperrdatei wegzuraeumen startet der Dienst NICHT', () => {
    const { ausgaben } = fahre('KRITIS-SC-002', ['ssh plc03', 'sudo systemctl start modbus']);
    expect(ausgaben[1].exitCode, 'der Start scheitert').not.toBe(0);
    expect(geloest('KRITIS-SC-002', ['ssh plc03', 'sudo systemctl restart modbus', 'exit'])).toBe(false);
  });

  it('und er SAGT auch, woran es liegt — die Begruendung steht im Protokoll', () => {
    const { ausgaben } = fahre('KRITIS-SC-002', [
      'ssh plc03', 'sudo systemctl start modbus', 'journalctl -u modbus',
    ]);
    expect(ausgaben[2].output).toMatch(/Stale lock file/);
  });

  it('der Fehlgriff, der am naechsten liegt: den gleichnamigen Dienst auf dem LEITSTAND neu starten', () => {
    // Auf beiden Kisten heisst der Dienst `modbus` — auf dem Leitstand ist es
    // der Client. Wer das ssh vergisst, startet etwas neu und repariert nichts.
    const { shell, ziele } = fahre('KRITIS-SC-002', ['sudo systemctl restart modbus']);
    expect(shell.execute('systemctl is-active modbus').output, 'lokal laeuft er').toMatch(/active/);
    expect(checkStateGoals(shell, ziele), 'das Geraet ist trotzdem stumm').toBe(false);
  });

  it('die Firewall aufzumachen hilft nicht — es hing nie an einer Regel', () => {
    expect(geloest('KRITIS-SC-002', ['ssh plc03', 'sudo ufw allow 502', 'exit'])).toBe(false);
  });

  it('„einmal alles durchstarten" kostet die Messwerte der Ausfallzeit', () => {
    const zeilen = [
      'ssh plc03',
      'sudo systemctl stop sensor-hub',
      'sudo rm /run/modbus/modbus.lock',
      'sudo systemctl start modbus',
      'exit',
    ];
    expect(zielErfuellt('KRITIS-SC-002', zeilen, 0), 'Modbus laeuft wieder').toBe(true);
    expect(zielErfuellt('KRITIS-SC-002', zeilen, 1), 'aber der Ringpuffer ist weg').toBe(false);
    expect(geloest('KRITIS-SC-002', zeilen)).toBe(false);
  });
});

// ── KRITIS-SC-003: der Alarm nennt den Weg, nicht die Ursache ────────────────

const BEFUND3 = '/home/secops/befund.md';
const LESEN3 = [
  'cat /var/log/monitoring/alerts.log',
  'cat /var/log/monitoring/fs01-zugriffe.log',
  'cat /etc/monitoring/adressbereiche.txt',
];
const SCHREIBEN3 = [
  `echo "verursacher: user.schmidt" > ${BEFUND3}`,
  `echo "quelle: 192.168.20.45" >> ${BEFUND3}`,
  `echo "ziel: google" >> ${BEFUND3}`,
  `echo "angriff: nein" >> ${BEFUND3}`,
  `echo "fehlend: richtlinie" >> ${BEFUND3}`,
];

const ersetze = (alt: string, neu: string) => SCHREIBEN3.map((z) => z.replace(alt, neu));

describe('KRITIS-SC-003 — der Alarm nennt den Weg, nicht die Ursache', () => {
  it('der angesagte Weg loest', () => {
    expect(geloest('KRITIS-SC-003', [...LESEN3, ...SCHREIBEN3])).toBe(true);
  });

  it('alle drei Quellen muessen gelesen sein', () => {
    for (let i = 0; i < LESEN3.length; i++) {
      const ohne = LESEN3.filter((_, j) => j !== i);
      expect(geloest('KRITIS-SC-003', [...ohne, ...SCHREIBEN3]), `ohne Quelle ${i}`).toBe(false);
    }
  });

  it('die Adresse aus dem Alarm abzuschreiben ist genau der Fehler', () => {
    // 192.168.10.2 steht gross im Alarm — und ist der Fileserver, ueber den
    // der Verkehr lief. Wer ihn meldet, sperrt die falsche Maschine.
    expect(geloest('KRITIS-SC-003', [...LESEN3, ...ersetze('192.168.20.45', '192.168.10.2')])).toBe(false);
  });

  it('„angriff: ja" faellt durch — das Ziel steht als zugelassen in der Liste', () => {
    expect(geloest('KRITIS-SC-003', [...LESEN3, ...ersetze('angriff: nein', 'angriff: ja')])).toBe(false);
  });

  it('„fehlend: firewallregel" ist der Reflex und trotzdem falsch', () => {
    // Der Verkehr war erlaubt und sollte erlaubt bleiben. Eine Regel haette
    // einen zulaessigen Vorgang kaputtgemacht und die Luecke gelassen.
    expect(geloest('KRITIS-SC-003', [...LESEN3, ...ersetze('fehlend: richtlinie', 'fehlend: firewallregel')])).toBe(false);
    expect(geloest('KRITIS-SC-003', [...LESEN3, ...ersetze('fehlend: richtlinie', 'fehlend: keine')])).toBe(false);
  });

  it('die Quellen tragen wirklich, was der Befund behauptet', () => {
    const { ausgaben } = fahre('KRITIS-SC-003', LESEN3);
    expect(ausgaben[0].output, 'der Alarm erklaert seinen eigenen Quellbegriff').toMatch(/nicht den, der ihn/);
    expect(ausgaben[1].output).toMatch(/user\.schmidt/);
    expect(ausgaben[2].output, 'Google steht als zugelassen drin').toMatch(/142\.250\.0\.0\/15\s+Google/);
    expect(ausgaben[2].output, 'und die fehlende Richtlinie ebenfalls').toMatch(/offener Punkt im Massnahmenplan/);
  });
});

// ── KRITIS-SC-004: die Regel ist richtig, die Reihenfolge nicht ──────────────

const AUSNAHME = 'sudo nft insert rule inet filter geo-block ip saddr 87.123.45.67 accept';

describe('KRITIS-SC-004 — ein Verdikt ist endgueltig', () => {
  it('der Ausgangszustand ist genau die Geschichte: Nord haengt, Sued laeuft', () => {
    const ctx = kontext('KRITIS-SC-004');
    const shell = createShellFromContext(ctx);
    const ziele = ctx.solutions![0].stateGoals!;
    expect(checkStateGoals(shell, [ziele[0]]), 'Nord kommt nicht herein').toBe(false);
    expect(checkStateGoals(shell, [ziele[2]]), 'Sued schon').toBe(true);
    expect(checkStateGoals(shell, [ziele[3]]), 'und die Wall steht').toBe(true);
  });

  it('eine Ausnahme vor der Sperre loest', () => {
    expect(geloest('KRITIS-SC-004', [AUSNAHME])).toBe(true);
  });

  it('der ganze Bereich statt der einen Adresse tut es auch — der Anschluss ist dynamisch', () => {
    // Fachlich sogar besser: Nord bekommt taeglich eine neue Adresse im
    // selben Bereich. Geprueft wird das Urteil, nicht die Schreibweise.
    expect(geloest('KRITIS-SC-004', [
      'sudo nft insert rule inet filter geo-block ip saddr 87.123.0.0/16 accept',
    ])).toBe(true);
  });

  it('den Sprung UNTER die VPN-Freigaben schieben loest ebenfalls', () => {
    // Aber nur dorthin: vor die ssh-Freigabe. Wer ihn ganz ans Ende haengt,
    // repariert das VPN und macht ssh fuer alle auf — siehe unten.
    expect(geloest('KRITIS-SC-004', [
      'sudo nft delete rule inet filter input handle 7',
      'sudo nft insert rule inet filter input position 10 jump geo-block',
    ])).toBe(true);
  });

  it('zu weit nach unten: der Sprung ganz ans Ende oeffnet den ssh-Port', () => {
    const zeilen = [
      'sudo nft delete rule inet filter input handle 7',
      'sudo nft add rule inet filter input jump geo-block',
    ];
    expect(zielErfuellt('KRITIS-SC-004', zeilen, 0), 'das VPN geht wieder').toBe(true);
    expect(zielErfuellt('KRITIS-SC-004', zeilen, 3), 'und 203.0.113.9 kommt an den ssh-Port').toBe(false);
    expect(geloest('KRITIS-SC-004', zeilen)).toBe(false);
  });

  it('zu viel (I): die Geo-Kette einfach ausbauen macht ssh wieder offen fuer alle', () => {
    const zeilen = ['sudo nft delete rule inet filter input handle 7'];
    expect(zielErfuellt('KRITIS-SC-004', zeilen, 0), 'Nord kaeme herein').toBe(true);
    expect(zielErfuellt('KRITIS-SC-004', zeilen, 3), 'aber 203.0.113.9 auch').toBe(false);
    expect(geloest('KRITIS-SC-004', zeilen)).toBe(false);
  });

  it('zu viel (II): flush ruleset — danach filtert niemand mehr', () => {
    expect(geloest('KRITIS-SC-004', ['sudo nft flush ruleset'])).toBe(false);
  });

  it('zu wenig: nur udp/500 freigeben ist ein halber Tunnel', () => {
    const zeilen = ['sudo nft insert rule inet filter geo-block ip saddr 87.123.45.67 udp dport 500 accept'];
    expect(zielErfuellt('KRITIS-SC-004', zeilen, 0), 'udp/500 kommt durch').toBe(true);
    expect(zielErfuellt('KRITIS-SC-004', zeilen, 1), 'udp/4500 nicht').toBe(false);
    expect(geloest('KRITIS-SC-004', zeilen)).toBe(false);
  });

  it('an der falschen Stelle: die Ausnahme UNTER die Sperre haengen wirkt nicht', () => {
    // Der Kern des Falls, als Gegenprobe: Was nach einem `drop` steht, sieht
    // das Paket nie.
    expect(geloest('KRITIS-SC-004', [
      'sudo nft add rule inet filter geo-block ip saddr 87.123.45.67 accept',
    ])).toBe(false);
  });

  it('das Protokoll nennt beide Adressen — die, die rein soll, und die, die nicht', () => {
    const { ausgaben } = fahre('KRITIS-SC-004', ['cat /var/log/nftables.log', 'cat /etc/firewall/aenderungen.log']);
    expect(ausgaben[0].output).toMatch(/87\.123\.45\.67/);
    expect(ausgaben[0].output).toMatch(/203\.0\.113\.9/);
    expect(ausgaben[1].output, 'und warum der Test nichts gemerkt hat').toMatch(/Test lief aus dem internen Netz/);
  });
});

// ── KRITIS-SC-005: zwei Prozesse sprechen ins OT-Netz, einer gehoert dahin ───

const VERLAUF = 'Get-Content C:\\ProgramData\\Defender\\verlauf.log';

describe('KRITIS-SC-005 — beenden ist eine Unterscheidung, kein Aufraeumen', () => {
  it('der Ausgangszustand zeigt beide Seiten der Frage', () => {
    const { ausgaben } = fahre('KRITIS-SC-005', ['Get-Process', 'Get-NetTCPConnection']);
    expect(ausgaben[0].output).toMatch(/PsExec64/);
    expect(ausgaben[0].output).toMatch(/siemens_tia/);
    // Beide sprechen mit 10.0.0.10 — die Adresse allein entscheidet nichts.
    expect(ausgaben[1].output.match(/10\.0\.0\.10/g)?.length, 'zwei Verbindungen zur selben Steuerung').toBe(2);
    expect(ausgaben[1].output, 'und eine nach draussen').toMatch(/185\.243\.115\.44/);
  });

  it('auf einer Windows-Kiste laeuft kein apache2', () => {
    // Die Grundausstattung war eine Linux-Tabelle. Auf einer Arbeitsstation,
    // deren offene Verbindungen der Gegenstand sind, faellt das sofort auf.
    const { ausgaben } = fahre('KRITIS-SC-005', ['Get-NetTCPConnection']);
    expect(ausgaben[0].output).not.toMatch(/sshd|apache2|mysqld/);
  });

  it('der angesagte Weg loest', () => {
    expect(geloest('KRITIS-SC-005', ['Get-Process', 'Get-NetTCPConnection', VERLAUF, 'Stop-Process -Id 3456'])).toBe(true);
  });

  it('ueber den Namen beenden tut es auch', () => {
    expect(geloest('KRITIS-SC-005', [VERLAUF, 'Stop-Process -Name PsExec64'])).toBe(true);
  });

  it('ohne den Verlauf ist das Beenden geraten — PsExec ist ein Admin-Werkzeug', () => {
    expect(geloest('KRITIS-SC-005', ['Get-Process', 'Stop-Process -Id 3456'])).toBe(false);
  });

  it('„im Zweifel alles beenden" haelt die Steuerung an', () => {
    const zeilen = [VERLAUF, 'Stop-Process -Id 3456', 'Stop-Process -Id 1234'];
    expect(zielErfuellt('KRITIS-SC-005', zeilen, 1), 'das Werkzeug ist weg').toBe(true);
    expect(zielErfuellt('KRITIS-SC-005', zeilen, 2), 'die Inbetriebnahme auch').toBe(false);
    expect(geloest('KRITIS-SC-005', zeilen)).toBe(false);
  });

  it('das falsche Ziel: die Engineering-Sitzung sieht aus wie der Befund', () => {
    expect(geloest('KRITIS-SC-005', [VERLAUF, 'Stop-Process -Name siemens_tia'])).toBe(false);
  });

  it('mit dem Prozess gehen seine Verbindungen — auch die ins OT-Netz', () => {
    const { shell } = fahre('KRITIS-SC-005', ['Stop-Process -Id 3456']);
    const danach = shell.execute('Get-NetTCPConnection').output;
    expect(danach).not.toMatch(/185\.243\.115\.44/);
    expect(danach.match(/10\.0\.0\.10/g)?.length, 'die legitime bleibt').toBe(1);
  });

  it('der Verlauf traegt die Einordnung, die der Prozessname nicht hergibt', () => {
    const { ausgaben } = fahre('KRITIS-SC-005', [VERLAUF, 'Get-Content C:\\Temp\\svc\\inv.bat']);
    expect(ausgaben[0].output, 'woher das Werkzeug kam').toMatch(/rechnung_03_2026\.pdf\.lnk/);
    expect(ausgaben[0].output, 'und dass nichts verschluesselt wurde').toMatch(/Keine verschlüsselten Dateien/);
    expect(ausgaben[1].output, 'was es tut').toMatch(/certutil/);
  });
});

// ── KRITIS-SC-006: die Anleitung des Herstellers kennt den Bestand nicht ─────

const ROLLOUT = '/home/engineer/rollout.md';
const PLAN = [
  `echo "rollend: plc01, plc02" > ${ROLLOUT}`,
  `echo "fenster: plc03" >> ${ROLLOUT}`,
  `echo "abgleich: ok" >> ${ROLLOUT}`,
];
const VORARBEIT = [
  'cat /opt/scada/config/plc-bestand.txt',
  'sha256sum /opt/siemens/firmware/firmware-4.6.2.upd',
];

describe('KRITIS-SC-006 — rollend geht nur, wo sich jemand vertritt', () => {
  it('die mitgelieferte Summe ist die ECHTE Summe der Datei', () => {
    // Sonst waere „abgleich: ok" eine Behauptung ueber eine erfundene Zahl —
    // genau die Sorte Nachweis, die dieses Level kritisiert.
    const { ausgaben } = fahre('KRITIS-SC-006', [
      'sha256sum /opt/siemens/firmware/firmware-4.6.2.upd',
      'cat /opt/siemens/firmware/sha256sums.txt',
    ]);
    const gerechnet = ausgaben[0].output.trim().split(/\s+/)[0];
    expect(ausgaben[1].output, `gerechnet: ${gerechnet}`).toContain(gerechnet);
  });

  it('der angesagte Weg loest', () => {
    expect(geloest('KRITIS-SC-006', [...VORARBEIT, ...PLAN])).toBe(true);
  });

  it('ohne zu rechnen traegt „abgleich: ok" nicht', () => {
    expect(geloest('KRITIS-SC-006', ['cat /opt/scada/config/plc-bestand.txt', ...PLAN])).toBe(false);
  });

  it('eine Summe ueber die falsche Datei zaehlt nicht', () => {
    // Die Bedingung ist an den Operanden gebunden, nicht an den Befehlsnamen.
    expect(geloest('KRITIS-SC-006', [
      'cat /opt/scada/config/plc-bestand.txt',
      'sha256sum /opt/siemens/firmware/sha256sums.txt',
      ...PLAN,
    ])).toBe(false);
  });

  it('die Anleitung des Herstellers abarbeiten: alle drei rollend — und die Sensorik faellt aus', () => {
    const falsch = [
      `echo "rollend: plc01, plc02, plc03" > ${ROLLOUT}`,
      `echo "fenster: keine" >> ${ROLLOUT}`,
      `echo "abgleich: ok" >> ${ROLLOUT}`,
    ];
    expect(geloest('KRITIS-SC-006', [...VORARBEIT, ...falsch])).toBe(false);
  });

  it('nur eine rollend ist zu vorsichtig — die Vertretung gilt in beide Richtungen', () => {
    const falsch = [
      `echo "rollend: plc01" > ${ROLLOUT}`,
      `echo "fenster: plc03" >> ${ROLLOUT}`,
      `echo "abgleich: ok" >> ${ROLLOUT}`,
    ];
    expect(geloest('KRITIS-SC-006', [...VORARBEIT, ...falsch])).toBe(false);
  });

  it('die Vertretung steht NUR in der Bestandsliste, nicht im Sicherheitshinweis', () => {
    const { ausgaben } = fahre('KRITIS-SC-006', [
      'cat /opt/siemens/firmware/sicherheitshinweis.txt',
      'cat /opt/scada/config/plc-bestand.txt',
    ]);
    expect(ausgaben[0].output, 'der Hersteller kennt den Bestand nicht').not.toMatch(/plc02/);
    expect(ausgaben[1].output).toMatch(/plc03\s+10\.0\.0\.12\s+Sensorik\s+keine/);
  });
});

// ── KRITIS-SC-007: eine Antwort nach einer Minute, von niemandem ─────────────

const ESKALATION = '/home/operator/eskalation.md';
const LESEN7 = [
  'cat /var/log/tickets/ticket-2026-03-09-001.log',
  'cat /etc/vertragswerk/siemens-premium.txt',
];
const SCHREIBEN7 = [
  `echo "stufe: hoch" > ${ESKALATION}`,
  `echo "frist: 24" >> ${ESKALATION}`,
  `echo "technische_reaktion: keine" >> ${ESKALATION}`,
  `echo "verstoss: ja" >> ${ESKALATION}`,
  `echo "folge: eskalation" >> ${ESKALATION}`,
];
const ersetze7 = (alt: string, neu: string) => SCHREIBEN7.map((z) => z.replace(alt, neu));

describe('KRITIS-SC-007 — die Frist haengt an der Stufe, nicht am Gefuehl', () => {
  it('der angesagte Weg loest', () => {
    expect(geloest('KRITIS-SC-007', [...LESEN7, ...SCHREIBEN7])).toBe(true);
  });

  it('beide Quellen muessen gelesen sein', () => {
    expect(geloest('KRITIS-SC-007', [LESEN7[0], ...SCHREIBEN7])).toBe(false);
    expect(geloest('KRITIS-SC-007', [LESEN7[1], ...SCHREIBEN7])).toBe(false);
  });

  it('die schaerfere Frist zu nehmen, weil es sich dringend anfuehlt, faellt durch', () => {
    const falsch = ersetze7('frist: 24', 'frist: 4').map((z) => z.replace('stufe: hoch', 'stufe: kritisch'));
    expect(geloest('KRITIS-SC-007', [...LESEN7, ...falsch])).toBe(false);
  });

  it('die Eingangsbestaetigung als Reaktion zu zaehlen laesst den Verstoss verschwinden', () => {
    expect(geloest('KRITIS-SC-007', [...LESEN7, ...ersetze7('verstoss: ja', 'verstoss: nein')])).toBe(false);
  });

  it('die erwartete Folge ist die falsche — es ist der dritte Verstoss', () => {
    expect(geloest('KRITIS-SC-007', [...LESEN7, ...ersetze7('folge: eskalation', 'folge: gutschrift')])).toBe(false);
  });

  it('beide Quellen tragen, was der Bericht behauptet', () => {
    const { ausgaben } = fahre('KRITIS-SC-007', LESEN7);
    expect(ausgaben[0].output, 'die Stufe').toMatch(/Dringlichkeit: hoch/);
    expect(ausgaben[0].output, 'und dass kein Mensch etwas getan hat').toMatch(/vom System erzeugt/);
    expect(ausgaben[1].output, 'was nicht als Reaktion gilt').toMatch(/gelten ausdrücklich NICHT als Reaktion/);
    expect(ausgaben[1].output, 'und der Stand der Verstoesse').toMatch(/Stand der Verstöße im laufenden Jahr: 2/);
  });
});

// ── KRITIS-SC-008: vier Ordner, vier Dateien, vier verschiedene Befunde ──────

const BEFUNDE = '/home/admin/befunde.md';
const LESEN8 = [
  'cat /docs/security/netzwerk/netzplan.txt',
  'cat /docs/security/zugriff/berechtigungskonzept.txt',
  'cat /docs/security/notfall/prozess.txt',
  'cat /docs/security/pentest/bericht.txt',
];
const SCHREIBEN8 = [
  `echo "netzplan: veraltet" > ${BEFUNDE}`,
  `echo "zugriffskontrollen: teilweise" >> ${BEFUNDE}`,
  `echo "notfallprozess: unerprobt" >> ${BEFUNDE}`,
  `echo "pentest: aktuell" >> ${BEFUNDE}`,
];
const ersetze8 = (alt: string, neu: string) => SCHREIBEN8.map((z) => z.replace(alt, neu));

describe('KRITIS-SC-008 — vorhanden ist nicht belastbar', () => {
  it('der angesagte Weg loest', () => {
    expect(geloest('KRITIS-SC-008', [...LESEN8, ...SCHREIBEN8])).toBe(true);
  });

  it('alle vier Dateien muessen gelesen sein', () => {
    for (let i = 0; i < LESEN8.length; i++) {
      const ohne = LESEN8.filter((_, j) => j !== i);
      expect(geloest('KRITIS-SC-008', [...ohne, ...SCHREIBEN8]), `ohne Datei ${i}`).toBe(false);
    }
  });

  it('„alles da" ist die Inventur, nicht die Analyse', () => {
    // In jedem der vier Ordner LIEGT etwas. Wer nur nachsieht, meldet dies.
    const alles = SCHREIBEN8.map((z) => z.replace(/: \w+"/, ': aktuell"'));
    expect(geloest('KRITIS-SC-008', [...LESEN8, ...alles])).toBe(false);
  });

  it('„alles kaputt" ist genauso falsch — ein Bereich traegt wirklich', () => {
    expect(geloest('KRITIS-SC-008', [...LESEN8, ...ersetze8('pentest: aktuell', 'pentest: teilweise')])).toBe(false);
  });

  it('der Notfallprozess ist aktuell UND unerprobt — das ist nicht „veraltet"', () => {
    expect(geloest('KRITIS-SC-008', [...LESEN8, ...ersetze8('notfallprozess: unerprobt', 'notfallprozess: veraltet')])).toBe(false);
    expect(geloest('KRITIS-SC-008', [...LESEN8, ...ersetze8('notfallprozess: unerprobt', 'notfallprozess: aktuell')])).toBe(false);
  });

  it('jede Datei traegt ihren eigenen Befund', () => {
    const { ausgaben } = fahre('KRITIS-SC-008', LESEN8);
    expect(ausgaben[0].output, 'alt, mit Nachtrag').toMatch(/Stand: 15\.06\.2024/);
    expect(ausgaben[1].output, 'aktuell, aber Abschnitt 4 offen').toMatch(/Zugänge zur Leittechnik \(OT\)\s+— offen —/);
    expect(ausgaben[2].output, 'nie geuebt').toMatch(/durchgeführt:\s+keine/);
    expect(ausgaben[3].output, 'offene Punkte mit Termin').toMatch(/alle mit Termin und Verantwortlichem/);
  });
});

// ── KRITIS-SC-009: die Frist beginnt nicht, wenn es passiert ────────────────

const PROZESS = '/etc/security/nis2/meldeprozess.md';
const LESEN9 = [
  'cat /etc/security/nis2/bewertung.txt',
  'cat /etc/security/nis2/bsig-auszug.txt',
];
const SCHREIBEN9 = [
  `echo "erstmeldung: 24" > ${PROZESS}`,
  `echo "folgemeldung: 72" >> ${PROZESS}`,
  `echo "abschluss: 30" >> ${PROZESS}`,
  `echo "beginn: kenntnisnahme" >> ${PROZESS}`,
];
const ersetze9 = (alt: string, neu: string) => SCHREIBEN9.map((z) => z.replace(alt, neu));

describe('KRITIS-SC-009 — die Uhr laeuft ab der Kenntnis', () => {
  it('der angesagte Weg loest', () => {
    expect(geloest('KRITIS-SC-009', [...LESEN9, ...SCHREIBEN9])).toBe(true);
  });

  it('beide Quellen muessen gelesen sein', () => {
    expect(geloest('KRITIS-SC-009', [LESEN9[0], ...SCHREIBEN9])).toBe(false);
    expect(geloest('KRITIS-SC-009', [LESEN9[1], ...SCHREIBEN9])).toBe(false);
  });

  it('ab dem Eintritt zu rechnen macht jede Meldung rueckwirkend ueberfaellig', () => {
    expect(geloest('KRITIS-SC-009', [...LESEN9, ...ersetze9('beginn: kenntnisnahme', 'beginn: vorfall')])).toBe(false);
  });

  it('auf die Bestaetigung zu warten heisst gar nicht zu melden', () => {
    expect(geloest('KRITIS-SC-009', [...LESEN9, ...ersetze9('beginn: kenntnisnahme', 'beginn: bestaetigung')])).toBe(false);
  });

  it('die Fristen selbst stehen im Gesetzesauszug, nicht in der Selbstbewertung', () => {
    const { ausgaben } = fahre('KRITIS-SC-009', LESEN9);
    expect(ausgaben[0].output, 'die Bewertung sagt nur, dass das Verfahren fehlt').toMatch(/Verfahren beschrieben\s+NEIN/);
    expect(ausgaben[1].output).toMatch(/KENNTNISERLANGUNG/);
  });

  it('lesen allein loest nicht — der Prozess IST das Ergebnis', () => {
    // Die Datei selbst legt die Kulissen-Saat schon an (jeder im Auftrag
    // genannte Pfad wird materialisiert, damit freies Umsehen zur Geschichte
    // passt). Leer ist sie trotzdem, und leer traegt sie nichts.
    const { shell, ziele } = fahre('KRITIS-SC-009', LESEN9);
    expect(shell.execute(`cat ${PROZESS}`).output, 'vorher steht keine Frist drin').not.toMatch(/erstmeldung/);
    expect(checkStateGoals(shell, ziele)).toBe(false);
  });
});

// ── KRITIS-SC-010: die Prioritaetenliste rechnet nicht ──────────────────────

const LASTPLAN = '/home/admin/lastplan.md';
const LESEN10 = ['cat /opt/monitoring/usv.txt', 'cat /opt/monitoring/systeme.txt'];
const plan10 = (abschalten: string, restlast: string, laufzeit: string) => [
  `echo "abschalten: ${abschalten}" > ${LASTPLAN}`,
  `echo "restlast: ${restlast}" >> ${LASTPLAN}`,
  `echo "laufzeit: ${laufzeit}" >> ${LASTPLAN}`,
];
const RICHTIG10 = plan10('test-umgebung, file-server, backup-srv, dev-server, historian-db', '2,2', '65');

describe('KRITIS-SC-010 — die Liste sagt „zuletzt", nicht „nie"', () => {
  it('der angesagte Weg loest', () => {
    expect(geloest('KRITIS-SC-010', [...LESEN10, ...RICHTIG10])).toBe(true);
  });

  it('der Punkt als Dezimaltrenner geht auch — die Schreibweise ist nicht die Antwort', () => {
    expect(geloest('KRITIS-SC-010', [...LESEN10, ...plan10(
      'test-umgebung, file-server, backup-srv, dev-server, historian-db', '2.2', '65',
    )])).toBe(true);
  });

  it('nur Stufe 3 und 4 abzuschalten reicht rechnerisch nicht', () => {
    // 2,7 kW ergeben 53 Minuten — die Prognose des Versorgers geht bis 60.
    expect(geloest('KRITIS-SC-010', [...LESEN10, ...plan10(
      'test-umgebung, file-server, backup-srv, dev-server', '2,7', '53',
    )])).toBe(false);
  });

  it('das Bedienbild abzuschalten gewinnt zehn Minuten und kostet die Sicht', () => {
    expect(geloest('KRITIS-SC-010', [...LESEN10, ...plan10(
      'test-umgebung, file-server, backup-srv, dev-server, historian-db, hmi-station', '1,9', '75',
    )])).toBe(false);
  });

  it('Stufe 1 ist tabu, auch wenn es rechnerisch passt', () => {
    expect(geloest('KRITIS-SC-010', [...LESEN10, ...plan10(
      'test-umgebung, file-server, backup-srv, dev-server, netz-technik', '2,2', '65',
    )])).toBe(false);
  });

  it('die richtige Auswahl mit falscher Rechnung faellt durch', () => {
    expect(geloest('KRITIS-SC-010', [...LESEN10, ...plan10(
      'test-umgebung, file-server, backup-srv, dev-server, historian-db', '2,2', '60',
    )])).toBe(false);
  });

  it('die Zahlen der Rechnung stehen wirklich in den Quellen', () => {
    const { ausgaben } = fahre('KRITIS-SC-010', [...LESEN10, 'cat /opt/monitoring/notfallplan.txt']);
    expect(ausgaben[0].output, '4,8 kW und 30 Minuten ergeben 2,4 kWh').toMatch(/4,8 kW[\s\S]*30 Minuten/);
    expect(ausgaben[1].output, 'und die Einzellasten').toMatch(/historian-db\s+0,5 kW/);
    expect(ausgaben[2].output, 'mit dem oberen Wert rechnen').toMatch(/45 bis 60 Minuten/);
  });
});

// ── KRITIS-SC-011: zwei Konten, ein Buchstabe Unterschied ───────────────────

const LAGE = '/home/secops/lagemeldung.md';
const SCHRITTE11 = [
  'cat /var/log/siem/alarme-2026-03-14.log',
  'ssh fs01',
  'cat /srv/betrieb/dienstkonten.txt',
  'sudo rm -f /home/svc-backup/.ssh/authorized_keys',
  'exit',
];
const MELDUNG11 = [
  `echo "einstieg: vpn" > ${LAGE}`,
  `echo "konto: svc-backup" >> ${LAGE}`,
  `echo "ot_erreicht: nein" >> ${LAGE}`,
];
const ersetze11 = (alt: string, neu: string) => MELDUNG11.map((z) => z.replace(alt, neu));

describe('KRITIS-SC-011 — das falsche Konto zu kappen kostet die Sicherung', () => {
  it('der angesagte Weg loest', () => {
    expect(geloest('KRITIS-SC-011', [...SCHRITTE11, ...MELDUNG11])).toBe(true);
  });

  it('das naheliegend falsche Konto: dienst-sicherung klingt genauso', () => {
    const falsch = SCHRITTE11.map((z) =>
      z.replace('/home/svc-backup/', '/home/dienst-sicherung/'));
    expect(zielErfuellt('KRITIS-SC-011', [...falsch, ...MELDUNG11], 2), 'der Angreifer ist noch drin').toBe(false);
    expect(zielErfuellt('KRITIS-SC-011', [...falsch, ...MELDUNG11], 3), 'und die Sicherung ist tot').toBe(false);
    expect(geloest('KRITIS-SC-011', [...falsch, ...MELDUNG11])).toBe(false);
  });

  it('beide zu kappen ist auch falsch — die Sicherung faehrt um 22:00', () => {
    const beide = [
      ...SCHRITTE11.slice(0, 4),
      'sudo rm -f /home/dienst-sicherung/.ssh/authorized_keys',
      'exit',
    ];
    expect(geloest('KRITIS-SC-011', [...beide, ...MELDUNG11])).toBe(false);
  });

  it('die Betriebsliste ist der einzige Unterschied — ohne sie ist es ein Muenzwurf', () => {
    const ohneListe = SCHRITTE11.filter((z) => !z.includes('dienstkonten'));
    expect(geloest('KRITIS-SC-011', [...ohneListe, ...MELDUNG11])).toBe(false);
  });

  it('„ot_erreicht: ja" ist eine Falschmeldung — die Versuche wurden abgewiesen', () => {
    expect(geloest('KRITIS-SC-011', [...SCHRITTE11, ...ersetze11('ot_erreicht: nein', 'ot_erreicht: ja')])).toBe(false);
  });

  it('der Einstieg war kein Exploit, sondern eine gueltige Anmeldung', () => {
    expect(geloest('KRITIS-SC-011', [...SCHRITTE11, ...ersetze11('einstieg: vpn', 'einstieg: mail')])).toBe(false);
    const { ausgaben } = fahre('KRITIS-SC-011', [SCHRITTE11[0]]);
    expect(ausgaben[0].output).toMatch(/Zugangsdaten waren abgeflossen, nicht/);
  });

  it('das Protokoll auf fs01 zeigt, wann das Konto entstanden ist', () => {
    const { ausgaben } = fahre('KRITIS-SC-011', ['ssh fs01', 'journalctl -u useradd']);
    expect(ausgaben[1].output).toMatch(/name=svc-backup/);
  });
});
