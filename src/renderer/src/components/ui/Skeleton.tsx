import React from 'react'
import { cn } from '../../lib/cn'

export function Skeleton({ className }: { className?: string }): React.JSX.Element {
  return <div className={cn('skeleton rounded-md', className)} />
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }): React.JSX.Element {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  )
}

export function SkeletonCard({ className }: { className?: string }): React.JSX.Element {
  return (
    <div className={cn('bg-surface-2 border border-surface-4 rounded-xl p-4 space-y-3', className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  )
}

export function SkeletonRow(): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-surface-4">
      <Skeleton className="w-2 h-2 rounded-full" />
      <Skeleton className="h-3 flex-1" />
      <Skeleton className="h-3 w-16" />
    </div>
  )
}

export function SkeletonStat(): React.JSX.Element {
  return (
    <div className="bg-surface-2 border border-surface-4 rounded-xl p-4 flex items-center gap-3">
      <Skeleton className="w-10 h-10 rounded-xl" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  )
}
