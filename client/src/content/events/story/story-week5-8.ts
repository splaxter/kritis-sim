import { GameEvent } from '@kritis/shared';

/**
 * Act 1 Story Events: Weeks 5-8 (The Pressure Builds)
 * E15-E18: Budget battles, infrastructure challenges, critical decisions
 * Note: E14 (Phishing) is in security-chain.ts
 */

export const storyWeek5to8Events: GameEvent[] = [
  // E15: Das Budget-Gespräch
  {
    id: 'evt_budget_gespraech',
    weekRange: [5, 8],
    probability: 0.95,
    category: 'budget',
    title: 'Das Budget-Gespraech',
    description: `{kaemmerer} laedt dich und {chef} ein: "Wir muessen ueber das IT-Budget reden."

Drei Positionen stehen zur Diskussion:
- Sophos-Lizenzen: 15.000 Euro (Sicherheit, laeuft aus)
- Neue Switches: 8.000 Euro (Infrastruktur, die alten sind EOL)
- Backup-System: 12.000 Euro (Compliance, fehlt komplett)

{kaemmerer} verschraenkt die Arme: "Wir koennen nur zwei von drei machen dieses Jahr."`,
    involvedCharacters: ['chef', 'kaemmerer', 'gf'],
    mentorNote: 'Im OeD: Nie alle drei fordern wenn nur zwei moeglich sind - du verlierst die Vertrauensbasis beim Kaemmerer. Strategie: Zwei priorisieren, fuer das dritte einen separaten Antrag mit BSI-Pflicht-Begruendung stellen. KRITIS-Keule nur einmal pro Jahr schwingen.',
    choices: [
      {
        id: 'sophos_backup',
        text: 'Sophos + Backup - Sicherheit geht vor',
        effects: { compliance: 10, relationships: { kaemmerer: 5 } },
        resultText: '{kaemmerer} nickt. "Verstaendlich. Die Switches muessen dann noch ein Jahr halten." {chef} ist erleichtert - das war die sichere Wahl.',
        choiceTags: ['security_first'],
        chainTriggers: [{
          targetEventId: 'evt_switch_failure',
          delayWeeks: 4,
          probability: 0.5,
          description: 'Old switches may fail without replacement',
        }],
      },
      {
        id: 'sophos_switches',
        text: 'Sophos + Switches - Infrastruktur muss stabil sein',
        effects: { compliance: 5, relationships: { kaemmerer: 5 } },
        resultText: 'Die Switches werden bestellt. Aber ohne Backup-System lebst du gefaehrlich. Ein Ransomware-Angriff waere katastrophal.',
        choiceTags: ['infrastructure_first'],
        chainTriggers: [{
          targetEventId: 'evt_backup_crisis',
          delayWeeks: 5,
          probability: 0.4,
          description: 'No backup leads to crisis when needed',
        }],
      },
      {
        id: 'all_three_kritis',
        text: 'Alle drei mit KRITIS-Pflicht argumentieren',
        effects: { compliance: 15, relationships: { kaemmerer: -15, gf: 5 }, stress: 5 },
        resultText: '{kaemmerer} wird rot: "Immer diese KRITIS-Keule!" Aber du hast recht - und die {gf} weiss das. "Wir finden das Budget", sagt sie. Der Kaemmerer ist nicht gluecklich.',
        choiceTags: ['aggressive', 'correct'],
        teachingMoment: 'Die KRITIS-Keule funktioniert - aber sie hat politische Kosten. Spar sie fuer echte Notfaelle.',
      },
    ],
    tags: ['story', 'budget', 'politics', 'week5'],
  },

  // E16: Der Neue will helfen
  {
    id: 'evt_neue_will_helfen',
    weekRange: [5, 7],
    probability: 0.75,
    category: 'team',
    title: 'Der Neue will helfen',
    description: `Herr Bauer aus der Abfallwirtschaft kommt vorbei. Er ist technikaffin und bietet an, bei IT-Themen zu unterstuetzen.

"Ich hab frueher mal Linux administriert und kenne mich mit Netzwerken aus. Wenn ihr Entlastung braucht..."

{chef} ist nicht da. Du musst entscheiden.

Auf der einen Seite: Mehr Haende sind gut.
Auf der anderen: Shadow IT ist real.`,
    involvedCharacters: ['chef'],
    mentorNote: 'IT-affine Fachbereichs-Mitarbeiter sind Gold wert - aber nur mit klaren Grenzen. Definiere genau was sie duerfen (First-Level-Support, Druckertoner) und was nicht (AD-Aenderungen, Softwareinstallation). Schriftlich.',
    choices: [
      {
        id: 'integrate_properly',
        text: 'Einbinden als IT-Ansprechpartner mit klaren Regeln',
        effects: { relationships: { fachabteilung: 10 }, stress: 5 },
        resultText: 'Du definierst die Grenzen: Drucker, Bildschirme, Erst-Diagnose. Alles andere: Ticket. Herr Bauer ist zufrieden - er fuehlt sich wertgeschaetzt.',
        choiceTags: ['structured', 'delegation'],
        setsFlags: ['it_liaison_established'],
        teachingMoment: 'Klare Grenzen machen die Zusammenarbeit einfacher, nicht schwerer.',
      },
      {
        id: 'decline_friendly',
        text: 'Freundlich ablehnen - IT bleibt bei IT',
        effects: { relationships: { fachabteilung: -5 }, compliance: 5 },
        resultText: '"Danke, aber aus Compliance-Gruenden muss das IT-Team bleiben." Er versteht, ist aber ein bisschen enttaeuscht.',
        choiceTags: ['by_the_book'],
      },
      {
        id: 'full_access',
        text: 'Ihm mehr Rechte geben - er klingt kompetent',
        effects: { relationships: { fachabteilung: 10 }, compliance: -10 },
        resultText: 'Du gibst ihm lokale Admin-Rechte auf einigen PCs. Er ist happy. Bis er zwei Wochen spaeter eine private NAS ans Netzwerk haengt...',
        choiceTags: ['risky', 'trusting'],
        chainTriggers: [{
          targetEventId: 'evt_shadow_it',
          delayWeeks: 3,
          description: 'Uncontrolled access leads to shadow IT',
        }],
      },
    ],
    tags: ['story', 'team', 'delegation', 'week5'],
  },

  // E17: Serverraum-Klimaanlage
  {
    id: 'evt_serverraum_klima',
    weekRange: [6, 8],
    probability: 0.85,
    category: 'crisis',
    title: 'Serverraum-Klimaanlage',
    description: `Freitagmittag. Die Klimaanlage im Serverraum faellt aus.

Aktuelle Temperatur: 28 Grad. Tendenz: steigend.
Draussen: 32 Grad. Hochsommer.
Haustechnik: "Wir sind unterbesetzt, fruehestens Montag."

Du hast vielleicht zwei Stunden bevor es kritisch wird. Die Server laufen noch, aber nicht mehr lange.`,
    involvedCharacters: ['chef'],
    mentorNote: 'Notfallplan fuer Serverraum-Kuehlung gehoert in jedes KRITIS-Betriebshandbuch. Mobile Klimaanlage auf Lager haben (oder wissen wo eine steht), Schwellwert-Monitoring per SNMP, und: Fenster auf ist KEINE Option - physische Sicherheit!',
    choices: [
      {
        id: 'mobile_klima',
        text: 'Mobile Klimaanlage organisieren + Notlueftung',
        effects: { stress: 10, budget: -200 },
        resultText: 'Du rufst den Baumarkt an: Letzte mobile Klimaanlage, 199 Euro, selbst abholen. Eine Stunde spaeter laeuft sie. Nicht schoen, aber funktioniert.',
        choiceTags: ['creative', 'pragmatic'],
        setsFlags: ['klimakrise_geloest'],
        teachingMoment: 'Notfallmassnahmen muessen schnell sein, nicht perfekt. Improvisation ist erlaubt.',
      },
      {
        id: 'shutdown_servers',
        text: 'Server kontrolliert herunterfahren bis Reparatur',
        effects: { compliance: 10, relationships: { fachabteilung: -15, gf: -10 }, stress: 10 },
        resultText: 'Du faehrst die Server sauber herunter. Kein Dienst mehr erreichbar. Die Fachabteilungen sind wuetend. Aber die Hardware ist sicher.',
        choiceTags: ['safe', 'disruptive'],
      },
      {
        id: 'haustechnik_druck',
        text: 'Haustechnik unter Druck setzen - KRITIS!',
        effects: { stress: 15 },
        resultText: 'Du rufst zehnmal an, drohst mit Eskalation zur GF. Um 16 Uhr kommt ein genervter Techniker. Er flickt die Anlage provisorisch.',
        choiceTags: ['aggressive'],
        chainTriggers: [{
          targetEventId: 'evt_server_overheat',
          delayWeeks: 0,
          probability: 0.5,
          description: 'Risk of overheating while waiting',
        }],
      },
    ],
    tags: ['story', 'crisis', 'infrastructure', 'week6'],
  },

  // E18: OPNsense vs. Sophos
  {
    id: 'evt_opnsense_vs_sophos',
    weekRange: [5, 8],
    probability: 0.7,
    category: 'budget',
    title: 'OPNsense vs. Sophos',
    description: `Die Sophos XG Firewall Lizenz laeuft bald aus. Verlaengerung: 8.000 Euro pro Jahr.

Du kennst OPNsense aus deinem Homelab. Open Source, kostenlos, leistungsfaehig. Es wuerde funktionieren.

Ersparnis: 8.000 Euro pro Jahr.
Risiko: Du bist der Einzige, der es kann.

{chef} schaut dich an: "Was schlägst du vor?"`,
    involvedCharacters: ['chef'],
    mentorNote: 'Open Source im KRITIS-Umfeld ist moeglich, aber: Du brauchst Wartungskonzept, Patch-Prozess, und Zweitexperten. Wenn nur DU OPNsense kannst und krank wirst, steht alles. OeD-Vergaberecht bei Umstellungen beachten!',
    choices: [
      {
        id: 'opnsense_migration',
        text: 'Migration auf OPNsense vorschlagen',
        effects: { relationships: { chef: 10 }, budget: 8000, stress: 10 },
        resultText: '{chef} ist begeistert: "Eigeninitiative! Mach einen Plan." Du bist jetzt verantwortlich fuer die Firewall. Alleine.',
        choiceTags: ['innovative', 'risky'],
        chainTriggers: [{
          targetEventId: 'evt_opnsense_responsibility',
          delayWeeks: 6,
          description: 'Sole responsibility for critical system',
        }],
        setsFlags: ['opnsense_migration_planned'],
      },
      {
        id: 'sophos_renew',
        text: 'Sophos verlaengern - Never change a running system',
        effects: { compliance: 5, budget: -8000 },
        resultText: 'Die sichere Wahl. Support ist inklusive, Dokumentation existiert, {kollege} kennt es auch. Langweilig, aber richtig fuer KRITIS.',
        choiceTags: ['safe', 'conservative'],
      },
      {
        id: 'hybrid_approach',
        text: 'Hybrid: OPNsense intern, Sophos als Perimeter',
        effects: { relationships: { chef: 5 }, budget: -4000, stress: 10, skills: { netzwerk: 5 } },
        resultText: 'Der beste technische Kompromiss: Sophos bleibt fuer Internet-Perimeter (Support!), OPNsense fuer interne Segmentierung. Mehr Arbeit, aber mehr Sicherheit.',
        choiceTags: ['balanced', 'technical'],
        teachingMoment: 'Defense in Depth: Mehrere Schichten sind besser als eine perfekte.',
      },
    ],
    tags: ['story', 'budget', 'firewall', 'opensource', 'week5'],
  },

  // Chain consequence: Server overheat
  {
    id: 'evt_server_overheat',
    weekRange: [6, 9],
    probability: 1.0,
    category: 'crisis',
    isChainEvent: true,
    chainPriority: 8,
    title: 'Ueberhitzung',
    description: `Die Temperatur im Serverraum hat 45 Grad erreicht.

Der Exchange-Server schaltet sich mit einem Notfall-Shutdown ab. Dann der Fileserver. Dann...

Die {gf} ruft persoenlich an: "Was ist los?! Niemand kann arbeiten!"

Du stehst vor einem Serverraum voller heisser, stiller Maschinen.`,
    involvedCharacters: ['chef', 'gf'],
    mentorNote: 'Nach einem thermischen Shutdown: Server NICHT sofort wieder einschalten! Abkuehlen lassen (mindestens 30 Minuten), Festplatten pruefen (SMART-Werte), dann kontrolliert hochfahren. Hitze killt Hardware.',
    choices: [
      {
        id: 'controlled_restart',
        text: 'Abkuehlen lassen, dann kontrolliert hochfahren',
        effects: { stress: 20, relationships: { gf: -5 }, compliance: 10 },
        resultText: 'Du wartest 45 Minuten. Die Server kuehlen ab. Der Neustart ist sauber - keine Datenverluste. Die Downtime war schlimm, aber es haette schlimmer sein koennen.',
        choiceTags: ['patient', 'correct'],
        teachingMoment: 'Geduld bei Hardware-Problemen spart langfristig Geld und Nerven.',
      },
      {
        id: 'immediate_restart',
        text: 'Sofort wieder einschalten - alle warten!',
        effects: { stress: 10, compliance: -10 },
        resultText: 'Du drueckst den Startknopf. Der Exchange faehrt hoch... und stuerzt wieder ab. Eine Festplatte ist beschaedigt. Das wird teuer.',
        choiceTags: ['hasty', 'risky'],
      },
    ],
    tags: ['story', 'chain_consequence', 'crisis', 'hardware'],
  },
];
