import { Router, Request, Response } from 'express';
import { dbHelpers } from '../db/database.js';
import { v4 as uuid } from 'uuid';
import { validateGameState } from '../validation/gameStateSchema.js';

export const savesRouter = Router();

// GET /:playerId - List saves for player
savesRouter.get('/:playerId', (req: Request, res: Response) => {
  try {
    const { playerId } = req.params;

    // Check if player exists
    const player = dbHelpers.prepare(
      'SELECT id FROM players WHERE id = ?'
    ).get(playerId);

    if (!player) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }

    // Get all saves for player (without parsing gameState for list view)
    const saves = dbHelpers.prepare(
      `SELECT id, slot, current_week, stress, updated_at
       FROM saves WHERE player_id = ? ORDER BY slot`
    ).all(playerId);

    res.json(saves);
  } catch (error) {
    console.error('Error fetching saves:', error);
    res.status(500).json({ error: 'Failed to fetch saves' });
  }
});

// GET /:playerId/:slot - Get specific save with parsed gameState
savesRouter.get('/:playerId/:slot', (req: Request, res: Response) => {
  try {
    const { playerId, slot } = req.params;
    const slotNum = parseInt(slot, 10);

    if (isNaN(slotNum) || slotNum < 1) {
      res.status(400).json({ error: 'Invalid slot number' });
      return;
    }

    // Check if player exists
    const player = dbHelpers.prepare(
      'SELECT id FROM players WHERE id = ?'
    ).get(playerId);

    if (!player) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }

    // Get specific save
    const save = dbHelpers.prepare(
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

    // Parse game_state from JSON safely
    let gameState = null;
    if (save.game_state) {
      try {
        gameState = JSON.parse(save.game_state);
      } catch (parseError) {
        console.error('Failed to parse game_state for save:', save.id, parseError);
        res.status(500).json({
          error: 'Save data is corrupted',
          details: 'The saved game state could not be parsed. The save file may be damaged.',
          saveId: save.id,
        });
        return;
      }
    }

    const response = {
      id: save.id,
      player_id: save.player_id,
      slot: save.slot,
      current_week: save.current_week,
      stress: save.stress,
      created_at: save.created_at,
      updated_at: save.updated_at,
      gameState,
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching save:', error);
    res.status(500).json({ error: 'Failed to fetch save' });
  }
});

// PUT /:playerId/:slot - Create or update save
// Body: { gameState: object }
savesRouter.put('/:playerId/:slot', (req: Request, res: Response) => {
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

    // Validate gameState structure
    const validation = validateGameState(gameState);
    if (!validation.success) {
      res.status(400).json({
        error: 'Invalid game state structure',
        message: validation.error,
        details: validation.details,
      });
      return;
    }

    // Check if player exists
    const player = dbHelpers.prepare(
      'SELECT id FROM players WHERE id = ?'
    ).get(playerId);

    if (!player) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }

    // Safely serialize gameState
    let gameStateJson: string;
    try {
      gameStateJson = JSON.stringify(gameState);
    } catch {
      res.status(400).json({ error: 'gameState contains non-serializable data' });
      return;
    }

    // Extract current_week and stress from gameState if available
    const currentWeek = gameState.currentWeek ?? gameState.week ?? null;
    const stress = gameState.stress ?? null;

    // Check if save exists
    const existingSave = dbHelpers.prepare(
      'SELECT id FROM saves WHERE player_id = ? AND slot = ?'
    ).get(playerId, slotNum);

    if (existingSave) {
      // Update existing save
      dbHelpers.prepare(
        `UPDATE saves
         SET game_state = ?, current_week = ?, stress = ?, updated_at = CURRENT_TIMESTAMP
         WHERE player_id = ? AND slot = ?`
      ).run(gameStateJson, currentWeek, stress, playerId, slotNum);
    } else {
      // Create new save
      const id = uuid();
      dbHelpers.prepare(
        `INSERT INTO saves (id, player_id, slot, game_state, current_week, stress)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(id, playerId, slotNum, gameStateJson, currentWeek, stress);
    }

    res.status(existingSave ? 200 : 201).json({ success: true });
  } catch (error) {
    console.error('Error saving game:', error);
    res.status(500).json({ error: 'Failed to save game' });
  }
});

// DELETE /:playerId/:slot - Delete save
savesRouter.delete('/:playerId/:slot', (req: Request, res: Response) => {
  try {
    const { playerId, slot } = req.params;
    const slotNum = parseInt(slot, 10);

    if (isNaN(slotNum) || slotNum < 1) {
      res.status(400).json({ error: 'Invalid slot number' });
      return;
    }

    // Check if player exists
    const player = dbHelpers.prepare(
      'SELECT id FROM players WHERE id = ?'
    ).get(playerId);

    if (!player) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }

    // Check if save exists
    const existingSave = dbHelpers.prepare(
      'SELECT id FROM saves WHERE player_id = ? AND slot = ?'
    ).get(playerId, slotNum);

    if (!existingSave) {
      res.status(404).json({ error: 'Save not found' });
      return;
    }

    // Delete the save
    dbHelpers.prepare(
      'DELETE FROM saves WHERE player_id = ? AND slot = ?'
    ).run(playerId, slotNum);

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting save:', error);
    res.status(500).json({ error: 'Failed to delete save' });
  }
});
