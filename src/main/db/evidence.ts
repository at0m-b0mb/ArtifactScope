import { getDB } from './index'
import { randomUUID } from 'crypto'

export interface EvidenceRow {
  id: string
  case_id: string
  name: string
  type: string
  source_path: string
  md5: string
  sha256: string
  size_bytes: number
  notes: string
  added_at: string
  added_by: string
}

export function listEvidence(caseId: string): EvidenceRow[] {
  return getDB().prepare('SELECT * FROM evidence WHERE case_id = ? ORDER BY added_at DESC').all(caseId) as EvidenceRow[]
}

export function addEvidence(data: Omit<EvidenceRow, 'id' | 'added_at'>): EvidenceRow {
  const db = getDB()
  const id = randomUUID()
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO evidence (id, case_id, name, type, source_path, md5, sha256, size_bytes, notes, added_at, added_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.case_id, data.name, data.type, data.source_path ?? '', data.md5 ?? '', data.sha256 ?? '', data.size_bytes ?? 0, data.notes ?? '', now, data.added_by ?? '')
  return getDB().prepare('SELECT * FROM evidence WHERE id = ?').get(id) as EvidenceRow
}

export function updateEvidence(id: string, data: Partial<EvidenceRow>): void {
  const db = getDB()
  const fields = Object.keys(data).filter(k => k !== 'id' && k !== 'case_id' && k !== 'added_at')
  if (fields.length === 0) return
  const set = fields.map(f => `${f} = ?`).join(', ')
  const vals = [...fields.map(f => (data as Record<string, unknown>)[f]), id]
  db.prepare(`UPDATE evidence SET ${set} WHERE id = ?`).run(...vals)
}

export function deleteEvidence(id: string): void {
  getDB().prepare('DELETE FROM evidence WHERE id = ?').run(id)
}
