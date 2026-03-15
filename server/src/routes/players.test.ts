import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp, resetTestDb, closeTestDb } from '../test/testApp.js';
import type { Express } from 'express';

let app: Express;

beforeAll(async () => {
  app = await createTestApp();
});

afterAll(() => {
  closeTestDb();
});

beforeEach(() => {
  resetTestDb();
});

describe('Players API', () => {
  describe('POST /api/players', () => {
    it('creates a new player and returns id', async () => {
      const res = await request(app).post('/api/players').send();

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('creates unique ids for multiple players', async () => {
      const res1 = await request(app).post('/api/players').send();
      const res2 = await request(app).post('/api/players').send();

      expect(res1.body.id).not.toBe(res2.body.id);
    });
  });

  describe('GET /api/players/:id', () => {
    it('returns 404 for non-existent player', async () => {
      const res = await request(app).get('/api/players/non-existent-id');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Player not found');
    });

    it('returns player with achievements and learned commands', async () => {
      // Create player
      const createRes = await request(app).post('/api/players').send();
      const playerId = createRes.body.id;

      // Get player
      const res = await request(app).get(`/api/players/${playerId}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(playerId);
      expect(res.body.achievements).toEqual([]);
      expect(res.body.learnedCommands).toEqual([]);
      expect(res.body.total_xp).toBe(0);
      expect(res.body.total_runs).toBe(0);
    });

    it('includes achievements when present', async () => {
      // Create player
      const createRes = await request(app).post('/api/players').send();
      const playerId = createRes.body.id;

      // Add achievement
      await request(app)
        .post(`/api/players/${playerId}/achievements`)
        .send({ achievementId: 'first_win', runNumber: 1 });

      // Get player
      const res = await request(app).get(`/api/players/${playerId}`);

      expect(res.body.achievements).toHaveLength(1);
      expect(res.body.achievements[0].achievement_id).toBe('first_win');
    });

    it('includes learned commands when present', async () => {
      // Create player
      const createRes = await request(app).post('/api/players').send();
      const playerId = createRes.body.id;

      // Add learned command
      await request(app)
        .post(`/api/players/${playerId}/learn`)
        .send({ command: 'ls -la', successful: true, description: 'List files' });

      // Get player
      const res = await request(app).get(`/api/players/${playerId}`);

      expect(res.body.learnedCommands).toHaveLength(1);
      expect(res.body.learnedCommands[0].command).toBe('ls -la');
    });
  });

  describe('PUT /api/players/:id/xp', () => {
    it('returns 404 for non-existent player', async () => {
      const res = await request(app)
        .put('/api/players/non-existent-id/xp')
        .send({ xp: 100 });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Player not found');
    });

    it('returns 400 for invalid XP value', async () => {
      const createRes = await request(app).post('/api/players').send();
      const playerId = createRes.body.id;

      const res = await request(app)
        .put(`/api/players/${playerId}/xp`)
        .send({ xp: -100 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid XP value');
    });

    it('returns 400 for non-numeric XP', async () => {
      const createRes = await request(app).post('/api/players').send();
      const playerId = createRes.body.id;

      const res = await request(app)
        .put(`/api/players/${playerId}/xp`)
        .send({ xp: 'invalid' });

      expect(res.status).toBe(400);
    });

    it('adds XP to player', async () => {
      const createRes = await request(app).post('/api/players').send();
      const playerId = createRes.body.id;

      const res = await request(app)
        .put(`/api/players/${playerId}/xp`)
        .send({ xp: 150 });

      expect(res.status).toBe(200);
      expect(res.body.total_xp).toBe(150);
    });

    it('accumulates XP across multiple additions', async () => {
      const createRes = await request(app).post('/api/players').send();
      const playerId = createRes.body.id;

      await request(app).put(`/api/players/${playerId}/xp`).send({ xp: 100 });
      await request(app).put(`/api/players/${playerId}/xp`).send({ xp: 50 });
      const res = await request(app).put(`/api/players/${playerId}/xp`).send({ xp: 25 });

      expect(res.body.total_xp).toBe(175);
    });
  });

  describe('POST /api/players/:id/learn', () => {
    it('returns 404 for non-existent player', async () => {
      const res = await request(app)
        .post('/api/players/non-existent-id/learn')
        .send({ command: 'ls', successful: true });

      expect(res.status).toBe(404);
    });

    it('returns 400 when command is missing', async () => {
      const createRes = await request(app).post('/api/players').send();
      const playerId = createRes.body.id;

      const res = await request(app)
        .post(`/api/players/${playerId}/learn`)
        .send({ successful: true });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Command is required');
    });

    it('returns 400 when successful flag is missing', async () => {
      const createRes = await request(app).post('/api/players').send();
      const playerId = createRes.body.id;

      const res = await request(app)
        .post(`/api/players/${playerId}/learn`)
        .send({ command: 'ls' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Successful flag is required');
    });

    it('creates new learned command', async () => {
      const createRes = await request(app).post('/api/players').send();
      const playerId = createRes.body.id;

      const res = await request(app)
        .post(`/api/players/${playerId}/learn`)
        .send({ command: 'grep -r', successful: true, description: 'Recursive search' });

      expect(res.status).toBe(201);
      expect(res.body.command).toBe('grep -r');
      expect(res.body.times_used).toBe(1);
      expect(res.body.times_successful).toBe(1);
      expect(res.body.description).toBe('Recursive search');
    });

    it('updates existing learned command', async () => {
      const createRes = await request(app).post('/api/players').send();
      const playerId = createRes.body.id;

      // First use
      await request(app)
        .post(`/api/players/${playerId}/learn`)
        .send({ command: 'ls', successful: true });

      // Second use (failed)
      const res = await request(app)
        .post(`/api/players/${playerId}/learn`)
        .send({ command: 'ls', successful: false });

      expect(res.status).toBe(200);
      expect(res.body.times_used).toBe(2);
      expect(res.body.times_successful).toBe(1);
    });

    it('tracks multiple commands separately', async () => {
      const createRes = await request(app).post('/api/players').send();
      const playerId = createRes.body.id;

      await request(app)
        .post(`/api/players/${playerId}/learn`)
        .send({ command: 'ls', successful: true });

      await request(app)
        .post(`/api/players/${playerId}/learn`)
        .send({ command: 'cd', successful: true });

      // Get player to verify
      const playerRes = await request(app).get(`/api/players/${playerId}`);

      expect(playerRes.body.learnedCommands).toHaveLength(2);
    });
  });

  describe('POST /api/players/:id/achievements', () => {
    it('returns 404 for non-existent player', async () => {
      const res = await request(app)
        .post('/api/players/non-existent-id/achievements')
        .send({ achievementId: 'test' });

      expect(res.status).toBe(404);
    });

    it('returns 400 when achievementId is missing', async () => {
      const createRes = await request(app).post('/api/players').send();
      const playerId = createRes.body.id;

      const res = await request(app)
        .post(`/api/players/${playerId}/achievements`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Achievement ID is required');
    });

    it('unlocks achievement', async () => {
      const createRes = await request(app).post('/api/players').send();
      const playerId = createRes.body.id;

      const res = await request(app)
        .post(`/api/players/${playerId}/achievements`)
        .send({ achievementId: 'survivor', runNumber: 5 });

      expect(res.status).toBe(201);
      expect(res.body.achievement_id).toBe('survivor');
      expect(res.body.run_number).toBe(5);
      expect(res.body).toHaveProperty('unlocked_at');
    });

    it('returns 409 when achievement already unlocked', async () => {
      const createRes = await request(app).post('/api/players').send();
      const playerId = createRes.body.id;

      // First unlock
      await request(app)
        .post(`/api/players/${playerId}/achievements`)
        .send({ achievementId: 'first_win' });

      // Try to unlock again
      const res = await request(app)
        .post(`/api/players/${playerId}/achievements`)
        .send({ achievementId: 'first_win' });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Achievement already unlocked');
      expect(res.body.achievement).toBeDefined();
    });

    it('handles achievement without runNumber', async () => {
      const createRes = await request(app).post('/api/players').send();
      const playerId = createRes.body.id;

      const res = await request(app)
        .post(`/api/players/${playerId}/achievements`)
        .send({ achievementId: 'special_event' });

      expect(res.status).toBe(201);
      expect(res.body.achievement_id).toBe('special_event');
      expect(res.body.run_number).toBeNull();
    });
  });
});
