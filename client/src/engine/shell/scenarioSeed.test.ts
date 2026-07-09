import { describe, it, expect } from 'vitest';
import {
  stripCoachingComments,
  parseLsOutput,
  extractPathsFromPattern,
  extractPathsFromText,
  stubContent,
} from './scenarioSeed';

describe('stripCoachingComments', () => {
  it('removes a trailing blank-line + # block', () => {
    expect(stripCoachingComments('line1\nline2\n\n# Das ist der Miner!'))
      .toBe('line1\nline2');
  });

  it('keeps # lines inside real content (configs)', () => {
    const conf = '# main config\nPort 22\nPermitRootLogin no';
    expect(stripCoachingComments(conf)).toBe(conf);
  });
});

describe('parseLsOutput', () => {
  it('parses long-format lines (perms column decides dir vs file)', () => {
    const out = [
      'total 24',
      'drwxr-xr-x 2 root root 4096 Jan  5 10:00 archive',
      '-rw-r--r-- 1 root root  812 Jan  5 10:00 access.log',
    ].join('\n');
    expect(parseLsOutput(out)).toEqual([
      { name: 'archive', isDir: true },
      { name: 'access.log', isDir: false },
    ]);
  });

  it('parses grid output split on 2+ spaces; trailing slash means dir', () => {
    expect(parseLsOutput('access.log  error.log  backup/')).toEqual([
      { name: 'access.log', isDir: false },
      { name: 'error.log', isDir: false },
      { name: 'backup', isDir: true },
    ]);
  });

  it('skips comment/coaching lines and . / ..', () => {
    const out = 'drwxr-xr-x 2 r r 4096 Jan 5 10:00 .\n-rw-r--r-- 1 r r 10 Jan 5 10:00 x.log\n# schau dir x.log an!';
    expect(parseLsOutput(out)).toEqual([{ name: 'x.log', isDir: false }]);
  });

  it('parses PowerShell dir output (Mode column)', () => {
    const out = [
      '    Directory: C:\\Users\\admin',
      'Mode                 LastWriteTime         Length Name',
      '----                 -------------         ------ ----',
      'd-----         05.01.2026     10:00                logs',
      '-a----         05.01.2026     10:00           1024 report.txt',
    ].join('\n');
    expect(parseLsOutput(out)).toEqual([
      { name: 'logs', isDir: true },
      { name: 'report.txt', isDir: false },
    ]);
  });
});

describe('extractPathsFromPattern', () => {
  it('cat-like: seeds the positional arg as a file with the output as content', () => {
    expect(extractPathsFromPattern('cat /var/log/auth.log', 'out')).toEqual([
      { path: '/var/log/auth.log', kind: 'file', content: 'out' },
    ]);
  });

  it('cat in a pipeline seeds the file but NOT the transformed output as content', () => {
    expect(extractPathsFromPattern('cat access.log | grep 404', 'filtered')).toEqual([
      { path: 'access.log', kind: 'file' },
    ]);
  });

  it('sudo prefix is ignored', () => {
    expect(extractPathsFromPattern('sudo cat /etc/shadow', 'x')).toEqual([
      { path: '/etc/shadow', kind: 'file', content: 'x' },
    ]);
  });

  it('ls: emits a listing marker with the target dir', () => {
    expect(extractPathsFromPattern('ls -la /backup', 'total 0')).toEqual([
      { path: '/backup', kind: 'listing', output: 'total 0' },
    ]);
  });

  it('cd seeds a directory', () => {
    expect(extractPathsFromPattern('cd /tmp/.hidden', '')).toEqual([
      { path: '/tmp/.hidden', kind: 'dir' },
    ]);
  });

  it('cd seeds a relative bareword directory', () => {
    expect(extractPathsFromPattern('cd logs', '')).toEqual([
      { path: 'logs', kind: 'dir' },
    ]);
  });

  it('grep: skips the regex arg, seeds the file arg', () => {
    expect(extractPathsFromPattern('grep "Failed password" /var/log/auth.log', 'x')).toEqual([
      { path: '/var/log/auth.log', kind: 'file' },
    ]);
  });

  it('non-path words are not seeded', () => {
    expect(extractPathsFromPattern('kill 6666', '')).toEqual([]);
    expect(extractPathsFromPattern('ps aux', '')).toEqual([]);
  });

  it('Get-Content works like cat', () => {
    expect(extractPathsFromPattern('Get-Content C:\\Logs\\backup.log', 'out')).toEqual([
      { path: 'C:\\Logs\\backup.log', kind: 'file', content: 'out' },
    ]);
  });

  it('find: flag values are not seeded as junk directories', () => {
    expect(extractPathsFromPattern('find /var -type f -name "*.log"', '')).toEqual([
      { path: '/var', kind: 'dir' },
    ]);
  });

  it('redirect target terminates positional collection (not seeded)', () => {
    expect(extractPathsFromPattern('cat report.txt > /tmp/out.txt', 'out')).toEqual([
      { path: 'report.txt', kind: 'file', content: 'out' },
    ]);
  });

  it('well-known dotless filenames seed as files, not dirs', () => {
    expect(extractPathsFromPattern('chmod 600 /home/x/.ssh/id_rsa', '')).toEqual([
      { path: '/home/x/.ssh/id_rsa', kind: 'file' },
    ]);
  });
});

describe('extractPathsFromText', () => {
  it('finds absolute unix paths in hints/taskText', () => {
    expect(extractPathsFromText('Der Eindringling hat Spuren in /var/log/auth.log hinterlassen. Check /opt/scada!'))
      .toEqual([
        { path: '/var/log/auth.log', kind: 'file' },
        { path: '/opt/scada', kind: 'dir' },
      ]);
  });

  it('finds windows paths', () => {
    expect(extractPathsFromText('Schau in C:\\Users\\svc-backup\\AppData nach.'))
      .toEqual([{ path: 'C:\\Users\\svc-backup\\AppData', kind: 'dir' }]);
  });

  it('classifies dotted basenames as files, others as dirs; ignores URLs', () => {
    expect(extractPathsFromText('siehe https://x.de/foo und /etc/ssh/sshd_config'))
      .toEqual([{ path: '/etc/ssh/sshd_config', kind: 'dir' }]);
    expect(extractPathsFromText('lies /opt/notes.txt'))
      .toEqual([{ path: '/opt/notes.txt', kind: 'file' }]);
  });

  it('keeps colon-adjacent paths (single colon is not a URL scheme)', () => {
    expect(extractPathsFromText('offener port:/etc/passwd'))
      .toEqual([{ path: '/etc/passwd', kind: 'file' }]);
  });
});

describe('stubContent', () => {
  it('gives .log files plausible log lines', () => {
    expect(stubContent('access.log')).toMatch(/\d{2}:\d{2}/);
  });
  it('gives .sh files a shebang', () => {
    expect(stubContent('miner.sh')).toMatch(/^#!\/bin\/bash/);
  });
  it('gives .conf files a comment header', () => {
    expect(stubContent('app.conf')).toMatch(/^#/);
  });
  it('unknown extensions get a single generic line', () => {
    expect(stubContent('S7-1200_FW_4.6.2.upd').length).toBeGreaterThan(0);
  });
});

import { seedVfsFromScenario } from './scenarioSeed';
import { createShellFromContext } from './index';

describe('seedVfsFromScenario (via createShellFromContext)', () => {
  const base = { type: 'linux' as const, hostname: 'srv', username: 'admin' };

  it('a canned cat makes the file really exist with the canned content', () => {
    const shell = createShellFromContext({
      ...base, currentPath: '/var/log',
      commands: [{ pattern: 'cat /var/log/tickets/t-1001.txt', output: 'Ticket 1001\nDrucker brennt' }],
    });
    expect(shell.execute('cat /var/log/tickets/t-1001.txt').output).toBe('Ticket 1001\nDrucker brennt');
    // parent dir materialized too — cd works
    expect(shell.execute('cd /var/log/tickets').exitCode).toBe(0);
  });

  it('a canned ls materializes the advertised entries in the target dir', () => {
    const shell = createShellFromContext({
      ...base, currentPath: '/backup',
      commands: [{
        pattern: 'ls -la /backup',
        output: 'total 8\ndrwxr-xr-x 2 root root 4096 Jan  5 10:00 daily\n-rw-r--r-- 1 root root  812 Jan  5 10:00 backup_dc01.tar.gz',
      }],
    });
    const vfs = shell.getVfs();
    expect(vfs.exists('/backup/daily')).toBe(true);
    expect(vfs.isFile('/backup/backup_dc01.tar.gz')).toBe(true);
  });

  it('a relative canned ls resolves against currentPath', () => {
    const shell = createShellFromContext({
      ...base, currentPath: '/home/azubi/logs',
      commands: [{ pattern: 'ls', output: 'access.log  error.log  system.log' }],
    });
    expect(shell.getVfs().isFile('/home/azubi/logs/access.log')).toBe(true);
    expect(shell.execute('cat error.log').exitCode).toBe(0);
  });

  it('never overwrites existing files (overlay wins over seed)', () => {
    const shell = createShellFromContext({
      ...base, currentPath: '/opt',
      vfsOverlay: { files: [{ path: '/opt/real.txt', content: 'HAND AUTHORED' }] },
      commands: [{ pattern: 'cat /opt/real.txt', output: 'CANNED' }],
    });
    expect(shell.execute('cat /opt/real.txt').output).toBe('HAND AUTHORED');
  });

  it('paths mentioned in hints and taskText exist', () => {
    const shell = createShellFromContext({
      ...base, currentPath: '/home/admin',
      taskText: 'Der Eindringling hat Spuren in /var/log/intrusion.log hinterlassen.',
      hints: ['Schau mal unter /opt/scada/logs nach.'],
      commands: [],
    });
    expect(shell.getVfs().isFile('/var/log/intrusion.log')).toBe(true);
    expect(shell.execute('cd /opt/scada/logs').exitCode).toBe(0);
  });

  it('ls-seeded files without canned cat get non-empty stub content', () => {
    const shell = createShellFromContext({
      ...base, currentPath: '/backup',
      commands: [{ pattern: 'ls /backup', output: 'notes.log' }],
    });
    const out = shell.execute('cat /backup/notes.log').output;
    expect(out.length).toBeGreaterThan(0);
  });

  it('windows contexts seed Get-Content paths', () => {
    const shell = createShellFromContext({
      type: 'windows', hostname: 'dc01', username: 'admin', currentPath: 'C:\\Users\\admin',
      commands: [{ pattern: 'Get-Content C:\\Logs\\backup.log', output: 'Backup OK' }],
    });
    expect(shell.getVfs().isFile('C:\\Logs\\backup.log')).toBe(true);
  });
});
