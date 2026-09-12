/**
 * DAS KATASTER act breaks — text-only interstitials (no chapter art, same as
 * AUDIT TRAIL, so no probation asset leaks in).
 *
 * Each break restates what the register currently says about the operation.
 * That is the campaign's tension made visible: the number of rows without an
 * owner is the score, and it is allowed to get worse before it gets better.
 */
import { ActBreakParagraph } from '../../adventure/actBreaks';

const ACT_1_BREAK: ActBreakParagraph[] = [
  { text: 'Eine Zeile. Vier Spalten. Zwei davon leer.' },
  {
    text: 'Der Ordner deines Vorgängers hat elf Blätter für einen Betrieb, der 620.000 Einwohner entsorgt. Was darin nicht steht, schuldet ihr trotzdem.',
  },
  { text: 'Die Frage ist nicht, ob es läuft. Die Frage ist, wer es merkt, wenn es aufhört.', emphasis: true },
  { text: '— FORTSETZUNG FOLGT —', tagline: true },
  { text: 'Akt 2: Vier Quellen. Vier Orte, an denen Pflichten entstehen.', note: true },
];

const ACT_2_BREAK: ActBreakParagraph[] = [
  {
    text: 'Das Kataster ist voller geworden und sieht schlechter aus. Das ist kein Widerspruch — das ist der Fortschritt.',
  },
  {
    text: 'Verträge, Lizenzen, eine Dienstvereinbarung, die auf ein Handbuch verweist, das es nicht gibt, und eine Erinnerung der Aufsicht in einem Postfach, das allen gehört und deshalb niemandem.',
  },
  { text: 'Jede rote Zeile ist eine Uhr, die schon läuft.', emphasis: true },
  { text: '— FORTSETZUNG FOLGT —', tagline: true },
  { text: 'Akt 3: Die ersten Uhren klingeln.', note: true },
];

const ACT_3_BREAK: ActBreakParagraph[] = [
  {
    text: 'Es kam nicht als Alarm. Es kam als Briefumschlag, als Rechnung, als Frage in einer Runde, in der du nicht damit gerechnet hast.',
  },
  {
    text: 'Was einen Aufpasser hatte, wurde ein Termin. Was keinen hatte, wurde eine Überraschung — und Überraschungen kosten hier Geld, das niemand eingeplant hat.',
  },
  { text: 'In zwei Wochen kommt Michael wieder. Diesmal mit einem Block.', emphasis: true },
  { text: '— FORTSETZUNG FOLGT —', tagline: true },
  { text: 'Akt 4: Der Audit-Tag. Drei Zeilen, drei Fragen: Wer? Womit? Wann wieder?', note: true },
];

export const KATASTER_ACT_BREAKS: Record<number, ActBreakParagraph[]> = {
  1: ACT_1_BREAK,
  2: ACT_2_BREAK,
  3: ACT_3_BREAK,
};
