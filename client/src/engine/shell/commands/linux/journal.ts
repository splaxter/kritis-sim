/**
 * journalctl — query the per-host journal (ctx.host.journal).
 * Renders syslog-style lines: `Jul 18 06:00:00 <host> <unit>[<pid>]: <msg>`.
 */

import { TerminalJournalEntry } from '@kritis/shared';
import { ShellCommand, ParsedArgs, ExecutionContext, CommandResult } from '../../types';
import { HostState, canonicalUnitName, derivedUnitPid, formatJournalTs } from '../../hosts';

/** Threshold order, most severe first — journalctl -p shows LEVEL and above. */
const PRIORITY_ORDER = ['err', 'warning', 'info'];

/** Live service pid when the unit runs, else the shared derived pid. */
function pidFor(host: HostState | undefined, unit: string): number {
  const full = canonicalUnitName(unit);
  const service = host?.services.find(s => s.unit === full);
  return service?.pid ?? derivedUnitPid(full);
}

export const journalctlCommand: ShellCommand = {
  name: 'journalctl',
  description: 'Query the systemd journal',
  usage: 'journalctl [OPTIONS]',
  options: [
    { short: 'u', long: 'unit', description: 'Show logs of the specified unit', takesValue: true },
    { short: 'n', long: 'lines', description: 'Number of journal entries to show', takesValue: true },
    { long: 'since', description: 'Show entries not older than the specified date', takesValue: true },
    { long: 'until', description: 'Show entries not newer than the specified date', takesValue: true },
    { short: 'p', long: 'priority', description: 'Show entries with the specified priority', takesValue: true },
    { long: 'no-pager', description: 'Do not pipe output into a pager' },
    { short: 'x', description: 'Add explanatory help texts (no-op)' },
    { short: 'e', description: 'Jump to the end of the journal (no-op)' },
    { short: 'f', long: 'follow', description: 'Follow the journal' },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const host = ctx.host;

    if (args.flags['f'] || args.flags['follow']) {
      return {
        output:
          '-- Logs begin at Mon 2026-07-09 09:00:01 UTC. --\n' +
          'journalctl -f wird in dieser Simulation nicht unterstützt (kein Follow-Modus).',
        exitCode: 0,
      };
    }

    // Sort a COPY by ts — seeded journals may be authored out of order.
    let entries: TerminalJournalEntry[] = [...(host?.journal ?? [])]
      .sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0));

    const unitOpt = args.options['u'] ?? args.options['unit'];
    if (unitOpt) {
      // Canonicalize BOTH sides so `-u ssh`, `-u sshd` and `-u ssh.service`
      // all reach entries authored under either identifier.
      const wanted = canonicalUnitName(unitOpt);
      entries = entries.filter(e => canonicalUnitName(e.unit) === wanted);
    }
    const prio = args.options['p'] ?? args.options['priority'];
    if (prio) {
      // Threshold, not exact match: -p warning includes err.
      const threshold = PRIORITY_ORDER.indexOf(prio);
      entries = entries.filter(
        e => PRIORITY_ORDER.indexOf(e.priority ?? 'info') <= threshold
      );
    }
    const since = args.options['since'];
    if (since) {
      entries = entries.filter(e => e.ts >= since);
    }
    const until = args.options['until'];
    if (until) {
      // Prefix-inclusive upper bound: '07:00' still matches '07:00:00'.
      entries = entries.filter(e => e.ts <= until + '\uffff');
    }
    const linesOpt = args.options['n'] ?? args.options['lines'];
    if (linesOpt !== undefined) {
      const n = parseInt(linesOpt, 10);
      if (isNaN(n)) {
        return { output: '', exitCode: 1, error: `Failed to parse lines '${linesOpt}'` };
      }
      entries = entries.slice(-n);
    }

    if (entries.length === 0) {
      return { output: '-- No entries --', exitCode: 0 };
    }

    const hostShort = (host?.hostname ?? ctx.vfs.getEnv('HOSTNAME') ?? 'localhost').split('.')[0];
    const lines = entries.map(
      e => `${formatJournalTs(e.ts)} ${hostShort} ${e.unit}[${pidFor(host, e.unit)}]: ${e.message}`
    );
    return { output: lines.join('\n'), exitCode: 0 };
  },
};

export const journalCommands: ShellCommand[] = [journalctlCommand];
