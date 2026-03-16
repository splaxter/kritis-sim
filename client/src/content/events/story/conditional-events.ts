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
    title: 'Microsoft-Pruefung',
    description: `Ein Brief von Microsoft Legal.

"Sehr geehrte Damen und Herren, im Rahmen unserer routinemaessigen Lizenzueberpruefungen haben wir Unregelmaessigkeiten in Ihrem Lizenzbestand festgestellt..."

Die 15 unlizenierten Office-Installationen. Du hast sie gefunden und... nichts gesagt.

{gf} steht mit dem Brief in der Tuer. "Erklaeren Sie mir das."`,
    involvedCharacters: ['gf', 'kaemmerer'],
    mentorNote: 'Versteckte Compliance-Probleme explodieren immer zum schlimmsten Zeitpunkt. Fruehe Transparenz ist billiger als spaete Krisen.',
    choices: [
      {
        id: 'come_clean',
        text: 'Reinen Tisch machen: Du wusstest davon',
        effects: { compliance: -15, relationships: { gf: -20, kaemmerer: -15 }, stress: 20 },
        resultText: '"Ich habe es gefunden und nicht gemeldet. Das war ein Fehler." Die {gf} ist wuetend. Der {kaemmerer} rechnet. Das wird teuer - und peinlich.',
        teachingMoment: 'Ehrlichkeit ist spaet immer noch besser als Luegen - aber frueh waere besser gewesen.',
      },
      {
        id: 'blame_predecessor',
        text: 'Auf den Vorgaenger schieben',
        effects: { compliance: -10, relationships: { gf: -10 }, stress: 15 },
        resultText: '"Das war schon so, als ich angefangen habe." Technisch wahr. Aber du hast es gesehen und nichts getan. Die {gf} ist nicht ueberzeugt.',
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
    description: `Beim Netzwerkscan taucht ein neues Geraet auf: Eine Synology NAS.

IP: 192.168.1.247. Nicht dokumentiert. Nicht genehmigt.

Du erinnerst dich: Herr Bauer aus der Abfallwirtschaft. Du hast ihm Admin-Rechte gegeben.

Er hat eine private NAS ans Firmennetz gehaengt. Mit Buergerdaten drauf.`,
    involvedCharacters: ['chef'],
    mentorNote: 'Shadow IT ist ein Symptom, keine Ursache. Die Ursache ist: Nutzer haben Beduerfnisse, die die offizielle IT nicht erfuellt. Loese das Problem, nicht nur das Symptom.',
    choices: [
      {
        id: 'remove_quietly',
        text: 'Geraet entfernen und mit Herrn Bauer reden',
        effects: { relationships: { fachabteilung: -10 }, compliance: 5, stress: 10 },
        resultText: 'Du gehst zu ihm. "Das muss weg. Sofort. Und wir sprechen nie wieder darueber." Er ist erschrocken, aber kooperativ. Die NAS verschwindet.',
        choiceTags: ['pragmatic'],
      },
      {
        id: 'formal_incident',
        text: 'Offiziellen Security-Incident melden',
        effects: { compliance: 15, relationships: { fachabteilung: -20, chef: 5 }, stress: 10 },
        resultText: 'Du meldest den Vorfall formal. Herr Bauer wird abgemahnt. Die Fachabteilung ist sauer - aber die Compliance ist gewahrt.',
        choiceTags: ['by_the_book'],
        teachingMoment: 'Manchmal muss man unpopulaer sein, um richtig zu handeln.',
      },
      {
        id: 'integrate_properly',
        text: 'NAS offiziell integrieren mit Sicherheitsregeln',
        effects: { compliance: 5, relationships: { fachabteilung: 5 }, stress: 15 },
        resultText: 'Du nimmst die NAS unter IT-Kontrolle: Backup, Zugriffskontrolle, Dokumentation. Herr Bauer ist happy - er wollte nur ein Problem loesen.',
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

Du hast im Budget-Gespraech auf Backup und Sophos gesetzt. Die Switches sollten "noch ein Jahr halten."

Sie haben nicht.

Jetzt sind 150 Arbeitsplaetze offline. Und das Ersatzgeraet? Lieferzeit 3 Wochen.`,
    involvedCharacters: ['chef', 'kaemmerer'],
    mentorNote: 'Infrastruktur-Schulden holen einen immer ein. Die Frage ist nur wann - und ob man einen Plan B hat.',
    choices: [
      {
        id: 'temporary_switch',
        text: 'Temporaeren Consumer-Switch aus dem Baumarkt',
        effects: { budget: -100, compliance: -10, stress: 15 },
        resultText: 'Du kaufst einen 80-Euro-Netgear. Nicht enterprise-tauglich, aber es laeuft. Fuer drei Wochen muss es reichen.',
        choiceTags: ['creative', 'risky'],
      },
      {
        id: 'partial_reconnect',
        text: 'Kritische Systeme direkt am Router anschliessen',
        effects: { stress: 20, skills: { netzwerk: 5 } },
        resultText: 'Du verkabelst alles um: Server direkt am Router, VLANs temporaer aufgeloest. Haesslich, aber funktional.',
        choiceTags: ['technical'],
      },
      {
        id: 'escalate_budget',
        text: 'Notfall-Budget-Freigabe bei {kaemmerer}',
        effects: { relationships: { kaemmerer: -10 }, budget: -3000 },
        resultText: '{kaemmerer} ist nicht happy, aber er sieht die Notlage. Express-Lieferung fuer 3.000 Euro. Der neue Switch ist in 3 Tagen da.',
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
    description: `Sophos meldet: Ransomware-Aktivitaet auf drei Rechnern.

Die Verschluesselung laeuft. Du hast die Rechner isoliert. Aber jetzt kommt die Frage:

"Wie aktuell ist unser Backup?"

Du erinnerst dich: Im Budget-Gespraech hast du auf Backup verzichtet.

Die Antwort ist: Es gibt kein zuverlaessiges Backup.`,
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
        text: 'Ehrlich sein: Wir haben kein vollstaendiges Backup',
        effects: { relationships: { gf: -25, chef: -15 }, compliance: -20, stress: 20 },
        resultText: 'Die {gf} wird blass. "KEIN Backup? Bei einem KRITIS-Betreiber?" Das Gespraech wird sehr unangenehm.',
        teachingMoment: 'Manche Fehler kann man nicht erklaeren. Nur aus ihnen lernen.',
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

Du liegst im Bett und ueberlegst: Du hast die Migration vorgeschlagen. Du bist jetzt verantwortlich.`,
    involvedCharacters: ['chef'],
    mentorNote: 'Single Point of Knowledge ist ein Risiko. Dokumentation und Wissenstransfer sind Teil jeder Migration.',
    choices: [
      {
        id: 'remote_help',
        text: 'Per Telefon anleiten - Schritt fuer Schritt',
        effects: { stress: 15, relationships: { chef: 5 } },
        resultText: 'Du leitest {kollege} durch die OPNsense-Oberflaeche. Eine Stunde spaeter laeuft das VPN. Du bist erschoepft, aber erleichtert.',
        choiceTags: ['dedicated'],
      },
      {
        id: 'refuse_sick',
        text: 'Nein - krank ist krank',
        effects: { stress: 5, relationships: { chef: -10 } },
        resultText: '"Ich bin nicht arbeitsfaehig. Ruft den Sophos-Support an - die haben Notfall-Nummern." {chef} ist nicht happy. Aber du hast recht.',
        choiceTags: ['boundary_setting'],
        teachingMoment: 'Grenzen setzen ist wichtig. Aber: Haettest du besser dokumentiert, gaebe es diese Situation nicht.',
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

{chef} erwaehnt: "Das BSI fragt bei KRITIS-Pruefungen nach dem Passwort-Reset-Prozess."

Ihr habt keinen dokumentierten Prozess. Nur: "Anrufen, zuruecksetzen."`,
    involvedCharacters: ['chef'],
    mentorNote: 'Identity Verification ist bei Passwort-Resets kritisch. Social Engineering nutzt genau diese Luecke.',
    choices: [
      {
        id: 'create_process',
        text: 'Jetzt einen sauberen Prozess erstellen',
        effects: { compliance: 10, stress: 8, skills: { security: 5 } },
        resultText: 'Du schreibst den Prozess: Rueckruf auf bekannte Nummer, temporaeres Passwort per separatem Kanal, Aenderungszwang. {chef} ist zufrieden.',
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

Du oeffnest den Schrank. Das Chaos, das du am ersten Tag gesehen hast. Undokumentiert. Unbeschriftet.

Du hast damals nur ein schnelles Foto gemacht. Jetzt musst du jeden einzelnen Port verfolgen.`,
    involvedCharacters: [],
    mentorNote: 'Technische Schulden verzinsen sich mit der Zeit.',
    choices: [
      {
        id: 'trace_now',
        text: 'Alles nachverfolgen - diesmal dokumentieren',
        effects: { stress: 20, compliance: 10, skills: { netzwerk: 8 } },
        resultText: 'Vier Stunden spaeter hast du das Problem gefunden: Ein loses Kabel. Und eine vollstaendige Dokumentation.',
        teachingMoment: 'Jede Krise ist eine Chance zur Verbesserung.',
      },
      {
        id: 'random_check',
        text: 'Systematisch jeden Port pruefen bis es geht',
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

Du hast beim letzten Mal "Erstmal analysieren" gewaehlt. Es war KEIN SFirm False Positive. Es war echter Malware.

Der PC hat drei Tage lang Daten nach aussen gesendet.`,
    involvedCharacters: ['chef'],
    mentorNote: 'Im Zweifel: Isolieren. Die Kosten eines Fehlalarms sind geringer als die einer echten Kompromittierung.',
    choices: [
      {
        id: 'full_incident',
        text: 'Vollstaendigen Incident-Response starten',
        effects: { compliance: 10, stress: 25, skills: { security: 10 } },
        resultText: 'Du isolierst, analysierst, meldest ans BSI. Der Schaden ist begrenzt - zum Glueck war es nur ein Buchhaltungs-PC ohne kritische Daten.',
        setsFlags: ['incident_handled'],
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

{kaemmerer} ruft an: "Ich kann keine Ueberweisungen mehr machen! Was haben Sie getan?!"

Die Weihnachtsfeier-Mail hat weitreichende Folgen.`,
    involvedCharacters: ['kaemmerer'],
    mentorNote: 'Blanket Policies haben Kollateralschaeden. Besser: Gezieltes Whitelisting fuer bekannte Anwendungen.',
    choices: [
      {
        id: 'create_whitelist',
        text: 'SFirm-Ausnahme erstellen mit Dokumentation',
        effects: { relationships: { kaemmerer: 5 }, compliance: 5, stress: 10 },
        resultText: 'Du erstellst eine gezielte Ausnahme fuer den SFirm-Pfad. Dokumentiert, begruendet, sicher.',
      },
      {
        id: 'rollback_policy',
        text: 'Makro-Richtlinie zurueckrollen',
        effects: { relationships: { kaemmerer: 3 }, compliance: -5 },
        resultText: 'Du nimmst die Richtlinie zurueck. Problem geloest - aber auch die Sicherheitsverbesserung ist weg.',
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

Natuerlich nicht - du hast das ganze SFirm-Verzeichnis ausgenommen.

Nur: Jetzt liegt dort auch eine neue .exe Datei. Die war vorher nicht da.

Und sie kommuniziert mit einer IP in Russland.`,
    involvedCharacters: ['chef'],
    mentorNote: 'Breite Ausnahmen sind gefaehrlich. Immer so spezifisch wie moeglich.',
    choices: [
      {
        id: 'investigate_immediately',
        text: 'Sofort untersuchen und ggf. isolieren',
        effects: { compliance: 10, stress: 20, skills: { security: 10 } },
        resultText: 'Die Datei ist Malware. Sie hat die Sophos-Ausnahme ausgenutzt. Du isolierst den PC und startest eine Untersuchung.',
        setsFlags: ['exclusion_malware_found'],
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
    description: `Der BSI-Pruefer schaut sich die VPN-Logs an.

"Hier steht, dass 'chef_admin' am 15. Oktober von zwei verschiedenen IP-Adressen gleichzeitig eingeloggt war. Wie ist das moeglich?"

Du erinnerst dich: Das war, als der externe Dienstleister die Zugangsdaten vom {chef} benutzt hat.`,
    involvedCharacters: ['chef', 'gf'],
    mentorNote: 'Geteilte Credentials werden bei Audits IMMER entdeckt. Die Frage ist nur: Wie peinlich wird es?',
    choices: [
      {
        id: 'admit_error',
        text: 'Ehrlich erklaeren was passiert ist',
        effects: { compliance: -15, relationships: { gf: -10, chef: -5 }, stress: 15 },
        resultText: 'Du erklaerst die Situation. Der Pruefer notiert es als "schwerwiegenden Verstoss gegen das Zugangsmanagement." Die {gf} schaut streng.',
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
    description: `Der Windows Server 2012 R2 mit der Access-Datenbank ist abgestuerzt.

Festplattenausfall. Keine Snapshots. Kein Backup.

Die Abfallgebuerenberechnung funktioniert nicht mehr. Drei Jahre Daten.

{chef} steht in der Tuer: "Du hast doch einen Plan, oder?"`,
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
        resultText: 'Die Fachabteilung muss drei Jahre Bescheide manuell nacherfassen. Sie sind nicht gluecklich.',
      },
    ],
    tags: ['story', 'chain_consequence', 'crisis', 'data_loss'],
  },
];
