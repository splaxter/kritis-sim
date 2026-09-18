/**
 * Das WebAdmin-Regelwerk und der Testverkehr darin.
 *
 * Die Regelliste der Oberflaeche wird in einen nftables-Regelsatz uebersetzt
 * und von DERSELBEN Auswertung gelaufen, die auch das `nftVerdict`-Ziel und
 * die Konsole benutzen. Das ist Absicht: Haette die Oberflaeche ihre eigene
 * Auswertung, waere der Unterschied zwischen dem WebAdmin-Level und dem
 * Konsolen-Level ein Programmierfehler statt einer Aussage ueber die
 * Wirklichkeit — und der Testverkehr waere eine Behauptung der Oberflaeche
 * ueber sich selbst.
 */
import type { PerimeterRule, PerimeterProbe } from '@kritis/shared';
import {
  NftState, NftRule, NftMatch, evaluatePacket, emptyNftState,
} from './shell/nftables';

/** '3389/tcp' → { dport: 3389, proto: 'tcp' }; 'any' → {}. */
export function parseDienst(service: string): { dport?: number; proto?: 'tcp' | 'udp' } {
  const m = service.trim().match(/^(\d+)(?:\/(tcp|udp))?$/);
  if (!m) return {};
  return { dport: parseInt(m[1], 10), proto: (m[2] as 'tcp' | 'udp') ?? 'tcp' };
}

/** Die sichtbare Regelliste als Regelsatz — abgeschaltete Regeln fallen weg. */
export function alsRegelsatz(rules: readonly PerimeterRule[]): NftState {
  const state = emptyNftState();
  const nftRules: NftRule[] = [];

  for (const r of rules) {
    if (r.disabled) continue;
    const { dport, proto } = parseDienst(r.service);
    const match: NftMatch = {};
    if (r.source !== 'any') match.saddr = r.source;
    if (r.dest !== 'any') match.daddr = r.dest;
    if (dport !== undefined) {
      match.dport = dport;
      match.proto = proto;
    }
    nftRules.push({
      // Das Handle ist hier die ZEILENNUMMER der Oberflaeche: So kann der
      // Treffer des Testverkehrs wieder einer angezeigten Regel zugeordnet
      // werden, ohne eine zweite Auswertung zu bauen.
      handle: rules.indexOf(r) + 1,
      match,
      verdict: { kind: r.action === 'allow' ? 'accept' : 'drop' },
    });
  }

  state.tables.push({
    family: 'inet',
    name: 'webadmin',
    handle: 0,
    chains: [{
      name: 'regelwerk',
      handle: 0,
      // Was keine Regel trifft, kommt nicht durch — die uebliche Grundhaltung
      // einer Perimeter-Firewall und das, was die Schlussregel ausdrueckt.
      base: { type: 'filter', hook: 'input', priority: 0, policy: 'drop' },
      rules: nftRules,
    }],
  });
  return state;
}

export interface ProbeErgebnis {
  /** Zeilennummer (1-basiert) der treffenden Regel, oder null bei Durchfall. */
  regelNummer: number | null;
  regel?: PerimeterRule;
  zugelassen: boolean;
}

/** Einen hinterlegten Testverkehr durchs Regelwerk schicken. */
export function pruefeVerkehr(rules: readonly PerimeterRule[], probe: PerimeterProbe): ProbeErgebnis {
  const { dport, proto } = parseDienst(probe.service);
  const trace = evaluatePacket(alsRegelsatz(rules), {
    saddr: probe.source,
    daddr: probe.dest,
    dport: dport ?? 0,
    proto,
  });
  const nummer = trace.byPolicy ? null : trace.handle ?? null;
  return {
    regelNummer: nummer,
    regel: nummer === null ? undefined : rules[nummer - 1],
    zugelassen: trace.verdict === 'accept',
  };
}
