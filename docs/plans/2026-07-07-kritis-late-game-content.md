# KRITIS Late-Game Content Wave Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fill the KRITIS-mode content desert in weeks 13–24 (60 play days with almost no eligible events today) with ~53 new pool events, a NIS2-Nachaudit arc, and 2 new red-thread chains — guarded by new pacing tests that assert the pool can never run dry.

**Architecture:** Content-only wave plus tests. New event files `week13-18.ts` / `week19-24.ts` follow the exact `GameEvent` shape used by `week9-12.ts`; KRITIS-only NIS2 events extend `kritis-special.ts` (gated via the `kritis_mode` flag that `createInitialState` sets for KRITIS runs); two new chain files follow the `backup-chain.ts` pattern (mode-scoped start event → `chainTriggers` on choices → `isChainEvent` consequences). A new guard test `kritisLatePacing.test.ts` drives the authoring TDD-style: first a static per-week pool assertion (fails on the current codebase), then a realistic 24-week day-loop simulation (adapted from `chainFlowDensity.test.ts`) asserting zero dead days in weeks 13–24.

**Tech Stack:** TypeScript (npm workspaces: `client`/`server`/`shared`), Vitest 4, `GameEvent` type from `@kritis/shared`. No engine changes needed — `eventEngine.ts` already filters by `weekRange`, and existing audits (`flowBalanceAudit`, `skillBalanceAudit`, `chainPacingAudit`, `chainFlowDensity`, `chainIntegrity`) automatically include new events.

---

## Verified audit findings (re-checked 2026-07-07)

Verified against the current tree with a tsx one-liner over `allEvents`:

- KRITIS runs **24 weeks × 5 days = 120 days** (`shared/src/config/gameModes.ts`, `kritis.gameLength`), one scenario **or** event per day.
- **193 events total, 158 KRITIS-eligible** (no `requiredModes` or includes `'kritis'`).
- **151 of those cap at `weekRange[1] <= 12`.** Only **7** reach week 13+ — all in `kritis-special.ts`, and all but one are flag-gated chain-reaction events (`evt_nis2_audit_result`, `evt_chain_cooling_failure`, `evt_chain_server_damage`, `evt_chain_power_fluctuation`, `evt_chain_power_outage`, `evt_chain_cascade_attack`, `evt_chain_ransomware_spread`).
- **ZERO events start at week 13 or later** (`weekRange[0] >= 13`).
- Scenario pool: **42 scenarios** (`getAllScenarios()`), all difficulty ≤ 5 = all reachable in KRITIS; scenarios never repeat (`completedScenarios`), so they exhaust too. The day loop rolls scenario vs. event with `scenarioChance = min(0.5, 0.1 + (week-1)*0.05)` (see `chainFlowDensity.test.ts` for the faithful reproduction) — by week 9+ half the days want a scenario, but once the 42 run out, **every** late day needs an event.
- Selection: `client/src/engine/eventEngine.ts` — `getAvailableEvents` filters `weekRange` / `dayPreference` / `completedEvents` (never repeat) / `requiredModes` / `requires.{events,flags,skills}`; `selectNextEvent` serves at most **one chain consequence per week** (hard throttle) and returns `null` on an empty pool = a **dead day**.
- `createInitialState` (`client/src/engine/gameState.ts:52`) sets `flags: { kritis_mode: true }` for KRITIS mode — that is how `kritis-special.ts` events gate themselves.

**Math:** weeks 13–24 = 60 days. Existing supply: ~0 events + whatever scenarios survived weeks 1–12 (optimistically ~15–20). Target: **~50 new ungated pool events** (plan delivers 51 ungated + 8 gated/chain-consequence = 59 total).

## Design rules (MANDATORY for every event authored in this plan)

1. **Every event has ≥ 2 ungated options.** "Ungated" = no `requires`, no `hidden`, no `unlocks`. Skill-gated power options are welcome *on top*. `flowBalanceAudit.test.ts` fails the build if an event synthesizes the `__continue__` fallback at base state — do not fight that guard, satisfy it.
2. **Pure-flavor cards keep consequences out of stats.** A comic-relief/interstitial card (e.g. `evt_weihnachtsfeier_technik`) uses zero or near-zero effects (`stress: -2` at most). If a card changes stats meaningfully, it is a decision card and needs real, distinct options.
3. **Consequence text goes in `resultText`**, not in the option label. The option says what you *do*; the `resultText` says what *happens* — including numbers' narrative justification ("Der Kämmerer streicht dir dafür das Schulungsbudget").
4. **High-stakes choices get a real second reaction.** For crisis/high-stakes events the `resultText` must contain a second beat — a named character reacting, or a follow-up wired via `setsFlags`/`chainTriggers` — never just "es klappt / es klappt nicht". (See Example Event B below for the pattern.)
5. **Effect magnitudes** (match `week9-12.ts`; KRITIS multiplies by 1.3 at runtime — do NOT pre-inflate): skills +3…+8 (+10 exceptional), stress ±5…±25, compliance ±5…±15, relationships ±5…±20, budget ±500…±8000.
6. **Characters:** relationship keys are `chef, gf, kaemmerer, fachabteilung, kollegen` — but the text placeholder for the colleague is singular `{kollege}` (Bjorg) and `involvedCharacters` uses `'kollege'`. Use `{chef}` (Bert), `{kaemmerer}`, `{gf}`, `{fachabteilung}`, `{kollege}` placeholders in `description`/`resultText`.
7. **Chains:** mode-scope via `requiredModes` on the **start** event only; consequences get `isChainEvent: true`, `chainPriority: 12`, `probability: 1.0`, wide `weekRange` (the 1-chain/week throttle needs slack to reschedule). Keep chain themes distinct from existing chains (backup=ransomware-restore, patch, docs, trust, colleague, security, hardware, monitoring, offboarding, change) and from each other.
8. **Language:** German, du-Form, dry Amtsstuben-Humor ("The Office meets Mr. Robot"). Sample the voice from `client/src/content/events/week9-12.ts` and `chains/backup-chain.ts` before writing a single card.
9. **IDs:** globally unique, `evt_` prefix, snake_case. `chainIntegrity.test.ts` fails on dangling `targetEventId`s and orphaned `isChainEvent`s.

## Test commands (verified working)

```bash
# one-time per session (tests import the built shared package)
npm run build -w shared

# targeted test file (path relative to client/)
npx vitest run --root client src/engine/kritisLatePacing.test.ts

# full suite (root; builds shared first)
npm test
```

---

### Task 1: Failing guard test — static late-game pool

**Files:**
- Create: `client/src/engine/kritisLatePacing.test.ts`

**Step 1: Write the failing test**

Create `client/src/engine/kritisLatePacing.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { allEvents } from '../content/events';
import { GameEvent } from '@kritis/shared';

/**
 * Late-game pool guard for KRITIS mode (weeks 13-24).
 *
 * KRITIS runs 24 weeks; events never repeat and selectNextEvent returns null
 * (a dead, empty day) when the filtered pool is empty. This test asserts the
 * AUTHORED pool is big enough that weeks 13-24 cannot run dry. The realistic
 * day-loop simulation lives in the same file (added in a later task) and is
 * the behavioural counterpart; this static check is the fast authoring guard.
 */

// An event that can serve a "normal" KRITIS late-game day: eligible for the
// mode, not a chain consequence, not gated behind other events or flags
// (kritis_mode is always set in KRITIS mode, so it doesn't count as a gate).
function isUngatedKritisEvent(e: GameEvent): boolean {
  if (e.requiredModes && !e.requiredModes.includes('kritis')) return false;
  if (e.isChainEvent) return false;
  if (e.requires?.events?.length) return false;
  const gateFlags = (e.requires?.flags ?? []).filter((f) => f !== 'kritis_mode');
  if (gateFlags.length > 0) return false;
  if (e.requires?.skills && Object.keys(e.requires.skills).length > 0) return false;
  return true;
}

const LATE_WEEKS = Array.from({ length: 12 }, (_, i) => i + 13); // 13..24
// Each week has 5 days; require headroom above that so earlier consumption
// of wide-window events can't starve a week.
const MIN_UNGATED_POOL_PER_WEEK = 6;
// 60 late days minus a conservative scenario share still needs ~45 events.
const MIN_UNGATED_LATE_STARTERS = 45;

const ungated = allEvents.filter(isUngatedKritisEvent);
const coversWeek = (e: GameEvent, w: number) => e.weekRange[0] <= w && w <= e.weekRange[1];

describe('KRITIS late-game pool (weeks 13-24)', () => {
  it('at least 45 ungated events START in weeks 13-24 (fresh late-game supply)', () => {
    const lateStarters = ungated.filter((e) => e.weekRange[0] >= 13);
    expect(
      lateStarters.length,
      `only ${lateStarters.length} ungated events start in weeks 13-24: ` +
        lateStarters.map((e) => e.id).join(', ')
    ).toBeGreaterThanOrEqual(MIN_UNGATED_LATE_STARTERS);
  });

  it(`every late week has >= ${MIN_UNGATED_POOL_PER_WEEK} ungated events in range (pool > days/week)`, () => {
    const report = LATE_WEEKS.map((w) => {
      const pool = ungated.filter((e) => coversWeek(e, w));
      return { week: w, n: pool.length, ids: pool.map((e) => e.id) };
    });
    const thin = report.filter((r) => r.n < MIN_UNGATED_POOL_PER_WEEK);
    const table = report.map((r) => `  week ${r.week}: ${r.n} events`).join('\n');
    expect(thin, `weeks with a thin pool:\n${table}`).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm run build -w shared
npx vitest run --root client src/engine/kritisLatePacing.test.ts
```

Expected: **2 failed**. First assertion: `only 0 ungated events start in weeks 13-24 ... expected 0 to be greater than or equal to 45`. Second: every week 13–24 listed as thin (current counts are 0–3 per week; the only in-range events are flag-gated and thus excluded).

**Step 3: Do NOT commit yet.** The test stays red until Task 3 finishes; it is committed together with the content that turns it green (Task 3, Step 4). Keep the file in the working tree.

---

### Task 2: `week13-18.ts` — 25 events, "Konsolidierung unter Druck"

**Files:**
- Create: `client/src/content/events/week13-18.ts`
- Modify: `client/src/content/events/index.ts` (import + spread, after `week9to12Events`)
- Test: `client/src/engine/kritisLatePacing.test.ts` (from Task 1), `client/src/engine/flowBalanceAudit.test.ts` (existing, auto-covers new events)

**Step 1: Read the voice samples** (do not skip): `client/src/content/events/week9-12.ts` (first 3 events), `client/src/content/events/chains/backup-chain.ts`.

**Step 2: Create the file with this exact header and the 25 events below**

```typescript
import { GameEvent } from '@kritis/shared';

/**
 * Weeks 13-18: "Konsolidierung unter Druck" (KRITIS late game, first half).
 * Summer slump, patch debt, shadow IT, hiring, and the run-up to the NIS2
 * Nachaudit (the audit arc itself lives in kritis-special.ts).
 * No requiredModes: only KRITIS reaches week 13+, so weekRange is the gate —
 * these events are structurally invisible to every 12-week mode.
 */
export const week13to18Events: GameEvent[] = [
  // ... 25 events ...
];
```

Author all 25 events from this table. Every row: German title/description/resultTexts, `probability` 0.7–0.95, `involvedCharacters` matching the relationships column, `tags` including `'kritis'`, 3–4 choices obeying the Design Rules (≥2 ungated!). One-line premises are binding; embellish, don't replace.

| # | id | weekRange | dayPref | category | premise (one line) | skills / relationships exercised |
|---|----|-----------|---------|----------|--------------------|-----------------------------------|
| 1 | `evt_halbzeit_bilanz` | [13,13] | [1] | politics | {chef} braucht bis Freitag eine Halbjahresbilanz der IT für den Gemeinderat — was betonst du, was verschweigst du? | softSkills / chef, gf |
| 2 | `evt_urlaubsplanung_sommer` | [13,14] | — | team | Drei Urlaubsanträge für dieselben zwei Augustwochen, einer muss die Stellung halten | softSkills / kollegen |
| 3 | `evt_vpn_zertifikat_abgelaufen` | [13,14] | — | crisis | Das VPN-Zertifikat ist heute Nacht abgelaufen, der komplette Außendienst steht vor verschlossener Tür | netzwerk, troubleshooting / fachabteilung |
| 4 | `evt_serverraum_sommerhitze` | [13,15] | — | crisis | 34°C draußen, 31°C im Serverraum — die Klimaanlage ist für deutsche Sommer von 1998 dimensioniert | troubleshooting / kaemmerer |
| 5 | `evt_schatten_it_cloud` | [13,15] | — | security | Das Bauamt organisiert Bürgeranträge seit Monaten über ein privates Trello-Board | security, softSkills / fachabteilung — **fully written below (Example A)** |
| 6 | `evt_updates_stau` | [13,16] | — | support | Nach den Krisenmonaten: 214 offene Updates auf 40 Systemen, wo anfangen? | windows, linux / compliance |
| 7 | `evt_praktikant_erster_tag` | [14,15] | — | team | Ein 17-jähriger Schülerpraktikant steht im Serverraum und fragt, was ein Domänencontroller ist | softSkills / kollegen |
| 8 | `evt_wartungsvertrag_preiserhoehung` | [14,16] | — | budget | Der Wartungsvertrag für die Telefonanlage: +40%, "Marktanpassung" | softSkills / kaemmerer |
| 9 | `evt_windows10_eol_welle` | [14,16] | — | compliance | 28 Rechner laufen noch auf Windows 10 — Support-Ende in Sicht, Budget nicht | windows / kaemmerer, chef |
| 10 | `evt_phishing_gf_spear` | [14,16] | — | security | Täuschend echte Mail "vom Bürgermeister" an {gf}: dringende Überweisung, streng vertraulich | security, softSkills / gf |
| 11 | `evt_lizenz_audit_hersteller` | [15,17] | — | compliance | Ein Software-Hersteller kündigt ein Lizenz-Audit an — die Lizenzliste ist eine Excel von 2021 | compliance-Stat / kaemmerer |
| 12 | `evt_risikoanalyse_veraltet` | [15,17] | — | compliance | Die Risikoanalyse aus dem Frühjahr kennt weder die neuen Systeme noch die neuen Bedrohungen | security / chef |
| 13 | `evt_stellenausschreibung_it` | [15,17] | — | team | Die Nachbesetzung ist endlich freigegeben — aber Amtsschimmel-Stellentext vs. realistische Anforderungen | softSkills / chef, kaemmerer |
| 14 | `evt_drucker_aufstand` | [15,18] | — | absurd | Der Etagendrucker druckt seit Tagen unaufgefordert Seite 1 eines Bebauungsplans von 2009 (Comic Relief, flavor: Mini-Effekte) | troubleshooting / fachabteilung |
| 15 | `evt_notfalluebung_tabletop` | [16,17] | — | security | Erste Tabletop-Übung: "Ransomware am Freitagnachmittag" — wer spielt mit, wie ernst wird es? | security, softSkills / kollegen, chef |
| 16 | `evt_usv_batterien_eol` | [16,18] | — | support | Die USV meldet Batteriealter 6 Jahre — beim nächsten Stromausfall hält sie Minuten, nicht Stunden | troubleshooting / kaemmerer |
| 17 | `evt_dsgvo_auskunft` | [16,18] | — | compliance | Ein Bürger verlangt DSGVO-Auskunft über alle gespeicherten Daten — quer über 7 Fachverfahren | softSkills / fachabteilung |
| 18 | `evt_admin_passwort_zettel` | [16,18] | — | security | Das Domänen-Admin-Passwort kursiert auf einem laminierten (!) Zettel — Zeit für einen Passwort-Manager | security, windows / kollegen |
| 19 | `evt_awareness_schulung` | [17,18] | — | team | Du sollst die jährliche Security-Awareness-Schulung halten — vor 60 gelangweilten Verwaltungsmitarbeitern | softSkills / kollegen, fachabteilung |
| 20 | `evt_ot_netz_segmentierung` | [17,18] | — | security | Wasserwerk-Leittechnik und Büro-IT hängen im selben flachen Netz — Segmentierung jetzt oder nie | netzwerk, security / fachabteilung |
| 21 | `evt_haushalt_planung_folgejahr` | [17,18] | — | budget | Haushaltsplanung fürs Folgejahr: {kaemmerer} will Zahlen, du willst endlich Redundanz | softSkills / kaemmerer, chef |
| 22 | `evt_alarm_muedigkeit` | [17,18] | — | support | 3.000 Monitoring-Alerts pro Woche, 2.990 davon irrelevant — keiner schaut mehr hin | troubleshooting, security / kollegen |
| 23 | `evt_glasfaser_bagger` | [18,18] | — | crisis | Ein Bagger vor dem Rathaus, dann Stille auf der Standleitung — der Klassiker | netzwerk, troubleshooting / chef |
| 24 | `evt_kollege_burnout_signale` | [18,18] | — | personal | {kollege} macht seit Wochen Überstunden und Fehler — heute hat er den Backup-Job zweimal falsch konfiguriert | softSkills / kollegen |
| 25 | `evt_presseanfrage_sicherheit` | [18,18] | — | politics | Die Lokalzeitung fragt an: "Wie sicher ist die IT unserer Gemeinde?" — {gf} will eine Empfehlung von dir | softSkills / gf, chef |

**Example Event A — full template (use verbatim as event #5, and as the tone/shape template for all plain decision cards):**

```typescript
{
  id: 'evt_schatten_it_cloud',
  weekRange: [13, 15],
  probability: 0.9,
  category: 'security',
  title: 'Das Trello-Board des Bauamts',
  description: `Beim Aufräumen der Firewall-Logs stolperst du über regen Traffic zu einem Cloud-Dienst, den ihr nie eingeführt habt.

Eine kurze Recherche später: Das Bauamt organisiert seit Monaten sämtliche Bauanträge über ein privates Trello-Board. Mit Namen, Adressen, Grundstücksdaten. Angelegt mit dem Privat-Account einer Sachbearbeiterin. Passwort: vermutlich "Sommer2025".

"Das ist viel übersichtlicher als euer Fachverfahren", sagt die {fachabteilung}, als du anrufst. "Wollt ihr uns das jetzt auch noch wegnehmen?"`,
  involvedCharacters: ['fachabteilung'],
  choices: [
    {
      id: 'shadow_it_shutdown',
      text: 'Sofort unterbinden: Dienst an der Firewall sperren, Board löschen lassen',
      effects: { compliance: 10, relationships: { fachabteilung: -15 }, stress: 5, skills: { security: 3 } },
      resultText:
        'Das Board ist weg, die Daten auch aus der Cloud. Das Bauamt arbeitet wieder mit dem Fachverfahren — und beschwert sich bei {chef} über "die IT, die alles blockiert". Immerhin: Bei der nächsten Datenpanne bist du nicht schuld.',
      setsFlags: ['shadow_it_blocked'],
      teachingMoment:
        'Schatten-IT entsteht, wo offizielle Werkzeuge zu unbequem sind. Sperren behebt das Symptom — die Ursache bleibt.',
    },
    {
      id: 'shadow_it_migrate',
      text: 'Verstehen, was fehlt — und eine offizielle Alternative aufsetzen',
      effects: { skills: { softSkills: 5, security: 3 }, compliance: 5, stress: 10, relationships: { fachabteilung: 10 } },
      resultText:
        'Du setzt dich eine Stunde ins Bauamt und schaust zu, wie sie arbeiten. Danach richtest du ein internes Kanban-Board im eigenen Rechenzentrum ein und migrierst die Karten. "Fast so gut wie Trello", sagt die Sachbearbeiterin. Aus ihrem Mund ist das ein Ritterschlag.',
      setsFlags: ['shadow_it_migrated'],
      teachingMoment:
        'Die nachhaltigste Antwort auf Schatten-IT: ein offizielles Angebot, das mindestens so bequem ist wie das inoffizielle.',
    },
    {
      id: 'shadow_it_tolerate',
      text: 'Dulden und nur dokumentieren — du hast gerade größere Baustellen',
      effects: { stress: -3, compliance: -10 },
      resultText:
        'Du schreibst eine Aktennotiz und legst sie ab. Das Board läuft weiter, die Grundstücksdaten bleiben in der Cloud. Beim nächsten Audit wird jemand genau diese Aktennotiz finden — mit deinem Namen drauf.',
      choiceTags: ['negligent'],
    },
    {
      id: 'shadow_it_dpa_check',
      text: 'Formal sauber: Datenschutzprüfung anstoßen und AV-Vertrag prüfen lassen',
      requires: { skill: 'softSkills', threshold: 45 },
      effects: { compliance: 12, skills: { softSkills: 4 }, relationships: { gf: 5 }, stress: 8 },
      resultText:
        'Du eskalierst sauber über den Datenschutzbeauftragten. Ergebnis: kein AV-Vertrag, keine Rechtsgrundlage, Board muss weg — aber die Anweisung kommt jetzt von {gf}, nicht von dir. Das Bauamt ist trotzdem sauer. Nur nicht auf dich.',
      teachingMoment:
        'Personenbezogene Daten bei US-Cloud-Diensten ohne AV-Vertrag sind kein IT-Problem, sondern ein Rechtsproblem. Genau dafür gibt es den DSB.',
    },
  ],
  tags: ['kritis', 'security', 'shadow_it', 'dsgvo'],
},
```

**Step 3: Register in the index.** In `client/src/content/events/index.ts` add:

```typescript
import { week13to18Events } from './week13-18';
```

and spread `...week13to18Events,` directly after `...week9to12Events,` in `allEvents`.

**Step 4: Run the guard + the auto-covering audits**

```bash
npx vitest run --root client src/engine/kritisLatePacing.test.ts src/engine/flowBalanceAudit.test.ts
```

Expected: `flowBalanceAudit` **passes** (if it fails with `unexpected __continue__ fallback`, an event violates Rule 1 — add an ungated option). `kritisLatePacing` still **fails**, but the failure message now shows ~27 late starters and weeks 13–18 no longer thin (only 19–24 remain). That is the correct intermediate state.

**Step 5: Commit (content only — the guard test is still red)**

```bash
git add client/src/content/events/week13-18.ts client/src/content/events/index.ts
git commit -m "feat(kritis): weeks 13-18 event wave — 25 late-game events" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: `week19-24.ts` — 22 events, "Endspurt: Winter & Jahresabschluss" (guard goes green)

**Files:**
- Create: `client/src/content/events/week19-24.ts`
- Modify: `client/src/content/events/index.ts`
- Test: `client/src/engine/kritisLatePacing.test.ts` (committed green here)

**Step 1: Create the file** (`export const week19to24Events: GameEvent[]`, same header comment style as Task 2) with these 22 events:

| # | id | weekRange | dayPref | category | premise (one line) | skills / relationships |
|---|----|-----------|---------|----------|--------------------|------------------------|
| 1 | `evt_neue_kollegin_start` | [19,20] | — | team | Die neue Kollegin aus der Ausschreibung (W15) fängt an — Onboarding richtig oder "wächst schon rein"? | softSkills / kollegen |
| 2 | `evt_herbststurm_vorbereitung` | [19,20] | — | crisis | Unwetterwarnung Stufe rot fürs Wochenende — was härtet ihr in 48 Stunden noch ab? | troubleshooting / chef |
| 3 | `evt_iso27001_wunsch_gf` | [19,21] | — | politics | {gf} war auf einem Bürgermeisterkongress: "Die Nachbargemeinde ist ISO-27001-zertifiziert. Warum wir nicht?" | softSkills / gf, chef |
| 4 | `evt_dokumentation_verfall` | [19,22] | — | compliance | Die mühsam erstellte Doku aus dem Frühjahr beschreibt drei Systeme, die es nicht mehr gibt | troubleshooting / kollegen |
| 5 | `evt_speicher_voll_schon_wieder` | [19,22] | — | support | Der Fileserver ist zu 97% voll — das Ordnungsamt archiviert Bodycam-Videos in "Eigene Dateien" | linux / fachabteilung |
| 6 | `evt_haushaltssperre` | [19,21] | — | budget | Haushaltssperre bis Jahresende: jede Bestellung über 500 € braucht jetzt die Unterschrift von {kaemmerer} | softSkills / kaemmerer |
| 7 | `evt_ot_fernwartung_fund` | [20,21] | — | security | Im Schaltschrank des Wasserwerks steckt ein LTE-Router, den keiner kennt | security, netzwerk / chef, gf — **fully written below (Example B)** |
| 8 | `evt_weihnachtsfeier_technik` | [20,21] | — | absurd | Du sollst "nur kurz" Musik und Beamer für die Weihnachtsfeier machen (reine Flavor-Karte, Effekte ≈ 0) | — / kollegen |
| 9 | `evt_krankheitswelle` | [20,22] | — | team | Grippewelle: {kollege} und die Neue sind flach, du bist allein für 300 Nutzer | troubleshooting / fachabteilung |
| 10 | `evt_bsi_warnmeldung_kommunen` | [21,22] | — | security | BSI-Warnmeldung: aktive Angriffskampagne gegen Kommunalverwaltungen, IoCs im Anhang | security / chef |
| 11 | `evt_dienstleister_insolvenz` | [21,22] | — | crisis | Euer Hosting-Dienstleister für das Ratsinformationssystem meldet Insolvenz an | troubleshooting / kaemmerer, chef |
| 12 | `evt_restore_jahrestest` | [21,23] | — | compliance | Der jährliche Voll-Restore-Test steht an — diesmal mit Protokoll fürs Audit | troubleshooting, security / — |
| 13 | `evt_digitalprojekt_vs_grundschutz` | [21,23] | — | politics | {gf} will Budget für eine Bürger-App — du brauchst es für Grundschutz-Basics | softSkills / gf, kaemmerer |
| 14 | `evt_zero_day_firewall` | [22,23] | — | security | Zero-Day in eurer Firewall-Appliance, Exploit aktiv ausgenutzt, Patch "in Kürze" | security, netzwerk / — |
| 15 | `evt_winterdienst_system` | [22,23] | — | crisis | Erster Schnee, und die Einsatzplanung des Winterdiensts startet nicht — um 4:30 Uhr | troubleshooting / fachabteilung, chef |
| 16 | `evt_jahresbericht_gemeinderat` | [22,24] | — | politics | Der jährliche IT-Sicherheitsbericht vor dem Gemeinderat — Klartext oder Beruhigungspillen? | softSkills / gf, chef |
| 17 | `evt_kollege_abwerbung` | [22,23] | — | personal | {kollege} hat ein Angebot: Systemhaus, 30% mehr Gehalt — er fragt dich um Rat | softSkills / kollegen, chef |
| 18 | `evt_bereitschaft_feiertage` | [23,24] | — | team | Rufbereitschaft über die Feiertage: wer, wie vergütet, und was ist "kritisch genug" für einen Anruf? | softSkills / kollegen, chef |
| 19 | `evt_altserver_abschaltung` | [23,24] | — | support | Der legendäre Alt-Server ("läuft seit 2011") soll endlich abgeschaltet werden — wer weiß, was noch dranhängt | windows, linux, netzwerk / kollegen |
| 20 | `evt_jahresgespraech_chef` | [23,24] | — | personal | Jahresgespräch mit {chef}: dein erstes Jahr in der KRITIS-Verantwortung — Bilanz und Forderungen | softSkills / chef |
| 21 | `evt_jahresrueckblick_finale` | [24,24] | [4] | story | Vorletzter Tag: du gehst durch den Serverraum und ziehst Bilanz (Flavor; `resultText` referenziert gesetzte Flags wie `nis2_compliant` narrativ) | — / kollegen |
| 22 | `evt_letzter_tag_ausblick` | [24,24] | [5] | story | Letzter Tag des Jahres: {chef} bringt Sekt, {kaemmerer} bringt das Budget-Formular für nächstes Jahr (Flavor-Abschlusskarte) | — / chef, kaemmerer |

**Example Event B — full template (use verbatim as event #7; this is the high-stakes pattern: every `resultText` carries a real SECOND reaction, and outcomes set flags the finale cards reference):**

```typescript
{
  id: 'evt_ot_fernwartung_fund',
  weekRange: [20, 21],
  probability: 0.9,
  category: 'security',
  title: 'Der fremde Router im Wasserwerk',
  description: `Routinekontrolle im Wasserwerk. Hinter der Steuerungsanlage, im Schaltschrank, zwischen SPS und Netzwerk-Switch: ein LTE-Router. Betriebsbereit, Antenne dran, SIM-Karte drin.

Auf deiner Netzwerkdokumentation existiert er nicht. Der Wassermeister zuckt mit den Schultern: "Den hat die Firma Habermann vor zwei Jahren eingebaut. Für die Fernwartung. Die brauchen das, sonst kommen die nicht."

Ein unautorisierter, dauerhaft aktiver Fernzugang. Direkt an der Trinkwasser-Steuerung. Seit zwei Jahren.`,
  involvedCharacters: ['chef', 'fachabteilung'],
  mentorNote:
    'Wartungszugänge von Herstellern sind ein klassisches Einfallstor in OT-Netze (Stichwort: Fernwartung nach BSI-CS 108). Grundregel: kein dauerhaft aktiver Zugang — Freischaltung nur bei Bedarf, dokumentiert, über eine kontrollierte Rendezvous-Lösung statt einer eigenen SIM am Schaltschrank.',
  choices: [
    {
      id: 'ot_router_pull',
      text: 'Sofort ziehen: Router raus, dann klären',
      effects: { skills: { security: 6 }, compliance: 8, stress: 15, relationships: { fachabteilung: -10 } },
      resultText:
        'Du ziehst den Stecker und tütest den Router ein. Zwei Stunden später ruft Habermann an — verärgert: "Ohne den Zugang keine Störungsbehebung, steht so im Wartungsvertrag." Und tatsächlich: {chef} findet die Klausel. Jetzt braucht ihr schnell eine saubere Fernwartungslösung, sonst steht ihr beim nächsten Pumpenausfall ohne Hersteller da.',
      setsFlags: ['ot_zugang_entfernt'],
      teachingMoment:
        'Erst der Vertrag, dann der Seitenschneider — sonst tauscht man ein Sicherheitsrisiko gegen ein Betriebsrisiko.',
    },
    {
      id: 'ot_router_controlled',
      text: 'Kontrolliert ablösen: Zugang dokumentieren, härten und auf Freischaltung nach Bedarf umstellen',
      requires: { skill: 'netzwerk', threshold: 50 },
      effects: { skills: { netzwerk: 8, security: 5 }, compliance: 12, stress: 10, relationships: { chef: 10 } },
      resultText:
        'Du klemmst den Router in ein eigenes, gesperrtes Segment, protokollierst jede Verbindung und vereinbarst mit Habermann: Freischaltung nur nach Ticket, Zwei-Mann-Prinzip. Der Techniker am Telefon murrt erst — und sagt dann leise: "Ehrlich gesagt machen das die wenigsten Gemeinden. Respekt." {chef} will den Vorgang als Blaupause für alle Wartungsverträge.',
      setsFlags: ['ot_zugang_gehaertet'],
      teachingMoment:
        'Fernwartung verbieten funktioniert selten — Fernwartung kontrollieren immer: eigenes Segment, Freischaltung on demand, Protokollierung.',
    },
    {
      id: 'ot_router_escalate',
      text: 'Als Sicherheitsvorfall behandeln: {chef} und {gf} informieren, Forensik vor Abschaltung',
      effects: { skills: { security: 4, softSkills: 3 }, compliance: 10, stress: 20, relationships: { gf: 8 } },
      resultText:
        'Du meldest den Fund formal. {gf} nimmt es ernster als erwartet: "Trinkwasser. Wenn da was passiert, stehe ich vor der Kamera." Die Log-Auswertung dauert zwei Tage — Ergebnis: nur Habermann-Verbindungen, kein Missbrauch. Glück gehabt. Die Doku aus dem Vorgang ist Gold fürs nächste Audit.',
      setsFlags: ['ot_vorfall_dokumentiert'],
      teachingMoment:
        'Ein zwei Jahre unbemerkter Zugang ist ein Vorfall, auch wenn nichts passiert ist. Erst Beweise sichern, dann abschalten.',
    },
    {
      id: 'ot_router_ignore',
      text: '"Läuft ja seit zwei Jahren" — Zettel dran, Thema auf die Liste für nächstes Jahr',
      effects: { stress: -3, compliance: -12 },
      resultText:
        'Du klebst einen Zettel an den Schaltschrank: "IT weiß Bescheid." Auf dem Rückweg überholst du den Gedanken nicht mehr: Jeder, der diese SIM-Karte kennt, steht seit zwei Jahren neben eurer Trinkwasser-Steuerung. Der Wassermeister winkt dir freundlich hinterher.',
      choiceTags: ['negligent'],
      setsFlags: ['ot_zugang_ignoriert'],
    },
  ],
  tags: ['kritis', 'security', 'ot', 'wasserwerk', 'fernwartung', 'high_stakes'],
},
```

**Step 2: Register in the index** (import `week19to24Events`, spread after `...week13to18Events,`).

**Step 3: Run the guard — it must now be fully green**

```bash
npx vitest run --root client src/engine/kritisLatePacing.test.ts src/engine/flowBalanceAudit.test.ts
```

Expected: **all pass** (47 ungated late starters ≥ 45; every week 13–24 has ≥ 6 in range). If a single week is thin, widen the `weekRange` of a neighboring event by one week rather than lowering the constant.

**Step 4: Commit content + the now-green guard test**

```bash
git add client/src/content/events/week19-24.ts client/src/content/events/index.ts client/src/engine/kritisLatePacing.test.ts
git commit -m "feat(kritis): weeks 19-24 event wave + late-game pool guard test" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Extend `kritis-special.ts` — the NIS2-Nachaudit arc (6 events)

The mode description advertises "NIS2-Audits" — the first audit arc ends by week ~10. This arc gives the back half its spine and pays off the flags the first arc set (`nachaudit_scheduled`, `nis2_conditional`, `nis2_failed`, `nis2_compliant`).

**Files:**
- Modify: `client/src/content/events/kritis-special.ts` (append to `kritisSpecialEvents`)
- Modify: `client/src/engine/kritisLatePacing.test.ts` (add arc-wiring assertions)

**Step 1: Write the failing arc-wiring test.** Append to `kritisLatePacing.test.ts`:

```typescript
describe('NIS2 Nachaudit arc (weeks 15-22)', () => {
  const byId = new Map(allEvents.map((e) => [e.id, e]));
  it('the arc exists and is wired announcement -> day -> result', () => {
    const ank = byId.get('evt_nis2_nachaudit_ankuendigung');
    const tag = byId.get('evt_nis2_nachaudit_tag');
    const erg = byId.get('evt_nis2_nachaudit_ergebnis');
    expect(ank, 'announcement missing').toBeTruthy();
    expect(tag?.requires?.flags).toContain('nachaudit_announced');
    expect(erg?.requires?.events).toContain('evt_nis2_nachaudit_tag');
    // announcement is reachable without prior-arc flags (works for every first-audit outcome)
    expect((ank!.requires?.flags ?? []).filter((f) => f !== 'kritis_mode')).toEqual([]);
    expect(ank!.weekRange[0]).toBeGreaterThanOrEqual(13);
  });
});
```

**Step 2: Run to see it fail**

```bash
npx vitest run --root client src/engine/kritisLatePacing.test.ts
```

Expected: FAIL — `announcement missing: expected undefined to be truthy`.

**Step 3: Author the 6 events** (append; German; same tone as the existing first-audit events in this file; all `requires.flags: ['kritis_mode']` unless noted):

| # | id | weekRange | requires | premise | notes |
|---|----|-----------|----------|---------|-------|
| 1 | `evt_bussgeld_ratenzahlung` | [13,15] | flags: `nis2_failed` | Der Bußgeldbescheid ist rechtskräftig — {kaemmerer} will über Ratenzahlung, Widerspruch oder "aus dem IT-Budget" verhandeln | kaemmerer/budget; payoff of the failed first audit |
| 2 | `evt_nis2_nachaudit_ankuendigung` | [15,16] | flags: `kritis_mode`, prob 0.9 | Das BSI kündigt die Folgeprüfung an — je nach Erstergebnis Nachaudit (Auflagen), Stichprobe (bestanden) oder verschärfte Prüfung (durchgefallen); Beschreibung deckt alle Fälle neutral ab | sets `nachaudit_announced`; ≥2 ungated choices (souverän planen / Panik / delegieren) |
| 3 | `evt_nis2_massnahmenplan` | [16,18] | flags: `nachaudit_announced` | Die offene Maßnahmenliste abarbeiten: priorisieren nach Risiko, nach Sichtbarkeit fürs Audit, oder Team einbinden | choices set `massnahmen_umgesetzt` / `massnahmen_kosmetik` / `massnahmen_teamwork` |
| 4 | `evt_nis2_nachaudit_tag` | [18,20] | flags: `nachaudit_announced`, prob 0.95 | Die Prüfer sind wieder da — und diesmal kennen sie das Gebäude | high stakes (Rule 4!); choices branch on the `massnahmen_*` flags via `unlocks` PLUS ≥2 ungated baselines; set `nachaudit_passed` / `nachaudit_auflagen` / `nachaudit_failed` |
| 5 | `evt_nis2_nachaudit_ergebnis` | [19,22] | events: `['evt_nis2_nachaudit_tag']`, prob 1.0 | Der Bericht: bestanden mit Empfehlungen / weitere Auflagen / Verschärfung — mirror the `evt_nis2_audit_result` unlocks-pattern exactly | sets `nis2_final_compliant` etc.; budget/compliance payoffs |
| 6 | `evt_bsi_stichproben_besuch` | [22,23] | flags: `kritis_mode`, prob 0.6 | Unangekündigter BSI-Kurzbesuch als Kapstein: "Wir waren in der Gegend" — zeigt, ob die Papiere zur Realität passen | ungated (counts toward the pool); resultTexts reference `nachaudit_*` flags narratively |

**Important:** event #4's `unlocks`-gated choices follow the `evt_nis2_audit_result` pattern (`unlocks: ['massnahmen_umgesetzt']` etc.). `flowBalanceAudit` simulates arrival with all unlock flags set, so this pattern is guard-safe — but still include 2 ungated baseline choices.

**Step 4: Run to pass**

```bash
npx vitest run --root client src/engine/kritisLatePacing.test.ts src/engine/flowBalanceAudit.test.ts
```

Expected: all pass.

**Step 5: Commit**

```bash
git add client/src/content/events/kritis-special.ts client/src/engine/kritisLatePacing.test.ts
git commit -m "feat(kritis): NIS2 Nachaudit arc for weeks 13-23" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---### Task 5: New chain — Audit-Vorbereitung (`audit-prep-chain.ts`)

Red-thread: how you work the open findings in week 13–15 pays off (or blows up) during the Nachaudit window.

**Files:**
- Create: `client/src/content/events/chains/audit-prep-chain.ts`
- Modify: `client/src/content/events/chains/index.ts` (import + spread + re-export)
- Modify: `client/src/content/events/chains/chainIntegrity.test.ts` (red-thread wiring test)

**Step 1: Write the failing wiring test.** Append to `chainIntegrity.test.ts`'s describe block (mirror the backup-thread test):

```typescript
it('the audit-prep red-thread wires start → payoff/blamage', () => {
  const start = allEvents.find((e) => e.id === 'evt_auditprep_start');
  expect(start, 'evt_auditprep_start missing').toBeTruthy();
  expect(start!.requiredModes).toEqual(['kritis']);
  const targets = (start!.choices ?? []).flatMap((c) => (c.chainTriggers ?? []).map((t) => t.targetEventId));
  expect(targets).toContain('evt_auditprep_payoff');
  expect(targets).toContain('evt_auditprep_blamage');
});
```

**Step 2: Run to see it fail**

```bash
npx vitest run --root client src/content/events/chains/chainIntegrity.test.ts
```

Expected: FAIL — `evt_auditprep_start missing`.

**Step 3: Author the chain** (copy `backup-chain.ts`'s structure and doc-comment style; 3 events, German):

- `evt_auditprep_start` — `weekRange: [13, 15]`, `probability: 0.9`, `requiredModes: ['kritis']` (mode-scoping the START gates the whole chain; other modes never reach week 13 anyway, but be explicit). Premise: {chef} legt dir die Mängelliste aus dem Frühjahr auf den Tisch — "Mach das weg, bevor die wiederkommen." 4 choices:
  - "Ownership pro Mängel verteilen + monatlicher Review" (methodical) → `chainTriggers: [{ targetEventId: 'evt_auditprep_payoff', delayWeeks: 4 }]`
  - "Selbst alles abarbeiten, nachts" (overworked, stress +) → payoff, `delayWeeks: 4`
  - "Ein Word-Dokument pro Mangel: 'in Umsetzung'" (cosmetic) → `evt_auditprep_blamage`, `delayWeeks: 4`
  - "Auf den Praktikanten und 'kommt Zeit, kommt Rat'" (negligent) → blamage, `delayWeeks: 5`
- `evt_auditprep_payoff` — `weekRange: [16, 24]`, `probability: 1.0`, `isChainEvent: true`, `chainPriority: 12`. Ein Prüfer ruft VOR dem Termin an und fragt nach drei konkreten Maßnahmen — du kannst jede belegen; the Nachaudit later feels earned. 2–3 choices, all rewarding differently.
- `evt_auditprep_blamage` — same window/flags. Derselbe Anruf — und du blätterst hektisch durch Dokumente, die nur behaupten. Choices: gestehen und Fristverlängerung erbitten / bluffen (stress, compliance −) / Nachtschicht-Rettungsversuch.

Wide consequence windows `[16, 24]` are deliberate: the 1-chain/week throttle may hold a consequence back for weeks. Both consequence `resultText`s must explicitly reference the week-13 decision (the "this happened because of what I chose" feel — see backup-chain).

**Step 4: Register** in `chains/index.ts` (import, spread into `chainEvents`, add to the re-export block).

**Step 5: Run to pass — integrity + both chain pacing audits**

```bash
npx vitest run --root client src/content/events/chains/chainIntegrity.test.ts src/engine/chainPacingAudit.test.ts src/engine/chainFlowDensity.test.ts
```

Expected: all pass (throttle assertions `<= 1` chain/week must hold — they will, the engine enforces it; the audit report will simply show the new chain in weeks 16+).

**Step 6: Commit**

```bash
git add client/src/content/events/chains/audit-prep-chain.ts client/src/content/events/chains/index.ts client/src/content/events/chains/chainIntegrity.test.ts
git commit -m "feat(kritis): audit-prep red-thread chain (weeks 13-24)" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: New chain — Lieferketten-Vorfall (`supply-chain-chain.ts`)

Red-thread: the Wasserwerk-Leittechnik vendor demands a rushed update + permanent access in week 14–17; your diligence decides whether week 18+ brings a quiet payoff or a supply-chain compromise. Theme is distinct from backup-chain (restore) and audit-prep (paperwork): this one is about **vendor trust and least privilege**.

**Files:**
- Create: `client/src/content/events/chains/supply-chain-chain.ts`
- Modify: `client/src/content/events/chains/index.ts`
- Modify: `client/src/content/events/chains/chainIntegrity.test.ts`

**Step 1: Failing wiring test** (append, mirroring Task 5):

```typescript
it('the supply-chain red-thread wires start → payoff/kompromittiert', () => {
  const start = allEvents.find((e) => e.id === 'evt_lieferkette_start');
  expect(start, 'evt_lieferkette_start missing').toBeTruthy();
  expect(start!.requiredModes).toEqual(['kritis']);
  const targets = (start!.choices ?? []).flatMap((c) => (c.chainTriggers ?? []).map((t) => t.targetEventId));
  expect(targets).toContain('evt_lieferkette_payoff');
  expect(targets).toContain('evt_lieferkette_kompromittiert');
});
```

**Step 2: Run to see it fail** — same command as Task 5 Step 2, expected `evt_lieferkette_start missing`.

**Step 3: Author the chain** (3 events, German):

- `evt_lieferkette_start` — `weekRange: [14, 17]`, `probability: 0.9`, `requiredModes: ['kritis']`. Premise: Der Leittechnik-Hersteller drängt: "Kritisches Update, muss diese Woche drauf — geben Sie uns einfach dauerhaften Zugang, dann machen wir das ab jetzt immer selbst." 4 choices:
  - "Update prüfen: Signatur, Changelog, erst auf dem Testsystem" (methodical, stress +) → `evt_lieferkette_payoff`, `delayWeeks: 4`
  - "Zugang ja, aber nur per Freischaltung nach Ticket" (least privilege, softSkills) → payoff, `delayWeeks: 4`
  - "Durchwinken — die kennen ihr System am besten" (negligent) → `evt_lieferkette_kompromittiert`, `delayWeeks: 4`
  - "Komplett verweigern und Update aussitzen" (blocker; NOT free: compliance −, fachabteilung −) → kompromittiert, `delayWeeks: 5` (unpatched known vuln gets exploited instead — the resultText of the consequence must distinguish this path narratively)
- `evt_lieferkette_payoff` — `weekRange: [18, 24]`, `isChainEvent: true`, `chainPriority: 12`, `probability: 1.0`. BSI-Warnung: genau dieser Hersteller wurde kompromittiert, manipulierte Updates im Umlauf — euer geprüfter/kontrollierter Prozess heißt: ihr könnt nachweisen, sauber zu sein. Choices: IoC-Prüfung fahren / BSI-Rückmeldung liefern (compliance +) / Prozess als Standard festschreiben.
- `evt_lieferkette_kompromittiert` — same window. Dieselbe BSI-Warnung — aber bei euch lief das Update ungeprüft durch (bzw. die alte Lücke war offen). Verdächtige Verbindungen aus dem Leittechnik-Segment. Choices: isolieren + 72h-Meldung (Rule 4: real second reaction from {gf}) / Hersteller-Forensik einfordern / stillschweigend neu aufsetzen (compliance −−, risky).

**Step 4: Register** in `chains/index.ts`.

**Step 5: Run to pass**

```bash
npx vitest run --root client src/content/events/chains/chainIntegrity.test.ts src/engine/chainPacingAudit.test.ts src/engine/chainFlowDensity.test.ts
```

Expected: all pass.

**Step 6: Commit**

```bash
git add client/src/content/events/chains/supply-chain-chain.ts client/src/content/events/chains/index.ts client/src/content/events/chains/chainIntegrity.test.ts
git commit -m "feat(kritis): supply-chain incident red-thread chain (weeks 14-24)" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Behavioural guard — realistic 24-week simulation, zero dead days

The static pool test can't prove exhaustion-safety (events are consumed as weeks pass). This test replays the REAL day loop for full 24-week KRITIS runs and asserts no late day comes up empty.

**Files:**
- Modify: `client/src/engine/kritisLatePacing.test.ts` (append a describe block)
- Reference: `client/src/engine/chainFlowDensity.test.ts` (copy its `playRealistic` mechanics — it is the faithful reproduction of the App day loop)

**Step 1: Write the test.** Append to `kritisLatePacing.test.ts` (imports to add at the top: `createInitialState, advanceDay, applyEffects` from `./gameState`; `selectNextEvent, getVisibleChoices` from `./eventEngine`; `selectNextScenario, calculateScenarioEffects` from `./scenarioEngine`; `recordDecision, scheduleChainEvents, cleanupPendingEvent` from `./chainEngine`; `getAllScenarios` from `../content/packs`; `GameState, getGameModeConfig` from `@kritis/shared`):

```typescript
describe('KRITIS 24-week simulation: no dead days in weeks 13-24', () => {
  const allScenarios = getAllScenarios();
  const SEEDS = Array.from({ length: 40 }, (_, i) => `LATE-${i}`);

  function simpleHash(str: string): number {
    let h = 0;
    for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h = h & h; }
    return Math.abs(h);
  }
  const pick = (seed: string, n: number) => (n > 0 ? simpleHash(seed) % n : 0);

  function playKritis(seed: string): { deadDays: { week: number; day: number }[] } {
    const cfg = getGameModeConfig('kritis');
    const totalWeeks = cfg.gameLength.totalWeeks;
    const maxDays = totalWeeks * cfg.gameLength.daysPerWeek + 4;
    let state: GameState = {
      ...createInitialState(seed, 'kritis'),
      completedEvents: [], completedScenarios: [], decisions: [], pendingChainEvents: [],
      flags: { kritis_mode: true },
    };
    const deadDays: { week: number; day: number }[] = [];

    for (let d = 0; d < maxDays && state.currentWeek <= totalWeeks; d++) {
      const week = state.currentWeek;
      const scenarioChance = Math.min(0.5, 0.1 + (week - 1) * 0.05);
      const h = simpleHash(state.seed + week + state.currentDay + state.completedEvents.length);
      const useScenario = (h % 100) < scenarioChance * 100;

      let handled = false;
      if (useScenario && allScenarios.length > 0) {
        const sc = selectNextScenario(allScenarios, state, state.seed);
        if (sc) {
          const choices = sc.choices ?? [];
          const choice = choices[pick(state.seed + sc.id, choices.length)] ?? choices[0];
          if (choice) state = applyEffects(state, calculateScenarioEffects(choice));
          state = { ...state, completedScenarios: [...(state.completedScenarios || []), sc.id] };
          handled = true;
        }
      }
      if (!handled) {
        const ev = selectNextEvent(allEvents, state, state.seed);
        if (!ev) {
          if (week >= 13) deadDays.push({ week, day: state.currentDay });
        } else {
          const visible = getVisibleChoices(ev, state);
          const choice = visible[pick(state.seed + ev.id, visible.length)] ?? visible[0];
          if (choice) {
            state = applyEffects(state, choice.effects ?? {});
            const idx = ev.choices.indexOf(choice);
            state = recordDecision(state, ev, choice, idx >= 0 ? idx : 0);
            state = scheduleChainEvents(state, ev, choice);
            state = cleanupPendingEvent(state, ev.id);
            if (choice.setsFlags) {
              const flags = { ...state.flags };
              for (const f of choice.setsFlags) flags[f] = true;
              state = { ...state, flags };
            }
            state = { ...state, completedEvents: [...state.completedEvents, ev.id] };
          }
        }
      }
      state = advanceDay(state);
    }
    return { deadDays };
  }

  it('40 seeded full-length runs never hit an empty day in weeks 13-24', () => {
    const failures: string[] = [];
    for (const seed of SEEDS) {
      const { deadDays } = playKritis(seed);
      if (deadDays.length > 0) {
        failures.push(`${seed}: ${deadDays.map((x) => `w${x.week}d${x.day}`).join(', ')}`);
      }
    }
    expect(failures, `dead late-game days found:\n${failures.join('\n')}`).toEqual([]);
  });
});
```

Note on the throttle edge: `selectNextEvent` intentionally returns `null` when a chain already fired this week AND only chain events remain available. With ~50 non-chain events in the late pool this cannot happen — if this assertion ever flags exactly that case, add one more broad-window filler event rather than weakening the test.

**Step 2: Run it**

```bash
npx vitest run --root client src/engine/kritisLatePacing.test.ts
```

Expected: PASS. (If dead days appear in weeks 23–24, the pool drained: widen 2–3 `weekRange`s in `week19-24.ts` toward `[19, 24]` and re-run.)

**Step 3: Full suite + build**

```bash
npm test
```

Expected: all test files pass, including `skillBalanceAudit` (new events have no `guiContext`/`terminalContext`, so it ignores them), `flowBalanceAudit` (no `__continue__`, high-stakes spread OK), `chainPacingAudit` (throttle ≤ 1/week), `campaignPacing` (story mode — untouched), `packs.test` (scenarios — untouched). Also confirm the client builds:

```bash
npm run build -w client
```

Expected: `tsc && vite build` succeeds with no type errors.

**Step 4: Commit**

```bash
git add client/src/engine/kritisLatePacing.test.ts
git commit -m "test(kritis): 24-week simulation guard — no dead days in weeks 13-24" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Definition of Done

- [ ] `npx vitest run --root client src/engine/kritisLatePacing.test.ts` green: ≥45 ungated late starters, ≥6 pool every week 13–24, NIS2 arc wired, 40/40 simulated runs without a dead late day.
- [ ] `npm test` fully green (all existing audits included).
- [ ] 59 new events total: 25 (`week13-18.ts`) + 22 (`week19-24.ts`) + 6 (`kritis-special.ts`) + 3 (`audit-prep-chain.ts`) + 3 (`supply-chain-chain.ts`).
- [ ] Every event obeys the 9 Design Rules (spot-check: ≥2 ungated options, consequences in `resultText`, flavor cards stat-free, high-stakes second reactions).
- [ ] No engine files modified; no changes to modes other than KRITIS (weekRange ≥ 13 is invisible to 12-week modes by construction).
