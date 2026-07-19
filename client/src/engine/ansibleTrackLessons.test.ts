import { describe, it, expect } from 'vitest';
import { advancedLearningEvents } from '../content/events/learning-path-advanced';
import { createShellFromContext, checkStateGoals, checkStateGoal } from './shell';
import { ShellEngine } from './shell/ShellEngine';
import { GameEvent, TerminalContext } from '@kritis/shared';

/**
 * Ansible & Konfigurationsmanagement track proof suite. Every level runs on the
 * controller ansible01 (user `deploy`) and reaches web01/web02/web03 by KEY
 * AUTH only — the controller's mode-600 private key must match each target's
 * authorized_keys, or the run fails UNREACHABLE. We drive each documented path
 * through the real ShellEngine and assert the authored stateGoals flip true.
 *
 * ans_01: --check shows would-change, real run converges.
 * ans_02: --check --diff fingers web02; apply; second run proves idempotency.
 * ans_03: broken playbook fails naming the task; sed fix; clean rerun.
 * ans_04: player extends the playbook via echo-append, then hardens all three.
 */

const byId = (id: string): GameEvent => {
  const ev = advancedLearningEvents.find((e) => e.id === id);
  if (!ev) throw new Error(`level ${id} not authored`);
  return ev;
};

const ctxOf = (id: string): TerminalContext => byId(id).terminalContext!;
const engineOf = (id: string): ShellEngine => createShellFromContext(ctxOf(id));
const goalsOf = (id: string) => ctxOf(id).solutions[0].stateGoals!;

/** Run a command; assert it left no dangling pending-input prompt. */
function run(shell: ShellEngine, cmd: string): { exitCode: number; output: string; error?: string } {
  const r = shell.execute(cmd);
  expect(shell.hasPendingInput(), `unexpected pending input after "${cmd}"`).toBe(false);
  return { exitCode: r.exitCode, output: r.output, error: r.error };
}

describe('ansible track — hint ladder discipline', () => {
  for (const ev of advancedLearningEvents.filter((e) => e.id.startsWith('learn_ans'))) {
    it(`${ev.id}: first hint orients (no backtick), last hint gives exact syntax`, () => {
      const hints = ev.terminalContext!.hints;
      expect(hints.length).toBeGreaterThanOrEqual(3);
      expect(hints[0].includes('`'), `first hint names a command: ${hints[0]}`).toBe(false);
      expect(hints[hints.length - 1].includes('`'), 'last hint must give exact syntax').toBe(true);
    });
  }
});

describe('key-auth reachability (no UNREACHABLE) on the first run of every level', () => {
  const firstRun: Record<string, string> = {
    learn_ans_01_inventory: 'ansible-playbook motd.yml --check',
    learn_ans_02_drift: 'ansible-playbook harden.yml --check --diff',
    learn_ans_03_broken_playbook: 'ansible-playbook deploy.yml',
    learn_ans_04_fleet_hardening: 'ansible-playbook harden-fleet.yml --check',
  };
  for (const [id, cmd] of Object.entries(firstRun)) {
    it(`${id}: controller reaches all targets by key`, () => {
      const shell = engineOf(id);
      const out = run(shell, cmd).output;
      expect(out, `UNREACHABLE in ${id}`).not.toMatch(/UNREACHABLE/);
      expect(out).toMatch(/PLAY RECAP/);
      // No host was unreachable in the recap.
      expect(out).not.toMatch(/unreachable=[1-9]/);
    });
  }
});

describe('learn_ans_01_inventory — check first, apply second', () => {
  it('--check predicts the change without writing; the real run converges', () => {
    const shell = engineOf('learn_ans_01_inventory');
    const goals = goalsOf('learn_ans_01_inventory');
    expect(checkStateGoals(shell, goals)).toBe(false);

    // Trockenlauf: reports changes but must not touch the hosts.
    const check = run(shell, 'ansible-playbook motd.yml --check');
    expect(check.exitCode).toBe(0);
    expect(check.output).toMatch(/changed: \[web01\]/);
    expect(checkStateGoals(shell, goals)).toBe(false); // --check wrote nothing

    // Real run applies.
    const real = run(shell, 'ansible-playbook motd.yml');
    expect(real.exitCode).toBe(0);
    expect(real.output).toMatch(/changed=[1-9]/);
    expect(checkStateGoals(shell, goals)).toBe(true);

    // Verify on a host via ssh (key auth, no password prompt).
    const login = run(shell, 'ssh web01');
    expect(login.exitCode).toBe(0);
    expect(shell.getPromptInfo().hostname).toBe('web01');
    expect(run(shell, 'cat /etc/motd').output).toMatch(/Zugriff nur nach Freigabe/);
  });
});

describe('learn_ans_02_drift — only web02 drifts; the second run is the proof', () => {
  it('--check --diff fingers web02, apply fixes it, rerun shows changed=0', () => {
    const shell = engineOf('learn_ans_02_drift');
    const goals = goalsOf('learn_ans_02_drift');
    expect(checkStateGoals(shell, goals)).toBe(false);

    const diff = run(shell, 'ansible-playbook harden.yml --check --diff');
    expect(diff.output).toMatch(/changed: \[web02\]/);
    // web01/web03 already conform → they report ok, not changed.
    expect(diff.output).toMatch(/ok: \[web01\]/);
    expect(diff.output).toMatch(/ok: \[web03\]/);
    // Diff exposes the offending line.
    expect(diff.output).toMatch(/PermitRootLogin yes/);

    run(shell, 'ansible-playbook harden.yml');
    expect(checkStateGoals(shell, goals)).toBe(true);

    // The idempotency proof: a second real run changes nothing.
    const second = run(shell, 'ansible-playbook harden.yml');
    expect(second.output).toMatch(/web01\s+: ok=1\s+changed=0/);
    expect(second.output).toMatch(/web02\s+: ok=1\s+changed=0/);
    expect(second.output).toMatch(/web03\s+: ok=1\s+changed=0/);
    expect(second.output).not.toMatch(/changed=[1-9]/);
  });

  it('web01 and web03 are never touched (they already said no)', () => {
    const shell = engineOf('learn_ans_02_drift');
    run(shell, 'ansible-playbook harden.yml');
    for (const h of ['web01', 'web03']) {
      const host = shell.resolveHost(h)!;
      const cfg = host.vfs.readFile('/etc/ssh/sshd_config');
      expect(cfg.ok && cfg.value).toMatch(/^PermitRootLogin no/m);
      expect(cfg.ok && cfg.value).not.toMatch(/PermitRootLogin yes/);
    }
  });
});

describe('learn_ans_03_broken_playbook — read the failure, fix the typo, rerun', () => {
  it('first run fails naming the task; sed fix; clean rerun hardens all hosts', () => {
    const shell = engineOf('learn_ans_03_broken_playbook');
    const goals = goalsOf('learn_ans_03_broken_playbook');
    expect(checkStateGoals(shell, goals)).toBe(false);

    // The broken run fails on the missing required `path`, under its TASK name.
    const broken = run(shell, 'ansible-playbook deploy.yml');
    expect(broken.exitCode).toBe(2);
    expect(broken.output).toMatch(/FAILED!/);
    expect(broken.output).toMatch(/TASK \[Banner-Datei schreiben\]/);
    expect(broken.output).toMatch(/path/);
    expect(checkStateGoals(shell, goals)).toBe(false);

    // Fix the typo in the playbook itself.
    expect(run(shell, "sudo sed -i 's/pathh:/path:/' /opt/playbooks/deploy.yml").exitCode).toBe(0);

    const fixed = run(shell, 'ansible-playbook deploy.yml');
    expect(fixed.exitCode).toBe(0);
    expect(fixed.output).not.toMatch(/FAILED!/);
    expect(checkStateGoals(shell, goals)).toBe(true);
  });

  it('NEGATIVE: rerunning without fixing the typo stays broken', () => {
    const shell = engineOf('learn_ans_03_broken_playbook');
    const goals = goalsOf('learn_ans_03_broken_playbook');
    run(shell, 'ansible-playbook deploy.yml');
    run(shell, 'ansible-playbook deploy.yml');
    expect(checkStateGoals(shell, goals)).toBe(false);
  });
});

describe('learn_ans_04_fleet_hardening — extend the playbook, harden the fleet', () => {
  const F = '/opt/playbooks/harden-fleet.yml';
  function appendPasswordTask(shell: ShellEngine): void {
    run(shell, `echo '    - name: Passwort-Login abschalten' >> ${F}`);
    run(shell, `echo '      lineinfile:' >> ${F}`);
    run(shell, `echo '        path: /etc/ssh/sshd_config' >> ${F}`);
    run(shell, `echo '        regexp: ^#?PasswordAuthentication' >> ${F}`);
    run(shell, `echo '        line: PasswordAuthentication no' >> ${F}`);
  }

  it('the appended YAML parses and hardens both directives on all three hosts', () => {
    const shell = engineOf('learn_ans_04_fleet_hardening');
    const goals = goalsOf('learn_ans_04_fleet_hardening');
    expect(checkStateGoals(shell, goals)).toBe(false);

    appendPasswordTask(shell);

    // The extended playbook must parse (no syntax error) and name both tasks.
    const syntax = run(shell, 'ansible-playbook harden-fleet.yml --syntax-check');
    expect(syntax.exitCode, syntax.error).toBe(0);

    const real = run(shell, 'ansible-playbook harden-fleet.yml');
    expect(real.exitCode, real.error).toBe(0);
    expect(real.output).toMatch(/TASK \[Root-Login abschalten\]/);
    expect(real.output).toMatch(/TASK \[Passwort-Login abschalten\]/);
    expect(checkStateGoals(shell, goals)).toBe(true);

    // Spot-check via ssh: both directives really stand on web03.
    run(shell, 'ssh web03');
    const cfg = run(shell, 'cat /etc/ssh/sshd_config').output;
    expect(cfg).toMatch(/^PermitRootLogin no/m);
    expect(cfg).toMatch(/^PasswordAuthentication no/m);
  });

  it('idempotent: a second run after hardening changes nothing', () => {
    const shell = engineOf('learn_ans_04_fleet_hardening');
    appendPasswordTask(shell);
    run(shell, 'ansible-playbook harden-fleet.yml');
    const second = run(shell, 'ansible-playbook harden-fleet.yml');
    expect(second.output).not.toMatch(/changed=[1-9]/);
  });

  it('NEGATIVE: running without extending the playbook leaves PasswordAuthentication unmet', () => {
    const shell = engineOf('learn_ans_04_fleet_hardening');
    const goals = goalsOf('learn_ans_04_fleet_hardening');
    run(shell, 'ansible-playbook harden-fleet.yml');
    // PermitRootLogin is hardened, but PasswordAuthentication is not.
    expect(checkStateGoal(shell, goals[0])).toBe(true); // web01 PermitRootLogin no
    expect(checkStateGoal(shell, goals[1])).toBe(false); // web01 PasswordAuthentication no
    expect(checkStateGoals(shell, goals)).toBe(false);
  });
});
