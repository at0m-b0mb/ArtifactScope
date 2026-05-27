import React, { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, FolderKanban, FileSearch, Image, AlignLeft, Archive,
  Globe, Monitor, BookKey, Mail, FileText, Network, Clock3,
  HardDrive, Hash, FileOutput, Activity, Settings, ChevronDown, ChevronRight,
  Shield, Star, Pin, Eye, GitCompare
} from 'lucide-react'
import { cn } from '../../lib/cn'
import { getPins, togglePin, getSidebarCollapsed, setSidebarCollapsed } from '../../lib/storage'

interface NavItem {
  to: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  os?: string[]
}

interface NavSection {
  title: string
  items: NavItem[]
}

const Database2Icon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <ellipse cx="12" cy="5" rx="9" ry="3"/>
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
  </svg>
)

const sections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/cases',       icon: FolderKanban,    label: 'Cases' },
      { to: '/activity',    icon: Activity,         label: 'Activity Log' },
    ],
  },
  {
    title: 'Analyze',
    items: [
      { to: '/file-analyzer',   icon: FileSearch, label: 'File Analyzer' },
      { to: '/image-forensics', icon: Image,      label: 'Image Forensics' },
      { to: '/strings',         icon: AlignLeft,  label: 'Strings / IOC' },
      { to: '/archive',         icon: Archive,    label: 'Archive Analyzer' },
      { to: '/compare',         icon: GitCompare, label: 'Compare Files' },
    ],
  },
  {
    title: 'Artifacts',
    items: [
      { to: '/browser',   icon: Globe,    label: 'Browser Artifacts' },
      { to: '/system',    icon: Monitor,  label: 'System Info' },
      { to: '/registry',  icon: BookKey,  label: 'Registry', os: ['win32'] },
      { to: '/email',     icon: Mail,     label: 'Email Analyzer' },
    ],
  },
  {
    title: 'Investigate',
    items: [
      { to: '/log-analyzer', icon: FileText,   label: 'Log Analyzer' },
      { to: '/network',      icon: Network,    label: 'Network / PCAP' },
      { to: '/timeline',     icon: Clock3,     label: 'Timeline' },
      { to: '/sqlite',       icon: Database2Icon, label: 'SQLite Browser' },
      { to: '/disk-image',   icon: HardDrive,  label: 'Disk Image' },
    ],
  },
  {
    title: 'Manage',
    items: [
      { to: '/hash-db',   icon: Hash,       label: 'Hash Database' },
      { to: '/watchlist', icon: Eye,        label: 'Watchlist' },
      { to: '/reports',   icon: FileOutput, label: 'Reports' },
      { to: '/settings',  icon: Settings,   label: 'Settings' },
    ],
  },
]

const ALL_ITEMS: NavItem[] = sections.flatMap(s => s.items)

function NavRow({ item, collapsed, pinned, onTogglePin }: { item: NavItem; collapsed: boolean; pinned: boolean; onTogglePin: (route: string) => void }): React.JSX.Element {
  return (
    <div className="relative group/row">
      <NavLink
        to={item.to}
        title={collapsed ? item.label : undefined}
        className={({ isActive }) =>
          cn(
            'relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-all duration-150',
            'hover:bg-surface-3 hover:text-white',
            isActive
              ? 'bg-primary-600/20 text-primary-400 font-medium'
              : 'text-muted',
            collapsed && 'justify-center px-2'
          )
        }
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary-500 rounded-r" />
            )}
            <item.icon className={cn('flex-shrink-0', collapsed ? 'w-5 h-5' : 'w-4 h-4')} />
            {!collapsed && <span className="truncate flex-1">{item.label}</span>}
          </>
        )}
      </NavLink>
      {!collapsed && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTogglePin(item.to) }}
          title={pinned ? 'Unpin' : 'Pin to top'}
          className={cn(
            'absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded transition-opacity',
            pinned
              ? 'opacity-100 text-warning'
              : 'opacity-0 group-hover/row:opacity-100 text-muted hover:text-white'
          )}
        >
          <Star className={cn('w-3 h-3', pinned && 'fill-warning')} />
        </button>
      )}
    </div>
  )
}

export default function Sidebar(): React.JSX.Element {
  const [collapsed, setCollapsedState] = useState(getSidebarCollapsed)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [pins, setPins] = useState<string[]>(getPins)

  // Sync collapse to localStorage
  useEffect(() => { setSidebarCollapsed(collapsed) }, [collapsed])

  // Listen for pin changes from other components
  useEffect(() => {
    const sync = () => setPins(getPins())
    window.addEventListener('artifactscope:pins-changed', sync)
    return () => window.removeEventListener('artifactscope:pins-changed', sync)
  }, [])

  function handleTogglePin(route: string) {
    setPins(togglePin(route))
  }

  function toggleSection(title: string) {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(title)) next.delete(title)
      else next.add(title)
      return next
    })
  }

  const pinnedItems = pins
    .map(p => ALL_ITEMS.find(i => i.to === p))
    .filter((i): i is NavItem => Boolean(i))

  return (
    <aside
      className={cn(
        'flex flex-col bg-surface-1 border-r border-surface-4 flex-shrink-0 transition-all duration-200 select-none',
        collapsed ? 'w-14' : 'w-56'
      )}
    >
      {/* Collapse toggle */}
      <div className="flex items-center justify-end p-2 border-b border-surface-4">
        {!collapsed && (
          <span className="flex-1 flex items-center gap-2 px-2">
            <div className="w-5 h-5 rounded bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center">
              <Shield className="w-3 h-3 text-white" />
            </div>
            <span className="text-xs font-semibold gradient-text">ArtifactScope</span>
          </span>
        )}
        <button
          onClick={() => setCollapsedState(p => !p)}
          className="p-1.5 rounded text-muted hover:text-white hover:bg-surface-3 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronRight className={cn('w-4 h-4 transition-transform', !collapsed && 'rotate-180')} />
        </button>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 space-y-1 px-1.5">
        {/* Pinned section (always at top when there are pins) */}
        {pinnedItems.length > 0 && (
          <div>
            {!collapsed && (
              <div className="flex items-center gap-1.5 px-2 py-1 mt-1 mb-0.5">
                <Pin className="w-3 h-3 text-warning" />
                <span className="section-title !mb-0 !text-warning/80">Pinned</span>
              </div>
            )}
            <div className="space-y-0.5">
              {pinnedItems.map((item) => (
                <NavRow
                  key={`pin-${item.to}`}
                  item={item}
                  collapsed={collapsed}
                  pinned
                  onTogglePin={handleTogglePin}
                />
              ))}
            </div>
            {!collapsed && <div className="mx-2 my-2 border-t border-surface-4" />}
          </div>
        )}

        {sections.map((section) => {
          const isSectionCollapsed = collapsedSections.has(section.title)
          return (
            <div key={section.title}>
              {!collapsed && (
                <button
                  onClick={() => toggleSection(section.title)}
                  className="flex items-center justify-between w-full px-2 py-1 mt-2 mb-0.5"
                >
                  <span className="section-title !mb-0">{section.title}</span>
                  {isSectionCollapsed
                    ? <ChevronRight className="w-3 h-3 text-muted" />
                    : <ChevronDown  className="w-3 h-3 text-muted" />
                  }
                </button>
              )}
              {!isSectionCollapsed && (
                <div className="space-y-0.5">
                  {section.items.map((item) => (
                    <NavRow
                      key={item.to}
                      item={item}
                      collapsed={collapsed}
                      pinned={pins.includes(item.to)}
                      onTogglePin={handleTogglePin}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
