import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'

let db: Database.Database

export function getDB(): Database.Database {
  return db
}

export function initDB(): void {
  const userDataPath = app.getPath('userData')
  const dbPath = path.join(userDataPath, 'artifactscope.db')

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('synchronous = NORMAL')

  runMigrations()
}

function runMigrations(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cases (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      case_number  TEXT UNIQUE NOT NULL,
      investigator TEXT NOT NULL,
      agency       TEXT DEFAULT '',
      status       TEXT NOT NULL DEFAULT 'open',
      priority     TEXT NOT NULL DEFAULT 'medium',
      description  TEXT DEFAULT '',
      tags         TEXT DEFAULT '',
      created_at   TEXT NOT NULL,
      updated_at   TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS evidence (
      id           TEXT PRIMARY KEY,
      case_id      TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      name         TEXT NOT NULL,
      type         TEXT NOT NULL,
      source_path  TEXT DEFAULT '',
      md5          TEXT DEFAULT '',
      sha256       TEXT DEFAULT '',
      size_bytes   INTEGER DEFAULT 0,
      notes        TEXT DEFAULT '',
      added_at     TEXT NOT NULL,
      added_by     TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS custody (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id      TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      action       TEXT NOT NULL,
      actor        TEXT NOT NULL,
      description  TEXT DEFAULT '',
      timestamp    TEXT NOT NULL,
      prev_hash    TEXT DEFAULT '',
      row_hash     TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS hashes (
      hash         TEXT PRIMARY KEY,
      algorithm    TEXT NOT NULL DEFAULT 'sha256',
      classification TEXT NOT NULL DEFAULT 'unknown',
      filename     TEXT DEFAULT '',
      notes        TEXT DEFAULT '',
      added_at     TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type   TEXT NOT NULL,
      description  TEXT NOT NULL,
      case_id      TEXT DEFAULT NULL,
      timestamp    TEXT NOT NULL,
      prev_hash    TEXT DEFAULT '',
      row_hash     TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_evidence_case    ON evidence(case_id);
    CREATE INDEX IF NOT EXISTS idx_custody_case     ON custody(case_id);
    CREATE INDEX IF NOT EXISTS idx_activity_type    ON activity(event_type);
    CREATE INDEX IF NOT EXISTS idx_activity_ts      ON activity(timestamp);
    CREATE INDEX IF NOT EXISTS idx_hashes_class     ON hashes(classification);
  `)

  // Seed default settings
  const defaults: Record<string, string> = {
    investigator_name:  '',
    agency:             '',
    virustotal_api_key: '',
    theme:              'dark',
    default_hash_algo:  'sha256',
  }
  const insertSetting = db.prepare(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
  )
  const tx = db.transaction(() => {
    for (const [k, v] of Object.entries(defaults)) insertSetting.run(k, v)
  })
  tx()
}
