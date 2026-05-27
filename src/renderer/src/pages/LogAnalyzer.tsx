import React, { useState } from 'react'
import { ScrollText, FolderOpen, Search } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Input, Select } from '../components/ui/Input'
import { Spinner } from '../components/ui/Progress'
import { EmptyState } from '../components/ui/EmptyState'
import { KeyValueGrid } from '../components/ui/KeyValueGrid'
import { api } from '../lib/api'

interface LogLine {
  line_num: number
  raw: string
  timestamp: string | null
  level: string | null
  message: string
}

interface LogStats {
  total: number
  by_level: Record<string, number>
  format: string
  start_time: string | null
  end_time: string | null
}

interface LogResult {
  lines: LogLine[]
  stats: LogStats
  truncated: boolean
}

const LEVEL_COLORS: Record<string, string> = {
  ERROR: 'text-red-400 bg-red-500/10',
  FATAL: 'text-red-500 bg-red-500/15 font-bold',
  CRITICAL: 'text-red-500 bg-red-500/15 font-bold',
  WARN: 'text-yellow-400 bg-yellow-500/10',
  WARNING: 'text-yellow-400 bg-yellow-500/10',
  INFO: 'text-blue-400',
  DEBUG: 'text-muted',
  TRACE: 'text-muted/60',
  ACCESS: 'text-green-400',
  NOTICE: 'text-cyan-400',
}

const LEVEL_BADGE: Record<string, 'danger' | 'warning' | 'primary' | 'muted' | 'success'> = {
  ERROR: 'danger', FATAL: 'danger', CRITICAL: 'danger',
  WARN: 'warning', WARNING: 'warning',
  INFO: 'primary',
  DEBUG: 'muted', TRACE: 'muted',
  ACCESS: 'success', NOTICE: 'accent' as 'primary',
}

export default function LogAnalyzer(): React.JSX.Element {
  const [filePath, setFilePath] = useState('')
  const [result, setResult] = useState<LogResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState('')

  async function browse() {
    const r = await api.util.openFile(['log', 'txt', 'json', 'csv', '*'])
    if (r.data) setFilePath(r.data as string)
  }

  async function analyze() {
    if (!filePath) return
    setLoading(true)
    setResult(null)
    const r = await api.log.analyze(filePath)
    setLoading(false)
    if (r.data) setResult(r.data as LogResult)
  }

  const lines = result?.lines ?? []
  const filtered = lines.filter(l => {
    const matchSearch = !search || l.raw.toLowerCase().includes(search.toLowerCase())
    const matchLevel = !levelFilter || (l.level ?? '').toUpperCase() === levelFilter.toUpperCase()
    return matchSearch && matchLevel
  })

  const levels = result ? Object.keys(result.stats.by_level).sort() : []

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <ScrollText className="w-5 h-5 text-primary-400" />
        <h1 className="text-lg font-bold text-white">Log Analyzer</h1>
      </div>

      {/* File picker */}
      <Card>
        <div className="flex items-end gap-3">
          <Input
            label="Log File"
            value={filePath}
            onChange={e => setFilePath(e.target.value)}
            placeholder="/path/to/file.log"
            className="flex-1"
          />
          <Button variant="outline" icon={<FolderOpen className="w-4 h-4" />} onClick={browse}>Browse</Button>
          <Button variant="primary" onClick={analyze} loading={loading} disabled={!filePath}>Analyze</Button>
        </div>
      </Card>

      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Spinner className="w-8 h-8" />
          <p className="text-sm text-muted">Parsing log file…</p>
        </div>
      )}

      {!result && !loading && (
        <EmptyState
          icon={<ScrollText className="w-7 h-7" />}
          title="Open a log file"
          description="Supports Apache, syslog, JSON, IIS, and generic timestamped log formats."
        />
      )}

      {result && (
        <>
          {result.truncated && (
            <div className="px-3 py-2 rounded-lg bg-warning/10 border border-warning/30 text-warning text-xs">
              File is large — showing first 100,000 lines only.
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
              <KeyValueGrid items={[
                { key: 'Format', value: result.stats.format },
                { key: 'Total Lines', value: result.stats.total.toLocaleString() },
                { key: 'Start Time', value: result.stats.start_time || '—' },
                { key: 'End Time', value: result.stats.end_time || '—' },
              ]} columns={2} />
            </Card>
            <Card>
              <CardHeader><CardTitle>By Level</CardTitle></CardHeader>
              <div className="flex flex-wrap gap-2">
                {Object.entries(result.stats.by_level).sort(([,a],[,b]) => b - a).map(([lvl, cnt]) => (
                  <div key={lvl} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-3 border border-surface-4">
                    <Badge variant={(LEVEL_BADGE[lvl.toUpperCase()] ?? 'muted')} className="text-[10px]">{lvl}</Badge>
                    <span className="text-xs font-bold text-white">{cnt.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex gap-3 items-end">
            <Input
              icon={<Search className="w-3.5 h-3.5" />}
              placeholder="Search log lines…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1"
            />
            <Select value={levelFilter} onChange={e => setLevelFilter(e.target.value)} className="w-40">
              <option value="">All Levels</option>
              {levels.map(l => <option key={l} value={l}>{l}</option>)}
            </Select>
            <span className="text-xs text-muted whitespace-nowrap">{filtered.length.toLocaleString()} lines</span>
          </div>

          {/* Log view */}
          <Card className="p-0">
            <div className="max-h-[520px] overflow-auto rounded-xl">
              <table className="w-full text-xs font-mono">
                <thead className="sticky top-0 bg-surface-2 border-b border-surface-4">
                  <tr>
                    <th className="px-3 py-2 text-left text-muted font-medium w-14">#</th>
                    <th className="px-3 py-2 text-left text-muted font-medium w-40">Timestamp</th>
                    <th className="px-3 py-2 text-left text-muted font-medium w-20">Level</th>
                    <th className="px-3 py-2 text-left text-muted font-medium">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 5000).map(l => {
                    const lvlKey = (l.level ?? '').toUpperCase()
                    const rowCls = LEVEL_COLORS[lvlKey] ?? ''
                    return (
                      <tr key={l.line_num} className={`border-b border-surface-4/30 hover:bg-surface-3 transition-colors ${rowCls}`}>
                        <td className="px-3 py-0.5 text-muted/60 select-none">{l.line_num}</td>
                        <td className="px-3 py-0.5 text-muted whitespace-nowrap">{l.timestamp ?? ''}</td>
                        <td className="px-3 py-0.5">
                          {l.level && (
                            <Badge variant={LEVEL_BADGE[lvlKey] ?? 'muted'} className="text-[9px]">{l.level}</Badge>
                          )}
                        </td>
                        <td className="px-3 py-0.5 break-all">{l.message || l.raw}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <p className="text-center text-muted text-xs py-8">No lines match the current filter.</p>
              )}
            </div>
          </Card>
          {filtered.length > 5000 && (
            <p className="text-xs text-muted text-center">Showing first 5,000 of {filtered.length.toLocaleString()} filtered lines.</p>
          )}
        </>
      )}
    </div>
  )
}
