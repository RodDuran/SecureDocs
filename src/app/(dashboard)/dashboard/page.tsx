'use client';

import { useState, useEffect } from 'react';
import UploadModal from '@/components/UploadModal';
import { Upload, Download, FileText } from 'lucide-react';
import { getUserRole } from './actions';
import { Role } from '@prisma/client';

interface Employee {
  id: string;
  name: string;
}

interface Document {
  id: string;
  fileName: string;
  employeeName: string;
  createdAt: string;
  fileSize: number;
}

export default function DashboardPage() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [role, setRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getUserRole().then(r => setRole(r));
    fetch('/api/employees').then(res => res.json()).then(setEmployees);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    let url = '/api/documents';
    if (selectedEmployeeId) {
      url += `?employeeId=${selectedEmployeeId}`;
    }
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setDocuments(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  }, [selectedEmployeeId, isUploadModalOpen]);

  const handleDownload = async (doc: Document) => {
    try {
      const res = await fetch(`/api/documents/${doc.id}/download`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        alert('Failed to download document or insufficient permissions.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const isEmployee = role === 'EMPLOYEE';

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-slate-800">
          {isEmployee ? 'My Documents' : 'Documents'}
        </h2>
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          <Upload size={18} />
          Upload Document
        </button>
      </div>

      {!isEmployee && role && (
        <div className="mb-4">
          <select
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[250px]"
          >
            <option value="">All Employees</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500 animate-pulse">Loading documents...</div>
        ) : documents.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-500">
            <FileText size={48} className="text-slate-300 mb-4" />
            <p className="text-lg font-medium">No documents found</p>
            <p className="text-sm mt-1">Upload a document to get started.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-medium">File Name</th>
                <th className="px-6 py-4 font-medium">Employee</th>
                <th className="px-6 py-4 font-medium">Uploaded</th>
                <th className="px-6 py-4 font-medium">Size</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.map((doc: Document) => (
                <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800 flex items-center gap-2">
                    <FileText size={16} className="text-blue-500" />
                    {doc.fileName}
                  </td>
                  <td className="px-6 py-4">{doc.employeeName}</td>
                  <td className="px-6 py-4">{formatDate(doc.createdAt)}</td>
                  <td className="px-6 py-4">{formatSize(doc.fileSize)}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDownload(doc)}
                      className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
                    >
                      <Download size={16} />
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <UploadModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
      />
    </div>
  );
}
