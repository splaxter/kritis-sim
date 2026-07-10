import { GameEvent } from '@kritis/shared';

/**
 * Conditional/Bonus Chain Events (E30-E35)
 * These trigger based on specific decisions made earlier in the game
 */

export const conditionalEvents: GameEvent[] = [
  // E30: License Audit Bomb
  {
    id: 'evt_license_audit_bomb',
    weekRange: [8, 11],
    probability: 1.0,
    category: 'compliance',
    isChainEvent: true,
    chainPriority: 8,
    title: 'Microsoft-Prüfung',
    description: `Ein Brief von Microsoft Legal.

"Sehr geehrte Damen und Herren, im Rahmen unserer routinemäßigen Lizenzüberprüfungen haben wir Unregelmäßigkeiten in Ihrem Lizenzbestand festgestellt..."

Die 15 unlizenierten Office-Installationen. Du hast sie gefunden und... nichts gesagt.

{gf} steht mit dem Brief in der Tür. "Erklären Sie mir das."`,
    involvedCharacters: ['gf', 'kaemmerer'],
    mentorNote: 'Versteckte Compliance-Probleme explodieren immer zum schlimmsten Zeitpunkt. Frühe Transparenz ist billiger als späte Krisen.',
    choices: [
      {
        id: 'come_clean',
        text: 'Reinen Tisch machen: Du wusstest davon',
        effects: { compliance: -15, relationships: { gf: -20, kaemmerer: -15 }, stress: 20 },
        resultText: '"Ich habe es gefunden und nicht gemeldet. Das war ein Fehler." Die {gf} ist wütend. Der {kaemmerer} rechnet. Das wird teuer - und peinlich.',
        teachingMoment: 'Ehrlichkeit ist spät immer noch besser als Lügen - aber früh wäre besser gewesen.',
      },
      {
        id: 'blame_predecessor',
        text: 'Auf den Vorgänger schieben',
        effects: { compliance: -10, relationships: { gf: -10 }, stress: 15 },
        resultText: '"Das war schon so, als ich angefangen habe." Technisch wahr. Aber du hast es gesehen und nichts getan. Die {gf} ist nicht überzeugt.',
      },
    ],
    tags: ['story', 'chain_consequence', 'compliance', 'licensing'],
  },

  // E31: Shadow IT
  {
    id: 'evt_shadow_it',
    weekRange: [8, 11],
    probability: 1.0,
    category: 'security',
    isChainEvent: true,
    chainPriority: 7,
    title: 'Die NAS im Netzwerk',
    description: `Beim Netzwerkscan taucht ein neues Gerät auf: Eine Synology NAS.

IP: 192.168.1.247. Nicht dokumentiert. Nicht genehmigt.

Du erinnerst dich: Herr Bauer aus der Abfallwirtschaft. Du hast ihm Admin-Rechte gegeben.

Er hat eine private NAS ans Firmennetz gehängt. Mit Bürgerdaten drauf.`,
    involvedCharacters: ['chef'],
    mentorNote: 'Shadow IT ist ein Symptom, keine Ursache. Die Ursache ist: Nutzer haben Bedürfnisse, die die offizielle IT nicht erfüllt. Löse das Problem, nicht nur das Symptom.',
    choices: [
      {
        id: 'remove_quietly',
        text: 'Gerät entfernen und mit Herrn Bauer reden',
        effects: { relationships: { fachabteilung: -10 }, compliance: 5, stress: 10 },
        resultText: 'Du gehst zu ihm. "Das muss weg. Sofort. Und wir sprechen nie wieder darüber." Er ist erschrocken, aber kooperativ. Die NAS verschwindet.',
        choiceTags: ['pragmatic'],
      },
      {
        id: 'formal_incident',
        text: 'Offiziellen Security-Incident melden',
        effects: { compliance: 15, relationships: { fachabteilung: -20, chef: 5 }, stress: 10 },
        resultText: 'Du meldest den Vorfall formal. Herr Bauer wird abgemahnt. Die Fachabteilung ist sauer - aber die Compliance ist gewahrt.',
        choiceTags: ['by_the_book'],
        teachingMoment: 'Manchmal muss man unpopulär sein, um richtig zu handeln.',
      },
      {
        id: 'integrate_properly',
        text: 'NAS offiziell integrieren mit Sicherheitsregeln',
        effects: { compliance: 5, relationships: { fachabteilung: 5 }, stress: 15 },
        resultText: 'Du nimmst die NAS unter IT-Kontrolle: Backup, Zugriffskontrolle, Dokumentation. Herr Bauer ist happy - er wollte nur ein Problem lösen.',
        choiceTags: ['solution_oriented'],
      },
    ],
    tags: ['story', 'chain_consequence', 'security', 'shadow_it'],
  },

  // E32: Switch Failure
  {
    id: 'evt_switch_failure',
    weekRange: [9, 12],
    probability: 1.0,
    category: 'crisis',
    isChainEvent: true,
    chainPriority: 8,
    title: 'Switch-Ausfall',
    description: `Der Kern-Switch im Serverraum ist ausgefallen. End of Life seit 2021.

Du hast im Budget-Gespräch auf Backup und Sophos gesetzt. Die Switches sollten "noch ein Jahr halten."

Sie haben nicht.

Jetzt sind 150 Arbeitsplätze offline. Und das Ersatzgerät? Lieferzeit 3 Wochen.`,
    involvedCharacters: ['chef', 'kaemmerer'],
    mentorNote: 'Infrastruktur-Schulden holen einen immer ein. Die Frage ist nur wann - und ob man einen Plan B hat.',
    choices: [
      {
        id: 'temporary_switch',
        text: 'Temporären Consumer-Switch aus dem Baumarkt',
        effects: { budget: -100, compliance: -10, stress: 15 },
        resultText: 'Du kaufst einen 80-Euro-Netgear. Nicht enterprise-tauglich, aber es läuft. Für drei Wochen muss es reichen.',
        choiceTags: ['creative', 'risky'],
      },
      {
        id: 'partial_reconnect',
        text: 'Kritische Systeme direkt am Router anschliessen',
        effects: { stress: 20, skills: { netzwerk: 5 } },
        resultText: 'Du verkabelst alles um: Server direkt am Router, VLANs temporär aufgelöst. Hässlich, aber funktional.',
        choiceTags: ['technical'],
      },
      {
        id: 'escalate_budget',
        text: 'Notfall-Budget-Freigabe bei {kaemmerer}',
        effects: { relationships: { kaemmerer: -10 }, budget: -3000 },
        resultText: '{kaemmerer} ist nicht happy, aber er sieht die Notlage. Express-Lieferung für 3.000 Euro. Der neue Switch ist in 3 Tagen da.',
        choiceTags: ['escalate'],
      },
    ],
    tags: ['story', 'chain_consequence', 'crisis', 'infrastructure'],
  },

  // E33: Backup Crisis
  {
    id: 'evt_backup_crisis',
    weekRange: [10, 12],
    probability: 1.0,
    category: 'crisis',
    isChainEvent: true,
    chainPriority: 9,
    title: 'Ransomware-Alarm',
    description: `Sophos meldet: Ransomware-Aktivität auf drei Rechnern.

Die Verschlüsselung läuft. Du hast die Rechner isoliert. Aber jetzt kommt die Frage:

"Wie aktuell ist unser Backup?"

Du erinnerst dich: Im Budget-Gespräch hast du auf Backup verzichtet.

Die Antwort ist: Es gibt kein zuverlässiges Backup.`,
    involvedCharacters: ['chef', 'gf'],
    mentorNote: 'Ransomware ohne Backup ist Game Over. Die 3-2-1-Regel existiert aus gutem Grund.',
    choices: [
      {
        id: 'find_old_backups',
        text: 'Nach alten Backups suchen - irgendwo muss was sein',
        effects: { stress: 25, skills: { troubleshooting: 5 } },
        resultText: 'Du durchsuchst alles: Alte Festplatten, Cloud-Fragmente, lokale Kopien. Du findest ein 3 Monate altes Backup. Besser als nichts.',
        choiceTags: ['desperate'],
      },
      {
        id: 'admit_no_backup',
        text: 'Ehrlich sein: Wir haben kein vollständiges Backup',
        effects: { relationships: { gf: -25, chef: -15 }, compliance: -20, stress: 20 },
        resultText: 'Die {gf} wird blass. "KEIN Backup? Bei einem KRITIS-Betreiber?" Das Gespräch wird sehr unangenehm.',
        teachingMoment: 'Manche Fehler kann man nicht erklären. Nur aus ihnen lernen.',
      },
    ],
    tags: ['story', 'chain_consequence', 'crisis', 'ransomware', 'backup'],
  },

  // E34: OPNsense Responsibility
  {
    id: 'evt_opnsense_responsibility',
    weekRange: [10, 12],
    probability: 1.0,
    category: 'crisis',
    isChainEvent: true,
    chainPriority: 7,
    title: 'Der Einzige der es kann',
    description: `Du bist krank. Grippe. 39 Grad Fieber.

Dein Handy klingelt. {chef}:

"Das VPN geht nicht. Niemand kann von zuhause arbeiten. Und die OPNsense-Firewall... die kennst nur du."

Du liegst im Bett und überlegst: Du hast die Migration vorgeschlagen. Du bist jetzt verantwortlich.`,
    involvedCharacters: ['chef'],
    mentorNote: 'Single Point of Knowledge ist ein Risiko. Dokumentation und Wissenstransfer sind Teil jeder Migration.',
    choices: [
      {
        id: 'remote_help',
        text: 'Per Telefon anleiten - Schritt für Schritt',
        effects: { stress: 15, relationships: { chef: 5 } },
        resultText: 'Du leitest Henry durch die OPNsense-Oberfläche. Eine Stunde später läuft das VPN. Du bist erschöpft, aber erleichtert.',
        choiceTags: ['dedicated'],
      },
      {
        id: 'refuse_sick',
        text: 'Nein - krank ist krank',
        effects: { stress: 5, relationships: { chef: -10 } },
        resultText: '"Ich bin nicht arbeitsfähig. Ruft den Sophos-Support an - die haben Notfall-Nummern." {chef} ist nicht happy. Aber du hast recht.',
        choiceTags: ['boundary_setting'],
        teachingMoment: 'Grenzen setzen ist wichtig. Aber: Hättest du besser dokumentiert, gäbe es diese Situation nicht.',
      },
    ],
    tags: ['story', 'chain_consequence', 'health', 'knowledge_management'],
  },

  // Password Policy Chain
  {
    id: 'evt_password_policy_needed',
    weekRange: [4, 7],
    probability: 1.0,
    category: 'compliance',
    isChainEvent: true,
    chainPriority: 5,
    title: 'Passwort-Chaos',
    description: `Drei weitere Passwort-Resets diese Woche. Alle telefonisch, alle ohne Verifizierung.

{chef} erwähnt: "Das BSI fragt bei KRITIS-Prüfungen nach dem Passwort-Reset-Prozess."

Ihr habt keinen dokumentierten Prozess. Nur: "Anrufen, zurücksetzen."`,
    involvedCharacters: ['chef'],
    mentorNote: 'Identity Verification ist bei Passwort-Resets kritisch. Social Engineering nutzt genau diese Lücke.',
    choices: [
      {
        id: 'create_process',
        text: 'Jetzt einen sauberen Prozess erstellen',
        effects: { compliance: 10, stress: 8, skills: { security: 5 } },
        resultText: 'Du schreibst den Prozess: Rückruf auf bekannte Nummer, temporäres Passwort per separatem Kanal, Aenderungszwang. {chef} ist zufrieden.',
        setsFlags: ['password_policy_documented'],
      },
      {
        id: 'quick_form',
        text: 'Schnell ein Formular erstellen - Hauptsache dokumentiert',
        effects: { compliance: 5, stress: 3 },
        resultText: 'Ein einfaches Word-Dokument: "Passwort-Reset-Anfrage". Besser als nichts, aber nicht wirklich sicher.',
      },
    ],
    tags: ['story', 'chain_consequence', 'security', 'process'],
  },

  // Cable Chaos Later
  {
    id: 'evt_cable_chaos_later',
    weekRange: [4, 8],
    probability: 1.0,
    category: 'crisis',
    isChainEvent: true,
    chainPriority: 6,
    title: 'Kabel-Albtraum',
    description: `Ein Switch im Patchschrank blinkt rot. Drei VLANs sind betroffen.

Du öffnest den Schrank. Das Chaos, das du am ersten Tag gesehen hast. Undokumentiert. Unbeschriftet.

Du hast damals nur ein schnelles Foto gemacht. Jetzt musst du jeden einzelnen Port verfolgen.`,
    involvedCharacters: [],
    mentorNote: 'Technische Schulden verzinsen sich mit der Zeit.',
    choices: [
      {
        id: 'trace_now',
        text: 'Alles nachverfolgen - diesmal dokumentieren',
        effects: { stress: 20, compliance: 10, skills: { netzwerk: 8 } },
        resultText: 'Vier Stunden später hast du das Problem gefunden: Ein loses Kabel. Und eine vollständige Dokumentation.',
        teachingMoment: 'Jede Krise ist eine Chance zur Verbesserung.',
      },
      {
        id: 'random_check',
        text: 'Systematisch jeden Port prüfen bis es geht',
        effects: { stress: 15 },
        resultText: 'Nach zwei Stunden Rumprobieren funktioniert es wieder. Warum? Keine Ahnung. Dokumentation? Immer noch keine.',
      },
    ],
    tags: ['story', 'chain_consequence', 'infrastructure'],
  },

  // Real Trojan Chain
  {
    id: 'evt_real_trojan',
    weekRange: [5, 9],
    probability: 1.0,
    category: 'security',
    isChainEvent: true,
    chainPriority: 8,
    title: 'Es war kein False Positive',
    description: `Sophos meldet erneut: "Trojan.Script.Agent" auf PC-VERWALTUNG-07.

Diesmal anders: Command & Control Verbindung erkannt.

Du hast beim letzten Mal "Erstmal analysieren" gewählt. Es war KEIN SFirm False Positive. Es war echter Malware.

Der PC hat drei Tage lang Daten nach aussen gesendet.`,
    involvedCharacters: ['chef'],
    mentorNote: 'Im Zweifel: Isolieren. Die Kosten eines Fehlalarms sind geringer als die einer echten Kompromittierung.',
    choices: [
      {
        id: 'full_incident',
        text: 'Vollständigen Incident-Response starten',
        effects: { compliance: 10, stress: 25, skills: { security: 10 } },
        resultText: 'Du isolierst, analysierst, meldest ans BSI. Der Schaden ist begrenzt - zum Glück war es nur ein Buchhaltungs-PC ohne kritische Daten.',
        setsFlags: ['incident_handled'],
      },
      {
        id: 'quick_reimage',
        text: 'Keine Zeit für grossen Aufwand: PC platt machen, neu aufsetzen, weiter',
        // Tempting in the moment (low effort, no stress spike like a full IR),
        // but a real C&C breach with 3 days of exfiltration + violated reporting
        // duty must bite mechanically — not just narratively.
        effects: { compliance: -25, stress: 5, skills: { windows: 2 } },
        resultText: 'Schnell erledigt - aber du weisst nicht, was abgeflossen ist, ob andere Systeme betroffen sind, und das BSI wurde nie informiert. Drei Tage Datenabfluss bleiben unaufgeklärt - und die Meldepflicht ist verletzt.',
        choiceTags: ['shortcut', 'risky'],
        setsFlags: ['breach_uninvestigated'],
        teachingMoment: 'Neu aufsetzen löscht die Spuren, nicht das Problem: ohne Analyse weisst du nicht, was kompromittiert wurde - und die Meldepflicht bleibt verletzt.',
      },
    ],
    tags: ['story', 'chain_consequence', 'security', 'incident'],
  },

  // Macro Conflict
  {
    id: 'evt_macro_conflict',
    weekRange: [9, 11],
    probability: 1.0,
    category: 'support',
    isChainEvent: true,
    chainPriority: 5,
    title: 'Makro-Krieg',
    description: `Die Buchhaltung kann nicht mehr arbeiten. SFirm braucht Makros. Du hast alle Makros blockiert.

{kaemmerer} ruft an: "Ich kann keine Überweisungen mehr machen! Was haben Sie getan?!"

Die Weihnachtsfeier-Mail hat weitreichende Folgen.`,
    involvedCharacters: ['kaemmerer'],
    mentorNote: 'Blanket Policies haben Kollateralschäden. Besser: Gezieltes Whitelisting für bekannte Anwendungen.',
    choices: [
      {
        id: 'create_whitelist',
        text: 'SFirm-Ausnahme erstellen mit Dokumentation',
        effects: { relationships: { kaemmerer: 5 }, compliance: 5, stress: 10 },
        resultText: 'Du erstellst eine gezielte Ausnahme für den SFirm-Pfad. Dokumentiert, begründet, sicher.',
      },
      {
        id: 'rollback_policy',
        text: 'Makro-Richtlinie zurückrollen',
        effects: { relationships: { kaemmerer: 3 }, compliance: -5 },
        resultText: 'Du nimmst die Richtlinie zurück. Problem gelöst - aber auch die Sicherheitsverbesserung ist weg.',
      },
    ],
    tags: ['story', 'chain_consequence', 'macros', 'policy'],
  },

  // Exclusion Backfire
  {
    id: 'evt_exclusion_backfire',
    weekRange: [7, 10],
    probability: 1.0,
    category: 'security',
    isChainEvent: true,
    chainPriority: 7,
    title: 'Die breite Ausnahme',
    description: `Sophos meldet nichts mehr von PC-VERWALTUNG-07.

Natürlich nicht - du hast das ganze SFirm-Verzeichnis ausgenommen.

Nur: Jetzt liegt dort auch eine neue .exe Datei. Die war vorher nicht da.

Und sie kommuniziert mit einer IP in Russland.`,
    involvedCharacters: ['chef'],
    mentorNote: 'Breite Ausnahmen sind gefährlich. Immer so spezifisch wie möglich.',
    choices: [
      {
        id: 'investigate_immediately',
        text: 'Sofort untersuchen und ggf. isolieren',
        effects: { compliance: 10, stress: 20, skills: { security: 10 } },
        resultText: 'Die Datei ist Malware. Sie hat die Sophos-Ausnahme ausgenutzt. Du isolierst den PC und startest eine Untersuchung.',
        setsFlags: ['exclusion_malware_found'],
      },
      {
        id: 'just_remove_exclusion',
        text: 'Einfach die Sophos-Ausnahme wieder entfernen und auf den Scanner hoffen',
        // Confirmed exfiltration to Russia — "remove the exclusion and hope" must
        // sting a bit more: no stress relief, deeper compliance hit, Chef notices.
        effects: { compliance: -15, stress: 3, relationships: { chef: -5 }, skills: { security: 2 } },
        resultText: 'Sophos schlägt sofort an und sperrt die .exe in Quarantäne - aber die Datei hat schon tagelang mit Russland kommuniziert. Was sie abgegriffen hat, untersucht niemand.',
        choiceTags: ['shortcut', 'risky'],
        teachingMoment: 'Die Ausnahme zu entfernen stoppt vielleicht die Datei, klärt aber weder den bereits erfolgten Abfluss noch mögliche Persistenz. Ein aktiver C2-Fund gehört untersucht, nicht weggeklickt.',
      },
    ],
    tags: ['story', 'chain_consequence', 'security', 'malware'],
  },

  // Shared Credentials Audit
  {
    id: 'evt_shared_credentials_audit',
    weekRange: [10, 12],
    probability: 1.0,
    category: 'compliance',
    isChainEvent: true,
    chainPriority: 6,
    title: 'Audit-Fund',
    description: `Der BSI-Prüfer schaut sich die VPN-Logs an.

"Hier steht, dass 'chef_admin' am 15. Oktober von zwei verschiedenen IP-Adressen gleichzeitig eingeloggt war. Wie ist das möglich?"

Du erinnerst dich: Das war, als der externe Dienstleister die Zugangsdaten vom {chef} benutzt hat.`,
    involvedCharacters: ['chef', 'gf'],
    mentorNote: 'Geteilte Credentials werden bei Audits IMMER entdeckt. Die Frage ist nur: Wie peinlich wird es?',
    choices: [
      {
        id: 'admit_error',
        text: 'Ehrlich erklären was passiert ist',
        effects: { compliance: -15, relationships: { gf: -10, chef: -5 }, stress: 15 },
        resultText: 'Du erklärst die Situation. Der Prüfer notiert es als "schwerwiegenden Verstoss gegen das Zugangsmanagement." Die {gf} schaut streng.',
      },
      {
        id: 'downplay_finding',
        text: 'Kleinreden: "Wahrscheinlich ein Log-Artefakt, das schaue ich mir nochmal an"',
        effects: { compliance: -25, relationships: { gf: -15, chef: 5 }, stress: 20 },
        resultText: 'Der Prüfer glaubt dir nicht - die Logs sind eindeutig. Jetzt steht im Bericht nicht nur "geteilte Zugangsdaten", sondern auch "Verschleierungsversuch gegenüber dem Auditor". Deutlich schlimmer.',
        choiceTags: ['deflect', 'risky'],
        teachingMoment: 'Einen Auditor anzuschwindeln macht aus einem Befund zwei: den ursprünglichen Verstoss plus mangelnde Kooperation. Ehrlichkeit ist im Audit fast immer billiger.',
      },
    ],
    tags: ['story', 'chain_consequence', 'compliance', 'audit'],
  },

  // Legacy Crash
  {
    id: 'evt_legacy_crash',
    weekRange: [8, 11],
    probability: 1.0,
    category: 'crisis',
    isChainEvent: true,
    chainPriority: 8,
    title: 'Der Server ist tot',
    description: `Der Windows Server 2012 R2 mit der Access-Datenbank ist abgestürzt.

Festplattenausfall. Keine Snapshots. Kein Backup.

Die Abfallgebührenberechnung funktioniert nicht mehr. Drei Jahre Daten.

{chef} steht in der Tür: "Du hast doch einen Plan, oder?"`,
    involvedCharacters: ['chef'],
    mentorNote: 'Legacy-Systeme ohne Backup sind tickende Zeitbomben. Diese ist explodiert.',
    choices: [
      {
        id: 'data_recovery',
        text: 'Professionelle Datenrettung versuchen',
        effects: { budget: -2000, stress: 20 },
        resultText: 'Du rufst eine Datenrettungsfirma an. 2.000 Euro und keine Garantie. Die Festplatte wird eingeschickt. Tagelange Ungewissheit.',
      },
      {
        id: 'rebuild_from_paper',
        text: 'Daten aus Papierunterlagen rekonstruieren',
        effects: { relationships: { fachabteilung: -15 }, stress: 25 },
        resultText: 'Die Fachabteilung muss drei Jahre Bescheide manuell nacherfassen. Sie sind nicht glücklich.',
      },
    ],
    tags: ['story', 'chain_consequence', 'crisis', 'data_loss'],
  },
];
