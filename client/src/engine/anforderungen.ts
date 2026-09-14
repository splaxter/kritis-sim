import type { StateGoal, TerminalContext } from '@kritis/shared';

/**
 * Was ein Level WIRKLICH verlangt — aus seiner Siegbedingung, nicht aus seinen
 * Hinweisen.
 *
 * Der Unterschied ist der Befund aus dem Review: Die erste Fassung las die
 * Anforderungen aus den Hinweisen. Damit verschwand eine Anforderung, sobald
 * man ihre letzte Erklaerung loeschte — eine unangekuendigte `sha256sum`-Pflicht
 * in einem `commandRan`-Ziel blieb voellig unsichtbar, obwohl der sichtbare
 * Loesungsweg ohne sie nicht mehr reicht. Eine Pruefung, die genau dann
 * wegschaut, wenn die Erklaerung fehlt, prueft das Gegenteil von dem, was sie
 * soll.
 *
 * Deshalb: Quelle sind die `stateGoals` und `solutions[].commands`. Und was
 * hier NICHT abgebildet ist, wird als `ungedeutet` gemeldet statt stillschweigend
 * als erfuellt zu gelten.
 */

/** Eine Faehigkeit, die mehrere Befehle erfuellen koennen. */
export type Faehigkeit = 'schreiben' | 'lesen' | 'loeschen' | 'kopieren' | 'dienstSteuern';

export const FAEHIGKEIT_KANDIDATEN: Record<Faehigkeit, readonly string[]> = {
  // Inhalt in eine Datei bringen. Ohne Editor bleibt Umlenkung, `tee` oder ein
  // Werkzeug, das selbst schreibt.
  schreiben: ['>>', '>', 'tee', 'sed', 'ssh-keygen', 'ssh-copy-id', 'set-content', 'sha256sum', 'ansible-playbook', 'cp', 'scp', 'touch'],
  lesen: ['cat', 'less', 'head', 'tail', 'grep', 'awk', 'sed', 'diff', 'stat', 'get-content', 'select-string', 'nl', 'tac', 'strings', 'xxd', 'cut', 'sort'],
  loeschen: ['rm', 'sed', 'remove-item'],
  kopieren: ['cp', 'scp', 'copy-item'],
  // Einen Lauscher oeffnen oder schliessen: ueber den Dienst, ueber den Prozess
  // oder ueber die Firewall.
  dienstSteuern: ['systemctl', 'kill', 'ufw', 'service', 'stop-process'],
};

/**
 * Eine Anforderung ist immer eine ODER-Liste: `sha256sum` ist eine Liste mit
 * einem Eintrag, „irgendwie schreiben" eine mit acht. Das haelt den Pruefer
 * einfach — erfuellt ist sie, wenn EIN Kandidat bekannt oder sichtbar ist.
 */
export interface Anforderung {
  /** Wofuer sie steht, fuer die Fehlermeldung. */
  was: string;
  kandidaten: string[];
}

export interface Anforderungen {
  liste: Anforderung[];
  /** Zielarten, die hier (noch) nicht auf Befehle abgebildet sind. Sie machen
   *  das Level UNGEPRUEFT, nicht sauber. */
  ungedeutet: string[];
}

/**
 * Die Befehle, die ein `commandRan`-Muster zulaesst.
 *
 * Die Muster sind Regexe mit Vorspann: `^\\s*find\\s.*-iname`,
 * `^(?:sudo\\s+)?ufw\\s+status`, `^\\s*(grep|awk|cat)\\b`. Wer nur `^` abschneidet,
 * findet in keinem davon einen Namen — und meldete deshalb „commandRan ohne
 * Literalnamen" statt der Anforderung.
 */
export function befehleAusMuster(pattern: string): string[] {
  let rest = pattern.replace(/^\^/, '');
  // Vorspann abraeumen: Leerraum-Klassen und ein optionales `sudo`.
  for (;;) {
    const vorher = rest;
    rest = rest.replace(/^\\s[*+]?/, '').replace(/^\(\?:sudo\\s[*+]?\)\?/, '').replace(/^sudo\\s[*+]?/, '');
    if (rest === vorher) break;
  }
  // Alternative gleich am Anfang: (grep|awk|cat)
  const gruppe = rest.match(/^\((?:\?:)?([A-Za-z][A-Za-z0-9_.|-]*)\)/);
  if (gruppe) return gruppe[1].split('|').map((n) => n.toLowerCase()).filter(Boolean);
  const wort = rest.match(/^[A-Za-z][A-Za-z0-9_.-]*/);
  return wort ? [wort[0].toLowerCase()] : [];
}

/** Zielarten, die eindeutig einen Befehl erzwingen. */
const ZIEL_BEFEHL: Partial<Record<keyof StateGoal, string>> = {
  ansibleRan: 'ansible-playbook',
  firewallRule: 'ufw',
  firewallEnabled: 'ufw',
  firewallDefaultIncoming: 'ufw',
  serviceState: 'systemctl',
  serviceEnabled: 'systemctl',
  loggedIn: 'ssh',
  sha256Of: 'sha256sum',
  hashComputed: 'sha256sum',
  mailboxInspected: 'get-mailbox',
  auditEnabled: 'set-mailbox',
  sshdEffective: 'sed',
};

/** Zielarten, die eine Faehigkeit erzwingen. */
const ZIEL_FAEHIGKEIT: Partial<Record<keyof StateGoal, Faehigkeit>> = {
  matches: 'schreiben',
  absentMatches: 'schreiben',
  reportFields: 'schreiben',
  fileExists: 'schreiben',
  sameContentAs: 'kopieren',
  fileCopied: 'kopieren',
  fileAbsent: 'loeschen',
  fileRead: 'lesen',
  listenerPresent: 'dienstSteuern',
  listenerAbsent: 'dienstSteuern',
};

/** Zielarten ohne eigene Anforderung — sie beschreiben nur, WO geprueft wird. */
const ZIEL_NEUTRAL = new Set<string>(['file', 'host', 'service', 'mailbox']);

export function anforderungenAusZielen(ziele: readonly StateGoal[]): Anforderungen {
  const liste: Anforderung[] = [];
  const ungedeutet: string[] = [];
  const merke = (was: string, kandidaten: string[]) => {
    if (kandidaten.length === 0) return;
    if (!liste.some((a) => a.was === was)) liste.push({ was, kandidaten });
  };

  for (const ziel of ziele) {
    for (const schluessel of Object.keys(ziel) as (keyof StateGoal)[]) {
      if (ziel[schluessel] === undefined) continue;
      if (ZIEL_NEUTRAL.has(schluessel)) continue;

      if (schluessel === 'commandRan') {
        const namen = befehleAusMuster((ziel.commandRan as { pattern: string }).pattern);
        if (namen.length > 0) merke(namen.join('|'), namen);
        else ungedeutet.push('commandRan ohne Literalnamen');
        continue;
      }
      const befehl = ZIEL_BEFEHL[schluessel];
      if (befehl) { merke(befehl, [befehl]); continue; }
      const faehigkeit = ZIEL_FAEHIGKEIT[schluessel];
      if (faehigkeit) { merke(faehigkeit, [...FAEHIGKEIT_KANDIDATEN[faehigkeit]]); continue; }
      ungedeutet.push(String(schluessel));
    }
  }
  return { liste, ungedeutet: [...new Set(ungedeutet)].sort() };
}

/**
 * Alles, was ein Level verlangt — Ziele UND die vorgesehenen Befehlsnamen.
 *
 * `solutions[].commands` haelt teils mehrteilige Namen („systemctl start",
 * „ps aux") und level-eigene Verben („check-account"). Beides zaehlt als
 * erfuellt, wenn ENTWEDER der ganze Name oder sein erstes Wort verfuegbar ist:
 * der ganze Name, weil gescriptete Beats ihn ueber `teachesCommand` vorfuehren;
 * das erste Wort, weil der Spieler den Befehl lernt, nicht die Zeile.
 */
export function anforderungen(ctx: TerminalContext): Anforderungen {
  const ziele = (ctx.solutions ?? []).flatMap((l) => l.stateGoals ?? []);
  const aus = anforderungenAusZielen(ziele);
  for (const loesung of ctx.solutions ?? []) {
    for (const roh of loesung.commands ?? []) {
      const name = roh.toLowerCase();
      const ersterTeil = name.split(/\s+/)[0];
      // Eine reine Zahl ist kein Befehl (Ports, PIDs in Beat-Namen).
      const kandidaten = [name, ersterTeil].filter((k) => k && !/^\d+$/.test(k));
      if (kandidaten.length > 0 && !aus.liste.some((a) => a.was === name)) {
        aus.liste.push({ was: name, kandidaten: [...new Set(kandidaten)] });
      }
    }
  }
  return aus;
}
