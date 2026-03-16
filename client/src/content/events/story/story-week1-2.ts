import { GameEvent } from '@kritis/shared';

/**
 * Act 1 Story Events: Weeks 1-2 (Orientation Phase)
 * E01-E05: First days, getting oriented, discovering problems
 */

export const storyWeek1to2Events: GameEvent[] = [
  // E01: Erster Arbeitstag (Week 1)
  {
    id: 'evt_erster_arbeitstag',
    weekRange: [1, 1],
    dayPreference: [1],
    probability: 1.0,
    category: 'personal',
    title: 'Erster Arbeitstag',
    image: '/images/events/evt_erster_arbeitstag.webp',
    description: `Dein erster Tag bei WARM. {chef} begruesst dich kurz und gibt dir gleich zwei Aufgaben:

"Der Docusnap-Server muss mal geprueft werden, der scannt seit Wochen nicht mehr richtig. Und das WLAN im grossen Besprechungsraum spinnt - die {gf} hat sich schon beschwert."

Er schaut auf die Uhr. "Ich muss zu einem Termin. Fang einfach an."

{kollege} sitzt am Schreibtisch nebenan und tippt konzentriert.`,
    involvedCharacters: ['chef', 'kollege', 'gf'],
    mentorNote: 'Am ersten Tag: Frag deinen Kollegen. Er kennt die Prioritaeten besser als der Chef sie kommuniziert. Ausserdem baust du so frueh eine wichtige Beziehung auf.',
    choices: [
      {
        id: 'docusnap_first',
        text: 'Docusnap zuerst - Compliance ist wichtiger',
        effects: { relationships: { chef: 5 }, compliance: 5, stress: 5 },
        resultText: 'Du arbeitest dich in Docusnap ein. Der Scanner-Dienst war abgestuerzt - ein Neustart loest das Problem. {chef} ist zufrieden, aber das WLAN im Besprechungsraum bleibt defekt.',
        choiceTags: ['compliant', 'technical'],
        setsFlags: ['docusnap_fixed_day1'],
      },
      {
        id: 'wlan_first',
        text: 'WLAN zuerst - die GF wartet',
        effects: { relationships: { gf: 10, chef: -5 }, stress: 5 },
        resultText: 'Du findest das Problem: Ein Access Point hatte sich aufgehaengt. {gf} bedankt sich persoenlich - sie hatte gleich ein wichtiges Meeting. {chef} fragt spaeter: "Und Docusnap?"',
        choiceTags: ['political', 'responsive'],
        setsFlags: ['gf_helped_day1'],
      },
      {
        id: 'ask_colleague',
        text: '{kollege} fragen, was wichtiger ist',
        effects: { relationships: { kollegen: 10 }, skills: { softSkills: 3 } },
        resultText: '{kollege} laechelt. "Wenn die GF meckert, ist das Prio 1. Docusnap laeuft eh seit Wochen nicht, ein Tag mehr macht auch nichts." Er zeigt dir, wo die APs haengen.',
        choiceTags: ['social', 'learning'],
        teachingMoment: 'Erfahrene Kollegen kennen die inoffiziellen Prioritaeten. Fragen zeigt keine Schwaeche, sondern Lernbereitschaft.',
      },
    ],
    tags: ['story', 'orientation', 'week1'],
  },

  // E02: Der Kabelschrank (Week 1-2)
  {
    id: 'evt_kabelschrank',
    weekRange: [1, 2],
    probability: 0.95,
    category: 'support',
    title: 'Der Kabelschrank',
    image: '/images/events/evt_kabelschrank.webp',
    description: `Du oeffnest zum ersten Mal den Patchschrank im Serverraum.

Was du siehst, laesst dich innehalten: Kabel haengen kreuz und quer, nichts ist beschriftet, ein Switch von 2011 blinkt traege vor sich hin, und irgendetwas, das ein Router sein koennte, ist mit Klebeband an die Wand geheftet.

Auf einem Post-it steht: "NICHT ANFASSEN!!! - M.K. 2019"

{kollege} kommt vorbei und grinst: "Ja, das ist... historisch gewachsen."`,
    involvedCharacters: ['kollege'],
    mentorNote: 'Fotodokumentation am ersten Tag ist Gold wert. Du glaubst nicht, wie schnell du vergisst, wie es vorher aussah. Ausserdem: Wenn du etwas kaputt machst, hast du Beweis, dass es vorher schon Chaos war.',
    choices: [
      {
        id: 'document_now',
        text: 'Sofort alles fotografieren und dokumentieren',
        effects: { stress: 10, compliance: 10, skills: { netzwerk: 3 } },
        resultText: 'Du verbringst den halben Tag damit, jedes Kabel zu verfolgen und zu dokumentieren. Es ist muehsam, aber jetzt hast du einen Ueberblick - und Beweise, falls etwas schiefgeht.',
        choiceTags: ['thorough', 'compliant'],
        setsFlags: ['cable_chaos_documented'],
        teachingMoment: 'Netzwerkdokumentation ist bei KRITIS-Pruefungen ein Pflichtteil. Je frueher, desto besser.',
      },
      {
        id: 'quick_photo',
        text: 'Schnelles Foto und weitermachen - ist nicht dringend',
        effects: { stress: 3 },
        resultText: 'Du machst ein paar Handyfotos und gehst weiter. Wird schon nicht so schlimm sein...',
        choiceTags: ['pragmatic'],
        chainTriggers: [{
          targetEventId: 'evt_cable_chaos_later',
          delayWeeks: 3,
          probability: 0.7,
          description: 'Undocumented cables cause problems later',
        }],
      },
      {
        id: 'ask_history',
        text: '{kollege} nach der Geschichte fragen',
        effects: { relationships: { kollegen: 5 }, skills: { softSkills: 3 } },
        resultText: '{kollege} seufzt. "Das war alles schon so, als ich kam. Der Vorgaenger von meinem Vorgaenger hat das verbockt. M.K. - das war Markus, der ist 2019 gegangen. Niemand traut sich ran."',
        choiceTags: ['social', 'learning'],
        teachingMoment: 'Die Geschichte zu kennen hilft, Fehler nicht zu wiederholen - und zu verstehen, warum manche Dinge so sind wie sie sind.',
      },
    ],
    tags: ['story', 'infrastructure', 'week1'],
  },

  // E03: Das AD-Passwort (Week 1-2)
  {
    id: 'evt_ad_passwort',
    weekRange: [1, 2],
    probability: 0.9,
    category: 'security',
    title: 'Das AD-Passwort',
    image: '/images/events/evt_ad_passwort.webp',
    description: `Das Telefon klingelt. Eine aufgeregte Stimme:

"Hier ist Frau Mueller aus der Abfallwirtschaft! Ich bin aus meinem Computer ausgesperrt, das Passwort geht nicht mehr! Ich muss HEUTE noch die Abfuhrbescheide rausschicken, die Frist laeuft ab!"

Du hast Admin-Rechte im Active Directory. Ein Passwort-Reset dauert 30 Sekunden.

Aber: Es gibt keinen dokumentierten Prozess fuer Passwort-Resets. Keine Identitaetspruefung, keine Freigabe.`,
    involvedCharacters: ['chef'],
    mentorNote: 'Passwortreset-Prozess dokumentieren ist langweilig, spart aber hunderte Stunden im Jahr. Wichtig: Identitaet verifizieren (Rueckruf auf bekannte Nummer), neues Passwort sicher uebermitteln, Aenderung bei naechstem Login erzwingen.',
    choices: [
      {
        id: 'reset_now',
        text: 'Sofort zuruecksetzen - die Frau muss arbeiten',
        effects: { relationships: { fachabteilung: 10 }, compliance: -5, stress: 3 },
        resultText: 'Du setzt das Passwort zurueck. Frau Mueller ist erleichtert: "Danke, danke, danke!" Aber du hast gerade ohne Identitaetspruefung Zugang zu Buergerdaten freigeschaltet...',
        choiceTags: ['helpful', 'risky'],
        chainTriggers: [{
          targetEventId: 'evt_password_policy_needed',
          delayWeeks: 2,
          description: 'Lack of password policy becomes apparent',
        }],
      },
      {
        id: 'process_first',
        text: 'Erst Prozess erstellen, dann zuruecksetzen',
        effects: { compliance: 10, relationships: { fachabteilung: -10, chef: 5 }, stress: 8 },
        resultText: 'Du nimmst dir 30 Minuten, um einen kurzen Prozess zu schreiben: Rueckruf zur Verifizierung, temporaeres Passwort per Telefon, Aenderungszwang. Frau Mueller ist genervt, aber es ist richtig.',
        choiceTags: ['thorough', 'compliant'],
        setsFlags: ['password_process_created'],
        teachingMoment: 'Ein dokumentierter Prozess schuetzt dich und die Organisation. Bei einem Audit ist "Ich habs halt gemacht" keine Antwort.',
      },
      {
        id: 'ask_chef',
        text: '{chef} fragen, wie das bisher gehandhabt wurde',
        effects: { relationships: { chef: -3 }, stress: 5 },
        resultText: '{chef} seufzt am Telefon. "Einfach zuruecksetzen, wir sind hier nicht die NSA. Aber mach das mit dem Prozess irgendwann mal." Hilfreiche Ansage.',
        choiceTags: ['escalate'],
      },
    ],
    tags: ['story', 'security', 'process', 'week1'],
  },

  // E04: Docusnap Einrichtung (Week 2-3)
  {
    id: 'evt_docusnap_einrichtung',
    weekRange: [2, 3],
    probability: 0.9,
    category: 'compliance',
    title: 'Docusnap Einrichtung',
    image: '/images/events/evt_docusnap_einrichtung.webp',
    description: `Zeit, Docusnap richtig einzurichten. Die Lizenz existiert, aber die Konfiguration ist... minimalistisch.

Der letzte vollstaendige Scan war vor 6 Monaten. Die AD-Integration fehlt. Compliance-Reports? Fehlanzeige.

{chef} meint: "Das sollte mal jemand ordentlich machen. Fuer das BSI-Audit brauchen wir aktuelle Inventardaten."

Du schaust auf deinen Kalender. Diese Woche hast du schon drei eskalierte Tickets.`,
    involvedCharacters: ['chef'],
    mentorNote: 'Docusnap Inventarisierung mit AD-Integration und geplanten Scans ist das Fundament fuer jede KRITIS-Pruefung. Einmal richtig einrichten, dann laeuft es. Tipp: Discovery-Scans ausserhalb der Kernarbeitszeit planen - sie erzeugen Netzwerklast.',
    choices: [
      {
        id: 'full_setup',
        text: 'Vollstaendiges Setup mit AD-Integration und Zeitplaenen',
        effects: { stress: 10, compliance: 15, skills: { troubleshooting: 5 } },
        resultText: 'Du nimmst dir zwei Tage Zeit. AD-Anbindung, geplante Scans (Sonntag 3 Uhr), automatische Reports. Es laeuft. Beim naechsten Audit hast du alle Daten auf Knopfdruck.',
        choiceTags: ['thorough', 'compliant'],
        setsFlags: ['docusnap_configured_properly'],
        teachingMoment: 'Automatisierung spart langfristig Zeit. Lieber einmal richtig als dreimal halbherzig.',
      },
      {
        id: 'quick_scan',
        text: 'Schnellscan um zu sehen was da ist, Rest spaeter',
        effects: { stress: 3, compliance: 5 },
        resultText: 'Du startest einen manuellen Scan. 847 Geraete gefunden. Interessant. Aber ohne Zeitplanung wird das beim naechsten Audit wieder veraltet sein.',
        choiceTags: ['pragmatic'],
        chainTriggers: [{
          targetEventId: 'evt_docusnap_audit',
          delayWeeks: 4,
          probability: 0.6,
          description: 'Incomplete setup leads to audit issues',
        }],
      },
      {
        id: 'postpone',
        text: 'Verschieben - die Tickets haben Prioritaet',
        effects: { stress: -3 },
        resultText: 'Du legst Docusnap auf die "Spaeter"-Liste. Die Tickets sind dringender. Wahrscheinlich.',
        choiceTags: ['procrastinate'],
        chainTriggers: [{
          targetEventId: 'evt_docusnap_audit',
          delayWeeks: 4,
          description: 'Postponed documentation causes major audit problems',
        }],
      },
    ],
    tags: ['story', 'compliance', 'documentation', 'week2'],
  },

  // E05: Die Lizenzfrage (Week 2-3)
  {
    id: 'evt_lizenzfrage',
    weekRange: [2, 3],
    probability: 0.85,
    category: 'compliance',
    title: 'Die Lizenzfrage',
    image: '/images/events/evt_lizenzfrage.webp',
    description: `Beim Einrichten von Docusnap faellt dir etwas auf: 15 Office-Installationen sind nicht lizenziert.

Jemand hat sie mit einem Volume-Key installiert, der nicht genug Seats hat. Das ist seit... Jahren so.

Du rechnest: 15 Lizenzen x 300 Euro = 4.500 Euro Nachlizenzierung. Plus eventuelle Strafen, falls Microsoft prueft.

Was tust du?`,
    involvedCharacters: ['chef', 'kaemmerer'],
    mentorNote: 'Lizenzfunde IMMER zuerst dem direkten Vorgesetzten melden. Nie den Dienstweg ueberspringen - das kostet mehr Vertrauen als die Lizenzen kosten. Bei Microsoft: Selbstanzeige ist meist guenstiger als Audit.',
    choices: [
      {
        id: 'tell_chef',
        text: 'Sofort {chef} informieren',
        effects: { relationships: { chef: 5 }, compliance: 5 },
        resultText: '{chef} nickt ernst. "Gut, dass du das gefunden hast. Ich spreche mit dem Kaemmerer - das muss ins naechste Budget." Er scheint nicht ueberrascht zu sein.',
        choiceTags: ['honest', 'proper_channel'],
        setsFlags: ['license_issue_reported'],
        teachingMoment: 'Probleme frueh melden gibt Zeit, sie zu loesen, bevor sie eskalieren.',
      },
      {
        id: 'tell_kaemmerer',
        text: 'Direkt zum {kaemmerer} gehen - es geht um Geld',
        effects: { relationships: { kaemmerer: 10, chef: -25 }, compliance: 5, stress: 5 },
        resultText: '{kaemmerer} bedankt sich fuer die Info und leitet sofort Schritte ein. Spaeter: {chef} ist kalt. "Du bist ueber meinen Kopf hinweg gegangen. Das macht man nicht."',
        choiceTags: ['skip_hierarchy'],
        teachingMoment: 'Den Dienstweg zu ueberspringen kann kurzfristig effektiv sein, zerstoert aber Vertrauen nachhaltig.',
      },
      {
        id: 'document_quietly',
        text: 'Still dokumentieren und erstmal nichts sagen',
        effects: { compliance: -10, stress: 5 },
        resultText: 'Du speicherst deine Notizen ab. Vielleicht loest sich das Problem von selbst? (Spoiler: Tut es nicht.)',
        choiceTags: ['hide', 'risky'],
        chainTriggers: [{
          targetEventId: 'evt_license_audit_bomb',
          delayWeeks: 6,
          description: 'Hidden license issue explodes during audit',
        }],
      },
    ],
    tags: ['story', 'compliance', 'licensing', 'week2'],
  },
];
