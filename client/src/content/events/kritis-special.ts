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

Chef Bernd steht plötzlich hinter dir. "Was ist ein NIS2?"`,
    involvedCharacters: ['chef'],
    tags: ['kritis', 'nis2', 'audit', 'compliance'],
    choices: [
      {
        id: 'explain_calmly',
        text: 'Ruhig erklären: "Eine EU-Richtlinie für IT-Sicherheit. Wir müssen uns vorbereiten."',
        effects: { relationships: { chef: 5 }, skills: { softSkills: 3 } },
        resultText: 'Chef Bernd nickt langsam. "Okay... und sind wir vorbereitet?" Du schluckst.',
        setsFlags: ['nis2_audit_announced', 'chef_informed'],
      },
      {
        id: 'panic',
        text: '"Das ist... das ist nicht gut. Wir haben zwei Wochen."',
        effects: { stress: 15, relationships: { chef: -5 } },
        resultText: 'Chef Bernd wird blass. "Zwei Wochen?! Für was?!" Die Panik breitet sich aus.',
        setsFlags: ['nis2_audit_announced', 'panic_mode'],
      },
      {
        id: 'already_prepared',
        text: '"Keine Sorge, ich habe schon angefangen, Dokumentation zu erstellen."',
        requires: { skill: 'security', threshold: 40 },
        effects: { relationships: { chef: 15 }, skills: { security: 3 } },
        resultText: 'Du zeigst ihm die Ordner, die du schon angelegt hast. "Proaktiv denken", sagst du. Chef Bernd ist beeindruckt.',
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

Thomas schaut über deine Schulter. "Willkommen in der Realität kommunaler IT."`,
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
        text: 'Thomas und die Fachabteilungen um Hilfe bitten',
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

Chef Bernd schwitzt. Thomas hat sich krank gemeldet. Und der Drucker macht wieder seltsame Geräusche.

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
        text: 'Chef Bernd die Führung überlassen',
        effects: { relationships: { chef: -15 }, compliance: -10, stress: 10 },
        resultText: '"Äh... der Server ist... das Ding da..." Chef Bernd improvisiert. Schlecht. Sehr schlecht.',
        setsFlags: ['audit_failed', 'chef_embarrassed'],
      },
    ],
  },

  {
    id: 'evt_nis2_audit_result',
    title: 'Audit-Ergebnis',
    category: 'compliance',
    weekRange: [7, 12],
    probability: 1.0,
    requires: {
      events: ['evt_nis2_audit_day'],
    },
    description: `Der offizielle Bericht des BSI ist da. Du öffnest die PDF mit zitternden Händen.

${`Die Bewertung hängt von deinen vorherigen Entscheidungen ab...`}`,
    involvedCharacters: ['chef'],
    tags: ['kritis', 'nis2', 'result'],
    choices: [
      {
        id: 'good_result',
        text: '[Wenn Audit bestanden] "Wir haben bestanden!"',
        requires: { skill: 'security', threshold: 40 },
        effects: { compliance: 15, relationships: { chef: 20 }, budget: 5000 },
        resultText: '"Konformität bestätigt. Empfehlungen im Anhang." Chef Bernd umarmt dich fast. Der Kämmerer bewilligt Sicherheitsbudget.',
        setsFlags: ['nis2_compliant'],
        teachingMoment: 'NIS2-Konformität öffnet Türen - und Budgets.',
      },
      {
        id: 'mixed_result',
        text: '[Wenn Nachaudit] "Auflagen, aber machbar."',
        effects: { compliance: 5, stress: 10 },
        resultText: '12 Punkte müssen verbessert werden. 6 Monate Zeit. Das wird eng, aber schaffbar.',
        setsFlags: ['nis2_conditional'],
      },
      {
        id: 'bad_result',
        text: '[Wenn durchgefallen] "Das... das ist nicht gut."',
        effects: { compliance: -20, relationships: { chef: -10 }, budget: -10000 },
        resultText: 'Bußgeld: 50.000€. Nachaudit in 3 Monaten. Chef Bernd spricht nicht mehr mit dir.',
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
        text: 'Thomas und ich arbeiten parallel an beidem',
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
        requires: { skill: 'troubleshooting', threshold: 30 },
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
];

// Helper to check if KRITIS mode
export function isKritisMode(gameMode: string): boolean {
  return gameMode === 'kritis';
}

// Get KRITIS events that should be added to the event pool
export function getKritisEvents(): GameEvent[] {
  return kritisSpecialEvents;
}
