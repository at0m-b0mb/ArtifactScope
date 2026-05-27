import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { motion, AnimatePresence } from 'framer-motion'

interface DialogProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
}

export function Dialog({ open, onClose, title, description, children, className, size = 'md' }: DialogProps): React.ReactPortal | null {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'w-full bg-surface-2 border border-surface-4 rounded-2xl shadow-2xl',
              sizes[size],
              className
            )}
          >
            {(title || description) && (
              <div className="flex items-start justify-between p-5 pb-0">
                <div>
                  {title && <h2 className="text-base font-semibold text-white">{title}</h2>}
                  {description && <p className="text-sm text-muted mt-0.5">{description}</p>}
                </div>
                <button onClick={onClose} className="p-1 rounded text-muted hover:text-white hover:bg-surface-3 transition-colors ml-4 flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
