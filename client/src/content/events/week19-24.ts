import { GameEvent } from '@kritis/shared';

/**
 * Weeks 19-24: "Endspurt: Winter & Jahresabschluss" (KRITIS late game, second half).
 * Onboarding, winter storms, year-end freeze, a zero-day, and the two closing
 * flavor cards that take stock of the whole year (referencing flags set earlier).
 * No requiredModes: only KRITIS reaches week 19+, so weekRange is the gate.
 */
export const week19to24Events: GameEvent[] = [
  // 1 ─────────────────────────────────────────────────────────────
  {
    id: 'evt_neue_kollegin_start',
    weekRange: [19, 23],
    probability: 0.85,
    category: 'team',
    title: 'Der erste Tag der Neuen',
    description: `Sie ist da: die Kollegin aus der Ausschreibung, für die du monatelang gekämpft hast. Erster Tag, motiviert, mit Notizblock und Fragen. Nur — dein Kalender ist voll, die offenen Baustellen auch.

Die bequeme Variante flüstert: "Setz sie an ein Fachbuch, sie wächst schon rein." Die andere Stimme weiß, dass die ersten Wochen entscheiden, ob aus ihr eine echte Entlastung wird oder eine, die frustriert wieder geht.

"Womit soll ich anfangen?", fragt sie und meint es ernst.`,
    involvedCharacters: ['kollege'],
    choices: [
      {
        id: 'onboarding_richtig',
        text: 'Strukturiertes Onboarding: Einarbeitungsplan, Patin, echte Aufgaben mit Begleitung',
        effects: { skills: { softSkills: 6 }, relationships: { kollegen: 12 }, stress: 10 },
        resultText:
          'Du nimmst dir die Zeit: Einarbeitungsplan, {kollege} als Pate, jede Woche eine echte, begleitete Aufgabe. Es kostet dich zwei Wochen Produktivität — und macht danach aus ihr die Entlastung, die ihr gebraucht habt. Nach einem Monat übernimmt sie den First-Level-Support komplett allein.',
        teachingMoment:
          'Gutes Onboarding ist eine Investition mit hoher Rendite: Die Wochen, die man vorne reinsteckt, kommen als Eigenständigkeit vielfach zurück. Schlechtes Onboarding produziert Frust und Fluktuation.',
        setsFlags: ['onboarding_gut', 'team_verstaerkt'],
      },
      {
        id: 'onboarding_learning_by_doing',
        text: 'Sie ins kalte Wasser werfen — aber erreichbar bleiben für Fragen',
        effects: { skills: { softSkills: 3 }, relationships: { kollegen: 5 }, stress: 6 },
        resultText:
          'Du gibst ihr echte Tickets und die Ansage: "Frag, wann immer du nicht weiterkommst." Sie schwimmt anfangs, lernt aber schnell und traut sich zu fragen. Nicht das sauberste Onboarding, aber sie kommt an — vor allem, weil du erreichbar bleibst statt sie hängenzulassen.',
        teachingMoment:
          'Learning by doing funktioniert — aber nur mit einem Sicherheitsnetz. Der Unterschied zwischen "ins kalte Wasser" und "im Stich gelassen" ist die Erreichbarkeit.',
      },
      {
        id: 'onboarding_fachbuch',
        text: 'Ein Fachbuch in die Hand drücken: "Lies dich erst mal ein"',
        effects: { relationships: { kollegen: -8 }, stress: -5 },
        resultText:
          'Du gibst ihr einen Stapel Dokumentation und verschwindest in deinen Terminen. Sie liest drei Tage lang, versteht die Hälfte nicht ohne Kontext und fühlt sich überflüssig. Am Freitag fragt sie schon vorsichtig, ob das hier "immer so" sei. Der teuer erkämpfte Neuzugang beginnt zu zweifeln.',
        choiceTags: ['dismissive', 'negligent'],
      },
    ],
    tags: ['kritis', 'team', 'onboarding'],
  },

  // 2 ─────────────────────────────────────────────────────────────
  {
    id: 'evt_herbststurm_vorbereitung',
    weekRange: [19, 23],
    probability: 0.85,
    category: 'crisis',
    title: 'Unwetterwarnung Stufe Rot',
    description: `Der Deutsche Wetterdienst gibt eine Unwetterwarnung der höchsten Stufe fürs Wochenende heraus: Orkanböen, Starkregen, hohe Wahrscheinlichkeit von Stromausfällen. Du hast 48 Stunden, um zu härten, was zu härten ist.

Die Schwachstellen kennst du: die alte USV, die einzige Netzanbindung, der Serverraum im Untergeschoss mit dem Bodenablauf, der beim letzten Starkregen fast übergelaufen wäre.

{chef} fragt am Telefon: "Müssen wir uns Sorgen machen?" Ehrliche Antwort: kommt drauf an, was du in den nächsten zwei Tagen tust.`,
    involvedCharacters: ['chef'],
    choices: [
      {
        id: 'sturm_systematisch',
        text: 'Systematisch vorbereiten: USV testen, Backup ziehen, Shutdown-Plan, Ablauf prüfen',
        effects: { skills: { troubleshooting: 6, security: 3 }, compliance: 10, relationships: { chef: 10 }, stress: 12 },
        resultText:
          'Du arbeitest eine Checkliste ab: aktuelles Offline-Backup, USV-Test, automatisches Shutdown scharf, Bodenablauf im Serverraum gecheckt und freigeräumt. Am Sonntag fällt tatsächlich zweimal der Strom — und beide Male fahren die Systeme kontrolliert runter und sauber wieder hoch. {chef} am Montag: "Man hat gar nichts gemerkt." Genau so soll es sein.',
        teachingMoment:
          'Vorsorge vor absehbaren Ereignissen ist der billigste Notfallschutz: Ein aktuelles Backup und ein getesteter Shutdown-Ablauf verwandeln einen Sturm von einer Katastrophe in eine Randnotiz.',
        setsFlags: ['sturm_vorbereitet'],
      },
      {
        id: 'sturm_wichtigstes',
        text: 'Nur das Wichtigste absichern: frisches Backup und Shutdown-Automatik',
        effects: { skills: { troubleshooting: 4 }, compliance: 6, relationships: { chef: 5 }, stress: 8 },
        resultText:
          'Die Zeit reicht nicht für alles — also priorisierst du hart: ein frisches Offline-Backup und die automatische Abschaltung bei Stromausfall. Der Bodenablauf bleibt ungeprüft, aber die Daten sind sicher. Am Sonntag hält alles. Diesmal ging es gut, auch ohne die volle Checkliste.',
        teachingMoment:
          'Wenn die Zeit knapp ist, sichert man zuerst das Unwiederbringliche: Daten. Hardware lässt sich ersetzen, verlorene Bürgerdaten nicht.',
      },
      {
        id: 'sturm_abwarten',
        text: '"Wird schon" — normales Wochenende, nichts Besonderes tun',
        effects: { stress: -5, compliance: -10 },
        resultText:
          'Du machst normal Feierabend. Der Sturm kommt wie angekündigt, der Strom fällt aus, die USV hält 90 Sekunden, und der Bodenablauf im Serverraum läuft tatsächlich über. Montag früh: nasse Kabel, ein toter Switch, ein Backup von vor einer Woche. Die Warnung war deutlich. Du hast sie überhört.',
        choiceTags: ['negligent'],
      },
    ],
    tags: ['kritis', 'crisis', 'notfallvorsorge'],
  },

  // 3 ─────────────────────────────────────────────────────────────
  {
    id: 'evt_iso27001_wunsch_gf',
    weekRange: [19, 24],
    probability: 0.8,
    category: 'politics',
    title: 'Warum wir nicht?',
    description: `{gf} kommt sichtlich beeindruckt von einem Bürgermeisterkongress zurück. "Die Nachbargemeinde ist jetzt ISO-27001-zertifiziert. Das stand sogar in der Zeitung. Warum sind wir das nicht?"

Du weißt: Eine ISO-27001-Zertifizierung ist ein großes Projekt — Managementsystem, Dokumentation, Audits, laufende Pflege. Nicht unmöglich, aber auch nicht mal eben nebenbei. Und ihr steht noch mitten im NIS2-Grundschutz.

{gf} ist Feuer und Flamme. Die Frage ist, ob du die Begeisterung nutzt oder bremst.`,
    involvedCharacters: ['gf', 'chef'],
    choices: [
      {
        id: 'iso_realistisch_einordnen',
        text: 'Begeisterung nutzen, aber ehrlich einordnen: Erst Grundschutz, dann Zertifizierung',
        effects: { skills: { softSkills: 6, security: 3 }, compliance: 8, relationships: { gf: 10, chef: 5 }, stress: 8 },
        resultText:
          'Du bremst nicht, du kanalisierst: "Der Weg dahin ist genau der NIS2-Grundschutz, an dem wir arbeiten. Machen wir den sauber, ist die Zertifizierung der nächste logische Schritt." {gf} versteht — und hat jetzt einen Grund, die laufende Grundschutz-Arbeit zu unterstützen. Aus einem Wunsch wird Rückenwind.',
        teachingMoment:
          'Vorstandsbegeisterung ist eine Ressource, keine Störung. Wer einen ambitionierten Wunsch in realistische Zwischenschritte übersetzt, bekommt Unterstützung für die Arbeit, die ohnehin ansteht.',
        setsFlags: ['iso_roadmap_skizziert'],
      },
      {
        id: 'iso_machbarkeit',
        text: 'Eine ehrliche Machbarkeits- und Kostenschätzung erarbeiten',
        effects: { skills: { softSkills: 4, security: 3 }, compliance: 5, relationships: { gf: 6, chef: 3 }, stress: 6 },
        resultText:
          'Du setzt dich hin und rechnest: Aufwand, Kosten, Personalbindung, realistische Zeitachse. Das Ergebnis ernüchtert {gf} etwas, ist aber belastbar. "Gut, dass wir das wissen, bevor wir es versprechen." Statt eines Schnellschusses gibt es jetzt eine Entscheidungsgrundlage.',
        teachingMoment:
          'Große Vorhaben brauchen eine ehrliche Kosten- und Aufwandsschätzung, bevor sie öffentlich versprochen werden — sonst wird aus der Vision eine Enttäuschung mit Ansage.',
      },
      {
        id: 'iso_gleich_zusagen',
        text: 'Der Begeisterung nachgeben und die Zertifizierung fürs nächste Jahr zusagen',
        effects: { relationships: { gf: 8, chef: -5 }, compliance: -5, stress: 10 },
        resultText:
          '{gf} ist begeistert und verkündet es prompt beim nächsten Kongress. Jetzt steht ihr im Wort für ein Projekt, für das weder Budget noch Personal noch Zeit da sind. {chef} schaut dich vorwurfsvoll an: "Wie sollen wir DAS schaffen?" Eine Zusage, die dich das ganze nächste Jahr verfolgt.',
        choiceTags: ['hasty'],
      },
    ],
    tags: ['kritis', 'politics', 'compliance'],
  },

  // 4 ─────────────────────────────────────────────────────────────
  {
    id: 'evt_dokumentation_verfall',
    weekRange: [19, 24],
    probability: 0.8,
    category: 'compliance',
    title: 'Doku beschreibt Geister',
    description: `Du ziehst die Netzdokumentation heran, die im Frühjahr so mühsam entstanden ist — und stutzt. Sie beschreibt drei Server, die es längst nicht mehr gibt, kennt aber die zwei neuen nicht. Ein VLAN steht noch drin, das ihr im Sommer aufgelöst habt.

Dokumentation ist wie ein Garten: Einmal angelegt heißt nicht für immer gepflegt. Und eine Doku, die die Realität falsch beschreibt, ist schlimmer als gar keine — sie führt im Ernstfall in die Irre.

Beim nächsten Vorfall oder Audit ist genau das der Unterschied zwischen "wir wissen Bescheid" und "wir raten".`,
    involvedCharacters: ['kollege'],
    choices: [
      {
        id: 'doku_pflegeprozess',
        text: 'Doku aktualisieren UND einen Pflegeprozess einführen (Doku als Teil jeder Änderung)',
        effects: { skills: { troubleshooting: 5, softSkills: 3 }, compliance: 12, relationships: { kollegen: 5 }, stress: 10 },
        resultText:
          'Du bringst die Doku auf Stand und — wichtiger — verankerst sie im Änderungsprozess: Kein System geht mehr in Betrieb oder außer Betrieb, ohne dass die Doku mitgezogen wird. {kollege} stöhnt erst über den "Papierkram", merkt aber schnell, dass die aktuelle Doku ihm bei jeder Störung Zeit spart. Ein Garten, der ab jetzt gepflegt wird.',
        teachingMoment:
          'Dokumentation, die nicht Teil des Änderungsprozesses ist, veraltet zwangsläufig. Der Trick ist nicht das einmalige Erstellen, sondern das kontinuierliche Mitziehen bei jeder Änderung.',
        setsFlags: ['doku_aktuell', 'doku_prozess'],
      },
      {
        id: 'doku_aktualisieren',
        text: 'Die Doku jetzt einmal gründlich auf den aktuellen Stand bringen',
        effects: { skills: { troubleshooting: 4 }, compliance: 8, stress: 8 },
        resultText:
          'Du arbeitest dich durch, streichst die Geister, ergänzt die neuen Systeme. Am Ende stimmt sie wieder — für den Moment. Ohne Pflegeprozess wird sie in ein paar Monaten erneut auseinanderdriften, aber fürs anstehende Audit ist sie jetzt korrekt. Ein Anfang.',
        teachingMoment:
          'Eine einmalige Aktualisierung stellt die Richtigkeit her, aber nicht die Haltbarkeit — ohne Prozess ist die nächste Verfalls-Runde nur eine Frage der Zeit.',
      },
      {
        id: 'doku_lassen',
        text: 'So lassen — im Kopf hast du es ja ohnehin',
        effects: { stress: -3, compliance: -12 },
        resultText:
          'Du schließt die Datei. "Ist ja alles in meinem Kopf." Bis zu dem Tag, an dem du krank bist und die Neue anhand der Doku einen Ausfall beheben soll — und drei Server sucht, die es nicht gibt. Wissen, das nur in einem Kopf steckt, ist genau ein Krankheitstag vom Totalverlust entfernt.',
        choiceTags: ['negligent'],
      },
    ],
    tags: ['kritis', 'compliance', 'dokumentation'],
  },

  // 5 ─────────────────────────────────────────────────────────────
  {
    id: 'evt_speicher_voll_schon_wieder',
    weekRange: [19, 24],
    probability: 0.8,
    category: 'support',
    title: 'Fileserver bei 97 Prozent',
    description: `Der zentrale Fileserver meldet 97% Belegung. Wieder. Ein Blick auf die größten Verbraucher, und du weißt, warum: Das Ordnungsamt archiviert Bodycam-Videos der Politessen in "Eigene Dateien" — unkomprimiert, mehrfach kopiert, nach Datum in immer neuen Ordnern.

Bei 100% steht nicht nur der Fileserver, sondern eine ganze Reihe von Diensten, die darauf schreiben. Du könntest einfach Platz nachschieben. Oder das eigentliche Problem angehen.

Die {fachabteilung} sieht kein Problem: "Wir müssen die Videos doch aufbewahren."`,
    involvedCharacters: ['fachabteilung'],
    choices: [
      {
        id: 'speicher_konzept',
        text: 'Ursache angehen: Aufbewahrungskonzept, richtiger Speicherort, Quotas',
        effects: { skills: { linux: 5, softSkills: 3 }, compliance: 10, relationships: { fachabteilung: 3 }, stress: 10 },
        resultText:
          'Du klärst mit dem Ordnungsamt die tatsächlichen Aufbewahrungsfristen, richtest einen dedizierten, revisionssicheren Speicher für die Videos ein und setzt Quotas auf den Fileserver. Plötzlich sind es 60% statt 97 — und Videos, die gelöscht werden dürfen, verschwinden automatisch. Aus einem Dauerproblem wird ein Prozess.',
        teachingMoment:
          'Voller Speicher ist selten ein Kapazitäts-, meist ein Prozessproblem: falsche Ablageorte, fehlende Aufbewahrungsregeln, keine Quotas. Platz nachschieben verschiebt das Problem nur nach hinten.',
        setsFlags: ['speicherkonzept_erstellt'],
      },
      {
        id: 'speicher_erweitern',
        text: 'Kurzfristig Speicher erweitern, um die Dienste am Laufen zu halten',
        effects: { skills: { linux: 3 }, budget: -2500, stress: 6 },
        resultText:
          'Du schiebst Platz nach — die Dienste laufen weiter, die 97% sinken auf 70. Erledigt, für ein paar Monate. Dann füllt das Ordnungsamt auch den neuen Platz, und du stehst wieder hier. Symptombehandlung, aber wenigstens kein Ausfall heute.',
        choiceTags: ['half_measure'],
      },
      {
        id: 'speicher_ignorieren',
        text: 'Warnung wegklicken — bis 100% ist ja noch Luft',
        effects: { stress: -3, compliance: -10 },
        resultText:
          'Du ignorierst die Warnung. Drei Tage später ist der Fileserver bei 100%. Die Dienste, die darauf schreiben, hängen sich auf — mittendrin das Fachverfahren des Sozialamts. Ein Freitagnachmittag voller aufgeregter Anrufe, den ein einziger Blick auf die Speicherwarnung verhindert hätte.',
        choiceTags: ['negligent'],
      },
    ],
    tags: ['kritis', 'support', 'speicher', 'linux'],
  },

  // 6 ─────────────────────────────────────────────────────────────
  {
    id: 'evt_haushaltssperre',
    weekRange: [19, 24],
    probability: 0.8,
    category: 'budget',
    title: 'Haushaltssperre bis Jahresende',
    description: `Eine Rundmail von {kaemmerer} an alle Abteilungen: Ab sofort gilt eine Haushaltssperre bis Jahresende. Jede Bestellung über 500 Euro braucht jetzt seine persönliche Unterschrift und eine Begründung, warum sie "unaufschiebbar" sei.

Dumm nur: Genau jetzt bräuchtest du ein paar Dinge — die USV-Batterien, eine Ersatz-Netzwerkkarte, die Lizenzverlängerung, die im Januar fällig ist. Nichts davon ist spektakulär, alles davon ist unbequem, wenn es fehlt.

{kaemmerer} macht am Telefon klar: "Ich meine das ernst. Nur was wirklich brennt."`,
    involvedCharacters: ['kaemmerer'],
    choices: [
      {
        id: 'sperre_priorisieren',
        text: 'Sauber priorisieren: nur das wirklich Kritische beantragen, gut begründet',
        effects: { skills: { softSkills: 5 }, compliance: 6, relationships: { kaemmerer: 10 }, stress: 6 },
        resultText:
          'Du machst {kaemmerer} keine Wunschliste, sondern legst genau die zwei Dinge vor, die echtes Ausfallrisiko bergen — mit Begründung, was passiert, wenn sie fehlen. Er unterschreibt beide sofort: "Danke, dass Sie mir nicht die Bude einrennen." Genau so baut man Kredit für die Zeiten auf, in denen man mehr braucht.',
        teachingMoment:
          'In der Sparphase zahlt sich Zurückhaltung aus: Wer nur das wirklich Kritische fordert und es gut begründet, wird ernst genommen — und bekommt es, wenn es darauf ankommt.',
        setsFlags: ['sperre_professionell'],
      },
      {
        id: 'sperre_kreativ',
        text: 'Kreativ überbrücken: Ersatzteile aus dem Lager, Gebrauchtes, Aufschieben',
        effects: { skills: { troubleshooting: 4 }, budget: 1500, relationships: { kaemmerer: 5 }, stress: 8 },
        resultText:
          'Du kramst im Ersatzteillager, kanibalisierst einen ausgemusterten Server für die Netzwerkkarte und verhandelst mit dem Lizenzgeber eine Zahlungsverschiebung in den Januar. Kein Cent über die Sperre hinaus. {kaemmerer} ist beeindruckt, wie weit man mit Bordmitteln kommt. Nicht elegant, aber es hält.',
        teachingMoment:
          'Knappe Budgets schulen Improvisation: Ersatzteillager, Gebrauchtmarkt und geschickte Zahlungsverhandlungen überbrücken so manche Sperre, ohne dass etwas ausfällt.',
      },
      {
        id: 'sperre_umgehen',
        text: 'Bestellungen in mehrere Posten unter 500 Euro stückeln',
        effects: { relationships: { kaemmerer: -12 }, compliance: -6, stress: 4 },
        resultText:
          'Du splittest die Bestellungen geschickt unter die 500-Euro-Grenze. Die Rechnung bekommt {kaemmerer} trotzdem auf den Tisch — und er erkennt das Muster sofort. "Sie halten mich für dumm?" Das Vertrauen, das du dir mühsam aufgebaut hast, ist mit einem einzigen Trick beschädigt. Für so ein paar Euro.',
        choiceTags: ['negligent'],
      },
    ],
    tags: ['kritis', 'budget'],
  },

  // 7 ─── Example Event B (verbatim) ───────────────────────────────
  {
    id: 'evt_ot_fernwartung_fund',
    weekRange: [20, 21],
    probability: 0.9,
    category: 'security',
    title: 'Der fremde Router im Wasserwerk',
    description: `Routinekontrolle im Wasserwerk. Hinter der Steuerungsanlage, im Schaltschrank, zwischen SPS und Netzwerk-Switch: ein LTE-Router. Betriebsbereit, Antenne dran, SIM-Karte drin.

Auf deiner Netzwerkdokumentation existiert er nicht. Der Wassermeister zuckt mit den Schultern: "Den hat die Firma Habermann vor zwei Jahren eingebaut. Für die Fernwartung. Die brauchen das, sonst kommen die nicht."

Ein unautorisierter, dauerhaft aktiver Fernzugang. Direkt an der Trinkwasser-Steuerung. Seit zwei Jahren.`,
    involvedCharacters: ['chef', 'fachabteilung'],
    mentorNote:
      'Wartungszugänge von Herstellern sind ein klassisches Einfallstor in OT-Netze (Stichwort: Fernwartung nach BSI-CS 108). Grundregel: kein dauerhaft aktiver Zugang — Freischaltung nur bei Bedarf, dokumentiert, über eine kontrollierte Rendezvous-Lösung statt einer eigenen SIM am Schaltschrank.',
    choices: [
      {
        id: 'ot_router_pull',
        text: 'Sofort ziehen: Router raus, dann klären',
        effects: { skills: { security: 6 }, compliance: 8, stress: 15, relationships: { fachabteilung: -10 } },
        resultText:
          'Du ziehst den Stecker und tütest den Router ein. Zwei Stunden später ruft Habermann an — verärgert: "Ohne den Zugang keine Störungsbehebung, steht so im Wartungsvertrag." Und tatsächlich: {chef} findet die Klausel. Jetzt braucht ihr schnell eine saubere Fernwartungslösung, sonst steht ihr beim nächsten Pumpenausfall ohne Hersteller da.',
        setsFlags: ['ot_zugang_entfernt'],
        teachingMoment:
          'Erst der Vertrag, dann der Seitenschneider — sonst tauscht man ein Sicherheitsrisiko gegen ein Betriebsrisiko.',
      },
      {
        id: 'ot_router_controlled',
        text: 'Kontrolliert ablösen: Zugang dokumentieren, härten und auf Freischaltung nach Bedarf umstellen',
        requires: { skill: 'netzwerk', threshold: 50 },
        effects: { skills: { netzwerk: 8, security: 5 }, compliance: 12, stress: 10, relationships: { chef: 10 } },
        resultText:
          'Du klemmst den Router in ein eigenes, gesperrtes Segment, protokollierst jede Verbindung und vereinbarst mit Habermann: Freischaltung nur nach Ticket, Zwei-Mann-Prinzip. Der Techniker am Telefon murrt erst — und sagt dann leise: "Ehrlich gesagt machen das die wenigsten Gemeinden. Respekt." {chef} will den Vorgang als Blaupause für alle Wartungsverträge.',
        setsFlags: ['ot_zugang_gehaertet'],
        teachingMoment:
          'Fernwartung verbieten funktioniert selten — Fernwartung kontrollieren immer: eigenes Segment, Freischaltung on demand, Protokollierung.',
      },
      {
        id: 'ot_router_escalate',
        text: 'Als Sicherheitsvorfall behandeln: {chef} und {gf} informieren, Forensik vor Abschaltung',
        effects: { skills: { security: 4, softSkills: 3 }, compliance: 10, stress: 20, relationships: { gf: 8 } },
        resultText:
          'Du meldest den Fund formal. {gf} nimmt es ernster als erwartet: "Trinkwasser. Wenn da was passiert, stehe ich vor der Kamera." Die Log-Auswertung dauert zwei Tage — Ergebnis: nur Habermann-Verbindungen, kein Missbrauch. Glück gehabt. Die Doku aus dem Vorgang ist Gold fürs nächste Audit.',
        setsFlags: ['ot_vorfall_dokumentiert'],
        teachingMoment:
          'Ein zwei Jahre unbemerkter Zugang ist ein Vorfall, auch wenn nichts passiert ist. Erst Beweise sichern, dann abschalten.',
      },
      {
        id: 'ot_router_ignore',
        text: '"Läuft ja seit zwei Jahren" — Zettel dran, Thema auf die Liste für nächstes Jahr',
        effects: { stress: -3, compliance: -12 },
        resultText:
          'Du klebst einen Zettel an den Schaltschrank: "IT weiß Bescheid." Auf dem Rückweg überholst du den Gedanken nicht mehr: Jeder, der diese SIM-Karte kennt, steht seit zwei Jahren neben eurer Trinkwasser-Steuerung. Der Wassermeister winkt dir freundlich hinterher.',
        choiceTags: ['negligent'],
        setsFlags: ['ot_zugang_ignoriert'],
      },
    ],
    tags: ['kritis', 'security', 'ot', 'wasserwerk', 'fernwartung', 'high_stakes'],
  },

  // 8 ─── flavor / comic relief ───────────────────────────────────
  {
    id: 'evt_weihnachtsfeier_technik',
    weekRange: [20, 23],
    probability: 0.7,
    category: 'absurd',
    title: '"Nur kurz" die Technik',
    description: `"Du machst doch die Technik für die Weihnachtsfeier, oder? Nur kurz Musik und den Beamer, das kannst du doch." Der Satz enthält drei Lügen: "nur", "kurz" und "das kannst du doch".

Der Beamer aus dem Sitzungssaal spricht kein HDMI, die Musikanlage ist ein Kassettendeck mit Bluetooth-Adapter aus dem Baumarkt, und irgendjemand hat eine PowerPoint mit Fotos vom Betriebsausflug vorbereitet, die "unbedingt laufen muss".

Es ist der 20. Dezember. Eigentlich wolltest du Feierabend machen.`,
    involvedCharacters: ['kollege'],
    choices: [
      {
        id: 'weihnachten_regeln',
        text: 'Kurz alles zum Laufen bringen und dann feiern',
        effects: { relationships: { kollegen: 5 }, stress: -3 },
        resultText:
          'Ein Adapter aus der Kramkiste, der Bluetooth-Adapter kooperiert nach dem dritten Versuch, die PowerPoint läuft. Als das erste Foto vom Betriebsausflug an die Wand kommt, jubelt der Saal. {kollege} drückt dir ein Glühwein in die Hand. Für einen Abend bist du der Held der Weihnachtsfeier — ganz ohne KRITIS.',
      },
      {
        id: 'weihnachten_delegieren',
        text: 'Der Neuen die Ehre lassen und nur assistieren',
        effects: { relationships: { kollegen: 6 }, stress: -2 },
        resultText:
          'Du gibst der neuen Kollegin die Fernbedienung und hältst dich im Hintergrund. Sie kriegt Beamer und Musik selbst zum Laufen, strahlt über das Erfolgserlebnis, und du hast beide Hände frei fürs Buffet. Manchmal ist die beste Technik-Unterstützung, jemand anderen glänzen zu lassen.',
      },
      {
        id: 'weihnachten_absagen',
        text: 'Freundlich abwinken — heute mal wirklich Feierabend',
        effects: { stress: -4, relationships: { kollegen: -2 } },
        resultText:
          'Du sagst freundlich, aber bestimmt, dass heute mal jemand anders dran ist, und gehst pünktlich. {kollege} bastelt dann selbst am Beamer, es dauert eine halbe Stunde länger, aber es klappt. Die Welt dreht sich weiter, auch ohne dass du jedes Kabel steckst. Guter Vorsatz fürs neue Jahr.',
      },
    ],
    tags: ['kritis', 'absurd', 'comic_relief'],
  },

  // 9 ─────────────────────────────────────────────────────────────
  {
    id: 'evt_krankheitswelle',
    weekRange: [20, 24],
    probability: 0.8,
    category: 'team',
    title: 'Allein für 300 Nutzer',
    description: `Die Grippewelle hat euch erwischt. {kollege} liegt flach, die neue Kollegin ist es auch — und du bist der Einzige, der noch steht. Allein zuständig für 300 Nutzer, alle Fachverfahren, das Wasserwerk-Netz und den ganz normalen Wahnsinn.

Die Tickets stapeln sich, das Telefon klingelt ununterbrochen, und irgendwo läuft im Hintergrund der Restore-Test, den ihr euch fürs Audit vorgenommen habt.

Du kannst nicht alles machen. Die Frage ist nur, was liegen bleiben darf.`,
    involvedCharacters: ['fachabteilung'],
    choices: [
      {
        id: 'krankheit_triage',
        text: 'Konsequent triagieren: nur Kritisches, den Rest transparent vertagen',
        effects: { skills: { troubleshooting: 5, softSkills: 3 }, compliance: 5, relationships: { fachabteilung: 3 }, stress: 12 },
        resultText:
          'Du schaltest in den Notbetrieb: eine kurze Rundmail, dass nur betriebskritische Störungen bearbeitet werden, alles andere wartet. Nicht jeder ist begeistert, aber alle wissen woran sie sind. Du hältst die kritischen Systeme am Laufen und gehst abends erschöpft, aber ohne Scherbenhaufen nach Hause. Triage schlägt Multitasking.',
        teachingMoment:
          'Im Unterbesetzungs-Notbetrieb ist ehrliche Triage die einzige Rettung: Klar kommunizieren, was bearbeitet wird und was nicht, hält die kritischen Dinge am Laufen und die Erwartungen realistisch.',
        setsFlags: ['notbetrieb_gemeistert'],
      },
      {
        id: 'krankheit_dienstleister',
        text: 'Beim Dienstleister Unterstützung für die Woche einkaufen',
        effects: { skills: { softSkills: 3 }, budget: -3000, relationships: { fachabteilung: 5 }, stress: 6 },
        resultText:
          'Du rufst den Dienstleister an und buchst für die Woche einen Techniker für den First-Level-Support. Kostet Geld, aber die Tickets werden abgearbeitet und du kannst dich auf die kritischen Systeme konzentrieren. {kaemmerer} wird über die Rechnung meckern — aber ihr habt die Krankheitswoche ohne Ausfall überstanden.',
        teachingMoment:
          'Externe Unterstützung ist in Ausnahmesituationen kein Versagen, sondern Risikomanagement: Eine Woche eingekaufter Support ist billiger als ein ausgefallenes Fachverfahren.',
      },
      {
        id: 'krankheit_alles_stemmen',
        text: 'Zähne zusammenbeißen und versuchen, alles allein zu stemmen',
        effects: { skills: { troubleshooting: 3 }, relationships: { fachabteilung: -5 }, stress: 20 },
        resultText:
          'Du versuchst, allen gerecht zu werden — und wirst es niemandem. Zwischen 40 Tickets und ständigem Telefon übersiehst du, dass der Restore-Test fehlgeschlagen ist. Am Freitag bist du völlig ausgelaugt, die {fachabteilung} trotzdem unzufrieden, und die kritischen Dinge sind zwischen den unwichtigen untergegangen. Ohne Priorisierung verliert man an allen Fronten.',
        choiceTags: ['selfless', 'hasty'],
      },
    ],
    tags: ['kritis', 'team', 'crisis'],
  },

  // 10 ────────────────────────────────────────────────────────────
  {
    id: 'evt_bsi_warnmeldung_kommunen',
    weekRange: [21, 24],
    probability: 0.85,
    category: 'security',
    title: 'BSI-Warnung: Kampagne gegen Kommunen',
    description: `Eine Warnmeldung des BSI landet in deinem Postfach, Einstufung: hoch. Eine aktive Angriffskampagne richtet sich gezielt gegen Kommunalverwaltungen. Im Anhang: Indicators of Compromise — IP-Adressen, Dateihashes, ein Angriffsmuster, das auf eine bekannte Schwachstelle abzielt.

Das ist keine allgemeine "seid vorsichtig"-Mail. Das ist konkret, aktuell, und ihr seid genau die Zielgruppe.

Die IoCs liegen vor. Die Frage ist nur, was du damit machst — außer sie zur Kenntnis zu nehmen.`,
    involvedCharacters: ['chef'],
    choices: [
      {
        id: 'bsi_ioc_pruefen',
        text: 'IoCs systematisch abgleichen: Logs prüfen, Signaturen einpflegen, Patch-Stand checken',
        effects: { skills: { security: 8, netzwerk: 3 }, compliance: 12, relationships: { chef: 8 }, stress: 10 },
        resultText:
          'Du nimmst die IoCs ernst: gleichst die IP-Adressen gegen die Firewall-Logs ab (sauber, keine Treffer), pflegst die Hashes ins AV ein und prüfst, ob die anvisierte Lücke bei euch gepatcht ist — war sie fast. Die letzten zwei Systeme patchst du sofort. {chef}: "Gut, dass wir da dran waren." Vorbereitung schlägt Panik.',
        teachingMoment:
          'BSI-Warnungen mit konkreten IoCs sind zum Handeln da, nicht zum Ablegen: Logs abgleichen, Signaturen einpflegen, Patch-Stand der betroffenen Komponente prüfen. Das ist gelebter Grundschutz.',
        setsFlags: ['bsi_warnung_abgearbeitet'],
      },
      {
        id: 'bsi_haerten',
        text: 'Vorsorglich härten: exponierte Dienste prüfen, Monitoring schärfen',
        effects: { skills: { security: 5, netzwerk: 3 }, compliance: 8, stress: 8 },
        resultText:
          'Du kennst die konkrete Lücke nicht im Detail, aber die Stoßrichtung — also härtest du breit: internetnahe Dienste geprüft, unnötige Ports zu, Monitoring auf verdächtige Muster geschärft. Kein perfekter IoC-Abgleich, aber die Angriffsfläche ist kleiner und ihr seht mehr. Solide Reaktion auf eine ernste Warnung.',
        teachingMoment:
          'Auch ohne detaillierte Analyse jeder IoC lohnt die generische Härtung: Angriffsfläche reduzieren und Sichtbarkeit erhöhen wirkt gegen die ganze Kampagne, nicht nur gegen einen Indikator.',
      },
      {
        id: 'bsi_ablegen',
        text: 'Zur Kenntnis nehmen und ablegen — ihr seid ja nur eine kleine Gemeinde',
        effects: { stress: -3, compliance: -12 },
        resultText:
          'Du verschiebst die Mail in den Ordner "BSI" und denkst: "Die meinen bestimmt die Großen." Genau diese Annahme macht kleine Kommunen zum leichten Ziel — sie sind schlechter geschützt und rechnen nicht mit gezielten Angriffen. Die IoCs hättest du in einer Stunde geprüft. Jetzt liegen sie ungelesen im Ordner.',
        choiceTags: ['negligent', 'dismissive'],
      },
    ],
    tags: ['kritis', 'security', 'bsi', 'threat_intel'],
  },

  // 11 ────────────────────────────────────────────────────────────
  {
    id: 'evt_dienstleister_insolvenz',
    weekRange: [21, 24],
    probability: 0.8,
    category: 'crisis',
    title: 'Der Dienstleister ist pleite',
    description: `Ein Brief vom Insolvenzverwalter: Euer Hosting-Dienstleister für das Ratsinformationssystem hat Insolvenz angemeldet. Das RIS — mit allen Sitzungsunterlagen, Beschlüssen, Vorlagen — läuft auf deren Servern, in deren Rechenzentrum, mit deren Software.

Wie lange die Server noch laufen? Unklar. Ob ihr an eure Daten kommt? Auch unklar. Der Vertrag hatte eine Exit-Klausel — die du jetzt zum ersten Mal wirklich liest.

Die nächste Ratssitzung ist in zwei Wochen. Ohne RIS wird das interessant.`,
    involvedCharacters: ['kaemmerer', 'chef'],
    choices: [
      {
        id: 'insolvenz_daten_sichern',
        text: 'Sofort handeln: Datenexport erzwingen und eigenständige Kopie sichern',
        effects: { skills: { troubleshooting: 6, security: 3, netzwerk: 3 }, compliance: 10, relationships: { chef: 8 }, stress: 14 },
        resultText:
          'Du wartest nicht ab, sondern ziehst umgehend einen vollständigen Datenexport, solange die Server noch laufen — und sicherst eine eigene, unabhängige Kopie aller Sitzungsdaten. Als das Rechenzentrum zwei Wochen später abgeschaltet wird, habt ihr alles. {chef} ist erleichtert: "Ich will nicht wissen, wie knapp das war." Es war knapp.',
        teachingMoment:
          'Bei Insolvenz eines IT-Dienstleisters zählt jede Stunde: Zuerst die eigenen Daten sichern, solange die Systeme noch laufen. Der Zugriff kann jederzeit enden. Deshalb gehören Exit-Klauseln und regelmäßige Datenexporte in jeden Cloud-Vertrag.',
        setsFlags: ['ris_daten_gesichert'],
      },
      {
        id: 'insolvenz_uebergangsloesung',
        text: 'Mit {kaemmerer} eine schnelle Übergangslösung organisieren',
        effects: { skills: { softSkills: 4, troubleshooting: 3 }, compliance: 6, budget: -4000, relationships: { kaemmerer: 5 }, stress: 10 },
        resultText:
          'Du klärst mit {kaemmerer} das Budget für einen schnellen Umzug und findest einen Anbieter, der das RIS übernehmen kann. Es wird hektisch, teuer und knapp — aber zur Ratssitzung läuft ein provisorisches System mit den wichtigsten Unterlagen. Nicht perfekt, aber die Sitzung kann stattfinden. Improvisation unter Zeitdruck.',
        teachingMoment:
          'Wenn ein Dienstleister ausfällt, braucht es parallel zur Datensicherung schnell eine Übergangslösung für den laufenden Betrieb — beides gleichzeitig, denn die Termine warten nicht.',
      },
      {
        id: 'insolvenz_abwarten',
        text: 'Erst mal abwarten, was der Insolvenzverwalter vorschlägt',
        effects: { relationships: { chef: -8 }, compliance: -12, stress: 6 },
        resultText:
          'Du wartest auf ein Schreiben, das nie hilfreich kommt. Der Insolvenzverwalter hat Wichtigeres zu tun, als eure Daten zu retten. Als endlich jemand antwortet, sind die Server abgeschaltet — und der Zugriff auf jahrelange Sitzungsdaten ist weg. Die zwei Wochen, in denen du hättest handeln können, sind verstrichen.',
        choiceTags: ['passive', 'negligent'],
      },
    ],
    tags: ['kritis', 'crisis', 'dienstleister'],
  },

  // 12 ────────────────────────────────────────────────────────────
  {
    id: 'evt_restore_jahrestest',
    weekRange: [21, 24],
    probability: 0.85,
    category: 'compliance',
    title: 'Der Restore-Test mit Protokoll',
    description: `Der jährliche Voll-Restore-Test steht an — diesmal nicht nur zur eigenen Beruhigung, sondern mit einem sauberen Protokoll fürs anstehende Audit. Ein Backup, das nie zurückgespielt wurde, ist nur eine Hoffnung. Zeit, die Hoffnung zu einer Gewissheit zu machen.

Das bedeutet: eine kritische Datenbank aus dem Backup auf ein Testsystem zurückspielen, Integrität prüfen, Zeit stoppen, alles dokumentieren. Ein halber Tag Arbeit, wenn es gut läuft.

Wenn es schlecht läuft, findest du heraus, dass eure Backups seit Monaten stillschweigend kaputt sind. Besser heute als im Ernstfall.`,
    involvedCharacters: [],
    choices: [
      {
        id: 'restore_vollstaendig',
        text: 'Vollständigen Restore-Test durchführen und lückenlos protokollieren',
        effects: { skills: { troubleshooting: 6, security: 4 }, compliance: 12, stress: 10 },
        resultText:
          'Du spielst die Datenbank auf ein isoliertes Testsystem zurück, prüfst die Integrität, stoppst die Wiederherstellungszeit und dokumentierst jeden Schritt. Der Restore klappt — mit einer Erkenntnis: Es dauert länger als gedacht, ein Hinweis, die Recovery-Time zu verbessern. Das Protokoll ist beim Audit Gold wert, und du weißt jetzt sicher: Die Backups funktionieren.',
        teachingMoment:
          'Ein dokumentierter Restore-Test ist der einzige Beweis, dass Backups funktionieren — und liefert nebenbei die reale Wiederherstellungszeit (RTO), die man für die Notfallplanung kennen muss.',
        setsFlags: ['restore_getestet', 'restore_protokoll'],
      },
      {
        id: 'restore_stichprobe',
        text: 'Aus Zeitgründen nur eine Stichprobe zurückspielen und prüfen',
        effects: { skills: { troubleshooting: 4 }, compliance: 6, stress: 6 },
        resultText:
          'Für den vollen Test fehlt der halbe Tag — also ziehst du eine Stichprobe: eine wichtige Datenbank, kurz zurückgespielt, Integrität geprüft. Sie ist sauber. Kein vollständiger Nachweis, aber ein realer Test statt blinden Vertrauens. Der lückenlose Durchlauf kommt aufs Programm fürs nächste Quartal.',
        teachingMoment:
          'Eine Stichprobe ist besser als gar kein Test — aber nur ein vollständiger Durchlauf beweist, dass auch die großen, kritischen Systeme in vertretbarer Zeit wiederherstellbar sind.',
      },
      {
        id: 'restore_abhaken',
        text: 'Backup-Logs prüfen, "grün" notieren und den Test abhaken',
        effects: { compliance: -10, stress: -3 },
        resultText:
          'Du schaust in die Backup-Logs — alle grün — und schreibst "Restore-Test erfolgreich" ins Protokoll, ohne wirklich etwas zurückzuspielen. Ein grünes Backup-Log heißt nur, dass das Sichern lief, nicht dass das Zurückspielen klappt. Genau diese Lücke fliegt entweder im Audit auf — oder im Ernstfall, wenn der Restore scheitert.',
        choiceTags: ['negligent', 'bureaucratic'],
      },
    ],
    tags: ['kritis', 'compliance', 'backup', 'restore'],
  },

  // 13 ────────────────────────────────────────────────────────────
  {
    id: 'evt_digitalprojekt_vs_grundschutz',
    weekRange: [21, 24],
    probability: 0.8,
    category: 'politics',
    title: 'Bürger-App gegen Grundschutz',
    description: `{gf} hat eine Vision: eine Bürger-App. Mängelmelder, Terminbuchung, Push-Nachrichten vom Rathaus — sichtbar, modern, gut fürs Image. Und dafür will sie das Budget, das gerade frei geworden ist.

Nur brauchst du genau dieses Budget für etwas Unsichtbares: die Grundschutz-Basics, die beim Nachaudit erwartet werden. Zwei-Faktor-Authentifizierung, ein zentrales Log-Management, das segmentierte Netz zu Ende gebracht.

Eine App, über die man in der Zeitung liest, gegen Sicherheit, die niemand sieht — bis sie fehlt. {gf} schaut dich erwartungsvoll an.`,
    involvedCharacters: ['gf', 'kaemmerer'],
    choices: [
      {
        id: 'digital_sicher_verbinden',
        text: 'Beides verbinden: die App nur auf sicherem Fundament, Grundschutz als Voraussetzung',
        effects: { skills: { softSkills: 6, security: 3 }, compliance: 10, relationships: { gf: 8, kaemmerer: 3 }, stress: 8 },
        resultText:
          'Du sagst nicht Nein zur App — du machst den Grundschutz zur Bedingung: "Eine Bürger-App ohne 2FA und Log-Management ist ein Datenleck mit Logo. Machen wir das Fundament, kommt die App sicher obendrauf." {gf} versteht und priorisiert die Basics. Aus einem Zielkonflikt wird eine Reihenfolge.',
        teachingMoment:
          'Sicherheit und Digitalisierung sind kein Entweder-oder: Eine bürgernahe App, die auf ungesichertem Fundament steht, wird zum Reputationsrisiko. Wer den Grundschutz als Fundament der Digitalisierung verkauft, gewinnt beide.',
        setsFlags: ['grundschutz_priorisiert'],
      },
      {
        id: 'digital_business_case',
        text: 'Sachlich abwägen: Risiko und Nutzen beider Optionen für {gf} und {kaemmerer} aufbereiten',
        effects: { skills: { softSkills: 5 }, compliance: 6, relationships: { gf: 5, kaemmerer: 5 }, stress: 6 },
        resultText:
          'Du legst beiden eine ehrliche Abwägung vor: Was bringt die App, was kostet ein Sicherheitsvorfall, was erwartet das Audit. Keine Bauchentscheidung, sondern eine Grundlage. {kaemmerer} schätzt die Nüchternheit, {gf} akzeptiert, dass die Basics zuerst kommen. Die App bleibt auf der Roadmap, nur eine Stufe später.',
        teachingMoment:
          'Zielkonflikte löst man nicht mit Bauchgefühl, sondern mit einer transparenten Nutzen-Risiko-Abwägung, die alle Beteiligten nachvollziehen können.',
      },
      {
        id: 'digital_app_nachgeben',
        text: 'Der App den Vorzug geben — Sichtbarkeit gewinnt Wahlen, Grundschutz nicht',
        effects: { relationships: { gf: 10 }, compliance: -12, stress: 4 },
        resultText:
          'Du gibst nach: Das Budget geht in die App, der Grundschutz wartet. {gf} strahlt, die App kommt in die Zeitung. Beim Nachaudit fehlen dann genau die Basics, für die das Geld gedacht war — und der Prüfer fragt, warum eine ungesicherte App gebaut wurde, bevor das Fundament stand. Sichtbarkeit hat ihren Preis.',
        choiceTags: ['political'],
      },
    ],
    tags: ['kritis', 'politics', 'digitalisierung'],
  },

  // 14 ────────────────────────────────────────────────────────────
  {
    id: 'evt_zero_day_firewall',
    weekRange: [22, 24],
    probability: 0.9,
    category: 'security',
    title: 'Zero-Day in der Firewall',
    description: `Meldung des Herstellers, höchste Dringlichkeit: eine kritische Schwachstelle in genau eurer Firewall-Appliance. Kein theoretisches Risiko — der Exploit wird bereits aktiv in freier Wildbahn ausgenutzt. Ein Angreifer kann die Firewall aus dem Internet übernehmen.

Der Patch? "In Kürze verfügbar." Das kann Stunden bedeuten oder Tage. Und die Firewall ist genau das Gerät, das zwischen dem Internet und allem steht, was euch wichtig ist.

Warten ist gefährlich. Aber die Firewall lahmlegen bedeutet, das ganze Rathaus vom Netz zu nehmen. Du musst jetzt entscheiden.`,
    involvedCharacters: [],
    choices: [
      {
        id: 'zeroday_mitigation',
        text: 'Sofort-Mitigation: Management-Zugriff sperren, Workaround des Herstellers umsetzen, überwachen',
        effects: { skills: { security: 8, netzwerk: 5 }, compliance: 12, stress: 14 },
        resultText:
          'Du wartest nicht auf den Patch, sondern setzt sofort die Notmaßnahmen um: das verwundbare Management-Interface aus dem Internet ausgesperrt, den Hersteller-Workaround angewendet, das Monitoring auf Ausnutzungsversuche geschärft. Als der Patch zwei Tage später kommt, spielst du ihn ein — aber die kritische Lücke war schon in der ersten Stunde zu. Genau so managt man einen Zero-Day.',
        teachingMoment:
          'Bei einem aktiv ausgenutzten Zero-Day ohne Patch zählt die Mitigation: Angriffsfläche sofort reduzieren (exponierte Interfaces sperren), Hersteller-Workaround umsetzen, verschärft überwachen — und patchen, sobald verfügbar.',
        setsFlags: ['zeroday_mitigiert'],
      },
      {
        id: 'zeroday_isolieren',
        text: 'Auf Nummer sicher: Firewall-Fernzugänge kappen und beim Dienstleister eskalieren',
        effects: { skills: { security: 5, softSkills: 3 }, compliance: 8, budget: -1500, relationships: { fachabteilung: -3 }, stress: 12 },
        resultText:
          'Du kappst alle nicht zwingend nötigen Zugänge übers Internet und holst den Dienstleister mit ins Boot, der die Appliance betreut. Ein paar externe Dienste sind vorübergehend nicht erreichbar, die {fachabteilung} murrt — aber die Angriffsfläche für den Exploit ist massiv geschrumpft. Vorsichtig, etwas grob, aber sicher.',
        teachingMoment:
          'Wenn die genaue Mitigation unklar ist, ist das Reduzieren der Erreichbarkeit die robuste Notmaßnahme: Was der Angreifer nicht erreichen kann, kann er nicht ausnutzen.',
      },
      {
        id: 'zeroday_warten',
        text: 'Auf den Patch warten — bis dahin läuft ja alles normal',
        effects: { stress: -3, compliance: -15 },
        resultText:
          'Du entscheidest, auf den Patch zu warten, und lässt alles laufen. Die Firewall bleibt aus dem Internet angreifbar, während der Exploit aktiv kursiert. Jede Stunde ist ein offenes Fenster. Diesmal geht es gut — der Patch kommt, bevor jemand vorbeischaut. Aber gewettet hast du mit dem Tor zu allem, was euch wichtig ist.',
        choiceTags: ['negligent'],
      },
    ],
    tags: ['kritis', 'security', 'zero_day', 'firewall', 'high_stakes'],
  },

  // 15 ────────────────────────────────────────────────────────────
  {
    id: 'evt_winterdienst_system',
    weekRange: [22, 24],
    probability: 0.85,
    category: 'crisis',
    title: '4:30 Uhr, und der Winterdienst steht',
    description: `4:30 Uhr, dein Telefon reißt dich aus dem Schlaf. Der erste Schnee der Saison ist da — und die Einsatzplanungs-Software des Winterdiensts startet nicht. Kein Streuplan, keine Routen, keine Fahrzeugzuteilung. Zwölf Fahrer stehen im Bauhof und warten.

Wenn der Winterdienst nicht rausfährt, sind bei Schnee und Glätte die Straßen ungeräumt — Schulwege, Buslinien, die Steigung vor dem Krankenhaus. Das ist keine IT-Störung mehr, das ist ein Sicherheitsproblem für die ganze Gemeinde.

Der Bauhofleiter am Telefon: "Ich brauch das System. Jetzt. Nicht um neun."`,
    involvedCharacters: ['fachabteilung', 'chef'],
    choices: [
      {
        id: 'winter_schnell_fix',
        text: 'Ruhig troubleshooten: Fehler eingrenzen, Dienst/Datenbank prüfen, gezielt fixen',
        effects: { skills: { troubleshooting: 7, netzwerk: 3 }, compliance: 8, relationships: { fachabteilung: 10 }, stress: 14 },
        resultText:
          'Du fährst nicht mit Vollgas ins Ungewisse, sondern grenzt systematisch ein: Anwendung startet, aber die Datenbank antwortet nicht — ein Dienst ist nach einem nächtlichen Update hängengeblieben. Neustart, Verbindung steht, die Routen laden. Um 5:10 Uhr rollen die Streufahrzeuge. Der Bauhofleiter: "Sie haben was gut bei mir." Methodik schlägt Panik, auch um 4:30 Uhr.',
        teachingMoment:
          'Auch unter maximalem Zeitdruck schlägt systematisches Eingrenzen das planlose Herumprobieren: erst verstehen, wo es klemmt, dann gezielt eingreifen — hektisches Raten kostet am Ende mehr Zeit.',
        setsFlags: ['winterdienst_gerettet'],
      },
      {
        id: 'winter_notplan',
        text: 'Fallback organisieren: Papier-Streuplan von letztem Jahr, Fahrer manuell einteilen',
        effects: { skills: { troubleshooting: 3, softSkills: 4 }, relationships: { fachabteilung: 8, chef: 3 }, stress: 12 },
        resultText:
          'Statt das System um jeden Preis zu reparieren, sorgst du dafür, dass geräumt wird: Der Streuplan vom letzten Winter liegt im Ordner, du gibst ihn dem Bauhofleiter durch, die Fahrer teilen sich manuell ein. Die Straßen werden geräumt, während du parallel in Ruhe das System reparierst. Der Auftrag war "Straßen frei", nicht "Software läuft".',
        teachingMoment:
          'Im Notfall zählt das Ergebnis, nicht das Werkzeug: Ein analoger Fallback (Papierplan, manuelle Einteilung) hält den kritischen Prozess am Laufen, während man die Technik in Ruhe repariert.',
      },
      {
        id: 'winter_neustart_blind',
        text: 'Server einfach durchstarten und hoffen, dass es dann läuft',
        effects: { skills: { troubleshooting: 2 }, relationships: { fachabteilung: -5 }, stress: 16 },
        resultText:
          'Du startest den ganzen Server blind neu — und machst es schlimmer: Beim Hochfahren kommen zwei weitere Dienste nicht sauber hoch, jetzt läuft gar nichts mehr. Eine Stunde und drei Neustarts später steht das System endlich, aber die Fahrzeuge sind viel zu spät raus. Blindes Neustarten unter Druck ist ein Glücksspiel — und du hast verloren.',
        choiceTags: ['hasty'],
      },
    ],
    tags: ['kritis', 'crisis', 'troubleshooting'],
  },

  // 16 ────────────────────────────────────────────────────────────
  {
    id: 'evt_jahresbericht_gemeinderat',
    weekRange: [22, 24],
    probability: 0.85,
    category: 'politics',
    title: 'IT-Sicherheitsbericht vor dem Rat',
    description: `Der jährliche IT-Sicherheitsbericht steht an — vor dem versammelten Gemeinderat. Ein Jahr KRITIS-Verantwortung in eine Präsentation gegossen: der Vorfall im Frühjahr, das NIS2-Audit, die Fortschritte, die offenen Baustellen.

{gf} hätte gern einen Bericht, der beruhigt. Der Rat besteht aus Menschen, die IT-Sicherheit für ein Kostenthema halten, bis etwas passiert. Und du weißt, dass die ehrliche Version die einzige ist, die dir beim nächsten Budgetantrag hilft.

Klartext oder Beruhigungspillen?`,
    involvedCharacters: ['gf', 'chef'],
    choices: [
      {
        id: 'jahresbericht_klartext',
        text: 'Ehrlicher Bericht: Fortschritte zeigen, Risiken benennen, Bedarf begründen',
        effects: { skills: { softSkills: 6, security: 3 }, compliance: 10, relationships: { gf: 8, chef: 5 }, stress: 8 },
        resultText:
          'Du zeigst, was ihr erreicht habt — und was noch fehlt, mit Zahlen und klarer Sprache. Der Rat hört zum ersten Mal wirklich zu. Ein Ratsmitglied: "Also brauchen Sie Geld für die Redundanz. Warum stand das nicht früher so klar da?" Genau die Frage, die du wolltest. Ehrlichkeit öffnet den Haushalt fürs nächste Jahr.',
        teachingMoment:
          'Der jährliche Sicherheitsbericht ist das wichtigste Instrument, um Rückhalt und Budget zu sichern. Wer nur beruhigt, bekommt nie Geld für Prävention — wer ehrlich Risiken benennt, schafft die Grundlage dafür.',
        setsFlags: ['jahresbericht_klartext'],
      },
      {
        id: 'jahresbericht_ausgewogen',
        text: 'Ausgewogen: Erfolge feiern, Risiken sachlich einbetten, konkrete nächste Schritte',
        effects: { skills: { softSkills: 5 }, compliance: 6, relationships: { gf: 8, chef: 5 }, stress: 6 },
        resultText:
          'Du findest die Balance: Der Bericht würdigt die Erfolge des Jahres, ordnet die Risiken ruhig ein und mündet in konkrete, machbare nächste Schritte. Der Rat fühlt sich weder beunruhigt noch für dumm verkauft. {gf} ist zufrieden, {chef} auch. Solide, professionell, wirksam.',
        teachingMoment:
          'Ein wirksamer Bericht balanciert Erfolg und Risiko: Erst die Glaubwürdigkeit durch gezeigte Fortschritte, dann die Bedarfe — so bleiben die Zuhörer offen statt defensiv.',
      },
      {
        id: 'jahresbericht_beruhigen',
        text: 'Beruhigen: alles im grünen Bereich, keine schlafenden Hunde wecken',
        effects: { relationships: { gf: 6, chef: -3 }, compliance: -8, stress: -3 },
        resultText:
          'Du malst ein grünes Bild, der Rat nickt zufrieden, keiner stellt Fragen. {gf} ist erleichtert. Beim nächsten Budgetantrag fragt dann prompt jemand: "War doch alles im grünen Bereich, wofür jetzt das Geld?" Du hast dir mit dem beruhigenden Bericht das Argument für die nötigen Investitionen selbst weggenommen.',
        choiceTags: ['political'],
      },
    ],
    tags: ['kritis', 'politics', 'reporting'],
  },

  // 17 ────────────────────────────────────────────────────────────
  {
    id: 'evt_kollege_abwerbung',
    weekRange: [22, 24],
    probability: 0.8,
    category: 'personal',
    title: 'Das Angebot',
    description: `{kollege} bittet dich um ein Gespräch unter vier Augen. Er hat ein Angebot: ein Systemhaus, 30 Prozent mehr Gehalt, moderne Technik, keine Amtsstuben. "Ich weiß nicht, ob ich das machen soll", sagt er. "Du kennst mich. Was denkst du?"

Er fragt dich ehrlich um Rat — nicht deinen Chef, dich. Und du steckst im Zwiespalt: Du brauchst {kollege}, er hält das halbe System zusammen. Aber es ist sein Leben, seine Karriere, sein Gehalt.

Was du jetzt sagst, entscheidet vielleicht, ob er bleibt. Und ob du es dir selbst verzeihst.`,
    involvedCharacters: ['kollege', 'chef'],
    choices: [
      {
        id: 'abwerbung_ehrlich_raten',
        text: 'Ehrlich beraten — in seinem Interesse, nicht in deinem',
        effects: { skills: { softSkills: 6 }, relationships: { kollegen: 15 }, stress: 8 },
        resultText:
          'Du legst die Fragen auf den Tisch, die für ihn zählen: Was willst du lernen, wie ist die Work-Life-Balance im Systemhaus wirklich, ist Geld allein es wert? Du redest ihm weder zu noch ab. Am Ende sagt er: "Danke, dass du nicht sofort versucht hast, mich zu halten." Ob er bleibt oder geht — er weiß, dass er dir vertrauen kann. Und genau das lässt ihn am Ende bleiben.',
        teachingMoment:
          'Wer einen Kollegen ehrlich in dessen Interesse berät, statt ihn eigennützig zu halten, baut das Vertrauen auf, das Menschen langfristig hält — Bindung entsteht aus Aufrichtigkeit, nicht aus Druck.',
        setsFlags: ['kollege_beraten_fair'],
      },
      {
        id: 'abwerbung_gegenangebot',
        text: 'Mit {chef} über ein Gegenangebot oder bessere Bedingungen sprechen',
        effects: { skills: { softSkills: 4 }, relationships: { kollegen: 8, chef: 3 }, stress: 10 },
        resultText:
          'Du gehst zu {chef} und lotest aus, was möglich ist — im öffentlichen Dienst selten das Gehalt, aber vielleicht Fortbildung, Aufgaben, Flexibilität. {chef} bemüht sich, und {kollege} spürt, dass er wertgeschätzt wird. Das Gehalt kann die Verwaltung nicht toppen, aber das Gesamtpaket wird verhandelt. Er überlegt es sich neu.',
        teachingMoment:
          'Gegen das Gehalt der freien Wirtschaft kann der öffentliche Dienst selten anbieten — aber Wertschätzung, Entwicklung und Arbeitsbedingungen sind Stellschrauben, die oft mehr zählen, als man denkt.',
      },
      {
        id: 'abwerbung_schwarzmalen',
        text: 'Ihm die neue Stelle schlechtreden, damit er bleibt',
        effects: { relationships: { kollegen: -10 }, stress: 4 },
        resultText:
          'Du redest das Systemhaus schlecht — Überstunden, Druck, "die versprechen viel". {kollege} merkt schnell, dass du in eigener Sache argumentierst, nicht in seiner. Das beschädigt euer Vertrauen. Wenn er trotzdem geht, geht er im Groll. Wenn er bleibt, weiß er, dass du ihn manipuliert hast. Beides verlierst du.',
        choiceTags: ['selfish', 'manipulative'],
      },
    ],
    tags: ['kritis', 'personal', 'team'],
  },

  // 18 ────────────────────────────────────────────────────────────
  {
    id: 'evt_bereitschaft_feiertage',
    weekRange: [24, 24],
    probability: 0.85,
    category: 'team',
    title: 'Rufbereitschaft über die Feiertage',
    description: `Die Feiertage rücken näher, und die Frage lässt sich nicht länger aufschieben: Wer ist über Weihnachten und Neujahr rufbereit? Eine KRITIS-Verwaltung kann nicht zwei Wochen komplett unerreichbar sein — das Wasserwerk macht keine Betriebsferien.

Drei offene Punkte: Wer übernimmt, wie wird es vergütet, und was ist eigentlich "kritisch genug", um jemanden am Heiligabend anzurufen? Ein Server, der langsam läuft? Nein. Die Trinkwasser-Steuerung, die ausfällt? Ja.

{kollege} schaut skeptisch. {chef} will eine Lösung, die niemanden verheizt und trotzdem funktioniert.`,
    involvedCharacters: ['kollege', 'chef'],
    choices: [
      {
        id: 'bereitschaft_fair_klar',
        text: 'Fairer, klarer Plan: Rotation, Vergütung geregelt, Eskalationskriterien definiert',
        effects: { skills: { softSkills: 6 }, compliance: 8, relationships: { kollegen: 10, chef: 5 }, stress: 8 },
        resultText:
          'Du machst es sauber: eine faire Rotation über beide Wochen, klar geregelte Vergütung mit {chef}, und ein eindeutiger Kriterienkatalog, was einen Anruf rechtfertigt und was bis nach den Feiertagen wartet. {kollege} ist einverstanden, weil er weiß, woran er ist. Alle wissen, wer wann dran ist und wofür. So macht man Bereitschaft erträglich.',
        teachingMoment:
          'Rufbereitschaft funktioniert nur mit drei klaren Dingen: fairer Verteilung, geregelter Vergütung und eindeutigen Eskalationskriterien. Fehlt eines davon, brennt das Team aus oder wird ständig grundlos gestört.',
        setsFlags: ['bereitschaft_geregelt'],
      },
      {
        id: 'bereitschaft_freiwillig',
        text: 'Auf Freiwilligkeit setzen und mit Ausgleich (Freizeit/Zulage) attraktiv machen',
        effects: { skills: { softSkills: 4 }, compliance: 5, relationships: { kollegen: 8 }, stress: 6, budget: -1000 },
        resultText:
          'Du fragst, wer freiwillig will, und machst es attraktiv: extra Ausgleichstage plus Zulage. Tatsächlich melden sich genug — der eine mag Ruhe im leeren Büro, der andere braucht die freien Tage im Januar. Freiwilligkeit plus fairer Ausgleich schlägt jeden Zwangsdienstplan. {kollege} nimmt sogar Silvester.',
        teachingMoment:
          'Freiwillige Bereitschaft mit echtem Ausgleich ist oft besser besetzt als eine verordnete — Menschen haben unterschiedliche Präferenzen, und fairer Ausgleich macht unbeliebte Dienste attraktiv.',
      },
      {
        id: 'bereitschaft_selbst_alles',
        text: 'Selbst die ganzen Feiertage übernehmen — dann muss keiner ran',
        effects: { relationships: { kollegen: 5 }, stress: 15 },
        resultText:
          'Du opferst dich und übernimmst beide Wochen allein. Das Team ist dankbar, aber du verbringst Weihnachten mit dem Diensthandy auf dem Tisch und Neujahr mit einem Wasserwerk-Alarm um 2 Uhr. Der Held, der immer selbst einspringt, hat irgendwann kein Privatleben mehr — und keine Reserve für den Tag, an dem es wirklich brennt.',
        choiceTags: ['selfless'],
      },
    ],
    tags: ['kritis', 'team', 'bereitschaft'],
  },

  // 19 ────────────────────────────────────────────────────────────
  {
    id: 'evt_altserver_abschaltung',
    weekRange: [24, 24],
    dayPreference: [3],
    probability: 0.8,
    category: 'support',
    title: 'Der Server, der seit 2011 läuft',
    description: `Er steht ganz unten im Rack, mit einer verblichenen Beschriftung und einem Betriebsstundenzähler jenseits von Gut und Böse: der legendäre Alt-Server, "läuft seit 2011". Windows Server 2008, längst ohne Support, aber niemand hat je gewagt, ihn abzuschalten.

Denn keiner weiß mehr genau, was alles auf ihm läuft. Irgendein altes Fachverfahren, eine Freigabe, ein Skript, das um 3 Uhr nachts irgendwas Wichtiges tut? Die Angst vor dem Unbekannten hat ihn 13 Jahre am Leben gehalten.

Jetzt willst du ihn endlich loswerden. Aber wie, ohne die halbe Verwaltung lahmzulegen?`,
    involvedCharacters: ['kollege'],
    choices: [
      {
        id: 'altserver_analysieren',
        text: 'Sauber analysieren: Abhängigkeiten und Zugriffe erfassen, migrieren, dann abschalten',
        effects: { skills: { windows: 5, netzwerk: 4, linux: 3 }, compliance: 10, relationships: { kollegen: 5 }, stress: 12 },
        resultText:
          'Du gehst methodisch vor: Netzwerkverbindungen mitschneiden, laufende Dienste und geöffnete Freigaben erfassen, wer greift zu und worauf. Es tauchen zwei aktive Dienste und eine Freigabe des Standesamts auf — die migrierst du auf aktuelle Systeme. Erst als eine Woche lang niemand mehr zugreift, ziehst du den Stecker. {kollege}: "13 Jahre, und du hast ihn in Rente geschickt, ohne dass es jemand gemerkt hat."',
        teachingMoment:
          'Altsysteme schaltet man nicht blind ab, sondern legt sie kontrolliert still: Abhängigkeiten und Zugriffe über eine Beobachtungsphase erfassen, migrieren, und erst abschalten, wenn nachweislich niemand mehr zugreift.',
        setsFlags: ['altserver_abgeschaltet'],
      },
      {
        id: 'altserver_beobachten',
        text: 'Vorsichtig herantasten: Zugriffe eine Weile beobachten, bevor irgendwas passiert',
        effects: { skills: { windows: 3, netzwerk: 3 }, compliance: 6, stress: 8 },
        resultText:
          'Du traust dem Frieden nicht und schaltest erst mal nur die Überwachung scharf: Wer verbindet sich, welche Dienste antworten, was passiert nachts um drei? Nach zwei Wochen hast du ein klares Bild, aber noch nicht abgeschaltet. Ein vorsichtiger, richtiger erster Schritt — der zweite (Migration und Abschaltung) steht noch aus.',
        teachingMoment:
          'Eine Beobachtungsphase vor der Abschaltung deckt die versteckten Abhängigkeiten auf, die keine Doku kennt — der sicherste Weg, ein Altsystem zu verstehen, bevor man es anfasst.',
      },
      {
        id: 'altserver_einfach_aus',
        text: 'Einfach ausschalten und schauen, ob sich jemand beschwert',
        effects: { skills: { troubleshooting: 2 }, relationships: { fachabteilung: -10 }, compliance: -8, stress: 14 },
        resultText:
          'Du ziehst den Stecker nach dem Prinzip "wird schon keiner merken". Es merkt jemand: Das Standesamt kommt nicht mehr an seine Freigabe, mitten in einer Trauung wird eine Urkunde gebraucht. Panischer Anruf, hektisches Wiedereinschalten, verärgerte Fachabteilung. Der "Scream-Test" bei einem 13 Jahre alten Server ist ein teures Glücksspiel.',
        choiceTags: ['hasty', 'negligent'],
      },
    ],
    tags: ['kritis', 'support', 'legacy', 'windows'],
  },

  // 20 ────────────────────────────────────────────────────────────
  {
    id: 'evt_jahresgespraech_chef',
    weekRange: [24, 24],
    probability: 0.85,
    category: 'personal',
    title: 'Jahresgespräch mit Bert',
    description: `{chef} hat dich zum Jahresgespräch gebeten — dein erstes Jahr in der KRITIS-Verantwortung liegt hinter dir. Er sitzt dir gegenüber, mit einem Formular, das er sichtlich nicht mag, und einer ungewohnt ernsten Miene.

"Es war ein wildes Jahr", sagt er. "Der Vorfall im Frühjahr, das Audit, die ganzen Baustellen. Ich will ehrlich mit dir sein — und ich will, dass du ehrlich mit mir bist. Wie war dein Jahr? Und was brauchst du, damit das nächste besser wird?"

Eine seltene Gelegenheit: Bert hört wirklich zu. Was machst du daraus?`,
    involvedCharacters: ['chef'],
    choices: [
      {
        id: 'jahresgespraech_fordern',
        text: 'Bilanz ziehen und konkret einfordern: Personal, Budget, klare Prioritäten',
        effects: { skills: { softSkills: 6 }, compliance: 5, relationships: { chef: 10 }, stress: 6 },
        resultText:
          'Du nutzt den Moment: Du zeigst, was du geleistet hast, und benennst klar, was fehlt — eine zweite feste Stelle, ein verlässliches Sicherheitsbudget, Rückendeckung bei den Fachabteilungen. {chef} notiert mit, ungewohnt beeindruckt: "Du hast recht. Ich nehme das mit nach oben." Wer nie fordert, bekommt nie. Und heute war der richtige Tag.',
        teachingMoment:
          'Das Jahresgespräch ist die eine Gelegenheit im Jahr, in der wirklich zugehört wird — wer sie ungenutzt lässt, verschenkt das beste Fenster für Personal- und Budgetforderungen. Konkret und belegt fordern.',
        setsFlags: ['forderungen_platziert'],
      },
      {
        id: 'jahresgespraech_ehrlich',
        text: 'Ehrlich reflektieren: was gut lief, was dich belastet hat, was du lernen willst',
        effects: { skills: { softSkills: 5 }, relationships: { chef: 12 }, stress: 4 },
        resultText:
          'Du bist offen — auch über die Nächte, in denen du wach lagst, und die Momente, in denen du überfordert warst. {chef} taut auf und wird selbst ehrlich: "Ich hätte dich öfter fragen sollen, wie es dir geht." Aus dem Pflichtgespräch wird ein echtes. Ihr geht mit mehr gegenseitigem Verständnis raus, als ihr das ganze Jahr hattet.',
        teachingMoment:
          'Ehrliche Selbstreflexion im Mitarbeitergespräch schafft Vertrauen und eine Grundlage für echte Unterstützung — Verletzlichkeit ist im richtigen Rahmen eine Stärke, keine Schwäche.',
      },
      {
        id: 'jahresgespraech_alles_gut',
        text: '"Alles gut, läuft" — das Gespräch schnell hinter dich bringen',
        effects: { relationships: { chef: -3 }, stress: -3 },
        resultText:
          'Du sagst, es sei alles in Ordnung, und Bert füllt erleichtert sein ungeliebtes Formular aus. Zehn Minuten, fertig. Und damit ist auch die eine Gelegenheit vertan, in der er zugehört hätte — für Personal, für Budget, für ein "wie geht es dir eigentlich". Nächstes Jahr wunderst du dich wieder, warum sich nichts ändert.',
        choiceTags: ['passive'],
      },
    ],
    tags: ['kritis', 'personal'],
  },

  // 21 ─── flavor finale ───────────────────────────────────────────
  {
    id: 'evt_jahresrueckblick_finale',
    weekRange: [24, 24],
    dayPreference: [4],
    probability: 0.9,
    category: 'story',
    title: 'Rundgang durch den Serverraum',
    description: `Vorletzter Tag des Jahres. Das Rathaus ist fast leer, die meisten schon im Urlaub. Du gehst durch den Serverraum, allein, mit einem Kaffee in der Hand, und ziehst still Bilanz.

Vor einem Jahr war das hier ein Kartenhaus. Ein Vorfall im Wasserwerk-Netz. Ein Audit. Eine Klimaanlage, die im Sommer kapitulierte. Ein laminierter Zettel mit dem Admin-Passwort. Und trotzdem steht ihr noch — mehr als das.

Die Server summen leise. Zum ersten Mal seit langem klingt das nicht nach Bedrohung, sondern nach Normalität.`,
    involvedCharacters: ['kollege'],
    choices: [
      {
        id: 'rueckblick_stolz',
        text: 'Innehalten und anerkennen, was du geschafft hast',
        effects: { stress: -5, skills: { softSkills: 3 } },
        resultText:
          'Du bleibst kurz stehen und lässt es sacken. Das getestete Backup, die Segmentierung, die Notfallübung, das Team, das gewachsen ist. Nicht alles ist perfekt — aber das Kartenhaus ist zu einem Fundament geworden. {kollege} kommt vorbei, sieht dein Gesicht und grinst: "Ganz gutes Jahr, oder?" Ja. Ganz gutes Jahr.',
        teachingMoment:
          'Innezuhalten und Erreichtes anzuerkennen ist kein Luxus, sondern Psychohygiene — wer nur die offenen Baustellen sieht, brennt aus. Auch Fortschritt darf gefeiert werden.',
      },
      {
        id: 'rueckblick_naechstes_jahr',
        text: 'Schon an die offenen Baustellen fürs nächste Jahr denken',
        effects: { stress: 2, skills: { softSkills: 2 } },
        resultText:
          'Dein Blick wandert von Rack zu Rack, und im Kopf wächst schon die Liste fürs neue Jahr: die Redundanz, die letzten Windows-10-Geräte, die ISO-Roadmap. Ganz abschalten kannst du nie. Aber diesmal ist es keine Angstliste, sondern ein Plan. Es gibt einen Unterschied, und den spürst du zum ersten Mal.',
      },
      {
        id: 'rueckblick_feierabend',
        text: 'Kaffee austrinken und pünktlich in den Feierabend gehen',
        effects: { stress: -6 },
        resultText:
          'Du trinkst den Kaffee aus, wirfst noch einen Blick auf die leise summenden Server und machst das Licht aus. Manchmal ist die beste Entscheidung, einfach nach Hause zu gehen. Die Server laufen. Die Welt dreht sich. Und du hast dir den Feierabend verdient.',
      },
    ],
    tags: ['kritis', 'story', 'finale'],
  },

  // 22 ─── flavor finale ───────────────────────────────────────────
  {
    id: 'evt_letzter_tag_ausblick',
    weekRange: [24, 24],
    dayPreference: [5],
    probability: 0.9,
    category: 'story',
    title: 'Sekt und ein Formular',
    description: `Letzter Arbeitstag des Jahres. Am Nachmittag steht {chef} in der Tür, in der Hand eine Flasche Sekt und zwei Plastikbecher. "Auf ein Jahr, das wir überlebt haben", sagt er und grinst schief.

Kaum ist der erste Becher eingeschenkt, kommt {kaemmerer} herein — natürlich mit einem Formular. "Nur ganz kurz", sagt er. "Das Budget-Formular für nächstes Jahr. Wenn Sie das gleich ausfüllen, sparen wir uns im Januar den Stress."

Sekt in der einen Hand, Haushaltsbürokratie in der anderen. Ein perfektes Bild für das ganze Jahr.`,
    involvedCharacters: ['chef', 'kaemmerer'],
    choices: [
      {
        id: 'letzter_tag_anstossen',
        text: 'Erst anstoßen, das Formular hat bis Januar Zeit',
        effects: { stress: -6, relationships: { chef: 5 } },
        resultText:
          'Du legst {kaemmerer} freundlich die Hand auf den Formular-Arm: "Januar, versprochen." Ihr stoßt an, {chef} erzählt zum dritten Mal die Geschichte vom Bagger, und selbst {kaemmerer} lässt sich einen Becher aufdrängen. Ein guter letzter Tag. Das Formular läuft nicht weg. Das Jahr schon.',
        teachingMoment:
          'Auch im Rathaus gilt: Es gibt einen Moment zum Feiern und einen zum Arbeiten. Beides zu vermischen wird beidem nicht gerecht.',
      },
      {
        id: 'letzter_tag_formular_direkt',
        text: 'Das Formular gleich ausfüllen — die Forderungen sitzen ja frisch im Kopf',
        effects: { skills: { softSkills: 3 }, compliance: 3, relationships: { kaemmerer: 8 } },
        resultText:
          'Du nimmst {kaemmerer} beim Wort und füllst das Formular gleich aus — Redundanz, Personal, Sicherheitsbudget, alles frisch aus dem Jahresgespräch im Kopf. {kaemmerer} ist angenehm überrascht: "So motiviert erlebt man das selten." Der Sekt schmeckt danach doppelt gut, weil das lästige Ding vom Tisch ist — und deine Forderungen schon im Haushalt stehen.',
        teachingMoment:
          'Manchmal ist es klüger, das Eisen zu schmieden, solange es heiß ist: Wer seine Budgetforderungen direkt einträgt, solange sie präsent sind, muss im Januar nicht neu darum kämpfen.',
      },
      {
        id: 'letzter_tag_beide',
        text: 'Anstoßen UND {kaemmerer} versprechen, dass er das Formular als Erstes im Januar bekommt',
        effects: { stress: -4, relationships: { chef: 3, kaemmerer: 5 } },
        resultText:
          'Du findest die Mitte: einen Becher Sekt für alle und ein festes Versprechen an {kaemmerer}, dass das Formular am zweiten Januar auf seinem Tisch liegt — ausgefüllt. Er ist zufrieden, {chef} auch, und du gehst mit einem guten Gefühl ins neue Jahr. Ein diplomatischer Abschluss für ein Jahr voller Diplomatie.',
      },
    ],
    tags: ['kritis', 'story', 'finale'],
  },
];
