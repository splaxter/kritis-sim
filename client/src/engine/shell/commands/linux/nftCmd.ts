/**
 * nft — arbeitet auf dem nftables-Regelsatz des Hosts (`ctx.host.nft`).
 *
 * Unterstuetzt wird bewusst ein SCHMALER, aber echter Ausschnitt. Was hier
 * fehlt, antwortet mit einem Syntaxfehler wie das Original — nichts wird
 * erfunden, damit der Spieler sich nichts merkt, was an einer echten Kiste
 * ins Leere greift:
 *
 *   nft [-a] list ruleset | list table <fam> <tab> | list chain <fam> <tab> <kette>
 *   nft add rule <fam> <tab> <kette> <regel>
 *   nft insert rule <fam> <tab> <kette> [position <handle>] <regel>
 *   nft delete rule <fam> <tab> <kette> handle <handle>
 *   nft flush chain <fam> <tab> <kette> | flush ruleset
 */
import { ShellCommand, ParsedArgs, ExecutionContext, CommandResult, Completion } from '../../types';
import {
  NftState, NftTable, NftChain,
  parseRuleBody, istParseFehler, formatRuleset, formatTable, formatRule,
} from '../../nftables';

const PERM = 'Error: Could not process rule: Operation not permitted';

const syntaxfehler = (token: string): CommandResult => ({
  output: '',
  exitCode: 1,
  error: `Error: syntax error, unexpected ${token}`,
});

const keineTabelle = (): CommandResult => ({
  output: '',
  exitCode: 1,
  error: 'Error: No such file or directory',
});

/** Tabelle und Kette aus '<familie> <tabelle> <kette>' aufloesen. */
function finde(state: NftState, fam?: string, tab?: string, kette?: string):
  { table: NftTable; chain?: NftChain } | null {
  const table = state.tables.find(t => t.family === fam && t.name === tab);
  if (!table) return null;
  if (kette === undefined) return { table };
  const chain = table.chains.find(c => c.name === kette);
  return chain ? { table, chain } : null;
}

export const nftCommand: ShellCommand = {
  name: 'nft',
  description: 'nftables ruleset administration',
  usage: 'nft [-a] list ruleset | add|insert|delete rule FAMILY TABLE CHAIN … | flush chain|ruleset',
  options: [{ short: 'a', description: 'Handles mit ausgeben', takesValue: false }],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    // Echtes nft braucht auch zum Lesen Rechte auf den Netfilter-Socket.
    if (ctx.user !== 'root') return { output: '', exitCode: 1, error: PERM };

    const host = ctx.host;
    if (!host) return { output: '', exitCode: 1, error: PERM };

    const state = host.nft;
    const mitHandles = args.flags['a'] === true || args.flags['handle'] === true;
    const [sub, ...rest] = args.positional;

    if (sub === undefined) return syntaxfehler('end of file');

    // ---- list ------------------------------------------------------------
    if (sub === 'list') {
      const was = rest[0];
      if (was === 'ruleset') {
        return { output: formatRuleset(state, mitHandles), exitCode: 0 };
      }
      if (was === 'table') {
        const treffer = finde(state, rest[1], rest[2]);
        if (!treffer) return keineTabelle();
        return { output: formatTable(treffer.table, mitHandles), exitCode: 0 };
      }
      if (was === 'chain') {
        const treffer = finde(state, rest[1], rest[2], rest[3]);
        if (!treffer?.chain) return keineTabelle();
        const nur: NftTable = { ...treffer.table, chains: [treffer.chain] };
        return { output: formatTable(nur, mitHandles), exitCode: 0 };
      }
      return syntaxfehler(was ?? 'end of file');
    }

    // ---- flush -----------------------------------------------------------
    if (sub === 'flush') {
      if (rest[0] === 'ruleset') {
        state.tables = [];
        return { output: '', exitCode: 0 };
      }
      if (rest[0] === 'chain') {
        const treffer = finde(state, rest[1], rest[2], rest[3]);
        if (!treffer?.chain) return keineTabelle();
        treffer.chain.rules = [];
        return { output: '', exitCode: 0 };
      }
      return syntaxfehler(rest[0] ?? 'end of file');
    }

    // ---- add / insert / delete rule --------------------------------------
    if (sub === 'add' || sub === 'insert' || sub === 'delete') {
      if (rest[0] !== 'rule') return syntaxfehler(rest[0] ?? 'end of file');
      const treffer = finde(state, rest[1], rest[2], rest[3]);
      if (!treffer?.chain) return keineTabelle();
      const chain = treffer.chain;
      const tokens = rest.slice(4);

      if (sub === 'delete') {
        if (tokens[0] !== 'handle' || !/^\d+$/.test(tokens[1] ?? '')) {
          return syntaxfehler(tokens[0] ?? 'end of file');
        }
        const handle = parseInt(tokens[1], 10);
        const index = chain.rules.findIndex(r => r.handle === handle);
        if (index === -1) {
          return { output: '', exitCode: 1, error: 'Error: Could not process rule: No such file or directory' };
        }
        chain.rules.splice(index, 1);
        return { output: '', exitCode: 0 };
      }

      let position: number | undefined;
      let koerper = tokens;
      if (tokens[0] === 'position' || tokens[0] === 'index' || tokens[0] === 'handle') {
        if (!/^\d+$/.test(tokens[1] ?? '')) return syntaxfehler(tokens[1] ?? 'end of file');
        position = parseInt(tokens[1], 10);
        koerper = tokens.slice(2);
      }

      const geparst = parseRuleBody(koerper);
      if (istParseFehler(geparst)) return syntaxfehler(geparst.token);
      const verdict = geparst.verdict;
      if ('target' in verdict && !treffer.table.chains.some(c => c.name === verdict.target)) {
        return { output: '', exitCode: 1, error: 'Error: Could not process rule: No such file or directory' };
      }

      const regel = { handle: state.nextHandle++, ...geparst };
      if (sub === 'add') {
        // `add … position N` haengt HINTER die genannte Regel.
        const nach = position === undefined ? -1 : chain.rules.findIndex(r => r.handle === position);
        if (position !== undefined && nach === -1) return keineTabelle();
        if (nach === -1) chain.rules.push(regel);
        else chain.rules.splice(nach + 1, 0, regel);
      } else {
        // `insert` setzt DAVOR; ohne Positionsangabe an den Anfang.
        const vor = position === undefined ? 0 : chain.rules.findIndex(r => r.handle === position);
        if (position !== undefined && vor === -1) return keineTabelle();
        chain.rules.splice(vor === -1 ? 0 : vor, 0, regel);
      }
      return { output: '', exitCode: 0 };
    }

    return syntaxfehler(sub);
  },

  getCompletions(partial: string): Completion[] {
    const woerter = ['list', 'add', 'insert', 'delete', 'flush', 'ruleset', 'rule', 'chain', 'table', 'handle', 'inet'];
    return woerter
      .filter(w => w.startsWith(partial))
      .map(value => ({ value, display: value, type: 'command' as const }));
  },
};

/** Was `formatRule` druckt, ist auch das, was der Parser wieder liest. */
export { formatRule };
