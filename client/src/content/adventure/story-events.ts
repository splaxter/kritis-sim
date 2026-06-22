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
    image: '/images/events/evt_erster_arbeitstag.webp',
    description: `Der erste Arbeitstag. Du stehst vor dem Gebäude der Kommunalen Abfallwirtschaft.

Ein graues Bürogebäude aus den 80ern, aber immerhin mit Parkplatz. An der Eingangstür klebt ein handgeschriebener Zettel: "IT-Abteilung: 2. Stock, links, dann rechts, dann fragen."

Du findest tatsächlich eine Tür mit "IT" drauf. Dahinter warten zwei Gesichter auf dich.

**Chef Bert** (graue Haare, Kaffeetasse in der Hand): "Ah, der Neue! Endlich Verstärkung. Der letzte hat uns ja... naja, ziemlich plötzlich verlassen."

**Bjorg** (etwa in deinem Alter, trägt ein Linux-Shirt): "Hey! Ich bin Bjorg. Bin gespannt, ob du länger bleibst als der letzte."`,
    involvedCharacters: ['chef', 'kollege'],
    tags: ['story', 'chapter1', 'introduction'],
    choices: [
      {
        id: 'formal',
        text: 'Professionell: "Guten Tag! Ich freue mich auf die Zusammenarbeit."',
        effects: { relationships: { chef: 10, kollegen: 0 } },
        resultText: 'Chef Bert nickt zufrieden. Bjorg verdreht unmerklich die Augen.',
        setsFlags: ['first_impression_formal'],
      },
      {
        id: 'casual',
        text: 'Locker: "Hi! Was ist denn mit meinem Vorgänger passiert?"',
        effects: { relationships: { chef: -5, kollegen: 15 } },
        resultText: 'Bjorg grinst. Chef Bert räuspert sich: "Das... ist eine längere Geschichte. Für später."',
        setsFlags: ['first_impression_casual', 'asked_about_predecessor'],
      },
      {
        id: 'technical',
        text: 'Nerdiger: "Morgen! Welche Infrastruktur habt ihr hier - Windows oder Linux?"',
        effects: { relationships: { chef: 0, kollegen: 20 } },
        resultText: 'Bjorg\' Augen leuchten auf: "Beides! Das ist ja das Problem!" Chef Bert seufzt.',
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
    image: '/images/events/evt_docusnap_einrichtung.webp',
    description: `Bjorg zeigt dir deinen Schreibtisch. Er steht in einer Ecke, umgeben von Kabeln und leeren Red Bull-Dosen.

"Das war Stefans Platz", sagt Bjorg leise. "Er hat's nicht aufgeräumt bevor er... gegangen ist."

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
        resultText: 'Du wirfst alles weg und machst sauber. Chef Bert lobt dich später dafür. Bjorg schaut dich seltsam an.',
      },
    ],
  },

  {
    id: 'adv_first_ticket',
    title: 'Das erste Ticket',
    category: 'story',
    weekRange: [1, 1],
    probability: 1,
    image: '/images/events/evt_ad_passwort.webp',
    description: `*PING* - Das Ticket-System meldet sich.

**Ticket #4721** - DRINGEND
Von: Frau Müller, Buchhaltung
Betreff: INTERNET GEHT NICHT!!!!!

"Der Internet ist kaputt!!!! Ich kann keine E-Mails mehr lesen!!! Das ist ein NOTFALL!!!"

Bjorg lacht leise: "Willkommen in der IT. Das ist übrigens der gleiche PC, der letzte Woche 'explodiert' ist. Und davor 'gehackt' wurde."

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
        text: 'Bjorg holen - du bist doch noch neu',
        effects: { relationships: { kollegen: 5 } },
        resultText: 'Bjorg löst es in 3 Sekunden. "Nur Mut", sagt er. "Das war noch das einfache Level."',
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
    // No image - late night mystery scene, no matching visual
    description: `Es ist Feierabend. Bjorg ist schon gegangen. Du willst gerade herunterfahren, als du etwas bemerkst.

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
        text: 'Bjorg anrufen und ihm davon erzählen',
        effects: { relationships: { kollegen: 10 } },
        resultText: 'Bjorg\' Stimme klingt angespannt: "Zeig mir das morgen. Und... lösch die Nachricht aus dem Browserverlauf, falls du nach Stefans Namen gesucht hast."',
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
    image: '/images/events/evt_kabelschrank.webp',
    description: `Bjorg gibt dir eine Tour durch die Systeme. Es ist... chaotisch.

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
        resultText: 'Bjorg nickt ernst: "Ich weiß. Budget, Zeit, Prioritäten. Der Chef sagt, es läuft doch. Bis es nicht mehr läuft."',
        setsFlags: ['understands_kritis'],
      },
      {
        id: 'practical',
        text: '"Okay, was ist die dringendste Baustelle?"',
        effects: { skills: { troubleshooting: 3 } },
        resultText: '"Alles", sagt Bjorg. "Aber fang mit dem Backup an. Das hat seit 3 Monaten keiner geprüft."',
        setsFlags: ['prioritized_backup'],
      },
      {
        id: 'ignore',
        text: '"Naja, bisher ist ja nichts passiert, oder?"',
        effects: { relationships: { kollegen: -10 } },
        resultText: 'Bjorg\' Gesichtsausdruck wird kühl. "Noch nicht", sagt er leise. "Noch nicht."',
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
    // No image - IoT coffee machine scene, no matching visual
    description: `Im Pausenraum steht eine verchromte Kaffeemaschine. Sie sieht teuer aus. Und sie macht seltsame Geräusche.

"Die spinnt seit Wochen", erklärt Frau Weber aus der Personalabteilung. "Manchmal macht sie Kaffee ohne dass jemand drückt. Letzte Woche hat sie um Mitternacht 47 Tassen Espresso gemacht."

Bjorg flüstert dir zu: "Die ist mit dem Netzwerk verbunden. Für die Statistik, angeblich. Stefan hat behauptet, sie wäre ein Sicherheitsrisiko."

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
        text: 'Bjorg fragen ob er sich drum kümmern kann',
        effects: { relationships: { kollegen: -5 } },
        resultText: 'Bjorg seufzt. "Stefan hat auch immer delegiert. Schau\'s dir wenigstens mal an."',
      },
    ],
  },

  {
    id: 'adv_thomas_warning',
    title: 'Bjorg\' Warnung',
    category: 'story',
    weekRange: [2, 2],
    probability: 1,
    // No image - bar conversation scene, no matching visual
    description: `Bjorg bittet dich nach Feierabend auf ein Bier. Er wirkt nervös.

"Okay, ich sag's dir jetzt, weil ich glaube, du bist anders als die anderen", beginnt er. "Stefan war nicht verrückt. Er hat was gefunden. Etwas im Netzwerk, das nicht da sein sollte."

Er zeigt dir sein Handy. Screenshots von Logs, Netzwerkdiagramme, Notizen.

"Er hat mir das geschickt, bevor er gegangen ist. Hat gesagt, ich soll niemandem vertrauen. Auch nicht dem Chef." Bjorg schluckt. "Dann war er weg. Von einem Tag auf den anderen."`,
    involvedCharacters: ['kollege'],
    tags: ['story', 'chapter2', 'revelation'],
    choices: [
      {
        id: 'believe',
        text: '"Zeig mir alles. Ich glaube dir."',
        effects: { relationships: { kollegen: 20 } },
        resultText: 'Bjorg atmet aus. "Endlich jemand. Okay, pass auf..." Er beginnt zu erklären. Es ist komplizierter als du dachtest.',
        setsFlags: ['thomas_ally', 'knows_stefans_findings'],
      },
      {
        id: 'skeptical',
        text: '"Das klingt nach Paranoia. Bist du sicher?"',
        effects: { relationships: { kollegen: -5 } },
        resultText: 'Bjorg\' Gesicht verschließt sich. "Vergiss es. War dumm von mir." Er zahlt und geht.',
        setsFlags: ['doubted_thomas'],
      },
      {
        id: 'careful',
        text: '"Lass uns vorsichtig sein. Wer weiß noch davon?"',
        effects: { relationships: { kollegen: 15 }, skills: { security: 2 } },
        resultText: '"Nur wir", sagt Bjorg. "Und Stefan, wo auch immer er ist." Er schaut sich um. "Lass uns woanders reden."',
        setsFlags: ['careful_approach', 'thomas_partner', 'thomas_ally'],
      },
    ],
  },

  {
    id: 'adv_strange_logs',
    title: 'Die Nacht-Logs',
    category: 'story',
    weekRange: [2, 2],
    probability: 1,
    image: '/images/events/evt_docusnap_einrichtung.webp',
    description: `Du hast Bjorg' Hinweise befolgt und die Logs der letzten Wochen analysiert. Was du findest, ist... beunruhigend.

Jede Nacht, zwischen 02:00 und 04:00:
- Kleine Datenpakete werden nach außen gesendet
- Ein Prozess mit dem Namen "svchost_helper.exe" startet
- Die Firewall-Logs zeigen Löcher, die es nicht geben sollte

Das ist kein Bug. Das ist ein Muster. Jemand sammelt Daten. Systematisch.

Bjorg steht hinter dir. "Stefan hat das auch gefunden", flüstert er. "Drei Tage später war er weg."`,
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
        resultText: 'Chef Bert hört zu, nickt, und sagt: "Das ist bestimmt ein Fehlalarm. Unsere IT ist sicher." Du bist nicht überzeugt.',
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
    image: '/images/events/evt_ad_passwort.webp',
    description: `"DER DRUCKER DRUCKT WIEDER VON SELBST!"

Die Panik-Mail kommt von der 3. Etage. Als du dort ankommst, sieht es aus wie in einem Papierhagel. Hunderte von Seiten. Alle mit dem gleichen Inhalt:

Eine Rechnung. Für "Beratungsdienstleistungen". An eine Firma namens "GHOST LLC". Betrag: 0,00 Euro.

Bjorg steht schon da und schaut sich die Blätter an. "Das ist neu", sagt er leise. "Stefan hatte Recht. Sie werden dreister."`,
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
        resultText: 'Du sammelst die Blätter ein und sagst "Papierstau". Aber Bjorg schaut dich an, als wärst du verrückt geworden.',
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
    description: `Chef Bert stürmt ins IT-Büro. "DIE PRÄSENTATION! Der Bürgermeister kommt in 30 MINUTEN und PowerPoint stürzt ab!"

Bjorg verdreht die Augen. Du gehst mit runter ins Chefbüro.

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
    description: `Es ist 23:00. Bjorg und du sitzt noch im Büro. Kaffee ist leer, Pizza ist kalt.

"Was haben wir?", fragt Bjorg.

Du zählst auf:
- Mysteriöse Prozesse die Daten exfiltrieren
- Kompromittierte Accounts
- Ein verschwundener Vorgänger
- Ein Chef der nichts hören will
- Und ein Datum: In zwei Wochen soll irgendwas passieren

Bjorg reibt sich die Augen. "Wir sollten zum BSI gehen", sagt er. "Das ist zu groß für uns."

Aber dann fällt dir ein: Wenn jemand Admin-Zugang hat, kann er auch mitlesen. Jede Mail. Jeder Chat. Jede Datei.

Ihr seid nicht allein in diesem Netzwerk.`,
    involvedCharacters: ['kollege'],
    tags: ['story', 'chapter3', 'decision'],
    choices: [
      {
        id: 'go_offline',
        text: 'Ab jetzt nur noch offline kommunizieren',
        effects: { skills: { security: 3 } },
        resultText: '"Burner Phones", sagt Bjorg. "Wie im Film." Ihr lacht, aber keiner findet es lustig.',
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

Bjorg steht Wache oben. "Beeil dich", sagt er über Funk. "Der Chef macht um 14 Uhr seine Runde."

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
    image: '/images/events/evt_lizenzfrage.webp',
    description: `Die wichtigsten Dateien sind verschlüsselt. AES-256. Ohne Passwort kommst du nicht rein.

Stefan hat aber einen Hinweis hinterlassen - typisch für einen Paranoiden:

"Das Passwort ist, wo ich jeden Tag hingegangen bin, wenn ich die Wahrheit brauchte."

Bjorg runzelt die Stirn. "Das könnte alles sein. Die Kantine? Das Klo? Der Raucherbereich?"

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
        text: '"Bjorg, du kanntest Stefan. Wo ist er immer hin?"',
        effects: { relationships: { kollegen: 5 } },
        resultText: '"Zum Rauchen auf\'s Dach", sagt Bjorg. "Obwohl er gar nicht raucht." Du versuchst "DACHTERASSE". RICHTIG!',
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
        resultText: 'Du gehst zu Chef Bert. "Wir müssen reden." Sein Gesichtsausdruck verrät nichts. Aber seine Hände zittern.',
        setsFlags: ['confronted_suspect', 'showed_hand'],
      },
      {
        id: 'gather_more',
        text: 'Noch mehr Beweise sammeln bevor du handelst',
        effects: { skills: { security: 5 } },
        resultText: 'Du kopierst alles dreifach. Eine Kopie für dich, eine für Bjorg, eine für das BSI. Sicher ist sicher.',
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
        resultText: 'Du sitzt da und starrst auf den Bildschirm. Bjorg legt dir eine Hand auf die Schulter. "Wir schaffen das", sagt er. Du bist dir nicht sicher.',
        setsFlags: ['overwhelmed'],
      },
      {
        id: 'determined',
        text: 'Dann müssen wir sie aufhalten. Wir haben zwei Wochen.',
        effects: { skills: { security: 3, softSkills: 3 } },
        resultText: '"Plan?", fragt Bjorg. "Wir brauchen einen Plan." Ihr fangt an zu schreiben. Es wird eine lange Nacht.',
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

Bjorg seufzt. "Stefan war immer paranoid. Aber vielleicht hatte er Recht."

Ihr steht wieder am Anfang. Die Hinweise, die ihr habt, sind vage. Die Nacht-Logs, die mysteriösen Prozesse, das komische Gefühl.

"Wir müssen woanders suchen", sagt Bjorg. "Stefan hat bestimmt noch mehr hinterlassen."`,
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

  // ─── Kapitel 5: Zufälle gibt es nicht ───
  {
    id: 'adv_thomas_confession',
    title: 'Bjorgs Geständnis',
    category: 'story',
    weekRange: [5, 5],
    probability: 1,
    description: `Bjorg schließt die Bürotür. Zum ersten Mal seit Wochen sieht er dir direkt in die Augen.

"Ich muss dir was sagen. Und du wirst sauer sein." Er legt einen USB-Stick auf den Tisch. "Stefan hat mir nicht nur ein paar Screenshots geschickt. Er hat mir ALLES geschickt. Sein ganzes Dossier. Vor Wochen."

Er schluckt. "Ich hatte Angst. Nach dem, was mit ihm passiert ist... ich hab's einfach liegen lassen und gehofft, es löst sich von selbst."

Er schiebt dir den Stick zu. "Da drauf ist alles. Und das Schlimmste: Stefan war sich sicher, dass jemand hier im Haus mitspielt. Ein Insider. Und sein Countdown — der läuft in Tagen ab, nicht Wochen."`,
    involvedCharacters: ['kollege'],
    tags: ['story', 'chapter5', 'act2', 'revelation'],
    choices: [
      {
        id: 'take_dossier',
        text: '"Gib her. Ab jetzt machen wir das zusammen — keine Geheimnisse mehr."',
        effects: { relationships: { kollegen: 15 }, skills: { security: 3 } },
        resultText: 'Bjorg nickt, sichtlich erleichtert. Ihr öffnet das Dossier gemeinsam. Es ist erschreckend vollständig — und erschreckend nah dran.',
        setsFlags: ['has_stefan_dossier', 'knows_attack_imminent'],
      },
      {
        id: 'angry_hid',
        text: '"Du hast das WOCHENLANG zurückgehalten? Während wir im Dunkeln getappt sind?!"',
        effects: { relationships: { kollegen: -10 }, stress: 10 },
        resultText: 'Bjorg zuckt zusammen. "Du hast ja recht. Es tut mir leid." Die Anspannung bleibt — aber das Dossier ist endlich da, und das zählt jetzt mehr.',
        setsFlags: ['has_stefan_dossier', 'knows_attack_imminent'],
      },
      {
        id: 'who_insider',
        text: '"Ein Insider. Denk nach, Bjorg — wer hatte Zugriff, als Stefan verschwand?"',
        effects: { skills: { security: 5 } },
        resultText: 'Bjorg wird blass. "Ich... ich will da niemanden vorschnell verdächtigen." Aber die Frage steht jetzt im Raum. Und ihr werdet sie beantworten müssen.',
        setsFlags: ['has_stefan_dossier', 'knows_attack_imminent', 'suspects_insider'],
        teachingMoment: 'Insider-Bedrohungen sind besonders gefährlich, weil legitime Zugänge missbraucht werden. Wer Zugriff hatte, ist die erste Frage jeder Untersuchung.',
      },
    ],
  },
  {
    id: 'adv_news_report',
    title: 'Eilmeldung',
    category: 'story',
    weekRange: [5, 5],
    probability: 1,
    description: `Im Pausenraum läuft der Nachrichtensender. Du bleibst stehen.

"...die Stadtwerke im Nachbarkreis. Seit heute Morgen sind tausende Haushalte ohne sauberes Trinkwasser. Die Behörden sprechen von einem 'technischen Defekt', doch nach Informationen unserer Redaktion deutet vieles auf einen gezielten Cyberangriff hin..."

Du erkennst es sofort. Das Muster. Dieselbe Handschrift wie in deinen Logs. Es ist keine Theorie mehr. Es passiert. Und es kommt näher.`,
    involvedCharacters: [],
    tags: ['story', 'chapter5', 'act2'],
    choices: [
      {
        id: 'correlate',
        text: 'Die Meldung mit deiner Timeline und den C2-Indikatoren abgleichen',
        effects: { skills: { security: 5 } },
        resultText: 'Die Zeitstempel, die Signatur, die IP-Bereiche — alles passt. Du hast jetzt einen unabhängigen Beleg für dasselbe Muster. Das ist mehr als ein Bauchgefühl.',
        setsFlags: ['confirmed_pattern', 'sees_full_scope'],
        teachingMoment: 'Öffentliche Vorfälle mit eigenen Beobachtungen zu korrelieren (Threat Intelligence) verwandelt einen Verdacht in einen belastbaren Befund.',
      },
      {
        id: 'warn_utility',
        text: 'Das betroffene Werk anonym kontaktieren und vor der Signatur warnen',
        effects: { skills: { softSkills: 3 } },
        resultText: 'Du schickst eine anonyme, präzise Warnung mit den Indikatoren. Eine Stunde später eine knappe Antwort: "Danke. Woher wissen Sie das?" Du antwortest nicht.',
        setsFlags: ['warned_utility', 'sees_full_scope'],
      },
      {
        id: 'realize_scope',
        text: 'Dir wird kalt: Wasser hier, Strom woanders — das ist koordiniert',
        effects: { stress: 10 },
        resultText: 'Du setzt dich. Das Ausmaß trifft dich mit voller Wucht. Das ist kein einzelner Angreifer auf eurer kleinen IT. Das ist eine Kampagne. Und ihr seid mittendrin.',
        setsFlags: ['attack_accelerating', 'sees_full_scope'],
      },
    ],
  },
  {
    id: 'adv_connecting_dots',
    title: 'Alles ergibt einen Sinn',
    category: 'story',
    weekRange: [5, 5],
    probability: 1,
    description: `Nachts im Büro. Ihr habt alles an die Wand gepinnt: Stefans Dossier, die Nacht-Logs, der C2-Server, die Eilmeldung, eure Timeline. Fäden dazwischen.

Und plötzlich ergibt es ein Bild. Kein Chaos — ein Plan. Die "Pannen" der letzten Wochen waren Tests: Wie schnell reagiert ihr? Was fällt euch auf? Was nicht?

Bjorg flüstert: "Wir waren nie das Ziel. Wir waren die Generalprobe." Stefans Countdown läuft. In wenigen Tagen wird aus der Probe der Ernstfall — überall gleichzeitig.

Die Frage ist nur noch: Was macht ihr jetzt damit?`,
    involvedCharacters: ['kollege'],
    tags: ['story', 'chapter5', 'act2', 'climax'],
    choices: [
      {
        id: 'plan_defense',
        text: 'Erst die eigenen Systeme härten — jede gewonnene Stunde zählt',
        effects: { skills: { security: 4, troubleshooting: 3 }, compliance: 5, stress: 5 },
        resultText: 'Ihr fangt sofort an: Segmentierung, Notfall-Accounts, Offline-Backups. Wenn es losgeht, wollt ihr nicht unvorbereitet sein.',
        setsFlags: ['hardening_started', 'sees_full_scope'],
        teachingMoment: 'Auch ohne die Angreifer stoppen zu können, reduziert Härtung (Segmentierung, MFA, getestete Backups) den Schaden im Ernstfall erheblich.',
      },
      {
        id: 'go_authorities',
        text: '"Das ist zu groß für uns. Das gehört sofort zu den Behörden."',
        effects: { skills: { softSkills: 3 } },
        resultText: 'Bjorg ist unsicher. "Stefan hat das versucht. Schau, wie das für ihn ausging." Aber du hast einen Punkt: Allein stoppt ihr eine Kampagne nicht.',
        setsFlags: ['wants_official', 'sees_full_scope'],
      },
      {
        id: 'trust_no_system',
        text: '"Stefan wurde verraten. Wir trauen niemandem — wir machen das selbst."',
        effects: { skills: { security: 3 }, stress: 8 },
        resultText: '"Einverstanden", sagt Bjorg leise. "Aber wenn der Insider mitliest, müssen wir ab jetzt vorsichtig sein. Sehr vorsichtig."',
        setsFlags: ['wants_solo', 'sees_full_scope'],
      },
    ],
  },

  // ─── Kapitel 6: Wem vertraust du? ───
  {
    id: 'adv_evidence_gathered',
    title: 'Die Beweismappe',
    category: 'story',
    weekRange: [6, 6],
    probability: 1,
    description: `Es liegt alles vor dir: eine lückenlose Mappe, die einen koordinierten Angriff auf die kritische Infrastruktur der Region belegt. Logs, Korrelationen, Stefans Dossier, die Eilmeldung.

Es ist genug. Es ist sogar mehr als genug.

Bjorg betrachtet den Stapel. "Das reicht", sagt er. "Aber reicht es WEM? Stefan hatte auch genug. Und schau, wo ihn das hingebracht hat."

Bevor du irgendwem irgendwas zeigst, musst du diese Beweise schützen — und entscheiden, wem du sie überhaupt anvertraust.`,
    involvedCharacters: ['kollege'],
    tags: ['story', 'chapter6', 'act2'],
    choices: [
      {
        id: 'secure_evidence',
        text: 'Die Beweise verschlüsseln und eine Offline-Kopie an einem sicheren Ort hinterlegen',
        effects: { skills: { security: 5 }, stress: -3 },
        resultText: 'Verschlüsselt, kopiert, weggeschlossen. Was auch passiert — die Beweise sind nicht mehr nur in einem Kopf und auf einem Rechner. Stefans Fehler wiederholst du nicht.',
        setsFlags: ['evidence_secured'],
        teachingMoment: 'Beweise und Whistleblower-Material gehören verschlüsselt und redundant gesichert — eine Kopie außerhalb des Zugriffs der Gegenseite ist überlebenswichtig.',
      },
      {
        id: 'organize_report',
        text: 'Alles zu einem sauberen, meldefähigen Bericht ordnen',
        effects: { skills: { softSkills: 4 }, compliance: 5 },
        resultText: 'Du gießt das Chaos in eine klare Struktur: Was, wann, woher, mit welcher Sicherheit. Ein Bericht, den eine Behörde ernst nehmen muss.',
        setsFlags: ['report_ready'],
      },
      {
        id: 'share_ally',
        text: 'Eine Kopie still einer Vertrauensperson außerhalb des Hauses geben',
        effects: { relationships: { kollegen: 5 } },
        resultText: 'Eine alte Studienfreundin, weit weg, kein Bezug zur Sache. "Wenn ich mich drei Tage nicht melde, schick das an diese Adresse." Eine Lebensversicherung aus Papier.',
        setsFlags: ['evidence_shared'],
      },
    ],
  },
  {
    id: 'adv_chef_confrontation',
    title: 'Die Konfrontation',
    category: 'story',
    weekRange: [6, 6],
    probability: 1,
    description: `Du legst Chef Bert die Mappe auf den Schreibtisch. Er blättert, wird blasser, schiebt sie weg.

"Sehen Sie... das ist..." Er räuspert sich. "Das ist eine Nummer zu groß für uns. Wir sind ein kommunales Stadtwerk, kein Geheimdienst. Vielleicht ist das auch alles nur ein Missverständnis. Lassen Sie uns nichts überstürzen."

Bjorg neben dir spannt sich an. Du spürst es: Das hier ist der Moment. Gehst du den offiziellen Weg — über den Chef, sauber, dokumentiert? Oder hat Bert gerade bewiesen, dass auf den Dienstweg kein Verlass ist?`,
    involvedCharacters: ['chef', 'kollege'],
    tags: ['story', 'chapter6', 'act2', 'decision'],
    choices: [
      {
        id: 'official_route',
        text: 'Den Dienstweg gehen: Bert einbinden und gemeinsam offiziell ans BSI melden',
        effects: { relationships: { chef: 8 }, compliance: 10, stress: 5 },
        resultText: 'Du bleibst hartnäckig und sachlich, bis Bert einlenkt. "Also gut. Aber das machen wir RICHTIG, mit allem Drum und Dran." Der offizielle Weg ist eingeschlagen.',
        setsFlags: ['chose_official_route', 'chef_informed'],
        teachingMoment: 'Der dokumentierte Meldeweg (Vorgesetzte → BSI nach §8b BSIG / NIS2) schützt dich rechtlich und sorgt dafür, dass die Meldung nicht an einer Einzelperson hängt.',
      },
      {
        id: 'go_solo',
        text: 'Bert hat sich gerade disqualifiziert — das ziehst du mit Bjorg allein durch',
        effects: { relationships: { chef: -5 }, stress: 6 },
        resultText: 'Du nickst freundlich und sagst nichts mehr. In Gedanken hast du Bert schon abgeschrieben. Wenn der Insider Zugang zur Führungsebene hat, ist Schweigen sicherer.',
        setsFlags: ['distrust_chef', 'going_solo'],
      },
      {
        id: 'pressure_chef',
        text: 'Bert unter Druck setzen: "Wenn das rauskommt und wir nichts getan haben — wer haftet dann?"',
        effects: { relationships: { chef: -10 }, skills: { softSkills: 3 }, stress: 6 },
        resultText: 'Bert wird wütend, dann nachdenklich, dann ausweichend. Er verspricht "drüber zu schlafen". Du weißt: Auf den ist kein Verlass. Du musst selbst handeln.',
        setsFlags: ['pressured_chef', 'going_solo'],
      },
    ],
  },
  {
    id: 'adv_bsi_contact',
    title: 'Der Anruf beim BSI',
    category: 'story',
    weekRange: [6, 6],
    probability: 1,
    description: `Ihr meldet offiziell. Stefans letzter Versuch endete mit einem abgebrochenen Anruf und einem "Unfall" — also macht ihr es diesmal richtig.

Eine echte Ansprechpartnerin beim BSI, Frau Dr. Reinhardt, hört zu. Erst routiniert, dann immer aufmerksamer. "Diese Signatur... die haben wir diese Woche schon zweimal gesehen. Wo sagten Sie, sitzen Sie?"

Zum ersten Mal hast du das Gefühl, nicht allein gegen eine Wand zu reden.`,
    involvedCharacters: ['chef'],
    tags: ['story', 'chapter6', 'act2', 'official'],
    choices: [
      {
        id: 'formal_report',
        text: 'Formell nach Meldepflicht melden — vollständig dokumentiert',
        effects: { skills: { security: 4, softSkills: 3 }, compliance: 15, stress: -3 },
        resultText: 'Aktenzeichen, Ansprechpartnerin, dokumentierter Eingang. Was auch kommt: Es ist jetzt offiziell aktenkundig. Frau Reinhardt verspricht, sich zu melden — und diesmal glaubst du es.',
        setsFlags: ['bsi_notified', 'official_record'],
        teachingMoment: 'KRITIS-Betreiber sind nach §8b BSIG / NIS2 meldepflichtig. Eine formale, dokumentierte Meldung mit Aktenzeichen ist Pflicht — und der beste Eigenschutz.',
      },
      {
        id: 'encrypted_channel',
        text: 'Über einen verschlüsselten Kanal nachreichen — vorsichtiger, als Stefan war',
        effects: { skills: { security: 6 }, compliance: 8 },
        resultText: 'Du übermittelst das Dossier verschlüsselt, nur für sie lesbar. "Klug", sagt sie. "Sie haben aus etwas gelernt." Sie weiß nicht, woraus. Du erzählst es ihr nicht.',
        setsFlags: ['bsi_notified', 'careful_contact'],
      },
      {
        id: 'demand_escalation',
        text: 'Auf sofortige Eskalation drängen — der Countdown läuft in Tagen ab',
        effects: { relationships: { gf: 8 }, stress: 10 },
        resultText: 'Du machst klar, wie wenig Zeit bleibt. Sie wird ernst. "Wenn Ihr Zeitfenster stimmt, ist das hier Priorität. Ich ziehe das hoch." Räder beginnen sich zu drehen.',
        setsFlags: ['bsi_notified', 'escalated'],
      },
    ],
  },
  {
    id: 'adv_solo_investigation',
    title: 'Im Alleingang',
    category: 'story',
    weekRange: [6, 6],
    probability: 1,
    description: `Kein Dienstweg. Keine Behörde, von der ihr nicht wisst, wer mithört. Nur ihr beide.

Bjorg ist nervös, aber entschlossen. "Okay. Dann machen wir das wie Stefan — nur schlauer. Wir bleiben unsichtbar, wir sammeln, und wir schlagen erst zu, wenn wir müssen."

Ihr richtet euch ein: ein abgeschotteter Laptop, der nie ins Firmennetz geht. Ein zweites, stilles Auge auf dem Datenverkehr. Und die Regel: Niemand sonst erfährt etwas.`,
    involvedCharacters: ['kollege'],
    tags: ['story', 'chapter6', 'act2', 'solo'],
    choices: [
      {
        id: 'covert_monitoring',
        text: 'Den C2-Verkehr heimlich mitschneiden, ohne die Angreifer zu alarmieren',
        effects: { skills: { security: 6, netzwerk: 4 }, stress: 5 },
        resultText: 'Ein passiver Mirror-Port, kein aktiver Scan, nichts, das auffällt. Ihr seht, ohne gesehen zu werden. Langsam zeichnet sich ab, wann der Angriff kommt.',
        setsFlags: ['covert_ops', 'watching_c2'],
        teachingMoment: 'Passives Monitoring (z. B. ein Mirror-/SPAN-Port) beobachtet einen Angreifer, ohne ihn zu warnen — aktives Scannen würde verraten, dass jemand hinschaut.',
      },
      {
        id: 'build_case',
        text: 'In aller Stille eine wasserdichte Beweiskette für den entscheidenden Moment aufbauen',
        effects: { skills: { security: 4 }, compliance: 5 },
        resultText: 'Jeder Fund sauber gesichert, mit Zeitstempel und Hash. Wenn der Moment kommt, in dem ihr jemanden überzeugen müsst, habt ihr nicht nur eine Geschichte — ihr habt Beweise.',
        setsFlags: ['building_case'],
      },
      {
        id: 'recruit_allies',
        text: 'Heimlich ein, zwei absolut Vertraute einweihen',
        effects: { relationships: { kollegen: 8 }, stress: -3 },
        resultText: 'Zu zweit gegen eine Kampagne ist zu wenig. Vorsichtig weiht ihr zwei Leute ein, denen ihr das Leben anvertrauen würdet. Aus zwei werden vier. Es fühlt sich weniger einsam an.',
        setsFlags: ['has_allies'],
      },
    ],
  },
  {
    id: 'adv_point_of_no_return',
    title: 'Kein Zurück mehr',
    category: 'story',
    weekRange: [6, 6],
    probability: 1,
    description: `Es ist spät, als die Nachricht auf deinem privaten Handy aufploppt. Unbekannte Nummer.

"Neugierige Azubis werden selten alt. Frag Stefan."

Dein Blut gefriert. Sie wissen, dass du gräbst. Genau wie bei ihm. Die Probezeit, die du angetreten hast, um Drucker zu reparieren, ist zu etwas ganz anderem geworden.

Du könntest jetzt noch aufhören. Wegsehen. Den Kopf einziehen. Oder du gehst dahin, wo Stefan aufhören musste.`,
    involvedCharacters: ['kollege'],
    tags: ['story', 'chapter6', 'act2', 'climax'],
    choices: [
      {
        id: 'all_in',
        text: '"Jetzt erst recht." — Du bist drin, bis zum Ende',
        effects: { skills: { security: 3 }, stress: 10 },
        resultText: 'Die Angst ist da, aber sie lähmt dich nicht mehr — sie schärft dich. Sie haben gerade den falschen Menschen bedroht. Du machst weiter.',
        setsFlags: ['committed', 'point_of_no_return'],
      },
      {
        id: 'protect_others',
        text: 'Zuerst dafür sorgen, dass Bjorg und die anderen sicher sind',
        effects: { relationships: { kollegen: 12 }, stress: 5 },
        resultText: 'Bevor du irgendetwas riskierst, sorgst du dafür, dass die anderen geschützt und ihre Spuren verwischt sind. Wenn das hier schiefgeht, soll es nur dich treffen.',
        setsFlags: ['protected_allies', 'point_of_no_return'],
      },
      {
        id: 'steel_self',
        text: 'Tief durchatmen — du machst weiter, wo Stefan aufhören musste',
        effects: { skills: { security: 5 }, stress: -5 },
        resultText: 'Du liest die Drohung noch einmal, ruhig diesmal. Dann löschst du sie. Stefan hat dir den Weg gezeigt. Du wirst ihn zu Ende gehen — vorsichtiger, aber bis zum Schluss.',
        setsFlags: ['point_of_no_return', 'stefans_legacy'],
      },
    ],
  },

  // ─── Kapitel 7: Eskalation ───
  {
    id: 'adv_targeted_phishing',
    title: 'Maßgeschneidert',
    category: 'story',
    weekRange: [7, 7],
    probability: 1,
    description: `Die Mail ist perfekt. Kein Tippfehler, kein generisches "Sehr geehrter Kunde". Sie spricht dich mit Namen an, nennt ein internes Projekt, das nur eine Handvoll Leute kennt, und hängt sich an einen echten Vorgang von letzter Woche.

Nur der Link am Ende führt nicht dahin, wo er behauptet.

Das ist kein Massen-Phishing. Das ist auf DICH zugeschnitten. Und die Details darin — die hat ihnen jemand von innen gegeben.`,
    involvedCharacters: [],
    tags: ['story', 'chapter7', 'act2'],
    choices: [
      {
        id: 'analyze_headers',
        text: 'Die Mail forensisch zerlegen — Header, Link-Ziel, Metadaten',
        effects: { skills: { security: 5, netzwerk: 2 } },
        resultText: 'Die Header verraten einen Relay-Server, der Link eine frisch registrierte Domain. Es ist professionell — aber nicht spurlos. Du sicherst alles.',
        setsFlags: ['analyzed_phish'],
        teachingMoment: 'E-Mail-Header und Link-Ziele (ohne zu klicken) verraten Herkunft und Infrastruktur eines Angriffs — die Basis jeder Phishing-Analyse.',
      },
      {
        id: 'dont_click_report',
        text: 'Nicht klicken, sichern und als gezielten Angriff dokumentieren',
        effects: { skills: { security: 3 }, compliance: 5 },
        resultText: 'Du behandelst es als das, was es ist: einen Spear-Phishing-Angriff mit Insider-Wissen. Sauber dokumentiert, gemeldet, eskaliert.',
        setsFlags: ['reported_phish'],
      },
      {
        id: 'bait_back',
        text: 'Eine kontrollierte Antwort senden, um mehr über sie herauszufinden',
        effects: { skills: { security: 4 }, stress: 10 },
        resultText: 'Riskant, aber du gibst nur Brotkrumen preis. Ihre Antwort kommt schnell — zu schnell. Jemand sitzt direkt am anderen Ende und beobachtet euch genau.',
        setsFlags: ['engaged_attacker'],
      },
    ],
  },
  {
    id: 'adv_insider_threat',
    title: 'Der Maulwurf',
    category: 'story',
    weekRange: [7, 7],
    probability: 1,
    description: `Die Mail wusste Dinge, die nur wenige wissen. Ihr setzt euch hin und macht eine Liste: Wer hatte Zugriff auf dieses Projekt, diese Termine, diese Details?

Die Liste ist kurz. Und unangenehm. Es sind Kollegen. Menschen, an denen du jeden Tag vorbeigehst.

Bjorg reibt sich die Augen. "Stefan hat es geahnt. Deshalb hat er niemandem getraut. Jetzt verstehe ich, warum."`,
    involvedCharacters: ['kollege'],
    tags: ['story', 'chapter7', 'act2'],
    choices: [
      {
        id: 'quiet_audit',
        text: 'Still die Zugriffslogs der Verdächtigen prüfen — niemanden vorwarnen',
        effects: { skills: { security: 6 }, stress: 5 },
        resultText: 'Ohne Aufsehen gehst du die Logs durch. Anmeldezeiten, Dateizugriffe, Berechtigungsänderungen. Ein Muster beginnt sich abzuzeichnen — bei einem Konto.',
        setsFlags: ['auditing_insider'],
        teachingMoment: 'Einen vermuteten Insider niemals vorwarnen: diskrete Log-Auswertung sichert Beweise, bevor jemand Spuren verwischen kann.',
      },
      {
        id: 'confide_bjorg',
        text: 'Den Verdacht nur mit Bjorg teilen und gemeinsam einen Plan machen',
        effects: { relationships: { kollegen: 8 } },
        resultText: 'Zu zweit tragt ihr die Last. "Wir machen keinen Fehler aus Wut", sagt Bjorg. "Wir brauchen Gewissheit, keine Vermutung." Er hat recht.',
        setsFlags: ['insider_plan'],
      },
      {
        id: 'suspect_bjorg',
        text: 'Ein kalter Gedanke: Wie viel weißt du eigentlich wirklich über Bjorg?',
        effects: { stress: 8 },
        resultText: 'Du schaust ihn an und hasst dich für den Gedanken. Aber er war von Anfang an dabei. Er hatte Stefans Dossier. Er wusste alles zuerst. Du sagst nichts — und vertraust ab jetzt ein bisschen weniger.',
        setsFlags: ['doubts_bjorg'],
      },
    ],
  },
  {
    id: 'adv_unexpected_ally',
    title: 'Hilfe von unerwarteter Seite',
    category: 'story',
    weekRange: [7, 7],
    probability: 1,
    description: `Eine Nachricht über einen Kanal, den du kaum noch nutzt. Absender: die IT-Leiterin des Nachbar-Stadtwerks — das, dessen Wasserversorgung getroffen wurde.

"Jemand hat uns vor ein paar Wochen anonym gewarnt. Wir waren vorbereiteter als die anderen. Ich glaube, das waren Sie. Wir sind nicht die Einzigen, die zurückschlagen wollen. Reden wir?"

Zum ersten Mal seit Wochen kommt Hilfe — von außen, ungefragt.`,
    involvedCharacters: [],
    tags: ['story', 'chapter7', 'act2'],
    choices: [
      {
        id: 'verify_first',
        text: 'Erst über einen zweiten Weg prüfen, ob der Kontakt echt ist',
        effects: { skills: { security: 5 } },
        resultText: 'Du rufst die offizielle Nummer des Werks an und lässt dich durchstellen. Sie ist echt. In einer Lage voller Fallen ist das die wichtigste Bestätigung.',
        setsFlags: ['has_external_ally', 'verified_ally'],
        teachingMoment: 'Unerwartete Kontakte in einer Krise immer über einen zweiten, unabhängigen Kanal verifizieren — bevor man irgendetwas teilt.',
      },
      {
        id: 'accept_help',
        text: 'Das Angebot annehmen und Indikatoren austauschen',
        effects: { skills: { security: 4 }, relationships: { fachabteilung: 5 } },
        resultText: 'Ihr teilt Signaturen, IPs, Zeitfenster. Was sie gesehen hat, schließt Lücken in eurem Bild. Aus zwei isolierten Opfern wird ein Netzwerk von Verteidigern.',
        setsFlags: ['has_external_ally', 'allied_utility'],
      },
      {
        id: 'cautious_share',
        text: 'Vorsichtig kooperieren, aber nicht alles preisgeben',
        effects: { skills: { security: 3 }, stress: 3 },
        resultText: 'Du gibst, was hilft, und behältst, was schützt. Sie versteht das. "Vorsicht ist gut. Genau deshalb leben wir beide noch."',
        setsFlags: ['has_external_ally', 'cautious_alliance'],
      },
    ],
  },

  // ─── Kapitel 8: Die Ruhe vor dem Sturm ───
  {
    id: 'adv_false_peace',
    title: 'Zu ruhig',
    category: 'story',
    weekRange: [8, 8],
    probability: 1,
    description: `Tage vergehen. Nichts. Keine Phishing-Mails, keine seltsamen Logs, keine nächtlichen Verbindungen. Die Systeme laufen stabil. Sauber. Perfekt.

Genau das macht dich nervös.

Bjorg läuft im Serverraum auf und ab. "Das gefällt mir nicht. Vor einem Sturm wird's immer ganz still. Sie sind nicht weg. Sie laden nach."`,
    involvedCharacters: ['kollege'],
    tags: ['story', 'chapter8', 'act2'],
    choices: [
      {
        id: 'stay_vigilant',
        text: 'Wachsam bleiben: Monitoring hochfahren, jeden Alarm ernst nehmen',
        effects: { skills: { security: 5, netzwerk: 2 }, stress: 5 },
        resultText: 'Du drehst die Empfindlichkeit hoch und richtest dir eine 24/7-Sicht ein. Wenn es losgeht, willst du es in der ersten Sekunde sehen, nicht in der ersten Stunde.',
        setsFlags: ['heightened_alert'],
        teachingMoment: 'Eine plötzliche Stille während einer laufenden Kampagne bedeutet oft Vorbereitung (Staging), nicht Rückzug.',
      },
      {
        id: 'use_time_harden',
        text: 'Die Ruhe nutzen, um die letzten Lücken zu schließen',
        effects: { skills: { security: 4 }, compliance: 5, stress: 3 },
        resultText: 'Patches, Segmentgrenzen, Notfall-Zugänge. Jede Stunde Ruhe steckst du in eine Lücke weniger. Geschenkte Zeit verschenkt man nicht.',
        setsFlags: ['extra_hardening'],
      },
      {
        id: 'brief_relief',
        text: 'Kurz durchatmen — ihr habt die Pause verdient',
        effects: { stress: -10 },
        resultText: 'Ihr gönnt euch einen Abend ohne Bildschirme. Es tut gut. Aber im Hinterkopf tickt die Uhr weiter.',
        setsFlags: ['took_breath'],
      },
    ],
  },
  {
    id: 'adv_preparation_check',
    title: 'Sind wir bereit?',
    category: 'story',
    weekRange: [8, 8],
    probability: 1,
    description: `Ihr geht die Liste durch. Die, die ihr nie machen wolltet, aber jetzt braucht.

Backups — offline, getrennt, getestet? Segmentierung — hält sie? Notfallplan — wer ruft wen, in welcher Reihenfolge, mit welcher Nummer?

Es ist die Generalprobe, die niemand will. Und sie zeigt Lücken.`,
    involvedCharacters: ['kollege'],
    tags: ['story', 'chapter8', 'act2'],
    choices: [
      {
        id: 'test_restore',
        text: 'Einen echten Restore-Test fahren — kein Vertrauen ohne Beweis',
        effects: { skills: { security: 4, troubleshooting: 5 }, stress: 5 },
        resultText: 'Ihr spielt ein Backup auf ein Testsystem zurück. Es funktioniert — fast. Zwei Dateien fehlen, ihr fixt es. Jetzt wisst ihr, dass es wirklich funktioniert.',
        setsFlags: ['restore_tested', 'ready_backups'],
        teachingMoment: 'Ein ungetestetes Backup ist eine Hoffnung; ein getesteter Restore ist ein Plan. Genau jetzt, nicht im Ernstfall, testet man das.',
      },
      {
        id: 'ir_runbook',
        text: 'Den Notfallplan durchgehen und Rollen klar verteilen',
        effects: { skills: { softSkills: 4 }, compliance: 5 },
        resultText: 'Wer isoliert, wer kommuniziert, wer meldet. Ihr schreibt es auf, mit Namen und Nummern. Im Chaos wird niemand mehr überlegen müssen, wer was tut.',
        setsFlags: ['ir_ready'],
      },
      {
        id: 'isolate_crown_jewels',
        text: 'Die wichtigsten Systeme noch strenger isolieren',
        effects: { skills: { netzwerk: 5, security: 3 }, stress: 3 },
        resultText: 'Die Kronjuwelen — Wasserversorgung, Abrechnung, Bürgerdaten — bekommen die strengste Zone. Selbst wenn der Rest fällt, sollen die stehen bleiben.',
        setsFlags: ['crown_jewels_isolated'],
      },
    ],
  },
  {
    id: 'adv_thomas_flashback',
    title: 'Schon einmal gesehen',
    category: 'story',
    weekRange: [8, 8],
    probability: 1,
    description: `Spät am Abend, nur ihr beide. Bjorg wird still, dann fängt er an zu erzählen.

"Vor zehn Jahren. Anderer Arbeitgeber, ein Energieversorger. Ich hab Warnzeichen gesehen und gemeldet. Sie haben mich ausgelacht. 'Wer soll uns schon angreifen?'"

Er schaut auf seine Hände. "Drei Wochen später war alles verschlüsselt. Menschen ohne Strom, mitten im Winter. Ich konnte nichts mehr tun. Deshalb habe ich Stefan geglaubt, als sonst niemand wollte. Ich mache diesen Fehler nicht zweimal."`,
    involvedCharacters: ['kollege'],
    tags: ['story', 'chapter8', 'act2', 'character'],
    choices: [
      {
        id: 'listen',
        text: 'Einfach zuhören — er muss das erzählen',
        effects: { relationships: { kollegen: 12 }, stress: -3 },
        resultText: 'Du sagst nichts, lässt ihn reden. Am Ende nickt er dir zu. Zwischen euch ist etwas fester geworden — Vertrauen, hart erarbeitet.',
        setsFlags: ['bjorg_backstory'],
      },
      {
        id: 'learn_lesson',
        text: 'Fragen, was er daraus gelernt hat — und es heute anwenden',
        effects: { skills: { security: 5 }, relationships: { kollegen: 6 } },
        resultText: '"Glaub den leisen Signalen", sagt er. "Und hab einen Plan, BEVOR du ihn brauchst." Ihr geht eure Vorbereitung im Licht seiner Erfahrung noch einmal durch.',
        setsFlags: ['learned_from_bjorg'],
        teachingMoment: 'Erfahrung aus früheren Vorfällen ist konkreter Verteidigungswert — Lessons Learned gehören in die Vorbereitung, nicht ins Archiv.',
      },
      {
        id: 'reassure',
        text: 'Ihm sagen, dass es diesmal anders läuft — weil ihr vorbereitet seid',
        effects: { relationships: { kollegen: 8 }, stress: -5 },
        resultText: '"Diesmal hört jemand zu", sagst du. "Diesmal haben wir einen Plan." Bjorg lächelt müde. "Ja. Diesmal schon." Es klingt fast nach Hoffnung.',
        setsFlags: ['reassured_bjorg'],
      },
    ],
  },
  {
    id: 'adv_warning_signs',
    title: 'Die ersten Risse',
    category: 'story',
    weekRange: [8, 8],
    probability: 1,
    description: `Dann fängt es an. Leise.

Ein Ausschlag fehlgeschlagener Anmeldungen um 3:14 Uhr. Ein Backup-Job, der heute Nacht verdächtig schnell "fertig" war. Ein Domänencontroller mit ein paar Sekunden unerklärlicher Zeitabweichung.

Jedes für sich: nichts. Zusammen: die Handschrift, die ihr seit Wochen kennt. Der Countdown steht bei null. Es passiert heute.`,
    involvedCharacters: [],
    tags: ['story', 'chapter8', 'act2', 'climax'],
    choices: [
      {
        id: 'sound_alarm',
        text: 'Alarm schlagen: alle Vorbereiteten in Stellung, jetzt',
        effects: { skills: { softSkills: 3 }, stress: 10 },
        resultText: 'Du löst die Kette aus, die ihr geübt habt. Telefone klingeln, Leute nehmen ihre Positionen ein. Wenn es kommt, kommt es nicht in einen schlafenden Laden.',
        setsFlags: ['raised_alarm', 'storm_imminent'],
      },
      {
        id: 'final_check',
        text: 'Die allerletzten Vorbereitungen abschließen, bevor es losbricht',
        effects: { skills: { security: 5 }, stress: 5 },
        resultText: 'Backups verifiziert, Segmente dicht, Notfall-Accounts bereit. Mehr könnt ihr nicht tun. Du atmest einmal tief durch.',
        setsFlags: ['final_prep', 'storm_imminent'],
      },
      {
        id: 'brace',
        text: 'Position beziehen und warten — ihr seid so bereit, wie ihr sein könnt',
        effects: { skills: { security: 3 }, stress: -3 },
        resultText: 'Kein Aktionismus mehr. Ihr sitzt vor den Monitoren, ruhig, konzentriert. Stefan hat gewarnt. Ihr habt zugehört. Jetzt zeigt sich, ob es gereicht hat.',
        setsFlags: ['braced', 'storm_imminent'],
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
        text: '"Bjorg, du koordinierst. Chef, Sie informieren den Bürgermeister."',
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
    description: `Die Phishing-Angriffe werden immer gezielter. Die letzte Mail wusste sogar deinen Geburtstag.

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

Bjorg zeigt dir die Nachrichten: In Köln wurde eine Kläranlage gehackt. In Hamburg ein Krankenhaus. In München die Straßenbahn.

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
    id: 'adv_gui_eventviewer_probe',
    title: 'Selbst nachsehen: Die Protokolle von DC01',
    category: 'story',
    weekRange: [5, 6],
    probability: 1,
    description: `Das Muster lässt dich nicht los. Wenn jemand WARM testet, dann steht es in den Logs des Domänencontrollers.

\`\`\`
[NACHRICHT VON: bjorg] "Reden wir nicht drüber, sieh nach. Sicherheitsprotokoll auf DC01.
                        Wenn da nachts jemand Konten durchprobiert, steht's da schwarz auf weiß."
\`\`\`

Du kannst dich auf den Monatsbericht des Dienstleisters verlassen — oder selbst in die Ereignisanzeige schauen.`,
    involvedCharacters: [],
    tags: ['story', 'gui', 'act2', 'chapter5', 'evidence'],
    mentorNote:
      '4625 = fehlgeschlagene Anmeldung, 4624 = erfolgreiche. Viele 4625 auf ein Konto von einer fremden IP, gefolgt von EINER 4624 derselben IP, ist ein erfolgreicher Zugriffsversuch — und genau die frühe Spur, die einen späteren Angriff ankündigt.',
    choices: [
      {
        id: 'inspect_logs',
        text: 'Sieh dir das Sicherheitsprotokoll auf DC01 selbst an',
        effects: { skills: { security: 2 } },
        resultText:
          'Du hast die Spur selbst gefunden und dokumentiert — kein Bericht hätte sie dir so klar gezeigt.',
        guiCommand: true,
      },
      {
        id: 'trust_report',
        text: 'Auf den Monatsbericht des Dienstleisters verlassen',
        effects: { stress: 3 },
        resultText:
          'Der Bericht meldet "keine Auffälligkeiten". Ein ungutes Gefühl bleibt — gesehen hast du nichts.',
      },
    ],
    guiContext: {
      app: 'eventviewer',
      title: 'Ereignisanzeige',
      hostname: 'DC01',
      briefing:
        'Filtere nach "Überwachung fehlgeschlagen", erkenne das Muster, und finde dann die EINE erfolgreiche Anmeldung (4624) von genau derselben Quelle. Wähle sie aus und klicke "Als Vorfall melden".',
      state: {
        eventViewer: {
          logName: 'Sicherheit',
          entries: [
            {
              id: 'evt-probe-legit',
              level: 'Überwachung erfolgreich',
              dateTime: '12.06.2026 07:58:10',
              source: 'Microsoft-Windows-Security-Auditing',
              eventId: 4624,
              task: 'Anmeldung',
              message:
                'Ein Konto wurde erfolgreich angemeldet.\nKonto: t.berg\nAnmeldetyp: 2 (Interaktiv)\nQuellnetzwerkadresse: 10.0.1.14\nStatus: Normale Benutzeranmeldung.',
            },
            {
              id: 'evt-probe-fail-1',
              level: 'Überwachung fehlgeschlagen',
              dateTime: '12.06.2026 02:11:03',
              source: 'Microsoft-Windows-Security-Auditing',
              eventId: 4625,
              task: 'Anmeldung',
              message:
                'Fehler bei der Anmeldung eines Kontos.\nKonto: svc_scada\nFehlerursache: Ungültiges Kennwort.\nQuellnetzwerkadresse: 185.220.101.47',
            },
            {
              id: 'evt-probe-fail-2',
              level: 'Überwachung fehlgeschlagen',
              dateTime: '12.06.2026 02:11:39',
              source: 'Microsoft-Windows-Security-Auditing',
              eventId: 4625,
              task: 'Anmeldung',
              message:
                'Fehler bei der Anmeldung eines Kontos.\nKonto: svc_scada\nFehlerursache: Ungültiges Kennwort.\nQuellnetzwerkadresse: 185.220.101.47',
            },
            {
              id: 'evt-probe-fail-3',
              level: 'Überwachung fehlgeschlagen',
              dateTime: '12.06.2026 02:12:51',
              source: 'Microsoft-Windows-Security-Auditing',
              eventId: 4625,
              task: 'Anmeldung',
              message:
                'Fehler bei der Anmeldung eines Kontos.\nKonto: svc_scada\nFehlerursache: Ungültiges Kennwort.\nQuellnetzwerkadresse: 185.220.101.47',
            },
            {
              id: 'evt-probe-success',
              level: 'Überwachung erfolgreich',
              dateTime: '12.06.2026 02:14:08',
              source: 'Microsoft-Windows-Security-Auditing',
              eventId: 4624,
              task: 'Anmeldung',
              message:
                'Ein Konto wurde erfolgreich angemeldet.\nKonto: svc_scada\nAnmeldetyp: 3 (Netzwerk)\nQuellnetzwerkadresse: 185.220.101.47\n\n⚠ Diese erfolgreiche Anmeldung folgt unmittelbar auf dutzende Fehlversuche von derselben fremden IP.',
            },
            {
              id: 'evt-probe-backup',
              level: 'Information',
              dateTime: '12.06.2026 06:00:00',
              source: 'Microsoft-Windows-Security-Auditing',
              eventId: 4624,
              task: 'Anmeldung',
              message:
                'Ein Konto wurde erfolgreich angemeldet.\nKonto: backup-svc\nAnmeldetyp: 5 (Dienst)\nStatus: Geplanter Backup-Dienst.',
            },
          ],
        },
      },
      solutions: [
        {
          interactions: ['report:evt-probe-success'],
          allRequired: true,
          resultText:
            'Treffer. Nach dutzenden Fehlversuchen meldete sich um 02:14 jemand von 185.220.101.47 erfolgreich als "svc_scada" an. Das ist kein Rauschen — das ist ein Test, der funktioniert hat. Du dokumentierst die Spur.',
          skillGain: { security: 5, windows: 3 },
          setsFlags: ['story_saw_intrusion'],
        },
      ],
      hints: [
        '🤖 Bjorg: "Filter auf \'Überwachung fehlgeschlagen\'. Fällt dir ein Konto + eine IP auf?"',
        '🤖 Bjorg: "svc_scada, von 185.220.101.47, mitten in der Nacht. Klassisches Durchprobieren."',
        '🤖 Bjorg: "Jetzt die Frage: gibt es eine ERFOLGREICHE Anmeldung (4624) von genau dieser IP? Such sie, melde sie."',
      ],
    },
  },

  {
    id: 'adv_gui_settings_preharden',
    title: 'Vor dem Sturm: Den Schutz prüfen',
    category: 'story',
    weekRange: [7, 8],
    probability: 1,
    description: `Es ist ruhig. Zu ruhig. Wenn das Muster stimmt, kommt der eigentliche Schlag noch. Bevor er kommt, willst du wissen, ob die wichtigen Server überhaupt geschützt sind.

\`\`\`
[NACHRICHT VON: bjorg] "Prüf den Datei-Server. Defender, Manipulationsschutz, Firewall.
                        Wenn der Manipulationsschutz aus ist, kann ein Angreifer den Rest
                        einfach abschalten — dann sind wir blind."
\`\`\`

Du kannst auf die Standard-Konfiguration des Dienstleisters vertrauen — oder die Windows-Sicherheit selbst öffnen und nachhärten.`,
    involvedCharacters: [],
    tags: ['story', 'gui', 'act2', 'chapter8', 'hardening'],
    mentorNote:
      'Manipulationsschutz (Tamper Protection) ist die Wurzel: ist er aus, kann ein Angreifer Defender und Firewall einfach deaktivieren. Proaktiv aktivieren, BEVOR der Angriff kommt — nicht erst danach.',
    choices: [
      {
        id: 'harden_self',
        text: 'Windows-Sicherheit öffnen und selbst härten',
        effects: { skills: { security: 2 } },
        resultText:
          'Du hast die Lücken selbst geschlossen — und dokumentierst, was du geändert hast.',
        guiCommand: true,
      },
      {
        id: 'trust_default',
        text: 'Auf die Standard-Konfiguration des Dienstleisters vertrauen',
        effects: { stress: 2 },
        resultText:
          'Du gehst davon aus, dass schon alles passt. Geprüft hast du es nicht.',
      },
    ],
    guiContext: {
      app: 'settings',
      title: 'Windows-Sicherheit',
      hostname: 'SRV-WARM-FILE01',
      briefing:
        'Schalte die deaktivierten Schutzfunktionen wieder ein — Echtzeitschutz, Domänen-Firewall und vor allem den Manipulationsschutz. Was bereits korrekt (grün) ist, lässt du unverändert.',
      briefingVariants: [
        {
          flag: 'story_saw_intrusion',
          briefing:
            'Du hast die nächtlichen Login-Versuche auf DC01 selbst gesehen — jetzt schließ die Lücken, bevor sie wiederkommen. Aktiviere Echtzeitschutz, Domänen-Firewall und Manipulationsschutz. Was schon grün ist, lässt du in Ruhe.',
        },
      ],
      state: {
        settings: {
          settings: [
            { id: 'realtime-protection', category: 'Viren- & Bedrohungsschutz', label: 'Echtzeitschutz', description: 'Aktuell deaktiviert.', enabled: false, recommended: true },
            { id: 'tamper-protection', category: 'Viren- & Bedrohungsschutz', label: 'Manipulationsschutz', description: 'Verhindert, dass Schutzfunktionen unbefugt abgeschaltet werden.', enabled: false, recommended: true },
            { id: 'cloud-protection', category: 'Viren- & Bedrohungsschutz', label: 'Über Cloud bereitgestellter Schutz', enabled: true, recommended: true },
            { id: 'firewall-domain', category: 'Firewall- & Netzwerkschutz', label: 'Domänennetzwerk-Firewall', description: 'Aktuell deaktiviert.', enabled: false, recommended: true },
            { id: 'firewall-private', category: 'Firewall- & Netzwerkschutz', label: 'Privates Netzwerk-Firewall', enabled: true, recommended: true },
            { id: 'smartscreen', category: 'App- & Browsersteuerung', label: 'SmartScreen für Apps und Dateien', enabled: true, recommended: true },
          ],
        },
      },
      solutions: [
        {
          interactions: ['enable:realtime-protection', 'enable:firewall-domain', 'enable:tamper-protection'],
          allRequired: true,
          resultText:
            'Stark. Echtzeitschutz und Domänen-Firewall laufen wieder — und durch den Manipulationsschutz kann ein Angreifer sie nicht mehr einfach abschalten. Du hast nicht repariert, sondern vorgesorgt.',
          skillGain: { security: 4, windows: 3 },
          setsFlags: ['story_hardened'],
        },
      ],
      hints: [
        '🤖 Bjorg: "Drei Schalter stehen auf rot/\'Aktion nötig\'. Genau die brauchen wir an."',
        '🤖 Bjorg: "Echtzeitschutz und Domänen-Firewall sind klar. Aber WARUM könnte sie jemand abschalten?"',
        '🤖 Bjorg: "Manipulationsschutz. Mach den an — sonst war alles andere umsonst."',
      ],
    },
  },

  {
    id: 'adv_gui_taskmanager_attack',
    title: 'Eindämmen: Der Prozess, der frisst',
    category: 'story',
    weekRange: [9, 10],
    probability: 1,
    description: `Es ist soweit. Der Datei-Server reagiert kaum noch, Dateien bekommen reihenweise eine neue Endung. Das ist kein Ausfall — das ist eine Verschlüsselung, live.

\`\`\`
[NACHRICHT VON: bjorg] "Geh sofort auf die Konsole von FILE01. Irgendein Prozess verschlüsselt
                        gerade alles. Finde ihn, beende ihn — aber kill nicht das halbe System
                        im Panikmodus."
\`\`\`

Jede Minute zählt.`,
    involvedCharacters: [],
    tags: ['story', 'gui', 'act3', 'chapter9', 'crisis', 'containment'],
    mentorNote:
      'Bei laufender Ransomware: den schädlichen Prozess identifizieren und stoppen, NICHT blind das System killen. Ein Prozess mit hoher CPU/Disk-Last, gestartet aus einem Temp-Ordner und ohne verifizierten Herausgeber, ist der Übeltäter — System-Prozesse blockt Windows ohnehin.',
    choices: [
      {
        id: 'contain_self',
        text: 'An die Konsole — den Prozess finden und gezielt beenden',
        effects: { skills: { security: 2 } },
        resultText:
          'Du gehst chirurgisch vor: den richtigen Prozess gestoppt, den Server am Leben gelassen.',
        guiCommand: true,
      },
      {
        id: 'pull_plug',
        text: 'Stecker ziehen — Server hart vom Netz und aus',
        effects: { stress: 6, skills: { security: 1 } },
        resultText:
          'Die Verschlüsselung stoppt — aber du verlierst flüchtige Spuren und reißt den Server abrupt aus dem Betrieb. Eingedämmt, aber grob.',
      },
      {
        id: 'call_external',
        text: 'Externen Notdienst rufen und warten',
        effects: { stress: 4, compliance: -5 },
        resultText:
          'Der Notdienst meldet sich in 40 Minuten zurück. In der Zeit verschlüsselt der Prozess weiter. Wertvolle Minuten verloren.',
      },
    ],
    guiContext: {
      app: 'taskmanager',
      title: 'Task-Manager',
      hostname: 'SRV-WARM-FILE01',
      briefing:
        'Finde den Prozess, der gerade verschlüsselt: hohe Last, gestartet aus einem Temp-Ordner, kein verifizierter Herausgeber. Wähle ihn aus und beende ihn — System-Prozesse lässt du in Ruhe.',
      briefingVariants: [
        {
          flag: 'story_hardened',
          briefing:
            'Dein Manipulationsschutz hat gehalten — Defender läuft noch und hat den Angreifer ausgebremst. Der schädliche Prozess sticht dadurch klar heraus. Wähl ihn aus und beende ihn, die System-Prozesse lässt du in Ruhe.',
        },
      ],
      state: {
        taskManager: {
          processes: [
            { name: 'System', pid: 4, cpu: 1, memoryMb: 24, description: 'NT Kernel & System', critical: true },
            { name: 'svchost.exe', pid: 1008, cpu: 2, memoryMb: 150, description: 'Hostprozess für Windows-Dienste', critical: true },
            { name: 'lsass.exe', pid: 780, cpu: 1, memoryMb: 40, description: 'Lokale Sicherheitsautorität', critical: true },
            { name: 'MsMpEng.exe', pid: 2901, cpu: 18, memoryMb: 520, description: 'Antimalware Service Executable (Microsoft Defender)' },
            { name: 'explorer.exe', pid: 3210, cpu: 1, memoryMb: 198, description: 'Windows-Explorer' },
            { name: 'svhost32.exe', pid: 9120, cpu: 91, memoryMb: 770, description: 'Unbekannt — gestartet aus C:\\Users\\Public\\Temp, kein verifizierter Herausgeber, hohe Datenträgeraktivität' },
            { name: 'OUTLOOK.EXE', pid: 4402, cpu: 2, memoryMb: 300, description: 'Microsoft Outlook' },
          ],
        },
      },
      solutions: [
        {
          interactions: ['endtask:svhost32.exe'],
          allRequired: true,
          resultText:
            'Richtig! "svhost32.exe" (kein echter Windows-Name) lief aus C:\\Users\\Public\\Temp und schrieb pausenlos auf die Platte — der Verschlüsselungsprozess. Beendet. Die Verschlüsselung stoppt sofort, der Server bleibt am Netz.',
          skillGain: { security: 4, troubleshooting: 4, windows: 2 },
          setsFlags: ['story_incident_contained'],
        },
      ],
      hints: [
        '🤖 Bjorg: "MsMpEng mit 18% ist nur der Defender. Lass den."',
        '🤖 Bjorg: "Lies die Namen genau. svchost… svhost32… und woher gestartet?"',
        '🤖 Bjorg: "C:\\Users\\Public\\Temp, unsigniert, 91% Last. Das ist er. Beenden."',
      ],
    },
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
        text: '"Bjorg, ich habe da was im Keller..."',
        effects: { relationships: { kollegen: 25, chef: 15 }, stress: -20 },
        resultText: 'Bjorg\' Augen werden groß. "Du... du hast Stefans Server gefunden? Und er läuft?" Er umarmt dich. Tatsächlich umarmt er dich. "Du Genie!"',
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

Das Telefon klingelt. Es ist Bjorg. "Es ist soweit", sagt er. "Und es ist nicht nur bei uns."`,
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
        resultText: '"Bjorg", sagst du. "Hol den Schlüssel für den Keller." Er versteht sofort. Ihr habt einen Plan.',
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

Du sitzt im Konferenzraum. Der Chef ist da. Der Bürgermeister. Das BSI. Und Bjorg, der aussieht als hätte er seit drei Tagen nicht geschlafen. (Hat er auch nicht.)

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
        resultText: '"Sie bekommen einen unbefristeten Vertrag", sagt der Chef. "Und eine Gehaltserhöhung." Bjorg grinst. Ihr habt es geschafft.',
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
