import React, { useState } from 'react'
import { Crosshair, FolderOpen, Download, Filter, AlertTriangle } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Input, Select } from '../components/ui/Input'
import { Spinner } from '../components/ui/Progress'
import { EmptyState } from '../components/ui/EmptyState'
import { Table, Column } from '../components/ui/Table'
import { api } from '../lib/api'
import { formatBytes } from '../lib/format'

interface IOCMatch {
  type: string
  value: string
  offset: number
  context: string
}

interface IOCResult {
  path: string
  size: number
  total_strings: number
  matches: IOCMatch[]
  by_type: Record<string, number>
}

const TYPE_COLORS: Record<string, 'danger' | 'warning' | 'primary' | 'accent' | 'success' | 'muted'> = {
  ipv4: 'warning',
  ipv6: 'warning',
  url: 'primary',
  email: 'accent',
  md5: 'muted',
  sha1: 'muted',
  sha256: 'muted',
  bitcoin: 'danger',
  credit_card: 'danger',
  base64: 'muted',
  cve: 'danger',
  registry_key: 'warning',
  private_key: 'danger',
  powershell: 'danger',
  domain: 'primary',
}

const TYPE_LABELS: Record<string, string> = {
  ipv4: 'IPv4 Address', ipv6: 'IPv6 Address', url: 'URL', email: 'Email',
  md5: 'MD5 Hash', sha1: 'SHA-1 Hash', sha256: 'SHA-256 Hash',
  bitcoin: 'Bitcoin Address', credit_card: 'Credit Card', base64: 'Base64',
  cve: 'CVE ID', registry_key: 'Registry Key', private_key: 'Private Key',
  powershell: 'PowerShell', domain: 'Domain',
}

export default function IOCHunter(): React.JSX.Element {
  const [filePath, setFilePath] = useState('')
  const [result, setResult] = useState<IOCResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [typeFilter, setTypeFilter] = useState('')
  const [search, setSearch] = useState('')

  async function browse() {
    const r = await api.util.openFile(['*'])
    if (r.data) setFilePath(r.data as string)
  }

  async function hunt() {
    if (!filePath) return
    setLoading(true)
    setResult(null)
    const r = await api.ioc.hunt(filePath)
    setLoading(false)
    if (r.data) setResult(r.data as IOCResult)
  }

  async function exportCSV() {
    if (!result) return
    const rows = ['Type,Value,Offset,Context', ...result.matches.map(m =>
      `${m.type},"${m.value.replace(/"/g,'""')}",${m.offset},"${(m.context||'').replace(/"/g,'""')}"`
    )].join('\n')
    await api.util.saveFile(rows, 'iocs.csv', 'text/csv')
  }

  const filtered = (result?.matches ?? []).filter(m => {
    const matchType = !typeFilter || m.type === typeFilter
    const matchSearch = !search || m.value.toLowerCase().includes(search.toLowerCase())
    return matchType && matchSearch
  })

  const cols: Column<IOCMatch>[] = [
    { key: 'type', header: 'Type', width: '140px', render: r => (
      <Badge variant={TYPE_COLORS[r.type] ?? 'muted'}>{TYPE_LABELS[r.type] ?? r.type}</Badge>
    )},
    { key: 'value', header: 'Value', render: r => (
      <span className="font-mono text-xs text-white break-all select-all">{r.value}</span>
    )},
    { key: 'offset', header: 'Offset', width: '90px', render: r => (
      <span className="font-mono text-xs text-accent-400">0x{r.offset.toString(16).toUpperCase().padStart(8,'0')}</span>
    )},
    { key: 'context', header: 'Context', render: r => (
      <span className="font-mono text-[10px] text-muted truncate max-w-[240px] block">{r.context}</span>
    )},
  ]

  const highSeverityTypes = ['bitcoin', 'credit_card', 'private_key', 'powershell', 'cve']
  const highSeverityCount = result?.matches.filter(m => highSeverityTypes.includes(m.type)).length ?? 0

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crosshair className="w-5 h-5 text-primary-400" />
          <h1 className="text-lg font-bold text-white">Strings &amp; IOC Hunter</h1>
        </div>
        {result && (
          <Button size="sm" variant="ghost" icon={<Download className="w-3.5 h-3.5" />} onClick={exportCSV}>Export CSV</Button>
        )}
      </div>

      {/* File picker */}
      <Card>
        <div className="flex items-end gap-3">
          <Input
            label="File to Hunt"
            value={filePath}
            onChange={e => setFilePath(e.target.value)}
            placeholder="/path/to/any/file"
            className="flex-1"
          />
          <Button variant="outline" icon={<FolderOpen className="w-4 h-4" />} onClick={browse}>Browse</Button>
          <Button variant="primary" onClick={hunt} loading={loading} disabled={!filePath}>Hunt IOCs</Button>
        </div>
      </Card>

      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Spinner className="w-8 h-8" />
          <p className="text-sm text-muted">Extracting strings and scanning for IOCs…</p>
        </div>
      )}

      {!result && !loading && (
        <EmptyState
          icon={<Crosshair className="w-7 h-7" />}
          title="Hunt for indicators of compromise"
          description="Scans any file for IPs, URLs, domains, emails, hashes, Bitcoin addresses, credit cards, CVEs, PowerShell, registry keys, and more."
        />
      )}

      {result && (
        <>
          {highSeverityCount > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span><strong>{highSeverityCount}</strong> high-severity IOC{highSeverityCount !== 1 ? 's' : ''} found (Bitcoin, credit cards, private keys, PowerShell, CVEs).</span>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Scan Summary</CardTitle></CardHeader>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted">File size</span><span className="text-white">{formatBytes(result.size)}</span></div>
                <div className="flex justify-between"><span className="text-muted">Strings extracted</span><span className="text-white">{result.total_strings.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted">Total IOCs found</span><span className="text-white font-bold">{result.matches.length.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted">IOC types detected</span><span className="text-white">{Object.keys(result.by_type).length}</span></div>
              </div>
            </Card>
            <Card>
              <CardHeader><CardTitle>By IOC Type</CardTitle></CardHeader>
              <div className="flex flex-wrap gap-2">
                {Object.entries(result.by_type).sort(([,a],[,b]) => b-a).map(([t,c]) => (
                  <div key={t} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-3 border border-surface-4">
                    <Badge variant={TYPE_COLORS[t] ?? 'muted'} className="text-[9px]">{TYPE_LABELS[t] ?? t}</Badge>
                    <span className="text-xs font-bold text-white">{c}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex gap-3 items-end">
            <Input
              icon={<Filter className="w-3.5 h-3.5" />}
              placeholder="Filter values…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 max-w-xs"
            />
            <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="w-44">
              <option value="">All IOC Types</option>
              {Object.keys(result.by_type).sort().map(t => (
                <option key={t} value={t}>{TYPE_LABELS[t] ?? t} ({result.by_type[t]})</option>
              ))}
            </Select>
            <span className="text-xs text-muted whitespace-nowrap">{filtered.length.toLocaleString()} matches</span>
          </div>

          <Table
            columns={cols}
            data={filtered.slice(0,3000) as unknown as Record<string, unknown>[]}
            rowKey="offset"
            compact
            emptyMessage="No IOCs match the current filter."
          />
          {filtered.length > 3000 && (
            <p className="text-xs text-muted text-center">Showing first 3,000 of {filtered.length.toLocaleString()} matches.</p>
          )}
        </>
      )}
    </div>
  )
}
