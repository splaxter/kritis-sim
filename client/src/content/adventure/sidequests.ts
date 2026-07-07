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
