import React, { useState } from 'react'
import { Image, MapPin, AlertTriangle } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs'
import { DropZone } from '../components/ui/DropZone'
import { KeyValueGrid } from '../components/ui/KeyValueGrid'
import { Progress, Spinner } from '../components/ui/Progress'
import { api } from '../lib/api'
import { formatBytes } from '../lib/format'

interface ImageResult {
  path: string
  name: string
  size: number
  mime: string
  width: number
  height: number
  exif: Record<string, string>
  gps: { lat: number; lon: number; altitude: number | null; map_url: string } | null
  ela: { score: number; description: string } | null
  lsb: { uniform_ratio: number; suspicious: boolean; description: string } | null
  thumbnail_mismatch: { detected: boolean; description: string } | null
  has_thumbnail: boolean
  thumbnail_path: string | null
}

export default function ImageForensics(): React.JSX.Element {
  const [result, setResult] = useState<ImageResult | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleFiles(paths: string[]) {
    const path = paths[0]
    if (!path) return
    setLoading(true)
    setResult(null)
    const r = await api.image.analyze(path)
    setLoading(false)
    if (r.data) setResult(r.data as ImageResult)
  }

  const exifEntries = result?.exif ? Object.entries(result.exif).filter(([,v]) => v) : []

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image className="w-5 h-5 text-primary-400" />
          <h1 className="text-lg font-bold text-white">Image Forensics</h1>
        </div>
        {result && (
          <Button size="sm" variant="ghost" onClick={() => setResult(null)}>Analyze Another</Button>
        )}
      </div>

      {!result && !loading && (
        <DropZone
          onFiles={handleFiles}
          label="Drop an image to analyze"
          hint="JPEG, PNG, TIFF, BMP, WebP — extracts EXIF, GPS, ELA, LSB steganography check"
          className="min-h-56"
        />
      )}

      {loading && (
        <Card className="flex flex-col items-center justify-center py-16 gap-4">
          <Spinner className="w-8 h-8" />
          <p className="text-sm text-muted">Analyzing image…</p>
        </Card>
      )}

      {result && (
        <>
          {/* Header */}
          <Card>
            <div className="flex items-start gap-4">
              <div className="w-24 h-24 rounded-xl bg-surface-3 border border-surface-4 overflow-hidden flex-shrink-0">
                <img
                  src={`file://${result.path}`}
                  alt={result.name}
                  className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-white">{result.name}</h2>
                <p className="text-xs font-mono text-muted truncate">{result.path}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant="primary">{result.mime}</Badge>
                  <Badge variant="muted">{formatBytes(result.size)}</Badge>
                  {result.width > 0 && <Badge variant="muted">{result.width} × {result.height} px</Badge>}
                  {result.gps && <Badge variant="success" dot>GPS Data</Badge>}
                  {result.lsb?.suspicious && <Badge variant="warning" dot>Possible Steganography</Badge>}
                  {result.thumbnail_mismatch?.detected && <Badge variant="danger" dot>Thumbnail Mismatch</Badge>}
                </div>
              </div>
            </div>
          </Card>

          {/* Alerts */}
          {result.lsb?.suspicious && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-warning text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{result.lsb.description}</span>
            </div>
          )}
          {result.thumbnail_mismatch?.detected && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{result.thumbnail_mismatch.description}</span>
            </div>
          )}

          <Tabs defaultValue="exif">
            <TabsList>
              <TabsTrigger value="exif">EXIF ({exifEntries.length})</TabsTrigger>
              {result.gps && <TabsTrigger value="gps">GPS Location</TabsTrigger>}
              <TabsTrigger value="ela">ELA Analysis</TabsTrigger>
              <TabsTrigger value="lsb">LSB / Steganography</TabsTrigger>
            </TabsList>

            <TabsContent value="exif" className="mt-3">
              <Card>
                {exifEntries.length === 0 ? (
                  <p className="text-sm text-muted text-center py-8">No EXIF data found in this image.</p>
                ) : (
                  <KeyValueGrid
                    items={exifEntries.map(([k,v]) => ({ key: k, value: v }))}
                    columns={2}
                  />
                )}
              </Card>
            </TabsContent>

            {result.gps && (
              <TabsContent value="gps" className="mt-3">
                <Card>
                  <CardHeader>
                    <CardTitle>GPS Coordinates</CardTitle>
                    <a
                      href={result.gps.map_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300"
                      onClick={e => { e.preventDefault(); api.util.openExternal(result.gps!.map_url) }}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      Open in Maps
                    </a>
                  </CardHeader>
                  <KeyValueGrid items={[
                    { key: 'Latitude', value: result.gps.lat.toFixed(6) + '°' },
                    { key: 'Longitude', value: result.gps.lon.toFixed(6) + '°' },
                    { key: 'Altitude', value: result.gps.altitude != null ? `${result.gps.altitude.toFixed(1)} m` : '—' },
                    { key: 'Map URL', value: result.gps.map_url },
                  ]} columns={2} mono />
                  <div className="mt-4 rounded-xl overflow-hidden border border-surface-4" style={{ height: 280 }}>
                    <iframe
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${result.gps.lon-0.02},${result.gps.lat-0.02},${result.gps.lon+0.02},${result.gps.lat+0.02}&layer=mapnik&marker=${result.gps.lat},${result.gps.lon}`}
                      className="w-full h-full border-0"
                      title="GPS Map"
                    />
                  </div>
                </Card>
              </TabsContent>
            )}

            <TabsContent value="ela" className="mt-3">
              <Card>
                <CardHeader><CardTitle>Error Level Analysis</CardTitle></CardHeader>
                {result.ela ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted">ELA Score</span>
                      <span className={`text-sm font-bold ${result.ela.score > 70 ? 'text-danger' : result.ela.score > 40 ? 'text-warning' : 'text-success'}`}>
                        {result.ela.score.toFixed(1)}%
                      </span>
                    </div>
                    <Progress
                      value={result.ela.score}
                      color={result.ela.score > 70 ? 'danger' : result.ela.score > 40 ? 'warning' : 'success'}
                    />
                    <p className="text-sm text-white">{result.ela.description}</p>
                    <div className="p-3 rounded-lg bg-surface-3 border border-surface-4 text-xs text-muted">
                      ELA measures compression level inconsistencies. A high score may indicate digital manipulation or image splicing, though false positives are possible with re-saved images.
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted py-4">ELA not available for this image format.</p>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="lsb" className="mt-3">
              <Card>
                <CardHeader><CardTitle>LSB Steganography Check</CardTitle></CardHeader>
                {result.lsb ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      {result.lsb.suspicious ? (
                        <Badge variant="warning" dot>Possibly Suspicious</Badge>
                      ) : (
                        <Badge variant="success" dot>Normal Distribution</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted">LSB Uniformity Ratio</span>
                      <span className="text-sm font-mono text-white">{(result.lsb.uniform_ratio * 100).toFixed(1)}%</span>
                    </div>
                    <Progress
                      value={result.lsb.uniform_ratio * 100}
                      color={result.lsb.suspicious ? 'warning' : 'success'}
                    />
                    <p className="text-sm text-white">{result.lsb.description}</p>
                    <div className="p-3 rounded-lg bg-surface-3 border border-surface-4 text-xs text-muted">
                      Normal images have LSB uniformity ~50%. Ratios significantly above or below (outside 45–55%) may indicate hidden data embedded in least-significant bits.
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted py-4">LSB check not available for this image format.</p>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
