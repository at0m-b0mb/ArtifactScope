import React, { useEffect, useState } from 'react'
import { Shield, Search, HelpCircle } from 'lucide-react'
import { useCaseStore } from '../../stores/caseStore'
import { api } from '../../lib/api'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '../../stores/uiStore'
import { Kbd } from '../ui/Kbd'

export default function TitleBar(): React.JSX.Element {
  const [platform, setPlatform] = useState('linux')
  const [isMaximized, setIsMaximized] = useState(false)
  const { activeCase } = useCaseStore()
  const navigate = useNavigate()
  const { setPaletteOpen, setHelpOpen } = useUIStore()

  useEffect(() => {
    api.window.platform().then(setPlatform)
    api.window.isMaximized().then(setIsMaximized)
  }, [])

  const isMac = platform === 'darwin'

  return (
    <div
      className="flex items-center h-11 bg-surface-1 border-b border-surface-4 select-none drag-region"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* macOS traffic lights spacer */}
      {isMac && <div className="w-20 flex-shrink-0" />}

      {/* Logo */}
      {!isMac && (
        <div className="flex items-center gap-2 px-4 no-drag">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center">
            <Shield className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold gradient-text">ArtifactScope</span>
        </div>
      )}

      {isMac && (
        <div className="flex items-center gap-2 px-3 no-drag">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center">
            <Shield className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold gradient-text">ArtifactScope</span>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center gap-3">
        {/* Command palette trigger */}
        <button
          onClick={() => setPaletteOpen(true)}
          className="no-drag flex items-center gap-2 px-3 py-1 h-7 rounded-lg bg-surface-3 border border-surface-4 text-xs text-muted hover:border-primary-600 hover:text-white transition-colors w-72 max-w-[40vw]"
          title="Open command palette"
        >
          <Search className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="flex-1 text-left truncate">Search tools, jump anywhere…</span>
          <Kbd keys="mod+k" size="xs" />
        </button>

        {/* Active case chip */}
        {activeCase && (
          <button
            onClick={() => navigate(`/cases/${activeCase.id}`)}
            className="no-drag flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-3 border border-surface-4 text-xs text-muted hover:border-primary-600 hover:text-primary-400 transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            <span className="max-w-[180px] truncate">{activeCase.name}</span>
            <span className="text-surface-4">#{activeCase.case_number}</span>
          </button>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1 px-2 no-drag">
        <button
          onClick={() => setHelpOpen(true)}
          className="w-8 h-8 flex items-center justify-center rounded-md text-muted hover:text-white hover:bg-surface-3 transition-colors"
          title="Keyboard shortcuts (?)"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
        {/* Windows/Linux window controls */}
        {!isMac && (
          <div className="flex items-center ml-2">
            <button
              onClick={() => api.window.minimize()}
              className="w-11 h-9 flex items-center justify-center text-muted hover:text-white hover:bg-surface-3 transition-colors"
              title="Minimize"
            >
              <span className="w-3 h-px bg-current block" />
            </button>
            <button
              onClick={() => { api.window.maximize(); setIsMaximized(p => !p) }}
              className="w-11 h-9 flex items-center justify-center text-muted hover:text-white hover:bg-surface-3 transition-colors"
              title={isMaximized ? 'Restore' : 'Maximize'}
            >
              <span className={`w-3 h-3 border border-current block ${isMaximized ? 'rounded-sm' : ''}`} />
            </button>
            <button
              onClick={() => api.window.close()}
              className="w-11 h-9 flex items-center justify-center text-muted hover:text-white hover:bg-red-600 transition-colors"
              title="Close"
            >
              <span className="text-base leading-none">✕</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
