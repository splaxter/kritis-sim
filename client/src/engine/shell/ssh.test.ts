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
import { checkStateGoals } from './stateGoals';

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

  it('deny-22 restricted to a foreign source IP does not block the local host', () => {
    const shell = baseShell();
    shell.registerHost(createHostState(web01Spec({
      firewall: { rules: [{ action: 'deny', port: 22, from: '10.9.9.9' }] },
    })));
    const r = shell.execute('ssh admin@web01');
    expect(r.error).toBeUndefined();
    expect(r.pendingInput).toEqual({ prompt: "admin@web01's password: ", mask: true });
  });

  it('deny-22 for udp only does not block ssh (tcp)', () => {
    const shell = baseShell();
    shell.registerHost(createHostState(web01Spec({
      firewall: { rules: [{ action: 'deny', port: 22, proto: 'udp' }] },
    })));
    const r = shell.execute('ssh admin@web01');
    expect(r.error).toBeUndefined();
    expect(r.pendingInput).toBeTruthy();
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

  it('unprotected first key + valid second key: logs in AND prints the warning', () => {
    const shell = baseShell();
    const vfs = shell.getVfs();
    // 'id_alt' sorts/inserts before the valid key and is world-readable.
    vfs.addFile('/home/timo/.ssh/id_alt', 'fake');
    vfs.addFile('/home/timo/.ssh/id_alt.pub', 'ssh-ed25519 AAAAC3AltKey timo@admin-ws\n');
    seedLocalKey(shell);
    shell.registerHost(createHostState(web01Spec({
      vfsOverlay: { files: [{ path: '/home/admin/.ssh/authorized_keys', content: `${PUBKEY}\n` }] },
    })));
    const r = shell.execute('ssh admin@web01');
    expect(r.exitCode).toBe(0);
    expect(r.output).toContain('WARNING: UNPROTECTED PRIVATE KEY FILE!');
    expect(r.output).toContain('Last login');
    expect(shell.getSessionDepth()).toBe(2);
  });

  it('two unprotected keys: both warnings are printed', () => {
    const shell = baseShell();
    const vfs = shell.getVfs();
    vfs.addFile('/home/timo/.ssh/id_alt', 'fake');
    vfs.addFile('/home/timo/.ssh/id_alt.pub', 'ssh-ed25519 AAAAC3AltKey timo@admin-ws\n');
    seedLocalKey(shell, { worldReadable: true });
    shell.registerHost(createHostState(web01Spec()));
    const r = shell.execute('ssh admin@web01');
    expect(r.output).toContain("'/home/timo/.ssh/id_alt'");
    expect(r.output).toContain("'/home/timo/.ssh/id_ed25519'");
  });

  it('ssh <host> without user@ defaults to the current user', () => {
    const shell = baseShell();
    shell.registerHost(createHostState(web01Spec({
      accounts: [{ name: 'timo', password: 'geheim1' }],
    })));
    const r = shell.execute('ssh web01');
    expect(r.pendingInput).toEqual({ prompt: "timo@web01's password: ", mask: true });
  });
});

describe('ssh: loggedIn goal recording', () => {
  it('a real key login records method publickey; a publickey goal is met, password is NOT', () => {
    const shell = baseShell();
    seedLocalKey(shell);
    shell.registerHost(createHostState(web01Spec({
      vfsOverlay: { files: [{ path: '/home/admin/.ssh/authorized_keys', content: `${PUBKEY}\n` }] },
    })));
    const r = shell.execute('ssh admin@web01');
    expect(r.exitCode).toBe(0);
    expect(checkStateGoals(shell, [{ loggedIn: { host: 'web01', method: 'publickey' } }])).toBe(true);
    // The passwordless key login must NOT satisfy a password-method goal.
    expect(checkStateGoals(shell, [{ loggedIn: { host: 'web01', method: 'password' } }])).toBe(false);
  });

  it('a real password login records method password, not publickey', () => {
    const shell = baseShell();
    shell.registerHost(createHostState(web01Spec()));
    shell.execute('ssh admin@web01');
    shell.continueInput('sonnenblume23');
    expect(shell.getSessionDepth()).toBe(2);
    expect(checkStateGoals(shell, [{ loggedIn: { host: 'web01', method: 'password' } }])).toBe(true);
    // A publickey-required goal is NOT satisfied by a password login.
    expect(checkStateGoals(shell, [{ loggedIn: { host: 'web01', method: 'publickey' } }])).toBe(false);
  });

  it('no login → loggedIn goal is false', () => {
    const shell = baseShell();
    shell.registerHost(createHostState(web01Spec()));
    expect(checkStateGoals(shell, [{ loggedIn: { host: 'web01' } }])).toBe(false);
  });

  it('login persists after exit (you still logged in)', () => {
    const shell = baseShell();
    seedLocalKey(shell);
    shell.registerHost(createHostState(web01Spec({
      vfsOverlay: { files: [{ path: '/home/admin/.ssh/authorized_keys', content: `${PUBKEY}\n` }] },
    })));
    shell.execute('ssh admin@web01');
    shell.execute('exit');
    expect(shell.getSessionDepth()).toBe(1);
    expect(checkStateGoals(shell, [{ loggedIn: { host: 'web01', method: 'publickey' } }])).toBe(true);
  });
});

describe('ssh: unsupported invocations', () => {
  it('option-looking args get the friendly German one-liner, exit 255', () => {
    const shell = baseShell();
    shell.registerHost(createHostState(web01Spec()));
    const r = shell.execute('ssh -p 2222 admin@web01');
    expect(r.error).toBe('ssh: Optionen werden in dieser Simulation nicht unterstützt');
    expect(r.exitCode).toBe(255);
  });

  it('remote commands are rejected with the German hint, exit 255', () => {
    const shell = baseShell();
    shell.registerHost(createHostState(web01Spec()));
    const r = shell.execute('ssh admin@web01 uptime');
    expect(r.error).toContain('Entfernte Einzelbefehle');
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
