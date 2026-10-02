'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';
import {
  X, Upload, File as FileIcon, FolderUp, CheckCircle2, AlertCircle, Loader2, RotateCcw, Trash2, MinusCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
  MULTIPART_THRESHOLD,
  formatBytes,
  getMimeType,
  isJunkFile,
  sanitizeRelativePath,
} from '@/lib/fileTypes';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Status = 'queued' | 'uploading' | 'done' | 'error' | 'skipped';

interface QueueItem {
  id: string;
  file: File;
  relativePath: string;
  status: Status;
  progress: number;
  message?: string;
}

const CONCURRENCY = 3;

// ---------- reading dropped folders ----------

// Minimal typings for the File System Entry API (supported by all modern browsers).
interface FsEntry {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
}
interface FsFileEntry extends FsEntry {
  file: (ok: (f: File) => void, err: (e: unknown) => void) => void;
}
interface FsDirEntry extends FsEntry {
  createReader: () => { readEntries: (ok: (e: FsEntry[]) => void, err: (e: unknown) => void) => void };
}

async function walkEntry(entry: FsEntry, prefix = ''): Promise<{ file: File; path: string }[]> {
  if (entry.isFile) {
    const file = await new Promise<File>((ok, err) => (entry as FsFileEntry).file(ok, err));
    return [{ file, path: prefix + file.name }];
  }
  if (entry.isDirectory) {
    const reader = (entry as FsDirEntry).createReader();
    const children: FsEntry[] = [];
    // readEntries returns results in batches; keep reading until empty.
    for (;;) {
      const batch = await new Promise<FsEntry[]>((ok, err) => reader.readEntries(ok, err));
      if (!batch.length) break;
      children.push(...batch);
    }
    const nested = await Promise.all(children.map(c => walkEntry(c, `${prefix}${entry.name}/`)));
    return nested.flat();
  }
  return [];
}

// Blob pathnames: keep folder structure, but replace characters that
// would break URLs. The original name is still stored for display.
function toBlobPath(relativePath: string): string {
  return sanitizeRelativePath(relativePath).replace(/[#?%&+\\:*"<>|]/g, '_');
}

function newId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ---------- component ----------

export default function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const [employeeId, setEmployeeId] = useState('');
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/employees')
        .then(res => res.json())
        .then(data => setEmployees(data))
        .catch(console.error);
    }
  }, [isOpen]);

  // The folder picker attribute isn't in React's types, so set it directly.
  useEffect(() => {
    folderInputRef.current?.setAttribute('webkitdirectory', '');
    folderInputRef.current?.setAttribute('directory', '');
  });

  // Warn before leaving the page mid-upload.
  useEffect(() => {
    if (!isUploading) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isUploading]);

  const stats = useMemo(() => {
    const active = queue.filter(q => q.status !== 'skipped');
    const totalBytes = active.reduce((s, q) => s + q.file.size, 0);
    const doneBytes = active.reduce((s, q) => s + (q.file.size * q.progress) / 100, 0);
    return {
      total: active.length,
      done: active.filter(q => q.status === 'done').length,
      failed: active.filter(q => q.status === 'error').length,
      pending: active.filter(q => q.status === 'queued').length,
      skipped: queue.length - active.length,
      totalBytes,
      percent: totalBytes ? Math.round((doneBytes / totalBytes) * 100) : 0,
    };
  }, [queue]);

  if (!isOpen) return null;

  const update = (id: string, patch: Partial<QueueItem>) =>
    setQueue(q => q.map(item => (item.id === id ? { ...item, ...patch } : item)));

  const addFiles = (files: { file: File; path: string }[]) => {
    setQueue(current => {
      const seen = new Set(current.map(q => q.relativePath));
      const additions: QueueItem[] = [];
      for (const { file, path } of files) {
        const relativePath = sanitizeRelativePath(path || file.name);
        if (!relativePath || isJunkFile(relativePath) || seen.has(relativePath)) continue;
        seen.add(relativePath);

        let status: Status = 'queued';
        let message: string | undefined;
        if (!getMimeType(relativePath)) {
          status = 'skipped';
          message = 'File type not allowed';
        } else if (file.size > MAX_FILE_SIZE) {
          status = 'skipped';
          message = `Larger than ${formatBytes(MAX_FILE_SIZE)}`;
        } else if (file.size === 0) {
          status = 'skipped';
          message = 'Empty file';
        }
        additions.push({ id: newId(), file, relativePath, status, progress: 0, message });
      }
      return [...current, ...additions];
    });
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    if (isUploading) return;

    // Entries must be grabbed synchronously, before any await.
    const items = Array.from(e.dataTransfer.items || []);
    const entries = items
      .map(i => (i.kind === 'file' ? (i.webkitGetAsEntry?.() as FsEntry | null) : null))
      .filter((x): x is FsEntry => !!x);
    const plainFiles = Array.from(e.dataTransfer.files || []);

    setIsReading(true);
    try {
      if (entries.length) {
        const found = (await Promise.all(entries.map(en => walkEntry(en)))).flat();
        addFiles(found);
      } else {
        addFiles(plainFiles.map(f => ({ file: f, path: f.name })));
      }
    } catch (err) {
      console.error(err);
      toast.error('Could not read some of the dropped items');
    } finally {
      setIsReading(false);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addFiles(files.map(f => ({ file: f, path: f.webkitRelativePath || f.name })));
    e.target.value = '';
  };

  const uploadOne = async (item: QueueItem, batchId: string) => {
    update(item.id, { status: 'uploading', progress: 0, message: undefined });
    try {
      const blob = await upload(`documents/${employeeId}/${toBlobPath(item.relativePath)}`, item.file, {
        access: 'private',
        handleUploadUrl: '/api/documents/upload',
        clientPayload: JSON.stringify({ employeeId }),
        contentType: getMimeType(item.relativePath) || undefined,
        multipart: item.file.size > MULTIPART_THRESHOLD,
        onUploadProgress: ({ percentage }) => update(item.id, { progress: Math.min(99, Math.round(percentage)) }),
      });

      const res = await fetch('/api/documents/upload/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, url: blob.url, relativePath: item.relativePath, batchId }),
      });
      if (!res.ok) throw new Error((await res.text()) || 'Could not save document');

      update(item.id, { status: 'done', progress: 100 });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      update(item.id, { status: 'error', progress: 0, message });
      return false;
    }
  };

  const startUpload = async (onlyFailed = false) => {
    if (!employeeId) {
      toast.error('Please select an employee first');
      return;
    }
    const todo = queue.filter(q => q.status === 'queued' || (onlyFailed && q.status === 'error'));
    if (!todo.length) return;

    setIsUploading(true);
    const batchId = newId();
    let ok = 0;
    const pending = [...todo];
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, pending.length) }, async () => {
        while (pending.length) {
          const next = pending.shift()!;
          if (await uploadOne(next, batchId)) ok++;
        }
      })
    );
    setIsUploading(false);

    const failed = todo.length - ok;
    const empName = employees.find(e => e.id === employeeId)?.name || 'employee';
    if (failed === 0) toast.success(`${ok} file${ok === 1 ? '' : 's'} uploaded to ${empName}`);
    else toast.error(`${ok} uploaded, ${failed} failed. You can retry the failed files.`);
  };

  const resetAndClose = () => {
    if (isUploading) return;
    setQueue([]);
    onClose();
  };

  const canStart = !!employeeId && !isUploading && stats.pending > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onDragOver={e => e.preventDefault()}
      onDrop={e => e.preventDefault()}
    >
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold text-slate-800">Upload Documents</h2>
          <button onClick={resetAndClose} disabled={isUploading} className="text-slate-500 hover:text-slate-700 disabled:opacity-40">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Employee</label>
            <select
              value={employeeId}
              onChange={e => setEmployeeId(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isUploading}
            >
              <option value="">Select an employee...</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>

          <div
            onDragEnter={e => { e.preventDefault(); dragDepth.current++; setIsDragging(true); }}
            onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
            onDragLeave={() => { dragDepth.current--; if (dragDepth.current <= 0) setIsDragging(false); }}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300'
            } ${isUploading ? 'opacity-60 pointer-events-none' : ''}`}
          >
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleInput}
              accept={ALLOWED_EXTENSIONS.map(e => `.${e}`).join(',')} />
            <input ref={folderInputRef} type="file" multiple className="hidden" onChange={handleInput} />

            {isReading ? (
              <Loader2 className="h-8 w-8 text-blue-500 mb-2 mx-auto animate-spin" />
            ) : (
              <Upload className="h-8 w-8 text-slate-400 mb-2 mx-auto" />
            )}
            <p className="text-sm font-medium text-slate-700">
              {isReading ? 'Reading folder…' : 'Drag files or folders here'}
            </p>
            <div className="flex justify-center gap-3 mt-3">
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50">
                <FileIcon size={14} /> Choose files
              </button>
              <button type="button" onClick={() => folderInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50">
                <FolderUp size={14} /> Choose folder
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              {ALLOWED_EXTENSIONS.map(e => e.toUpperCase()).join(', ')} · up to {formatBytes(MAX_FILE_SIZE)} per file
            </p>
          </div>

          {queue.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-700 font-medium">
                  {stats.done}/{stats.total} uploaded · {formatBytes(stats.totalBytes)}
                  {stats.failed > 0 && <span className="text-red-600"> · {stats.failed} failed</span>}
                  {stats.skipped > 0 && <span className="text-slate-500"> · {stats.skipped} skipped</span>}
                </span>
                {!isUploading && (
                  <button onClick={() => setQueue([])} className="text-xs text-slate-500 hover:text-slate-700 inline-flex items-center gap-1">
                    <Trash2 size={12} /> Clear list
                  </button>
                )}
              </div>
              {(isUploading || stats.done > 0) && (
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 transition-all" style={{ width: `${stats.percent}%` }} />
                </div>
              )}
              <ul className="border rounded-md divide-y max-h-64 overflow-y-auto text-sm">
                {queue.map(item => (
                  <li key={item.id} className="flex items-center gap-3 px-3 py-2">
                    <StatusIcon status={item.status} />
                    <div className="min-w-0 flex-1">
                      <p className={`truncate ${item.status === 'skipped' ? 'text-slate-400' : 'text-slate-700'}`} title={item.relativePath}>
                        {item.relativePath}
                      </p>
                      {item.message ? (
                        <p className={`text-xs truncate ${item.status === 'error' ? 'text-red-600' : 'text-slate-400'}`}>{item.message}</p>
                      ) : item.status === 'uploading' ? (
                        <div className="h-1 bg-slate-100 rounded-full overflow-hidden mt-1">
                          <div className="h-full bg-blue-500 transition-all" style={{ width: `${item.progress}%` }} />
                        </div>
                      ) : null}
                    </div>
                    <span className="text-xs text-slate-500 shrink-0">{formatBytes(item.file.size)}</span>
                    {!isUploading && item.status !== 'done' && (
                      <button onClick={() => setQueue(q => q.filter(x => x.id !== item.id))}
                        className="text-slate-400 hover:text-slate-600" title="Remove">
                        <X size={14} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-slate-50 flex justify-end gap-3">
          <button
            onClick={resetAndClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
            disabled={isUploading}
          >
            {stats.done > 0 && stats.pending === 0 ? 'Done' : 'Close'}
          </button>
          {stats.failed > 0 && !isUploading && (
            <button
              onClick={() => startUpload(true)}
              className="px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-200 rounded-md hover:bg-red-50 flex items-center gap-2"
            >
              <RotateCcw size={14} /> Retry failed
            </button>
          )}
          <button
            onClick={() => startUpload(false)}
            disabled={!canStart}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isUploading ? (
              <><Loader2 size={16} className="animate-spin" /> Uploading {stats.percent}%</>
            ) : (
              `Upload ${stats.pending || ''} ${stats.pending === 1 ? 'file' : 'files'}`.replace('  ', ' ')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: Status }) {
  switch (status) {
    case 'done': return <CheckCircle2 size={16} className="text-green-600 shrink-0" />;
    case 'error': return <AlertCircle size={16} className="text-red-600 shrink-0" />;
    case 'uploading': return <Loader2 size={16} className="text-blue-600 animate-spin shrink-0" />;
    case 'skipped': return <MinusCircle size={16} className="text-slate-300 shrink-0" />;
    default: return <FileIcon size={16} className="text-slate-400 shrink-0" />;
  }
}
