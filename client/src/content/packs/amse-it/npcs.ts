// AMSE IT Solutions GmbH - NPC Definitions
import { VendorNpc, NpcContact, RelationshipSystem, GameplayMechanics } from '@kritis/shared';

export const marcoContact: NpcContact = {
  id: 'AMSE-MARCO',
  name: 'Marco Bühler',
  role: 'Techniker / Hauptansprechpartner',
  age: 35,
  personality: `Grundsätzlich kompetent, aber überschätzt sich. Hasst es, Fehler zuzugeben. Sein Standardsatz: 'Auf unserer Seite ist alles korrekt konfiguriert.' Wird defensiv wenn man nachhakt. Arbeitet an zu vielen Kunden gleichzeitig, dadurch Flüchtigkeitsfehler. Copy-pastet gerne Konfigurationen von anderen Kunden ohne sie anzupassen. Ist eigentlich ein netter Kerl wenn man ihn nicht in die Enge treibt.`,
  appearancePrompt: `Character portrait, cartoon game style. A German IT technician in his mid-30s. Slightly overweight, wearing a too-tight company polo shirt with 'AMSE IT' logo. Bluetooth headset permanently in one ear, talking to another customer while working on your firewall. Multiple phones on his belt. Looks slightly stressed but projects confidence. His laptop screen shows 4 different customer VPN dashboards open simultaneously. Coffee-stained keyboard. Bold outlines, flat cartoon style, chest-up portrait.`,
  catchphrases: [
    'Auf unserer Seite ist alles korrekt konfiguriert.',
    'Das muss an eurem internen Netzwerk liegen.',
    'Hab ich geprüft, Firewall-Regeln sind sauber.',
    'Ich hab gerade noch einen Notfall bei einem anderen Kunden, ich melde mich in einer Stunde.',
    'Das war vorher auch schon so, das ist mir aufgefallen.',
    'Ich muss das kurz mit meinem Kollegen abstimmen... *meldet sich 3 Tage nicht*',
    'Das liegt am Provider, nicht an der Firewall.',
    'Können Sie mir nochmal einen Screenshot schicken? Ich hab die Mail nicht bekommen.',
    'Wir hatten da ein internes Missverständnis, aber jetzt sollte es laufen.',
    'Das ist ein bekanntes Sophos-Bug, da können wir nichts machen.',
    'Ich hab das jetzt angepasst, probieren Sie nochmal. *hat nichts geändert*',
  ],
  dialogueBarks: [
    'Geht bei mir... *schaut auf falschen Kunden-Dashboard*',
    'Ich hab da mal was angepasst, sollte jetzt gehen.',
    'Können Sie mir nochmal die Fehlermeldung schicken? Genau?',
    'Das ist ein Known Issue bei Sophos, da warten wir auf den nächsten Patch.',
    'Ich war gerade bei einem anderen Kunden, deswegen die Verspätung.',
    'Die Logs zeigen nichts Auffälliges. *hat die falschen Logs angeschaut*',
    'Ich hab das jetzt so konfiguriert wie beim Kunden XY, die haben ein ähnliches Setup.',
    'Brauche kurz eure VPN-Einwahldaten nochmal... hab mein Notizbuch verlegt.',
    'Das hat letzte Woche noch funktioniert, da hab ich nichts dran geändert. *hat was geändert*',
    'Ich muss kurz Rücksprache halten, melde mich gleich. *meldet sich in 3 Tagen*',
    'Erledigt. *Ticket geschlossen ohne Beschreibung*',
    'Hm, das ist komisch. Bei unseren anderen Kunden läuft das problemlos.',
  ],
};

export const stefanContact: NpcContact = {
  id: 'AMSE-STEFAN',
  name: 'Stefan Wengler',
  role: 'Geschäftsführer AMSE IT',
  age: 52,
  personality: `Vertriebstyp, redet viel, verspricht alles, versteht wenig Technik. Taucht auf wenn es um Vertragsverlängerung geht. Wird sehr freundlich wenn man mit Anbieterwechsel droht. Nennt jeden 'Partner' statt 'Kunde'.`,
  appearancePrompt: `Character portrait, cartoon game style. A German business owner in his early 50s. Slightly too tan, perfect hair, white teeth. Wearing an expensive suit that doesn't quite fit. Firm handshake energy. Carrying glossy AMSE IT marketing brochures that show stock photos of server rooms. His business card says 'Ihr Partner für digitale Transformation'. Bold outlines, flat cartoon style, chest-up portrait.`,
  catchphrases: [
    'Wir sehen uns als Partner, nicht als Dienstleister!',
    'Das nehme ich persönlich in die Hand!',
    'Der Marco ist unser bester Mann, ich spreche direkt mit ihm!',
    'Wir haben da ein neues Produkt im Portfolio, das wäre perfekt für Sie...',
    'Haben Sie schon über ein Upgrade auf die Sophos XGS nachgedacht?',
  ],
  dialogueBarks: [
    'Wir investieren gerade massiv in unser Team — bald wird alles besser!',
    'Haben Sie unser neues Managed-SOC-Angebot gesehen? Perfekt für KRITIS!',
    'Ich verstehe Ihre Frustration und nehme das persönlich in die Hand.',
    'Darf ich Sie zum Partner-Event einladen? Gibt Vorträge und... Buffet.',
    'Wir haben gerade 3 neue Techniker eingestellt, die Kapazitäten werden besser!',
    'Marco ist unser Senior-Experte, bei ihm sind Sie in den besten Händen!',
  ],
};

export const relationshipSystem: RelationshipSystem = {
  description: 'Die Beziehung zu AMSE hat zwei Achsen: Geschäftlich (Vertragsqualität) und Technisch (tatsächliche Kompetenz). Beide entwickeln sich unabhängig.',
  businessLevels: [
    { level: 1, name: 'Die schicken nur Rechnungen', threshold: 0 },
    { level: 2, name: 'Vertragspartner auf Papier', threshold: 50 },
    { level: 3, name: 'Funktionierender Dienstleister', threshold: 150 },
    { level: 4, name: 'Verlässlicher Partner', threshold: 300 },
    { level: 5, name: 'Echte Partnerschaft', threshold: 500 },
  ],
  technicalTrustLevels: [
    { level: 1, name: 'Ich prüfe ALLES nach', threshold: 0 },
    { level: 2, name: 'Vertrauen mit Stichproben', threshold: 100 },
    { level: 3, name: 'Solide Zusammenarbeit', threshold: 250 },
    { level: 4, name: 'Echter Sparringspartner', threshold: 400 },
  ],
  specialEvents: {
    'technical_trust_level_1': 'Du musst jede AMSE-Änderung selbst verifizieren. +30 Min pro Ticket.',
    'technical_trust_level_3': 'Marco dokumentiert Änderungen unaufgefordert und schlägt Verbesserungen vor.',
    'business_level_4': 'AMSE bietet proaktives Security-Monitoring an und meldet Auffälligkeiten bevor du fragst.',
    'business_level_1_event': 'Du kannst den Vertrag kündigen und einen neuen Dienstleister evaluieren. Dauert 6 Monate und kostet Nerven, aber langfristig vielleicht besser.',
  },
};

export const companyQuirks: string[] = [
  'Rechnungen kommen immer pünktlich, Lösungen nicht',
  'Dokumentation ihrer Änderungen: nicht existent',
  'Haben Root-Zugang zur Firewall, loggen sich aber nie aus — Sessions laufen wochenlang',
  'Nutzen TeamViewer statt sicherer Remote-Access-Lösung',
  'Haben Passwörter in einer Excel-Datei auf einem Netzlaufwerk',
  'Machen Änderungen an der Firewall ohne Ankündigung, Freitag 16:30 Uhr',
  'Antworten auf Tickets mit \'Erledigt\' ohne zu beschreiben WAS sie gemacht haben',
  'Kopieren Firewall-Regeln von Kunden-Templates ohne sie anzupassen — da stehen noch IPs vom letzten Kunden drin',
  'Ihre Monitoring-Lösung hat selbst keinen Alarm geschlagen weil sie abgelaufen ist',
  'Versprechen 24/7-Notfall-Support, aber die Notfall-Hotline geht auf Marcos private Handynummer und der ist im Skiurlaub',
];

export const amseVendor: VendorNpc = {
  id: 'NPC-AMSE',
  companyName: 'AMSE IT Solutions GmbH',
  companyType: 'Externer IT-Dienstleister / Managed Service Provider',
  contract: 'Rahmenvertrag seit 5 Jahren, zuständig für Sophos Firewall, Netzwerk-Infrastruktur (Switches, APs), teilweise Server-Wartung',
  sla: {
    responseTime: '4 Stunden (kritisch), 8 Stunden (hoch), 2 Werktage (normal)',
    actualResponseTime: 'Meistens eingehalten, manchmal kreativ interpretiert (\'Wir haben innerhalb von 4 Stunden GEANTWORTET, nicht GELÖST\')',
  },
  contacts: [marcoContact, stefanContact],
  companyQuirks,
  relationshipSystem,
  metaLesson: `Die Beziehung zum externen Dienstleister ist eine der wichtigsten und schwierigsten Aufgaben eines internen IT-Admins. Die Schlüsselprinzipien: 1) Trust but Verify — nie blind vertrauen, immer prüfen. 2) Eigene Kompetenz aufbauen — du musst genug verstehen um Fehler zu erkennen. 3) Dokumentation einfordern — was nicht dokumentiert ist, existiert nicht. 4) Vertragskenntnis — wissen was vereinbart ist und einfordern. 5) Eigene Notfall-Fähigkeiten — bei Ausfall des Dienstleisters musst du die Basics selbst können.`,
};

export const gameplayMechanics: GameplayMechanics = {
  vendorScoreTracking: {
    description: 'Das Spiel trackt alle AMSE-Interaktionen und berechnet einen Vendor-Score. Bei niedrigem Score wird ein Event ausgelöst: \'Dienstleisterwechsel evaluieren?\'',
    metrics: [
      'Anzahl Fälle wo AMSE behauptete es liegt nicht an ihnen (aber es lag an ihnen)',
      'Durchschnittliche tatsächliche vs. versprochene Reaktionszeit',
      'Anzahl nicht-dokumentierter Änderungen',
      'Anzahl Fälle wo Spieler den Fehler selbst finden musste',
      'Anzahl verpasster Lizenz-Verlängerungen',
    ],
  },
  trustButVerifyMechanic: {
    description: 'Jede AMSE-Aussage hat eine Wahrscheinlichkeit falsch zu sein (30-50%). Der Spieler muss entscheiden ob er selbst prüft (kostet Zeit) oder vertraut (Risiko). Je mehr er prüft und Fehler findet, desto niedriger wird AMSEs Trust-Score.',
    baseErrorRate: 0.35,
    errorRateDecreasesWith: 'confrontation, documentation requests, audit threats',
    errorRateIncreasesWith: 'blind trust, accepting without verification, not reading logs',
  },
};
