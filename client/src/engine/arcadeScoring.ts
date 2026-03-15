/**
 * Arcade Scoring Engine
 * Handles score calculation, streak tracking, and combo multipliers
 */

import { GameState } from '@kritis/shared';

// ============================================================================
// Types
// ============================================================================

export type ChoiceOutcome = 'PERFECT' | 'SUCCESS' | 'PARTIAL' | 'FAIL' | 'CRITICAL' | 'TIMEOUT';

export interface ScoreResult {
  baseScore: number;
  multiplier: number;
  finalScore: number;
  newStreak: number;
  streakBroken: boolean;
  bonusMessage?: string;
}

export interface ArcadeStats {
  totalScore: number;
  currentStreak: number;
  longestStreak: number;
  perfectCount: number;
  successCount: number;
  partialCount: number;
  failCount: number;
  criticalCount: number;
  timeoutCount: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Base scores for each outcome type */
export const BASE_SCORES: Record<ChoiceOutcome, number> = {
  PERFECT: 1000,
  SUCCESS: 500,
  PARTIAL: 200,
  FAIL: 0,
  CRITICAL: -200,
  TIMEOUT: -500,
};

/** Streak thresholds for multiplier increases */
export const STREAK_MULTIPLIERS: { threshold: number; multiplier: number }[] = [
  { threshold: 0, multiplier: 1 },
  { threshold: 3, multiplier: 2 },
  { threshold: 6, multiplier: 3 },
  { threshold: 9, multiplier: 4 },
  { threshold: 15, multiplier: 5 },
];

/** Bonus points for hitting multiplier milestones */
export const MILESTONE_BONUSES: Record<number, { points: number; message: string }> = {
  3: { points: 200, message: 'DOUBLE DAMAGE!' },
  6: { points: 500, message: 'TRIPLE THREAT!' },
  9: { points: 1000, message: 'QUAD POWER!' },
  15: { points: 2000, message: 'UNSTOPPABLE!' },
};

// ============================================================================
// Score Calculation
// ============================================================================

/**
 * Get the multiplier for a given streak count
 */
export function getMultiplier(streak: number): number {
  let multiplier = 1;
  for (const { threshold, multiplier: mult } of STREAK_MULTIPLIERS) {
    if (streak >= threshold) {
      multiplier = mult;
    }
  }
  return multiplier;
}

/**
 * Calculate score for a choice outcome
 */
export function calculateScore(
  outcome: ChoiceOutcome,
  currentStreak: number,
  timeBonus: number = 0
): ScoreResult {
  const isPositive = outcome === 'PERFECT' || outcome === 'SUCCESS' || outcome === 'PARTIAL';
  const breaksStreak = !isPositive;

  // Calculate new streak
  const newStreak = breaksStreak ? 0 : currentStreak + 1;

  // Get multiplier based on streak BEFORE this choice
  const multiplier = isPositive ? getMultiplier(currentStreak) : 1;

  // Calculate base score with time bonus
  const baseScore = BASE_SCORES[outcome] + (isPositive ? timeBonus : 0);

  // Calculate final score
  const finalScore = Math.floor(baseScore * multiplier);

  // Check for milestone bonus
  let bonusMessage: string | undefined;
  if (isPositive && MILESTONE_BONUSES[newStreak]) {
    bonusMessage = MILESTONE_BONUSES[newStreak].message;
  }

  return {
    baseScore,
    multiplier,
    finalScore,
    newStreak,
    streakBroken: breaksStreak && currentStreak > 0,
    bonusMessage,
  };
}

/**
 * Calculate time bonus based on remaining time
 */
export function calculateTimeBonus(
  timeRemaining: number,
  totalTime: number,
  maxBonus: number = 200
): number {
  if (timeRemaining <= 0 || totalTime <= 0) return 0;

  // Linear bonus based on remaining time
  const ratio = timeRemaining / totalTime;
  return Math.floor(maxBonus * ratio);
}

/**
 * Determine outcome from game effects
 */
export function determineOutcome(effects: {
  stress?: number;
  compliance?: number;
  budget?: number;
  skills?: number;
}): ChoiceOutcome {
  // Calculate overall impact
  const stressImpact = (effects.stress || 0);
  const complianceImpact = (effects.compliance || 0);
  const budgetImpact = (effects.budget || 0) / 100; // Normalize budget
  const skillsImpact = (effects.skills || 0);

  // Net positive score (higher is better)
  const netScore =
    -stressImpact +
    complianceImpact +
    budgetImpact +
    skillsImpact;

  // Categorize outcome
  if (netScore >= 15) return 'PERFECT';
  if (netScore >= 5) return 'SUCCESS';
  if (netScore >= -5) return 'PARTIAL';
  if (netScore >= -15) return 'FAIL';
  return 'CRITICAL';
}

// ============================================================================
// Stats Tracking
// ============================================================================

/**
 * Create initial arcade stats
 */
export function createArcadeStats(): ArcadeStats {
  return {
    totalScore: 0,
    currentStreak: 0,
    longestStreak: 0,
    perfectCount: 0,
    successCount: 0,
    partialCount: 0,
    failCount: 0,
    criticalCount: 0,
    timeoutCount: 0,
  };
}

/**
 * Update arcade stats with a new result
 */
export function updateArcadeStats(
  stats: ArcadeStats,
  outcome: ChoiceOutcome,
  scoreResult: ScoreResult
): ArcadeStats {
  const newStats = { ...stats };

  // Update total score
  newStats.totalScore += scoreResult.finalScore;

  // Update streak
  newStats.currentStreak = scoreResult.newStreak;
  newStats.longestStreak = Math.max(newStats.longestStreak, newStats.currentStreak);

  // Update outcome counts
  switch (outcome) {
    case 'PERFECT':
      newStats.perfectCount++;
      break;
    case 'SUCCESS':
      newStats.successCount++;
      break;
    case 'PARTIAL':
      newStats.partialCount++;
      break;
    case 'FAIL':
      newStats.failCount++;
      break;
    case 'CRITICAL':
      newStats.criticalCount++;
      break;
    case 'TIMEOUT':
      newStats.timeoutCount++;
      break;
  }

  // Add milestone bonus if applicable
  if (MILESTONE_BONUSES[newStats.currentStreak]) {
    newStats.totalScore += MILESTONE_BONUSES[newStats.currentStreak].points;
  }

  return newStats;
}

/**
 * Calculate final grade based on stats
 */
export function calculateGrade(stats: ArcadeStats): {
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  stars: number;
  comment: string;
} {
  const totalChoices =
    stats.perfectCount +
    stats.successCount +
    stats.partialCount +
    stats.failCount +
    stats.criticalCount +
    stats.timeoutCount;

  if (totalChoices === 0) {
    return { grade: 'F', stars: 0, comment: 'Keine Entscheidungen getroffen' };
  }

  const positiveRate =
    (stats.perfectCount + stats.successCount) / totalChoices;
  const perfectRate = stats.perfectCount / totalChoices;

  // Grade based on positive rate and score
  if (positiveRate >= 0.9 && perfectRate >= 0.5 && stats.longestStreak >= 9) {
    return { grade: 'S', stars: 5, comment: 'Meisterhaft! Perfekte Performance!' };
  }
  if (positiveRate >= 0.8 && stats.longestStreak >= 6) {
    return { grade: 'A', stars: 4, comment: 'Exzellent! Sehr gute Arbeit!' };
  }
  if (positiveRate >= 0.6) {
    return { grade: 'B', stars: 3, comment: 'Gut gemacht! Solide Leistung.' };
  }
  if (positiveRate >= 0.4) {
    return { grade: 'C', stars: 2, comment: 'Befriedigend. Raum für Verbesserung.' };
  }
  if (positiveRate >= 0.2) {
    return { grade: 'D', stars: 1, comment: 'Ausbaufähig. Mehr Übung nötig.' };
  }

  return { grade: 'F', stars: 0, comment: 'Durchgefallen. Nächstes Mal besser!' };
}

/**
 * Format score with thousand separators
 */
export function formatScore(score: number): string {
  return score.toLocaleString('de-DE');
}

/**
 * Get color for outcome
 */
export function getOutcomeColor(outcome: ChoiceOutcome): string {
  switch (outcome) {
    case 'PERFECT':
      return '#FFD700'; // Gold
    case 'SUCCESS':
      return '#00FF00'; // Green
    case 'PARTIAL':
      return '#FFFF00'; // Yellow
    case 'FAIL':
      return '#FF8800'; // Orange
    case 'CRITICAL':
    case 'TIMEOUT':
      return '#FF0000'; // Red
  }
}

/**
 * Get emoji for outcome
 */
export function getOutcomeEmoji(outcome: ChoiceOutcome): string {
  switch (outcome) {
    case 'PERFECT':
      return '🌟';
    case 'SUCCESS':
      return '✅';
    case 'PARTIAL':
      return '⚡';
    case 'FAIL':
      return '❌';
    case 'CRITICAL':
      return '💀';
    case 'TIMEOUT':
      return '⏰';
  }
}
