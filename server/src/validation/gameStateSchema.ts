/**
 * Zod schema for validating GameState on save operations
 */
import { z } from 'zod';

// Skills schema
const SkillsSchema = z.object({
  netzwerk: z.number().min(0).max(100),
  linux: z.number().min(0).max(100),
  windows: z.number().min(0).max(100),
  security: z.number().min(0).max(100),
  troubleshooting: z.number().min(0).max(100),
  softSkills: z.number().min(0).max(100),
});

// Relationships schema
const RelationshipsSchema = z.object({
  chef: z.number().min(-100).max(100),
  gf: z.number().min(-100).max(100),
  kaemmerer: z.number().min(-100).max(100),
  fachabteilung: z.number().min(-100).max(100),
  kollegen: z.number().min(-100).max(100),
});

// Game mode IDs
const GameModeIdSchema = z.enum([
  'beginner',
  'intermediate',
  'hard',
  'kritis',
  'arcade',
  'adventure',
]);

// Adventure state schema (simplified - validates structure exists)
const AdventureStateSchema = z.object({
  currentChapter: z.string(),
  currentBeatIndex: z.number().min(0),
  completedChapters: z.array(z.string()),
  activeSidequests: z.array(z.string()),
  completedSidequests: z.array(z.string()),
  sidequestProgress: z.record(z.string(), z.number()),
  characterMemory: z.record(z.string(), z.any()),
  totalBeatsCompleted: z.number().min(0),
}).optional();

// Main GameState schema
export const GameStateSchema = z.object({
  // Core game progress
  currentWeek: z.number().min(1).max(52),
  currentDay: z.number().min(1).max(7),

  // Player stats
  skills: SkillsSchema,
  relationships: RelationshipsSchema,
  stress: z.number().min(0).max(100),
  budget: z.number().min(0),
  compliance: z.number().min(0).max(100),

  // Game tracking
  activeEvents: z.array(z.string()),
  completedEvents: z.array(z.string()),
  completedScenarios: z.array(z.string()),
  flags: z.record(z.string(), z.boolean()),
  unlockedCommands: z.array(z.string()),
  terminalHistory: z.array(z.string()),

  // Game identity
  seed: z.string().min(1),
  runNumber: z.number().min(1),
  gameMode: GameModeIdSchema,

  // Arcade mode specific (optional)
  arcadeScore: z.number().min(0).optional(),
  comboMultiplier: z.number().min(1).optional(),
  comboStreak: z.number().min(0).optional(),

  // Adventure mode specific
  isStoryMode: z.boolean(),
  storyState: AdventureStateSchema,
});

export type ValidatedGameState = z.infer<typeof GameStateSchema>;

/**
 * Validate a game state object
 * Returns { success: true, data: GameState } or { success: false, error: string }
 */
export function validateGameState(data: unknown): {
  success: true;
  data: ValidatedGameState;
} | {
  success: false;
  error: string;
  details: z.ZodIssue[];
} {
  const result = GameStateSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Format error message
  const errorMessages = result.error.issues.map((e: z.ZodIssue) =>
    `${e.path.join('.')}: ${e.message}`
  ).join('; ');

  return {
    success: false,
    error: `Invalid game state: ${errorMessages}`,
    details: result.error.issues,
  };
}
