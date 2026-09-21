import { describe, it, expect } from 'vitest';
import { TerminalNetSpec, TerminalHostSpec } from '@kritis/shared';
import { createShellFromContext } from './index';

/**
 * Das Netzbild — EIN Modell fuer alle Messbefehle.
 *
 * Der Anlass ist ein Befund, kein Wunsch: `Test-NetConnection` hatte eine
 * eigene kleine Tabelle und fiel fuer alles ausserhalb auf
 * `Math.random() > 0.5` zurueck. Ein Level, dessen BEWEIS dieser Befehl ist
 * („Port 8443 ist zu, 443 geht"), hat also gewuerfelt — und zwei Messungen
 * desselben Ports konnten sich widersprechen. Diese Pruefungen halten fest,
 * dass eine Messung jetzt (a) reproduzierbar ist, (b) dasselbe sagt wie die
 * Kiste selbst, und (c) zwischen „kein Dienst" und „Filter davor"
 * unterscheidet.
 */

function shellMit(opts: { net?: TerminalNetSpec; hosts?: TerminalHostSpec[]; type?: 'linux' | 'windows' }) {
  return createShellFromContext({
    type: opts.type ?? 'linux',
    hostname: opts.type === 'windows' ? 'PC-ADMIN' : 'mess-srv',
    username: opts.type === 'windows' ? 'admin' : 'root',
    currentPath: opts.type === 'windows' ? 'C:\\Users\\admin' : '/root',
    commands: [],
    solutions: [],
    hints: [],
    net: opts.net,
    hosts: opts.hosts,
  });
}

const ZIEL: TerminalHostSpec = {
  id: 'plc03',
  hostname: 'plc03.werk.local',
  ip: '10.0.0.12',
  listeners: [
    { proto: 'tcp', port: 22, pid: 456, program: 'sshd' },
    { proto: 'tcp', port: 80, pid: 900, program: 'httpd' },
  ],
};

describe('Eine Messung ist reproduzierbar', () => {
  it('zweimal derselbe Port, zweimal dasselbe Ergebnis — auch fuer ein unbekanntes Ziel', () => {
    // Die Gegenprobe zum Wuerfel: Frueher entschied hier Math.random().
    const shell = shellMit({ net: { targets: [{ host: '198.51.100.9', openPorts: [443] }] }, type: 'windows' });
    const ergebnisse = new Set<string>();
    for (let i = 0; i < 12; i++) {
      ergebnisse.add(shell.execute('Test-NetConnection -ComputerName 198.51.100.9 -Port 8443').output);
    }
    expect(ergebnisse.size, 'dieselbe Frage, verschiedene Antworten').toBe(1);
    expect([...ergebnisse][0]).toContain('TcpTestSucceeded : False');
    expect(shell.execute('Test-NetConnection -ComputerName 198.51.100.9 -Port 443').output)
      .toContain('TcpTestSucceeded : True');
  });
});

describe('Ein registrierter Host misst sich selbst', () => {
  it('nc -z sagt dasselbe wie die Lauscherliste der Kiste', () => {
    const shell = shellMit({ net: {}, hosts: [ZIEL] });
    expect(shell.execute('nc -zv plc03 80').exitCode, 'Port 80 lauscht').toBe(0);
    expect(shell.execute('nc -zv plc03 502').exitCode, 'Port 502 lauscht nicht').toBe(1);
    expect(shell.execute('nc -zv plc03 502').error).toMatch(/Connection refused/);
  });

  it('unterscheidet „kein Dienst" (refused) von „Filter davor" (timeout)', () => {
    const shell = shellMit({
      net: {},
      hosts: [{ ...ZIEL, firewall: { enabled: true, defaultIncoming: 'deny', rules: [{ action: 'allow', port: 22 }] } }],
    });
    // 22 ist erlaubt UND lauscht.
    expect(shell.execute('nc -zv plc03 22').exitCode).toBe(0);
    // 80 lauscht, aber die Regel laesst es nicht durch: das Paket verschwindet.
    expect(shell.execute('nc -zv plc03 80').error, 'geblockt heisst Zeitueberschreitung').toMatch(/timed out/);
    // 502 ist erlaubt (nein: default deny) — hier zaehlt der Unterschied zu 80
    // nicht, beide sind gefiltert. Deshalb ein Host ohne Wall als Gegenprobe:
    const offen = shellMit({ net: {}, hosts: [ZIEL] });
    expect(offen.execute('nc -zv plc03 502').error, 'ohne Wall lehnt die Kiste ab').toMatch(/refused/);
  });

  it('eine nftables-Sperre wirkt von aussen sofort', () => {
    const shell = shellMit({
      net: {},
      hosts: [{
        ...ZIEL,
        nft: {
          chains: [{
            name: 'input',
            base: { hook: 'input', policy: 'accept' },
            rules: ['tcp dport 80 drop'],
          }],
        },
      }],
    });
    expect(shell.execute('nc -zv plc03 80').error).toMatch(/timed out/);
    expect(shell.execute('nc -zv plc03 22').exitCode, 'der Rest bleibt erreichbar').toBe(0);
  });

  it('misst den LEBENDEN Zustand, nicht den gesaeten', () => {
    // Der eigentliche Punkt: Die Messung liest dieselbe Tabelle, die `ss` auf
    // der Kiste zeigt und die ein `kill` veraendert — keine Kopie vom Start.
    const shell = shellMit({ net: {}, hosts: [ZIEL] });
    expect(shell.execute('nc -z plc03 80').exitCode).toBe(0);
    const ziel = shell.getHost('plc03')!;
    ziel.listeners = ziel.listeners.filter(l => l.port !== 80);
    expect(shell.execute('nc -z plc03 80').exitCode, 'der Dienst ist beendet').toBe(1);
  });
});

describe('Saeht ein Level ein Netzbild, gehoert ihm das Bild ganz', () => {
  it('was nicht genannt ist und kein Host ist, bleibt unerreichbar', () => {
    const shell = shellMit({ net: { targets: [{ host: '10.0.0.5' }] } });
    expect(shell.execute('ping -c 1 10.0.0.5').exitCode).toBe(0);
    expect(shell.execute('ping -c 1 8.8.8.8').exitCode, 'nicht genannt = nicht da').toBe(1);
  });

  it('ohne Saat gilt die alte Standardtabelle weiter', () => {
    const shell = shellMit({});
    expect(shell.execute('ping -c 1 8.8.8.8').exitCode).toBe(0);
  });

  it('ein Ziel mit ping:false antwortet auf gar nichts', () => {
    const shell = shellMit({ net: { targets: [{ host: '10.0.0.77', ping: false, openPorts: [22] }] } });
    expect(shell.execute('ping -c 1 10.0.0.77').exitCode).toBe(1);
    expect(shell.execute('nc -z 10.0.0.77 22').exitCode, 'eine tote Kiste hat keine offenen Ports').toBe(1);
  });
});

describe('Namen und Leitung sind zwei verschiedene Dinge', () => {
  const AUSFALL: TerminalNetSpec = {
    dnsServers: ['10.10.1.10'],
    dnsDown: ['10.10.1.10'],
    records: { 'google.de': '142.250.185.78' },
    targets: [
      { host: '8.8.8.8', openPorts: [53] },
      { host: '142.250.185.78', openPorts: [443] },
    ],
  };

  it('die Leitung steht, die Namen sind weg', () => {
    const shell = shellMit({ net: AUSFALL });
    expect(shell.execute('ping -c 1 8.8.8.8').exitCode, 'Adresse geht').toBe(0);
    const name = shell.execute('ping -c 1 google.de');
    // Echtes ping meldet einen Namensfehler mit 2, nicht mit 1 — der
    // Unterschied zu „gesendet, keine Antwort" steckt schon im Rueckgabewert.
    expect(name.exitCode, 'Name geht nicht').toBe(2);
    expect(name.error).toMatch(/Name or service not known/);
    expect(shell.execute('nslookup google.de').output, 'der Resolver schweigt')
      .toMatch(/no servers could be reached/);
  });

  it('ein antwortender Resolver loest denselben Namen auf', () => {
    const shell = shellMit({ net: { ...AUSFALL, dnsDown: [] } });
    expect(shell.execute('ping -c 1 google.de').exitCode).toBe(0);
    expect(shell.execute('nslookup google.de').output).toContain('142.250.185.78');
  });

  it('Set-DnsClientServerAddress wirkt wirklich', () => {
    const shell = shellMit({ net: { ...AUSFALL, dnsServers: ['10.10.1.10', '1.1.1.1'], dnsDown: ['10.10.1.10'] }, type: 'windows' });
    expect(shell.execute('Resolve-DnsName google.de').exitCode, 'ein toter Resolver in der Liste reicht nicht zum Scheitern').toBe(0);
    const nurTot = shellMit({ net: AUSFALL, type: 'windows' });
    expect(nurTot.execute('Resolve-DnsName google.de').exitCode).toBe(1);
    expect(nurTot.execute('Set-DnsClientServerAddress -InterfaceIndex 12 -ServerAddresses 1.1.1.1').exitCode).toBe(0);
    expect(nurTot.execute('Resolve-DnsName google.de').exitCode, 'nach dem Umstellen loest es auf').toBe(0);
    expect(nurTot.execute('Get-DnsClientServerAddress').output).toContain('1.1.1.1');
  });
});

describe('Windows und Linux messen dasselbe Netz', () => {
  it('Test-NetConnection und nc kommen zum selben Urteil', () => {
    const net: TerminalNetSpec = {
      targets: [{ host: 'ziel-server.warm.local', ip: '10.10.5.100', openPorts: [443] }],
    };
    const win = shellMit({ net, type: 'windows' });
    const lin = shellMit({ net });
    for (const [port, erwartet] of [[443, true], [8443, false]] as const) {
      const w = win.execute(`Test-NetConnection ziel-server.warm.local -Port ${port}`);
      const l = lin.execute(`nc -z ziel-server.warm.local ${port}`);
      expect(w.output.includes('TcpTestSucceeded : True'), `Windows/${port}`).toBe(erwartet);
      expect(l.exitCode === 0, `Linux/${port}`).toBe(erwartet);
    }
  });
});
