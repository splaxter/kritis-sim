/**
 * Adventure Engine
 * Manages story progression, sidequests, and narrative state
 */

import {
  GameState,
  AdventureState,
  AdventureChapter,
  StoryBeat,
  SidequestDefinition,
  CharacterMemory,
  createInitialAdventureState,
  EndingType,
  calculateEndingScore,
  determineEnding,
} from '@kritis/shared';
import { GameEvent } from '@kritis/shared';
import { Scenario } from '@kritis/shared';
import { adventureChapters } from '../content/adventure/chapters';
import { adventureSidequests } from '../content/adventure/sidequests';

// ============================================
// CHAPTER MANAGEMENT
// ============================================

export function getChapter(chapterId: string): AdventureChapter | undefined {
  return adventureChapters.find(ch => ch.id === chapterId);
}

export function getCurrentChapter(state: GameState): AdventureChapter | undefined {
  if (!state.adventureState) return undefined;
  return getChapter(state.adventureState.currentChapter);
}

export function isChapterUnlocked(
  chapter: AdventureChapter,
  state: GameState
): boolean {
  const advState = state.adventureState;
  if (!advState) return false;

  const { unlockConditions } = chapter;

  // Check previous chapter requirement
  if (unlockConditions.previousChapter) {
    if (!advState.completedChapters.includes(unlockConditions.previousChapter)) {
      return false;
    }
  }

  // Check required flags
  if (unlockConditions.requiredFlags) {
    for (const flag of unlockConditions.requiredFlags) {
      if (!state.flags[flag]) return false;
    }
  }

  // Check minimum week
  if (unlockConditions.minimumWeek) {
    if (state.currentWeek < unlockConditions.minimumWeek) return false;
  }

  return true;
}

// ============================================
// STORY BEAT SELECTION
// ============================================

export function getCurrentStoryBeat(state: GameState): StoryBeat | undefined {
  const chapter = getCurrentChapter(state);
  if (!chapter || !state.adventureState) return undefined;

  return chapter.storyBeats[state.adventureState.currentBeatIndex];
}

export function shouldPlayBeat(beat: StoryBeat, state: GameState): boolean {
  // If beat has a branch condition, check if it's met
  if (beat.branchCondition) {
    return !!state.flags[beat.branchCondition];
  }
  return true;
}

export function getNextStoryContent(
  state: GameState,
  allEvents: GameEvent[],
  allScenarios: Scenario[]
): { content: GameEvent | Scenario | null; type: 'story' | 'sidequest' | 'chapter_complete' } {
  if (!state.adventureState) {
    return { content: null, type: 'chapter_complete' };
  }

  const chapter = getCurrentChapter(state);
  if (!chapter) {
    return { content: null, type: 'chapter_complete' };
  }

  const advState = state.adventureState;
  const currentBeat = chapter.storyBeats[advState.currentBeatIndex];

  // Check if we have a pending story beat
  if (currentBeat) {
    // Determine which event to use based on branch condition
    let eventId = currentBeat.eventId;
    if (currentBeat.branchCondition && !state.flags[currentBeat.branchCondition]) {
      eventId = currentBeat.alternateEventId || currentBeat.eventId;
    }

    const content = findContent(eventId, allEvents, allScenarios);
    if (content) {
      return { content, type: 'story' };
    }
  }

  // Check for available sidequests (30% chance to insert between story beats)
  const availableSidequests = getAvailableSidequests(state);
  if (availableSidequests.length > 0) {
    // Check if there's an active sidequest in progress
    const activeSidequest = advState.activeSidequests[0];
    if (activeSidequest) {
      const sidequest = adventureSidequests.find(sq => sq.id === activeSidequest);
      if (sidequest) {
        const progress = advState.sidequestProgress[activeSidequest] || 0;
        if (progress < sidequest.events.length) {
          const content = findContent(sidequest.events[progress], allEvents, allScenarios);
          if (content) {
            return { content, type: 'sidequest' };
          }
        }
      }
    }

    // Maybe start a new sidequest (30% chance)
    if (Math.random() < 0.3) {
      const randomSidequest = availableSidequests[Math.floor(Math.random() * availableSidequests.length)];
      const content = findContent(randomSidequest.events[0], allEvents, allScenarios);
      if (content) {
        return { content, type: 'sidequest' };
      }
    }
  }

  // If no more beats, chapter is complete
  if (!currentBeat) {
    return { content: null, type: 'chapter_complete' };
  }

  return { content: null, type: 'story' };
}

function findContent(
  id: string,
  events: GameEvent[],
  scenarios: Scenario[]
): GameEvent | Scenario | null {
  // Try events first
  const event = events.find(e => e.id === id);
  if (event) return event;

  // Try scenarios
  const scenario = scenarios.find(s => s.id === id);
  if (scenario) return scenario;

  return null;
}

// ============================================
// STORY PROGRESSION
// ============================================

export function advanceStoryBeat(state: GameState): AdventureState {
  if (!state.adventureState) {
    return createInitialAdventureState();
  }

  const advState = state.adventureState;
  const chapter = getCurrentChapter(state);

  if (!chapter) {
    return advState;
  }

  const nextIndex = advState.currentBeatIndex + 1;

  // Check if chapter is complete
  if (nextIndex >= chapter.storyBeats.length) {
    // Find next chapter
    const nextChapterId = chapter.completionUnlocks[0];
    const nextChapter = nextChapterId ? getChapter(nextChapterId) : undefined;

    return {
      ...advState,
      completedChapters: [...advState.completedChapters, advState.currentChapter],
      currentChapter: nextChapter?.id || advState.currentChapter,
      currentBeatIndex: 0,
      totalBeatsCompleted: advState.totalBeatsCompleted + 1,
    };
  }

  return {
    ...advState,
    currentBeatIndex: nextIndex,
    totalBeatsCompleted: advState.totalBeatsCompleted + 1,
  };
}

export function advanceSidequest(state: GameState, sidequestId: string): AdventureState {
  if (!state.adventureState) {
    return createInitialAdventureState();
  }

  const advState = state.adventureState;
  const sidequest = adventureSidequests.find(sq => sq.id === sidequestId);

  if (!sidequest) return advState;

  const currentProgress = advState.sidequestProgress[sidequestId] || 0;
  const nextProgress = currentProgress + 1;

  // Check if sidequest is complete
  if (nextProgress >= sidequest.events.length) {
    return {
      ...advState,
      activeSidequests: advState.activeSidequests.filter(id => id !== sidequestId),
      completedSidequests: [...advState.completedSidequests, sidequestId],
      sidequestProgress: {
        ...advState.sidequestProgress,
        [sidequestId]: nextProgress,
      },
    };
  }

  return {
    ...advState,
    activeSidequests: advState.activeSidequests.includes(sidequestId)
      ? advState.activeSidequests
      : [...advState.activeSidequests, sidequestId],
    sidequestProgress: {
      ...advState.sidequestProgress,
      [sidequestId]: nextProgress,
    },
  };
}

// ============================================
// SIDEQUEST MANAGEMENT
// ============================================

export function getAvailableSidequests(state: GameState): SidequestDefinition[] {
  if (!state.adventureState) return [];

  const advState = state.adventureState;
  const chapter = getCurrentChapter(state);

  if (!chapter) return [];

  return adventureSidequests.filter(sq => {
    // Not already completed
    if (advState.completedSidequests.includes(sq.id)) return false;

    // Not already active
    if (advState.activeSidequests.includes(sq.id)) return false;

    // Check trigger conditions
    return checkSidequestTrigger(sq, state);
  });
}

export function checkSidequestTrigger(
  sidequest: SidequestDefinition,
  state: GameState
): boolean {
  const { triggerCondition } = sidequest;

  // Check required flags
  if (triggerCondition.flags) {
    for (const flag of triggerCondition.flags) {
      if (!state.flags[flag]) return false;
    }
  }

  // Check relationship requirements
  if (triggerCondition.relationships) {
    for (const req of triggerCondition.relationships) {
      const relationshipValue = state.relationships[req.npc];
      if (relationshipValue < req.minLevel) return false;
    }
  }

  // Check skill requirements
  if (triggerCondition.skills) {
    for (const req of triggerCondition.skills) {
      const skillValue = state.skills[req.skill];
      if (skillValue < req.minValue) return false;
    }
  }

  // Check chapter bounds
  if (triggerCondition.minChapter) {
    const chapterIndex = adventureChapters.findIndex(ch => ch.id === triggerCondition.minChapter);
    const currentIndex = adventureChapters.findIndex(ch => ch.id === state.adventureState?.currentChapter);
    if (currentIndex < chapterIndex) return false;
  }

  if (triggerCondition.maxChapter) {
    const chapterIndex = adventureChapters.findIndex(ch => ch.id === triggerCondition.maxChapter);
    const currentIndex = adventureChapters.findIndex(ch => ch.id === state.adventureState?.currentChapter);
    if (currentIndex > chapterIndex) return false;
  }

  return true;
}

// ============================================
// CHARACTER MEMORY
// ============================================

export function updateCharacterMemory(
  state: GameState,
  npcId: string,
  eventId: string,
  trustChange: number
): AdventureState {
  if (!state.adventureState) {
    return createInitialAdventureState();
  }

  const advState = state.adventureState;
  const existingMemory = advState.characterMemory[npcId] || {
    npcId,
    interactions: 0,
    trustLevel: 0,
    memorableEvents: [],
    currentArc: 'stranger',
  };

  const newTrustLevel = Math.max(-100, Math.min(100, existingMemory.trustLevel + trustChange));

  // Determine arc stage based on trust level
  let newArc = existingMemory.currentArc;
  if (newTrustLevel >= 80) newArc = 'ally';
  else if (newTrustLevel >= 50) newArc = 'friend';
  else if (newTrustLevel >= 20) newArc = 'colleague';
  else if (newTrustLevel <= -30) newArc = 'adversary';
  else newArc = 'stranger';

  const updatedMemory: CharacterMemory = {
    ...existingMemory,
    interactions: existingMemory.interactions + 1,
    trustLevel: newTrustLevel,
    memorableEvents: Math.abs(trustChange) >= 10
      ? [...existingMemory.memorableEvents, eventId]
      : existingMemory.memorableEvents,
    currentArc: newArc,
  };

  return {
    ...advState,
    characterMemory: {
      ...advState.characterMemory,
      [npcId]: updatedMemory,
    },
  };
}

// ============================================
// ENDING CALCULATION
// ============================================

export function calculateAdventureEnding(state: GameState): EndingType {
  if (!state.adventureState) {
    return 'neutral';
  }

  const advState = state.adventureState;

  const score = calculateEndingScore(
    { chef: state.relationships.chef, kollegen: state.relationships.kollegen },
    advState.completedSidequests,
    advState.endingFlags
  );

  return determineEnding(score, advState.completedSidequests.length, advState.storyPath);
}

export function getEndingStats(state: GameState): {
  score: number;
  sidequestsCompleted: number;
  totalSidequests: number;
  charactersHelped: string[];
  storyPath: string;
} {
  if (!state.adventureState) {
    return {
      score: 0,
      sidequestsCompleted: 0,
      totalSidequests: adventureSidequests.length,
      charactersHelped: [],
      storyPath: 'neutral',
    };
  }

  const advState = state.adventureState;

  const charactersHelped = Object.entries(advState.characterMemory)
    .filter(([_, memory]) => memory.trustLevel >= 50)
    .map(([npcId]) => npcId);

  const score = calculateEndingScore(
    { chef: state.relationships.chef, kollegen: state.relationships.kollegen },
    advState.completedSidequests,
    advState.endingFlags
  );

  return {
    score,
    sidequestsCompleted: advState.completedSidequests.length,
    totalSidequests: adventureSidequests.length,
    charactersHelped,
    storyPath: advState.storyPath,
  };
}

// ============================================
// SIDEQUEST EFFECTS
// ============================================

/**
 * Check if a specific dialogue option is unlocked by completed sidequests
 */
export function isDialogueUnlocked(
  state: GameState,
  eventId: string,
  optionId: string
): boolean {
  if (!state.adventureState) return false;

  const completedSidequests = state.adventureState.completedSidequests;

  for (const sqId of completedSidequests) {
    const sidequest = adventureSidequests.find(sq => sq.id === sqId);
    if (!sidequest?.storyEffects?.unlocksDialogue) continue;

    for (const unlock of sidequest.storyEffects.unlocksDialogue) {
      if (unlock.eventId === eventId && unlock.optionId === optionId) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Get all dialogue options unlocked for a specific event
 */
export function getUnlockedDialogueOptions(
  state: GameState,
  eventId: string
): string[] {
  if (!state.adventureState) return [];

  const unlockedOptions: string[] = [];
  const completedSidequests = state.adventureState.completedSidequests;

  for (const sqId of completedSidequests) {
    const sidequest = adventureSidequests.find(sq => sq.id === sqId);
    if (!sidequest?.storyEffects?.unlocksDialogue) continue;

    for (const unlock of sidequest.storyEffects.unlocksDialogue) {
      if (unlock.eventId === eventId) {
        unlockedOptions.push(unlock.optionId);
      }
    }
  }

  return unlockedOptions;
}

/**
 * Get all abilities granted by completed sidequests
 */
export function getUnlockedAbilities(state: GameState): string[] {
  if (!state.adventureState) return [];

  const abilities: string[] = [];
  const completedSidequests = state.adventureState.completedSidequests;

  for (const sqId of completedSidequests) {
    const sidequest = adventureSidequests.find(sq => sq.id === sqId);
    if (sidequest?.storyEffects?.grantsAbility) {
      abilities.push(sidequest.storyEffects.grantsAbility);
    }
  }

  return abilities;
}

/**
 * Check if player has a specific ability from sidequests
 */
export function hasAbility(state: GameState, ability: string): boolean {
  return getUnlockedAbilities(state).includes(ability);
}

/**
 * Get NPC behavior state based on completed sidequests
 */
export function getNpcBehaviorState(state: GameState, npcId: string): string | null {
  if (!state.adventureState) return null;

  const completedSidequests = state.adventureState.completedSidequests;

  // Check sidequests in reverse order (latest completed takes priority)
  for (let i = completedSidequests.length - 1; i >= 0; i--) {
    const sqId = completedSidequests[i];
    const sidequest = adventureSidequests.find(sq => sq.id === sqId);
    if (!sidequest?.storyEffects?.changesNpcBehavior) continue;

    for (const change of sidequest.storyEffects.changesNpcBehavior) {
      if (change.npcId === npcId) {
        return change.newState;
      }
    }
  }

  return null;
}

/**
 * Get sidequest rewards to apply when completing a sidequest
 */
export function getSidequestRewards(sidequestId: string): {
  flags: string[];
  skills: Partial<import('@kritis/shared').Skills>;
  relationships: Record<string, number>;
  stressReduction: number;
  budgetBonus: number;
} | null {
  const sidequest = adventureSidequests.find(sq => sq.id === sidequestId);
  if (!sidequest) return null;

  return {
    flags: sidequest.rewards.flags || [],
    skills: sidequest.rewards.skills || {},
    relationships: sidequest.rewards.relationships || {},
    stressReduction: sidequest.rewards.stressReduction || 0,
    budgetBonus: sidequest.rewards.budgetBonus || 0,
  };
}

/**
 * Find which sidequest an event belongs to (if any)
 */
export function findSidequestByEvent(eventId: string): SidequestDefinition | null {
  for (const sidequest of adventureSidequests) {
    if (sidequest.events.includes(eventId)) {
      return sidequest;
    }
  }
  return null;
}

/**
 * Check if an event is a sidequest event
 */
export function isSidequestEvent(eventId: string): boolean {
  return findSidequestByEvent(eventId) !== null;
}

/**
 * Get dynamic story beats added by completed sidequests
 */
export function getAddedStoryBeats(
  state: GameState,
  chapterId: string
): StoryBeat[] {
  if (!state.adventureState) return [];

  const addedBeats: StoryBeat[] = [];
  const completedSidequests = state.adventureState.completedSidequests;

  for (const sqId of completedSidequests) {
    const sidequest = adventureSidequests.find(sq => sq.id === sqId);
    if (!sidequest?.storyEffects?.addsStoryBeat) continue;

    for (const addition of sidequest.storyEffects.addsStoryBeat) {
      if (addition.chapterId === chapterId) {
        addedBeats.push(addition.beat);
      }
    }
  }

  return addedBeats;
}

// ============================================
// STORY STATE HELPERS
// ============================================

export function isAdventureModeComplete(state: GameState): boolean {
  if (!state.adventureState) return false;

  const advState = state.adventureState;
  const finalChapter = adventureChapters[adventureChapters.length - 1];

  return advState.completedChapters.includes(finalChapter.id);
}

export function getStoryProgress(state: GameState): {
  currentAct: number;
  currentChapter: string;
  chaptersCompleted: number;
  totalChapters: number;
  percentComplete: number;
} {
  if (!state.adventureState) {
    return {
      currentAct: 1,
      currentChapter: 'ch01_first_day',
      chaptersCompleted: 0,
      totalChapters: adventureChapters.length,
      percentComplete: 0,
    };
  }

  const advState = state.adventureState;
  const currentChapter = getCurrentChapter(state);

  return {
    currentAct: currentChapter?.act || 1,
    currentChapter: advState.currentChapter,
    chaptersCompleted: advState.completedChapters.length,
    totalChapters: adventureChapters.length,
    percentComplete: Math.round((advState.completedChapters.length / adventureChapters.length) * 100),
  };
}
