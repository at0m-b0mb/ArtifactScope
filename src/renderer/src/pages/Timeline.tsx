import React, { useState } from 'react'
import { Clock, FolderOpen, Download, Filter } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Input, Select } from '../components/ui/Input'
import { Spinner } from '../components/ui/Progress'
import { EmptyState } from '../components/ui/EmptyState'
import { Table, Column } from '../components/ui/Table'
import { api } from '../lib/api'
import { formatDate, formatBytes } from '../lib/format'

interface TimelineEntry {
  path: string; name: string; ext: string; size: number
  atime: string; mtime: string; ctime: string; btime: string
}

interface HeatmapCell { date: string; count: number }

interface TimelineResult {
  entries: TimelineEntry[]
  heatmap: HeatmapCell[]
  total: number
  scanned: number
}

const EXT_COLORS: Record<string, string> = {
  exe: 'danger', dll: 'danger', bat: 'danger', ps1: 'danger', sh: 'danger',
  jpg: 'primary', jpeg: 'primary', png: 'primary', gif: 'primary', bmp: 'primary',
  pdf: 'warning', doc: 'warning', docx: 'warning', xls: 'warning', xlsx: 'warning',
  zip: 'accent', rar: 'accent', tar: 'accent', gz: 'accent', '7z': 'accent',
  log: 'success', txt: 'success', csv: 'success',
}

function extColor(ext: string): 'danger' | 'primary' | 'warning' | 'accent' | 'success' | 'muted' {
  return (EXT_COLORS[ext.toLowerCase()] as 'danger' | 'primary' | 'warning' | 'accent' | 'success') ?? 'muted'
}

export default function Timeline(): React.JSX.Element {
  const [dirPath, setDirPath] = useState('')
  const [result, setResult] = useState<TimelineResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [extFilter, setExtFilter] = useState('')
  const [sortMode, setSortMode] = useState<'mtime' | 'atime' | 'ctime' | 'btime' | 'size'>('mtime')

  async function browse() {
    const r = await api.util.openDirectory()
    if (r.data) setDirPath(r.data as string)
  }

  async function scan() {
    if (!dirPath) return
    setLoading(true)
    setResult(null)
    const r = await api.timeline.build(dirPath)
    setLoading(false)
    if (r.data) setResult(r.data as TimelineResult)
  }

  async function exportCSV() {
    if (!result) return
    const r = await api.timeline.exportCSV(dirPath)
    if (r.data) await api.util.saveFile(r.data as string, 'timeline.csv', 'text/csv')
  }

  const entries = result?.entries ?? []

  const filtered = entries.filter(e => {
    const matchSearch = !search || e.path.toLowerCase().includes(search.toLowerCase()) || e.name.toLowerCase().includes(search.toLowerCase())
    const matchExt = !extFilter || e.ext.toLowerCase() === extFilter.toLowerCase()
    return matchSearch && matchExt
  }).sort((a, b) => {
    if (sortMode === 'size') return b.size - a.size
    return new Date(b[sortMode]).getTime() - new Date(a[sortMode]).getTime()
  })

  const uniqueExts = [...new Set(entries.map(e => e.ext).filter(Boolean))].sort()

  const cols: Column<TimelineEntry>[] = [
    { key: 'name', header: 'Name', sortable: true, render: r => (
      <div className="flex items-center gap-2">
        <Badge variant={extColor(r.ext)} className="text-[10px] px-1">{r.ext || '?'}</Badge>
        <span className="text-white text-xs truncate max-w-[200px]">{r.name}</span>
      </div>
    )},
    { key: 'mtime', header: 'Modified', width: '150px', sortable: true, render: r => <span className="text-xs font-mono">{formatDate(r.mtime)}</span> },
    { key: 'atime', header: 'Accessed', width: '150px', sortable: true, render: r => <span className="text-xs font-mono">{formatDate(r.atime)}</span> },
    { key: 'ctime', header: 'Created/Changed', width: '150px', sortable: true, render: r => <span className="text-xs font-mono">{formatDate(r.ctime)}</span> },
    { key: 'size', header: 'Size', width: '80px', sortable: true, render: r => <span className="text-xs">{formatBytes(r.size)}</span> },
    { key: 'path', header: 'Path', render: r => <span className="text-[10px] font-mono text-muted truncate max-w-[200px] block">{r.path}</span> },
  ]

  const heatmap = result?.heatmap ?? []
  const maxCount = Math.max(...heatmap.map(h => h.count), 1)

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary-400" />
          <h1 className="text-lg font-bold text-white">Filesystem Timeline</h1>
        </div>
        <div className="flex gap-2">
          {result && (
            <Button size="sm" variant="ghost" icon={<Download className="w-3.5 h-3.5" />} onClick={exportCSV}>
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Path picker */}
      <Card>
        <div className="flex items-end gap-3">
          <Input
            label="Directory to Scan"
            value={dirPath}
            onChange={e => setDirPath(e.target.value)}
            placeholder="/path/to/directory"
            className="flex-1"
          />
          <Button variant="outline" icon={<FolderOpen className="w-4 h-4" />} onClick={browse}>Browse</Button>
          <Button variant="primary" onClick={scan} loading={loading} disabled={!dirPath}>Scan</Button>
        </div>
      </Card>

      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Spinner className="w-8 h-8" />
          <p className="text-sm text-muted">Building filesystem timeline…</p>
        </div>
      )}

      {!result && !loading && (
        <EmptyState
          icon={<Clock className="w-7 h-7" />}
          title="No timeline yet"
          description="Select a directory and click Scan to build a MAC-time timeline."
        />
      )}

      {result && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-600/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-muted">Total Files</p>
                <p className="text-lg font-bold text-white">{result.total.toLocaleString()}</p>
              </div>
            </Card>
            <Card className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-500/20 flex items-center justify-center">
                <Filter className="w-5 h-5 text-accent-400" />
              </div>
              <div>
                <p className="text-xs text-muted">Scanned</p>
                <p className="text-lg font-bold text-white">{result.scanned.toLocaleString()}</p>
              </div>
            </Card>
            <Card className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted">Unique Extensions</p>
                <p className="text-lg font-bold text-white">{uniqueExts.length}</p>
              </div>
            </Card>
          </div>

          {/* Heatmap */}
          {heatmap.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Activity Heatmap</CardTitle></CardHeader>
              <div className="flex flex-wrap gap-1 mt-2">
                {heatmap.map(h => {
                  const intensity = h.count / maxCount
                  const opacity = 0.15 + intensity * 0.85
                  return (
                    <div
                      key={h.date}
                      title={`${h.date}: ${h.count} file(s)`}
                      style={{ opacity }}
                      className="w-5 h-5 rounded bg-primary-500 cursor-default"
                    />
                  )
                })}
              </div>
              <p className="text-[10px] text-muted mt-2">Each cell = one day. Darker = more files modified.</p>
            </Card>
          )}

          {/* Filters */}
          <div className="flex gap-3 items-end">
            <Input
              icon={<Filter className="w-3.5 h-3.5" />}
              placeholder="Search by name or path…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 max-w-xs"
            />
            <Select value={extFilter} onChange={e => setExtFilter(e.target.value)} className="w-36">
              <option value="">All Extensions</option>
              {uniqueExts.map(ext => <option key={ext} value={ext}>.{ext}</option>)}
            </Select>
            <Select value={sortMode} onChange={e => setSortMode(e.target.value as typeof sortMode)} className="w-44">
              <option value="mtime">Sort by Modified</option>
              <option value="atime">Sort by Accessed</option>
              <option value="ctime">Sort by Changed</option>
              <option value="btime">Sort by Created</option>
              <option value="size">Sort by Size</option>
            </Select>
            <span className="text-xs text-muted whitespace-nowrap">{filtered.length.toLocaleString()} entries</span>
          </div>

          {/* Table */}
          <Table
            columns={cols}
            data={filtered.slice(0, 5000) as unknown as Record<string, unknown>[]}
            rowKey="path"
            compact
            emptyMessage="No entries match the current filter."
          />
          {filtered.length > 5000 && (
            <p className="text-xs text-muted text-center">Showing first 5,000 of {filtered.length.toLocaleString()} entries. Use filters to narrow results.</p>
          )}
        </>
      )}
    </div>
  )
}
