import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import os from 'os'

export interface TableInfo {
  name: string
  row_count: number
  columns: { name: string; type: string; notnull: boolean; dflt_value: string | null; pk: boolean }[]
}

export interface DBBrowseResult {
  path: string
  tables: TableInfo[]
  views: string[]
  size: number
  page_size: number
  page_count: number
}

export interface QueryResult {
  columns: string[]
  rows: unknown[][]
  row_count: number
  truncated: boolean
}

function openReadOnly(filePath: string): Database.Database {
  // Copy to temp to avoid locking the original
  const tmp = path.join(os.tmpdir(), `as_sqlite_${Date.now()}_${path.basename(filePath)}`)
  fs.copyFileSync(filePath, tmp)
  return new Database(tmp, { readonly: true, fileMustExist: true })
}

export function browseDB(filePath: string): DBBrowseResult {
  const stat = fs.statSync(filePath)
  const db = openReadOnly(filePath)

  try {
    const page_size  = (db.pragma('page_size')  as { page_size: number }[])[0]?.page_size  ?? 4096
    const page_count = (db.pragma('page_count') as { page_count: number }[])[0]?.page_count ?? 0

    const tableNames = (db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as { name: string }[]).map(r => r.name)
    const viewNames  = (db.prepare("SELECT name FROM sqlite_master WHERE type='view'  ORDER BY name").all() as { name: string }[]).map(r => r.name)

    const tables: TableInfo[] = tableNames.map(name => {
      const cols = db.prepare(`PRAGMA table_info("${name.replace(/"/g, '""')}")`).all() as {
        name: string; type: string; notnull: number; dflt_value: string | null; pk: number
      }[]
      let row_count = 0
      try {
        row_count = (db.prepare(`SELECT COUNT(*) as c FROM "${name.replace(/"/g, '""')}"`).get() as { c: number }).c
      } catch { /* ignore */ }
      return {
        name,
        row_count,
        columns: cols.map(c => ({ name: c.name, type: c.type, notnull: Boolean(c.notnull), dflt_value: c.dflt_value, pk: Boolean(c.pk) })),
      }
    })

    return { path: filePath, tables, views: viewNames, size: stat.size, page_size, page_count }
  } finally {
    db.close()
  }
}

export function queryDB(filePath: string, sql: string): QueryResult {
  // Only allow SELECT
  const trimmed = sql.trim().toUpperCase()
  if (!trimmed.startsWith('SELECT') && !trimmed.startsWith('WITH') && !trimmed.startsWith('PRAGMA')) {
    throw new Error('Only SELECT, WITH, and PRAGMA queries are allowed.')
  }

  const db = openReadOnly(filePath)
  try {
    const stmt = db.prepare(sql)
    const rows = stmt.all() as Record<string, unknown>[]
    const LIMIT = 2000
    const truncated = rows.length > LIMIT
    const limited = rows.slice(0, LIMIT)
    const columns = limited.length > 0 ? Object.keys(limited[0]) : []
    return {
      columns,
      rows: limited.map(r => columns.map(c => r[c])),
      row_count: rows.length,
      truncated,
    }
  } finally {
    db.close()
  }
}
