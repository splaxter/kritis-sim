/**
 * KRITIS Mode Special Events
 * NIS2 Audits and Chain Reaction Events
 * Only available in KRITIS game mode
 */

import { GameEvent } from '@kritis/shared';

export const kritisSpecialEvents: GameEvent[] = [
  // ============================================
  // NIS2 AUDIT EVENTS
  // ============================================

  {
    id: 'evt_nis2_audit_announcement',
    title: 'NIS2-Audit angekündigt',
    category: 'compliance',
    weekRange: [4, 6],
    probability: 0.9,
    requires: {
      flags: ['kritis_mode'],
    },
    description: `Eine E-Mail vom BSI landet in deinem Postfach:

"Sehr geehrte Damen und Herren,

im Rahmen der NIS2-Richtlinie kündigen wir hiermit eine Überprüfung Ihrer IT-Sicherheitsmaßnahmen an. Der Audit findet in 2 Wochen statt.

Bitte halten Sie folgende Dokumentation bereit:
- Risikomanagement-Dokumentation
- Incident-Response-Plan
- Backup- und Recovery-Prozesse
- Schulungsnachweise der Mitarbeiter

Mit freundlichen Grüßen,
Bundesamt für Sicherheit in der Informationstechnik"

Chef Bert steht plötzlich hinter dir. "Was ist ein NIS2?"`,
    involvedCharacters: ['chef'],
    tags: ['kritis', 'nis2', 'audit', 'compliance'],
    choices: [
      {
        id: 'explain_calmly',
        text: 'Ruhig erklären: "Eine EU-Richtlinie für IT-Sicherheit. Wir müssen uns vorbereiten."',
        effects: { relationships: { chef: 5 }, skills: { softSkills: 3 } },
        resultText: 'Chef Bert nickt langsam. "Okay... und sind wir vorbereitet?" Du schluckst.',
        setsFlags: ['nis2_audit_announced', 'chef_informed'],
      },
      {
        id: 'panic',
        text: '"Das ist... das ist nicht gut. Wir haben zwei Wochen."',
        effects: { stress: 15, relationships: { chef: -5 } },
        resultText: 'Chef Bert wird blass. "Zwei Wochen?! Für was?!" Die Panik breitet sich aus.',
        setsFlags: ['nis2_audit_announced', 'panic_mode'],
      },
      {
        id: 'already_prepared',
        text: '"Keine Sorge, ich habe schon angefangen, Dokumentation zu erstellen."',
        requires: { skill: 'security', threshold: 40 },
        effects: { relationships: { chef: 15 }, skills: { security: 3 } },
        resultText: 'Du zeigst ihm die Ordner, die du schon angelegt hast. "Proaktiv denken", sagst du. Chef Bert ist beeindruckt.',
        setsFlags: ['nis2_audit_announced', 'proactive_documentation'],
      },
    ],
  },

  {
    id: 'evt_nis2_documentation_crisis',
    title: 'Dokumentations-Chaos',
    category: 'compliance',
    weekRange: [5, 8],
    probability: 0.8,
    requires: {
      flags: ['nis2_audit_announced'],
    },
    description: `Du durchsuchst die Server nach Dokumentation. Was du findest, ist... erschreckend.

- Der "Incident-Response-Plan" ist ein Word-Dokument von 2019
- Das "Backup-Konzept" ist eine handschriftliche Notiz
- "Risikomanagement" existiert als leerer Ordner
- Schulungsnachweise? "Ich glaube, Stefan hatte da mal was..."

Bjorg schaut über deine Schulter. "Willkommen in der Realität kommunaler IT."`,
    involvedCharacters: ['kollege'],
    tags: ['kritis', 'nis2', 'documentation'],
    choices: [
      {
        id: 'start_from_scratch',
        text: 'Alles neu erstellen - richtig oder gar nicht',
        effects: { stress: 20, skills: { security: 5, troubleshooting: 3 } },
        resultText: 'Du arbeitest drei Nächte durch. Am Ende hast du 47 Seiten Dokumentation. Nicht perfekt, aber existent.',
        setsFlags: ['documentation_created', 'overworked'],
      },
      {
        id: 'update_existing',
        text: 'Das Bestehende aufhübschen und aktualisieren',
        effects: { stress: 10, compliance: -5 },
        resultText: 'Du änderst Daten, fügst Logos hinzu. Es sieht professioneller aus. Ob es dem Audit standhält?',
        setsFlags: ['documentation_patched'],
      },
      {
        id: 'ask_for_help',
        text: 'Bjorg und die Fachabteilungen um Hilfe bitten',
        effects: { relationships: { kollegen: 10, fachabteilung: 5 }, stress: 5 },
        resultText: 'Gemeinsam geht es schneller. Jede Abteilung liefert ihren Teil. Teamwork.',
        setsFlags: ['documentation_teamwork', 'team_prepared'],
      },
    ],
  },

  {
    id: 'evt_nis2_audit_day',
    title: 'Der Audit-Tag',
    category: 'compliance',
    weekRange: [6, 10],
    probability: 0.95,
    requires: {
      flags: ['nis2_audit_announced'],
    },
    description: `Zwei Personen in Anzügen betreten das Gebäude. Die BSI-Auditoren sind da.

"Guten Tag. Wir würden gerne mit Ihrer IT-Sicherheitsinfrastruktur beginnen."

Chef Bert schwitzt. Bjorg hat sich krank gemeldet. Und der Drucker macht wieder seltsame Geräusche.

Die nächsten 4 Stunden werden interessant.`,
    involvedCharacters: ['chef'],
    tags: ['kritis', 'nis2', 'audit', 'high_stakes'],
    choices: [
      {
        id: 'confident_tour',
        text: 'Selbstbewusst durch die Infrastruktur führen',
        requires: { skill: 'softSkills', threshold: 35 },
        effects: { compliance: 10, relationships: { chef: 10 }, skills: { softSkills: 5 } },
        resultText: 'Du erklärst jedes System, jede Maßnahme. Die Auditoren nicken. Am Ende: "Solide Basis. Einige Verbesserungsvorschläge."',
        setsFlags: ['audit_passed', 'audit_recommendations'],
      },
      {
        id: 'honest_assessment',
        text: 'Ehrlich sein: "Wir arbeiten dran. Hier ist unser Plan."',
        effects: { compliance: 5, skills: { softSkills: 3 } },
        resultText: 'Die Auditoren schätzen die Ehrlichkeit. "Wir sehen Fortschritt. Nachaudit in 6 Monaten."',
        setsFlags: ['audit_conditional', 'nachaudit_scheduled'],
      },
      {
        id: 'deflect_to_chef',
        text: 'Chef Bert die Führung überlassen',
        effects: { relationships: { chef: -15 }, compliance: -10, stress: 10 },
        resultText: '"Äh... der Server ist... das Ding da..." Chef Bert improvisiert. Schlecht. Sehr schlecht.',
        setsFlags: ['audit_failed', 'chef_embarrassed'],
      },
    ],
  },

  {
    id: 'evt_nis2_audit_result',
    title: 'Audit-Ergebnis',
    category: 'compliance',
    weekRange: [7, 24],
    probability: 1.0,
    requires: {
      events: ['evt_nis2_audit_day'],
    },
    description: `Der offizielle Bericht des BSI ist da. Du öffnest die PDF mit zitternden Händen.

Die Bewertung hängt von deinen vorherigen Entscheidungen ab...`,
    involvedCharacters: ['chef'],
    tags: ['kritis', 'nis2', 'result'],
    choices: [
      {
        id: 'good_result',
        text: '[Wenn Audit bestanden] "Wir haben bestanden!"',
        unlocks: ['audit_passed'],
        effects: { compliance: 15, relationships: { chef: 20 }, budget: 5000 },
        resultText: '"Konformität bestätigt. Empfehlungen im Anhang." Chef Bert umarmt dich fast. Der Kämmerer bewilligt Sicherheitsbudget.',
        setsFlags: ['nis2_compliant'],
        teachingMoment: 'NIS2-Konformität öffnet Türen - und Budgets.',
      },
      {
        id: 'mixed_result',
        text: '[Wenn Nachaudit] "Auflagen, aber machbar."',
        unlocks: ['audit_conditional'],
        effects: { compliance: 5, stress: 10 },
        resultText: '12 Punkte müssen verbessert werden. 6 Monate Zeit. Das wird eng, aber schaffbar.',
        setsFlags: ['nis2_conditional'],
      },
      {
        id: 'bad_result',
        text: '[Wenn durchgefallen] "Das... das ist nicht gut."',
        unlocks: ['audit_failed'],
        effects: { compliance: -20, relationships: { chef: -10 }, budget: -10000 },
        resultText: 'Bußgeld: 50.000€. Nachaudit in 3 Monaten. Chef Bert spricht nicht mehr mit dir.',
        setsFlags: ['nis2_failed', 'bussgeld_erhalten'],
      },
    ],
  },

  // ============================================
  // CHAIN REACTION EVENTS
  // ============================================

  {
    id: 'evt_chain_cooling_failure',
    title: 'Kühlsystem-Alarm',
    category: 'crisis',
    weekRange: [3, 20],
    probability: 0.7,
    requires: {
      flags: ['kritis_mode'],
    },
    description: `ALARM im Serverraum! Die Temperatur steigt.

Das Kühlsystem zeigt Fehler. Die Server laufen bei 45°C - Tendenz steigend. Bei 60°C schalten sie sich ab.

Du hast vielleicht 20 Minuten.`,
    involvedCharacters: [],
    tags: ['kritis', 'chain_reaction', 'crisis', 'time_critical'],
    choices: [
      {
        id: 'emergency_shutdown',
        text: 'Sofort alle nicht-kritischen Server herunterfahren',
        effects: { stress: 10, skills: { troubleshooting: 5 } },
        resultText: 'Die Last sinkt, die Temperatur stabilisiert sich. Einige Dienste sind offline, aber nichts ist kaputt.',
        setsFlags: ['cooling_mitigated'],
      },
      {
        id: 'fix_cooling',
        text: 'Versuchen, das Kühlsystem zu reparieren',
        requires: { skill: 'troubleshooting', threshold: 45 },
        effects: { skills: { troubleshooting: 8 } },
        resultText: 'Ein verstopfter Filter! Du wechselst ihn. Das Kühlsystem springt wieder an. Krise abgewendet.',
        setsFlags: ['cooling_fixed'],
      },
      {
        id: 'call_technician',
        text: 'Sofort den Klimatechniker anrufen',
        effects: { budget: -2000, stress: 15 },
        resultText: '"Ich bin in 45 Minuten da." Zu langsam. Zwei Server fallen aus, bevor er kommt.',
        setsFlags: ['cooling_failed', 'servers_damaged'],
        triggersEvent: 'evt_chain_server_damage',
      },
    ],
  },

  {
    id: 'evt_chain_server_damage',
    title: 'Kettenreaktion: Server-Ausfall',
    category: 'crisis',
    weekRange: [3, 24],
    probability: 1.0,
    requires: {
      flags: ['servers_damaged'],
    },
    description: `Die Folgen des Kühlungsausfalls: Zwei Server sind tot. Aber das ist nicht alles.

Server 1 war der Backup-Controller. Server 2 war der Monitoring-Server.

Du bist jetzt blind UND ohne Backup. Wenn jetzt noch etwas passiert...`,
    involvedCharacters: ['kollege'],
    tags: ['kritis', 'chain_reaction', 'crisis'],
    choices: [
      {
        id: 'prioritize_backup',
        text: 'Zuerst das Backup wiederherstellen - Daten sind wichtiger',
        effects: { stress: 15, skills: { linux: 5 } },
        resultText: 'Du konfigurierst einen alten Server als Backup-Ziel. Nicht ideal, aber funktioniert.',
        setsFlags: ['backup_restored_temporary'],
      },
      {
        id: 'prioritize_monitoring',
        text: 'Zuerst Monitoring - wir müssen sehen was passiert',
        effects: { stress: 10, skills: { netzwerk: 5 } },
        resultText: 'Nagios läuft auf deinem Laptop. Provisorisch, aber du siehst wieder was los ist.',
        setsFlags: ['monitoring_restored_temporary'],
      },
      {
        id: 'work_parallel',
        text: 'Bjorg und ich arbeiten parallel an beidem',
        effects: { relationships: { kollegen: 10 }, stress: 20 },
        resultText: 'Ihr arbeitet die Nacht durch. Am Morgen läuft beides wieder - provisorisch, aber stabil.',
        setsFlags: ['backup_restored_temporary', 'monitoring_restored_temporary', 'team_crisis_handled'],
      },
    ],
  },

  {
    id: 'evt_chain_power_fluctuation',
    title: 'Stromspannung schwankt',
    category: 'crisis',
    weekRange: [5, 22],
    probability: 0.6,
    requires: {
      flags: ['kritis_mode'],
    },
    description: `Die Lichter flackern. Die USV piept warnend.

"Spannungsschwankungen im Netz", meldet das Monitoring. Die USV puffert, aber ihre Kapazität ist begrenzt.

Wenn das nicht aufhört, habt ihr in 30 Minuten keinen Strom mehr für die Server.`,
    involvedCharacters: [],
    tags: ['kritis', 'chain_reaction', 'power', 'crisis'],
    choices: [
      {
        id: 'contact_provider',
        text: 'Sofort den Energieversorger anrufen',
        effects: { stress: 5 },
        resultText: '"Wir arbeiten dran. Bauarbeiten haben eine Leitung beschädigt." Hilft dir jetzt nicht.',
        setsFlags: ['power_issue_known'],
      },
      {
        id: 'load_shedding',
        text: 'Nicht-kritische Systeme abschalten um Strom zu sparen',
        effects: { skills: { troubleshooting: 3 } },
        resultText: 'Du fährst alles runter was nicht lebensnotwendig ist. Die USV hält jetzt länger.',
        setsFlags: ['power_load_reduced'],
      },
      {
        id: 'generator_check',
        text: 'Den Notstrom-Generator prüfen und vorbereiten',
        requires: { skill: 'troubleshooting', threshold: 35 },
        effects: { skills: { troubleshooting: 5 } },
        resultText: 'Der Generator steht im Keller und wurde seit Jahren nicht getestet. Du startest ihn - er läuft!',
        setsFlags: ['generator_ready'],
      },
    ],
  },

  {
    id: 'evt_chain_power_outage',
    title: 'Kettenreaktion: Stromausfall',
    category: 'crisis',
    weekRange: [5, 24],
    probability: 0.8,
    requires: {
      flags: ['power_issue_known'],
    },
    description: `Die Lichter gehen aus. Die USV schreit. Dann: Stille.

Totalausfall. Alles ist dunkel. Nur die Notbeleuchtung flackert.

Die Server sind offline. Die Telefone sind tot. Die Müllabfuhr steht still.

Das ist jetzt eine echte Krise.`,
    involvedCharacters: ['chef'],
    tags: ['kritis', 'chain_reaction', 'blackout', 'crisis'],
    choices: [
      {
        id: 'generator_start',
        text: '[Wenn vorbereitet] Generator starten!',
        unlocks: ['generator_ready'],
        effects: { relationships: { chef: 20 }, skills: { troubleshooting: 5 } },
        resultText: 'Du rennst in den Keller. Der Generator springt an. Nach 5 Minuten sind die kritischen Systeme wieder online.',
        setsFlags: ['blackout_mitigated'],
      },
      {
        id: 'manual_mode',
        text: 'Manuellen Notbetrieb einleiten',
        effects: { stress: 25, relationships: { fachabteilung: -10 } },
        resultText: 'Papier und Stift. Die Müllrouten werden per Hand koordiniert. Es funktioniert, aber es ist Chaos.',
        setsFlags: ['manual_operations'],
      },
      {
        id: 'wait_for_power',
        text: 'Abwarten bis der Strom wiederkommt',
        effects: { stress: 15, compliance: -10 },
        resultText: '4 Stunden später ist der Strom wieder da. 4 Stunden in denen nichts funktioniert hat.',
        setsFlags: ['blackout_waited', 'service_disruption'],
      },
    ],
  },

  {
    id: 'evt_chain_cascade_attack',
    title: 'Koordinierter Angriff',
    category: 'security',
    weekRange: [10, 22],
    probability: 0.5,
    requires: {
      flags: ['kritis_mode'],
    },
    description: `Zuerst die Firewall-Logs: Ungewöhnlicher Traffic.
Dann das Mail-System: Phishing-Welle.
Dann die VPN: Brute-Force-Angriffe.

Das passiert nicht zufällig. Jemand testet eure Verteidigung. Systematisch.

Und während du das analysierst, meldet das SIEM einen erfolgreichen Login - von einer IP in Osteuropa.`,
    involvedCharacters: ['kollege'],
    tags: ['kritis', 'chain_reaction', 'apt', 'security'],
    choices: [
      {
        id: 'isolate_immediately',
        text: 'Sofort isolieren - betroffene Systeme vom Netz',
        effects: { skills: { security: 8 }, relationships: { fachabteilung: -15 } },
        resultText: 'Du trennst Server vom Netz. Beschwerden hageln. Aber der Angriff ist gestoppt - vorerst.',
        setsFlags: ['attack_contained', 'services_disrupted'],
      },
      {
        id: 'observe_and_trace',
        text: 'Beobachten und zurückverfolgen - woher kommt das?',
        requires: { skill: 'security', threshold: 50 },
        effects: { skills: { security: 10, netzwerk: 5 } },
        resultText: 'Du verfolgst den Angreifer durch 4 Länder. Am Ende: Eine IP-Adresse. Und Screenshots von allem was er getan hat.',
        setsFlags: ['attacker_traced', 'evidence_collected'],
      },
      {
        id: 'call_bsi',
        text: 'Das BSI alarmieren - das ist zu groß für uns',
        effects: { compliance: 5, stress: 10 },
        resultText: '"Wir schicken ein Incident-Response-Team." 2 Stunden später sind Profis da. Du bist erleichtert.',
        setsFlags: ['bsi_involved', 'professional_response'],
        teachingMoment: 'Bei APT-Angriffen: Profis holen ist keine Schwäche.',
      },
    ],
  },

  {
    id: 'evt_chain_ransomware_spread',
    title: 'Ransomware breitet sich aus',
    category: 'crisis',
    weekRange: [8, 24],
    probability: 0.6,
    requires: {
      flags: ['kritis_mode'],
    },
    description: `Es begann mit einem Rechner in der Buchhaltung. Jetzt sind es 12.

Die Ransomware nutzt eine alte Windows-Schwachstelle. Du hast gewarnt, dass die Patches fehlen. Niemand hat gehört.

Alle 10 Minuten wird ein weiterer Rechner verschlüsselt. Du musst das stoppen.`,
    involvedCharacters: ['chef'],
    tags: ['kritis', 'chain_reaction', 'ransomware', 'crisis'],
    choices: [
      {
        id: 'network_segmentation',
        text: 'Netzwerk-Segmente isolieren - Ausbreitung stoppen',
        requires: { skill: 'netzwerk', threshold: 40 },
        effects: { skills: { netzwerk: 8, security: 5 } },
        resultText: 'Du trennst VLANs, blockierst Ports. Die Ausbreitung stoppt bei 15 Rechnern. Schlimm, aber nicht katastrophal.',
        setsFlags: ['ransomware_contained'],
      },
      {
        id: 'kill_switch',
        text: 'Nach einem Kill-Switch suchen',
        requires: { skill: 'security', threshold: 45 },
        effects: { skills: { security: 10 } },
        resultText: 'Du analysierst den Code. Da! Eine Domain-Abfrage. Du registrierst sie - und die Ransomware stoppt überall.',
        setsFlags: ['ransomware_killed', 'hero_moment'],
        teachingMoment: 'Manche Ransomware hat Kill-Switches. Immer prüfen!',
      },
      {
        id: 'pull_plug',
        text: 'Stecker ziehen - alles offline nehmen',
        effects: { stress: 20, relationships: { fachabteilung: -20 } },
        resultText: 'Totaler Stillstand. Aber auch die Ransomware ist gestoppt. Jetzt beginnt die Aufräumarbeit.',
        setsFlags: ['emergency_shutdown', 'business_stopped'],
      },
    ],
  },

  // ============================================
  // NIS2 NACHAUDIT ARC (second-half spine, weeks 13-23)
  // Pays off the flags from the first audit arc:
  // nis2_failed / nis2_conditional / nis2_compliant / nachaudit_scheduled.
  // ============================================

  {
    id: 'evt_bussgeld_ratenzahlung',
    title: 'Der Bußgeldbescheid ist rechtskräftig',
    category: 'budget',
    weekRange: [13, 15],
    probability: 0.95,
    requires: {
      flags: ['nis2_failed'],
    },
    description: `Der Bußgeldbescheid aus dem durchgefallenen Audit ist jetzt rechtskräftig. 50.000 Euro. {kaemmerer} sitzt dir gegenüber, den Bescheid in der Hand, und ist ungewohnt ruhig — die stille Variante seines Ärgers, die schlimmer ist als Schreien.

"Das Geld haben wir nicht einfach so", sagt er. "Also: Ratenzahlung, Widerspruch, oder wir nehmen es aus Ihrem IT-Budget. Was schlagen Sie vor?"

Jede Option hat einen Haken. Und {kaemmerer} wartet.`,
    involvedCharacters: ['kaemmerer'],
    tags: ['kritis', 'nis2', 'bussgeld', 'budget'],
    choices: [
      {
        id: 'bussgeld_ratenzahlung',
        text: 'Ratenzahlung vorschlagen und die Sache sachlich aufarbeiten',
        effects: { skills: { softSkills: 4 }, compliance: 5, relationships: { kaemmerer: 5 }, stress: 8, budget: -3000 },
        resultText:
          'Du handelst mit dem BSI eine Ratenzahlung über zwölf Monate aus — das Budget wird belastet, aber nicht erdrosselt. {kaemmerer} nickt anerkennend: "Wenigstens jemand, der einen Plan hat statt nur ein Problem." Und dann: "Sorgen Sie dafür, dass wir das nie wieder zahlen." Genau das ist jetzt dein Auftrag.',
        teachingMoment:
          'Ein Bußgeld ist eine Tatsache, kein Weltuntergang: Sachlich aufarbeiten, Zahlung strukturieren und die Ursache abstellen ist wirksamer als Schuldzuweisungen.',
        setsFlags: ['bussgeld_geregelt'],
      },
      {
        id: 'bussgeld_widerspruch',
        text: 'Widerspruch prüfen lassen — vielleicht war die Bewertung angreifbar',
        effects: { skills: { softSkills: 3 }, compliance: -3, relationships: { kaemmerer: 3 }, stress: 12 },
        resultText:
          'Ihr legt Widerspruch ein und beauftragt eine juristische Prüfung. Sie kostet Zeit und Nerven — und bringt am Ende nur eine kleine Reduktion, weil die Mängel nun mal real waren. {kaemmerer} ist zwiegespalten: "Gekämpft haben wir, gewonnen nicht wirklich." Manchmal ist der aussichtslose Widerspruch teurer als die Rate.',
        choiceTags: ['bureaucratic'],
      },
      {
        id: 'bussgeld_it_budget',
        text: 'Aus dem IT-Budget zahlen, um den Haushalt nicht zu belasten',
        effects: { compliance: -8, relationships: { kaemmerer: 8 }, stress: 6, budget: -8000 },
        resultText:
          '{kaemmerer} ist erleichtert, dass der Gesamthaushalt verschont bleibt — aber dein IT-Budget ist für dieses Jahr praktisch aufgebraucht. Genau das Geld, das du für die Nachaudit-Vorbereitung gebraucht hättest, ist jetzt weg. Du hast {kaemmerer} zufriedengestellt und dir selbst die Mittel gestrichen, mit denen du das nächste Bußgeld verhindern wolltest.',
        choiceTags: ['self_sacrificing'],
      },
    ],
  },

  {
    id: 'evt_nis2_nachaudit_ankuendigung',
    title: 'Die Folgeprüfung ist angekündigt',
    category: 'compliance',
    weekRange: [15, 16],
    probability: 0.9,
    requires: {
      flags: ['kritis_mode'],
    },
    description: `Eine E-Mail vom BSI, Betreff "Folgeprüfung gemäß NIS2". Der Inhalt richtet sich nach eurem ersten Ergebnis: War es bestanden, kommt eine Stichprobe; gab es Auflagen, ein reguläres Nachaudit; war es durchgefallen, eine verschärfte Prüfung mit engem Zeitrahmen.

Wie auch immer euer Frühjahr endete — jetzt kommen sie wieder. Der Termin liegt einige Wochen entfernt, genug Zeit, um sich vorzubereiten. Oder um in Panik zu verfallen.

{chef} liest über deine Schulter mit und wird blass. "Schon wieder die. Was machen wir?"`,
    involvedCharacters: ['chef'],
    tags: ['kritis', 'nis2', 'nachaudit', 'announcement'],
    choices: [
      {
        id: 'nachaudit_souveraen_planen',
        text: 'Souverän planen: Prüfumfang klären, Zeitplan aufsetzen, Zuständigkeiten verteilen',
        effects: { skills: { softSkills: 5, security: 3 }, compliance: 8, relationships: { chef: 8 }, stress: 6 },
        resultText:
          'Du behandelst die Ankündigung als Projekt, nicht als Bedrohung: Du klärst mit dem BSI den genauen Prüfumfang, baust einen Zeitplan mit Meilensteinen und verteilst Zuständigkeiten. {chef} beruhigt sich sichtlich: "Wenn du einen Plan hast, ist es nur noch Arbeit." Genau. Nur noch Arbeit.',
        teachingMoment:
          'Ein angekündigtes Audit ist planbar. Wer den Prüfumfang früh klärt und die Vorbereitung als Projekt aufsetzt, verwandelt Prüfungsangst in eine abarbeitbare Liste.',
        setsFlags: ['nachaudit_announced'],
      },
      {
        id: 'nachaudit_delegieren',
        text: 'Das Team einbinden und die Vorbereitung gemeinsam schultern',
        effects: { skills: { softSkills: 4 }, compliance: 6, relationships: { kollegen: 8, chef: 3 }, stress: 4 },
        resultText:
          'Du rufst {kollege} und die neue Kollegin zusammen und verteilst die Vorbereitung auf mehrere Schultern. Jeder übernimmt einen Bereich, den er kennt. Aus einer Ein-Personen-Last wird eine Teamaufgabe — und das Wissen verteilt sich gleich mit. {chef} ist beeindruckt, wie ruhig plötzlich alle sind.',
        teachingMoment:
          'Audit-Vorbereitung auf ein ganzes Team zu verteilen senkt nicht nur die Einzellast, sondern verankert das Sicherheitswissen breiter — beides zahlt langfristig ein.',
        setsFlags: ['nachaudit_announced', 'nachaudit_teamansatz'],
      },
      {
        id: 'nachaudit_panik',
        text: 'In blinden Aktionismus verfallen: alles gleichzeitig, planlos',
        effects: { skills: { security: 2 }, compliance: -3, relationships: { chef: -3 }, stress: 16 },
        resultText:
          'Du stürzt dich kopflos in alles gleichzeitig — hier ein Patch, da ein Dokument, dort eine halbe Maßnahme — und verzettelst dich. Am Ende der Woche bist du erschöpft und hast an zehn Stellen angefangen, aber nichts fertig. {chef} schaut besorgt: "Bist du sicher, dass das ein Plan ist?" Nein. Ist es nicht.',
        choiceTags: ['hasty'],
        setsFlags: ['nachaudit_announced', 'nachaudit_panisch'],
      },
    ],
  },

  {
    id: 'evt_nis2_massnahmenplan',
    title: 'Die offene Maßnahmenliste',
    category: 'compliance',
    weekRange: [16, 18],
    probability: 0.95,
    requires: {
      flags: ['nachaudit_announced'],
    },
    description: `Vor dir liegt die Maßnahmenliste aus der ersten Prüfung: offene Punkte, halb erledigte, ein paar, die nie angefasst wurden. Segmentierung, Log-Management, Notfallübung, Dokumentation, Zugriffskonzept.

Bis zum Nachaudit reicht die Zeit nicht für alles. Also musst du priorisieren. Nach echtem Risiko? Nach dem, was der Prüfer am ehesten sehen will? Oder holst du das Team an Bord und verteilst die Last?

Wie du diese Liste abarbeitest, entscheidet mit, wie der Prüftag ausgeht.`,
    involvedCharacters: ['kollege'],
    tags: ['kritis', 'nis2', 'nachaudit', 'massnahmen'],
    choices: [
      {
        id: 'massnahmen_risiko',
        text: 'Nach echtem Risiko priorisieren: die gefährlichsten Lücken zuerst schließen',
        effects: { skills: { security: 6, netzwerk: 3 }, compliance: 12, stress: 12 },
        resultText:
          'Du sortierst nach realem Risiko, nicht nach Optik: erst die Netzsegmentierung und das Zugriffskonzept, dann der Rest. Manches bleibt liegen, aber das, was am meisten schützt, steht. Beim Nachaudit wirst du die Löcher, die noch offen sind, ehrlich benennen können — und die geschlossenen belegen. Substanz vor Fassade.',
        teachingMoment:
          'Maßnahmen nach echtem Risiko zu priorisieren schützt tatsächlich — und ein Prüfer erkennt sofort, ob Lücken nach Gefährlichkeit oder nach Sichtbarkeit geschlossen wurden.',
        setsFlags: ['massnahmen_umgesetzt'],
      },
      {
        id: 'massnahmen_teamwork',
        text: 'Das Team einbinden: Aufgaben verteilen, Wissen streuen, gemeinsam abarbeiten',
        effects: { skills: { softSkills: 5, security: 3 }, compliance: 10, relationships: { kollegen: 10 }, stress: 8 },
        resultText:
          'Du machst aus der Liste eine Teamaufgabe: {kollege} nimmt das Log-Management, die Neue die Dokumentation, du die Segmentierung. Es geht schneller als allein, und plötzlich kennen drei Leute die Systeme statt einer. Beim Nachaudit kann jeder seinen Teil erklären — das überzeugt Prüfer mehr als jeder Einzelkämpfer.',
        teachingMoment:
          'Ein Team, das die Maßnahmen gemeinsam umgesetzt hat, kann sie im Audit auch gemeinsam erklären — verteiltes Wissen ist selbst ein Reifezeichen, das Prüfer honorieren.',
        setsFlags: ['massnahmen_teamwork'],
      },
      {
        id: 'massnahmen_kosmetik',
        text: 'Nach Sichtbarkeit priorisieren: was der Prüfer sehen will, hübsch machen',
        effects: { skills: { softSkills: 2 }, compliance: -5, stress: 6 },
        resultText:
          'Du polierst die Fassade: schöne Dokumente, ein aufgeräumter Serverraum, eine PowerPoint mit grünen Häkchen. Die tiefen Löcher — Segmentierung, Zugriffe — bleiben. Es sieht gut aus, solange keiner nachbohrt. Prüfer bohren aber genau da nach, wo es zu glatt aussieht. Du hast Zeit in Optik investiert statt in Schutz.',
        choiceTags: ['negligent', 'cosmetic'],
        setsFlags: ['massnahmen_kosmetik'],
      },
    ],
  },

  {
    id: 'evt_nis2_nachaudit_tag',
    title: 'Der Nachaudit-Tag',
    category: 'compliance',
    weekRange: [18, 20],
    probability: 0.95,
    requires: {
      flags: ['nachaudit_announced'],
    },
    description: `Dieselben zwei Prüfer, dasselbe schlechte Kaffeepulver — nur dass sie diesmal das Gebäude kennen. Sie wissen, wo der Serverraum ist, sie erinnern sich an die Mängel von damals, und sie gehen zielsicher genau dorthin, wo es beim letzten Mal wehtat.

"Zeigen Sie uns, was sich getan hat", sagt die ältere Prüferin und klappt den Laptop auf. Kein Small Talk. {chef} steht neben dir und atmet flach.

Was du in den letzten Wochen getan hast, entscheidet jetzt, ob dieser Tag ein Triumph oder eine Wiederholung wird.`,
    involvedCharacters: ['chef', 'fachabteilung'],
    tags: ['kritis', 'nis2', 'nachaudit', 'high_stakes'],
    mentorNote:
      'Ein Nachaudit prüft gezielt die zuvor bemängelten Punkte — Prüfer vergleichen Ist mit dem damaligen Soll. Belegbare, umgesetzte Maßnahmen schlagen jede Präsentation. Ehrlichkeit über Restlücken ist besser als eine Fassade, die im Detail zusammenbricht.',
    choices: [
      {
        id: 'nachaudit_beleg_umgesetzt',
        text: '[Maßnahmen umgesetzt] Die geschlossenen Lücken konkret vorführen und belegen',
        unlocks: ['massnahmen_umgesetzt'],
        effects: { skills: { security: 6, softSkills: 4 }, compliance: 15, relationships: { chef: 12 }, stress: 8 },
        resultText:
          'Du führst die Prüfer durch das segmentierte Netz, zeigst Logs, Konfigurationen, das Zugriffskonzept — alles nachweisbar. Die ältere Prüferin hebt anerkennend die Augenbrauen: "Das ist ein anderes Haus als beim letzten Mal." {chef} entspannt sich zum ersten Mal seit Wochen sichtbar. Substanz zahlt sich aus, wenn sie geprüft wird.',
        teachingMoment:
          'Im Audit gewinnt, wer Maßnahmen nicht nur behauptet, sondern live belegen kann: Konfiguration, Logs, Dokumentation. Nachweisbarkeit ist die Währung der Prüfung.',
        setsFlags: ['nachaudit_passed'],
      },
      {
        id: 'nachaudit_team_praesentiert',
        text: '[Teamansatz] Das Team präsentiert gemeinsam, jeder seinen Bereich',
        unlocks: ['massnahmen_teamwork'],
        effects: { skills: { softSkills: 5, security: 3 }, compliance: 14, relationships: { chef: 10, kollegen: 8 }, stress: 6 },
        resultText:
          '{kollege} erklärt das Log-Management, die Neue führt durch die Dokumentation, du übernimmst die Segmentierung. Die Prüfer merken: Hier hängt das Wissen nicht an einer Person. "Genau so wünschen wir uns das", sagt der jüngere Prüfer und macht sich eine Notiz. {chef} strahlt. Ein Team, das trägt, ist selbst ein bestandener Prüfpunkt.',
        teachingMoment:
          'Verteiltes Wissen ist ein Reifegrad-Merkmal: Ein Betrieb, in dem mehrere die Sicherheitsmaßnahmen erklären können, ist resilienter als einer, der von einem einzigen Kopf abhängt.',
        setsFlags: ['nachaudit_passed'],
      },
      {
        id: 'nachaudit_fassade_faellt',
        text: '[Nur Kosmetik] Die aufgehübschte Fassade präsentieren und das Beste hoffen',
        unlocks: ['massnahmen_kosmetik'],
        effects: { compliance: -5, relationships: { chef: -8 }, stress: 18 },
        resultText:
          'Du zeigst die schönen Dokumente — und die ältere Prüferin fragt genau das Eine, was du nicht belegen kannst: "Zeigen Sie mir die Segmentierung live." Die Fassade bröckelt in Echtzeit. {chef} sinkt innerlich zusammen. Am Ende: nicht durchgefallen, aber Auflagen, weil die Substanz fehlte. Optik hält keiner Nachfrage stand.',
        teachingMoment:
          'Prüfer bohren gezielt dort nach, wo es zu glatt aussieht. Eine kosmetische Vorbereitung fällt im ersten Detailgespräch auf und untergräbt die Glaubwürdigkeit für den ganzen Rest.',
        setsFlags: ['nachaudit_auflagen'],
      },
      {
        id: 'nachaudit_ehrlich',
        text: 'Ehrlich sein: den Fortschritt zeigen, die offenen Punkte selbst benennen',
        effects: { skills: { softSkills: 5, security: 2 }, compliance: 8, relationships: { chef: 5 }, stress: 10 },
        resultText:
          'Du legst offen dar, was geschafft ist und was noch fehlt — mit einem realistischen Plan für den Rest. Die Prüfer schätzen die Ehrlichkeit: "Sie kennen Ihre Lücken, das ist die halbe Miete." Es reicht nicht für ein glattes Bestehen, aber für ein faires "mit Auflagen". {chef}: "Besser als letztes Mal." Deutlich besser.',
        teachingMoment:
          'Ehrlichkeit über Restrisiken signalisiert einen funktionierenden Risikomanagement-Prozess — Prüfer bewerten ein bekanntes, geplantes Defizit milder als ein verstecktes.',
        setsFlags: ['nachaudit_auflagen'],
      },
      {
        id: 'nachaudit_ausweichen',
        text: 'Auf Zeit spielen, ausweichen, die kritischen Fragen umschiffen',
        effects: { compliance: -12, relationships: { chef: -12 }, stress: 20 },
        resultText:
          'Du weichst aus, redest um den heißen Brei, verweist auf "läuft noch". Die Prüfer durchschauen es sofort — Ausweichen ist ihr täglich Brot. "Wir sehen keine Umsetzung der Auflagen aus der Erstprüfung." {chef} schaut dich nicht mehr an. Verschärfte Nachprüfung, enger Zeitrahmen. Zweimal dieselben Löcher — das verzeiht kein Prüfer.',
        choiceTags: ['negligent', 'evasive'],
        setsFlags: ['nachaudit_failed'],
      },
    ],
  },

  {
    id: 'evt_nis2_nachaudit_ergebnis',
    title: 'Das Nachaudit-Ergebnis',
    category: 'compliance',
    weekRange: [19, 22],
    probability: 1.0,
    requires: {
      events: ['evt_nis2_nachaudit_tag'],
    },
    description: `Der Bericht zur Folgeprüfung liegt im Postfach. Diesmal öffnest du die PDF mit etwas ruhigerer Hand als beim ersten Mal — du weißt ja ungefähr, was drinsteht.

Das Ergebnis hängt daran, wie der Prüftag lief.`,
    involvedCharacters: ['chef'],
    tags: ['kritis', 'nis2', 'nachaudit', 'result'],
    choices: [
      {
        id: 'nachaudit_ergebnis_bestanden',
        text: '[Wenn bestanden] "Bestanden — mit Empfehlungen."',
        unlocks: ['nachaudit_passed'],
        effects: { compliance: 15, relationships: { chef: 20, gf: 10 }, budget: 5000, stress: -5 },
        resultText:
          '"NIS2-Konformität bestätigt. Wenige Empfehlungen für die Weiterentwicklung." {chef} liest es zweimal, dann klopft er dir auf die Schulter. {gf} sichert Budget für die empfohlenen Punkte zu. Aus dem Kartenhaus vom Jahresanfang ist ein prüffestes Fundament geworden. Das hast du geschafft.',
        teachingMoment:
          'Bestandene NIS2-Konformität ist kein Endpunkt, sondern eine Lizenz zum Weitermachen — die "Empfehlungen" sind die Roadmap fürs nächste Jahr.',
        setsFlags: ['nis2_final_compliant'],
      },
      {
        id: 'nachaudit_ergebnis_auflagen',
        text: '[Wenn Auflagen] "Auflagen — aber auf gutem Weg."',
        unlocks: ['nachaudit_auflagen'],
        effects: { compliance: 6, relationships: { chef: 5 }, stress: 8 },
        resultText:
          '"Deutlicher Fortschritt gegenüber der Erstprüfung. Verbleibende Auflagen mit Frist." Kein Triumph, aber eine ehrliche Zwischenbilanz — und ein klarer, machbarer Rest. {chef}: "Das kriegen wir hin, das ist kein Fass ohne Boden mehr." Genau. Diesmal ist das Ende in Sicht.',
        setsFlags: ['nis2_final_conditional'],
      },
      {
        id: 'nachaudit_ergebnis_verschaerft',
        text: '[Wenn durchgefallen] "Verschärfte Prüfung. Enger Zeitrahmen."',
        unlocks: ['nachaudit_failed'],
        effects: { compliance: -15, relationships: { chef: -10, kaemmerer: -8 }, budget: -6000, stress: 15 },
        resultText:
          '"Auflagen aus der Erstprüfung nicht umgesetzt. Verschärfte Nachprüfung, verbindlicher Zeitrahmen, weitere Sanktionen bei Nichterfüllung." {chef} ist enttäuscht, {kaemmerer} sieht die nächste Rechnung kommen. Zweimal dieselben offenen Punkte — jetzt wird es ernst und teuer. Ab morgen zählt jeder Tag.',
        teachingMoment:
          'Ein zweites Mal an denselben Punkten zu scheitern eskaliert die Aufsicht: engere Fristen, härtere Sanktionen. Spätestens jetzt ist Substanz statt Fassade alternativlos.',
        setsFlags: ['nis2_final_failed'],
      },
    ],
  },

  {
    id: 'evt_bsi_stichproben_besuch',
    title: 'Der unangekündigte Kurzbesuch',
    category: 'compliance',
    weekRange: [22, 24],
    probability: 0.6,
    requires: {
      flags: ['kritis_mode'],
    },
    description: `Zwei Stunden vorher ein kurzer Anruf, dann stehen sie da: ein BSI-Mitarbeiter für einen unangekündigten Kurzbesuch. "Wir waren in der Gegend", sagt er mit einem Lächeln, das genau weiß, dass das eine Ausrede ist. "Nur ein kurzer Blick, ob die Papiere zur Realität passen."

Kein großes Audit, keine Wochen Vorbereitung. Genau das ist der Punkt: Ein Kurzbesuch zeigt schonungslos, ob eure Sicherheit gelebt wird oder nur dokumentiert ist. Was auf dem Papier steht, muss jetzt auch im Serverraum stehen.

Er schaut sich um und wartet, dass du ihn herumführst.`,
    involvedCharacters: ['chef'],
    tags: ['kritis', 'nis2', 'bsi', 'stichprobe'],
    choices: [
      {
        id: 'stichprobe_transparent',
        text: 'Transparent herumführen: zeigen, wie es wirklich läuft',
        effects: { skills: { security: 4, softSkills: 3 }, compliance: 10, relationships: { chef: 6 }, stress: 6 },
        resultText:
          'Du führst ihn ohne Nervosität herum — weil es nichts zu verstecken gibt. Segmentierung steht, Logs laufen, die Doku stimmt mit der Realität überein. Er nickt zufrieden: "Selten, dass Papier und Praxis so zusammenpassen." Der beste Beweis von Sicherheitsreife ist, wenn ein unangekündigter Blick nichts Peinliches zutage fördert.',
        teachingMoment:
          'Gelebte Sicherheit besteht den Überraschungstest: Wenn Dokumentation und Realität übereinstimmen, ist ein unangekündigter Besuch kein Stress, sondern eine Bestätigung.',
        setsFlags: ['stichprobe_bestanden'],
      },
      {
        id: 'stichprobe_ehrlich',
        text: 'Ehrlich durch das Gute und die offenen Baustellen führen',
        effects: { skills: { softSkills: 4, security: 2 }, compliance: 6, relationships: { chef: 3 }, stress: 8 },
        resultText:
          'Du zeigst, was steht, und benennst, woran ihr noch arbeitet — ohne etwas zu beschönigen. Er schätzt die Offenheit: "Sie wissen, wo Sie stehen. Das ist mehr wert als eine polierte Fassade." Kein perfektes Bild, aber ein glaubwürdiges. Genau das trägt eure Nachaudit-Bewertung mit.',
        teachingMoment:
          'Ehrlichkeit über offene Punkte wirkt auch im Kurzbesuch glaubwürdiger als Perfektion vorzutäuschen — Prüfer honorieren realistische Selbsteinschätzung.',
      },
      {
        id: 'stichprobe_hinhalten',
        text: 'Hinhalten und hoffen, dass er nicht zu genau hinschaut',
        effects: { compliance: -8, relationships: { chef: -3 }, stress: 12 },
        resultText:
          'Du versuchst, ihn mit Kaffee und Small Talk vom Serverraum fernzuhalten. Er lächelt höflich — und geht trotzdem genau dorthin, wo die Doku nicht zur Realität passt. "Das hier steht so nicht in Ihren Unterlagen." Notiert. Ein Kurzbesuch belohnt keine Ablenkungsmanöver, er entlarvt sie.',
        choiceTags: ['evasive', 'negligent'],
      },
    ],
  },
];
