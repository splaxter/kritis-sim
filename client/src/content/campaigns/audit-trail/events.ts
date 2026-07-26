/**
 * AUDIT TRAIL story events. Act 1 is fully authored (Task 11 opening dialogs +
 * Task 12 levels L1/L2 and the Wiki-Passwort dialog); Acts 2–4 (levels L3–L8 and
 * the audit showdown) are authored in Tasks 13–15. Beats in later chapters point
 * at event ids that don't exist yet, which is exactly what makes
 * isAtAuthoredStoryEnd raise the "Fortsetzung folgt" screen at the Act-1/2 seam.
 *
 * Terminal levels here are PURE hands-on beats (every choice opens the
 * terminal): they resolve exclusively through the solve path, which advances
 * the story beat via useGame's shared story-progression (applyStoryProgression).
 */
import { GameEvent } from '@kritis/shared';

// L1: M.s Übergabenotiz — the core find. Lives ONLY in the VFS; every read goes
// through the real shell, so path semantics are genuine (a relative `cat` works
// exactly when the cwd makes it valid). The win is a semantic fileRead goal.
const L1_NOTIZEN_M = `Falls das jemand liest: Die Exporte sind Stand Juni, Rest siehe Wiki.
Wichtig: Tickets werden hier gern nachträglich "aufgeräumt".
Ich habe angefangen, mir Stände wegzukopieren. Vergleicht die Versionen,
bevor ihr irgendwem irgendwas glaubt.

Wenn ich zurück bin, erkläre ich das. — M.`;

// ── Act-2 shared fixtures ────────────────────────────────────────────────────
// The CURRENT (tampered) nightly ticket export — seeded identically in L1 and
// L3 so the file the player first skimmed is byte-for-byte the one they later
// diff. Differences to M.s archived copy: 4713's comment was rewritten and
// ticket 4715 (Bjorgs [intern] question) is gone entirely.
const TICKETS_CSV_CURRENT =
  'id;titel;status;bearbeiter;kommentar\n' +
  '4711;Drucker Etage 2 druckt nicht;geschlossen;administrator;\n' +
  '4712;VPN-Zugang Dienstleister;geschlossen;administrator;\n' +
  '4713;BASTION-01 Inbetriebnahme;offen;administrator;wartet auf Freigabe Einkauf\n' +
  '4714;Zertifikat warm-portal erneuern;geschlossen;administrator;\n';

// M.s secured copy of the SAME export ("Vergleicht die Versionen") — the
// untampered original state.
const TICKETS_CSV_ARCHIV_M =
  'id;titel;status;bearbeiter;kommentar\n' +
  '4711;Drucker Etage 2 druckt nicht;geschlossen;administrator;\n' +
  '4712;VPN-Zugang Dienstleister;geschlossen;administrator;\n' +
  '4713;BASTION-01 Inbetriebnahme;offen;administrator;wartet auf Zuarbeit Bjorg (seit 2025-06)\n' +
  '4714;Zertifikat warm-portal erneuern;geschlossen;administrator;\n' +
  '4715;[intern] Zugangsdaten Dienstleister im Wiki?;offen;bjorg;von Bjorg an M. geschoben\n';

// The IIS W3C log carrying the OWA trace (L4 on EXCH01). L5 seeds the SAME
// bytes on the Analyse-VM — the export the Übergabeprotokoll documents.
// String.raw keeps the WARM\username backslashes literal.
const IIS_LOG_260722 = String.raw`#Software: Microsoft Internet Information Services 10.0
#Version: 1.0
#Date: 2026-07-22 00:00:00
#Fields: date time cs-method cs-uri-stem cs-username c-ip sc-status
2026-07-22 05:58:11 GET /ews/exchange.asmx WARM\svc-monitoring 10.0.10.9 200
2026-07-22 07:31:02 GET /owa/ WARM\jens 10.0.10.31 200
2026-07-22 08:14:47 POST /autodiscover/autodiscover.xml WARM\henry 10.0.10.32 200
2026-07-22 09:02:19 GET /owa/ WARM\bjorg 10.0.10.35 200
2026-07-22 12:39:51 POST /owa/auth.owa WARM\administrator 10.0.10.62 302
2026-07-22 12:40:12 GET /owa/k.mertens@warm.local/ WARM\administrator 10.0.10.62 200
2026-07-22 12:41:07 GET /owa/k.mertens@warm.local/ WARM\administrator 10.0.10.62 200
2026-07-22 12:44:38 GET /owa/k.mertens@warm.local/attachment.ashx WARM\administrator 10.0.10.62 200
2026-07-22 14:05:33 GET /ews/exchange.asmx WARM\svc-monitoring 10.0.10.9 200
`;

// Uneventful sibling logs so the 22.07. file is a FIND, not the only file.
const IIS_LOG_NOISE = (date: string) => String.raw`#Software: Microsoft Internet Information Services 10.0
#Fields: date time cs-method cs-uri-stem cs-username c-ip sc-status
${date} 06:00:03 GET /ews/exchange.asmx WARM\svc-monitoring 10.0.10.9 200
${date} 08:12:44 GET /owa/ WARM\jens 10.0.10.31 200
${date} 13:37:20 GET /owa/ WARM\henry 10.0.10.32 200
${date} 18:00:03 GET /ews/exchange.asmx WARM\svc-monitoring 10.0.10.9 200
`;

export const auditTrailStoryEvents: GameEvent[] = [
  {
    id: 'at_welcome',
    weekRange: [1, 1],
    probability: 1,
    category: 'story',
    title: 'Ein zusätzlicher Auftrag',
    description:
      'Erster Tag als Admin bei WARM — Abfallwirtschaft Rhein-Main. Bert, die IT-Leitung, fängt dich schon am Kaffeeautomaten ab. „Schön, dass Sie da sind. Der Betrieb läuft, so weit. Aber wir haben NIS-2 im Nacken, und die Prüffähigkeit ist ... sagen wir: ausbaufähig." Er druckst. „Ihr Vorgänger, Herr M., ist krankheitsbedingt raus. Niemand redet gern drüber."',
    image: undefined,
    involvedCharacters: ['bert', 'm'],
    choices: [
      {
        id: 'at_welcome_accept',
        text: 'Auftrag annehmen: „Ich stelle die Auditfähigkeit her — sauber und nachvollziehbar."',
        effects: { relationships: { chef: 3 } },
        resultText: 'Bert nickt erleichtert. „Genau das wollte ich hören. Melden Sie sich, wenn Sie etwas brauchen — schriftlich am besten."',
        setsFlags: ['audit_mandate_accepted'],
      },
      {
        id: 'at_welcome_scope',
        text: 'Nachfragen: „Welche Zugriffe habe ich — und wo hören sie auf?"',
        effects: { skills: { security: 1 } },
        resultText: 'Bert wird ernst. „Technisch kommen Sie an vieles ran. Aber Postfachinhalte anfassen Sie nur mit dokumentierter Freigabe und Zweckbindung. Das ist keine Formalie."',
        setsFlags: ['audit_mandate_accepted'],
      },
    ],
    tags: ['audit-trail', 'act1', 'onboarding'],
  },
  {
    id: 'at_team_intro',
    weekRange: [1, 1],
    probability: 1,
    category: 'team',
    title: 'Die Runde',
    description:
      'Im Büro sortiert Jens wortlos ein Kabelchaos und nickt dir zu. Henry zeigt aufs Rack: „Das graue Ding da oben? BASTION-01. Steht seit vierzehn Monaten. Frag Bjorg — der erzählt dir jedes Mal was anderes." Und Bjorg? Bjorg schiebt dir ein Ticket zu, in dem als interne Notiz steht: „[intern] Kann der Neue das übernehmen? Bin gleich in einem wichtigen Termin."',
    image: undefined,
    involvedCharacters: ['jens', 'henry', 'bjorg'],
    choices: [
      {
        id: 'at_team_intro_cool',
        text: 'Kühl und knapp: Ticket sachlich übernehmen, die Spitze ignorieren.',
        effects: { relationships: { kollegen: 1 } },
        resultText: 'Du schreibst zwei sachliche Sätze ins Ticket. Bjorg wirkt fast enttäuscht, dass es keinen Streit gibt.',
      },
    ],
    tags: ['audit-trail', 'act1', 'onboarding'],
  },

  // ── L1 [CLI Linux] „Der erste Arbeitstag" ─────────────────────────────────
  {
    id: 'at_l1_first_day',
    weekRange: [1, 2],
    probability: 1,
    category: 'story',
    title: 'Der erste Arbeitstag',
    description: `Deine Workstation ist eingerichtet — ein eigenes, persönliches Konto, darauf hat Jens bestanden. Er stellt dir einen Kaffee hin: „Bevor du irgendwas anfasst: Verschaff dir einen Überblick. M. hat vor seinem Ausfall noch Ticketexporte gezogen und irgendwo unter \`/srv\` abgelegt. Und er hat Notizen hinterlassen. Lies die zuerst."

**Deine Aufgabe:**
- Sieh dich in deinem Home-Verzeichnis um (\`ls\`, \`cat\`)
- Finde M.s Ticketexporte unter \`/srv\` (\`find\`)
- Lies seine Notizen`,
    image: undefined,
    involvedCharacters: ['jens', 'm'],
    mentorNote:
      'find durchsucht Verzeichnisbäume nach Namen oder Mustern: `find /srv -name "*.txt"`. Wer fremde Systeme übernimmt, sucht zuerst nach dem, was der Vorgänger hinterlassen hat.',
    choices: [
      {
        id: 'start',
        text: 'An der Workstation anmelden...',
        effects: {},
        resultText:
          'M.s Notizen lassen dich nicht los: Tickets werden hier „nachträglich aufgeräumt". Er hat angefangen, Stände wegzukopieren — kurz bevor er ausfiel. Du legst die Notiz zu deinen Unterlagen. Ab jetzt wird dokumentiert.',
        terminalCommand: true,
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'warm-adm-01',
      username: 'timo',
      currentPath: '/home/timo',
      taskText: 'Überblick verschaffen: M.s Ticketexporte unter /srv finden und seine Notizen lesen.',
      vfsOverlay: {
        directories: ['/srv/ticket-exports/2026'],
        files: [
          {
            path: '/home/timo/notiz-von-jens.txt',
            content:
              'Willkommen an Bord.\n\nDein Konto ist persönlich — bitte KEIN Sammelkonto benutzen,\negal was die anderen sagen.\n\nM.s Exporte liegen irgendwo unter /srv. `find` hilft dir beim Suchen.\nLies seine Notizen, bevor du irgendwas anfasst.\n\n— Jens',
          },
          {
            path: '/srv/ticket-exports/2026/tickets_2026-06.csv',
            content: TICKETS_CSV_CURRENT,
          },
          {
            path: '/srv/ticket-exports/notizen_m.txt',
            content: L1_NOTIZEN_M,
          },
        ],
      },
      commands: [],
      commandSkillGain: {
        find: { linux: 2 },
        cat: { linux: 1 },
      },
      solutions: [
        {
          // Core find via the SEMANTIC read record: the goal is met exactly
          // when a command actually read M.s Notizen — any tool (cat, less,
          // grep, awk, …), relative after cd or absolute. No command-line
          // regex, so no phrasing spoof (grep-pattern, redirect, pipeline
          // decoy) can fake the read and no legitimate read path is missed.
          commands: [],
          allRequired: false,
          stateGoals: [
            { fileRead: '/srv/ticket-exports/notizen_m.txt' },
          ],
          resultText:
            'Du hast M.s Notizen gefunden — und damit die erste Spur: Tickets werden hier nachträglich verändert, und M. hat Beweisstände gesichert, bevor er ausfiel.\n\nMerke: Der erste Schritt in fremder Infrastruktur ist nicht konfigurieren, sondern LESEN.',
          skillGain: { linux: 3 },
          effects: { stress: -2 },
        },
      ],
      hints: [
        '🤖 Jens: Fang bei dir an — in deinem Home liegt eine Notiz von mir. `ls` zeigt dir, was da ist.',
        '🤖 Jens: M.s Sachen liegen unter /srv. Mit find kannst du gezielt nach Dateien suchen, ohne jeden Ordner einzeln zu öffnen.',
        '🤖 Jens: `find /srv -name "*.txt"` listet alle Textdateien unterhalb von /srv — da ist auch seine Notizdatei dabei.',
        '🤖 Jens: `cat /srv/ticket-exports/notizen_m.txt` zeigt dir M.s Notizen.',
      ],
    },
    tags: ['audit-trail', 'act1', 'terminal'],
  },

  // ── L2 [CLI Linux] „Die Inventur" ─────────────────────────────────────────
  {
    id: 'at_l2_inventory',
    weekRange: [1, 2],
    probability: 1,
    category: 'story',
    title: 'Die Inventur',
    description: `Bert kommt mit einem Notizblock vorbei: „Der neue ISB wird als Erstes fragen, was wir überhaupt betreiben. Ich hätte gern eine erste Inventur — nichts Großes, aber schriftlich." Er tippt auf den Block. „Und zwar als Datei, nicht in Ihrem Kopf. Was wir nicht aufschreiben, existiert für ein Audit nicht."

**Deine Aufgabe (alle Schritte zählen):**
- Finde den Asset-Export unter \`/srv\` (\`find\`), prüfe seine Metadaten (\`stat\`) und lies ihn (\`cat\`)
- Sichte den Wiki-Export: Lies \`konten.md\` unter \`/srv/wiki-export\` — was ist überhaupt dokumentiert?
- Lege erst danach deine Inventur als \`/home/timo/inventar.md\` an — mindestens \`EXCH01\` und \`BASTION-01\` müssen drinstehen`,
    image: undefined,
    involvedCharacters: ['bert'],
    mentorNote:
      'Eine Inventur ist die Grundlage jeder Auditfähigkeit: Was betreiben wir, in welchem Zustand, seit wann? `stat` zeigt Metadaten einer Datei; mit `echo "…" >> datei` schreibst du deine Doku Zeile für Zeile.',
    choices: [
      {
        id: 'start',
        text: 'Inventur anlegen...',
        effects: {},
        resultText:
          'Die Inventur steht — schriftlich, mit Stand von heute. EXCH01 läuft, BASTION-01 steht seit Monaten unkonfiguriert im Rack. Bert nickt: „Genau so. Das ist ab jetzt unsere Referenz." Dir ist beim Sichten des Wiki-Exports allerdings noch etwas anderes aufgefallen …',
        terminalCommand: true,
        setsFlags: ['onboarding_documented'],
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'warm-adm-01',
      username: 'timo',
      currentPath: '/home/timo',
      taskText:
        'Asset-Export unter /srv finden und LESEN (cat; stat für die Metadaten); konten.md im Wiki-Export lesen; Inventur nach /home/timo/inventar.md schreiben (mindestens EXCH01 und BASTION-01).',
      vfsOverlay: {
        directories: ['/srv/assets', '/srv/wiki-export'],
        files: [
          {
            path: '/srv/assets/assets_2026-07.csv',
            content:
              'hostname;rolle;standort;aktualisiert\nDC01;Verzeichnisdienst;Serverraum;2026-06-30\nEXCH01;Mailserver (Exchange 2019, on-prem);Serverraum;2026-05-12\nFILE01;Dateiserver;Serverraum;2026-06-30\nBASTION-01;PAM-Appliance;Rack 3;2025-05-02\nwarm-adm-01;Admin-Workstation;IT-Raum;2026-07-01\n',
          },
          {
            path: '/srv/wiki-export/konten.md',
            content:
              '# Konten (Wiki-Export, Stand Juni)\n\n## Dienstkonten\n- backup_svc: siehe Passwortsafe\n- monitoring: siehe Passwortsafe\n\n## Sammelkonto "administrator"\nPasswort: Herbst2019!\nZuletzt geändert: 2019. Kennen eh alle.\n(Steht hier, weil es sonst wieder keiner weiß. NICHT LÖSCHEN!!)\n',
          },
          {
            path: '/srv/wiki-export/bastion.md',
            content:
              '# BASTION-01 (PAM)\n\nGeliefert: Mai 2025. Steht in Rack 3.\nInbetriebnahme: "in Planung" (Bjorg)\nLetzte Aktualisierung dieser Seite: vor 14 Monaten.\n',
          },
        ],
      },
      commands: [],
      commandSkillGain: {
        find: { linux: 1 },
        stat: { linux: 1, troubleshooting: 1 },
        echo: { linux: 1 },
      },
      solutions: [
        {
          // The written file alone is NOT enough — the inventory must be based
          // on actually READING the sources (semantic fileRead record; stat is
          // taught for the metadata but seeing the content is the inspection).
          // That keeps the follow-up dialog ("beim Sichten des Wikis
          // aufgefallen …") narratively true.
          commands: [],
          allRequired: false,
          stateGoals: [
            { file: '/home/timo/inventar.md', matches: 'EXCH01' },
            { file: '/home/timo/inventar.md', matches: 'BASTION-01' },
            { fileRead: '/srv/assets/assets_2026-07.csv' },
            { fileRead: '/srv/wiki-export/konten.md' },
          ],
          resultText:
            'Deine Inventur steht als Datei — mit EXCH01 und BASTION-01 drin. Das ist der Unterschied zwischen „weiß ich doch" und „kann ich belegen": Ab heute gibt es einen dokumentierten Stand, gegen den jede Veränderung sichtbar wird.',
          skillGain: { linux: 3, troubleshooting: 2 },
          effects: { stress: -2 },
        },
      ],
      hints: [
        '🤖 Jens: Erst gucken, dann schreiben — der Asset-Export liegt unter /srv. Mit find findest du CSV-Dateien.',
        '🤖 Jens: `stat /srv/assets/assets_2026-07.csv` zeigt dir Größe, Besitzer und Zeitstempel — und dann lies beides: die CSV selbst und /srv/wiki-export/konten.md (`cat` reicht).',
        '🤖 Jens: Deine Doku ist eine ganz normale Datei: `echo "Zeile" >> /home/timo/inventar.md` hängt jeweils eine Zeile an.',
        '🤖 Jens: Zum Beispiel: `echo "EXCH01 - Mailserver" >> /home/timo/inventar.md` und danach so eine Zeile für BASTION-01. Beide Namen müssen in der Datei stehen.',
      ],
    },
    tags: ['audit-trail', 'act1', 'terminal'],
  },

  // ── Dialog: der Wiki-Passwort-Fund ────────────────────────────────────────
  {
    id: 'at_wiki_password',
    weekRange: [1, 2],
    probability: 1,
    category: 'story',
    title: 'Das Passwort im Wiki',
    description:
      'Was dir beim Sichten des Wiki-Exports aufgefallen ist: Das Passwort des Sammelkontos `administrator` steht im Klartext im Wiki. Zuletzt geändert 2019, Kommentar: „Kennen eh alle." Genau mit diesem Konto wurden laut Export zuletzt fast alle Tickets bearbeitet — jeder arbeitet damit, also ist niemand zurechenbar. Du sitzt vor deiner frischen Inventur und überlegst, was du mit dem Fund machst.',
    image: undefined,
    involvedCharacters: ['bert'],
    choices: [
      {
        id: 'at_wiki_password_document',
        text: 'Als Finding dokumentieren: Konto, Fundort, Risiko — ohne das Passwort selbst zu kopieren.',
        effects: { skills: { security: 2 } },
        resultText:
          'Du ergänzt die Inventur um ein sauberes Finding: Sammelkonto `administrator`, Passwort im Klartext im Wiki, keine Zurechenbarkeit einzelner Personen. Das Passwort selbst schreibst du bewusst NICHT ab — eine Doku, die Geheimnisse vervielfältigt, ist selbst ein Risiko.',
        setsFlags: ['shared_account_documented'],
      },
      {
        id: 'at_wiki_password_ignore',
        text: 'Liegen lassen: Du bist neu, und das Konto benutzen alle — das Thema ist politisch.',
        effects: { stress: -2 },
        resultText:
          'Du klappst den Wiki-Export zu. Niemand wird dir vorwerfen, in Woche eins keinen Konflikt angefangen zu haben. Aber die Frage, WER eigentlich `administrator` ist, bleibt unbeantwortet im Raum stehen.',
      },
      {
        id: 'at_wiki_password_change',
        text: 'Sofort das Passwort ändern — Klartext im Wiki geht gar nicht.',
        effects: { stress: 5, relationships: { kollegen: -2 } },
        resultText:
          'Zwanzig Minuten später steht Henry in der Tür: „Sag mal — Backup-Skript und Monitoring laufen beide über das Konto. Beides rot." Du drehst die Änderung zurück. Lektion: Erst dokumentieren, welche Prozesse an einem Konto hängen — dann ändern. Sonst wird aus dem Befund ein Ausfall.',
      },
    ],
    tags: ['audit-trail', 'act1', 'onboarding'],
  },

  // ═══════════════════════════════ ACT 2 — Die Spur ═══════════════════════════

  // ── L3 [CLI Linux] „Der editierte Ticket-Export" ──────────────────────────
  {
    id: 'at_l3_ticket_diff',
    weekRange: [1, 4],
    probability: 1,
    category: 'story',
    title: 'Der editierte Ticket-Export',
    description: `Jens deutet auf M.s Notiz an deinem Monitor. „‚Vergleicht die Versionen' — das hat er ernst gemeint. Sein Archiv liegt unter \`/srv/ticket-exports/archiv\`. Der aktuelle Export kommt jede Nacht frisch aus dem Ticketsystem." Er zögert kurz. „Wenn die beiden auseinanderlaufen, will ich es schriftlich. Mit Ticketnummern."

**Deine Aufgabe:**
- Vergleiche M.s gesicherten Stand mit dem aktuellen Export (\`diff\`)
- Dokumentiere jede Abweichung mit Ticketnummer in \`/home/timo/befund_tickets.md\``,
    image: undefined,
    involvedCharacters: ['jens', 'bjorg', 'm'],
    mentorNote:
      'diff ALT NEU vergleicht zwei Dateien zeilenweise: < ist der linke (alte) Stand, > der rechte (neue). Exit-Code 1 heißt: Es GIBT Unterschiede — im Audit ist das ein Befund, kein Fehler.',
    choices: [
      {
        id: 'start',
        text: 'Versionen vergleichen...',
        effects: {},
        resultText:
          'Zwei Abweichungen, beide dokumentiert: Bei 4713 wurde aus „wartet auf Zuarbeit Bjorg (seit 2025-06)" nachträglich „wartet auf Freigabe Einkauf". Und Ticket 4715 — Bjorgs interne Frage nach den Zugangsdaten im Wiki — ist im aktuellen Export schlicht verschwunden. M. hatte recht: Wer den Export kuratiert, kuratiert die Geschichte.',
        terminalCommand: true,
        setsFlags: ['ticket_tamper_documented'],
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'warm-adm-01',
      username: 'timo',
      currentPath: '/home/timo',
      taskText:
        'M.s Archivstand mit dem aktuellen Ticket-Export vergleichen (diff); jede Abweichung mit Ticketnummer nach /home/timo/befund_tickets.md dokumentieren.',
      vfsOverlay: {
        directories: ['/srv/ticket-exports/archiv', '/srv/ticket-exports/2026'],
        files: [
          { path: '/srv/ticket-exports/2026/tickets_2026-06.csv', content: TICKETS_CSV_CURRENT },
          { path: '/srv/ticket-exports/archiv/tickets_2026-06_stand_m.csv', content: TICKETS_CSV_ARCHIV_M },
          { path: '/srv/ticket-exports/notizen_m.txt', content: L1_NOTIZEN_M },
        ],
      },
      commands: [],
      commandSkillGain: {
        diff: { linux: 2, troubleshooting: 2 },
      },
      solutions: [
        {
          // Both versions must actually have been READ (diff does exactly that
          // in one step), and the Befund must name both ticket ids.
          commands: [],
          allRequired: false,
          stateGoals: [
            { fileRead: '/srv/ticket-exports/archiv/tickets_2026-06_stand_m.csv' },
            { fileRead: '/srv/ticket-exports/2026/tickets_2026-06.csv' },
            { file: '/home/timo/befund_tickets.md', matches: '4713' },
            { file: '/home/timo/befund_tickets.md', matches: '4715' },
          ],
          resultText:
            'Befund steht: 4713 umgeschrieben, 4715 gelöscht — belegt gegen M.s gesicherten Stand. Merke: Ein Export ist kein Beweis. Zwei unabhängige Stände plus Differenz — DAS ist einer.',
          skillGain: { linux: 3, security: 2, troubleshooting: 2 },
          effects: { stress: -2 },
        },
      ],
      hints: [
        '🤖 Jens: Zwei Stände, eine Wahrheit — sieh nach, was unter /srv/ticket-exports liegt. Auch im Archiv.',
        '🤖 Jens: diff vergleicht zwei Dateien Zeile für Zeile. Reihenfolge: erst der alte Stand, dann der neue.',
        '🤖 Jens: `diff /srv/ticket-exports/archiv/tickets_2026-06_stand_m.csv /srv/ticket-exports/2026/tickets_2026-06.csv` — und beide Ticketnummern in den Befund.',
        '🤖 Jens: Befund anhängen: `echo "4713: Kommentar nachträglich geändert" >> /home/timo/befund_tickets.md` — und dieselbe Form für 4715.',
      ],
    },
    tags: ['audit-trail', 'act2', 'terminal'],
  },

  // ── L4 [CLI PowerShell, EXCH01] „Die Spur im IIS-Log" ─────────────────────
  {
    id: 'at_l4_iis_log',
    weekRange: [1, 4],
    probability: 1,
    category: 'story',
    title: 'Die Spur im IIS-Log',
    description: `Der Ticket-Befund zeigt auf ein größeres Loch: Wer war eigentlich in M.s Postfach? Exchange 2019, on-prem — OWA-Zugriffe stehen in den IIS-Logs auf EXCH01. Henry gibt dir den Zugang: „W3C-Logs, ein File pro Tag. Sieh in die Logs. Und fass nichts an, was nach Inhalt aussieht — Logs ja, Postfach nein."

**Deine Aufgabe:**
- Wechsle ins IIS-Logverzeichnis \`C:\\inetpub\\logs\\LogFiles\\W3SVC1\` und sieh dich um (\`Get-ChildItem\`)
- Durchsuche das Log vom 22.07. nach OWA-Zugriffen: \`Select-String\` mit **explizitem Dateinamen** (Wildcards expandiert \`-Path\` nicht)
- Beginne das Export-Protokoll: \`C:\\Users\\timo\\protokoll_export.txt\` — Quelle und Log-Dateiname müssen drinstehen`,
    image: undefined,
    involvedCharacters: ['henry', 'm'],
    mentorNote:
      'IIS schreibt W3C-Logs pro Tag (u_exJJMMTT.log). Select-String ist das grep der PowerShell — aber -Path will echte Dateinamen. Und: Zugriffs-LOGS auswerten ist etwas grundsätzlich anderes, als Postfach-INHALTE zu lesen. Für Ersteres hast du einen Auftrag. Für Letzteres nicht.',
    choices: [
      {
        id: 'start',
        text: 'Am EXCH01 anmelden...',
        effects: {},
        resultText:
          'Da ist die Spur: 22.07., 12:40 bis 12:44 Uhr — OWA-Zugriff auf das Postfach von Herrn Mertens, angemeldet als „administrator". Das Konto, dessen Passwort im Wiki steht. Also jeder. Also niemand. Der Log-Name steht im Export-Protokoll — vertieft ausgewertet wird mit Mandat, nicht aus Neugier.',
        terminalCommand: true,
      },
    ],
    terminalContext: {
      type: 'windows',
      hostname: 'EXCH01',
      username: 'timo',
      currentPath: 'C:\\Users\\timo',
      taskText:
        'IIS-Logverzeichnis sichten (Get-ChildItem); u_ex260722.log mit Select-String nach OWA-Zugriffen durchsuchen; Export-Protokoll C:\\Users\\timo\\protokoll_export.txt mit dem Log-Dateinamen beginnen. Postfach-Inhalte sind tabu.',
      vfsOverlay: {
        directories: ['C:\\inetpub\\logs\\LogFiles\\W3SVC1'],
        files: [
          { path: 'C:\\inetpub\\logs\\LogFiles\\W3SVC1\\u_ex260720.log', content: IIS_LOG_NOISE('2026-07-20') },
          { path: 'C:\\inetpub\\logs\\LogFiles\\W3SVC1\\u_ex260721.log', content: IIS_LOG_NOISE('2026-07-21') },
          { path: 'C:\\inetpub\\logs\\LogFiles\\W3SVC1\\u_ex260722.log', content: IIS_LOG_260722 },
          {
            path: 'C:\\inetpub\\logs\\LogFiles\\W3SVC1\\k_mertens_export.pst',
            content: '!BDN\nPST Unicode Container (Outlook-Datendatei)\n[im Terminal nicht lesbar]\n',
          },
        ],
      },
      commands: [
        {
          // HONEYPOT (Design §7.4): opening M.s PST export sets the negative
          // flag IMMEDIATELY on match — on EVERY PowerShell read path
          // (Get-Content/gc/cat/type, Select-String/sls, incl. pipeline stages
          // and relative/absolute path variants), without solving or ending
          // the level. Idempotent via useGame.setRunFlags; survives ESC.
          // NOTE: the pattern string doubles as the auto-seed source — keep it
          // ABSOLUTE so no phantom PST is seeded into the player's home dir.
          pattern: 'Get-Content C:\\inetpub\\logs\\LogFiles\\W3SVC1\\k_mertens_export.pst',
          patternRegex:
            '(^|\\|)\\s*(Get-Content|gc|cat|type|Select-String|sls)\\b[^|]*k_mertens_export\\.pst',
          output:
            '!BDN ... \u2588\u2588\u2588 [Bin\u00e4rdaten] ...\n' +
            'Betreff: Re: Krankmeldung \u2014 vertraulich\n' +
            'Betreff: Personalgespr\u00e4ch 08.07. \u2014 Protokoll\n' +
            'Betreff: Re: BASTION-01 \u2014 deine Einsch\u00e4tzung\n\n' +
            '# Das sind POSTFACH-INHALTE von Herrn Mertens. Daf\u00fcr gibt es kein Mandat,\n' +
            '# keine Freigabe und keinen dokumentierten Zweck. Jede weitere Zeile macht\n' +
            '# aus deiner Auswertung selbst einen Datenschutzvorfall.',
          setsFlags: ['mailbox_scope_exceeded'],
        },
      ],
      commandSkillGain: {
        'Get-ChildItem': { windows: 1 },
        'Select-String': { windows: 2, security: 1 },
        'Set-Content': { windows: 1 },
      },
      solutions: [
        {
          // The trace log must really have been read (Select-String or any
          // read path — semantic fileRead), and the Export-Protokoll must name
          // the log file. The honeypot never contributes to the win.
          commands: [],
          allRequired: false,
          stateGoals: [
            { fileRead: 'C:\\inetpub\\logs\\LogFiles\\W3SVC1\\u_ex260722.log' },
            { file: 'C:\\Users\\timo\\protokoll_export.txt', matches: 'u_ex260722' },
          ],
          resultText:
            'Gefunden und protokolliert: OWA-Zugriff auf das Postfach k.mertens, 12:40–12:44, Konto „administrator". Die Erkenntnis des Tages: Das Log beantwortet WAS und WANN — aber nicht WER. Genau das ist das strukturelle Finding.',
          skillGain: { windows: 4, security: 3 },
          effects: { stress: -2 },
        },
      ],
      hints: [
        '🤖 Henry: IIS legt seine Logs unter C:\\inetpub\\logs ab. Erst hinwechseln, dann umsehen.',
        '🤖 Henry: Get-ChildItem zeigt dir, was im Logverzeichnis liegt — das Datum steckt im Dateinamen (u_exJJMMTT.log). Und die .pst dort? Finger weg, das ist Inhalt.',
        '🤖 Henry: `Select-String -Path u_ex260722.log -Pattern owa` — mit GENAU diesem Dateinamen. Wildcards versteht -Path nicht.',
        '🤖 Henry: Protokoll beginnen: `Set-Content C:\\Users\\timo\\protokoll_export.txt "Quelle: EXCH01 u_ex260722.log"` — der Log-Dateiname muss drinstehen.',
      ],
    },
    tags: ['audit-trail', 'act2', 'terminal'],
  },

  // ── Dialog: die Freigabe (Zweckbindung) ───────────────────────────────────
  {
    id: 'at_authorization',
    weekRange: [1, 4],
    probability: 1,
    category: 'story',
    title: 'Das Mandat',
    description:
      'Vor dir liegt die Spur — und eine Grenze. Ab hier heißt Auswerten: Zugriffe auf ein personenbezogenes Postfach systematisch nachvollziehen. Bert ist die Freigabestelle. Die Frage ist nicht, OB du weitermachst. Die Frage ist, mit welchem Mandat.',
    image: undefined,
    involvedCharacters: ['bert'],
    choices: [
      {
        id: 'at_authorization_written',
        text: 'Bert um schriftliche Freigabe bitten: Zweck, Umfang (nur Zugriffs-Logs), Frist.',
        effects: { skills: { security: 2, softSkills: 1 } },
        resultText:
          'Bert liest deinen Entwurf, nickt und formuliert mit: „Auswertung der OWA-Zugriffs-Logs zum Vorfall Postfach M. Keine Inhalte. Frist: 14 Tage." Die Mail mit seiner Freigabe liegt zwei Minuten später in deinem Postfach. „Danke, dass Sie gefragt haben. Schriftlich kann ich Sie decken."',
        setsFlags: ['authorization_documented'],
      },
      {
        id: 'at_authorization_verbal',
        text: 'Mündlich reicht — Bert hat doch längst genickt.',
        effects: { stress: -2 },
        resultText:
          '„Machen Sie", sagt Bert zwischen zwei Terminen. Was genau er freigegeben hat — Umfang, Zweck, Frist? Steht nirgends. Wenn es politisch wird, ist das sein vages Nicken gegen Bjorgs sehr konkrete Erzählung.',
      },
      {
        id: 'at_authorization_none',
        text: 'Gar nicht fragen — je weniger Leute Bescheid wissen, desto besser.',
        effects: { stress: 3 },
        resultText:
          'Du gräbst allein weiter. Jede Minute Auswertung ohne Mandat verschiebt die Frage, die später jemand stellen wird: nicht „Was hast du gefunden?", sondern „Wer hat dir das erlaubt?"',
      },
    ],
    tags: ['audit-trail', 'act2'],
  },

  // ── Mail: das Finding melden ──────────────────────────────────────────────
  {
    id: 'at_finding_mail',
    weekRange: [1, 4],
    probability: 1,
    category: 'story',
    title: 'Die Meldung',
    description:
      'Die Mandatsfrage ist entschieden — jetzt die Meldung. Du setzt eine Mail auf: sachlich, belegbar, ohne einen einzigen Postfach-Inhalt. Die eigentliche Entscheidung steht im Empfängerfeld.',
    image: undefined,
    involvedCharacters: ['bert'],
    mailCompose: {
      from: 'timo@warm.local',
      to: 'bert@warm.local',
      subject: 'Finding: OWA-Zugriff auf Postfach M. via Sammelkonto administrator',
      body:
        'Beim Review der IIS-Logs (EXCH01, u_ex260722.log) dokumentiert: 22.07., 12:40–12:44 Uhr, OWA-Zugriff auf das Postfach von Herrn M., angemeldet als „administrator". Zugriffs-Log gesichert, Export protokolliert. Keine Postfachinhalte eingesehen.\n\nVorschlag: (1) Sammelkonto als strukturelles Finding behandeln, (2) Mailbox-Auditing aktivieren.',
    },
    choices: [
      {
        id: 'at_finding_mail_bert',
        text: 'Senden — an Bert.',
        effects: { skills: { softSkills: 2 } },
        resultText:
          'Meldung raus — dokumentiert, mit Zeitstempel. Bert antwortet nach vier Minuten: „Sauber. Auditing aktivieren, Beweiskette schließen. Und danke für: keine Inhalte."',
        setsFlags: ['finding_reported'],
      },
      {
        id: 'at_finding_mail_broad',
        text: 'Verteiler auf: GF, alle Bereichsleitungen, Personalrat in CC — volle Transparenz.',
        effects: { relationships: { kollegen: -2 } },
        resultText:
          'Zwölf Empfänger wissen jetzt, dass jemand im Postfach von Herrn M. war — und das Haus redet ab sofort über M., nicht über das Sammelkonto. Du hast einen Personenbezug in die Breite geteilt, den niemand dort brauchte. Das wird dir wieder begegnen.',
        setsFlags: ['finding_reported', 'personal_data_shared_broadly'],
      },
      {
        id: 'at_finding_mail_wait',
        text: 'Noch nicht senden — erst die Beweiskette fertigstellen.',
        effects: { stress: 2 },
        resultText:
          'Verständlich — und riskant. Eine Meldung, die wartet, sieht im Nachhinein aus wie eine Meldung, die vermieden wurde.',
      },
    ],
    tags: ['audit-trail', 'act2'],
  },

  // ── L5 [CLI Linux, Analyse-VM] „Die Beweiskette" ──────────────────────────
  {
    id: 'at_l5_evidence_chain',
    weekRange: [1, 4],
    probability: 1,
    category: 'story',
    title: 'Die Beweiskette',
    description: `Der Log-Export liegt auf der Analyse-VM, daneben das angefangene Export-Protokoll. Bevor hier irgendjemand irgendetwas analysiert, gilt die alte Regel: erst konservieren, dann interpretieren.

**Deine Aufgabe:**
- Lege \`/home/timo/beweis\` an und sichere den Log dorthin (\`cp\`)
- Halte den Fingerabdruck fest: \`sha256sum\` → \`/home/timo/beweis/hashes.txt\`
- Notiere die Zeitachse in \`/home/timo/beweis/timeline.md\` (Datum und Zeitfenster des Zugriffs)
- Schließe das Export-Protokoll in \`/home/timo/eingang\` ab — mit einer Zeile, die mit \`Erledigt:\` beginnt`,
    image: undefined,
    involvedCharacters: ['jens'],
    mentorNote:
      'Beweissicherung heißt: Das Original bleibt unangetastet, die Kopie wird gehasht, der Weg wird protokolliert. Der SHA-256-Hash macht jede spätere Veränderung sichtbar — und die Zeitachse macht aus Logzeilen einen nachvollziehbaren Vorgang.',
    choices: [
      {
        id: 'start',
        text: 'Beweise sichern...',
        effects: {},
        resultText:
          'Kette geschlossen: Original im Eingang, Kopie im Beweisordner, Hash in der Liste, Zeitachse notiert, Protokoll abgeschlossen. Wenn später jemand fragt, woher du weißt, was du weißt — du zeigst es einfach.',
        terminalCommand: true,
        setsFlags: ['evidence_hashed', 'export_documented'],
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'analyse-vm',
      username: 'timo',
      currentPath: '/home/timo',
      taskText:
        'Log nach /home/timo/beweis sichern (cp), SHA-256 in hashes.txt festhalten, Zeitachse in timeline.md notieren, Export-Protokoll mit "Erledigt:"-Zeile abschließen.',
      vfsOverlay: {
        directories: ['/home/timo/eingang'],
        files: [
          { path: '/home/timo/eingang/u_ex260722.log', content: IIS_LOG_260722 },
          {
            path: '/home/timo/eingang/protokoll_export.txt',
            content:
              'Export-Protokoll Zugriffs-Log EXCH01\nQuelle: C:\\inetpub\\logs\\LogFiles\\W3SVC1\\u_ex260722.log\nKopiert am: 2026-07-23, Konto: timo\nZweck: Auswertung OWA-Zugriff Postfach k.mertens\nOffen: Kopie sichern, SHA-256 festhalten, Zeitachse\n',
          },
        ],
      },
      commands: [],
      commandSkillGain: {
        cp: { linux: 1 },
        sha256sum: { linux: 2, security: 2 },
        mkdir: { linux: 1 },
      },
      solutions: [
        {
          commands: [],
          allRequired: false,
          // A chain of custody must be REAL, not merely well-formatted: the
          // copy must be byte-equal to the original AND have been made by cp
          // FROM the original TO the evidence dir (operand-bound fileCopied);
          // the hash list must contain the digest ACTUALLY computed FOR the
          // copy (sha256Of + operand-bound hashComputed — hashing the original
          // instead of the copy does not count). A fully invented set of
          // files, a cat-made copy, or borrowing an unrelated cp/sha256sum
          // invocation satisfies none of it.
          stateGoals: [
            {
              file: '/home/timo/beweis/u_ex260722.log',
              sameContentAs: '/home/timo/eingang/u_ex260722.log',
            },
            {
              fileCopied: {
                from: '/home/timo/eingang/u_ex260722.log',
                to: '/home/timo/beweis/u_ex260722.log',
              },
            },
            { file: '/home/timo/beweis/hashes.txt', sha256Of: '/home/timo/beweis/u_ex260722.log' },
            { hashComputed: '/home/timo/beweis/u_ex260722.log' },
            { file: '/home/timo/beweis/timeline.md', matches: '2026-07-22.*12:4' },
            // 'Erledigt:' is deliberately absent from the seeded Protokoll, so
            // only the player's closing line satisfies this.
            { file: '/home/timo/eingang/protokoll_export.txt', matches: '^Erledigt:' },
          ],
          resultText:
            'Original gesichert, Hash dokumentiert, Zeitachse steht, Protokoll geschlossen. Ab jetzt ist jede Behauptung zu diesem Vorfall überprüfbar — deine eigenen eingeschlossen. Genau so sieht belastbar aus.',
          skillGain: { linux: 3, security: 3 },
          effects: { stress: -2 },
        },
      ],
      hints: [
        '🤖 Jens: Erst sichern, dann anfassen. Sieh nach, was in /home/timo/eingang angekommen ist.',
        '🤖 Jens: mkdir legt den Beweisordner an, cp kopiert den Log dorthin — das Original im Eingang bleibt unangetastet.',
        '🤖 Jens: `sha256sum /home/timo/beweis/u_ex260722.log > /home/timo/beweis/hashes.txt` hält den Fingerabdruck fest.',
        '🤖 Jens: Zeitachse: `echo "2026-07-22 12:40-12:44 OWA-Zugriff Postfach k.mertens als administrator" >> /home/timo/beweis/timeline.md` — und ans Protokoll eine Zeile anhängen, die mit "Erledigt:" beginnt.',
      ],
    },
    tags: ['audit-trail', 'act2', 'terminal'],
  },

  // ── L6 [CLI PowerShell, EXCH01] „Ab jetzt wird geloggt" ───────────────────
  {
    id: 'at_l6_enable_auditing',
    weekRange: [1, 4],
    probability: 1,
    category: 'story',
    title: 'Ab jetzt wird geloggt',
    description: `Die Lücke, die den ganzen Vorfall trug: Auf M.s Postfach war kein Mailbox-Auditing aktiv. Exchange Server 2019, on-prem — hier wird Auditing **pro Postfach** eingeschaltet. Kein Dienstneustart, kein Wartungsfenster. Ein Attribut.

**Deine Aufgabe:**
- Prüfe den Ist-Zustand von M.s Postfach (\`Get-Mailbox\`)
- Aktiviere das Mailbox-Auditing für \`k.mertens\` (\`Set-Mailbox\`)
- Kein Dienstneustart — der gehört nicht zum Verfahren`,
    image: undefined,
    involvedCharacters: ['henry', 'm'],
    mentorNote:
      'On-prem (Exchange Server 2019) wird Mailbox-Auditing pro Postfach über Set-Mailbox -AuditEnabled gesteuert. In Exchange Online ist es standardmäßig aktiv und wird organisationsweit über AuditDisabled geschaltet. Ein Dienstneustart gehört in KEINEM der beiden Fälle zum Verfahren.',
    choices: [
      {
        id: 'start',
        text: 'Auditing aktivieren...',
        effects: {},
        resultText:
          'AuditEnabled: True. Ab jetzt schreibt Exchange mit, welche Aktion in diesem Postfach ausgeführt wird — auch über das Sammelkonto. Wichtig fürs Protokoll: Das Auditing macht Zugriffe dokumentierbar. Individuell zurechenbar macht es das Sammelkonto NICHT — das bleibt das strukturelle Finding.',
        terminalCommand: true,
        setsFlags: ['mailbox_auditing_enabled'],
      },
    ],
    terminalContext: {
      type: 'windows',
      hostname: 'EXCH01',
      username: 'timo',
      currentPath: 'C:\\Users\\timo',
      taskText:
        'Ist-Zustand von k.mertens prüfen (Get-Mailbox), dann Mailbox-Auditing aktivieren (Set-Mailbox). Kein Dienstneustart.',
      mailboxes: [
        { name: 'k.mertens', displayName: 'Mertens, K.', auditEnabled: false },
        { name: 'poststelle', displayName: 'Poststelle WARM', auditEnabled: false },
        { name: 'einkauf', displayName: 'Einkauf WARM', auditEnabled: true },
      ],
      commands: [],
      commandSkillGain: {
        'Get-Mailbox': { windows: 1, security: 1 },
        'Set-Mailbox': { windows: 2, security: 1 },
      },
      solutions: [
        {
          commands: [],
          allRequired: false,
          // Live mailbox attribute on EXCH01 — only a REAL, correctly typed
          // Set-Mailbox flips it (typos like $ture fail with exit 1, no
          // mutation — guarded by the cmdlet's strict bool validation).
          // "Erst prüfen, dann ändern" is mechanical AND operand-bound:
          // Get-Mailbox must have actually RESOLVED k.mertens (the record
          // stores the resolved identity, so 'Get-Mailbox poststelle
          // k.mertens' — where the cmdlet ignores the second argument — never
          // counts; checking again after the change also satisfies it).
          stateGoals: [
            { mailbox: 'k.mertens', auditEnabled: true },
            { mailboxInspected: 'k.mertens' },
          ],
          resultText:
            'Mailbox-Auditing für k.mertens ist aktiv — ohne Neustart, ohne Wartungsfenster, wirksam ab sofort.\n\nLernnotiz: On-prem gilt Set-Mailbox -AuditEnabled $true pro Postfach; in Exchange Online ist Auditing standardmäßig an (organisationsweit via AuditDisabled). Referenzen: learn.microsoft.com/en-us/purview/audit-mailboxes und learn.microsoft.com/en-us/exchange/policy-and-compliance/mailbox-audit-logging/enable-or-disable?view=exchserver-2019',
          skillGain: { windows: 4, security: 4 },
          effects: { stress: -2, compliance: 5 },
        },
      ],
      hints: [
        '🤖 Henry: Erst prüfen, dann ändern — sieh dir M.s Postfach an, bevor du etwas umstellst.',
        '🤖 Henry: Get-Mailbox k.mertens zeigt dir den Eigenschaftsblock — da steht auch der Audit-Status.',
        '🤖 Henry: Set-Mailbox ändert Postfach-Attribute. Der Schalter heißt -AuditEnabled und erwartet einen PowerShell-Boolean.',
        '🤖 Henry: `Set-Mailbox k.mertens -AuditEnabled $true` — und danach mit Get-Mailbox gegenprüfen.',
      ],
    },
    tags: ['audit-trail', 'act2', 'terminal'],
  },
];
