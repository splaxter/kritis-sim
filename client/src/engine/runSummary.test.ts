import { describe, it, expect } from 'vitest';
import { buildRunSummary } from './runSummary';
import { createInitialState } from './gameState';
import { GameState, getGameModeConfig } from '@kritis/shared';

function decision(overrides: Partial<GameState['decisions'][number]> = {}) {
  return { eventId: 'e', choiceIndex: 0, choiceId: 'c', week: 1, day: 1, tags: [], ...overrides };
}

describe('buildRunSummary', () => {
  it('maps game-over reasons to outcomes and survival', () => {
    const base = createInitialState('SEED', 'intermediate');
    expect(buildRunSummary(base, 'probezeit_complete').outcome).toBe('victory');
    expect(buildRunSummary(base, 'probezeit_complete').survived).toBe(true);
    expect(buildRunSummary(base, 'burnout').outcome).toBe('burnout');
    expect(buildRunSummary(base, 'burnout').survived).toBe(false);
    expect(buildRunSummary(base, null).outcome).toBe('ended');
    expect(buildRunSummary(base, undefined).outcome).toBe('ended');
  });

  it('computes skill/relationship deltas against the mode starting values', () => {
    const mode = 'intermediate';
    const start = getGameModeConfig(mode).startingStats.skills;
    const state: GameState = {
      ...createInitialState('SEED', mode),
      skills: { netzwerk: start + 12, linux: start, windows: start, security: start - 3, troubleshooting: start, softSkills: start },
    };
    const summary = buildRunSummary(state, 'probezeit_complete');
    const netz = summary.skillDeltas.find((d) => d.key === 'netzwerk')!;
    const sec = summary.skillDeltas.find((d) => d.key === 'security')!;
    const linux = summary.skillDeltas.find((d) => d.key === 'linux')!;
    expect(netz.delta).toBe(12);
    expect(netz.end).toBe(start + 12);
    expect(sec.delta).toBe(-3);
    expect(linux.delta).toBe(0);
  });

  it('clamps weekReached to totalWeeks and reports the mode length', () => {
    const mode = 'kritis';
    const total = getGameModeConfig(mode).gameLength.totalWeeks;
    const state: GameState = { ...createInitialState('SEED', mode), currentWeek: total + 1 };
    const summary = buildRunSummary(state, 'probezeit_complete');
    expect(summary.totalWeeks).toBe(total);
    expect(summary.weekReached).toBe(total);
  });

  it('tallies the top decision themes, dropping plumbing tags', () => {
    const state: GameState = {
      ...createInitialState('SEED', 'intermediate'),
      decisions: [
        decision({ tags: ['security', 'story'] }),
        decision({ tags: ['security'] }),
        decision({ tags: ['crisis', 'sidequest'] }),
        decision({ tags: ['story'] }), // only plumbing → contributes nothing
      ],
    };
    const summary = buildRunSummary(state, 'burnout');
    expect(summary.decisionsMade).toBe(4);
    expect(summary.topThemes[0]).toEqual({ tag: 'security', count: 2 });
    expect(summary.topThemes.map((t) => t.tag)).not.toContain('story');
    expect(summary.topThemes.map((t) => t.tag)).not.toContain('sidequest');
  });

  it('counts open (never-fired) chain consequences', () => {
    const state: GameState = {
      ...createInitialState('SEED', 'intermediate'),
      pendingChainEvents: [
        { eventId: 'x', availableWeek: 9, sourceEventId: 's', sourceChoiceId: 'c', triggeredAt: { week: 3, day: 1 } },
      ],
    };
    expect(buildRunSummary(state, 'burnout').openConsequences).toBe(1);
  });
});
