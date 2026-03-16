import { GameEvent } from '@kritis/shared';

/**
 * Act 1 Story Events: Weeks 3-5 (Getting Into It)
 * E07-E13: More complex challenges, deeper relationships
 * Note: E06 (Patch Tuesday) and E10 (Chef Credit) are in chains folder
 */

export const storyWeek3to5Events: GameEvent[] = [
  // E07: Baramundi-Desaster (different from colleague chain)
  {
    id: 'evt_baramundi_desaster',
    weekRange: [3, 5],
    probability: 0.85,
    category: 'crisis',
    title: 'Baramundi-Desaster',
    description: `{kollege} kommt mit grossem Augen zu dir.

"Ich hab was kaputt gemacht. In Baramundi. Ich wollte nur ein Software-Paket testen und hab... aus Versehen auf 'An alle deployen' geklickt."

Du schaust auf den Bildschirm. 20 PCs stecken in einer Boot-Schleife. Darunter: Die Rechner der Buchhaltung. Die brauchen die heute noch.

{chef} ist in einem Meeting mit der {gf}. In 30 Minuten ist er zurueck.`,
    involvedCharacters: ['kollege', 'chef'],
    mentorNote: 'Baramundi-Deployments: Immer erst eine OE als Testgruppe. Fehler des Kollegen zu covern baut Loyalitaet auf, aber nur wenn du es nicht zur Gewohnheit machst. Und: Dokumentiere was passiert ist - fuer den Prozessverbesserer, nicht den Schuldsucher.',
    choices: [
      {
        id: 'fix_together',
        text: 'Zusammen still fixen bevor {chef} zurueckkommt',
        effects: { relationships: { kollegen: 15 }, stress: 15, skills: { windows: 5 } },
        resultText: 'Ihr arbeitet fieberhaft. Recovery-Image booten, Profile retten, neu deployen. Als {chef} zurueckkommt, laufen 18 von 20 PCs wieder. "Technische Stoerung", sagt {kollege}.',
        choiceTags: ['cover_up', 'loyal', 'teamwork'],
        chainTriggers: [{
          targetEventId: 'evt_colleague_loyalty',
          delayWeeks: 3,
          probability: 0.8,
          description: 'Colleague remembers you covered for them',
        }],
      },
      {
        id: 'tell_chef',
        text: '{chef} sofort informieren - Transparenz ist wichtig',
        effects: { relationships: { chef: 5, kollegen: -15 }, stress: 10, compliance: 5 },
        resultText: '{chef} ist nicht begeistert, aber fair: "Fehler passieren. Wichtig ist, wie wir sie fixen." {kollege} schaut dich nicht mehr an.',
        choiceTags: ['honest', 'by_the_book'],
        chainTriggers: [{
          targetEventId: 'evt_colleague_resentment',
          delayWeeks: 2,
          description: 'Colleague resents being reported',
        }],
      },
      {
        id: 'fix_yourself',
        text: '{kollege} nach Hause schicken, du machst das alleine',
        effects: { relationships: { kollegen: 5 }, stress: 20, skills: { windows: 8 } },
        resultText: 'Du sagst: "Geh, ich regel das." Vier Stunden spaeter laeuft alles. Du bist muede, aber du verstehst Baramundi jetzt WIRKLICH.',
        choiceTags: ['heroic', 'learning'],
        teachingMoment: 'Manchmal ist der beste Lehrer ein kaputtes System. Aber nachhaltig ist Heldentum nicht.',
      },
    ],
    tags: ['story', 'crisis', 'baramundi', 'teamwork', 'week3'],
  },

  // E08: Die Sophos-Meldung
  {
    id: 'evt_sophos_meldung',
    weekRange: [3, 6],
    probability: 0.8,
    category: 'security',
    title: 'Die Sophos-Meldung',
    description: `Sophos Central meldet: "Trojan.Script.Agent" auf PC-VERWALTUNG-07.

Benutzer: Herr Weber aus der Buchhaltung. Er nutzt SFirm fuer Bankueberweisungen.

Das Problem: SFirm ist beruehmt fuer False Positives. Das Banking-Modul nutzt Skripte, die wie Malware aussehen.

Aber: Was wenn es diesmal echt ist?`,
    involvedCharacters: ['chef'],
    mentorNote: 'Bei KRITIS: Im Zweifel isolieren. Lieber ein Nutzer beschwert sich als ein Incident mit Meldepflicht ans BSI. SFirm False Positives: Erst pruefen, dann gezielt excluden, und DOKUMENTIEREN warum.',
    choices: [
      {
        id: 'isolate_now',
        text: 'Sofort PC vom Netz nehmen - Sicherheit geht vor',
        effects: { compliance: 10, relationships: { fachabteilung: -5 }, stress: 5 },
        resultText: 'Du ziehst das Netzwerkkabel. Herr Weber ist genervt: "Ich muss Ueberweisungen machen!" Die Analyse zeigt: False Positive durch SFirm. Aber besser so.',
        choiceTags: ['cautious', 'safe'],
        setsFlags: ['sophos_responded_properly'],
        teachingMoment: 'Ein paar Minuten Downtime sind nichts gegen einen echten Incident. Lieber einmal zu viel isolieren.',
      },
      {
        id: 'analyze_first',
        text: 'Erstmal analysieren - SFirm ist bekannt fuer False Positives',
        effects: { stress: 3, skills: { security: 3 } },
        resultText: 'Du pruefst die Details. Signatur, Pfad, Verhalten. Alles deutet auf SFirm. Du erstellst eine gezielte Ausnahme und dokumentierst sie.',
        choiceTags: ['analytical'],
        chainTriggers: [{
          targetEventId: 'evt_real_trojan',
          delayWeeks: 2,
          probability: 0.3,
          description: 'Small chance it was actually real malware',
        }],
      },
      {
        id: 'exclude_sfirm',
        text: 'SFirm generell von Sophos excluden - spart Zeit',
        effects: { compliance: -5, stress: -3 },
        resultText: 'Du erstellst eine Ausnahme fuer das ganze SFirm-Verzeichnis. Keine Meldungen mehr. Aber auch keine Ueberwachung mehr fuer Bankingsoftware...',
        choiceTags: ['lazy', 'risky'],
        chainTriggers: [{
          targetEventId: 'evt_exclusion_backfire',
          delayWeeks: 4,
          description: 'Broad exclusion causes problems later',
        }],
      },
    ],
    tags: ['story', 'security', 'sophos', 'week3'],
  },

  // E09: Das Meeting mit der GF
  {
    id: 'evt_meeting_gf',
    weekRange: [4, 5],
    probability: 0.9,
    category: 'politics',
    title: 'Das Meeting mit der GF',
    description: `{gf} will ein "kurzes Update zur IT-Sicherheitslage."

{chef} sagt zu dir: "Du solltest das praesentieren. Du kennst dich da besser aus als ich."

Ist das eine Chance? Oder schiebt er dich vor?

Das Meeting ist in zwei Tagen.`,
    involvedCharacters: ['chef', 'gf'],
    mentorNote: 'Jede Praesentation vor der GF ist eine Chance. Regel: Max 5 Folien, Ampelsystem (rot/gelb/gruen), konkrete naechste Schritte. Die GF will wissen: Sind wir sicher? Was kostet es? Was ist der naechste Schritt?',
    choices: [
      {
        id: 'prepare_well',
        text: 'Saubere Praesentation vorbereiten mit Ampelsystem',
        effects: { stress: 10, skills: { softSkills: 5 } },
        resultText: 'Du bereitest 5 Folien vor: Aktueller Stand (Ampel), Risiken (Top 3), Budget-Bedarf, Timeline. Die Praesentation laeuft gut - die {gf} stellt kluge Fragen und du hast Antworten.',
        choiceTags: ['prepared', 'professional'],
        chainTriggers: [{
          targetEventId: 'evt_gf_presentation_success',
          delayWeeks: 0,
          condition: 'state.compliance >= 40',
          description: 'Good presentation if compliance is ok',
        }],
        setsFlags: ['gf_presentation_done'],
      },
      {
        id: 'let_chef',
        text: '{chef} soll praesentieren, du arbeitest zu',
        effects: { relationships: { chef: 10 }, stress: 5 },
        resultText: 'Du bereitest die Folien vor, {chef} haelt sie. Er macht das gut - oder nimmt zumindest den Credit. Je nach Perspektive.',
        choiceTags: ['supportive', 'background'],
      },
      {
        id: 'more_time',
        text: 'Um mehr Vorlaufzeit bitten',
        effects: { relationships: { gf: -5 }, stress: -5 },
        resultText: '{gf} ist nicht begeistert: "Die IT sollte jederzeit Auskunft geben koennen." Das Meeting wird verschoben, aber der Eindruck bleibt.',
        choiceTags: ['delay'],
      },
    ],
    tags: ['story', 'politics', 'presentation', 'week4'],
  },

  // E11: Der Druckermarathon
  {
    id: 'evt_druckermarathon',
    weekRange: [3, 6],
    probability: 0.8,
    category: 'absurd',
    title: 'Der Druckermarathon',
    description: `Drei Drucker fallen gleichzeitig aus. In drei verschiedenen Abteilungen. Natuerlich.

Die Abfallwirtschaft braucht JETZT Abfuhrbescheide - Buergerfrist.
Die GF-Assistenz braucht JETZT Vertragsunterlagen - Meeting in einer Stunde.
Die Personalabteilung druckt Gehaltsabrechnungen - auch dringend.

Du hast zwei Haende und einen {kollege}n.`,
    involvedCharacters: ['kollege', 'gf'],
    mentorNote: 'Priorisierung nach Business Impact: Buergerfrist > GF-Vertraege > interne Post. Aber: Die GF-Assistenz vergisst nie, wer ihr geholfen hat. Politische Dimension nicht unterschaetzen.',
    choices: [
      {
        id: 'abfall_first',
        text: 'Abfallwirtschaft zuerst - Buergerfrist ist gesetzlich',
        effects: { relationships: { fachabteilung: 15, gf: -5 }, stress: 15, compliance: 5 },
        resultText: 'Du rast zur Abfallwirtschaft. Papierstau. In 10 Minuten laeuft er wieder. Die Bescheide gehen raus. Die GF-Assistenz ist not amused - aber die Buerger sind wichtiger.',
        choiceTags: ['compliant', 'citizen_first'],
      },
      {
        id: 'gf_first',
        text: 'GF-Assistenz zuerst - politisch klug',
        effects: { relationships: { gf: 10, fachabteilung: -5 }, stress: 10 },
        resultText: 'Du hilfst erst der GF-Assistenz. Der Drucker brauchte nur einen Neustart. Sie ist dankbar. Die Abfallwirtschaft schimpft - aber die Frist wird knapp eingehalten.',
        choiceTags: ['political'],
      },
      {
        id: 'split_colleague',
        text: '{kollege} nimmt einen, du nimmst zwei',
        effects: { relationships: { kollegen: 10 }, stress: 10, skills: { troubleshooting: 3 } },
        resultText: 'Ihr teilt euch auf. Teamwork! Nach einer Stunde laufen alle drei Drucker. Und ihr habt gezeigt, dass die IT auch unter Druck funktioniert.',
        choiceTags: ['teamwork', 'efficient'],
        teachingMoment: 'Delegieren ist keine Schwaeche. Ein gutes Team loest Probleme schneller als ein Held.',
      },
    ],
    tags: ['story', 'absurd', 'printers', 'week3'],
  },

  // E12: Die NIS2-Mail
  {
    id: 'evt_nis2_mail',
    weekRange: [4, 6],
    probability: 0.85,
    category: 'compliance',
    title: 'Die NIS2-Mail',
    description: `Eine Mail vom BSI landet im Postfach des {chef}. Er leitet sie an dich weiter:

"WARM muss sich als KRITIS-Betreiber registrieren. Frist: 6 Wochen."

{chef} schreibt dazu: "Kannst du dich darum kuemmern?"

Du liest die NIS2-Verordnung. Paragraph 38: Die Geschaeftsfuehrung ist PERSOENLICH verantwortlich fuer Cybersicherheit.

Das ist eigentlich keine IT-Aufgabe...`,
    involvedCharacters: ['chef', 'gf'],
    mentorNote: 'NIS2 §38: Die Geschaeftsleitung ist PERSOENLICH verantwortlich fuer Cybersicherheit. Das ist keine IT-Aufgabe, die delegiert wird. Du kannst zuarbeiten, aber die Registrierung muss die GF unterschreiben. Diesen Punkt zu kennen ist ein enormer Hebel.',
    choices: [
      {
        id: 'start_now',
        text: 'Sofort anfangen - gesetzliche Pflicht',
        effects: { compliance: 15, stress: 10, skills: { security: 5 } },
        resultText: 'Du arbeitest dich ein: Registrierungsportal, erforderliche Dokumente, Ansprechpartner. In einer Woche hast du alles vorbereitet. {gf} muss nur noch unterschreiben.',
        choiceTags: ['proactive', 'compliant'],
        setsFlags: ['nis2_registration_started'],
      },
      {
        id: 'point_to_gf',
        text: '{chef} darauf hinweisen, dass das Chefsache ist',
        effects: { relationships: { chef: -10 }, compliance: 5 },
        resultText: '{chef} ist irritiert: "Ich delegiere das an dich." Du zeigst ihm §38. Er wird blass. "Okay, ich rede mit der {gf}." Korrekt, aber nicht beliebt.',
        choiceTags: ['correct', 'confrontational'],
        teachingMoment: 'Manchmal muss man dem Chef unangenehme Wahrheiten sagen. Die Art und Weise entscheidet, ob es konstruktiv ist.',
      },
      {
        id: 'research_first',
        text: 'Erstmal gruendlich recherchieren was genau gefordert ist',
        effects: { compliance: 5, stress: 5, skills: { security: 8 } },
        resultText: 'Du verbringst zwei Tage mit den NIS2-Dokumenten. Am Ende verstehst du mehr ueber KRITIS-Regulierung als die meisten Berater. Das zahlt sich spaeter aus.',
        choiceTags: ['thorough', 'learning'],
        setsFlags: ['nis2_expert'],
      },
    ],
    tags: ['story', 'compliance', 'nis2', 'kritis', 'week4'],
  },

  // E13: Altlast im Serverraum
  {
    id: 'evt_altlast_serverraum',
    weekRange: [4, 7],
    probability: 0.85,
    category: 'support',
    title: 'Altlast im Serverraum',
    description: `Du findest einen Windows Server 2012 R2 der noch laeuft. Still vor sich hin blinkend.

Darauf: Eine Access-Datenbank, die eine Abteilung TAEGLICH nutzt. "Abfallgebuerenberechnung.mdb"

Letzter Patch: 2019. Support-Ende: 2023. Backup: Keines dokumentiert.

Die Fachabteilung weiss nicht mal, dass das ein Problem ist. "Der laeuft doch."`,
    involvedCharacters: ['chef'],
    mentorNote: 'Altlasten: 1) Backup SOFORT. 2) Dokumentieren wer es nutzt und wofuer. 3) Risikobewertung schreiben. 4) Migration mit der Fachabteilung planen. Nie einfach abschalten - und nie einfach laufen lassen.',
    choices: [
      {
        id: 'backup_migrate',
        text: 'Sofort Backup einrichten, Migration planen',
        effects: { stress: 10, compliance: 10, skills: { troubleshooting: 5 } },
        resultText: 'Du richtest ein taegliches Backup ein und schreibst einen Migrationsplan: Access → SQL Express, Server 2012 → Server 2022. Das wird Wochen dauern, aber es ist richtig.',
        choiceTags: ['thorough', 'responsible'],
        setsFlags: ['legacy_server_handled'],
      },
      {
        id: 'backup_report',
        text: 'Notfall-Backup machen, dann {chef} informieren',
        effects: { relationships: { chef: 5 }, compliance: 5, budget: -10 },
        resultText: 'Du sicherst die Datenbank und schreibst einen Risikobericht. {chef}: "Gut erkannt. Budget fuer Migration beantragen wir naechstes Quartal." Hoffentlich haelt der Server so lange.',
        choiceTags: ['pragmatic'],
      },
      {
        id: 'document_only',
        text: 'Dokumentieren und Risiko melden - nicht anfassen',
        effects: { compliance: 5 },
        resultText: 'Du dokumentierst den Fund und meldest das Risiko schriftlich. Mehr kannst du nicht tun ohne Freigabe. Oder?',
        choiceTags: ['cautious'],
        chainTriggers: [{
          targetEventId: 'evt_legacy_crash',
          delayWeeks: 4,
          probability: 0.4,
          description: 'Unmanaged legacy server eventually crashes',
        }],
      },
    ],
    tags: ['story', 'legacy', 'risk', 'week4'],
  },

  // Triggered by evt_gf_presentation_success
  {
    id: 'evt_gf_presentation_success',
    weekRange: [4, 6],
    probability: 1.0,
    category: 'personal',
    isChainEvent: true,
    chainPriority: 5,
    title: 'Positive Resonanz',
    description: `Nach der Praesentation kommt {gf} auf dich zu.

"Gut gemacht. Klar strukturiert, auf den Punkt. So will ich das sehen."

Sie macht eine Pause.

"Der {chef} hat mir gesagt, Sie sind noch in der Probezeit. Wenn Sie so weitermachen, sehe ich da keine Probleme."

Das war ein guter Tag.`,
    involvedCharacters: ['gf', 'chef'],
    mentorNote: 'Positives Feedback von der Geschaeftsfuehrung ist Gold wert - aber bleib bescheiden. Einmal gute Arbeit ersetzt nicht nachhaltige Leistung.',
    choices: [
      {
        id: 'thank_humble',
        text: 'Bescheiden bedanken',
        effects: { relationships: { gf: 10 }, skills: { softSkills: 5 }, stress: -10 },
        resultText: '"Danke, das bedeutet mir viel. Ich gebe mein Bestes." {gf} nickt. Das war die richtige Reaktion.',
      },
      {
        id: 'mention_team',
        text: 'Auf das Team hinweisen - {kollege} hat auch geholfen',
        effects: { relationships: { gf: 5, kollegen: 10 }, skills: { softSkills: 8 }, stress: -8 },
        resultText: '"Das Team hat stark unterstuetzt." {gf}: "Gut, dass Sie das erwaehnen. Teamplayer sind selten." {kollege} hoert davon und freut sich.',
        teachingMoment: 'Credit teilen macht dich groesser, nicht kleiner.',
      },
    ],
    tags: ['story', 'chain_consequence', 'career', 'recognition'],
  },
];
