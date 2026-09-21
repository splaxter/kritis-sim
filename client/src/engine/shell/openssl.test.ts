import { describe, it, expect } from 'vitest';
import type { TerminalContext } from '@kritis/shared';
import { createShellFromContext } from './index';

const KLARTEXT = 'DISPO-DB-DUMP 2026-09-17\ntouren: 412\nfahrzeuge: 37\n';
const SCHLUESSEL = 'M7-tresor-2026-kritis';

const ctx = (dateien: { path: string; content: string }[]): TerminalContext => ({
  type: 'linux', hostname: 'backup01', username: 'root', currentPath: '/root',
  taskText: '', vfsOverlay: { directories: ['/srv/backup'], files: dateien },
  commands: [], solutions: [], hints: [],
});

/** Erst verschluesseln, dann das Ergebnis weiterverwenden — wie im Level. */
function chiffretext(): string {
  const shell = createShellFromContext(ctx([
    { path: '/srv/backup/klar.tar', content: KLARTEXT },
    { path: '/etc/backup/backup.key', content: `${SCHLUESSEL}\n` },
  ]));
  const r = shell.execute('openssl enc -aes-256-cbc -pbkdf2 -in /srv/backup/klar.tar -out /srv/backup/dump.enc -pass file:/etc/backup/backup.key');
  expect(r.exitCode).toBe(0);
  const datei = shell.getVfs().readFile('/srv/backup/dump.enc');
  expect(datei.ok).toBe(true);
  return datei.ok ? datei.value : '';
}

describe('openssl enc', () => {
  it('macht aus Klartext einen Chiffretext, der nicht mehr lesbar ist', () => {
    const c = chiffretext();
    expect(c.startsWith('Salted__')).toBe(true);
    expect(c).not.toContain('DISPO-DB-DUMP');
    expect(c).not.toContain('touren');
  });

  it('gibt mit dem richtigen Schluessel genau den Klartext zurueck', () => {
    const shell = createShellFromContext(ctx([
      { path: '/srv/backup/dump.enc', content: chiffretext() },
      { path: '/etc/backup/backup.key', content: `${SCHLUESSEL}\n` },
    ]));
    const r = shell.execute('openssl enc -d -aes-256-cbc -pbkdf2 -in /srv/backup/dump.enc -out /tmp/dump.tar -pass file:/etc/backup/backup.key');
    expect(r.exitCode).toBe(0);
    const zurueck = shell.getVfs().readFile('/tmp/dump.tar');
    expect(zurueck.ok && zurueck.value).toBe(KLARTEXT);
  });

  it('meldet mit dem falschen Schluessel „bad decrypt" und schreibt nichts', () => {
    const shell = createShellFromContext(ctx([
      { path: '/srv/backup/dump.enc', content: chiffretext() },
      { path: '/etc/backup/falsch.key', content: 'irgendwas-anderes\n' },
    ]));
    const r = shell.execute('openssl enc -d -aes-256-cbc -pbkdf2 -in /srv/backup/dump.enc -out /tmp/dump.tar -pass file:/etc/backup/falsch.key');
    expect(r.exitCode).toBe(1);
    expect(r.error).toContain('bad decrypt');
    expect(shell.getVfs().readFile('/tmp/dump.tar').ok).toBe(false);
  });

  it('ohne Schluesseldatei geht gar nichts', () => {
    const shell = createShellFromContext(ctx([{ path: '/srv/backup/dump.enc', content: chiffretext() }]));
    const r = shell.execute('openssl enc -d -aes-256-cbc -pbkdf2 -in /srv/backup/dump.enc -out /tmp/dump.tar -pass file:/etc/backup/backup.key');
    expect(r.exitCode).toBe(1);
    expect(r.error).toMatch(/No such file/);
  });

  it('der Chiffretext gibt auch mit base64 -d nichts preis', () => {
    // Waere das anders, koennte man das Backup ohne Schluessel lesen — und der
    // ganze Fall waere Theater.
    const shell = createShellFromContext(ctx([{ path: '/srv/backup/dump.enc', content: chiffretext() }]));
    shell.execute("tail -c +9 /srv/backup/dump.enc > /tmp/roh.b64");
    const r = shell.execute('base64 -d /tmp/roh.b64');
    expect(r.output).not.toContain('DISPO-DB-DUMP');
    expect(r.output).not.toContain('touren');
  });

  it.each([
    ['openssl enc -d -in /srv/backup/dump.enc -out /tmp/x -pass pass:egal', /Unknown cipher/],
    ['openssl enc -aes-256-cbc -in /srv/backup/dump.enc -out /tmp/x', /kein Passwort/],
    ['openssl rsa -in /srv/backup/dump.enc', /invalid command/],
    ['openssl enc -aes-256-cbc -in /gibtsnicht -out /tmp/x -k wort', /No such file/],
  ])('„%s" meldet einen Fehler statt etwas zu erfinden', (zeile, muster) => {
    const shell = createShellFromContext(ctx([{ path: '/srv/backup/dump.enc', content: chiffretext() }]));
    const r = shell.execute(zeile);
    expect(r.exitCode).toBe(1);
    expect(r.error).toMatch(muster);
  });

  it('openssl version antwortet wie das Original', () => {
    const shell = createShellFromContext(ctx([]));
    const r = shell.execute('openssl version');
    expect(r.exitCode).toBe(0);
    expect(r.output).toMatch(/^OpenSSL \d/);
  });
});
