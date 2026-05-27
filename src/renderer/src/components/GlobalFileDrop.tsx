import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { FileSearch } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { setPendingFile } from '../lib/storage'

/**
 * Global drop zone: drag any file onto the window and we open it in File Analyzer.
 * We avoid hijacking native drops that happen inside an active <input type="file"> or
 * an explicit "no-global-drop" container.
 */
export function GlobalFileDrop(): React.JSX.Element {
  const navigate = useNavigate()
  const [overlay, setOverlay] = useState(false)
  const [dragDepth, setDragDepth] = useState(0)

  useEffect(() => {
    let depth = 0

    function isFileDrag(e: DragEvent): boolean {
      const types = e.dataTransfer?.types
      if (!types) return false
      for (let i = 0; i < types.length; i++) {
        if (types[i] === 'Files') return true
      }
      return false
    }

    function onDragEnter(e: DragEvent) {
      if (!isFileDrag(e)) return
      depth += 1
      setDragDepth(depth)
      if (depth === 1) setOverlay(true)
      e.preventDefault()
    }
    function onDragOver(e: DragEvent) {
      if (!isFileDrag(e)) return
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    }
    function onDragLeave(e: DragEvent) {
      if (!isFileDrag(e)) return
      depth = Math.max(0, depth - 1)
      setDragDepth(depth)
      if (depth === 0) setOverlay(false)
    }
    function onDrop(e: DragEvent) {
      depth = 0
      setDragDepth(0)
      setOverlay(false)
      if (!e.dataTransfer || e.dataTransfer.files.length === 0) return
      // Skip if drop happened inside an explicit drop zone (which will handle it).
      let el = e.target as HTMLElement | null
      while (el) {
        if (el.dataset && (el.dataset.dropzone === 'true' || el.dataset.noGlobalDrop === 'true')) return
        el = el.parentElement
      }
      e.preventDefault()
      const file = e.dataTransfer.files[0] as File & { path?: string }
      const path = file.path
      if (!path) return
      setPendingFile(path)
      navigate('/file-analyzer')
    }

    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragenter', onDragEnter)
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('drop', onDrop)
    }
  }, [navigate])

  return createPortal(
    <AnimatePresence>
      {overlay && dragDepth > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          className="fixed inset-0 z-[120] pointer-events-none flex items-center justify-center bg-primary-600/15 backdrop-blur-[2px]"
        >
          <div className="rounded-2xl border-2 border-dashed border-primary-500 bg-surface-2/90 px-8 py-6 text-center shadow-2xl">
            <FileSearch className="w-8 h-8 text-primary-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-white">Drop to analyze</p>
            <p className="text-xs text-muted mt-0.5">Opens in File Analyzer</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
