import { describe, it, expect, beforeEach } from 'vitest';
import { createShell } from './index';
import { ShellEngine } from './ShellEngine';

function bash(): ShellEngine {
  const shell = createShell({
    type: 'bash',
    user: 'azubi',
    hostname: 'kritis',
    files: [
      { path: '/home/azubi/a.txt', content: 'line1\nline2\nline3\n' },
      { path: '/home/azubi/same.txt', content: 'line1\nline2\nline3\n' },
      { path: '/home/azubi/changed.txt', content: 'line1\nlineX\nline3\n' },
      { path: '/home/azubi/added.txt', content: 'line1\nline2\nlineNEW\nline3\n' },
      { path: '/home/azubi/deleted.txt', content: 'line1\nline3\n' },
    ],
  });
  shell.getVfs().setCurrentPath('/home/azubi');
  return shell;
}

describe('diff (normal format, GNU-compatible)', () => {
  let shell: ShellEngine;
  beforeEach(() => { shell = bash(); });

  it('identical files: no output, exit 0', () => {
    const r = shell.execute('diff a.txt same.txt');
    expect(r.output).toBe('');
    expect(r.exitCode).toBe(0);
  });

  it('a changed line: NcN hunk with < / --- / >, exit 1', () => {
    const r = shell.execute('diff a.txt changed.txt');
    expect(r.output).toBe('2c2\n< line2\n---\n> lineX');
    expect(r.exitCode).toBe(1);
  });

  it('an inserted line: NaN hunk with >, exit 1', () => {
    const r = shell.execute('diff a.txt added.txt');
    expect(r.output).toBe('2a3\n> lineNEW');
    expect(r.exitCode).toBe(1);
  });

  it('a deleted line: NdN hunk with <, exit 1', () => {
    const r = shell.execute('diff a.txt deleted.txt');
    expect(r.output).toBe('2d1\n< line2');
    expect(r.exitCode).toBe(1);
  });

  it('reversing the arguments flips add/delete', () => {
    const r = shell.execute('diff deleted.txt a.txt');
    expect(r.output).toBe('1a2\n> line2');
    expect(r.exitCode).toBe(1);
  });

  it('missing file: diagnostic on stderr, exit 2', () => {
    const r = shell.execute('diff a.txt nope.txt');
    expect(r.exitCode).toBe(2);
    expect(r.error).toContain('nope.txt');
    expect(r.error).toContain('No such file or directory');
  });

  it('missing operand: exit 2', () => {
    const r = shell.execute('diff a.txt');
    expect(r.exitCode).toBe(2);
    expect(r.error).toContain('missing operand');
  });
});
