/**
 * Probation ("Die Probezeit") ending policy — score-band based (good/neutral/bad
 * from chef/kollegen relationships, sidequest count and canonical ending flags).
 *
 * Lives here (content, shared-only deps) rather than in the engine so BOTH the
 * engine (getEndingStats) and the probation campaign (deriveEnding) can import it
 * without an import cycle — content/adventure/* imports neither the engine nor
 * the campaign registry. AUDIT TRAIL has its own domain-based derivation.
 */
import { GameState, StoryPath, EndingType, calculateEndingScore, determineEnding } from '@kritis/shared';

/** Maps many raw story flags onto the canonical ending flags the score uses. */
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

/** Probation's ending derivation — the strategy CampaignDefinition.deriveEnding
 *  points at for the probation campaign. */
export function deriveProbationEnding(state: GameState): EndingType {
  if (!state.storyState) return 'neutral';
  const score = calculateEndingScore(
    { chef: state.relationships.chef, kollegen: state.relationships.kollegen },
    state.storyState.completedSidequests,
    deriveEndingFlags(state),
  );
  return determineEnding(score, state.storyState.completedSidequests.length, deriveStoryPath(state));
}
