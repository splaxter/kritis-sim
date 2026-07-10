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
  StoryPath,
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
  if (!state.storyState) return undefined;
  return getChapter(state.storyState.currentChapter);
}

export function isChapterUnlocked(
  chapter: AdventureChapter,
  state: GameState
): boolean {
  const advState = state.storyState;
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
  if (!chapter || !state.storyState) return undefined;

  return chapter.storyBeats[state.storyState.currentBeatIndex];
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
  if (!state.storyState) {
    return { content: null, type: 'chapter_complete' };
  }

  const chapter = getCurrentChapter(state);
  if (!chapter) {
    return { content: null, type: 'chapter_complete' };
  }

  const advState = state.storyState;
  const currentBeat = chapter.storyBeats[advState.currentBeatIndex];

  // (a) An active sidequest with a pending authored event serves FIRST — before
  // the story beat — so a quest the player started actually plays through. Quest
  // chains are ≤3 events, so the main story pauses at most 3 days (intended pacing).
  const activeSidequestId = advState.activeSidequests[0];
  if (activeSidequestId) {
    const sidequest = adventureSidequests.find(sq => sq.id === activeSidequestId);
    if (sidequest) {
      const progress = advState.sidequestProgress[activeSidequestId] || 0;
      if (progress < sidequest.events.length) {
        const content = findContent(sidequest.events[progress], allEvents, allScenarios);
        if (content) {
          return { content, type: 'sidequest' };
        }
      }
    }
  }

  // (b) Otherwise START the next eligible sidequest deterministically. The
  // previous 30% lottery made authored content disappear for many players;
  // one-active-quest and trigger/window checks still keep the story paced.
  const startable = pickSidequestToStart(state);
  if (startable) {
    const content = findContent(startable.events[0], allEvents, allScenarios);
    if (content) {
      return { content, type: 'sidequest' };
    }
  }

  // (c) Otherwise serve the current story beat.
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

  // (d) If no more beats, chapter is complete.
  if (!currentBeat) {
    return { content: null, type: 'chapter_complete' };
  }

  return { content: null, type: 'story' };
}

/**
 * Choose the next eligible sidequest deterministically.
 *
 * Sidequests are authored story content, so availability should not depend on
 * a luck roll. The one-active-quest guard and each quest's trigger/window
 * conditions remain the pacing controls.
 */
export function pickSidequestToStart(state: GameState): SidequestDefinition | null {
  const available = getAvailableSidequests(state).filter(
    (sidequest) => !state.completedEvents.includes(sidequest.events[0])
  );
  if (available.length === 0) return null;

  const hash = simpleHash(
    state.seed + state.currentWeek + state.currentDay + state.completedEvents.length + 'sq'
  );
  return available[hash % available.length];
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * True when the player has run out of AUTHORED story content: the current
 * chapter's next beat references an event/scenario that doesn't exist yet
 * (i.e. we've advanced into a chapter that hasn't been written). This is the
 * trigger for the act-break "Fortsetzung folgt" ending instead of letting the
 * day-loop skip to a false victory. Derived, not hardcoded — the boundary moves
 * automatically when more chapters are authored.
 */
export function isAtAuthoredStoryEnd(
  state: GameState,
  events: GameEvent[],
  scenarios: Scenario[]
): boolean {
  if (!state.storyState) return false;
  const chapter = getCurrentChapter(state);
  if (!chapter) return false; // no current chapter = past the whole campaign (real completion)
  // The whole chapter must be authored before we play ANY of it — otherwise a
  // partially-written chapter (e.g. beat 1 exists, beat 2 doesn't) would let the
  // player play a fragment and then hit the act-break mid-chapter. A chapter is
  // unauthored if any beat references content that exists on neither its primary
  // nor its alternate path. Checked on chapter entry, before serving content.
  return chapter.storyBeats.some((beat) => {
    const primary = findContent(beat.eventId, events, scenarios);
    const alt = beat.alternateEventId ? findContent(beat.alternateEventId, events, scenarios) : null;
    return !primary && !alt;
  });
}

/**
 * The act the player just COMPLETED (the act of the most recently completed
 * chapter). Used to title/select the act-break copy. At an act-break the current
 * chapter is the unauthored one we just entered, so the last completed chapter
 * is the boundary's predecessor. Falls back to 2 (the only act that can break
 * today) if there's no completed chapter yet.
 */
export function getLastCompletedAct(state: GameState): number {
  const completed = state.storyState?.completedChapters ?? [];
  const lastId = completed[completed.length - 1];
  const chapter = lastId ? getChapter(lastId) : undefined;
  return chapter?.act ?? 2;
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
  if (!state.storyState) {
    return createInitialAdventureState();
  }

  const advState = state.storyState;
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
  if (!state.storyState) {
    return createInitialAdventureState();
  }

  const advState = state.storyState;
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
  if (!state.storyState) return [];

  const advState = state.storyState;
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
    const currentIndex = adventureChapters.findIndex(ch => ch.id === state.storyState?.currentChapter);
    if (currentIndex < chapterIndex) return false;
  }

  if (triggerCondition.maxChapter) {
    const chapterIndex = adventureChapters.findIndex(ch => ch.id === triggerCondition.maxChapter);
    const currentIndex = adventureChapters.findIndex(ch => ch.id === state.storyState?.currentChapter);
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
  if (!state.storyState) {
    return createInitialAdventureState();
  }

  const advState = state.storyState;
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

/**
 * Canonical ending flags read by calculateEndingScore. Nothing in the game
 * ever WRITES storyState.endingFlags — instead we DERIVE them from played
 * content (state.flags + characterMemory) at read time, merged with anything
 * already stored (forward-compat + old saves).
 */
const ENDING_FLAG_SOURCES: Record<string, string[]> = {
  saved_early: ['saved_early', 'isolated_systems', 'used_legacy_script', 'contained_damage', 'cut_interconnect', 'attack_repelled'],
  found_evidence: ['found_evidence', 'has_stefan_dossier', 'knows_full_timeline', 'evidence_secured', 'secured_evidence', 'insider_evidence', 'evidence_complete'],
  team_prepared: ['team_prepared', 'restore_tested', 'ir_ready', 'crown_jewels_isolated', 'shift_plan', 'coordinated_defense'],
  trusted_by_all: ['trusted_by_all'],
  burned_bridges: ['burned_bridges'],
  ignored_warnings: ['ignored_warnings'],
  blamed_others: ['blamed_others'],
};

export function deriveEndingFlags(state: GameState): string[] {
  const flags = new Set<string>(state.storyState?.endingFlags ?? []);
  for (const [canonical, sources] of Object.entries(ENDING_FLAG_SOURCES)) {
    if (sources.some((f) => state.flags[f])) flags.add(canonical);
  }
  const trusted = Object.values(state.storyState?.characterMemory ?? {})
    .filter((m) => m.trustLevel >= 50).length;
  if (trusted >= 2) flags.add('trusted_by_all');
  return [...flags];
}

export function deriveStoryPath(state: GameState): StoryPath {
  if (state.flags['chose_official_route']) return 'official';
  if (state.flags['going_solo'] || state.flags['wants_solo']) return 'underground';
  return state.storyState?.storyPath ?? 'neutral';
}

export function calculateAdventureEnding(state: GameState): EndingType {
  if (!state.storyState) {
    return 'neutral';
  }

  const score = calculateEndingScore(
    { chef: state.relationships.chef, kollegen: state.relationships.kollegen },
    state.storyState.completedSidequests,
    deriveEndingFlags(state)
  );

  return determineEnding(score, state.storyState.completedSidequests.length, deriveStoryPath(state));
}

export function getEndingStats(state: GameState): {
  score: number;
  sidequestsCompleted: number;
  totalSidequests: number;
  charactersHelped: string[];
  storyPath: string;
  endingFlags: string[];
  preparationFlags: string[];
  penaltyFlags: string[];
} {
  if (!state.storyState) {
    return {
      score: 0,
      sidequestsCompleted: 0,
      totalSidequests: adventureSidequests.length,
      charactersHelped: [],
      storyPath: 'neutral',
      endingFlags: [],
      preparationFlags: [],
      penaltyFlags: [],
    };
  }

  const advState = state.storyState;

  const charactersHelped = Object.entries(advState.characterMemory)
    .filter(([_, memory]) => memory.trustLevel >= 50)
    .map(([npcId]) => npcId);

  const endingFlags = deriveEndingFlags(state);
  const preparationFlags = ['saved_early', 'found_evidence', 'team_prepared', 'trusted_by_all']
    .filter((flag) => endingFlags.includes(flag));
  const penaltyFlags = ['burned_bridges', 'ignored_warnings', 'blamed_others']
    .filter((flag) => endingFlags.includes(flag));

  const score = calculateEndingScore(
    { chef: state.relationships.chef, kollegen: state.relationships.kollegen },
    advState.completedSidequests,
    endingFlags
  );

  return {
    score,
    sidequestsCompleted: advState.completedSidequests.length,
    totalSidequests: adventureSidequests.length,
    charactersHelped,
    storyPath: deriveStoryPath(state),
    endingFlags,
    preparationFlags,
    penaltyFlags,
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
  if (!state.storyState) return false;

  const completedSidequests = state.storyState.completedSidequests;

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
  if (!state.storyState) return [];

  const unlockedOptions: string[] = [];
  const completedSidequests = state.storyState.completedSidequests;

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
  if (!state.storyState) return [];

  const abilities: string[] = [];
  const completedSidequests = state.storyState.completedSidequests;

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
 * Get sidequest rewards to apply when completing a sidequest
 */
export function getSidequestRewards(sidequestId: string): {
  flags: string[];
  skills: Partial<import('@kritis/shared').Skills>;
  relationships: Partial<import('@kritis/shared').Relationships>;
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

// ============================================
// STORY STATE HELPERS
// ============================================

export function isAdventureModeComplete(state: GameState): boolean {
  if (!state.storyState) return false;

  const advState = state.storyState;
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
  if (!state.storyState) {
    return {
      currentAct: 1,
      currentChapter: 'ch01_first_day',
      chaptersCompleted: 0,
      totalChapters: adventureChapters.length,
      percentComplete: 0,
    };
  }

  const advState = state.storyState;
  const currentChapter = getCurrentChapter(state);

  return {
    currentAct: currentChapter?.act || 1,
    currentChapter: advState.currentChapter,
    chaptersCompleted: advState.completedChapters.length,
    totalChapters: adventureChapters.length,
    percentComplete: Math.round((advState.completedChapters.length / adventureChapters.length) * 100),
  };
}
