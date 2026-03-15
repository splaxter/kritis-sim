import express from 'express';
import cors from 'cors';
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';

const __dirname = dirname(fileURLToPath(import.meta.url));

// In-memory test database
let testDb: SqlJsDatabase;

// DB helpers for tests
export const testDbHelpers = {
  prepare: (sql: string) => ({
    run: (...params: unknown[]) => {
      testDb.run(sql, params as (string | number | null)[]);
      return { changes: testDb.getRowsModified() };
    },
    get: (...params: unknown[]) => {
      const stmt = testDb.prepare(sql);
      stmt.bind(params as (string | number | null)[]);
      if (stmt.step()) {
        const result = stmt.getAsObject();
        stmt.free();
        return result;
      }
      stmt.free();
      return undefined;
    },
    all: (...params: unknown[]) => {
      const results: Record<string, unknown>[] = [];
      const stmt = testDb.prepare(sql);
      stmt.bind(params as (string | number | null)[]);
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      return results;
    },
  }),
};

// Create players router for tests
function createPlayersRouter() {
  const router = Router();

  router.get('/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const player = testDbHelpers.prepare('SELECT * FROM players WHERE id = ?').get(id);

      if (!player) {
        res.status(404).json({ error: 'Player not found' });
        return;
      }

      const achievements = testDbHelpers.prepare(
        'SELECT achievement_id, unlocked_at, run_number FROM player_achievements WHERE player_id = ?'
      ).all(id);

      const learnedCommands = testDbHelpers.prepare(
        'SELECT command, times_used, times_successful, first_learned_run, description FROM learned_commands WHERE player_id = ?'
      ).all(id);

      res.json({ ...player, achievements, learnedCommands });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch player' });
    }
  });

  router.post('/', (req: Request, res: Response) => {
    try {
      const id = uuid();
      testDbHelpers.prepare('INSERT INTO players (id) VALUES (?)').run(id);
      res.status(201).json({ id });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create player' });
    }
  });

  router.put('/:id/xp', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { xp } = req.body;

      if (typeof xp !== 'number' || xp < 0) {
        res.status(400).json({ error: 'Invalid XP value' });
        return;
      }

      const player = testDbHelpers.prepare('SELECT id, total_xp FROM players WHERE id = ?').get(id);

      if (!player) {
        res.status(404).json({ error: 'Player not found' });
        return;
      }

      testDbHelpers.prepare('UPDATE players SET total_xp = total_xp + ? WHERE id = ?').run(xp, id);
      const updatedPlayer = testDbHelpers.prepare('SELECT * FROM players WHERE id = ?').get(id);
      res.json(updatedPlayer);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update XP' });
    }
  });

  router.post('/:id/learn', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { command, successful, description } = req.body;

      if (!command || typeof command !== 'string') {
        res.status(400).json({ error: 'Command is required' });
        return;
      }

      if (typeof successful !== 'boolean') {
        res.status(400).json({ error: 'Successful flag is required' });
        return;
      }

      const player = testDbHelpers.prepare(
        'SELECT id, total_runs FROM players WHERE id = ?'
      ).get(id) as { id: string; total_runs: number } | undefined;

      if (!player) {
        res.status(404).json({ error: 'Player not found' });
        return;
      }

      const existingCommand = testDbHelpers.prepare(
        'SELECT * FROM learned_commands WHERE player_id = ? AND command = ?'
      ).get(id, command);

      if (existingCommand) {
        testDbHelpers.prepare(
          `UPDATE learned_commands
           SET times_used = times_used + 1,
               times_successful = times_successful + ?
           WHERE player_id = ? AND command = ?`
        ).run(successful ? 1 : 0, id, command);
      } else {
        testDbHelpers.prepare(
          `INSERT INTO learned_commands (player_id, command, times_used, times_successful, first_learned_run, description)
           VALUES (?, ?, 1, ?, ?, ?)`
        ).run(id, command, successful ? 1 : 0, player.total_runs || 1, description || null);
      }

      const updatedCommand = testDbHelpers.prepare(
        'SELECT * FROM learned_commands WHERE player_id = ? AND command = ?'
      ).get(id, command);

      res.status(existingCommand ? 200 : 201).json(updatedCommand);
    } catch (error) {
      res.status(500).json({ error: 'Failed to record learned command' });
    }
  });

  router.post('/:id/achievements', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { achievementId, runNumber } = req.body;

      if (!achievementId || typeof achievementId !== 'string') {
        res.status(400).json({ error: 'Achievement ID is required' });
        return;
      }

      const player = testDbHelpers.prepare('SELECT id FROM players WHERE id = ?').get(id);

      if (!player) {
        res.status(404).json({ error: 'Player not found' });
        return;
      }

      const existingAchievement = testDbHelpers.prepare(
        'SELECT * FROM player_achievements WHERE player_id = ? AND achievement_id = ?'
      ).get(id, achievementId);

      if (existingAchievement) {
        res.status(409).json({ error: 'Achievement already unlocked', achievement: existingAchievement });
        return;
      }

      testDbHelpers.prepare(
        `INSERT INTO player_achievements (player_id, achievement_id, run_number)
         VALUES (?, ?, ?)`
      ).run(id, achievementId, runNumber || null);

      const newAchievement = testDbHelpers.prepare(
        'SELECT * FROM player_achievements WHERE player_id = ? AND achievement_id = ?'
      ).get(id, achievementId);

      res.status(201).json(newAchievement);
    } catch (error) {
      res.status(500).json({ error: 'Failed to unlock achievement' });
    }
  });

  return router;
}

// Create saves router for tests
function createSavesRouter() {
  const router = Router();

  router.get('/:playerId', (req: Request, res: Response) => {
    try {
      const { playerId } = req.params;

      const player = testDbHelpers.prepare('SELECT id FROM players WHERE id = ?').get(playerId);

      if (!player) {
        res.status(404).json({ error: 'Player not found' });
        return;
      }

      const saves = testDbHelpers.prepare(
        `SELECT id, slot, current_week, stress, updated_at
         FROM saves WHERE player_id = ? ORDER BY slot`
      ).all(playerId);

      res.json(saves);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch saves' });
    }
  });

  router.get('/:playerId/:slot', (req: Request, res: Response) => {
    try {
      const { playerId, slot } = req.params;
      const slotNum = parseInt(slot, 10);

      if (isNaN(slotNum) || slotNum < 1) {
        res.status(400).json({ error: 'Invalid slot number' });
        return;
      }

      const player = testDbHelpers.prepare('SELECT id FROM players WHERE id = ?').get(playerId);

      if (!player) {
        res.status(404).json({ error: 'Player not found' });
        return;
      }

      const save = testDbHelpers.prepare(
        'SELECT * FROM saves WHERE player_id = ? AND slot = ?'
      ).get(playerId, slotNum) as {
        id: string;
        player_id: string;
        slot: number;
        game_state: string | null;
        current_week: number;
        stress: number;
        created_at: string;
        updated_at: string;
      } | undefined;

      if (!save) {
        res.status(404).json({ error: 'Save not found' });
        return;
      }

      let gameState = null;
      if (save.game_state) {
        try {
          gameState = JSON.parse(save.game_state);
        } catch {
          gameState = null;
        }
      }

      res.json({
        id: save.id,
        player_id: save.player_id,
        slot: save.slot,
        current_week: save.current_week,
        stress: save.stress,
        created_at: save.created_at,
        updated_at: save.updated_at,
        gameState,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch save' });
    }
  });

  router.put('/:playerId/:slot', (req: Request, res: Response) => {
    try {
      const { playerId, slot } = req.params;
      const { gameState } = req.body;
      const slotNum = parseInt(slot, 10);

      if (isNaN(slotNum) || slotNum < 1) {
        res.status(400).json({ error: 'Invalid slot number' });
        return;
      }

      if (!gameState || typeof gameState !== 'object') {
        res.status(400).json({ error: 'gameState object is required' });
        return;
      }

      const player = testDbHelpers.prepare('SELECT id FROM players WHERE id = ?').get(playerId);

      if (!player) {
        res.status(404).json({ error: 'Player not found' });
        return;
      }

      let gameStateJson: string;
      try {
        gameStateJson = JSON.stringify(gameState);
      } catch {
        res.status(400).json({ error: 'gameState contains non-serializable data' });
        return;
      }

      const currentWeek = gameState.currentWeek ?? gameState.week ?? null;
      const stress = gameState.stress ?? null;

      const existingSave = testDbHelpers.prepare(
        'SELECT id FROM saves WHERE player_id = ? AND slot = ?'
      ).get(playerId, slotNum);

      if (existingSave) {
        testDbHelpers.prepare(
          `UPDATE saves
           SET game_state = ?, current_week = ?, stress = ?, updated_at = CURRENT_TIMESTAMP
           WHERE player_id = ? AND slot = ?`
        ).run(gameStateJson, currentWeek, stress, playerId, slotNum);
      } else {
        const id = uuid();
        testDbHelpers.prepare(
          `INSERT INTO saves (id, player_id, slot, game_state, current_week, stress)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).run(id, playerId, slotNum, gameStateJson, currentWeek, stress);
      }

      res.status(existingSave ? 200 : 201).json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to save game' });
    }
  });

  router.delete('/:playerId/:slot', (req: Request, res: Response) => {
    try {
      const { playerId, slot } = req.params;
      const slotNum = parseInt(slot, 10);

      if (isNaN(slotNum) || slotNum < 1) {
        res.status(400).json({ error: 'Invalid slot number' });
        return;
      }

      const player = testDbHelpers.prepare('SELECT id FROM players WHERE id = ?').get(playerId);

      if (!player) {
        res.status(404).json({ error: 'Player not found' });
        return;
      }

      const existingSave = testDbHelpers.prepare(
        'SELECT id FROM saves WHERE player_id = ? AND slot = ?'
      ).get(playerId, slotNum);

      if (!existingSave) {
        res.status(404).json({ error: 'Save not found' });
        return;
      }

      testDbHelpers.prepare('DELETE FROM saves WHERE player_id = ? AND slot = ?').run(playerId, slotNum);

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete save' });
    }
  });

  return router;
}

export async function createTestApp() {
  // Initialize test database
  const SQL = await initSqlJs();
  testDb = new SQL.Database();

  // Run schema
  const schema = readFileSync(join(__dirname, '../db/schema.sql'), 'utf-8');
  testDb.run(schema);

  // Create express app
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Routes
  app.use('/api/players', createPlayersRouter());
  app.use('/api/saves', createSavesRouter());

  return app;
}

export function resetTestDb() {
  if (testDb) {
    testDb.run('DELETE FROM saves');
    testDb.run('DELETE FROM player_achievements');
    testDb.run('DELETE FROM learned_commands');
    testDb.run('DELETE FROM run_history');
    testDb.run('DELETE FROM players');
  }
}

export function closeTestDb() {
  if (testDb) {
    testDb.close();
  }
}
