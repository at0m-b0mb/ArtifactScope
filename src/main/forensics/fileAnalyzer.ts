import fs from 'fs'
import path from 'path'
import { calculateHashes } from './hashCalculator'
import { detectMagicBytes } from './magicBytes'
import { calculateEntropy } from './entropy'
import { extractStrings } from './stringExtractor'

export interface FileAnalysisResult {
  path: string
  name: string
  extension: string
  size: number
  hashes: { md5: string; sha1: string; sha256: string; sha512: string }
  magic: { type: string; description: string; mime: string; expectedExtensions: string[]; mismatch: boolean }
  entropy: number
  timestamps: { created: string; modified: string; accessed: string }
  permissions: string
  strings: { offset: number; value: string; encoding: string; length: number }[]
  string_count: number
  exif: Record<string, string> | null
  is_text: boolean
  preview_text: string | null
}

export async function analyzeFile(filePath: string): Promise<FileAnalysisResult> {
  const stat = fs.statSync(filePath)
  const name = path.basename(filePath)
  const ext = path.extname(filePath).toLowerCase().replace('.', '')

  // Read first 512 bytes for magic bytes detection
  const header = Buffer.allocUnsafe(Math.min(512, stat.size))
  const fd = fs.openSync(filePath, 'r')
  const headerRead = fs.readSync(fd, header, 0, header.length, 0)
  fs.closeSync(fd)
  const magic = detectMagicBytes(header.slice(0, headerRead), name)

  // Parallel operations
  const [hashes, entropy, strings] = await Promise.all([
    calculateHashes(filePath),
    Promise.resolve(calculateEntropy(filePath)),
    extractStrings(filePath, 4),
  ])

  // EXIF (lazy-load to avoid issues if exifreader fails)
  let exif: Record<string, string> | null = null
  if (['jpg','jpeg','png','tiff','tif','webp','heic'].includes(ext)) {
    try {
      const ExifReader = require('exifreader')
      const rawExif = ExifReader.load(fs.readFileSync(filePath))
      exif = {}
      for (const [k, v] of Object.entries(rawExif)) {
        const tag = v as { description?: string; value?: unknown }
        exif[k] = String(tag.description ?? tag.value ?? '')
      }
    } catch { exif = null }
  }

  // Text preview
  let preview_text: string | null = null
  const isText = magic.type === 'TEXT' || ['txt','log','json','csv','xml','html','md','yaml','yml','ini','conf'].includes(ext)
  if (isText && stat.size < 1 * 1024 * 1024) {
    try {
      const raw = fs.readFileSync(filePath, 'utf8')
      preview_text = raw.slice(0, 4096)
    } catch { preview_text = null }
  }

  return {
    path: filePath,
    name,
    extension: ext,
    size: stat.size,
    hashes,
    magic,
    entropy,
    timestamps: {
      created:  stat.birthtime.toISOString(),
      modified: stat.mtime.toISOString(),
      accessed: stat.atime.toISOString(),
    },
    permissions: (stat.mode & 0o777).toString(8),
    strings: strings.slice(0, 2000),
    string_count: strings.length,
    exif,
    is_text: isText,
    preview_text,
  }
}
