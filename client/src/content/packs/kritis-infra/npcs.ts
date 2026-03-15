/**
 * KRITIS Infrastructure Pack - NPCs
 * Critical infrastructure operators and vendors
 */

import { VendorNpc, NpcContact, GameplayMechanics } from '@kritis/shared';

export const scadaOperatorContact: NpcContact = {
  id: 'KRITIS-OPERATOR',
  name: 'Thomas Bergmann',
  role: 'Leitstand-Operator',
  age: 52,
  personality: `Erfahrener OT-Spezialist mit 25 Jahren Erfahrung in der Prozessleittechnik. Skeptisch gegenüber IT-Security-Maßnahmen, die "seinen" Betrieb stören könnten. Kennt jede SPS im Haus. Sein Motto: "Wenn die Anlage läuft, fass nichts an." Wird aber nachdenklich wenn man ihm erklärt, was moderne Cyberangriffe anrichten können.`,
  appearancePrompt: `Character portrait, cartoon game style. A German industrial operator in his early 50s. Weathered face, salt-and-pepper hair, wearing a blue work shirt with company logo. Safety glasses pushed up on forehead. Behind him, SCADA screens with process diagrams. Has calloused hands and looks like he could fix anything mechanical. Bold outlines, flat cartoon style, chest-up portrait.`,
  catchphrases: [
    'Die Anlage läuft seit 15 Jahren so, warum jetzt ändern?',
    'Wenn das Update die Pumpen abstellt, haben wir ein Problem.',
    'Ich hab das noch mit echten Reglern gelernt.',
    'Die IT versteht nicht wie OT tickt.',
    'Uptime ist hier alles. Alles andere ist zweitrangig.',
    'Das haben wir schon immer so gemacht.',
    'Siemens sagt, das Update ist wichtig. Aber wann?',
    'Ich vertrau meinen Instrumenten mehr als euren Computern.',
  ],
  dialogueBarks: [
    '*schaut auf SCADA-Bildschirm* Moment, da stimmt was nicht...',
    'Die Druckwerte sind heute ungewöhnlich.',
    '*Kaffee in der Hand* Also, was wollen die von der IT jetzt wieder?',
    'Früher hat man das mit nem Schraubenzieher gelöst.',
    '*seufzt* Schon wieder ein Firmware-Update...',
    'Die letzte Wartung war erst vor... *schaut nach* ...3 Jahren.',
  ],
};

export const siemensVendorContact: NpcContact = {
  id: 'KRITIS-VENDOR',
  name: 'Dr. Sabine Koch',
  role: 'Siemens Projektleiterin',
  age: 45,
  personality: `Kompetente Herstellervertreterin mit technischem Hintergrund. Versteht sowohl IT als auch OT. Will helfen und gute Kundenbeziehungen pflegen, muss aber auch Siemens-Interessen vertreten. Kennt die Tücken ihrer eigenen Produkte, kommuniziert sie aber diplomatisch.`,
  appearancePrompt: `Character portrait, cartoon game style. A German female engineer in her mid-40s. Professional attire with Siemens logo badge. Neat appearance, confident posture. Carrying a laptop bag with Siemens branding. Behind her, industrial automation equipment. Looks competent and approachable. Bold outlines, flat cartoon style, chest-up portrait.`,
  catchphrases: [
    'Das neue Firmware-Release adressiert genau dieses Problem.',
    'Ich kann Ihnen einen unserer Spezialisten für ein Beratungsgespräch anbieten.',
    'Die Dokumentation finden Sie im Siemens Support Portal.',
    'Das ist ein bekanntes Verhalten in dieser Firmware-Version.',
    'Wir empfehlen ein Upgrade auf die aktuelle TIA-Version.',
    'Für KRITIS-Kunden haben wir spezielle Wartungsverträge.',
  ],
  dialogueBarks: [
    '*tippt auf Laptop* Ich schaue gerade in unserem System nach...',
    'Das müsste ich mit unserem Entwicklungsteam klären.',
    'Haben Sie das Ticket schon eröffnet?',
    '*professionell lächelnd* Wir nehmen Ihre Rückmeldung sehr ernst.',
    'Die nächste Schulung wäre im Juni in Nürnberg.',
  ],
};

export const securityAnalystContact: NpcContact = {
  id: 'KRITIS-SECOPS',
  name: 'Kevin Yilmaz',
  role: 'OT Security Analyst',
  age: 29,
  personality: `Junger, enthusiastischer Security-Experte der aus der IT-Security kommt und jetzt OT-Security macht. Sehr gut ausgebildet, manchmal zu theoretisch. Will alles nach "Best Practice" machen, versteht aber die Realitäten im OT-Betrieb noch nicht ganz. Lernfähig und engagiert.`,
  appearancePrompt: `Character portrait, cartoon game style. A young German security analyst in his late 20s. Dark hair, wearing a hoodie over a button-down shirt. Multiple monitors in background showing security dashboards. Energy drink on desk. Has a confident but slightly nerdy appearance. Stickers from security conferences on his laptop. Bold outlines, flat cartoon style, chest-up portrait.`,
  catchphrases: [
    'Das entspricht nicht den BSI-Empfehlungen.',
    'Wir sollten hier Zero Trust implementieren.',
    'Ich hab da einen interessanten CVE gefunden...',
    'Die Logs zeigen eindeutig...',
    'Im ISO 27001 steht...',
    'Das ist ein klassisches Lateral Movement Pattern.',
    'Wir brauchen Segmentierung zwischen IT und OT.',
    'Habt ihr schon ein IDS im OT-Netz?',
  ],
  dialogueBarks: [
    '*zeigt auf Dashboard* Das Muster hier ist verdächtig.',
    'Moment, ich muss das kurz dokumentieren...',
    '*tippt hastig* Ich schreib das mal ins SIEM...',
    'Wer hat denn die Firewall-Regel freigegeben?!',
    'Oh, interessant... das kenne ich von einer Konferenz.',
  ],
};

// Vendor definition for KRITIS infrastructure
export const kritisInfraVendor: VendorNpc = {
  id: 'KRITIS-INFRA',
  companyName: 'KRITIS Infrastruktur Betrieb',
  companyType: 'Kritische Infrastruktur / Versorgungswirtschaft',
  contract: 'Betriebsführung KRITIS-Anlagen (24/7 Leitstelle, OT-Infrastruktur)',
  sla: {
    responseTime: '15 Minuten bei kritischen Störungen',
    actualResponseTime: 'Variiert stark je nach Schicht und Tageszeit',
  },
  contacts: [scadaOperatorContact, siemensVendorContact, securityAnalystContact],
  companyQuirks: [
    'OT-Systeme laufen oft auf veralteter Hardware - "Never change a running system"',
    'Wartungsfenster sind extrem kurz und selten',
    'Jede Änderung muss durch mehrere Instanzen freigegeben werden',
    'Legacy-Protokolle wie Modbus haben keine eingebaute Security',
    '24/7 Betrieb bedeutet: Es gibt kein "gutes" Zeitfenster für Updates',
  ],
  relationshipSystem: {
    description: 'OT-Personal ist von Natur aus konservativ und skeptisch gegenüber Änderungen. Vertrauen wird durch bewährte Zusammenarbeit aufgebaut.',
    businessLevels: [
      { level: 1, name: 'Skepsis', threshold: -50 },
      { level: 2, name: 'Neutral', threshold: 0 },
      { level: 3, name: 'Kooperativ', threshold: 30 },
      { level: 4, name: 'Partnerschaft', threshold: 60 },
    ],
    technicalTrustLevels: [
      { level: 1, name: 'IT-Fremder', threshold: -30 },
      { level: 2, name: 'OT-Versteher', threshold: 20 },
      { level: 3, name: 'Einer von uns', threshold: 50 },
    ],
  },
  metaLesson: 'OT-Security ist fundamental anders als IT-Security: Verfügbarkeit vor Vertraulichkeit, Legacy-Systeme überall, und die Konsequenzen von Ausfällen können physisch gefährlich sein.',
};

export const gameplayMechanics: GameplayMechanics = {
  vendorScoreTracking: {
    description: 'Bewertung der OT-IT-Zusammenarbeit basierend auf erfolgreichen Projekten',
    metrics: [
      'Erfolgreiche Patch-Deployments ohne Betriebsunterbrechung',
      'Reaktionszeit bei Sicherheitsvorfällen',
      'Dokumentationsqualität',
    ],
  },
  trustButVerifyMechanic: {
    description: 'OT-Personal vertraut IT-Empfehlungen nur nach Beweis in Testumgebung',
    baseErrorRate: 0.3,
    errorRateDecreasesWith: 'Erfolgreiche Tests in Staging-Umgebung',
    errorRateIncreasesWith: 'Updates die Produktionsprobleme verursachen',
  },
};
