/**
 * Run summary — a factual "Bilanz" of a finished run, derived purely from the
 * final GameState. Used by the free-play/KRITIS end screen and (for its theme
 * tally) the story ending. No randomness, no I/O: same state → same summary.
 */
import {
  GameState,
  GameModeId,
  Skills,
  Relationships,
  getGameModeConfig,
} from '@kritis/shared';

type RelationshipKey = keyof Relationships;

export type RunOutcome = 'victory' | 'burnout' | 'fired' | 'bsi_bussgeld' | 'ended';

export interface StatDelta<K extends string> {
  key: K;
  start: number;
  end: number;
  delta: number;
}

export interface RunSummary {
  mode: GameModeId;
  outcome: RunOutcome;
  weekReached: number;
  totalWeeks: number;
  survived: boolean;
  decisionsMade: number;
  finalStats: { stress: number; budget: number; compliance: number };
  skillDeltas: StatDelta<keyof Skills>[];
  relationshipDeltas: StatDelta<RelationshipKey>[];
  /** Chain consequences scheduled by past choices that never came due. */
  openConsequences: number;
  /** The most frequent meaningful decision tags, biggest first (max 4). */
  topThemes: { tag: string; count: number }[];
}

const SKILL_KEYS: (keyof Skills)[] = [
  'netzwerk', 'linux', 'windows', 'security', 'troubleshooting', 'softSkills',
];
const RELATIONSHIP_KEYS: RelationshipKey[] = [
  'chef', 'kollegen', 'kaemmerer', 'fachabteilung', 'gf',
];

// Tags that describe the game's plumbing rather than the situation a player faced.
const GENERIC_TAGS = new Set(['story', 'sidequest', 'chapter', 'act1', 'act2', 'act3', 'tutorial']);

function reasonToOutcome(reason?: string | null): RunOutcome {
  if (reason === 'probezeit_complete') return 'victory';
  if (reason === 'burnout' || reason === 'fired' || reason === 'bsi_bussgeld') return reason;
  return 'ended';
}

export function buildRunSummary(state: GameState, gameOverReason?: string | null): RunSummary {
  const config = getGameModeConfig(state.gameMode);
  const totalWeeks = config.gameLength.totalWeeks;
  const outcome = reasonToOutcome(gameOverReason);
  const survived = outcome === 'victory';

  // On victory currentWeek has ticked past the last week; clamp for display.
  const weekReached = Math.min(state.currentWeek, totalWeeks);

  const startSkill = config.startingStats.skills;
  const skillDeltas: StatDelta<keyof Skills>[] = SKILL_KEYS.map((key) => ({
    key,
    start: startSkill,
    end: state.skills[key],
    delta: state.skills[key] - startSkill,
  }));

  const startRel: Record<RelationshipKey, number> = {
    chef: config.startingRelationships.chef,
    kaemmerer: config.startingRelationships.kaemmerer,
    kollegen: config.startingRelationships.kollegen,
    fachabteilung: 0,
    gf: 0,
  };
  const relationshipDeltas: StatDelta<RelationshipKey>[] = RELATIONSHIP_KEYS.map((key) => ({
    key,
    start: startRel[key],
    end: state.relationships[key],
    delta: state.relationships[key] - startRel[key],
  }));

  // Tally decision tags, drop plumbing tags, keep the top 4.
  const tagCounts = new Map<string, number>();
  for (const d of state.decisions) {
    for (const tag of d.tags ?? []) {
      if (GENERIC_TAGS.has(tag)) continue;
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  const topThemes = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 4)
    .map(([tag, count]) => ({ tag, count }));

  return {
    mode: state.gameMode,
    outcome,
    weekReached,
    totalWeeks,
    survived,
    decisionsMade: state.decisions.length,
    finalStats: {
      stress: state.stress,
      budget: state.budget,
      compliance: state.compliance,
    },
    skillDeltas,
    relationshipDeltas,
    openConsequences: state.pendingChainEvents.length,
    topThemes,
  };
}
