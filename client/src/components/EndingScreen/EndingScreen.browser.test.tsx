import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EndingScreen } from './index';
import { ADVENTURE_ENDINGS } from '../../content/adventure/endings';

const stats = {
  score: 82,
  sidequestsCompleted: 0,
  totalSidequests: 12,
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
  it('has an ending text for every ending type', () => {
    expect(Object.keys(ADVENTURE_ENDINGS).sort()).toEqual(['bad', 'good', 'neutral']);
    for (const e of Object.values(ADVENTURE_ENDINGS)) {
      expect(e.title.length).toBeGreaterThan(0);
      expect(e.paragraphs.length).toBeGreaterThanOrEqual(3);
      expect(e.epilogue.length).toBeGreaterThan(0);
    }
  });
});
