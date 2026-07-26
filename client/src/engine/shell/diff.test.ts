import { describe, it, expect, beforeEach } from 'vitest';
import { createShell } from './index';
import { ShellEngine } from './ShellEngine';

function bash(): ShellEngine {
  const shell = createShell({
    type: 'bash',
    user: 'azubi',
    hostname: 'kritis',
    directories: ['/home/azubi/adir'],
    files: [
      { path: '/home/azubi/a.txt', content: 'line1\nline2\nline3\n' },
      { path: '/home/azubi/same.txt', content: 'line1\nline2\nline3\n' },
      { path: '/home/azubi/changed.txt', content: 'line1\nlineX\nline3\n' },
      { path: '/home/azubi/added.txt', content: 'line1\nline2\nlineNEW\nline3\n' },
      { path: '/home/azubi/deleted.txt', content: 'line1\nline3\n' },
      { path: '/home/azubi/noeol.txt', content: 'line1\nline2\nline3' },
      // Combined content+EOL case: line 1 differs AND file2's last line lacks a
      // terminating newline while file1's does.
      { path: '/home/azubi/combo_a.txt', content: 'a\nsame\n' },
      { path: '/home/azubi/combo_b.txt', content: 'b\nsame' },
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

  it('a missing final newline is a real difference (\\ No newline marker), exit 1', () => {
    const r = shell.execute('diff a.txt noeol.txt');
    expect(r.output).toBe('3c3\n< line3\n---\n> line3\n\\ No newline at end of file');
    expect(r.exitCode).toBe(1);
  });

  it('the same file with no trailing newline equals itself (exit 0)', () => {
    const r = shell.execute('diff noeol.txt noeol.txt');
    expect(r.output).toBe('');
    expect(r.exitCode).toBe(0);
  });

  it('more than two operands: rejected with exit 2', () => {
    const r = shell.execute('diff a.txt same.txt changed.txt');
    expect(r.exitCode).toBe(2);
    expect(r.error).toContain("extra operand 'changed.txt'");
  });

  it('a directory operand: exit 2, Is a directory', () => {
    const r = shell.execute('diff a.txt adir');
    expect(r.exitCode).toBe(2);
    expect(r.error).toContain('adir: Is a directory');
  });

  it('combined earlier-content-change AND a missing final newline (both lines reported)', () => {
    // GNU treats the unterminated "same" as different from "same\n", so the
    // whole thing is one 1,2c1,2 hunk with the marker on the last line.
    const r = shell.execute('diff combo_a.txt combo_b.txt');
    expect(r.output).toBe('1,2c1,2\n< a\n< same\n---\n> b\n> same\n\\ No newline at end of file');
    expect(r.exitCode).toBe(1);
  });

  it('combined case, reversed: marker moves to file1 side', () => {
    const r = shell.execute('diff combo_b.txt combo_a.txt');
    expect(r.output).toBe('1,2c1,2\n< b\n< same\n\\ No newline at end of file\n---\n> a\n> same');
    expect(r.exitCode).toBe(1);
  });
});
