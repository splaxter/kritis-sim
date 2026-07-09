import { describe, it, expect } from 'vitest';
import { buildPrompt } from './prompt';

describe('buildPrompt', () => {
  it('collapses home to ~ for linux', () => {
    expect(buildPrompt({ type: 'linux', username: 'azubi', hostname: 'srv', path: '/home/azubi', home: '/home/azubi' }))
      .toBe('azubi@srv:~$ ');
  });

  it('collapses home subdirectories to ~/…', () => {
    expect(buildPrompt({ type: 'linux', username: 'azubi', hostname: 'srv', path: '/home/azubi/logs', home: '/home/azubi' }))
      .toBe('azubi@srv:~/logs$ ');
  });

  it('does not collapse sibling dirs that merely share the prefix', () => {
    expect(buildPrompt({ type: 'linux', username: 'azubi', hostname: 'srv', path: '/home/azubi2', home: '/home/azubi' }))
      .toBe('azubi@srv:/home/azubi2$ ');
  });

  it('uses # for root', () => {
    expect(buildPrompt({ type: 'linux', username: 'root', hostname: 'srv', path: '/var/log', home: '/root' }))
      .toBe('root@srv:/var/log# ');
  });

  it('shows ~ with # when root is at home', () => {
    expect(buildPrompt({ type: 'linux', username: 'root', hostname: 'srv', path: '/root', home: '/root' }))
      .toBe('root@srv:~# ');
  });

  it('keeps the PowerShell prompt unchanged', () => {
    expect(buildPrompt({ type: 'windows', username: 'admin', hostname: 'dc01', path: 'C:\\Users\\admin' }))
      .toBe('PS C:\\Users\\admin> ');
  });
});
