import { describe, it, expect } from 'vitest';
import { GameState, createInitialAdventureState, determineEnding } from '@kritis/shared';
import { createInitialState } from './gameState';
import {
  calculateAdventureEnding,
  deriveEndingFlags,
  deriveStoryPath,
} from './adventureEngine';

function storyState(overrides: Partial<GameState> = {}): GameState {
  const base = createInitialState('TEST-SEED', 'story');
  return { ...base, storyState: createInitialAdventureState(), ...overrides };
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
