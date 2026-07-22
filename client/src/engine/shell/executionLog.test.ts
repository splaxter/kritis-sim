import { describe, it, expect } from 'vitest';
import { createShell } from './index';
import { createHostState } from './hosts';
import { ShellEngine } from './ShellEngine';

describe('execution log — basic', () => {
  it('logs one attempt per outer command with sequence, host, exit code', () => {
    const shell = createShell({ type: 'bash', user: 'root', hostname: 'srv' });
    shell.execute('whoami');
    shell.execute('cat /nonexistent'); // nonzero exit
    const log = shell.getExecutionLog();
    expect(log).toHaveLength(2);
    expect(log[0]).toMatchObject({ command: 'whoami', sequence: 1, hostBefore: 'local', hostAfter: 'local', exitCode: 0 });
    expect(log[1]).toMatchObject({ command: 'cat /nonexistent', sequence: 2, exitCode: 1 });
  });

  it('sudo does NOT create a second attempt (depth guard)', () => {
    const shell = createShell({ type: 'bash', user: 'root', hostname: 'srv' });
    shell.execute('sudo whoami');
    const log = shell.getExecutionLog();
    expect(log).toHaveLength(1);
    expect(log[0].command).toBe('sudo whoami');
  });

  it('a chained line is a single attempt', () => {
    const shell = createShell({ type: 'bash', user: 'root', hostname: 'srv' });
    shell.execute('true && echo hi');
    expect(shell.getExecutionLog()).toHaveLength(1);
    expect(shell.getExecutionLog()[0].command).toBe('true && echo hi');
  });

  it('empty input logs nothing', () => {
    const shell = createShell({ type: 'bash', user: 'root', hostname: 'srv' });
    shell.execute('   ');
    expect(shell.getExecutionLog()).toHaveLength(0);
  });
});

// ============================================================================
// A2: pending input lifecycle + authMethod + cancel
// ============================================================================

const PUBKEY = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5TimoKey timo@admin-ws';

/** local (admin-ws) + web01 with a password-login admin account (pw). */
function makeSshFixture(): { shell: ShellEngine } {
  const shell = createShell({ type: 'bash', user: 'timo', hostname: 'admin-ws' });
  shell.registerHost(createHostState({
    id: 'web01',
    hostname: 'web01',
    ip: '10.0.20.11',
    accounts: [{ name: 'admin', password: 'pw' }, { name: 'root' }],
  }));
  return { shell };
}

/** local + web01 with the player key seeded locally and trusted on web01. */
function makeKeyFixture(): { shell: ShellEngine } {
  const shell = createShell({ type: 'bash', user: 'timo', hostname: 'admin-ws' });
  const vfs = shell.getVfs();
  vfs.addFile('/home/timo/.ssh/id_ed25519', '-----BEGIN OPENSSH PRIVATE KEY-----\nfake\n-----END OPENSSH PRIVATE KEY-----\n');
  vfs.chmod('/home/timo/.ssh/id_ed25519', '600');
  vfs.addFile('/home/timo/.ssh/id_ed25519.pub', `${PUBKEY}\n`);
  shell.registerHost(createHostState({
    id: 'web01',
    hostname: 'web01',
    ip: '10.0.20.11',
    accounts: [{ name: 'admin', password: 'pw' }, { name: 'root' }],
    vfsOverlay: { files: [{ path: '/home/admin/.ssh/authorized_keys', content: `${PUBKEY}\n` }] },
  }));
  return { shell };
}

describe('execution log — pending input & ssh', () => {
  it('a password ssh login is ONE attempt, closed after the password, authMethod password', () => {
    const { shell } = makeSshFixture();
    const r1 = shell.execute('ssh admin@web01');
    expect(r1.pendingInput).toBeTruthy();
    expect(shell.getExecutionLog()).toHaveLength(0); // still open
    const r2 = shell.continueInput('pw');
    expect(r2.pendingInput).toBeFalsy();
    const log = shell.getExecutionLog();
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ command: 'ssh admin@web01', exitCode: 0, authMethod: 'password', hostBefore: 'local', hostAfter: 'web01' });
  });

  it('a key ssh login logs authMethod publickey, no prompt', () => {
    const { shell } = makeKeyFixture();
    shell.execute('ssh admin@web01');
    const log = shell.getExecutionLog();
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ authMethod: 'publickey', hostAfter: 'web01' });
  });

  it('two wrong passwords then correct → ONE attempt, exit 0, authMethod password', () => {
    const { shell } = makeSshFixture();
    shell.execute('ssh admin@web01');
    shell.continueInput('nope');
    shell.continueInput('nope');
    shell.continueInput('pw'); // 3rd attempt is the correct one — within the 3-try limit
    const log = shell.getExecutionLog();
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ exitCode: 0, authMethod: 'password' });
  });

  it('three wrong passwords exhaust the limit → ONE attempt, exit 255, no authMethod', () => {
    const { shell } = makeSshFixture();
    shell.execute('ssh admin@web01');
    shell.continueInput('nope');
    shell.continueInput('nope');
    shell.continueInput('nope'); // 3rd wrong → ssh gives up, attempt finalises
    const log = shell.getExecutionLog();
    expect(log).toHaveLength(1);
    expect(log[0].exitCode).toBe(255);
    expect(log[0].authMethod).toBeUndefined();
  });

  it('cancelling a pending prompt finalises the attempt with exit 130', () => {
    const { shell } = makeSshFixture();
    shell.execute('ssh admin@web01');
    shell.cancelPendingInput();
    const log = shell.getExecutionLog();
    expect(log).toHaveLength(1);
    expect(log[0].exitCode).toBe(130);
  });

  it('a nested execute inside a continuation does not open a second attempt', () => {
    const { shell } = makeSshFixture();
    shell.execute('ssh admin@web01');
    shell.continueInput('wrong'); // re-prompts
    expect(shell.getExecutionLog()).toHaveLength(0); // still open, no extra
  });
});

// ============================================================================
// ctx.sessionSourceHost — the previous session frame's host
// ============================================================================

describe('ExecutionContext.sessionSourceHost', () => {
  it('names the previous frame host, undefined at depth 1', () => {
    const shell = createShell({ type: 'bash', user: 'timo', hostname: 'ws-timo' });
    const web = createHostState({ id: 'srv-web', hostname: 'srv-web', accounts: [{ name: 'timo', password: 'pw' }] });
    shell.registerHost(web);
    let seen: string | undefined | null = null;
    shell.registerCommand({
      name: 'probe', description: '', usage: 'probe',
      execute: (_a, ctx) => { seen = ctx.sessionSourceHost ? ctx.sessionSourceHost.id : undefined; return { output: '', exitCode: 0 }; },
    });

    shell.execute('probe');
    expect(seen).toBeUndefined(); // depth 1 → no source

    shell.pushSession('srv-web', 'timo');
    shell.execute('probe');
    expect(seen).toBe('local'); // depth 2 → previous frame is the base host
  });

  it('at depth 3 sees the direct predecessor, not the base', () => {
    const shell = createShell({ type: 'bash', user: 'timo', hostname: 'ws-timo' });
    shell.registerHost(createHostState({ id: 'srv-web', hostname: 'srv-web', accounts: [{ name: 'timo', password: 'pw' }] }));
    shell.registerHost(createHostState({ id: 'srv-db', hostname: 'srv-db', accounts: [{ name: 'timo', password: 'pw' }] }));
    let seen: string | undefined | null = null;
    shell.registerCommand({
      name: 'probe', description: '', usage: 'probe',
      execute: (_a, ctx) => { seen = ctx.sessionSourceHost ? ctx.sessionSourceHost.id : undefined; return { output: '', exitCode: 0 }; },
    });

    shell.pushSession('srv-web', 'timo');
    shell.pushSession('srv-db', 'timo');
    shell.execute('probe');
    expect(seen).toBe('srv-web'); // depth 3 → previous frame, not the base 'local'
  });
});
