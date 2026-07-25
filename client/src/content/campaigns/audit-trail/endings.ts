/**
 * AUDIT TRAIL endings — static base text plus a modular, domain-composed
 * epilogue. The epilogue only claims what the flags actually prove (design
 * §5.3), with two honesty rules baked in:
 *  - D1: audit logging COMPENSATES for the shared account but does not remove
 *    it — the epilogue only says the retirement is "im Audit beschlossen".
 *  - D3: base text is "Inbetriebnahme wird freigegeben"; only bastion_live
 *    (optional L8) upgrades it to "in Betrieb".
 */
import { AdventureEndingText } from '../../adventure/endings';
import { AUDIT_DOMAINS, AuditDomain, deriveAuditTrailEnding, satisfiedDomains, AuditTrailEnding } from './domains';

export const AUDIT_TRAIL_ENDING_TITLES: Record<AuditTrailEnding, string> = {
  profi: 'Der Profi',
  rache: 'Der Rächer',
  stille: 'Der Stille',
};

/** The "satisfied" epilogue line per domain (D3 is finished dynamically). */
const DOMAIN_EPILOGUE: Record<AuditDomain, string> = {
  D1: 'Das geteilte administrator-Konto steht als strukturelles Finding im Bericht, das Mailbox-Auditing läuft. Zurechenbarkeit ist noch nicht hergestellt — aber die Abstellung des Kontos wird im Audit beschlossen.',
  D2: 'Die Beweiskette hält: gemeldet, mandatiert, exportiert, gehasht — und kein eigenmächtiger Zugriff auf Postfachinhalte. Aus einem Verdacht ist ein Beleg geworden.',
  D3: '',
  D4: 'Die Dokumentation der letzten Monate liegt vor: das Onboarding-Inventar und der per diff belegte Ticket-Eingriff. Wer dokumentiert, existiert.',
  D5: "Bjorgs ‚[intern]‘-Notizen hast du gesichert statt beantwortet, und nie eine Spitze produziert. Du musstest nie laut werden.",
};

function d3Line(flags: Record<string, boolean>): string {
  return flags['bastion_live']
    ? 'BASTION-01 ist in Betrieb — der Dienstleister-Zugriff läuft nur noch über die Bastion, mit MFA.'
    : 'Der Lieferschein belegt: MFA war Teil des Pakets. Die Inbetriebnahme von BASTION-01 wird freigegeben.';
}

const RAECHER_EPILOGUE = [
  'Du hattest in der Sache recht — und trotzdem reicht es nicht.',
  'Vertrauensschaden: Bert muss den Vorgang jetzt gegen den Personalrat verteidigen, statt ihn mit dir gemeinsam aufzuklären.',
  'Datenschutzschaden: Die eigenmächtige Auswertung ist selbst zum Datenschutzvorfall geworden und muss bewertet und dokumentiert werden — eine Behördenmeldung nach Art. 33 DSGVO folgt nur, sofern der Vorfall voraussichtlich ein Risiko für die Rechte und Freiheiten der Betroffenen verursacht.',
  'Eskalationsschaden: Bjorgs Dossier bestimmt jetzt die Erzählung, nicht die technische Sache.',
  'Du hattest recht. Es hat nicht gereicht.',
].join('\n\n');

/** Compose the domain-aware epilogue for the derived ending. */
export function buildAuditTrailEpilogue(flags: Record<string, boolean>): string {
  const ending = deriveAuditTrailEnding(flags);
  if (ending === 'rache') return RAECHER_EPILOGUE;

  const domains = satisfiedDomains(flags);
  const lines = domains.map(d => (d === 'D3' ? d3Line(flags) : DOMAIN_EPILOGUE[d]));

  if (ending === 'profi') {
    return [
      'Der neue ISB stellt seine Fragen — und auf jede gibt es eine belastbare Antwort. Bjorgs Ausreden kollabieren vor ihm von selbst, ohne dass du laut werden musstest.',
      ...lines,
    ].join('\n\n');
  }

  // stille
  if (domains.length < 2) {
    return [
      'Beim Audit stehst du mit leeren Händen da. Bjorgs kuratierte Ticket-Historie erzählt die Geschichte — deine.',
      'Wer nicht dokumentiert, existiert nicht.',
    ].join('\n\n');
  }
  // lower Stille variant (2–3 domains): name what held, and the gaps that remain.
  const missing = (['D1', 'D2', 'D3', 'D4', 'D5'] as AuditDomain[])
    .filter(d => !domains.includes(d))
    .map(d => AUDIT_DOMAINS[d].label);
  return [
    'Beim Audit reicht es für Teile des Bildes — nicht für das ganze.',
    ...lines,
    `Was fehlt, bleibt hängen: ${missing.join(', ')}.`,
  ].join('\n\n');
}

/** Static base text for each ending (title + conference-room framing). The
 *  epilogue here is a fallback; the live game composes it via
 *  buildAuditTrailEpilogue once the run's flags are known. */
export const AUDIT_TRAIL_ENDING_TEXTS: Record<AuditTrailEnding, AdventureEndingText> = {
  profi: {
    id: 'at_ending_profi',
    title: AUDIT_TRAIL_ENDING_TITLES.profi,
    paragraphs: [
      'Der ISB klappt seinen Ordner zu. „Das ist die sauberste Aktenlage, die ich dieses Jahr gesehen habe."',
      'Silke — pardon, Bert — atmet hörbar aus. Bjorg schweigt, zum ersten Mal seit Wochen.',
    ],
    epilogue: 'Du musstest nie laut werden.',
  },
  rache: {
    id: 'at_ending_rache',
    title: AUDIT_TRAIL_ENDING_TITLES.rache,
    paragraphs: [
      'Der ISB legt den Ausdruck deiner eigenmächtigen Log-Auswertung auf den Tisch. „Wer hat das freigegeben?"',
      'Niemand. Also du.',
    ],
    epilogue: 'Du hattest recht. Es hat nicht gereicht.',
  },
  stille: {
    id: 'at_ending_stille',
    title: AUDIT_TRAIL_ENDING_TITLES.stille,
    paragraphs: [
      '„Zeigen Sie mir Ihre Dokumentation", sagt der ISB. Du greifst ins Leere.',
      'Bjorg schiebt eine Mappe über den Tisch. Seine Version. Gut sortiert.',
    ],
    epilogue: 'Wer nicht dokumentiert, existiert nicht.',
  },
};
