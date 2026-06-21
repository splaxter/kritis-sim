import { GameState, getGameModeConfig } from '@kritis/shared';

/**
 * Semantic colour bands for the stat bars and the pre-defeat warning banner.
 *
 * Bands are derived from the mode's *actual* game-over thresholds
 * (`config.thresholds`, see `checkGameOver` in engine/gameState.ts) rather than
 * hardcoded numbers — so a mode that moves a threshold (learning stress 120,
 * hard compliance 10) moves its colours with it for free.
 */
export type Band = 'good' | 'ok' | 'warning' | 'danger';

export const BAND_CLASS: Record<Band, string> = {
  good: 'text-terminal-success',
  ok: 'text-terminal-green',
  warning: 'text-terminal-warning',
  danger: 'text-terminal-danger',
};

/** Stress: higher = worse. `go` = stressGameOver. */
export function stressBand(stress: number, go: number): Band {
  if (stress >= go - 10) return 'danger';
  if (stress >= go * 0.55) return 'warning';
  return 'ok';
}

/** Compliance: higher = better. `go` = complianceGameOver. */
export function complianceBand(compliance: number, go: number): Band {
  if (compliance <= go + 10) return 'danger';
  if (compliance <= go + 25) return 'warning';
  return 'ok';
}

/** Chef relationship: a lose condition. `go` = chefRelationshipGameOver (-100). */
export function chefBand(value: number, go: number): Band {
  if (value <= go + 20) return 'danger'; // <= -80
  if (value <= go + 60) return 'warning'; // <= -40
  if (value > 30) return 'good';
  return 'ok';
}

/** Non-chef relationships: no lose condition, but surface negativity earlier. */
export function relationshipBand(value: number): Band {
  if (value <= -50) return 'danger';
  if (value <= -10) return 'warning';
  if (value > 30) return 'good';
  return 'ok';
}

/** Skills can't end the run — calm 3-tier, no red. */
export function skillTierClass(value: number): string {
  if (value >= 70) return 'text-terminal-success';
  if (value >= 30) return 'text-terminal-green';
  return 'text-terminal-green-muted';
}

export function budgetClass(budget: number): string {
  if (budget < 0) return 'text-terminal-danger';
  if (budget < 2000) return 'text-terminal-warning';
  return '';
}

/** CSS class for a relationship row, picking the right band fn for chef vs rest. */
export function relationshipClass(key: string, value: number, chefGameOver: number): string {
  return BAND_CLASS[key === 'chef' ? chefBand(value, chefGameOver) : relationshipBand(value)];
}

/**
 * Pre-defeat warnings: one line per metric currently inside its danger band,
 * most-severe first. Empty array = nothing to warn about.
 */
export function getDefeatWarnings(state: GameState): string[] {
  const t = getGameModeConfig(state.gameMode).thresholds;
  const out: string[] = [];
  if (state.stress >= t.stressGameOver - 10) {
    out.push(
      `⚠ BURNOUT-GEFAHR — Stress kritisch (${state.stress}/${t.stressGameOver}). Eine harte Woche und du bist raus.`
    );
  }
  if (state.relationships.chef <= t.chefRelationshipGameOver + 20) {
    out.push('⚠ Dein Chef steht kurz davor, die Probezeit zu beenden.');
  }
  if (state.compliance <= t.complianceGameOver + 10) {
    out.push('⚠ Compliance im roten Bereich — ein BSI-Audit würde jetzt ein Bußgeld auslösen.');
  }
  return out;
}
