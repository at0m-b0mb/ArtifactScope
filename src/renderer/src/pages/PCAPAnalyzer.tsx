import React, { useState } from 'react'
import { Wifi, Search } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs'
import { Spinner } from '../components/ui/Progress'
import { Table, Column } from '../components/ui/Table'
import { DropZone } from '../components/ui/DropZone'
import { api } from '../lib/api'
import { formatBytes } from '../lib/format'

interface Connection {
  src_ip: string; src_port: number; dst_ip: string; dst_port: number
  protocol: string; packets: number; bytes: number
}

interface DNSQuery { name: string; type: string; count: number }
interface HTTPRequest { method: string; host: string; path: string; user_agent: string | null }
interface TLSEntry { sni: string; count: number }

interface TopTalker { ip: string; bytes: number; packets: number }

interface PCAPResult {
  total_packets: number; total_bytes: number; duration_s: number
  start_time: string; end_time: string
  link_type: number; is_big_endian: boolean
  protocol_breakdown: Record<string, number>
  connections: Connection[]
  dns_queries: DNSQuery[]
  http_requests: HTTPRequest[]
  tls_sni: TLSEntry[]
  top_talkers: TopTalker[]
}

const PROTO_COLORS: Record<string, 'danger' | 'warning' | 'primary' | 'accent' | 'success' | 'muted'> = {
  TCP: 'primary', UDP: 'accent', ICMP: 'warning', DNS: 'success', HTTP: 'warning', TLS: 'success', Other: 'muted',
}

export default function PCAPAnalyzer(): React.JSX.Element {
  const [result, setResult] = useState<PCAPResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [connSearch, setConnSearch] = useState('')
  const [dnsSearch, setDnsSearch] = useState('')

  async function handleFiles(paths: string[]) {
    const path = paths[0]
    if (!path) return
    setLoading(true)
    setResult(null)
    const r = await api.pcap.parse(path)
    setLoading(false)
    if (r.data) setResult(r.data as PCAPResult)
  }

  const filteredConns = (result?.connections ?? []).filter(c =>
    !connSearch || c.src_ip.includes(connSearch) || c.dst_ip.includes(connSearch) ||
    c.protocol.toLowerCase().includes(connSearch.toLowerCase())
  )
  const filteredDns = (result?.dns_queries ?? []).filter(d =>
    !dnsSearch || d.name.toLowerCase().includes(dnsSearch.toLowerCase())
  )

  const connCols: Column<Connection>[] = [
    { key: 'src_ip', header: 'Source', render: r => <span className="font-mono text-xs text-white">{r.src_ip}:{r.src_port}</span> },
    { key: 'dst_ip', header: 'Destination', render: r => <span className="font-mono text-xs text-accent-400">{r.dst_ip}:{r.dst_port}</span> },
    { key: 'protocol', header: 'Protocol', width: '80px', render: r => <Badge variant={PROTO_COLORS[r.protocol] ?? 'muted'}>{r.protocol}</Badge> },
    { key: 'packets', header: 'Packets', width: '80px', sortable: true },
    { key: 'bytes', header: 'Bytes', width: '100px', sortable: true, render: r => <span className="text-xs">{formatBytes(r.bytes)}</span> },
  ]

  const dnsCols: Column<DNSQuery>[] = [
    { key: 'name', header: 'Domain', render: r => <span className="font-mono text-xs text-white">{r.name}</span> },
    { key: 'type', header: 'Type', width: '80px', render: r => <Badge variant="muted">{r.type}</Badge> },
    { key: 'count', header: 'Queries', width: '80px', sortable: true },
  ]

  const httpCols: Column<HTTPRequest>[] = [
    { key: 'method', header: 'Method', width: '80px', render: r => <Badge variant={r.method === 'POST' ? 'warning' : 'primary'}>{r.method}</Badge> },
    { key: 'host', header: 'Host', width: '160px', render: r => <span className="font-mono text-xs text-white">{r.host}</span> },
    { key: 'path', header: 'Path', render: r => <span className="font-mono text-xs text-muted">{r.path}</span> },
    { key: 'user_agent', header: 'User-Agent', render: r => <span className="text-[10px] text-muted truncate max-w-[200px] block">{r.user_agent || '—'}</span> },
  ]

  const tlsCols: Column<TLSEntry>[] = [
    { key: 'sni', header: 'SNI (Hostname)', render: r => <span className="font-mono text-xs text-white">{r.sni}</span> },
    { key: 'count', header: 'Connections', width: '120px', sortable: true },
  ]

  const talkerCols: Column<TopTalker>[] = [
    { key: 'ip', header: 'IP Address', render: r => <span className="font-mono text-xs text-white">{r.ip}</span> },
    { key: 'packets', header: 'Packets', width: '100px', sortable: true },
    { key: 'bytes', header: 'Bytes', width: '100px', sortable: true, render: r => <span className="text-xs">{formatBytes(r.bytes)}</span> },
  ]

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wifi className="w-5 h-5 text-primary-400" />
          <h1 className="text-lg font-bold text-white">PCAP Analyzer</h1>
        </div>
        {result && (
          <Button size="sm" variant="ghost" onClick={() => setResult(null)}>Analyze Another</Button>
        )}
      </div>

      {!result && !loading && (
        <DropZone
          onFiles={handleFiles}
          label="Drop a PCAP file to analyze"
          hint=".pcap / .pcapng — parses packets, connections, DNS, HTTP, TLS SNI without a native library"
          className="min-h-48"
        />
      )}

      {loading && (
        <Card className="flex flex-col items-center justify-center py-16 gap-4">
          <Spinner className="w-8 h-8" />
          <p className="text-sm text-muted">Parsing PCAP…</p>
        </Card>
      )}

      {result && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total Packets', value: result.total_packets.toLocaleString(), color: 'text-white', bg: 'bg-primary-600/20' },
              { label: 'Total Data', value: formatBytes(result.total_bytes), color: 'text-accent-400', bg: 'bg-accent-500/20' },
              { label: 'Connections', value: result.connections.length.toLocaleString(), color: 'text-success', bg: 'bg-success/20' },
              { label: 'Duration', value: `${result.duration_s.toFixed(1)}s`, color: 'text-warning', bg: 'bg-warning/20' },
            ].map(s => (
              <Card key={s.label} className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                  <Wifi className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted">{s.label}</p>
                </div>
              </Card>
            ))}
          </div>

          {/* Protocol breakdown */}
          <Card>
            <CardHeader><CardTitle>Protocol Breakdown</CardTitle></CardHeader>
            <div className="flex flex-wrap gap-2">
              {Object.entries(result.protocol_breakdown).sort(([,a],[,b]) => b-a).map(([proto, count]) => (
                <div key={proto} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-3 border border-surface-4">
                  <Badge variant={PROTO_COLORS[proto] ?? 'muted'}>{proto}</Badge>
                  <span className="text-xs font-bold text-white">{count.toLocaleString()}</span>
                  <span className="text-[10px] text-muted">pkts</span>
                </div>
              ))}
            </div>
          </Card>

          <Tabs defaultValue="connections">
            <TabsList>
              <TabsTrigger value="connections">Connections ({result.connections.length})</TabsTrigger>
              <TabsTrigger value="dns">DNS ({result.dns_queries.length})</TabsTrigger>
              <TabsTrigger value="http">HTTP ({result.http_requests.length})</TabsTrigger>
              <TabsTrigger value="tls">TLS/SNI ({result.tls_sni.length})</TabsTrigger>
              <TabsTrigger value="talkers">Top Talkers</TabsTrigger>
            </TabsList>

            <TabsContent value="connections" className="mt-3 space-y-3">
              <Input
                icon={<Search className="w-3.5 h-3.5" />}
                placeholder="Filter by IP or protocol…"
                value={connSearch}
                onChange={e => setConnSearch(e.target.value)}
                className="max-w-sm"
              />
              <Table
                columns={connCols}
                data={filteredConns.slice(0, 2000) as unknown as Record<string, unknown>[]}
                rowKey="src_ip"
                compact
                emptyMessage="No connections found."
              />
            </TabsContent>

            <TabsContent value="dns" className="mt-3 space-y-3">
              <Input
                placeholder="Filter by domain…"
                value={dnsSearch}
                onChange={e => setDnsSearch(e.target.value)}
                className="max-w-sm"
              />
              <Table
                columns={dnsCols}
                data={filteredDns as unknown as Record<string, unknown>[]}
                rowKey="name"
                compact
                emptyMessage="No DNS queries found."
              />
            </TabsContent>

            <TabsContent value="http" className="mt-3">
              <Table
                columns={httpCols}
                data={(result.http_requests ?? []) as unknown as Record<string, unknown>[]}
                rowKey="path"
                compact
                emptyMessage="No HTTP requests found."
              />
            </TabsContent>

            <TabsContent value="tls" className="mt-3">
              <Table
                columns={tlsCols}
                data={(result.tls_sni ?? []) as unknown as Record<string, unknown>[]}
                rowKey="sni"
                compact
                emptyMessage="No TLS handshakes with SNI found."
              />
            </TabsContent>

            <TabsContent value="talkers" className="mt-3">
              <Table
                columns={talkerCols}
                data={(result.top_talkers ?? []) as unknown as Record<string, unknown>[]}
                rowKey="ip"
                compact
                emptyMessage="No top talkers data."
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
