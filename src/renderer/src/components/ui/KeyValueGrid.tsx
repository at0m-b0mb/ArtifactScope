import React from 'react'
import { cn } from '../../lib/cn'

interface KVItem { key: string; value: string | number | null | undefined }

interface KeyValueGridProps {
  items: KVItem[]
  columns?: 1 | 2 | 3
  mono?: boolean
  className?: string
}

export function KeyValueGrid({ items, columns = 2, mono = false, className }: KeyValueGridProps): React.JSX.Element {
  const colClass = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3' }[columns]
  return (
    <dl className={cn('grid gap-x-4 gap-y-2', colClass, className)}>
      {items.map((item) => (
        <div key={item.key} className="flex flex-col gap-0.5 min-w-0">
          <dt className="text-[10px] uppercase tracking-wide text-muted font-medium">{item.key}</dt>
          <dd className={cn('text-sm text-white break-all', mono && 'font-mono text-xs')}>
            {item.value != null && item.value !== '' ? String(item.value) : <span className="text-muted">—</span>}
          </dd>
        </div>
      ))}
    </dl>
  )
}
