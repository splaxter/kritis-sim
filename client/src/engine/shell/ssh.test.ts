/**
 * ssh command + auth core: host resolution, firewall gating, key auth
 * (permissions!), password prompts via pendingInput, sshd_config gates,
 * and jumphost chains.
 */
import { describe, it, expect } from 'vitest';
import { createShell } from './index';
import { createHostState } from './hosts';
import { ShellEngine } from './ShellEngine';
import { homeDir } from './sshAuth';

const PUBKEY = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5TimoKey timo@admin-ws';

function baseShell(): ShellEngine {
  return createShell({ type: 'bash', user: 'timo', hostname: 'admin-ws' });
}

/** web01 with password-login account admin; overridable per test. */
function web01Spec(overrides: Record<string, unknown> = {}) {
  return {
    id: 'web01',
    hostname: 'web01',
    ip: '10.0.20.11',
    accounts: [{ name: 'admin', password: 'sonnenblume23' }, { name: 'root' }],
    ...overrides,
  };
}

/** Seed a keypair in the local user's ~/.ssh; mode 600 unless told otherwise. */
function seedLocalKey(shell: ShellEngine, opts: { worldReadable?: boolean } = {}) {
  const vfs = shell.getVfs();
  vfs.addFile('/home/timo/.ssh/id_ed25519', '-----BEGIN OPENSSH PRIVATE KEY-----\nfake\n-----END OPENSSH PRIVATE KEY-----\n');
  if (!opts.worldReadable) {
    vfs.chmod('/home/timo/.ssh/id_ed25519', '600');
  }
  vfs.addFile('/home/timo/.ssh/id_ed25519.pub', `${PUBKEY}\n`);
}

describe('homeDir', () => {
  it('maps root to /root and everyone else under /home', () => {
    expect(homeDir('root')).toBe('/root');
    expect(homeDir('admin')).toBe('/home/admin');
  });
});

describe('ssh: reachability', () => {
  it('unknown host resolves to name-or-service-not-known, exit 255', () => {
    const shell = baseShell();
    const r = shell.execute('ssh admin@nix');
    expect(r.error).toBe('ssh: Could not resolve hostname nix: Name or service not known');
    expect(r.exitCode).toBe(255);
  });

  it('explicit deny-22 rule on the target times out, exit 255', () => {
    const shell = baseShell();
    shell.registerHost(createHostState(web01Spec({
      firewall: { rules: [{ action: 'deny', port: 22 }] },
    })));
    const r = shell.execute('ssh admin@web01');
    expect(r.error).toBe('ssh: connect to host web01 port 22: Connection timed out');
    expect(r.exitCode).toBe(255);
  });

  it('default-deny with an allow-22 rule is reachable (password prompt appears)', () => {
    const shell = baseShell();
    shell.registerHost(createHostState(web01Spec({
      firewall: { defaultIncoming: 'deny', rules: [{ action: 'allow', port: 22 }] },
    })));
    const r = shell.execute('ssh admin@web01');
    expect(r.error).toBeUndefined();
    expect(r.pendingInput).toEqual({ prompt: "admin@web01's password: ", mask: true });
  });
});

describe('ssh: password auth', () => {
  it('prompts masked for the password when no key matches', () => {
    const shell = baseShell();
    shell.registerHost(createHostState(web01Spec()));
    const r = shell.execute('ssh admin@web01');
    expect(r.pendingInput).toEqual({ prompt: "admin@web01's password: ", mask: true });
    expect(shell.hasPendingInput()).toBe(true);
  });

  it('correct password logs in: depth 2, prompt hostname web01, Last-login banner', () => {
    const shell = baseShell();
    shell.registerHost(createHostState(web01Spec()));
    shell.execute('ssh admin@web01');
    const r = shell.continueInput('sonnenblume23');
    expect(r.exitCode).toBe(0);
    expect(r.output).toContain('Last login');
    expect(shell.getSessionDepth()).toBe(2);
    expect(shell.getPromptInfo().hostname).toBe('web01');
    expect(shell.getPromptInfo().username).toBe('admin');
  });

  it('three wrong passwords end with Permission denied (password), still local', () => {
    const shell = baseShell();
    shell.registerHost(createHostState(web01Spec()));
    shell.execute('ssh admin@web01');
    const r1 = shell.continueInput('falsch1');
    expect(r1.output).toContain('Permission denied, please try again.');
    expect(r1.pendingInput).toEqual({ prompt: "admin@web01's password: ", mask: true });
    const r2 = shell.continueInput('falsch2');
    expect(r2.pendingInput).toBeTruthy();
    const r3 = shell.continueInput('falsch3');
    expect(r3.error).toContain('admin@web01: Permission denied (password).');
    expect(r3.exitCode).toBe(255);
    expect(shell.hasPendingInput()).toBe(false);
    expect(shell.getSessionDepth()).toBe(1);
  });

  it('wrong twice then correct on the third attempt logs in', () => {
    const shell = baseShell();
    shell.registerHost(createHostState(web01Spec()));
    shell.execute('ssh admin@web01');
    shell.continueInput('falsch1');
    shell.continueInput('falsch2');
    const r = shell.continueInput('sonnenblume23');
    expect(r.exitCode).toBe(0);
    expect(shell.getSessionDepth()).toBe(2);
  });

  it('appends /etc/motd of the target to the login banner', () => {
    const shell = baseShell();
    shell.registerHost(createHostState(web01Spec({
      vfsOverlay: { files: [{ path: '/etc/motd', content: 'Wartungsfenster Freitag 22:00' }] },
    })));
    shell.execute('ssh admin@web01');
    const r = shell.continueInput('sonnenblume23');
    expect(r.output).toContain('Last login');
    expect(r.output).toContain('Wartungsfenster Freitag 22:00');
  });
});

describe('ssh: key auth', () => {
  it('matching pubkey in target authorized_keys logs in without a prompt', () => {
    const shell = baseShell();
    seedLocalKey(shell);
    shell.registerHost(createHostState(web01Spec({
      vfsOverlay: { files: [{ path: '/home/admin/.ssh/authorized_keys', content: `${PUBKEY}\n` }] },
    })));
    const r = shell.execute('ssh admin@web01');
    expect(r.pendingInput).toBeUndefined();
    expect(r.exitCode).toBe(0);
    expect(r.output).toContain('Last login');
    expect(shell.getSessionDepth()).toBe(2);
    expect(shell.getPromptInfo().hostname).toBe('web01');
  });

  it('world-readable private key prints the UNPROTECTED warning, is ignored, falls back to password', () => {
    const shell = baseShell();
    seedLocalKey(shell, { worldReadable: true });
    shell.registerHost(createHostState(web01Spec({
      vfsOverlay: { files: [{ path: '/home/admin/.ssh/authorized_keys', content: `${PUBKEY}\n` }] },
    })));
    const r = shell.execute('ssh admin@web01');
    expect(r.output).toContain('WARNING: UNPROTECTED PRIVATE KEY FILE!');
    expect(r.output).toContain("Permissions 0644 for '/home/timo/.ssh/id_ed25519' are too open.");
    expect(r.pendingInput).toEqual({ prompt: "admin@web01's password: ", mask: true });
    expect(shell.getSessionDepth()).toBe(1);
  });

  it('PasswordAuthentication no + no key denies with (publickey), exit 255', () => {
    const shell = baseShell();
    shell.registerHost(createHostState(web01Spec({
      vfsOverlay: { files: [{ path: '/etc/ssh/sshd_config', content: 'PasswordAuthentication no\n' }] },
    })));
    const r = shell.execute('ssh admin@web01');
    expect(r.error).toBe('Permission denied (publickey).');
    expect(r.exitCode).toBe(255);
    expect(shell.getSessionDepth()).toBe(1);
  });

  it('PermitRootLogin no blocks root even with a valid key installed', () => {
    const shell = baseShell();
    seedLocalKey(shell);
    shell.registerHost(createHostState(web01Spec({
      vfsOverlay: {
        files: [
          { path: '/etc/ssh/sshd_config', content: 'PermitRootLogin no\n' },
          { path: '/root/.ssh/authorized_keys', content: `${PUBKEY}\n` },
        ],
      },
    })));
    const r = shell.execute('ssh root@web01');
    expect(r.error).toBe('Permission denied (publickey).');
    expect(r.exitCode).toBe(255);
    expect(shell.getSessionDepth()).toBe(1);
  });

  it('account without password + password auth enabled denies with (publickey,password)', () => {
    const shell = baseShell();
    shell.registerHost(createHostState(web01Spec({
      accounts: [{ name: 'admin' }],
    })));
    const r = shell.execute('ssh admin@web01');
    expect(r.error).toBe('Permission denied (publickey,password).');
    expect(r.exitCode).toBe(255);
  });

  it('unknown user is denied like a key failure (no user-existence leak)', () => {
    const shell = baseShell();
    shell.registerHost(createHostState(web01Spec()));
    const r = shell.execute('ssh ghost@web01');
    expect(r.error).toBe('Permission denied (publickey,password).');
    expect(r.exitCode).toBe(255);
  });
});

describe('ssh: jumphost chain', () => {
  function jumpSetup() {
    const shell = baseShell();
    shell.registerHost(createHostState({
      id: 'jump01', hostname: 'jump01', ip: '10.0.30.5',
      accounts: [{ name: 'admin', password: 'sprungbrett7' }],
    }));
    shell.registerHost(createHostState({
      id: 'db01', hostname: 'db01', ip: '10.0.40.7',
      accounts: [{ name: 'admin', password: 'datenbank9' }],
      firewall: { defaultIncoming: 'deny', rules: [{ action: 'allow', port: 22, from: '10.0.30.5' }] },
    }));
    return shell;
  }

  it('direct login to the from-restricted host times out', () => {
    const shell = jumpSetup();
    const r = shell.execute('ssh admin@db01');
    expect(r.error).toBe('ssh: connect to host db01 port 22: Connection timed out');
    expect(r.exitCode).toBe(255);
  });

  it('via jump01 the same host is reachable; exit unwinds one level at a time', () => {
    const shell = jumpSetup();
    shell.execute('ssh admin@jump01');
    shell.continueInput('sprungbrett7');
    expect(shell.getSessionDepth()).toBe(2);

    const r = shell.execute('ssh admin@db01');
    expect(r.pendingInput).toEqual({ prompt: "admin@db01's password: ", mask: true });
    shell.continueInput('datenbank9');
    expect(shell.getSessionDepth()).toBe(3);
    expect(shell.getPromptInfo().hostname).toBe('db01');

    const e1 = shell.execute('exit');
    expect(e1.output).toContain('Connection to db01 closed.');
    expect(shell.getSessionDepth()).toBe(2);
    expect(shell.getPromptInfo().hostname).toBe('jump01');

    shell.execute('exit');
    expect(shell.getSessionDepth()).toBe(1);
    expect(shell.getPromptInfo().hostname).toBe('admin-ws');
  });
});
