import { describe, it, expect } from 'vitest';
import { createShellFromContext, checkStateGoals } from '../../../engine/shell';
import { getAllScenarios } from '../index';

/**
 * Die beiden Faelle, die vorher „gedost" waren: vorgefertigte Ausgaben auf
 * Befehlsmuster, ohne dass die Maschine etwas getan haette. Jetzt entscheidet
 * der Zustand — und damit lassen sich die Irrwege auch wirklich pruefen,
 * statt sie im Ergebnistext zu behaupten.
 */

const kontext = (id: string) => {
  const sc = getAllScenarios().find((s) => s.id === id);
  if (!sc?.terminalContext) throw new Error(`${id} nicht gefunden — Test veraltet?`);
  return sc.terminalContext;
};

function fahre(id: string, zeilen: string[]) {
  const ctx = kontext(id);
  const shell = createShellFromContext(ctx);
  const ausgaben = zeilen.map((z) => shell.execute(z));
  return { shell, ausgaben, ziele: ctx.solutions![0].stateGoals! };
}

const geloest = (id: string, zeilen: string[]): boolean => {
  const { shell, ziele } = fahre(id, zeilen);
  return checkStateGoals(shell, ziele);
};

// ── KRITIS-SC-001: der unbekannte Zugriff ────────────────────────────────────

const BEFUND = '/home/operator/befund.md';
const LESEN = [
  'cat /opt/scada/logs/operations.log',
  'cat /opt/scada/config/access.log',
];
const SCHREIBEN = [
  `echo "quelle: 10.0.0.99" > ${BEFUND}`,
  `echo "konto: maintenance" >> ${BEFUND}`,
  `echo "angriff: nein" >> ${BEFUND}`,
  `echo "fehlend: anmeldung" >> ${BEFUND}`,
];

describe('KRITIS-SC-001 — der Befund wird hergeleitet, nicht geraten', () => {
  it('der angesagte Weg loest', () => {
    expect(geloest('KRITIS-SC-001', [...LESEN, ...SCHREIBEN])).toBe(true);
  });

  it('beide Quellen muessen gelesen sein — eine allein traegt den Befund nicht', () => {
    expect(geloest('KRITIS-SC-001', [LESEN[0], ...SCHREIBEN])).toBe(false);
    expect(geloest('KRITIS-SC-001', [LESEN[1], ...SCHREIBEN])).toBe(false);
  });

  it('„angriff: ja" ist falsch — die Adresse steht belegt in der Freigabeliste', () => {
    const falsch = SCHREIBEN.map((z) => z.replace('angriff: nein', 'angriff: ja'));
    expect(geloest('KRITIS-SC-001', [...LESEN, ...falsch])).toBe(false);
  });

  it('„fehlend: freigabe" ist der naheliegende Fehler — die Freigabe gibt es', () => {
    // Genau hier trennt sich Zugangsproblem von Prozessproblem. Wer beides
    // gleich benennt, bekommt beim naechsten Mal die falsche Massnahme.
    const falsch = SCHREIBEN.map((z) => z.replace('fehlend: anmeldung', 'fehlend: freigabe'));
    expect(geloest('KRITIS-SC-001', [...LESEN, ...falsch])).toBe(false);
  });

  it('die Freigabeliste belegt beides: die Adresse UND die Betriebsregel', () => {
    const { ausgaben } = fahre('KRITIS-SC-001', [LESEN[1]]);
    expect(ausgaben[0].output).toContain('10.0.0.99');
    expect(ausgaben[0].output).toContain('Wartungslaptop Siemens');
    expect(ausgaben[0].output).toMatch(/VORHER in der Leitwarte/i);
  });
});

// ── KRITIS-SC-012: DNS ───────────────────────────────────────────────────────

describe('KRITIS-SC-012 — von innen nach aussen', () => {
  it('der Dienst laeuft und lauscht — das Loch sitzt im Weg dorthin', () => {
    const { ausgaben } = fahre('KRITIS-SC-012', ['systemctl status bind9', 'ss -tulpen', 'sudo ufw status']);
    expect(ausgaben[0].output).toMatch(/active \(running\)/);
    expect(ausgaben[1].output).toContain('0.0.0.0:53');
    expect(ausgaben[2].output).not.toMatch(/\b53\b/); // genau das fehlt
  });

  it('das Ereignisprotokoll nennt die Ursache, statt sie erraten zu lassen', () => {
    const { ausgaben } = fahre('KRITIS-SC-012', ['journalctl -u ufw']);
    expect(ausgaben[0].output).toMatch(/entfernt: 53/);
  });

  it('die fehlende Freigabe eintragen loest', () => {
    expect(geloest('KRITIS-SC-012', ['sudo ufw allow 53'])).toBe(true);
  });

  it('die Firewall abschalten bringt DNS zurueck — und alles andere gleich mit', () => {
    // Der Reflex, der funktioniert und trotzdem falsch ist.
    expect(geloest('KRITIS-SC-012', ['sudo ufw disable'])).toBe(false);
  });

  it('wer den Namensdienst abschiesst, legt das zweite Problem dazu', () => {
    expect(geloest('KRITIS-SC-012', ['sudo ufw allow 53', 'sudo kill 812'])).toBe(false);
  });
});
