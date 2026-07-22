# Mobile Learning Layout Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Lernlevels öffnen auf Mobile zuverlässig am Anfang und Hub, HUD, Eventbeschreibung sowie Terminal bleiben bei 320 px Breite vollständig erreichbar, ohne dokumentweiten Horizontal-Overflow.

**Architecture:** `EventCard` trennt den Event-Einstieg von der tastaturgetriebenen Auswahlbewegung: ein Eventwechsel setzt das Dokument nach oben, während nur echte Keyboard-Navigation einen Choice-Button scrollt. Responsive Tailwind-Verträge an den vier betroffenen Flex-/Content-Grenzen halten breite Inhalte lokal; ein ursachennaher Playwright-Test prüft Scrollposition, Reihenfolge und Dokumentbreite auf drei Viewports.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vitest + Testing Library (jsdom), Playwright Chromium

---

## Arbeitsregeln

- Ausführen auf Branch `feat/after-action-feedback`; vor Start `git status -sb` prüfen.
- Für jeden Task strikt Rot → Grün → Commit.
- Kein globales `overflow-x-hidden` auf `html` oder `body` ergänzen.
- Keine Eventtexte, Trackdaten, Reihenfolgen oder Terminalmechanik ändern.
- Nach Layoutänderungen nicht nur Klassen-Tests vertrauen: Task 5 muss im echten Chromium gegen Layoutmetriken laufen.

### Task 1: Event-Einstieg und Auswahlscroll entkoppeln

**Files:**
- Modify: `client/src/components/EventCard/EventCard.browser.test.tsx`
- Modify: `client/src/components/EventCard/index.tsx:17-19,52-55,77-99,286`

**Step 1: Failing Tests für Mount und Keyboard-Navigation schreiben**

In `EventCard.browser.test.tsx` `fireEvent` und Cleanup-Hooks ergänzen:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';

let scrollIntoViewSpy: ReturnType<typeof vi.spyOn>;
let scrollToSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  scrollIntoViewSpy = vi.spyOn(Element.prototype, 'scrollIntoView');
  scrollToSpy = vi.fn();
  Object.defineProperty(window, 'scrollTo', {
    configurable: true,
    writable: true,
    value: scrollToSpy,
  });
});

afterEach(() => {
  scrollIntoViewSpy.mockRestore();
});
```

Unterhalb der bestehenden Card-Kind-Tests ergänzen:

```tsx
describe('EventCard scrolling', () => {
  it('starts a newly opened event at the top without scrolling its first action into view', () => {
    renderCard(baseEvent({
      id: 'mobile-entry',
      description: 'Anfang der Beschreibung',
      choices: [choice({ terminalCommand: true })],
    }));

    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
    expect(scrollIntoViewSpy).not.toHaveBeenCalled();
  });

  it('scrolls the newly selected choice into view after keyboard navigation', () => {
    renderCard(baseEvent({
      choices: [choice({ id: 'a', text: 'A' }), choice({ id: 'b', text: 'B' })],
    }));
    scrollIntoViewSpy.mockClear();

    fireEvent.keyDown(window, { key: 'ArrowDown' });

    expect(scrollIntoViewSpy).toHaveBeenCalledTimes(1);
    expect(scrollIntoViewSpy).toHaveBeenCalledWith({ block: 'nearest', behavior: 'smooth' });
  });

  it('keeps wide preformatted descriptions inside a local horizontal scroller', () => {
    renderCard(baseEvent({
      description: '═'.repeat(80),
      choices: [choice({ terminalCommand: true })],
    }));

    expect(screen.getByText('═'.repeat(80))).toHaveClass('min-w-0', 'max-w-full', 'overflow-x-auto');
  });
});
```

Falls `vi.spyOn(Element.prototype, 'scrollIntoView')` durch den Setup-Polyfill bereits ein Mock liefert, trotzdem lokal spy-en; keine globale Test-Setup-Änderung vornehmen.

**Step 2: Test ausführen und Rot bestätigen**

Run:

```bash
npm run test:client -- src/components/EventCard/EventCard.browser.test.tsx
```

Expected: mindestens der Mount-Test schlägt fehl, weil `scrollIntoView()` beim ersten Rendern aufgerufen wird; der Klassen-Test findet `min-w-0`/`max-w-full`/`overflow-x-auto` noch nicht.

**Step 3: Minimalen Scroll-Lifecycle implementieren**

In `EventCard` einen Intent-Ref neben `buttonRefs` anlegen:

```tsx
const shouldScrollSelectionRef = useRef(false);
```

Den Eventwechsel-Effekt ersetzen:

```tsx
useEffect(() => {
  shouldScrollSelectionRef.current = false;
  setSelectedIndex(0);
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}, [event.id]);
```

Nur in den beiden Keyboard-Zweigen unmittelbar vor `setSelectedIndex` den Intent setzen:

```tsx
shouldScrollSelectionRef.current = true;
```

Den bisherigen Auswahlscroll ersetzen:

```tsx
useEffect(() => {
  if (!shouldScrollSelectionRef.current || visibleChoices.length <= 1) return;
  shouldScrollSelectionRef.current = false;
  buttonRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}, [selectedIndex, visibleChoices.length]);
```

Die Standardbeschreibung lokal begrenzen:

```tsx
<div className="min-w-0 max-w-full overflow-x-auto whitespace-pre-wrap mb-6 text-terminal-green-dim leading-relaxed">
```

Nicht `onMouseEnter` mit dem Scroll-Intent markieren: Hover darf die Seite nicht bewegen.

**Step 4: Zieltest und kompletter EventCard-Test laufen lassen**

Run:

```bash
npm run test:client -- src/components/EventCard/EventCard.browser.test.tsx
```

Expected: PASS, einschließlich bestehender sechs Card-Kind-Tests.

**Step 5: Commit**

```bash
git add client/src/components/EventCard/EventCard.browser.test.tsx client/src/components/EventCard/index.tsx
git commit -m "fix(ui): keep mobile event entry at the top"
```

### Task 2: Learning Hub gegen lange Tracktitel härten

**Files:**
- Modify: `client/src/components/LearningHub/index.browser.test.tsx`
- Modify: `client/src/components/LearningHub/index.tsx:69-85`

**Step 1: Failing Contract-Test ergänzen**

In `LearningHub/index.browser.test.tsx` ergänzen:

```tsx
it('allows long track headers to shrink while keeping the status badge visible', () => {
  render(<LearningHub state={mkState()} onPick={vi.fn()} />);

  const title = screen.getByText('Ansible & Konfigurationsmanagement');
  const content = title.parentElement?.parentElement;
  const row = content?.parentElement;
  const badge = screen.getAllByText('Gesperrt').find((node) => node.parentElement === row);

  expect(content).toHaveClass('min-w-0', 'flex-1');
  expect(title.parentElement).toHaveClass('flex-wrap');
  expect(title).toHaveClass('break-words');
  expect(badge).toHaveClass('shrink-0');
});
```

**Step 2: Test ausführen und Rot bestätigen**

Run:

```bash
npm run test:client -- src/components/LearningHub/index.browser.test.tsx
```

Expected: FAIL auf den noch fehlenden responsive Klassen.

**Step 3: Header-Flexgrenzen korrigieren**

Die Track-Kopfzeile wie folgt anpassen:

```tsx
<div className="flex items-start gap-3 sm:items-center">
  <span className="shrink-0 text-2xl">{track.icon}</span>
  <div className="min-w-0 flex-1">
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className="min-w-0 break-words font-bold">{track.title}</span>
      <span className="shrink-0 text-sm text-terminal-green-dim">
        {progress.doneCore}/{progress.totalCore}
      </span>
    </div>
    {lockReason && (
      <div className="break-words text-sm text-terminal-green-dim">{lockReason}</div>
    )}
  </div>
  <span className="shrink-0 border border-terminal-border px-1.5 py-0.5 text-xs tracking-wide">
    {STATE_BADGE[trackState]}
  </span>
</div>
```

Keine Tracktitel abkürzen und Badge nicht unterdrücken.

**Step 4: LearningHub-Tests ausführen**

Run:

```bash
npm run test:client -- src/components/LearningHub/index.browser.test.tsx
```

Expected: PASS.

**Step 5: Commit**

```bash
git add client/src/components/LearningHub/index.browser.test.tsx client/src/components/LearningHub/index.tsx
git commit -m "fix(ui): wrap learning hub headers on mobile"
```

### Task 3: Lernmodus-HUD responsiv stapeln

**Files:**
- Create: `client/src/components/StatsBar/index.browser.test.tsx`
- Modify: `client/src/components/StatsBar/index.tsx:42-67`
- Modify: `client/src/components/GameScreen/index.tsx:188-214,335-342`

**Step 1: Failing HUD-Test schreiben**

Neue Datei `client/src/components/StatsBar/index.browser.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createInitialState } from '../../engine/gameState';
import { StatsBar } from './index';

describe('StatsBar learning header', () => {
  it('stacks on mobile and lets the progress bar consume the remaining width', () => {
    const state = createInitialState('HUD-MOBILE', 'learning');
    render(
      <StatsBar
        state={state}
        lessonLabel="Ansible & Konfigurationsmanagement · 4/4"
        lessonProgressPercent={75}
      />
    );

    const mode = screen.getByText(/LERNMODUS/);
    const outerRow = mode.parentElement?.parentElement;
    const label = screen.getByText('Ansible & Konfigurationsmanagement · 4/4');
    const progressText = screen.getByText('Fortschritt:');
    const progressRow = progressText.parentElement;
    const bar = progressText.nextElementSibling;

    expect(outerRow).toHaveClass('flex-col', 'sm:flex-row');
    expect(mode.parentElement).toHaveClass('min-w-0', 'flex-wrap');
    expect(label).toHaveClass('min-w-0', 'break-words');
    expect(progressRow).toHaveClass('w-full', 'min-w-0', 'sm:w-auto');
    expect(bar).toHaveClass('min-w-0', 'flex-1', 'sm:w-32', 'sm:flex-none');
  });
});
```

**Step 2: Test ausführen und Rot bestätigen**

Run:

```bash
npm run test:client -- src/components/StatsBar/index.browser.test.tsx
```

Expected: FAIL auf den bisherigen einzeiligen Flexklassen.

**Step 3: Responsive HUD-Klassen implementieren**

`LearningModeHeader` auf folgenden Layoutvertrag umstellen:

```tsx
<div className="border border-terminal-border p-3">
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
      <span className="shrink-0 text-lg text-terminal-green">📚 LERNMODUS</span>
      {lessonLabel && (
        <span className="min-w-0 break-words text-sm text-terminal-green-dim">{lessonLabel}</span>
      )}
    </div>
    {lessonProgressPercent !== undefined && (
      <div className="flex w-full min-w-0 items-center gap-2 text-sm sm:w-auto">
        <span className="shrink-0 text-terminal-green-dim">Fortschritt:</span>
        <div className="h-2 min-w-0 flex-1 overflow-hidden rounded border border-terminal-border bg-terminal-bg-dark sm:w-32 sm:flex-none">
          {/* bestehendes inneres Prozent-div unverändert */}
        </div>
        <span className="shrink-0 text-terminal-green">{lessonProgressPercent}%</span>
      </div>
    )}
  </div>
</div>
```

In beiden Standard-/Terminal-Flächen von `GameScreen` den direkten flexiblen Inhaltswrapper von `className="flex-1"` auf `className="min-w-0 flex-1"` ändern. Story-Layout nicht anfassen.

**Step 4: Zieltests ausführen**

Run:

```bash
npm run test:client -- src/components/StatsBar/index.browser.test.tsx
```

Expected: PASS.

Run:

```bash
npm run test:client -- src/components/StatsBar client/src/components/GameScreen
```

Expected: PASS beziehungsweise keine zusätzlich gefundenen Tests; TypeScript-Fehler dürfen nicht auftreten.

**Step 5: Commit**

```bash
git add client/src/components/StatsBar/index.browser.test.tsx client/src/components/StatsBar/index.tsx client/src/components/GameScreen/index.tsx
git commit -m "fix(ui): stack learning progress on narrow screens"
```

### Task 4: Terminal-Chrome auf Mobile umbrechen

**Files:**
- Modify: `client/src/components/Terminal/Terminal.taskPanel.browser.test.tsx`
- Modify: `client/src/components/Terminal/index.tsx:27-35,57-72`

**Step 1: Failing Terminal-Chrome-Test ergänzen**

In `Terminal.taskPanel.browser.test.tsx` ergänzen:

```tsx
it('wraps terminal controls into readable mobile rows', () => {
  render(<Terminal context={baseContext} onSolved={() => {}} onCancel={() => {}} />);

  const headerCancel = screen.getByRole('button', { name: /Abbrechen/ });
  const hint = screen.getByRole('button', { name: /Hinweis/ });
  const footerHint = screen
    .getAllByText('[ESC] Abbrechen')
    .find((node) => node.tagName === 'SPAN');

  expect(headerCancel.parentElement).toHaveClass('flex-col', 'sm:flex-row');
  expect(headerCancel).toHaveClass('min-h-11');
  expect(hint.parentElement?.parentElement).toHaveClass('flex-col', 'sm:flex-row');
  expect(hint.parentElement).toHaveClass('flex-col', 'sm:flex-row');
  expect(hint).toHaveClass('min-h-11');
  expect(footerHint).toBeDefined();
  expect(footerHint).toHaveClass('shrink-0');
});
```

**Step 2: Test ausführen und Rot bestätigen**

Run:

```bash
npm run test:client -- src/components/Terminal/Terminal.taskPanel.browser.test.tsx
```

Expected: FAIL auf den noch fehlenden mobilen Stack- und Touchklassen.

**Step 3: Header und Footer responsiv machen**

Root und Header:

```tsx
<div className="flex h-full min-w-0 flex-col border border-terminal-border">
  <div className="flex flex-col items-start gap-2 border-b border-terminal-border bg-terminal-bg-secondary p-2 sm:flex-row sm:items-center sm:justify-between">
    <span className="min-w-0 break-all">Terminal: ...</span>
    <button
      onClick={onCancel}
      className="inline-flex min-h-11 shrink-0 items-center text-terminal-danger hover:underline"
    >
      [ESC] Abbrechen
    </button>
  </div>
```

Footer:

```tsx
<div className="flex flex-col gap-2 border-t border-terminal-border bg-terminal-bg-secondary p-2 text-sm sm:flex-row sm:items-center sm:justify-between">
  <span className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
    <span className="text-terminal-green-muted">[Tab] Autovervollständigung</span>
    <button
      ...
      className={`inline-flex min-h-11 items-center ${
        hintsRemaining > 0 ? 'hover:underline' : 'text-terminal-green-muted'
      }`}
    >
      [?] Hinweis ({hintsRemaining} übrig)
    </button>
  </span>
  <span className="shrink-0 text-terminal-green-muted">[ESC] Abbrechen</span>
</div>
```

Das sichtbare Footer-ESC bleibt ein Hinweis, kein zweiter Button; die funktionale Abbrechen-Aktion im Header bleibt unverändert.

**Step 4: Gesamte Terminal-Komponentensuite ausführen**

Run:

```bash
npm run test:client -- src/components/Terminal
```

Expected: PASS für TaskPanel, PartialFeedback, MultiHost und After-Action-Feedback.

**Step 5: Commit**

```bash
git add client/src/components/Terminal/Terminal.taskPanel.browser.test.tsx client/src/components/Terminal/index.tsx
git commit -m "fix(ui): wrap terminal controls on mobile"
```

### Task 5: Echte Mobile-Regression in Chromium absichern

**Files:**
- Create: `e2e/mobile-learning-layout.spec.ts`

**Step 1: End-to-End-Akzeptanztest schreiben**

Neue Datei:

```ts
import { test, expect, Page } from '@playwright/test';

const VIEWPORTS = [
  { name: 'small portrait', width: 320, height: 568 },
  { name: 'portrait', width: 375, height: 667 },
  { name: 'landscape', width: 667, height: 375 },
] as const;

async function expectNoDocumentOverflow(page: Page) {
  await expect.poll(() => page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth
  )).toBe(true);
}

for (const viewport of VIEWPORTS) {
  test(`learning flow fits ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.getByText(/KLICKEN ODER ENTER ZUM STARTEN/).click();
    await page.getByRole('button', { name: /LERNBEREICH/ }).click();
    await expect(page.getByRole('heading', { name: 'Lernpfad' })).toBeVisible();

    await expectNoDocumentOverflow(page);

    // Simulate arriving from a deeply scrolled hub. Playwright scrolls the
    // recommended CTA back into view before clicking; the event must still
    // establish its own deterministic top position.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.getByRole('button', { name: /Nächste empfohlene Lektion/ }).click();

    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await expectNoDocumentOverflow(page);

    const title = page.getByRole('heading', { name: /> Grundlagen 1: Das Erwachen/ });
    const descriptionStart = page.getByText(/Du öffnest die Augen/);
    const start = page.getByRole('button', { name: /Aufgabe starten/ });
    const boxes = await Promise.all([title.boundingBox(), descriptionStart.boundingBox(), start.boundingBox()]);
    expect(boxes.every(Boolean)).toBe(true);
    expect(boxes[0]!.y).toBeLessThan(boxes[1]!.y);
    expect(boxes[1]!.y).toBeLessThan(boxes[2]!.y);

    await start.click();
    await expect(page.locator('.xterm')).toBeVisible();
    await expectNoDocumentOverflow(page);

    for (const control of [
      page.getByRole('button', { name: /Abbrechen/ }),
      page.getByRole('button', { name: /Hinweis/ }),
    ]) {
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
    }
  });
}
```

Wenn `getByText(/Du öffnest die Augen/)` wegen eines Textknotens mit Zeilenumbrüchen mehrfach matcht, mit `.first()` eingrenzen; keine Timeout-Sleeps hinzufügen.

Die produktiven Änderungen wurden in Tasks 1–4 jeweils bereits durch einen roten Komponenten-Test getrieben. Dieser Test ist die echte Browser-Abnahme über alle vier Komponenten; keine produktive Änderung zurückrollen, nur um ihn künstlich rot zu machen. Die verifizierten Ausgangsmetriken (Hub 415 px, Event 650 px, Terminal 488 px bei 320 px Viewport sowie `scrollY=751`) stehen im Design-Dokument.

**Step 2: Test gegen die implementierten Fixes ausführen**

Run:

```bash
npm run build
npx playwright test e2e/mobile-learning-layout.spec.ts --project=chromium --workers=1
```

Expected: 3 passed.

**Step 3: Test stabilisieren, ohne die Assertions abzuschwächen**

Nur echte Locator-Mehrdeutigkeiten oder asynchrone React-Übergänge mit `expect.poll` korrigieren. Nicht erlaubt:

- `waitForTimeout` als Synchronisation,
- Toleranz für `scrollWidth > innerWidth`,
- `scrollY` manuell nach dem Eventstart im Test zurücksetzen,
- einen der drei Viewports überspringen.

Run erneut wie in Step 2. Expected: 3 passed.

**Step 4: Commit**

```bash
git add e2e/mobile-learning-layout.spec.ts
git commit -m "test(e2e): cover mobile learning layout"
```

### Task 6: Gesamtsweep und Abschlussreview

**Files:**
- Review only: all files changed in Tasks 1–5

**Step 1: Whitespace und Scope prüfen**

Run:

```bash
git diff --check
git status -sb
git diff --stat HEAD~5..HEAD
```

Expected: kein Whitespace-Fehler; nur EventCard, LearningHub, StatsBar, GameScreen, Terminal, deren Tests und der neue Mobile-E2E-Test sind im Implementierungsscope.

**Step 2: Komplette Unit-/Browser-Suite ausführen**

Run:

```bash
npm test
```

Expected: PASS, keine neuen Skips oder Fixmes.

**Step 3: Produktionsbuild ausführen**

Run:

```bash
npm run build
```

Expected: Exit 0; TypeScript und Vite-Build erfolgreich.

**Step 4: Mobile-E2E erneut isoliert ausführen**

Run:

```bash
npx playwright test e2e/mobile-learning-layout.spec.ts --project=chromium --workers=1
```

Expected: 3 passed.

**Step 5: Gesamte E2E-Suite ausführen**

Run:

```bash
npm run test:e2e
```

Expected: alle aktiven Tests grün; ausschließlich bereits dokumentierte `fixme`/Track-Skips bleiben bestehen.

**Step 6: Manuelles Browser-Stichprobenset**

Mit Dev-Server und Browserautomation nacheinander 320×568, 375×667 und 667×375 prüfen:

- Hub bis „Ansible & Konfigurationsmanagement“ scrollen: Badge vollständig, kein seitliches Dokument-Scrollen.
- „Grundlagen 1“ öffnen: Ansicht beginnt bei HUD/Titel, nicht bei der CTA.
- Terminal öffnen und vertikal bis zum Footer scrollen: Autovervollständigung, Hinweis und ESC-Hinweis lesbar; Abbrechen im Header erreichbar.
- Mit `ArrowDown` in einem echten Mehrfach-Choice-Event navigieren: ausgewählte Option wird weiterhin in Sicht gescrollt.

**Step 7: Finalen Review-Commit nur bei nötigen Reviewkorrekturen erstellen**

Wenn der Review Änderungen verlangt: zuerst passenden Regressionstest ergänzen, dann minimal korrigieren und committen:

```bash
git add <betroffene-dateien>
git commit -m "fix(ui): address mobile layout review"
```

Wenn keine Änderung nötig ist, keinen leeren Commit erzeugen.

---

## Abnahmekriterien

- Ein Lernlevel beginnt auf allen drei Zielviewports bei `scrollY === 0`.
- Initiales Rendern und Hover rufen kein `scrollIntoView()` auf; Keyboard-Navigation weiterhin schon.
- Hub, Eventkarte und Terminal erfüllen `scrollWidth <= innerWidth`.
- Titel, Beschreibungsanfang und CTA erscheinen in unveränderter Reihenfolge.
- Lange ASCII-Inhalte bleiben lokal erreichbar und verbreitern nicht das Dokument.
- Lern-HUD und Terminalkontrollen sind bei 320 px vollständig lesbar und erreichbar.
- Track-/Eventdaten und After-Action-Feedback bleiben unverändert.
- Unit-/Browser-Tests, Build und aktive E2E-Suite sind grün.
