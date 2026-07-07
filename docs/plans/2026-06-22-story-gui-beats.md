# Story-mode GUI Beats Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add three optional Windows-GUI "beats" to Story mode (detect → harden → contain), soft-gated by an inspect-vs-delegate choice, with a `briefingVariant` evidence-flag arc.

**Architecture:** Story mode is chapter-beat-driven (`App.tsx:102` → `getNextStoryContent`), so the GUI levels are authored as `adv_gui_*` `GameEvent`s in `client/src/content/adventure/story-events.ts` (the `adventureStoryEvents` array, which feeds `combinedEvents` in `App.tsx:92`) and referenced by new optional beats in `client/src/content/adventure/chapters.ts`. They reuse the existing `WindowsLevel` apps via `guiContext`. No `requiredModes`/`weekRange` pool reliance, no hard gates.

**Tech Stack:** TypeScript, React, Vitest. Shared types in `shared/src/types/{gui,adventure,events}.ts`.

**Design doc:** `docs/plans/2026-06-22-story-gui-beats-design.md`

**Conventions to copy (read before coding):**
- GUI event shape: `client/src/content/events/gui-levels.ts` (e.g. `gui_eventviewer_bruteforce`, `gui_settings_reharden`, `gui_taskmanager_doppelganger`).
- Adventure event shape: `client/src/content/adventure/story-events.ts` (`adv_pattern_recognition` at line ~1476).
- Chapter beat shape: `client/src/content/adventure/chapters.ts` (`{ id, eventId, isOptional }`).
- Types: `GuiContext`/`GuiSolution`/`GuiAppState` in `shared/src/types/gui.ts`; `StoryBeat` in `shared/src/types/adventure.ts`.

**Flag arc:** `story_saw_intrusion` (B1 solve) → reshapes B2 briefing → `story_hardened` (B2 solve) → reshapes B3 briefing → `story_incident_contained` (B3 solve). Every `briefingVariant.flag` MUST be produced by some GUI solution's `setsFlags` (guarded by `guiLearningIntegration.test.ts:118`).

---

## Task 1: Failing structural test for the three story-GUI beats

**Files:**
- Create: `client/src/engine/storyGuiBeats.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { adventureStoryEvents } from '../content/adventure/story-events';
import { adventureChapters } from '../content/adventure/chapters';
import { getAvailableEvents } from './eventEngine';
import { createInitialState } from './gameState';
import { GameEvent } from '@kritis/shared';

// The three soft GUI beats, their app, the chapter they belong to, the beat
// they must follow, and the evidence flag their solution sets.
const BEATS = [
  {
    id: 'adv_gui_eventviewer_probe',
    app: 'eventviewer',
    chapter: 'ch05_coincidence',
    after: 'adv_pattern_recognition',
    flag: 'story_saw_intrusion',
  },
  {
    id: 'adv_gui_settings_preharden',
    app: 'settings',
    chapter: 'ch08_calm_before',
    after: 'adv_preparation_check',
    flag: 'story_hardened',
  },
  {
    id: 'adv_gui_taskmanager_attack',
    app: 'taskmanager',
    chapter: 'ch09_attack',
    after: 'adv_ransomware_strike',
    flag: 'story_incident_contained',
  },
] as const;

const byId = new Map(adventureStoryEvents.map((e) => [e.id, e]));

describe('story-mode GUI beats', () => {
  for (const beat of BEATS) {
    describe(beat.id, () => {
      const event = byId.get(beat.id) as GameEvent | undefined;

      it('exists in adventureStoryEvents with the right guiContext app', () => {
        expect(event, `${beat.id} must be authored in story-events.ts`).toBeDefined();
        expect(event!.guiContext?.app).toBe(beat.app);
      });

      it('is soft-gated: one guiCommand choice AND one narrative choice', () => {
        const choices = event!.choices ?? [];
        expect(choices.filter((c) => c.guiCommand).length).toBe(1);
        expect(choices.filter((c) => !c.guiCommand).length).toBeGreaterThanOrEqual(1);
      });

      it('its solution sets the evidence flag', () => {
        const flags = (event!.guiContext?.solutions ?? []).flatMap((s) => s.setsFlags ?? []);
        expect(flags).toContain(beat.flag);
      });

      it('is NOT a learning-mode pool event (no requiredModes)', () => {
        expect(event!.requiredModes).toBeUndefined();
      });

      it('is referenced by an optional beat placed after its anchor', () => {
        const chapter = adventureChapters.find((c) => c.id === beat.chapter)!;
        expect(chapter, `chapter ${beat.chapter} must exist`).toBeDefined();
        const ids = chapter.storyBeats.map((b) => b.eventId);
        const anchorIdx = ids.indexOf(beat.after);
        const beatIdx = ids.indexOf(beat.id);
        expect(anchorIdx, `${beat.after} must be in ${beat.chapter}`).toBeGreaterThanOrEqual(0);
        expect(beatIdx, `${beat.id} must be a beat in ${beat.chapter}`).toBe(anchorIdx + 1);
        const guiBeat = chapter.storyBeats[beatIdx];
        expect(guiBeat.isOptional, 'GUI beat must be optional').toBe(true);
      });
    });
  }

  it('every briefingVariant flag is produced by some story-GUI solution', () => {
    const produced = new Set(
      adventureStoryEvents.flatMap((e) =>
        (e.guiContext?.solutions ?? []).flatMap((s) => s.setsFlags ?? [])
      )
    );
    for (const beat of BEATS) {
      const event = byId.get(beat.id)!;
      for (const v of event.guiContext?.briefingVariants ?? []) {
        expect(produced.has(v.flag), `briefingVariant flag ${v.flag} must come from a GUI solution`).toBe(true);
      }
    }
  });

  it('the GUI beats never enter the learning-mode pool', () => {
    const state = { ...createInitialState('SEED', 'learning'), completedEvents: [] };
    const availIds = new Set(
      getAvailableEvents([...adventureStoryEvents], state).map((e) => e.id)
    );
    for (const beat of BEATS) {
      expect(availIds.has(beat.id)).toBe(false);
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run --root client client/src/engine/storyGuiBeats.test.ts`
Expected: FAIL — the `adv_gui_*` events don't exist yet (`toBeDefined` fails).

**Step 3: Commit the failing test**

```bash
git add client/src/engine/storyGuiBeats.test.ts
git commit -m "test: failing spec for story-mode GUI beats"
```

---

## Task 2: Author Beat 1 — `adv_gui_eventviewer_probe` (detect)

**Files:**
- Modify: `client/src/content/adventure/story-events.ts` (add object to the `adventureStoryEvents` array — place it right after the `adv_pattern_recognition` object, ~line 1554)

**Step 1: Add the event**

Insert this object (mind the surrounding commas — it is a new array element):

```typescript
  {
    id: 'adv_gui_eventviewer_probe',
    title: 'Selbst nachsehen: Die Protokolle von DC01',
    category: 'story',
    weekRange: [5, 6],
    probability: 1,
    description: `Das Muster lässt dich nicht los. Wenn jemand WARM testet, dann steht es in den Logs des Domänencontrollers.

\`\`\`
[NACHRICHT VON: bjorg] "Reden wir nicht drüber, sieh nach. Sicherheitsprotokoll auf DC01.
                        Wenn da nachts jemand Konten durchprobiert, steht's da schwarz auf weiß."
\`\`\`

Du kannst dich auf den Monatsbericht des Dienstleisters verlassen — oder selbst in die Ereignisanzeige schauen.`,
    involvedCharacters: [],
    tags: ['story', 'gui', 'act2', 'chapter5', 'evidence'],
    mentorNote:
      '4625 = fehlgeschlagene Anmeldung, 4624 = erfolgreiche. Viele 4625 auf ein Konto von einer fremden IP, gefolgt von EINER 4624 derselben IP, ist ein erfolgreicher Zugriffsversuch — und genau die frühe Spur, die einen späteren Angriff ankündigt.',
    choices: [
      {
        id: 'inspect_logs',
        text: 'Sieh dir das Sicherheitsprotokoll auf DC01 selbst an',
        effects: { skills: { security: 2 } },
        resultText:
          'Du hast die Spur selbst gefunden und dokumentiert — kein Bericht hätte sie dir so klar gezeigt.',
        guiCommand: true,
      },
      {
        id: 'trust_report',
        text: 'Auf den Monatsbericht des Dienstleisters verlassen',
        effects: { stress: 3 },
        resultText:
          'Der Bericht meldet "keine Auffälligkeiten". Ein ungutes Gefühl bleibt — gesehen hast du nichts.',
      },
    ],
    guiContext: {
      app: 'eventviewer',
      title: 'Ereignisanzeige',
      hostname: 'DC01',
      briefing:
        'Filtere nach "Überwachung fehlgeschlagen", erkenne das Muster, und finde dann die EINE erfolgreiche Anmeldung (4624) von genau derselben Quelle. Wähle sie aus und klicke "Als Vorfall melden".',
      state: {
        eventViewer: {
          logName: 'Sicherheit',
          entries: [
            {
              id: 'evt-probe-legit',
              level: 'Überwachung erfolgreich',
              dateTime: '12.06.2026 07:58:10',
              source: 'Microsoft-Windows-Security-Auditing',
              eventId: 4624,
              task: 'Anmeldung',
              message:
                'Ein Konto wurde erfolgreich angemeldet.\nKonto: t.berg\nAnmeldetyp: 2 (Interaktiv)\nQuellnetzwerkadresse: 10.0.1.14\nStatus: Normale Benutzeranmeldung.',
            },
            {
              id: 'evt-probe-fail-1',
              level: 'Überwachung fehlgeschlagen',
              dateTime: '12.06.2026 02:11:03',
              source: 'Microsoft-Windows-Security-Auditing',
              eventId: 4625,
              task: 'Anmeldung',
              message:
                'Fehler bei der Anmeldung eines Kontos.\nKonto: svc_scada\nFehlerursache: Ungültiges Kennwort.\nQuellnetzwerkadresse: 185.220.101.47',
            },
            {
              id: 'evt-probe-fail-2',
              level: 'Überwachung fehlgeschlagen',
              dateTime: '12.06.2026 02:11:39',
              source: 'Microsoft-Windows-Security-Auditing',
              eventId: 4625,
              task: 'Anmeldung',
              message:
                'Fehler bei der Anmeldung eines Kontos.\nKonto: svc_scada\nFehlerursache: Ungültiges Kennwort.\nQuellnetzwerkadresse: 185.220.101.47',
            },
            {
              id: 'evt-probe-fail-3',
              level: 'Überwachung fehlgeschlagen',
              dateTime: '12.06.2026 02:12:51',
              source: 'Microsoft-Windows-Security-Auditing',
              eventId: 4625,
              task: 'Anmeldung',
              message:
                'Fehler bei der Anmeldung eines Kontos.\nKonto: svc_scada\nFehlerursache: Ungültiges Kennwort.\nQuellnetzwerkadresse: 185.220.101.47',
            },
            {
              id: 'evt-probe-success',
              level: 'Überwachung erfolgreich',
              dateTime: '12.06.2026 02:14:08',
              source: 'Microsoft-Windows-Security-Auditing',
              eventId: 4624,
              task: 'Anmeldung',
              message:
                'Ein Konto wurde erfolgreich angemeldet.\nKonto: svc_scada\nAnmeldetyp: 3 (Netzwerk)\nQuellnetzwerkadresse: 185.220.101.47\n\n⚠ Diese erfolgreiche Anmeldung folgt unmittelbar auf dutzende Fehlversuche von derselben fremden IP.',
            },
            {
              id: 'evt-probe-backup',
              level: 'Information',
              dateTime: '12.06.2026 06:00:00',
              source: 'Microsoft-Windows-Security-Auditing',
              eventId: 4624,
              task: 'Anmeldung',
              message:
                'Ein Konto wurde erfolgreich angemeldet.\nKonto: backup-svc\nAnmeldetyp: 5 (Dienst)\nStatus: Geplanter Backup-Dienst.',
            },
          ],
        },
      },
      solutions: [
        {
          interactions: ['report:evt-probe-success'],
          allRequired: true,
          resultText:
            'Treffer. Nach dutzenden Fehlversuchen meldete sich um 02:14 jemand von 185.220.101.47 erfolgreich als "svc_scada" an. Das ist kein Rauschen — das ist ein Test, der funktioniert hat. Du dokumentierst die Spur.',
          skillGain: { security: 5, windows: 3 },
          setsFlags: ['story_saw_intrusion'],
        },
      ],
      hints: [
        '🤖 Bjorg: "Filter auf \'Überwachung fehlgeschlagen\'. Fällt dir ein Konto + eine IP auf?"',
        '🤖 Bjorg: "svc_scada, von 185.220.101.47, mitten in der Nacht. Klassisches Durchprobieren."',
        '🤖 Bjorg: "Jetzt die Frage: gibt es eine ERFOLGREICHE Anmeldung (4624) von genau dieser IP? Such sie, melde sie."',
      ],
    },
  },
```

**Step 2: Run the Beat-1 portion of the test**

Run: `npx vitest run --root client client/src/engine/storyGuiBeats.test.ts -t "adv_gui_eventviewer_probe"`
Expected: the "exists / soft-gated / sets flag / no requiredModes" specs PASS; the "referenced by an optional beat" spec still FAILS (chapter not wired until Task 5).

**Step 3: Commit**

```bash
git add client/src/content/adventure/story-events.ts
git commit -m "feat(story): add detect GUI beat (Event Viewer, ch5)"
```

---

## Task 3: Author Beat 2 — `adv_gui_settings_preharden` (harden)

**Files:**
- Modify: `client/src/content/adventure/story-events.ts` (add object near the `ch08_calm_before` events; placement in the array doesn't affect ordering — selection is by chapter beat. Group it with the other new GUI events for readability.)

**Step 1: Add the event**

```typescript
  {
    id: 'adv_gui_settings_preharden',
    title: 'Vor dem Sturm: Den Schutz prüfen',
    category: 'story',
    weekRange: [7, 8],
    probability: 1,
    description: `Es ist ruhig. Zu ruhig. Wenn das Muster stimmt, kommt der eigentliche Schlag noch. Bevor er kommt, willst du wissen, ob die wichtigen Server überhaupt geschützt sind.

\`\`\`
[NACHRICHT VON: bjorg] "Prüf den Datei-Server. Defender, Manipulationsschutz, Firewall.
                        Wenn der Manipulationsschutz aus ist, kann ein Angreifer den Rest
                        einfach abschalten — dann sind wir blind."
\`\`\`

Du kannst auf die Standard-Konfiguration des Dienstleisters vertrauen — oder die Windows-Sicherheit selbst öffnen und nachhärten.`,
    involvedCharacters: [],
    tags: ['story', 'gui', 'act2', 'chapter8', 'hardening'],
    mentorNote:
      'Manipulationsschutz (Tamper Protection) ist die Wurzel: ist er aus, kann ein Angreifer Defender und Firewall einfach deaktivieren. Proaktiv aktivieren, BEVOR der Angriff kommt — nicht erst danach.',
    choices: [
      {
        id: 'harden_self',
        text: 'Windows-Sicherheit öffnen und selbst härten',
        effects: { skills: { security: 2 } },
        resultText:
          'Du hast die Lücken selbst geschlossen — und dokumentierst, was du geändert hast.',
        guiCommand: true,
      },
      {
        id: 'trust_default',
        text: 'Auf die Standard-Konfiguration des Dienstleisters vertrauen',
        effects: { stress: 2 },
        resultText:
          'Du gehst davon aus, dass schon alles passt. Geprüft hast du es nicht.',
      },
    ],
    guiContext: {
      app: 'settings',
      title: 'Windows-Sicherheit',
      hostname: 'SRV-WARM-FILE01',
      briefing:
        'Schalte die deaktivierten Schutzfunktionen wieder ein — Echtzeitschutz, Domänen-Firewall und vor allem den Manipulationsschutz. Was bereits korrekt (grün) ist, lässt du unverändert.',
      briefingVariants: [
        {
          flag: 'story_saw_intrusion',
          briefing:
            'Du hast die nächtlichen Login-Versuche auf DC01 selbst gesehen — jetzt schließ die Lücken, bevor sie wiederkommen. Aktiviere Echtzeitschutz, Domänen-Firewall und Manipulationsschutz. Was schon grün ist, lässt du in Ruhe.',
        },
      ],
      state: {
        settings: {
          settings: [
            { id: 'realtime-protection', category: 'Viren- & Bedrohungsschutz', label: 'Echtzeitschutz', description: 'Aktuell deaktiviert.', enabled: false, recommended: true },
            { id: 'tamper-protection', category: 'Viren- & Bedrohungsschutz', label: 'Manipulationsschutz', description: 'Verhindert, dass Schutzfunktionen unbefugt abgeschaltet werden.', enabled: false, recommended: true },
            { id: 'cloud-protection', category: 'Viren- & Bedrohungsschutz', label: 'Über Cloud bereitgestellter Schutz', enabled: true, recommended: true },
            { id: 'firewall-domain', category: 'Firewall- & Netzwerkschutz', label: 'Domänennetzwerk-Firewall', description: 'Aktuell deaktiviert.', enabled: false, recommended: true },
            { id: 'firewall-private', category: 'Firewall- & Netzwerkschutz', label: 'Privates Netzwerk-Firewall', enabled: true, recommended: true },
            { id: 'smartscreen', category: 'App- & Browsersteuerung', label: 'SmartScreen für Apps und Dateien', enabled: true, recommended: true },
          ],
        },
      },
      solutions: [
        {
          interactions: ['enable:realtime-protection', 'enable:firewall-domain', 'enable:tamper-protection'],
          allRequired: true,
          resultText:
            'Stark. Echtzeitschutz und Domänen-Firewall laufen wieder — und durch den Manipulationsschutz kann ein Angreifer sie nicht mehr einfach abschalten. Du hast nicht repariert, sondern vorgesorgt.',
          skillGain: { security: 4, windows: 3 },
          setsFlags: ['story_hardened'],
        },
      ],
      hints: [
        '🤖 Bjorg: "Drei Schalter stehen auf rot/\'Aktion nötig\'. Genau die brauchen wir an."',
        '🤖 Bjorg: "Echtzeitschutz und Domänen-Firewall sind klar. Aber WARUM könnte sie jemand abschalten?"',
        '🤖 Bjorg: "Manipulationsschutz. Mach den an — sonst war alles andere umsonst."',
      ],
    },
  },
```

**Step 2: Run**

Run: `npx vitest run --root client client/src/engine/storyGuiBeats.test.ts -t "adv_gui_settings_preharden"`
Expected: all but the chapter-wiring spec PASS.

**Step 3: Commit**

```bash
git add client/src/content/adventure/story-events.ts
git commit -m "feat(story): add harden GUI beat (Windows Security, ch8)"
```

---

## Task 4: Author Beat 3 — `adv_gui_taskmanager_attack` (contain)

**Files:**
- Modify: `client/src/content/adventure/story-events.ts`

**Step 1: Add the event**

```typescript
  {
    id: 'adv_gui_taskmanager_attack',
    title: 'Eindämmen: Der Prozess, der frisst',
    category: 'story',
    weekRange: [9, 10],
    probability: 1,
    description: `Es ist soweit. Der Datei-Server reagiert kaum noch, Dateien bekommen reihenweise eine neue Endung. Das ist kein Ausfall — das ist eine Verschlüsselung, live.

\`\`\`
[NACHRICHT VON: bjorg] "Geh sofort auf die Konsole von FILE01. Irgendein Prozess verschlüsselt
                        gerade alles. Finde ihn, beende ihn — aber kill nicht das halbe System
                        im Panikmodus."
\`\`\`

Jede Minute zählt.`,
    involvedCharacters: [],
    tags: ['story', 'gui', 'act3', 'chapter9', 'crisis', 'containment'],
    mentorNote:
      'Bei laufender Ransomware: den schädlichen Prozess identifizieren und stoppen, NICHT blind das System killen. Ein Prozess mit hoher CPU/Disk-Last, gestartet aus einem Temp-Ordner und ohne verifizierten Herausgeber, ist der Übeltäter — System-Prozesse blockt Windows ohnehin.',
    choices: [
      {
        id: 'contain_self',
        text: 'An die Konsole — den Prozess finden und gezielt beenden',
        effects: { skills: { security: 2 } },
        resultText:
          'Du gehst chirurgisch vor: den richtigen Prozess gestoppt, den Server am Leben gelassen.',
        guiCommand: true,
      },
      {
        id: 'pull_plug',
        text: 'Stecker ziehen — Server hart vom Netz und aus',
        effects: { stress: 6, skills: { security: 1 } },
        resultText:
          'Die Verschlüsselung stoppt — aber du verlierst flüchtige Spuren und reißt den Server abrupt aus dem Betrieb. Eingedämmt, aber grob.',
      },
      {
        id: 'call_external',
        text: 'Externen Notdienst rufen und warten',
        effects: { stress: 4, compliance: -5 },
        resultText:
          'Der Notdienst meldet sich in 40 Minuten zurück. In der Zeit verschlüsselt der Prozess weiter. Wertvolle Minuten verloren.',
      },
    ],
    guiContext: {
      app: 'taskmanager',
      title: 'Task-Manager',
      hostname: 'SRV-WARM-FILE01',
      briefing:
        'Finde den Prozess, der gerade verschlüsselt: hohe Last, gestartet aus einem Temp-Ordner, kein verifizierter Herausgeber. Wähle ihn aus und beende ihn — System-Prozesse lässt du in Ruhe.',
      briefingVariants: [
        {
          flag: 'story_hardened',
          briefing:
            'Dein Manipulationsschutz hat gehalten — Defender läuft noch und hat den Angreifer ausgebremst. Der schädliche Prozess sticht dadurch klar heraus. Wähl ihn aus und beende ihn, die System-Prozesse lässt du in Ruhe.',
        },
      ],
      state: {
        taskManager: {
          processes: [
            { name: 'System', pid: 4, cpu: 1, memoryMb: 24, description: 'NT Kernel & System', critical: true },
            { name: 'svchost.exe', pid: 1008, cpu: 2, memoryMb: 150, description: 'Hostprozess für Windows-Dienste', critical: true },
            { name: 'lsass.exe', pid: 780, cpu: 1, memoryMb: 40, description: 'Lokale Sicherheitsautorität', critical: true },
            { name: 'MsMpEng.exe', pid: 2901, cpu: 18, memoryMb: 520, description: 'Antimalware Service Executable (Microsoft Defender)' },
            { name: 'explorer.exe', pid: 3210, cpu: 1, memoryMb: 198, description: 'Windows-Explorer' },
            { name: 'svhost32.exe', pid: 9120, cpu: 91, memoryMb: 770, description: 'Unbekannt — gestartet aus C:\\Users\\Public\\Temp, kein verifizierter Herausgeber, hohe Datenträgeraktivität' },
            { name: 'OUTLOOK.EXE', pid: 4402, cpu: 2, memoryMb: 300, description: 'Microsoft Outlook' },
          ],
        },
      },
      solutions: [
        {
          interactions: ['endtask:svhost32.exe'],
          allRequired: true,
          resultText:
            'Richtig! "svhost32.exe" (kein echter Windows-Name) lief aus C:\\Users\\Public\\Temp und schrieb pausenlos auf die Platte — der Verschlüsselungsprozess. Beendet. Die Verschlüsselung stoppt sofort, der Server bleibt am Netz.',
          skillGain: { security: 4, troubleshooting: 4, windows: 2 },
          setsFlags: ['story_incident_contained'],
        },
      ],
      hints: [
        '🤖 Bjorg: "MsMpEng mit 18% ist nur der Defender. Lass den."',
        '🤖 Bjorg: "Lies die Namen genau. svchost… svhost32… und woher gestartet?"',
        '🤖 Bjorg: "C:\\Users\\Public\\Temp, unsigniert, 91% Last. Das ist er. Beenden."',
      ],
    },
  },
```

**Step 2: Run**

Run: `npx vitest run --root client client/src/engine/storyGuiBeats.test.ts -t "adv_gui_taskmanager_attack"`
Expected: all but the chapter-wiring spec PASS.

**Step 3: Commit**

```bash
git add client/src/content/adventure/story-events.ts
git commit -m "feat(story): add contain GUI beat (Task Manager, ch9)"
```

---

## Task 5: Wire the three beats into chapters

**Files:**
- Modify: `client/src/content/adventure/chapters.ts` — `ch05_coincidence`, `ch08_calm_before`, `ch09_attack` `storyBeats` arrays.

**Step 1: Add each optional beat directly AFTER its anchor beat.**

In `ch05_coincidence.storyBeats`, after the `adv_pattern_recognition` entry:

```typescript
      { id: 'beat_gui_probe', eventId: 'adv_gui_eventviewer_probe', isOptional: true },
```

In `ch08_calm_before.storyBeats`, after the `adv_preparation_check` entry:

```typescript
      { id: 'beat_gui_preharden', eventId: 'adv_gui_settings_preharden', isOptional: true },
```

In `ch09_attack.storyBeats`, after the `adv_ransomware_strike` entry:

```typescript
      { id: 'beat_gui_contain', eventId: 'adv_gui_taskmanager_attack', isOptional: true },
```

**Step 2: Run the full structural test**

Run: `npx vitest run --root client client/src/engine/storyGuiBeats.test.ts`
Expected: PASS (all specs, including "referenced by an optional beat placed after its anchor").

**Step 3: Commit**

```bash
git add client/src/content/adventure/chapters.ts
git commit -m "feat(story): place GUI beats as optional chapter beats (ch5/ch8/ch9)"
```

---

## Task 6: Regression — existing guards stay green

**Files:** none (verification only).

**Step 1: Run the consistency + GUI-integration guards**

Run: `npx vitest run --root client client/src/engine/campaignConsistency.test.ts client/src/engine/guiLearningIntegration.test.ts`
Expected: PASS. (If `campaignConsistency` requires a field on story events that the new objects lack, add it to match the neighbouring `adv_*` events, then re-run.)

**Step 2: Typecheck**

Run: `npx tsc --noEmit -p client/tsconfig.json`
Expected: no output (clean).

**Step 3: Full client suite**

Run: `npx vitest run --root client`
Expected: all test files pass.

**Step 4: Commit (only if Step 1 required a field fix)**

```bash
git add -A
git commit -m "test: keep story-GUI beats consistent with campaign guards"
```

---

## Task 7 (OPTIONAL): One narrative nod to `story_incident_contained`

Only if desired — the design lists this as optional and it touches a finale/audit event (extra campaign-consistency surface).

**Files:**
- Modify: an Act-3 audit/Probezeit outcome event (e.g. in `client/src/content/events/story/story-week9-12.ts` or the relevant `adv_*` finale event).

**Step 1:** Add a `requires: { flags: ['story_incident_contained'] }` *hidden* choice (or a `setsFlags`-driven `briefingVariant`) that acknowledges the player contained the live attack hands-on. Keep it additive — never remove or gate the existing path.

**Step 2:** Run `npx vitest run --root client` and `npx tsc --noEmit -p client/tsconfig.json`. Expected: green.

**Step 3:** Commit: `git commit -am "feat(story): acknowledge hands-on containment in Act-3 outcome"`

---

## Done criteria

- `storyGuiBeats.test.ts` passes (existence, soft-gate, flag origin, chapter placement, learning-exclusion).
- `campaignConsistency` + `guiLearningIntegration` green; typecheck clean; full client suite green.
- Beats 1 & 2 reachable now in a Story playthrough of ch5/ch8; Beat 3 ready for ch9 once Act 3 is live.
