import React, { useState, useEffect } from 'react'
import { cn } from '../../lib/cn'
import { api } from '../../lib/api'
import { Spinner } from './Progress'

interface HexPage {
  offset: number
  rows: { offset: number; hex: string[]; ascii: string }[]
  total_pages: number
  page: number
}

interface HexViewProps {
  filePath: string
  className?: string
}

export function HexView({ filePath, className }: HexViewProps): React.JSX.Element {
  const [page, setPage] = useState(0)
  const [data, setData] = useState<HexPage | null>(null)
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    setLoading(true)
    api.file.hex(filePath, page).then((res) => {
      setData(res.data as HexPage | null)
      setLoading(false)
    })
  }, [filePath, page])

  if (loading) return <div className="flex items-center justify-center py-12"><Spinner /></div>
  if (!data) return <div className="text-muted text-sm p-4">No data</div>

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="overflow-auto rounded-lg bg-surface-3 border border-surface-4">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="text-muted border-b border-surface-4">
              <th className="px-3 py-1.5 text-left w-24">Offset</th>
              <th className="px-3 py-1.5 text-left">00 01 02 03 04 05 06 07&nbsp;&nbsp;08 09 0A 0B 0C 0D 0E 0F</th>
              <th className="px-3 py-1.5 text-left">ASCII</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.offset} className="hover:bg-surface-4/30 transition-colors">
                <td className="px-3 py-0.5 text-accent-400 select-all">
                  {row.offset.toString(16).toUpperCase().padStart(8, '0')}
                </td>
                <td className="px-3 py-0.5">
                  <span className="text-gray-300">
                    {row.hex.slice(0, 8).join(' ')}
                  </span>
                  <span className="mx-2 text-surface-4">│</span>
                  <span className="text-gray-300">
                    {row.hex.slice(8).join(' ')}
                  </span>
                </td>
                <td className="px-3 py-0.5 text-success tracking-widest">{row.ascii}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-muted px-1">
        <span>Page {data.page + 1} of {data.total_pages}</span>
        <div className="flex gap-1">
          <button
            disabled={page === 0}
            onClick={() => setPage(0)}
            className="px-2 py-0.5 rounded border border-surface-4 hover:border-primary-600 disabled:opacity-30 transition-colors"
          >«</button>
          <button
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            className="px-2 py-0.5 rounded border border-surface-4 hover:border-primary-600 disabled:opacity-30 transition-colors"
          >‹</button>
          <button
            disabled={page >= data.total_pages - 1}
            onClick={() => setPage(p => p + 1)}
            className="px-2 py-0.5 rounded border border-surface-4 hover:border-primary-600 disabled:opacity-30 transition-colors"
          >›</button>
          <button
            disabled={page >= data.total_pages - 1}
            onClick={() => setPage(data.total_pages - 1)}
            className="px-2 py-0.5 rounded border border-surface-4 hover:border-primary-600 disabled:opacity-30 transition-colors"
          >»</button>
        </div>
      </div>
    </div>
  )
}
