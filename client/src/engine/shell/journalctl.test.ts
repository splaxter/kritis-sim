/**
 * journalctl over the per-host journal: syslog-style rendering, unit/priority/
 * time filters, -n tail, piping, and the -f follow-mode stub.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { TerminalJournalEntry } from '@kritis/shared';
import { createShell } from './index';
import { ShellEngine } from './ShellEngine';
import { createHostState, derivedUnitPid, HostState } from './hosts';

// Authored deliberately OUT of order — journalctl must sort by ts.
const SEEDED: TerminalJournalEntry[] = [
  { ts: '2026-07-18 06:30:00', unit: 'telemetryd', priority: 'info', message: 'Telemetry tick ok' },
  { ts: '2026-07-18 06:00:00', unit: 'sshd', priority: 'warning', message: 'Failed password for root from 203.0.113.50 port 51122 ssh2' },
  { ts: '2026-07-18 06:05:00', unit: 'sshd', priority: 'info', message: 'Accepted publickey for admin from 10.0.30.2 port 40022 ssh2' },
  { ts: '2026-07-18 07:00:00', unit: 'telemetryd', priority: 'err', message: 'config /etc/telemetryd.conf missing' },
  { ts: '2026-07-18 07:30:00', unit: 'sshd', priority: 'warning', message: 'Failed password for admin from 203.0.113.51 port 51199 ssh2' },
  { ts: '2026-07-18 08:00:00', unit: 'cron', priority: 'info', message: 'Job `backup` started' },
];

function makeShellOnHost(): { shell: ShellEngine; host: HostState } {
  const shell = createShell({ type: 'bash', user: 'azubi', hostname: 'kritis' });
  const host = createHostState({
    id: 'telem01',
    hostname: 'telem01.stadtwerke.local',
    ip: '10.0.30.5',
    services: [{ unit: 'telemetryd.service', active: 'failed', desc: 'Telemetry' }],
    journal: SEEDED.map(e => ({ ...e })),
  });
  shell.registerHost(host);
  shell.pushSession('telem01', 'admin');
  return { shell, host };
}

describe('journalctl rendering', () => {
  let shell: ShellEngine;
  let host: HostState;
  beforeEach(() => {
    ({ shell, host } = makeShellOnHost());
  });

  it('prints all entries oldest-first in syslog format', () => {
    const r = shell.execute('journalctl');
    expect(r.exitCode).toBe(0);
    const lines = r.output.split('\n');
    expect(lines).toHaveLength(6);
    // Short hostname, month name; authored `sshd` aliases to the live
    // ssh.service, so its pid (456) renders instead of a derived one.
    expect(lines[0]).toBe(
      'Jul 18 06:00:00 telem01 sshd[456]: Failed password for root from 203.0.113.50 port 51122 ssh2'
    );
    // Sorted despite out-of-order authoring.
    expect(lines[1]).toContain('06:05:00');
    expect(lines[2]).toContain('06:30:00');
    expect(lines[5]).toContain('08:00:00');
  });

  it('uses the live service pid when the unit has one', () => {
    const r = shell.execute('journalctl');
    // cron.service runs with pid 512 in the default unit table.
    expect(r.output).toContain(`cron[512]: Job \`backup\` started`);
  });

  it('does not mutate the host journal order', () => {
    shell.execute('journalctl');
    expect(host.journal[0].ts).toBe('2026-07-18 06:30:00');
  });

  it('shows the same pid as systemctl status for a failed unit', () => {
    shell.execute('sudo systemctl start telemetryd'); // no start requirements → succeeds
    shell.execute('sudo systemctl stop telemetryd');
    shell.execute('sudo systemctl stop telemetryd'); // journal lines while pid is unset
    const status = shell.execute('systemctl status telemetryd');
    const m = status.output.match(/telemetryd\[(\d+)\]/);
    expect(m).not.toBeNull();
    const journal = shell.execute('journalctl -u telemetryd');
    expect(journal.output).toContain(`telemetryd[${m![1]}]: Stopped Telemetry.`);
  });
});

describe('journalctl filters', () => {
  let shell: ShellEngine;
  beforeEach(() => {
    ({ shell } = makeShellOnHost());
  });

  it('-u accepts short and full unit names', () => {
    for (const cmd of ['journalctl -u telemetryd', 'journalctl -u telemetryd.service']) {
      const lines = shell.execute(cmd).output.split('\n');
      expect(lines).toHaveLength(2);
      expect(lines[0]).toContain('Telemetry tick ok');
      expect(lines[1]).toContain('config /etc/telemetryd.conf missing');
    }
  });

  it('-xeu works like -u (ignored -x/-e, systemctl hint form)', () => {
    const lines = shell.execute('journalctl -xeu telemetryd').output.split('\n');
    expect(lines).toHaveLength(2);
  });

  it('-n prints the last N entries after filtering, oldest-first', () => {
    const lines = shell.execute('journalctl -n 2').output.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('07:30:00');
    expect(lines[1]).toContain('08:00:00');

    const one = shell.execute('journalctl -u sshd -n 1').output.split('\n');
    expect(one).toHaveLength(1);
    expect(one[0]).toContain('Failed password for admin');
  });

  it('--since/--until compare on the raw timestamp, boundaries inclusive', () => {
    const r = shell.execute("journalctl --since '2026-07-18 06:00' --until '2026-07-18 07:00'");
    const lines = r.output.split('\n');
    expect(lines).toHaveLength(4); // 06:00, 06:05, 06:30 and the 07:00 boundary
    expect(lines[0]).toContain('06:00:00');
    expect(lines[3]).toContain('07:00:00');
  });

  it('-p err filters by priority', () => {
    const lines = shell.execute('journalctl -p err').output.split('\n');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('config /etc/telemetryd.conf missing');
  });

  it('-u ssh, -u sshd and -u ssh.service all reach authored sshd and live ssh entries', () => {
    // Engine-appended entry uses the canonical short name 'ssh'.
    shell.execute('sudo systemctl stop ssh');
    for (const cmd of ['journalctl -u ssh', 'journalctl -u sshd', 'journalctl -u ssh.service']) {
      const out = shell.execute(cmd).output;
      expect(out.split('\n')).toHaveLength(4); // 3 authored sshd + 1 appended ssh
      expect(out).toContain('Failed password for root from 203.0.113.50');
      expect(out).toContain('Stopped OpenBSD Secure Shell server.');
      // ssh.service was stopped, so the appended line falls back to the derived pid.
      expect(out).toContain(`ssh[${derivedUnitPid('ssh')}]: Stopped`);
    }
  });

  it('output is plain text and pipes into grep', () => {
    const r = shell.execute('journalctl -u sshd | grep Failed');
    expect(r.exitCode).toBe(0);
    // grep colorizes its TTY output — strip ANSI before asserting.
    // eslint-disable-next-line no-control-regex
    const lines = r.output.replace(/\x1b\[[0-9;]*m/g, '').split('\n');
    expect(lines).toHaveLength(2);
    for (const line of lines) expect(line).toContain('Failed password');

    // Mid-pipeline (non-TTY) stays fully plain.
    const counted = shell.execute('journalctl -u sshd | grep Failed | wc -l');
    expect(counted.output.trim()).toBe('2');
  });
});

describe('journalctl -p threshold semantics', () => {
  // Like real journalctl: -p LEVEL shows LEVEL and everything more severe.
  function makePrioShell(): ShellEngine {
    const shell = createShell({ type: 'bash', user: 'azubi', hostname: 'kritis' });
    const host = createHostState({
      id: 'p1',
      hostname: 'p1',
      journal: [
        { ts: '2026-07-18 06:00:00', unit: 'app', priority: 'err', message: 'E' },
        { ts: '2026-07-18 06:01:00', unit: 'app', priority: 'warning', message: 'W' },
        { ts: '2026-07-18 06:02:00', unit: 'app', priority: 'info', message: 'I' },
        { ts: '2026-07-18 06:03:00', unit: 'app', message: 'N' }, // no priority → info
      ],
    });
    shell.registerHost(host);
    shell.pushSession('p1', 'admin');
    return shell;
  }

  it('-p warning includes err and warning, hides info', () => {
    const lines = makePrioShell().execute('journalctl -p warning').output.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain(': E');
    expect(lines[1]).toContain(': W');
  });

  it('-p err shows only err', () => {
    const lines = makePrioShell().execute('journalctl -p err').output.split('\n');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain(': E');
  });

  it('-p info shows everything, counting entries without priority as info', () => {
    const lines = makePrioShell().execute('journalctl -p info').output.split('\n');
    expect(lines).toHaveLength(4);
    expect(lines[3]).toContain(': N');
  });
});

describe('journalctl edge cases', () => {
  let shell: ShellEngine;
  beforeEach(() => {
    ({ shell } = makeShellOnHost());
  });

  it('empty result prints -- No entries --, exit 0', () => {
    const r = shell.execute('journalctl -u nonexistentd');
    expect(r.exitCode).toBe(0);
    expect(r.output).toBe('-- No entries --');
  });

  it('-f prints a logs-begin header and the no-follow note, exit 0', () => {
    const r = shell.execute('journalctl -f');
    expect(r.exitCode).toBe(0);
    expect(r.output).toContain('-- Logs begin');
    expect(r.output).toContain('journalctl -f wird in dieser Simulation nicht unterstützt (kein Follow-Modus).');
  });
});
