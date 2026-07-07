import { GameEvent } from '@kritis/shared';

/**
 * Weeks 13-18: "Konsolidierung unter Druck" (KRITIS late game, first half).
 * Summer slump, patch debt, shadow IT, hiring, and the run-up to the NIS2
 * Nachaudit (the audit arc itself lives in kritis-special.ts).
 * No requiredModes: only KRITIS reaches week 13+, so weekRange is the gate —
 * these events are structurally invisible to every 12-week mode.
 */
export const week13to18Events: GameEvent[] = [
  // 1 ─────────────────────────────────────────────────────────────
  {
    id: 'evt_halbzeit_bilanz',
    weekRange: [13, 13],
    dayPreference: [1],
    probability: 0.9,
    category: 'politics',
    title: 'Halbzeit vor dem Gemeinderat',
    description: `{chef} steht in deiner Tür, halb entschuldigend. "Der Gemeinderat tagt Freitag. Sie wollen einen Sachstand zur IT. Zwei Seiten, nicht mehr — die lesen sowieso nur die Überschriften."

Du weißt, was seit Januar alles schiefging: der Vorfall im Wasserwerk-Netz, die Budgetkürzung, die halbe Doku. Und du weißt, was gut lief. Die Frage ist nur, welche Geschichte diese zwei Seiten erzählen.

"Mach mich nicht zum Deppen vor dem Rat", sagt {chef}. "Aber lüg auch nicht. Beides fällt auf mich zurück."`,
    involvedCharacters: ['chef', 'gf'],
    choices: [
      {
        id: 'bilanz_ehrlich',
        text: 'Ehrliche Bilanz: Erfolge UND offene Risiken benennen',
        effects: { skills: { softSkills: 5 }, compliance: 8, relationships: { chef: 5, gf: 8 }, stress: 8 },
        resultText:
          'Du schreibst Klartext: was steht, was fehlt, was es kostet. {gf} liest es zweimal und nickt: "Endlich mal jemand, der nicht nur Schönwetter macht." {chef} ist erst nervös — bis der Rat die offene Kommunikation ausdrücklich lobt. Das Risiko hat sich gelohnt.',
        teachingMoment:
          'Ein ehrlicher Lagebericht schafft die Grundlage, um später Budget für die Risiken zu bekommen. Wer nur Erfolge meldet, bekommt nie Geld für Probleme.',
        setsFlags: ['bilanz_ehrlich'],
      },
      {
        id: 'bilanz_erfolge',
        text: 'Erfolge betonen, Risiken diplomatisch klein halten',
        effects: { skills: { softSkills: 3 }, relationships: { chef: 8 }, compliance: -5, stress: -3 },
        resultText:
          'Der Rat applaudiert höflich, {chef} strahlt. Zwei Seiten voller grüner Häkchen. Nur: Beim nächsten Vorfall fragt garantiert jemand, warum davon im Bericht nichts stand. Die zwei Seiten hast du dann auch noch.',
        choiceTags: ['political'],
      },
      {
        id: 'bilanz_chef_machen',
        text: 'Rohdaten liefern und {chef} den Bericht selbst schreiben lassen',
        effects: { relationships: { chef: -5 }, stress: -5 },
        resultText:
          'Du schickst {chef} eine Stichpunktliste und wäschst die Hände in Unschuld. Er baut daraus zwei Seiten, die niemand versteht — und im Rat fragt prompt jemand nach Details, die nur du kennst. {chef} steht allein da und merkt es sich.',
        choiceTags: ['passive'],
      },
      {
        id: 'bilanz_kennzahlen',
        text: 'Mit belastbaren Kennzahlen argumentieren (Verfügbarkeit, Vorfälle, Reifegrad)',
        requires: { skill: 'softSkills', threshold: 45 },
        effects: { skills: { softSkills: 6 }, compliance: 10, relationships: { gf: 10, chef: 5 }, stress: 6 },
        resultText:
          'Du baust den Bericht auf Zahlen: 99,4% Verfügbarkeit, drei gemeldete Vorfälle, Reifegrad von 2 auf 3. Der Rat kann plötzlich mitreden. {gf}: "Damit kann ich arbeiten." Genau so bekommt IT im Rathaus Gewicht.',
        teachingMoment:
          'Kennzahlen übersetzen IT in eine Sprache, die Verwaltung und Politik verstehen. Ohne Metriken bleibt IT-Sicherheit ein Bauchgefühl — und Bauchgefühl bekommt kein Budget.',
      },
    ],
    tags: ['kritis', 'politics', 'reporting'],
  },

  // 2 ─────────────────────────────────────────────────────────────
  {
    id: 'evt_urlaubsplanung_sommer',
    weekRange: [13, 14],
    probability: 0.85,
    category: 'team',
    title: 'Drei Anträge, zwei Wochen',
    description: `Drei Urlaubsanträge liegen auf deinem Schreibtisch — alle für dieselben zwei Wochen im August. {kollege} will zur Hochzeit seiner Schwester, die Aushilfe hat Familienurlaub gebucht, und du selbst hättest auch gern mal frei.

Nur: Irgendwer muss die Stellung halten. Zwei Wochen ohne erreichbare IT sind in einer KRITIS-Verwaltung keine Option, egal wie ruhig der August normalerweise ist.

"Das kriegen wir doch geregelt, oder?", fragt {kollege} mit einem Blick, der schon weiß, dass es unangenehm wird.`,
    involvedCharacters: ['kollege'],
    choices: [
      {
        id: 'urlaub_fair_teilen',
        text: 'Fair aufteilen: gestaffelte Wochen + klare Rufbereitschaft aushandeln',
        effects: { skills: { softSkills: 5 }, relationships: { kollegen: 10 }, stress: 8 },
        resultText:
          'Ihr setzt euch zusammen und staffelt: jeder kriegt eine seiner zwei Wochen, mit sauberem Bereitschaftsplan dazwischen. Keiner ist restlos glücklich, aber alle fühlen sich fair behandelt. {kollege} bringt am nächsten Tag Kuchen mit.',
        teachingMoment:
          'Ein transparent ausgehandelter Plan hält länger als eine von oben verordnete Lösung — Betroffene tragen mit, was sie mitentschieden haben.',
        setsFlags: ['urlaub_geregelt'],
      },
      {
        id: 'urlaub_selbst_zurueck',
        text: 'Selbst zurückstecken und den anderen Vorrang geben',
        effects: { relationships: { kollegen: 15 }, stress: 12 },
        resultText:
          'Du streichst deinen eigenen Urlaub und hältst allein die Stellung. Das Team ist dankbar — {kollege} tanzt auf der Hochzeit, du sitzt bei 34°C im Serverraum. Der Held, der niemals frei hat, brennt am Ende aus. Aber diesmal geht es gut.',
        choiceTags: ['selfless'],
      },
      {
        id: 'urlaub_reihenfolge',
        text: 'Nach Eingangsdatum entscheiden — wer zuerst kam, mahlt zuerst',
        effects: { relationships: { kollegen: -5 }, stress: -3 },
        resultText:
          'Bürokratisch sauber, menschlich mäßig: {kollege} hat seinen Antrag drei Tage zu spät gestellt und guckt jetzt in die Röhre — ausgerechnet für die Hochzeit. Er akzeptiert es zähneknirschend, aber die Stimmung im Büro ist zwei Wochen lang eine andere.',
        choiceTags: ['bureaucratic'],
      },
    ],
    tags: ['kritis', 'team', 'personal'],
  },

  // 3 ─────────────────────────────────────────────────────────────
  {
    id: 'evt_vpn_zertifikat_abgelaufen',
    weekRange: [13, 14],
    probability: 0.9,
    category: 'crisis',
    title: 'Der Außendienst steht vor der Tür',
    description: `7:15 Uhr, dein Telefon glüht. Der komplette Außendienst — Bauhof, Ordnungsamt, die mobilen Sozialarbeiter — kommt nicht mehr ins VPN. "Zertifikat abgelaufen oder ungültig", meldet jeder Client.

Ein Blick ins Log bestätigt es: Das VPN-Gateway-Zertifikat ist heute Nacht um 0:00 Uhr abgelaufen. Kein Alarm, keine Vorwarnung — die Überwachung dafür gab es nie.

Vierzig Leute stehen vor verschlossener Tür. Die {fachabteilung} ruft im Minutentakt an.`,
    involvedCharacters: ['fachabteilung'],
    choices: [
      {
        id: 'vpn_schnell_neu',
        text: 'Sofort neues Zertifikat ausstellen und ausrollen',
        effects: { skills: { troubleshooting: 6, netzwerk: 4 }, relationships: { fachabteilung: 8 }, stress: 12 },
        resultText:
          'Du generierst ein frisches Zertifikat, spielst es aufs Gateway und schickst die Erneuerungs-Anleitung an alle Clients. Nach 90 Minuten sind die ersten wieder drin, nach zwei Stunden alle. Die {fachabteilung} atmet auf — und du legst dir sofort eine Kalendererinnerung für nächstes Jahr an.',
        teachingMoment:
          'Zertifikate haben ein Ablaufdatum — und genau das wird gern vergessen. Ein Monitoring auf Restlaufzeit (z.B. 30 Tage vorher) verhindert genau solche Morgen.',
        setsFlags: ['vpn_wiederhergestellt'],
      },
      {
        id: 'vpn_dienstleister',
        text: 'Den Dienstleister anrufen — die haben das Gateway aufgesetzt',
        effects: { budget: -1200, relationships: { fachabteilung: -5 }, stress: 6 },
        resultText:
          'Der Dienstleister ist hilfsbereit, aber erst in drei Stunden vor Ort. Bis dahin arbeitet der Außendienst mit dem Handy-Hotspot und schlechter Laune. Am Ende läuft es wieder — auf deiner Rechnung steht ein Notfalleinsatz-Aufschlag. Und die eigentliche Ursache kennst du immer noch nicht.',
        choiceTags: ['escalate'],
      },
      {
        id: 'vpn_monitoring_dauerhaft',
        text: 'Fix ausrollen UND ein Ablauf-Monitoring für alle Zertifikate aufsetzen',
        requires: { skill: 'netzwerk', threshold: 45 },
        effects: { skills: { netzwerk: 8, security: 4, troubleshooting: 4 }, compliance: 10, relationships: { fachabteilung: 8 }, stress: 14 },
        resultText:
          'Du behebst nicht nur das Symptom: Nach dem Notfix inventarisierst du jedes Zertifikat im Haus und hängst ein Monitoring dran, das 30 Tage vor Ablauf warnt. Die {fachabteilung} ist wieder online — und dieser Fehler passiert kein zweites Mal. Aus einer Panne wird ein Prozess.',
        teachingMoment:
          'Der Unterschied zwischen Feuerwehr und Betrieb: Nach jedem Vorfall die Frage "Wie verhindere ich, dass mich das nochmal um 7 Uhr weckt?" beantworten.',
        setsFlags: ['zert_monitoring_aktiv'],
      },
    ],
    tags: ['kritis', 'crisis', 'netzwerk', 'certificates'],
  },

  // 4 ─────────────────────────────────────────────────────────────
  {
    id: 'evt_serverraum_sommerhitze',
    weekRange: [13, 15],
    probability: 0.85,
    category: 'crisis',
    title: 'Serverraum, 31 Grad',
    description: `Draußen 34°C, drinnen 31°C — und der einzige Trennwert dazwischen ist eine Klimaanlage, die für deutsche Sommer von 1998 dimensioniert wurde. Sie läuft am Anschlag und schafft es trotzdem nicht mehr.

Die Server drosseln bereits die Taktung. Das Monitoring meldet die ersten Temperaturwarnungen an den Netzteilen. Wenn die Hitzewelle noch drei Tage anhält, fällt entweder die Klima ganz aus — oder die Hardware.

{kaemmerer} hat schon zweimal abgelehnt, eine neue Klimaanlage zu bezahlen. "Läuft doch."`,
    involvedCharacters: ['kaemmerer'],
    choices: [
      {
        id: 'hitze_notmassnahmen',
        text: 'Sofortmaßnahmen: nicht-kritische Server abschalten, Türen auf, Ventilatoren',
        effects: { skills: { troubleshooting: 5 }, stress: 8 },
        resultText:
          'Du fährst Testsysteme runter, stellst Baumarkt-Ventilatoren auf und öffnest den Raum zum kühleren Flur. Provisorisch, aber die Temperatur sackt auf 27°C. Die Hardware überlebt die Woche. Elegant ist anders — funktioniert hat es trotzdem.',
        teachingMoment:
          'In der akuten Krise zählt Wärmeabfuhr, nicht Eleganz: Last reduzieren und Luft bewegen kauft die Zeit, die für die richtige Lösung fehlt.',
        setsFlags: ['hitze_ueberbrueckt'],
      },
      {
        id: 'hitze_kaemmerer_druck',
        text: '{kaemmerer} mit dem Ausfallrisiko konfrontieren und Notbudget fordern',
        effects: { skills: { softSkills: 4 }, relationships: { kaemmerer: -5 }, compliance: 5, stress: 10, budget: -6000 },
        resultText:
          'Du rechnest {kaemmerer} vor, was ein hitzebedingter Totalausfall der Bürgerdienste kostet — pro Tag. Diesmal genehmigt er das Klima-Provisorium, unter Murren: "Aber das ist das letzte Mal." Ihr habt eine mobile Klimaeinheit. Und {kaemmerer} eine Notiz mit deinem Namen.',
        choiceTags: ['escalate'],
      },
      {
        id: 'hitze_ignorieren',
        text: 'Fenster auf und hoffen, dass die Hitzewelle vorbeigeht',
        effects: { stress: -3, compliance: -8 },
        resultText:
          'Du kippst das Fenster und gehst in den Feierabend. In der Nacht meldet die USV zwei überhitzte Netzteile ab. Ein Server bootet am Morgen nicht mehr sauber. Die Hitzewelle war dir egal — der Hitzewelle du auch.',
        choiceTags: ['negligent'],
      },
    ],
    tags: ['kritis', 'crisis', 'hardware', 'serverraum'],
  },

  // 5 ─── Example Event A (verbatim) ───────────────────────────────
  {
    id: 'evt_schatten_it_cloud',
    weekRange: [13, 15],
    probability: 0.9,
    category: 'security',
    title: 'Das Trello-Board des Bauamts',
    description: `Beim Aufräumen der Firewall-Logs stolperst du über regen Traffic zu einem Cloud-Dienst, den ihr nie eingeführt habt.

Eine kurze Recherche später: Das Bauamt organisiert seit Monaten sämtliche Bauanträge über ein privates Trello-Board. Mit Namen, Adressen, Grundstücksdaten. Angelegt mit dem Privat-Account einer Sachbearbeiterin. Passwort: vermutlich "Sommer2025".

"Das ist viel übersichtlicher als euer Fachverfahren", sagt die {fachabteilung}, als du anrufst. "Wollt ihr uns das jetzt auch noch wegnehmen?"`,
    involvedCharacters: ['fachabteilung'],
    choices: [
      {
        id: 'shadow_it_shutdown',
        text: 'Sofort unterbinden: Dienst an der Firewall sperren, Board löschen lassen',
        effects: { compliance: 10, relationships: { fachabteilung: -15 }, stress: 5, skills: { security: 3 } },
        resultText:
          'Das Board ist weg, die Daten auch aus der Cloud. Das Bauamt arbeitet wieder mit dem Fachverfahren — und beschwert sich bei {chef} über "die IT, die alles blockiert". Immerhin: Bei der nächsten Datenpanne bist du nicht schuld.',
        setsFlags: ['shadow_it_blocked'],
        teachingMoment:
          'Schatten-IT entsteht, wo offizielle Werkzeuge zu unbequem sind. Sperren behebt das Symptom — die Ursache bleibt.',
      },
      {
        id: 'shadow_it_migrate',
        text: 'Verstehen, was fehlt — und eine offizielle Alternative aufsetzen',
        effects: { skills: { softSkills: 5, security: 3 }, compliance: 5, stress: 10, relationships: { fachabteilung: 10 } },
        resultText:
          'Du setzt dich eine Stunde ins Bauamt und schaust zu, wie sie arbeiten. Danach richtest du ein internes Kanban-Board im eigenen Rechenzentrum ein und migrierst die Karten. "Fast so gut wie Trello", sagt die Sachbearbeiterin. Aus ihrem Mund ist das ein Ritterschlag.',
        setsFlags: ['shadow_it_migrated'],
        teachingMoment:
          'Die nachhaltigste Antwort auf Schatten-IT: ein offizielles Angebot, das mindestens so bequem ist wie das inoffizielle.',
      },
      {
        id: 'shadow_it_tolerate',
        text: 'Dulden und nur dokumentieren — du hast gerade größere Baustellen',
        effects: { stress: -3, compliance: -10 },
        resultText:
          'Du schreibst eine Aktennotiz und legst sie ab. Das Board läuft weiter, die Grundstücksdaten bleiben in der Cloud. Beim nächsten Audit wird jemand genau diese Aktennotiz finden — mit deinem Namen drauf.',
        choiceTags: ['negligent'],
      },
      {
        id: 'shadow_it_dpa_check',
        text: 'Formal sauber: Datenschutzprüfung anstoßen und AV-Vertrag prüfen lassen',
        requires: { skill: 'softSkills', threshold: 45 },
        effects: { compliance: 12, skills: { softSkills: 4 }, relationships: { gf: 5 }, stress: 8 },
        resultText:
          'Du eskalierst sauber über den Datenschutzbeauftragten. Ergebnis: kein AV-Vertrag, keine Rechtsgrundlage, Board muss weg — aber die Anweisung kommt jetzt von {gf}, nicht von dir. Das Bauamt ist trotzdem sauer. Nur nicht auf dich.',
        teachingMoment:
          'Personenbezogene Daten bei US-Cloud-Diensten ohne AV-Vertrag sind kein IT-Problem, sondern ein Rechtsproblem. Genau dafür gibt es den DSB.',
      },
    ],
    tags: ['kritis', 'security', 'shadow_it', 'dsgvo'],
  },

  // 6 ─────────────────────────────────────────────────────────────
  {
    id: 'evt_updates_stau',
    weekRange: [13, 16],
    probability: 0.85,
    category: 'support',
    title: '214 offene Updates',
    description: `Die Krisenmonate haben ihre Spuren hinterlassen: Während du Feuer gelöscht hast, hat niemand gepatcht. Der Update-Report ist ernüchternd — 214 offene Updates auf 40 Systemen, einige davon mit CVSS-Score im roten Bereich.

Alles auf einmal einspielen? Ein Wochenende Arbeit und das Risiko, dass die Hälfte danach nicht mehr bootet. Nichts tun? Jeder Tag vergrößert die Angriffsfläche.

Irgendwo musst du anfangen. Nur wo?`,
    involvedCharacters: [],
    choices: [
      {
        id: 'updates_risiko_prio',
        text: 'Nach Risiko priorisieren: kritische CVEs auf exponierten Systemen zuerst',
        effects: { skills: { security: 5, windows: 4, linux: 4 }, compliance: 8, stress: 8 },
        resultText:
          'Du sortierst nach Erreichbarkeit und Schweregrad: erst die internetnahen Systeme mit aktiv ausgenutzten Lücken, dann der Rest in Wellen. Nach zwei Wochen ist der rote Bereich leer. Nicht alles gepatcht, aber das Gefährlichste zuerst — genau richtig.',
        teachingMoment:
          'Patch-Priorisierung folgt dem Risiko, nicht der Reihenfolge im Report: Was ist erreichbar, was wird aktiv ausgenutzt, was ist geschäftskritisch?',
        setsFlags: ['patch_prioritisiert'],
      },
      {
        id: 'updates_alles_wochenende',
        text: 'Am Wochenende alles auf einmal durchziehen',
        effects: { skills: { troubleshooting: 5, windows: 3 }, stress: 18 },
        resultText:
          'Du opferst ein Wochenende und spielst alles ein. Montag früh läuft das meiste — bis auf das Fachverfahren im Sozialamt, das ein Update nicht verträgt. Drei Stunden Fehlersuche später läuft auch das. Alles grün, aber du bist durch. Und ohne Testsystem war das reines Glück.',
        choiceTags: ['hasty', 'brave'],
      },
      {
        id: 'updates_spaeter',
        text: 'Erst mal liegen lassen — läuft ja alles',
        effects: { stress: -3, compliance: -12 },
        resultText:
          'Du schließt den Report und wendest dich Wichtigerem zu. Der Report wird nicht kleiner, die 214 werden 240. Irgendwann ist genau eine dieser Lücken der Weg, über den jemand reinkommt. Aber heute noch nicht.',
        choiceTags: ['negligent'],
      },
    ],
    tags: ['kritis', 'support', 'patching', 'compliance'],
  },

  // 7 ─────────────────────────────────────────────────────────────
  {
    id: 'evt_praktikant_erster_tag',
    weekRange: [14, 15],
    probability: 0.8,
    category: 'team',
    title: 'Der Praktikant im Serverraum',
    description: `Ein 17-Jähriger steht mitten im Serverraum, Schülerpraktikum, erster Tag. Niemand hat dir Bescheid gesagt. Er zeigt auf einen Rack-Server und fragt: "Was ist ein Domänencontroller? Und warum blinken die alle so?"

Er ist neugierig, höflich und hat offensichtlich Interesse. Aber du hast heute eigentlich keine Zeit — und ein 17-Jähriger allein zwischen produktiven KRITIS-Systemen ist auch keine gute Idee.

Er wartet auf eine Antwort. Und schaut schon wieder viel zu interessiert auf den Not-Aus-Schalter.`,
    involvedCharacters: ['kollege'],
    choices: [
      {
        id: 'praktikant_mitnehmen',
        text: 'Ihn ernst nehmen: erklären, einbinden, ungefährliche Aufgabe geben',
        effects: { skills: { softSkills: 5 }, relationships: { kollegen: 8 }, stress: 5 },
        resultText:
          'Du erklärst ihm den Domänencontroller in zwei Sätzen und setzt ihn an die Inventarliste — Kabel beschriften, Seriennummern erfassen. Er ist Feuer und Flamme und macht die Arbeit, die seit Monaten liegen bleibt. {kollege} grinst: "Vielleicht sollten wir den behalten."',
        teachingMoment:
          'Nachwuchsförderung kostet erst Zeit und zahlt sich später aus — der neugierige Praktikant von heute ist der Fachkräfteengpass von morgen, den du gerade vermeidest.',
        setsFlags: ['praktikant_gefoerdert'],
      },
      {
        id: 'praktikant_wegschicken',
        text: 'Freundlich zu {kollege} ins Büro schicken — du hast keine Zeit',
        effects: { relationships: { kollegen: -3 }, stress: -3 },
        resultText:
          'Du schiebst ihn zu {kollege}, der auch nichts mit ihm anzufangen weiß. Der Junge sitzt zwei Wochen gelangweilt daneben, sortiert Altpapier und geht mit dem Eindruck, IT sei stinklangweilig. Schade um einen, der ehrlich Interesse hatte.',
        choiceTags: ['dismissive'],
      },
      {
        id: 'praktikant_rausbegleiten',
        text: 'Ihn sofort aus dem Serverraum begleiten — kein Ort für Unbefugte',
        effects: { skills: { security: 3 }, compliance: 5 },
        resultText:
          'Du begleitest ihn freundlich, aber bestimmt raus und schließt ab. Sicherheitstechnisch korrekt — der Serverraum ist kein Aufenthaltsraum. Danach organisierst du ihm ein sinnvolles Programm außerhalb der kritischen Zone. Zugangskontrolle gilt auch für 17-Jährige mit Neugier.',
        teachingMoment:
          'Physische Zugangskontrolle zu kritischen Systemen kennt keine Ausnahmen für "ist ja nur der Praktikant". Freundlich bleiben, aber die Grenze halten.',
      },
    ],
    tags: ['kritis', 'team', 'nachwuchs'],
  },

  // 8 ─────────────────────────────────────────────────────────────
  {
    id: 'evt_wartungsvertrag_preiserhoehung',
    weekRange: [14, 16],
    probability: 0.8,
    category: 'budget',
    title: 'Marktanpassung, plus 40 Prozent',
    description: `Der Wartungsvertrag für die Telefonanlage flattert zur Verlängerung herein — mit einem freundlichen Anschreiben und einer unfreundlichen Zahl: plus 40 Prozent. Begründung: "Marktanpassung".

Die Anlage ist zehn Jahre alt und tut, was sie soll. Der Anbieter weiß genau, dass ein Wechsel euch mehr Aufwand kostet als die Erhöhung — und kalkuliert das ein.

{kaemmerer} hat den Vertrag schon gesehen und dir eine E-Mail geschickt: "Das können wir nicht einfach zahlen. Machen Sie was."`,
    involvedCharacters: ['kaemmerer'],
    choices: [
      {
        id: 'wartung_verhandeln',
        text: 'Verhandeln: Wettbewerbsangebote einholen und damit Druck machen',
        effects: { skills: { softSkills: 5 }, relationships: { kaemmerer: 10 }, budget: 2000, stress: 8 },
        resultText:
          'Du holst zwei Vergleichsangebote und legst sie dem Anbieter vor. Plötzlich ist die "Marktanpassung" verhandelbar — ihr landet bei plus 12 Prozent. {kaemmerer} ist zufrieden: "Sehen Sie, geht doch." Ein Nachmittag Telefonieren, ein paar tausend Euro gespart.',
        teachingMoment:
          'Der teuerste Vertrag ist der, den man aus Bequemlichkeit verlängert. Schon ein eingeholtes Vergleichsangebot verschiebt die Verhandlungsmacht spürbar.',
        setsFlags: ['wartung_verhandelt'],
      },
      {
        id: 'wartung_zahlen',
        text: 'Zähneknirschend zahlen — der Aufwand eines Wechsels lohnt nicht',
        effects: { budget: -3000, relationships: { kaemmerer: -5 }, stress: -3 },
        resultText:
          'Du unterschreibst. {kaemmerer} ist not amused und notiert die Mehrkosten für die nächste Haushaltsdebatte. Die Telefonanlage läuft weiter — und der Anbieter weiß jetzt, dass er nächstes Jahr wieder 40 Prozent probieren kann.',
        choiceTags: ['passive'],
      },
      {
        id: 'wartung_ausstieg_pruefen',
        text: 'Grundsätzlich prüfen: Ausstieg Richtung VoIP / moderner Lösung',
        effects: { skills: { netzwerk: 4, softSkills: 3 }, compliance: 3, stress: 10 },
        resultText:
          'Du nimmst die Erhöhung zum Anlass, die ganze Telefonie zu hinterfragen. Eine VoIP-Migration würde den Wartungsvertrag überflüssig machen — aber sie ist ein Projekt, kein Nachmittag. Du legst {kaemmerer} eine Roadmap vor. Er ist skeptisch, aber interessiert: "Rechnen Sie das mal durch."',
        teachingMoment:
          'Eine unverschämte Preiserhöhung ist manchmal das beste Argument, um endlich eine überfällige Modernisierung anzustoßen.',
      },
    ],
    tags: ['kritis', 'budget', 'vertrag'],
  },

  // 9 ─────────────────────────────────────────────────────────────
  {
    id: 'evt_windows10_eol_welle',
    weekRange: [14, 16],
    probability: 0.85,
    category: 'compliance',
    title: 'Windows 10 läuft aus',
    description: `28 Rechner im Haus laufen noch auf Windows 10. Das Support-Ende steht fest im Kalender — danach keine Sicherheitsupdates mehr. In einer KRITIS-Verwaltung sind 28 ungepatchte Endgeräte keine theoretische Sorge, sondern eine offene Flanke.

Die Hälfte der Geräte ist zu alt für Windows 11. Neuanschaffung? Das Budget ist nach der Konsolidierung dünn. {kaemmerer} winkt schon ab, {chef} will eine Lösung, die nicht die Welt kostet.

Die Uhr tickt, egal was du entscheidest.`,
    involvedCharacters: ['kaemmerer', 'chef'],
    choices: [
      {
        id: 'win10_stufenplan',
        text: 'Stufenplan: kritische Geräte zuerst tauschen, Rest gestaffelt über zwei Haushalte',
        effects: { skills: { windows: 4, softSkills: 3 }, compliance: 8, relationships: { chef: 8 }, stress: 8 },
        resultText:
          'Du priorisierst nach Exposition und Alter, tauschst die riskantesten Geräte sofort und verteilst den Rest über zwei Haushaltsjahre. {chef} kann das dem Rat verkaufen, {kaemmerer} kann es bezahlen. Kein Bigbang, aber ein Weg raus — und der Nachweis, dass ihr das Risiko steuert.',
        teachingMoment:
          'Ein dokumentierter, risikobasierter Migrationsplan ist gegenüber Auditoren mehr wert als ein hektischer Komplett-Austausch — er zeigt, dass das Restrisiko bewusst und befristet gehalten wird.',
        setsFlags: ['win10_migration_geplant'],
      },
      {
        id: 'win10_linux_alt',
        text: 'Alte Hardware retten: geeignete Geräte auf Linux-Desktop umziehen',
        requires: { skill: 'linux', threshold: 45 },
        effects: { skills: { linux: 8, windows: 3 }, compliance: 6, budget: 3000, relationships: { kaemmerer: 8 }, stress: 12 },
        resultText:
          'Für die Geräte ohne Fachverfahren-Zwang ziehst du auf einen schlanken Linux-Desktop um — dieselbe Hardware, wieder mit Sicherheitsupdates. {kaemmerer} freut sich über die gesparte Neuanschaffung. Die {fachabteilung} muss sich umgewöhnen, aber Bürgeramt bleibt Bürgeramt, egal welches Betriebssystem.',
        teachingMoment:
          'Nicht jedes EOL zwingt zum Neukauf — wo keine Windows-only-Fachverfahren dranhängen, verlängert ein Linux-Umstieg die Hardware-Lebensdauer um Jahre.',
        setsFlags: ['linux_desktops_migriert'],
      },
      {
        id: 'win10_aussitzen',
        text: 'Support-Ende ignorieren — läuft ja weiter',
        effects: { stress: -3, compliance: -15 },
        resultText:
          'Du schiebst das Thema auf "nach dem Sommer". Die 28 Geräte laufen weiter — jetzt ohne einen einzigen Sicherheitspatch. Beim nächsten Audit ist das der erste Punkt auf der Mängelliste. Und beim nächsten Verschlüsselungstrojaner die erste offene Tür.',
        choiceTags: ['negligent'],
      },
    ],
    tags: ['kritis', 'compliance', 'windows', 'eol'],
  },

  // 10 ────────────────────────────────────────────────────────────
  {
    id: 'evt_phishing_gf_spear',
    weekRange: [14, 16],
    probability: 0.9,
    category: 'security',
    title: 'Die Mail "vom Bürgermeister"',
    description: `{gf} steht mit dem Handy in der Hand vor dir, sichtlich verunsichert. "Ich hab hier eine Mail vom Bürgermeister. Dringende Überweisung, streng vertraulich, ich soll das sofort und ohne Rückfragen erledigen. Aber... irgendwas kommt mir komisch vor."

Du schaust drauf. Absendername stimmt, Adresse ist minimal daneben — ein vertauschter Buchstaben in der Domain. Der Ton ist perfekt, die Dringlichkeit klassisch. Ein sauber gemachter CEO-Fraud, zugeschnitten auf genau diese Person.

"Soll ich das jetzt machen oder nicht?", fragt {gf}.`,
    involvedCharacters: ['gf'],
    choices: [
      {
        id: 'phishing_stoppen_erklaeren',
        text: 'Sofort stoppen, die Merkmale erklären und {gf} sensibilisieren',
        effects: { skills: { security: 5, softSkills: 4 }, compliance: 8, relationships: { gf: 12 }, stress: 4 },
        resultText:
          'Du zeigst {gf} die gefälschte Domain, den Druck-Trick, das Umgehen jeder Freigabekette. "Genau so läuft CEO-Fraud." {gf} ist sichtlich erleichtert — und dankbar, dass gefragt wurde statt überwiesen. "Ab jetzt frag ich bei sowas immer erst euch." Genau der Satz, den du hören wolltest.',
        teachingMoment:
          'CEO-Fraud setzt auf Autorität plus Zeitdruck plus Geheimhaltung. Die beste Abwehr ist keine Technik, sondern die Kultur: bei Geldflüssen immer über einen zweiten, bekannten Kanal rückversichern.',
        setsFlags: ['phishing_abgewehrt', 'gf_sensibilisiert'],
      },
      {
        id: 'phishing_melden_analysieren',
        text: 'Als Vorfall behandeln: Mail sichern, Header analysieren, Kollegen warnen',
        requires: { skill: 'security', threshold: 40 },
        effects: { skills: { security: 8 }, compliance: 10, relationships: { gf: 8 }, stress: 8 },
        resultText:
          'Du sicherst die Mail, liest die Header aus und findest die Versandinfrastruktur. Eine Warnung geht an alle Führungskräfte — und tatsächlich hatten zwei weitere dieselbe Mail bekommen und fast reagiert. Aus einem Beinahe-Schaden wird eine hausweite Immunisierung.',
        teachingMoment:
          'Ein abgewehrter Angriff auf eine Person ist oft eine laufende Kampagne gegen viele. Wer den Vorfall teilt statt still abhakt, schützt das ganze Haus.',
        setsFlags: ['phishing_kampagne_gestoppt'],
      },
      {
        id: 'phishing_nur_loeschen',
        text: '"Einfach löschen" sagen und zurück an die Arbeit',
        effects: { stress: -3, compliance: -5 },
        resultText:
          'Du sagst {gf}, sie solle die Mail wegwerfen, und wendest dich ab. Sie löscht sie — aber lernt nichts. Beim nächsten, besser gemachten Versuch fragt sie vielleicht nicht mehr nach. Die Chance, aus einem echten Fall eine Lektion zu machen, ist verpufft.',
        choiceTags: ['dismissive'],
      },
    ],
    tags: ['kritis', 'security', 'phishing', 'social_engineering'],
  },

  // 11 ────────────────────────────────────────────────────────────
  {
    id: 'evt_lizenz_audit_hersteller',
    weekRange: [15, 17],
    probability: 0.8,
    category: 'compliance',
    title: 'Lizenz-Audit angekündigt',
    description: `Ein großer Software-Hersteller kündigt schriftlich ein Lizenz-Audit an. Innerhalb von 30 Tagen sollt ihr eine vollständige Aufstellung aller Installationen und der zugehörigen Lizenzen liefern.

Du öffnest die "Lizenzverwaltung": eine Excel-Tabelle von 2021, zuletzt geändert von jemandem, der längst nicht mehr im Haus ist. Sie kennt weder die Server, die seither dazukamen, noch die, die abgeschaltet wurden.

Wenn die Zahlen nicht stimmen, kann das teuer werden — Nachlizenzierung, Strafgebühren, im schlimmsten Fall beides.`,
    involvedCharacters: ['kaemmerer'],
    choices: [
      {
        id: 'lizenz_inventur',
        text: 'Saubere Inventur fahren: automatisiert erfassen, mit Verträgen abgleichen',
        effects: { skills: { windows: 4, softSkills: 3 }, compliance: 12, stress: 12 },
        resultText:
          'Du ziehst eine automatisierte Software-Inventur über alle Systeme und gleichst sie mit den Kaufbelegen ab. Ergebnis: zwei Unterlizenzierungen, drei bezahlte Lizenzen, die niemand nutzt. Du korrigierst beides vor dem Audit — und hast endlich eine Lizenzliste, die stimmt.',
        teachingMoment:
          'Lizenzmanagement ist kein Buchhaltungsdetail, sondern Compliance: Ein sauberes Software-Inventar schützt vor Nachforderungen und deckt oft ungenutzte, bezahlte Lizenzen auf.',
        setsFlags: ['lizenz_inventar_aktuell'],
      },
      {
        id: 'lizenz_excel_aufhuebschen',
        text: 'Die alte Excel schnell plausibel machen und einreichen',
        effects: { compliance: -10, stress: 6 },
        resultText:
          'Du frisierst die Tabelle so, dass sie glaubwürdig aussieht, und schickst sie ab. Der Auditor gleicht sie mit den tatsächlichen Installationen ab, die er selbst auslesen darf — und findet die Lücken sofort. Jetzt bist du nicht nur unterlizenziert, sondern hast auch noch geschummelt.',
        choiceTags: ['negligent', 'hasty'],
      },
      {
        id: 'lizenz_dienstleister_kaemmerer',
        text: 'Mit {kaemmerer} einen Lizenz-Dienstleister für das Audit einbinden',
        effects: { skills: { softSkills: 3 }, compliance: 8, budget: -4000, relationships: { kaemmerer: 5 }, stress: 4 },
        resultText:
          'Du überzeugst {kaemmerer}, dass professionelle Hilfe billiger ist als eine Nachforderung. Der Dienstleister bringt Erfahrung und Verhandlungsgeschick mit, das Audit endet mit einer moderaten Nachlizenzierung statt einer Strafe. {kaemmerer} zahlt zähneknirschend — und lernt, dass Lizenzchaos Geld kostet.',
        teachingMoment:
          'Bei komplexen Hersteller-Audits kann externe Expertise die Nachforderung deutlich senken — die Anbieter kennen die Fallstricke der Lizenzmetriken besser als jede Verwaltung.',
      },
    ],
    tags: ['kritis', 'compliance', 'lizenzen'],
  },

  // 12 ────────────────────────────────────────────────────────────
  {
    id: 'evt_risikoanalyse_veraltet',
    weekRange: [15, 17],
    probability: 0.8,
    category: 'compliance',
    title: 'Die blinde Risikoanalyse',
    description: `Du ziehst die Risikoanalyse aus dem Frühjahr hervor — Pflichtdokument für den Grundschutz. Und stellst fest: Sie ist blind geworden. Sie kennt weder das neue Wasserwerk-Segment noch die Cloud-Anbindung, weder den Vorfall vom Frühjahr noch die aktuelle Bedrohungslage.

Ein Dokument, das die halbe Realität nicht abbildet, ist beim nächsten Audit wertlos — oder schlimmer: Es beweist, dass ihr eure eigenen Risiken nicht kennt.

{chef} hält die Analyse für "erledigt". Du weißt, dass sie das Gegenteil ist.`,
    involvedCharacters: ['chef'],
    choices: [
      {
        id: 'risiko_ueberarbeiten',
        text: 'Analyse gründlich aktualisieren: neue Systeme, neue Bedrohungen, Maßnahmen',
        effects: { skills: { security: 6, softSkills: 3 }, compliance: 12, stress: 12 },
        resultText:
          'Du arbeitest die Analyse Zeile für Zeile durch: neue Assets, aktuelle Bedrohungslage, bewertete Risiken mit Maßnahmen. Es dauert drei Tage, aber am Ende habt ihr ein Dokument, das die Realität abbildet. Beim Nachaudit wird genau das den Unterschied machen.',
        teachingMoment:
          'Eine Risikoanalyse ist kein einmaliges Dokument, sondern ein lebender Prozess — sie muss jeder Systemänderung und jeder neuen Bedrohung folgen, sonst schützt sie nur auf dem Papier.',
        setsFlags: ['risikoanalyse_aktuell'],
      },
      {
        id: 'risiko_workshop',
        text: 'Fachabteilungen in einem Risiko-Workshop einbinden',
        effects: { skills: { softSkills: 5, security: 3 }, compliance: 8, relationships: { chef: 5 }, stress: 8 },
        resultText:
          'Statt allein zu grübeln, holst du die Fachabteilungen an einen Tisch — sie kennen ihre Prozesse und Risiken am besten. Der Workshop ist zäh, bringt aber Risiken zutage, die du nie auf dem Schirm hattest. Nebeneffekt: Sicherheit ist plötzlich nicht mehr nur "Sache der IT".',
        teachingMoment:
          'Risiken kennen die, die täglich mit den Prozessen arbeiten. Ein Workshop verankert Sicherheitsdenken breiter und liefert eine vollständigere Analyse als jeder IT-Alleingang.',
        setsFlags: ['risiko_workshop_gemacht'],
      },
      {
        id: 'risiko_lassen',
        text: 'So lassen — bis zum Audit ist ja noch Zeit',
        effects: { stress: -3, compliance: -10 },
        resultText:
          'Du legst die Analyse zurück in den Ordner. "Erledigt" bleibt sie nur, solange keiner reinschaut. Beim Nachaudit blättert der Prüfer sie durch, findet Systeme, die nicht drinstehen, und stellt die eine Frage, die du nicht beantworten willst: "Und wo ist das erfasst?"',
        choiceTags: ['negligent'],
      },
    ],
    tags: ['kritis', 'compliance', 'risikomanagement'],
  },

  // 13 ────────────────────────────────────────────────────────────
  {
    id: 'evt_stellenausschreibung_it',
    weekRange: [15, 17],
    probability: 0.8,
    category: 'team',
    title: 'Die Stelle ist frei — endlich',
    description: `Nach Monaten des Bettelns ist es durch: Die Nachbesetzung für die IT ist genehmigt. Jetzt liegt der Entwurf der Stellenausschreibung auf deinem Tisch — von der Personalabteilung vorformuliert.

"Sachbearbeiter/in im gehobenen Dienst mit abgeschlossenem Studium, mindestens fünf Jahren Berufserfahrung, Kenntnissen in sämtlichen gängigen Betriebssystemen, Netzwerken, Datenbanken und Programmiersprachen" — bei einer Bezahlung, für die in der freien Wirtschaft niemand aufsteht.

{chef} und {kaemmerer} schauen beide auf dich: Was soll wirklich drinstehen?`,
    involvedCharacters: ['chef', 'kaemmerer'],
    choices: [
      {
        id: 'stelle_realistisch',
        text: 'Realistisches Profil: das Wichtigste priorisieren, Entwicklung anbieten',
        effects: { skills: { softSkills: 6 }, relationships: { chef: 8 }, stress: 6 },
        resultText:
          'Du streichst die Wunschliste zusammen auf das, was wirklich zählt: Grundlagen, Lernbereitschaft, Teamfähigkeit — den Rest bringt man bei. Du ergänzt, was ihr bieten könnt: sichere Stelle, sinnvolle Arbeit, Weiterbildung. Auf diese Ausschreibung bewerben sich tatsächlich passende Leute.',
        teachingMoment:
          'Die eierlegende Wollmilchsau bewirbt sich nie. Eine ehrliche Ausschreibung mit klaren Prioritäten und echten Entwicklungschancen zieht mehr geeignete Kandidaten an als eine Wunschliste.',
        setsFlags: ['stelle_realistisch_ausgeschrieben'],
      },
      {
        id: 'stelle_amtsschimmel',
        text: 'Den Amtsschimmel-Text durchwinken — Personal weiß, was es tut',
        effects: { relationships: { chef: -3 }, stress: -3 },
        resultText:
          'Du nickst den Entwurf ab. Drei Monate später: zwei Bewerbungen, beide unpassend. Die Anforderungsliste hat alle Geeigneten abgeschreckt, die Bezahlung den Rest. Die Stelle bleibt frei, und du machst die Arbeit weiter allein. Der bequeme Weg war der teure.',
        choiceTags: ['passive'],
      },
      {
        id: 'stelle_ausbildung',
        text: 'Umdenken: statt Fertigem eine Ausbildungsstelle vorschlagen',
        effects: { skills: { softSkills: 4 }, relationships: { chef: 5, kaemmerer: 5 }, stress: 8 },
        resultText:
          'Du drehst den Spieß um: Statt vergeblich nach einer Fachkraft zu suchen, schlägst du vor, selbst auszubilden — Fachinformatiker im eigenen Haus. {kaemmerer} rechnet, {chef} ist skeptisch, aber überzeugt: "Langfristig gedacht." Ein Weg aus dem Fachkräftemangel, den ihr selbst in der Hand habt.',
        teachingMoment:
          'Gegen den Fachkräftemangel im öffentlichen Dienst hilft oft nur, selbst auszubilden — wer nicht am Markt konkurrieren kann, muss Nachwuchs aufbauen.',
      },
    ],
    tags: ['kritis', 'team', 'personal'],
  },

  // 14 ─── flavor / comic relief ───────────────────────────────────
  {
    id: 'evt_drucker_aufstand',
    weekRange: [15, 18],
    probability: 0.75,
    category: 'absurd',
    title: 'Der Aufstand des Etagendruckers',
    description: `Seit drei Tagen druckt der Etagendrucker im ersten Stock unaufgefordert. Immer dasselbe: Seite 1 eines Bebauungsplans von 2009. Nachts, morgens, mittags. Niemand hat den Druck ausgelöst. Der Papierkorb daneben quillt über von "Bebauungsplan Gewerbegebiet Süd, Blatt 1".

Die {fachabteilung} hat den Drucker schon mit einem handgeschriebenen Zettel beklebt: "NICHT BENUTZEN — spukt." Jemand hat "R.I.P." dazugekritzelt.

Ein Poltergeist ist es vermutlich nicht. Ein hängender Druckauftrag in der Warteschlange schon eher.`,
    involvedCharacters: ['fachabteilung'],
    choices: [
      {
        id: 'drucker_queue_leeren',
        text: 'Druckerwarteschlange leeren und den Spooler neu starten',
        effects: { skills: { troubleshooting: 3 }, relationships: { fachabteilung: 5 }, stress: -2 },
        resultText:
          'Ein Blick in die Warteschlange: ein Auftrag von 2009, hängengeblieben und in Endlosschleife neu zugestellt. Du löschst ihn, startest den Spooler neu — Ruhe. Die {fachabteilung} ist beeindruckt wie von einem Exorzismus. Du sagst nichts von der Warteschlange und genießt den Ruhm.',
        teachingMoment:
          'Ein hängender Druckauftrag im Spooler kann sich endlos wiederholen. Warteschlange leeren und Druckerwarteschlangendienst neu starten löst 90% der "Der Drucker spinnt"-Fälle.',
      },
      {
        id: 'drucker_neustart',
        text: 'Drucker aus- und wieder einschalten und hoffen',
        effects: { skills: { troubleshooting: 2 }, stress: -2 },
        resultText:
          'Du ziehst den Stecker, zählst bis zehn, steckst wieder ein. Der Drucker fährt hoch — und druckt sofort wieder Blatt 1. Der Auftrag steckt im Server, nicht im Gerät. Immerhin: Jetzt weißt du, wo er NICHT steckt.',
        choiceTags: ['hasty'],
      },
      {
        id: 'drucker_zettel_dazu',
        text: 'Auch einen Zettel dazukleben und den Kollegen die Ehre lassen',
        effects: { relationships: { fachabteilung: 3 }, stress: -3 },
        resultText:
          'Du kritzelst "Seelenfrieden für Blatt 1" unter das R.I.P. und lässt den Drucker erst mal Drucker sein. Die Etage hat jetzt eine Legende und einen zweiten Drucker, der funktioniert. Morgen kümmerst du dich drum. Vielleicht.',
        choiceTags: ['procrastinate'],
      },
    ],
    tags: ['kritis', 'absurd', 'comic_relief'],
  },

  // 15 ────────────────────────────────────────────────────────────
  {
    id: 'evt_notfalluebung_tabletop',
    weekRange: [16, 17],
    probability: 0.85,
    category: 'security',
    title: 'Tabletop: Ransomware am Freitag',
    description: `Für den Grundschutz braucht ihr den Nachweis geübter Notfallprozesse. Zeit für die erste Tabletop-Übung: ein durchgespieltes Szenario am Konferenztisch, kein echter Vorfall. Dein Titel dafür: "Ransomware am Freitagnachmittag".

Die Frage ist, wie ernst das wird. {chef} findet die Idee gut, hat aber Angst, dass es peinlich wird. Die Kollegen halten Übungen für "verlorene Zeit". Und du weißt: Eine Übung, die keiner ernst nimmt, ist genauso wertlos wie gar keine.

Wer spielt mit — und wie tief gehst du?`,
    involvedCharacters: ['kollege', 'chef'],
    choices: [
      {
        id: 'tabletop_ernst',
        text: 'Ernsthaft aufziehen: realistisches Szenario, klare Rollen, ehrliche Auswertung',
        effects: { skills: { security: 6, softSkills: 4 }, compliance: 12, relationships: { chef: 5 }, stress: 10 },
        resultText:
          'Du baust ein Szenario mit Eskalationsstufen, verteilst Rollen und lässt die Runde entscheiden. Es wird unbequem — an drei Stellen fehlt ein klarer Prozess, genau wie im Ernstfall. Aber die Erkenntnisse sind Gold: Ihr schließt die Lücken auf dem Papier, bevor sie euch nachts wecken.',
        teachingMoment:
          'Der Wert einer Notfallübung liegt in den Lücken, die sie aufdeckt. Eine Übung, in der alles glattläuft, wurde nicht ernst genug angelegt.',
        setsFlags: ['notfalluebung_durchgefuehrt'],
      },
      {
        id: 'tabletop_team_gewinnen',
        text: 'Erst das Team gewinnen: locker starten, Nutzen zeigen, dann steigern',
        effects: { skills: { softSkills: 5, security: 3 }, compliance: 8, relationships: { kollegen: 10 }, stress: 6 },
        resultText:
          'Du fängst niedrigschwellig an, mit Kaffee und ohne Blamage-Gefahr. Nach 20 Minuten sind die skeptischen Kollegen im Szenario drin und diskutieren mit. Aus "verlorener Zeit" wird "können wir öfter machen". Die tiefere Übung kommt beim nächsten Mal — mit einem Team, das mitzieht.',
        teachingMoment:
          'Sicherheitskultur baut man nicht mit Zwang, sondern mit erlebtem Nutzen. Wer skeptische Kollegen erst gewinnt, bekommt beim zweiten Mal echtes Engagement.',
        setsFlags: ['team_uebung_positiv'],
      },
      {
        id: 'tabletop_pflicht_abhaken',
        text: 'Kurz durchziehen, Protokoll schreiben, Haken dran',
        effects: { compliance: 3, stress: -3 },
        resultText:
          'Du spielst das Minimum, schreibst ein Protokoll, das "erfolgreich durchgeführt" behauptet, und legst es ab. Formal habt ihr eine Übung nachgewiesen. Inhaltlich habt ihr nichts gelernt. Im echten Ernstfall merkt ihr, dass das Protokoll gelogen hat — nur zu spät.',
        choiceTags: ['negligent', 'bureaucratic'],
      },
    ],
    tags: ['kritis', 'security', 'notfallmanagement'],
  },

  // 16 ────────────────────────────────────────────────────────────
  {
    id: 'evt_usv_batterien_eol',
    weekRange: [16, 18],
    probability: 0.8,
    category: 'support',
    title: 'Die USV rechnet in Minuten',
    description: `Die zentrale USV meldet im Wartungsdialog ein Batteriealter von sechs Jahren. Der Selbsttest gibt ihr noch eine geschätzte Überbrückungszeit von wenigen Minuten unter Volllast — dabei soll sie eigentlich lange genug puffern, um alles kontrolliert herunterzufahren.

Sechs Jahre ist am Ende der Lebensdauer. Beim nächsten Stromausfall wird sich zeigen, ob "wenige Minuten" reichen. Erfahrungsgemäß reichen sie nie.

{kaemmerer} sieht bei "Batterietausch" schon die Zahl auf der Rechnung und zieht die Augenbrauen hoch.`,
    involvedCharacters: ['kaemmerer'],
    choices: [
      {
        id: 'usv_batterien_tauschen',
        text: 'Batterietausch beauftragen und die Kosten sauber begründen',
        effects: { skills: { troubleshooting: 4, softSkills: 3 }, compliance: 8, budget: -3500, relationships: { kaemmerer: 5 }, stress: 6 },
        resultText:
          'Du legst {kaemmerer} vor, was ein ungeordneter Stromausfall an Datenverlust und Hardware-Schaden kostet — deutlich mehr als der Batteriesatz. Er genehmigt. Nach dem Tausch puffert die USV wieder ihre volle Zeit. Beim nächsten Stromausfall fahrt ihr kontrolliert runter statt hart ab.',
        teachingMoment:
          'USV-Batterien altern und müssen zyklisch getauscht werden — eine USV mit toten Akkus ist eine teure Attrappe. Der Tausch ist immer billiger als der ungeordnete Stromausfall.',
        setsFlags: ['usv_erneuert'],
      },
      {
        id: 'usv_shutdown_absichern',
        text: 'Automatisches, sauberes Herunterfahren konfigurieren als Sofort-Absicherung',
        effects: { skills: { troubleshooting: 5, netzwerk: 3 }, compliance: 6, stress: 8 },
        resultText:
          'Bis das Budget kommt, sicherst du wenigstens den Ablauf ab: Die USV löst jetzt bei Stromausfall ein automatisches, geordnetes Shutdown aller Systeme aus — in genau den wenigen Minuten, die sie noch hat. Kein Ersatz für neue Akkus, aber die Daten sind sicher. Der Tausch kommt trotzdem auf die Liste.',
        teachingMoment:
          'Auch eine schwache USV rettet Daten, wenn sie ein sauberes automatisches Herunterfahren auslöst, statt bloß Zeit zu kaufen, die niemand nutzt.',
      },
      {
        id: 'usv_aussitzen',
        text: '"Hält schon noch" — Meldung wegklicken',
        effects: { stress: -3, compliance: -10 },
        resultText:
          'Du klickst die Wartungsmeldung weg. Zwei Wochen später fällt der Strom aus — ein Bagger, wie so oft. Die USV hält 90 Sekunden, dann ist es dunkel. Die Server gehen hart aus, das Fachverfahren braucht eine Datenbankreparatur. Die Meldung hattest du ja gesehen.',
        choiceTags: ['negligent'],
      },
    ],
    tags: ['kritis', 'support', 'hardware', 'usv'],
  },

  // 17 ────────────────────────────────────────────────────────────
  {
    id: 'evt_dsgvo_auskunft',
    weekRange: [16, 18],
    probability: 0.8,
    category: 'compliance',
    title: 'Auskunft über alles',
    description: `Ein Bürger verlangt schriftlich Auskunft nach Art. 15 DSGVO: welche Daten die Gemeinde über ihn gespeichert hat, wo, warum und seit wann. Frist: ein Monat.

Klingt einfach, ist es nicht. Seine Daten liegen quer über sieben Fachverfahren — Melderegister, Gewerbeamt, Sozialamt, Bibliothek, Bußgeldstelle, und zwei alten Systemen, die niemand mehr richtig kennt. Es gibt keinen Knopf "alles über Person X".

Die {fachabteilung} schiebt dir den Schwarzen Peter zu: "Das ist doch IT."`,
    involvedCharacters: ['fachabteilung'],
    choices: [
      {
        id: 'dsgvo_koordinieren',
        text: 'Prozess koordinieren: Fachabteilungen einbinden, Auskunft strukturiert zusammenstellen',
        effects: { skills: { softSkills: 5, security: 3 }, compliance: 10, relationships: { fachabteilung: 5 }, stress: 10 },
        resultText:
          'Du erklärst, dass die IT die Systeme liefert, aber die Fachabteilungen die Daten verantworten — und organisierst einen Sammelprozess. Jede Stelle liefert ihren Teil, du fügst es zusammen. Der Bürger bekommt fristgerecht eine vollständige Auskunft. Nebenbei habt ihr einen Prozess für den nächsten Fall.',
        teachingMoment:
          'DSGVO-Auskünfte sind Gemeinschaftsaufgabe: Die Fachabteilungen sind fachlich verantwortlich, die IT liefert die technischen Mittel. Ein definierter Prozess spart bei jeder weiteren Anfrage Zeit.',
        setsFlags: ['dsgvo_prozess_etabliert'],
      },
      {
        id: 'dsgvo_selbst_zusammensuchen',
        text: 'Selbst durch alle sieben Systeme graben und alles zusammensuchen',
        effects: { skills: { troubleshooting: 4 }, compliance: 6, stress: 16 },
        resultText:
          'Du klapperst alle sieben Verfahren allein ab, zwei Tage lang, inklusive der Altsysteme, deren Export niemand mehr kennt. Die Auskunft ist vollständig und pünktlich — aber du hast zwei Tage verloren, und beim nächsten Antrag fängst du wieder bei null an. Held des Einzelfalls, Gefangener des Prozesses.',
        choiceTags: ['selfless'],
      },
      {
        id: 'dsgvo_hinhalten',
        text: 'Standardschreiben "in Bearbeitung" schicken und Frist verstreichen lassen',
        effects: { stress: -3, compliance: -12 },
        resultText:
          'Du schickst eine Empfangsbestätigung und lässt die Sache liegen. Die Monatsfrist verstreicht. Der Bürger beschwert sich bei der Datenschutzaufsicht — und die schreibt der Gemeinde. Jetzt ist aus einer Auskunft ein Aufsichtsverfahren geworden, mit deinem Namen im Vorgang.',
        choiceTags: ['negligent', 'bureaucratic'],
      },
    ],
    tags: ['kritis', 'compliance', 'dsgvo'],
  },

  // 18 ────────────────────────────────────────────────────────────
  {
    id: 'evt_admin_passwort_zettel',
    weekRange: [16, 18],
    probability: 0.85,
    category: 'security',
    title: 'Der laminierte Zettel',
    description: `Beim Aufräumen im Serverraum findest du ihn: einen laminierten (!) Zettel, an die Innenseite der Racktür geklebt. Darauf, in ordentlicher Handschrift, das Domänen-Administrator-Passwort. Laminiert, weil "dann hält der Zettel länger".

Er hält tatsächlich länger. Das Passwort auch — es ist seit Jahren dasselbe, bekannt bei jedem, der je in diesem Raum war: Techniker, Praktikanten, der Reinigungsdienst.

Ein einziges Passwort, das alles aufschließt, offen sichtbar, nie geändert. Zeit, das anders zu machen.`,
    involvedCharacters: ['kollege'],
    choices: [
      {
        id: 'passwort_manager',
        text: 'Passwort-Manager einführen und alle Admin-Zugänge neu vergeben',
        effects: { skills: { security: 6, windows: 3 }, compliance: 12, relationships: { kollegen: 3 }, stress: 10 },
        resultText:
          'Du rollst einen Passwort-Manager fürs Team aus, änderst alle Admin-Passwörter auf lange, zufällige Werte und schredderst den Zettel feierlich. {kollege} ist erst genervt ("Ich konnte das doch auswendig"), dann überzeugt, als er merkt, wie viel einfacher es ist. Ein Konto, ein Geheimnis, sauber verwaltet.',
        teachingMoment:
          'Geteilte, statische Admin-Passwörter sind ein Alptraum für Nachvollziehbarkeit und Sicherheit. Ein Passwort-Manager plus individuelle Konten macht klar, wer was wann getan hat.',
        setsFlags: ['passwort_manager_aktiv'],
      },
      {
        id: 'passwort_aendern_kollege',
        text: 'Erst mal das Passwort ändern und mit {kollege} ein neues Vorgehen absprechen',
        effects: { skills: { security: 4 }, compliance: 8, relationships: { kollegen: 5 }, stress: 6 },
        resultText:
          'Du änderst das Passwort sofort und setzt dich mit {kollege} zusammen: Wie machen wir das ab jetzt? Ihr einigt euch auf regelmäßige Wechsel und getrennte Konten für die kritischsten Systeme. Kein großes Werkzeug, aber ein klarer Schritt weg vom laminierten Zettel.',
        teachingMoment:
          'Der erste Schritt ist immer, das kompromittierte Geheimnis zu wechseln. Der zweite, ein Vorgehen zu vereinbaren, das nicht wieder auf einem Zettel endet.',
      },
      {
        id: 'passwort_zettel_lassen',
        text: 'Zettel abnehmen und in die Schreibtischschublade legen',
        effects: { stress: -3, compliance: -8 },
        resultText:
          'Du nimmst den Zettel von der Tür und legst ihn in die Schublade. Das Passwort bleibt dasselbe, jetzt nur weniger sichtbar. Gefühlt hast du etwas getan. Tatsächlich weiß es immer noch jeder von früher — und die Schublade ist auch nicht abgeschlossen.',
        choiceTags: ['half_measure', 'negligent'],
      },
    ],
    tags: ['kritis', 'security', 'passwoerter', 'windows'],
  },

  // 19 ────────────────────────────────────────────────────────────
  {
    id: 'evt_awareness_schulung',
    weekRange: [17, 18],
    probability: 0.85,
    category: 'team',
    title: 'Sechzig gelangweilte Gesichter',
    description: `Es ist wieder so weit: Du sollst die jährliche Security-Awareness-Schulung halten. Vor dir: 60 Verwaltungsmitarbeiter, die lieber Akten bearbeiten würden, in einem Sitzungssaal mit einem Beamer von 2012.

Die Erwartung im Raum ist eindeutig: eine Pflichtstunde absitzen, Häkchen im Fortbildungsnachweis, zurück an den Schreibtisch. Zwei Leute tippen schon jetzt auf dem Handy.

Und trotzdem: Genau diese 60 Menschen klicken auf die Phishing-Mails. Sie sind deine wichtigste Firewall — oder deine größte Lücke. Wie machst du das?`,
    involvedCharacters: ['kollege', 'fachabteilung'],
    choices: [
      {
        id: 'awareness_geschichten',
        text: 'Mit echten Fällen und Geschichten arbeiten statt mit Folien voller Regeln',
        effects: { skills: { softSkills: 6, security: 3 }, compliance: 8, relationships: { fachabteilung: 8 }, stress: 8 },
        resultText:
          'Du erzählst den CEO-Fraud vom Frühjahr, zeigst die echte Phishing-Mail, lässt die Leute selbst die Fälschung finden. Plötzlich legen die Handys sich hin. Am Ende bleiben drei Leute für Fragen. Eine Woche später meldet jemand eine verdächtige Mail — "wie in der Schulung". Genau das.',
        teachingMoment:
          'Awareness entsteht durch Betroffenheit, nicht durch Regeln. Echte, nachvollziehbare Fälle bleiben hängen, wo Aufzählungen von Passwortrichtlinien längst vergessen sind.',
        setsFlags: ['awareness_erfolgreich'],
      },
      {
        id: 'awareness_interaktiv',
        text: 'Interaktiv aufziehen: Phishing-Quiz, kleine Belohnung, gemeinsames Aha',
        effects: { skills: { softSkills: 5, security: 3 }, compliance: 6, relationships: { kollegen: 6, fachabteilung: 5 }, stress: 6 },
        resultText:
          'Du machst ein Quiz draus: echte gegen gefälschte Mails, Punkte, ein Gutschein für die Beste. Der Saal taut auf, es wird sogar gelacht — und nebenbei lernen 60 Leute, worauf sie achten müssen. Die {fachabteilung} fragt, ob ihr das öfter machen könnt. Willst du das gehört haben.',
        teachingMoment:
          'Spielerische Elemente senken die Abwehr gegen "Pflichtschulung". Wer aktiv mitmacht statt nur zuzuhören, behält deutlich mehr.',
        setsFlags: ['awareness_interaktiv'],
      },
      {
        id: 'awareness_folien_ablesen',
        text: 'Die Standard-Folien runterlesen und pünktlich Schluss machen',
        effects: { compliance: 2, stress: -3 },
        resultText:
          'Du liest 40 Folien in 40 Minuten ab, keiner hört zu, alle sind froh, als es vorbei ist. Der Fortbildungsnachweis stimmt. Die Klickrate auf die nächste Phishing-Mail auch — sie bleibt genau so hoch wie vorher. Pflicht erfüllt, Zweck verfehlt.',
        choiceTags: ['bureaucratic'],
      },
    ],
    tags: ['kritis', 'team', 'awareness', 'security'],
  },

  // 20 ────────────────────────────────────────────────────────────
  {
    id: 'evt_ot_netz_segmentierung',
    weekRange: [17, 18],
    probability: 0.85,
    category: 'security',
    title: 'Ein flaches Netz für alles',
    description: `Beim Aufzeichnen der Netztopologie wird es dir endgültig klar: Die Leittechnik des Wasserwerks und die Büro-IT hängen im selben, flachen Netzsegment. Die SPS, die die Pumpen steuert, ist vom Sachbearbeiter-PC im Bürgeramt aus genauso erreichbar wie der Drucker.

Das heißt: Ein verseuchter Büro-Rechner kann direkt die Trinkwasser-Steuerung angreifen. Genau die Art von Weg, den Angreifer bei kommunalen Betreibern suchen.

Segmentierung ist überfällig. Aber sie in ein laufendes System einzuziehen, ohne die Wasserversorgung zu unterbrechen, ist heikel.`,
    involvedCharacters: ['fachabteilung'],
    choices: [
      {
        id: 'ot_segmentieren_geplant',
        text: 'Sauber planen: OT-Segment abtrennen, Firewall-Regeln, Wartungsfenster',
        effects: { skills: { netzwerk: 6, security: 5 }, compliance: 12, relationships: { fachabteilung: 5 }, stress: 12 },
        resultText:
          'Du planst die Trennung in Ruhe: eigenes VLAN für die Leittechnik, restriktive Firewall dazwischen, Umsetzung im Wartungsfenster mit dem Wassermeister an deiner Seite. Kein Tropfen weniger Wasser fließt — aber der Büro-PC kommt an die SPS jetzt nicht mehr heran. Grundschutz, den man vorzeigen kann.',
        teachingMoment:
          'OT- und IT-Netze gehören getrennt (BSI-Grundschutz, Zonenmodell nach IEC 62443). Eine kompromittierte Büro-IT darf niemals ein direkter Weg zur Steuerung kritischer Prozesse sein.',
        setsFlags: ['ot_segmentiert'],
      },
      {
        id: 'ot_minimalfilter',
        text: 'Als Sofortmaßnahme wenigstens den Zugriff aufs OT-Segment filtern',
        effects: { skills: { netzwerk: 4, security: 3 }, compliance: 6, stress: 8 },
        resultText:
          'Für die saubere Trennung fehlt das Wartungsfenster — also ziehst du wenigstens eine Zugriffsliste ein, die nur noch die nötigsten Verbindungen zur Leittechnik durchlässt. Kein vollständiges Zonenmodell, aber die offene Scheunentür ist zu. Die richtige Segmentierung kommt auf den Plan fürs nächste Fenster.',
        teachingMoment:
          'Wenn die vollständige Segmentierung nicht sofort geht, reduziert schon eine restriktive Zugriffsregel die Angriffsfläche erheblich — Hauptsache, das flache Netz bleibt nicht flach.',
      },
      {
        id: 'ot_spaeter',
        text: 'Aufschieben — läuft ja seit Jahren so',
        effects: { stress: -3, compliance: -12 },
        resultText:
          'Du verschiebst das Thema. Es läuft ja. Genau dieses "läuft ja" steht später im Auditbericht als schwerwiegender Mangel — flaches Netz mit direktem Pfad von der Büro-IT zur Trinkwasser-Steuerung. Und wenn statt des Prüfers ein Angreifer den Pfad zuerst findet, wird es kein Bericht, sondern eine Meldung ans BSI.',
        choiceTags: ['negligent'],
      },
    ],
    tags: ['kritis', 'security', 'netzwerk', 'ot', 'wasserwerk'],
  },

  // 21 ────────────────────────────────────────────────────────────
  {
    id: 'evt_haushalt_planung_folgejahr',
    weekRange: [17, 18],
    probability: 0.85,
    category: 'budget',
    title: 'Zahlen gegen Redundanz',
    description: `Die Haushaltsplanung fürs Folgejahr läuft an. {kaemmerer} will von dir eine Zahl — am liebsten eine kleinere als dieses Jahr. Du willst etwas ganz anderes: endlich Budget für Redundanz. Ein zweiter Kern-Switch, ein Failover für die zentrale Datenbank, ein ordentliches Backup-Ziel.

Das Kartenhaus steht seit Monaten auf einer Maschine ohne Rückfallebene. Jetzt ist das Zeitfenster, um das zu ändern — oder es wieder ein Jahr aufzuschieben.

{chef} steht zwischen den Stühlen: Er weiß, dass du recht hast, und er weiß, dass {kaemmerer} sparen muss.`,
    involvedCharacters: ['kaemmerer', 'chef'],
    choices: [
      {
        id: 'haushalt_business_case',
        text: 'Mit sauberem Business Case argumentieren: Ausfallkosten gegen Investition',
        effects: { skills: { softSkills: 6 }, compliance: 8, relationships: { chef: 8, kaemmerer: 5 }, budget: -5000, stress: 10 },
        resultText:
          'Du rechnest nicht in Technik, sondern in Euro: Was kostet ein Tag ohne Bürgerdienste, ein Datenverlust im Fachverfahren? Die Redundanz ist plötzlich die günstigere Zahl. {kaemmerer} genehmigt einen Teil, {chef} atmet auf. Das Kartenhaus bekommt endlich eine zweite Wand.',
        teachingMoment:
          'IT-Investitionen setzt man nicht mit Technik durch, sondern mit Risiko in Euro. Ein Kämmerer versteht Ausfallkosten besser als Failover-Cluster.',
        setsFlags: ['redundanz_budgetiert'],
      },
      {
        id: 'haushalt_kompromiss',
        text: 'Kompromiss suchen: das dringendste Redundanz-Element priorisieren',
        effects: { skills: { softSkills: 4 }, compliance: 5, relationships: { kaemmerer: 8, chef: 3 }, budget: -2500, stress: 6 },
        resultText:
          'Statt der ganzen Wunschliste bringst du {kaemmerer} das eine Element, das am meisten Risiko wegnimmt: das getrennte Backup-Ziel. Klein genug, um genehmigt zu werden, groß genug, um zu wirken. {kaemmerer} schätzt, dass du nicht das Blaue vom Himmel forderst. Ein Schritt, aber ein echter.',
        teachingMoment:
          'Wer alles auf einmal fordert, bekommt oft nichts. Das wirkungsvollste Einzelelement zuerst durchzubekommen schlägt die perfekte Liste, die abgelehnt wird.',
      },
      {
        id: 'haushalt_kleine_zahl',
        text: 'Nachgeben und die kleine Zahl liefern, die {kaemmerer} hören will',
        effects: { relationships: { kaemmerer: 10, chef: -8 }, compliance: -10, stress: -5 },
        resultText:
          '{kaemmerer} ist glücklich, du hast Ruhe. Aber die Redundanz ist wieder ein Jahr vertagt, und {chef} ist enttäuscht, dass du nicht gekämpft hast. Das Kartenhaus steht weiter auf einer einzigen Maschine. Bis die ausfällt — dann fragt keiner mehr nach der kleinen Zahl.',
        choiceTags: ['passive'],
      },
    ],
    tags: ['kritis', 'budget', 'redundanz'],
  },

  // 22 ────────────────────────────────────────────────────────────
  {
    id: 'evt_alarm_muedigkeit',
    weekRange: [17, 18],
    probability: 0.85,
    category: 'support',
    title: '3.000 Alerts, keiner schaut hin',
    description: `Das Monitoring meldet fleißig: 3.000 Alerts pro Woche. Davon sind 2.990 irrelevant — ein Switchport, der mal kurz flappt, ein Backup, das 40 statt 35 Minuten braucht, ein Zertifikat, das in 89 statt 90 Tagen abläuft.

Die Folge: Keiner schaut mehr hin. Die Mailregel, die die Alerts in einen Ordner sortiert, hat {kollege} längst eingerichtet. Der Ordner hat 14.000 ungelesene Nachrichten.

Das Problem: Zwischen den 2.990 Nichtigkeiten stecken die 10, die wirklich zählen. Und die sieht gerade niemand.`,
    involvedCharacters: ['kollege'],
    choices: [
      {
        id: 'alarm_tuning',
        text: 'Alerting entrümpeln: Schwellwerte anpassen, Rauschen abschalten, Wichtiges hervorheben',
        effects: { skills: { troubleshooting: 6, security: 4 }, compliance: 8, relationships: { kollegen: 8 }, stress: 10 },
        resultText:
          'Du gehst die Regeln durch, hebst Schwellwerte an, unterdrückst bekanntes Rauschen und markierst die kritischen Alerts unübersehbar. Aus 3.000 werden 40 pro Woche — und die 40 liest wieder jemand. {kollege} kann seinen 14.000-Mails-Ordner endlich löschen. Das Monitoring meldet wieder etwas, nicht alles.',
        teachingMoment:
          'Alarmmüdigkeit ist ein Sicherheitsrisiko: Wer im Rauschen ertrinkt, übersieht den echten Alarm. Weniger, aber relevante Meldungen sind mehr wert als lückenlose Vollständigkeit.',
        setsFlags: ['alerting_getunt'],
      },
      {
        id: 'alarm_kritische_liste',
        text: 'Wenigstens eine kurze Liste kritischer Alerts definieren, die immer durchkommen',
        effects: { skills: { troubleshooting: 4, security: 3 }, compliance: 5, relationships: { kollegen: 5 }, stress: 6 },
        resultText:
          'Fürs große Aufräumen fehlt die Zeit — also definierst du wenigstens eine Handvoll wirklich kritischer Ereignisse (Wasserwerk-SPS, Kern-Switch, Backup-Fehlschlag), die separat und unübersehbar gemeldet werden. Der Rest rauscht weiter, aber die 10 wichtigen gehen nicht mehr unter.',
        teachingMoment:
          'Wenn man das Rauschen nicht sofort abstellen kann, hilft ein separater, kurzer Kanal nur für die wirklich kritischen Ereignisse — Hauptsache, die gehen nicht im Grundrauschen verloren.',
      },
      {
        id: 'alarm_ignorieren',
        text: 'Ordnerregel bestätigen und weiter wegsortieren',
        effects: { stress: -3, compliance: -10 },
        resultText:
          'Du lässt die Mailregel, wie sie ist. Der Ordner wächst weiter. Drei Wochen später steckt darin eine Meldung über wiederholte fehlgeschlagene Logins am Admin-Konto — ungelesen, zwischen 2.990 Nichtigkeiten. Als jemand nachschaut, ist es zu spät. Das Monitoring hatte gewarnt. Nur keiner hat es gesehen.',
        choiceTags: ['negligent'],
      },
    ],
    tags: ['kritis', 'support', 'monitoring', 'security'],
  },

  // 23 ────────────────────────────────────────────────────────────
  {
    id: 'evt_glasfaser_bagger',
    weekRange: [18, 18],
    probability: 0.9,
    category: 'crisis',
    title: 'Der Bagger und die Stille',
    description: `Ein Bagger vor dem Rathaus. Dann Stille auf der Standleitung. Der Klassiker.

Die Baufirma verlegt Fernwärme und hat dabei euer Glasfaserkabel erwischt — die einzige Anbindung ans Rechenzentrum und ins Internet. Kein E-Mail, kein Fachverfahren aus der Cloud, keine Online-Bürgerdienste. Das halbe Rathaus steht.

{chef} ruft an: "Wie lange? Der Bürgermeister will es wissen." Der Bagger draußen gräbt schon weiter, als sei nichts gewesen.`,
    involvedCharacters: ['chef'],
    choices: [
      {
        id: 'bagger_notfallplan',
        text: 'Notfallplan ziehen: Provider eskalieren, LTE-Backup hochfahren, transparent kommunizieren',
        effects: { skills: { netzwerk: 5, troubleshooting: 5, softSkills: 3 }, compliance: 8, relationships: { chef: 10 }, stress: 12 },
        resultText:
          'Du eskalierst beim Provider auf Störungsstufe kritisch, ziehst parallel die LTE-Ersatzanbindung hoch und schickst {chef} einen klaren Sachstand für den Bürgermeister. Nach 40 Minuten laufen die wichtigsten Dienste über die Notleitung. Der Provider braucht bis abends — aber ihr wart nie ganz blind. Vorbereitung zahlt sich aus.',
        teachingMoment:
          'Eine einzige Anbindung ist ein Single Point of Failure. Ein vorbereitetes LTE- oder Zweitanbieter-Backup verwandelt einen Totalausfall in eine Unbequemlichkeit.',
        setsFlags: ['leitungsausfall_ueberbrueckt'],
      },
      {
        id: 'bagger_warten_provider',
        text: 'Provider anrufen und auf die Reparatur warten',
        effects: { skills: { troubleshooting: 2 }, relationships: { chef: -3 }, stress: 12 },
        resultText:
          'Du meldest die Störung und wartest. Der Provider kommt — "voraussichtlich heute Abend". Bis dahin steht das Rathaus. {chef} muss dem Bürgermeister erklären, dass man nichts tun kann außer warten. Ein Backup hättet ihr gebraucht. Das schreibst du dir für nächstes Mal auf.',
        choiceTags: ['passive'],
      },
      {
        id: 'bagger_provisorium',
        text: 'Kreatives Provisorium: Handy-Hotspots für die kritischsten Arbeitsplätze',
        effects: { skills: { troubleshooting: 4, netzwerk: 3 }, relationships: { fachabteilung: 5, chef: 3 }, stress: 10 },
        resultText:
          'Ohne fertiges Backup improvisierst du: Handy-Hotspots für Bürgeramt und Standesamt, damit wenigstens die dringendsten Bürgerdienste laufen. Nicht schön, nicht schnell, aber die Leute am Schalter können wieder arbeiten. Der Bagger hat gewonnen — aber nicht kampflos.',
        teachingMoment:
          'Im Ausfall zählt Priorisierung: Nicht alles muss sofort wieder laufen, aber die kritischsten Bürgerdienste zuerst. Ein Hotspot ist kein Backup, aber besser als Stillstand.',
      },
    ],
    tags: ['kritis', 'crisis', 'netzwerk'],
  },

  // 24 ────────────────────────────────────────────────────────────
  {
    id: 'evt_kollege_burnout_signale',
    weekRange: [18, 18],
    probability: 0.85,
    category: 'personal',
    title: 'Zweimal falsch konfiguriert',
    description: `{kollege} macht seit Wochen Überstunden. Er kommt als Erster, geht als Letzter, und trotzdem stapelt sich die Arbeit. Heute ist ihm etwas passiert, das ihm sonst nie passiert: Er hat den nächtlichen Backup-Job zweimal falsch konfiguriert — einmal aufs falsche Ziel, einmal mit falschem Zeitplan.

Er ist blass, gereizt, und als du ihn ansprichst, wird er fast wütend: "Ich krieg das schon hin. Lass mich einfach machen."

Du kennst diese Signale. Das ist keine Schludrigkeit. Das ist jemand, der langsam ausbrennt.`,
    involvedCharacters: ['kollege'],
    choices: [
      {
        id: 'burnout_ansprechen',
        text: 'Das Gespräch suchen: zuhören, Last teilen, gemeinsam entlasten',
        effects: { skills: { softSkills: 6 }, relationships: { kollegen: 15 }, stress: 8 },
        resultText:
          'Du holst {kollege} auf einen Kaffee raus, ohne Vorwurf, und hörst zu. Es bricht aus ihm heraus: die Überstunden, die Angst, etwas kaputtzumachen, das schlechte Gewissen. Ihr verteilt Aufgaben neu und du sorgst dafür, dass er endlich mal freihat. Ein paar Tage später ist er ein anderer Mensch. Und du hast einen Kollegen behalten.',
        teachingMoment:
          'Burnout-Signale ernst zu nehmen ist Führungsarbeit, nicht Einmischung. Ein überlasteter Admin macht Fehler an genau den Systemen, die am wenigsten Fehler vertragen.',
        setsFlags: ['kollege_entlastet'],
      },
      {
        id: 'burnout_backup_pruefen',
        text: 'Erst still die Backup-Konfiguration prüfen und korrigieren, dann behutsam ansprechen',
        effects: { skills: { troubleshooting: 4, softSkills: 3 }, relationships: { kollegen: 8 }, compliance: 5, stress: 6 },
        resultText:
          'Du prüfst unauffällig die Backup-Jobs, korrigierst die beiden Fehler, bevor sie schaden — und sprichst {kollege} danach ruhig an, ohne ihn bloßzustellen. Er ist erst beschämt, dann erleichtert, dass du es abgefangen hast, statt ihn vorzuführen. Vertrauen entsteht in genau solchen Momenten.',
        teachingMoment:
          'Fehler eines überlasteten Kollegen fängt man ab, ohne ihn vorzuführen — die Sache absichern und den Menschen schützen, beides gleichzeitig.',
      },
      {
        id: 'burnout_ignorieren',
        text: '"Er sagt, er kriegt das hin" — beim Wort nehmen und weitermachen',
        effects: { relationships: { kollegen: -8 }, compliance: -6, stress: -3 },
        resultText:
          'Du nimmst {kollege} beim Wort und lässt ihn machen. Er kriegt es nicht hin. Zwei Wochen später fällt er krankheitsbedingt aus — für einen Monat. Jetzt machst du seine Arbeit mit, und die falsch konfigurierten Backups musst du auch noch nacharbeiten. Die Signale waren da. Du hast weggeschaut.',
        choiceTags: ['negligent', 'dismissive'],
      },
    ],
    tags: ['kritis', 'personal', 'team'],
  },

  // 25 ────────────────────────────────────────────────────────────
  {
    id: 'evt_presseanfrage_sicherheit',
    weekRange: [18, 18],
    probability: 0.85,
    category: 'politics',
    title: '"Wie sicher ist unsere IT?"',
    description: `Die Lokalzeitung hat angefragt — schriftlich, an {gf}. Der Aufhänger: eine Cyberattacke auf eine Nachbarkommune, die es in die überregionale Presse geschafft hat. Die Frage an euch: "Wie sicher ist die IT unserer Gemeinde?"

{gf} steht in deiner Tür und ist sichtlich nervös. "Ich soll da was zu sagen. Aber ich will weder lügen noch uns zum Angriffsziel machen. Was empfiehlst du?"

Zu viel Offenheit lädt Angreifer ein. Zu viel Beschwichtigung fliegt beim nächsten Vorfall auf. Und die Zeitung wartet auf ein Zitat.`,
    involvedCharacters: ['gf', 'chef'],
    choices: [
      {
        id: 'presse_besonnen',
        text: 'Besonnene Linie vorbereiten: seriös, ohne Details, mit Verweis auf laufende Verbesserungen',
        effects: { skills: { softSkills: 6, security: 3 }, compliance: 6, relationships: { gf: 12, chef: 5 }, stress: 6 },
        resultText:
          'Du formulierst {gf} ein Statement: Man nehme das Thema ernst, arbeite kontinuierlich an der Sicherheit, gebe aber aus gutem Grund keine Details zu Schutzmaßnahmen preis. Seriös, wahr, und keine Landkarte für Angreifer. Der Artikel erscheint sachlich. {gf} ist erleichtert: "Genau die richtige Mischung."',
        teachingMoment:
          'Sicherheitskommunikation nach außen bewegt sich zwischen Transparenz und Vertraulichkeit: Haltung zeigen, aber keine konkreten Maßnahmen oder Schwachstellen nennen, die Angreifern helfen.',
        setsFlags: ['presse_souveraen'],
      },
      {
        id: 'presse_gf_ueberlassen',
        text: '{gf} nur allgemein briefen und die Antwort ihr überlassen',
        effects: { skills: { softSkills: 2 }, relationships: { gf: -3 }, stress: -3 },
        resultText:
          'Du gibst {gf} ein paar Stichworte mit und überlässt ihr den Rest. Sie sagt gegenüber der Zeitung, die IT sei "absolut sicher" — ein Satz, den kein IT-Verantwortlicher je sagen würde. Beim nächsten Vorfall zitiert die Zeitung genau diesen Satz. Ein bisschen mehr Vorbereitung hätte das verhindert.',
        choiceTags: ['passive'],
      },
      {
        id: 'presse_chance_nutzen',
        text: 'Die Anfrage als Chance nutzen: positiv über euren Reifeprozess berichten',
        effects: { skills: { softSkills: 5 }, compliance: 5, relationships: { gf: 8, chef: 8 }, stress: 8 },
        resultText:
          'Statt nur abzuwehren, drehst du es ins Positive: Ihr erzählt (ohne Details) von Notfallübungen, Awareness-Schulungen, dem Weg zum NIS2-Grundschutz. Die Gemeinde steht plötzlich als vorausschauend da. {chef} und {gf} sind begeistert — und du hast nebenbei intern Rückenwind für die nächsten Budgetforderungen geschaffen.',
        teachingMoment:
          'Eine kritische Presseanfrage kann man in eine Erfolgsgeschichte drehen — wer den eigenen Reifeprozess sichtbar macht, gewinnt Vertrauen und internen Rückhalt, ohne Angriffsflächen zu zeigen.',
      },
    ],
    tags: ['kritis', 'politics', 'kommunikation'],
  },
];
