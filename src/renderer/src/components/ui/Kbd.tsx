import React from 'react'
import { cn } from '../../lib/cn'
import { prettyKeys } from '../../lib/shortcuts'

interface KbdProps {
  keys: string
  className?: string
  size?: 'xs' | 'sm'
}

export function Kbd({ keys, className, size = 'sm' }: KbdProps): React.JSX.Element {
  const parts = prettyKeys(keys)
  const sz = size === 'xs' ? 'text-[10px] px-1.5 h-4 min-w-[1rem]' : 'text-xs px-1.5 h-5 min-w-[1.25rem]'
  return (
    <span className="inline-flex items-center gap-1">
      {parts.map((p, i) => (
        <kbd
          key={i}
          className={cn(
            'inline-flex items-center justify-center rounded border border-surface-4 bg-surface-3 text-muted font-mono font-medium',
            sz,
            className
          )}
        >
          {p}
        </kbd>
      ))}
    </span>
  )
}
