// Shared between the browser upload UI and the server upload routes,
// so both sides agree on what is allowed.

export const ALLOWED_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  txt: 'text/plain',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  heic: 'image/heic',
  zip: 'application/zip',
};

export const ALLOWED_EXTENSIONS = Object.keys(ALLOWED_TYPES);
export const ALLOWED_MIME_TYPES = Array.from(new Set(Object.values(ALLOWED_TYPES)));

// ~2 GB per file (stays under the Int limit of Document.fileSize).
// so this is no longer limited by Vercel's 4.5 MB function body limit.
export const MAX_FILE_SIZE = 2000 * 1024 * 1024;

// Files larger than this are sent in parallel chunks with automatic retry.
export const MULTIPART_THRESHOLD = 25 * 1024 * 1024;

export function getExtension(name: string): string {
  const i = name.lastIndexOf('.');
  return i === -1 ? '' : name.slice(i + 1).toLowerCase();
}

export function getMimeType(name: string): string | null {
  return ALLOWED_TYPES[getExtension(name)] ?? null;
}

// OS junk that shows up when dragging folders; silently ignored.
export function isJunkFile(name: string): boolean {
  const base = name.split('/').pop() ?? name;
  return base.startsWith('.') || base === 'Thumbs.db' || base === 'desktop.ini' || base.startsWith('~$');
}

// Normalise a relative path coming from the browser: strip "..", leading
// slashes, empty segments and control characters.
export function sanitizeRelativePath(path: string): string {
  return path
    .replace(/\\/g, '/')
    .split('/')
    .map(s => s.replace(/[\u0000-\u001f]/g, '').trim())
    .filter(s => s && s !== '.' && s !== '..')
    .join('/')
    .slice(0, 500);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
