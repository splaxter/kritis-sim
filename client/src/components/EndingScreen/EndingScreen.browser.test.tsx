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
  preparationFlags: ['saved_early', 'found_evidence'],
  penaltyFlags: [],
};

describe('EndingScreen', () => {
  it('renders the ending title and epilogue for the given type', () => {
    render(<EndingScreen headline="PROBEZEIT BEENDET" text={ADVENTURE_ENDINGS.good} stats={stats} onBackToMenu={() => {}} />);
    expect(screen.getByText(ADVENTURE_ENDINGS.good.title)).toBeInTheDocument();
    expect(screen.getByText(/82/)).toBeInTheDocument(); // score shown
  });

  it('renders the preparation and penalty factors behind the ending', () => {
    render(<EndingScreen headline="PROBEZEIT BEENDET" text={ADVENTURE_ENDINGS.good} stats={{
      ...stats,
      preparationFlags: ['saved_early', 'found_evidence'],
      penaltyFlags: ['ignored_warnings'],
    }} onBackToMenu={() => {}} />);
    expect(screen.getByText(/Was dieses Ende geprägt hat/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Systeme rechtzeitig geschützt/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Warnungen ignoriert/)).toBeInTheDocument();
  });

  it('renders the replay teaser (endings seen + missed content) when provided', () => {
    const replay = {
      endingsSeen: 1,
      totalEndings: 3,
      otherEndingTitles: [ADVENTURE_ENDINGS.neutral.title, ADVENTURE_ENDINGS.bad.title],
      missedSidequests: ['Der Druckergeist'],
      untakenForkHint: 'Du bist den offiziellen Weg gegangen — es gab auch den Alleingang.',
    };
    render(<EndingScreen headline="PROBEZEIT BEENDET" text={ADVENTURE_ENDINGS.good} stats={stats} onBackToMenu={() => {}} replay={replay} />);
    expect(screen.getByText(/WAS DU NICHT GESEHEN HAST/)).toBeInTheDocument();
    expect(screen.getByText(/1\/3/)).toBeInTheDocument();
    expect(screen.getByText(/Der Druckergeist/)).toBeInTheDocument();
    expect(screen.getByText(/Alleingang/)).toBeInTheDocument();
  });

  it('omits the replay teaser when no replay data is given', () => {
    render(<EndingScreen headline="PROBEZEIT BEENDET" text={ADVENTURE_ENDINGS.good} stats={stats} onBackToMenu={() => {}} />);
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

  it('renders the campaign headline, not a hardcoded PROBEZEIT one', () => {
    render(<EndingScreen headline="AUDIT TRAIL — ABGESCHLOSSEN" text={ADVENTURE_ENDINGS.good} onBackToMenu={() => {}} />);
    expect(screen.getByText(/AUDIT TRAIL — ABGESCHLOSSEN/)).toBeInTheDocument();
    expect(screen.queryByText(/PROBEZEIT BEENDET/)).not.toBeInTheDocument();
  });

  it('omits the probation score/path/flag Bilanz when no stats are given (AUDIT TRAIL)', () => {
    const at = {
      id: 'at_ending_profi',
      title: 'Der Profi',
      paragraphs: ['Der ISB klappt seinen Ordner zu.'],
      epilogue: 'Du musstest nie laut werden.',
    };
    render(<EndingScreen headline="AUDIT TRAIL — ABGESCHLOSSEN" text={at} onBackToMenu={() => {}} />);
    // Text + epilogue render...
    expect(screen.getByText('Du musstest nie laut werden.')).toBeInTheDocument();
    // ...but none of the probation Bilanz (score/path/allies) does.
    expect(screen.queryByText(/— BILANZ —/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Score:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Weg:/)).not.toBeInTheDocument();
  });
});
