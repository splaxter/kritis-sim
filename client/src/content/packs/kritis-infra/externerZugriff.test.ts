import { describe, it, expect } from 'vitest';
import { createShellFromContext, checkStateGoals } from '../../../engine/shell';
import { getAllScenarios } from '../index';

/**
 * KRITIS-SC-015 — „Wer war das eigentlich?"
 *
 * Der Fall behauptet drei Dinge. Alle drei werden hier gefahren statt erzaehlt:
 * dass ein Sammelkonto niemandem gehoert und deshalb niemand aufraeumt (zwei
 * tote Schluessel), dass ein Passwortwechsel daran nichts aendert, und dass
 * erst die ausfuehrliche Protokollstufe aus „protokolliert" ein „zuzuordnen"
 * macht.
 */

const kontext = () => {
  const sc = getAllScenarios().find((s) => s.id === 'KRITIS-SC-015');
  if (!sc?.terminalContext) throw new Error('KRITIS-SC-015 nicht gefunden — Test veraltet?');
  return sc.terminalContext;
};

const SAMMEL = '/home/dienstleister/.ssh/authorized_keys';
const MAREK = '/home/ext-marek/.ssh/authorized_keys';

const WEG = [
  'cat /srv/vertrag/wartungsvertrag.txt',
  `grep marek ${SAMMEL} > ${MAREK}`,
  `sudo rm -f ${SAMMEL}`,
  "sudo sed -i 's/^PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config",
  "sudo sed -i 's/^#LogLevel INFO/LogLevel VERBOSE/' /etc/ssh/sshd_config",
  'sudo systemctl restart ssh',
];

function fahre(zeilen: string[]) {
  const ctx = kontext();
  const shell = createShellFromContext(ctx);
  for (const z of zeilen) shell.execute(z);
  return { shell, ziele: ctx.solutions![0].stateGoals! };
}

const geloest = (zeilen: string[]): boolean => {
  const { shell, ziele } = fahre(zeilen);
  return checkStateGoals(shell, ziele);
};

describe('KRITIS-SC-015 — aus einem Sammelkonto wird ein Name', () => {
  it('der angesagte Weg loest', () => {
    expect(geloest(WEG)).toBe(true);
  });

  it('das Sammelkonto traegt wirklich drei Schluessel — zwei davon tote', () => {
    // Der Fund des Falls, am Inhalt belegt statt im Ergebnistext behauptet.
    const { shell } = fahre([]);
    const datei = shell.getVfs().readFile(SAMMEL);
    expect(datei.ok).toBe(true);
    const zeilen = (datei.ok ? datei.value : '').trim().split('\n');
    expect(zeilen).toHaveLength(3);

    const vertrag = shell.execute('cat /srv/vertrag/wartungsvertrag.txt').output;
    expect(vertrag).toMatch(/ext-marek.*AKTIV/);
    expect(vertrag).toMatch(/ext-lorenz.*ausgeschieden/);
    expect(vertrag).toMatch(/ext-said.*ausgeschieden/);
  });
});

describe('Die Irrwege scheitern', () => {
  it('nur den Schluessel umziehen — das Sammelkonto steht weiter offen', () => {
    expect(geloest(WEG.filter((z) => !z.startsWith('sudo rm')))).toBe(false);
  });

  it('alle drei Schluessel mitnehmen ist kein Aufraeumen, nur ein Umzug', () => {
    const faul = [
      'cat /srv/vertrag/wartungsvertrag.txt',
      `cat ${SAMMEL} > ${MAREK}`,
      `sudo rm -f ${SAMMEL}`,
      ...WEG.slice(3),
    ];
    expect(geloest(faul)).toBe(false);
  });

  it('die Konfiguration aendern ohne Neustart genuegt nicht', () => {
    // Der Dienst laeuft bis zum Neustart mit der alten Einstellung weiter —
    // die Datei ist gehaertet, die Kiste nicht.
    const ohneNeustart = WEG.filter((z) => !z.includes('systemctl'));
    expect(geloest(ohneNeustart)).toBe(false);
    const { shell } = fahre(ohneNeustart);
    expect(shell.getHost('local')!.sshdEffective.passwordAuthentication).toBe(true);
  });

  it('ohne die ausfuehrliche Protokollstufe bleibt es beim Kontonamen', () => {
    const ohneLogLevel = WEG.filter((z) => !z.includes('LogLevel'));
    expect(geloest(ohneLogLevel)).toBe(false);
  });

  it('ein Passwortwechsel am Sammelkonto aendert an den Schluesseln nichts', () => {
    // Die Antwortmoeglichkeit B des Falls, ausgefahren: Der Zugang bleibt
    // unveraendert offen, und zwar fuer alle drei.
    const { shell } = fahre(['sudo passwd dienstleister']);
    const datei = shell.getVfs().readFile(SAMMEL);
    expect(datei.ok && datei.value).toContain('lorenz@wartung-gmbh');
  });
});
