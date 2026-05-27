import React, { useState } from 'react'
import { Archive, AlertTriangle, Search } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { DropZone } from '../components/ui/DropZone'
import { KeyValueGrid } from '../components/ui/KeyValueGrid'
import { Spinner } from '../components/ui/Progress'
import { Table, Column } from '../components/ui/Table'
import { api } from '../lib/api'
import { formatBytes, formatDate } from '../lib/format'

interface ArchiveEntry {
  name: string; path: string; size: number; compressed_size: number
  modified: string | null; is_directory: boolean
  crc32: string; suspicious: boolean; suspicious_reason: string | null
}

interface ArchiveResult {
  path: string; format: string; comment: string | null
  total_entries: number; total_size: number; total_compressed: number
  compression_ratio: number
  entries: ArchiveEntry[]
  suspicious_count: number
}

export default function ArchiveAnalyzer(): React.JSX.Element {
  const [result, setResult] = useState<ArchiveResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [showSuspiciousOnly, setShowSuspiciousOnly] = useState(false)

  async function handleFiles(paths: string[]) {
    const path = paths[0]
    if (!path) return
    setLoading(true)
    setResult(null)
    const r = await api.archive.analyze(path)
    setLoading(false)
    if (r.data) setResult(r.data as ArchiveResult)
  }

  const entries = result?.entries ?? []
  const filtered = entries.filter(e => {
    const matchSearch = !search || e.path.toLowerCase().includes(search.toLowerCase())
    const matchSuspicious = !showSuspiciousOnly || e.suspicious
    return matchSearch && matchSuspicious
  })

  const cols: Column<ArchiveEntry>[] = [
    { key: 'path', header: 'Path', render: r => (
      <div className="flex items-center gap-2">
        {r.suspicious && <AlertTriangle className="w-3.5 h-3.5 text-danger flex-shrink-0" />}
        <span className={`text-xs font-mono ${r.is_directory ? 'text-accent-400' : 'text-white'}`}>
          {r.is_directory ? '📁 ' : ''}{r.path}
        </span>
      </div>
    )},
    { key: 'size', header: 'Size', width: '80px', sortable: true, render: r => (
      <span className="text-xs">{r.is_directory ? '—' : formatBytes(r.size)}</span>
    )},
    { key: 'compressed_size', header: 'Compressed', width: '100px', sortable: true, render: r => (
      <span className="text-xs">{r.is_directory ? '—' : formatBytes(r.compressed_size)}</span>
    )},
    { key: 'modified', header: 'Modified', width: '140px', render: r => (
      <span className="text-xs font-mono">{r.modified ? formatDate(r.modified) : '—'}</span>
    )},
    { key: 'crc32', header: 'CRC32', width: '90px', render: r => (
      <span className="font-mono text-[10px] text-muted">{r.crc32 || '—'}</span>
    )},
    { key: 'suspicious_reason', header: 'Alert', render: r => r.suspicious ? (
      <Badge variant="danger" className="text-[9px]">{r.suspicious_reason}</Badge>
    ) : <span className="text-muted text-xs">—</span> },
  ]

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Archive className="w-5 h-5 text-primary-400" />
          <h1 className="text-lg font-bold text-white">Archive Analyzer</h1>
        </div>
        {result && (
          <Button size="sm" variant="ghost" onClick={() => setResult(null)}>Analyze Another</Button>
        )}
      </div>

      {!result && !loading && (
        <DropZone
          onFiles={handleFiles}
          label="Drop an archive to analyze"
          hint="ZIP, TAR, GZIP, BZ2, XZ — lists contents without extracting, flags suspicious entries"
          className="min-h-48"
        />
      )}

      {loading && (
        <Card className="flex flex-col items-center justify-center py-16 gap-4">
          <Spinner className="w-8 h-8" />
          <p className="text-sm text-muted">Analyzing archive…</p>
        </Card>
      )}

      {result && (
        <>
          {result.suspicious_count > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span><strong>{result.suspicious_count}</strong> suspicious entr{result.suspicious_count !== 1 ? 'ies' : 'y'} found — double extensions, executable files, or path traversal attempts.</span>
            </div>
          )}

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Archive Summary</CardTitle>
              <Badge variant="muted">{result.format.toUpperCase()}</Badge>
            </CardHeader>
            <KeyValueGrid items={[
              { key: 'Archive', value: result.path.split('/').pop() || result.path },
              { key: 'Format', value: result.format },
              { key: 'Total Entries', value: result.total_entries.toLocaleString() },
              { key: 'Total Uncompressed', value: formatBytes(result.total_size) },
              { key: 'Total Compressed', value: formatBytes(result.total_compressed) },
              { key: 'Compression Ratio', value: `${(result.compression_ratio * 100).toFixed(1)}%` },
              ...(result.comment ? [{ key: 'Comment', value: result.comment }] : []),
            ]} columns={3} />
          </Card>

          {/* Filters */}
          <div className="flex gap-3 items-center">
            <Input
              icon={<Search className="w-3.5 h-3.5" />}
              placeholder="Search entries…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 max-w-sm"
            />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showSuspiciousOnly}
                onChange={e => setShowSuspiciousOnly(e.target.checked)}
                className="w-4 h-4 rounded border border-surface-4 bg-surface-3 text-danger focus:ring-danger"
              />
              <span className="text-sm text-white">Suspicious only</span>
              {result.suspicious_count > 0 && <Badge variant="danger">{result.suspicious_count}</Badge>}
            </label>
            <span className="text-xs text-muted">{filtered.length.toLocaleString()} entries</span>
          </div>

          <Table
            columns={cols}
            data={filtered.slice(0, 5000) as unknown as Record<string, unknown>[]}
            rowKey="path"
            compact
            emptyMessage="No entries match the current filter."
          />
          {filtered.length > 5000 && (
            <p className="text-xs text-muted text-center">Showing first 5,000 of {filtered.length.toLocaleString()} entries.</p>
          )}
        </>
      )}
    </div>
  )
}
