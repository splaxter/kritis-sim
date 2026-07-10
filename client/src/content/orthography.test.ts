/**
 * Orthography guard: player-facing German text must use real umlauts
 * (ä/ö/ü/ß), never ASCII transliterations (ae/oe/ue).
 *
 * Design: a curated blacklist of transliterated-German STEMS — NOT a blanket
 * ae/oe/ue scan, because legitimate vocabulary contains those digraphs
 * (queue, value, true, colleague, bauen, schauen, Dauer, neue, teuer, Feuer,
 * Steuer, Vertrauen, zuerst, bequem, Quelle, aktuell, manuell, ...).
 * Every stem below was verified against the full content corpus: it matches
 * only transliterations, never legitimate words.
 *
 * Policy: ids, flags, tags, placeholders ({kaemmerer}), usernames, hostnames
 * and paths are identifiers and stay ASCII. Lines that declare them are
 * skipped (ID_LINE); in-fiction terminal fixtures use lowercase ASCII
 * usernames (mueller) / hostnames (standort-sued), which the case-sensitive
 * entries below deliberately do not match.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// import.meta.dirname is native (Node 20.11+); fall back to the file URL only
// when it is absent and the URL is genuinely file-scheme (avoids the jsdom-run
// "URL must be of scheme file" throw).
const CONTENT_ROOT: string =
  import.meta.dirname ?? fileURLToPath(new URL('.', import.meta.url));

const STEMS = [
  'fuer', 'ueber', 'uebel', 'koenn', 'koenig', 'muess', 'muede', 'muehsam', 'muell(?!er\\b)', 'muendlich',
  'naechst', 'naechte', 'spaet', 'waehrend', 'waehl', 'waere', 'gaebe', 'gespraech', 'gespraeach',
  'staendig', 'staendnis', 'staendlich', 'vollstaendig', 'erklaer', 'erlaeuter', 'gaenger', 'natuerlich',
  'laechel', 'haeng', 'buero', 'buerger', 'zurueck', 'oeffn', 'oeffentlich', 'laesst', 'laedt',
  'laeuft', 'laengst', 'laenger', 'luefter', 'gehoer', 'hoer', 'schwaech', 'schlaeg', 'praesen',
  'praev', 'persoenlich', 'moeglich', 'moecht', 'haelfte', 'haelt', 'haette', 'haende', 'frueh',
  'faell', 'faehr', 'faehig', 'faeng', 'faelsch', 'stuetz', 'pruef', 'schluessel', 'loes', 'aehnlich',
  'aeltest', 'aendern', 'aktivitaet', 'traeume', 'kuendigung', 'fuehr', 'begruend', 'begruesst',
  'benoetigt', 'schaedig', 'beschaeftig', 'schraenkt', 'bestaetigt', 'bewaeltigt', 'beduerfnis',
  'befoerder', 'beilaeufig', 'beruehmt', 'beruehrt', 'drueck', 'duerfen', 'saetze', 'eintraege',
  'enthaelt', 'enttaeuscht', 'erfaehrst', 'erfuellt', 'erhoehen', 'erschoepft', 'erwaehn', 'erzaehl',
  'wuensch', 'geraet', 'geschaeft', 'schaetz', 'gewaehlt', 'gewoehn', 'glueck', 'groesse', 'groesser',
  'gruen', 'guenstig', 'haesslich', 'identitaet', 'integritaet', 'kapazitaet', 'kaelter', 'klaer',
  'kuehl', 'kuemmer', 'kuenftig', 'komplexitaet', 'schaeden', 'loyalitaet', 'luecke', 'lueg',
  'merkwuerdig', 'nervoe', 'plaene', 'plaetze', 'noetig', 'faelle', 'lueftung', 'flaech', 'betaeubend',
  'passwoerter', 'ploetzlich', 'prioritaet', 'produktivitaet', 'professionalitaet', 'quarantaene',
  'raech', 'raetst', 'schlaege', 'raeusper', 'rauesper', 'realitaet', 'maessig', 'rueck', 'schoen',
  'schuettel', 'schuetz', 'spuer', 'staerk', 'stoehnt', 'stoerung', 'stueck', 'stuerm', 'stuerz',
  'stuertzt', 'suess', 'bekaempfung', 'anschlaege', 'tatsaechlich', 'taeglich', 'temporaer',
  'traege', 'umstaende', 'populaer', 'veraendert', 'urspruenglich', 'aergert', 'veraeargert',
  'verbuendet', 'verdaechtig', 'verguetet', 'veroeffentlicht', 'schaerf', 'verschluessel', 'schraenk',
  'vertraege', 'verzoeger', 'wuerde', 'wuerdig', 'wuetend', 'wuehl', 'zaeh', 'zerstoert', 'zufaellig',
  'zugaenge', 'zustaendig', 'zusaetzlich', 'zuhoeren', 'gebueren', 'gebuehr', 'fuehl', 'fuell',
  'gefuehl', 'schluecks', 'gruesst', 'gruessst', 'woechentlich', 'abschluessen', 'tvoed', 'tuer',
  'solidaritaet', 'atmosphaere', 'zuverlaess', 'hoeflich', 'gaeste',
];
// Case-sensitive: display-text "Frau Mueller" is a defect, ASCII username
// 'admin.mueller' / hostname 'standort-sued' are not.
const CASE_SENSITIVE = [/\bMueller\b/, /\bSued\b/];
// Identifier declarations stay ASCII by policy. `image` is a path to a real
// file on disk (client/public/images/**) whose German name is ASCII by
// convention (…-uebergabe-…, …-buero-…) and must not be "corrected".
const ID_LINE =
  /^\s*(id|eventId|characterId|tags|setsFlags|requiresFlags|username|currentPath|hostname|image):/;

const BLACKLIST = new RegExp(`(${STEMS.join('|')})`, 'i');
const WORD = /\b[A-Za-z]*(?:ae|oe|ue)[a-zA-Z]*\b/g;

function* tsFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) yield* tsFiles(p);
    else if (p.endsWith('.ts') && !p.endsWith('.test.ts')) yield p;
  }
}

describe('German orthography', () => {
  it('display text contains no ASCII-transliterated umlauts', () => {
    const offenders: string[] = [];
    for (const file of tsFiles(CONTENT_ROOT)) {
      const rel = relative(CONTENT_ROOT, file);
      readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
        if (ID_LINE.test(line)) return;
        for (const word of line.match(WORD) ?? []) {
          if (BLACKLIST.test(word) || CASE_SENSITIVE.some((r) => r.test(word))) {
            offenders.push(`${rel}:${i + 1} "${word}"`);
          }
        }
      });
    }
    expect(
      offenders,
      `${offenders.length} ASCII-transliterated umlaut(s) found — use ä/ö/ü/ß in display text ` +
        `(ids/flags/tags stay ASCII). If a word is a legitimate false positive, extend the ` +
        `whitelist reasoning in this file's header instead of deleting the stem.\n` +
        offenders.slice(0, 40).join('\n')
    ).toEqual([]);
  });
});
