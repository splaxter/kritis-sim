/**
 * openssl enc — echte Syntax, nachgebildete Wirkung.
 *
 * Wie beim Ansible-Motor gilt: Der Spieler tippt, was er an einer echten Kiste
 * tippen wuerde, und das Ergebnis verhaelt sich, wie es sich dort verhielte.
 * Die Verschluesselung selbst ist KEIN Kryptoverfahren und behauptet auch
 * nicht, eines zu sein — sie ist eine schluesselabhaengige Umkehrfunktion.
 * Wichtig ist nur die eine Eigenschaft, um die es im Level geht:
 *
 *   Ohne den richtigen Schluessel kommt der Klartext nicht zurueck.
 *
 * Deshalb ist der Chiffretext auch nicht mit `base64 -d` zu oeffnen: Wer das
 * versucht, bekommt Buchstabensalat. Ein Backup, das man ohne Schluessel lesen
 * kann, waere als Lehrmittel wertlos.
 *
 * Unterstuetzt:
 *   openssl enc [-d] -aes-256-cbc [-pbkdf2] [-salt] -in DATEI -out DATEI
 *               (-pass file:SCHLUESSELDATEI | -pass pass:WORT | -k WORT)
 *   openssl version
 * Alles andere antwortet wie das Original mit einem Fehler.
 */
import { ShellCommand, ParsedArgs, ExecutionContext, CommandResult } from '../../types';
import { toBytes, fromBytes, base64Encode, base64Decode } from './extended';

/** Steht am Anfang jedes Chiffretextes — wie bei echtem `openssl enc -salt`. */
const KOPF = 'Salted__';

/**
 * Steht am Anfang des KLARTEXTES, bevor verwuerfelt wird. Beim Entschluesseln
 * ist er die Probe: Kommt er nicht heraus, war der Schluessel falsch — genau
 * das meldet echtes openssl als "bad decrypt".
 */
const PROBE = 'KRITIS-ENC1';

const CIPHERS = new Set(['aes-256-cbc', 'aes-128-cbc', 'aes-256-ctr', 'chacha20']);

/** Schluesselabhaengige, umkehrbare Verwuerfelung (XOR ueber das Schluesselwort). */
function verwuerfeln(daten: Uint8Array, schluessel: Uint8Array): Uint8Array {
  const out = new Uint8Array(daten.length);
  let roll = schluessel.length;
  for (let i = 0; i < daten.length; i++) {
    roll = (roll + schluessel[i % schluessel.length] + i) & 0xff;
    out[i] = daten[i] ^ schluessel[i % schluessel.length] ^ roll;
  }
  return out;
}

export function chiffrieren(klartext: string, passwort: string): string {
  const key = toBytes(passwort.trim());
  return KOPF + base64Encode(verwuerfeln(toBytes(PROBE + klartext), key));
}

export function dechiffrieren(chiffre: string, passwort: string): string | null {
  if (!chiffre.startsWith(KOPF)) return null;
  const roh = base64Decode(chiffre.slice(KOPF.length));
  if (!roh) return null;
  // Dieselbe Funktion in die Gegenrichtung — XOR ist seine eigene Umkehrung.
  const klar = fromBytes(verwuerfeln(roh, toBytes(passwort.trim())));
  return klar.startsWith(PROBE) ? klar.slice(PROBE.length) : null;
}

const fehler = (text: string): CommandResult => ({ output: '', exitCode: 1, error: text });

/**
 * openssl schreibt sein Verfahren als `-aes-256-cbc` und seine Parameter als
 * `-in`/`-out`/`-pass` — einfacher Bindestrich, mehrere Buchstaben. Der
 * allgemeine Zerleger der Shell liest das als Haeufung einzelner Schalter, aus
 * `-aes-256-cbc` wuerde also `-a -e -s ...`. Deshalb wird die Zeile hier selbst
 * zerlegt: Das Original hat nun einmal diese Schreibweise, und nachgebaut wird
 * das Original, nicht das, was der Zerleger bequem findet.
 */
interface Zeile {
  unterbefehl?: string;
  cipher?: string;
  entschluesseln: boolean;
  ein?: string;
  aus?: string;
  pass?: string;
  k?: string;
}

export function zerlege(raw: string): Zeile {
  const t = raw.trim().split(/\s+/).filter(Boolean);
  const z: Zeile = { entschluesseln: false };
  let i = t[0] === 'openssl' ? 1 : 0;
  if (t[i] && !t[i].startsWith('-')) z.unterbefehl = t[i++];

  for (; i < t.length; i++) {
    const w = t[i];
    if (!w.startsWith('-')) continue;
    const name = w.slice(1);
    if (CIPHERS.has(name)) { z.cipher = name; continue; }
    if (name === 'd') { z.entschluesseln = true; continue; }
    if (name === 'e' || name === 'pbkdf2' || name === 'salt' || name === 'a' || name === 'base64') continue;
    if (name === 'in') { z.ein = t[++i]; continue; }
    if (name === 'out') { z.aus = t[++i]; continue; }
    if (name === 'pass') { z.pass = t[++i]; continue; }
    if (name === 'k') { z.k = t[++i]; continue; }
  }
  return z;
}

/** '-pass file:/pfad', '-pass pass:wort' oder '-k wort' zum Passwort aufloesen. */
function passwortAus(z: Zeile, ctx: ExecutionContext): { wert: string } | CommandResult {
  if (z.k !== undefined) return { wert: z.k };

  if (z.pass === undefined) {
    // Echtes openssl fragt interaktiv nach. Im Spiel gehoert der Schluessel in
    // eine Datei — alles andere landet in der Befehlshistorie.
    return fehler('enc: kein Passwort angegeben (-pass file:DATEI, -pass pass:WORT oder -k WORT)');
  }
  if (z.pass.startsWith('pass:')) return { wert: z.pass.slice(5) };
  if (z.pass.startsWith('file:')) {
    const pfad = z.pass.slice(5);
    const datei = ctx.vfs.readFile(pfad);
    if (!datei.ok) {
      return fehler(`Can't open "${pfad}" for reading, No such file or directory`);
    }
    // Echtes openssl nimmt die ERSTE Zeile der Datei als Passwort.
    return { wert: datei.value.split('\n')[0] };
  }
  return fehler(`Can't read "${z.pass}", unknown pass phrase argument`);
}

export const opensslCommand: ShellCommand = {
  name: 'openssl',
  description: 'OpenSSL command line tool',
  usage: 'openssl enc [-d] -CIPHER [-pbkdf2] [-salt] -in IN -out OUT -pass file:KEY | openssl version',
  options: [
    { short: 'd', description: 'entschluesseln', takesValue: false },
    { short: 'e', description: 'verschluesseln (Vorgabe)', takesValue: false },
    { long: 'pbkdf2', description: 'Schluesselableitung PBKDF2', takesValue: false },
    { long: 'salt', description: 'mit Salt (Vorgabe)', takesValue: false },
    { short: 'in', description: 'Eingabedatei', takesValue: true },
    { short: 'out', description: 'Ausgabedatei', takesValue: true },
    { short: 'pass', description: 'Passwortquelle', takesValue: true },
    { short: 'k', description: 'Passwort direkt', takesValue: true },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const z = zerlege(args.raw);

    if (z.unterbefehl === 'version') {
      return { output: 'OpenSSL 3.0.13 30 Jan 2024', exitCode: 0 };
    }
    if (z.unterbefehl !== 'enc') {
      return fehler(`openssl: '${z.unterbefehl ?? ''}' is an invalid command.`);
    }
    if (!z.cipher) {
      return fehler(`enc: Unknown cipher (unterstuetzt: ${[...CIPHERS].join(', ')})`);
    }
    if (!z.ein || !z.aus) return fehler('enc: -in und -out werden gebraucht');

    const quelle = ctx.vfs.readFile(z.ein);
    if (!quelle.ok) {
      return fehler(`Can't open "${z.ein}" for reading, No such file or directory`);
    }

    const pass = passwortAus(z, ctx);
    if (!('wert' in pass)) return pass;

    const ergebnis = z.entschluesseln
      ? dechiffrieren(quelle.value, pass.wert)
      : chiffrieren(quelle.value, pass.wert);

    if (ergebnis === null) {
      // Wortlaut wie beim Original, wenn Schluessel oder Datei nicht passen.
      return fehler('bad decrypt');
    }

    const schreib = ctx.vfs.writeFile(z.aus, ergebnis);
    if (!schreib.ok) return fehler(`Can't open "${z.aus}" for writing`);
    return { output: '', exitCode: 0 };
  },
};
