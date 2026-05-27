import path from 'path'
import fs from 'fs'
import StreamZip from 'node-stream-zip'

export interface ArchiveEntry {
  name: string
  path: string
  size: number
  compressed_size: number
  compression_ratio: number
  date: string
  is_dir: boolean
  extension: string
  suspicious: boolean
  flags: string[]
}

export interface ArchiveResult {
  path: string
  format: string
  total_entries: number
  total_size: number
  compressed_size: number
  entries: ArchiveEntry[]
  warnings: string[]
}

const SUSPICIOUS_DOUBLE_EXT = /\.(jpg|pdf|doc|xls|txt|png|gif|zip)\.(exe|bat|cmd|ps1|vbs|scr|com|pif|jar|js|hta)$/i
const SUSPICIOUS_ALONE_EXT  = /\.(exe|bat|cmd|ps1|vbs|scr|com|pif|jar|lnk|hta|wsf|inf)$/i

function detectFormat(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  if (['.zip','.jar','.apk','.docx','.xlsx','.pptx','.odt'].includes(ext)) return 'ZIP'
  if (ext === '.7z') return '7-ZIP'
  if (ext === '.rar') return 'RAR'
  if (['.tar','.tgz','.tar.gz','.tar.bz2','.tar.xz'].includes(ext) || filePath.endsWith('.tar.gz') || filePath.endsWith('.tar.bz2')) return 'TAR'
  if (['.gz','.gzip'].includes(ext)) return 'GZIP'
  if (ext === '.bz2') return 'BZIP2'
  return 'Unknown'
}

function flagEntry(name: string): string[] {
  const flags: string[] = []
  if (SUSPICIOUS_DOUBLE_EXT.test(name)) flags.push('Double extension (possible malware disguise)')
  if (name.startsWith('..') || name.includes('../')) flags.push('Path traversal attempt')
  if (SUSPICIOUS_ALONE_EXT.test(name)) flags.push('Executable type')
  if (name.includes('\0')) flags.push('Null byte in filename')
  return flags
}

export async function analyzeArchive(filePath: string): Promise<ArchiveResult> {
  const format = detectFormat(filePath)
  const warnings: string[] = []

  if (format === 'ZIP') {
    return analyzeZIP(filePath, warnings)
  }

  // For non-ZIP formats, return basic info
  const stat = fs.statSync(filePath)
  return {
    path: filePath,
    format,
    total_entries: 0,
    total_size: stat.size,
    compressed_size: stat.size,
    entries: [],
    warnings: [`${format} format parsing requires additional native libs. Basic file info shown.`],
  }
}

async function analyzeZIP(filePath: string, warnings: string[]): Promise<ArchiveResult> {
  const zip = new StreamZip.async({ file: filePath })
  const entries: ArchiveEntry[] = []
  let totalSize = 0
  let compressedSize = 0

  try {
    const entriesMap = await zip.entries()
    for (const [, entry] of Object.entries(entriesMap)) {
      const e = entry as { name: string; size: number; compressedSize: number; time: number; isDirectory: boolean }
      const flags = flagEntry(e.name)
      const suspicious = flags.length > 0
      if (suspicious) warnings.push(`Suspicious: ${e.name} — ${flags.join(', ')}`)
      totalSize      += e.size
      compressedSize += e.compressedSize
      entries.push({
        name: path.basename(e.name),
        path: e.name,
        size: e.size,
        compressed_size: e.compressedSize,
        compression_ratio: e.size > 0 ? Math.round((1 - e.compressedSize / e.size) * 100) : 0,
        date: new Date(e.time).toISOString(),
        is_dir: e.isDirectory,
        extension: path.extname(e.name).toLowerCase().replace('.', ''),
        suspicious,
        flags,
      })
    }
  } finally {
    await zip.close()
  }

  return {
    path: filePath,
    format: 'ZIP',
    total_entries: entries.length,
    total_size: totalSize,
    compressed_size: compressedSize,
    entries: entries.sort((a, b) => (b.suspicious ? 1 : 0) - (a.suspicious ? 1 : 0)),
    warnings,
  }
}
