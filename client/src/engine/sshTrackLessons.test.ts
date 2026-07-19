import { describe, it, expect } from 'vitest';
import { advancedLearningEvents } from '../content/events/learning-path-advanced';
import { createShellFromContext, checkStateGoals } from './shell';
import { ShellEngine } from './shell/ShellEngine';
import { GameEvent, TerminalContext } from '@kritis/shared';

/**
 * SSH & Remote-Zugriff track proof suite. For every level we drive the
 * documented solution path through the real ShellEngine and assert the
 * authored stateGoals flip to true. Password prompts are answered via
 * continueInput. Level 2 additionally proves an ALTERNATIVE path wins, so the
 * win is genuinely state-based, not tied to one command string.
 */

const byId = (id: string): GameEvent => {
  const ev = advancedLearningEvents.find((e) => e.id === id);
  if (!ev) throw new Error(`level ${id} not authored`);
  return ev;
};

const ctxOf = (id: string): TerminalContext => byId(id).terminalContext!;

/** Build a fresh engine for a level. */
const engineOf = (id: string): ShellEngine => createShellFromContext(ctxOf(id));

const goalsOf = (id: string) => ctxOf(id).solutions[0].stateGoals!;

/** Answer any pending password/passphrase prompts, then run the next command. */
function run(shell: ShellEngine, cmd: string): void {
  const r = shell.execute(cmd);
  expect(shell.hasPendingInput(), `unexpected pending input after "${cmd}": ${r.error ?? r.output}`).toBe(false);
}

describe('ssh track — hint ladder discipline', () => {
  for (const ev of advancedLearningEvents.filter((e) => e.tags?.includes('ssh'))) {
    it(`${ev.id}: first hint orients (no backtick), last hint gives exact syntax`, () => {
      const hints = ev.terminalContext!.hints;
      expect(hints.length).toBeGreaterThanOrEqual(3);
      expect(hints[0].includes('`'), `first hint names a command: ${hints[0]}`).toBe(false);
      expect(hints[hints.length - 1].includes('`'), 'last hint must give exact syntax').toBe(true);
    });
  }
});

describe('learn_ssh_01_first_key — keygen → copy-id → passwordless login', () => {
  it('deploys the public key onto web01 (goal met)', () => {
    const shell = engineOf('learn_ssh_01_first_key');
    const goals = goalsOf('learn_ssh_01_first_key');
    expect(checkStateGoals(shell, goals)).toBe(false);

    // ssh-keygen -t ed25519: prompt file location, then passphrase twice.
    let r = shell.execute('ssh-keygen -t ed25519');
    expect(shell.hasPendingInput()).toBe(true); // file location
    r = shell.continueInput(''); // default path
    expect(shell.hasPendingInput()).toBe(true); // passphrase
    r = shell.continueInput(''); // empty passphrase
    expect(shell.hasPendingInput()).toBe(true); // confirm passphrase
    r = shell.continueInput(''); // confirm empty
    expect(shell.hasPendingInput()).toBe(false);
    expect(r.exitCode).toBe(0);

    // ssh-copy-id admin@web01: needs the account password.
    shell.execute('ssh-copy-id admin@web01');
    expect(shell.hasPendingInput()).toBe(true);
    const copied = shell.continueInput('sonnenblume23');
    expect(copied.exitCode).toBe(0);

    // Core find: the key now lives in web01's authorized_keys.
    expect(checkStateGoals(shell, goals)).toBe(true);

    // And the payoff: passwordless login, no prompt.
    run(shell, 'ssh admin@web01');
    expect(shell.getPromptInfo().hostname).toBe('web01');
  });
});

describe('learn_ssh_02_open_door — harden sshd_config on web01', () => {
  const login = (shell: ShellEngine) => {
    shell.execute('ssh admin@web01');
    expect(shell.hasPendingInput()).toBe(true);
    const r = shell.continueInput('sonnenblume23');
    expect(r.exitCode).toBe(0);
    expect(shell.getPromptInfo().hostname).toBe('web01');
  };

  it('documented path: sudo sed -i on both directives + restart', () => {
    const shell = engineOf('learn_ssh_02_open_door');
    const goals = goalsOf('learn_ssh_02_open_door');
    expect(checkStateGoals(shell, goals)).toBe(false);

    login(shell);
    run(shell, "sudo sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config");
    run(shell, "sudo sed -i 's/^PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config");
    run(shell, 'sudo systemctl restart ssh');

    expect(checkStateGoals(shell, goals)).toBe(true);
  });

  it('ALTERNATIVE path wins too: a different sed form (broad substitution)', () => {
    // Proves the win is state-based, not tied to the documented command string:
    // a single broad substitution reaches the same goal state (and removes the
    // "yes" lines, satisfying the absentMatches guards).
    const shell = engineOf('learn_ssh_02_open_door');
    const goals = goalsOf('learn_ssh_02_open_door');

    login(shell);
    run(shell, "sudo sed -i 's/yes/no/' /etc/ssh/sshd_config");
    run(shell, 'sudo systemctl restart ssh');

    expect(checkStateGoals(shell, goals)).toBe(true);
  });

  it('NEGATIVE: append-only (echo >> leaving the yes line) does NOT satisfy', () => {
    // sshd honours the FIRST match: appending "no" below the surviving "yes"
    // leaves the box insecure — the absentMatches guards must reject it.
    const shell = engineOf('learn_ssh_02_open_door');
    const goals = goalsOf('learn_ssh_02_open_door');

    login(shell);
    run(shell, "echo 'PermitRootLogin no' >> /etc/ssh/sshd_config");
    run(shell, "echo 'PasswordAuthentication no' >> /etc/ssh/sshd_config");
    run(shell, 'sudo systemctl restart ssh');

    // The insecure "yes" lines still exist above the appended "no" lines.
    const cfg = shell.resolveHost('web01')!.vfs.readFile('/etc/ssh/sshd_config');
    expect(cfg.ok && cfg.value).toMatch(/^PermitRootLogin yes/m);
    expect(checkStateGoals(shell, goals)).toBe(false);
  });
});

describe('learn_ssh_03_jumphost — jump through the segmented zone', () => {
  it('db01 is unreachable directly, reachable via jump01; report lands on jump01', () => {
    const shell = engineOf('learn_ssh_03_jumphost');
    const goals = goalsOf('learn_ssh_03_jumphost');
    expect(checkStateGoals(shell, goals)).toBe(false);

    // Direct hop into the DB zone must time out (from-restricted firewall).
    const direct = shell.execute('ssh admin@db01');
    expect(shell.hasPendingInput()).toBe(false);
    expect(direct.exitCode).toBe(255);
    expect(direct.error).toMatch(/timed out/i);

    // Hop 1: onto the jumphost.
    shell.execute('ssh admin@jump01');
    expect(shell.hasPendingInput()).toBe(true);
    expect(shell.continueInput('sprungbrett07').exitCode).toBe(0);
    expect(shell.getPromptInfo().hostname).toBe('jump01');

    // Hop 2: fetch the report from db01 (reachable now, from jump01's IP).
    shell.execute('scp admin@db01:/var/dbdumps/status.txt /tmp/statusbericht.txt');
    expect(shell.hasPendingInput()).toBe(true);
    expect(shell.continueInput('kraftwerk-db-2024').exitCode).toBe(0);

    expect(checkStateGoals(shell, goals)).toBe(true);
  });

  it('NEGATIVE: a bare touch of an empty file does NOT satisfy (content marker required)', () => {
    const shell = engineOf('learn_ssh_03_jumphost');
    const goals = goalsOf('learn_ssh_03_jumphost');

    // Reach the jumphost, then fake the deliverable with an empty file.
    shell.execute('ssh admin@jump01');
    expect(shell.continueInput('sprungbrett07').exitCode).toBe(0);
    run(shell, 'touch /tmp/statusbericht.txt');

    expect(checkStateGoals(shell, goals)).toBe(false);
  });
});

describe('learn_ssh_04_key_graveyard — evidence-first, then targeted removal', () => {
  it('secures evidence BEFORE removing the rogue key (both goals met)', () => {
    const shell = engineOf('learn_ssh_04_key_graveyard');
    const goals = goalsOf('learn_ssh_04_key_graveyard');
    expect(checkStateGoals(shell, goals)).toBe(false);

    // Step 1: pull the evidence copy to the local workstation.
    shell.execute('scp admin@db01:/home/admin/.ssh/authorized_keys evidenz_db01.txt');
    expect(shell.hasPendingInput()).toBe(true);
    expect(shell.continueInput('kraftwerk-db-2024').exitCode).toBe(0);

    // Evidence copy captured the rogue key; the goal is not yet complete
    // because the rogue line is still live on db01.
    expect(checkStateGoals(shell, goals)).toBe(false);

    // Step 2: log into db01 and remove ONLY the orphan line.
    shell.execute('ssh admin@db01');
    expect(shell.hasPendingInput()).toBe(true);
    expect(shell.continueInput('kraftwerk-db-2024').exitCode).toBe(0);
    run(shell, "sed -i '/wartung@extern/d' /home/admin/.ssh/authorized_keys");

    expect(checkStateGoals(shell, goals)).toBe(true);
  });

  it('the legit keys survive the cleanup', () => {
    const shell = engineOf('learn_ssh_04_key_graveyard');
    shell.execute('scp admin@db01:/home/admin/.ssh/authorized_keys evidenz_db01.txt');
    shell.continueInput('kraftwerk-db-2024');
    shell.execute('ssh admin@db01');
    shell.continueInput('kraftwerk-db-2024');
    run(shell, "sed -i '/wartung@extern/d' /home/admin/.ssh/authorized_keys");
    const db01 = shell.resolveHost('db01')!;
    const ak = db01.vfs.readFile('/home/admin/.ssh/authorized_keys');
    expect(ak.ok && ak.value).toMatch(/jens@ws-jens/);
    expect(ak.ok && ak.value).toMatch(/henry@ws-henry/);
    expect(ak.ok && ak.value).not.toMatch(/wartung@extern/);
  });
});
