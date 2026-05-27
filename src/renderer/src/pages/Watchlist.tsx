import React, { useEffect, useState } from 'react'
import { Eye, Plus, Trash2, AlertTriangle, Hash, Globe, Network, Link as LinkIcon, Regex, Type } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Input, Select, Textarea } from '../components/ui/Input'
import { Dialog } from '../components/ui/Dialog'
import { Table, Column } from '../components/ui/Table'
import { EmptyState } from '../components/ui/EmptyState'
import { useToast } from '../components/ui/Toast'
import {
  type WatchItem, type WatchType, type Severity,
  addWatchItem, getWatchlist, removeWatchItem, SEVERITY_VARIANT,
} from '../lib/watchlist'
import { formatDate, timeAgo } from '../lib/format'
import { exportCSV, exportJSON } from '../lib/export'

const TYPE_ICONS: Record<WatchType, React.ComponentType<{ className?: string }>> = {
  hash:   Hash,
  ip:     Network,
  domain: Globe,
  url:    LinkIcon,
  regex:  Regex,
  string: Type,
}

const TYPE_LABEL: Record<WatchType, string> = {
  hash: 'Hash', ip: 'IP', domain: 'Domain', url: 'URL', regex: 'Regex', string: 'String',
}

interface FormState {
  type: WatchType
  value: string
  label: string
  severity: Severity
  notes: string
}

const EMPTY: FormState = { type: 'hash', value: '', label: '', severity: 'high', notes: '' }

export default function Watchlist(): React.JSX.Element {
  const { success, error } = useToast()
  const [items, setItems] = useState<WatchItem[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [typeFilter, setTypeFilter] = useState<'all' | WatchType>('all')

  function sync() { setItems(getWatchlist()) }

  useEffect(() => {
    sync()
    window.addEventListener('artifactscope:watchlist-changed', sync)
    return () => window.removeEventListener('artifactscope:watchlist-changed', sync)
  }, [])

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.value.trim()) { error('Value is required'); return }
    if (form.type === 'regex') {
      try { new RegExp(form.value) } catch { error('Invalid regex'); return }
    }
    addWatchItem({
      type: form.type,
      value: form.value.trim(),
      label: form.label.trim() || form.value.slice(0, 32),
      severity: form.severity,
      notes: form.notes.trim() || undefined,
    })
    sync()
    success('Indicator added to watchlist')
    setShowAdd(false)
    setForm(EMPTY)
  }

  function handleDelete(item: WatchItem) {
    if (!confirm(`Remove "${item.label}" from watchlist?`)) return
    removeWatchItem(item.id)
    sync()
  }

  const filtered = typeFilter === 'all' ? items : items.filter(i => i.type === typeFilter)
  const stats = {
    total: items.length,
    hits:  items.reduce((a, i) => a + i.hit_count, 0),
    critical: items.filter(i => i.severity === 'critical').length,
    active: items.filter(i => i.last_hit_at && Date.now() - i.last_hit_at < 1000 * 60 * 60 * 24 * 7).length,
  }

  const cols: Column<WatchItem>[] = [
    { key: 'type', header: 'Type', width: '90px', render: r => {
      const Icon = TYPE_ICONS[r.type]
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-muted">
          <Icon className="w-3.5 h-3.5" />
          {TYPE_LABEL[r.type]}
        </span>
      )
    }},
    { key: 'severity', header: 'Severity', width: '110px', render: r => (
      <Badge variant={SEVERITY_VARIANT[r.severity]} dot>{r.severity}</Badge>
    )},
    { key: 'label', header: 'Label', render: r => (
      <div className="min-w-0">
        <p className="text-sm text-white truncate">{r.label}</p>
        <p className="text-[10px] font-mono text-muted truncate select-all">{r.value}</p>
      </div>
    )},
    { key: 'hit_count', header: 'Hits', width: '70px', sortable: true, render: r => (
      r.hit_count > 0
        ? <Badge variant="danger" className="text-[10px]">{r.hit_count}</Badge>
        : <span className="text-xs text-muted">—</span>
    )},
    { key: 'last_hit_at', header: 'Last hit', width: '110px', render: r => (
      <span className="text-xs text-muted">{r.last_hit_at ? timeAgo(r.last_hit_at) : '—'}</span>
    )},
    { key: 'added_at', header: 'Added', width: '110px', sortable: true, render: r => (
      <span className="text-xs text-muted">{formatDate(r.added_at)}</span>
    )},
    { key: 'id', header: '', width: '40px', render: r => (
      <button onClick={() => handleDelete(r)} className="p-1 rounded text-muted hover:text-danger hover:bg-danger/10 transition-colors">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    )},
  ]

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-primary-400" />
          <h1 className="text-lg font-bold text-white">Watchlist</h1>
          <Badge variant="muted">{items.length} indicators</Badge>
        </div>
        <div className="flex gap-2">
          {items.length > 0 && (
            <>
              <Button size="sm" variant="ghost" onClick={() => exportCSV(items as unknown as Record<string, unknown>[], 'watchlist',
                ['type', 'value', 'label', 'severity', 'hit_count', 'last_hit_at', 'added_at', 'notes'])}>Export CSV</Button>
              <Button size="sm" variant="ghost" onClick={() => exportJSON(items, 'watchlist')}>Export JSON</Button>
            </>
          )}
          <Button size="sm" variant="primary" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowAdd(true)}>
            Add Indicator
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Indicators', value: stats.total,    color: 'text-white',   bg: 'bg-primary-600/15' },
          { label: 'Total Hits',       value: stats.hits,     color: 'text-danger',  bg: 'bg-danger/10' },
          { label: 'Critical',          value: stats.critical, color: 'text-warning', bg: 'bg-warning/10' },
          { label: 'Active (7d)',       value: stats.active,   color: 'text-accent-400', bg: 'bg-accent-500/10' },
        ].map(s => (
          <Card key={s.label} className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
              <AlertTriangle className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value as 'all' | WatchType)} className="w-40">
          <option value="all">All Types</option>
          {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <span className="text-xs text-muted">{filtered.length} shown</span>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<Eye className="w-7 h-7" />}
          title="Watchlist is empty"
          description="Add hashes, IPs, domains, URLs, or regex patterns. They'll trigger alerts whenever they appear in your analysis."
          action={<Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>Add your first indicator</Button>}
        />
      ) : (
        <Table
          columns={cols}
          data={filtered as unknown as Record<string, unknown>[]}
          rowKey="id"
          compact
          emptyMessage="No indicators of this type."
        />
      )}

      <Card className="border-l-2 border-l-accent-500/50">
        <CardHeader>
          <CardTitle>How it works</CardTitle>
        </CardHeader>
        <ul className="space-y-1.5 text-xs text-muted">
          <li>• When File Analyzer hashes a file, all watchlist <strong>hash</strong> entries are checked.</li>
          <li>• <strong>IPs, domains, URLs, strings</strong>: matched in any text-bearing output (extracted strings, log lines, headers).</li>
          <li>• <strong>Regex</strong>: case-insensitive, applied across the same surface as strings.</li>
          <li>• Matches surface as banners on the analyzer pages and bump hit counters here.</li>
        </ul>
      </Card>

      <Dialog open={showAdd} onClose={() => setShowAdd(false)} title="Add Indicator to Watchlist" size="md">
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Type" value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value as WatchType}))}>
              {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
            <Select label="Severity" value={form.severity} onChange={e => setForm(p => ({...p, severity: e.target.value as Severity}))}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </Select>
          </div>
          <Input
            label={`Value * (${form.type === 'regex' ? 'JS regex source' : form.type === 'hash' ? 'MD5 / SHA-1 / SHA-256' : TYPE_LABEL[form.type]})`}
            value={form.value}
            onChange={e => setForm(p => ({...p, value: e.target.value}))}
            placeholder={
              form.type === 'hash' ? 'abc123…' :
              form.type === 'ip' ? '192.0.2.1' :
              form.type === 'domain' ? 'evil.example.com' :
              form.type === 'url' ? 'https://evil.example.com/path' :
              form.type === 'regex' ? '(?:CVE-\\d{4}-\\d{4,7})' :
              'literal text to match'
            }
            required
          />
          <Input
            label="Label"
            value={form.label}
            onChange={e => setForm(p => ({...p, label: e.target.value}))}
            placeholder="Friendly name — defaults to the value if blank"
          />
          <Textarea
            label="Notes"
            value={form.notes}
            onChange={e => setForm(p => ({...p, notes: e.target.value}))}
            rows={2}
            placeholder="Source, campaign, reference, …"
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Add to Watchlist</Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
