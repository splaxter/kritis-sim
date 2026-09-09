# DAS KATASTER Campaign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Dritte, eigenständige WARM-Story-Kampagne „DAS KATASTER" (4 Akte,
6 Kapitel, ~22 Beats, 6 CLI-Level + 2 GUI-Level, 5 Kataster-Domänen → 3 Endings)
auf Basis der bestehenden Kampagnen-Registry. Einziger nennenswerter neuer
Engine-Baustein: die GUI-App `kataster`.

**Architecture:** Phase A liefert die neue GUI-App isoliert und vollständig
getestet (Typen → Komponente → Dispatch → Browser-Tests), bevor irgendein
Content sie benutzt. Phase B registriert die Kampagne als Skelett mit
vollständiger Domänen-/Ending-Logik, aber ohne Level. Phase C schreibt den
Content Akt für Akt. Jede Phase ist separat committbar; Probezeit und AUDIT
TRAIL dürfen sich in keiner Phase verhalten ändern.

**Tech Stack:** React 18, TypeScript, Fluent UI (GUI-Apps), Vitest (node `*.test.ts` + jsdom `*.browser.test.tsx`), xterm.js-Shell-Engine.

**Design doc:** `docs/plans/2026-09-09-das-kataster-campaign-design.md` — hält die fünf Auditfragen (§4), Flag-/Domänen-Landkarte (§5), Level-Specs mit Lern-/Tun-Hälfte (§6), die App-Spezifikation (§7.1), Testpflichten (§8). **Bei Widerspruch gewinnt das Design-Doc.**

**Acceptance bar:** Jeder Task endet grün (`npm run build` typecheckt via `tsc`; Task-Tests laufen) und committet. Probezeit und AUDIT TRAIL verhalten sich identisch (bestehende Tests bleiben grün, alte Saves laden). Content-Tasks respektieren die Audit-Tests (Pacing, Orthographie, Hint-Eskalation, Choice-Design).

---

## Orientation — verified anchors (cite these; don't rediscover)

**GUI-App-Erweiterung — der komplette Pfad, den `corefirewall` gegangen ist:**
- `shared/src/types/gui.ts:11-17` — `GuiAppId`-Union (aktuell 6 Einträge).
- `shared/src/types/gui.ts:216-223` — `GuiAppState`: ein optionales Feld pro App.
- `shared/src/index.ts:9` — `export * from './types/gui'` (Barrel, keine Änderung nötig).
- `client/src/components/WindowsLevel/index.tsx:85` — `APP_ICONS`-Map.
- `client/src/components/WindowsLevel/index.tsx:102-160` — `renderApp()`-Switch; `case 'corefirewall'` bei `:145` ist die Vorlage.
- `client/src/components/WindowsLevel/apps/CoreFirewall.tsx` — Komponentenmuster (Props = flache State-Felder + `emit` + `locked`).
- `client/src/components/WindowsLevel/useGuiLevel.ts` — `emit` sammelt Tokens, `findMetGuiSolution` prüft nach **jedem** Token, erste passende Solution gewinnt. **Keine Änderung nötig.**
- `client/src/components/WindowsLevel/guiSolution.ts` — `allRequired`/`ordered`-Semantik.

**Kampagnen-Registry:**
- `shared/src/types/campaign.ts:11` — `CampaignId = 'probation' | 'audit-trail'`.
- `client/src/content/campaigns/index.ts:11` — `CAMPAIGNS`-Record; `:18` — `CAMPAIGN_ORDER`.
- `client/src/content/campaigns/types.ts` — `CampaignDefinition` (menu, deriveEnding, buildEpilogue, startingRelationships, usesScoreStats).
- `client/src/content/campaigns/audit-trail/` — **das Referenz-Layout**: `index.ts`, `chapters.ts`, `events.ts`, `domains.ts`, `endings.ts`, `characters.ts`, `actBreaks.ts` + Tests je Akt.
- `shared/src/types/adventure.ts:21` — `act: 1 | 2 | 3 | 4` (reicht, keine Änderung).
- `shared/src/types/flagCondition.ts` — `FlagCondition` + `checkFlagCondition` + `flagsInCondition` (letztere trägt den Konsistenztest).

**Level-Bausteine (alle vorhanden, nichts zu bauen):**
- `shared/src/types/terminal.ts` — `stateGoals` mit `fileRead` (`:407`, semantischer Lesenachweis), `commandRan`, `matches`, `fileExists`; `commandSkillGain` (Live-Skill-Drip).
- `shared/src/types/gui.ts:230-247` — `GuiSolution` mit `setsFlags` (trägt die Fabrication-Falle).
- `shared/src/types/events.ts:76-82` — `mailCompose` (Eskalations-Mail in Akt 3).
- `client/src/content/campaigns/audit-trail/events.ts:209` (`at_l2_inventory`) — **die Vorlage für einen „Lesen + Artefakt schreiben"-CLI-Level** inkl. `fileRead`-stateGoals und Hint-Eskalation.
- `client/src/content/campaigns/audit-trail/events.ts:829` (`at_l7_delivery_note`) — Vorlage für einen GUI-Level als Story-Beat.

**Fallen, die im Bestand dokumentiert sind (nicht neu entdecken):**
- Story-Mode serviert **keine** Chain-Events: `getActivatedChainEvents` hängt an `eventEngine`, den `getNextStoryContent` nicht benutzt. AUDIT TRAILs `campaignConsistency.test.ts:145` hält das als Guard fest — **hier genauso guarden**.
- `campaignBudget.test.ts:123-141` iteriert **alle** registrierten Kampagnen. Eine neu registrierte Kampagne wird sofort auf „erreicht ihr Ende im Tagesbudget" geprüft — Registrierung deshalb erst mit lauffähigem Skelett (Task 5), nicht davor.
- `content/orthography.test.ts` verbietet `ae/oe/ue` im Anzeigetext. Die Turnus-IDs `halbjaehrlich`/`zweijaehrlich` sind **IDs**; ihre Labels müssen „halbjährlich"/„zweijährlich" heißen (Test-Ausnahme gilt nur für die ID-Zeile).
- Hint-Regel: `hints[0]` orientiert und nennt nie das Kommando; exakte Syntax steht im letzten Hint (`packs.test.ts` guardet das).
- Choice-Regel: jeder Beat braucht ≥ 2 ungated Optionen mit Konsequenztext.

---

# PHASE A — Die GUI-App `kataster` (isoliert, ohne Content)

## Task 1: Typen für die Kataster-App (shared)

**Files:** Edit `shared/src/types/gui.ts`.

Ergänze `GuiAppId` um `'kataster'` und `GuiAppState` um `kataster?: KatasterState`.
Füge die Typen aus Design §7.1 **wörtlich** hinzu: `KatasterCycle`,
`KatasterPerson`, `KatasterFinding`, `KatasterEvidence`, `KatasterEntry`,
`KatasterState`.

Kommentiere an `isGroup`/`unconfirmed` ausdrücklich, dass sie die Ampel **nicht**
verändern dürfen — das ist die Falle, und der Kommentar ist die Begründung für
den Regressionstest in Task 3.

**Verify:** `npm run build -w shared` typecheckt. Kein bestehender Test ändert sich.

## Task 2: `Kataster`-Komponente

**Files:** Create `client/src/components/WindowsLevel/apps/Kataster.tsx`.

Props flach wie bei `CoreFirewall`: `title`, `entries`, `people`, `findings`,
`evidence`, `emit`, `locked`.

Umsetzung nach Design §7.1:
- **Ampel abgeleitet, nie geseedet** — Reihenfolge: `gap` → 🟨 LÜCKE ·
  kein `owner` → 🟥 VERWAIST · `owner` ohne `evidenceId`/`cycle` → 🟨 BEHAUPTET ·
  sonst 🟩 BELEGT.
- Kopfzeile zählt live: „N Pflichten · N ohne Aufpasser · N ohne Nachweis".
- Drei Panels: Grid (links/oben), Quellentext der markierten Zeile, Fundstapel +
  Belegstapel.
- `add:` auf ein `decoy`-Finding emittiert **kein** Token, sondern zeigt dessen
  `riskFeedback` inline.
- `locked` blockt jede Eingabe (Solve-Animation läuft).
- **Keyboard-first** (Projektkonvention): ↑/↓ Zeile, ←/→ Spalte, Enter öffnet den
  Popover der aktiven Spalte, Escape schließt ihn (nicht das Level).

Token-Vokabular exakt aus Design §7.1.

**Verify:** typecheckt; noch nicht gerendert.

## Task 3: Dispatch + Browser-Tests

**Files:** Edit `client/src/components/WindowsLevel/index.tsx`; create `client/src/components/WindowsLevel/Kataster.browser.test.tsx`.

Dispatch: `APP_ICONS.kataster = '📋'` (`:85`) und ein `case 'kataster'` im
`renderApp()`-Switch (`:102`), analog `corefirewall` bei `:145`.

Tests (Design §8.4/§8.5):
1. Alle vier Ampelzustände werden korrekt abgeleitet.
2. **`isGroup: true` und `unconfirmed: true` ändern die Ampel NICHT** — eine
   Zeile mit Gruppe als Aufpasser und Nachweis rendert 🟩. (Regressionsschutz
   für die Fabrication-Falle; wenn dieser Test je „repariert" wird, ist die
   Kampagne kaputt.)
3. Kopfzeilen-Zähler stimmt und aktualisiert sich nach `gap:`/`owner:`.
4. Jede Interaktion emittiert genau ihr Token.
5. `add:` auf ein Decoy emittiert nichts und zeigt `riskFeedback`.
6. Keyboard-Navigation + Fokusfalle.
7. `locked` blockt.
8. `guiSolution`: bei gemischtem Spiel gewinnt die **zuerst gelistete**
   (Fabrication-)Solution — dokumentiert „Risiko vor Lob".

**Verify:** `npm run test:client -- src/components/WindowsLevel/Kataster.browser.test.tsx` grün; `npm run test:client` insgesamt grün.

## Task 4: Dev-Preview

**Files:** Edit `client/src/components/WindowsLevel/DevGuiPreview.tsx`.

Kataster-Beispielzustand ergänzen, damit `?preview=<id>` die App zeigt, bevor
Content existiert. Manuell einmal ansehen (`npm run dev`).

**Commit Phase A.** Die App ist vollständig, getestet und wird von nichts benutzt.

---

# PHASE B — Domänen-, Ending- und Rasterlogik (OHNE Registrierung)

> **Beim Bauen gefundene Randbedingung (09.09.2026):** `campaignBudget.test.ts`
> iteriert `listCampaigns()` und verlangt von JEDER registrierten Kampagne
> `end === 'ending'` und `chaptersCompleted === totalChapters`. Eine Registrierung
> vor dem Content färbt dieses Audit rot **und** zeigt Spielern eine Kampagne,
> die nach zwei Dialogen endet. **Task 6 (Registrierung + Picker) ist deshalb ans
> Ende von Phase C verschoben.** Alles andere ist ohne Registrierung baubar und
> testbar, weil `CampaignId` erst von `index.ts` gebraucht wird —
> `domains.ts`/`endings.ts` sind reine Funktionen über Flags, `chapters.ts` ist
> reine Daten. Ein Guard in `skeleton.test.ts` hält das Gate fest.

## Task 5: Verzeichnis + Domänen/Endings/Raster ✅ **erledigt 09.09.2026**

**Files:** created `client/src/content/campaigns/kataster/{domains.ts,endings.ts,characters.ts,actBreaks.ts,chapters.ts}` + `{domains,endings,skeleton}.test.ts` — 36 Tests grün.

- `CampaignId` bleibt vorerst unverändert: `CAMPAIGNS` ist ein
  `Record<CampaignId, CampaignDefinition>`, ein neuer Union-Member würde die
  Registrierung sofort erzwingen (siehe Kasten oben).
- `domains.ts` nach Design §5.2 — **die Domänen-Objekte sind die einzige
  Wahrheit**: dieselben `FlagCondition`-Objekte, auf die die Akt-4-Beats
  branchen. `deriveKatasterEnding(flags)` nach §5.3-Priorität.
  Ending-IDs ohne Umlaut-Digraphen: `gruene_liste` | `ordner` | `aufpasser`
  (Anzeigetitel tragen die Umlaute).
- `endings.ts` — `KATASTER_ENDING_TEXTS` + `buildKatasterEpilogue(flags)`,
  modular pro Domäne, mit den Ehrlichkeitsregeln aus §5.3.
- `chapters.ts` — alle 6 Kapitel (1/3/1/1 über 4 Akte), Beats zeigen auf noch
  nicht authored Event-IDs; die drei Akt-3-Payoffs tragen bereits
  `branchCondition` + `alternateEventId`.
- `characters.ts` / `actBreaks.ts` — Besetzung inkl. ISB (Jakob Michael) und
  Vorgänger (Reinhard Kalb); Akt-Übergänge 1–3, text-only.
- `skeleton.test.ts` — Rasterguard + **Registrierungs-Gate**.

Tests **zuerst**, tabellengetrieben (Design §8.2/§8.3): „Grüne Liste" schlägt
alles; < 2 Domänen → `ordner`; ≥ 4 Domänen ohne K2 **oder** ohne K4 → **nicht**
`aufpasser`; 2–3 Domänen → `ordner`; pro Domäne ein Epilog-Fall „Flag fehlt →
Satz fehlt".

## Task 6: Registrierung + Menü — **verschoben ans Ende von Phase C** (siehe Kasten oben)

**Files:** Edit `client/src/content/campaigns/index.ts:11,18`; edit `client/src/engine/campaignInitialState.test.ts`; edit `client/src/content/campaigns/campaignMenu.test.ts`.

- `CAMPAIGNS.kataster = katasterCampaign`; `CAMPAIGN_ORDER` += `'kataster'`.
- `menu`-Eintrag: **sichtbar** (kein `hidden`/`unlockCode`) — entschieden, Design §9.1.
  `meta: '6 Kapitel · 3 Enden · Hands-on (Terminal & Kataster)'`.
- `startingRelationships: { chef: 5, kollegen: 5 }`, `usesScoreStats: false`,
  kein `defaultBackgroundImage` (text-only).
- `characterTokens` wie AUDIT TRAIL + `isb: 'Jakob Michael'` (im Dialog „Herr Michael").
- Tests erweitern: frischer Zustand ohne Fremd-Flags; Menütexte vorhanden.

**Verify:** `npm test` — insbesondere `campaignBudget.test.ts` (greift ab jetzt auch für `kataster`) und `campaignMenu.test.ts`.

**Commit Phase B.** Die Logik steht und ist getestet; für Spieler ist noch
nichts sichtbar — genau das macht den Stand deploybar.

---

# PHASE C — Content, Akt für Akt

> Reihenfolge-Regel für jeden Content-Task: **erst der Level, dann der Dialog,
> der seine Entscheidung trägt** (AUDIT TRAIL macht das bei
> `at_l2_inventory` → `at_wiki_password` genauso: der Fund geht der Wahl voraus).

## Task 7: ~~Faktencheck~~ — **erledigt am 09.09.2026, siehe Design §7.4**

Kein Code. Ergebnis, das der Content-Autor kennen muss:

- **Fundstelle für die Nachweispflicht ist § 39 BSIG**, Turnus **drei Jahre**,
  Adressat das Bundesamt, Form Audits/Prüfungen/Zertifizierungen —
  **einschließlich der dabei aufgedeckten Sicherheitsmängel**. § 8a Abs. 3
  (zwei Jahre) ist die **alte** Fassung; das BSIG wurde durch das
  NIS2-Umsetzungsgesetz zum **06.12.2025** neu gefasst.
- **L6 rechnet**: letzter Nachweis **+ drei Jahre** (§ 39 Abs. 1). Die
  Übergangsregel aus § 39 Abs. 3 wird **nicht** gespielt — „neues Recht only".
- **Siedlungsabfallentsorgung ist KRITIS-Sektor** (§ 10 BSI-KritisV,
  Schwellenwert orientiert an 500.000 Einwohnern) — WARM ist betroffen. Der
  Schwellenwert wird im Spieltext nicht zitiert.
- **Nur geltendes Recht** im ganzen Spiel: § 39 (Nachweise), § 32
  (Meldepflichten 24 h / 72 h / 1 Monat), §§ 30/31 (Risikomanagement).
  § 8a/§ 8b kommen nicht vor. Bestandscontent wurde am 09.09.2026 umgestellt;
  `grep -rn "§ 8a\|§ 8b" client/src/content` muss leer bleiben.
- Keine erfundenen Behörden-Aktenzeichen; Aktenzeichen sind WARM-interne
  Vorgangsnummern.

## Task 8: Akt 1 — Der Ordner

**Files:** Edit `client/src/content/campaigns/kataster/events.ts`, `chapters.ts`; create `client/src/content/campaigns/kataster/act1.test.ts`.

`kt_kickoff` (Dialog) · **L1 `kt_l1_ordner`** (CLI, Design §6/L1) ·
**L2 `kt_l2_erster_eintrag`** (GUI Kataster, §6/L2) · `kt_wer_macht_das` (Dialog).

L1-`stateGoals` und L2-Tokens **wörtlich aus dem Design**. Der Köder im
Fundstapel ist Pflicht, nicht Deko.

**Verify:** `npm test -- client/src/content/campaigns/kataster/act1.test.ts`; `npm test` (Orthographie, Choice-Design).

## Task 9: Akt 2 — Die Spuren (L3/L4)

**Files:** Edit `events.ts`, `chapters.ts`; create `act2.test.ts`.

**L3 `kt_l3_null_von_280`** + Einkauf-Entscheidung (K5) ·
**L4 `kt_l4_acht_monate`** + `kat_gap_concealed`-Falle (K4).
Kapitel `kt_ch02_vertraege`.

## Task 10: Akt 2 — Die Spuren (L5/L6)

**Files:** Edit `events.ts`, `chapters.ts`; edit `act2.test.ts`.

**L5 `kt_l5_verweis_ins_leere`** + der Melden-oder-Kaschieren-Dialog (die
Kernentscheidung der Kampagne) · **L6 `kt_l6_erinnerung`**.
Kapitel `kt_ch03_papier`.

L5 braucht den `commandRan`-stateGoal auf `find … -iname` — der Negativbefund
zählt nur, wenn wirklich gesucht wurde.

L6 ist **zweistufig** (Design §6/L6 + §7.4): Anschreiben finden **und** die
Frist errechnen — letzter Nachweis + drei Jahre nach § 39
(`date -d '<datum> +3 years'`). `stateGoals` verlangen **errechnetes Datum UND
Fundstelle** in der Quellenliste — eine Zahl ohne Herleitung löst nicht.
Der VFS-Overlay muss Kalbs Nachweisdatum als lesbare Datei seeden.

## Task 11: Akt 2 — Das Register (L7)

**Files:** Edit `events.ts`, `chapters.ts`; edit `act2.test.ts`.

**L7 `kt_l7_kataster`** (GUI, Herzstück) + Jens' Vorwarn-Dialog davor.
Kapitel `kt_ch04_register`.

Kritisch: `solutions` in der Reihenfolge **Fabrication zuerst**, ehrlich danach;
die `kat_orphan_*`-Flags werden hier gesetzt und in Akt 3 gelesen.

## Task 12: Akt 3 — Die Uhr

**Files:** Edit `events.ts`, `chapters.ts`; create `act3.test.ts`.

Die Payoff-Beats aus Design §6/Akt 3, **je zwei Events pro Beat**
(`branchCondition` + `alternateEventId`): `kt_mahnung`, `kt_rechnung`,
`kt_vorstandsfrage`, `kt_bjorg_vier`, `kt_eskalation` (`mailCompose`),
**L8 ★ `kt_l8_fristen`** (optional).
Kapitel `kt_ch05_uhr`.

Test: jeder Payoff-Beat hat **beide** Varianten und beide sind erreichbar.

## Task 13: Akt 4 — Der Audit-Tag

**Files:** Edit `events.ts`, `chapters.ts`; create `act4.test.ts`.

Die fünf Fragen aus Design §4.1 als Beats; `branchCondition` = **exakt das
Domänen-Objekt aus `domains.ts`** (nicht kopiert, importiert). Zwei
Konfrontationsszenen: Q2 bei `kat_gap_concealed`, Q3 bei
`kat_owner_fabricated`. Danach Ending + Epilog.
Kapitel `kt_ch06_audit`.

## Task 14: Konsistenz-Guard + Level-Durchstiche

**Files:** Create `client/src/content/campaigns/kataster/campaignConsistency.test.ts`; create `client/src/engine/katasterLevels.test.ts`.

Konsistenztest nach Design §8.1 (AUDIT TRAILs `campaignConsistency.test.ts` ist
die Vorlage, inkl. der Prüfung „keine `chainTriggers`" und
„Flags disjunkt zu **beiden** anderen Kampagnen, beide Richtungen").

`katasterLevels.test.ts` nach dem Muster von `evidenceFirstLesson.test.ts`: pro
CLI-Level den Sollpfad durch die **echte** Shell fahren und die `stateGoals` als
erfüllt nachweisen; dazu je ein Negativtest (Artefakt geschrieben, Quelle nie
gelesen → **nicht** gelöst).

## Task 15: Full pass

**Files:** Edit `docs/CONTENT_INVENTORY.md`, `docs/GAME_MODES_SPEC.md` (Kampagnenliste), `README.md` falls die Kampagnen dort aufgezählt sind.

`npm run build && npm test && npm run test:client && npm run test:e2e`.
Danach ein manueller Durchlauf mit `.claude/skills/verify/SKILL.md`: Kampagne im
Picker wählen, Akt 1 spielen, Kataster-App bedienen, Autosave/Resume prüfen.

---

## Was in V1 bewusst fehlt (nicht als Lücke melden)

- Kein laufzeitpersistentes Register über Level hinweg (Design §7.3) — V2-Kandidat.
- Kein Zufall in der Audit-Stichprobe (Design §4.2).
- Keine Sidequests, keine Chapter-Art, kein `kat_gaps_closed`.
- Kein `kataster`-Shell-Kommando.
