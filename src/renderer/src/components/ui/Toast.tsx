import React, { createContext, useContext, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { cn } from '../../lib/cn'
import { motion, AnimatePresence } from 'framer-motion'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: number
  type: ToastType
  title: string
  message?: string
}

interface ToastCtx {
  toast: (t: Omit<Toast, 'id'>) => void
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
}

const Ctx = createContext<ToastCtx>({
  toast: () => {},
  success: () => {},
  error: () => {},
  warning: () => {},
  info: () => {},
})

let counter = 0
const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle  className="w-4 h-4 text-success" />,
  error:   <AlertCircle  className="w-4 h-4 text-danger" />,
  warning: <AlertTriangle className="w-4 h-4 text-warning" />,
  info:    <Info         className="w-4 h-4 text-accent-400" />,
}
const borders: Record<ToastType, string> = {
  success: 'border-l-success',
  error:   'border-l-danger',
  warning: 'border-l-warning',
  info:    'border-l-accent-500',
}

export function ToastProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: number) => setToasts(t => t.filter(x => x.id !== id)), [])

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = ++counter
    setToasts(prev => [...prev, { ...t, id }])
    setTimeout(() => remove(id), 4000)
  }, [remove])

  const value: ToastCtx = {
    toast,
    success: (title, message) => toast({ type: 'success', title, message }),
    error:   (title, message) => toast({ type: 'error',   title, message }),
    warning: (title, message) => toast({ type: 'warning', title, message }),
    info:    (title, message) => toast({ type: 'info',    title, message }),
  }

  return (
    <Ctx.Provider value={value}>
      {children}
      {createPortal(
        <div className="fixed bottom-8 right-4 flex flex-col gap-2 z-[100] max-w-sm">
          <AnimatePresence>
            {toasts.map((t) => (
              <motion.div
                key={t.id}
                initial={{ x: 60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 60, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  'flex items-start gap-3 bg-surface-2 border border-surface-4 border-l-2 rounded-xl px-4 py-3 shadow-xl',
                  borders[t.type]
                )}
              >
                <span className="flex-shrink-0 mt-0.5">{icons[t.type]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{t.title}</p>
                  {t.message && <p className="text-xs text-muted mt-0.5">{t.message}</p>}
                </div>
                <button onClick={() => remove(t.id)} className="flex-shrink-0 text-muted hover:text-white transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </Ctx.Provider>
  )
}

export function Toaster(): React.JSX.Element {
  return <ToastProvider><span /></ToastProvider>
}

// Must wrap App with ToastProvider
export function useToast(): ToastCtx {
  return useContext(Ctx)
}

// Auto-inject ToastProvider into App via a re-export
export { ToastProvider as default }
