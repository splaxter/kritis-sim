import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createApp } from './app.js';

let dir: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(join(tmpdir(), 'kritis-track-'));
  process.env.DATA_DIR = dir;
  delete process.env.STATS_TOKEN;
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

function runEvent(over: Record<string, unknown> = {}) {
  return {
    v: 1,
    type: 'run_completed',
    playerId: 'player-abc12',
    playerName: 'Timo',
    ts: '2026-07-09T10:00:00.000Z',
    seed: 'SEED1',
    payload: { mode: 'kritis', outcome: 'burnout', weekReached: 14, totalWeeks: 24, survived: false, score: 0, decisions: [] },
    ...over,
  };
}

describe('POST /api/track', () => {
  it('accepts a valid event and surfaces it in the aggregate', async () => {
    const app = createApp();
    const post = await request(app).post('/api/track').send(runEvent());
    expect(post.status).toBe(202);
    expect(post.body).toEqual({ accepted: 1, rejected: 0 });

    process.env.STATS_TOKEN = 'secret';
    const stats = await request(app).get('/api/stats?token=secret');
    expect(stats.status).toBe(200);
    expect(stats.body.players).toHaveLength(1);
    const p = stats.body.players[0];
    expect(p.name).toBe('Timo');
    expect(p.runsCompleted).toBe(1);
    expect(p.perMode[0]).toMatchObject({ mode: 'kritis', bestWeekReached: 14 });
  });

  it('drops events with bad playerId or unknown type', async () => {
    const app = createApp();
    const res = await request(app).post('/api/track').send([
      runEvent({ playerId: 'nope' }),
      runEvent({ type: 'evil' }),
      runEvent(),
    ]);
    expect(res.body).toEqual({ accepted: 1, rejected: 2 });
  });

  it('rejects an oversized batch', async () => {
    const app = createApp();
    const big = Array.from({ length: 51 }, () => runEvent());
    const res = await request(app).post('/api/track').send(big);
    expect(res.status).toBe(400);
  });

  it('dedupes run_completed by (player, seed)', async () => {
    const app = createApp();
    await request(app).post('/api/track').send(runEvent());
    await request(app).post('/api/track').send(runEvent()); // same seed, retry

    process.env.STATS_TOKEN = 't';
    const stats = await request(app).get('/api/stats?token=t');
    expect(stats.body.players[0].runsCompleted).toBe(1);
  });
});

describe('token gating', () => {
  it('404s /api/stats when STATS_TOKEN is unset', async () => {
    const app = createApp();
    expect((await request(app).get('/api/stats')).status).toBe(404);
    expect((await request(app).get('/stats')).status).toBe(404);
  });

  it('403s on a wrong token, 200s on the right one', async () => {
    const app = createApp();
    process.env.STATS_TOKEN = 'right';
    expect((await request(app).get('/api/stats?token=wrong')).status).toBe(403);
    expect((await request(app).get('/api/stats?token=right')).status).toBe(200);
  });

  it('renders the HTML stats page with the right token', async () => {
    const app = createApp();
    await request(app).post('/api/track').send(runEvent({ playerName: 'Timo' }));
    process.env.STATS_TOKEN = 'right';
    const res = await request(app).get('/stats?token=right');
    expect(res.status).toBe(200);
    expect(res.text).toContain('TEAM-STATISTIK');
    expect(res.text).toContain('Timo');
  });
});

describe('DELETE /api/player/:id (right to erasure)', () => {
  it('tombstones a player so they vanish from the aggregate', async () => {
    const app = createApp();
    await request(app).post('/api/track').send(runEvent());
    process.env.STATS_TOKEN = 't';
    expect((await request(app).get('/api/stats?token=t')).body.players).toHaveLength(1);

    const del = await request(app).delete('/api/player/player-abc12?token=t');
    expect(del.status).toBe(204);
    expect((await request(app).get('/api/stats?token=t')).body.players).toHaveLength(0);
  });

  it('403s deletion without the token', async () => {
    const app = createApp();
    process.env.STATS_TOKEN = 't';
    expect((await request(app).delete('/api/player/player-abc12')).status).toBe(403);
  });
});

describe('GET /api/health', () => {
  it('still returns ok (unchanged contract)', async () => {
    const res = await request(createApp()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
