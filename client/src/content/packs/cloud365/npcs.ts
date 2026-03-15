// Cloud365 GmbH - Microsoft Partner / Cloud Reseller - NPC Definitions
import { VendorNpc, NpcContact, RelationshipSystem, GameplayMechanics } from '@kritis/shared';

export const kevinContact: NpcContact = {
  id: 'CLOUD365-KEVIN',
  name: 'Kevin Schuster',
  role: 'Cloud Solutions Architect',
  age: 29,
  personality: `Der junge Wilde der Cloud-Welt. Redet in Buzzwords: "Serverless", "Zero Trust", "Cloud-native". Hat 5 Microsoft-Zertifizierungen aber noch nie einen Windows Server 2008 migriert. Ist überzeugt dass alles in die Cloud gehört — auch eure Scada-Steuerung. Trägt Hoodie zur Kundenpräsentation. Meint es gut, aber verwechselt manchmal "möglich" mit "sinnvoll".`,
  appearancePrompt: `Character portrait, cartoon game style. A young German IT consultant in his late 20s. Trendy haircut, designer glasses, wearing a hoodie with subtle Microsoft Azure logo. Macbook under arm despite being Microsoft consultant. AirPods always in. Confident smile bordering on smug. Presentation clicker in hand. Background hint of PowerPoint with "Digital Transformation" slide. Bold outlines, flat cartoon style, chest-up portrait.`,
  catchphrases: [
    'Das können wir easy in die Cloud migrieren!',
    'On-Prem? Das macht doch heute keiner mehr.',
    'Mit Azure AD wird das alles viel einfacher.',
    'Haben Sie schon über Copilot nachgedacht?',
    'Die Lizenzierung ist ganz einfach — E5 und fertig.',
    'Das können wir mit Power Automate lösen!',
    'Microsoft hat da gerade eine neue Preview gelauncht...',
    'Zero Trust Architecture ist der Weg — weg mit der VPN!',
    'Das ist ein Known Issue, wird im nächsten Update gefixt.',
    'Ich hab da ein PowerShell-Skript von GitHub...',
  ],
  dialogueBarks: [
    'Azure ist zu 99.99% verfügbar — steht im SLA!',
    'On-Prem-Exchange? Das ist ja quasi ein Sicherheitsrisiko.',
    'Conditional Access regelt das schon automatisch.',
    'Defender for Endpoint ersetzt Ihren Virenscanner komplett.',
    'SharePoint ist eigentlich ganz intuitiv... *Schulung dauert 3 Tage*',
    'Teams kann auch Telefonie! Fast wie eine echte TK-Anlage.',
    'Graph API macht das super easy.',
    'Das steht alles im Microsoft Learn — da müssen Sie nur durchklicken.',
    'Lizenzänderungen? Die sind erst ab nächstem Monat aktiv.',
    'Ich check mal kurz die Tenant-Einstellungen...',
  ],
};

export const martinContact: NpcContact = {
  id: 'CLOUD365-MARTIN',
  name: 'Martin Vollmer',
  role: 'Geschäftsführer Cloud365 GmbH',
  age: 47,
  personality: `Ex-IBM-Vertriebler der die Cloud-Welle geritten hat. Gründete Cloud365 als "Microsoft Gold Partner" (jetzt "Solutions Partner"). Versteht selbst nichts von Technik, aber weiß genau was die Lizenzen kosten — und was die Marge ist. Erscheint zu jedem Meeting mit ROI-Berechnungen die immer zu seinen Gunsten ausfallen.`,
  appearancePrompt: `Character portrait, cartoon game style. A German business owner in his late 40s. Conservative suit with subtle Microsoft partner pin. Slicked-back hair, reading glasses. Carrying a tablet showing licensing calculator. Firm handshake, practiced smile. Background hint of framed Microsoft Partner certificates on wall. Bold outlines, flat cartoon style, chest-up portrait.`,
  catchphrases: [
    'Mit E5 sind Sie auf der sicheren Seite — alles drin!',
    'Die Cloud spart Ihnen langfristig Kosten.',
    'Wir sind Microsoft Solutions Partner — direkter Draht zu Redmond!',
    'Die Lizenzänderungen betreffen Sie nicht... wahrscheinlich.',
    'Für KRITIS-Betreiber haben wir ein Spezialpaket.',
  ],
  dialogueBarks: [
    'Die TCO-Berechnung zeigt eindeutig: Cloud ist günstiger!',
    'Kevin ist unser Top-Architekt — der macht das schon.',
    'Microsoft erhöht die Preise — besser jetzt buchen.',
    'Bei Problemen haben wir direkten Microsoft-Support!',
    'Der Compliance Manager macht NIS2 zum Kinderspiel.',
  ],
};

export const relationshipSystem: RelationshipSystem = {
  description: 'Cloud365 ist ein typischer Microsoft-Partner: Verkauf ist Priorität #1, Support ist Priorität #47. Die Beziehung bestimmt ob Lizenzfragen schnell oder nie beantwortet werden.',
  businessLevels: [
    { level: 1, name: 'Kleinkunde', threshold: 0 },
    { level: 2, name: 'Regulärer Kunde', threshold: 75 },
    { level: 3, name: 'Wichtiger Kunde', threshold: 200 },
    { level: 4, name: 'Premium Partner', threshold: 400 },
  ],
  technicalTrustLevels: [
    { level: 1, name: 'Kevin probiert Sachen aus', threshold: 0 },
    { level: 2, name: 'Standardlösungen funktionieren', threshold: 100 },
    { level: 3, name: 'Durchdachte Architektur', threshold: 250 },
  ],
  specialEvents: {
    'business_level_3': 'Du bekommst Vorab-Infos zu Lizenzänderungen.',
    'technical_trust_level_2': 'Kevin fragt vor Änderungen nach statt einfach zu machen.',
  },
};

export const companyQuirks: string[] = [
  'Lizenzänderungen werden "bald" kommuniziert — meistens zu spät',
  'Support-Tickets gehen an Microsoft — Antwort dauert Wochen',
  '"Microsoft hat das geändert" ist die Antwort auf jedes Problem',
  'Die Rechnung verstehen nur Lizenz-Experten',
  'Jedes Meeting beginnt mit 15 Minuten Cloud-Vorteile-Präsentation',
  'Kevin testet gerne neue Features an Produktiv-Tenants',
  'Dokumentation existiert — in Form von YouTube-Links',
  'Preiserhöhungen werden 2 Wochen vorher mitgeteilt',
  'Downgrade von Lizenzen dauert "aus technischen Gründen" 3 Monate',
];

export const cloud365Vendor: VendorNpc = {
  id: 'NPC-CLOUD365',
  companyName: 'Cloud365 GmbH',
  companyType: 'Microsoft Solutions Partner / Cloud Reseller',
  contract: 'Microsoft 365 E3 für 150 User, Azure-Basisinfrastruktur (VMs, Storage), Teams-Telefonie-Pilotprojekt',
  sla: {
    responseTime: '8 Stunden (Support-Anfrage)',
    actualResponseTime: 'Hängt davon ab ob Kevin im Urlaub ist',
  },
  contacts: [kevinContact, martinContact],
  companyQuirks,
  relationshipSystem,
  metaLesson: `Cloud-Partner sind eine Mischung aus Verkäufer und Techniker. Die Schlüssel: 1) Lizenzen verstehen — nie blind auf den Partner verlassen. 2) Microsoft-Dokus selbst lesen — der Partner weiß auch nicht alles. 3) Änderungen testen bevor sie live gehen — Tenant hat Test-Umgebung. 4) Eigene Backup-Strategie — Microsoft-SLA garantiert Verfügbarkeit, nicht Wiederherstellung deiner Daten. 5) Die Microsoft-Roadmap kennen — Features kommen und gehen, manchmal ohne Warnung.`,
};

export const gameplayMechanics: GameplayMechanics = {
  vendorScoreTracking: {
    description: 'Cloud365-Score basiert auf Lizenzklarheit, Migrationsqualität und Support-Response.',
    metrics: [
      'Anzahl Lizenz-Überraschungen',
      'Ungeplante Kosten durch Microsoft-Änderungen',
      'Support-Ticket-Laufzeit',
      'Erfolgreiche vs. problematische Migrationen',
    ],
  },
  trustButVerifyMechanic: {
    description: 'Cloud-Partner-Aussagen zu "funktioniert einwandfrei" müssen immer getestet werden.',
    baseErrorRate: 0.4,
    errorRateDecreasesWith: 'Eigene Tests, Microsoft-Doku lesen, Pilot-Projekte',
    errorRateIncreasesWith: 'Blind vertrauen, "Kevin macht das schon"',
  },
};
