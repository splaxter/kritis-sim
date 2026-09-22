import type { GameEvent, TerminalContext } from '@kritis/shared';
import { LINUX_BEFEHLE, POWERSHELL_BEFEHLE } from './wissensbilanz';

/**
 * Der Sollpfad eines Levels: die Befehlszeilen, die ein Spieler tippt, der
 * NUR das benutzt, was auf dem Bildschirm steht.
 *
 * Zwei Quellen, weil es zwei Bauarten von Level gibt:
 *
 * - Levels mit gescripteten Beats (`commands[]`): dort ist die Zeile, die der
 *   Spieler tippen soll, woertlich als `pattern` hinterlegt. Die Herleitung ist
 *   die Portierung des Beat-Matchers aus `useTerminal` — erster Treffer
 *   gewinnt, `patternRegex` vor `startsWith` — damit ein verschatteter Beat
 *   auffaellt statt lautlos danebenzugehen.
 * - Levels mit `stateGoals`: dort gibt es keine vorgeschriebene Zeile. Was der
 *   Spieler abschreiben kann, steht in den Hinweisen und im Auftrag, und zwar
 *   in Backticks — so sind sie durchgehend gesetzt.
 *
 * Was hier NICHT herauskommt, ist ein Beweis der Loesbarkeit. Den liefert erst
 * das Ausfuehren gegen die echte Shell (`abschreibDurchstich.test.ts`).
 */

interface Beat {
  pattern: string;
  patternRegex?: string;
  teachesCommand?: string;
  isSolution?: boolean;
}

/** Portierung des Beat-Matchers: erster Treffer gewinnt. */
export function trefferBeat(beats: Beat[], getippt: string): Beat | null {
  for (const cmd of beats) {
    const passt = cmd.patternRegex
      ? new RegExp(cmd.patternRegex).test(getippt)
      : getippt.startsWith(cmd.pattern) || getippt === cmd.pattern;
    if (passt) return cmd;
  }
  return null;
}

/**
 * `grep MUSTER datei` ist eine Schreibweise, keine Zeile. Erkannt an einem
 * GROSSGESCHRIEBENEN Wort ausserhalb von Anfuehrungszeichen — innerhalb davon
 * stehen echte Inhalte wie „SLA Komm.ONE" oder „EXCH01".
 */
const PLATZHALTER_WORT = new Set([
  'datei', 'dateiname', 'dateien', 'muster', 'pfad', 'name', 'ordner',
  'verzeichnis', 'host', 'benutzer', 'zeile', 'text', 'ziel', 'quelle',
]);

function istPlatzhalter(zeile: string, windows: boolean): boolean {
  const ohneZitate = zeile.replace(/"[^"]*"|'[^']*'/g, '');
  // Der BEFEHL selbst ist nie ein Platzhalter — `Get-NetTCPConnection` heisst
  // nun einmal so. Geprueft wird deshalb nur, was danach kommt; `grep MUSTER
  // datei` und `cat PRUEFSUMMEN.txt` fallen weiterhin durch.
  const ohneBefehl = ohneZitate.split(/\s+/).slice(1).join(' ');
  if (/\b[A-ZÄÖÜ]{3,}\b/.test(ohneBefehl)) return true;
  // Kleingeschriebene Platzhalter sind genauso wenig tippbar: `cat dateiname`
  // ist eine Schreibweise, keine Zeile. Und `ping -c 3` ohne Ziel ebenso —
  // eine Option ohne das Argument, das sie braucht.
  const teile = ohneZitate.split(/\s+/);
  const befehl = teile[0].toLowerCase();
  const rest = teile.slice(1);
  if (rest.some((t) => PLATZHALTER_WORT.has(t.toLowerCase()))) return true;
  // Ein Befehl mit Optionen, aber ohne Operand: `ping -c 3` erklaert die
  // Option, ist aber keine Zeile, die jemand so abschickt.
  // In PowerShell SIND die benannten Parameter die Argumente: `Stop-Process
  // -Id 3456` ist eine vollstaendige Zeile, kein erklaerter Schalter. Die
  // Regel darunter gilt deshalb nur fuer die Bourne-Welt, wo `ping -c 3`
  // wirklich nur die Option zeigt.
  if (windows) return false;
  const operanden: string[] = [];
  for (let i = 0; i < rest.length; i++) {
    if (rest[i].startsWith('-')) {
      if (/^\d+$/.test(rest[i + 1] ?? '')) i++; // Optionswert
      continue;
    }
    operanden.push(rest[i]);
  }
  return operanden.length === 0 && !ALLEIN_SINNVOLL.has(befehl);
}

/** Befehle, die allein sinnvoll sind. Ein nacktes `cat` dagegen ist im Hinweis
 *  eine Nennung („den Treffer mit `cat` lesen"), keine tippbare Zeile — und in
 *  der echten Shell wuerde es auf eine Eingabe warten. */
const ALLEIN_SINNVOLL = new Set([
  'ls', 'pwd', 'whoami', 'df', 'free', 'top', 'history', 'date', 'id', 'ps',
  'hostname', 'uptime', 'tree', 'clear', 'env', 'exit', 'crontab', 'lsof',
  'netstat', 'ss', 'ifconfig', 'uname', 'get-process', 'get-service',
]);

function istNacktesStichwort(zeile: string, windows: boolean): boolean {
  const teile = zeile.split(/\s+/);
  if (teile.length !== 1) return false;
  // `Get-*` zaehlt ohne Argument auf — das ist eine Zeile, die jemand so
  // abschickt, kein blosses Stichwort. Fuer `Set-`/`Stop-` gilt das nicht.
  if (windows && /^get-/i.test(teile[0])) return false;
  return !ALLEIN_SINNVOLL.has(teile[0].toLowerCase());
}

const vokabular = (ctx: TerminalContext) =>
  ctx.type === 'windows' ? POWERSHELL_BEFEHLE : LINUX_BEFEHLE;

/** Befehlszeilen in Backticks, die wie ein Befehl beginnen. */
export function abschreibbareZeilen(ctx: TerminalContext): string[] {
  const vok = vokabular(ctx);
  const quellen = [...(ctx.hints ?? []), ctx.taskText ?? ''];
  const zeilen: string[] = [];
  for (const text of quellen) {
    for (const treffer of text.matchAll(/`([^`]+)`/g)) {
      const zeile = treffer[1].trim();
      const erstes = zeile.split(/\s+/)[0].toLowerCase();
      const istBefehl = vok.has(erstes) || erstes === 'sudo';
      const windows = ctx.type === 'windows';
      if (istBefehl && !istPlatzhalter(zeile, windows) && !istNacktesStichwort(zeile, windows)) {
        zeilen.push(zeile);
      }
    }
  }
  return zeilen;
}

/**
 * Manche `pattern` sind gar keine tippbaren Zeilen, sondern Muster:
 * `passwd.*switch|switch.*passwd`, `arp-scan|netdiscover`. Sie treffen im Spiel
 * ueber `patternRegex` oder als Alternative — abschreiben kann man sie nicht.
 * Eine reine Alternative ohne Regex-Zeichen wird auf ihren ersten Zweig
 * reduziert; alles mit echten Regex-Zeichen faellt raus.
 */
export function tippbar(pattern: string): string | null {
  // Ein Punkt gehoert zu jedem Dateinamen — nur echte Regex-Zeichen
  // disqualifizieren: Quantoren, Anker, Klassen, Gruppen.
  if (/\.\*|\.\+|\^|\$|\\|\[|\(/.test(pattern)) return null;
  if (pattern.includes('|')) {
    const zweige = pattern.split('|').map((z) => z.trim());
    // Eine Pipe verbindet zwei Befehle und enthaelt Leerzeichen; eine
    // Alternative besteht aus blossen Wortalternativen.
    const istAlternative = zweige.every((z) => !z.includes(' '));
    return istAlternative ? zweige[0] : pattern;
  }
  return pattern;
}

/** Die Beat-Zeilen, die zusammen eine `solutions[]`-Bedingung erfuellen. */
export function beatZeilen(ctx: TerminalContext): string[] | null {
  const beats = (ctx.commands ?? []) as Beat[];
  if (beats.length === 0) return null;

  for (const beat of beats.filter((b) => b.isSolution)) {
    const zeile = tippbar(beat.pattern);
    if (zeile && trefferBeat(beats, zeile) === beat) return [zeile];
  }
  for (const loesung of ctx.solutions ?? []) {
    const getippt: string[] = [];
    const gelernt = new Set<string>();
    let erreichbar = true;
    for (const gewuenscht of loesung.commands ?? []) {
      const beat = beats.find((b) => b.pattern === gewuenscht || b.teachesCommand === gewuenscht);
      const zeile = beat ? tippbar(beat.pattern) : null;
      if (!beat || !zeile || trefferBeat(beats, zeile) !== beat) { erreichbar = false; break; }
      getippt.push(zeile);
      gelernt.add(beat.pattern);
      if (beat.teachesCommand) gelernt.add(beat.teachesCommand);
      if (!loesung.allRequired) break;
    }
    const erfuellt = loesung.allRequired
      ? (loesung.commands ?? []).every((c) => gelernt.has(c))
      : (loesung.commands ?? []).some((c) => gelernt.has(c));
    if (erreichbar && erfuellt && getippt.length > 0) return getippt;
  }
  return null;
}

export interface Sollpfad {
  eventId: string;
  titel: string;
  quelle: 'beats' | 'backticks' | 'keine';
  zeilen: string[];
}

export function sollpfad(event: GameEvent): Sollpfad | null {
  const ctx = event.terminalContext;
  if (!ctx) return null;
  const ausBeats = beatZeilen(ctx);
  if (ausBeats) return { eventId: event.id, titel: event.title, quelle: 'beats', zeilen: ausBeats };
  const ausText = abschreibbareZeilen(ctx);
  if (ausText.length > 0)
    return { eventId: event.id, titel: event.title, quelle: 'backticks', zeilen: ausText };
  return { eventId: event.id, titel: event.title, quelle: 'keine', zeilen: [] };
}
