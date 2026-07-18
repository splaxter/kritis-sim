import { describe, it, expect } from 'vitest';
import { createHostState } from './hosts';

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

  it('re-parses sshd_config on refreshSshdEffective', () => {
    const host = createHostState({ id: 'w', hostname: 'w' });
    host.vfs.addFile('/etc/ssh/sshd_config', 'PermitRootLogin no\nPasswordAuthentication no\n');
    expect(host.sshdEffective.passwordAuthentication).toBe(true); // not yet applied
    host.refreshSshdEffective();
    expect(host.sshdEffective).toEqual({ permitRootLogin: false, passwordAuthentication: false });
  });
});
