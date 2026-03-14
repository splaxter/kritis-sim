-- Players (persistent meta-progression)
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  total_runs INTEGER DEFAULT 0,
  completed_runs INTEGER DEFAULT 0,
  best_week INTEGER DEFAULT 0,
  career_level TEXT DEFAULT 'praktikant',
  total_xp INTEGER DEFAULT 0
);

-- Learned commands (persist across runs)
CREATE TABLE IF NOT EXISTS learned_commands (
  player_id TEXT REFERENCES players(id),
  command TEXT,
  times_used INTEGER DEFAULT 0,
  times_successful INTEGER DEFAULT 0,
  first_learned_run INTEGER,
  description TEXT,
  PRIMARY KEY (player_id, command)
);

-- Player achievements
CREATE TABLE IF NOT EXISTS player_achievements (
  player_id TEXT REFERENCES players(id),
  achievement_id TEXT,
  unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  run_number INTEGER,
  PRIMARY KEY (player_id, achievement_id)
);

-- Save games
CREATE TABLE IF NOT EXISTS saves (
  id TEXT PRIMARY KEY,
  player_id TEXT REFERENCES players(id),
  slot INTEGER DEFAULT 1,
  game_state TEXT,
  current_week INTEGER,
  stress INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(player_id, slot)
);

-- Run history
CREATE TABLE IF NOT EXISTS run_history (
  id TEXT PRIMARY KEY,
  player_id TEXT REFERENCES players(id),
  run_number INTEGER,
  outcome TEXT,
  week_reached INTEGER,
  final_skills TEXT,
  final_relationships TEXT,
  commands_used TEXT,
  events_completed TEXT,
  seed TEXT,
  started_at DATETIME,
  ended_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
