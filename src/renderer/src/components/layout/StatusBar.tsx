import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Monitor, Database, HardDrive, Keyboard } from 'lucide-react'
import { useCaseStore } from '../../stores/caseStore'
import { useUIStore } from '../../stores/uiStore'

const PAGE_NAMES: Record<string, string> = {
  '/dashboard': 'Dashboard', '/cases': 'Cases', '/activity': 'Activity Log',
  '/file-analyzer': 'File Analyzer', '/image-forensics': 'Image Forensics',
  '/strings': 'Strings / IOC', '/archive': 'Archive Analyzer', '/compare': 'Compare Files',
  '/browser': 'Browser Artifacts', '/system': 'System Info', '/registry': 'Registry',
  '/email': 'Email Analyzer', '/log-analyzer': 'Log Analyzer', '/network': 'Network / PCAP',
  '/timeline': 'Timeline', '/sqlite': 'SQLite Browser', '/disk-image': 'Disk Image',
  '/hash-db': 'Hash Database', '/watchlist': 'Watchlist', '/reports': 'Reports',
  '/settings': 'Settings',
}

export default function StatusBar(): React.JSX.Element {
  const { activeCase } = useCaseStore()
  const { togglePalette } = useUIStore()
  const location = useLocation()
  const [platform, setPlatform] = useState('')

  useEffect(() => {
    window.bridge.window.platform().then((p) => {
      const map: Record<string, string> = { darwin: 'macOS', win32: 'Windows', linux: 'Linux' }
      setPlatform(map[p] || p)
    })
  }, [])

  const pageName = PAGE_NAMES[location.pathname] || location.pathname.replace(/^\/cases\/.*/, 'Case Detail')

  return (
    <div className="flex items-center h-6 bg-surface-1 border-t border-surface-4 px-3 text-[10px] text-muted select-none">
      <div className="flex items-center gap-3 flex-1">
        <span className="flex items-center gap-1">
          <Monitor className="w-3 h-3" />
          {platform}
        </span>
        <span className="text-muted/40">|</span>
        <span>{pageName}</span>
        {activeCase && (
          <>
            <span className="text-muted/40">|</span>
            <span className="flex items-center gap-1">
              <Database className="w-3 h-3" />
              {activeCase.name}
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button onClick={togglePalette} className="flex items-center gap-1 hover:text-white transition-colors">
          <Keyboard className="w-3 h-3" />
          <span className="font-mono">Ctrl+K</span>
        </button>
        <span className="text-muted/40">|</span>
        <span className="flex items-center gap-1">
          <HardDrive className="w-3 h-3" />
          ArtifactScope v1.0.0
        </span>
      </div>
    </div>
  )
}
