import { describe, it, expect } from 'vitest';
import { createShell } from '../../engine/shell';
import { gatherCompletions, applyCompletionToLine, suffixFor, longestCommonPrefix, tokenUnderCursor } from './completion';

function bash() {
  const shell = createShell({
    type: 'bash',
    user: 'azubi',
    hostname: 'kritis',
    directories: ['/home/azubi/logs'],
    files: [
      { path: '/home/azubi/app.txt', content: 'x' },
      { path: '/home/azubi/logs/app.log', content: 'x' },
      { path: '/home/azubi/logs/auth.log', content: 'x' },
    ],
  });
  shell.getVfs().setCurrentPath('/home/azubi');
  return shell;
}

function ps() {
  const shell = createShell({ type: 'powershell', user: 'Admin', hostname: 'WIN' });
  return shell;
}

const values = (shell: ReturnType<typeof bash>, line: string, cmds: string[] = []) =>
  gatherCompletions(shell, cmds, line, line.length).map(c => c.value);

describe('applyCompletionToLine (the core bug: token replacement, not slice-append)', () => {
  it('completes a lowercase command to its canonical case (CL -> clear, not CLear)', () => {
    const r = applyCompletionToLine('CL', 2, { value: 'clear', display: 'clear', type: 'command' });
    expect(r.line).toBe('clear ');
    expect(r.cursor).toBe(6);
  });

  it('completes a PowerShell cmdlet regardless of typed case (get-c -> Get-Content)', () => {
    const r = applyCompletionToLine('get-c', 5, { value: 'Get-Content', display: 'Get-Content', type: 'command' });
    expect(r.line).toBe('Get-Content ');
  });

  it('replaces only the basename part of a subdirectory path', () => {
    const r = applyCompletionToLine('cat logs/ap', 11, { value: 'logs/app.log', display: 'app.log', type: 'file' });
    expect(r.line).toBe('cat logs/app.log ');
  });

  it('adds no trailing space after a directory (keeps the slash for subpaths)', () => {
    const r = applyCompletionToLine('cd lo', 5, { value: 'logs/', display: 'logs/', type: 'directory' });
    expect(r.line).toBe('cd logs/');
    expect(suffixFor({ value: 'logs/', display: 'logs/', type: 'directory' })).toBe('');
  });

  it('completes mid-token when the cursor is not at end of line', () => {
    // "gre|" with cursor after "gre", trailing " x" already typed
    const r = applyCompletionToLine('gre x', 3, { value: 'grep', display: 'grep', type: 'command' });
    expect(r.line).toBe('grep  x');
    expect(r.cursor).toBe(5);
  });
});

describe('bash-style prefix filling (fill common prefix, then list)', () => {
  it('computes the longest common prefix of candidate values', () => {
    expect(longestCommonPrefix(['Get-ChildItem', 'Get-Content'])).toBe('Get-C');
    expect(longestCommonPrefix(['clear', 'cls'])).toBe('cl');
    expect(longestCommonPrefix(['-A', '-B', '-C'])).toBe('-');
    expect(longestCommonPrefix(['only'])).toBe('only');
    expect(longestCommonPrefix([])).toBe('');
  });

  it('fills the common prefix without a trailing space (still ambiguous)', () => {
    const r = applyCompletionToLine('get-c', 5, { value: 'Get-C', display: 'Get-C', type: 'argument' }, false);
    expect(r.line).toBe('Get-C');
    expect(r.cursor).toBe(5);
  });

  it('detects when the prefix cannot extend the token (→ list would show)', () => {
    // clear/cls share only "cl", which is exactly what was typed → no extension.
    const token = tokenUnderCursor('cl', 2);
    expect(longestCommonPrefix(['clear', 'cls'])).toBe(token);
    // get-c can still extend (and fix case) to Get-C.
    expect(longestCommonPrefix(['Get-ChildItem', 'Get-Content'])).not.toBe(tokenUnderCursor('get-c', 5));
  });

  it('tokenUnderCursor picks the trailing non-space run before the cursor', () => {
    expect(tokenUnderCursor('cat logs/ap', 11)).toBe('logs/ap');
    expect(tokenUnderCursor('ls ', 3)).toBe('');
    expect(tokenUnderCursor('grep -i fi', 10)).toBe('fi');
  });
});

describe('gatherCompletions (completeness + correctness)', () => {
  it('offers a command and all its aliases (cl -> clear AND cls)', () => {
    const vals = values(bash(), 'cl');
    expect(vals).toContain('clear');
    expect(vals).toContain('cls');
  });

  it('offers the new commands (se -> sed, aw -> awk, sha -> sha256sum/sha1sum)', () => {
    expect(values(bash(), 'se')).toContain('sed');
    expect(values(bash(), 'aw')).toContain('awk');
    const sha = values(bash(), 'sha');
    expect(sha).toContain('sha256sum');
    expect(sha).toContain('sha1sum');
  });

  it('completes flags for a command', () => {
    const vals = values(bash(), 'grep -');
    expect(vals).toContain('-o');
    expect(vals).toContain('-w');
  });

  it('completes files in a subdirectory with the full path as the value', () => {
    const vals = values(bash(), 'cat logs/a');
    expect(vals).toContain('logs/app.log');
    expect(vals).toContain('logs/auth.log');
  });

  it('completes PowerShell cmdlets case-insensitively', () => {
    const vals = values(ps(), 'get-c');
    expect(vals).toContain('Get-ChildItem');
    expect(vals).toContain('Get-Content');
  });

  it('completes PowerShell single-dash parameters', () => {
    const vals = values(ps(), 'Test-NetConnection -Comp');
    expect(vals).toContain('-ComputerName');
  });

  it('merges scenario command names for the first token only', () => {
    const first = values(bash(), 'clea', ['cleanup-tool']);
    expect(first).toContain('cleanup-tool');
    // Not the first token → scenario names must not leak in as arguments.
    const later = values(bash(), 'cat clea', ['cleanup-tool']);
    expect(later).not.toContain('cleanup-tool');
  });

  it('returns a stable, sorted order', () => {
    const vals = values(bash(), 'c');
    const sorted = [...vals].sort((a, b) => a.localeCompare(b));
    expect(vals).toEqual(sorted);
  });
});
