'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Download } from 'lucide-react';

interface AuditLog {
  id: string;
  createdAt: string;
  userName: string;
  userEmail: string;
  action: string;
  documentName: string | null;
  metadata: unknown;
}

export default function AuditLogPage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    fetch('/api/users/me')
      .then(res => res.json())
      .then(data => {
        if (data.role !== 'ADMIN') {
          router.push('/dashboard');
        } else {
          setRole(data.role);
          fetchLogs(1);
        }
      })
      .catch(() => router.push('/dashboard'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const fetchLogs = async (pageNum: number) => {
    setIsLoading(true);
    let url = `/api/audit-log?page=${pageNum}`;
    if (actionFilter) url += `&action=${actionFilter}`;
    if (fromDate) url += `&from=${fromDate}`;
    if (toDate) url += `&to=${toDate}`;

    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.data);
        setTotalPages(data.pagination.totalPages);
        setPage(data.pagination.page);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyFilters = () => {
    fetchLogs(1);
  };

  const exportCsv = () => {
    if (logs.length === 0) return;
    
    const headers = ['Timestamp', 'User', 'Email', 'Action', 'Document'];
    const csvRows = [headers.join(',')];
    
    for (const log of logs) {
      const values = [
        new Date(log.createdAt).toLocaleString(),
        `"${log.userName}"`,
        log.userEmail,
        log.action,
        log.documentName ? `"${log.documentName}"` : 'N/A'
      ];
      csvRows.push(values.join(','));
    }
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getActionBadge = (action: string) => {
    switch(action) {
      case 'UPLOAD': return <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">UPLOAD</span>;
      case 'VIEW': return <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">VIEW</span>;
      case 'DOWNLOAD': return <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full font-medium">DOWNLOAD</span>;
      case 'LOGIN': return <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full font-medium">LOGIN</span>;
      default: return <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full font-medium">{action}</span>;
    }
  };

  if (role !== 'ADMIN') return null;

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Audit Log</h1>
        <button
          onClick={exportCsv}
          disabled={isLoading || logs.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-md hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 mb-6 flex gap-4 items-end flex-wrap">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Action</label>
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 min-w-[150px]">
            <option value="">ALL</option>
            <option value="UPLOAD">UPLOAD</option>
            <option value="VIEW">VIEW</option>
            <option value="DOWNLOAD">DOWNLOAD</option>
            <option value="LOGIN">LOGIN</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
        </div>
        <button onClick={handleApplyFilters} disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium h-[38px] disabled:opacity-50">
          Apply Filters
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-medium text-slate-700">Timestamp</th>
              <th className="px-6 py-4 font-medium text-slate-700">User</th>
              <th className="px-6 py-4 font-medium text-slate-700">Activity</th>
              <th className="px-6 py-4 font-medium text-slate-700">Document</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500 animate-pulse">Loading logs...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No logs found.</td></tr>
            ) : (
              logs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-800">{log.userName}</div>
                    <div className="text-xs text-slate-500">{log.userEmail}</div>
                  </td>
                  <td className="px-6 py-4">{getActionBadge(log.action)}</td>
                  <td className="px-6 py-4">{log.documentName || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 flex justify-between items-center bg-slate-50">
            <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button 
                onClick={() => fetchLogs(page - 1)} 
                disabled={page === 1 || isLoading}
                className="px-3 py-1 bg-white border border-slate-300 rounded text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button 
                onClick={() => fetchLogs(page + 1)} 
                disabled={page === totalPages || isLoading}
                className="px-3 py-1 bg-white border border-slate-300 rounded text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
