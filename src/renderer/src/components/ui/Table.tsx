import React, { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '../../lib/cn'

export interface Column<T> {
  key: keyof T | string
  header: string
  render?: (row: T) => React.ReactNode
  sortable?: boolean
  className?: string
  headerClass?: string
  width?: string
}

interface TableProps<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: Column<any>[]
  data: T[]
  rowKey: keyof T | ((row: T) => string)
  onRowClick?: (row: T) => void
  emptyMessage?: string
  className?: string
  compact?: boolean
}

export function Table<T extends Record<string, unknown>>({ columns, data, rowKey, onRowClick, emptyMessage, className, compact }: TableProps<T>): React.JSX.Element {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null)

  function getKey(row: T): string {
    if (typeof rowKey === 'function') return rowKey(row)
    return String(row[rowKey])
  }

  function getValue(row: T, col: Column<T>): unknown {
    return (row as Record<string, unknown>)[String(col.key)]
  }

  const sorted = useMemo(() => {
    if (!sort) return data
    return [...data].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sort.key]
      const bv = (b as Record<string, unknown>)[sort.key]
      const cmp = String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true })
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [data, sort])

  function toggleSort(key: string) {
    setSort(prev => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' }
      if (prev.dir === 'asc') return { key, dir: 'desc' }
      return null
    })
  }

  const rowH = compact ? 'py-1' : 'py-2'

  return (
    <div className={cn('overflow-auto rounded-xl border border-surface-4', className)}>
      <table className="w-full text-sm data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={cn(col.headerClass, col.sortable && 'cursor-pointer hover:text-white')}
                style={col.width ? { width: col.width } : undefined}
                onClick={col.sortable ? () => toggleSort(String(col.key)) : undefined}
              >
                <span className="flex items-center gap-1">
                  {col.header}
                  {col.sortable && sort?.key === String(col.key) && (
                    sort.dir === 'asc'
                      ? <ChevronUp className="w-3 h-3" />
                      : <ChevronDown className="w-3 h-3" />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-8 text-center text-muted">
                {emptyMessage ?? 'No data'}
              </td>
            </tr>
          ) : sorted.map((row) => (
            <tr
              key={getKey(row)}
              onClick={() => onRowClick?.(row)}
              className={cn(onRowClick && 'cursor-pointer')}
            >
              {columns.map((col) => (
                <td key={String(col.key)} className={cn(rowH, col.className)}>
                  {col.render ? col.render(row) : String(getValue(row, col) ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
