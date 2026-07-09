import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RunSummaryScreen } from './index';
import { RunSummary } from '../../engine/runSummary';
import { MetaProgress } from '../../engine/metaProgress';

const meta: MetaProgress = {
  version: 1,
  runsCompleted: 3,
  endingsSeen: [],
  bestScoreByMode: {},
  lastRunAt: new Date(0).toISOString(),
  countedSeeds: [],
};

function summary(overrides: Partial<RunSummary> = {}): RunSummary {
  return {
    mode: 'intermediate',
    outcome: 'victory',
    weekReached: 12,
    totalWeeks: 12,
    survived: true,
    decisionsMade: 40,
    finalStats: { stress: 30, budget: 15000, compliance: 55 },
    skillDeltas: [{ key: 'linux', start: 20, end: 32, delta: 12 }],
    relationshipDeltas: [{ key: 'chef', start: 0, end: 15, delta: 15 }],
    openConsequences: 2,
    topThemes: [{ tag: 'security', count: 5 }],
    ...overrides,
  };
}

describe('RunSummaryScreen', () => {
  it('shows a victory bilanz with week, deltas and themes', () => {
    render(
      <RunSummaryScreen summary={summary()} modeName="Standard" modeIcon="🎯" meta={meta} onRetry={() => {}} />
    );
    expect(screen.getByText(/PROBEZEIT ÜBERSTANDEN/)).toBeInTheDocument();
    expect(screen.getByText(/12\/12/)).toBeInTheDocument();
    expect(screen.getByText(/\+12/)).toBeInTheDocument(); // skill delta
    expect(screen.getByText(/Sicherheit \(5\)/)).toBeInTheDocument(); // theme label
    expect(screen.getByText(/Durchläufe gesamt:/)).toBeInTheDocument();
  });

  it('shows the learning tip only when requested', () => {
    const { rerender } = render(
      <RunSummaryScreen summary={summary({ outcome: 'burnout', survived: false })} modeName="Standard" modeIcon="🎯" meta={meta} onRetry={() => {}} learningTip />
    );
    expect(screen.getByText(/AUSGEBRANNT/)).toBeInTheDocument();
    expect(screen.getByText(/Lernmodus/)).toBeInTheDocument();

    rerender(
      <RunSummaryScreen summary={summary({ outcome: 'burnout', survived: false })} modeName="Standard" modeIcon="🎯" meta={meta} onRetry={() => {}} />
    );
    expect(screen.queryByText(/Lernmodus/)).not.toBeInTheDocument();
  });

  it('fires onRetry when the button is clicked', async () => {
    const onRetry = vi.fn();
    render(
      <RunSummaryScreen summary={summary()} modeName="Standard" modeIcon="🎯" meta={meta} onRetry={onRetry} />
    );
    await userEvent.click(screen.getByText(/NOCHMAL VERSUCHEN/));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
