/**
 * ufw: firewall state manipulation on the per-host FirewallState, including
 * the real-ufw ssh-disruption warning and its effect on NEW ssh connections.
 */
import { describe, it, expect } from 'vitest';
import { createShell } from './index';
import { createHostState } from './hosts';
import { ShellEngine } from './ShellEngine';

function baseShell(): ShellEngine {
  return createShell({ type: 'bash', user: 'timo', hostname: 'admin-ws' });
}

function web01Spec(overrides: Record<string, unknown> = {}) {
  return {
    id: 'web01',
    hostname: 'web01',
    ip: '10.0.20.11',
    accounts: [{ name: 'admin', password: 'sonnenblume23' }, { name: 'root' }],
    ...overrides,
  };
}

describe('ufw status', () => {
  it('requires root even for status', () => {
    const shell = baseShell();
    const r = shell.execute('ufw status');
    expect(r.error).toBe('ERROR: You need to be root to run this script');
    expect(r.exitCode).toBe(1);
  });

  it('reports Status: inactive when the firewall is disabled', () => {
    const shell = baseShell();
    shell.getBaseHost().firewall.enabled = false;
    const r = shell.execute('sudo ufw status');
    expect(r.output).toBe('Status: inactive');
    expect(r.exitCode).toBe(0);
  });

  it('renders the real rule table when active', () => {
    const shell = baseShell();
    const fw = shell.getBaseHost().firewall;
    fw.rules.push(
      { action: 'allow', port: 22, proto: 'tcp' },
      { action: 'deny', port: 4444 },
      { action: 'allow', port: 80, proto: 'tcp', from: '10.0.20.0/24' },
    );
    const r = shell.execute('sudo ufw status');
    expect(r.output).toBe([
      'Status: active',
      '',
      'To                         Action      From',
      '--                         ------      ----',
      '22/tcp                     ALLOW       Anywhere',
      '4444                       DENY        Anywhere',
      '80/tcp                     ALLOW       10.0.20.0/24',
    ].join('\n'));
  });

  it('active without rules prints only the status line', () => {
    const shell = baseShell();
    const r = shell.execute('sudo ufw status');
    expect(r.output).toBe('Status: active');
  });

  it('status numbered lists 1-based indices with ALLOW IN / DENY IN', () => {
    const shell = baseShell();
    const fw = shell.getBaseHost().firewall;
    fw.rules.push(
      { action: 'allow', port: 22, proto: 'tcp' },
      { action: 'deny', port: 4444 },
    );
    const r = shell.execute('sudo ufw status numbered');
    expect(r.output).toBe([
      'Status: active',
      '',
      '     To                         Action      From',
      '     --                         ------      ----',
      '[ 1] 22/tcp                     ALLOW IN    Anywhere',
      '[ 2] 4444                       DENY IN     Anywhere',
    ].join('\n'));
  });
});

describe('ufw allow/deny', () => {
  it('allow 22/tcp pushes the rule and prints Rule added', () => {
    const shell = baseShell();
    const r = shell.execute('sudo ufw allow 22/tcp');
    expect(r.output).toBe('Rule added');
    expect(r.exitCode).toBe(0);
    expect(shell.getBaseHost().firewall.rules).toEqual([{ action: 'allow', port: 22, proto: 'tcp' }]);
  });

  it('allow 8080 without proto stores no proto', () => {
    const shell = baseShell();
    shell.execute('sudo ufw allow 8080');
    expect(shell.getBaseHost().firewall.rules).toEqual([{ action: 'allow', port: 8080 }]);
  });

  it('service names resolve to port/tcp: ssh→22, http→80, https→443', () => {
    const shell = baseShell();
    shell.execute('sudo ufw allow ssh');
    shell.execute('sudo ufw allow http');
    shell.execute('sudo ufw deny https');
    expect(shell.getBaseHost().firewall.rules).toEqual([
      { action: 'allow', port: 22, proto: 'tcp' },
      { action: 'allow', port: 80, proto: 'tcp' },
      { action: 'deny', port: 443, proto: 'tcp' },
    ]);
  });

  it('allow ssh and allow 22/tcp are the same rule: dedupe and cross-delete', () => {
    const shell = baseShell();
    shell.execute('sudo ufw allow ssh');
    const dup = shell.execute('sudo ufw allow 22/tcp');
    expect(dup.output).toBe('Skipping adding existing rule');
    expect(shell.getBaseHost().firewall.rules).toHaveLength(1);
    expect(shell.execute('sudo ufw status').output).toContain('22/tcp');
    const del = shell.execute('sudo ufw delete allow 22/tcp');
    expect(del.output).toBe('Rule deleted');
    expect(shell.getBaseHost().firewall.rules).toHaveLength(0);
  });

  it("'from any' stores no source restriction and displays Anywhere", () => {
    const shell = baseShell();
    shell.execute('sudo ufw allow from any to any port 22');
    expect(shell.getBaseHost().firewall.rules).toEqual([{ action: 'allow', port: 22 }]);
    expect(shell.execute('sudo ufw status').output).toContain('Anywhere');
  });

  it('duplicate rule is skipped, not pushed again', () => {
    const shell = baseShell();
    shell.execute('sudo ufw allow 22/tcp');
    const r = shell.execute('sudo ufw allow 22/tcp');
    expect(r.output).toBe('Skipping adding existing rule');
    expect(r.exitCode).toBe(0);
    expect(shell.getBaseHost().firewall.rules).toHaveLength(1);
  });

  it('deny 4444 adds a deny rule', () => {
    const shell = baseShell();
    const r = shell.execute('sudo ufw deny 4444');
    expect(r.output).toBe('Rule added');
    expect(shell.getBaseHost().firewall.rules).toEqual([{ action: 'deny', port: 4444 }]);
  });

  it('allow from <ip> to any port <port> sets the from field', () => {
    const shell = baseShell();
    const r = shell.execute('sudo ufw allow from 10.0.30.5 to any port 22');
    expect(r.output).toBe('Rule added');
    expect(shell.getBaseHost().firewall.rules).toEqual([{ action: 'allow', port: 22, from: '10.0.30.5' }]);
  });

  it('allow from ... proto tcp sets from and proto', () => {
    const shell = baseShell();
    shell.execute('sudo ufw allow from 10.0.20.0/24 to any port 80 proto tcp');
    expect(shell.getBaseHost().firewall.rules).toEqual([
      { action: 'allow', port: 80, proto: 'tcp', from: '10.0.20.0/24' },
    ]);
  });

  it('non-root allow is rejected', () => {
    const shell = baseShell();
    const r = shell.execute('ufw allow 22/tcp');
    expect(r.error).toBe('ERROR: You need to be root to run this script');
    expect(r.exitCode).toBe(1);
    expect(shell.getBaseHost().firewall.rules).toHaveLength(0);
  });
});

describe('ufw delete', () => {
  it('delete 2 removes the second rule (1-based)', () => {
    const shell = baseShell();
    shell.execute('sudo ufw allow 22/tcp');
    shell.execute('sudo ufw deny 4444');
    const r = shell.execute('sudo ufw delete 2');
    expect(r.output).toBe('Rule deleted');
    expect(r.exitCode).toBe(0);
    expect(shell.getBaseHost().firewall.rules).toEqual([{ action: 'allow', port: 22, proto: 'tcp' }]);
  });

  it('delete out of range fails', () => {
    const shell = baseShell();
    shell.execute('sudo ufw allow 22/tcp');
    const r = shell.execute('sudo ufw delete 5');
    expect(r.error).toBe('ERROR: Could not delete non-existent rule');
    expect(r.exitCode).toBe(1);
  });

  it('delete allow 22/tcp removes the matching rule', () => {
    const shell = baseShell();
    shell.execute('sudo ufw allow 22/tcp');
    shell.execute('sudo ufw deny 4444');
    const r = shell.execute('sudo ufw delete allow 22/tcp');
    expect(r.output).toBe('Rule deleted');
    expect(shell.getBaseHost().firewall.rules).toEqual([{ action: 'deny', port: 4444 }]);
  });

  it('delete with no matching rule fails', () => {
    const shell = baseShell();
    shell.execute('sudo ufw allow 22/tcp');
    const r = shell.execute('sudo ufw delete deny 4444');
    expect(r.error).toBe('ERROR: Could not delete non-existent rule');
    expect(r.exitCode).toBe(1);
    expect(shell.getBaseHost().firewall.rules).toHaveLength(1);
  });
});

describe('ufw default / enable / disable', () => {
  it('default deny incoming flips the policy and prints the real message', () => {
    const shell = baseShell();
    const r = shell.execute('sudo ufw default deny incoming');
    expect(r.output).toBe("Default incoming policy changed to 'deny'\n(be sure to update your rules accordingly)");
    expect(r.exitCode).toBe(0);
    expect(shell.getBaseHost().firewall.defaultIncoming).toBe('deny');
  });

  it('default allow outgoing flips the outgoing policy', () => {
    const shell = baseShell();
    shell.getBaseHost().firewall.defaultOutgoing = 'deny';
    const r = shell.execute('sudo ufw default allow outgoing');
    expect(r.output).toBe("Default outgoing policy changed to 'allow'\n(be sure to update your rules accordingly)");
    expect(shell.getBaseHost().firewall.defaultOutgoing).toBe('allow');
  });

  it('enable activates, disable deactivates, with the real messages', () => {
    const shell = baseShell();
    shell.getBaseHost().firewall.enabled = false;
    const on = shell.execute('sudo ufw enable');
    expect(on.output).toBe('Firewall is active and enabled on system startup');
    expect(shell.getBaseHost().firewall.enabled).toBe(true);
    const off = shell.execute('sudo ufw disable');
    expect(off.output).toBe('Firewall stopped and disabled on system startup');
    expect(shell.getBaseHost().firewall.enabled).toBe(false);
  });
});

describe('ufw ssh-disruption warning (remote session)', () => {
  function remoteSetup(firewall: Record<string, unknown>) {
    const shell = baseShell();
    const target = createHostState(web01Spec({ firewall }));
    shell.registerHost(target);
    shell.pushSession('web01', 'admin');
    return { shell, target };
  }

  it('enable at depth 2 without allow-22 while default deny warns; y proceeds', () => {
    const { shell, target } = remoteSetup({ enabled: false, defaultIncoming: 'deny' });
    const r = shell.execute('sudo ufw enable');
    expect(r.pendingInput).toEqual({
      prompt: 'Command may disrupt existing ssh connections. Proceed with operation (y|n)? ',
      mask: false,
    });
    const r2 = shell.continueInput('y');
    expect(r2.output).toBe('Firewall is active and enabled on system startup');
    expect(r2.exitCode).toBe(0);
    expect(target.firewall.enabled).toBe(true);
  });

  it('enable warning answered n aborts without enabling', () => {
    const { shell, target } = remoteSetup({ enabled: false, defaultIncoming: 'deny' });
    shell.execute('sudo ufw enable');
    const r = shell.continueInput('n');
    expect(r.output).toBe('Aborted');
    expect(r.exitCode).toBe(1);
    expect(target.firewall.enabled).toBe(false);
  });

  it('enable does not warn when an allow-22 rule exists', () => {
    const { shell, target } = remoteSetup({
      enabled: false,
      defaultIncoming: 'deny',
      rules: [{ action: 'allow', port: 22, proto: 'tcp' }],
    });
    const r = shell.execute('sudo ufw enable');
    expect(r.pendingInput).toBeUndefined();
    expect(target.firewall.enabled).toBe(true);
  });

  it('default deny incoming at depth 2 without allow-22 warns; y proceeds', () => {
    const { shell, target } = remoteSetup({ enabled: true, defaultIncoming: 'allow' });
    const r = shell.execute('sudo ufw default deny incoming');
    expect(r.pendingInput).toEqual({
      prompt: 'Command may disrupt existing ssh connections. Proceed with operation (y|n)? ',
      mask: false,
    });
    const r2 = shell.continueInput('y');
    expect(r2.output).toContain("Default incoming policy changed to 'deny'");
    expect(target.firewall.defaultIncoming).toBe('deny');
  });

  it('enable warns when an explicit deny-22 rule exists, even with default allow', () => {
    const { shell, target } = remoteSetup({
      enabled: false,
      defaultIncoming: 'allow',
      rules: [{ action: 'deny', port: 22, proto: 'tcp' }],
    });
    const r = shell.execute('sudo ufw enable');
    expect(r.pendingInput).toEqual({
      prompt: 'Command may disrupt existing ssh connections. Proceed with operation (y|n)? ',
      mask: false,
    });
    const r2 = shell.continueInput('y');
    expect(r2.exitCode).toBe(0);
    expect(target.firewall.enabled).toBe(true);
  });

  it('confirmation accepts Y and yes case-insensitively', () => {
    const first = remoteSetup({ enabled: false, defaultIncoming: 'deny' });
    first.shell.execute('sudo ufw enable');
    expect(first.shell.continueInput('Y').exitCode).toBe(0);
    expect(first.target.firewall.enabled).toBe(true);

    const second = remoteSetup({ enabled: false, defaultIncoming: 'deny' });
    second.shell.execute('sudo ufw enable');
    expect(second.shell.continueInput('yes').exitCode).toBe(0);
    expect(second.target.firewall.enabled).toBe(true);
  });

  it('no warning at depth 1 (local console) even without allow-22', () => {
    const shell = baseShell();
    shell.getBaseHost().firewall.enabled = false;
    shell.getBaseHost().firewall.defaultIncoming = 'deny';
    const r = shell.execute('sudo ufw enable');
    expect(r.pendingInput).toBeUndefined();
    expect(r.output).toBe('Firewall is active and enabled on system startup');
  });
});

describe('ufw vs live ssh sessions', () => {
  it('deny 22 blocks NEW ssh connections but the existing session keeps working', () => {
    const shell = baseShell();
    const target = createHostState(web01Spec());
    shell.registerHost(target);

    shell.execute('ssh admin@web01');
    const login = shell.continueInput('sonnenblume23');
    expect(login.exitCode).toBe(0);
    expect(shell.getSessionDepth()).toBe(2);

    const rule = shell.execute('sudo ufw deny 22/tcp');
    expect(rule.output).toBe('Rule added');

    // Existing session unaffected — sessions are only checked at ssh time.
    expect(shell.execute('whoami').output).toBe('admin');

    shell.execute('exit');
    expect(shell.getSessionDepth()).toBe(1);

    const retry = shell.execute('ssh admin@web01');
    expect(retry.error).toBe('ssh: connect to host web01 port 22: Connection timed out');
    expect(retry.exitCode).toBe(255);
  });

  it("an 'allow from any' rule admits an ip-less local client under default-deny", () => {
    const shell = baseShell();
    const target = createHostState(web01Spec({ firewall: { enabled: true, defaultIncoming: 'deny' } }));
    shell.registerHost(target);

    // Default-deny with no rule: connection refused before any auth.
    const blocked = shell.execute('ssh admin@web01');
    expect(blocked.error).toBe('ssh: connect to host web01 port 22: Connection timed out');

    // Author the rule from the console side (maintenance session).
    shell.pushSession('web01', 'admin');
    expect(shell.execute('sudo ufw allow from any to any port 22').output).toBe('Rule added');
    shell.execute('exit');
    expect(target.firewall.rules).toEqual([{ action: 'allow', port: 22 }]);

    // The base host has no IP — only a from-less allow rule admits it.
    const r = shell.execute('ssh admin@web01');
    expect(r.pendingInput).toEqual({ prompt: "admin@web01's password: ", mask: true });
    expect(shell.continueInput('sonnenblume23').exitCode).toBe(0);
  });
});
