# Content Hygiene (Umlauts + Thomas→Jens Rename Debt) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate two content-hygiene defect classes — 915 ASCII-transliterated umlauts (`fuer`→`für`, …) in 13 content files, and 15 leftover `thomas` ids/flags from the Thomas→Jens character rename — and lock both in with permanent guard tests.

**Architecture:** Game content lives as TypeScript data files under `client/src/content/`, typed against `shared/src/types/`. Two new guard tests are added next to the existing content guards (`client/src/content/content.test.ts` pattern): a file-scanning orthography test and a structured adventure-naming test. The fixes themselves are pure data edits — no engine code changes, no save migration (justified in Task 5).

**Tech Stack:** TypeScript, vitest (config at `client/vitest.config.ts`, jsdom env, `@kritis/shared` aliased to `shared/src`), Node `fs` for the file-scanning test, npm workspaces monorepo.

---

## Verified research summary (read this first)

All numbers below were verified against the repo on 2026-07-10.

### Defect 1 — transliterated umlauts

**915 transliteration hits in 13 files**, all in player-facing display text (`description`, `resultText`, `text`, `consequence`, comments). Per file:

| File | Hits |
|---|---|
| `client/src/content/events/week2-4.ts` | 210 |
| `client/src/content/events/story/conditional-events.ts` | 95 |
| `client/src/content/events/story/story-week9-12.ts` | 79 |
| `client/src/content/events/story/random-events.ts` | 76 |
| `client/src/content/events/story/story-week1-2.ts` | 72 |
| `client/src/content/events/story/story-week7-10.ts` | 67 |
| `client/src/content/events/story/story-week3-5.ts` | 62 |
| `client/src/content/events/story/story-week5-8.ts` | 60 |
| `client/src/content/events/chains/security-chain.ts` | 52 |
| `client/src/content/events/chains/trust-chain.ts` | 43 |
| `client/src/content/events/chains/colleague-chain.ts` | 40 |
| `client/src/content/events/chains/documentation-chain.ts` | 31 |
| `client/src/content/events/chains/patch-chain.ts` | 28 |

Five of these mix both styles internally (proper umlauts AND transliterations): `trust-chain.ts`, `story-week3-5.ts`, `story-week5-8.ts`, `story-week7-10.ts`, `story-week9-12.ts`.

**Policy decision (documented in Task 7): ids, flags, tags, placeholders, usernames, hostnames and paths stay ASCII — they are identifiers.** Only player-facing strings get proper umlauts. Concretely, these are legitimate and must NOT be flagged or changed:

- `kaemmerer` — character id (`adventure/index.ts:95`), relationship key (`shared/src/types/gameState.ts:9`), `{kaemmerer}` text placeholder (e.g. `events/week19-24.ts:241`), tag (`packs/internal/scenarios.ts:53`). 239 occurrences, all identifier-by-design.
- tag `'passwoerter'` in `events/week13-18.ts:841`.
- usernames `admin.mueller` / `mueller` in `packs/amse-it/scenarios.ts:49-50,436-437` and log fixture `events/tutorials.ts:236-239`.
- hostname `standort-sued` in `packs/amse-it/scenarios.ts:644`.
- English/technical vocabulary containing `ae/oe/ue` (`queue`, `value`, `true`, `request`, `colleague`, `Bluetooth`, `Bluescreen`, `daemon`, `sidequest`, …) and genuine German `aue`/`eue`/`que` sequences (`bauen`, `schauen`, `Dauer`, `neue`, `teuer`, `Feuer`, `Steuer`, `Vertrauen`, `zuerst`, `bequem`, `Quelle`, `aktuell`, `manuell`, `Koexistenz`, `Klimaeinheit`, …).

Because of these, the guard must be a **curated word-boundary/stem blacklist, not a blanket `ae/oe/ue` scan**. The stem list in Task 1 was verified against the full corpus vocabulary (625 distinct `ae/oe/ue` words): **0 false positives on legitimate vocabulary, 0 missed transliterations**.

### Defect 2 — Thomas→Jens rename debt

The story character formerly named Thomas was renamed in display text, but ids/flags kept `thomas`. Twist: the display text shows the `thomas`-named identifiers now map to **three different characters** (Jens, Henry, Bjorg) — the rename must follow the display text, not blanket-replace to `jens`. All 15 identifier occurrences (verified — these are ALL of them; every other `Thomas` in the repo is Telekom NPC Thomas Kellermann or kritis-infra NPC Thomas Bergmann, both legitimate separate characters, out of scope):

| File:Line | Old identifier | New identifier | Display-text character |
|---|---|---|---|
| `client/src/content/adventure/index.ts:60` | character `id: 'thomas'` | `'bjorg'` | name field is already `'Bjorg'` |
| `client/src/content/adventure/chapters.ts:97` | beat `eventId: 'adv_thomas_confession'` | `'adv_jens_confession'` | chapter text says "Jens gesteht" |
| `client/src/content/adventure/story-events.ts:185` | choice `id: 'tell_thomas'` | `'tell_jens'` | label: "Jens anrufen und ihm davon erzählen" (line 186) |
| `client/src/content/adventure/story-events.ts:189` | flags `'thomas_knows', 'thomas_worried'` | `'jens_knows', 'jens_worried'` | resultText is about Jens |
| `client/src/content/adventure/story-events.ts:307` | flag `'doubted_thomas'` | `'doubted_jens'` | resultText: "Jens' Gesicht…" |
| `client/src/content/adventure/story-events.ts:314` | flag `'thomas_partner'` | `'jens_partner'` | sits next to existing `'jens_ally'` — no collision |
| `client/src/content/adventure/story-events.ts:624` | choice `id: 'ask_thomas'` | `'ask_jens'` | label: "Jens, du kanntest Stefan…" |
| `client/src/content/adventure/story-events.ts:628` | flag `'thomas_helped'` | `'jens_helped'` | |
| `client/src/content/adventure/story-events.ts:773` | event `id: 'adv_thomas_confession'` | `'adv_jens_confession'` | title: "Jens' Geständnis" |
| `client/src/content/adventure/sidequest-events.ts:83` | choice `id: 'call_thomas'` | `'call_henry'` | label: "**Henry** anrufen. Um Mitternacht." |
| `client/src/content/adventure/sidequest-events.ts:87` | flag `'printer_thomas_joined'` | `'printer_henry_joined'` | Henry shows up |
| `client/src/content/adventure/sidequest-events.ts:162` | choice `id: 'ask_thomas'` | `'ask_bjorg'` | label: "**Bjorg** fragen, wie das Netz…" |
| `client/src/content/adventure/sidequest-events.ts:166` | flag `'network_asked_thomas'` | `'network_asked_bjorg'` | |
| `client/src/content/adventure/sidequest-events.ts:271` | choice `id: 'show_thomas'` | `'show_jens'` | label: "**Jens** das Bewegungsprofil zeigen" |
| `client/src/content/adventure/sidequest-events.ts:275` | flag `'coffee_thomas_told'` | `'coffee_jens_told'` | |

### Save-game impact — DECISION: option (b), full rename, no migration shim, no version bump

Persistence facts (verified):

- **Manual saves** (`client/src/hooks/useSaveLoad.ts`): `SaveSlot` (lines 12–19) stores raw `GameState` under `localStorage['kritis_saves_<playerId>']`. **No version field at all** — old saves load unchanged.
- **Autosave** (`client/src/engine/autosave.ts`): versioned envelope, `AUTOSAVE_VERSION = 1` (line 10), strict-equality check at line 56 → mismatched version is **discarded** on load. So a version bump exists as a mechanism, but bumping would wipe every player's autosave.
- **What GameState persists**: `completedEvents: string[]` (`shared/src/types/gameState.ts:40`), `flags: Record<string, boolean>` (line 42), `decisions[].eventId/choiceId` (lines 14–21), `storyState: AdventureState` with `currentBeatIndex` (`shared/src/types/adventure.ts:152`).

Why the rename is **free even for mid-story in-progress saves** — every persisted old identifier is inert:

1. **The `thomas_*` flags are write-only.** A project-wide grep for `thomas_knows|thomas_worried|thomas_partner|thomas_helped|doubted_thomas|printer_thomas_joined|network_asked_thomas|coffee_thomas_told` finds only the `setsFlags` writers in the two content files — **zero readers** in any `requires.flags`, `branchCondition`, `triggerCondition`, `requiredFlags`, or engine code. An old save carrying `flags.thomas_knows = true` simply carries a dead key.
2. **Story progress is index-based, not id-based.** `client/src/engine/adventureEngine.ts:76,102` resolve the current beat as `chapter.storyBeats[state.storyState.currentBeatIndex]` and re-resolve the event definition fresh from content on every render (`findContent(currentBeat.eventId, …)`, line 139). A save sitting on ch05 beat02 resumes into the renamed `adv_jens_confession` seamlessly. `completedEvents` is only ever used as `.length` for sidequest seeding (line 164) — a stale `'adv_thomas_confession'` entry is never looked up.
3. **`decisions[].choiceId` is historical record only.** `client/src/engine/runSummary.ts:90` iterates decision *tags*; nothing resolves adventure choice ids after the fact. `pendingChainEvents` stores chain-event ids from `events/chains/`, never adventure ids.
4. Choice ids `tell_thomas`/`ask_thomas`/etc. are not referenced by any `unlocksDialogue` entry (grep verified).

Option (a) — a load-time shim mapping `thomas_knows → jens_knows` etc. — would add permanent code to migrate keys **that nothing reads**. Rejected: pure dead weight. We also do **not** bump `AUTOSAVE_VERSION`, because nothing breaks and a bump would needlessly destroy autosaves.

### Test commands

- Single file: `cd /Users/timoklinge/Projekte/kritis_game/client && npx vitest run src/content/orthography.test.ts`
- Full suite: `cd /Users/timoklinge/Projekte/kritis_game && npm test` (builds `shared`, then vitest over the workspace)

---

## Task 0: Branch

**Files:** none.

1. Create a working branch (repo is on `main`, status clean):
   ```bash
   cd /Users/timoklinge/Projekte/kritis_game && git checkout -b chore/content-hygiene
   ```
   Note: Tasks 1 and 5 intentionally commit red guard tests; the branch is only merged after Task 7 when everything is green.

## Task 1: Orthography guard test (red)

**Files:**
- Create: `client/src/content/orthography.test.ts`
- Test: itself.

**Step 1.1 — write the failing test** (complete code; the stem list is the corpus-verified one — do not trim it):

```typescript
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

const CONTENT_ROOT = fileURLToPath(new URL('.', import.meta.url));

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
// Identifier declarations stay ASCII by policy.
const ID_LINE =
  /^\s*(id|eventId|characterId|tags|setsFlags|requiresFlags|username|currentPath|hostname):/;

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
```

**Step 1.2 — run it, see it fail:**
```bash
cd /Users/timoklinge/Projekte/kritis_game/client && npx vitest run src/content/orthography.test.ts
```
Expected: 1 failed test, assertion message reporting **915** offenders (exact count as of 2026-07-10; small drift is fine if content changed) spanning the 13 files listed in the research summary — and ONLY those 13 files. If any `packs/`, `tutorials.ts`, or `week13-18.ts` line appears, a stem is over-matching an identifier — stop and fix the stem before proceeding.

**Step 1.3 — commit the red test:**
```bash
cd /Users/timoklinge/Projekte/kritis_game && git add client/src/content/orthography.test.ts && git commit -m "test(content): orthography guard — no ASCII-transliterated umlauts (red until sweep lands)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

## Task 2: Sweep script + first content area (events/week2-4.ts)

**Files:**
- Create (scratchpad, NOT committed): `<scratchpad>/umlaut-sweep.mjs`
- Modify: `client/src/content/events/week2-4.ts` (210 hits)
- Test: `client/src/content/orthography.test.ts` (partial progress), full suite.

**Step 2.1 — write the sweep script** in your scratchpad directory (it must never be committed). It reuses the test's stems mechanically (ae→ä, oe→ö, ue→ü, case-preserving) with a specials map applied FIRST for the ß-words and known typos:

```javascript
// umlaut-sweep.mjs — usage: node umlaut-sweep.mjs <file> [<file> ...]
import { readFileSync, writeFileSync } from 'node:fs';

// Word-level specials (checked before mechanical stem replacement):
// ß-words, missing letters, and outright typos found in the corpus.
const SPECIALS = [
  ['gruessst', 'grüßt'], ['begruesst', 'begrüßt'], ['gruesst', 'grüßt'],
  ['maessig', 'mäßig'],                       // regelmaessig → regelmäßig etc.
  ['groesser', 'größer'], ['groesse', 'größe'], ['suess', 'süß'],
  ['gebueren', 'gebühren'],                   // Abfallgebuerenberechnung: missing h
  ['stuertzt', 'stürzt'],                     // typo (extra t)
  ['rauesper', 'räusper'],                    // typo (digraph reordered)
  ['veraeargert', 'verärgert'],               // typo (double a)
  ['gespraeach', 'gespräch'],                 // typo: Feedbackgespraeach
  ['nervoees', 'nervös'], ['nervoes', 'nervös'],
  ['schlueckst', 'schluckst'],                // hyper-correction: schlucken has no umlaut
  ['TVoeD', 'TVöD'],
];
// Mechanical stems — keep in sync with orthography.test.ts STEMS, minus the
// specials above and minus 'muell(?!er\b)' (handled below).
const STEMS = [
  'fuer','ueber','uebel','koenn','koenig','muess','muede','muehsam','muendlich','naechst','naechte',
  'spaet','waehrend','waehl','waere','gaebe','gespraech','staendig','staendnis','staendlich',
  'vollstaendig','erklaer','erlaeuter','gaenger','natuerlich','laechel','haeng','buero','buerger',
  'zurueck','oeffn','oeffentlich','laesst','laedt','laeuft','laengst','laenger','luefter','gehoer',
  'hoer','schwaech','schlaeg','praesen','praev','persoenlich','moeglich','moecht','haelfte','haelt',
  'haette','haende','frueh','faell','faehr','faehig','faeng','faelsch','stuetz','pruef','schluessel',
  'loes','aehnlich','aeltest','aendern','aktivitaet','traeume','kuendigung','fuehr','begruend',
  'benoetigt','schaedig','beschaeftig','schraenkt','bestaetigt','bewaeltigt','beduerfnis','befoerder',
  'beilaeufig','beruehmt','beruehrt','drueck','duerfen','saetze','eintraege','enthaelt','enttaeuscht',
  'erfaehrst','erfuellt','erhoehen','erschoepft','erwaehn','erzaehl','wuensch','geraet','geschaeft',
  'schaetz','gewaehlt','gewoehn','glueck','gruen','guenstig','haesslich','identitaet','integritaet',
  'kapazitaet','kaelter','klaer','kuehl','kuemmer','kuenftig','komplexitaet','schaeden','loyalitaet',
  'luecke','lueg','merkwuerdig','plaene','plaetze','noetig','faelle','lueftung','flaech','betaeubend',
  'ploetzlich','prioritaet','produktivitaet','professionalitaet','quarantaene','raech','raetst',
  'schlaege','realitaet','rueck','schoen','schuettel','schuetz','spuer','staerk','stoehnt','stoerung',
  'stueck','stuerm','stuerz','bekaempfung','anschlaege','tatsaechlich','taeglich','temporaer',
  'traege','umstaende','populaer','veraendert','urspruenglich','aergert','verbuendet','verdaechtig',
  'verguetet','veroeffentlicht','schaerf','verschluessel','schraenk','vertraege','verzoeger','wuerde',
  'wuerdig','wuetend','wuehl','zaeh','zerstoert','zufaellig','zugaenge','zustaendig','zusaetzlich',
  'zuhoeren','gebuehr','fuehl','fuell','gefuehl','woechentlich','abschluessen','tuer','solidaritaet',
  'atmosphaere','zuverlaess','hoeflich','gaeste','muell(?!er\\b)',
];
const umlautify = (s) => s
  .replace(/ae/g, 'ä').replace(/oe/g, 'ö').replace(/ue/g, 'ü')
  .replace(/Ae/g, 'Ä').replace(/Oe/g, 'Ö').replace(/Ue/g, 'Ü');
const matchCase = (matched, repl) =>
  matched[0] === matched[0].toUpperCase()
    ? repl[0].toUpperCase() + repl.slice(1)
    : repl;
// Longest-first so e.g. 'gespraeach' wins over 'gespraech'.
const RULES = [
  ...SPECIALS,
  ...STEMS.map((s) => [s, umlautify(s.replace('(?!er\\b)', ''))]),
].sort((a, b) => b[0].length - a[0].length);
const ID_LINE =
  /^\s*(id|eventId|characterId|tags|setsFlags|requiresFlags|username|currentPath|hostname):/;

for (const file of process.argv.slice(2)) {
  const out = readFileSync(file, 'utf8').split('\n').map((line) => {
    if (ID_LINE.test(line)) return line; // identifiers stay ASCII
    let l = line;
    for (const [pat, repl] of RULES) {
      l = l.replace(new RegExp(pat.replace('(?!er\\b)', '(?!er\\b)'), 'gi'),
        (m) => matchCase(m, repl));
    }
    return l;
  }).join('\n');
  writeFileSync(file, out);
  console.log('swept', file);
}
```

**Step 2.2 — sweep the first area and review manually:**
```bash
node <scratchpad>/umlaut-sweep.mjs /Users/timoklinge/Projekte/kritis_game/client/src/content/events/week2-4.ts
cd /Users/timoklinge/Projekte/kritis_game && git diff client/src/content/events/week2-4.ts | head -200
```
Manual review checklist (this is a review pass, not a rubber stamp — read the whole diff):
- Only display-text lines changed; no `id:`/`tags:`/`setsFlags:` lines in the diff.
- No `{kaemmerer}` placeholder was touched.
- Spot-check ß words (`regelmäßig`, `grüßt`) and typo fixes read as correct German.
- Watch for compound-word artifacts (a legit `aue`/`eue` inside a blacklist-matched word being wrongly converted — none exist in today's corpus, but the script is mechanical).

**Step 2.3 — verify progress and no regressions:**
```bash
cd /Users/timoklinge/Projekte/kritis_game/client && npx vitest run src/content/orthography.test.ts 2>&1 | grep -oE '[0-9]+ ASCII-transliterated'
cd /Users/timoklinge/Projekte/kritis_game && npm test
```
Expected: orthography offender count drops from 915 to ~705 and `week2-4.ts` no longer appears in the list; the REST of the suite passes (only orthography.test.ts red). If any other test broke, a content string that a test asserts on changed — investigate before committing.

**Step 2.4 — commit:**
```bash
cd /Users/timoklinge/Projekte/kritis_game && git add client/src/content/events/week2-4.ts && git commit -m "fix(content): restore proper umlauts in week2-4 events

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

## Task 3: Sweep story events (7 files)

**Files:**
- Modify: `client/src/content/events/story/conditional-events.ts`, `random-events.ts`, `story-week1-2.ts`, `story-week3-5.ts`, `story-week5-8.ts`, `story-week7-10.ts`, `story-week9-12.ts`
- Test: `client/src/content/orthography.test.ts`, full suite.

**Step 3.1 — sweep:**
```bash
cd /Users/timoklinge/Projekte/kritis_game/client/src/content/events/story && node <scratchpad>/umlaut-sweep.mjs conditional-events.ts random-events.ts story-week1-2.ts story-week3-5.ts story-week5-8.ts story-week7-10.ts story-week9-12.ts
```

**Step 3.2 — manual review, file by file** (`git diff` per file, same checklist as 2.2). Extra attention in this area:
- `random-events.ts:77` "Schluessel: Bei Frau Mueller" → must become "Schlüssel: Bei Frau Müller" (the `Mueller` case-sensitive rule is exercised here; the sweep script does NOT handle `Mueller` — fix the display-name instances by hand: `grep -n 'Mueller' *.ts`, expected 5 hits across `random-events.ts` and `story-week1-2.ts`).
- `story-week9-12.ts` contains `TVoeD` → `TVöD` (script special) — verify it.

**Step 3.3 — verify:** same commands as 2.3. Expected: offender count drops to ~194; only the 5 chain files remain in the failure list.

**Step 3.4 — commit:**
```bash
cd /Users/timoklinge/Projekte/kritis_game && git add client/src/content/events/story && git commit -m "fix(content): restore proper umlauts in story events

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

## Task 4: Sweep chain events (5 files) — orthography guard goes green

**Files:**
- Modify: `client/src/content/events/chains/security-chain.ts`, `trust-chain.ts`, `colleague-chain.ts`, `documentation-chain.ts`, `patch-chain.ts`
- Test: `client/src/content/orthography.test.ts`, full suite.

**Step 4.1 — sweep:**
```bash
cd /Users/timoklinge/Projekte/kritis_game/client/src/content/events/chains && node <scratchpad>/umlaut-sweep.mjs security-chain.ts trust-chain.ts colleague-chain.ts documentation-chain.ts patch-chain.ts
```

**Step 4.2 — manual review** per file (same checklist). `trust-chain.ts` already had 1 proper-umlaut line — confirm the file now reads uniformly.

**Step 4.3 — run the guard, see it PASS, then the full suite:**
```bash
cd /Users/timoklinge/Projekte/kritis_game/client && npx vitest run src/content/orthography.test.ts
cd /Users/timoklinge/Projekte/kritis_game && npm test
```
Expected: orthography test green (0 offenders); full suite green. Also do a final belt-and-braces broad scan for anything the blacklist missed and eyeball the (expected ~625-line, all-legitimate) output:
```bash
cd /Users/timoklinge/Projekte/kritis_game/client/src/content && grep -rhoE '\b[A-Za-z]*(ae|oe|ue)[a-zA-Z]*\b' --include='*.ts' . | sort -u | grep -viE 'que|aue|eue|value|blue|clue|continue|colleague|sidequest|dialogue|issue|steuer|epilogue|kaemmerer|zuerst|aktuell|manuell|virtuell|individuell|eventuell'
```
Any German-looking word in that residue that is a transliteration → add a stem to the test AND fix the text, then re-run.

**Step 4.4 — commit:**
```bash
cd /Users/timoklinge/Projekte/kritis_game && git add client/src/content/events/chains && git commit -m "fix(content): restore proper umlauts in chain events — orthography guard green

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

## Task 5: Adventure naming guard test (red)

**Files:**
- Create: `client/src/content/adventure/naming.test.ts`
- Test: itself.

**Step 5.1 — write the failing test.** Structured (imports the content), not text-scanning, so the legitimate Telekom NPC `TELEKOM-THOMAS` (`packs/telekom/npcs.ts:5`) and kritis-infra's "Thomas Bergmann" display text can never false-positive:

```typescript
/**
 * Naming guard: the story character formerly called "Thomas" was renamed
 * (Jens/Henry/Bjorg, see git history) — display text was updated but ids and
 * flags lagged behind. This test pins the completed rename: no adventure
 * identifier (event id, choice id, flag, beat ref, character id, sidequest
 * ref) may reference the dead name.
 *
 * Save-compat note (verified 2026-07-10): renaming these identifiers needs no
 * save migration. thomas_* flags have zero readers (write-only), story
 * progress resumes via storyState.currentBeatIndex (adventureEngine.ts:76)
 * with event ids re-resolved from content, and completedEvents/decisions are
 * never looked up by adventure id. AUTOSAVE_VERSION stays at 1 on purpose.
 *
 * NOT in scope: 'TELEKOM-THOMAS' (Thomas Kellermann, telekom pack) and
 * 'Thomas Bergmann' (kritis-infra pack) are different, legitimate characters.
 */
import { describe, it, expect } from 'vitest';
import { adventureStoryEvents } from './story-events';
import { adventureSidequestEvents } from './sidequest-events';
import { adventureChapters } from './chapters';
import { adventureSidequests } from './sidequests';
import { STORY_CHARACTERS } from './index';

function collectIdentifiers(): string[] {
  const ids: string[] = [];
  for (const e of [...adventureStoryEvents, ...adventureSidequestEvents]) {
    ids.push(`event:${e.id}`);
    for (const f of e.requires?.flags ?? []) ids.push(`event:${e.id} requires.flag:${f}`);
    for (const req of e.requires?.events ?? []) ids.push(`event:${e.id} requires.event:${req}`);
    for (const c of e.choices) {
      ids.push(`event:${e.id} choice:${c.id}`);
      for (const f of c.setsFlags ?? []) ids.push(`event:${e.id} choice:${c.id} setsFlag:${f}`);
      if (c.triggersEvent) ids.push(`event:${e.id} choice:${c.id} triggers:${c.triggersEvent}`);
    }
  }
  for (const ch of adventureChapters) {
    ids.push(`chapter:${ch.id}`);
    for (const b of ch.storyBeats) {
      ids.push(`chapter:${ch.id} beat:${b.id} event:${b.eventId}`);
      if (b.branchCondition) ids.push(`chapter:${ch.id} beat:${b.id} branch:${b.branchCondition}`);
      if (b.alternateEventId) ids.push(`chapter:${ch.id} beat:${b.id} altEvent:${b.alternateEventId}`);
    }
    for (const f of ch.unlockConditions.requiredFlags ?? []) ids.push(`chapter:${ch.id} requiredFlag:${f}`);
  }
  for (const sq of adventureSidequests) {
    ids.push(`sidequest:${sq.id}`);
    for (const ev of sq.events) ids.push(`sidequest:${sq.id} event:${ev}`);
    for (const f of sq.triggerCondition.flags ?? []) ids.push(`sidequest:${sq.id} trigger.flag:${f}`);
    for (const f of sq.rewards.flags ?? []) ids.push(`sidequest:${sq.id} reward.flag:${f}`);
    for (const u of sq.storyEffects?.unlocksDialogue ?? []) {
      ids.push(`sidequest:${sq.id} unlocks:${u.eventId}/${u.optionId}`);
    }
  }
  for (const c of STORY_CHARACTERS) ids.push(`character:${c.id}`);
  return ids;
}

describe('Adventure identifier naming', () => {
  it('no id or flag references the pre-rename character name "thomas"', () => {
    const offenders = collectIdentifiers().filter((s) => /thomas/i.test(s));
    expect(
      offenders,
      'Thomas was renamed (Jens/Henry/Bjorg). Rename these identifiers too:\n' +
        offenders.join('\n')
    ).toEqual([]);
  });
});
```

**Step 5.2 — run it, see it fail:**
```bash
cd /Users/timoklinge/Projekte/kritis_game/client && npx vitest run src/content/adventure/naming.test.ts
```
Expected: 1 failed test listing **17 flagged identifiers** (1 event id + 1 beat eventId + 5 choice ids + 9 flags + 1 character id — the 15 source lines from the research table; line 189 carries two flags).

**Step 5.3 — commit the red test:**
```bash
cd /Users/timoklinge/Projekte/kritis_game && git add client/src/content/adventure/naming.test.ts && git commit -m "test(adventure): naming guard — no thomas-era ids/flags (red until rename lands)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

## Task 6: Mechanical rename (Thomas → Jens/Henry/Bjorg)

**Files:**
- Modify: `client/src/content/adventure/index.ts:60`, `chapters.ts:97`, `story-events.ts:185,189,307,314,624,628,773`, `sidequest-events.ts:83,87,162,166,271,275`
- Test: `client/src/content/adventure/naming.test.ts`, full suite.

**Step 6.1 — pre-flight collision check** (must print nothing):
```bash
cd /Users/timoklinge/Projekte/kritis_game/client/src/content/adventure && grep -nE "'(adv_jens_confession|tell_jens|ask_jens|jens_knows|jens_worried|doubted_jens|jens_partner|jens_helped|call_henry|printer_henry_joined|ask_bjorg|network_asked_bjorg|show_jens|coffee_jens_told|bjorg)'" *.ts
```
(`jens_ally` at `story-events.ts:314` already exists and stays — `jens_partner` is a distinct new name.)

**Step 6.2 — apply the exact renames from the research table.** Every occurrence is a quoted string; use Edit per site, or verify-then-sed. The complete old→new map (apply per file):

- `index.ts`: `id: 'thomas',` → `id: 'bjorg',` (line 60; the `name: 'Bjorg'` on the next line already matches).
- `chapters.ts` + `story-events.ts`: `adv_thomas_confession` → `adv_jens_confession` (2 sites).
- `story-events.ts`: `tell_thomas`→`tell_jens`, `thomas_knows`→`jens_knows`, `thomas_worried`→`jens_worried`, `doubted_thomas`→`doubted_jens`, `thomas_partner`→`jens_partner`, `ask_thomas`→`ask_jens`, `thomas_helped`→`jens_helped`.
- `sidequest-events.ts`: `call_thomas`→`call_henry`, `printer_thomas_joined`→`printer_henry_joined`, `ask_thomas`→`ask_bjorg`, `network_asked_thomas`→`network_asked_bjorg`, `show_thomas`→`show_jens`, `coffee_thomas_told`→`coffee_jens_told`.

**Step 6.3 — verify nothing was missed** (must print nothing):
```bash
grep -rniE 'thomas' /Users/timoklinge/Projekte/kritis_game/client/src/content/adventure
```

**Step 6.4 — run the guard, see it PASS, then the full suite** (campaign guards `engine/campaignConsistency.test.ts` and `engine/campaignPacing.test.ts` walk every beat — they prove `adv_jens_confession` still resolves):
```bash
cd /Users/timoklinge/Projekte/kritis_game/client && npx vitest run src/content/adventure/naming.test.ts
cd /Users/timoklinge/Projekte/kritis_game && npm test
```
Expected: both green.

**Step 6.5 — commit:**
```bash
cd /Users/timoklinge/Projekte/kritis_game && git add client/src/content/adventure && git commit -m "fix(adventure): rename thomas-era ids/flags to jens/henry/bjorg

No save migration needed: thomas_* flags are write-only, beat progress is
index-based (currentBeatIndex) with event ids re-resolved from content, and
completedEvents/decisions are never looked up by adventure id. AUTOSAVE_VERSION
intentionally unchanged.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

## Task 7: Document both rules for future authors

**Files:**
- Modify: `docs/CONTENT_INVENTORY.md` — "## Guards (authoritative)" section (line 76).

**Step 7.1 — add the two new guards to the list and a short policy note.** Append to the guard bullet list (after the `sidequestFlow.test.ts` bullet):

```markdown
- `content/orthography.test.ts` — display text uses real umlauts (ä/ö/ü/ß), never
  ASCII transliterations (`fuer`, `ueber`, …). Curated stem blacklist, not a blanket
  ae/oe/ue scan. **Policy: ids, flags, tags, `{placeholder}` keys, usernames,
  hostnames and paths stay ASCII** (they are identifiers — e.g. `kaemmerer`,
  tag `passwoerter`, username `admin.mueller`); only player-facing strings carry
  umlauts. New legit ae/oe/ue vocabulary never trips it; a new transliterated word
  may need a new stem — add it to the test when you spot one.
- `content/adventure/naming.test.ts` — no adventure id/flag references the
  pre-rename character name "thomas" (renamed to Jens/Henry/Bjorg; ids/flags were
  renamed 2026-07 without a save migration — flags were write-only and story
  progress is beat-index-based). `TELEKOM-THOMAS` and "Thomas Bergmann" are
  different characters and out of scope.
```

**Step 7.2 — verify + final full run:**
```bash
cd /Users/timoklinge/Projekte/kritis_game && npm test
```
Expected: all green.

**Step 7.3 — commit:**
```bash
cd /Users/timoklinge/Projekte/kritis_game && git add docs/CONTENT_INVENTORY.md && git commit -m "docs(content): document orthography + adventure-naming guards

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

Then merge `chore/content-hygiene` per the finishing-a-development-branch skill (suite is green from Task 6 onward; Tasks 1–4 are red on the orthography test by design).
