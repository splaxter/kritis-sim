// client/src/config/legal.ts
// ═════════════════════════════════════════════════════════════════════
// ⚠️  BETREIBER-DATEN — VOR PRODUKTIV-DEPLOYMENT AUSFÜLLEN!  ⚠️
// Pflichtangaben nach § 5 TMG (Impressum) und Art. 13 DSGVO
// (Verantwortliche Stelle). Solange hier TODO-Platzhalter stehen, ist
// die Seite NICHT rechtskonform. Der Guard-Test in
// components/LegalPages/LegalPages.browser.test.tsx ist deshalb als
// `it.fails` markiert — nach dem Eintragen echter Daten dort
// `it.fails` → `it` umstellen, damit er dauerhaft wacht.
// ═════════════════════════════════════════════════════════════════════

export interface LegalOwner {
  name: string;
  street: string;
  city: string;
  country: string;
  email: string;
  /** Nach § 5 TMG optional — auf '' setzen, um die Zeile auszublenden. */
  phone: string;
}

export const LEGAL_OWNER: LegalOwner = {
  name: 'TODO Vorname Nachname',
  street: 'TODO Straße Hausnummer',
  city: 'TODO PLZ Ort',
  country: 'Deutschland',
  email: 'TODO ihre-email@example.com',
  phone: 'TODO +49 XXX XXXXXXX',
};

/** True solange irgendein Feld noch einen TODO-Platzhalter trägt. */
export function hasLegalPlaceholders(owner: LegalOwner): boolean {
  return Object.values(owner).some((v) => v.includes('TODO'));
}

export const LEGAL_DATA_IS_PLACEHOLDER = hasLegalPlaceholders(LEGAL_OWNER);
