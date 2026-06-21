# Visual Feedback Spec — Stat Colour, Defeat Warnings, Empty Screens

**Author:** Level design · **For:** Frontend/engine · **Status:** ready to implement

Addresses the playtest feedback: monochrome bars hide hierarchy, equal-looking
stress at 35 vs 95, no pre-defeat warning, dead space on intro/menu screens.

**Non-goal:** the green-on-black terminal aesthetic stays. This adds *semantic
accent* on top of it — danger reads red, warning yellow, healthy green — without
turning the UI into a rainbow. Skills stay calm; only the metrics that can *end
the run* get hot colours.

---

## 0. Colour tokens (already in the codebase — reuse, don't invent)

| Meaning | Tailwind class |
|---|---|
| Healthy / good | `text-terminal-green`, bright: `text-terminal-success` |
| Neutral / low-signal | `text-terminal-green-dim`, `text-terminal-green-muted` |
| Warning | `text-terminal-warning` |
| Danger / critical | `text-terminal-danger` |
| Info / score | `text-terminal-info` |

All bands below are expressed in these classes so nothing new is needed in the theme.

---

## 1. Bands are RELATIVE to the mode's game-over thresholds

The defeat conditions live in `checkGameOver` (`client/src/engine/gameState.ts`)
and the numbers differ per mode (`shared/src/config/gameModes.ts`):

- `stress >= thresholds.stressGameOver` — usually **100**, learning **120**
- `relationships.chef <= thresholds.chefRelationshipGameOver` — **-100**
- `compliance <= thresholds.complianceGameOver` — usually **0**, hard **10**

So **derive the bands from `config.thresholds`, do not hardcode 80/90.** A mode
that moves a threshold should move its colours with it for free. Suggested helper:

```ts
// danger when within `dangerMargin` of losing; warning at the next step out.
function stressBand(stress: number, go: number) {
  if (stress >= go - 10) return 'danger';   // e.g. >=90 (kritis) / >=110 (learning)
  if (stress >= go * 0.55) return 'warning'; // e.g. >=55 / >=66
  return 'ok';
}
function complianceBand(c: number, go: number) {
  if (c <= go + 10) return 'danger';         // e.g. <=10 (kritis) / <=20 (hard)
  if (c <= go + 25) return 'warning';
  return 'ok';
}
function chefBand(v: number, go: number) {    // go = -100
  if (v <= go + 20) return 'danger';         // <=-80
  if (v <= go + 60) return 'warning';        // <=-40
  if (v > 30) return 'good';
  return 'ok';
}
```

`ok`→green, `warning`→warning, `danger`→danger, `good`→success.

---

## 2. Status bar (`StatsBar/index.tsx`, lines ~129-137)

### 2a. Stress — gradient the BAR, not just the text
Today only the label colour flips; the `█/░` glyph is one flat colour. Colour
**each filled block by the band its position falls into**, so a near-full bar
literally reddens from the right:

```
Stress: ██████░░░░  35/100   ← 3-4 green blocks, rest empty (calm)
Stress: ████████▓▓  85/100   ← green → yellow → red across the fill (alarming)
```

Per-block rule (block `i` = stress 10·i … 10·i+9): green below the warning band,
warning inside it, danger inside the danger band — using `stressBand` on `(i+1)*10`.
Keep the existing `{stress}/100` numeric readout.

### 2b. Compliance & budget
- **Compliance**: apply `complianceBand` → colour the `Compliance: {n}%` text.
  This is the BSI-audit lose condition; at `danger` it must read red.
- **Budget**: `text-terminal-danger` when `< 0` (overdrawn), `text-terminal-warning`
  when `< 2000`, else default. Money turning red is universally legible.

---

## 3. Skills (`SkillBar.tsx`) — calm 3-tier, NO red

Skills can't lose you the game, so don't alarm — just enable scanning. Tier the
**bar glyph** colour (leave the name dim as-is):

| Value | Class | Read |
|---|---|---|
| `>= 70` | `text-terminal-success` | strong |
| `30–69` | `text-terminal-green` | competent |
| `< 30` | `text-terminal-green-muted` | weak / training target |

This alone makes "where am I thin?" obvious at a glance.

---

## 4. Relationships (`RelationshipBar.tsx`) — surface negativity earlier

The current neutral band `[-30, +30]` is too wide — Kämmerer at -15 reads as
healthy green. Tighten it, and treat **Chef** specially (it's a lose condition):

**Non-chef** (`kaemmerer`, `gf`, `fachabteilung`, `kollegen`):
| Value | Class |
|---|---|
| `> 30` | `text-terminal-success` |
| `-9 … 30` | `text-terminal-green` |
| `-49 … -10` | `text-terminal-warning` |
| `<= -50` | `text-terminal-danger` |

**Chef** — use `chefBand` (tied to the -100 firing threshold) so it goes danger
well before the banner fires. Keep the existing per-NPC name `color` accent.

---

## 5. Pre-defeat warning banner (NEW)

A thin pulsing line directly above the stats grid whenever **any** metric enters
its `danger` band (per §1). Drives the "the end never feels random" fix.

- **Placement:** between the header and the skills/relationships grid in `StatsBar`.
- **Style:** `text-terminal-danger`, `animate-pulse` (or the keyframe in §6),
  full-width, bordered `border-terminal-danger`, small.
- **Content (German), show all that apply, most-severe first):**

| Trigger (mode-relative) | Text |
|---|---|
| `stress >= go - 10` | `⚠ BURNOUT-GEFAHR — Stress kritisch ({stress}/{go}). Eine harte Woche und du bist raus.` |
| `chef <= chefGO + 20` | `⚠ Dein Chef steht kurz davor, die Probezeit zu beenden.` |
| `compliance <= complGO + 10` | `⚠ Compliance im roten Bereich — ein BSI-Audit würde jetzt ein Bußgeld auslösen.` |

If none apply, render nothing (no layout shift — reserve the row or use conditional mount, your call).

**Acceptance:** entering a danger band shows the matching line and pulses;
leaving it removes the line; thresholds read from `config.thresholds`, not literals.

---

## 6. Empty intro / menu screens — ASCII art + CRT scanlines

Two cheap, on-theme wins for the dead space.

### 6a. Scanline overlay (subtle)
A fixed overlay inside the terminal frame:

```css
.crt-scanlines::after {
  content: '';
  position: absolute; inset: 0; pointer-events: none;
  background: repeating-linear-gradient(
    to bottom,
    rgba(0,0,0,0) 0px,
    rgba(0,0,0,0) 2px,
    rgba(0,255,128,0.04) 3px,
    rgba(0,0,0,0) 4px
  );
  mix-blend-mode: overlay;
}
@keyframes crt-flicker { 0%,100% { opacity: .9 } 50% { opacity: 1 } }
/* apply animation: crt-flicker 6s ease-in-out infinite on the overlay; keep it barely perceptible */
```

Gate behind a `prefers-reduced-motion` check (skip the flicker, keep the static lines).

### 6b. Title ASCII art for the intro/menu hero
Drop this in the empty space above the menu (monospace, `text-terminal-green`,
with `text-terminal-green-dim` for the subtitle line):

```
   ██╗  ██╗██████╗ ██╗████████╗██╗███████╗
   ██║ ██╔╝██╔══██╗██║╚══██╔══╝██║██╔════╝
   █████╔╝ ██████╔╝██║   ██║   ██║███████╗
   ██╔═██╗ ██╔══██╗██║   ██║   ██║╚════██║
   ██║  ██╗██║  ██║██║   ██║   ██║███████║
   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝   ╚═╝   ╚═╝╚══════╝
       A D M I N   S I M U L A T O R

        [ ░▒▓ SYSTEM ONLINE ▓▒░ ]
   "Irgendjemand muss die Server am Laufen halten.
              Diese Woche bist du das."
```

(If you want a second motif for the game-over screen, ping me — I'll author a
"FIRED / BURNOUT / BSI-BUSSGELD" variant set keyed off the `reason` field.)

---

## 7. Suggested test coverage

- `StatsBar` band unit tests: feed stress 35/55/90 (kritis) and 90/110 (learning),
  assert the right class — proves the mode-relative derivation.
- Warning-banner test: chef at -85 mounts the firing line; at -50 it doesn't.
- Snapshot/`prefers-reduced-motion`: scanline flicker disabled when set.
```
```

**Open question for you (engineer):** the banner in §5 is the one place I'd want
your read on placement — above the stats vs. a toast over the event card. I lean
above-stats (always visible, no dismiss), but you own the layout.
