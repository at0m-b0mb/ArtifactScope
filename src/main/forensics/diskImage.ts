import fs from 'fs'

export interface PartitionEntry {
  index: number
  bootable: boolean
  type_code: number
  type_name: string
  lba_start: number
  lba_size: number
  size_bytes: number
  size_human: string
}

export interface DiskImageResult {
  path: string
  size: number
  size_human: string
  format: 'MBR' | 'GPT' | 'Unknown'
  sector_size: number
  partitions: PartitionEntry[]
  guid: string | null
  disk_signature: string
  warnings: string[]
}

const PARTITION_TYPES: Record<number, string> = {
  0x00: 'Empty',
  0x01: 'FAT12',
  0x04: 'FAT16 (< 32MB)',
  0x05: 'Extended',
  0x06: 'FAT16',
  0x07: 'NTFS / exFAT',
  0x0B: 'FAT32 (CHS)',
  0x0C: 'FAT32 (LBA)',
  0x0E: 'FAT16 (LBA)',
  0x0F: 'Extended (LBA)',
  0x11: 'Hidden FAT12',
  0x14: 'Hidden FAT16',
  0x1B: 'Hidden FAT32',
  0x1C: 'Hidden FAT32 (LBA)',
  0x27: 'Windows Recovery',
  0x42: 'Windows Dynamic',
  0x82: 'Linux Swap',
  0x83: 'Linux Data',
  0x84: 'Hibernation',
  0x85: 'Linux Extended',
  0x86: 'NTFS Volume Set',
  0x8E: 'Linux LVM',
  0xA5: 'FreeBSD',
  0xA6: 'OpenBSD',
  0xAB: 'macOS Recovery',
  0xAF: 'macOS HFS+',
  0xB6: 'Windows FAT16 Mirror',
  0xBE: 'Solaris Boot',
  0xBF: 'Solaris',
  0xEB: 'BeOS',
  0xEE: 'GPT Protective MBR',
  0xEF: 'EFI System Partition',
  0xFB: 'VMware VMFS',
  0xFC: 'VMware Swap',
  0xFD: 'Linux RAID',
}

function humanSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`
}

function parseGUID(buf: Buffer, offset: number): string {
  const p1 = buf.readUInt32LE(offset).toString(16).padStart(8, '0')
  const p2 = buf.readUInt16LE(offset + 4).toString(16).padStart(4, '0')
  const p3 = buf.readUInt16LE(offset + 6).toString(16).padStart(4, '0')
  const p4 = buf.slice(offset + 8, offset + 10).toString('hex')
  const p5 = buf.slice(offset + 10, offset + 16).toString('hex')
  return `{${p1}-${p2}-${p3}-${p4}-${p5}}`.toUpperCase()
}

export function analyzeDiskImage(filePath: string): DiskImageResult {
  const stat = fs.statSync(filePath)
  const warnings: string[] = []

  const headerSize = Math.min(stat.size, 1024 * 1024) // Read first 1 MB
  const buf = Buffer.allocUnsafe(headerSize)
  const fd = fs.openSync(filePath, 'r')
  fs.readSync(fd, buf, 0, headerSize, 0)
  fs.closeSync(fd)

  if (buf.length < 512) {
    return { path: filePath, size: stat.size, size_human: humanSize(stat.size), format: 'Unknown', sector_size: 512, partitions: [], guid: null, disk_signature: '', warnings: ['File too small for analysis.'] }
  }

  const bootSig = buf.readUInt16LE(510)
  if (bootSig !== 0xAA55) {
    warnings.push('MBR boot signature (0xAA55) not found at offset 510.')
    return { path: filePath, size: stat.size, size_human: humanSize(stat.size), format: 'Unknown', sector_size: 512, partitions: [], guid: null, disk_signature: '', warnings }
  }

  const diskSig = buf.readUInt32LE(440).toString(16).toUpperCase().padStart(8, '0')

  // Check for GPT protective MBR
  const firstPartType = buf[446 + 4]
  const isGPT = firstPartType === 0xEE

  if (isGPT && buf.length >= 1024) {
    // Parse GPT header at LBA 1 (offset 512)
    const gptOff = 512
    const gptSig = buf.slice(gptOff, gptOff + 8).toString('ascii')
    if (gptSig === 'EFI PART') {
      const diskGUID = parseGUID(buf, gptOff + 56)
      const partitionEntryStart = Number(buf.readBigUInt64LE(gptOff + 72)) // LBA of first partition entry
      const partEntryCount = buf.readUInt32LE(gptOff + 80)
      const partEntrySize = buf.readUInt32LE(gptOff + 84)
      const partTableOffset = Number(partitionEntryStart) * 512

      const partitions: PartitionEntry[] = []
      for (let i = 0; i < Math.min(partEntryCount, 128); i++) {
        const entOff = partTableOffset + i * partEntrySize
        if (entOff + partEntrySize > buf.length) break
        const typeGUID = parseGUID(buf, entOff)
        if (typeGUID === '{00000000-0000-0000-0000-000000000000}') continue // unused
        const startLBA = Number(buf.readBigUInt64LE(entOff + 32))
        const endLBA   = Number(buf.readBigUInt64LE(entOff + 40))
        const lbaSize  = endLBA - startLBA + 1
        const sizeBytes = lbaSize * 512

        // Decode partition name (UTF-16LE, 72 bytes)
        const nameRaw = buf.slice(entOff + 56, entOff + 128)
        const typeName = nameRaw.toString('utf16le').replace(/\0/g, '').trim() || typeGUID

        partitions.push({
          index: i + 1,
          bootable: false,
          type_code: 0,
          type_name: typeName,
          lba_start: startLBA,
          lba_size: lbaSize,
          size_bytes: sizeBytes,
          size_human: humanSize(sizeBytes),
        })
      }
      return { path: filePath, size: stat.size, size_human: humanSize(stat.size), format: 'GPT', sector_size: 512, partitions, guid: diskGUID, disk_signature: diskSig, warnings }
    }
  }

  // MBR partition table
  const partitions: PartitionEntry[] = []
  for (let i = 0; i < 4; i++) {
    const entOff = 446 + i * 16
    const typeCode = buf[entOff + 4]
    if (typeCode === 0x00) continue
    const lbaStart = buf.readUInt32LE(entOff + 8)
    const lbaSize  = buf.readUInt32LE(entOff + 12)
    const sizeBytes = lbaSize * 512
    partitions.push({
      index: i + 1,
      bootable: buf[entOff] === 0x80,
      type_code: typeCode,
      type_name: PARTITION_TYPES[typeCode] ?? `Unknown (0x${typeCode.toString(16).toUpperCase().padStart(2, '0')})`,
      lba_start: lbaStart,
      lba_size: lbaSize,
      size_bytes: sizeBytes,
      size_human: humanSize(sizeBytes),
    })
  }

  return { path: filePath, size: stat.size, size_human: humanSize(stat.size), format: 'MBR', sector_size: 512, partitions, guid: null, disk_signature: diskSig, warnings }
}
