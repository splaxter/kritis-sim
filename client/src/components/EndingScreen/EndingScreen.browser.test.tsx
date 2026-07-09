import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EndingScreen } from './index';
import { ADVENTURE_ENDINGS } from '../../content/adventure/endings';

import { adventureSidequests } from '../../content/adventure/sidequests';

const stats = {
  score: 82,
  sidequestsCompleted: 2,
  totalSidequests: adventureSidequests.length,
  charactersHelped: ['chef', 'kollegen'],
  storyPath: 'official',
  endingFlags: ['saved_early', 'found_evidence'],
};

describe('EndingScreen', () => {
  it('renders the ending title and epilogue for the given type', () => {
    render(<EndingScreen ending="good" stats={stats} onBackToMenu={() => {}} />);
    expect(screen.getByText(ADVENTURE_ENDINGS.good.title)).toBeInTheDocument();
    expect(screen.getByText(/82/)).toBeInTheDocument(); // score shown
  });

  it('renders the replay teaser (endings seen + missed content) when provided', () => {
    const replay = {
      endingsSeen: 1,
      totalEndings: 3,
      otherEndingTitles: [ADVENTURE_ENDINGS.neutral.title, ADVENTURE_ENDINGS.bad.title],
      missedSidequests: ['Der Druckergeist'],
      untakenForkHint: 'Du bist den offiziellen Weg gegangen — es gab auch den Alleingang.',
    };
    render(<EndingScreen ending="good" stats={stats} onBackToMenu={() => {}} replay={replay} />);
    expect(screen.getByText(/WAS DU NICHT GESEHEN HAST/)).toBeInTheDocument();
    expect(screen.getByText(/1\/3/)).toBeInTheDocument();
    expect(screen.getByText(/Der Druckergeist/)).toBeInTheDocument();
    expect(screen.getByText(/Alleingang/)).toBeInTheDocument();
  });

  it('omits the replay teaser when no replay data is given', () => {
    render(<EndingScreen ending="good" stats={stats} onBackToMenu={() => {}} />);
    expect(screen.queryByText(/WAS DU NICHT GESEHEN HAST/)).not.toBeInTheDocument();
  });
  it('has an ending text for every ending type', () => {
    expect(Object.keys(ADVENTURE_ENDINGS).sort()).toEqual(['bad', 'good', 'neutral']);
    for (const e of Object.values(ADVENTURE_ENDINGS)) {
      expect(e.title.length).toBeGreaterThan(0);
      expect(e.paragraphs.length).toBeGreaterThanOrEqual(3);
      expect(e.epilogue.length).toBeGreaterThan(0);
    }
  });
});
