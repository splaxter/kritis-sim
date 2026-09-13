// ═════════════════════════════════════════════════════════════════════
// BETREIBER-DATEN — Pflichtangaben nach § 5 TMG (Impressum) und Art. 13
// DSGVO (Verantwortliche Stelle).
//
// Hier steht NUR das Datum, nicht seine Darstellung: die Angaben sind eine
// Konfiguration des Betreibers und gehören nicht in eine React-Komponente.
// Wer sie ändert, muss dafür kein JSX anfassen — und der Guard in
// config/legal.test.ts prüft sie, ohne etwas rendern zu müssen.
//
// Der scharfe Guard bleibt: kein TODO/XXX/example.com darf je wieder
// einziehen (LegalPages.browser.test.tsx prüft zusätzlich das gerenderte
// Ergebnis).
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

/** True, solange irgendein Feld noch einen Platzhalter trägt. */
export function hasLegalPlaceholders(owner: LegalOwner): boolean {
  return Object.values(owner).some(
    (v) => v.includes('TODO') || v.includes('XXX') || v.includes('example.com')
  );
}

export const LEGAL_DATA_IS_PLACEHOLDER = hasLegalPlaceholders(LEGAL_OWNER);
