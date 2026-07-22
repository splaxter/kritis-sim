import { describe, it, expect } from 'vitest';
import { advancedLearningEvents } from '../content/events/learning-path-advanced';
import { createShellFromContext, checkStateGoals, checkStateGoal } from './shell';
import { ShellEngine } from './shell/ShellEngine';
import { selectFeedback } from './shell/feedback';
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
  /** Drive keygen + copy-id (the setup); the LOGIN is asserted separately. */
  function deployKey(shell: ShellEngine): void {
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
  }

  it('installing the key alone does NOT finish — the passwordless login is the win', () => {
    const shell = engineOf('learn_ssh_01_first_key');
    const goals = goalsOf('learn_ssh_01_first_key');
    expect(checkStateGoals(shell, goals)).toBe(false);

    deployKey(shell);

    // Key deployed, but the promised login has not happened yet.
    expect(checkStateGoals(shell, goals)).toBe(false);

    // The payoff: passwordless login, no prompt — NOW the level is solved.
    run(shell, 'ssh admin@web01');
    expect(shell.getPromptInfo().hostname).toBe('web01');
    expect(checkStateGoals(shell, goals)).toBe(true);
  });

  it('NEGATIVE: a password login does not satisfy the publickey login goal', () => {
    const shell = engineOf('learn_ssh_01_first_key');
    // No key deployed — log in via password instead.
    shell.execute('ssh admin@web01');
    expect(shell.hasPendingInput()).toBe(true);
    expect(shell.continueInput('sonnenblume23').exitCode).toBe(0);
    expect(shell.getPromptInfo().hostname).toBe('web01');
    // The method matters: password does not meet the publickey goal.
    expect(checkStateGoal(shell, { loggedIn: { host: 'web01', method: 'publickey' } })).toBe(false);
    expect(checkStateGoal(shell, { loggedIn: { host: 'web01', method: 'password' } })).toBe(true);
    expect(checkStateGoals(shell, goalsOf('learn_ssh_01_first_key'))).toBe(false);
  });
});

describe('learn_ssh_02_open_door — key continuity + effective-config enforcement', () => {
  /** The pre-seeded onboarding key logs the player in — no password prompt. */
  const keyLogin = (shell: ShellEngine) => {
    const r = shell.execute('ssh admin@web01');
    expect(shell.hasPendingInput(), 'key login must not prompt for a password').toBe(false);
    expect(r.exitCode).toBe(0);
    expect(shell.getPromptInfo().hostname).toBe('web01');
  };

  it('documented path: key login → sudo sed -i on both directives → restart', () => {
    const shell = engineOf('learn_ssh_02_open_door');
    const goals = goalsOf('learn_ssh_02_open_door');
    expect(checkStateGoals(shell, goals)).toBe(false);

    keyLogin(shell);
    run(shell, "sudo sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config");
    run(shell, "sudo sed -i 's/^PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config");

    // sshdEffective proof: the FILE is hardened, but without a restart the
    // running daemon still honours the old config — the goals stay unmet.
    expect(checkStateGoals(shell, goals)).toBe(false);

    run(shell, 'sudo systemctl restart ssh');
    expect(checkStateGoals(shell, goals)).toBe(true);
  });

  it('ALTERNATIVE path wins too: a different sed form (broad substitution)', () => {
    // Proves the win is state-based, not tied to one command string: a single
    // broad substitution reaches the same goal state (and removes the "yes"
    // lines, satisfying the absentMatches guards).
    const shell = engineOf('learn_ssh_02_open_door');
    const goals = goalsOf('learn_ssh_02_open_door');

    keyLogin(shell);
    run(shell, "sudo sed -i 's/yes/no/' /etc/ssh/sshd_config");
    run(shell, 'sudo systemctl restart ssh');

    expect(checkStateGoals(shell, goals)).toBe(true);
  });

  it('NEGATIVE: append-only (echo >> leaving the yes line) does NOT satisfy', () => {
    // sshd honours the FIRST match: appending "no" below the surviving "yes"
    // leaves the box insecure — the absentMatches guards must reject it.
    const shell = engineOf('learn_ssh_02_open_door');
    const goals = goalsOf('learn_ssh_02_open_door');

    keyLogin(shell);
    run(shell, "echo 'PermitRootLogin no' >> /etc/ssh/sshd_config");
    run(shell, "echo 'PasswordAuthentication no' >> /etc/ssh/sshd_config");
    run(shell, 'sudo systemctl restart ssh');

    // The insecure "yes" lines still exist above the appended "no" lines.
    const cfg = shell.resolveHost('web01')!.vfs.readFile('/etc/ssh/sshd_config');
    expect(cfg.ok && cfg.value).toMatch(/^PermitRootLogin yes/m);
    expect(checkStateGoals(shell, goals)).toBe(false);
  });

  it('after-action feedback: key-login before restart → ✓; harden+restart before the key test → ⚠', () => {
    const fb = ctxOf('learn_ssh_02_open_door').solutions[0].feedback!;
    const goals = goalsOf('learn_ssh_02_open_door');

    // Clean: prove the key FIRST (publickey login, no prompt), then harden + restart.
    const clean = engineOf('learn_ssh_02_open_door');
    keyLogin(clean);
    run(clean, "sudo sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config");
    run(clean, "sudo sed -i 's/^PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config");
    run(clean, 'sudo systemctl restart ssh');
    expect(checkStateGoals(clean, goals)).toBe(true);
    expect(selectFeedback(fb, clean.getExecutionLog())).toMatch(/^✓/);

    // Risky: hide the key so the working login is via the emergency password;
    // harden + restart; only THEN restore the key and test it — a Blindflug.
    const risky = engineOf('learn_ssh_02_open_door');
    run(risky, 'mv /home/timo/.ssh/id_ed25519 /home/timo/.ssh/id_ed25519.weg');
    risky.execute('ssh admin@web01');
    expect(risky.hasPendingInput(), 'without the key a password prompt appears').toBe(true);
    expect(risky.continueInput('sonnenblume23').exitCode).toBe(0);
    run(risky, "sudo sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config");
    run(risky, "sudo sed -i 's/^PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config");
    run(risky, 'sudo systemctl restart ssh');
    run(risky, 'exit');
    // Restore the key and test it — AFTER the hardening already happened.
    run(risky, 'mv /home/timo/.ssh/id_ed25519.weg /home/timo/.ssh/id_ed25519');
    run(risky, 'ssh admin@web01'); // publickey now, after the restart
    expect(risky.getPromptInfo().hostname).toBe('web01');
    expect(checkStateGoals(risky, goals)).toBe(true);
    expect(selectFeedback(fb, risky.getExecutionLog())).toMatch(/^⚠/);
  });

  it('NEGATIVE: a password-only login leaves the publickey login goal unmet', () => {
    // Player who never tested their key: hide the private key, fall back to
    // the emergency password, then harden + restart. Everything else is done —
    // but the "prove your key works" goal must reject the win.
    const shell = engineOf('learn_ssh_02_open_door');
    const goals = goalsOf('learn_ssh_02_open_door');

    run(shell, 'mv /home/timo/.ssh/id_ed25519 /home/timo/.ssh/id_ed25519.weg');
    shell.execute('ssh admin@web01');
    expect(shell.hasPendingInput(), 'without the key a password prompt appears').toBe(true);
    expect(shell.continueInput('sonnenblume23').exitCode).toBe(0);
    expect(shell.getPromptInfo().hostname).toBe('web01');

    run(shell, "sudo sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config");
    run(shell, "sudo sed -i 's/^PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config");
    run(shell, 'sudo systemctl restart ssh');

    // File + effective config are hardened, but the key was never proven.
    expect(checkStateGoal(shell, { loggedIn: { host: 'web01', method: 'publickey' } })).toBe(false);
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

  /** Evidence secured, then logged into db01 — the shared trap/clean setup. */
  const reachDb01WithEvidence = (shell: ShellEngine): void => {
    shell.execute('scp admin@db01:/home/admin/.ssh/authorized_keys evidenz_db01.txt');
    expect(shell.continueInput('kraftwerk-db-2024').exitCode).toBe(0);
    shell.execute('ssh admin@db01');
    expect(shell.continueInput('kraftwerk-db-2024').exitCode).toBe(0);
  };

  it('CORRECTNESS: emptying the key file no longer wins (preservation goals)', () => {
    const shell = engineOf('learn_ssh_04_key_graveyard');
    const goals = goalsOf('learn_ssh_04_key_graveyard');
    reachDb01WithEvidence(shell);

    // Sacrifice the whole file instead of the one orphan line.
    run(shell, 'echo -n "" > /home/admin/.ssh/authorized_keys');

    // The two ORIGINAL goals alone would have falsely won: evidence captured
    // the rogue key AND the (now empty) live file no longer mentions it.
    expect(checkStateGoal(shell, goals[0])).toBe(true); // evidence has the rogue line
    expect(checkStateGoal(shell, goals[1])).toBe(true); // db01 file absent wartung@extern
    // …but the preservation goals reject the emptied file — no false win.
    expect(checkStateGoals(shell, goals)).toBe(false);
  });

  it('CORRECTNESS: rm-ing the key file no longer wins either', () => {
    const shell = engineOf('learn_ssh_04_key_graveyard');
    const goals = goalsOf('learn_ssh_04_key_graveyard');
    reachDb01WithEvidence(shell);
    run(shell, 'rm /home/admin/.ssh/authorized_keys');
    expect(checkStateGoals(shell, goals)).toBe(false);
  });

  it('after-action feedback: sacrificing the file → ⚠; the targeted sed → ⚡', () => {
    const fb = ctxOf('learn_ssh_04_key_graveyard').solutions[0].feedback!;

    // Trap: empty the file (a redirect over authorized_keys) — earns ⚠.
    const trap = engineOf('learn_ssh_04_key_graveyard');
    reachDb01WithEvidence(trap);
    run(trap, 'echo -n "" > /home/admin/.ssh/authorized_keys');
    expect(selectFeedback(fb, trap.getExecutionLog())).toMatch(/^⚠/);

    // Trap variant: rm also earns ⚠ (pattern coverage).
    const trapRm = engineOf('learn_ssh_04_key_graveyard');
    reachDb01WithEvidence(trapRm);
    run(trapRm, 'rm /home/admin/.ssh/authorized_keys');
    expect(selectFeedback(fb, trapRm.getExecutionLog())).toMatch(/^⚠/);

    // Clean: exactly one targeted sed removes the orphan line — earns ⚡.
    const clean = engineOf('learn_ssh_04_key_graveyard');
    const goals = goalsOf('learn_ssh_04_key_graveyard');
    reachDb01WithEvidence(clean);
    run(clean, "sed -i '/wartung@extern/d' /home/admin/.ssh/authorized_keys");
    expect(checkStateGoals(clean, goals)).toBe(true);
    expect(selectFeedback(fb, clean.getExecutionLog())).toMatch(/^⚡/);
  });
});
