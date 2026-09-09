/**
 * DAS KATASTER — ending texts and the modular epilogue.
 *
 * Honesty rule, same as AUDIT TRAIL: the epilogue asserts ONLY what a flag
 * proves. Concretely:
 *  - K5 says the gaps are ON THE MANAGEMENT'S DESK, never that they were
 *    closed — there is no `kat_gaps_closed` in V1.
 *  - K2 says four duties have a name that KNOWS about it. Not that the duties
 *    were performed.
 *  - The automated deadline report only appears with `kat_reminder_live`
 *    (the optional L8★). Without it no scene claims a running automation.
 */
import { AdventureEndingText } from '../../adventure/endings';
import {
  KatasterDomain,
  KATASTER_DOMAINS,
  satisfiedDomains,
  deriveKatasterEnding,
} from './domains';

export const KATASTER_ENDING_TEXTS: Record<string, AdventureEndingText> = {
  gruene_liste: {
    id: 'ending_kataster_gruene_liste',
    title: 'Die grüne Liste',
    paragraphs: [
      'Michael blättert nicht lange. Er hat sich drei Zeilen angestrichen, bevor er kam, und die zweite ist die, bei der er stehen bleibt. „Hier steht ein Aufpasser. Zeigen Sie mir den letzten Prüfnachweis."',
      'Es gibt keinen. Es hat nie einen gegeben. Die Zeile war grün, weil ein Name darin stand, und der Name stand darin, weil eine leere Zelle unangenehm aussah.',
      'Er schreibt mit. Nicht hektisch — sorgfältig, und das ist schlimmer. „Eine Lücke wäre ein Mangel gewesen", sagt er dabei, ohne aufzublicken. „Eine Angabe, die nicht stimmt, ist ein Befund. Die beiden haben nichts miteinander zu tun."',
      'Was danach passiert, ist keine Strafe. Es ist Arbeit. Michael kann ab jetzt nichts mehr stichprobenartig prüfen — wenn eine Zeile nicht stimmt, kann jede nicht stimmen. Aus zwei Prüftagen werden fünf. Bert, der das Kataster nach oben gegeben hat, verteidigt jetzt ein Dokument, das er nie geprüft hat. Und in einer der Zeilen steht ein Kollege als Verantwortlicher, der davon zum ersten Mal vom Auditor erfährt.',
    ],
    epilogue:
      'Das Kataster liegt weiter im Netzlaufwerk. Es ist jetzt vollständig — jede Zeile einzeln verifiziert, von Michael, in fünf Tagen, die niemand eingeplant hatte.\n\nEs war alles grün. Das war das Problem.',
  },

  ordner: {
    id: 'ending_kataster_ordner',
    title: 'Der halb leere Ordner',
    paragraphs: [
      'Michael nimmt das Kataster entgegen, überfliegt es und bedankt sich. Er ist freundlich. Er ist es die ganzen zwei Tage.',
      'Er stellt seine Fragen, du beantwortest, was du beantworten kannst, und bei dem Rest sagst du die Wahrheit: dass du es nicht weißt. Das ist mehr, als sein letzter Termin hier hergegeben hat. Es ist trotzdem nicht viel.',
      '„Ich schreibe rein, dass ein Kataster begonnen wurde", sagt er beim Gehen. „Das ist ehrlicher als das, was ich oft sehe." Er meint es freundlich. Es klingt trotzdem wie eine Zwischennote.',
      'Der Ordner von Reinhard Kalb steht weiter im Regal. Er hat jetzt einen Nachfolger im Netzlaufwerk — auch der beschreibt nicht, was dieser Betrieb wirklich schuldet.',
    ],
    epilogue:
      'Drei Wochen später ruft die Komm.ONE an, wegen einer Frist. Du suchst im Kataster. Die Zeile ist da. Das Feld daneben ist leer.\n\nEin Kataster, das niemand füllt, ist ein Ordner. Ein Ordner, den niemand liest, ist ein Regalbrett.',
  },

  aufpasser: {
    id: 'ending_kataster_aufpasser',
    title: 'Der Aufpasser',
    paragraphs: [
      'Michaels Bericht hat sechs Befunde. Er legt ihn auf den Tisch, und Bert greift danach, wie man nach einem Zahnarztbefund greift.',
      'Dann fällt es ihm auf. Alle sechs stehen schon im Kataster. Mit Datum. Eingetragen, bevor sie jemand gefunden hat.',
      '„Das ist ungewöhnlich", sagt Michael, und für seine Verhältnisse klingt es fast begeistert. „Normalerweise erkläre ich Betreibern, was ihnen fehlt. Hier lese ich es vor und Sie nicken." Er tippt auf die Spalte mit den Namen. „Und das hier ist der Teil, den fast niemand macht. Da stehen Personen. Keine Abteilungen."',
      'Dr. Müller fragt, was das kostet. Michael rechnet es ihr vor: nichts, was nicht ohnehin fällig gewesen wäre — nur eben zu bekannten Terminen statt als Überraschung. Es ist das erste Mal, dass jemand aus der IT ihr eine Zahl nennt, die vorher schon feststand.',
    ],
    epilogue: '', // composed per domain — see buildKatasterEpilogue
  },
};

/** One line per domain, only emitted when the domain actually holds.
 *  Exported so the honesty test can assert presence/absence per domain
 *  directly, instead of inferring which sentence belongs to which domain. */
export const DOMAIN_LINES: Record<KatasterDomain, string> = {
  K1: 'Vier Quellen sind erschlossen: Verträge, Aufsicht, Dienstvereinbarung, Lizenzen. Der Satz „das wusste keiner" ist bei WARM nicht mehr wahr.',
  K2: 'Keine Zeile bleibt stillschweigend unbesetzt. Wo ein Name steht, weiß die Person davon — schriftlich.',
  K3: 'Hinter den Häkchen liegen Dokumente. Ein Aufpasser ohne Nachweis wurde zurückgestuft, nicht durchgewunken.',
  K4: 'Die Lücken sind benannt, mit Datum, im Kataster. Auch die, die unangenehm waren.',
  K5: 'Die offenen Punkte liegen auf dem Tisch der Leitung — nicht geschlossen, aber auch nicht mehr allein deine.',
};

/**
 * Compose the epilogue from what the run actually proved.
 *
 * The good ending gets a per-domain build; the other two carry their static
 * epilogue, except the 2–3-domain "Ordner" variant, which names what was
 * achieved before it names what stayed open.
 */
export function buildKatasterEpilogue(flags: Record<string, boolean>): string {
  const ending = deriveKatasterEnding(flags);
  const held = satisfiedDomains(flags);

  if (ending === 'gruene_liste') return KATASTER_ENDING_TEXTS.gruene_liste.epilogue;

  if (ending === 'ordner') {
    if (held.length === 0) return KATASTER_ENDING_TEXTS.ordner.epilogue;
    const done = held.map((d) => KATASTER_DOMAINS[d].label).join(', ');
    const open = (['K1', 'K2', 'K3', 'K4', 'K5'] as KatasterDomain[])
      .filter((d) => !held.includes(d))
      .map((d) => KATASTER_DOMAINS[d].label)
      .join(', ');
    return (
      `Was steht: ${done}. Das ist mehr als nichts, und es ist an den Tagen, an denen jemand danach fragt, genau das, was zählt.\n\n` +
      `Was fehlt: ${open}. Das ist der Teil, den Michael beim nächsten Termin zuerst aufschlägt — und der Teil, der bis dahin niemandem gehört.\n\n` +
      `Ein halb geführtes Kataster beantwortet halbe Fragen.`
    );
  }

  const lines = held.map((d) => DOMAIN_LINES[d]);
  if (flags.kat_reminder_live) {
    lines.push(
      'Und am ersten Montag im Monat liegt ein Report im Postfach — nicht in `info@`, sondern bei einer Person, mit den Fristen der nächsten dreißig Tage. Er kommt, ohne dass jemand daran denkt. Das ist der Punkt.'
    );
  }

  return (
    lines.join('\n\n') +
    '\n\nBeim Rausgehen sagt Michael noch einen Satz, halb im Türrahmen, so beiläufig, dass du ihn erst im Treppenhaus verstehst:\n\n' +
    '„Ein Audit, das nichts findet, was Sie nicht schon wussten, ist ein gutes Audit."'
  );
}
