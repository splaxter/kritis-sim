/**
 * Adventure Mode Sidequest Events
 * Kept separate from story-events.ts so they never enter the free-play pool.
 */
import { GameEvent } from '@kritis/shared';

export const adventureSidequestEvents: GameEvent[] = [
  // ── sq_haunted_printer ────────────────────────────────────────────────
  {
    id: 'adv_sq_printer_1',
    title: 'Der Druckergeist',
    category: 'story',
    weekRange: [3, 8],
    probability: 1,
    description: `Frau Weber steht mit einem Stapel Papier vor deinem Schreibtisch. Sie sieht aus, als hätte sie schlecht geschlafen.

"Der Drucker im dritten Stock", sagt sie. "Er druckt. Nachts. Von selbst."

Auf den Blättern: Rechnungen. Ordentlich formatiert, mit Briefkopf. Absender: "Meridian Logistik GmbH". Du hast den Namen noch nie gehört - und Google auch nicht.

**Bjorg** (ohne vom Monitor aufzuschauen): "Der Drucker ist verflucht. Nicht mein Aufgabenbereich, kennste. Wer den Drucker anfasst, hat den Drucker."

**Jens** (leise): "Stefan hat das auch gesagt. Das mit dem Fluch. Er hat es nicht als Witz gemeint."

**Frau Weber**: "Gestern Nacht waren es 34 Seiten. Der Hausmeister hat sie um sechs Uhr früh im Ausgabefach gefunden."`,
    involvedCharacters: ['kollege'],
    tags: ['story', 'sidequest', 'printer', 'mystery'],
    choices: [
      {
        id: 'check_logs',
        text: 'Das Drucker-Webinterface öffnen und die Job-Historie prüfen',
        effects: { skills: { troubleshooting: 3 } },
        resultText: 'Die Historie ist... gelöscht. Komplett. Aber im Fehlerprotokoll steht ein Eintrag: Jeder Nachtdruck kommt exakt um 23:47. Die Zahl kommt dir bekannt vor.',
        setsFlags: ['printer_logs_checked'],
      },
      {
        id: 'ask_around',
        text: 'Erst mal fragen: Wer hat Zugriff auf den Drucker?',
        effects: { relationships: { fachabteilung: 5 } },
        resultText: '"Alle", sagt Frau Weber. "Er hängt im Netzwerk." Jens murmelt: "Genau wie die Kaffeemaschine." Ihr schaut euch an.',
        setsFlags: ['printer_asked_around'],
      },
      {
        id: 'unplug',
        text: 'Kurzer Prozess: Netzstecker ziehen, Problem gelöst',
        effects: { relationships: { fachabteilung: -5 }, stress: -5 },
        resultText: 'Ruhe. Bis um 9:15 der Chef anruft: "Warum druckt hier nichts?!" Du steckst ihn wieder ein. Das Problem ist nicht weg - es wartet nur.',
      },
    ],
  },

  {
    id: 'adv_sq_printer_2',
    title: 'Nachtschicht',
    category: 'story',
    weekRange: [3, 8],
    probability: 1,
    description: `23:41. Du sitzt im dunklen dritten Stock, ein Energydrink neben der Tastatur. Der Drucker steht stumm in der Ecke, eine kleine grüne LED atmet im Sekundentakt.

23:46. Nichts.

23:47. Der Drucker ruckt zum Leben. Motoren surren, Papier zieht ein - und im selben Moment blinkt auf dem Switch-Port neben dir eine Aktivitäts-LED wie wild. Traffic. Genau jetzt.

Die Maschine spuckt eine weitere "Meridian Logistik"-Rechnung aus, noch warm. Dein Puls geht hoch. Das ist kein defekter Treiber. Das ist Absicht.`,
    involvedCharacters: ['kollege'],
    tags: ['story', 'sidequest', 'printer', 'mystery'],
    choices: [
      {
        id: 'capture_traffic',
        text: 'Sofort den Netzwerk-Traffic mitschneiden, solange er läuft',
        effects: { skills: { netzwerk: 4, security: 3 } },
        resultText: 'Du startest den Mitschnitt. Der Drucker redet - nicht mit dem Druckserver, sondern nach draußen. Verschlüsselt. Du hast es auf der Platte. Beweismaterial.',
        setsFlags: ['printer_traffic_captured'],
      },
      {
        id: 'read_invoice',
        text: 'Die frisch gedruckte Rechnung genau ansehen',
        effects: { skills: { troubleshooting: 3 } },
        resultText: 'Briefkopf, Betrag, eine "Kundennummer". Nur ist die Kundennummer keine Nummer - es ist eine IP-Adresse. Du fotografierst sie. Irgendwer benutzt einen Drucker als Briefkasten.',
        setsFlags: ['printer_invoice_clue'],
      },
      {
        id: 'call_thomas',
        text: 'Henry anrufen. Um Mitternacht. Wer sonst?',
        effects: { relationships: { kollegen: 10 }, stress: -5 },
        resultText: 'Zwanzig Minuten später steht Henry in Jogginghose in der Tür, Laptop unterm Arm — und ein Fläschchen Weihwasser in der Hand. "Von Bjorg", sagt er trocken. "Er käme ja selbst, aber sein Rücken. Das Weihwasser übernimmt seinen Teil." Ihr fangt beide an zu lachen. Dann setzt er sich neben dich.',
        setsFlags: ['printer_thomas_joined'],
      },
    ],
  },

  {
    id: 'adv_sq_printer_3',
    title: 'Kein Geist',
    category: 'story',
    weekRange: [3, 8],
    probability: 1,
    description: `Am nächsten Morgen ziehst du die Firmware des Druckers und vergleichst sie mit dem Original des Herstellers. Sie stimmen nicht überein.

Jemand hat ein manipuliertes Update aufgespielt. Der Drucker druckt nicht zufällig - er ist ein Testballon. Eine kleine, harmlose Anomalie, mitten im Haus platziert. Und die eigentliche Frage ist nicht *was* er druckt.

Die Frage ist: **Merkt hier überhaupt jemand, wenn etwas nicht stimmt?**

Jemand wollte genau das herausfinden. Und du bist die Antwort.`,
    involvedCharacters: ['kollege'],
    tags: ['story', 'sidequest', 'printer', 'mystery'],
    choices: [
      {
        id: 'reflash',
        text: 'Firmware sauber neu flashen und den ganzen Fund dokumentieren',
        effects: { skills: { security: 5 } },
        resultText: 'Der Drucker druckt wieder nur, was man ihm sagt. Du legst eine saubere Doku an: manipuliertes Update, Uhrzeit, die IP. Du weißt noch nicht, wohin die Spur führt - aber du hast sie gesichert. Das war kein Geist.',
        setsFlags: ['printer_cleaned'],
      },
      {
        id: 'honeypot',
        text: 'Den Drucker als Honeypot weiterlaufen lassen und den Port überwachen',
        effects: { skills: { netzwerk: 5, security: 2 } },
        resultText: 'Du lässt das Ding bewusst weiterspuken - aber jetzt schaust du zu. Jede Nacht um 23:47 dieselbe Verbindung, dieselbe Gegenstelle. Wer auch immer da testet, testet weiter. Und merkt nicht, dass du mitliest.',
        setsFlags: ['printer_honeypot'],
      },
      {
        id: 'tell_team',
        text: 'Frau Weber und Jens die ganze Geschichte erzählen',
        effects: { relationships: { kollegen: 10, fachabteilung: 5 }, stress: -5 },
        resultText: '"Also KEIN Geist?", fragt Frau Weber fast enttäuscht. "Schlimmer", sagt Jens leise. "Ein Geist macht keine Firmware-Updates." Er schaut dich an. "Stefan hat sowas gesucht. Genau sowas." Zum ersten Mal nimmt er dich ganz ernst. Bjorg ruft aus dem Flur: "Sag ich doch — verflucht!"',
        setsFlags: ['printer_team_told'],
      },
    ],
  },

  // ── sq_network_optimization ───────────────────────────────────────────
  {
    id: 'adv_sq_network_1',
    title: 'Der Flaschenhals',
    category: 'story',
    weekRange: [2, 12],
    probability: 1,
    description: `Es beginnt mit einem Ticket. Dann drei. Dann fünfzehn. "Netzwerk langsam." "Laufwerk hängt." "Kann keine Datei öffnen." Aus jeder Abteilung dasselbe.

Du machst einen schnellen Test - und siehst es sofort: Das ist kein Bandbreitenproblem. Die Leitung nach draußen ist kerngesund. Das Problem sitzt *drinnen*. Das ist Topologie.

Irgendwo im Haus kriecht der Datenverkehr durch einen Engpass, den niemand je geplant hat. Und du wirst ihn finden.`,
    involvedCharacters: ['kollege'],
    tags: ['story', 'sidequest', 'network', 'technical'],
    choices: [
      {
        id: 'measure',
        text: 'Systematisch messen - Port für Port, Segment für Segment',
        effects: { skills: { netzwerk: 3, troubleshooting: 2 } },
        resultText: 'Du misst dich durchs Gebäude. Die Zahlen ergeben ein klares Bild: Fast der gesamte Verkehr läuft über einen einzigen Punkt. Alles zieht sich dort zusammen wie durch einen Trichter.',
        setsFlags: ['network_measured'],
      },
      {
        id: 'find_netplan',
        text: 'Den alten Netzwerkplan von Stefan suchen',
        effects: { skills: { netzwerk: 2 } },
        resultText: 'In einer vergessenen Freigabe findest du Stefans Plan - handschriftlich ergänzt. Am Rand eine Notiz, dick unterstrichen: "Alles hängt an EINEM Switch. Warum?!" Er war dir schon voraus.',
        setsFlags: ['found_stefans_netplan'],
      },
      {
        id: 'ask_thomas',
        text: 'Bjorg fragen, wie das Netz eigentlich gewachsen ist',
        effects: { relationships: { kollegen: 5 } },
        resultText: '"Historisch gewachsen", sagt Bjorg und zuckt mit den Schultern, als wäre das eine vollständige Antwort. Auf Nachfrage: "Also... irgendwer hat irgendwann irgendwas angeschlossen. Seit zehn Jahren. Ich war\'s nie — ich hab da nämlich grundsätzlich Termine." Immerhin ehrlich. Und, ganz nebenbei: Sein Geschwätz verrät dir, WO der älteste Schrank steht.',
        setsFlags: ['network_asked_thomas'],
      },
    ],
  },

  {
    id: 'adv_sq_network_2',
    title: 'Ein Netz, ein Switch, ein Problem',
    category: 'story',
    weekRange: [2, 12],
    probability: 1,
    description: `Der Flur-Schrank neben der Teeküche. Du öffnest ihn - und da steht er: ein billiger, unmanaged 24-Port-Switch, staubbedeckt, jeder Port belegt. Server, Buchhaltung, WLAN, Kaffeemaschine, der Drucker aus dem dritten Stock. Alles.

Ein flaches Netz. Kein Segment, keine Trennung, keine Zonen. Jedes Gerät kann mit jedem anderen reden - und tut es auch. Wenn hier irgendwo etwas Bösartiges säße, hätte es freie Bahn durchs ganze Haus.

Du hast den Flaschenhals gefunden. Und gleichzeitig das größte Sicherheitsloch der Behörde.`,
    involvedCharacters: ['kollege'],
    tags: ['story', 'sidequest', 'network', 'security'],
    choices: [
      {
        id: 'plan_vlans',
        text: 'VLANs planen und den Switch durch managed Hardware ersetzen',
        effects: { skills: { netzwerk: 5, security: 3 } },
        resultText: 'Du zeichnest die Zonen auf: Server getrennt von Büro, IoT-Kram in ein eigenes Segment. Der neue managed Switch macht Schluss mit dem flachen Netz. Und du weißt jetzt genau, wo die Schwachstellen sitzen - falls es je ernst wird.',
        setsFlags: ['network_replanned'],
      },
      {
        id: 'document_first',
        text: 'Erst sauber dokumentieren, dann dem Chef ein Budget abringen',
        effects: { relationships: { chef: 5 }, skills: { softSkills: 2 } },
        resultText: 'Du legst dem Chef zwei Seiten hin: Ist-Zustand, Risiko, Kosten. Er versteht kein Wort der Technik - aber "ein Loch, durch das jeder überall hinkommt" versteht er. Er nickt. Und du weißt jetzt, wo jede Schwachstelle liegt.',
        setsFlags: ['network_documented'],
      },
    ],
  },

  // ── sq_coffee_machine ─────────────────────────────────────────────────
  {
    id: 'adv_sq_coffee_1',
    title: 'Der Kaffeemaschinenflüsterer',
    category: 'story',
    weekRange: [2, 4],
    probability: 1,
    description: `Sie hat es wieder getan. Über Nacht, ohne dass jemand einen Knopf gedrückt hat: 47 Tassen Espresso. Der Pausenraum riecht wie ein italienisches Café um vier Uhr früh.

**Frau Weber**: "Ich schwöre, wenn das so weitergeht, stelle ich meine eigene Thermoskanne hin. Filterkaffee. Von zu Hause." Im Pausenraum geht ein kollektives Stöhnen um. Die Moral im Haus hängt an dieser Maschine - und die Maschine spinnt.

**Jens**: "Stefan hat gesagt, das Ding ist gefährlich. Ich dachte damals, er meint das Koffein."

**Bjorg** (mit Tasse in der Hand): "47 Espresso? Kennste — die Maschine ist wie meine Schwiegermutter: macht nachts Krach und keiner weiß warum!" Er lacht. Die Maschine gurgelt. Sonst ist es still.`,
    involvedCharacters: ['kollege'],
    tags: ['story', 'sidequest', 'coffee', 'iot'],
    choices: [
      {
        id: 'open_webui',
        text: 'Das Webinterface der Maschine aufrufen',
        effects: { skills: { security: 2 } },
        resultText: 'Die Maschine hat einen eigenen Webserver. Login: "admin" / "admin". Natürlich. Im Menü: Firmware, Zeitpläne - und eine "Cloud-Anbindung", die niemand je konfiguriert hat. Sie ist an.',
        setsFlags: ['coffee_webui_found'],
      },
      {
        id: 'sniff_traffic',
        text: 'Wireshark anwerfen und zuhören, WAS sie da nach draußen schickt',
        effects: { skills: { netzwerk: 2, security: 2 } },
        resultText: 'Alle paar Minuten funkt die Maschine nach Hause. Ziel: irgendein Server, weit weg. Für eine Kaffeemaschine redet sie erstaunlich viel.',
        setsFlags: ['coffee_traffic_seen'],
      },
      {
        id: 'drink_first',
        text: 'Erst mal einen Kaffee trinken und in Ruhe nachdenken',
        effects: { stress: -5 },
        resultText: 'Du drückst auf Cappuccino. Die Maschine macht den besten Cappuccino, den du je aus einem Gerät bekommen hast - perfekte Crema, exakte Temperatur. Fast so, als wüsste sie, dass du gerade gegen sie ermittelst. Beunruhigend.',
      },
    ],
  },

  {
    id: 'adv_sq_coffee_2',
    title: 'Telemetrie mit Sahne',
    category: 'story',
    weekRange: [2, 4],
    probability: 1,
    description: `Du hast dir die Daten angesehen, die die Maschine "nach Hause" schickt. Angeblich "Nutzungsstatistiken für den Service".

Aber es sind nicht nur Bohnenfüllstände. Es sind Uhrzeiten. Jede Tasse, gestempelt mit dem Zeitpunkt. Früh am Morgen, spät am Abend, das Wochenende leer.

Das ist keine Kaffee-Statistik. Das ist ein Bewegungsprofil des Gebäudes. Wer den Datenstrom liest, weiß genau, wann Menschen im Haus sind - und wann nicht.`,
    involvedCharacters: ['kollege'],
    tags: ['story', 'sidequest', 'coffee', 'security'],
    choices: [
      {
        id: 'isolate',
        text: 'Die Cloud-Anbindung kappen und die Maschine ins Gäste-VLAN sperren',
        effects: { skills: { security: 3, netzwerk: 2 } },
        resultText: 'Du drehst der Maschine den Weg nach draußen zu und steckst sie in ein eigenes, isoliertes Segment. Sie kann weiter Kaffee kochen - aber niemandem mehr erzählen, wann du im Büro bist.',
        setsFlags: ['coffee_isolated'],
      },
      {
        id: 'mail_vendor',
        text: 'Dem Hersteller eine sehr deutliche Support-Mail schreiben',
        effects: { relationships: { fachabteilung: 5 } },
        resultText: 'Die Antwort kommt nach zwei Tagen: "Die Übermittlung von Nutzungszeiten dient der Serviceoptimierung und ist ein Feature." Du liest den Satz dreimal. Ein Feature. Aha.',
        setsFlags: ['coffee_vendor_mailed'],
      },
      {
        id: 'show_thomas',
        text: 'Jens das Bewegungsprofil zeigen',
        effects: { relationships: { kollegen: 10 } },
        resultText: 'Jens schaut auf den Bildschirm und wird blass. "Das ist... das ist genau das, wovor Stefan Angst hatte. Kleine Dinger. Überall. Die niemand ernst nimmt." Er schluckt. "Stefan hatte recht."',
        setsFlags: ['coffee_thomas_told'],
      },
    ],
  },

  {
    id: 'adv_sq_coffee_3',
    title: 'Der beste Kaffee der Verwaltung',
    category: 'story',
    weekRange: [2, 4],
    probability: 1,
    description: `Eine Woche später. Die Maschine läuft offline, mit sauberer Firmware, in ihrem eigenen Netz-Segment. Keine mitternächtlichen Espresso-Orgien mehr, kein Funken nach draußen.

Und sie kocht immer noch. Besser als je zuvor.

Im Pausenraum hat sich herumgesprochen, wer "das mit der Kaffeemaschine" gefixt hat. Frau Weber hat dir inoffiziell den Titel verliehen: **Kaffeemaschinenflüsterer**. Es ist der erste Moment, seit du hier angefangen hast, in dem sich das Haus wie ein Team anfühlt.`,
    involvedCharacters: ['kollege'],
    tags: ['story', 'sidequest', 'coffee', 'team'],
    choices: [
      {
        id: 'post_doku',
        text: 'Eine kleine Doku für den Pausenraum aushängen',
        effects: { skills: { softSkills: 3, security: 2 } },
        resultText: 'Du hängst einen Zettel neben die Maschine: "So erkennt ihr Geräte, die zu viel reden." Halb Anleitung, halb Augenzwinkern. Zwei Kollegen aus der Buchhaltung lesen ihn tatsächlich - und fragen nach. Sicherheit fängt beim Kaffee an.',
        setsFlags: ['coffee_doku_posted'],
      },
      {
        id: 'enjoy_moment',
        text: 'Den Moment einfach genießen - der erste echte Team-Erfolg',
        effects: { relationships: { kollegen: 10 }, stress: -5 },
        resultText: 'Ihr steht am Fenster, jeder mit einer Tasse. Jens hebt seine wie zum Anstoßen: "Auf den Kaffeemaschinenflüsterer." Frau Weber lacht. Bjorg taucht exakt in diesem Moment auf — Kaffee gibt es ja wieder. "Worauf trinken wir? Egal, bin dabei!" Es ist klein. Aber es ist echt. Und du wirst dich daran erinnern, wenn es mal richtig hart wird.',
        setsFlags: ['coffee_team_moment'],
      },
    ],
  },

  // ── sq_legacy_code ────────────────────────────────────────────────────
  {
    id: 'adv_sq_legacy_1',
    title: 'Das Skript, das niemand anfasst',
    category: 'story',
    weekRange: [3, 8],
    probability: 1,
    description: `Du suchst nach etwas ganz anderem und stolperst über eine Zeile in der Crontab, die dir den Atem verschlägt. Ein Skript, \`/opt/awb/nachtlauf.sh\`, läuft jede Nacht um 03:00 als root. Es steuert die Wiegebrücke, die Tourenplanung und die Gebührenabrechnung. Die halbe Behörde hängt daran.

Es ist 1.400 Zeilen lang. Kommentarlos. Zuletzt geändert vor drei Jahren - von einem User namens \`swagner\`.

**Jens** schaut dir über die Schulter und wird ehrfürchtig leise. "Das ist Stefans Skript. Wir nennen es 'die Zeitbombe'. Es läuft. Solange man es nicht ansieht, läuft es. Keiner hat sich je getraut, da reinzugehen."

**Bjorg** (aus dem Hintergrund): "Finger weg, Neuer! Was läuft, das läuft, kennste? Das ist historisch gewachsen. Und Gewachsenes fasst man nicht an - genau wie mein Rücken."`,
    involvedCharacters: ['kollege'],
    tags: ['story', 'sidequest', 'legacy', 'linux'],
    choices: [
      {
        id: 'read_code',
        text: 'In den sauren Apfel beißen und das Skript Zeile für Zeile lesen',
        effects: { skills: { linux: 4, troubleshooting: 2 } },
        resultText: 'Vier Stunden, zwei Kannen Kaffee. Stefans Stil ist eigenwillig, aber nicht schlampig - im Gegenteil. Unter der kryptischen Oberfläche steckt jemand, der genau wusste, was er tat. Und der offenbar mit Absicht keine Kommentare geschrieben hat.',
        setsFlags: ['legacy_code_read'],
      },
      {
        id: 'snapshot_first',
        text: 'Erst ein sauberes Backup und eine Testumgebung bauen',
        effects: { skills: { linux: 3, security: 2 } },
        resultText: 'Bevor du irgendetwas anfasst, ziehst du dir eine Kopie und eine VM. Wenn dieses Ding hochgeht, dann kontrolliert und nicht im Produktivbetrieb um drei Uhr nachts. Jens nickt anerkennend: "Genau so hätte Stefan das gemacht."',
        setsFlags: ['legacy_sandboxed'],
      },
      {
        id: 'ask_jens_history',
        text: 'Jens ausfragen: Was weiß er über Stefan und dieses Skript?',
        effects: { relationships: { kollegen: 5 } },
        resultText: '"Stefan hat gesagt, das Skript sei sein Sicherheitsnetz", erinnert sich Jens. "Ich dachte, er meint Backups. Aber er hat es anders betont. So, als würde es uns beschützen." Er zuckt mit den Schultern. "Ich hab damals nicht nachgefragt. Hätte ich vielleicht."',
        setsFlags: ['legacy_asked_jens'],
      },
    ],
  },

  {
    id: 'adv_sq_legacy_2',
    title: 'Kommentarlos, aber nicht ahnungslos',
    category: 'story',
    weekRange: [3, 8],
    probability: 1,
    description: `Je tiefer du gräbst, desto seltsamer wird es. Stefans Skript tut viel mehr, als es müsste.

Es prüft nicht nur die Wiegedaten - es vergleicht sie mit Mustern. Es loggt nicht nur Fehler - es loggt Abweichungen im Netzwerkverhalten. Mitten in einem Buchhaltungsskript sitzt eine Funktion namens \`check_2347()\`, die jede Nacht schaut, ob um 23:47 Uhr Traffic nach draußen geht.

Das ist keine Abrechnung. Das ist eine Überwachungsanlage, getarnt als Altlast. Stefan hat mitten im langweiligsten Skript der Behörde einen Wachhund versteckt, den niemand bemerken sollte.`,
    involvedCharacters: ['kollege'],
    tags: ['story', 'sidequest', 'legacy', 'mystery'],
    choices: [
      {
        id: 'trace_function',
        text: 'Die verdächtige Funktion isolieren und verstehen, was sie meldet',
        effects: { skills: { linux: 4, security: 3 } },
        resultText: 'Du folgst der Funktion durch den Code. Sie schreibt ihre Funde in eine unscheinbare Datei, die aussieht wie ein Temp-File - und die nie gelöscht wird. Darin: Monate an Beobachtungen. Stefan hat gesammelt. Leise. Geduldig.',
        setsFlags: ['legacy_watchdog_found'],
      },
      {
        id: 'cross_reference',
        text: 'Die Log-Datei mit den Anomalien abgleichen, die du bereits kennst',
        effects: { skills: { troubleshooting: 4 } },
        resultText: 'Die 23:47-Einträge. Der Drucker. Die Kaffeemaschine. Alles taucht in Stefans stiller Sammlung auf, Wochen bevor es dir aufgefallen ist. Er hat das Muster gesehen, lange bevor du hier warst. Und dann ist er verschwunden.',
        setsFlags: ['legacy_cross_referenced'],
      },
    ],
  },

  {
    id: 'adv_sq_legacy_3',
    title: 'Der Not-Aus',
    category: 'story',
    weekRange: [3, 8],
    probability: 1,
    description: `Ganz am Ende des Skripts, hinter einem Block, der wie toter Code aussieht, findest du es. Eine Funktion, auskommentiert, aber vollständig. Ihr Name lässt keinen Zweifel: \`kill_switch()\`.

Stefan hat einen Not-Aus gebaut. Ein einziger Aufruf, der die kritischen Prozesse kontrolliert herunterfährt, die Netzwerkkopplungen kappt und die Systeme in einen sicheren Zustand zwingt - schneller und gezielter, als du es von Hand je könntest.

Er hat ihn deaktiviert zurückgelassen. Und daneben, als Kommentar - die einzige Zeile Kommentar im ganzen Skript:

\`# Wenn du das hier liest, brauchst du das hier vielleicht. Viel Glück. - S.\``,
    involvedCharacters: ['kollege'],
    tags: ['story', 'sidequest', 'legacy', 'security'],
    choices: [
      {
        id: 'arm_killswitch',
        text: 'Den Kill-Switch verstehen, testen und scharf, aber gesichert hinterlegen',
        effects: { skills: { linux: 5, security: 4 } },
        resultText: 'Du testest ihn in der Sandbox, bis du jede Zeile im Schlaf beherrschst. Dann legst du ihn bereit - entschärft, aber griffbereit, einen Tastendruck entfernt. Wenn es je so weit kommt, verlierst du keine Sekunde mit Suchen. Stefan hat dir eine Waffe hinterlassen. Du weißt jetzt, wie man sie abfeuert.',
        setsFlags: ['killswitch_ready'],
      },
      {
        id: 'document_killswitch',
        text: 'Alles sauber dokumentieren - für dich und für den, der nach dir kommt',
        effects: { skills: { linux: 3, softSkills: 3 } },
        resultText: 'Du schreibst auf, was Stefan verschwiegen hat: was das Skript wirklich tut, wo der Not-Aus sitzt, wie man ihn auslöst. Kein kryptisches Erbe mehr. Falls dir mal etwas zustößt, steht der Nächste nicht so ratlos da, wie du es warst. Das bist du Stefan schuldig - und dem Nächsten.',
        setsFlags: ['killswitch_documented'],
      },
      {
        id: 'tell_jens_killswitch',
        text: 'Jens den Fund zeigen',
        effects: { relationships: { kollegen: 10 }, stress: -5 },
        resultText: 'Jens liest den Kommentar dreimal. Dann setzt er sich hin. "Er wusste, dass jemand kommt", sagt er leise. "Er hat für dich einen Not-Aus gebaut. Für einen Menschen, den er nie getroffen hat." Er schaut dich an, und zum ersten Mal ist da kein Misstrauen mehr. "Was auch immer da draußen läuft - wir sind nicht mehr wehrlos."',
        setsFlags: ['killswitch_shared'],
      },
    ],
  },

  // ── sq_predecessor_trail ──────────────────────────────────────────────
  {
    id: 'adv_sq_trail_1',
    title: 'Post-its',
    category: 'story',
    weekRange: [4, 10],
    probability: 1,
    description: `Es fängt mit einem Post-it an, das aus der Unterseite der Schreibtischschublade fällt, als du sie zu weit herausziehst. Verblasste Handschrift: **"Nicht dem Wartungsvertrag trauen."**

Du kennst diese Handschrift inzwischen. Stefan.

Und plötzlich siehst du sie überall, wenn du nur richtig hinschaust. Ein Zettel hinter dem Monitor. Eine Notiz im Deckel eines alten Handbuchs. Ein Kürzel, mit Bleistift an die Innenwand des Serverschranks gekritzelt. Keine Verzweiflung, kein Chaos - eine Ordnung. Er hat eine Spur gelegt.

**Jens**: "Ich hab ihn für paranoid gehalten. Alle haben das. Vielleicht war er einfach nur der Einzige, der aufgepasst hat."`,
    involvedCharacters: ['kollege'],
    tags: ['story', 'sidequest', 'predecessor', 'mystery'],
    choices: [
      {
        id: 'collect_notes',
        text: 'Systematisch alle Zettel einsammeln und ordnen',
        effects: { skills: { troubleshooting: 3 } },
        resultText: 'Du gehst das Büro ab wie ein Tatort. Vierzehn Notizen. Du fotografierst jede an ihrem Fundort, dann legst du sie nebeneinander. Einzeln sind es Sprüche eines Paranoiden. Zusammen sind es Stationen. Eine Reihenfolge. Er hat sie für jemanden hinterlassen, der geduldig genug ist.',
        setsFlags: ['trail_notes_collected'],
      },
      {
        id: 'ask_jens_stefan',
        text: 'Jens fragen, wie Stefan in den letzten Wochen war',
        effects: { relationships: { kollegen: 5 } },
        resultText: '"Ruhiger", sagt Jens nach langem Nachdenken. "Nicht ängstlich. Ruhig. So, als hätte er sich entschieden. Am letzten Tag hat er mir die Hand gegeben. Das hat er nie gemacht." Jens schluckt. "Ich dachte, er kündigt einfach. Ich hab nicht gefragt, wohin."',
        setsFlags: ['trail_asked_jens'],
      },
      {
        id: 'ignore_creepy',
        text: 'Das ist unheimlich - erst mal die eigentliche Arbeit machen',
        effects: { stress: -3 },
        resultText: 'Du schiebst die Zettel in eine Schublade. Tickets warten, der Alltag ruft. Aber der Satz "Nicht dem Wartungsvertrag trauen" geht dir nicht mehr aus dem Kopf. Am Abend holst du die Schublade doch wieder heraus.',
      },
    ],
  },

  {
    id: 'adv_sq_trail_2',
    title: 'Versteckte Dateien',
    category: 'story',
    weekRange: [4, 10],
    probability: 1,
    description: `Ein Post-it nennt einen Pfad, halb abgekürzt. Du folgst ihm. In einer alten Abteilungsfreigabe, zwischen Urlaubsplänen von 2019 und eingescannten Faxen, liegt ein Ordner mit einem Punkt am Anfang - versteckt vor den Augen, die nur klicken statt suchen.

Darin: Screenshots. Verbindungslogs. Eine Tabelle mit Zeitstempeln, alle um 23:47. Und eine Textdatei, \`lies_mich.txt\`, mit einem einzigen Satz:

**"Wenn du das findest, hast du verstanden, dass es kein Zufall ist. Der Rest liegt dort, wo nur jemand mit meinem Zugang hinkommt."**

Stefan hat nicht panisch Dateien versteckt. Er hat ein Archiv angelegt. Für einen Nachfolger, der klug genug ist, es zu finden.`,
    involvedCharacters: ['kollege'],
    tags: ['story', 'sidequest', 'predecessor', 'security'],
    choices: [
      {
        id: 'analyze_archive',
        text: 'Das Archiv auswerten und mit deinen eigenen Funden verknüpfen',
        effects: { skills: { security: 4, troubleshooting: 2 } },
        resultText: 'Stefans Belege und deine Beobachtungen greifen ineinander wie Zahnräder. Der Drucker, die Kaffeemaschine, der eine Switch, die 23:47-Verbindungen - er hatte das Skelett, dir fehlten die letzten Knochen. Zusammen ergibt es zum ersten Mal ein vollständiges Bild.',
        setsFlags: ['trail_archive_analyzed'],
      },
      {
        id: 'secure_archive',
        text: 'Das Archiv sichern, bevor es jemand löscht',
        effects: { skills: { security: 3 } },
        resultText: 'Du ziehst dir eine verschlüsselte Kopie an einen Ort, an den niemand sonst kommt. Instinkt: Wenn Stefan das so sorgfältig versteckt hat, dann weil er wusste, dass jemand danach sucht - um es verschwinden zu lassen. Zwei Tage später ist die Freigabe "wegen Aufräumarbeiten" leer. Du hast alles.',
        setsFlags: ['trail_archive_secured'],
      },
    ],
  },

  {
    id: 'adv_sq_trail_3',
    title: 'Er wollte gefunden werden',
    category: 'story',
    weekRange: [4, 10],
    probability: 1,
    description: `Die letzte Notiz führt dich nicht zu einer Datei. Sie führt dich zu einer Erkenntnis.

Stefan ist nicht geflohen, weil er den Kopf verloren hat. Er ist gegangen, weil er wusste, dass er als sichtbares Ziel niemandem mehr helfen konnte. Also hat er sich unsichtbar gemacht - und eine Spur gelegt, die nur jemand von innen, jemand mit Zeit und Verstand, je zusammensetzen würde.

Das ganze Büro voller Brotkrumen war nie Paranoia. Es war ein Brief. An dich. Von einem Menschen, den du nie getroffen hast und der trotzdem auf dich gewartet hat.

**Jens** (nachdem du es ihm erklärt hast): "Er hat gewusst, dass jemand kommt, der zuhört. Und du bist gekommen." Er hält kurz inne. "Falls er noch da draußen ist - dann wäre es gut, wenn er wüsste, dass seine Spur angekommen ist."`,
    involvedCharacters: ['kollege'],
    tags: ['story', 'sidequest', 'predecessor', 'emotional'],
    choices: [
      {
        id: 'build_timeline',
        text: 'Aus allem eine lückenlose Zeitleiste bauen',
        effects: { skills: { security: 4, troubleshooting: 3 } },
        resultText: 'Du legst Stefans Funde und deine eigenen auf einen Zeitstrahl. Vom ersten manipulierten Update bis heute. Es ist keine Sammlung von Zufällen mehr - es ist eine Kampagne, sauber rekonstruiert. Wenn Stefan das je sieht, wird er wissen: Du hast nicht nur seine Spur gefunden. Du hast sie zu Ende gedacht.',
        setsFlags: ['trail_timeline_built'],
      },
      {
        id: 'honor_stefan',
        text: 'Innehalten - und Stefans Arbeit den Respekt geben, den sie verdient',
        effects: { relationships: { kollegen: 8 }, stress: -5 },
        resultText: 'Du und Jens sitzt am Abend im leeren Büro. "Auf Stefan", sagt Jens und hebt seinen Becher. "Der Einzige, der es kommen sah - und der Einzige, dem keiner geglaubt hat." Ihr trinkt schweigend. Dann sagst du: "Diesmal glaubt ihm jemand." Und du meinst es ernst.',
        setsFlags: ['trail_honored_stefan'],
      },
    ],
  },

  // ── sq_external_contact ───────────────────────────────────────────────
  {
    id: 'adv_sq_contact_1',
    title: 'Der anonyme Tipp',
    category: 'story',
    weekRange: [5, 12],
    probability: 1,
    description: `Die E-Mail hat keinen Absender, den du zuordnen kannst, und einen PGP-Anhang. Betreff: **"Sie sind nicht die Einzigen."**

Entschlüsselt steht darin: "Ich weiß, wonach Sie suchen. Ich habe dasselbe gesehen - woanders, aber dasselbe Muster. Dieselbe Uhrzeit. Denselben freundlichen Techniker. Wenn Sie reden wollen: Antworten Sie signiert. Wenn nicht: Löschen Sie das hier und passen Sie auf sich auf."

Kein Name. Kein Beweis. Nur jemand, der Dinge weiß, die außerhalb dieses Hauses eigentlich niemand wissen kann.

**Jens** (angespannt): "Das kann eine Falle sein. Genau so würde ich jemanden ködern, den ich beobachte." Er hat recht. Und trotzdem: Der Absender kennt die 23:47.`,
    involvedCharacters: ['kollege'],
    tags: ['story', 'sidequest', 'contact', 'security'],
    choices: [
      {
        id: 'verify_headers',
        text: 'Erst die Mail forensisch prüfen, bevor du irgendetwas tust',
        effects: { skills: { security: 4, netzwerk: 2 } },
        resultText: 'Header, Signatur, Metadaten. Die Mail ist über drei Länder geroutet, aber der PGP-Schlüssel ist echt und seit Jahren im Umlauf - verknüpft mit Beiträgen in einem Fachforum für kommunale IT-Sicherheit. Wer auch immer das ist: Es ist keine Wegwerf-Identität. Es ist ein Mensch mit einer Geschichte.',
        setsFlags: ['contact_verified'],
      },
      {
        id: 'reply_careful',
        text: 'Vorsichtig antworten - signiert, aber ohne etwas preiszugeben',
        effects: { skills: { softSkills: 3, security: 2 } },
        resultText: 'Du antwortest mit genau einem Satz und deiner Signatur: "Ich höre zu. Aber ich gebe nichts, bevor ich weiß, mit wem ich rede." Zwanzig Minuten später die Antwort: "Fair. Das hätte Stefan auch gesagt." Dein Puls setzt kurz aus. Der Absender kannte Stefan.',
        setsFlags: ['contact_replied'],
      },
      {
        id: 'loop_in_bsi',
        text: 'Auf Nummer sicher gehen und den Kontakt beim BSI melden',
        effects: { compliance: 5, relationships: { chef: 3 } },
        resultText: 'Du dokumentierst den Kontakt und meldest ihn offiziell. Kein Alleingang, keine Angriffsfläche. Das BSI nimmt es zu den Akten und rät zur Vorsicht - aber verbietet dir nicht, zuzuhören. Sauber abgesichert gehst du einen Schritt weiter.',
        setsFlags: ['contact_reported'],
      },
    ],
  },

  {
    id: 'adv_sq_contact_2',
    title: 'Falle oder Freund',
    category: 'story',
    weekRange: [5, 12],
    probability: 1,
    description: `Der Austausch geht weiter, Zeile um Zeile, jede signiert. Der Unbekannte gibt dir Häppchen: eine Uhrzeit, ein Firmenname-Fragment, ein Hinweis, wohin du im eigenen Netz schauen sollst. Jedes Häppchen stimmt.

Aber genau das ist das Problem. Es stimmt *zu gut*. Entweder redest du mit jemandem, der genau dasselbe durchmacht - oder mit jemandem, der dein Netz bereits so gut kennt, dass er dich mühelos in die Irre führen könnte.

**Henry** (den du dazugeholt hast, trocken): "Zwei Möglichkeiten. Entweder ein Leidensgenosse, der Kontakt sucht. Oder der Angreifer, der ausloten will, wie viel du schon weißt. Beide würden exakt so schreiben." Er zuckt mit den Schultern. "Ich würde ihn einfach fragen, was nur ein Opfer wissen kann."`,
    involvedCharacters: ['kollege'],
    tags: ['story', 'sidequest', 'contact', 'mystery'],
    choices: [
      {
        id: 'test_question',
        text: 'Eine Fangfrage stellen, die nur ein echtes Opfer beantworten kann',
        effects: { skills: { security: 4, softSkills: 2 } },
        resultText: 'Du fragst nach einem Detail, das kein Angreifer kennen würde, weil es nur aus der Opferperspektive Sinn ergibt - dem Gefühl, wenn die eigene Chefetage einem nicht glaubt. Die Antwort ist zu bitter, zu persönlich, um gespielt zu sein. "Sie haben mich für hysterisch erklärt. Bis es zu spät war." Das ist echt.',
        setsFlags: ['contact_tested'],
      },
      {
        id: 'controlled_meet',
        text: 'Ein kontrolliertes Gespräch vorschlagen - verschlüsselt, zu deinen Bedingungen',
        effects: { skills: { security: 3 }, stress: 5 },
        resultText: 'Du legst die Regeln fest: verschlüsselter Kanal, deine Uhrzeit, keine Klarnamen. Der Kontakt akzeptiert ohne Zögern - kein Drängen, kein Nachbohren, wo du wohnst oder welche Systeme du fährst. Ein Angreifer hätte gedrängt. Dieser Mensch will nur reden. Dein Misstrauen beginnt zu bröckeln.',
        setsFlags: ['contact_controlled'],
      },
    ],
  },

  {
    id: 'adv_sq_contact_3',
    title: 'Zwei Häuser, ein Muster',
    category: 'story',
    weekRange: [5, 12],
    probability: 1,
    description: `Am Ende ist es kein Schattenmann und keine Falle. Es ist eine Frau. IT-Leiterin bei den Stadtwerken im Nachbarlandkreis - müde Stimme, präziser Verstand.

Sie hat dasselbe erlebt wie ihr: kleine Anomalien, ein Drucker, der spinnt, eine Wartungsfirma, die montags kommt und über das Wetter redet. Und dann, fast, eine Katastrophe. Sie hat es gerade noch abgewendet - und niemand hat ihr geglaubt, wie knapp es war.

"Wir dachten alle, wir wären Einzelfälle", sagt sie. "Aber das sind wir nicht. Dieselbe Firma. Dieselbe Masche. Und wenn wir zwei es sind - wie viele sind wir dann insgesamt?"

Du hast keinen anonymen Tippgeber mehr. Du hast einen Verbündeten. Und eine erschreckende neue Frage.`,
    involvedCharacters: ['kollege'],
    tags: ['story', 'sidequest', 'contact', 'supply-chain'],
    choices: [
      {
        id: 'share_intel',
        text: 'Erkenntnisse bündeln und einen gemeinsamen Kanal aufbauen',
        effects: { skills: { security: 5, softSkills: 3 } },
        resultText: 'Ihr legt eure Puzzleteile zusammen. Was ihr allein hattet, war beunruhigend. Was ihr gemeinsam habt, ist ein Fall: eine Firma, die sich in ein halbes Dutzend Kommunen eingenistet hat wie ein Generalschlüssel. Ihr habt jetzt Zeugen füreinander. Und das ändert alles.',
        setsFlags: ['contact_intel_shared'],
      },
      {
        id: 'map_the_firm',
        text: 'Gemeinsam kartieren, bei wie vielen Häusern die Firma im Vertrag steht',
        effects: { skills: { security: 4, troubleshooting: 2 } },
        resultText: 'Zwei Abende, ein paar Anrufe an Kolleginnen und Kollegen, die niemand sonst führen konnte. Das Ergebnis ist eine Landkarte, bei der einem schlecht wird: dieselbe Wartungsfirma, quer durch die Region, überall mit privilegiertem Fernzugang. Wenn das je zeitgleich losgeht, brennt nicht ein Haus. Dann brennen alle.',
        setsFlags: ['contact_firm_mapped'],
      },
    ],
  },
];
