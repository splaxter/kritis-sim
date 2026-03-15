// Deutsche Telekom Business - NPC Definitions
import { VendorNpc, NpcContact, RelationshipSystem, GameplayMechanics } from '@kritis/shared';

export const thomasContact: NpcContact = {
  id: 'TELEKOM-THOMAS',
  name: 'Thomas Kellermann',
  role: 'Technischer Kundenberater',
  age: 44,
  personality: `Der "Verbindungsmensch" — hat schon 1995 ISDN-Leitungen gelegt und erzählt gerne davon. Kennt das Telefonnetz besser als sein eigenes Wohnzimmer. Macht seinen Job eigentlich gut, aber ist völlig überbucht. Zwischen 3 Großkunden und 15 Mittelständlern jongliert er permanent. Seine Standardantwort: "Das Ticket ist eskaliert." Was bedeutet: Es liegt jetzt bei einem Kollegen der es auch nicht bearbeiten wird.`,
  appearancePrompt: `Character portrait, cartoon game style. A German telecom technician in his mid-40s. Slightly weathered face from years of climbing cable posts. Wearing a magenta Telekom jacket over a button-down shirt. Has a thick binder with network diagrams under his arm. Multiple pagers and phones. Reading glasses pushed up on forehead. Expression: helpful but overwhelmed. Bold outlines, flat cartoon style, chest-up portrait.`,
  catchphrases: [
    'Das Ticket ist eskaliert, ich melde mich.',
    'Das ist ein Provider-Problem auf der letzten Meile.',
    'Haben Sie schon einen Neustart der Fritzbox versucht?',
    'Ich sehe hier einen Engpass am Verteiler — da muss ich Kapazitäten beantragen.',
    'Die Leitung ist physisch in Ordnung, das muss an der Gegenseite liegen.',
    'Wir haben gerade ein größeres Projekt im Backbone, deswegen die Verzögerung.',
    'Ich hab mal für 3 Wochen eine temporäre Bandbreitenerhöhung eingerichtet.',
    'Der Kollege von der Technik meldet sich bei Ihnen... *meldet sich nie*',
    'Das steht so nicht im Vertrag — ich muss prüfen was machbar ist.',
    'Die Entstörung ist beauftragt. Zeitfenster: 8 bis 17 Uhr.',
  ],
  dialogueBarks: [
    'Haben Sie die Ticket-Nummer zur Hand? Ich find hier fünf offene Vorgänge...',
    'Der Backbone ist stabil, das Problem liegt beim Zugang.',
    'Ich seh hier eine Latenz von 47ms — für KRITIS grenzwertig.',
    'Die Business-Leitung hat Vorrang, aber der Entstörer ist heute in Düsseldorf.',
    'Wir hatten gestern Wartung am Verteiler — vielleicht hängt das damit zusammen.',
    'Das könnte am Peering liegen. Frankfurt hat gerade Probleme.',
    'Ich schick Ihnen mal den Netzplan per Mail — ach ne, darf ich nicht.',
    'Für redundante Anbindung brauchen wir einen zweiten Hausanschluss. Bauzeit: 6 Monate.',
  ],
};

export const sabineContact: NpcContact = {
  id: 'TELEKOM-SABINE',
  name: 'Sabine Weiland',
  role: 'Key Account Managerin',
  age: 38,
  personality: `Sales-Profi durch und durch. Erscheint zu jedem Termin mit Magenta-Werbematerial und Kugelschreibern. Verspricht gerne "individuelle KRITIS-Lösungen" die dann doch Standard-Produkte sind. Wird sehr aufmerksam wenn es um Vertragsverlängerung geht. Ihre Handynummer funktioniert zuverlässig 2 Wochen vor und nach Vertragsverhandlungen.`,
  appearancePrompt: `Character portrait, cartoon game style. A German sales manager in her late 30s. Professional appearance, perfectly styled hair, wearing a magenta blazer over white blouse. Carrying a leather portfolio with Telekom logo. Bright smile, firm handshake energy. Background hint of presentation slides with "Digitalisierung" buzzwords. Bold outlines, flat cartoon style, chest-up portrait.`,
  catchphrases: [
    'Wir haben da ein neues KRITIS-Paket das perfekt zu Ihnen passt!',
    'Die SD-WAN-Lösung wäre ideal für Ihre Anforderungen.',
    'Ich nehme das in unseren Premium-Support auf — persönliche Betreuung!',
    'Bei Vertragsverlängerung könnte ich Ihnen 15% Rabatt anbieten...',
    'Haben Sie schon an eine dedizierte Glasfaser-Anbindung gedacht?',
  ],
  dialogueBarks: [
    'Lassen Sie uns einen Workshop zu Ihren Anforderungen machen!',
    'Ich verstehe Ihre Frustration — ich eskaliere das an den Vorstand.',
    'Unser neuer Technical Account Manager meldet sich bei Ihnen.',
    'Für KRITIS-Kunden haben wir jetzt eine eigene Hotline!',
    'Das Angebot ist nur noch diese Woche gültig.',
  ],
};

export const relationshipSystem: RelationshipSystem = {
  description: 'Die Telekom ist groß und bürokratisch. Manchmal hilft das (Ressourcen), manchmal hindert es (Prozesse). Die Beziehung bestimmt ob du bei Störungen schnell oder langsam Hilfe bekommst.',
  businessLevels: [
    { level: 1, name: 'Einer von tausend Kunden', threshold: 0 },
    { level: 2, name: 'Bekannter Firmenname', threshold: 100 },
    { level: 3, name: 'Key Account (auf dem Papier)', threshold: 250 },
    { level: 4, name: 'Echter Key Account', threshold: 450 },
    { level: 5, name: 'Strategischer Partner', threshold: 700 },
  ],
  technicalTrustLevels: [
    { level: 1, name: 'Ich prüfe alles selbst', threshold: 0 },
    { level: 2, name: 'Die Basics stimmen', threshold: 75 },
    { level: 3, name: 'Verlässliche Entstörung', threshold: 175 },
    { level: 4, name: 'Proaktives Monitoring', threshold: 350 },
  ],
  specialEvents: {
    'business_level_3': 'Du bekommst eine eigene Hotline-Durchwahl für Störungen.',
    'business_level_4': 'Ein Technical Account Manager wird dir zugewiesen.',
    'technical_trust_level_3': 'Die Telekom informiert dich proaktiv über geplante Wartungen.',
  },
};

export const companyQuirks: string[] = [
  'Störungsmeldung nur telefonisch, nicht per Mail — "aus Dokumentationsgründen"',
  'SLA-Zeiten gelten ab Ticket-Erstellung, nicht ab Störungsbeginn',
  'Techniker-Termine: "Irgendwann zwischen 8 und 17 Uhr"',
  'Für jeden Router-Austausch braucht man ein neues Ticket',
  'Die Kundennummer ist 12-stellig und ändert sich nach jeder Vertragsverlängerung',
  'Das Kundenportal zeigt andere Daten als der Support am Telefon sieht',
  'Bei Backbone-Störungen ist die Hotline überlastet — dann kommt man gar nicht durch',
  'Geplante Wartungen werden per Mail an den Hausmeister gesendet (weil er im Vertrag als "Technischer Kontakt" steht)',
  'Die Entstör-Techniker haben andere Tools als der 1st-Level-Support und können nicht auf deren Systeme zugreifen',
];

export const telekomVendor: VendorNpc = {
  id: 'NPC-TELEKOM',
  companyName: 'Telekom Deutschland GmbH',
  companyType: 'Telekommunikationsanbieter / WAN-Provider',
  contract: 'Business-Internet 200/50 Mbit/s symmetrisch mit Company Connect VPN, SLA 99.5%',
  sla: {
    responseTime: '4 Stunden (Störung), 24 Stunden (Service-Anfrage)',
    actualResponseTime: 'Meist eingehalten, aber "Reaktion" heißt oft nur "Ticket erstellt"',
  },
  contacts: [thomasContact, sabineContact],
  companyQuirks,
  relationshipSystem,
  metaLesson: `Provider-Management ist anders als MSP-Management. Provider sind größer, bürokratischer, aber auch stabiler. Die Schlüssel: 1) SLA-Dokumentation — jeden Ausfall mit Timestamps dokumentieren für Jahresgespräche. 2) Eskalationswege kennen — nach 2nd-Level kommt nicht viel. 3) Redundanz planen — Einzelpunkte des Versagens (SPOF) identifizieren und absichern. 4) Die Leitung selbst überwachen — nicht nur den Router-Status, sondern echte End-to-End-Tests.`,
};

export const gameplayMechanics: GameplayMechanics = {
  vendorScoreTracking: {
    description: 'Telekom-Score basiert auf Störungshäufigkeit, SLA-Einhaltung und Kommunikationsqualität.',
    metrics: [
      'Anzahl Störungen pro Quartal',
      'Durchschnittliche Entstörzeit vs. SLA',
      'Anzahl Wartungen ohne Vorankündigung',
      'Erreichbarkeit der Hotline bei Störungen',
    ],
  },
  trustButVerifyMechanic: {
    description: 'Provider-Aussagen zu "Leitungsproblemen" sind oft korrekt, aber unvollständig. Eigenes Monitoring ist wichtig.',
    baseErrorRate: 0.2,
    errorRateDecreasesWith: 'Eigenes Monitoring, SLA-Reviews, Vertragskenntnis',
    errorRateIncreasesWith: 'Blindes Vertrauen, keine eigenen Messungen',
  },
};
