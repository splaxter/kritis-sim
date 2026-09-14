import type { StateGoal, TerminalContext } from '@kritis/shared';
import { createShellFromContext } from './shell';

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
  | 'berichtSchreiben'
  | 'dateiAendern'
  | 'dateiAnlegen'
  | 'lesen'
  | 'loeschen'
  | 'kopieren'
  | 'lauscherEntfernen';

/**
 * Welcher Befehl welche Wirkung hat, ist GEMESSEN, nicht geschaetzt:
 * `anforderungen.kandidaten.test.ts` fuehrt jeden Eintrag hier aus und prueft
 * das zugehoerige Ziel. Drei Runden Review haben dabei dieselbe Lehre dreimal
 * erteilt:
 *
 * - `touch` legt an, schreibt aber keinen Inhalt.
 * - `stat` sieht die Datei an, liest sie aber nicht.
 * - `ssh-keygen` schreibt seinen SCHLUESSEL, nicht deinen Bericht — ein
 *   Spezialfall beweist keine allgemeine Faehigkeit.
 * - `ufw` sperrt einen Port, beendet aber keinen Lauscher.
 *
 * Deshalb gilt hier: JEDER Eintrag ist gegen ein Ziel DERSELBEN Bauart in
 * einem echten Levelkontext belegt, und es gibt keine Liste „ungeprueft, aber
 * erlaubt". Was nicht belegt ist, zaehlt nicht.
 *
 * Die verbleibende Naeherung, ausdruecklich: Eine Faehigkeit ist eine Klasse,
 * kein Beweis fuer den Einzelfall. Dass `ssh-copy-id` in SSH 1 den
 * `authorized_keys` schreibt, heisst nicht, dass es in einem anderen Level
 * einen Inventurbericht schreiben koennte. Die Trennung nach vorhandener und
 * neuer Zieldatei faengt den groben Teil davon; der Rest bleibt eine Naeherung
 * und wird hier benannt statt wegdefiniert.
 */
/**
 * Kandidaten, die der Inhalt nachweislich BENUTZT, die ich aber im Labor nicht
 * zum Laufen gebracht habe — `scp` ueber mehrere Hosts. Sie gelten NICHT als
 * Beleg: eine Anforderung, deren einziger verfuegbarer Kandidat hier steht,
 * wird als UNGEPRUEFT gemeldet. Das ist der Unterschied zur vorigen Fassung,
 * die „ungeprueft" mit „ausreichend" verwechselt hat.
 */
export const UNBELEGTE_KANDIDATEN: ReadonlySet<string> = new Set(['scp']);

export const FAEHIGKEIT_KANDIDATEN: Record<Faehigkeit, readonly string[]> = {
  // Einen Befund in eine Datei bringen, die es noch NICHT gibt. Ohne Editor
  // bleibt die Umlenkung, `tee`, `Set-Content` — oder eine Kopie, wenn der
  // Inhalt anderswo schon existiert.
  berichtSchreiben: ['>>', '>', 'tee', 'set-content', 'cp', 'scp', 'ssh-copy-id', 'ansible-playbook'],
  // Eine VORHANDENE Datei aendern. Zusaetzlich zu den obigen gehoeren die
  // Werkzeuge dazu, die gezielt in bestehende Dateien schreiben.
  dateiAendern: ['>>', '>', 'tee', 'set-content', 'cp', 'sed', 'ansible-playbook'],
  // Nur ihre Existenz — dafuer genuegt auch `touch` oder eine Kopie.
  dateiAnlegen: ['touch', '>', '>>', 'tee', 'cp', 'copy-item'],
  // Ein Lesezugriff wird nur verbucht, wenn der Befehl die Datei wirklich
  // EINLIEST. `stat` und `ls` sehen nur die Metadaten und zaehlen nicht.
  lesen: [
    'cat', 'less', 'head', 'tail', 'nl', 'tac', 'rev', 'strings', 'xxd', 'wc',
    'sort', 'base64', 'sha256sum', 'md5sum', 'grep', 'awk', 'sed', 'diff',
    'file', 'cut', 'uniq', 'tr', 'get-content', 'select-string',
  ],
  loeschen: ['rm', 'remove-item'],
  kopieren: ['cp', 'scp', 'copy-item'],
  // Einen Lauscher beendet man ueber den Prozess oder seinen Dienst. Eine
  // Firewallregel tut das NICHT — sie sperrt den Weg, der Prozess laeuft
  // weiter, und das Ziel bleibt unerfuellt.
  lauscherEntfernen: ['kill'],
};

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
  // matches/absentMatches/reportFields haengen davon ab, ob die Zieldatei
  // schon existiert — das entscheidet `faehigkeitFuerInhalt` mit der echten
  // Dateisystemlage, nicht diese Tabelle.
  fileExists: 'dateiAnlegen',
  sameContentAs: 'kopieren',
  fileCopied: 'kopieren',
  fileAbsent: 'loeschen',
  fileRead: 'lesen',
  listenerAbsent: 'lauscherEntfernen',
};

/**
 * Zielarten, die nichts VERLANGEN, sondern etwas BEWAHREN. `listenerPresent`
 * auf Port 22 heisst „der gute Dienst laeuft noch" — er lief schon vorher, es
 * ist eine Schutzbedingung gegen Kollateralschaden. Sie als Anforderung zu
 * fuehren, erfand eine Pflicht, die es nicht gibt.
 */
const ZIEL_BEWAHREND = new Set<string>(['listenerPresent']);

/** Zielarten ohne eigene Anforderung — sie beschreiben nur, WO geprueft wird. */
const ZIEL_NEUTRAL = new Set<string>(['file', 'host', 'service', 'mailbox']);

/**
 * Inhaltsziele sind zwei verschiedene Aufgaben, je nach Lage im Dateisystem:
 * Eine Datei, die es noch nicht gibt, muss der Spieler SCHREIBEN; eine
 * vorhandene muss er AENDERN. Das ist kein Feinschliff — `ssh-copy-id` kann
 * `authorized_keys` ergaenzen, aber niemals deinen Inventurbericht anlegen.
 * Entschieden wird es an der echten Dateisystemlage des Levels, nicht an einer
 * Vermutung.
 */
function faehigkeitFuerInhalt(ziel: StateGoal, existiert: (z: StateGoal) => boolean): Faehigkeit {
  return existiert(ziel) ? 'dateiAendern' : 'berichtSchreiben';
}

const INHALTSZIELE = new Set<string>(['matches', 'absentMatches', 'reportFields']);

export function anforderungenAusZielen(
  ziele: readonly StateGoal[],
  existiert: (ziel: StateGoal) => boolean = () => false
): Anforderungen {
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
      if (ZIEL_BEWAHREND.has(schluessel)) continue;
      if (INHALTSZIELE.has(schluessel)) {
        const faehigkeit = faehigkeitFuerInhalt(ziel, existiert);
        merke(faehigkeit, [...FAEHIGKEIT_KANDIDATEN[faehigkeit]]);
        continue;
      }

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
  const existiert = zieldateiExistiert(ctx);
  return (ctx.solutions ?? []).map((loesung) => {
    const aus = anforderungenAusZielen(loesung.stateGoals ?? [], existiert);
    const namen = loesung.commands ?? [];
    if (namen.length === 0) return aus;

    // `solutions[].commands` haelt teils mehrteilige Namen („systemctl start",
    // „ps aux") und level-eigene Verben („check-account"). Beides zaehlt als
    // erfuellt, wenn ENTWEDER der ganze Name oder sein erstes Wort verfuegbar
    // ist: der ganze Name, weil gescriptete Beats ihn ueber `teachesCommand`
    // vorfuehren; das erste Wort, weil der Spieler den Befehl lernt.
    const kandidatenVon = (roh: string) => {
      const name = roh.toLowerCase();
      // Eine reine Zahl ist kein Befehl (Ports, PIDs in Beat-Namen).
      return [name, name.split(/\s+/)[0]].filter((k) => k && !/^\d+$/.test(k));
    };

    if (loesung.allRequired) {
      // UND: jeder Name ist eine eigene Anforderung.
      for (const roh of namen) {
        const kandidaten = [...new Set(kandidatenVon(roh))];
        const was = roh.toLowerCase();
        if (kandidaten.length > 0 && !aus.liste.some((a) => a.was === was)) {
          aus.liste.push({ was, kandidaten });
        }
      }
      return aus;
    }

    // ODER: `checkSolutions` prueft ohne `allRequired` mit `some` — EIN Name
    // genuegt. Die erste Fassung machte daraus N Pflichten und meldete ein
    // Level als unloesbar, das die echte Sitzung mit einer einzigen Zeile
    // loest. Hier wird daraus EINE Anforderung mit allen Namen als Kandidaten.
    const kandidaten = [...new Set(namen.flatMap(kandidatenVon))];
    if (kandidaten.length > 0) {
      aus.liste.push({ was: namen.map((n) => n.toLowerCase()).join('|'), kandidaten });
    }
    return aus;
  });
}

/**
 * Existiert die Zieldatei eines Ziels schon, bevor der Spieler etwas tut?
 *
 * Gefragt wird die ECHTE Shell des Levels — inklusive Vorlagen und
 * Overlay-Dateien auf dem jeweiligen Host. Alles andere waere wieder eine
 * Vermutung, und Vermutungen sind in dieser Datei dreimal danebengegangen.
 */
export function zieldateiExistiert(ctx: TerminalContext): (ziel: StateGoal) => boolean {
  let shell: ReturnType<typeof createShellFromContext> | null = null;
  return (ziel: StateGoal) => {
    if (!ziel.file) return false;
    try {
      shell ??= createShellFromContext(ctx);
      const host = ziel.host ? shell.getHost(ziel.host) : undefined;
      const vfs = host?.vfs ?? shell.getVfs();
      return vfs.exists(vfs.resolvePath(ziel.file));
    } catch {
      return false;
    }
  };
}
