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
    },
  },

  // ============================================
  // SKILL SIDEQUESTS
  // Unlock by reaching skill thresholds
  // ============================================

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

  {
    id: 'sq_legacy_code',
    title: 'Archäologie im Code',
    description: 'Ein uraltes Skript steuert die halbe Abfallwirtschaft - und niemand traut sich, es anzufassen. Stefan hat es geschrieben. Und offenbar mehr hineingebaut als nur Buchhaltung.',
    triggerCondition: {
      skills: [{ skill: 'linux', minValue: 40 }],
      minChapter: 'ch03_first_crisis',
      maxChapter: 'ch08_calm_before',
    },
    events: ['adv_sq_legacy_1', 'adv_sq_legacy_2', 'adv_sq_legacy_3'],
    rewards: {
      skills: { linux: 8, troubleshooting: 5 },
      flags: ['legacy_master'],
    },
    storyEffects: {
      // The kill-switch discovered here becomes a lifeline when the attack hits in ch09.
      unlocksDialogue: [
        { eventId: 'adv_initial_response', optionId: 'use_legacy_knowledge' },
      ],
    },
  },

  // ============================================
  // DISCOVERY SIDEQUESTS
  // Unlock by following the threads the story leaves lying around
  // ============================================

  {
    id: 'sq_predecessor_trail',
    title: 'Die Spur des Vorgängers',
    description: 'Stefan hat Post-its hinterlassen, versteckte Dateien, kleine Brotkrumen. Je länger du hinschaust, desto klarer wird: Er wollte gefunden werden.',
    triggerCondition: {
      flags: ['found_mysterious_note'],
      minChapter: 'ch04_the_file',
      maxChapter: 'ch10_72_hours',
    },
    events: ['adv_sq_trail_1', 'adv_sq_trail_2', 'adv_sq_trail_3'],
    rewards: {
      skills: { security: 3, troubleshooting: 3 },
      relationships: { kollegen: 10 },
      flags: ['knows_predecessor_story', 'found_evidence'],
    },
    storyEffects: {
      // Having reconstructed Stefan's trail lets you prove it to him in ch11.
      unlocksDialogue: [
        { eventId: 'adv_predecessor_truth', optionId: 'show_evidence' },
      ],
    },
  },

  {
    id: 'sq_external_contact',
    title: 'Der anonyme Tipp',
    description: 'Eine verschlüsselte Nachricht von einem Unbekannten. Hilfe - oder eine Falle? Wer sich meldet, weiß Dinge, die er nicht wissen sollte.',
    triggerCondition: {
      flags: ['started_investigation'],
      minChapter: 'ch05_coincidence',
      maxChapter: 'ch10_72_hours',
    },
    events: ['adv_sq_contact_1', 'adv_sq_contact_2', 'adv_sq_contact_3'],
    rewards: {
      skills: { security: 4, softSkills: 3 },
      flags: ['has_external_ally', 'insider_info'],
    },
    storyEffects: {
      // The external ally is the reason you can trace Brandt's firm across the region in ch11.
      unlocksDialogue: [
        { eventId: 'adv_attacker_identity', optionId: 'reveal_source' },
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
    description: 'Der Drucker im 3. Stock druckt nachts von selbst. Rechnungen. Für eine Firma die es nicht gibt. Bjorg behauptet, der Drucker sei verflucht — und damit "nicht sein Aufgabenbereich".',
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
];

// Helper to get sidequest by ID
export function getSidequestById(id: string): SidequestDefinition | undefined {
  return adventureSidequests.find(sq => sq.id === id);
}

// Export sidequest count for progress tracking
export const TOTAL_SIDEQUESTS = adventureSidequests.length;
