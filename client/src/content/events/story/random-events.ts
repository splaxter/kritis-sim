import { GameEvent } from '@kritis/shared';

/**
 * Random Flavor Events
 * Short events with small stat changes that fire randomly between story events
 * ~30% chance per week, adds variety and humor
 */

export const randomFlavorEvents: GameEvent[] = [
  // Windows Update chaos
  {
    id: 'evt_random_windows_update',
    weekRange: [1, 12],
    probability: 0.3,
    category: 'absurd',
    title: 'Normaler Dienstag',
    description: `Windows Update hat 12 PCs lahmgelegt. Mitten in der Arbeitszeit.

"Bitte warten Sie, während Windows konfiguriert wird... 34%"

Die Fachabteilung ruft an: "Warum macht der Computer das JETZT?!"`,
    involvedCharacters: [],
    mentorNote: 'WSUS-Einstellungen: Updates nur ausserhalb der Arbeitszeit, Neustart nur nachts. Oder: Maintenance Windows in Baramundi konfigurieren.',
    choices: [
      {
        id: 'let_finish',
        text: 'Durchlaufen lassen - ist in 20 Minuten fertig',
        effects: { stress: 5 },
        resultText: 'Du wartest. Die Mitarbeiter trinken Kaffee. Nach 25 Minuten läuft alles wieder.',
      },
    ],
    tags: ['random', 'absurd', 'windows'],
  },

  // Post-it password
  {
    id: 'evt_random_postit_password',
    weekRange: [1, 12],
    probability: 0.25,
    category: 'security',
    title: 'Der Post-it',
    description: `Du gehst an einem Schreibtisch vorbei. Auf dem Monitor klebt ein Post-it:

"Passwort: Sommer2024!"

Der Mitarbeiter ist in der Pause.`,
    involvedCharacters: [],
    mentorNote: 'Passwort-Policies helfen nicht, wenn die Nutzer nicht verstehen WARUM. Awareness-Schulung ist wichtiger als Komplexitätsregeln.',
    choices: [
      {
        id: 'remove_postit',
        text: 'Post-it entfernen und eine Notiz hinterlassen',
        effects: { compliance: -3, stress: 2 },
        resultText: 'Du nimmst den Post-it mit und lässt eine freundliche Erinnerung da. Ob es hilft?',
      },
      {
        id: 'ignore_postit',
        text: 'Weitergehen - nicht dein Problem',
        effects: { stress: 1 },
        resultText: 'Du gehst weiter. Wahrscheinlich nicht das einzige Post-it im Haus...',
      },
    ],
    tags: ['random', 'security', 'passwords'],
  },

  // Printer toner
  {
    id: 'evt_random_toner',
    weekRange: [1, 12],
    probability: 0.3,
    category: 'support',
    title: 'Toner leer',
    description: `"Der Drucker druckt nicht mehr!"

Toner ist alle. Natürlich der eine Drucker, den alle brauchen. Natürlich um 8:45 Uhr.

Ersatztoner: Im Schrank. Schrank: Abgeschlossen. Schlüssel: Bei Frau Müller. Frau Müller: Im Urlaub.`,
    involvedCharacters: [],
    choices: [
      {
        id: 'find_alternative',
        text: 'Anderen Drucker konfigurieren',
        effects: { stress: 3 },
        resultText: 'Du richtest schnell einen anderen Drucker ein. Problem gelöst - für heute.',
      },
    ],
    tags: ['random', 'support', 'printers'],
  },

  // Heater on USV
  {
    id: 'evt_random_heater',
    weekRange: [1, 12],
    probability: 0.2,
    category: 'absurd',
    title: 'Der Heizlüfter',
    description: `Du hörst ein Summen aus dem Serverraum. Ungewöhnlich.

Jemand hat einen privaten Heizlüfter an die USV angeschlossen. Die USV zeigt 95% Last.

Der Serverraum ist 28 Grad warm.`,
    involvedCharacters: [],
    mentorNote: 'Physischer Zugang zum Serverraum muss kontrolliert sein. Jeder Heizlüfter ist ein Risiko.',
    choices: [
      {
        id: 'remove_heater',
        text: 'Heizlüfter entfernen und Mail an alle',
        effects: { stress: 5, compliance: -2 },
        resultText: 'Der Heizlüfter wandert in den Müll. Die anonyme Rundmail wird ignoriert. Business as usual.',
      },
    ],
    tags: ['random', 'absurd', 'infrastructure'],
  },

  // Post-it "NICHT AUSSCHALTEN"
  {
    id: 'evt_random_dont_touch',
    weekRange: [1, 12],
    probability: 0.2,
    category: 'absurd',
    title: 'Die Warnung',
    description: `Du findest einen Post-it am Server: "NICHT AUSSCHALTEN!!!! - 2019"

Was passiert, wenn man ihn ausschaltet? Niemand weiss es mehr.

Willst du es rausfinden?`,
    involvedCharacters: [],
    choices: [
      {
        id: 'leave_it',
        text: 'Finger weg - zu riskant',
        effects: {},
        resultText: 'Der Server bleibt an. Das Geheimnis bleibt ungelöst. Manchmal ist Nichtwissen besser.',
      },
      {
        id: 'investigate',
        text: 'Recherchieren was der Server macht',
        effects: { stress: 3, skills: { troubleshooting: 2 } },
        resultText: 'Du findest raus: Es ist ein DNS-Server. Wenn der aus ist, geht gar nichts mehr. Der Post-it bleibt.',
      },
    ],
    tags: ['random', 'absurd', 'legacy'],
  },

  // Desktop screenshot ticket
  {
    id: 'evt_random_screenshot',
    weekRange: [1, 12],
    probability: 0.3,
    category: 'absurd',
    title: 'Das Ticket',
    description: `Neues Ticket: "Internet geht nicht."

Anhänge: 1

Du öffnest den Anhang: Ein Screenshot vom Desktop. Mit dem Browser-Icon. Sonst nichts.`,
    involvedCharacters: [],
    choices: [
      {
        id: 'call_user',
        text: 'Anrufen und nachfragen',
        effects: { stress: 3 },
        resultText: '"Ja, ich hab den Browser geöffnet und da kam nix." DNS-Problem. Gelöst in 2 Minuten. Ticket-Zeit: 45 Minuten.',
      },
    ],
    tags: ['random', 'absurd', 'support'],
  },

  // Friday 16:50 call
  {
    id: 'evt_random_friday_call',
    weekRange: [1, 12],
    dayPreference: [5],
    probability: 0.4,
    category: 'absurd',
    title: 'Freitagsanruf',
    description: `Freitag, 16:50 Uhr. Das Telefon klingelt.

"Ich hab da ein Problem... können Sie mal kurz schauen?"

Dein Feierabend winkt.`,
    involvedCharacters: [],
    choices: [
      {
        id: 'take_call',
        text: 'Rangehen - Service ist Service',
        effects: { stress: 5 },
        resultText: '"Kurz" dauert 40 Minuten. Es war der Bildschirm. Der war aus.',
      },
      {
        id: 'voicemail',
        text: 'Klingeln lassen - Montag ist auch ein Tag',
        effects: { stress: -2 },
        resultText: 'Du lässt es klingeln. Der Anrufer hinterlässt keine Nachricht. War wohl nicht so wichtig.',
      },
    ],
    tags: ['random', 'absurd', 'support'],
  },

  // Coffee machine broken
  {
    id: 'evt_random_coffee',
    weekRange: [1, 12],
    probability: 0.2,
    category: 'absurd',
    title: 'Kaffee-Krise',
    description: `Die Kaffeemaschine in der IT ist kaputt.

Die Stimmung sinkt messbar. {kollege} schaut dich verzweifelt an.

"Wie sollen wir so arbeiten?"`,
    involvedCharacters: ['kollege'],
    choices: [
      {
        id: 'emergency_coffee',
        text: 'Kaffee von der Buchhaltung holen',
        effects: { stress: 8 },
        resultText: 'Die Buchhaltung hat besseren Kaffee. Und eine funktioniere Maschine. Die IT ist neidisch.',
      },
    ],
    tags: ['random', 'absurd', 'morale'],
  },

  // Fax request
  {
    id: 'evt_random_fax',
    weekRange: [1, 12],
    probability: 0.15,
    category: 'absurd',
    title: 'Die Fax-Anfrage',
    description: `Ein Bürger ruft an: "Kann ich meine Abfuhrtermine per Fax bekommen?"

Du schaust auf das Faxgerät in der Ecke. Es hat seit 2019 keinen Strom mehr.`,
    involvedCharacters: [],
    choices: [
      {
        id: 'find_fax',
        text: 'Faxgerät reaktivieren',
        effects: { stress: 3 },
        resultText: 'Nach 20 Minuten Suche nach Tonern und Kabeln funktioniert das Fax. Du schickst die Termine. Der Bürger bedankt sich herzlich.',
      },
      {
        id: 'suggest_email',
        text: 'Höflich auf E-Mail verweisen',
        effects: { stress: 1 },
        resultText: '"Ich hab kein E-Mail." Der Bürger legt auf. Du fühlst dich schuldig.',
      },
    ],
    tags: ['random', 'absurd', 'citizen'],
  },

  // Steam question
  {
    id: 'evt_random_steam',
    weekRange: [1, 12],
    probability: 0.15,
    category: 'absurd',
    title: 'Die Steam-Frage',
    description: `{kollege} fragt beiläufig: "Kann man eigentlich Steam auf dem Dienstrechner...?"

Er schaut dich mit grossen Augen an.`,
    involvedCharacters: ['kollege'],
    choices: [
      {
        id: 'say_no',
        text: 'Nein. Einfach nein.',
        effects: {},
        resultText: '"Dachte ich mir." Er geht weiter. Du fragst dich, was er in der Mittagspause treibt.',
      },
    ],
    tags: ['random', 'absurd', 'policy'],
  },

  // Projector blue
  {
    id: 'evt_random_projector',
    weekRange: [1, 12],
    probability: 0.25,
    category: 'support',
    title: 'Blaues Wunder',
    description: `Der Beamer im Besprechungsraum zeigt nur Blau. Seit Wochen.

Niemand hat ein Ticket gemacht. Alle haben sich daran gewöhnt.

"Wir halten unsere Präsentationen halt mit Handouts."`,
    involvedCharacters: [],
    choices: [
      {
        id: 'fix_projector',
        text: 'Schnell fixen - ist wahrscheinlich nur das Kabel',
        effects: { stress: 3 },
        resultText: 'Es war das Kabel. 2 Minuten Arbeit. Die Mitarbeiter sind erstaunt, dass man Beamer auch reparieren kann.',
      },
    ],
    tags: ['random', 'support', 'projector'],
  },

  // WLAN key ancient
  {
    id: 'evt_random_wlan',
    weekRange: [1, 12],
    probability: 0.2,
    category: 'security',
    title: 'Das WLAN-Geheimnis',
    description: `Du findest den WLAN-Schlüssel für das Gäste-Netz.

"warm1234"

Seit 2017 unverändert. Auf dem Aushang im Foyer.`,
    involvedCharacters: [],
    choices: [
      {
        id: 'change_password',
        text: 'Passwort ändern und Aushang aktualisieren',
        effects: { compliance: -5, stress: 5 },
        resultText: 'Neues Passwort, neuer Aushang. 47 Leute beschweren sich, dass ihr WLAN nicht mehr geht. Sie hatten es gespeichert.',
      },
      {
        id: 'leave_wlan',
        text: 'Erstmal so lassen - Gäste-Netz ist isoliert',
        effects: {},
        resultText: 'Du dokumentierst es für später. Solange das Gäste-Netz vom Rest getrennt ist...',
      },
    ],
    tags: ['random', 'security', 'wlan'],
  },

  // Backup as movie drive
  {
    id: 'evt_random_backup_movies',
    weekRange: [1, 12],
    probability: 0.15,
    category: 'absurd',
    title: 'Das Backup-Laufwerk',
    description: `Du prüfst die Backup-Platten und findest eine mit dem Label "BACKUP_SRV01".

Inhalt: 847 GB Filme. Keine Backups.

Jemand hat die Backup-Platte als Film-Archiv benutzt.`,
    involvedCharacters: [],
    choices: [
      {
        id: 'investigate_owner',
        text: 'Besitzer ermitteln und ansprechen',
        effects: { compliance: -3, stress: 5 },
        resultText: 'Die Filme sind von 2018. Der Besitzer ist längst weg. Du formatierst die Platte.',
      },
    ],
    tags: ['random', 'absurd', 'backup'],
  },

  // Teams crash productivity
  {
    id: 'evt_random_teams',
    weekRange: [1, 12],
    probability: 0.2,
    category: 'absurd',
    title: 'Teams-Ausfall',
    description: `Microsoft Teams stürzt ab. Bundesweit.

Plötzlich herrscht Ruhe im Büro. Keine Anrufe, keine Chats, keine "kurzen Fragen".

Die Mitarbeiter schauen verwirrt - und fangen an, konzentriert zu arbeiten.`,
    involvedCharacters: [],
    choices: [
      {
        id: 'enjoy_silence',
        text: 'Die Ruhe geniessen',
        effects: { stress: -5 },
        resultText: 'Zwei Stunden später ist Teams wieder online. Die Produktivität sinkt sofort.',
      },
    ],
    tags: ['random', 'absurd', 'productivity'],
  },

  // GF presentation blue screen
  {
    id: 'evt_random_bsod_presentation',
    weekRange: [3, 12],
    probability: 0.15,
    category: 'crisis',
    title: 'Bluescreen-Timing',
    description: `Windows zeigt "Neustart in 15 Minuten" auf dem Präsentations-PC.

Die {gf} präsentiert gerade vor dem Kreistag.

Das Popup ist auf der Leinwand zu sehen.`,
    involvedCharacters: ['gf'],
    choices: [
      {
        id: 'sprint_to_pc',
        text: 'Zum PC sprinten und Neustart verschieben',
        effects: { stress: 10, relationships: { gf: -3 } },
        resultText: 'Du stürmst in den Raum, klickst hektisch "Später erinnern" und verschwinde. Die {gf} macht weiter als wäre nichts gewesen.',
      },
    ],
    tags: ['random', 'crisis', 'presentation'],
  },

  // "Kurz schauen" 3 hours
  {
    id: 'evt_random_kurz_schauen',
    weekRange: [1, 12],
    probability: 0.3,
    category: 'absurd',
    title: 'Kurz Schauen',
    description: `Mail von Frau Schmidt: "Können Sie mal kurz schauen?"

Du schaust auf die Uhr. Es ist 10:00 Uhr.

Drei Stunden später bist du immer noch dabei. Es war nicht "kurz".`,
    involvedCharacters: [],
    choices: [
      {
        id: 'finish_task',
        text: 'Zu Ende bringen - angefangen ist angefangen',
        effects: { stress: 8 },
        resultText: 'Um 14:00 Uhr ist das Problem gelöst. Es war ein Profil-Problem, das zu einem GPO-Problem führte, das zu einem DNS-Problem führte...',
      },
    ],
    tags: ['random', 'absurd', 'support'],
  },

  // Friday email from chef
  {
    id: 'evt_random_friday_email',
    weekRange: [1, 12],
    dayPreference: [5],
    probability: 0.25,
    category: 'absurd',
    title: 'Die Freitagsmail',
    description: `Freitag, 16:55 Uhr. Mail von {chef}:

"Bis Montag bitte erledigen: Bestandsaufnahme aller Drucker mit Modell, Seriennummer, Standort und Alter."

Es sind 47 Drucker.`,
    involvedCharacters: ['chef'],
    choices: [
      {
        id: 'start_list',
        text: 'Seufzen und anfangen',
        effects: { stress: 10 },
        resultText: 'Du fängst an. Um 18:30 hast du die Hälfte. Der Rest wird Montag früh.',
      },
      {
        id: 'ignore_until_monday',
        text: 'Montag ist auch noch ein Tag',
        effects: { stress: 3, relationships: { chef: -3 } },
        resultText: 'Du fährst nach Hause. Montag fragst du: "Bis wann genau?" {chef}: "Ach, nächste Woche reicht."',
      },
    ],
    tags: ['random', 'absurd', 'deadline'],
  },

  // Scanner jams
  {
    id: 'evt_random_scanner',
    weekRange: [1, 12],
    probability: 0.2,
    category: 'support',
    title: 'Scanner-Stau',
    description: `Der Scanner in der Poststelle klemmt. Wieder.

Das Papier steckt so fest, dass der Deckel nicht mehr aufgeht.

Die Poststelle hat 200 Briefe zu scannen.`,
    involvedCharacters: [],
    choices: [
      {
        id: 'fix_scanner',
        text: 'Papier vorsichtig entfernen',
        effects: { stress: 3 },
        resultText: 'Nach 15 Minuten Fummelei ist das Papier draussen. Der Scanner läuft wieder. Bis nächste Woche.',
      },
    ],
    tags: ['random', 'support', 'hardware'],
  },

  // Admin password in browser
  {
    id: 'evt_random_saved_password',
    weekRange: [1, 12],
    probability: 0.15,
    category: 'security',
    title: 'Gespeichertes Passwort',
    description: `Du arbeitest am PC eines kranken Kollegen.

Der Browser öffnet sich. Autofill zeigt: "admin@warm-kommunal.de" mit gespeichertem Passwort.

Es ist ein Shared PC in der Poststelle.`,
    involvedCharacters: [],
    choices: [
      {
        id: 'delete_password',
        text: 'Gespeichertes Passwort löschen',
        effects: { compliance: -5, stress: 3 },
        resultText: 'Du löschst das Passwort und informierst {chef}. Der stellt die Frage: "Wer hat Autofill auf Shared PCs erlaubt?"',
      },
    ],
    tags: ['random', 'security', 'passwords'],
  },

  // Cake in IT department
  {
    id: 'evt_random_cake',
    weekRange: [1, 12],
    probability: 0.15,
    category: 'personal',
    title: 'Kuchen-Überfall',
    description: `Eine Kollegin bringt Kuchen mit. "Geburtstag!" ruft sie.

Die IT-Abteilung isst die Hälfte, bevor die anderen Abteilungen es merken.

{kollege} hat schon zwei Stücke gegessen.`,
    involvedCharacters: ['kollege'],
    choices: [
      {
        id: 'eat_cake',
        text: 'Auch ein Stück nehmen',
        effects: { stress: -3 },
        resultText: 'Schokoladenkuchen. Der Tag ist gerettet.',
      },
    ],
    tags: ['random', 'personal', 'morale'],
  },
];
