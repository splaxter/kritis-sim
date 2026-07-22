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
