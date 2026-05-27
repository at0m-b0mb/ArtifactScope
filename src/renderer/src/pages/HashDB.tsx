import React, { useState, useEffect } from 'react'
import { Hash, Plus, Upload, Download, Search, Trash2, CheckCircle, AlertTriangle, HelpCircle } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Input, Select, Textarea } from '../components/ui/Input'
import { Dialog } from '../components/ui/Dialog'
import { Table, Column } from '../components/ui/Table'
import { EmptyState } from '../components/ui/EmptyState'
import { Progress } from '../components/ui/Progress'
import { api } from '../lib/api'
import { formatDate } from '../lib/format'
import { exportCSV } from '../lib/export'

interface HashRow { hash: string; algorithm: string; classification: string; filename: string; notes: string; added_at: string }
interface HashStats { total: number; known_bad: number; known_good: number; suspicious: number; unknown: number }

const CLS_CONFIG: Record<string, { label: string; variant: 'danger' | 'success' | 'warning' | 'muted'; icon: React.ReactNode }> = {
  known_bad: { label: 'Known Bad', variant: 'danger', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  known_good: { label: 'Known Good', variant: 'success', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  suspicious: { label: 'Suspicious', variant: 'warning', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  unknown: { label: 'Unknown', variant: 'muted', icon: <HelpCircle className="w-3.5 h-3.5" /> },
}

export default function HashDB(): React.JSX.Element {
  const [hashes, setHashes] = useState<HashRow[]>([])
  const [stats, setStats] = useState<HashStats>({ total: 0, known_bad: 0, known_good: 0, suspicious: 0, unknown: 0 })
  const [search, setSearch] = useState('')
  const [clsFilter, setClsFilter] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showLookup, setShowLookup] = useState(false)
  const [addForm, setAddForm] = useState({ hash: '', algorithm: 'sha256', classification: 'unknown', filename: '', notes: '' })
  const [lookupHash, setLookupHash] = useState('')
  const [lookupResult, setLookupResult] = useState<HashRow | null | undefined>(undefined)
  const [importPath, setImportPath] = useState('')
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [batchText, setBatchText] = useState('')
  const [batchRunning, setBatchRunning] = useState(false)
  const [batchResults, setBatchResults] = useState<{ hash: string; classification: string; row: HashRow | null }[]>([])

  function load() {
    api.hashdb.list().then(r => setHashes((r.data ?? []) as HashRow[]))
    api.hashdb.stats().then(r => {
      if (r.data) setStats(r.data as HashStats)
    })
  }

  useEffect(load, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    await api.hashdb.add(addForm)
    setShowAdd(false)
    setAddForm({ hash: '', algorithm: 'sha256', classification: 'unknown', filename: '', notes: '' })
    load()
  }

  async function handleDelete(hash: string) {
    if (!confirm('Remove this hash from the database?')) return
    await api.hashdb.delete(hash)
    load()
  }

  async function handleLookup() {
    if (!lookupHash.trim()) return
    const r = await api.hashdb.lookup(lookupHash.trim())
    setLookupResult(r.data as HashRow ?? null)
  }

  async function browseCsv() {
    const r = await api.util.openFile(['csv', 'txt', '*'])
    if (r.data) setImportPath(r.data as string)
  }

  async function handleImport() {
    if (!importPath) return
    setImporting(true)
    setImportProgress(0)
    const r = await api.hashdb.importCsv(importPath)
    setImporting(false)
    setImportProgress(100)
    setShowImport(false)
    setImportPath('')
    load()
    if (r.error) alert(`Import error: ${r.error}`)
  }

  async function handleBatchLookup() {
    const lines = Array.from(new Set(batchText.split(/[\s,;]+/).map(l => l.trim()).filter(Boolean)))
    if (lines.length === 0) return
    setBatchRunning(true)
    setBatchResults([])
    const out: { hash: string; classification: string; row: HashRow | null }[] = []
    for (const h of lines) {
      const r = await api.hashdb.lookup(h)
      const row = (r.data as HashRow | null) ?? null
      out.push({ hash: h, classification: row?.classification ?? 'not_found', row })
      setBatchResults([...out])
    }
    setBatchRunning(false)
  }

  function batchSummary() {
    const counts: Record<string, number> = {}
    for (const r of batchResults) counts[r.classification] = (counts[r.classification] ?? 0) + 1
    return counts
  }

  const filtered = hashes.filter(h => {
    const matchSearch = !search || h.hash.toLowerCase().includes(search.toLowerCase()) || (h.filename || '').toLowerCase().includes(search.toLowerCase())
    const matchCls = !clsFilter || h.classification === clsFilter
    return matchSearch && matchCls
  })

  const cols: Column<HashRow>[] = [
    { key: 'hash', header: 'Hash', render: r => <span className="font-mono text-xs text-white select-all">{r.hash.slice(0,32)}…</span> },
    { key: 'algorithm', header: 'Algo', width: '80px', render: r => <Badge variant="muted">{r.algorithm.toUpperCase()}</Badge> },
    { key: 'classification', header: 'Classification', width: '130px', render: r => {
      const cfg = CLS_CONFIG[r.classification] ?? CLS_CONFIG.unknown
      return <Badge variant={cfg.variant} dot>{cfg.label}</Badge>
    }},
    { key: 'filename', header: 'Filename', render: r => <span className="text-xs text-muted">{r.filename || '—'}</span> },
    { key: 'notes', header: 'Notes', render: r => <span className="text-xs text-muted truncate max-w-[150px] block">{r.notes || '—'}</span> },
    { key: 'added_at', header: 'Added', width: '130px', sortable: true, render: r => <span className="text-xs">{formatDate(r.added_at)}</span> },
    { key: 'hash', header: '', width: '40px', render: r => (
      <button onClick={() => handleDelete(r.hash as string)} className="p-1 rounded text-muted hover:text-danger hover:bg-danger/10 transition-colors">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    )},
  ]

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Hash className="w-5 h-5 text-primary-400" />
          <h1 className="text-lg font-bold text-white">Hash Database</h1>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" icon={<Search className="w-3.5 h-3.5" />} onClick={() => setShowLookup(true)}>Lookup</Button>
          <Button
            size="sm"
            variant="ghost"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={() => exportCSV(filtered as unknown as Record<string, unknown>[], 'hash-database',
              ['hash', 'algorithm', 'classification', 'filename', 'notes', 'added_at'])}
            disabled={filtered.length === 0}
          >
            Export
          </Button>
          <Button size="sm" variant="outline" icon={<Upload className="w-3.5 h-3.5" />} onClick={() => setShowImport(true)}>Import CSV</Button>
          <Button size="sm" variant="primary" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowAdd(true)}>Add Hash</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { key: 'total', label: 'Total Hashes', color: 'text-white', bg: 'bg-primary-600/20' },
          { key: 'known_bad', label: 'Known Bad', color: 'text-danger', bg: 'bg-danger/10' },
          { key: 'known_good', label: 'Known Good', color: 'text-success', bg: 'bg-success/10' },
          { key: 'suspicious', label: 'Suspicious', color: 'text-warning', bg: 'bg-warning/10' },
        ].map(s => (
          <Card key={s.key} className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
              <Hash className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className={`text-xl font-bold ${s.color}`}>{(stats[s.key as keyof HashStats]).toLocaleString()}</p>
              <p className="text-xs text-muted">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-end">
        <Input
          icon={<Search className="w-3.5 h-3.5" />}
          placeholder="Search hash or filename…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 max-w-sm"
        />
        <Select value={clsFilter} onChange={e => setClsFilter(e.target.value)} className="w-40">
          <option value="">All Classifications</option>
          <option value="known_bad">Known Bad</option>
          <option value="known_good">Known Good</option>
          <option value="suspicious">Suspicious</option>
          <option value="unknown">Unknown</option>
        </Select>
        <span className="text-xs text-muted whitespace-nowrap">{filtered.length.toLocaleString()} hashes</span>
      </div>

      {hashes.length === 0 ? (
        <EmptyState
          icon={<Hash className="w-7 h-7" />}
          title="No hashes in database"
          description="Add hashes manually or import a CSV file (NSRL format or hash,classification,filename)."
          action={
            <div className="flex gap-2">
              <Button variant="outline" icon={<Upload className="w-4 h-4" />} onClick={() => setShowImport(true)}>Import CSV</Button>
              <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>Add Hash</Button>
            </div>
          }
        />
      ) : (
        <Table
          columns={cols}
          data={filtered as unknown as Record<string, unknown>[]}
          rowKey="hash"
          compact
          emptyMessage="No hashes match the current filter."
        />
      )}

      {/* Add Hash Dialog */}
      <Dialog open={showAdd} onClose={() => setShowAdd(false)} title="Add Hash" size="md">
        <form onSubmit={handleAdd} className="space-y-3">
          <Input label="Hash Value *" value={addForm.hash} onChange={e => setAddForm(p => ({...p,hash:e.target.value}))} placeholder="Enter hash…" required />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Algorithm" value={addForm.algorithm} onChange={e => setAddForm(p => ({...p,algorithm:e.target.value}))}>
              <option value="md5">MD5</option>
              <option value="sha1">SHA-1</option>
              <option value="sha256">SHA-256</option>
              <option value="sha512">SHA-512</option>
            </Select>
            <Select label="Classification" value={addForm.classification} onChange={e => setAddForm(p => ({...p,classification:e.target.value}))}>
              <option value="unknown">Unknown</option>
              <option value="known_good">Known Good</option>
              <option value="known_bad">Known Bad</option>
              <option value="suspicious">Suspicious</option>
            </Select>
          </div>
          <Input label="Filename (optional)" value={addForm.filename} onChange={e => setAddForm(p => ({...p,filename:e.target.value}))} placeholder="malware.exe" />
          <Input label="Notes (optional)" value={addForm.notes} onChange={e => setAddForm(p => ({...p,notes:e.target.value}))} placeholder="Source, campaign, reference…" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Add Hash</Button>
          </div>
        </form>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImport} onClose={() => setShowImport(false)} title="Import Hashes from CSV" size="md">
        <div className="space-y-3">
          <p className="text-xs text-muted">Supported formats: NSRL RDS (SHA-256,MD5,CRC32,FileName,…) or simple <code className="text-primary-400">hash,classification,filename</code> CSV.</p>
          <div className="flex gap-2 items-end">
            <Input label="CSV File" value={importPath} onChange={e => setImportPath(e.target.value)} placeholder="/path/to/hashes.csv" className="flex-1" />
            <Button variant="outline" onClick={browseCsv}>Browse</Button>
          </div>
          {importing && <Progress value={importProgress} label="Importing…" />}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowImport(false)}>Cancel</Button>
            <Button variant="primary" loading={importing} onClick={handleImport} disabled={!importPath}>Import</Button>
          </div>
        </div>
      </Dialog>

      {/* Lookup Dialog */}
      <Dialog open={showLookup} onClose={() => { setShowLookup(false); setLookupResult(undefined); setLookupHash('') }} title="Hash Lookup" size="md">
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={lookupHash}
              onChange={e => setLookupHash(e.target.value)}
              placeholder="Enter MD5, SHA-1, or SHA-256 hash…"
              className="flex-1"
            />
            <Button variant="primary" onClick={handleLookup}>Lookup</Button>
          </div>
          {lookupResult !== undefined && (
            lookupResult === null ? (
              <div className="p-3 rounded-lg bg-muted/10 border border-surface-4 text-center">
                <HelpCircle className="w-6 h-6 text-muted mx-auto mb-1" />
                <p className="text-sm text-muted">Hash not found in database.</p>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-surface-3 border border-surface-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={CLS_CONFIG[lookupResult.classification]?.variant ?? 'muted'} dot>
                    {CLS_CONFIG[lookupResult.classification]?.label ?? lookupResult.classification}
                  </Badge>
                  <Badge variant="muted">{lookupResult.algorithm.toUpperCase()}</Badge>
                </div>
                <p className="text-xs font-mono text-white break-all">{lookupResult.hash}</p>
                {lookupResult.filename && <p className="text-xs text-muted">File: {lookupResult.filename}</p>}
                {lookupResult.notes && <p className="text-xs text-muted">Notes: {lookupResult.notes}</p>}
                <p className="text-xs text-muted">Added: {formatDate(lookupResult.added_at)}</p>
              </div>
            )
          )}
          <div className="border-t border-surface-4 pt-3 space-y-2">
            <p className="text-xs text-muted">Batch Lookup — paste hashes separated by newlines, commas, or spaces:</p>
            <Textarea value={batchText} onChange={e => setBatchText(e.target.value)} rows={4} placeholder="paste hashes here…" />
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" loading={batchRunning} onClick={handleBatchLookup} disabled={!batchText.trim()}>
                Run Batch Lookup
              </Button>
              {batchResults.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => exportCSV(
                    batchResults.map(r => ({ hash: r.hash, classification: r.classification, filename: r.row?.filename ?? '', notes: r.row?.notes ?? '' })) as Record<string, unknown>[],
                    'hash-batch-lookup',
                    ['hash', 'classification', 'filename', 'notes']
                  )}
                >
                  Export CSV
                </Button>
              )}
              {batchResults.length > 0 && (
                <span className="text-[10px] text-muted ml-auto">
                  {Object.entries(batchSummary()).map(([k, v]) => `${v} ${k.replace('_', ' ')}`).join(' · ')}
                </span>
              )}
            </div>
            {batchResults.length > 0 && (
              <div className="max-h-56 overflow-auto rounded-lg border border-surface-4">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-surface-2 text-muted">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-medium">Hash</th>
                      <th className="px-2 py-1.5 text-left font-medium w-32">Classification</th>
                      <th className="px-2 py-1.5 text-left font-medium">Filename</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchResults.map((r, i) => {
                      const cfg = CLS_CONFIG[r.classification]
                      return (
                        <tr key={i} className="hover:bg-surface-3 transition-colors border-t border-surface-4">
                          <td className="px-2 py-1 font-mono text-[10px] text-white break-all">{r.hash}</td>
                          <td className="px-2 py-1">
                            {cfg
                              ? <Badge variant={cfg.variant} dot>{cfg.label}</Badge>
                              : <span className="text-[10px] text-muted">Not in DB</span>}
                          </td>
                          <td className="px-2 py-1 text-muted truncate max-w-[120px]">{r.row?.filename || '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Dialog>
    </div>
  )
}
