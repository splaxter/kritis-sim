import { describe, it, expect, vi } from 'vitest';

// Isolated from adventureEngine.test.ts: this file replaces the chapter/sidequest
// content globals so we can exercise the PRODUCTION beat-resolution path in
// getNextStoryContent (adventureEngine.ts, the `checkFlagCondition` branch) with
// a composite FlagCondition. The synthetic chapter reuses the real starting
// chapter id 'ch01_first_day' so createInitialAdventureState points at it.
vi.mock('../content/adventure/chapters', () => {
  const chapter = {
    id: 'ch01_first_day',
    title: 'Test',
    act: 1 as const,
    description: '',
    sidequests: [],
    unlockConditions: {},
    completionUnlocks: [],
    storyBeats: [
      {
        id: 'beat_composite',
        eventId: 'audit_primary',
        isOptional: false,
        branchCondition: {
          all: ['finding_reported', 'evidence_hashed'],
          none: ['mailbox_scope_exceeded'],
        },
        alternateEventId: 'audit_alternate',
      },
    ],
  };
  return {
    adventureChapters: [chapter],
    TOTAL_CHAPTERS: 1,
    TOTAL_STORY_BEATS: 1,
  };
});

// No sidequests → pickSidequestToStart returns nothing, so getNextStoryContent
// reaches the story-beat path (c) instead of serving a quest.
vi.mock('../content/adventure/sidequests', () => ({
  adventureSidequests: [],
  TOTAL_SIDEQUESTS: 0,
  getSidequestById: () => undefined,
}));

import { getNextStoryContent } from './adventureEngine';
import { GameEvent, GameState, createInitialAdventureState } from '@kritis/shared';

const evt = (id: string): GameEvent => ({
  id,
  title: id,
  description: '',
  category: 'routine',
  choices: [],
} as unknown as GameEvent);

const EVENTS = [evt('audit_primary'), evt('audit_alternate')];

function stateWithFlags(flags: Record<string, boolean>): GameState {
  return {
    seed: 'branch-seed',
    runNumber: 1,
    gameMode: 'story',
    currentWeek: 1,
    currentDay: 1,
    skills: { netzwerk: 30, linux: 30, windows: 30, security: 30, troubleshooting: 30, softSkills: 30 },
    stress: 20,
    budget: 15000,
    compliance: 50,
    relationships: { chef: 10, gf: 0, kaemmerer: 5, fachabteilung: 0, kollegen: 25 },
    flags,
    activeEvents: [],
    completedEvents: [],
    completedScenarios: [],
    unlockedCommands: [],
    terminalHistory: [],
    isStoryMode: true,
    storyState: { ...createInitialAdventureState(), currentChapter: 'ch01_first_day', currentBeatIndex: 0 },
    decisions: [],
    pendingChainEvents: [],
  } as unknown as GameState;
}

describe('getNextStoryContent — composite branchCondition (production path)', () => {
  it('serves the PRIMARY event when the composite condition is met', () => {
    const result = getNextStoryContent(
      stateWithFlags({ finding_reported: true, evidence_hashed: true }),
      EVENTS,
      [],
    );
    expect(result.type).toBe('story');
    expect(result.content?.id).toBe('audit_primary');
  });

  it('serves the ALTERNATE event when a required positive flag is missing', () => {
    const result = getNextStoryContent(
      stateWithFlags({ finding_reported: true }), // evidence_hashed missing
      EVENTS,
      [],
    );
    expect(result.content?.id).toBe('audit_alternate');
  });

  it('serves the ALTERNATE event when a forbidden (none) flag is set', () => {
    const result = getNextStoryContent(
      stateWithFlags({ finding_reported: true, evidence_hashed: true, mailbox_scope_exceeded: true }),
      EVENTS,
      [],
    );
    expect(result.content?.id).toBe('audit_alternate');
  });
});
