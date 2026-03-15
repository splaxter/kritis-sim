import { GameEvent } from '@kritis/shared';

export const week1Events: GameEvent[] = [
  {
    id: 'evt_first_day',
    weekRange: [1, 1],
    dayPreference: [1],
    probability: 1,
    category: 'personal',
    title: 'Der erste Tag',
    description: `Du betrittst das Büro der IT-Abteilung. Kaffeeduft, das Summen von Servern aus dem Nebenraum, und ein Schreibtisch voller Post-its erwartet dich.

Dein Chef {chef} kommt auf dich zu: "Ah, der Neue! Gut dass du da bist. Wir haben hier einiges zu tun. Erstmal: Passwort ändern, Systeme kennenlernen. Und wenn du Fragen hast - frag lieber einmal zu viel als einmal zu wenig."

Was antwortest du?`,
    involvedCharacters: ['chef'],
    choices: [
      {
        id: 'enthusiastic',
        text: '"Ich freue mich auf die Herausforderung!"',
        effects: { relationships: { chef: 5 }, stress: 5 },
        resultText: '{chef} nickt zufrieden. "Die richtige Einstellung. Du wirst sie brauchen."',
      },
      {
        id: 'professional',
        text: '"Verstanden. Wo finde ich die Dokumentation?"',
        effects: { relationships: { chef: 10 }, skills: { troubleshooting: 2 } },
        resultText: '{chef} grinst. "Ein Dokumentationsleser! Selten. Confluence, aber erwarte nicht zu viel."',
        teachingMoment: 'Dokumentation zuerst zu lesen zeigt Professionalität und spart später Zeit.',
      },
      {
        id: 'nervous',
        text: '"Äh, klar. Wird schon..."',
        effects: { relationships: { chef: -5 }, stress: 10 },
        resultText: '{chef} runzelt die Stirn. "Selbstvertrauen kommt mit der Erfahrung. Hoffe ich."',
      },
    ],
    tags: ['intro', 'onboarding'],
  },
  {
    id: 'evt_password_reset_wave',
    weekRange: [1, 2],
    probability: 0.9,
    category: 'support',
    title: 'Die Passwort-Reset-Welle',
    description: `Montagmorgen. Dein Ticketsystem explodiert.

"Passwort vergessen" - 12 Tickets.
"Kann mich nicht anmelden" - 8 Tickets.
"Mein Account ist gesperrt" - 5 Tickets.

{kollege} schaut rüber: "Willkommen im Montag. Das ist normal nach dem Wochenende."

Wie gehst du vor?`,
    involvedCharacters: ['kollege'],
    choices: [
      {
        id: 'bulk_reset',
        text: 'Alle Passwörter auf einmal zurücksetzen (Massenreset im AD)',
        requires: { skill: 'windows', threshold: 30 },
        effects: { skills: { windows: 5 }, stress: -5, relationships: { fachabteilung: 10 } },
        resultText: 'Du öffnest PowerShell und setzt alle betroffenen Accounts mit einem Skript zurück. In 10 Minuten erledigt.',
        teachingMoment: 'Get-ADUser + Set-ADAccountPassword in einer Pipeline spart Stunden.',
        unlocks: ['Get-ADUser'],
      },
      {
        id: 'one_by_one',
        text: 'Jeden einzeln anrufen und manuell zurücksetzen',
        effects: { stress: 15, relationships: { fachabteilung: 5 } },
        resultText: 'Drei Stunden später bist du durch. Dein Kaffee ist längst kalt.',
      },
      {
        id: 'delegate',
        text: 'Die Hälfte an {kollege} delegieren',
        effects: { relationships: { kollegen: -5 }, stress: 5 },
        resultText: '{kollege} seufzt, hilft aber. "Beim nächsten Mal zeig ich dir, wie man das skriptet."',
      },
    ],
    tags: ['support', 'ad', 'windows'],
  },
  {
    id: 'evt_drucker_fluch',
    weekRange: [1, 3],
    probability: 0.85,
    category: 'support',
    title: 'Der Druckerfluch',
    description: `Das Telefon klingelt. Athos-Abteilung.

"Der Drucker geht nicht! Wir müssen dringend Abfuhrbescheide drucken!"

Du gehst hin. Der Drucker zeigt "Bereit" an. Papier ist drin. Toner voll.

Was machst du?`,
    involvedCharacters: ['athos'],
    choices: [
      {
        id: 'check_queue',
        text: 'Druckerwarteschlange am Server prüfen',
        effects: { skills: { windows: 3, troubleshooting: 5 }, stress: -5 },
        resultText: 'Bingo. 47 hängende Druckaufträge. Du leerst die Queue, startest den Spooler neu. Druckt.',
        teachingMoment: 'Immer zuerst die Warteschlange prüfen. Get-PrintJob oder Druckerverwaltung.',
        terminalCommand: true,
      },
      {
        id: 'restart_printer',
        text: 'Drucker aus- und wieder einschalten',
        effects: { stress: 5 },
        resultText: 'Drucker startet neu... zeigt wieder "Bereit". Druckt immer noch nicht. Das Problem liegt woanders.',
        teachingMoment: 'Neustart hilft nur bei Hardware-Problemen. Hier war es der Spooler-Dienst.',
      },
      {
        id: 'reinstall_driver',
        text: 'Treiber neu installieren',
        effects: { stress: 10, skills: { windows: 2 } },
        resultText: 'Eine Stunde später: Treiber neu, Problem bestand weiter. Es war der Spooler-Dienst.',
      },
    ],
    terminalContext: {
      type: 'windows',
      hostname: 'WARM-PC-042',
      username: 'admin',
      currentPath: 'C:\\>',
      commands: [
        {
          pattern: 'Get-PrintJob',
          output: `JobId  PrinterName      Document                    Status
-----  -----------      --------                    ------
142    HP-LaserJet-4    Abfuhrbescheid_2026.pdf    Spooling
143    HP-LaserJet-4    Abfuhrbescheid_2026.pdf    Error
... (45 weitere Einträge)`,
          teachesCommand: 'Get-PrintJob',
          skillGain: { windows: 2 },
        },
        {
          pattern: 'Clear-PrintQueue',
          output: 'Warteschlange wurde geleert.',
          skillGain: { windows: 2 },
          isSolution: true,
        },
        {
          pattern: 'Restart-Service -Name Spooler',
          output: 'Dienst wird neu gestartet...',
          skillGain: { windows: 3 },
          isSolution: true,
        },
      ],
      solutions: [
        {
          commands: ['Clear-PrintQueue', 'Restart-Service'],
          allRequired: false,
          resultText: 'Der Drucker rattert los. 47 Abfuhrbescheide werden gedruckt.',
          skillGain: { windows: 5, troubleshooting: 5 },
          effects: { relationships: { fachabteilung: 10 }, stress: -10 },
        },
      ],
      hints: [
        'Tipp: PowerShell kann Druckaufträge anzeigen. Get-PrintJob?',
        'Tipp: Die Warteschlange scheint voll zu sein...',
        'Tipp: Clear-PrintQueue oder Spooler-Dienst neu starten',
      ],
    },
    tags: ['support', 'drucker', 'windows', 'terminal'],
  },
];
