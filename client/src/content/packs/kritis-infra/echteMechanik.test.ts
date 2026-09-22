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
