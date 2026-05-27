import { getDB } from './index'
import { createHash } from 'crypto'

export interface ActivityRow {
  id: number
  event_type: string
  description: string
  case_id: string | null
  timestamp: string
  prev_hash: string
  row_hash: string
}

export function listActivity(limit = 200): ActivityRow[] {
  return getDB().prepare('SELECT * FROM activity ORDER BY id DESC LIMIT ?').all(limit) as ActivityRow[]
}

export function searchActivity(query: string): ActivityRow[] {
  return getDB().prepare(
    "SELECT * FROM activity WHERE description LIKE ? OR event_type LIKE ? ORDER BY id DESC LIMIT 500"
  ).all(`%${query}%`, `%${query}%`) as ActivityRow[]
}

export function addActivity(event_type: string, description: string, case_id?: string): ActivityRow {
  const db = getDB()
  const lastRow = db.prepare('SELECT row_hash FROM activity ORDER BY id DESC LIMIT 1').get() as { row_hash: string } | undefined
  const prev_hash = lastRow?.row_hash ?? ''
  const timestamp = new Date().toISOString()
  const payload = JSON.stringify({ event_type, description, case_id, timestamp, prev_hash })
  const row_hash = createHash('sha256').update(payload).digest('hex')
  const result = db.prepare(`
    INSERT INTO activity (event_type, description, case_id, timestamp, prev_hash, row_hash)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(event_type, description, case_id ?? null, timestamp, prev_hash, row_hash)
  return db.prepare('SELECT * FROM activity WHERE id = ?').get(result.lastInsertRowid) as ActivityRow
}

// Settings helpers
export function getSettings(): Record<string, string> {
  const rows = getDB().prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]
  return Object.fromEntries(rows.map(r => [r.key, r.value]))
}

export function setSettings(data: Record<string, string>): void {
  const db = getDB()
  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
  const tx = db.transaction(() => {
    for (const [k, v] of Object.entries(data)) upsert.run(k, String(v))
  })
  tx()
}
