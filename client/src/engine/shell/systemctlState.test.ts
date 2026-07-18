/**
 * systemctl against mutable per-host state: start/stop/restart with
 * preconditions, enable/disable, daemon-reload semantics, journal feedback.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createShell } from './index';
import { ShellEngine } from './ShellEngine';
import { createHostState, HostState } from './hosts';

function makeShellOnHost(): { shell: ShellEngine; host: HostState } {
  const shell = createShell({ type: 'bash', user: 'azubi', hostname: 'kritis' });
  const host = createHostState({
    id: 'telem01',
    hostname: 'telem01.stadtwerke.local',
    ip: '10.0.30.5',
    services: [
      {
        unit: 'telemetryd.service',
        active: 'failed',
        desc: 'Telemetry',
        startRequires: [
          { file: '/etc/telemetryd.conf', failMessage: 'telemetryd: config /etc/telemetryd.conf missing' },
        ],
      },
      {
        unit: 'pumpmon.service',
        active: 'failed',
        desc: 'Pump Monitor',
        unitFile: '/etc/systemd/system/pumpmon.service',
        startRequires: [
          {
            unitFileMatches: 'ExecStart=/usr/local/bin/pumpmond --config /etc/pumpmon\\.yml',
            failMessage: 'pumpmond: unknown option --confg',
          },
        ],
      },
    ],
    vfsOverlay: {
      files: [
        {
          path: '/etc/systemd/system/pumpmon.service',
          content: '[Service]\nExecStart=/usr/local/bin/pumpmond --confg /etc/pumpmon.yml\n',
        },
      ],
    },
  }, { user: 'admin' });
  shell.registerHost(host);
  shell.pushSession('telem01', 'admin');
  return { shell, host };
}

describe('systemctl start/restart preconditions', () => {
  let shell: ShellEngine;
  let host: HostState;
  beforeEach(() => {
    ({ shell, host } = makeShellOnHost());
  });

  it('fails to start while the precondition is unmet: exit 1, unit failed, journal entry', () => {
    const r = shell.execute('sudo systemctl start telemetryd');
    expect(r.exitCode).toBe(1);
    const all = `${r.output}\n${r.error ?? ''}`;
    expect(all).toContain('Job for telemetryd.service failed');
    expect(all).toContain('journalctl -xeu telemetryd.service');

    const unit = host.services.find(s => s.unit === 'telemetryd.service')!;
    expect(unit.active).toBe('failed');
    expect(unit.sub).toBe('failed');

    const last = host.journal[host.journal.length - 1];
    expect(last.message).toContain('telemetryd: config /etc/telemetryd.conf missing');
    expect(last.priority).toBe('err');
    expect(last.unit).toBe('telemetryd');
  });

  it('restart succeeds once the required file exists, journal gains Started entry', () => {
    host.vfs.addFile('/etc/telemetryd.conf', 'interval=10\n');
    const r = shell.execute('sudo systemctl restart telemetryd');
    expect(r.exitCode).toBe(0);

    const unit = host.services.find(s => s.unit === 'telemetryd.service')!;
    expect(unit.active).toBe('active');
    expect(unit.sub).toBe('running');

    const last = host.journal[host.journal.length - 1];
    expect(last.message).toBe('Started Telemetry.');
    expect(last.priority).toBe('info');
  });
});

describe('systemctl stop/enable/disable', () => {
  let shell: ShellEngine;
  let host: HostState;
  beforeEach(() => {
    ({ shell, host } = makeShellOnHost());
  });

  it('stop sets a unit inactive/dead and journals it', () => {
    const r = shell.execute('sudo systemctl stop apache2');
    expect(r.exitCode).toBe(0);
    const unit = host.services.find(s => s.unit === 'apache2.service')!;
    expect(unit.active).toBe('inactive');
    expect(unit.sub).toBe('dead');
    const last = host.journal[host.journal.length - 1];
    expect(last.message).toBe('Stopped The Apache HTTP Server.');
  });

  it('enable/disable flip enabled state and print the symlink lines', () => {
    const dis = shell.execute('sudo systemctl disable apache2');
    expect(dis.exitCode).toBe(0);
    expect(`${dis.output}\n${dis.error ?? ''}`).toContain(
      'Removed /etc/systemd/system/multi-user.target.wants/apache2.service.'
    );
    expect(host.services.find(s => s.unit === 'apache2.service')!.enabled).toBe('disabled');

    const en = shell.execute('sudo systemctl enable apache2');
    expect(en.exitCode).toBe(0);
    expect(`${en.output}\n${en.error ?? ''}`).toContain(
      'Created symlink /etc/systemd/system/multi-user.target.wants/apache2.service → /lib/systemd/system/apache2.service.'
    );
    expect(host.services.find(s => s.unit === 'apache2.service')!.enabled).toBe('enabled');
  });
});

describe('systemctl daemon-reload semantics', () => {
  let shell: ShellEngine;
  let host: HostState;
  beforeEach(() => {
    ({ shell, host } = makeShellOnHost());
  });

  it('restart still fails after fixing the unit FILE until daemon-reload', () => {
    // Fix the typo in the unit file on disk.
    host.vfs.addFile(
      '/etc/systemd/system/pumpmon.service',
      '[Service]\nExecStart=/usr/local/bin/pumpmond --config /etc/pumpmon.yml\n'
    );

    const stale = shell.execute('sudo systemctl restart pumpmon');
    expect(stale.exitCode).toBe(1);
    expect(`${stale.output}\n${stale.error ?? ''}`).toContain('Job for pumpmon.service failed');
    expect(host.journal[host.journal.length - 1].message).toContain('pumpmond: unknown option --confg');

    const reload = shell.execute('sudo systemctl daemon-reload');
    expect(reload.exitCode).toBe(0);

    const fresh = shell.execute('sudo systemctl restart pumpmon');
    expect(fresh.exitCode).toBe(0);
    const unit = host.services.find(s => s.unit === 'pumpmon.service')!;
    expect(unit.active).toBe('active');
    expect(unit.sub).toBe('running');
  });
});

describe('systemctl restart ssh re-parses sshd_config', () => {
  it('updates host.sshdEffective from the live file', () => {
    const { shell, host } = makeShellOnHost();
    host.vfs.addFile('/etc/ssh/sshd_config', 'PermitRootLogin no\nPasswordAuthentication no\n');
    expect(host.sshdEffective.passwordAuthentication).toBe(true); // stale until restart

    const r = shell.execute('sudo systemctl restart ssh');
    expect(r.exitCode).toBe(0);
    expect(host.sshdEffective.passwordAuthentication).toBe(false);
    expect(host.sshdEffective.permitRootLogin).toBe(false);
  });
});

describe('systemctl read verbs against host state', () => {
  let shell: ShellEngine;
  let host: HostState;
  beforeEach(() => {
    ({ shell, host } = makeShellOnHost());
  });

  it('still denies state-changing verbs without root', () => {
    const r = shell.execute('systemctl restart telemetryd');
    expect(r.exitCode).not.toBe(0);
    expect(r.error).toContain('Access denied');
    expect(host.services.find(s => s.unit === 'telemetryd.service')!.active).toBe('failed');
  });

  it('status/is-active/is-enabled/list-units read from host services', () => {
    expect(shell.execute('systemctl is-active telemetryd').output).toBe('failed');
    expect(shell.execute('systemctl is-active telemetryd').exitCode).toBe(3);
    expect(shell.execute('systemctl is-enabled telemetryd').output).toBe('enabled');

    const list = shell.execute('systemctl list-units');
    expect(list.output).toContain('telemetryd.service');
    expect(list.output).toContain('pumpmon.service');

    const status = shell.execute('systemctl status telemetryd');
    expect(status.output).toContain('telemetryd.service - Telemetry');
    expect(status.output).toContain('failed (failed)');
    expect(status.exitCode).toBe(3);
  });

  it('status shows the last journal entries for the unit', () => {
    shell.execute('sudo systemctl start telemetryd'); // fails, journals the failMessage
    const status = shell.execute('systemctl status telemetryd');
    expect(status.output).toContain('telemetryd: config /etc/telemetryd.conf missing');
    // journalctl-style line: "Jul 18 09:15:00 <hostname> telemetryd[1]: <message>"
    expect(status.output).toMatch(/Jul 18 \d{2}:\d{2}:\d{2} telem01 telemetryd\[\d+\]: telemetryd: config/);
  });
});
