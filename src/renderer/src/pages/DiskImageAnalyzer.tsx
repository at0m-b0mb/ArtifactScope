import React, { useState } from 'react'
import { HardDrive, AlertTriangle } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs'
import { KeyValueGrid } from '../components/ui/KeyValueGrid'
import { DropZone } from '../components/ui/DropZone'
import { Spinner } from '../components/ui/Progress'
import { Table, Column } from '../components/ui/Table'
import { api } from '../lib/api'
import { formatBytes } from '../lib/format'

interface Partition {
  index: number; type_code: string; type_name: string
  start_lba: number; end_lba: number; size_bytes: number
  bootable: boolean; guid: string | null
}

interface CarvingResult {
  offset: number; signature: string; type: string; size_estimate: number
}

interface DiskResult {
  path: string; size_bytes: number; sector_size: number; total_sectors: number
  partition_table: 'MBR' | 'GPT' | 'Unknown'
  disk_signature: string | null; gpt_guid: string | null
  partitions: Partition[]
  carved_files: CarvingResult[]
}

export default function DiskImageAnalyzer(): React.JSX.Element {
  const [result, setResult] = useState<DiskResult | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleFiles(paths: string[]) {
    const path = paths[0]
    if (!path) return
    setLoading(true)
    setResult(null)
    const r = await api.disk.analyze(path)
    setLoading(false)
    if (r.data) setResult(r.data as DiskResult)
  }

  const partCols: Column<Partition>[] = [
    { key: 'index', header: '#', width: '40px' },
    { key: 'type_name', header: 'Type', render: r => (
      <div className="flex items-center gap-2">
        <Badge variant="muted">{r.type_code}</Badge>
        <span className="text-xs text-white">{r.type_name}</span>
      </div>
    )},
    { key: 'start_lba', header: 'Start LBA', width: '120px', render: r => <span className="font-mono text-xs">{r.start_lba.toLocaleString()}</span> },
    { key: 'end_lba', header: 'End LBA', width: '120px', render: r => <span className="font-mono text-xs">{r.end_lba.toLocaleString()}</span> },
    { key: 'size_bytes', header: 'Size', width: '100px', sortable: true, render: r => <span className="text-xs">{formatBytes(r.size_bytes)}</span> },
    { key: 'bootable', header: 'Boot', width: '60px', render: r => r.bootable ? <Badge variant="warning" dot>Boot</Badge> : <span className="text-muted text-xs">—</span> },
    { key: 'guid', header: 'GUID', render: r => r.guid ? <span className="font-mono text-[10px] text-muted">{r.guid}</span> : <span className="text-muted text-xs">—</span> },
  ]

  const carvedCols: Column<CarvingResult>[] = [
    { key: 'offset', header: 'Offset', width: '120px', render: r => <span className="font-mono text-xs text-accent-400">0x{r.offset.toString(16).toUpperCase().padStart(8,'0')}</span> },
    { key: 'signature', header: 'Signature', width: '120px', render: r => <Badge variant="muted">{r.signature}</Badge> },
    { key: 'type', header: 'File Type', render: r => <span className="text-xs text-white">{r.type}</span> },
    { key: 'size_estimate', header: 'Est. Size', width: '100px', render: r => <span className="text-xs">{r.size_estimate > 0 ? formatBytes(r.size_estimate) : '—'}</span> },
  ]

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-primary-400" />
          <h1 className="text-lg font-bold text-white">Disk Image Analyzer</h1>
        </div>
        {result && (
          <Button size="sm" variant="ghost" onClick={() => setResult(null)}>Analyze Another</Button>
        )}
      </div>

      {!result && !loading && (
        <DropZone
          onFiles={handleFiles}
          label="Drop a disk image"
          hint=".dd, .img, .raw — parses MBR/GPT partition table, carves files by signature"
          className="min-h-48"
        />
      )}

      {loading && (
        <Card className="flex flex-col items-center justify-center py-16 gap-4">
          <Spinner className="w-8 h-8" />
          <p className="text-sm text-muted">Analyzing disk image…</p>
        </Card>
      )}

      {result && (
        <>
          {/* Overview */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-600/20 flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-muted">Image Size</p>
                <p className="text-lg font-bold text-white">{formatBytes(result.size_bytes)}</p>
              </div>
            </Card>
            <Card className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${result.partition_table === 'GPT' ? 'bg-accent-500/20' : 'bg-warning/20'} flex items-center justify-center`}>
                <HardDrive className={`w-5 h-5 ${result.partition_table === 'GPT' ? 'text-accent-400' : 'text-warning'}`} />
              </div>
              <div>
                <p className="text-xs text-muted">Partition Table</p>
                <p className="text-lg font-bold text-white">{result.partition_table}</p>
              </div>
            </Card>
            <Card className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted">Partitions</p>
                <p className="text-lg font-bold text-white">{result.partitions.length}</p>
              </div>
            </Card>
            <Card className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted">Carved Files</p>
                <p className="text-lg font-bold text-white">{result.carved_files.length}</p>
              </div>
            </Card>
          </div>

          <Tabs defaultValue="partitions">
            <TabsList>
              <TabsTrigger value="partitions">Partitions ({result.partitions.length})</TabsTrigger>
              <TabsTrigger value="carved">File Carving ({result.carved_files.length})</TabsTrigger>
              <TabsTrigger value="info">Disk Info</TabsTrigger>
            </TabsList>

            <TabsContent value="partitions" className="mt-3">
              {result.partitions.length === 0 ? (
                <Card>
                  <p className="text-sm text-muted text-center py-8">No partitions found. The image may be a raw partition, not a full disk.</p>
                </Card>
              ) : (
                <Table
                  columns={partCols}
                  data={result.partitions as unknown as Record<string, unknown>[]}
                  rowKey="index"
                  compact
                />
              )}
            </TabsContent>

            <TabsContent value="carved" className="mt-3">
              {result.carved_files.length === 0 ? (
                <Card>
                  <p className="text-sm text-muted text-center py-8">No file signatures found (searches first 50 MB for known headers).</p>
                </Card>
              ) : (
                <>
                  <div className="flex items-center gap-2 p-3 mb-3 rounded-lg bg-warning/10 border border-warning/30 text-warning text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>File carving is based on signature detection only. These are potential file locations — actual recovery requires extraction.</span>
                  </div>
                  <Table
                    columns={carvedCols}
                    data={result.carved_files as unknown as Record<string, unknown>[]}
                    rowKey="offset"
                    compact
                  />
                </>
              )}
            </TabsContent>

            <TabsContent value="info" className="mt-3">
              <Card>
                <KeyValueGrid items={[
                  { key: 'Image Path', value: result.path },
                  { key: 'Image Size', value: `${formatBytes(result.size_bytes)} (${result.size_bytes.toLocaleString()} bytes)` },
                  { key: 'Sector Size', value: `${result.sector_size} bytes` },
                  { key: 'Total Sectors', value: result.total_sectors.toLocaleString() },
                  { key: 'Partition Table', value: result.partition_table },
                  { key: 'Disk Signature', value: result.disk_signature || '—' },
                  { key: 'GPT Disk GUID', value: result.gpt_guid || '—' },
                ]} columns={2} mono />
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
