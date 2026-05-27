import React from 'react'
import TitleBar from './TitleBar'
import Sidebar from './Sidebar'
import StatusBar from './StatusBar'
import AppRouter from '../../router'
import { AnimatePresence, motion } from 'framer-motion'
import { useLocation } from 'react-router-dom'

export default function Shell(): React.JSX.Element {
  const location = useLocation()

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
    </div>
  )
}
