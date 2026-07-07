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

**Bjorg** (ohne vom Monitor aufzuschauen): "Der Drucker ist verflucht. Stefan hat das auch gesagt. Ich fasse das Ding nicht an."

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
        resultText: '"Alle", sagt Frau Weber. "Er hängt im Netzwerk." Bjorg murmelt: "Genau wie die Kaffeemaschine." Ihr schaut euch an.',
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
        text: 'Bjorg anrufen. Um Mitternacht. Er wollte das Ding nie anfassen.',
        effects: { relationships: { kollegen: 10 }, stress: -5 },
        resultText: 'Zwanzig Minuten später steht Bjorg in Jogginghose in der Tür - mit einem Fläschchen Weihwasser in der einen und seinem Laptop in der anderen Hand. "Falls Technik nicht reicht", sagt er ernst. Ihr fangt beide an zu lachen. Dann setzt er sich neben dich.',
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
        text: 'Frau Weber und Bjorg die ganze Geschichte erzählen',
        effects: { relationships: { kollegen: 10, fachabteilung: 5 }, stress: -5 },
        resultText: '"Also KEIN Geist?", fragt Frau Weber fast enttäuscht. "Schlimmer", sagt Bjorg leise. "Ein Geist macht keine Firmware-Updates." Er schaut dich an. "Stefan hat sowas gesucht. Genau sowas." Zum ersten Mal nimmt er dich ganz ernst.',
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
        resultText: '"Historisch gewachsen", sagt Bjorg und zuckt mit den Schultern, als wäre das eine vollständige Antwort. Auf Nachfrage: "Also... irgendwer hat irgendwann irgendwas angeschlossen. Seit zehn Jahren." Immerhin ehrlich.',
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
];
