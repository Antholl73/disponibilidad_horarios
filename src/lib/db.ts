import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const globalForDb = globalThis as unknown as {
  dbInstance?: DatabaseSync;
};

export function getDatabase(): DatabaseSync {
  if (!globalForDb.dbInstance) {
    const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NODE_ENV === 'production' && !fs.existsSync(path.join(process.cwd(), 'data')));
    const dataDir = isServerless ? '/tmp' : path.join(process.cwd(), 'data');

    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch {
        // Fallback to /tmp if current directory is not writable
      }
    }

    const dbPath = path.join(dataDir, 'disponibilidad.db');
    const db = new DatabaseSync(dbPath);

    // Optimize settings and enable foreign keys
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA foreign_keys = ON;');

    // Initialize tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        dates TEXT NOT NULL,
        start_hour INTEGER NOT NULL,
        end_hour INTEGER NOT NULL,
        slot_duration INTEGER NOT NULL DEFAULT 30,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS participants (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        name TEXT NOT NULL,
        slots TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_participants_event ON participants(event_id);
    `);

    globalForDb.dbInstance = db;
  }

  return globalForDb.dbInstance;
}
