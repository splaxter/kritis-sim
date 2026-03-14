export type CareerLevel =
  | 'praktikant'
  | 'azubi'
  | 'junior'
  | 'admin'
  | 'senior'
  | 'it_leiter';

export interface LearnedCommand {
  command: string;
  timesUsed: number;
  timesSuccessful: number;
  firstLearnedRun: number;
  description?: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  hidden: boolean;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface PlayerMeta {
  id: string;
  totalRuns: number;
  completedRuns: number;
  bestWeekReached: number;
  careerLevel: CareerLevel;
  totalXp: number;
  achievements: string[];
  learnedCommands: LearnedCommand[];
}

export interface SaveGame {
  id: string;
  playerId: string;
  slot: number;
  gameState: string;
  currentWeek: number;
  stress: number;
  updatedAt: string;
}
