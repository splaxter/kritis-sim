/**
 * Ansible modules: lineinfile, copy, service, user — changed/failed/diff
 * semantics, check mode (compute without writing), idempotency.
 */
import { describe, it, expect } from 'vitest';
import { createHostState, HostState } from '../hosts';
import { createLinuxFilesystem } from '../VirtualFilesystem';
import { VirtualFilesystemInterface } from '../types';
import { ANSIBLE_MODULES, ModuleRunOptions } from './modules';

function controller(): VirtualFilesystemInterface {
  return createLinuxFilesystem({ user: 'timo', hostname: 'ansible01' });
}

function opts(check = false): ModuleRunOptions {
  return { check, controllerVfs: controller() };
}

function host(files: { path: string; content: string }[] = []): HostState {
  return createHostState({ id: 'web01', hostname: 'web01', vfsOverlay: { files } });
}

const lineinfile = ANSIBLE_MODULES.lineinfile;
const copy = ANSIBLE_MODULES.copy;
const service = ANSIBLE_MODULES.service;
const user = ANSIBLE_MODULES.user;

describe('lineinfile: present', () => {
  const SSHD = 'Port 22\n#PermitRootLogin prohibit-password\nX11Forwarding yes\n';

  it('replaces the first regexp match, changed + diff', () => {
    const h = host([{ path: '/etc/ssh/sshd_config', content: SSHD }]);
    const r = lineinfile(h, { path: '/etc/ssh/sshd_config', regexp: '^#?PermitRootLogin', line: 'PermitRootLogin no' }, opts());
    expect(r.changed).toBe(true);
    expect(r.failed).toBeUndefined();
    expect(r.diff).toEqual({
      before: SSHD,
      after: 'Port 22\nPermitRootLogin no\nX11Forwarding yes\n',
    });
    expect(h.vfs.readFile('/etc/ssh/sshd_config')).toMatchObject({ ok: true, value: 'Port 22\nPermitRootLogin no\nX11Forwarding yes\n' });
  });

  it('is idempotent: second run with the line already in place is not changed', () => {
    const h = host([{ path: '/etc/ssh/sshd_config', content: SSHD }]);
    const params = { path: '/etc/ssh/sshd_config', regexp: '^#?PermitRootLogin', line: 'PermitRootLogin no' };
    expect(lineinfile(h, params, opts()).changed).toBe(true);
    expect(lineinfile(h, params, opts()).changed).toBe(false);
  });

  it('appends when the regexp matches nothing', () => {
    const h = host([{ path: '/etc/x', content: 'a\n' }]);
    const r = lineinfile(h, { path: '/etc/x', regexp: '^nomatch', line: 'b' }, opts());
    expect(r.changed).toBe(true);
    expect(h.vfs.readFile('/etc/x')).toMatchObject({ ok: true, value: 'a\nb\n' });
  });

  it('no regexp: appends unless the exact line exists', () => {
    const h = host([{ path: '/etc/x', content: 'a\n' }]);
    expect(lineinfile(h, { path: '/etc/x', line: 'a' }, opts()).changed).toBe(false);
    expect(lineinfile(h, { path: '/etc/x', line: 'b' }, opts()).changed).toBe(true);
    expect(h.vfs.readFile('/etc/x')).toMatchObject({ ok: true, value: 'a\nb\n' });
  });

  it('creates a missing file with the line', () => {
    const h = host();
    const r = lineinfile(h, { path: '/etc/neu.conf', line: 'interval=60' }, opts());
    expect(r.changed).toBe(true);
    expect(r.diff).toEqual({ before: '', after: 'interval=60\n' });
    expect(h.vfs.readFile('/etc/neu.conf')).toMatchObject({ ok: true, value: 'interval=60\n' });
  });

  it('check mode computes changed + diff without writing', () => {
    const h = host([{ path: '/etc/x', content: 'a\n' }]);
    const r = lineinfile(h, { path: '/etc/x', regexp: '^a$', line: 'b' }, opts(true));
    expect(r.changed).toBe(true);
    expect(r.diff).toEqual({ before: 'a\n', after: 'b\n' });
    expect(h.vfs.readFile('/etc/x')).toMatchObject({ ok: true, value: 'a\n' });
  });

  it('missing path fails with the ansible wording', () => {
    const r = lineinfile(host(), { line: 'x' }, opts());
    expect(r.failed).toBe('missing required arguments: path');
  });

  it('missing line fails for state=present', () => {
    const r = lineinfile(host(), { path: '/etc/x' }, opts());
    expect(r.failed).toContain('line is required');
  });
});

describe('lineinfile: absent', () => {
  it('removes all matching lines, changed + diff', () => {
    const h = host([{ path: '/etc/hosts', content: '127.0.0.1 localhost\n91.203.5.77 evil\n91.203.5.77 evil2\n' }]);
    const r = lineinfile(h, { path: '/etc/hosts', regexp: '91\\.203\\.5\\.77', state: 'absent' }, opts());
    expect(r.changed).toBe(true);
    expect(h.vfs.readFile('/etc/hosts')).toMatchObject({ ok: true, value: '127.0.0.1 localhost\n' });
  });

  it('not changed when nothing matches or the file is missing', () => {
    const h = host([{ path: '/etc/hosts', content: 'a\n' }]);
    expect(lineinfile(h, { path: '/etc/hosts', regexp: 'zzz', state: 'absent' }, opts()).changed).toBe(false);
    expect(lineinfile(h, { path: '/etc/nix', regexp: 'zzz', state: 'absent' }, opts()).changed).toBe(false);
  });

  it('requires regexp for state=absent', () => {
    const r = lineinfile(host(), { path: '/etc/x', state: 'absent' }, opts());
    expect(r.failed).toContain('regexp is required');
  });
});

describe('copy', () => {
  it('writes content, changed + diff, applies mode', () => {
    const h = host();
    const r = copy(h, { dest: '/etc/motd', content: 'Willkommen\n', mode: '0644' }, opts());
    expect(r.changed).toBe(true);
    expect(r.diff).toEqual({ before: '', after: 'Willkommen\n' });
    expect(h.vfs.readFile('/etc/motd')).toMatchObject({ ok: true, value: 'Willkommen\n' });
    const stat = h.vfs.stat('/etc/motd');
    expect(stat.ok && stat.value.permissions.other.read).toBe(true);
    expect(stat.ok && stat.value.permissions.other.write).toBe(false);
  });

  it('is idempotent on identical content', () => {
    const h = host([{ path: '/etc/motd', content: 'Willkommen\n' }]);
    expect(copy(h, { dest: '/etc/motd', content: 'Willkommen\n' }, opts()).changed).toBe(false);
  });

  it('reads src from the CONTROLLER vfs', () => {
    const o = opts();
    o.controllerVfs.addFile('/opt/files/banner.txt', 'KRITIS Zone\n');
    const h = host();
    const r = copy(h, { dest: '/etc/banner', src: '/opt/files/banner.txt' }, o);
    expect(r.changed).toBe(true);
    expect(h.vfs.readFile('/etc/banner')).toMatchObject({ ok: true, value: 'KRITIS Zone\n' });
  });

  it('missing src on the controller fails', () => {
    const r = copy(host(), { dest: '/etc/x', src: '/nix/da.txt' }, opts());
    expect(r.failed).toContain('could not find src=/nix/da.txt');
  });

  it('check mode does not write and does not chmod', () => {
    const h = host([{ path: '/etc/motd', content: 'alt\n' }]);
    const r = copy(h, { dest: '/etc/motd', content: 'neu\n' }, opts(true));
    expect(r.changed).toBe(true);
    expect(h.vfs.readFile('/etc/motd')).toMatchObject({ ok: true, value: 'alt\n' });
  });

  it('missing dest / missing content+src fail', () => {
    expect(copy(host(), { content: 'x' }, opts()).failed).toBe('missing required arguments: dest');
    expect(copy(host(), { dest: '/etc/x' }, opts()).failed).toContain('src (or content) is required');
  });
});

describe('service', () => {
  it('restarted is always changed and refreshes sshdEffective', () => {
    const h = host([{ path: '/etc/ssh/sshd_config', content: 'PermitRootLogin yes\n' }]);
    h.vfs.addFile('/etc/ssh/sshd_config', 'PermitRootLogin no\n');
    const r = service(h, { name: 'ssh', state: 'restarted' }, opts());
    expect(r).toMatchObject({ changed: true });
    expect(h.sshdEffective.permitRootLogin).toBe(false);
  });

  it('started is changed only when the unit was not active', () => {
    const h = createHostState({ id: 'w', hostname: 'w', services: [{ unit: 'foo.service', active: 'inactive', desc: 'Foo' }] });
    expect(service(h, { name: 'foo', state: 'started' }, opts()).changed).toBe(true);
    expect(service(h, { name: 'foo', state: 'started' }, opts()).changed).toBe(false);
  });

  it('stopped is changed only when the unit was active', () => {
    const h = host();
    expect(service(h, { name: 'apache2', state: 'stopped' }, opts()).changed).toBe(true);
    expect(service(h, { name: 'apache2', state: 'stopped' }, opts()).changed).toBe(false);
  });

  it('enabled flips report changed', () => {
    const h = host();
    expect(service(h, { name: 'apache2', enabled: false }, opts()).changed).toBe(true);
    expect(service(h, { name: 'apache2', enabled: false }, opts()).changed).toBe(false);
    expect(h.services.find(u => u.unit === 'apache2.service')!.enabled).toBe('disabled');
  });

  it('precondition failure surfaces as failed with the journal message', () => {
    const h = createHostState({
      id: 'w', hostname: 'w',
      services: [{
        unit: 'telemetryd.service', active: 'failed', desc: 'Telemetry',
        startRequires: [{ file: '/etc/telemetryd.conf', failMessage: 'telemetryd: config missing' }],
      }],
    });
    const r = service(h, { name: 'telemetryd', state: 'started' }, opts());
    expect(r.failed).toContain('telemetryd: config missing');
  });

  it('check mode reports would-change without mutating', () => {
    const h = host();
    const r = service(h, { name: 'ssh', state: 'restarted' }, opts(true));
    expect(r.changed).toBe(true);
    const stop = service(h, { name: 'apache2', state: 'stopped' }, opts(true));
    expect(stop.changed).toBe(true);
    expect(h.services.find(u => u.unit === 'apache2.service')!.active).toBe('active');
  });

  it('unknown unit and missing name fail', () => {
    expect(service(host(), { name: 'nixda', state: 'started' }, opts()).failed).toContain('Could not find the requested service nixda');
    expect(service(host(), { state: 'started' }, opts()).failed).toBe('missing required arguments: name');
  });
});

describe('user', () => {
  it('present creates the account and home, changed iff created', () => {
    const h = host();
    const r = user(h, { name: 'deploy' }, opts());
    expect(r.changed).toBe(true);
    expect(h.accounts.some(a => a.name === 'deploy')).toBe(true);
    expect(h.vfs.isDirectory('/home/deploy')).toBe(true);
    expect(user(h, { name: 'deploy' }, opts()).changed).toBe(false);
  });

  it('absent removes the account, changed iff it existed', () => {
    const h = host();
    user(h, { name: 'deploy' }, opts());
    expect(user(h, { name: 'deploy', state: 'absent' }, opts()).changed).toBe(true);
    expect(h.accounts.some(a => a.name === 'deploy')).toBe(false);
    expect(user(h, { name: 'deploy', state: 'absent' }, opts()).changed).toBe(false);
  });

  it('check mode does not create anything', () => {
    const h = host();
    const r = user(h, { name: 'deploy' }, opts(true));
    expect(r.changed).toBe(true);
    expect(h.accounts.some(a => a.name === 'deploy')).toBe(false);
    expect(h.vfs.isDirectory('/home/deploy')).toBe(false);
  });

  it('missing name fails', () => {
    expect(user(host(), {}, opts()).failed).toBe('missing required arguments: name');
  });
});
