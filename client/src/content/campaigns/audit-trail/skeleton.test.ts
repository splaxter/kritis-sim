import { describe, it, expect } from 'vitest';
import { GameState, createInitialAdventureState } from '@kritis/shared';
import {
  isAtAuthoredStoryEnd,
  getLastCompletedAct,
  advanceStoryBeat,
  isAdventureModeComplete,
} from '../../../engine/adventureEngine';
import { getCampaign } from '../index';
import { auditTrailChapters } from './chapters';
import { auditTrailStoryEvents } from './events';
import { AUDIT_DOMAINS } from './domains';

const chapterById = (id: string) => auditTrailChapters.find(c => c.id === id)!;

/** Minimal story-mode GameState for the audit-trail campaign at a given chapter. */
function stateAt(currentChapter: string, completedChapters: string[] = []): GameState {
  return {
    seed: 'at-skeleton',
    runNumber: 1,
    gameMode: 'story',
    currentWeek: 1,
    currentDay: 1,
    skills: { netzwerk: 30, linux: 30, windows: 30, security: 30, troubleshooting: 30, softSkills: 30 },
    stress: 20,
    budget: 15000,
    compliance: 50,
    relationships: { chef: 10, gf: 0, kaemmerer: 5, fachabteilung: 0, kollegen: 25 },
    flags: {},
    activeEvents: [],
    completedEvents: [],
    completedScenarios: [],
    unlockedCommands: [],
    terminalHistory: [],
    isStoryMode: true,
    storyState: {
      ...createInitialAdventureState({ id: 'audit-trail', startChapterId: 'at_ch01_onboarding' }),
      currentChapter,
      completedChapters,
    },
    decisions: [],
    pendingChainEvents: [],
  } as unknown as GameState;
}

describe('AUDIT TRAIL chapter grid (6 chapters, 1/2/1/2 across acts 1–4)', () => {
  it('has 6 chapters distributed 1/2/1/2 across acts 1..4', () => {
    expect(auditTrailChapters.map(c => c.id)).toEqual([
      'at_ch01_onboarding', 'at_ch02_trail', 'at_ch03_evidence',
      'at_ch04_blockade', 'at_ch05_audit_1', 'at_ch06_audit_2',
    ]);
    expect(auditTrailChapters.map(c => c.act)).toEqual([1, 2, 2, 3, 4, 4]);
    // Distribution per act = 1,2,1,2 (Acts 2 and 4 carry two chapters).
    const perAct = [1, 2, 3, 4].map(a => auditTrailChapters.filter(c => c.act === a).length);
    expect(perAct).toEqual([1, 2, 1, 2]);
  });

  it('the completionUnlocks chain the chapters in order', () => {
    expect(chapterById('at_ch01_onboarding').completionUnlocks).toEqual(['at_ch02_trail']);
    expect(chapterById('at_ch02_trail').completionUnlocks).toEqual(['at_ch03_evidence']);
    expect(chapterById('at_ch05_audit_1').completionUnlocks).toEqual(['at_ch06_audit_2']);
    expect(chapterById('at_ch06_audit_2').completionUnlocks).toEqual([]);
  });
});

describe('Act-4 beats branch on the domain objects', () => {
  const beat = (id: string) =>
    auditTrailChapters.flatMap(c => c.storyBeats).find(b => b.id === id)!;

  it('each audit-question beat uses the EXACT AUDIT_DOMAINS condition object', () => {
    // Reference identity: branching and ending derivation read the same object,
    // so they can never diverge.
    expect(beat('at_b0501').branchCondition).toBe(AUDIT_DOMAINS.D1.condition);
    expect(beat('at_b0502').branchCondition).toBe(AUDIT_DOMAINS.D2.condition);
    expect(beat('at_b0503').branchCondition).toBe(AUDIT_DOMAINS.D3.condition);
    expect(beat('at_b0601').branchCondition).toBe(AUDIT_DOMAINS.D4.condition);
    expect(beat('at_b0602').branchCondition).toBe(AUDIT_DOMAINS.D5.condition);
  });

  it('each audit-question beat has a confrontation alternate', () => {
    for (const id of ['at_b0501', 'at_b0502', 'at_b0503', 'at_b0601', 'at_b0602']) {
      expect(beat(id).alternateEventId).toMatch(/_fail$/);
    }
  });
});

describe('campaign fully authored end-to-end (no act-break seam)', () => {
  it('every chapter (Acts 1–4) is fully authored — never raises the act-break', () => {
    for (const ch of auditTrailChapters) {
      expect(
        isAtAuthoredStoryEnd(stateAt(ch.id), auditTrailStoryEvents, []),
        `${ch.id} must be fully authored`
      ).toBe(false);
    }
  });

  it('completing the last chapter lands past the campaign (real completion, not a seam)', () => {
    // Drive the REAL final progression instead of hand-crafting a post-state:
    // the player answers the last beat of at_ch06_audit_2 and (as in
    // applyStoryProgression) advanceStoryBeat runs. With completionUnlocks: []
    // the engine keeps currentChapter on the final id and records it as
    // completed — that, not currentChapter: '', is the runtime shape the
    // ending path must resolve from.
    const finalChapter = chapterById('at_ch06_audit_2');
    const atLastBeat = stateAt('at_ch06_audit_2', [
      'at_ch01_onboarding', 'at_ch02_trail', 'at_ch03_evidence',
      'at_ch04_blockade', 'at_ch05_audit_1',
    ]);
    atLastBeat.storyState!.currentBeatIndex = finalChapter.storyBeats.length - 1;

    const advanced = advanceStoryBeat(atLastBeat);
    expect(advanced.completedChapters).toContain('at_ch06_audit_2');
    expect(advanced.currentChapter).toBe('at_ch06_audit_2');

    const pastEnd: GameState = { ...atLastBeat, storyState: advanced };
    // App.tsx checks isAdventureModeComplete BEFORE the act-break check; it must
    // be true here (otherwise beat 0 of the final chapter would re-serve), and
    // the fully authored final chapter must never read as an act-break seam.
    expect(isAdventureModeComplete(pastEnd)).toBe(true);
    expect(isAtAuthoredStoryEnd(pastEnd, auditTrailStoryEvents, [])).toBe(false);
    // The last completed act is Act 4.
    expect(getLastCompletedAct(pastEnd)).toBe(4);

    // The completed run resolves through the campaign's own ending pipeline.
    const campaign = getCampaign('audit-trail');
    const ending = campaign.deriveEnding(pastEnd);
    expect(Object.keys(campaign.endingTexts)).toContain(ending);
    expect(campaign.buildEpilogue!(pastEnd).trim().length).toBeGreaterThan(0);
  });
});
