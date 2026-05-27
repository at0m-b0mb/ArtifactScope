import React from 'react'
import { cn } from '../../lib/cn'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: 'purple' | 'cyan' | 'none'
}

export function Card({ className, glow = 'none', children, ...props }: CardProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'bg-surface-2 border border-surface-4 rounded-xl p-4',
        glow === 'purple' && 'glow-purple border-primary-600/30',
        glow === 'cyan'   && 'glow-cyan border-accent-500/30',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>): React.JSX.Element {
  return (
    <h3 className={cn('text-sm font-semibold text-white', className)} {...props}>
      {children}
    </h3>
  )
}
