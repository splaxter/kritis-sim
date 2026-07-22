/**
 * sudo forwards its own piped stdin to the wrapped command, so the canonical
 * `echo x | sudo tee /etc/file` config-write pattern works (tee under sudo
 * would otherwise receive no stdin and write an empty file).
 */
import { describe, it, expect } from 'vitest';
import { createShell } from './index';

describe('sudo stdin forwarding', () => {
  it('echo x | sudo tee f writes the piped content', () => {
    const shell = createShell({ type: 'bash', user: 'timo', hostname: 'ws' });
    const r = shell.execute("echo 'interval=60' | sudo tee /etc/telemetryd.conf");
    expect(r.exitCode).toBe(0);
    expect(r.output).toBe('interval=60');
    const rd = shell.getBaseHost().vfs.readFile('/etc/telemetryd.conf');
    expect(rd.ok && rd.value).toBe('interval=60\n');
  });

  it('plain pipe to tee is unchanged (no regression)', () => {
    const shell = createShell({ type: 'bash', user: 'timo', hostname: 'ws' });
    shell.execute('echo hi | tee /tmp/a.txt');
    const rd = shell.getBaseHost().vfs.readFile('/tmp/a.txt');
    expect(rd.ok && rd.value).toBe('hi\n');
  });

  it('sudo without piped stdin still runs the wrapped command', () => {
    const shell = createShell({ type: 'bash', user: 'timo', hostname: 'ws' });
    const r = shell.execute('sudo whoami');
    expect(r.output.trim()).toBe('root');
  });
});
