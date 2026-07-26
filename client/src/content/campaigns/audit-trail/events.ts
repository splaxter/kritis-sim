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
// exactly when the cwd makes it valid). The win is a `commandRan` stateGoal on
// a successful read.
const L1_NOTIZEN_M = `Falls das jemand liest: Die Exporte sind Stand Juni, Rest siehe Wiki.
Wichtig: Tickets werden hier gern nachträglich "aufgeräumt".
Ich habe angefangen, mir Stände wegzukopieren. Vergleicht die Versionen,
bevor ihr irgendwem irgendwas glaubt.

Wenn ich zurück bin, erkläre ich das. — M.`;

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
            content:
              'id;titel;status;bearbeiter\n4711;Drucker Etage 2 druckt nicht;geschlossen;administrator\n4712;VPN-Zugang Dienstleister;geschlossen;administrator\n4713;BASTION-01 Inbetriebnahme;offen;administrator\n4714;Zertifikat warm-portal erneuern;geschlossen;administrator\n',
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
          // Core find via the REAL shell: any successful read of M.s Notizen
          // wins — cat/tac/less/head/tail/nl/grep, absolute path or relative
          // after a matching cd. A read from the wrong directory exits non-zero
          // and does not count (genuine path semantics, no canned shortcut).
          // `[^>]*` keeps a redirect spoof (`cat andere.txt > notizen_m.txt`)
          // from matching — the target must be an ARGUMENT, not a redirect.
          commands: [],
          allRequired: false,
          stateGoals: [
            {
              commandRan: {
                pattern: '^(cat|tac|less|head|tail|nl|grep)\\b[^>]*notizen_m\\.txt',
                outcome: 'succeeded',
              },
            },
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
- Finde den Asset-Export unter \`/srv\` (\`find\`) und sieh ihn dir wirklich an (\`stat\` oder \`cat\`)
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
        'Asset-Export unter /srv finden und prüfen (stat/cat); konten.md im Wiki-Export lesen; Inventur nach /home/timo/inventar.md schreiben (mindestens EXCH01 und BASTION-01).',
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
          // on actually inspecting the sources. Both inspections run through
          // the real shell (commandRan, outcome succeeded), so only valid
          // paths count and the follow-up dialog ("beim Sichten des Wikis
          // aufgefallen …") is narratively true.
          commands: [],
          allRequired: false,
          stateGoals: [
            { file: '/home/timo/inventar.md', matches: 'EXCH01' },
            { file: '/home/timo/inventar.md', matches: 'BASTION-01' },
            {
              commandRan: {
                pattern: '^(stat|cat|tac|less|head|tail|nl|wc|grep)\\b[^>]*assets_2026-07\\.csv',
                outcome: 'succeeded',
              },
            },
            {
              commandRan: {
                pattern: '^(cat|tac|less|head|tail|nl|grep)\\b[^>]*konten\\.md',
                outcome: 'succeeded',
              },
            },
          ],
          resultText:
            'Deine Inventur steht als Datei — mit EXCH01 und BASTION-01 drin. Das ist der Unterschied zwischen „weiß ich doch" und „kann ich belegen": Ab heute gibt es einen dokumentierten Stand, gegen den jede Veränderung sichtbar wird.',
          skillGain: { linux: 3, troubleshooting: 2 },
          effects: { stress: -2 },
        },
      ],
      hints: [
        '🤖 Jens: Erst gucken, dann schreiben — der Asset-Export liegt unter /srv. Mit find findest du CSV-Dateien.',
        '🤖 Jens: `stat /srv/assets/assets_2026-07.csv` zeigt dir Größe, Besitzer und Zeitstempel. Und lies /srv/wiki-export/konten.md — `cat` reicht.',
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
];
