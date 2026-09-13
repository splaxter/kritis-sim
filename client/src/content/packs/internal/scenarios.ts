// Internal NPCs - Scenarios
import { Scenario } from '@kritis/shared';

/* ── Nachweise für INTERN-SC-003 (Statusbericht) ───────────────────────────
 *
 * Die Falle steht in zwei Dateien, nicht in einer: Das Sicherungsprotokoll
 * sieht makellos aus — 30 von 30 Läufen erfolgreich. Dass seit anderthalb
 * Jahren niemand geprüft hat, ob sich daraus etwas WIEDERHERSTELLEN lässt,
 * steht woanders. Wer nur das Protokoll liest, meldet Grün.
 */

const nachweisSicherung = `Sicherungsprotokoll Dispo-Server — Juni 2026
Auftrag: "Dispo täglich", 02:00 Uhr, Ziel Bandbibliothek B2

01.06. erfolgreich   11.06. erfolgreich   21.06. erfolgreich
02.06. erfolgreich   12.06. erfolgreich   22.06. erfolgreich
03.06. erfolgreich   13.06. erfolgreich   23.06. erfolgreich
04.06. erfolgreich   14.06. erfolgreich   24.06. erfolgreich
05.06. erfolgreich   15.06. erfolgreich   25.06. erfolgreich
06.06. erfolgreich   16.06. erfolgreich   26.06. erfolgreich
07.06. erfolgreich   17.06. erfolgreich   27.06. erfolgreich
08.06. erfolgreich   18.06. erfolgreich   28.06. erfolgreich
09.06. erfolgreich   19.06. erfolgreich   29.06. erfolgreich
10.06. erfolgreich   20.06. erfolgreich   30.06. erfolgreich

30 von 30 Läufen ohne Fehler.
`;

const nachweisWiederherstellung = `Wiederherstellung — Protokolle
Ablage: /srv/nachweise/wiederherstellung.txt

Ein erfolgreicher Sicherungslauf belegt, dass Daten geschrieben wurden.
Er belegt NICHT, dass sie sich zurückholen lassen.

Letzter dokumentierter Wiederherstellungstest: 14.11.2024 (Teilrestore Dispo).
Seither: keiner. Zwei Termine angesetzt (03/2026, 05/2026), beide wegen
Tagesgeschäft abgesagt. Kein Protokoll vorhanden.
`;

const nachweisEndpoint = `Endpunktschutz — Stand 30.06.2026
Verwaltete Geräte: 151
Mit aktuellem Schutz: 151
Älteste Signatur: 4 Stunden
Letzte Prüfung: 30.06.2026, Protokoll im Verwaltungsportal.
`;

const nachweisFirewall = `Perimeter — Stand 30.06.2026
Geräte: 2x Sophos XGS 2100, in Betrieb seit 12.05.2026
Herstellerunterstützung: vertraglich bis 05/2031
Regelwerk zuletzt geprüft: 08.06.2026, Protokoll abgelegt.
`;

const nachweisNis2 = `NIS-2 / BSIG — Stand 30.06.2026
Registrierung beim BSI: erfolgt 02/2026.
Meldewege dokumentiert und im Leitstand ausgehängt: ja.

Nachweis nach § 39 BSIG (alle drei Jahre gegenüber dem BSI zu erbringen):
bislang nicht erbracht. Kein Termin, kein Prüfer beauftragt, kein Budget.
`;

export const internalScenarios: Scenario[] = [
  {
    id: 'INTERN-SC-001',
    title: 'Budget-Battle: Neue Firewalls',
    category: 'budget_politics',
    difficulty: 3,
    flavorText: 'Die Sophos-Firewalls sind 7 Jahre alt und laufen aus dem Support. Du brauchst neue Hardware - Kostenpunkt: 45.000 Euro. Dein Chef nickt, aber sagt: "Das musst du bei der Hoffmann durchboxen. Viel Glück." Termin bei der Kämmerin ist in einer Stunde.',
    urgency: 'medium',
    choices: [
      {
        id: 'A',
        text: 'Mit technischen Details argumentieren: "End-of-Life bedeutet keine Sicherheits-Updates mehr..."',
        outcome: 'FAIL',
        consequence: 'Die Kämmerin unterbricht nach 30 Sekunden: "Ich verstehe kein Wort. Warum sollte ich 45.000 Euro ausgeben für etwas, das noch funktioniert?" Sie verweist auf den nächsten Haushaltszyklus in 8 Monaten.',
        scoreChange: -50,
        reputationChange: -10,
        lesson: 'Technische Details interessieren Finanzleute nicht. Du musst in ihrer Sprache sprechen: Risiken, Kosten, Compliance.',
      },
      {
        id: 'B',
        text: 'Risiko-basiert argumentieren: "Ohne Updates haften wir bei einem Einbruch. NIS2 verlangt aktuelle Systeme."',
        outcome: 'SUCCESS',
        consequence: 'Die Kämmerin wird aufmerksam bei "Haftung". Sie fragt nach Dokumentation der Compliance-Anforderung. Du zeigst den NIS2-Artikel. Sie seufzt: "Schreiben Sie mir das auf, mit Kostenvergleich zu einem Sicherheitsvorfall. Dann reden wir nochmal."',
        scoreChange: 75,
        reputationChange: 10,
        lesson: 'Kämmerer verstehen Haftungsrisiken. NIS2 und KRITIS-Compliance sind starke Argumente, aber du musst sie belegen können.',
      },
      {
        id: 'C',
        text: 'Kosten eines Ausfalls gegenrechnen: "Ein Tag Ausfall kostet uns 80.000 Euro an Produktivität. Die Firewall kostet 45.000 und hält 7 Jahre."',
        outcome: 'PERFECT',
        consequence: 'Die Kämmerin macht eine Notiz. "Diese Rechnung gefällt mir. Pro Jahr sind das..." Sie rechnet. "...6.400 Euro. Das ist ein Argument." Sie genehmigt unter der Bedingung, dass du drei Angebote einholst und das günstigste nimmst.',
        scoreChange: 150,
        reputationChange: 20,
        lesson: 'ROI in Euro ist die Sprache der Finanzabteilung. Immer Ausfallkosten gegen Investitionskosten rechnen. TCO (Total Cost of Ownership) über die Lebensdauer verteilen.',
      },
      {
        id: 'D',
        text: 'Den Chef vorschicken: "Herr Bergmann, können Sie das nicht mit Frau Hoffmann klären?"',
        outcome: 'PARTIAL_SUCCESS',
        consequence: 'Der Chef seufzt, geht aber zu Frau Hoffmann. Sie genehmigt, aber merkt sich, dass du "nicht selbst kämpfen kannst". Beim nächsten Mal sagt der Chef: "Das machst DU. Lerneffekt." Dein Standing bei beiden sinkt leicht.',
        scoreChange: 25,
        reputationChange: -5,
        lesson: 'Den Vorgesetzten vorschicken funktioniert kurzfristig, schadet aber langfristig deinem Ruf. Budget-Verhandlungen gehören zu deinem Job.',
      },
    ],
    realWorldReference: 'IT-Budgetgespräche scheitern oft an fehlender Übersetzung zwischen technischer Notwendigkeit und Geschäftssprache.',
    bsiReference: 'BSI IT-Grundschutz: ORP.1 Organisation, ORP.5 Compliance Management',
    involvedNpcs: ['INTERN-KAEMMERER', 'INTERN-CHEF'],
    tags: ['budget', 'firewall', 'compliance', 'kaemmerer'],
  },
  {
    id: 'INTERN-SC-002',
    title: 'Performance Review: Das Jahresgespräch',
    category: 'team_dynamics',
    difficulty: 2,
    flavorText: 'Mitarbeiterjahresgespräch mit dem Chef. Er hat deine Ticket-Statistiken, die Projektergebnisse und das Feedback aus der Fachabteilung vor sich liegen. Die Zahlen sind gut, aber nicht herausragend. Er fragt: "Wie siehst du das vergangene Jahr? Und was sind deine Ziele?"',
    urgency: 'low',
    choices: [
      {
        id: 'A',
        text: 'Ehrlich reflektieren: "Ich habe viel gelernt, aber die AMSE-Situation hätte ich besser managen können."',
        outcome: 'PERFECT',
        consequence: 'Der Chef nickt anerkennend. "Selbstreflexion ist wichtig. Was würdest du anders machen?" Ihr habt ein konstruktives Gespräch. Er schlägt vor, dich zur Fortbildung "Vendor Management" zu schicken. Das Gespräch endet positiv.',
        scoreChange: 100,
        reputationChange: 15,
        lesson: 'Ehrliche Selbstreflexion wird mehr geschätzt als Selbstbeweihräucherung. Zeige, dass du aus Fehlern lernst.',
      },
      {
        id: 'B',
        text: 'Erfolge hervorheben: "Die Firewall-Migration lief reibungslos und unter Budget."',
        outcome: 'SUCCESS',
        consequence: 'Der Chef notiert es. "Stimmt, das war gut." Aber er hakt nach: "Und die drei Wochen VPN-Probleme im Februar? Was war da los?" Du bist in der Defensive. Das Gespräch wird neutral.',
        scoreChange: 50,
        reputationChange: 5,
        lesson: 'Erfolge präsentieren ist wichtig, aber der Chef kennt auch die Probleme. Proaktiv ansprechen ist besser als ausweichen.',
      },
      {
        id: 'C',
        text: 'Auf Beförderung hinarbeiten: "Ich sehe mich als zukünftigen stellvertretenden IT-Leiter."',
        outcome: 'PARTIAL_SUCCESS',
        consequence: 'Der Chef zieht die Augenbrauen hoch. "Ambitioniert. Was qualifiziert dich dafür?" Du hast keine überzeugende Antwort vorbereitet. Er sagt: "Zeig mir in den nächsten 12 Monaten Leadership, dann reden wir." Du hast dich festgelegt ohne Plan.',
        scoreChange: 25,
        reputationChange: 0,
        lesson: 'Karriereambitionen äußern ist ok, aber nur mit konkretem Plan und Belegen für Qualifikation. Sonst wirkt es wie leere Worte.',
      },
      {
        id: 'D',
        text: 'Mehr Gehalt fordern: "Bei meiner Arbeitsbelastung ist eine Gehaltsanpassung angemessen."',
        outcome: 'FAIL',
        consequence: 'Der Chef wird reserviert. "Das ist ein Mitarbeitergespräch, kein Gehaltsgespräch. Das läuft über HR und Tarifvertrag. Du weißt das." Der Rest des Gesprächs ist angespannt. Er empfiehlt, sich zu informieren wie Gehaltsverhandlungen im öffentlichen Dienst funktionieren.',
        scoreChange: -50,
        reputationChange: -10,
        lesson: 'Gehaltsfragen haben eigene Prozesse (besonders im öffentlichen Dienst/TVöD). Im Jahresgespräch ist das deplatziert und zeigt fehlendes Prozessverständnis.',
      },
    ],
    realWorldReference: 'Jahresgespräche sind entscheidend für die Karriere. Vorbereitung und Selbstreflexion sind Schlüssel.',
    bsiReference: 'BSI IT-Grundschutz: ORP.2 Personal',
    involvedNpcs: ['INTERN-CHEF'],
    tags: ['career', 'performance', 'personal', 'chef'],
  },
  {
    id: 'INTERN-SC-003',
    title: 'GF will Statusbericht für den Aufsichtsrat',
    category: 'compliance',
    difficulty: 3,
    flavorText: 'Dr. Krause ruft an. "Ich brauche bis morgen früh einen Statusbericht IT-Sicherheit für die Aufsichtsratssitzung. Eine Seite maximal. Verständlich für Nicht-Techniker. Und seien Sie ehrlich, aber nicht alarmistisch." Das ist in 18 Stunden.',
    urgency: 'high',
    choices: [
      {
        id: 'A',
        text: 'Die Nachweise durchgehen und die offenen Punkte zusammenstellen',
        outcome: 'PERFECT',
        // Der Ergebnistext behauptet nichts über die Aufsichtsratssitzung —
        // die findet erst morgen statt, und was dort beschlossen wird, hat der
        // Spieler nicht in der Hand.
        consequence: 'Du schickst Dr. Krause eine Seite: zwei offene Punkte, jeder mit einem Satz, woran man das sieht. Seine Antwort um 23:40: "Das ist das erste Mal, dass ich einen IT-Bericht verstehe, ohne nachzufragen. Der Punkt mit dem Wiederherstellungstest kommt morgen als Erstes dran."',
        scoreChange: 200,
        reputationChange: 25,
        lesson: 'Ein Statusbericht ist eine Aussage über Nachweise, nicht über Gefühle. Und ein erfolgreicher Sicherungslauf ist kein Nachweis, dass eine Wiederherstellung gelingt — das sind zwei verschiedene Behauptungen und zwei verschiedene Protokolle.',
        terminalCommand: true,
      },
      {
        id: 'B',
        text: 'Nur die Erfolge darstellen, Probleme weglassen',
        outcome: 'FAIL',
        consequence: 'Dein Bericht ist eine Seite "Alles super". Dr. Krause ist skeptisch: "Das glaube ich nicht. Kein IT-Bereich ist problemfrei." Er verlangt einen ehrlichen Bericht. Du musst nacharbeiten und hast das Vertrauen beschädigt.',
        scoreChange: -100,
        reputationChange: -15,
        lesson: 'Ein reiner Erfolgsbericht ist unglaubwürdig. Führungskräfte schätzen ehrliche Risikoeinschätzung mehr als Schönfärberei.',
      },
      {
        id: 'C',
        text: 'Alle technischen Probleme detailliert auflisten',
        outcome: 'PARTIAL_SUCCESS',
        consequence: 'Dein Bericht ist drei Seiten lang, voller Fachbegriffe. Dr. Krause: "Das kann ich dem Aufsichtsrat nicht zeigen. Die verstehen das nicht und bekommen Panik." Du musst auf eine Seite kürzen und vereinfachen.',
        scoreChange: 25,
        reputationChange: 0,
        lesson: 'Der Aufsichtsrat ist kein technisches Gremium. Management-Berichte müssen auf einer Seite das Wesentliche transportieren.',
      },
      {
        id: 'D',
        text: 'Den Chef bitten, den Bericht zu schreiben',
        outcome: 'SUCCESS',
        consequence: 'Der Chef macht es, ist aber nicht begeistert: "Das hättest du auch gekonnt." Du verpasst eine Chance, dich beim GF zu profilieren. Der Chef macht einen soliden Bericht, aber erwähnt deinen Namen nicht.',
        scoreChange: 50,
        reputationChange: -5,
        lesson: 'Delegieren an den Chef funktioniert, aber jede Gelegenheit, direkt mit dem GF zu interagieren, ist eine Karrierechance.',
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'warm-adm-01',
      username: 'timo',
      currentPath: '/srv/nachweise',
      taskText:
        '/srv/nachweise durchsehen. Ergebnis nach /home/timo/statusbericht.md:\noffen: <die offenen Punkte, per Komma getrennt>\nBelegtes gehört NICHT in die offen-Zeile.',
      vfsOverlay: {
        directories: ['/srv/nachweise'],
        files: [
          { path: '/srv/nachweise/sicherung_juni.txt', content: nachweisSicherung },
          { path: '/srv/nachweise/wiederherstellung.txt', content: nachweisWiederherstellung },
          { path: '/srv/nachweise/endpunktschutz.txt', content: nachweisEndpoint },
          { path: '/srv/nachweise/perimeter.txt', content: nachweisFirewall },
          { path: '/srv/nachweise/nis2.txt', content: nachweisNis2 },
        ],
      },
      commands: [],
      commandSkillGain: { cat: { linux: 1 }, grep: { linux: 2 }, ls: { linux: 1 } },
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            // Ohne diese Datei gelesen zu haben, kann niemand wissen, dass die
            // makellose Sicherungsbilanz nichts über Wiederherstellung sagt.
            { fileRead: '/srv/nachweise/wiederherstellung.txt' },
            { fileRead: '/srv/nachweise/nis2.txt' },
            // Beide offenen Punkte in der offen-ZEILE, nicht irgendwo im Text.
            { file: '/home/timo/statusbericht.md', matches: '^offen:.*[Ww]iederherstellung' },
            { file: '/home/timo/statusbericht.md', matches: '^offen:.*([Nn]achweis|39)' },
            // Alles als offen zu melden ist keine Bewertung, sondern ein
            // Abschreiben des Ordners.
            //
            // Die Sperre hängt an der offen-ZEILE, nicht an der ganzen Datei:
            // „Endpunktschutz und Perimeter sind belegt" ist eine richtige
            // Feststellung und darf den Abschluss nicht verhindern.
            {
              file: '/home/timo/statusbericht.md',
              absentMatches: '^offen:.*([Ee]ndpunktschutz|[Ee]ndpoint|[Pp]erimeter|[Ff]irewall)',
            },
          ],
          resultText:
            'Zwei offene Punkte, und beide stehen nicht dort, wo man sie vermutet.\n\nDie Sicherung lief 30 von 30 Nächten durch — das ist ein Nachweis darüber, dass geschrieben wurde, und über sonst nichts. Der letzte dokumentierte Wiederherstellungstest liegt im November 2024; zwei Termine seither wurden abgesagt. Und der Nachweis nach § 39 BSIG ist alle drei Jahre gegenüber dem BSI zu erbringen — bisher gibt es dafür weder Termin noch Prüfer.\n\nEndpunktschutz und Perimeter sind belegt in Ordnung. Sie in den Bericht zu schreiben hätte ihn länger gemacht und schwächer.',
          skillGain: { security: 5, softSkills: 5, troubleshooting: 2 },
          effects: {},
        },
      ],
      hints: [
        'Fünf Nachweise liegen im Ordner. Drei davon belegen etwas, zwei belegen eine Lücke — und eine der beiden Lücken versteckt sich hinter einer makellosen Statistik.',
        'Ein Sicherungslauf und eine Wiederherstellung sind zwei verschiedene Behauptungen. Für welche der beiden gibt es hier ein Protokoll?',
        '`cat wiederherstellung.txt` und `cat nis2.txt` — die beiden letzten Absätze sind der Bericht.',
        'Endpunktschutz und Perimeter sind belegt in Ordnung. Sie dürfen erwähnt werden — aber nicht in der offen-Zeile.',
        'Festhalten: `echo "offen: Wiederherstellungstest seit 11/2024, Nachweis nach § 39 BSIG" > /home/timo/statusbericht.md`',
      ],
    },
    realWorldReference: 'C-Level-Reporting ist eine Kernkompetenz für IT-Führungskräfte. Die Fähigkeit, Technik für Manager zu übersetzen, unterscheidet gute von durchschnittlichen IT-Leitern.',
    bsiReference: 'BSI IT-Grundschutz: ORP.1 Organisation, ISMS.1 Informationssicherheitsmanagement',
    involvedNpcs: ['INTERN-GF', 'INTERN-CHEF'],
    tags: ['reporting', 'management', 'aufsichtsrat', 'kommunikation'],
  },
  {
    id: 'INTERN-SC-004',
    title: 'Fachabteilung: Die Disposition ist down',
    category: 'troubleshooting',
    difficulty: 3,
    flavorText: 'Montag, 5:47 Uhr. Dein Handy klingelt. Sabine Müller, Dispositionsleiterin: "NICHTS GEHT MEHR! Die Fahrer stehen hier und können keine Routen abrufen! Die Müllabfuhr fährt in 13 Minuten los - OHNE Routen! Machen Sie was!"',
    urgency: 'critical',
    choices: [
      {
        id: 'A',
        text: 'Remote einloggen und im Ereignisprotokoll nachsehen, was um 05:30 passiert ist',
        outcome: 'PERFECT',
        // Bewusst KEINE Reparatur im Ergebnistext: der Spieler hat eine
        // Ereignisanzeige gelesen, nicht einen Dienst neu gestartet. Was hier
        // steht, muss er selbst getan haben.
        consequence: 'Du hast die Ursache eingegrenzt und gemeldet, keine zehn Minuten nach Sabines Anruf. Der Neustart des Datenbankdienstes läuft danach über die Rufbereitschaft — mit einer Meldung, die sagt, was kaputt ist, statt "geht nicht". Um 06:05 fahren die Touren.',
        scoreChange: 200,
        reputationChange: 30,
        lesson: 'Eine brauchbare Störungsmeldung nennt Komponente, Zeitpunkt und Beleg. "Die Disposition ist down" löst niemand, "der Dispo-Dienst bekommt seit 05:29 keine Datenbankverbindung, Ereignis 4103" schon.',
        guiCommand: true,
      },
      {
        id: 'B',
        text: 'Sabine beruhigen und ins Büro fahren',
        outcome: 'PARTIAL_SUCCESS',
        consequence: 'Du brauchst 25 Minuten ins Büro. Die Fahrer sind mit ausgedruckten Notfall-Routen losgefahren (Sabine hat improvisiert). Du findest das Problem (Datenbank), aber die erste Stunde war chaotisch. Sabine: "Schön dass Sie kommen, aber das hätte schneller gehen müssen."',
        scoreChange: 50,
        reputationChange: 0,
        lesson: 'Bei Notfällen zählt jede Minute. Remote-Zugang und Schnelligkeit sind wichtiger als physische Anwesenheit.',
      },
      {
        id: 'C',
        text: 'Erstmal klären: "Können Sie genauer beschreiben was nicht geht?"',
        outcome: 'FAIL',
        consequence: 'Sabine explodiert: "DIE ROUTEN GEHEN NICHT! Was gibt es da zu beschreiben?!" Während du versuchst, mehr Infos zu bekommen, vergehen 10 Minuten. Die Fahrer fahren ohne Routen los. Der Tag wird chaotisch und teuer.',
        scoreChange: -150,
        reputationChange: -20,
        lesson: 'Bei kritischen Ausfällen ist Handeln wichtiger als vollständige Informationssammlung. "Diagnose während der Reparatur" ist der richtige Ansatz.',
      },
      {
        id: 'D',
        text: 'AMSE anrufen — die haben Rufbereitschaft für genau sowas',
        outcome: 'FAIL',
        consequence: 'AMSEs Rufbereitschaft meldet sich nach 15 Minuten. Marco ist verschlafen: "Firewall ist ok bei euch. Liegt nicht an uns." Die Fahrer sind längst los. Du hättest in 15 Minuten selbst diagnostizieren können.',
        scoreChange: -100,
        reputationChange: -15,
        lesson: 'Externe Dienstleister sind gut für geplante Wartung, aber bei akuten Ausfällen musst du selbst handeln können. Abhängigkeit ist ein Risiko.',
      },
    ],
    guiContext: {
      app: 'eventviewer',
      title: 'Ereignisanzeige',
      hostname: 'SRV-DISPO-01',
      briefing:
        'Wähle den Eintrag aus, der die Störung erklärt, und melde ihn. Entscheidend sind die Meldungsdetails und der Zeitpunkt — die Fahrer stehen seit 05:47.',
      state: {
        eventViewer: {
          logName: 'Anwendung',
          entries: [
            {
              id: 'ev_backup_ok',
              level: 'Information',
              dateTime: '15.06.2026 02:00:11',
              source: 'Veeam Agent',
              eventId: 190,
              message: 'Sicherungsauftrag "Dispo-Server täglich" erfolgreich abgeschlossen. Dauer 41 Minuten.',
            },
            {
              id: 'ev_zertifikat',
              level: 'Warnung',
              dateTime: '15.06.2026 04:12:03',
              source: 'Schannel',
              eventId: 36885,
              message:
                'Beim Aufbau einer TLS-Verbindung hat der Server eine Liste vertrauenswürdiger Zertifizierungsstellen gesendet, die sehr lang ist. Die Verbindung wurde dennoch aufgebaut.',
            },
            {
              id: 'ev_druckwarteschlange',
              level: 'Warnung',
              dateTime: '15.06.2026 05:03:47',
              source: 'PrintService',
              eventId: 372,
              message: 'Das Dokument "Tourenliste_Nord" konnte nicht gedruckt werden. Der Drucker ist offline.',
            },
            {
              id: 'ev_db_verbindung',
              level: 'Fehler',
              dateTime: '15.06.2026 05:29:52',
              source: 'DispoService',
              eventId: 4103,
              message:
                'Verbindung zur Datenbank DISPO01 konnte nicht hergestellt werden: Zeitüberschreitung nach 30 Sekunden. Der Dienst nimmt keine Routenabrufe mehr an. Letzte erfolgreiche Verbindung: 15.06.2026 05:28:44.',
            },
            {
              id: 'ev_db_wiederholung',
              level: 'Fehler',
              dateTime: '15.06.2026 05:34:52',
              source: 'DispoService',
              eventId: 4103,
              message:
                'Verbindung zur Datenbank DISPO01 konnte nicht hergestellt werden: Zeitüberschreitung nach 30 Sekunden. Wiederholungsversuch 2 von 12.',
            },
            {
              id: 'ev_lizenz',
              level: 'Warnung',
              dateTime: '15.06.2026 05:41:18',
              source: 'DispoService',
              eventId: 2211,
              message:
                'Die Wartungslizenz läuft in 34 Tagen ab. Der Betrieb ist davon nicht betroffen.',
            },
          ],
        },
      },
      solutions: [
        {
          interactions: ['report:ev_db_verbindung'],
          allRequired: true,
          resultText:
            'Genau der Eintrag: Ereignis 4103 um 05:29:52, letzte erfolgreiche Verbindung 05:28:44. Damit ist die Störung auf die Minute datiert und auf eine Komponente eingegrenzt — die Datenbank DISPO01, nicht "die Disposition". Der Wiederholungsversuch um 05:34 bestätigt es nur; die Lizenzwarnung und die Druckwarteschlange sind unabhängig und wären als Meldung eine Sackgasse gewesen.',
          skillGain: { windows: 4, troubleshooting: 6 },
        },
      ],
      hints: [
        'Sabines Anruf kam um 05:47. Du suchst etwas, das kurz davor angefangen hat — und das mit der Routenabfrage zu tun hat.',
        'Es gibt mehrere Warnungen in dieser Nacht. Warnung heißt nicht Ursache: Filtere nach „Fehler" und lies die Meldungsdetails.',
        'Wähle den ersten Eintrag von DispoService mit Ereignis-ID 4103 (05:29:52) aus und klicke „Als Vorfall melden" — die Zeile mit der letzten erfolgreichen Verbindung ist der Beleg.',
      ],
    },
    realWorldReference: 'Kritische Systeme fallen gerne außerhalb der Arbeitszeit aus. Ein IT-Admin in KRITIS muss jederzeit handlungsfähig sein.',
    bsiReference: 'BSI IT-Grundschutz: DER.2.1 Behandlung von Sicherheitsvorfällen',
    involvedNpcs: ['INTERN-FACHABT'],
    tags: ['notfall', 'disposition', 'datenbank', 'reaktionszeit'],
  },
  {
    id: 'INTERN-SC-005',
    title: 'Bereitschafts-Bingo: Wer nimmt Silvester?',
    category: 'team_dynamics',
    difficulty: 2,
    flavorText: 'Es ist November. Der Bereitschaftsplan für Dezember muss erstellt werden. Michael: "Ich hatte letztes Jahr Weihnachten, dieses Jahr nicht." Lisa: "Ich bin über Silvester auf einer Hochzeit." Jürgen: "Die Kinder haben Ferien, meine Frau arbeitet." Alle schauen dich an.',
    urgency: 'low',
    choices: [
      {
        id: 'A',
        text: 'Selbst Silvester nehmen: "Ich machs, aber dafür nehme ich mir im Januar zwei Ausgleichstage."',
        outcome: 'SUCCESS',
        consequence: 'Das Team ist erleichtert. Du machst Silvester-Bereitschaft. Es passiert zum Glück nichts. Im Januar nimmst du deine Ausgleichstage. Die Stimmung im Team ist gut, aber du fragst dich, ob du zu oft nachgibst.',
        scoreChange: 75,
        reputationChange: 15,
        lesson: 'Manchmal muss jemand den Kürzeren ziehen. Als informelle Führungsperson ist das oft du. Aber: Ausgleich einfordern ist wichtig.',
      },
      {
        id: 'B',
        text: 'Klare Rotation einfordern: "Wir brauchen ein faires System. Wer hatte wann Bereitschaft?"',
        outcome: 'PERFECT',
        consequence: 'Du erstellst eine Übersicht der letzten 24 Monate. Tatsächlich hatte Lisa noch nie ein langes Wochenende, Michael hatte dreimal Silvester-Ausrede. Du schlägst ein Punkte-System vor: Silvester = 3 Punkte, normales Wochenende = 1 Punkt. Das Team grummelt, aber es ist fair.',
        scoreChange: 150,
        reputationChange: 20,
        lesson: 'Transparenz und Fairness lösen Teamkonflikte. Ein dokumentiertes System verhindert Endlosdiskussionen.',
      },
      {
        id: 'C',
        text: 'Den Chef entscheiden lassen: "Herr Bergmann, wir können uns nicht einigen."',
        outcome: 'PARTIAL_SUCCESS',
        consequence: 'Der Chef verdreht die Augen: "Ihr seid erwachsene Menschen." Er legt fest: Alphabetisch, Michael macht Silvester. Michael ist sauer — auf dich, weil du nicht für ihn gekämpft hast.',
        scoreChange: 25,
        reputationChange: -5,
        lesson: 'Den Chef einzuschalten funktioniert, aber zeigt, dass du Teamkonflikte nicht selbst lösen kannst. Und irgendjemand ist immer sauer.',
      },
      {
        id: 'D',
        text: 'Externe Bereitschaft vorschlagen: "Was kostet Bereitschaft über AMSE über die Feiertage?"',
        outcome: 'PARTIAL_SUCCESS',
        consequence: 'Du holst ein Angebot ein: 2.500 Euro für Silvester-Bereitschaft. Die Kämmerin lehnt ab: "Das ist unverhältnismäßig." Aber die Diskussion hat Zeit gekostet. Am Ende muss trotzdem einer aus dem Team ran.',
        scoreChange: 0,
        reputationChange: 0,
        lesson: 'Externe Bereitschaft ist teuer und wird selten genehmigt. Ein guter Versuch, aber kein Ersatz für Team-Koordination.',
      },
    ],
    realWorldReference: 'Bereitschaftsplanung ist einer der häufigsten Teamkonflikte in der IT. Transparente Regeln verhindern jährliche Dramen.',
    bsiReference: 'BSI IT-Grundschutz: ORP.2 Personal',
    involvedNpcs: ['INTERN-KOLLEGEN', 'INTERN-CHEF'],
    tags: ['team', 'bereitschaft', 'konflikt', 'planung'],
  },
  {
    id: 'INTERN-SC-006',
    title: 'Büropolitik: Die Fachabteilung will eigene IT',
    category: 'budget_politics',
    difficulty: 4,
    flavorText: 'Gerüchte im Flurfunk: Die Disposition will sich ein eigenes "IT-System" kaufen — ein SaaS-Routing-Tool, das Sabine auf einer Messe gesehen hat. Ohne IT-Beteiligung, direkt über ihr Abteilungsbudget. Der Vertrieb des Anbieters hat schon mit dem GF telefoniert.',
    urgency: 'medium',
    choices: [
      {
        id: 'A',
        text: 'Sabine direkt konfrontieren: "Warum bindet ihr die IT nicht ein?"',
        outcome: 'FAIL',
        consequence: 'Sabine reagiert defensiv: "Weil die IT immer nur sagt warum was nicht geht! Wir brauchen Lösungen!" Der Konflikt eskaliert. Sie geht zum GF, beschwert sich über "IT-Blockade". Du stehst als Verhinderer da.',
        scoreChange: -100,
        reputationChange: -15,
        lesson: 'Direkte Konfrontation ohne Verständnis für die Motivation der anderen Seite führt zur Eskalation.',
      },
      {
        id: 'B',
        text: 'Den GF informieren: "Dr. Krause, die Disposition plant eine IT-Beschaffung ohne IT-Freigabe."',
        outcome: 'PARTIAL_SUCCESS',
        consequence: 'Der GF versteht das Problem (Datenschutz, Integration, Sicherheit), aber sagt: "Klären Sie das direkt mit Frau Müller. Ich will keine Konflikte zwischen Abteilungen." Du hast ihn informiert, aber musst es trotzdem selbst lösen.',
        scoreChange: 50,
        reputationChange: 5,
        lesson: 'Den GF zu informieren ist richtig, aber die Erwartung, dass er es löst, ist naiv. Du musst es operativ selbst klären.',
      },
      {
        id: 'C',
        text: 'Das Tool selbst evaluieren und eine technische Stellungnahme vorbereiten',
        outcome: 'PERFECT',
        consequence: 'Du recherchierst das Tool: US-Cloud, keine GDPR-Compliance, keine API zum bestehenden ERP, Daten liegen auf AWS us-east-1. Du erstellst eine sachliche Analyse mit Alternativen, die KRITIS-konform sind. Sabine ist genervt, aber das Argument "Datenschutz-Bußgeld bis 4% vom Jahresumsatz" überzeugt den GF. Er stoppt die Beschaffung und lobt deine proaktive Arbeit.',
        scoreChange: 200,
        reputationChange: 25,
        lesson: 'Faktenbasierte Analyse schlägt Büropolitik. Wenn du Risiken aufzeigen kannst (GDPR, KRITIS), bist du kein Blockierer sondern Beschützer.',
      },
      {
        id: 'D',
        text: 'Ignorieren — ist nicht dein Budget, nicht dein Problem',
        outcome: 'CRITICAL_FAIL',
        consequence: 'Sabine kauft das Tool. 3 Monate später: Datenschutzbeauftragter entdeckt, dass Personendaten (Fahrernamen, Adressen) in einer US-Cloud liegen. Meldepflicht an die Aufsichtsbehörde. Der GF fragt: "Warum hat die IT das nicht verhindert?"',
        scoreChange: -250,
        reputationChange: -30,
        lesson: 'Shadow-IT ist immer ein IT-Problem, auch wenn die IT nicht involviert war. Wenn es schiefgeht, wird die IT verantwortlich gemacht.',
        triggersEvent: 'GDPR_INCIDENT',
      },
    ],
    realWorldReference: 'Shadow-IT entsteht wenn Fachabteilungen das Gefühl haben, IT blockiert sie. Der richtige Weg ist: Verstehen, evaluieren, beraten — nicht verbieten.',
    bsiReference: 'BSI IT-Grundschutz: ORP.4 Identitäts- und Berechtigungsmanagement, CON.2 Datenschutz',
    involvedNpcs: ['INTERN-FACHABT', 'INTERN-GF'],
    tags: ['shadow-it', 'datenschutz', 'beschaffung', 'buropolitik'],
  },
  {
    id: 'INTERN-SC-007',
    title: 'Chef verlangt das Unmögliche',
    category: 'team_dynamics',
    difficulty: 4,
    flavorText: 'Der Chef kommt Mittwoch um 16:30: "Der GF will bis Freitag eine komplette Dokumentation aller IT-Assets für den NIS2-Audit. Hardware, Software, Lizenzen, Netzwerk. Vollständig." Das ist normalerweise 2 Wochen Arbeit. Du hast 1,5 Tage.',
    urgency: 'critical',
    choices: [
      {
        id: 'A',
        text: 'Realistisch bleiben: "Das ist in 1,5 Tagen nicht machbar. Was ist die absolute Priorität?"',
        outcome: 'PERFECT',
        consequence: 'Der Chef denkt nach. "OK, was KANNST du bis Freitag liefern?" Ihr einigt euch auf: Kritische Systeme vollständig, Rest als Übersicht. Du arbeitest zwei lange Tage, lieferst ein 80%-Dokument mit klarem Vermerk was noch fehlt. Der GF akzeptiert es: "Besser als erwartet."',
        scoreChange: 150,
        reputationChange: 20,
        lesson: 'Unrealistische Deadlines erfordern Priorisierung, nicht Heroismus. 80% pünktlich ist besser als 100% zu spät.',
      },
      {
        id: 'B',
        text: 'Alles geben: Zwei Nachtschichten durcharbeiten, Team zusammentrommeln',
        outcome: 'PARTIAL_SUCCESS',
        consequence: 'Du arbeitest durch, Lisa hilft freiwillig, Jürgen nicht (Kinder). Die Dokumentation ist Freitag früh fertig — aber voller Fehler wegen Übermüdung. Der GF findet 3 Inkonsistenzen im Meeting. Außerdem bist du die nächste Woche nicht zu gebrauchen.',
        scoreChange: 50,
        reputationChange: 5,
        lesson: 'Übermüdete Arbeit produziert Fehler. Kurzfristiger Heroismus schadet langfristig — dir und der Qualität.',
      },
      {
        id: 'C',
        text: 'Ablehnen: "Das geht nicht. Der GF muss den Termin verschieben."',
        outcome: 'FAIL',
        consequence: 'Der Chef reagiert gereizt: "Dann sag DU das dem GF." Du rufst Dr. Krause an, er ist nicht amüsiert: "Ich kann den Audit-Termin nicht verschieben. Finden Sie eine Lösung." Du hast dich unbeliebt gemacht ohne Ergebnis.',
        scoreChange: -100,
        reputationChange: -20,
        lesson: 'Pauschal ablehnen ohne Alternative ist keine Lösung. Immer einen Gegenvorschlag haben.',
      },
      {
        id: 'D',
        text: 'Externe Hilfe holen: AMSE hat Asset-Management-Daten, die nutzen wir',
        outcome: 'SUCCESS',
        consequence: 'Du rufst Marco an: "Ihr habt doch Inventar-Daten von uns. Könnt ihr die exportieren?" Marco liefert eine Excel mit 70% der Hardware-Infos. Du ergänzt die Software selbst. Freitag steht eine solide Dokumentation. Nicht perfekt, aber brauchbar.',
        scoreChange: 100,
        reputationChange: 10,
        lesson: 'Externe Datenquellen nutzen ist clever. Dienstleister haben oft Informationen, die intern fehlen.',
      },
    ],
    realWorldReference: 'Unmögliche Deadlines sind IT-Alltag. Die Kunst ist, realistische Teillieferungen zu verhandeln statt zu scheitern.',
    bsiReference: 'BSI IT-Grundschutz: ORP.1 Organisation, ISMS.1 Informationssicherheitsmanagement',
    involvedNpcs: ['INTERN-CHEF', 'INTERN-GF'],
    tags: ['deadline', 'dokumentation', 'nis2', 'stress'],
  },
  {
    id: 'INTERN-SC-008',
    title: 'IT-Ausgaben unter der Lupe',
    category: 'budget_politics',
    difficulty: 3,
    flavorText: 'Die Kämmerin lädt dich und den Chef zu einem "Kostengespräch" ein. Sie hat eine Excel-Tabelle: "Die IT-Ausgaben sind im letzten Jahr um 23% gestiegen. Ich möchte verstehen, warum. Hier sehe ich: Microsoft-Lizenzen +15%, AMSE-Vertrag +8%, Hardware +42%..."',
    urgency: 'medium',
    choices: [
      {
        id: 'A',
        text: 'Defensiv werden: "IT-Sicherheit kostet eben Geld. Die Alternative ist teurer."',
        outcome: 'FAIL',
        consequence: 'Die Kämmerin wird kühl: "Das ist keine Begründung, das ist eine Ausrede. Ich erwarte konkrete Zahlen, nicht Phrasen." Das Meeting endet frostig. Sie kündigt an, jeden IT-Antrag künftig persönlich zu prüfen.',
        scoreChange: -100,
        reputationChange: -15,
        lesson: 'Finanzleute wollen Fakten, keine Slogans. "Sicherheit kostet Geld" ist kein Argument ohne konkrete Zahlen.',
      },
      {
        id: 'B',
        text: 'Jede Position erklären: Hardware wegen Laptop-Refresh, Lizenzen wegen NIS2-Anforderung, AMSE wegen SLA-Upgrade',
        outcome: 'SUCCESS',
        consequence: 'Du gehst Position für Position durch. Die Kämmerin nickt bei manchen, fragt bei anderen nach. "Der Laptop-Refresh ist nachvollziehbar. Aber der AMSE-Aufschlag — haben Sie verhandelt?" Das Meeting endet neutral, aber du hast nicht glänzend.',
        scoreChange: 75,
        reputationChange: 5,
        lesson: 'Transparenz ist gut, aber proaktive Kostenkontrolle wäre besser gewesen. Die Frage nach Verhandlung zeigt: Du solltest immer eine Antwort darauf haben.',
      },
      {
        id: 'C',
        text: 'Proaktiv mit Kostensenkungsvorschlägen kommen: "Ich habe mir das auch angeschaut. Hier sind Einsparoptionen für nächstes Jahr."',
        outcome: 'PERFECT',
        consequence: 'Du präsentierst: Cloud-Konsolidierung spart 8.000€/Jahr, Microsoft E3 statt E5 spart 3.000€, Dienstleisterwechsel-Evaluierung könnte 15% AMSE-Kosten sparen. Die Kämmerin ist beeindruckt: "Das ist konstruktiv. Lassen Sie uns das vierteljährlich besprechen."',
        scoreChange: 200,
        reputationChange: 25,
        lesson: 'Die beste Verteidigung ist Angriff. Wer selbst Einsparungsvorschläge bringt, hat die Kontrolle über das Gespräch.',
      },
      {
        id: 'D',
        text: 'Den Chef reden lassen — er ist ja IT-Leiter',
        outcome: 'PARTIAL_SUCCESS',
        consequence: 'Der Chef übernimmt, erklärt solide, aber ohne Begeisterung. Die Kämmerin akzeptiert die Erklärungen. Aber sie merkt an: "Wäre schön, wenn die IT das selbst im Blick hätte." Du hast eine Chance verpasst, Kompetenz zu zeigen.',
        scoreChange: 25,
        reputationChange: -5,
        lesson: 'Budget-Verantwortung ist Leadership. Wer sie delegiert, wird nicht als Führungskraft wahrgenommen.',
      },
    ],
    realWorldReference: 'Regelmäßige Budget-Reviews sind Standard. Vorbereitung mit eigenen Optimierungsvorschlägen zeigt Professionalität.',
    bsiReference: 'BSI IT-Grundschutz: ORP.1 Organisation',
    involvedNpcs: ['INTERN-KAEMMERER', 'INTERN-CHEF'],
    tags: ['budget', 'kosten', 'kaemmerer', 'kontrolle'],
  },
  {
    id: 'INTERN-SC-009',
    title: 'Der GF will auf der Messe präsentieren',
    category: 'compliance',
    difficulty: 2,
    flavorText: 'Dr. Krause: "Ich halte nächste Woche einen Vortrag über Digitalisierung in der Abfallwirtschaft. Ich brauche 3 Folien über unsere IT-Sicherheit. Zeigen Sie, wie modern wir sind." Du weißt: Die Sophos ist alt, das ERP von 2004, und modern ist relativ.',
    urgency: 'medium',
    choices: [
      {
        id: 'A',
        text: 'Ehrlich sein: "Dr. Krause, wir sind nicht so modern wie andere. Das sollten wir nicht übertreiben."',
        outcome: 'PARTIAL_SUCCESS',
        consequence: 'Der GF ist enttäuscht: "Also können wir nicht mal positiv über unsere IT reden?" Du wirkst destruktiv. Er fragt den Chef, ob "der Neue immer so pessimistisch" ist.',
        scoreChange: 25,
        reputationChange: -10,
        lesson: 'Ehrlichkeit ist gut, aber "wir sind schlecht" ist keine hilfreiche Aussage. Immer einen positiven Spin finden.',
      },
      {
        id: 'B',
        text: 'Marketing-Folien erstellen: "KRITIS-Compliance, 24/7-Monitoring, modernste Firewall-Technologie"',
        outcome: 'PARTIAL_SUCCESS',
        consequence: 'Der Vortrag läuft gut. Aber ein Kollege aus einem anderen Entsorgungsbetrieb fragt nach: "Welche Firewall nutzt ihr?" Der GF leitet die Frage an dich weiter. "Sophos XG... Baujahr 2017." Peinliche Stille.',
        scoreChange: 50,
        reputationChange: 0,
        lesson: 'Marketing-Aussagen müssen nachfragefest sein. Übertreibungen fallen auf.',
      },
      {
        id: 'C',
        text: 'Positiv aber wahrheitsgemäß: "Wir zeigen: KRITIS-Sicherheitskonzept, BSI-Grundschutz in Arbeit, konkrete Roadmap"',
        outcome: 'PERFECT',
        consequence: 'Du erstellst Folien: Ist-Stand, laufende Projekte, Zielbild 2025. Ehrlich, aber professionell. Der GF ist zufrieden: "Das zeigt, dass wir wissen wo wir stehen und wohin wir wollen." Der Vortrag kommt gut an.',
        scoreChange: 150,
        reputationChange: 20,
        lesson: 'Roadmaps und Pläne sind genauso vorzeigbar wie fertige Projekte. "Wir arbeiten dran" ist ein valides Statement.',
      },
      {
        id: 'D',
        text: 'Ablehnen: "Ich bin nicht fürs Marketing zuständig."',
        outcome: 'FAIL',
        consequence: 'Der GF ist irritiert: "Ich bitte Sie um 3 Folien, nicht um eine Dissertation." Er fragt den Chef, der es dann macht. Du hast dich als unflexibel geoutet.',
        scoreChange: -75,
        reputationChange: -15,
        lesson: 'Kleine Aufgaben vom GF abzulehnen ist politisch unklug, egal ob es "dein Job" ist oder nicht.',
      },
    ],
    realWorldReference: 'Management-Kommunikation ist IT-Aufgabe. Die Fähigkeit, Technik positiv aber ehrlich darzustellen, ist Karriere-relevant.',
    bsiReference: 'BSI IT-Grundschutz: ISMS.1 Informationssicherheitsmanagement',
    involvedNpcs: ['INTERN-GF'],
    tags: ['kommunikation', 'marketing', 'vortrag', 'politik'],
  },
  {
    id: 'INTERN-SC-010',
    title: 'Kollegen-Krach: Legacy vs. Cloud',
    category: 'team_dynamics',
    difficulty: 3,
    flavorText: 'Team-Meeting. Lisa präsentiert: "Wir sollten das ERP in die Cloud migrieren. Azure hat alles, was wir brauchen." Michael explodiert: "Das ERP läuft seit 20 Jahren stabil! Du willst alles kaputtmachen für deinen Cloud-Hype!" Die Stimmung kippt.',
    urgency: 'low',
    choices: [
      {
        id: 'A',
        text: 'Lisa unterstützen: "Die Cloud ist die Zukunft. Wir müssen modernisieren."',
        outcome: 'FAIL',
        consequence: 'Michael fühlt sich nicht ernst genommen: "Ihr jungen Leute habt keine Ahnung von stabilen Systemen!" Er droht mit Krankmeldung. Das Team ist gespalten. Jürgen seufzt und schaut auf die Uhr.',
        scoreChange: -75,
        reputationChange: -10,
        lesson: 'Partei ergreifen in einem Teamkonflikt spaltet das Team weiter. Dein Job ist Moderation, nicht Positionierung.',
      },
      {
        id: 'B',
        text: 'Michael unterstützen: "Das ERP läuft. Never change a running system."',
        outcome: 'FAIL',
        consequence: 'Lisa ist frustriert: "Dann bleiben wir halt ewig im Jahr 2004!" Sie droht mit Wechsel zu einem moderneren Arbeitgeber. Talentbindung wird ein Problem.',
        scoreChange: -75,
        reputationChange: -10,
        lesson: 'Die andere Seite zu nehmen hat den gleichen Effekt: Spaltung. Und du verlierst junge Talente.',
      },
      {
        id: 'C',
        text: 'Moderieren: "Beide haben Punkte. Lisa, was ist der Business Case? Michael, welche Risiken siehst du konkret?"',
        outcome: 'PERFECT',
        consequence: 'Du strukturierst die Diskussion. Lisa soll einen Business Case schreiben, Michael eine Risikoanalyse. Ihr vereinbart, beide im nächsten Meeting zu besprechen. Die Emotionen sinken, die Fakten kommen. Michael und Lisa sprechen nach dem Meeting miteinander.',
        scoreChange: 150,
        reputationChange: 20,
        lesson: 'Technik-Diskussionen eskalieren, wenn es um Identität geht (alt vs. neu). Moderation über Fakten entpersonalisiert den Konflikt.',
      },
      {
        id: 'D',
        text: 'Thema vertagen: "Das besprechen wir ein andermal. Nächster Punkt."',
        outcome: 'PARTIAL_SUCCESS',
        consequence: 'Das Meeting geht weiter, aber der Konflikt schwelt. In den nächsten Wochen ignorieren Lisa und Michael sich. Die Teamdynamik leidet.',
        scoreChange: 0,
        reputationChange: -5,
        lesson: 'Konflikte vertagen löst sie nicht. Aufgeschoben ist nicht aufgehoben.',
      },
    ],
    realWorldReference: 'Der Generationenkonflikt Legacy vs. Cloud ist in vielen IT-Teams real. Moderation statt Positionierung ist der Schlüssel.',
    bsiReference: 'BSI IT-Grundschutz: ORP.2 Personal',
    involvedNpcs: ['INTERN-KOLLEGEN'],
    tags: ['team', 'konflikt', 'cloud', 'legacy', 'moderation'],
  },
  {
    /**
     * Einstiegsfall 1 von 3 (Schwierigkeit 1) — die erste praktische Handlung
     * im Spiel: einen Prozess gezielt beenden.
     *
     * Die Falle ist bewusst NICHT versteckt: der Sicherungslauf trägt die
     * höchste CPU-Last und ist trotzdem der falsche Prozess. Wer nach der
     * größten Zahl greift, statt zu lesen, beendet das Backup. Das löst den
     * Fall zwar auch — aber über eine eigene, schlechtere Lösung mit eigenem
     * Ergebnistext, nicht stillschweigend als Erfolg.
     */
    id: 'INTERN-SC-011',
    title: 'Der erste Prozess, der nicht mehr reagiert',
    category: 'troubleshooting',
    difficulty: 1,
    flavorText: 'Sabine Müller steht in der Tür, ungewöhnlich ruhig. "Die Tourenplanung reagiert nicht mehr. Fenster ist grau, Mausklicks passieren einfach nichts. Ich hab nichts Ungespeichertes offen — die Touren von heute sind alle schon raus." Sie schaut dich an. "Kriegst du das hin?"',
    urgency: 'medium',
    choices: [
      {
        id: 'A',
        text: 'Task-Manager öffnen und den hängenden Prozess beenden',
        outcome: 'PERFECT',
        consequence: 'Die Anwendung startet neu. Ob sie sauber hochkommt, weißt du erst, wenn Sabine es bestätigt — also bleibst du stehen, bis sie nickt. Und du notierst, was du beendet hast und wann. Zwei Zeilen, die beim nächsten Mal Gold wert sind.',
        scoreChange: 120,
        reputationChange: 10,
        lesson: 'Eine hängende Anwendung ist fast nie ein Grund zum Neustarten des ganzen Rechners. Der Task-Manager beendet genau den einen Prozess. Wichtig ist, vorher zu fragen, ob ungespeicherte Arbeit offen ist — danach ist sie weg.',
        guiCommand: true,
      },
      {
        id: 'B',
        text: 'Sabine bitten, den Rechner komplett neu zu starten',
        outcome: 'PARTIAL_SUCCESS',
        consequence: 'Funktioniert. Dauert acht Minuten, in denen Sabine nicht arbeiten kann, und ihr wisst hinterher nicht, was eigentlich hing. Beim dritten Mal in dieser Woche fragt sie: "Können wir dem nicht mal auf den Grund gehen?"',
        scoreChange: 20,
        reputationChange: 0,
        lesson: 'Der Neustart ist der Vorschlaghammer: Er wirkt fast immer und erklärt nie etwas. Als Dauerlösung verdeckt er das eigentliche Problem — und das kommt wieder.',
      },
      {
        id: 'C',
        text: 'Das an Jens abgeben — er kennt die Tourenplanung besser',
        outcome: 'SUCCESS',
        consequence: 'Jens erledigt es in zwei Minuten und erklärt dir dabei, was er tut. "Beim nächsten Mal machst du das selbst, ja?" Sabine kann weiterarbeiten. Du hast nichts falsch gemacht — aber auch nichts selbst gekonnt.',
        scoreChange: 60,
        reputationChange: 5,
        lesson: 'Abgeben ist legitim, gerade am Anfang. Es wird nur dann zum Problem, wenn es die Regel bleibt: Wer nie selbst zugreift, ist beim nächsten Ausfall genauso abhängig wie beim ersten.',
      },
    ],
    guiContext: {
      app: 'taskmanager',
      title: 'Task-Manager',
      hostname: 'WS-DISPO-02',
      briefing:
        'Klicke einen Prozess an, um ihn auszuwählen, und beende ihn mit „Task beenden". Die Spaltenköpfe lassen sich sortieren — die höchste CPU-Last ist aber nicht automatisch der Schuldige.',
      state: {
        taskManager: {
          processes: [
            { name: 'System', pid: 4, cpu: 1, memoryMb: 26, description: 'NT Kernel & System', critical: true },
            { name: 'svchost.exe', pid: 912, cpu: 2, memoryMb: 148, description: 'Hostprozess für Windows-Dienste', critical: true },
            { name: 'explorer.exe', pid: 2988, cpu: 1, memoryMb: 196, description: 'Windows-Explorer' },
            {
              name: 'veeam-agent.exe',
              pid: 2210,
              cpu: 71,
              memoryMb: 344,
              description: 'Datensicherung — Sicherungslauf von 02:00 Uhr, läuft nach',
            },
            {
              name: 'Tourenplanung.exe',
              pid: 4712,
              cpu: 0,
              memoryMb: 782,
              description: 'Tourenplanung WARM — keine Rückmeldung',
            },
            { name: 'OUTLOOK.EXE', pid: 4420, cpu: 3, memoryMb: 318, description: 'Microsoft Outlook' },
            { name: 'msedge.exe', pid: 6104, cpu: 4, memoryMb: 402, description: 'Microsoft Edge' },
          ],
        },
      },
      solutions: [
        {
          // Risiko vor Lob: wer zuerst den Sicherungslauf abschiesst, bekommt
          // diese Fassung — der Fall ist gelöst, der Preis steht im Text.
          interactions: ['endtask:veeam-agent.exe', 'endtask:Tourenplanung.exe'],
          allRequired: true,
          resultText:
            'Die Tourenplanung läuft wieder — aber du hast auch den Sicherungslauf abgeschossen. Der stand auf 71 % CPU, weil er seit 02:00 Uhr nachläuft, nicht weil er hängt. Die Sicherung von heute Nacht ist damit unvollständig und muss neu angestoßen werden. „Keine Rückmeldung" stand an einem ganz anderen Prozess.',
          skillGain: { windows: 2 },
          setsFlags: ['onb_backup_abgebrochen'],
          // Der Fall ist gelöst — „perfekt" ist er nicht. Ohne diese
          // Korrektur traegt der Ergebnisbildschirm die Einstufung der Choice
          // und behauptet damit eine Fassung, die es nicht gegeben hat.
          outcome: 'PARTIAL_SUCCESS',
        },
        {
          interactions: ['endtask:Tourenplanung.exe'],
          allRequired: true,
          resultText:
            'Genau der. „Keine Rückmeldung" ist die Windows-Formulierung für: Das Fenster nimmt keine Eingaben mehr an. 782 MB Speicher, 0 % CPU — die Anwendung tut nichts mehr, sie liegt nur noch herum. Der Sicherungslauf daneben sah mit 71 % dramatischer aus und war völlig in Ordnung.',
          skillGain: { windows: 5, troubleshooting: 3 },
        },
      ],
      hints: [
        'Du suchst die Anwendung, über die Sabine sich beschwert — nicht den Prozess mit der größten Zahl.',
        'In der Beschreibungsspalte steht bei einem Prozess „keine Rückmeldung". Genau das meint Sabine mit „reagiert nicht mehr".',
        'Wähle „Tourenplanung.exe" mit einem Klick aus und drücke dann „Task beenden". Den Sicherungslauf lässt du in Ruhe.',
      ],
    },
    realWorldReference: 'Windows markiert Prozesse, die keine Fensternachrichten mehr verarbeiten, als „keine Rückmeldung". Der Task-Manager ist das Standardwerkzeug, um genau diesen einen Prozess zu beenden, statt das ganze System neu zu starten.',
    bsiReference: 'BSI IT-Grundschutz: OPS.1.1.2 Ordnungsgemäße IT-Administration',
    involvedNpcs: ['INTERN-FACHABT'],
    /**
     * Einsteiger und Standard, NICHT KRITIS: Der erste Griff zum Task-Manager
     * gehört an den Anfang einer Laufbahn, nicht in Woche 1 eines
     * 24-wöchigen KRITIS-Laufs. Siehe Scenario.requiredModes.
     */
    requiredModes: ['beginner', 'intermediate'],
    tags: ['einstieg', 'gui', 'windows', 'taskmanager', 'troubleshooting'],
  },
];
