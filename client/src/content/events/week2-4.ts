import { GameEvent } from '@kritis/shared';

export const week2to4Events: GameEvent[] = [
  // ============================================
  // WEEK 2 EVENTS
  // ============================================

  // Week 2, Event 1: USB Stick Security Incident
  {
    id: 'evt_usb_stick_parking',
    weekRange: [2, 2],
    dayPreference: [1, 2],
    probability: 0.95,
    category: 'security',
    title: 'Fund auf dem Parkplatz',
    description: `Beim Reinkommen findest du einen USB-Stick auf dem Parkplatz. Ein Kollege aus der Buchhaltung sieht ihn auch.

"Oh, den hat bestimmt jemand verloren! Steck den mal ein, vielleicht finden wir raus, wem der gehoert."

Der Stick ist ein schwarzer No-Name USB-Stick ohne Beschriftung.

Wie reagierst du?`,
    involvedCharacters: ['kollege'],
    choices: [
      {
        id: 'plug_in',
        text: 'Den Stick an deinen Rechner anschliessen',
        effects: {
          stress: 30,
          skills: { security: -5 },
          relationships: { chef: -20 },
        },
        resultText:
          'Du steckst den Stick ein. Dein Virenscanner schlaegt sofort Alarm - der Stick enthaelt Malware! {chef} ist nicht begeistert: "Das ist IT-Security 101. Niemals fremde USB-Sticks einstecken!"',
        teachingMoment:
          'USB-Sticks koennen Malware enthalten und sind ein klassischer Social-Engineering-Vektor. Niemals unbekannte Sticks an Produktivsysteme anschliessen.',
        setsFlags: ['usb_malware_incident'],
      },
      {
        id: 'sandbox_test',
        text: 'Den Stick in einer isolierten VM analysieren',
        requires: { skill: 'security', threshold: 35 },
        effects: {
          skills: { security: 10, linux: 5 },
          relationships: { chef: 15 },
          stress: 5,
        },
        resultText:
          'Du startest eine isolierte Linux-VM und analysierst den Stick. Er enthaelt tatsaechlich einen Rubber Ducky Payload! Du dokumentierst den Fund und meldest ihn als Sicherheitsvorfall.',
        teachingMoment:
          'USB-Sticks immer in isolierten Umgebungen analysieren. Der "Rubber Ducky" ist ein bekanntes USB-Angriffsgeraet.',
        setsFlags: ['usb_analyzed_properly'],
        unlocks: ['mount', 'lsusb'],
      },
      {
        id: 'report_it',
        text: 'Den Stick NICHT einstecken und dem Chef melden',
        effects: {
          skills: { security: 5 },
          relationships: { chef: 10 },
        },
        resultText:
          '{chef} nickt anerkennend. "Richtig gemacht. Das koennte ein gezielter Angriff sein. Ich schicke das zur Analyse an unseren Security-Partner."',
        teachingMoment:
          'Bei verdaechtigen Funden: Nicht selbst testen, sondern melden. Das ist Teil des Incident-Response-Prozesses.',
      },
      {
        id: 'ignore_it',
        text: 'Den Stick liegen lassen, ist nicht dein Problem',
        effects: {
          stress: -5,
          relationships: { chef: -5 },
        },
        resultText:
          'Du laesst den Stick liegen. Spaeter erfaehrst du, dass ein anderer Mitarbeiter ihn eingesteckt hat. Der Rechner musste neu aufgesetzt werden.',
      },
    ],
    tags: ['security', 'incident', 'usb', 'social-engineering'],
  },

  // Week 2, Event 2: Server Room Cable Chaos
  {
    id: 'evt_cable_chaos',
    weekRange: [2, 2],
    dayPreference: [2, 3],
    probability: 0.9,
    category: 'support',
    title: 'Kabelchaos im Serverraum',
    description: `Du oeffnest die Tuer zum Serverraum. Vor dir: Ein Alptraum aus Kabeln.

Netzwerkkabel haengen kreuz und quer, nichts ist beschriftet, und mittendrin ein Switch mit blinkenden LEDs - manche blinken ROT.

{kollege} steht daneben: "Ja, das ist... historisch gewachsen. Der Vorgaenger hatte ein eigenes System. Leider hat er es nicht dokumentiert."

Einer der VLANs fuer die Wasserwerke scheint Probleme zu haben.

Was tust du?`,
    involvedCharacters: ['kollege'],
    choices: [
      {
        id: 'trace_cables',
        text: 'Systematisch jedes Kabel verfolgen und dokumentieren',
        effects: {
          skills: { netzwerk: 8, troubleshooting: 5 },
          stress: 15,
          relationships: { kollegen: 5 },
        },
        resultText:
          'Vier Stunden spaeter hast du ein Diagramm aller Verbindungen. Du findest das Problem: Ein Patchkabel steckt im falschen Port. Nach dem Umstecken laeuft alles.',
        teachingMoment:
          'Netzwerkdokumentation ist Gold wert. Nimm dir Zeit, sie zu erstellen und zu pflegen.',
        unlocks: ['show mac address-table'],
      },
      {
        id: 'use_network_tools',
        text: 'Mit Netzwerk-Tools die Topologie analysieren',
        requires: { skill: 'netzwerk', threshold: 40 },
        effects: {
          skills: { netzwerk: 10, troubleshooting: 8 },
          stress: 5,
          relationships: { chef: 10, kollegen: 10 },
        },
        resultText:
          'Du nutzt LLDP und den Switch-Management-Zugang, um die Topologie zu verstehen. Problem gefunden: Ein Loop durch ein doppelt gestecktes Kabel. Spanning Tree hat gegriffen, aber ein VLAN war blockiert.',
        teachingMoment:
          'LLDP (Link Layer Discovery Protocol) hilft bei der Netzwerk-Topologie-Erkennung. Switch-Logs sind dein Freund.',
        terminalCommand: true,
        unlocks: ['lldpctl', 'show spanning-tree'],
      },
      {
        id: 'ask_predecessor',
        text: 'Versuchen, den Vorgaenger zu kontaktieren',
        effects: {
          stress: 10,
          relationships: { kollegen: -5 },
        },
        resultText:
          '{kollege} schuettelt den Kopf. "Der redet nicht mehr mit uns. Nach dem Streit mit dem Chef..." Du musst das Problem selbst loesen.',
      },
      {
        id: 'emergency_restart',
        text: 'Den Switch neustarten',
        effects: {
          stress: 25,
          skills: { netzwerk: -3 },
          relationships: { fachabteilung: -15 },
        },
        resultText:
          'Der Neustart unterbricht kurz ALLE Verbindungen. Die Leitstelle meldet sich veraeargert - fuer 30 Sekunden war die Wasserversorgung ohne Monitoring. Das darf bei KRITIS nicht passieren!',
        teachingMoment:
          'Bei kritischer Infrastruktur: Niemals ungeplant neustarten. Jede Aenderung muss durchdacht sein.',
        setsFlags: ['unplanned_restart'],
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'switch-mgmt',
      username: 'admin',
      currentPath: '~$',
      commands: [
        {
          pattern: 'lldpctl',
          output: `-------------------------------------------------------------------------------
LLDP neighbors:
-------------------------------------------------------------------------------
Interface:    eth0, via: LLDP
  Chassis:
    ChassisID:    mac 00:1a:2b:3c:4d:5e
    SysName:      CORE-SWITCH-01
    SysDescr:     HP ProCurve 2920-24G
  Port:
    PortID:       24
    PortDescr:    VLAN-KRITIS-WATER`,
          teachesCommand: 'lldpctl',
          skillGain: { netzwerk: 3 },
        },
        {
          pattern: 'show spanning-tree',
          output: `VLAN0010
  Spanning tree enabled protocol rstp
  Root ID    Priority    32778
             Address     001a.2b3c.4d5e

  Interface        Role Sts Cost      Prio.Nbr Type
  ---------------- ---- --- --------- -------- ----
  Gi0/1            Root FWD 4         128.1    P2p
  Gi0/5            Altn BLK 4         128.5    P2p  << BLOCKED`,
          teachesCommand: 'show spanning-tree',
          skillGain: { netzwerk: 5 },
          isPartialSolution: true,
        },
        {
          pattern: 'show mac address-table',
          output: `Mac Address Table
-------------------------------------------
Vlan    Mac Address       Type        Ports
----    -----------       --------    -----
10      001a.2b3c.4d5e    DYNAMIC     Gi0/1
10      001a.2b3c.4d5f    DYNAMIC     Gi0/5  << Duplicate!
10      001a.2b3c.4d5f    DYNAMIC     Gi0/8  << Duplicate!`,
          skillGain: { netzwerk: 5 },
          isSolution: true,
        },
      ],
      solutions: [
        {
          commands: ['show mac address-table', 'show spanning-tree'],
          allRequired: false,
          resultText:
            'Du findest das Problem: Ein MAC erscheint auf zwei Ports - ein Loop! Du entfernst das doppelte Kabel.',
          skillGain: { netzwerk: 10, troubleshooting: 5 },
          effects: { relationships: { kollegen: 10 }, stress: -5 },
        },
      ],
      hints: [
        'Tipp: LLDP kann dir zeigen, was wo angeschlossen ist.',
        'Tipp: Bei blinkenden roten LEDs koennte Spanning Tree einen Loop blockieren.',
        'Tipp: Die MAC-Adress-Tabelle zeigt, wo welche Geraete haengen.',
      ],
    },
    tags: ['network', 'troubleshooting', 'documentation', 'terminal'],
  },

  // Week 2, Event 3: License Audit Announcement
  {
    id: 'evt_license_audit',
    weekRange: [2, 2],
    dayPreference: [3, 4],
    probability: 0.85,
    category: 'compliance',
    title: 'Microsoft meldet sich',
    description: `Eine E-Mail von Microsoft:

"Sehr geehrte Damen und Herren,

im Rahmen unserer regelmaessigen Ueberpruefungen moechten wir Sie auf eine bevorstehende Lizenzpruefung hinweisen. Bitte halten Sie folgende Dokumentation bereit:
- Alle Windows Server Lizenzen
- Office 365 / Microsoft 365 Lizenzen
- SQL Server Lizenzen
- CALs (Client Access Licenses)

Pruefungstermin: In 4 Wochen"

{chef} schaut dich an: "Das wird spannend. Weisst du, wo unsere Lizenzdokumentation ist?"`,
    involvedCharacters: ['chef', 'kaemmerer'],
    choices: [
      {
        id: 'check_documentation',
        text: '"Ich schaue in unserem Asset-Management nach."',
        effects: {
          skills: { troubleshooting: 3 },
          stress: 10,
        },
        resultText:
          'Du oeffnest das Asset-Management-System. Die letzte Aktualisierung war... vor 3 Jahren. Die Haelfte der Eintraege stimmt nicht mehr.',
        triggersEvent: 'evt_license_cleanup',
      },
      {
        id: 'powershell_audit',
        text: 'Eine automatische Inventarisierung mit PowerShell starten',
        requires: { skill: 'windows', threshold: 40 },
        effects: {
          skills: { windows: 8, troubleshooting: 5 },
          stress: 5,
          relationships: { chef: 10 },
        },
        resultText:
          'Du schreibst ein PowerShell-Skript, das alle installierten Microsoft-Produkte inventarisiert. In 2 Stunden hast du eine vollstaendige Liste.',
        teachingMoment:
          'Get-WmiObject -Class Win32_Product oder Get-CimInstance koennen installierte Software auflisten.',
        unlocks: ['Get-WmiObject', 'Get-CimInstance'],
      },
      {
        id: 'panic',
        text: '"Lizenz... Dokumentation?"',
        effects: {
          stress: 20,
          relationships: { chef: -10 },
        },
        resultText:
          '{chef} seufzt. "Okay, das wird ein laengeres Projekt. Fang schon mal an zu suchen."',
      },
      {
        id: 'call_kaemmerer',
        text: 'Den Kaemmerer kontaktieren - er muesste die Rechnungen haben',
        effects: {
          relationships: { kaemmerer: 5 },
          stress: 5,
        },
        resultText:
          '{kaemmerer} schickt dir einen Stapel PDFs. "Hier sind alle Rechnungen seit 2019. Viel Spass beim Sortieren." Immerhin ein Anfang.',
        setsFlags: ['kaemmerer_license_docs'],
      },
    ],
    tags: ['compliance', 'licensing', 'microsoft', 'audit'],
  },

  // Week 2, Event 4: Backup Failure Alert
  {
    id: 'evt_backup_failure',
    weekRange: [2, 2],
    dayPreference: [4, 5],
    probability: 0.95,
    category: 'support',
    title: 'Backup fehlgeschlagen',
    description: `Um 6:47 Uhr kam eine automatische E-Mail:

"ALERT: Backup Job 'DAILY_FULL_BACKUP' failed
Error: Insufficient disk space on backup target
Affected systems: 3 of 12 systems not backed up"

Das ist das erste Mal, dass du dich mit dem Backup-System beschaeftigst.

{kollege} meint: "Das passiert manchmal. Aber bei KRITIS sollten wir das schnell fixen."`,
    involvedCharacters: ['kollege'],
    choices: [
      {
        id: 'investigate_storage',
        text: 'Den Backup-Storage analysieren',
        effects: {
          skills: { linux: 5, troubleshooting: 5 },
          stress: 10,
        },
        resultText:
          'Du schaust dir den Storage an: 98% belegt. Alte Backups werden nicht automatisch geloescht. Du findest Backups von Servern, die seit 2 Jahren nicht mehr existieren.',
        teachingMoment:
          'Backup-Retention-Policies sind wichtig. Ohne automatische Bereinigung laufen Storages voll.',
        terminalCommand: true,
        unlocks: ['df', 'du'],
      },
      {
        id: 'quick_delete',
        text: 'Schnell etwas Platz schaffen - aelteste Backups loeschen',
        effects: {
          stress: 5,
          skills: { linux: 2 },
        },
        resultText:
          'Du loeschst die aeltesten Backups. Das Nacht-Backup laeuft durch. Aber das Problem wird wiederkommen...',
        teachingMoment:
          'Symptombekaempfung ist keine Loesung. Das Grundproblem muss adressiert werden.',
      },
      {
        id: 'new_storage_request',
        text: 'Sofort neuen Storage beim Kaemmerer beantragen',
        effects: {
          relationships: { kaemmerer: -10 },
          stress: 15,
        },
        resultText:
          '{kaemmerer} antwortet: "Neuer Storage? Haben Sie geprueft, ob der alte optimal genutzt wird?" Er hat einen Punkt.',
      },
      {
        id: 'comprehensive_review',
        text: 'Eine vollstaendige Backup-Strategie-Review durchfuehren',
        requires: { skill: 'troubleshooting', threshold: 35 },
        effects: {
          skills: { troubleshooting: 8, linux: 5 },
          stress: 15,
          relationships: { chef: 15 },
          compliance: 5,
        },
        resultText:
          'Du analysierst die gesamte Backup-Strategie: Retention-Policies fehlen, manche Systeme haben kein Backup, andere werden doppelt gesichert. Du erstellst einen Verbesserungsplan.',
        teachingMoment:
          'Eine 3-2-1 Backup-Strategie: 3 Kopien, 2 verschiedene Medien, 1 offsite. Plus regelmaessige Restore-Tests!',
        setsFlags: ['backup_review_done'],
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'backup-srv',
      username: 'admin',
      currentPath: '/backup$',
      commands: [
        {
          pattern: 'df -h',
          output: `Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        50G   12G   38G  24% /
/dev/sdb1       2.0T  1.9T   50G  98% /backup  << KRITISCH!`,
          teachesCommand: 'df',
          skillGain: { linux: 2 },
        },
        {
          pattern: 'du -sh',
          patternRegex: 'du\\s+-sh\\s*\\*?',
          output: `450G    daily/
1.2T    archive/
280G    vms/
52G     old_servers/  << Server existieren nicht mehr!`,
          teachesCommand: 'du',
          skillGain: { linux: 3 },
          isPartialSolution: true,
        },
        {
          pattern: 'ls -la old_servers',
          output: `drwxr-xr-x 2 root root 4096 Mar 15 2024 srv-mail-old/
drwxr-xr-x 2 root root 4096 Jun 22 2023 srv-web-deprecated/
drwxr-xr-x 2 root root 4096 Jan 10 2023 srv-test-2023/`,
          skillGain: { linux: 2 },
        },
        {
          pattern: 'rm -rf old_servers',
          output: 'Verzeichnis geloescht. 52GB freigegeben.',
          skillGain: { linux: 2 },
          isSolution: true,
        },
      ],
      solutions: [
        {
          commands: ['df -h', 'du -sh', 'rm -rf'],
          allRequired: false,
          resultText:
            'Du hast den Speicherplatz analysiert und alte, nicht mehr benoetigte Backups entfernt.',
          skillGain: { linux: 5, troubleshooting: 5 },
          effects: { stress: -5 },
        },
      ],
      hints: [
        'Tipp: df zeigt den freien Speicherplatz an.',
        'Tipp: du zeigt an, welche Verzeichnisse wie viel Platz belegen.',
        'Tipp: Gibt es vielleicht alte Backups von Systemen, die nicht mehr existieren?',
      ],
    },
    tags: ['backup', 'storage', 'linux', 'terminal', 'critical'],
  },

  // Week 2, Event 5: First Phishing Attempt
  {
    id: 'evt_phishing_training',
    weekRange: [2, 3],
    probability: 0.8,
    category: 'security',
    title: 'Verdaechtige E-Mail',
    description: `Eine Mitarbeiterin aus der Personalabteilung ruft an:

"Ich hab da eine E-Mail bekommen... die sieht irgendwie komisch aus. Angeblich von Microsoft, mein Passwort laeuft ab und ich soll es aktualisieren."

Sie liest dir die Absenderadresse vor: "microsoft-security@ms-365-update.com"

Was raetst du ihr?`,
    involvedCharacters: [],
    choices: [
      {
        id: 'analyze_together',
        text: 'Die E-Mail gemeinsam analysieren und erklaeren, worauf sie achten soll',
        effects: {
          skills: { security: 5, softSkills: 8 },
          relationships: { fachabteilung: 15 },
          stress: 5,
        },
        resultText:
          'Du gehst mit ihr die Warnsignale durch: Falsche Domain, Druck zur Eile, generische Anrede. Sie versteht und wird kuenftig vorsichtiger sein.',
        teachingMoment:
          'Phishing erkennen: Absenderdomain pruefen, nicht auf Links klicken, Dringlichkeit hinterfragen. Schulung ist wichtiger als Technik.',
        setsFlags: ['phishing_training_done'],
      },
      {
        id: 'just_delete',
        text: '"Loeschen Sie die Mail einfach, das ist Phishing."',
        effects: {
          relationships: { fachabteilung: -5 },
          stress: -5,
        },
        resultText:
          'Sie loescht die Mail, aber versteht nicht warum. Naechste Woche faellt sie auf einen aehnlichen Versuch herein.',
      },
      {
        id: 'forward_for_analysis',
        text: 'Die Mail an dich weiterleiten lassen fuer eine technische Analyse',
        effects: {
          skills: { security: 8 },
          stress: 10,
        },
        resultText:
          'Du analysierst die Header - die Mail kam aus Russland, der Link fuehrt zu einer gefaelschten Login-Seite. Du meldest es als Sicherheitsvorfall.',
        teachingMoment:
          'E-Mail-Header zeigen den tatsaechlichen Absender. Die "From"-Zeile kann leicht gefaelscht werden.',
        unlocks: ['View Message Headers'],
      },
      {
        id: 'block_domain',
        text: 'Die Absenderdomain sofort auf die Blocklist setzen',
        effects: {
          skills: { security: 3 },
          stress: 5,
        },
        resultText:
          'Du blockst die Domain. Gut, aber Phisher nutzen staendig neue Domains. Eine langfristige Loesung sieht anders aus.',
      },
    ],
    tags: ['security', 'phishing', 'training', 'email'],
  },

  // ============================================
  // WEEK 3 EVENTS
  // ============================================

  // Week 3, Event 1: Chef Delegates Important Task
  {
    id: 'evt_chef_delegation',
    weekRange: [3, 3],
    dayPreference: [1, 2],
    probability: 0.95,
    category: 'personal',
    title: 'Verantwortung',
    description: `{chef} ruft dich in sein Buero.

"Du hast dich gut eingelebt. Zeit fuer mehr Verantwortung. Naechste Woche ist die BSI-Pruefung zur KRITIS-Compliance. Ich brauche jemanden, der die technische Dokumentation vorbereitet."

Er schiebt dir einen Ordner zu: "Das ist die Checkliste. Netzwerk-Segmentierung, Zugriffskontrollen, Logging, Incident Response. Alles muss dokumentiert und nachweisbar sein."

Wie reagierst du?`,
    involvedCharacters: ['chef'],
    choices: [
      {
        id: 'accept_confident',
        text: '"Kein Problem, das bekomme ich hin."',
        effects: {
          relationships: { chef: 10 },
          stress: 20,
          compliance: 5,
        },
        resultText:
          '{chef} nickt zufrieden. "Gut. Bei Fragen komm zu mir." Du schaust auf die Checkliste - 47 Punkte. Das wird eine lange Woche.',
        setsFlags: ['bsi_prep_assigned'],
      },
      {
        id: 'accept_questions',
        text: '"Gerne. Kann ich ein paar Fragen zur Priorisierung stellen?"',
        effects: {
          relationships: { chef: 15 },
          stress: 15,
          skills: { softSkills: 5 },
          compliance: 5,
        },
        resultText:
          '{chef} laechelt. "Genau die richtige Einstellung." Er geht mit dir die kritischen Punkte durch. Du hast jetzt einen klaren Plan.',
        teachingMoment:
          'Fragen zu stellen zeigt Engagement, nicht Schwaeche. Klarheit verhindert Fehler.',
        setsFlags: ['bsi_prep_assigned', 'bsi_prep_briefed'],
      },
      {
        id: 'decline_politely',
        text: '"Ich bin noch neu, vielleicht sollte das jemand mit mehr Erfahrung machen?"',
        effects: {
          relationships: { chef: -15 },
          stress: 5,
        },
        resultText:
          '{chef} runzelt die Stirn. "Ich dachte, du willst lernen? So eine Chance kommt nicht oft." Er gibt die Aufgabe an {kollege} weiter.',
      },
      {
        id: 'ask_for_support',
        text: '"Kann ich das zusammen mit {kollege} machen, um von seiner Erfahrung zu lernen?"',
        effects: {
          relationships: { chef: 5, kollegen: 10 },
          stress: 10,
          skills: { softSkills: 3 },
          compliance: 5,
        },
        resultText:
          '{chef} ueberlegt kurz. "Gute Idee. Teamwork ist wichtig. Aber du fuehrst das Projekt."',
        setsFlags: ['bsi_prep_assigned', 'bsi_prep_team'],
      },
    ],
    tags: ['career', 'responsibility', 'bsi', 'compliance'],
  },

  // Week 3, Event 2: BSI Compliance Check
  {
    id: 'evt_bsi_precheck',
    weekRange: [3, 3],
    dayPreference: [3, 4],
    probability: 0.9,
    requires: {
      flags: ['bsi_prep_assigned'],
    },
    category: 'compliance',
    title: 'BSI-Checkliste: Netzwerk-Segmentierung',
    description: `Du arbeitest die BSI-Checkliste ab. Punkt 12: Netzwerk-Segmentierung.

"Sind alle kritischen Systeme in separaten VLANs isoliert?"

Du pruefst die Firewall-Regeln und Netzwerkplaene. Dabei faellt dir auf: Die Steuerungssysteme fuer die Wasseraufbereitung sind im SELBEN VLAN wie die Buero-PCs.

Das ist ein schwerwiegender Compliance-Verstoss.

Wie gehst du vor?`,
    involvedCharacters: ['chef', 'kaemmerer'],
    choices: [
      {
        id: 'document_fix_plan',
        text: 'Das Problem dokumentieren und einen Massnahmenplan erstellen',
        effects: {
          skills: { netzwerk: 5, security: 5 },
          compliance: 10,
          stress: 10,
          relationships: { chef: 10 },
        },
        resultText:
          'Du dokumentierst den Ist-Zustand und erstellst einen Plan zur VLAN-Trennung. {chef} ist beeindruckt von deiner Gruendlichkeit.',
        teachingMoment:
          'Bei Compliance-Pruefungen: Ehrlich dokumentieren, Massnahmen vorschlagen. Das BSI will Verbesserung sehen, nicht Perfektion.',
        setsFlags: ['vlan_fix_planned'],
      },
      {
        id: 'emergency_fix',
        text: 'Sofort die VLAN-Trennung durchfuehren',
        requires: { skill: 'netzwerk', threshold: 45 },
        effects: {
          skills: { netzwerk: 10, security: 8 },
          stress: 25,
          compliance: 15,
          relationships: { fachabteilung: -10 },
        },
        resultText:
          'Du trennst die Netzwerke. Es gibt kurze Ausfaelle in der Produktion, aber die Segmentierung ist jetzt korrekt. Die Fachabteilung ist nicht begeistert von der Unterbrechung.',
        teachingMoment:
          'Aenderungen an kritischen Systemen immer mit Change Management. Notfall-Aenderungen nur bei akuter Gefahr.',
      },
      {
        id: 'hide_problem',
        text: 'Das Problem in der Dokumentation "kreativ" darstellen',
        effects: {
          compliance: -20,
          relationships: { chef: -20 },
          stress: 15,
        },
        resultText:
          'Der BSI-Pruefer bemerkt die Diskrepanz zwischen Dokumentation und Realitaet sofort. Das macht alles nur schlimmer.',
        teachingMoment:
          'Niemals Compliance-Dokumente faelschen. Das fuehrt zu Vertrauensverlust und kann rechtliche Konsequenzen haben.',
      },
      {
        id: 'escalate_to_chef',
        text: 'Das Problem sofort an {chef} eskalieren',
        effects: {
          relationships: { chef: 5 },
          stress: 10,
          skills: { softSkills: 3 },
        },
        resultText:
          '{chef} seufzt. "Das wusste ich. Aber das Budget fuer die Netzwerk-Modernisierung wurde letztes Jahr gestrichen. Wir muessen das jetzt dem {kaemmerer} beibringen."',
        setsFlags: ['vlan_budget_needed'],
      },
    ],
    tags: ['bsi', 'compliance', 'network', 'security', 'kritis'],
  },

  // Week 3, Event 3: Colleague Conflict
  {
    id: 'evt_colleague_conflict',
    weekRange: [3, 3],
    dayPreference: [2, 3, 4],
    probability: 0.85,
    category: 'team',
    title: 'Spannungen im Team',
    description: `{kollege} kommt aufgeloest zu dir.

"Hast du gehort, was {chef} gesagt hat? Ich soll meine Dokumentation 'verbessern'? ICH dokumentiere hier seit 5 Jahren alles! Und dann kommt der Neue und ploetzlich ist alles falsch?"

Er scheint dich als Verbuendeten zu sehen - oder vielleicht als Teil des Problems?

"Sag mal ehrlich: Hat {chef} mit dir ueber mich geredet?"`,
    involvedCharacters: ['kollege', 'chef'],
    choices: [
      {
        id: 'stay_neutral',
        text: '"Ich moechte mich da raushalten. Das ist zwischen euch."',
        effects: {
          relationships: { kollegen: -10 },
          stress: 10,
        },
        resultText:
          '{kollege} schaut enttaeuscht. "Ach so, so laeuft das also." Die Stimmung ist angespannt.',
      },
      {
        id: 'listen_empathize',
        text: 'Zuhoeren und verstehen, ohne Partei zu ergreifen',
        effects: {
          skills: { softSkills: 8 },
          relationships: { kollegen: 10 },
          stress: 5,
        },
        resultText:
          'Du laesst ihn reden. Nach 10 Minuten hat er sich beruhigt. "Danke fuers Zuhoeren. Manchmal muss man einfach Dampf ablassen."',
        teachingMoment:
          'Aktives Zuhoeren loest oft mehr als Ratschlaege. Manchmal brauchen Menschen nur ein offenes Ohr.',
      },
      {
        id: 'side_with_kollege',
        text: '"Ja, die neue Leitung hat manchmal unrealistische Erwartungen."',
        effects: {
          relationships: { kollegen: 15, chef: -15 },
          stress: 10,
        },
        resultText:
          '{kollege} freut sich ueber die Solidaritaet. Aber irgendwie fuehlt es sich falsch an, und du weisst, dass {chef} durchaus einen Punkt hatte.',
      },
      {
        id: 'suggest_talk',
        text: '"Habt ihr mal direkt darueber gesprochen? Vielleicht gibt es ein Missverstaendnis."',
        effects: {
          skills: { softSkills: 5 },
          relationships: { kollegen: 5, chef: 5 },
          stress: 5,
        },
        resultText:
          '{kollege} ueberlegt. "Vielleicht hast du recht. Ich war vorhin auch ziemlich aufgebracht..."',
        teachingMoment:
          'Direkte Kommunikation loest oft Konflikte, die durch Annahmen entstanden sind.',
      },
    ],
    tags: ['team', 'conflict', 'communication', 'softskills'],
  },

  // Week 3, Event 4: Server Disk Space Warning
  {
    id: 'evt_disk_space_warning',
    weekRange: [3, 4],
    probability: 0.9,
    category: 'support',
    title: 'Festplatte voll',
    description: `Das Monitoring schlaegt Alarm:

"WARNING: Server 'SRV-DB-01' disk space critical
Drive C: 95% used (4.7GB free of 100GB)"

Das ist der Datenbankserver fuer die Abrechnungssoftware.

{kollege}: "Der ist schon wieder voll? Letzte Woche hab ich da noch 20GB freigemacht..."`,
    involvedCharacters: ['kollege'],
    choices: [
      {
        id: 'investigate_growth',
        text: 'Untersuchen, was so viel Platz verbraucht',
        effects: {
          skills: { windows: 5, troubleshooting: 8 },
          stress: 10,
        },
        resultText:
          'Du findest das Problem: Die Datenbank-Logs werden nicht rotiert. 47GB an Transaktionslogs aus den letzten 3 Monaten.',
        teachingMoment:
          'Log-Rotation ist essentiell. Ohne Begrenzung wachsen Logs unbegrenzt.',
        terminalCommand: true,
        unlocks: ['Get-ChildItem -Recurse'],
        setsFlags: ['db_logs_found'],
      },
      {
        id: 'temp_cleanup',
        text: 'Temp-Dateien und alte Logs loeschen',
        effects: {
          stress: 5,
          skills: { windows: 2 },
        },
        resultText:
          'Du loeschst Temp-Dateien und alte Windows-Updates. 8GB gewonnen. Aber das reicht nur fuer eine Woche...',
      },
      {
        id: 'expand_disk',
        text: 'Die virtuelle Festplatte vergroessern',
        requires: { skill: 'windows', threshold: 35 },
        effects: {
          skills: { windows: 5 },
          stress: 5,
        },
        resultText:
          'Du erweiterst die VM-Disk um 50GB. Das Problem ist geloest - bis die Logs den neuen Platz auch fuellen.',
        teachingMoment:
          'Kapazitaet erhoehen loest das Problem kurzfristig, aber nicht die Ursache.',
      },
      {
        id: 'alert_dba',
        text: 'Den Datenbank-Administrator informieren',
        effects: {
          relationships: { kollegen: 5 },
          stress: 5,
        },
        resultText:
          '{kollege} prueft die DB-Einstellungen. "Transaction Log Backup wurde nie eingerichtet. Das ist ein Fehler aus der Erstinstallation."',
        teachingMoment:
          'SQL Server Transaction Logs muessen regelmaessig gesichert werden, damit sie truncated werden koennen.',
      },
    ],
    terminalContext: {
      type: 'windows',
      hostname: 'SRV-DB-01',
      username: 'admin',
      currentPath: 'C:\\>',
      commands: [
        {
          pattern: 'Get-ChildItem -Recurse',
          patternRegex: 'Get-ChildItem.*-Recurse',
          output: `Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
d----          03/14/2026    10:23                Program Files
d----          03/14/2026    10:23                Program Files (x86)
d----          03/14/2026    08:47                SQLData

    Verzeichnis: C:\\SQLData

-a---          03/14/2026    08:47    47834927104 tempdb.ldf
-a---          03/14/2026    08:47     5368709120 AbrechDB.mdf
-a---          03/14/2026    08:47    42949672960 AbrechDB_log.ldf  << 40GB!`,
          teachesCommand: 'Get-ChildItem -Recurse',
          skillGain: { windows: 5 },
          isSolution: true,
        },
        {
          pattern: 'Get-PSDrive',
          output: `Name Used (GB) Free (GB) Provider   Root
---- --------- --------- --------   ----
C        95.23      4.77 FileSystem C:\\`,
          skillGain: { windows: 2 },
        },
      ],
      solutions: [
        {
          commands: ['Get-ChildItem -Recurse'],
          allRequired: true,
          resultText:
            'Du hast die riesige Log-Datei gefunden. Das muss mit dem DBA besprochen werden.',
          skillGain: { windows: 5, troubleshooting: 5 },
          effects: { stress: -5 },
        },
      ],
      hints: [
        'Tipp: Get-ChildItem kann Dateien mit ihrer Groesse anzeigen.',
        'Tipp: Datenbank-Logs koennen sehr gross werden, wenn sie nicht richtig verwaltet werden.',
      ],
    },
    tags: ['windows', 'storage', 'database', 'terminal', 'monitoring'],
  },

  // Week 3, Event 5: Security Awareness Request
  {
    id: 'evt_security_awareness',
    weekRange: [3, 4],
    probability: 0.75,
    category: 'security',
    title: 'Schulungsbedarf',
    description: `{chef} ruft das Team zusammen:

"Nach dem Phishing-Vorfall letzte Woche habe ich mit der Geschaeftsfuehrung gesprochen. Sie wollen eine Security-Awareness-Schulung fuer alle 200 Mitarbeiter. Wer moechte das uebernehmen?"

{kollege} schaut demonstrativ aus dem Fenster.

Was sagst du?`,
    involvedCharacters: ['chef', 'kollege'],
    choices: [
      {
        id: 'volunteer',
        text: '"Ich kann das uebernehmen - ich hab da einige Ideen."',
        effects: {
          relationships: { chef: 15 },
          stress: 15,
          skills: { security: 5, softSkills: 5 },
        },
        resultText:
          '{chef} laechelt. "Sehr gut! Ich erwarte einen Vorschlag bis Ende der Woche." Du fragst dich, worauf du dich eingelassen hast.',
        setsFlags: ['security_training_assigned'],
      },
      {
        id: 'ask_scope',
        text: '"Wie viel Zeit und Budget haben wir dafuer?"',
        effects: {
          relationships: { chef: 10 },
          skills: { softSkills: 3 },
          stress: 5,
        },
        resultText:
          '{chef}: "Gute Frage. Budget: 2000 Euro. Zeit: Es sollte innerhalb von 6 Wochen passieren. Praesenz oder online ist euch ueberlassen."',
        teachingMoment:
          'Immer nach Rahmenbedinungen fragen, bevor man zusagt. Scope, Budget, Timeline.',
      },
      {
        id: 'suggest_external',
        text: '"Sollten wir das nicht von einem externen Anbieter machen lassen?"',
        effects: {
          relationships: { chef: 5, kaemmerer: 5 },
          stress: 5,
        },
        resultText:
          '{chef}: "Externe sind teuer. Aber wenn ihr das nicht schafft, muessen wir das pruefen." Er schaut fragend in die Runde.',
      },
      {
        id: 'stay_quiet',
        text: 'Schweigen und hoffen, dass jemand anderes sich meldet',
        effects: {
          stress: 10,
          relationships: { chef: -5 },
        },
        resultText:
          'Stille. {chef} seufzt. "Okay, ich teile das zu. {kollege}, du machst das." {kollege} schaut dich vorwurfsvoll an.',
      },
    ],
    tags: ['security', 'training', 'career', 'softskills'],
  },

  // ============================================
  // WEEK 4 EVENTS
  // ============================================

  // Week 4, Event 1: Budget Meeting with Kaemmerer
  {
    id: 'evt_budget_meeting',
    weekRange: [4, 4],
    dayPreference: [1, 2],
    probability: 0.95,
    category: 'budget',
    title: 'Haushaltsgespraeche',
    description: `Du wirst zu einem Meeting mit {kaemmerer} eingeladen. Thema: IT-Budget fuer das naechste Quartal.

{chef} bereitet dich vor: "Der Kaemmerer denkt, IT ist ein Kostenfaktor. Zeig ihm, dass wir Werte schaffen. Und - ganz wichtig - bleib ruhig, auch wenn er provoziert."

Im Meeting: {kaemmerer} schaut skeptisch auf deine Unterlagen.

"Also, Sie wollen 35.000 Euro fuer ein neues Firewall-System? Das alte funktioniert doch noch."`,
    involvedCharacters: ['chef', 'kaemmerer'],
    choices: [
      {
        id: 'business_case',
        text: 'Den Business Case erklaeren: Risiko vs. Investition',
        requires: { skill: 'softSkills', threshold: 35 },
        effects: {
          skills: { softSkills: 10 },
          relationships: { kaemmerer: 15, chef: 10 },
          budget: 25000,
        },
        resultText:
          'Du zeigst die Kosten eines erfolgreichen Cyberangriffs auf (durchschnittlich 250.000 Euro) versus die Investition in Praevention. {kaemmerer} nickt nachdenklich. "Sie haben einen Punkt."',
        teachingMoment:
          'IT-Ausgaben immer als Investition in Risikominimierung darstellen, nicht als Kostenfaktor.',
        setsFlags: ['firewall_budget_approved'],
      },
      {
        id: 'compliance_argument',
        text: 'Auf die BSI-Vorgaben und moegliche Bussgelder hinweisen',
        effects: {
          skills: { softSkills: 5 },
          relationships: { kaemmerer: 5 },
          budget: 15000,
        },
        resultText:
          '{kaemmerer} mag keine Bussgelder. "Na gut, aber nur das Notwendigste. Ich genehmige 20.000 Euro. Den Rest muessen Sie naechstes Jahr wieder beantragen."',
      },
      {
        id: 'defensive',
        text: '"Das alte System ist ueber 10 Jahre alt und hat bekannte Sicherheitsluecken!"',
        effects: {
          stress: 10,
          relationships: { kaemmerer: -10 },
        },
        resultText:
          '{kaemmerer} verschraenkt die Arme. "Dann patchen Sie es. Ich sehe keinen Grund fuer Neukauf." Die Stimmung kippt.',
      },
      {
        id: 'defer_to_chef',
        text: '{chef} das Reden ueberlassen',
        effects: {
          relationships: { chef: -10, kaemmerer: -5 },
          stress: 5,
        },
        resultText:
          '{chef} schaut dich enttaeuscht an und uebernimmt. Spaeter sagt er: "Ich dachte, du bist bereit fuer solche Gespraeche."',
      },
    ],
    tags: ['budget', 'politics', 'kaemmerer', 'softskills'],
  },

  // Week 4, Event 2: First Major Outage
  {
    id: 'evt_major_outage',
    weekRange: [4, 4],
    dayPreference: [2, 3, 4],
    probability: 0.95,
    category: 'crisis',
    title: 'Alles steht still',
    description: `Montagmorgen, 8:47 Uhr. Das Telefon klingelt ununterbrochen.

"Das Abrechnungssystem geht nicht!"
"Ich komme nicht an meine Mails!"
"Die Zeiterfassung spinnt!"

Du schaust auf das Monitoring: Der zentrale Virtualisierungshost zeigt rot. Alle VMs darauf sind nicht erreichbar - darunter Exchange, die Datenbank, und drei kritische Fachanwendungen.

{chef} kommt gerannt: "Was ist los?!"

Dies ist dein erster grosser Ausfall. 150 Mitarbeiter koennen nicht arbeiten.`,
    involvedCharacters: ['chef', 'kollege'],
    choices: [
      {
        id: 'structured_approach',
        text: 'Strukturiert vorgehen: Status erfassen, Kommunikation, dann Diagnose',
        requires: { skill: 'troubleshooting', threshold: 40 },
        effects: {
          skills: { troubleshooting: 15, softSkills: 5 },
          stress: 15,
          relationships: { chef: 20, fachabteilung: 10 },
        },
        resultText:
          'Du schickst eine Info-Mail an alle ("Stoerung bekannt, wir arbeiten daran"), dann gehst du mit {kollege} systematisch die moeglichen Ursachen durch. Nach 45 Minuten: Der Storage-Controller hatte einen Fehler. Failover auf den Backup-Controller, alles laeuft wieder.',
        teachingMoment:
          'Bei Ausfaellen: 1. Kommunizieren, 2. Diagnostizieren, 3. Beheben, 4. Dokumentieren. Ruhe bewahren ist die halbe Miete.',
        setsFlags: ['first_outage_handled_well'],
      },
      {
        id: 'panic_restart',
        text: 'Den Host sofort neustarten',
        effects: {
          stress: 25,
          relationships: { chef: -10 },
          skills: { troubleshooting: -5 },
        },
        resultText:
          'Der Neustart dauert 20 Minuten. Die VMs starten... und stuerzen wieder ab. Das Problem war nicht der Host, sondern der Storage. Jetzt hast du zusaetzlich inkonsistente Datenbanken.',
        teachingMoment:
          'Nie blind neustarten. Erst Ursache finden, dann gezielt handeln.',
      },
      {
        id: 'call_vendor',
        text: 'Sofort den Hardware-Support anrufen',
        effects: {
          stress: 20,
          budget: -500,
        },
        resultText:
          'Der Support hat 45 Minuten Wartezeit. Als du endlich jemanden erreichst, hast du das Problem selbst noch nicht eingegrenzt. Der Techniker fragt: "Haben Sie schon die Logs geprueft?"',
      },
      {
        id: 'delegate_communication',
        text: '{kollege} soll die Telefone annehmen, du klammerst dich an das Problem',
        effects: {
          stress: 20,
          skills: { troubleshooting: 8 },
          relationships: { kollegen: -5, fachabteilung: -10 },
        },
        resultText:
          'Du findest das Problem nach einer Stunde. Aber die Fachabteilungen sind veraergert - niemand hat ihnen Bescheid gesagt, was los ist.',
        teachingMoment:
          'Kommunikation waehrend eines Ausfalls ist genauso wichtig wie die technische Loesung.',
      },
    ],
    tags: ['crisis', 'outage', 'troubleshooting', 'communication', 'critical'],
  },

  // Week 4, Event 3: Suspicious Email Reported
  {
    id: 'evt_real_attack',
    weekRange: [4, 4],
    dayPreference: [3, 4],
    probability: 0.9,
    category: 'security',
    title: 'Diesmal echt?',
    description: `Eine Mitarbeiterin meldet eine verdaechtige E-Mail. Du schaust sie dir an:

Absender: buchhaltung@warm-kommunal.de (sieht legitim aus!)
Betreff: "Dringende Rechnung - sofortige Zahlung erforderlich"
Anhang: Rechnung_2026_03.zip

Die Mitarbeiterin: "Ich wollte sie oeffnen, aber mein Bauchgefuehl sagte nein. Wir bekommen doch nie Rechnungen als ZIP?"

Du pruefst den E-Mail-Header. Die Mail kam tatsaechlich von eurem Mail-Server... aber der Absender-Account wurde anscheinend kompromittiert.`,
    involvedCharacters: ['chef'],
    choices: [
      {
        id: 'incident_response',
        text: 'Vollstaendigen Incident-Response-Prozess starten',
        requires: { skill: 'security', threshold: 40 },
        effects: {
          skills: { security: 15, troubleshooting: 8 },
          stress: 20,
          relationships: { chef: 15 },
          compliance: 10,
        },
        resultText:
          'Du sperrst den kompromittierten Account, pruefst die Logs, und findest: Der Account wurde durch Credential Stuffing uebernommen. Passwort war "Sommer2025!". Du initiierst einen Passwort-Reset fuer alle Accounts und meldest den Vorfall ans BSI.',
        teachingMoment:
          'Bei einem echten Incident: Enthalten, Analysieren, Beseitigen, Wiederherstellen. Und dokumentieren fuer das BSI.',
        setsFlags: ['first_real_incident', 'reported_to_bsi'],
        unlocks: ['Get-MailboxPermission', 'Search-UnifiedAuditLog'],
      },
      {
        id: 'quick_block',
        text: 'Schnell den Account sperren und Passwort zuruecksetzen',
        effects: {
          skills: { security: 5 },
          stress: 10,
        },
        resultText:
          'Du sperrst den Account. Die unmittelbare Gefahr ist gebannt. Aber wer weiss, was der Angreifer in der Zwischenzeit alles getan hat...',
        teachingMoment:
          'Account sperren ist der erste Schritt, aber nicht der letzte. Eine vollstaendige Analyse ist notwendig.',
      },
      {
        id: 'analyze_zip',
        text: 'Die ZIP-Datei in einer Sandbox analysieren',
        effects: {
          skills: { security: 10 },
          stress: 15,
        },
        resultText:
          'Die ZIP enthaelt eine .exe-Datei, getarnt als PDF (Rechnung.pdf.exe). Ein klassischer Emotet-Dropper. Zum Glueck hat niemand darauf geklickt.',
        teachingMoment:
          'Doppelte Dateiendungen sind ein klassisches Malware-Muster. Windows zeigt standardmaessig keine Dateiendungen an.',
        unlocks: ['file', 'strings'],
      },
      {
        id: 'inform_all_users',
        text: 'Sofort alle Mitarbeiter per Mail warnen',
        effects: {
          skills: { softSkills: 3 },
          stress: 10,
          relationships: { fachabteilung: 5 },
        },
        resultText:
          'Du schickst eine Warnung raus. Mehrere Mitarbeiter melden sich - sie haben aehnliche Mails bekommen! Die Angriffswelle ist groesser als gedacht.',
        setsFlags: ['attack_wave_discovered'],
      },
    ],
    tags: ['security', 'incident', 'email', 'malware', 'bsi'],
  },

  // Week 4, Event 4: End of Month 1 Feedback
  {
    id: 'evt_month1_feedback',
    weekRange: [4, 4],
    dayPreference: [5],
    probability: 1.0,
    category: 'personal',
    title: 'Zwischenstand',
    description: `Freitag, Ende deiner vierten Woche. {chef} bittet dich zum Feedbackgespraeach.

"Ein Monat rum. Zeit fuer eine erste Bilanz." Er schaut in seine Notizen.

"Technisch hast du dich gut eingefunden. Die Backup-Analyse war solide, die USB-Stick-Sache hast du richtig gehandhabt."

Er macht eine Pause.

"Aber ich sehe noch Entwicklungspotenzial. Was glaubst du, wo du dich verbessern kannst?"`,
    involvedCharacters: ['chef'],
    choices: [
      {
        id: 'honest_reflection',
        text: 'Ehrlich reflektieren und konkrete Bereiche nennen',
        effects: {
          skills: { softSkills: 10 },
          relationships: { chef: 15 },
          stress: -10,
        },
        resultText:
          'Du sprichst offen ueber deine Unsicherheiten bei Netzwerk-Themen und den Umgang mit dem Kaemmerer. {chef} nickt. "Gute Selbstreflexion. Daran koennen wir arbeiten."',
        teachingMoment:
          'Selbstreflexion und Ehrlichkeit im Feedback zeigen Reife und Lernbereitschaft.',
      },
      {
        id: 'defensive',
        text: '"Ich glaube, ich mache eigentlich alles ganz gut."',
        effects: {
          relationships: { chef: -15 },
          stress: 5,
        },
        resultText:
          '{chef} runzelt die Stirn. "Wirklich? Keine Entwicklungsfelder? Das ueberrascht mich." Die Stimmung kuehlt merklich ab.',
      },
      {
        id: 'ask_for_feedback',
        text: '"Was wuenschen Sie sich von mir im naechsten Monat?"',
        effects: {
          skills: { softSkills: 5 },
          relationships: { chef: 10 },
        },
        resultText:
          '{chef}: "Mehr Eigeninitiative bei Projekten. Du wartest oft auf Anweisungen. Und - arbeite an deinem Standing beim Kaemmerer."',
        teachingMoment:
          'Proaktiv nach Feedback fragen zeigt Engagement und den Willen zur Verbesserung.',
      },
      {
        id: 'blame_circumstances',
        text: '"Es ist schwer, wenn man so ins kalte Wasser geworfen wird."',
        effects: {
          relationships: { chef: -10 },
          stress: 10,
        },
        resultText:
          '{chef} lehnt sich zurueck. "Ins kalte Wasser? Du hast einen strukturierten Onboarding-Plan bekommen. Das ist IT - manchmal muss man schwimmen lernen."',
      },
    ],
    tags: ['personal', 'feedback', 'career', 'evaluation'],
  },

  // Week 4, Event 5: Weekend On-Call Setup
  {
    id: 'evt_oncall_introduction',
    weekRange: [4, 4],
    dayPreference: [4, 5],
    probability: 0.85,
    category: 'personal',
    title: 'Die Bereitschaft',
    description: `{chef} kommt mit einem Diensthandy zu dir.

"Ab naechster Woche bist du in der Rufbereitschaft. Wochenend-Rotation mit {kollege}. Bei KRITIS-Betrieben ist das Pflicht - die Wasserversorgung muss 24/7 ueberwacht werden."

Er gibt dir das Handy und eine Liste.

"Hier sind die Eskalationswege und die wichtigsten Kontakte. Notfall-Passwort fuer den VPN-Zugang steht auch drin. Fragen?"`,
    involvedCharacters: ['chef', 'kollege', 'gf'],
    choices: [
      {
        id: 'accept_prepared',
        text: 'Die Dokumentation durchlesen und Rueckfragen stellen',
        effects: {
          skills: { troubleshooting: 5 },
          relationships: { chef: 10 },
          stress: 10,
        },
        resultText:
          'Du gehst die Eskalationswege durch und klaerst offene Punkte. {chef} ist zufrieden mit deiner Gruendlichkeit.',
        teachingMoment:
          'Rufbereitschaft ernst nehmen: Dokumentation kennen, Zugriffe testen, Eskalationswege verstehen.',
        setsFlags: ['oncall_prepared'],
      },
      {
        id: 'ask_compensation',
        text: '"Wie wird die Bereitschaft verguetet?"',
        effects: {
          relationships: { chef: -5 },
          stress: 5,
        },
        resultText:
          '{chef} schaut irritiert. "Das steht in deinem Vertrag. Lesen bildet. Aber ja - 150 Euro Pauschale pro Wochenende plus Stundensatz bei Einsaetzen."',
      },
      {
        id: 'express_concerns',
        text: '"Ich bin noch neu - bin ich dafuer schon bereit?"',
        effects: {
          relationships: { chef: 5, kollegen: 5 },
          skills: { softSkills: 3 },
          stress: 5,
        },
        resultText:
          '{chef}: "Deshalb bist du mit {kollege} im Team. Er ist telefonisch erreichbar, wenn du nicht weiterkommst. Learning by doing."',
      },
      {
        id: 'mention_gf',
        text: '"Ich muss das mit meiner Freundin besprechen - wir hatten Plaene."',
        effects: {
          relationships: { chef: -5, gf: 10 },
          stress: 10,
        },
        resultText:
          '{chef} seufzt. "Das ist Teil des Jobs. Aber ja, kommunizier das zu Hause. Work-Life-Balance ist wichtig - aber bei KRITIS gibts manchmal keine Balance."',
        teachingMoment:
          'Rufbereitschaft beeinflusst das Privatleben. Offene Kommunikation mit dem Partner ist wichtig.',
      },
    ],
    tags: ['personal', 'oncall', 'worklife', 'kritis'],
  },
];
