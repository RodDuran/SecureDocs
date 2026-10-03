'use client';

import { useMemo, useState } from 'react';
import { X, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onMoved: () => void;
  documents: { id: string; fileName: string; employeeName: string }[];
  employees: { id: string; name: string }[];
}

export default function MoveDocumentsModal({ isOpen, onClose, onMoved, documents, employees }: Props) {
  const [targetId, setTargetId] = useState('');
  const [search, setSearch] = useState('');
  const [isMoving, setIsMoving] = useState(false);

  const fromNames = useMemo(
    () => Array.from(new Set(documents.map(d => d.employeeName))),
    [documents]
  );
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? employees.filter(e => e.name.toLowerCase().includes(q)) : employees;
  }, [employees, search]);
  const target = employees.find(e => e.id === targetId);

  if (!isOpen) return null;

  const close = () => {
    if (isMoving) return;
    setTargetId('');
    setSearch('');
    onClose();
  };

  const move = async () => {
    if (!targetId) return;
    setIsMoving(true);
    try {
      const res = await fetch('/api/documents/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentIds: documents.map(d => d.id), targetEmployeeId: targetId }),
      });
      if (!res.ok) throw new Error((await res.text()) || 'Move failed');
      const data = await res.json();
      toast.success(`Moved ${data.moved} document${data.moved === 1 ? '' : 's'} to ${data.targetEmployeeName}`);
      setTargetId('');
      setSearch('');
      onMoved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Move failed');
    } finally {
      setIsMoving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold text-slate-800">
            Move {documents.length} document{documents.length === 1 ? '' : 's'}
          </h2>
          <button onClick={close} disabled={isMoving} className="text-slate-500 hover:text-slate-700 disabled:opacity-40">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Currently in</p>
            <p className="text-sm text-slate-800">{fromNames.join(', ')}</p>
            <ul className="mt-2 max-h-32 overflow-y-auto text-xs text-slate-600 border rounded-md divide-y">
              {documents.map(d => (
                <li key={d.id} className="px-3 py-1.5 truncate" title={d.fileName}>{d.fileName}</li>
              ))}
            </ul>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Move to employee</label>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search employees"
              className="w-full border border-slate-300 rounded-t-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
            <ul className="border border-t-0 border-slate-300 rounded-b-md max-h-48 overflow-y-auto divide-y divide-slate-100">
              {visible.length === 0 ? (
                <li className="px-3 py-2 text-sm text-slate-500">No employees found.</li>
              ) : visible.map(emp => (
                <li key={emp.id}>
                  <label className={`flex items-center gap-3 px-3 py-2 text-sm cursor-pointer ${targetId === emp.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                    <input type="radio" name="move-target" checked={targetId === emp.id} onChange={() => setTargetId(emp.id)} />
                    <span className="text-slate-800">{emp.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          {target && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-md p-3 flex items-center gap-2 flex-wrap">
              <span>{fromNames.join(', ')}</span>
              <ArrowRight size={14} />
              <span className="font-medium">{target.name}</span>
              <span className="basis-full text-xs text-amber-700">
                People with access to {fromNames.length === 1 ? fromNames[0] : 'the current employee'} will no longer see
                these files; people with access to {target.name} will. This is recorded in the audit log.
              </span>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-slate-50 flex justify-end gap-3">
          <button onClick={close} disabled={isMoving}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={move} disabled={!targetId || isMoving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            {isMoving ? <><Loader2 size={16} className="animate-spin" /> Moving...</> : `Move to ${target?.name ?? '…'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
