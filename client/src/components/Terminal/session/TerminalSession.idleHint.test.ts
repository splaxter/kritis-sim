import { describe, it, expect, vi } from 'vitest';
import { TerminalContext } from '@kritis/shared';
import { TerminalSession } from './TerminalSession';
import { createShellFromContext } from '../../../engine/shell';
import { tutorialEvents } from '../../../content/events/tutorials';
import { getScenarioById } from '../../../content/packs';

/**
 * Die automatische Hilfe im Einsteigermodus.
 *
 * Zwei Fassungen sind hier schon gescheitert:
 *   1. Der Index folgte der UHR — nach acht Sekunden Pause kam der naechste
 *      Hinweis, egal was der Spieler getan hatte. Wer `pwd` wiederholte, bekam
 *      „Super! Jetzt `ls`".
 *   2. Der Index war die Zahl erfuellter Loesungstokens — damit blieb die Hilfe
 *      stehen, sobald Hinweise und Schritte nicht 1:1 stehen. Im
 *      Netzwerk-Tutorial (fuenf Hinweise, drei Schritte) war der fuer den
 *      Abschluss noetige Port-Hinweis automatisch NIE erreichbar.
 *
 * Deshalb laeuft dieser Test gegen die ECHTEN Tutorialdaten, nicht gegen eine
 * synthetische 1:1-Liste — genau die hatte die zweite Fassung gruen gemacht.
 */

const byId = (id: string) => {
  const e = tutorialEvents.find((x) => x.id === id);
  if (!e) throw new Error(`${id} fehlt`);
  return e;
};

function sessionFuer(ctx: TerminalContext) {
  return new TerminalSession({
    shell: createShellFromContext(ctx),
    context: ctx,
    gameMode: 'beginner',
    onSolved: vi.fn(),
    onFlagsSet: vi.fn(),
  });
}

/** Den Hinweistext aus den Effekten eines handleIdleHint()-Aufrufs ziehen. */
function idleHint(s: TerminalSession): string | null {
  const zeile = s.handleIdleHint().find(
    (e) => e.type === 'writeLine' && typeof e.text === 'string' && e.text.includes('💡')
  ) as { text: string } | undefined;
  return zeile ? zeile.text.replace(/\x1b\[[0-9;]*m/g, '').replace('💡 ', '') : null;
}

function tippe(s: TerminalSession, cmd: string) {
  s.handleData(cmd);
  s.handleData('\r');
  // `ping` tropft seine Antwortzeilen getaktet aus und schluckt waehrenddessen
  // JEDE Eingabe. Ohne dieses Leerlaufenlassen verschwaende der naechste
  // Befehl spurlos — genau daran ist der erste Versuch dieses Tests
  // gescheitert, und im Browser passiert dasselbe, wenn man zu schnell tippt.
  for (let i = 0; i < 20; i++) {
    const effekte = s.tick('drip');
    if (effekte.length === 0) break;
  }
}

/* ── Die vier echten Tutorials ─────────────────────────────────────────── */

describe('Leerlauf-Hilfe an den echten Tutorialdaten', () => {
  it('Navigation: pwd → ls → cd, ohne Wiederholung eines erledigten Schritts', () => {
    const s = sessionFuer(byId('evt_tutorial_navigation').terminalContext!);
    expect(idleHint(s)).toMatch(/`pwd`/);
    tippe(s, 'pwd');
    expect(idleHint(s)).toMatch(/`ls`/);
    tippe(s, 'ls');
    expect(idleHint(s), 'nach ls darf nicht erneut ls verlangt werden').toMatch(/`cd Dokumente`/);
  });

  /** Playtest-Repro: `ls` ausfuehren, warten — die Hilfe verlangte erneut `ls`. */
  it('Dateien: der ls-Einstieg ist kein Schritt und wird nicht wiederholt', () => {
    const s = sessionFuer(byId('evt_tutorial_files').terminalContext!);
    expect(idleHint(s), 'der Einstieg zeigt trotzdem den ls-Tipp').toMatch(/`ls`/);
    tippe(s, 'ls');
    expect(idleHint(s), 'nach ls muss der erste echte Schritt kommen').toMatch(/`cat/);
    tippe(s, 'cat system.log');
    expect(idleHint(s)).toMatch(/`head/);
    tippe(s, 'head -3 system.log');
    expect(idleHint(s)).toMatch(/`tail/);
  });

  /** Playtest-Repro: nach grep fuehrte die Hilfe zu `grep -i failed auth.log`. */
  it('Suchen: nach grep kommt der Kontextschritt, nicht ein Optionstipp', () => {
    const s = sessionFuer(byId('evt_tutorial_search').terminalContext!);
    expect(idleHint(s)).toMatch(/grep ERROR error\.log/);
    tippe(s, 'grep ERROR error.log');
    const naechster = idleHint(s)!;
    expect(naechster, 'ein Optionstipp bringt kein Loesungstoken').not.toMatch(/-i failed/);
    expect(naechster).toMatch(/cat error\.log|grep -A 2/);
  });

  /** Playtest-Repro: der Port-Hinweis kam automatisch nie. */
  it('Netzwerk: nach ping und DNS kommt der Port-Hinweis', () => {
    const s = sessionFuer(byId('evt_tutorial_network').terminalContext!);
    expect(idleHint(s)).toMatch(/ping mail\.warm\.local/);
    tippe(s, 'ping mail.warm.local');
    expect(idleHint(s)).toMatch(/nslookup/);
    tippe(s, 'nslookup mail.warm.local');
    expect(idleHint(s), 'ohne diesen Hinweis ist das Level automatisch nicht fuehrbar')
      .toMatch(/Port 25|nc -zv/);
  });

  it.each(tutorialEvents.map((e) => e.id))(
    '%s: jeder Hinweis ist zugeordnet und jedes Ziel existiert',
    (id) => {
      const ctx = byId(id).terminalContext!;
      expect(ctx.hintFor, 'ohne hintFor faellt die Hilfe auf den Notbehelf zurueck').toBeDefined();
      expect(ctx.hintFor!.length, 'ein Eintrag je Hinweis').toBe(ctx.hints.length);
      const schritte = new Set(ctx.solutions.flatMap((s) => s.commands));
      for (const ziel of ctx.hintFor!) {
        if (ziel === null) continue;
        expect(schritte, `„${ziel}" ist kein Loesungsschritt dieses Levels`).toContain(ziel);
      }
      // Und jeder Schritt muss von mindestens einem Hinweis angesteuert werden,
      // sonst ist er automatisch nicht erreichbar.
      for (const schritt of schritte) {
        expect(ctx.hintFor, `kein Hinweis fuehrt zu Schritt „${schritt}"`).toContain(schritt);
      }
    }
  );
});

/* ── Der Notbehelf ohne hintFor ────────────────────────────────────────── */

describe('Leerlauf-Hilfe ohne Zuordnung', () => {
  const ctx: TerminalContext = {
    type: 'linux',
    hostname: 'h',
    username: 'timo',
    currentPath: '/home/timo',
    commands: [],
    solutions: [{ commands: [], allRequired: false, stateGoals: [{ file: '/tmp/x', fileExists: true }], resultText: 'ok', skillGain: {}, effects: {} }],
    hints: ['Erster', 'Zweiter', 'Dritter'],
  };

  it('laeuft im Leerlauf nicht durch', () => {
    const s = sessionFuer(ctx);
    expect(idleHint(s)).toBe('Erster');
    expect(idleHint(s)).toBe('Erster');
  });

  /**
   * Playtest-Befund: Bei reinen stateGoals-Leveln bleibt `commandsUsed` leer,
   * weil dort nichts per Skript matcht. Die Hilfe stand deshalb fuer immer auf
   * Hinweis 0, egal wie viel der Spieler wirklich ausgefuehrt hatte.
   */
  it('zaehlt auch echte Shell-Ausfuehrungen', () => {
    const s = sessionFuer(ctx);
    expect(idleHint(s)).toBe('Erster');
    tippe(s, 'ls');
    expect(idleHint(s), 'eine echte Ausfuehrung muss zaehlen').toBe('Zweiter');
    tippe(s, 'pwd');
    expect(idleHint(s)).toBe('Dritter');
  });

  it('ein echtes stateGoals-Level bleibt nicht auf Hinweis 0 stehen', () => {
    const szenario = getScenarioById('INTERN-SC-003')!;
    const s = sessionFuer(szenario.terminalContext!);
    const erster = idleHint(s);
    tippe(s, 'ls');
    tippe(s, 'cat wiederherstellung.txt');
    tippe(s, 'cat nis2.txt');
    expect(idleHint(s), 'nach drei Ausfuehrungen immer noch der erste Hinweis').not.toBe(erster);
  });
});

/* ── Was schon vorher galt und weiter gelten muss ──────────────────────── */

describe('Leerlauf-Hilfe — Buchhaltung', () => {
  it('eine Wiederholung verbraucht keinen Hinweis', () => {
    const s = sessionFuer(byId('evt_tutorial_navigation').terminalContext!);
    idleHint(s);
    expect(s.getSnapshot().hintsUsed).toBe(1);
    idleHint(s);
    idleHint(s);
    expect(s.getSnapshot().hintsUsed, 'Warten hat Hinweise aufgebraucht').toBe(1);
  });

  it('sind alle Schritte erledigt, kommt nichts mehr', () => {
    const s = sessionFuer(byId('evt_tutorial_navigation').terminalContext!);
    tippe(s, 'pwd');
    tippe(s, 'ls');
    tippe(s, 'cd Dokumente');
    expect(idleHint(s)).toBeNull();
  });
});

/* ── Befund 2: falsche Ziele duerfen nicht als Belege zaehlen ──────────── */

describe('Skript-Muster treffen das ganze Ziel, nicht nur den Anfang', () => {
  /**
   * Playtest-Befund: `nc -zv mail.warm.local 2525` loeste die Aufgabe — und der
   * dauerhafte Befund behauptete danach „Port 25: Connection refused". Die
   * Skript-Erkennung matcht per startsWith; ohne Anker galt jeder laengere
   * Befehl als Treffer.
   */
  it.each([
    ['nc mit falschem Port', 'nc -zv mail.warm.local 2525'],
    ['telnet mit falschem Port', 'telnet mail.warm.local 2525'],
    ['nc mit angehaengtem Ziel', 'nc -zv mail.warm.local 25x'],
  ])('%s zaehlt nicht als Portcheck', (_l, cmd) => {
    const s = sessionFuer(byId('evt_tutorial_network').terminalContext!);
    tippe(s, 'ping mail.warm.local');
    tippe(s, 'nslookup mail.warm.local');
    tippe(s, cmd);
    expect(s.getSnapshot().solved, `„${cmd}" belegt Port 25 nicht`).toBe(false);
  });

  it('der richtige Port loest weiterhin', () => {
    for (const cmd of ['nc -zv mail.warm.local 25', 'telnet mail.warm.local 25']) {
      const s = sessionFuer(byId('evt_tutorial_network').terminalContext!);
      tippe(s, 'ping mail.warm.local');
      tippe(s, 'nslookup mail.warm.local');
      tippe(s, cmd);
      expect(s.getSnapshot().solved, cmd).toBe(true);
    }
  });

  /** Playtest-Befund: `cat error.log.1` galt als Lesen von error.log. */
  it('eine andere Datei zaehlt nicht als Kontext', () => {
    const s = sessionFuer(byId('evt_tutorial_search').terminalContext!);
    tippe(s, 'grep ERROR error.log');
    tippe(s, 'cat error.log.1');
    expect(s.getSnapshot().solved, '`cat error.log.1` belegt error.log nicht').toBe(false);
    tippe(s, 'cat error.log');
    expect(s.getSnapshot().solved).toBe(true);
  });

  /**
   * Vorbestehende Falle: Der Hinweis empfiehlt `ping -c 3`, aber nur der nackte
   * Ping vergab das ping-Token. Wer dem Tipp folgte, konnte trotz DNS und
   * Portcheck nicht abschliessen.
   */
  it('wer der Empfehlung `ping -c 3` folgt, kann abschliessen', () => {
    const s = sessionFuer(byId('evt_tutorial_network').terminalContext!);
    tippe(s, 'ping -c 3 mail.warm.local');
    tippe(s, 'nslookup mail.warm.local');
    tippe(s, 'nc -zv mail.warm.local 25');
    expect(s.getSnapshot().solved, 'der empfohlene Weg fuehrte in eine Sackgasse').toBe(true);
  });
});

/* ── Befund 3: der Ping-Abbruch wird niemandem zugeschrieben ───────────── */

describe('Die Ping-Uebung behauptet nichts ueber den Spieler', () => {
  const netz = () => byId('evt_tutorial_network').terminalContext!;

  it('die Ausgabe erfindet kein Strg+C', () => {
    const bare = netz().commands.find((c) => c.pattern === 'ping mail.warm.local')!;
    expect(bare.output, 'ohne Tastendruck darf kein ^C erscheinen').not.toMatch(/\^C/);
    expect(bare.output, 'sie sagt stattdessen, was die UEBUNG tut').toMatch(/Übung|Uebung/);
  });

  it('kein Hinweis schreibt dem Spieler einen Abbruch zu', () => {
    for (const h of netz().hints) {
      expect(h, `„${h}" behauptet etwas ueber den Spieler`).not.toMatch(/musstest|hast du abgebrochen/i);
    }
  });
});

/* ── Getrennte Buchhaltung: Position ist nicht Verbrauch ───────────────── */

describe('Uebersprungene Zusatztipps bleiben erreichbar', () => {
  /** Der Hinweistext eines handleHintRequest()-Aufrufs (Schaltflaeche). */
  function knopfHinweis(s: TerminalSession): string | null {
    const zeile = s.handleHintRequest().find(
      (e) => e.type === 'writeLine' && typeof e.text === 'string' && e.text.includes('\x1b[33m')
    ) as { text: string } | undefined;
    return zeile ? zeile.text.replace(/\x1b\[[0-9;]*m/g, '').replace(/^\r\n/, '') : null;
  }

  /**
   * DER Befund aus Runde 3, als Ablauf:
   *
   *   Such-Tutorial starten          → 6 Hinweise, einer gezeigt
   *   `grep ERROR error.log`, warten → die Automatik springt zum Kontext (5)
   *   danach                         → „Hinweis (0 uebrig)", Schaltflaeche tot
   *
   * `hintsUsed = index + 1` hatte die vier uebersprungenen Tipps mitverbucht.
   */
  it('der Sprung zum Kontextschritt verbraucht die Optionstipps nicht', () => {
    const ctx = byId('evt_tutorial_search').terminalContext!;
    const s = sessionFuer(ctx);

    idleHint(s); // Hinweis 0 — „grep ERROR error.log"
    expect(s.getSnapshot().hintsUsed).toBe(1);

    tippe(s, 'grep ERROR error.log');
    const kontext = idleHint(s)!;
    expect(kontext, 'die Automatik springt zum Kontextschritt').toMatch(/cat error\.log|grep -A 2/);

    // Gezeigt sind jetzt genau ZWEI: der erste und der Kontexthinweis.
    expect(
      s.getSnapshot().hintsUsed,
      'die uebersprungenen Optionstipps duerfen nicht als verbraucht gelten'
    ).toBe(2);
    expect(ctx.hints.length - s.getSnapshot().hintsUsed, '„Hinweis (N uebrig)"').toBe(4);
  });

  it('die uebersprungenen Tipps lassen sich danach von Hand holen', () => {
    const s = sessionFuer(byId('evt_tutorial_search').terminalContext!);
    idleHint(s);
    tippe(s, 'grep ERROR error.log');
    idleHint(s); // springt zum Kontext

    // Die Schaltflaeche liefert die uebersprungenen Tipps, nicht „nichts mehr".
    const geholt = [knopfHinweis(s), knopfHinweis(s), knopfHinweis(s)];
    expect(geholt.join('\n')).toMatch(/-i/);
    expect(geholt.join('\n')).toMatch(/-c/);
    expect(geholt.join('\n')).toMatch(/-r/);
  });

  it('die Schaltflaeche wiederholt nichts, was schon zu sehen war', () => {
    const s = sessionFuer(byId('evt_tutorial_search').terminalContext!);
    const zuerst = idleHint(s);
    expect(knopfHinweis(s), 'der erste Hinweis stand schon da').not.toBe(zuerst);
  });

  it('erst wenn der Spieler wirklich alle kennt, ist die Schaltflaeche leer', () => {
    const ctx = byId('evt_tutorial_search').terminalContext!;
    const s = sessionFuer(ctx);
    const gesehen = new Set<string>();
    for (let i = 0; i < ctx.hints.length; i++) {
      const h = knopfHinweis(s);
      expect(h, `Hinweis ${i + 1} von ${ctx.hints.length} fehlt`).not.toBeNull();
      gesehen.add(h!);
    }
    expect(gesehen.size, 'jeder Hinweis genau einmal').toBe(ctx.hints.length);
    expect(knopfHinweis(s), 'danach ist wirklich Schluss').toBeNull();
    expect(s.getSnapshot().hintsUsed).toBe(ctx.hints.length);
  });

  it('die Automatik wiederholt einen Schritt, ohne den Rest zu verbrauchen', () => {
    const s = sessionFuer(byId('evt_tutorial_network').terminalContext!);
    idleHint(s);
    const vorher = s.getSnapshot().hintsUsed;
    idleHint(s);
    idleHint(s);
    expect(s.getSnapshot().hintsUsed, 'Warten hat Hinweise aufgebraucht').toBe(vorher);
  });
});
