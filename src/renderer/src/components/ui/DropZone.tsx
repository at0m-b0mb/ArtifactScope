import React, { useState } from 'react'
import { Upload, FolderOpen } from 'lucide-react'
import { cn } from '../../lib/cn'
import { api } from '../../lib/api'

interface DropZoneProps {
  onFiles: (paths: string[]) => void
  accept?: string
  multiple?: boolean
  directory?: boolean
  label?: string
  hint?: string
  className?: string
}

export function DropZone({ onFiles, accept, multiple = false, directory = false, label, hint, className }: DropZoneProps): React.JSX.Element {
  const [dragging, setDragging] = useState(false)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const files = Array.from(e.dataTransfer.files)
    const paths = files.map(f => (f as { path?: string }).path ?? '').filter(Boolean)
    if (paths.length) onFiles(paths)
  }

  async function handleClick() {
    if (directory) {
      const dir = await api.dialog.openDir()
      if (dir) onFiles([dir])
    } else {
      const paths = await api.dialog.openFile({
        properties: multiple ? ['openFile', 'multiSelections'] : ['openFile'],
        filters: accept ? [{ name: 'Files', extensions: accept.split(',').map(s => s.trim().replace(/^\./, '')) }] : undefined,
      })
      if (paths) onFiles(Array.isArray(paths) ? paths : [paths])
    }
  }

  return (
    <button
      onClick={handleClick}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        'w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed',
        'transition-all duration-200 cursor-pointer p-8 text-center',
        dragging
          ? 'border-primary-500 bg-primary-600/10'
          : 'border-surface-4 hover:border-primary-600/50 hover:bg-surface-3/50',
        className
      )}
    >
      <div className="w-12 h-12 rounded-2xl bg-surface-3 border border-surface-4 flex items-center justify-center">
        {directory ? <FolderOpen className="w-6 h-6 text-primary-400" /> : <Upload className="w-6 h-6 text-primary-400" />}
      </div>
      <div>
        <p className="text-sm font-medium text-white">{label ?? (directory ? 'Drop a folder or click to browse' : 'Drop files or click to browse')}</p>
        {hint && <p className="text-xs text-muted mt-0.5">{hint}</p>}
      </div>
    </button>
  )
}
