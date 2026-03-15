/**
 * Adventure Mode Story Events
 * Main narrative content for "Die Probezeit"
 */

import { GameEvent } from '@kritis/shared';

export const adventureStoryEvents: GameEvent[] = [
  // ============================================
  // CHAPTER 1: DER ERSTE TAG
  // ============================================

  {
    id: 'adv_welcome',
    title: 'Willkommen im Team',
    category: 'story',
    weekRange: [1, 1],
    probability: 1,
    description: `Der erste Arbeitstag. Du stehst vor dem Gebäude der Kommunalen Abfallwirtschaft.

Ein graues Bürogebäude aus den 80ern, aber immerhin mit Parkplatz. An der Eingangstür klebt ein handgeschriebener Zettel: "IT-Abteilung: 2. Stock, links, dann rechts, dann fragen."

Du findest tatsächlich eine Tür mit "IT" drauf. Dahinter warten zwei Gesichter auf dich.

**Chef Bernd** (graue Haare, Kaffeetasse in der Hand): "Ah, der Neue! Endlich Verstärkung. Der letzte hat uns ja... naja, ziemlich plötzlich verlassen."

**Thomas** (dein Alter, trägt ein Linux-Shirt): "Hey! Ich bin Thomas. Bin gespannt, ob du länger bleibst als der letzte."`,
    involvedCharacters: ['chef', 'kollege'],
    tags: ['story', 'chapter1', 'introduction'],
    choices: [
      {
        id: 'formal',
        text: 'Professionell: "Guten Tag! Ich freue mich auf die Zusammenarbeit."',
        effects: { relationships: { chef: 10, kollegen: 0 } },
        resultText: 'Chef Bernd nickt zufrieden. Thomas verdreht unmerklich die Augen.',
        setsFlags: ['first_impression_formal'],
      },
      {
        id: 'casual',
        text: 'Locker: "Hi! Was ist denn mit meinem Vorgänger passiert?"',
        effects: { relationships: { chef: -5, kollegen: 15 } },
        resultText: 'Thomas grinst. Chef Bernd räuspert sich: "Das... ist eine längere Geschichte. Für später."',
        setsFlags: ['first_impression_casual', 'asked_about_predecessor'],
      },
      {
        id: 'technical',
        text: 'Nerdiger: "Morgen! Welche Infrastruktur habt ihr hier - Windows oder Linux?"',
        effects: { relationships: { chef: 0, kollegen: 20 } },
        resultText: 'Thomas\' Augen leuchten auf: "Beides! Das ist ja das Problem!" Chef Bernd seufzt.',
        setsFlags: ['first_impression_technical'],
      },
    ],
  },

  {
    id: 'adv_desk_discovery',
    title: 'Dein neuer Arbeitsplatz',
    category: 'story',
    weekRange: [1, 1],
    probability: 1,
    description: `Thomas zeigt dir deinen Schreibtisch. Er steht in einer Ecke, umgeben von Kabeln und leeren Red Bull-Dosen.

"Das war Stefans Platz", sagt Thomas leise. "Er hat's nicht aufgeräumt bevor er... gegangen ist."

Du setzt dich und fährst den PC hoch. Windows 10, mindestens 3 Jahre alt. Aber etwas fällt dir auf:

Im Papierkorb liegt ein zerknüllter Zettel. Und auf dem Desktop gibt es einen Ordner namens "PROJEKT_X".`,
    involvedCharacters: ['kollege'],
    tags: ['story', 'chapter1', 'discovery'],
    choices: [
      {
        id: 'read_note',
        text: 'Den Zettel aus dem Papierkorb fischen und lesen',
        effects: { skills: { troubleshooting: 2 } },
        resultText: 'Der Zettel ist teilweise zerrissen. Du kannst nur Fragmente lesen: "...nicht ignorieren..." und "...logs checken..." und eine Zahl: "23:47"',
        setsFlags: ['found_mysterious_note'],
      },
      {
        id: 'check_folder',
        text: 'Den Ordner "PROJEKT_X" öffnen',
        effects: { skills: { security: 2 } },
        resultText: 'Der Ordner ist leer. Aber das Änderungsdatum ist von gestern - obwohl Stefan seit Wochen weg ist.',
        setsFlags: ['noticed_project_x'],
      },
      {
        id: 'clean_up',
        text: 'Erstmal aufräumen - das ist unprofessionell',
        effects: { relationships: { chef: 5 } },
        resultText: 'Du wirfst alles weg und machst sauber. Chef Bernd lobt dich später dafür. Thomas schaut dich seltsam an.',
      },
    ],
  },

  {
    id: 'adv_first_ticket',
    title: 'Das erste Ticket',
    category: 'story',
    weekRange: [1, 1],
    probability: 1,
    description: `*PING* - Das Ticket-System meldet sich.

**Ticket #4721** - DRINGEND
Von: Frau Müller, Buchhaltung
Betreff: INTERNET GEHT NICHT!!!!!

"Der Internet ist kaputt!!!! Ich kann keine E-Mails mehr lesen!!! Das ist ein NOTFALL!!!"

Thomas lacht leise: "Willkommen in der IT. Das ist übrigens der gleiche PC, der letzte Woche 'explodiert' ist. Und davor 'gehackt' wurde."

Du gehst runter in die Buchhaltung. Frau Müller sitzt vor einem schwarzen Bildschirm und tippt trotzdem auf der Tastatur.`,
    involvedCharacters: ['kollege'],
    tags: ['story', 'chapter1', 'support'],
    choices: [
      {
        id: 'basic_check',
        text: 'Den Monitor einschalten (der Klassiker)',
        effects: { skills: { troubleshooting: 3 } },
        resultText: 'Der Monitor springt an. Frau Müller: "Oh! Das haben Sie toll gemacht!" Du fragst dich, wie die Menschheit überlebt hat.',
        setsFlags: ['first_ticket_solved'],
      },
      {
        id: 'thorough',
        text: 'Trotzdem die Netzwerkverbindung prüfen',
        effects: { skills: { netzwerk: 3, troubleshooting: 2 } },
        resultText: 'Monitor an, Problem gelöst. Aber du bemerkst: Ihr PC hat kurz eine Verbindung zu einer externen IP aufgebaut. Merkwürdig.',
        setsFlags: ['first_ticket_solved', 'noticed_anomaly'],
      },
      {
        id: 'delegate',
        text: 'Thomas holen - du bist doch noch neu',
        effects: { relationships: { kollegen: 5 } },
        resultText: 'Thomas löst es in 3 Sekunden. "Nur Mut", sagt er. "Das war noch das einfache Level."',
        setsFlags: ['first_ticket_delegated'],
      },
    ],
  },

  {
    id: 'adv_mysterious_note',
    title: 'Die Nachricht im Code',
    category: 'story',
    weekRange: [1, 1],
    probability: 1,
    description: `Es ist Feierabend. Thomas ist schon gegangen. Du willst gerade herunterfahren, als du etwas bemerkst.

In den Kommentaren eines alten Skripts, das auf dem Desktop lag, steht etwas Seltsames:

\`\`\`
# TODO: Remove before leaving
# If you're reading this, you're my replacement
# Trust no one. Check the logs at 23:47.
# They're watching the network.
# - S.
\`\`\`

Stefan. Dein Vorgänger.

Es ist 18:30. Du könntest nach Hause gehen. Oder du könntest um 23:47 die Logs checken.`,
    involvedCharacters: [],
    tags: ['story', 'chapter1', 'mystery'],
    choices: [
      {
        id: 'stay',
        text: 'Bis 23:47 warten und die Logs checken',
        effects: { stress: 5, skills: { security: 3 } },
        resultText: 'Du wartest. Um 23:47 siehst du es: Ein automatisierter Prozess, der Daten nach außen sendet. Kleine Pakete, aber regelmäßig. Das ist kein normaler Traffic.',
        setsFlags: ['found_night_activity', 'started_investigation'],
      },
      {
        id: 'tomorrow',
        text: 'Morgen ist auch ein Tag - nach Hause gehen',
        effects: { stress: -5 },
        resultText: 'Du gehst nach Hause. Die Nachricht lässt dich nicht los. Wer ist S.? Und warum sollte er lügen?',
        setsFlags: ['noted_message'],
      },
      {
        id: 'tell_thomas',
        text: 'Thomas anrufen und ihm davon erzählen',
        effects: { relationships: { kollegen: 10 } },
        resultText: 'Thomas\' Stimme klingt angespannt: "Zeig mir das morgen. Und... lösch die Nachricht aus dem Browserverlauf, falls du nach Stefans Namen gesucht hast."',
        setsFlags: ['thomas_knows', 'thomas_worried'],
      },
    ],
  },

  // ============================================
  // CHAPTER 2: EINARBEITUNG
  // ============================================

  {
    id: 'adv_system_tour',
    title: 'Die Systemlandschaft',
    category: 'story',
    weekRange: [2, 2],
    probability: 1,
    description: `Thomas gibt dir eine Tour durch die Systeme. Es ist... chaotisch.

"Also", sagt er, "wir haben 3 Windows-Server, 2 Linux-Kisten, eine Firewall die keiner versteht, und das hier..." Er zeigt auf einen verstaubten Kasten in der Ecke. "Das ist die SCADA-Anbindung für die Müllverbrennungsanlage."

Du starrst ihn an. "Ihr steuert eine *Müllverbrennungsanlage*?"

"Technisch gesehen nur das Monitoring. Aber ja. KRITIS und so." Er zuckt mit den Schultern. "Stefan wollte das immer absichern. Hat er nie geschafft."`,
    involvedCharacters: ['kollege'],
    tags: ['story', 'chapter2', 'infrastructure'],
    choices: [
      {
        id: 'concerned',
        text: '"Das ist kritische Infrastruktur! Wie kann das so unsicher sein?"',
        effects: { relationships: { kollegen: 5 }, skills: { security: 2 } },
        resultText: 'Thomas nickt ernst: "Ich weiß. Budget, Zeit, Prioritäten. Der Chef sagt, es läuft doch. Bis es nicht mehr läuft."',
        setsFlags: ['understands_kritis'],
      },
      {
        id: 'practical',
        text: '"Okay, was ist die dringendste Baustelle?"',
        effects: { skills: { troubleshooting: 3 } },
        resultText: '"Alles", sagt Thomas. "Aber fang mit dem Backup an. Das hat seit 3 Monaten keiner geprüft."',
        setsFlags: ['prioritized_backup'],
      },
      {
        id: 'ignore',
        text: '"Naja, bisher ist ja nichts passiert, oder?"',
        effects: { relationships: { kollegen: -10 } },
        resultText: 'Thomas\' Gesichtsausdruck wird kühl. "Noch nicht", sagt er leise. "Noch nicht."',
        setsFlags: ['downplayed_risk'],
      },
    ],
  },

  {
    id: 'adv_coffee_machine_intro',
    title: 'Das Pausenraum-Problem',
    category: 'story',
    weekRange: [2, 2],
    probability: 1,
    description: `Im Pausenraum steht eine verchromte Kaffeemaschine. Sie sieht teuer aus. Und sie macht seltsame Geräusche.

"Die spinnt seit Wochen", erklärt Frau Weber aus der Personalabteilung. "Manchmal macht sie Kaffee ohne dass jemand drückt. Letzte Woche hat sie um Mitternacht 47 Tassen Espresso gemacht."

Thomas flüstert dir zu: "Die ist mit dem Netzwerk verbunden. Für die Statistik, angeblich. Stefan hat behauptet, sie wäre ein Sicherheitsrisiko."

Frau Weber schaut dich hoffnungsvoll an: "Sie sind doch von der IT. Können Sie das fixen?"`,
    involvedCharacters: ['kollege'],
    tags: ['story', 'chapter2', 'iot'],
    choices: [
      {
        id: 'investigate',
        text: 'Die Kaffeemaschine untersuchen - IT ist IT',
        effects: { relationships: { kollegen: 10, fachabteilung: 5 } },
        resultText: 'Du schaust dir die Logs an. Die Maschine hat einen eigenen Webserver. Und sie kommuniziert mit einer IP in... China? Okay.',
        setsFlags: ['coffee_investigated', 'noticed_iot_issue'],
      },
      {
        id: 'not_my_job',
        text: '"Das ist Facility Management, nicht IT."',
        effects: { relationships: { fachabteilung: -10 } },
        resultText: 'Frau Weber ist enttäuscht. Im Pausenraum wird ab jetzt über "die arrogante IT" geredet.',
      },
      {
        id: 'delegate',
        text: 'Thomas fragen ob er sich drum kümmern kann',
        effects: { relationships: { kollegen: -5 } },
        resultText: 'Thomas seufzt. "Stefan hat auch immer delegiert. Schau\'s dir wenigstens mal an."',
      },
    ],
  },

  {
    id: 'adv_thomas_warning',
    title: 'Thomas\' Warnung',
    category: 'story',
    weekRange: [2, 2],
    probability: 1,
    description: `Thomas bittet dich nach Feierabend auf ein Bier. Er wirkt nervös.

"Okay, ich sag's dir jetzt, weil ich glaube, du bist anders als die anderen", beginnt er. "Stefan war nicht verrückt. Er hat was gefunden. Etwas im Netzwerk, das nicht da sein sollte."

Er zeigt dir sein Handy. Screenshots von Logs, Netzwerkdiagramme, Notizen.

"Er hat mir das geschickt, bevor er gegangen ist. Hat gesagt, ich soll niemandem vertrauen. Auch nicht dem Chef." Thomas schluckt. "Dann war er weg. Von einem Tag auf den anderen."`,
    involvedCharacters: ['kollege'],
    tags: ['story', 'chapter2', 'revelation'],
    choices: [
      {
        id: 'believe',
        text: '"Zeig mir alles. Ich glaube dir."',
        effects: { relationships: { kollegen: 20 } },
        resultText: 'Thomas atmet aus. "Endlich jemand. Okay, pass auf..." Er beginnt zu erklären. Es ist komplizierter als du dachtest.',
        setsFlags: ['thomas_ally', 'knows_stefans_findings'],
      },
      {
        id: 'skeptical',
        text: '"Das klingt nach Paranoia. Bist du sicher?"',
        effects: { relationships: { kollegen: -5 } },
        resultText: 'Thomas\' Gesicht verschließt sich. "Vergiss es. War dumm von mir." Er zahlt und geht.',
        setsFlags: ['doubted_thomas'],
      },
      {
        id: 'careful',
        text: '"Lass uns vorsichtig sein. Wer weiß noch davon?"',
        effects: { relationships: { kollegen: 15 }, skills: { security: 2 } },
        resultText: '"Nur wir", sagt Thomas. "Und Stefan, wo auch immer er ist." Er schaut sich um. "Lass uns woanders reden."',
        setsFlags: ['careful_approach', 'thomas_partner'],
      },
    ],
  },

  {
    id: 'adv_strange_logs',
    title: 'Die Nacht-Logs',
    category: 'story',
    weekRange: [2, 2],
    probability: 1,
    description: `Du hast Thomas' Hinweise befolgt und die Logs der letzten Wochen analysiert. Was du findest, ist... beunruhigend.

Jede Nacht, zwischen 02:00 und 04:00:
- Kleine Datenpakete werden nach außen gesendet
- Ein Prozess mit dem Namen "svchost_helper.exe" startet
- Die Firewall-Logs zeigen Löcher, die es nicht geben sollte

Das ist kein Bug. Das ist ein Muster. Jemand sammelt Daten. Systematisch.

Thomas steht hinter dir. "Stefan hat das auch gefunden", flüstert er. "Drei Tage später war er weg."`,
    involvedCharacters: ['kollege'],
    tags: ['story', 'chapter2', 'security'],
    choices: [
      {
        id: 'document',
        text: 'Alles dokumentieren und Screenshots machen',
        effects: { skills: { security: 5, troubleshooting: 3 } },
        resultText: 'Du sicherst alles auf einem USB-Stick. Offline. Nicht im Firmennetzwerk. Man weiß ja nie.',
        setsFlags: ['has_evidence', 'documented_intrusion'],
      },
      {
        id: 'trace',
        text: 'Versuchen, die Destination zu tracen',
        effects: { skills: { netzwerk: 5, security: 3 } },
        resultText: 'Die IPs ändern sich täglich. Tor-Exits, VPNs, gehackte Server. Professionell. Sehr professionell.',
        setsFlags: ['traced_attackers', 'knows_sophistication'],
      },
      {
        id: 'tell_chef',
        text: 'Sofort den Chef informieren',
        effects: { relationships: { chef: 5 } },
        resultText: 'Chef Bernd hört zu, nickt, und sagt: "Das ist bestimmt ein Fehlalarm. Unsere IT ist sicher." Du bist nicht überzeugt.',
        setsFlags: ['warned_chef', 'chef_dismissed'],
      },
    ],
  },

  // ============================================
  // CHAPTER 3: FEUERTAUFE
  // ============================================

  {
    id: 'adv_printer_emergency',
    title: 'Druckernotfall',
    category: 'story',
    weekRange: [3, 3],
    probability: 1,
    description: `"DER DRUCKER DRUCKT WIEDER VON SELBST!"

Die Panik-Mail kommt von der 3. Etage. Als du dort ankommst, sieht es aus wie in einem Papierhagel. Hunderte von Seiten. Alle mit dem gleichen Inhalt:

Eine Rechnung. Für "Beratungsdienstleistungen". An eine Firma namens "GHOST LLC". Betrag: 0,00 Euro.

Thomas steht schon da und schaut sich die Blätter an. "Das ist neu", sagt er leise. "Stefan hatte Recht. Sie werden dreister."`,
    involvedCharacters: ['kollege'],
    tags: ['story', 'chapter3', 'incident'],
    choices: [
      {
        id: 'analyze',
        text: 'Die Rechnung analysieren - das sind Hinweise',
        effects: { skills: { security: 4, troubleshooting: 3 } },
        resultText: 'Im Kleingedruckten steht eine IP-Adresse. Und ein Datum: Das Datum in zwei Wochen. Was soll dann passieren?',
        setsFlags: ['found_ghost_clue', 'knows_attack_date'],
      },
      {
        id: 'stop_printer',
        text: 'Erstmal den Drucker vom Netzwerk trennen',
        effects: { skills: { troubleshooting: 2 } },
        resultText: 'Problem temporär gelöst. Aber woher kamen die Druckaufträge? Die Queue war leer.',
        setsFlags: ['contained_printer'],
      },
      {
        id: 'play_dumb',
        text: 'So tun als wäre es ein Papierstau',
        effects: { stress: 5 },
        resultText: 'Du sammelst die Blätter ein und sagst "Papierstau". Aber Thomas schaut dich an, als wärst du verrückt geworden.',
        setsFlags: ['ignored_warning_sign'],
      },
    ],
  },

  {
    id: 'adv_chef_pressure',
    title: 'Der Chef braucht JETZT seine Präsentation',
    category: 'story',
    weekRange: [3, 3],
    probability: 1,
    description: `Chef Bernd stürmt ins IT-Büro. "DIE PRÄSENTATION! Der Bürgermeister kommt in 30 MINUTEN und PowerPoint stürzt ab!"

Thomas verdreht die Augen. Du gehst mit runter ins Chefbüro.

Das Problem: Eine 150 MB PowerPoint-Datei mit 200 eingebetteten Excel-Tabellen. Sein Laptop hat 4 GB RAM und kämpft ums Überleben.

Aber du bemerkst noch etwas: Im Hintergrund läuft ein Prozess, den du nicht kennst. Er verbraucht 40% der CPU. "svchost_helper.exe".

Der gleiche Prozess aus den Logs.`,
    involvedCharacters: ['chef'],
    tags: ['story', 'chapter3', 'pressure'],
    choices: [
      {
        id: 'quick_fix',
        text: 'Präsentation retten, den Prozess ignorieren (keine Zeit!)',
        effects: { relationships: { chef: 15 }, stress: 10 },
        resultText: 'Du killst alle unnötigen Prozesse außer dem suspekten und rettest die Präsentation. Der Chef ist happy. Aber du hast gerade Beweise überschrieben.',
        setsFlags: ['saved_presentation', 'missed_evidence'],
      },
      {
        id: 'investigate_first',
        text: '"Moment, da läuft was Seltsames. Ich muss das prüfen."',
        effects: { relationships: { chef: -10 }, skills: { security: 5 } },
        resultText: 'Der Chef explodiert fast. Aber du machst Screenshots. Der Prozess kommuniziert nach außen - während du zuschaust.',
        setsFlags: ['caught_malware_active', 'chef_angry'],
      },
      {
        id: 'both',
        text: 'Screenshot machen UND Präsentation retten (Multitasking!)',
        effects: { skills: { troubleshooting: 5 }, stress: 15 },
        resultText: 'Du schaffst beides. Gerade so. Der Chef ist zufrieden, du hast Beweise. Aber dein Stresslevel ist jetzt sehr hoch.',
        setsFlags: ['saved_presentation', 'caught_malware_active'],
      },
    ],
  },

  {
    id: 'adv_mail_anomaly',
    title: 'Die Mail-Anomalie',
    category: 'story',
    weekRange: [3, 3],
    probability: 1,
    description: `Das Ticket-System meldet sich wieder. Diesmal von mehreren Leuten gleichzeitig.

"Ich bekomme Mails die ich nie gesendet habe"
"Mein Postfach ist voller Spam"
"Warum steht in meiner Signatur plötzlich was auf Russisch?"

Du checkst den Mail-Server. Was du findest, ist nicht gut:
- 47 Accounts haben ihre Passwörter "geändert" - um 03:14 heute Nacht
- Alle Änderungen kamen von einer internen IP
- Die Audit-Logs wurden... gelöscht?

Das war kein Script-Kiddie. Das war jemand mit Admin-Zugang.`,
    involvedCharacters: [],
    tags: ['story', 'chapter3', 'compromise'],
    choices: [
      {
        id: 'lockdown',
        text: 'Sofort alle Passwörter zurücksetzen - Damage Control',
        effects: { skills: { security: 5 }, relationships: { fachabteilung: -20 } },
        resultText: '200 Leute müssen neue Passwörter erstellen. Sie hassen dich. Aber die Accounts sind sicher. Vorerst.',
        setsFlags: ['did_password_reset', 'made_enemies'],
      },
      {
        id: 'investigate',
        text: 'Erstmal herausfinden, wie sie reingekommen sind',
        effects: { skills: { security: 7, troubleshooting: 3 } },
        resultText: 'Du findest es: Ein Domain Admin-Konto wurde kompromittiert. Das Konto von... Stefan. Der angeblich seit Wochen weg ist.',
        setsFlags: ['found_stefans_account', 'knows_entry_point'],
      },
      {
        id: 'cover_up',
        text: 'Leise fixen ohne Panik zu verbreiten',
        effects: { stress: 10 },
        resultText: 'Du fixst was du kannst. Aber tief im Inneren weißt du: Du hast gerade Beweise vernichtet.',
        setsFlags: ['covered_up'],
      },
    ],
  },

  {
    id: 'adv_late_night',
    title: 'Die lange Nacht',
    category: 'story',
    weekRange: [3, 3],
    probability: 1,
    description: `Es ist 23:00. Thomas und du sitzt noch im Büro. Kaffee ist leer, Pizza ist kalt.

"Was haben wir?", fragt Thomas.

Du zählst auf:
- Mysteriöse Prozesse die Daten exfiltrieren
- Kompromittierte Accounts
- Ein verschwundener Vorgänger
- Ein Chef der nichts hören will
- Und ein Datum: In zwei Wochen soll irgendwas passieren

Thomas reibt sich die Augen. "Wir sollten zum BSI gehen", sagt er. "Das ist zu groß für uns."

Aber dann fällt dir ein: Wenn jemand Admin-Zugang hat, kann er auch mitlesen. Jede Mail. Jeder Chat. Jede Datei.

Ihr seid nicht allein in diesem Netzwerk.`,
    involvedCharacters: ['kollege'],
    tags: ['story', 'chapter3', 'decision'],
    choices: [
      {
        id: 'go_offline',
        text: 'Ab jetzt nur noch offline kommunizieren',
        effects: { skills: { security: 3 } },
        resultText: '"Burner Phones", sagt Thomas. "Wie im Film." Ihr lacht, aber keiner findet es lustig.',
        setsFlags: ['went_offline', 'paranoid_but_smart'],
      },
      {
        id: 'set_trap',
        text: 'Eine Falle stellen - sie sollen denken, wir wissen nichts',
        effects: { skills: { security: 5, softSkills: 3 } },
        resultText: 'Ihr schreibt eine Mail: "Habe die komischen Logs gefunden. War wohl ein Fehlalarm." Wenn sie mitlesen, werden sie sich sicher fühlen.',
        setsFlags: ['set_trap', 'playing_dumb'],
      },
      {
        id: 'bsi_now',
        text: 'Sofort das BSI anrufen - Notfall-Hotline',
        effects: { stress: -10 },
        resultText: 'Du rufst an. Sie nehmen dich ernst. "Wir schicken morgen jemanden." Aber du fragst dich: Wird der Angreifer das mitbekommen?',
        setsFlags: ['called_bsi', 'chose_official_route'],
      },
    ],
  },

  // ============================================
  // CHAPTER 4: NICHT_ÖFFNEN.ZIP
  // ============================================

  {
    id: 'adv_old_pc',
    title: 'Stefans alter Rechner',
    category: 'story',
    weekRange: [4, 4],
    probability: 1,
    description: `Im Keller findest du ihn: Stefans alten Rechner. Er wurde nie abgeholt, nur abgestellt und vergessen.

Thomas steht Wache oben. "Beeil dich", sagt er über Funk. "Der Chef macht um 14 Uhr seine Runde."

Der PC startet. Windows 7. Kein Passwort. Auf dem Desktop: Ordner über Ordner, alle verschlüsselt. Und eine Datei namens "NICHT_ÖFFNEN.zip".

Ironischerweise ist sie nicht passwortgeschützt.`,
    involvedCharacters: ['kollege'],
    tags: ['story', 'chapter4', 'discovery'],
    choices: [
      {
        id: 'open_it',
        text: 'NICHT_ÖFFNEN.zip öffnen (was soll schon passieren?)',
        effects: { skills: { troubleshooting: 5 } },
        resultText: 'Du öffnest sie. Drin: Dokumente, Screenshots, ein Audio-File. Stefan hat alles dokumentiert. Und er wusste mehr als er hätte wissen sollen.',
        setsFlags: ['opened_zip', 'has_stefan_files'],
      },
      {
        id: 'copy_first',
        text: 'Erstmal alles auf einen USB-Stick kopieren',
        effects: { skills: { security: 5 } },
        resultText: 'Du kopierst alles. 2.3 GB. Gerade als du fertig bist, hörst du Schritte im Treppenhaus.',
        setsFlags: ['copied_evidence', 'has_backup'],
      },
      {
        id: 'leave_it',
        text: 'Nicht anfassen - könnte eine Falle sein',
        effects: { skills: { security: 3 } },
        resultText: 'Du nimmst nur Fotos und gehst. Vielleicht war das klug. Vielleicht hast du auch die Chance deines Lebens verpasst.',
        setsFlags: ['left_evidence'],
      },
    ],
  },

  {
    id: 'adv_encrypted_file',
    title: 'Die verschlüsselten Dateien',
    category: 'story',
    weekRange: [4, 4],
    probability: 1,
    description: `Die wichtigsten Dateien sind verschlüsselt. AES-256. Ohne Passwort kommst du nicht rein.

Stefan hat aber einen Hinweis hinterlassen - typisch für einen Paranoiden:

"Das Passwort ist, wo ich jeden Tag hingegangen bin, wenn ich die Wahrheit brauchte."

Thomas runzelt die Stirn. "Das könnte alles sein. Die Kantine? Das Klo? Der Raucherbereich?"

Du überlegst. Stefan war kein Raucher. Aber er war oft... wo?`,
    involvedCharacters: ['kollege'],
    tags: ['story', 'chapter4', 'puzzle'],
    choices: [
      {
        id: 'server_room',
        text: '"Der Serverraum! Da waren die Logs!"',
        effects: { skills: { troubleshooting: 3 } },
        resultText: 'Du versuchst "SERVERRAUM123". Falsch. "ServerRoom". Falsch. "server_room_logs". FALSCH. Zu viele Versuche - die Datei löscht sich.',
        setsFlags: ['wrong_password', 'lost_files'],
      },
      {
        id: 'basement',
        text: '"Der Keller! Da steht der alte Server!"',
        effects: { skills: { troubleshooting: 5 } },
        resultText: 'Du versuchst "KELLER2024". RICHTIG! Die Dateien öffnen sich. Drin: Die komplette Angriffs-Timeline. Seit EINEM JAHR läuft das schon.',
        setsFlags: ['found_password', 'knows_full_timeline'],
      },
      {
        id: 'ask_thomas',
        text: '"Thomas, du kanntest Stefan. Wo ist er immer hin?"',
        effects: { relationships: { kollegen: 5 } },
        resultText: '"Zum Rauchen auf\'s Dach", sagt Thomas. "Obwohl er gar nicht raucht." Du versuchst "DACHTERASSE". RICHTIG!',
        setsFlags: ['found_password', 'thomas_helped'],
      },
    ],
  },

  {
    id: 'adv_password_hunt',
    title: 'Die Suche nach dem Schlüssel',
    category: 'story',
    weekRange: [4, 4],
    probability: 1,
    requires: { flags: ['found_password'] },
    description: `Die Dateien sind offen. Was du findest, lässt dich erstarren.

Stefan hat alles aufgezeichnet:
- 14 Monate Netzwerk-Anomalien
- 200+ kompromittierte Konten
- Verbindungen zu 3 anderen deutschen KRITIS-Betreibern
- Und der Beweis: Der Angriff kommt von INNEN

Nicht von außen. Nicht von Hackern in Russland oder China.

Jemand in dieser Firma arbeitet für die Angreifer. Jemand mit Admin-Zugang. Jemand, der vielleicht gerade in diesem Gebäude ist.`,
    involvedCharacters: [],
    tags: ['story', 'chapter4', 'revelation'],
    choices: [
      {
        id: 'confront',
        text: 'Den Verdächtigen konfrontieren (du hast eine Idee wer)',
        effects: { relationships: { chef: -20 }, stress: 15 },
        resultText: 'Du gehst zu Chef Bernd. "Wir müssen reden." Sein Gesichtsausdruck verrät nichts. Aber seine Hände zittern.',
        setsFlags: ['confronted_suspect', 'showed_hand'],
      },
      {
        id: 'gather_more',
        text: 'Noch mehr Beweise sammeln bevor du handelst',
        effects: { skills: { security: 5 } },
        resultText: 'Du kopierst alles dreifach. Eine Kopie für dich, eine für Thomas, eine für das BSI. Sicher ist sicher.',
        setsFlags: ['secured_evidence', 'careful_approach'],
      },
      {
        id: 'warning',
        text: 'Eine anonyme Warnung an alle Mitarbeiter schicken',
        effects: { relationships: { chef: -10, fachabteilung: 10 } },
        resultText: '"Achtung: Phishing-Welle im Haus. Bitte keine Links anklicken." Vielleicht hilft es. Vielleicht alarmiert es auch den Insider.',
        setsFlags: ['warned_everyone', 'tipped_hand'],
      },
    ],
  },

  {
    id: 'adv_file_contents',
    title: 'Stefans Vermächtnis',
    category: 'story',
    weekRange: [4, 4],
    probability: 1,
    requires: { flags: ['found_password'] },
    description: `Das letzte Dokument ist ein Brief. An dich. An deinen Nachfolger.

"Wenn du das liest, bin ich weg. Ich konnte nicht bleiben - sie wissen, dass ich weiß.

Die Wahrheit: Das ist kein gewöhnlicher Hack. Das ist ein Testlauf. Wir sind nicht das Ziel - wir sind die Übung.

In zwei Wochen werden sie zuschlagen. Nicht nur hier. Überall. Wasser, Strom, Gas. Die haben Zeit, die haben Ressourcen, und sie sind DRIN.

Ich habe versucht, zum BSI zu gehen. Der Anruf wurde abgebrochen. Mein Auto hatte einen 'Unfall'. Das war eine Warnung.

Sei vorsichtiger als ich.

- Stefan

PS: Der Schlüssel zum Keller-Server ist hinter dem Feuerlöscher."`,
    involvedCharacters: [],
    tags: ['story', 'chapter4', 'climax'],
    choices: [
      {
        id: 'scared',
        text: 'Das ist zu groß. Das ist viel zu groß.',
        effects: { stress: 20 },
        resultText: 'Du sitzt da und starrst auf den Bildschirm. Thomas legt dir eine Hand auf die Schulter. "Wir schaffen das", sagt er. Du bist dir nicht sicher.',
        setsFlags: ['overwhelmed'],
      },
      {
        id: 'determined',
        text: 'Dann müssen wir sie aufhalten. Wir haben zwei Wochen.',
        effects: { skills: { security: 3, softSkills: 3 } },
        resultText: '"Plan?", fragt Thomas. "Wir brauchen einen Plan." Ihr fangt an zu schreiben. Es wird eine lange Nacht.',
        setsFlags: ['determined', 'making_plan'],
      },
      {
        id: 'basement_key',
        text: 'Den Schlüssel holen. Mal sehen was im Keller ist.',
        effects: { skills: { troubleshooting: 5 } },
        resultText: 'Hinter dem Feuerlöscher findest du einen alten Schlüssel. Im Keller, hinter einer zugestaubten Tür: Ein Server. Er läuft. Und er ist nicht im Netzwerk.',
        setsFlags: ['found_basement_key', 'found_basement_server'],
      },
    ],
  },

  {
    id: 'adv_file_locked',
    title: 'Der verschlossene Tresor',
    category: 'story',
    weekRange: [4, 4],
    probability: 1,
    description: `Ohne Passwort kommst du nicht an Stefans Dateien. Sie sind verschlüsselt, und nach 3 Versuchen löschen sie sich.

Thomas seufzt. "Stefan war immer paranoid. Aber vielleicht hatte er Recht."

Ihr steht wieder am Anfang. Die Hinweise, die ihr habt, sind vage. Die Nacht-Logs, die mysteriösen Prozesse, das komische Gefühl.

"Wir müssen woanders suchen", sagt Thomas. "Stefan hat bestimmt noch mehr hinterlassen."`,
    involvedCharacters: [],
    tags: ['story', 'chapter4', 'alternate'],
    choices: [
      {
        id: 'search_more',
        text: 'Das Büro systematisch durchsuchen',
        effects: { skills: { troubleshooting: 3 } },
        resultText: 'Unter einem losen Teppichstück findest du eine SD-Karte. Darauf: Backup der wichtigsten Dateien. Stefan war wirklich paranoid.',
        setsFlags: ['found_sd_card', 'has_backup'],
      },
      {
        id: 'ask_colleagues',
        text: 'Alte Kollegen befragen die Stefan kannten',
        effects: { relationships: { fachabteilung: 5 } },
        resultText: 'Frau Weber erinnert sich: "Er hat immer gesagt, die Wahrheit liegt im Keller." Kryptisch, aber ein Hinweis.',
        setsFlags: ['knows_basement_clue'],
      },
      {
        id: 'move_on',
        text: 'Wir haben genug. Weiter mit dem was wir wissen.',
        effects: { stress: -5 },
        resultText: 'Ihr konzentriert euch auf die Beweise die ihr habt. Es reicht vielleicht nicht vor Gericht, aber es reicht fürs BSI.',
        setsFlags: ['moved_on'],
      },
    ],
  },

  // ============================================
  // ACT 2 & 3 KEY EVENTS
  // ============================================

  {
    id: 'adv_pattern_recognition',
    title: 'Das Muster',
    category: 'story',
    weekRange: [5, 5],
    probability: 1,
    description: `Du siehst es jetzt überall. Das Muster. Die kleinen Anomalien, die niemand bemerkt hat.

Der Drucker der nachts druckt. Die Kaffeemaschine die mit China redet. Die Mail-Accounts die sich selbst ändern.

Es ist wie ein Uhrwerk. Regelmäßig. Präzise. Und es wird lauter.

Thomas zeigt dir die Nachrichten: In Köln wurde eine Kläranlage gehackt. In Hamburg ein Krankenhaus. In München die Straßenbahn.

"Sie testen", sagt er. "Überall."`,
    involvedCharacters: [],
    tags: ['story', 'chapter5', 'act2'],
    choices: [
      {
        id: 'connect_dots',
        text: 'Die Verbindungen dokumentieren',
        effects: { skills: { security: 5 } },
        resultText: 'Du erstellst eine Timeline. Alle Angriffe folgen dem gleichen Muster. Der gleiche Code. Die gleiche Signatur.',
        setsFlags: ['sees_pattern', 'has_timeline'],
      },
      {
        id: 'warn_others',
        text: 'Die anderen KRITIS-Betreiber warnen',
        effects: { relationships: { fachabteilung: -5 } },
        resultText: 'Du schickst anonyme Warnungen. Manche ignorieren dich. Aber einige melden sich zurück: "Wir haben das auch."',
        setsFlags: ['warned_others', 'has_allies'],
      },
      {
        id: 'stay_quiet',
        text: 'Abwarten und beobachten',
        effects: { stress: 10 },
        resultText: 'Du wartest. Das Muster wird deutlicher. Aber die Zeit läuft.',
        setsFlags: ['waited'],
      },
    ],
  },

  // ============================================
  // SIDEQUEST-ENABLED EVENTS
  // These events have hidden choices unlocked by sidequests
  // ============================================

  {
    id: 'adv_team_rally',
    title: 'Das Team sammeln',
    category: 'story',
    weekRange: [10, 10],
    probability: 1,
    description: `Die Ransomware hat zugeschlagen. Das Team ist in Panik. Der Chef ist blass. Frau Weber weint.

Jemand muss das Ruder übernehmen. Jemand muss sagen, was zu tun ist.

Alle schauen dich an.`,
    involvedCharacters: ['chef', 'kollege'],
    tags: ['story', 'chapter10', 'crisis', 'leadership'],
    choices: [
      {
        id: 'professional',
        text: '"Okay, alle mal herhören. Wir haben einen Plan."',
        effects: { relationships: { kollegen: 10, chef: 5 }, skills: { softSkills: 3 } },
        resultText: 'Du legst die Checkliste auf den Tisch. Schritt für Schritt. Die Leute beruhigen sich. Endlich weiß jemand was zu tun ist.',
        setsFlags: ['took_lead'],
      },
      {
        id: 'delegate',
        text: '"Thomas, du koordinierst. Chef, Sie informieren den Bürgermeister."',
        effects: { relationships: { kollegen: 5, chef: 10 } },
        resultText: 'Jeder hat seine Aufgabe. Das Team funktioniert wieder. Auch wenn die Situation ernst ist.',
        setsFlags: ['delegated_well'],
      },
      {
        id: 'coffee_speech',
        text: '"Erinnert ihr euch an die Kaffeemaschine? Die haben wir auch gefixt. Das hier schaffen wir auch."',
        hidden: true,
        unlocks: ['coffee_hero'],
        effects: { relationships: { kollegen: 25 }, stress: -10, skills: { softSkills: 5 } },
        resultText: 'Die Kollegen lachen - angespannt, aber echt. "Stimmt, die Kaffeemaschine!" Frau Weber wischt sich die Tränen ab. "Okay. Was müssen wir tun?"',
        setsFlags: ['coffee_speech_given', 'team_morale_high'],
        teachingMoment: 'Gemeinsame Erfolge schaffen Teamgeist - auch in der Krise.',
      },
    ],
  },

  {
    id: 'adv_initial_response',
    title: 'Erste Gegenmaßnahmen',
    category: 'story',
    weekRange: [9, 9],
    probability: 1,
    description: `Der Angriff läuft. Die Server sind verschlüsselt. Aber nicht alle - noch nicht.

Du hast ein kleines Zeitfenster. Die Ransomware breitet sich aus, aber langsam. Du könntest noch etwas retten.

Was ist deine erste Aktion?`,
    involvedCharacters: [],
    tags: ['story', 'chapter9', 'crisis', 'technical'],
    choices: [
      {
        id: 'isolate',
        text: 'Alle nicht betroffenen Systeme vom Netz trennen',
        effects: { skills: { security: 5, netzwerk: 3 } },
        resultText: 'Du ziehst Kabel wie ein Verrückter. Chaos. Aber als die Ransomware sich ausbreiten will, findet sie nichts mehr zum Infizieren.',
        setsFlags: ['isolated_systems'],
      },
      {
        id: 'backup_check',
        text: 'Die Backup-Systeme überprüfen',
        effects: { skills: { troubleshooting: 5 } },
        resultText: 'Gute Nachricht: Die Backups sind offline und sicher. Schlechte Nachricht: Sie sind 3 Monate alt. Besser als nichts.',
        setsFlags: ['backup_checked'],
      },
      {
        id: 'use_legacy_knowledge',
        text: 'Das uralte Skript nutzen - es hat einen Kill-Switch',
        hidden: true,
        unlocks: ['legacy_master'],
        effects: { skills: { linux: 10, security: 5 }, relationships: { kollegen: 15 } },
        resultText: 'Du erinnerst dich an das Skript das du analysiert hast. Es hat einen versteckten Kill-Switch! Du aktivierst ihn - und die Ransomware stoppt. Nicht überall, aber auf 40% der Systeme.',
        setsFlags: ['used_legacy_script', 'partial_save'],
        teachingMoment: 'Legacy-Wissen kann in Krisen Gold wert sein.',
      },
    ],
  },

  {
    id: 'adv_security_lockdown',
    title: 'Sicherheits-Lockdown',
    category: 'story',
    weekRange: [7, 7],
    probability: 1,
    description: `Die Phishing-Angriffe werden immer gezielter. Die letzte Mail wusste sogar deinen Geburtag.

Es ist Zeit für ernsthafte Maßnahmen. Aber welche?`,
    involvedCharacters: ['chef'],
    tags: ['story', 'chapter7', 'security'],
    choices: [
      {
        id: 'passwords',
        text: 'Alle Passwörter zwangsweise zurücksetzen',
        effects: { relationships: { fachabteilung: -15 }, skills: { security: 3 } },
        resultText: '200 genervte Mitarbeiter. Aber die kompromittierten Accounts sind weg.',
        setsFlags: ['forced_password_reset'],
      },
      {
        id: 'training',
        text: 'Notfall-Schulung für alle: Phishing erkennen',
        effects: { relationships: { fachabteilung: 5 }, skills: { softSkills: 3 } },
        resultText: 'Die Leute hören zu. Einige erkennen sogar Mails die sie fast geklickt hätten.',
        setsFlags: ['did_training'],
      },
      {
        id: 'segment_network',
        text: 'Das Netzwerk segmentieren - kritische Systeme isolieren',
        hidden: true,
        unlocks: ['network_expert'],
        effects: { skills: { netzwerk: 10, security: 5 } },
        resultText: 'Du weißt genau wo die Schwachstellen sind. In 4 Stunden hast du das Netzwerk in sichere Zonen aufgeteilt. Die Angreifer können sich nicht mehr lateral bewegen.',
        setsFlags: ['network_segmented', 'contained_threat'],
        teachingMoment: 'Netzwerk-Segmentierung ist eine der effektivsten Schutzmaßnahmen.',
      },
    ],
  },

  {
    id: 'adv_pattern_recognition',
    title: 'Das Muster',
    category: 'story',
    weekRange: [5, 5],
    probability: 1,
    description: `Du siehst es jetzt überall. Das Muster. Die kleinen Anomalien, die niemand bemerkt hat.

Der Drucker der nachts druckt. Die Kaffeemaschine die mit China redet. Die Mail-Accounts die sich selbst ändern.

Es ist wie ein Uhrwerk. Regelmäßig. Präzise. Und es wird lauter.

Thomas zeigt dir die Nachrichten: In Köln wurde eine Kläranlage gehackt. In Hamburg ein Krankenhaus. In München die Straßenbahn.

"Sie testen", sagt er. "Überall."`,
    involvedCharacters: [],
    tags: ['story', 'chapter5', 'act2'],
    choices: [
      {
        id: 'connect_dots',
        text: 'Die Verbindungen dokumentieren',
        effects: { skills: { security: 5 } },
        resultText: 'Du erstellst eine Timeline. Alle Angriffe folgen dem gleichen Muster. Der gleiche Code. Die gleiche Signatur.',
        setsFlags: ['sees_pattern', 'has_timeline'],
      },
      {
        id: 'warn_others',
        text: 'Die anderen KRITIS-Betreiber warnen',
        effects: { relationships: { fachabteilung: -5 } },
        resultText: 'Du schickst anonyme Warnungen. Manche ignorieren dich. Aber einige melden sich zurück: "Wir haben das auch."',
        setsFlags: ['warned_others', 'has_allies'],
      },
      {
        id: 'printer_connection',
        text: '"Der Drucker! Das war kein Geist - das war ein Test!"',
        hidden: true,
        unlocks: ['printer_mystery_solved'],
        effects: { skills: { security: 8, troubleshooting: 5 } },
        resultText: 'Du holst die Rechnungen die der Drucker gedruckt hat. Die IP-Adresse darauf - sie taucht in ALLEN Angriffen auf. Das ist der Command-and-Control Server!',
        setsFlags: ['found_c2_server', 'major_breakthrough'],
        teachingMoment: 'Kleine Anomalien können große Bedrohungen enthüllen.',
      },
    ],
  },

  {
    id: 'adv_backup_available',
    title: 'Das Ass im Ärmel',
    category: 'story',
    weekRange: [10, 10],
    probability: 1,
    requires: { flags: ['found_basement_server'] },
    description: `Der Keller-Server. Stefans Geheimnis. Er läuft immer noch - offline, vergessen, aber funktionsfähig.

Du erinnerst dich an das Sidequest. Der verstaubte Server hinter der zugemauerten Tür. Du hast ihn gefunden. Du hast ihn geprüft.

Und jetzt, während alle Systeme verschlüsselt sind, hast du ein Backup das niemand kennt.`,
    involvedCharacters: ['kollege'],
    tags: ['story', 'chapter10', 'crisis', 'sidequest_payoff'],
    choices: [
      {
        id: 'reveal_backup',
        text: '"Thomas, ich habe da was im Keller..."',
        effects: { relationships: { kollegen: 25, chef: 15 }, stress: -20 },
        resultText: 'Thomas\' Augen werden groß. "Du... du hast Stefans Server gefunden? Und er läuft?" Er umarmt dich. Tatsächlich umarmt er dich. "Du Genie!"',
        setsFlags: ['revealed_secret_backup', 'hero_moment'],
        teachingMoment: 'Offline-Backups sind die letzte Verteidigung gegen Ransomware.',
      },
      {
        id: 'stay_quiet',
        text: 'Erstmal still halten - niemand muss wissen woher das Backup kommt',
        effects: { skills: { security: 5 } },
        resultText: 'Du startest die Wiederherstellung still. Als die Systeme wieder laufen, fragt niemand woher. Manchmal ist der Held der, der im Schatten bleibt.',
        setsFlags: ['quiet_hero'],
      },
    ],
  },

  {
    id: 'adv_ransomware_strike',
    title: 'Der Angriff beginnt',
    category: 'story',
    weekRange: [9, 9],
    probability: 1,
    description: `Montagmorgen, 07:23. Du kommst ins Büro.

Alle Bildschirme sind rot. Auf jedem steht die gleiche Nachricht:

========================================
  IHRE DATEIEN WURDEN VERSCHLÜSSELT

  ZAHLEN SIE 500 BTC INNERHALB VON 72 STUNDEN
  ODER ALLE DATEN WERDEN GELÖSCHT

  Tick. Tock.
========================================

Das Telefon klingelt. Es ist Thomas. "Es ist soweit", sagt er. "Und es ist nicht nur bei uns."`,
    involvedCharacters: [],
    tags: ['story', 'chapter9', 'act3', 'crisis'],
    choices: [
      {
        id: 'calm',
        text: 'Ruhig bleiben. Wir haben uns vorbereitet.',
        effects: { stress: 10, skills: { softSkills: 5 } },
        resultText: 'Du holst tief Luft. Die Checkliste. Der Plan. Jetzt zeigt sich, ob ihr bereit seid.',
        setsFlags: ['stayed_calm'],
      },
      {
        id: 'panic',
        text: 'PANIK. SOFORT ALLES VOM NETZ NEHMEN.',
        effects: { stress: 30 },
        resultText: 'Du rennst zum Serverraum und ziehst Kabel. Chaos. Aber zumindest breitet sich der Schaden nicht aus.',
        setsFlags: ['panicked', 'contained_damage'],
      },
      {
        id: 'laugh',
        text: 'Lachen. Ihr habt das Backup im Keller.',
        effects: { stress: -10 },
        resultText: '"Thomas", sagst du. "Hol den Schlüssel für den Keller." Er versteht sofort. Ihr habt einen Plan.',
        setsFlags: ['ready', 'has_secret_weapon'],
      },
    ],
  },

  {
    id: 'adv_ending',
    title: 'Probezeit beendet',
    category: 'story',
    weekRange: [12, 12],
    probability: 1,
    description: `72 Stunden später.

Du sitzt im Konferenzraum. Der Chef ist da. Der Bürgermeister. Das BSI. Und Thomas, der aussieht als hätte er seit drei Tagen nicht geschlafen. (Hat er auch nicht.)

Die Müllabfuhr läuft wieder. Die Systeme sind wiederhergestellt. Die Angreifer... sind nicht gefasst, aber ihre Infrastruktur ist zerstört.

Und du?

Deine Probezeit ist offiziell beendet.`,
    involvedCharacters: [],
    tags: ['story', 'chapter12', 'finale', 'ending'],
    choices: [
      {
        id: 'good_ending',
        text: '(Wenn alles gut lief)',
        requires: { skill: 'security', threshold: 50 },
        effects: {},
        resultText: '"Sie bekommen einen unbefristeten Vertrag", sagt der Chef. "Und eine Gehaltserhöhung." Thomas grinst. Ihr habt es geschafft.',
        setsFlags: ['ending_good'],
      },
      {
        id: 'neutral_ending',
        text: '(Wenn es okay lief)',
        effects: {},
        resultText: '"Wir verlängern Ihre Probezeit um drei Monate", sagt der Chef. "Es gibt noch einiges aufzuarbeiten." Immerhin: Du hast noch einen Job.',
        setsFlags: ['ending_neutral'],
      },
      {
        id: 'bad_ending',
        text: '(Wenn es schlecht lief)',
        requires: { skill: 'security', threshold: 10 },
        effects: {},
        resultText: '"Wir müssen uns leider trennen", sagt der Chef. "Mangelnde Eignung." Du packst deinen Schreibtisch. Aber das Wissen, das du hast... das bleibt.',
        setsFlags: ['ending_bad'],
      },
    ],
  },
];
