import { describe, it, expect } from 'vitest';
import type { StateGoal, TerminalContext } from '@kritis/shared';
import { createShellFromContext, checkStateGoals } from './shell';
import { FAEHIGKEIT_KANDIDATEN, UNBELEGTE_KANDIDATEN, type Faehigkeit } from './anforderungen';
import { alleTerminalLevel } from './terminalLevelRegistry';

/**
 * Die Kandidatenlisten sind GEMESSEN, nicht plausibel.
 *
 * Der Review-Befund, aus dem dieser Test entstand: `touch` stand als Kandidat
 * fuer „schreiben" und `stat` fuer „lesen". Beide klingen richtig und sind es
 * nicht — `touch` legt eine LEERE Datei an und erfuellt nie ein `matches`,
 * `stat` liest nur Metadaten und hinterlaesst keinen Lesezugriff im Log. Eine
 * Anleitung aus genau diesen beiden Befehlen galt damit als ausreichend,
 * obwohl das Level damit nicht loest.
 *
 * Die Lehre ist allgemeiner als die zwei Namen: Eine Liste, die aus dem
 * Gedaechtnis entsteht, ist eine Behauptung. Hier wird jeder Eintrag
 * ausgefuehrt und das zugehoerige Ziel geprueft — und die beiden gemeldeten
 * Fehlbesetzungen werden ausdruecklich als NICHT erfuellend nachgewiesen.
 */

const linux: TerminalContext = {
  type: 'linux', hostname: 'lab', username: 'timo', currentPath: '/home/timo',
  vfsOverlay: {
    directories: ['/home/timo'],
    files: [
      { path: '/home/timo/quelle.txt', content: 'INHALT\n' },
      { path: '/home/timo/vorhanden.txt', content: 'alt\n' },
      { path: '/home/timo/weg.txt', content: 'weg\n' },
    ],
  },
  commands: [], solutions: [], hints: [],
};

const windows: TerminalContext = {
  type: 'windows', hostname: 'WS01', username: 'timo', currentPath: 'C:\\Users\\timo',
  vfsOverlay: {
    directories: ['C:\\Users\\timo'],
    files: [{ path: 'C:\\Users\\timo\\quelle.txt', content: 'INHALT\n' }],
  },
  commands: [], solutions: [], hints: [],
};

/** Fuehrt die Zeilen aus (inklusive Rueckfragen) und prueft das Ziel. */
function erfuellt(ctx: TerminalContext, zeilen: string[], ziel: StateGoal): boolean {
  const shell = createShellFromContext(ctx);
  for (const zeile of zeilen) {
    shell.execute(zeile);
    let schutz = 0;
    while (shell.hasPendingInput() && schutz++ < 5) shell.continueInput('');
  }
  return checkStateGoals(shell, [ziel]);
}

interface Nachweis {
  faehigkeit: Faehigkeit;
  kandidat: string;
  ctx: TerminalContext;
  zeilen: string[];
  ziel: StateGoal;
}

const L = '/home/timo';
const W = 'C:\\Users\\timo';

/** Ein Nachweis je Kandidat: die Zeile, mit der er seine Wirkung entfaltet. */
const NACHWEISE: Nachweis[] = [
  // ── Inhalt schreiben ──────────────────────────────────────────────────────
  ...[
    { k: '>>', z: [`echo "INHALT" >> ${L}/ziel.txt`] },
    { k: '>', z: [`echo "INHALT" > ${L}/ziel.txt`] },
    { k: 'tee', z: [`echo "INHALT" | tee ${L}/ziel.txt`] },
    { k: 'cp', z: [`cp ${L}/quelle.txt ${L}/ziel.txt`] },
  ].map(({ k, z }) => ({
    faehigkeit: 'berichtSchreiben' as const, kandidat: k, ctx: linux, zeilen: z,
    ziel: { file: `${L}/ziel.txt`, matches: 'INHALT' } as StateGoal,
  })),
  { faehigkeit: 'dateiAendern', kandidat: 'sed', ctx: linux,
    zeilen: [`sed -i 's/alt/INHALT/' ${L}/vorhanden.txt`],
    ziel: { file: `${L}/vorhanden.txt`, matches: 'INHALT' } },
  { faehigkeit: 'berichtSchreiben', kandidat: 'set-content', ctx: windows,
    zeilen: [`Set-Content ${W}\\ziel.txt "INHALT"`],
    ziel: { file: `${W}\\ziel.txt`, matches: 'INHALT' } },

  // ── Vorhandene Datei aendern ──────────────────────────────────────────────
  ...[
    { k: '>', z: [`echo "INHALT" > ${L}/vorhanden.txt`] },
    { k: '>>', z: [`echo "INHALT" >> ${L}/vorhanden.txt`] },
    { k: 'tee', z: [`echo "INHALT" | tee ${L}/vorhanden.txt`] },
    { k: 'cp', z: [`cp ${L}/quelle.txt ${L}/vorhanden.txt`] },
  ].map(({ k, z }) => ({
    faehigkeit: 'dateiAendern' as const, kandidat: k, ctx: linux, zeilen: z,
    ziel: { file: `${L}/vorhanden.txt`, matches: 'INHALT' } as StateGoal,
  })),
  { faehigkeit: 'dateiAendern', kandidat: 'set-content', ctx: windows,
    zeilen: [`Set-Content ${W}\\quelle.txt "GEAENDERT"`],
    ziel: { file: `${W}\\quelle.txt`, matches: 'GEAENDERT' } },

  // ── Datei anlegen ─────────────────────────────────────────────────────────
  ...[
    { k: 'touch', z: [`touch ${L}/neu.txt`] },
    { k: '>', z: [`echo x > ${L}/neu.txt`] },
    { k: '>>', z: [`echo x >> ${L}/neu.txt`] },
    { k: 'tee', z: [`echo x | tee ${L}/neu.txt`] },
    { k: 'cp', z: [`cp ${L}/quelle.txt ${L}/neu.txt`] },
  ].map(({ k, z }) => ({
    faehigkeit: 'dateiAnlegen' as const, kandidat: k, ctx: linux, zeilen: z,
    ziel: { file: `${L}/neu.txt`, fileExists: true } as StateGoal,
  })),


  // ── Lesen ─────────────────────────────────────────────────────────────────
  ...[
    'cat', 'less', 'head', 'tail', 'nl', 'tac', 'rev', 'strings', 'xxd', 'wc',
    'sort', 'base64', 'sha256sum', 'md5sum', 'uniq', 'file',
  ].map((k) => ({
    faehigkeit: 'lesen' as const, kandidat: k, ctx: linux, zeilen: [`${k} ${L}/quelle.txt`],
    ziel: { fileRead: `${L}/quelle.txt` } as StateGoal,
  })),
  ...[
    { k: 'grep', z: [`grep INHALT ${L}/quelle.txt`] },
    { k: 'awk', z: [`awk '{print}' ${L}/quelle.txt`] },
    { k: 'sed', z: [`sed 's/a/b/' ${L}/quelle.txt`] },
    { k: 'diff', z: [`diff ${L}/quelle.txt ${L}/vorhanden.txt`] },
    { k: 'cut', z: [`cut -c1-3 ${L}/quelle.txt`] },
    { k: 'tr', z: [`tr a b < ${L}/quelle.txt`] },
  ].map(({ k, z }) => ({
    faehigkeit: 'lesen' as const, kandidat: k, ctx: linux, zeilen: z,
    ziel: { fileRead: `${L}/quelle.txt` } as StateGoal,
  })),
  { faehigkeit: 'lesen', kandidat: 'get-content', ctx: windows,
    zeilen: [`Get-Content ${W}\\quelle.txt`], ziel: { fileRead: `${W}\\quelle.txt` } },
  { faehigkeit: 'lesen', kandidat: 'select-string', ctx: windows,
    zeilen: [`Select-String -Path ${W}\\quelle.txt -Pattern INHALT`],
    ziel: { fileRead: `${W}\\quelle.txt` } },

  // ── Loeschen / Kopieren ───────────────────────────────────────────────────
  { faehigkeit: 'loeschen', kandidat: 'rm', ctx: linux, zeilen: [`rm ${L}/weg.txt`],
    ziel: { file: `${L}/weg.txt`, fileAbsent: true } },
  { faehigkeit: 'loeschen', kandidat: 'remove-item', ctx: windows,
    zeilen: [`Remove-Item ${W}\\quelle.txt`], ziel: { file: `${W}\\quelle.txt`, fileAbsent: true } },
  { faehigkeit: 'kopieren', kandidat: 'cp', ctx: linux,
    zeilen: [`cp ${L}/quelle.txt ${L}/kopie.txt`],
    ziel: { file: `${L}/kopie.txt`, sameContentAs: `${L}/quelle.txt` } },
  { faehigkeit: 'dateiAnlegen', kandidat: 'copy-item', ctx: windows,
    zeilen: [`Copy-Item ${W}\\quelle.txt ${W}\\neu.txt`],
    ziel: { file: `${W}\\neu.txt`, fileExists: true } },
  { faehigkeit: 'kopieren', kandidat: 'copy-item', ctx: windows,
    zeilen: [`Copy-Item ${W}\\quelle.txt ${W}\\kopie.txt`],
    ziel: { file: `${W}\\kopie.txt`, sameContentAs: `${W}\\quelle.txt` } },
];

/**
 * Nachweise in ECHTEN Levelkontexten. Ein Kandidat, der nur im Labor an einer
 * Hilfsdatei belegt ist, beweist nichts ueber das Ziel, an dem er im Spiel
 * haengt — genau daran ist `ssh-keygen` gescheitert: Der alte Nachweis pruefte
 * `matches: '.'` auf einer Schluesseldatei und galt damit als „schreibt
 * Inhalt". Einen Inventurbericht schreibt es trotzdem nie.
 */
interface Kontextnachweis {
  faehigkeit: Faehigkeit;
  kandidat: string;
  level: string;
  zeilen: { cmd: string; antworten?: string[] }[];
  ziel: StateGoal;
}

const PW = 'sonnenblume23';

const KONTEXTNACHWEISE: Kontextnachweis[] = [
  {
    faehigkeit: 'berichtSchreiben', kandidat: 'ssh-copy-id', level: 'learn_ssh_01_first_key',
    zeilen: [{ cmd: 'ssh-keygen -t ed25519' }, { cmd: 'ssh-copy-id admin@web01', antworten: [PW] }],
    ziel: { host: 'web01', file: '/home/admin/.ssh/authorized_keys', matches: 'ssh-ed25519' },
  },
  {
    faehigkeit: 'berichtSchreiben', kandidat: 'ansible-playbook', level: 'learn_ans_01_inventory',
    zeilen: [{ cmd: 'ansible-playbook motd.yml' }],
    ziel: { host: 'web01', file: '/etc/motd', matches: 'Zugriff nur nach Freigabe' },
  },
  {
    faehigkeit: 'berichtSchreiben', kandidat: 'cp', level: 'learn_net_02_backchannel',
    zeilen: [{ cmd: 'sudo cp /etc/hosts /root/incident/hosts.bak' }],
    ziel: { file: '/root/incident/hosts.bak', matches: '91\\.203\\.5\\.77' },
  },
  {
    faehigkeit: 'dateiAendern', kandidat: 'sed', level: 'learn_ssh_02_open_door',
    zeilen: [
      { cmd: 'ssh admin@web01', antworten: [PW] },
      { cmd: "sudo sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config" },
    ],
    ziel: { host: 'web01', file: '/etc/ssh/sshd_config', matches: '^PermitRootLogin no' },
  },
  {
    faehigkeit: 'dateiAendern', kandidat: 'ansible-playbook', level: 'learn_ans_02_drift',
    zeilen: [{ cmd: 'ansible-playbook harden.yml' }],
    ziel: { host: 'web02', file: '/etc/ssh/sshd_config', matches: '^PermitRootLogin no' },
  },
  {
    faehigkeit: 'lauscherEntfernen', kandidat: 'kill', level: 'learn_net_01_open_doors',
    zeilen: [{ cmd: 'sudo kill 6666' }],
    ziel: { listenerAbsent: { port: 31337 } },
  },
];

function imLevel(id: string, zeilen: { cmd: string; antworten?: string[] }[], ziel: StateGoal): boolean {
  const event = alleTerminalLevel().find((e) => e.id === id);
  if (!event?.terminalContext) throw new Error(`Level ${id} nicht gefunden — Nachweis veraltet?`);
  const shell = createShellFromContext(event.terminalContext);
  for (const { cmd, antworten } of zeilen) {
    shell.execute(cmd);
    let i = 0;
    while (shell.hasPendingInput() && i < 8) shell.continueInput(antworten?.[i++] ?? '');
  }
  return checkStateGoals(shell, [ziel]);
}

describe('Jeder Kandidat erfuellt die Zielart, der er zugeordnet ist', () => {
  it.each(NACHWEISE.map((n) => [`${n.faehigkeit}/${n.kandidat}`, n] as const))(
    '%s',
    (_name, n) => {
      expect(
        erfuellt(n.ctx, n.zeilen, n.ziel),
        `${n.kandidat} steht als ${n.faehigkeit}, erfuellt das Ziel aber nicht:\n  ${n.zeilen.join('\n  ')}`
      ).toBe(true);
    }
  );

  it.each(KONTEXTNACHWEISE.map((n) => [`${n.faehigkeit}/${n.kandidat} in ${n.level}`, n] as const))(
    '%s',
    (_name, n) => {
      expect(
        imLevel(n.level, n.zeilen, n.ziel),
        `${n.kandidat} steht als ${n.faehigkeit}, erfuellt das Ziel in ${n.level} aber nicht`
      ).toBe(true);
    }
  );

  it('JEDER gelistete Kandidat hat einen Nachweis — belegt oder ausdruecklich offen', () => {
    // Es gibt keine dritte Kategorie „ungeprueft, aber erlaubt" mehr. Was nicht
    // belegt ist, steht in UNBELEGTE_KANDIDATEN und zaehlt dann auch nicht als
    // Erfuellung (siehe wissensbilanz.ts).
    const belegt = new Set([
      ...NACHWEISE.map((n) => `${n.faehigkeit}/${n.kandidat}`),
      ...KONTEXTNACHWEISE.map((n) => `${n.faehigkeit}/${n.kandidat}`),
    ]);
    const offen: string[] = [];
    for (const [faehigkeit, kandidaten] of Object.entries(FAEHIGKEIT_KANDIDATEN)) {
      for (const k of kandidaten) {
        if (belegt.has(`${faehigkeit}/${k}`)) continue;
        if (UNBELEGTE_KANDIDATEN.has(k)) continue;
        offen.push(`${faehigkeit}/${k}`);
      }
    }
    expect(offen, 'Kandidat ohne Nachweis — belegen, streichen oder als unbelegt fuehren').toEqual([]);
  });

  it('die Liste der unbelegten Kandidaten ist nicht veraltet', () => {
    const alleKandidaten = new Set(Object.values(FAEHIGKEIT_KANDIDATEN).flat());
    const verwaist = [...UNBELEGTE_KANDIDATEN].filter((k) => !alleKandidaten.has(k));
    expect(verwaist, 'steht als unbelegt, wird aber nirgends mehr angeboten').toEqual([]);
  });
});

/**
 * Die Gegenprobe zum Review-Befund: Diese beiden duerfen ihre Zielart NICHT
 * erfuellen. Waere es anders, haette die Meldung auf einem Missverstaendnis
 * beruht — und dieser Test waere der falsche Fix.
 */
describe('Die gemeldeten Fehlbesetzungen sind wirklich welche', () => {
  it('touch legt an, schreibt aber keinen Inhalt', () => {
    expect(erfuellt(linux, [`touch ${L}/ziel.txt`], { file: `${L}/ziel.txt`, fileExists: true })).toBe(true);
    expect(erfuellt(linux, [`touch ${L}/ziel.txt`], { file: `${L}/ziel.txt`, matches: 'INHALT' })).toBe(false);
    expect(FAEHIGKEIT_KANDIDATEN.berichtSchreiben).not.toContain('touch');
  });

  it('stat sieht die Datei an, liest sie aber nicht', () => {
    expect(erfuellt(linux, [`stat ${L}/quelle.txt`], { fileRead: `${L}/quelle.txt` })).toBe(false);
    expect(erfuellt(linux, [`ls -la ${L}`], { fileRead: `${L}/quelle.txt` })).toBe(false);
    expect(FAEHIGKEIT_KANDIDATEN.lesen).not.toContain('stat');
    expect(FAEHIGKEIT_KANDIDATEN.lesen).not.toContain('ls');
  });

  it('sha256sum liest, schreibt aber nicht von sich aus', () => {
    expect(erfuellt(linux, [`sha256sum ${L}/quelle.txt`], { fileRead: `${L}/quelle.txt` })).toBe(true);
    expect(erfuellt(linux, [`sha256sum ${L}/quelle.txt`], { file: `${L}/ziel.txt`, matches: '.' })).toBe(false);
    expect(FAEHIGKEIT_KANDIDATEN.berichtSchreiben).not.toContain('sha256sum');
  });
});
