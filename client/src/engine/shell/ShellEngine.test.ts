import { describe, it, expect, beforeEach } from 'vitest';
import { createShell, createShellFromContext } from './index';
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
      {
        path: '/home/azubi/auth.log',
        content: 'ok login 1\nFAILED login root\nok login 2\nok login 3\nFAILED login admin\n',
      },
      {
        path: '/home/azubi/access.log',
        content:
          '10.0.0.5 GET /index 200\n203.0.113.66 POST /login 403\n10.0.0.5 GET /home 200\n203.0.113.66 POST /login 403\n203.0.113.66 GET /admin 401\n',
      },
      {
        path: '/home/azubi/users.csv',
        content: 'root:0:/root\ndeploy:1000:/home/deploy\nazubi:1001:/home/azubi\n',
      },
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

describe('ShellEngine pipeline realism', () => {
  let shell: ShellEngine;
  beforeEach(() => {
    shell = bash();
  });

  it('runs later pipeline stages even when an earlier stage fails', () => {
    // Real shells: grep's error goes to stderr, wc still counts 0 lines.
    const result = shell.execute('grep x missing.log | wc -l');
    expect(result.output.trim()).toBe('0');
    expect(result.error).toContain('missing.log');
  });

  it('pipes ls output one entry per line without colors', () => {
    shell.execute('mkdir count && touch count/f1 count/f2 count/f3');
    const result = shell.execute('ls count | wc -l');
    expect(result.output.trim()).toBe('3');
    const plain = shell.execute('ls count | cat');
    expect(plain.output).toBe('f1\nf2\nf3');
  });

  it('does not colorize grep output inside a pipe', () => {
    const result = shell.execute('grep alpha a.txt | cat');
    expect(result.output).toBe('alpha');
    expect(result.output).not.toContain('\x1b[');
  });

  it('keeps redirected output free of ANSI colors', () => {
    shell.execute('grep alpha a.txt > hits.txt');
    const read = shell.getVfs().readFile('/home/azubi/hits.txt');
    expect(read.ok && read.value).toBe('alpha\n');
  });
});

describe('ShellEngine bash realism', () => {
  let shell: ShellEngine;
  beforeEach(() => {
    shell = bash();
  });

  it('reports unknown commands like real bash and sets exit 127', () => {
    const result = shell.execute('frobnicate');
    expect(result.error).toBe('bash: frobnicate: command not found');
    expect(result.exitCode).toBe(127);
  });

  it('expands $? to the last exit code', () => {
    shell.execute('cat missing.txt');
    expect(shell.execute('echo $?').output.trim()).toBe('1');
    shell.execute('echo ok');
    expect(shell.execute('echo $?').output.trim()).toBe('0');
  });

  it('supports bare VAR=value assignments', () => {
    shell.execute('TARGET=203.0.113.66');
    expect(shell.execute('echo $TARGET').output.trim()).toBe('203.0.113.66');
  });

  it('does not expand variables inside single quotes', () => {
    shell.execute('X=42');
    expect(shell.execute("echo '$X'").output.trim()).toBe('$X');
    expect(shell.execute('echo "$X"').output.trim()).toBe('42');
  });

  it('sudo actually runs the command as root and restores the user', () => {
    expect(shell.execute('sudo whoami').output.trim()).toBe('root');
    expect(shell.execute('whoami').output.trim()).toBe('azubi');
  });

  it('sudo preserves the inner command flags', () => {
    const result = shell.execute('sudo grep -c FAILED auth.log');
    expect(result.output.trim()).toBe('2');
  });

  it('which stays silent and fails for unknown commands', () => {
    const result = shell.execute('which frobnicate');
    expect(result.output).toBe('');
    expect(result.exitCode).toBe(1);
  });
});

describe('grep realism', () => {
  let shell: ShellEngine;
  beforeEach(() => {
    shell = bash();
  });

  it('reports missing files on stderr with exit code 2', () => {
    const result = shell.execute('grep x nope.log');
    expect(result.error).toBe('grep: nope.log: No such file or directory');
    expect(result.exitCode).toBe(2);
    expect(result.output).toBe('');
  });

  it('rejects directories without -r', () => {
    const result = shell.execute('grep x logs');
    expect(result.error).toBe('grep: logs: Is a directory');
  });

  it('searches directories recursively with -r and prefixes paths', () => {
    const result = shell.execute('grep -r applog logs | cat');
    expect(result.output).toBe('logs/app.log:applog');
  });

  it('prints trailing context with -A and group separators', () => {
    const result = shell.execute('grep -A 1 FAILED auth.log | cat');
    expect(result.output).toBe(
      'FAILED login root\nok login 2\n--\nFAILED login admin'
    );
  });

  it('matches whole words with -w', () => {
    const hit = shell.execute('grep -c -w root auth.log');
    expect(hit.output.trim()).toBe('1');
    const miss = shell.execute('grep -c -w roo auth.log');
    expect(miss.output.trim()).toBe('0');
  });
});

describe('coreutils realism', () => {
  let shell: ShellEngine;
  beforeEach(() => {
    shell = bash();
  });

  it('cat keeps going after a missing file and exits 1', () => {
    const result = shell.execute('cat a.txt missing.txt b.txt');
    expect(result.output).toContain('alpha');
    expect(result.output).toContain('bravo');
    expect(result.error).toContain('missing.txt');
    expect(result.exitCode).toBe(1);
  });

  it('supports the classic head -NUM form', () => {
    const result = shell.execute('head -2 auth.log');
    expect(result.output).toBe('ok login 1\nFAILED login root');
  });

  it('supports tail -n +N to skip leading lines', () => {
    const result = shell.execute('tail -n +4 auth.log');
    expect(result.output.trim()).toBe('ok login 3\nFAILED login admin');
  });

  it('find prints paths relative to the argument like real find', () => {
    const result = shell.execute('find . -name "*.log"');
    const lines = result.output.split('\n');
    expect(lines).toContain('./auth.log');
    expect(lines).toContain('./logs/sys.log');
    expect(lines).toContain('./logs/app.log');
    expect(result.output).not.toContain('/home/azubi');
  });

  it('find reports a missing start path', () => {
    const result = shell.execute('find /nope -name x');
    expect(result.error).toContain("find: '/nope': No such file or directory");
    expect(result.exitCode).toBe(1);
  });

  it('grep -o prints only the matched text, one per line', () => {
    const result = shell.execute('grep -o "203\\.0\\.113\\.66" access.log | cat');
    expect(result.output).toBe('203.0.113.66\n203.0.113.66\n203.0.113.66');
  });

  it('supports the classic IP-counting pipeline', () => {
    const result = shell.execute(
      'grep -o "^[0-9.]*" access.log | sort | uniq -c | sort -rn'
    );
    const lines = result.output.split('\n').map(l => l.trim());
    expect(lines[0]).toBe('3 203.0.113.66');
    expect(lines[1]).toBe('2 10.0.0.5');
  });

  it('sort -t -k sorts on a delimited field numerically', () => {
    const result = shell.execute('sort -t: -k2 -n users.csv | cat');
    expect(result.output.split('\n')[0]).toBe('root:0:/root');
    expect(result.output.split('\n')[2]).toBe('azubi:1001:/home/azubi');
  });
});

describe('awk', () => {
  let shell: ShellEngine;
  beforeEach(() => {
    shell = bash();
  });

  it('prints a single field', () => {
    const result = shell.execute("awk '{print $1}' access.log | cat");
    expect(result.output.split('\n')).toEqual([
      '10.0.0.5', '203.0.113.66', '10.0.0.5', '203.0.113.66', '203.0.113.66',
    ]);
  });

  it('honours a custom field separator', () => {
    const result = shell.execute("awk -F: '{print $1}' users.csv | cat");
    expect(result.output).toBe('root\ndeploy\nazubi');
  });

  it('supports $NF for the last field', () => {
    const result = shell.execute("awk -F: '{print $NF}' users.csv | cat");
    expect(result.output).toBe('/root\n/home/deploy\n/home/azubi');
  });

  it('filters rows by a regex pattern', () => {
    const result = shell.execute("awk '/403/ {print $1}' access.log | cat");
    expect(result.output).toBe('203.0.113.66\n203.0.113.66');
  });

  it('filters with a field comparison', () => {
    const result = shell.execute("awk '$4 == 200 {print $3}' access.log | cat");
    expect(result.output).toBe('/index\n/home');
  });

  it('counts records with END', () => {
    const result = shell.execute("awk 'END {print NR}' access.log");
    expect(result.output.trim()).toBe('5');
  });

  it('joins fields with OFS when comma-separated', () => {
    const result = shell.execute("awk -F: '{print $1, $2}' users.csv | cat");
    expect(result.output.split('\n')[0]).toBe('root 0');
  });
});

describe('sed', () => {
  let shell: ShellEngine;
  beforeEach(() => {
    shell = bash();
  });

  it('substitutes with s///g', () => {
    const result = shell.execute("echo 'a-b-c' | sed 's/-/_/g'");
    expect(result.output).toBe('a_b_c');
  });

  it('substitutes only the first occurrence without g', () => {
    const result = shell.execute("echo 'a-b-c' | sed 's/-/_/'");
    expect(result.output).toBe('a_b-c');
  });

  it('prints only matching lines with -n /re/p', () => {
    const result = shell.execute("sed -n '/FAILED/p' auth.log");
    expect(result.output).toBe('FAILED login root\nFAILED login admin');
  });

  it('deletes lines matching a regex', () => {
    const result = shell.execute("sed '/FAILED/d' auth.log");
    expect(result.output).toBe('ok login 1\nok login 2\nok login 3');
  });

  it('deletes a line by number', () => {
    const result = shell.execute("sed '1d' auth.log");
    expect(result.output.split('\n')[0]).toBe('FAILED login root');
  });

  it('edits a file in place with -i', () => {
    shell.execute("sed -i 's/FAILED/BLOCKED/g' auth.log");
    const read = shell.getVfs().readFile('/home/azubi/auth.log');
    expect(read.ok && read.value).toContain('BLOCKED login root');
    expect(read.ok && read.value).not.toContain('FAILED');
  });
});

describe('universal --help and history expansion', () => {
  let shell: ShellEngine;
  beforeEach(() => {
    shell = bash();
  });

  it('every command answers --help from its metadata', () => {
    const result = shell.execute('grep --help');
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('Usage:');
    expect(result.output).toContain('--ignore-case');
  });

  // The terminal records history via addToHistory before the next expansion,
  // so the tests seed history the same way.
  it('expands !! to the previous command', () => {
    shell.addToHistory('echo hello');
    const exp = shell.expandHistory('!!');
    expect(exp.changed).toBe(true);
    expect(exp.expanded).toBe('echo hello');
  });

  it('expands !$ to the last argument of the previous command', () => {
    shell.addToHistory('cat auth.log');
    const exp = shell.expandHistory('grep FAILED !$');
    expect(exp.expanded).toBe('grep FAILED auth.log');
  });

  it('expands !N to a numbered history entry', () => {
    shell.addToHistory('echo first');
    shell.addToHistory('echo second');
    const exp = shell.expandHistory('!1');
    expect(exp.expanded).toBe('echo first');
  });

  it('reports event-not-found for an unknown history reference', () => {
    shell.addToHistory('echo hi');
    const exp = shell.expandHistory('!99');
    expect(exp.changed).toBe(false);
    expect(exp.expanded).toContain('event not found');
  });
});

describe('systemctl', () => {
  let shell: ShellEngine;
  beforeEach(() => { shell = bash(); });

  it('shows a status block for a known unit', () => {
    const r = shell.execute('systemctl status ssh');
    expect(r.output).toContain('ssh.service - OpenBSD Secure Shell server');
    expect(r.output).toContain('active (running)');
    expect(r.exitCode).toBe(0);
  });

  it('accepts both `ssh` and `ssh.service`', () => {
    expect(shell.execute('systemctl is-active ssh').output).toBe('active');
    expect(shell.execute('systemctl is-active ssh.service').output).toBe('active');
  });

  it('reports unknown units', () => {
    const r = shell.execute('systemctl status nonexistent');
    expect(r.output).toContain('could not be found');
    expect(r.exitCode).toBe(4);
  });

  it('lists units', () => {
    const r = shell.execute('systemctl list-units');
    expect(r.output).toContain('apache2.service');
    expect(r.output).toContain('mysql.service');
  });

  it('denies state changes without root but allows them via sudo', () => {
    const denied = shell.execute('systemctl restart apache2');
    expect(denied.exitCode).not.toBe(0);
    expect(denied.error).toContain('Access denied');

    const allowed = shell.execute('sudo systemctl restart apache2');
    expect(allowed.exitCode).toBe(0);
  });
});

describe('tab completion for commands and flags', () => {
  let shell: ShellEngine;
  beforeEach(() => { shell = bash(); });

  it('completes the new commands by name', () => {
    expect(shell.complete('se', 2).map(c => c.value)).toContain('sed');
    expect(shell.complete('aw', 2).map(c => c.value)).toContain('awk');
  });

  it('completes short flags for grep', () => {
    const c = shell.complete('grep -', 'grep -'.length);
    const vals = c.map(x => x.value);
    expect(vals).toContain('-o');
    expect(vals).toContain('-w');
  });

  it('completes long flags for sort', () => {
    const c = shell.complete('sort --', 'sort --'.length);
    expect(c.map(x => x.value)).toContain('--field-separator');
  });
});

describe('ping produces streamable output', () => {
  // The terminal paces any output line matching icmp_seq / "Request timeout"
  // etc., so ping feels like it is really probing the host. These tests pin
  // the contract that ping emits one such line per packet.
  const REPLY = /icmp_seq|bytes from|Request timeout|Destination.*Unreachable|packet loss/i;

  it('a reachable host emits one reply line per packet', () => {
    const shell = bash();
    const r = shell.execute('ping -c 3 8.8.8.8');
    const replies = r.output.split('\n').filter(l => /icmp_seq=/.test(l));
    expect(replies.length).toBe(3);
    expect(r.output).toContain('64 bytes from');
    expect(r.output).toContain('3 packets transmitted');
    expect(r.output.split('\n').some(l => REPLY.test(l))).toBe(true);
    expect(r.exitCode).toBe(0);
  });

  it('an unreachable host emits one timeout line per packet', () => {
    const shell = bash();
    const r = shell.execute('ping -c 2 10.9.9.9');
    const timeouts = r.output.split('\n').filter(l => /Request timeout for icmp_seq/.test(l));
    expect(timeouts.length).toBe(2);
    expect(r.output).toContain('100.0% packet loss');
    expect(r.output.split('\n').some(l => REPLY.test(l))).toBe(true);
    expect(r.exitCode).toBe(1);
  });
});

describe('createShellFromContext currentPath sanitizing', () => {
  it('strips a trailing prompt char from linux paths', () => {
    const shell = createShellFromContext({
      type: 'linux', hostname: 'h', username: 'admin', currentPath: '/backup$',
    });
    expect(shell.getVfs().getCurrentPath()).toBe('/backup');
  });

  it('strips the > from C:\\> style paths', () => {
    const shell = createShellFromContext({
      type: 'windows', hostname: 'h', username: 'admin', currentPath: 'C:\\>',
    });
    expect(shell.getVfs().getCurrentPath()).toBe('C:\\');
  });

  it('resolves ~ to the home directory instead of creating a literal ~ dir', () => {
    const shell = createShellFromContext({
      type: 'linux', hostname: 'h', username: 'admin', currentPath: '~$',
    });
    expect(shell.getVfs().getCurrentPath()).toBe('/home/admin');
    expect(shell.getVfs().exists('/home/admin/~$')).toBe(false);
  });
});
