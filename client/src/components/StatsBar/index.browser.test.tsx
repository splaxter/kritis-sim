import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createInitialState } from '../../engine/gameState';
import { StatsBar } from './index';

describe('StatsBar learning header', () => {
  it('stacks on mobile and lets the progress bar consume the remaining width', () => {
    const state = createInitialState('HUD-MOBILE', 'learning');
    render(
      <StatsBar
        state={state}
        lessonLabel="Ansible & Konfigurationsmanagement · 4/4"
        lessonProgressPercent={75}
      />
    );

    const mode = screen.getByText(/LERNMODUS/);
    const outerRow = mode.parentElement?.parentElement;
    const label = screen.getByText('Ansible & Konfigurationsmanagement · 4/4');
    const progressText = screen.getByText('Fortschritt:');
    const progressRow = progressText.parentElement;
    const bar = progressText.nextElementSibling;

    expect(outerRow).toHaveClass('flex-col', 'sm:flex-row');
    expect(mode.parentElement).toHaveClass('min-w-0', 'flex-wrap');
    expect(label).toHaveClass('min-w-0', 'break-words');
    expect(progressRow).toHaveClass('w-full', 'min-w-0', 'sm:w-auto');
    expect(bar).toHaveClass('min-w-0', 'flex-1', 'sm:w-32', 'sm:flex-none');
  });
});

describe('StatsBar run badge', () => {
  it('names a story run by its campaign, so a second campaign is not "Die Probezeit"', () => {
    const state = createInitialState('HUD-AT', 'story', 'audit-trail');
    render(<StatsBar state={state} />);

    expect(screen.getByText(/Story: Audit Trail/)).toBeInTheDocument();
    expect(screen.queryByText(/Die Probezeit/)).not.toBeInTheDocument();
  });

  it('leaves the probation badge unchanged', () => {
    const state = createInitialState('HUD-PROB', 'story', 'probation');
    render(<StatsBar state={state} />);

    expect(screen.getByText(/📖 Story: Die Probezeit/)).toBeInTheDocument();
  });
});

describe('StatsBar progress readout', () => {
  it('measures story runs in chapters, not in the mode week budget', () => {
    // AUDIT TRAIL has 6 chapters and ends around week 5 — "Woche 1/12" would
    // claim a length the campaign does not have.
    const state = createInitialState('HUD-AT-PROGRESS', 'story', 'audit-trail');
    render(<StatsBar state={state} />);

    expect(screen.getByText(/Woche 1 · Kapitel 1\/6/)).toBeInTheDocument();
    expect(screen.queryByText(/Woche 1\/12/)).not.toBeInTheDocument();
  });

  it('shows the chapter position of the CURRENT chapter', () => {
    const state = createInitialState('HUD-AT-CH4', 'story', 'audit-trail');
    state.storyState!.currentChapter = 'at_ch04_blockade';
    render(<StatsBar state={state} />);

    expect(screen.getByText(/Kapitel 4\/6/)).toBeInTheDocument();
  });

  it('probation counts its own 12 chapters', () => {
    const state = createInitialState('HUD-PROB-PROGRESS', 'story', 'probation');
    render(<StatsBar state={state} />);

    expect(screen.getByText(/Woche 1 · Kapitel 1\/12/)).toBeInTheDocument();
  });

  it('non-story runs keep the week budget readout', () => {
    const state = createInitialState('HUD-SIM', 'beginner');
    render(<StatsBar state={state} />);

    expect(screen.getByText(/Woche 1\/12/)).toBeInTheDocument();
    expect(screen.queryByText(/Kapitel/)).not.toBeInTheDocument();
  });

  it('falls back to the week readout when the chapter id is unknown', () => {
    const state = createInitialState('HUD-BROKEN', 'story', 'audit-trail');
    state.storyState!.currentChapter = 'at_ch99_does_not_exist';
    render(<StatsBar state={state} />);

    expect(screen.getByText(/Woche 1\/12/)).toBeInTheDocument();
    expect(screen.queryByText(/Kapitel/)).not.toBeInTheDocument();
  });
});
