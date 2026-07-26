/**
 * AUDIT TRAIL act-break copy. Keyed by the number of the act just COMPLETED
 * (getLastCompletedAct), shown on the "Fortsetzung folgt" screen while later
 * acts are still being authored.
 */
import { ActBreakParagraph } from '../../adventure/actBreaks';

const ACT_1_BREAK: ActBreakParagraph[] = [
  { text: 'Der Auftrag steht: Auditfähigkeit herstellen. Die Kollegen hast du kennengelernt — und Bjorgs erste ‚[intern]‘-Notiz liegt schon in deinem Ticket.' },
  { text: 'Was du ab jetzt dokumentierst, wird später deine Munition — oder deine Blöße.', emphasis: true },
  { text: '— FORTSETZUNG FOLGT —', tagline: true },
  { text: 'Akt 2 („Die Spur") ist in Arbeit: der editierte Ticket-Export, die Spur im OWA-Log und die Grenze zwischen „Ich kann das" und „Ich darf das".', note: true },
];

const ACT_2_BREAK: ActBreakParagraph[] = [
  { text: 'Die Spur ist gesichert — sofern du sie sauber gesichert hast. Hashliste, Übergabeprotokoll, Freigabe: entweder liegt es vor, oder es fehlt.' },
  { text: 'Habe ich einen Beweis — oder nur einen Verdacht?', emphasis: true },
  { text: '— FORTSETZUNG FOLGT —', tagline: true },
  { text: 'Akt 3 („Die Blockade") ist in Arbeit: BASTION-01, der Lieferschein und die Schnittstellen-Mail, die die Bringschuld umdreht.', note: true },
];

const ACT_3_BREAK: ActBreakParagraph[] = [
  { text: 'Die Blockade ist adressiert. Bjorgs Ausreden stehen auf dem Prüfstand — und dein Umgang mit seinen Provokationen ist längst aktenkundig.' },
  { text: 'Gleich stellt der ISB seine Fragen.', emphasis: true },
  { text: '— FORTSETZUNG FOLGT —', tagline: true },
  { text: 'Akt 4 („Das Audit") ist in Arbeit: fünf Fragen, auf die nur deine Aktenlage antwortet.', note: true },
];

export const AUDIT_TRAIL_ACT_BREAKS: Record<number, ActBreakParagraph[]> = {
  1: ACT_1_BREAK,
  2: ACT_2_BREAK,
  3: ACT_3_BREAK,
};
