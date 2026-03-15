/**
 * Adventure Mode Sidequests
 * Optional content that affects the main story
 */

import { SidequestDefinition } from '@kritis/shared';

export const adventureSidequests: SidequestDefinition[] = [
  // ============================================
  // RELATIONSHIP SIDEQUESTS
  // Unlock through befriending NPCs
  // ============================================

  {
    id: 'sq_coffee_machine',
    title: 'Der Kaffeemaschinenflüsterer',
    description: 'Die Kaffeemaschine im Pausenraum macht seltsame Geräusche. Niemand wagt sich ran - außer dir.',
    triggerCondition: {
      relationships: [{ npc: 'kollegen', minLevel: 10 }],
      minChapter: 'ch02_settling_in',
      maxChapter: 'ch04_the_file',
    },
    events: ['adv_sq_coffee_1', 'adv_sq_coffee_2', 'adv_sq_coffee_3'],
    rewards: {
      relationships: { kollegen: 20 },
      flags: ['coffee_hero'],
    },
    storyEffects: {
      unlocksDialogue: [
        { eventId: 'adv_team_rally', optionId: 'coffee_speech' },
      ],
      changesNpcBehavior: [
        { npcId: 'kollegen', newState: 'grateful' },
      ],
      grantsAbility: 'team_morale_boost',
    },
  },

  {
    id: 'sq_thomas_secret',
    title: 'Thomas\' Mining-Geheimnis',
    description: 'Thomas verhält sich seltsam. Nachts leuchten LEDs in seinem Büro. Was macht er da?',
    triggerCondition: {
      relationships: [{ npc: 'kollegen', minLevel: 30 }],
      minChapter: 'ch03_first_crisis',
    },
    events: ['adv_sq_thomas_1', 'adv_sq_thomas_2', 'adv_sq_thomas_3'],
    rewards: {
      relationships: { kollegen: 15 },
      flags: ['thomas_trust', 'knows_mining_secret'],
    },
    storyEffects: {
      unlocksDialogue: [
        { eventId: 'adv_thomas_confession', optionId: 'already_know' },
      ],
      changesNpcBehavior: [
        { npcId: 'thomas', newState: 'trusting' },
      ],
      grantsAbility: 'spare_compute_power',
    },
  },

  {
    id: 'sq_chef_family',
    title: 'Der Chef hat Sorgen',
    description: 'Chef Bernd wirkt gestresst - mehr als sonst. Irgendetwas belastet ihn privat.',
    triggerCondition: {
      relationships: [{ npc: 'chef', minLevel: 25 }],
      minChapter: 'ch05_coincidence',
    },
    events: ['adv_sq_chef_1', 'adv_sq_chef_2'],
    rewards: {
      relationships: { chef: 25 },
      flags: ['chef_confidant'],
    },
    storyEffects: {
      unlocksDialogue: [
        { eventId: 'adv_chef_confrontation', optionId: 'appeal_to_family' },
      ],
      changesNpcBehavior: [
        { npcId: 'chef', newState: 'supportive' },
      ],
    },
  },

  {
    id: 'sq_kaemmerer_excel',
    title: 'Der Excel-Albtraum',
    description: 'Der Kämmerer kämpft mit einer 50 MB Excel-Datei. Seine Karriere hängt davon ab - sagt er zumindest.',
    triggerCondition: {
      relationships: [{ npc: 'kaemmerer', minLevel: 0 }],
      minChapter: 'ch02_settling_in',
      maxChapter: 'ch06_trust_no_one',
    },
    events: ['adv_sq_excel_1', 'adv_sq_excel_2'],
    rewards: {
      relationships: { kaemmerer: 30 },
      budgetBonus: 5000,
      flags: ['kaemmerer_friend'],
    },
    storyEffects: {
      grantsAbility: 'emergency_budget',
      changesNpcBehavior: [
        { npcId: 'kaemmerer', newState: 'ally' },
      ],
    },
  },

  // ============================================
  // SKILL SIDEQUESTS
  // Unlock by reaching skill thresholds
  // ============================================

  {
    id: 'sq_basement_server',
    title: 'Der Server im Keller',
    description: 'Im Keller steht ein alter Server, verstaubt und vergessen. Aber er läuft noch. Warum?',
    triggerCondition: {
      skills: [{ skill: 'security', minValue: 35 }],
      minChapter: 'ch04_the_file',
    },
    events: ['adv_sq_basement_1', 'adv_sq_basement_2', 'adv_sq_basement_3'],
    rewards: {
      skills: { security: 5, linux: 5 },
      flags: ['found_basement_server', 'has_backup_system'],
    },
    storyEffects: {
      addsStoryBeat: [
        {
          chapterId: 'ch10_72_hours',
          beat: { id: 'backup_option', eventId: 'adv_backup_available', isOptional: true },
        },
      ],
      grantsAbility: 'secret_backup',
    },
  },

  {
    id: 'sq_legacy_code',
    title: 'Archäologie im Code',
    description: 'Ein uraltes Skript steuert kritische Prozesse. Niemand versteht es mehr. Außer vielleicht du?',
    triggerCondition: {
      skills: [{ skill: 'linux', minValue: 40 }],
      minChapter: 'ch03_first_crisis',
    },
    events: ['adv_sq_legacy_1', 'adv_sq_legacy_2'],
    rewards: {
      skills: { linux: 8, troubleshooting: 5 },
      flags: ['legacy_master'],
    },
    storyEffects: {
      unlocksDialogue: [
        { eventId: 'adv_initial_response', optionId: 'use_legacy_knowledge' },
      ],
    },
  },

  {
    id: 'sq_network_optimization',
    title: 'Der Flaschenhals',
    description: 'Das Netzwerk ist langsam. Viel zu langsam. Irgendwo gibt es einen Engpass - und du wirst ihn finden.',
    triggerCondition: {
      skills: [{ skill: 'netzwerk', minValue: 35 }],
      minChapter: 'ch02_settling_in',
    },
    events: ['adv_sq_network_1', 'adv_sq_network_2'],
    rewards: {
      skills: { netzwerk: 8 },
      flags: ['network_expert'],
    },
    storyEffects: {
      unlocksDialogue: [
        { eventId: 'adv_security_lockdown', optionId: 'segment_network' },
      ],
    },
  },

  // ============================================
  // DISCOVERY SIDEQUESTS
  // Unlock by finding clues in main story
  // ============================================

  {
    id: 'sq_predecessor_trail',
    title: 'Die Spur des Vorgängers',
    description: 'Dein Vorgänger hat Hinweise hinterlassen. Post-its, Notizen, versteckte Dateien. Er wollte gefunden werden.',
    triggerCondition: {
      flags: ['found_mysterious_note'],
      minChapter: 'ch04_the_file',
    },
    events: ['adv_sq_trail_1', 'adv_sq_trail_2', 'adv_sq_trail_3', 'adv_sq_trail_4'],
    rewards: {
      flags: ['knows_predecessor_story', 'found_evidence'],
    },
    storyEffects: {
      addsStoryBeat: [
        {
          chapterId: 'ch11_truth',
          beat: { id: 'full_truth', eventId: 'adv_complete_picture', isOptional: true },
        },
      ],
      unlocksDialogue: [
        { eventId: 'adv_predecessor_truth', optionId: 'show_evidence' },
      ],
    },
  },

  {
    id: 'sq_external_contact',
    title: 'Der anonyme Tipp',
    description: 'Eine verschlüsselte Nachricht landet in deinem Postfach. Jemand will helfen - oder dich in eine Falle locken.',
    triggerCondition: {
      flags: ['started_investigation'],
      minChapter: 'ch05_coincidence',
    },
    events: ['adv_sq_contact_1', 'adv_sq_contact_2', 'adv_sq_contact_3'],
    rewards: {
      flags: ['has_external_ally', 'insider_info'],
    },
    storyEffects: {
      unlocksDialogue: [
        { eventId: 'adv_attacker_identity', optionId: 'reveal_source' },
      ],
      changesNpcBehavior: [
        { npcId: 'mysterious_contact', newState: 'revealed' },
      ],
    },
  },

  {
    id: 'sq_log_analysis',
    title: 'Die Wahrheit liegt in den Logs',
    description: 'Wochen von Log-Dateien. Terabytes von Daten. Irgendwo darin ist das Muster, das alles erklärt.',
    triggerCondition: {
      skills: [{ skill: 'troubleshooting', minValue: 40 }],
      flags: ['noticed_anomalies'],
      minChapter: 'ch05_coincidence',
    },
    events: ['adv_sq_logs_1', 'adv_sq_logs_2'],
    rewards: {
      skills: { security: 5, troubleshooting: 5 },
      flags: ['pattern_discovered', 'attack_timeline'],
    },
    storyEffects: {
      unlocksDialogue: [
        { eventId: 'adv_bsi_contact', optionId: 'present_evidence' },
        { eventId: 'adv_connecting_dots', optionId: 'complete_picture' },
      ],
    },
  },

  // ============================================
  // ABSURD SIDEQUESTS
  // Comedy relief that still matters
  // ============================================

  {
    id: 'sq_haunted_printer',
    title: 'Der Druckergeist',
    description: 'Der Drucker im 3. Stock druckt nachts von selbst. Rechnungen. Für eine Firma die es nicht gibt. Thomas behauptet, der Drucker sei verflucht.',
    triggerCondition: {
      minChapter: 'ch03_first_crisis',
      maxChapter: 'ch08_calm_before',
    },
    events: ['adv_sq_printer_1', 'adv_sq_printer_2', 'adv_sq_printer_3'],
    rewards: {
      relationships: { kollegen: 15 },
      flags: ['printer_mystery_solved'],
    },
    storyEffects: {
      // This sidequest reveals that rogue processes are a symptom of the larger attack
      unlocksDialogue: [
        { eventId: 'adv_pattern_recognition', optionId: 'printer_connection' },
      ],
    },
  },

  {
    id: 'sq_password_chaos',
    title: 'Das Passwort-Chaos',
    description: 'Die Buchhaltung hat ihr Passwort vergessen. Alle 7 Mitarbeiter. Am selben Tag. Das ist kein Zufall.',
    triggerCondition: {
      minChapter: 'ch05_coincidence',
      maxChapter: 'ch07_escalation',
    },
    events: ['adv_sq_password_1', 'adv_sq_password_2'],
    rewards: {
      flags: ['credential_theft_detected'],
    },
    storyEffects: {
      unlocksDialogue: [
        { eventId: 'adv_insider_threat', optionId: 'mention_passwords' },
      ],
    },
  },
];

// Helper to get sidequest by ID
export function getSidequestById(id: string): SidequestDefinition | undefined {
  return adventureSidequests.find(sq => sq.id === id);
}

// Export sidequest count for progress tracking
export const TOTAL_SIDEQUESTS = adventureSidequests.length;
