// client/src/config/legal.ts
// ═════════════════════════════════════════════════════════════════════
// BETREIBER-DATEN — Pflichtangaben nach § 5 TMG (Impressum) und Art. 13
// DSGVO (Verantwortliche Stelle). Der Guard-Test in
// components/LegalPages/LegalPages.browser.test.tsx ist scharf geschaltet
// und bricht den Build, falls je wieder ein TODO/XXX-Platzhalter einzieht.
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
  name: 'Timo Klingenberger',
  street: 'Schlehenweg 16',
  city: '71364 Winnenden',
  country: 'Deutschland',
  email: 'hi@timoklinge.com',
  phone: '',
};

/** True solange irgendein Feld noch einen TODO-Platzhalter trägt. */
export function hasLegalPlaceholders(owner: LegalOwner): boolean {
  return Object.values(owner).some((v) => v.includes('TODO'));
}

export const LEGAL_DATA_IS_PLACEHOLDER = hasLegalPlaceholders(LEGAL_OWNER);
