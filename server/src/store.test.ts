import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { appendEvent, readEvents, aggregate, StoredEvent } from './store.js';

let dir: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(join(tmpdir(), 'kritis-store-'));
  process.env.DATA_DIR = dir;
});
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

const NOW = '2026-07-09T12:00:00.000Z';

describe('store append/read', () => {
  it('round-trips appended events and returns [] before any write', async () => {
    expect(await readEvents()).toEqual([]);
    await appendEvent({ type: 'run_started', playerId: 'player-aaa11', seed: 's' });
    const evs = await readEvents();
    expect(evs).toHaveLength(1);
    expect(evs[0].playerId).toBe('player-aaa11');
  });

  it('skips corrupt/half-written lines instead of throwing', async () => {
    await appendEvent({ type: 'run_started', playerId: 'player-aaa11' });
    await fs.appendFile(join(dir, 'events.jsonl'), '{ this is not json\n', 'utf8');
    await appendEvent({ type: 'run_started', playerId: 'player-bbb22' });
    const evs = await readEvents();
    expect(evs).toHaveLength(2);
    expect(evs.map((e) => e.playerId)).toEqual(['player-aaa11', 'player-bbb22']);
  });
});

describe('aggregate', () => {
  const ev = (o: Partial<StoredEvent>): StoredEvent => ({ playerId: 'player-aaa11', ...o });

  it('counts starts/completions per mode and collects endings', () => {
    const agg = aggregate(
      [
        ev({ type: 'run_started', seed: 's1', payload: { mode: 'story' }, receivedAt: '2026-07-01' }),
        ev({ type: 'run_completed', seed: 's1', payload: { mode: 'story', weekReached: 12, score: 82, ending: 'good' }, receivedAt: '2026-07-02' }),
        ev({ type: 'lesson_completed', payload: { lessonId: 'learn_01' }, receivedAt: '2026-07-03' }),
        ev({ type: 'lesson_completed', payload: { lessonId: 'learn_01' } }), // dupe lesson
      ],
      NOW
    );
    expect(agg.players).toHaveLength(1);
    const p = agg.players[0];
    expect(p.runsStarted).toBe(1);
    expect(p.runsCompleted).toBe(1);
    expect(p.endingsSeen).toEqual(['good']);
    expect(p.lessonsCompleted).toEqual(['learn_01']);
    expect(p.perMode[0]).toMatchObject({ mode: 'story', bestScore: 82, bestWeekReached: 12 });
    expect(p.firstSeen).toBe('2026-07-01');
    expect(p.lastSeen).toBe('2026-07-03');
  });

  it('counts the SAME seed in two campaigns as two runs (campaign in the dedup key)', () => {
    const agg = aggregate(
      [
        ev({ type: 'run_completed', seed: 'SHARED', payload: { mode: 'story', campaignId: 'probation', ending: 'good' } }),
        ev({ type: 'run_completed', seed: 'SHARED', payload: { mode: 'story', campaignId: 'audit-trail', ending: 'profi' } }),
      ],
      NOW
    );
    const p = agg.players[0];
    expect(p.runsCompleted).toBe(2);
    expect(p.endingsSeen.sort()).toEqual(['good', 'profi']);
  });

  it('still dedupes a repeated completion within the same campaign', () => {
    const agg = aggregate(
      [
        ev({ type: 'run_completed', seed: 'S', payload: { mode: 'story', campaignId: 'probation', ending: 'good' } }),
        ev({ type: 'run_completed', seed: 'S', payload: { mode: 'story', campaignId: 'probation', ending: 'good' } }),
      ],
      NOW
    );
    expect(agg.players[0].runsCompleted).toBe(1);
  });

  it('old story telemetry without campaignId falls back to probation (dedupes with a probation run)', () => {
    const agg = aggregate(
      [
        ev({ type: 'run_completed', seed: 'S', payload: { mode: 'story', ending: 'good' } }), // legacy, no campaignId
        ev({ type: 'run_completed', seed: 'S', payload: { mode: 'story', campaignId: 'probation', ending: 'good' } }),
      ],
      NOW
    );
    expect(agg.players[0].runsCompleted).toBe(1); // same (probation) run
  });

  it('keeps outcome and ending per finished run — "durchgespielt" vs "Lauf zu Ende"', () => {
    const agg = aggregate(
      [
        // Reached the last week, but no ending → never saw an ending screen.
        ev({ type: 'run_completed', seed: 's1', payload: { mode: 'story', campaignId: 'probation', outcome: 'ended', weekReached: 12, totalWeeks: 12 }, receivedAt: '2026-07-10' }),
        // A real completion of the same campaign, different seed.
        ev({ type: 'run_completed', seed: 's2', payload: { mode: 'story', campaignId: 'probation', outcome: 'ended', weekReached: 12, totalWeeks: 12, ending: 'good', score: 82 }, receivedAt: '2026-07-11' }),
      ],
      NOW
    );
    const p = agg.players[0];
    expect(p.runsCompleted).toBe(2);
    // The counter alone cannot tell these apart — the run list can.
    expect(p.completedRuns).toEqual([
      { mode: 'story', campaignId: 'probation', outcome: 'ended', weekReached: 12, totalWeeks: 12, ending: undefined, score: undefined, at: '2026-07-10' },
      { mode: 'story', campaignId: 'probation', outcome: 'ended', weekReached: 12, totalWeeks: 12, ending: 'good', score: 82, at: '2026-07-11' },
    ]);
    expect(p.endingsSeen).toEqual(['good']);
  });

  it('attributes a START to its campaign and records hidden-campaign unlocks', () => {
    const agg = aggregate(
      [
        ev({ type: 'campaign_unlocked', payload: { campaignId: 'audit-trail' }, receivedAt: '2026-07-29' }),
        ev({ type: 'run_started', seed: 's1', payload: { mode: 'story', campaignId: 'audit-trail' } }),
        ev({ type: 'run_started', seed: 's2', payload: { mode: 'story', campaignId: 'probation' } }),
        ev({ type: 'run_started', seed: 's3', payload: { mode: 'kritis' } }), // no campaign
        ev({ type: 'campaign_unlocked', payload: { campaignId: 'audit-trail' } }), // repeat
        ev({ type: 'campaign_unlocked', payload: {} }), // malformed
      ],
      NOW
    );
    const p = agg.players[0];
    expect(p.campaignsUnlocked).toEqual(['audit-trail']);
    expect(p.campaignsStarted).toEqual(['audit-trail', 'probation']);
    expect(p.runsStarted).toBe(3);
  });

  it('legacy events without campaign data leave the new fields empty', () => {
    const agg = aggregate(
      [ev({ type: 'run_started', seed: 's', payload: { mode: 'story' } })],
      NOW
    );
    expect(agg.players[0].campaignsStarted).toEqual([]);
    expect(agg.players[0].campaignsUnlocked).toEqual([]);
  });

  it('caps the per-player run list instead of growing without bound', () => {
    const many = Array.from({ length: 60 }, (_, i) =>
      ev({ type: 'run_completed', seed: `s${i}`, payload: { mode: 'kritis', outcome: 'burnout' } })
    );
    const p = aggregate(many, NOW).players[0];
    expect(p.runsCompleted).toBe(60); // counter is exact…
    expect(p.completedRuns).toHaveLength(50); // …the detail list is bounded
  });

  it('ignores events from tombstoned players entirely', () => {
    const agg = aggregate(
      [
        ev({ type: 'run_completed', seed: 's', payload: { mode: 'kritis', weekReached: 5 } }),
        ev({ type: 'player_deleted' }),
      ],
      NOW
    );
    expect(agg.players).toHaveLength(0);
  });

  it('drops events whose playerId is not a valid id', () => {
    const agg = aggregate([{ type: 'run_started', playerId: 'hacker', payload: {} }], NOW);
    expect(agg.players).toHaveLength(0);
  });
});
