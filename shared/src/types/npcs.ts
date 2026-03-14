// NPC System - External vendors, colleagues, authorities
import { ContentPack } from './content.js';

export interface NpcContact {
  id: string;
  name: string;
  role: string;
  age?: number;
  personality: string;
  appearancePrompt?: string; // For AI image generation
  catchphrases: string[];
  dialogueBarks?: string[]; // Random one-liners during interactions
}

export interface SlaConfig {
  responseTime: string;
  actualResponseTime?: string; // Reality vs. contract
}

export interface RelationshipLevel {
  level: number;
  name: string;
  threshold: number;
}

export interface RelationshipSystem {
  description: string;
  businessLevels: RelationshipLevel[];
  technicalTrustLevels: RelationshipLevel[];
  specialEvents?: Record<string, string>;
}

export interface VendorNpc {
  id: string;
  companyName: string;
  companyType: string;
  contract: string;
  sla: SlaConfig;
  contacts: NpcContact[];
  companyQuirks: string[];
  relationshipSystem: RelationshipSystem;
  metaLesson: string;
}

export interface NpcPack extends ContentPack {
  contentType: 'npc_vendor' | 'npc_internal' | 'npc_authority';
  npcs: VendorNpc[];
  gameplayMechanics?: GameplayMechanics;
}

export interface GameplayMechanics {
  vendorScoreTracking?: {
    description: string;
    metrics: string[];
  };
  trustButVerifyMechanic?: {
    description: string;
    baseErrorRate: number;
    errorRateDecreasesWith: string;
    errorRateIncreasesWith: string;
  };
}
