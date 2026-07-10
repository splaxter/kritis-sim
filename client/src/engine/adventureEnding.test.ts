import { describe, it, expect } from 'vitest';
import { GameState, createInitialAdventureState, determineEnding } from '@kritis/shared';
import { createInitialState } from './gameState';
import {
  calculateAdventureEnding,
  deriveEndingFlags,
  deriveStoryPath,
  getNextStoryContent,
  advanceStoryBeat,
  isAdventureModeComplete,
} from './adventureEngine';
import { getVisibleChoices } from './eventEngine';
import { allEvents } from '../content/events';
import { adventureStoryEvents } from '../content/adventure/story-events';
import { adventureSidequestEvents } from '../content/adventure/sidequest-events';
import { getAllScenarios } from '../content/packs';

function storyState(overrides: Partial<GameState> = {}): GameState {
  const base = createInitialState('TEST-SEED', 'story');
  return { ...base, storyState: createInitialAdventureState(), ...overrides };
}

const walkEvents = [...allEvents, ...adventureStoryEvents, ...adventureSidequestEvents];
const walkScenarios = getAllScenarios();

/** Walk every beat of every chapter with the given flags; return served content ids. */
function walkCampaign(flags: Record<string, boolean>): string[] {
  let state = storyState({ flags });
  const served: string[] = [];
  let guard = 0;
  while (!isAdventureModeComplete(state) && guard++ < 200) {
    const { content } = getNextStoryContent(state, walkEvents, walkScenarios);
    expect(
      content,
      `beat ${state.storyState!.currentChapter}/${state.storyState!.currentBeatIndex} must resolve`
    ).not.toBeNull();
    served.push(content!.id);
    state = { ...state, storyState: advanceStoryBeat(state) };
  }
  expect(guard).toBeLessThan(200); // no infinite loop; campaign completes
  return served;
}

describe('determineEnding thresholds', () => {
  it('good at score >= 65 without any sidequests', () => {
    expect(determineEnding(65, 0, 'official')).toBe('good');
  });
  it('neutral between 35 and 64', () => {
    expect(determineEnding(64, 0, 'neutral')).toBe('neutral');
    expect(determineEnding(35, 0, 'neutral')).toBe('neutral');
  });
  it('bad below 35', () => {
    expect(determineEnding(34, 0, 'underground')).toBe('bad');
  });
});

describe('deriveEndingFlags', () => {
  it('derives saved_early from containment flags', () => {
    const s = storyState({ flags: { isolated_systems: true } });
    expect(deriveEndingFlags(s)).toContain('saved_early');
  });
  it('derives found_evidence from dossier flags', () => {
    const s = storyState({ flags: { has_stefan_dossier: true } });
    expect(deriveEndingFlags(s)).toContain('found_evidence');
  });
  it('derives team_prepared from preparation flags', () => {
    const s = storyState({ flags: { restore_tested: true } });
    expect(deriveEndingFlags(s)).toContain('team_prepared');
  });
  it('passes canonical flags straight through from state.flags', () => {
    const s = storyState({ flags: { blamed_others: true, burned_bridges: true } });
    expect(deriveEndingFlags(s)).toEqual(expect.arrayContaining(['blamed_others', 'burned_bridges']));
  });
  it('derives trusted_by_all when >= 2 NPCs reached trust 50', () => {
    const s = storyState();
    s.storyState!.characterMemory = {
      chef: { npcId: 'chef', interactions: 5, trustLevel: 60, memorableEvents: [], currentArc: 'friend' },
      kollegen: { npcId: 'kollegen', interactions: 9, trustLevel: 80, memorableEvents: [], currentArc: 'ally' },
    };
    expect(deriveEndingFlags(s)).toContain('trusted_by_all');
  });
});

describe('deriveStoryPath', () => {
  it('official when chose_official_route', () => {
    expect(deriveStoryPath(storyState({ flags: { chose_official_route: true } }))).toBe('official');
  });
  it('underground when going_solo', () => {
    expect(deriveStoryPath(storyState({ flags: { going_solo: true } }))).toBe('underground');
  });
  it('neutral otherwise', () => {
    expect(deriveStoryPath(storyState())).toBe('neutral');
  });
});

describe('route and preparation consequences', () => {
  function contentAt(chapter: string, flags: Record<string, boolean>, beatIndex = 0) {
    const state = storyState({
      flags,
      // Keep this focused route test on the main beat. In a real run these
      // first sidequest events are marked complete when their quest is served.
      completedEvents: [
        'adv_sq_printer_1',
        'adv_sq_network_1',
        'adv_sq_coffee_1',
        'adv_sq_legacy_1',
        'adv_sq_trail_1',
        'adv_sq_contact_1',
      ],
    });
    state.storyState!.currentChapter = chapter;
    state.storyState!.currentBeatIndex = beatIndex;
    return getNextStoryContent(state, walkEvents, walkScenarios).content;
  }

  it('serves a distinct official investigation scene', () => {
    expect(contentAt('ch07_escalation', { chose_official_route: true })?.id)
      .toBe('adv_official_bsi_briefing');
  });

  it('serves a distinct underground investigation scene', () => {
    expect(contentAt('ch07_escalation', { going_solo: true })?.id)
      .toBe('adv_solo_countertrace');
  });

  it('serves a prepared crisis scene when systems were isolated', () => {
    expect(contentAt('ch09_attack', { isolated_systems: true })?.id)
      .toBe('adv_contained_ransomware');
  });

  it('serves an unprepared crisis scene without isolation', () => {
    expect(contentAt('ch09_attack', {})?.id)
      .toBe('adv_ransomware_strike_uncontained');
  });

  it('keeps the official route payoff distinct in the truth chapter', () => {
    expect(contentAt('ch11_truth', { chose_official_route: true }, 2)?.id)
      .toBe('adv_official_resolution');
  });

  it('keeps the underground route payoff distinct in the finale', () => {
    expect(contentAt('ch12_finale', { going_solo: true }, 3)?.id)
      .toBe('adv_underground_finale');
  });

  it('surfaces a Jens callback when his trust flag was earned', () => {
    const event = adventureStoryEvents.find((candidate) => candidate.id === 'adv_official_resolution')!;
    const state = storyState({ flags: { chose_official_route: true, jens_ally: true } });
    expect(getVisibleChoices(event, state).map((choice) => choice.id))
      .toContain('jens_callback');
  });
});

describe('calculateAdventureEnding (integration of derivation)', () => {
  it('hero profile => good', () => {
    const s = storyState({ flags: { isolated_systems: true, has_stefan_dossier: true, restore_tested: true } });
    s.relationships.chef = 40;
    s.relationships.kollegen = 60;
    s.storyState!.characterMemory = {
      chef: { npcId: 'chef', interactions: 5, trustLevel: 60, memorableEvents: [], currentArc: 'friend' },
      kollegen: { npcId: 'kollegen', interactions: 9, trustLevel: 80, memorableEvents: [], currentArc: 'ally' },
    };
    expect(calculateAdventureEnding(s)).toBe('good');
  });
  it('middling profile => neutral', () => {
    const s = storyState({ flags: { has_stefan_dossier: true } });
    expect(calculateAdventureEnding(s)).toBe('neutral');
  });
  it('scorched-earth profile => bad', () => {
    const s = storyState({ flags: { burned_bridges: true, blamed_others: true } });
    s.relationships.chef = -40;
    s.relationships.kollegen = -20;
    expect(calculateAdventureEnding(s)).toBe('bad');
  });
});

describe('campaign paths reach all three endings', () => {
  it('hero path: branch flags set, full chain playable, ending = good', () => {
    const served = walkCampaign({
      found_basement_server: true,
      jens_ally: true,
      chose_official_route: true,
    });
    expect(served).toContain('adv_backup_check');
    expect(served).toContain('adv_jens_helps');

    // Build the hero final profile and assert the good ending.
    const s = storyState({
      flags: { isolated_systems: true, has_stefan_dossier: true, restore_tested: true },
    });
    s.relationships.chef = 40;
    s.relationships.kollegen = 60;
    s.storyState!.characterMemory = {
      chef: { npcId: 'chef', interactions: 5, trustLevel: 60, memorableEvents: [], currentArc: 'friend' },
      kollegen: { npcId: 'kollegen', interactions: 9, trustLevel: 80, memorableEvents: [], currentArc: 'ally' },
    };
    expect(calculateAdventureEnding(s)).toBe('good');
  });

  it('alternate path: no basement server, no Bjorg trust => alternates play', () => {
    const served = walkCampaign({});
    expect(served).toContain('adv_no_backup');
    expect(served).toContain('adv_alone_in_crisis');
  });

  it('bad profile resolves to bad, neutral profile to neutral', () => {
    const bad = storyState({ flags: { burned_bridges: true, blamed_others: true } });
    bad.relationships.chef = -40;
    bad.relationships.kollegen = -20;
    expect(calculateAdventureEnding(bad)).toBe('bad');

    const neutral = storyState({ flags: { has_stefan_dossier: true } });
    expect(calculateAdventureEnding(neutral)).toBe('neutral');
  });
});
