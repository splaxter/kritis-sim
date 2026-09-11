/**
 * DAS KATASTER — story events.
 *
 * Authoring rules for this campaign (design §6):
 *  - Every level has BOTH halves. Learning = one source of obligations, one new
 *    tool, one sentence that sticks (mentorNote). Doing = an ARTEFACT verified
 *    by stateGoals (CLI) or interaction tokens (GUI). No level ends with "read".
 *  - Only current law is cited: § 39 (Nachweise), § 32 (Meldepflichten),
 *    §§ 30/31 (Risikomanagement). Never § 8a/§ 8b.
 *  - Paths stay free of ASCII-transliterated umlauts (orthography guard scans
 *    `path:` lines too) — der Ordnername ist deshalb `vertragsakten`.
 */
import { GameEvent } from '@kritis/shared';

// ── Akt 1, L1: Kalbs Ordner ──────────────────────────────────────────────────

const SLA_KOMM_ONE = `RAHMENVERTRAG Rechenzentrumsleistungen
Komm.ONE AöR  <->  WARM - Abfallwirtschaft Rhein-Main
Vertragsbeginn: 01.04.2023, Laufzeit 5 Jahre

...

§ 4 Verfügbarkeit und Berichtswesen

(1) Der Auftragnehmer schuldet eine Verfügbarkeit der überlassenen
    Systeme von 99,5 % im Monatsmittel.

(2) Der Auftragnehmer stellt dem Auftraggeber monatlich, jeweils bis
    zum 10. Werktag des Folgemonats, einen Verfügbarkeitsbericht
    bereit.

(3) Unterschreitet die Verfügbarkeit den Wert nach Absatz 1, kann der
    Auftraggeber eine Minderung des Monatsentgelts geltend machen.
    Die Minderung ist binnen 30 Tagen nach Zugang des Berichts nach
    Absatz 2 schriftlich anzuzeigen; danach ist sie ausgeschlossen.

§ 5 Wartungsfenster
...`;

const HINWEISE_KALB = `Für meinen Nachfolger.

31 Jahre. Man vergisst mehr, als man aufschreibt.

Was ich noch weiß:
- Die Komm.ONE schickt jeden Monat irgendwas. Kam per Mail an info@.
- Die Lizenzen laufen über den Einkauf, nicht über uns.
- Der Ordner hier ist nicht vollständig. War er nie.

Den Rest hatte ich im Kopf.

R. Kalb`;

const NOTIZ_BERT = `Moin,

Herr Michael (unser neuer ISB, extern, zwei Tage im Monat) kommt
heute zum Kick-off. Er wird fragen, welche Regelwerke für uns gelten.

Ich weiß es nicht. Ehrlich gesagt weiß es hier niemand.

Was wir haben, liegt unter /srv/verwaltung. Kalbs Ordner.
Schau es dir an, bevor wir gleich dasitzen wie bestellt und nicht
abgeholt.

- Bert`;

export const katasterStoryEvents: GameEvent[] = [
  // ═══════════════════════════ AKT 1 — Der Ordner ═══════════════════════════

  // ── Dialog: der Kick-off ─────────────────────────────────────────────────
  {
    id: 'kt_kickoff',
    weekRange: [1, 2],
    probability: 1,
    category: 'story',
    title: 'Die Frage',
    description: `Besprechungsraum, 9:00 Uhr. Jakob Michael, seit zwei Wochen euer externer Informationssicherheitsbeauftragter, zwei Tage im Monat, hat einen Block dabei und sonst nichts.

Er stellt eine einzige Frage.

„Welche Regelwerke gelten für Sie?"

Bert sieht zu dir. Bjorg sieht aus dem Fenster. Jens schreibt mit.

Michael wartet. Er wartet auffällig lange, und man merkt, dass er das öfter macht.

„Ich frage anders", sagt er schließlich. „Mich interessiert nicht, ob es läuft. Mich interessiert, **wer es merkt, wenn es nicht mehr läuft.**"`,
    image: undefined,
    involvedCharacters: ['isb', 'chef', 'kollege'],
    mentorNote:
      'Pflichten entstehen an vier Stellen: in Verträgen (SLA, Wartung, Lizenz), in Gesetz und Aufsicht, in Betriebs- und Dienstvereinbarungen, und in Versicherungspolicen. Kein Betrieb hat sie an einem Ort. Wer die Frage „was schulden wir?" beantworten will, muss alle vier durchsuchen.',
    choices: [
      {
        id: 'kt_kickoff_ehrlich',
        text: '„Ich weiß es nicht. Ich finde es raus — und zwar schriftlich."',
        effects: { relationships: { chef: 3 }, skills: { softSkills: 2 } },
        resultText:
          'Michael schreibt etwas auf. Zum ersten Mal an diesem Morgen sieht er zufrieden aus. „Das ist die beste Antwort, die ich diese Woche bekommen habe. Sie glauben nicht, wie viele mir stattdessen erzählen, dass alles im Griff ist."\n\nBert atmet hörbar aus. Auf dem Weg raus sagt er leise: „Danke. Ich hätte es nicht gewusst, und ich hätte trotzdem was gesagt."',
      },
      {
        id: 'kt_kickoff_ordner',
        text: '„Mein Vorgänger hat einen Ordner hinterlassen. Da steht das drin."',
        effects: { skills: { softSkills: 1 } },
        resultText:
          '„Gut", sagt Michael. „Dann schauen wir gemeinsam rein." Er schlägt seinen Block zu.\n\nDu hast den Ordner noch nicht aufgemacht. Du hast gerade behauptet, dass etwas darin steht. Beides wird sich heute noch klären.',
      },
      {
        id: 'kt_kickoff_laeuft',
        text: '„Wir sind seit Jahren beanstandungsfrei. Es läuft."',
        effects: { stress: 4, relationships: { chef: -2 } },
        resultText:
          'Bjorg nickt kräftig. Michael nicht.\n\n„Beanstandungsfrei", wiederholt er. „Von wem? Wer hat zuletzt beanstandet — und woran hätten Sie gemerkt, wenn jemand es getan hätte?" Er lässt es stehen. Bert schaut auf den Tisch.\n\nAuf dem Flur danach: „Das war nicht hilfreich", sagt Bert. „Er hat nämlich recht."',
      },
    ],
    tags: ['kataster', 'act1', 'dialog'],
  },

  // ── L1 [CLI Linux] „Der Ordner des Vorgängers" ───────────────────────────
  {
    id: 'kt_l1_ordner',
    weekRange: [1, 2],
    probability: 1,
    category: 'story',
    title: 'Der Ordner des Vorgängers',
    description: `Reinhard Kalb, 31 Jahre bei WARM, seit drei Wochen in Rente. Was er hinterlassen hat, liegt unter \`/srv/verwaltung\`.

Es ist nicht viel. Genau das ist der Befund.

**Deine Aufgabe:**
- Verschaff dir einen Überblick: wie viele Dateien sind das überhaupt? (\`find\`, \`wc -l\`)
- Durchsuche die Vertragsakten nach dem, was **regelmäßig** zu tun ist (\`grep -r\`)
- Lies den Fund und halte ihn schriftlich fest in \`/home/timo/quellen.md\``,
    image: undefined,
    involvedCharacters: ['chef'],
    mentorNote:
      'Ein Vertrag ist kein Ablageobjekt. Er ist eine Liste von Dingen, die jemand regelmäßig tun muss. Die Wörter, an denen man sie findet, sind immer dieselben: monatlich, jährlich, unverzüglich, binnen, nachzuweisen. `grep -rn muster verzeichnis` durchsucht einen ganzen Ordnerbaum und zeigt Datei und Zeilennummer.',
    choices: [
      {
        id: 'start',
        text: 'Den Ordner aufmachen...',
        effects: {},
        resultText:
          'Elf Dateien für einen Betrieb, der die Entsorgung für eine halbe Großstadt macht. Und in einer davon steht eine Pflicht, die seit Jahren jeden Monat fällig wird — und von der bis heute Vormittag niemand im Haus wusste.\n\nDu hast sie aufgeschrieben. Das ist der Anfang des Katasters.',
        terminalCommand: true,
        setsFlags: ['kat_source_contract'],
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'warm-adm-01',
      username: 'timo',
      currentPath: '/home/timo',
      taskText:
        'Umfang von /srv/verwaltung feststellen (find + wc -l); Vertragsakten nach regelmäßigen Pflichten durchsuchen (grep -r); den Fund lesen und in /home/timo/quellen.md festhalten.',
      vfsOverlay: {
        directories: [
          '/srv/verwaltung/vertragsakten',
          '/srv/verwaltung/lizenzen',
          '/srv/verwaltung/dienstvereinbarungen',
          '/srv/verwaltung/versicherung',
          '/srv/verwaltung/schriftverkehr',
        ],
        files: [
          { path: '/home/timo/notiz-von-bert.txt', content: NOTIZ_BERT },
          { path: '/srv/verwaltung/hinweise_kalb.txt', content: HINWEISE_KALB },
          { path: '/srv/verwaltung/vertragsakten/komm_one_sla.txt', content: SLA_KOMM_ONE },
          {
            path: '/srv/verwaltung/vertragsakten/herold_wartung.txt',
            content:
              'WARTUNGSVERTRAG Waagetechnik\nHerold Waagen GmbH <-> WARM\n\n§ 3 Der Auftragnehmer wartet die Fahrzeugwaagen halbjährlich.\n§ 4 Über jede Wartung wird ein Prüfprotokoll erstellt und dem\n    Auftraggeber ausgehändigt.\n',
          },
          {
            path: '/srv/verwaltung/vertragsakten/raab_entsorgungstechnik.txt',
            content:
              'LIEFERVERTRAG Sortieranlage Ersatzteile\nRaab Entsorgungstechnik <-> WARM\n\nKeine wiederkehrenden Pflichten des Auftraggebers.\nAbruf nach Bedarf.\n',
          },
          {
            path: '/srv/verwaltung/vertragsakten/axians_athos.txt',
            content:
              'SUPPORTVERTRAG Leitstandsoftware ATHOS\nAxians <-> WARM\n\n§ 2 Reaktionszeit 4 Stunden (Mo-Fr 8-17 Uhr).\n§ 7 Der Auftraggeber benennt einen fachlichen Ansprechpartner\n    und teilt Wechsel unverzüglich mit.\n',
          },
          {
            path: '/srv/verwaltung/vertragsakten/telekom_anschluss.txt',
            content:
              'ANSCHLUSSVERTRAG Standort Betriebshof\nTelekom Deutschland <-> WARM\n\nStandardbedingungen. Keine gesonderten Berichtspflichten.\n',
          },
          {
            path: '/srv/verwaltung/vertragsakten/reinigung_2019.txt',
            content:
              'RAHMENVERTRAG Unterhaltsreinigung Verwaltungsgebäude\nGültig bis 31.12.2021.\n\n(Abgelaufen. Liegt trotzdem hier.)\n',
          },
          {
            path: '/srv/verwaltung/lizenzen/lizenzliste_2026.csv',
            content:
              'produkt;beschafft;belegt;stand\nATHOS Leitstand;12;12;2026-01-15\nOffice-Paket;140;138;2026-01-15\nBackup-Agent;30;28;2026-01-15\n',
          },
          {
            path: '/srv/verwaltung/dienstvereinbarungen/dv_protokollierung.txt',
            content:
              'DIENSTVEREINBARUNG über die Protokollierung in IT-Systemen\nzwischen der Geschäftsführung und dem Personalrat der WARM\n\n(Volltext siehe Papierakte Personalrat.)\n',
          },
          {
            path: '/srv/verwaltung/versicherung/cyberpolice_2025.txt',
            content:
              'CYBER-VERSICHERUNG Police Nr. WARM-CY-2025\n\nObliegenheiten des Versicherungsnehmers: siehe Anlage 2.\n(Anlage 2 liegt nicht bei.)\n',
          },
          {
            path: '/srv/verwaltung/schriftverkehr/aufsicht_2024.txt',
            content:
              'Eingang 03.09.2024 - Bundesamt für Sicherheit in der\nInformationstechnik - Eingangsbestätigung.\n\n(Kein weiterer Inhalt abgelegt.)\n',
          },
        ],
      },
      commands: [],
      commandSkillGain: {
        find: { linux: 2 },
        grep: { linux: 2, troubleshooting: 1 },
        wc: { linux: 1 },
        cat: { linux: 1 },
        echo: { linux: 1 },
      },
      solutions: [
        {
          // Der Fund zählt nur, wenn der Vertrag WIRKLICH gelesen wurde
          // (semantischer fileRead — jeder Leseweg, kein Kommandozeilen-Regex),
          // UND wenn er als Zeile in der Quellenliste steht. Eine Datei ohne
          // Lesen ist Abschreiben; ein Lesen ohne Datei ist "weiss ich doch".
          commands: [],
          allRequired: false,
          stateGoals: [
            { fileRead: '/srv/verwaltung/vertragsakten/komm_one_sla.txt' },
            { file: '/home/timo/quellen.md', matches: 'Komm\\.ONE' },
            { file: '/home/timo/quellen.md', matches: '[Bb]ericht|[Mm]onat' },
          ],
          resultText:
            'Der erste Eintrag steht — und er hat es in sich: § 4 des Komm.ONE-Vertrags verlangt jeden Monat einen Verfügbarkeitsbericht. Wer ihn nicht prüft, verliert nach 30 Tagen das Recht, die Minderung geltend zu machen.\n\nDie Pflicht gibt es seit April 2023. Den Bericht bekommt WARM seitdem jeden Monat. Geprüft hat ihn nie jemand.\n\nMerke: Die Wörter, an denen Pflichten kleben, sind immer dieselben — monatlich, jährlich, binnen, unverzüglich, nachzuweisen.',
          skillGain: { linux: 4, security: 2, troubleshooting: 2 },
          effects: { stress: -2 },
        },
      ],
      hints: [
        '🤖 Jens: Bevor du liest, guck wie viel es überhaupt ist. Wenn der ganze Betrieb in eine Handvoll Dateien passt, ist das schon der erste Befund.',
        '🤖 Jens: Eine Pflicht erkennst du am Rhythmus. Such in den Vertragsakten nach Wörtern wie „monatlich" — nicht in einer Datei, sondern im ganzen Ordner.',
        '🤖 Jens: `grep -rn monatlich /srv/verwaltung/vertragsakten` durchsucht rekursiv und zeigt dir Datei und Zeile. Danach den Treffer mit `cat` ganz lesen.',
        '🤖 Jens: Und aufschreiben: `echo "SLA Komm.ONE §4 - Verfügbarkeitsbericht monatlich prüfen" >> /home/timo/quellen.md`. Was nicht in der Datei steht, hast du nicht gefunden.',
      ],
    },
    tags: ['kataster', 'act1', 'terminal'],
  },

  // ── L2 [GUI Kataster] „Der erste Eintrag" ────────────────────────────────
  {
    id: 'kt_l2_erster_eintrag',
    weekRange: [1, 2],
    probability: 1,
    category: 'story',
    title: 'Der erste Eintrag',
    description: `Jens hat dir eine leere Tabelle hingestellt. Vier Spalten, sonst nichts.

„Das ist kein Werkzeug", sagt er. „Das ist eine Liste. Aber es ist die einzige Liste, die im Audit zählt."

**Deine Aufgabe:**
- Nimm deinen Fund aus dem Vertragsordner ins Kataster auf
- Setz den Turnus — daraus ergibt sich später die Frist
- Lass den Aufpasser leer, wenn du keinen hast. Genau dafür ist die Spalte da.`,
    image: undefined,
    involvedCharacters: ['jens'],
    mentorNote:
      'Ein Katastereintrag hat vier Felder: Quelle (woher kommt die Pflicht?), Pflicht (was ist konkret zu tun?), Aufpasser (wer namentlich?) und Nachweis (womit belegt man die Erfüllung?). Der Turnus erzeugt die Frist: letzter Nachweis plus Turnus. Fehlt eines der vier Felder, ist die Zeile keine Kontrolle, sondern eine Notiz.',
    choices: [
      {
        id: 'start',
        text: 'Das Kataster anlegen...',
        effects: {},
        resultText:
          'Eine Zeile. Vier Spalten. Zwei davon leer — und die Tabelle macht daraus keine Leerstelle, sondern eine Warnung.\n\n„Sieht schlimm aus", sagt Jens. „Ist aber besser als vorher. Vorher sah es nach gar nichts aus."',
        guiCommand: true,
        setsFlags: ['kat_first_entry'],
      },
    ],
    guiContext: {
      app: 'kataster',
      title: 'Pflichtenkataster',
      hostname: 'warm-adm-01',
      briefing:
        'Quelle · Pflicht · Aufpasser · Nachweis. Nimm den Fund aus dem Fundstapel auf und setz den Turnus. Was keinen Aufpasser hat, wird rot — das ist beabsichtigt.',
      state: {
        kataster: {
          title: 'Pflichtenkataster WARM — Stand 09/2026',
          entries: [],
          people: [
            { id: 'henry', name: 'Henry Bartels', role: 'Systemtechnik' },
            { id: 'jens', name: 'Jens Adam', role: 'IT-Betrieb' },
            { id: 'bjorg', name: 'Bjorg Jörgensen', role: 'IT-Betrieb' },
          ],
          findings: [
            {
              id: 'sla_bericht',
              source: 'SLA Komm.ONE § 4',
              duty: 'Monatlichen Verfügbarkeitsbericht prüfen',
              excerpt:
                'Der Auftragnehmer stellt monatlich einen Verfügbarkeitsbericht bereit. Die Minderung ist binnen 30 Tagen nach Zugang des Berichts anzuzeigen; danach ist sie ausgeschlossen.',
            },
            {
              id: 'athos_ansprechpartner',
              source: 'Supportvertrag ATHOS § 7',
              duty: 'Fachlichen Ansprechpartner benennen, Wechsel mitteilen',
              excerpt:
                'Der Auftraggeber benennt einen fachlichen Ansprechpartner und teilt Wechsel unverzüglich mit.',
            },
            {
              id: 'athos_werbung',
              source: 'Herstellerbroschüre Athos',
              duty: 'Quartalsweise Security-Reviews durchführen',
              excerpt: 'Wir empfehlen unseren Kunden quartalsweise Security-Reviews.',
              decoy: true,
              riskFeedback:
                'Eine Empfehlung des Herstellers ist keine Pflicht. Ins Kataster gehört nur, was jemand schuldet — aus Vertrag, Gesetz, Vereinbarung oder Police. Wer Empfehlungen mit aufnimmt, hat am Ende eine Liste, die niemand ernst nimmt.',
            },
          ],
        },
      },
      solutions: [
        {
          // Aufnehmen UND Turnus setzen: eine Pflicht ohne Rhythmus erzeugt
          // keine Frist und ist damit nicht überwachbar.
          interactions: ['add:sla_bericht', 'cycle:sla_bericht:monatlich'],
          allRequired: true,
          ordered: true,
          resultText:
            'Der Eintrag steht: Quelle, Pflicht, Turnus — und ein leeres Feld, das rot leuchtet. Genau so soll ein Kataster aussehen, solange niemand die Verantwortung übernommen hat.',
          skillGain: { security: 4, softSkills: 2 },
        },
      ],
      hints: [
        '🤖 Jens: Der Fundstapel unten ist das, was du mitgebracht hast. Nicht alles davon gehört ins Kataster — schau dir an, woher es jeweils stammt.',
        '🤖 Jens: Eine Empfehlung ist keine Pflicht. Ins Kataster kommt nur, was aus einem Vertrag, einem Gesetz, einer Vereinbarung oder einer Police folgt.',
        '🤖 Jens: Nimm den SLA-Fund auf („Aufnehmen") und setz danach den Turnus auf monatlich — der Vertrag sagt „monatlich", also sagt das Kataster auch „monatlich".',
      ],
    },
    tags: ['kataster', 'act1', 'gui'],
  },

  // ── Dialog: „Das macht doch die Komm.ONE" ────────────────────────────────
  {
    id: 'kt_wer_macht_das',
    weekRange: [1, 2],
    probability: 1,
    category: 'story',
    title: 'Wer macht das?',
    description: `Du fragst in die Runde, wer den Verfügbarkeitsbericht prüft.

Bjorg, ohne aufzusehen: „Das macht doch die Komm.ONE."

Jens legt den Stift hin. „Nein. Die Komm.ONE **schickt** ihn. Prüfen muss ihn jemand hier. Das ist der ganze Unterschied."

Kurze Stille. Bjorg zuckt mit den Schultern: „Dann macht's halt keiner. Hat ja auch nie jemand was gesagt."

Er hat recht. Genau das ist das Problem.`,
    image: undefined,
    involvedCharacters: ['kollege', 'jens'],
    mentorNote:
      'Der häufigste Fehler in einem Pflichtenkataster ist die Verwechslung von Leistung und Aufsicht. Der Dienstleister erbringt die Leistung — die Pflicht, sie zu prüfen, bleibt beim Betreiber und lässt sich nicht wegvergeben. Für jede Zeile gilt: Wer liefert? Und wer schaut hin?',
    choices: [
      {
        id: 'kt_wer_macht_das_leer',
        text: 'Das Feld leer lassen und rot markiert stehen lassen.',
        effects: { skills: { security: 2 } },
        resultText:
          'Die Zeile bleibt rot. Michael wird sie sehen, und das ist in Ordnung: eine rote Zeile ist ein Befund, den du selbst erhoben hast. Das ist etwas anderes als ein Befund, den jemand bei dir findet.',
      },
      {
        id: 'kt_wer_macht_das_selbst',
        text: 'Dich selbst eintragen — du bist neu, du hast die Zeit.',
        effects: { stress: 6, skills: { security: 1 } },
        resultText:
          'Dein Name steht drin, und für den Moment fühlt es sich gut an. Es sind bis jetzt auch nur zwei Zeilen.\n\nJens sieht es und sagt nichts. Später, am Automaten: „Trag dich ein, wo du es wirklich machst. Nicht da, wo sonst niemand steht. Sonst hast du in vier Wochen dreißig Zeilen und keine davon geprüft."',
      },
      {
        id: 'kt_wer_macht_das_bjorg',
        text: '„Bjorg, dann übernimmst du das." — und ihn eintragen.',
        effects: { relationships: { kollegen: -1 } },
        resultText:
          '„Jaja", sagt Bjorg. „Mach ich."\n\nDu trägst ihn ein. Er hat nicht zugestimmt, er hat nur nicht widersprochen — und das sind zwei verschiedene Dinge, wie sich noch zeigen wird.',
      },
    ],
    tags: ['kataster', 'act1', 'dialog'],
  },

  // ═══════════════════ AKT 2 — Was in den Verträgen steht ═══════════════════

  // ── L3 [CLI Linux] „Null von 280" ────────────────────────────────────────
  {
    id: 'kt_l3_null_von_280',
    weekRange: [2, 3],
    probability: 1,
    category: 'story',
    title: 'Null von 280',
    description: `Die Kämmerei schickt die Jahresrechnung zur Durchsicht. Eine Position fällt auf: Wartung für 280 Lizenzen einer „Archiv-Suite", von der du noch nie gehört hast.

Der Lizenzserver führt Buch darüber, was tatsächlich belegt ist. Der Rahmenvertrag führt Buch darüber, was ihr dafür schuldet.

**Deine Aufgabe:**
- Wert den Lizenzserver-Export aus: welches Produkt ist beschafft, aber **nicht belegt**? (\`awk -F';'\`)
- Lies den Rahmenvertrag — was verlangt er von **euch**, nicht vom Anbieter?
- Halte beides in \`/home/timo/quellen.md\` fest`,
    image: undefined,
    involvedCharacters: ['chef'],
    mentorNote:
      "Lizenzverträge erzeugen nicht nur Kosten, sondern Nachweispflichten: fast jeder enthält eine Audit-Klausel, nach der der Kunde die Belegung jährlich nachweisen muss. `awk -F';' '$3 == 0'` gibt alle Zeilen aus, in denen das dritte semikolongetrennte Feld null ist — der schnellste Weg von einer Tabelle zu einer Auffälligkeit.",
    choices: [
      {
        id: 'start',
        text: 'Den Lizenzserver befragen...',
        effects: {},
        resultText:
          '280 beschafft. 0 belegt. Seit der Beschaffung im Mai 2024 hat sie nie jemand ausgerollt — bezahlt wird sie trotzdem, jedes Jahr.\n\nUnd § 9 des Rahmenvertrags dreht die Sache um: Nicht der Anbieter schuldet euch etwas, ihr schuldet ihm einen jährlichen Nachweis der Belegung. Den hat noch nie jemand geführt.',
        terminalCommand: true,
        setsFlags: ['kat_source_license'],
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'warm-adm-01',
      username: 'timo',
      currentPath: '/home/timo',
      taskText:
        "Lizenzserver-Export auswerten (awk -F';'): welches Produkt hat Belegung 0? Rahmenvertrag Lizenzen lesen (§ 9). Beides in /home/timo/quellen.md festhalten.",
      vfsOverlay: {
        directories: ['/srv/verwaltung/lizenzen', '/srv/verwaltung/vertragsakten'],
        files: [
          {
            path: '/home/timo/quellen.md',
            content:
              '# Pflichtenquellen WARM\n\n## Vertrag\n- SLA Komm.ONE § 4: Verfügbarkeitsbericht monatlich prüfen (Minderung verfällt 30 Tage nach Zugang)\n',
          },
          {
            path: '/srv/verwaltung/lizenzen/lizenzserver_export_2026-09.csv',
            content:
              'produkt;beschafft;belegt;stand\nATHOS Leitstand;12;12;2026-09-01\nOffice-Paket;140;138;2026-09-01\nBackup-Agent;30;28;2026-09-01\nArchiv-Suite CAL;280;0;2026-09-01\nMonitoring-Agent;45;41;2026-09-01\nPDF-Editor;60;12;2026-09-01\nCAD-Viewer;8;7;2026-09-01\n',
          },
          {
            path: '/srv/verwaltung/vertragsakten/rahmenvertrag_lizenzen.txt',
            content:
              'RAHMENVERTRAG Softwarelizenzen\nBeschafft durch: Zentraler Einkauf der WARM (Frau Petersen)\nVertragspartner: Systemhaus Nordwest GmbH\nBeschaffung Archiv-Suite: 280 CAL, Mai 2024\n\n§ 9 Nachweis der Lizenzbelegung\n\n(1) Der Kunde weist dem Auftragnehmer jährlich, jeweils zum\n    30. Juni, die tatsächliche Belegung der erworbenen Lizenzen\n    nach.\n\n(2) Kommt der Kunde dem Nachweis nicht nach, ist der Auftragnehmer\n    berechtigt, eine Prüfung beim Kunden durchzuführen; die Kosten\n    trägt der Kunde.\n\n§ 10 Kündigung\n    Teilkündigung einzelner Lizenzkontingente ist zum Ende eines\n    Vertragsjahres mit einer Frist von drei Monaten möglich.\n',
          },
        ],
      },
      commands: [],
      commandSkillGain: {
        awk: { linux: 2, troubleshooting: 1 },
        grep: { linux: 1 },
        sort: { linux: 1 },
        cat: { linux: 1 },
        echo: { linux: 1 },
      },
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            { fileRead: '/srv/verwaltung/lizenzen/lizenzserver_export_2026-09.csv' },
            { fileRead: '/srv/verwaltung/vertragsakten/rahmenvertrag_lizenzen.txt' },
            { file: '/home/timo/quellen.md', matches: '280' },
          ],
          resultText:
            'Zwei Pflichten aus einem Vertrag: die Belegung jährlich zum 30. Juni nachweisen — und die Entscheidung, was mit 280 ungenutzten Lizenzen passiert (§ 10 erlaubt die Teilkündigung zum Vertragsjahresende, drei Monate Frist).\n\nMerke: Wer den Nachweis schuldet, steht im Vertrag. Meistens ist es der Kunde, nicht der Anbieter.',
          skillGain: { linux: 4, security: 2, troubleshooting: 2 },
          effects: { stress: -2 },
        },
      ],
      hints: [
        '🤖 Jens: Der Export hat eine Zeile pro Produkt und eine Spalte für das, was tatsächlich in Benutzung ist. Such die Zeile, bei der da eine Null steht.',
        '🤖 Jens: Die Datei ist semikolongetrennt. awk kann das Trennzeichen setzen und dann auf ein einzelnes Feld prüfen.',
        "🤖 Jens: `awk -F';' '$3 == 0' /srv/verwaltung/lizenzen/lizenzserver_export_2026-09.csv` zeigt dir die Zeile. Danach den Rahmenvertrag lesen — § 9 ist der interessante.",
        '🤖 Jens: Und dazuschreiben: `echo "Rahmenvertrag Lizenzen 9 - Belegung jaehrlich nachweisen, 280 CAL ungenutzt" >> /home/timo/quellen.md`',
      ],
    },
    tags: ['kataster', 'act2', 'terminal'],
  },

  // ── Dialog: wem gehört die Lizenzpflicht? ────────────────────────────────
  {
    id: 'kt_l3_einkauf',
    weekRange: [2, 3],
    probability: 1,
    category: 'story',
    title: 'Wem gehört das?',
    description: `Der Rahmenvertrag ist nicht von der IT geschlossen worden. Unten steht der zentrale Einkauf, Frau Petersen.

Trotzdem landet die Frage bei dir — so wie alles landet, was nach Computer aussieht.

Im Kataster braucht die Zeile „Lizenzbelegung jährlich nachweisen" einen Aufpasser. Du kannst die Zahlen liefern. Aber schuldest **du** den Nachweis?`,
    image: undefined,
    involvedCharacters: ['chef'],
    mentorNote:
      'Aufpasserschaft ist nicht dasselbe wie technische Zuständigkeit. Wer den Vertrag geschlossen hat, schuldet den Nachweis; die IT liefert die Zahlen dafür. Wer beides bei sich einsammelt, weil er es kann, sammelt Pflichten ein, die ihm niemand gegeben hat — und die niemand vermisst, wenn er ausfällt.',
    choices: [
      {
        id: 'kt_l3_einkauf_uebergeben',
        text: 'Frau Petersen eintragen — und ihr den Auszug schriftlich schicken, mit Fristdatum.',
        effects: { skills: { softSkills: 3, security: 2 }, relationships: { kaemmerer: 2 } },
        resultText:
          'Du schickst dem Einkauf den Lizenzauszug, den Verweis auf § 9 und das Datum: 30. Juni. Antwort nach zwanzig Minuten: „Wusste ich nicht. Danke. Ich setz mir eine Wiedervorlage."\n\nDie Zahlen kommen weiter von dir. Die Pflicht liegt jetzt da, wo sie hingehört — und, was mehr zählt, sie liegt dort nachweislich.',
        setsFlags: ['kat_purchasing_informed'],
      },
      {
        id: 'kt_l3_einkauf_selbst',
        text: 'Dich selbst eintragen. Geht schneller, als es zu erklären.',
        effects: { stress: 5 },
        resultText:
          'Erledigt in zehn Sekunden. Es ist ja auch nicht viel.\n\nDass der Einkauf bis heute nicht weiß, dass es diese Pflicht gibt, ändert sich dadurch nicht. Und im nächsten Jahr, wenn du im Urlaub bist, weiß es weiterhin niemand.',
      },
      {
        id: 'kt_l3_einkauf_offen',
        text: 'Leer lassen. Das muss die Leitung entscheiden, nicht du.',
        effects: {},
        resultText:
          'Die Zeile bleibt rot. Formal ist das korrekt: du bist nicht befugt, jemandem eine Pflicht zuzuweisen.\n\nAber du hast auch niemandem gesagt, dass sie offen ist. Eine rote Zeile, die niemand sieht, ist genau so viel wert wie eine leere.',
        setsFlags: ['kat_orphan_license'],
      },
    ],
    tags: ['kataster', 'act2', 'dialog'],
  },

  // ── L4 [CLI Linux] „Acht Monate" ─────────────────────────────────────────
  {
    id: 'kt_l4_acht_monate',
    weekRange: [3, 4],
    probability: 1,
    category: 'story',
    title: 'Acht Monate',
    description: `Kalb hatte doch ein Kataster. Es lag auf einem Netzlaufwerk, heißt \`kataster_kalb.csv\` und ist von 2023.

In der Spalte „aufpasser" steht überall ein Name. Alles grün, auf den ersten Blick.

Das Ticketsystem führt eine eigene Statistik: wann in welcher Queue zuletzt etwas passiert ist. Die beiden Dateien behaupten nicht dasselbe.

**Deine Aufgabe:**
- Sieh dir Kalbs Kataster an — wer steht bei der Technikwartung?
- Vergleich es mit der Queue-Statistik (\`cut\`, \`sort\`)
- Schreib den Befund nach \`/home/timo/befund_aufpasser.txt\` — mit Queue und Datum`,
    image: undefined,
    involvedCharacters: ['kollege'],
    mentorNote:
      "Ein Name im Kataster ist kein Nachweis. Die Prüffrage lautet nie „steht da jemand?\", sondern „wann hat diese Person zuletzt etwas getan, das man sehen kann?\". `cut -d';' -f1,3` schneidet zwei Spalten heraus, `sort -t';' -k2` sortiert nach der zweiten — so findet man die älteste Spur in Sekunden.",
    choices: [
      {
        id: 'start',
        text: 'Die beiden Dateien nebeneinanderlegen...',
        effects: {},
        resultText:
          'Technikwartung: Aufpasser laut Kataster ist Bjorg. Letzte Aktivität in der Queue: 14. Januar. Das sind acht Monate.\n\nDie Zeile war grün. Sie war es seit drei Jahren.',
        terminalCommand: true,
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'warm-adm-01',
      username: 'timo',
      currentPath: '/home/timo',
      taskText:
        'Kalbs Kataster und die Queue-Statistik vergleichen (cut, sort): Wer steht bei der Technikwartung, und wann ist dort zuletzt etwas passiert? Befund nach /home/timo/befund_aufpasser.txt schreiben (Queue + Datum).',
      vfsOverlay: {
        directories: ['/srv/verwaltung/kataster_alt', '/srv/verwaltung/ticket-export'],
        files: [
          {
            path: '/srv/verwaltung/kataster_alt/kataster_kalb.csv',
            content:
              'queue;pflicht;aufpasser;turnus\nTechnikwartung;Fahrzeugwaagen warten lassen, Protokoll ablegen;Bjorg Jörgensen;halbjährlich\nNetzbetrieb;Firewall-Regelwerk sichten;Henry Bartels;quartalsweise\nBenutzerverwaltung;Konten ausgeschiedener Beschäftigter sperren;Jens Adam;monatlich\nArchivierung;Aufbewahrungsfristen prüfen;Bjorg Jörgensen;jährlich\n',
          },
          {
            path: '/srv/verwaltung/ticket-export/queues_2026-09.csv',
            content:
              'queue;tickets_gesamt;zuletzt\nNetzbetrieb;214;2026-09-08\nBenutzerverwaltung;96;2026-09-05\nArchivierung;4;2025-11-20\nTechnikwartung;7;2026-01-14\nSonstiges;51;2026-09-09\n',
          },
        ],
      },
      commands: [],
      commandSkillGain: {
        cut: { linux: 2 },
        sort: { linux: 2, troubleshooting: 1 },
        awk: { linux: 2 },
        cat: { linux: 1 },
        echo: { linux: 1 },
      },
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            { fileRead: '/srv/verwaltung/kataster_alt/kataster_kalb.csv' },
            { fileRead: '/srv/verwaltung/ticket-export/queues_2026-09.csv' },
            { file: '/home/timo/befund_aufpasser.txt', matches: 'Technikwartung' },
            { file: '/home/timo/befund_aufpasser.txt', matches: '2026-01|Januar' },
          ],
          resultText:
            'Der Befund steht schriftlich: Queue Technikwartung, Aufpasser laut Kataster eingetragen, letzte sichtbare Aktivität am 14.01.2026.\n\nDas ist kein Vorwurf an eine Person — es ist ein Befund über eine Zeile. Der Unterschied ist wichtig, und du wirst ihn gleich brauchen.\n\nMerke: Ein Kataster, das nur behauptet, ist gefährlicher als keins — weil es die Suche beendet.',
          skillGain: { linux: 4, security: 3, troubleshooting: 2 },
          effects: { stress: -1 },
        },
      ],
      hints: [
        '🤖 Jens: Beide Dateien reden über dieselben Queues. Die eine sagt, wer zuständig ist, die andere, wann dort zuletzt wirklich etwas passiert ist.',
        '🤖 Jens: Du brauchst aus jeder Datei nur zwei Spalten. cut schneidet Spalten heraus, wenn du ihm das Trennzeichen sagst.',
        "🤖 Jens: `cut -d';' -f1,3 /srv/verwaltung/ticket-export/queues_2026-09.csv | sort -t';' -k2` sortiert nach Datum — die älteste Zeile steht dann oben.",
        '🤖 Jens: Und festhalten: `echo "Technikwartung - Aufpasser eingetragen, letzte Aktion 2026-01-14" >> /home/timo/befund_aufpasser.txt`',
      ],
    },
    tags: ['kataster', 'act2', 'terminal'],
  },

  // ── Dialog: was macht man mit dem Befund? ────────────────────────────────
  {
    id: 'kt_l4_befund',
    weekRange: [3, 4],
    probability: 1,
    category: 'story',
    title: 'Die grüne Zeile',
    description: `Du hast den Befund. Jetzt hast du ein Problem, das keine technische Lösung hat.

Wenn du die Zeile zurückstufst, sieht das Kataster schlechter aus als vorher — und Bjorg wird fragen, warum du an seinem Namen rumschraubst.

Wenn du sie grün lässt, sieht alles gut aus. Bis jemand nach dem letzten Prüfprotokoll fragt.

Bjorg kommt vorbei, Kaffee in der Hand: „Waagen? Läuft. Da ruft die Herold schon an, wenn was ist."`,
    image: undefined,
    involvedCharacters: ['kollege', 'jens'],
    mentorNote:
      'Ein Kataster darf schlechter aussehen, wenn es dadurch wahrer wird. Der Zustand „Aufpasser eingetragen, aber kein Nachweis" ist eine eigene Kategorie — nicht erledigt, nicht offen, sondern behauptet. Wer diese Kategorie nicht führt, hat am Ende nur zwei Farben und keine Information.',
    choices: [
      {
        id: 'kt_l4_befund_zurueckstufen',
        text: 'Die Zeile zurückstufen: Aufpasser bleibt, Nachweis fehlt — und das steht jetzt da.',
        effects: { skills: { security: 3 }, relationships: { kollegen: -1 } },
        resultText:
          'Du nimmst das Häkchen raus und schreibst den Befund dazu, mit Datum.\n\nBjorg findet das „ein bisschen übertrieben". Jens findet es richtig: „Die Herold ruft an, wenn eine Waage steht. Nicht, wenn eine Wartung ausfällt. Das ist nicht dasselbe, und genau dafür gibt es die Spalte."\n\nDas Kataster hat jetzt eine gelbe Zeile mehr. Und eine Lüge weniger.',
        setsFlags: ['kat_stale_owner_found'],
      },
      {
        id: 'kt_l4_befund_nachfragen',
        text: 'Erst Bjorg fragen, ob es Protokolle gibt — vielleicht liegen sie nur woanders.',
        effects: { skills: { softSkills: 2, security: 2 } },
        resultText:
          '„Protokolle? Die kriegt die Herold. Wir haben die nicht."\n\nDamit ist es geklärt: Es gibt keinen Nachweis im Haus. Du stufst die Zeile zurück und schreibst dazu, woher du das weißt — inklusive dem Satz, dass die Protokolle beim Dienstleister liegen und angefordert werden müssen.\n\nDas ist die bessere Version desselben Befunds: nicht nur, was fehlt, sondern auch, wo es zu holen wäre.',
        setsFlags: ['kat_stale_owner_found'],
      },
      {
        id: 'kt_l4_befund_gruen',
        text: 'Grün lassen. Es läuft ja, und einen Kollegen anzuzählen bringt hier nichts.',
        effects: { stress: -3, relationships: { kollegen: 1 } },
        resultText:
          'Du schließt die Datei. Bjorg merkt nichts, und es gibt heute keinen Konflikt.\n\nDas Kataster sagt jetzt: Fahrzeugwaagen, halbjährlich, Aufpasser Bjorg Jörgensen. Es sagt nicht, dass die letzte sichtbare Spur aus dem Januar ist.\n\nDu weißt es. Aufgeschrieben hat es niemand.',
        setsFlags: ['kat_gap_concealed'],
      },
    ],
    tags: ['kataster', 'act2', 'dialog'],
  },

  // ═══════════════════ AKT 2 — Was auf dem Papier steht ════════════════════

  // ── L5 [CLI Linux] „Der Verweis ins Leere" ───────────────────────────────
  {
    id: 'kt_l5_verweis_ins_leere',
    weekRange: [4, 5],
    probability: 1,
    category: 'story',
    title: 'Der Verweis ins Leere',
    description: `Der Personalrat hat die Dienstvereinbarung zur Protokollierung geschickt — die, auf die sich jede Log-Auswertung im Haus stützt.

In § 7 steht ein Satz, der alles Weitere regelt. Er verweist auf ein anderes Dokument.

**Deine Aufgabe:**
- Lies die Dienstvereinbarung und finde den Verweis in § 7
- Such das Dokument, auf das verwiesen wird (\`find / -iname\`)
- Halte fest, **wie** du gesucht hast — in \`/home/timo/suchprotokoll.txt\``,
    image: undefined,
    involvedCharacters: ['jens'],
    mentorNote:
      'Ein Negativbefund muss dokumentiert werden wie ein Positivbefund — mit Suchraum, Suchbegriff und Ergebnis. „Wir haben nichts gefunden" ist keine Aussage; „wir haben über den ganzen Baum nach *notfall* gesucht und nichts gefunden" ist eine. Im Audit zählt nur die zweite, weil nur bei ihr nachvollziehbar ist, ob überhaupt gesucht wurde.',
    choices: [
      {
        id: 'start',
        text: 'Die Dienstvereinbarung aufschlagen...',
        effects: {},
        resultText:
          'Der Verweis geht ins Leere. § 7 der gültigen Dienstvereinbarung stützt sich auf ein IT-Notfallhandbuch „in seiner jeweils gültigen Fassung" — und es gibt keine Fassung. Es hat nie eine gegeben.\n\nDu hast die Suche protokolliert. Das ist der Unterschied zwischen „ist mir nicht aufgefallen" und „ich habe nachgesehen".',
        terminalCommand: true,
        setsFlags: ['kat_source_dv'],
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'warm-adm-01',
      username: 'timo',
      currentPath: '/home/timo',
      taskText:
        'Dienstvereinbarung lesen und den Verweis in § 7 finden; das verwiesene Dokument suchen (find / -iname "*notfall*"); die Suche in /home/timo/suchprotokoll.txt protokollieren (Suchbegriff + Ergebnis).',
      vfsOverlay: {
        directories: [
          '/srv/verwaltung/dienstvereinbarungen',
          '/srv/verwaltung/handbuecher',
          '/srv/it-doku',
        ],
        files: [
          {
            path: '/srv/verwaltung/dienstvereinbarungen/dv_protokollierung.txt',
            content:
              'DIENSTVEREINBARUNG über die Protokollierung in IT-Systemen\nzwischen der Geschäftsführung und dem Personalrat der WARM\n\nIn Kraft seit: 01.02.2019\n\n§ 5 Zweckbindung\n    Protokolldaten werden ausschließlich zur Störungsanalyse und zur\n    Gewährleistung der Systemsicherheit ausgewertet.\n\n§ 6 Auswertung im Einzelfall\n    Eine personenbezogene Auswertung bedarf der vorherigen\n    Zustimmung des Personalrats.\n\n§ 7 Verfahren im Notfall\n    Abweichungen von §§ 5 und 6 sind im Notfall zulässig. Das\n    Nähere regelt das IT-Notfallhandbuch in seiner jeweils\n    gültigen Fassung.\n\n§ 8 Inkrafttreten\n    Diese Vereinbarung tritt mit Unterzeichnung in Kraft.\n',
          },
          {
            path: '/srv/verwaltung/handbuecher/betriebshandbuch_waage.txt',
            content: 'Betriebshandbuch Fahrzeugwaage Typ H-40. Stand 2021.\n',
          },
          {
            path: '/srv/it-doku/netzplan_2024.txt',
            content: 'Netzplan Betriebshof, Stand 2024. (Skizze, nicht gepflegt.)\n',
          },
          {
            path: '/srv/it-doku/passwortrichtlinie.txt',
            content: 'Passwortrichtlinie WARM, Stand 2020.\n',
          },
        ],
      },
      commands: [],
      commandSkillGain: {
        grep: { linux: 1 },
        find: { linux: 2, troubleshooting: 1 },
        echo: { linux: 1 },
      },
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            { fileRead: '/srv/verwaltung/dienstvereinbarungen/dv_protokollierung.txt' },
            // Der Negativbefund zählt nur, wenn wirklich gesucht wurde. find
            // mit -iname endet auch ohne Treffer mit Exit 0 — genau das ist
            // hier der Beweis: die Suche lief, sie war nur ergebnislos.
            //
            // ANKER `^`, nicht verhandelbar: commandRan matcht die Kommando-
            // ZEILE als Text. Ohne Anker erfüllt schon ein
            // `echo "... (find -iname)" >> protokoll` das Ziel — das Behaupten
            // der Suche würde die Suche ersetzen, also genau der Fehler, den
            // dieses Level lehrt. Getestet in act2.test.ts.
            { commandRan: { pattern: '^\\s*find\\s.*-iname', outcome: 'succeeded' } },
            // Der Dateiname MUSS außerhalb des Suchmusters liegen: seedVfs-
            // FromScenario materialisiert jeden in taskText/hints genannten
            // Pfad vorab und füllt ihn mit dem Dateinamen. Hiesse das Protokoll
            // "suche_notfallhandbuch.txt", würde es (a) von der eigenen Suche
            // gefunden und (b) dieses Inhaltsziel schon vor dem ersten Kommando
            // erfüllen. Guard in act2.test.ts.
            { file: '/home/timo/suchprotokoll.txt', matches: '[Nn]otfall' },
            { file: '/home/timo/suchprotokoll.txt', matches: 'find|gesucht|kein Treffer' },
          ],
          resultText:
            'Protokolliert: gesucht wurde nach *notfall* über den gesamten Baum, gefunden wurde nichts.\n\nDas ist jetzt ein Befund mit Beleg. Die Dienstvereinbarung verweist seit 2019 auf ein Dokument, das es nicht gibt — ausgerechnet für den Fall, in dem von den Datenschutzregeln abgewichen werden darf.\n\nMerke: Ein Verweis auf ein Dokument, das nicht existiert, ist eine Pflichtverletzung mit Papierform.',
          skillGain: { linux: 3, security: 4, troubleshooting: 2 },
          effects: { stress: 2 },
        },
      ],
      hints: [
        '🤖 Jens: Lies die Dienstvereinbarung ganz. Der interessante Paragraf ist der, in dem steht, was im Notfall gilt — er regelt es nämlich nicht selbst.',
        '🤖 Jens: § 7 verweist auf ein anderes Dokument. Such danach, bevor du weitermachst — im ganzen Dateibaum, nicht nur in einem Ordner.',
        '🤖 Jens: `find / -iname "*notfall*"` sucht ab der Wurzel und ignoriert Groß- und Kleinschreibung. Kein Treffer ist hier das Ergebnis, nicht der Fehler.',
        '🤖 Jens: Und das Ergebnis festhalten: `echo "Suche nach *notfall* im gesamten Baum: kein Treffer (find -iname)" >> /home/timo/suchprotokoll.txt`',
      ],
    },
    tags: ['kataster', 'act2', 'terminal'],
  },

  // ── Dialog: melden oder liegen lassen? (Kernentscheidung) ────────────────
  {
    id: 'kt_l5_melden',
    weekRange: [4, 5],
    probability: 1,
    category: 'story',
    title: 'Sagt man das?',
    description: `Die Dienstvereinbarung ist von 2019 und vom Personalrat mitgezeichnet. Sie verweist auf ein Handbuch, das niemand je geschrieben hat.

Das ist kein IT-Problem. Das ist ein Problem der Geschäftsführung, die unterschrieben hat, und des Personalrats, der mitgezeichnet hat.

Michael kommt in zwei Wochen wieder. Er wird nach der Dokumentation fragen.

Bjorg, als du es erwähnst: „Lass mal. Wenn du das aufmachst, sitzen wir sechs Monate in Arbeitskreisen."`,
    image: undefined,
    involvedCharacters: ['isb', 'chef', 'kollege'],
    mentorNote:
      'Eine Lücke, die man selbst meldet, ist ein Befund. Dieselbe Lücke, die ein Auditor findet, ist ein Versäumnis — und die Frage, seit wann sie bekannt war, stellt er dann auch. Wer eine bekannte Lücke verschweigt, tauscht ein kleines Problem heute gegen zwei große später: die Lücke und das Verschweigen.',
    choices: [
      {
        id: 'kt_l5_melden_offen',
        text: 'In den Bericht schreiben: Verweis läuft ins Leere, Handbuch fehlt, seit 2019.',
        effects: { skills: { security: 3, softSkills: 2 }, relationships: { chef: 2 } },
        resultText:
          'Du schreibst drei Sätze: was die Dienstvereinbarung verlangt, was es dazu gibt, seit wann. Dazu das Suchprotokoll.\n\nBert liest es zweimal. „Das ist unangenehm." Pause. „Aber besser von uns als von ihm." Er leitet es an die Geschäftsführung weiter, mit Datum.\n\nDie Lücke ist jetzt aktenkundig — und zwar als etwas, das ihr gefunden habt.',
        setsFlags: ['kat_gap_reported'],
      },
      {
        id: 'kt_l5_melden_intern',
        text: 'Erst intern klären: Bert fragen, wie man so etwas hier normalerweise meldet.',
        effects: { skills: { softSkills: 3, security: 2 }, relationships: { chef: 3 } },
        resultText:
          '„Gar nicht", sagt Bert trocken. „So etwas ist hier noch nie jemandem aufgefallen." Dann denkt er nach. „Schreib es auf. Ich geb es weiter, und ich setz mich drunter."\n\nEr tut es noch am selben Tag. Der Weg war länger als nötig — aber er hat aus deinem Befund einen Vorgang des Hauses gemacht, und das ist mehr wert als ein Befund, der dir allein gehört.',
        setsFlags: ['kat_gap_reported'],
      },
      {
        id: 'kt_l5_melden_spaeter',
        text: 'Liegen lassen. Das Handbuch schreibt sich nicht in zwei Wochen, und Ärger gibt es dafür sofort.',
        effects: { stress: -4 },
        resultText:
          'Du legst das Suchprotokoll in deinen eigenen Ordner. Nicht gelöscht — nur nicht weitergegeben.\n\nBjorg ist zufrieden. Die Dienstvereinbarung verweist weiter auf ein Handbuch, das es nicht gibt, und jetzt weißt du es als Einziger.\n\nDas ist die unangenehmste Sorte Wissen: die, für die man ab jetzt zuständig ist, ohne es jemandem gesagt zu haben.',
        setsFlags: ['kat_gap_concealed'],
      },
    ],
    tags: ['kataster', 'act2', 'dialog'],
  },

  // ── L6 [CLI Linux] „Die Erinnerung, die niemand liest" ───────────────────
  {
    id: 'kt_l6_erinnerung',
    weekRange: [5, 6],
    probability: 1,
    category: 'story',
    title: 'Die Erinnerung, die niemand liest',
    description: `\`info@\` ist das Postfach, das allen gehört. Also niemandem.

Es wird archiviert, nicht gelesen. Der Export liegt unter \`/srv/mailexport/info\`.

Michael hat beim Kick-off gefragt, wann WARM zuletzt gegenüber der Aufsicht nachgewiesen hat. Niemand wusste es. Kalbs Ablage weiß es.

**Deine Aufgabe:**
- Durchsuch den Postfach-Export nach Post von der Aufsicht (\`grep -ril\`)
- Lies das Anschreiben — welche Pflicht, welcher Turnus?
- Sieh in Kalbs Nachweisablage nach, wann zuletzt nachgewiesen wurde
- **Rechne die nächste Fälligkeit aus** und schreib sie mit Fundstelle in \`/home/timo/quellen.md\``,
    image: undefined,
    involvedCharacters: ['isb'],
    mentorNote:
      'Eine Frist ist kein Datum, sondern ein Datum plus die Regel, aus der es folgt. Wer nur „Mai 2027" notiert, kann im Audit nicht begründen, warum. Wer „letzter Nachweis 13.05.2024 plus drei Jahre nach § 39 BSIG" notiert, kann es — und merkt außerdem sofort, wenn sich die Regel ändert.',
    choices: [
      {
        id: 'start',
        text: 'Das Sammelpostfach durchsuchen...',
        effects: {},
        resultText:
          'Seit elf Wochen ungelesen: ein Anschreiben der Aufsicht zur Nachweispflicht nach § 39 BSIG. Alle drei Jahre, gegenüber dem Bundesamt, einschließlich der dabei aufgedeckten Sicherheitsmängel.\n\nKalbs letzter Nachweis ist vom 13.05.2024. Damit steht die nächste Fälligkeit fest — und sie steht jetzt im Kataster, mit der Regel daneben.\n\nZweiter Fund, unfreiwillig: Das Postfach selbst ist eine verwaiste Pflicht. Es gehört allen.',
        terminalCommand: true,
        setsFlags: ['kat_source_law'],
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'warm-adm-01',
      username: 'timo',
      currentPath: '/home/timo',
      taskText:
        'Postfach-Export /srv/mailexport/info nach Post der Aufsicht durchsuchen (grep -ril), Anschreiben lesen, Kalbs Nachweisablage prüfen und die nächste Fälligkeit MIT Fundstelle (§ 39) in /home/timo/quellen.md schreiben.',
      vfsOverlay: {
        directories: ['/srv/mailexport/info', '/srv/verwaltung/nachweise'],
        files: [
          {
            path: '/home/timo/quellen.md',
            content:
              '# Pflichtenquellen WARM\n\n## Vertrag\n- SLA Komm.ONE § 4: Verfügbarkeitsbericht monatlich prüfen\n- Rahmenvertrag Lizenzen § 9: Belegung jährlich zum 30.06. nachweisen\n\n## Dienstvereinbarung\n- DV Protokollierung § 7: verweist auf IT-Notfallhandbuch — existiert nicht\n',
          },
          {
            path: '/srv/mailexport/info/2026-06-24_bundesamt.eml',
            content:
              'Von: poststelle@bsi.bund.de\nAn: info@warm-rhein-main.de\nDatum: 24.06.2026\nBetreff: Nachweispflicht nach § 39 BSIG - Hinweis\n\nSehr geehrte Damen und Herren,\n\nwir weisen darauf hin, dass Betreiber kritischer Anlagen dem\nBundesamt alle drei Jahre nachzuweisen haben, dass die\nAnforderungen nach §§ 30 und 31 BSIG erfüllt werden.\n\nDer Nachweis erfolgt durch Sicherheitsaudits, Prüfungen oder\nZertifizierungen. Zu übermitteln sind die Ergebnisse\neinschließlich der dabei aufgedeckten Sicherheitsmängel.\n\nMit freundlichen Grüßen\n',
          },
          {
            path: '/srv/mailexport/info/2026-07-02_toner.eml',
            content:
              'Von: vertrieb@toner-express24.de\nAn: info@warm-rhein-main.de\nBetreff: Ihr Sonderangebot wartet!\n\nNur diese Woche: 30 % auf alle Tonerkartuschen.\n',
          },
          {
            path: '/srv/mailexport/info/2026-08-11_bewerbung.eml',
            content:
              'Von: m.schneider@example.org\nAn: info@warm-rhein-main.de\nBetreff: Initiativbewerbung\n\nSehr geehrte Damen und Herren,\nhiermit bewerbe ich mich initiativ...\n',
          },
          {
            path: '/srv/verwaltung/nachweise/ablage_kalb.txt',
            content:
              'Nachweise gegenüber der Aufsicht\n\n2018-04-19  Nachweis erbracht (Prüfstelle TÜV Hessen)\n2021-04-27  Nachweis erbracht (Prüfstelle TÜV Hessen)\n2024-05-13  Nachweis erbracht (Prüfstelle TÜV Hessen)\n\n(Danach nichts mehr. R. K.)\n',
          },
        ],
      },
      commands: [],
      commandSkillGain: {
        grep: { linux: 2, security: 1 },
        cat: { linux: 1 },
        echo: { linux: 1 },
      },
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            { fileRead: '/srv/mailexport/info/2026-06-24_bundesamt.eml' },
            { fileRead: '/srv/verwaltung/nachweise/ablage_kalb.txt' },
            // Datum UND Fundstelle: eine Zahl ohne Herleitung ist keine Frist.
            { file: '/home/timo/quellen.md', matches: '2027' },
            { file: '/home/timo/quellen.md', matches: '39' },
          ],
          resultText:
            'Im Kataster steht jetzt: Nachweis gegenüber dem Bundesamt, alle drei Jahre nach § 39 BSIG, zuletzt am 13.05.2024, nächste Fälligkeit 2027.\n\nDas Datum allein wäre wertlos gewesen. Mit der Regel daneben kann jeder im Haus nachrechnen — und merkt es, wenn sich die Regel ändert.\n\nMerke: Ein Postfach, das allen gehört, liest niemand. Eine Frist, die dort ankommt, läuft trotzdem.',
          skillGain: { linux: 3, security: 5, troubleshooting: 1 },
          effects: { stress: 2 },
        },
      ],
      hints: [
        '🤖 Jens: In dem Postfach liegt viel Werbung. Du suchst das eine Anschreiben, das von einer Behörde kommt — nach Inhalt zu suchen ist hier schneller als nach Dateinamen.',
        '🤖 Jens: grep kann rekursiv suchen und dir nur die Dateinamen zeigen, in denen etwas vorkommt. Groß- und Kleinschreibung solltest du dabei ignorieren.',
        '🤖 Jens: `grep -ril bundesamt /srv/mailexport/info` listet die Treffer. Danach: das Anschreiben lesen und in /srv/verwaltung/nachweise nachsehen, wann zuletzt nachgewiesen wurde.',
        '🤖 Jens: Drei Jahre auf den letzten Nachweis, und beides aufschreiben — Datum und Fundstelle: `echo "Nachweis 2027 (13.05.2024 + 3 Jahre, 39 BSIG)" >> /home/timo/quellen.md`',
      ],
    },
    tags: ['kataster', 'act2', 'terminal'],
  },

  // ═══════════════════════ AKT 2 — Das Register ════════════════════════════

  // ── Dialog: Jens' einzige Warnung ────────────────────────────────────────
  {
    id: 'kt_jens_warnung',
    weekRange: [6, 7],
    probability: 1,
    category: 'story',
    title: 'Ein Name ist eine Zusage',
    description: `Du sitzt vor dem Kataster mit allem, was du in den letzten Wochen gefunden hast. Vier Zeilen sind offen.

Jens stellt sich dazu, liest kurz mit und sagt genau einen Satz:

„Wenn du einen Namen einträgst, sag der Person Bescheid. Sonst ist es deiner."

Dann geht er wieder. Er wird das nicht wiederholen.`,
    image: undefined,
    involvedCharacters: ['jens'],
    mentorNote:
      'Eine Zuweisung ohne Rückmeldung ist keine Zuweisung, sondern eine Hoffnung. Und eine Abteilung ist kein Aufpasser: Wenn die Zeile „IT-Abteilung" sagt, kann im Audit niemand die Frage beantworten, wann er zuletzt hingesehen hat — weil es kein „er" gibt. Aufpasser sind Personen. Immer.',
    choices: [
      {
        id: 'kt_jens_warnung_verstanden',
        text: 'Nicken. Und dir vornehmen, jede Zuweisung kurz schriftlich zu bestätigen.',
        effects: { skills: { softSkills: 2 } },
        resultText:
          'Zwei Minuten Mehraufwand pro Zeile. Dafür steht am Ende in jeder Zeile ein Mensch, der weiß, dass er drinsteht.',
      },
      {
        id: 'kt_jens_warnung_pragmatisch',
        text: '„Und wenn ich niemanden habe? Dann bleibt die Zeile eben leer."',
        effects: { skills: { security: 2 } },
        resultText:
          '„Dann bleibt sie leer", sagt Jens. „Aber markier sie als Lücke, nicht als vergessen. Eine leere Zelle sieht aus wie ein Versehen. Eine markierte Lücke sieht aus wie eine Entscheidung."\n\nEr hat recht, und es ist ein Unterschied, den man nur einmal erklärt bekommen muss.',
      },
      {
        id: 'kt_jens_warnung_egal',
        text: '„Hauptsache, da steht was drin. Sonst fragt der ISB wieder."',
        effects: { stress: -2 },
        resultText:
          'Jens sagt nichts mehr dazu. Er hat seinen Satz gesagt.\n\nDas Kataster lässt sich schnell grün bekommen. Die Frage ist nur, wer es nachher auseinandernimmt — und ob du dabei danebensitzt.',
      },
    ],
    tags: ['kataster', 'act2', 'dialog'],
  },

  // ── L7 [GUI Kataster] „Das Register" — Herzstück ─────────────────────────
  {
    id: 'kt_l7_kataster',
    weekRange: [6, 7],
    probability: 1,
    category: 'story',
    title: 'Das Register',
    description: `Alles aus vier Wochen, in einer Tabelle. Vier Zeilen sind offen, und für zwei davon gibt es niemanden im Haus.

**Deine Aufgabe:**
- Gib den Zeilen einen Aufpasser, für die es einen gibt — **namentlich**
- Häng die Nachweise an, die tatsächlich vorliegen
- Und markier als Lücke, was keinen Aufpasser haben kann. Nicht leer lassen: **markieren**.`,
    image: undefined,
    involvedCharacters: ['jens', 'isb'],
    mentorNote:
      'Eine unbesetzte Zeile und eine als Lücke markierte Zeile sehen im Betrieb gleich aus — im Audit nicht. Die eine heisst „übersehen", die andere „bekannt, benannt, offen". Der Unterschied kostet einen Klick und entscheidet, ob aus einem Mangel ein Befund wird, den man selbst erhoben hat.',
    choices: [
      {
        id: 'start',
        text: 'Das Kataster durchgehen...',
        effects: {},
        resultText:
          'Vierzehn Pflichten. Zwei davon haben keinen Aufpasser und werden auch keinen bekommen — aber sie stehen jetzt als Lücke drin, mit Datum.\n\nDas ist kein schönes Kataster. Es ist ein wahres.',
        guiCommand: true,
      },
    ],
    guiContext: {
      app: 'kataster',
      title: 'Pflichtenkataster',
      hostname: 'warm-adm-01',
      briefing:
        'Aufpasser sind Personen, keine Abteilungen. Was keinen bekommen kann, wird als Lücke markiert — nicht leer gelassen.',
      state: {
        kataster: {
          title: 'Pflichtenkataster WARM — Stand 09/2026',
          entries: [
            {
              id: 'sla_bericht',
              source: 'SLA Komm.ONE § 4',
              duty: 'Monatlichen Verfügbarkeitsbericht prüfen',
              cycle: 'monatlich',
              sourceExcerpt:
                'Der Auftragnehmer stellt monatlich einen Verfügbarkeitsbericht bereit. Die Minderung ist binnen 30 Tagen nach Zugang anzuzeigen; danach ist sie ausgeschlossen.',
            },
            {
              id: 'lizenznachweis',
              source: 'Rahmenvertrag Lizenzen § 9',
              duty: 'Lizenzbelegung jährlich nachweisen',
              cycle: 'jaehrlich',
              note: 'Vertrag vom Einkauf geschlossen (Frau Petersen)',
              sourceExcerpt:
                'Der Kunde weist dem Auftragnehmer jährlich, jeweils zum 30. Juni, die tatsächliche Belegung der erworbenen Lizenzen nach.',
            },
            {
              id: 'notfallhandbuch',
              source: 'Dienstvereinbarung Protokollierung § 7',
              duty: 'IT-Notfallhandbuch erstellen und fortschreiben',
              cycle: 'anlassbezogen',
              note: 'Dokument existiert nicht — Suche protokolliert',
              sourceExcerpt:
                'Das Nähere regelt das IT-Notfallhandbuch in seiner jeweils gültigen Fassung.',
            },
            {
              id: 'info_postfach',
              source: 'Eigenfeststellung (Postfachexport)',
              duty: 'Sammelpostfach info@ arbeitstäglich sichten',
              note: 'Gehört allen — im Organigramm niemandem',
              sourceExcerpt:
                'Eingang der Aufsicht vom 24.06.2026, elf Wochen ungelesen.',
            },
            {
              id: 'technikwartung',
              source: 'Wartungsvertrag Herold § 3',
              duty: 'Fahrzeugwaagen warten lassen, Protokoll ablegen',
              cycle: 'halbjaehrlich',
              owner: 'bjorg',
              note: 'Letzte sichtbare Aktivität 14.01.2026 — Nachweis fehlt',
            },
            {
              id: 'bsi_nachweis',
              source: '§ 39 BSIG',
              duty: 'Nachweis gegenüber dem Bundesamt erbringen',
              cycle: 'dreijaehrlich',
              owner: 'chef',
              evidenceId: 'nachweis_2024',
              locked: true,
              note: 'Zuletzt 13.05.2024, nächste Fälligkeit 2027',
            },
          ],
          people: [
            { id: 'henry', name: 'Henry Bartels', role: 'Systemtechnik' },
            { id: 'jens', name: 'Jens Adam', role: 'IT-Betrieb' },
            { id: 'petersen', name: 'Frau Petersen', role: 'Zentraler Einkauf' },
            { id: 'chef', name: 'Bert', role: 'IT-Leitung' },
            { id: 'bjorg', name: 'Bjorg Jörgensen', role: 'IT-Betrieb', unconfirmed: true },
            { id: 'it_abteilung', name: 'IT-Abteilung', role: 'Sammelzuweisung', isGroup: true },
          ],
          evidence: [
            {
              id: 'bericht_08',
              label: 'Verfügbarkeitsbericht 08/2026',
              date: '04.09.2026',
              forEntry: 'sla_bericht',
            },
            {
              id: 'nachweis_2024',
              label: 'Nachweis Aufsicht (TÜV Hessen)',
              date: '13.05.2024',
              forEntry: 'bsi_nachweis',
            },
          ],
        },
      },
      // REIHENFOLGE IST TEIL DES DESIGNS: Risiko vor Lob. Wer eine Abteilung
      // als Aufpasser einträgt, hat das Kataster zum Lügen gebracht — das
      // schlägt jede spätere Sorgfalt, genau wie im Ending (§5.3).
      solutions: [
        {
          interactions: ['owner:sla_bericht:it_abteilung'],
          allRequired: false,
          setsFlags: ['kat_owner_fabricated', 'kat_orphan_sla'],
          resultText:
            'Die Zeile ist grün. „IT-Abteilung" steht drin, und niemand hat widersprochen — es war ja auch niemand gefragt worden.\n\nDu klappst das Kataster zu. Es sieht gut aus.',
          skillGain: {},
        },
        {
          interactions: ['owner:info_postfach:it_abteilung'],
          allRequired: false,
          setsFlags: ['kat_owner_fabricated'],
          resultText:
            'Das Sammelpostfach hat jetzt einen Aufpasser: die IT-Abteilung. Also alle. Also weiterhin niemand — nur steht es jetzt anders da.\n\nDu klappst das Kataster zu. Es sieht gut aus.',
          skillGain: {},
        },
        {
          // Der ehrliche Weg: zwei echte Aufpasser, ein echter Nachweis, zwei
          // ausdrücklich markierte Lücken. Fünf Klicks, und das Grid sieht
          // schlechter aus als vorher.
          interactions: [
            'owner:sla_bericht:henry',
            'evidence:sla_bericht:bericht_08',
            'owner:lizenznachweis:petersen',
            'gap:notfallhandbuch',
            'gap:info_postfach',
          ],
          allRequired: true,
          setsFlags: ['kat_no_silent_orphan', 'kat_evidence_linked'],
          resultText:
            'Zwei Zeilen haben einen Menschen, der davon weiß. Eine hat einen Nachweis. Zwei sind als Lücke markiert — mit Datum, sichtbar, nicht wegerklärt.\n\nDas Kataster ist damit zum ersten Mal ein Dokument, das eine Frage beantworten kann statt sie zu beenden.',
          skillGain: { security: 6, softSkills: 3 },
        },
      ],
      hints: [
        '🤖 Jens: Geh die offenen Zeilen einzeln durch und frag dich bei jeder dasselbe: Gibt es hier im Haus jemanden, der das wirklich tut?',
        '🤖 Jens: Bei zwei Zeilen lautet die Antwort ehrlich „niemand". Dafür gibt es einen eigenen Zustand — und der ist besser als ein Name, der nicht stimmt.',
        '🤖 Jens: Der Monatsbericht gehört zu uns: Henry macht das ohnehin, und für August liegt der Bericht schon vor — häng ihn an. Die Lizenzbelegung gehört dem Einkauf, also Frau Petersen.',
        '🤖 Jens: Notfallhandbuch und Sammelpostfach kann heute niemand übernehmen. Markier beide als Lücke. Was du nicht besetzen kannst, benennst du.',
      ],
    },
    tags: ['kataster', 'act2', 'gui'],
  },

  // ═══════════════════════════ AKT 3 — Die Uhr ═════════════════════════════
  //
  // Jeder Payoff hat zwei Varianten: branchCondition (verwaist) vs.
  // alternateEventId (besetzt). Garantierter Payoff statt Chain-Engine —
  // Story-Mode serviert pendingChainEvents nicht.

  // ── Payoff 1a: SLA verwaist → Mahnschreiben ──────────────────────────────
  {
    id: 'kt_mahnung',
    weekRange: [7, 9],
    probability: 1,
    category: 'story',
    title: 'Ein Brief mit Aktenzeichen',
    description: `Die Hauspost bringt einen Umschlag, den sonst niemand aufmacht, weil er an die IT adressiert ist.

Komm.ONE, Vertragsmanagement. Es geht um § 4 des Rahmenvertrags.

Die Verfügbarkeit lag im Mai, Juni und Juli unter 99,5 %. Drei Monate, drei Berichte, jeder pünktlich zugestellt. Die Minderung hätte binnen 30 Tagen nach Zugang angezeigt werden müssen.

Der Brief ist höflich. Er teilt lediglich mit, dass für diese Monate keine Anzeige eingegangen ist und die Ansprüche damit ausgeschlossen sind.

Der Bericht lag jeden Monat im Postfach. Geprüft hat ihn niemand — die Zeile hatte keinen Aufpasser.`,
    image: undefined,
    involvedCharacters: ['chef', 'kaemmerer'],
    mentorNote:
      'Eine nicht geprüfte Service-Level-Zusage ist eine geschenkte Vertragsstrafe. Der Schaden entsteht nicht durch den Ausfall — für den gäbe es eine Minderung — sondern durch die verstrichene Frist, sie geltend zu machen. Genau deshalb hat die Spalte „Aufpasser" einen eigenen Platz neben der Spalte „Pflicht".',
    choices: [
      {
        id: 'kt_mahnung_annehmen',
        text: 'Den Vorgang aufnehmen: Schaden beziffern, Ursache benennen, ins Kataster eintragen.',
        effects: { budget: -4200, skills: { security: 3 }, stress: 6, relationships: { chef: 1 } },
        resultText:
          'Du rechnest es aus: rund 4.200 Euro, die nicht mehr zu holen sind. Dann schreibst du dazu, warum — nicht „technisches Versäumnis", sondern „Zeile ohne Aufpasser, Bericht ging an ein Postfach, das niemand liest".\n\nBert liest es und sagt: „Das ist teuer. Aber es ist das erste Mal, dass mir jemand sagen kann, WARUM." Er trägt es selbst im Kataster nach.',
      },
      {
        id: 'kt_mahnung_kaempfen',
        text: 'Widersprechen: Die Berichte kamen an eine Sammeladresse, das sei keine wirksame Zustellung.',
        effects: { budget: -4200, stress: 10, relationships: { kaemmerer: -2 } },
        resultText:
          'Die Rechtsabteilung der Komm.ONE antwortet in vier Sätzen: Die Adresse sei im Vertrag als Kontaktadresse benannt, und zwar von WARM.\n\nDamit ist es nicht nur teuer, sondern auch noch aktenkundig, dass ihr eine Adresse benannt habt, die ihr nicht lest.',
      },
      {
        id: 'kt_mahnung_weiterreichen',
        text: 'An die Kämmerei weitergeben. Vertragsstrafen sind kein IT-Thema.',
        effects: { budget: -4200, relationships: { kaemmerer: -4 }, stress: 3 },
        resultText:
          'Die Kämmerei gibt es zurück, mit einem Post-it: „Wer hätte den Bericht prüfen müssen?"\n\nDarauf gibt es keine Antwort, die nicht auf euch zeigt. Der Betrag bleibt.',
      },
    ],
    tags: ['kataster', 'act3', 'payoff'],
  },

  // ── Payoff 1b: SLA besetzt → die Minderung wird geholt ───────────────────
  {
    id: 'kt_mahnung_abgewendet',
    weekRange: [7, 9],
    probability: 1,
    category: 'story',
    title: 'Ein Brief mit Aktenzeichen',
    description: `Die Hauspost bringt einen Umschlag von der Komm.ONE, Vertragsmanagement, § 4 des Rahmenvertrags.

Diesmal kommt Henry damit zu dir, bevor du ihn aufmachst — er hat den Vorgang schon.

„Mai, Juni, Juli unter 99,5 %. Ich hab's jeden Monat geprüft, weil es seit August in meiner Zeile steht. Anzeige ist jeweils in der zweiten Woche raus."

Der Brief ist die Bestätigung. Die Minderung wird gutgeschrieben.`,
    image: undefined,
    involvedCharacters: ['chef'],
    mentorNote:
      'Derselbe Ausfall, dasselbe Geld — einmal verloren, einmal geholt. Der ganze Unterschied ist ein Name in einer Spalte und die Frist, die dadurch jemandem aufgefallen ist.',
    choices: [
      {
        id: 'kt_mahnung_abgewendet_gutschrift',
        text: 'Gutschrift entgegennehmen und den Vorgang im Kataster als Nachweis ablegen.',
        effects: { budget: 4200, skills: { security: 2 }, relationships: { chef: 3 }, stress: -4 },
        resultText:
          'Rund 4.200 Euro Gutschrift. Was aber mehr wiegt: die Zeile hat jetzt drei echte Nachweise hintereinander, mit Datum.\n\nBert nimmt den Vorgang mit in die Leitungsrunde. Es ist das erste Mal seit Jahren, dass die IT dort mit einer Zahl auftaucht, die positiv ist.',
      },
      {
        id: 'kt_mahnung_abgewendet_ausbauen',
        text: 'Gutschrift nehmen — und Henry fragen, welche Zeile als Nächstes einen Aufpasser braucht.',
        effects: { budget: 4200, skills: { security: 3, softSkills: 2 }, relationships: { kollegen: 2 }, stress: -2 },
        resultText:
          '„Die Waagen", sagt Henry ohne zu überlegen. „Da steht zwar jemand drin, aber es kommt nichts zurück."\n\nEr hat recht, und er weiß es, weil er jetzt selbst in einer Zeile steht und gemerkt hat, was das bedeutet. So verbreitet sich ein Kataster: nicht über Schulungen, sondern über Leute, die einmal erlebt haben, dass es funktioniert.',
      },
    ],
    tags: ['kataster', 'act3', 'payoff'],
  },

  // ── Payoff 2a: Lizenz verwaist → die Rechnung ────────────────────────────
  {
    id: 'kt_rechnung',
    weekRange: [8, 10],
    probability: 1,
    category: 'story',
    title: 'Die Rechnung für 280',
    description: `Die Jahresrechnung des Systemhauses liegt der Kämmerei vor. Eine Position sticht heraus: Wartung Archiv-Suite, 280 CAL, volles Jahr.

Belegung im gesamten Zeitraum: null.

Die Teilkündigung nach § 10 wäre zum Vertragsjahresende möglich gewesen, mit drei Monaten Frist. Das Vertragsjahr endete vor sechs Wochen.

Die Zeile im Kataster hat bis heute keinen Aufpasser. Es hat also niemand daran gedacht, und es war auch niemand dafür da.`,
    image: undefined,
    involvedCharacters: ['kaemmerer', 'chef'],
    mentorNote:
      'Eine Kündigungsfrist ist eine Pflicht wie jede andere: Sie steht im Vertrag, sie wiederholt sich, und sie verfällt. Der Unterschied zu einer Meldepflicht ist nur, dass niemand mahnt, wenn man sie verpasst — man zahlt einfach weiter.',
    choices: [
      {
        id: 'kt_rechnung_eintragen',
        text: 'Bezahlen, eintragen, Frist fürs nächste Jahr setzen — mit Aufpasser.',
        effects: { budget: -6800, skills: { security: 3 }, stress: 5 },
        resultText:
          'Ein Jahr für nichts, rund 6.800 Euro. Du trägst die Kündigungsfrist als eigene Zeile ein: Quelle § 10, Turnus jährlich, Aufpasser Einkauf, nächste Prüfung drei Monate vor Vertragsjahresende.\n\nDamit passiert es genau einmal. Das ist nicht nichts.',
      },
      {
        id: 'kt_rechnung_verhandeln',
        text: 'Beim Systemhaus anrufen und versuchen, das Kontingent doch noch zu reduzieren.',
        effects: { budget: -5100, stress: 8, skills: { softSkills: 2 } },
        resultText:
          'Der Vertrieb ist freundlich und unnachgiebig: Die Frist steht im Vertrag. Als Geste gibt es eine Reduzierung ab dem nächsten Vertragsjahr und einen kleinen Nachlass auf die laufende Rechnung.\n\nEs bleibt teuer. Aber du weißt jetzt, dass Fristen verhandelbar klingen und es nicht sind.',
      },
      {
        id: 'kt_rechnung_stillhalten',
        text: 'Durchwinken. Die Position steht seit Jahren so drin, das fällt niemandem auf.',
        effects: { budget: -6800, stress: -2, relationships: { kaemmerer: -3 } },
        resultText:
          'Die Rechnung geht durch. Es fällt tatsächlich niemandem auf — bis die Kämmerei im Herbst die Positionen mit der Lizenzliste abgleicht, die du selbst geliefert hast.\n\n„Sie wussten das?", fragt sie. Die Frage ist nicht böse gemeint. Sie ist nur schwer zu beantworten.',
      },
    ],
    tags: ['kataster', 'act3', 'payoff'],
  },

  // ── Payoff 2b: Lizenz übergeben → der Einkauf hat gekündigt ──────────────
  {
    id: 'kt_rechnung_abgewendet',
    weekRange: [8, 10],
    probability: 1,
    category: 'story',
    title: 'Die Rechnung für 40',
    description: `Die Jahresrechnung des Systemhauses liegt vor. Position Archiv-Suite: 40 CAL statt 280.

Frau Petersen hat im Juli fristgerecht teilgekündigt — drei Monate vor Vertragsjahresende, nach § 10. Sie hat es getan, weil die Zeile in ihrem Kataster stand, mit Datum, seit dem Tag, an dem du ihr den Auszug geschickt hast.

In der Mail steht ein Satz, der dir bleiben wird: „Ich hätte das nie gefunden. Es stand ja nirgends."`,
    image: undefined,
    involvedCharacters: ['kaemmerer'],
    mentorNote:
      'Eine Pflicht bei der Stelle, die sie erfüllen kann, ist mehr wert als dieselbe Pflicht bei der Stelle, die sie bemerkt hat. Die IT bemerkt Lizenzlücken — kündigen kann nur der Einkauf.',
    choices: [
      {
        id: 'kt_rechnung_abgewendet_bestaetigen',
        text: 'Die Ersparnis dokumentieren und im Kataster als Nachweis hinterlegen.',
        effects: { budget: 5600, skills: { security: 2 }, relationships: { kaemmerer: 4 }, stress: -3 },
        resultText:
          'Rund 5.600 Euro im Jahr, dauerhaft. Du legst die Kündigungsbestätigung als Nachweis an die Zeile.\n\nDie Kämmerei fragt nach, wo das herkommt. Als sie hört, dass es aus einem Kataster kommt, will sie wissen, was da sonst noch drinsteht. Das ist der Moment, in dem aus einer Liste ein Instrument wird.',
      },
      {
        id: 'kt_rechnung_abgewendet_ausweiten',
        text: 'Anbieten, die restlichen Lizenzpositionen genauso durchzugehen.',
        effects: { budget: 5600, skills: { softSkills: 3, security: 2 }, relationships: { kaemmerer: 5 }, stress: 4 },
        resultText:
          'Ihr geht die Liste gemeinsam durch. Zwei weitere Positionen sind überdimensioniert, eine ist seit 2022 für ein abgeschaltetes System.\n\nEs kostet dich drei Nachmittage. Es bringt dir eine Verbündete in der Kämmerei — und das ist in diesem Haus mehr wert als drei Nachmittage.',
      },
    ],
    tags: ['kataster', 'act3', 'payoff'],
  },

  // ── Payoff 3a: Lücke kaschiert → die Vorstandsfrage ──────────────────────
  {
    id: 'kt_vorstandsfrage',
    weekRange: [9, 11],
    probability: 1,
    category: 'story',
    title: 'Zeigen Sie es mir',
    description: `Leitungsrunde, Dr. Müller hat Michaels Zwischenstand vor sich liegen.

„Herr Michael schreibt, unsere Dienstvereinbarung stütze sich auf ein IT-Notfallhandbuch." Sie blättert. „Ich hätte das gern gesehen. Nicht heute — aber diese Woche."

Es gibt keins. Du weißt das seit Wochen. Auf deinem Laufwerk liegt ein Suchprotokoll mit Datum, das genau das belegt, und du hast es nie weitergegeben.

Bjorg sieht dich nicht an.`,
    image: undefined,
    involvedCharacters: ['gf', 'chef', 'kollege'],
    mentorNote:
      'Verschwiegenes Wissen wird mit der Zeit teurer, nicht billiger. Aus „uns fehlt ein Dokument" wird „uns fehlt ein Dokument, und die IT wusste es seit sechs Wochen" — und die zweite Aussage beantwortet eine Frage, die niemand gestellt hätte.',
    choices: [
      {
        id: 'kt_vorstandsfrage_sofort',
        text: 'Sofort sagen, dass es das Handbuch nicht gibt — und dass du es seit dem 14. weißt.',
        effects: { stress: 12, skills: { softSkills: 3, security: 2 }, relationships: { gf: -1, chef: 1 } },
        resultText:
          'Es wird still. Dr. Müller fragt genau das, was du befürchtet hast: „Seit wann?"\n\nDu sagst das Datum. Sie notiert es. „Danke für die Ehrlichkeit. Beim nächsten Mal am selben Tag." Kein Donnerwetter — aber ein Satz, den du nicht noch einmal hören willst.\n\nDie Lücke ist jetzt offen. Der Umweg über sechs Wochen war umsonst und teuer zugleich.',
      },
      {
        id: 'kt_vorstandsfrage_ausweichen',
        text: '„Ich schau nach, wo das abgelegt ist." — und danach ein Handbuch improvisieren.',
        effects: { stress: 16, relationships: { gf: -4, chef: -3 } },
        resultText:
          'Zwei Abende später liegt ein achtseitiges Dokument vor, das aussieht wie ein Notfallhandbuch und keins ist. Es hat kein Datum, keine Freigabe und keine Abstimmung mit dem Personalrat — den eine Dienstvereinbarung zwingend voraussetzt.\n\nMichael findet das beim nächsten Termin in vier Minuten. Aus einer fehlenden Unterlage ist eine erfundene geworden, und das ist eine andere Kategorie.',
      },
      {
        id: 'kt_vorstandsfrage_bjorg',
        text: 'Auf Bjorg zeigen: Er hat gesagt, man solle das nicht aufmachen.',
        effects: { stress: 8, relationships: { kollegen: -6, gf: -2 } },
        resultText:
          'Bjorg widerspricht nicht. Er sagt nur: „Ich bin nicht für die Dokumentation zuständig."\n\nEr hat recht — es steht in keiner Zeile, dass er es ist. Genau das ist das Problem, das du hättest lösen sollen, und genau davon redet jetzt niemand mehr.\n\nDie Runde endet ohne Ergebnis. Was bleibt, ist eine IT, die sich vor der Geschäftsführung gestritten hat.',
      },
    ],
    tags: ['kataster', 'act3', 'payoff'],
  },

  // ── Payoff 3b: Lücke gemeldet → dieselbe Frage, andere Tonlage ───────────
  {
    id: 'kt_vorstandsfrage_gemeldet',
    weekRange: [9, 11],
    probability: 1,
    category: 'story',
    title: 'Sie wussten das',
    description: `Leitungsrunde, Dr. Müller hat Michaels Zwischenstand vor sich liegen.

„Herr Michael schreibt, unsere Dienstvereinbarung stütze sich auf ein Notfallhandbuch, das es nicht gibt." Sie sieht auf. „Sie wussten das."

Es ist keine Anklage. Es ist eine Feststellung — sie hat euren Vermerk vor sechs Wochen selbst gelesen.

„Dann reden wir jetzt darüber, was es kostet, das zu schreiben."`,
    image: undefined,
    involvedCharacters: ['gf', 'chef'],
    mentorNote:
      'Eine selbst gemeldete Lücke verändert die Frage: nicht mehr „warum wusste das niemand", sondern „was kostet die Behebung". Das ist derselbe Mangel in einem Gespräch, das man gewinnen kann.',
    choices: [
      {
        id: 'kt_vorstandsfrage_gemeldet_budget',
        text: 'Aufwand beziffern: extern begleitet, mit Personalrat, realistisch im ersten Quartal.',
        effects: { budget: 9000, skills: { softSkills: 4, security: 2 }, relationships: { gf: 4, chef: 3 }, stress: 3 },
        resultText:
          'Du hast die Zahl vorbereitet, weil du seit sechs Wochen weißt, dass die Frage kommt. Dr. Müller genehmigt das Budget in derselben Sitzung.\n\n„Sehen Sie", sagt sie zu Bert, „so möchte ich das immer haben. Nicht die Überraschung, sondern den Preis."',
      },
      {
        id: 'kt_vorstandsfrage_gemeldet_intern',
        text: 'Anbieten, es intern zu schreiben — günstiger, aber es dauert.',
        effects: { skills: { security: 3 }, relationships: { gf: 2 }, stress: 10 },
        resultText:
          '„Wenn Sie das schaffen, gern", sagt Dr. Müller. „Aber ich will einen Termin, keinen Vorsatz."\n\nDu nennst einen. Er ist knapp, und du wirst ihn halten müssen — neben allem anderen. Die Lücke schließt sich dadurch, aber sie schließt sich auf deine Kosten.',
      },
    ],
    tags: ['kataster', 'act3', 'payoff'],
  },

  // ── Bjorg beansprucht vier Zeilen ────────────────────────────────────────
  {
    id: 'kt_bjorg_vier',
    weekRange: [9, 11],
    probability: 1,
    category: 'story',
    title: 'Mach ich alles',
    description: `Bjorg hat das Kataster gesehen. Jetzt steht er in der Tür, gut gelaunt.

„Du, die vier Zeilen da — Waagen, Archiv, Firewall-Sichtung, das Postfach. Mach ich alles. Trag mich ein."

Er meint es nicht böse. Er meint es sogar ernst, in dem Moment, in dem er es sagt.

Bei der Technikwartung steht er seit drei Jahren drin. Die letzte sichtbare Aktivität ist vom 14. Januar.`,
    image: undefined,
    involvedCharacters: ['kollege', 'jens'],
    mentorNote:
      'Mündliche Zusagen sind keine Zuweisungen. Nicht weil Kollegen unehrlich wären, sondern weil niemand sich an vier Zeilen erinnert, die er im Türrahmen übernommen hat. Eine Zuweisung wird erst durch die Rückmeldung verbindlich — und die Rückmeldung ist zugleich der erste Nachweis der Zeile.',
    choices: [
      {
        id: 'kt_bjorg_vier_bestaetigen',
        text: '„Mach ich. Ich schick dir die vier Zeilen per Mail — antworte kurz mit ok."',
        effects: { skills: { softSkills: 4, security: 3 }, relationships: { kollegen: 1 }, stress: 2 },
        resultText:
          'Die Mail geht raus: vier Zeilen, je ein Satz, je ein Turnus. Bjorg antwortet nach zwei Tagen mit „ok" und streicht zwei davon: „Firewall macht Henry. Postfach will ich nicht."\n\nDas ist mehr wert als vier Zusagen: zwei Zeilen sind jetzt verbindlich besetzt, und zwei sind ehrlich offen. Die Mail liegt im Kataster als Nachweis.',
        setsFlags: ['kat_ownership_confirmed'],
      },
      {
        id: 'kt_bjorg_vier_eintragen',
        text: 'Eintragen, wie er es gesagt hat. Er hat es ja angeboten.',
        effects: { stress: -3 },
        resultText:
          'Vier Zeilen, ein Name, dreißig Sekunden. Das Kataster sieht deutlich besser aus als heute Morgen.\n\nBjorg hat inzwischen ein anderes Thema. Ob er sich an die vier Zeilen erinnert, wird sich zeigen — zum ersten Mal vermutlich dann, wenn jemand danach fragt.',
        setsFlags: ['kat_owner_fabricated'],
      },
      {
        id: 'kt_bjorg_vier_ablehnen',
        text: '„Danke — aber ich trag niemanden ein, der nicht schriftlich zugesagt hat."',
        effects: { skills: { security: 2 }, relationships: { kollegen: -2 } },
        resultText:
          '„Auch gut", sagt Bjorg, leicht pikiert, und geht.\n\nDie vier Zeilen bleiben offen. Das ist korrekt und fühlt sich trotzdem falsch an — du hattest gerade jemanden, der wollte, und hast ihn weggeschickt, statt es festzuhalten.',
      },
    ],
    tags: ['kataster', 'act3', 'dialog'],
  },

  // ── Die Eskalation: offene Lücken schriftlich nach oben ──────────────────
  {
    id: 'kt_eskalation',
    weekRange: [10, 11],
    probability: 1,
    category: 'story',
    title: 'Was offen bleibt',
    description: `Michael kommt in einer Woche. Im Kataster stehen vier Zeilen, die heute niemand übernehmen kann — und die auch nächste Woche niemand übernehmen wird.

Die Frage ist nicht mehr, ob du sie schließt. Die Frage ist, wer außer dir davon weiß.`,
    image: undefined,
    mailCompose: {
      from: 'timo@warm-rhein-main.de',
      to: 'bert@warm-rhein-main.de',
      cc: 'mueller@warm-rhein-main.de',
      subject: 'Pflichtenkataster — offene Punkte, Stand 09/2026',
    },
    involvedCharacters: ['chef', 'gf'],
    mentorNote:
      'Eskalation ist keine Beschwerde, sondern eine Übergabe. Wer eine offene Pflicht schriftlich, mit Datum und an die entscheidungsbefugte Stelle meldet, dreht die Bringschuld: Ab diesem Zeitpunkt ist die Lücke ein Thema der Leitung. Ohne diesen Schritt bleibt sie ein Thema dessen, der sie gefunden hat.',
    choices: [
      {
        id: 'kt_eskalation_schriftlich',
        text: 'Schriftlich, mit Datum, an Bert — CC Geschäftsführung. Vier Zeilen, je zwei Sätze.',
        effects: { skills: { softSkills: 4, security: 3 }, relationships: { chef: 2, gf: 2 }, stress: -2 },
        resultText:
          'Kein Vorwurf, keine Forderung. Nur: Diese vier Pflichten bestehen, für diese vier gibt es heute keinen Aufpasser, hier ist jeweils die Fundstelle.\n\nBert antwortet mit einem Satz: „Verstanden, ich nehm es in die Leitungsrunde." Damit liegt es dort — nicht geschlossen, aber auch nicht mehr allein deins.',
        setsFlags: ['kat_gaps_escalated'],
      },
      {
        id: 'kt_eskalation_muendlich',
        text: 'Bert beim Kaffee davon erzählen. Er weiß ja im Grunde Bescheid.',
        effects: { relationships: { chef: 1 }, stress: 2 },
        resultText:
          '„Ja, das müssen wir angehen", sagt Bert, und er meint es.\n\nEs gibt keine Mail, kein Datum und nichts, worauf man sich später berufen kann. Wenn Michael fragt, wer von den offenen Punkten weiß, lautet die ehrliche Antwort: zwei Leute, ungefähr, seit ungefähr.',
      },
      {
        id: 'kt_eskalation_selbst',
        text: 'Nichts melden. Du arbeitest sie bis zum Termin selbst so weit wie möglich ab.',
        effects: { stress: 14, skills: { security: 2 } },
        resultText:
          'Du schaffst eineinhalb von vier. Der Rest bleibt, wie er war, und steht im Kataster als das, was er ist.\n\nNur weiß es weiterhin niemand außer dir. Im Audit wird die Frage nicht lauten, wie viel du geschafft hast, sondern wer von den Lücken wusste — und dann stehst du allein da, mit einer sehr ehrlichen Liste.',
      },
    ],
    tags: ['kataster', 'act3', 'dialog'],
  },

  // ── L8 [CLI Linux, optional ★] „Was in dreißig Tagen fällig wird" ────────
  {
    id: 'kt_l8_fristen',
    weekRange: [10, 11],
    probability: 1,
    category: 'story',
    title: 'Was in dreißig Tagen fällig wird ★',
    description: `Das Kataster liegt jetzt auch als Export vor, eine Zeile pro Pflicht, mit der nächsten Prüfung als Datum.

Henry hat einen Vorschlag: „Das Monitoring liest alles, was in \`/srv/monitoring/inbox\` liegt, und schickt es montags an den Bereitschaftsverteiler. Wenn deine Fristenliste da reinfällt, muss niemand mehr dran denken."

Heute ist der 11.09.2026. Interessant ist, was bis zum 11.10.2026 fällig wird.

**Deine Aufgabe:**
- Sieh dir den Kataster-Export an
- Zieh die Zeilen heraus, deren nächste Prüfung **bis zum 11.10.2026** fällig ist (\`awk\`)
- Schreib das Ergebnis nach \`/srv/monitoring/inbox/kataster_faellig.txt\``,
    image: undefined,
    involvedCharacters: ['henry'],
    mentorNote:
      'ISO-Daten (JJJJ-MM-TT) lassen sich als Zeichenketten vergleichen — „2026-10-10" ist kleiner als „2026-10-11", ganz ohne Datumsrechnung. Deshalb ist `awk -F\';\' \'$4 <= "2026-10-11"\'` eine vollständige Fristenprüfung. Und deshalb schreibt man Datumsangaben in einem Kataster nie als 10.10.2026: in diesem Format sortiert und vergleicht sich nichts mehr.',
    choices: [
      {
        id: 'start',
        text: 'Den Export durchgehen...',
        effects: {},
        resultText:
          'Zwei Pflichten werden in den nächsten dreißig Tagen fällig. Die Liste liegt jetzt dort, wo das Monitoring hinsieht — sie kommt am Montag von selbst, ohne dass jemand daran denkt.\n\nDas ist der Unterschied zwischen einem Kataster und einem Kalender: Das eine weiß es, das andere sagt es.',
        terminalCommand: true,
        setsFlags: ['kat_reminder_live'],
      },
      {
        // Ein optionales Level muss ablehnbar sein, sonst ist es keins.
        id: 'kt_l8_spaeter',
        text: 'Später. Bis zum Audit ist noch anderes wichtiger.',
        effects: { stress: -2 },
        resultText:
          'Die Fristen stehen im Kataster. Dass sie dort stehen, heißt nur, dass jemand nachsehen muss — und dieser Jemand bist bis auf Weiteres du.\n\nHenry zuckt mit den Schultern: „Das Postfach ist ja da. Meld dich, wenn du magst."',
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'warm-adm-01',
      username: 'timo',
      currentPath: '/home/timo',
      taskText:
        'Kataster-Export lesen; mit awk die Zeilen herausziehen, deren nächste Prüfung bis 2026-10-11 fällig ist; Ergebnis nach /srv/monitoring/inbox/kataster_faellig.txt schreiben.',
      vfsOverlay: {
        directories: ['/srv/kataster', '/srv/monitoring/inbox'],
        files: [
          {
            path: '/srv/kataster/pflichten.csv',
            content:
              'quelle;pflicht;aufpasser;naechste_pruefung\nSLA Komm.ONE 4;Verfügbarkeitsbericht prüfen;Henry Bartels;2026-10-05\nRahmenvertrag Lizenzen 9;Lizenzbelegung nachweisen;Frau Petersen;2027-06-30\n39 BSIG;Nachweis gegenüber dem Bundesamt;Bert;2027-05-13\nWartungsvertrag Herold 3;Waagen warten lassen;Bjorg Jörgensen;2026-10-09\nDV Protokollierung 7;Notfallhandbuch fortschreiben;(Lücke);2027-01-31\nEigenfeststellung;Sammelpostfach sichten;(Lücke);2026-12-01\n',
          },
          {
            path: '/srv/monitoring/inbox/README.txt',
            content:
              'Alles, was hier liegt, geht montags 07:00 an den Bereitschaftsverteiler.\nEine Datei pro Thema. Wird nicht gelöscht, nur überschrieben.\n',
          },
        ],
      },
      commands: [],
      commandSkillGain: {
        awk: { linux: 3, troubleshooting: 2 },
        cat: { linux: 1 },
        sort: { linux: 1 },
      },
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            { fileRead: '/srv/kataster/pflichten.csv' },
            // Wirklich gefiltert, nicht abgetippt: awk muss gelaufen sein …
            { commandRan: { pattern: '^\\s*awk\\b', outcome: 'succeeded' } },
            // … und beide fälligen Zeilen müssen drinstehen …
            { file: '/srv/monitoring/inbox/kataster_faellig.txt', matches: '2026-10-05' },
            { file: '/srv/monitoring/inbox/kataster_faellig.txt', matches: '2026-10-09' },
            // … und keine der späteren. Ein "cat > datei" der ganzen CSV
            // erfüllt die Aufgabe damit nicht: Filtern ist der Punkt.
            { file: '/srv/monitoring/inbox/kataster_faellig.txt', absentMatches: '2027-' },
          ],
          resultText:
            'Zwei Zeilen: der Verfügbarkeitsbericht am 05.10. und die Waagenwartung am 09.10. Alles aus 2027 ist draußen geblieben.\n\nAb Montag geht die Liste automatisch raus. Wer dann nichts tut, tut es wenigstens nicht aus Unwissenheit.\n\nMerke: Fristen gehören nicht in Köpfe, sondern dorthin, wo ohnehin jemand hinsieht.',
          skillGain: { linux: 5, security: 3, troubleshooting: 3 },
          effects: { stress: -4 },
        },
      ],
      hints: [
        '🤖 Henry: Der Export hat eine Spalte mit dem nächsten Prüfdatum. Du brauchst nur die Zeilen, die vor einem Stichtag liegen.',
        '🤖 Henry: Die Daten stehen als JJJJ-MM-TT drin. In dem Format kannst du sie direkt als Text vergleichen — kleiner heißt früher, ganz ohne Datumsrechnung.',
        '🤖 Henry: `awk -F\';\' \'$4 <= "2026-10-11"\' /srv/kataster/pflichten.csv` gibt dir die fälligen Zeilen.',
        '🤖 Henry: Und das Ergebnis umleiten, damit das Monitoring es findet: `... > /srv/monitoring/inbox/kataster_faellig.txt`',
      ],
    },
    tags: ['kataster', 'act3', 'terminal', 'optional'],
  },
];
