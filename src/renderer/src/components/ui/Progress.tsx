import React from 'react'
import { cn } from '../../lib/cn'

interface ProgressProps {
  value: number       // 0–100
  label?: string
  color?: 'primary' | 'success' | 'warning' | 'danger'
  className?: string
}

const colors = {
  primary: 'bg-primary-600',
  success: 'bg-success',
  warning: 'bg-warning',
  danger:  'bg-danger',
}

export function Progress({ value, label, color = 'primary', className }: ProgressProps): React.JSX.Element {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted">{label}</span>
          <span className="text-white font-medium">{Math.round(value)}%</span>
        </div>
      )}
      <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-300', colors[color])}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  )
}

export function Spinner({ className }: { className?: string }): React.JSX.Element {
  return (
    <div className={cn('w-5 h-5 border-2 border-surface-4 border-t-primary-600 rounded-full animate-spin', className)} />
  )
}
