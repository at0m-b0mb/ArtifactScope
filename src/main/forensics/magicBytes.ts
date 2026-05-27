export interface MagicResult {
  type: string
  description: string
  mime: string
  expectedExtensions: string[]
  mismatch: boolean
}

interface Signature {
  magic: number[]
  offset: number
  type: string
  description: string
  mime: string
  extensions: string[]
}

const SIGNATURES: Signature[] = [
  // Images
  { magic: [0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A], offset:0, type:'PNG',  description:'PNG Image',  mime:'image/png',   extensions:['png'] },
  { magic: [0xFF,0xD8,0xFF],            offset:0, type:'JPEG', description:'JPEG Image', mime:'image/jpeg',  extensions:['jpg','jpeg'] },
  { magic: [0x47,0x49,0x46,0x38],       offset:0, type:'GIF',  description:'GIF Image',  mime:'image/gif',   extensions:['gif'] },
  { magic: [0x42,0x4D],                 offset:0, type:'BMP',  description:'BMP Bitmap', mime:'image/bmp',   extensions:['bmp'] },
  { magic: [0x49,0x49,0x2A,0x00],       offset:0, type:'TIFF', description:'TIFF Image (LE)', mime:'image/tiff', extensions:['tif','tiff'] },
  { magic: [0x4D,0x4D,0x00,0x2A],       offset:0, type:'TIFF', description:'TIFF Image (BE)', mime:'image/tiff', extensions:['tif','tiff'] },
  { magic: [0x52,0x49,0x46,0x46],       offset:0, type:'WEBP', description:'WebP Image', mime:'image/webp',  extensions:['webp'] },
  // Archives
  { magic: [0x50,0x4B,0x03,0x04],       offset:0, type:'ZIP',  description:'ZIP Archive',  mime:'application/zip',           extensions:['zip','jar','apk','docx','xlsx','pptx','odt','ods','odp'] },
  { magic: [0x52,0x61,0x72,0x21,0x1A,0x07], offset:0, type:'RAR', description:'RAR Archive', mime:'application/x-rar',     extensions:['rar'] },
  { magic: [0x1F,0x8B],                 offset:0, type:'GZIP', description:'GZIP Compressed', mime:'application/gzip',       extensions:['gz','tgz'] },
  { magic: [0x42,0x5A,0x68],            offset:0, type:'BZIP2',description:'BZIP2 Compressed', mime:'application/x-bzip2',   extensions:['bz2'] },
  { magic: [0x37,0x7A,0xBC,0xAF,0x27,0x1C], offset:0, type:'7ZIP', description:'7-Zip Archive', mime:'application/x-7z-compressed', extensions:['7z'] },
  { magic: [0xFD,0x37,0x7A,0x58,0x5A,0x00], offset:0, type:'XZ', description:'XZ Compressed',  mime:'application/x-xz',     extensions:['xz'] },
  { magic: [0x75,0x73,0x74,0x61,0x72],  offset:257, type:'TAR', description:'TAR Archive',  mime:'application/x-tar',       extensions:['tar'] },
  // Documents
  { magic: [0x25,0x50,0x44,0x46],       offset:0, type:'PDF',  description:'PDF Document', mime:'application/pdf',           extensions:['pdf'] },
  { magic: [0xD0,0xCF,0x11,0xE0,0xA1,0xB1,0x1A,0xE1], offset:0, type:'OLE2', description:'Microsoft Office (OLE2)', mime:'application/msword', extensions:['doc','xls','ppt','msi','msg'] },
  { magic: [0x3C,0x3F,0x78,0x6D,0x6C], offset:0, type:'XML',  description:'XML Document', mime:'application/xml',           extensions:['xml'] },
  // Executables
  { magic: [0x4D,0x5A],                 offset:0, type:'PE',   description:'Windows PE Executable', mime:'application/x-msdownload', extensions:['exe','dll','sys','scr','com'] },
  { magic: [0x7F,0x45,0x4C,0x46],       offset:0, type:'ELF',  description:'Linux ELF Executable',  mime:'application/x-elf',  extensions:['elf','so','out'] },
  { magic: [0xCE,0xFA,0xED,0xFE],       offset:0, type:'MACHO32', description:'macOS Mach-O 32-bit', mime:'application/x-mach-binary', extensions:[''] },
  { magic: [0xCF,0xFA,0xED,0xFE],       offset:0, type:'MACHO64', description:'macOS Mach-O 64-bit', mime:'application/x-mach-binary', extensions:[''] },
  { magic: [0xCA,0xFE,0xBA,0xBE],       offset:0, type:'MACHOFAT', description:'macOS Mach-O Fat Binary', mime:'application/x-mach-binary', extensions:[''] },
  // Media
  { magic: [0x00,0x00,0x00,0x18,0x66,0x74,0x79,0x70], offset:0, type:'MP4',  description:'MP4 Video',  mime:'video/mp4',    extensions:['mp4','m4v'] },
  { magic: [0x00,0x00,0x00,0x20,0x66,0x74,0x79,0x70], offset:0, type:'MP4',  description:'MP4 Video',  mime:'video/mp4',    extensions:['mp4','m4v'] },
  { magic: [0x49,0x44,0x33],            offset:0, type:'MP3',  description:'MP3 Audio',   mime:'audio/mpeg',   extensions:['mp3'] },
  { magic: [0xFF,0xFB],                 offset:0, type:'MP3',  description:'MP3 Audio',   mime:'audio/mpeg',   extensions:['mp3'] },
  { magic: [0x52,0x49,0x46,0x46],       offset:0, type:'WAV',  description:'WAV Audio',   mime:'audio/wav',    extensions:['wav'] },
  { magic: [0x1A,0x45,0xDF,0xA3],       offset:0, type:'MKV',  description:'MKV/WebM Video', mime:'video/x-matroska', extensions:['mkv','webm'] },
  { magic: [0x4F,0x67,0x67,0x53],       offset:0, type:'OGG',  description:'OGG Container', mime:'audio/ogg',   extensions:['ogg','ogv'] },
  { magic: [0x66,0x4C,0x61,0x43],       offset:0, type:'FLAC', description:'FLAC Audio',  mime:'audio/flac',   extensions:['flac'] },
  // Database
  { magic: [0x53,0x51,0x4C,0x69,0x74,0x65,0x20,0x66,0x6F,0x72,0x6D,0x61,0x74,0x20,0x33,0x00], offset:0, type:'SQLITE', description:'SQLite Database', mime:'application/x-sqlite3', extensions:['db','sqlite','sqlite3'] },
  // Scripts
  { magic: [0x23,0x21],                 offset:0, type:'SCRIPT', description:'Script (Shebang)', mime:'text/plain', extensions:['sh','py','rb','pl'] },
  // Disk images
  { magic: [0x45,0x57,0x46,0x09],       offset:0, type:'E01',  description:'EnCase Image (E01)', mime:'application/x-encase', extensions:['e01'] },
  // Java
  { magic: [0xCA,0xFE,0xBA,0xBE],       offset:0, type:'CLASS', description:'Java Class File', mime:'application/java-vm', extensions:['class'] },
  // Fonts
  { magic: [0x00,0x01,0x00,0x00,0x00],  offset:0, type:'TTF',  description:'TrueType Font', mime:'font/ttf', extensions:['ttf'] },
  { magic: [0x4F,0x54,0x54,0x4F],       offset:0, type:'OTF',  description:'OpenType Font', mime:'font/otf', extensions:['otf'] },
]

function matchesAt(buf: Buffer, magic: number[], offset: number): boolean {
  if (buf.length < offset + magic.length) return false
  for (let i = 0; i < magic.length; i++) {
    if (buf[offset + i] !== magic[i]) return false
  }
  return true
}

export function detectMagicBytes(buf: Buffer, filename: string): MagicResult {
  for (const sig of SIGNATURES) {
    if (matchesAt(buf, sig.magic, sig.offset)) {
      const ext = filename.split('.').pop()?.toLowerCase() ?? ''
      const mismatch = sig.extensions.length > 0 &&
        !sig.extensions.includes(ext) &&
        ext !== ''
      return {
        type: sig.type,
        description: sig.description,
        mime: sig.mime,
        expectedExtensions: sig.extensions,
        mismatch,
      }
    }
  }
  // Detect plain text
  const printable = buf.slice(0, 512)
  const nonPrintable = Array.from(printable).filter(b => b < 9 || (b > 13 && b < 32)).length
  if (nonPrintable === 0) {
    return { type: 'TEXT', description: 'Plain Text', mime: 'text/plain', expectedExtensions: ['txt'], mismatch: false }
  }
  return { type: 'UNKNOWN', description: 'Unknown Binary', mime: 'application/octet-stream', expectedExtensions: [], mismatch: false }
}
