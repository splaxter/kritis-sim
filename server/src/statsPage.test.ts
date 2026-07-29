import { describe, it, expect } from 'vitest';
import { renderStatsHtml } from './statsPage.js';
import { PlayerStat, StatsAggregate } from './store.js';

function player(over: Partial<PlayerStat> = {}): PlayerStat {
  return {
    playerId: 'player-abc12',
    runsStarted: 1,
    runsCompleted: 0,
    endingsSeen: [],
    lessonsCompleted: [],
    perMode: [],
    completedRuns: [],
    campaignsStarted: [],
    campaignsUnlocked: [],
    ...over,
  };
}

function html(players: PlayerStat[]): string {
  const agg: StatsAggregate = {
    generatedAt: '2026-07-29T00:00:00.000Z',
    totalEvents: players.length,
    players,
  };
  return renderStatsHtml(agg);
}

describe('stats page — run outcomes', () => {
  it('marks a run that ended WITHOUT an ending as such', () => {
    // The case that was unreadable before: week 12 reached, run counted as
    // "beendet", but no ending screen was ever seen.
    const out = html([
      player({
        runsCompleted: 1,
        perMode: [{ mode: 'story', runsStarted: 1, runsCompleted: 1, bestWeekReached: 12 }],
        completedRuns: [
          { mode: 'story', campaignId: 'probation', outcome: 'ended', weekReached: 12, totalWeeks: 12 },
        ],
      }),
    ]);

    expect(out).toContain('Abschlüsse (wie ausgegangen)');
    expect(out).toContain('Probezeit W12/12 · Beendet (kein Ende)');
  });

  it('names the ending when one was reached, with the score', () => {
    const out = html([
      player({
        runsCompleted: 1,
        endingsSeen: ['good'],
        completedRuns: [
          { mode: 'story', campaignId: 'probation', outcome: 'ended', weekReached: 12, totalWeeks: 12, ending: 'good', score: 82 },
        ],
      }),
    ]);

    expect(out).toContain('Probezeit W12/12 · Der Held · 82 P');
    expect(out).not.toContain('kein Ende');
  });

  it('marks a SURVIVED story run without an ending — "Bestanden" alone would mislead', () => {
    // Real case from the production log: probation, 12/12 weeks, outcome
    // 'victory' (reason 'probezeit_complete'), but no ending → the player never
    // saw the campaign's ending screen.
    const out = html([
      player({
        runsCompleted: 1,
        completedRuns: [
          { mode: 'story', campaignId: 'probation', outcome: 'victory', weekReached: 12, totalWeeks: 12 },
        ],
      }),
    ]);

    expect(out).toContain('Probezeit W12/12 · Bestanden (kein Ende)');
  });

  it('labels a real game over by its cause, not as a missing ending', () => {
    const out = html([
      player({
        runsCompleted: 1,
        completedRuns: [{ mode: 'kritis', outcome: 'burnout', weekReached: 14, totalWeeks: 24 }],
      }),
    ]);

    expect(out).toContain('KRITIS W14/24 · Burnout');
    expect(out).not.toContain('kein Ende');
  });

  it('shows only the newest runs and counts the rest', () => {
    const runs = Array.from({ length: 5 }, (_, i) => ({
      mode: 'kritis',
      outcome: 'burnout',
      weekReached: i + 1,
    }));
    const out = html([player({ runsCompleted: 5, completedRuns: runs })]);

    // Newest first (week 5 at the top), three shown, remainder summarised.
    expect(out).toContain('KRITIS W5 · Burnout');
    expect(out).toContain('+2 weitere');
    expect(out).not.toContain('KRITIS W1 · Burnout');
  });

  it('falls back to the raw ids for an unknown campaign/outcome instead of hiding the run', () => {
    const out = html([
      player({
        runsCompleted: 1,
        completedRuns: [{ mode: 'story', campaignId: 'ghost-op', outcome: 'exploded' }],
      }),
    ]);

    expect(out).toContain('ghost-op');
    expect(out).toContain('exploded');
  });
});

describe('stats page — hidden campaigns', () => {
  it('shows an unlock even when the campaign was never started', () => {
    const out = html([player({ campaignsUnlocked: ['audit-trail'] })]);

    expect(out).toContain('Kampagnen');
    expect(out).toContain('Audit Trail (entsperrt)');
  });

  it('combines unlocked and started into one entry per campaign', () => {
    const out = html([
      player({ campaignsUnlocked: ['audit-trail'], campaignsStarted: ['audit-trail', 'probation'] }),
    ]);

    expect(out).toContain('Audit Trail (entsperrt, gestartet)');
    expect(out).toContain('Probezeit (gestartet)');
  });

  it('renders a dash when the player touched no campaign', () => {
    const out = html([player()]);
    expect(out).toContain('<td>—</td>');
  });
});

describe('stats page — escaping', () => {
  it('escapes ids coming from the untrusted log', () => {
    const out = html([
      player({
        runsCompleted: 1,
        campaignsUnlocked: ['<script>x</script>'],
        completedRuns: [{ mode: 'story', campaignId: '<img>', outcome: '<b>' }],
      }),
    ]);

    expect(out).not.toContain('<script>x</script>');
    expect(out).not.toContain('<img>');
    expect(out).toContain('&lt;script&gt;');
  });
});
