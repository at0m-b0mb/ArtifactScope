import React from 'react'
import { cn } from '../../lib/cn'

type Variant = 'default' | 'primary' | 'ghost' | 'danger' | 'success' | 'outline'
type Size    = 'xs' | 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: React.ReactNode
}

const variants: Record<Variant, string> = {
  default:  'bg-surface-3 hover:bg-surface-4 text-white border border-surface-4',
  primary:  'bg-primary-600 hover:bg-primary-700 text-white border border-primary-700',
  ghost:    'hover:bg-surface-3 text-muted hover:text-white border border-transparent',
  danger:   'bg-danger/20 hover:bg-danger/30 text-danger border border-danger/30',
  success:  'bg-success/20 hover:bg-success/30 text-success border border-success/30',
  outline:  'border border-surface-4 hover:border-primary-600 text-muted hover:text-white bg-transparent',
}

const sizes: Record<Size, string> = {
  xs: 'h-6 px-2 text-xs gap-1',
  sm: 'h-7 px-2.5 text-xs gap-1.5',
  md: 'h-8 px-3 text-sm gap-2',
  lg: 'h-10 px-4 text-sm gap-2',
}

export function Button({ variant = 'default', size = 'md', loading, icon, children, className, disabled, ...props }: ButtonProps): React.JSX.Element {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150 select-none',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {loading
        ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        : icon
      }
      {children}
    </button>
  )
}
