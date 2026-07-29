import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { writeAutosave } from './engine/autosave';
import { createInitialState } from './engine/gameState';
import { getCampaign } from './content/campaigns';

// Same pinning trick as App.autosaveResume.browser.test.tsx: App looks the
// autosave up under 'kritis_player_id'.
const PLAYER = 'player-ending-test';

/** A run that has just completed the last chapter, PAST the mode's week budget —
 *  the state a player is in after finishing the finale on the final day. */
function completedProbationRun(week: number) {
  const campaign = getCampaign('probation');
  const base = createInitialState('ENDING_SEED', 'story', 'probation');
  return {
    ...base,
    currentWeek: week,
    currentDay: 1,
    storyState: {
      ...base.storyState!,
      currentChapter: campaign.chapters[campaign.chapters.length - 1].id,
      currentBeatIndex: 0,
      completedChapters: campaign.chapters.map((c) => c.id),
    },
  };
}

async function resume() {
  const user = userEvent.setup();
  render(<App />);
  fireEvent.keyDown(window, { key: 'Enter' }); // dismiss the intro
  await user.click(await screen.findByText(/WEITER SPIELEN/i));
}

describe('App — a completed campaign reaches its ending screen', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('kritis_player_id', PLAYER);
  });

  it('shows the campaign ending, not the run-summary screen, past the week budget', async () => {
    // Week 13 was the old game-over trigger: the run ended as "Probezeit
    // bestanden" and the authored ending was never shown.
    writeAutosave(PLAYER, completedProbationRun(13));

    await resume();

    expect(await screen.findByText(/PROBEZEIT BEENDET/)).toBeInTheDocument();
    expect(screen.queryByText(/Fortsetzung folgt/i)).toBeNull();
  });

  it('does the same when the finale lands inside the budget', async () => {
    writeAutosave(PLAYER, completedProbationRun(12));

    await resume();

    expect(await screen.findByText(/PROBEZEIT BEENDET/)).toBeInTheDocument();
  });
});
