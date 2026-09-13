# Lernpfad: NIS-2-Track + Grundlagen-Skip — Umsetzungsplan

**Design-Doc:** `docs/plans/2026-09-12-nis2-lernpfad-design.md` — **bei Widerspruch gewinnt das Design-Doc.**

**Ziel:** Der Lernpfad bekommt (A) einen Einstufungstest, der die Grundlagen
ersetzt, und (B) den Track „Pflicht & Nachweis" mit 4 Kern- und 1 optionalen
Level plus der neuen GUI-App `meldung`.

**Architektur:** Phase A liefert die App isoliert und vollständig getestet,
bevor Content sie benutzt (Muster aus dem Kataster-Bau, hat sich bewährt).
Phase B ist der Skip — klein, unabhängig, sofort auslieferbar. Phase C schreibt
den Track. Jede Phase ist separat committbar; bestehende Tracks dürfen sich in
keiner Phase anders verhalten.

---

## Orientierung — geprüfte Anker (zitieren, nicht neu suchen)

| Was | Wo |
|---|---|
| Grundlagen-Riegel | `client/src/engine/learningPath.ts:22` (`isFoundationsComplete`), Sperre in Zeile 33 |
| Track-Definitionen | `client/src/content/events/learning-tracks.ts` — `order` 0–11, foundations hat `isFoundations: true` |
| `LearningTrack`-Typ | `shared/src/types/learning.ts:8` |
| Hub-CTA + Enter-Kette | `client/src/components/LearningHub/index.tsx:41-78` (`recommended`, `ctaRef`) |
| GUI-App-Union | `shared/src/types/gui.ts:11` (`GuiAppId`), `GuiAppState` direkt darunter |
| App-Dispatch | `client/src/components/WindowsLevel/index.tsx` — `APP_ICONS` + `switch (context.app)` |
| Rücknahme-Primitiv | `client/src/components/WindowsLevel/useGuiLevel.ts` — `retract(token)` |
| Dev-Preview | `client/src/components/WindowsLevel/DevGuiPreview.tsx` |
| e2e nimmt Level automatisch | `e2e/levels.spec.ts:25` — Sollwert steigt 72 → 77 |

**Fallen aus dem Kataster-Bau, die hier wieder greifen:**

1. `seedVfsFromScenario` materialisiert **jeden** in `taskText`/`hints` genannten
   Pfad und füllt ihn mit dem Dateinamen. Der Name einer zu schreibenden Datei
   darf nie enthalten, worauf ihr Inhaltsziel prüft.
2. `commandRan` matcht die Kommando**zeile als Text** — immer mit `^` verankern,
   sonst erfüllt ein `echo "… grep …"` das Ziel.
3. `performed` ist ein Verlauf. Formularfelder sind Zustände → `retract`.
4. Eine Szene, die aus mehreren Zuständen erreichbar ist, muss in jedem wahr
   sein (`branch-truthfulness`).
5. Orthographie: echte Umlaute in allem, was angezeigt wird **und** in
   Kommentaren. `vertraege`, `pruef`, `fuer`, `ueber`, `gruen` … sind gesperrt.

---

## Phase A — die App `meldung`

### Task 1: Typen ✅ *(zu tun)*
**Files:** Edit `shared/src/types/gui.ts`

`'meldung'` in `GuiAppId`, `meldung?: MeldungState` in `GuiAppState`, dazu
`MeldungStufe`, `Tristate`, `MeldungFeld`, `MeldungState` wie in Design §6.

**Vertragskommentar an `Tristate`** — analog zu `KatasterPerson.isGroup`:
> Weder Wert noch Rendering dürfen verraten, ob „nein" belegt oder erfunden ist.
> Das Urteil liegt in der `GuiSolution` des Levels, nie in der Komponente.

`npm run build -w shared` muss grün sein, bevor es weitergeht.

### Task 2: Komponente
**Files:** Create `client/src/components/WindowsLevel/apps/Meldung.tsx`

Fluent-Formular: Kopf mit `empfaenger`, `rechtsgrundlage`, `kenntnisSeit`;
darunter die Felder nach `kind`; optional der `vorbefund` als read-only Block;
unten „Meldung absenden".

- Jede Wertänderung: `retract(alterToken)` **vor** `emit(neuerToken)`.
- `submit` prüft `required` **lokal** und weist mit einer Meldung zurück, ohne
  zu emittieren — eine unvollständige Meldung ist kein Lösungsversuch.
- Exportiere eine reine Hilfsfunktion `missingRequired(state, values): string[]`
  für den Test.
- Keine eigene Tastaturlogik. Normale Fokusreihenfolge.

### Task 3: Dispatch + Browser-Tests
**Files:** Edit `WindowsLevel/index.tsx`; create `Meldung.browser.test.tsx`

`APP_ICONS.meldung = '📨'`, `case 'meldung'`, `emit` **und** `retract` durchreichen.

Tests: Felder rendern; Tristate hat drei Werte; Pflichtfeld-Rückweisung
emittiert nichts; geänderter Wert nimmt den alten Token zurück; **Vertragstest:**
„nein" und „unbekannt" rendern gleichwertig, kein Warnhinweis, kein `role="alert"`.

### Task 4: Dev-Preview
**Files:** Edit `DevGuiPreview.tsx` — `meldungSample` + Eintrag, `?preview=meldung`.

---

## Phase B — der Einstufungstest

### Task 5: Riegel öffnen
**Files:** Edit `client/src/engine/learningPath.ts`, create `learningPath.skip.test.ts`

`isFoundationsComplete` akzeptiert zusätzlich `state.flags.learn_foundations_proven`
(Design §4.1). Kommentar dazu, **warum** nicht die vier Level als erledigt
eingetragen werden.

Tests: Flag öffnet alle Tracks; ohne Flag und ohne Level bleibt alles zu; das
Testlevel selbst ist in keinem Track enthalten; `getRecommendedNext` empfiehlt
nach dem Skip einen echten Track, nicht die Grundlagen.

### Task 6: Das Level
**Files:** Create-or-edit `client/src/content/events/learning-path.ts` (Level
`learn_00_einstufung`), registrieren in `content/events/index.ts`

CLI nach Design §4.2. Hinweise **bewusst knapp** — wer sie braucht, gehört in
den regulären Pfad. `commandRan` auf `^\\s*grep\\b.*-r` verankert.

### Task 7: Hub-Einstieg
**Files:** Edit `LearningHub/index.tsx` + Browser-Test

Zweitzeile unter dem CTA, nur solange die Grundlagen offen sind und der Test
nicht bestanden ist. Taste `[T]`. Die bestehende Enter-Kette darf sich **nicht**
ändern — der Test ist nie die Empfehlung.

Nach bestandenem Test zeigt die Grundlagen-Karte „übersprungen — Test bestanden".

---

## Phase C — der Track

### Task 8: Track-Gerüst
**Files:** Edit `learning-tracks.ts`, `learning-tracks.test.ts`

`nis2_duty` bei `order: 6`, nachfolgende Tracks +1. Zuerst nur die Track-Definition
mit den fünf `eventId`s; die Level folgen in Task 9–12. **Achtung:** solange die
Events fehlen, ist `learning-tracks.test.ts` rot — daher Task 8 und 9 zusammen
committen oder Task 8 zuletzt.

### Task 9: L1 + L4 (CLI)
**Files:** Create `client/src/content/events/learning-path-nis2.ts`, in `index.ts` registrieren

`learn_nis2_01_schwelle` (§ 2, „kann verursachen") und
`learn_nis2_04_wer_war_das` (Shared Account, Nichtzuordenbarkeit als Befund).

### Task 10: L2 (GUI Erstmeldung) — das Kernstück
Formular nach Design §5.2. Lösungsreihenfolge **Risiko vor Lob**:
erfundene Gewissheit zuerst, korrekter Weg zuletzt.

### Task 11: L3 (GUI Folgemeldung)
`vorbefund` zeigt die Erstmeldung. Wer dort `nis2_claimed_certainty` gesetzt hat,
bekommt eine Briefing-Variante (`briefingVariants`), in der der Widerspruch
benannt wird.

### Task 12: L5 ★ (optional, Doku + § 39)

### Task 13: Track-Guards
**Files:** Create `client/src/content/events/nis2Track.test.ts`

≥2 ungated Optionen je Level; Hinweis-Eskalation (hints[0] nennt nie den Befehl);
kein Inhaltsziel, das vom vorab materialisierten Platzhalter erfüllt wird;
Rechtszitate nur in geltender Fassung (`grep -c "§ 8a\|§ 8b"` = 0).

### Task 14: Full pass
`npm run build && npm test && npm run test:client && npx playwright test`
(e2e-Sollwert 77 statt 72). Danach Durchspielen nach `.claude/skills/verify/SKILL.md`:
Einstufungstest bestehen, Track öffnen, L2 einmal falsch und einmal richtig.

### Task 15: Doku
`docs/CONTENT_INVENTORY.md` (Lernpfad: 31 → 36 Lektionen, 8 → 9 Tracks),
`docs/GAME_MODES_SPEC.md`, `README.md` (Lernbereich-Zeile).

---

## Reihenfolge

Phase A → Phase B → Phase C. **Phase B ist unabhängig auslieferbar** — wenn der
Track länger dauert, kann der Skip allein gemergt werden; er hat für erfahrene
Spieler den unmittelbarsten Nutzen.
