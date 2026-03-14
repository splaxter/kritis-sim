import { Router, Request, Response } from 'express';
import { dbHelpers } from '../db/database.js';
import { v4 as uuid } from 'uuid';

export const playersRouter = Router();

// GET /:id - Get player by ID
// Returns player with achievements and learnedCommands arrays
playersRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get player
    const player = dbHelpers.prepare(
      'SELECT * FROM players WHERE id = ?'
    ).get(id);

    if (!player) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }

    // Get achievements
    const achievements = dbHelpers.prepare(
      'SELECT achievement_id, unlocked_at, run_number FROM player_achievements WHERE player_id = ?'
    ).all(id);

    // Get learned commands
    const learnedCommands = dbHelpers.prepare(
      'SELECT command, times_used, times_successful, first_learned_run, description FROM learned_commands WHERE player_id = ?'
    ).all(id);

    res.json({
      ...player,
      achievements,
      learnedCommands,
    });
  } catch (error) {
    console.error('Error fetching player:', error);
    res.status(500).json({ error: 'Failed to fetch player' });
  }
});

// POST / - Create new player
// Returns { id: uuid }
playersRouter.post('/', (req: Request, res: Response) => {
  try {
    const id = uuid();

    dbHelpers.prepare(
      'INSERT INTO players (id) VALUES (?)'
    ).run(id);

    res.status(201).json({ id });
  } catch (error) {
    console.error('Error creating player:', error);
    res.status(500).json({ error: 'Failed to create player' });
  }
});

// PUT /:id/xp - Add XP to player
// Body: { xp: number }
playersRouter.put('/:id/xp', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { xp } = req.body;

    if (typeof xp !== 'number' || xp < 0) {
      res.status(400).json({ error: 'Invalid XP value' });
      return;
    }

    // Check if player exists
    const player = dbHelpers.prepare(
      'SELECT id, total_xp FROM players WHERE id = ?'
    ).get(id);

    if (!player) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }

    // Update XP
    const result = dbHelpers.prepare(
      'UPDATE players SET total_xp = total_xp + ? WHERE id = ?'
    ).run(xp, id);

    // Get updated player
    const updatedPlayer = dbHelpers.prepare(
      'SELECT * FROM players WHERE id = ?'
    ).get(id);

    res.json(updatedPlayer);
  } catch (error) {
    console.error('Error updating XP:', error);
    res.status(500).json({ error: 'Failed to update XP' });
  }
});

// POST /:id/learn - Record learned command
// Body: { command: string, successful: boolean, description?: string }
playersRouter.post('/:id/learn', (req: Request, res: Response) => {
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

    // Check if player exists
    const player = dbHelpers.prepare(
      'SELECT id, total_runs FROM players WHERE id = ?'
    ).get(id) as { id: string; total_runs: number } | undefined;

    if (!player) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }

    // Check if command already learned
    const existingCommand = dbHelpers.prepare(
      'SELECT * FROM learned_commands WHERE player_id = ? AND command = ?'
    ).get(id, command);

    if (existingCommand) {
      // Update existing command
      dbHelpers.prepare(
        `UPDATE learned_commands
         SET times_used = times_used + 1,
             times_successful = times_successful + ?
         WHERE player_id = ? AND command = ?`
      ).run(successful ? 1 : 0, id, command);
    } else {
      // Insert new command
      dbHelpers.prepare(
        `INSERT INTO learned_commands (player_id, command, times_used, times_successful, first_learned_run, description)
         VALUES (?, ?, 1, ?, ?, ?)`
      ).run(id, command, successful ? 1 : 0, player.total_runs || 1, description || null);
    }

    // Return the updated command record
    const updatedCommand = dbHelpers.prepare(
      'SELECT * FROM learned_commands WHERE player_id = ? AND command = ?'
    ).get(id, command);

    res.status(existingCommand ? 200 : 201).json(updatedCommand);
  } catch (error) {
    console.error('Error recording learned command:', error);
    res.status(500).json({ error: 'Failed to record learned command' });
  }
});

// POST /:id/achievements - Unlock achievement
// Body: { achievementId: string, runNumber?: number }
playersRouter.post('/:id/achievements', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { achievementId, runNumber } = req.body;

    if (!achievementId || typeof achievementId !== 'string') {
      res.status(400).json({ error: 'Achievement ID is required' });
      return;
    }

    // Check if player exists
    const player = dbHelpers.prepare(
      'SELECT id FROM players WHERE id = ?'
    ).get(id);

    if (!player) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }

    // Check if achievement already unlocked
    const existingAchievement = dbHelpers.prepare(
      'SELECT * FROM player_achievements WHERE player_id = ? AND achievement_id = ?'
    ).get(id, achievementId);

    if (existingAchievement) {
      res.status(409).json({ error: 'Achievement already unlocked', achievement: existingAchievement });
      return;
    }

    // Insert new achievement
    dbHelpers.prepare(
      `INSERT INTO player_achievements (player_id, achievement_id, run_number)
       VALUES (?, ?, ?)`
    ).run(id, achievementId, runNumber || null);

    // Return the new achievement record
    const newAchievement = dbHelpers.prepare(
      'SELECT * FROM player_achievements WHERE player_id = ? AND achievement_id = ?'
    ).get(id, achievementId);

    res.status(201).json(newAchievement);
  } catch (error) {
    console.error('Error unlocking achievement:', error);
    res.status(500).json({ error: 'Failed to unlock achievement' });
  }
});
