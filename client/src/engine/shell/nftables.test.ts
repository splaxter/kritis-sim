import { describe, it, expect } from 'vitest';
import {
  seedNftState, evaluatePacket, formatRuleset, ipInPrefix, parseRuleBody, istParseFehler,
} from './nftables';

/** Der Regelsatz der Perimeter-Kiste aus learn_fw_02_ruleset. */
const PERIMETER = {
  chains: [
    {
      name: 'input',
      base: { hook: 'input' as const, policy: 'drop' as const },
      rules: [
        'ct state established,related accept',
        'iif "lo" accept',
        // Die Ausnahme neben der Verwaltungsebene — steht VOR dem Sprung.
        'ip saddr 203.0.113.0/24 tcp dport 3389 accept',
        'jump webadmin',
      ],
    },
    {
      name: 'webadmin',
      rules: [
        'ip saddr 198.51.100.0/24 tcp dport 3389 accept',
        'ip saddr 10.0.10.0/24 tcp dport 443 accept',
      ],
    },
  ],
};

const paket = (from: string, port: number) => ({ saddr: from, dport: port });

describe('nftables — Praefixe', () => {
  it.each([
    ['203.0.113.66', '203.0.113.0/24', true],
    ['203.0.114.1', '203.0.113.0/24', false],
    ['10.0.10.40', '10.0.0.0/8', true],
    ['11.0.0.1', '10.0.0.0/8', false],
    ['198.51.100.7', '198.51.100.7', true],
    ['198.51.100.8', '198.51.100.7', false],
    ['1.2.3.4', '0.0.0.0/0', true],
  ])('%s in %s → %s', (ip, praefix, erwartet) => {
    expect(ipInPrefix(ip, praefix)).toBe(erwartet);
  });
});

describe('nftables — Parser', () => {
  it('liest Matches und Verdikt', () => {
    const r = parseRuleBody('ip saddr 10.0.0.0/8 tcp dport 22 accept'.split(' '));
    expect(istParseFehler(r)).toBe(false);
    if (istParseFehler(r)) return;
    expect(r.match).toEqual({ saddr: '10.0.0.0/8', proto: 'tcp', dport: 22 });
    expect(r.verdict).toEqual({ kind: 'accept' });
  });

  it('liest Spruenge', () => {
    const r = parseRuleBody(['jump', 'webadmin']);
    expect(istParseFehler(r) ? null : r.verdict).toEqual({ kind: 'jump', target: 'webadmin' });
  });

  it.each([
    ['ip saddr 10.0.0.0/8'],                      // kein Verdikt
    ['ip saddr 10.0.0.0/8 tcp dport 22 erlaube'], // erfundenes Verdikt
    ['meta l4proto tcp accept'],                  // nicht unterstuetzter Match
  ])('lehnt „%s" ab statt etwas zu erfinden', (zeile) => {
    expect(istParseFehler(parseRuleBody(zeile.split(' ')))).toBe(true);
  });
});

describe('nftables — Paketlauf', () => {
  const state = () => seedNftState(PERIMETER);

  it('die Ausnahme VOR dem Sprung entscheidet — die engere Regel dahinter wird nie erreicht', () => {
    const s = state();
    const trace = evaluatePacket(s, paket('203.0.113.66', 3389));
    expect(trace.verdict).toBe('accept');
    expect(trace.chain).toBe('input'); // nicht 'webadmin' — das ist der ganze Punkt
  });

  it('die Fernwartung wird in der gesprungenen Kette zugelassen', () => {
    const trace = evaluatePacket(state(), paket('198.51.100.7', 3389));
    expect(trace.verdict).toBe('accept');
    expect(trace.chain).toBe('webadmin');
  });

  it('was keine Regel trifft, faellt auf die Policy der Basiskette', () => {
    const trace = evaluatePacket(state(), paket('192.0.2.5', 3389));
    expect(trace.verdict).toBe('drop');
    expect(trace.byPolicy).toBe(true);
  });

  it('nach dem Loeschen der Ausnahme entscheidet die Policy — die Fernwartung bleibt', () => {
    const s = state();
    const input = s.tables[0].chains[0];
    input.rules = input.rules.filter(r => r.match.saddr !== '203.0.113.0/24');
    expect(evaluatePacket(s, paket('203.0.113.66', 3389)).verdict).toBe('drop');
    expect(evaluatePacket(s, paket('198.51.100.7', 3389)).verdict).toBe('accept');
  });

  it('ein leerer Regelsatz filtert nicht — ohne Basiskette entscheidet niemand', () => {
    expect(evaluatePacket({ tables: [], nextHandle: 1 }, paket('203.0.113.66', 3389)).verdict).toBe('accept');
  });

  it('ct state trifft nur den genannten Zustand', () => {
    const s = state();
    expect(evaluatePacket(s, { saddr: '192.0.2.5', dport: 3389, ctState: 'established' }).verdict).toBe('accept');
    expect(evaluatePacket(s, { saddr: '192.0.2.5', dport: 3389 }).verdict).toBe('drop');
  });
});

describe('nftables — Ausgabe', () => {
  it('druckt, was der Parser wieder lesen kann', () => {
    const text = formatRuleset(seedNftState(PERIMETER), true);
    expect(text).toContain('type filter hook input priority 0; policy drop;');
    expect(text).toContain('ip saddr 203.0.113.0/24 tcp dport 3389 accept # handle');
    expect(text).toContain('jump webadmin # handle');

    // Jede gedruckte Regelzeile muss durch den Parser gehen — sonst zeigt das
    // Spiel eine Syntax, die es selbst nicht versteht.
    const regelzeilen = text
      .split('\n')
      .map(z => z.trim().replace(/ # handle \d+$/, ''))
      .filter(z => z && !z.startsWith('table') && !z.startsWith('chain') && !z.startsWith('type ') && z !== '}');
    expect(regelzeilen.length).toBeGreaterThan(4);
    for (const zeile of regelzeilen) {
      expect(istParseFehler(parseRuleBody(zeile.split(/\s+/))), zeile).toBe(false);
    }
  });

  it('ohne -a stehen keine Handles in der Ausgabe', () => {
    expect(formatRuleset(seedNftState(PERIMETER), false)).not.toContain('handle');
  });

  it('ein unlesbarer Seed wirft, statt still etwas anderes zu bauen', () => {
    expect(() => seedNftState({ chains: [{ name: 'input', rules: ['ip saddr 10.0.0.0/8 erlaube'] }] })).toThrow(/nicht lesbar/);
    expect(() => seedNftState({ chains: [{ name: 'input', rules: ['jump gibtsnicht'] }] })).toThrow(/unbekannte Kette/);
  });
});
