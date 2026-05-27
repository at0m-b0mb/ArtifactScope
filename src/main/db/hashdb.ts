import { getDB } from './index'
import fs from 'fs'
import readline from 'readline'

export interface HashRow {
  hash: string
  algorithm: string
  classification: string
  filename: string
  notes: string
  added_at: string
}

export function listHashes(limit = 1000): HashRow[] {
  return getDB().prepare('SELECT * FROM hashes ORDER BY added_at DESC LIMIT ?').all(limit) as HashRow[]
}

export function lookupHash(hash: string): HashRow | null {
  const row = getDB().prepare('SELECT * FROM hashes WHERE hash = ?').get(hash.toLowerCase()) as HashRow | undefined
  return row ?? null
}

export function addHash(entry: Omit<HashRow, 'added_at'>): HashRow {
  const db = getDB()
  const now = new Date().toISOString()
  db.prepare(`
    INSERT OR REPLACE INTO hashes (hash, algorithm, classification, filename, notes, added_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(entry.hash.toLowerCase(), entry.algorithm ?? 'sha256', entry.classification ?? 'unknown', entry.filename ?? '', entry.notes ?? '', now)
  return lookupHash(entry.hash)!
}

export function deleteHash(hash: string): void {
  getDB().prepare('DELETE FROM hashes WHERE hash = ?').run(hash.toLowerCase())
}

export function getStats(): { total: number; known_good: number; known_bad: number; suspicious: number; unknown: number } {
  const db = getDB()
  const total        = (db.prepare('SELECT COUNT(*) as c FROM hashes').get() as { c: number }).c
  const known_good   = (db.prepare("SELECT COUNT(*) as c FROM hashes WHERE classification='known_good'").get() as { c: number }).c
  const known_bad    = (db.prepare("SELECT COUNT(*) as c FROM hashes WHERE classification='known_bad'").get() as { c: number }).c
  const suspicious   = (db.prepare("SELECT COUNT(*) as c FROM hashes WHERE classification='suspicious'").get() as { c: number }).c
  const unknown      = (db.prepare("SELECT COUNT(*) as c FROM hashes WHERE classification='unknown'").get() as { c: number }).c
  return { total, known_good, known_bad, suspicious, unknown }
}

export async function importCSV(filePath: string): Promise<{ imported: number; skipped: number }> {
  const db = getDB()
  const insert = db.prepare(`
    INSERT OR IGNORE INTO hashes (hash, algorithm, classification, filename, notes, added_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  const now = new Date().toISOString()
  let imported = 0, skipped = 0

  const rl = readline.createInterface({ input: fs.createReadStream(filePath) })
  const tx = db.transaction((lines: string[]) => {
    for (const line of lines) {
      const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''))
      if (!parts[0] || parts[0].length < 32) { skipped++; continue }
      insert.run(parts[0].toLowerCase(), parts[1] || 'sha256', parts[2] || 'unknown', parts[3] || '', parts[4] || '', now)
      imported++
    }
  })

  const lines: string[] = []
  for await (const line of rl) {
    if (!line.startsWith('#') && !line.toLowerCase().startsWith('hash')) {
      lines.push(line)
    }
  }
  tx(lines)
  return { imported, skipped }
}
