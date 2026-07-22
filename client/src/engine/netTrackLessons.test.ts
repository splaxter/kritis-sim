import { describe, it, expect } from 'vitest';
import { advancedLearningEvents } from '../content/events/learning-path-advanced';
import { createShellFromContext, checkStateGoals, checkStateGoal } from './shell';
import { ShellEngine } from './shell/ShellEngine';
import { selectFeedback } from './shell/feedback';
import { GameEvent, TerminalContext } from '@kritis/shared';

/**
 * Netz-Forensik track proof suite. net_01 kills a rogue listener (listenerAbsent
 * goal); net_02 proves evidence-first coupling (backup must predate cleaning);
 * net_03 hardens the firewall to the end state; net_04 is the two-host boss:
 * journal → scp evidence → ssh → sed → ufw. We drive each documented path
 * through the real ShellEngine and assert the authored stateGoals flip true.
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

/** Run a command that prompts once for a password, answering with `pw`. */
function runAuth(shell: ShellEngine, cmd: string, pw: string): { exitCode: number; output: string; error?: string } {
  const r = shell.execute(cmd);
  expect(shell.hasPendingInput(), `expected a password prompt after "${cmd}"`).toBe(true);
  const r2 = shell.continueInput(pw);
  expect(shell.hasPendingInput(), `password not consumed after "${cmd}"`).toBe(false);
  return { exitCode: r2.exitCode, output: r2.output, error: r2.error };
}

describe('net track — hint ladder discipline', () => {
  for (const ev of advancedLearningEvents.filter((e) => e.tags?.includes('network') && e.id.startsWith('learn_net'))) {
    it(`${ev.id}: first hint orients (no backtick), last hint gives exact syntax`, () => {
      const hints = ev.terminalContext!.hints;
      expect(hints.length).toBeGreaterThanOrEqual(3);
      expect(hints[0].includes('`'), `first hint names a command: ${hints[0]}`).toBe(false);
      expect(hints[hints.length - 1].includes('`'), 'last hint must give exact syntax').toBe(true);
    });
  }
});

describe('learn_net_01_open_doors — spot the outlier, kill the listener', () => {
  it('rogue listener present before the kill, absent after', () => {
    const shell = engineOf('learn_net_01_open_doors');
    const goals = goalsOf('learn_net_01_open_doors');
    expect(checkStateGoals(shell, goals)).toBe(false);

    // ss shows the baseline plus the rogue nc on 31337.
    const listing = run(shell, 'ss -tulpen');
    expect(listing.output).toMatch(/31337/);
    expect(listing.output).toMatch(/nc/);
    expect(listing.output).toMatch(/:22\b/);

    expect(run(shell, 'sudo kill 6666').exitCode).toBe(0);
    expect(checkStateGoals(shell, goals)).toBe(true);
    // The port is really gone from the socket table.
    expect(run(shell, 'ss -tulpen').output).not.toMatch(/31337/);
  });

  it('NEGATIVE: killing the wrong PID does not solve the level', () => {
    const shell = engineOf('learn_net_01_open_doors');
    const goals = goalsOf('learn_net_01_open_doors');
    run(shell, 'sudo kill 1111');
    expect(checkStateGoals(shell, goals)).toBe(false);
    // The legitimate services (sshd/apache2) are untouched by the wrong kill.
    expect(run(shell, 'ss -tulpen').output).toMatch(/sshd/);
  });

  it('after-action feedback: the ⚠ fires ON A WON run — a denied kill at a legit PID still logs the risky command', () => {
    const fb = ctxOf('learn_net_01_open_doors').solutions[0].feedback!;
    const goals = goalsOf('learn_net_01_open_doors');

    const risky = engineOf('learn_net_01_open_doors');
    // As timo (non-root): aiming kill at sshd (PID 456, root-owned) is DENIED —
    // Operation not permitted. The listener SURVIVES, so the level is NOT solved.
    expect(run(risky, 'kill 456').exitCode).toBe(1);
    expect(run(risky, 'ss -tulpen').output).toMatch(/:22\b/);
    expect(checkStateGoals(risky, goals)).toBe(false);

    // …then close the rogue properly with sudo → the level is genuinely WON…
    expect(run(risky, 'sudo kill 6666').exitCode).toBe(0);
    expect(checkStateGoals(risky, goals)).toBe(true);
    // …and the ⚠ still appears, because the risky attempt was recorded (default
    // outcome 'attempted' matches even a failed kill).
    expect(selectFeedback(fb, risky.getExecutionLog())).toMatch(/^⚠/);

    // Clean: only the rogue nc (PID 6666) is killed → no line.
    const clean = engineOf('learn_net_01_open_doors');
    run(clean, 'sudo kill 6666');
    expect(checkStateGoals(clean, goalsOf('learn_net_01_open_doors'))).toBe(true);
    expect(selectFeedback(fb, clean.getExecutionLog())).toBeNull();
  });

  it('NEGATIVE: a kill-everything rampage does not win — the legit listeners must survive', () => {
    // The resultText promises "die drei erlaubten Dienste laufen unberührt
    // weiter" — the listenerPresent goals enforce it.
    const shell = engineOf('learn_net_01_open_doors');
    const goals = goalsOf('learn_net_01_open_doors');
    run(shell, 'sudo kill 6666'); // the rogue…
    run(shell, 'sudo kill 1234'); // …but also apache2 (ports 80/443)
    expect(checkStateGoals(shell, goals)).toBe(false);
  });
});

describe('learn_net_02_backchannel — evidence first, then clean', () => {
  it('ss -tp reveals the backchannel; cp-then-sed satisfies both goals', () => {
    const shell = engineOf('learn_net_02_backchannel');
    const goals = goalsOf('learn_net_02_backchannel');
    expect(checkStateGoals(shell, goals)).toBe(false);

    const conns = run(shell, 'ss -tp');
    expect(conns.output).toMatch(/91\.203\.5\.77:443/);
    expect(conns.output).toMatch(/updater/);
    expect(run(shell, 'cat /etc/hosts').output).toMatch(/update\.vendor\.de/);

    // Secure evidence BEFORE cleaning.
    expect(run(shell, 'sudo cp /etc/hosts /root/incident/hosts.bak').exitCode).toBe(0);
    expect(run(shell, "sudo sed -i '/91.203.5.77/d' /etc/hosts").exitCode).toBe(0);

    expect(checkStateGoals(shell, goals)).toBe(true);
  });

  it('NEGATIVE: cleaning before securing leaves the evidence goal unmet', () => {
    const shell = engineOf('learn_net_02_backchannel');
    const goals = goalsOf('learn_net_02_backchannel');
    // Wrong order: clean first, then back up the already-clean file.
    run(shell, "sudo sed -i '/91.203.5.77/d' /etc/hosts");
    run(shell, 'sudo cp /etc/hosts /root/incident/hosts.bak');
    // /etc/hosts is clean, but the backup no longer proves the poison existed.
    expect(checkStateGoal(shell, goals[0])).toBe(false);
    expect(checkStateGoals(shell, goals)).toBe(false);
  });
});

describe('learn_net_03_the_wall — harden the firewall (order in the hints)', () => {
  it('allow 22/80/443 then default deny reaches the goal state', () => {
    const shell = engineOf('learn_net_03_the_wall');
    const goals = goalsOf('learn_net_03_the_wall');
    expect(checkStateGoals(shell, goals)).toBe(false);

    expect(run(shell, 'sudo ufw allow 22/tcp').exitCode).toBe(0);
    expect(run(shell, 'sudo ufw allow 80/tcp').exitCode).toBe(0);
    expect(run(shell, 'sudo ufw allow 443/tcp').exitCode).toBe(0);
    expect(run(shell, 'sudo ufw default deny incoming').exitCode).toBe(0);
    expect(run(shell, 'sudo ufw enable').exitCode).toBe(0);

    expect(checkStateGoals(shell, goals)).toBe(true);
  });

  it('the goal is end-state only: default-deny first still reaches it (order is a hint lesson)', () => {
    const shell = engineOf('learn_net_03_the_wall');
    const goals = goalsOf('learn_net_03_the_wall');
    // Single-host local session (depth 1) → no lockout prompt to trip over.
    run(shell, 'sudo ufw default deny incoming');
    run(shell, 'sudo ufw allow 22/tcp');
    run(shell, 'sudo ufw allow 80/tcp');
    run(shell, 'sudo ufw allow 443/tcp');
    run(shell, 'sudo ufw enable');
    expect(checkStateGoals(shell, goals)).toBe(true);
  });

  it('after-action feedback: safe orderings → ✓, risky orderings → ⚠, chained allow22&&enable → null', () => {
    const fb = ctxOf('learn_net_03_the_wall').solutions[0].feedback!;
    const goals = goalsOf('learn_net_03_the_wall');

    // A full firewall solve in the given step order; asserts goals then feedback.
    const solve = (steps: string[]): string | null => {
      const shell = engineOf('learn_net_03_the_wall');
      for (const s of steps) run(shell, s);
      expect(checkStateGoals(shell, goals), `goals unmet for [${steps.join(' | ')}]`).toBe(true);
      return selectFeedback(fb, shell.getExecutionLog());
    };

    const allow80 = 'sudo ufw allow 80/tcp';
    const allow443 = 'sudo ufw allow 443/tcp';
    const allow22 = 'sudo ufw allow 22/tcp';
    const deny = 'sudo ufw default deny incoming';
    const enable = 'sudo ufw enable';

    // Safe (allow22 first): port 22 opened before both the deny and the enable.
    expect(solve([allow22, allow80, allow443, deny, enable])).toMatch(/^✓/); // allow22 → deny → enable
    expect(solve([allow22, allow80, allow443, enable, deny])).toMatch(/^✓/); // allow22 → enable → deny

    // Safe (allow22 in the MIDDLE): 22 opened before the LATER lockout step — the
    // two orderings the design lists as safe. The OR-form safe rules cover them.
    expect(solve([enable, allow80, allow443, allow22, deny])).toMatch(/^✓/); // enable → allow22 → deny
    expect(solve([deny, allow80, allow443, allow22, enable])).toMatch(/^✓/); // deny → allow22 → enable

    // Risky: firewall made effective (deny + enable) BEFORE port 22 was opened.
    expect(solve([deny, allow80, allow443, enable, allow22])).toMatch(/^⚠/); // deny → enable → allow22
    expect(solve([enable, allow80, allow443, deny, allow22])).toMatch(/^⚠/); // enable → deny → allow22

    // Chained allow22 && enable is ONE attempt → strict order only BETWEEN
    // attempts → neither the safe nor the risky rule holds → no line.
    expect(solve([allow80, allow443, deny, 'sudo ufw allow 22/tcp && sudo ufw enable'])).toBeNull();
  });

  it('NEGATIVE: only opening 22 without flipping the default is not enough', () => {
    const shell = engineOf('learn_net_03_the_wall');
    const goals = goalsOf('learn_net_03_the_wall');
    run(shell, 'sudo ufw allow 22/tcp');
    expect(checkStateGoals(shell, goals)).toBe(false);
  });

  it('NEGATIVE: rules + default deny WITHOUT ufw enable do not complete the level', () => {
    const shell = engineOf('learn_net_03_the_wall');
    const goals = goalsOf('learn_net_03_the_wall');

    // The level seeds a DISABLED firewall — status renders inactive, and real
    // ufw accepts rule-adds while inactive (they are configuration only).
    expect(run(shell, 'sudo ufw status').output).toBe('Status: inactive');
    expect(run(shell, 'sudo ufw allow 22/tcp').exitCode).toBe(0);
    expect(run(shell, 'sudo ufw allow 80/tcp').exitCode).toBe(0);
    expect(run(shell, 'sudo ufw allow 443/tcp').exitCode).toBe(0);
    expect(run(shell, 'sudo ufw default deny incoming').exitCode).toBe(0);

    // Everything configured, nothing active: the wall is NOT up yet.
    expect(checkStateGoals(shell, goals)).toBe(false);

    expect(run(shell, 'sudo ufw enable').exitCode).toBe(0);
    expect(run(shell, 'sudo ufw status').output).toMatch(/^Status: active/);
    expect(checkStateGoals(shell, goals)).toBe(true);
  });
});

describe('learn_net_04_spider — journal → scp → ssh → sed → ufw', () => {
  const PW = 'notstrom-db-2024';

  it('the full documented chain satisfies all three goals', () => {
    const shell = engineOf('learn_net_04_spider');
    const goals = goalsOf('learn_net_04_spider');
    expect(checkStateGoals(shell, goals)).toBe(false);

    // Journal on web01 names the origin host (db01, 10.0.20.12).
    const jr = run(shell, 'journalctl -u sshd');
    expect(jr.output).toMatch(/10\.0\.20\.12/);

    // Secure evidence FIRST (scp reads db01's crontab without logging in).
    const scp = runAuth(shell, 'scp admin@db01:/var/spool/cron/crontabs/root ~/evidenz_cron.txt', PW);
    expect(scp.exitCode).toBe(0);
    expect(checkStateGoal(shell, goals[0])).toBe(true); // evidence contains 'beacon'

    // Log into db01, remove the backdoor, contain the rogue port.
    const login = runAuth(shell, 'ssh admin@db01', PW);
    expect(login.exitCode).toBe(0);
    expect(shell.getPromptInfo().hostname).toBe('db01');

    expect(run(shell, "sudo sed -i '/beacon/d' /var/spool/cron/crontabs/root").exitCode).toBe(0);
    expect(run(shell, 'sudo ufw deny 31337').exitCode).toBe(0);

    expect(checkStateGoals(shell, goals)).toBe(true);
  });

  it('NEGATIVE: cleaning db01 before securing evidence leaves the evidence goal unmet', () => {
    const shell = engineOf('learn_net_04_spider');
    const goals = goalsOf('learn_net_04_spider');

    // Wrong order: log in and clean before pulling the evidence copy.
    runAuth(shell, 'ssh admin@db01', PW);
    run(shell, "sudo sed -i '/beacon/d' /var/spool/cron/crontabs/root");
    run(shell, 'sudo ufw deny 31337');
    run(shell, 'exit');

    // Now the backup captures an already-clean crontab.
    runAuth(shell, 'scp admin@db01:/var/spool/cron/crontabs/root ~/evidenz_cron.txt', PW);

    expect(checkStateGoal(shell, goals[0])).toBe(false); // evidence never held 'beacon'
    expect(checkStateGoals(shell, goals)).toBe(false);
  });

  it('the rogue listener on db01 is discoverable via ss over the ssh session', () => {
    const shell = engineOf('learn_net_04_spider');
    runAuth(shell, 'ssh admin@db01', PW);
    const listing = run(shell, 'ss -tulpen');
    expect(listing.output).toMatch(/31337/);
    expect(listing.output).toMatch(/beacon/);
  });
});
