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
];
