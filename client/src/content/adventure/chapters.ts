/**
 * Adventure Mode Chapters
 * "Die Probezeit" - A workplace comedy meets cyber thriller
 */

import { AdventureChapter } from '@kritis/shared';

export const adventureChapters: AdventureChapter[] = [
  // ============================================
  // ACT 1: "DER NEUE" (Weeks 1-4)
  // Establish workplace, meet characters, seeds of mystery
  // ============================================

  {
    id: 'ch01_first_day',
    title: 'Der erste Tag',
    act: 1,
    description: 'Dein erster Tag bei der Kommunalen Abfallwirtschaft. Zeit, die Kollegen kennenzulernen - und herauszufinden, warum dein Vorgänger so plötzlich gegangen ist.',
    storyBeats: [
      { id: 'beat01', eventId: 'adv_welcome', isOptional: false },
      { id: 'beat02', eventId: 'adv_desk_discovery', isOptional: false },
      { id: 'beat03', eventId: 'adv_first_ticket', isOptional: false },
      { id: 'beat04', eventId: 'adv_mysterious_note', isOptional: false },
    ],
    sidequests: [],
    unlockConditions: { minimumWeek: 1 },
    completionUnlocks: ['ch02_settling_in'],
  },

  {
    id: 'ch02_settling_in',
    title: 'Einarbeitung',
    act: 1,
    description: 'Die erste Woche ist überstanden. Du lernst die Systeme kennen - und ihre Macken. Thomas scheint dir vertrauen zu wollen, aber da ist noch etwas, das er verschweigt.',
    storyBeats: [
      { id: 'beat01', eventId: 'adv_system_tour', isOptional: false },
      { id: 'beat02', eventId: 'adv_coffee_machine_intro', isOptional: false },
      { id: 'beat03', eventId: 'adv_thomas_warning', isOptional: false },
      { id: 'beat04', eventId: 'adv_strange_logs', isOptional: false },
    ],
    sidequests: [],
    unlockConditions: { previousChapter: 'ch01_first_day', minimumWeek: 2 },
    completionUnlocks: ['ch03_first_crisis'],
  },

  {
    id: 'ch03_first_crisis',
    title: 'Feuertaufe',
    act: 1,
    description: 'Der Drucker im dritten Stock spinnt, der Chef braucht JETZT seine Präsentation, und irgendetwas stimmt nicht mit dem Mail-Server. Willkommen im IT-Alltag!',
    storyBeats: [
      { id: 'beat01', eventId: 'adv_printer_emergency', isOptional: false },
      { id: 'beat02', eventId: 'adv_chef_pressure', isOptional: false },
      { id: 'beat03', eventId: 'adv_mail_anomaly', isOptional: false },
      { id: 'beat04', eventId: 'adv_late_night', isOptional: false },
    ],
    sidequests: [],
    unlockConditions: { previousChapter: 'ch02_settling_in', minimumWeek: 3 },
    completionUnlocks: ['ch04_the_file'],
  },

  {
    id: 'ch04_the_file',
    title: 'NICHT_ÖFFNEN.zip',
    act: 1,
    description: 'Du findest eine verschlüsselte Datei auf dem alten Rechner deines Vorgängers. Der Dateiname: "NICHT_ÖFFNEN.zip". Was hat er herausgefunden?',
    storyBeats: [
      { id: 'beat01', eventId: 'adv_old_pc', isOptional: false },
      { id: 'beat02', eventId: 'adv_encrypted_file', isOptional: false },
      { id: 'beat03', eventId: 'adv_password_hunt', isOptional: false },
      {
        id: 'beat04',
        eventId: 'adv_file_contents',
        isOptional: false,
        branchCondition: 'found_password',
        alternateEventId: 'adv_file_locked',
      },
    ],
    sidequests: [],
    unlockConditions: { previousChapter: 'ch03_first_crisis', minimumWeek: 4 },
    completionUnlocks: ['ch05_coincidence'],
  },

  // ============================================
  // ACT 2: "DIE VERSCHWÖRUNG" (Weeks 5-8)
  // Evidence mounts, tensions rise, key choices
  // ============================================

  {
    id: 'ch05_coincidence',
    title: 'Zufälle gibt es nicht',
    act: 2,
    description: 'Die Anomalien häufen sich. Ein "Zufall" nach dem anderen. Thomas gesteht dir etwas - und plötzlich ergibt alles einen schrecklichen Sinn.',
    storyBeats: [
      { id: 'beat01', eventId: 'adv_pattern_recognition', isOptional: false },
      { id: 'beat02', eventId: 'adv_thomas_confession', isOptional: false },
      { id: 'beat03', eventId: 'adv_news_report', isOptional: false },
      { id: 'beat04', eventId: 'adv_connecting_dots', isOptional: false },
    ],
    sidequests: [],
    unlockConditions: { previousChapter: 'ch04_the_file', minimumWeek: 5 },
    completionUnlocks: ['ch06_trust_no_one'],
  },

  {
    id: 'ch06_trust_no_one',
    title: 'Wem vertraust du?',
    act: 2,
    description: 'Du weißt jetzt, dass etwas Größeres im Gange ist. Aber wem kannst du vertrauen? Dem Chef, der nichts hören will? Thomas, der Geheimnisse hat? Dem BSI? Oder niemandem?',
    storyBeats: [
      { id: 'beat01', eventId: 'adv_evidence_gathered', isOptional: false },
      { id: 'beat02', eventId: 'adv_chef_confrontation', isOptional: false },
      {
        id: 'beat03',
        eventId: 'adv_bsi_contact',
        isOptional: false,
        branchCondition: 'chose_official_route',
        alternateEventId: 'adv_solo_investigation',
      },
      { id: 'beat04', eventId: 'adv_point_of_no_return', isOptional: false },
    ],
    sidequests: [],
    unlockConditions: { previousChapter: 'ch05_coincidence', minimumWeek: 6 },
    completionUnlocks: ['ch07_escalation'],
  },

  {
    id: 'ch07_escalation',
    title: 'Eskalation',
    act: 2,
    description: 'Die Angriffe werden persönlicher. Jemand weiß, dass du herumschnüffelst. Ein Phishing-Versuch zielt direkt auf dich - und enthält Details, die nur ein Insider kennen könnte.',
    storyBeats: [
      { id: 'beat01', eventId: 'adv_targeted_phishing', isOptional: false },
      { id: 'beat02', eventId: 'adv_insider_threat', isOptional: false },
      { id: 'beat03', eventId: 'adv_security_lockdown', isOptional: false },
      { id: 'beat04', eventId: 'adv_unexpected_ally', isOptional: false },
    ],
    sidequests: [],
    unlockConditions: { previousChapter: 'ch06_trust_no_one', minimumWeek: 7 },
    completionUnlocks: ['ch08_calm_before'],
  },

  {
    id: 'ch08_calm_before',
    title: 'Die Ruhe vor dem Sturm',
    act: 2,
    description: 'Eine trügerische Stille. Die Systeme laufen stabil. Zu stabil. Thomas ist nervös - er hat so etwas schon mal erlebt, sagt er. Kurz bevor alles explodierte.',
    storyBeats: [
      { id: 'beat01', eventId: 'adv_false_peace', isOptional: false },
      { id: 'beat02', eventId: 'adv_preparation_check', isOptional: false },
      { id: 'beat03', eventId: 'adv_thomas_flashback', isOptional: false },
      { id: 'beat04', eventId: 'adv_warning_signs', isOptional: false },
    ],
    sidequests: [],
    unlockConditions: { previousChapter: 'ch07_escalation', minimumWeek: 8 },
    completionUnlocks: ['ch09_attack'],
  },

  // ============================================
  // ACT 3: "DER SHOWDOWN" (Weeks 9-12)
  // Crisis, resolution, consequences
  // ============================================

  {
    id: 'ch09_attack',
    title: 'Der Angriff',
    act: 3,
    description: 'Es passiert am Montagmorgen. Ransomware. Verschlüsselte Systeme. Telefone, die nicht mehr funktionieren. Und mitten in der Panik: Du hast 72 Stunden.',
    storyBeats: [
      { id: 'beat01', eventId: 'adv_ransomware_strike', isOptional: false },
      { id: 'beat02', eventId: 'adv_chaos_unfolds', isOptional: false },
      { id: 'beat03', eventId: 'adv_initial_response', isOptional: false },
      { id: 'beat04', eventId: 'adv_clock_starts', isOptional: false },
    ],
    sidequests: [],
    unlockConditions: { previousChapter: 'ch08_calm_before', minimumWeek: 9 },
    completionUnlocks: ['ch10_72_hours'],
  },

  {
    id: 'ch10_72_hours',
    title: '72 Stunden',
    act: 3,
    description: 'Die Uhr tickt. Die Müllabfuhr steht still. Der Bürgermeister ruft an. Das BSI ist unterwegs. Und du musst entscheiden: Zahlen, kämpfen, oder den Backup-Plan aktivieren - falls es einen gibt.',
    storyBeats: [
      {
        id: 'beat01',
        eventId: 'adv_backup_check',
        isOptional: false,
        branchCondition: 'found_basement_server',
        alternateEventId: 'adv_no_backup',
      },
      { id: 'beat02', eventId: 'adv_mayor_call', isOptional: false },
      { id: 'beat03', eventId: 'adv_team_rally', isOptional: false },
      {
        id: 'beat04',
        eventId: 'adv_thomas_helps',
        isOptional: false,
        branchCondition: 'thomas_is_ally',
        alternateEventId: 'adv_alone_in_crisis',
      },
    ],
    sidequests: [],
    unlockConditions: { previousChapter: 'ch09_attack', minimumWeek: 10 },
    completionUnlocks: ['ch11_truth'],
  },

  {
    id: 'ch11_truth',
    title: 'Die Wahrheit',
    act: 3,
    description: 'Während du gegen die Zeit kämpfst, werden die Hintergründe klar. Wer steckt dahinter? Warum die Müllabfuhr? Und was hat das mit deinem Vorgänger zu tun?',
    storyBeats: [
      { id: 'beat01', eventId: 'adv_attacker_identity', isOptional: false },
      { id: 'beat02', eventId: 'adv_predecessor_truth', isOptional: false },
      { id: 'beat03', eventId: 'adv_real_target', isOptional: false },
      { id: 'beat04', eventId: 'adv_final_decision', isOptional: false },
    ],
    sidequests: [],
    unlockConditions: { previousChapter: 'ch10_72_hours', minimumWeek: 11 },
    completionUnlocks: ['ch12_finale'],
  },

  {
    id: 'ch12_finale',
    title: 'Probezeit beendet',
    act: 3,
    description: 'Die letzten Stunden. Alles, was du getan hast, alles, wem du geholfen oder geschadet hast, kommt jetzt zusammen. Die Probezeit endet - aber wie?',
    storyBeats: [
      { id: 'beat01', eventId: 'adv_final_push', isOptional: false },
      { id: 'beat02', eventId: 'adv_allies_arrive', isOptional: false },
      { id: 'beat03', eventId: 'adv_climax', isOptional: false },
      { id: 'beat04', eventId: 'adv_ending', isOptional: false },
    ],
    sidequests: [],
    unlockConditions: { previousChapter: 'ch11_truth', minimumWeek: 12 },
    completionUnlocks: [],
  },
];

// Export chapter count for progress tracking
export const TOTAL_CHAPTERS = adventureChapters.length;
export const TOTAL_STORY_BEATS = adventureChapters.reduce(
  (sum, ch) => sum + ch.storyBeats.length,
  0
);
