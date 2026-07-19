import { describe, it, expect } from 'vitest';
import { NetListener, NetConnection } from '@kritis/shared';
import { createShellFromContext } from './index';
import { checkStateGoal } from './stateGoals';

/**
 * Per-host network state: ss/netstat render the live host.listeners/.connections
 * (not a static table), kill <pid> drops matching sockets, and the
 * listenerAbsent/listenerPresent goals read the same live table.
 */

function primaryHostShell(net: { listeners?: NetListener[]; connections?: NetConnection[] }) {
  return createShellFromContext({
    type: 'linux',
    hostname: 'srv-net',
    username: 'root',
    currentPath: '/root',
    commands: [],
    solutions: [],
    hints: [],
    listeners: net.listeners,
    connections: net.connections,
  });
}

describe('ss/netstat render the live host table', () => {
  it('shows authored listeners and connections', () => {
    const shell = primaryHostShell({
      listeners: [{ proto: 'tcp', port: 31337, address: '0.0.0.0', pid: 6666, program: 'nc' }],
      connections: [{ proto: 'tcp', localPort: 54210, peer: '91.203.5.77:443', pid: 4242, program: 'updater' }],
    });
    const listening = shell.execute('ss -tulpen').output;
    expect(listening).toMatch(/31337/);
    expect(listening).toMatch(/nc/);
    // Established connections show without the listening-only (-l) filter.
    const conns = shell.execute('ss -tp').output;
    expect(conns).toMatch(/91\.203\.5\.77:443/);
    expect(conns).toMatch(/updater/);
  });

  it('falls back to the default table when a host declares none', () => {
    const shell = primaryHostShell({});
    const out = shell.execute('ss -tlnp').output;
    // Baseline listeners preserved for hosts that author no network state.
    expect(out).toMatch(/:22\b/);
    expect(out).toMatch(/sshd/);
    expect(out).toMatch(/apache2/);
  });
});

describe('kill drops sockets by pid', () => {
  it('removes a listener whose pid matches; ss no longer shows it', () => {
    const shell = primaryHostShell({
      listeners: [
        { proto: 'tcp', port: 22, pid: 456, program: 'sshd' },
        { proto: 'tcp', port: 31337, pid: 6666, program: 'nc' },
      ],
    });
    expect(shell.execute('ss -tlnp').output).toMatch(/31337/);
    expect(shell.execute('kill 6666').exitCode).toBe(0);
    const after = shell.execute('ss -tlnp').output;
    expect(after).not.toMatch(/31337/);
    // The legitimate listener stays.
    expect(after).toMatch(/:22\b/);
  });
});

describe('listenerAbsent / listenerPresent goals', () => {
  it('listenerAbsent is false before the kill, true after', () => {
    const shell = primaryHostShell({
      listeners: [{ proto: 'tcp', port: 31337, pid: 6666, program: 'nc' }],
    });
    const absent = { listenerAbsent: { port: 31337 } };
    const present = { listenerPresent: { port: 31337 } };
    expect(checkStateGoal(shell, absent)).toBe(false);
    expect(checkStateGoal(shell, present)).toBe(true);

    shell.execute('sudo kill 6666');

    expect(checkStateGoal(shell, absent)).toBe(true);
    expect(checkStateGoal(shell, present)).toBe(false);
  });

  it('killing the WRONG pid leaves the listener (goal still unmet)', () => {
    const shell = primaryHostShell({
      listeners: [{ proto: 'tcp', port: 31337, pid: 6666, program: 'nc' }],
    });
    shell.execute('sudo kill 4242');
    expect(checkStateGoal(shell, { listenerAbsent: { port: 31337 } })).toBe(false);
  });
});
