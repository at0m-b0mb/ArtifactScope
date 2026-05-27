import fs from 'fs'
import path from 'path'
import { calculateHashes } from './hashCalculator'
import { bufferEntropy } from './entropy'

export interface GPSCoords { lat: number; lon: number; alt?: number }

export interface ImageForensicsResult {
  path: string
  name: string
  size: number
  format: string
  dimensions: { width: number; height: number } | null
  hashes: { md5: string; sha1: string; sha256: string; sha512: string }
  exif: Record<string, string>
  gps: GPSCoords | null
  gps_map_url: string | null
  thumbnail_differs: boolean
  entropy: number
  lsb_analysis: { suspicious: boolean; uniformity: number; detail: string }
  color_profile: string | null
  software: string | null
  camera: string | null
  timestamp_exif: string | null
  timestamp_file_modified: string | null
  warnings: string[]
}

function exifGPSToDecimal(ref: string, deg: number, min: number, sec: number): number {
  const d = Math.abs(deg) + min / 60 + sec / 3600
  return (ref === 'S' || ref === 'W') ? -d : d
}

export async function analyzeImage(filePath: string): Promise<ImageForensicsResult> {
  const stat = fs.statSync(filePath)
  const name = path.basename(filePath)
  const ext = path.extname(filePath).toLowerCase().replace('.', '')
  const buf = fs.readFileSync(filePath)
  const warnings: string[] = []

  const hashes = await calculateHashes(filePath)
  const entropy = bufferEntropy(buf.slice(0, 1024 * 1024))

  // EXIF
  let exif: Record<string, string> = {}
  let gps: GPSCoords | null = null
  let dimensions: { width: number; height: number } | null = null
  let software: string | null = null
  let camera: string | null = null
  let colorProfile: string | null = null
  let timestampExif: string | null = null

  try {
    const ExifReader = require('exifreader')
    const raw = ExifReader.load(buf)
    exif = {}
    for (const [k, v] of Object.entries(raw)) {
      const tag = v as { description?: string; value?: unknown }
      exif[k] = String(tag.description ?? tag.value ?? '')
    }

    // Dimensions
    const w = parseInt(exif['Image Width'] ?? exif['PixelXDimension'] ?? '') || null
    const h = parseInt(exif['Image Height'] ?? exif['PixelYDimension'] ?? '') || null
    if (w && h) dimensions = { width: w, height: h }

    software    = exif['Software'] ?? null
    camera      = [exif['Make'], exif['Model']].filter(Boolean).join(' ') || null
    colorProfile = exif['ColorSpace'] ?? exif['ICCProfile'] ?? null
    timestampExif = exif['DateTimeOriginal'] ?? exif['DateTime'] ?? null

    // GPS
    const latRef = exif['GPSLatitudeRef']
    const lonRef = exif['GPSLongitudeRef']
    const latVal = raw['GPSLatitude']?.value as number[] | undefined
    const lonVal = raw['GPSLongitude']?.value as number[] | undefined
    if (latRef && lonRef && latVal && lonVal && latVal.length >= 3 && lonVal.length >= 3) {
      const lat = exifGPSToDecimal(latRef, latVal[0], latVal[1], latVal[2])
      const lon = exifGPSToDecimal(lonRef, lonVal[0], lonVal[1], lonVal[2])
      const altRaw = raw['GPSAltitude']?.value as number | undefined
      gps = { lat, lon, alt: altRaw }
    }

    // Warnings
    if (software && /photoshop|gimp|lightroom|affinity|pixelmator|paint\.net/i.test(software)) {
      warnings.push(`Editing software detected: ${software}`)
    }
  } catch { /* EXIF parsing failure is non-fatal */ }

  // GPS map URL (openstreetmap — no API key required)
  const gps_map_url = gps
    ? `https://www.openstreetmap.org/?mlat=${gps.lat}&mlon=${gps.lon}&zoom=15`
    : null

  // LSB steganography check (naive uniformity test on last bit of each byte in a sample)
  const lsb_analysis = analyzeLSB(buf)
  if (lsb_analysis.suspicious) {
    warnings.push('LSB analysis suggests possible steganographic content.')
  }

  // Thumbnail mismatch check (EXIF thumbnail vs main image dimensions)
  const thumbnail_differs = checkThumbnailMismatch(buf, exif)
  if (thumbnail_differs) {
    warnings.push('Thumbnail dimensions differ from main image — possible editing.')
  }

  if (entropy > 7.8) {
    warnings.push('High entropy — image may be heavily compressed or contain hidden encrypted data.')
  }

  return {
    path: filePath,
    name,
    size: stat.size,
    format: ext.toUpperCase(),
    dimensions,
    hashes,
    exif,
    gps,
    gps_map_url,
    thumbnail_differs,
    entropy,
    lsb_analysis,
    color_profile: colorProfile,
    software,
    camera,
    timestamp_exif: timestampExif,
    timestamp_file_modified: stat.mtime.toISOString(),
    warnings,
  }
}

function analyzeLSB(buf: Buffer): { suspicious: boolean; uniformity: number; detail: string } {
  const sample = buf.slice(0, Math.min(65536, buf.length))
  let ones = 0
  for (const b of sample) {
    if (b & 1) ones++
  }
  const uniformity = ones / sample.length
  // Truly random data should be ~50% 1s. Steganography tends to be more uniform.
  const suspicious = uniformity > 0.52 || uniformity < 0.48
  return {
    suspicious,
    uniformity: Math.round(uniformity * 10000) / 10000,
    detail: `${Math.round(uniformity * 100)}% LSB ones in ${sample.length}-byte sample`,
  }
}

function checkThumbnailMismatch(_buf: Buffer, exif: Record<string, string>): boolean {
  try {
    const mainW = parseInt(exif['PixelXDimension'] ?? exif['Image Width'] ?? '')
    const mainH = parseInt(exif['PixelYDimension'] ?? exif['Image Height'] ?? '')
    const thumbW = parseInt(exif['ThumbnailImageWidth'] ?? exif['thumbnail Image Width'] ?? '')
    const thumbH = parseInt(exif['ThumbnailImageHeight'] ?? exif['thumbnail Image Height'] ?? '')
    if (!thumbW || !thumbH || !mainW || !mainH) return false
    // Aspect ratio mismatch is suspicious
    const mainRatio = mainW / mainH
    const thumbRatio = thumbW / thumbH
    return Math.abs(mainRatio - thumbRatio) > 0.1
  } catch { return false }
}
