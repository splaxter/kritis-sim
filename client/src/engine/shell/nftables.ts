/**
 * nftables: Modell, Parser, Ausgabe und Paketlauf.
 *
 * Der Punkt dieses Moduls ist der Paketlauf. Eine Regelliste sagt nicht, was
 * eine Kiste tut — die REIHENFOLGE sagt es, und mit `jump` liegt die
 * entscheidende Regel womoeglich in einer ganz anderen Kette als die, die eine
 * Oberflaeche anzeigt. Deshalb gibt es hier genau EINE Auswertung, die sowohl
 * das `nftVerdict`-Ziel als auch den Testverkehr der WebAdmin-App traegt:
 * Haetten beide je eine eigene, waere der Unterschied zwischen den beiden
 * Leveln ein Programmierfehler statt einer Aussage ueber die Wirklichkeit.
 *
 * Geparst wird mit DEMSELBEN Parser, mit dem `nft add rule` arbeitet. Ein
 * Level kann also keinen Regelsatz saeen, den der Spieler nicht auch tippen
 * koennte — und keine Syntax, die es in echt nicht gibt.
 */

export type NftFamily = 'inet' | 'ip' | 'ip6';

/** Die Matches, die dieses Spiel kennt. Alles andere lehnt der Parser ab. */
export interface NftMatch {
  /** `ip saddr <adresse|praefix>` */
  saddr?: string;
  /** `ip daddr <adresse|praefix>` */
  daddr?: string;
  /** `tcp dport <n>` / `udp dport <n>` */
  proto?: 'tcp' | 'udp';
  dport?: number;
  /** `ct state established,related` */
  ctState?: string[];
  /** `iif "lo"` */
  iif?: string;
}

/** Urteile, die den Lauf beenden — im Gegensatz zu `return` und den Spruengen. */
export type NftFinalVerdict = 'accept' | 'drop' | 'reject';

export type NftVerdict =
  | { kind: NftFinalVerdict }
  | { kind: 'return' }
  | { kind: 'jump' | 'goto'; target: string };

export interface NftRule {
  handle: number;
  match: NftMatch;
  verdict: NftVerdict;
}

export interface NftBaseSpec {
  type: 'filter';
  hook: 'input' | 'output' | 'forward';
  priority: number;
  policy: 'accept' | 'drop';
}

export interface NftChain {
  name: string;
  handle: number;
  /** Gesetzt = Basiskette (haengt an einem Hook und hat eine Policy). */
  base?: NftBaseSpec;
  rules: NftRule[];
}

export interface NftTable {
  family: NftFamily;
  name: string;
  handle: number;
  chains: NftChain[];
}

export interface NftState {
  tables: NftTable[];
  /** Fortlaufend wie bei echtem nft: Handles werden nie wiederverwendet. */
  nextHandle: number;
}

export const emptyNftState = (): NftState => ({ tables: [], nextHandle: 1 });

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

export interface ParseFehler {
  /** Das Token, an dem es scheiterte — echtes nft nennt es genauso. */
  token: string;
}

const VERDIKTE = new Set(['accept', 'drop', 'reject', 'return']);

/**
 * Einen Regelkoerper in nft-Syntax lesen: Matches, dann genau ein Verdikt.
 *
 * Bewusst streng: Was hier nicht steht, gibt es im Spiel nicht — lieber ein
 * Syntaxfehler als ein erfundener Ausdruck, den der Spieler sich merkt.
 */
export function parseRuleBody(tokens: string[]): { match: NftMatch; verdict: NftVerdict } | ParseFehler {
  const match: NftMatch = {};
  let i = 0;

  while (i < tokens.length) {
    const t = tokens[i];

    if (t === 'ip' && (tokens[i + 1] === 'saddr' || tokens[i + 1] === 'daddr') && tokens[i + 2]) {
      if (tokens[i + 1] === 'saddr') match.saddr = tokens[i + 2];
      else match.daddr = tokens[i + 2];
      i += 3;
      continue;
    }
    if ((t === 'tcp' || t === 'udp') && tokens[i + 1] === 'dport' && /^\d+$/.test(tokens[i + 2] ?? '')) {
      match.proto = t;
      match.dport = parseInt(tokens[i + 2], 10);
      i += 3;
      continue;
    }
    if (t === 'ct' && tokens[i + 1] === 'state' && tokens[i + 2]) {
      match.ctState = tokens[i + 2].split(',').filter(Boolean);
      i += 3;
      continue;
    }
    if (t === 'iif' && tokens[i + 1]) {
      match.iif = tokens[i + 1].replace(/^"|"$/g, '');
      i += 2;
      continue;
    }
    break;
  }

  const rest = tokens.slice(i);
  if (rest.length === 1 && VERDIKTE.has(rest[0])) {
    return { match, verdict: { kind: rest[0] as NftFinalVerdict | 'return' } };
  }
  if (rest.length === 2 && (rest[0] === 'jump' || rest[0] === 'goto')) {
    return { match, verdict: { kind: rest[0], target: rest[1] } };
  }
  return { token: rest[0] ?? tokens[tokens.length - 1] ?? 'end of file' };
}

export const istParseFehler = (x: unknown): x is ParseFehler =>
  typeof x === 'object' && x !== null && 'token' in x;

// ---------------------------------------------------------------------------
// Ausgabe — so, wie `nft list ruleset` sie druckt
// ---------------------------------------------------------------------------

export function formatMatch(m: NftMatch): string {
  const teile: string[] = [];
  if (m.ctState) teile.push(`ct state ${m.ctState.join(',')}`);
  if (m.iif) teile.push(`iif "${m.iif}"`);
  if (m.saddr) teile.push(`ip saddr ${m.saddr}`);
  if (m.daddr) teile.push(`ip daddr ${m.daddr}`);
  if (m.proto && m.dport !== undefined) teile.push(`${m.proto} dport ${m.dport}`);
  return teile.join(' ');
}

export function formatVerdict(v: NftVerdict): string {
  return v.kind === 'jump' || v.kind === 'goto' ? `${v.kind} ${v.target}` : v.kind;
}

export const formatRule = (r: NftRule): string =>
  [formatMatch(r.match), formatVerdict(r.verdict)].filter(Boolean).join(' ');

function formatChain(chain: NftChain, handles: boolean): string[] {
  const zeilen = [`\tchain ${chain.name} {`];
  if (chain.base) {
    const b = chain.base;
    zeilen.push(`\t\ttype ${b.type} hook ${b.hook} priority ${b.priority}; policy ${b.policy};`);
  }
  for (const r of chain.rules) {
    zeilen.push(`\t\t${formatRule(r)}${handles ? ` # handle ${r.handle}` : ''}`);
  }
  zeilen.push('\t}');
  return zeilen;
}

export function formatTable(table: NftTable, handles: boolean): string {
  const kopf = `table ${table.family} ${table.name} {${handles ? ` # handle ${table.handle}` : ''}`;
  const zeilen = [kopf];
  table.chains.forEach((c, i) => {
    if (i > 0) zeilen.push('');
    zeilen.push(...formatChain(c, handles));
  });
  zeilen.push('}');
  return zeilen.join('\n');
}

export const formatRuleset = (state: NftState, handles: boolean): string =>
  state.tables.map(t => formatTable(t, handles)).join('\n');

// ---------------------------------------------------------------------------
// Paketlauf
// ---------------------------------------------------------------------------

export interface NftPacket {
  /** Absenderadresse, z. B. '203.0.113.66'. */
  saddr: string;
  /** Zieladresse — im WebAdmin auch ein Name ('leitstand-hmi'). */
  daddr?: string;
  dport: number;
  proto?: 'tcp' | 'udp';
  /** Verbindungszustand; ohne Angabe 'new' — ein frischer Verbindungsversuch. */
  ctState?: string;
  /** Eingangsschnittstelle; ohne Angabe 'eth0'. */
  iif?: string;
}

export interface NftTrace {
  /** Das Urteil, das die Kiste faellt. */
  verdict: 'accept' | 'drop' | 'reject';
  /** Wo es fiel: Kette und Handle der treffenden Regel — oder die Policy. */
  chain: string;
  handle?: number;
  /** True, wenn keine Regel traf und die Ketten-Policy entschied. */
  byPolicy: boolean;
}

/** IPv4: liegt `ip` in `prefix` ('10.0.0.0/8', '10.0.0.5' oder 'any')? */
export function ipInPrefix(ip: string, prefix: string): boolean {
  if (prefix === 'any' || prefix === '0.0.0.0/0') return true;
  const [netz, bitsRoh] = prefix.split('/');
  const bits = bitsRoh === undefined ? 32 : parseInt(bitsRoh, 10);
  if (!Number.isFinite(bits) || bits < 0 || bits > 32) return false;
  const zuZahl = (a: string): number | null => {
    const teile = a.split('.');
    if (teile.length !== 4) return null;
    let n = 0;
    for (const t of teile) {
      if (!/^\d{1,3}$/.test(t)) return null;
      const oktett = parseInt(t, 10);
      if (oktett > 255) return null;
      n = (n << 8) | oktett;
    }
    return n >>> 0;
  };
  const a = zuZahl(ip);
  const b = zuZahl(netz);
  if (a === null || b === null) return false;
  if (bits === 0) return true;
  const maske = (0xffffffff << (32 - bits)) >>> 0;
  return (a & maske) >>> 0 === (b & maske) >>> 0;
}

/**
 * Adresse gegen Muster. IPv4 gegen Praefix rechnet `ipInPrefix`; steht auf
 * einer der beiden Seiten ein NAME (im WebAdmin heisst das Ziel
 * 'leitstand-hmi', nicht 10.0.5.7), wird verglichen statt gerechnet. 'any'
 * trifft immer.
 */
export function adresseTrifft(wert: string, muster: string): boolean {
  if (muster === 'any' || muster === '0.0.0.0/0') return true;
  const istIpOderPraefix = (x: string) => /^\d{1,3}(\.\d{1,3}){3}(\/\d{1,2})?$/.test(x);
  if (istIpOderPraefix(wert) && istIpOderPraefix(muster)) return ipInPrefix(wert, muster);
  return wert === muster;
}

function trifft(match: NftMatch, p: NftPacket): boolean {
  if (match.saddr !== undefined && !adresseTrifft(p.saddr, match.saddr)) return false;
  if (match.daddr !== undefined && !adresseTrifft(p.daddr ?? 'any', match.daddr)) return false;
  if (match.dport !== undefined && match.dport !== p.dport) return false;
  if (match.proto !== undefined && match.proto !== (p.proto ?? 'tcp')) return false;
  if (match.ctState && !match.ctState.includes(p.ctState ?? 'new')) return false;
  if (match.iif !== undefined && match.iif !== (p.iif ?? 'eth0')) return false;
  return true;
}

/** Endgueltige Urteile beenden den Lauf; 'return' und Kettenende nicht. */
type Lauf =
  | { art: 'verdict'; trace: NftTrace }
  | { art: 'return' }
  | { art: 'fallthrough' };

const MAX_TIEFE = 16;

function laufeKette(table: NftTable, chain: NftChain, p: NftPacket, tiefe: number): Lauf {
  if (tiefe > MAX_TIEFE) return { art: 'fallthrough' };

  for (const regel of chain.rules) {
    if (!trifft(regel.match, p)) continue;
    const v = regel.verdict;

    if ('target' in v) {
      const ziel = table.chains.find(c => c.name === v.target);
      if (!ziel) continue; // ein Sprung ins Leere entscheidet nichts
      const innen = laufeKette(table, ziel, p, tiefe + 1);
      if (innen.art === 'verdict') return innen;
      // `goto` kehrt NICHT in die aufrufende Kette zurueck: Faellt das Ziel
      // durch, entscheidet die Policy der Basiskette, nicht der Rest hier.
      if (v.kind === 'goto') return { art: 'fallthrough' };
      // `jump`: nach Durchfall oder `return` geht es in DIESER Kette weiter.
      continue;
    }
    if (v.kind === 'return') return { art: 'return' };
    return { art: 'verdict', trace: { verdict: v.kind, chain: chain.name, handle: regel.handle, byPolicy: false } };
  }
  return { art: 'fallthrough' };
}

/**
 * Ein Paket durch den Regelsatz schicken und das Urteil zurueckgeben.
 *
 * Gelaufen wird ab der Basiskette am gefragten Hook (Vorgabe: `input`). Gibt es
 * keine, entscheidet — wie bei echtem nftables — niemand: ohne Basiskette am
 * Hook wird nicht gefiltert, das Paket kommt durch.
 */
export function evaluatePacket(state: NftState, packet: NftPacket, hook: 'input' | 'output' | 'forward' = 'input'): NftTrace {
  for (const table of state.tables) {
    const basis = table.chains.find(c => c.base?.hook === hook);
    if (!basis || !basis.base) continue;
    const lauf = laufeKette(table, basis, packet, 0);
    if (lauf.art === 'verdict') return lauf.trace;
    return { verdict: basis.base.policy, chain: basis.name, byPolicy: true };
  }
  return { verdict: 'accept', chain: '', byPolicy: true };
}

// ---------------------------------------------------------------------------
// Seeding
// ---------------------------------------------------------------------------

/**
 * Einen Regelsatz aus der Level-Beschreibung bauen.
 *
 * Jeder Regelkoerper laeuft durch DENSELBEN Parser wie `nft add rule`. Ein
 * Level kann also nichts saeen, was der Spieler nicht auch tippen koennte —
 * und keine Syntax, die es in echt nicht gibt. Ein unlesbarer Seed ist ein
 * Inhaltsfehler und wirft: Die Wenn-dann-Frage „was passiert im Spiel mit
 * einer kaputten Regel" soll gar nicht erst entstehen, die Wachhunde fangen
 * es vorher.
 */
export function seedNftState(spec: {
  family?: NftFamily;
  table?: string;
  chains: { name: string; base?: { hook: 'input' | 'output' | 'forward'; priority?: number; policy: 'accept' | 'drop' }; rules?: string[] }[];
}): NftState {
  const state = emptyNftState();
  const table: NftTable = {
    family: spec.family ?? 'inet',
    name: spec.table ?? 'filter',
    handle: state.nextHandle++,
    chains: [],
  };

  for (const kette of spec.chains) {
    table.chains.push({
      name: kette.name,
      handle: state.nextHandle++,
      base: kette.base
        ? { type: 'filter', hook: kette.base.hook, priority: kette.base.priority ?? 0, policy: kette.base.policy }
        : undefined,
      rules: [],
    });
  }

  // Regeln erst, wenn alle Ketten stehen — sonst zeigt ein `jump` ins Leere.
  for (const kette of spec.chains) {
    const chain = table.chains.find(c => c.name === kette.name)!;
    for (const roh of kette.rules ?? []) {
      const geparst = parseRuleBody(roh.trim().split(/\s+/).filter(Boolean));
      if (istParseFehler(geparst)) {
        throw new Error(`nft-Seed nicht lesbar: „${roh}" (unerwartet: ${geparst.token})`);
      }
      const verdict = geparst.verdict;
      if ('target' in verdict && !table.chains.some(c => c.name === verdict.target)) {
        throw new Error(`nft-Seed springt in die unbekannte Kette „${verdict.target}": „${roh}"`);
      }
      chain.rules.push({ handle: state.nextHandle++, ...geparst });
    }
  }

  state.tables.push(table);
  return state;
}
