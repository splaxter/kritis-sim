import { GameEvent } from '@kritis/shared';

/**
 * Chain: Der Lieferketten-Vorfall (red-thread continuity, KRITIS late game)
 *
 * Theme: vendor trust and least privilege. Distinct from backup-chain (restore)
 * and audit-prep (paperwork) — this one is about how you handle a pushy
 * OT-vendor's rushed update + permanent-access demand.
 *
 * Flow:
 * evt_lieferkette_start (Week 14-17) — vendor pushes a "critical" update + wants permanent access
 *   -> "Update prüfen (Signatur/Testsystem)" => evt_lieferkette_payoff        (4 weeks later)
 *   -> "Zugang nur per Freischaltung/Ticket"  => evt_lieferkette_payoff        (4 weeks later)
 *   -> "Durchwinken"                          => evt_lieferkette_kompromittiert (4 weeks later)
 *   -> "Komplett verweigern / aussitzen"      => evt_lieferkette_kompromittiert (5 weeks later, via unpatched vuln)
 *
 * Payoff/compromise are the SAME external trigger (a BSI warning that this very
 * vendor was compromised, tampered updates in circulation) seen from two sides.
 * The consequence text references the week-14 decision. Scoped to KRITIS on the
 * START event (gates the whole chain).
 */

export const supplyChainChainEvents: GameEvent[] = [
  // ── Starting event ────────────────────────────────────────────────
  {
    id: 'evt_lieferkette_start',
    weekRange: [14, 17],
    probability: 0.9,
    requiredModes: ['kritis'],
    category: 'security',
    title: 'Das dringende Update vom Hersteller',
    description: `Der Hersteller eurer Wasserwerk-Leittechnik ruft an, ungewohnt drängend: "Kritisches Sicherheitsupdate, muss diese Woche noch drauf. Und ehrlich gesagt wäre es für alle einfacher, wenn Sie uns einfach dauerhaften Zugang geben — dann machen wir sowas ab jetzt selbst, ohne Sie zu behelligen."

Ein dauerhafter Herstellerzugang direkt an der Trinkwasser-Steuerung. Ein Update, das du nicht gesehen, nicht geprüft, nicht getestet hast. Und ein Anrufer, der jede Nachfrage als Zeitverschwendung behandelt.

Bequem wäre "einfach machen lassen". Sicher wäre es nicht.`,
    involvedCharacters: ['fachabteilung'],
    mentorNote:
      'Supply-Chain-Sicherheit heißt: einem Hersteller nicht blind vertrauen. Updates gehören vor dem Einspielen geprüft (Signatur, Changelog, Test), Herstellerzugänge folgen dem Least-Privilege-Prinzip — Freischaltung nur bei Bedarf, nie dauerhaft offen. Ein manipuliertes Update oder ein gekaperter Wartungszugang ist ein klassischer Angriffsweg in KRITIS-Anlagen.',
    choices: [
      {
        id: 'lieferkette_update_pruefen',
        text: 'Update prüfen: Signatur und Changelog checken, erst auf dem Testsystem',
        effects: { skills: { security: 6, netzwerk: 3 }, compliance: 10, relationships: { fachabteilung: -3 }, stress: 12 },
        resultText:
          'Du lässt dich nicht drängen: Signatur verifiziert, Changelog gelesen, erst aufs Testsystem, dann — nach sauberem Durchlauf — in die Produktion. Der Hersteller ist genervt über den Tag Verzögerung. Du hast dafür genau dokumentiert, was du eingespielt hast und woher es kam. Diese Doku wird sich noch als Gold erweisen.',
        choiceTags: ['methodical', 'careful'],
        teachingMoment:
          'Ein Update prüft man vor dem Einspielen: Signatur gegen Manipulation, Changelog gegen Überraschungen, Testsystem gegen Betriebsausfall. Der Zeitgewinn des Durchwinkens ist das Risiko nie wert.',
        chainTriggers: [
          {
            targetEventId: 'evt_lieferkette_payoff',
            delayWeeks: 4,
            description: 'Verified update + provenance record pays off when the vendor gets compromised.',
          },
        ],
      },
      {
        id: 'lieferkette_least_privilege',
        text: 'Zugang ja — aber nur per Freischaltung nach Ticket, protokolliert',
        effects: { skills: { security: 5, softSkills: 4 }, compliance: 12, relationships: { fachabteilung: 3 }, stress: 8 },
        resultText:
          'Du sagst nicht Nein zum Zugang, sondern Ja mit Bedingungen: Freischaltung nur nach Ticket, zeitlich begrenzt, jede Verbindung protokolliert. Kein dauerhaftes offenes Tor. Der Hersteller murrt erst, akzeptiert dann — "machen andere auch so". Genau: Die sicheren machen es so.',
        choiceTags: ['least_privilege', 'careful'],
        teachingMoment:
          'Least Privilege für Herstellerzugänge: kein Dauerzugang, sondern Freischaltung on demand, befristet und protokolliert. So bleibt der Wartungsweg nutzbar, ohne ein permanentes Einfallstor zu sein.',
        chainTriggers: [
          {
            targetEventId: 'evt_lieferkette_payoff',
            delayWeeks: 4,
            description: 'Controlled, ticketed access pays off when the vendor gets compromised.',
          },
        ],
      },
      {
        id: 'lieferkette_durchwinken',
        text: 'Durchwinken — die kennen ihr System am besten',
        effects: { stress: -4, compliance: -12 },
        resultText:
          'Du gibst nach: Update eingespielt, ungeprüft, und der dauerhafte Zugang ist eingerichtet. Der Hersteller ist zufrieden, dein Nachmittag gerettet. Was genau da jetzt läuft und wer alles über diesen Zugang an eure Trinkwasser-Steuerung kommt, weißt du nicht. Bequemlichkeit auf Kredit — die Rechnung kommt später.',
        choiceTags: ['negligent', 'hasty'],
        chainTriggers: [
          {
            targetEventId: 'evt_lieferkette_kompromittiert',
            delayWeeks: 4,
            description: 'Unverified update + permanent access turns into a supply-chain compromise.',
          },
        ],
      },
      {
        id: 'lieferkette_verweigern',
        text: 'Komplett verweigern: kein Zugang, kein Update — Thema aussitzen',
        effects: { compliance: -8, relationships: { fachabteilung: -10 }, stress: 6 },
        resultText:
          'Du blockst rundheraus ab: kein Zugang, und das Update spielst du "wenn ich mal Zeit habe" ein — also nie. Der Hersteller ist beleidigt, die {fachabteilung} sauer, weil die Anlage jetzt in der Luft hängt. Und das kritische Update, das eine reale Lücke schließen sollte? Bleibt offen. Blockieren ist nicht dasselbe wie absichern.',
        choiceTags: ['blocker', 'negligent'],
        chainTriggers: [
          {
            targetEventId: 'evt_lieferkette_kompromittiert',
            delayWeeks: 5,
            description: 'The unpatched known vuln gets exploited instead — distinct path, same consequence event.',
          },
        ],
      },
    ],
    tags: ['kritis', 'chain_start', 'supply_chain', 'ot', 'wasserwerk'],
  },

  // ── Consequence A: the diligence pays off ─────────────────────────
  {
    id: 'evt_lieferkette_payoff',
    weekRange: [18, 24],
    probability: 1.0,
    category: 'security',
    isChainEvent: true,
    chainPriority: 12,
    title: 'BSI-Warnung: euer Hersteller',
    description: `Eine BSI-Warnung, Einstufung hoch: Genau der Hersteller eurer Leittechnik wurde kompromittiert. Angreifer haben sich in dessen Update-Infrastruktur eingenistet, manipulierte Updates sind im Umlauf. Betroffen: alle Kunden, die in den letzten Wochen Updates von dort bezogen oder Herstellerzugänge offen hatten.

Dein Puls bleibt ruhig. Weil du damals nicht blind vertraut hast — geprüftes Update mit dokumentierter Herkunft, kontrollierter Zugang mit Protokoll. Du kannst nachweisen, dass bei euch nichts Manipuliertes durchkam.

Während andere Kommunen jetzt panisch suchen, kannst du belegen: sauber.`,
    involvedCharacters: ['chef'],
    mentorNote:
      'Genau hierfür lohnt sich Supply-Chain-Sorgfalt: Wenn ein Hersteller kompromittiert wird, ist der Unterschied zwischen "wir können Sauberkeit beweisen" und "wir wissen es nicht" die vorher geleistete Prüf- und Protokollarbeit. Vorfall trotzdem prüfen und ans BSI zurückmelden.',
    choices: [
      {
        id: 'lieferkette_payoff_ioc',
        text: 'IoC-Prüfung fahren und die eigene Sauberkeit sauber belegen',
        effects: { skills: { security: 7, netzwerk: 4 }, compliance: 14, relationships: { chef: 12 }, stress: 4 },
        resultText:
          'Du gleichst die IoCs aus der Warnung gegen Logs und Systeme ab — dank deiner Protokolle in Stunden statt Tagen. Ergebnis: nichts Manipuliertes, kein unbekannter Zugriff. Die Prüfung aus Woche 14 zahlt jetzt vollständig ein. {chef}, der die Panik-Meldungen der Nachbarkommunen mitbekommt: "Gut, dass du damals so pingelig warst."',
        teachingMoment:
          'Eine dokumentierte Update-Herkunft und protokollierte Zugänge machen die IoC-Prüfung nach einem Lieferketten-Angriff schnell und belastbar — genau das ist gelebte Resilienz.',
        setsFlags: ['lieferkette_sauber'],
      },
      {
        id: 'lieferkette_payoff_bsi',
        text: 'Dem BSI eine saubere Rückmeldung liefern und den Zugang vorsorglich sperren',
        effects: { skills: { security: 5, softSkills: 3 }, compliance: 15, relationships: { chef: 8, gf: 6 }, stress: 6 },
        resultText:
          'Du meldest dem BSI zurück: geprüfter Update-Stand, kontrollierter Zugang, keine Auffälligkeiten — und sperrst den Herstellerzugang vorsorglich, bis der Hersteller selbst wieder als vertrauenswürdig gilt. Eine Musterreaktion. {gf} bekommt Wind davon: "So stelle ich mir das vor." Aus einer Bedrohung wird ein Reifenachweis.',
        teachingMoment:
          'Nach einem Lieferketten-Vorfall gehört der betroffene Herstellerzugang vorsorglich gesperrt, bis dessen Integrität wiederhergestellt ist — und eine saubere Rückmeldung ans BSI stärkt die gemeinsame Lageübersicht.',
        setsFlags: ['lieferkette_sauber', 'lieferkette_bsi_gemeldet'],
      },
      {
        id: 'lieferkette_payoff_standard',
        text: 'Den geprüften Prozess als verbindlichen Standard für alle Hersteller festschreiben',
        effects: { skills: { security: 4, softSkills: 4 }, compliance: 12, relationships: { chef: 8 }, stress: 6 },
        resultText:
          'Du nimmst den Vorfall zum Anlass, aus deiner Einzelfall-Sorgfalt eine Regel zu machen: Update-Prüfung und kontrollierter Zugang gelten ab jetzt für jeden Hersteller, schriftlich, in jedem Wartungsvertrag. {chef} will es dem Rat als Erfolgsgeschichte vortragen. Was als Bauchgefühl begann, ist jetzt Prozess.',
        teachingMoment:
          'Ein einzelner gut gemeisterter Vorfall ist eine Chance, die richtige Praxis zu institutionalisieren — aus "ich mache das sorgfältig" wird "so machen wir das hier immer".',
        setsFlags: ['lieferkette_sauber', 'lieferkette_standard'],
      },
    ],
    tags: ['kritis', 'chain_consequence', 'supply_chain', 'ot', 'payoff'],
  },

  // ── Consequence B: the compromise lands ───────────────────────────
  {
    id: 'evt_lieferkette_kompromittiert',
    weekRange: [18, 24],
    probability: 1.0,
    category: 'crisis',
    isChainEvent: true,
    chainPriority: 12,
    title: 'BSI-Warnung — und verdächtiger Traffic',
    description: `Dieselbe BSI-Warnung wie überall: Der Hersteller eurer Leittechnik wurde kompromittiert, manipulierte Updates und gekaperte Wartungszugänge im Umlauf. Nur dass es bei euch nicht bei der Warnung bleibt.

Das Monitoring zeigt verdächtige Verbindungen aus dem Leittechnik-Segment — hinaus, zu einer Adresse, die dort nichts zu suchen hat. Entweder das ungeprüfte Update war manipuliert, oder jemand ist über den offen gelassenen Zugang hereingekommen (oder über die Lücke, die das verweigerte Update hätte schließen sollen).

Direkt an der Trinkwasser-Steuerung. Und du kannst nicht mal sicher sagen, seit wann.`,
    involvedCharacters: ['chef', 'gf'],
    mentorNote:
      'Der Ernstfall eines Lieferketten-Angriffs an einer KRITIS-Anlage: Isolieren zuerst (Schaden begrenzen), dann Meldepflicht — nach NIS2 binnen 72 Stunden ans BSI. Ohne Prüf- und Protokollhistorie ist die Forensik mühsam und der Umfang lange unklar. Genau die Vorarbeit, die vorher gespart wurde, fehlt jetzt.',
    choices: [
      {
        id: 'lieferkette_kompromittiert_isolieren',
        text: 'Sofort isolieren und die 72-Stunden-Meldung ans BSI vorbereiten',
        effects: { skills: { security: 6, netzwerk: 4 }, compliance: 8, relationships: { chef: 5, gf: 8 }, stress: 18 },
        resultText:
          'Du trennst das Leittechnik-Segment sofort vom Rest und startest die NIS2-Meldung. {gf} kommt persönlich vorbei, aschfahl: "Trinkwasser. Wenn da manipuliert wurde, stehe ich morgen vor der Kamera." Die Forensik wird zäh, weil die Prüf-Historie fehlt — genau die, die du in Woche 14 nicht angelegt hast. Aber die Blutung ist gestoppt.',
        choiceTags: ['decisive'],
        teachingMoment:
          'Im Lieferketten-Ernstfall gilt: erst isolieren, dann melden (NIS2, 72 Stunden). Ohne vorherige Prüf- und Protokollarbeit ist die anschließende Aufklärung deutlich langsamer und der Schadensumfang länger unklar.',
        setsFlags: ['lieferkette_vorfall_gemeldet'],
      },
      {
        id: 'lieferkette_kompromittiert_forensik',
        text: 'Vom Hersteller Forensik und Aufklärung einfordern — er hat das verursacht',
        effects: { skills: { security: 4, softSkills: 4 }, compliance: 6, relationships: { chef: 3 }, stress: 14 },
        resultText:
          'Du nimmst den Hersteller in die Pflicht: Er soll offenlegen, was über seine Infrastruktur lief und was der Zugang bei euch berührt hat. Er windet sich, liefert nur zögerlich — und ohne eigene Protokolle bist du auf seine Auskünfte angewiesen. Ein unbequemes Gefühl: abhängig von genau dem, der das Problem verursacht hat. Immerhin läuft die Aufklärung, langsam.',
        teachingMoment:
          'Den verursachenden Hersteller zur Aufklärung zu verpflichten ist richtig — aber ohne eigene Protokolle macht man sich von dessen Auskünften abhängig. Eigene Nachvollziehbarkeit ist durch nichts zu ersetzen.',
      },
      {
        id: 'lieferkette_kompromittiert_stillschweigend',
        text: 'Stillschweigend neu aufsetzen und hoffen, dass es niemand erfährt',
        effects: { compliance: -15, relationships: { gf: -10 }, stress: 16 },
        resultText:
          'Du setzt das Segment still neu auf und meldest nichts — Trinkwasser, Kameras, keine gute Presse, denkst du. Aber die Meldepflicht nach NIS2 ist keine Ermessensfrage, und ein verschwiegener KRITIS-Vorfall wird zum zweiten, größeren Problem, sobald er auffliegt. {gf} würde dich für diesen Alleingang nie decken — wenn sie davon wüsste.',
        choiceTags: ['negligent', 'evasive'],
        teachingMoment:
          'Einen meldepflichtigen KRITIS-Vorfall zu verschweigen tauscht ein technisches Problem gegen ein rechtliches — die Meldepflicht nach NIS2 ist verbindlich, und Vertuschung eskaliert die Folgen.',
      },
    ],
    tags: ['kritis', 'chain_consequence', 'supply_chain', 'ot', 'crisis', 'high_stakes'],
  },
];
