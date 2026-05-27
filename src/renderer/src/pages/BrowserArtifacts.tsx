import React, { useState } from 'react'
import { Globe, RefreshCw, Clock } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs'
import { Spinner } from '../components/ui/Progress'
import { EmptyState } from '../components/ui/EmptyState'
import { Table, Column } from '../components/ui/Table'
import { api } from '../lib/api'
import { formatDate } from '../lib/format'

interface HistoryRow { url: string; title: string; visit_time: string; visit_count: number; browser: string; profile: string }
interface DownloadRow { url: string; target_path: string; start_time: string; end_time: string; received_bytes: number; total_bytes: number; state: number; browser: string }
interface CookieRow { host: string; name: string; value: string; path: string; expires: string; secure: boolean; httponly: boolean; browser: string }
interface BookmarkRow { name: string; url: string; folder: string; added: string; browser: string }
interface SearchRow { term: string; url: string; visit_time: string; browser: string }

interface BrowserResult {
  history: HistoryRow[]
  downloads: DownloadRow[]
  cookies: CookieRow[]
  bookmarks: BookmarkRow[]
  searches: SearchRow[]
  browsers_found: string[]
}

const BROWSER_COLORS: Record<string, string> = {
  Chrome: 'text-yellow-400', Edge: 'text-blue-400', Firefox: 'text-orange-400',
  Safari: 'text-sky-400', Brave: 'text-orange-500', Opera: 'text-red-400',
}

function BrowserBadge({ name }: { name: string }) {
  return <span className={`text-[10px] font-medium ${BROWSER_COLORS[name] ?? 'text-muted'}`}>{name}</span>
}

export default function BrowserArtifacts(): React.JSX.Element {
  const [data, setData] = useState<BrowserResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [histSearch, setHistSearch] = useState('')
  const [dlSearch, setDlSearch] = useState('')
  const [cookieSearch, setCookieSearch] = useState('')

  async function collect() {
    setLoading(true)
    setData(null)
    const r = await api.browser.collect()
    setLoading(false)
    if (r.data) setData(r.data as BrowserResult)
  }

  const histCols: Column<HistoryRow>[] = [
    { key: 'visit_time', header: 'Time', width: '140px', sortable: true, render: r => <span className="text-xs font-mono">{formatDate(r.visit_time)}</span> },
    { key: 'browser', header: 'Browser', width: '80px', render: r => <BrowserBadge name={r.browser} /> },
    { key: 'title', header: 'Title', render: r => <span className="text-white text-xs truncate max-w-[200px] block">{r.title || '(no title)'}</span> },
    { key: 'url', header: 'URL', render: r => <span className="font-mono text-[10px] text-accent-400 truncate max-w-[240px] block">{r.url}</span> },
    { key: 'visit_count', header: 'Visits', width: '60px', sortable: true },
  ]

  const dlCols: Column<DownloadRow>[] = [
    { key: 'start_time', header: 'Date', width: '140px', sortable: true, render: r => <span className="text-xs font-mono">{formatDate(r.start_time)}</span> },
    { key: 'browser', header: 'Browser', width: '80px', render: r => <BrowserBadge name={r.browser} /> },
    { key: 'target_path', header: 'File', render: r => <span className="text-xs font-mono text-white truncate max-w-[180px] block">{r.target_path.split('/').pop() || r.target_path}</span> },
    { key: 'url', header: 'Source URL', render: r => <span className="text-[10px] font-mono text-accent-400 truncate max-w-[200px] block">{r.url}</span> },
    { key: 'received_bytes', header: 'Size', width: '80px', sortable: true, render: r => <span className="text-xs">{r.received_bytes > 0 ? `${(r.received_bytes/1024/1024).toFixed(1)} MB` : '—'}</span> },
    { key: 'state', header: 'State', width: '80px', render: r => <Badge variant={r.state === 1 ? 'success' : r.state === 2 ? 'danger' : 'muted'}>{r.state === 1 ? 'Complete' : r.state === 2 ? 'Failed' : 'Other'}</Badge> },
  ]

  const cookieCols: Column<CookieRow>[] = [
    { key: 'browser', header: 'Browser', width: '80px', render: r => <BrowserBadge name={r.browser} /> },
    { key: 'host', header: 'Host', width: '160px', sortable: true, render: r => <span className="text-xs font-mono text-white">{r.host}</span> },
    { key: 'name', header: 'Name', width: '140px', sortable: true, render: r => <span className="text-xs font-mono text-primary-300">{r.name}</span> },
    { key: 'value', header: 'Value', render: r => <span className="text-[10px] font-mono text-green-300 truncate max-w-[160px] block">{r.value.slice(0,60)}{r.value.length>60?'…':''}</span> },
    { key: 'expires', header: 'Expires', width: '140px', render: r => <span className="text-xs font-mono">{r.expires ? formatDate(r.expires) : 'Session'}</span> },
    { key: 'secure', header: 'Sec', width: '40px', render: r => r.secure ? <Badge variant="success">S</Badge> : <span className="text-muted text-xs">—</span> },
  ]

  const bmCols: Column<BookmarkRow>[] = [
    { key: 'browser', header: 'Browser', width: '80px', render: r => <BrowserBadge name={r.browser} /> },
    { key: 'folder', header: 'Folder', width: '120px', sortable: true, render: r => <span className="text-xs text-muted">{r.folder}</span> },
    { key: 'name', header: 'Name', sortable: true, render: r => <span className="text-xs text-white">{r.name}</span> },
    { key: 'url', header: 'URL', render: r => <span className="text-[10px] font-mono text-accent-400 truncate max-w-[220px] block">{r.url}</span> },
    { key: 'added', header: 'Added', width: '140px', sortable: true, render: r => <span className="text-xs">{formatDate(r.added)}</span> },
  ]

  const searchCols: Column<SearchRow>[] = [
    { key: 'visit_time', header: 'Time', width: '140px', sortable: true, render: r => <span className="text-xs font-mono">{formatDate(r.visit_time)}</span> },
    { key: 'browser', header: 'Browser', width: '80px', render: r => <BrowserBadge name={r.browser} /> },
    { key: 'term', header: 'Search Term', render: r => <span className="text-white text-sm">{r.term}</span> },
    { key: 'url', header: 'URL', render: r => <span className="text-[10px] font-mono text-accent-400 truncate max-w-[200px] block">{r.url}</span> },
  ]

  const filteredHistory = (data?.history ?? []).filter(r =>
    !histSearch || r.url.toLowerCase().includes(histSearch.toLowerCase()) || (r.title || '').toLowerCase().includes(histSearch.toLowerCase())
  )
  const filteredDl = (data?.downloads ?? []).filter(r =>
    !dlSearch || r.url.toLowerCase().includes(dlSearch.toLowerCase()) || r.target_path.toLowerCase().includes(dlSearch.toLowerCase())
  )
  const filteredCookies = (data?.cookies ?? []).filter(r =>
    !cookieSearch || r.host.toLowerCase().includes(cookieSearch.toLowerCase()) || r.name.toLowerCase().includes(cookieSearch.toLowerCase())
  )

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary-400" />
          <h1 className="text-lg font-bold text-white">Browser Artifacts</h1>
        </div>
        <Button variant="primary" icon={loading ? undefined : <RefreshCw className="w-4 h-4" />} loading={loading} onClick={collect}>
          {data ? 'Refresh' : 'Collect Browser Data'}
        </Button>
      </div>

      {!data && !loading && (
        <EmptyState
          icon={<Globe className="w-7 h-7" />}
          title="Collect browser artifacts"
          description="Auto-detects Chrome, Edge, Firefox, Safari, Brave, and Opera on the current system."
        />
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Spinner className="w-8 h-8" />
          <p className="text-sm text-muted">Scanning browser profiles…</p>
        </div>
      )}

      {data && (
        <>
          {/* Browsers found */}
          <Card>
            <CardHeader><CardTitle>Browsers Detected</CardTitle></CardHeader>
            <div className="flex flex-wrap gap-2 mt-1">
              {data.browsers_found.length === 0 ? (
                <p className="text-sm text-muted">No browsers found on this system.</p>
              ) : data.browsers_found.map(b => (
                <div key={b} className="px-3 py-1.5 rounded-lg bg-surface-3 border border-surface-4">
                  <BrowserBadge name={b} />
                </div>
              ))}
            </div>
          </Card>

          {/* Overview stats */}
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: 'History', count: data.history.length },
              { label: 'Downloads', count: data.downloads.length },
              { label: 'Cookies', count: data.cookies.length },
              { label: 'Bookmarks', count: data.bookmarks.length },
              { label: 'Searches', count: data.searches.length },
            ].map(s => (
              <Card key={s.label} className="text-center py-3">
                <p className="text-xl font-bold text-white">{s.count.toLocaleString()}</p>
                <p className="text-xs text-muted">{s.label}</p>
              </Card>
            ))}
          </div>

          <Tabs defaultValue="history">
            <TabsList>
              <TabsTrigger value="history">History ({data.history.length.toLocaleString()})</TabsTrigger>
              <TabsTrigger value="downloads">Downloads ({data.downloads.length.toLocaleString()})</TabsTrigger>
              <TabsTrigger value="cookies">Cookies ({data.cookies.length.toLocaleString()})</TabsTrigger>
              <TabsTrigger value="bookmarks">Bookmarks ({data.bookmarks.length.toLocaleString()})</TabsTrigger>
              <TabsTrigger value="searches">Searches ({data.searches.length.toLocaleString()})</TabsTrigger>
            </TabsList>

            <TabsContent value="history" className="mt-3 space-y-3">
              <Input
                icon={<Clock className="w-3.5 h-3.5" />}
                placeholder="Filter by URL or title…"
                value={histSearch}
                onChange={e => setHistSearch(e.target.value)}
                className="max-w-sm"
              />
              <Table
                columns={histCols}
                data={filteredHistory.slice(0, 3000) as unknown as Record<string, unknown>[]}
                rowKey="url"
                compact
                emptyMessage="No history found."
              />
            </TabsContent>

            <TabsContent value="downloads" className="mt-3 space-y-3">
              <Input
                placeholder="Filter by URL or file name…"
                value={dlSearch}
                onChange={e => setDlSearch(e.target.value)}
                className="max-w-sm"
              />
              <Table
                columns={dlCols}
                data={filteredDl.slice(0, 1000) as unknown as Record<string, unknown>[]}
                rowKey="target_path"
                compact
                emptyMessage="No downloads found."
              />
            </TabsContent>

            <TabsContent value="cookies" className="mt-3 space-y-3">
              <Input
                placeholder="Filter by host or cookie name…"
                value={cookieSearch}
                onChange={e => setCookieSearch(e.target.value)}
                className="max-w-sm"
              />
              <Table
                columns={cookieCols}
                data={filteredCookies.slice(0, 2000) as unknown as Record<string, unknown>[]}
                rowKey="name"
                compact
                emptyMessage="No cookies found."
              />
            </TabsContent>

            <TabsContent value="bookmarks" className="mt-3">
              <Table
                columns={bmCols}
                data={(data.bookmarks ?? []).slice(0, 1000) as unknown as Record<string, unknown>[]}
                rowKey="url"
                compact
                emptyMessage="No bookmarks found."
              />
            </TabsContent>

            <TabsContent value="searches" className="mt-3">
              <Table
                columns={searchCols}
                data={(data.searches ?? []).slice(0, 1000) as unknown as Record<string, unknown>[]}
                rowKey="url"
                compact
                emptyMessage="No search history found."
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
