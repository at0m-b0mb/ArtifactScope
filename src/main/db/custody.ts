import { getDB } from './index'
import { createHash } from 'crypto'

export interface CustodyRow {
  id: number
  case_id: string
  action: string
  actor: string
  description: string
  timestamp: string
  prev_hash: string
  row_hash: string
}

export function listCustody(caseId: string): CustodyRow[] {
  return getDB().prepare('SELECT * FROM custody WHERE case_id = ? ORDER BY id ASC').all(caseId) as CustodyRow[]
}

export function addCustody(data: Omit<CustodyRow, 'id' | 'prev_hash' | 'row_hash'>): CustodyRow {
  const db = getDB()
  const lastRow = db.prepare('SELECT row_hash FROM custody WHERE case_id = ? ORDER BY id DESC LIMIT 1').get(data.case_id) as { row_hash: string } | undefined
  const prev_hash = lastRow?.row_hash ?? ''
  const payload = JSON.stringify({ ...data, prev_hash })
  const row_hash = createHash('sha256').update(payload).digest('hex')

  const result = db.prepare(`
    INSERT INTO custody (case_id, action, actor, description, timestamp, prev_hash, row_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(data.case_id, data.action, data.actor, data.description ?? '', data.timestamp, prev_hash, row_hash)

  return db.prepare('SELECT * FROM custody WHERE id = ?').get(result.lastInsertRowid) as CustodyRow
}
