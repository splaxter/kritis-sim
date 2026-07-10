# Story-Immersion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Den Story-Modus „Die Probezeit" immersiver machen: Artwork sichtbar machen (helleres Overlay + Ken-Burns), Kapitel-Titelkarten + 3 Kino-Events, Typewriter-Text mit Enter-Skip, prozeduraler Opt-in-Sound, Flow-Fixes gegen Doppel-Enter.

**Architecture:** Vier unabhängige Bausteine an bestehenden Komponenten (siehe genehmigtes Design `docs/plans/2026-07-10-story-immersion-design.md`). Kein Content-Schema-Eingriff; neue Dateien: `ChapterCard`-Komponente, `useTypewriter`-Hook, `chapterArt.ts`-Mapping, `audio/soundEngine.ts`.

**Tech Stack:** React 18, Tailwind, Vite, Web Audio API (prozedural, keine Assets). Tests: Vitest — Node-Tests im Root-Config, DOM-Tests als `*.browser.test.tsx` (jsdom + @testing-library/react via `client/vitest.config.ts`).

**Testkommandos:**
- Node-Tests: `npm run test` (baut shared, dann `vitest run`)
- DOM-Tests: `npm run test:client`
- Dev-Server für manuelle Verifikation: `npm run dev` → http://localhost:5173/ (siehe `.claude/skills/verify/SKILL.md`)

**Wichtige Bestandsaufnahme (für Kontext-lose Ausführung):**
- `client/src/components/StoryBackground/index.tsx` — Vollbild-`<img>`-Hintergrund mit Crossfade (800 ms), dunklem Gradient-Overlay, Scanlines, Vignette.
- `client/src/components/EventCard/index.tsx` — rendert Story-Events; Tastatur: Ziffern wählen direkt, ↑/↓/j/k navigieren, Enter wählt `selectedIndex`. Story-Layout ab `if (isStoryMode)`.
- `client/src/components/GameScreen/index.tsx` — rendert `<EventCard>` (Story-Zweig ~Zeile 156).
- `client/src/components/ResultScreen/index.tsx` — „Weiter [Enter]"-Screen nach jeder Wahl.
- `client/src/content/adventure/chapters.ts` — 12 Kapitel `ch01_first_day` … `ch12_finale` mit `title` und `act`.
- `client/src/contexts/StoryBackgroundContext.tsx` — hält `currentImage`, `isStoryMode`.
- Bilder: `client/public/images/events/*.webp` (33 neue, Namen wie `06_leitwarte-monitore-ausfall.webp`), zur Laufzeit `/images/events/…`.
- `client/tailwind.config.js` — dort existieren bereits Custom-Animationen (`animate-fade-in` wird in StoryBackground benutzt).

---

## Task 1: StoryBackground — Overlay aufhellen + Ken-Burns

**Files:**
- Modify: `client/tailwind.config.js` (keyframes/animation ergänzen)
- Modify: `client/src/components/StoryBackground/index.tsx:63-77`
- Test: `client/src/components/StoryBackground/StoryBackground.browser.test.tsx` (neu)

**Step 1: Failing DOM-Test schreiben**

```tsx
// client/src/components/StoryBackground/StoryBackground.browser.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { StoryBackground } from './index';
import { StoryBackgroundProvider, useStoryBackground } from '../../contexts/StoryBackgroundContext';
import { useEffect } from 'react';

function Setup({ image }: { image: string }) {
  const { setStoryMode, setBackgroundImage } = useStoryBackground();
  useEffect(() => {
    setStoryMode(true);
    setBackgroundImage(image);
  }, [setStoryMode, setBackgroundImage, image]);
  return <StoryBackground />;
}

describe('StoryBackground', () => {
  it('applies ken-burns animation to the active image', () => {
    const { container } = render(
      <StoryBackgroundProvider>
        <Setup image="/images/events/06_leitwarte-monitore-ausfall.webp" />
      </StoryBackgroundProvider>
    );
    const img = container.querySelector('img[src="/images/events/06_leitwarte-monitore-ausfall.webp"]');
    expect(img).not.toBeNull();
    expect(img!.className).toContain('animate-kenburns');
    // motion-reduce-Variante muss vorhanden sein
    expect(img!.className).toContain('motion-reduce:animate-none');
  });

  it('uses the lightened overlay gradient', () => {
    const { container } = render(
      <StoryBackgroundProvider>
        <Setup image="/images/events/06_leitwarte-monitore-ausfall.webp" />
      </StoryBackgroundProvider>
    );
    const overlay = container.querySelector('.bg-gradient-to-t');
    expect(overlay).not.toBeNull();
    expect(overlay!.className).toContain('from-black/85');
    expect(overlay!.className).toContain('via-black/45');
    expect(overlay!.className).toContain('to-black/15');
  });
});
```

**Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npm run test:client -- StoryBackground`
Expected: FAIL — `animate-kenburns` nicht im className, Gradient noch `via-black/80`.

**Step 3: Tailwind-Keyframes ergänzen**

In `client/tailwind.config.js` unter `theme.extend` (zu den bestehenden `keyframes`/`animation`-Blöcken hinzufügen, NICHT ersetzen):

```js
keyframes: {
  // …bestehende behalten…
  kenburns: {
    '0%': { transform: 'scale(1.0)' },
    '100%': { transform: 'scale(1.08)' },
  },
},
animation: {
  // …bestehende behalten…
  kenburns: 'kenburns 40s ease-in-out infinite alternate',
},
```

**Step 4: StoryBackground anpassen**

In `client/src/components/StoryBackground/index.tsx`:

Aktuelles Bild (`<img src={displayedImage} …>`, ~Zeile 68-73) — className erweitern:

```tsx
<img
  src={displayedImage}
  alt=""
  className="w-full h-full object-cover animate-kenburns motion-reduce:animate-none"
  loading="eager"
/>
```

Overlay (~Zeile 77) ersetzen:

```tsx
{/* Dark overlay for readability - gradient from bottom (lightened: artwork bleibt sichtbar) */}
<div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/15" />
```

Scanlines, Vignette, Crossfade: unverändert lassen.

**Step 5: Tests laufen lassen**

Run: `npm run test:client -- StoryBackground`
Expected: PASS (beide Tests).

**Step 6: Manuell verifizieren**

`npm run dev` → Story-Modus starten → Artwork deutlich sichtbarer, langsamer Zoom erkennbar, Text der Event-Card weiter gut lesbar (Card hat eigenes `bg-black/85`-Panel).

**Step 7: Commit**

```bash
git add client/tailwind.config.js client/src/components/StoryBackground/
git commit -m "feat(story): lighten background overlay, add ken-burns drift"
```

---

## Task 2: `useTypewriter`-Hook + EventCard-Integration

**Files:**
- Create: `client/src/hooks/useTypewriter.ts`
- Test: `client/src/hooks/useTypewriter.browser.test.tsx` (neu)
- Modify: `client/src/components/EventCard/index.tsx` (Keyboard-Handler + Story-Layout)

**Step 1: Failing Hook-Test schreiben**

```tsx
// client/src/hooks/useTypewriter.browser.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTypewriter } from './useTypewriter';

describe('useTypewriter', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('reveals text progressively at the given speed', () => {
    const { result } = renderHook(() => useTypewriter('Hallo Welt', { charsPerSecond: 10 }));
    expect(result.current.text).toBe('');
    expect(result.current.done).toBe(false);
    act(() => { vi.advanceTimersByTime(500); }); // 10 cps * 0.5s = 5 Zeichen
    expect(result.current.text).toBe('Hallo');
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current.text).toBe('Hallo Welt');
    expect(result.current.done).toBe(true);
  });

  it('skip() completes instantly', () => {
    const { result } = renderHook(() => useTypewriter('Hallo Welt', { charsPerSecond: 10 }));
    act(() => { result.current.skip(); });
    expect(result.current.text).toBe('Hallo Welt');
    expect(result.current.done).toBe(true);
  });

  it('restarts when the input text changes', () => {
    const { result, rerender } = renderHook(
      ({ t }) => useTypewriter(t, { charsPerSecond: 10 }),
      { initialProps: { t: 'Erster' } }
    );
    act(() => { result.current.skip(); });
    rerender({ t: 'Zweiter Text' });
    expect(result.current.done).toBe(false);
    expect(result.current.text).toBe('');
  });

  it('is instant when disabled (reduced motion / non-story)', () => {
    const { result } = renderHook(() => useTypewriter('Hallo', { charsPerSecond: 10, enabled: false }));
    expect(result.current.text).toBe('Hallo');
    expect(result.current.done).toBe(true);
  });
});
```

**Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npm run test:client -- useTypewriter`
Expected: FAIL — Modul existiert nicht.

**Step 3: Hook implementieren**

```ts
// client/src/hooks/useTypewriter.ts
import { useEffect, useRef, useState, useCallback } from 'react';

interface TypewriterOptions {
  charsPerSecond?: number;
  /** false → Text sofort vollständig (reduced motion, Nicht-Story-Modus). */
  enabled?: boolean;
}

const TICK_MS = 50;

/**
 * Progressive Textanzeige für Story-Events. skip() zeigt sofort alles;
 * der Aufrufer entscheidet, welche Eingabe skippt (EventCard: Enter/Ziffern).
 */
export function useTypewriter(fullText: string, options: TypewriterOptions = {}) {
  const { charsPerSecond = 500, enabled = true } = options;
  const [visibleChars, setVisibleChars] = useState(enabled ? 0 : fullText.length);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    // Neustart bei Textwechsel
    setVisibleChars(enabled ? 0 : fullText.length);
    if (!enabled) return;

    const perTick = Math.max(1, Math.round((charsPerSecond * TICK_MS) / 1000));
    intervalRef.current = window.setInterval(() => {
      setVisibleChars((prev) => {
        const next = prev + perTick;
        if (next >= fullText.length && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return Math.min(next, fullText.length);
      });
    }, TICK_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [fullText, charsPerSecond, enabled]);

  const skip = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setVisibleChars(fullText.length);
  }, [fullText]);

  return {
    text: fullText.slice(0, visibleChars),
    done: visibleChars >= fullText.length,
    skip,
  };
}
```

**Step 4: Tests laufen lassen**

Run: `npm run test:client -- useTypewriter`
Expected: PASS (4 Tests).

**Step 5: Commit (Hook isoliert)**

```bash
git add client/src/hooks/useTypewriter.ts client/src/hooks/useTypewriter.browser.test.tsx
git commit -m "feat(story): add useTypewriter hook"
```

**Step 6: EventCard integrieren**

In `client/src/components/EventCard/index.tsx`:

a) Import + Setup (nach den bestehenden Hooks am Komponentenanfang):

```tsx
import { useTypewriter } from '../../hooks/useTypewriter';
```

```tsx
const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const description = replaceCharacterNames(event.description);
const typewriter = useTypewriter(description, {
  charsPerSecond: 500,
  enabled: isStoryMode && !prefersReducedMotion,
});
```

Achtung: `replaceCharacterNames` ist aktuell NACH den Hooks definiert — Funktionsdefinition vor die Hook-Aufrufe ziehen (oder `description` via `useMemo` nach der Definition bilden und an den Hook geben; Hook-Reihenfolge muss stabil bleiben).

b) Keyboard-Handler erweitern (im bestehenden `handleKeyDown`): **erste Taste skippt, wählt nicht**:

```tsx
const handleKeyDown = (e: KeyboardEvent) => {
  // Während der Text tippt: jede Auswahl-Taste vervollständigt nur den Text.
  if (!typewriter.done && (e.key === 'Enter' || (parseInt(e.key) >= 1 && parseInt(e.key) <= visibleChoices.length))) {
    e.preventDefault();
    typewriter.skip();
    return;
  }
  // …bestehende Logik unverändert…
};
```

`typewriter` in die Dependency-Liste des Effects aufnehmen.

c) Story-Layout: Beschreibung durch getippten Text ersetzen und Choices erst nach `done` einblenden. Im `isStoryMode`-Block die Description-Stelle auf `typewriter.text` umstellen und den Actions-Container wrappen:

```tsx
<div className={`transition-opacity duration-300 ${typewriter.done ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
  {renderActions('story')}
</div>
```

Der Standard-Modus (Nicht-Story) bleibt unverändert (Hook ist dort `enabled: false` → `typewriter.text === description`, `done === true`; es darf trotzdem einfach `typewriter.text` gerendert werden, wenn das die Stelle vereinfacht — im Standard-Layout aber NICHT nötig).

**Step 7: Bestehende Tests + manuelle Verifikation**

Run: `npm run test:client` und `npm run test`
Expected: PASS (keine Regression; `content.test.ts` 15/15).

Manuell (`npm run dev`): Story-Event → Text tippt sich auf, Enter zeigt Volltext, zweiter Enter wählt; Choices erscheinen erst nach Textende.

**Step 8: Commit**

```bash
git add client/src/components/EventCard/index.tsx
git commit -m "feat(story): typewriter text with enter-to-skip, gated choices"
```

---

## Task 3: Kapitel-Art-Mapping + ChapterCard (Kino-Momente)

**Files:**
- Create: `client/src/content/adventure/chapterArt.ts`
- Test: `client/src/content/adventure/chapterArt.test.ts` (Node-Test, läuft im Root-Vitest)
- Create: `client/src/components/ChapterCard/index.tsx`
- Modify: `client/src/components/GameScreen/index.tsx` (Story-Zweig, um ~Zeile 156)

**Step 1: Failing Mapping-Test schreiben**

```ts
// client/src/content/adventure/chapterArt.test.ts
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHAPTER_ART, CINEMATIC_EVENTS } from './chapterArt';
import { adventureChapters } from './chapters';
import { adventureStoryEvents } from './story-events';

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '../../../public');

describe('chapterArt', () => {
  it('has art for every chapter', () => {
    for (const ch of adventureChapters) {
      expect(CHAPTER_ART[ch.id], `missing art for ${ch.id}`).toBeTruthy();
    }
  });

  it('all referenced images exist on disk', () => {
    const all = [...Object.values(CHAPTER_ART), ...Object.values(CINEMATIC_EVENTS)];
    for (const img of all) {
      expect(existsSync(join(publicDir, img)), `missing file ${img}`).toBe(true);
    }
  });

  it('cinematic event ids exist in the story', () => {
    const ids = new Set(adventureStoryEvents.map((e) => e.id));
    for (const id of Object.keys(CINEMATIC_EVENTS)) {
      expect(ids.has(id), `unknown event ${id}`).toBe(true);
    }
  });
});
```

**Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npm run test -- chapterArt`
Expected: FAIL — Modul existiert nicht.

**Step 3: Mapping implementieren**

```ts
// client/src/content/adventure/chapterArt.ts
/**
 * Artwork für Kapitel-Titelkarten und Kino-Events (Vollbild-Beat).
 * Bilder liegen in client/public/images/events/.
 */

export const CHAPTER_ART: Record<string, string> = {
  ch01_first_day: '/images/events/evt_erster_arbeitstag.webp',
  ch02_settling_in: '/images/events/19_it-buero-drei-arbeitsplaetze.webp',
  ch03_first_crisis: '/images/events/28_stau-am-drucker.webp',
  ch04_the_file: '/images/events/20_serverraum-kritis-warnschild.webp',
  ch05_coincidence: '/images/events/01_wasserwerk-luftaufnahme-nacht.webp',
  ch06_trust_no_one: '/images/events/11_usb-uebergabe-treppenhaus.webp',
  ch07_escalation: '/images/events/05_verdaechtige-email-am-monitor.webp',
  ch08_calm_before: '/images/events/07_verlassenes-buero-server-led.webp',
  ch09_attack: '/images/events/06_leitwarte-monitore-ausfall.webp',
  ch10_72_hours: '/images/events/02_it-admin-leitwarte-nacht.webp',
  ch11_truth: '/images/events/25_vermisster-mitarbeiter-pinnwand.webp',
  ch12_finale: '/images/events/16_rechenzentrum-gang.webp',
};

/** Schlüssel-Events mit Vollbild-Beat vor der Event-Card. */
export const CINEMATIC_EVENTS: Record<string, string> = {
  adv_ransomware_strike: '/images/events/06_leitwarte-monitore-ausfall.webp',
  adv_attacker_identity: '/images/events/13_handschriftliche-notiz-am-monitor.webp',
  adv_climax: '/images/events/02_it-admin-leitwarte-nacht.webp',
};
```

**Step 4: Test laufen lassen**

Run: `npm run test -- chapterArt`
Expected: PASS (3 Tests).

**Step 5: Commit (Mapping isoliert)**

```bash
git add client/src/content/adventure/chapterArt.ts client/src/content/adventure/chapterArt.test.ts
git commit -m "feat(story): chapter/cinematic artwork mapping"
```

**Step 6: ChapterCard-Komponente**

```tsx
// client/src/components/ChapterCard/index.tsx
import { useEffect } from 'react';
import { useTypewriter } from '../../hooks/useTypewriter';

interface ChapterCardProps {
  /** Z.B. "KAPITEL 3" oder leer für Kino-Events. */
  kicker: string;
  title: string;
  image: string;
  onDone: () => void;
}

const AUTO_DISMISS_MS = 2500;

/**
 * Vollbild-Kino-Beat: Artwork + getippter Titel. Schließt nach 2,5s
 * oder bei beliebiger Taste/Klick.
 */
export function ChapterCard({ kicker, title, image, onDone }: ChapterCardProps) {
  const typed = useTypewriter(title, { charsPerSecond: 25 });

  useEffect(() => {
    const t = window.setTimeout(onDone, AUTO_DISMISS_MS);
    const onKey = () => onDone();
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-30 cursor-pointer" onClick={onDone}>
      <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover animate-kenburns motion-reduce:animate-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/40" />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
        {kicker && (
          <div className="text-terminal-green/70 text-sm tracking-[0.4em] uppercase mb-3">{kicker}</div>
        )}
        <h1 className="text-3xl md:text-5xl font-bold text-white tracking-widest">
          {typed.text}
          {!typed.done && <span className="animate-pulse">▌</span>}
        </h1>
      </div>
    </div>
  );
}
```

**Step 7: In GameScreen integrieren**

In `client/src/components/GameScreen/index.tsx`, im Story-Zweig (wo `<EventCard>` bei ~Zeile 156 gerendert wird):

```tsx
import { useRef, useState } from 'react'; // ggf. vorhandene Imports erweitern
import { ChapterCard } from '../ChapterCard';
import { CHAPTER_ART, CINEMATIC_EVENTS } from '../../content/adventure/chapterArt';
```

Vor dem EventCard-Render (Zustand auf Komponentenebene):

```tsx
const prevChapterRef = useRef<string | null>(null);
const [cinematic, setCinematic] = useState<{ kicker: string; title: string; image: string } | null>(null);
const seenCinematicsRef = useRef<Set<string>>(new Set());

const currentChapter = state.storyState?.currentChapter ?? null;
useEffect(() => {
  if (!state.isStoryMode || !currentChapter) return;
  if (prevChapterRef.current && prevChapterRef.current !== currentChapter) {
    const num = parseInt(currentChapter.match(/ch(\d+)/)?.[1] || '0');
    const title = adventureChapters.find((c) => c.id === currentChapter)?.title ?? '';
    const image = CHAPTER_ART[currentChapter];
    if (image && title) setCinematic({ kicker: `KAPITEL ${num}`, title, image });
  }
  prevChapterRef.current = currentChapter;
}, [currentChapter, state.isStoryMode]);

useEffect(() => {
  if (!state.isStoryMode || !currentEvent) return;
  const img = CINEMATIC_EVENTS[currentEvent.id];
  if (img && !seenCinematicsRef.current.has(currentEvent.id)) {
    seenCinematicsRef.current.add(currentEvent.id);
    setCinematic({ kicker: '', title: currentEvent.title, image: img });
  }
}, [currentEvent?.id, state.isStoryMode]);
```

(Namen `state`/`currentEvent` an die tatsächlichen Prop-/Variablennamen in GameScreen anpassen — der Executor liest die Datei; `adventureChapters` importieren.)

Render, direkt über dem `<EventCard>` des Story-Zweigs:

```tsx
{cinematic && (
  <ChapterCard
    kicker={cinematic.kicker}
    title={cinematic.title}
    image={cinematic.image}
    onDone={() => setCinematic(null)}
  />
)}
```

Wichtig: Solange `cinematic` aktiv ist, schluckt ChapterCard den Tastendruck (eigener `keydown`-Listener + `onDone`); EventCard liegt darunter und reagiert trotzdem — deshalb in EventCards `handleKeyDown` als erste Zeile einen Guard NICHT einbauen, sondern in GameScreen die EventCard bei aktivem `cinematic` nicht rendern:

```tsx
{!cinematic && <EventCard … />}
```

(Das ist die einfachste Variante ohne Event-Bubbling-Probleme; Hintergrundbild bleibt durch StoryBackground stehen.)

**Step 8: Tests + manuelle Verifikation**

Run: `npm run test && npm run test:client`
Expected: PASS, keine Regression.

Manuell: Kapitel 1→2-Übergang erzwingen (Story Woche 1 durchspielen, siehe Verify-Skill): Titelkarte „KAPITEL 2 — Einarbeitung" erscheint, Taste schließt sie, Event-Card folgt.

**Step 9: Commit**

```bash
git add client/src/components/ChapterCard/ client/src/components/GameScreen/index.tsx
git commit -m "feat(story): chapter title cards and cinematic beats for key events"
```

---

## Task 4: Prozeduraler Sound (Opt-in) + [M]-Toggle

**Files:**
- Create: `client/src/audio/soundEngine.ts`
- Test: `client/src/audio/soundEngine.browser.test.tsx` (jsdom hat localStorage; WebAudio wird geguardet)
- Modify: `client/src/components/GameScreen/index.tsx` ([M]-Handler, Fußzeilen-Hinweis, Cue-Aufrufe)
- Modify: `client/src/components/EventCard/index.tsx` (tick bei Auswahlwechsel, confirm bei Wahl)

**Step 1: Failing Test schreiben**

```tsx
// client/src/audio/soundEngine.browser.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { soundEngine, cueForEvent, SOUND_PREF_KEY } from './soundEngine';

describe('soundEngine', () => {
  beforeEach(() => {
    localStorage.clear();
    soundEngine._resetForTests();
  });

  it('is muted by default (opt-in)', () => {
    expect(soundEngine.isEnabled()).toBe(false);
  });

  it('toggle persists to localStorage', () => {
    soundEngine.toggle();
    expect(soundEngine.isEnabled()).toBe(true);
    expect(localStorage.getItem(SOUND_PREF_KEY)).toBe('on');
    soundEngine.toggle();
    expect(soundEngine.isEnabled()).toBe(false);
    expect(localStorage.getItem(SOUND_PREF_KEY)).toBe('off');
  });

  it('restores enabled state from localStorage', () => {
    localStorage.setItem(SOUND_PREF_KEY, 'on');
    soundEngine._resetForTests();
    expect(soundEngine.isEnabled()).toBe(true);
  });

  it('one-shots never throw without WebAudio (jsdom)', () => {
    soundEngine.toggle(); // an
    expect(() => {
      soundEngine.tick();
      soundEngine.confirm();
      soundEngine.stinger();
    }).not.toThrow();
  });
});

describe('cueForEvent', () => {
  it('returns stinger for incident/compromise tags', () => {
    expect(cueForEvent(['story', 'incident'])).toBe('stinger');
    expect(cueForEvent(['chapter3', 'compromise'])).toBe('stinger');
  });
  it('returns null otherwise', () => {
    expect(cueForEvent(['story', 'orientation'])).toBeNull();
    expect(cueForEvent([])).toBeNull();
    expect(cueForEvent(undefined)).toBeNull();
  });
});
```

**Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npm run test:client -- soundEngine`
Expected: FAIL — Modul existiert nicht.

**Step 3: Engine implementieren**

```ts
// client/src/audio/soundEngine.ts
/**
 * Prozeduraler Sound für den Story-Modus — Web Audio API, keine Asset-Dateien.
 * Opt-in: Default stumm; [M] toggelt, Zustand in localStorage.
 * Alle WebAudio-Aufrufe sind geguardet (jsdom/ältere Browser → No-op).
 */

export const SOUND_PREF_KEY = 'kritis_sound';

type Cue = 'stinger';

/** Alarm-Stinger bei Vorfalls-Events (Tags aus story-events.ts). */
export function cueForEvent(tags: string[] | undefined): Cue | null {
  if (!tags) return null;
  return tags.includes('incident') || tags.includes('compromise') ? 'stinger' : null;
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambienceNodes: AudioNode[] = [];
  private enabled = false;

  constructor() {
    this.enabled = localStorage.getItem(SOUND_PREF_KEY) === 'on';
  }

  isEnabled() {
    return this.enabled;
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    localStorage.setItem(SOUND_PREF_KEY, this.enabled ? 'on' : 'off');
    if (this.enabled) this.startAmbience();
    else this.stopAmbience();
    return this.enabled;
  }

  /** Lazy: AudioContext erst bei erster aktivierter Nutzung (Autoplay-Policy). */
  private ensureCtx(): AudioContext | null {
    if (typeof window === 'undefined' || !('AudioContext' in window)) return null;
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.12; // ≈ −18 dB, bewusst leise
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  /** Regen (gefiltertes Rauschen) + Raum-Brummen (tiefer Oszillator). */
  private startAmbience() {
    const ctx = this.ensureCtx();
    if (!ctx || !this.master || this.ambienceNodes.length) return;

    // Regen: white noise → bandpass
    const noiseLen = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.value = 900;
    rainFilter.Q.value = 0.6;
    const rainGain = ctx.createGain();
    rainGain.gain.value = 0.25;
    noise.connect(rainFilter).connect(rainGain).connect(this.master);
    noise.start();

    // Brummen: 55 Hz Sinus, leicht verstimmt gedoppelt
    const humGain = ctx.createGain();
    humGain.gain.value = 0.1;
    humGain.connect(this.master);
    for (const freq of [55, 55.7]) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(humGain);
      osc.start();
      this.ambienceNodes.push(osc);
    }
    this.ambienceNodes.push(noise, rainFilter, rainGain, humGain);
  }

  private stopAmbience() {
    for (const n of this.ambienceNodes) {
      if ('stop' in n) try { (n as AudioScheduledSourceNode).stop(); } catch { /* already stopped */ }
      n.disconnect();
    }
    this.ambienceNodes = [];
  }

  /** Kurzer Blip bei Auswahlwechsel. */
  tick() { this.blip(1200, 0.03, 0.04); }
  /** Weicher Klick bei Bestätigung. */
  confirm() { this.blip(600, 0.06, 0.08); }
  /** Alarm-Stinger: zwei fallende Töne. */
  stinger() {
    this.blip(440, 0.25, 0.18);
    setTimeout(() => this.blip(330, 0.35, 0.18), 180);
  }

  private blip(freq: number, duration: number, gain: number) {
    if (!this.enabled) return;
    const ctx = this.ensureCtx();
    if (!ctx || !this.master) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(g).connect(this.master);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  /** Nur für Tests. */
  _resetForTests() {
    this.stopAmbience();
    this.ctx = null;
    this.master = null;
    this.enabled = localStorage.getItem(SOUND_PREF_KEY) === 'on';
  }
}

export const soundEngine = new SoundEngine();
```

**Step 4: Tests laufen lassen**

Run: `npm run test:client -- soundEngine`
Expected: PASS (6 Tests).

**Step 5: Commit (Engine isoliert)**

```bash
git add client/src/audio/
git commit -m "feat(story): procedural opt-in sound engine (web audio, no assets)"
```

**Step 6: UI-Integration**

a) `GameScreen` (Story-Zweig): globaler `[M]`-Handler + Fußzeilen-Hinweis + Stinger-Cue:

```tsx
import { soundEngine, cueForEvent } from '../../audio/soundEngine';

// im Komponenten-Body:
const [soundOn, setSoundOn] = useState(soundEngine.isEnabled());
useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    if (e.key.toLowerCase() === 'm' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      setSoundOn(soundEngine.toggle());
    }
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}, []);

// Stinger beim Mount eines Vorfalls-Events:
useEffect(() => {
  if (currentEvent && cueForEvent(currentEvent.tags) === 'stinger') soundEngine.stinger();
}, [currentEvent?.id]);
```

Fußzeilen-Hinweis im Story-Layout (dezent, z. B. unter der Event-Card oder in der StatsBar-Zeile):

```tsx
<div className="text-terminal-green/40 text-xs text-center mt-2">
  [M] Sound {soundOn ? 'an' : 'aus'}
</div>
```

b) `EventCard`: in `setSelectedIndex`-Pfaden (↑/↓/j/k, `onMouseEnter`) `soundEngine.tick()`, in `onChoice`-Aufrufen `soundEngine.confirm()` — jeweils EIN Aufruf an zentraler Stelle, nicht pro Branch duplizieren (DRY: die Keyboard-Navigation setzt an genau zwei Stellen `setSelectedIndex`, die Wahl läuft überall durch `onChoice(choice)` — dort einen Wrapper `choose(choice)` einführen).

**Step 7: Tests + manuelle Verifikation**

Run: `npm run test:client && npm run test`
Expected: PASS.

Manuell: Story-Modus → standardmäßig still; `M` drücken → Regen/Brummen setzt leise ein, Hinweis wechselt auf „an"; Auswahlwechsel tickt, Wahl klickt; Reload → Einstellung bleibt.

**Step 8: Commit**

```bash
git add client/src/components/GameScreen/index.tsx client/src/components/EventCard/index.tsx
git commit -m "feat(story): wire sound cues + [M] toggle with footer hint"
```

---

## Task 5: Flow-Fixes — Doppel-Enter & Fokus

> **⚠️ Sequenzierung:** Parallel wird `docs/plans/2026-07-10-menu-information-architecture-design.md` umgesetzt (Menü-Umbau: Hauptmenü → Experience-Picker → Simulation-Picker; `GameModeSelectModal` wird Simulation-Picker). Diesen Task ERST NACH dem Merge des Menü-Umbaus ausführen: (a) der Bug wirft den Spieler ins Hauptmenü — genau die Zone, die umgebaut wird; eine Diagnose gegen den alten Menü-Code wäre Wegwerfarbeit; (b) der Repro-Pfad ändert sich (Story startet dann direkt aus dem Experience-Picker); (c) die neuen semantischen Buttons mit `focus-visible`-Verhalten können den Fokus-Anteil des Bugs bereits beheben — nach dem Merge zuerst neu reproduzieren, dann entscheiden, ob nur noch der Input-Guard nötig ist. Tasks 1–4 sind vom Menü-Umbau unabhängig (disjunkte Dateien; Menü-Design erklärt In-Game-HUD explizit zum Non-Goal) und können jederzeit laufen.

**Kontext:** Beim schnellen Enter-Drücken (Verifikation 2026-07-10) landete der Spieler vom Story-Fluss unvermittelt im Hauptmenü (beobachtet nach ResultScreen → Tageswechsel). Der Typewriter (Task 2) entschärft Event-Cards; ResultScreen und Übergangsscreens brauchen einen Input-Guard.

**Files:**
- Create: `client/src/hooks/useInputGuard.ts`
- Test: `client/src/hooks/useInputGuard.browser.test.tsx`
- Modify: `client/src/components/ResultScreen/index.tsx` (Enter-Handler guarden)
- Ggf. Modify: der Screen, der zum Menü führt (bei Repro identifizieren)

**Step 1: Reproduzieren & Ursache festnageln**

@systematic-debugging — erst Ursache, dann Fix:
`npm run dev` → Story-Modus → auf einem ResultScreen 3× schnell Enter drücken. Beobachten, welcher Screen dazwischen aufblitzt (React DevTools oder `console.log` im keydown-Pfad der Kandidaten: ResultScreen, GameScreen-Tageswechsel, App `storyEnding`). Ergebnis im Commit-Text dokumentieren.

**Step 2: Failing Test für den Guard**

```tsx
// client/src/hooks/useInputGuard.browser.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInputGuard } from './useInputGuard';

describe('useInputGuard', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('blocks within the guard window, allows after', () => {
    const { result } = renderHook(() => useInputGuard(250, 'key-a'));
    expect(result.current()).toBe(false); // sofort: geblockt
    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current()).toBe(true); // nach 250ms: frei
  });

  it('re-arms when the key changes (new screen)', () => {
    const { result, rerender } = renderHook(({ k }) => useInputGuard(250, k), {
      initialProps: { k: 'screen-1' },
    });
    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current()).toBe(true);
    rerender({ k: 'screen-2' });
    expect(result.current()).toBe(false); // neuer Screen → wieder geblockt
  });
});
```

**Step 3: Test laufen lassen — muss fehlschlagen**

Run: `npm run test:client -- useInputGuard`
Expected: FAIL — Modul existiert nicht.

**Step 4: Guard implementieren**

```ts
// client/src/hooks/useInputGuard.ts
import { useEffect, useRef, useCallback } from 'react';

/**
 * Schluckt Eingaben kurz nach einem Screen-Wechsel, damit ein durchgereichter
 * Enter (z. B. vom vorherigen Screen) nicht sofort die nächste Aktion auslöst.
 * `key` neu setzen (z. B. event.id) re-armiert den Guard.
 */
export function useInputGuard(ms: number, key: unknown): () => boolean {
  const armedAtRef = useRef(Date.now());
  useEffect(() => {
    armedAtRef.current = Date.now();
  }, [key]);
  return useCallback(() => Date.now() - armedAtRef.current >= ms, [ms]);
}
```

**Step 5: Tests laufen lassen**

Run: `npm run test:client -- useInputGuard`
Expected: PASS (2 Tests).

**Step 6: Einbauen**

- `ResultScreen`: im Enter-keydown-Handler zuerst `if (!inputReady()) return;` mit `const inputReady = useInputGuard(250, /* stabiler Screen-Key, z.B. result-Referenz oder event.id */)`.
- Den in Step 1 identifizierten Menü-Sprung-Screen: gleichen Guard einbauen UND sicherstellen, dass die Default-Aktion „Weiter" ist, nicht „Zum Menü" (Button-Reihenfolge/Fokus prüfen).

**Step 7: Manuell verifizieren**

`npm run dev` → ResultScreen → Enter so schnell wie möglich hämmern → es darf NIE im Hauptmenü landen; Story läuft weiter.

**Step 8: Commit**

```bash
git add client/src/hooks/useInputGuard.ts client/src/hooks/useInputGuard.browser.test.tsx client/src/components/ResultScreen/index.tsx
git commit -m "fix(story): input guard after screen transitions, keep rapid enter in-flow"
```

---

## Task 6: End-to-End-Verifikation & Abschluss

**Step 1: Alle Tests**

Run: `npm run test && npm run test:client`
Expected: PASS, 0 Failures.

**Step 2: Runtime-Verifikation (Repo-Verify-Skill)**

`.claude/skills/verify/SKILL.md` folgen: `npm run dev`, Story-Modus neu starten und prüfen:
1. Artwork sichtbar heller, Ken-Burns-Drift läuft.
2. Event-Text tippt, Enter skippt, Choices erscheinen nach Textende.
3. Kapitel 1→2: Titelkarte „KAPITEL 2 — Einarbeitung".
4. `M` → Ambience an, Ticks/Confirm hörbar, Reload behält Einstellung; Default nach `localStorage.clear()` ist still.
5. Enter-Hämmern auf ResultScreens → kein Menü-Sprung.

**Step 3: Abschluss-Commit falls Reste**

```bash
git status --short   # nichts Unerwartetes offen
```
