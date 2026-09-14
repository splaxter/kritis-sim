import { describe, it, expect } from 'vitest';
import { befehleImText, bilanziere, LINUX_BEFEHLE } from './wissensbilanz';
import { befehleAusMuster, anforderungenAusZielen, anforderungenJeLoesung } from './anforderungen';
import { festeRouten } from './terminalLevelRegistry';

/**
 * Verlangt das Spiel je einen Befehl, den es nie gezeigt hat?
 *
 * Die Frage stellt sich, weil die Antwort zweimal „ja" war und beide Male ein
 * Mensch sie gefunden hat. Die erste Fassung dieser Pruefung beantwortete sie
 * allerdings noch falsch — sie las die Anforderungen aus den HINWEISEN. Damit
 * verschwand jede Anforderung, sobald man ihre Erklaerung loeschte: genau der
 * Fall, den sie finden soll. Anforderungen kommen deshalb ausschliesslich aus
 * der Siegbedingung (`anforderungen.ts`), Hinweise nur noch als Sichtbarkeit.
 */

describe('Befehle aus einem Text lesen', () => {
  it('erkennt Befehle mitten in deutscher Prosa', () => {
    const gefunden = befehleImText(
      'Umfang von /srv feststellen (find + wc -l); danach mit grep -r suchen.',
      LINUX_BEFEHLE
    );
    expect([...gefunden].sort()).toEqual(['find', 'grep', 'wc']);
  });

  it('haelt Umlenkung und Pipe auseinander', () => {
    expect([...befehleImText('echo "x" >> datei', LINUX_BEFEHLE)]).toContain('>>');
    expect([...befehleImText('echo "x" >> datei', LINUX_BEFEHLE)]).not.toContain('>');
    expect([...befehleImText('echo "x" > datei', LINUX_BEFEHLE)]).toContain('>');
    expect([...befehleImText('cat a | wc -l', LINUX_BEFEHLE)]).toContain('|');
  });

  /**
   * Der Grund fuer die Kontextregel. `du`, `dir` und `man` sind Befehle UND
   * deutsche Woerter; `Groß/Klein` enthaelt einen Schraegstrich und ist trotzdem
   * kein Pfad.
   */
  it('faellt nicht auf deutsche Woerter herein, die auch Befehle sind', () => {
    expect([...befehleImText('Mit grep -i ignorierst du Groß/Klein.', LINUX_BEFEHLE)]).toEqual(['grep']);
    expect([...befehleImText('Schau dir das an, man weiß ja nie.', LINUX_BEFEHLE)]).toEqual([]);
    expect([...befehleImText('du -sh /var/log', LINUX_BEFEHLE)]).toContain('du');
    expect([...befehleImText('man grep', LINUX_BEFEHLE)]).toContain('man');
  });

  /**
   * Eine pauschale Regel „hoechstens zwei Zeichen braucht Kontext" war bequem
   * und falsch: sie nahm `ps` und `ss` mit, die in deutschem Text eindeutig
   * sind — `ps aux` galt dadurch als nie gezeigt.
   */
  it('kurze, aber eindeutige Befehle zaehlen ohne Sonderbedingung', () => {
    expect([...befehleImText('`ps aux | grep miner`', LINUX_BEFEHLE)]).toContain('ps');
    expect([...befehleImText('`ss -tulpn`', LINUX_BEFEHLE)]).toContain('ss');
  });

  it('faerbt PowerShell nicht auf Linux ab', () => {
    expect([...befehleImText('Sieh dir /var/log an', LINUX_BEFEHLE)]).toEqual([]);
  });
});

describe('Anforderungen kommen aus der Siegbedingung, nicht aus den Hinweisen', () => {
  /**
   * Der Review-Befund: Eine unangekuendigte `sha256sum`-Pflicht in einem
   * `commandRan`-Ziel blieb voellig unsichtbar, weil die Anforderungen aus den
   * Hinweisen gelesen wurden. Eine Pruefung, die genau dann wegschaut, wenn die
   * Erklaerung fehlt, prueft das Gegenteil von dem, was sie soll.
   */
  it('ein commandRan-Ziel ist eine Anforderung, auch ohne jeden Hinweis', () => {
    const { liste } = anforderungenAusZielen([
      { commandRan: { pattern: '^\\s*sha256sum\\b', outcome: 'succeeded' } },
    ]);
    expect(liste.map((a) => a.was)).toEqual(['sha256sum']);
  });

  it('liest den Befehl aus dem Vorspann echter Muster', () => {
    expect(befehleAusMuster('^\\s*find\\s.*-iname')).toEqual(['find']);
    expect(befehleAusMuster('^(?:sudo\\s+)?ufw\\s+status(?:\\s+numbered)?$')).toEqual(['ufw']);
    expect(befehleAusMuster('^\\s*awk\\b')).toEqual(['awk']);
    // Eine Alternative ist eine ODER-Anforderung, keine drei Pflichten.
    expect(befehleAusMuster('^\\s*(grep|awk|cat)\\b')).toEqual(['grep', 'awk', 'cat']);
  });

  /**
   * Review-Befund: ODER galt zwischen Loesungen, innerhalb der Befehlsbedingung
   * aber weiter UND. `checkSolutions` prueft ohne `allRequired` mit `some` —
   * ein Level, das die echte Sitzung mit `pwd` loest, galt deshalb als
   * unloesbar, weil `sha256sum` danebenstand.
   */
  it('allRequired: false macht aus den Befehlen EINE Anforderung', () => {
    const ctx = {
      type: 'linux', hostname: 'h', username: 'u', currentPath: '/', commands: [], hints: [],
      solutions: [{ commands: ['pwd', 'sha256sum'], allRequired: false, resultText: '', skillGain: {} }],
    } as unknown as Parameters<typeof anforderungenJeLoesung>[0];
    const [weg] = anforderungenJeLoesung(ctx);
    expect(weg.liste.length, 'zwei Alternativen sind eine Anforderung').toBe(1);
    expect(weg.liste[0].kandidaten).toContain('pwd');
    expect(weg.liste[0].kandidaten).toContain('sha256sum');
  });

  it('allRequired: true bleibt eine Pflicht je Befehl', () => {
    const ctx = {
      type: 'linux', hostname: 'h', username: 'u', currentPath: '/', commands: [], hints: [],
      solutions: [{ commands: ['pwd', 'ls'], allRequired: true, resultText: '', skillGain: {} }],
    } as unknown as Parameters<typeof anforderungenJeLoesung>[0];
    const [weg] = anforderungenJeLoesung(ctx);
    expect(weg.liste.map((a) => a.was).sort()).toEqual(['ls', 'pwd']);
  });

  it('ein Inhaltsziel verlangt Schreiben, ein Lesenachweis Lesen', () => {
    const schreiben = anforderungenAusZielen([{ file: '/tmp/a', matches: 'x' }]);
    expect(schreiben.liste.map((a) => a.was)).toEqual(['berichtSchreiben']);
    expect(schreiben.liste[0].kandidaten).toContain('>>');

    const lesen = anforderungenAusZielen([{ fileRead: '/tmp/a' }]);
    expect(lesen.liste.map((a) => a.was)).toEqual(['lesen']);
    expect(lesen.liste[0].kandidaten).toContain('cat');
  });

  /** Was nicht gedeutet werden kann, muss SICHTBAR ungeprueft bleiben. */
  it('meldet eine unbekannte Zielart, statt sie als erfuellt zu behandeln', () => {
    const aus = anforderungenAusZielen([{ dasGibtEsNicht: true } as never]);
    expect(aus.ungedeutet).toEqual(['dasGibtEsNicht']);
  });
});

const bilanzen = festeRouten().map((r) => ({ route: r.name, bilanz: bilanziere(r.name, r.level) }));

describe('Wissensbilanz je Route', () => {
  it('es gibt genug Routen und Level (sonst prueft der Rest nichts)', () => {
    expect(bilanzen.length, 'Routen fehlen').toBeGreaterThanOrEqual(15);
    const gesamt = bilanzen.reduce((n, b) => n + b.bilanz.terminalLevel, 0);
    expect(gesamt, 'kaum Terminal-Level auf festen Routen').toBeGreaterThan(80);
  });

  /**
   * Die harte Regel. „Unloesbar" heisst: KEIN Kandidat der Anforderung steht
   * irgendwo — nicht im Auftrag, nicht in einem Hinweis, nicht in einer
   * vorgefuehrten Zeile — und die Route hat vorher keinen gezeigt.
   */
  it.each(bilanzen.map((b) => [b.route, b] as const))(
    '%s verlangt nichts, was nirgends steht',
    (_name, { bilanz }) => {
      const schlimm = bilanz.befunde.filter((f) => f.unloesbar.length > 0);
      expect(
        schlimm.map((f) => `${f.eventId}: ${f.unloesbar.join(', ')}`),
        'diese Level brauchen Wissen, das das Spiel nie vermittelt hat'
      ).toEqual([]);
    }
  );

  /**
   * Eine Anforderung, deren einziger sichtbarer Kandidat im Labor nicht belegt
   * ist, ist weder gruen noch rot — sie ist OFFEN. Vorher galt so ein Kandidat
   * schlicht als ausreichend; ein benannter Pruefverzicht macht eine falsche
   * Zuordnung aber nicht richtig.
   */
  it.each(bilanzen.map((b) => [b.route, b] as const))(
    '%s stuetzt sich auf keinen unbelegten Kandidaten',
    (_name, { bilanz }) => {
      const offen = bilanz.befunde.filter((f) => f.ungeprueft.length > 0);
      expect(
        offen.map((f) => `${f.eventId}: ${f.ungeprueft.join(', ')}`),
        'einziger sichtbarer Kandidat ist im Labor nicht belegt — belegen oder Inhalt aendern'
      ).toEqual([]);
    }
  );

  /**
   * Eine Zielart, die die Ableitung nicht kennt, darf nicht als „sauber"
   * durchgehen — sonst waechst der blinde Fleck still mit dem Inhalt.
   */
  it.each(bilanzen.map((b) => [b.route, b] as const))(
    '%s enthaelt keine ungedeutete Zielart',
    (_name, { bilanz }) => {
      const offen = bilanz.befunde.filter((f) => f.ungedeutet.length > 0);
      expect(
        offen.map((f) => `${f.eventId}: ${f.ungedeutet.join(', ')}`),
        'neue Zielart — in anforderungen.ts abbilden, sonst prueft die Bilanz sie nicht'
      ).toEqual([]);
    }
  );
});

/**
 * Die weiche Regel als Ratsche — und zwar ueber PAARE aus Level und
 * Anforderung, nicht ueber Zahlen.
 *
 * Der Review-Befund: Eine Obergrenze pro Route liess zwei Verschlechterungen
 * durch. Ein neues betroffenes Level passte unter die zu hohe Grenze, und ein
 * ZUSAETZLICHER Befehl in einem bereits betroffenen Level war voellig
 * unsichtbar — `[cat]` wurde `[cat, grep]`, die Levelzahl blieb gleich.
 *
 * Bestehende Paare duerfen verschwinden (das ist die Verbesserung); neue
 * duerfen nicht dazukommen.
 */
const BEKANNTE_HINWEISPAARE = new Set([
  'Lernpfad · Pflicht & Nachweis|learn_nis2_01_schwelle|dateiAendern',
  'Lernpfad · SSH & Remote-Zugriff|learn_ssh_01_first_key|berichtSchreiben',
  'Lernpfad · SSH & Remote-Zugriff|learn_ssh_01_first_key|ssh',
  'Lernpfad · SSH & Remote-Zugriff|learn_ssh_02_open_door|dateiAendern',
  'Lernpfad · SSH & Remote-Zugriff|learn_ssh_02_open_door|sed',
  'Lernpfad · SSH & Remote-Zugriff|learn_ssh_02_open_door|systemctl',
  'Lernpfad · Netz-Forensik|learn_net_01_open_doors|lauscherEntfernen',
  'Lernpfad · Netz-Forensik|learn_net_02_backchannel|dateiAendern',
  'Lernpfad · Ansible & Konfigurationsmanagement|learn_ans_01_inventory|berichtSchreiben',
  'Story · Audit Trail|at_l8_bastion_live|ufw',
]);

describe('Neue Befehle gehoeren in den Auftrag, nicht erst in den Hinweis', () => {
  const aktuelle = bilanzen.flatMap(({ route, bilanz }) =>
    bilanz.befunde.flatMap((f) => f.nurImHinweis.map((b) => `${route}|${f.eventId}|${b}`))
  );

  it('kein neues Paar aus Level und Anforderung', () => {
    const neu = aktuelle.filter((p) => !BEKANNTE_HINWEISPAARE.has(p));
    expect(
      neu,
      'diese Anforderung wird erst im Hinweis erklaert — gehoert in den Auftragstext'
    ).toEqual([]);
  });

  it('die Liste ist nicht veraltet', () => {
    // Verschwundene Paare sind gute Nachrichten, aber die Liste muss ihnen
    // folgen — sonst deckt sie irgendwann einen echten neuen Fall.
    const verwaist = [...BEKANNTE_HINWEISPAARE].filter((p) => !aktuelle.includes(p));
    expect(verwaist, 'behoben — bitte aus BEKANNTE_HINWEISPAARE streichen').toEqual([]);
  });
});
