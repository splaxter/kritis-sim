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
];
