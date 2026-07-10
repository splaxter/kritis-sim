# Design: Story-Immersion für „Die Probezeit"

**Datum:** 2026-07-10
**Status:** Genehmigt
**Kontext:** 33 neue Noir-Illustrationen wurden in `story-events.ts` verdrahtet. Verifikation zeigte: Das Hintergrund-Overlay verdeckt ~75 % des Artworks; schnelles Doppel-Enter kann den Spieler auf einem Tages-Übergangsscreen ins Hauptmenü werfen. Ziel: Story-Modus immersiver machen — Artwork, Text-Dramaturgie, Sound, Flow.

**Ansatz:** Vier fokussierte, unabhängige Bausteine an bestehenden Komponenten. Kein Framework, kein Content-Schema-Eingriff, jeder Baustein einzeln revertierbar.

## 1. Artwork freilegen (`StoryBackground`)

- Overlay-Gradient aufhellen: `from-black via-black/80 to-black/50` → ca. `from-black/85 via-black/45 to-black/15`. Lesbarkeit bleibt gewahrt, da die Event-Card ein eigenes dunkles Panel ist.
- Ken-Burns-Effekt: CSS-Animation Scale 1,0 → 1,08 über ~40 s, `alternate`, auf dem aktiven Bild.
- Scanlines + Vignette bleiben unverändert (Terminal-Identität), Crossfade bleibt 800 ms.
- `prefers-reduced-motion: reduce` deaktiviert den Zoom.

## 2. Kino-Momente (`ChapterCard`, neue Komponente)

- Bei Kapitel-/Akt-Wechseln: Vollbild-Artwork, Titel „KAPITEL N — TITEL" tippt sich im Terminal-Stil auf, nach ~2,5 s oder beliebigem Tastendruck gleitet die Event-Card herein.
- Datenquellen existieren: `client/src/content/adventure/actBreaks.ts`, `chapters.ts`.
- Zusätzlich Kino-Beat für 3 Schlüssel-Events über eine `CINEMATIC_EVENTS`-Map in der Komponente (kein Schema-Eingriff): `adv_ransomware_strike`, `adv_attacker_identity`, `adv_climax`.

## 3. Text-Dramaturgie (`useTypewriter`-Hook in `EventCard`)

- Beschreibungstext tippt sich mit ~500 Zeichen/s auf.
- Enter während des Tippens = sofort Volltext; erst der nächste Enter wählt eine Option (entschärft nebenbei Doppel-Enter).
- Choices faden erst nach Textende (oder Skip) ein.
- `prefers-reduced-motion` → Text sofort vollständig.

## 4. Sound (prozedural, Web Audio) + Flow-Fixes

Neues Modul `client/src/audio/`:
- Lazy-Init des `AudioContext` nach erster Nutzer-Geste (Autoplay-Policy).
- Layer: Regen (gefiltertes weißes Rauschen), Raum-Brummen (tiefer Oszillator), UI-Tick bei Auswahlwechsel, Confirm-Klick, Alarm-Stinger bei Events mit Tag `incident`/`compromise`.
- Keine Asset-Dateien; alles synthetisiert. Master-Gain leise (≈ −18 dB).
- **Opt-in:** Default ist stumm. `[M]` schaltet Sound an/aus, Zustand in localStorage. Dezenter Hinweis im UI (z. B. „[M] Sound" in der Fußzeile), damit das Feature auffindbar ist.

Flow-Fixes:
- Fokus-Bug auf dem Tages-Übergangsscreen: Default-Fokus auf „Weiter", nicht auf „Beenden/Speichern".
- 250 ms Input-Guard nach Screen-Wechseln gegen durchgereichte Enter-Events.

## Tests

- Vitest: Typewriter-Timing (Fake Timers), Audio-Modul-Zustandslogik (Mute/Persistenz, Layer-Auswahl nach Tags).
- Ende-zu-Ende: manuell per Repo-Verify-Skill (`.claude/skills/verify/SKILL.md`) — Dev-Server, Story-Modus durchspielen, Kapitelwechsel + Schlüssel-Event prüfen.

## Entschiedene Alternativen

- **Scene-Director-Engine** (deklarative Szenen-Skripte im Content): verworfen — überdimensioniert für 4 Kapitel-Beats, Schema-Eingriff in 56 Events.
- **CC0-Sounddateien**: verworfen zugunsten prozeduraler Synthese — keine Lizenz-/Beschaffungsfragen, 0 KB Payload.
- **Vollbild-Beat für jedes Event**: verworfen — bei 56 Events zäh; Kino gezielt nur an Wendepunkten.
