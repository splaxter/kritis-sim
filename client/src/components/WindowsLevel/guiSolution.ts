import { GuiSolution } from '@kritis/shared';

/**
 * Pure solution-matching for GUI levels. Given the interactions the player has
 * performed (in order), decide whether a solution is satisfied. Mirrors the
 * terminal engine's `checkSolution`, but over interaction tokens instead of
 * typed commands.
 */
export function isGuiSolutionMet(solution: GuiSolution, performed: string[]): boolean {
  const { interactions, allRequired, ordered } = solution;
  if (interactions.length === 0) return false;

  if (ordered) {
    // The required interactions must appear as an ordered subsequence of what
    // the player did (extra/intermediate actions are allowed).
    let idx = 0;
    for (const action of performed) {
      if (action === interactions[idx]) {
        idx++;
        if (idx === interactions.length) return true;
      }
    }
    return false;
  }

  if (allRequired) {
    return interactions.every((i) => performed.includes(i));
  }

  // Any single required interaction satisfies the solution.
  return interactions.some((i) => performed.includes(i));
}

/** Return the first solution satisfied by the performed interactions, if any. */
export function findMetGuiSolution(
  solutions: GuiSolution[],
  performed: string[]
): GuiSolution | null {
  for (const solution of solutions) {
    if (isGuiSolutionMet(solution, performed)) return solution;
  }
  return null;
}
