import React from 'react'
import { cn } from '../../lib/cn'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps): React.JSX.Element {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-6 text-center', className)}>
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-surface-3 border border-surface-4 flex items-center justify-center text-muted mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
      {description && <p className="text-xs text-muted max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
