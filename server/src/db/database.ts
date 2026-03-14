import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DB_PATH = process.env.DATABASE_PATH || join(__dirname, '../../data/kritis.db');

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

export function initializeDatabase(): void {
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  db.exec(schema);
  console.log('Database initialized');
}
