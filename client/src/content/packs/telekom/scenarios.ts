// Deutsche Telekom Business - Scenarios
import { Scenario } from '@kritis/shared';

/* ── Messreihen für TELEKOM-SC-001 (sporadische Ausfälle) ───────────────────
 *
 * Die Messung belegt ein MUSTER und einen Ort — sie belegt keine kaputte
 * Komponente. „Defekter Verstärker am Verteiler" ist die Erzählung, die der
 * Techniker später daraus macht; wer sie vorwegnimmt, behauptet etwas, das
 * seine eigene Messung nicht hergibt.
 */

const pingExtern = `zeit;9.9.9.9;1.1.1.1;8.8.8.8
2026-04-13 08:30;ok;ok;ok
2026-04-13 09:30;ok;ok;ok
2026-04-13 10:04;ausfall;ausfall;ausfall
2026-04-13 11:47;ausfall;ausfall;ausfall
2026-04-13 13:12;ausfall;ausfall;ausfall
2026-04-13 15:00;ok;ok;ok
2026-04-13 18:30;ok;ok;ok
2026-04-14 08:00;ok;ok;ok
2026-04-14 10:31;ausfall;ausfall;ausfall
2026-04-14 12:05;ausfall;ausfall;ausfall
2026-04-14 13:58;ausfall;ausfall;ausfall
2026-04-14 16:20;ok;ok;ok
2026-04-14 21:10;ok;ok;ok
2026-04-15 07:15;ok;ok;ok
2026-04-15 10:12;ausfall;ausfall;ausfall
2026-04-15 11:03;ausfall;ausfall;ausfall
2026-04-15 13:40;ausfall;ausfall;ausfall
2026-04-15 17:45;ok;ok;ok
2026-04-15 23:30;ok;ok;ok
`;

const pingGateway = `zeit;192.168.1.1
2026-04-13 10:04;ok
2026-04-13 11:47;ok
2026-04-13 13:12;ok
2026-04-14 10:31;ok
2026-04-14 12:05;ok
2026-04-14 13:58;ok
2026-04-15 10:12;ok
2026-04-15 11:03;ok
2026-04-15 13:40;ok

Der Router war zu JEDEM Zeitpunkt erreichbar, an dem die externen Ziele
ausfielen. Das eigene Netz und das Gerät scheiden damit aus.
`;

const messHinweis = `Messaufbau — Kurzbeschreibung

Alle 30 Sekunden ein Ping auf drei voneinander unabhängige externe Ziele
(9.9.9.9, 1.1.1.1, 8.8.8.8) sowie auf das lokale Gateway (192.168.1.1).

EINE ZEILE = EINE MESSRUNDE, mit dem Ergebnis für jedes Ziel. Protokolliert
wird, was von der Vorgabe abweicht, plus stündliche Kontrollzeilen. Ein
Ausfall gilt als solcher, wenn drei aufeinanderfolgende Pings an dasselbe
Ziel unbeantwortet bleiben.

Zum Zählen genügt deshalb die Zahl der Zeilen mit „ausfall".
`;

/* ── Unterlagen für TELEKOM-SC-006 (Bandbreiteneinbruch) ────────────────────
 *
 * Drei Zahlen, die auseinanderlaufen: was bestellt ist, was das Gerät
 * ausgehandelt hat, und was ankommt. Die WLAN-Messung ist der Köder — sie
 * schwankt so stark, dass sie jede These stützt und keine belegt.
 */

const vertragsauszug = `Auszug Leistungsschein — Standort Betriebshof
Produkt: Company Connect 500
Gebuchte Bandbreite: 200 Mbit/s symmetrisch
Gültig ab: 14.01.2026
Leitungskennung: DTAG-41-882-7194
`;

const routerSync = `Statusseite Router — abgerufen 21.04.2026, 09:12

  Verbindung:        aktiv seit 08.04.2026, 02:41
  Profil:            Business 50
  Downstream sync:   52.4 Mbit/s
  Upstream sync:     51.8 Mbit/s
  Leitungsfehler:    0 CRC, 0 FEC in 13 Tagen

Die Leitung ist fehlerfrei. Sie synchronisiert nur auf einem anderen Profil,
als der Leistungsschein ausweist.
`;

const messungLan = `zeit;art;down_mbit;up_mbit
2026-04-21 09:20;kabel;47.1;46.9
2026-04-21 09:25;kabel;47.4;46.8
2026-04-21 09:31;kabel;46.9;47.0
2026-04-21 14:02;kabel;47.2;46.7
2026-04-21 19:45;kabel;47.3;47.1

Kabelgebunden, direkt am Router, sonst nichts im Netz. Fünf Messungen,
Streuung unter einem Mbit.
`;

const messungWlan = `zeit;art;down_mbit;up_mbit
2026-04-21 09:22;wlan;18.4;12.1
2026-04-21 09:27;wlan;44.9;41.2
2026-04-21 09:33;wlan;27.6;22.8
2026-04-21 14:05;wlan;9.2;7.4
2026-04-21 19:48;wlan;41.7;38.0

Aus dem Besprechungsraum, zwei Wände entfernt. Die Streuung ist größer als
der gesuchte Effekt — als Beleg gegenüber dem Anbieter unbrauchbar.
`;

export const telekomScenarios: Scenario[] = [
  {
    id: 'TELEKOM-SC-001',
    title: 'Die Leitung ist weg — aber nur manchmal',
    category: 'troubleshooting',
    difficulty: 3,
    flavorText: 'Seit 3 Tagen berichten Kollegen von sporadischen Internet-Ausfällen. Manchmal 5 Minuten, manchmal 30 Sekunden. Du rufst die Telekom an. Thomas Kellermann: "Ich sehe hier keine Störung. Haben Sie den Router schon neugestartet?" Der Router wurde schon 4x neugestartet.',
    urgency: 'high',
    choices: [
      {
        id: 'A',
        text: 'Drei Tage messen lassen und die Protokolle selbst auswerten',
        outcome: 'PERFECT',
        // Der Ergebnistext bleibt bei dem, was die Messung hergibt: Muster und
        // Ort. Welches Bauteil defekt ist, findet der Techniker heraus — das
        // darf der Spieler nicht aus einer Ping-Statistik erfinden.
        consequence: 'Du schickst Thomas drei Tage Messprotokoll statt einer Beschwerde. Er wird zum ersten Mal konkret: "Das ist ein Muster, kein Gefühl. Ich gebe das an die Technik weiter." Zwei Tage später kommt ein Techniker an den Verteiler — mit einer Vorstellung davon, wonach er sucht.',
        scoreChange: 200,
        reputationChange: 20,
        lesson: 'Eine Messung belegt ein Muster und grenzt einen Ort ein. Sie benennt kein defektes Bauteil — das ist Sache dessen, der hinfährt. Wer die Diagnose vorwegnimmt, gibt dem Anbieter die Gelegenheit, sie zu widerlegen und damit die ganze Meldung.',
        terminalCommand: true,
      },
      {
        id: 'B',
        text: 'Auf Thomas bestehen: "Schicken Sie einen Techniker"',
        outcome: 'PARTIAL_SUCCESS',
        consequence: 'Thomas: "Techniker-Termin ist Donnerstag, 8-17 Uhr." Donnerstag: Techniker kommt um 15:47 Uhr. Misst einmal die Leitung: "Alles in Ordnung, 195 Mbit, keine Fehler." Natürlich — während der Messung war gerade kein Ausfall. Problem bleibt bestehen.',
        scoreChange: 0,
        reputationChange: 0,
        lesson: 'Ein einmaliger Techniker-Besuch findet intermittierende Probleme selten. Nur Langzeit-Monitoring oder Provider-seitige Logs über Tage können solche Muster erkennen.',
      },
      {
        id: 'C',
        text: 'Den Router durch eigenes Gerät ersetzen um Hardware-Fehler auszuschließen',
        outcome: 'SUCCESS',
        consequence: 'Du ersetzt die Telekom-Fritzbox durch deine eigene pfSense. Gleiches Problem. Damit ist der Router ausgeschlossen. Du gehst zurück zur Telekom mit klarer Aussage: "Eigener Router, gleiches Problem. Das Problem ist vor dem Router." Thomas eskaliert jetzt ernster.',
        scoreChange: 100,
        reputationChange: 10,
        lesson: 'Eigene Hardware zu verwenden hilft beim Ausschlussverfahren. Wenn das Problem auch mit eigener Hardware auftritt, ist der Provider-Router nicht schuld — und das nimmt dem Provider das Standard-Argument.',
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'warm-mon-01',
      username: 'timo',
      currentPath: '/srv/messung',
      // Das Berichtsformat steht im Auftrag, nicht im Kopf des Autors. Eine
      // Bewertung über Wortlisten wies richtige Befunde ab („10:04-13:58")
      // und nahm falsche an; ein angesagtes Schema ist für den Spieler
      // durchschaubar und für die Prüfung eindeutig.
      taskText:
        '/srv/messung auswerten. Ergebnis nach /home/timo/meldung.md:\nanzahl: <Ausfälle>\nzeitfenster: <von>-<bis>\nlokal: erreichbar | gestört\nursache: <belegt? sonst: unbekannt>',
      vfsOverlay: {
        directories: ['/srv/messung'],
        files: [
          { path: '/srv/messung/ping_extern.csv', content: pingExtern },
          { path: '/srv/messung/ping_gateway.csv', content: pingGateway },
          { path: '/srv/messung/messaufbau.txt', content: messHinweis },
        ],
      },
      commands: [],
      commandSkillGain: { cat: { linux: 1 }, grep: { linux: 2, netzwerk: 1 }, awk: { linux: 2, netzwerk: 2 }, sort: { linux: 1 }, wc: { linux: 1 } },
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            { fileRead: '/srv/messung/ping_extern.csv' },
            // Ohne die Gegenmessung am eigenen Gateway ist die Meldung
            // angreifbar: „liegt bestimmt an Ihrem Router" ist das erste, was
            // die Hotline sagt.
            { fileRead: '/srv/messung/ping_gateway.csv' },
            // Neun Messrunden mit Ausfall — eine Zeile je Runde.
            { file: '/home/timo/meldung.md', matches: '^anzahl:\\s*9\\b' },
            // Das Zeitfenster in vollen Stunden ODER als gemessene Spanne:
            // „10-14", „10 bis 14", „10:04-13:58" sind alle richtig.
            {
              file: '/home/timo/meldung.md',
              matches: '^zeitfenster:\\s*10(:\\d\\d)?\\s*(-|–|bis)\\s*1[34](:\\d\\d)?',
            },
            { file: '/home/timo/meldung.md', matches: '^lokal:\\s*erreichbar\\b' },
            // Der Kern der Lektion, jetzt als eigene Zeile statt als
            // Wort-Blacklist: Die Messung belegt ein Muster und einen Ort. Sie
            // belegt KEIN defektes Bauteil. „unbekannt" ist hier die einzige
            // ehrliche Angabe — und der Auftrag sagt das ausdrücklich.
            { file: '/home/timo/meldung.md', matches: '^ursache:\\s*unbekannt\\b' },
          ],
          resultText:
            'Neun Ausfälle an drei Tagen, alle zwischen 10:04 und 13:58, jedes Mal alle drei externen Ziele gleichzeitig — und das Gateway zu jedem dieser Zeitpunkte erreichbar.\n\nDamit ist beides gesagt, was eine Störungsmeldung braucht: ein reproduzierbares Zeitfenster und der Nachweis, dass das eigene Netz und das eigene Gerät ausscheiden.\n\nUnd die vierte Zeile ist die wichtigste. „unbekannt" sieht nach Schwäche aus, ist aber die einzige Angabe, die diese Messung deckt. Wer stattdessen ein Bauteil benennt, liefert dem Anbieter etwas zum Widerlegen — und mit der Ursache fällt dann auch das Zeitfenster.',
          skillGain: { netzwerk: 6, troubleshooting: 4, softSkills: 2 },
          effects: {},
        },
      ],
      hints: [
        'Zwei Messreihen liegen vor. Die eine zeigt, wann es klemmt — die andere beantwortet die Frage, die die Hotline als Erstes stellen wird.',
        'Eine Zeile ist eine Messrunde. Zählen heißt also: Zeilen mit „ausfall" zählen. Und die Uhrzeiten daneben ergeben das Fenster.',
        'Bei „ursache" ist die Frage nicht, was wahrscheinlich kaputt ist, sondern was diese Messung BELEGT.',
        '`grep -c ausfall ping_extern.csv` für die Zahl, `grep ausfall ping_extern.csv` für die Zeiten, `cat ping_gateway.csv` für die Gegenprobe.',
        'Meldung schreiben, eine Zeile nach der anderen — `>` legt neu an, `>>` hängt an: `echo "anzahl: 9" > /home/timo/meldung.md`, dann `echo "zeitfenster: 10-14" >> /home/timo/meldung.md`, `echo "lokal: erreichbar" >> /home/timo/meldung.md`, `echo "ursache: unbekannt" >> /home/timo/meldung.md`',
      ],
    },
    realWorldReference: 'Intermittierende Verbindungsprobleme sind die schwierigsten zu diagnostizieren. Automatisiertes Monitoring ist der einzige zuverlässige Weg, sie zu dokumentieren.',
    bsiReference: 'BSI IT-Grundschutz: NET.1.2 Netzmanagement',
    involvedNpcs: ['TELEKOM-THOMAS'],
    tags: ['wan', 'troubleshooting', 'monitoring', 'documentation'],
  },
  {
    id: 'TELEKOM-SC-002',
    title: 'Wartungsankündigung: "Geplante Arbeiten im Backbone"',
    category: 'crisis_management',
    difficulty: 2,
    flavorText: 'Mittwoch, 14:00 Uhr. Mail von noreply@telekom.de: "Am kommenden Samstag, 02:00-06:00 Uhr, führen wir Wartungsarbeiten durch. Kurzzeitige Verbindungsunterbrechungen möglich." Problem: Eure Müllabfuhr startet samstags um 05:00 Uhr und braucht die Dispo-Verbindung.',
    urgency: 'medium',
    choices: [
      {
        id: 'A',
        text: 'Thomas anrufen und um Verschiebung oder Zeitfenster-Zusage bitten',
        outcome: 'PARTIAL_SUCCESS',
        consequence: 'Thomas: "Backbone-Wartungen kann ich nicht verschieben, das ist deutschlandweit koordiniert. Aber ich kann prüfen ob euer Segment betroffen ist." Nach 2 Stunden: "Ihr Segment wird voraussichtlich gegen 03:30 gewartet, danach sollte alles laufen. Aber keine Garantie." Du planst einen Workaround mit mobiler Datenverbindung als Backup.',
        scoreChange: 75,
        reputationChange: 5,
        lesson: 'Backbone-Wartungen sind nicht verhandelbar, aber Provider können oft Details zu Timing und betroffenen Segmenten geben. Das hilft bei der Planung von Workarounds.',
      },
      {
        id: 'B',
        text: 'Redundante Verbindung über Mobilfunk aktivieren und automatisches Failover einrichten',
        outcome: 'PERFECT',
        consequence: 'Du aktivierst eure LTE-Backup-Verbindung mit automatischem Failover in der pfSense. Am Samstag: Hauptverbindung fällt um 03:12 aus, Failover auf LTE in 8 Sekunden. Dispo-System läuft unterbrechungsfrei. Hauptleitung um 04:47 wieder da. Automatisches Failback. Niemand hat etwas gemerkt.',
        scoreChange: 200,
        reputationChange: 15,
        lesson: 'Redundanz ist die Antwort auf geplante und ungeplante Ausfälle. Automatisches Failover bedeutet: Du musst nicht um 03:00 Uhr wach sein um umzuschalten. KRITIS-Infrastruktur braucht immer einen Plan B.',
        followupEvent: 'REDUNDANCY_SUCCESS',
      },
      {
        id: 'C',
        text: 'Samstags-Dispo auf Montag verschieben — ein Tag ohne Müllabfuhr ist akzeptabel',
        outcome: 'FAIL',
        consequence: 'Die Fachabteilung ist entsetzt: "Ein Samstag ohne Abfuhr? Im Sommer? Bei 30 Grad?" Der GF ruft an: "Finden Sie eine andere Lösung." Du organisierst hastig Offline-Papierlisten für die Fahrer. Chaos am Samstag, 3 Touren fahren falsche Routen.',
        scoreChange: -150,
        reputationChange: -20,
        lesson: 'IT-Wartungsfenster auf Geschäftsprozesse abzuwälzen ist keine Lösung. Die IT muss Continuity gewährleisten, nicht die Fachabteilung mit Workarounds belasten.',
      },
    ],
    realWorldReference: 'Provider-Wartungen finden oft nachts statt, aber "nachts" kann für 24/7-Betriebe wie Entsorgung kritisch sein. Redundante Anbindung ist bei KRITIS Standard.',
    bsiReference: 'BSI IT-Grundschutz: DER.4 Notfallmanagement',
    involvedNpcs: ['TELEKOM-THOMAS'],
    tags: ['maintenance', 'redundancy', 'planning', 'kritis'],
  },
  {
    id: 'TELEKOM-SC-003',
    title: 'Die SLA-Beschwerde nach dem Jahresausfall',
    category: 'vendor_management',
    difficulty: 3,
    flavorText: 'Jahresgespräch mit der Telekom. Sabine bringt bunte PowerPoints mit "99.7% Verfügbarkeit — SLA erfüllt!" Deine eigenen Zahlen: 14 Störungen, 27 Stunden Ausfall, rechnerisch 99.69%. Knapp über dem SLA-Minimum von 99.5%. Aber: 8 Stunden davon waren an einem Dienstag um 10 Uhr morgens.',
    urgency: 'low',
    choices: [
      {
        id: 'A',
        text: 'Akzeptieren — SLA ist formal erfüllt, auch wenn es sich anders anfühlt',
        outcome: 'FAIL',
        consequence: 'Sabine lächelt: "Dann sind wir ja einig. Zur Vertragsverlängerung — wir bieten 5% Rabatt bei 3-Jahres-Laufzeit." Du unterschreibst. Nächstes Jahr: gleiche Probleme, aber jetzt mit 3-Jahres-Vertrag ohne Ausstiegsoption.',
        scoreChange: -100,
        reputationChange: -10,
        lesson: 'SLA-Erfüllung auf dem Papier bedeutet nicht, dass der Service gut ist. Die Verteilung der Ausfälle ist genauso wichtig wie die Gesamtmenge. 8 Stunden Ausfall am Dienstag 10 Uhr ist schlimmer als 8 Stunden nachts.',
      },
      {
        id: 'B',
        text: 'Mit eigener Ausfallstatistik argumentieren: "SLA sagt nichts über Timing"',
        outcome: 'SUCCESS',
        consequence: 'Du zeigst deine Dokumentation: "99.7% klingt gut, aber 8 Stunden am Dienstag Vormittag haben uns €12.000 Produktivität gekostet. Ihre Nachtausfälle tun nicht weh, aber Business-Hours-Ausfälle schon." Sabine wird unsicher: "Was schlagen Sie vor?" Du forderst: SLA-Differenzierung nach Geschäftszeiten.',
        scoreChange: 150,
        reputationChange: 15,
        lesson: 'Eigene Dokumentation ist Macht in Verhandlungen. SLAs mit Differenzierung nach Geschäftszeiten (99.9% 8-18 Uhr, 99% nachts) sind für KRITIS sinnvoller als Pauschal-SLAs.',
      },
      {
        id: 'C',
        text: 'Anbieter-Wechsel androhen: "Wir evaluieren gerade Vodafone Business"',
        outcome: 'PARTIAL_SUCCESS',
        consequence: 'Sabine wird blass: "Lassen Sie uns über Verbesserungen sprechen!" Du bekommst einen Technical Account Manager zugewiesen und ein Premium-Support-Paket kostenlos für 1 Jahr. Aber: Vodafone evaluieren wäre tatsächlich 6 Monate Arbeit. Deine Drohung war ein Bluff.',
        scoreChange: 75,
        reputationChange: 10,
        lesson: 'Anbieterwechsel anzudrohen wirkt — aber nur wenn man es im Notfall auch durchziehen könnte. Sonst ist man beim nächsten Mal der Kunde der nur blufft. Alternative Angebote einzuholen ist auch ohne Wechselabsicht sinnvoll für Verhandlungen.',
      },
    ],
    realWorldReference: 'SLA-Gespräche sind oft Formalität. Provider zeigen bunte Zahlen, Kunden nicken. Eigene Dokumentation und konkrete Forderungen ändern die Dynamik.',
    bsiReference: 'BSI IT-Grundschutz: OPS.2.1 Outsourcing',
    involvedNpcs: ['TELEKOM-SABINE'],
    tags: ['sla', 'negotiation', 'contract', 'documentation'],
  },
  {
    id: 'TELEKOM-SC-004',
    title: 'Router kaputt — aber welcher Ersatz?',
    category: 'troubleshooting',
    difficulty: 2,
    flavorText: 'Freitagmorgen, 7:30 Uhr. Der Telekom-Router ist tot. Keine LEDs, keine Reaktion. Du rufst die Störungshotline an. Nach 25 Minuten: "Der Techniker bringt einen Ersatz-Router. Termin: Montag." Drei Tage ohne Internet im Hauptgebäude.',
    urgency: 'critical',
    choices: [
      {
        id: 'A',
        text: 'Eskalieren: "Wir sind KRITIS-Betreiber, wir brauchen heute noch einen Ersatz!"',
        outcome: 'SUCCESS',
        consequence: 'Nach 3 Eskalationsstufen und einem Anruf bei Sabine (Key Account) wird ein Techniker aus Düsseldorf zu euch geschickt. Ankunft: 16:30 Uhr. Neuer Router läuft um 18:00 Uhr. Freitag gerettet — mit viel Aufwand.',
        scoreChange: 100,
        reputationChange: 10,
        lesson: 'KRITIS-Status hilft bei Eskalationen, aber nur wenn der Provider ihn kennt und der Vertrag das abbildet. Ohne Key-Account-Beziehung wärst du Montag dran gewesen.',
      },
      {
        id: 'B',
        text: 'Eigenen Ersatz-Router konfigurieren und Telekom-Zugangsdaten eingeben',
        outcome: 'PERFECT',
        consequence: 'Du holst eure Ersatz-pfSense aus dem Lager, gibst die PPPoE-Zugangsdaten ein (die du vorausschauend dokumentiert hattest). Internet läuft um 8:15 Uhr wieder. Du rufst die Telekom erst dann an: "Router defekt, ich brauche Ersatz, aber Internet läuft erstmal über eigene Hardware."',
        scoreChange: 250,
        reputationChange: 25,
        lesson: 'Ersatz-Hardware vorhalten und Zugangsdaten dokumentieren macht dich unabhängig vom Provider-Tempo. PPPoE-Credentials sollten griffbereit sein — nicht erst beim Ausfall suchen.',
      },
      {
        id: 'C',
        text: 'LTE-Hotspot aufbauen und das Wochenende überbrücken',
        outcome: 'PARTIAL_SUCCESS',
        consequence: 'Du verteilst 3 Firmen-Handys als Hotspots. Notbetrieb läuft, aber: 20 Mbit geteilt durch 40 Mitarbeiter ist sehr langsam. Cloud-Anwendungen laggen, VPN ins Rathaus funktioniert kaum. Montag freuen sich alle auf den neuen Router.',
        scoreChange: 50,
        reputationChange: 5,
        lesson: 'LTE-Backup für Notfälle ist besser als nichts, aber kein vollwertiger Ersatz für eine Geschäftsleitung. Kapazität und Latenz sind oft nicht ausreichend für normale Produktivität.',
      },
    ],
    realWorldReference: 'Hardware-Ausfälle passieren. Provider-SLA sagt "Next Business Day" — das kann bei Freitags-Ausfällen 3 Tage bedeuten. Eigene Ersatzhardware eliminiert dieses Risiko.',
    bsiReference: 'BSI IT-Grundschutz: DER.4 Notfallmanagement',
    involvedNpcs: ['TELEKOM-THOMAS', 'TELEKOM-SABINE'],
    tags: ['hardware', 'emergency', 'redundancy', 'planning'],
  },
  {
    id: 'TELEKOM-SC-005',
    title: 'Der Verteilerkasten im Hochwasser',
    category: 'crisis_management',
    difficulty: 4,
    flavorText: 'Starkregen-Ereignis in der Region. Euer Internet ist weg, das Telefon auch. Thomas meldet sich per Handy: "Der Outdoor-Verteiler am Kreisverkehr steht unter Wasser. Betrifft 340 Anschlüsse im Gewerbegebiet. Reparatur frühestens übermorgen — wir müssen auf trockene Straßen warten."',
    urgency: 'critical',
    choices: [
      {
        id: 'A',
        text: 'Notfall-Plan aktivieren: Satellitenverbindung + LTE-Fallback',
        outcome: 'PERFECT',
        consequence: 'Ihr habt für genau diesen Fall eine Starlink-Antenne im Keller. 30 Minuten später: 100 Mbit über Satellit. Die Dispo läuft, die Leitstelle ist erreichbar, die Müllabfuhr fährt. Drei Konkurrenten im Gewerbegebiet stehen komplett still.',
        scoreChange: 300,
        reputationChange: 30,
        lesson: 'Disaster Recovery heißt: Der Plan existiert BEVOR das Disaster passiert. Satellitenverbindung als letzter Fallback bei regionalen Ausfällen ist bei KRITIS Gold wert. Das Starlink-Abo kostet 100€/Monat — der Ausfall kostet 100€/Stunde.',
      },
      {
        id: 'B',
        text: 'Zum Verteiler fahren und Lage selbst einschätzen',
        outcome: 'PARTIAL_SUCCESS',
        consequence: 'Du fährst hin: Der Kasten steht tatsächlich 30cm im Wasser. Aber: 50m weiter ist ein zweiter Verteiler, trocken. Du rufst Thomas an: "Kann man unser Kabel auf den trockenen Verteiler umpatchen?" Thomas: "Technisch ja, aber das dauert genau so lang wie die Reparatur." Immerhin weißt du jetzt, dass es eine Alternative gäbe.',
        scoreChange: 50,
        reputationChange: 10,
        lesson: 'Vor-Ort-Kenntnis der Infrastruktur hilft. Zu wissen wo der Verteiler ist und welche Alternativen existieren, macht dich zu einem besseren Gesprächspartner für den Provider.',
      },
      {
        id: 'C',
        text: 'Warten und den Notbetrieb mit Handys organisieren',
        outcome: 'FAIL',
        consequence: '48 Stunden Notbetrieb mit Handys. Die Leitstelle kann die Fahrzeuge nicht tracken. Zwei Sammelfahrzeuge fahren dieselbe Tour doppelt. Eine Beschwerde-Welle rollt an. Der GF fragt: "Haben wir keinen Plan für sowas?"',
        scoreChange: -200,
        reputationChange: -20,
        lesson: 'Naturereignisse sind vorhersehbar (nicht wann, aber dass). KRITIS-Betreiber müssen Pläne für regionale Infrastrukturausfälle haben. Warten ist keine Strategie.',
      },
    ],
    realWorldReference: 'Das Ahrtal-Hochwasser 2021 hat gezeigt: Regionale Infrastruktur kann komplett ausfallen. Satelliten-Backup (Starlink, Konnect) wird seitdem bei KRITIS-Betreibern häufiger eingeplant.',
    bsiReference: 'BSI IT-Grundschutz: DER.4 Notfallmanagement, INF.1 Allgemeines Gebäude',
    involvedNpcs: ['TELEKOM-THOMAS'],
    tags: ['disaster', 'redundancy', 'satellite', 'planning'],
  },
  {
    id: 'TELEKOM-SC-006',
    title: 'Der mysteriöse Bandbreiten-Einbruch',
    category: 'troubleshooting',
    difficulty: 3,
    flavorText: 'Seit einer Woche beschweren sich alle: "Das Internet ist so langsam!" Dein Monitoring zeigt: Statt 200 Mbit nur noch 47 Mbit. Du rufst Thomas an. "Bei uns sieht alles normal aus. Haben Sie vielleicht intern einen Download-Server laufen der alles blockiert?"',
    urgency: 'high',
    choices: [
      {
        id: 'A',
        text: 'Interne Analyse: Wer verbraucht die Bandbreite?',
        outcome: 'PARTIAL_SUCCESS',
        consequence: 'Du analysierst: Kein interner Verursacher. Alle PCs zusammen machen 12 Mbit. Der Rest fehlt einfach. Du gehst zurück zur Telekom: "Intern ist niemand. Die 47 Mbit sind schon auf der Leitung, nicht unser Verbrauch." Thomas muss jetzt auf seiner Seite suchen.',
        scoreChange: 75,
        reputationChange: 5,
        lesson: 'Intern auszuschließen ist wichtig, bevor man den Provider beschuldigt. Aber: Nicht zu lange suchen — wenn intern nichts ist, ist es extern.',
      },
      {
        id: 'B',
        text: 'Leistungsschein, Routerstatus und eigene Messung nebeneinanderlegen',
        outcome: 'PERFECT',
        consequence: 'Drei Zahlen auf einer Seite, und die Diskussion ist vorbei, bevor sie anfängt. Thomas liest, schweigt kurz und sagt: "Das Profil ist falsch gesetzt. Das kommt von der Wartung im April." Die Umstellung läuft am selben Tag.',
        scoreChange: 200,
        reputationChange: 20,
        lesson: 'Ein Widerspruch zwischen drei Zahlen ist ein Prüfauftrag, den niemand wegdiskutieren kann: was gebucht ist, was das Gerät aushandelt, was ankommt. Und gemessen wird am Kabel — eine WLAN-Messung streut stärker als der gesuchte Effekt und belegt deshalb gar nichts.',
        terminalCommand: true,
      },
      {
        id: 'C',
        text: 'Annehmen dass das temporär ist und abwarten',
        outcome: 'FAIL',
        consequence: '3 Wochen später: Immer noch 47 Mbit. Die Cloud-Backups laufen nicht mehr durch, weil sie zu lange dauern. Thomas: "Oh, ich seh hier das Profil ist falsch... das hätten Sie früher sagen müssen!" Du: "Hab ich vor 3 Wochen..." Thomas: "Das Ticket wurde geschlossen weil Sie nicht geantwortet haben." (Hast du, per Mail, aber das zählt nicht im Telekom-System.)',
        scoreChange: -150,
        reputationChange: -10,
        lesson: 'Telekommunikationsprobleme "verschwinden" selten von selbst. Jeder Tag Warten ist ein Tag verlorener Produktivität. Frühzeitig und hartnäckig nachfragen.',
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'warm-mon-01',
      username: 'timo',
      currentPath: '/srv/netz',
      taskText:
        '/srv/netz vergleichen. Ergebnis nach /home/timo/befund_bandbreite.md:\ngebucht: <Mbit laut Vertrag>\nprofil: <was der Router aushandelt>\ngemessen: <Mbit am Kabel>',
      vfsOverlay: {
        directories: ['/srv/netz'],
        files: [
          { path: '/srv/netz/leistungsschein.txt', content: vertragsauszug },
          { path: '/srv/netz/router_status.txt', content: routerSync },
          { path: '/srv/netz/messung_kabel.csv', content: messungLan },
          { path: '/srv/netz/messung_wlan.csv', content: messungWlan },
        ],
      },
      commands: [],
      commandSkillGain: { cat: { linux: 1 }, grep: { linux: 2, netzwerk: 1 }, awk: { linux: 2, netzwerk: 2 } },
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            { fileRead: '/srv/netz/leistungsschein.txt' },
            { fileRead: '/srv/netz/router_status.txt' },
            // Die kabelgebundene Messung ist der belastbare Teil. Wer nur die
            // WLAN-Werte liest, hat eine Zahl zwischen 9 und 45 und keine
            // Aussage.
            { fileRead: '/srv/netz/messung_kabel.csv' },
            // Drei Zahlen an drei benannten Stellen. Vorher genuegte ein Text,
            // der irgendwo „200" und irgendwo „50" enthielt — auch wenn er das
            // Gegenteil behauptete.
            { file: '/home/timo/befund_bandbreite.md', matches: '^gebucht:\\s*200\\b' },
            { file: '/home/timo/befund_bandbreite.md', matches: '^profil:\\s*(Business\\s*)?5[02]\\b' },
            // Die Kabelmessung liegt zwischen 46,9 und 47,4 — beide Rundungen
            // sind richtig, die WLAN-Werte (9 bis 45) liegen ausserhalb.
            { file: '/home/timo/befund_bandbreite.md', matches: '^gemessen:\\s*4[67]([.,]\\d)?\\b' },
          ],
          resultText:
            'Drei Zahlen, die nicht zueinander passen: 200 Mbit/s gebucht, Profil „Business 50" am Router, 47 Mbit/s am Kabel gemessen. Die Leitung selbst ist fehlerfrei — 0 CRC, 0 FEC in dreizehn Tagen.\n\nDamit ist es kein Leitungsproblem, sondern ein Konfigurationsfehler auf der Anbieterseite, und die Meldung lautet entsprechend nicht „langsam", sondern „falsches Profil".\n\nDie WLAN-Messung daneben schwankt zwischen 9 und 45 Mbit/s. Sie hätte jede These gestützt und keine belegt.',
          skillGain: { netzwerk: 7, troubleshooting: 3 },
          effects: {},
        },
      ],
      hints: [
        'Vier Dateien, drei Zahlen, die zusammengehören: was bestellt ist, was das Gerät aushandelt, was ankommt.',
        'Zwei Messreihen liegen vor. Eine davon streut so stark, dass sie als Beleg nichts taugt — nimm die andere.',
        '`cat leistungsschein.txt`, `cat router_status.txt`, `cat messung_kabel.csv`.',
        'Festhalten — `>` legt neu an, `>>` hängt an: `echo "gebucht: 200" > /home/timo/befund_bandbreite.md`, dann `echo "profil: Business 50" >> /home/timo/befund_bandbreite.md` und `echo "gemessen: 47" >> /home/timo/befund_bandbreite.md`',
      ],
    },
    realWorldReference: 'Falsche Provisioning-Profile nach Wartungen sind ein häufiger Provider-Fehler. Kunden zahlen für 200 Mbit, bekommen 50 — oft monatelang unbemerkt, wenn kein eigenes Monitoring läuft.',
    bsiReference: 'BSI IT-Grundschutz: NET.1.2 Netzmanagement',
    involvedNpcs: ['TELEKOM-THOMAS'],
    tags: ['bandwidth', 'monitoring', 'provisioning', 'troubleshooting'],
  },
  {
    /**
     * Einstiegsfall 3 von 3 (Schwierigkeit 1) — die richtige Unterlage finden.
     *
     * Zwei Standorte, zwei Vertragsfassungen. Der Fall prüft Lesen, nicht
     * Suchen: Im Ticket steht der Standort, auf dem alten Blatt steht groß
     * „ERSETZT". Beides steht da, beides wird gern überlesen.
     *
     * Der Abschluss behauptet ausdrücklich KEIN eröffnetes Provider-Ticket —
     * der Spieler hat eine Unterlage geöffnet, nicht bei der Telekom angerufen.
     */
    id: 'TELEKOM-SC-007',
    title: 'Welche Leitung gehört zu unserem Standort?',
    category: 'troubleshooting',
    difficulty: 1,
    flavorText: 'Am Betriebshof ist das Netz weg. Du greifst zum Hörer, um die Störung zu melden — und legst wieder auf. Die Hotline will als Erstes die Leitungskennung wissen, und du hast keine. Jens ruft aus dem Nachbarzimmer: "Liegt alles im Vertragsordner auf dem Fileserver. Aber pass auf, da ist auch noch der alte Kram drin."',
    urgency: 'high',
    choices: [
      {
        id: 'A',
        text: 'Im Vertragsordner nachsehen',
        outcome: 'PERFECT',
        consequence: 'Du schreibst dir beides auf einen Zettel und legst ihn neben das Telefon. Angerufen hast du noch nicht — das ist der nächste Griff, und diesmal weißt du, was du sagst.',
        scoreChange: 130,
        reputationChange: 10,
        lesson: 'Störungsmeldungen scheitern selten an der Technik und oft an fehlenden Vertragsdaten. Leitungskennung, Standort und die vereinbarte Reaktionszeit gehören griffbereit — im Störungsfall ist keine Zeit für Ablage-Archäologie.',
        guiCommand: true,
      },
      {
        id: 'B',
        text: 'Bei der Hotline anrufen und die Adresse durchgeben',
        outcome: 'PARTIAL_SUCCESS',
        consequence: 'Über die Adresse findet die Hotline schließlich zwei Anschlüsse auf euren Namen und fragt, welcher gemeint ist. Nach zwanzig Minuten Warteschleife und Rückfragen ist die Störung aufgenommen. Thomas am Ende: "Beim nächsten Mal einfach die Kennung, dann geht das in zwei Minuten."',
        scoreChange: 40,
        reputationChange: 0,
        lesson: 'Ohne Kennung geht es auch — es dauert nur ein Vielfaches und bindet beide Seiten. Bei mehreren Standorten auf einem Kundenkonto ist die Adresse kein eindeutiges Merkmal.',
      },
      {
        id: 'C',
        text: 'Jens bitten, die Kennung rauszusuchen',
        outcome: 'SUCCESS',
        consequence: 'Jens hat sie in einer Minute. "Steht im Vertragsordner, zweiter Unterordner." Du meldest die Störung. Beim nächsten Ausfall ist Jens im Urlaub.',
        scoreChange: 60,
        reputationChange: 5,
        lesson: 'Wissen, das nur in einem Kopf liegt, ist im Notfall nicht verfügbar. Genau deshalb gehören solche Angaben an einen Ort, den alle kennen — und den man im Ernstfall auch findet.',
      },
    ],
    guiContext: {
      app: 'explorer',
      title: 'Vertragsordner',
      hostname: 'FILE01',
      briefing:
        'Im Vertragsordner liegen die Anschlussunterlagen. Öffne das Blatt, das zum betroffenen Standort gehört und aktuell gültig ist — dort stehen Leitungskennung und Supportweg.',
      state: {
        explorer: {
          mode: 'files',
          shareName: 'Vertragsordner',
          sharePath: '\\\\FILE01\\Vertragsordner',
          items: [
            { id: 'ordner_betriebshof', name: '01_Standort_Betriebshof', kind: 'folder', modified: '14.01.2026' },
            { id: 'ordner_kompostwerk', name: '02_Standort_Kompostwerk', kind: 'folder', modified: '22.11.2025' },
            {
              id: 'anschluss_betriebshof_alt',
              name: 'Anschluss_Betriebshof_2021.pdf',
              kind: 'file',
              parent: 'ordner_betriebshof',
              modified: '03.09.2021',
              preview:
                'ANSCHLUSSÜBERSICHT — Betriebshof Ostring 12\n\n*** ERSETZT DURCH FASSUNG VOM 14.01.2026 — NICHT MEHR GÜLTIG ***\n\nProdukt: Company Connect 100\nLeitungskennung: DTAG-41-882-0031\nStörungsannahme: 0800 33 01000\nEntstörfrist: 24 Stunden (Mo–Fr)',
            },
            {
              id: 'anschluss_betriebshof',
              name: 'Anschluss_Betriebshof_2026.pdf',
              kind: 'file',
              parent: 'ordner_betriebshof',
              modified: '14.01.2026',
              preview:
                'ANSCHLUSSÜBERSICHT — Betriebshof Ostring 12\nGültig ab 14.01.2026\n\nProdukt: Company Connect 500\nLeitungskennung: DTAG-41-882-7194\nStörungsannahme Geschäftskunden: 0800 33 06000\nEntstörfrist: 8 Stunden (7x24, KRITIS-Kennzeichnung hinterlegt)\nAnsprechpartner: T. Kellermann, Technischer Service',
            },
            {
              id: 'anschluss_kompostwerk',
              name: 'Anschluss_Kompostwerk_2026.pdf',
              kind: 'file',
              parent: 'ordner_kompostwerk',
              modified: '22.11.2025',
              preview:
                'ANSCHLUSSÜBERSICHT — Kompostwerk Sandkaul\nGültig ab 01.12.2025\n\nProdukt: Company Connect 200\nLeitungskennung: DTAG-41-882-7208\nStörungsannahme Geschäftskunden: 0800 33 06000\nEntstörfrist: 24 Stunden (Mo–Sa)',
            },
            {
              id: 'rahmenvertrag',
              name: 'Rahmenvertrag_2025.pdf',
              kind: 'file',
              modified: '02.01.2025',
              preview:
                'RAHMENVERTRAG Geschäftskunden\nRegelt Laufzeiten, Kündigungsfristen und Preisanpassungen für alle Standorte.\nKeine standortbezogenen Leitungsdaten.',
            },
          ],
        },
      },
      solutions: [
        {
          interactions: ['open:anschluss_betriebshof'],
          allRequired: true,
          // Die Vorschau verschwindet mit dem Level. Was der Spieler zum
          // Telefonieren braucht, muss deshalb VOLLSTAENDIG hier stehen —
          // sonst behauptet das Ergebnis, er habe Kennung und Supportweg vor
          // sich, und zeigt ihm beides nicht.
          resultText:
            'Das ist das richtige Blatt: Betriebshof Ostring 12, gültig ab 14.01.2026.\n\n  Leitungskennung:   DTAG-41-882-7194\n  Störungsannahme:   0800 33 06000 (Geschäftskunden)\n  Entstörfrist:      8 Stunden, 7x24, KRITIS-Kennzeichnung hinterlegt\n  Ansprechpartner:   T. Kellermann, Technischer Service\n\nDie Fassung von 2021 im selben Ordner nennt eine andere Kennung (…-0031), eine andere Nummer und 24 Stunden nur Mo–Fr. Wer sie erwischt, meldet unter falscher Nummer und argumentiert am Ende mit einer Frist, die längst nicht mehr gilt.',
          skillGain: { troubleshooting: 4, softSkills: 4 },
        },
      ],
      hints: [
        'Der Ausfall betrifft einen bestimmten Standort. Welchen, steht am Anfang der Meldung.',
        'Im Ordner des Standorts liegen zwei Fassungen. Eine davon trägt oben einen deutlichen Vermerk.',
        'Öffne „Anschluss_Betriebshof_2026.pdf" im Ordner 01_Standort_Betriebshof — das ist die gültige Fassung.',
      ],
    },
    realWorldReference: 'Geschäftskundenanschlüsse werden über eine Leitungs- oder Vertragskennung identifiziert, nicht über die Adresse. Bei mehreren Standorten auf einem Kundenkonto führt die Adresse regelmäßig zur falschen Leitung.',
    bsiReference: 'BSI IT-Grundschutz: DER.4 Notfallmanagement, OPS.2.1 Outsourcing',
    involvedNpcs: ['TELEKOM-THOMAS'],
    /**
     * Einsteiger und Standard, NICHT KRITIS: Die richtige Vertragsfassung zu finden
     * gehört an den Anfang einer Laufbahn, nicht in Woche 1 eines
     * 24-wöchigen KRITIS-Laufs. Siehe Scenario.requiredModes.
     */
    requiredModes: ['beginner', 'intermediate'],
    tags: ['einstieg', 'gui', 'explorer', 'dokumentation', 'stoerung'],
  },
];
