/**
 * applyUnitState: the shared unit-mutation core used by systemctl and the
 * ansible service module — started/stopped/restarted semantics, changed
 * reporting, preconditions, journal writes, sshdEffective refresh.
 */
import { describe, it, expect } from 'vitest';
import { createHostState, HostState } from './hosts';
import { applyUnitState } from './unitControl';

function telemetryHost(): HostState {
  return createHostState({
    id: 'h1',
    hostname: 'h1',
    services: [
      {
        unit: 'telemetryd.service',
        active: 'failed',
        desc: 'Telemetry',
        startRequires: [
          { file: '/etc/telemetryd.conf', failMessage: 'telemetryd: config /etc/telemetryd.conf missing' },
        ],
      },
    ],
  });
}

describe('applyUnitState: started', () => {
  it('starts an inactive unit: ok, changed, journal Started entry', () => {
    const host = createHostState({ id: 'h', hostname: 'h', services: [{ unit: 'foo.service', active: 'inactive', desc: 'Foo' }] });
    const out = applyUnitState(host, 'foo', 'started');
    expect(out).toMatchObject({ ok: true, changed: true });
    const unit = host.services.find(u => u.unit === 'foo.service')!;
    expect(unit.active).toBe('active');
    expect(unit.sub).toBe('running');
    expect(host.journal[host.journal.length - 1].message).toBe('Started Foo.');
  });

  it('is a no-op on an already active unit: ok, not changed, no journal entry', () => {
    const host = createHostState({ id: 'h', hostname: 'h' });
    const before = host.journal.length;
    const out = applyUnitState(host, 'apache2', 'started');
    expect(out).toMatchObject({ ok: true, changed: false });
    expect(host.journal.length).toBe(before);
  });

  it('fails on an unmet precondition: not ok, failMessage, unit failed, err journal', () => {
    const host = telemetryHost();
    const out = applyUnitState(host, 'telemetryd', 'started');
    expect(out.ok).toBe(false);
    expect(out.changed).toBe(false);
    expect(out.failMessage).toContain('telemetryd: config /etc/telemetryd.conf missing');
    const unit = host.services.find(u => u.unit === 'telemetryd.service')!;
    expect(unit.active).toBe('failed');
    const last = host.journal[host.journal.length - 1];
    expect(last.priority).toBe('err');
    expect(last.unit).toBe('telemetryd');
  });

  it('succeeds once the precondition holds', () => {
    const host = telemetryHost();
    host.vfs.addFile('/etc/telemetryd.conf', 'interval=10\n');
    const out = applyUnitState(host, 'telemetryd', 'started');
    expect(out).toMatchObject({ ok: true, changed: true });
    expect(host.services.find(u => u.unit === 'telemetryd.service')!.active).toBe('active');
  });
});

describe('applyUnitState: stopped', () => {
  it('stops an active unit: ok, changed, journal Stopped entry', () => {
    const host = createHostState({ id: 'h', hostname: 'h' });
    const out = applyUnitState(host, 'apache2', 'stopped');
    expect(out).toMatchObject({ ok: true, changed: true });
    const unit = host.services.find(u => u.unit === 'apache2.service')!;
    expect(unit.active).toBe('inactive');
    expect(unit.sub).toBe('dead');
    expect(unit.pid).toBeUndefined();
    expect(host.journal[host.journal.length - 1].message).toBe('Stopped The Apache HTTP Server.');
  });

  it('is a no-op on an inactive unit', () => {
    const host = createHostState({ id: 'h', hostname: 'h', services: [{ unit: 'foo.service', active: 'inactive', desc: 'Foo' }] });
    const before = host.journal.length;
    const out = applyUnitState(host, 'foo', 'stopped');
    expect(out).toMatchObject({ ok: true, changed: false });
    expect(host.journal.length).toBe(before);
  });
});

describe('applyUnitState: restarted', () => {
  it('restarting an active unit is always changed', () => {
    const host = createHostState({ id: 'h', hostname: 'h' });
    const out = applyUnitState(host, 'apache2', 'restarted');
    expect(out).toMatchObject({ ok: true, changed: true });
    expect(host.journal[host.journal.length - 1].message).toBe('Started The Apache HTTP Server.');
  });

  it('restart of ssh refreshes sshdEffective from the live config', () => {
    const host = createHostState({ id: 'h', hostname: 'h' });
    host.vfs.addFile('/etc/ssh/sshd_config', 'PermitRootLogin no\nPasswordAuthentication no\n');
    expect(host.sshdEffective.passwordAuthentication).toBe(true); // stale
    const out = applyUnitState(host, 'ssh', 'restarted');
    expect(out.ok).toBe(true);
    expect(host.sshdEffective).toEqual({ permitRootLogin: false, passwordAuthentication: false });
  });

  it('accepts unit aliases (sshd → ssh.service)', () => {
    const host = createHostState({ id: 'h', hostname: 'h' });
    const out = applyUnitState(host, 'sshd', 'restarted');
    expect(out).toMatchObject({ ok: true, changed: true });
  });
});

describe('applyUnitState: unknown unit', () => {
  it('reports the ansible-style could-not-find message', () => {
    const host = createHostState({ id: 'h', hostname: 'h' });
    const out = applyUnitState(host, 'nixda', 'started');
    expect(out.ok).toBe(false);
    expect(out.changed).toBe(false);
    expect(out.failMessage).toBe('Could not find the requested service nixda: host');
  });
});
