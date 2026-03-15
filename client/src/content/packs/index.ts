// Content Pack Registry
// Automatically discovers and registers all content packs
// To add a new pack: create folder in packs/, export from index.ts, import here

import { NpcPack, ScenarioPack, VendorNpc, Scenario, NpcContact } from '@kritis/shared';

// Import all content packs
import amseItPack from './amse-it';
import telekomPack from './telekom';
import cloud365Pack from './cloud365';
import internalPack from './internal';
import kritisInfraPack from './kritis-infra';

// Registry of all loaded packs
export const npcPacks: NpcPack[] = [
  amseItPack.npcPack,
  telekomPack.npcPack,
  cloud365Pack.npcPack,
  internalPack.npcPack,
  kritisInfraPack.npcPack,
];

export const scenarioPacks: ScenarioPack[] = [
  amseItPack.scenarioPack,
  telekomPack.scenarioPack,
  cloud365Pack.scenarioPack,
  internalPack.scenarioPack,
  kritisInfraPack.scenarioPack,
];

// Helper functions for content access

/**
 * Get all NPCs across all packs
 */
export function getAllNpcs(): VendorNpc[] {
  return npcPacks.flatMap(pack => pack.npcs);
}

/**
 * Get NPC by ID
 */
export function getNpcById(id: string): VendorNpc | undefined {
  return getAllNpcs().find(npc => npc.id === id);
}

/**
 * Get NPC contact by ID
 */
export function getContactById(contactId: string): NpcContact | undefined {
  for (const npc of getAllNpcs()) {
    const contact = npc.contacts.find(c => c.id === contactId);
    if (contact) return contact;
  }
  return undefined;
}

/**
 * Get all scenarios across all packs
 */
export function getAllScenarios(): Scenario[] {
  return scenarioPacks.flatMap(pack => pack.scenarios);
}

/**
 * Get scenario by ID
 */
export function getScenarioById(id: string): Scenario | undefined {
  return getAllScenarios().find(s => s.id === id);
}

/**
 * Get scenarios for a specific NPC
 */
export function getScenariosForNpc(npcId: string): Scenario[] {
  const pack = scenarioPacks.find(p => p.npcId === npcId);
  return pack?.scenarios ?? [];
}

/**
 * Get scenarios by category
 */
export function getScenariosByCategory(category: string): Scenario[] {
  return getAllScenarios().filter(s => s.category === category);
}

/**
 * Get scenarios by difficulty range
 */
export function getScenariosByDifficulty(minDifficulty: number, maxDifficulty: number): Scenario[] {
  return getAllScenarios().filter(s => s.difficulty >= minDifficulty && s.difficulty <= maxDifficulty);
}

/**
 * Get a random catchphrase from an NPC contact
 */
export function getRandomCatchphrase(contactId: string): string | undefined {
  const contact = getContactById(contactId);
  if (!contact || contact.catchphrases.length === 0) return undefined;
  return contact.catchphrases[Math.floor(Math.random() * contact.catchphrases.length)];
}

/**
 * Get a random dialogue bark from an NPC contact
 */
export function getRandomDialogueBark(contactId: string): string | undefined {
  const contact = getContactById(contactId);
  if (!contact || !contact.dialogueBarks || contact.dialogueBarks.length === 0) return undefined;
  return contact.dialogueBarks[Math.floor(Math.random() * contact.dialogueBarks.length)];
}

// Content statistics
export function getContentStats() {
  return {
    npcPacks: npcPacks.length,
    totalNpcs: getAllNpcs().length,
    totalContacts: getAllNpcs().reduce((sum, npc) => sum + npc.contacts.length, 0),
    scenarioPacks: scenarioPacks.length,
    totalScenarios: getAllScenarios().length,
    scenariosByCategory: getAllScenarios().reduce((acc, s) => {
      acc[s.category] = (acc[s.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };
}
