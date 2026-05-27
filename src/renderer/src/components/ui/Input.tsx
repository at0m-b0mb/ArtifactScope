import React from 'react'
import { cn } from '../../lib/cn'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode
  label?: string
}

export function Input({ icon, label, className, id, ...props }: InputProps): React.JSX.Element {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={inputId} className="text-xs font-medium text-muted">{label}</label>}
      <div className="relative">
        {icon && (
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          className={cn(
            'h-8 w-full rounded-lg border border-surface-4 bg-surface-3 px-3 text-sm text-white placeholder:text-muted',
            'focus:outline-none focus:border-primary-600 transition-colors',
            icon && 'pl-8',
            className
          )}
          {...props}
        />
      </div>
    </div>
  )
}

export function Textarea({ label, className, id, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }): React.JSX.Element {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={inputId} className="text-xs font-medium text-muted">{label}</label>}
      <textarea
        id={inputId}
        className={cn(
          'w-full rounded-lg border border-surface-4 bg-surface-3 px-3 py-2 text-sm text-white placeholder:text-muted resize-none',
          'focus:outline-none focus:border-primary-600 transition-colors',
          className
        )}
        {...props}
      />
    </div>
  )
}

export function Select({ label, className, id, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }): React.JSX.Element {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={inputId} className="text-xs font-medium text-muted">{label}</label>}
      <select
        id={inputId}
        className={cn(
          'h-8 w-full rounded-lg border border-surface-4 bg-surface-3 px-3 text-sm text-white',
          'focus:outline-none focus:border-primary-600 transition-colors appearance-none',
          className
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  )
}
