import { describe, it, expect, beforeEach } from 'vitest';
import { createShell } from './index';
import { ShellEngine } from './ShellEngine';

function bash(): ShellEngine {
  const shell = createShell({
    type: 'bash',
    user: 'azubi',
    hostname: 'kritis',
    directories: ['/home/azubi/logs'],
    files: [
      { path: '/home/azubi/a.txt', content: 'alpha\n' },
      { path: '/home/azubi/b.txt', content: 'bravo\n' },
      { path: '/home/azubi/notes.md', content: 'notes\n' },
      { path: '/home/azubi/logs/sys.log', content: 'syslog\n' },
      { path: '/home/azubi/logs/app.log', content: 'applog\n' },
    ],
  });
  shell.getVfs().setCurrentPath('/home/azubi');
  return shell;
}

describe('ShellEngine I/O redirection', () => {
  let shell: ShellEngine;
  beforeEach(() => {
    shell = bash();
  });

  it('writes stdout to a file with > and suppresses terminal output', () => {
    const result = shell.execute('echo hello > out.txt');
    expect(result.exitCode).toBe(0);
    expect(result.output).toBe('');
    const read = shell.getVfs().readFile('/home/azubi/out.txt');
    expect(read.ok && read.value).toBe('hello\n');
  });

  it('truncates an existing file with >', () => {
    shell.execute('echo first > out.txt');
    shell.execute('echo second > out.txt');
    const read = shell.getVfs().readFile('/home/azubi/out.txt');
    expect(read.ok && read.value).toBe('second\n');
  });

  it('appends with >>', () => {
    shell.execute('echo one > out.txt');
    shell.execute('echo two >> out.txt');
    const read = shell.getVfs().readFile('/home/azubi/out.txt');
    expect(read.ok && read.value).toBe('one\ntwo\n');
  });

  it('reads stdin from a file with <', () => {
    shell.execute('echo line1 > data.txt');
    shell.execute('echo line2 >> data.txt');
    const result = shell.execute('wc -l < data.txt');
    expect(result.exitCode).toBe(0);
    expect(result.output.trim()).toContain('2');
  });

  it('combines pipe and redirection', () => {
    const result = shell.execute('cat a.txt b.txt | sort > sorted.txt');
    expect(result.output).toBe('');
    const read = shell.getVfs().readFile('/home/azubi/sorted.txt');
    expect(read.ok && read.value).toBe('alpha\nbravo\n');
  });

  it('does not treat a quoted > as a redirect', () => {
    const result = shell.execute('echo "a > b"');
    expect(result.output.trim()).toBe('a > b');
    expect(shell.getVfs().exists('/home/azubi/b')).toBe(false);
  });

  it('surfaces an error for input redirection from a missing file', () => {
    const result = shell.execute('cat < nope.txt');
    expect(result.exitCode).not.toBe(0);
    expect(result.error).toMatch(/nope\.txt/);
  });
});

describe('ShellEngine glob expansion', () => {
  let shell: ShellEngine;
  beforeEach(() => {
    shell = bash();
  });

  it('expands * to matching files', () => {
    const result = shell.execute('cat *.txt');
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('alpha');
    expect(result.output).toContain('bravo');
    expect(result.output).not.toContain('notes');
  });

  it('expands ? to a single character', () => {
    const result = shell.execute('cat ?.txt');
    expect(result.output).toContain('alpha');
    expect(result.output).toContain('bravo');
  });

  it('keeps the directory prefix when globbing a subdirectory', () => {
    const result = shell.execute('cat logs/*.log');
    expect(result.output).toContain('syslog');
    expect(result.output).toContain('applog');
  });

  it('leaves an unmatched pattern literal', () => {
    const result = shell.execute('cat *.nomatch');
    expect(result.exitCode).not.toBe(0);
    expect(result.error).toContain('*.nomatch');
  });

  it('does not expand a quoted wildcard', () => {
    const result = shell.execute('echo "*.txt"');
    expect(result.output.trim()).toBe('*.txt');
  });
});

describe('ShellEngine chaining still works', () => {
  it('runs && only on success and || only on failure', () => {
    const shell = bash();
    const ok = shell.execute('echo hi && echo yes');
    expect(ok.output).toContain('hi');
    expect(ok.output).toContain('yes');

    const orResult = shell.execute('cat missing.txt || echo recovered');
    expect(orResult.output).toContain('recovered');
  });
});
