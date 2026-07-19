import { describe, it, expect } from 'vitest';
import { canonicalUnitName, createHostState, derivedUnitPid, formatJournalTs, UNIT_ALIASES } from './hosts';

describe('canonicalUnitName', () => {
  it('appends .service when missing and keeps full names', () => {
    expect(canonicalUnitName('telemetryd')).toBe('telemetryd.service');
    expect(canonicalUnitName('telemetryd.service')).toBe('telemetryd.service');
  });

  it('resolves unit aliases before suffixing', () => {
    expect(UNIT_ALIASES['sshd']).toBe('ssh.service');
    expect(canonicalUnitName('sshd')).toBe('ssh.service');
    expect(canonicalUnitName('ssh')).toBe('ssh.service');
    expect(canonicalUnitName('ssh.service')).toBe('ssh.service');
  });
});

describe('formatJournalTs', () => {
  it("renders 'YYYY-MM-DD HH:MM:SS' as syslog-style 'Mon DD HH:MM:SS'", () => {
    expect(formatJournalTs('2026-07-18 06:00:00')).toBe('Jul 18 06:00:00');
    expect(formatJournalTs('2026-12-01 23:59:59')).toBe('Dec 01 23:59:59');
  });

  it('passes unparseable timestamps through unchanged', () => {
    expect(formatJournalTs('gestern')).toBe('gestern');
  });
});

describe('derivedUnitPid', () => {
  it('is deterministic, in the 100-999 range, and ignores the .service suffix', () => {
    expect(derivedUnitPid('telemetryd')).toBe(derivedUnitPid('telemetryd.service'));
    expect(derivedUnitPid('apache2')).toBeGreaterThanOrEqual(100);
    expect(derivedUnitPid('apache2')).toBeLessThan(1000);
    // Stable across calls.
    expect(derivedUnitPid('apache2')).toBe(derivedUnitPid('apache2'));
  });
});

describe('createHostState', () => {
  it('builds a host with its own VFS, default services and firewall', () => {
    const host = createHostState({ id: 'web01', hostname: 'web01.stadtwerke.local', ip: '10.0.20.11' });
    expect(host.vfs.exists('/etc')).toBe(true);
    expect(host.services.find(s => s.unit === 'ssh.service')?.active).toBe('active');
    expect(host.firewall.defaultIncoming).toBe('allow');
    expect(host.sshdEffective.passwordAuthentication).toBe(true);
  });

  it('applies spec overrides: overlay files, services, journal, firewall, accounts', () => {
    const host = createHostState({
      id: 'db01', hostname: 'db01', accounts: [{ name: 'admin', password: 'x' }],
      vfsOverlay: { files: [{ path: '/etc/motd', content: 'hi' }] },
      services: [{ unit: 'telemetryd.service', active: 'failed', desc: 'Telemetry' }],
      journal: [{ ts: '2026-07-18 06:00:00', unit: 'telemetryd', message: 'boom' }],
      firewall: { defaultIncoming: 'deny', rules: [{ action: 'allow', port: 22 }] },
    });
    expect(host.vfs.readFile('/etc/motd')).toMatchObject({ ok: true, value: 'hi' });
    expect(host.services.find(s => s.unit === 'telemetryd.service')?.active).toBe('failed');
    expect(host.journal).toHaveLength(1);
    expect(host.firewall.rules[0]).toMatchObject({ action: 'allow', port: 22 });
    expect(host.accounts.map(a => a.name)).toContain('admin');
  });

  it('replaces default units on override instead of appending', () => {
    const host = createHostState({
      id: 'w', hostname: 'w',
      services: [{ unit: 'ssh.service', active: 'inactive' }],
    });
    const ssh = host.services.find(s => s.unit === 'ssh.service');
    expect(ssh?.active).toBe('inactive');
    expect(ssh?.sub).toBe('dead');
    expect(host.services).toHaveLength(7);
  });

  it('keeps the default sub when a partial override does not set active', () => {
    const host = createHostState({
      id: 'w', hostname: 'w',
      services: [{ unit: 'networking.service', enabled: 'disabled' }],
    });
    const net = host.services.find(s => s.unit === 'networking.service');
    expect(net?.active).toBe('active');
    expect(net?.sub).toBe('exited');
    expect(net?.enabled).toBe('disabled');
  });

  it('re-parses sshd_config on refreshSshdEffective', () => {
    const host = createHostState({ id: 'w', hostname: 'w' });
    host.vfs.addFile('/etc/ssh/sshd_config', 'PermitRootLogin no\nPasswordAuthentication no\n');
    expect(host.sshdEffective.passwordAuthentication).toBe(true); // not yet applied
    host.refreshSshdEffective();
    expect(host.sshdEffective).toEqual({ permitRootLogin: false, passwordAuthentication: false });
  });

  it('applies an overlay file mode so a 600 SSH private key is not group/other-readable', () => {
    const host = createHostState({
      id: 'ansible01', hostname: 'ansible01',
      vfsOverlay: {
        files: [
          { path: '/home/deploy/.ssh/id_ed25519', content: 'PRIVATE', mode: '600' },
          { path: '/home/deploy/.ssh/id_ed25519.pub', content: 'ssh-ed25519 AAAA deploy@ansible01' },
        ],
      },
    });
    const priv = host.vfs.stat('/home/deploy/.ssh/id_ed25519');
    expect(priv.ok).toBe(true);
    if (priv.ok) {
      expect(priv.value.permissions.group.read).toBe(false);
      expect(priv.value.permissions.other.read).toBe(false);
    }
    // The public key keeps the default 644 (group-readable is fine for a pubkey).
    const pub = host.vfs.stat('/home/deploy/.ssh/id_ed25519.pub');
    expect(pub.ok && pub.value.permissions.group.read).toBe(true);
  });
});
