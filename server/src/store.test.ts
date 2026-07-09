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
