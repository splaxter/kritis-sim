/**
 * Das Netzbild eines Levels — EIN Modell, das jede Messung beantwortet.
 *
 * Vorher hatte jeder Befehl seine eigene Wahrheit: `ping` las eine feste
 * Tabelle im Quelltext, `Test-NetConnection` hatte eine zweite — und fiel für
 * alles, was in keiner von beiden stand, auf `Math.random() > 0.5` zurück. Ein
 * Level, dessen BEWEIS ein Portscan ist („Port 8443 ist zu, 443 geht"), hat
 * damit gewürfelt. Deshalb steht hier ein Auswerter, den alle befragen:
 * `ping`, `nc`, `Test-NetConnection`, `nslookup`, `Resolve-DnsName`.
 *
 * Die Rangfolge ist die des echten Netzes:
 *
 * 1. Ist das Ziel ein REGISTRIERTER Host des Levels, entscheidet sein eigener
 *    Zustand — Regelwerk (nftables oder ufw) und Lauscher. Damit misst ein
 *    Portscan dasselbe, was `ss` auf der Kiste zeigt, und eine Sperre, die der
 *    Spieler setzt, ist von außen sofort sichtbar. Zwei Auswertungen wären
 *    zwei Wahrheiten.
 * 2. Sonst entscheidet die Zieltabelle des Levels (`net.targets`) — für alles,
 *    was keine Shell hat: Internet-Adressen, Geräte, Gegenstellen.
 * 3. Säht ein Level gar kein Netzbild, gilt die alte Standardtabelle weiter,
 *    damit bestehende Level ihre Messungen behalten.
 *
 * Säht ein Level ein Netzbild, gehört ihm das Bild GANZ: Was es nicht nennt
 * und nicht als Host führt, ist unerreichbar. Das ist die gleiche Regel wie
 * bei `listeners` — ein forensisches Level besitzt seine Sicht, statt sie mit
 * einer Grundausstattung zu mischen.
 */
import { TerminalNetSpec } from '@kritis/shared';
import { HostState } from './hosts';
import { evaluatePacket } from './nftables';

/** Was eine Portmessung ergibt. */
export type PortLage =
  /** Es lauscht etwas und das Regelwerk lässt durch. */
  | 'offen'
  /** Erreichbar, aber niemand nimmt ab (RST) — `Connection refused`. */
  | 'abgelehnt'
  /** Ein Regelwerk verschluckt das Paket (DROP) — es läuft in den Timeout. */
  | 'gefiltert'
  /** Das Ziel selbst antwortet gar nicht. */
  | 'unerreichbar';

export interface NetZiel {
  host: string;
  ip?: string;
  ping?: boolean;
  openPorts?: number[];
  filteredPorts?: number[];
  dienste?: Record<number, string>;
}

export interface NetState {
  /** Namensauflösung des Levels: Name → Adresse. */
  records: Record<string, string>;
  /** Die befragten Resolver, in Reihenfolge. */
  dnsServers: string[];
  /** Resolver, die nicht antworten. */
  dnsDown: string[];
  targets: NetZiel[];
  /** True, sobald ein Level ein eigenes Netzbild mitbringt. */
  seeded: boolean;
}

/**
 * Die alte fest verdrahtete Tabelle — sie gilt nur noch, solange ein Level
 * kein eigenes Netzbild mitbringt, damit bestehende Level nichts verlieren.
 */
const STANDARD_ZIELE: NetZiel[] = [
  { host: '127.0.0.1', ping: true, openPorts: [] },
  { host: 'localhost', ip: '127.0.0.1', ping: true, openPorts: [80] },
  { host: '8.8.8.8', ping: true, openPorts: [53], dienste: { 53: 'domain' } },
  { host: '1.1.1.1', ping: true, openPorts: [53], dienste: { 53: 'domain' } },
  { host: '10.0.0.1', ping: true, openPorts: [22, 80, 443], dienste: { 22: 'ssh', 80: 'http', 443: 'https' } },
  { host: '192.168.1.1', ping: true, openPorts: [80], dienste: { 80: 'http' } },
  { host: 'google.com', ip: '142.250.185.78', ping: true, openPorts: [80, 443] },
  { host: 'example.com', ip: '93.184.216.34', ping: true, openPorts: [80, 443] },
];

const STANDARD_RECORDS: Record<string, string> = {
  localhost: '127.0.0.1',
  'google.com': '142.250.185.78',
  'example.com': '93.184.216.34',
};

export function emptyNetState(): NetState {
  return {
    records: { ...STANDARD_RECORDS },
    dnsServers: ['8.8.8.8', '8.8.4.4'],
    dnsDown: [],
    targets: STANDARD_ZIELE.map(z => ({ ...z })),
    seeded: false,
  };
}

export function seedNetState(spec: TerminalNetSpec): NetState {
  return {
    records: { ...(spec.records ?? {}) },
    dnsServers: [...(spec.dnsServers ?? ['8.8.8.8'])],
    dnsDown: [...(spec.dnsDown ?? [])],
    targets: (spec.targets ?? []).map(z => ({ ...z })),
    seeded: true,
  };
}

const istIp = (wert: string): boolean => /^\d{1,3}(\.\d{1,3}){3}$/.test(wert);

/** Kennt das Level überhaupt einen Resolver, der antwortet? */
export function dnsAntwortet(net: NetState): boolean {
  return net.dnsServers.some(s => !net.dnsDown.includes(s));
}

export interface Aufloesung {
  ip?: string;
  /** 'kein-dns': kein Resolver antwortet. 'unbekannt': Resolver da, Name nicht. */
  fehler?: 'kein-dns' | 'unbekannt';
}

/**
 * Einen Namen auflösen.
 *
 * Adressen und registrierte Hosts brauchen keinen Resolver — die erste ist
 * schon eine Adresse, der zweite ist eine Maschine desselben Levels. Alles
 * andere geht über DNS, und genau das macht den Unterschied sichtbar, um den
 * es in einem DNS-Ausfall geht: Die Leitung steht, die Namen sind weg.
 */
export function aufloese(
  net: NetState,
  resolveHost: ((nameOrIp: string) => HostState | undefined) | undefined,
  name: string,
): Aufloesung {
  if (istIp(name)) return { ip: name };
  const host = resolveHost?.(name);
  if (host) return { ip: host.ip ?? '127.0.0.1' };
  const ausTabelle = net.records[name] ?? net.records[name.toLowerCase()];
  const ziel = net.targets.find(z => z.host.toLowerCase() === name.toLowerCase());
  const kandidat = ausTabelle ?? ziel?.ip;
  if (!dnsAntwortet(net)) return { fehler: 'kein-dns' };
  if (!kandidat) return { fehler: 'unbekannt' };
  return { ip: kandidat };
}

export interface PingErgebnis {
  erreichbar: boolean;
  ip: string;
  /** Deterministisch aus der Adresse abgeleitet — kein Würfel im Beweis. */
  latenz: number;
  ttl: number;
  /** Gesetzt, wenn der Name sich nicht auflösen ließ. */
  namensfehler?: 'kein-dns' | 'unbekannt';
}

/** Deterministische Laufzeit: gleiche Adresse, gleiche Zahl. */
function latenzFuer(ip: string): number {
  let summe = 0;
  for (let i = 0; i < ip.length; i++) summe += ip.charCodeAt(i);
  return Math.round((0.3 + (summe % 250) / 10) * 10) / 10;
}

function zielFuer(net: NetState, name: string, ip?: string): NetZiel | undefined {
  return net.targets.find(
    z => z.host.toLowerCase() === name.toLowerCase() || (ip !== undefined && (z.ip ?? z.host) === ip)
  );
}

export function pingZiel(
  net: NetState,
  resolveHost: ((nameOrIp: string) => HostState | undefined) | undefined,
  name: string,
): PingErgebnis {
  const host = resolveHost?.(name);
  if (host) {
    const ip = host.ip ?? '127.0.0.1';
    return { erreichbar: true, ip, latenz: latenzFuer(ip), ttl: 64 };
  }
  const auf = aufloese(net, resolveHost, name);
  if (auf.fehler) {
    return { erreichbar: false, ip: name, latenz: 0, ttl: 0, namensfehler: auf.fehler };
  }
  const ziel = zielFuer(net, name, auf.ip);
  const erreichbar = ziel ? ziel.ping !== false : false;
  const ip = auf.ip ?? name;
  return { erreichbar, ip, latenz: latenzFuer(ip), ttl: ip.startsWith('10.') || ip.startsWith('192.168.') ? 64 : 117 };
}

/**
 * Lässt das Regelwerk des Ziel-Hosts ein Paket von `quelle` auf `port` durch?
 *
 * Erst nftables (wenn die Kiste ein Regelwerk hat, entscheidet es), sonst ufw.
 * Das ist dieselbe Reihenfolge, in der eine echte Kiste filtert, und es ist
 * derselbe Auswerter, den `nft` und das `nftVerdict`-Ziel benutzen.
 */
export function regelwerkUrteil(
  ziel: HostState,
  quelleIp: string | undefined,
  port: number,
  proto: 'tcp' | 'udp' = 'tcp',
): 'accept' | 'drop' | 'reject' {
  if (ziel.nft.tables.length > 0) {
    return evaluatePacket(
      ziel.nft,
      { saddr: quelleIp ?? '0.0.0.0', daddr: ziel.ip, dport: port, proto },
      'input',
    ).verdict;
  }
  const fw = ziel.firewall;
  if (!fw.enabled) return 'accept';
  const regeln = fw.rules.filter(r => r.port === port && (!r.proto || r.proto === proto));
  if (regeln.some(r => r.action === 'deny' && (!r.from || quelleIp === r.from))) return 'drop';
  const zugelassen = regeln.some(
    r => r.action === 'allow' && (!r.from || (quelleIp !== undefined && quelleIp === r.from))
  );
  if (zugelassen) return 'accept';
  return fw.defaultIncoming === 'deny' ? 'drop' : 'accept';
}

export interface PortErgebnis {
  lage: PortLage;
  ip: string;
  dienst?: string;
  namensfehler?: 'kein-dns' | 'unbekannt';
}

const DIENSTNAMEN: Record<number, string> = {
  22: 'ssh', 25: 'smtp', 53: 'domain', 80: 'http', 102: 'iso-tsap', 123: 'ntp',
  143: 'imap', 443: 'https', 445: 'microsoft-ds', 502: 'mbap', 3306: 'mysql',
  3389: 'ms-wbt-server', 5432: 'postgresql', 8080: 'http-alt', 8443: 'https-alt',
};

export function dienstName(port: number): string | undefined {
  return DIENSTNAMEN[port];
}

export function portMessen(
  net: NetState,
  resolveHost: ((nameOrIp: string) => HostState | undefined) | undefined,
  quelle: HostState | undefined,
  name: string,
  port: number,
  proto: 'tcp' | 'udp' = 'tcp',
): PortErgebnis {
  const host = resolveHost?.(name);
  if (host) {
    const ip = host.ip ?? '127.0.0.1';
    const urteil = regelwerkUrteil(host, quelle?.ip, port, proto);
    if (urteil === 'drop') return { lage: 'gefiltert', ip, dienst: dienstName(port) };
    if (urteil === 'reject') return { lage: 'abgelehnt', ip, dienst: dienstName(port) };
    const lauscht = host.listeners.some(l => l.port === port && l.proto === proto);
    return { lage: lauscht ? 'offen' : 'abgelehnt', ip, dienst: dienstName(port) };
  }

  const auf = aufloese(net, resolveHost, name);
  if (auf.fehler) return { lage: 'unerreichbar', ip: name, namensfehler: auf.fehler };
  const ip = auf.ip ?? name;
  const ziel = zielFuer(net, name, ip);
  if (!ziel || ziel.ping === false) return { lage: 'unerreichbar', ip };
  const dienst = ziel.dienste?.[port] ?? dienstName(port);
  if (ziel.filteredPorts?.includes(port)) return { lage: 'gefiltert', ip, dienst };
  if (ziel.openPorts?.includes(port)) return { lage: 'offen', ip, dienst };
  return { lage: 'abgelehnt', ip, dienst };
}
