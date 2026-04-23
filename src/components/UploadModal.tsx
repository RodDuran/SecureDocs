'use client';

import { useState, useEffect } from 'react';
import { X, Upload, File, CheckCircle2, AlertCircle } from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [employeeId, setEmployeeId] = useState<string>('');
  const [employees, setEmployees] = useState<{id: string, name: string}[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/employees')
        .then(res => res.json())
        .then(data => setEmployees(data))
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const MAX_SIZE = 25 * 1024 * 1024; // 25MB
      
      if (selectedFile.size > MAX_SIZE) {
        setError('File too large. Maximum size is 25MB.');
        return;
      }
      
      const allowedExtensions = ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg'];
      const ext = selectedFile.name.split('.').pop()?.toLowerCase() || '';
      
      if (!allowedExtensions.includes(ext)) {
        setError('Invalid file type. Allowed: .pdf, .doc, .docx, .png, .jpg, .jpeg');
        return;
      }
      
      setFile(selectedFile);
      setError(null);
      setSuccess(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file.');
      return;
    }
    if (!employeeId) {
      setError('Please select an employee.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('employeeId', employeeId);

    try {
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Upload failed');
      }

      setSuccess(`Successfully uploaded ${file.name}`);
      setFile(null);
      setEmployeeId('');
      
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold text-slate-800">Upload Document</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md flex items-start gap-2 text-sm">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 text-green-600 p-3 rounded-md flex items-start gap-2 text-sm">
              <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
              <p>{success}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Employee</label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isUploading}
            >
              <option value="">Select an employee...</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">File</label>
            <div className="border-2 border-dashed border-slate-300 rounded-md p-6 text-center">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                disabled={isUploading}
              />
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                {file ? (
                  <>
                    <File className="h-8 w-8 text-blue-500 mb-2" />
                    <span className="text-sm font-medium text-slate-700 truncate max-w-xs">{file.name}</span>
                    <span className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-slate-400 mb-2" />
                    <span className="text-sm font-medium text-blue-600 hover:text-blue-500">Click to upload</span>
                    <span className="text-xs text-slate-500 mt-1">PDF, DOC, DOCX, PNG, JPG (max 25MB)</span>
                  </>
                )}
              </label>
            </div>
          </div>
        </div>

        <div className="p-4 border-t bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            disabled={isUploading}
          >
            Close
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || !employeeId || isUploading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isUploading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Uploading...
              </>
            ) : (
              'Upload Document'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
