import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

const Dashboard       = lazy(() => import('./pages/Dashboard'))
const Cases           = lazy(() => import('./pages/Cases'))
const CaseDetail      = lazy(() => import('./pages/CaseDetail'))
const FileAnalyzer    = lazy(() => import('./pages/FileAnalyzer'))
const SystemInfo      = lazy(() => import('./pages/SystemInfo'))
const BrowserArtifacts= lazy(() => import('./pages/BrowserArtifacts'))
const LogAnalyzer     = lazy(() => import('./pages/LogAnalyzer'))
const Timeline        = lazy(() => import('./pages/Timeline'))
const HashDB          = lazy(() => import('./pages/HashDB'))
const NetworkPCAP     = lazy(() => import('./pages/PCAPAnalyzer'))
const Registry        = lazy(() => import('./pages/RegistryAnalyzer'))
const Email           = lazy(() => import('./pages/EmailAnalyzer'))
const Archive         = lazy(() => import('./pages/ArchiveAnalyzer'))
const ImageForensics  = lazy(() => import('./pages/ImageForensics'))
const SQLiteBrowser   = lazy(() => import('./pages/SQLiteBrowser'))
const Strings         = lazy(() => import('./pages/IOCHunter'))
const DiskImage       = lazy(() => import('./pages/DiskImageAnalyzer'))
const Reports         = lazy(() => import('./pages/Reports'))
const ActivityLog     = lazy(() => import('./pages/ActivityLog'))
const Settings        = lazy(() => import('./pages/Settings'))
const Watchlist       = lazy(() => import('./pages/Watchlist'))
const FileCompare     = lazy(() => import('./pages/FileCompare'))

function PageLoader(): React.JSX.Element {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function AppRouter(): React.JSX.Element {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/"                  element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard"         element={<Dashboard />} />
        <Route path="/cases"             element={<Cases />} />
        <Route path="/cases/:id"         element={<CaseDetail />} />
        <Route path="/file-analyzer"     element={<FileAnalyzer />} />
        <Route path="/image-forensics"   element={<ImageForensics />} />
        <Route path="/strings"           element={<Strings />} />
        <Route path="/archive"           element={<Archive />} />
        <Route path="/browser"           element={<BrowserArtifacts />} />
        <Route path="/system"            element={<SystemInfo />} />
        <Route path="/registry"          element={<Registry />} />
        <Route path="/email"             element={<Email />} />
        <Route path="/log-analyzer"      element={<LogAnalyzer />} />
        <Route path="/network"           element={<NetworkPCAP />} />
        <Route path="/timeline"          element={<Timeline />} />
        <Route path="/sqlite"            element={<SQLiteBrowser />} />
        <Route path="/disk-image"        element={<DiskImage />} />
        <Route path="/hash-db"           element={<HashDB />} />
        <Route path="/watchlist"         element={<Watchlist />} />
        <Route path="/compare"           element={<FileCompare />} />
        <Route path="/reports"           element={<Reports />} />
        <Route path="/activity"          element={<ActivityLog />} />
        <Route path="/settings"          element={<Settings />} />
        <Route path="*"                  element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}
