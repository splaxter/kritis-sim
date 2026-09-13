// Cloud365 GmbH - Microsoft Partner - Scenarios
import { Scenario } from '@kritis/shared';

/* ── Exporte für CLOUD365-SC-002 (Migrationstag) ────────────────────────────
 *
 * Die Lektion ist, dass zwei Dinge gleichzeitig wahr sein können: Der
 * Postfachtransfer IST abgeschlossen, und die Clients kommen trotzdem nicht
 * ran. Wer nur die Statusliste liest, meldet Erfolg; wer nur die Beschwerden
 * hört, meldet eine gescheiterte Migration. Beides ist falsch.
 */

const migrationStatus = `postfach;groesse_gb;status;abgeschlossen
k.berger;4.2;Completed;15.06.2026 06:12
m.dahlke;7.8;Completed;15.06.2026 06:41
s.eren;2.1;Completed;15.06.2026 06:55
t.fuhrmann;11.4;Completed;15.06.2026 07:33
a.gerste;3.7;Completed;15.06.2026 07:48
p.hoffmann;9.2;Completed;15.06.2026 08:20
j.kessler;5.5;Completed;15.06.2026 08:39
b.olsen;6.1;Completed;15.06.2026 08:58
h.bartels;8.3;Completed;15.06.2026 09:24
c.wendt;3.0;Completed;15.06.2026 09:37

10 von 10 Postfächern übertragen, 0 Fehler, 0 übersprungene Elemente.
`;

const clientTest = `Abnahmetest Pilotgruppe — 15.06.2026, 10:00 Uhr
Durchgeführt von: K. Ahrens (Cloud365)

Fall 1  Anmeldung am Webzugang (OWA)          bestanden  (10 von 10)
Fall 2  Mail senden und empfangen über OWA   bestanden  (10 von 10)
Fall 3  Kalender im Webzugang                  bestanden  (10 von 10)
Fall 4  Outlook-Profil neu einrichten          FEHLER     (0 von 10)
Fall 5  Bestehendes Outlook-Profil verbinden   FEHLER     (0 von 10)
Fall 6  Freigegebenes Postfach in Outlook      nicht geprüft (hängt an Fall 4)

Meldung aus Fall 4: "Die Verbindung zu Microsoft Exchange ist nicht verfügbar.
Outlook muss im Onlinemodus oder verbunden sein."
`;

const autodiscoverCheck = `Namensauflösung autodiscover.warm-entsorgung.de
Geprüft am 15.06.2026, 10:20

  autodiscover.warm-entsorgung.de  CNAME  exch01.warm-entsorgung.local

Erwartet bei Exchange Online:
  autodiscover.warm-entsorgung.de  CNAME  autodiscover.outlook.com

Der Eintrag zeigt weiterhin auf den lokalen Server. Outlook fragt beim Einrichten
zuerst hier nach und bekommt die alte Adresse. Der Webzugang ist davon nicht
betroffen, weil er ohne diesen Eintrag auskommt.
`;

/* ── Exporte für CLOUD365-SC-006 (Copilot) ──────────────────────────────────
 *
 * Der Befund ist die vorhandene Berechtigung, NICHT eine erfundene Umgehung
 * der Zugriffskontrolle. Copilot zeigt, was jemand ohnehin sehen darf — das
 * ist genau das Unangenehme daran.
 */

const berechtigungen = `standort;bibliothek;berechtigt;recht
Personal;Gehaltsabrechnungen;HR-Team;Bearbeiten
Personal;Gehaltsabrechnungen;Alle Mitarbeitenden;Lesen
Personal;Bewerbungen;HR-Team;Bearbeiten
Personal;Bewerbungen;Geschäftsführung;Lesen
Betrieb;Tourenpläne;Disposition;Bearbeiten
Betrieb;Tourenpläne;Alle Mitarbeitenden;Lesen
Projekte;Archiv2019;Alle Mitarbeitenden;Lesen
Projekte;Laufend;Projektleitung;Bearbeiten
`;

const gruppen = `gruppe;mitglieder;enthält
Alle Mitarbeitenden;151;Stammbelegschaft, Auszubildende, Aushilfen, 4 externe Dienstleister
HR-Team;3;S. Krauss, N. Ilic, P. Hoffmann
Disposition;11;Schichtleitung und Planung
Projektleitung;5;
Geschäftsführung;2;
`;

const copilotHinweis = `Funktionsweise Microsoft 365 Copilot — Kurzfassung für die Akte

Copilot beantwortet Fragen ausschließlich aus Inhalten, auf die das
FRAGENDE Konto bereits Zugriff hat. Es hebt keine Berechtigungen auf und
umgeht keine Zugriffskontrolle.

Der Unterschied zu vorher ist nicht der Zugriff, sondern die Auffindbarkeit:
Was bisher in einem Ordner lag, den niemand geöffnet hat, wird jetzt auf
eine Frage hin aktiv vorgeschlagen.

Folge: Eine zu weite Berechtigung, die jahrelang folgenlos blieb, wird mit
Copilot am ersten Tag sichtbar.
`;

export const cloud365Scenarios: Scenario[] = [
  {
    id: 'CLOUD365-SC-001',
    title: 'Die Lizenz die plötzlich teurer wurde',
    category: 'vendor_management',
    difficulty: 2,
    flavorText: 'Monatliche Azure-Rechnung kommt: €4.200 statt der üblichen €2.800. Du rufst Martin an. "Ah ja, Microsoft hat die Preise für die D-Series VMs angepasst. Stand doch in der E-Mail letzte Woche?" Du hast keine E-Mail bekommen.',
    urgency: 'medium',
    choices: [
      {
        id: 'A',
        text: 'Die Rechnung akzeptieren — Microsoft-Preise kann man nicht verhandeln',
        outcome: 'FAIL',
        consequence: 'Die neuen Preise bleiben. €1.400/Monat mehr, €16.800/Jahr. Der Kämmerer fragt: "Warum wussten wir das nicht vorher?" Gute Frage — Cloud365 hätte warnen müssen.',
        scoreChange: -100,
        reputationChange: -10,
        lesson: 'Cloud-Kosten sind nicht fix. Microsoft ändert Preise regelmäßig. Eigenes Monitoring mit Azure Cost Management und Alerts bei Kostensprüngen sind Pflicht.',
      },
      {
        id: 'B',
        text: 'Azure Cost Management selbst einrichten und Budget-Alerts setzen',
        outcome: 'PERFECT',
        consequence: 'Du richtest Azure Cost Management mit Alerts bei 80%, 100% und 120% des Monatsbudgets ein. Du analysierst: Die D-Series VMs sind überdimensioniert. Du skalierst auf B-Series herunter: €1.600/Monat. Günstiger als vorher. Martin ist überrascht: "Oh, das hätte ich auch vorschlagen können."',
        scoreChange: 200,
        reputationChange: 20,
        lesson: 'Azure Cost Management ist kostenlos und mächtig. Eigenes Kosten-Monitoring macht dich unabhängig vom Partner. Regelmäßige Right-Sizing-Reviews sparen oft 30-50% der Cloud-Kosten.',
      },
      {
        id: 'C',
        text: 'Kevin beauftragen, die Kosten zu optimieren',
        outcome: 'PARTIAL_SUCCESS',
        consequence: 'Kevin schaut drauf: "Ich kann Reserved Instances vorschlagen — 40% Rabatt bei 1-Jahr-Commitment." Gut, aber: Jetzt bist du 1 Jahr an diese VM-Größe gebunden. Flexibilität weg. Und Kevin hat 2 Stunden Beratung berechnet.',
        scoreChange: 50,
        reputationChange: 5,
        lesson: 'Reserved Instances sparen Geld, aber binden Flexibilität. Der Partner verdient an Beratung — eigenes Wissen über Azure-Kostenoptimierung ist wertvoller.',
      },
    ],
    realWorldReference: 'Microsoft passt Azure-Preise regelmäßig an. April 2024 gab es z.B. 15% Erhöhung für bestimmte VM-Typen. Ohne eigenes Monitoring erfährt man das erst auf der Rechnung.',
    bsiReference: 'BSI IT-Grundschutz: OPS.2.2 Cloud-Nutzung',
    involvedNpcs: ['CLOUD365-MARTIN'],
    tags: ['azure', 'costs', 'monitoring', 'budgeting'],
  },
  {
    id: 'CLOUD365-SC-002',
    title: 'Der Exchange-zu-M365-Migrationstag',
    category: 'troubleshooting',
    difficulty: 4,
    flavorText: 'Heute ist der große Tag: Exchange On-Prem wird zu Exchange Online migriert. Kevin versichert: "Alles vorbereitet, läuft automatisch, Benutzer merken nichts." 10:00 Uhr: Erste Beschwerde — "Mein Outlook funktioniert nicht mehr." 10:05 Uhr: 47 weitere Beschwerden.',
    urgency: 'critical',
    choices: [
      {
        id: 'A',
        text: 'Kevin sofort anrufen: "Stopp die Migration!"',
        outcome: 'PARTIAL_SUCCESS',
        consequence: 'Kevin: "Stoppen geht nicht mehr, die Mailboxen sind halb migriert." Ihr arbeitet gemeinsam die nächsten 6 Stunden. Problem: Das Autodiscover war nicht richtig konfiguriert. Outlook findet die neuen Server nicht. Manuelle Profil-Neukonfiguration für 150 User. Migration abgeschlossen um 22 Uhr.',
        scoreChange: 25,
        reputationChange: 5,
        lesson: 'Migrationen haben einen "Point of no Return". Vorher testen, testen, testen. Autodiscover-Konfiguration ist der häufigste Exchange-Migrationsfehler.',
      },
      {
        id: 'B',
        text: 'Die Pilot-Protokolle selbst auswerten, bevor irgendwer zurückrollt',
        outcome: 'PERFECT',
        // Der Ergebnistext bleibt bei dem, was der Spieler belegt hat: eine
        // Diagnose. Den DNS-Eintrag aendert Kevin, und das steht auch so da.
        consequence: 'Du legst Kevin zwei Zeilen hin: Transfer vollständig, Clients hängen am Autodiscover-Eintrag, der noch auf den lokalen Server zeigt. Kevin: "...das hab ich nie angefasst." Er ändert den Eintrag, ihr wartet die Verteilung ab, um 15:20 richten sich die ersten Profile wieder ein. Zurückgerollt wurde nichts — es gab nichts zurückzurollen.',
        scoreChange: 200,
        reputationChange: 20,
        lesson: 'Zwei Dinge können gleichzeitig wahr sein: Die Migration ist abgeschlossen UND die Leute können nicht arbeiten. Wer nur die Statusliste liest, meldet Erfolg; wer nur die Beschwerden zählt, rollt eine funktionierende Migration zurück. Erst beides zusammen ergibt eine Diagnose.',
        terminalCommand: true,
      },
      {
        id: 'C',
        text: 'Alle Mitarbeiter anweisen, Outlook zu schließen und Webmail zu nutzen',
        outcome: 'SUCCESS',
        consequence: 'Outlook Web Access funktioniert. Alle arbeiten im Browser während Kevin das Autodiscover fixt. Nicht ideal, aber arbeitsfähig. Um 16 Uhr funktioniert auch Outlook wieder. Der Tag ist gerettet — halbwegs.',
        scoreChange: 100,
        reputationChange: 10,
        lesson: 'Webmail ist ein valider Fallback während Client-Problemen. User können arbeiten während das Problem gefixt wird. Kommunikation und Workaround-Anweisungen sind bei Migrationen essenziell.',
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'warm-adm-01',
      username: 'timo',
      currentPath: '/srv/export',
      taskText:
        'Ergebnis nach /home/timo/befund.md:\ntransfer: abgeschlossen | unvollständig\nclients: ok | fehlgeschlagen\nursache: <woran es liegt, sonst: unbekannt>',
      vfsOverlay: {
        directories: ['/srv/export'],
        files: [
          { path: '/srv/export/migration_status.csv', content: migrationStatus },
          { path: '/srv/export/abnahmetest.txt', content: clientTest },
          { path: '/srv/export/dns_autodiscover.txt', content: autodiscoverCheck },
        ],
      },
      commands: [],
      commandSkillGain: { cat: { linux: 1 }, grep: { linux: 2 }, awk: { linux: 2 } },
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            // Beide Seiten müssen wirklich gelesen sein — die Statusliste
            // allein sagt Erfolg, der Abnahmetest allein sagt Katastrophe.
            { fileRead: '/srv/export/migration_status.csv' },
            { fileRead: '/srv/export/abnahmetest.txt' },
            { fileRead: '/srv/export/dns_autodiscover.txt' },
            // Feldweise statt per Regex über die Datei: jeder Schlüssel genau
            // einmal, geprüft wird der WERT. Das schliesst drei Lücken auf
            // einmal — ein Bericht mit „clients: fehlgeschlagen" UND darunter
            // „clients: ok" fällt durch, die Ursache darf beschrieben statt
            // buchstabiert werden, und ein Fliesstext mit den richtigen
            // Woertern reicht nicht mehr.
            {
              file: '/home/timo/befund.md',
              reportFields: [
                { key: 'transfer', matches: '^abgeschlossen$' },
                { key: 'clients', matches: '^fehlgeschlagen$' },
                // Irgendwo im Wert genuegt: „autodiscover" allein ebenso wie
                // „DNS-Eintrag autodiscover.… zeigt auf exch01.…".
                { key: 'ursache', matches: '[Aa]utodiscover' },
              ],
            },
          ],
          resultText:
            'Beides stimmt gleichzeitig: 10 von 10 Postfächern sind übertragen, 0 Fehler — und kein einziges Outlook-Profil lässt sich einrichten. Der Webzugang läuft in allen drei Testfällen.\n\nDas ist genau das Muster, das auf den Autodiscover-Eintrag zeigt: Outlook fragt beim Einrichten dort nach, der Webzugang kommt ohne ihn aus. Und der Eintrag zeigt weiterhin auf exch01.warm-entsorgung.local.\n\nEin Rückbau hätte hier eine funktionierende Migration zerstört, um einen DNS-Eintrag nicht ändern zu müssen.',
          skillGain: { netzwerk: 4, troubleshooting: 6, softSkills: 2 },
          effects: {},
        },
      ],
      hints: [
        'Drei Protokolle liegen da. Zwei davon widersprechen sich scheinbar — such das dritte, das erklärt, warum beide recht haben.',
        'Der Webzugang funktioniert, Outlook nicht. Was braucht Outlook beim Einrichten, das der Webzugang nicht braucht?',
        'Lies beide Seiten, bevor du urteilst: `cat migration_status.csv` und `cat abnahmetest.txt`.',
        '`cat dns_autodiscover.txt` — vergleiche den vorhandenen Eintrag mit dem erwarteten.',
        'Befund festhalten — `>` legt neu an, `>>` hängt an: `echo "transfer: abgeschlossen" > /home/timo/befund.md`, dann `echo "clients: fehlgeschlagen" >> /home/timo/befund.md` und `echo "ursache: autodiscover" >> /home/timo/befund.md`',
      ],
    },
    realWorldReference: 'Exchange-zu-M365-Migrationen scheitern häufig an Autodiscover-Konfiguration. Microsoft empfiehlt Hybrid-Deployment mit Extended-Koexistenz, aber das ist aufwändig.',
    bsiReference: 'BSI IT-Grundschutz: OPS.1.1.3 Patch- und Änderungsmanagement',
    involvedNpcs: ['CLOUD365-KEVIN'],
    tags: ['exchange', 'migration', 'm365', 'email'],
  },
  {
    id: 'CLOUD365-SC-003',
    title: 'Microsoft Authenticator: "Wir ändern die Defaults"',
    category: 'security_incident',
    difficulty: 3,
    flavorText: 'Montagmorgen: 40 Mitarbeiter können sich nicht einloggen. Fehlermeldung: "MFA erforderlich." Problem: Die hatten nie MFA eingerichtet. Kevin: "Oh, Microsoft hat \'Security Defaults\' automatisch aktiviert. Das ist eigentlich gut für die Sicherheit..."',
    urgency: 'critical',
    choices: [
      {
        id: 'A',
        text: 'Security Defaults deaktivieren um den Betrieb wiederherzustellen',
        outcome: 'PARTIAL_SUCCESS',
        consequence: 'Du deaktivierst Security Defaults im Azure AD. Alle können wieder arbeiten. Aber jetzt habt ihr KEIN MFA mehr. Kevin: "Wir sollten Conditional Access einrichten, das ist flexibler." Das hätte er vor der Microsoft-Änderung vorschlagen können.',
        scoreChange: 50,
        reputationChange: 0,
        lesson: 'Security Defaults sind Microsofts "Einsteiger-Sicherheit" — gut gemeint, aber unflexibel. Für KRITIS-Betreiber ist Conditional Access besser: Gleiche Sicherheit, mehr Kontrolle über Ausnahmen und Rollout.',
      },
      {
        id: 'B',
        text: 'Allen betroffenen Usern schnell MFA einrichten — heute noch',
        outcome: 'SUCCESS',
        consequence: 'Du und Kevin richtet für alle 40 User MFA ein — Microsoft Authenticator oder SMS. Dauert bis 14 Uhr, aber danach ist alles sicher UND funktional. Ein paar User sind genervt, aber das ist die Zukunft.',
        scoreChange: 150,
        reputationChange: 15,
        lesson: 'MFA-Rollout unter Druck ist chaotisch aber machbar. Besser: Geplanter MFA-Rollout mit Schulung und Vorlaufzeit. Aber lieber hektisch als gar nicht.',
      },
      {
        id: 'C',
        text: 'Microsoft-Änderungsankündigungen checken: Wusste Kevin davon?',
        outcome: 'PERFECT',
        consequence: 'Du checkst das Microsoft 365 Message Center: Die Änderung war 6 Wochen vorher angekündigt. Kevin: "Äh... ich check das nicht jeden Tag." Du richtest einen Flow ein der Message-Center-Posts automatisch als E-Mail an dich und Kevin schickt. Und ihr plant einen ordentlichen MFA-Rollout.',
        scoreChange: 200,
        reputationChange: 20,
        lesson: 'Das Microsoft 365 Message Center ist PFLICHTLEKTÜRE. Alle größeren Änderungen werden dort angekündigt. Automatische Alerts einrichten. Den Partner fragen: "Monitoren Sie das Message Center?" Wenn nein: Problem.',
        followupEvent: 'M365_MESSAGE_CENTER_SETUP',
      },
    ],
    realWorldReference: 'Microsoft aktiviert Security Defaults automatisch für Tenants ohne Conditional Access. Stand 2024 sind >50% aller M365-Tenants betroffen. Die Ankündigung kommt immer — aber wer liest schon das Message Center?',
    bsiReference: 'BSI IT-Grundschutz: ORP.4 Identitäts- und Berechtigungsmanagement',
    involvedNpcs: ['CLOUD365-KEVIN'],
    tags: ['mfa', 'security', 'azure-ad', 'defaults'],
  },
  {
    id: 'CLOUD365-SC-004',
    title: 'Der OneDrive-Sync der alles löscht',
    category: 'troubleshooting',
    difficulty: 3,
    flavorText: 'Ein Kollege meldet panisch: "Meine Dokumente sind weg! Alles!" Du checkst: Sein OneDrive-Ordner ist leer. Sein Desktop auch. Der OneDrive-Sync-Client zeigt: "Sync abgeschlossen. 0 Dateien." 4.000 Dateien sind verschwunden.',
    urgency: 'critical',
    choices: [
      {
        id: 'A',
        text: 'OneDrive-Papierkorb und Versionsverlauf prüfen',
        outcome: 'PERFECT',
        consequence: 'Du öffnest OneDrive im Browser, gehst auf "Papierkorb": Alle 4.000 Dateien sind da. Der User hat versehentlich den Sync-Ordner gelöscht, und OneDrive hat das synchronisiert. Du stellst alles wieder her. Dauert 20 Minuten. Kevin hätte das auch gewusst — aber der ist im Meeting.',
        scoreChange: 200,
        reputationChange: 20,
        lesson: 'OneDrive hat einen eigenen Papierkorb (93 Tage Aufbewahrung) und Versionsverlauf. Die meisten "gelöscht"-Paniken sind in 10 Minuten gelöst. Den Papierkorb im Browser zu kennen ist essenziell.',
      },
      {
        id: 'B',
        text: 'Kevin anrufen: "Kannst du das aus dem Backup wiederherstellen?"',
        outcome: 'PARTIAL_SUCCESS',
        consequence: 'Kevin: "OneDrive HAT kein klassisches Backup... aber die Dateien sind wahrscheinlich im Papierkorb." Du findest sie dort. Aber: Du hast 2 Stunden gewartet während Kevin im Meeting war. Der User war panisch.',
        scoreChange: 50,
        reputationChange: 5,
        lesson: 'Sich auf den Partner verlassen kostet Zeit. Basis-OneDrive-Administration (Papierkorb, Sharing, Speicher) sollte intern bekannt sein. Der Partner ist für komplexe Probleme da, nicht für Papierkorb-Fragen.',
      },
      {
        id: 'C',
        text: 'Lokales Backup prüfen — haben wir eins?',
        outcome: 'FAIL',
        consequence: 'Du prüfst: Kein lokales Backup von OneDrive-Daten. Kevin hat damals gesagt: "Die Cloud ist das Backup!" Microsoft garantiert aber nur Verfügbarkeit, nicht Wiederherstellung bei Nutzerfehler. Glück gehabt, dass die Dateien im Papierkorb waren — das ist nicht garantiert.',
        scoreChange: -75,
        reputationChange: -5,
        lesson: 'Microsofts SLA garantiert Plattform-Verfügbarkeit, nicht Daten-Wiederherstellung bei Nutzerfehlern oder Ransomware. Ein Third-Party-Backup für M365 (Veeam, Acronis, etc.) ist bei KRITIS Pflicht.',
      },
    ],
    realWorldReference: 'Die Shared-Responsibility-Model-Lücke: Microsoft betreibt die Plattform, aber DU bist für deine Daten verantwortlich. Ransomware synchronisiert auch — und verschlüsselt den Papierkorb gleich mit.',
    bsiReference: 'BSI IT-Grundschutz: CON.3 Datensicherungskonzept, OPS.2.2 Cloud-Nutzung',
    involvedNpcs: ['CLOUD365-KEVIN'],
    tags: ['onedrive', 'backup', 'recovery', 'cloud'],
  },
  {
    id: 'CLOUD365-SC-005',
    title: 'Teams-Telefonie: "Das ist alles Cloud-native"',
    category: 'vendor_management',
    difficulty: 4,
    flavorText: 'Kevin präsentiert: "Teams-Telefonie ersetzt eure TK-Anlage! Alles in der Cloud, keine Hardware mehr, super Qualität!" Der GF ist begeistert. Du fragst: "Was passiert wenn das Internet ausfällt?" Kevin: "...äh..."',
    urgency: 'low',
    choices: [
      {
        id: 'A',
        text: 'Die kritischen Fragen stellen: Redundanz, Notruf, Fax, Türsprechanlage?',
        outcome: 'PERFECT',
        consequence: 'Du fragst systematisch ab: "Notruf-Standortübermittlung? Fax-Unterstützung? Analog-Schnittstellen für Türklingel und Aufzug? Fallback bei Internet-Ausfall?" Kevin kann 3 von 5 Fragen nicht beantworten. Der GF sagt: "Dann evaluieren wir das nochmal gründlicher."',
        scoreChange: 200,
        reputationChange: 25,
        lesson: 'Cloud-Telefonie hat Einschränkungen: Notruf braucht spezielle Konfiguration, Analoggeräte brauchen Adapter, bei Internet-Ausfall steht alles still. Für KRITIS ist ein LTE-Backup für Telefonie Pflicht.',
      },
      {
        id: 'B',
        text: 'Einen Pilottest vorschlagen: 10 User, 3 Monate',
        outcome: 'SUCCESS',
        consequence: 'Ihr startet einen Pilot. Nach 6 Wochen: Sprachqualität gut, aber das Fax für die Müllanmeldungen funktioniert nicht über Teams. Und beim Internet-Ausfall letzte Woche war auch Telefonie weg. Kevin: "Dafür gibt es Lösungen..." — die kosten extra.',
        scoreChange: 150,
        reputationChange: 15,
        lesson: 'Pilotprojekte decken Probleme auf bevor der ganze Betrieb umgestellt wird. 3 Monate sind realistisch um alle Edge Cases zu finden. Nie die ganze Telefonie auf einmal umstellen.',
      },
      {
        id: 'C',
        text: 'Kevin vertrauen und die Migration planen',
        outcome: 'FAIL',
        consequence: 'Migration auf Teams-Telefonie läuft. Woche 2: Die Leitstelle kann keine Bürger-Beschwerden mehr annehmen — Warteschleife funktioniert anders als bei der alten TK. Der Fax-zu-Mail-Gateway ist nicht DSGVO-konform. Das Aufzug-Notrufsystem geht nicht mehr. 3 Wochen Chaos.',
        scoreChange: -200,
        reputationChange: -25,
        lesson: 'Telefonie-Migration ist komplex und betrifft oft Systeme an die niemand denkt: Aufzugnotruf, Türsprechanlage, Alarm-Weiterleitung, Fax. Eine vollständige Anforderungsanalyse VORHER erspart Wochen Ärger.',
        triggersEvent: 'TELEPHONY_CHAOS',
      },
    ],
    realWorldReference: 'Teams-Telefonie ist ausgereift für Standard-Büro-Kommunikation. Aber Analog-Integration, Notruf, und Hochverfügbarkeit sind komplexe Themen die oft unterschätzt werden.',
    bsiReference: 'BSI IT-Grundschutz: NET.4.2 VoIP',
    involvedNpcs: ['CLOUD365-KEVIN', 'CLOUD365-MARTIN'],
    tags: ['teams', 'telephony', 'migration', 'requirements'],
  },
  {
    id: 'CLOUD365-SC-006',
    title: 'Copilot für Microsoft 365 — der KI-Assistent',
    category: 'compliance',
    difficulty: 3,
    flavorText: 'Martin ruft begeistert an: "Copilot ist jetzt für alle verfügbar! KI in Word, Excel, Teams — revolutionär!" Der Preis: €30/User/Monat extra. Und: "Das sieht alle eure Daten um zu lernen." Du zuckst zusammen.',
    urgency: 'medium',
    choices: [
      {
        id: 'A',
        text: 'Die Berechtigungsexporte anfordern und selbst durchsehen',
        outcome: 'PERFECT',
        // Der Befund ist die BESTEHENDE Berechtigung. Der Ergebnistext darf
        // Copilot nicht zum Täter machen — das wäre bequem und falsch, und
        // es würde die eigentliche Lektion genau verfehlen.
        consequence: 'Du legst eine Zeile aus dem Export vor, und danach diskutiert niemand mehr über Künstliche Intelligenz. Der Rollout wird verschoben, bis das Berechtigungskonzept steht — nicht wegen Copilot, sondern wegen des Befunds, den es sichtbar gemacht hätte.',
        scoreChange: 250,
        reputationChange: 30,
        lesson: 'Copilot hebt keine Berechtigungen auf; es beantwortet Fragen aus dem, was das fragende Konto ohnehin sehen darf. Was sich ändert, ist die Auffindbarkeit. Eine zu weite Freigabe, die jahrelang folgenlos blieb, wird damit am ersten Tag zum Vorfall — das Problem ist die Freigabe, nicht das Werkzeug.',
        terminalCommand: true,
        followupEvent: 'DATA_CLASSIFICATION_PROJECT',
      },
      {
        id: 'B',
        text: 'Pilotgruppe mit IT-Team starten — wir verstehen erstmal die Technologie',
        outcome: 'SUCCESS',
        consequence: 'Du startest mit 5 IT-Usern. Nach 2 Wochen: "Copilot hat mir ein altes Protokoll aus 2019 gefunden in dem ich den Kämmerer kritisiert habe... das hatte ich total vergessen." Die Gefahr wird greifbar. Ihr überarbeitet das Berechtigungskonzept.',
        scoreChange: 150,
        reputationChange: 15,
        lesson: 'Pilotprojekte mit IT-Team zuerst — ihr versteht die Risiken bevor die Fachabteilung damit arbeitet. Und ihr entdeckt Datenleichen die durch KI plötzlich wieder auftauchen.',
      },
      {
        id: 'C',
        text: 'Für alle aktivieren — KI ist die Zukunft!',
        outcome: 'CRITICAL_FAIL',
        consequence: 'Woche 1: Ein Mitarbeiter fragt Copilot nach "Gehaltsstrukturen" und bekommt eine Zusammenfassung der Management-Gehälter. Woche 2: Der Betriebsrat fragt nach "Abmahnungen" und findet alle HR-Dokumente. Woche 3: Ein Journalist fragt einen Ex-Mitarbeiter was Copilot so alles findet. DSGVO-Verstoß, Presse, Krisenkommunikation.',
        scoreChange: -400,
        reputationChange: -40,
        lesson: 'KI-Rollout ohne Berechtigungskonzept ist ein Datenschutz-Desaster. Copilot zeigt nicht mehr als der User sehen dürfte — aber es ZEIGT es aktiv statt es in Ordnern zu verstecken. Überberechtigungen werden plötzlich sichtbar.',
        triggersEvent: 'DSGVO_INCIDENT',
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'warm-adm-01',
      username: 'timo',
      currentPath: '/srv/export',
      taskText:
        'Ergebnis nach /home/timo/dsfa_befund.md:\nbibliothek: <Standort/Bibliothek mit zu weiter Freigabe>\nbetroffene: <Zahl der Personen, die dadurch lesen können>',
      vfsOverlay: {
        directories: ['/srv/export'],
        files: [
          { path: '/srv/export/berechtigungen.csv', content: berechtigungen },
          { path: '/srv/export/gruppen.csv', content: gruppen },
          { path: '/srv/export/copilot_funktionsweise.txt', content: copilotHinweis },
        ],
      },
      commands: [],
      commandSkillGain: { cat: { linux: 1 }, grep: { linux: 2, security: 1 }, awk: { linux: 2 } },
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            { fileRead: '/srv/export/berechtigungen.csv' },
            // Ohne die Gruppenliste ist „Alle Mitarbeitenden" eine Floskel.
            // Erst die 151 machen daraus einen Befund.
            { fileRead: '/srv/export/gruppen.csv' },
            {
              file: '/home/timo/dsfa_befund.md',
              reportFields: [
                // Der Köder: eine zweite Bibliothek mit derselben weiten
                // Freigabe, bei der das aber richtig ist. Wer beide meldet,
                // hat nach dem Muster gesucht statt nach dem Inhalt — die
                // Sperre sitzt auf dem WERT, also darf „Archiv2019 ist nicht
                // betroffen" woanders im Bericht stehen.
                {
                  key: 'bibliothek',
                  matches: 'Gehaltsabrechnungen',
                  absentMatches: 'Archiv2019',
                },
                // Erst die Zahl macht aus „Alle Mitarbeitenden" einen Befund.
                { key: 'betroffene', matches: '^151\\b' },
              ],
            },
          ],
          resultText:
            'Personal / Gehaltsabrechnungen, Leserecht für „Alle Mitarbeitenden" — und diese Gruppe hat 151 Mitglieder, darunter Auszubildende, Aushilfen und vier externe Dienstleister.\n\nDieselbe weite Freigabe steht auf Projekte / Archiv2019, und dort ist sie richtig: abgeschlossene Projektunterlagen sollen im Haus lesbar sein. Der Unterschied liegt nicht im Berechtigungsmuster, sondern im Inhalt.\n\nUnd Copilot? Umgeht nichts. Es macht nur auffindbar, was seit Jahren offenstand.',
          skillGain: { security: 7, softSkills: 3 },
          effects: {},
        },
      ],
      hints: [
        'Zwei Bibliotheken sind für alle lesbar. Bei einer ist das gewollt — entscheide über den Inhalt, nicht über das Muster.',
        'Wie viele Menschen sind „Alle Mitarbeitenden" eigentlich? Die Antwort steht im zweiten Export und macht aus einer Zeile einen Befund.',
        '`grep "Alle Mitarbeitenden" berechtigungen.csv` und danach `cat gruppen.csv`.',
        'Befund festhalten — `>` legt neu an, `>>` hängt an: `echo "bibliothek: Personal/Gehaltsabrechnungen" > /home/timo/dsfa_befund.md`, dann `echo "betroffene: 151" >> /home/timo/dsfa_befund.md`',
      ],
    },
    realWorldReference: 'Microsoft Copilot-Rollouts haben 2024 mehrere Datenschutz-Vorfälle verursacht. Unternehmen entdeckten, dass ihre SharePoint-Berechtigungen seit Jahren falsch waren — Copilot machte es sichtbar.',
    bsiReference: 'BSI IT-Grundschutz: APP.6.1 Office-Produkte, CON.2 Datenschutz',
    involvedNpcs: ['CLOUD365-MARTIN', 'CLOUD365-KEVIN'],
    tags: ['copilot', 'ai', 'privacy', 'permissions'],
  },
  {
    /**
     * Einstiegsfall 2 von 3 (Schwierigkeit 1) — eine Rechteanforderung prüfen.
     *
     * Der Ergebnistext begründet die Ablehnung mit AUFTRAG und HERKUNFT, nicht
     * mit „unbekannt heißt Schadsoftware". Diese Pauschalregel wäre bequem und
     * falsch: in jeder Firma laufen legitime unsignierte Werkzeuge, und ein
     * Spieler, der sie lernt, klickt später entweder alles weg oder nichts.
     */
    id: 'CLOUD365-SC-007',
    title: 'Ein Update, das niemand bestellt hat',
    category: 'security_incident',
    difficulty: 1,
    flavorText: 'Ein Kollege aus der Buchhaltung ruft dich an den Platz. "Da will was installiert werden, und ich soll ein Passwort eingeben. Ist das von euch?" Auf dem Bildschirm steht die Benutzerkontensteuerung und fragt nach Administratorrechten. Im Wartungskalender steht für heute nichts. Kevin hat auch nichts angekündigt.',
    urgency: 'high',
    choices: [
      {
        id: 'A',
        text: 'Den Dialog lesen und selbst entscheiden',
        outcome: 'PERFECT',
        consequence: 'Du entscheidest am Bildschirm und erklärst dem Kollegen dabei, woran du es festmachst. Er hört zu — und ruft beim nächsten Mal wieder an, bevor er klickt. Das ist mehr wert als die eine Entscheidung.',
        scoreChange: 130,
        reputationChange: 10,
        lesson: 'Eine Rechteanforderung prüft man an drei Dingen: Gibt es einen Auftrag dafür? Woher kommt die Datei? Ist der Herausgeber verifiziert? Erst wenn alle drei zusammenpassen, ist „Ja" die harmlose Antwort.',
        guiCommand: true,
      },
      {
        id: 'B',
        text: 'Erst Kevin anrufen und fragen, ob das von Cloud365 kommt',
        outcome: 'SUCCESS',
        consequence: 'Kevin geht nach zwölf Minuten ran: "Nee, von uns ist da nichts." In der Zwischenzeit steht der Dialog offen und der Kollege wartet. Die Antwort war richtig — sie stand aber die ganze Zeit im Fenster.',
        scoreChange: 70,
        reputationChange: 5,
        lesson: 'Rückfragen sind nie falsch. Aber sie ersetzen nicht das Lesen: Herkunft und Herausgeber stehen im Dialog selbst, und die Antwort darauf kommt in zehn Sekunden statt in zwölf Minuten.',
      },
      {
        id: 'C',
        text: 'Dem Kollegen sagen, er soll einfach abbrechen und weiterarbeiten',
        outcome: 'PARTIAL_SUCCESS',
        consequence: 'Der Dialog verschwindet, der Kollege arbeitet weiter. Die Datei liegt aber weiter in seinem Download-Ordner, und die Mail, aus der sie kam, ist noch da — samt aller Kollegen im Verteiler.',
        scoreChange: 40,
        reputationChange: 0,
        lesson: 'Wegklicken beendet den Dialog, nicht den Vorfall. Wenn eine Mail so etwas verteilt hat, hat sie es selten nur an einen verteilt — die Meldung an die anderen gehört dazu.',
      },
    ],
    guiContext: {
      app: 'uac',
      title: 'Benutzerkontensteuerung',
      hostname: 'WS-BUCH-04',
      briefing:
        'Lies das Fenster, bevor du klickst: Was will da Administratorrechte, woher kommt es, und wer ist der Herausgeber? Deine Entscheidung ist „Ja" oder „Nein".',
      state: {
        uac: {
          program: 'Teams_Update_2026.exe',
          publisher: 'Kein verifizierter Herausgeber',
          verifiedPublisher: false,
          programPath: 'C:\\Users\\buchhaltung\\Downloads\\Teams_Update_2026.exe',
          fileOrigin: 'Heruntergeladen aus E-Mail-Anhang (Internet)',
          riskFeedback:
            'Achtung: Das ist die riskante Wahl. Microsoft-Programme aktualisieren sich nicht über eine Datei aus einem Mail-Anhang, und der Herausgeber ist nicht verifiziert. Mit „Ja" bekäme das Programm Administratorrechte auf diesem Rechner.',
        },
      },
      solutions: [
        {
          interactions: ['answer:uac:no'],
          allRequired: true,
          resultText:
            'Richtig abgelehnt — und zwar aus zwei nachprüfbaren Gründen: Für heute gibt es keinen Wartungsauftrag, und die Datei stammt aus einem Mail-Anhang. Echte Microsoft-Updates kommen über Windows Update oder die Verwaltung des Unternehmens, nie als Anhang. Der fehlende verifizierte Herausgeber passt ins Bild, ist aber allein noch kein Beweis: Auch legitime interne Werkzeuge sind oft unsigniert.',
          skillGain: { windows: 4, security: 6 },
        },
      ],
      hints: [
        'Die Frage ist nicht, ob das Programm gefährlich aussieht, sondern ob es überhaupt jemand bestellt hat.',
        'Schau auf „Dateiursprung" und auf den Herausgeber. Microsoft verteilt Updates nicht als Anhang in einer Mail.',
        'Es gibt keinen Auftrag und die Datei kommt aus einer Mail. Klicke „Nein".',
      ],
    },
    realWorldReference: 'Gefälschte Update-Aufforderungen für bekannte Programme sind eine der verbreitetsten Methoden, um an Administratorrechte zu kommen. Microsoft liefert Teams-Updates über den integrierten Updater oder die zentrale Verwaltung aus, nicht per E-Mail-Anhang.',
    bsiReference: 'BSI IT-Grundschutz: APP.1.1 Office-Produkte, ORP.3 Sensibilisierung und Schulung',
    involvedNpcs: ['CLOUD365-KEVIN'],
    /**
     * Einsteiger und Standard, NICHT KRITIS: Eine einzelne Rechteanforderung zu prüfen
     * gehört an den Anfang einer Laufbahn, nicht in Woche 1 eines
     * 24-wöchigen KRITIS-Laufs. Siehe Scenario.requiredModes.
     */
    requiredModes: ['beginner', 'intermediate'],
    tags: ['einstieg', 'gui', 'windows', 'uac', 'phishing'],
  },
];
