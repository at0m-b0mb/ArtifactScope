import React, { createContext, useContext, useState } from 'react'
import { cn } from '../../lib/cn'

interface TabsCtx { active: string; setActive: (v: string) => void }
const Ctx = createContext<TabsCtx>({ active: '', setActive: () => {} })

interface TabsProps { defaultValue: string; children: React.ReactNode; className?: string }
export function Tabs({ defaultValue, children, className }: TabsProps): React.JSX.Element {
  const [active, setActive] = useState(defaultValue)
  return <Ctx.Provider value={{ active, setActive }}><div className={cn('flex flex-col', className)}>{children}</div></Ctx.Provider>
}

export function TabsList({ children, className }: { children: React.ReactNode; className?: string }): React.JSX.Element {
  return (
    <div className={cn('flex gap-0.5 bg-surface-3 p-1 rounded-lg w-fit', className)}>
      {children}
    </div>
  )
}

interface TabsTriggerProps { value: string; children: React.ReactNode; disabled?: boolean }
export function TabsTrigger({ value, children, disabled }: TabsTriggerProps): React.JSX.Element {
  const { active, setActive } = useContext(Ctx)
  const isActive = active === value
  return (
    <button
      disabled={disabled}
      onClick={() => setActive(value)}
      className={cn(
        'px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 select-none',
        isActive ? 'bg-surface-0 text-white shadow-sm' : 'text-muted hover:text-white',
        disabled && 'opacity-40 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  )
}

interface TabsContentProps { value: string; children: React.ReactNode; className?: string }
export function TabsContent({ value, children, className }: TabsContentProps): React.JSX.Element | null {
  const { active } = useContext(Ctx)
  if (active !== value) return null
  return <div className={cn('animate-fade-in', className)}>{children}</div>
}
