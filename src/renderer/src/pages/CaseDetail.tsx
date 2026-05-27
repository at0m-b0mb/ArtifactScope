import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FolderKanban, Plus, FileText, Shield, ArrowLeft, StickyNote, Check } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge, statusBadge } from '../components/ui/Badge'
import { Input, Select, Textarea } from '../components/ui/Input'
import { Dialog } from '../components/ui/Dialog'
import { Table, Column } from '../components/ui/Table'
import { KeyValueGrid } from '../components/ui/KeyValueGrid'
import { api } from '../lib/api'
import { formatDate, formatBytes } from '../lib/format'
import { useCaseStore, Case } from '../stores/caseStore'
import { useToast } from '../components/ui/Toast'
import { getCaseNotes, setCaseNotes } from '../lib/storage'

interface EvidenceRow { id: string; name: string; type: string; source_path: string; md5: string; sha256: string; size_bytes: number; notes: string; added_at: string; added_by: string }
interface CustodyRow { id: number; action: string; actor: string; description: string; timestamp: string; row_hash: string; prev_hash: string }

export default function CaseDetail(): React.JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { setActiveCase } = useCaseStore()
  const { success, error } = useToast()
  const [caseData, setCaseData] = useState<Case | null>(null)
  const [evidence, setEvidence] = useState<EvidenceRow[]>([])
  const [custody, setCustody] = useState<CustodyRow[]>([])
  const [showAddEvidence, setShowAddEvidence] = useState(false)
  const [showCustody, setShowCustody] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', type: 'file', source_path: '', sha256: '', md5: '', size_bytes: 0, notes: '' })
  const [notes, setNotes] = useState('')
  const [notesSaved, setNotesSaved] = useState(false)

  // Load notes when case changes
  useEffect(() => { if (id) setNotes(getCaseNotes(id)) }, [id])

  // Auto-save (debounced) when notes change
  useEffect(() => {
    if (!id) return
    const handle = window.setTimeout(() => {
      setCaseNotes(id, notes)
      setNotesSaved(true)
      window.setTimeout(() => setNotesSaved(false), 1500)
    }, 500)
    return () => window.clearTimeout(handle)
  }, [id, notes])

  function load() {
    if (!id) return
    api.cases.get(id).then(r => {
      if (r.data) { setCaseData(r.data as Case); setActiveCase(r.data as Case) }
    })
    api.evidence.list(id).then(r => setEvidence((r.data ?? []) as EvidenceRow[]))
    api.custody.list(id).then(r => setCustody((r.data ?? []) as CustodyRow[]))
  }

  useEffect(load, [id])

  async function addEvidence(e: React.FormEvent) {
    e.preventDefault()
    if (!id) return
    const r = await api.evidence.add({ ...addForm, case_id: id, added_by: caseData?.investigator ?? '' })
    if (r.error) { error('Failed to add evidence', r.error); return }
    success('Evidence added')
    setShowAddEvidence(false)
    setAddForm({ name: '', type: 'file', source_path: '', sha256: '', md5: '', size_bytes: 0, notes: '' })
    load()
  }

  const evCols: Column<EvidenceRow>[] = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'type', header: 'Type', render: r => <Badge variant="muted">{r.type}</Badge> },
    { key: 'sha256', header: 'SHA-256', className: 'font-mono text-xs', render: r => r.sha256 ? r.sha256.slice(0,16)+'…' : '—' },
    { key: 'size_bytes', header: 'Size', render: r => r.size_bytes > 0 ? formatBytes(r.size_bytes) : '—', sortable: true },
    { key: 'added_at', header: 'Added', render: r => formatDate(r.added_at), sortable: true },
  ]

  if (!caseData) return <div className="flex items-center justify-center h-full"><p className="text-muted">Loading…</p></div>

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/cases')} className="p-1.5 rounded text-muted hover:text-white hover:bg-surface-3 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <FolderKanban className="w-5 h-5 text-primary-400" />
          <h1 className="text-lg font-bold text-white">{caseData.name}</h1>
          {statusBadge(caseData.status)}
          {statusBadge(caseData.priority)}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" icon={<Shield className="w-3.5 h-3.5" />} onClick={() => setShowCustody(true)}>
            Custody Log
          </Button>
          <Button size="sm" variant="outline" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowAddEvidence(true)}>
            Add Evidence
          </Button>
          <Button size="sm" variant="primary" icon={<FileText className="w-3.5 h-3.5" />} onClick={() => navigate('/reports')}>
            Generate Report
          </Button>
        </div>
      </div>

      {/* Case Info */}
      <Card>
        <CardHeader>
          <CardTitle>Case Information</CardTitle>
          <span className="text-xs text-muted">#{caseData.case_number}</span>
        </CardHeader>
        <KeyValueGrid items={[
          { key: 'Investigator', value: caseData.investigator },
          { key: 'Agency', value: caseData.agency },
          { key: 'Opened', value: formatDate(caseData.created_at) },
          { key: 'Last Updated', value: formatDate(caseData.updated_at) },
          { key: 'Tags', value: caseData.tags || '—' },
          { key: 'Description', value: caseData.description || '—' },
        ]} columns={3} />
      </Card>

      <div className="grid grid-cols-3 gap-4">
        {/* Evidence (spans 2 cols) */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Evidence ({evidence.length})</CardTitle>
            <Button size="xs" variant="outline" icon={<Plus className="w-3 h-3" />} onClick={() => setShowAddEvidence(true)}>Add</Button>
          </CardHeader>
          <Table columns={evCols} data={evidence as unknown as Record<string, unknown>[]} rowKey="id" emptyMessage="No evidence added yet" />
        </Card>

        {/* Investigator notes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <StickyNote className="w-3.5 h-3.5 text-warning" />
              Notes
            </CardTitle>
            <span className={`flex items-center gap-1 text-[10px] transition-opacity ${notesSaved ? 'opacity-100 text-success' : 'opacity-0'}`}>
              <Check className="w-3 h-3" /> Saved
            </span>
          </CardHeader>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Investigator notes (markdown supported)…  ⌘ Saved locally per case."
            className="w-full h-52 bg-surface-3/40 border border-surface-4 rounded-lg p-3 text-xs text-white placeholder:text-muted font-mono leading-relaxed resize-none focus:outline-none focus:border-warning/60 transition-colors"
            data-no-global-drop="true"
          />
          <p className="text-[10px] text-muted mt-1.5">Stored locally per-case in your browser storage. Use the report tool for finalized writeups.</p>
        </Card>
      </div>

      {/* Add Evidence Dialog */}
      <Dialog open={showAddEvidence} onClose={() => setShowAddEvidence(false)} title="Add Evidence" size="lg">
        <form onSubmit={addEvidence} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Evidence Name *" value={addForm.name} onChange={e => setAddForm(p=>({...p,name:e.target.value}))} required />
            <Select label="Type" value={addForm.type} onChange={e => setAddForm(p=>({...p,type:e.target.value}))}>
              <option value="file">File</option>
              <option value="disk_image">Disk Image</option>
              <option value="memory_dump">Memory Dump</option>
              <option value="network_capture">Network Capture</option>
              <option value="log">Log File</option>
              <option value="other">Other</option>
            </Select>
          </div>
          <Input label="Source Path" value={addForm.source_path} onChange={e => setAddForm(p=>({...p,source_path:e.target.value}))} placeholder="/path/to/evidence" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="SHA-256" value={addForm.sha256} onChange={e => setAddForm(p=>({...p,sha256:e.target.value}))} placeholder="hash…" />
            <Input label="MD5" value={addForm.md5} onChange={e => setAddForm(p=>({...p,md5:e.target.value}))} placeholder="hash…" />
          </div>
          <Textarea label="Notes" value={addForm.notes} onChange={e => setAddForm(p=>({...p,notes:e.target.value}))} rows={2} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowAddEvidence(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Add Evidence</Button>
          </div>
        </form>
      </Dialog>

      {/* Custody Log Dialog */}
      <Dialog open={showCustody} onClose={() => setShowCustody(false)} title="Chain of Custody" size="xl">
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {custody.length === 0 ? (
            <p className="text-muted text-sm text-center py-8">No custody entries yet.</p>
          ) : custody.map(c => (
            <div key={c.id} className="p-3 rounded-lg bg-surface-3 border border-surface-4 border-l-2 border-l-primary-600">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold text-primary-400">{c.action}</span>
                  <span className="text-xs text-muted ml-2">by {c.actor}</span>
                </div>
                <span className="text-[10px] text-muted">{formatDate(c.timestamp)}</span>
              </div>
              {c.description && <p className="text-xs text-white mt-0.5">{c.description}</p>}
              <p className="text-[9px] font-mono text-muted mt-1 break-all">H: {c.row_hash}</p>
            </div>
          ))}
        </div>
      </Dialog>
    </div>
  )
}
