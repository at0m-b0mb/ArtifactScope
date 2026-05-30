import React, { useState } from 'react'
import { Database, FolderOpen, Play, Table2, Download, RotateCcw } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { DropZone } from '../components/ui/DropZone'
import { Spinner } from '../components/ui/Progress'
import { EmptyState } from '../components/ui/EmptyState'
import { api } from '../lib/api'
import { exportCSV } from '../lib/export'
import { pushRecentFile } from '../lib/storage'

interface DBInfo {
  tables: { name: string; type: string; row_count: number; columns: { name: string; type: string; pk: number; notnull: number }[] }[]
  page_size: number
  page_count: number
  size_bytes: number
}

interface QueryResult {
  columns: string[]
  rows: (string | number | null)[][]
  row_count: number
  truncated: boolean
}

export default function SQLiteBrowser(): React.JSX.Element {
  const [filePath, setFilePath] = useState('')
  const [dbInfo, setDbInfo] = useState<DBInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
  const [queryError, setQueryError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)

  async function browse() {
    const r = await api.util.openFile(['db', 'sqlite', 'sqlite3', '*'])
    if (r.data) setFilePath(r.data as string)
  }

  async function open(overridePath?: string) {
    const target = overridePath || filePath
    if (!target) return
    if (overridePath) setFilePath(overridePath)
    setLoading(true)
    setDbInfo(null)
    setSelectedTable(null)
    setQueryResult(null)
    const r = await api.sqlite.browse(target)
    setLoading(false)
    if (r.data) {
      setDbInfo(r.data as DBInfo)
      const name = target.split(/[/\\]/).pop() || 'database'
      pushRecentFile({ path: target, label: name, kind: 'sqlite', page: '/sqlite' })
    }
  }

  function handleDrop(paths: string[]) {
    if (paths[0]) open(paths[0])
  }

  function reset() {
    setDbInfo(null)
    setFilePath('')
    setSelectedTable(null)
    setQuery('')
    setQueryResult(null)
    setQueryError(null)
  }

  async function selectTable(name: string) {
    setSelectedTable(name)
    setQueryError(null)
    const q = `SELECT * FROM "${name}" LIMIT 500`
    setQuery(q)
    await runQuery(q)
  }

  async function runQuery(q?: string) {
    const sql = (q ?? query).trim()
    if (!sql || !filePath) return
    setRunning(true)
    setQueryError(null)
    setQueryResult(null)
    const r = await api.sqlite.query(filePath, sql)
    setRunning(false)
    if (r.error) {
      setQueryError(r.error)
    } else {
      setQueryResult(r.data as QueryResult)
    }
  }

  const totalRows = dbInfo?.tables.reduce((s, t) => s + t.row_count, 0) ?? 0

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-primary-400" />
          <h1 className="text-lg font-bold text-white">SQLite Browser</h1>
        </div>
        {dbInfo && (
          <div className="flex gap-2">
            {queryResult && (
              <Button size="sm" variant="ghost" icon={<Download className="w-3.5 h-3.5" />}
                onClick={() => {
                  const rows = queryResult.rows.map(r => {
                    const obj: Record<string, unknown> = {}
                    queryResult.columns.forEach((c, i) => { obj[c] = r[i] })
                    return obj
                  })
                  exportCSV(rows, 'sqlite-query', queryResult.columns)
                }}>Export Results</Button>
            )}
            <Button size="sm" variant="outline" icon={<RotateCcw className="w-3.5 h-3.5" />} onClick={reset}>New Database</Button>
          </div>
        )}
      </div>

      {/* File picker */}
      {!dbInfo && !loading && (
        <Card>
          <div className="flex items-end gap-3">
            <Input
              label="SQLite Database"
              value={filePath}
              onChange={e => setFilePath(e.target.value)}
              placeholder="/path/to/database.db"
              className="flex-1"
            />
            <Button variant="outline" icon={<FolderOpen className="w-4 h-4" />} onClick={browse}>Browse</Button>
            <Button variant="primary" onClick={() => open()} loading={loading} disabled={!filePath}>Open</Button>
          </div>
        </Card>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Spinner className="w-8 h-8" />
          <p className="text-sm text-muted">Opening database…</p>
        </div>
      )}

      {!dbInfo && !loading && !filePath && (
        <DropZone
          onFiles={handleDrop}
          label="Drop a SQLite database to browse"
          hint="Supports .sqlite, .db, .sqlite3 files — read-only, no modifications made"
          className="min-h-40"
        />
      )}

      {!dbInfo && !loading && filePath && (
        <EmptyState
          icon={<Database className="w-7 h-7" />}
          title="Open a SQLite database"
          description="Click Open to browse the database structure and run queries."
        />
      )}

      {dbInfo && (
        <div className="grid grid-cols-4 gap-4 items-start">
          {/* Sidebar: table list */}
          <div className="col-span-1 space-y-2">
            <div className="flex items-center justify-between">
              <p className="section-title">Tables & Views</p>
              <Badge variant="muted">{dbInfo.tables.length}</Badge>
            </div>
            <div className="space-y-1">
              {dbInfo.tables.map(t => (
                <button
                  key={t.name}
                  onClick={() => selectTable(t.name)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs transition-colors
                    ${selectedTable === t.name
                      ? 'bg-primary-600/20 border border-primary-600/40 text-primary-300'
                      : 'hover:bg-surface-3 border border-transparent text-white'
                    }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Table2 className="w-3.5 h-3.5 flex-shrink-0 text-muted" />
                    <span className="truncate font-mono">{t.name}</span>
                  </div>
                  <span className="text-[10px] text-muted flex-shrink-0 ml-1">{t.type === 'view' ? 'view' : t.row_count.toLocaleString()}</span>
                </button>
              ))}
            </div>
            <div className="pt-2 text-[10px] text-muted space-y-0.5">
              <p>Page size: {dbInfo.page_size} bytes</p>
              <p>Pages: {dbInfo.page_count.toLocaleString()}</p>
              <p>Total rows: ~{totalRows.toLocaleString()}</p>
            </div>
          </div>

          {/* Main area */}
          <div className="col-span-3 space-y-3">
            {/* Column info */}
            {selectedTable && dbInfo.tables.find(t => t.name === selectedTable) && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-mono">{selectedTable}</CardTitle>
                  <div className="flex gap-1 flex-wrap">
                    {dbInfo.tables.find(t => t.name === selectedTable)!.columns.map(c => (
                      <span key={c.name} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-3 border border-surface-4 text-primary-300">
                        {c.name}<span className="text-muted ml-1">{c.type}</span>{c.pk > 0 && <span className="text-warning ml-1">PK</span>}
                      </span>
                    ))}
                  </div>
                </CardHeader>
              </Card>
            )}

            {/* Query editor */}
            <Card>
              <CardHeader>
                <CardTitle>SQL Query</CardTitle>
                <span className="text-[10px] text-muted">Read-only (SELECT, WITH, PRAGMA)</span>
              </CardHeader>
              <div className="flex gap-2">
                <textarea
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) runQuery() }}
                  rows={3}
                  className="flex-1 bg-surface-3 border border-surface-4 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder:text-muted focus:outline-none focus:border-primary-600 resize-y"
                  placeholder="SELECT * FROM table_name LIMIT 100"
                  spellCheck={false}
                />
                <Button
                  variant="primary"
                  icon={running ? undefined : <Play className="w-4 h-4" />}
                  loading={running}
                  onClick={() => runQuery()}
                  disabled={!query.trim()}
                  className="self-start"
                >
                  Run
                </Button>
              </div>
              <p className="text-[10px] text-muted mt-1">Tip: Cmd/Ctrl+Enter to run</p>
            </Card>

            {/* Results */}
            {queryError && (
              <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs font-mono">
                {queryError}
              </div>
            )}

            {queryResult && (
              <Card className="p-0">
                <div className="flex items-center justify-between px-4 py-2 border-b border-surface-4">
                  <span className="text-xs text-muted">{queryResult.row_count.toLocaleString()} rows{queryResult.truncated ? ' (truncated to 500)' : ''}</span>
                  <span className="text-xs text-muted">{queryResult.columns.length} columns</span>
                </div>
                <div className="overflow-auto max-h-[420px] rounded-b-xl">
                  <table className="w-full text-xs font-mono">
                    <thead className="sticky top-0 bg-surface-2 border-b border-surface-4">
                      <tr>
                        {queryResult.columns.map(col => (
                          <th key={col} className="px-3 py-2 text-left text-muted font-medium whitespace-nowrap">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {queryResult.rows.map((row, i) => (
                        <tr key={i} className="border-b border-surface-4/30 hover:bg-surface-3 transition-colors">
                          {row.map((cell, j) => (
                            <td key={j} className="px-3 py-0.5 whitespace-nowrap max-w-[200px] truncate">
                              {cell === null ? (
                                <span className="text-muted italic">NULL</span>
                              ) : (
                                <span className={typeof cell === 'number' ? 'text-accent-400' : 'text-white'}>{String(cell).slice(0, 100)}</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
