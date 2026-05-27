import React, { useEffect, useState } from 'react'
import { Monitor, Database, HardDrive } from 'lucide-react'
import { useCaseStore } from '../../stores/caseStore'

export default function StatusBar(): React.JSX.Element {
  const { activeCase } = useCaseStore()
  const [platform, setPlatform] = useState('')

  useEffect(() => {
    window.bridge.window.platform().then((p) => {
      const map: Record<string, string> = { darwin: 'macOS', win32: 'Windows', linux: 'Linux' }
      setPlatform(map[p] || p)
    })
  }, [])

  return (
    <div className="flex items-center h-6 bg-surface-1 border-t border-surface-4 px-3 text-[10px] text-muted select-none">
      <div className="flex items-center gap-3 flex-1">
        <span className="flex items-center gap-1">
          <Monitor className="w-3 h-3" />
          {platform}
        </span>
        {activeCase && (
          <span className="flex items-center gap-1">
            <Database className="w-3 h-3" />
            Case: {activeCase.name}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          <HardDrive className="w-3 h-3" />
          ArtifactScope v1.0.0
        </span>
      </div>
    </div>
  )
}
