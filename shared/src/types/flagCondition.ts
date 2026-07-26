/**
 * Composable flag condition for story beats and campaign endings.
 *
 * The string form is the historical single-flag `branchCondition` — kept so
 * existing campaign content (e.g. probation ch12 `chose_official_route`) stays
 * valid unchanged. The object form adds `all`/`any`/`none`, which the AUDIT
 * TRAIL audit questions and audit-domain endings need.
 *
 * Semantics (all present clauses must hold; absent/empty clauses do not
 * constrain, so an empty object is vacuously true):
 * - `all`  — every listed flag is set
 * - `any`  — at least one listed flag is set (empty/omitted → no constraint)
 * - `none` — none of the listed flags is set
 */
export type FlagCondition =
  | string
  | { all?: string[]; any?: string[]; none?: string[] };

export function checkFlagCondition(
  cond: FlagCondition | undefined,
  flags: Record<string, boolean>,
): boolean {
  if (cond === undefined) return true;
  if (typeof cond === 'string') return !!flags[cond];
  const { all = [], any = [], none = [] } = cond;
  return (
    all.every(f => !!flags[f]) &&
    (any.length === 0 || any.some(f => !!flags[f])) &&
    none.every(f => !flags[f])
  );
}

/**
 * Every flag name a condition references (all + any + none, or the single
 * string). Used by consistency audits to prove no beat/ending branches on a
 * flag that is never set anywhere.
 */
export function flagsInCondition(cond: FlagCondition | undefined): string[] {
  if (cond === undefined) return [];
  if (typeof cond === 'string') return [cond];
  return [...(cond.all ?? []), ...(cond.any ?? []), ...(cond.none ?? [])];
}
