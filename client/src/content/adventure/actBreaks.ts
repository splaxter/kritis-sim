/**
 * Act-break ("Fortsetzung folgt") screen copy, keyed by the act the player just
 * COMPLETED. The act-break fires on entering the first not-fully-authored
 * chapter (see isAtAuthoredStoryEnd). The screen title is derived as
 * "AKT {completedAct} — ENDE"; the body comes from here.
 *
 * To add a bespoke break for a new act: add an entry keyed by the completed act
 * number, reprising that act's actual cliffhanger. Any act without an entry
 * falls back to ACT_BREAK_DEFAULT, so a boundary can NEVER show stale copy —
 * the moment a chapter is promoted to FINISHED_CHAPTERS the screen stays
 * coherent (correct "AKT n" label + a fitting body) even before bespoke copy
 * for that act exists.
 */

export interface ActBreakParagraph {
  text: string;
  /** Emphasized punch line (e.g. the reprised cliffhanger line). */
  emphasis?: boolean;
  /** Centered tagline, e.g. "— FORTSETZUNG FOLGT —". */
  tagline?: boolean;
  /** Muted sub-note about what's coming. */
  note?: boolean;
}

// Act 2 — reprises adv_warning_signs ("Es passiert heute") and the Akt-1/2 throughline.
const ACT_2_BREAK: ActBreakParagraph[] = [
  { text: '03:14 Uhr. Die ersten fehlgeschlagenen Anmeldungen.\nDer Domänencontroller driftet. Der Countdown steht bei null.' },
  { text: 'Es passiert heute.', emphasis: true },
  {
    text:
      'Du hast die Warnzeichen gelesen, die niemand sonst lesen wollte. Du hast entschieden, wem du vertraust. Du bist geblieben, wo Stefan gehen musste.',
  },
  { text: 'Was als Probezeit begann, ist längst etwas anderes geworden.' },
  { text: '— FORTSETZUNG FOLGT —', tagline: true },
  {
    text: 'Akt 3 (Kapitel 9–12) ist in Arbeit. Deine Entscheidungen aus Akt 1 und 2 werden zählen, wenn der Sturm losbricht.',
    note: true,
  },
];

// Generic fallback — used for any boundary without bespoke copy.
export const ACT_BREAK_DEFAULT: ActBreakParagraph[] = [
  { text: 'Bis hierher reicht die Geschichte — vorerst.' },
  { text: 'Du bist weiter gekommen, als viele es geschafft hätten.\nDoch der Sturm ist noch nicht vorbei.' },
  { text: '— FORTSETZUNG FOLGT —', tagline: true },
  {
    text: 'Die nächsten Kapitel sind in Arbeit. Deine bisherigen Entscheidungen werden zählen, wenn es weitergeht.',
    note: true,
  },
];

export const ACT_BREAK_BODIES: Record<number, ActBreakParagraph[]> = {
  2: ACT_2_BREAK,
};

export function getActBreakBody(completedAct: number): ActBreakParagraph[] {
  return ACT_BREAK_BODIES[completedAct] ?? ACT_BREAK_DEFAULT;
}
