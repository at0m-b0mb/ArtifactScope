import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderKanban, Plus, Search, Trash2 } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge, statusBadge } from '../components/ui/Badge'
import { Input, Select, Textarea } from '../components/ui/Input'
import { Dialog } from '../components/ui/Dialog'
import { EmptyState } from '../components/ui/EmptyState'
import { api } from '../lib/api'
import { timeAgo } from '../lib/format'
import { useCaseStore, Case } from '../stores/caseStore'
import { useToast } from '../components/ui/Toast'

interface CreateForm {
  name: string; case_number: string; investigator: string; agency: string
  status: string; priority: string; description: string; tags: string
}

const EMPTY_FORM: CreateForm = { name: '', case_number: '', investigator: '', agency: '', status: 'open', priority: 'medium', description: '', tags: '' }

export default function Cases(): React.JSX.Element {
  const navigate = useNavigate()
  const { setActiveCase } = useCaseStore()
  const { success, error } = useToast()
  const [cases, setCases] = useState<Case[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM)
  const [creating, setCreating] = useState(false)

  function load() {
    api.cases.list().then(r => setCases((r.data ?? []) as Case[]))
  }

  useEffect(load, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.case_number || !form.investigator) return
    setCreating(true)
    const r = await api.cases.create(form)
    setCreating(false)
    if (r.error) { error('Failed to create case', r.error); return }
    success('Case created', form.name)
    setShowCreate(false)
    setForm(EMPTY_FORM)
    load()
    const newCase = r.data as Case
    setActiveCase(newCase)
    navigate(`/cases/${newCase.id}`)
  }

  async function handleDelete(id: string, name: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(`Delete case "${name}"? This cannot be undone.`)) return
    await api.cases.delete(id)
    success('Case deleted')
    load()
  }

  const filtered = cases.filter(c => {
    const matchStatus = statusFilter === 'all' || c.status === statusFilter
    const q = search.toLowerCase()
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.case_number.toLowerCase().includes(q) || c.investigator.toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Cases</h1>
          <p className="text-xs text-muted">{cases.length} total · {cases.filter(c => c.status === 'open').length} open</p>
        </div>
        <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>
          New Case
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Input icon={<Search className="w-3.5 h-3.5" />} placeholder="Search cases…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-36">
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="archived">Archived</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="w-7 h-7" />}
          title={search ? 'No matching cases' : 'No cases yet'}
          description={search ? 'Try a different search.' : 'Create your first investigation case to get started.'}
          action={!search && <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>New Case</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map(c => (
            <Card
              key={c.id}
              onClick={() => { setActiveCase(c); navigate(`/cases/${c.id}`) }}
              className="cursor-pointer hover:border-primary-600/50 hover:bg-surface-3 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-600/20 border border-primary-600/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FolderKanban className="w-5 h-5 text-primary-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white group-hover:text-primary-300 transition-colors">{c.name}</h3>
                      {statusBadge(c.status)}
                      {statusBadge(c.priority)}
                    </div>
                    <p className="text-xs text-muted mt-0.5">#{c.case_number} · {c.investigator}{c.agency ? ` · ${c.agency}` : ''}</p>
                    {c.description && <p className="text-xs text-muted mt-1 line-clamp-1">{c.description}</p>}
                    {c.tags && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {c.tags.split(',').filter(Boolean).map(t => (
                          <Badge key={t} variant="muted" className="text-[10px]">{t.trim()}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-muted">{timeAgo(c.updated_at)}</span>
                  <button
                    onClick={(e) => handleDelete(c.id, c.name, e)}
                    className="p-1.5 rounded text-muted hover:text-danger hover:bg-danger/10 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onClose={() => setShowCreate(false)} title="New Investigation Case" size="lg">
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Case Name *" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="Operation Thunder" required />
            <Input label="Case Number *" value={form.case_number} onChange={e => setForm(p => ({...p, case_number: e.target.value}))} placeholder="2025-001" required />
            <Input label="Lead Investigator *" value={form.investigator} onChange={e => setForm(p => ({...p, investigator: e.target.value}))} placeholder="Det. Jane Smith" required />
            <Input label="Agency" value={form.agency} onChange={e => setForm(p => ({...p, agency: e.target.value}))} placeholder="Cybercrime Unit" />
            <Select label="Status" value={form.status} onChange={e => setForm(p => ({...p, status: e.target.value}))}>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="archived">Archived</option>
            </Select>
            <Select label="Priority" value={form.priority} onChange={e => setForm(p => ({...p, priority: e.target.value}))}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </Select>
          </div>
          <Input label="Tags (comma-separated)" value={form.tags} onChange={e => setForm(p => ({...p, tags: e.target.value}))} placeholder="malware, financial, phishing" />
          <Textarea label="Description" value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} rows={3} placeholder="Brief description of the investigation…" />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={creating}>Create Case</Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
