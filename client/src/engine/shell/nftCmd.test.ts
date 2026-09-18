import { describe, it, expect } from 'vitest';
import type { TerminalContext } from '@kritis/shared';
import { createShellFromContext } from './index';
import { evaluatePacket } from './nftables';

/**
 * Der Befehl gegen die ECHTE Shell — nicht gegen das Modell darunter.
 * Was hier nicht gruen ist, kann der Spieler nicht tippen.
 */
const CTX: TerminalContext = {
  type: 'linux',
  hostname: 'fw01',
  username: 'root',
  currentPath: '/root',
  taskText: '',
  nft: {
    chains: [
      {
        name: 'input',
        base: { hook: 'input', policy: 'drop' },
        rules: [
          'ct state established,related accept',
          'iif "lo" accept',
          'ip saddr 203.0.113.0/24 tcp dport 3389 accept',
          'jump webadmin',
        ],
      },
      { name: 'webadmin', rules: ['ip saddr 198.51.100.0/24 tcp dport 3389 accept'] },
    ],
  },
  commands: [],
  solutions: [],
  hints: [],
};

const shell = () => createShellFromContext(CTX);
const nft = (s: ReturnType<typeof shell>) => s.getHost('local')!.nft;

describe('nft — lesen', () => {
  it('list ruleset zeigt Tabelle, Ketten, Policy und Regeln', () => {
    const r = shell().execute('nft list ruleset');
    expect(r.exitCode).toBe(0);
    expect(r.output).toContain('table inet filter {');
    expect(r.output).toContain('chain input {');
    expect(r.output).toContain('type filter hook input priority 0; policy drop;');
    expect(r.output).toContain('jump webadmin');
    expect(r.output).not.toContain('handle');
  });

  it('-a blendet die Handles ein — ohne sie kann niemand loeschen', () => {
    const r = shell().execute('nft -a list ruleset');
    expect(r.output).toMatch(/ip saddr 203\.0\.113\.0\/24 tcp dport 3389 accept # handle \d+/);
  });

  it('list chain zeigt nur die gefragte Kette', () => {
    const r = shell().execute('nft list chain inet filter webadmin');
    expect(r.output).toContain('chain webadmin {');
    expect(r.output).not.toContain('chain input {');
  });

  it('ohne root verweigert nft auch das Lesen', () => {
    const s = createShellFromContext({ ...CTX, username: 'deploy' });
    const r = s.execute('nft list ruleset');
    expect(r.exitCode).toBe(1);
    expect(r.error).toContain('Operation not permitted');
  });

  it('eine unbekannte Tabelle ist ein Fehler, keine leere Ausgabe', () => {
    const r = shell().execute('nft list table inet gibtsnicht');
    expect(r.exitCode).toBe(1);
  });
});

describe('nft — aendern', () => {
  it('delete rule … handle N entfernt genau diese Regel', () => {
    const s = shell();
    const handle = nft(s).tables[0].chains[0].rules.find(r => r.match.saddr === '203.0.113.0/24')!.handle;
    expect(s.execute(`nft delete rule inet filter input handle ${handle}`).exitCode).toBe(0);
    expect(s.execute('nft list ruleset').output).not.toContain('203.0.113.0/24');
    // Und die Wirkung, nicht nur der Text:
    expect(evaluatePacket(nft(s), { saddr: '203.0.113.66', dport: 3389 }).verdict).toBe('drop');
    expect(evaluatePacket(nft(s), { saddr: '198.51.100.7', dport: 3389 }).verdict).toBe('accept');
  });

  it('ein unbekanntes Handle schlaegt fehl', () => {
    expect(shell().execute('nft delete rule inet filter input handle 999').exitCode).toBe(1);
  });

  it('insert setzt DAVOR und ueberstimmt damit die Ausnahme', () => {
    const s = shell();
    expect(s.execute('nft insert rule inet filter input ip saddr 203.0.113.66 tcp dport 3389 drop').exitCode).toBe(0);
    expect(evaluatePacket(nft(s), { saddr: '203.0.113.66', dport: 3389 }).verdict).toBe('drop');
    expect(evaluatePacket(nft(s), { saddr: '198.51.100.7', dport: 3389 }).verdict).toBe('accept');
  });

  it('add haengt ans Ende — dieselbe Regel wirkt dort NICHT mehr', () => {
    const s = shell();
    expect(s.execute('nft add rule inet filter input ip saddr 203.0.113.66 tcp dport 3389 drop').exitCode).toBe(0);
    // Die Ausnahme davor hat schon entschieden: Erst-Treffer.
    expect(evaluatePacket(nft(s), { saddr: '203.0.113.66', dport: 3389 }).verdict).toBe('accept');
  });

  it('flush chain leert eine Kette, flush ruleset den ganzen Satz', () => {
    const s = shell();
    expect(s.execute('nft flush chain inet filter webadmin').exitCode).toBe(0);
    expect(evaluatePacket(nft(s), { saddr: '198.51.100.7', dport: 3389 }).verdict).toBe('drop');
    expect(s.execute('nft flush ruleset').exitCode).toBe(0);
    expect(s.execute('nft list ruleset').output).toBe('');
  });

  it('ein Sprung in eine unbekannte Kette wird abgelehnt', () => {
    expect(shell().execute('nft add rule inet filter input jump gibtsnicht').exitCode).toBe(1);
  });

  it.each([
    'nft',
    'nft liste ruleset',
    'nft add rule inet filter input ip saddr 10.0.0.0/8 erlaube',
    'nft add regel inet filter input accept',
  ])('„%s" antwortet mit einem Syntaxfehler statt etwas zu erfinden', (zeile) => {
    const r = shell().execute(zeile);
    expect(r.exitCode).toBe(1);
    expect(r.error).toMatch(/syntax error|not permitted|No such file/);
  });

  it('was nft druckt, liest nft auch wieder', () => {
    const s = shell();
    s.execute('nft flush chain inet filter webadmin');
    expect(s.execute('nft add rule inet filter webadmin ip saddr 10.0.10.0/24 tcp dport 443 accept').exitCode).toBe(0);
    expect(s.execute('nft list chain inet filter webadmin').output).toContain('ip saddr 10.0.10.0/24 tcp dport 443 accept');
  });
});
