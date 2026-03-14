import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DB_PATH = process.env.DATABASE_PATH || join(__dirname, '../../data/kritis.db');

let db: SqlJsDatabase;

export function getDb(): SqlJsDatabase {
  return db;
}

export async function initializeDatabase(): Promise<void> {
  const SQL = await initSqlJs();

  // Ensure data directory exists
  const dataDir = dirname(DB_PATH);
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  // Load existing database or create new one
  if (existsSync(DB_PATH)) {
    const fileBuffer = readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Run schema
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  db.run(schema);

  // Save to disk
  saveDatabase();

  console.log('Database initialized');
}

export function saveDatabase(): void {
  const data = db.export();
  const buffer = Buffer.from(data);
  writeFileSync(DB_PATH, buffer);
}

// Helper to run queries similar to better-sqlite3 API
export const dbHelpers = {
  prepare: (sql: string) => ({
    run: (...params: unknown[]) => {
      db.run(sql, params as (string | number | null)[]);
      saveDatabase();
      return { changes: db.getRowsModified() };
    },
    get: (...params: unknown[]) => {
      const stmt = db.prepare(sql);
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
      const stmt = db.prepare(sql);
      stmt.bind(params as (string | number | null)[]);
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      return results;
    },
  }),
};
