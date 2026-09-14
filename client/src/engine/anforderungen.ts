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
 *
 * UND innerhalb einer Loesung, ODER zwischen ihnen. Die erste Fassung hat die
 * Ziele aller Loesungen mit `flatMap` zusammengeworfen und damit aus einem
 * Angebot eine Pflichtenliste gemacht: eine zusaetzliche Hash-Loesung liess ein
 * Level als „unloesbar: sha256sum" gelten, obwohl der unveraenderte erste Weg
 * weiterhin ohne Hash funktioniert. So prueft die Engine, so rechnet die Bilanz.
 */

/**
 * Eine Faehigkeit, die mehrere Befehle erfuellen koennen.
 *
 * Die Trennung von „Datei anlegen" und „Inhalt schreiben" ist kein Feinschliff,
 * sondern ein Review-Befund: `touch` legt eine Datei an und erfuellt damit
 * `fileExists`, aber niemals ein `matches`. Wer beides in einen Topf wirft,
 * erklaert eine Anleitung fuer ausreichend, mit der das Level nicht loest.
 */
export type Faehigkeit =
  | 'inhaltSchreiben'
  | 'dateiAnlegen'
  | 'lesen'
  | 'loeschen'
  | 'kopieren'
  | 'dienstSteuern';

/**
 * Welcher Befehl welche Wirkung hat, ist GEMESSEN, nicht geschaetzt:
 * `anforderungen.kandidaten.test.ts` fuehrt jeden Eintrag hier gegen die echte
 * Shell aus und prueft, dass das zugehoerige Ziel danach wirklich erfuellt ist
 * — und dass die beiden gemeldeten Fehlbesetzungen (`touch` als Schreiber,
 * `stat` als Lesenachweis) es NICHT sind.
 */
export const FAEHIGKEIT_KANDIDATEN: Record<Faehigkeit, readonly string[]> = {
  // Inhalt in eine Datei bringen. Ohne Editor bleibt Umlenkung, `tee`, ein
  // In-Place-`sed` oder eine Kopie.
  inhaltSchreiben: ['>>', '>', 'tee', 'sed', 'cp', 'ssh-keygen', 'set-content', 'scp', 'ansible-playbook'],
  // Nur ihre Existenz — dafuer genuegt `touch`.
  dateiAnlegen: ['touch', '>', '>>', 'tee', 'cp', 'ssh-keygen', 'scp', 'ansible-playbook'],
  // Ein Lesezugriff wird nur verbucht, wenn der Befehl die Datei wirklich
  // EINLIEST. `stat` und `ls` sehen nur die Metadaten und zaehlen nicht.
  lesen: [
    'cat', 'less', 'head', 'tail', 'nl', 'tac', 'rev', 'strings', 'xxd', 'wc',
    'sort', 'base64', 'sha256sum', 'md5sum', 'grep', 'awk', 'sed', 'diff',
    'file', 'cut', 'uniq', 'tr', 'get-content', 'select-string',
  ],
  loeschen: ['rm', 'remove-item'],
  kopieren: ['cp', 'scp', 'copy-item'],
  // Einen Lauscher oeffnen oder schliessen: ueber den Dienst, ueber den Prozess
  // oder ueber die Firewall.
  dienstSteuern: ['systemctl', 'kill', 'ufw', 'service', 'stop-process'],
};

/**
 * Eine Anforderung ist immer eine ODER-Liste: `sha256sum` ist eine Liste mit
 * einem Eintrag, „irgendwie Inhalt schreiben" eine mit acht. Erfuellt ist sie,
 * wenn EIN Kandidat bekannt oder sichtbar ist.
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
  matches: 'inhaltSchreiben',
  absentMatches: 'inhaltSchreiben',
  reportFields: 'inhaltSchreiben',
  fileExists: 'dateiAnlegen',
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
 * Die Anforderungen EINER Loesung: alles darin muss zusammen erfuellt sein.
 *
 * `solutions[].commands` haelt teils mehrteilige Namen („systemctl start",
 * „ps aux") und level-eigene Verben („check-account"). Beides zaehlt als
 * erfuellt, wenn ENTWEDER der ganze Name oder sein erstes Wort verfuegbar ist:
 * der ganze Name, weil gescriptete Beats ihn ueber `teachesCommand` vorfuehren;
 * das erste Wort, weil der Spieler den Befehl lernt, nicht die Zeile.
 */
export function anforderungenJeLoesung(ctx: TerminalContext): Anforderungen[] {
  return (ctx.solutions ?? []).map((loesung) => {
    const aus = anforderungenAusZielen(loesung.stateGoals ?? []);
    for (const roh of loesung.commands ?? []) {
      const name = roh.toLowerCase();
      const ersterTeil = name.split(/\s+/)[0];
      // Eine reine Zahl ist kein Befehl (Ports, PIDs in Beat-Namen).
      const kandidaten = [name, ersterTeil].filter((k) => k && !/^\d+$/.test(k));
      if (kandidaten.length > 0 && !aus.liste.some((a) => a.was === name)) {
        aus.liste.push({ was: name, kandidaten: [...new Set(kandidaten)] });
      }
    }
    return aus;
  });
}
