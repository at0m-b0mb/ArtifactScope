import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Sparkles, FileSearch, FolderKanban, KeyRound } from 'lucide-react'
import { Dialog } from './ui/Dialog'
import { Button } from './ui/Button'
import { Kbd } from './ui/Kbd'
import { useUIStore } from '../stores/uiStore'
import { hasBeenWelcomed, markWelcomed } from '../lib/storage'

const STEPS = [
  { icon: FolderKanban, title: 'Start with a Case',     body: 'Every investigation begins with a case. Cases keep evidence, custody, and activity bound together.' },
  { icon: FileSearch,   title: 'Drop a file to inspect',body: 'File Analyzer hashes, fingerprints, and surfaces hidden indicators in seconds.' },
  { icon: KeyRound,     title: 'Hash-chained integrity', body: 'Every action is recorded in a tamper-evident log so your chain of custody stays solid.' },
]

export function WelcomeModal(): React.JSX.Element {
  const { welcomeOpen, setWelcomeOpen } = useUIStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!hasBeenWelcomed()) setWelcomeOpen(true)
  }, [setWelcomeOpen])

  function close() {
    markWelcomed()
    setWelcomeOpen(false)
  }

  return (
    <Dialog open={welcomeOpen} onClose={close} size="lg">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-600 to-accent-500 mb-3">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-xl font-bold text-white">Welcome to ArtifactScope</h2>
        <p className="text-sm text-muted mt-1">Cross-platform digital forensics — entirely on your machine.</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-6">
        {STEPS.map((s) => {
          const Icon = s.icon
          return (
            <div key={s.title} className="rounded-xl border border-surface-4 bg-surface-3/40 p-4 text-left">
              <div className="w-9 h-9 rounded-lg bg-primary-600/15 border border-primary-600/30 flex items-center justify-center mb-2">
                <Icon className="w-4 h-4 text-primary-400" />
              </div>
              <p className="text-sm font-semibold text-white">{s.title}</p>
              <p className="text-xs text-muted mt-0.5 leading-relaxed">{s.body}</p>
            </div>
          )
        })}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-surface-4 bg-surface-3/40 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-gray-200">
          <Sparkles className="w-4 h-4 text-accent-400" />
          <span>Press <Kbd keys="mod+k" size="xs" /> anywhere to jump to any tool.</span>
        </div>
        <span className="text-xs text-muted hidden sm:inline">Press <Kbd keys="?" size="xs" /> for shortcuts</span>
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <Button variant="ghost" onClick={close}>Skip</Button>
        <Button variant="primary" onClick={() => { close(); navigate('/cases') }}>Create your first case</Button>
      </div>
    </Dialog>
  )
}
