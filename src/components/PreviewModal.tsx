'use client';

import { useState, useEffect } from 'react';
import { X, Download, AlertCircle } from 'lucide-react';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    id: string;
    fileName: string;
    mimeType: string;
  } | null;
  onDownload: (docId: string) => void;
}

export default function PreviewModal({ isOpen, onClose, document, onDownload }: PreviewModalProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !document) return;

    let url: string | null = null;
    let isMounted = true;

    const fetchPreview = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/documents/${document.id}/download`);
        if (!res.ok) throw new Error('Failed to load preview');
        
        const blob = await res.blob();
        if (isMounted) {
          url = URL.createObjectURL(blob);
          setBlobUrl(url);
        }
      } catch (err: unknown) {
        if (isMounted) {
          if (err instanceof Error) setError(err.message);
          else setError('An unexpected error occurred');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchPreview();

    return () => {
      isMounted = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [isOpen, document]);

  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b shrink-0">
          <h2 className="text-lg font-semibold text-slate-800 truncate pr-4">{document.fileName}</h2>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onDownload(document.id)}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md text-sm font-medium transition-colors"
            >
              <Download size={16} />
              Download
            </button>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-700 p-1">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-50 flex items-center justify-center relative min-h-[300px]">
          {isLoading && (
            <div className="flex flex-col items-center text-slate-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
              <p>Loading preview...</p>
            </div>
          )}

          {error && !isLoading && (
            <div className="text-red-500 flex flex-col items-center">
              <AlertCircle size={32} className="mb-2" />
              <p>{error}</p>
            </div>
          )}

          {!isLoading && !error && blobUrl && (
            <>
              {document.mimeType === 'application/pdf' ? (
                <iframe src={`${blobUrl}#toolbar=0`} className="w-full h-full min-h-[70vh]" title={document.fileName} />
              ) : document.mimeType.startsWith('image/') ? (
                <img src={blobUrl} alt={document.fileName} className="max-w-full max-h-full object-contain" />
              ) : (
                <div className="text-slate-500 flex flex-col items-center text-center p-8">
                  <AlertCircle size={48} className="mb-4 text-slate-400" />
                  <p className="text-lg font-medium text-slate-700">Preview not available</p>
                  <p className="mt-2 text-sm">Previews are currently only supported for PDF and Image files.</p>
                  <p className="mt-1 text-sm">Please download the file to view its contents.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
