/**
 * Types for the game asset system
 */

export type NpcId =
  | 'chef'
  | 'gf'
  | 'kaemmerer'
  | 'fachabteilung'
  | 'kollegen'
  // AMSE IT
  | 'marco'
  | 'stefan'
  // Telekom
  | 'thomas'
  | 'sabine'
  // Cloud365
  | 'kevin'
  | 'martin';

export type NpcEmotion =
  | 'neutral'
  | 'happy'
  | 'angry'
  | 'stressed'
  | 'disappointed'
  | 'pleased'
  | 'concerned'
  | 'impressed'
  | 'approving'
  | 'rejecting'
  | 'suspicious'
  | 'satisfied'
  | 'frustrated'
  | 'grateful'
  | 'confused'
  | 'impatient'
  | 'supportive'
  | 'overwhelmed'
  | 'celebrating'
  | 'gossiping'
  | 'defensive'
  | 'caught'
  | 'relieved'
  | 'copying'
  | 'selling'
  | 'apologizing'
  | 'schmoozing';

export type SceneId =
  | 'server-room'
  | 'office'
  | 'meeting-room'
  | 'helpdesk'
  | 'datacenter'
  | 'vendor-office';

export type CategoryIconId =
  | 'security'
  | 'network'
  | 'helpdesk'
  | 'hardware'
  | 'vendor-management'
  | 'compliance'
  | 'linux'
  | 'windows'
  | 'email'
  | 'phone';

export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';

export type OutcomeType =
  | 'perfect'
  | 'success'
  | 'partial-success'
  | 'fail'
  | 'critical-fail';

// Asset path configuration
export interface AssetConfig {
  basePath: string;
  fallbackEnabled: boolean;
  imageFormat: 'png' | 'webp' | 'svg';
}

// NPC display names mapping
export const NPC_DISPLAY_NAMES: Record<NpcId, string> = {
  chef: 'Thomas Bergmann',
  gf: 'Dr. Heinrich Krause',
  kaemmerer: 'Petra Hoffmann',
  fachabteilung: 'Sachbearbeitung',
  kollegen: 'IT-Team',
  // AMSE IT
  marco: 'Marco Bühler',
  stefan: 'Stefan Wengler',
  // Telekom
  thomas: 'Thomas Kellermann',
  sabine: 'Sabine Weiland',
  // Cloud365
  kevin: 'Kevin Schuster',
  martin: 'Martin Vollmer',
};

// Map scenario categories to icon IDs
export const CATEGORY_TO_ICON: Record<string, CategoryIconId> = {
  vendor_management: 'vendor-management',
  security_incident: 'security',
  compliance: 'compliance',
  troubleshooting: 'hardware',
  crisis_management: 'security',
  team_dynamics: 'helpdesk',
  budget_politics: 'compliance',
  network: 'network',
  linux: 'linux',
  windows: 'windows',
};
