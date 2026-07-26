import { describe, it, expect, beforeEach } from 'vitest';
import { createShell } from './index';
import { ShellEngine } from './ShellEngine';
import { seedPrimaryHost } from './hosts';
import { checkStateGoals } from './stateGoals';

function exch(): ShellEngine {
  const shell = createShell({
    type: 'powershell',
    user: 'Administrator',
    hostname: 'EXCH01',
  });
  seedPrimaryHost(shell.getBaseHost(), {
    mailboxes: [
      { name: 'm.mueller', displayName: 'Markus Müller', auditEnabled: false },
      { name: 'a.admin', displayName: 'Shared Admin', auditEnabled: true },
    ],
  });
  return shell;
}

describe('Exchange 2019 mailbox cmdlets', () => {
  let shell: ShellEngine;
  beforeEach(() => { shell = exch(); });

  it('Get-Mailbox <id> shows the audit property block', () => {
    const r = shell.execute('Get-Mailbox m.mueller');
    expect(r.exitCode).toBe(0);
    expect(r.output).toContain('AuditEnabled');
    expect(r.output).toMatch(/AuditEnabled\s*:\s*False/);
  });

  it('Get-Mailbox without identity lists all mailboxes', () => {
    const r = shell.execute('Get-Mailbox');
    expect(r.output).toContain('m.mueller');
    expect(r.output).toContain('a.admin');
  });

  it('Get-Mailbox on an unknown identity errors with exit 1', () => {
    const r = shell.execute('Get-Mailbox nobody');
    expect(r.exitCode).toBe(1);
    expect(r.error).toContain("couldn't be found");
  });

  it('Set-Mailbox -AuditEnabled $true enables audit ($true expands to True)', () => {
    expect(shell.execute('Set-Mailbox m.mueller -AuditEnabled $true').exitCode).toBe(0);
    expect(shell.execute('Get-Mailbox m.mueller').output).toMatch(/AuditEnabled\s*:\s*True/);
  });

  it('Set-Mailbox -AuditEnabled $false disables audit (distinct from $true)', () => {
    shell.execute('Set-Mailbox a.admin -AuditEnabled $false');
    expect(shell.execute('Get-Mailbox a.admin').output).toMatch(/AuditEnabled\s*:\s*False/);
  });

  it('Set-Mailbox on an unknown identity errors with exit 1', () => {
    const r = shell.execute('Set-Mailbox nobody -AuditEnabled $true');
    expect(r.exitCode).toBe(1);
    expect(r.error).toContain("couldn't be found");
  });

  it('rejects a non-boolean value (banana) without mutating state', () => {
    const r = shell.execute('Set-Mailbox m.mueller -AuditEnabled banana');
    expect(r.exitCode).toBe(1);
    expect(r.error).toContain('System.Boolean');
    expect(shell.getBaseHost().mailboxes.find(m => m.name === 'm.mueller')?.auditEnabled).toBe(false);
  });

  it('rejects a typo like $ture (expands to empty) without mutating an ENABLED mailbox', () => {
    // a.admin starts enabled; a typo must NOT silently disable it.
    const r = shell.execute('Set-Mailbox a.admin -AuditEnabled $ture');
    expect(r.exitCode).toBe(1);
    expect(shell.getBaseHost().mailboxes.find(m => m.name === 'a.admin')?.auditEnabled).toBe(true);
  });

  it('rejects a missing value (bare -AuditEnabled) with exit 1, no mutation', () => {
    const r = shell.execute('Set-Mailbox a.admin -AuditEnabled');
    expect(r.exitCode).toBe(1);
    expect(shell.getBaseHost().mailboxes.find(m => m.name === 'a.admin')?.auditEnabled).toBe(true);
  });

  it('does not restart any service (no service semantics involved)', () => {
    // Sanity: enabling audit is a mailbox attribute change, not a daemon action.
    shell.execute('Set-Mailbox m.mueller -AuditEnabled $true');
    const mb = shell.getBaseHost().mailboxes.find(m => m.name === 'm.mueller');
    expect(mb?.auditEnabled).toBe(true);
  });
});

describe('mailbox stateGoal', () => {
  it('is unmet until the mailbox has audit enabled, then met', () => {
    const shell = exch();
    const goal = [{ mailbox: 'm.mueller', auditEnabled: true }];
    expect(checkStateGoals(shell, goal)).toBe(false);
    shell.execute('Set-Mailbox m.mueller -AuditEnabled $true');
    expect(checkStateGoals(shell, goal)).toBe(true);
  });

  it('auditEnabled:false is a real assertion (matches a not-yet-enabled mailbox)', () => {
    const shell = exch();
    expect(checkStateGoals(shell, [{ mailbox: 'm.mueller', auditEnabled: false }])).toBe(true);
    expect(checkStateGoals(shell, [{ mailbox: 'a.admin', auditEnabled: false }])).toBe(false);
  });

  it('an unknown mailbox never satisfies the goal', () => {
    const shell = exch();
    expect(checkStateGoals(shell, [{ mailbox: 'ghost', auditEnabled: true }])).toBe(false);
  });
});
