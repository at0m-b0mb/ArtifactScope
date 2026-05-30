import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderKanban, FileSearch, Globe, Monitor, Hash, Shield, Activity, Clock, AlertTriangle, CheckCircle, FileText, X, ArrowRight, Lightbulb, Keyboard } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { SkeletonRow, SkeletonStat } from '../components/ui/Skeleton'
import { api } from '../lib/api'
import { timeAgo } from '../lib/format'
import { useCaseStore } from '../stores/caseStore'
import { recentFiles, clearRecentFiles, type RecentFile, readLS, writeLS } from '../lib/storage'
import { ActivityHeatmap } from '../components/ActivityHeatmap'
import { useUIStore } from '../stores/uiStore'

const QUICK_ACTIONS = [
  { label: 'Analyze File',   icon: FileSearch, to: '/file-analyzer',   color: 'from-primary-600 to-primary-700' },
  { label: 'Browser Artifacts', icon: Globe,  to: '/browser',          color: 'from-accent-600 to-accent-700' },
  { label: 'Live System',    icon: Monitor,    to: '/system',           color: 'from-emerald-600 to-emerald-700' },
  { label: 'Hash Lookup',    icon: Hash,       to: '/hash-db',          color: 'from-amber-600 to-amber-700' },
  { label: 'Open Case',      icon: FolderKanban, to: '/cases',         color: 'from-violet-600 to-violet-700' },
  { label: 'Timeline',       icon: Clock,      to: '/timeline',         color: 'from-rose-600 to-rose-700' },
]

export default function Dashboard(): React.JSX.Element {
  const navigate = useNavigate()
  const { activeCase } = useCaseStore()
  const [cases, setCases] = useState<unknown[]>([])
  const [activity, setActivity] = useState<{ id: number; event_type: string; description: string; timestamp: string }[]>([])
  const [hashStats, setHashStats] = useState<{ total: number; known_bad: number }>({ total: 0, known_bad: 0 })
  const [loading, setLoading] = useState(true)
  const [recents, setRecents] = useState<RecentFile[]>([])

  useEffect(() => {
    const sync = () => setRecents(recentFiles())
    sync()
    window.addEventListener('artifactscope:recents-changed', sync)
    return () => window.removeEventListener('artifactscope:recents-changed', sync)
  }, [])

  useEffect(() => {
    Promise.all([
      api.cases.list(),
      api.activity.list(500),
      api.hashdb.stats(),
    ]).then(([c, a, h]) => {
      setCases((c.data as unknown[]) ?? [])
      setActivity((a.data as { id: number; event_type: string; description: string; timestamp: string }[]) ?? [])
      const stats = h.data as { total: number; known_bad: number } | null
      setHashStats({ total: stats?.total ?? 0, known_bad: stats?.known_bad ?? 0 })
      setLoading(false)
    })
  }, [])

  const openCases = (cases as { status: string }[]).filter(c => c.status === 'open').length
  const criticalCases = (cases as { priority: string }[]).filter(c => c.priority === 'critical').length
  const { togglePalette } = useUIStore()
  const [tipsHidden, setTipsHidden] = useState(() => readLS<boolean>('tips-hidden', false))
  const isNewUser = !loading && cases.length === 0 && activity.length === 0
  const showTips = !tipsHidden && !isNewUser

  function hideTips() {
    setTipsHidden(true)
    writeLS('tips-hidden', true)
  }

  return (
    <div className="p-6 space-y-6 min-h-full bg-surface-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary-400" />
            ArtifactScope
          </h1>
          <p className="text-sm text-muted mt-0.5">Cross-Platform Digital Forensics Toolkit</p>
        </div>
        <Button variant="primary" icon={<FolderKanban className="w-4 h-4" />} onClick={() => navigate('/cases')}>
          New Case
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        {loading ? Array.from({ length: 4 }).map((_, i) => <SkeletonStat key={i} />) : [
          { label: 'Open Cases',    value: openCases,          icon: FolderKanban, color: 'text-accent-400',  bg: 'bg-accent-500/10' },
          { label: 'Critical',      value: criticalCases,      icon: AlertTriangle, color: 'text-danger',     bg: 'bg-danger/10' },
          { label: 'Hash DB',       value: hashStats.total,    icon: Hash,          color: 'text-success',    bg: 'bg-success/10' },
          { label: 'Known Bad',     value: hashStats.known_bad,icon: CheckCircle,   color: 'text-warning',    bg: 'bg-warning/10' },
        ].map(s => (
          <Card key={s.label} className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-muted">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Getting Started — shown to brand-new users */}
      {isNewUser && (
        <Card className="border-primary-600/30 bg-gradient-to-br from-primary-600/5 to-accent-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-warning" />
              Getting Started
            </CardTitle>
          </CardHeader>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1">
            {[
              { step: '1', title: 'Create a Case', desc: 'Organize your investigation with cases, evidence, and chain of custody.', action: 'New Case', to: '/cases' },
              { step: '2', title: 'Analyze Evidence', desc: 'Drop files to calculate hashes, extract strings, detect file types, and hunt IOCs.', action: 'File Analyzer', to: '/file-analyzer' },
              { step: '3', title: 'Build Your Hash DB', desc: 'Import known-good / known-bad hash sets (NSRL, custom CSV) for fast lookups.', action: 'Hash Database', to: '/hash-db' },
            ].map(s => (
              <div key={s.step} className="flex flex-col p-3 rounded-xl bg-surface-2 border border-surface-4">
                <div className="w-6 h-6 rounded-full bg-primary-600/20 border border-primary-600/30 flex items-center justify-center text-xs font-bold text-primary-400 mb-2">{s.step}</div>
                <p className="text-sm font-semibold text-white">{s.title}</p>
                <p className="text-xs text-muted mt-0.5 flex-1">{s.desc}</p>
                <Button size="sm" variant="outline" className="mt-3 self-start" icon={<ArrowRight className="w-3 h-3" />}
                  onClick={() => navigate(s.to)}>{s.action}</Button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs text-muted">
            <span className="flex items-center gap-1"><Keyboard className="w-3 h-3" /> Press <kbd className="px-1 py-0.5 rounded bg-surface-3 border border-surface-4 text-[10px] font-mono">Ctrl+K</kbd> to open the command palette anytime</span>
          </div>
        </Card>
      )}

      {/* Tips for returning users */}
      {showTips && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-surface-2 border border-surface-4 text-xs text-muted">
          <Lightbulb className="w-3.5 h-3.5 text-warning flex-shrink-0" />
          <span className="flex-1">
            <strong className="text-white">Tip:</strong> Drop files anywhere in the app to analyze them instantly. Use <button onClick={togglePalette} className="text-primary-400 hover:text-primary-300 transition-colors">Ctrl+K</button> to jump to any tool or paste a hash for quick lookup.
          </span>
          <button onClick={hideTips} className="text-muted hover:text-white transition-colors"><X className="w-3 h-3" /></button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {/* Quick Actions */}
        <div className="col-span-1 space-y-3">
          <p className="section-title">Quick Actions</p>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_ACTIONS.map(a => (
              <button
                key={a.to}
                onClick={() => navigate(a.to)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-surface-2 border border-surface-4 hover:border-primary-600/50 hover:bg-surface-3 transition-all group"
              >
                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${a.color} flex items-center justify-center`}>
                  <a.icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs text-muted group-hover:text-white transition-colors text-center leading-tight">{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Active Case */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Active Case</CardTitle>
          </CardHeader>
          {activeCase ? (
            <div className="space-y-2">
              <div>
                <p className="font-semibold text-white">{activeCase.name}</p>
                <p className="text-xs text-muted">#{activeCase.case_number}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Badge variant={activeCase.status === 'open' ? 'success' : 'muted'} dot>{activeCase.status}</Badge>
                <Badge variant={activeCase.priority === 'critical' ? 'danger' : activeCase.priority === 'high' ? 'danger' : 'warning'}>{activeCase.priority}</Badge>
              </div>
              <p className="text-xs text-muted line-clamp-2">{activeCase.description || 'No description.'}</p>
              <p className="text-xs text-muted">Investigator: {activeCase.investigator}</p>
              <Button size="sm" variant="outline" onClick={() => navigate(`/cases/${activeCase.id}`)}>
                View Case Details
              </Button>
            </div>
          ) : (
            <div className="text-center py-6">
              <FolderKanban className="w-8 h-8 text-muted mx-auto mb-2" />
              <p className="text-sm text-muted">No active case</p>
              <Button size="sm" variant="primary" className="mt-3" onClick={() => navigate('/cases')}>
                Select a Case
              </Button>
            </div>
          )}
        </Card>

        {/* Recent Activity */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <button onClick={() => navigate('/activity')} className="text-xs text-primary-400 hover:text-primary-300 transition-colors">
              View all
            </button>
          </CardHeader>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {loading ? (
              <div className="space-y-1">{Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}</div>
            ) : activity.length === 0 ? (
              <p className="text-xs text-muted py-4 text-center">No activity yet</p>
            ) : activity.slice(0, 10).map(a => (
              <div key={a.id} className="flex items-start gap-2 py-1 border-b border-surface-4 last:border-0">
                <Activity className="w-3 h-3 text-primary-400 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs text-white truncate">{a.description}</p>
                  <p className="text-[10px] text-muted">{timeAgo(a.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Activity heatmap */}
      {!loading && activity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Investigation Activity</CardTitle>
            <span className="text-[10px] text-muted">last 5 weeks</span>
          </CardHeader>
          <ActivityHeatmap activities={activity} days={35} />
        </Card>
      )}

      {/* Recent Files (artifacts you've opened) */}
      {recents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Files</CardTitle>
            <button onClick={clearRecentFiles} className="flex items-center gap-1 text-xs text-muted hover:text-white transition-colors">
              <X className="w-3 h-3" />
              Clear
            </button>
          </CardHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {recents.slice(0, 6).map(r => (
              <button
                key={r.path}
                onClick={() => navigate(r.page)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-surface-3/50 border border-surface-4 hover:border-primary-600/50 hover:bg-surface-3 transition-all text-left group"
              >
                <div className="w-8 h-8 rounded-lg bg-primary-600/15 border border-primary-600/30 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-3.5 h-3.5 text-primary-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-white truncate group-hover:text-primary-300 transition-colors">{r.label}</p>
                  <p className="text-[10px] text-muted">{r.kind} · {timeAgo(r.at)}</p>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Cases */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Cases</CardTitle>
          <Button size="xs" variant="ghost" onClick={() => navigate('/cases')}>All Cases</Button>
        </CardHeader>
        {loading ? (
          <div className="space-y-1">{Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}</div>
        ) : (cases as { id: string; name: string; case_number: string; investigator: string; status: string; priority: string; updated_at: string }[]).slice(0, 5).map(c => (
          <div
            key={c.id}
            onClick={() => navigate(`/cases/${c.id}`)}
            className="flex items-center justify-between py-2 px-1 border-b border-surface-4 last:border-0 hover:bg-surface-3 cursor-pointer rounded transition-colors -mx-1 px-2"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-600/20 flex items-center justify-center">
                <FolderKanban className="w-4 h-4 text-primary-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{c.name}</p>
                <p className="text-xs text-muted">#{c.case_number} · {c.investigator}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={c.status === 'open' ? 'success' : 'muted'} dot>{c.status}</Badge>
              <span className="text-xs text-muted">{timeAgo(c.updated_at)}</span>
            </div>
          </div>
        ))}
        {cases.length === 0 && !loading && (
          <div className="text-center py-8">
            <p className="text-sm text-muted">No cases yet. Create your first case to get started.</p>
            <Button size="sm" variant="primary" className="mt-3" onClick={() => navigate('/cases')}>
              Create Case
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
