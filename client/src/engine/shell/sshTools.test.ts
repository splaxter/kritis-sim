/**
 * ssh-keygen / ssh-copy-id / scp: deterministic key generation, key
 * distribution, and file transfer across simulated hosts.
 */
import { describe, it, expect } from 'vitest';
import { createShell } from './index';
import { createHostState } from './hosts';
import { ShellEngine } from './ShellEngine';

const PUBKEY = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5TimoKey timo@admin-ws';

function baseShell(): ShellEngine {
  return createShell({ type: 'bash', user: 'timo', hostname: 'admin-ws' });
}

function web01Spec(overrides: Record<string, unknown> = {}) {
  return {
    id: 'web01',
    hostname: 'web01',
    ip: '10.0.20.11',
    accounts: [{ name: 'admin', password: 'sonnenblume23' }, { name: 'root' }],
    ...overrides,
  };
}

/** Pre-generated keypair in ~/.ssh, mode 600 (mirrors ssh.test.ts fixture). */
function seedLocalKey(shell: ShellEngine) {
  const vfs = shell.getVfs();
  vfs.addFile('/home/timo/.ssh/id_ed25519', '-----BEGIN OPENSSH PRIVATE KEY-----\nfake\n-----END OPENSSH PRIVATE KEY-----\n');
  vfs.chmod('/home/timo/.ssh/id_ed25519', '600');
  vfs.addFile('/home/timo/.ssh/id_ed25519.pub', `${PUBKEY}\n`);
}

describe('ssh-keygen', () => {
  it('default interactive flow: empty answers create id_rsa with tight private perms', () => {
    const shell = baseShell();
    const r1 = shell.execute('ssh-keygen');
    expect(r1.output).toContain('Generating public/private rsa key pair.');
    expect(r1.pendingInput).toEqual({
      prompt: 'Enter file in which to save the key (/home/timo/.ssh/id_rsa): ',
      mask: false,
    });
    const r2 = shell.continueInput('');
    expect(r2.pendingInput).toEqual({ prompt: 'Enter passphrase (empty for no passphrase): ', mask: true });
    const r3 = shell.continueInput('');
    expect(r3.pendingInput).toEqual({ prompt: 'Enter same passphrase again: ', mask: true });
    const r4 = shell.continueInput('');
    expect(r4.exitCode).toBe(0);
    expect(r4.output).toContain('Your identification has been saved in /home/timo/.ssh/id_rsa');
    expect(r4.output).toContain('Your public key has been saved in /home/timo/.ssh/id_rsa.pub');
    expect(r4.output).toContain('The key fingerprint is:\nSHA256:');
    expect(r4.output).toContain('+---[RSA 3072]----+');
    expect(r4.output).toContain('+----[SHA256]-----+');

    const vfs = shell.getVfs();
    const priv = vfs.stat('/home/timo/.ssh/id_rsa');
    expect(priv.ok).toBe(true);
    if (priv.ok) {
      expect(priv.value.permissions.owner).toEqual({ read: true, write: true, execute: false });
      expect(priv.value.permissions.group.read).toBe(false);
      expect(priv.value.permissions.other.read).toBe(false);
    }
    const pub = vfs.stat('/home/timo/.ssh/id_rsa.pub');
    expect(pub.ok).toBe(true);
    if (pub.ok) {
      expect(pub.value.permissions.other.read).toBe(true);
    }
    const sshDir = vfs.stat('/home/timo/.ssh');
    expect(sshDir.ok && sshDir.value.permissions.other.read).toBe(false);
  });

  it('-t ed25519 -f <path> -N "" runs fully non-interactive', () => {
    const shell = baseShell();
    const r = shell.execute("ssh-keygen -t ed25519 -f /home/timo/.ssh/id_ed25519 -N ''");
    expect(r.pendingInput).toBeUndefined();
    expect(r.exitCode).toBe(0);
    expect(r.output).toContain('Your identification has been saved in /home/timo/.ssh/id_ed25519');
    expect(r.output).toContain('+--[ED25519 256]--+');
    const vfs = shell.getVfs();
    expect(vfs.isFile('/home/timo/.ssh/id_ed25519')).toBe(true);
    expect(vfs.isFile('/home/timo/.ssh/id_ed25519.pub')).toBe(true);
    const read = vfs.readFile('/home/timo/.ssh/id_ed25519');
    expect(read.ok && read.value).toContain('OPENSSH PRIVATE KEY');
  });

  it('pubkey carries the <user>@<hostname> comment and the ed25519 prefix', () => {
    const shell = baseShell();
    shell.execute("ssh-keygen -t ed25519 -f /home/timo/.ssh/id_ed25519 -N ''");
    const read = shell.getVfs().readFile('/home/timo/.ssh/id_ed25519.pub');
    expect(read.ok).toBe(true);
    if (read.ok) {
      expect(read.value.trim()).toMatch(/^ssh-ed25519 AAAAC3[a-z0-9]+ timo@admin-ws$/);
    }
  });

  it('-C sets a custom comment', () => {
    const shell = baseShell();
    shell.execute("ssh-keygen -t ed25519 -f /home/timo/.ssh/id_deploy -N '' -C deploy@kritis");
    const read = shell.getVfs().readFile('/home/timo/.ssh/id_deploy.pub');
    expect(read.ok && read.value.trim().endsWith(' deploy@kritis')).toBe(true);
  });

  it('successive generations produce different key material (counter)', () => {
    const shell = baseShell();
    shell.execute("ssh-keygen -t ed25519 -f /home/timo/.ssh/key_a -N ''");
    shell.execute("ssh-keygen -t ed25519 -f /home/timo/.ssh/key_b -N ''");
    const vfs = shell.getVfs();
    const a = vfs.readFile('/home/timo/.ssh/key_a.pub');
    const b = vfs.readFile('/home/timo/.ssh/key_b.pub');
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(a.value).not.toBe(b.value);
    }
  });

  it('unknown key type fails with the real error message', () => {
    const shell = baseShell();
    const r = shell.execute('ssh-keygen -t dsa');
    expect(r.error).toBe('unknown key type dsa');
    expect(r.exitCode).toBe(1);
  });

  it('existing key file prompts Overwrite; y regenerates', () => {
    const shell = baseShell();
    shell.execute("ssh-keygen -t ed25519 -f /home/timo/.ssh/id_ed25519 -N ''");
    const before = shell.getVfs().readFile('/home/timo/.ssh/id_ed25519.pub');
    const r = shell.execute("ssh-keygen -t ed25519 -f /home/timo/.ssh/id_ed25519 -N ''");
    expect(r.pendingInput).toEqual({
      prompt: '/home/timo/.ssh/id_ed25519 already exists.\nOverwrite (y/n)? ',
      mask: false,
    });
    expect(r.output).toBe('Generating public/private ed25519 key pair.');
    const r2 = shell.continueInput('y');
    expect(r2.exitCode).toBe(0);
    // Announce appears once (with the prompt), not again in the summary.
    expect(r2.output).not.toContain('Generating');
    const after = shell.getVfs().readFile('/home/timo/.ssh/id_ed25519.pub');
    expect(before.ok && after.ok).toBe(true);
    if (before.ok && after.ok) {
      expect(after.value).not.toBe(before.value);
    }
  });

  it('existing key file: answering n aborts silently, exit 1, file untouched', () => {
    const shell = baseShell();
    shell.execute("ssh-keygen -t ed25519 -f /home/timo/.ssh/id_ed25519 -N ''");
    const before = shell.getVfs().readFile('/home/timo/.ssh/id_ed25519.pub');
    shell.execute("ssh-keygen -t ed25519 -f /home/timo/.ssh/id_ed25519 -N ''");
    const r = shell.continueInput('n');
    expect(r.exitCode).toBe(1);
    expect(r.output).toBe('');
    const after = shell.getVfs().readFile('/home/timo/.ssh/id_ed25519.pub');
    expect(before.ok && after.ok && after.value === before.value).toBe(true);
  });

  it('passphrase mismatch re-prompts once, second mismatch fails exit 1', () => {
    const shell = baseShell();
    shell.execute('ssh-keygen');
    shell.continueInput('');
    shell.continueInput('geheim-a');
    const r1 = shell.continueInput('geheim-b');
    expect(r1.output).toContain('Passphrases do not match.  Try again.');
    expect(r1.pendingInput).toEqual({ prompt: 'Enter passphrase (empty for no passphrase): ', mask: true });
    shell.continueInput('geheim-c');
    const r2 = shell.continueInput('geheim-d');
    expect(r2.exitCode).toBe(1);
    expect(shell.hasPendingInput()).toBe(false);
    expect(shell.getVfs().isFile('/home/timo/.ssh/id_rsa')).toBe(false);
  });
});

describe('ssh-copy-id', () => {
  it('password flow appends the key and creates .ssh 700 / authorized_keys 644', () => {
    const shell = baseShell();
    seedLocalKey(shell);
    const target = createHostState(web01Spec());
    shell.registerHost(target);
    const r = shell.execute('ssh-copy-id admin@web01');
    expect(r.pendingInput).toEqual({ prompt: "admin@web01's password: ", mask: true });
    const r2 = shell.continueInput('sonnenblume23');
    expect(r2.exitCode).toBe(0);
    expect(r2.output).toContain('Number of key(s) added: 1');
    expect(r2.output).toContain(`"ssh 'admin@web01'"`);

    const ak = target.vfs.readFile('/home/admin/.ssh/authorized_keys');
    expect(ak.ok && ak.value).toContain(PUBKEY);
    const dirStat = target.vfs.stat('/home/admin/.ssh');
    expect(dirStat.ok).toBe(true);
    if (dirStat.ok) {
      expect(dirStat.value.permissions.owner.execute).toBe(true);
      expect(dirStat.value.permissions.other.read).toBe(false);
    }
    const akStat = target.vfs.stat('/home/admin/.ssh/authorized_keys');
    expect(akStat.ok && akStat.value.permissions.other.read).toBe(true);
    // scp/ssh-copy-id never open a session
    expect(shell.getSessionDepth()).toBe(1);
  });

  it('second run is idempotent: skip message, no duplicate line', () => {
    const shell = baseShell();
    seedLocalKey(shell);
    const target = createHostState(web01Spec());
    shell.registerHost(target);
    shell.execute('ssh-copy-id admin@web01');
    shell.continueInput('sonnenblume23');

    const r = shell.execute('ssh-copy-id admin@web01');
    expect(r.pendingInput).toBeUndefined();
    expect(r.exitCode).toBe(0);
    expect(r.output).toContain('All keys were skipped because they already exist on the remote system.');
    const ak = target.vfs.readFile('/home/admin/.ssh/authorized_keys');
    expect(ak.ok).toBe(true);
    if (ak.ok) {
      const occurrences = ak.value.split('\n').filter(l => l.trim() === PUBKEY).length;
      expect(occurrences).toBe(1);
    }
  });

  it('no identities in ~/.ssh fails with ERROR: No identities found', () => {
    const shell = baseShell();
    shell.registerHost(createHostState(web01Spec()));
    const r = shell.execute('ssh-copy-id admin@web01');
    expect(r.error).toBe('ssh-copy-id: ERROR: No identities found');
    expect(r.exitCode).toBe(1);
  });

  it('PasswordAuthentication no + no installed key: denied, nothing written', () => {
    const shell = baseShell();
    seedLocalKey(shell);
    const target = createHostState(web01Spec({
      vfsOverlay: { files: [{ path: '/etc/ssh/sshd_config', content: 'PasswordAuthentication no\n' }] },
    }));
    shell.registerHost(target);
    const r = shell.execute('ssh-copy-id admin@web01');
    expect(r.error).toBe('Permission denied (publickey).');
    expect(r.exitCode).toBe(255);
    expect(target.vfs.exists('/home/admin/.ssh/authorized_keys')).toBe(false);
  });

  it('unreachable host reports the ssh resolution error', () => {
    const shell = baseShell();
    seedLocalKey(shell);
    const r = shell.execute('ssh-copy-id admin@nix');
    expect(r.error).toBe('ssh: Could not resolve hostname nix: Name or service not known');
    expect(r.exitCode).toBe(255);
  });

  it('-i pointing at a private key without .pub fails, nothing written', () => {
    const shell = baseShell();
    const vfs = shell.getVfs();
    vfs.addFile('/home/timo/.ssh/id_only_priv', '-----BEGIN OPENSSH PRIVATE KEY-----\nfake\n-----END OPENSSH PRIVATE KEY-----\n');
    vfs.chmod('/home/timo/.ssh/id_only_priv', '600');
    const target = createHostState(web01Spec());
    shell.registerHost(target);
    const r = shell.execute('ssh-copy-id -i /home/timo/.ssh/id_only_priv admin@web01');
    expect(r.error).toBe('ssh-copy-id: ERROR: /home/timo/.ssh/id_only_priv is not a public key');
    expect(r.exitCode).toBe(1);
    expect(target.vfs.exists('/home/admin/.ssh/authorized_keys')).toBe(false);
  });

  it('-i with an explicit .pub path installs that key', () => {
    const shell = baseShell();
    seedLocalKey(shell);
    const target = createHostState(web01Spec());
    shell.registerHost(target);
    const r = shell.execute('ssh-copy-id -i /home/timo/.ssh/id_ed25519.pub admin@web01');
    expect(r.pendingInput).toEqual({ prompt: "admin@web01's password: ", mask: true });
    const r2 = shell.continueInput('sonnenblume23');
    expect(r2.exitCode).toBe(0);
    expect(r2.output).toContain('Number of key(s) added: 1');
    const ak = target.vfs.readFile('/home/admin/.ssh/authorized_keys');
    expect(ak.ok && ak.value).toContain(PUBKEY);
  });

  it('-i installs a NEW second key even though the first key already authenticates', () => {
    const shell = baseShell();
    seedLocalKey(shell);
    const vfs = shell.getVfs();
    const PUBKEY2 = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5DeployKey deploy@admin-ws';
    vfs.addFile('/home/timo/.ssh/id_deploy', '-----BEGIN OPENSSH PRIVATE KEY-----\nfake2\n-----END OPENSSH PRIVATE KEY-----\n');
    vfs.chmod('/home/timo/.ssh/id_deploy', '600');
    vfs.addFile('/home/timo/.ssh/id_deploy.pub', `${PUBKEY2}\n`);
    // First key is already authorized — plain ssh would log straight in.
    const target = createHostState(web01Spec({
      vfsOverlay: { files: [{ path: '/home/admin/.ssh/authorized_keys', content: `${PUBKEY}\n` }] },
    }));
    shell.registerHost(target);
    const r = shell.execute('ssh-copy-id -i /home/timo/.ssh/id_deploy admin@web01');
    expect(r.pendingInput).toBeUndefined();
    expect(r.exitCode).toBe(0);
    expect(r.output).toContain('Number of key(s) added: 1');
    const ak = target.vfs.readFile('/home/admin/.ssh/authorized_keys');
    expect(ak.ok).toBe(true);
    if (ak.ok) {
      expect(ak.value).toContain(PUBKEY);
      expect(ak.value).toContain(PUBKEY2);
    }
  });
});

describe('scp', () => {
  function keyedSetup() {
    const shell = baseShell();
    seedLocalKey(shell);
    const target = createHostState(web01Spec({
      vfsOverlay: { files: [
        { path: '/home/admin/.ssh/authorized_keys', content: `${PUBKEY}\n` },
        { path: '/etc/motd', content: 'Wartungsfenster Freitag 22:00\n' },
      ] },
    }));
    shell.registerHost(target);
    return { shell, target };
  }

  it('upload via key auth copies the content and prints a progress line', () => {
    const { shell, target } = keyedSetup();
    shell.getVfs().addFile('/home/timo/notes.txt', 'Portfreigabe dokumentieren\n');
    const r = shell.execute('scp /home/timo/notes.txt admin@web01:/tmp/notes.txt');
    expect(r.exitCode).toBe(0);
    expect(r.output).toMatch(/notes\.txt\s+100%\s+\d+B\s+1\.2MB\/s\s+00:00/);
    const remote = target.vfs.readFile('/tmp/notes.txt');
    expect(remote.ok && remote.value).toBe('Portfreigabe dokumentieren\n');
    expect(shell.getSessionDepth()).toBe(1);
  });

  it('upload to a directory path appends the basename', () => {
    const { shell, target } = keyedSetup();
    shell.getVfs().addFile('/home/timo/notes.txt', 'x\n');
    const r = shell.execute('scp /home/timo/notes.txt admin@web01:/tmp/');
    expect(r.exitCode).toBe(0);
    expect(target.vfs.isFile('/tmp/notes.txt')).toBe(true);
  });

  it('download to . lands the basename in the cwd', () => {
    const { shell } = keyedSetup();
    const r = shell.execute('scp admin@web01:/etc/motd .');
    expect(r.exitCode).toBe(0);
    expect(r.output).toMatch(/motd\s+100%\s+\d+B\s+1\.2MB\/s\s+00:00/);
    const vfs = shell.getVfs();
    const local = vfs.readFile(vfs.resolvePath('motd'));
    expect(local.ok && local.value).toBe('Wartungsfenster Freitag 22:00\n');
  });

  it('relative remote path resolves against the remote home', () => {
    const { shell, target } = keyedSetup();
    shell.getVfs().addFile('/home/timo/notes.txt', 'x\n');
    const r = shell.execute('scp /home/timo/notes.txt admin@web01:notes.txt');
    expect(r.exitCode).toBe(0);
    expect(target.vfs.isFile('/home/admin/notes.txt')).toBe(true);
  });

  it('missing local source fails with No such file or directory', () => {
    const { shell } = keyedSetup();
    const r = shell.execute('scp /home/timo/nix.txt admin@web01:/tmp/');
    expect(r.error).toBe('scp: /home/timo/nix.txt: No such file or directory');
    expect(r.exitCode).toBe(1);
  });

  it('missing remote target directory fails with No such file or directory', () => {
    const { shell } = keyedSetup();
    shell.getVfs().addFile('/home/timo/notes.txt', 'x\n');
    const r = shell.execute('scp /home/timo/notes.txt admin@web01:/nonexistent/notes.txt');
    expect(r.error).toBe('scp: /nonexistent/notes.txt: No such file or directory');
    expect(r.exitCode).toBe(1);
  });

  it('denied without key and without password auth: exit 255, nothing written', () => {
    const shell = baseShell();
    shell.getVfs().addFile('/home/timo/notes.txt', 'x\n');
    const target = createHostState(web01Spec({
      vfsOverlay: { files: [{ path: '/etc/ssh/sshd_config', content: 'PasswordAuthentication no\n' }] },
    }));
    shell.registerHost(target);
    const r = shell.execute('scp /home/timo/notes.txt admin@web01:/tmp/notes.txt');
    expect(r.error).toBe('Permission denied (publickey).');
    expect(r.exitCode).toBe(255);
    expect(target.vfs.exists('/tmp/notes.txt')).toBe(false);
  });

  it('password-auth upload works via continueInput', () => {
    const shell = baseShell();
    shell.getVfs().addFile('/home/timo/notes.txt', 'inhalt\n');
    const target = createHostState(web01Spec());
    shell.registerHost(target);
    const r = shell.execute('scp /home/timo/notes.txt admin@web01:/tmp/notes.txt');
    expect(r.pendingInput).toEqual({ prompt: "admin@web01's password: ", mask: true });
    const r2 = shell.continueInput('sonnenblume23');
    expect(r2.exitCode).toBe(0);
    expect(r2.output).toMatch(/notes\.txt\s+100%/);
    const remote = target.vfs.readFile('/tmp/notes.txt');
    expect(remote.ok && remote.value).toBe('inhalt\n');
    expect(shell.getSessionDepth()).toBe(1);
  });

  it('two remote sides are rejected with a friendly error', () => {
    const { shell } = keyedSetup();
    const r = shell.execute('scp admin@web01:/etc/motd admin@web01:/tmp/motd');
    expect(r.exitCode).toBe(1);
    expect(r.error).toContain('entfernt');
  });

  it('two local sides are rejected with a friendly error', () => {
    const { shell } = keyedSetup();
    shell.getVfs().addFile('/home/timo/notes.txt', 'x\n');
    const r = shell.execute('scp /home/timo/notes.txt /home/timo/kopie.txt');
    expect(r.exitCode).toBe(1);
    expect(r.error).toContain('entfernt');
  });
});

describe('golden path: keygen → ssh-copy-id → passwordless ssh', () => {
  it('runs the full level-1 sequence without a password prompt on the final ssh', () => {
    const shell = baseShell();
    shell.registerHost(createHostState(web01Spec()));

    const gen = shell.execute("ssh-keygen -t ed25519 -f /home/timo/.ssh/id_ed25519 -N ''");
    expect(gen.exitCode).toBe(0);

    const copy = shell.execute('ssh-copy-id admin@web01');
    expect(copy.pendingInput).toEqual({ prompt: "admin@web01's password: ", mask: true });
    const copied = shell.continueInput('sonnenblume23');
    expect(copied.exitCode).toBe(0);
    expect(copied.output).toContain('Number of key(s) added: 1');

    const login = shell.execute('ssh admin@web01');
    expect(login.pendingInput).toBeUndefined();
    expect(login.exitCode).toBe(0);
    expect(login.output).toContain('Last login');
    expect(shell.getSessionDepth()).toBe(2);
    expect(shell.getPromptInfo().hostname).toBe('web01');
  });
});
