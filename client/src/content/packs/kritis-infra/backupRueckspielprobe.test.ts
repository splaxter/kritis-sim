import { describe, it, expect } from 'vitest';
import { createShellFromContext, checkStateGoals } from '../../../engine/shell';
import { sha256Hex, toBytes } from '../../../engine/shell/commands/linux/extended';
import { getAllScenarios } from '../index';

/**
 * KRITIS-SC-014 — „Ist das Backup rueckspielbar?"
 *
 * Der wichtigste Test hier ist der letzte im ersten Block: Die Pruefsumme, die
 * im Inhalt steht, wird NACHGERECHNET. Eine abgeschriebene Zahl waere genau
 * die Sorte Nachweis, die der Fall kritisiert — der Spieler wuerde zwei Werte
 * vergleichen, von denen einer erfunden ist.
 */

const kontext = () => {
  const sc = getAllScenarios().find((s) => s.id === 'KRITIS-SC-014');
  if (!sc?.terminalContext) throw new Error('KRITIS-SC-014 nicht gefunden — Test veraltet?');
  return sc.terminalContext;
};

const ARCHIV = '/srv/backup/dispo-2026-09-17.tar.enc';
const ZIEL = '/tmp/dispo-2026-09-17.tar';
const SCHLUESSEL = '/etc/backup/keys/backup.key';

const ENTSCHLUESSELN = `sudo openssl enc -d -aes-256-cbc -pbkdf2 -in ${ARCHIV} -out ${ZIEL} -pass file:${SCHLUESSEL}`;
const ABRIEGELN = [
  'sudo ufw default deny incoming',
  'sudo ufw allow from 10.10.0.40 to any port 22',
  'sudo ufw enable',
];
const PROBE = [`cat /srv/backup/sha256sums.txt`, ENTSCHLUESSELN, `sha256sum ${ZIEL}`];

function fahre(zeilen: string[]) {
  const ctx = kontext();
  const shell = createShellFromContext(ctx);
  const ausgaben = zeilen.map((z) => shell.execute(z));
  return { shell, ausgaben, ziele: ctx.solutions![0].stateGoals! };
}

const geloest = (zeilen: string[]): boolean => {
  const { shell, ziele } = fahre(zeilen);
  return checkStateGoals(shell, ziele);
};

describe('KRITIS-SC-014 — die Rueckspielprobe', () => {
  it('der angesagte Weg loest', () => {
    expect(geloest([...PROBE, ...ABRIEGELN])).toBe(true);
  });

  it('die Pruefsumme im Inhalt ist die ECHTE Summe des zurueckgespielten Archivs', () => {
    // Waere sie abgeschrieben, verglichen der Spieler seinen Istwert mit einer
    // erfundenen Zahl — und der Fall lehrte das Gegenteil dessen, was er sagt.
    const { shell } = fahre([ENTSCHLUESSELN]);
    const klartext = shell.getVfs().readFile(ZIEL);
    expect(klartext.ok).toBe(true);
    const istwert = sha256Hex(toBytes(klartext.ok ? klartext.value : ''));

    const liste = kontext().vfsOverlay!.files!.find((f) => f.path.endsWith('sha256sums.txt'))!.content;
    expect(liste, 'Sollwert in sha256sums.txt weicht vom echten Hash ab').toContain(istwert);
  });

  it('ohne den richtigen Schluessel kommt gar nichts zurueck', () => {
    const { ausgaben } = fahre([
      "echo 'falscher-schluessel' > /tmp/falsch.key",
      `sudo openssl enc -d -aes-256-cbc -pbkdf2 -in ${ARCHIV} -out ${ZIEL} -pass file:/tmp/falsch.key`,
    ]);
    expect(ausgaben[1].exitCode).toBe(1);
    expect(ausgaben[1].error).toContain('bad decrypt');
    expect(geloest([
      "echo 'falscher-schluessel' > /tmp/falsch.key",
      `sudo openssl enc -d -aes-256-cbc -pbkdf2 -in ${ARCHIV} -out ${ZIEL} -pass file:/tmp/falsch.key`,
      ...ABRIEGELN,
    ])).toBe(false);
  });

  it('das Archiv verraet ohne Schluessel nichts — auch nicht beim Hineinsehen', () => {
    const { ausgaben } = fahre([`cat ${ARCHIV}`]);
    expect(ausgaben[0].output).not.toContain('DISPO-DB-DUMP');
    expect(ausgaben[0].output).not.toContain('touren');
  });
});

describe('Die Irrwege scheitern', () => {
  it('zurueckgespielt, aber nicht verglichen — die halbe Probe ist keine', () => {
    // Entschluesseln allein: Der Sollwert wurde nie gelesen, der Istwert nie
    // gerechnet. Genau das ist „wir haben mal draufgeschaut".
    expect(geloest([ENTSCHLUESSELN, ...ABRIEGELN])).toBe(false);
  });

  it('abgeriegelt, aber nie zurueckgespielt — die Forderung hat zwei Haelften', () => {
    expect(geloest(ABRIEGELN)).toBe(false);
  });

  it('eine zweite, unbeschraenkte Freigabe macht die erste wertlos', () => {
    expect(geloest([...PROBE, ...ABRIEGELN, 'sudo ufw allow 22/tcp'])).toBe(false);
  });

  it('Regeln ohne scharfe Firewall sind nur Konfiguration', () => {
    const ohneEnable = ABRIEGELN.filter((z) => !z.endsWith('enable'));
    expect(geloest([...PROBE, ...ohneEnable])).toBe(false);
  });
});
