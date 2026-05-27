import React from 'react'
import { cn } from '../../lib/cn'

type Variant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'accent'

const variants: Record<Variant, string> = {
  default:  'bg-surface-3 text-gray-300 border-surface-4',
  primary:  'bg-primary-600/20 text-primary-400 border-primary-600/30',
  success:  'bg-success/15 text-success border-success/30',
  warning:  'bg-warning/15 text-warning border-warning/30',
  danger:   'bg-danger/15 text-danger border-danger/30',
  info:     'bg-accent-500/15 text-accent-400 border-accent-500/30',
  accent:   'bg-accent-500/15 text-accent-400 border-accent-500/30',
  muted:    'bg-surface-3 text-muted border-surface-4',
}

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant
  dot?: boolean
}

export function Badge({ variant = 'default', dot, children, className, ...props }: BadgeProps): React.JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        variants[variant],
        className
      )}
      {...props}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full bg-current')} />}
      {children}
    </span>
  )
}

export function statusBadge(status: string): React.JSX.Element {
  const map: Record<string, { variant: Parameters<typeof Badge>[0]['variant']; label: string }> = {
    open:     { variant: 'success', label: 'Open' },
    closed:   { variant: 'muted',   label: 'Closed' },
    archived: { variant: 'muted',   label: 'Archived' },
    low:      { variant: 'info',    label: 'Low' },
    medium:   { variant: 'warning', label: 'Medium' },
    high:     { variant: 'danger',  label: 'High' },
    critical: { variant: 'danger',  label: 'Critical' },
    known_good:  { variant: 'success', label: 'Known Good' },
    known_bad:   { variant: 'danger',  label: 'Known Bad' },
    suspicious:  { variant: 'warning', label: 'Suspicious' },
    unknown:     { variant: 'muted',   label: 'Unknown' },
  }
  const cfg = map[status] ?? { variant: 'muted', label: status }
  return <Badge variant={cfg.variant} dot>{cfg.label}</Badge>
}
