import { getDB } from './index'
import { randomUUID } from 'crypto'

export interface CaseRow {
  id: string
  name: string
  case_number: string
  investigator: string
  agency: string
  status: string
  priority: string
  description: string
  tags: string
  created_at: string
  updated_at: string
}

export function listCases(): CaseRow[] {
  return getDB().prepare('SELECT * FROM cases ORDER BY updated_at DESC').all() as CaseRow[]
}

export function getCase(id: string): CaseRow | undefined {
  return getDB().prepare('SELECT * FROM cases WHERE id = ?').get(id) as CaseRow | undefined
}

export function createCase(data: Omit<CaseRow, 'id' | 'created_at' | 'updated_at'>): CaseRow {
  const db = getDB()
  const id = randomUUID()
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO cases (id, name, case_number, investigator, agency, status, priority, description, tags, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.name, data.case_number, data.investigator, data.agency ?? '', data.status ?? 'open', data.priority ?? 'medium', data.description ?? '', data.tags ?? '', now, now)
  return getCase(id)!
}

export function updateCase(id: string, data: Partial<CaseRow>): CaseRow {
  const db = getDB()
  const now = new Date().toISOString()
  const fields = Object.keys(data).filter(k => k !== 'id' && k !== 'created_at')
  if (fields.length === 0) return getCase(id)!
  const set = [...fields.map(f => `${f} = ?`), 'updated_at = ?'].join(', ')
  const vals = [...fields.map(f => (data as Record<string, unknown>)[f]), now, id]
  db.prepare(`UPDATE cases SET ${set} WHERE id = ?`).run(...vals)
  return getCase(id)!
}

export function deleteCase(id: string): void {
  getDB().prepare('DELETE FROM cases WHERE id = ?').run(id)
}
