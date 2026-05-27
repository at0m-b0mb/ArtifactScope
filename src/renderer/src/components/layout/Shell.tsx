import React, { useEffect } from 'react'
import TitleBar from './TitleBar'
import Sidebar from './Sidebar'
import StatusBar from './StatusBar'
import AppRouter from '../../router'
import { AnimatePresence, motion } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import { useUIStore } from '../../stores/uiStore'
import { attachShortcuts } from '../../lib/shortcuts'
import { CommandPalette } from '../CommandPalette'
import { ShortcutsHelp } from '../ShortcutsHelp'
import { WelcomeModal } from '../WelcomeModal'
import { GlobalFileDrop } from '../GlobalFileDrop'
import { applyAccent, getAccent, getDensity, pushRecentPage } from '../../lib/storage'

export default function Shell(): React.JSX.Element {
  const location = useLocation()
  const navigate = useNavigate()
  const { togglePalette, setPaletteOpen, toggleHelp, paletteOpen, helpOpen } = useUIStore()

  // Apply persisted accent + density on mount
  useEffect(() => {
    applyAccent(getAccent())
    document.documentElement.dataset.density = getDensity()
  }, [])

  // Track visited pages for "recent pages"
  useEffect(() => {
    pushRecentPage(location.pathname)
  }, [location.pathname])

  // Wire global shortcuts
  useEffect(() => {
    return attachShortcuts([
      { id: 'palette', keys: 'mod+k', label: 'Command palette',  category: 'general', global: true, run: () => togglePalette() },
      { id: 'help',    keys: '?',     label: 'Show shortcuts',    category: 'general', run: () => toggleHelp() },
      { id: 'esc',     keys: 'escape',label: 'Close overlay',     category: 'general', global: true,
        run: () => { if (paletteOpen) setPaletteOpen(false); else if (helpOpen) useUIStore.getState().setHelpOpen(false) } },
      { id: 'g-d', keys: 'g d', label: 'Dashboard',  category: 'navigate', run: () => navigate('/dashboard') },
      { id: 'g-c', keys: 'g c', label: 'Cases',       category: 'navigate', run: () => navigate('/cases') },
      { id: 'g-a', keys: 'g a', label: 'Activity',    category: 'navigate', run: () => navigate('/activity') },
      { id: 'g-f', keys: 'g f', label: 'File',        category: 'navigate', run: () => navigate('/file-analyzer') },
      { id: 'g-h', keys: 'g h', label: 'Hash DB',     category: 'navigate', run: () => navigate('/hash-db') },
      { id: 'g-t', keys: 'g t', label: 'Timeline',    category: 'navigate', run: () => navigate('/timeline') },
      { id: 'g-s', keys: 'g s', label: 'Settings',    category: 'navigate', run: () => navigate('/settings') },
      { id: 'g-w', keys: 'g w', label: 'Watchlist',   category: 'navigate', run: () => navigate('/watchlist') },
      { id: 'g-x', keys: 'g x', label: 'Compare',     category: 'navigate', run: () => navigate('/compare') },
      {
        id: 'focus-search', keys: '/', label: 'Focus search', category: 'general',
        run: () => {
          // Find any visible text input that looks like a search and focus it.
          const candidates = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="search"], input[placeholder*="earch" i], input[placeholder*="ilter" i]'))
          const visible = candidates.find(el => el.offsetParent !== null)
          if (visible) { visible.focus(); visible.select() }
        },
      },
    ])
  }, [navigate, togglePalette, toggleHelp, paletteOpen, helpOpen, setPaletteOpen])

  return (
    <div className="flex flex-col h-screen bg-surface-0">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="absolute inset-0 overflow-auto"
            >
              <AppRouter />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <StatusBar />
      <CommandPalette />
      <ShortcutsHelp />
      <WelcomeModal />
      <GlobalFileDrop />
    </div>
  )
}
