import React, { useEffect, useState } from 'react'
import { Activity, Search, Shield, CheckCircle, XCircle, Download } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { Table, Column } from '../components/ui/Table'
import { api } from '../lib/api'
import { formatDate, timeAgo } from '../lib/format'
import { exportCSV, exportJSON } from '../lib/export'

interface ActivityRow {
  id: number; event_type: string; description: string; metadata: string | null
  timestamp: string; row_hash: string; prev_hash: string
}

interface IntegrityResult {
  valid: boolean; total: number; checked: number; broken_at: number | null
}

export default function ActivityLog(): React.JSX.Element {
  const [rows, setRows] = useState<ActivityRow[]>([])
  const [search, setSearch] = useState('')
  const [integrity, setIntegrity] = useState<IntegrityResult | null>(null)
  const [checkingIntegrity, setCheckingIntegrity] = useState(false)
  const [selected, setSelected] = useState<ActivityRow | null>(null)

  function load() {
    api.activity.list(500).then(r => setRows((r.data ?? []) as ActivityRow[]))
  }

  useEffect(load, [])

  async function checkIntegrity() {
    setCheckingIntegrity(true)
    const r = await api.activity.checkIntegrity()
    setCheckingIntegrity(false)
    if (r.data) setIntegrity(r.data as IntegrityResult)
  }

  const filtered = rows.filter(r =>
    !search || r.description.toLowerCase().includes(search.toLowerCase()) ||
    r.event_type.toLowerCase().includes(search.toLowerCase())
  )

  const EVENT_COLORS: Record<string, 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'muted'> = {
    file_analyze: 'primary', case_create: 'success', case_update: 'success', case_delete: 'danger',
    evidence_add: 'accent', custody_add: 'accent', hash_lookup: 'warning', hash_import: 'warning',
    browser_collect: 'primary', system_info: 'primary', log_analyze: 'primary',
    timeline_build: 'primary', image_analyze: 'primary', ioc_hunt: 'warning',
    report_generate: 'success', settings_update: 'muted',
  }

  const cols: Column<ActivityRow>[] = [
    { key: 'timestamp', header: 'Time', width: '150px', sortable: true, render: r => (
      <div>
        <p className="text-xs font-mono text-white">{formatDate(r.timestamp)}</p>
        <p className="text-[10px] text-muted">{timeAgo(r.timestamp)}</p>
      </div>
    )},
    { key: 'event_type', header: 'Event', width: '160px', render: r => (
      <Badge variant={EVENT_COLORS[r.event_type] ?? 'muted'} className="text-[10px]">{r.event_type.replace(/_/g, ' ')}</Badge>
    )},
    { key: 'description', header: 'Description', render: r => <span className="text-xs text-white">{r.description}</span> },
    { key: 'row_hash', header: 'Hash', width: '100px', render: r => (
      <span className="font-mono text-[9px] text-muted select-all">{r.row_hash.slice(0,12)}…</span>
    )},
  ]

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary-400" />
          <h1 className="text-lg font-bold text-white">Activity Log</h1>
          <Badge variant="muted">{rows.length.toLocaleString()} entries</Badge>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={() => exportCSV(filtered as unknown as Record<string, unknown>[], 'activity-log',
              ['id', 'event_type', 'description', 'timestamp', 'row_hash', 'prev_hash'])}
            disabled={filtered.length === 0}
          >
            CSV
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={() => exportJSON(filtered, 'activity-log')}
            disabled={filtered.length === 0}
          >
            JSON
          </Button>
          <Button
            size="sm"
            variant="outline"
            icon={<Shield className="w-3.5 h-3.5" />}
            onClick={checkIntegrity}
            loading={checkingIntegrity}
          >
            Verify Integrity
          </Button>
        </div>
      </div>

      {/* Integrity result */}
      {integrity && (
        <div className={`flex items-center gap-3 p-3 rounded-lg border text-sm ${
          integrity.valid
            ? 'bg-success/10 border-success/30 text-success'
            : 'bg-danger/10 border-danger/30 text-danger'
        }`}>
          {integrity.valid
            ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
            : <XCircle className="w-4 h-4 flex-shrink-0" />}
          <span>
            {integrity.valid
              ? `Chain integrity verified — all ${integrity.total.toLocaleString()} entries are tamper-free.`
              : `Integrity BROKEN at entry #${integrity.broken_at} — ${integrity.checked} of ${integrity.total} entries verified before failure.`}
          </span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {/* Log table */}
        <div className="col-span-2 space-y-3">
          <Input
            icon={<Search className="w-3.5 h-3.5" />}
            placeholder="Search activity…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Table
            columns={cols}
            data={filtered as unknown as Record<string, unknown>[]}
            rowKey="id"
            compact
            onRowClick={r => setSelected(r as unknown as ActivityRow)}
            emptyMessage="No activity recorded yet."
          />
        </div>

        {/* Detail panel */}
        <div>
          {selected ? (
            <Card>
              <CardHeader>
                <CardTitle>Entry Detail</CardTitle>
                <button onClick={() => setSelected(null)} className="text-xs text-muted hover:text-white">×</button>
              </CardHeader>
              <div className="space-y-3">
                <Badge variant={EVENT_COLORS[selected.event_type] ?? 'muted'}>{selected.event_type.replace(/_/g, ' ')}</Badge>
                <p className="text-sm text-white">{selected.description}</p>
                {selected.metadata && (
                  <div className="p-2 rounded-lg bg-surface-3 border border-surface-4">
                    <p className="text-[10px] text-muted mb-1">Metadata</p>
                    <pre className="text-[10px] font-mono text-green-300 whitespace-pre-wrap break-all">
                      {JSON.stringify(JSON.parse(selected.metadata), null, 2)}
                    </pre>
                  </div>
                )}
                <div className="border-t border-surface-4 pt-3 space-y-2">
                  <p className="text-[10px] text-muted font-semibold uppercase tracking-wide">Chain of Evidence</p>
                  <div className="space-y-1.5 text-[10px] font-mono">
                    <div>
                      <span className="text-muted">Entry ID: </span>
                      <span className="text-white">{selected.id}</span>
                    </div>
                    <div>
                      <span className="text-muted">Timestamp: </span>
                      <span className="text-white">{selected.timestamp}</span>
                    </div>
                    <div>
                      <span className="text-muted">Prev hash: </span>
                      <span className="text-primary-300 break-all select-all">{selected.prev_hash}</span>
                    </div>
                    <div>
                      <span className="text-muted">Row hash: </span>
                      <span className="text-accent-300 break-all select-all">{selected.row_hash}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="flex flex-col items-center justify-center py-12 gap-2">
              <Activity className="w-8 h-8 text-muted" />
              <p className="text-sm text-muted text-center">Click an entry to inspect its hash chain details.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
