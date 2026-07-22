import { describe, it, expect } from 'vitest';
import { advancedLearningEvents } from '../content/events/learning-path-advanced';
import { createShellFromContext, checkStateGoals } from './shell';
import { ShellEngine } from './shell/ShellEngine';
import { GameEvent, TerminalContext } from '@kritis/shared';

/**
 * systemd & Journal track proof suite. Each level is single-host (primary host
 * seeded with custom services/journal). We drive the documented path through
 * the real ShellEngine and assert the authored stateGoals flip to true.
 * sysd_03 proves the daemon-reload teaching (restart fails before, succeeds
 * after); sysd_04 proves dependency ordering (API before DB fails).
 */

const byId = (id: string): GameEvent => {
  const ev = advancedLearningEvents.find((e) => e.id === id);
  if (!ev) throw new Error(`level ${id} not authored`);
  return ev;
};

const ctxOf = (id: string): TerminalContext => byId(id).terminalContext!;
const engineOf = (id: string): ShellEngine => createShellFromContext(ctxOf(id));
const goalsOf = (id: string) => ctxOf(id).solutions[0].stateGoals!;

/** Run a command and assert it left no dangling pending-input prompt. */
function run(shell: ShellEngine, cmd: string): { exitCode: number; output: string; error?: string } {
  const r = shell.execute(cmd);
  expect(shell.hasPendingInput(), `unexpected pending input after "${cmd}"`).toBe(false);
  return { exitCode: r.exitCode, output: r.output, error: r.error };
}

describe('systemd track — hint ladder discipline', () => {
  for (const ev of advancedLearningEvents.filter((e) => e.tags?.includes('systemd'))) {
    it(`${ev.id}: first hint orients (no backtick), last hint gives exact syntax`, () => {
      const hints = ev.terminalContext!.hints;
      expect(hints.length).toBeGreaterThanOrEqual(3);
      expect(hints[0].includes('`'), `first hint names a command: ${hints[0]}`).toBe(false);
      expect(hints[hints.length - 1].includes('`'), 'last hint must give exact syntax').toBe(true);
    });
  }
});

describe('learn_sysd_01_silent_service — read journal, create config, start + enable', () => {
  it('documented path brings the unit to active AND enabled', () => {
    const shell = engineOf('learn_sysd_01_silent_service');
    const goals = goalsOf('learn_sysd_01_silent_service');
    expect(checkStateGoals(shell, goals)).toBe(false);

    // The journal explains the failure.
    const jr = run(shell, 'journalctl -u telemetryd');
    expect(jr.output).toMatch(/telemetryd\.conf: No such file/);

    // Starting before the config exists must fail — the config is mandatory.
    const early = run(shell, 'sudo systemctl start telemetryd');
    expect(early.exitCode).toBe(1);
    expect(checkStateGoals(shell, goals)).toBe(false);

    // Create the config (root-owned /etc → sudo tee), then start + enable.
    expect(run(shell, "echo 'interval=60' | sudo tee /etc/telemetryd.conf").exitCode).toBe(0);
    expect(run(shell, 'sudo systemctl start telemetryd').exitCode).toBe(0);
    expect(run(shell, 'sudo systemctl enable telemetryd').exitCode).toBe(0);

    expect(checkStateGoals(shell, goals)).toBe(true);
  });

  it('NEGATIVE: started but not enabled leaves the goal unmet', () => {
    const shell = engineOf('learn_sysd_01_silent_service');
    const goals = goalsOf('learn_sysd_01_silent_service');
    run(shell, "echo 'interval=60' | sudo tee /etc/telemetryd.conf");
    run(shell, 'sudo systemctl start telemetryd');
    // Skipped `enable` — the dauerhaft-aktiviert goal must fail.
    expect(checkStateGoals(shell, goals)).toBe(false);
  });
});

describe('learn_sysd_02_time_travel — narrow the journal, record the attacker IP', () => {
  it('the time-windowed journal reveals the burst source', () => {
    const shell = engineOf('learn_sysd_02_time_travel');
    const r = run(
      shell,
      "journalctl -u sshd --since '2026-07-17 02:00' --until '2026-07-17 03:00' | grep 'Failed password'"
    );
    expect(r.output).toMatch(/185\.220\.101\.34/);
    // The window excludes the benign daytime logins.
    expect(r.output).not.toMatch(/Accepted publickey/);
  });

  it('writing the found IP into the denylist satisfies the goal', () => {
    const shell = engineOf('learn_sysd_02_time_travel');
    const goals = goalsOf('learn_sysd_02_time_travel');
    expect(checkStateGoals(shell, goals)).toBe(false);

    expect(run(shell, "echo '185.220.101.34' | sudo tee /etc/ssh/denylist.txt").exitCode).toBe(0);
    expect(checkStateGoals(shell, goals)).toBe(true);
  });

  it('NEGATIVE: a wrong IP does NOT satisfy the goal', () => {
    const shell = engineOf('learn_sysd_02_time_travel');
    const goals = goalsOf('learn_sysd_02_time_travel');
    run(shell, "echo '203.0.113.9' | sudo tee /etc/ssh/denylist.txt");
    expect(checkStateGoals(shell, goals)).toBe(false);
  });
});

describe('learn_sysd_03_revenant — daemon-reload is the lesson', () => {
  it('restart fails AFTER the sed fix but BEFORE daemon-reload, succeeds AFTER reload', () => {
    const shell = engineOf('learn_sysd_03_revenant');
    const goals = goalsOf('learn_sysd_03_revenant');
    expect(checkStateGoals(shell, goals)).toBe(false);

    // Fix the typo in the unit file on disk.
    expect(
      run(shell, "sudo sed -i 's/--confg/--config/' /etc/systemd/system/pumpmon.service").exitCode
    ).toBe(0);

    // Restart still fails — systemd holds the stale loaded unit.
    const stale = run(shell, 'sudo systemctl start pumpmon');
    expect(stale.exitCode).toBe(1);
    expect(checkStateGoals(shell, goals)).toBe(false);

    // Re-read the unit files, then start succeeds.
    expect(run(shell, 'sudo systemctl daemon-reload').exitCode).toBe(0);
    expect(run(shell, 'sudo systemctl start pumpmon').exitCode).toBe(0);

    expect(checkStateGoals(shell, goals)).toBe(true);
  });

  it('NEGATIVE: daemon-reload WITHOUT the sed fix cannot start the unit', () => {
    const shell = engineOf('learn_sysd_03_revenant');
    const goals = goalsOf('learn_sysd_03_revenant');
    run(shell, 'sudo systemctl daemon-reload');
    const r = run(shell, 'sudo systemctl start pumpmon');
    expect(r.exitCode).toBe(1);
    expect(checkStateGoals(shell, goals)).toBe(false);
  });
});

describe('learn_sysd_04_chain_reaction — dependency ordering', () => {
  it('API before DB fails; DB-first ordering brings both up', () => {
    const shell = engineOf('learn_sysd_04_chain_reaction');
    const goals = goalsOf('learn_sysd_04_chain_reaction');
    expect(checkStateGoals(shell, goals)).toBe(false);

    // Blind restart of the API without the DB → fails (socket missing).
    const blind = run(shell, 'sudo systemctl start leitstand-api');
    expect(blind.exitCode).toBe(1);
    expect(checkStateGoals(shell, goals)).toBe(false);

    // Root cause first: mysql creates the socket.
    expect(run(shell, 'sudo systemctl start mysql').exitCode).toBe(0);
    // Now the dependent API can start.
    expect(run(shell, 'sudo systemctl start leitstand-api').exitCode).toBe(0);

    expect(checkStateGoals(shell, goals)).toBe(true);
  });
});
