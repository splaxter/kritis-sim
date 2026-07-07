# Modulares Interface — Presentation Layer

_Ziel: Die UI vom Story-Mode-Design entkoppeln. Jeder Modus (und jede neue „Experience" wie der Blackout-Slice) **deklariert**, was er anzeigt; ein generischer Shell rendert das. Neue Modi = Config + ggf. ein Widget, **nicht** ein weiterer `if`-Zweig._

## Problem (im Code verankert)

Die aktuelle Oberfläche **ist** der Story-/Sim-HUD, und alle Modi werden hindurchgezwängt:

- **`GameModeConfig`** (`shared/src/types/gameMode.ts`) hat **keine** Presentation-Ebene. Jeder Modus trägt `startingStats.skills` und `startingRelationships` — Skills/Beziehungen sind als universell angenommen.
- **`StatsBar`** (`components/StatsBar/index.tsx`) ist ein Monolith: der Default-Header rendert fest ein 6-Skills-Grid + 5-Beziehungen-Grid + Stress/Budget/Compliance-Leiste, plus eine inline `LearningModeHeader`-Sonderlocke per `if`.
- **`GameScreen/index.tsx`** verzweigt dreifach (`learning` / `isStoryMode` / Default) und baut den Rahmen jeweils neu — ruft aber überall dieselbe `StatsBar`.
- **`GameState`** (`shared/src/types/gameState.ts`) backt `skills`, `relationships`, `stress`, `budget`, `compliance` als Pflichtfelder ein. Modi ohne diese Konzepte (Lernmodus, künftiger Blackout-Incident) schleppen und zeigen sie trotzdem.

Folge: Eine 4. Experience (Blackout-Incident: Uhr + Containment + Ziele, **keine** Skills/Beziehungen) würde heute einen 4. `if`-Zweig in GameScreen **und** StatsBar bedeuten. Skaliert nicht.

---

## Zielbild: drei Registries + ein Shell

Statt mode-spezifischer `if`-Zweige eine **deklarative** Presentation-Ebene.

### 1. Metric-Registry — `presentation/metrics.ts`

Jede anzeigbare Größe wird ein Deskriptor, der den Wert aus dem State zieht. Kapselt die heutige `bands.ts`-Logik hinter Deskriptoren.

```ts
type MetricKind = 'bar' | 'gauge' | 'counter' | 'currency' | 'progress' | 'badge';

interface MetricDescriptor {
  id: string;                      // 'stress' | 'compliance' | 'skill.linux' | 'rel.chef'
                                   //   | 'lessonProgress' | 'incidentClock' | 'containment'
  label: string;
  kind: MetricKind;
  select: (s: GameState) => number | string;
  range?: [number, number];
  band?: (v: number, s: GameState) => string;   // reuse bands.ts → tailwind class
  lose?: (s: GameState) => boolean;              // optional Game-Over-Hervorhebung
}

export const METRICS: Record<string, MetricDescriptor> = { /* … */ };
```

Bestehende Felder werden gewrappt (`stress`, `compliance`, `budget`, `skill.*`, `rel.*`); neue abgeleitete kommen dazu (`lessonProgress`, und für Blackout `incidentClock`, `containment`, `objectivesDone`).

### 2. Panel-Registry — `presentation/panels.ts`

Jeder visuelle Block wird eine kleine, „dumme" Komponente unter einer ID.

```ts
interface PanelDescriptor {
  id: string;                                  // 'skillsGrid' | 'relationshipsGrid'
                                               //   | 'resourceStrip' | 'lessonHeader'
                                               //   | 'incidentHeader' | 'objectiveList' | 'mentorNote'
  component: React.FC<{ state: GameState }>;
  visible?: (s: GameState) => boolean;
}
```

Die heutige StatsBar-Markup wird in `skillsGrid`, `relationshipsGrid`, `resourceStrip` zerlegt; `LearningModeHeader` wird zum first-class `lessonHeader`-Panel.

### 3. HUD-Schema pro Modus — `GameModeConfig.presentation`

`GameModeConfig` um ein **optionales** Feld erweitern:

```ts
type HudLayout = 'narrative' | 'sim' | 'focus' | 'incident';

interface ModePresentation {
  layout: HudLayout;     // Gesamtrahmen
  header: string;        // PanelId für die Kopfzeile
  meters: string[];      // MetricIds in der Status-Leiste ([] = keine)
  panels: string[];      // weitere/aufklappbare Blöcke ([] = keine)
}

interface GameModeConfig {
  // … bestehende Felder unverändert …
  presentation?: ModePresentation;   // optional → Fallback = heutiges Sim-HUD
}
```

`optional` ist der Sicherheitsanker: fehlt `presentation`, greift `simDefault` = exakt die heutige Darstellung → **kein** Verhaltenswechsel für bestehende Modi.

### 4. `<HudShell>` ersetzt die Verzweigung

Eine generische Shell-Komponente liest `presentation` und rendert Header-Panel + Meter-Leiste + deklarierte Panels um einen `children`-Content-Slot.

```tsx
<HudShell presentation={config.presentation ?? SIM_DEFAULT} state={state}>
  {content /* EventCard | Terminal | WindowsLevel — nach Phase gewählt, NICHT nach Modus */}
</HudShell>
```

`GameScreen` wählt nur noch den **Content** nach Phase und wickelt ihn in `<HudShell>`. Die drei `if`-Zweige kollabieren zu einem Pfad.

---

## Profile pro Modus

| Modus | layout | header | meters | panels |
|---|---|---|---|---|
| beginner / kritis / intermediate / hard | `sim` | `resourceStrip` | stress, budget, compliance | skillsGrid, relationshipsGrid |
| story | `narrative` | `storyHeader` | stress, compliance | relationshipsGrid (skills eingeklappt) |
| learning | `focus` | `lessonHeader` | lessonProgress | — |
| **blackout** (Track in learning) | `incident` | `incidentHeader` | incidentClock, containment | objectiveList |

`sim`/`narrative` reproduzieren das heutige Bild; `focus` ersetzt die `LearningModeHeader`-Sonderlocke; `incident` ist die neue, von Skills/Beziehungen befreite Experience.

> **Realitäts-Hinweis:** Blackout ist als **Learning-Track** umgesetzt (`content/events/blackout.ts`, GUI-App `corefirewall`) und läuft damit **im learning-Modus**. Eine rein mode-basierte `presentation` würde dort also `focus` ziehen, nicht `incident`. Damit die Blackout-Level den Incident-HUD bekommen, braucht die Auflösung eine **Event-/Track-Ebene** (siehe Resolution-Reihenfolge unten) — sonst bliebe `incident` nur für einen späteren eigenständigen Blackout-Modus reserviert.

---

## Referenz-Skelett (kopierbar)

### `shared/src/types/presentation.ts` (neu)

```ts
export type HudLayout = 'narrative' | 'sim' | 'focus' | 'incident';

export interface ModePresentation {
  layout: HudLayout;
  header: string;     // PanelId
  meters: string[];   // MetricId[]  ([] = keine Status-Leiste)
  panels: string[];   // PanelId[]   ([] = keine Seiten-/Aufklapp-Blöcke)
}
```

In `shared/src/types/gameMode.ts` ergänzen (optional → Fallback bleibt das heutige Sim-HUD):

```ts
import { ModePresentation } from './presentation';

export interface GameModeConfig {
  // … bestehende Felder unverändert …
  presentation?: ModePresentation;
}
```

### `client/src/presentation/metrics.ts` (neu)

Wrappt bestehende `GameState`-Felder und die vorhandene `bands.ts`-Logik — keine neue Farb-/Schwellen-Logik.

```ts
import { GameState } from '@kritis/shared';
// reuse: components/StatsBar/bands.ts
import { BAND_CLASS, stressBand, complianceBand, budgetClass, skillTierClass } from '../components/StatsBar/bands';

export type MetricKind = 'bar' | 'gauge' | 'counter' | 'currency' | 'progress' | 'badge';

export interface MetricDescriptor {
  id: string;
  label: string;
  kind: MetricKind;
  select: (s: GameState) => number;
  range?: [number, number];
  /** Tailwind-Klasse pro Wert; greift auf bands.ts zurück. */
  colorClass?: (v: number, s: GameState) => string;
}

const stressMax = (s: GameState) => /* getGameModeConfig(s.gameMode).thresholds.stressGameOver */ 100;

export const METRICS: Record<string, MetricDescriptor> = {
  stress:     { id:'stress',     label:'Stress',     kind:'bar', range:[0,100],
                select:s=>s.stress,     colorClass:(v,s)=>BAND_CLASS[stressBand(v, stressMax(s))] },
  compliance: { id:'compliance', label:'Compliance', kind:'gauge', range:[0,100],
                select:s=>s.compliance, colorClass:(v)=>BAND_CLASS[complianceBand(v)] },
  budget:     { id:'budget',     label:'Budget',     kind:'currency',
                select:s=>s.budget,     colorClass:(v)=>budgetClass(v) },

  // Skills/Beziehungen: ein Deskriptor pro Feld (oder generativ erzeugt)
  'skill.linux':  { id:'skill.linux',  label:'Linux',  kind:'bar', range:[0,100],
                    select:s=>s.skills.linux, colorClass:v=>skillTierClass(v) },
  'rel.chef':     { id:'rel.chef',     label:'Chef',   kind:'bar', range:[-100,100],
                    select:s=>s.relationships.chef },

  // Lernmodus
  lessonProgress: { id:'lessonProgress', label:'Fortschritt', kind:'progress', range:[0,100],
                    select:s=>Math.round(s.completedEvents.filter(id=>id.startsWith('learn_')).length / 11 * 100) },

  // Incident (Blackout) — aus Flags/State abgeleitet
  containment:    { id:'containment',  label:'Containment', kind:'gauge', range:[0,3],
                    select:s=>['blk_process_stopped','blk_attacker_cut','solution_firewall_locked']
                               .filter(f=>s.flags[f]).length },
  incidentClock:  { id:'incidentClock', label:'Pumpe 3', kind:'gauge', range:[0,100],
                    select:s=> s.flags['solution_firewall_locked'] ? 100 : 40 },
};
```

### `client/src/presentation/panels.tsx` (neu)

Die heutige `StatsBar`-Markup wird in kleine, „dumme" Panels zerlegt; `LessonHeader` ist die bisherige `LearningModeHeader`.

```tsx
import type { FC } from 'react';
import { GameState } from '@kritis/shared';
import { SkillsGrid, RelationshipsGrid, ResourceStrip } from './panels/sim';
import { LessonHeader } from './panels/LessonHeader';
import { IncidentHeader, ObjectiveList } from './panels/incident';

export interface PanelDescriptor {
  id: string;
  component: FC<{ state: GameState }>;
  visible?: (s: GameState) => boolean;
}

export const PANELS: Record<string, PanelDescriptor> = {
  skillsGrid:        { id:'skillsGrid',        component: SkillsGrid },
  relationshipsGrid: { id:'relationshipsGrid', component: RelationshipsGrid },
  resourceStrip:     { id:'resourceStrip',     component: ResourceStrip },
  lessonHeader:      { id:'lessonHeader',      component: LessonHeader },
  incidentHeader:    { id:'incidentHeader',    component: IncidentHeader },
  objectiveList:     { id:'objectiveList',     component: ObjectiveList },
};
```

### `client/src/presentation/MetricStrip.tsx` (neu)

```tsx
import { GameState } from '@kritis/shared';
import { METRICS } from './metrics';

export function MetricStrip({ state, ids }: { state: GameState; ids: string[] }) {
  return (
    <div className="metric-strip flex gap-8 text-sm">
      {ids.map(id => {
        const m = METRICS[id];
        if (!m) return null;
        const v = m.select(state);
        const cls = m.colorClass?.(v, state) ?? '';
        // kind → Renderer (bar/gauge/progress/currency …) — hier vereinfacht
        return (
          <span key={id} className={cls}>
            <span className="text-terminal-green-dim">{m.label}:</span>{' '}
            {m.kind === 'currency' ? `€${v.toLocaleString('de-DE')}` : v}
          </span>
        );
      })}
    </div>
  );
}
```

### `client/src/presentation/HudShell.tsx` (neu) — ersetzt die Verzweigung

```tsx
import type { ReactNode } from 'react';
import { GameState, getGameModeConfig, ModePresentation } from '@kritis/shared';
import { PANELS } from './panels';
import { MetricStrip } from './MetricStrip';
import { resolvePresentation, SIM_DEFAULT } from './profiles';

export function HudShell({ state, children }: { state: GameState; children: ReactNode }) {
  const p: ModePresentation = resolvePresentation(state) ?? SIM_DEFAULT;
  const Header = PANELS[p.header]?.component;

  return (
    <div className={`hud hud--${p.layout}`}>
      {Header && <Header state={state} />}
      {p.meters.length > 0 && <MetricStrip state={state} ids={p.meters} />}
      <div className="hud-content">{children}</div>
      {p.panels.map(id => {
        const desc = PANELS[id];
        if (!desc || (desc.visible && !desc.visible(state))) return null;
        const Panel = desc.component;
        return <Panel key={id} state={state} />;
      })}
    </div>
  );
}
```

### `client/src/presentation/profiles.ts` (neu) — Profile + Resolution-Reihenfolge

```ts
import { GameState, GameModeId, getGameModeConfig, ModePresentation } from '@kritis/shared';

export const SIM_DEFAULT: ModePresentation = {
  layout:'sim', header:'resourceStrip',
  meters:['stress','budget','compliance'],
  panels:['skillsGrid','relationshipsGrid'],
};

export const PRESENTATIONS: Partial<Record<GameModeId, ModePresentation>> = {
  beginner: SIM_DEFAULT,
  kritis:   SIM_DEFAULT,
  story:    { layout:'narrative', header:'storyHeader', meters:['stress','compliance'], panels:['relationshipsGrid'] },
  learning: { layout:'focus',     header:'lessonHeader', meters:['lessonProgress'],     panels:[] },
};

export const INCIDENT: ModePresentation = {
  layout:'incident', header:'incidentHeader',
  meters:['incidentClock','containment'], panels:['objectiveList'],
};

/**
 * Resolution-Reihenfolge (spezifisch → generisch):
 *   1. Event-/Track-Override  (z. B. Blackout-Level → INCIDENT, obwohl Modus = learning)
 *   2. config.presentation    (am GameModeConfig deklariert)
 *   3. PRESENTATIONS[mode]     (Profil-Default)
 *   4. SIM_DEFAULT            (Fallback = heutiges Bild)
 */
export function resolvePresentation(s: GameState): ModePresentation {
  const blackoutLevel = s.activeEvents?.some(id => id.startsWith('blk_'));
  if (blackoutLevel) return INCIDENT;                       // (1) Track-Override
  return getGameModeConfig(s.gameMode).presentation        // (2)
      ?? PRESENTATIONS[s.gameMode]                          // (3)
      ?? SIM_DEFAULT;                                       // (4)
}
```

### `GameScreen` — vorher/nachher

```tsx
// vorher: drei hartverdrahtete Zweige
if (state.gameMode === 'learning') { return (/* eigener Rahmen + StatsBar */); }
if (state.isStoryMode)             { return (/* eigener Rahmen + StatsBar */); }
return (/* Default-Rahmen + StatsBar */);

// nachher: ein Pfad — Content nach Phase, Rahmen aus der Deklaration
const content = renderPhase(state);   // EventCard | Terminal | WindowsLevel
return <HudShell state={state}>{content}</HudShell>;
```

---

## State-Entkopplung (gephased, optional)

- **Phase 1 (kein Modell-Eingriff):** `GameState` bleibt Superset. Ungenutzte Metriken werden in einem Modus schlicht von **keinem** Deskriptor selektiert → nicht angezeigt. Niedrigstes Risiko, rein Presentation.
- **Phase 2 (optional, nur falls nötig):** `ModePresentation.resources?: string[]` als autoritative „aktive Ressourcen"; `applyEffects` überspringt inaktive (z. B. damit ein Blackout-Incident keine `compliance` akkumuliert). Erst bauen, wenn der reine Presentation-Split nicht reicht.

Bewusst **nicht** Teil dieses Plans: ein generisches Quest-/Objective-Engine, Theming-Refactor, oder das Auseinanderziehen von `GameState` in mehrere Typen.

---

## Migration & Sicherheit (reiner Refactor zuerst)

1. **Extraktion ohne Verhaltensänderung:** heutige StatsBar-Markup in `skillsGrid` / `relationshipsGrid` / `resourceStrip` / `lessonHeader`-Panels herausziehen; `SIM_DEFAULT` + `FOCUS`-Profil so verdrahten, dass die Ausgabe **pixelgleich** bleibt. Bestehende `StatsBar`/`bands`-Tests bleiben grün.
2. **GameScreen entzweigen:** `learning`/`isStoryMode`/Default → ein Pfad über `<HudShell>`.
3. **`incident`-Layout** + `incidentHeader`/`objectiveList`-Panels + `incidentClock`/`containment`-Metriken hinzufügen — der einzige wirklich neue UI-Teil.
4. `GameModeConfig.presentation` ist optional → Modi müssen **nicht** alle gleichzeitig angefasst werden.

---

## Tests

- **Parität:** Snapshot/Markup-Vergleich für beginner/story/learning — der Refactor darf die Ausgabe nicht verändern (bestehende StatsBar-Tests als Basis).
- **Metric-Deskriptoren:** Unit-Tests analog `bands.test.ts` (Wert-Selektion + Band-Klasse).
- **`incident`-Layout:** Render-Test (Clock + Containment + Objective-Liste sichtbar, **keine** Skills/Beziehungen).

---

## Payoff & Verbindung zum Blackout-Slice

Der Blackout-Slice (`docs/BLACKOUT_SLICE.md`) deklariert dann nur:

```ts
presentation: { layout: 'incident', header: 'incidentHeader',
                meters: ['incidentClock', 'containment'], panels: ['objectiveList'] }
```

— und bekommt einen Uhr/Ziel-HUD ganz ohne Skills/Beziehungen, **ohne** neuen GameScreen-Zweig. Bergmanns Funk/Druck (Descriptions, `hints`, `briefingVariants`) bleibt unberührt; der `incidentClock` macht den Countdown jetzt sichtbar statt nur im Text.

---

## Empfohlene Bau-Reihenfolge

1. Metric-Registry (Wrapper um bestehende Felder + `bands.ts`).
2. Panel-Registry (StatsBar-Markup zerlegen, paritätserhaltend).
3. `<HudShell>` + `SIM_DEFAULT`/`narrative`/`focus`-Profile; GameScreen entzweigen.
4. Paritäts-Tests grün.
5. `incident`-Layout + Panels/Metriken — andockbar an den Blackout-Slice.
