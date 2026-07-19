/**
 * createsOnStart: a unit that, on successful start, materializes files on the
 * host VFS (e.g. a database socket) which a dependent unit's startRequires
 * then find. Powers dependency-chain levels (learn_sysd_04_chain_reaction).
 */
import { describe, it, expect } from 'vitest';
import { createShell } from './index';
import { createHostState, HostState } from './hosts';
import { ShellEngine } from './ShellEngine';

function setup(): { shell: ShellEngine; host: HostState } {
  const shell = createShell({ type: 'bash', user: 'root', hostname: 'db-host' });
  const host = createHostState({
    id: 'db01',
    hostname: 'db01',
    services: [
      {
        unit: 'mysql.service',
        active: 'inactive',
        desc: 'MySQL Community Server',
        createsOnStart: ['/run/mysqld/mysqld.sock'],
      },
      {
        unit: 'leitstand-api.service',
        active: 'failed',
        desc: 'Leitstand API',
        startRequires: [
          {
            file: '/run/mysqld/mysqld.sock',
            failMessage: 'leitstand-api: cannot connect to database socket /run/mysqld/mysqld.sock',
          },
        ],
      },
    ],
  }, { user: 'root' });
  shell.registerHost(host);
  shell.pushSession('db01', 'root');
  return { shell, host };
}

describe('createsOnStart', () => {
  it('materializes the declared files on a successful start', () => {
    const { shell, host } = setup();
    expect(host.vfs.exists('/run/mysqld/mysqld.sock')).toBe(false);
    const r = shell.execute('systemctl start mysql');
    expect(r.exitCode).toBe(0);
    expect(host.vfs.exists('/run/mysqld/mysqld.sock')).toBe(true);
  });

  it('the dependent unit fails BEFORE and succeeds AFTER the provider starts', () => {
    const { shell, host } = setup();

    // Blind restart of the API without the socket → fails.
    const early = shell.execute('systemctl start leitstand-api');
    expect(early.exitCode).toBe(1);
    expect(host.services.find(s => s.unit === 'leitstand-api.service')?.active).toBe('failed');

    // Provider first: creates the socket.
    expect(shell.execute('systemctl start mysql').exitCode).toBe(0);
    // Now the dependent unit can start.
    expect(shell.execute('systemctl start leitstand-api').exitCode).toBe(0);
    expect(host.services.find(s => s.unit === 'leitstand-api.service')?.active).toBe('active');
  });

  it('does not create files when the start FAILS', () => {
    const shell = createShell({ type: 'bash', user: 'root', hostname: 'h' });
    const host = createHostState({
      id: 'h2',
      hostname: 'h2',
      services: [
        {
          unit: 'gated.service',
          active: 'failed',
          desc: 'Gated',
          createsOnStart: ['/run/gated.sock'],
          startRequires: [{ file: '/etc/gated.conf', failMessage: 'gated: no config' }],
        },
      ],
    }, { user: 'root' });
    shell.registerHost(host);
    shell.pushSession('h2', 'root');
    expect(shell.execute('systemctl start gated').exitCode).toBe(1);
    expect(host.vfs.exists('/run/gated.sock')).toBe(false);
  });
});
