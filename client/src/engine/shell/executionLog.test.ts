import { describe, it, expect } from 'vitest';
import { createShell } from './index';

describe('execution log — basic', () => {
  it('logs one attempt per outer command with sequence, host, exit code', () => {
    const shell = createShell({ type: 'bash', user: 'root', hostname: 'srv' });
    shell.execute('whoami');
    shell.execute('cat /nonexistent'); // nonzero exit
    const log = shell.getExecutionLog();
    expect(log).toHaveLength(2);
    expect(log[0]).toMatchObject({ command: 'whoami', sequence: 1, hostBefore: 'local', hostAfter: 'local', exitCode: 0 });
    expect(log[1]).toMatchObject({ command: 'cat /nonexistent', sequence: 2, exitCode: 1 });
  });

  it('sudo does NOT create a second attempt (depth guard)', () => {
    const shell = createShell({ type: 'bash', user: 'root', hostname: 'srv' });
    shell.execute('sudo whoami');
    const log = shell.getExecutionLog();
    expect(log).toHaveLength(1);
    expect(log[0].command).toBe('sudo whoami');
  });

  it('a chained line is a single attempt', () => {
    const shell = createShell({ type: 'bash', user: 'root', hostname: 'srv' });
    shell.execute('true && echo hi');
    expect(shell.getExecutionLog()).toHaveLength(1);
    expect(shell.getExecutionLog()[0].command).toBe('true && echo hi');
  });

  it('empty input logs nothing', () => {
    const shell = createShell({ type: 'bash', user: 'root', hostname: 'srv' });
    shell.execute('   ');
    expect(shell.getExecutionLog()).toHaveLength(0);
  });
});
