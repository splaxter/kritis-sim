/**
 * Adventure Mode Types
 * Linear story mode with sidequests and multiple endings
 */

import { Skills } from './skills';

// Relationship types (avoiding circular import from gameState)
type RelationshipKey = 'chef' | 'gf' | 'kaemmerer' | 'fachabteilung' | 'kollegen';
type RelationshipValues = Partial<Record<RelationshipKey, number>>;

// ============================================
// CHAPTER SYSTEM
// ============================================

export type AdventureChapterId = string;

export interface AdventureChapter {
  id: AdventureChapterId;
  title: string;
  act: 1 | 2 | 3;
  description: string;
  /** Story events that must be completed in order */
  storyBeats: StoryBeat[];
  /** Optional sidequests available during this chapter */
  sidequests: SidequestDefinition[];
  /** Conditions to unlock this chapter */
  unlockConditions: ChapterUnlockConditions;
  /** Chapter IDs that this chapter unlocks when completed */
  completionUnlocks: string[];
}

export interface StoryBeat {
  id: string;
  /** Event or Scenario ID */
  eventId: string;
  /** If true, can be skipped */
  isOptional: boolean;
  /** Flag that must be set for this beat to play */
  branchCondition?: string;
  /** Alternative event if branchCondition is not met */
  alternateEventId?: string;
}

export interface ChapterUnlockConditions {
  /** Previous chapter that must be completed */
  previousChapter?: AdventureChapterId;
  /** Flags that must be set */
  requiredFlags?: string[];
  /** Minimum week number */
  minimumWeek?: number;
}

// ============================================
// SIDEQUEST SYSTEM
// ============================================

export interface SidequestDefinition {
  id: string;
  title: string;
  description: string;
  /** Conditions that trigger this sidequest */
  triggerCondition: SidequestTrigger;
  /** Event IDs that form this sidequest chain */
  events: string[];
  /** Rewards for completing this sidequest */
  rewards: SidequestRewards;
  /** Effects on the main story */
  storyEffects?: SidequestStoryEffect;
}

export interface SidequestTrigger {
  /** Required flags */
  flags?: string[];
  /** Required relationship levels */
  relationships?: { npc: RelationshipKey; minLevel: number }[];
  /** Required skill levels */
  skills?: { skill: keyof Skills; minValue: number }[];
  /** Minimum chapter to be active */
  minChapter?: string;
  /** Maximum chapter (sidequest expires after) */
  maxChapter?: string;
}

export interface SidequestRewards {
  /** Flags to set on completion */
  flags?: string[];
  /** Skill bonuses */
  skills?: Partial<Skills>;
  /** Relationship bonuses */
  relationships?: RelationshipValues;
  /** Stress reduction */
  stressReduction?: number;
  /** Budget bonus */
  budgetBonus?: number;
}

export interface SidequestStoryEffect {
  /** Dialogue options unlocked in main story */
  unlocksDialogue?: { eventId: string; optionId: string }[];
  /** Changes to NPC behavior */
  changesNpcBehavior?: { npcId: string; newState: string }[];
  /** Story beats added to chapters */
  addsStoryBeat?: { chapterId: string; beat: StoryBeat }[];
  /** Story beats removed from chapters */
  removesStoryBeat?: { chapterId: string; beatId: string }[];
  /** Special abilities granted */
  grantsAbility?: string;
}

// ============================================
// CHARACTER SYSTEM
// ============================================

export interface CharacterArc {
  npcId: string;
  /** Relationship stages with thresholds */
  stages: CharacterStage[];
  /** Events that trigger at each stage */
  arcEvents: Record<string, string>;
}

export interface CharacterStage {
  name: string;
  /** Minimum relationship value to reach this stage */
  threshold: number;
}

export interface CharacterMemory {
  npcId: string;
  /** Number of interactions */
  interactions: number;
  /** Trust level (-100 to +100) */
  trustLevel: number;
  /** Events where player helped or hindered this NPC */
  memorableEvents: string[];
  /** Current stage in their arc */
  currentArc: string;
}

// ============================================
// ADVENTURE STATE
// ============================================

export type StoryPath = 'official' | 'underground' | 'neutral';
export type EndingType = 'good' | 'neutral' | 'bad';

export interface AdventureState {
  /** Current chapter */
  currentChapter: AdventureChapterId;
  /** Index of current story beat within chapter */
  currentBeatIndex: number;
  /** Chapters that have been completed */
  completedChapters: AdventureChapterId[];
  /** Sidequests currently in progress */
  activeSidequests: string[];
  /** Sidequests that have been completed */
  completedSidequests: string[];
  /** Current event index within active sidequest (if any) */
  sidequestProgress: Record<string, number>;
  /** NPC relationship memory */
  characterMemory: Record<string, CharacterMemory>;
  /** Major story branch taken */
  storyPath: StoryPath;
  /** Flags that affect ending calculation */
  endingFlags: string[];
  /** Total story events completed */
  totalBeatsCompleted: number;
}

// ============================================
// ENDING SYSTEM
// ============================================

export interface AdventureEnding {
  type: EndingType;
  id: string;
  title: string;
  description: string;
  /** ASCII art or text illustration */
  illustration?: string;
  /** Epilogue text */
  epilogue: string;
  /** Requirements to reach this ending */
  requirements: EndingRequirements;
}

export interface EndingRequirements {
  /** Minimum ending score */
  minScore?: number;
  /** Maximum ending score (for bad ending) */
  maxScore?: number;
  /** Minimum sidequests completed */
  minSidequests?: number;
  /** Required flags */
  requiredFlags?: string[];
  /** Required story path */
  requiredPath?: StoryPath;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function createInitialAdventureState(): AdventureState {
  return {
    currentChapter: 'ch01_first_day',
    currentBeatIndex: 0,
    completedChapters: [],
    activeSidequests: [],
    completedSidequests: [],
    sidequestProgress: {},
    characterMemory: {},
    storyPath: 'neutral',
    endingFlags: [],
    totalBeatsCompleted: 0,
  };
}

export function calculateEndingScore(
  relationships: { chef: number; kollegen: number },
  completedSidequests: string[],
  endingFlags: string[]
): number {
  let score = 0;

  // Relationship score (max ~50 points)
  score += (relationships.chef + 100) / 4; // 0-50
  score += (relationships.kollegen + 100) / 10; // 0-20

  // Sidequest score (10 points each, max ~50)
  score += completedSidequests.length * 10;

  // Flag bonuses
  if (endingFlags.includes('saved_early')) score += 20;
  if (endingFlags.includes('found_evidence')) score += 15;
  if (endingFlags.includes('team_prepared')) score += 10;
  if (endingFlags.includes('trusted_by_all')) score += 15;

  // Penalties
  if (endingFlags.includes('burned_bridges')) score -= 30;
  if (endingFlags.includes('ignored_warnings')) score -= 20;
  if (endingFlags.includes('blamed_others')) score -= 15;

  return Math.max(0, Math.min(100, score));
}

export function determineEnding(
  score: number,
  completedSidequests: number,
  storyPath: StoryPath
): EndingType {
  if (score >= 70 && completedSidequests >= 3) {
    return 'good';
  } else if (score >= 40 || (score >= 30 && completedSidequests >= 2)) {
    return 'neutral';
  } else {
    return 'bad';
  }
}
