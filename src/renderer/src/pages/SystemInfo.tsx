import React, { useState } from 'react'
import { Monitor, RefreshCw, Cpu, MemoryStick, HardDrive, Network, Activity } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs'
import { KeyValueGrid } from '../components/ui/KeyValueGrid'
import { Progress, Spinner } from '../components/ui/Progress'
import { Table, Column } from '../components/ui/Table'
import { EmptyState } from '../components/ui/EmptyState'
import { api } from '../lib/api'
import { formatBytes } from '../lib/format'

interface SystemData {
  os: { platform: string; type: string; release: string; arch: string; hostname: string; uptime_human: string; boot_time: string; username: string; home: string; temp_dir: string }
  cpu: { model: string; cores: number; speed_mhz: number; load_avg: number[] }
  memory: { total_bytes: number; free_bytes: number; used_bytes: number; used_percent: number }
  disks: { mount: string; total: number; free: number; used: number; percent: number; fs: string }[]
  networks: { name: string; addresses: string[]; mac: string; internal: boolean }[]
  processes: { pid: number; name: string; user: string; cpu: string; mem: string }[]
  env_vars: Record<string, string>
  users: string[]
  startup_items: string[]
  usb_history: string[]
}

export default function SystemInfo(): React.JSX.Element {
  const [data, setData] = useState<SystemData | null>(null)
  const [loading, setLoading] = useState(false)

  async function collect() {
    setLoading(true)
    const r = await api.system.info()
    setLoading(false)
    if (r.data) setData(r.data as SystemData)
  }

  const procCols: Column<{ pid: number; name: string; user: string; cpu: string; mem: string }>[] = [
    { key: 'pid',  header: 'PID',    width: '80px', sortable: true },
    { key: 'name', header: 'Process', sortable: true },
    { key: 'user', header: 'User',   sortable: true },
    { key: 'cpu',  header: 'CPU %',  width: '80px', sortable: true },
    { key: 'mem',  header: 'MEM %',  width: '80px', sortable: true },
  ]

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Monitor className="w-5 h-5 text-primary-400" />
          <h1 className="text-lg font-bold text-white">Live System Information</h1>
        </div>
        <Button variant="primary" icon={loading ? undefined : <RefreshCw className="w-4 h-4" />} loading={loading} onClick={collect}>
          {data ? 'Refresh' : 'Collect System Info'}
        </Button>
      </div>

      {!data && !loading && (
        <EmptyState
          icon={<Monitor className="w-7 h-7" />}
          title="Collect system information"
          description="Click the button above to perform a live snapshot of the current system."
        />
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Spinner className="w-8 h-8" />
          <p className="text-sm text-muted">Collecting system information…</p>
        </div>
      )}

      {data && (
        <>
          {/* Overview row */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-600/20 flex items-center justify-center"><Cpu className="w-5 h-5 text-primary-400" /></div>
              <div>
                <p className="text-xs text-muted">CPU Cores</p>
                <p className="text-lg font-bold text-white">{data.cpu.cores}</p>
              </div>
            </Card>
            <Card className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-500/20 flex items-center justify-center"><MemoryStick className="w-5 h-5 text-accent-400" /></div>
              <div>
                <p className="text-xs text-muted">Memory Used</p>
                <p className="text-lg font-bold text-white">{data.memory.used_percent}%</p>
              </div>
            </Card>
            <Card className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center"><Activity className="w-5 h-5 text-success" /></div>
              <div>
                <p className="text-xs text-muted">Processes</p>
                <p className="text-lg font-bold text-white">{data.processes.length}</p>
              </div>
            </Card>
            <Card className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center"><Network className="w-5 h-5 text-warning" /></div>
              <div>
                <p className="text-xs text-muted">Interfaces</p>
                <p className="text-lg font-bold text-white">{data.networks.length}</p>
              </div>
            </Card>
          </div>

          <Tabs defaultValue="os">
            <TabsList>
              <TabsTrigger value="os">OS</TabsTrigger>
              <TabsTrigger value="cpu-mem">CPU & Memory</TabsTrigger>
              <TabsTrigger value="disks">Disks</TabsTrigger>
              <TabsTrigger value="network">Network</TabsTrigger>
              <TabsTrigger value="processes">Processes</TabsTrigger>
              <TabsTrigger value="startup">Startup</TabsTrigger>
              <TabsTrigger value="usb">USB</TabsTrigger>
              <TabsTrigger value="env">Env Vars</TabsTrigger>
            </TabsList>

            <TabsContent value="os" className="mt-3">
              <Card>
                <KeyValueGrid items={[
                  { key: 'OS Type',    value: data.os.type },
                  { key: 'Release',    value: data.os.release },
                  { key: 'Platform',   value: data.os.platform },
                  { key: 'Arch',       value: data.os.arch },
                  { key: 'Hostname',   value: data.os.hostname },
                  { key: 'Username',   value: data.os.username },
                  { key: 'Home Dir',   value: data.os.home },
                  { key: 'Temp Dir',   value: data.os.temp_dir },
                  { key: 'Uptime',     value: data.os.uptime_human },
                  { key: 'Boot Time',  value: data.os.boot_time },
                ]} columns={2} />
              </Card>
            </TabsContent>

            <TabsContent value="cpu-mem" className="mt-3 space-y-4">
              <Card>
                <CardHeader><CardTitle>CPU</CardTitle></CardHeader>
                <KeyValueGrid items={[
                  { key: 'Model', value: data.cpu.model },
                  { key: 'Cores', value: data.cpu.cores },
                  { key: 'Speed', value: `${data.cpu.speed_mhz} MHz` },
                  { key: 'Load Average (1/5/15 min)', value: data.cpu.load_avg.map(l => l.toFixed(2)).join(' / ') },
                ]} columns={2} />
              </Card>
              <Card>
                <CardHeader><CardTitle>Memory</CardTitle></CardHeader>
                <Progress value={data.memory.used_percent} label={`${formatBytes(data.memory.used_bytes)} / ${formatBytes(data.memory.total_bytes)}`} color={data.memory.used_percent > 85 ? 'danger' : data.memory.used_percent > 70 ? 'warning' : 'success'} />
                <div className="mt-3">
                  <KeyValueGrid items={[
                    { key: 'Total',    value: formatBytes(data.memory.total_bytes) },
                    { key: 'Used',     value: formatBytes(data.memory.used_bytes) },
                    { key: 'Free',     value: formatBytes(data.memory.free_bytes) },
                    { key: 'Used %',   value: `${data.memory.used_percent}%` },
                  ]} columns={2} />
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="disks" className="mt-3 space-y-3">
              {data.disks.map(d => (
                <Card key={d.mount}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-muted" />
                      <span className="font-medium text-sm text-white">{d.mount}</span>
                      <Badge variant="muted">{d.fs}</Badge>
                    </div>
                    <span className="text-xs text-muted">{formatBytes(d.used)} / {formatBytes(d.total)}</span>
                  </div>
                  <Progress value={d.percent} color={d.percent > 90 ? 'danger' : d.percent > 75 ? 'warning' : 'success'} label={`${d.percent}% used`} />
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="network" className="mt-3 space-y-3">
              {data.networks.map(n => (
                <Card key={n.name}>
                  <div className="flex items-center gap-2 mb-2">
                    <Network className="w-4 h-4 text-accent-400" />
                    <span className="font-medium text-white">{n.name}</span>
                    {n.internal && <Badge variant="muted">loopback</Badge>}
                  </div>
                  <KeyValueGrid items={[
                    { key: 'Addresses', value: n.addresses.join(', ') },
                    { key: 'MAC', value: n.mac || '—' },
                  ]} columns={2} mono />
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="processes" className="mt-3">
              <Table
                columns={procCols}
                data={data.processes as unknown as Record<string, unknown>[]}
                rowKey="pid"
                compact
              />
            </TabsContent>

            <TabsContent value="startup" className="mt-3">
              <Card>
                {data.startup_items.length === 0 ? (
                  <p className="text-sm text-muted py-4 text-center">No startup items found or not available on this OS.</p>
                ) : data.startup_items.map((s, i) => (
                  <div key={i} className="py-1.5 border-b border-surface-4 last:border-0 font-mono text-xs text-green-300">{s}</div>
                ))}
              </Card>
            </TabsContent>

            <TabsContent value="usb" className="mt-3">
              <Card>
                {data.usb_history.length === 0 ? (
                  <p className="text-sm text-muted py-4 text-center">No USB history found or not available on this OS.</p>
                ) : data.usb_history.map((s, i) => (
                  <div key={i} className="py-1.5 border-b border-surface-4 last:border-0 text-xs text-white">{s}</div>
                ))}
              </Card>
            </TabsContent>

            <TabsContent value="env" className="mt-3">
              <Card>
                <div className="max-h-80 overflow-auto">
                  {Object.entries(data.env_vars).sort().map(([k, v]) => (
                    <div key={k} className="flex gap-2 py-1 border-b border-surface-4 last:border-0 text-xs">
                      <span className="font-mono text-primary-400 flex-shrink-0 w-40 truncate">{k}</span>
                      <span className="font-mono text-green-300 break-all">{v}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
