import { describe, it, expect } from 'vitest';
import { TerminalProcessSpec, NetConnection, StateGoal } from '@kritis/shared';
import { createShellFromContext } from './index';
import { checkStateGoal } from './stateGoals';

/**
 * Prozesse und Verbindungen als ZUSTAND, nicht als Ausgabe.
 *
 * `ps` gab sechs fest verdrahtete Zeilen aus, `Get-Process` gab andere sechs,
 * und `Stop-Process` gab „[Process 3456 stopped]" zurueck, ohne dass sich
 * irgendetwas aenderte — der Prozess stand beim naechsten Aufruf wieder da.
 * Ein Level, das „beende das verdaechtige Werkzeug" verlangt, konnte das
 * nicht pruefen; es konnte nur den Befehlstext abgleichen. Jetzt gibt es eine
 * Tabelle, die beide Schalen lesen und beide Beende-Befehle veraendern.
 */

const PROZESSE: TerminalProcessSpec[] = [
  { pid: 1234, name: 'siemens_tia', user: 'engineer', cmd: 'C:\\Program Files\\Siemens\\TIA.exe' },
  { pid: 3456, name: 'PsExec64', user: 'engineer', cmd: 'C:\\Temp\\PsExec64.exe -s cmd' },
];

const VERBINDUNGEN: NetConnection[] = [
  { proto: 'tcp', localPort: 49152, peer: '10.0.0.1:445', pid: 3456, program: 'PsExec64', user: 'engineer' },
  { proto: 'tcp', localPort: 49153, peer: '10.0.0.10:102', pid: 3456, program: 'PsExec64', user: 'engineer' },
  { proto: 'tcp', localPort: 49200, peer: '192.168.20.5:443', pid: 1234, program: 'siemens_tia', user: 'engineer' },
];

function windowsShell() {
  return createShellFromContext({
    type: 'windows',
    hostname: 'ENG-WORKSTATION',
    username: 'engineer',
    currentPath: 'C:\\Users\\engineer',
    commands: [], solutions: [], hints: [],
    processes: PROZESSE,
    connections: VERBINDUNGEN,
  });
}

describe('Get-Process zeigt die Tabelle des Hosts', () => {
  it('listet die gesaeten Prozesse und nur die', () => {
    const out = windowsShell().execute('Get-Process').output;
    expect(out).toMatch(/PsExec64/);
    expect(out).toMatch(/siemens_tia/);
    expect(out, 'die alte feste Liste ist weg').not.toMatch(/chrome|notepad/);
  });

  it('gibt zweimal dasselbe aus', () => {
    const shell = windowsShell();
    expect(shell.execute('Get-Process').output).toBe(shell.execute('Get-Process').output);
  });

  it('meldet einen unbekannten Namen als Fehler statt als leere Liste', () => {
    const r = windowsShell().execute('Get-Process -Name gibtsnicht');
    expect(r.exitCode).toBe(1);
    expect(r.error).toMatch(/gibtsnicht/);
  });
});

describe('Stop-Process beendet wirklich', () => {
  it('der Prozess ist danach weg — und seine Verbindungen mit ihm', () => {
    const shell = windowsShell();
    expect(shell.execute('Get-NetTCPConnection').output).toMatch(/10\.0\.0\.1\b/);
    expect(shell.execute('Stop-Process -Id 3456').exitCode).toBe(0);
    expect(shell.execute('Get-Process').output, 'beendet heisst beendet').not.toMatch(/PsExec64/);
    const conns = shell.execute('Get-NetTCPConnection').output;
    expect(conns, 'die Sitzungen des Prozesses sind mit gegangen').not.toMatch(/10\.0\.0\.1:445|10\.0\.0\.1 /);
    expect(conns, 'die anderen bleiben').toMatch(/192\.168\.20\.5/);
  });

  it('ein Prozess, den es nicht gibt, meldet das', () => {
    const r = windowsShell().execute('Stop-Process -Id 9999');
    expect(r.exitCode).toBe(1);
  });
});

describe('Die Bedingungen lesen denselben Zustand', () => {
  const ziel = (g: StateGoal) => g;

  it('processAbsent ist erst erfuellt, wenn der Prozess beendet ist', () => {
    const shell = windowsShell();
    const goal = ziel({ processAbsent: { name: 'PsExec64' } });
    expect(checkStateGoal(shell, goal), 'vorher').toBe(false);
    shell.execute('Stop-Process -Id 3456');
    expect(checkStateGoal(shell, goal), 'nachher').toBe(true);
  });

  it('processPresent bewahrt: wer alles abschiesst, loest nicht', () => {
    const shell = windowsShell();
    const aufgabe = ziel({ processAbsent: { name: 'PsExec64' } });
    const bewahren = ziel({ processPresent: { name: 'siemens_tia' } });
    shell.execute('Stop-Process -Name PsExec64');
    shell.execute('Stop-Process -Name siemens_tia');
    expect(checkStateGoal(shell, aufgabe), 'die Aufgabe ist erfuellt').toBe(true);
    expect(checkStateGoal(shell, bewahren), 'aber die Anlage steht').toBe(false);
  });

  it('connectionAbsent trifft die Gegenstelle auch ohne fluechtigen Port', () => {
    const shell = windowsShell();
    const nurIp = ziel({ connectionAbsent: { peer: '10.0.0.1' } });
    const mitPort = ziel({ connectionAbsent: { peer: '10.0.0.1:445' } });
    expect(checkStateGoal(shell, nurIp)).toBe(false);
    expect(checkStateGoal(shell, mitPort)).toBe(false);
    shell.execute('Stop-Process -Id 3456');
    expect(checkStateGoal(shell, nurIp)).toBe(true);
    expect(checkStateGoal(shell, mitPort)).toBe(true);
  });

  it('eine Auswahl trifft nur, was sie nennt', () => {
    const shell = windowsShell();
    // Die Gegenprobe: 10.0.0.10 ist NICHT weg, nur weil 10.0.0.1 es waere.
    expect(checkStateGoal(shell, ziel({ connectionAbsent: { peer: '10.0.0.10' } }))).toBe(false);
    expect(checkStateGoal(shell, ziel({ connectionAbsent: { peer: '203.0.113.9' } })), 'nie dagewesen').toBe(true);
  });
});

describe('Linux liest dieselbe Tabelle', () => {
  function linuxShell() {
    return createShellFromContext({
      type: 'linux',
      hostname: 'fw-mgmt',
      username: 'admin',
      currentPath: '/home/admin',
      commands: [], solutions: [], hints: [],
      processes: [
        { pid: 4711, name: 'sshd', user: 'root', cmd: 'sshd: admin_amse [priv]' },
        { pid: 4712, name: 'bash', user: 'admin', cmd: '-bash' },
      ],
      connections: [{ proto: 'tcp', localPort: 22, peer: '85.214.47.123:51022', pid: 4711, program: 'sshd' }],
    });
  }

  it('ps zeigt die gesaeten Prozesse', () => {
    const out = linuxShell().execute('ps aux').output;
    expect(out).toMatch(/admin_amse/);
    expect(out, 'die alte feste Liste ist weg').not.toMatch(/mysqld|apache2/);
  });

  it('kill beendet Prozess und Sitzung — aber nur mit den noetigen Rechten', () => {
    const shell = linuxShell();
    const goal: StateGoal = { connectionAbsent: { peer: '85.214.47.123' } };
    expect(checkStateGoal(shell, goal)).toBe(false);
    const ohneRecht = shell.execute('kill 4711');
    expect(ohneRecht.exitCode, 'ein fremder root-Prozess braucht sudo').toBe(1);
    expect(checkStateGoal(shell, goal), 'und hat nichts veraendert').toBe(false);
    expect(shell.execute('sudo kill 4711').exitCode).toBe(0);
    expect(checkStateGoal(shell, goal), 'mit sudo ist die Sitzung weg').toBe(true);
  });
});
