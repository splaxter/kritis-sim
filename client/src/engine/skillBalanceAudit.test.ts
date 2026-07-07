import { describe, it, expect } from 'vitest';
import { allEvents } from '../content/events';
import { Skills } from '@kritis/shared';

// Budget for hands-on GUI learning levels: keep them generous but bounded so the
// now-live solution.skillGain (added on top of choice.effects) can't max a skill
// or hand out an oversized total in a single, repeatable level.
const GUI_MAX_SINGLE_SKILL = 10;
const GUI_MAX_TOTAL = 16;

type SkillMap = Partial<Record<keyof Skills, number>>;

const add = (a: SkillMap, b?: SkillMap): SkillMap => {
  const out: SkillMap = { ...a };
  for (const [k, v] of Object.entries(b ?? {})) out[k as keyof Skills] = (out[k as keyof Skills] ?? 0) + (v ?? 0);
  return out;
};
const maxMerge = (a: SkillMap, b?: SkillMap): SkillMap => {
  const out: SkillMap = { ...a };
  for (const [k, v] of Object.entries(b ?? {})) out[k as keyof Skills] = Math.max(out[k as keyof Skills] ?? 0, v ?? 0);
  return out;
};

describe('skill balance audit (live solution.skillGain)', () => {
  it('dumps per-level total skill gain and flags outliers', () => {
    const rows: { id: string; kind: string; choice: SkillMap; solution: SkillMap; perSkill: SkillMap; maxOne: number; total: number; finale: boolean }[] = [];

    for (const ev of allEvents) {
      const isGui = !!ev.guiContext;
      const isTerm = !!ev.terminalContext;
      if (!isGui && !isTerm) continue;

      // The choice that opens the level.
      const opener = ev.choices.find((c) => (isGui ? c.guiCommand : c.terminalCommand)) ?? ev.choices[0];
      const choiceSkills: SkillMap = opener?.effects?.skills ?? {};

      // Best matchable solution reward (max per skill across solutions + isSolution commands).
      let bestSolution: SkillMap = {};
      if (isGui) {
        for (const s of ev.guiContext!.solutions) bestSolution = maxMerge(bestSolution, s.skillGain);
      } else {
        for (const s of ev.terminalContext!.solutions) bestSolution = maxMerge(bestSolution, s.skillGain);
        for (const c of ev.terminalContext!.commands) if (c.isSolution) bestSolution = maxMerge(bestSolution, c.skillGain);
      }

      const perSkill = add(choiceSkills, bestSolution);
      const vals = Object.values(perSkill) as number[];
      const maxOne = vals.length ? Math.max(...vals) : 0;
      const total = vals.reduce((a, b) => a + b, 0);
      const finale = /boss|final|finale/i.test(ev.id) || (ev.tags ?? []).some((t) => /boss|final/i.test(t));

      rows.push({ id: ev.id, kind: isGui ? 'gui' : 'term', choice: choiceSkills, solution: bestSolution, perSkill, maxOne, total, finale });
    }

    rows.sort((a, b) => b.total - a.total);

    const fmt = (m: SkillMap) => Object.entries(m).map(([k, v]) => `${k}+${v}`).join(' ') || '-';
    const isOutlier = (r: typeof rows[number]) => !r.finale && (r.maxOne > 10 || r.total > 16);
    const lines = rows.map(
      (r) =>
        `${isOutlier(r) ? '⚠️' : '  '} ${r.kind} ${r.id.padEnd(34)} total=${String(r.total).padStart(2)} maxOne=${String(r.maxOne).padStart(2)} ${r.finale ? '[F] ' : '    '}` +
        `choice[${fmt(r.choice)}] solution[${fmt(r.solution)}]`
    );
    const flagged = rows.filter(isOutlier).map((r) => r.id);
    const report =
      '\n=== SKILL BALANCE AUDIT (choice.effects + best solution.skillGain) ===\n' +
      lines.join('\n') +
      `\n\nFLAGGED OUTLIERS (>10 one skill or >16 total, non-finale): ${flagged.length ? flagged.join(', ') : 'none'}\n`;

    // GUARD: GUI learning levels must stay within budget. Terminal lessons /
    // regular events are a known, broader rebalancing item handled separately —
    // not asserted here on purpose. The full table is attached to the failure
    // message so a budget breach prints the whole audit.
    const guiOver = rows.filter((r) => r.kind === 'gui' && (r.maxOne > GUI_MAX_SINGLE_SKILL || r.total > GUI_MAX_TOTAL));
    expect(
      guiOver.map((r) => `${r.id} (total=${r.total}, maxOne=${r.maxOne})`),
      `GUI levels over skill budget (${GUI_MAX_SINGLE_SKILL}/skill, ${GUI_MAX_TOTAL} total)\n${report}`
    ).toEqual([]);
  });
});
